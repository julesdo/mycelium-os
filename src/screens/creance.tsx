import type { ReactNode } from 'react';
import { Chip, SurfaceCut } from '@cladd-ui/react';
import {
	Building2Icon,
	AlertTriangleIcon,
	FileTextIcon,
	GavelIcon,
	MailIcon,
	MessageCircleQuestionIcon,
	ReceiptTextIcon
} from 'lucide-react';
import {
	LigneAnalyse,
	ListeAnalyses,
	MaitreDetail,
	PageEcran,
	eurosCentimes,
	pluriel,
	pourcent,
	rangeeDuDebiteur,
	useDeuxVolets,
	type Lecture
} from '../ui';

/**
 * L'ÉCRAN DE CRÉANCE — un résumé, et sept portes.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL ÉTAIT, ET POURQUOI C'ÉTAIT FAUX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il empilait SEPT analyses, chacune dans une carte pleine de phrases : 6,1
 * écrans de défilement à 375 px, mesurés. Chaque carte expliquait son
 * raisonnement là où le lecteur ne voulait qu'un verdict, et la plus lourde —
 * les relances — faisait à elle seule près de trois écrans.
 *
 * Une application mobile ne fait jamais ça. Elle montre une RANGÉE par sujet —
 * un intitulé, une valeur, un chevron — et pousse vers une page quand on veut
 * le détail. Rien n'est perdu : chaque analyse a désormais sa page, avec la
 * place de se lire.
 *
 * ⚠️ LA VALEUR D'UNE RANGÉE EST UN CHIFFRE OU TROIS MOTS. C'est la contrainte
 * qui fait tenir l'écran. « 2 sur 4 » se lit d'un coup d'œil ; « trois des
 * quatre pièces attendues sont absentes » est une phrase, et sa place est sur
 * la page de détail.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ORDRE DES RANGÉES EST L'ORDRE DE LA DÉCISION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce que le gérant seul peut dire vient en premier : c'est le seul point qui
 * BLOQUE, et le seul où le logiciel attend quelque chose de lui. Viennent
 * ensuite ce qui affaiblit le dossier, ce que les pièces établissent, puis les
 * relances AVANT la procédure — le recouvrement amiable passe avant le
 * judiciaire, et l'ordre inverse laisserait croire que l'escalade est le chemin
 * normal. Le décompte ferme la marche : il n'a de sens qu'une fois le reste
 * tranché.
 */

export interface CreanceAffichee {
	readonly debiteur: string;
	/** Pour atteindre le débiteur, dont cet écran n'affichait que le nom. */
	readonly debiteurId: string;
	/**
	 * Ce que le radar a relevé au registre sur ce débiteur.
	 *
	 * ⚠️ ELLE AJOUTE UN RISQUE SANS TOUCHER AU SCORE, ET NE SE VOYAIT PAS.
	 * `creanceComplete` passe cette santé à `qualifier()`, qui en tire un risque
	 * de gravité HAUTE (une procédure collective, ou une radiation) et laisse le
	 * score intact : celui-ci ne compte que les poids acquis des quatre conditions
	 * légales et des quatre critères de pièces. Tant que la santé n'était pas
	 * rendue, l'écran comptait donc un risque dont il ne montrait nulle part le
	 * fait relevé au registre.
	 */
	readonly santeDebiteur: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly score: number;
	readonly eligible: boolean;
	readonly principalRestantDu: bigint;
	readonly factures: readonly { readonly _id: string }[];
	readonly questions: readonly { readonly condition: string; readonly libelle: string }[];
	readonly litige: {
		readonly litigieux: boolean;
		readonly constats: readonly string[];
		readonly questions: readonly { readonly cle: string }[];
	};
	readonly risques: readonly { readonly type: string; readonly gravite: string }[];
	readonly solidite: { readonly etablies: number; readonly attendues: number };
	readonly relances: readonly { readonly niveau: number; readonly disponible: boolean }[];
	readonly procedures: readonly { readonly cle: string; readonly disponible: boolean }[];
	readonly regimePrescriptionNote: string;
}

export interface CreanceOuverte {
	/** L'identifiant de la créance, pour construire les liens de détail. */
	readonly identifiant: string;
	readonly creance: CreanceAffichee;
	/** Le libellé de l'état de la procédure engagée, ou `null`. */
	readonly etatProcedure: string | null;
	/** Le total du dernier décompte arrêté, ou `null` s'il n'y en a pas. */
	readonly totalDecompte: bigint | null;
}

/** Les six analyses, chacune une route enfant de la créance (`/app/creance/$id/<cle>`). */
export const ANALYSES = [
	'litige',
	'risques',
	'solidite',
	'relances',
	'procedure',
	'decompte'
] as const;
export type CleAnalyse = (typeof ANALYSES)[number];

