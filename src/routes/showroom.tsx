import { useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { Toolbar, Segmented, SegmentedButton, SectionTitle } from '@cladd-ui/react';
import { FileSpreadsheetIcon } from 'lucide-react';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	ZoneDepot,
	FluxEvenements,
	Decompte,
	euros,
	type EvenementAffiche,
	type DecompteAffiche
} from '../ui';
import { Offre, OuvertureEnCours, EssaiEnCours } from '../screens/abonnement/offre';
import { PALIERS, BORNES_PALIER, TARIFS } from '../lib/config/tarifs';
import { Equipe, type MembreEquipe, type InvitationEnAttente } from '../screens/equipe/equipe';
import { Donnees } from '../screens/donnees/donnees';
import { Shell } from '../app/shell';

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
	},
	{
		type: 'FACTURE_ECHUE',
		reference: 'FA-2026-0311',
		montant: 24_990n,
		urgence: 'NORMALE',
		explication: 'La facture FA-2026-0311 est échue depuis le 2026-08-01 et reste due.',
		action: 'Rattacher cette facture à une créance, ou enregistrer son règlement.'
	}
];

function DemoFlux() {
	return (
		<Page>
			<PageHeader titre="À traiter" sousTitre="4 points d’attention" />
			<PageBody>
				<FluxEvenements
					evenements={EVENEMENTS_DEMO}
					montantIdentifie={5_914_040n}
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

const ECRANS = [
	'flux',
	'decompte',
	'depot',
	'vide',
	'abonnement',
	'equipe',
	'donnees',
	'coquille'
] as const;
type Ecran = (typeof ECRANS)[number];

function Showroom() {
	const [ecran, setEcran] = useState<Ecran>('flux');

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
				{ecran === 'flux' ? <DemoFlux /> : null}
				{ecran === 'decompte' ? <DemoDecompte /> : null}
				{ecran === 'depot' ? <DemoDepot /> : null}
				{ecran === 'vide' ? <DemoVide /> : null}
				{ecran === 'abonnement' ? <DemoAbonnement /> : null}
				{ecran === 'equipe' ? <DemoEquipe /> : null}
				{ecran === 'donnees' ? <DemoDonnees /> : null}
				{ecran === 'coquille' ? (
					<Shell>
						<DemoFlux />
					</Shell>
				) : null}
			</div>
		</div>
	);
}
