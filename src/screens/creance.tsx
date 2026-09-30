import { useState } from 'react';
import { Building2Icon, FileDownIcon, InfoIcon } from 'lucide-react';
import type { FicheParametre } from '../lib/verticales/recouvrement/referentiel';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	CarteEtape,
	CeQuiBloque,
	ChiffreHero,
	ChoixIntervenant,
	Decompte,
	Echelon,
	FaitsDuDossier,
	FeuilleDeclaration,
	FeuilleVoie,
	FilDuDossier,
	GestesDeLEtape,
	Lien,
	LiensDePaiement,
	LigneAnalyse,
	LigneBouton,
	ListeAnalyses,
	ListeDeRangees,
	PageEcran,
	Pieces,
	QuestionnaireLitige,
	RangeeDepliable,
	RechercheAvocat,
	RechercheCommissaire,
	RefusEnQuatreParties,
	Relances,
	SectionsDepliables,
	Solidite,
	SuiviDuDossier,
	type AlerteDossier,
	type FaitDuDossier,
	type LiensDePaiementAffiches,
	type SuiviDossierAffiche,
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
	type OrdreImputationAffichee,
	type LigneConditionAffichee,
	type LectureEtapesAffichee,
	type SituationAffichee,
	type CourriersDuDossier,
	Courriers,
	TableauConditions,
	DeuxColonnesDossier,
	QuestionsPreecrites,
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
 * UNE CRÉANCE — UN FIL, PUIS SA MATIÈRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE REPROCHE DU 30/09/2026, ET CE QU'IL MESURAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mot pour mot : « elle manque d'intuitivité ! Il y a beaucoup trop de choses
 * dans tous les sens ! […] On a encore l'impression que l'on a mis à plat toutes
 * les features dans cette page avec des sous-onglets ou des modales. »
 *
 * Relevé au navigateur, sections REPLIÉES : 6 479 px à 375 px — huit écrans de
 * défilement —, 845 mots, 129 lignes, 36 phrases de plus de six mots, 27 points
 * de décision. Et cinq répétitions nommées : le nom du client trois fois,
 * l'étape en cours deux fois, la date limite pour agir trois fois, le montant
 * deux fois, « ce que vous pouvez faire » deux listes à puces dont aucune n'est
 * cliquable.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES TROIS DÉFAUTS DE STRUCTURE, ET CE QUI LES REMPLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. L'ÉTAT ÉTAIT DIT QUATRE FOIS et n'était jamais le sujet de la page : le
 *    titre, le bloc d'identité, la frise horizontale, la carte « Maintenant ».
 *    Quatre-vingt-dix mots pour une seule chose. → `FilDuDossier`, un rail
 *    vertical où chaque bloc PEND à l'étape à laquelle il appartient.
 *
 * 2. CHAQUE CONTENEUR ÉTAIT ÉTIQUETÉ D'UNE PHRASE. Neuf en-têtes en proposition
 *    relative, chacun suivi d'une glose : cent vingt-six mots de mobilier avant
 *    le moindre contenu. → Des NOMS, et la glose descend dans le panneau.
 *    Apple, page *Writing* : « Check each word to be sure it needs to be
 *    there », et « "Favorites" conveys the same message as "Your Favorites" ».
 *
 * 3. LES DEUX COLONNES ÉTAIENT UN ORGANIGRAMME — « ce qu'on peut faire » à
 *    gauche, « ce que contient le dossier » à droite. C'est la taxonomie du
 *    LOGICIEL. → La coupure sépare maintenant LE TEMPS (le fil) de LA MATIÈRE
 *    (les rangées), et l'ordre de lecture est l'ordre du temps : le seul que
 *    personne n'a besoin d'apprendre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI EST GRAVE NE SE REPLIE PAS : IL MONTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ancienne règle disait « ce qui est grave ne se replie pas », et trois blocs
 * se rendaient donc à plat — au BAS de la colonne droite, après quatre sections
 * repliées, à cinq écrans du haut. Ne pas replier ne suffisait pas. Les risques,
 * les angles morts et l'urgence des situations montent désormais dans
 * `CeQuiBloque`, juste sous le chiffre ; l'hypothèse devient une ligne sous les
 * pastilles. Et quand il n'y a rien, RIEN ne s'écrit : « Aucun angle mort
 * relevé » suivi de trente mots pour le confirmer était du bruit pur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET ELLE NE RECOMMANDE TOUJOURS RIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Troisième ligne rouge du projet, et c'est LE point de vigilance de cette
 * refonte : une action principale unique sur l'étape en cours ne doit pas
 * devenir une recommandation déguisée. La règle tenue ici — le geste mis en
 * avant ne nomme JAMAIS une voie de droit. Il nomme un geste de bureau
 * (« Préparer un courrier »), et l'étape du tribunal reste une ligne qui
 * ÉNUMÈRE sans classer. Les brouillons de relance ne portent aucune commande
 * d'envoi : une commande absente ne s'active jamais par accident — une commande
 * grisée, si.
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

