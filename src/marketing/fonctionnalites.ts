import { INDICE_DE_DEPART } from '../lib/verticales/recouvrement/risque/regles';
import type { FamilleRangee } from '../ui/familles';
import type { CaptureProduit, TeinteSite } from './section';

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
	/**
	 * Où elle se montre sur la page d'accueil : `/#<id>`, l'identifiant d'une section du site
	 * (`marketing/site/`). Les pages qui gardent la barre d'avant (le blog, les métiers, les
	 * pages légales) y mènent par elle.
	 */
	readonly ancre: `/#${string}`;
	/** L'écran qui la montre, s'il y en a un (le calcul se FAIT sur la page). */
	readonly capture?: CaptureProduit;
	/** Sa place dans la grille « Tout ce qui va avec » : celles qui n'ont pas leur section. */
	readonly tuile: boolean;
	/**
	 * Son entrée du menu « Logiciel » du site d'après la maquette V26 (28/10/2026,
	 * `docs/superpowers/specs/2026-10-28-site-en-production.md`). `court` la nomme dans la
	 * feuille du téléphone ; sans lui, elle n'y figure pas.
	 */
	readonly menu?: {
		readonly titre: string;
		readonly ligne: string;
		readonly ancre: `#${string}`;
		readonly teinte: 'part' | 'argent' | 'papiers' | 'temps' | 'question';
		readonly court?: string;
	};
	/**
	 * Sa tuile dans « Tout ce qui va avec » sur le même site (ordre `TUILES_DU_SITE`) : la phrase de
	 * la maquette, et la section où elle mène.
	 */
	readonly carte?: {
		readonly phrase: string;
		readonly ancre: `#${string}`;
	};
}

/** L'ordre des tuiles de « Tout ce qui va avec » sur le nouveau site, celui de la maquette. */
export const TUILES_DU_SITE: readonly CleFonctionnalite[] = [
	'coffre',
	'sante',
	'parole',
	'paiement',
	'defense',
	'logiciels'
];

