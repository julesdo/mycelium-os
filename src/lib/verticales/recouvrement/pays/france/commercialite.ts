import { PARAMETRES, exiger } from '../../parametres';
import type { EtatCritere } from '../../qualification';

/**
 * LA QUALITÉ DE COMMERÇANT, DÉDUITE DE LA FORME JURIDIQUE RELEVÉE AU REGISTRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE MODULE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page « Votre entreprise sur un décompte » posait la question à un gérant
 * dont le logiciel connaissait déjà la forme juridique : le registre la rend
 * avec le SIREN et l'adresse, et elle dormait dans un champ que rien ne
 * remplissait. C'est la règle d'écran n° 1 prise à l'envers — « un champ vide
 * que le logiciel aurait pu remplir est un défaut ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI SE DÉDUIT, ET CE QUI NE SE DÉDUIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'article L210-1, alinéa 2, du code de commerce ferme une liste de quatre
 * familles : nom collectif, commandite simple, responsabilité limitée, sociétés
 * par actions. Elles sont commerciales À RAISON DE LEUR FORME, quel que soit
 * leur objet. Hors de ces quatre familles, la commercialité devra venir de
 * l'objet, ou ne viendra pas.
 *
 * ⚠️ ET LE PAS QUI SUIT N'EST ÉCRIT DANS AUCUN TEXTE. L210-1 dit « le caractère
 * commercial d'une SOCIÉTÉ », pas « la qualité de commerçant ». Le code lui-même
 * tient les deux notions séparées au même endroit : l'article L721-3 du code de
 * commerce donne compétence au tribunal de commerce, au 1°, pour les
 * engagements entre commerçants, et, au 2° SÉPARÉMENT, pour les contestations
 * relatives aux sociétés commerciales. Si toute société commerciale était un
 * commerçant, le 2° n'aurait rien à faire là.
 *
 * La conséquence est nette : la forme relevée suffit à PROPOSER une réponse et à
 * remplir l'écran, elle ne suffit pas à établir la qualité dans un acte. C'est
 * exactement la frontière entre `verifie` et `valideParAvocat`, et
 * `exigerPourActe()` continue de bloquer.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DOUTE NE PROFITE JAMAIS AU PRODUIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une forme inconnue compte comme NON DÉDUITE, jamais comme commerçante. Cinq
 * familles de cas rendent `unknown`, et le disent :
 *
 *   · la société d'exercice libéral — forme commerciale, objet civil, question
 *     expressément débattue ;
 *   · l'association — aucune commercialité par la forme, jurisprudence divisée
 *     sur la commercialité par l'activité ; écrire `ko` fermerait une voie sur
 *     une controverse ;
 *   · le groupement d'intérêt économique, dont l'immatriculation n'emporte
 *     aucune présomption ;
 *   · la personne physique, pour une raison de DONNÉE et non de droit (voir
 *     plus bas) ;
 *   · et tout libellé que ce module ne reconnaît pas.
 *
 * Le sens de l'erreur est sûr dans les deux autres directions : ni `ko` ni
 * `unknown` ne produit d'acte, et le gérant rouvre l'un comme l'autre en
 * répondant lui-même. Seul un `ok` faux ouvrirait une procédure qui se ferait
 * rejeter.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA PERSONNE PHYSIQUE EST UN TROU STRUCTUREL, PAS UNE LACUNE À COMBLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Au 1er juillet 2018, l'INSEE a gelé les catégories juridiques qui
 * distinguaient le commerçant, l'artisan, la profession libérale, l'exploitant
 * agricole et l'agent commercial, et les a remplacées par une seule :
 * « Entrepreneur individuel ». Une entreprise individuelle immatriculée depuis
 * cette date porte donc une forme juridique qui ne dit RIEN de sa
 * commercialité. L'information a été retirée de la nomenclature, pas du droit.
 *
 * C'est la seule occurrence où « le logiciel décide, le gérant confirme » cède,
 * et elle se justifie par un fait vérifiable. L'écran continue donc de poser la
 * question, en disant pourquoi il la pose.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ON LIT EST UN LIBELLÉ, PAS UN CODE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `EtablissementTrouve.formeJuridique` vient du champ `listepersonnes` du
 * BODACC et arrive en TEXTE LIBRE : « Société par Actions Simplifiée »,
 * « SARL », « S.A.R.L. ». Ce n'est pas le code de catégorie juridique de
 * l'INSEE, qui serait le seul identifiant stable ; l'accès qui le donnerait
 * n'est pas ouvert.
 *
 * La table ci-dessous est donc une NORMALISATION DE CHAÎNES, et non un relevé de
 * droit. Elle échoue vers `unknown` — jamais vers `ko`, jamais vers `ok`.
 *
 * ⚠️ UNE RÉSERVE À NOMMER. Le libellé exact de l'article 40 de l'ordonnance
 * n° 2023-77 du 8 février 2023 n'a pas été recopié depuis Légifrance, seulement
 * restitué ; sa teneur — la société d'exercice libéral emprunte l'une des formes
 * commerciales — est concordante sur plusieurs sources. C'est une raison de plus
 * pour que ce cas rende `unknown` au lieu d'une conclusion.
 *
 * Sources relevées le 2026-09-16 sur legifrance.gouv.fr et insee.fr. Relevé par
 * le logiciel, PAS validé par un avocat — voir `parametres.ts`.
 */

