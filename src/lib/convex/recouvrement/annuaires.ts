import { v, ConvexError } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { action, internalMutation, internalQuery } from '../_generated/server';
import type { Doc } from '../_generated/dataModel';
import { api, internal } from '../_generated/api';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import {
	normaliserPourRecherche,
	prefixeDuCodePostal,
	specialiteProche,
	texteDeRecherche
} from '../../verticales/recouvrement/annuaire-avocats';

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
	/**
	 * CE QUE LE REGISTRE DIT AUSSI DE L'ÉTUDE (08/10/2026), pour une fiche qui ait de
	 * la matière : où elle est (la carte), depuis quand elle existe, sa taille, et
	 * qui y exerce. Des faits publics, cités tels quels, jamais une appréciation.
	 */
	readonly latitude?: number;
	readonly longitude?: number;
	readonly creeeLe?: string;
	readonly effectif?: string;
	readonly associes?: string[];
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
	adresse: v.optional(v.string()),
	latitude: v.optional(v.number()),
	longitude: v.optional(v.number()),
	creeeLe: v.optional(v.string()),
	effectif: v.optional(v.string()),
	associes: v.optional(v.array(v.string()))
});

/**
 * LA TRANCHE D'EFFECTIF DU REGISTRE, EN CLAIR — les codes de l'INSEE, tels qu'ils
 * sont publiés. Un code inconnu ne s'affiche pas plutôt que de deviner.
 */
const TRANCHES_EFFECTIF: Readonly<Record<string, string>> = {
	'00': 'Sans salarié',
	'01': '1 ou 2 salariés',
	'02': '3 à 5 salariés',
	'03': '6 à 9 salariés',
	'11': '10 à 19 salariés',
	'12': '20 à 49 salariés',
	'21': '50 à 99 salariés',
	'22': '100 à 199 salariés',
	'31': '200 à 249 salariés',
	'32': '250 à 499 salariés',
	'41': '500 à 999 salariés',
	'42': '1 000 à 1 999 salariés'
};

/** Un nombre lu dans le registre, qui le rend souvent en chaîne. */
function nombre(valeur: unknown): number | undefined {
	const lu =
		typeof valeur === 'number' ? valeur : typeof valeur === 'string' ? Number(valeur) : NaN;
	return Number.isFinite(lu) ? lu : undefined;
}

/** Les personnes qui dirigent : « Prénom NOM », dans l'ordre du registre. */
function personnesQuiDirigent(brut: unknown): string[] | undefined {
	if (!Array.isArray(brut)) return undefined;
	const noms: string[] = [];
	for (const dirigeant of brut) {
		if (typeof dirigeant !== 'object' || dirigeant === null) continue;
		const d = dirigeant as { type_dirigeant?: unknown; nom?: unknown; prenoms?: unknown };
		if (d.type_dirigeant !== 'personne physique') continue;
		// Le registre double parfois le nom d'usage entre parenthèses : « GACHET (GACHET) ».
		const nom = texte(d.nom)?.replace(/\s*\([^)]*\)\s*$/, '');
		if (nom === undefined || nom === '') continue;
		const prenom = texte(d.prenoms)?.split(' ')[0];
		noms.push(prenom === undefined ? nom : `${prenom} ${nom}`);
	}
	return noms.length === 0 ? undefined : noms.slice(0, 12);
}

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
	const enregistrement = brut as {
		siren?: unknown;
		nom_complet?: unknown;
		siege?: unknown;
		date_creation?: unknown;
		tranche_effectif_salarie?: unknown;
		dirigeants?: unknown;
	};

	const siren = texte(enregistrement.siren);
	const nom = texte(enregistrement.nom_complet);
	if (siren === undefined || nom === undefined) return null;

	const siege =
		typeof enregistrement.siege === 'object' && enregistrement.siege !== null
			? (enregistrement.siege as {
					libelle_commune?: unknown;
					code_postal?: unknown;
					adresse?: unknown;
					latitude?: unknown;
					longitude?: unknown;
				})
			: {};

	const latitude = nombre(siege.latitude);
	const longitude = nombre(siege.longitude);
	const creeeLe = texte(enregistrement.date_creation);
	const tranche = texte(enregistrement.tranche_effectif_salarie);
	const effectif = tranche === undefined ? undefined : TRANCHES_EFFECTIF[tranche];
	const associes = personnesQuiDirigent(enregistrement.dirigeants);
	return {
		siren,
		nom,
		commune: texte(siege.libelle_commune) ?? '',
		codePostal: texte(siege.code_postal) ?? '',
		adresse: texte(siege.adresse),
		...(latitude === undefined || longitude === undefined ? {} : { latitude, longitude }),
		...(creeeLe === undefined ? {} : { creeeLe }),
		...(effectif === undefined ? {} : { effectif }),
		...(associes === undefined ? {} : { associes })
	};
}

