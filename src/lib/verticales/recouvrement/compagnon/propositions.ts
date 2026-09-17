/**
 * LE PLAFOND DES PROPOSITIONS, ET LES TROIS NOMBRES QUI LE DÉPLACERONT (D13).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN PLAFOND, ET POURQUOI ICI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Quarante propositions par jour produisent quarante « Retenir » à l'aveugle,
 * donc une piste d'audit qui MENT — strictement pire que l'état où le gérant
 * sait au moins qu'il a coché lui-même. L'erreur est ASYMÉTRIQUE : une file
 * trop courte se rattrape au passage suivant, une piste d'audit qui ment ne se
 * rattrape pas.
 *
 * Ce module ne lit ni base, ni horloge, ni interface. Il prend des candidats
 * ordonnés et rend ce qui se pose, ce qui attend, et de combien. Il est donc
 * rejouable et testable sans harnais, ce qui compte pour une règle dont la
 * valeur est appelée à BOUGER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ORDRE D'ENTRÉE EST L'ORDRE DE PRIORITÉ, ET CE MODULE NE TRIE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trier ici demanderait de connaître l'urgence, la date d'échéance et le
 * montant — c'est-à-dire la règle de `surveillance.ts`, qui a déjà son
 * comparateur. Deux ordres pour une même situation seraient deux vérités, et
 * c'est exactement ce que `comparerEvenements` existe pour empêcher.
 */

/**
 * D'où sort une proposition. Sans source, il n'y a pas de proposition.
 *
 * ⚠️ DEUX NATURES ET PAS TROIS, ET C'EST UNE CONTRAINTE SUR LES PRODUCTEURS.
 * Une pièce du client avec sa page, ou une entrée du référentiel juridique avec
 * sa clé. Un constat qui ne résout ni vers l'une ni vers l'autre ne se pose
 * pas : il serait affiché sans pouvoir être vérifié ni corrigé le jour où la
 * valeur change (§ 5.5, B3).
 *
 * C'est le miroir de `vSourceConstat` (`convex/recouvrement/tables.ts`), écrit
 * ici pour que le domaine ne dépende pas de la plateforme.
 */
export type SourceConstat =
	| { readonly nature: 'PIECE'; readonly pieceId: string }
	| { readonly nature: 'REFERENTIEL'; readonly cleParametre: string };

/**
 * SEPT PAR JOUR CALENDAIRE ET PAR ÉTABLISSEMENT — UNE HYPOTHÈSE DATÉE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE EST ÉCRITE POUR ÊTRE DÉPLACÉE, ET SUR DES NOMBRES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * D'où sort le sept, le 17 septembre 2026 : du budget de temps mesuré — cinq
 * minutes par session de travail — et du fait qu'une proposition se LIT avant
 * d'être tapée, sa phrase, sa source et sa page. Sept lues et décidées tiennent
 * dans cinq minutes. Au-delà, le gérant ne décide plus, il acquitte.
 *
 * Ce n'est PAS un relevé, et aucun des trois nombres qui le calibreront
 * n'existe avant les premiers utilisateurs. `mesurerLeJour` les rend, et
 * `/app/compte` les affiche, précisément pour que la réponse à une file
 * décevante soit le déplacement de cette constante et pas l'abandon du lot.
 *
 * COMMENT ELLE BOUGE : elle DESCEND quand le taux de rétention monte pendant
 * que le délai médian descend — les deux ensemble, jamais l'un seul. Elle ne
 * MONTE que si le taux de correction après coup reste à zéro sur un mois plein,
 * chez plusieurs établissements.
 *
 * ⚠️ JOURS CALENDAIRES, PAS OUVRÉS. Aucun calendrier de jours ouvrés ni de
 * fériés n'existe au dépôt, et en inventer un poserait une règle de date hors
 * de `parametres.ts`. Le premier garde-fou ci-dessous rend le week-end
 * inoffensif : une échéance qui éteint un droit ne compte jamais dans les sept.
 */
export const PROPOSITIONS_PAR_JOUR = 7;

/**
 * Trois au plus sur une même rangée ouverte.
 *
 * La règle de GRAIN, distincte du plafond du jour : sept propositions toutes
 * posées sur le même dossier feraient sept décisions sur un seul écran, ce qui
 * est le rythme d'acquittement que le plafond existe pour empêcher. La rangée
 * est la CIBLE — un client, une créance —, parce que c'est elle qui s'ouvre.
 */
