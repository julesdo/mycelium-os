import type { ReactNode } from 'react';
import { ListButton } from '@cladd-ui/react';
import { ChevronRightIcon, FileSpreadsheetIcon, FileTextIcon, UploadIcon } from 'lucide-react';
import {
	Bandeau,
	CarteListe,
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

/** Les deux chemins par lesquels les factures arrivent. */
export type ModeDepot = 'EXPORT_COMPTABLE' | 'FACTURE_DEPOSEE';

/** Les deux chemins, et ce que chacun accepte. */
const CHEMINS = [
	{
		mode: 'EXPORT_COMPTABLE' as const,
		titre: 'Export comptable',
		aide: 'Un FEC ou un CSV. Il porte vos factures, vos règlements et vos clients d’un coup.',
		recommande: true,
		Icone: FileSpreadsheetIcon,
		accept: '.csv,.txt,.tsv,text/csv,text/plain',
		formats: 'CSV, TSV ou FEC'
	},
	{
		mode: 'FACTURE_DEPOSEE' as const,
		titre: 'Factures en PDF',
		aide: 'Le repli quand l’export n’est pas disponible. Chaque facture est relue par le modèle.',
		recommande: false,
		Icone: FileTextIcon,
		accept: '.pdf,image/*',
		formats: 'PDF ou photo'
	}
];

/** Un dépôt, tel que sa rangée le résume. */
export interface LigneDepot {
	readonly _id: string;
	readonly filename: string;
	readonly statut: string;
	readonly etape?: string;
	readonly erreur?: string;
	readonly bilan?: BilanDepotAffiche;
	readonly deposeLe: number;
}

/** Ce que l'écran affiche : les dépôts, le chemin choisi, l'envoi en cours, et les gestionnaires que la route pilote. */
export interface ImportAffiche {
	readonly imports: readonly LigneDepot[];
	readonly mode: ModeDepot;
	readonly onChoisirMode: (mode: ModeDepot) => void;
	readonly envoiEnCours: boolean;
	readonly erreur: string | null;
	readonly onDeposer: (fichiers: File[]) => void;
}

/**
 * L'IMPORT DE FACTURES DE VENTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES DEUX CHEMINS NE SONT PAS ÉGAUX, ET L'ÉCRAN DOIT LE DIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la correction de fond de cet écran, et elle n'est pas cosmétique.
 *
 * La version précédente posait les deux modes dans un GROUPE SEGMENTÉ. Un
 * groupe segmenté est la forme qu'on emploie pour des options équivalentes —
 * « mensuel / annuel », « liste / grille ». Il affirme visuellement que les
 * deux branches se valent.
 *
 * Or elles ne se valent pas, et le fichier le disait déjà en toutes lettres :
 * l'export comptable porte les factures, les règlements et les clients d'un
 * seul coup, structurés, sans qu'aucune machine ne relise quoi que ce soit. Le
 * dépôt de PDF fait passer chaque facture par le modèle — un appel facturé, et
 * une marge d'erreur que l'export n'a pas.
 *
 * Présenter le repli à égalité invite à faire re-scanner des données qu'on
 * possède déjà propres. C'est un coût pour nous et un risque d'erreur pour le
 * client, sur un produit dont l'argument entier est l'exactitude.
 *
 * Deux LIGNES, donc, avec la recommandation ÉCRITE sur la première. C'est le
 * motif que les références emploient quand deux chemins mènent au même endroit
 * par des moyens inégaux.
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
		titre: 'Importer vos factures',
		sousTitre: 'Vos factures de vente, et les règlements déjà reçus'
	};

	const avecLeDepot = (page: ReactNode) => (
		<MaitreDetail maitre={page} detail={detail} detailOuvert={depotOuvert !== null} />
	);

	if (donnees.etat !== 'pret')
		return avecLeDepot(<PageEcran entete={entete} etat={donnees.etat} />);

	const { imports, mode, onChoisirMode, envoiEnCours, erreur, onDeposer } = donnees.valeur;
	const chemin = CHEMINS.find((c) => c.mode === mode) ?? CHEMINS[0]!;

	return avecLeDepot(
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-2xs">
				{/*
				  LES DEUX CHEMINS. `ListButton` porte nativement les quatre fentes
				  du motif — icône, titre, sous-titre, fin de ligne — et son état
				  `selected` remonte la rangée de deux niveaux de surface, donc le
				  choix courant se lit sans qu'aucune couleur soit nécessaire.
				*/}
				<CarteListe titre="Par où vos factures arrivent">
					{CHEMINS.map(({ mode: m, titre, aide, recommande, Icone }) => (
						<ListButton
							key={m}
							icon={<Icone />}
							selected={mode === m}
							onClick={() => onChoisirMode(m)}
							footer={aide}
							after={
								// La recommandation est ÉCRITE, pas suggérée par l'ordre.
								// Un ordre se lit comme un hasard ; un mot engage.
								recommande ? (
									<span className="shrink-0 text-cladd-3xs font-semibold text-cladd-primary">
										Recommandé
									</span>
								) : (
									<ChevronRightIcon size={16} className="shrink-0 text-cladd-fg-softest" />
								)
							}
						>
							{titre}
						</ListButton>
					))}
				</CarteListe>

				<ZoneDepot accept={chemin.accept} onFichiers={onDeposer} desactive={envoiEnCours}>
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
						<p className="text-cladd-2xs text-cladd-fg-softer">{chemin.formats}</p>
					</div>
				</ZoneDepot>

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
									icone={<FileTextIcon />}
									titre={depot.filename}
									precision={
										depot.statut === 'ECHOUE'
											? (depot.erreur ?? 'Lecture en échec')
											: (depot.etape ??
												dateCourte(new Date(depot.deposeLe).toISOString().slice(0, 10)))
									}
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
