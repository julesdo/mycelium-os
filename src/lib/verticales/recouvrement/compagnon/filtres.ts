import { LEGAL_CONFIG, SITE_CANONIQUE } from '../../../config/legal';
import { PARAMETRES } from '../parametres';
import { composerRefus, type Refus } from './refus';
import { VERDICTS_INTERDITS } from './question-de-droit';

/**
 * LES CINQ FILTRES AVANT RENDU.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE MODULE EXISTE, ET CE QU'IL CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le dépôt sait balayer du CODE. `src/ui/__tests__/lignes-rouges.test.ts` lit
 * les chaînes de tous les fichiers qui parlent à l'utilisateur et refuse un
 * lexique. C'est une bonne barrière, et elle reste : elle attrape ce qu'un
 * développeur écrit.
 *
 * Elle ne peut rien contre ce qu'un modèle compose à l'exécution, et elle rate
 * aussi ce qu'un développeur écrit autrement qu'attendu. Son motif de ligne
 * rouge 3 est une liste d'IMPÉRATIFS. Il laisse donc passer, mot pour mot :
 *
 *   · « Vous pourriez saisir le tribunal » : aucun impératif.
 *   · « La voie la plus rapide ici est l'injonction de payer » : aucun
 *     impératif non plus, et ça CLASSE une voie, ce que même l'écran des
 *     procédures ne fait pas.
 *   · « Examiner les procédures envisageables pour cette creance. » : c'est du
 *     texte qui a vécu des semaines EN PRODUCTION, dans le champ `action` de
 *     l'événement de créance mûre.
 *
 * Même trou sur le droit : « ce type de créance se prescrit par cinq ans » ne
 * cite aucun article, donc aucun balayage de source citée ne le voit, et c'est
 * l'énoncé le PLUS dangereux des deux, parce qu'il n'a même pas l'air d'une
 * citation qu'on pourrait aller vérifier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA FORME : AU POINT D'USAGE, ET JAMAIS UNE RÉÉCRITURE SILENCIEUSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque filtre s'applique AVANT RENDU, sur la sortie elle-même, et LÈVE en
 * nommant le terme trouvé. Aucun ne corrige, ne masque ni ne remplace : un
 * filtre qui répare tout seul cache le défaut au lieu de le montrer, et la
 * phrase suivante repart du même endroit sans que personne ne l'ait su.
 *
 * Ce qui est levé porte un `Refus` en quatre parties (D0, B14) : ce que le
 * produit fait tout de suite, ce qui manque, ce qui le lève, ce que l'attente
 * coûte. L'appelant rend le refus À LA PLACE de la phrase retenue. Rien ne
 * s'affiche de ce que le modèle a écrit, et le gérant lit pourquoi.
 *
 * ⚠️ LE LEXIQUE EST LARGE, DONC IL MORDRA SUR DES PHRASES LÉGITIMES. C'est
 * voulu, et l'asymétrie le justifie : une suggestion refusée se réécrit, une
 * recommandation de procédure rendue ne se rattrape pas.
 *
 * ⚠️ CE QUI NE PASSE PAS PAR ICI, ET POURQUOI. L'énumération des voies du
 * volet de preuve est DÉTERMINISTE : elle sort de `procedures.ts`, sans ordre
 * et sans classement. C'est la frontière exacte de la ligne rouge 3 : le
 * produit a le droit d'énumérer sans ordre ce que du code écrit ; le compagnon
 * n'a pas le droit d'en parler.
 *
 * ⚠️ CE MODULE N'IMPORTE AUCUN MODULE DE PAYS (B15), et un cas de
 * `src/lib/socle/__tests__/frontiere.test.ts` le tient. Le droit se résout par
 * le REGISTRE, `parametres.ts`, qui nomme lui-même le module de pays dans
 * `resoluPar`. Un compagnon qui importerait `pays/france/` deviendrait le
 * dix-neuvième endroit du dépôt qui choisit la France par un chemin d'import,
 * et il faudrait le réécrire phrase par phrase au second pays.
 */

/** La barrière qui a mordu. Le refus la nomme, pour qu'on sache quoi relire. */
export type Barriere = 'B2' | 'B3' | 'B4' | 'B6' | 'B11' | 'B16';

