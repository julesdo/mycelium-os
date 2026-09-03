import { Button, Chip, SurfaceCut, SearchField } from '@cladd-ui/react';
import {
	ChevronsUpDownIcon,
	InboxIcon,
	SettingsIcon,
	UploadIcon,
	UsersIcon
} from 'lucide-react';
import { LogoLetikette, MotLetikette, FluxEvenements, type EvenementAffiche } from '../ui';

/**
 * L'application, telle qu'elle est, dans le cadre de tablette du héros.
 *
 * CE N'EST PAS UNE MAQUETTE. Le flux est `FluxEvenements` : le composant du
 * produit, pas une reproduction. Il dérive l'urgence et met les montants en
 * regard exactement comme dans l'application — le visiteur voit donc l'écran
 * qu'il aura.
 *
 * CE QUI EST RECONSTITUÉ, ET POURQUOI. La barre de navigation. La vraie
 * (`src/app/barre.tsx`) est branchée sur le routeur et sur Convex : elle lit le
 * chemin courant pour savoir quel onglet est actif et charge la liste des
 * établissements. Rien de tout cela n'existe sur une page publique sans
 * session. Elle est donc rejouée ici avec LES MÊMES primitives Cladd et la même
 * composition, de sorte que ce qui est montré reste vrai même s'il n'est pas
 * branché.
 *
 * AUCUN PRÉFIXE RESPONSIVE ICI, ET C'EST UN PIÈGE QUI SE VOIT MAL. La toile est
 * large de 1180px en permanence ; c'est le CADRE qui rétrécit, par une
 * transformation. Or `md:` et `lg:` interrogent la fenêtre, pas la toile : sur
 * un téléphone, un `md:grid-cols-3` retomberait en une colonne alors que la
 * toile fait toujours 1180px de large. On montrerait une mise en page de
 * téléphone dans un cadre de tablette. Toutes les dispositions sont donc
 * écrites une seule fois, au format tablette.
 *
 * `light cladd-color-brand` est posé sur la racine plutôt que laissé à
 * l'héritage : le gérant qui a mis l'application en sombre ne doit pas voir la
 * page d'accueil montrer un aperçu sombre à ses visiteurs.
 */

/**
 * LES CHIFFRES SE TIENNENT ENTRE EUX, ET C'EST VÉRIFIABLE.
 *
 * Sur une page dont l'argument entier est l'exactitude d'un décompte, un jeu de
 * démonstration dont les totaux ne tombent pas juste est une faute. Ceux-ci se
 * recoupent, au centime :
 *
 *   9 240,00 + 18 450,00 + 31 200,50 + 249,90 = 59 140,40 €
 *
 * LE CAS LE PLUS DUR EST MONTRÉ EN PREMIER, et il est mauvais : une facture
 * DÉJÀ prescrite, c'est-à-dire de l'argent définitivement perdu. Un écran où
 * tout va bien vendrait le produit sur un mensonge et ne dirait rien de ce
 * qu'il sert à faire — c'est précisément ce qu'il repère qu'on vient voir.
 */
const EVENEMENTS: EvenementAffiche[] = [
	{
		type: 'PRESCRIPTION_PROCHE',
		reference: 'FA-2021-0087',
		montant: 924_000n,
		urgence: 'CRITIQUE',
		explication: 'La facture FA-2021-0087 est PRESCRITE depuis le 14 août 2026.',
		action: 'Ne plus engager de frais sur cette facture : la créance est éteinte.'
	},
	{
		type: 'ECHEANCE_PROCEDURE',
		reference: 'Ateliers Martin',
		montant: 1_845_000n,
		urgence: 'CRITIQUE',
		explication: 'Signification de l’ordonnance : il reste 9 jours avant le 12 septembre.',
		action:
			'Faire signifier sans délai — passée cette date, le droit est perdu et 18 450,00 € cessent d’être couverts.'
	},
	{
		type: 'CREANCE_MURE',
		reference: 'Fournitures Durand',
		montant: 3_120_050n,
		urgence: 'HAUTE',
		explication: 'La créance atteint le seuil de qualification : quatre factures, toutes échues.',
		action: 'Examiner les procédures envisageables pour cette créance.'
	},
	{
		type: 'FACTURE_ECHUE',
		reference: 'FA-2026-0311',
		montant: 24_990n,
		urgence: 'NORMALE',
		explication: 'La facture FA-2026-0311 est échue depuis le 1er août et reste due.',
		action: 'Rattacher cette facture à une créance, ou enregistrer son règlement.'
	}
];

const TOTAL_IDENTIFIE = 5_914_040n;

const ONGLETS = [
	{ label: 'À traiter', Icone: InboxIcon, actif: true },
	{ label: 'Débiteurs', Icone: UsersIcon, actif: false },
	{ label: 'Importer', Icone: UploadIcon, actif: false }
] as const;

function BarreFigee() {
	return (
		<div className="flex shrink-0 items-center justify-between gap-cladd-2xs px-cladd-2xs py-cladd-3xs">
			<div className="flex items-center gap-cladd-3xs">
				<LogoLetikette className="size-7" />
				<MotLetikette className="h-4" />
			</div>

			<SurfaceCut className="rounded-full" contentClassName="flex items-center gap-1 p-1">
				{ONGLETS.map(({ label, Icone, actif }) => (
					<span
						key={label}
						className={
							actif
								? 'flex h-cladd-md items-center gap-2 rounded-full bg-cladd-surface px-cladd-3xs text-cladd-xs font-semibold shadow-carte'
								: 'flex h-cladd-md items-center justify-center rounded-full px-cladd-3xs text-cladd-fg-softer'
						}
					>
						<Icone size={18} />
						{actif ? label : null}
					</span>
				))}
			</SurfaceCut>

			<div className="flex items-center gap-cladd-3xs">
				<SearchField placeholder="Rechercher un débiteur" className="w-56" />
				<Chip size="md">
					Thumbbb Agency
					<ChevronsUpDownIcon />
				</Chip>
				<Button size="md" variant="transparent" aria-label="Réglages">
					<SettingsIcon />
				</Button>
			</div>
		</div>
	);
}

export function ApercuApplication() {
	return (
		<div className="light cladd-color-brand flex size-full flex-col bg-cladd-bg text-cladd-fg">
			<BarreFigee />

			<div className="flex min-h-0 flex-1 flex-col gap-cladd-2xs p-cladd-2xs">
				<div className="flex flex-col gap-1">
					<h2 className="text-letikette-titre leading-tight font-bold tracking-tight">
						À traiter
					</h2>
					<p className="text-cladd-xs text-cladd-fg-soft">
						4 points d’attention · 312 factures suivies, 47 débiteurs
					</p>
				</div>

				<div className="min-h-0 flex-1 overflow-hidden">
					<FluxEvenements
						evenements={EVENEMENTS}
						montantIdentifie={TOTAL_IDENTIFIE}
						hypotheses={[]}
						anglesMorts={[]}
					/>
				</div>
			</div>
		</div>
	);
}