/** Un risque de la créance, tel que le score le constate. */
export interface RisqueAffiche {
	readonly type: string;
	readonly description: string;
	readonly gravite: string;
}

/**
 * LES RANGÉES QUI S'OUVRENT, DANS L'ORDRE DU FLUX.
 *
 * ⚠️ TROIS D'ENTRE ELLES VIVENT DANS LE FIL, PAS DANS LA LISTE. `courriers` et
 * `relances` pendent à l'étape « On lui écrit », `voies` à l'étape du tribunal :
 * elles appartiennent à un moment du dossier, pas à sa matière. Elles partagent
 * pourtant la même racine d'accordéon et la même liste d'ouvertes, parce que
 * l'état ouvert est UN état, adressable, et qu'une racine par carte rendrait les
 * deux familles ignorantes l'une de l'autre.
 */
export const SECTIONS_CREANCE = [
	'courriers',
	'relances',
	'voies',
	'decompte',
	'pieces',
	'litige',
	'solidite',
	'valeurs',
	'suivi'
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
	/**
	 * L'adresse électronique du client, quand elle est connue.
	 *
	 * ⚠️ SANS ELLE, UN BROUILLON N'A PAS DE DESTINATAIRE. Elle voyage jusqu'ici
	 * pour que la section des relances puisse ouvrir la messagerie du gérant, ou
	 * dire ce qui l'en empêche et où le réparer.
	 */
	readonly debiteurEmail?: string;
	readonly santeDebiteur: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly nombreFactures: number;
	readonly principalRestantDu: bigint;

	// ── 0. Où en est le dossier : les quatre étapes, déduites des faits ────────
	readonly etapes: LectureEtapesAffichee;
	/** Ce qui se pose par-dessus les étapes : contestation, procédure collective, paiement partiel, radiation. */
	readonly situations: readonly SituationAffichee[];
	/** Les courriers du dossier : préparés ici, validés par un administrateur, envoyés par le gérant. */
	readonly courriers: CourriersDuDossier;
	/** Les adresses publiques où le client peut payer, et ce qu'il faut pour en ouvrir une. */
	readonly liensDePaiement: LiensDePaiementAffiches;
	/**
	 * Ce qui s'est passé sur le dossier : le journal de la machine et les notes
	 * du gérant.
	 *
	 * ⚠️ PAS `suivi`, QUI EST DÉJÀ PRIS par le suivi de PROCÉDURE — la machine à
	 * états d'une injonction. Deux `suivi` sur le même objet se confondraient au
	 * premier coup d'œil, et ce ne sont pas du tout les mêmes faits.
	 */
	readonly suiviDuDossier: SuiviDossierAffiche;
	/** Deux questions déjà écrites pour l'étape en cours, et le geste qui les pose au compagnon. */
	readonly questionsPreecrites: readonly string[];
	readonly onPoserQuestion: (question: string) => void;

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
	/** Ce que dit la loi, ce qu'il y a dans le dossier, ce que le gérant a répondu. */
	readonly lignesConditions: readonly LigneConditionAffichee[];
	readonly onDeclarerFait: (cle: string, reponse: ReponseFait) => void;
	readonly onRepondreCondition: (condition: string, reponse: 'ok' | 'ko') => void;
	/** Le gérant choisit l'ordre d'imputation de ses paiements, pour ce dossier. */
	readonly onChoisirImputation?: (ordre: OrdreImputationAffichee) => void;

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
	readonly lignesConditions: readonly LigneConditionAffichee[];
}): number {
	return (
		creance.litige.questions.length +
		creance.lignesConditions.filter((l) => l.repondable && l.etatReponse !== 'CONFIRMEE').length
	);
}

/**
 * LES SECTIONS QUI S'OUVRENT QUAND RIEN N'EN NOMME AUCUNE.
 *
 * Le décompte, toujours : c'est le chiffre qu'on vient chercher, et le cœur du
 * produit. Et le litige quand il reste une réponse à donner — la seule section
 * qui BLOQUE, puisque sans ces réponses aucune créance ne franchit le seuil de
 * qualification.
 */
