import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Chip, Surface } from '@cladd-ui/react';
import {
	CameraIcon,
	ChevronRightIcon,
	FileCheck2Icon,
	CheckCheckIcon,
	LoaderCircleIcon,
	LockIcon
} from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	Bandeau,
	SectionEcran,
	TauxCompact,
	pluriel
} from '../../ui';

export const Route = createFileRoute('/app/diagnostics')({ component: Diagnostics });

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

/**
 * Les bilans EGalim : les éditer, les retrouver.
 *
 * CE QUI N'ALLAIT PAS. Le bouton pour éditer un bilan vivait au BAS de l'écran
 * des factures, sous une bannière conditionnelle ; la liste des bilans passés
 * n'était atteignable que par un lien en petit, au bas d'un troisième écran. Un
 * gérant qui vient chercher son rapport en mars ne le trouvait nulle part où il
 * pensait le chercher — et quand le bouton ne s'affichait pas, rien ne lui
 * disait ce qui manquait.
 *
 * Deux corrections, et elles vont ensemble. L'action d'éditer est EN HAUT de
 * l'écran qui porte les bilans, avec son motif quand elle n'est pas possible.
 * Et le mot « figer » disparaît : il décrivait une propriété du modèle de
 * données, pas ce que le gérant fait. Il édite un bilan ; ce bilan ne bouge
 * plus ensuite, et on le lui dit au moment où ça le concerne — juste avant
 * d'appuyer — plutôt que comme un principe abstrait.
 */
