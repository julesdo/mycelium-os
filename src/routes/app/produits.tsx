import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import {
	Button,
	Surface,
	SearchField,
	Toolbar,
	Segmented,
	SegmentedButton,
	Chip
} from '@cladd-ui/react';
import { CameraIcon, PencilIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	Bandeau,
	Illustration,
	Verdict,
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule,
	euros,
	pluriel,
	FAMILLES,
	type Famille
} from '../../ui';
import { FeuilleCorrection, type Decision } from '../../screens/confirmer/correction';

export const Route = createFileRoute('/app/produits')({
	// `q` arrive du champ de recherche de la barre : la recherche est une
	// ADRESSE, pas un état local. Un gérant qui trouve enfin son emmental doit
	// pouvoir envoyer le lien à son directeur, et le retrouver au rechargement.
	// Rendu FACULTATIF : une recherche vide n'a pas à figurer dans l'URL, et
	// surtout, un `q` obligatoire forcerait chaque lien vers cet écran — depuis
	// la barre, depuis une facture — à le passer explicitement. Un paramètre
	// qu'on doit répéter partout finit par être oublié quelque part.
	validateSearch: (search: Record<string, unknown>) =>
		typeof search.q === 'string' && search.q !== '' ? { q: search.q } : {},
	component: Produits
});

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

/**
 * Le catalogue des produits.
 *
 * CE QU'IL RÉPARE. Un produit ne se voyait qu'une fois, dans la file de
 * confirmation, et disparaissait ensuite — alors qu'il continue de peser sur
 * les trois taux toute l'année. Un gérant qui s'aperçoit en juin qu'il a validé
 * un emmental « hors barème » alors qu'il est AOP n'avait aucun chemin pour
 * revenir dessus. C'est un défaut d'auditabilité autant que d'ergonomie : une
 * mesure qu'on ne peut pas reprendre n'est pas défendable, elle est subie.
 *
 * L'écran répond à trois questions, et à elles seules : qu'est-ce que j'achète,
 * qu'en avez-vous fait, et comment je le corrige. Il est donc trié par montant
 * — ce qui pèse sur le taux d'abord — cherchable, et chaque carte s'ouvre sur
 * le détail des lignes réelles avant le formulaire de reclassement.
 */
