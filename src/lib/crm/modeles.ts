import { jourDeParis } from '../admin/dates';
import type { Cible } from './statuts';
import { lienDeDesinscription, piedLegal, sourceDeLAdresse } from './consentement';

/**
 * LES E-MAILS DE PROSPECTION, PRÊTS À ÉCRIRE (18/10/2026).
 *
 * Les modèles de la phase manuelle (`docs/croissance/phase-manuelle.md`, § 3),
 * remplis pour la fiche : le prénom du dirigeant, le nom de l'entreprise, les
 * chiffres de la loi lus au registre (`valeurs-loi.ts`), le lien qui porte sa
 * source. Le CRM n'envoie rien : « Écrire » ouvre la messagerie de l'équipier,
 * depuis son adresse, et l'envoi se note ensuite sur la fiche.
 *
 * Ce qui reste à la main, exprès : une phrase écrite pour la personne, entre
 * crochets en tête du message. Un e-mail sans elle est un envoi groupé.
 *
 * Les lignes rouges valent ici : jamais le mot interdit, jamais une procédure à
 * engager ; la loi et ce que le logiciel calcule. Chaque message finit par le pied
 * légal (`consentement.piedLegal`) : la vraie source de l'adresse, la durée, le lien
 * de désinscription. LinkedIn est retiré (19/10/2026, la direction n'en veut pas).
 */

export interface ValeursDeLaLoi {
	/** « 40 € », ou `null` si le registre ne la donne pas. */
	readonly indemnite: string | null;
	/** « 12,40 % » pour le semestre en cours, ou `null` hors de la série relevée. */
	readonly taux: string | null;
	/** Les délais pour agir en justice, en années. */
	readonly delaiTransport: number;
	readonly delaiGeneral: number;
	/** « 6 000 € » : l'exemple des 100 factures, calculé par le moteur. */
	readonly exemple: string | null;
}

export type Modele = 'TRANSPORT' | 'BATIMENT_SERVICES' | 'CABINET';
export type EtapeDEcriture = 'PREMIER' | 'RELANCE_1' | 'RELANCE_2' | 'FINI';

export const LIBELLES_DES_ETAPES: Record<Exclude<EtapeDEcriture, 'FINI'>, string> = {
	PREMIER: 'Premier e-mail',
	RELANCE_1: 'Relance J+4',
	RELANCE_2: 'Dernière relance (J+10)'
};

export const LIBELLES_DES_MODELES: Record<Modele, string> = {
	TRANSPORT: 'Transport',
	BATIMENT_SERVICES: 'Bâtiment et services',
	CABINET: 'Cabinet comptable'
};

/** Après chaque envoi, la prochaine action et dans combien de jours (§ 1 de la routine). */
export const SUITE_DES_ETAPES: Record<
	Exclude<EtapeDEcriture, 'FINI'>,
	{ readonly action: string; readonly dans: number }
> = {
	PREMIER: { action: 'Relancer (J+4)', dans: 4 },
	RELANCE_1: { action: 'Dernière relance (J+10)', dans: 6 },
	RELANCE_2: { action: 'Classer s’il ne répond pas', dans: 7 }
};

interface ProspectAEcrire {
	readonly entreprise: string;
	readonly dirigeant?: string;
	readonly activite?: string;
	readonly cible: Cible;
	/** D'où vient le contact : le pied en tire la source de l'adresse. */
	readonly trouveOu?: string;
	readonly jetonDesinscription?: string;
}

interface Signataire {
	readonly prenom: string;
	readonly fondateur: boolean;
}

/** Le code d'activité, lu dans « Libellé (49.41A) » ou tel quel. */
function codeDActivite(activite: string | undefined): string {
	const m = /(\d{2}\.\d{2}[A-Z])/.exec(activite ?? '');
	return m?.[1] ?? '';
}

export function modeleDe(p: { readonly cible: Cible; readonly activite?: string }): Modele {
	const code = codeDActivite(p.activite);
	if (p.cible === 'CABINET' || code === '69.20Z') return 'CABINET';
	if (code.startsWith('49.41')) return 'TRANSPORT';
	return 'BATIMENT_SERVICES';
}

/** D'après le nombre d'e-mails déjà notés sur la fiche. */
export function etapeDEcriture(emailsEcrits: number): EtapeDEcriture {
	if (emailsEcrits <= 0) return 'PREMIER';
	if (emailsEcrits === 1) return 'RELANCE_1';
	if (emailsEcrits === 2) return 'RELANCE_2';
	return 'FINI';
}

function campagneDe(modele: Modele, activite: string | undefined): string {
	if (modele === 'TRANSPORT') return 'transport';
	if (modele === 'CABINET') return 'cabinet';
	return /^4[123]\./.test(codeDActivite(activite)) ? 'batiment' : 'services';
}

