import { v, ConvexError } from 'convex/values';
import { action, internalMutation } from '../_generated/server';
import type { Doc } from '../_generated/dataModel';
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ANNUAIRE NATIONAL DES AVOCATS — INGÉRÉ, PAS INTERROGÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le Conseil national des barreaux publie l'annuaire national des avocats sur
 * data.gouv.fr, sous Licence Ouverte 2.0, en CSV à séparateur point-virgule. Il
 * le publie parce que le Conseil d'État l'y a enjoint : la réutilisation ne se
 * discute pas, et c'est ce qui distingue cette source de l'annuaire des
 * commissaires de justice, qu'on n'aspire pas.
 *
 * ⚠️ IL N'Y A PAS D'API. Quarante-trois fichiers en téléchargement direct, et
 * rien d'autre. On INGÈRE donc — table `annuaireAvocats`, script
 * `importer-annuaire-avocats.ts` — là où les études se cherchent en direct au
 * registre des entreprises. Les deux moitiés de ce fichier ne se ressemblent
 * pas parce que les deux sources ne se ressemblent pas.
 */

/**
 * CE QUE LA LISTE EST, ÉCRIT POUR ÊTRE LU PAR LE GÉRANT.
 *
 * Cette phrase part avec la fiche quand un avocat est retenu au carnet :
 * `ajouterIntervenant` la REFUSE sans elle, avec sa date de relevé.
 *
 * ⚠️ « NON DÉCLARÉE » N'EST PAS « INEXISTANTE ». Le fichier ne porte de
 * spécialité que pour une petite minorité des fiches — relevé au 17 juillet
 * 2026 : environ mille fiches sur les treize mille premières. Un écran qui
 * filtrerait sans le dire ferait conclure qu'un barreau ne compte aucun avocat
 * compétent en la matière, alors qu'il dit seulement que personne ne l'a
 * déclaré.
 */
const SOURCE_AVOCATS =
	'Annuaire national des avocats (Conseil national des barreaux), publié sur data.gouv.fr sous ' +
	'Licence Ouverte 2.0. C’est une photographie mensuelle : une fiche peut décrire une situation ' +
	'périmée — un avocat qui a changé de barreau, déménagé, ou cessé d’exercer depuis le relevé. ' +
	'Les spécialités sont celles que l’avocat a DÉCLARÉES au fichier : leur absence ne dit pas ' +
	'qu’il n’en a aucune, elle dit qu’aucune n’est inscrite.';

/**
 * Le nombre de fiches qu'on accepte de lire pour un barreau.
 *
 * BORNE DURE. Le fichier compte environ soixante-dix mille avocats, dont près
 * de la moitié au seul barreau de Paris : une lecture non bornée dépasserait la
 * limite de documents d'une requête Convex et ferait échouer l'écran entier —
 * pas seulement la recherche.
 *
 * ⚠️ ET CE QU'ELLE COUPE SE DIT. Le retour porte `lectureTronquee` : quand elle
 * vaut vrai, `total` n'est plus un total mais un PLANCHER, et l'écran l'écrit.
 * C'est la leçon du registre des entreprises, où afficher vingt-cinq études sur
 * cent quatorze sans un mot aurait menti par le silence.
 */
const FICHES_LUES_MAX = 4000;

/** Ce qu'on rend à l'écran. Au-delà, une liste ne se lit plus : elle se filtre. */
const FICHES_AFFICHEES_MAX = 200;

/**
 * La borne du parcours par sauts qui rend la liste des barreaux.
 *
 * ⚠️ ELLE NE COUPE PAS LA FRANCE EN DEUX, et c'est la différence avec celle
 * du dessus. La France compte cent soixante et quelques barreaux ; quatre cents
 * laisse toute la marge voulue. Elle existe pour qu'une ingestion abîmée — un
 * séparateur mal lu, et chaque fiche porte alors un barreau différent — ne
 * fasse pas boucler la requête sur la table entière.
 */
const BARREAUX_MAX = 400;

/** Un avocat, tel que l'écran le lit. */
export interface AvocatTrouve {
	readonly nom: string;
	readonly prenom: string;
	readonly raisonSociale?: string;
	readonly siren?: string;
	readonly adresse?: string;
	readonly codePostal?: string;
	readonly ville?: string;
	/** ⚠️ Mutable, pour la même raison que `etudes` plus haut : Convex l'exige. */
	readonly specialites: string[];
}

export interface ResultatAvocats {
	readonly barreau: string;
	/** La spécialité sur laquelle on a filtré, telle quelle. `null` = aucune. */
	readonly specialite: string | null;
	readonly avocats: AvocatTrouve[];
	/**
	 * Combien de fiches CORRESPONDENT au filtre, pas combien sont affichées.
	 *
	 * ⚠️ UN PLANCHER QUAND `lectureTronquee` VAUT VRAI, pas un total. Les deux
	 * champs se lisent ensemble ou pas du tout.
	 */
	readonly total: number;
	readonly lectureTronquee: boolean;
	/**
	 * Les spécialités réellement déclarées dans ce barreau, par ordre
	 * alphabétique.
	 *
	 * ⚠️ ELLES VIENNENT DU FICHIER, PAS DE NOUS. Une nomenclature écrite à la
	 * main ici vieillirait sans que rien ne l'indique, et proposerait des
	 * filtres qui ne rendent jamais personne.
	 */
	readonly specialitesDeclarees: string[];
	readonly source: string;
	/** Le jour du relevé, ou `null` quand aucune livraison n'a été ingérée. */
	readonly releveeLe: string | null;
}

