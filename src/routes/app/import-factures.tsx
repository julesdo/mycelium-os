import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Chip, Surface, Segmented, SegmentedButton } from '@cladd-ui/react';
import { FileSpreadsheetIcon, LoaderCircleIcon, CheckIcon, XIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { Page, PageHeader, PageBody, ZoneDepot, SectionEcran, dateCourte } from '../../ui';

export const Route = createFileRoute('/app/import-factures')({ component: ImportFactures });

/**
 * L'import de factures de vente.
 *
 * DEUX CHEMINS, ET L'ORDRE N'EST PAS NEUTRE. L'export comptable est proposé en
 * premier parce que c'est le bon : les factures de vente existent déjà chez le
 * créancier, structurées. Le dépôt de PDF est un REPLI, pas une alternative
 * équivalente — le présenter à égalité inviterait à faire re-scanner des
 * données qu'on possède déjà propres.
 *
 * LE TRAITEMENT SE VOIT (règle d'écran n° 2). Chaque dépôt affiche son étape en
 * clair, et son bilan à la fin — y compris ce qui n'a pas pu être lu. Un import
 * qui annonce « 198 factures » sans mentionner les deux lignes écartées ment
 * par omission, et l'omission porte sur l'argent qu'on ne réclamera pas.
 */
function ImportFactures() {
	const [mode, setMode] = useState<'EXPORT_COMPTABLE' | 'FACTURE_DEPOSEE'>('EXPORT_COMPTABLE');
	const [envoiEnCours, setEnvoiEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	const imports = useQuery(api.recouvrement.depotMutations.listerImports, {});
	const genererUrl = useMutation(api.recouvrement.depotMutations.genererUrlDepot);
	const enregistrer = useMutation(api.recouvrement.depotMutations.enregistrerFichier);

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
				<div className="flex flex-col gap-cladd-xs">
					<Segmented size="md" aria-label="Nature du fichier">
						<SegmentedButton
							active={mode === 'EXPORT_COMPTABLE'}
							onClick={() => setMode('EXPORT_COMPTABLE')}
						>
							Export comptable
						</SegmentedButton>
						<SegmentedButton
							active={mode === 'FACTURE_DEPOSEE'}
							onClick={() => setMode('FACTURE_DEPOSEE')}
						>
							Factures en PDF
						</SegmentedButton>
					</Segmented>

					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						{mode === 'EXPORT_COMPTABLE'
							? 'Un FEC ou un export CSV de votre logiciel comptable. C’est le chemin le plus complet : il porte vos factures, vos règlements et vos clients d’un seul coup, et rien n’est relu par une machine.'
							: 'Le repli, quand l’export n’est pas disponible. Chaque facture est lue par le modèle, ce qui coûte un appel et laisse une marge d’erreur que l’export n’a pas.'}
					</p>

					<ZoneDepot
						accept={
							mode === 'EXPORT_COMPTABLE'
								? '.csv,.txt,.tsv,text/csv,text/plain'
								: '.pdf,image/*'
						}
						onFichiers={deposer}
						desactive={envoiEnCours}
					>
						<div className="flex flex-col items-center gap-cladd-3xs text-center">
							<FileSpreadsheetIcon className="size-8 text-cladd-fg-softer" aria-hidden />
							<p className="text-cladd-sm font-semibold">
								{envoiEnCours ? 'Envoi en cours…' : 'Déposez vos fichiers ici'}
							</p>
						</div>
					</ZoneDepot>

					{erreur ? (
						<Surface contentClassName="p-cladd-2xs">
							<p className="text-cladd-xs text-cladd-fg">{erreur}</p>
						</Surface>
					) : null}

					{imports && imports.length > 0 ? (
						<SectionEcran titre="Vos dépôts">
							<div className="flex flex-col gap-cladd-3xs">
								{imports.map((depot) => (
									<Surface key={depot._id} contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs">
										<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
											<span className="min-w-0 truncate text-cladd-sm font-semibold">
												{depot.filename}
											</span>
											<Chip
												size="md"
												color={
													depot.statut === 'TERMINE'
														? 'green'
														: depot.statut === 'ECHOUE'
															? 'red'
															: 'neutral'
												}
											>
												{depot.statut === 'TERMINE' ? (
													<CheckIcon />
												) : depot.statut === 'ECHOUE' ? (
													<XIcon />
												) : (
													<LoaderCircleIcon className="animate-spin" />
												)}
												{depot.statut === 'TERMINE'
													? 'Lu'
													: depot.statut === 'ECHOUE'
														? 'Échec'
														: 'En cours'}
											</Chip>
										</div>

										{/* L'étape est un texte destiné à l'écran, pas un état de
										    machine — et elle reste affichée après coup : un écran qui
										    se vide à la fin laisse croire qu'il ne s'est rien passé. */}
										{depot.etape ? (
											<p className="text-cladd-xs text-cladd-fg-soft">{depot.etape}</p>
										) : null}

										{depot.erreur ? (
											<p className="text-cladd-xs text-cladd-fg">{depot.erreur}</p>
										) : null}

										{depot.bilan ? (
											<div className="flex flex-col gap-1.5 text-cladd-xs text-cladd-fg-soft">
												<p>
													{depot.bilan.facturesCreees} facture(s) enregistrée(s),{' '}
													{depot.bilan.reglementsCrees} règlement(s),{' '}
													{depot.bilan.debiteursCrees} débiteur(s) créé(s).
												</p>
												{depot.bilan.facturesDejaConnues > 0 ? (
													<p>
														{depot.bilan.facturesDejaConnues} facture(s) déjà connue(s),
														non recréée(s).
													</p>
												) : null}
												{depot.bilan.horsPerimetre > 0 ? (
													<p>
														{depot.bilan.horsPerimetre} écriture(s) hors périmètre
														(produits, TVA, trésorerie) — écartées à bon droit.
													</p>
												) : null}
												{depot.bilan.reglementsOrphelins > 0 ? (
													<p>
														{depot.bilan.reglementsOrphelins} règlement(s) sans facture
														connue : l’import est peut-être partiel.
													</p>
												) : null}
												{depot.bilan.ignoreesTotal > 0 ? (
													<>
														<p className="font-semibold text-cladd-fg">
															{depot.bilan.ignoreesTotal} ligne(s) n’ont pas pu être lues :
														</p>
														{depot.bilan.ignorees.map((ligne) => (
															<p key={ligne.texte}>· {ligne.raison}</p>
														))}
													</>
												) : null}
											</div>
										) : null}

										<p className="text-cladd-2xs text-cladd-fg-softer">
											Déposé le {dateCourte(new Date(depot.deposeLe).toISOString().slice(0, 10))}
										</p>
									</Surface>
								))}
							</div>
						</SectionEcran>
					) : null}
				</div>
			</PageBody>
		</Page>
	);
}
