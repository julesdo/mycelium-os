import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { BuildingIcon, CheckIcon } from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { cn } from '../ui';

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
 */
export function SelecteurEtablissement({ deplie }: { deplie: boolean }) {
	const orgs = useQuery(api.organizations.listMyOrganizations, {});
	const courante = useQuery(api.organizations.getMyOrg, {});
	const basculer = useMutation(api.organizations.switchOrganization);
	const [ouvert, setOuvert] = useState(false);

	if (!orgs || orgs.length < 2 || !courante) return null;

	const initiales = (nom: string) =>
		nom
			.split(/\s+/)
			.slice(0, 2)
			.map((m) => m[0] ?? '')
			.join('')
			.toUpperCase();

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOuvert((o) => !o)}
				aria-expanded={ouvert}
				aria-label={`Établissement : ${courante.name}. Changer d'établissement`}
				className={cn(
					'flex min-h-cladd-lg w-full items-center gap-cladd-3xs rounded-cladd-md border border-cladd-outline px-cladd-3xs text-left transition-colors hover:bg-cladd-surface',
					!deplie && 'justify-center px-0'
				)}
			>
				<span className="flex size-cladd-xs shrink-0 items-center justify-center rounded-cladd-sm bg-cladd-surface-plus text-cladd-3xs font-bold">
					{initiales(courante.name ?? '')}
				</span>
				{deplie ? (
					<span className="min-w-0 flex-1 truncate text-cladd-2xs font-medium">
						{courante.name}
					</span>
				) : (
					<span className="sr-only">{courante.name}</span>
				)}
			</button>

			{ouvert ? (
				<ul className="absolute top-full left-0 z-50 mt-1 flex w-64 flex-col overflow-hidden rounded-cladd-md border border-cladd-outline bg-cladd-surface shadow-cladd-popover">
					{orgs.map((o) => (
						<li key={o._id}>
							<button
								type="button"
								onClick={() => {
									setOuvert(false);
									if (o._id !== courante._id) {
										void basculer({ organizationId: o._id as Id<'organizations'> });
									}
								}}
								className="flex min-h-cladd-lg w-full items-center gap-cladd-3xs px-cladd-3xs text-left text-cladd-xs hover:bg-cladd-surface-plus"
							>
								<BuildingIcon size={16} className="shrink-0 text-cladd-fg-softer" />
								<span className="min-w-0 flex-1 truncate">{o.name}</span>
								{o._id === courante._id ? <CheckIcon size={16} className="shrink-0" /> : null}
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
