import { useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Checkbox, Chip, Surface } from '@cladd-ui/react';
import { UploadIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Page,
	PageHeader,
	PageBody,
	TwoPane,
	EmptyState,
	eurosCentimes,
	dateCourte,
	pluriel
} from '../../ui';

export const Route = createFileRoute('/app/debiteurs')({ component: Debiteurs });

/**
 * Les débiteurs, et leurs factures.
 *
 * DEUX VOLETS AU-DELÀ DE 1024 px (règle d'écran n° 3), et ils portent
 * exactement ce que la règle prévoit : la LISTE à gauche, la PREUVE à droite.
 * Ici, la preuve d'un débiteur est le détail de ce qu'il doit — facture par
 * facture, avec sa date de prescription.
 *
 * LA PRESCRIPTION EST DANS LE TABLEAU, PAS DANS UNE ALERTE À PART. C'est une
 * propriété de chaque facture, au même titre que son montant : la reléguer
 * ailleurs obligerait à croiser deux écrans pour savoir laquelle va s'éteindre.
 */
function Debiteurs() {
	const navigate = useNavigate();
	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	const [choisi, setChoisi] = useState<Id<'debiteurs'> | null>(null);
	const [selection, setSelection] = useState<Set<string>>(new Set());
	const [erreur, setErreur] = useState<string | null>(null);

	const factures = useQuery(
		api.recouvrement.lecture.listerFacturesDuDebiteur,
		choisi === null ? 'skip' : { debiteurId: choisi }
	);
	const creerCreance = useMutation(api.recouvrement.creances.creer);

	function basculer(id: string) {
		setSelection((precedente) => {
			const suivante = new Set(precedente);
			if (suivante.has(id)) suivante.delete(id);
			else suivante.add(id);
			return suivante;
		});
	}

	async function constituer() {
		setErreur(null);
		try {
			const creanceId = await creerCreance({
				factureIds: [...selection] as Id<'facturesVente'>[]
			});
			setSelection(new Set());
			await navigate({ to: '/app/creance/$id', params: { id: creanceId } });
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: 'La créance n’a pas pu être constituée.'
			);
		}
	}

	if (debiteurs === undefined) {
		return (
			<Page>
				<PageHeader titre="Vos débiteurs" />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	if (debiteurs.length === 0) {
		return (
			<Page>
				<PageHeader titre="Vos débiteurs" />
				<PageBody>
					<EmptyState
						illustration="🧾"
						titre="Aucun débiteur pour l’instant"
						explication="Les débiteurs apparaissent tout seuls quand vous importez vos factures : le logiciel les rapproche par leur raison sociale, quelle que soit la graphie."
						etapes={[
							'Importez un export comptable ou vos factures de vente.',
							'Le logiciel crée un débiteur par client et calcule son encours.',
							'Sélectionnez les factures d’un même débiteur pour en faire une créance.'
						]}
						action={
							<Button
								as={Link}
								to="/app/import-factures"
								size="lg"
								color="brand"
								variant="solid-fill"
							>
								<UploadIcon />
								Importer mes factures
							</Button>
						}
					/>
				</PageBody>
			</Page>
		);
	}

	const liste = (
		<div className="flex flex-col gap-cladd-3xs p-cladd-3xs">
			{debiteurs.map((debiteur) => (
				<button
					key={debiteur._id}
					type="button"
					onClick={() => {
						setChoisi(debiteur._id);
						setSelection(new Set());
					}}
					className="text-left"
				>
					<Surface contentClassName="flex flex-col gap-1.5 p-cladd-2xs">
						<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
							<span className="min-w-0 truncate text-cladd-sm font-semibold">
								{debiteur.denomination}
							</span>
							<span className="text-letikette-chiffre font-bold tabular-nums">
								{eurosCentimes(debiteur.encours)}
							</span>
						</div>

						<div className="flex flex-wrap items-center gap-1.5">
							{debiteur.facturesEchues > 0 ? (
								<Chip size="md" color="orange">
									{debiteur.facturesEchues} échue{pluriel(debiteur.facturesEchues)}
								</Chip>
							) : null}
							{debiteur.santeFinanciere !== 'SAINE' &&
							debiteur.santeFinanciere !== 'INCONNUE' ? (
								<Chip size="md" color="red">
									{debiteur.santeFinanciere === 'RADIEE' ? 'Radié' : 'Procédure collective'}
								</Chip>
							) : null}
							{/* Un secteur indéterminé fait retenir le délai de prescription le
							    plus court. Le dire ici évite que le gérant découvre l'hypothèse
							    au moment où une créance est annoncée prescrite. */}
							{!debiteur.secteurDetermine ? (
								<Chip size="md" color="neutral">
									Secteur à préciser
								</Chip>
							) : null}
						</div>
					</Surface>
				</button>
			))}
		</div>
	);

	const preuve =
		choisi === null || factures === undefined ? (
			<div className="p-cladd-2xs">
				<p className="text-cladd-xs text-cladd-fg-soft">
					Choisissez un débiteur pour voir ce qu’il doit, facture par facture.
				</p>
			</div>
		) : (
			<div className="flex flex-col gap-cladd-2xs p-cladd-2xs">
				{factures.map((facture) => (
					<Surface key={facture._id} contentClassName="flex flex-col gap-1.5 p-cladd-2xs">
						<div className="flex items-start gap-cladd-3xs">
							{/* Une facture déjà rattachée à une créance ne peut pas l'être une
							    seconde fois : la réclamer deux fois exposerait les deux
							    procédures. La case est donc désactivée, pas cachée. */}
							<Checkbox
								checked={selection.has(facture._id)}
								onChange={() => basculer(facture._id)}
								disabled={facture.dansUneCreance || facture.statutPaiement === 'SOLDEE'}
								aria-label={`Inclure ${facture.reference}`}
							/>
							<div className="flex min-w-0 flex-1 flex-col gap-1.5">
								<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
									<span className="text-cladd-sm font-semibold">{facture.reference}</span>
									<span className="text-cladd-sm font-semibold tabular-nums">
										{eurosCentimes(facture.resteDu)}
									</span>
								</div>

								<p className="text-cladd-xs text-cladd-fg-soft">
									Émise le {dateCourte(facture.dateEmission)}
									{facture.dateEcheance
										? `, échéance le ${dateCourte(facture.dateEcheance)}`
										: ', sans échéance connue'}
								</p>

								{facture.exigibiliteDeduite ? (
									<p className="text-cladd-2xs text-cladd-fg-softer">
										Exigibilité déduite de l’échéance — à confirmer si vos conditions
										contractuelles disent autre chose.
									</p>
								) : null}

								<div className="flex flex-wrap items-center gap-1.5">
									{facture.dansUneCreance ? (
										<Chip size="md" color="neutral">
											Déjà dans une créance
										</Chip>
									) : null}
									{facture.datePrescription ? (
										<Chip size="md" color="neutral">
											Prescription le {dateCourte(facture.datePrescription)}
										</Chip>
									) : null}
								</div>
							</div>
						</div>
					</Surface>
				))}

				{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

				{selection.size > 0 ? (
					<Button size="lg" color="brand" variant="solid-fill" onClick={constituer}>
						Constituer une créance de {selection.size} facture{pluriel(selection.size)}
					</Button>
				) : null}
			</div>
		);

	return (
		<Page>
			<PageHeader titre="Vos débiteurs" sousTitre="Le plus gros encours d’abord" />
			<div className="min-h-0 flex-1">
				<TwoPane
					liste={liste}
					preuve={preuve}
					preuveOuverte={choisi !== null}
					onFermerPreuve={() => setChoisi(null)}
				/>
			</div>
		</Page>
	);
}