export const PROPOSITIONS_PAR_RANGEE = 3;

/**
 * Un constat prêt à être posé.
 *
 * `eteintUnDroit` n'est pas un ornement : c'est le premier garde-fou, et il est
 * porté par le CANDIDAT plutôt que déduit du champ à la lecture, pour qu'un
 * producteur neuf soit obligé de répondre à la question.
 */
export interface CandidatProposition {
	/** L'identifiant du document visé, en chaîne. C'est aussi la rangée. */
	readonly cible: string;
	/** Le champ visé, tel que le domaine le nomme. */
	readonly champ: string;
	/** La valeur proposée, en toutes lettres. */
	readonly valeur: string;
	readonly source: SourceConstat;
	/**
	 * ⚠️ LE PREMIER GARDE-FOU. Une prescription, une forclusion, une caducité :
	 * une échéance qui éteint un droit ne compte JAMAIS dans les sept et n'est
	 * JAMAIS différée. Un plafond qui avale la seule chose pour laquelle le
	 * produit existe est pire que pas de plafond.
	 */
	readonly eteintUnDroit: boolean;
}

/** Ce qu'une proposition déjà posée ce jour-là coûte au plafond. */
export interface DejaPosee {
	readonly cible: string;
	readonly eteintUnDroit: boolean;
}

export interface PosePlafonnee {
	/** Ce qui se pose maintenant, dans l'ordre reçu. */
	readonly aPoser: readonly CandidatProposition[];
	/**
	 * ⚠️ LE SECOND GARDE-FOU. Ce qui dépasse est COMPTÉ, jamais tronqué en
	 * silence. C'est le défaut de `MODE_COMPACT` (`accueil.tsx:164`), où les
	 * alertes 4 à N n'étaient atteignables nulle part.
	 */
	readonly enAttente: number;
	/** Combien sont passés SANS compter dans les sept, parce qu'ils éteignent un droit. */
	readonly horsPlafond: number;
}

/**
 * Ce qui se pose aujourd'hui, et ce qui attend.
 *
 * ⚠️ UN CANDIDAT QUI ÉTEINT UN DROIT NE PASSE PAR AUCUN DES DEUX COMPTEURS.
 * Ni celui du jour, ni celui de la rangée : il est posé, il ne consomme rien,
 * et il ne peut donc pas repousser un autre. C'est le sens exact de « le
 * plafond ne s'applique jamais à une échéance qui éteint un droit ».
 */
export function plafonner(
	candidats: readonly CandidatProposition[],
	dejaPosees: readonly DejaPosee[] = []
): PosePlafonnee {
	let comptees = 0;
	const parRangee = new Map<string, number>();

	for (const posee of dejaPosees) {
		if (posee.eteintUnDroit) continue;
		comptees += 1;
		parRangee.set(posee.cible, (parRangee.get(posee.cible) ?? 0) + 1);
	}

	const aPoser: CandidatProposition[] = [];
	let enAttente = 0;
	let horsPlafond = 0;

	for (const candidat of candidats) {
		if (candidat.eteintUnDroit) {
			aPoser.push(candidat);
			horsPlafond += 1;
			continue;
		}

		const surLaRangee = parRangee.get(candidat.cible) ?? 0;
		if (comptees >= PROPOSITIONS_PAR_JOUR || surLaRangee >= PROPOSITIONS_PAR_RANGEE) {
			enAttente += 1;
			continue;
		}

		aPoser.push(candidat);
		comptees += 1;
		parRangee.set(candidat.cible, surLaRangee + 1);
	}

	return { aPoser, enAttente, horsPlafond };
}

/**
 * CE QUI DÉPASSE, NOMMÉ — « 7 propositions aujourd'hui, 12 autres en attente ».
 *
 * ⚠️ ELLE NE REND JAMAIS UNE PHRASE MUETTE QUAND IL RESTE QUELQUE CHOSE. C'est
 * la forme exécutable du second garde-fou : un écran qui appelle cette fonction
 * ne peut pas taire le reste, et un écran qui ne l'appelle pas se voit, parce
 * que le compte n'apparaît alors nulle part.
 */