/**
 * LA SECTION OUVERTE D'EMBLÉE — UNE SEULE.
 *
 * ⚠️ IL Y EN AVAIT DEUX, ET ELLES FONT 3 700 PX À ELLES DEUX sur un téléphone :
 * le décompte décomposé et le tableau des conditions. Ouvertes ensemble, elles
 * poussaient tout le reste de la page — les courriers, les voies, les
 * documents — sous quatre écrans de défilement (audit du 29/09/2026, F4).
 *
 * ⚠️ ET C'EST CELLE QUI DEMANDE QUELQUE CHOSE QUI S'OUVRE. Quand des conditions
 * attendent une réponse, c'est le travail du jour ; sinon, c'est le décompte,
 * qui répond à « combien il me doit ». Jamais les deux : la seconde serait lue
 * par personne et coûterait la page entière.
 */
export function EcranCreance({ donnees }: { donnees: Lecture<CreanceOuverte> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	/**
	 * LES RANGÉES OUVERTES — aucune à l'arrivée.
	 *
	 * ⚠️ IL Y AVAIT UNE OUVERTURE PAR DÉFAUT, ET ELLE EST TOMBÉE. « Vos
	 * réponses » s'ouvrait d'elle-même tant qu'il restait quelque chose à
	 * confirmer, au motif que c'est la seule rangée qui BLOQUE. Le questionnaire
	 * et le tableau des conditions font 2 000 px à 375 px : la page s'ouvrait
	 * donc sur deux écrans et demi d'un contenu que personne n'avait demandé, et
	 * le fil du dossier — ce qu'on vient voir — passait sous la ligne de
	 * flottaison.
	 *
	 * Ce que l'ouverture automatique achetait, la VALEUR le rend gratuitement :
	 * « 7 à confirmer » se lit rangée fermée. C'est à ça que sert
	 * `RangeeDepliable.valeur`, et c'est pour ça qu'elle est obligatoire.
	 *
	 * ⚠️ ET RIEN NE SE SYNCHRONISE DANS UN EFFET. Un `setState` dans un effet
	 * ferait un rendu de retard, visible comme un clignotement du pli à l'arrivée
	 * des données.
	 */
	const [ouvertes, setChoisies] = useState<readonly SectionCreance[]>([]);

	/**
	 * Remplace la liste des rangées ouvertes.
	 *
	 * ⚠️ UNE SEULE RACINE D'ACCORDÉON POUR TOUT L'ÉCRAN, donc une seule liste.
	 * Il y en avait deux, une par colonne, et il fallait recoudre les deux
	 * moitiés à chaque changement — un mécanisme dont la seule raison d'être
	 * était la coupure « faire / savoir » qui vient de tomber.
	 */
	function changer(liste: readonly string[]) {
		setChoisies(
			liste.filter((cle): cle is SectionCreance =>
				(SECTIONS_CREANCE as readonly string[]).includes(cle)
			)
		);
	}

	/** Ouvre une rangée et l'amène à l'écran : le geste de l'étape en cours. */
	function ouvrir(cle: SectionCreance) {
		setChoisies([...ouvertes.filter((c) => c !== cle), cle]);
		requestAnimationFrame(() =>
			document
				.getElementById(`rangee-${cle}`)
				?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		);
	}

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
						? { vers: '/app/clients', libelle: TITRE_ECRAN.debiteurs }
						: {
								vers: '/app/clients/$id',
								parametres: { id: pret.debiteurId },
								libelle: TITRE_ECRAN.debiteurs
							},
				titre: pret?.debiteur ?? 'Dossier',
				/*
				  ⚠️ PLUS DE SOUS-TITRE. Il portait « 1 facture · 6 000,00 € impayés »,
				  c'est-à-dire le nombre de factures — devenu une pastille cent pixels
				  plus bas — et un montant qui n'est PAS celui du chiffre en grand :
				  le principal restant dû, à côté du total pénalités comprises. Deux
				  sommes voisines et différentes sous le même nom de client, c'est la
				  lecture qu'on ne peut pas rattraper.
				*/
				sousTitre: undefined
			}}
			etat={donnees.etat}
			largeur="large"
		>
			{pret === null ? null : (
				<SectionsDepliables ouvertes={ouvertes} onOuvertesChange={changer}>
					{pret.erreur === null ? null : (
						<p className="text-cladd-xs text-cladd-fg">{pret.erreur}</p>
					)}

					<EnTeteCreance creance={pret} />

					{/*
					  ⚠️ CE QUI BLOQUE EST AU-DESSUS DES DEUX COLONNES, pas dans l'une
					  d'elles. Une alerte rangée dans une colonne est une alerte qu'on
					  peut ne pas regarder : à 1024 px, la colonne de droite commence
					  sous le pouce droit, et l'œil descend la gauche.
					*/}
					<CeQuiBloque alertes={alertesDuDossier(pret)} />

					<DeuxColonnesDossier
						gauche={
							<>
								<FilDuDossier classe={pret.etapes.classe}>
									{pret.etapes.etapes.map((etape, rang) => (
										<Echelon
											key={etape.cle}
											etat={etape.etat}
											titre={etape.titre}
											detail={etape.etat === 'EN_COURS' ? null : etape.detail}
											dernier={rang === pret.etapes.etapes.length - 1}
										>
											<ContenuEchelon
												cle={etape.cle}
												enCours={etape.etat === 'EN_COURS'}
												creance={pret}
												onOuvrir={ouvrir}
											/>
										</Echelon>
									))}
								</FilDuDossier>

								{/*
								  LE PIED DE LA COLONNE : la fiche du client, puis l'aide.
								  C'est là qu'on arrive quand on n'a pas trouvé, et c'est la
								  seule raison pour laquelle ces deux-là sont encore sur cette
								  page — elles ne servent aucun des trois moments d'usage.
								*/}
								{/*
								  ⚠️ LA SANTÉ DU CLIENT N'EST PLUS DÉCORÉE ICI. La rangée portait
								  « Relevée au registre public » et « Procédure collective » — une
								  troisième mention du même fait, après la pastille de l'en-tête
								  et la carte de ce qui bloque. Ce que cette rangée apporte, et
								  qu'aucun autre bloc ne donne, c'est le CHEMIN vers la fiche.
								*/}
								<ListeAnalyses>
									<LigneAnalyse
										vers="/app/clients/$id"
										parametres={{ id: pret.debiteurId }}
										icone={<Building2Icon />}
										titre="Fiche du client"
										valeur={pret.debiteur}
									/>
								</ListeAnalyses>
								<QuestionsPreecrites
									questions={pret.questionsPreecrites}
									onPoser={pret.onPoserQuestion}
								/>
							</>
						}
						droite={
							<ListeDeRangees titre="Le dossier">
								<RangeeDecompte creance={pret} />
								<RangeePieces creance={pret} />
								<RangeeLitige creance={pret} />
								<RangeeSolidite creance={pret} />
								<RangeeValeursJuridiques fiches={pret.fiches} />
								<RangeeSuivi creance={pret} />
							</ListeDeRangees>
						}
					/>
				</SectionsDepliables>
			)}
		</PageEcran>
	);
}