/**
 * Ce qui relie un fragment de phrase à sa source, et sans quoi il n'est pas
 * rendu.
 *
 * `extrait` est le morceau de texte que la pastille couvre, MOT POUR MOT. Une
 * pastille dont l'extrait ne se retrouve pas dans le texte ne couvre rien :
 * elle ne lève aucun refus, et l'énoncé qu'elle prétendait porter tombe. Le
 * doute ne profite jamais au produit.
 *
 * ⚠️ `cle` EST UNE CHAÎNE, PAS `keyof typeof PARAMETRES`, ET C'EST VOULU. Une
 * pastille peut sortir d'un modèle ou d'une base : le compilateur ne peut rien
 * vouloir d'elle. La résolution se vérifie donc à l'exécution, contre le
 * registre, au moment où la phrase allait être rendue.
 */
export type Pastille =
	| { readonly genre: 'PARAMETRE'; readonly extrait: string; readonly cle: string }
	| { readonly genre: 'DECOMPTE'; readonly extrait: string; readonly decompteId: string }
	| { readonly genre: 'PIECE'; readonly extrait: string; readonly pieceId: string };

/** Ce que le compagnon veut rendre : un texte, et les pastilles qui l'ancrent. */
export interface SortieCompagnon {
	readonly texte: string;
	readonly pastilles: readonly Pastille[];
}

/** Les seules organisations qu'un brouillon au débiteur a le droit de nommer. */
export interface PartiesDuBrouillon {
	readonly creancier: string;
	readonly debiteur: string;
	/** Le carnet d'intervenants, et toute autre organisation connue du dossier. */
	readonly tiers: readonly string[];
}

/**
 * Ce qu'un filtre lève. Il porte le refus en quatre parties ET le terme trouvé,
 * séparément : le premier est fait pour l'écran, le second pour la mesure.
 */
export class RefusDeRendu extends Error {
	readonly barriere: Barriere;
	readonly terme: string;
	readonly refus: Refus;

	constructor(barriere: Barriere, terme: string, refus: Refus) {
		super(`${barriere} : « ${terme} » retenu avant rendu. ${refus.constat}`);
		this.name = 'RefusDeRendu';
		this.barriere = barriere;
		this.terme = terme;
		this.refus = refus;
	}
}

/**
 * Un motif de mot, avec des frontières qui connaissent les accents.
 *
 * ⚠️ `\b` NE SUFFIT PAS ICI, ET L'ÉCHEC SERAIT SILENCIEUX. La classe `\w` de
 * JavaScript ignore les lettres accentuées : un motif borné par `\b` ne trouve
 * rien dans « un référé », parce que le `é` final n'est pas un caractère de
 * mot et qu'il n'y a donc aucune frontière après lui. La moitié du lexique
 * juridique français porte un accent ; les frontières se construisent donc sur
 * `\p{L}`.
 */
function mot(motif: string): RegExp {
	return new RegExp(`(?<![\\p{L}\\p{N}])(?:${motif})(?![\\p{L}\\p{N}])`, 'giu');
}

interface Occurrence {
	readonly terme: string;
	readonly debut: number;
	readonly fin: number;
}

function occurrences(texte: string, motif: RegExp): Occurrence[] {
	const trouvees: Occurrence[] = [];
	for (const trouve of texte.matchAll(motif)) {
		const debut = trouve.index;
		trouvees.push({ terme: trouve[0], debut, fin: debut + trouve[0].length });
	}
	return trouvees;
}

/** La première occurrence dans le TEXTE, pas dans l'ordre du lexique. */
function premiereOccurrence(texte: string, motifs: readonly RegExp[]): Occurrence | undefined {
	let retenue: Occurrence | undefined;
	for (const motif of motifs) {
		for (const trouvee of occurrences(texte, motif)) {
			if (retenue === undefined || trouvee.debut < retenue.debut) retenue = trouvee;
		}
	}
	return retenue;
}

