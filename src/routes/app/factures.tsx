import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Surface, Spinner, Chip } from '@cladd-ui/react';
import {
	UploadCloudIcon,
	CheckCheckIcon,
	ChevronRightIcon,
	TriangleAlertIcon,
	CopyIcon
} from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Page,
	PageHeader,
	PageBody,
	Bandeau,
	ZoneDepot,
	FilTravail,
	SectionEcran,
	euros,
	pluriel
} from '../../ui';
import { trierFichiers, ACCEPT_HTML, type Refus } from '../../screens/factures/formats';
import { empreinte } from '../../screens/factures/empreinte';

export const Route = createFileRoute('/app/factures')({ component: Factures });

/** L'exercice qui se déclare : l'année civile écoulée, à déclarer avant le 31 mars. */
const EXERCICE = String(new Date().getFullYear() - 1);

/**
 * Le dépôt de factures.
 *
 * UN SEUL GESTE : donner ses factures. Aucune étape préalable, aucun nom à
 * choisir, aucun objet à ouvrir ni à fermer. La version précédente exposait le
 * « lot » du modèle de données — un objet du moteur de classification, qui
 * traite par tranches une liste triée de libellés et ne supporte pas qu'elle
 * bouge en cours de route. Contrainte réelle, mais technique, et elle imposait
 * cinq règles au gérant pour faire une seule chose. Le lot est désormais créé,
 * nommé et fermé par le logiciel.
 *
 * CE QUE CET ÉCRAN MONTRE ENSUITE est la moitié de sa raison d'être. Déposer
 * douze mois de factures déclenche plusieurs minutes de traitement. Une roue
 * qui tourne pendant ce temps ne dit pas « ça travaille », elle dit « c'est
 * peut-être planté ». On montre donc le travail lui-même : chaque fichier et
 * son étape, l'avancement du classement, et les dernières décisions prises,
 * produit par produit, avec leur illustration et leur verdict.
 *
 * Ce dernier point n'est pas décoratif. Le gérant va confirmer ces mêmes
 * décisions trois minutes plus tard ; les voir tomber pendant qu'il attend lui
 * apprend ce que le logiciel sait faire, et à quel point il devra le relire.
 */
