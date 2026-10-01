import { useState } from 'react';
import { SectionTitle } from '@cladd-ui/react';
import { FileDownIcon, InfoIcon } from 'lucide-react';
import type { FicheParametre } from '../lib/verticales/recouvrement/referentiel';
import {
	ApercuDuSuivi,
	Avatar,
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	CeQuiBloque,
	ChiffreHero,
	ChoixIntervenant,
	Courriers,
	Decompte,
	EtatDuDossier,
	FeuilleDeclaration,
	FeuilleVoie,
	Lien,
	LiensDePaiement,
	LigneAnalyse,
	LigneBouton,
	ListeAnalyses,
	ListeDeRangees,
	PageEcran,
	PanneauDuGeste,
	Pieces,
	QuestionnaireLitige,
	RangeeDepliable,
	RangeeLien,
	RechercheAvocat,
	RechercheCommissaire,
	RefusEnQuatreParties,
	Relances,
	SectionsDepliables,
	Solidite,
	SuiviDuDossier,
	SuiviProcedure,
	Tableau,
	TableauCellule,
	TableauConditions,
	TableauCorps,
	TableauEntete,
	TableauLigne,
	TableauTitre,
	dateCourte,
	eurosCentimes,
	pluriel,
	useDeuxVolets,
	useSectionOuverte,
	type AlerteDossier,
	type AvocatAffiche,
	type ChoixDeclare,
	type CourriersDuDossier,
	type DecompteAffiche,
	type EtatRechercheAvocat,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type FicheASaisir,
	type FicheIntervenant,
	type ProfessionnelsProposes,
	type Lecture,
	type LectureEtapesAffichee,
	type LiensDePaiementAffiches,
	type LigneConditionAffichee,
	type NiveauAffiche,
	type OptionTypePiece,
	type OrdreImputationAffichee,
	type PieceAffichee,
	type QuestionLitige,
	type ReponseFait,
	type RepertoireAffiche,
	type SituationAffichee,
	type SoliditeAffichee,
	type SuiviAffiche,
	type SuiviDossierAffiche,
	type VoieAffichee
} from '../ui';
import { TITRE_ECRAN } from './titres';

/**
 * UN DOSSIER — COMBIEN, OÙ ON EN EST, ET LE SEUL GESTE QUI COMPTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE REPROCHE DU 30/09/2026 AU SOIR, ET CE QU'IL MESURAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mot pour mot : « on doit cliquer partout, il n'y a rien de clair […] tu crois
 * qu'en mettant plein de boutons et de trucs cliquables on va prouver que c'est
 * une app bien et utile, alors que c'est totalement faux ! Less is more. »
 *
 * Relevé à 393 px, la largeur des captures de référence : VINGT cibles dans la
 * page, qui ne faisaient que QUATRE choses. « Préparer » (un disque),
 * « Préparer un courrier » (un bouton) et « Courriers » (une rangée) ouvraient le
 * même panneau ; « Les suites » s'écrivait trois fois, « Lui écrire » deux fois,
 * « Décompte » deux fois. Et les mots étaient ceux du logiciel : « Solidité 1 sur
 * 4 », « Les chiffres de la loi 42 sur 45 », « Supposé : … ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA RÈGLE : CHAQUE QUESTION A UNE RÉPONSE, À UN SEUL ENDROIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le code de Shop sur une commande (relevé sur Mobbin le même jour) : un
 * titre qui répond à la seule question, une barre fine, les trois derniers
 * événements puis « View all activity », et une seule carte d'actions rares. Le
 * reçu — le détail du montant — est à un appui, jamais à plat.
 *
 *   1. Combien, jusqu'à quand → le montant, et la date limite pour agir dessous.
 *   2. Ce qui change la donne → une ligne par situation ; le détail au toucher.
 *   3. Où on en est, que faire → l'état en toutes lettres, la barre, UN bouton.
 *   4. Ce qui s'est passé → les trois derniers faits, puis tout l'historique.
 *   5. Le reste → six rangées, et pas une de plus.
 *
 * ⚠️ UNE COLONNE, À TOUTES LES LARGEURS. Les deux colonnes de 1024 px séparaient
 * « le temps » de « la matière » : une taxonomie à apprendre, et un œil qui
 * zigzague. Shop, Apple et Revolut rendent le détail d'un objet en une colonne ;
 * au-delà de 1024 px les panneaux se déplient sur place, c'est tout ce qui change.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET ELLE NE RECOMMANDE TOUJOURS RIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Troisième ligne rouge : le bouton unique ne doit pas devenir une
 * recommandation déguisée. Il nomme un geste de bureau — « Relancer », « Relire
 * le courrier », « Préparer un courrier » — et JAMAIS une voie de droit ; les
 * voies restent une rangée qui énumère sans classer. `page-dossier.test.ts` lit
 * les libellés de `gesteDuDossier` pour le vérifier.
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
 * LES PANNEAUX DE LA PAGE — CINQ RANGÉES, ET L'HISTORIQUE.
 *
 * ⚠️ IL Y EN AVAIT DIX. « Relances » est entrée dans « Courriers et e-mails » :
 * pour le gérant, un e-mail de relance et une lettre sont la même chose — lui
 * écrire —, et deux rangées l'obligeaient à savoir laquelle ouvrir. « Solidité »
 * est entrée dans « Documents », dont elle compte les pièces. « Les chiffres de
 * la loi » sont entrés dans « Pénalités et frais », qui les emploie. Et
 * l'historique n'a plus de rangée : ses trois derniers faits sont à plat, et
 * son bouton ouvre le reste (`PanneauDuGeste`).
 *
 * ⚠️ L'ÉTAT OUVERT RESTE UN ÉTAT, ADRESSABLE, ET UN SEUL. Une seule racine
 * d'accordéon pour la page, une seule liste d'ouvertes : le bouton de l'état du
 * dossier et la rangée qu'il ouvre ne peuvent pas se désaccorder.
 */