// ═══════════════════════════════════════════════════════════════════════════
// B2 — LE LEXIQUE INTERDIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le lexique de la promesse de résultat.
 *
 * ⚠️ LE PREMIER RADICAL EST ÉCRIT EN DEUX MORCEAUX, ET CE N'EST PAS UNE
 * COQUETTERIE. `lignes-rouges.test.ts` balaie `src/lib/verticales/` et refuse
 * ce radical dans toute chaîne de code. Ce module est le seul du dépôt qui
 * doive NOMMER l'interdit pour le refuser : l'écrire d'un seul tenant rendrait
 * rouge la barrière qu'il sert. La classe d'un seul caractère garde le motif
 * exact sans que le mot y figure contigu.
 *
 * ⚠️ ON BALAIE LE RADICAL, PAS UNE LISTE DE FORMES. La leçon est déjà écrite
 * au dépôt : une première version énumérait les formes dont on se souvenait et
 * laissait passer l'adjectif, c'est-à-dire la promesse elle-même dans sa
 * formulation la plus commerciale.
 */
const LEXIQUE_INTERDIT: readonly RegExp[] = [
	mot('garant[i]\\p{L}*'),
	mot("assur[ée]e?s?\\s+d[e’']"),
	mot('récupér\\p{L}*\\s+ce\\s+qui\\s+vous\\s+est\\s+dû'),
	mot('ne\\s+perdez\\s+plus'),
	mot('sécuris\\p{L}*'),
	mot('maximum|maximal\\p{L}*')
];

/**
 * B2. Le lexique de la promesse, partout.
 *
 * On ne promet aucun recouvrement : on mesure, on documente, on alerte. Il
 * suffit d'une fois pour que le produit devienne autre chose que ce qu'il vend.
 */