function Factures() {
	const lots = useQuery(api.egalim.batches.listerLots, {});
	const obtenirDepot = useMutation(api.egalim.batches.obtenirOuCreerDepot);
	const genererUrl = useMutation(api.egalim.batches.genererUrlDepot);
	const enregistrer = useMutation(api.egalim.batches.enregistrerDocument);

	const [refus, setRefus] = useState<Refus[]>([]);
	const [erreur, setErreur] = useState<string | null>(null);
	/** Pourquoi le dépôt refuse, quand il refuse. Porte une issue, pas un constat. */
	const [blocage, setBlocage] = useState<'REVIEW' | 'CLASSIFYING' | null>(null);
	/** Les fichiers écartés parce qu'ils étaient déjà là, à l'octet près. */
	const [dejaLa, setDejaLa] = useState<{ fichier: string; jumeau: string }[]>([]);
	const [envoiEnCours, setEnvoiEnCours] = useState(false);
	const [progression, setProgression] = useState<{
		fait: number;
		total: number;
		courant: string;
	} | null>(null);

	// Le DERNIER lot, et non « celui qui est ouvert ». `ouvert` exclut `READY`,
	// si bien qu'un exercice entièrement confirmé ne remontait plus rien : ni le
	// fil de travail, ni le diagnostic produit, ni le bouton pour le produire.
	// L'écran devenait vide au moment précis où il avait le plus à dire.
	const courant = lots?.[0] ?? null;
	const suivi = useQuery(
		api.egalim.batches.suivreLot,
		courant ? { batchId: courant.batchId } : 'skip'
	);

	const aConfirmer = courant?.status === 'REVIEW';

	async function deposer(fichiers: File[]) {
		const { acceptes, refuses } = trierFichiers(fichiers);
		setRefus(refuses);
		if (acceptes.length === 0) return;

		// Les empreintes AVANT le premier envoi : elles se calculent en mémoire,
		// sans réseau, et c'est ce qui permet de refuser un fichier déjà connu
		// sans avoir eu à le téléverser une seconde fois.
		const empreintes = await Promise.all(acceptes.map(empreinte));

		setEnvoiEnCours(true);
		setErreur(null);
		setDejaLa([]);
		const ignores: { fichier: string; jumeau: string }[] = [];
		try {
			const depot = await obtenirDepot({ annee: EXERCICE });
			if (!depot.accepteDesFichiers) {
				setBlocage(depot.status === 'REVIEW' ? 'REVIEW' : 'CLASSIFYING');
				return;
			}
			setBlocage(null);

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
				const issue = await enregistrer({
					batchId: depot.batchId,
					storageId: storageId as Id<'_storage'>,
					filename: fichier.name,
					mimeType: fichier.type || 'application/octet-stream',
					contentHash: empreintes[i]
				});

				// Le fichier était déjà là, à l'octet près : rien n'a été créé, et
				// aucun appel au modèle n'a été dépensé. On le dit, sans en faire
				// une erreur — redéposer un dossier entier est un geste normal,
				// et c'est même celui qu'on préfère à l'oubli.
				if (issue.documentId === null && issue.doublonDe) {
					ignores.push({ fichier: fichier.name, jumeau: issue.doublonDe });
				}
			}

			setDejaLa(ignores);
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

	const documents = suivi?.documents ?? [];

	return (
		<Page>
			<PageHeader
				titre="Vos factures"
				sousTitre={`Douze mois d'achats suffisent à calculer vos trois taux de l'exercice ${EXERCICE}.`}
			/>

			<PageBody>
				<div className="mx-auto flex max-w-4xl flex-col gap-cladd-2xs">
					<ZoneDepot accept={ACCEPT_HTML} desactive={envoiEnCours} onFichiers={deposer}>
						{envoiEnCours && progression ? (
							<>
								<Spinner size="lg" color="brand" />
								<div className="flex flex-col gap-1">
									<span className="text-cladd-sm font-semibold">
										Envoi de {progression.courant}
									</span>
									<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
										{progression.fait} sur {progression.total}
									</span>
								</div>
							</>
						) : (
							<>
								<span
									aria-hidden
									className="flex size-vignette-md items-center justify-center rounded-cladd-lg bg-cladd-primary/10 text-cladd-primary"
								>
									<UploadCloudIcon size={34} />
								</span>
								<div className="flex flex-col gap-1">
									<span className="text-cladd-sm font-semibold">
										Déposez vos factures, on s&rsquo;occupe du reste
									</span>
									<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
										Un export comptable en CSV va le plus vite. Les PDF et les photos
										conviennent aussi&nbsp;— même prises de travers.
									</span>
								</div>
							</>
						)}
					</ZoneDepot>

					{erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}

					{blocage === 'REVIEW' ? (
						<Bandeau
							ton="alerte"
							icone={<CheckCheckIcon size={16} />}
							action={
								<Button as={Link} to="/app/confirmer" color="brand" variant="solid-fill">
									Confirmer maintenant
								</Button>
							}
						>
							Des produits attendent encore votre confirmation. Tranchez-les d&rsquo;abord :
							ajouter des factures pendant que vous arbitrez ferait bouger le périmètre sous vos
							décisions.
						</Bandeau>
					) : null}

					{dejaLa.length > 0 ? (
						<Bandeau icone={<CopyIcon size={16} />}>
							{dejaLa.length} fichier{pluriel(dejaLa.length)} déjà déposé
							{pluriel(dejaLa.length)}, ignoré{pluriel(dejaLa.length)} :{' '}
							{dejaLa.map((d) => d.fichier).join(', ')}. Vos taux sont inchangés — une facture
							comptée deux fois les fausserait sans que rien ne le montre.
						</Bandeau>
					) : null}

					{blocage === 'CLASSIFYING' ? (
						<Bandeau icone={<Spinner size="sm" />}>
							Nous classons encore vos factures précédentes. Vous pourrez en ajouter dès que
							c&rsquo;est fini — cette page se met à jour toute seule.
						</Bandeau>
					) : null}

					{refus.map((r) => (
						<Bandeau key={r.fichier} ton="alerte">
							<span className="font-medium">{r.fichier}</span> — {r.raison}
						</Bandeau>
					))}

					{/* Le travail en cours, montré sans qu'on le demande et sans qu'il
					    faille recharger : la requête Convex est réactive, la page se
					    repeint d'elle-même à chaque décision. */}
					{documents.length > 0 ? (
						<FilTravail documents={documents} classification={suivi?.classification ?? null} />
					) : null}

					{aConfirmer && courant && courant.labelsPendingReview > 0 ? (
						<Surface
							outline
							color="brand"
							variant="solid-fill"
							className="rounded-cladd-2xl shadow-carte-levee"
							contentClassName="flex flex-wrap items-center justify-between gap-cladd-2xs p-cladd-2xs"
						>
							<div className="flex items-center gap-cladd-3xs">
								<CheckCheckIcon size={22} />
								<div>
									<p className="text-cladd-sm font-semibold">
										{courant.labelsPendingReview} produit{pluriel(courant.labelsPendingReview)}{' '}
										attend{courant.labelsPendingReview > 1 ? 'ent' : ''} votre confirmation
									</p>
									<p className="text-cladd-2xs opacity-80">
										C&rsquo;est la dernière étape avant vos taux.
									</p>
								</div>
							</div>
							<Button as={Link} to="/app/confirmer" variant="solid" color="neutral">
								Confirmer maintenant
							</Button>
						</Surface>
					) : null}

					<Facturier annee={EXERCICE} />

				</div>
			</PageBody>
		</Page>
	);
}

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

/**
 * Les factures de l'exercice, et l'entrée vers leur détail.
 *
 * Elles n'étaient visibles que pendant leur traitement, dans le fil, puis
 * disparaissaient. Un gérant qui voulait vérifier « est-ce que la facture de
 * mars est bien passée ? » n'avait aucune liste à consulter — et la question
 * se pose à chaque fois qu'un taux surprend.
 *
 * Une facture illisible reste dans la liste, marquée comme telle. La faire
 * disparaître donnerait un facturier propre et un taux faux : c'est exactement
 * l'échange que ce produit ne doit jamais faire.
 */
function Facturier({ annee }: { annee: string }) {
	const factures = useQuery(api.egalim.produits.listerFactures, { annee });
	if (!factures || factures.length === 0) return null;

	return (
		<SectionEcran
			titre="Vos factures"
			legende={`${factures.length} fichier${pluriel(factures.length)} sur l'exercice ${annee}.`}
		>
			<div className="flex flex-col gap-cladd-3xs">
				{factures.map((f) => (
					<Link
						key={f.documentId}
						to="/app/facture/$id"
						params={{ id: f.documentId }}
						className="block"
					>
						<Surface
							outline
							hoverable
							clickable
							className="rounded-cladd-lg"
							contentClassName="flex flex-wrap items-center gap-cladd-3xs p-cladd-3xs"
						>
							<div className="min-w-0 flex-1">
								<span className="block truncate text-cladd-xs font-medium">
									{f.invoiceNumber ? `Facture ${f.invoiceNumber}` : f.filename}
								</span>
								<span className="text-cladd-3xs text-cladd-fg-softer">
									{[
										f.supplierName,
										f.invoiceDate
											? DATE.format(new Date(`${f.invoiceDate}T00:00:00`))
											: null,
										f.invoiceNumber ? f.filename : null
									]
										.filter(Boolean)
										.join(' · ') || 'En cours de lecture'}
								</span>
							</div>

							<div className="flex shrink-0 items-center gap-cladd-3xs">
								{f.estDoublon ? (
									<Chip size="sm" color="neutral">
										<CopyIcon size={12} />
										Doublon
									</Chip>
								) : f.extractionStatus === 'FAILED' ? (
									<Chip size="sm" color="orange">
										<TriangleAlertIcon size={12} />
										Illisible
									</Chip>
								) : f.extractionStatus === 'PENDING' ? (
									<Chip size="sm" color="neutral">
										Lecture en cours
									</Chip>
								) : (
									<span className="text-cladd-3xs text-cladd-fg-softer tabular-nums">
										{f.linesCount} ligne{pluriel(f.linesCount)}
									</span>
								)}
								<span className="w-24 text-right text-cladd-xs font-semibold tabular-nums">
									{f.totalHT !== null ? euros(f.totalHT) : '—'}
								</span>
								<ChevronRightIcon size={16} className="text-cladd-fg-softest" />
							</div>
						</Surface>
					</Link>
				))}
			</div>
		</SectionEcran>
	);
}
