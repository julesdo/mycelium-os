import { v, ConvexError } from 'convex/values';
import { action } from '../_generated/server';
import { api } from '../_generated/api';
import { authedQuery } from '../functions';

/**
 * LES RÉPERTOIRES PUBLICS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE N'EST PAS LE TABLEAU DE LA PROFESSION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il n'existe aucun répertoire public réutilisable des commissaires de justice.
 * Leur annuaire national ne publie ni export, ni flux, ni conditions de
 * réutilisation : l'aspirer exposerait aux conditions du site et au droit du
 * producteur de base de données. On ne le fait pas.
 *
 * Ce qu'on interroge est le REGISTRE DES ENTREPRISES, ouvert, sans clé, adossé
 * à Sirene, filtré sur la convention collective de la profession. Une étude qui
 * ne l'a pas déclarée n'y figure pas, et une radiation disciplinaire non plus.
 * Les écrans le disent, et `source-citee.test.ts` échoue s'ils l'oublient.
 *
 * ⚠️ LE FILTRE DE DÉPARTEMENT PORTE SUR LES ÉTABLISSEMENTS, pas sur le siège :
 * une étude dont le siège est ailleurs remonte si elle a une antenne dans le
 * département. On affiche donc l'établissement du siège avec sa commune réelle,
 * jamais une adresse recomposée qui laisserait croire à une implantation locale.
 */

/**
 * L'API Recherche d'entreprises — DINUM, Licence Ouverte, sans clé.
 *
 * Relevée le 12 septembre 2026 en l'interrogeant : 22 études en Loire-Atlantique,
 * 114 à Paris, 7 en Corse-du-Sud.
 */
const BASE_RECHERCHE_ENTREPRISES = 'https://recherche-entreprises.api.gouv.fr/search';

/**
 * LES TROIS FILTRES, NOMMÉS.
 *
 * Enfouis dans un littéral d'URL, personne ne pourrait dire ce que la liste
 * contient ni ce qu'elle rate — et c'est précisément ce qu'il faut pouvoir dire
 * d'un répertoire qui n'est pas le tableau de sa profession.
 *
 * ⚠️ LA CONVENTION COLLECTIVE EST CE QUI FAIT TOUT LE TRI, et c'est aussi ce
 * qui fait tout le trou : le registre ne connaît que les études qui l'ont
 * DÉCLARÉE. Celle qui ne l'a pas fait est absente de la réponse, sans qu'aucun
 * champ ne le signale. C'est le premier angle mort que les écrans annoncent.
 */
const CONVENTION_COLLECTIVE_COMMISSAIRES = '3250';

/** 69.10Z — « activités juridiques ». Le code NAF des études. */
const ACTIVITE_JURIDIQUE = '69.10Z';

/** Le maximum accepté par l'API. Au-delà, elle répond 400. Relevé le 12/09/2026. */
const PAR_PAGE = 25;

/**
 * Le nombre de pages qu'on accepte de lire pour un département.
 *
 * BORNE DURE. Paris compte 114 études, soit cinq pages ; huit laissent deux
 * cents études de marge sans qu'une réponse inattendue — un filtre ignoré, par
 * exemple — puisse faire boucler l'action sur le registre entier.
 *
 * ⚠️ ET CE QU'ELLE COUPE SE DIT. Le retour porte `total`, ce que l'API DÉCLARE
 * exister, à côté des études réellement rendues. Un écran qui afficherait
 * vingt-cinq études sur cent quatorze sans le dire mentirait par le silence.
 */
const PAGES_MAX = 8;

/**
 * CE QUE LA LISTE EST, ÉCRIT POUR ÊTRE LU PAR LE GÉRANT.
 *
 * Cette phrase part avec la fiche quand une étude est retenue au carnet :
 * `ajouterIntervenant` la REFUSE sans elle. Une fiche venue d'un répertoire
 * public sans sa source ni sa date devient indiscernable d'une donnée
 * officielle et fraîche, et c'est le défaut que ce produit traque en priorité.
 */
