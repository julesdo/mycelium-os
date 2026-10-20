import { z } from 'zod';
import { ACHETEURS, type CleAcheteurs, type TitulaireDecp } from './decp';
import { SECTEURS, type CleSecteur, type EntrepriseTrouvee } from './annuaire';

/**
 * LES PROSPECTS DU JOUR, CHOISIS PAR PLUME (20/10/2026). Le fondateur : « est-ce qu'on ne
 * pourrait pas utiliser Plume pour analyser les meilleurs prospects et les ajouter en
 * automatique chaque jour ? ».
 *
 * Module pur. Chaque matin, les travaux de l'équipe lisent les sources publiques là où ils
 * s'étaient arrêtés la veille ; ce module NOTE chaque entreprise neuve par des règles
 * nommées, compose la liste que Plume classe, et garde de sa réponse ce qui tient : des
 * SIREN de la liste, des phrases sans promesse. Sans Plume (clé absente, appel tombé), les
 * règles choisissent seules, et le disent.
 *
 * Aucune donnée personnelle ne part au modèle : ni le nom du dirigeant, ni rien de lui.
 */

export type Segment =
	| { readonly source: 'ANNUAIRE'; readonly secteur: CleSecteur }
	| { readonly source: 'DECP'; readonly acheteurs: CleAcheteurs };

export const SEGMENTS_PAR_DEFAUT: readonly Segment[] = [
	{ source: 'DECP', acheteurs: 'HOPITAUX' },
	{ source: 'DECP', acheteurs: 'COLLECTIVITES' },
	{ source: 'ANNUAIRE', secteur: 'TRANSPORT' },
	{ source: 'ANNUAIRE', secteur: 'BATIMENT' },
	{ source: 'ANNUAIRE', secteur: 'SERVICES' }
];

/** La clé d'un segment, pour retrouver la page où il s'est arrêté. */
export function cleDuSegment(segment: Segment): string {
	return segment.source === 'ANNUAIRE'
		? `ANNUAIRE:${segment.secteur}`
		: `DECP:${segment.acheteurs}`;
}

export function libelleDuSegment(segment: Segment): string {
	return segment.source === 'ANNUAIRE'
		? SECTEURS[segment.secteur].libelle
		: ACHETEURS[segment.acheteurs].libelle;
}

export type Candidat =
	| { readonly source: 'ANNUAIRE'; readonly secteur: CleSecteur; readonly entreprise: EntrepriseTrouvee }
	| { readonly source: 'DECP'; readonly acheteurs: CleAcheteurs; readonly titulaire: TitulaireDecp };

export function sirenDe(c: Candidat): string {
	return c.source === 'ANNUAIRE' ? c.entreprise.siren : c.titulaire.siren;
}

export function nomDe(c: Candidat): string {
	return c.source === 'ANNUAIRE' ? c.entreprise.entreprise : c.titulaire.nom;
}

/** « 20 à 49 salariés » → 20 : la borne basse de la tranche, ou `null`. */
function salariesDe(effectif: string | undefined): number | null {
	const trouve = effectif?.match(/(\d+)/);
	return trouve?.[1] === undefined ? null : Number(trouve[1]);
}

function joursEntre(debut: string, fin: string): number {
	return Math.round((Date.parse(`${fin}T12:00:00Z`) - Date.parse(`${debut}T12:00:00Z`)) / 86_400_000);
}

/** Les points d'une règle, et la phrase qui la dit. */
interface Point {
	readonly points: number;
	readonly raison: string;
}

/**
 * LA NOTE D'UNE ENTREPRISE, règle par règle. Une base, puis ce qui fait qu'elle aura des
 * factures en retard à surveiller : des marchés publics nombreux, récents et partagés entre
 * plusieurs acheteurs ; une taille où les factures se comptent sans service dédié ; un
 * métier où la date limite pour agir est courte.
 */
