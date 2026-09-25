import { PARAMETRES, type ParametreLegalBase } from '../parametres';
import type { PhraseSourcee } from './prompt';

/**
 * LES QUESTIONS DE DROIT — « puis-je », « ai-je droit », « est-ce prescrit ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE COMPAGNON N'Y RÉPOND PAS, ET IL DIT POURQUOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Répondre à « ai-je le droit de… » pour un dossier précis, c'est donner une
 * consultation juridique (relecture du 25/09/2026, § 2). Le compagnon répond sur
 * les FAITS et les CALCULS du dossier ; à une question de droit, il montre les
 * textes du référentiel qui s'y rapportent, cite leur source, et dit qu'un
 * avocat peut répondre. Aucun appel au modèle : la réponse est composée ici,
 * avec les seuls textes relevés.
 */

/** Les tournures d'une question de droit. Large : un faux positif montre des textes, rien de plus. */
const TOURNURES = [
	/\bpuis[- ]je\b/i,
	/\bpeut[- ]on\b/i,
	/\bai[- ]je (le )?droit\b/i,
	/\bai[- ]je le droit\b/i,
	/\ba[- ]t[- ]il le droit\b/i,
	/\bdois[- ]je\b/i,
	/\bfaut[- ]il\b/i,
	/\bsuis[- ]je (obligé|tenu)/i,
	/\best[- ]ce (que c.est )?(légal|permis|autorisé|prescrit|trop tard)\b/i,
	/\best[- ]ce que (je peux|j.ai le droit|c.est prescrit|la créance est prescrite)/i,
	/\b(prescrit|prescrite)\s*\?/i,
	/\bque (dois|puis)[- ]je faire\b/i,
	/\bquelle procédure\b/i,
	/\b(conseil|conseillez|recommand)/i
];

export function estQuestionDeDroit(question: string): boolean {
	return TOURNURES.some((t) => t.test(question));
}

/** Les thèmes que le référentiel sait citer, et les entrées qui s'y rapportent. */
const THEMES: readonly {
	readonly motif: RegExp;
	readonly cles: readonly (keyof typeof PARAMETRES)[];
}[] = [
	{
		motif: /prescri|trop tard|délai pour agir|agir en justice/i,
		cles: ['delaiPrescriptionCommerciale', 'miseEnDemeureNonInterruptive']
	},
	{
		motif: /pénalit|intérêt|taux/i,
		cles: ['tauxInteretLegalDefaut', 'pointDepartPenalitesRetard']
	},
	{
		motif: /40|frais de recouvrement|indemnit/i,
		cles: ['indemniteForfaitaire', 'indemniteParFacture']
	},
	{
		motif: /injonction|tribunal|ordonnance|juge/i,
		cles: ['delaiSignificationInjonction', 'delaiOppositionInjonction']
	},
	{
		motif: /avocat/i,
		cles: ['seuilDispenseAvocatTribunalCommerce', 'seuilDispenseAvocatTribunalJudiciaire']
	},
	{
		motif: /procédure collective|liquidation|redressement|sauvegarde|déclar/i,
		cles: ['delaiDeclarationCreance', 'delaiReleveForclusion']
	},
	{
		motif: /partiel|échéancier|en plusieurs fois|acompte/i,
		cles: ['refusPaiementPartielPossible', 'imputationPaiementPartiel']
	},
	{
		motif: /relance|mise en demeure|lettre|recommandé/i,
		cles: ['modesMiseEnDemeure', 'miseEnDemeureNonInterruptive']
	}
];

/** La première phrase d'une note, qui porte l'extrait du texte. */
function extrait(p: ParametreLegalBase): string {
	const note = p.note.replace(/\s+/g, ' ').trim();
	const fin = note.search(/[.»]\s/);
	return fin > 0 ? note.slice(0, fin + 1).trim() : note;
}

/** La réponse : les textes du référentiel qui touchent la question, puis la main à l'avocat. */
export function reponseAQuestionDeDroit(question: string): readonly PhraseSourcee[] {
	const cles = new Set<keyof typeof PARAMETRES>();
	for (const theme of THEMES)
		if (theme.motif.test(question)) for (const c of theme.cles) cles.add(c);
	const phrases: PhraseSourcee[] = [
		{
			texte:
				'Cette question porte sur le droit applicable à votre dossier : ce logiciel ne la tranche pas. Il vous montre les textes qu’il emploie et les calculs du dossier.',
			genreSource: 'AUCUNE',
			reference: ''
		}
	];
	for (const cle of cles) {
		const p = PARAMETRES[cle] as ParametreLegalBase;
		phrases.push({
			texte: `${p.source} : ${extrait(p)}`,
			genreSource: 'PARAMETRE',
			reference: cle
		});
	}
	if (cles.size === 0) {
		phrases.push({
			texte:
				'Les textes employés par ce logiciel, avec leur source et leur date de relevé, sont dans « Les valeurs juridiques employées », sur la page du dossier.',
			genreSource: 'AUCUNE',
			reference: ''
		});
	}
	phrases.push({
		texte:
			'Ce que ces textes donnent pour votre cas précis, un avocat peut vous le dire. Vous pouvez lui transmettre le dossier depuis « Vos courriers ».',
		genreSource: 'AUCUNE',
		reference: ''
	});
	return phrases;
}

/** Les verdicts qu'aucune réponse du compagnon ne rend. */
export const VERDICTS_INTERDITS: readonly RegExp[] = [
	/\best remplie?\b/i,
	/\bn[’']est pas remplie?\b/i,
	/\bsont remplies?\b/i,
	/\bremplit (les|la|toutes|bien)\b/i,
	/\béligible\b/i,
	/\bmûre?s?\b/i
];
// Le conseil (« devriez », « recommande », « conseille ») est déjà retenu par B6,
// `filtrerChampLexicalProcedure` : il ne se double pas ici.
