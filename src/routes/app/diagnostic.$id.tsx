import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Chip, SectionTitle } from '@cladd-ui/react';
import { DownloadIcon, TriangleAlertIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	MENTION_RESPONSABILITE,
	MENTION_FIGE,
	MENTION_OBLIGATION_DE_MOYENS
} from '../../lib/convex/egalim/mentions';
import {
	Page,
	PageHeader,
	PageBody,
	TauxEGalim,
	Bandeau,
	Repartition,
	OuAgir,
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule,
	euros,
	pourcent,
	type Famille
} from '../../ui';
import { Attestations, type Attestation } from '../../screens/diagnostic/attestations';
import { Declaration, chiffresDepuisBilan } from '../../screens/diagnostic/declaration';
import { telechargerDiagnostic } from '../../screens/diagnostic/telecharger';

export const Route = createFileRoute('/app/diagnostic/$id')({ component: Diagnostic });

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

function Diagnostic() {
	const { id } = Route.useParams();
	const d = useQuery(api.egalim.diagnostics.obtenirDiagnostic, {
		diagnosticId: id as Id<'diagnostics'>
	});
	const changerStatut = useMutation(api.egalim.attestations.changerStatut);
	const marquerRemis = useMutation(api.egalim.diagnostics.marquerRemis);
	const [enPreparation, setEnPreparation] = useState(false);

	if (d === undefined) {
		return (
			<Page>
				<PageHeader titre="Diagnostic" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement du diagnostic…</p>
				</PageBody>
			</Page>
		);
	}

	if (d === null) {
		return (
			<Page>
				<PageHeader titre="Diagnostic" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">
						Ce diagnostic n&rsquo;existe pas, ou il appartient à un autre établissement.
					</p>
				</PageBody>
			</Page>
		);
	}

	const dateMesure = DATE.format(new Date(d.computedAt));

	return (
		<Page>
			<PageHeader
				titre={`Diagnostic EGalim ${d.periodStart.slice(0, 4)}`}
				sousTitre={`${d.organizationName} · édité le ${dateMesure}, et inchangé depuis`}
				actions={
					<div className="flex items-center gap-cladd-3xs">
						<Chip size="sm">{d.status === 'DELIVERED' ? 'Remis' : 'Brouillon'}</Chip>
						{d.status === 'DRAFT' ? (
							<Button
								color="brand"
								variant="solid-fill"
								onClick={() =>
									void marquerRemis({ diagnosticId: id as Id<'diagnostics'> })
								}
							>
								Marquer remis
							</Button>
						) : null}
						{/* Un vrai document, pas une capture d'écran.
						    `window.print()` imprimait l'APPLICATION — barre de navigation,
						    boutons, plus l'en-tête que le navigateur ajoute de lui-même,
						    « localhost:20173 » et la date du jour en haut de chaque page.
						    Or ce fichier est ce qu'un gérant transmet à son directeur et
						    présente en cas de contrôle. */}
						<Button
							variant="gradient"
							loading={enPreparation}
							readOnly={enPreparation}
							onClick={() => {
								setEnPreparation(true);
								void telechargerDiagnostic({
									organizationName: d.organizationName,
									siret: d.siret,
									periodStart: d.periodStart,
									periodEnd: d.periodEnd,
									computedAt: d.computedAt,
									classifierVersion: d.classifierVersion,
									statut: d.status,
									ratios: d.ratios,
									seuils: d.seuils,
									gapEuros: d.gapEuros,
									montantNonMesureHT: d.montantNonMesureHT,
									byFamily: d.byFamily,
									bySupplier: d.bySupplier,
									ouBasculer: d.ouBasculer,
									attestations: d.attestations,
									mentions: [
										MENTION_OBLIGATION_DE_MOYENS,
										MENTION_RESPONSABILITE,
										MENTION_FIGE(dateMesure)
									]
								}).finally(() => setEnPreparation(false));
							}}
						>
							<DownloadIcon />
							Télécharger le PDF
						</Button>
					</div>
				}
			/>

			<PageBody>
				<div className="flex flex-col gap-cladd-2xs">
					<div className="grid gap-cladd-2xs lg:grid-cols-3">
						<TauxEGalim
							titre="Durable et de qualité"
							mesure={d.ratios.durable}
							seuil={d.seuils.durable}
							ecartEuros={d.gapEuros.toDurable50}
						/>
						<TauxEGalim
							titre="Biologique"
							mesure={d.ratios.bio}
							seuil={d.seuils.bio}
							ecartEuros={d.gapEuros.toBio20}
						/>
						<TauxEGalim
							titre="Viande et poisson"
							mesure={d.ratios.meatFishDurable}
							seuil={d.seuils.viandePoissonDurable}
							ecartEuros={d.gapEuros.toMeatFish60}
						/>
					</div>

					<p className="text-cladd-2xs text-cladd-fg-softer">
						Calculés en valeur d&rsquo;achat HT sur{' '}
						<span className="tabular-nums">{euros(d.ratios.totalFoodHT)}</span> d&rsquo;achats
						alimentaires, du {d.periodStart} au {d.periodEnd}.
					</p>

					<Declaration
						c={chiffresDepuisBilan({
							periodStart: d.periodStart,
							organizationName: d.organizationName,
							siret: d.siret,
							dateMesure,
							ratios: d.ratios,
							seuils: d.seuils,
							byFamily: d.byFamily
						})}
					/>

					{d.montantNonMesureHT > 0 ? (
						<Bandeau ton="alerte" icone={<TriangleAlertIcon size={16} />}>
							<span className="tabular-nums">{euros(d.montantNonMesureHT)}</span>{' '}
							d&rsquo;achats n&rsquo;ont pas pu être classés et ne comptent dans aucun taux. Les
							confirmer relèverait vos trois chiffres.
						</Bandeau>
					) : null}

					<Attestations
						attestations={d.attestations as Attestation[]}
						nomEtablissement={d.organizationName}
						periodeDebut={d.periodStart}
						periodeFin={d.periodEnd}
						onChangerStatut={(attestationId, statut) =>
							void changerStatut({
								attestationId: attestationId as Id<'attestationRequests'>,
								statut
							})
						}
					/>

					{d.ouBasculer.length > 0 ? (
						<section className="flex flex-col gap-cladd-3xs">
							<div>
								<SectionTitle>Où combler l&rsquo;écart</SectionTitle>
								<p className="mt-1 text-cladd-xs text-cladd-fg-soft">
									Les familles où il reste le plus d&rsquo;achats non durables, donc le plus de
									marge de manœuvre. Le chiffre de droite est un majorant : ce que vous
									gagneriez en basculant la famille ENTIÈRE, ce qui n&rsquo;arrive jamais. Il
									sert à classer les familles entre elles, pas à promettre un résultat.
								</p>
							</div>
							<OuAgir
								pistes={d.ouBasculer.map((o) => ({
									family: o.family as Famille,
									montantNonDurableHT: o.montantNonDurableHT,
									pointsSiTotalementBascule: o.pointsSiTotalementBascule
								}))}
							/>
						</section>
					) : null}

					<section className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Par famille de produits</SectionTitle>
						<Repartition
							lignes={d.byFamily.map((f) => ({
								family: f.family as Famille,
								totalHT: f.totalHT,
								durableHT: f.durableHT,
								bioHT: f.bioHT
							}))}
						/>
					</section>

					<section className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Par fournisseur</SectionTitle>
						<Tableau legende="Achats par fournisseur">
							<TableauEntete>
								<TableauTitre>Fournisseur</TableauTitre>
								<TableauTitre aDroite>Achats HT</TableauTitre>
								<TableauTitre aDroite>Dont durable</TableauTitre>
								<TableauTitre aDroite>Part durable</TableauTitre>
							</TableauEntete>
							<TableauCorps>
								{d.bySupplier.map((s) => (
									<TableauLigne key={s.supplierName}>
										<TableauCellule>{s.supplierName}</TableauCellule>
										<TableauCellule aDroite chiffre>
											{euros(s.totalHT)}
										</TableauCellule>
										<TableauCellule aDroite chiffre>
											{euros(s.durableHT)}
										</TableauCellule>
										<TableauCellule aDroite chiffre>
											{s.totalHT > 0 ? pourcent(s.durableHT / s.totalHT) : '—'}
										</TableauCellule>
									</TableauLigne>
								))}
							</TableauCorps>
						</Tableau>
					</section>

					{/*
					  Les mentions obligatoires.

					  Elles viennent de egalim/mentions.ts, où elles sont du code
					  versionné, relu et couvert par un test. Les réécrire ici en clair
					  serait exactement le geste qui a fait disparaître la ligne rouge la
					  dernière fois : une phrase de gabarit se modifie sans revue.
					*/}
					<footer className="flex flex-col gap-1 border-t border-cladd-outline pt-cladd-xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<p>{MENTION_OBLIGATION_DE_MOYENS}</p>
						<p>{MENTION_RESPONSABILITE}</p>
						<p>{MENTION_FIGE(dateMesure)}</p>
						<p className="text-cladd-3xs text-cladd-fg-softer">
							Barème appliqué : version {d.classifierVersion}.
						</p>
					</footer>
				</div>
			</PageBody>
		</Page>
	);
}
