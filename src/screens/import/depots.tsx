import type { ReactNode } from 'react';
import { FileSpreadsheetIcon, FileTextIcon, UploadIcon } from 'lucide-react';
import {
	Bandeau,
	LigneAnalyse,
	ListeAnalyses,
	MaitreDetail,
	PageEcran,
	ZoneDepot,
	dateCourte,
	pluriel,
	type BilanDepotAffiche,
	type EnteteEcran,
	type Lecture
} from '../../ui';
import { TITRE_ECRAN } from '../titres';

/** Les deux chemins par lesquels les factures arrivent. */
export type ModeDepot = 'EXPORT_COMPTABLE' | 'FACTURE_DEPOSEE';

/** Tout ce que la zone accepte, les deux chemins confondus. */
export const FORMATS_ACCEPTES = '.csv,.tsv,.txt,.pdf,image/*';

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

/** Ce que l'écran affiche : les dépôts, l'envoi en cours, et les gestionnaires que la route pilote. */
export interface ImportAffiche {
	readonly imports: readonly LigneDepot[];
	readonly envoiEnCours: boolean;
	readonly erreur: string | null;
	readonly onDeposer: (fichiers: File[]) => void;
}

/**
 * CE QUE LA RANGÉE DIT SOUS LE NOM DU FICHIER.
 *
 * ⚠️ UNE RANGÉE TERMINÉE ÉCRIVAIT DEUX FOIS LE MÊME CHIFFRE. La précision
 * reprenait l'étape — « 198 factures enregistrées. » — et la valeur, à droite,
 * disait « 198 factures ». Le repli sur la date ne s'affichait jamais, parce
 * qu'une étape est posée dès l'enregistrement : la date d'un dépôt n'était donc
 * visible nulle part. Savoir quel dépôt a fait entrer quelle facture, et quand,
 * est précisément ce qu'on redemande à un import six mois plus tard.
 *
 * ⚠️ « RELUE PAR LE MODÈLE » EST ÉCRIT ICI parce qu'on ne le choisit plus avant
 * l'envoi. Un appel facturé qui ne se décide plus doit au moins se voir. Pendant
 * la lecture l'étape le dit déjà, mot pour mot : on ne l'écrit pas deux fois.
 */
function precisionDepot(depot: LigneDepot): string {
	const deposeLe = `Déposé le ${dateCourte(new Date(depot.deposeLe).toISOString().slice(0, 10))}`;

	if (depot.statut === 'ECHOUE') return depot.erreur ?? 'Lecture en échec';
	if (depot.statut !== 'TERMINE') return depot.etape ?? deposeLe;

	return depot.mode === 'FACTURE_DEPOSEE' ? `Relue par le modèle · ${deposeLe}` : deposeLe;
}