/**
 * Pourquoi rien ne s'est déduit. Chaque motif appelle une phrase différente à
 * l'écran : « le registre n'a rien rendu » et « la forme ne tranche pas » ne
 * mènent pas au même geste.
 */
export type MotifSansDeduction =
	| 'AUCUNE_FORME_RELEVEE'
	| 'FORME_NON_RECONNUE'
	| 'PERSONNE_PHYSIQUE'
	| 'EXERCICE_LIBERAL_EN_SOCIETE'
	| 'ASSOCIATION'
	| 'GROUPEMENT_SANS_PRESOMPTION';

export interface QualiteCommercantDeduite {
	/** `ok`, `ko`, ou `unknown` quand la forme ne tranche pas. Jamais présumé. */
	readonly etat: EtatCritere;
	/** Le libellé sur lequel la déduction repose, tel qu'il a été relevé. */
	readonly formeRelevee?: string;
	/** Présent — et seulement présent — quand `etat` vaut `unknown`. */
	readonly motif?: MotifSansDeduction;
	/** Le texte qui fonde la déduction, ou la raison de son absence. Toujours là. */
	readonly fondement: string;
}

const FONDEMENT_COMMERCIALE =
	'Les sociétés en nom collectif, en commandite simple, à responsabilité limitée et par ' +
	'actions sont commerciales à raison de leur forme, quel que soit leur objet ' +
	'(article L210-1, alinéa 2, du code de commerce).';

const FONDEMENT_SOCIETE_CIVILE =
	'Ont le caractère civil toutes les sociétés auxquelles la loi n’attribue pas un autre ' +
	'caractère à raison de leur forme, de leur nature ou de leur objet (article 1845, ' +
	'alinéa 2, du code civil). Une société civile n’est dans aucune des quatre familles ' +
	'commerciales de l’article L210-1 du code de commerce.';

const FONDEMENT_AGRICOLE =
	'Les activités agricoles ont un caractère civil (article L311-1, dernier alinéa, du code ' +
	'rural et de la pêche maritime). La forme passe avant l’activité : une exploitation ' +
	'constituée en SARL ou en SAS reste, elle, commerciale par sa forme.';

const FONDEMENT_EXERCICE_LIBERAL =
	'Une société d’exercice libéral emprunte l’une des formes commerciales pour un objet ' +
	'civil (article 40 de l’ordonnance n° 2023-77 du 8 février 2023). La qualité de ' +
	'commerçant y est expressément débattue : la forme ne tranche pas.';

const FONDEMENT_ASSOCIATION =
	'Une association n’est pas une société : aucune des formes commerciales de l’article ' +
	'L210-1 du code de commerce ne la couvre. Reste la commercialité par l’activité, sur ' +
	'laquelle la jurisprudence est divisée. La forme ne tranche ni dans un sens ni dans l’autre.';

const FONDEMENT_GROUPEMENT =
	'L’immatriculation d’un groupement d’intérêt économique au registre du commerce et des ' +
	'sociétés n’emporte aucune présomption de commercialité (article L251-4 du code de ' +
	'commerce). La forme ne tranche pas.';

