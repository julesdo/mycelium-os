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
	Page,
	PageHeader,
	PageBody,
	eurosCentimes,
	pluriel,
	pourcent,
	rangeeDuDebiteur
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
	 * ⚠️ ELLE FAIT DÉJÀ BAISSER LE SCORE, ET NE SE VOYAIT PAS. `creanceComplete`
	 * passe cette santé à `qualifier()` puis, jusqu'ici, ne la rendait pas : le
	 * chiffre de solidité affiché en haut de cet écran bougeait donc pour une
	 * raison que l'écran ne nommait nulle part.
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

export function EcranCreance({
	creance,
	identifiant,
	etatProcedure,
	totalDecompte
}: {
	creance: CreanceAffichee;
	/** L'identifiant de la créance, pour construire les liens de détail. */
	identifiant: string;
	/** Le libellé de l'état de la procédure engagée, ou `null`. */
	etatProcedure: string | null;
	/** Le total du dernier décompte arrêté, ou `null` s'il n'y en a pas. */
	totalDecompte: bigint | null;
}) {
	const aDemander = creance.litige.questions.length + creance.questions.length;
	const relancesPretes = creance.relances.filter((r) => r.disponible).length;
	const voies = creance.procedures.filter((p) => p.disponible).length;

	return (
		<Page>
			<PageHeader
				titre={creance.debiteur}
				sousTitre={`${creance.factures.length} facture${pluriel(creance.factures.length)} · ${eurosCentimes(
					creance.principalRestantDu
				)} restant dû`}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
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
								icone={<AlertTriangleIcon />}
								titre="Ce qui affaiblit ce dossier"
								valeur={`${creance.risques.length} risque${pluriel(creance.risques.length)}`}
							/>
						) : null}

						<LigneAnalyse
							vers="/app/creance/$id/solidite"
							parametres={{ id: identifiant }}
							icone={<FileTextIcon />}
							titre="Ce que les pièces établissent"
							valeur={`${creance.solidite.etablies} sur ${creance.solidite.attendues}`}
						/>

						<LigneAnalyse
							vers="/app/creance/$id/relances"
							parametres={{ id: identifiant }}
							icone={<MailIcon />}
							titre="Ce que vous pouvez lui écrire"
							precision="Des brouillons, envoyés par vous"
							valeur={
								relancesPretes > 0 ? `${relancesPretes} prêt${pluriel(relancesPretes)}` : 'Suspendues'
							}
						/>

						<LigneAnalyse
							vers="/app/creance/$id/procedure"
							parametres={{ id: identifiant }}
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
							icone={<ReceiptTextIcon />}
							titre="Décompte"
							precision={totalDecompte === null ? 'Aucun décompte arrêté' : undefined}
							valeur={totalDecompte === null ? 'À produire' : eurosCentimes(totalDecompte)}
						/>
					</ListeAnalyses>

					<p className="px-cladd-3xs text-cladd-2xs text-cladd-fg-softer">
						{creance.regimePrescriptionNote}
					</p>
				</div>
			</PageBody>
		</Page>
	);
}
