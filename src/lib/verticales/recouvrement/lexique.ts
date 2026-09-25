/**
 * LE LEXIQUE — le mot du droit, et le mot de l'interface.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE SEULE SOURCE, ET UN TEST QUI LA TIENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit s'adresse à un gérant, pas à un juriste. Le mot du droit reste
 * disponible en second (« Le mot du droit : mise en demeure »), jamais en titre
 * ni sur un bouton. Seul le CORPS d'un document envoyé garde le vocabulaire
 * juridique exact : il vit dans `gabarits/`, hors du balayage.
 *
 * `__tests__/lexique.test.ts` balaie l'interface et refuse le mot du droit là
 * où le mot de l'interface est attendu.
 */

export interface EntreeLexique {
	/** Le mot du droit, tel que les textes l'écrivent. */
	readonly droit: string;
	/** Le mot de l'interface, tel qu'un gérant le dit. */
	readonly interface: string;
	/**
	 * Le motif qui repère le mot du droit dans un texte d'interface. `null` quand
	 * le mot du droit reste admis à l'écran (il y est identique, ou nécessaire).
	 */
	readonly motif: RegExp | null;
}

export const LEXIQUE: readonly EntreeLexique[] = [
	{ droit: 'Débiteur', interface: 'Votre client', motif: /d[ée]biteurs?\b/i },
	{ droit: 'Créance', interface: 'Ce qu’il vous doit', motif: /\bcr[ée]ances?\b/i },
	{
		droit: 'Mise en demeure',
		interface: 'Lettre de relance officielle',
		motif: /mise en demeure/i
	},
	{ droit: 'Intérêts de retard', interface: 'Pénalités de retard', motif: /int[ée]r[êe]ts/i },
	{ droit: 'Indemnité forfaitaire', interface: 'Frais de recouvrement', motif: /indemnit[ée]/i },
	{ droit: 'Prescription', interface: 'Date limite pour agir en justice', motif: /prescri/i },
	{
		droit: 'Injonction de payer',
		interface: 'Demander au tribunal de le faire payer',
		motif: /injonction/i
	},
	{
		droit: 'Commissaire de justice',
		interface: 'Commissaire de justice (l’ancien huissier)',
		motif: null
	},
	{
		droit: 'Signification',
		interface: 'Le commissaire de justice lui remet la décision',
		motif: /\bsignifi/i
	},
	{ droit: 'Opposition', interface: 'Votre client conteste', motif: /\bopposition\b/i },
	{
		droit: 'Titre exécutoire',
		interface: 'Le droit de faire saisir',
		motif: /titre ex[ée]cutoire/i
	},
	{ droit: 'Déclaration de créance', interface: 'Déclarer ce qu’il vous doit', motif: null },
	{
		droit: 'Mandataire judiciaire, liquidateur',
		interface: 'La personne nommée par le tribunal',
		motif: /mandataire judiciaire|liquidateur/i
	},
	{ droit: 'Relevé de forclusion', interface: 'Rattrapage après le délai', motif: /forclusion/i },
	{ droit: 'BODACC', interface: 'Le journal officiel des entreprises', motif: /\bBODACC\b/ },
	{ droit: 'Pièces', interface: 'Documents', motif: /\bpi[èe]ces?\b/i }
];

/** « Le mot du droit : mise en demeure » — la seule forme sous laquelle il s'affiche. */
export function motDuDroit(droit: string): string {
	return `Le mot du droit : ${droit.toLocaleLowerCase('fr-FR')}`;
}