const FONDEMENT_PERSONNE_PHYSIQUE =
	'Depuis le 1er juillet 2018, une entreprise individuelle porte la seule catégorie ' +
	'juridique « Entrepreneur individuel », qui a remplacé celles qui distinguaient le ' +
	'commerçant, l’artisan, la profession libérale, l’exploitant agricole et l’agent ' +
	'commercial (nomenclature des catégories juridiques de l’INSEE). La forme ne dit plus ' +
	'rien de la commercialité : l’information a été retirée de la nomenclature, pas du droit.';

const FONDEMENT_SANS_FORME =
	'Aucune forme juridique n’a été relevée au registre : il n’y a rien à déduire.';

interface RegleForme {
	/** Le nom de la règle, pour la lire dans un test ou dans un journal. */
	readonly cle: string;
	readonly etat: EtatCritere;
	readonly motif?: MotifSansDeduction;
	/** Les libellés normalisés qui la déclenchent, mot pour mot. */
	readonly libelles: readonly string[];
	readonly fondement: string;
}

/**
 * Les libellés développés des quatre familles de L210-1.
 *
 * ⚠️ EURL ET SASU N'EN SONT PAS DES FAMILLES DE PLUS. Ce sont les formes
 * unipersonnelles de la société à responsabilité limitée et de la société par
 * actions simplifiée — les mêmes types, un seul associé. Les omettre ferait
 * répondre « indéterminé » à la moitié des sociétés d'une personne.
 */
const LIBELLES_COMMERCIAUX: readonly string[] = [
	'societe en nom collectif',
	'societe en commandite simple',
	'societe a responsabilite limitee',
	'entreprise unipersonnelle a responsabilite limitee',
	'eurl',
	'societe anonyme',
	'societe par actions simplifiee',
	'sasu',
	'societe en commandite par actions',
	'societe par actions'
];

/**
 * LES RÈGLES, DANS L'ORDRE OÙ ELLES S'APPLIQUENT — ET L'ORDRE EST LA RÈGLE.
 *
 * ⚠️ LES EXCEPTIONS D'ABORD. « Société d'exercice libéral à responsabilité
 * limitée » contient « à responsabilité limitée » : lue après la règle
 * commerciale, elle rendrait `ok` sur la question précisément débattue.
 *
 * ⚠️ PUIS LA FORME, PUIS L'ACTIVITÉ. Une exploitation agricole constituée en
 * SARL tombe sous L210-1 et reste commerciale par sa forme ; le caractère civil
 * des activités agricoles ne joue que sur les formes qui lui sont propres.
 */
function regles(): readonly RegleForme[] {
	return [
		{
			cle: 'EXERCICE_LIBERAL_EN_SOCIETE',
			etat: 'unknown',
			motif: 'EXERCICE_LIBERAL_EN_SOCIETE',
			libelles: [
				'sel',
				'selarl',
				'selas',
				'selasu',
				'selafa',
				'selca',
				'seleurl',
				'societe d exercice liberal'
			],
			fondement: FONDEMENT_EXERCICE_LIBERAL
		},
		{
			cle: 'ASSOCIATION',
			etat: 'unknown',
			motif: 'ASSOCIATION',
			libelles: ['association', 'association declaree', 'fondation'],
			fondement: FONDEMENT_ASSOCIATION
		},
		{
			cle: 'GROUPEMENT_SANS_PRESOMPTION',
			etat: 'unknown',
			motif: 'GROUPEMENT_SANS_PRESOMPTION',
			libelles: ['gie', 'geie', 'groupement d interet economique'],
			fondement: FONDEMENT_GROUPEMENT
		},
		{
			cle: 'PERSONNE_PHYSIQUE',
			etat: 'unknown',
			motif: 'PERSONNE_PHYSIQUE',
			libelles: [
				'entrepreneur individuel',
				'entreprise individuelle',
				'ei',
				'eirl',
				'auto entrepreneur',
				'micro entrepreneur',
				'artisan',
				'artisan commercant',
				'commercant',
				'profession liberale',
				'exploitant agricole',
				'agent commercial',
				'officier public ou ministeriel',
				'personne physique'
			],
			fondement: FONDEMENT_PERSONNE_PHYSIQUE
		},
		{
			cle: 'COMMERCIALE_PAR_LA_FORME',
			etat: 'ok',
			/*
			  ⚠️ LES SIGLES SE LISENT DANS LE REGISTRE, ILS NE SE RECOPIENT PAS ICI.
			  `exiger()` refuse l'entrée si elle perd sa source : une famille retirée
			  du registre cesse alors de faire déduire, au lieu de continuer sur une
			  copie devenue muette.
			*/
			libelles: [
				...exiger(PARAMETRES.formesCommercialesParLaForme).map((sigle) => sigle.toLowerCase()),
				...LIBELLES_COMMERCIAUX
			],
			fondement: FONDEMENT_COMMERCIALE
		},
		{
			cle: 'AGRICOLE',
			etat: 'ko',
			libelles: [
				'gaec',
				'earl',
				'scea',
				'exploitation agricole a responsabilite limitee',
				'groupement agricole d exploitation en commun',
				'societe civile d exploitation agricole'
			],
			fondement: FONDEMENT_AGRICOLE
		},
		{
			cle: 'SOCIETE_CIVILE',
			etat: 'ko',
			libelles: [
				'sci',
				'scp',
				'scm',
				'sccv',
				'scpi',
				'societe civile',
				'societe civile immobiliere',
				'societe civile professionnelle',
				'societe civile de moyens'
			],
			fondement: FONDEMENT_SOCIETE_CIVILE
		}
	];
}