export const SECTIONS_CREANCE = [
	'courriers',
	'decompte',
	'pieces',
	'litige',
	'voies',
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
	/**
	 * Les professionnels près du client, proposés dans la feuille « Qui fait
	 * l'acte » sans rien saisir (01/10/2026). Le carnet du compte n'est plus un
	 * passage obligé : un toucher ajoute et choisit.
	 */
	readonly professionnels: ProfessionnelsProposes;
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

export function EcranCreance({ donnees }: { donnees: Lecture<CreanceOuverte> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;
	const deuxVolets = useDeuxVolets();

	/**
	 * LES PANNEAUX OUVERTS — aucun à l'arrivée.
	 *
	 * ⚠️ RIEN NE S'OUVRE TOUT SEUL. Ce que l'ouverture automatique achetait, la
	 * VALEUR de la rangée le rend gratuitement : « 7 attendues » se lit rangée
	 * fermée. Et rien ne se synchronise dans un effet — un rendu de retard se
	 * voit comme un clignotement à l'arrivée des données.
	 */
	const [ouvertes, setChoisies] = useState<readonly SectionCreance[]>([]);

	/** Remplace la liste des panneaux ouverts, en ne gardant que ceux de la page. */
	function changer(liste: readonly string[]) {
		setChoisies(
			liste.filter((cle): cle is SectionCreance =>
				(SECTIONS_CREANCE as readonly string[]).includes(cle)
			)
		);
	}

	/**
	 * Ouvre la rangée que le bouton de l'état désigne.
	 *
	 * ⚠️ ON NE FAIT DÉFILER QU'AU-DELÀ DE 1024 PX. En dessous, la rangée se
	 * présente en feuille par-dessus la page : faire défiler la page SOUS la
	 * feuille la déplaçait derrière le doigt, et on la retrouvait ailleurs en
	 * refermant.
	 */
	function ouvrir(cle: SectionCreance) {
		setChoisies([...ouvertes.filter((c) => c !== cle), cle]);
		if (!deuxVolets) return;
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
				  ⚠️ LE RETOUR VISE LA PAGE DU CLIENT DÈS QU'ON SAIT QUI IL EST, et la
				  liste seulement tant qu'on ne le sait pas encore. Une route à
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
				titre: pret?.debiteur ?? 'Dossier'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<SectionsDepliables ouvertes={ouvertes} onOuvertesChange={changer}>
					{pret.erreur === null ? null : (
						<p className="text-cladd-xs text-cladd-fg">{pret.erreur}</p>
					)}

					<EnTeteCreance creance={pret} />

					{/*
					  ⚠️ CE QUI CHANGE LA DONNE PASSE AVANT L'ÉTAT. Une procédure
					  collective suspend les relances : lire « Relancer » avant de lire
					  qu'on ne peut plus relancer, c'est appuyer pour rien.
					*/}
					<CeQuiBloque alertes={alertesDuDossier(pret)} />

					<CarteDeLEtat creance={pret} onOuvrir={ouvrir} />

					<CarteDuSuivi creance={pret} />

					<ListeDeRangees>
						<RangeeCourriers creance={pret} />
						<RangeeDecompte creance={pret} />
						<RangeePieces creance={pret} />
						<RangeeLitige creance={pret} />
						<RangeeVoies creance={pret} />
						<RangeeLien
							vers="/app/clients/$id"
							parametres={{ id: pret.debiteurId }}
							titre="Fiche du client"
							avatar={<Avatar nom={pret.debiteur} className="size-8" />}
						/>
					</ListeDeRangees>
				</SectionsDepliables>
			)}
		</PageEcran>
	);
}

