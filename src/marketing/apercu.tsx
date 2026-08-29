import { Button, Chip, Segmented, SegmentedButton, SurfaceCut, SearchField } from '@cladd-ui/react';
import {
	CameraIcon,
	ChevronsUpDownIcon,
	CheckCheckIcon,
	FileCheck2Icon,
	FileTextIcon,
	GaugeIcon,
	SettingsIcon
} from 'lucide-react';
import { LogoLetikette, MotLetikette, Repartition, TauxEGalim, type LigneFamille } from '../ui';

/**
 * L'application, telle qu'elle est, dans le cadre de tablette du héros.
 *
 * CE N'EST PAS UNE MAQUETTE. Les jauges sont `TauxEGalim`, la répartition est
 * `Repartition` : les composants du produit, pas des reproductions. Ils
 * déduisent leur état de seuil de la mesure qu'on leur passe, exactement comme
 * dans l'application — le visiteur voit donc l'écran qu'il aura, y compris ses
 * couleurs.
 *
 * CE QUI EST RECONSTITUÉ, ET POURQUOI. La barre de navigation. La vraie
 * (`src/app/barre.tsx`) est branchée sur le routeur et sur Convex : elle lit le
 * chemin courant pour savoir quel onglet est actif, compte les produits en
 * attente, et charge la liste des établissements. Rien de tout cela n'existe
 * sur une page publique sans session. Elle est donc rejouée ici avec LES MÊMES
 * primitives Cladd et la même composition — logo, groupe creusé, onglets dont
 * seul l'actif porte son étiquette, dépôt en accent, réglages — de sorte que ce
 * qui est montré reste vrai même s'il n'est pas branché.
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
 * Sur une page dont l'argument entier est l'exactitude d'une mesure, un jeu de
 * démonstration dont les totaux ne tombent pas juste est une faute. Ceux-ci se
 * recoupent, à l'euro :
 *
 *   durable   23 300 + 16 700 + 12 600 + 8 600 + 9 000 = 70 200, sur 180 000
 *             d'achats, soit 39,0 %.
 *   bio       18 400 + 4 200 + 10 100 + 5 100 + 0 = 37 800, soit 21,0 %.
 *   viande    41 800 + 19 400 = 61 200 d'achats, dont 16 700 + 9 000 = 25 700
 *   et poisson  de durable, soit 42,0 %.
 *
 * Les familles listées pèsent 162 800 ; les 17 200 restants — boissons,
 * épicerie appertisée, divers — n'apportent rien au barème et ne sont pas
 * montrés, faute de place sur l'écran.
 *
 * La cantine n'est PAS conforme, et c'est délibéré : trois jauges vertes
 * vendraient le produit sur un mensonge et ne diraient rien de ce qu'il sert
 * à faire.
 */
const ACHATS = 180_000;
const VIANDE_POISSON = 61_200;

const TAUX = [
	{ titre: 'Produits durables', mesure: 0.39, seuil: 0.5, base: ACHATS },
	{ titre: 'dont bio', mesure: 0.21, seuil: 0.2, base: ACHATS },
	{ titre: 'Viande et poisson', mesure: 0.42, seuil: 0.6, base: VIANDE_POISSON }
] as const;

const FAMILLES_DEMO: LigneFamille[] = [
	{ family: 'FRUITS_LEGUMES', totalHT: 47_300, durableHT: 23_300, bioHT: 18_400 },
	{ family: 'VIANDE', totalHT: 41_800, durableHT: 16_700, bioHT: 4_200 },
	{ family: 'EPICERIE_SECHE', totalHT: 32_400, durableHT: 12_600, bioHT: 10_100 },
	{ family: 'LAITIERS', totalHT: 21_900, durableHT: 8_600, bioHT: 5_100 },
	{ family: 'POISSON', totalHT: 19_400, durableHT: 9_000, bioHT: 0 }
];

const ONGLETS = [
	{ label: 'Mes taux', Icone: GaugeIcon, actif: true },
	{ label: 'À confirmer', Icone: CheckCheckIcon, actif: false },
	{ label: 'Produits', Icone: FileTextIcon, actif: false },
	{ label: 'Bilans', Icone: FileCheck2Icon, actif: false }
] as const;

function BarreFigee() {
	return (
		<header className="shrink-0 border-b border-cladd-bg-outline">
			<div className="flex items-center gap-cladd-2xs px-cladd-3xs py-2">
				<span className="flex shrink-0 items-center gap-cladd-3xs">
					<LogoLetikette className="size-cladd-md shrink-0" />
					<MotLetikette />
				</span>

				<SurfaceCut outline className="mx-auto rounded-full" contentClassName="p-1">
					<Segmented activeColor="neutral" activeVariant="solid">
						{ONGLETS.map(({ label, Icone, actif }) => (
							<SegmentedButton key={label} active={actif} className="min-w-cladd-md">
								<Icone />
								{actif ? <span>{label}</span> : null}
								{label === 'À confirmer' ? (
									<Chip size="sm" color="brand">
										14
									</Chip>
								) : null}
							</SegmentedButton>
						))}
					</Segmented>
				</SurfaceCut>

				<div className="ml-auto flex shrink-0 items-center gap-cladd-3xs">
					<SearchField
						value=""
						onChange={() => undefined}
						placeholder="Rechercher un produit"
						className="w-64"
					/>
					<Button color="brand" variant="solid-fill" rounded className="min-w-cladd-md">
						<CameraIcon />
						<span>Déposer</span>
					</Button>
					<Button rounded>
						Cantine des Grands Champs
						<ChevronsUpDownIcon />
					</Button>
					<Button rounded square variant="transparent">
						<SettingsIcon />
					</Button>
				</div>
			</div>
		</header>
	);
}

export function ApercuApplication() {
	return (
		<div className="light cladd-color-brand flex size-full flex-col bg-cladd-bg text-cladd-fg">
			<BarreFigee />

			<div className="flex min-h-0 flex-1 flex-col gap-cladd-2xs p-cladd-2xs">
				<div className="flex items-end justify-between gap-cladd-2xs">
					<div className="flex flex-col gap-1">
						<h2 className="text-letikette-titre leading-tight font-bold tracking-tight">
							Vos taux EGalim
						</h2>
						<p className="text-cladd-xs text-cladd-fg-soft">
							Exercice 2025, à déclarer avant le 31 mars. 1 842 lignes lues, 7 fournisseurs, 180 000
							€ d’achats.
						</p>
					</div>
					<Segmented activeColor="neutral" activeVariant="solid">
						<SegmentedButton>2023</SegmentedButton>
						<SegmentedButton>2024</SegmentedButton>
						<SegmentedButton active>2025</SegmentedButton>
					</Segmented>
				</div>

				<div className="grid grid-cols-3 gap-cladd-2xs">
					{TAUX.map((t) => (
						<TauxEGalim
							key={t.titre}
							titre={t.titre}
							mesure={t.mesure}
							seuil={t.seuil}
							ecartEuros={Math.max(0, Math.round((t.seuil - t.mesure) * t.base))}
						/>
					))}
				</div>

				{/* La répartition déborde du bas de l'écran, et c'est voulu : une page
				    qui s'arrête pile au bord du cadre a l'air d'une affiche, pas d'une
				    application. Coupée, elle dit qu'il y a une suite. */}
				<div className="min-h-0 flex-1 overflow-hidden">
					<Repartition lignes={FAMILLES_DEMO} />
				</div>
			</div>
		</div>
	);
}