export function resumeDuPlafond(posees: number, enAttente: number): string {
	const aujourdHui = `${posees} proposition${posees > 1 ? 's' : ''} aujourd’hui`;
	if (enAttente <= 0) return `${aujourdHui}, rien en attente.`;
	return `${aujourdHui}, ${enAttente} autre${enAttente > 1 ? 's' : ''} en attente.`;
}

/**
 * UNE ÉCHÉANCE QUI ÉTEINT UN DROIT, LUE SUR UN ÉVÉNEMENT DE SURVEILLANCE.
 *
 * ⚠️ DEUX CAS, ET LE SECOND SE LIT SUR L'URGENCE PARCE QUE L'ÉVÉNEMENT NE
 * PORTE PAS SA GRAVITÉ. `surveillance.ts` pose `urgence: 'CRITIQUE'` sur une
 * `ECHEANCE_PROCEDURE` si et seulement si sa gravité est `CADUCITE`, c'est-à-
 * dire « passée cette date, le droit est perdu » ; toute autre échéance de
 * procédure sort en `HAUTE`. La déduction est donc exacte aujourd'hui, et elle
 * est écrite ICI, à un seul endroit, plutôt que répétée chez chaque producteur.
 *
 * ⚠️ ET ELLE EST CONSERVATRICE PAR CONSTRUCTION : se tromper en exemptant fait
 * poser une proposition de trop, se tromper en comptant fait taire une échéance
 * qui éteint un droit. Les deux erreurs n'ont pas le même prix.
 */
export function eteintUnDroit(evenement: {
	readonly type: string;
	readonly urgence: string;
}): boolean {
	if (evenement.type === 'PRESCRIPTION_PROCHE') return true;
	return evenement.type === 'ECHEANCE_PROCEDURE' && evenement.urgence === 'CRITIQUE';
}

/** Le champ d'un constat de prescription, nommé une fois. */
export const CHAMP_PRESCRIPTION = 'PRESCRIPTION';

/**
 * LES CHAMPS DONT UNE PROPOSITION NE COMPTE JAMAIS DANS LES SEPT.
 *
 * ⚠️ IL EN FAUT DEUX LECTURES, ET C'EST POURQUOI ELLES VIVENT CÔTE À CÔTE. À la
 * POSE, l'exemption se lit sur l'ÉVÉNEMENT qui produit le candidat
 * (`eteintUnDroit`). Au RECOMPTE — ce qui a déjà été posé aujourd'hui —
 * l'événement n'existe plus : il ne reste que le champ écrit en base. Les deux
 * doivent dire la même chose, sans quoi une prescription posée le matin
 * consommerait une des sept places de l'après-midi, en silence.
 *
 * ⚠️ UN SEUL CHAMP AUJOURD'HUI, ET LA CADUCITÉ N'Y EST PAS — parce qu'AUCUNE
 * proposition de caducité n'est posée. `eteintUnDroit` la reconnaît bien, mais
 * aucune entrée de `parametres.ts` ne nomme le délai dont elle sort : un constat
 * qui ne résout vers aucune source ne se rend pas (B3). Le jour où ce délai est
 * relevé, son champ entre ici EN MÊME TEMPS que son producteur.
 */
export const CHAMPS_QUI_ETEIGNENT_UN_DROIT: ReadonlySet<string> = new Set([CHAMP_PRESCRIPTION]);

/** L'exemption, relue sur une proposition déjà en base. */
export function champEteintUnDroit(champ: string): boolean {
	return CHAMPS_QUI_ETEIGNENT_UN_DROIT.has(champ);
}

// ── Les trois nombres (§ 10, Q3) ────────────────────────────────────────────

/** Une proposition du jour, réduite à ce que la mesure lit. */
export interface LigneMesuree {
	readonly etat: 'PROPOSEE' | 'RETENUE' | 'ECARTEE';
	readonly afficheeLe?: number;
	readonly decideeLe?: number;
	/** Retenue, PUIS corrigée. Lu dans le journal, jamais dans la proposition. */
	readonly corrigee: boolean;
}