/**
 * COMBIEN, ET JUSQU'À QUAND.
 *
 * C'est le moment d'usage le plus fréquent du produit : le client au téléphone,
 * qui veut un chiffre et une date à voix haute, en cinq secondes. Les deux sont
 * là, et rien d'autre — les quatre pastilles et la ligne « Supposé : … » sont
 * parties. Le nombre de factures est dans « Pénalités et frais » ; la supposition
 * du calcul aussi, là où on le contrôle.
 *
 * ⚠️ LE CHIFFRE NE MENT PAS SUR CE QU'IL EST. Quand le calcul du jour aboutit,
 * c'est le TOTAL — factures, pénalités, frais — et le surtitre le dit. Quand il
 * ne se fait pas, le chiffre retombe sur les factures seules, et le surtitre le
 * dit AUSSI.
 *
 * ⚠️ LA DATE LIMITE POUR AGIR PORTE SA DATE, PAS UN ADJECTIF. C'est la seule
 * échéance qui éteint une créance sans que personne n'ait rien fait. Quand elle
 * ne se calcule pas, ou qu'elle est passée, la ligne le DIT et se distingue —
 * sans couleur : le rouge, l'ambre et le vert ne disent que les seuils.
 */
function EnTeteCreance({ creance }: { creance: CreanceOuverte }) {
	const montant = creance.montantDuJour;
	const limite = creance.prescriptionLaPlusProche;

	return (
		<ChiffreHero
			className="py-cladd-3xs"
			centimes={montant?.total ?? creance.principalRestantDu}
			surTitre={
				montant === null ? 'Reste à payer, hors pénalités' : 'Dû aujourd’hui, pénalités comprises'
			}
			legende={
				limite === null ? (
					<span className="font-semibold text-cladd-fg">
						Date limite pour agir : non calculable
					</span>
				) : limite < creance.aujourdHui ? (
					<span className="font-semibold text-cladd-fg">
						Date limite pour agir dépassée le {dateCourte(limite)}
					</span>
				) : (
					`Date limite pour agir : ${dateCourte(limite)}`
				)
			}
		/>
	);
}

/**
 * L'ÉTAT DU DOSSIER, EN TOUTES LETTRES.
 *
 * ⚠️ « PRÊT » NE DISAIT RIEN. Prêt à quoi ? Le titre de l'étape était celui du
 * modèle, pas celui du gérant. Ce qu'on veut lire en ouvrant un dossier, c'est
 * ce qui a été FAIT : « Pas encore relancé », « Relancé ». La ligne dessous est
 * un fait, jamais un conseil — « Il devait payer le 1 mai 2026 ».
 */
