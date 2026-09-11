import type { ReactNode } from 'react';
import { cn } from './cn';
import { Fond } from './fond';
import { LogoLetikette, MotLetikette } from './logo';

/**
 * LE CADRE DES ÉCRANS D'ENTRÉE — connexion, inscription, mot de passe.
 *
 * C'est le PREMIER écran du produit, et souvent le seul qu'un prospect voie
 * avant de décider s'il a affaire à un logiciel sérieux.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA CARTE A DISPARU, ET C'EST LA CORRECTION PRINCIPALE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La version précédente posait le formulaire dans une carte opaque, centrée,
 * avec son titre centré dedans. C'était juste sur le fond clair d'origine ;
 * sur le fond sombre animé, c'est un rectangle gris posé au milieu de l'écran,
 * qui masque précisément ce qui donne au produit son allure.
 *
 * La référence ne met jamais de carte sur ses écrans d'entrée. Le contenu est
 * posé DIRECTEMENT sur le fond : un titre gras aligné à gauche, une ligne
 * d'explication, les champs, puis l'action en bas. Rien ne l'encadre. C'est
 * aussi ce qui rend l'écran identique du téléphone au bureau — une carte, elle,
 * doit choisir une largeur et se trompe forcément sur l'un des deux.
 *
 * ⚠️ ET LE FOND EST RENDU ICI. Ces écrans ne passent pas par la coquille de
 * l'application — ils n'ont ni barre ni navigation — donc personne ne peignait
 * le drapé derrière eux. Ils étaient restés sur un aplat noir, c'est-à-dire le
 * seul endroit du produit où le verre n'avait rien à réfracter.
 *
 * ⚠️ L'ACTION PRINCIPALE N'EST PAS DANS CE COMPOSANT, et c'est voulu : elle
 * appartient au formulaire, qui seul sait s'il est valide et s'il est en cours
 * d'envoi. On se contente de lui donner sa place, en bas, pleine largeur.
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
	/** Les liens secondaires, sous le contenu. */
	pied?: ReactNode;
	/**
	 * Élargit la colonne à 560px. Réservé au seul écran qui pose un choix parmi
	 * six — un groupe de bascules à 420px se casse en quatre lignes, et le
	 * gérant ne voit plus les options comme un ensemble.
	 */
	large?: boolean;
}) {
	return (
		<div className="relative flex min-h-dvh flex-col">
			<Fond />

			{/*
			  La marque en haut à gauche, pas centrée au-dessus d'une carte. Sur un
			  écran d'entrée, un logotype centré au milieu de la page lit « page de
			  garde » ; posé en tête de colonne, il lit « application ».
			*/}
			<div className="flex shrink-0 items-center gap-cladd-3xs px-cladd-3xs pt-cladd-2xs">
				<LogoLetikette className="size-11 shrink-0" />
				<MotLetikette />
			</div>

			{/*
			  `justify-center` sur grand écran seulement. Sur téléphone, le contenu
			  part du haut : centré verticalement, il saute dès que le clavier
			  logiciel s'ouvre et réduit la hauteur visible de moitié — un défaut
			  qu'on ne voit jamais sur un ordinateur.
			*/}
			<div className="flex flex-1 flex-col px-cladd-3xs py-cladd-2xs sm:justify-center">
				<div
					className={cn(
						'mx-auto flex w-full flex-col gap-cladd-2xs',
						large ? 'max-w-140' : 'max-w-105'
					)}
				>
					<div className="flex flex-col gap-1.5">
						{/* Aligné à gauche et nettement plus gros que le corps : c'est
						    l'écart d'échelle qui fait qu'un écran d'entrée se lit en une
						    seconde. Centré, comme avant, il se confondait avec sa légende. */}
						<h1 className="text-letikette-titre leading-tight font-bold tracking-tight">
							{titre}
						</h1>
						{explication ? (
							<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{explication}</p>
						) : null}
					</div>

					{children}

					{pied ? (
						<div className="flex flex-col gap-1.5 text-cladd-2xs text-cladd-fg-softer">{pied}</div>
					) : null}
				</div>
			</div>
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
		<p role="alert" className="cladd-color-red text-cladd-2xs leading-snug text-cladd-primary">
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
 *
 * Le champ lui-même est en verre, et il l'est sans que ce composant ait à le
 * demander : la bascule se fait une fois pour tout le produit, dans `app.css`.
 * Voir la note sur `.cladd-input` là-bas, qui explique pourquoi elle ne peut
 * pas passer par une `className`.
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
		<label className="flex flex-col gap-1.5">
			<span className="text-cladd-2xs font-semibold text-cladd-fg-soft">{etiquette}</span>
			{children}
			{aide ? <span className="text-cladd-3xs text-cladd-fg-softer">{aide}</span> : null}
		</label>
	);
}
