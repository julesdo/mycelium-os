import { lireIban } from '../socle/iban';

/**
 * CE QUI SE MASQUE AVANT D'ÊTRE GARDÉ OU LU (16/10/2026).
 *
 * Le gérant est prévenu : l'équipe lit le fil, il n'y colle ni mot de passe ni données de ses
 * clients. Il le fera quand même. Ce qui se DÉTECTE sans se tromper est donc remplacé avant
 * tout stockage et avant tout envoi au modèle : un IBAN dont la clé tombe juste, un numéro de
 * carte (émetteur, longueur et contrôle de Luhn), une clé ou un jeton aux préfixes connus. Le fil dit
 * ensuite ce qui a été masqué (« J'ai masqué un IBAN dans votre message »).
 *
 * ⚠️ RIEN D'AUTRE. Un nom, un montant, un numéro de facture ne se reconnaissent pas sans
 * faux positifs, et un masquage qui mange la question la rend inutilisable : ceux-là restent,
 * sous l'avertissement.
 */

export type GenreMasque = 'IBAN' | 'CARTE' | 'CLE';

export interface Masquage {
	readonly texte: string;
	readonly masques: readonly { readonly genre: GenreMasque; readonly nombre: number }[];
}

const REMPLACEMENTS: Record<GenreMasque, string> = {
	IBAN: '[IBAN masqué]',
	CARTE: '[carte masquée]',
	CLE: '[clé masquée]'
};

/** Les clés et jetons aux préfixes publiés : Stripe, Paddle, Resend, Svix, Nango, un jeton porteur, un JWT. */
const CLES: readonly RegExp[] = [
	/\b[sprk]k_(?:live|test)_[A-Za-z0-9]{8,}/g,
	/\bpdl_(?:live|sdbx)_[A-Za-z0-9_]{8,}/g,
	/\bre_[A-Za-z0-9_]{16,}/g,
	/\bwhsec_[A-Za-z0-9+/=]{16,}/g,
	/\bnango_[A-Za-z0-9_-]{16,}/g,
	/\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/g,
	/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g
];

/** Le candidat d'un IBAN : code pays, clé, puis 11 à 30 caractères, groupés ou non. */
const CANDIDAT_IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/g;

/** Une suite de 15 ou 16 chiffres, groupés par espaces ou tirets. */
const CANDIDAT_CARTE = /\b\d(?:[ -]?\d){14,15}\b/g;

/**
 * ⚠️ LUHN NE SUFFIT PAS : le SIREN et le SIRET sont construits sur la même clé, et le gérant en
 * colle à chaque message. Une carte se reconnaît donc AUSSI à sa longueur et au préfixe de son
 * émetteur : American Express (15 chiffres, 34 ou 37), Visa (4), Mastercard (51 à 55, 2221 à
 * 2720), Discover (6011, 65) et JCB (3528 à 3589), sur 16 chiffres.
 */
function prefixeDEmetteur(chiffres: string): boolean {
	if (chiffres.length === 15) return /^3[47]/.test(chiffres);
	const quatre = Number(chiffres.slice(0, 4));
	return (
		chiffres.startsWith('4') ||
		/^5[1-5]/.test(chiffres) ||
		(quatre >= 2221 && quatre <= 2720) ||
		chiffres.startsWith('6011') ||
		chiffres.startsWith('65') ||
		(quatre >= 3528 && quatre <= 3589)
	);
}

function luhn(chiffres: string): boolean {
	let somme = 0;
	let double = false;
	for (let i = chiffres.length - 1; i >= 0; i--) {
		let n = Number(chiffres[i]);
		if (double) {
			n *= 2;
			if (n > 9) n -= 9;
		}
		somme += n;
		double = !double;
	}
	return somme % 10 === 0;
}

/**
 * Le plus long préfixe du candidat qui soit un IBAN valide : un mot en capitales collé derrière
 * l'IBAN ne doit pas le faire échouer.
 */
function ibanEnTete(candidat: string): string | null {
	const groupes = candidat.split(' ');
	for (let n = groupes.length; n > 0; n--) {
		const essai = groupes.slice(0, n).join(' ');
		if (essai.replace(/\s/g, '').length < 15) return null;
		if (lireIban(essai).ok) return essai;
	}
	return null;
}

export function masquerDonneesSensibles(texte: string): Masquage {
	const comptes: Record<GenreMasque, number> = { IBAN: 0, CARTE: 0, CLE: 0 };
	let resultat = texte;

	for (const motif of CLES) {
		resultat = resultat.replace(motif, () => {
			comptes.CLE += 1;
			return REMPLACEMENTS.CLE;
		});
	}

	resultat = resultat.replace(CANDIDAT_IBAN, (candidat) => {
		const iban = ibanEnTete(candidat);
		if (iban === null) return candidat;
		comptes.IBAN += 1;
		return REMPLACEMENTS.IBAN + candidat.slice(iban.length);
	});

	resultat = resultat.replace(CANDIDAT_CARTE, (candidat) => {
		const chiffres = candidat.replace(/[ -]/g, '');
		if (!prefixeDEmetteur(chiffres) || !luhn(chiffres)) return candidat;
		comptes.CARTE += 1;
		return REMPLACEMENTS.CARTE;
	});

	return {
		texte: resultat,
		masques: (Object.keys(comptes) as GenreMasque[])
			.filter((genre) => comptes[genre] > 0)
			.map((genre) => ({ genre, nombre: comptes[genre] }))
	};
}

/** « J'ai masqué un IBAN et une clé dans votre message. » — ou rien. */
export function phraseDeMasquage(masques: Masquage['masques']): string | null {
	if (masques.length === 0) return null;
	const noms: Record<GenreMasque, [string, string]> = {
		IBAN: ['un IBAN', 'IBAN'],
		CARTE: ['un numéro de carte', 'numéros de carte'],
		CLE: ['une clé', 'clés']
	};
	const morceaux = masques.map(({ genre, nombre }) =>
		nombre === 1 ? noms[genre][0] : `${nombre} ${noms[genre][1]}`
	);
	const liste =
		morceaux.length === 1
			? morceaux[0]
			: `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}`;
	return `J’ai masqué ${liste} dans votre message : l’équipe ne le verra pas.`;
}
