/**
 * LES RÈGLES DU COMPTE, ÉCRITES UNE FOIS (28/10/2026).
 *
 * La longueur minimale d'un mot de passe est celle que le serveur exige (`convex/auth.ts`,
 * `minPasswordLength`) : la jauge de l'inscription et celle du nouveau mot de passe la lisent ici,
 * et le serveur aussi. Écrite à trois endroits, elle avait déjà failli diverger.
 */
export const LONGUEUR_MINIMALE_DU_MOT_DE_PASSE = 12;

/** Une adresse qui a la forme d'une adresse : le serveur tranche le reste. */
export const FORME_D_ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * La messagerie d'une adresse, quand on la connaît : le bouton « Ouvrir Gmail » après l'envoi
 * d'un lien. Une adresse d'entreprise n'en a pas : on ne devine pas son webmail.
 */
const MESSAGERIES: readonly {
	readonly domaines: readonly string[];
	readonly nom: string;
	readonly adresse: string;
}[] = [
	{
		domaines: ['gmail.com', 'googlemail.com'],
		nom: 'Gmail',
		adresse: 'https://mail.google.com/mail/u/0/#inbox'
	},
	{
		domaines: [
			'outlook.com',
			'outlook.fr',
			'hotmail.com',
			'hotmail.fr',
			'live.com',
			'live.fr',
			'msn.com'
		],
		nom: 'Outlook',
		adresse: 'https://outlook.live.com/mail/'
	},
	{
		domaines: ['yahoo.com', 'yahoo.fr', 'ymail.com'],
		nom: 'Yahoo Mail',
		adresse: 'https://mail.yahoo.com/'
	},
	{
		domaines: ['icloud.com', 'me.com', 'mac.com'],
		nom: 'iCloud Mail',
		adresse: 'https://www.icloud.com/mail/'
	},
	{
		domaines: ['orange.fr', 'wanadoo.fr'],
		nom: 'Mail Orange',
		adresse: 'https://messagerie.orange.fr/'
	},
	{ domaines: ['free.fr'], nom: 'Free', adresse: 'https://webmail.free.fr/' },
	{ domaines: ['sfr.fr', 'neuf.fr'], nom: 'SFR Mail', adresse: 'https://webmail.sfr.fr/' },
	{ domaines: ['laposte.net'], nom: 'La Poste', adresse: 'https://www.laposte.net/accueil' }
];

export function messagerieDe(
	adresse: string
): { readonly nom: string; readonly adresse: string } | null {
	const domaine = adresse.trim().toLowerCase().split('@')[1];
	if (!domaine) return null;
	return MESSAGERIES.find((m) => m.domaines.includes(domaine)) ?? null;
}