/**
 * CE QUI PEND À UN ÉCHELON DU FIL.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CHAQUE BLOC VIT À L'ÉTAPE À LAQUELLE IL APPARTIENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les courriers et les relances pendent à « On lui écrit ». Les voies pendent au
 * tribunal. Ils vivaient auparavant dans un accordéon rangé par NATURE — « ce
 * qu'on peut faire » —, c'est-à-dire à un endroit qu'il fallait deviner.
 *
 * ⚠️ ILS PENDENT À LEUR ÉTAPE MÊME QUAND ELLE N'EST PAS ENCORE ATTEINTE, et
 * c'est voulu : on prépare un courrier depuis l'étape « Prêt », et le geste doit
 * mener quelque part. L'échelon à venir montre alors, d'un coup d'œil, que le
 * geste qu'on s'apprête à faire fera avancer le dossier d'un cran.
 */
function ContenuEchelon({
	cle,
	enCours,
	creance,
	onOuvrir
}: {
	readonly cle: string;
	readonly enCours: boolean;
	readonly creance: CreanceOuverte;
	readonly onOuvrir: (cle: SectionCreance) => void;
}) {
	const gestes = enCours ? (
		<GestesDeLEtape
			principal={
				<BoutonPrincipal onClick={() => onOuvrir('courriers')}>
					Préparer un courrier
				</BoutonPrincipal>
			}
			autres={[
				{ libelle: 'Lui écrire', onClick: () => onOuvrir('relances') },
				{ libelle: 'Voir les suites', onClick: () => onOuvrir('voies') }
			]}
		/>
	) : null;

	const rangees =
		cle === 'ON_LUI_ECRIT' ? (
			<ListeDeRangees>
				<RangeeCourriers creance={creance} />
				<RangeeRelances creance={creance} />
			</ListeDeRangees>
		) : cle === 'TRIBUNAL' ? (
			<ListeDeRangees>
				<RangeeVoies creance={creance} />
			</ListeDeRangees>
		) : null;

	if (enCours) {
		return (
			<CarteEtape
				ceQuiSePasse={creance.etapes.ceQuiSePasse}
				siRienNeBouge={creance.etapes.siRienNeBouge}
			>
				{rangees}
				{creance.etapes.etape === 'REGLE' ? null : gestes}
			</CarteEtape>
		);
	}

	return rangees;
}