function etatEnClair(creance: CreanceOuverte): { titre: string; sousTitre: string | null } {
	const echeance =
		creance.echeanceLaPlusAncienne === null
			? null
			: `Il devait payer le ${dateCourte(creance.echeanceLaPlusAncienne)}`;

	switch (creance.etapes.etape) {
		case 'PRET':
			return { titre: 'Pas encore relancé', sousTitre: echeance };
		case 'ON_LUI_ECRIT':
			return { titre: 'Relancé', sousTitre: creance.etapes.ceQuiSePasse };
		case 'TRIBUNAL':
			return creance.suivi === null
				? { titre: 'Confié à un professionnel', sousTitre: echeance }
				: { titre: 'Procédure en cours', sousTitre: creance.etapes.ceQuiSePasse };
		case 'REGLE':
			return { titre: 'Réglé', sousTitre: creance.etapes.ceQuiSePasse };
		default:
			return {
				titre: creance.etapes.etapes.find((e) => e.etat === 'EN_COURS')?.titre ?? 'Dossier',
				sousTitre: creance.etapes.ceQuiSePasse
			};
	}
}

/**
 * LE SEUL GESTE MIS EN AVANT, ET CE QU'IL OUVRE.
 *
 * ⚠️ CE QUI ATTEND LE GÉRANT PASSE AVANT CE QU'IL POURRAIT FAIRE. Un courrier
 * préparé qui attend sa validation ne part pas tant qu'il n'est pas relu : c'est
 * lui, le travail du jour.
 *
 * ⚠️ « RELANCER » NE SE PROPOSE PAS À UN CLIENT EN PROCÉDURE COLLECTIVE, ni à une
 * entreprise radiée : les relances y sont suspendues, et le bouton mènerait à
 * trois refus. « Préparer un courrier » y mène aux courriers que la situation
 * permet — sans en nommer aucun, parce que les nommer serait choisir.
 *
 * ⚠️ AUCUN DE CES LIBELLÉS NE NOMME UNE VOIE DE DROIT (ligne rouge n° 3), et
 * `page-dossier.test.ts` lit ceux-ci pour le vérifier.
 */
function gesteDuDossier(
	creance: CreanceOuverte
): { readonly libelle: string; readonly ouvre: SectionCreance } | null {
	if (creance.etapes.etape === 'REGLE') return null;

	const aValider = creance.courriers.envois.filter((e) => e.etat === 'A_VALIDER').length;
	if (aValider > 0) {
		return {
			libelle: aValider > 1 ? 'Relire les courriers' : 'Relire le courrier',
			ouvre: 'courriers'
		};
	}
	if (creance.etapes.etape === 'TRIBUNAL') return { libelle: 'Suivre le dossier', ouvre: 'voies' };
	if (creance.santeDebiteur === 'PROCEDURE_COLLECTIVE' || creance.santeDebiteur === 'RADIEE') {
		return { libelle: 'Préparer un courrier', ouvre: 'courriers' };
	}
	return { libelle: 'Relancer', ouvre: 'courriers' };
}

function CarteDeLEtat({
	creance,
	onOuvrir
}: {
	creance: CreanceOuverte;
	onOuvrir: (cle: SectionCreance) => void;
}) {
	const { titre, sousTitre } = etatEnClair(creance);
	const geste = gesteDuDossier(creance);

	return (
		<EtatDuDossier
			etapes={creance.etapes.etapes}
			titre={titre}
			sousTitre={sousTitre}
			classe={creance.etapes.classe}
			geste={
				geste === null ? undefined : (
					<BoutonPrincipal pleineLargeur onClick={() => onOuvrir(geste.ouvre)}>
						{geste.libelle}
					</BoutonPrincipal>
				)
			}
		/>
	);
}

/**
 * CE QUI S'EST PASSÉ, ET LE BOUTON QUI OUVRE TOUT.
 *
 * ⚠️ LE BOUTON COMPTE CE QUI ATTEND. Une promesse arrivée à son jour sans qu'on
 * sache si elle a été tenue, un rappel qu'on s'était posé : ce sont les seules
 * entrées de l'historique qui appellent le gérant, et elles se lisent sur le
 * bouton sans l'ouvrir.
 */