function Diagnostics() {
	const navigate = useNavigate();
	const liste = useQuery(api.egalim.diagnostics.listerDiagnostics, {});
	const etat = useQuery(api.egalim.diagnostics.etatProduction, {});
	const produire = useMutation(api.egalim.diagnostics.produireDiagnostic);

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function editer() {
		if (!etat?.batchId) return;
		setEnCours(true);
		setErreur(null);
		try {
			const id = await produire({ batchId: etat.batchId as Id<'invoiceBatches'> });
			await navigate({ to: '/app/diagnostic/$id', params: { id } });
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: "Le bilan n'a pas pu être édité."
			);
		} finally {
			setEnCours(false);
		}
	}

	if (liste === undefined || etat === undefined) {
		return (
			<Page>
				<PageHeader titre="Vos bilans" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader
				titre="Vos bilans"
				sousTitre="Le document que vous remettez à votre direction, et que vous présentez en cas de contrôle."
			/>
			<PageBody>
				<div className="mx-auto flex max-w-4xl flex-col gap-cladd-2xs">
					{erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}

					<Editer etat={etat} enCours={enCours} onEditer={() => void editer()} />

					{liste.length === 0 ? (
						<EmptyState
							illustration="📄"
							titre="Aucun bilan pour l’instant."
							explication="Un bilan reprend vos trois taux, d'où viennent vos achats et où il reste de la marge. Il porte la date du jour où vous l'éditez et ne change plus ensuite — c'est ce qui en fait une pièce opposable."
							action={
								<Button as={Link} to="/app/factures" color="brand" variant="solid-fill" size="lg">
									<CameraIcon />
									Déposer mes factures
								</Button>
							}
						/>
					) : (
						<SectionEcran
							titre="Vos bilans édités"
							legende={`${liste.length} bilan${pluriel(liste.length)}, du plus récent au plus ancien.`}
						>
							<div className="flex flex-col gap-cladd-3xs">
								{liste.map((d) => (
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
											className="rounded-cladd-lg"
											contentClassName="flex flex-wrap items-center gap-cladd-2xs p-cladd-3xs"
										>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-cladd-3xs">
													<span className="text-cladd-md font-bold tabular-nums">
														{d.periodStart.slice(0, 4)}
													</span>
													<Chip
														size="sm"
														color={d.status === 'DELIVERED' ? 'brand' : 'neutral'}
													>
														{d.status === 'DELIVERED' ? 'Remis' : 'Édité'}
													</Chip>
												</div>
												<p className="text-cladd-2xs text-cladd-fg-softer">
													édité le {DATE.format(new Date(d.computedAt))}
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
						</SectionEcran>
					)}
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * Éditer un bilan — l'action, en haut, avec son motif quand elle est impossible.
 *
 * Un bouton grisé sans explication est pire qu'un bouton absent : il dit qu'on
 * pourrait, sans dire quoi faire pour pouvoir. Chaque cas rend donc l'issue
 * correspondante — confirmer les produits, attendre la lecture, déposer des
 * factures — plutôt qu'un état.
 */
function Editer({
	etat,
	enCours,
	onEditer
}: {
	etat: {
		annee: string | null;
		motif: 'PRET' | 'DEJA_PRODUIT' | 'A_CONFIRMER' | 'EN_TRAITEMENT' | 'AUCUNE_FACTURE';
		produitsAConfirmer: number;
		diagnosticExistant: string | null;
	};
	enCours: boolean;
	onEditer: () => void;
}) {
	if (etat.motif === 'AUCUNE_FACTURE') return null;

	if (etat.motif === 'EN_TRAITEMENT') {
		return (
			<Bandeau icone={<LoaderCircleIcon size={16} className="animate-spin" />}>
				Nous lisons encore vos factures de {etat.annee}. Le bilan pourra être édité dès que
				c&rsquo;est terminé — cette page se met à jour toute seule.
			</Bandeau>
		);
	}

	if (etat.motif === 'A_CONFIRMER') {
		return (
			<Bandeau
				ton="alerte"
				icone={<CheckCheckIcon size={16} />}
				action={
					<Button as={Link} to="/app/confirmer" color="brand" variant="solid-fill">
						Confirmer
					</Button>
				}
			>
				{etat.produitsAConfirmer} produit{pluriel(etat.produitsAConfirmer)} attend
				{etat.produitsAConfirmer > 1 ? 'ent' : ''} encore votre confirmation. Un bilan édité
				maintenant ne porterait pas sur la totalité de vos achats.
			</Bandeau>
		);
	}

	if (etat.motif === 'DEJA_PRODUIT') {
		return (
			<Bandeau
				icone={<FileCheck2Icon size={16} />}
				action={
					etat.diagnosticExistant ? (
						// Le lien PORTE le bouton : `Button as={Link}` perd l'inférence
						// des paramètres de route de TanStack, et la rétablir demanderait
						// une assertion — c'est-à-dire éteindre la seule vérification qui
						// attrape un identifiant manquant à la compilation.
						<Link to="/app/diagnostic/$id" params={{ id: etat.diagnosticExistant }}>
							<Button color="brand" variant="solid-fill">
								Ouvrir le bilan
							</Button>
						</Link>
					) : null
				}
			>
				Le bilan {etat.annee} est édité. Pour en produire un nouveau — après avoir ajouté des
				factures ou corrigé un produit — déposez d&rsquo;abord vos nouvelles factures : le
				précédent restera consultable.
			</Bandeau>
		);
	}

	// PRÊT. La seule carte de l'écran qui appelle un geste, donc la seule en
	// aplat plein. L'avertissement sur l'immutabilité est ICI, juste au-dessus
	// du bouton, parce que c'est le seul moment où il concerne le gérant.
	return (
		<Surface
			outline
			color="brand"
			variant="solid-fill"
			className="rounded-cladd-2xl shadow-carte-levee"
			contentClassName="flex flex-wrap items-center justify-between gap-cladd-2xs p-cladd-2xs"
		>
			<div className="flex items-center gap-cladd-2xs">
				<span
					aria-hidden
					className="flex size-vignette-sm shrink-0 items-center justify-center rounded-cladd-sm bg-cladd-on-primary/15"
				>
					<FileCheck2Icon size={24} />
				</span>
				<div className="min-w-0">
					<p className="text-cladd-sm font-semibold">Votre bilan {etat.annee} est prêt</p>
					<p className="flex items-center gap-1.5 text-cladd-2xs opacity-85">
						<LockIcon size={12} className="shrink-0" />
						Il portera la date du jour et ne changera plus ensuite. C&rsquo;est ce qui en fait une
						pièce opposable — vous pourrez en éditer un nouveau après toute correction.
					</p>
				</div>
			</div>
			<Button
				variant="solid"
				color="neutral"
				loading={enCours}
				readOnly={enCours}
				onClick={onEditer}
			>
				Éditer le bilan {etat.annee}
			</Button>
		</Surface>
	);
}