const SOURCE =
	'Registre des entreprises (API Recherche d’entreprises, DINUM), filtré sur la convention ' +
	'collective 3250 et l’activité 69.10Z. Ce n’est pas le tableau de la profession : une étude ' +
	'qui n’a pas déclaré sa convention collective n’y figure pas, et une radiation disciplinaire ' +
	'n’y figure pas non plus. Le filtre de département porte sur les établissements, pas sur le ' +
	'siège : une étude dont le siège est ailleurs peut remonter.';

/** Une étude, telle que l'écran la lit. */
export interface EtudeTrouvee {
	readonly siren: string;
	readonly nom: string;
	readonly commune: string;
	readonly codePostal: string;
	readonly adresse?: string;
}

export interface ResultatAnnuaire {
	readonly departement: string;
	/**
	 * ⚠️ TABLEAU MUTABLE, ET CE N'EST PAS UN OUBLI. Un `readonly T[]` ne
	 * s'assigne pas au type que Convex déduit de `v.array(…)`, et le compilateur
	 * refuse le handler. Les CHAMPS restent en lecture seule ; c'est la seule
	 * partie de la promesse que la plateforme permet de tenir ici.
	 */
	readonly etudes: EtudeTrouvee[];
	/** Ce que le registre DÉCLARE exister, même quand on n'a pas tout lu. */
	readonly total: number;
	readonly source: string;
	readonly releveeLe: string;
}

const vEtude = v.object({
	siren: v.string(),
	nom: v.string(),
	commune: v.string(),
	codePostal: v.string(),
	adresse: v.optional(v.string())
});

/** Une chaîne non vide, ou `undefined`. Le registre rend `null` sur ce qu'il ignore. */
function texte(valeur: unknown): string | undefined {
	if (typeof valeur !== 'string') return undefined;
	const propre = valeur.trim();
	return propre === '' ? undefined : propre;
}

/**
 * Un enregistrement du registre, lu.
 *
 * ⚠️ `nom_complet`, PAS `nom_raison_sociale`. Le second est VIDE sur les études
 * exercées en nom propre — relevé sur « CORINNE LELIEVRE (TEXIER) », en
 * Loire-Atlantique, dont la raison sociale est une chaîne vide. Préférer le
 * champ le plus propre aurait fait disparaître de la liste, sans un mot, les
 * praticiens qui n'exercent pas en société.
 *
 * ⚠️ ET LE NOM EST CITÉ TEL QUEL, parenthèses comprises. « COMMISSAIRES DE
 * L'OUEST (COMMISSAIRES DE L'OUEST) (CDOUEST) » est laid ; le nettoyer serait
 * recomposer une dénomination officielle, c'est-à-dire afficher quelque chose
 * que le registre ne dit pas.
 */
function lireEtude(brut: unknown): EtudeTrouvee | null {
	if (typeof brut !== 'object' || brut === null) return null;
	const enregistrement = brut as { siren?: unknown; nom_complet?: unknown; siege?: unknown };

	const siren = texte(enregistrement.siren);
	const nom = texte(enregistrement.nom_complet);
	if (siren === undefined || nom === undefined) return null;

	const siege =
		typeof enregistrement.siege === 'object' && enregistrement.siege !== null
			? (enregistrement.siege as {
					libelle_commune?: unknown;
					code_postal?: unknown;
					adresse?: unknown;
				})
			: {};

	return {
		siren,
		nom,
		commune: texte(siege.libelle_commune) ?? '',
		codePostal: texte(siege.code_postal) ?? '',
		adresse: texte(siege.adresse)
	};
}

/**
 * LA GARDE DE SESSION, ET ELLE N'EXISTE QUE POUR ÇA.
 *
 * `chercherUnCommissaireDeJustice` est une `action` : elle ne touche pas la
 * base, donc rien dans son corps ne vérifierait qui appelle. Sans cette
 * requête, le déploiement serait un RELAIS OUVERT vers une API tierce,
 * utilisable par qui connaît l'URL — le même défaut que
 * `denominationDuDebiteur` ferme du côté du registre BODACC.
 *
 * Elle ne rend rien : il n'y a ici aucune donnée d'établissement à lire. Un
 * département n'appartient à personne.
 */
