import { DELAI_POUR_RETENIR_MS } from '../verticales/recouvrement/plan-relance';

/**
 * CE QUE FAIT LE PRODUIT, LU PAR LE SITE ET PAR LA BASE D'AIDE (16/10/2026).
 *
 * Ces valeurs vivaient dans `marketing/fonctionnalites.ts`, qui les ré-exporte : la
 * base d'aide du support (`support/articles.ts`) les lit aussi, et elle part dans le
 * code Convex, qui ne doit tirer ni l'interface ni le site.
 */

export interface LogicielBranche {
	readonly nom: string;
	readonly genre: 'comptabilite' | 'banque' | 'fichiers';
	/** Un fichier de `public/connecteurs/`, ou la clé d'un logo dessiné. */
	readonly logo: { readonly fichier: string } | { readonly dessin: string };
}

export const LOGICIELS_BRANCHES: readonly LogicielBranche[] = [
	{ nom: 'Pennylane', genre: 'comptabilite', logo: { fichier: '/connecteurs/logo-pennylane.svg' } },
	{
		nom: 'QuickBooks',
		genre: 'comptabilite',
		logo: { fichier: '/connecteurs/logo-quickbooks.svg' }
	},
	{ nom: 'Xero', genre: 'comptabilite', logo: { fichier: '/connecteurs/logo-xero.svg' } },
	{ nom: 'Sellsy', genre: 'comptabilite', logo: { fichier: '/connecteurs/logo-sellsy.svg' } },
	{
		nom: 'Zoho Books',
		genre: 'comptabilite',
		logo: { fichier: '/connecteurs/logo-zoho-books.svg' }
	},
	{ nom: 'Stripe', genre: 'comptabilite', logo: { fichier: '/connecteurs/logo-stripe.svg' } },
	{ nom: 'Qonto', genre: 'banque', logo: { fichier: '/connecteurs/qonto-symbole-128.webp' } },
	{ nom: 'Google Drive', genre: 'fichiers', logo: { dessin: 'GoogleDrivePicker' } },
	{ nom: 'Dropbox', genre: 'fichiers', logo: { dessin: 'Dropbox' } },
	{ nom: 'OneDrive', genre: 'fichiers', logo: { dessin: 'OneDrive' } },
	{ nom: 'Box', genre: 'fichiers', logo: { dessin: 'Box' } }
];

/** Les formats qu'un dépôt lit, sans logiciel. */
export const FORMATS_LUS = ['FEC', 'Factur-X', 'PDF', 'photo'] as const;

/**
 * « l’heure », « les deux heures » : le délai pendant lequel une relance se
 * retient, en mots, lu sur la constante que le pilote applique.
 */
export function delaiPourRetenir(): string {
	const heures = DELAI_POUR_RETENIR_MS / 3_600_000;
	if (heures === 1) return 'l’heure';
	if (Number.isInteger(heures)) return `les ${heures} heures`;
	return `les ${Math.round(DELAI_POUR_RETENIR_MS / 60_000)} minutes`;
}

/** « une heure », « deux heures » : le même délai, compté. */
export function dureePourRetenir(): string {
	const heures = DELAI_POUR_RETENIR_MS / 3_600_000;
	if (heures === 1) return 'une heure';
	if (Number.isInteger(heures)) return `${heures} heures`;
	return `${Math.round(DELAI_POUR_RETENIR_MS / 60_000)} minutes`;
}
