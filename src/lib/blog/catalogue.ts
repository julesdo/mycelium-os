import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxFromMarkdown } from 'mdast-util-mdx';
import { mdxjs } from 'micromark-extension-mdxjs';
import { ECRANS_DE_CAPTURE } from './captures';
import { PARAMETRES } from '../verticales/recouvrement/parametres';

/**
 * LE CATALOGUE DE L'ÉDITEUR À BLOCS (20/10/2026) : ce que le fondateur insère sans taper une
 * ligne de MDX.
 *
 * Deux listes. Les VALEURS DE LA LOI, qu'on pose au fil du texte par le menu « @ » : chacune
 * est un composant qui lit le registre (`marketing/mdx.tsx`), jamais un chiffre tapé. Puis les
 * ILLUSTRATIONS, qu'on pose en blocs par le menu « / » ou le panneau : leurs réglages se
 * remplissent dans un formulaire, et le bloc se réécrit en MDX.
 *
 * Hors de l'interface exprès, comme les extraits : ce sont des noms de composants, que le
 * balayage du lexique lirait comme du texte affiché.
 */

// ─── Les valeurs de la loi ───────────────────────────────────────────────────

export type CleParametre = keyof typeof PARAMETRES;

export type GroupeDeValeur = 'Taux et montants' | 'Délais' | 'Valeurs du registre' | 'Références';

export interface ValeurDuCatalogue {
	/** Unique : le composant et ses attributs. */
	readonly id: string;
	readonly nom: string;
	readonly attributs: Readonly<Record<string, string>>;
	readonly libelle: string;
	readonly groupe: GroupeDeValeur;
	/** L'entrée du registre qui la porte : sa source et sa date de relevé. */
	readonly cle?: CleParametre;
	/** Ce que la recherche lit, sans accents. */
	readonly recherche: string;
}

/** Les accents des mots des clés du registre, pour qu'une clé se lise en français. */
const ACCENTS: Readonly<Record<string, string>> = {
	delai: 'délai',
	delais: 'délais',
	declaration: 'déclaration',
	declarees: 'déclarées',
	creance: 'créance',
	creances: 'créances',
	creanciers: 'créanciers',
	debiteur: 'débiteur',
	releve: 'relevé',
	interet: 'intérêt',
	interets: 'intérêts',
	legal: 'légal',
	legaux: 'légaux',
	procedure: 'procédure',
	qualite: 'qualité',
	commercant: 'commerçant',
	caractere: 'caractère',
	activites: 'activités',
	indemnite: 'indemnité',
	indemnites: 'indemnités',
	proces: 'procès',
	depart: 'départ',
	penalites: 'pénalités',
	feries: 'fériés',
	arret: 'arrêt',
	reglees: 'réglées',
	apres: 'après',
	echeance: 'échéance',
	reglement: 'règlement',
	suppletif: 'supplétif',
	complementaire: 'complémentaire',
	sincerite: 'sincérité',
	competente: 'compétente',
	confidentialite: 'confidentialité',
	entames: 'entamés',
	donnees: 'données',
	reclamation: 'réclamation',
	ecrite: 'écrite',
	defaut: 'défaut',
	a: 'à'
};

