import { useState } from 'react';
import { Chip } from '@cladd-ui/react';
import {
	AlertTriangleIcon,
	Building2Icon,
	EyeOffIcon,
	FileDownIcon,
	InfoIcon
} from 'lucide-react';
import type { FicheParametre } from '../lib/verticales/recouvrement/referentiel';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	CarteListe,
	ChiffreHero,
	ChoixIntervenant,
	Decompte,
	FeuilleDeclaration,
	FeuilleVoie,
	Lien,
	LigneAnalyse,
	LigneBouton,
	LigneValeur,
	ListeAnalyses,
	PageEcran,
	Pieces,
	QuestionnaireLitige,
	RechercheAvocat,
	RechercheCommissaire,
	RefusEnQuatreParties,
	Relances,
	SectionDepliable,
	SectionEcran,
	SectionsDepliables,
	Solidite,
	SuiviProcedure,
	Tableau,
	TableauCellule,
	TableauCorps,
	TableauEntete,
	TableauLigne,
	TableauTitre,
	dateCourte,
	eurosCentimes,
	pluriel,
	rangeeDuDebiteur,
	type AvocatAffiche,
	type ChoixDeclare,
	type DecompteAffiche,
	type EtatRechercheAvocat,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type FicheASaisir,
	type FicheIntervenant,
	type Lecture,
	type NiveauAffiche,
	type OptionTypePiece,
	type PieceAffichee,
	type QuestionLitige,
	type RepertoireAffiche,
	type ReponseFait,
	type SoliditeAffichee,
	type SuiviAffiche,
	type VoieAffichee
} from '../ui';
import { TITRE_ECRAN } from './titres';

/**
 * UNE CRÉANCE — UNE PAGE, UN SEUL DÉFILEMENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ELLE ÉTAIT, ET LE REPROCHE QUI L'A DÉFAITE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une créance avait SEPT sous-pages — `creance.$id.index`, `.decompte`,
 * `.litige`, `.procedure`, `.relances`, `.risques`, `.solidite` — sous une mise
 * en page qui n'affichait qu'un résumé et six portes. Le reproche du terrain,
 * mot pour mot : « Je te demande juste d'éviter les profondeurs de pages. […]
 * si on veut voir le détail précis d'une créance sur cette page pareil. »
 *
 * Les rangées-et-chevrons étaient une réponse honnête à un VRAI défaut : sept
 * analyses empilées en cartes de prose faisaient 6,1 écrans de défilement à
 * 375 px. Mais elles ont réglé la longueur en achetant de la PROFONDEUR, et la
 * profondeur coûte plus cher : elle oblige à savoir sous quel intitulé du
 * domaine se range ce qu'on cherche, alors qu'on le cherche pour une raison qui
 * ne porte pas ce nom. « Pourquoi ce montant » ne s'appelle ni « Décompte » ni
 * « Solidité ».
 *
 * La longueur, elle, se règle autrement : une section se REPLIE, et repliée elle
 * porte encore sa valeur — « 2 sur 4 », « 3 prêts », « 1 240,50 € ». On lit la
 * colonne d'un coup d'œil, on déplie ce qu'on veut, et deux blocs se lisent côte
 * à côte quand on compare une hypothèse à la pièce qui la fonde. C'est ce que
 * `SectionsDepliables` fait, et c'est pour ça qu'il est `multiple` : un
 * accordéon qui referme le bloc précédent est un onglet qui s'ignore.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI EST GRAVE NE SE REPLIE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trois blocs se rendent à plat, hors de l'accordéon, à leur place dans le flux :
 * « Ce que le logiciel a supposé », « Ce que le logiciel ne voit pas » et les
 * risques relevés. Une hypothèse repliée est une hypothèse qu'on ne lit pas, et
 * le doute ne profite jamais au produit : un utilisateur qui croit sa
 * prescription surveillée ne la surveille pas lui-même. Un risque bloquant ferme
 * toutes les voies que ce logiciel évalue ; le mettre derrière un pli reviendrait
 * à le taire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET ELLE N'EN RECOMMANDE AUCUNE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Troisième ligne rouge du projet. Le produit ÉNUMÈRE sans ordre ce que du code
 * écrit, et dit ce qui manque à une voie indisponible ; il n'en conseille
 * jamais une. Les brouillons de relance ne portent aucune commande d'envoi :
 * le recouvrement pour compte de tiers est encadré, et une commande absente ne
 * s'active jamais par accident — une commande grisée, si.
 */

/** Une hypothèse du logiciel, adossée au fait qui l'a produite. */
export interface HypotheseAffichee {
	readonly cle: string;
	/** Ce que le logiciel a retenu, en toutes lettres. */
	readonly enonce: string;
	/** Le fait qui l'a produite : « le secteur du client n'est pas renseigné ». */
	readonly fait: string;
	/** Ce qui la lève, au constat. Jamais un conseil. */
	readonly ceQuiLaLeve: string;
}

/** Ce que le logiciel ne voit pas, chiffré quand c'est chiffrable. */
export interface AngleMortAffiche {
	readonly cle: string;
	readonly constat: string;
	/** Ce qui n'est pas surveillé, en euros. `null` : non chiffrable, et dit. */
	readonly montantEnJeu: bigint | null;
}

/** Un décompte déjà arrêté : figé, daté, et il ne change plus. */
export interface DecompteArreteAffiche {
	readonly id: string;
	readonly arreteAu: string;
	readonly total: bigint;
}

/** Une condition légale que le logiciel n'a pas pu déduire, à confirmer par le gérant. */
export interface ConditionAConfirmer {
	readonly condition: string;
	readonly libelle: string;
}

/** Un risque de la créance, tel que le score le constate. */
export interface RisqueAffiche {
	readonly type: string;
	readonly description: string;
	readonly gravite: string;
}

/**
 * LES SECTIONS QUI SE REPLIENT, DANS L'ORDRE DU FLUX.
 *
 * Les trois qui ne se replient pas n'y sont pas : elles n'ont pas d'état ouvert
 * à porter, parce qu'elles sont toujours ouvertes.
 */
export const SECTIONS_CREANCE = [
	'decompte',
	'valeurs',
	'litige',
	'solidite',
	'pieces',
	'voies',
	'relances'
] as const;
export type SectionCreance = (typeof SECTIONS_CREANCE)[number];

