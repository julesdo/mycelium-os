import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { ListButton } from '@cladd-ui/react';
import { ChevronRightIcon, FileSpreadsheetIcon, FileTextIcon, UploadIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Page,
	PageHeader,
	PageBody,
	ZoneDepot,
	CarteListe,
	Bandeau,
	LigneAnalyse,
	ListeAnalyses,
	dateCourte,
	pluriel
} from '../../ui';

export const Route = createFileRoute('/app/import-factures')({ component: ImportFactures });

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
type Mode = 'EXPORT_COMPTABLE' | 'FACTURE_DEPOSEE';

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

function ImportFactures() {
	const [mode, setMode] = useState<Mode>('EXPORT_COMPTABLE');
	const [envoiEnCours, setEnvoiEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	const imports = useQuery(api.recouvrement.depotMutations.listerImports, {});
	const genererUrl = useMutation(api.recouvrement.depotMutations.genererUrlDepot);
	const enregistrer = useMutation(api.recouvrement.depotMutations.enregistrerFichier);

	const chemin = CHEMINS.find((c) => c.mode === mode) ?? CHEMINS[0]!;

	async function deposer(fichiers: File[]) {
		setEnvoiEnCours(true);
		setErreur(null);
		try {
			for (const fichier of fichiers) {
				const url = await genererUrl({});
				const reponse = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': fichier.type || 'application/octet-stream' },
					body: fichier
				});
				if (!reponse.ok) throw new Error(`L’envoi de ${fichier.name} a échoué.`);

				const { storageId } = (await reponse.json()) as { storageId: Id<'_storage'> };
				await enregistrer({
					storageId,
					filename: fichier.name,
					mimeType: fichier.type || 'application/octet-stream',
					mode
				});
			}
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Le dépôt a échoué.');
		} finally {
			setEnvoiEnCours(false);
		}
	}

	return (
		<Page>
			<PageHeader
				titre="Importer vos factures"
				sousTitre="Vos factures de vente, et les règlements déjà reçus"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
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
								onClick={() => setMode(m)}
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

					<ZoneDepot accept={chemin.accept} onFichiers={deposer} desactive={envoiEnCours}>
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
					{imports && imports.length > 0 ? (
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
			</PageBody>
		</Page>
	);
}
