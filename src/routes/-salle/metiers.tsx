import { PiloteEnDirect } from '../../ui';
import type { FileAffichee, RangeeDeLaFile } from '../../screens/file';
import {
	JOUR_DES_SCENES,
	SCENES_DES_METIERS,
	type SceneDuMetier
} from '../../marketing/scenes-metiers';
import { SECTEURS_PUBLICS, type SecteurPublic } from '../../marketing/secteurs';
import { teteDesFactures } from './revelation';

/**
 * L'ÉCRAN « AUJOURD'HUI » DE CHAQUE MÉTIER (19/10/2026), pour les pages métier du site.
 *
 * Le même écran que la salle, les mêmes composants : seules les données changent, lues
 * dans `marketing/scenes-metiers.ts`, la source que le site lit aussi pour ses cartes
 * flottantes. `scripts/capturer-ecrans.ts` photographie ces variantes.
 */

/** Le nom de la variante dans la salle : c'est le bouton que la capture touche. */
export function varianteDuMetier(secteur: SecteurPublic): string {
	return `métier : ${secteur}`;
}

/** « 10:00 » à Paris, le jour de la scène, en heure d'été : 8 h UTC. */
function departDe(heure: string): number {
	const [h, m] = heure.split(':').map(Number);
	const [annee, mois, jour] = JOUR_DES_SCENES.split('-').map(Number);
	return Date.UTC(annee ?? 2026, (mois ?? 1) - 1, jour ?? 1, (h ?? 10) - 2, m ?? 0);
}

function rangeesDe(secteur: SecteurPublic, scene: SceneDuMetier): RangeeDeLaFile[] {
	return scene.cartes.map((carte, rang) => ({
		genre: 'OBSTACLE',
		id: `metier-${secteur}-${rang}`,
		libelle: carte.libelle,
		famille: carte.famille,
		debiteur: carte.client,
		destination: { vers: '/app/dossier/$id', parametres: { id: `demo-metier-${rang}` } },
		obstacle: `${carte.libelle}.`,
		urgence: carte.urgence,
		montant: carte.montant,
		dateDuFait: carte.date,
		pli: {
			libelle: { un: carte.libelle.toLowerCase(), plusieurs: carte.libelle.toLowerCase() },
			rienATrancher: false
		}
	}));
}

function ecranDuMetier(base: FileAffichee, secteur: SecteurPublic): FileAffichee {
	const scene = SCENES_DES_METIERS[secteur];
	const { revelation, anciennete } = teteDesFactures(
		scene.factures.map((facture) => ({
			reference: facture.reference,
			montantTTC: facture.montant,
			dateEmission: facture.emission,
			dateEcheance: facture.echeance,
			secteur: secteur === 'transport-routier' ? 'TRANSPORT_MARCHANDISES' : 'GENERAL',
			...(scene.public === true ? { publique: true as const } : {})
		}))
	);
	const { lecture } = scene;
	return {
		...base,
		aujourdHui: JOUR_DES_SCENES,
		tete: {
			total: revelation.total,
			nombreFactures: revelation.nombreFactures,
			parts: {
				principal: revelation.principal,
				interets: revelation.interets,
				indemnites: revelation.indemnites
			},
			nonChiffrees: [],
			anciennete
		},
		rangees: rangeesDe(secteur, scene),
		travaux: [],
		nonLues: 1,
		hypotheses: [],
		anglesMorts: [],
		annonce: undefined,
		resumeDuPlafond: null,
		pilote: (
			<PiloteEnDirect
				aujourdHui={JOUR_DES_SCENES}
				onActiver={() => undefined}
				onRetenir={() => undefined}
				pilote={{
					envoiAutomatique: true,
					peutActiver: true,
					programmes: scene.relances.map((relance, rang) => ({
						envoiId: `envoi-metier-${rang}`,
						client: relance.client,
						etape: relance.etape,
						partiraLe: departDe(relance.heure)
					})),
					derniereVeille: departDe('14:32'),
					travaux: [
						{
							id: 'travail-metier',
							titre: 'Relit votre dépôt',
							etapes: [
								{
									libelle: `Lit ${lecture.factures} factures et ${lecture.reglements} règlements`,
									faite: true
								},
								{ libelle: `Range par client : ${lecture.clients} clients`, faite: true },
								{ libelle: `Repère ${lecture.enRetard} factures en retard`, faite: false },
								{ libelle: 'Met à jour les dates limites pour agir', faite: false }
							],
							etat: 'EN_COURS',
							bilan: `${lecture.enRetard} factures en retard.`,
							termineLe: null
						}
					]
				}}
			/>
		)
	};
}

/** Une variante par métier, à ajouter aux formes de l'écran « Aujourd'hui ». */
export function formesDesMetiers(base: FileAffichee): Record<string, FileAffichee> {
	return Object.fromEntries(
		SECTEURS_PUBLICS.map((secteur) => [varianteDuMetier(secteur), ecranDuMetier(base, secteur)])
	);
}
