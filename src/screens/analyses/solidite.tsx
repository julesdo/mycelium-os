import { PageEcran, Solidite, type Lecture, type SoliditeAffichee } from '../../ui';

/** Ce que l'écran affiche : le débiteur pour l'en-tête, et la pyramide de preuves à détailler. */
export interface SoliditeDeLaCreance {
	readonly debiteur: string;
	readonly solidite: SoliditeAffichee;
}

/**
 * CE QUE LES PIÈCES ÉTABLISSENT — une page, plus une carte.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE PAGE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'analyse tenait dans une carte de l'écran de créance, avec ses quatre
 * étages et leurs phrases. Six autres analyses faisaient pareil : 6,1 écrans de
 * défilement, mesurés, et un lecteur qui ne trouve plus le chiffre qu'il
 * cherchait.
 *
 * Une application mobile résume en une RANGÉE — « Solidité · 2 pièces sur 4 › »
 * — et pousse ici quand on veut savoir lesquelles. Le raisonnement n'est pas
 * perdu : il est à un geste de distance, et il a enfin la place de se lire.
 *
 * ⚠️ LA PAGE NE RECALCULE RIEN. Elle affiche la même `solidite` que la rangée
 * résume, venue de la même requête. Deux lectures du même fait finiraient par
 * diverger, et c'est le genre d'écart qu'on ne voit qu'en les comparant côte à
 * côte — ce que personne ne fait.
 */
export function EcranSolidite({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<SoliditeDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance',
					masqueEnVolets: true
				},
				// Pas de sous-titre : la carte porte déjà le compte, en toutes lettres
				// ET en fraction. Le répéter en en-tête fait lire trois fois la même
				// chose avant d'arriver au contenu.
				titre: 'Ce que les pièces établissent'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <Solidite solidite={pret.solidite} />}
		</PageEcran>
	);
}