/**
 * LES FAITS DU DOSSIER, TELS QU'ILS TIENNENT EN PASTILLES.
 *
 * ⚠️ TROIS MOTS PAR FAIT, ET AUCUN N'EST UN VERDICT. « procédure collective » se
 * relève au registre public ; « dossier compromis » serait une appréciation
 * juridique, et ce logiciel n'en rend aucune.
 */
function faitsDuDossier(creance: CreanceOuverte): readonly FaitDuDossier[] {
	const faits: FaitDuDossier[] = [
		{
			cle: 'factures',
			texte: `${creance.nombreFactures} facture${pluriel(creance.nombreFactures)}`
		}
	];

	if (creance.echeanceLaPlusAncienne !== null) {
		faits.push({
			cle: 'echeance',
			texte: `à payer le ${dateCourte(creance.echeanceLaPlusAncienne)}`
		});
	}

	/*
	  ⚠️ LA DATE LIMITE POUR AGIR PORTE SA DATE, PAS UN ADJECTIF. C'est la seule
	  échéance qui éteint définitivement une créance sans que personne n'ait rien
	  fait, et « bientôt » ne se vérifie pas. Quand elle ne se calcule pas, la
	  pastille le DIT et se distingue : un fait manquant sur cette ligne-là vaut
	  un fait grave.
	*/
	if (creance.prescriptionLaPlusProche === null) {
		faits.push({ cle: 'agir', texte: 'date limite non calculable', marquant: true });
	} else if (creance.prescriptionLaPlusProche < creance.aujourdHui) {
		// Le seul état du produit où l'on perd tout sans que personne n'ait rien
		// fait. La pastille le dit, et la ligne « Si rien ne bouge » le redit.
		faits.push({
			cle: 'agir',
			texte: `date limite dépassée le ${dateCourte(creance.prescriptionLaPlusProche)}`,
			marquant: true
		});
	} else {
		faits.push({
			cle: 'agir',
			texte: `agir avant le ${dateCourte(creance.prescriptionLaPlusProche)}`
		});
	}

	if (creance.santeDebiteur === 'PROCEDURE_COLLECTIVE') {
		faits.push({ cle: 'sante', texte: 'procédure collective', marquant: true });
	}
	if (creance.santeDebiteur === 'RADIEE') {
		faits.push({ cle: 'sante', texte: 'entreprise radiée', marquant: true });
	}

	return faits;
}

/**
 * CE QUE LE LOGICIEL A SUPPOSÉ, EN UNE LIGNE.
 *
 * ⚠️ L'ÉNONCÉ JURIDIQUE N'Y EST PLUS, ET IL N'EST PAS PERDU. Il faisait trente
 * mots de référentiel (« Régime général des obligations nées à l'occasion de
 * leur commerce… ») en tête d'une carte que personne ne lisait. Il vit dans
 * « Les chiffres de la loi », avec sa source et sa date de relevé, c'est-à-dire
 * à l'endroit où on le contrôle. Ce qui reste ici est ce qui SERT : le fait qui
 * a produit l'hypothèse, et le geste qui la lève.
 */
function suppositionDuDossier(creance: CreanceOuverte): string | null {
	if (creance.hypotheses.length === 0) return null;
	const phrases = creance.hypotheses
		.map((hypothese) => `${hypothese.fait} ${hypothese.ceQuiLaLeve}`)
		.join(' ');
	// La phrase du référentiel commence par une majuscule ; elle suit ici un
	// deux-points, donc elle ne peut pas la garder.
	return `Supposé : ${phrases.charAt(0).toLocaleLowerCase('fr-FR')}${phrases.slice(1)}`;
}

/**
 * LA SITUATION QUI COUVRE DÉJÀ UN RISQUE.
 *
 * ⚠️ SANS ÇA, LA PROCÉDURE COLLECTIVE S'ÉCRIRAIT DEUX FOIS DANS LE MÊME CADRE.
 * Elle est à la fois une SITUATION (ce qui se passe, la date limite, les choix)
 * et un RISQUE relevé par le score. Les deux blocs vivaient à deux écrans l'un
 * de l'autre, ce qui masquait la répétition ; réunis en tête de page, elle
 * saute aux yeux.
 *
 * Les quatre clés de situation sont CONTESTATION, PROCEDURE_COLLECTIVE,
 * PAIEMENT_PARTIEL et RADIEE. Les types de risque sont PROCEDURE_COLLECTIVE,
 * DEBITEUR_RADIE, RETARDS_REPETES, et tous les signaux de contestation — d'où
 * les deux seules traductions nécessaires.
 */
