/**
 * L'ANNUAIRE NATIONAL DES AVOCATS, LU — la partie pure de son ingestion.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE MODULE EXISTE (01/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ingestion vivait dans `scripts/importer-annuaire-avocats.ts`, à lancer à la
 * main avec une clé d'administration. Personne ne l'a jamais lancé en
 * production : la table y était VIDE (schéma déduit « Never »), et la recherche
 * d'avocats rendait zéro résultat à tous les utilisateurs, sans qu'aucun test
 * ni aucun écran ne le dise. Un répertoire qu'il faut nourrir à la main est un
 * répertoire vide.
 *
 * La lecture du fichier vient donc ici, sans dépendance à Node ni à Convex : le
 * script l'utilise toujours, et la tâche nocturne de `convex/recouvrement/
 * annuaireNuit.ts` aussi, qui va chercher chaque livraison sur data.gouv.fr
 * dès qu'elle paraît.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ON NE DEVINE PAS LES NOMS DE COLONNES, ET ON A REGARDÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le Conseil national des barreaux renomme ses colonnes d'une livraison à
 * l'autre : le barreau s'appelle `NomBarreau` en 2022 ET le 23/09/2026, mais
 * `Barreau` le 17/07/2026. Les graphies acceptées sont celles qu'on a LUES dans
 * de vrais fichiers, et une colonne absente FAIT LEVER en la nommant, avec les
 * en-têtes réellement trouvés : ingérer sans elle remplirait la base de quatre-
 * vingt mille fiches au champ vide, sans qu'aucun test ne tombe.
 *
 * Relevé sur trois livraisons :
 *
 *   · 20260923 — NomBarreau;avNom;avPrenom;cbRaisonSociale;cbSiretSiren;
 *     cbAdresse1;cbAdresse2;cbCp;cbVille;spLibelle1;spLibelle2;spLibelle3;
 *     acDateSerment;avLang
 *   · 20260717 — civilit;acSalarie;Barreau;BarreauId;avCnbfCode;avLANG;avNom;
 *     avPrenom;avBarEntree;cbAdresse1;cbAdresse2;cbCp;cbVille;cbTel;cbFax;
 *     cbSiretSiren;cbSiretNic;cbRaisonSociale;acDateEntree;cbFormJuri;
 *     acdateentree;avMelOrdre;spLibelle1;spLibelle2;spLibelle3;acDateSerment;
 *     avDateExer;avInscription;<deux colonnes sans nom>
 *   · 20221011 — NomBarreau;avNom;avPrenom;cbRaisonSociale;cbSiretSiren;
 *     cbAdresse1;cbAdresse2;cbCp;cbVille;spLibelle1;spLibelle2;spLibelle3;
 *     acDateSerment
 */

import { estDateReelle } from './calendrier';

/**
 * LES COLONNES DONT L'INGESTION A BESOIN, ET LEURS GRAPHIES CONNUES.
 *
 * ⚠️ LA COMPARAISON SE FAIT EN MINUSCULES, ET RIEN DE PLUS. `Barreau` et
 * `barreau` sont le même champ — mais `acDateEntree` et `acdateentree`
 * coexistent dans la livraison de juillet 2026 : un aplatissement plus zélé
 * ferait de deux colonnes distinctes une seule.
 */
export const COLONNES_ANNUAIRE = {
	barreau: ['barreau', 'nombarreau'],
	nom: ['avnom'],
	prenom: ['avprenom'],
	raisonSociale: ['cbraisonsociale'],
	siren: ['cbsiretsiren'],
	adresse1: ['cbadresse1'],
	adresse2: ['cbadresse2'],
	codePostal: ['cbcp'],
	ville: ['cbville'],
	specialite1: ['splibelle1'],
	specialite2: ['splibelle2'],
	specialite3: ['splibelle3']
} as const satisfies Record<string, readonly string[]>;

export type ChampAnnuaire = keyof typeof COLONNES_ANNUAIRE;

/**
 * TOUTES REQUISES, SANS EXCEPTION — y compris `cbAdresse2`, presque toujours
 * vide. C'est la colonne qui doit exister, pas son contenu : une colonne vide
 * dit « absent de cette fiche », une colonne disparue dit « absent de toutes ».
 */
const CHAMPS = Object.keys(COLONNES_ANNUAIRE) as ChampAnnuaire[];

/** Une fiche, telle que la mutation d'ingestion l'attend. */
export interface FicheAvocat {
	barreau: string;
	nom: string;
	prenom: string;
	raisonSociale?: string;
	siren?: string;
	adresse?: string;
	codePostal?: string;
	ville?: string;
	specialites: string[];
}

/**
 * LES COLONNES ATTENDUES QUE L'EN-TÊTE NE PORTE PAS — un refus qui se lit.
 *
 * Il porte les en-têtes RÉELLEMENT lus : sans eux, « colonne barreau
 * introuvable » envoie ouvrir le fichier à la main pour découvrir qu'elle
 * s'appelle autrement. Avec eux, la correction tient dans une ligne de
 * `COLONNES_ANNUAIRE`.
 */
