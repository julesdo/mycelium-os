import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button, Toolbar, Segmented, SegmentedButton, Surface, Chip } from '@cladd-ui/react';
import { DownloadIcon, TriangleAlertIcon, ArrowRightIcon, CheckCheckIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import {
	Page,
	PageHeader,
	PageBody,
	Bandeau,
	SectionEcran,
	ChampCopiable,
	Illustration,
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule,
	euros,
	pourcent,
	pluriel,
	FAMILLES,
	type Famille
} from '../../ui';

export const Route = createFileRoute('/app/declaration')({ component: Declaration });

/**
 * Ce que le formulaire attend : des chiffres bruts, point décimal, sans
 * symbole ni séparateur de milliers. Ce n'est pas ce qu'on affiche, et c'est
 * exactement pour ça que le bouton copier existe.
 */
const brut = (montant: number): string => montant.toFixed(2);

/**
 * L'écran de télédéclaration.
 *
 * C'EST LE LIVRABLE. Le gérant ne paie pas pour connaître son taux — il paie
 * pour remplir sa déclaration avant le 31 mars. Tout le reste du produit
 * travaille à rendre cet écran juste ; celui-ci est le seul qu'il ouvrira ce
 * jour-là, la téléprocédure ouverte dans l'onglet d'à côté.
 *
 * D'où sa forme : les trois montants que le formulaire demande, en gros, avec
 * un bouton pour les copier au format que le formulaire attend. Puis le détail,
 * pour la déclaration complète. Puis un CSV, pour les archives et le comptable.
 *
 * ET IL DIT CE QU'IL NE COUVRE PAS, en haut, avant les chiffres. Une
 * déclaration établie sur des achats partiellement mesurés reste défendable si
 * l'on sait lesquels ; elle ne l'est plus si on l'ignore. C'est la différence
 * entre un outil de mesure et un outil qui rassure.
 */
function Declaration() {
	const annees = useQuery(api.egalim.pilotage.listerAnnees, {});
	const [choisie, setChoisie] = useState<string | null>(null);
	const annee = choisie ?? annees?.[0] ?? String(new Date().getFullYear() - 1);

	const r = useQuery(api.egalim.declaration.recapitulatif, { annee });

	function telecharger() {
		if (!r) return;
		const lignes: string[][] = [
			['Établissement', r.etablissement.nom],
			['SIRET', r.etablissement.siret ?? ''],
			['Exercice', r.annee],
			[],
			['Déclaration simplifiée', 'Montant HT (€)'],
			['Total des achats alimentaires', brut(r.totalAlimentaireHT)],
			['Dont bio', brut(r.bioHT)],
			['Dont durable et de qualité, hors bio', brut(r.durableHorsBioHT)],
			[],
			['Taux', 'Mesuré', 'Seuil légal'],
			['Durable et de qualité', pourcent(r.taux.durable), pourcent(r.seuils.durable)],
			['Biologique', pourcent(r.taux.bio), pourcent(r.seuils.bio)],
			[
				'Viande et poisson durables',
				pourcent(r.taux.viandePoissonDurable),
				pourcent(r.seuils.viandePoissonDurable)
			],
			[],
			['Détail par catégorie', 'Montant HT (€)'],
			...r.parCategorie.map((c) => [c.libelle, brut(c.montantHT)]),
			[],
			['Détail par famille', 'Total HT (€)', 'Dont bio (€)', 'Dont durable hors bio (€)'],
			...r.parFamille.map((f) => [
				FAMILLES[f.family as Famille],
				brut(f.totalHT),
				brut(f.bioHT),
				brut(f.durableHorsBioHT)
			]),
			[],
			['Non couvert par la mesure', 'Montant HT (€)'],
			['Achats non classés', brut(r.nonClasseHT)],
			['Achats en attente de confirmation', brut(r.aConfirmerHT)]
		];

		// Point-virgule et BOM : sans les deux, Excel en configuration française
		// ouvre le fichier en une seule colonne, et le comptable renvoie le
		// fichier en disant qu'il est cassé.
		const csv =
			'﻿' +
			lignes
				.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
				.join('\r\n');

		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
		const lien = document.createElement('a');
		lien.href = url;
		lien.download = `declaration-egalim-${r.annee}.csv`;
		lien.click();
		URL.revokeObjectURL(url);
	}

	return (
		<Page>
			<PageHeader
				titre="Votre déclaration"
				sousTitre={`Exercice ${annee}, à déclarer sur « ma cantine » avant le 31 mars.`}
				actions={
					<div className="flex items-center gap-cladd-3xs">
						{annees && annees.length > 1 ? (
							<Toolbar>
								<Segmented activeColor="neutral" activeVariant="solid">
									{annees.map((a) => (
										<SegmentedButton key={a} active={a === annee} onClick={() => setChoisie(a)}>
											{a}
										</SegmentedButton>
									))}
								</Segmented>
							</Toolbar>
						) : null}
						<Button color="brand" variant="solid-fill" onClick={telecharger} disabled={!r}>
							<DownloadIcon />
							Télécharger
						</Button>
					</div>
				}
			/>

			<PageBody>
				{r === undefined ? (
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement de votre récapitulatif…</p>
				) : (
					<div className="mx-auto flex max-w-4xl flex-col gap-cladd-2xs">
						{/* CE QUI N'EST PAS COUVERT, avant les chiffres et jamais après.
						    Un récapitulatif qui montre trois montants puis mentionne en
						    bas de page qu'il en manque un quart n'a pas prévenu : il
						    s'est couvert. */}
						{!r.pret ? (
							<Bandeau ton="alerte" icone={<TriangleAlertIcon size={16} />}>
								Ces chiffres ne portent pas sur la totalité de vos achats.
								{r.aConfirmerHT > 0 ? (
									<>
										{' '}
										<span className="font-semibold tabular-nums">
											{euros(r.aConfirmerHT)}
										</span>{' '}
										attendent encore votre confirmation.
									</>
								) : null}
								{r.nonClasseHT > 0 ? (
									<>
										{' '}
										<span className="font-semibold tabular-nums">{euros(r.nonClasseHT)}</span>{' '}
										n&rsquo;ont pas pu être classés et ne comptent dans aucun taux.
									</>
								) : null}
								{r.facturesIllisibles > 0 ? (
									<>
										{' '}
										{r.facturesIllisibles} fichier{pluriel(r.facturesIllisibles)} n&rsquo;
										{pluriel(r.facturesIllisibles) ? 'ont' : 'a'} pas pu être lu
										{pluriel(r.facturesIllisibles)}.
									</>
								) : null}
							</Bandeau>
						) : (
							<Bandeau icone={<CheckCheckIcon size={16} />}>
								Tous vos achats de {annee} sont lus, classés et confirmés. Ces chiffres portent
								sur la totalité de l&rsquo;exercice.
							</Bandeau>
						)}

						<SectionEcran
							titre="Déclaration simplifiée"
							legende="Les trois montants que demande le formulaire. Le bouton copie le chiffre brut, sans symbole ni espace — c'est ce que le champ attend."
						>
							<div className="flex flex-col gap-cladd-3xs">
								<ChampCopiable
									majeur
									etiquette="Total des achats alimentaires HT"
									affichage={euros(r.totalAlimentaireHT)}
									valeur={brut(r.totalAlimentaireHT)}
								/>
								<div className="grid gap-cladd-3xs sm:grid-cols-2">
									<ChampCopiable
										majeur
										etiquette="Dont biologique"
										affichage={euros(r.bioHT)}
										valeur={brut(r.bioHT)}
										aide={`${pourcent(r.taux.bio)} des achats · seuil ${pourcent(r.seuils.bio)}`}
									/>
									<ChampCopiable
										majeur
										etiquette="Dont durable et de qualité, hors bio"
										affichage={euros(r.durableHorsBioHT)}
										valeur={brut(r.durableHorsBioHT)}
										aide={`Bio et durable réunis : ${pourcent(r.taux.durable)} · seuil ${pourcent(
											r.seuils.durable
										)}`}
									/>
								</div>
							</div>

							{/* La promesse qu'on ne fait PAS. Un fichier présenté comme
							    importable qui ne l'est pas ferait rater une échéance
							    réglementaire — et c'est le genre de promesse qu'on ne
							    rattrape jamais. */}
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
								Ces montants se recopient dans la téléprocédure, champ par champ. Le fichier
								téléchargé est un récapitulatif pour vos archives et votre comptable&nbsp;: ce
								n&rsquo;est pas un fichier d&rsquo;import officiel, et nous ne prétendons pas
								qu&rsquo;il en soit un.
							</p>
						</SectionEcran>

						{r.parCategorie.length > 0 ? (
							<SectionEcran
								titre="Déclaration détaillée"
								legende="Pour le mode complet du formulaire. Un produit portant plusieurs mentions n'apparaît qu'une fois, dans la plus forte — sans quoi le total dépasserait vos achats."
							>
								<Tableau legende="Achats par catégorie du barème">
									<TableauEntete>
										<TableauTitre>Catégorie</TableauTitre>
										<TableauTitre aDroite>Montant HT</TableauTitre>
										<TableauTitre aDroite>Part des achats</TableauTitre>
									</TableauEntete>
									<TableauCorps>
										{r.parCategorie.map((c) => (
											<TableauLigne key={c.label}>
												<TableauCellule>{c.libelle}</TableauCellule>
												<TableauCellule aDroite chiffre>
													{euros(c.montantHT)}
												</TableauCellule>
												<TableauCellule aDroite chiffre>
													{r.totalAlimentaireHT > 0
														? pourcent(c.montantHT / r.totalAlimentaireHT)
														: '—'}
												</TableauCellule>
											</TableauLigne>
										))}
									</TableauCorps>
								</Tableau>
							</SectionEcran>
						) : null}

						{r.parFamille.length > 0 ? (
							<SectionEcran
								titre="Par famille de produits"
								legende="La ventilation demandée par le mode complet, famille par famille."
							>
								<div className="flex flex-col gap-cladd-3xs">
									{r.parFamille.map((f) => (
										<Surface
											key={f.family}
											outline
											className="rounded-cladd-lg"
											contentClassName="flex flex-wrap items-center gap-cladd-3xs p-cladd-3xs"
										>
											<Illustration libelle="" famille={f.family as Famille} taille="sm" />
											<span className="min-w-0 flex-1 text-cladd-xs font-semibold">
												{FAMILLES[f.family as Famille]}
											</span>
											<div className="flex shrink-0 items-center gap-cladd-3xs">
												<Chip size="sm" color="neutral">
													{euros(f.bioHT)} bio
												</Chip>
												<Chip size="sm" color="neutral">
													{euros(f.durableHorsBioHT)} durable
												</Chip>
												<span className="w-28 text-right text-cladd-xs font-bold tabular-nums">
													{euros(f.totalHT)}
												</span>
											</div>
										</Surface>
									))}
								</div>
							</SectionEcran>
						) : null}

						{/* Les mesures figées restent atteignables, hors navigation.
						    Un diagnostic est une PREUVE datée qu'on ressort en cas de
						    contrôle, pas un écran qu'on ouvre chaque semaine : le mettre
						    dans la barre lui donnerait un poids qu'il n'a que deux fois
						    par an, au détriment des quatre écrans du parcours. */}
						<p className="text-cladd-2xs text-cladd-fg-softer">
							Une fois déclaré, gardez la trace : vos{' '}
							<Link to="/app/diagnostics" className="font-medium underline underline-offset-2">
								mesures figées
							</Link>{' '}
							datent chaque chiffre et conservent la justification de chaque produit. C&rsquo;est
							ce qu&rsquo;on présente en cas de contrôle.
						</p>

						{!r.pret ? (
							<Surface
								outline
								color="brand"
								variant="solid-fill"
								className="rounded-cladd-2xl shadow-carte-levee"
								contentClassName="flex flex-wrap items-center justify-between gap-cladd-2xs p-cladd-2xs"
							>
								<p className="text-cladd-sm font-semibold">
									Complétez la mesure avant de déclarer.
								</p>
								<Button
									as={Link}
									to={r.aConfirmerHT > 0 ? '/app/confirmer' : '/app/factures'}
									variant="solid"
									color="neutral"
								>
									{r.aConfirmerHT > 0 ? 'Confirmer les produits' : 'Voir les factures'}
									<ArrowRightIcon />
								</Button>
							</Surface>
						) : null}
					</div>
				)}
			</PageBody>
		</Page>
	);
}
