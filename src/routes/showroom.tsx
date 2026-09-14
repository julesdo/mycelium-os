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
	ChocRevelation,
	BilanPertes,
	HabitudePaiement,
	IdentiteDebiteur,
	SuiviProcedure,
	RailProcedure,
	FeuilleVoie,
	type VoieAffichee,
	ChoixIntervenant,
	type FicheIntervenant,
	RechercheCommissaire,
	type ResultatAnnuaireAffiche,
	RechercheAvocat,
	type ResultatAvocatsAffiche,
	type RepertoireAffiche,
	ListeAnalyses,
	LigneBouton,
	Pieces,
	ConstatRegistre,
	Lettrage,
	type OptionSecteur,
	type RevelationAffichee,
	type BilanPertesAffiche,
	euros,
	VeilleurAvatar
} from '../ui';
import { Offre, OuvertureEnCours, EssaiEnCours } from '../screens/abonnement/offre';
import { PALIERS, BORNES_PALIER, TARIFS } from '../lib/config/tarifs';
import { Equipe, type MembreEquipe, type InvitationEnAttente } from '../screens/equipe/equipe';
import { Donnees } from '../screens/donnees/donnees';
import { FormulaireCreancier } from '../screens/parametres/creancier';
import { Shell } from '../app/shell';
import { DetailDebiteur } from '../screens/debiteur-detail';
import { EcranIntrouvable, EcranEnErreur } from '../screens/passage';
import { etapesDeLaVoie } from '../lib/verticales/recouvrement/apres-procedure';
import { PROCEDURES } from '../lib/verticales/recouvrement/procedures';
import { ECRANS_DU_PRODUIT } from './-salle/ecrans';
import type { EtatDemo } from './-salle/demo';
import { EVENEMENTS_DEMO, RAIL_DEMO } from './-salle/communes';

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

/**
 * LA VOIE DE DEMONSTRATION VIENT DU DOMAINE, PAS D'UNE COPIE.
 *
 * ⚠️ RECOPIER LES QUATRE LIBELLES ICI FERAIT DEUX FORMULATIONS DU MEME FAIT, et
 * la salle d'exposition montrerait alors une procédure qui n'est plus celle du
 * produit. `apres-procedure.ts` le dit déjà de son côté : le libellé vit avec la
 * transition qui le produit. Une salle qui ment sur ce qu'on vient y regarder
 * est pire qu'une salle vide.
 *
 * L'injonction de payer, et pas L.126 : c'est la voie complète — quatre étapes
 * sur la ligne, trois façons d'échouer — donc celle qui met la feuille à
 * l'épreuve sur les quatre largeurs de référence.
 */
const VOIE_DEMO: VoieAffichee = {
	cle: 'injonction-de-payer',
	nom: PROCEDURES['injonction-de-payer'].nom,
	disponible: true,
	blocages: [],
	etapes: etapesDeLaVoie('injonction-de-payer').map((etape) => ({
		etat: etape.etat,
		libelle: etape.libelle,
		constat: etape.constat
	})),
	conditionsEchec: PROCEDURES['injonction-de-payer'].conditionsEchec
};

