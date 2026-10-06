import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { tauxPenaliteParDefaut } from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { eurosCentimesCourts, tauxLisible } from '../ui/format';
import { cn } from '../ui';
import { articleDe } from './articles';
import { ancreDe } from './ancre';
import {
	Capture,
	Comparaison,
	CompteurIndemnites,
	DelaisParSecteur,
	Etape,
	Etapes,
	ExempleDecompte,
	PlancherContractuel,
	Source,
	TauxLegal,
	Valeur,
	BarresDeDelais,
	ExempleDelai,
	ExempleSignification,
	PlanEcheancier
} from './blog-illustrations';

/**
 * LES COMPOSANTS DES ARTICLES DU BLOG (06/10/2026).
 *
 * Deux familles. D'abord la mise en forme des éléments que le MDX produit
 * (intertitres, paragraphes, listes, citations, tableaux), dans la DA de la
 * page publique : serif pour les titres, encre sur crème, colonne de lecture.
 *
 * Ensuite les VALEURS DE LA LOI, en composants. ⚠️ C'EST LA RÈGLE LA PLUS
 * STRICTE DU PROJET, ET ELLE VAUT AUSSI POUR UN ARTICLE : aucune valeur
 * juridique ni aucun numéro d'article n'est tapé dans un fichier `.mdx`. On
 * écrit `<Indemnite />`, `<TauxDePenalites />`, `<DelaiPourAgir regime="TRANSPORT_MARCHANDISES" />`
 * ou `<ArticleDuCode de="indemnite" />`, et la valeur vient des paramètres,
 * avec leur source. Le jour où un taux change de semestre, l'article change
 * avec lui ; le jour où une valeur n'est plus relevée, il le dit au lieu de
 * publier un chiffre faux.
 */

// ─── Les valeurs de la loi ───────────────────────────────────────────────────

/** Le taux des pénalités de retard en vigueur aujourd'hui, à défaut de taux au contrat. */
function tauxDuJour(): string {
	try {
		return tauxLisible(tauxPenaliteParDefaut(new Date().toISOString().slice(0, 10)));
	} catch {
		// Un semestre absent de la série fait lever : on dit la règle plutôt qu'un nombre.
		return 'le taux de la BCE majoré de dix points';
	}
}

export function TauxDePenalites() {
	return <>{tauxDuJour()}</>;
}

/** L'indemnité forfaitaire pour frais de recouvrement, par facture. */
export function Indemnite() {
	const indemnite = PARAMETRES.indemniteForfaitaire;
	if (!estUtilisable(indemnite) || indemnite.valeur === null) {
		return <>des frais de recouvrement forfaitaires</>;
	}
	return <>{eurosCentimesCourts(indemnite.valeur)}</>;
}

type Regime = 'GENERAL' | 'TRANSPORT_MARCHANDISES' | 'CONSOMMATEUR';

/** Le délai pour agir en justice d'un régime de prescription, en années. */
export function DelaiPourAgir({ regime = 'GENERAL' }: { regime?: Regime }) {
	const annees = REGIMES_PRESCRIPTION[regime].dureeAnnees;
	return <>{`${annees} ${annees > 1 ? 'ans' : 'an'}`}</>;
}

/** Le point de départ du délai, tel que le relève le module de prescription. */
export function PointDeDepart({ regime = 'GENERAL' }: { regime?: Regime }) {
	return <>{REGIMES_PRESCRIPTION[regime].pointDeDepart}</>;
}

const SOURCES = {
	taux: PARAMETRES.tauxInteretLegalDefaut.source,
	indemnite: PARAMETRES.indemniteForfaitaire.source,
	'prescription-general': REGIMES_PRESCRIPTION.GENERAL.source,
	'prescription-transport': REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES.source,
	'prescription-consommateur': REGIMES_PRESCRIPTION.CONSOMMATEUR.source
} as const;

/**
 * « article D441-5 du code de commerce », lu sur la source du paramètre. Rien
 * ne s'affiche si la source ne porte pas de numéro repérable : un article absent
 * vaut mieux qu'un numéro deviné.
 */
export function ArticleDuCode({ de }: { de: keyof typeof SOURCES }) {
	const source = SOURCES[de];
	const numero = articleDe(source);
	if (numero === null) return null;
	const code = source.includes('code de la consommation')
		? 'du code de la consommation'
		: source.includes('code de commerce')
			? 'du code de commerce'
			: '';
	return <>{`article ${numero} ${code}`.trim()}</>;
}

// ─── Les encadrés ────────────────────────────────────────────────────────────

/**
 * Un encadré teinté. `retenir` (bleu) pour ce qu'il faut garder en tête,
 * `attention` (rose, la teinte de « ce qu'on vous demande ») pour une idée
 * reçue qui coûte cher. Jamais une teinte de seuil : ce n'est pas une alerte.
 */
