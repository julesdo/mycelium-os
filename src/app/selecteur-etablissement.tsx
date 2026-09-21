import { useQuery, useMutation } from 'convex/react';
import {
	Button,
	Popover,
	PopoverRoot,
	PopoverTrigger,
	PopoverClose,
	List,
	ListTitle,
	ListButton
} from '@cladd-ui/react';
import { BuildingIcon, CheckIcon, ChevronDownIcon } from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';

/**
 * L'établissement courant, et le moyen d'en changer.
 *
 * Il est TOUJOURS visible, y compris sur un compte mono-site. La version
 * précédente le masquait dans ce cas, au motif qu'un choix à une entrée n'est
 * pas un choix — c'est vrai du menu, faux de l'affichage. Toutes les données de
 * l'écran sont cloisonnées par établissement, et un gérant qui reprend sa
 * tablette après une réunion doit lire sur QUELLE cantine il travaille sans
 * avoir à cliquer. C'est aussi ce qui donne à la barre son ancrage à droite :
 * une identité, à la place où tout le monde la cherche.
 *
 * Le menu, lui, ne s'ouvre que s'il y a effectivement plusieurs établissements.
 *
 * Monté sur `Popover` + `List`, pas sur un `<ul>` positionné en absolu.
 * L'ancien assemblage à la main perdait tout ce qu'un menu doit avoir et qu'on
 * ne pense jamais à réécrire : le retournement quand il déborde du bas de
 * l'écran, la fermeture au clic extérieur et à Échap, le portail qui l'extrait
 * des conteneurs à `overflow: hidden`, le piège de focus. Sur une barre haute,
 * le premier de ces oublis suffit : le menu s'ouvrait sous le pli.
 */
export function SelecteurEtablissement() {
	const orgs = useQuery(api.organizations.listMyOrganizations, {});
	const courante = useQuery(api.organizations.getMyOrg, {});
	const basculer = useMutation(api.organizations.switchOrganization);

	if (!courante) return null;

	const initiales = (nom: string) =>
		nom
			.split(/\s+/)
			.slice(0, 2)
			.map((m) => m[0] ?? '')
			.join('')
			.toUpperCase();

	const plusieurs = (orgs?.length ?? 0) > 1;

	// La pastille d'initiales, dans la même géométrie que la marque à l'autre
	// bout de la barre : deux cercles pleins qui tiennent les extrémités.
	// Le logo de l'établissement quand il en a un ; ses initiales sinon.
	const pastille = courante.logoUrl ? (
		<img
			src={courante.logoUrl}
			alt=""
			aria-hidden
			className="size-8 shrink-0 rounded-full bg-cladd-surface-cut object-cover"
		/>
	) : (
		<span
			aria-hidden
			className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cladd-surface-cut text-cladd-3xs font-bold"
		>
			{initiales(courante.name ?? '')}
		</span>
	);

	/**
	 * ⚠️ LE NOM NE S'ÉCRIT PLUS À CÔTÉ DE LA PASTILLE, ET C'EST LA BASCULE QUI
	 * L'A RETIRÉ (T15).
	 *
	 * Il paraissait à partir de 1280 px, dans une barre qui faisait toute la
	 * largeur de l'écran. La `Toolbar` de la file, elle, vit dans la colonne de
	 * lecture de `PageEcran`, bornée à 640 px À TOUTES LES LARGEURS : le nom y
	 * ajoutait cent pixels et faisait sortir l'avatar — seule entrée de
	 * `/app/compte` — du champ visible, sans que rien à l'écran ne le dise.
	 * Mesuré au navigateur à 1280 px.
	 *
	 * L'établissement reste lisible sans un clic : ses initiales sont dessinées,
	 * son nom entier est dans le libellé accessible et dans la liste qui s'ouvre.
	 */
	if (!plusieurs) {
		return (
			<div
				aria-label={`Établissement : ${courante.name}`}
				className="flex items-center gap-cladd-3xs pr-1 pl-1"
			>
				{pastille}
			</div>
		);
	}

	return (
		<PopoverRoot>
			<PopoverTrigger>
				{/* Même retrait du nom, et même raison : la rangée est bornée à 640 px. */}
				<Button
					rounded
					aria-label={`Établissement : ${courante.name}. Changer d'établissement`}
					className="min-w-cladd-md shrink-0"
				>
					{pastille}
					<ChevronDownIcon />
				</Button>
			</PopoverTrigger>

			<Popover className="w-72" offset={8} position="bottom-end">
				<List>
					<ListTitle>Vos établissements</ListTitle>
					{(orgs ?? []).map((o) => (
						<PopoverClose key={o._id}>
							<ListButton
								size="md"
								icon={<BuildingIcon />}
								selected={o._id === courante._id}
								after={o._id === courante._id ? <CheckIcon /> : undefined}
								onClick={() => {
									if (o._id !== courante._id) {
										void basculer({ organizationId: o._id as Id<'organizations'> });
									}
								}}
							>
								{o.name}
							</ListButton>
						</PopoverClose>
					))}
				</List>
			</Popover>
		</PopoverRoot>
	);
}