export const sessionRequise = authedQuery({
	args: {},
	returns: v.null(),
	handler: async (): Promise<null> => null
});

/**
 * LES ÉTUDES D'UN DÉPARTEMENT, PAR ORDRE ALPHABÉTIQUE.
 *
 * ⚠️ ALPHABÉTIQUE, JAMAIS PAR PERTINENCE. L'API rend ses résultats dans son
 * propre ordre de score ; le garder ferait du premier rang une mise en avant,
 * et une mise en avant est une orientation. C'est la même discipline que
 * `monCarnet` et que la liste des voies de procédure : on énumère, on ne classe
 * pas.
 *
 * ⚠️ UNE ERREUR LÈVE, ELLE NE REND PAS UNE LISTE VIDE. « Aucune étude dans ce
 * département » et « le registre n'a pas répondu » mènent à deux gestes
 * opposés : chercher ailleurs, ou réessayer dans une minute. Les confondre
 * serait un repli silencieux, donc un mensonge.
 */
export const chercherUnCommissaireDeJustice = action({
	args: { departement: v.string() },
	returns: v.object({
		departement: v.string(),
		etudes: v.array(vEtude),
		total: v.number(),
		source: v.string(),
		releveeLe: v.string()
	}),
	handler: async (ctx, { departement }): Promise<ResultatAnnuaire> => {
		// ⚠️ L'ANNOTATION DE RETOUR CI-DESSUS N'EST PAS DÉCORATIVE. Une action qui
		// appelle une fonction de son propre module crée un cycle d'inférence :
		// le type de `api` contient celui du handler, qui dépend de `api`.
		// TypeScript renonce, retombe sur `any`, et TOUS les écrans du produit
		// perdent leur inférence — y compris ceux qui n'ont pas été touchés.
		await ctx.runQuery(api.recouvrement.annuaires.sessionRequise, {});

		const recherche = departement.trim();
		if (recherche === '') {
			// Sans département, l'API répond 400 ; mais le dire ici nomme la cause
			// au lieu de faire remonter un code de statut qui ne l'explique pas.
			throw new ConvexError(
				'Aucun département n’a été donné. La recherche porte sur un département à la fois.'
			);
		}

		const etudes: EtudeTrouvee[] = [];
		let total = 0;

		for (let page = 1; page <= PAGES_MAX; page++) {
			const url =
				`${BASE_RECHERCHE_ENTREPRISES}?id_convention_collective=${CONVENTION_COLLECTIVE_COMMISSAIRES}` +
				`&activite_principale=${encodeURIComponent(ACTIVITE_JURIDIQUE)}` +
				`&departement=${encodeURIComponent(recherche)}` +
				`&per_page=${PAR_PAGE}&page=${page}`;

			const reponse = await fetch(url);
			if (!reponse.ok) {
				// ⚠️ LE 400 EST NOMMÉ À PART. C'est la réponse de l'API à un
				// département qu'elle n'accepte pas — « 9 » au lieu de « 09 », une
				// coquille, un code qui n'existe pas. Un « le registre a répondu 400 »
				// ferait chercher une panne là où il n'y a qu'une saisie à corriger.
				throw new ConvexError(
					reponse.status === 400
						? `Le registre des entreprises n’a pas accepté le département « ${recherche} ». ` +
								'Il attend deux caractères — 44, 09, 2A — ou trois outre-mer.'
						: `Le registre des entreprises a répondu ${reponse.status}. ` +
								'La recherche n’a pas pu aboutir, et la liste n’est donc pas vide : elle est inconnue.'
				);
			}

			const charge = (await reponse.json()) as { results?: unknown; total_results?: unknown };
			if (typeof charge.total_results === 'number') total = charge.total_results;

			const lots = Array.isArray(charge.results) ? charge.results : [];
			for (const brut of lots) {
				const etude = lireEtude(brut);
				if (etude !== null) etudes.push(etude);
			}

			if (lots.length < PAR_PAGE) break;
		}

		return {
			departement: recherche,
			etudes: etudes.sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
			total,
			source: SOURCE,
			releveeLe: new Date().toISOString().slice(0, 10)
		};
	}
});