export function Encadre({
	titre,
	variante = 'retenir',
	children
}: {
	titre?: string;
	variante?: 'retenir' | 'attention';
	children: ReactNode;
}) {
	return (
		<aside
			className={cn(
				'my-cladd-sm flex flex-col gap-cladd-3xs rounded-carte-site p-cladd-xs',
				variante === 'attention' ? 'bg-teinte-question' : 'bg-teinte-argent'
			)}
		>
			{titre === undefined ? null : (
				<p className="text-intertitre leading-snug font-semibold">{titre}</p>
			)}
			<div className="flex flex-col gap-cladd-3xs">{children}</div>
		</aside>
	);
}

// ─── La mise en forme des éléments du MDX ────────────────────────────────────

/** Le texte brut d'un intertitre, pour en tirer son ancre. */
function texteDe(noeud: ReactNode): string {
	if (typeof noeud === 'string' || typeof noeud === 'number') return String(noeud);
	if (Array.isArray(noeud)) return noeud.map(texteDe).join('');
	return '';
}

function Lien({ href = '', children, ...reste }: ComponentPropsWithoutRef<'a'>) {
	const classes =
		'font-medium text-encre-site underline decoration-encre-site/30 underline-offset-4 transition-colors hover:decoration-encre-site';
	// Un lien interne passe par le routeur ; un lien externe s'ouvre ailleurs.
	if (href.startsWith('/')) {
		return (
			<Link to={href} className={classes}>
				{children}
			</Link>
		);
	}
	return (
		<a href={href} className={classes} target="_blank" rel="noreferrer" {...reste}>
			{children}
		</a>
	);
}

export const COMPOSANTS_MDX = {
	h2: ({ className, children, ...p }: ComponentPropsWithoutRef<'h2'>) => (
		<h2
			id={ancreDe(texteDe(children))}
			className={cn(
				'mt-cladd-lg scroll-mt-lecture font-serif text-intertitre leading-tight font-medium text-balance md:text-titre-section md:tracking-titre-section',
				className
			)}
			{...p}
		>
			{children}
		</h2>
	),
	h3: ({ className, ...p }: ComponentPropsWithoutRef<'h3'>) => (
		<h3
			className={cn(
				'mt-cladd-sm scroll-mt-lecture text-intertitre leading-snug font-semibold',
				className
			)}
			{...p}
		/>
	),
	p: (p: ComponentPropsWithoutRef<'p'>) => (
		// Sans taille : le paragraphe prend celle de son bloc (le corps de l'article,
		// une étape, un encadré), au lieu d'imposer la grande partout.
		<p className="leading-relaxed" {...p} />
	),
	a: Lien,
	strong: (p: ComponentPropsWithoutRef<'strong'>) => <strong className="font-semibold" {...p} />,
	ul: (p: ComponentPropsWithoutRef<'ul'>) => (
		<ul
			className="flex list-disc flex-col gap-cladd-3xs pl-cladd-sm text-chapeau leading-relaxed marker:text-encre-site-claire"
			{...p}
		/>
	),
	ol: (p: ComponentPropsWithoutRef<'ol'>) => (
		<ol
			className="flex list-decimal flex-col gap-cladd-3xs pl-cladd-sm text-chapeau leading-relaxed marker:text-encre-site-claire"
			{...p}
		/>
	),
	li: (p: ComponentPropsWithoutRef<'li'>) => <li className="pl-1" {...p} />,
	blockquote: (p: ComponentPropsWithoutRef<'blockquote'>) => (
		<blockquote
			className="border-l-2 border-encre-site pl-cladd-xs font-serif text-intertitre leading-snug text-encre-site md:text-titre-section md:leading-tight"
			{...p}
		/>
	),
	hr: () => <hr className="my-cladd-sm border-filet-creme" />,
	img: ({ alt = '', ...p }: ComponentPropsWithoutRef<'img'>) => (
		<img
			alt={alt}
			loading="lazy"
			decoding="async"
			className="block h-auto w-full rounded-carte-site"
			{...p}
		/>
	),
	table: (p: ComponentPropsWithoutRef<'table'>) => (
		<div className="overflow-x-auto rounded-carte-site border border-filet-creme">
			<table className="w-full border-collapse text-left text-cladd-md" {...p} />
		</div>
	),
	th: (p: ComponentPropsWithoutRef<'th'>) => (
		<th
			className="border-b border-filet-creme bg-creme-profonde px-cladd-xs py-cladd-3xs font-semibold"
			{...p}
		/>
	),
	td: (p: ComponentPropsWithoutRef<'td'>) => (
		<td className="border-b border-filet-creme px-cladd-xs py-cladd-3xs tabular-nums" {...p} />
	),
	code: (p: ComponentPropsWithoutRef<'code'>) => (
		<code className="rounded-md bg-creme-profonde px-1.5 py-0.5 text-cladd-sm" {...p} />
	),
	TauxDePenalites,
	Indemnite,
	DelaiPourAgir,
	PointDeDepart,
	ArticleDuCode,
	Encadre,
	Source,
	PlancherContractuel,
	TauxLegal,
	ExempleDecompte,
	DelaisParSecteur,
	CompteurIndemnites,
	Etapes,
	Etape,
	Comparaison,
	Capture,
	Valeur,
	BarresDeDelais,
	ExempleDelai,
	ExempleSignification,
	PlanEcheancier
};