/**
 * LA GARDE DE SESSION, ET ELLE N'EXISTE QUE POUR ÇA.
 *
 * `etudesParNom` est une `action` : elle ne touche pas la base, donc rien dans
 * son corps ne vérifierait qui appelle. Sans cette
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
 * LES ÉTUDES D'UN DÉPARTEMENT, LUES AU REGISTRE — écrite une fois pour la
 * recherche à la main et pour les propositions du dossier (01/10/2026).
 */
async function etudesDuDepartement(departement: string): Promise<ResultatAnnuaire> {
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
				releveeLe: releveDeLaLivraison,
				procheDuRecouvrement: fiche.specialites.some(specialiteProche),
				...completude(fiche)
			});
		}
		return fiches.length;
	}
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES PROFESSIONNELS PRÈS DU CLIENT — PROPOSÉS DANS LE DOSSIER, SANS RIEN SAISIR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur, le 01/10/2026 : « pourquoi on doit enregistrer un avocat ou un
 * commissaire de justice dans les paramètres pour ensuite le sélectionner dans
 * le dossier ? […] pourquoi on doit nous-même mettre les caractéristiques
 * (régions, villes, spécialités) alors qu'on a déjà toutes les infos sur
 * l'affaire ? »
 *
 * Le dossier connaît son client, et le client son SIREN : le registre des
 * entreprises donne alors le département et la commune de son siège. De là, les
 * études de commissaires de justice de ce département (registre, en direct) et
 * les avocats qui y exercent (annuaire du Conseil national des barreaux, ingéré
 * chaque nuit par `annuaireNuit.ts`).
 *
 * ⚠️ « PRÈS DU CLIENT » EST UN FAIT DE LIEU, PAS UNE COMPÉTENCE. Le référentiel
 * juridique de ce logiciel ne relève pas quelle profession ni quel ressort
 * convient à quel acte : la liste dit où les professionnels exercent, et le
 * gérant choisit. Rien n'est présélectionné.
 */

/** La date du relevé en base, ou `null` quand l'annuaire n'a jamais été nourri. */
export const releveEnBase = internalQuery({
	args: {},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx): Promise<string | null> => {
		const fiche = await ctx.db.query('annuaireAvocats').first();
		return fiche?.releveeLe ?? null;
	}
});

/** Un avocat proposé : la fiche lue, et le barreau qui dit devant qui il plaide. */
export interface AvocatPropose extends AvocatTrouve {
	readonly barreau: string;
}

function propose(fiche: Doc<'annuaireAvocats'>): AvocatPropose {
	return {
		nom: fiche.nom,
		prenom: fiche.prenom,
		raisonSociale: fiche.raisonSociale,
		siren: fiche.siren,
		adresse: fiche.adresse,
		codePostal: fiche.codePostal,
		ville: fiche.ville,
		specialites: fiche.specialites,
		barreau: fiche.barreau
	};
}

/** Ce que le dossier sait du client pour le situer. `null` hors de l'établissement. */
export const lieuConnuDuClient = authedQuery({
	args: { debiteurId: v.id('debiteurs') },
	returns: v.union(
		v.null(),
		v.object({
			denomination: v.string(),
			siren: v.union(v.string(), v.null()),
			adresse: v.union(v.string(), v.null())
		})
	),
	handler: async (
		ctx,
		{ debiteurId }
	): Promise<{ denomination: string; siren: string | null; adresse: string | null } | null> => {
		const { organizationId } = await getUserOrg(ctx);
		const client = await ctx.db.get(debiteurId);
		if (client === null || client.organizationId !== organizationId) return null;
		return {
			denomination: client.denomination,
			siren: client.siren ?? null,
			adresse: client.adresse ?? null
		};
	}
});