export function filtrerLexiqueInterdit(texte: string): string {
	const trouvee = premiereOccurrence(texte, LEXIQUE_INTERDIT);
	if (trouvee === undefined) return texte;

	throw new RefusDeRendu(
		'B2',
		trouvee.terme,
		composerRefus({
			peutFaire:
				'Le dossier se lit et se chiffre sans cette phrase : le décompte et ses segments, ' +
				'la surveillance des échéances et le délai de prescription ne dépendent d’aucun ' +
				'texte composé par le compagnon.',
			constat:
				`La phrase retenue emploie « ${trouvee.terme} », qui promet un résultat. Ce logiciel ` +
				`mesure, documente et alerte ; il ne promet aucun recouvrement, et la décision ` +
				`d’agir reste celle du gérant.`,
			blocages: [
				'Ce refus se lève par une phrase qui énonce ce que le dossier porte, sans annoncer ' +
					'ce qu’il rapportera.'
			],
			coutDeLAttente:
				'Ce que cette retenue coûte est chiffrable, et vaut zéro : la phrase retenue ' +
				'n’apportait ni montant, ni date, ni pièce que le dossier ne porte déjà.'
		})
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// B6 — LE CHAMP LEXICAL DE LA PROCÉDURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le champ lexical entier, n'importe où dans la phrase.
 *
 * Trois familles, et la troisième est celle que le balayage existant ne pouvait
 * pas voir : les actes, les modaux de conseil, et les comparatifs qui CLASSENT
 * une voie. Classer est déjà recommander.
 *
 * ⚠️ « signifier » EST LE SEUL MOT DÉCOUPÉ FINEMENT, et la raison est du
 * français, pas du droit. Le verbe est d'usage courant au sens de « vouloir
 * dire » : refuser « cela signifie que la créance est éteinte » rendrait le
 * compagnon incapable d'expliquer un constat. Seul l'emploi transitif de
 * l'acte est retenu, et le substantif, lui, l'est toujours.
 *
 * ⚠️ « procédure » Y EST, MOINS LA TAXONOMIE DU REGISTRE. Sans lui, la phrase
 * qui a vécu en production, « Examiner les procédures envisageables pour cette
 * creance. », passerait encore : elle ne porte ni acte nommé, ni modal, ni
 * comparatif. Mais le registre public écrit « procédure collective », et le
 * produit cite le registre mot pour mot sans le reformuler. Refuser cette
 * forme-là ferait taire un CONSTAT relevé sur une source publique pour se
 * protéger d'un conseil que personne n'a donné. Le mot est donc retenu partout
 * SAUF quand il est suivi de la taxonomie du registre.
 */
const CHAMP_PROCEDURE: readonly RegExp[] = [
	mot('assign\\p{L}*'),
	mot(
		'procédur\\p{L}*(?!\\s+(?:collectives?|de\\s+sauvegarde|de\\s+liquidation|de\\s+redressement))'
	),
	mot('injonction[s]?'),
	mot('référé[es]?'),
	mot('requête[s]?'),
	mot('commandement[s]?'),
	mot('mise[s]?\\s+en\\s+demeure|mettre\\s+en\\s+demeure'),
	mot('signification[s]?'),
	mot("signifi(?:er|ez|é)\\s+(?:l[’']|la|le|un|une|cette)"),
	mot('sais(?:ir|ie|ies|isse|issez|it)'),
	mot('tribun\\p{L}*'),
	mot('greffe[s]?'),
	mot('mandataire[s]?'),
	mot('huissier[s]?'),
	mot('commissaire[s]?\\s+de\\s+justice'),
	mot('pourri(?:ez|ons|ait|aient)'),
	mot('devri(?:ez|ons|ait|aient)'),
	mot('faudrait'),
	mot('conviendrait'),
	mot('recommand\\p{L}*'),
	mot('conseill\\p{L}*'),
	mot('préférable'),
	mot('mieux\\s+vaut|vaut\\s+mieux|le\\s+mieux'),
	mot(
		'l[ae]\\s+plus\\s+(?:rapide|simple|efficace|court[e]?|sûr[e]?|direct[e]?|adapté[e]?|indiqué[e]?|approprié[e]?)'
	),
	mot('l[ae]\\s+(?:meilleur[e]?|bonne)\\s+(?:voie|option|solution|démarche)')
];

/**
 * B6. Le champ lexical de la procédure, n'importe où dans la phrase.
 *
 * Ligne rouge 3 : une voie recommandée par un logiciel et engagée de bonne foi
 * ne se rattrape pas.
 */
export function filtrerChampLexicalProcedure(texte: string): string {
	const trouvee = premiereOccurrence(texte, CHAMP_PROCEDURE);
	if (trouvee === undefined) return texte;

	throw new RefusDeRendu(
		'B6',
		trouvee.terme,
		composerRefus({
			peutFaire:
				'Les voies envisageables restent énumérées SANS ORDRE dans le volet de preuve, ' +
				'composées par du code déterministe, avec pour chacune ce qui manquerait pour la ' +
				'mener. Le décompte, lui, se chiffre au centime et s’imprime.',
			constat:
				`La phrase retenue porte « ${trouvee.terme} », qui appartient au champ lexical de la ` +
				`procédure. Nommer une voie, la classer ou l’indiquer serait du conseil juridique, ` +
				`et ce logiciel n’en donne pas.`,
			blocages: [
				'Ce refus se lève par un constat : ce que la créance établit, et rien sur ce qu’on ' +
					'pourrait en faire.'
			],
			coutDeLAttente:
				'Ce que cette retenue coûte n’est pas chiffrable, et c’est un angle mort déclaré : ' +
				'ce logiciel ne mesure pas ce que vaut une voie plutôt qu’une autre, et il ne ' +
				'l’écrit donc pas.'
		})
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// B3 — L'ÉNONCÉ JURIDIQUE, QU'IL CITE UN ARTICLE OU NON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ce qui fait d'une phrase une affirmation de droit.
 *
 * ⚠️ LA CITATION D'ARTICLE EST LA DERNIÈRE LIGNE, PAS LA PREMIÈRE. Une
 * barrière qui ne surveille que les numéros d'article laisse passer le droit
 * dit sans source, qui est le cas dangereux : « ce type de créance se prescrit
 * par cinq ans » n'a même pas l'air d'une citation qu'on irait vérifier, et il
 * est faux dès que la créance relève du transport ou d'une fourniture à un
 * consommateur.
 *
 * Les sept familles sont celles de la barrière : un délai, une prescription,
 * un taux, une indemnité, une qualité, une condition d'exigibilité, un effet
 * de droit.
 */
const ENONCES_JURIDIQUES: readonly RegExp[] = [
	mot('prescri\\p{L}*'),
	mot('forclusion[s]?'),
	mot('délai[s]?'),
	mot('taux'),
	mot('intérêt[s]?\\s+(?:de\\s+retard|légal\\p{L}*|moratoire[s]?)'),
	mot('major[ée]\\p{L}*\\s+de\\s+\\p{L}+\\s+point[s]?'),
	mot('indemnit[ée]\\p{L}*'),
	mot('commerçant[es]?'),
	mot('exigib\\p{L}*'),
	mot('créance\\s+certaine'),
	mot('de\\s+plein\\s+droit'),
	mot('ouvre\\s+droit'),
	mot('est\\s+(?:dû|due|éteinte|éteint|prescrite|prescrit)'),
	mot('ne\\s+se\\s+réclame\\s+plus'),
	mot('(?:article|art\\.?)\\s*[LRD]\\.?\\s*\\d+'),
	mot('code\\s+(?:de\\s+commerce|civil|de\\s+la\\s+consommation)'),
	mot('[LRD]\\d{3}-\\d+')
];

function estCleConnue(cle: string): boolean {
	return Object.prototype.hasOwnProperty.call(PARAMETRES, cle);
}

interface Zone {
	readonly debut: number;
	readonly fin: number;
	readonly cle?: string;
}

/**
 * Les portions de texte qu'une pastille couvre, mot pour mot.
 *
 * ⚠️ TOUTES LES OCCURRENCES DE L'EXTRAIT, PAS LA PREMIÈRE. Une pastille dont
 * l'extrait apparaît deux fois couvre les deux : ne prendre que la première
 * ferait tomber la seconde, et le refus nommerait un énoncé pourtant sourcé.
 */
function zones(sortie: SortieCompagnon, retenue: (pastille: Pastille) => boolean): Zone[] {
	const trouvees: Zone[] = [];

	for (const pastille of sortie.pastilles) {
		if (!retenue(pastille)) continue;
		if (pastille.extrait.trim() === '') continue;

		let depuis = sortie.texte.indexOf(pastille.extrait);
		while (depuis >= 0) {
			trouvees.push({
				debut: depuis,
				fin: depuis + pastille.extrait.length,
				cle: pastille.genre === 'PARAMETRE' ? pastille.cle : undefined
			});
			depuis = sortie.texte.indexOf(pastille.extrait, depuis + 1);
		}
	}

	return trouvees;
}

function couvrante(connues: readonly Zone[], trouvee: Occurrence): Zone | undefined {
	return connues.find((zone) => zone.debut <= trouvee.debut && zone.fin >= trouvee.fin);
}

/**
 * B3. Toute affirmation de droit résout vers le registre, ou n'est pas rendue.
 *
 * Elle résout vers une entrée de `parametres.ts` : une CONSTANTE porte sa
 * valeur, une SERIE nomme dans `resoluPar` le module de pays qui la résout. Le
 * compagnon ne connaît que la clé, jamais le module, et c'est exactement ce
 * qui rend un second pays possible sans réécrire une phrase.
 */
export function filtrerEnoncesJuridiques(sortie: SortieCompagnon): SortieCompagnon {
	const resolues = zones(sortie, (p) => p.genre === 'PARAMETRE' && estCleConnue(p.cle));
	const orphelines = zones(sortie, (p) => p.genre === 'PARAMETRE' && !estCleConnue(p.cle));

	for (const motif of ENONCES_JURIDIQUES) {
		for (const trouvee of occurrences(sortie.texte, motif)) {
			if (couvrante(resolues, trouvee) !== undefined) continue;

			const orpheline = couvrante(orphelines, trouvee);
			const manque =
				orpheline?.cle !== undefined
					? `sa pastille cite la clé « ${orpheline.cle} », qui n’existe dans aucune entrée ` +
						`du référentiel juridique de ce logiciel`
					: 'aucune pastille ne la relie à une entrée du référentiel juridique de ce logiciel';

			throw new RefusDeRendu(
				'B3',
				trouvee.terme,
				composerRefus({
					peutFaire:
						'Les valeurs du référentiel s’affichent là où le produit les rend déjà : chaque ' +
						'segment du décompte porte sa base, son taux, ses jours et sa base annuelle, ' +
						'avec l’article, la date du relevé et les deux booléens de la valeur employée.',
					constat: `La phrase retenue affirme une règle de droit en écrivant « ${trouvee.terme} », et ${manque}.`,
					blocages: [
						'Ce refus se lève par une pastille qui relie l’énoncé à une entrée du ' +
							'référentiel, ou par une phrase qui n’affirme aucune règle de droit.'
					],
					coutDeLAttente:
						'Ce que cette retenue coûte vaut zéro euro et ne fait courir aucun délai : une ' +
						'règle que le référentiel ne porte pas n’était de toute façon pas mesurée par ce ' +
						'logiciel, et l’afficher l’aurait fait croire vérifiée.'
				})
			);
		}
	}

	return sortie;
}

// ═══════════════════════════════════════════════════════════════════════════
// B4 — LE MONTANT SANS PASTILLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Un montant écrit, avec sa monnaie.
 *
 * ⚠️ LA LIMITE EST DÉCLARÉE : ce motif lit des CHIFFRES suivis d'une monnaie.
 * Un montant écrit en toutes lettres lui échappe, et c'est assumé, parce que
 * le seul du produit qui s'écrive ainsi est l'indemnité forfaitaire, que B3
 * retient déjà par son propre lexique.
 */
const MONTANT = /(?<![\p{L}\p{N}])\d[\d\s]*(?:[.,]\d{1,2})?\s*(?:€|EUR|euros?)(?![\p{L}\p{N}])/giu;

/**
 * B4. Aucun montant rendu sans une pastille reliée à un décompte ou à une pièce.
 *
 * Un montant en texte libre ne se refait pas à la main, et c'est exactement ce
 * que fera le débiteur qui le conteste. Un total qu'on ne peut pas décomposer
 * est un chiffre qu'on demande de croire.
 */
export function filtrerMontants(sortie: SortieCompagnon): SortieCompagnon {
	const ancrees = zones(sortie, (p) => p.genre === 'DECOMPTE' || p.genre === 'PIECE');

	for (const trouvee of occurrences(sortie.texte, MONTANT)) {
		if (couvrante(ancrees, trouvee) !== undefined) continue;

		const montant = trouvee.terme.trim();

		throw new RefusDeRendu(
			'B4',
			montant,
			composerRefus({
				peutFaire:
					'Les montants du dossier restent lisibles là où ils se décomposent : un décompte ' +
					'arrêté porte ses segments, chacun avec sa base, son taux, ses jours et sa base ' +
					'annuelle, et ses règlements avec ce que chacun a éteint, et se refait à la main ' +
					'ligne par ligne.',
				constat:
					`La phrase retenue rend le montant ${montant} sans aucune pastille qui le relie à ` +
					`un décompte ou à une pièce du dossier.`,
				blocages: [
					'Ce refus se lève par une pastille qui relie le montant au décompte ou à la pièce ' +
						'dont il sort.'
				],
				coutDeLAttente:
					'Ce que cette retenue coûte est chiffrable, et vaut zéro : un montant qu’aucune ' +
					'pièce ne porte n’ajoutait rien à ce que le dossier chiffre déjà, et le débiteur ' +
					'qui le contesterait n’aurait rien à refaire.'
			})
		);
	}

	return sortie;
}

// ═══════════════════════════════════════════════════════════════════════════
// B11 — AUCUN NOM DE TIERS DANS UN BROUILLON AU DÉBITEUR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les identités du logiciel et de son exploitant, lues à leur source unique.
 *
 * ⚠️ ELLES SONT CÂBLÉES, PAS PASSÉES EN ARGUMENT. Un appelant qui oublierait
 * de les passer produirait un brouillon signé d'un tiers sans que rien ne
 * tombe, et c'est précisément la ligne rouge 1. Le carnet d'intervenants, lui,
 * dépend du dossier : il arrive par `PartiesDuBrouillon.tiers`.
 */
const IDENTITES_DU_LOGICIEL: readonly string[] = [
	LEGAL_CONFIG.brandName,
	LEGAL_CONFIG.operatorName,
	LEGAL_CONFIG.tradeName,
	LEGAL_CONFIG.companyName,
	LEGAL_CONFIG.email.domain,
	SITE_CANONIQUE
];

/** Échappe ce qui doit se lire au pied de la lettre dans un motif. */
function litteral(valeur: string): string {
	return valeur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * B11. Aucun nom de tiers dans un brouillon destiné au débiteur.
 *
 * Ligne rouge 1 : un débiteur qui lit le nom d'un tiers dans le courrier y voit
 * un mandat de chaîne, c'est-à-dire du recouvrement pour compte d'autrui, et
 * c'est exactement l'activité qu'on n'exerce pas. Le produit n'apparaît jamais
 * dans la chaîne : le texte part de la boîte du créancier, sous sa signature.
 *
 * ⚠️ LE CRÉANCIER ET LE DÉBITEUR PRIMENT. Quand une identité surveillée se
 * trouve être celle de l'une des deux parties, elle est autorisée : le
 * créancier a le droit de signer de son nom, même si ce nom est aussi celui de
 * l'exploitant du logiciel.
 */
export function filtrerNomsDeTiers(texte: string, parties: PartiesDuBrouillon): string {
	const autorises = `${parties.creancier}\n${parties.debiteur}`.toLowerCase();

	const surveilles = [...IDENTITES_DU_LOGICIEL, ...parties.tiers]
		.map((nom) => nom.trim())
		.filter((nom) => nom !== '' && !autorises.includes(nom.toLowerCase()));

	const trouvee = premiereOccurrence(
		texte,
		surveilles.map((nom) => mot(litteral(nom)))
	);
	if (trouvee === undefined) return texte;

	throw new RefusDeRendu(
		'B11',
		trouvee.terme,
		composerRefus({
			peutFaire:
				'Le brouillon se compose et se relit sans cette mention, et il reste étiqueté ' +
				'« visible par vous seul, non envoyé ». Les montants qu’il reprend restent ceux ' +
				'd’un décompte figé et daté.',
			constat:
				`Le brouillon nomme « ${trouvee.terme} », qui n’est ni le créancier ni le débiteur de ` +
				`cette créance. Ce texte part de la boîte du créancier, sous sa seule signature : ` +
				`aucun tiers n’apparaît dans la chaîne.`,
			blocages: [
				'Ce refus se lève par un texte qui ne nomme que le créancier et le débiteur de ' +
					'cette créance.'
			],
			coutDeLAttente:
				'Ce que cette retenue coûte est chiffrable, et vaut zéro : le nom retenu n’ajoutait ' +
				'ni somme réclamée, ni date, ni pièce au dossier.'
		})
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// LE POINT D'USAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les quatre filtres qui portent sur une sortie de modèle, dans l'ordre.
 *
 * L'ordre est celui du DANGER, pas celui des numéros : ce qui franchit une
 * ligne rouge passe avant ce qui manque de source, et ce qui manque de source
 * passe avant ce qui manque d'ancre. Le premier qui mord lève, et le refus
 * qu'il porte est celui que le gérant lit.
 *
 * B11 n'est pas ici : il porte sur un brouillon destiné au DÉBITEUR, composé
 * sans aucun appel modèle (B10), donc sans pastille. Il s'appelle à son propre
 * point d'usage, `filtrerNomsDeTiers`.
 */
/**
 * B16. Aucun verdict juridique : ni « est remplie », ni « éligible », ni « vous
 * devriez ». Le compagnon répond sur les faits et les calculs ; qualifier des
 * faits au regard du droit revient au gérant, éclairé par un avocat (relecture
 * du 25/09/2026, § 2).
 */
export function filtrerVerdicts(texte: string): string {
	for (const motif of VERDICTS_INTERDITS) {
		const trouve = motif.exec(texte);
		if (trouve === null) continue;
		throw new RefusDeRendu(
			'B16',
			trouve[0],
			composerRefus({
				peutFaire:
					'Le tableau « Ce que dit la loi, en face de votre dossier » montre chaque condition, ce ' +
					'que le dossier contient et ce que vous avez répondu.',
				constat: `La réponse retenue qualifiait le dossier au regard du droit en écrivant « ${trouve[0]} ».`,
				blocages: [
					'Ce refus se lève par une question sur les faits ou les calculs du dossier. Une question de ' +
						'droit sur votre cas précis, un avocat peut y répondre.'
				],
				coutDeLAttente:
					'Ce que cette retenue coûte vaut zéro euro et ne fait courir aucun délai : un verdict que le ' +
					'logiciel n’a pas le droit de rendre n’était de toute façon pas une information fiable.'
			})
		);
	}
	return texte;
}

export function filtrerAvantRendu(sortie: SortieCompagnon): SortieCompagnon {
	filtrerVerdicts(sortie.texte);
	filtrerLexiqueInterdit(sortie.texte);
	filtrerChampLexicalProcedure(sortie.texte);
	filtrerEnoncesJuridiques(sortie);
	filtrerMontants(sortie);
	return sortie;
}
