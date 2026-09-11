import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Chip, Surface, SurfaceCut } from '@cladd-ui/react';
import { AlertTriangleIcon, FileDownIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { depuisCentimes } from '../../lib/socle/montants';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	BoutonPrincipal,
	Page,
	PageHeader,
	PageBody,
	SectionEcran,
	Decompte,
	QuestionnaireLitige,
	SuiviProcedure,
	aujourdHuiISO,
	eurosCentimes,
	pourcent,
	type ReponseFait
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
	const declarerFait = useMutation(api.recouvrement.creances.declarerFait);

	/**
	 * LE SUIVI DE LA PROCÉDURE ENGAGÉE — module 4.5.
	 *
	 * Elle rend `null` sur une créance qui n'a rien engagé, ce qui est le cas
	 * courant : lever y ferait une erreur permanente sur un état normal.
	 */
	const suivi = useQuery(api.recouvrement.apresProcedure.suiviDeLaCreance, { creanceId });
	const consignerEvenement = useMutation(api.recouvrement.apresProcedure.consignerEvenement);
	const figer = useMutation(api.recouvrement.decompte.produire);
	const dernier = useQuery(api.recouvrement.decompte.dernierDecompte, { creanceId });

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function tranche(condition: string, valeur: 'ok' | 'ko') {
		setErreur(null);
		await repondre({ creanceId, reponses: { [condition]: valeur } });
	}

	/**
	 * Consigner ce qui s'est passé dans la procédure, À SA DATE.
	 *
	 * ⚠️ `survenuLe` VIENT DU CHAMP, jamais de l'horloge. C'est la distinction
	 * que porte tout le module : les délais courent depuis le FAIT, pas depuis
	 * la saisie. Les confondre offrirait des jours sur une caducité.
	 */
	async function consigner(cle: string, survenuLe: string) {
		setErreur(null);
		setEnCours(true);
		try {
			await consignerEvenement({ creanceId, cle, survenuLe });
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Enregistrement refusé.');
		} finally {
			setEnCours(false);
		}
	}

	/**
	 * Déclarer un fait de litige.
	 *
	 * ⚠️ RIEN N'EST DÉRIVÉ EN LOCAL DE LA RÉPONSE. La question suivante et les
	 * constats reviennent par la requête, qui les recalcule depuis la base. Les
	 * deviner ici ferait un second endroit où le produit décide ce qu'une
	 * déclaration établit — et les deux finiraient par diverger.
	 */
	async function declarer(cle: string, reponse: ReponseFait) {
		setErreur(null);
		setEnCours(true);
		try {
			await declarerFait({ creanceId, cle: cle as 'CONTESTATION_ECRITE', reponse });
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Déclaration refusée.');
		} finally {
			setEnCours(false);
		}
	}

	/**
	 * LA PIÈCE, TÉLÉCHARGÉE.
	 *
	 * ⚠️ LE MODULE PDF EST IMPORTÉ À LA DEMANDE. `jspdf` et son greffon de
	 * tableaux pèsent plusieurs centaines de kilo-octets ; les charger avec
	 * l'écran ferait payer ce poids à chaque ouverture, pour un bouton qu'on
	 * presse une fois par créance.
	 *
	 * ⚠️ ET LE CONTENU NE SE COMPOSE PAS ICI. `composerPiece` est pure et testée ;
	 * cet écran ne fait que lui passer le décompte figé et donner un nom au
	 * fichier. Écrire une seule phrase du document ici créerait un second endroit
	 * où le produit parle de droit.
	 */
	async function telecharger() {
		if (dernier === undefined || dernier === null) return;

		const [{ composerPiece }, { rendrePieceEnPdf, nomFichierPiece }] = await Promise.all([
			import('../../lib/verticales/recouvrement/piece'),
			import('../../ui/piece-decompte')
		]);

		const piece = composerPiece({
			arreteAu: dernier.arreteAu,
			convention: dernier.convention,
			principalRestantDu: depuisCentimes(dernier.principalRestantDu),
			interets: depuisCentimes(dernier.interets),
			indemniteForfaitaire: depuisCentimes(dernier.indemniteForfaitaire),
			total: depuisCentimes(dernier.total),
			creancier: dernier.creancier,
			debiteur: dernier.debiteur,
			lignes: dernier.lignes.map((ligne) => ({
				reference: ligne.reference,
				principalRestantDu: depuisCentimes(ligne.principalRestantDu),
				interets: depuisCentimes(ligne.interets),
				indemniteForfaitaire: depuisCentimes(ligne.indemniteForfaitaire),
				total: depuisCentimes(ligne.total),
				segments: ligne.segments.map((segment) => ({
					debut: segment.debut,
					fin: segment.fin,
					jours: segment.jours,
					principal: depuisCentimes(segment.principal),
					taux: segment.taux,
					baseAnnuelle: segment.baseAnnuelle,
					interets: depuisCentimes(segment.interets)
				}))
			})),
			abandons: dernier.abandons.map((abandon) => ({
				reference: abandon.reference,
				montantEnJeu: abandon.montantEnJeu === null ? null : depuisCentimes(abandon.montantEnJeu),
				explication: abandon.explication
			}))
		});

		rendrePieceEnPdf(piece).save(nomFichierPiece(piece));
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
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
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

					{/*
					  LE QUESTIONNAIRE DE LITIGE D'ABORD — module 3.2.

					  Il vient avant les autres questions parce qu'il porte le seul
					  critère qui peut FERMER le dossier. Demander la qualité de
					  commerçant du débiteur à quelqu'un dont le client conteste la
					  facture par écrit, c'est faire répondre à des questions qui ne
					  changeront rien.
					*/}
					{creance.litige.questions.length > 0 || creance.litige.constats.length > 0 ? (
						<SectionEcran
							titre="Ce que vous seul pouvez dire"
							legende={
								creance.litige.questions.length > 0
									? 'Des faits, pas une appréciation juridique.'
									: undefined
							}
						>
							<QuestionnaireLitige
								questions={creance.litige.questions}
								constats={creance.litige.constats}
								litigieux={creance.litige.litigieux}
								enCours={enCours}
								onRepondre={(cle, reponse) => void declarer(cle, reponse)}
							/>
						</SectionEcran>
					) : null}

					{creance.questions.length > 0 ? (
						<SectionEcran titre="Ce que le logiciel ne peut pas déduire">
							<div className="flex flex-col gap-cladd-3xs">
								{creance.questions.map((question) => (
									<Surface
										variant="transparent"
										outline={false}
										className="verre-carte rounded-cladd-xl"
										key={question.condition}
										contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
									>
										<p className="text-cladd-sm">{question.libelle}</p>
										<div className="flex flex-wrap gap-cladd-3xs">
											<BoutonPrincipal onClick={() => tranche(question.condition, 'ok')}>
												Oui
											</BoutonPrincipal>
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
									<Surface
										key={risque.type}
										variant="transparent"
										outline={false}
										className="verre-carte rounded-cladd-xl"
										contentClassName="flex gap-cladd-3xs p-cladd-2xs"
									>
										<AlertTriangleIcon
											className="mt-1 size-4 shrink-0 text-cladd-fg-soft"
											aria-hidden
										/>
										<div className="flex min-w-0 flex-col gap-1.5">
											<p className="text-cladd-sm">{risque.description}</p>
											{risque.gravite === 'BLOQUANTE' ? (
												<p className="text-cladd-xs text-cladd-fg-soft">
													Une contestation, même infondée, met fin à la procédure simplifiée.
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
							<Surface
								variant="transparent"
								outline={false}
								className="verre-carte rounded-cladd-xl"
								contentClassName="flex flex-wrap gap-1.5 p-cladd-2xs"
							>
								{creance.piecesManquantes.map((piece) => (
									<Chip key={piece} size="md" color="neutral">
										{piece.replaceAll('_', ' ').toLowerCase()}
									</Chip>
								))}
							</Surface>
						</SectionEcran>
					) : null}

					{/*
					  CE QUI COURT MAINTENANT, AVANT CE QU'ON POURRAIT FAIRE.

					  Une procédure déjà engagée fait courir des délais dont un À PEINE
					  DE CADUCITÉ. Les mettre sous la liste des voies envisageables
					  reviendrait à faire lire « ce qu'on pourrait engager » avant « ce
					  qui va s'éteindre si personne ne bouge ».
					*/}
					{suivi ? (
						<SectionEcran titre="Ce qui court depuis l’engagement" legende={suivi.libelle}>
							<SuiviProcedure
								suivi={suivi}
								aujourdHui={aujourdHuiISO()}
								enCours={enCours}
								onConsigner={(cle, survenuLe) => void consigner(cle, survenuLe)}
							/>
						</SectionEcran>
					) : null}

					<SectionEcran titre="Procédures">
						<div className="flex flex-col gap-cladd-3xs">
							{creance.procedures.map((procedure) => (
								<Surface
									key={procedure.cle}
									variant="transparent"
									outline={false}
									className="verre-carte rounded-cladd-xl"
									contentClassName="flex flex-col gap-1.5 p-cladd-2xs"
								>
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
							<Surface
								variant="transparent"
								outline={false}
								className="verre-carte rounded-cladd-xl"
								contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
							>
								<p className="text-cladd-sm text-cladd-fg-soft">
									Aucun décompte n’a encore été arrêté pour cette créance.
								</p>
								<p className="text-cladd-xs text-cladd-fg-soft">
									Un décompte est figé à sa date : il prouve ce qui était réclamé le jour où on l’a
									réclamé, et ne bouge plus ensuite.
								</p>
							</Surface>
						)}

						{erreur ? <p className="mt-cladd-3xs text-cladd-xs text-cladd-fg">{erreur}</p> : null}

						<div className="mt-cladd-3xs flex flex-wrap gap-cladd-3xs">
							<BoutonPrincipal onClick={produireDecompte} disabled={enCours}>
								{enCours ? 'Calcul en cours…' : 'Arrêter un décompte à aujourd’hui'}
							</BoutonPrincipal>

							{/* LA PIÈCE. C'est le troisième critère de fin de MVP : un décompte
							    qui part chez un expert-comptable, un avocat ou un assureur SANS
							    être retouché. Tant qu'il faut le retoucher, ce n'est pas une
							    pièce — et le client n'a aucune raison de rester. */}
							{dernier ? (
								<Button size="lg" variant="transparent" onClick={() => void telecharger()}>
									<FileDownIcon />
									Télécharger la pièce
								</Button>
							) : null}
						</div>
					</SectionEcran>

					<p className="text-cladd-xs text-cladd-fg-soft">{creance.regimePrescriptionNote}</p>
				</div>
			</PageBody>
		</Page>
	);
}