/** Ce que le gérant seul peut encore dire : les faits du litige et les conditions à confirmer. */
function aConfirmer(creance: {
	readonly litige: { readonly questions: readonly unknown[] };
	readonly questions: readonly unknown[];
}): number {
	return creance.litige.questions.length + creance.questions.length;
}

/**
 * L'ANALYSE QUE LE VOLET DROIT OUVRE QUAND L'ADRESSE N'EN NOMME AUCUNE.
 *
 * La première rangée marquée `attention`, celle qui attend une réponse : le
 * litige, tant qu'il reste quelque chose à confirmer. Sinon le décompte, qui
 * ferme la marche de la liste et porte le chiffre qu'on vient chercher.
 *
 * ⚠️ UNE SEULE FONCTION POUR LA ROUTE ET POUR L'ÉCRAN. L'index de la créance
 * choisit la page qu'il rend, l'écran allume la rangée qui lui correspond : deux
 * règles écrites séparément finiraient par ouvrir une analyse et en désigner
 * une autre.
 */
export function analyseParDefaut(creance: Parameters<typeof aConfirmer>[0]): CleAnalyse {
	return aConfirmer(creance) > 0 ? 'litige' : 'decompte';
}

/**
 * Le volet droit pendant que la créance se lit : le squelette d'une analyse,
 * avant de savoir laquelle s'ouvrira.
 */
export function EcranAnalyseEnAttente({ identifiant }: { identifiant: string }) {
	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: 'Créance',
					masqueEnVolets: true
				},
				titre: 'Analyse'
			}}
			etat="attente"
		/>
	);
}