/**
 * L'IMPORT DE FACTURES DE VENTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE SEULE ZONE, ET AUCUNE QUESTION AVANT LE FICHIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran a porté successivement un groupe segmenté puis deux rangées pour
 * faire choisir « par où vos factures arrivent ». Les deux formes réglaient la
 * même fausse question : le fichier déposé y répond seul, et `modeDuFichier`
 * le déduit. Il ne reste qu'une zone de dépôt.
 *
 * LES DEUX CHEMINS NE SE VALENT PAS POUR AUTANT, et l'écran continue de le
 * dire — mais après le dépôt, là où c'est actionnable. L'export comptable
 * porte les factures, les règlements et les clients d'un seul coup, structurés,
 * sans qu'aucune machine ne relise quoi que ce soit ; un PDF passe par le
 * modèle, ce qui est un appel facturé et une marge d'erreur que l'export n'a
 * pas. D'où la phrase sous la zone, et « Relue par le modèle » sur la rangée
 * des dépôts qui y sont passés.
 *
 * LE TRAITEMENT SE VOIT (règle d'écran n° 2). Chaque dépôt affiche son étape en
 * clair et son bilan à la fin — y compris ce qui n'a pas pu être lu. Voir
 * `ui/bilan-import.tsx`, qui porte le compromis entre cette exigence et le mur
 * de texte qu'elle produisait.
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
	const entete: EnteteEcran = {
		genre: 'onglet',
		titre: TITRE_ECRAN.imports,
		sousTitre: 'Vos factures de vente, et les règlements déjà reçus'
	};

	const avecLeDepot = (page: ReactNode) => (
		<MaitreDetail maitre={page} detail={detail} detailOuvert={depotOuvert !== null} />
	);

	if (donnees.etat !== 'pret')
		return avecLeDepot(<PageEcran entete={entete} etat={donnees.etat} />);

	const { imports, envoiEnCours, erreur, onDeposer } = donnees.valeur;

	return avecLeDepot(
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-2xs">
				<ZoneDepot
					accept={FORMATS_ACCEPTES}
					onFichiers={onDeposer}
					desactive={envoiEnCours}
					libellePhoto="Photographier une facture"
				>
					<div className="flex flex-col items-center gap-cladd-3xs text-center">
						<span className="verre flex size-cladd-lg items-center justify-center rounded-full">
							<UploadIcon size={22} aria-hidden />
						</span>
						<p className="text-cladd-sm font-semibold">
							{envoiEnCours ? 'Envoi en cours…' : 'Déposez vos fichiers ici'}
						</p>
						{/* Les formats acceptés sont ÉCRITS. Sans eux, on découvre qu'un
						    fichier est refusé après l'avoir choisi — et on ne sait pas
						    lequel prendre à la place. */}
						<p className="text-cladd-2xs text-cladd-fg-softer">FEC, CSV, PDF ou photo</p>
					</div>
				</ZoneDepot>

				{/* Ce qui reste du choix disparu : non plus une question, mais ce qu'on
				    gagne à sortir l'export plutôt qu'à rassembler des PDF. */}
				<p className="px-cladd-3xs text-cladd-2xs text-cladd-fg-softer">
					Un export comptable apporte aussi vos règlements et vos clients.
				</p>

				{erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}

				{/*
				  ═════════════════════════════════════════════════════════════════
				  ⚠️ UN DÉPÔT EST UNE RANGÉE, SON BILAN EST UNE PAGE
				  ═════════════════════════════════════════════════════════════════

				  Le bilan d'UN SEUL dépôt mesure 1,87 écran de défilement à 375 px :
				  ce qui est entré, ce qui a été écarté à bon droit, et ce qui n'a PAS
				  pu être lu, ligne par ligne avec sa raison. Cet écran les empilait
				  tous — et un gérant qui importe chaque mois en accumule douze par an.

				  La rangée dit ce qui est entré et où en est la lecture ; la page dit
				  ce qui manque.
				*/}
				{imports.length > 0 ? (
					<section className="flex flex-col gap-cladd-3xs">
						<h2 className="px-cladd-3xs text-cladd-2xs font-medium tracking-wide text-cladd-fg-softer uppercase">
							Vos dépôts
						</h2>
						<ListeAnalyses>
							{imports.map((depot) => (
								<LigneAnalyse
									key={depot._id}
									vers="/app/import-factures/$id"
									parametres={{ id: depot._id }}
									// Définie seulement quand un bilan est ouvert : l'import pleine
									// largeur n'est pas un maître, et ses rangées gardent leur chevron.
									selectionnee={depotOuvert === null ? undefined : depot._id === depotOuvert}
									// L'icône dit par où le dépôt est passé : une feuille de calcul
									// pour un export, un document pour ce qui est relu par le modèle.
									icone={
										depot.mode === 'FACTURE_DEPOSEE' ? <FileTextIcon /> : <FileSpreadsheetIcon />
									}
									titre={depot.filename}
									precision={precisionDepot(depot)}
									valeur={
										depot.bilan
											? `${depot.bilan.facturesCreees} facture${pluriel(depot.bilan.facturesCreees)}`
											: depot.statut === 'ECHOUE'
												? 'Échec'
												: 'Lecture…'
									}
									// ⚠️ CE QUI N'A PAS PU ÊTRE LU, SIGNALÉ SUR LA RANGÉE. C'est
									// de l'argent potentiellement perdu, et personne n'entrerait
									// dans un bilan qui annonce « 198 factures créées ».
									attention={depot.statut === 'ECHOUE' || (depot.bilan?.ignoreesTotal ?? 0) > 0}
								/>
							))}
						</ListeAnalyses>
					</section>
				) : null}
			</div>
		</PageEcran>
	);
}