/** L'ordre du menu « Logiciel » du nouveau site, celui de la maquette. */
export const MENU_DU_SITE: readonly CleFonctionnalite[] = [
	'relances',
	'calcul',
	'coffre',
	'sante',
	'paiement',
	'defense'
];

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
		ancre: '/#loi',
		tuile: false,
		menu: {
			titre: 'Les pénalités au centime',
			ligne: 'Calculées et datées le jour où vous les réclamez.',
			ancre: '#loi',
			teinte: 'argent',
			court: 'Pénalités'
		}
	},
	{
		cle: 'relances',
		nom: 'Les relances à votre nom',
		resume: 'Chacune se retient une heure avant',
		phrase: 'Rappels et lettre officielle partent à votre nom, et chacun se retient avant.',
		famille: 'ENVOI',
		ancre: '/#plume',
		capture: 'part-bientot',
		tuile: false,
		menu: {
			titre: 'Les relances à votre nom',
			ligne: 'Rappels puis lettre officielle, une heure pour retenir.',
			ancre: '#plume',
			teinte: 'part',
			court: 'Relances'
		}
	},
	{
		cle: 'logiciels',
		nom: 'Vos logiciels branchés',
		resume: 'Pennylane, QuickBooks, Qonto…',
		phrase: 'Vos factures arrivent seules et passent payées quand elles le sont.',
		famille: 'PAPIERS',
		ancre: '/#tout',
		capture: 'logiciels',
		tuile: false,
		carte: {
			phrase:
				'Vos factures et vos règlements arrivent seuls. Sans logiciel, un fichier suffit : FEC, Factur-X, PDF, photo.',
			ancre: '#tout'
		}
	},
	{
		cle: 'coffre',
		nom: 'Le coffre-fort',
		resume: 'Vos documents chiffrés',
		phrase: 'Chaque document est scellé à son arrivée, et chaque ouverture est notée.',
		famille: 'PAPIERS',
		ancre: '/#securite',
		capture: 'coffre',
		tuile: true,
		menu: {
			titre: 'Le coffre-fort',
			ligne: 'Chaque document scellé, chaque ouverture notée.',
			ancre: '#securite',
			teinte: 'papiers',
			court: 'Coffre-fort'
		},
		carte: {
			phrase: 'Chaque document est scellé à son arrivée, et chaque ouverture est notée.',
			ancre: '#securite'
		}
	},
	{
		cle: 'sante',
		nom: 'La santé de vos clients',
		resume: 'Le risque, fait par fait',
		phrase: 'Un indice sur cent, et chacun des faits qui le font bouger, à sa source.',
		famille: 'TEMPS',
		ancre: '/#tout',
		capture: 'sante',
		tuile: true,
		menu: {
			titre: 'La santé de vos clients',
			ligne: 'Un indice sur cent, chaque fait à sa source.',
			ancre: '#tout',
			teinte: 'temps',
			court: 'Santé clients'
		},
		carte: {
			phrase: `Un indice sur cent qui part de ${INDICE_DE_DEPART}, et chacun des faits qui le font bouger, à sa source.`,
			ancre: '#tout'
		}
	},
	{
		cle: 'parole',
		nom: 'Promesses et échéanciers',
		resume: 'Plume se tait quand il a promis',
		phrase: 'Le paiement en plusieurs fois se convient, puis se suit versement par versement.',
		famille: 'QUESTION',
		ancre: '/#tout',
		capture: 'echeancier',
		tuile: true,
		carte: {
			phrase: 'Le paiement en plusieurs fois se convient, puis se suit versement par versement.',
			ancre: '#tout'
		}
	},
	{
		cle: 'defense',
		nom: 'Votre défense',
		resume: 'Avocats et commissaires de justice',
		phrase:
			'Les avocats et commissaires de justice qui exercent près de votre client, et leurs coordonnées.',
		famille: 'ENVOI',
		ancre: '/#tout',
		capture: 'defense',
		tuile: true,
		menu: {
			titre: 'Votre défense',
			ligne: 'Avocats et commissaires près de votre client.',
			ancre: '#tout',
			teinte: 'question'
		},
		carte: {
			phrase:
				'Les avocats et commissaires de justice près de chez votre client, trouvés d’après son SIREN.',
			ancre: '#tout'
		}
	},
	{
		cle: 'paiement',
		nom: 'La page de paiement',
		resume: 'Votre client paie sur votre compte',
		phrase: 'Votre client paie par virement, sur votre compte, depuis une page à votre nom.',
		famille: 'ARGENT',
		ancre: '/#tout',
		capture: 'paiement',
		tuile: true,
		menu: {
			titre: 'La page de paiement',
			ligne: 'Votre IBAN, le montant, la référence. Rien ne passe par nous.',
			ancre: '#tout',
			teinte: 'argent'
		},
		carte: {
			phrase:
				'Votre client voit le montant, votre IBAN et la référence. Il paie depuis sa banque, l’argent arrive chez vous.',
			ancre: '#securite'
		}
	},
	{
		cle: 'telephone',
		nom: 'Sur votre téléphone',
		resume: 'Comme une application',
		phrase: 'Elle s’installe depuis le navigateur, sans passer par un magasin d’applications.',
		famille: 'MACHINE',
		ancre: '/#haut',
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
export {
	LOGICIELS_BRANCHES,
	FORMATS_LUS,
	delaiPourRetenir,
	dureePourRetenir,
	type LogicielBranche
} from '../lib/config/produit';

/** La teinte du site d'une famille du produit : « la teinte dit de quoi il s'agit ». */
export const TEINTE_DE_LA_FAMILLE: Readonly<Record<FamilleRangee, TeinteSite>> = {
	ARGENT: 'argent',
	TEMPS: 'temps',
	PAPIERS: 'papiers',
	ENVOI: 'argent',
	QUESTION: 'question',
	MACHINE: 'abricot'
};
