import type { ReactNode } from 'react';
import { FileSpreadsheetIcon, FileTextIcon, UploadIcon } from 'lucide-react';
import {
	LigneAnalyse,
	ListeAnalyses,
	MaitreDetail,
	PageEcran,
	SectionEcran,
	ZoneDepot,
	dateCourte,
	pluriel,
	type BilanDepotAffiche,
	type EnteteEcran,
	type Lecture
} from '../../ui';
import { TITRE_ECRAN } from '../titres';
import { LigneEnvoi, libelleZone, type EnvoiAffiche } from './envois';
import { delaiLisible, minutesDepuis, useMinute, MINUTES_SANS_NOUVELLE } from './horloge';

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
 *
 * ⚠️ MAIS IL NE S'ÉCRIT PLUS SUR UN FACTUR-X, ET C'ÉTAIT UN MENSONGE À L'ÉCRAN.
 * La phrase se déduisait du MODE, qui vaut `FACTURE_DEPOSEE` pour tout PDF
 * déposé : une facture lue dans son propre fichier, sans un centime d'appel
 * modèle, affichait quand même un appel qui n'avait jamais eu lieu — sur
 * exactement le point que ce chemin apporte. C'est `bilan.format` qui tranche,
 * parce qu'il est écrit APRÈS la lecture, par le serveur qui a ouvert le
 * fichier.
 *
 * ⚠️ ET UNE LECTURE MUETTE DEPUIS UN QUART D'HEURE LE DIT. C'est le seul état
 * du produit qui pouvait durer indéfiniment sans que rien ne le distingue d'un
 * état normal : la tâche de lecture peut tomber entre son étape et son bilan, et
 * plus rien ne la reprend. Voir `horloge.ts`.
 */
function precisionDepot(depot: LigneDepot, minute: number | null): string {
	const deposeLe = `Déposé le ${dateCourte(new Date(depot.deposeLe).toISOString().slice(0, 10))}`;

	if (depot.statut === 'ECHOUE') return depot.erreur ?? 'Lecture en échec';

	if (enLecture(depot)) {
		const age = minutesDepuis(depot.deposeLe, minute);
		if (age !== null && age >= MINUTES_SANS_NOUVELLE) {
			return `Sans nouvelle depuis ${delaiLisible(age)}`;
		}
		return depot.etape ?? deposeLe;
	}

	if (depot.bilan?.format === 'FACTUR_X') return `Lue dans le fichier · ${deposeLe}`;
	return depot.mode === 'FACTURE_DEPOSEE' ? `Relue par le modèle · ${deposeLe}` : deposeLe;
}

/** Ce que la rangée montre à droite : un chiffre, ou l'état quand il n'y a pas de chiffre. */
function valeurDepot(depot: LigneDepot): string {
	if (depot.bilan) {
		return `${depot.bilan.facturesCreees} facture${pluriel(depot.bilan.facturesCreees)}`;
	}
	if (depot.statut === 'ECHOUE') return 'Échec';
	return 'Lecture…';
}

/**
 * CE QUI SE PASSE APRÈS LE LÂCHER — écrit UNE fois, au premier dépôt, jamais
 * après.
 *
 * ⚠️ RÈGLE D'ÉCRAN N° 4 : le vide montre le chemin. La zone de dépôt le montre
 * déjà ; ce qu'elle ne peut pas dire, c'est ce qui arrive ENSUITE. Deux faits,
 * et deux seulement, parce qu'ils changent ce que le gérant fait de sa journée :
 * il peut partir pendant la lecture, et il devra revenir regarder ce qui n'est
 * pas entré.
 *
 * ⚠️ UNE TROISIÈME PHRASE A ÉTÉ ÉCRITE PUIS RETIRÉE : « rien à choisir avant
 * l'envoi, le chemin se déduit du fichier ». Elle était vraie, et elle se
 * retournait contre la règle d'écran n° 1. Dire qu'il n'y a rien à choisir
 * INTRODUIT l'idée d'un choix : le gérant se demande ce qu'il ne choisit pas,
 * et cherche le réglage. Une déduction bien faite ne s'annonce pas — elle se
 * constate après coup, sur la rangée du dépôt, qui dit par où il est passé.
 *
 * ⚠️ ET LE BLOC DISPARAÎT AU PREMIER DÉPÔT. Une explication qui reste devient du
 * décor, et du décor sur l'écran d'entrée du produit est exactement ce qu'on
 * corrige.
 */
function CeQuiSePasseEnsuite() {
	return (
		<SectionEcran titre="Ce qui se passe ensuite">
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				La lecture se poursuit même si vous quittez cet écran.
			</p>
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Chaque dépôt dit ensuite ce qui est entré, et ligne par ligne ce qui n’a pas pu être lu.
			</p>
		</SectionEcran>
	);
}

