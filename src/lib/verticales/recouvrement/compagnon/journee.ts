import { pluriel } from '../../../socle/francais';
import type { RemarqueDePlume } from './presence';

/**
 * LA JOURNÉE DE PLUME — ce qui vous attend aujourd'hui, ce qui est fait, et la série
 * de jours tenus (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN JEU DANS UN LOGICIEL DE RECOUVREMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « va voir sur Duolingo […] un game changer sur l'accompagnement et
 * le côté un peu gamifié ». Chez Duolingo, trois défis du jour avec leur barre, une
 * série de jours avec la semaine cochée, et une fête à chaque victoire (Mobbin,
 * 13/10). Ici, le jeu est le travail lui-même, et rien d'autre :
 *
 *   · les DÉFIS sont ce qui attend le gérant et que Plume ne peut pas faire à sa
 *     place : démarrer les dossiers préparés, relire les lettres, répondre aux
 *     questions. Ni points ni récompense : la barre dit ce qui est fait ;
 *   · une journée est TENUE quand plus rien n'attend, ou quand rien n'attendait ;
 *   · la SÉRIE compte les jours tenus d'affilée. Un week-end ne la casse pas : on
 *     ne relance personne le dimanche.
 *
 * ⚠️ JAMAIS DE REPROCHE. Une série qui retombe ne se dit pas ; elle repart. Duo
 * culpabilise, Plume non : il travaille pour le gérant, pas l'inverse.
 */

export const GENRES_DU_JOUR = ['demarrer', 'relire', 'repondre'] as const;
export type GenreDuJour = (typeof GENRES_DU_JOUR)[number];
export type ParGenre = Readonly<Record<GenreDuJour, number>>;

/** Le nom de chaque défi, comme Duolingo nomme les siens : un verbe et son objet. */
export const NOM_DU_DEFI: Readonly<Record<GenreDuJour, string>> = {
	demarrer: 'Démarrer les dossiers préparés',
	relire: 'Relire les lettres',
	repondre: 'Répondre aux questions'
};

export const AUCUN: ParGenre = { demarrer: 0, relire: 0, repondre: 0 };

export function somme(parGenre: ParGenre): number {
	return parGenre.demarrer + parGenre.relire + parGenre.repondre;
}

/* ─────────────────────────────────────────────────────────────────────────
   Les jours, à Paris.
   ───────────────────────────────────────────────────────────────────────── */

const FORMAT_DU_JOUR = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Europe/Paris',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** Le jour (`AAAA-MM-JJ`) qu'il est à Paris à cet instant : une journée se vit à Paris. */
export function jourDeParis(instant: number): string {
	return FORMAT_DU_JOUR.format(new Date(instant));
}

