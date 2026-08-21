import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button, Surface, Chip } from '@cladd-ui/react';
import { FileTextIcon, ArrowLeftIcon, TriangleAlertIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Page,
	PageHeader,
	PageBody,
	Bandeau,
	Illustration,
	Verdict,
	euros,
	FAMILLES
} from '../../ui';

export const Route = createFileRoute('/app/facture/$id')({ component: Facture });

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

/**
 * Le détail d'une facture, ligne par ligne.
 *
 * POURQUOI CET ÉCRAN EXISTE. Le produit lit des factures et en tire un
 * chiffre ; jusqu'ici, ce qu'il en avait lu n'était visible nulle part. Un
 * gérant qui trouvait son taux étrange n'avait aucun moyen de vérifier
 * l'extraction — de constater qu'un total avait été mal lu, qu'un avoir avait
 * été compté en positif, ou qu'une facture de trente lignes n'en avait rendu
 * que huit. « Le logiciel décide » n'est tenable que si le gérant peut, quand
 * il le veut, aller voir ce qui a été décidé.
 *
 * L'écart entre le total imprimé et la somme des lignes est calculé et affiché.
 * C'est le seul contrôle qui attrape une extraction silencieusement partielle,
 * et il ne coûte rien : les deux nombres sont déjà là.
 */
function Facture() {
	const { id } = Route.useParams();
	const facture = useQuery(api.egalim.produits.obtenirFacture, {
		documentId: id as Id<'invoiceDocuments'>
	});

	if (facture === undefined) {
		return (
			<Page>
				<PageHeader titre="Facture" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement de la facture…</p>
				</PageBody>
			</Page>
		);
	}

	if (facture === null) {
		return (
			<Page>
				<PageHeader titre="Facture" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">
						Cette facture n&rsquo;existe pas, ou elle appartient à un autre établissement.
					</p>
				</PageBody>
			</Page>
		);
	}

	const sommeLignes = facture.lignes.reduce((s, l) => s + l.amountHT, 0);
	// Un euro de tolérance : les centimes d'arrondi de TVA ne sont pas un écart
	// d'extraction, et les signaler à chaque facture reviendrait à ne rien
	// signaler du tout.
	const ecart =
		facture.totalHT !== null && Math.abs(facture.totalHT - sommeLignes) > 1
			? facture.totalHT - sommeLignes
			: null;

	return (
		<Page>
			<PageHeader
				titre={facture.invoiceNumber ? `Facture ${facture.invoiceNumber}` : facture.filename}
				sousTitre={[
					facture.supplierName,
					facture.invoiceDate
						? DATE.format(new Date(`${facture.invoiceDate}T00:00:00`))
						: 'date inconnue'
				]
					.filter(Boolean)
					.join(' · ')}
				actions={
					<div className="flex items-center gap-cladd-3xs">
						<Button as={Link} to="/app/factures" square rounded aria-label="Revenir aux factures">
							<ArrowLeftIcon />
						</Button>
						{facture.url ? (
							<Button
								as="a"
								href={facture.url}
								target="_blank"
								rel="noreferrer"
								color="brand"
								variant="solid-fill"
							>
								<FileTextIcon />
								Ouvrir le fichier
							</Button>
						) : null}
					</div>
				}
			/>

			<PageBody>
				<div className="flex flex-col gap-cladd-2xs">
					{facture.extractionStatus === 'FAILED' ? (
						<Bandeau ton="alerte" icone={<TriangleAlertIcon size={16} />}>
							{facture.extractionError ??
								'Ce fichier n’a pas pu être lu. Il ne compte dans aucun taux.'}
						</Bandeau>
					) : null}

					{ecart !== null ? (
						<Bandeau ton="alerte" icone={<TriangleAlertIcon size={16} />}>
							Le total imprimé sur la facture est{' '}
							<span className="font-semibold tabular-nums">{euros(facture.totalHT ?? 0)}</span>,
							et la somme des lignes lues{' '}
							<span className="font-semibold tabular-nums">{euros(sommeLignes)}</span> —{' '}
							<span className="font-semibold tabular-nums">{euros(Math.abs(ecart))}</span>{' '}
							d&rsquo;écart. Il manque probablement des lignes : redéposez une version plus
							lisible du fichier.
						</Bandeau>
					) : null}

					<div className="grid gap-cladd-2xs sm:grid-cols-3">
						<Total titre="Lignes lues" valeur={String(facture.lignes.length)} />
						<Total titre="Somme des lignes" valeur={euros(sommeLignes)} />
						<Total
							titre="Total imprimé"
							valeur={facture.totalHT !== null ? euros(facture.totalHT) : '—'}
						/>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						{facture.lignes.map((l) => (
							<Surface
								key={l.ligneId}
								outline
								className="rounded-cladd-lg"
								contentClassName="flex flex-wrap items-center gap-cladd-3xs p-cladd-3xs"
							>
								<Illustration
									libelle={l.rawLabel}
									famille={l.family}
									estAlimentaire={l.isFood}
									taille="sm"
								/>

								<div className="min-w-0 flex-1">
									<span className="block text-cladd-xs leading-tight font-medium break-words">
										{l.rawLabel}
									</span>
									<span className="text-cladd-3xs text-cladd-fg-softer">
										{l.family ? FAMILLES[l.family] : 'Non classé'}
										{l.quantity !== null
											? ` · ${l.quantity}${l.unit ? ` ${l.unit}` : ''}`
											: ''}
									</span>
								</div>

								<div className="flex shrink-0 items-center gap-cladd-3xs">
									<Verdict
										mentions={l.qualifyingLabels}
										estAlimentaire={l.isFood ?? true}
										taille="sm"
									/>
									{l.reviewStatus === 'PENDING_REVIEW' ? (
										<Chip size="sm" color="orange">
											À confirmer
										</Chip>
									) : null}
									<span className="w-24 text-right text-cladd-xs font-semibold tabular-nums">
										{euros(l.amountHT)}
									</span>
								</div>
							</Surface>
						))}
					</div>

					{facture.lignes.length === 0 ? (
						<p className="text-cladd-xs text-cladd-fg-soft">
							Aucune ligne n&rsquo;a été extraite de ce fichier.
						</p>
					) : (
						<p className="text-cladd-2xs text-cladd-fg-softer">
							Pour changer une classification, ouvrez le produit depuis{' '}
							<Link to="/app/produits" className="font-medium underline underline-offset-2">
								vos produits
							</Link>{' '}
							: une décision s&rsquo;applique à toutes les lignes du même libellé, sur toutes vos
							factures. La corriger ici, facture par facture, en ferait {facture.lignes.length}{' '}
							fois le même travail.
						</p>
					)}
				</div>
			</PageBody>
		</Page>
	);
}

function Total({ titre, valeur }: { titre: string; valeur: string }) {
	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex flex-col gap-1 p-cladd-2xs"
		>
			<span className="text-cladd-2xs text-cladd-fg-softer">{titre}</span>
			<span className="text-mycelium-chiffre leading-none font-bold tabular-nums">{valeur}</span>
		</Surface>
	);
}