/**
 * CE QUE LA PAGE MONTRE, ET CE QU'ELLE DÉCLENCHE.
 *
 * ⚠️ TOUT ARRIVE EN PROPRIÉTÉS. Cet écran ne parle à aucune fonction Convex :
 * c'est ce qui permet de l'ouvrir aux quatre largeurs de référence depuis la
 * salle d'exposition, sans backend ni authentification.
 */
export interface CreanceOuverte {
	/** L'identifiant de la créance, pour les liens qui la prennent en paramètre. */
	readonly identifiant: string;
	readonly debiteur: string;
	readonly debiteurId: string;
	readonly santeDebiteur: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	/** Toutes conditions établies, aucun risque bloquant. Un état, jamais une note. */
	readonly eligible: boolean;
	readonly nombreFactures: number;
	readonly principalRestantDu: bigint;

	// ── 1. L'en-tête : de qui, combien, jusqu'à quand ───────────────────────
	/**
	 * L'échéance la plus ancienne des factures du dossier, ou `null` quand
	 * aucune n'en porte. Un dossier sans échéance lisible ne se tait pas : la
	 * rangée le dit, parce que c'est elle qui fait courir les intérêts.
	 */
	readonly echeanceLaPlusAncienne: string | null;
	/** La prescription la plus proche, celle qui éteint la première. */
	readonly prescriptionLaPlusProche: string | null;

	// ── 2. Le décompte, décomposé ───────────────────────────────────────────
	/** Le calcul du jour. `null` quand il ne se fait pas : `refusDuMontant` dit pourquoi. */
	readonly montantDuJour: DecompteAffiche | null;
	/** Les quatre parties du refus, quand le montant ne se calcule pas. */
	readonly refusDuMontant: {
		readonly peutFaire: string;
		readonly constat: string;
		readonly blocages: readonly string[];
		readonly coutDeLAttente: string;
	} | null;
	/** Les valeurs juridiques employées, telles qu'elles vivent dans `parametres.ts`. */
	readonly fiches: readonly FicheParametre[];
	/** Ce qui a été ARRÊTÉ sur ce dossier : figé, daté, et il ne bouge plus. */
	readonly decomptesArretes: readonly DecompteArreteAffiche[];
	/** La pièce PDF du dernier arrêté. `null` quand il n'y en a aucun. */
	readonly onTelechargerLaPiece: (() => void) | null;

	// ── 3. Ce qui est supposé, et ce qui n'est pas vu ───────────────────────
	readonly hypotheses: readonly HypotheseAffichee[];
	readonly anglesMorts: readonly AngleMortAffiche[];

	// ── 4. Le litige, et ce que le gérant seul peut dire ────────────────────
	readonly litige: {
		readonly litigieux: boolean;
		readonly constats: readonly string[];
		readonly questions: readonly QuestionLitige[];
	};
	readonly conditions: readonly ConditionAConfirmer[];
	readonly onDeclarerFait: (cle: string, reponse: ReponseFait) => void;
	readonly onRepondreCondition: (condition: string, reponse: 'ok' | 'ko') => void;

	// ── 5. La solidité, et ce qui affaiblit le dossier ──────────────────────
	readonly solidite: SoliditeAffichee;
	readonly risques: readonly RisqueAffiche[];

	// ── 6. Les pièces ───────────────────────────────────────────────────────
	readonly pieces: readonly PieceAffichee[];
	readonly optionsTypePiece: readonly OptionTypePiece[];
	readonly onDeposer: (fichiers: File[]) => void;
	readonly onClasser: (pieceId: string, type: string) => void;
	readonly onRetirer: (pieceId: string) => void;

	// ── 7. Les faits consignés et la voie ───────────────────────────────────
	/** Ce qui court depuis l'engagement, ou `null`. Vient de `suiviDeLaCreance`. */
	readonly suivi: SuiviAffiche | null;
	readonly voies: readonly VoieAffichee[];
	readonly carnet: readonly FicheIntervenant[];
	/** L'intervenant rattaché, relu PAR IDENTIFIANT. `null` : moi-même. */
	readonly intervenantChoisi: string | null;
	readonly nomIntervenant: string | null;
	/** La date du FAIT, jamais celle de la saisie. */
	readonly onConsigner: (cle: string, survenuLe: string) => void;
	readonly onDeclarerVoie: (procedure: string, engageeLe: string, choix: ChoixDeclare) => void;
	readonly onRattacher: (intervenantId: string | null) => void;
	readonly onAjouterFiche: (fiche: FicheASaisir) => void;
	readonly onOublierFiche: (intervenantId: string) => void;
	// Les deux recherches de répertoire : leur état vit hors de l'écran, parce
	// que leurs requêtes sont SAUTÉES tant que la feuille est fermée.
	readonly rechercheCommissaireOuverte: boolean;
	readonly etatRechercheCommissaire: EtatRechercheCommissaire;
	readonly onOuvrirRechercheCommissaire: () => void;
	readonly onFermerRechercheCommissaire: () => void;
	readonly onChercherCommissaire: (departement: string) => void;
	readonly onRetenirEtude: (etude: EtudeAffichee) => void;
	readonly rechercheAvocatOuverte: boolean;
	readonly repertoire: RepertoireAffiche | null;
	readonly barreau: string;
	readonly specialite: string;
	readonly etatRechercheAvocat: EtatRechercheAvocat;
	readonly onOuvrirRechercheAvocat: () => void;
	readonly onFermerRechercheAvocat: () => void;
	readonly onChoisirBarreau: (barreau: string) => void;
	readonly onChoisirSpecialite: (specialite: string) => void;
	readonly onRetenirAvocat: (avocat: AvocatAffiche) => void;

	// ── 8. Les brouillons de relance ────────────────────────────────────────
	readonly relances: readonly NiveauAffiche[];

	readonly enCours: boolean;
	readonly erreur: string | null;
	/** La date du jour, venue de la SEULE horloge de l'interface. */
	readonly aujourdHui: string;
}

/** Ce que le gérant seul peut encore dire : les faits du litige et les conditions à confirmer. */
function aConfirmer(creance: {
	readonly litige: { readonly questions: readonly unknown[] };
	readonly conditions: readonly unknown[];
}): number {
	return creance.litige.questions.length + creance.conditions.length;
}

