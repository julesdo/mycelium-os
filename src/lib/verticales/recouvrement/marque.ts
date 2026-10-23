import { assombrirJusquA, lireCouleur, melanger, normaliserCouleur } from '../../socle/couleurs';

/**
 * L'IMAGE DES COURRIERS QUE REÇOIT LE CLIENT : son logo et sa couleur (23/10/2026).
 *
 * Voir `docs/superpowers/specs/2026-10-23-logo-et-couleurs.md`. Le client qui
 * reçoit une relance doit reconnaître son fournisseur avant de lire un montant ;
 * le gérant pose donc son logo et sa couleur une fois, et ils valent pour
 * l'e-mail de relance et pour la page où le client paie.
 *
 * ⚠️ LA COULEUR DU GÉRANT NE VIT QUE DANS SES COURRIERS. L'interface de Letikette
 * garde ses teintes (`ui/familles.tsx`) et ses couleurs de seuil ; celle-ci est
 * une donnée du gérant, comme son nom.
 */

/**
 * Huit couleurs sobres, celles d'une lettre d'entreprise. Chacune porte un texte
 * blanc et se lit sur le blanc (`marque.test.ts`) : une pastille proposée par le
 * logiciel ne doit jamais demander d'ajustement.
 */
export const COULEURS_DE_MARQUE = [
	{ nom: 'Bleu nuit', hex: '#1e3a5f' },
	{ nom: 'Bleu roi', hex: '#2451b7' },
	{ nom: 'Vert sapin', hex: '#1f5f4a' },
	{ nom: 'Bordeaux', hex: '#7a1f35' },
	{ nom: 'Prune', hex: '#5b2a6e' },
	{ nom: 'Terre cuite', hex: '#b4532a' },
	{ nom: 'Ocre', hex: '#b07a12' },
	{ nom: 'Ardoise', hex: '#3f4a55' }
] as const;

/** La teinte, de 0 à 360, et la saturation et la luminosité, de 0 à 1. */
function enTsl(hex: string): { t: number; s: number; l: number } {
	const c = lireCouleur(hex);
	if (c === null) throw new Error(`« ${hex} » n’est pas une couleur (#rrggbb attendu).`);
	const r = c.r / 255;
	const g = c.g / 255;
	const b = c.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	if (d === 0) return { t: 0, s: 0, l };
	const s = d / (1 - Math.abs(2 * l - 1));
	const t =
		max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
	return { t, s, l };
}

/** « Bleu nuit » pour une couleur de la palette, sa famille (« Rouge ») pour les autres. */
export function nomDeCouleur(hex: string): string {
	const forme = normaliserCouleur(hex);
	const connue = COULEURS_DE_MARQUE.find((c) => c.hex === forme);
	if (connue !== undefined) return connue.nom;
	const { t, s, l } = enTsl(forme);
	if (l < 0.12) return 'Noir';
	if (s < 0.15) return 'Gris';
	if (t < 15 || t >= 345) return 'Rouge';
	if (t < 45) return 'Orange';
	if (t < 70) return 'Jaune';
	if (t < 165) return 'Vert';
	if (t < 195) return 'Turquoise';
	if (t < 255) return 'Bleu';
	if (t < 290) return 'Violet';
	return 'Rose';
}

/** Les couleurs que la lettre tire de celle du gérant. */
export interface TeintesDuCourriel {
	/** La couleur posée : la bande en tête de la lettre. */
	readonly accent: string;
	/** Celle des liens et du nom au pied : l'accent, assombri s'il ne se lit pas. */
	readonly texte: string;
	/** Le fond du relevé des factures : un blanc à peine teinté. */
	readonly panneau: string;
	/** Le filet du relevé. */
	readonly filet: string;
	/** Vrai quand le texte a dû être assombri : l'écran le dit au gérant. */
	readonly ajustee: boolean;
}

/** Le contraste d'un texte courant (WCAG, niveau AA). */
const CONTRASTE_DU_TEXTE = 4.5;

export function teintesDuCourriel(couleur: string | null | undefined): TeintesDuCourriel | null {
	if (couleur === null || couleur === undefined) return null;
	const accent = normaliserCouleur(couleur);
	const panneau = melanger('#ffffff', accent, 0.06);
	// Le relevé est le fond le plus foncé où un lien se pose : ce qui s'y lit se lit sur le blanc.
	const texte = assombrirJusquA(accent, panneau, CONTRASTE_DU_TEXTE);
	return {
		accent,
		texte,
		panneau,
		filet: melanger('#e4e4e0', accent, 0.22),
		ajustee: texte !== accent
	};
}

/** Le cadre du logo en tête d'une lettre, en pixels CSS. */
const LOGO_LARGEUR_MAX = 180;
const LOGO_HAUTEUR_MAX = 48;

/**
 * La taille à laquelle le logo s'affiche, ses proportions gardées. Outlook ne lit
 * ni `max-width` ni `height: auto` : l'e-mail porte donc des dimensions écrites.
 */
export function tailleDuLogo(
	largeur: number,
	hauteur: number
): { largeur: number; hauteur: number } {
	const echelle = Math.min(1, LOGO_LARGEUR_MAX / largeur, LOGO_HAUTEUR_MAX / hauteur);
	return {
		largeur: Math.max(1, Math.round(largeur * echelle)),
		hauteur: Math.max(1, Math.round(hauteur * echelle))
	};
}

/** Ce que porte la rangée « Logo et couleurs » du compte. */
export function resumeDeLaMarque(marque: {
	readonly logo: boolean;
	readonly couleur: string | null;
}): string {
	if (marque.couleur === null) return marque.logo ? 'Votre logo' : 'Par défaut';
	const nom = nomDeCouleur(marque.couleur);
	return marque.logo ? `Logo, ${nom.charAt(0).toLowerCase()}${nom.slice(1)}` : nom;
}

/** Le poids et la taille au-delà desquels un logo se refuse : il voyage dans chaque e-mail. */
export const LOGO_POIDS_MAX = 400_000;
export const LOGO_COTE_MAX = 1200;
