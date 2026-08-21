import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button, Toolbar, Segmented, SegmentedButton, SectionTitle, Surface } from '@cladd-ui/react';
import {
	CameraIcon,
	CheckCheckIcon,
	TriangleAlertIcon,
	LoaderCircleIcon,
	ArrowRightIcon
} from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	TauxEGalim,
	Bandeau,
	Repartition,
	euros,
	pourcent,
	pluriel,
	type Famille
} from '../../ui';

export const Route = createFileRoute('/app/')({ component: Pilotage });

function Pilotage() {
	const annees = useQuery(api.egalim.pilotage.listerAnnees, {});
	const [choisie, setChoisie] = useState<string | null>(null);

	// L'exercice affiché : à défaut de choix, le plus récent où la cantine a des
	// achats ; à défaut d'achats, l'année civile écoulée, celle qui se déclare
	// avant le 31 mars.
	const annee = choisie ?? annees?.[0] ?? String(new Date().getFullYear() - 1);
	const bord = useQuery(api.egalim.pilotage.tableauDeBord, { annee });

	return (
		<Page>
			<PageHeader
				titre="Vos taux EGalim"
				sousTitre={`Exercice ${annee}, à déclarer avant le 31 mars.`}
				actions={
					annees && annees.length > 1 ? (
						// Un sélecteur d'exercice est le cas d'école du `Segmented` : un
						// choix unique dans un petit ensemble. La version précédente
						// l'assemblait à partir de `Button`, en portant l'état actif à la
						// main via `variant` et `color`. `Segmented` le porte par contexte,
						// et `Toolbar` lui donne sa taille et son logement.
						<Toolbar>
							<Segmented>
								{annees.map((a) => (
									<SegmentedButton key={a} active={a === annee} onClick={() => setChoisie(a)}>
										{a}
									</SegmentedButton>
								))}
							</Segmented>
						</Toolbar>
					) : null
				}
			/>

			<PageBody>
				{bord === undefined ? (
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement de vos taux…</p>
				) : (
					<div className="flex flex-col gap-cladd-2xs">
						{/*
						  L'état du dépôt est TRANSVERSE aux exercices : il décrit le
						  pipeline de lecture, pas la mesure d'une année. On le formule
						  donc sans jamais le rattacher à l'onglet ouvert, sinon le gérant
						  croirait qu'un fichier illisible ne concerne que cette année-là.
						*/}
						{bord.documentsEnEchec > 0 ? (
							<Bandeau
								ton="alerte"
								icone={<TriangleAlertIcon size={16} />}
								action={
									<Button as={Link} to="/app/factures">
										Voir lesquels
									</Button>
								}
							>
								{bord.documentsEnEchec} fichier{pluriel(bord.documentsEnEchec)} n&rsquo;a pas pu
								être lu, tous exercices confondus.
							</Bandeau>
						) : null}

						{bord.documentsEnCours > 0 ? (
							<Bandeau icone={<LoaderCircleIcon size={16} className="animate-spin" />}>
								{bord.documentsEnCours} fichier{pluriel(bord.documentsEnCours)} en cours de
								lecture. Vos taux se mettront à jour d&rsquo;eux-mêmes.
							</Bandeau>
						) : null}

						{!bord.aDesDonnees ? (
							<EmptyState
								illustration="🧾"
								titre="Commençons par vos factures."
								explication="Douze mois d'achats suffisent à calculer vos trois taux. Vous n'avez rien d'autre à préparer, et rien à saisir."
								etapes={[
									'Déposez vos factures, ou photographiez-les. Un export comptable en CSV va le plus vite ; les PDF et les photos conviennent aussi.',
									'Nous lisons chaque ligne et la classons contre le barème EGalim, en vous montrant le travail au fur et à mesure.',
									"Vous confirmez la viande, le poisson et ce dont nous doutons. Vos taux s'affichent."
								]}
								action={
									<Button as={Link} to="/app/factures" color="brand" variant="solid-fill" size="lg">
										<CameraIcon />
										Déposer mes factures
									</Button>
								}
							/>
						) : (
							<>
								{/* LA PROCHAINE CHOSE À FAIRE, avant les chiffres.
								    Un tableau de bord qui n'affiche qu'un état laisse le
								    gérant chercher quoi faire ; celui-ci le dit, une fois,
								    en haut, et ne l'affiche pas quand il n'y a rien. */}
								{bord.partNonConfirmee > 0 ? (
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
												<CheckCheckIcon size={24} />
											</span>
											<div className="min-w-0">
												<p className="text-cladd-sm font-semibold">
													{bord.libellesAConfirmer} produit
													{pluriel(bord.libellesAConfirmer)} à confirmer
												</p>
												<p className="text-cladd-2xs opacity-85">
													<span className="tabular-nums">
														{pourcent(bord.partNonConfirmee)}
													</span>{' '}
													de vos achats reposent encore sur une classification que vous
													n&rsquo;avez pas relue, soit{' '}
													<span className="tabular-nums">
														{euros(bord.montantAConfirmer)}
													</span>
													.
												</p>
											</div>
										</div>
										<Button as={Link} to="/app/confirmer" variant="solid" color="neutral">
											Confirmer
											<ArrowRightIcon />
										</Button>
									</Surface>
								) : null}

								<div className="grid gap-cladd-2xs lg:grid-cols-3">
									<TauxEGalim
										titre="Durable et de qualité"
										mesure={bord.ratios.durable}
										seuil={bord.seuils.durable}
										ecartEuros={bord.gapEuros.toDurable50}
									/>
									<TauxEGalim
										titre="Biologique"
										mesure={bord.ratios.bio}
										seuil={bord.seuils.bio}
										ecartEuros={bord.gapEuros.toBio20}
									/>
									<TauxEGalim
										titre="Viande et poisson"
										mesure={bord.ratios.meatFishDurable}
										seuil={bord.seuils.viandePoissonDurable}
										ecartEuros={bord.gapEuros.toMeatFish60}
									/>
								</div>

								<p className="text-cladd-2xs text-cladd-fg-softer">
									Calculés en valeur d&rsquo;achat HT sur{' '}
									<span className="tabular-nums">{euros(bord.ratios.totalFoodHT)}</span>{' '}
									d&rsquo;achats alimentaires en {annee}.
								</p>

								{bord.parFamille.length > 0 ? (
									<section className="flex flex-col gap-cladd-3xs">
										<SectionTitle>D&rsquo;où viennent vos achats</SectionTitle>
										<Repartition
											lignes={bord.parFamille.map((f) => ({
												family: f.family as Famille,
												totalHT: f.totalHT,
												durableHT: f.durableHT,
												bioHT: f.bioHT
											}))}
										/>
									</section>
								) : null}
							</>
						)}
					</div>
				)}
			</PageBody>
		</Page>
	);
}
