import { Link, useRouterState, CatchBoundary } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import {
	CameraIcon,
	GaugeIcon,
	CheckCheckIcon,
	FileTextIcon,
	FileCheck2Icon,
	PanelLeftIcon,
	SettingsIcon
} from 'lucide-react';
import { cn } from '../ui/cn';
import { LogoMycelium } from '../ui/logo';
import { SelecteurEtablissement } from './selecteur-etablissement';

const ENTREES = [
	{ to: '/app', label: 'Pilotage', Icone: GaugeIcon },
	{ to: '/app/confirmer', label: 'À confirmer', Icone: CheckCheckIcon },
	{ to: '/app/factures', label: 'Factures', Icone: FileTextIcon },
	{ to: '/app/diagnostics', label: 'Diagnostics', Icone: FileCheck2Icon }
] as const;

/**
 * La navigation.
 *
 * Rail à gauche au-delà de 768px, barre basse en dessous. Le dépôt de
 * factures est l'action primaire et vit **au-dessus** de la navigation, pas
 * dedans : c'est la seule chose qu'un gérant vient faire sans y penser, et
 * elle ne doit jamais coûter plus d'un geste.
 */
export function Rail({ deplie, onBasculer }: { deplie: boolean; onBasculer: () => void }) {
	const chemin = useRouterState({ select: (s) => s.location.pathname });
	const actif = (to: string) => (to === '/app' ? chemin === '/app' : chemin.startsWith(to));

	return (
		<>
			<nav
				aria-label="Navigation principale"
				className={cn(
					'hidden shrink-0 flex-col gap-cladd-3xs border-r border-cladd-outline p-cladd-3xs md:flex',
					deplie ? 'w-rail-deplie' : 'w-rail'
				)}
			>
				{/*
				  La marque, en tête du rail.
				  `cladd-color-brand` sur le conteneur : c'est cette classe qui fait
				  résoudre `--cladd-primary` au bleu d'encre. Sans elle, le logo
				  hériterait du gris des surfaces neutres.
				*/}
				<Link
					to="/app"
					aria-label="Mycelium, retour au tableau de bord"
					className={cn(
						'cladd-color-brand flex min-h-cladd-lg items-center gap-cladd-3xs text-cladd-primary',
						deplie ? 'px-cladd-3xs' : 'justify-center'
					)}
				>
					<LogoMycelium className="h-5 w-auto shrink-0" />
					{deplie ? (
						<span className="text-cladd-sm font-semibold tracking-tight text-cladd-fg">
							Mycelium
						</span>
					) : null}
				</Link>

				{/*
				  Le sélecteur est isolé derrière sa propre frontière d'erreur.
				  Il interroge Convex, et cette requête lève quand la session
				  manque — au chargement, après une expiration, ou dans la salle
				  d'exposition qui rend la coquille sans authentification. Sans
				  cette isolation, un composant FACULTATIF (il ne s'affiche qu'aux
				  gérants multi-sites) emporte l'application entière et renvoie le
				  gérant sur un écran d'erreur. En cas d'échec il disparaît, et la
				  navigation continue de fonctionner.
				*/}
				<CatchBoundary getResetKey={() => 'selecteur'} errorComponent={() => null}>
					<SelecteurEtablissement deplie={deplie} />
				</CatchBoundary>

				<Button
					as={Link}
					to="/app/factures"
					color="brand"
					variant="solid-fill"
					square={!deplie}
					aria-label="Déposer des factures"
				>
					<CameraIcon />
					{deplie ? 'Déposer' : null}
				</Button>

				<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
					{ENTREES.map(({ to, label, Icone }) => (
						<Button
							key={to}
							as={Link}
							to={to}
							variant="gradient"
							pressed={actif(to)}
							square={!deplie}
							aria-label={label}
						>
							<Icone />
							{deplie ? label : null}
						</Button>
					))}
				</div>

				<div className="mt-auto flex flex-col gap-cladd-3xs">
					<Button
						as={Link}
						to="/app/parametres"
						variant="gradient"
						pressed={actif('/app/parametres')}
						square={!deplie}
						aria-label="Réglages"
					>
						<SettingsIcon />
						{deplie ? 'Réglages' : null}
					</Button>

					<Button
						onClick={onBasculer}
						variant="gradient"
						square={!deplie}
						aria-label={deplie ? 'Replier la navigation' : 'Déplier la navigation'}
					>
						<PanelLeftIcon />
						{deplie ? 'Replier' : null}
					</Button>
				</div>
			</nav>

			<nav
				aria-label="Navigation principale"
				className="fixed inset-x-0 bottom-0 z-40 flex justify-around gap-cladd-3xs border-t border-cladd-outline bg-cladd-bg p-cladd-3xs md:hidden"
			>
				{ENTREES.map(({ to, label, Icone }) => (
					<Button
						key={to}
						as={Link}
						to={to}
						variant="gradient"
						pressed={actif(to)}
						aria-label={label}
					>
						<Icone />
					</Button>
				))}
			</nav>
		</>
	);
}