/**
 * LES SECTIONS QUI S'OUVRENT QUAND RIEN N'EN NOMME AUCUNE.
 *
 * Le décompte, toujours : c'est le chiffre qu'on vient chercher, et le cœur du
 * produit. Et le litige quand il reste une réponse à donner — la seule section
 * qui BLOQUE, puisque sans ces réponses aucune créance ne franchit le seuil de
 * qualification.
 */
export function sectionsParDefaut(
	creance: Parameters<typeof aConfirmer>[0]
): readonly SectionCreance[] {
	return aConfirmer(creance) > 0 ? ['decompte', 'litige'] : ['decompte'];
}

export function EcranCreance({ donnees }: { donnees: Lecture<CreanceOuverte> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	/**
	 * LES SECTIONS OUVERTES.
	 *
	 * ⚠️ `null` ET `[]` NE SONT PAS LA MÊME CHOSE. `null` veut dire « personne
	 * n'a encore touché au pli », et c'est alors `sectionsParDefaut` qui tranche,
	 * une fois la créance lue ; `[]` veut dire « le gérant a tout replié », et ça
	 * se respecte. Les confondre rouvrirait le décompte à chaque rendu, sous les
	 * doigts de celui qui vient de le fermer.
	 *
	 * ⚠️ ET RIEN NE SE SYNCHRONISE DANS UN EFFET. La valeur se DÉRIVE au rendu :
	 * un `setState` dans un effet ferait un rendu de retard, visible comme un
	 * clignotement du pli à l'arrivée des données.
	 */
	const [choisies, setChoisies] = useState<readonly SectionCreance[] | null>(null);
	const ouvertes = choisies ?? (pret === null ? [] : sectionsParDefaut(pret));

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				/*
				  ⚠️ LE RETOUR MÈNE AU DÉBITEUR, SOUS LE NOM DE LA LISTE. Une créance
				  s'ouvre depuis l'accueil, les procédures ou le volet de son débiteur.
				  Elle revient là d'où l'on vient par l'historique ; ouverte par un lien
				  direct, elle rouvre son débiteur. Son titre porte le débiteur : la
				  page s'identifie seule.
				*/
				/*
				  ⚠️ LE RETOUR VISE LA PAGE DU DÉBITEUR DÈS QU'ON SAIT QUI IL EST, et
				  la liste seulement tant qu'on ne le sait pas encore. Une route à
				  paramètre ne se lie pas sans son paramètre : pendant l'attente, le
				  seul retour honnête est la liste.
				*/
				retour:
					pret === null
						? { vers: '/app/debiteurs', libelle: TITRE_ECRAN.debiteurs }
						: {
								vers: '/app/debiteurs/$id',
								parametres: { id: pret.debiteurId },
								libelle: TITRE_ECRAN.debiteurs
							},
				titre: pret?.debiteur ?? 'Créance',
				sousTitre:
					pret === null
						? undefined
						: `${pret.nombreFactures} facture${pluriel(pret.nombreFactures)} · ${eurosCentimes(
								pret.principalRestantDu
							)} restant dû`
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<>
					{pret.erreur === null ? null : (
						<p className="text-cladd-xs text-cladd-fg">{pret.erreur}</p>
					)}

					<EnTeteCreance creance={pret} />

					<SectionsDepliables
						ouvertes={ouvertes}
						onOuvertesChange={(liste) =>
							setChoisies(
								// Le kit rend des chaînes libres ; seules celles que cet écran
								// déclare comptent. Une clé inconnue viendrait d'ailleurs.
								liste.filter((cle): cle is SectionCreance =>
									(SECTIONS_CREANCE as readonly string[]).includes(cle)
								)
							)
						}
					>
						<SectionDecompte creance={pret} />
						<SectionValeursJuridiques fiches={pret.fiches} />
						<SectionHypotheses creance={pret} />
						<SectionAnglesMorts creance={pret} />
						<SectionLitige creance={pret} />
						<SectionRisques creance={pret} />
						<SectionSolidite creance={pret} />
						<SectionPieces creance={pret} />
						<SectionVoies creance={pret} />
						<SectionRelances creance={pret} />
					</SectionsDepliables>
				</>
			)}
		</PageEcran>
	);
}

/**
 * SECTION 1 — L'EN-TÊTE : DE QUI, COMBIEN, ET JUSQU'À QUAND.
 *
 * Le montant en grand, puis le débiteur, l'état, l'échéance et la prescription
 * avec sa date. C'est l'ordre des trois questions qu'on se pose en ouvrant un
 * dossier : combien, contre qui, et combien de temps reste-t-il.
 *
 * ⚠️ LE CHIFFRE NE MENT PAS SUR CE QU'IL EST. Quand le calcul du jour aboutit,
 * c'est le TOTAL — principal, intérêts, indemnité — et la légende le dit. Quand
 * il ne se fait pas, le chiffre retombe sur le principal restant dû et la
 * légende le dit AUSSI : afficher le principal seul sous l'étiquette « dû
 * aujourd'hui » ferait lire un total amputé des intérêts, ce qu'aucune ligne de
 * l'écran ne rattraperait ensuite.
 *
 * ⚠️ ET IL N'EST JAMAIS COLORÉ. Le vert, le rouge et l'ambre ne disent qu'une
 * chose dans ce produit — au-dessus du seuil, tout près, en dessous. Un montant
 * dû n'est pas un verdict : c'est une somme.
 */