/**
 * L'IMPORT DE FACTURES DE VENTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE SEULE ZONE, UNE SEULE LISTE, AUCUN ONGLET
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
 * ⚠️ UNE SEULE LISTE POUR LES DEUX ÂGES D'UN FICHIER. Les envois en route et
 * les dépôts que le serveur connaît vivent dans la MÊME liste, les premiers
 * au-dessus. Deux listes auraient fait sauter chaque fichier de l'une à l'autre
 * en cours de route, alors que ce sont les mêmes objets à deux instants.
 *
 * ⚠️ LA ZONE NE SE GRISE PLUS PENDANT UN ENVOI. Chaque fichier part
 * indépendamment : bloquer la zone empêchait d'ajouter le fichier qu'on vient
 * de retrouver, sans aucune raison technique. C'est le traitement des
 * références — Airwallex écrit « you can upload more while they match ».
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

	const { imports, envois, onDeposer, onReessayer } = donnees.valeur;
	const enRoute = libelleZone(envois);
	const premierImport = imports.length === 0 && envois.length === 0;

	return avecLeDepot(
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-2xs">
				<ZoneDepot
					accept={FORMATS_ACCEPTES}
					onFichiers={onDeposer}
					libellePhoto="Photographier une facture"
				>
					<div className="flex flex-col items-center gap-cladd-3xs text-center">
						{/*
						 * ⚠️ IL REVIENT AU VERRE, ET C'EST LA RUSTINE QUI PART.
						 *
						 * Ce disque portait `verre`. Le 16 septembre 2026, le verre du produit
						 * était écrit en dur en sombre : posé dans le creux de la zone de dépôt,
						 * lui-même du verre sombre dans les deux thèmes, il rendait 2,03:1 en
						 * thème clair — l'élément le moins lisible de l'écran était celui qui
						 * dit quoi faire. Il a donc été sorti du système, en `bg-cladd-surface`
						 * plus `shadow-cladd-outline`, pour suivre le thème au lieu de le
						 * contredire.
						 *
						 * La palette claire existe maintenant : `.light .verre` porte un
						 * presque-blanc translucide et son arête est une ombre. L'exception ne
						 * se justifie plus, et elle coûtait l'arête du verre — un disque plat
						 * au milieu d'un écran qui en compte trois autres du même motif.
						 *
						 * PAS UN `<Surface>` : `ui/__tests__/verre.test.ts` exige que toute
						 * surface du kit soit transparente, et une surface transparente ne
						 * peint aucun disque.
						 */}
						<span className="verre flex size-cladd-lg shrink-0 items-center justify-center rounded-full text-cladd-fg-soft">
							<UploadIcon size={22} aria-hidden />
						</span>
						{/*
						  ⚠️ ELLE COMPTE, ELLE NE DIT PLUS « EN COURS ». « Envoi de 3
						  fichiers… » se vérifie contre les rangées juste dessous ; « Envoi en
						  cours… » ne se vérifiait contre rien et ne bougeait jamais.
						*/}
						<p className="text-cladd-sm font-semibold">
							{enRoute ?? 'Déposez vos fichiers ici'}
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

				{/*
				  ⚠️ PLUS AUCUN BANDEAU D'ERREUR GLOBAL. Il disait « L'envoi de X a
				  échoué. » pour tout un lot, sans dire ce qu'étaient devenus les
				  autres, et il effaçait le précédent à chaque échec suivant. Chaque
				  échec vit désormais sur la rangée de SON fichier, avec son geste —
				  « jamais un "3 erreurs" sans dire lesquelles ».
				*/}

				{premierImport ? <CeQuiSePasseEnsuite /> : null}

				{envois.length > 0 || imports.length > 0 ? (
					<section className="flex flex-col gap-cladd-3xs">
						<h2 className="px-cladd-3xs text-cladd-2xs font-medium tracking-wide text-cladd-fg-softer uppercase">
							Vos dépôts
						</h2>
						<ListeAnalyses>
							{/*
							  CE QUI BOUGE MAINTENANT PASSE DEVANT. Un fichier en cours d'envoi
							  est la seule rangée dont l'état changera pendant qu'on la regarde ;
							  la reléguer sous des dépôts vieux de six mois obligerait à la
							  chercher. Même ordre que le veilleur, et pour la même raison.
							*/}
							{envois.map((envoi) => (
								<LigneEnvoi key={envoi.cle} envoi={envoi} onReessayer={onReessayer} />
							))}

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
									precision={precisionDepot(depot, minute)}
									valeur={valeurDepot(depot)}
									// ⚠️ CE QUI N'A PAS PU ÊTRE LU, SIGNALÉ SUR LA RANGÉE. C'est
									// de l'argent potentiellement perdu, et personne n'entrerait
									// dans un bilan qui annonce « 198 factures créées ». Une
									// lecture muette depuis un quart d'heure le mérite aussi : elle
									// n'aboutira peut-être jamais.
									attention={
										depot.statut === 'ECHOUE' ||
										(depot.bilan?.ignoreesTotal ?? 0) > 0 ||
										(enLecture(depot) &&
											(minutesDepuis(depot.deposeLe, minute) ?? 0) >= MINUTES_SANS_NOUVELLE)
									}
								/>
							))}
						</ListeAnalyses>
					</section>
				) : null}
			</div>
		</PageEcran>
	);
}