/**
 * Les deux lectures d'un libellé : mots séparés, et initiales recollées.
 *
 * ⚠️ « S.A.R.L. » ET « SARL » DOIVENT SE LIRE PAREIL. Une fois la ponctuation
 * remplacée par des espaces, le premier devient « s a r l » et ne ressemble plus
 * à rien. Les suites d'au moins deux lettres isolées sont donc recollées — ce
 * qui laisse intact le « a » esseulé de « société à responsabilité limitée »,
 * puisqu'il n'est pas suivi d'une autre lettre isolée.
 *
 * Les deux lectures sont bordées d'espaces : une correspondance porte alors sur
 * des mots entiers, et « sci » ne se trouve pas au milieu de « fascicule ».
 */
function lectures(libelle: string): readonly string[] {
	const mots = ` ${libelle
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()} `;

	const recolle = mots.replace(/(?:\b[a-z] )+\b[a-z]\b/g, (suite) => suite.replace(/ /g, ''));

	return recolle === mots ? [mots] : [mots, recolle];
}

function porte(lues: readonly string[], expression: string): boolean {
	return lues.some((lue) => lue.includes(` ${expression} `));
}

/**
 * CE QUE LA FORME JURIDIQUE RELEVÉE AU REGISTRE PERMET DE DÉDUIRE.
 *
 * Rend toujours un résultat, jamais une exception : une forme absente, illisible
 * ou inconnue est un « indéterminé » qui porte sa raison. C'est la question qui
 * reste posée au gérant, pas le produit qui tranche à sa place.
 */
export function qualiteCommercantDeLaForme(
	formeJuridique: string | undefined
): QualiteCommercantDeduite {
	const relevee = formeJuridique?.trim();
	if (relevee === undefined || relevee === '') {
		return { etat: 'unknown', motif: 'AUCUNE_FORME_RELEVEE', fondement: FONDEMENT_SANS_FORME };
	}

	const lues = lectures(relevee);

	for (const regle of regles()) {
		if (!regle.libelles.some((libelle) => porte(lues, libelle))) continue;
		return {
			etat: regle.etat,
			formeRelevee: relevee,
			...(regle.motif === undefined ? {} : { motif: regle.motif }),
			fondement: regle.fondement
		};
	}

	return {
		etat: 'unknown',
		formeRelevee: relevee,
		motif: 'FORME_NON_RECONNUE',
		fondement:
			`« ${relevee} » : la forme relevée au registre ne correspond à aucune forme dont le ` +
			'caractère commercial se déduise. Le registre rend un libellé en texte libre, jamais un ' +
			'code, et un libellé qu’on ne reconnaît pas ne vaut ni oui ni non.'
	};
}