function EnTeteCreance({ creance }: { creance: CreanceOuverte }) {
	const montant = creance.montantDuJour;

	return (
		<>
			<ChiffreHero
				centimes={montant?.total ?? creance.principalRestantDu}
				surTitre={montant === null ? 'Principal restant dû' : 'Dû aujourd’hui'}
				legende={
					montant === null
						? 'Les intérêts ne se calculent pas sur ce dossier : le décompte, plus bas, dit pourquoi.'
						: 'Principal, intérêts et indemnité, au jour d’aujourd’hui. Il augmente chaque jour.'
				}
			/>

			{/*
			  ⚠️ LE DÉBITEUR EST LA SEULE RANGÉE QUI SORTE DE LA CRÉANCE, et c'est
			  aussi là que le verdict du radar arrive enfin à l'œil : il tourne chaque
			  nuit, écrit sa santé sur le DÉBITEUR, et cette page-ci porte l'argent.
			  Une procédure collective change pourtant tout ce que cette créance vaut.
			*/}
			<ListeAnalyses>
				<LigneAnalyse
					vers="/app/debiteurs/$id"
					// ⚠️ LA PAGE DU DÉBITEUR, PAS LA LISTE AVEC `?d=`. Cette dernière
					// existe encore et redirige, mais elle fait payer un aller-retour
					// visible pour arriver au même endroit. La page porte tout ce que
					// cette rangée promet : son encours, ses créances, sa solvabilité.
					parametres={{ id: creance.debiteurId }}
					icone={<Building2Icon />}
					titre={creance.debiteur}
					{...rangeeDuDebiteur({ sante: creance.santeDebiteur })}
				/>
			</ListeAnalyses>

			<CarteListe>
				<LigneValeur
					libelle="État"
					valeur={
						/*
						  ⚠️ UNE PUCE NEUTRE, JAMAIS VERTE. Un vert sur « Mûre pour une
						  procédure » ferait lire un seuil là où on vient précisément d'en
						  retirer un : une créance mûre, c'est toutes conditions établies
						  et aucun bloquant — un état, pas une note.
						*/
						<Chip size="md" color="neutral">
							{creance.eligible ? 'Mûre pour une procédure' : 'Pas encore mûre'}
						</Chip>
					}
				/>
				<LigneValeur
					libelle="Échéance la plus ancienne"
					valeur={
						creance.echeanceLaPlusAncienne === null
							? 'non lisible'
							: dateCourte(creance.echeanceLaPlusAncienne)
					}
				/>
				{/*
				  ⚠️ LA PRESCRIPTION PORTE SA DATE, PAS UN ADJECTIF. C'est la seule
				  échéance qui éteint définitivement une créance sans que personne
				  n'ait rien fait, et « bientôt » ne se vérifie pas. Le délai retenu et
				  la raison qui le retient se lisent juste en dessous, dans
				  « Ce que le logiciel a supposé ».
				*/}
				<LigneValeur
					libelle="Prescription la plus proche"
					valeur={
						creance.prescriptionLaPlusProche === null
							? 'non calculable'
							: dateCourte(creance.prescriptionLaPlusProche)
					}
				/>
			</CarteListe>
		</>
	);
}

/**
 * SECTION 2 — LE DÉCOMPTE, DÉCOMPOSÉ. C'EST LE CŒUR DU PRODUIT.
 *
 * Principal, indemnité forfaitaire par facture, puis un SEGMENT par période de
 * taux, chacun rendant ses quatre termes : base, taux, jours, base annuelle. Un
 * total qu'on ne peut pas décomposer est un chiffre qu'on demande de croire ;
 * décomposé, il se refait à la main — ce que fera le débiteur qui le conteste.
 *
 * ⚠️ UN DÉCOMPTE ARRÊTÉ EST FIGÉ, DÉFINITIVEMENT. Rejouer produit un NOUVEAU
 * décompte daté. La question n'est pas « combien réclame-t-on aujourd'hui » —
 * le chiffre du haut y répond — mais « qu'a-t-on réclamé le jour où on l'a
 * réclamé ». Les deux cohabitent ici, et la section les distingue en toutes
 * lettres.
 *
 * ⚠️ ET L'ARRÊT NE SE FAIT PAS D'ICI. Il a son écran, qui porte le contrôle de
 * complétude : `controle.ts` compare la créance à toutes les factures connues du
 * débiteur et CHIFFRE ce qui serait abandonné. Le titre exécutoire ne porte que
 * sur les sommes qu'il chiffre, et ce qui n'y figure pas est perdu.
 */
function SectionDecompte({ creance }: { creance: CreanceOuverte }) {
	const montant = creance.montantDuJour;

	return (
		<SectionDepliable
			cle="decompte"
			titre="Le décompte, décomposé"
			legende="Au jour d’aujourd’hui, et il bouge chaque jour"
			valeur={montant === null ? 'non calculé' : eurosCentimes(montant.total)}
		>
			{montant === null ? (
				creance.refusDuMontant === null ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Le montant ne se calcule pas, et la raison n’a pas été rendue. C’est un défaut : un
						refus sans ses quatre parties est un mur.
					</p>
				) : (
					<RefusEnQuatreParties
						peutFaire={creance.refusDuMontant.peutFaire}
						constat={creance.refusDuMontant.constat}
						blocages={creance.refusDuMontant.blocages}
						coutDeLAttente={creance.refusDuMontant.coutDeLAttente}
					/>
				)
			) : (
				<>
					<Decompte decompte={montant} />
					<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						Ce montant n’est pas arrêté : il se recalcule à chaque lecture, et il augmente tant
						que la facture n’est pas réglée. Ce qui s’oppose à un tiers est un décompte arrêté,
						daté et figé.
					</p>
				</>
			)}

			<p className="text-cladd-2xs font-semibold">Ce qui a été arrêté</p>
			{creance.decomptesArretes.length === 0 ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Rien n’a encore été arrêté sur ce dossier. Un décompte arrêté est figé définitivement :
					c’est le chiffre qu’un tiers refera à la main, et il ne change plus après.
				</p>
			) : (
				<ListeAnalyses>
					{creance.decomptesArretes.map((arrete) => (
						<LigneAnalyse
							key={arrete.id}
							// ⚠️ TYPÉE PAR LE ROUTEUR, sans assertion : une route supprimée
							// deviendrait une erreur de compilation au lieu d'un lien mort.
							vers="/app/decompte/$id"
							parametres={{ id: arrete.id }}
							titre={`Arrêté au ${dateCourte(arrete.arreteAu)}`}
							precision="Figé, daté, il ne change plus"
							valeur={eurosCentimes(arrete.total)}
						/>
					))}
				</ListeAnalyses>
			)}

			<div className="flex flex-wrap gap-cladd-3xs">
				{/* ⚠️ CE BOUTON NE FIGE RIEN LUI-MÊME. Il mène à l'écran d'arrêt, qui
				    porte le contrôle chiffré, le pré-vol et l'irréversibilité en toutes
				    lettres. Arrêter d'un tap, sans qu'aucun contrôle de complétude
				    n'ait été lu, était le défaut d'origine. */}
				<BoutonPrincipal
					as={Lien}
					to="/app/arret/$id"
					// ⚠️ UNE ASSERTION : `as` efface le générique du routeur. La
					// DESTINATION reste vérifiée contre l'arbre des routes, ici par le
					// typage de la prop et par `destinations-existent.test.ts`.
					params={{ id: creance.identifiant } as never}
				>
					Arrêter un décompte
				</BoutonPrincipal>

				{creance.onTelechargerLaPiece === null ? null : (
					<BoutonSecondaire onClick={creance.onTelechargerLaPiece}>
						<FileDownIcon />
						Télécharger la pièce
					</BoutonSecondaire>
				)}
			</div>
		</SectionDepliable>
	);
}