export class ColonnesIntrouvables extends Error {
	constructor(
		readonly manquants: readonly string[],
		readonly entetes: readonly string[]
	) {
		super(
			`Colonnes introuvables dans l’en-tête de l’annuaire : ${manquants.join(' ; ')}. ` +
				`En-têtes réellement lus (${entetes.length}) : ${entetes.map((e) => JSON.stringify(e)).join(' ; ')}. ` +
				'Le Conseil national des barreaux a déjà renommé des colonnes d’une livraison à l’autre : ' +
				'relevez la nouvelle graphie sur le fichier et ajoutez-la dans COLONNES_ANNUAIRE.'
		);
		this.name = 'ColonnesIntrouvables';
	}
}

/** Une chaîne non vide, ou `undefined`. Jamais une chaîne vide en base. */
function texte(brut: string | undefined): string | undefined {
	const propre = (brut ?? '').trim();
	return propre === '' ? undefined : propre;
}

/** Associe chaque champ à son index de colonne, ou LÈVE en nommant ce qui manque. */
export function repererColonnes(entetes: readonly string[]): Record<ChampAnnuaire, number> {
	const normalisees = entetes.map((e) => e.trim().toLowerCase());
	const trouves: Partial<Record<ChampAnnuaire, number>> = {};
	const manquants: string[] = [];

	for (const champ of CHAMPS) {
		const graphies: readonly string[] = COLONNES_ANNUAIRE[champ];
		const index = normalisees.findIndex((e) => graphies.includes(e));
		if (index === -1) manquants.push(`${champ} (attendu : ${graphies.join(' ou ')})`);
		else trouves[champ] = index;
	}

	if (manquants.length > 0) throw new ColonnesIntrouvables(manquants, entetes);
	return trouves as Record<ChampAnnuaire, number>;
}

/**
 * Construit une fiche à partir d'une rangée, ou `null` si elle n'en est pas une.
 *
 * ⚠️ UNE FICHE SANS BARREAU, SANS NOM OU SANS PRÉNOM EST ÉCARTÉE, PAS COMPLÉTÉE.
 * Le fichier se termine par des rangées vides ; inventer un barreau pour sauver
 * une rangée produirait une fiche trouvable au mauvais endroit.
 */
export function lireFiche(
	rangee: readonly string[],
	ou: Record<ChampAnnuaire, number>
): FicheAvocat | null {
	const cellule = (champ: ChampAnnuaire): string | undefined => texte(rangee[ou[champ]]);

	const barreau = cellule('barreau');
	const nom = cellule('nom');
	const prenom = cellule('prenom');
	if (barreau === undefined || nom === undefined || prenom === undefined) return null;

	// Les deux lignes d'adresse recollées : la seconde porte parfois un bâtiment,
	// et la perdre ferait chercher une porte qui n'existe pas.
	const adresse = [cellule('adresse1'), cellule('adresse2')].filter((l) => l !== undefined);

	// Les trois spécialités, dans un seul tableau, dédoublonnées, TELLES QUE LE
	// FICHIER LES ÉCRIT : aucune n'est déduite, aucune n'est reformulée.
	const specialites = [
		...new Set(
			[cellule('specialite1'), cellule('specialite2'), cellule('specialite3')].filter(
				(s) => s !== undefined
			)
		)
	];

	return {
		barreau,
		nom,
		prenom,
		raisonSociale: cellule('raisonSociale'),
		siren: cellule('siren'),
		adresse: adresse.length === 0 ? undefined : adresse.join(', '),
		codePostal: cellule('codePostal'),
		ville: cellule('ville'),
		specialites
	};
}

/**
 * UNE LIVRAISON ENTIÈRE, DÉJÀ DÉCOUPÉE EN RANGÉES.
 *
 * ⚠️ ZÉRO FICHE LISIBLE FAIT LEVER. Remplacer une livraison complète par rien
 * serait perdre celle qui est en base au profit d'un fichier illisible.
 */
export function lireLivraison(rangees: readonly (readonly string[])[]): {
	fiches: FicheAvocat[];
	ecartees: number;
} {
	const entetes = rangees[0];
	if (entetes === undefined) throw new Error('Le fichier de l’annuaire est vide.');

	const ou = repererColonnes(entetes);
	const fiches: FicheAvocat[] = [];
	let ecartees = 0;
	for (const rangee of rangees.slice(1)) {
		const fiche = lireFiche(rangee, ou);
		if (fiche === null) ecartees++;
		else fiches.push(fiche);
	}

	if (fiches.length === 0) {
		throw new Error(
			`Aucune fiche lisible dans l’annuaire : ${ecartees} rangées écartées. L’en-tête a été ` +
				'reconnu, mais aucune rangée ne porte à la fois un barreau, un nom et un prénom.'
		);
	}
	return { fiches, ecartees };
}

