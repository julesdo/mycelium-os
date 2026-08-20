import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button } from '@cladd-ui/react';
import {
	UploadIcon,
	CheckIcon,
	TriangleAlertIcon,
	LoaderCircleIcon,
	CheckCheckIcon,
	FileCheckIcon
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
	pluriel,
	ZoneDepot
} from '../../ui';
import { trierFichiers, ACCEPT_HTML, type Refus } from '../../screens/factures/formats';

export const Route = createFileRoute('/app/factures')({ component: Factures });

/** L'exercice qui se déclare : l'année civile écoulée, à déclarer avant le 31 mars. */
const EXERCICE = String(new Date().getFullYear() - 1);

/**
 * Le dépôt de factures.
 *
 * Un seul geste : déposer. Aucune étape préalable, aucun nom à choisir, aucun
 * objet à ouvrir ni à fermer.
 *
 * La version précédente exposait le « lot » du modèle de données, qui est un
 * objet du moteur de classification : celui-ci traite un lot par tranches sur
 * une liste triée de libellés, et cette liste ne doit pas bouger en cours de
 * route. Contrainte réelle, mais technique — et elle imposait cinq règles au
 * gérant pour faire une seule chose : donner ses factures. Le lot est
 * désormais créé, nommé et fermé par le logiciel.
 */
function Factures() {
	const navigate = useNavigate();
	const lots = useQuery(api.egalim.batches.listerLots, {});
	const obtenirDepot = useMutation(api.egalim.batches.obtenirOuCreerDepot);
	const genererUrl = useMutation(api.egalim.batches.genererUrlDepot);
	const enregistrer = useMutation(api.egalim.batches.enregistrerDocument);
	const produireDiagnostic = useMutation(api.egalim.diagnostics.produireDiagnostic);

	const [refus, setRefus] = useState<Refus[]>([]);
	const [erreur, setErreur] = useState<string | null>(null);
	const [envoiEnCours, setEnvoiEnCours] = useState(false);
	const [productionEnCours, setProductionEnCours] = useState(false);
	const [progression, setProgression] = useState<{
		fait: number;
		total: number;
		courant: string;
	} | null>(null);

	const courant = lots?.find((l) => l.ouvert) ?? null;
	const suivi = useQuery(
		api.egalim.batches.suivreLot,
		courant ? { batchId: courant.batchId } : 'skip'
	);

	const enLecture = courant?.status === 'EXTRACTING' || courant?.status === 'CLASSIFYING';
	const aConfirmer = courant?.status === 'REVIEW';
	const pret = courant?.status === 'READY';

	async function deposer(fichiers: File[]) {
		const { acceptes, refuses } = trierFichiers(fichiers);
		setRefus(refuses);
		if (acceptes.length === 0) return;

		setEnvoiEnCours(true);
		setErreur(null);
		try {
			const depot = await obtenirDepot({ annee: EXERCICE });
			if (!depot.accepteDesFichiers) {
				setErreur(
					depot.status === 'REVIEW'
						? "Vos factures précédentes attendent vos confirmations. Videz la file, et vous pourrez en déposer d'autres."
						: 'Nous lisons encore vos factures précédentes. Vous pourrez en ajouter dans un instant.'
				);
				return;
			}

			for (const [i, fichier] of acceptes.entries()) {
				setProgression({ fait: i, total: acceptes.length, courant: fichier.name });
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
					batchId: depot.batchId,
					storageId: storageId as Id<'_storage'>,
					filename: fichier.name,
					mimeType: fichier.type || 'application/octet-stream'
				});
			}
		} catch (e) {
			// Un ConvexError porte son message dans `data`, une erreur réseau dans
			// `message`. On montre celui qui existe : sans ce bloc, un échec était
			// parfaitement silencieux, et c'est ce qui faisait dire « rien ne
			// fonctionne » alors que le backend refusait poliment en expliquant.
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: 'Le dépôt a échoué.'
			);
		} finally {
			setEnvoiEnCours(false);
			setProgression(null);
		}
	}

	async function produire() {
		if (!courant) return;
		setProductionEnCours(true);
		setErreur(null);
		try {
			await produireDiagnostic({ batchId: courant.batchId });
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string' ? convexe.data : "Le diagnostic n'a pas pu être produit."
			);
		} finally {
			setProductionEnCours(false);
		}
	}

	const documents = suivi?.documents ?? [];
	const enAttente = documents.filter((d) => d.extractionStatus === 'PENDING');

	return (
		<Page>
			<PageHeader
				titre="Vos factures"
				sousTitre={`Douze mois d'achats suffisent à calculer vos trois taux de l'exercice ${EXERCICE}.`}
			/>

			<PageBody>
				<div className="flex flex-col gap-cladd-xs">
					<ZoneDepot
						accept={ACCEPT_HTML}
						desactive={envoiEnCours || enLecture}
						onFichiers={deposer}
					>
						{envoiEnCours && progression ? (
							<>
								<LoaderCircleIcon size={24} className="animate-spin" />
								<span className="text-cladd-xs font-medium">Envoi de {progression.courant}</span>
								<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
									{progression.fait} sur {progression.total}
								</span>
							</>
						) : enLecture ? (
							<>
								<LoaderCircleIcon size={24} className="animate-spin" />
								<span className="text-cladd-xs font-medium">Nous lisons vos factures.</span>
								<span className="text-cladd-2xs text-cladd-fg-soft">
									Vous pourrez en ajouter dans un instant. Cette page se met à jour toute seule.
								</span>
							</>
						) : (
							<>
								<UploadIcon size={24} className="text-cladd-fg-softer" />
								<span className="text-cladd-xs font-medium">
									Glissez vos factures ici, ou cliquez pour les choisir
								</span>
								<span className="text-cladd-2xs text-cladd-fg-soft">
									Un export comptable en CSV va le plus vite. Les PDF et les photos conviennent
									aussi.
								</span>
							</>
						)}
					</ZoneDepot>

					{erreur ? (
						<Bandeau ton="alerte" icone={<TriangleAlertIcon size={16} />}>
							{erreur}
						</Bandeau>
					) : null}

					{refus.map((r) => (
						<Bandeau key={r.fichier} ton="alerte" icone={<TriangleAlertIcon size={16} />}>
							<span className="font-medium">{r.fichier}</span> — {r.raison}
						</Bandeau>
					))}

					{enAttente.length > 0 ? (
						<Bandeau icone={<LoaderCircleIcon size={16} className="animate-spin" />}>
							{enAttente.length} fichier{pluriel(enAttente.length)} en cours de lecture. Vous
							pouvez quitter cette page, le travail continue.
						</Bandeau>
					) : null}

					{aConfirmer && courant && courant.labelsPendingReview > 0 ? (
						<Bandeau
							icone={<CheckCheckIcon size={16} />}
							action={
								<Button as={Link} to="/app/confirmer" color="brand" variant="solid-fill">
									Confirmer
								</Button>
							}
						>
							{courant.labelsPendingReview} produit{pluriel(courant.labelsPendingReview)} attend
							{courant.labelsPendingReview > 1 ? 'ent' : ''} votre confirmation. C&rsquo;est la
							dernière étape avant vos taux.
						</Bandeau>
					) : null}

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
							Votre mesure est figée à sa date.
						</Bandeau>
					) : pret ? (
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

					{documents.length > 0 ? (
						<Tableau legende="Factures déposées et état de leur lecture">
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
					) : null}
				</div>
			</PageBody>
		</Page>
	);
}
