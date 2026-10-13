import type { ReactNode } from 'react';
import { CheckIcon, ChevronLeftIcon } from 'lucide-react';
import { BoutonTexte } from './bouton';
import { cn } from './cn';
import { VignetteIcone } from './familles';
import { Fond } from './fond';
import { BoutonRond, JaugeDEtapes, PiedDePleinEcran } from './plein-ecran';

/**
 * LES PREMIERS PAS — la coquille des écrans qu'un nouveau compte traverse avant
 * d'entrer (13/10/2026, `docs/superpowers/specs/2026-10-13-premiers-pas.md`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE LES MEILLEURES ARRIVÉES ONT EN COMMUN (relevé Mobbin du 13/10)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   · UNE QUESTION PAR ÉCRAN, un grand titre aligné à gauche et le bouton sous
 *     le pouce : Revolut Business, Monzo, Copilot ;
 *   · une JAUGE en traits, qui dit combien il en reste : QuickBooks, Evernote ;
 *   · « Plus tard » en haut à droite, en texte : on n'est jamais coincé dans un
 *     parcours (Mercury, « Skip for now » chez QuickBooks) ;
 *   · le retour rond à gauche, quand revenir a un sens.
 *
 * ⚠️ UNE PAGE, PAS UNE FEUILLE. Ces écrans s'ouvrent avant que l'application
 * n'existe pour ce compte : ils portent leur propre fond (comme `CadreAuth`), et
 * ce qui défile est la page entière.
 *
 * ⚠️ L'ÉTAPE ENTRE PAR LA DROITE (`.premiers-pas-etape`, app.css) : le contenu
 * avance avec le doigt, comme une page poussée. Rien ne bouge sous
 * `prefers-reduced-motion`.
 */
export interface ProgressionPremiersPas {
	/** Le rang de l'étape, à partir de zéro. */
	readonly rang: number;
	readonly total: number;
	/** Revenir à l'étape d'avant ; absent quand revenir n'a pas de sens. */
	readonly onRetour?: () => void;
	/** Passer l'étape ; absent quand elle est nécessaire (l'entreprise). */
	readonly onPlusTard?: () => void;
}

export function CadrePremiersPas({
	progression,
	cle,
	pied,
	children
}: {
	readonly progression: ProgressionPremiersPas;
	/** Ce qui identifie l'étape : son changement rejoue l'entrée. */
	readonly cle: string;
	/** Le bas collant : le seul bouton plein, et ce qui l'accompagne. */
	readonly pied?: ReactNode;
	readonly children: ReactNode;
}) {
	const { rang, total, onRetour, onPlusTard } = progression;
	return (
		<div className="relative flex min-h-dvh flex-col">
			<Fond />
			<div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-cladd-2xs">
				<div className="sticky top-0 z-20 -mx-cladd-2xs flex items-center gap-cladd-3xs px-cladd-2xs pt-barre-app pb-cladd-3xs">
					{onRetour === undefined ? (
						<span className="size-9 shrink-0" aria-hidden />
					) : (
						<BoutonRond libelle="Revenir à l’étape précédente" onClick={onRetour}>
							<ChevronLeftIcon />
						</BoutonRond>
					)}
					<div className="flex-1">
						<JaugeDEtapes total={total} courante={rang} />
						<span className="sr-only">
							Étape {rang + 1} sur {total}
						</span>
					</div>
					{onPlusTard === undefined ? (
						<span className="size-9 shrink-0" aria-hidden />
					) : (
						<BoutonTexte className="shrink-0" onClick={onPlusTard}>
							Plus tard
						</BoutonTexte>
					)}
				</div>

				<div
					key={cle}
					className="premiers-pas-etape flex flex-1 flex-col gap-cladd-xs pt-cladd-2xs pb-cladd-sm"
				>
					{children}
				</div>

				{pied === undefined || pied === null ? null : <PiedDePleinEcran>{pied}</PiedDePleinEcran>}
			</div>
		</div>
	);
}

/**
 * LE HAUT D'UNE ÉTAPE : Plume s'il parle, le titre, puis une phrase.
 *
 * Aligné à gauche et nettement plus gros que le corps, comme les écrans d'entrée
 * (`CadreAuth`) : c'est l'écart d'échelle qui fait qu'une question se lit en une
 * seconde.
 */
export function EnTeteDEtape({
	titre,
	explication,
	personnage,
	centre = false
}: {
	readonly titre: string;
	readonly explication?: ReactNode;
	/** Plume, quand c'est lui qui parle. */
	readonly personnage?: ReactNode;
	/** Centré : la dernière étape, celle qu'on contemple au lieu de remplir. */
	readonly centre?: boolean;
}) {
	return (
		<div className={cn('flex flex-col gap-1.5', centre && 'items-center text-center')}>
			{personnage === undefined ? null : <div className="pb-cladd-3xs">{personnage}</div>}
			<h1 className="text-letikette-titre leading-tight font-bold tracking-tight">{titre}</h1>
			{explication === undefined ? null : (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{explication}</p>
			)}
		</div>
	);
}

/**
 * UNE PROMESSE EN UNE LIGNE : une vignette, un titre, une précision.
 *
 * La forme des écrans qui rassurent avant de demander : « Connect effortlessly,
 * Your data belongs to you » chez Cleo (Plaid), les trois lignes d'Apple Santé,
 * celles de Google Photos. Chaque ligne est un FAIT du produit, vérifiable dans
 * le code : jamais « de bout en bout », jamais « personne d'autre que vous ».
 */