/**
 * SECTION 2 bis — LES VALEURS JURIDIQUES EMPLOYÉES, telles qu'un tiers doit
 * pouvoir les contrôler : leur source, leur date de relevé, et les deux
 * booléens qui disent ce qu'on a le droit d'en faire.
 *
 * ⚠️ ELLE A SA PROPRE SECTION, ET C'EST UNE MESURE PRISE AU NAVIGATEUR. Le
 * tableau vivait au bas du décompte : 2 711 px sur les 3 731 px de la section,
 * relevés à 1280 px, c'est-à-dire que 73 % de la section ouverte par défaut
 * était un tableau de référentiel, et que la décomposition qu'on venait lire —
 * le principal, les segments, le total — passait sous la ligne de flottaison.
 * Repliée, la section dit déjà ce qu'on vient y chercher : combien de valeurs
 * sont relevées sur une source citable.
 *
 * ⚠️ ET « RELEVÉE » N'EST PAS « CONTRÔLÉE ». `verifie` suffit à CALCULER — un
 * chiffre affiché se corrige. `valideParAvocat` suffit à produire un ACTE — un
 * chiffre écrit dans une requête qui part au greffe ne se corrige pas. Les deux
 * colonnes restent distinctes pour cette seule raison.
 */
function SectionValeursJuridiques({ fiches }: { fiches: readonly FicheParametre[] }) {
	if (fiches.length === 0) return null;

	const verifiees = fiches.filter((fiche) => fiche.verifie).length;
	const controlees = fiches.filter((fiche) => fiche.valideParAvocat).length;

	return (
		<SectionDepliable
			cle="valeurs"
			titre="Les valeurs juridiques employées"
			legende="Leur source, leur date de relevé, et ce qu’on a le droit d’en faire"
			valeur={`${verifiees} sur ${fiches.length}`}
		>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				{verifiees} relevée{pluriel(verifiees)} sur {fiches.length} sur une source publique
				citable, {controlees} contrôlée{pluriel(controlees)} par un juriste. Une valeur relevée
				suffit à calculer ; seule une valeur contrôlée suffit à produire un acte.
			</p>
			<Tableau legende="Valeurs juridiques, leur source et leur état">
				<TableauEntete>
					<TableauTitre>Valeur</TableauTitre>
					<TableauTitre>Source</TableauTitre>
					<TableauTitre>Relevée le</TableauTitre>
					<TableauTitre>Relevée</TableauTitre>
					<TableauTitre>Contrôlée par un juriste</TableauTitre>
				</TableauEntete>
				<TableauCorps>
					{fiches.map((fiche) => (
						<TableauLigne key={fiche.cle}>
							<TableauCellule>{fiche.cle}</TableauCellule>
							<TableauCellule>{fiche.source}</TableauCellule>
							<TableauCellule>{dateCourte(fiche.verifieLe)}</TableauCellule>
							<TableauCellule>{fiche.verifie ? 'oui' : 'non'}</TableauCellule>
							<TableauCellule>{fiche.valideParAvocat ? 'oui' : 'non'}</TableauCellule>
						</TableauLigne>
					))}
				</TableauCorps>
			</Tableau>
		</SectionDepliable>
	);
}

/**
 * SECTION 3a — CE QUE LE LOGICIEL A SUPPOSÉ. JAMAIS REPLIÉE.
 *
 * Chaque hypothèse est adossée au FAIT qui l'a produite, et dit ce qui la lève.
 * Une hypothèse repliée est une hypothèse qu'on ne lit pas : elle se rend donc
 * hors de l'accordéon, à sa place dans le flux.
 *
 * ⚠️ UNE HYPOTHÈSE QUI N'OFFRE AUCUN GESTE S'AFFICHE QUAND MÊME. On la SUBIT, et
 * c'est précisément ce qu'il faut lire.
 */
function SectionHypotheses({ creance }: { creance: CreanceOuverte }) {
	return (
		<SectionEcran
			titre="Ce que le logiciel a supposé"
			legende={
				creance.hypotheses.length === 0
					? 'Rien n’est supposé sur ce dossier'
					: `${creance.hypotheses.length} hypothèse${pluriel(creance.hypotheses.length)}, et chacune se lève`
			}
		>
			{creance.hypotheses.length === 0 ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Tout ce qui entre dans ce dossier est relevé sur une donnée que vous avez fournie ou sur
					un registre public. Aucune valeur n’y est retenue par défaut.
				</p>
			) : (
				creance.hypotheses.map((hypothese) => (
					<div key={hypothese.cle} className="flex flex-col gap-1">
						<p className="text-cladd-sm leading-relaxed font-medium text-balance">
							{hypothese.enonce}
						</p>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{hypothese.fait}</p>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
							{hypothese.ceQuiLaLeve}
						</p>
					</div>
				))
			)}
		</SectionEcran>
	);
}

/**
 * SECTION 3b — CE QUE LE LOGICIEL NE VOIT PAS, CHIFFRÉ. JAMAIS REPLIÉE.
 *
 * ⚠️ UN UTILISATEUR QUI CROIT SA PRESCRIPTION SURVEILLÉE NE LA SURVEILLE PAS
 * LUI-MÊME. Le silence du produit sur ce qu'il ne voit pas est ce qui rend
 * l'angle mort dangereux. Le reléguer sous ce qui rassure reviendrait à le
 * cacher.
 */
