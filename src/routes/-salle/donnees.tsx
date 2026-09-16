import { EcranDonnees } from '../../screens/donnees/donnees';
import { EcranExport, type ExportAffiche } from '../../screens/donnees/export';
import {
	EcranSupprimerCompte,
	type SuppressionDuCompte
} from '../../screens/donnees/supprimer-compte';
import {
	EcranSupprimerEtablissement,
	type SuppressionDeLEtablissement
} from '../../screens/donnees/supprimer-etablissement';
import type { ApercuDonnees, FichierExport } from '../../screens/donnees/types';
import type { MembreEquipe } from '../../screens/equipe/equipe';
import { ETABLISSEMENT_DEMO } from './communes';
import { formeDemo, lectureDemo, type EcranDuProduit } from './demo';
import { MEMBRES, MEMBRES_VUS_PAR_UN_MEMBRE, compteConnecte } from './equipe';
import { AvecLesReglages } from './reglages';

/**
 * LES ENTRÉES DE LA FAMILLE, DÉCLARÉES AVANT TOUT CE QUI S'EN CALCULE.
 *
 * L'établissement est celui de toute la salle, dont le nom ne s'écrit que dans
 * `communes.ts` (`ETABLISSEMENT_DEMO`). Ses personnes sont celles de la famille
 * de l'équipe (`MEMBRES`, `equipe.tsx`) : le compte connecté, son adresse, son
 * rôle et le nombre de personnes en viennent. Ne reste écrit ici que ce que la
 * base porte en plus, et qu'aucune fonction de la salle ne produit : ce que
 * l'établissement a importé, enregistré, identifié et arrêté, et le fichier que
 * l'export dépose.
 *
 * Le reste se compose comme les quatre routes le composent.
 */

/** Ce que l'établissement a importé, enregistré, identifié et arrêté. */
interface ContenuDemo {
	readonly depots: number;
	readonly factures: number;
	readonly decomptes: number;
	readonly debiteurs: number;
}

/**
 * Les nombres de l'inventaire, que `api.rgpd.apercuDeMesDonnees` compte en lisant
 * les lignes de chaque table (`src/lib/convex/rgpd.ts`, lignes 80 à 95, et 105 à
 * 108). Aucune fonction de la salle ne produit ces lignes : les nombres restent
 * écrits.
 */
const CONTENU_DEMO: ContenuDemo = { depots: 3, factures: 312, decomptes: 2, debiteurs: 47 };

/** Un établissement qui vient d'être créé : rien d'importé, d'enregistré, d'identifié ni d'arrêté. */
const CONTENU_NOUVEAU_CLIENT_DEMO: ContenuDemo = {
	depots: 0,
	factures: 0,
	decomptes: 0,
	debiteurs: 0
};

/** Les règlements enregistrés : l'inventaire ne les compte pas, l'export les écrit un par un (`rgpd.ts`, ligne 350). */
const REGLEMENTS_DEMO = 268;

/** La taille du fichier que l'export dépose (`rgpd.ts`, lignes 337 à 339, et 349) : la salle ne compose pas ce fichier. */
const OCTETS_EXPORT_DEMO = 287_412;

/**
 * L'inventaire, composé comme `apercuDeMesDonnees` le rend (`rgpd.ts`, lignes 101
 * à 110), pour une équipe lue par son compte connecté.
 *
 * L'établissement se crée avec son premier administrateur, inscrit dans la même
 * mutation (`createOrganization`, `src/lib/convex/organizations.ts`, lignes 70 à
 * 87) : sa date de création est l'arrivée la plus ancienne de l'équipe.
 */
function apercuDe(membres: readonly MembreEquipe[], contenu: ContenuDemo): ApercuDonnees {
	return {
		nomEtablissement: ETABLISSEMENT_DEMO.nom,
		estAdmin: compteConnecte(membres).role === 'ORG_ADMIN',
		creeLe: Math.min(...membres.map((membre) => membre.arriveLe)),
		depots: contenu.depots,
		factures: contenu.factures,
		decomptes: contenu.decomptes,
		debiteurs: contenu.debiteurs,
		membres: membres.length
	};
}

/** L'inventaire de l'établissement, lu par le gérant, administrateur. */
const APERCU_DEMO: ApercuDonnees = apercuDe(MEMBRES, CONTENU_DEMO);

/** « vu par un membre » : l'équipe lue par un compte qui n'administre pas, seule entrée changée (`equipe.tsx`). */
const APERCU_VU_PAR_UN_MEMBRE_DEMO: ApercuDonnees = apercuDe(
	MEMBRES_VUS_PAR_UN_MEMBRE,
	CONTENU_DEMO
);

/**
 * « nouveau client » : l'établissement qui vient d'être créé, rien d'importé, et son
 * créateur seul membre. C'est l'état par défaut d'un nouveau client, et le seul où
 * la page de suppression compte zéro facture et une seule personne.
 */
const APERCU_NOUVEAU_CLIENT_DEMO: ApercuDonnees = apercuDe(
	[compteConnecte(MEMBRES)],
	CONTENU_NOUVEAU_CLIENT_DEMO
);