function situationQuiCouvre(type: string): string {
	if (type === 'DEBITEUR_RADIE') return 'RADIEE';
	if (type === 'PROCEDURE_COLLECTIVE' || type === 'RETARDS_REPETES') return type;
	return 'CONTESTATION';
}

/**
 * CE QUI BLOQUE : les situations, puis les risques qu'aucune ne couvre, puis
 * les angles morts.
 *
 * ⚠️ L'ORDRE N'EST PAS UN CLASSEMENT DE GRAVITÉ, c'est un ordre de NATURE : ce
 * qui se passe, ce qui a été relevé, ce qui n'est pas vu. Trier par gravité
 * reviendrait à dire lequel traiter d'abord, et personne ici n'a le droit de le
 * dire.
 */
function alertesDuDossier(creance: CreanceOuverte): readonly AlerteDossier[] {
	const couvertes = new Set(creance.situations.map((situation) => situation.cle));

	const desSituations: AlerteDossier[] = creance.situations.map((situation) => ({
		cle: `situation-${situation.cle}`,
		titre: situation.titre,
		phrases: situation.ceQuiSePasse,
		echeance:
			situation.dateLimite === null
				? null
				: {
						libelle: situation.dateLimite.libelle,
						date: situation.dateLimite.date,
						precisions: [
							...(situation.dateLimite.reporteeDe === null
								? []
								: [
										`Le délai finissait le ${dateCourte(situation.dateLimite.reporteeDe)}, un jour non ouvrable : il est reporté au premier jour ouvrable suivant.`
									]),
							...(situation.dateLimite.departNonPrecise === null
								? []
								: [situation.dateLimite.departNonPrecise])
						],
						source: situation.dateLimite.source
					},
		options: situation.options,
		citation: situation.citation
	}));

	/*
	  ⚠️ UN RISQUE BLOQUANT FERME TOUTES LES VOIES QUE CE LOGICIEL ÉVALUE : elles
	  se déroulent sans débat contradictoire, et une contestation, même infondée,
	  y met fin. Le dossier peut être parfait par ailleurs, il ne passera pas.
	  C'est la seule phrase que le risque ajoute, et elle ne s'écrit que pour un
	  risque bloquant.
	*/
	const desRisques: AlerteDossier[] = creance.risques
		.filter((risque) => !couvertes.has(situationQuiCouvre(risque.type)))
		.map((risque) => ({
			cle: `risque-${risque.type}`,
			titre: risque.description,
			phrases:
				risque.gravite === 'BLOQUANTE'
					? [
							'Quand on demande au tribunal de le faire payer, ou qu’on passe par un commissaire de justice, tout se fait sans débat, et une contestation y met fin.'
						]
					: [],
			echeance: null,
			options: [],
			citation: null
		}));

	/*
	  ⚠️ « 0,00 € HORS SURVEILLANCE » NE S'ÉCRIT JAMAIS. Un angle mort dont le
	  montant n'est pas chiffrable porte `null`, et le dire en euros le lirait
	  « sans enjeu » alors qu'il veut dire « on n'a pas su compter ».
	*/
	const desAnglesMorts: AlerteDossier[] = creance.anglesMorts.map((angle) => ({
		cle: `angle-${angle.cle}`,
		titre: 'Ce que le logiciel ne voit pas',
		phrases: [
			angle.montantEnJeu === null
				? `${angle.constat} (montant non chiffrable)`
				: `${angle.constat} (${eurosCentimes(angle.montantEnJeu)})`
		],
		echeance: null,
		options: [],
		citation: null
	}));

	return [...desSituations, ...desRisques, ...desAnglesMorts];
}

/**
 * L'EN-TÊTE : COMBIEN, ET LES FAITS QUI LE QUALIFIENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL PORTAIT, ET QUI EST PARTI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une rangée d'identité du client — déjà le titre de la page, donc le nom écrit
 * trois fois sur le même écran — puis une carte de deux `LigneValeur` : deux
 * lignes de 48 px pour deux dates de dix caractères. Les autres faits du dossier
 * vivaient en cartes de prose, quatre écrans plus bas.
 *
 * Six faits, dispersés. Ils tiennent maintenant en deux lignes de pastilles, et
 * c'est ce qui sert le moment d'usage le plus fréquent du produit : le client au
 * téléphone, qui veut un chiffre et une date à voix haute, en cinq secondes.
 *
 * La fiche du client, elle, n'est pas perdue : elle est descendue en pied de la
 * colonne de gauche, là où l'on arrive quand on n'a pas trouvé.
 *
 * ⚠️ LE CHIFFRE NE MENT PAS SUR CE QU'IL EST. Quand le calcul du jour aboutit,
 * c'est le TOTAL — principal, intérêts, indemnité — et la légende le dit. Quand
 * il ne se fait pas, le chiffre retombe sur le principal restant dû et la
 * légende le dit AUSSI : afficher le principal seul sous l'étiquette « dû
 * aujourd'hui » ferait lire un total amputé des intérêts.
 *
 * ⚠️ ET IL N'EST JAMAIS COLORÉ. Le vert, le rouge et l'ambre ne disent qu'une
 * chose dans ce produit — au-dessus du seuil, tout près, en dessous. Un montant
 * dû n'est pas un verdict : c'est une somme.
 */