export function ListeDePromesses({
	titre,
	promesses
}: {
	readonly titre?: string;
	readonly promesses: readonly {
		readonly icone: ReactNode;
		readonly titre: string;
		readonly precision?: string;
	}[];
}) {
	return (
		<section className="verre-carte flex flex-col gap-cladd-2xs rounded-cladd-xl p-cladd-2xs">
			{titre === undefined ? null : (
				<h2 className="text-cladd-2xs font-semibold text-cladd-fg-soft">{titre}</h2>
			)}
			<ul className="flex flex-col gap-cladd-2xs">
				{promesses.map((promesse) => (
					<li key={promesse.titre} className="flex items-start gap-cladd-3xs">
						<VignetteIcone icone={promesse.icone} />
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="text-cladd-xs leading-snug font-medium">{promesse.titre}</span>
							{promesse.precision === undefined ? null : (
								<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
									{promesse.precision}
								</span>
							)}
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}

/**
 * CE QUE VERRA VOTRE CLIENT — l'aperçu de la lettre, rempli au fil de la frappe.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE MOTIF D'ACCTUAL ET DE QUICKBOOKS (« Now, preview what your customer
 * will see ») : on remplit mieux un champ quand on voit où il s'imprime.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ AUCUN TEXTE INVENTÉ DANS LE CORPS. Le corps d'une vraie lettre dépend du
 * dossier ; ici, des traits gris en tiennent la place. Seul ce que le gérant a
 * saisi s'écrit en clair, et ce qui manque se dit en estompé, à sa place.
 *
 * Elle est `aria-hidden` : les champs à côté portent déjà tout ce qu'elle montre.
 */
export function ApercuDeLettre({
	denomination,
	adresse,
	signataireNom,
	signataireQualite,
	email,
	iban
}: {
	readonly denomination: string;
	readonly adresse?: string;
	readonly signataireNom: string;
	readonly signataireQualite: string;
	readonly email: string;
	readonly iban: string;
}) {
	const manque = (texte: string, attendu: string) =>
		texte.trim() === '' ? (
			<span className="text-cladd-fg-softest italic">{attendu}</span>
		) : (
			<span>{texte}</span>
		);
	return (
		<figure aria-hidden className="flex flex-col gap-1.5">
			<figcaption className="px-1 text-cladd-2xs font-semibold text-cladd-fg-soft">
				Ce que verra votre client
			</figcaption>
			<div className="flex flex-col gap-cladd-2xs rounded-cladd-lg bg-white p-cladd-2xs text-neutral-900 shadow-sm ring-1 ring-black/5">
				<div className="flex flex-col gap-0.5">
					<span className="text-cladd-2xs font-semibold">{denomination}</span>
					{adresse === undefined ? null : (
						<span className="text-cladd-3xs text-neutral-500">{adresse}</span>
					)}
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="h-1.5 w-2/5 rounded-full bg-neutral-200" />
					<span className="h-1.5 w-full rounded-full bg-neutral-100" />
					<span className="h-1.5 w-11/12 rounded-full bg-neutral-100" />
					<span className="h-1.5 w-3/4 rounded-full bg-neutral-100" />
				</div>
				<div className="flex flex-col gap-0.5 self-end text-right text-cladd-3xs">
					<span className="font-semibold">{manque(signataireNom, 'Qui signe')}</span>
					{manque(signataireQualite, 'Sa fonction')}
				</div>
				<div className="flex flex-col gap-0.5 border-t border-neutral-200 pt-1.5 text-cladd-3xs text-neutral-600">
					<span>Pour régler : {manque(iban, 'votre IBAN')}</span>
					<span>Pour répondre : {manque(email, 'votre adresse')}</span>
				</div>
			</div>
		</figure>
	);
}

/**
 * UNE LIGNE DU RÉSUMÉ FINAL : coché quand c'est en place, un rond vide sinon.
 *
 * Le dernier écran de Stoic, de Nibble ou de Discord (« 3 of 3 steps ») : ce qui
 * est prêt se coche, et ce qui reste se dit sans reproche — « quand vous
 * voudrez ». ⚠️ La coche est à l'encre : le vert ne dit que « au-dessus du seuil ».
 */
export function ResumeDesPremiersPas({
	lignes
}: {
	readonly lignes: readonly {
		readonly cle: string;
		readonly titre: string;
		readonly ligne: string;
		readonly fait: boolean;
	}[];
}) {
	return (
		<ul className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
			{lignes.map((ligne) => (
				<li key={ligne.cle} className="flex min-h-14 items-center gap-cladd-3xs px-3.5 py-2.5">
					{ligne.fait ? (
						<span className="pilule-principale flex size-6 shrink-0 items-center justify-center rounded-full">
							<CheckIcon size={14} strokeWidth={3} aria-hidden />
						</span>
					) : (
						<span
							className="size-6 shrink-0 rounded-full border-2 border-cladd-fg-softest"
							aria-hidden
						/>
					)}
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="text-cladd-xs font-medium">
							{ligne.titre}
							<span className="sr-only">{ligne.fait ? ', en place' : ', à faire'}</span>
						</span>
						<span className="text-cladd-2xs text-cladd-fg-soft">{ligne.ligne}</span>
					</div>
				</li>
			))}
		</ul>
	);
}