/** Où est le client : son département, son code postal, sa commune. */
export interface LieuDuClient {
	readonly departement: string;
	readonly codePostal: string | null;
	readonly commune: string | null;
	/** Le siège du client sur la carte, quand le registre le place : la distance aux professionnels. */
	readonly latitude?: number;
	readonly longitude?: number;
}

/**
 * LE LIEU DU CLIENT, LU AU REGISTRE PAR SON SIREN — sinon dans l'adresse que le
 * registre a déjà donnée.
 *
 * ⚠️ JAMAIS LE LIEU DU CRÉANCIER EN REPLI. Le proposer ferait chercher au
 * mauvais endroit un gérant qui ne relirait pas le champ, et il conclurait que
 * la région de son client ne compte aucune étude. Sans lieu connu, on le dit.
 */
async function lieuDuClient(client: {
	siren: string | null;
	adresse: string | null;
}): Promise<LieuDuClient | null> {
	if (client.siren !== null) {
		try {
			const reponse = await fetch(
				`${BASE_RECHERCHE_ENTREPRISES}?q=${encodeURIComponent(client.siren)}&page=1&per_page=1`
			);
			if (reponse.ok) {
				const charge = (await reponse.json()) as { results?: unknown };
				const premier = Array.isArray(charge.results) ? charge.results[0] : undefined;
				const siege =
					typeof premier === 'object' && premier !== null
						? (premier as { siren?: unknown; siege?: unknown })
						: null;
				if (siege !== null && siege.siren === client.siren && typeof siege.siege === 'object') {
					const lu = siege.siege as {
						departement?: unknown;
						code_postal?: unknown;
						libelle_commune?: unknown;
						latitude?: unknown;
						longitude?: unknown;
					};
					const departement = texte(lu.departement);
					const latitude = nombre(lu.latitude);
					const longitude = nombre(lu.longitude);
					if (departement !== undefined) {
						return {
							departement,
							codePostal: texte(lu.code_postal) ?? null,
							commune: texte(lu.libelle_commune) ?? null,
							...(latitude === undefined || longitude === undefined ? {} : { latitude, longitude })
						};
					}
				}
			}
		} catch {
			// Le registre ne répond pas : l'adresse déjà connue prend le relais.
		}
	}

	const codePostal =
		client.adresse === null ? null : (/\b(\d{5})\b/.exec(client.adresse)?.[1] ?? null);
	const prefixe = codePostal === null ? null : prefixeDuCodePostal(codePostal);
	if (codePostal === null || prefixe === null) return null;
	return { departement: prefixe, codePostal, commune: null };
}

const vEtatCommissaires = v.union(
	v.object({
		etat: v.literal('TROUVE'),
		resultat: v.object({
			departement: v.string(),
			etudes: v.array(vEtude),
			total: v.number(),
			source: v.string(),
			releveeLe: v.string()
		})
	}),
	v.object({ etat: v.literal('ECHEC'), message: v.string() })
);

