import type { ReactNode } from 'react';
import { FileSpreadsheetIcon, FileTextIcon } from 'lucide-react';
import {
	AjoutDeFichiers,
	EmptyState,
	EnTeteDeGroupe,
	CarteLien,
	ListeDeCartes,
	MaitreDetail,
	PageEcran,
	VignetteIcone,
	pluriel,
	type BilanDepotAffiche,
	type EnteteEcran,
	type Lecture
} from '../../ui';
import { TITRE_ECRAN } from '../titres';
import { provenance } from './bilan';
import { LigneEnvoi, type EnvoiAffiche } from './envois';
import { delaiLisible, minutesDepuis, useMinute, MINUTES_SANS_NOUVELLE } from './horloge';

/** Les deux chemins par lesquels les factures arrivent. */
export type ModeDepot = 'EXPORT_COMPTABLE' | 'FACTURE_DEPOSEE';

/** Tout ce que la zone accepte, les deux chemins confondus. */
export const FORMATS_ACCEPTES = '.csv,.tsv,.txt,.xml,.pdf,image/*';

/** Les extensions qu'un lecteur de document reconnaît, quand le type MIME manque. */
const EXTENSIONS_DOCUMENT = /\.(pdf|png|jpe?g|heic|heif|webp|tiff?|gif|bmp)$/;

/**
 * LE CHEMIN SE DÉDUIT DU FICHIER, IL NE SE CHOISIT PLUS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran demandait d'abord « par où vos factures arrivent », puis le fichier.
 * Or le fichier répond seul à la question : un `.csv` n'est jamais une facture
 * en PDF, et un PDF n'est jamais un FEC. Règle d'écran n° 1 — on ne demande pas
 * une saisie que le logiciel peut déduire.
 *
 * ⚠️ ET C'ÉTAIT UN DÉFAUT EN PRODUCTION, pas seulement une question de trop.
 * Le bouton « Photographier » s'affichait quel que soit le chemin choisi ; avec
 * le chemin par défaut, la photo partait en `EXPORT_COMPTABLE`, la lecture la
 * décodait en texte et répondait « Export non reconnu ». Le geste le plus
 * fréquent sur le terrain échouait sur le chemin proposé par défaut.
 *
 * ⚠️ LE DOUTE VA AU CHEMIN QUI NE COÛTE RIEN. Un type MIME absent ou inconnu
 * retombe sur l'export comptable : la lecture échoue alors franchement, avec un
 * message lisible, au lieu d'envoyer au modèle un fichier facturé que personne
 * n'a demandé de relire.
 */
export function modeDuFichier(fichier: {
	readonly type: string;
	readonly name: string;
}): ModeDepot {
	const type = fichier.type.toLowerCase();
	if (type === 'application/pdf' || type.startsWith('image/')) return 'FACTURE_DEPOSEE';
	/*
	  ⚠️ LE XML PASSE AVANT LA BRANCHE `text/`, ET C'EST TOUT LE PIÈGE. Un
	  `text/xml` y tombait, donc une facture électronique partait au parseur
	  d'export comptable, qui répondait « Format d'export non reconnu. Attendu :
	  un FEC (colonnes CompteNum, PieceRef, Debit, Credit…) ». Le gérant concluait
	  que le produit ne lit pas les factures, alors qu'il ne lisait pas CE
	  format-là : un échec qui ment sur sa cause.

	  Les trois formes possibles y passent : `text/xml`, `application/xml`, et le
	  type MIME absent — fréquent sur un fichier glissé depuis un dossier.
	*/
	if (
		type === 'application/xml' ||
		type === 'text/xml' ||
		/\.xml$/.test(fichier.name.toLowerCase())
	)
		return 'FACTURE_DEPOSEE';
	if (type.startsWith('text/')) return 'EXPORT_COMPTABLE';
	// Un FEC glissé depuis un dossier arrive souvent sans type MIME : le nom tranche.
	return EXTENSIONS_DOCUMENT.test(fichier.name.toLowerCase())
		? 'FACTURE_DEPOSEE'
		: 'EXPORT_COMPTABLE';
}

/** Un dépôt, tel que sa rangée le résume. */
export interface LigneDepot {
	readonly _id: string;
	readonly filename: string;
	/** Par où ce dépôt est passé. Voir `precisionDepot` : un appel au modèle se voit. */
	readonly mode: ModeDepot;
	readonly statut: string;
	readonly etape?: string;
	readonly erreur?: string;
	readonly bilan?: BilanDepotAffiche;
	readonly deposeLe: number;
}

