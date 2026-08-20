import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Chip } from '@cladd-ui/react';
import { PrinterIcon, TriangleAlertIcon } from 'lucide-react';
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
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule,
	euros,
	pourcent,
	FAMILLES
} from '../../ui';
import { Attestations, type Attestation } from '../../screens/diagnostic/attestations';

export const Route = createFileRoute('/app/diagnostic/$id')({ component: Diagnostic });

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

function Diagnostic() {
	const { id } = Route.useParams();
	const d = useQuery(api.egalim.diagnostics.obtenirDiagnostic, {
		diagnosticId: id as Id<'diagnostics'>
	});
	const changerStatut = useMutation(api.egalim.attestations.changerStatut);
	const marquerRemis = useMutation(api.egalim.diagnostics.marquerRemis);

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
				sousTitre={`${d.organizationName} · mesuré le ${dateMesure}`}
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
						<Button variant="gradient" onClick={() => window.print()}>
							<PrinterIcon />
							Imprimer
						</Button>
					</div>
				}
			/>

			<PageBody>
				<div className="flex flex-col gap-cladd-xs">
					<div className="grid gap-cladd-xs sm:grid-cols-2 lg:grid-cols-3">
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
								<h2 className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
									Où combler l&rsquo;écart
								</h2>
								<p className="mt-1 text-cladd-xs text-cladd-fg-soft">
									Les familles où il reste le plus d&rsquo;achats non durables, donc le plus de
									marge de manœuvre. La colonne de droite dit ce que vous gagneriez en basculant
									la famille entière.
								</p>
							</div>
							<Tableau legende="Familles où combler l'écart, par montant basculable">
								<TableauEntete>
									<TableauTitre>Famille</TableauTitre>
									<TableauTitre aDroite>Achats non durables</TableauTitre>
									<TableauTitre aDroite>Points si tout bascule</TableauTitre>
								</TableauEntete>
								<TableauCorps>
									{d.ouBasculer.map((o) => (
										<TableauLigne key={o.family}>
											<TableauCellule>{FAMILLES[o.family] ?? o.family}</TableauCellule>
											<TableauCellule aDroite chiffre>
												{euros(o.montantNonDurableHT)}
											</TableauCellule>
											<TableauCellule aDroite chiffre>
												+{Math.round(o.pointsSiTotalementBascule)}
											</TableauCellule>
										</TableauLigne>
									))}
								</TableauCorps>
							</Tableau>
						</section>
					) : null}

					<section className="flex flex-col gap-cladd-3xs">
						<h2 className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
							Par famille de produits
						</h2>
						<Tableau legende="Achats par famille de produits">
							<TableauEntete>
								<TableauTitre>Famille</TableauTitre>
								<TableauTitre aDroite>Achats HT</TableauTitre>
								<TableauTitre aDroite>Dont durable</TableauTitre>
								<TableauTitre aDroite>Dont bio</TableauTitre>
								<TableauTitre aDroite>Part durable</TableauTitre>
							</TableauEntete>
							<TableauCorps>
								{d.byFamily.map((f) => (
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
											{f.totalHT > 0 ? pourcent(f.durableHT / f.totalHT) : '—'}
										</TableauCellule>
									</TableauLigne>
								))}
							</TableauCorps>
						</Tableau>
					</section>

					<section className="flex flex-col gap-cladd-3xs">
						<h2 className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
							Par fournisseur
						</h2>
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
