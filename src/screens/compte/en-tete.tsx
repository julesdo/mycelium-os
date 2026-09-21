import {
	List,
	ListButton,
	ListTitle,
	Popover,
	PopoverClose,
	PopoverRoot,
	PopoverTrigger,
	Surface,
	Toolbar,
	ToolbarButton
} from '@cladd-ui/react';
import { BuildingIcon, CheckIcon, ChevronDownIcon, LogOutIcon } from 'lucide-react';
import { Avatar, sirenLisible } from '../../ui';
import type { IdentiteDuCreancier } from './presse';

/**
 * L'EN-TÊTE D'IDENTITÉ — SUR QUEL ÉTABLISSEMENT ON TRAVAILLE, ET COMMENT ON EN
 * SORT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL EXISTE PARCE QUE DEUX GESTES ÉTAIENT TOMBÉS AU FOND DE LA PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La déconnexion vivait dans « Affichage et session », DERNIÈRE section d'une
 * page qui empilait deux formulaires, deux listes, un inventaire, deux
 * effacements et un carnet : sortir de l'application demandait de faire défiler
 * tout ce qu'on n'était pas venu lire. Et le changement d'établissement n'était
 * pas sur cette page du tout — il vit dans la `Toolbar` de la file — donc il
 * coûtait trois gestes depuis ici : revenir à l'accueil, ouvrir le sélecteur,
 * choisir.
 *
 * Les deux sont maintenant des PILULES posées sous l'identité, en tête de page,
 * visibles sans défiler : deux gestes au maximum, l'un et l'autre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL NE CONNAÎT NI CONVEX NI LE ROUTEUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `SelecteurEtablissement` (`src/app/`) fait le même travail dans la barre de
 * la file, et il interroge Convex lui-même — ce qui le rend impossible à rendre
 * dans la salle d'exposition, sans backend ni session. Celui-ci reçoit sa liste
 * et sa bascule en props : c'est la condition pour que l'écran entier se
 * REGARDE aux quatre largeurs avant d'être déclaré fini.
 *
 * ⚠️ LE MENU NE S'OUVRE QUE S'IL Y A DE QUOI CHOISIR, et l'identité s'affiche
 * quand même. Un compte mono-site n'a pas de choix à faire ; il a tout de même
 * besoin de lire sur quoi il travaille, parce que tout ce que la page règle est
 * cloisonné par établissement.
 */
export interface EnTeteDuCompteAffiche {
	/** L'identité du créancier, ou `null` sans établissement actif. */
	readonly identite: IdentiteDuCreancier | null;
	/** Le logo de l'établissement, ou `null` : ses initiales en tiennent lieu. */
	readonly logoUrl: string | null;
	/** Les établissements joignables, dans l'ordre où le serveur les rend. */
	readonly etablissements: readonly { readonly id: string; readonly nom: string }[];
	readonly courantId: string | null;
	readonly onBasculer: (id: string) => void;
	readonly onSeDeconnecter: () => void;
}

export function EnTeteDuCompte({
	identite,
	logoUrl,
	etablissements,
	courantId,
	onBasculer,
	onSeDeconnecter
}: EnTeteDuCompteAffiche) {
	const nom = identite?.nom ?? 'Aucun établissement';
	const plusieurs = etablissements.length > 1;

	return (
		<Surface
			as="header"
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
		>
			<div className="flex items-center gap-cladd-2xs">
				{/* Les initiales du produit, la même pastille que la barre de la file :
				    deux marques d'identité qui ne se ressemblent que « presque » se
				    lisent comme deux natures différentes. */}
				<Avatar nom={identite?.nom} image={logoUrl === null ? null : { url: logoUrl }} />

				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-cladd-md leading-tight font-bold tracking-tight">
						{nom}
					</span>
					{/*
					  ⚠️ LE SIREN EST LA SECONDE LIGNE, ET SON ABSENCE AUSSI. C'est le
					  numéro qui s'imprime en tête de chaque décompte : un établissement
					  qui n'en porte pas produit des décomptes incomplets sans qu'aucune
					  alerte n'apparaisse ailleurs. Dit ici, sous le nom, il se lit avant
					  qu'on ait touché à quoi que ce soit.
					*/}
					{/*
					  ⚠️ LE NUMÉRO EST NOMMÉ ET GROUPÉ, PAS JETÉ NU. « 502592959 » sous un
					  nom d'entreprise ne se lit ni comme un SIREN ni comme autre chose ;
					  `sirenLisible` est le groupement que le reste du produit emploie
					  déjà — on ne s'en invente pas un second.
					*/}
					<span className="truncate text-cladd-2xs text-cladd-fg-softer">
						{identite === null
							? 'La coquille de l’application vous ramènera à la création d’un établissement.'
							: identite.siren === null
								? 'SIREN non renseigné'
								: `SIREN ${sirenLisible(identite.siren)}`}
					</span>
				</span>
			</div>

			{/*
			  ⚠️ UNE `Toolbar`, PAS UNE RANGÉE DE `<div>`. Le kit propage sa taille à
			  ses enfants et tient le rythme de la rangée ; une rangée montée à la
			  main le reperd au premier bouton ajouté.

			  ⚠️ MAIS SA COQUILLE SE DISSOUT, ET C'EST UNE CORRECTION DU REGARD. Par
			  défaut la `Toolbar` peint une pilule en dégradé avec son anneau : dans
			  une carte qui en a déjà un, elle dessinait un grand bloc clair pleine
			  largeur, au centre duquel flottait un bouton de 142 px. À 375 px, le
			  geste le plus visible de la page devenait « Se déconnecter » — mesuré
			  au navigateur. `transparent` + `outline={false}` ne laisse que les
			  boutons, ce que la doc du kit appelle exactement ce cas.
			*/}
			<Toolbar
				variant="transparent"
				outline={false}
				contentClassName="flex flex-wrap items-center justify-start gap-cladd-3xs p-0"
			>
				{plusieurs ? (
					<PopoverRoot>
						<PopoverTrigger>
							{/* ⚠️ `verre` PORTE LE VERRE AU REPOS, `verre-bouton` SEULEMENT SON
							    SURVOL. Posée seule, la seconde ne dessine rien : mesuré au
							    navigateur, la pilule n'avait ni fond, ni arête, ni ombre — un
							    libellé nu au milieu d'une carte. */}
							<ToolbarButton rounded hoverable={false} className="verre verre-bouton">
								<BuildingIcon />
								Changer d’établissement
								<ChevronDownIcon />
							</ToolbarButton>
						</PopoverTrigger>
						<Popover className="w-72" offset={8}>
							<List>
								<ListTitle>Vos établissements</ListTitle>
								{etablissements.map((etablissement) => (
									<PopoverClose key={etablissement.id}>
										<ListButton
											size="md"
											icon={<BuildingIcon />}
											selected={etablissement.id === courantId}
											after={etablissement.id === courantId ? <CheckIcon /> : undefined}
											onClick={() => {
												// Basculer sur celui qu'on regarde déjà rejouerait une
												// mutation pour rien, et referait défiler la page.
												if (etablissement.id !== courantId) onBasculer(etablissement.id);
											}}
										>
											{etablissement.nom}
										</ListButton>
									</PopoverClose>
								))}
							</List>
						</Popover>
					</PopoverRoot>
				) : null}

				<ToolbarButton
					rounded
					hoverable={false}
					className="verre verre-bouton"
					onClick={onSeDeconnecter}
				>
					<LogOutIcon />
					Se déconnecter
				</ToolbarButton>
			</Toolbar>
		</Surface>
	);
}