/** Ce que l'écran affiche : les dépôts, les envois en route, et les gestes que la route pilote. */
export interface ImportAffiche {
	readonly imports: readonly LigneDepot[];
	/**
	 * Les fichiers entre le geste du gérant et la base.
	 *
	 * ⚠️ ILS N'EXISTAIENT PAS, ET C'EST LE TROU QUE CETTE VERSION BOUCHE. L'écran
	 * ne recevait qu'un booléen `envoiEnCours` : cinq fichiers lâchés donnaient
	 * UNE phrase, et un échec au troisième laissait ignorer ce qu'étaient devenus
	 * les quatre autres. Voir `envois.tsx`.
	 */
	readonly envois: readonly EnvoiAffiche[];
	readonly onDeposer: (fichiers: File[]) => void;
	/** Relance un envoi échoué, celui-là seulement. */
	readonly onReessayer: (cle: string) => void;
}

/** Vrai quand un dépôt est encore en machine, quel que soit le nom de son étape. */
function enLecture(depot: LigneDepot): boolean {
	return depot.statut !== 'TERMINE' && depot.statut !== 'ECHOUE';
}

/** Vrai quand la lecture n'a rien écrit depuis un quart d'heure. Voir `horloge.ts`. */
function sansNouvelle(depot: LigneDepot, minute: number | null): boolean {
	return enLecture(depot) && (minutesDepuis(depot.deposeLe, minute) ?? 0) >= MINUTES_SANS_NOUVELLE;
}

/**
 * CE QUE LA RANGÉE DIT SOUS LE NOM DU FICHIER — ce qui s'est passé, jamais la
 * date.
 *
 * ⚠️ LA DATE EST PASSÉE À DROITE, SOUS LE CHIFFRE (01/10/2026). « Relue par le
 * modèle · Déposé le 9 sept. 2026 » se coupait à 393 px après « Déposé l… » :
 * la date ne se lisait pas, et elle mangeait la seule ligne qui dit ce qui
 * s'est passé. C'est la colonne droite de Revolut Business — le chiffre, puis sa
 * date (`sousValeur`) —, et le mois est dans l'en-tête du groupe.
 *
 * ⚠️ CE QUI N'EST PAS ENTRÉ PASSE AVANT LA PROVENANCE. Une rangée qui porte un
 * point doit dire pourquoi, sur la rangée même : « 2 lignes non lues » est de
 * l'argent qu'on ne réclamera pas, « Export comptable (FEC) » est un
 * renseignement. La provenance reste écrite sur le bilan du dépôt.
 *
 * ⚠️ « RELUE PAR LE MODÈLE » SE DÉDUIT DU BILAN, PAS DU MODE. Un Factur-X est un
 * PDF lu dans son propre fichier, sans un centime d'appel modèle : voir
 * `provenance`, dans `bilan.tsx`.
 *
 * ⚠️ ET UNE LECTURE MUETTE DEPUIS UN QUART D'HEURE LE DIT. C'est le seul état
 * du produit qui pouvait durer indéfiniment sans que rien ne le distingue d'un
 * état normal. Voir `horloge.ts`.
 */
function precisionDepot(depot: LigneDepot, minute: number | null): string {
	if (depot.statut === 'ECHOUE') return depot.erreur ?? 'Lecture en échec';

	if (enLecture(depot)) {
		const age = minutesDepuis(depot.deposeLe, minute);
		if (age !== null && age >= MINUTES_SANS_NOUVELLE) {
			return `Sans nouvelle depuis ${delaiLisible(age)}`;
		}
		return depot.etape ?? 'Lecture en cours';
	}

	const bilan = depot.bilan;
	if (bilan !== undefined && bilan.ignoreesTotal > 0) {
		const n = bilan.ignoreesTotal;
		return `${n} ligne${pluriel(n)} non lue${pluriel(n)}`;
	}
	if (bilan !== undefined && bilan.reglementsOrphelins > 0) {
		const n = bilan.reglementsOrphelins;
		return `${n} règlement${pluriel(n)} sans facture`;
	}
	return provenance(bilan?.format, depot.mode);
}

/** Ce que la rangée montre à droite : ce qui est entré, ou l'échec. Rien pendant la lecture. */
function valeurDepot(depot: LigneDepot): string | undefined {
	if (depot.bilan) {
		return `${depot.bilan.facturesCreees} facture${pluriel(depot.bilan.facturesCreees)}`;
	}
	if (depot.statut === 'ECHOUE') return 'Échec';
	return undefined;
}

const JOUR = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const MOIS = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

/** Le mois d'un dépôt, tel que son groupe le nomme : « Septembre 2026 ». */
function moisDe(instant: number): string {
	const mois = MOIS.format(new Date(instant));
	return mois.charAt(0).toUpperCase() + mois.slice(1);
}

