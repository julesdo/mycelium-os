import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button, Toolbar, Segmented, SegmentedButton, SectionTitle } from '@cladd-ui/react';
import { CameraIcon, CheckCheckIcon, TriangleAlertIcon, LoaderCircleIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	TauxEGalim,
	Bandeau,
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule,
	euros,
	pourcent,
	pluriel,
	FAMILLES
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
				titre="Tableau de bord"
				sousTitre={`Vos trois taux EGalim sur l'année ${annee}.`}
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
					<div className="flex flex-col gap-cladd-xs">
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
									<Button as={Link} to="/app/factures" variant="gradient">
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
								titre="Commençons par vos factures."
								explication="Douze mois d'achats suffisent à calculer vos trois taux. Vous n'avez rien d'autre à préparer."
								etapes={[
									"Déposez vos factures. Un export comptable en CSV va le plus vite ; à défaut, les PDF et les photos conviennent.",
									'Nous lisons et classons chaque ligne contre le barème EGalim.',
									"Vous confirmez la viande, le poisson et ce dont nous doutons. Vos taux s'affichent."
								]}
								action={
									<Button as={Link} to="/app/factures" color="brand" variant="solid-fill">
										<CameraIcon />
										Déposer mes factures
									</Button>
								}
							/>
						) : (
							<>
								<div className="grid gap-cladd-xs sm:grid-cols-2 lg:grid-cols-3">
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

								{/*
								  Le taux affiché plus haut compte les classifications
								  automatiques : c'est ce qui le rend utile tout de suite. On
								  dit donc ce qu'elles pèsent, et on le dit en part du MONTANT,
								  parce que « 37 libellés » ne dirait pas s'il s'agit de 200 €
								  ou de 40 000 €.
								*/}
								{bord.partNonConfirmee > 0 ? (
									<Bandeau
										icone={<CheckCheckIcon size={16} />}
										action={
											<Button as={Link} to="/app/confirmer" color="brand" variant="solid-fill">
												Confirmer
											</Button>
										}
									>
										<span className="font-semibold tabular-nums">
											{pourcent(bord.partNonConfirmee)}
										</span>{' '}
										de vos achats reposent sur une classification non confirmée.{' '}
										<span className="text-cladd-fg-soft">
											{bord.libellesAConfirmer} produit{pluriel(bord.libellesAConfirmer)} à
											confirmer, <span className="tabular-nums">{euros(bord.montantAConfirmer)}</span>{' '}
											en jeu.
										</span>
									</Bandeau>
								) : null}

								{bord.parFamille.length > 0 ? (
									<section className="flex flex-col gap-cladd-3xs">
										<SectionTitle>D&rsquo;où viennent vos achats</SectionTitle>
										<Tableau legende="Répartition des achats par famille de produits">
											<TableauEntete>
												<TableauTitre>Famille</TableauTitre>
												<TableauTitre aDroite>Achats HT</TableauTitre>
												<TableauTitre aDroite>Dont durable</TableauTitre>
												<TableauTitre aDroite>Dont bio</TableauTitre>
												<TableauTitre aDroite>Part durable</TableauTitre>
											</TableauEntete>
											<TableauCorps>
												{bord.parFamille.map((f) => {
													// Borné entre 0 et 1 : une famille dont les avoirs
													// dépassent les achats rendrait une part négative.
													const part =
														f.totalHT > 0
															? Math.min(1, Math.max(0, f.durableHT / f.totalHT))
															: 0;
													return (
														<TableauLigne key={f.family}>
															<TableauCellule>{FAMILLES[f.family] ?? f.family}</TableauCellule>
															<TableauCellule aDroite chiffre>
																{euros(f.totalHT)}
															</TableauCellule>
															<TableauCellule aDroite chiffre>
																{euros(f.durableHT)}
															</TableauCellule>
															<TableauCellule aDroite chiffre>
																{euros(f.bioHT)}
															</TableauCellule>
															<TableauCellule aDroite chiffre>
																{pourcent(part)}
															</TableauCellule>
														</TableauLigne>
													);
												})}
											</TableauCorps>
										</Tableau>
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
