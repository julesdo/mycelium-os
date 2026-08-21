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
 * Le sélecteur d'établissement.
 *
 * Il ne s'affiche que si le gérant en administre plusieurs. Sur un compte
 * mono-site — le cas de la grande majorité — un sélecteur à une seule entrée
 * n'est pas un choix, c'est du bruit qui occupe la place de la navigation.
 *
 * Quand il s'affiche, en revanche, il est **toujours visible** : toutes les
 * données de l'écran sont cloisonnées par établissement, et confondre deux
 * cantines fait déclarer un chiffre pour l'autre. Un gérant doit pouvoir lire
 * en permanence, sans cliquer, sur laquelle il travaille.
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

	if (!orgs || orgs.length < 2 || !courante) return null;

	const initiales = (nom: string) =>
		nom
			.split(/\s+/)
			.slice(0, 2)
			.map((m) => m[0] ?? '')
			.join('')
			.toUpperCase();

	return (
		<PopoverRoot>
			<PopoverTrigger>
				<Button
					rounded
					aria-label={`Établissement : ${courante.name}. Changer d'établissement`}
					className="max-w-48"
				>
					<span className="text-cladd-2xs font-bold">{initiales(courante.name ?? '')}</span>
					<span className="hidden min-w-0 truncate lg:inline">{courante.name}</span>
					<ChevronDownIcon />
				</Button>
			</PopoverTrigger>

			<Popover className="w-72" offset={8} position="bottom-end">
				<List>
					<ListTitle>Vos établissements</ListTitle>
					{orgs.map((o) => (
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
