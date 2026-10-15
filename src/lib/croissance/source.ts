/**
 * D'OÙ VIENT UNE VISITE (16/10/2026) — la source qu'on joint à l'inscription.
 *
 * Lue sur l'adresse d'entrée (paramètres `utm_*`) et le site d'origine, gardés le
 * temps de la visite par l'amorce du `<head>` (`app/source-visite.ts`). Rien de
 * plus : ni identifiant de visiteur, ni cookie. Chaque champ est tronqué : une
 * adresse se fabrique, et rien de ce qu'elle porte ne doit gonfler la base.
 */

export type Canal = 'direct' | 'recherche' | 'assistant' | 'social' | 'campagne' | 'site';

export interface SourceVisite {
	readonly canal: Canal;
	readonly pageEntree: string;
	readonly referent?: string;
	readonly utmSource?: string;
	readonly utmMedium?: string;
	readonly utmCampaign?: string;
}

const LONGUEUR_MAX = 120;
const NOTRE_DOMAINE = /(^|\.)letikette\.com$|^localhost$/;
const ASSISTANTS =
	/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/;
const MOTEURS =
	/(^|\.)(google|bing|duckduckgo|qwant|ecosia|yahoo|startpage|search\.brave)\.[a-z.]+$/;
const RESEAUX =
	/(^|\.)(linkedin\.com|lnkd\.in|facebook\.com|fb\.com|instagram\.com|t\.co|x\.com|twitter\.com|youtube\.com|tiktok\.com)$/;

function propre(valeur: string | null): string | undefined {
	const t = valeur?.trim().slice(0, LONGUEUR_MAX);
	return t ? t : undefined;
}

export function lireSource(brut: { url: string; referent: string }): SourceVisite {
	let url: URL;
	try {
		url = new URL(brut.url);
	} catch {
		return { canal: 'direct', pageEntree: '/' };
	}
	let hote: string | undefined;
	try {
		hote = brut.referent ? new URL(brut.referent).hostname.toLowerCase() : undefined;
	} catch {
		hote = undefined;
	}
	if (hote !== undefined && NOTRE_DOMAINE.test(hote)) hote = undefined;

	const utmSource = propre(url.searchParams.get('utm_source'));
	const utmMedium = propre(url.searchParams.get('utm_medium'));
	const utmCampaign = propre(url.searchParams.get('utm_campaign'));
	const base = {
		pageEntree: url.pathname.slice(0, LONGUEUR_MAX) || '/',
		...(hote === undefined ? {} : { referent: hote.slice(0, LONGUEUR_MAX) }),
		...(utmSource === undefined ? {} : { utmSource }),
		...(utmMedium === undefined ? {} : { utmMedium }),
		...(utmCampaign === undefined ? {} : { utmCampaign })
	};

	if (utmSource !== undefined) return { canal: 'campagne', ...base };
	if (hote === undefined) return { canal: 'direct', ...base };
	if (ASSISTANTS.test(hote)) return { canal: 'assistant', ...base };
	if (MOTEURS.test(hote)) return { canal: 'recherche', ...base };
	if (RESEAUX.test(hote)) return { canal: 'social', ...base };
	return { canal: 'site', ...base };
}

const LIBELLES: Record<Canal, string> = {
	direct: 'Directe',
	recherche: 'Recherche',
	assistant: 'Assistant',
	social: 'Réseaux',
	campagne: 'Campagne',
	site: 'Autre site'
};

/** Le nom d'une source dans le point du lundi : la campagne nommée, sinon le canal. */
export function libelleDeSource(s: SourceVisite | null): string {
	if (s === null) return 'Inconnue';
	if (s.canal === 'campagne') {
		return s.utmCampaign === undefined
			? (s.utmSource ?? 'Campagne')
			: `${s.utmSource} · ${s.utmCampaign}`;
	}
	return LIBELLES[s.canal];
}