function Produits() {
	const { q = '' } = Route.useSearch();
	const navigate = Route.useNavigate();

	const annees = useQuery(api.egalim.pilotage.listerAnnees, {});
	const [choisie, setChoisie] = useState<string | null>(null);
	const annee = choisie ?? annees?.[0] ?? String(new Date().getFullYear() - 1);

	const [aReclasser, setAReclasser] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	const corriger = useMutation(api.egalim.confirmation.corriger);

	const resultat = useQuery(api.egalim.produits.listerProduits, {
		annee,
		recherche: q || undefined
	});

	const detail = useQuery(
		api.egalim.produits.obtenirProduit,
		aReclasser ? { normalizedLabel: aReclasser, annee } : 'skip'
	);

	async function enregistrer(d: Decision) {
		if (!aReclasser) return;
		setEnCours(true);
		setErreur(null);
		try {
			await corriger({
				normalizedLabel: aReclasser,
				isFood: d.isFood,
				family: d.family as never,
				qualifyingLabels: d.qualifyingLabels as never,
				justification: d.justification
			});
			setAReclasser(null);
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: "Cette classification n'a pas pu être enregistrée."
			);
		} finally {
			setEnCours(false);
		}
	}

	const produits = resultat?.produits ?? [];

	return (
		<Page>
			<PageHeader
				titre="Vos produits"
				sousTitre={
					resultat
						? `${resultat.total} produit${pluriel(resultat.total)} distinct${pluriel(
								resultat.total
							)} sur l'exercice ${annee}, ${euros(resultat.montantTotalHT)} d'achats.`
						: `Tout ce que vous achetez sur l'exercice ${annee}.`
				}
				actions={
					annees && annees.length > 1 ? (
						<Toolbar>
							<Segmented activeColor="neutral" activeVariant="solid">
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
				<div className="flex flex-col gap-cladd-2xs">
					{erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}

					<SearchField
						size="lg"
						value={q}
						onChange={(valeur) =>
							void navigate({ search: valeur ? { q: valeur } : {}, replace: true })
						}
						placeholder="Rechercher un produit — « carotte », « cabillaud », « emmental »…"
					/>

					{resultat === undefined ? (
						<p className="text-cladd-xs text-cladd-fg-soft">Chargement de vos produits…</p>
					) : produits.length === 0 ? (
						q ? (
							<EmptyState
								illustration="🔍"
								titre={`Rien ne correspond à « ${q} ».`}
								explication="Essayez un mot plus court, ou le nom tel qu'il figure sur la facture. La recherche porte sur le libellé du fournisseur, pas sur le nom courant du produit."
							/>
						) : (
							<EmptyState
								illustration="🧾"
								titre="Aucun produit sur cet exercice."
								explication="Vos produits apparaissent ici dès que vos factures sont lues. Chacun garde son libellé d'origine, sa classification et sa justification."
								action={
									<Button
										as={Link}
										to="/app/factures"
										color="brand"
										variant="solid-fill"
										size="lg"
									>
										<CameraIcon />
										Déposer des factures
									</Button>
								}
							/>
						)
					) : (
						<>
							{resultat.tronque ? (
								<Bandeau>
									{resultat.total} produits correspondent. Les 200 plus lourds sont affichés —
									affinez la recherche pour voir les autres.
								</Bandeau>
							) : null}

							<div className="grid gap-cladd-2xs md:grid-cols-2 2xl:grid-cols-3">
								{produits.map((p) => (
									<Surface
										key={p.normalizedLabel}
										outline
										hoverable
										clickable
										as="button"
										type="button"
										onClick={() => setAReclasser(p.normalizedLabel)}
										className="rounded-cladd-2xl text-left shadow-carte"
										contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
									>
										<div className="flex items-start gap-cladd-3xs">
											<Illustration
												libelle={p.rawLabelExemple}
												famille={p.family}
												estAlimentaire={p.isFood}
												taille="sm"
											/>
											<div className="min-w-0 flex-1">
												<span className="block text-cladd-xs leading-tight font-semibold break-words">
													{p.rawLabelExemple}
												</span>
												<span className="text-cladd-3xs text-cladd-fg-softer">
													{p.occurrences} ligne{pluriel(p.occurrences)}
													{p.family ? ` · ${FAMILLES[p.family]}` : ''}
												</span>
											</div>
											<span className="shrink-0 text-cladd-sm font-bold tabular-nums">
												{euros(p.montantHT)}
											</span>
										</div>

										<div className="flex flex-wrap items-center gap-cladd-3xs">
											<Verdict
												mentions={p.qualifyingLabels}
												estAlimentaire={p.isFood ?? true}
												taille="sm"
											/>
											<EtatArbitrage statut={p.reviewStatus} />
										</div>
									</Surface>
								))}
							</div>
						</>
					)}
				</div>
			</PageBody>

			{aReclasser && detail ? (
				<FeuilleCorrection
					key={aReclasser}
					intitule="Revoir cette classification"
					produit={{
						normalizedLabel: detail.produit.normalizedLabel,
						rawLabelExemple: detail.produit.rawLabelExemple,
						occurrences: detail.produit.occurrences,
						montantCumuleHT: detail.produit.montantHT,
						// Pas de motif : on n'est plus dans la file, personne ne pose de
						// question. Le gérant revient de lui-même sur une décision.
						motif: '',
						proposition: detail.produit.family
							? {
									isFood: detail.produit.isFood ?? true,
									family: detail.produit.family as Famille,
									qualifyingLabels: [...detail.produit.qualifyingLabels],
									justification: detail.produit.justification,
									confidence: detail.produit.confidence ?? 1
								}
							: null
					}}
					urlDocument={null}
					nomDocument={null}
					enCours={enCours}
					onEnregistrer={(d) => void enregistrer(d)}
					onFermer={() => setAReclasser(null)}
					detail={<LignesDuProduit lignes={detail.lignes} />}
				/>
			) : null}
		</Page>
	);
}

/**
 * L'état d'arbitrage d'un produit, dit au gérant et non au développeur.
 *
 * `AUTO` n'est pas « automatique » de son point de vue : c'est « nous avons
 * tranché, vous ne nous avez pas contredit ». La nuance compte, parce que c'est
 * exactement ce qu'il devra assumer devant un contrôle.
 */
function EtatArbitrage({ statut }: { statut: 'AUTO' | 'PENDING_REVIEW' | 'CONFIRMED' | 'CORRECTED' }) {
	if (statut === 'PENDING_REVIEW') {
		return (
			<Chip size="sm" color="orange">
				En attente de vous
			</Chip>
		);
	}
	if (statut === 'CONFIRMED') {
		return (
			<Chip size="sm" color="neutral">
				Confirmé par vous
			</Chip>
		);
	}
	if (statut === 'CORRECTED') {
		return (
			<Chip size="sm" color="neutral">
				Corrigé par vous
			</Chip>
		);
	}
	return (
		<Chip size="sm" color="neutral">
			Classé automatiquement
		</Chip>
	);
}

/**
 * Les lignes réelles d'un produit, avec leur facture.
 *
 * Un tableau, et c'est le bon choix ici : on y cherche une valeur précise —
 * « qu'est-ce que j'ai payé le 12 mars ? » — pas une comparaison. C'est aussi
 * le seul endroit où l'on peut constater qu'une remise a bien été lue en
 * négatif, ce qu'aucun taux ne dira jamais tout seul.
 */
function LignesDuProduit({
	lignes
}: {
	lignes: readonly {
		ligneId: string;
		rawLabel: string;
		invoiceDate: string;
		amountHT: number;
		quantity: number | null;
		unit: string | null;
		documentId: string | null;
		filename: string | null;
		supplierName: string | null;
	}[];
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<div className="flex items-baseline justify-between">
				<span className="text-cladd-xs font-semibold">Ce que vous avez acheté</span>
				<span className="text-cladd-2xs text-cladd-fg-softer">
					{lignes.length} ligne{pluriel(lignes.length)}
				</span>
			</div>

			<Tableau legende="Lignes de facture portant ce produit">
				<TableauEntete>
					<TableauTitre>Date</TableauTitre>
					<TableauTitre>Libellé et facture</TableauTitre>
					<TableauTitre aDroite>Quantité</TableauTitre>
					<TableauTitre aDroite>Montant HT</TableauTitre>
				</TableauEntete>
				<TableauCorps>
					{lignes.map((l) => (
						<TableauLigne key={l.ligneId}>
							<TableauCellule chiffre>
								{DATE.format(new Date(`${l.invoiceDate}T00:00:00`))}
							</TableauCellule>
							<TableauCellule>
								<span className="block max-w-64 truncate">{l.rawLabel}</span>
								<span className="block max-w-64 truncate text-cladd-3xs text-cladd-fg-softer">
									{l.supplierName ? `${l.supplierName} · ` : ''}
									{l.filename ?? '—'}
								</span>
							</TableauCellule>
							<TableauCellule aDroite chiffre>
								{l.quantity !== null ? `${l.quantity}${l.unit ? ` ${l.unit}` : ''}` : '—'}
							</TableauCellule>
							<TableauCellule aDroite chiffre>
								{euros(l.amountHT)}
							</TableauCellule>
						</TableauLigne>
					))}
				</TableauCorps>
			</Tableau>

			<p className="flex items-center gap-2 text-cladd-3xs text-cladd-fg-softer">
				<PencilIcon size={12} />
				Votre décision ci-dessous s&rsquo;applique à ces {lignes.length} ligne
				{pluriel(lignes.length)}, et à toutes celles du même libellé.
			</p>
		</div>
	);
}