function SectionAnglesMorts({ creance }: { creance: CreanceOuverte }) {
	const chiffrables = creance.anglesMorts.filter((angle) => angle.montantEnJeu !== null);
	const total = chiffrables.reduce((somme, angle) => somme + (angle.montantEnJeu ?? 0n), 0n);
	const nonChiffrables = creance.anglesMorts.length - chiffrables.length;
	const pointsNonChiffres = `${nonChiffrables} point${pluriel(nonChiffrables)} non chiffrable${pluriel(nonChiffrables)}`;

	return (
		<SectionEcran
			titre="Ce que le logiciel ne voit pas"
			/*
			  ⚠️ « 0,00 € HORS SURVEILLANCE » NE S'ÉCRIT JAMAIS, et c'est une
			  correction relevée au navigateur. Un dossier dont AUCUN angle mort n'est
			  chiffrable affichait ce zéro suivi du compte des points non chiffrables :
			  le zéro s'y lit « sans enjeu », alors qu'il veut dire « on n'a pas su
			  compter ». C'est la faute que `montantEnJeu: null` existe précisément
			  pour éviter, refaite un cran plus haut, dans la légende.
			*/
			legende={
				creance.anglesMorts.length === 0
					? 'Aucun angle mort relevé sur ce dossier'
					: chiffrables.length === 0
						? pointsNonChiffres
						: nonChiffrables === 0
							? `${eurosCentimes(total)} hors surveillance`
							: `${eurosCentimes(total)} hors surveillance, plus ${pointsNonChiffres}`
			}
		>
			{creance.anglesMorts.length === 0 ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Toutes les factures de ce dossier portent une date de départ exploitable, et son échéance
					se compte. Ce contrôle se refait à chaque lecture.
				</p>
			) : (
				creance.anglesMorts.map((angle) => (
					<p
						key={angle.cle}
						className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft"
					>
						<EyeOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						<span>
							{angle.constat}{' '}
							<span className="font-semibold tabular-nums">
								{angle.montantEnJeu === null
									? '(montant non chiffrable)'
									: `(${eurosCentimes(angle.montantEnJeu)})`}
							</span>
						</span>
					</p>
				))
			)}
		</SectionEcran>
	);
}

/**
 * SECTION 4 — CE QUE VOUS SEUL POUVEZ DIRE.
 *
 * Elle POSE UNE QUESTION, et ces réponses-là décident si une procédure s'ouvre.
 * C'est la seule section qui BLOQUE : sans elles, aucune créance ne franchit le
 * seuil de qualification. Elle s'ouvre donc d'elle-même tant qu'il reste quelque
 * chose à confirmer — voir `sectionsParDefaut`.
 *
 * Les conditions légales que le logiciel n'a pas pu déduire y sont jointes :
 * même sujet — ce que le gérant est seul à savoir — donc même section.
 *
 * ⚠️ DES FAITS, PAS UNE APPRÉCIATION JURIDIQUE. « Pouvez-vous confirmer le
 * caractère certain de cette créance » n'était répondable que par un juriste ;
 * « avez-vous reçu une contestation écrite » se répond par oui ou par non.
 */
function SectionLitige({ creance }: { creance: CreanceOuverte }) {
	const aDemander = aConfirmer(creance);

	return (
		<SectionDepliable
			cle="litige"
			titre="Ce que vous seul pouvez dire"
			legende="Des faits, pas une appréciation juridique"
			valeur={
				aDemander > 0
					? `${aDemander} à confirmer`
					: creance.litige.litigieux
						? 'Litigieux'
						: 'Répondu'
			}
		>
			<QuestionnaireLitige
				questions={creance.litige.questions}
				constats={creance.litige.constats}
				litigieux={creance.litige.litigieux}
				enCours={creance.enCours}
				onRepondre={creance.onDeclarerFait}
			/>

			{creance.conditions.length === 0 ? null : (
				<>
					<p className="text-cladd-2xs font-semibold">Ce que le logiciel ne peut pas déduire</p>
					{creance.conditions.map((question) => (
						<div key={question.condition} className="flex flex-col gap-cladd-3xs">
							<p className="text-cladd-sm leading-snug text-balance">{question.libelle}</p>
							{/*
							  ⚠️ « OUI » ET « NON » SONT IDENTIQUES, DÉLIBÉRÉMENT, et c'est une
							  correction relevée au navigateur. « Oui » était une pilule
							  PRINCIPALE et « Non » une secondaire : sur une question de FAIT
							  dont la réponse décide si une procédure s'ouvre, le contraste
							  poussait vers le oui. Le questionnaire de litige, deux blocs plus
							  haut, rend déjà ses trois réponses à l'identique pour cette
							  raison exacte ; deux conventions opposées sur le même écran
							  faisaient lire une recommandation là où il n'y a qu'une question.

							  Ce qui reste : l'écran n'a plus qu'UNE action principale, « Arrêter
							  un décompte ». Deux pilules de même poids, et il n'y a plus
							  d'action principale du tout.

							  ⚠️ ET CE SONT DEUX CIBLES ISOLÉES, séparées par un vide : elles
							  doivent tenir le plancher tactile dans LES DEUX dimensions. Un
							  libellé de trois lettres ne remplit que ses rembourrages, soit
							  43,9 px de large mesurés pour 56 de haut.
							*/}
							<div className="flex flex-wrap gap-cladd-3xs">
								<BoutonSecondaire
									className="min-w-cladd-md flex-1"
									disabled={creance.enCours}
									onClick={() => creance.onRepondreCondition(question.condition, 'ok')}
								>
									Oui
								</BoutonSecondaire>
								<BoutonSecondaire
									className="min-w-cladd-md flex-1"
									disabled={creance.enCours}
									onClick={() => creance.onRepondreCondition(question.condition, 'ko')}
								>
									Non
								</BoutonSecondaire>
							</div>
						</div>
					))}
				</>
			)}
		</SectionDepliable>
	);
}

/**
 * SECTION 5a — CE QUI AFFAIBLIT CE DOSSIER. JAMAIS REPLIÉE.
 *
 * ⚠️ UN RISQUE BLOQUANT FERME TOUTES LES VOIES QUE CE LOGICIEL ÉVALUE : elles se
 * déroulent sans débat contradictoire, et une contestation, même infondée, y met
 * fin. Le dossier peut être parfait par ailleurs, il ne passera pas. Derrière un
 * pli, ce constat serait tu.
 *
 * ⚠️ ET CHAQUE RISQUE EST UN CONSTAT, JAMAIS UNE CONSÉQUENCE JURIDIQUE. « Le
 * débiteur fait l'objet d'une procédure collective » est un fait relevé au
 * registre ; ce qu'il faudrait en faire n'a été validé par personne.
 */