/** La page du métier (`marketing/secteurs.ts`) ; un cabinet va à l'accueil. */
const PAGES_DES_CAMPAGNES: Readonly<Record<string, string>> = {
	transport: '/secteurs/transport-routier',
	batiment: '/secteurs/batiment',
	services: '/secteurs/services-aux-entreprises',
	cabinet: '/'
};

/** Le lien du calculateur, avec sa source : on saura d'où vient l'inscription. */
export function lienSuivi(modele: Modele, activite: string | undefined) {
	const campagne = campagneDe(modele, activite);
	return `https://www.letikette.com${PAGES_DES_CAMPAGNES[campagne] ?? '/'}?utm_source=manuel&utm_medium=email&utm_campaign=${campagne}#calcul`;
}

export function prenomDe(dirigeant: string | undefined): string | undefined {
	const premier = dirigeant?.trim().split(/\s+/)[0];
	return premier === undefined || premier === '' ? undefined : premier;
}

const MOTS_DE_LIAISON = new Set(['et', 'de', 'du', 'des', 'la', 'le', 'les', 'en', 'au', 'aux']);

/** « TRANSPORTS MOREAU ET FILS » → « Transports Moreau et Fils » ; un sigle entre parenthèses reste. */
export function nomDUsage(nom: string): string {
	if (nom !== nom.toUpperCase()) return nom;
	return (
		nom
			.split(/(\([^)]*\))/)
			.map((morceau) =>
				morceau.startsWith('(')
					? morceau
					: morceau
							.split(' ')
							.map((mot, i) => {
								const bas = mot.toLowerCase();
								if (i > 0 && MOTS_DE_LIAISON.has(bas)) return bas;
								return bas.replace(
									/(^|[-'’])(\p{L})/gu,
									(_, sep: string, l: string) => sep + l.toUpperCase()
								);
							})
							.join(' ')
			)
			.join('')
			// « D’Audit » au milieu du nom redevient « d’Audit » ; en tête, « L’Atelier » reste.
			.replace(/ (D|L)(['’])/g, (_, l: string, a: string) => ` ${l.toLowerCase()}${a}`)
	);
}

const NOMBRES = [
	'zéro',
	'un',
	'deux',
	'trois',
	'quatre',
	'cinq',
	'six',
	'sept',
	'huit',
	'neuf',
	'dix'
];

/** 1 → « un an », 5 → « cinq ans ». */
function annees(n: number): string {
	const mot = NOMBRES[n] ?? String(n);
	return `${mot} ${n > 1 ? 'ans' : 'an'}`;
}

/** « le délai d’un an », « le délai de deux ans ». */
function delaiDe(n: number): string {
	const a = annees(n);
	return /^[aeiouyéè]/i.test(a) ? `d’${a}` : `de ${a}`;
}

function objetPremier(modele: Modele, loi: ValeursDeLaLoi): string {
	if (modele === 'TRANSPORT') {
		return `Vos factures de transport et le délai ${delaiDe(loi.delaiTransport)}`;
	}
	if (modele === 'CABINET') return 'Les impayés de vos clients';
	return loi.indemnite === null
		? 'Ce que la loi ajoute à chaque facture payée en retard'
		: `Les ${loi.indemnite} de chaque facture payée en retard`;
}

function signature(s: Signataire): string {
	return `${s.prenom}\n${s.fondateur ? 'Fondateur de Letikette' : 'Letikette'} · www.letikette.com`;
}

function ceQueLaLoiAjoute(loi: ValeursDeLaLoi): string {
	const indemnite = loi.indemnite === null ? 'une indemnité forfaitaire' : `${loi.indemnite}`;
	const taux =
		loi.taux === null
			? 'des pénalités au taux de la BCE majoré de dix points'
			: `des pénalités au taux de ${loi.taux} par an ce semestre`;
	return `${indemnite} par facture, plus ${taux}`;
}

function corpsPremier(modele: Modele, p: ProspectAEcrire, loi: ValeursDeLaLoi, lien: string) {
	const nom = nomDUsage(p.entreprise);
	const phrase = `[Une phrase pour ${nom} : ce que vous avez vu de l’entreprise.]`;
	if (modele === 'TRANSPORT') {
		const exemple =
			loi.exemple === null
				? ''
				: ` Par exemple, 100 factures de 2 000 € réglées avec 30 jours de retard, c’est environ ${loi.exemple} dus en plus, que presque personne ne réclame.`;
		// Le point de départ : `REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES.pointDeDepart`
		// (la remise de la marchandise au destinataire), dit en mots de tous les jours.
		return [
			phrase,
			`Une facture de transport ne se réclame en justice que pendant ${annees(loi.delaiTransport)}, contre ${annees(loi.delaiGeneral)} pour la plupart des factures, et ce délai court depuis la livraison. Passé ce délai, la somme est perdue.`,
			`Je développe Letikette, à Paris : un logiciel qui lit vos factures, surveille ces délais et calcule ce que la loi ajoute à chaque facture payée en retard, ${ceQueLaLoiAjoute(loi)}.${exemple}`,
			`Vous pouvez faire le calcul sur vos propres chiffres, sans inscription : ${lien}`,
			`Est-ce un sujet chez ${nom} ?`
		];
	}
	if (modele === 'CABINET') {
		return [
			`Vous voyez passer les retards de paiement de vos clients dans leurs balances, sans avoir grand-chose à leur proposer. Je développe Letikette, à Paris : le logiciel lit leurs factures, chiffre ce que la loi y ajoute (${loi.indemnite ?? 'une indemnité forfaitaire'} par facture payée en retard et les pénalités), surveille les délais pour agir et envoie les relances au nom de votre client, sans commission sur ce qui rentre.`,
			'Je cherche cinq cabinets parisiens pour construire avec eux l’espace qui leur permettra de suivre les impayés de leurs clients. Accès gratuit pour le cabinet.',
			'Auriez-vous vingt minutes cette semaine ou la suivante ?'
		];
	}
	return [
		phrase,
		`Quand un client professionnel paie en retard, la loi vous accorde automatiquement ${ceQueLaLoiAjoute(loi)}. Presque personne ne les réclame, faute de savoir les calculer.`,
		'Je développe Letikette, à Paris : le logiciel lit vos factures, chiffre ce qui vous est dû au centime, et envoie les relances à votre nom quand vous l’avez décidé. Sans commission sur ce qui rentre : tout est à vous.',
		`Le calcul sur vos chiffres prend une minute, sans inscription : ${lien}`,
		'Avez-vous en ce moment des factures qui tardent à être payées ?'
	];
}

export function composerEmail({
	prospect,
	etape,
	signataire,
	loi
}: {
	readonly prospect: ProspectAEcrire;
	readonly etape: Exclude<EtapeDEcriture, 'FINI'>;
	readonly signataire: Signataire;
	readonly loi: ValeursDeLaLoi;
}): { objet: string; corps: string } {
	const modele = modeleDe(prospect);
	const lien = lienSuivi(modele, prospect.activite);
	const prenom = prenomDe(prospect.dirigeant);
	const bonjour = prenom === undefined ? 'Bonjour,' : `Bonjour ${prenom},`;
	const nom = nomDUsage(prospect.entreprise);
	const objetInitial = objetPremier(modele, loi);

	const paragraphes =
		etape === 'PREMIER'
			? corpsPremier(modele, prospect, loi, lien)
			: etape === 'RELANCE_1'
				? modele === 'CABINET'
					? [
							'Je me permets de remonter mon message. Une question simple : vos clients réclament-ils les pénalités de retard quand une facture traîne ?'
						]
					: [
							`Je me permets de remonter mon message. Une question simple : ${nom} a-t-elle des factures payées en retard en ce moment ?`
						]
				: [
						`Je ne vous relancerai plus après ce message. Si le sujet devient d’actualité, le calcul reste là : ${lien}. Bonne fin de semaine.`
					];

	return {
		objet: etape === 'PREMIER' ? objetInitial : `Re : ${objetInitial}`,
		corps: [
			bonjour,
			...paragraphes,
			signature(signataire),
			piedLegal({
				source: sourceDeLAdresse(prospect.trouveOu),
				lienDesinscription:
					prospect.jetonDesinscription === undefined
						? null
						: lienDeDesinscription(prospect.jetonDesinscription)
			})
		].join('\n\n')
	};
}

/** `mailto:` avec l'objet et le corps ; les retours à la ligne en CRLF, comme le veut la RFC 6068. */
export function adresseMailto(email: string, { objet, corps }: { objet: string; corps: string }) {
	const encoder = (texte: string) => encodeURIComponent(texte.replace(/\r?\n/g, '\r\n'));
	return `mailto:${email}?subject=${encoder(objet)}&body=${encoder(corps)}`;
}

/** Midi UTC, `jours` plus tard qu'aujourd'hui à Paris ; un samedi ou un dimanche passe au lundi. */
export function jourDeRelance(maintenant: number, jours: number): number {
	const [a, m, j] = jourDeParis(maintenant).split('-').map(Number);
	const date = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, (j ?? 1) + jours, 12));
	const semaine = date.getUTCDay();
	if (semaine === 6) date.setUTCDate(date.getUTCDate() + 2);
	if (semaine === 0) date.setUTCDate(date.getUTCDate() + 1);
	return date.getTime();
}
