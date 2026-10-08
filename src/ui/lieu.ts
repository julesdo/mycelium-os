/**
 * OÙ EST UNE ADRESSE — le géocodage de l'IGN, à la demande (08/10/2026).
 *
 * Le registre des entreprises place les études sur la carte ; l'annuaire des
 * avocats ne donne qu'une adresse. Pour qu'une fiche d'avocat ait sa carte comme
 * celle d'une étude, l'adresse se géocode au moment où la fiche s'ouvre, auprès
 * du service public de la Géoplateforme (IGN), sans clé, sous Licence Ouverte.
 *
 * ⚠️ UNE PROMESSE PAR ADRESSE, GARDÉE. `use()` la relit à chaque rendu : la
 * recréer referait la requête et suspendrait la fiche en boucle. Et une adresse
 * que le service ne trouve pas rend `null` — la fiche montre alors l'adresse
 * sans carte, plutôt qu'une épingle posée au hasard.
 *
 * ⚠️ RIEN DU DOSSIER NE PART. Seule l'adresse PUBLIQUE d'un professionnel, telle
 * que l'annuaire national la publie, est envoyée : jamais un nom de client, un
 * montant ou une adresse de débiteur.
 */

export interface Coordonnees {
	readonly latitude: number;
	readonly longitude: number;
}

const GEOCODAGE = 'https://data.geopf.fr/geocodage/search';

/** En dessous, le service a trouvé une rue voisine : on ne pose pas d'épingle. */
const SCORE_MINIMAL = 0.5;

/**
 * ⚠️ UNE RUE OU UN NUMÉRO, JAMAIS UNE COMMUNE. « Paris » seul se géocode au
 * centre de la ville : une épingle là ferait croire que le cabinet y est.
 */
const PRECISIONS_ADMISES = new Set(['housenumber', 'street']);

const promesses = new Map<string, Promise<Coordonnees | null>>();

async function geocoder(adresse: string): Promise<Coordonnees | null> {
	try {
		const reponse = await fetch(`${GEOCODAGE}?q=${encodeURIComponent(adresse)}&limit=1`);
		if (!reponse.ok) return null;
		const lu = (await reponse.json()) as {
			features?: {
				geometry?: { coordinates?: unknown };
				properties?: { score?: unknown; type?: unknown };
			}[];
		};
		const premiere = lu.features?.[0];
		const coordonnees = premiere?.geometry?.coordinates;
		const score = premiere?.properties?.score;
		const precision = premiere?.properties?.type;
		if (
			!Array.isArray(coordonnees) ||
			typeof score !== 'number' ||
			score < SCORE_MINIMAL ||
			typeof precision !== 'string' ||
			!PRECISIONS_ADMISES.has(precision)
		) {
			return null;
		}
		const [longitude, latitude] = coordonnees as unknown[];
		return typeof latitude === 'number' && typeof longitude === 'number'
			? { latitude, longitude }
			: null;
	} catch {
		return null;
	}
}

/** La promesse des coordonnées d'une adresse : toujours la même pour la même adresse. */
export function coordonneesDe(adresse: string): Promise<Coordonnees | null> {
	const cle = adresse.trim().toLowerCase();
	const deja = promesses.get(cle);
	if (deja !== undefined) return deja;
	const promesse = geocoder(adresse);
	promesses.set(cle, promesse);
	return promesse;
}