/**
 * LES DÉPÔTS LUS, PAR MOIS — dans l'ordre où le serveur les rend, le plus
 * récent d'abord.
 *
 * ⚠️ UN EN-TÊTE PAR MOIS, ET PLUS « VOS DÉPÔTS » EN CAPITALES. C'est la liste de
 * Revolut Business (« Today », « November 26 ») et la règle du produit : une
 * liste longue se groupe, et chaque en-tête porte son compte (`EnTeteDeGroupe`,
 * partagé avec les dossiers et la file). Un export par mois et quelques PDF
 * font vite trente rangées d'un seul tenant.
 */
function parMois(depots: readonly LigneDepot[]): { mois: string; depots: LigneDepot[] }[] {
	const groupes: { mois: string; depots: LigneDepot[] }[] = [];
	for (const depot of depots) {
		const mois = moisDe(depot.deposeLe);
		const dernier = groupes.at(-1);
		if (dernier !== undefined && dernier.mois === mois) dernier.depots.push(depot);
		else groupes.push({ mois, depots: [depot] });
	}
	return groupes;
}

/** Les formats, écrits sous le bouton comme dans le bandeau. */
const FORMATS_LISIBLES = 'FEC, CSV, PDF ou photo';

/**
 * L'IMPORT DE FACTURES DE VENTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN BOUTON, PUIS LA LISTE — RELEVÉ SUR FI, REVOLUT BUSINESS ET YOUTUBE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mesuré à 393 px le 01/10/2026 : un creux de deux cent soixante pixels
 * (« Déposez vos fichiers ici », deux boutons), une phrase de conseil, puis une
 * liste sans groupes dont chaque sous-ligne se coupait sur sa date. Chez Fi,
 * Gusto ou Revolut Business, ajouter un document est UN bouton, et la liste des
 * documents est l'écran ; chez YouTube, ce qui se téléverse forme un groupe à
 * part, en tête (« Uploading · 1 »).
 *
 * D'où l'écran : le bouton (un bandeau à la souris, voir `AjoutDeFichiers`) ; le
 * groupe « En cours » — les fichiers en route et les lectures —, puis les
 * dépôts lus par mois. Chaque rangée dit ce qui s'est passé à gauche, ce qui est
 * entré à droite, et sa date dessous.
 *
 * ⚠️ LE CHEMIN SE DÉDUIT TOUJOURS DU FICHIER (`modeDuFichier`), et rien ne
 * l'annonce avant l'envoi : une déduction bien faite se constate après coup,
 * sur la rangée du dépôt ou sur son bilan.
 *
 * ⚠️ UNE SEULE LISTE POUR LES DEUX ÂGES D'UN FICHIER. Les envois en route et
 * les lectures vivent dans le même groupe : un fichier ne saute pas d'une liste
 * à l'autre en cours de route, il passe seulement du groupe « En cours » à son
 * mois quand il est lu.
 *
 * ⚠️ LE BOUTON NE SE GRISE JAMAIS PENDANT UN ENVOI. Chaque fichier part
 * indépendamment : c'est le traitement des références — Airwallex écrit « you
 * can upload more while they match ».
 */
