import { parse, stringify } from 'yaml';
import type { ZodError } from 'zod';
import { PARAMETRES } from '../verticales/recouvrement/parametres';
import { AUTEUR_PAR_DEFAUT, schemaEnteteArticle, type EnteteArticle } from './schema';
import { capturesInconnues } from './captures';

/**
 * LE FICHIER D'UN ARTICLE, LU ET RÉÉCRIT PAR LE CMS (19/10/2026).
 *
 * Module pur : ni Convex ni React. L'écran de l'admin s'en sert pour éditer et relire,
 * l'action Convex pour refuser de publier ce que la construction du site refuserait.
 *
 * Un article est un fichier `content/blog/<adresse>.mdx` : un en-tête YAML entre deux
 * lignes `---`, puis le corps en MDX. Le CMS réécrit l'en-tête dans un ordre fixe, pour
 * que deux publications d'un même article ne diffèrent que par ce qui a changé.
 */

/** Ce que l'éditeur manipule : l'en-tête validé, et le corps tel quel. */
export interface ArticleSource {
	readonly entete: EnteteArticle;
	readonly corps: string;
}

/** Les libellés des champs, pour dire en français ce qui ne va pas. */
const LIBELLES: Readonly<Record<string, string>> = {
	titre: 'Le titre',
	description: 'La description',
	date: 'La date',
	misAJour: 'La date de mise à jour',
	auteur: 'L’auteur',
	categorie: 'La catégorie',
	pilier: 'Le pilier',
	illustration: 'L’illustration',
	couverture: 'La couverture',
	enBref: '« En bref »',
	etiquette: 'L’étiquette',
	brouillon: 'Le brouillon'
};

/** Les erreurs de l'en-tête, une phrase chacune. */
export function erreursLisibles(erreur: ZodError): string[] {
	return erreur.issues.map((issue) => {
		const champ = String(issue.path[0] ?? '');
		const nom = LIBELLES[champ] ?? champ;
		const rang = typeof issue.path[1] === 'number' ? ` (phrase ${issue.path[1] + 1})` : '';
		if (issue.code === 'too_small' && 'minimum' in issue) {
			return issue.origin === 'array'
				? `${nom} demande au moins ${String(issue.minimum)} phrases.`
				: `${nom}${rang} est trop court : ${String(issue.minimum)} caractères au moins.`;
		}
		if (issue.code === 'too_big' && 'maximum' in issue) {
			return issue.origin === 'array'
				? `${nom} accepte ${String(issue.maximum)} phrases au plus.`
				: `${nom}${rang} est trop long : ${String(issue.maximum)} caractères au plus.`;
		}
		if (issue.code === 'invalid_value') return `${nom} n’est pas une valeur permise.`;
		if (issue.code === 'invalid_format') return `${nom} n’est pas une date au format 2026-10-20.`;
		return `${nom} : ${issue.message}`;
	});
}

/** Découpe le fichier, et valide l'en-tête avec le schéma du build. */
export function lireArticle(source: string): ArticleSource | { readonly erreurs: string[] } {
	const trouve = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
	if (trouve === null) {
		return { erreurs: ['L’article ne commence pas par un en-tête entre deux lignes « --- ».'] };
	}
	let brut: unknown;
	try {
		brut = parse(trouve[1] ?? '');
	} catch (e) {
		return { erreurs: [`L’en-tête n’est pas lisible : ${(e as Error).message}`] };
	}
	const resultat = schemaEnteteArticle.safeParse(brut ?? {});
	if (!resultat.success) return { erreurs: erreursLisibles(resultat.error) };
	return { entete: resultat.data, corps: (trouve[2] ?? '').replace(/^\r?\n/, '') };
}

/** Une valeur YAML sur une ligne, guillemets seulement quand il en faut. */
function scalaire(valeur: string): string {
	return stringify(valeur, { lineWidth: 0 }).trimEnd();
}

/** Recompose le fichier, l'en-tête dans un ordre fixe, les valeurs par défaut omises. */
export function ecrireArticle({ entete, corps }: ArticleSource): string {
	const lignes: string[] = [
		`titre: ${scalaire(entete.titre)}`,
		`description: ${scalaire(entete.description)}`,
		`date: ${entete.date}`
	];
	if (entete.misAJour !== undefined) lignes.push(`misAJour: ${entete.misAJour}`);
	if (entete.auteur !== AUTEUR_PAR_DEFAUT) lignes.push(`auteur: ${scalaire(entete.auteur)}`);
	lignes.push(`categorie: ${scalaire(entete.categorie)}`);
	if (entete.pilier !== undefined) lignes.push(`pilier: ${scalaire(entete.pilier)}`);
	lignes.push(`illustration: ${entete.illustration}`);
	if (entete.couverture !== undefined) {
		lignes.push(
			'couverture:',
			`  src: ${scalaire(entete.couverture.src)}`,
			`  alt: ${scalaire(entete.couverture.alt)}`
		);
	}
	if (entete.enBref !== undefined && entete.enBref.length > 0) {
		lignes.push('enBref:', ...entete.enBref.map((phrase) => `  - ${scalaire(phrase)}`));
	}
	const e = entete.etiquette;
	if (e !== undefined) {
		lignes.push(
			'etiquette:',
			`  libelle: ${scalaire(e.libelle)}`,
			e.registre !== undefined ? `  registre: ${e.registre}` : `  mot: ${scalaire(e.mot ?? '')}`,
			`  sous: ${scalaire(e.sous)}`
		);
	}
	if (entete.brouillon) lignes.push('brouillon: true');
	return `---\n${lignes.join('\n')}\n---\n\n${corps.replace(/^\s+/, '').replace(/\s*$/, '\n')}`;
}