export type EtatCommissaires =
	| { readonly etat: 'TROUVE'; readonly resultat: ResultatAnnuaire }
	| { readonly etat: 'ECHEC'; readonly message: string };

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PARCOURS DU CHOIX — CHERCHER, FAIRE DÉFILER, SANS RIEN SAISIR (12/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « trop complexe à manipuler, surtout avec des scrolls dans une
 * popup ; il faut une barre de recherche, ne pas mélanger avocats et commissaires,
 * un défilement infini ». La feuille « Qui fait l'acte » montrait trente avocats
 * au plus, puis renvoyait à une seconde feuille où l'on choisissait un barreau
 * parmi cent soixante. Désormais le parcours (`ui/parcours-professionnels.tsx`)
 * lit l'annuaire PAGE APRÈS PAGE, par ordre alphabétique dans le département du
 * client, ou par nom, cabinet ou ville dans toute la France.
 *
 * ⚠️ L'ORDRE RESTE CELUI DES NOMS, sauf quand le gérant tape quelque chose : les
 * résultats suivent alors ce qu'il a tapé — la correspondance à SA saisie, pas un
 * classement des professionnels. Rien n'est présélectionné, rien n'est mis en
 * avant.
 */

/** Ce que l'ingestion et le rattrapage écrivent sur chaque fiche pour la rendre cherchable. */
function completude(fiche: {
	readonly prenom: string;
	readonly nom: string;
	readonly raisonSociale?: string;
	readonly ville?: string;
	readonly codePostal?: string;
	readonly barreau: string;
}): { departement: string; texte: string } {
	return {
		// ⚠️ UNE CHAÎNE VIDE, PAS `undefined`, QUAND LE CODE POSTAL NE DIT RIEN. Le
		// rattrapage cherche les fiches au département ABSENT : une fiche sans lieu
		// laissée absente serait relue à chaque passage, sans fin.
		departement:
			fiche.codePostal === undefined ? '' : (prefixeDuCodePostal(fiche.codePostal) ?? ''),
		texte: texteDeRecherche(fiche)
	};
}

/** Combien de fiches le rattrapage complète par transaction. */
const LOT_A_COMPLETER = 500;

/**
 * LE RATTRAPAGE DES FICHES DÉJÀ EN BASE — leur département et leur texte de
 * recherche, qu'elles n'avaient pas avant le 12/10/2026.
 *
 * ⚠️ IL SE RELANCE TANT QU'IL TROUVE UN LOT PLEIN, puis se tait : une fois la table
 * complète, chaque passage du cron ne lit qu'une entrée d'index. La livraison
 * suivante arrive complète d'elle-même (`insererUnLot`).
 */
export const completerUnLot = internalMutation({
	args: {},
	returns: v.number(),
	// ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE : la mutation se reprogramme elle-même.
	handler: async (ctx): Promise<number> => {
		const lot = await ctx.db
			.query('annuaireAvocats')
			.withIndex('by_departement_and_nom_and_prenom', (q) => q.eq('departement', undefined))
			.take(LOT_A_COMPLETER);
		for (const fiche of lot) {
			await ctx.db.patch(fiche._id, {
				...completude(fiche),
				procheDuRecouvrement: fiche.procheDuRecouvrement ?? fiche.specialites.some(specialiteProche)
			});
		}
		if (lot.length === LOT_A_COMPLETER) {
			await ctx.scheduler.runAfter(0, internal.recouvrement.annuaires.completerUnLot, {});
		}
		return lot.length;
	}
});

/** Un avocat de la liste du choix : la fiche lue, son barreau et le jour du relevé. */
export interface AvocatDuSecteur extends AvocatPropose {
	readonly releveeLe: string;
}

const vAvocatDuSecteur = v.object({
	nom: v.string(),
	prenom: v.string(),
	raisonSociale: v.optional(v.string()),
	siren: v.optional(v.string()),
	adresse: v.optional(v.string()),
	codePostal: v.optional(v.string()),
	ville: v.optional(v.string()),
	specialites: v.array(v.string()),
	barreau: v.string(),
	releveeLe: v.string()
});

function duSecteur(fiche: Doc<'annuaireAvocats'>): AvocatDuSecteur {
	return { ...propose(fiche), releveeLe: fiche.releveeLe };
}

/**
 * LES AVOCATS, PAGE APRÈS PAGE.
 *
 *   · avec un texte : la recherche porte sur le nom, le cabinet, la ville, le
 *     code postal et le barreau, dans le département donné ou dans toute la
 *     France ;
 *   · sans texte : un département, par ordre alphabétique — ceux qui ont DÉCLARÉ
 *     une spécialité proche à part (`SEULEMENT`), les autres ensuite (`SANS`).
 *
 * ⚠️ SANS TEXTE NI DÉPARTEMENT, UNE PAGE VIDE ET TERMINÉE. Dérouler les quatre-
 * vingt mille fiches de la France entière ne se lit pas : l'écran demande un nom.
 */
export const avocatsDuSecteur = authedQuery({
	args: {
		paginationOpts: paginationOptsValidator,
		departement: v.optional(v.string()),
		recherche: v.optional(v.string()),
		specialiteProche: v.optional(v.union(v.literal('SEULEMENT'), v.literal('SANS')))
	},
	returns: paginationResultValidator(vAvocatDuSecteur),
	handler: async (ctx, { paginationOpts, departement, recherche, specialiteProche: proche }) => {
		const cherche = normaliserPourRecherche(recherche ?? '');
		if (cherche !== '') {
			const page = await ctx.db
				.query('annuaireAvocats')
				.withSearchIndex('search_texte', (q) =>
					departement === undefined
						? q.search('texte', cherche)
						: q.search('texte', cherche).eq('departement', departement)
				)
				.paginate(paginationOpts);
			return { ...page, page: page.page.map(duSecteur) };
		}
		if (departement === undefined) {
			return { page: [], isDone: true, continueCursor: '' };
		}
		const page = await (
			proche === undefined
				? ctx.db
						.query('annuaireAvocats')
						.withIndex('by_departement_and_nom_and_prenom', (q) => q.eq('departement', departement))
				: ctx.db
						.query('annuaireAvocats')
						.withIndex('by_proche_and_departement_and_nom_and_prenom', (q) =>
							q.eq('procheDuRecouvrement', proche === 'SEULEMENT').eq('departement', departement)
						)
		).paginate(paginationOpts);
		return { ...page, page: page.page.map(duSecteur) };
	}
});

/** La source des avocats et le jour de la livraison en base, pour l'écran. */
export const sourceDesAvocats = authedQuery({
	args: {},
	returns: v.object({ source: v.string(), releveeLe: v.union(v.string(), v.null()) }),
	handler: async (ctx): Promise<{ source: string; releveeLe: string | null }> => {
		const premiere = await ctx.db.query('annuaireAvocats').first();
		return { source: SOURCE_AVOCATS, releveeLe: premiere?.releveeLe ?? null };
	}
});

/** Les pages qu'on accepte de lire pour une recherche d'études par nom : au-delà, on affine. */
const PAGES_PAR_NOM_MAX = 20;

export interface EtudesParNom {
	readonly etudes: EtudeTrouvee[];
	readonly page: number;
	/** Combien de pages le registre annonce, bornées à `PAGES_PAR_NOM_MAX`. */
	readonly pages: number;
	readonly total: number;
	readonly source: string;
	readonly releveeLe: string;
}

/**
 * LES ÉTUDES DE TOUTE LA FRANCE, PAR NOM OU PAR VILLE — une page de vingt-cinq à
 * la fois, pour le défilement du parcours.
 *
 * ⚠️ UN ÉCHEC LÈVE, comme la recherche par département : une panne du registre ne
 * se rend jamais en « aucune étude ».
 */
export const etudesParNom = action({
	args: { recherche: v.string(), page: v.number() },
	returns: v.object({
		etudes: v.array(vEtude),
		page: v.number(),
		pages: v.number(),
		total: v.number(),
		source: v.string(),
		releveeLe: v.string()
	}),
	// ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE : l'action appelle son propre module.
	handler: async (ctx, { recherche, page }): Promise<EtudesParNom> => {
		await ctx.runQuery(api.recouvrement.annuaires.sessionRequise, {});
		const cherche = recherche.trim();
		if (cherche.length < 2) {
			throw new ConvexError('Tapez au moins deux lettres d’un nom ou d’une ville.');
		}
		const numero = Math.min(Math.max(1, Math.floor(page)), PAGES_PAR_NOM_MAX);
		const reponse = await fetch(
			`${BASE_RECHERCHE_ENTREPRISES}?q=${encodeURIComponent(cherche)}` +
				`&id_convention_collective=${CONVENTION_COLLECTIVE_COMMISSAIRES}` +
				`&activite_principale=${encodeURIComponent(ACTIVITE_JURIDIQUE)}` +
				`&per_page=${PAR_PAGE}&page=${numero}`
		);
		if (!reponse.ok) {
			throw new ConvexError(
				`Le registre des entreprises a répondu ${reponse.status}. ` +
					'La recherche n’a pas pu aboutir, et la liste n’est donc pas vide : elle est inconnue.'
			);
		}
		const charge = (await reponse.json()) as {
			results?: unknown;
			total_results?: unknown;
			total_pages?: unknown;
		};
		const lots = Array.isArray(charge.results) ? charge.results : [];
		const etudes: EtudeTrouvee[] = [];
		for (const brut of lots) {
			const etude = lireEtude(brut);
			if (etude !== null) etudes.push(etude);
		}
		const pages = typeof charge.total_pages === 'number' ? charge.total_pages : numero;
		return {
			etudes,
			page: numero,
			pages: Math.min(pages, PAGES_PAR_NOM_MAX),
			total: typeof charge.total_results === 'number' ? charge.total_results : etudes.length,
			source: SOURCE,
			releveeLe: new Date().toISOString().slice(0, 10)
		};
	}
});

/** Où est le client, avec le département POSTAL qui range l'annuaire des avocats. */
export interface SecteurDuClient {
	readonly client: string;
	readonly lieu: (LieuDuClient & { readonly prefixePostal: string | null }) | null;
	readonly commissaires: EtatCommissaires | null;
}

/**
 * LE SECTEUR D'UN CLIENT — son lieu, lu au registre par son SIREN, et les études
 * de son département. Les avocats ne viennent plus avec : ils se lisent page
 * après page (`avocatsDuSecteur`), d'après `prefixePostal`.
 */
export const secteurDuClient = action({
	args: { debiteurId: v.id('debiteurs') },
	returns: v.object({
		client: v.string(),
		lieu: v.union(
			v.null(),
			v.object({
				departement: v.string(),
				prefixePostal: v.union(v.string(), v.null()),
				codePostal: v.union(v.string(), v.null()),
				commune: v.union(v.string(), v.null()),
				latitude: v.optional(v.number()),
				longitude: v.optional(v.number())
			})
		),
		commissaires: v.union(v.null(), vEtatCommissaires)
	}),
	// ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE : l'action appelle son propre module.
	handler: async (ctx, { debiteurId }): Promise<SecteurDuClient> => {
		const client = await ctx.runQuery(api.recouvrement.annuaires.lieuConnuDuClient, {
			debiteurId
		});
		if (client === null) {
			throw new ConvexError('Ce client n’appartient pas à votre établissement.');
		}
		const lieu = await lieuDuClient(client);
		if (lieu === null) return { client: client.denomination, lieu: null, commissaires: null };

		const prefixePostal =
			(lieu.codePostal === null ? null : prefixeDuCodePostal(lieu.codePostal)) ??
			(/^\d{2,3}$/.test(lieu.departement) ? lieu.departement : null);
		const commissaires = await etudesDuDepartement(lieu.departement).then(
			(resultat): EtatCommissaires => ({ etat: 'TROUVE', resultat }),
			(erreur: unknown): EtatCommissaires => ({
				etat: 'ECHEC',
				message:
					erreur instanceof ConvexError && typeof erreur.data === 'string'
						? erreur.data
						: 'Le registre des entreprises n’a pas répondu : la liste des études est inconnue, pas vide.'
			})
		);
		return { client: client.denomination, lieu: { ...lieu, prefixePostal }, commissaires };
	}
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES DIRIGEANTS AU REGISTRE — « QUI SIGNE », PROPOSÉ AU LIEU D'ÊTRE TAPÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le gérant tapait le nom et la fonction de son signataire une fois à
 * l'installation, puis ceux du signataire de son client à chaque échéancier.
 * Le registre des entreprises publie les dirigeants d'une société : nom,
 * prénoms, qualité (« Président de SAS »). Ils sont PROPOSÉS, un toucher remplit
 * les deux champs, et le gérant corrige s'il le faut — c'est lui qui sait qui
 * signe vraiment.
 *
 * ⚠️ SEULES LES PERSONNES PHYSIQUES. Le registre liste aussi les commissaires
 * aux comptes, qui sont des personnes morales et ne signent pas pour la société.
 */

/** Un dirigeant tel que la feuille le propose : « Olivier ROUX », « Président de SAS ». */
export interface DirigeantAuRegistre {
	readonly nom: string;
	readonly fonction: string;
}

const vDirigeants = v.object({
	dirigeants: v.array(v.object({ nom: v.string(), fonction: v.string() })),
	releveeLe: v.string()
});

/** « OLIVIER JEAN » rend « Olivier » : le premier prénom, comme on signe. */
function premierPrenom(prenoms: string): string {
	const premier = prenoms.trim().split(/\s+/)[0] ?? '';
	return premier
		.toLowerCase()
		.split('-')
		.map((morceau) => morceau.charAt(0).toUpperCase() + morceau.slice(1))
		.join('-');
}

/** La fiche d'une entreprise au registre, vérifiée sur son SIREN, ou `null`. */
async function ficheAuRegistre(siren: string): Promise<Record<string, unknown> | null> {
	const reponse = await fetch(
		`${BASE_RECHERCHE_ENTREPRISES}?q=${encodeURIComponent(siren)}&page=1&per_page=1`
	);
	if (!reponse.ok) {
		throw new ConvexError(
			`Le registre des entreprises a répondu ${reponse.status} : les dirigeants sont inconnus, pas absents.`
		);
	}
	const charge = (await reponse.json()) as { results?: unknown };
	const premier = Array.isArray(charge.results) ? charge.results[0] : undefined;
	if (typeof premier !== 'object' || premier === null) return null;
	const fiche = premier as Record<string, unknown>;
	return fiche.siren === siren ? fiche : null;
}

async function dirigeantsDuSiren(siren: string): Promise<DirigeantAuRegistre[]> {
	const fiche = await ficheAuRegistre(siren);
	const bruts = fiche !== null && Array.isArray(fiche.dirigeants) ? fiche.dirigeants : [];
	const dirigeants: DirigeantAuRegistre[] = [];
	for (const brut of bruts) {
		if (typeof brut !== 'object' || brut === null) continue;
		const d = brut as {
			nom?: unknown;
			prenoms?: unknown;
			qualite?: unknown;
			type_dirigeant?: unknown;
		};
		if (d.type_dirigeant !== 'personne physique') continue;
		const nom = texte(d.nom);
		if (nom === undefined) continue;
		const prenom = texte(d.prenoms) === undefined ? '' : premierPrenom(texte(d.prenoms)!);
		dirigeants.push({
			nom: `${prenom} ${nom.toUpperCase()}`.trim(),
			fonction: texte(d.qualite) ?? ''
		});
	}
	return dirigeants;
}

/** Les dirigeants d'un SIREN — celui de l'établissement, que le gérant a déjà renseigné. */
export const dirigeantsAuRegistre = action({
	args: { siren: v.string() },
	returns: vDirigeants,
	// ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE : l'action appelle son propre module.
	handler: async (
		ctx,
		{ siren }
	): Promise<{ dirigeants: DirigeantAuRegistre[]; releveeLe: string }> => {
		await ctx.runQuery(api.recouvrement.annuaires.sessionRequise, {});
		return {
			dirigeants: await dirigeantsDuSiren(siren.trim()),
			releveeLe: new Date().toISOString().slice(0, 10)
		};
	}
});

/** Les dirigeants du client d'un dossier, d'après le SIREN de sa fiche. */
export const dirigeantsDuClient = action({
	args: { debiteurId: v.id('debiteurs') },
	returns: vDirigeants,
	handler: async (
		ctx,
		{ debiteurId }
	): Promise<{ dirigeants: DirigeantAuRegistre[]; releveeLe: string }> => {
		const client = await ctx.runQuery(api.recouvrement.annuaires.lieuConnuDuClient, {
			debiteurId
		});
		if (client === null) {
			throw new ConvexError('Ce client n’appartient pas à votre établissement.');
		}
		if (client.siren === null) {
			throw new ConvexError(
				`Le SIREN de ${client.denomination} n’est pas connu : renseigné sur sa fiche, il donnera ses dirigeants.`
			);
		}
		return {
			dirigeants: await dirigeantsDuSiren(client.siren),
			releveeLe: new Date().toISOString().slice(0, 10)
		};
	}
});