function CarteDuSuivi({ creance }: { creance: CreanceOuverte }) {
	const { ouverte, basculer } = useSectionOuverte('suivi');
	const deuxVolets = useDeuxVolets();
	const suivi = creance.suiviDuDossier;
	const enAttente = suivi.notes.filter(
		(note) =>
			(note.genre === 'PROMESSE' && note.issue === undefined) ||
			(note.genre === 'RAPPEL' && note.faitLe === undefined)
	).length;

	const libelle =
		deuxVolets && ouverte
			? 'Masquer l’historique'
			: enAttente > 0
				? `Tout l’historique · ${enAttente} à vérifier`
				: suivi.frise.length === 0
					? 'Noter quelque chose'
					: 'Tout l’historique';

	return (
		<ApercuDuSuivi
			frise={suivi.frise}
			geste={
				<BoutonSecondaire pleineLargeur aria-expanded={ouverte} onClick={basculer}>
					{libelle}
				</BoutonSecondaire>
			}
		>
			<PanneauDuGeste cle="suivi" titre="Historique">
				<SuiviDuDossier {...suivi} />
			</PanneauDuGeste>
		</ApercuDuSuivi>
	);
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
 * COURRIERS ET E-MAILS — tout ce qu'on lui écrit, au même endroit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DEUX RANGÉES SONT DEVENUES UNE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Courriers » (la lettre de relance officielle, l'accord d'échéancier, la
 * déclaration, ce qui part vers un avocat) et « Relances » (les e-mails) étaient
 * deux rangées sœurs. Pour le gérant, c'est la même chose : lui écrire. Deux
 * rangées l'obligeaient à connaître la différence AVANT d'ouvrir.
 *
 * ⚠️ CE QUI PEUT SE FAIRE S'OUVRE EN PREMIER. Quand les e-mails sont
 * disponibles, ils passent devant — c'est le geste le plus courant. Quand ils
 * sont suspendus (procédure collective, entreprise radiée), leurs refus passent
 * derrière les courriers que la situation permet : ouvrir la feuille sur trois
 * refus, c'est dire qu'il n'y a rien à faire alors qu'il y a quelque chose.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RIEN NE PART D'ICI, ET C'EST UNE LIGNE ROUGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les courriers sont préparés ici, validés par le gérant, envoyés par lui. Les
 * e-mails portent « Copier », jamais « Envoyer » : aucun composant d'envoi au
 * débiteur n'existe dans `src/ui/`. Une commande absente ne s'active jamais par
 * accident ; une commande grisée, si.
 */
function RangeeCourriers({ creance }: { creance: CreanceOuverte }) {
	const envois = creance.courriers.envois;
	const aValider = envois.filter((e) => e.etat === 'A_VALIDER').length;
	const faits = envois.filter((e) => e.etat === 'VALIDE' || e.etat === 'PARTI').length;
	const emailsDisponibles = creance.relances.some((niveau) => niveau.disponible);

	const emails = (
		<section className="flex flex-col gap-cladd-3xs">
			<SectionTitle>E-mails</SectionTitle>
			<Relances
				niveaux={creance.relances}
				identifiant={creance.identifiant}
				destinataire={creance.debiteurEmail}
				identifiantDebiteur={creance.debiteurId}
			/>
		</section>
	);
	const lettres = (
		<section className="flex flex-col gap-cladd-3xs">
			<SectionTitle>Lettres</SectionTitle>
			<Courriers courriers={creance.courriers} />
		</section>
	);

	return (
		<RangeeDepliable
			cle="courriers"
			famille="ENVOI"
			titre="Courriers et e-mails"
			valeur={
				aValider > 0
					? `${aValider} à valider`
					: faits > 0
						? `${faits} préparé${pluriel(faits)}`
						: 'aucun'
			}
		>
			{emailsDisponibles ? (
				<>
					{emails}
					{lettres}
				</>
			) : (
				<>
					{lettres}
					{emails}
				</>
			)}
		</RangeeDepliable>
	);
}

