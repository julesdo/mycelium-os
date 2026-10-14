import type { FamilleRangee } from '../ui/familles';
import { DELAI_POUR_RETENIR_MS } from '../lib/verticales/recouvrement/plan-relance';
import type { CaptureProduit } from './section';

/**
 * CE QUE FAIT LETIKETTE, À UN SEUL ENDROIT (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE SITE NE MONTRE QUE CE REGISTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le site du 06/10 a pris une semaine de retard sur le produit sans que rien ne
 * le signale : Plume, le coffre-fort, la santé des clients, la défense, les
 * échéanciers, les logiciels branchés y manquaient tous (relevé du fondateur le
 * 14/10 : « pas du tout à jour et à l'image de toutes les features de l'app »).
 * Le menu « Logiciel », la grille « Tout ce qui va avec » et le pied de page
 * lisent désormais cette liste : une fonction livrée s'ajoute ICI, et toutes les
 * surfaces la portent. Voir `docs/superpowers/specs/2026-10-14-site-refonte.md`.
 *
 * ⚠️ CHAQUE ANCRE EXISTE SUR LA PAGE. `fonctionnalites.test.ts` vérifie que
 * l'identifiant de chaque ancre est posé par une section du site : un lien du
 * menu qui ne mène nulle part se voit au test, pas chez le visiteur.
 *
 * ⚠️ LA TEINTE DIT DE QUOI IL S'AGIT, comme dans le produit : la famille d'une
 * fonction est celle de ses rangées dans l'application.
 */
export type CleFonctionnalite =
	| 'plume'
	| 'calcul'
	| 'relances'
	| 'logiciels'
	| 'coffre'
	| 'sante'
	| 'parole'
	| 'defense'
	| 'paiement'
	| 'telephone';

export interface Fonctionnalite {
	readonly cle: CleFonctionnalite;
	/** Son nom, cinq mots au plus : un titre de tuile, une entrée de menu. */
	readonly nom: string;
	/** Une demi-ligne, sous le nom, dans le menu. */
	readonly resume: string;
	/** Une phrase, sur sa tuile. */
	readonly phrase: string;
	readonly famille: FamilleRangee;
	/** Où elle se montre sur la page d'accueil : `/#<id>`. */
	readonly ancre: `/#${string}`;
	/** L'écran qui la montre, s'il y en a un (le calcul se FAIT sur la page). */
	readonly capture?: CaptureProduit;
	/** Sa place dans la grille « Tout ce qui va avec » : celles qui n'ont pas leur section. */
	readonly tuile: boolean;
}

export const FONCTIONNALITES: readonly Fonctionnalite[] = [
	{
		cle: 'plume',
		nom: 'Plume, votre assistant',
		resume: 'Il prépare, relance et répond',
		phrase: 'Il ouvre vos dossiers, relance à votre nom et répond à vos questions.',
		famille: 'MACHINE',
		ancre: '/#plume',
		capture: 'plume-maison',
		tuile: false
	},
	{
		cle: 'calcul',
		nom: 'Le calcul au centime',
		resume: 'Pénalités, frais et date limite',
		phrase: 'Les pénalités et les frais dus sur chaque facture, détaillés période par période.',
		famille: 'ARGENT',
		ancre: '/#calcul',
		tuile: false
	},
	{
		cle: 'relances',
		nom: 'Les relances à votre nom',
		resume: 'Chacune se retient une heure avant',
		phrase: 'Rappels et lettre officielle partent à votre nom, et chacun se retient avant.',
		famille: 'ENVOI',
		ancre: '/#comment',
		capture: 'part-bientot',
		tuile: false
	},
	{
		cle: 'logiciels',
		nom: 'Vos logiciels branchés',
		resume: 'Pennylane, QuickBooks, Qonto…',
		phrase: 'Vos factures arrivent seules et passent payées quand elles le sont.',
		famille: 'PAPIERS',
		ancre: '/#logiciels',
		capture: 'logiciels',
		tuile: false
	},
	{
		cle: 'coffre',
		nom: 'Le coffre-fort',
		resume: 'Vos documents chiffrés',
		phrase: 'Chaque document est scellé à son arrivée, et chaque ouverture est notée.',
		famille: 'PAPIERS',
		ancre: '/#coffre',
		capture: 'coffre',
		tuile: true
	},
	{
		cle: 'sante',
		nom: 'La santé de vos clients',
		resume: 'Le risque, fait par fait',
		phrase: 'Un indice sur cent, et chacun des faits qui le font bouger, à sa source.',
		famille: 'TEMPS',
		ancre: '/#sante',
		capture: 'sante',
		tuile: true
	},
	{
		cle: 'parole',
		nom: 'Promesses et échéanciers',
		resume: 'Plume se tait quand il a promis',
		phrase: 'Le paiement en plusieurs fois se convient, puis se suit versement par versement.',
		famille: 'QUESTION',
		ancre: '/#parole',
		capture: 'echeancier',
		tuile: true
	},
	{
		cle: 'defense',
		nom: 'Votre défense',
		resume: 'Avocats et commissaires de justice',
		phrase: 'Les avocats et commissaires de justice près de votre client, le jour où il le faut.',
		famille: 'ENVOI',
		ancre: '/#defense',
		capture: 'defense',
		tuile: true
	},
	{
		cle: 'paiement',
		nom: 'La page de paiement',
		resume: 'Votre client paie sur votre compte',
		phrase: 'Votre client paie par virement, sur votre compte, depuis une page à votre nom.',
		famille: 'ARGENT',
		ancre: '/#paiement',
		capture: 'paiement',
		tuile: true
	},
	{
		cle: 'telephone',
		nom: 'Sur votre téléphone',
		resume: 'Comme une application',
		phrase: 'Elle s’installe depuis le navigateur, sans passer par un magasin d’applications.',
		famille: 'MACHINE',
		ancre: '/#telephone',
		capture: 'aujourdhui',
		tuile: true
	}
];

/**
 * LES LOGICIELS QUI SE BRANCHENT.
 *
 * ⚠️ DÉCISION DU FONDATEUR, 14/10/2026 : « affiche toutes les intégrations, elles
 * vont être mises en place ». Le jour du relevé, le tableau de bord de Nango
 * n'en configurait aucune en production, et Qonto attendait sa clé
 * (`QONTO_CLIENT_ID`). Le site les montre toutes ; leur mise en service est à
 * faire avant qu'un visiteur ne veuille en brancher une.
 *
 * Les comptables et Stripe passent par Nango (`socle/connecteurs/nango/`), Qonto
 * par son propre connecteur, les services de fichiers par Companion
 * (`serveurs/companion/`). Les logos des services de fichiers sont dessinés
 * (`ui/logos-services.tsx`) : leur clé est celle du greffon Uppy.
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