export function EcranImport({
	donnees,
	detail,
	depotOuvert
}: {
	donnees: Lecture<ImportAffiche>;
	/**
	 * Le bilan du dépôt ouvert (l'`Outlet` de la route), ou `null`.
	 *
	 * ⚠️ SANS DÉPÔT OUVERT, PAS DE VOLET DROIT. L'import pleine largeur, plutôt
	 * qu'un volet vide qui laisserait la moitié de l'écran morte à 1024 px.
	 */
	detail: ReactNode;
	/** L'identifiant du dépôt que l'adresse ouvre, ou `null`. */
	depotOuvert: string | null;
}) {
	// Appelé avant toute branche : `PageEcran` porte les trois états, donc le
	// nombre de crochets ne change pas entre l'attente et l'arrivée des données.
	const minute = useMinute();

	// Un écran sans action dans la barre : son nom, en petit, centré.
	const entete: EnteteEcran = { genre: 'onglet', titre: TITRE_ECRAN.imports };

	const avecLeDepot = (page: ReactNode) => (
		<MaitreDetail maitre={page} detail={detail} detailOuvert={depotOuvert !== null} />
	);

	if (donnees.etat !== 'pret')
		return avecLeDepot(<PageEcran entete={entete} etat={donnees.etat} />);

	const { imports, envois, onDeposer, onReessayer } = donnees.valeur;
	const lectures = imports.filter(enLecture);
	const lus = imports.filter((depot) => !enLecture(depot));
	const enCours = envois.length + lectures.length;

	const ajout = (
		<AjoutDeFichiers
			accept={FORMATS_ACCEPTES}
			onFichiers={onDeposer}
			libelle="Ajouter des factures"
			formats={FORMATS_LISIBLES}
		/>
	);

	/** La rangée d'un dépôt que le serveur connaît. Elle mène à son bilan. */
	const rangee = (depot: LigneDepot) => (
		<CarteLien
			key={depot._id}
			vers="/app/import-factures/$id"
			parametres={{ id: depot._id }}
			// Définie seulement quand un bilan est ouvert : l'import pleine
			// largeur n'est pas un maître, et ses cartes gardent leur chevron.
			{...(depotOuvert === null ? {} : { selectionnee: depot._id === depotOuvert })}
			// L'icône dit par où le dépôt est passé : une feuille de calcul pour un
			// export, un document pour une facture déposée.
			icone={
				<VignetteIcone
					className="size-10"
					icone={depot.mode === 'FACTURE_DEPOSEE' ? <FileTextIcon /> : <FileSpreadsheetIcon />}
				/>
			}
			titre={depot.filename}
			ligne={precisionDepot(depot, minute)}
			// Un échec dit sa raison ENTIÈRE, et elle revient à la ligne au lieu de
			// se couper : c'est la seule carte qui ne se lit pas sans elle.
			retour={depot.statut === 'ECHOUE'}
			/*
			  ⚠️ LE NOM DU FICHIER PREND TOUTE LA PREMIÈRE LIGNE, comme dans Fichiers
			  d'iOS. Avec « 198 factures » à côté, « FEC-2026-exercice.txt » se lisait
			  « FEC-2026-exer… » à 375 px : la seule chose qui distingue deux dépôts.
			  Ce qui est entré rejoint la date, au bout de la seconde ligne.
			*/
			date={[valeurDepot(depot), JOUR.format(new Date(depot.deposeLe))]
				.filter((morceau) => morceau !== undefined)
				.join(' · ')}
			// ⚠️ CE QUI N'A PAS PU ÊTRE LU, SIGNALÉ SUR LA RANGÉE. C'est de l'argent
			// potentiellement perdu, et personne n'entrerait dans un bilan qui
			// annonce « 198 factures ». Une lecture muette le mérite aussi.
			attention={
				depot.statut === 'ECHOUE' ||
				(depot.bilan?.ignoreesTotal ?? 0) > 0 ||
				sansNouvelle(depot, minute)
			}
		/>
	);

	/*
	  ⚠️ LE PREMIER JOUR, LE VIDE MONTRE LE CHEMIN (règle d'écran n° 4). Deux
	  phrases, et deux seulement, parce qu'elles changent ce que le gérant fait :
	  l'export comptable apporte aussi ses règlements — ce qui évite de relancer un
	  client qui a payé —, et il peut partir pendant la lecture. Elles
	  disparaissent au premier dépôt : une explication qui reste devient du décor.
	*/
	if (imports.length === 0 && envois.length === 0) {
		return avecLeDepot(
			<PageEcran entete={entete}>
				<EmptyState
					titre="Ajoutez vos factures"
					explication="Un export comptable apporte aussi vos règlements et vos clients. La lecture continue même si vous quittez cet écran."
					action={<div className="flex w-full flex-col gap-cladd-3xs">{ajout}</div>}
				/>
			</PageEcran>
		);
	}

	return avecLeDepot(
		<PageEcran entete={entete}>
			{ajout}

			{/*
			  CE QUI BOUGE MAINTENANT PASSE DEVANT. Un fichier en route est la seule
			  rangée dont l'état changera pendant qu'on la regarde ; la reléguer sous
			  des dépôts vieux de six mois obligerait à la chercher.

			  ⚠️ PLUS AUCUN BANDEAU D'ERREUR GLOBAL : chaque échec vit sur la rangée
			  de SON fichier, avec son geste — jamais un « 3 erreurs » sans dire
			  lesquelles.
			*/}
			{enCours === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="En cours" nombre={enCours} total={null} />
					<ListeDeCartes>
						{envois.map((envoi) => (
							<LigneEnvoi key={envoi.cle} envoi={envoi} onReessayer={onReessayer} />
						))}
						{lectures.map(rangee)}
					</ListeDeCartes>
				</section>
			)}

			{parMois(lus).map((groupe) => (
				<section key={groupe.mois} className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle={groupe.mois} nombre={groupe.depots.length} total={null} />
					<ListeDeCartes>{groupe.depots.map(rangee)}</ListeDeCartes>
				</section>
			))}
		</PageEcran>
	);
}