function SectionRisques({ creance }: { creance: CreanceOuverte }) {
	if (creance.risques.length === 0) return null;

	return (
		<SectionEcran
			titre="Ce qui affaiblit ce dossier"
			legende={`${creance.risques.length} relevé${pluriel(creance.risques.length)}`}
		>
			{creance.risques.map((risque) => (
				<div key={risque.type} className="flex gap-cladd-3xs">
					<AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
					<div className="flex min-w-0 flex-col gap-1">
						<p className="text-cladd-sm leading-snug">{risque.description}</p>
						{risque.gravite === 'BLOQUANTE' ? (
							<p className="text-cladd-2xs text-cladd-fg-soft">
								Ce constat ferme les procédures que ce logiciel évalue : elles se déroulent
								toutes sans débat contradictoire.
							</p>
						) : null}
					</div>
				</div>
			))}
		</SectionEcran>
	);
}

/**
 * SECTION 5b — CE QUE LES PIÈCES ÉTABLISSENT.
 *
 * ⚠️ SON CONSTAT EST UN COMPTE, jamais un verdict. « Trois des quatre pièces
 * attendues sont absentes » se vérifie ; « ce dossier est trop faible » est une
 * appréciation juridique.
 */
function SectionSolidite({ creance }: { creance: CreanceOuverte }) {
	return (
		<SectionDepliable
			cle="solidite"
			titre="Ce que les pièces établissent"
			legende="Ce qu’un tiers pourrait lire du dossier"
			valeur={`${creance.solidite.etablies} sur ${creance.solidite.attendues}`}
		>
			<Solidite solidite={creance.solidite} />
		</SectionDepliable>
	);
}

/** SECTION 6 — LES PIÈCES. Le dépôt, le classement, le retrait. */
function SectionPieces({ creance }: { creance: CreanceOuverte }) {
	return (
		<SectionDepliable
			cle="pieces"
			titre="Les pièces"
			legende="Déposées ici, lues et classées toutes seules"
			valeur={`${creance.pieces.length}`}
		>
			<Pieces
				pieces={creance.pieces}
				optionsType={creance.optionsTypePiece}
				enCours={creance.enCours}
				onDeposer={creance.onDeposer}
				onClasser={creance.onClasser}
				onRetirer={creance.onRetirer}
			/>
		</SectionDepliable>
	);
}

/**
 * SECTION 7 — LES FAITS CONSIGNÉS ET LA VOIE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI COURT PASSE AVANT CE QU'ON POURRAIT FAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une procédure déjà engagée fait courir des délais dont un À PEINE DE
 * CADUCITÉ : passé, l'ordonnance est perdue et tout est à reprendre pendant que
 * la prescription court. Dès qu'une voie est engagée, la liste des voies cède
 * donc toute la place — ce qui retire du même coup le geste qui permettait d'en
 * déclarer une seconde par-dessus la première, écrasant la date de la première
 * sans rien dire.
 *
 * `SuiviProcedure` porte la frise des étapes cochées, la prochaine échéance et
 * les faits déjà consignés.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ÉNUMÉRÉES, JAMAIS CLASSÉES, ET JAMAIS RECOMMANDÉES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Troisième ligne rouge. Aucune voie n'est mise en avant, et les indisponibles
 * s'affichent AVEC leur motif : un écran qui masquerait une voie laisserait
 * croire qu'elle n'existe pas, alors que ce qui manque est une valeur juridique.
 *
 * ⚠️ ET LE LOGICIEL N'ENGAGE PAS, IL ENREGISTRE. Le gérant dit ce qu'il a fait ;
 * le produit se met à compter les délais qui en découlent, et c'est tout ce
 * qu'il fait. La date saisie est celle du FAIT, pas celle de la saisie : un
 * gérant qui enregistre le 20 mars une ordonnance signifiée le 3 verrait ses
 * trois mois partir du 20, soit dix-sept jours offerts en silence sur
 * l'échéance la plus dangereuse du produit.
 */
