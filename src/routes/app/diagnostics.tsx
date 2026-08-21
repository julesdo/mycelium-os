import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button, Chip, Surface } from '@cladd-ui/react';
import { CameraIcon, ChevronRightIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { Page, PageHeader, PageBody, EmptyState, TauxCompact } from '../../ui';

export const Route = createFileRoute('/app/diagnostics')({ component: Diagnostics });

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

/**
 * L'historique des mesures.
 *
 * Un diagnostic est une preuve datée. Celui de mars doit rester retrouvable en
 * juin, et celui de l'an dernier en cas de contrôle. C'est aussi le seul écran
 * où le gérant voit sa trajectoire : trois exercices l'un sous l'autre disent
 * s'il progresse, ce qu'aucun taux isolé ne dit.
 *
 * C'ÉTAIT UN TABLEAU À SIX COLONNES, dont la première portait un lien souligné.
 * Deux défauts qui vont ensemble : sur une tablette, six colonnes obligent à
 * faire défiler horizontalement pour lire le troisième taux, et une cible de
 * la taille d'un mot (« 2026 ») se rate au doigt. La carte entière est
 * maintenant la cible, et les trois taux tiennent sur une rangée.
 */
function Diagnostics() {
	const liste = useQuery(api.egalim.diagnostics.listerDiagnostics, {});

	if (liste === undefined) {
		return (
			<Page>
				<PageHeader titre="Diagnostics" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement de vos diagnostics…</p>
				</PageBody>
			</Page>
		);
	}

	if (liste.length === 0) {
		return (
			<Page>
				<PageHeader titre="Diagnostics" sousTitre="Vos mesures figées, exercice par exercice." />
				<PageBody>
					<EmptyState
						illustration="📁"
						titre="Aucune mesure figée pour l'instant."
						explication="Un diagnostic se produit quand un dépôt est entièrement classé et confirmé. Il fixe vos trois taux à une date, et ne bouge plus : c'est ce qui en fait une preuve."
						action={
							<Button as={Link} to="/app/factures" color="brand" variant="solid-fill" size="lg">
								<CameraIcon />
								Déposer mes factures
							</Button>
						}
					/>
				</PageBody>
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader
				titre="Diagnostics"
				sousTitre="Vos mesures figées, de la plus récente à la plus ancienne."
			/>
			<PageBody>
				<div className="flex flex-col gap-cladd-2xs">
					{liste.map((d) => (
						/* Le lien PORTE la carte plutôt que la carte ne se transforme en
						   lien : `Surface as={Link}` perd l'inférence des paramètres de
						   route de TanStack, et il faudrait la rétablir par une
						   assertion — c'est-à-dire éteindre la seule vérification qui
						   garantit qu'un identifiant manquant se voit à la compilation.
						   La carte remplit le lien, donc la cible reste la carte entière. */
						<Link
							key={d.diagnosticId}
							to="/app/diagnostic/$id"
							params={{ id: d.diagnosticId }}
							className="block"
						>
						<Surface
							outline
							hoverable
							clickable
							className="rounded-cladd-2xl shadow-carte"
							contentClassName="flex flex-wrap items-center gap-cladd-2xs p-cladd-2xs"
						>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-cladd-3xs">
									<span className="text-cladd-md font-bold tabular-nums">
										{d.periodStart.slice(0, 4)}
									</span>
									<Chip size="sm" color={d.status === 'DELIVERED' ? 'brand' : 'neutral'}>
										{d.status === 'DELIVERED' ? 'Remis' : 'Brouillon'}
									</Chip>
								</div>
								<p className="text-cladd-2xs text-cladd-fg-softer">
									mesuré le {DATE.format(new Date(d.computedAt))}
								</p>
							</div>

							<div className="flex shrink-0 items-center gap-cladd-2xs">
								<TauxCompact titre="Durable" mesure={d.ratios.durable} seuil={0.5} />
								<TauxCompact titre="Bio" mesure={d.ratios.bio} seuil={0.2} />
								<TauxCompact
									titre="Viande et poisson"
									mesure={d.ratios.meatFishDurable}
									seuil={0.6}
								/>
								<ChevronRightIcon size={18} className="shrink-0 text-cladd-fg-softest" />
							</div>
						</Surface>
						</Link>
					))}
				</div>
			</PageBody>
		</Page>
	);
}