function EnTeteCreance({ creance }: { creance: CreanceOuverte }) {
	const montant = creance.montantDuJour;

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<ChiffreHero
				centimes={montant?.total ?? creance.principalRestantDu}
				surTitre={montant === null ? 'Reste à payer sur les factures' : 'Dû aujourd’hui'}
				legende={
					montant === null
						? 'Les pénalités ne se calculent pas : le décompte dit pourquoi.'
						: 'Factures, pénalités et frais, au jour d’aujourd’hui. Il monte chaque jour.'
				}
			/>
			<FaitsDuDossier faits={faitsDuDossier(creance)} supposition={suppositionDuDossier(creance)} />
		</div>
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
function RangeeDecompte({ creance }: { creance: CreanceOuverte }) {
	const montant = creance.montantDuJour;

	return (
		<RangeeDepliable
			cle="decompte"
			titre="Décompte"
			glose="Au jour d’aujourd’hui, et il bouge chaque jour."
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
					<Decompte decompte={montant} onChoisirImputation={creance.onChoisirImputation} />
					<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						Ce montant n’est pas arrêté : il se recalcule à chaque lecture, et il augmente tant que
						la facture n’est pas réglée. Ce qui s’oppose à un tiers est un décompte arrêté, daté et
						figé.
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
						Télécharger le calcul
					</BoutonSecondaire>
				)}
			</div>

			{/*
			  ⚠️ LE LIEN DE PAIEMENT EST ICI, SOUS LE DÉCOMPTE, ET PAS DANS LES
			  COURRIERS. Il ne s'ouvre que sur un décompte ARRÊTÉ : sa place est
			  auprès de ce qui l'arrête, pas auprès de ce qui l'envoie.
			*/}
			<LiensDePaiement {...creance.liensDePaiement} />
		</RangeeDepliable>
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
function RangeeValeursJuridiques({ fiches }: { fiches: readonly FicheParametre[] }) {
	if (fiches.length === 0) return null;

	const verifiees = fiches.filter((fiche) => fiche.verifie).length;
	const controlees = fiches.filter((fiche) => fiche.valideParAvocat).length;

	return (
		<RangeeDepliable
			cle="valeurs"
			titre="Les chiffres de la loi"
			glose="Leur source, leur date de relevé, et ce qu’on a le droit d’en faire."
			valeur={`${verifiees} sur ${fiches.length}`}
		>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				{verifiees} relevée{pluriel(verifiees)} sur {fiches.length} sur une source publique citable,{' '}
				{controlees} contrôlée{pluriel(controlees)} par un juriste. Une valeur relevée suffit à
				calculer ; seule une valeur contrôlée suffit à produire un acte.
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
		</RangeeDepliable>
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
function RangeeLitige({ creance }: { creance: CreanceOuverte }) {
	const aDemander = aConfirmer(creance);

	return (
		<RangeeDepliable
			cle="litige"
			titre="Vos réponses"
			glose="Des faits, pas une appréciation juridique : vous seul pouvez les dire."
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

			<p className="text-cladd-2xs font-semibold">Ce que dit la loi, en face de votre dossier</p>
			<TableauConditions
				lignes={creance.lignesConditions}
				enCours={creance.enCours}
				onRepondre={creance.onRepondreCondition}
			/>
		</RangeeDepliable>
	);
}

/**
 * SECTION 5b — CE QUE LES PIÈCES ÉTABLISSENT.
 *
 * ⚠️ SON CONSTAT EST UN COMPTE, jamais un verdict. « Trois des quatre pièces
 * attendues sont absentes » se vérifie ; « ce dossier est trop faible » est une
 * appréciation juridique.
 */
function RangeeSolidite({ creance }: { creance: CreanceOuverte }) {
	return (
		<RangeeDepliable
			cle="solidite"
			titre="Solidité"
			glose="Ce qu’un tiers pourrait lire du dossier, document par document."
			valeur={`${creance.solidite.etablies} sur ${creance.solidite.attendues}`}
		>
			<Solidite solidite={creance.solidite} />
		</RangeeDepliable>
	);
}

/** LES PIÈCES. Le dépôt, le classement, le retrait. */
function RangeePieces({ creance }: { creance: CreanceOuverte }) {
	return (
		<RangeeDepliable
			cle="pieces"
			titre="Documents"
			glose="Déposés ici, lus et classés tout seuls."
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
		</RangeeDepliable>
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
function RangeeVoies({ creance }: { creance: CreanceOuverte }) {
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
		<RangeeDepliable
			cle="voies"
			titre={creance.suivi === null ? 'Les suites' : 'Procédure'}
			glose={
				creance.suivi === null
					? 'Énumérées, jamais classées. Aucune n’est mise en avant.'
					: 'Les faits consignés, et les délais qui en découlent.'
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
		</RangeeDepliable>
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
function RangeeRelances({ creance }: { creance: CreanceOuverte }) {
	const prets = creance.relances.filter((niveau) => niveau.disponible).length;

	return (
		<RangeeDepliable
			cle="relances"
			titre="Relances"
			glose="Des brouillons, à envoyer depuis votre messagerie."
			valeur={prets > 0 ? `${prets} prêt${pluriel(prets)}` : 'Suspendues'}
		>
			<Relances
				niveaux={creance.relances}
				identifiant={creance.identifiant}
				destinataire={creance.debiteurEmail}
				identifiantDebiteur={creance.debiteurId}
			/>
		</RangeeDepliable>
	);
}

/**
 * VOS COURRIERS — la lettre de relance officielle, l'accord d'échéancier, la
 * déclaration de ce qu'il vous doit, et ce qui part vers votre avocat ou le
 * commissaire de justice. Préparés ici, validés par un administrateur, envoyés
 * par vous.
 */
/**
 * CE QUI S'EST PASSÉ, ET CE QU'ON Y NOTE.
 *
 * ⚠️ EN PREMIÈRE POSITION DE LA COLONNE DE GAUCHE, avant les courriers. « Où
 * j'en suis » est la première question qu'on se pose en ouvrant un dossier, et
 * elle n'avait aucune réponse : le journal des faits existait en base et ne
 * s'affichait nulle part, et rien ne portait un appel, une promesse ou une note
 * (audit du 29/09/2026, F3).
 *
 * ⚠️ LA VALEUR COMPTE CE QUI ATTEND, PAS CE QU'IL Y A. « 14 faits » est un
 * cadran ; « 2 à trancher » dit qu'une promesse est arrivée à son jour sans
 * qu'on sache si elle a été tenue, et c'est la seule chose qui appelle le
 * gérant depuis cette rangée repliée.
 */
function RangeeSuivi({ creance }: { creance: CreanceOuverte }) {
	const notes = creance.suiviDuDossier.notes;
	const enAttente = notes.filter(
		(note) =>
			(note.genre === 'PROMESSE' && note.issue === undefined) ||
			(note.genre === 'RAPPEL' && note.faitLe === undefined)
	).length;
	return (
		<RangeeDepliable
			cle="suivi"
			titre="Historique"
			glose="Vos notes, vos échanges, et ce que le logiciel a constaté."
			// ⚠️ LA VALEUR COMPTE CE QUI ATTEND AVANT CE QU'IL Y A. « 2 à trancher »
			// dit qu'une promesse est arrivée à son jour sans qu'on sache si elle a
			// été tenue ; « 14 faits » est un cadran. Mais une rangée sans valeur
			// oblige à l'ouvrir pour savoir si elle est vide, alors le compte des
			// faits prend le relais quand rien n'attend.
			valeur={
				enAttente > 0
					? `${enAttente} à trancher`
					: notes.length === 0
						? 'rien encore'
						: `${notes.length} fait${pluriel(notes.length)}`
			}
		>
			<SuiviDuDossier {...creance.suiviDuDossier} />
		</RangeeDepliable>
	);
}

function RangeeCourriers({ creance }: { creance: CreanceOuverte }) {
	const envois = creance.courriers.envois;
	const aValider = envois.filter((e) => e.etat === 'A_VALIDER').length;
	return (
		<RangeeDepliable
			cle="courriers"
			titre="Courriers"
			glose="À votre nom, relus et validés par vous, envoyés par vous."
			valeur={
				aValider > 0
					? `${aValider} à valider`
					: envois.length === 0
						? 'aucun'
						: `${envois.length} parti${pluriel(envois.length)}`
			}
		>
			<Courriers courriers={creance.courriers} />
		</RangeeDepliable>
	);
}
