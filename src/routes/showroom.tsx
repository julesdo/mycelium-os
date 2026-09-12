import { useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { Toolbar, Segmented, SegmentedButton, SectionTitle, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, FileSpreadsheetIcon } from 'lucide-react';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	Bandeau,
	ZoneDepot,
	BilanImport,
	type DepotAffiche,
	FluxEvenements,
	Decompte,
	ChocRevelation,
	BilanPertes,
	HabitudePaiement,
	IdentiteDebiteur,
	QuestionnaireLitige,
	SuiviProcedure,
	RailProcedure,
	type EtapeAffichee,
	Pieces,
	Solidite,
	EnteteDetail,
	Relances,
	ConstatRegistre,
	Lettrage,
	type OptionSecteur,
	type RevelationAffichee,
	type BilanPertesAffiche,
	euros,
	type EvenementAffiche,
	type DecompteAffiche,
	travauxDuVeilleur,
	ceQuiManque,
	VeilleurAvatar
} from '../ui';
import { Offre, OuvertureEnCours, EssaiEnCours } from '../screens/abonnement/offre';
import { PALIERS, BORNES_PALIER, TARIFS } from '../lib/config/tarifs';
import { Equipe, type MembreEquipe, type InvitationEnAttente } from '../screens/equipe/equipe';
import { Donnees } from '../screens/donnees/donnees';
import { FormulaireCreancier } from '../screens/parametres/creancier';
import { Shell } from '../app/shell';
import { EcranAccueil, type AccueilAffiche } from '../screens/accueil';
import { ETAGES_DE_PREUVE, pyramideDePreuves } from '../lib/verticales/recouvrement/solidite';
import { questionsRestantes } from '../lib/verticales/recouvrement/litige';
import { EcranCreance } from '../screens/creance';
import { EcranProcedures, type DossierAffiche } from '../screens/procedures';
import { DetailDebiteur } from '../screens/debiteur-detail';
import { NIVEAUX_RELANCE, composerRelance } from '../lib/verticales/recouvrement/relance';
import { depuisCentimes } from '../lib/socle/montants';

/**
 * La salle d'exposition.
 *
 * Elle rend chaque écran avec des données de démonstration, sans backend et
 * sans authentification, pour qu'on puisse **les regarder** aux quatre largeurs
 * de référence — 375, 768, 1024, 1280 — avant de les déclarer finis.
 *
 * Ce n'est pas un confort : le motif principal des dérives visuelles du produit
 * précédent est qu'on ne regardait jamais le résultat. Un kit contraint les
 * contrôles, un lint contraint les classes, mais seul un coup d'œil attrape une
 * hiérarchie ratée ou une carte qui déborde. Cette règle a déjà payé trois fois
 * sur les écrans de recouvrement.
 *
 * Les données ne sont pas décoratives non plus : elles sont choisies pour
 * exposer les cas qui cassent — une créance déjà prescrite, une caducité à
 * quelques jours, un montant à cinq chiffres à côté d'un montant à trois, un
 * tableau à sept colonnes qui doit tenir sur 375 px. Un jeu de démonstration où
 * tout va bien ne prouve rien.
 */
export const Route = createFileRoute('/showroom')({
	beforeLoad: () => {
		// La salle n'existe qu'en développement : elle rend des écrans avec des
		// données inventées, ce qui n'a rien à faire en production.
		if (!import.meta.env.DEV) throw notFound();
	},
	component: Showroom
});

const FIN_ESSAI_DEMO = Date.now() + 12 * 24 * 60 * 60 * 1000;

/**
 * Le flux de surveillance, avec les cas qui cassent.
 *
 * Une prescription DÉJÀ dépassée, une caducité à quelques jours, un montant à
 * cinq chiffres à côté d'un montant à trois — c'est l'alignement des chiffres
 * et la hiérarchie des urgences qu'on vient regarder, pas le bonheur.
 */
const EVENEMENTS_DEMO: EvenementAffiche[] = [
	{
		/**
		 * ⚠️ EN URGENCE NORMALE, ET IL EST EN TÊTE DE FIXTURE EXPRÈS.
		 *
		 * C'est le signal que le seuil absolu rate : 85 jours de retard chez un
		 * client qui règle toujours à 12. Il doit se lire comme une INFORMATION
		 * au milieu d'alertes critiques — s'il criait aussi fort qu'une
		 * prescription, il diluerait le seul signal du produit qui annonce une
		 * perte sèche.
		 */
		type: 'HABITUDE_ROMPUE',
		reference: 'FA-2026-0311',
		// ⚠️ LE MÊME MONTANT QUE L'ÉCHÉANCE QU'ELLE REMPLACE. La fixture portait
		// deux montants différents pour cette référence — 4 200 € ici, 249,90 € sur
		// la ligne d'échéance — ce qui ne peut pas arriver en production et rendait
		// la salle d'exposition menteuse sur le seul point qui compte : l'exactitude.
		montant: 24_990n,
		urgence: 'NORMALE',
		// Échue le 1er août, relevé au 2 septembre : trente-deux jours. Le constat
		// doit coller aux dates des autres fixtures, sans quoi on illustre un état
		// que le calcul ne produirait jamais.
		explication:
			'Ce débiteur règle habituellement à 5 jours de son échéance, sur 23 règlements observés. Cette facture en est à 32, soit 27 de plus que son habitude.',
		action:
			'Ouvrir la fiche de Fournitures Durand : son historique de règlements y est. ' +
			'Ou rattacher cette facture à une créance, ou enregistrer son règlement.',
		// ⚠️ CHAQUE RANGÉE DU FLUX S'OUVRE MAINTENANT, et la démonstration doit le
		// montrer : c'est la correction qui compte sur cet écran. « Ouvrir la fiche
		// de Fournitures Durand » était écrit depuis toujours, et rien ne
		// permettait de le faire.
		cible: { genre: 'DEBITEUR', id: 'demo-debiteur' }
	},
	{
		type: 'PRESCRIPTION_PROCHE',
		reference: 'FA-2021-0087',
		montant: 924_000n,
		urgence: 'CRITIQUE',
		explication: 'La facture FA-2021-0087 est PRESCRITE depuis le 2026-08-14.',
		action: 'Ne plus engager de frais sur cette facture : la créance est éteinte.',
		// Même une créance éteinte s'ouvre : c'est là qu'on va CONSTATER la perte,
		// et le seul endroit où « ne plus engager de frais » devient vérifiable.
		cible: { genre: 'DEBITEUR', id: 'demo-debiteur' }
	},
	{
		type: 'ECHEANCE_PROCEDURE',
		reference: 'Ateliers Martin — injonction',
		montant: 1_845_000n,
		urgence: 'CRITIQUE',
		explication: "Signification de l'ordonnance : il reste 9 jour(s) avant le 2026-09-12.",
		// La démonstration porte la MÊME formulation que le produit : une capture
		// qui montrerait « faire signifier sans délai » ferait recopier une consigne
		// de procédure que la ligne rouge 3 interdit.
		action: 'Ouvrir ce dossier : la date limite et son journal y sont.',
		cible: { genre: 'CREANCE', id: 'demo-creance' }
	},
	{
		type: 'CREANCE_MURE',
		reference: 'Fournitures Durand',
		montant: 3_120_050n,
		urgence: 'HAUTE',
		explication: 'La créance atteint le seuil de qualification (0,90 pour un seuil de 0.75).',
		action: 'Examiner les procédures envisageables pour cette créance.',
		cible: { genre: 'CREANCE', id: 'demo-creance' }
	}
	// ⚠️ L'ÉVÉNEMENT `FACTURE_ECHUE` DE FA-2026-0311 A ÉTÉ RETIRÉ D'ICI. Le
	// détecteur ne l'émet plus dès qu'une rupture couvre la même facture — la
	// rupture dit tout ce qu'il disait, et davantage. Le garder illustrerait un
	// état que le produit ne peut plus produire.
];

/**
 * LE CHOC DU PREMIER IMPORT, avec les cas qui cassent.
 *
 * Les chiffres ne sont pas décoratifs. Ils sont choisis pour exposer ce qui
 * casse une mise en page : un supplément à cinq chiffres posé en corps de
 * cinquante-six pixels, une décomposition à trois montants sur une même ligne
 * qui doit tenir à 375 px, et une facture NON CHIFFRÉE — le cas qu'on serait
 * tenté de ne jamais dessiner, et qui est précisément celui qui prouve que le
 * total affiché n'est pas silencieusement amputé.
 */
const REVELATION_DEMO: RevelationAffichee = {
	nombreFactures: 3,
	principal: 4_248_000n,
	interets: 731_240n,
	indemnites: 12_000n,
	supplement: 743_240n,
	total: 4_991_240n,
	interetsCourusDepuisHier: 1_164n,
	lignes: [
		{
			reference: 'FA-2021-0087',
			principalRestantDu: 924_000n,
			interets: 412_880n,
			indemniteForfaitaire: 4_000n,
			supplement: 416_880n
		},
		{
			reference: 'FA-2023-0142',
			principalRestantDu: 3_299_100n,
			interets: 316_290n,
			indemniteForfaitaire: 4_000n,
			supplement: 320_290n
		},
		{
			reference: 'FA-2026-0311',
			principalRestantDu: 24_900n,
			interets: 2_070n,
			indemniteForfaitaire: 4_000n,
			supplement: 6_070n
		}
	],
	nonChiffrees: [
		{
			reference: 'FA-2024-0009',
			raison:
				'Aucun taux légal relevé pour le semestre du 2024-07-01. Le décompte s’arrête plutôt que d’extrapoler le dernier taux connu.'
		}
	]
};

