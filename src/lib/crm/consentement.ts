import { sourceDuContact } from './source';
import { statutClos, type StatutProspect } from './statuts';

/**
 * QUAND UN E-MAIL DE PROSPECTION EST PERMIS, ET CE QU'IL DOIT DIRE (19/10/2026).
 *
 * La CNIL (recommandations du 12/06/2024, fiches du 10/06/2026) admet la prospection
 * B2B sur l'intérêt légitime si l'objet touche au métier de la personne, si elle est
 * INFORMÉE au plus tard au premier contact et dans le mois de la collecte (article 14
 * du RGPD), source comprise, si elle peut s'opposer simplement, et si chaque message
 * dit qui l'envoie. Une adresse générique (contact@, info@) échappe à l'information et
 * à l'opposition, pas à l'identité de l'expéditeur.
 *
 * ⚠️ LE DOUTE NE PROFITE JAMAIS AU PRODUIT : le mois court depuis l'entrée du prospect
 * au CRM, même si son adresse a été ajoutée plus tard. Passé ce mois sans information,
 * l'e-mail est refusé ; un appel (dont le script informe) ou l'effacement le règle.
 */

/** Le mois de la collecte, compté court. */
export const UN_MOIS_MS = 30 * 24 * 60 * 60 * 1000;

/** La durée de conservation, depuis le dernier contact venu du prospect (`entretien.ts`). */
export const ANNEES_DE_CONSERVATION = 3;
export const CONSERVATION_MS = ANNEES_DE_CONSERVATION * 365 * 24 * 60 * 60 * 1000;

/** Les parties locales d'une adresse qui ne nomme personne. */
const GENERIQUES = new Set([
	'accueil',
	'admin',
	'administratif',
	'administration',
	'agence',
	'bonjour',
	'bureau',
	'cabinet',
	'comptabilite',
	'compta',
	'commercial',
	'commerciale',
	'contact',
	'contacts',
	'devis',
	'direction',
	'exploitation',
	'facturation',
	'gestion',
	'hello',
	'info',
	'infos',
	'information',
	'informations',
	'office',
	'secretariat',
	'service',
	'services',
	'sales',
	'support',
	'transport',
	'transports'
]);

/**
 * « contact@ », « info.paris@ », « compta-fournisseurs@ » : le premier mot de la
 * partie locale est un mot de service, jamais un nom. « contacteur@ » n'en est pas un.
 */
export function adresseGenerique(email: string): boolean {
	const locale = email.trim().toLowerCase().split('@')[0] ?? '';
	const premier = locale
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.split(/[.\-_+]/)[0];
	return premier !== undefined && GENERIQUES.has(premier);
}

export interface ProspectPourEmail {
	readonly statut: StatutProspect;
	readonly email?: string;
	readonly emailBase?: 'GENERIQUE' | 'INFORMEE';
	readonly creeLe: number;
}

/** Sur quoi l'e-mail s'appuie : une adresse générique, une personne informée, ou cet e-mail qui informe. */
export type BaseDeLEmail = 'GENERIQUE' | 'INFORMEE' | 'PREMIER_CONTACT';

export type PermissionDEmail =
	| { readonly permis: true; readonly base: BaseDeLEmail }
	| { readonly permis: false; readonly raison: 'SANS_ADRESSE' | 'PLUS_D_UN_MOIS' | 'STOP' };

export function emailPermis(p: ProspectPourEmail, maintenant: number): PermissionDEmail {
	if (p.statut === 'STOP') return { permis: false, raison: 'STOP' };
	if (p.email === undefined || p.email.trim() === '') {
		return { permis: false, raison: 'SANS_ADRESSE' };
	}
	if (adresseGenerique(p.email)) return { permis: true, base: 'GENERIQUE' };
	if (p.emailBase === 'INFORMEE') return { permis: true, base: 'INFORMEE' };
	if (maintenant - p.creeLe <= UN_MOIS_MS) return { permis: true, base: 'PREMIER_CONTACT' };
	return { permis: false, raison: 'PLUS_D_UN_MOIS' };
}

/** La vue « À informer » et son compte : ouverts, et l'e-mail refusé pour ce seul motif. */
export function aInformer(p: ProspectPourEmail, maintenant: number): boolean {
	if (statutClos(p.statut)) return false;
	const permission = emailPermis(p, maintenant);
	return !permission.permis && permission.raison === 'PLUS_D_UN_MOIS';
}

/** Ce qu'il faut dire à l'équipier quand l'e-mail est refusé. */
export const RAISONS_DU_REFUS: Readonly<
	Record<'SANS_ADRESSE' | 'PLUS_D_UN_MOIS' | 'STOP', string>
> = {
	SANS_ADRESSE: 'Aucune adresse sur la fiche.',
	PLUS_D_UN_MOIS:
		'Entré il y a plus d’un mois sans avoir été informé : un e-mail à son adresse nominative n’est plus permis. Appelez-le (le script l’informe), ou effacez ses coordonnées.',
	STOP: 'Il a demandé à ne plus être contacté.'
};

/**
 * La source à dire pour l'ADRESSE. L'annuaire des entreprises et les données de la
 * commande publique ne publient aucune adresse e-mail : y attribuer une adresse serait
 * faux, et la phrase reste à compléter.
 */
export function sourceDeLAdresse(trouveOu: string | undefined): string | null {
	const source = sourceDuContact(trouveOu);
	if (source === null) return null;
	if (/annuaire des entreprises|commande publique/.test(source)) return null;
	return source;
}

export function lienDeDesinscription(jeton: string): string {
	return `https://www.letikette.com/desinscription/${encodeURIComponent(jeton)}`;
}

const ANNEES_EN_LETTRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq'];

/**
 * Le pied de chaque e-mail de prospection : d'où vient l'adresse, pourquoi on l'utilise
 * et combien de temps, comment ne plus rien recevoir, où lire ses droits.
 */
export function piedLegal({
	source,
	lienDesinscription
}: {
	readonly source: string | null;
	readonly lienDesinscription: string | null;
}): string {
	const ou = source ?? '[où vous avez trouvé son adresse : sur son site, par exemple]';
	const duree = `${ANNEES_EN_LETTRES[ANNEES_DE_CONSERVATION] ?? ANNEES_DE_CONSERVATION} ans`;
	const sortie =
		lienDesinscription === null
			? 'Pour ne plus recevoir de message, répondez « stop ».'
			: `Pour ne plus recevoir de message : ${lienDesinscription}`;
	return [
		`J’ai trouvé votre adresse ${ou}. Letikette utilise vos coordonnées professionnelles pour vous présenter son logiciel, sur la base de son intérêt légitime, et les conserve ${duree} au plus après votre dernière réponse.`,
		sortie,
		'Vos droits : www.letikette.com/politique-de-confidentialite'
	].join('\n');
}