/** « delaiDeclarationCreance » → « Délai déclaration créance » ; « LActionDirecte » → « l’action directe ». */
export function libelleDeCle(cle: string): string {
	const mots = cle
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
		.split(' ')
		.map((mot) => mot.toLowerCase());
	const sortie: string[] = [];
	for (let rang = 0; rang < mots.length; rang += 1) {
		const mot = mots[rang] ?? '';
		const suivant = mots[rang + 1];
		if ((mot === 'l' || mot === 'd') && suivant !== undefined) {
			sortie.push(`${mot}’${ACCENTS[suivant] ?? suivant}`);
			rang += 1;
		} else sortie.push(ACCENTS[mot] ?? mot);
	}
	const phrase = sortie.join(' ').replace('sous traitant', 'sous-traitant');
	return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/** Le texte que la recherche compare : minuscules, sans accents. */
export function sansAccents(texte: string): string {
	return texte
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

function valeur(
	nom: string,
	attributs: Readonly<Record<string, string>>,
	libelle: string,
	groupe: GroupeDeValeur,
	cle?: CleParametre
): ValeurDuCatalogue {
	return {
		id: `${nom}:${JSON.stringify(attributs)}`,
		nom,
		attributs,
		libelle,
		groupe,
		...(cle === undefined ? {} : { cle }),
		recherche: sansAccents(
			`${libelle} ${libelleDeCle(nom)} ${Object.values(attributs).map(libelleDeCle).join(' ')}`
		)
	};
}

const REGIMES = [
	{ regime: 'GENERAL', libelle: 'cas général' },
	{ regime: 'TRANSPORT_MARCHANDISES', libelle: 'transport de marchandises' },
	{ regime: 'CONSOMMATEUR', libelle: 'client particulier' }
] as const;

const ACHETEURS_PUBLICS: Readonly<
	Record<keyof typeof PARAMETRES.delaisPaiementPublics.valeur, string>
> = {
	POUVOIR_ADJUDICATEUR: 'État et collectivités',
	SANTE: 'hôpital public',
	ENTREPRISE_PUBLIQUE: 'entreprise publique'
};

const CAS_CONVENUS: Readonly<
	Record<keyof typeof PARAMETRES.delaiDeReglementConvenuMaximal.valeur, string>
> = {
	apresFacture: 'après la facture',
	finDeMois: 'fin de mois',
	facturePeriodique: 'facture périodique'
};

/** Les clés du registre qu'affiche `<Valeur de>` : un délai, une durée ou un montant chiffré. */
export function estCleDeValeur(cle: CleParametre): boolean {
	const { valeur: v, unite } = PARAMETRES[cle] as { valeur: unknown; unite: string };
	return (
		['jours', 'mois', 'annees', 'centimes'].includes(unite) &&
		(typeof v === 'number' || typeof v === 'bigint')
	);
}

const CLES = Object.keys(PARAMETRES) as CleParametre[];

/** Les trois sources des régimes de prescription, qui ne sont pas des entrées du registre. */
export const SOURCES_DE_REGIMES = {
	'prescription-general': 'Délai pour agir, cas général',
	'prescription-transport': 'Délai pour agir, transport de marchandises',
	'prescription-consommateur': 'Délai pour agir, client particulier'
} as const;

export const VALEURS_DE_LA_LOI: readonly ValeurDuCatalogue[] = [
	valeur('Indemnite', {}, 'Frais de recouvrement, par facture', 'Taux et montants', 'indemniteForfaitaire'),
	valeur('TauxDePenalites', {}, 'Taux des pénalités, ce semestre', 'Taux et montants', 'tauxInteretLegalDefaut'),
	valeur('Majoration', {}, 'Majoration du taux de la BCE', 'Taux et montants'),
	valeur('TauxPublic', {}, 'Taux des pénalités d’un acheteur public', 'Taux et montants', 'tauxInteretsMoratoiresPublics'),
	valeur('MajorationPublique', {}, 'Majoration du taux public', 'Taux et montants', 'tauxInteretsMoratoiresPublics'),
	valeur('PlancherContractuel', {}, 'Taux minimum au contrat (trois fois le taux légal)', 'Taux et montants', 'tauxInteretMinimalLegal'),
	valeur('TauxLegal', {}, 'Taux d’intérêt légal, ce semestre', 'Taux et montants', 'tauxInteretLegalDefaut'),
	...REGIMES.map((r) =>
		valeur(
			'DelaiPourAgir',
			r.regime === 'GENERAL' ? {} : { regime: r.regime },
			`Délai pour agir en justice, ${r.libelle}`,
			'Délais'
		)
	),
	...REGIMES.map((r) =>
		valeur('PointDeDepart', { regime: r.regime }, `Point de départ du délai pour agir, ${r.libelle}`, 'Délais')
	),
	...Object.entries(ACHETEURS_PUBLICS).map(([acheteur, libelle]) =>
		valeur('DelaiPublic', { acheteur }, `Délai de paiement, ${libelle}`, 'Délais', 'delaisPaiementPublics')
	),
	...Object.entries(CAS_CONVENUS).map(([cas, libelle]) =>
		valeur('DelaiConvenu', { cas }, `Délai convenu maximal, ${libelle}`, 'Délais', 'delaiDeReglementConvenuMaximal')
	),
	...CLES.filter(estCleDeValeur).map((cle) =>
		valeur('Valeur', { de: cle }, libelleDeCle(cle), 'Valeurs du registre', cle)
	),
	...CLES.map((cle) => valeur('Source', { de: cle }, `Source : ${libelleDeCle(cle)}`, 'Références', cle)),
	...Object.entries(SOURCES_DE_REGIMES).map(([de, libelle]) =>
		valeur('Source', { de }, `Source : ${libelle}`, 'Références')
	)
];

/** Les valeurs qui répondent à une recherche, tous les mots compris, dans l'ordre du catalogue. */
export function valeursPour(requete: string): readonly ValeurDuCatalogue[] {
	const mots = sansAccents(requete).split(/\s+/).filter(Boolean);
	if (mots.length === 0) return VALEURS_DE_LA_LOI;
	return VALEURS_DE_LA_LOI.filter((v) => mots.every((mot) => v.recherche.includes(mot)));
}

/** L'entrée du catalogue d'une valeur posée dans le texte, si elle en vient. */
export function valeurDuCatalogue(
	nom: string,
	attributs: Readonly<Record<string, string>>
): ValeurDuCatalogue | undefined {
	const id = `${nom}:${JSON.stringify(attributs)}`;
	return VALEURS_DE_LA_LOI.find((v) => v.id === id);
}

// ─── Les illustrations ───────────────────────────────────────────────────────

export type ChampDIllustration =
	| { readonly nom: string; readonly libelle: string; readonly genre: 'texte'; readonly long?: boolean }
	| { readonly nom: string; readonly libelle: string; readonly genre: 'nombre' }
	| { readonly nom: string; readonly libelle: string; readonly genre: 'date' }
	| {
			readonly nom: string;
			readonly libelle: string;
			readonly genre: 'choix';
			readonly options: readonly string[];
	  }
	| { readonly nom: string; readonly libelle: string; readonly genre: 'interrupteur' };

export type IconeDIllustration = 'calcul' | 'ecran' | 'compteur' | 'barres' | 'calendrier' | 'comparaison';

export interface IllustrationDuCatalogue {
	readonly nom: string;
	readonly libelle: string;
	readonly description: string;
	readonly icone: IconeDIllustration;
	/** Le MDX posé à l'insertion. */
	readonly modele: string;
	/** Vide : l'illustration se règle dans sa source seulement. */
	readonly champs: readonly ChampDIllustration[];
}

export const ILLUSTRATIONS_DU_CATALOGUE: readonly IllustrationDuCatalogue[] = [
	{
		nom: 'ExempleDecompte',
		libelle: 'Décompte d’exemple',
		description: 'Une facture en retard, calculée par le moteur du produit.',
		icone: 'calcul',
		modele: '<ExempleDecompte montant={4800} echeance="2026-06-30" arrete="2026-07-14" />',
		champs: [
			{ nom: 'montant', libelle: 'Montant de la facture (€)', genre: 'nombre' },
			{ nom: 'echeance', libelle: 'Échéance', genre: 'date' },
			{ nom: 'arrete', libelle: 'Compté jusqu’au', genre: 'date' },
			{ nom: 'publique', libelle: 'Client public', genre: 'interrupteur' }
		]
	},
	{
		nom: 'Capture',
		libelle: 'Capture du produit',
		description: 'Un écran de Letikette, avec sa légende.',
		icone: 'ecran',
		modele: '<Capture\n\tecran="aujourdhui"\n\tlegende="Ce que montre la capture."\n/>',
		champs: [
			{ nom: 'ecran', libelle: 'Écran', genre: 'choix', options: ECRANS_DE_CAPTURE },
			{ nom: 'legende', libelle: 'Légende', genre: 'texte', long: true }
		]
	},
	{
		nom: 'CompteurIndemnites',
		libelle: 'Frais par facture',
		description: 'Les frais de recouvrement d’une série de factures.',
		icone: 'compteur',
		modele: '<CompteurIndemnites factures={6} />',
		champs: [{ nom: 'factures', libelle: 'Nombre de factures', genre: 'nombre' }]
	},
	{
		nom: 'DelaisParSecteur',
		libelle: 'Délais pour agir',
		description: 'Les délais pour agir en justice, en barres.',
		icone: 'barres',
		modele: '<DelaisParSecteur />',
		champs: []
	},
	{
		nom: 'PlanEcheancier',
		libelle: 'Plan d’échéancier',
		description: 'Un paiement en plusieurs fois, mois par mois.',
		icone: 'calendrier',
		modele: '<PlanEcheancier montant={6000} mensualites={3} premier="2026-11-05" />',
		champs: [
			{ nom: 'montant', libelle: 'Montant (€)', genre: 'nombre' },
			{ nom: 'mensualites', libelle: 'Mensualités', genre: 'nombre' },
			{ nom: 'premier', libelle: 'Premier versement', genre: 'date' }
		]
	},
	{
		nom: 'ExempleDelai',
		libelle: 'Délai d’exemple',
		description: 'Une date de départ, la date limite que la loi en tire.',
		icone: 'calendrier',
		modele:
			'<ExempleDelai\n\tdepart="2026-10-01"\n\tde="delaiDeclarationCreance"\n\tlibelleDepart="Le point de départ"\n\tlibelleFin="La date limite"\n/>',
		champs: [
			{ nom: 'depart', libelle: 'Départ', genre: 'date' },
			{
				nom: 'de',
				libelle: 'Délai du registre',
				genre: 'choix',
				options: CLES.filter(estCleDeValeur)
			},
			{ nom: 'libelleDepart', libelle: 'Libellé du départ', genre: 'texte' },
			{ nom: 'libelleFin', libelle: 'Libellé de la fin', genre: 'texte' }
		]
	},
	{
		nom: 'ExempleSignification',
		libelle: 'Avant et après une bascule',
		description: 'Deux dates d’ordonnance, deux délais.',
		icone: 'comparaison',
		modele: '<ExempleSignification avant="2026-02-27" apres="2026-03-02" />',
		champs: [
			{ nom: 'avant', libelle: 'Avant', genre: 'date' },
			{ nom: 'apres', libelle: 'Après', genre: 'date' }
		]
	},
	{
		nom: 'BarresDeDelais',
		libelle: 'Délais comparés',
		description: 'Plusieurs délais du registre, en barres de même échelle.',
		icone: 'barres',
		modele:
			"<BarresDeDelais\n\tdelais={[\n\t\t{ libelle: 'Déclarer votre créance', de: 'delaiDeclarationCreance' },\n\t\t{ libelle: 'Demander à être relevé de la forclusion', de: 'delaiReleveForclusion' }\n\t]}\n/>",
		champs: []
	},
	{
		nom: 'Comparaison',
		libelle: 'Oui ou non',
		description: 'Deux colonnes : ce qui compte, ce qui ne compte pas.',
		icone: 'comparaison',
		modele:
			"<Comparaison\n\ttitreOui=\"Compte\"\n\toui={['Un premier cas']}\n\ttitreNon=\"Ne compte pas\"\n\tnon={['Un autre cas']}\n/>",
		champs: []
	}
];

// ─── Les attributs d'une illustration ────────────────────────────────────────

/** Un attribut lu : une chaîne, une expression (un nombre, un tableau), ou un booléen nu. */
export type AttributLu =
	| { readonly genre: 'chaine'; readonly valeur: string }
	| { readonly genre: 'expression'; readonly valeur: string }
	| { readonly genre: 'nu' };

export interface ComposantLu {
	readonly nom: string;
	readonly attributs: ReadonlyMap<string, AttributLu>;
}

/** La source d'un bloc « MDX », si c'est un seul composant sans enfants. */
export function lireComposant(source: string): ComposantLu | null {
	let arbre;
	try {
		arbre = fromMarkdown(source, { extensions: [mdxjs()], mdastExtensions: [mdxFromMarkdown()] });
	} catch {
		return null;
	}
	const [seul, ...autres] = arbre.children;
	if (seul?.type !== 'mdxJsxFlowElement' || autres.length > 0) return null;
	const element = seul as MdxJsxFlowElement;
	if (element.name === null || element.children.length > 0) return null;
	const attributs = new Map<string, AttributLu>();
	for (const attribut of element.attributes) {
		if (attribut.type !== 'mdxJsxAttribute') return null;
		if (attribut.value === null || attribut.value === undefined) attributs.set(attribut.name, { genre: 'nu' });
		else if (typeof attribut.value === 'string')
			attributs.set(attribut.name, { genre: 'chaine', valeur: attribut.value });
		else attributs.set(attribut.name, { genre: 'expression', valeur: attribut.value.value });
	}
	return { nom: element.name, attributs };
}

function ecrireAttribut(nom: string, attribut: AttributLu): string {
	switch (attribut.genre) {
		case 'nu':
			return nom;
		case 'expression':
			return `${nom}={${attribut.valeur}}`;
		case 'chaine':
			return `${nom}="${attribut.valeur.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
	}
}

/** Un composant réécrit : sur une ligne s'il tient, un attribut par ligne sinon. */
export function ecrireComposant(composant: ComposantLu): string {
	const morceaux = [...composant.attributs].map(([nom, a]) => ecrireAttribut(nom, a));
	const enLigne = `<${composant.nom}${morceaux.map((m) => ` ${m}`).join('')} />`;
	if (enLigne.length <= 100 && !enLigne.includes('\n')) return enLigne;
	return `<${composant.nom}\n${morceaux.map((m) => `\t${m}`).join('\n')}\n/>`;
}

/** La valeur d'un champ du formulaire, lue dans le composant. */
export function valeurDuChamp(composant: ComposantLu, champ: ChampDIllustration): string | boolean {
	const attribut = composant.attributs.get(champ.nom);
	if (champ.genre === 'interrupteur') return attribut !== undefined;
	if (attribut === undefined || attribut.genre === 'nu') return '';
	return attribut.valeur;
}

/** Le composant avec un champ changé ; l'ordre des attributs ne bouge pas. */
export function avecChamp(
	composant: ComposantLu,
	champ: ChampDIllustration,
	valeurSaisie: string | boolean
): ComposantLu {
	const attributs = new Map(composant.attributs);
	if (champ.genre === 'interrupteur') {
		if (valeurSaisie === true) attributs.set(champ.nom, { genre: 'nu' });
		else attributs.delete(champ.nom);
	} else if (valeurSaisie === '') {
		attributs.delete(champ.nom);
	} else if (champ.genre === 'nombre') {
		attributs.set(champ.nom, { genre: 'expression', valeur: String(valeurSaisie) });
	} else {
		attributs.set(champ.nom, { genre: 'chaine', valeur: String(valeurSaisie) });
	}
	return { nom: composant.nom, attributs };
}
