import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Chip, Surface, SurfaceCut } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Page,
	PageHeader,
	PageBody,
	SectionEcran,
	Decompte,
	eurosCentimes,
	pourcent
} from '../../ui';

export const Route = createFileRoute('/app/creance/$id')({ component: Creance });

/**
 * Une créance : ce qu'elle vaut, ce qui lui manque, et ce qu'elle chiffre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * L'ORDRE DE L'ÉCRAN EST L'ORDRE DE LA DÉCISION
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le score d'abord, mais jamais seul : un nombre sans prise laisse le gérant
 * devant une note qu'il ne sait pas faire monter. Viennent donc immédiatement
 * après les QUESTIONS — ce que le logiciel n'a pas pu déduire — puis les
 * risques, puis les pièces qui renforceraient le dossier.
 *
 * Le décompte vient en dernier parce qu'il n'a de sens qu'une fois la créance
 * qualifiée. Le produire sur un dossier douteux donnerait un chiffre juste sur
 * une créance qu'on n'aurait pas dû poursuivre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE QUESTIONNAIRE NE POSE QUE CE QU'IL FAUT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Trois des quatre conditions légales se déduisent des données. Une seule ne se
 * déduit jamais — le caractère certain — parce que l'absence de contestation
 * CONNUE n'est pas une absence de contestation. L'écran ne montre donc, le plus
 * souvent, qu'une seule question.
 */
function Creance() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const repondre = useMutation(api.recouvrement.creances.repondre);
	const figer = useMutation(api.recouvrement.decompte.produire);
	const dernier = useQuery(api.recouvrement.decompte.dernierDecompte, { creanceId });

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function tranche(condition: string, valeur: 'ok' | 'ko') {
		setErreur(null);
		await repondre({ creanceId, reponses: { [condition]: valeur } });
	}

	async function produireDecompte() {
		setEnCours(true);
		setErreur(null);
		try {
			await figer({ creanceId, convention: 'ACT_365' });
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: 'Le décompte n’a pas pu être produit.'
			);
		} finally {
			setEnCours(false);
		}
	}

	if (creance === undefined) {
		return (
			<Page>
				<PageHeader titre="Créance" />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader
				titre={creance.debiteur}
				sousTitre={`${creance.factures.length} facture(s) · ${eurosCentimes(
					creance.principalRestantDu
				)} restant dû`}
			/>
			<PageBody>
				<div className="flex flex-col gap-cladd-xs">
					<SurfaceCut contentClassName="flex flex-wrap items-center justify-between gap-cladd-3xs p-cladd-2xs">
						<div className="flex items-baseline gap-cladd-3xs">
							<span className="text-letikette-titre font-bold tabular-nums">
								{pourcent(creance.score)}
							</span>
							<span className="text-cladd-xs text-cladd-fg-soft">de solidité</span>
						</div>
						<Chip size="md" color={creance.eligible ? 'green' : 'neutral'}>
							{creance.eligible ? 'Mûre pour une procédure' : 'Pas encore mûre'}
						</Chip>
					</SurfaceCut>

					{creance.questions.length > 0 ? (
						<SectionEcran titre="Ce que le logiciel ne peut pas déduire">
							<div className="flex flex-col gap-cladd-3xs">
								{creance.questions.map((question) => (
									<Surface
										key={question.condition} contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs">
										<p className="text-cladd-sm">{question.libelle}</p>
										<div className="flex flex-wrap gap-cladd-3xs">
											<Button
												size="md"
												color="brand"
												variant="solid-fill"
												onClick={() => tranche(question.condition, 'ok')}
											>
												Oui
											</Button>
											<Button
												size="md"
												variant="transparent"
												onClick={() => tranche(question.condition, 'ko')}
											>
												Non
											</Button>
										</div>
									</Surface>
								))}
							</div>
						</SectionEcran>
					) : null}

					{creance.risques.length > 0 ? (
						<SectionEcran titre="Ce qui affaiblit ce dossier">
							<div className="flex flex-col gap-cladd-3xs">
								{creance.risques.map((risque) => (
									<Surface key={risque.type} contentClassName="flex gap-cladd-3xs p-cladd-2xs">
										<AlertTriangleIcon
											className="mt-1 size-4 shrink-0 text-cladd-fg-soft"
											aria-hidden
										/>
										<div className="flex min-w-0 flex-col gap-1.5">
											<p className="text-cladd-sm">{risque.description}</p>
											{risque.gravite === 'BLOQUANTE' ? (
												<p className="text-cladd-xs text-cladd-fg-soft">
													Une contestation, même infondée, met fin à la procédure
													simplifiée.
												</p>
											) : null}
										</div>
									</Surface>
								))}
							</div>
						</SectionEcran>
					) : null}

					{creance.piecesManquantes.length > 0 ? (
						<SectionEcran titre="Ce qui renforcerait ce dossier">
							<Surface contentClassName="flex flex-wrap gap-1.5 p-cladd-2xs">
								{creance.piecesManquantes.map((piece) => (
									<Chip key={piece} size="md" color="neutral">
										{piece.replaceAll('_', ' ').toLowerCase()}
									</Chip>
								))}
							</Surface>
						</SectionEcran>
					) : null}

					<SectionEcran titre="Procédures">
						<div className="flex flex-col gap-cladd-3xs">
							{creance.procedures.map((procedure) => (
								<Surface key={procedure.cle} contentClassName="flex flex-col gap-1.5 p-cladd-2xs">
									<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
										<span className="text-cladd-sm font-semibold">{procedure.nom}</span>
										<Chip size="md" color={procedure.disponible ? 'green' : 'neutral'}>
											{procedure.disponible ? 'Envisageable' : 'Indisponible'}
										</Chip>
									</div>
									{/* Les blocages sont NOMMÉS. « Indisponible » sans motif
									    laisserait croire à une limite du produit, alors qu'il
									    s'agit d'une valeur juridique qui manque. */}
									{procedure.blocages.map((blocage) => (
										<p key={blocage} className="text-cladd-xs text-cladd-fg-soft">
											{blocage}
										</p>
									))}
								</Surface>
							))}
						</div>
					</SectionEcran>

					<SectionEcran titre="Décompte">
						{dernier ? (
							<Decompte decompte={dernier} />
						) : (
							<Surface contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs">
								<p className="text-cladd-sm text-cladd-fg-soft">
									Aucun décompte n’a encore été arrêté pour cette créance.
								</p>
								<p className="text-cladd-xs text-cladd-fg-soft">
									Un décompte est figé à sa date : il prouve ce qui était réclamé le jour où
									on l’a réclamé, et ne bouge plus ensuite.
								</p>
							</Surface>
						)}

						{erreur ? <p className="mt-cladd-3xs text-cladd-xs text-cladd-fg">{erreur}</p> : null}

						<div className="mt-cladd-3xs">
							<Button
								size="lg"
								color="brand"
								variant="solid-fill"
								onClick={produireDecompte}
								disabled={enCours}
							>
								{enCours ? 'Calcul en cours…' : 'Arrêter un décompte à aujourd’hui'}
							</Button>
						</div>
					</SectionEcran>

					<p className="text-cladd-xs text-cladd-fg-soft">{creance.regimePrescriptionNote}</p>
				</div>
			</PageBody>
		</Page>
	);
}