/**
 * PÉNALITÉS ET FRAIS — LE REÇU. C'EST LE CŒUR DU PRODUIT.
 *
 * Principal, indemnité forfaitaire par facture, puis un SEGMENT par période de
 * taux, chacun rendant ses quatre termes : base, taux, jours, base annuelle. Un
 * total qu'on ne peut pas décomposer est un chiffre qu'on demande de croire ;
 * décomposé, il se refait à la main — ce que fera le débiteur qui le conteste.
 *
 * ⚠️ « DÉCOMPTE · 6 373,50 € » RÉPÉTAIT LE CHIFFRE ÉCRIT EN GRAND quatre cents
 * pixels plus haut. C'est le « Order receipt » de Shop : le total est en tête de
 * page, et son détail est à un appui. La rangée dit donc ce que le produit
 * APPORTE — les pénalités et l'indemnité, dues de plein droit et presque jamais
 * réclamées —, et elle s'ouvre sur le calcul entier. « Détail du montant ·
 * 373,50 € de pénalités » revenait à la ligne des deux côtés à 393 px ; mesuré.
 *
 * ⚠️ TROIS RANGÉES Y SONT ENTRÉES, parce qu'elles parlent toutes du calcul :
 * les décomptes arrêtés, la supposition du calcul (qui était une ligne grise
 * sous le montant, « Supposé : … »), et les chiffres de la loi — repliés derrière
 * un mot, parce que c'est un tableau de référentiel qu'on contrôle et qu'on ne
 * lit pas.
 *
 * ⚠️ UN DÉCOMPTE ARRÊTÉ EST FIGÉ, DÉFINITIVEMENT, ET L'ARRÊT NE SE FAIT PAS
 * D'ICI. Il a son écran, qui porte le contrôle de complétude : `controle.ts`
 * CHIFFRE ce qui serait abandonné, et ce qui ne figure pas dans un titre
 * exécutoire est perdu.
 */
function RangeeDecompte({ creance }: { creance: CreanceOuverte }) {
	const montant = creance.montantDuJour;

	return (
		<RangeeDepliable
			cle="decompte"
			famille="ARGENT"
			titre="Pénalités et frais"
			glose="Le montant entier, facture par facture et période par période."
			valeur={
				montant === null
					? 'non calculées'
					: eurosCentimes(montant.interets + montant.indemniteForfaitaire)
			}
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
						Ce montant bouge chaque jour tant que la facture n’est pas réglée. Ce qui s’oppose à un
						tiers est un décompte arrêté : daté, et figé.
					</p>
				</>
			)}

			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Décomptes arrêtés</SectionTitle>
				{creance.decomptesArretes.length === 0 ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Rien n’est encore arrêté sur ce dossier.
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
								valeur={eurosCentimes(arrete.total)}
							/>
						))}
					</ListeAnalyses>
				)}

				<div className="flex flex-wrap gap-cladd-3xs">
					{/* ⚠️ CE BOUTON NE FIGE RIEN LUI-MÊME. Il mène à l'écran d'arrêt, qui
					    porte le contrôle chiffré et l'irréversibilité en toutes lettres. */}
					<BoutonPrincipal
						as={Lien}
						to="/app/arret/$id"
						// ⚠️ UNE ASSERTION : `as` efface le générique du routeur. La
						// DESTINATION reste vérifiée par `destinations-existent.test.ts`.
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
			</section>

			{/*
			  ⚠️ LE LIEN DE PAIEMENT EST ICI, SOUS LE DÉCOMPTE, ET PAS DANS LES
			  COURRIERS. Il ne s'ouvre que sur un décompte ARRÊTÉ : sa place est
			  auprès de ce qui l'arrête, pas auprès de ce qui l'envoie.
			*/}
			<LiensDePaiement {...creance.liensDePaiement} />

			{creance.hypotheses.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<SectionTitle>Suppositions du calcul</SectionTitle>
					{creance.hypotheses.map((hypothese) => (
						<p key={hypothese.cle} className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{hypothese.fait} {hypothese.ceQuiLaLeve}
						</p>
					))}
				</section>
			)}

			<ChiffresDeLaLoi fiches={creance.fiches} />
		</RangeeDepliable>
	);
}