/** La forme nommée de l'inventaire. */
const FORMES_APERCU_DEMO: Readonly<Record<string, ApercuDonnees>> = {
	'vu par un membre': APERCU_VU_PAR_UN_MEMBRE_DEMO
};

/** La forme nommée de la page de suppression de l'établissement. */
const FORMES_SUPPRESSION_DEMO: Readonly<Record<string, ApercuDonnees>> = {
	'nouveau client': APERCU_NOUVEAU_CLIENT_DEMO
};

/**
 * Le fichier, tel que `exporterMesDonnees` le rend (`rgpd.ts`, lignes 347 à 352),
 * préparé à l'instant : son nom porte le jour de l'export.
 */
const FICHIER_DEMO: FichierExport = {
	// Un fichier vide, servi sur place : le lien du produit mène au stockage du
	// déploiement, et expire une heure après l'export.
	url: 'data:application/json,%7B%7D',
	octets: OCTETS_EXPORT_DEMO,
	lignes: CONTENU_DEMO.factures + REGLEMENTS_DEMO,
	nomFichier: `letikette-export-${new Date().toISOString().slice(0, 10)}.json`
};

/** Ce qu'une forme de la page d'export fait varier : qui la lit, et où en est le fichier. */
interface FormeExport {
	readonly apercu: ApercuDonnees;
	readonly enCours: boolean;
	readonly fichier: FichierExport | null;
}

/**
 * La page d'export, composée comme sa route la compose
 * (`src/routes/app/_reglages.donnees_.export.tsx`). L'inventaire n'y est jamais nul : la
 * salle a un établissement.
 */
function exportDe({ apercu, enCours, fichier }: FormeExport): ExportAffiche {
	return {
		reserveAAdmin: !apercu.estAdmin,
		fichier,
		enCours,
		erreur: null,
		onPreparer: () => undefined
	};
}

/** La page telle qu'elle s'ouvre : rien de préparé. */
const EXPORT_DEMO: FormeExport = { apercu: APERCU_DEMO, enCours: false, fichier: null };

/** Les formes nommées de la page d'export, chacune sur une seule entrée changée. */
const FORMES_EXPORT_DEMO: Readonly<Record<string, FormeExport>> = {
	'vu par un membre': { ...EXPORT_DEMO, apercu: APERCU_VU_PAR_UN_MEMBRE_DEMO },
	'préparation en cours': { ...EXPORT_DEMO, enCours: true },
	'fichier prêt': { ...EXPORT_DEMO, fichier: FICHIER_DEMO }
};

/**
 * La page de suppression du compte, composée comme sa route la compose : l'adresse
 * du compte connecté, que `getCurrentUser` rend.
 */
const SUPPRESSION_DU_COMPTE_DEMO: SuppressionDuCompte = {
	email: compteConnecte(MEMBRES).email ?? '',
	erreur: null,
	onConfirmer: () => undefined
};

/** La page de suppression de l'établissement, composée comme sa route la compose. */
function suppressionDe(apercu: ApercuDonnees): SuppressionDeLEtablissement {
	return { apercu, erreur: null, onConfirmer: () => undefined };
}

export const ECRANS_DONNEES: readonly EcranDuProduit[] = [
	{
		route: '/app/_reglages/donnees',
		libelle: 'données',
		vide: true,
		variantes: Object.keys(FORMES_APERCU_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const apercu = formeDemo(variante, APERCU_DEMO, FORMES_APERCU_DEMO);
			return (
				<AvecLesReglages section="donnees">
					<EcranDonnees donnees={lectureDemo(etat, apercu, null)} />
				</AvecLesReglages>
			);
		}
	},
	{
		route: '/app/_reglages/donnees_/export',
		libelle: 'export',
		vide: false,
		variantes: Object.keys(FORMES_EXPORT_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const forme = formeDemo(variante, EXPORT_DEMO, FORMES_EXPORT_DEMO);
			return (
				<AvecLesReglages section="donnees">
					<EcranExport donnees={lectureDemo(etat, exportDe(forme))} />
				</AvecLesReglages>
			);
		}
	},
	// Les deux suppressions restent HORS de la mise en page des réglages, pleine
	// largeur : une confirmation destructrice se lit seule.
	{
		route: '/app/donnees_/supprimer-compte',
		libelle: 'supprimer compte',
		vide: false,
		Demo: ({ etat }) => (
			<EcranSupprimerCompte donnees={lectureDemo(etat, SUPPRESSION_DU_COMPTE_DEMO)} />
		)
	},
	{
		route: '/app/donnees_/supprimer-etablissement',
		libelle: 'supprimer établissement',
		vide: true,
		variantes: Object.keys(FORMES_SUPPRESSION_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const apercu = formeDemo(variante, APERCU_DEMO, FORMES_SUPPRESSION_DEMO);
			return (
				<EcranSupprimerEtablissement donnees={lectureDemo(etat, suppressionDe(apercu), null)} />
			);
		}
	}
];