/**
 * LE LETTRAGE, DANS SES QUATRE ÉTATS.
 *
 * Le second est celui qui porte la règle : deux lectures possibles, aucune
 * présélectionnée, et un avertissement qui dit POURQUOI on ne tranche pas.
 * C'est aussi le plus dense — il doit tenir à 375 px sans que les puces de
 * référence débordent.
 */
function DemoLettrage() {
	const rien = () => {};
	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Un virement groupé à ventiler" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Une seule lecture</SectionTitle>
						<Lettrage
							proposition={{
								issue: 'UNIQUE',
								combinaisons: [
									{ references: ['FA-2026-0088', 'FA-2026-0091', 'FA-2026-0103'], total: 482_000n }
								],
								tronque: false
							}}
							enCours={false}
							erreur={null}
							onChercher={rien}
							onAppliquer={rien}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Deux lectures — le logiciel ne tranche pas</SectionTitle>
						<Lettrage
							proposition={{
								issue: 'AMBIGU',
								combinaisons: [
									{ references: ['FA-2026-0088', 'FA-2026-0091'], total: 300_000n },
									{ references: ['FA-2026-0104'], total: 300_000n }
								],
								tronque: false
							}}
							enCours={false}
							erreur={null}
							onChercher={rien}
							onAppliquer={rien}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Aucune combinaison</SectionTitle>
						<Lettrage
							proposition={{ issue: 'AUCUNE', combinaisons: [], tronque: false }}
							enCours={false}
							erreur={null}
							onChercher={rien}
							onAppliquer={rien}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Trop de factures pour chercher</SectionTitle>
						<Lettrage
							proposition={{
								issue: 'TROP_DE_CANDIDATES',
								combinaisons: [],
								tronque: false,
								candidates: 47
							}}
							enCours={false}
							erreur={null}
							onChercher={rien}
							onAppliquer={rien}
						/>
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LE CRÉANCIER — trois champs qui ne sont pas du confort.
 *
 * Sans eux, la pièce porte « Identité du créancier non renseignée », et surtout
 * `entreCommercants` vaut TOUJOURS « indéterminé » : l'éligibilité à l'injonction
 * de payer ne pouvait jamais être acquise, et rien ne permettait d'en sortir.
 *
 * Les deux états montrés sont ceux qui comptent : la fiche vierge — celle qu'un
 * nouveau client voit — et la fiche remplie.
 */
function DemoCreancier() {
	return (
		<Page>
			<PageHeader titre="Réglages" sousTitre="Ce qui s’imprime en tête d’un décompte" />
			<PageBody>
				<div className="flex max-w-160 flex-col gap-cladd-md">
					<FormulaireCreancier
						initial={{ denomination: '', siren: '', adresse: '', estCommercant: 'unknown' }}
						onEnregistrer={async () => {}}
					/>
					<FormulaireCreancier
						initial={{
							denomination: 'Thumbbb Agency',
							siren: '502592959',
							adresse: '12 rue des Ateliers, 75011 Paris',
							estCommercant: 'ok'
						}}
						onEnregistrer={async () => {}}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * L'IDENTITÉ D'UN DÉBITEUR — les deux champs que le gérant seul peut remplir,
 * et leurs TROIS états.
 *
 * Le troisième est celui qu'on serait tenté de ne jamais dessiner : le refus.
 * La clé de contrôle attrape toute faute de frappe d'un seul chiffre, donc ce
 * message va s'afficher souvent — et il doit tenir dans la colonne, à 375 px,
 * sans pousser le reste du volet.
 */
const SECTEURS_DEMO: OptionSecteur[] = [
	{
		cle: 'INDETERMINE',
		libelle: 'À préciser',
		consequence: 'Le délai le plus court est retenu par prudence : 1 an'
	},
	{ cle: 'GENERAL', libelle: 'Régime général', consequence: 'Prescription : 5 ans' },
	{
		cle: 'TRANSPORT_MARCHANDISES',
		libelle: 'Transport de marchandises',
		consequence: 'Prescription : 1 an'
	},
	{ cle: 'CONSOMMATEUR', libelle: 'Vente à un consommateur', consequence: 'Prescription : 2 ans' }
];

const QUESTIONS_LITIGE_DEMO = [
	{
		cle: 'CONTESTATION_ECRITE',
		question:
			'Ce client vous a-t-il écrit pour contester cette facture — courrier, e-mail, ou réserve portée sur un bon de livraison ?',
		portee:
			'Une contestation écrite fait sortir le dossier des procédures listées ici, qui se déroulent toutes sans débat.'
	},
	{
		cle: 'REFUS_RECEPTION',
		question: 'A-t-il refusé tout ou partie de la marchandise ou de la prestation ?',
		portee: 'Un refus porte sur ce qui est dû, pas sur le paiement : il touche le montant lui-même.'
	},
	{
		cle: 'AVOIR_RECLAME',
		question: 'Vous a-t-il réclamé un avoir que vous n’avez pas émis ?',
		portee: 'Un avoir réclamé et non émis est un désaccord ouvert sur le montant.'
	}
];

const TYPES_PIECE_DEMO = [
	{ cle: 'INDETERMINE', libelle: 'À classer', apport: 'Ne compte dans aucun critère' },
	{
		cle: 'BON_DE_COMMANDE',
		libelle: 'Bon de commande',
		apport: 'Établit que le client a commandé'
	},
	{
		cle: 'BON_DE_LIVRAISON',
		libelle: 'Bon de livraison',
		apport: 'Établit que la prestation a été reçue'
	},
	{ cle: 'CGV', libelle: 'Conditions générales', apport: 'Établit les conditions de paiement' }
];

const HABITUDE_DEMO = {
	connue: true as const,
	delaiMedianJours: 12,
	echantillon: 23,
	dispersionJours: 2
};

function DemoDebiteurDetail() {
	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Ce qu’il doit, facture par facture" />
			<PageBody>
				<DetailDebiteur
					debiteurId="demo"
					denomination="Fournitures Durand"
					etatRecherche={{ phase: 'REPOS' }}
					onChercherAuRegistre={() => {}}
					onRetenirEtablissement={() => {}}
					debiteur={{
						siren: '853479236',
						secteur: 'TRANSPORT_MARCHANDISES',
						santeFinanciere: 'SAINE'
					}}
					/**
					 * ⚠️ DEUX CRÉANCES, DONT UN BROUILLON. C'est l'arête qui manquait au
					 * produit : avant elle, l'écran d'une créance ne s'atteignait que
					 * par la redirection qui suit sa constitution, et n'était donc
					 * visible que dans les secondes suivant sa création.
					 */
					creances={[
						{
							_id: 'demo-creance',
							statut: 'QUALIFIEE',
							principalRestantDu: 1_200_000n,
							nombreFactures: 2
						},
						{
							_id: 'demo-creance-2',
							statut: 'BROUILLON',
							principalRestantDu: 318_040n,
							nombreFactures: 1
						}
					]}
					optionsSecteur={SECTEURS_DEMO}
					erreurSiren={null}
					tauxStipule="15,00"
					constatTaux="Le taux de 15,00 % est au-dessus du plancher de 10,26 % constaté au 2026-03-15."
					pieces={[
						{
							_id: '1',
							type: 'BON_DE_LIVRAISON',
							statut: 'LUE',
							filename: 'BL-2024-118.pdf',
							reference: 'BL-2024-118',
							dateDocument: '2026-02-14',
							constat: 'Ce document est un bon de livraison, n° BL-2024-118, du 2026-02-14.'
						}
					]}
					habitude={HABITUDE_DEMO}
					ruptures={[]}
					propositionLettrage={null}
					lettrageEnCours={false}
					erreurLettrage={null}
					selection={new Set(['f1'])}
					erreur={null}
					factures={[
						{
							_id: 'f1',
							reference: 'FA-2026-004',
							montantTTC: 1_200_000n,
							resteDu: 1_200_000n,
							dateEcheance: '2026-05-15',
							exigibiliteDeduite: true,
							datePrescription: '2027-05-15',
							dansUneCreance: false
						},
						{
							_id: 'f2',
							reference: 'FA-2026-011',
							montantTTC: 420_000n,
							resteDu: 420_000n,
							dateEcheance: '2026-06-30',
							exigibiliteDeduite: false,
							datePrescription: '2027-06-30',
							dansUneCreance: true
						}
					]}
					onEnregistrerSiren={() => {}}
					onChoisirSecteur={() => {}}
					onEnregistrerTaux={() => {}}
					onChercherLettrage={() => {}}
					onAppliquerLettrage={() => {}}
					onBasculerFacture={() => {}}
					onConstituer={() => {}}
				/>
			</PageBody>
		</Page>
	);
}

function DemoDetail() {
	const pyramide = pyramideDePreuves(['FACTURE', 'BON_DE_COMMANDE']);

	return (
		<Page>
			{/* L'en-tête d'une page poussée : le retour porte le nom de l'écran d'où
			    l'on vient, et il est posé AVANT le titre — un titre long le
			    pousserait hors de l'écran s'ils partageaient la ligne. */}
			<EnteteDetail
				retourVers="/app/debiteurs"
				retourLibelle="Fournitures Durand"
				titre="Ce que les pièces établissent"
				sousTitre={`${pyramide.etablies} sur ${pyramide.attendues}`}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					<Solidite
						solidite={{
							constat: pyramide.constat,
							etablies: pyramide.etablies,
							attendues: pyramide.attendues,
							prochaine: pyramide.prochaine?.cle ?? null,
							etages: pyramide.etages.map((e) => ({
								cle: e.cle,
								fait: e.fait,
								etat: e.etat,
								presente: e.presente,
								poids: e.poids
							}))
						}}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoCreance() {
	// Le résumé seul : chaque analyse vit désormais sur sa propre page, et la
	// salle d'exposition ne peut pas les pousser — elle n'a pas de routeur de
	// créance. Les pages de détail sont montrées par leurs composants, plus haut.
	const pyramide = pyramideDePreuves(['FACTURE', 'BON_DE_COMMANDE']);

	return (
		<EcranCreance
			identifiant="demo"
			etatProcedure={null}
			totalDecompte={null}
			creance={{
				debiteur: 'Fournitures Durand',
				debiteurId: 'demo-debiteur',
				/**
				 * ⚠️ UNE PROCÉDURE COLLECTIVE DANS LA DÉMONSTRATION, délibérément.
				 *
				 * C'est le cas qui rend la rangée du débiteur indispensable : le radar
				 * l'a relevée au registre pendant la nuit, elle a fait baisser le score
				 * affiché juste au-dessus, et jusqu'ici l'écran n'en disait rien. La
				 * salle d'exposition doit montrer l'état où le défaut se voyait, pas
				 * celui où il ne se voyait pas.
				 */
				santeDebiteur: 'PROCEDURE_COLLECTIVE',
				score: 0.65,
				eligible: false,
				principalRestantDu: 1_200_000n,
				factures: [{ _id: 'f1' }, { _id: 'f2' }],
				questions: [
					{ condition: 'entreCommercants', libelle: 'Les deux parties sont-elles commerçantes ?' }
				],
				litige: {
					litigieux: false,
					constats: [],
					questions: questionsRestantes({ CONTESTATION_ECRITE: 'NON' }).map((q) => ({ cle: q.cle }))
				},
				risques: [{ type: 'RETARDS_REPETES', gravite: 'MOYENNE' }],
				solidite: { etablies: pyramide.etablies, attendues: pyramide.attendues },
				relances: [
					{ niveau: 1, disponible: true },
					{ niveau: 2, disponible: false },
					{ niveau: 3, disponible: false }
				],
				procedures: [
					{ cle: 'relance-amiable', disponible: true },
					{ cle: 'injonction-de-payer', disponible: false }
				],
				regimePrescriptionNote:
					'Régime général : cinq ans à compter de l’exigibilité. Secteur déterminé.'
			}}
		/>
	);
}

function DemoRelances() {
	// Les textes viennent du DOMAINE, pas d'une fixture recopiée : une
	// démonstration qui invente ses propres phrases montre un produit qui
	// n'existe pas, et c'est ce qui s'est passé sur la pyramide de preuves.
	const elements = {
		creancier: 'Thumbbb Agency',
		debiteur: 'Fournitures Durand',
		factures: [
			{
				reference: 'FA-2026-004',
				montantTTC: depuisCentimes(1_200_000n),
				dateEcheance: '2026-05-15'
			}
		],
		principalRestantDu: depuisCentimes(1_200_000n),
		santeDebiteur: 'SAINE' as const,
		aujourdHui: '2026-09-03',
		decompte: {
			arreteAu: '2026-09-03',
			interets: depuisCentimes(64_000n),
			indemniteForfaitaire: depuisCentimes(4_000n),
			total: depuisCentimes(1_268_000n)
		}
	};

	const niveaux = NIVEAUX_RELANCE.map((description) => {
		const relance = composerRelance(description.niveau, elements);
		return {
			niveau: description.niveau,
			nom: description.nom,
			intention: description.intention,
			disponible: relance.disponible,
			objet: relance.disponible ? relance.objet : undefined,
			corps: relance.disponible ? relance.corps : undefined,
			constat: relance.disponible ? undefined : relance.constat,
			blocages: relance.disponible ? undefined : [...relance.blocages]
		};
	});

	const suspendues = NIVEAUX_RELANCE.map((description) => {
		const relance = composerRelance(description.niveau, {
			...elements,
			santeDebiteur: 'PROCEDURE_COLLECTIVE' as const,
			constatRegistre: {
				nature: 'Jugement d’ouverture de liquidation judiciaire',
				dateJugement: '2026-03-14'
			}
		});
		return {
			niveau: description.niveau,
			nom: description.nom,
			intention: description.intention,
			disponible: relance.disponible,
			objet: relance.disponible ? relance.objet : undefined,
			corps: relance.disponible ? relance.corps : undefined,
			constat: relance.disponible ? undefined : relance.constat,
			blocages: relance.disponible ? undefined : [...relance.blocages]
		};
	});

	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Ce que vous pouvez lui écrire" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Trois niveaux, dont un verrouillé</SectionTitle>
						<Relances niveaux={niveaux} />
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Le coupe-circuit — tout est suspendu</SectionTitle>
						<Relances niveaux={suspendues} />
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoSolidite() {
	// ⚠️ LES PHRASES ACCORDÉES VIENNENT DU DOMAINE. Les recomposer ici ferait
	// une démonstration qui montre une faute que le produit n’a plus — et
	// c’est exactement ce qui s’est passé : la première version composait
	// « Les conditions de paiement applicables EST DOCUMENTÉ ».
	const etage = (cle: string, presente: boolean, poids: number) => {
		const source = ETAGES_DE_PREUVE.find((e) => e.cle === cle)!;
		return {
			cle,
			fait: source.fait,
			presente,
			poids,
			etat: presente ? source.etabli : `Aucune pièce ne documente ${source.fait}.`
		};
	};

	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Ce que les pièces établissent" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Une facture seule</SectionTitle>
						<Solidite
							solidite={{
								constat: 'Quatre des quatre pièces attendues sont absentes.',
								etablies: 0,
								attendues: 4,
								prochaine: 'commande',
								etages: [
									etage('commande', false, 3),
									etage('livraison', false, 3),
									etage('conditionsContractuelles', false, 1),
									etage('miseEnDemeure', false, 1)
								]
							}}
						/>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>À mi-chemin — ce qui pèse le plus est nommé</SectionTitle>
						<Solidite
							solidite={{
								constat: 'Deux des quatre pièces attendues sont absentes.',
								etablies: 2,
								attendues: 4,
								prochaine: 'livraison',
								etages: [
									etage('commande', true, 3),
									etage('livraison', false, 3),
									etage('conditionsContractuelles', true, 1),
									etage('miseEnDemeure', false, 1)
								]
							}}
						/>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Tout est réuni</SectionTitle>
						<Solidite
							solidite={{
								constat: 'Les quatre pièces attendues sont réunies.',
								etablies: 4,
								attendues: 4,
								prochaine: null,
								etages: [
									etage('commande', true, 3),
									etage('livraison', true, 3),
									etage('conditionsContractuelles', true, 1),
									etage('miseEnDemeure', true, 1)
								]
							}}
						/>
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoPieces() {
	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Les pièces du dossier" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Lues, à classer, et en cours</SectionTitle>
						<Pieces
							optionsType={TYPES_PIECE_DEMO}
							onDeposer={() => {}}
							onClasser={() => {}}
							onRetirer={() => {}}
							pieces={[
								{
									_id: '1',
									type: 'BON_DE_LIVRAISON',
									statut: 'LUE',
									filename: 'BL-2024-118.pdf',
									reference: 'BL-2024-118',
									dateDocument: '2026-02-14',
									constat:
										'Ce document est un bon de livraison, n° BL-2024-118, du 2026-02-14. Il cite FA-2026-004.'
								},
								{
									_id: '2',
									type: 'BON_DE_LIVRAISON',
									statut: 'LUE',
									filename: 'BL-2024-121.pdf',
									reference: 'BL-2024-121',
									dateDocument: '2026-02-21',
									reserves: 'Deux colis manquants, signalés à la livraison.',
									constat: 'Ce document est un bon de livraison, n° BL-2024-121, du 2026-02-21.'
								},
								{
									_id: '3',
									type: 'INDETERMINE',
									statut: 'A_CLASSER',
									filename: 'scan_20260214.jpg',
									constat:
										'Ce document n’a pas pu être lu : sa nature n’est pas identifiée, et il ne compte dans aucun critère de solidité.'
								},
								{
									_id: '4',
									type: 'INDETERMINE',
									statut: 'EN_LECTURE',
									filename: 'CGV-2026.pdf'
								},
								{
									_id: '5',
									type: 'CGV',
									statut: 'CLASSEE_MAIN',
									filename: 'conditions-generales.pdf',
									constat: 'Un taux de retard de 12,00 % y est stipulé.'
								}
							]}
						/>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Aucune pièce — la zone montre le chemin</SectionTitle>
						<Pieces
							optionsType={TYPES_PIECE_DEMO}
							pieces={[]}
							onDeposer={() => {}}
							onClasser={() => {}}
							onRetirer={() => {}}
						/>
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoSuivi() {
	// La date du jour est figée : une démonstration dont les « dans N jours »
	// bougent chaque matin ne se compare plus d'une capture à l'autre.
	const AUJOURDHUI = '2026-03-02';

	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Ce qui court depuis l’engagement" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>La caducité qui approche</SectionTitle>
						<SuiviProcedure
							aujourdHui={AUJOURDHUI}
							onConsigner={() => {}}
							suivi={{
								libelle: 'Ordonnance rendue',
								constat: 'L’ordonnance existe et n’est pas encore signifiée au débiteur.',
								depuisLe: '2026-01-10',
								echeances: [
									{
										cle: 'signification',
										libelle: 'Signification de l’ordonnance',
										dateLimite: '2026-04-10',
										gravite: 'CADUCITE',
										consequence:
											'Passé ce délai de 3 mois, l’ordonnance est caduque. La créance n’est pas éteinte, mais la procédure est à reprendre depuis le début, et le temps écoulé rapproche la prescription.'
									}
								],
								anglesMorts: [],
								suites: [
									{
										cle: 'ordonnance-signifiee',
										libelle: 'L’ordonnance a été signifiée au débiteur'
									}
								],
								terminal: false,
								journal: [
									{
										cle: 'ordonnance-rendue',
										libelle: 'Le juge a rendu son ordonnance',
										survenuLe: '2026-01-10'
									}
								]
							}}
						/>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Ce qui court sans qu’on sache combien de temps</SectionTitle>
						<SuiviProcedure
							aujourdHui={AUJOURDHUI}
							onConsigner={() => {}}
							suivi={{
								libelle: 'Ordonnance signifiée',
								constat:
									'Le débiteur a reçu l’ordonnance. Un délai d’opposition court à compter de cette signification.',
								depuisLe: '2026-02-10',
								echeances: [],
								anglesMorts: [
									'Un délai d’opposition court depuis la signification. Sa durée n’est pas relevée dans le référentiel juridique de ce logiciel : cette échéance-là n’est PAS surveillée, et reste à vérifier auprès de l’acte signifié, qui la porte.'
								],
								suites: [
									{ cle: 'opposition-formee', libelle: 'Le débiteur a formé opposition' },
									{
										cle: 'absence-opposition-constatee',
										libelle: 'L’absence d’opposition a été constatée'
									}
								],
								terminal: false,
								journal: [
									{
										cle: 'ordonnance-rendue',
										libelle: 'Le juge a rendu son ordonnance',
										survenuLe: '2026-01-10'
									},
									{
										cle: 'ordonnance-signifiee',
										libelle: 'L’ordonnance a été signifiée au débiteur',
										survenuLe: '2026-02-10'
									}
								]
							}}
						/>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Une échéance dépassée le DIT</SectionTitle>
						<SuiviProcedure
							aujourdHui={AUJOURDHUI}
							onConsigner={() => {}}
							suivi={{
								libelle: 'Commandement signifié',
								constat:
									'Le commandement a été signifié. Le débiteur peut contester, et une contestation met fin à la procédure simplifiée, même infondée.',
								depuisLe: '2026-01-15',
								echeances: [
									{
										cle: 'fin-contestation',
										libelle: 'Expiration du délai de contestation',
										dateLimite: '2026-02-15',
										gravite: 'INFORMATIVE',
										consequence:
											'Jusqu’à cette date, le débiteur peut contester et mettre fin à la procédure simplifiée.'
									},
									{
										cle: 'proces-verbal-possible',
										libelle: 'Procès-verbal de non-contestation possible',
										dateLimite: '2026-02-23',
										gravite: 'INFORMATIVE',
										consequence:
											'À partir de cette date, et pas avant, le procès-verbal peut être dressé. Les 8 jours s’ajoutent au délai de contestation, ils ne s’y superposent pas.'
									}
								],
								anglesMorts: [],
								suites: [
									{ cle: 'contestation-recue', libelle: 'Le débiteur a contesté' },
									{
										cle: 'proces-verbal-dresse',
										libelle: 'Le procès-verbal de non-contestation a été dressé'
									}
								],
								terminal: false,
								journal: [
									{
										cle: 'commandement-signifie',
										libelle: 'Le commandement a été signifié au débiteur',
										survenuLe: '2026-01-15'
									}
								]
							}}
						/>
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoLitige() {
	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Ce que vous seul pouvez dire" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>La question en cours, et ce qu’il en reste</SectionTitle>
						<QuestionnaireLitige
							questions={QUESTIONS_LITIGE_DEMO}
							constats={[
								'Le caractère certain reste indéterminé : 3 faits ne sont pas renseignés.'
							]}
							litigieux={false}
							onRepondre={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Litige établi — le questionnaire s’arrête</SectionTitle>
						<QuestionnaireLitige
							questions={[]}
							litigieux
							constats={[
								'Ce client a contesté la facture par écrit.',
								'Le caractère certain n’est donc pas retenu. Le logiciel ne mesure pas si cette contestation est sérieuse — c’est une appréciation juridique, et il s’en abstient.',
								'Les procédures que ce logiciel évalue se déroulent toutes sans débat contradictoire : une contestation y met fin, même infondée, et les frais engagés restent dus. Ce dossier sort de ce que le logiciel sait mesurer.'
							]}
							onRepondre={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Les cinq faits écartés</SectionTitle>
						<QuestionnaireLitige
							questions={[]}
							litigieux={false}
							constats={[
								'Aucune contestation connue : les cinq faits ont été expressément écartés. Le caractère certain est retenu sur cette déclaration.'
							]}
							onRepondre={() => {}}
						/>
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoIdentite() {
	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Ce que le gérant seul peut dire" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						{/*
						  ⚠️ L'ÉTAT DE DÉPART N'EST PLUS UN CHAMP VIDE. C'est toute la
						  correction : l'écran dit ce que l'absence de SIREN coûte, et
						  propose d'aller le chercher au registre — sur lequel le radar de
						  solvabilité tape déjà toutes les nuits.
						*/}
						<SectionTitle>Pas encore identifié — le logiciel propose d’aller chercher</SectionTitle>
						<IdentiteDebiteur
							denomination="Boulangerie Martin"
							siren={undefined}
							formeJuridique={undefined}
							etatRecherche={{ phase: 'REPOS' }}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur={undefined}
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren={null}
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel={undefined}
							constatTaux={null}
							onEnregistrerTaux={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						{/*
						  ⚠️ SIX SOCIÉTÉS POUR UN NOM, ET C'EST LE CAS RÉEL. La recherche
						  « BOULANGERIE MARTIN » rend exactement ça au BODACC. C'est
						  pourquoi le produit PROPOSE au lieu de choisir : retenir la
						  première poserait un SIREN qui désigne une autre entreprise, et
						  le radar rendrait ensuite un « aucune procédure » rassurant sur
						  le mauvais numéro.

						  La ville est là pour ça, et elle seule suffit presque toujours :
						  un gérant sait où est son client.
						*/}
						<SectionTitle>Le registre propose — c’est le gérant qui reconnaît</SectionTitle>
						<IdentiteDebiteur
							denomination="Boulangerie Martin"
							siren={undefined}
							formeJuridique={undefined}
							etatRecherche={{
								phase: 'TROUVE',
								candidats: [
									{
										siren: '421931452',
										denomination: 'BOULANGERIE MARTIN',
										ville: 'Fécamp',
										adresse: '6 Place Nicolas Sellé 76400 Fécamp'
									},
									{
										siren: '805188000',
										denomination: 'BOULANGERIE SAINT MARTIN',
										ville: 'Vesoul',
										adresse: '14 Rue Claude Monnet 70000 Vesoul'
									},
									{
										siren: '803938745',
										denomination: 'BOULANGERIE VICTOR MARTIN',
										ville: 'Remire-Montjoly',
										adresse: '18 chemin Germain 97354 Remire-Montjoly'
									}
								]
							}}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur={undefined}
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren={null}
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel={undefined}
							constatTaux={null}
							onEnregistrerTaux={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Identifié — plus aucun champ à remplir</SectionTitle>
						<IdentiteDebiteur
							denomination="Fournitures Durand"
							siren="853479236"
							formeJuridique="Société par actions simplifiée"
							etatRecherche={{ phase: 'REPOS' }}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur="TRANSPORT_MARCHANDISES"
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren={null}
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel="15,00"
							constatTaux="Le taux de 15,00 % est au-dessus du plancher de 10,26 % constaté au 2026-03-15."
							onEnregistrerTaux={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						{/*
						  ⚠️ « RIEN TROUVÉ » EST UN ÉTAT À PART ENTIÈRE, et son texte dit
						  que c'est un silence DU REGISTRE, pas une réponse sur le client.
						  Le BODACC ne publie que ce qui a fait l'objet d'une annonce de
						  greffe : laisser croire à un verdict serait un repli silencieux.
						*/}
						<SectionTitle>Le registre ne dit rien — et le dit comme tel</SectionTitle>
						<IdentiteDebiteur
							denomination="Ateliers Vasseur"
							siren={undefined}
							formeJuridique={undefined}
							etatRecherche={{ phase: 'AUCUN' }}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur={undefined}
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren={null}
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel={undefined}
							constatTaux={null}
							onEnregistrerTaux={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Le constat du registre — cité, jamais interprété</SectionTitle>
						<ConstatRegistre
							constat={{
								dateParution: '2026-09-09',
								nature: "Jugement d'ouverture de liquidation judiciaire",
								dateJugement: '2026-08-31',
								tribunal: "Greffe du Tribunal de Commerce d'Evry",
								url: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A202601721671'
							}}
							sante="PROCEDURE_COLLECTIVE"
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Refusé — le message NOMME le numéro reçu</SectionTitle>
						<IdentiteDebiteur
							denomination="Fournitures Durand"
							siren={undefined}
							formeJuridique={undefined}
							etatRecherche={{ phase: 'AUCUN' }}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur={undefined}
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren="« 853479237 » n’est pas un SIREN : sa clé de contrôle ne tombe pas."
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel="1,00"
							constatTaux="Le taux déclaré, 1,00 %, est inférieur au plancher de 10,26 % constaté au 2026-03-15 — trois fois le taux d’intérêt légal des « autres cas ». Le taux est enregistré tel que vous l’avez déclaré."
							onEnregistrerTaux={() => {}}
						/>
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoRevelation() {
	return (
		<Page>
			<PageHeader
				titre="Ce que vos factures portent"
				sousTitre="Relevé au 9 septembre 2026, sur vos trois dernières années"
			/>
			<PageBody>
				<ChocRevelation revelation={REVELATION_DEMO} />
			</PageBody>
		</Page>
	);
}

/**
 * Le bilan des pertes, dans ses DEUX états — et le second est le seul qui
 * compte vraiment.
 *
 * Un compteur qui ne sait afficher que zéro se lit comme une décoration en
 * trois jours. Celui-ci montre ce qui s'est éteint avant l'arrivée, ce qui
 * s'est éteint depuis — un échec du produit, affiché quand même — et il REFUSE
 * de compter quand la surveillance a été interrompue.
 */
const BILAN_DEMO: BilanPertesAffiche = {
	eteintesAvant: 3_412_000n,
	nombreEteintesAvant: 4,
	eteintesDepuis: 0n,
	nombreEteintesDepuis: 0,
	nonSurveillees: ['FA-2022-0451'],
	joursSousSurveillance: 251
};

function DemoBilan() {
	return (
		<Page>
			<PageHeader titre="Ce qui s’est éteint" sousTitre="Avant vous, et depuis" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Le compteur, quand la surveillance a tourné</SectionTitle>
						<BilanPertes bilan={BILAN_DEMO} />
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Le même, après un battement en échec</SectionTitle>
						<BilanPertes bilan={{ ...BILAN_DEMO, surveillanceInterrompueLe: '2026-05-14' }} />
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoFlux() {
	return (
		<Page>
			<PageHeader titre="À traiter" sousTitre="4 points d’attention" />
			<PageBody>
				<FluxEvenements
					evenements={EVENEMENTS_DEMO}
					// Uniquement les deux factures distinctes ci-dessus (PRESCRIPTION_PROCHE
					// FA-2021-0087 à 9 240,00 € + HABITUDE_ROMPUE FA-2026-0311 à 249,90 €) : la
					// créance mûre et l'échéance de procédure sont des vues agrégées de la
					// même monnaie, pas de l'argent en plus. Voir `montantIdentifie` dans
					// `verticales/recouvrement/surveillance.ts`.
					montantIdentifie={948_990n}
					hypotheses={[
						"Le secteur de Ateliers Martin n'est pas déterminé : la prescription est calculée sur le délai le plus court (1 an). Préciser le secteur lèvera cette hypothèse."
					]}
					anglesMorts={[]}
				/>
			</PageBody>
		</Page>
	);
}

/**
 * Le décompte, avec ce qu'il doit prouver.
 *
 * Deux périodes à taux différents, un principal qui baisse en cours de route
 * après un règlement, et un tableau à sept colonnes qui doit tenir à 375 px
 * sans faire déborder la page — il défile pour lui seul.
 */
const DECOMPTE_DEMO: DecompteAffiche = {
	arreteAu: '2026-09-03',
	convention: 'ACT_365',
	principalRestantDu: 600_000n,
	interets: 41_368n,
	indemniteForfaitaire: 4_000n,
	total: 645_368n,
	lignes: [
		{
			reference: 'FA-2026-118',
			principalRestantDu: 600_000n,
			interets: 41_368n,
			indemniteForfaitaire: 4_000n,
			total: 645_368n,
			segments: [
				{
					debut: '2026-05-01',
					fin: '2026-07-01',
					jours: 61,
					principal: 1_000_000n,
					taux: { numerateur: 1215n, denominateur: 10_000n },
					baseAnnuelle: 365,
					interets: 20_305n
				},
				{
					debut: '2026-07-01',
					fin: '2026-09-03',
					jours: 64,
					principal: 600_000n,
					taux: { numerateur: 1240n, denominateur: 10_000n },
					baseAnnuelle: 365,
					interets: 21_063n
				}
			]
		}
	]
};

function DemoDecompte() {
	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="1 facture · 6 000,00 € restant dû" />
			<PageBody>
				<Decompte decompte={DECOMPTE_DEMO} />
			</PageBody>
		</Page>
	);
}

function DemoDepot() {
	return (
		<Page>
			<PageHeader
				titre="Importer vos factures"
				sousTitre="Vos factures de vente, et les règlements déjà reçus"
			/>
			<PageBody>
				<ZoneDepot accept=".csv,.txt,.pdf" onFichiers={() => undefined}>
					<div className="flex flex-col items-center gap-cladd-3xs text-center">
						<FileSpreadsheetIcon className="size-8 text-cladd-fg-softer" aria-hidden />
						<p className="text-cladd-sm font-semibold">Déposez vos fichiers ici</p>
					</div>
				</ZoneDepot>
			</PageBody>
		</Page>
	);
}

/**
 * Le vide, qui doit montrer le chemin.
 *
 * Un écran sans données affiche l'amorçage, jamais des cadrans à zéro. C'est la
 * quatrième règle d'écran, et c'est la première impression du produit.
 */
function DemoVide() {
	return (
		<Page>
			<PageHeader titre="À traiter" />
			<PageBody>
				<EmptyState
					illustration="📬"
					titre="Rien à surveiller pour l’instant"
					explication="Le logiciel repérera de lui-même les échéances passées, les créances mûres et les prescriptions qui approchent. Il lui faut d’abord vos factures."
					etapes={[
						'Importez un export comptable — c’est le plus complet : il porte vos factures, vos règlements et vos clients d’un coup.',
						'À défaut, déposez vos factures de vente en PDF ou en photo.',
						'Précisez le secteur de vos débiteurs : c’est lui qui détermine le délai de prescription.'
					]}
				/>
			</PageBody>
		</Page>
	);
}

/**
 * Les cartes d'offre, aux trois paliers d'un coup.
 *
 * L'écran d'abonnement lui-même est derrière l'authentification. Ce sont ses
 * cartes qui portent la décision commerciale, et il faut vérifier qu'un prix à
 * quatre chiffres ne casse pas la mise en page.
 */
function DemoAbonnement() {
	return (
		<Page>
			<PageHeader
				titre="Abonnement"
				sousTitre="Les trois paliers, côte à côte. En production, un seul est affiché."
			/>
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					{PALIERS.map((palier) => ({
						palier,
						bornes: BORNES_PALIER[palier],
						bilan: TARIFS[palier].bilan,
						mois: TARIFS[palier].abonnementMensuel
					})).map((p) => (
						<div key={p.palier} className="flex flex-col gap-cladd-3xs">
							<SectionTitle>
								Palier {p.palier} — {p.bornes}
							</SectionTitle>
							<div className="grid gap-cladd-2xs md:grid-cols-2">
								<Offre
									titre="La première mesure"
									prix={euros(p.bilan)}
									cadence="une fois"
									description="Vos factures impayées lues en une fois. Vous saurez ce qui est encore récupérable, et ce qui va s’éteindre, en euros."
									colonne="bilan"
								/>
								<Offre
									titre="L’abonnement"
									prix={euros(p.mois)}
									cadence="par mois"
									description="Vos échéances surveillées toute l’année : ce qui arrive à terme, ce qui devient mûr, ce qui approche de la prescription."
									colonne="abonnement"
									recommande
								/>
							</div>
						</div>
					))}

					<EssaiEnCours finLe={FIN_ESSAI_DEMO} />
					<OuvertureEnCours />
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * L'écran d'équipe, aux deux rôles.
 *
 * Le jeu expose ce qui casse : un compte sans nom, une adresse jamais vérifiée,
 * une invitation qui expire demain. Un écran où trois collègues bien nommés se
 * rangent en colonne ne prouve rien.
 */
const MEMBRES: MembreEquipe[] = [
	{
		id: 'm1',
		nom: 'Claire Béranger',
		email: 'c.beranger@thumbbb.fr',
		role: 'ORG_ADMIN',
		arriveLe: Date.parse('2026-02-11'),
		adresseVerifiee: true,
		estMoi: true
	},
	{
		id: 'm2',
		nom: 'Yannis K.',
		email: 'yannis.k@thumbbb.fr',
		role: 'ORG_MEMBER',
		arriveLe: Date.parse('2026-03-02'),
		adresseVerifiee: true,
		estMoi: false
	},
	{
		id: 'm3',
		nom: null,
		email: 'direction@thumbbb.fr',
		role: 'ORG_MEMBER',
		arriveLe: Date.parse('2026-08-19'),
		adresseVerifiee: false,
		estMoi: false
	}
];

const INVITATIONS: InvitationEnAttente[] = [
	{
		id: 'i1',
		email: 'nouveau.second@thumbbb.fr',
		role: 'ORG_MEMBER',
		lien: 'https://www.letikette.com/rejoindre/4f1c-demo',
		expireLe: Date.now() + 26 * 60 * 60 * 1000
	}
];

function DemoEquipe() {
	const [admin, setAdmin] = useState(true);
	const rien = async () => {};

	return (
		<Page>
			<PageHeader
				titre="Équipe"
				sousTitre="Qui accède aux factures et aux créances de cet établissement."
				actions={
					<Segmented activeColor="neutral" activeVariant="solid">
						<SegmentedButton active={admin} onClick={() => setAdmin(true)}>
							Vu par un admin
						</SegmentedButton>
						<SegmentedButton active={!admin} onClick={() => setAdmin(false)}>
							Vu par un membre
						</SegmentedButton>
					</Segmented>
				}
			/>
			<PageBody>
				<Equipe
					membres={MEMBRES}
					invitations={admin ? INVITATIONS : []}
					estAdmin={admin}
					siegesUtilises={MEMBRES.length}
					siegesAutorises={5}
					onChangerRole={rien}
					onRetirer={rien}
					onAnnulerInvitation={rien}
					onVerifierAdresse={rien}
				/>
			</PageBody>
		</Page>
	);
}

function DemoDonnees() {
	return (
		<Page>
			<PageHeader
				titre="Vos données"
				sousTitre="Ce que nous détenons, ce que vous pouvez en emporter, ce que vous pouvez en effacer."
			/>
			<PageBody>
				<Donnees
					apercu={{
						nomEtablissement: 'Thumbbb Agency',
						estAdmin: true,
						creeLe: Date.parse('2026-02-11'),
						depots: 3,
						factures: 312,
						decomptes: 2,
						debiteurs: 47,
						membres: 3
					}}
				/>
			</PageBody>
		</Page>
	);
}

/**
 * LES DEUX BANDEAUX QUI DISENT QUE LA SURVEILLANCE NE TOURNE PAS.
 *
 * Ils vivent sur l'écran d'accueil, derrière l'authentification, et ne
 * s'affichent QUE lorsque quelque chose ne va pas — donc quasiment jamais en
 * usage normal. Sans cette entrée de showroom, personne ne les regarderait
 * avant le jour où ils apparaissent chez un client.
 *
 * ILS SONT MONTRÉS ENSEMBLE ALORS QU'ILS S'EXCLUENT À L'ÉCRAN. Ce qu'on vient
 * vérifier ici est typographique : deux phrases longues dans un bandeau étroit,
 * à 375 px, sans que rien ne déborde.
 */
function DemoSurveillanceMuette() {
	return (
		<Page>
			<PageHeader titre="À traiter" sousTitre="4 points d’attention" />
			<PageBody>
				<div className="flex flex-col gap-cladd-3xs">
					<Bandeau ton="alerte" icone={<AlertTriangleIcon size={18} />}>
						La surveillance a échoué le 28 août 2026. Vos délais ne sont pas suivis depuis.
					</Bandeau>
					<Bandeau ton="alerte" icone={<AlertTriangleIcon size={18} />}>
						La surveillance n’a pas encore tourné sur cet établissement. Vos délais ne sont pas
						encore suivis.
					</Bandeau>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LA VOIE ENTIÈRE, ET PAS SEULEMENT LÀ OÙ LE DOSSIER EN EST.
 *
 * Les données couvrent délibérément les trois statuts et les deux branches : une
 * étape franchie, l’étape courante, deux étapes à venir, et les deux issues qui
 * font sortir de la ligne. Un jeu où tout serait franchi ne montrerait ni le
 * disque vide, ni le trait pointillé d’une branche non prise — c’est-à-dire rien
 * de ce qu’on vient regarder.
 *
 * ⚠️ IL EST REMONTÉ ICI POUR SERVIR DEUX ÉCRANS. Le rail seul se regarde sous
 * l'entrée « rail » ; le même dossier se regarde monté dans l'onglet des
 * procédures et sur l'accueil. Deux jeux de démonstration pour la même voie
 * finiraient par diverger, et on irait vérifier une géométrie sur des données
 * que le produit ne rendrait jamais ensemble.
 */
const RAIL_DEMO: EtapeAffichee[] = [
	{
		etat: 'REQUETE_DEPOSEE',
		libelle: 'Requête déposée',
		statut: 'FRANCHIE',
		atteinteLe: '2026-06-04',
		branches: [
			{
				etat: 'REQUETE_REJETEE',
				libelle: 'Requête rejetée',
				constat:
					'Le juge n’a pas fait droit à la requête, ou pas entièrement. La créance n’est pas ' +
					'éteinte ; cette voie-ci est fermée.'
			}
		],
		brancheSuivie: null
	},
	{
		etat: 'ORDONNANCE_RENDUE',
		libelle: 'Ordonnance rendue',
		statut: 'COURANTE',
		atteinteLe: '2026-08-28',
		branches: [],
		brancheSuivie: null
	},
	{
		etat: 'ORDONNANCE_SIGNIFIEE',
		libelle: 'Ordonnance signifiée',
		statut: 'A_VENIR',
		atteinteLe: null,
		branches: [
			{
				etat: 'OPPOSITION',
				libelle: 'Opposition formée',
				constat:
					'L’affaire bascule en procédure contradictoire. Les procédures que ce logiciel ' +
					'évalue se déroulent toutes sans débat : ce dossier sort de ce qu’il sait mesurer.'
			}
		],
		brancheSuivie: null
	},
	{
		etat: 'TITRE_EXECUTOIRE',
		libelle: 'Titre exécutoire',
		statut: 'A_VENIR',
		atteinteLe: null,
		branches: [],
		brancheSuivie: null
	}
];

/**
 * LES DOSSIERS ENGAGÉS — le pire cas d'abord.
 *
 * ⚠️ LE PREMIER PORTE UNE CADUCITÉ, ET LE SECOND UN ANGLE MORT. C'est le couple
 * qu'il faut voir côte à côte : une date que le logiciel COMPTE, et un délai
 * qu'il sait courir sans savoir jusqu'à quand. Un jeu où tout serait mesuré
 * cacherait précisément ce que la règle « ce que le logiciel ne voit pas
 * s'affiche aussi » existe pour montrer.
 */
const DOSSIERS_DEMO: DossierAffiche[] = [
	{
		creanceId: 'demo-creance-martin',
		debiteur: 'Ateliers Martin',
		libelle: 'Ordonnance rendue',
		engageeLe: '2026-06-04',
		intervenant: 'SCP Reynal & Vasseur, commissaires de justice',
		prochaineEcheance: {
			libelle: 'Signification de l’ordonnance',
			dateLimite: '2026-11-28',
			gravite: 'CADUCITE',
			consequence:
				'Passé ce délai de 3 mois, l’ordonnance est caduque. La créance n’est pas éteinte, ' +
				'mais la procédure est à reprendre depuis le début, et le temps écoulé rapproche la ' +
				'prescription.'
		},
		anglesMorts: [],
		etapes: RAIL_DEMO
	},
	{
		creanceId: 'demo-creance-durand',
		debiteur: 'Fournitures Durand',
		libelle: 'Ordonnance signifiée',
		engageeLe: '2026-01-10',
		intervenant: null,
		prochaineEcheance: null,
		anglesMorts: [
			'Un délai d’opposition court depuis la signification. Sa durée n’est pas relevée dans le ' +
				'référentiel juridique de ce logiciel : cette échéance-là n’est PAS surveillée, et reste ' +
				'à vérifier auprès de l’acte signifié, qui la porte.'
		],
		etapes: RAIL_DEMO.map((etape, rang) =>
			rang === 1
				? { ...etape, statut: 'FRANCHIE' as const }
				: rang === 2
					? { ...etape, statut: 'COURANTE' as const, atteinteLe: '2026-02-10' }
					: etape
		)
	}
];

/**
 * L'ACCUEIL, DANS SES DEUX ÉTATS, ET C'EST TOUTE LA RAISON DE CES DEUX ENTRÉES.
 *
 * Le défaut qu'on corrige était qu'il en avait DEUX FORMES : un écran garni, et
 * une page d'accueil vide qui ne lui ressemblait pas. Les regarder côte à côte
 * dans la salle d'exposition est le seul moyen de vérifier qu'ils sont bien le
 * même écran — même hero, même rangée d'actions, même géométrie — et que seule
 * la carte du bas change.
 */
const ACCUEIL_DEMO: AccueilAffiche = {
	// 48 320,55 € : un montant à cinq chiffres avec des centimes non nuls, parce
	// que c'est le pire cas typographique du hero — l'espace de groupement, la
	// virgule et les deux petits chiffres doivent tenir sur une ligne à 375 px.
	total: 4_832_055n,
	nombreFactures: 7,
	interetsCourusDepuisHier: 274n,
	// ⚠️ LES TROIS PARTS SOMMENT EXACTEMENT AU TOTAL. Une donnée de
	// démonstration qui ne boucle pas est pire qu'absente : elle laisse passer
	// une barre dont les segments ne correspondent pas au chiffre du hero, et
	// c'est précisément le défaut que ce composant existe pour empêcher.
	//   4 500 015 + 304 040 + 28 000 = 4 832 055
	// L'indemnité vaut 7 × 40 € — une par facture en retard, ce qui la relie au
	// `nombreFactures` juste au-dessus.
	parts: { principal: 4_500_015n, interets: 304_040n, indemnites: 28_000n },
	evenements: EVENEMENTS_DEMO,
	hypotheses: [
		"Le secteur de Ateliers Martin n'est pas déterminé : la prescription est calculée sur le délai le plus court (1 an). Préciser le secteur lèvera cette hypothèse."
	],
	anglesMorts: [],
	surveillance: { etat: 'NORMAL' },
	/**
	 * ⚠️ DEUX RANGÉES, ET ELLES NE SE RESSEMBLENT PAS. La démonstration doit
	 * montrer le veilleur dans ses deux régimes à la fois : un dépôt qui TOURNE
	 * EN CE MOMENT — la seule ligne animée de toute l'application — et un relevé
	 * de la nuit qui porte la phrase exacte de la machine.
	 *
	 * C'est la seule façon de vérifier au regard que le pouls se distingue sans
	 * emprunter une couleur de seuil, et que « rien de nouveau, rien de
	 * critique » se lit comme un travail fait plutôt que comme un écran vide.
	 */
	travaux: travauxDuVeilleur({
		battement: {
			jour: '2026-09-11',
			statut: 'TU',
			raison: 'rien de nouveau, rien de critique',
			termineLe: Date.UTC(2026, 8, 11, 6, 12)
		},
		depotsEnCours: [
			{ id: 'demo-depot', filename: 'export-comptable-aout.csv', etape: 'lecture de 412 lignes' }
		],
		// Une trouvaille, et une seule : elles sont rares par construction.
		// Seul ce qui fait perdre un droit sans qu on ait rien fait en produit une.
		trouvailles: [
			{
				id: 'demo-notif',
				titre: 'Prescription proche',
				message: 'La facture FA-2021-0087 sera prescrite le 2026-10-14, dans 32 jours.',
				lien: '/app/debiteurs?d=demo-debiteur'
			}
		],
		aujourdHui: '2026-09-11'
	}),
	/**
	 * DEUX VERROUS SUR TROIS, et le plus coûteux en tête.
	 *
	 * ⚠️ CELUI DU PROFIL CRÉANCIER EST LE PLUS SILENCIEUX DU PRODUIT : sans lui,
	 * la condition « entre commerçants » reste indéterminée et l'éligibilité à
	 * l'injonction de payer n'est JAMAIS acquise. L'écran de créance affichait
	 * cette condition non remplie sans jamais dire d'où venait le blocage — et
	 * la salle d'exposition doit montrer l'état où le défaut se voyait.
	 */
	verrous: ceQuiManque({
		profilCreancierComplet: false,
		nombreFactures: 7,
		debiteursSansSiren: 4
	}),
	/**
	 * ⚠️ « CE QUI COURT » APPARAÎT ICI, ET NULLE PART DANS L'ÉTAT VIERGE. C'est
	 * la seule façon de vérifier au regard que la section se tait quand elle est
	 * vide : les deux accueils se regardent côte à côte, et le bloc doit être
	 * absent d'un et présent dans l'autre — pas présent et à zéro.
	 */
	dossiers: DOSSIERS_DEMO
};

function DemoAccueil() {
	return (
		<Shell>
			<EcranAccueil vue={ACCUEIL_DEMO} />
		</Shell>
	);
}

/** Le premier jour : tout est à zéro, et RIEN ne disparaît pour autant. */
const ACCUEIL_VIERGE: AccueilAffiche = {
	total: 0n,
	nombreFactures: 0,
	interetsCourusDepuisHier: 0n,
	parts: { principal: 0n, interets: 0n, indemnites: 0n },
	evenements: [],
	hypotheses: [],
	anglesMorts: [],
	surveillance: { etat: 'NORMAL' },
	/**
	 * ⚠️ LE PREMIER JOUR, LE VEILLEUR PARLE QUAND MÊME — et il dit la vérité,
	 * qui est qu'il n'a pas encore tourné. C'est l'application de la règle « le
	 * vide montre le chemin » au travail de fond : un bloc absent apprendrait au
	 * gérant que son absence est normale, et le jour où il manque parce que la
	 * machine est tombée, plus rien ne le distinguerait d'un jour calme.
	 */
	travaux: travauxDuVeilleur({
		battement: null,
		depotsEnCours: [],
		aujourdHui: '2026-09-11'
	}),
	/**
	 * ⚠️ VIDE, ET C'EST JUSTE. Au premier jour, la carte de démarrage porte déjà
	 * « importez vos factures », seule à l'écran et avec le seul faisceau de
	 * l'application. Répéter la même consigne dans une seconde carte est le plus
	 * sûr moyen de n'en faire lire aucune — l'écran ne montre donc les verrous
	 * qu'une fois la première facture entrée.
	 */
	verrous: [],
	/** Rien d'engagé : la section « Ce qui court » ne doit pas exister du tout. */
	dossiers: []
};

function DemoAccueilVierge() {
	return (
		<Shell>
			<EcranAccueil vue={ACCUEIL_VIERGE} />
		</Shell>
	);
}

/**
 * L'ONGLET DES PROCÉDURES, DANS SES DEUX ÉTATS.
 *
 * ⚠️ LE DOSSIER EST OUVERT D'EMBLÉE, et c'est ce qu'on vient regarder : sous
 * 1024 px la preuve est une FEUILLE plein écran, au-dessus c'est le volet de
 * droite. Le rendre fermé par défaut ne montrerait que la liste, c'est-à-dire
 * la moitié la moins risquée de l'écran.
 */
function DemoProcedures() {
	const [ouvert, setOuvert] = useState<string | null>(DOSSIERS_DEMO[0]?.creanceId ?? null);

	return (
		<Shell>
			<EcranProcedures
				dossiers={DOSSIERS_DEMO}
				ouvertId={ouvert}
				onFermer={() => setOuvert(null)}
			/>
		</Shell>
	);
}

/**
 * ⚠️ L'ÉTAT VIDE EST LE CAS COURANT, ET DE LOIN. Un gérant qui n'a rien engagé
 * doit y lire ce que le logiciel COMPTERA — et aucune voie ne lui est proposée,
 * ce serait recommander une procédure.
 */
function DemoProceduresVide() {
	return (
		<Shell>
			<EcranProcedures dossiers={[]} ouvertId={null} onFermer={() => {}} />
		</Shell>
	);
}

/**
 * LES QUATRE ÉTATS D'UN DÉPÔT, CÔTE À CÔTE.
 *
 * C'est la seule façon de vérifier que la règle tient : « un import qui annonce
 * 198 factures sans mentionner les deux lignes écartées ment par omission ».
 * Les nombres doivent être lisibles sans geste sur les quatre, et seules les
 * RAISONS ligne à ligne ont le droit de se replier.
 */
const DEPOTS_DEMO: DepotAffiche[] = [
	{
		id: 'd1',
		filename: 'FEC-2026-exercice.txt',
		statut: 'TERMINE',
		etape: 'Lecture terminée.',
		// Le cas qui compte : un import largement réussi, MAIS deux lignes
		// perdues. Elles doivent crever les yeux au milieu du succès.
		bilan: {
			facturesCreees: 198,
			reglementsCrees: 142,
			debiteursCrees: 37,
			facturesDejaConnues: 12,
			horsPerimetre: 486,
			reglementsOrphelins: 3,
			ignoreesTotal: 2,
			ignorees: [
				{ texte: 'l1', raison: 'Ligne 4128 : montant illisible (« 1 2З0,00 » — un З cyrillique).' },
				{ texte: 'l2', raison: 'Ligne 4310 : aucune date d’échéance, et aucun délai au contrat.' }
			]
		},
		deposeLe: Date.parse('2026-09-09T08:12:00Z')
	},
	{
		id: 'd2',
		filename: 'export-ventes-aout.csv',
		statut: 'TERMINE',
		etape: 'Lecture terminée.',
		// Un import parfait : aucun dépliant ne doit s'ouvrir, et le
		// hors-périmètre reste en gris — ce n'est pas une anomalie.
		bilan: {
			facturesCreees: 41,
			reglementsCrees: 0,
			debiteursCrees: 4,
			facturesDejaConnues: 0,
			horsPerimetre: 96,
			reglementsOrphelins: 0,
			ignoreesTotal: 0,
			ignorees: []
		},
		deposeLe: Date.parse('2026-09-08T16:40:00Z')
	},
	{
		id: 'd3',
		filename: 'FA-2026-0412.pdf',
		statut: 'EN_COURS',
		etape: 'Extraction des lignes par le modèle…',
		deposeLe: Date.parse('2026-09-09T09:02:00Z')
	},
	{
		id: 'd4',
		filename: 'scan-caisse.jpg',
		statut: 'ECHOUE',
		erreur: 'Le fichier n’est pas une facture de vente : aucun montant ni référence trouvés.',
		deposeLe: Date.parse('2026-09-07T11:20:00Z')
	}
];

function DemoBilanImport() {
	return (
		<Page>
			<PageHeader titre="Vos dépôts" sousTitre="Les quatre états d’un import" />
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					{DEPOTS_DEMO.map((depot) => (
						<BilanImport key={depot.id} depot={depot} />
					))}
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LES TROIS ÉTATS DE L'HABITUDE, CÔTE À CÔTE.
 *
 * C'est la seule façon de vérifier la propriété qui compte : « aucune rupture »
 * et « aucune mesure » ne doivent pas se ressembler. Le troisième cas — un
 * débiteur trop récent pour qu'on sache quoi que ce soit — est celui qu'on
 * oublie de dessiner, et c'est celui qui laisse croire qu'un client est sage.
 */
function DemoHabitude() {
	return (
		<Page>
			<PageHeader titre="Son habitude de paiement" sousTitre="Les trois états du module" />
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Une habitude rompue</SectionTitle>
						<HabitudePaiement
							habitude={{
								connue: true,
								delaiMedianJours: 12,
								echantillon: 23,
								dispersionJours: 2
							}}
							ruptures={[
								{
									reference: 'FA-2026-0311',
									habituelJours: 12,
									ecartJours: 73,
									constat:
										'Ce débiteur règle habituellement à 12 jours de son échéance, sur 23 règlements observés. Cette facture en est à 85, soit 73 de plus que son habitude.'
								},
								{
									reference: 'FA-2026-0348',
									habituelJours: 12,
									ecartJours: 31,
									constat:
										'Ce débiteur règle habituellement à 12 jours de son échéance, sur 23 règlements observés. Cette facture en est à 43, soit 31 de plus que son habitude.'
								}
							]}
						/>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Un payeur lent, mais fidèle à lui-même</SectionTitle>
						{/* ⚠️ LE CAS QUE LE SEUIL ABSOLU RATERAIT DANS L'AUTRE SENS : 65
						    jours de retard, et rien à signaler — c'est son rythme depuis
						    toujours. Un seuil crierait, et le bruit s'apprend. */}
						<HabitudePaiement
							habitude={{
								connue: true,
								delaiMedianJours: 65,
								echantillon: 18,
								dispersionJours: 3
							}}
							ruptures={[]}
						/>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Pas encore assez d’historique</SectionTitle>
						<HabitudePaiement
							habitude={{
								connue: false,
								raison:
									'2 règlements datés connus : il en faut au moins 4 pour parler d’une habitude.'
							}}
							ruptures={[]}
						/>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Un client qui paie en avance</SectionTitle>
						<HabitudePaiement
							habitude={{
								connue: true,
								delaiMedianJours: -9,
								echantillon: 31,
								dispersionJours: 1
							}}
							ruptures={[]}
						/>
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LE VEILLEUR EN PERSONNE, dans ses trois etats.
 *
 * ⚠️ IL N'APPARAIT PAS DANS LA COQUILLE DE CETTE SALLE, et c'est correct :
 * dans la barre il interroge Convex, la requete leve sans session, et le
 * `Facultatif` qui l'entoure rend `null` plutot que d'emporter la navigation.
 * C'est exactement ce qu'on veut en production — mais ca le rend invisible
 * ici, d'ou cette page.
 *
 * Les trois etats cote a cote sont le seul moyen de verifier AU REGARD ce que
 * les mots promettent : que la veille se sente sans s'agiter, que le balayage
 * soit franc, et surtout qu'un veilleur ROMPU n'ait pas l'air de veiller.
 */
function DemoVeilleurAvatar() {
	const etats = [
		{
			etat: 'VEILLE' as const,
			titre: 'Il veille',
			note: 'L’iris respire — six secondes par cycle, huit pour cent d’amplitude. Delibérément sous le seuil où l’on remarque un mouvement sans le chercher : ce qui s’agite en permanence devient du décor en trois jours.'
		},
		{
			etat: 'TRAVAILLE' as const,
			titre: 'Il travaille en ce moment',
			note: 'Le balayage tourne, franc et rapide. C’est le seul moment où l’avatar est vraiment animé, et il ne dure que le temps du traitement. Sa rareté est ce qui le rend lisible.'
		},
		{
			etat: 'ROMPU' as const,
			titre: 'La surveillance est interrompue',
			note: 'L’iris se contracte, l’orbite se pointille, plus rien ne tourne. Un veilleur en panne ne doit pas avoir l’air de veiller : c’est le seul mensonge que cette pastille pourrait dire, et le plus coûteux du produit.'
		}
	];

	return (
		<Page>
			<PageHeader titre="Le veilleur" sousTitre="Sa présence, sur tous les écrans" />
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					{etats.map(({ etat, titre, note }) => (
						<Surface
							key={etat}
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex items-start gap-cladd-2xs p-cladd-2xs"
						>
							<VeilleurAvatar etat={etat} taille={40} />
							<div className="flex min-w-0 flex-col gap-1">
								<span className="text-cladd-sm font-semibold">{titre}</span>
								<span className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{note}</span>
							</div>
						</Surface>
					))}

					<p className="px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
						Aucune couleur de seuil : le vert, l’ambre et le rouge restent réservés à
						<code> --color-seuil-*</code>. L’avatar prend le bleu d’encre de la marque, comme le
						pouls du journal — c’est la même machine, elle a la même couleur.
					</p>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoRail() {
	return (
		<Page>
			<PageHeader titre="Ateliers Martin" sousTitre="L’injonction de payer, d’un bout à l’autre" />
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<SectionTitle>Les étapes de la voie</SectionTitle>
					<Surface
						variant="transparent"
						outline={false}
						className="verre-carte rounded-cladd-xl"
						contentClassName="p-cladd-2xs"
					>
						<RailProcedure etapes={RAIL_DEMO} />
					</Surface>

					<p className="px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
						Aucune couleur de seuil sur ce rail : le vert, l’ambre et le rouge restent réservés à
						<code> --color-seuil-*</code>. Une étape franchie se marque par un disque plein, pas par
						du vert — elle n’est pas un seuil.
					</p>
				</div>
			</PageBody>
		</Page>
	);
}

const ECRANS = [
	'veilleur',
	'accueil',
	'accueil-vierge',
	'procedures',
	'procedures-vide',
	'bilan-import',
	'habitude',
	'lettrage',
	'creancier',
	'identite',
	'litige',
	'suivi',
	'rail',
	'pieces',
	'solidite',
	'relances',
	'creance',
	'detail',
	'debiteur',
	'revelation',
	'bilan',
	'flux',
	'decompte',
	'depot',
	'vide',
	'abonnement',
	'equipe',
	'donnees',
	'muette',
	'coquille'
] as const;
type Ecran = (typeof ECRANS)[number];

function Showroom() {
	const [ecran, setEcran] = useState<Ecran>('accueil');

	return (
		<div className="flex h-dvh flex-col">
			{/* La barre défile POUR ELLE SEULE : la page, elle, ne doit jamais
			    déborder — c'est précisément le défaut qu'on vient traquer ici. */}
			<div className="shrink-0 overflow-x-auto border-b border-cladd-bg-outline p-cladd-3xs">
				<Toolbar>
					<Segmented activeColor="neutral" activeVariant="solid">
						{ECRANS.map((e) => (
							<SegmentedButton key={e} active={ecran === e} onClick={() => setEcran(e)}>
								{e}
							</SegmentedButton>
						))}
					</Segmented>
				</Toolbar>
			</div>

			<div className="min-h-0 flex-1">
				{ecran === 'accueil' ? <DemoAccueil /> : null}
				{ecran === 'accueil-vierge' ? <DemoAccueilVierge /> : null}
				{ecran === 'procedures' ? <DemoProcedures /> : null}
				{ecran === 'procedures-vide' ? <DemoProceduresVide /> : null}
				{ecran === 'bilan-import' ? <DemoBilanImport /> : null}
				{ecran === 'veilleur' ? <DemoVeilleurAvatar /> : null}
				{ecran === 'habitude' ? <DemoHabitude /> : null}
				{ecran === 'lettrage' ? <DemoLettrage /> : null}
				{ecran === 'creancier' ? <DemoCreancier /> : null}
				{ecran === 'identite' ? <DemoIdentite /> : null}
				{ecran === 'litige' ? <DemoLitige /> : null}
				{ecran === 'suivi' ? <DemoSuivi /> : null}
				{ecran === 'rail' ? <DemoRail /> : null}
				{ecran === 'pieces' ? <DemoPieces /> : null}
				{ecran === 'solidite' ? <DemoSolidite /> : null}
				{ecran === 'relances' ? <DemoRelances /> : null}
				{ecran === 'creance' ? <DemoCreance /> : null}
				{ecran === 'detail' ? <DemoDetail /> : null}
				{ecran === 'debiteur' ? <DemoDebiteurDetail /> : null}
				{ecran === 'revelation' ? <DemoRevelation /> : null}
				{ecran === 'bilan' ? <DemoBilan /> : null}
				{ecran === 'flux' ? <DemoFlux /> : null}
				{ecran === 'decompte' ? <DemoDecompte /> : null}
				{ecran === 'depot' ? <DemoDepot /> : null}
				{ecran === 'vide' ? <DemoVide /> : null}
				{ecran === 'abonnement' ? <DemoAbonnement /> : null}
				{ecran === 'equipe' ? <DemoEquipe /> : null}
				{ecran === 'donnees' ? <DemoDonnees /> : null}
				{ecran === 'muette' ? <DemoSurveillanceMuette /> : null}
				{ecran === 'coquille' ? (
					<Shell>
						<DemoFlux />
					</Shell>
				) : null}
			</div>
		</div>
	);
}