export interface MesuresDuJour {
	readonly jour: string;
	readonly posees: number;
	/** Ce que le plafond a différé ce jour-là, ou `null` si le battement n'a rien relevé. */
	readonly enAttente: number | null;
	readonly retenues: number;
	readonly ecartees: number;
	/** Posées et jamais décidées. Ni retenues, ni écartées : inconnues. */
	readonly indecises: number;
	/** 1. Retenues / décidées. `null` tant qu'aucune décision n'a été prise. */
	readonly tauxRetention: number | null;
	/** 2. La médiane du délai entre l'affichage et l'appui. `null` sans horodatage. */
	readonly delaiMedianMs: number | null;
	/**
	 * ⚠️ CE QUI MANQUE À LA MÉDIANE, COMPTÉ PLUTÔT QU'ÉCARTÉ EN SILENCE. Une
	 * décision sans horodatage d'affichage ne vaut pas un délai de zéro : elle
	 * vaut un trou, et un trou qu'on ne compte pas fait lire une médiane comme
	 * si elle portait sur tout.
	 */
	readonly decideesSansHorodatage: number;
	/** 3. Le nombre de retenues corrigées après coup. */
	readonly corrections: number;
	/** 3. Corrections / retenues. `null` tant que rien n'a été retenu. */
	readonly tauxCorrection: number | null;
}

/**
 * LES TROIS NOMBRES D'UN JOUR, POUR UN ÉTABLISSEMENT.
 *
 * ⚠️ LE TROISIÈME EST LE SEUL QUI NE SOIT PAS AUTO-RÉFÉRENTIEL, et c'est pour
 * ça qu'il est le plus cher à obtenir : la correction vient du monde réel — le
 * montant était faux, le débiteur n'était pas le bon — et pas de l'interface.
 * Les deux premiers mesurent COMMENT on tape ; celui-ci mesure si on avait
 * raison.
 *
 * ⚠️ ET LES DEUX PREMIERS SE LISENT ENSEMBLE OU NE DISENT RIEN. Un taux de
 * rétention au-dessus de 95 % PENDANT que le nombre de propositions monte n'est
 * pas de la justesse, c'est du « Retenir » à l'aveugle. `posees` est donc rendu
 * à côté, toujours, et jamais en option.
 *
 * ⚠️ AUCUN DE CES NOMBRES N'EST UN SCORE MONTRÉ SUR UNE CRÉANCE (D8). Ils
 * portent sur un JOUR d'un établissement, ils vivent dans une section repliée
 * de `/app/compte`, et rien de tout cela n'approche une rangée de la file.
 */
export function mesurerLeJour(
	jour: string,
	lignes: readonly LigneMesuree[],
	enAttente: number | null
): MesuresDuJour {
	const retenues = lignes.filter((l) => l.etat === 'RETENUE').length;
	const ecartees = lignes.filter((l) => l.etat === 'ECARTEE').length;
	const decidees = retenues + ecartees;

	const delais: number[] = [];
	let decideesSansHorodatage = 0;
	for (const ligne of lignes) {
		if (ligne.etat === 'PROPOSEE') continue;
		if (ligne.decideeLe === undefined || ligne.afficheeLe === undefined) {
			decideesSansHorodatage += 1;
			continue;
		}
		// Jamais négatif : une horloge qui recule ne produit pas une lecture
		// instantanée, elle produit une mesure inexploitable.
		delais.push(Math.max(0, ligne.decideeLe - ligne.afficheeLe));
	}

	const corrections = lignes.filter((l) => l.corrigee).length;

	return {
		jour,
		posees: lignes.length,
		enAttente,
		retenues,
		ecartees,
		indecises: lignes.length - decidees,
		tauxRetention: decidees === 0 ? null : retenues / decidees,
		delaiMedianMs: mediane(delais),
		decideesSansHorodatage,
		corrections,
		tauxCorrection: retenues === 0 ? null : corrections / retenues
	};
}

/**
 * La médiane, ou `null` sur une série vide.
 *
 * LA MÉDIANE ET PAS LA MOYENNE, parce qu'un seul onglet laissé ouvert une nuit
 * emporterait une moyenne et ferait passer sept taps pour sept lectures.
 */
export function mediane(valeurs: readonly number[]): number | null {
	if (valeurs.length === 0) return null;
	const triees = [...valeurs].sort((a, b) => a - b);
	const milieu = Math.floor(triees.length / 2);
	if (triees.length % 2 === 1) return triees[milieu]!;
	return (triees[milieu - 1]! + triees[milieu]!) / 2;
}
