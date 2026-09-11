import { useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { Toolbar, Segmented, SegmentedButton, SectionTitle } from '@cladd-ui/react';
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
	ConstatRegistre,
	Lettrage,
	type OptionSecteur,
	type RevelationAffichee,
	type BilanPertesAffiche,
	euros,
	type EvenementAffiche,
	type DecompteAffiche
} from '../ui';
import { Offre, OuvertureEnCours, EssaiEnCours } from '../screens/abonnement/offre';
import { PALIERS, BORNES_PALIER, TARIFS } from '../lib/config/tarifs';
import { Equipe, type MembreEquipe, type InvitationEnAttente } from '../screens/equipe/equipe';
import { Donnees } from '../screens/donnees/donnees';
import { FormulaireCreancier } from '../screens/parametres/creancier';
import { Shell } from '../app/shell';
import { EcranAccueil, type AccueilAffiche } from '../screens/accueil';

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
			'Ou rattacher cette facture à une créance, ou enregistrer son règlement.'
	},
	{
		type: 'PRESCRIPTION_PROCHE',
		reference: 'FA-2021-0087',
		montant: 924_000n,
		urgence: 'CRITIQUE',
		explication: 'La facture FA-2021-0087 est PRESCRITE depuis le 2026-08-14.',
		action: 'Ne plus engager de frais sur cette facture : la créance est éteinte.'
	},
	{
		type: 'ECHEANCE_PROCEDURE',
		reference: 'Ateliers Martin — injonction',
		montant: 1_845_000n,
		urgence: 'CRITIQUE',
		explication: "Signification de l'ordonnance : il reste 9 jour(s) avant le 2026-09-12.",
		action:
			'Faire signifier sans délai — passée cette date, le droit est perdu et 18 450,00 € cessent d’être couverts par cette procédure.'
	},
	{
		type: 'CREANCE_MURE',
		reference: 'Fournitures Durand',
		montant: 3_120_050n,
		urgence: 'HAUTE',
		explication: 'La créance atteint le seuil de qualification (0,90 pour un seuil de 0.75).',
		action: 'Examiner les procédures envisageables pour cette créance.'
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

function DemoIdentite() {
	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Ce que le gérant seul peut dire" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Sans identifiant — l’angle mort est dit</SectionTitle>
						<IdentiteDebiteur
							siren={undefined}
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
						<SectionTitle>Renseigné</SectionTitle>
						<IdentiteDebiteur
							siren="853479236"
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
							siren={undefined}
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
					onInviter={rien}
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
					emailDuCompte="c.beranger@thumbbb.fr"
					onExporter={async () => ({
						url: '#',
						octets: 2_410_000,
						lignes: 1842,
						nomFichier: 'letikette-export-2026-09-03.json'
					})}
					onSupprimerEtablissement={async () => {}}
					onSupprimerCompte={async () => {}}
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
	surveillance: { etat: 'NORMAL' }
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
	surveillance: { etat: 'NORMAL' }
};

function DemoAccueilVierge() {
	return (
		<Shell>
			<EcranAccueil vue={ACCUEIL_VIERGE} />
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

const ECRANS = [
	'accueil',
	'accueil-vierge',
	'bilan-import',
	'habitude',
	'lettrage',
	'creancier',
	'identite',
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
				{ecran === 'bilan-import' ? <DemoBilanImport /> : null}
				{ecran === 'habitude' ? <DemoHabitude /> : null}
				{ecran === 'lettrage' ? <DemoLettrage /> : null}
				{ecran === 'creancier' ? <DemoCreancier /> : null}
				{ecran === 'identite' ? <DemoIdentite /> : null}
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