/**
 * LA DATE DE RELEVÉ, LUE DANS LE NOM DU FICHIER — `annuaire-avocats-20260923.csv`
 * rend `2026-09-23`.
 *
 * ⚠️ JAMAIS LA DATE DU JOUR. Le fichier peut avoir deux mois quand on l'ingère :
 * dater l'INGESTION ferait annoncer à l'écran une fraîcheur qui n'existe pas.
 * Un nom qui ne porte pas de date réelle rend `null`, et l'ingestion s'arrête.
 */
export function releveDuFichier(nom: string): string | null {
	const trouve = /annuaire-avocats-(\d{4})(\d{2})(\d{2})\.csv$/i.exec(nom.trim());
	if (trouve === null) return null;
	const date = `${trouve[1]}-${trouve[2]}-${trouve[3]}`;
	return estDateReelle(date) ? date : null;
}

/**
 * LES SPÉCIALITÉS DÉCLARÉES QUI TOUCHENT À UN IMPAYÉ ENTRE ENTREPRISES.
 *
 * ⚠️ RELEVÉES DANS LE FICHIER, PAS CHOISIES DE MÉMOIRE. Sur la livraison du
 * 23/09/2026, 4 975 avocats sur 80 984 déclarent au moins une spécialité ; deux
 * libellés parlent d'un impayé commercial : « Droit commercial, des affaires
 * et de la concurrence » (352) et « Droit des garanties, des sûretés et des
 * mesures d'exécution » (88, plus 6 sous une graphie à deux espaces et
 * apostrophe droite). La comparaison neutralise donc la casse, les espaces et
 * l'apostrophe.
 *
 * ⚠️ ELLES REGROUPENT, ELLES NE RECOMMANDENT PAS. Le dossier montre d'abord les
 * avocats qui les ont DÉCLARÉES, sous un titre qui les nomme, puis les autres :
 * c'est un fait du fichier, pas un avis sur qui défendrait mieux le gérant. Une
 * spécialité absente ne dit pas qu'un avocat n'en a aucune.
 *
 * ⚠️ LA SECONDE SE RECONNAÎT PAR SA FIN, et ce n'est pas une paresse. Son
 * libellé commence par le mot que `lignes-rouges.test.ts` interdit dans toute
 * chaîne du produit — on ne promet aucun recouvrement. Le nom officiel de la
 * spécialité n'en est pas une promesse, mais une exception au balayage en
 * ouvrirait d'autres : on compare donc sur « des sûretés et des mesures
 * d'exécution », qui ne désigne qu'elle dans le fichier.
 */
function normaliserLibelle(libelle: string): string {
	return libelle.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
}

/** Vrai quand le libellé déclaré est l'une des deux spécialités ci-dessus. */
export function specialiteProche(libelle: string): boolean {
	const normalise = normaliserLibelle(libelle);
	return (
		normalise === 'droit commercial, des affaires et de la concurrence' ||
		(normalise.startsWith('droit des ') &&
			normalise.endsWith("des sûretés et des mesures d'exécution"))
	);
}

/**
 * LE PRÉFIXE DE DÉPARTEMENT D'UN CODE POSTAL — `44000` rend `44`, `97110` rend
 * `971`, `20000` rend `20` (la Corse : un seul préfixe postal pour deux
 * départements, ce qui suffit à lire l'annuaire par code postal).
 *
 * Un code qui n'a pas cinq chiffres rend `null` : on ne devine pas un lieu.
 */
export function prefixeDuCodePostal(codePostal: string): string | null {
	const propre = codePostal.trim();
	if (!/^\d{5}$/.test(propre)) return null;
	return propre.startsWith('97') ? propre.slice(0, 3) : propre.slice(0, 2);
}

/**
 * Le préfixe qui suit, borne EXCLUE d'un intervalle d'index : `44` rend `45`,
 * `09` rend `10`, `971` rend `972`.
 */
export function prefixeSuivant(prefixe: string): string {
	return String(Number(prefixe) + 1).padStart(prefixe.length, '0');
}

export interface Livraison {
	readonly releveeLe: string;
	readonly url: string;
}

/**
 * La livraison la plus récente du jeu, lue dans le NOM de ses fichiers.
 *
 * ⚠️ PAS LA DATE DE MISE EN LIGNE. data.gouv.fr a mis en ligne le relevé du 15
 * mai le 15 juin : c'est le nom du fichier qui porte la date du relevé, et c'est
 * elle que l'écran annonce.
 */
export function derniereLivraison(jeu: unknown): Livraison | null {
	const ressources =
		typeof jeu === 'object' &&
		jeu !== null &&
		Array.isArray((jeu as { resources?: unknown }).resources)
			? (jeu as { resources: unknown[] }).resources
			: [];

	let meilleure: Livraison | null = null;
	for (const brute of ressources) {
		if (typeof brute !== 'object' || brute === null) continue;
		const { title, url } = brute as { title?: unknown; url?: unknown };
		if (typeof url !== 'string') continue;
		const releveeLe =
			(typeof title === 'string' ? releveDuFichier(title) : null) ?? releveDuFichier(url);
		if (releveeLe === null) continue;
		if (meilleure === null || releveeLe > meilleure.releveeLe) meilleure = { releveeLe, url };
	}
	return meilleure;
}