function DemoVoie() {
	// Une `Popup` est contrôlée : sans état d'ouverture, elle ne s'affiche pas.
	// La salle l'ouvre d'emblée — c'est ce qu'on vient regarder — et la rangée
	// la rouvre, ce qui expose du même coup les deux moitiés du geste.
	const [ouverte, setOuverte] = useState(true);

	return (
		<Page>
			<PageHeader
				titre="Ateliers Martin"
				sousTitre="Ce qu’une voie implique, avant de s’y engager"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<SectionTitle>Les voies envisageables</SectionTitle>
					<ListeAnalyses>
						<LigneBouton
							titre={VOIE_DEMO.nom}
							valeur="Envisageable"
							precision={`${VOIE_DEMO.etapes.length} étapes · ${VOIE_DEMO.conditionsEchec.length} façons d’échouer`}
							onClick={() => setOuverte(true)}
						/>
					</ListeAnalyses>

					<p className="px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
						Les étapes sont numérotées parce qu’elles se suivent, pas parce qu’il faudrait les
						faire. Aucun classement entre les voies, aucune mise en avant : la feuille montre un
						déroulé et ce qui le fait échouer, et s’arrête là.
					</p>

					<FeuilleVoie
						voie={VOIE_DEMO}
						ouverte={ouverte}
						onFermer={() => setOuverte(false)}
						onDeclarer={() => setOuverte(false)}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LE CARNET DE LA SALLE — deux fiches, deux rôles, et « Moi-même » choisi.
 *
 * ⚠️ DEUX RÔLES DIFFÉRENTS EXPRÈS. C'est ce qui met le sous-titre à l'épreuve :
 * « Commissaire de justice · Bobigny » est la chaîne la plus longue que cette
 * carte ait à porter, et c'est sur 375 px qu'elle se casse, pas sur 1280.
 */
const CARNET_DEMO: readonly FicheIntervenant[] = [
	{ _id: 'fiche-avocat', nom: 'Cabinet Perrin', role: 'AVOCAT', ressort: 'Paris' },
	{
		_id: 'fiche-commissaire',
		nom: 'Étude Lemoine',
		role: 'COMMISSAIRE_DE_JUSTICE',
		ressort: 'Bobigny'
	}
];

function DemoIntervenant() {
	// Comme `DemoVoie` : une `Popup` est contrôlée, donc la salle l'ouvre
	// d'emblée — c'est ce qu'on vient regarder.
	const [ouverte, setOuverte] = useState(true);
	// `null` = « Moi-même », le premier rang. Voir `choix-intervenant.tsx` : ce
	// n'est pas une présélection du logiciel mais l'état réel d'un dossier sans
	// intervenant rattaché.
	const [choisi, setChoisi] = useState<string | null>(null);

	return (
		<Page>
			<PageHeader
				titre="Ateliers Martin"
				sousTitre="Qui fait l’acte, et pourquoi rien n’est trié"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<SectionTitle>Le carnet</SectionTitle>
					<ListeAnalyses>
						<LigneBouton
							titre="Qui fait l’acte"
							valeur={CARNET_DEMO.find((f) => f._id === choisi)?.nom ?? 'Moi-même'}
							onClick={() => setOuverte(true)}
						/>
					</ListeAnalyses>

					<ChoixIntervenant
						carnet={CARNET_DEMO}
						choisi={choisi}
						ouverte={ouverte}
						onFermer={() => setOuverte(false)}
						onChoisir={setChoisi}
						onAjouter={() => setOuverte(false)}
						onOublier={() => setOuverte(false)}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * TROIS ÉTUDES DE DÉMONSTRATION — ET CE SONT DE VRAIES.
 *
 * Relevées le 12 septembre 2026 en interrogeant l'API Recherche d'entreprises
 * sur le département 44, qui en rend vingt-deux. Des données inventées auraient
 * caché ce que la vraie réponse a de particulier : des dénominations en
 * capitales, parfois doublées d'un sigle, et une adresse de siège qui n'est pas
 * toujours dans le département cherché.
 */
const ETUDES_DEMO: ResultatAnnuaireAffiche = {
	departement: '44',
	total: 22,
	etudes: [
		{
			siren: '921924908',
			// ⚠️ L'APOSTROPHE EST DROITE, ET LE NOM EST DOUBLÉ. C'est le registre qui
			// écrit ainsi ; le redresser en apostrophe courbe ou retirer les
			// parenthèses reviendrait à faire répéter à la salle d'exposition une
			// dénomination que la source ne porte pas — exactement ce que l'écran
			// s'interdit de faire avec les vraies réponses.
			nom: "COMMISSAIRES DE L'OUEST (COMMISSAIRES DE L'OUEST) (CDOUEST)",
			commune: 'NANTES',
			codePostal: '44100',
			adresse: '14 BOULEVARD WINSTON CHURCHILL 44100 NANTES'
		},
		{
			siren: '883711400',
			nom: 'MOCAER, CLAVIERE, VIOTTI',
			commune: 'NORT-SUR-ERDRE',
			codePostal: '44390',
			adresse: "5 RUE D'ANJOU 44390 NORT-SUR-ERDRE"
		},
		{
			siren: '911195980',
			nom: 'SOLUTIONS HUISSIER',
			commune: 'SAINT-NAZAIRE',
			codePostal: '44600',
			adresse: '5 RUE DES TROENES 44600 SAINT-NAZAIRE'
		}
	],
	source:
		'Registre des entreprises (API Recherche d’entreprises, DINUM), filtré sur la convention ' +
		'collective 3250 et l’activité 69.10Z. Ce n’est pas le tableau de la profession : une étude ' +
		'qui n’a pas déclaré sa convention collective n’y figure pas, et une radiation disciplinaire ' +
		'n’y figure pas non plus. Le filtre de département porte sur les établissements, pas sur le ' +
		'siège : une étude dont le siège est ailleurs peut remonter.',
	releveeLe: '2026-09-12'
};

function DemoCommissaire() {
	// Comme `DemoIntervenant` : une `Popup` est contrôlée, donc la salle l'ouvre
	// d'emblée — c'est ce qu'on vient regarder.
	const [ouverte, setOuverte] = useState(true);

	return (
		<Page>
			<PageHeader
				titre="Chercher un commissaire"
				sousTitre="Le registre public, et ce qu’il ne dit pas"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<ListeAnalyses>
						<LigneBouton
							titre="Chercher un commissaire de justice"
							valeur="Département 44"
							onClick={() => setOuverte(true)}
						/>
					</ListeAnalyses>

					{/*
					  ⚠️ TRONQUÉE VOLONTAIREMENT : trois études affichées, vingt-deux
					  déclarées. C'est l'état qu'on vient vérifier à l'œil — celui où la
					  liste doit DIRE qu'elle est incomplète, faute de quoi elle ment par
					  le silence.
					*/}
					<RechercheCommissaire
						ouverte={ouverte}
						departementParDefaut="44"
						etat={{ phase: 'TROUVE', resultat: ETUDES_DEMO }}
						onFermer={() => setOuverte(false)}
						onChercher={() => undefined}
						onRetenir={() => setOuverte(false)}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LE RÉPERTOIRE DE LA SALLE — DE VRAIS BARREAUX, EN NOMBRE RÉDUIT.
 *
 * Relevés le 12 septembre 2026 dans la livraison du 17 juillet 2026 de
 * l'annuaire national des avocats. La livraison réelle en porte plus de cent
 * cinquante ; vingt suffisent à mettre la liste déroulante et sa recherche à
 * l'épreuve, et les noms sont écrits comme le fichier les écrit — en capitales,
 * sans accent, et parfois sous le nom du DÉPARTEMENT plutôt que de la ville
 * (« CHARENTE », « VAL DE MARNE »). Les redresser ferait afficher à la salle
 * des libellés que la source ne porte pas.
 */
const BARREAUX_DEMO: RepertoireAffiche = {
	barreaux: [
		'AGEN',
		'ALBERTVILLE',
		'ALES',
		'ARDENNES',
		'ARRAS',
		'AUXERRE',
		'BEAUVAIS',
		'BESANCON',
		'BLOIS',
		'BORDEAUX',
		'BOURGES',
		'BRIEY',
		'CARPENTRAS',
		'CHALON-SUR-SAONE',
		'CHARENTE',
		'COLMAR',
		'HAUTE-MARNE',
		'LOT',
		'MEUSE',
		'VAL DE MARNE'
	],
	complete: true,
	releveeLe: '2026-07-17'
};

/**
 * TROIS AVOCATS DE DÉMONSTRATION — ET CE SONT DE VRAIS.
 *
 * Relevés le 12 septembre 2026 dans la livraison du 17 juillet 2026, au barreau
 * de Bordeaux, qui en compte 2 214. Des fiches inventées auraient caché ce que
 * le vrai fichier a de particulier, et chacune des trois est ici pour une
 * raison :
 *
 *   · ANDREAU n'a PAS de SIREN — le fichier laisse la colonne vide sur nombre
 *     de fiches. La rangée retombe alors sur la raison sociale, au lieu
 *     d'afficher un tiret qui se lirait comme une valeur ;
 *   · BALTAZAR porte une seconde ligne d'adresse (« 2ème étage »), recollée à
 *     la première par l'import ;
 *   · BERTRAND déclare deux spécialités, dont la plus longue du référentiel du
 *     CNB — c'est sur 375 px qu'elle casse la rangée, pas sur 1280.
 *
 * ⚠️ LA LISTE EST VOLONTAIREMENT TRONQUÉE : trois fiches affichées, 2 214 qui
 * correspondent. C'est l'état qu'on vient vérifier à l'œil — celui où la liste
 * doit DIRE qu'elle est incomplète, faute de quoi elle ment par le silence.
 *
 * ⚠️ ET `specialitesDeclarees` NE PORTE QUE CELLES DU TRIO, pour la même
 * raison : la salle montre une tranche, et la liste de filtres d'une tranche
 * est celle de cette tranche.
 */
const AVOCATS_DEMO: ResultatAvocatsAffiche = {
	barreau: 'BORDEAUX',
	specialite: null,
	total: 2214,
	lectureTronquee: false,
	specialitesDeclarees: [
		'Droit de la sécurité sociale et de la protection sociale',
		'Droit des sociétés',
		'Droit du travail',
		'Droit fiscal et droit douanier',
		'Droit public'
	],
	avocats: [
		{
			nom: 'ANDREAU',
			prenom: 'Pierre',
			raisonSociale: 'FIDUCIAIRE SAINT JOSEPH',
			adresse: '9 Cours de Gourgues',
			codePostal: '33000',
			ville: 'BORDEAUX',
			specialites: ['Droit des sociétés', 'Droit fiscal et droit douanier']
		},
		{
			nom: 'BALTAZAR',
			prenom: 'Marie-Christine',
			raisonSociale: 'BALTAZAR MARIE-CHRISTINE',
			siren: '502005747',
			adresse: '12 rue Elisée Reclus, 2ème étage',
			codePostal: '33000',
			ville: 'BORDEAUX',
			specialites: ['Droit public']
		},
		{
			nom: 'BERTRAND',
			prenom: 'Stéphanie',
			raisonSociale: 'STEPHANIE BERTRAND AVOCAT',
			siren: '832397772',
			adresse: '4 rue de la Maison Daurade',
			codePostal: '33000',
			ville: 'BORDEAUX',
			specialites: ['Droit de la sécurité sociale et de la protection sociale', 'Droit du travail']
		}
	],
	source:
		'Annuaire national des avocats (Conseil national des barreaux), publié sur data.gouv.fr sous ' +
		'Licence Ouverte 2.0. C’est une photographie mensuelle : une fiche peut décrire une situation ' +
		'périmée — un avocat qui a changé de barreau, déménagé, ou cessé d’exercer depuis le relevé. ' +
		'Les spécialités sont celles que l’avocat a DÉCLARÉES au fichier : leur absence ne dit pas ' +
		'qu’il n’en a aucune, elle dit qu’aucune n’est inscrite.',
	releveeLe: '2026-07-17'
};

function DemoAvocat() {
	// Comme `DemoCommissaire` : une `Popup` est contrôlée, donc la salle l'ouvre
	// d'emblée — c'est ce qu'on vient regarder.
	const [ouverte, setOuverte] = useState(true);
	// Les deux filtres sont contrôlés : la salle les laisse bouger pour qu'on
	// voie les deux listes déroulantes et leur recherche, mais la réponse, elle,
	// est figée. Un écran de démonstration qui recalculerait donnerait à croire
	// qu'il interroge quelque chose.
	const [barreau, setBarreau] = useState('BORDEAUX');
	const [specialite, setSpecialite] = useState('');

	return (
		<Page>
			<PageHeader
				titre="Chercher un avocat"
				sousTitre="Un fichier ingéré, sa date, et ce qu’il ne déclare pas"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<ListeAnalyses>
						<LigneBouton
							titre="Chercher un avocat"
							valeur={barreau === '' ? 'Aucun barreau' : barreau}
							onClick={() => setOuverte(true)}
						/>
					</ListeAnalyses>

					<RechercheAvocat
						ouverte={ouverte}
						repertoire={BARREAUX_DEMO}
						barreau={barreau}
						specialite={specialite}
						etat={{ phase: 'TROUVE', resultat: AVOCATS_DEMO }}
						onFermer={() => setOuverte(false)}
						onChoisirBarreau={(choisi) => {
							setBarreau(choisi);
							setSpecialite('');
						}}
						onChoisirSpecialite={setSpecialite}
						onRetenir={() => setOuverte(false)}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

const ECRANS = [
	'veilleur',
	'bilan-import',
	'habitude',
	'lettrage',
	'creancier',
	'identite',
	'suivi',
	'rail',
	'voie',
	'intervenant',
	'commissaire',
	'avocat',
	'pieces',
	'debiteur',
	'revelation',
	'bilan',
	'flux',
	'depot',
	'vide',
	'abonnement',
	'equipe',
	'donnees',
	'muette',
	'introuvable',
	'erreur',
	'coquille'
] as const;
type Ecran = (typeof ECRANS)[number];

const LIBELLE_ETAT: Record<EtatDemo, string> = {
	pret: 'prêt',
	vide: 'sans données',
	attente: 'en attente',
	erreur: 'en erreur'
};

function Showroom() {
	const [ecran, setEcran] = useState<Ecran>('veilleur');
	const [produit, setProduit] = useState<string | null>(ECRANS_DU_PRODUIT[0]?.route ?? null);
	const [etat, setEtat] = useState<EtatDemo>('pret');
	const [variante, setVariante] = useState<string | undefined>(undefined);

	const choisi = ECRANS_DU_PRODUIT.find((e) => e.route === produit) ?? null;
	// Trois états hors du produit : rien à regarder en attente ou en erreur sur
	// une démonstration de composant, donc les boutons restent visibles mais
	// `disabled`, plutôt que de faire sauter la rangée d'un écran à l'autre.
	const etats: readonly EtatDemo[] =
		choisi !== null && choisi.vide
			? ['pret', 'vide', 'attente', 'erreur']
			: ['pret', 'attente', 'erreur'];

	return (
		<div className="flex h-dvh flex-col">
			{/* UNE SEULE RANGÉE, et c'est voulu : les écrans se rendent dans leur
			    coquille, barres comprises, et chaque rangée de plus repousserait la
			    barre basse du téléphone hors de l'écran qu'on vient regarder. */}
			<div className="shrink-0 overflow-x-auto border-b border-cladd-bg-outline p-cladd-3xs">
				<Toolbar>
					<Segmented activeColor="brand" activeVariant="solid">
						{etats.map((e) => (
							<SegmentedButton
								key={e}
								// Sur une démonstration de composant, aucun état n'est « choisi » :
								// un bouton grisé mais allumé dirait l'inverse.
								active={choisi !== null && etat === e}
								disabled={choisi === null}
								onClick={() => setEtat(e)}
							>
								{LIBELLE_ETAT[e]}
							</SegmentedButton>
						))}
					</Segmented>
					{/* Les formes prêtes nommées d'un écran (une relance suspendue, un
					    litige tranché…) : jamais visibles en dehors de l'état prêt, et
					    seulement quand l'écran choisi en déclare. */}
					{choisi !== null && choisi.variantes !== undefined && choisi.variantes.length > 0 ? (
						<Segmented activeColor="neutral" activeVariant="solid">
							<SegmentedButton
								active={variante === undefined}
								disabled={etat !== 'pret'}
								onClick={() => setVariante(undefined)}
							>
								principale
							</SegmentedButton>
							{choisi.variantes.map((v) => (
								<SegmentedButton
									key={v}
									active={variante === v}
									disabled={etat !== 'pret'}
									onClick={() => setVariante(v)}
								>
									{v}
								</SegmentedButton>
							))}
						</Segmented>
					) : null}
					<Segmented activeColor="neutral" activeVariant="solid">
						{ECRANS_DU_PRODUIT.map((e) => (
							<SegmentedButton
								key={e.route}
								active={produit === e.route}
								onClick={() => {
									setProduit(e.route);
									setEtat('pret');
									setVariante(undefined);
								}}
							>
								{e.libelle}
							</SegmentedButton>
						))}
						{ECRANS.map((e) => (
							<SegmentedButton
								key={e}
								active={produit === null && ecran === e}
								onClick={() => {
									setProduit(null);
									setEcran(e);
								}}
							>
								{e}
							</SegmentedButton>
						))}
					</Segmented>
				</Toolbar>
			</div>

			<div className="min-h-0 flex-1">
				{choisi !== null ? (
					<Shell>
						<choisi.Demo
							key={choisi.route}
							etat={etat}
							variante={etat === 'pret' ? variante : undefined}
						/>
					</Shell>
				) : (
					<>
						{ecran === 'bilan-import' ? <DemoBilanImport /> : null}
						{ecran === 'veilleur' ? <DemoVeilleurAvatar /> : null}
						{ecran === 'habitude' ? <DemoHabitude /> : null}
						{ecran === 'lettrage' ? <DemoLettrage /> : null}
						{ecran === 'creancier' ? <DemoCreancier /> : null}
						{ecran === 'identite' ? <DemoIdentite /> : null}
						{ecran === 'suivi' ? <DemoSuivi /> : null}
						{ecran === 'rail' ? <DemoRail /> : null}
						{ecran === 'voie' ? <DemoVoie /> : null}
						{ecran === 'intervenant' ? <DemoIntervenant /> : null}
						{ecran === 'commissaire' ? <DemoCommissaire /> : null}
						{ecran === 'avocat' ? <DemoAvocat /> : null}
						{ecran === 'pieces' ? <DemoPieces /> : null}
						{ecran === 'debiteur' ? <DemoDebiteurDetail /> : null}
						{ecran === 'revelation' ? <DemoRevelation /> : null}
						{ecran === 'bilan' ? <DemoBilan /> : null}
						{ecran === 'flux' ? <DemoFlux /> : null}
						{ecran === 'depot' ? <DemoDepot /> : null}
						{ecran === 'vide' ? <DemoVide /> : null}
						{ecran === 'abonnement' ? <DemoAbonnement /> : null}
						{ecran === 'equipe' ? <DemoEquipe /> : null}
						{ecran === 'donnees' ? <DemoDonnees /> : null}
						{ecran === 'muette' ? <DemoSurveillanceMuette /> : null}
						{ecran === 'introuvable' ? <EcranIntrouvable /> : null}
						{ecran === 'erreur' ? <EcranEnErreur /> : null}
						{ecran === 'coquille' ? (
							<Shell>
								<DemoFlux />
							</Shell>
						) : null}
					</>
				)}
			</div>
		</div>
	);
}