export function EcranCreance({
	donnees,
	detail,
	analyseOuverte
}: {
	donnees: Lecture<CreanceOuverte>;
	/** L'analyse rendue à droite (l'`Outlet` de la route), ou `null` quand la créance est en erreur. */
	detail: ReactNode;
	/** L'analyse que l'adresse nomme, ou `null` sur `/app/creance/$id` nu. */
	analyseOuverte: CleAnalyse | null;
}) {
	// Avant tout retour anticipé : un crochet appelé sous condition change d'ordre d'un rendu à l'autre.
	const deuxVolets = useDeuxVolets();
	const detailOuvert = analyseOuverte !== null;

	if (donnees.etat !== 'pret') {
		return (
			<MaitreDetail
				maitre={<PageEcran entete={{ genre: 'onglet', titre: 'Créance' }} etat={donnees.etat} />}
				detail={detail}
				detailOuvert={detailOuvert}
			/>
		);
	}

	const { identifiant, creance, etatProcedure, totalDecompte } = donnees.valeur;
	const aDemander = aConfirmer(creance);
	const relancesPretes = creance.relances.filter((r) => r.disponible).length;
	const voies = creance.procedures.filter((p) => p.disponible).length;

	/**
	 * ⚠️ LA RANGÉE PAR DÉFAUT NE S'ALLUME QU'EN DEUX VOLETS. Sous 1024 px, l'index
	 * est monté mais masqué : un anneau sur sa rangée désignerait une analyse que
	 * personne ne voit.
	 */
	const ouverte = analyseOuverte ?? (deuxVolets ? analyseParDefaut(creance) : null);

	return (
		<MaitreDetail
			detail={detail}
			detailOuvert={detailOuvert}
			maitre={
				<PageEcran
					entete={{
						genre: 'onglet',
						titre: creance.debiteur,
						sousTitre: `${creance.factures.length} facture${pluriel(creance.factures.length)} · ${eurosCentimes(
							creance.principalRestantDu
						)} restant dû`
					}}
				>
					{/* LE SCORE, ET CE QU'IL VAUT. Un nombre seul laisse le gérant devant
					    une note qu'il ne sait pas faire monter — les rangées en dessous
					    sont précisément ce qui la fait bouger. */}
					<SurfaceCut contentClassName="flex flex-wrap items-center justify-between gap-cladd-3xs p-cladd-2xs">
						<div className="flex items-baseline gap-cladd-3xs">
							<span className="text-letikette-titre font-bold tabular-nums">
								{pourcent(creance.score)}
							</span>
							<span className="text-cladd-xs text-cladd-fg-soft">de solidité</span>
						</div>
						<Chip size="md" color={creance.eligible ? 'green' : 'neutral'}>
							{creance.eligible ? 'Mûre pour une procédure' : 'Pas encore mûre'}
						</Chip>
					</SurfaceCut>

					{/*
					  ⚠️ LE DÉBITEUR, EN PREMIER, ET DANS SA PROPRE LISTE.

					  Il n'est pas une analyse de la créance : c'est l'autre partie. Le
					  mettre dans la liste des six analyses le rangerait au milieu de
					  « ce qui affaiblit le dossier » et « ce que les pièces
					  établissent », alors qu'il est d'une autre nature — et qu'il est
					  la seule rangée de l'écran qui SORTE de la créance.

					  C'est le traitement de la référence, qui pose la contrepartie en
					  haut du détail d'une opération, sous le montant, et non parmi ses
					  attributs.

					  ⚠️ ET C'EST ICI QUE LE VERDICT DU RADAR ARRIVE ENFIN À L'ŒIL. Il
					  tourne chaque nuit à quatre heures, écrit sa santé sur le DÉBITEUR,
					  et cet écran-ci porte l'argent : les deux ne se rencontraient nulle
					  part. Une procédure collective change pourtant tout ce que cette
					  créance vaut.
					*/}
					<ListeAnalyses>
						<LigneAnalyse
							vers="/app/debiteurs"
							// Le volet d'un débiteur n'a pas de route à lui : il se choisit
							// par la recherche d'URL sur l'écran de la liste. Voir la prop
							// `recherche` de `LigneAnalyse`.
							recherche={{ d: creance.debiteurId }}
							icone={<Building2Icon />}
							titre={creance.debiteur}
							{...rangeeDuDebiteur({ sante: creance.santeDebiteur })}
						/>
					</ListeAnalyses>

					<ListeAnalyses>
						<LigneAnalyse
							vers="/app/creance/$id/litige"
							parametres={{ id: identifiant }}
							selectionnee={ouverte === 'litige'}
							icone={<MessageCircleQuestionIcon />}
							titre="Ce que vous seul pouvez dire"
							precision={
								creance.litige.litigieux ? 'Une contestation est connue' : 'Des faits, pas du droit'
							}
							valeur={
								aDemander > 0
									? `${aDemander} à confirmer`
									: creance.litige.litigieux
										? 'Litigieux'
										: 'Répondu'
							}
							// ⚠️ LE POINT MARQUE LA SEULE RANGÉE QUI ATTEND QUELQUE CHOSE.
							// C'est aussi la seule qui BLOQUE : sans ces réponses, aucune
							// créance ne franchit le seuil de qualification.
							attention={aDemander > 0}
						/>

						{creance.risques.length > 0 ? (
							<LigneAnalyse
								vers="/app/creance/$id/risques"
								parametres={{ id: identifiant }}
								selectionnee={ouverte === 'risques'}
								icone={<AlertTriangleIcon />}
								titre="Ce qui affaiblit ce dossier"
								valeur={`${creance.risques.length} risque${pluriel(creance.risques.length)}`}
							/>
						) : null}

						<LigneAnalyse
							vers="/app/creance/$id/solidite"
							parametres={{ id: identifiant }}
							selectionnee={ouverte === 'solidite'}
							icone={<FileTextIcon />}
							titre="Ce que les pièces établissent"
							valeur={`${creance.solidite.etablies} sur ${creance.solidite.attendues}`}
						/>

						<LigneAnalyse
							vers="/app/creance/$id/relances"
							parametres={{ id: identifiant }}
							selectionnee={ouverte === 'relances'}
							icone={<MailIcon />}
							titre="Ce que vous pouvez lui écrire"
							precision="Des brouillons, envoyés par vous"
							valeur={
								relancesPretes > 0
									? `${relancesPretes} prêt${pluriel(relancesPretes)}`
									: 'Suspendues'
							}
						/>

						<LigneAnalyse
							vers="/app/creance/$id/procedure"
							parametres={{ id: identifiant }}
							selectionnee={ouverte === 'procedure'}
							icone={<GavelIcon />}
							titre="Procédure"
							precision={etatProcedure ?? undefined}
							valeur={
								etatProcedure !== null
									? 'Engagée'
									: voies > 0
										? `${voies} voie${pluriel(voies)}`
										: 'Aucune voie'
							}
						/>

						<LigneAnalyse
							vers="/app/creance/$id/decompte"
							parametres={{ id: identifiant }}
							selectionnee={ouverte === 'decompte'}
							icone={<ReceiptTextIcon />}
							titre="Décompte"
							precision={totalDecompte === null ? 'Aucun décompte arrêté' : undefined}
							valeur={totalDecompte === null ? 'À produire' : eurosCentimes(totalDecompte)}
						/>
					</ListeAnalyses>

					<p className="px-cladd-3xs text-cladd-2xs text-cladd-fg-softer">
						{creance.regimePrescriptionNote}
					</p>
				</PageEcran>
			}
		/>
	);
}
