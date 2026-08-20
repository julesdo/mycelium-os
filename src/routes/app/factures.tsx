import { useRef, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Input } from '@cladd-ui/react';
import {
	UploadIcon,
	CheckIcon,
	TriangleAlertIcon,
	LoaderCircleIcon,
	CheckCheckIcon,
	FileCheckIcon,
	FolderPlusIcon,
	LockIcon
} from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Page,
	PageHeader,
	PageBody,
	Bandeau,
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule,
	pluriel
} from '../../ui';
import { trierFichiers, ACCEPT_HTML, type Refus } from '../../screens/factures/formats';

export const Route = createFileRoute('/app/factures')({ component: Factures });

const STATUTS: Record<string, string> = {
	DRAFT: 'Ouvert',
	EXTRACTING: 'Lecture en cours',
	CLASSIFYING: 'Classification en cours',
	REVIEW: 'À confirmer',
	READY: 'Prêt',
	FAILED: 'En échec'
};

function Factures() {
	const navigate = useNavigate();
	const lots = useQuery(api.egalim.batches.listerLots, {});
	const creerLot = useMutation(api.egalim.batches.creerLot);
	const genererUrl = useMutation(api.egalim.batches.genererUrlDepot);
	const enregistrer = useMutation(api.egalim.batches.enregistrerDocument);
	const produireDiagnostic = useMutation(api.egalim.diagnostics.produireDiagnostic);

	const [libelle, setLibelle] = useState(`Factures ${new Date().getFullYear() - 1}`);
	const [refus, setRefus] = useState<Refus[]>([]);
	const [envoiEnCours, setEnvoiEnCours] = useState(false);
	const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
	const [productionEnCours, setProductionEnCours] = useState(false);
	const [ouvertureEnCours, setOuvertureEnCours] = useState(false);
	const champFichiers = useRef<HTMLInputElement>(null);

	const ouvert = lots?.find((l) => l.ouvert) ?? null;
	const suivi = useQuery(
		api.egalim.batches.suivreLot,
		ouvert ? { batchId: ouvert.batchId } : 'skip'
	);

	/**
	 * @param depuisLeChamp true quand le nom vient du formulaire d'ouverture.
	 *
	 * Le bouton « Ouvrir un nouveau dépôt » vit sur l'écran du lot en cours, où
	 * le champ de nom n'est pas affiché. Reprendre `libelle` là-bas donnerait à
	 * deux dépôts le même nom — le champ est pré-rempli, donc jamais vide — et
	 * l'historique deviendrait illisible. On numérote à la place.
	 */
	async function ouvrirLot(depuisLeChamp = false) {
		const annee = new Date().getFullYear() - 1;
		const nom =
			(depuisLeChamp && libelle.trim()) ||
			(lots && lots.length > 0 ? `Factures ${annee} (${lots.length + 1})` : `Factures ${annee}`);
		setOuvertureEnCours(true);
		try {
			await creerLot({
				label: nom,
				periodStart: `${annee}-01-01`,
				periodEnd: `${annee}-12-31`
			});
			setErreurEnvoi(null);
		} finally {
			setOuvertureEnCours(false);
		}
	}

	async function produire() {
		if (!ouvert) return;
		setProductionEnCours(true);
		try {
			await produireDiagnostic({ batchId: ouvert.batchId });
		} finally {
			setProductionEnCours(false);
		}
	}

	async function deposer(fichiers: FileList | null) {
		if (!fichiers || !ouvert) return;
		const { acceptes, refuses } = trierFichiers([...fichiers]);
		setRefus(refuses);
		if (acceptes.length === 0) return;

		setEnvoiEnCours(true);
		setErreurEnvoi(null);
		try {
			for (const fichier of acceptes) {
				const url = await genererUrl({});
				const reponse = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': fichier.type || 'application/octet-stream' },
					body: fichier
				});
				if (!reponse.ok) {
					throw new Error(
						`Le transfert de ${fichier.name} a échoué (code ${reponse.status}). Vérifiez votre connexion et réessayez.`
					);
				}
				const { storageId } = (await reponse.json()) as { storageId: string };
				await enregistrer({
					batchId: ouvert.batchId,
					storageId: storageId as Id<'_storage'>,
					filename: fichier.name,
					mimeType: fichier.type || 'application/octet-stream'
				});
			}
		} catch (e) {
			// Sans ce `catch`, l'échec était totalement silencieux : le témoin
			// d'attente s'arrêtait et rien ne se passait. C'est ce qui faisait
			// dire « le dépôt ne marche pas », alors que le backend refusait
			// poliment et disait pourquoi.
			//
			// Un ConvexError porte son message dans `data` ; une erreur réseau
			// dans `message`. On montre celui qui existe plutôt qu'un « une
			// erreur est survenue » qui n'aide personne.
			const convexe = e as { data?: unknown };
			const message =
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: 'Le dépôt a échoué.';
			setErreurEnvoi(message);
		} finally {
			setEnvoiEnCours(false);
			if (champFichiers.current) champFichiers.current.value = '';
		}
	}

	const documents = suivi?.documents ?? [];
	const lus = documents.filter((d) => d.extractionStatus === 'DONE');
	const enEchec = documents.filter((d) => d.extractionStatus === 'FAILED');
	const enAttente = documents.filter((d) => d.extractionStatus === 'PENDING');

	/**
	 * Un lot « en cours » n'accepte pas forcément de nouveaux fichiers.
	 *
	 * `listerLots` marque `ouvert` quatre statuts — DRAFT, EXTRACTING,
	 * CLASSIFYING, REVIEW — parce que c'est le lot sur lequel on travaille.
	 * Mais `enregistrerDocument` n'en accepte que deux : au-delà, ajouter des
	 * lignes décalerait la liste triée que la classification parcourt par
	 * tranches, et elle en sauterait ou en rejouerait.
	 *
	 * Confondre les deux affichait « Ajouter des factures » sur un lot où
	 * l'envoi était refusé à coup sûr. Comme aucune erreur n'était montrée, le
	 * geste ne produisait rien du tout : le défaut le plus décourageant
	 * possible, puisque rien n'indique quoi faire.
	 */
	const accepteDesFichiers =
		ouvert !== null && (ouvert.status === 'DRAFT' || ouvert.status === 'EXTRACTING');

	return (
		<Page>
			<PageHeader
				titre="Factures"
				sousTitre="Déposez vos achats, nous les lisons et les classons."
			/>

			<PageBody>
				<div className="flex flex-col gap-cladd-xs">
					{!ouvert ? (
						<div className="flex flex-col gap-cladd-3xs">
							<p className="text-cladd-xs text-cladd-fg-soft">
								Ouvrez un dépôt, puis versez-y douze mois d&rsquo;achats. Un export comptable
								en CSV va le plus vite ; à défaut, les PDF et les photos conviennent.
							</p>
							<div className="flex flex-wrap items-end gap-cladd-3xs">
								<label className="flex min-w-64 flex-1 flex-col gap-1">
									<span className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
										Nom du dépôt
									</span>
									<Input value={libelle} onChange={setLibelle} name="libelle" />
								</label>
								<Button
									color="brand"
									variant="solid-fill"
									loading={ouvertureEnCours}
									onClick={() => void ouvrirLot(true)}
								>
									Ouvrir le dépôt
								</Button>
							</div>
						</div>
					) : (
						<>
							<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
								<div>
									<h2 className="text-cladd-sm font-semibold">{ouvert.label}</h2>
									<p className="text-cladd-2xs text-cladd-fg-softer">
										{STATUTS[ouvert.status] ?? ouvert.status} ·{' '}
										<span className="tabular-nums">{ouvert.linesTotal}</span> ligne
										{pluriel(ouvert.linesTotal)} extraite{pluriel(ouvert.linesTotal)}
									</p>
								</div>
								{accepteDesFichiers ? (
									<Button
										color="brand"
										variant="solid-fill"
										loading={envoiEnCours}
										onClick={() => champFichiers.current?.click()}
									>
										<UploadIcon />
										Ajouter des factures
									</Button>
								) : (
									<Button
										variant="gradient"
										loading={ouvertureEnCours}
										onClick={() => void ouvrirLot()}
									>
										<FolderPlusIcon />
										Ouvrir un nouveau dépôt
									</Button>
								)}
								<input
									ref={champFichiers}
									type="file"
									multiple
									accept={ACCEPT_HTML}
									onChange={(e) => void deposer(e.target.files)}
									className="sr-only"
								/>
							</div>

							{/*
							  Pourquoi ce dépôt n'accepte plus de fichiers. Le backend le
							  refuse à partir de la classification, et le taire laissait
							  l'utilisateur devant un écran qui ne réagit pas.
							*/}
							{!accepteDesFichiers ? (
								<Bandeau icone={<LockIcon size={16} />}>
									Ce dépôt est passé au traitement : il n&rsquo;accepte plus de nouveaux
									fichiers, sinon la classification en cours repartirait de travers. Ouvrez
									un nouveau dépôt pour la suite de vos factures.
								</Bandeau>
							) : null}

							{erreurEnvoi ? (
								<Bandeau ton="alerte" icone={<TriangleAlertIcon size={16} />}>
									{erreurEnvoi}
								</Bandeau>
							) : null}

							{refus.length > 0
								? refus.map((r) => (
										<Bandeau key={r.fichier} ton="alerte" icone={<TriangleAlertIcon size={16} />}>
											<span className="font-medium">{r.fichier}</span> — {r.raison}
										</Bandeau>
									))
								: null}

							{enAttente.length > 0 ? (
								<Bandeau icone={<LoaderCircleIcon size={16} className="animate-spin" />}>
									{enAttente.length} fichier{pluriel(enAttente.length)} en cours de lecture.
									Cette page se met à jour toute seule, vous pouvez la quitter.
								</Bandeau>
							) : null}

							{/*
						  Le diagnostic ne se produit qu'une fois la classification close
						  et la file vidée : c'est la garantie que le rapport figé repose
						  sur des décisions prises, pas sur des hypothèses en attente.
						*/}
						{suivi?.diagnosticId ? (
							<Bandeau
								icone={<FileCheckIcon size={16} />}
								action={
									<Button
										color="brand"
										variant="solid-fill"
										onClick={() =>
											void navigate({
												to: '/app/diagnostic/$id',
												params: { id: suivi.diagnosticId as string }
											})
										}
									>
										Voir le diagnostic
									</Button>
								}
							>
								Le diagnostic de ce dépôt est produit et figé à sa date.
							</Bandeau>
						) : ouvert.status === 'READY' ? (
							<Bandeau
								icone={<FileCheckIcon size={16} />}
								action={
									<Button
										color="brand"
										variant="solid-fill"
										loading={productionEnCours}
										onClick={() => void produire()}
									>
										Produire le diagnostic
									</Button>
								}
							>
								Tout est classé et confirmé. Vous pouvez figer la mesure.
							</Bandeau>
						) : null}

						{ouvert.status === 'REVIEW' && ouvert.labelsPendingReview > 0 ? (
								<Bandeau
									icone={<CheckCheckIcon size={16} />}
									action={
										<Button as={Link} to="/app/confirmer" color="brand" variant="solid-fill">
											Confirmer
										</Button>
									}
								>
									{ouvert.labelsPendingReview} produit{pluriel(ouvert.labelsPendingReview)}{' '}
									attend{ouvert.labelsPendingReview > 1 ? 'ent' : ''} votre confirmation.
								</Bandeau>
							) : null}

							{documents.length > 0 ? (
								<Tableau legende="Documents déposés et état de leur lecture">
									<TableauEntete>
										<TableauTitre>Fichier</TableauTitre>
										<TableauTitre>État</TableauTitre>
										<TableauTitre aDroite>Lignes</TableauTitre>
									</TableauEntete>
									<TableauCorps>
										{documents.map((d) => (
											<TableauLigne key={d.documentId}>
												<TableauCellule>
													<span className="block max-w-xs truncate">{d.filename}</span>
													{d.extractionError ? (
														<span className="block max-w-md text-cladd-3xs text-seuil-manque">
															{d.extractionError}
														</span>
													) : null}
												</TableauCellule>
												<TableauCellule>
													{d.extractionStatus === 'DONE' ? (
														<span className="flex items-center gap-1 text-seuil-atteint">
															<CheckIcon size={14} /> Lu
														</span>
													) : d.extractionStatus === 'FAILED' ? (
														<span className="flex items-center gap-1 text-seuil-manque">
															<TriangleAlertIcon size={14} /> Illisible
														</span>
													) : (
														<span className="flex items-center gap-1 text-cladd-fg-soft">
															<LoaderCircleIcon size={14} className="animate-spin" /> Lecture
														</span>
													)}
												</TableauCellule>
												<TableauCellule aDroite chiffre>
													{d.linesCount}
												</TableauCellule>
											</TableauLigne>
										))}
									</TableauCorps>
								</Tableau>
							) : (
								<p className="text-cladd-xs text-cladd-fg-soft">
									Aucun fichier pour l&rsquo;instant. Ajoutez vos factures ci-dessus.
								</p>
							)}

							<p className="text-cladd-2xs text-cladd-fg-softer tabular-nums">
								{lus.length} lu{pluriel(lus.length)} · {enAttente.length} en cours ·{' '}
								{enEchec.length} en échec
							</p>
						</>
					)}

					{lots && lots.length > 0 ? (
						<section className="flex flex-col gap-cladd-3xs border-t border-cladd-outline pt-cladd-xs">
							<h2 className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
								Vos dépôts
							</h2>
							<Tableau legende="Historique des dépôts de factures">
								<TableauEntete>
									<TableauTitre>Dépôt</TableauTitre>
									<TableauTitre>Période</TableauTitre>
									<TableauTitre>État</TableauTitre>
									<TableauTitre aDroite>Fichiers</TableauTitre>
									<TableauTitre aDroite>Lignes</TableauTitre>
								</TableauEntete>
								<TableauCorps>
									{lots.map((l) => (
										<TableauLigne key={l.batchId}>
											<TableauCellule>{l.label}</TableauCellule>
											<TableauCellule>
												{l.periodStart} → {l.periodEnd}
											</TableauCellule>
											<TableauCellule>{STATUTS[l.status] ?? l.status}</TableauCellule>
											<TableauCellule aDroite chiffre>
												{l.documentsTotal}
											</TableauCellule>
											<TableauCellule aDroite chiffre>
												{l.linesTotal}
											</TableauCellule>
										</TableauLigne>
									))}
								</TableauCorps>
							</Tableau>
						</section>
					) : null}
				</div>
			</PageBody>
		</Page>
	);
}