function SectionVoies({ creance }: { creance: CreanceOuverte }) {
	/*
	  ⚠️ LES FEUILLES SONT UN ÉTAT D'ÉCRAN, PAS UN ÉTAT D'ADRESSE. On ne met pas
	  en signet une feuille ouverte. Les DEUX recherches de répertoire font
	  exception et vivent en props : leurs requêtes sont sautées tant que la
	  feuille est fermée, donc l'ouverture doit être visible de la couche qui
	  interroge la base.
	*/
	const [voieOuverte, setVoieOuverte] = useState<string | null>(null);
	const [voieDeclaree, setVoieDeclaree] = useState<string | null>(null);
	const [carnetOuvert, setCarnetOuvert] = useState(false);

	// Tout se DÉRIVE du rendu : aucune de ces valeurs n'est un état, donc aucune
	// ne peut être en retard d'un rendu sur la donnée qui la porte.
	const voie = creance.voies.find((v) => v.cle === voieOuverte) ?? null;
	const declaree = creance.voies.find((v) => v.cle === voieDeclaree) ?? null;
	const envisageables = creance.voies.filter((v) => v.disponible).length;

	return (
		<SectionDepliable
			cle="voies"
			titre={
				creance.suivi === null ? 'Les voies envisageables' : 'Ce qui court depuis l’engagement'
			}
			legende={
				creance.suivi === null
					? 'Énumérées, jamais classées. Aucune n’est mise en avant.'
					: 'Les faits consignés, et les délais qui en découlent'
			}
			valeur={
				creance.suivi !== null
					? 'Engagée'
					: envisageables > 0
						? `${envisageables} voie${pluriel(envisageables)}`
						: 'Aucune voie'
			}
		>
			{creance.suivi === null ? (
				<ListeAnalyses>
					{creance.voies.map((v) => (
						<LigneBouton
							key={v.cle}
							titre={v.nom}
							precision={
								v.etapes.length === 0
									? 'aucun délai n’en découle'
									: `${v.etapes.length} étapes · ${v.conditionsEchec.length} façons d’échouer`
							}
							valeur={v.disponible ? 'Envisageable' : 'Indisponible'}
							onClick={() => setVoieOuverte(v.cle)}
						/>
					))}
				</ListeAnalyses>
			) : (
				<>
					<SuiviProcedure
						suivi={creance.suivi}
						aujourdHui={creance.aujourdHui}
						enCours={creance.enCours}
						onConsigner={creance.onConsigner}
					/>
					{/* ⚠️ LA QUESTION SE POSE APRÈS COUP AUSSI. Un gérant qui a déclaré
					    sans le dire doit pouvoir nommer son intervenant plus tard : sans
					    cette rangée, « je le dirai plus tard » serait un mensonge. */}
					<ListeAnalyses>
						<LigneBouton
							titre="Qui fait l’acte"
							valeur={creance.nomIntervenant ?? 'Moi-même'}
							onClick={() => setCarnetOuvert(true)}
						/>
					</ListeAnalyses>
				</>
			)}

			<FeuilleVoie
				voie={voie}
				ouverte={voie !== null}
				onFermer={() => setVoieOuverte(null)}
				onDeclarer={() => setVoieDeclaree(voie?.cle ?? null)}
			/>

			{/*
			  ⚠️ LA FEUILLE DE DÉCLARATION SE REMONTE À CHAQUE VOIE, par sa `key` :
			  c'est ce qui remet la date à aujourd'hui et le choix à « rien dit » sans
			  le moindre effet. Ouvrir une voie, refermer, en ouvrir une autre et
			  retrouver la date de la première serait une erreur silencieuse sur la
			  seule donnée que ce geste enregistre.
			*/}
			{declaree === null ? null : (
				<FeuilleDeclaration
					key={declaree.cle}
					carnet={creance.carnet}
					enCours={creance.enCours}
					aujourdHui={creance.aujourdHui}
					onFermer={() => setVoieDeclaree(null)}
					onAjouter={creance.onAjouterFiche}
					onOublier={creance.onOublierFiche}
					onChercherUnCommissaire={creance.onOuvrirRechercheCommissaire}
					onChercherUnAvocat={creance.onOuvrirRechercheAvocat}
					onDeclarer={(engageeLe, choix) => {
						creance.onDeclarerVoie(declaree.cle, engageeLe, choix);
						setVoieDeclaree(null);
						setVoieOuverte(null);
					}}
				/>
			)}

			<ChoixIntervenant
				carnet={creance.carnet}
				choisi={creance.intervenantChoisi}
				ouverte={carnetOuvert}
				onFermer={() => setCarnetOuvert(false)}
				onChoisir={(intervenantId) => {
					creance.onRattacher(intervenantId);
					setCarnetOuvert(false);
				}}
				onAjouter={creance.onAjouterFiche}
				onOublier={creance.onOublierFiche}
				onChercherUnCommissaire={creance.onOuvrirRechercheCommissaire}
				onChercherUnAvocat={creance.onOuvrirRechercheAvocat}
			/>

			{/*
			  LES DEUX RECHERCHES DE RÉPERTOIRE, SŒURS DES AUTRES DANS L'ARBRE. Cladd
			  les empile comme iOS : celle du dessous recule et garde son piège à
			  focus, et Échap ferme toujours celle du dessus. Elles ne sont JAMAIS
			  imbriquées.

			  ⚠️ AUCUN DÉPARTEMENT NI AUCUN BARREAU PROPOSÉ, et c'est un constat, pas
			  un oubli : aucune fiche débiteur ne porte d'adresse aujourd'hui.
			  Proposer celui du créancier ferait chercher au mauvais endroit un gérant
			  qui ne relirait pas le champ, et il en conclurait que sa région ne compte
			  aucune étude.
			*/}
			<RechercheCommissaire
				ouverte={creance.rechercheCommissaireOuverte}
				etat={creance.etatRechercheCommissaire}
				onFermer={creance.onFermerRechercheCommissaire}
				onChercher={creance.onChercherCommissaire}
				onRetenir={creance.onRetenirEtude}
			/>
			<RechercheAvocat
				ouverte={creance.rechercheAvocatOuverte}
				repertoire={creance.repertoire}
				barreau={creance.barreau}
				specialite={creance.specialite}
				etat={creance.etatRechercheAvocat}
				onFermer={creance.onFermerRechercheAvocat}
				onChoisirBarreau={creance.onChoisirBarreau}
				onChoisirSpecialite={creance.onChoisirSpecialite}
				onRetenir={creance.onRetenirAvocat}
			/>
		</SectionDepliable>
	);
}

/**
 * SECTION 8 — CE QUE VOUS POUVEZ LUI ÉCRIRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RIEN NE PART D'ICI, ET C'EST UNE LIGNE ROUGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le recouvrement amiable pour le compte d'autrui est une activité encadrée. Ce
 * produit COMPOSE un texte que le créancier enverra LUI-MÊME, depuis sa propre
 * messagerie, sous sa propre signature. `Relances` porte « Copier », jamais
 * « Envoyer » : aucun composant d'envoi au débiteur n'existe dans `src/ui/`, et
 * cet écran n'en introduit aucun. Une commande absente ne s'active jamais par
 * accident ; une commande grisée, si.
 *
 * ⚠️ ET LES TROIS REFUS S'AFFICHENT, en quatre parties. La suspension sur un
 * débiteur en procédure collective, citée mot pour mot depuis le registre ; la
 * mise en demeure indisponible faute de mentions relevées — une mise en demeure
 * irrégulière est pire qu'aucune, parce que le créancier calcule la suite sur un
 * délai qui n'a jamais couru ; et le niveau 2 sans décompte arrêté, le seul qui
 * se lève d'un geste, dont la rangée porte « Arrêter le décompte ».
 */
function SectionRelances({ creance }: { creance: CreanceOuverte }) {
	const prets = creance.relances.filter((niveau) => niveau.disponible).length;

	return (
		<SectionDepliable
			cle="relances"
			titre="Ce que vous pouvez lui écrire"
			legende="Des brouillons, à envoyer depuis votre messagerie"
			valeur={prets > 0 ? `${prets} prêt${pluriel(prets)}` : 'Suspendues'}
		>
			<Relances niveaux={creance.relances} identifiant={creance.identifiant} />
		</SectionDepliable>
	);
}