/** « Retards de paiement en 2025 » → « retards-de-paiement-en-2025 ». */
export function adresseDepuisTitre(titre: string): string {
	return titre
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[’']/g, '-')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
		.replace(/-+$/, '');
}

/** Ce que le site sait des autres articles : pour vérifier les liens. */
export interface ArticleConnu {
	readonly adresse: string;
	readonly date: string;
	readonly brouillon: boolean;
}

export interface Relecture {
	/** Ce qui ferait échouer la construction, ou viole une règle du projet : on ne publie pas. */
	readonly bloquants: readonly string[];
	/** Ce qu'il faut relire avant de publier. */
	readonly avertissements: readonly string[];
}

/** Les clés que `<Source de="…" />` accepte : le registre, plus les trois régimes de délai. */
const SOURCES_PERMISES = new Set<string>([
	...Object.keys(PARAMETRES),
	'prescription-general',
	'prescription-transport',
	'prescription-consommateur'
]);

/** Un chiffre de la loi tapé à la main : « 40 € », « 1 an », « 30 jours », « 10,40 % »… */
const VALEUR_TAPEE =
	/\b\d+(?:[,.]\d+)?\s?(?:€|%|jours?\b|mois\b|ans?\b)|\b(?:un|deux|trois|quatre|cinq|trente|quarante-cinq|cinquante|soixante) (?:ans?|jours)\b|\b(?:huit|dix) points\b/i;

/**
 * LA RELECTURE AVANT PUBLICATION : la charte du blog (`content/blog/README.md`), exécutée.
 * Les règles dures bloquent ; le reste s'affiche, pour que le fondateur relise.
 */
export function relireArticle(
	adresse: string,
	article: ArticleSource,
	autres: readonly ArticleConnu[]
): Relecture {
	const bloquants: string[] = [];
	const avertissements: string[] = [];
	const { entete, corps } = article;
	const enTete = [entete.titre, entete.description, ...(entete.enBref ?? [])].join('\n');
	const tout = `${enTete}\n${corps}`;

	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adresse)) {
		bloquants.push(
			'L’adresse ne doit contenir que des minuscules sans accent, des chiffres et des tirets.'
		);
	}
	if (/garanti/i.test(tout)) {
		bloquants.push('Le mot « garantie » est interdit : on ne promet aucun résultat.');
	}
	for (const [, cle] of corps.matchAll(/<Source\s+de="([^"]+)"/g)) {
		if (cle !== undefined && !SOURCES_PERMISES.has(cle)) {
			bloquants.push(`<Source de="${cle}" /> : cette règle n’est pas au registre.`);
		}
	}

	for (const ecran of capturesInconnues(corps)) {
		avertissements.push(
			`<Capture ecran="${ecran}" /> : cet écran n’a pas de capture, le site montrerait une image cassée.`
		);
	}
	if (VALEUR_TAPEE.test(enTete)) {
		avertissements.push(
			'L’en-tête contient un chiffre : s’il vient de la loi (un taux, un délai, un montant), il doit disparaître, l’en-tête ne lit pas le registre. Une statistique sourcée peut rester.'
		);
	}
	if (/\u2014/.test(tout)) avertissements.push('Un tiret cadratin : la charte n’en veut pas.');
	if (/!(?!\[)/.test(corps.replace(/<[^>]*>/g, ''))) {
		avertissements.push('Un point d’exclamation : la charte n’en veut pas.');
	}
	for (const formule of [
		'n’hésitez',
		"n'hésitez",
		'il est crucial',
		'véritable',
		'incontournable',
		'optimiser',
		'dans un monde où',
		'en conclusion'
	]) {
		if (tout.toLowerCase().includes(formule))
			avertissements.push(`« ${formule} » : une formule que la charte écarte.`);
	}
	if (!/## Ce que fait Letikette/.test(corps)) {
		avertissements.push(
			'Pas de section « Ce que fait Letikette » : la charte la met en fin d’article.'
		);
	}
	if (!/ne constitue pas un conseil juridique/.test(corps)) {
		avertissements.push('La mention finale « ne constitue pas un conseil juridique » manque.');
	}

	const parAdresse = new Map(autres.map((a) => [a.adresse, a]));
	for (const [, cible] of corps.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)) {
		if (cible === undefined) continue;
		const lie = parAdresse.get(cible);
		if (lie === undefined)
			avertissements.push(`Le lien vers /blog/${cible} mène à un article qui n’existe pas.`);
		else if (lie.brouillon || lie.date > entete.date) {
			avertissements.push(
				`Le lien vers /blog/${cible} mène à un article qui ne sera pas encore paru ce jour-là.`
			);
		}
	}

	return { bloquants, avertissements };
}