/** Le jour décalé de `n` jours (négatif : en arrière). Midi UTC : aucune heure d'été ne le fait glisser. */
export function decalerJour(jour: string, n: number): string {
	const date = new Date(`${jour}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + n);
	return date.toISOString().slice(0, 10);
}

/** Lundi 0, dimanche 6. */
export function rangDansLaSemaine(jour: string): number {
	return (new Date(`${jour}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/* ─────────────────────────────────────────────────────────────────────────
   L'avancement du jour.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * CE QU'IL Y AVAIT À FAIRE AUJOURD'HUI, AU PLUS : le plus haut relevé de la journée,
 * genre par genre. Ce qui arrive en cours de journée s'ajoute ; ce qui est fait ne
 * se retire pas du total.
 */
export function fusionner(max: ParGenre | null, restants: ParGenre): ParGenre {
	return {
		demarrer: Math.max(max?.demarrer ?? 0, restants.demarrer),
		relire: Math.max(max?.relire ?? 0, restants.relire),
		repondre: Math.max(max?.repondre ?? 0, restants.repondre)
	};
}

export interface DefiDuJour {
	readonly genre: GenreDuJour;
	readonly nom: string;
	readonly fait: number;
	readonly total: number;
}

export interface Avancement {
	readonly faits: number;
	readonly total: number;
	/** Seulement les défis qui ont eu quelque chose à faire aujourd'hui. */
	readonly defis: readonly DefiDuJour[];
}

export function avancement(max: ParGenre, restants: ParGenre): Avancement {
	const defis = GENRES_DU_JOUR.filter((genre) => max[genre] > 0).map((genre) => ({
		genre,
		nom: NOM_DU_DEFI[genre],
		fait: Math.max(0, max[genre] - restants[genre]),
		total: max[genre]
	}));
	return {
		faits: defis.reduce((n, d) => n + d.fait, 0),
		total: defis.reduce((n, d) => n + d.total, 0),
		defis
	};
}

/* ─────────────────────────────────────────────────────────────────────────
   La série, et la semaine.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * LES JOURS TENUS D'AFFILÉE, jusqu'à aujourd'hui.
 *
 * ⚠️ AUJOURD'HUI NE CASSE RIEN TANT QU'IL N'EST PAS FINI : non tenu, il ne compte pas
 * encore, et la série d'hier tient. Un samedi ou un dimanche ne la cassent jamais ;
 * tenus (on a ouvert l'application et rien n'attendait), ils comptent.
 */
export function serieDeJours(tenues: ReadonlyMap<string, boolean>, aujourdHui: string): number {
	let serie = 0;
	let jour = aujourdHui;
	for (let i = 0; i < 400; i++) {
		const tenue = tenues.get(jour) === true;
		const weekEnd = rangDansLaSemaine(jour) >= 5;
		if (tenue) serie += 1;
		else if (jour !== aujourdHui && !weekEnd) break;
		jour = decalerJour(jour, -1);
	}
	return serie;
}

export type EtatDuJour = 'TENUE' | 'MANQUEE' | 'AUJOURDHUI' | 'AVENIR' | 'REPOS';

export interface JourDeLaSemaine {
	readonly jour: string;
	/** L, M, M, J, V, S, D. */
	readonly lettre: string;
	readonly etat: EtatDuJour;
}

const LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/** LA SEMAINE EN COURS, du lundi au dimanche : la rangée de coches de Duolingo. */
export function semaineEnCours(
	tenues: ReadonlyMap<string, boolean>,
	aujourdHui: string
): readonly JourDeLaSemaine[] {
	const lundi = decalerJour(aujourdHui, -rangDansLaSemaine(aujourdHui));
	return LETTRES.map((lettre, rang) => {
		const jour = decalerJour(lundi, rang);
		const tenue = tenues.get(jour) === true;
		const etat: EtatDuJour =
			jour > aujourdHui
				? 'AVENIR'
				: tenue
					? 'TENUE'
					: jour === aujourdHui
						? 'AUJOURDHUI'
						: rang >= 5
							? 'REPOS'
							: 'MANQUEE';
		return { jour, lettre, etat };
	});
}

/* ─────────────────────────────────────────────────────────────────────────
   Ce que Plume en dit.
   ───────────────────────────────────────────────────────────────────────── */

/** LA JOURNÉE BOUCLÉE — dite une fois, quand le dernier défi tombe sous les yeux du gérant. */
export function paroleDeLaJourneeBouclee(jour: string, serie: number): RemarqueDePlume {
	return {
		cle: `journee-bouclee:${jour}`,
		texte:
			serie <= 1
				? 'Tout ce qui vous attendait aujourd’hui est fait. Votre première journée bouclée !'
				: `Tout ce qui vous attendait aujourd’hui est fait : ${serie} jours d’affilée sans rien laisser traîner.`,
		humeur: 'fete',
		silence: 'UNE_FOIS'
	};
}

export interface ElementDuJour {
	readonly dossier: string;
	readonly client: string;
}

/**
 * CE QUI ATTEND LE GÉRANT, DIT PAR PLUME — un défi chacun, avec le geste qui y mène.
 * Les clés portent le compte : un dossier de plus préparé fait une parole nouvelle.
 */
export function besoinsDuJour(
	restants: ParGenre,
	premiers: { readonly lettre: ElementDuJour | null; readonly question: ElementDuJour | null }
): RemarqueDePlume[] {
	const besoins: RemarqueDePlume[] = [];
	const n = restants.demarrer;
	if (n > 0)
		besoins.push({
			cle: `a-demarrer:${n}`,
			texte:
				n === 1
					? 'J’ai préparé le dossier d’un client en retard. Je ne le relance pas avant votre feu vert.'
					: `J’ai préparé ${n} dossiers de clients en retard. Je ne relance rien avant votre feu vert.`,
			humeur: 'attention',
			silence: 'AU_REFUS',
			action: { libelle: n === 1 ? 'Le voir' : 'Les voir', cible: { genre: 'DEMARRER_LOT' } }
		});
	const lettre = premiers.lettre;
	if (restants.relire > 0 && lettre !== null)
		besoins.push({
			cle: `lettres:${restants.relire}:${lettre.dossier}`,
			texte:
				restants.relire === 1
					? `La lettre de ${lettre.client} attend votre relecture. Je ne l’envoie pas avant.`
					: `${restants.relire} lettres attendent votre relecture, dont celle de ${lettre.client}. Je n’en envoie aucune avant.`,
			humeur: 'attention',
			silence: 'AU_REFUS',
			action: {
				libelle: 'La relire',
				cible: { genre: 'DOSSIER', dossier: lettre.dossier, rubrique: 'courriers' }
			}
		});
	const question = premiers.question;
	if (restants.repondre > 0 && question !== null)
		besoins.push({
			cle: `questions:${restants.repondre}:${question.dossier}`,
			texte:
				restants.repondre === 1
					? `Une question vous attend sur ${question.client}. Vous seul savez y répondre.`
					: `${restants.repondre} questions vous attendent, dont une sur ${question.client}. Vous seul savez y répondre.`,
			humeur: 'attention',
			silence: 'AU_REFUS',
			action: { libelle: 'Répondre', cible: { genre: 'AUJOURDHUI' } }
		});
	return besoins;
}

/** LE TITRE DE LA JOURNÉE, en tête de la scène : « 2 sur 5 aujourd'hui ». */
export function titreDeLaJournee(avance: Avancement, tenue: boolean): string {
	if (avance.total === 0) return 'Rien ne vous attend aujourd’hui';
	if (tenue) return 'Journée bouclée';
	return `${avance.faits} sur ${avance.total} aujourd’hui`;
}

/** LA SÉRIE EN MOTS : rien sous deux jours, pour ne rien promettre d'un premier jour. */
export function serieEnMots(serie: number): string | null {
	return serie >= 2 ? `${serie} jour${pluriel(serie)} d’affilée` : null;
}