export interface ListeBarreaux {
	readonly barreaux: string[];
	/** Faux si le parcours a buté sur sa borne : la liste est alors partielle. */
	readonly complete: boolean;
	readonly releveeLe: string | null;
}

const vAvocat = v.object({
	nom: v.string(),
	prenom: v.string(),
	raisonSociale: v.optional(v.string()),
	siren: v.optional(v.string()),
	adresse: v.optional(v.string()),
	codePostal: v.optional(v.string()),
	ville: v.optional(v.string()),
	specialites: v.array(v.string())
});

/**
 * LES BARREAUX DISPONIBLES, PAR SAUTS D'INDEX.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE LECTURE BORNÉE ET DÉDOUBLONNÉE AURAIT MENTI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lire les deux mille premières fiches et dédoublonner leur barreau ne rend pas
 * les barreaux : ça rend ceux du DÉBUT de l'index, c'est-à-dire le début de
 * l'alphabet. Un gérant de Toulon aurait cherché son barreau dans une liste qui
 * s'arrête à Bordeaux, et conclu qu'il n'y est pas.
 *
 * `by_barreau` est ordonné : on lit la première fiche, puis la première dont le
 * barreau est STRICTEMENT SUPÉRIEUR au précédent, et ainsi de suite. Un
 * document lu par barreau — cent soixante et quelques — donc moins cher qu'une
 * lecture bornée, et EXHAUSTIF, ce qu'elle n'est pas.
 */
export const barreauxDuRepertoire = authedQuery({
	args: {},
	returns: v.object({
		barreaux: v.array(v.string()),
		complete: v.boolean(),
		releveeLe: v.union(v.string(), v.null())
	}),
	handler: async (ctx): Promise<ListeBarreaux> => {
		const barreaux: string[] = [];
		let releveeLe: string | null = null;
		let dernier: string | null = null;
		let epuise = false;

		for (let saut = 0; saut < BARREAUX_MAX; saut++) {
			// ⚠️ RECOPIÉ DANS UNE CONSTANTE ANNOTÉE, et les deux moitiés comptent.
			// La constante, parce que la narration d'un `let` capturé par une
			// fermeture ne survit pas. L'annotation, parce que sans elle `dernier`
			// se déduit de `fiche`, qui se déduit de `borne`, qui se déduit de
			// `dernier` : TypeScript renonce et retombe sur `any` (TS7022).
			const borne: string | null = dernier;
			const fiche: Doc<'annuaireAvocats'> | null = await (
				borne === null
					? ctx.db.query('annuaireAvocats').withIndex('by_barreau')
					: ctx.db.query('annuaireAvocats').withIndex('by_barreau', (q) => q.gt('barreau', borne))
			).first();

			if (fiche === null) {
				epuise = true;
				break;
			}

			// La date du relevé est celle de la LIVRAISON : une livraison remplace,
			// elle ne s'ajoute pas, donc toutes les fiches portent la même.
			releveeLe ??= fiche.releveeLe;
			barreaux.push(fiche.barreau);
			dernier = fiche.barreau;
		}

		return { barreaux, complete: epuise, releveeLe };
	}
});

/**
 * Les avocats d'un barreau, filtrés sur leurs spécialités déclarées.
 *
 * ⚠️ ON FILTRE, ON NE CLASSE PAS. Ordre alphabétique, et les deux filtres ne
 * portent que sur des champs présents dans le fichier du CNB : le barreau, et
 * les trois champs de spécialité. Aucun critère de notre invention, aucune mise
 * en avant.
 */