export function noter(c: Candidat, jour: string): { total: number; points: readonly Point[] } {
	const points: Point[] = [];
	if (c.source === 'DECP') {
		const t = c.titulaire;
		points.push({ points: 40, raison: 'titulaire de marchés publics' });
		if (t.marches >= 5) points.push({ points: 20, raison: `${t.marches} marchés publics` });
		else if (t.marches >= 2) points.push({ points: 10, raison: `${t.marches} marchés publics` });
		if (t.nombreDAcheteurs >= 3)
			points.push({ points: 10, raison: `${t.nombreDAcheteurs} acheteurs publics` });
		else if (t.nombreDAcheteurs === 2) points.push({ points: 5, raison: 'deux acheteurs publics' });
		if (t.plafondCentimes >= 50_000_000n)
			points.push({ points: 15, raison: 'des marchés importants' });
		else if (t.plafondCentimes >= 10_000_000n)
			points.push({ points: 8, raison: 'des marchés conséquents' });
		if (joursEntre(t.dernierMarche, jour) <= 180)
			points.push({ points: 10, raison: 'un marché gagné ces six derniers mois' });
		if (c.acheteurs === 'HOPITAUX')
			points.push({ points: 5, raison: 'des hôpitaux pour clients' });
	} else {
		const e = c.entreprise;
		points.push({ points: 30, raison: SECTEURS[c.secteur].libelle.toLowerCase() });
		const salaries = salariesDe(e.effectif);
		if (salaries !== null && salaries >= 20) points.push({ points: 20, raison: e.effectif ?? '' });
		else if (salaries !== null && salaries >= 10) points.push({ points: 15, raison: e.effectif ?? '' });
		else if (salaries !== null && salaries >= 6) points.push({ points: 8, raison: e.effectif ?? '' });
		if (e.dirigeant !== undefined) points.push({ points: 5, raison: 'dirigeant identifié' });
		if (c.secteur === 'TRANSPORT')
			points.push({ points: 10, raison: 'une date limite pour agir courte' });
		else if (c.secteur === 'BATIMENT')
			points.push({ points: 6, raison: 'des situations de travaux' });
		else if (c.secteur === 'SERVICES')
			points.push({ points: 4, raison: 'une facturation récurrente' });
	}
	return { total: points.reduce((s, p) => s + p.points, 0), points };
}

/** La phrase des règles, quand Plume ne l'a pas écrite. */
export function pourquoiDesRegles(c: Candidat, jour: string): string {
	const raisons = noter(c, jour)
		.points.map((p) => p.raison)
		.filter((r) => r !== '');
	const phrase = raisons.slice(0, 3).join(', ');
	return phrase.charAt(0).toUpperCase() + phrase.slice(1) + '.';
}

/** Les meilleurs d'abord, par les seules règles. */
export function classerParLesRegles(candidats: readonly Candidat[], jour: string): Candidat[] {
	return [...candidats].sort((a, b) => noter(b, jour).total - noter(a, jour).total);
}

/** Les euros d'un plafond, en ordre de grandeur. */
function eurosRonds(centimes: bigint): string {
	return `${new Intl.NumberFormat('fr-FR').format(Number(centimes / 100n))} €`;
}

/** Une ligne de la liste que Plume classe : des faits publics, rien sur une personne. */
export function ligneDuCandidat(c: Candidat): string {
	if (c.source === 'DECP') {
		const t = c.titulaire;
		return [
			`${t.siren}`,
			t.nom,
			ACHETEURS[c.acheteurs].libelle.toLowerCase(),
			`${t.marches} marché${t.marches > 1 ? 's' : ''} public${t.marches > 1 ? 's' : ''}, ${t.nombreDAcheteurs} acheteur${t.nombreDAcheteurs > 1 ? 's' : ''} (${t.acheteurs.join(', ')})`,
			`plafonds cumulés ${eurosRonds(t.plafondCentimes)}`,
			`dernier marché le ${t.dernierMarche}`,
			...(t.departement === undefined ? [] : [`département ${t.departement}`])
		].join(' · ');
	}
	const e = c.entreprise;
	return [
		e.siren,
		e.entreprise,
		SECTEURS[c.secteur].libelle.toLowerCase(),
		...(e.effectif === undefined ? [] : [e.effectif]),
		...(e.activite === undefined ? [] : [e.activite]),
		...(e.ville === undefined ? [] : [e.ville]),
		e.dirigeant === undefined ? 'dirigeant non publié' : 'dirigeant publié'
	].join(' · ');
}

