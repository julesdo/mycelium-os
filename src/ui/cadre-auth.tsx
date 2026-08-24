import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import { cn } from './cn';
import { LogoLetikette } from './logo';

/**
 * Le cadre des écrans d'entrée — connexion, inscription, mot de passe.
 *
 * C'est le PREMIER écran du produit, et souvent le seul qu'un prospect voie
 * avant de décider s'il a affaire à un logiciel sérieux. La version précédente
 * y posait un formulaire nu, centré sur une page blanche, sans marque : elle
 * se lisait comme une page d'authentification de développeur.
 *
 * Trois choses, et pas une de plus : la marque en tête, le formulaire dans une
 * carte posée sur le fond chaud — la même grammaire que tout le reste du
 * produit — et les liens secondaires en dehors de la carte, pour qu'ils ne
 * disputent jamais l'attention au bouton principal.
 *
 * La largeur est bornée à ~420px. Un champ de saisie plus large ne se remplit
 * pas plus vite, et une carte qui s'étale sur un écran de bureau perd
 * exactement ce qui fait qu'on la lit : sa densité.
 */
export function CadreAuth({
	titre,
	explication,
	children,
	pied,
	large = false
}: {
	titre: string;
	explication?: string;
	children: ReactNode;
	/** Les liens secondaires. En dehors de la carte, sous elle. */
	pied?: ReactNode;
	/**
	 * Élargit la carte à 560px. Réservé au seul écran qui pose un choix parmi
	 * six — un groupe de bascules à 420px se casse en quatre lignes, et le
	 * gérant ne voit plus les options comme un ensemble.
	 */
	large?: boolean;
}) {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-3xs">
			<div className="flex items-center gap-cladd-3xs">
				<span className="cladd-color-brand flex size-11 items-center justify-center rounded-full bg-cladd-primary text-cladd-on-primary">
					<LogoLetikette className="h-4 w-auto" />
				</span>
				<span className="text-cladd-md font-semibold tracking-tight">Letikette</span>
			</div>

			<Surface
				outline
				className={cn('w-full rounded-cladd-2xl shadow-carte', large ? 'max-w-140' : 'max-w-105')}
				contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
			>
				<div className="flex flex-col gap-1">
					<h1 className="text-letikette-titre leading-tight font-bold tracking-tight">{titre}</h1>
					{explication ? (
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{explication}</p>
					) : null}
				</div>

				{children}
			</Surface>

			{pied ? (
				<div className="flex flex-col items-center gap-1 text-center text-cladd-2xs text-cladd-fg-softer">
					{pied}
				</div>
			) : null}
		</div>
	);
}

/**
 * Un message d'erreur de formulaire.
 *
 * Il emprunte l'accent `red` du kit, jamais `--color-seuil-manque`. Les trois
 * couleurs de seuil ne disent qu'une chose dans tout le produit — au-dessus, à
 * la limite, en dessous — et un mot de passe refusé n'est pas un taux qui
 * manque. Deux rouges différents à l'écran ne se voient pas côte à côte : ils
 * ne se croisent jamais.
 */
export function MessageErreur({ children }: { children: ReactNode }) {
	return (
		<p
			role="alert"
			className="cladd-color-red text-cladd-2xs leading-snug text-cladd-primary"
		>
			{children}
		</p>
	);
}

/**
 * Un champ étiqueté.
 *
 * L'étiquette est au-dessus et toujours visible, jamais en simple `placeholder`
 * qui disparaît à la première frappe : sur un formulaire à trois champs, un
 * gérant qui revient corriger le deuxième ne doit pas avoir à le vider pour
 * savoir ce qu'on lui demandait.
 */
export function Champ({
	etiquette,
	aide,
	children
}: {
	etiquette: string;
	aide?: string;
	children: ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-cladd-2xs font-semibold text-cladd-fg-soft">{etiquette}</span>
			{children}
			{aide ? <span className="text-cladd-3xs text-cladd-fg-softer">{aide}</span> : null}
		</label>
	);
}