export const chercherUnAvocat = authedQuery({
	args: { barreau: v.string(), specialite: v.optional(v.string()) },
	returns: v.object({
		barreau: v.string(),
		specialite: v.union(v.string(), v.null()),
		avocats: v.array(vAvocat),
		total: v.number(),
		lectureTronquee: v.boolean(),
		specialitesDeclarees: v.array(v.string()),
		source: v.string(),
		releveeLe: v.union(v.string(), v.null())
	}),
	handler: async (ctx, { barreau, specialite }): Promise<ResultatAvocats> => {
		const recherche = barreau.trim();
		if (recherche === '') {
			// Nommer la cause ici évite de rendre une liste vide, qui se lirait
			// « aucun avocat » là où il n'y a qu'un champ non rempli.
			throw new ConvexError(
				'Aucun barreau n’a été donné. La recherche porte sur un barreau à la fois.'
			);
		}

		// Une fiche de plus que la borne : c'est ce qui permet de DISTINGUER
		// « le barreau en compte exactement quatre mille » de « la lecture s'est
		// arrêtée là ». Sans elle, les deux se ressemblent.
		const lues = await ctx.db
			.query('annuaireAvocats')
			.withIndex('by_barreau_and_nom', (q) => q.eq('barreau', recherche))
			.take(FICHES_LUES_MAX + 1);

		const lectureTronquee = lues.length > FICHES_LUES_MAX;
		const fiches = lectureTronquee ? lues.slice(0, FICHES_LUES_MAX) : lues;

		const specialitesDeclarees = [...new Set(fiches.flatMap((f) => f.specialites))].sort((a, b) =>
			a.localeCompare(b, 'fr')
		);

		const cherchee = specialite?.trim() ?? '';
		const retenues =
			cherchee === '' ? fiches : fiches.filter((f) => f.specialites.includes(cherchee));

		/*
		  ⚠️ RETRIÉ EN COLLATION FRANÇAISE, alors que l'index rend déjà par nom.
		  L'index ordonne des octets : « ÉTIENNE » y tombe après « ZOLA », et la
		  liste se lirait comme si les noms accentués avaient été rejetés à la fin.
		*/
		const avocats = retenues
			.sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'))
			.slice(0, FICHES_AFFICHEES_MAX)
			.map((l) => ({
				nom: l.nom,
				prenom: l.prenom,
				raisonSociale: l.raisonSociale,
				siren: l.siren,
				adresse: l.adresse,
				codePostal: l.codePostal,
				ville: l.ville,
				specialites: l.specialites
			}));

		/*
		  ⚠️ LA DATE SE RELIT SUR LA TABLE QUAND LE BARREAU EST VIDE. « Ce barreau
		  est absent du relevé du 17 juillet » et « aucun relevé n'a été ingéré »
		  mènent à deux gestes opposés — chercher un autre barreau, ou importer le
		  fichier — et les confondre ferait chercher longtemps.
		*/
		const premiere = fiches[0] ?? (await ctx.db.query('annuaireAvocats').first());

		return {
			barreau: recherche,
			specialite: cherchee === '' ? null : cherchee,
			avocats,
			total: retenues.length,
			lectureTronquee,
			specialitesDeclarees,
			source: SOURCE_AVOCATS,
			releveeLe: premiere?.releveeLe ?? null
		};
	}
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * L'INGESTION — ⚠️ UNE LIVRAISON REMPLACE, ELLE NE S'AJOUTE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fichier est une photographie COMPLÈTE de l'annuaire à une date. L'empiler
 * sur la précédente ferait apparaître deux fois l'avocat qui a déménagé — une
 * fois à chaque adresse — et une fois de trop celui qui a quitté le barreau,
 * sans que rien ne distingue la fiche vivante de la fiche morte.
 *
 * D'où deux mutations plutôt qu'une : on VIDE, puis on INSÈRE. Elles travaillent
 * par lots parce qu'une transaction Convex est bornée, et que soixante-dix mille
 * fiches ne tiennent pas dans une seule.
 */

const vFicheAImporter = v.object({
	barreau: v.string(),
	nom: v.string(),
	prenom: v.string(),
	raisonSociale: v.optional(v.string()),
	siren: v.optional(v.string()),
	adresse: v.optional(v.string()),
	codePostal: v.optional(v.string()),
	ville: v.optional(v.string()),
	specialites: v.array(v.string())
});

/**
 * Efface un lot de l'ancienne livraison, et dit combien il en a effacé.
 *
 * Le zéro est la condition d'arrêt du script : c'est ce qui lui permet de vider
 * une table dont il ne connaît pas la taille sans jamais la compter.
 */
export const viderUnLot = internalMutation({
	args: { combien: v.number() },
	returns: v.number(),
	handler: async (ctx, { combien }): Promise<number> => {
		const lot = await ctx.db.query('annuaireAvocats').take(combien);
		for (const fiche of lot) await ctx.db.delete(fiche._id);
		return lot.length;
	}
});

/**
 * Insère un lot de la nouvelle livraison, toutes les fiches datées du MÊME jour.
 *
 * ⚠️ `releveeLe` VIENT DU LOT, JAMAIS DE L'HORLOGE. Le fichier peut avoir deux
 * mois quand on l'ingère ; dater l'INGESTION ferait annoncer à l'écran une
 * fraîcheur qui n'existe pas, ce qui est exactement le défaut que ce répertoire
 * doit éviter — pas une donnée absente, une donnée fausse qu'on croit vraie.
 */
export const insererUnLot = internalMutation({
	args: { releveeLe: v.string(), fiches: v.array(vFicheAImporter) },
	returns: v.number(),
	handler: async (ctx, { releveeLe: releveDeLaLivraison, fiches }): Promise<number> => {
		for (const fiche of fiches) {
			await ctx.db.insert('annuaireAvocats', {
				barreau: fiche.barreau,
				nom: fiche.nom,
				prenom: fiche.prenom,
				raisonSociale: fiche.raisonSociale,
				siren: fiche.siren,
				adresse: fiche.adresse,
				codePostal: fiche.codePostal,
				ville: fiche.ville,
				specialites: fiche.specialites,
				releveeLe: releveDeLaLivraison
			});
		}
		return fiches.length;
	}
});