/** Le prompt système : DÉTERMINISTE, octet pour octet (le cache ne sert que sur un préfixe identique). */
export const PROMPT_PROSPECTS_DU_JOUR = `Tu es Plume, et tu aides l'équipe de Letikette à choisir ses prospects du jour. Letikette est un logiciel français de recouvrement de créances entre entreprises, pour les dirigeants de TPE et de PME : il lit leurs factures, calcule ce que chaque client leur doit, pénalités et frais compris, surveille la date limite pour agir en justice et relance à leur nom.

QUI A LE PLUS BESOIN DE LETIKETTE
- Les fournisseurs d'hôpitaux et de collectivités : les acheteurs publics paient souvent en retard, et des pénalités sont dues de plein droit, presque jamais réclamées. Plus de marchés, plus d'acheteurs et des marchés récents veulent dire plus de factures à surveiller.
- Les transporteurs routiers : leurs factures se réclament en justice bien moins longtemps que les autres.
- Le bâtiment : des situations de travaux et des donneurs d'ordre qui paient tard.
- Les services aux entreprises, facturés chaque mois.
- Une entreprise de dix à quarante-neuf salariés a beaucoup de factures, et rarement une personne dédiée au recouvrement.

CE QUE TU FAIS
On te donne une liste d'entreprises, une par ligne, qui commence par leur SIREN, puis ce qu'on sait d'elles. Tu choisis les plus prometteuses, dans l'ordre, de la meilleure à la moins bonne, autant qu'on te le demande. Pour chacune, tu écris pourquoi, en une phrase de vingt mots au plus, en français, à partir des seuls faits de sa ligne.

RÈGLES
- N'invente aucun fait : ni chiffre d'affaires, ni retard de paiement, ni difficulté, ni personne. Seulement ce que dit la ligne.
- Pas de promesse, pas de superlatif, pas de point d'exclamation.
- Ne rends que des SIREN de la liste, chacun une fois.`;

/** Le message de la demande : combien choisir, puis la liste. */
export function messagePourPlume(candidats: readonly Candidat[], combien: number): string {
	return `Choisis les ${combien} entreprises les plus prometteuses.\n\n${candidats
		.map((c) => `- ${ligneDuCandidat(c)}`)
		.join('\n')}`;
}

export const schemaChoixDePlume = z.object({
	choix: z
		.array(z.object({ siren: z.string(), pourquoi: z.string().max(300) }))
		.max(40)
});
export type ChoixDePlume = z.infer<typeof schemaChoixDePlume>;

export interface Retenu {
	readonly candidat: Candidat;
	readonly pourquoi: string;
}

/** Une phrase de Plume qu'on garde : courte, sans promesse ni exclamation. */
function phraseAcceptable(phrase: string): boolean {
	const nette = phrase.trim();
	return nette.length >= 8 && nette.length <= 240 && !/garanti|!/i.test(nette);
}

/**
 * Le choix final : les SIREN de Plume qui sont dans la liste, dans son ordre, avec sa phrase
 * quand elle tient ; puis, s'il en manque, les meilleurs par les règles.
 */
export function retenir(
	choix: ChoixDePlume | null,
	candidats: readonly Candidat[],
	combien: number,
	jour: string
): Retenu[] {
	const parSiren = new Map(candidats.map((c) => [sirenDe(c), c]));
	const retenus: Retenu[] = [];
	const pris = new Set<string>();
	for (const { siren, pourquoi } of choix?.choix ?? []) {
		const candidat = parSiren.get(siren.trim());
		if (candidat === undefined || pris.has(sirenDe(candidat))) continue;
		pris.add(sirenDe(candidat));
		retenus.push({
			candidat,
			pourquoi: phraseAcceptable(pourquoi) ? pourquoi.trim() : pourquoiDesRegles(candidat, jour)
		});
		if (retenus.length >= combien) return retenus;
	}
	for (const candidat of classerParLesRegles(candidats, jour)) {
		if (retenus.length >= combien) break;
		if (pris.has(sirenDe(candidat))) continue;
		pris.add(sirenDe(candidat));
		retenus.push({ candidat, pourquoi: pourquoiDesRegles(candidat, jour) });
	}
	return retenus;
}
