/**
 * LES COLONNES DU TABLEUR, ET CE QU'ELLES DEVIENNENT (16/10/2026).
 *
 * Chaque titre du tableur de prospection (`docs/croissance/prospection.csv`) se
 * reconnaît sans tenir compte de la casse, des accents ni de ce qui est entre
 * parenthèses. Un titre inconnu reste sans champ : l'écran d'import le montre,
 * et l'on peut l'associer à la main.
 */

export const CHAMPS_IMPORT = [
	'ajouteLe',
	'entreprise',
	'siren',
	'activite',
	'effectif',
	'ville',
	'dirigeant',
	'fonction',
	'email',
	'telephone',
	'site',
	'trouveOu',
	'cible',
	'canal',
	'modele',
	'premierContactLe',
	'relance1Le',
	'relance2Le',
	'reponse',
	'objection',
	'prochaineAction',
	'prochaineActionLe',
	'inscrit',
	'abonne',
	'formule',
	'notes'
] as const;
export type ChampImport = (typeof CHAMPS_IMPORT)[number];

/** Le nom d'un champ à l'écran d'import. */
export const LIBELLES_DES_CHAMPS: Record<ChampImport, string> = {
	ajouteLe: 'Ajouté le',
	entreprise: 'Entreprise',
	siren: 'SIREN',
	activite: 'Activité',
	effectif: 'Effectif',
	ville: 'Ville',
	dirigeant: 'Dirigeant',
	fonction: 'Fonction',
	email: 'E-mail',
	telephone: 'Téléphone',
	site: 'Site web',
	trouveOu: 'Trouvé où',
	cible: 'Cible',
	canal: 'Canal',
	modele: 'Modèle utilisé',
	premierContactLe: '1er contact le',
	relance1Le: 'Relance 1 le',
	relance2Le: 'Relance 2 le',
	reponse: 'Réponse',
	objection: 'Objection entendue',
	prochaineAction: 'Prochaine action',
	prochaineActionLe: 'Prochaine action le',
	inscrit: 'Inscrit',
	abonne: 'Abonné',
	formule: 'Formule',
	notes: 'Notes'
};

/** Un titre ramené à sa forme simple : « Activité (code NAF) » → « activite ». */
export function titreSimple(titre: string): string {
	return titre
		.replace(/\([^)]*\)/g, '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

const PAR_TITRE: Record<string, ChampImport> = Object.fromEntries(
	CHAMPS_IMPORT.map((champ) => [titreSimple(LIBELLES_DES_CHAMPS[champ]), champ])
);
// Les graphies courantes d'autres tableurs.
Object.assign(PAR_TITRE, {
	email: 'email',
	mail: 'email',
	courriel: 'email',
	societe: 'entreprise',
	'raison sociale': 'entreprise'
} as Record<string, ChampImport>);

export function associerColonnes(entetes: readonly string[]): (ChampImport | null)[] {
	const vus = new Set<ChampImport>();
	return entetes.map((titre) => {
		const champ = PAR_TITRE[titreSimple(titre)];
		if (champ === undefined || vus.has(champ)) return null;
		vus.add(champ);
		return champ;
	});
}