/**
 * LES VALEURS JURIDIQUES EMPLOYÉES, telles qu'un tiers doit pouvoir les
 * contrôler : leur source, leur date de relevé, et les deux booléens qui disent
 * ce qu'on a le droit d'en faire.
 *
 * ⚠️ REPLIÉES DERRIÈRE UN MOT, ET C'EST UNE MESURE. Le tableau faisait 2 711 px
 * relevés à 1280 px : dépliée par défaut, la décomposition qu'on venait lire
 * passait sous la ligne de flottaison. Il n'est pas caché — son compte se lit sur
 * le mot qui l'ouvre.
 *
 * ⚠️ ET « RELEVÉE » N'EST PAS « CONTRÔLÉE ». `verifie` suffit à CALCULER ;
 * `valideParAvocat` suffit à produire un ACTE. Les deux colonnes restent
 * distinctes pour cette seule raison.
 */
function ChiffresDeLaLoi({ fiches }: { fiches: readonly FicheParametre[] }) {
	const [vus, setVus] = useState(false);
	if (fiches.length === 0) return null;

	const verifiees = fiches.filter((fiche) => fiche.verifie).length;
	const controlees = fiches.filter((fiche) => fiche.valideParAvocat).length;

	return (
		<section className="flex flex-col gap-cladd-3xs">
			<BoutonTexte className="self-start" aria-expanded={vus} onClick={() => setVus(!vus)}>
				{vus
					? 'Masquer les chiffres de la loi'
					: `Les chiffres de la loi · ${verifiees} sur ${fiches.length} relevés`}
			</BoutonTexte>
			{vus ? (
				<>
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
				</>
			) : null}
		</section>
	);
}

/**
 * DOCUMENTS — le dépôt, le classement, le retrait, et ce qu'ils établissent.
 *
 * ⚠️ « SOLIDITÉ » EST ENTRÉE ICI. C'était une rangée sœur, « 1 sur 4 », qui
 * comptait… les documents. Deux rangées pour la même matière, dont l'une portait
 * un mot du logiciel qu'aucun gérant n'emploie. Son constat reste un COMPTE,
 * jamais un verdict : « trois des quatre pièces attendues sont absentes » se
 * vérifie ; « ce dossier est trop faible » serait une appréciation juridique.
 */
function RangeePieces({ creance }: { creance: CreanceOuverte }) {
	return (
		<RangeeDepliable
			cle="pieces"
			famille="PAPIERS"
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
			<Solidite solidite={creance.solidite} />
		</RangeeDepliable>
	);
}

/**
 * VOS RÉPONSES — ce que vous seul pouvez dire.
 *
 * Elle POSE UNE QUESTION, et ces réponses-là décident si une procédure s'ouvre.
 * C'est la seule rangée qui BLOQUE : sans elles, aucune créance ne franchit le
 * seuil de qualification. Elle ne s'ouvre pas d'elle-même : sa valeur,
 * « 7 attendues », se lit rangée fermée.
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
			famille="QUESTION"
			titre="Vos réponses"
			glose="Des faits, pas une appréciation juridique : vous seul pouvez les dire."
			valeur={
				aDemander > 0
					? `${aDemander} attendue${pluriel(aDemander)}`
					: creance.litige.litigieux
						? 'litigieux'
						: 'données'
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
			famille="TEMPS"
			titre={creance.suivi === null ? 'Les suites possibles' : 'Procédure'}
			glose={
				creance.suivi === null
					? 'Énumérées, jamais classées. Aucune n’est mise en avant.'
					: 'Les faits consignés, et les délais qui en découlent.'
			}
			valeur={
				creance.suivi !== null
					? 'engagée'
					: envisageables > 0
						? `${envisageables} voie${pluriel(envisageables)}`
						: 'aucune voie'
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
							onClick={() => {
								creance.professionnels.onDemander();
								setCarnetOuvert(true);
							}}
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
					professionnels={creance.professionnels}
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
				propositions={creance.professionnels.propositions}
				enCours={creance.professionnels.enCours}
				erreur={creance.professionnels.erreur}
				onRetenirEtude={(etude) =>
					void creance.professionnels.onRetenirEtude(etude).then((id) => {
						if (id === null) return;
						creance.onRattacher(id);
						setCarnetOuvert(false);
					})
				}
				onRetenirAvocat={(avocat) =>
					void creance.professionnels.onRetenirAvocat(avocat).then((id) => {
						if (id === null) return;
						creance.onRattacher(id);
						setCarnetOuvert(false);
					})
				}
				onAjouter={creance.onAjouterFiche}
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
