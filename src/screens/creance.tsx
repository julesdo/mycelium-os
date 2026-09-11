import type { ReactNode } from 'react';
import { Button, Chip, Surface, SurfaceCut } from '@cladd-ui/react';
import { AlertTriangleIcon, FileDownIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	Page,
	PageHeader,
	PageBody,
	SectionEcran,
	QuestionnaireLitige,
	Relances,
	Solidite,
	SuiviProcedure,
	eurosCentimes,
	pluriel,
	pourcent,
	type NiveauAffiche,
	type QuestionLitige,
	type ReponseFait,
	type SoliditeAffichee,
	type SuiviAffiche
} from '../ui';

/**
 * L'ÉCRAN DE CRÉANCE — le plus important du produit, et le dernier à être
 * devenu visible.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI IL VIT ICI ET PLUS DANS SA ROUTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'était le seul écran majeur absent de la salle d'exposition : il tenait
 * dans sa route, mêlé aux requêtes Convex, donc invisible sans backend ni
 * authentification. Neuf sections y ont été empilées au fil du temps — score,
 * litige, questions, risques, solidité, relances, suivi, procédures, décompte
 * — et personne ne les avait jamais vues ENSEMBLE, aux quatre largeurs.
 *
 * La règle du projet est pourtant explicite : « chaque écran s'ouvre dans le
 * navigateur intégré aux quatre largeurs de référence AVANT d'être déclaré
 * fini ». Un écran qu'on ne peut pas ouvrir ne peut pas être fini.
 *
 * Même découpage que `screens/accueil.tsx` : ce fichier DESSINE et ne sait pas
 * interroger Convex ; la route LIT et traduit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ORDRE DE L'ÉCRAN EST L'ORDRE DE LA DÉCISION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le score d'abord, mais jamais seul : un nombre sans prise laisse le gérant
 * devant une note qu'il ne sait pas faire monter. Viennent ensuite ce que lui
 * seul peut dire, ce qui affaiblit le dossier, ce que les pièces établissent.
 *
 * Puis les relances AVANT les procédures : le recouvrement amiable passe avant
 * le judiciaire, et l'ordre inverse laisserait croire que l'escalade est le
 * chemin normal.
 *
 * Le décompte vient en dernier parce qu'il n'a de sens qu'une fois la créance
 * qualifiée. Le produire sur un dossier douteux donnerait un chiffre juste sur
 * une créance qu'on n'aurait pas dû poursuivre.
 */

export interface CreanceAffichee {
	readonly debiteur: string;
	readonly score: number;
	readonly eligible: boolean;
	readonly principalRestantDu: bigint;
	readonly factures: readonly { readonly _id: string }[];
	readonly questions: readonly { readonly condition: string; readonly libelle: string }[];
	readonly litige: {
		readonly litigieux: boolean;
		readonly constats: readonly string[];
		readonly questions: readonly QuestionLitige[];
	};
	readonly risques: readonly {
		readonly type: string;
		readonly description: string;
		readonly gravite: string;
	}[];
	readonly solidite: SoliditeAffichee;
	readonly relances: readonly NiveauAffiche[];
	readonly procedures: readonly {
		readonly cle: string;
		readonly nom: string;
		readonly disponible: boolean;
		readonly blocages: readonly string[];
	}[];
	readonly regimePrescriptionNote: string;
}

export function EcranCreance({
	creance,
	suivi,
	dernier,
	aujourdHui,
	enCours,
	erreur,
	onTrancher,
	onDeclarer,
	onConsigner,
	onProduireDecompte,
	onTelecharger
}: {
	creance: CreanceAffichee;
	/** Le suivi d'une procédure engagée, ou `null` quand rien ne l'est. */
	suivi: SuiviAffiche | null;
	/** Le dernier décompte figé, rendu tel quel par `Decompte`. */
	dernier: ReactNode;
	aujourdHui: string;
	enCours: boolean;
	erreur: string | null;
	onTrancher: (condition: string, valeur: 'ok' | 'ko') => void;
	onDeclarer: (cle: string, reponse: ReponseFait) => void;
	onConsigner: (cle: string, survenuLe: string) => void;
	onProduireDecompte: () => void;
	/** Absent quand aucun décompte n'existe : il n'y a rien à télécharger. */
	onTelecharger: (() => void) | null;
}) {
	return (
		<Page>
			<PageHeader
				titre={creance.debiteur}
				sousTitre={`${creance.factures.length} facture${pluriel(creance.factures.length)} · ${eurosCentimes(
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
								onRepondre={(cle, reponse) => onDeclarer(cle, reponse)}
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
											<BoutonPrincipal onClick={() => onTrancher(question.condition, 'ok')}>
												Oui
											</BoutonPrincipal>
											<Button
												size="md"
												variant="transparent"
												onClick={() => onTrancher(question.condition, 'ko')}
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

					{/*
					  LA PYRAMIDE DE PREUVES — module 4.2.

					  ⚠️ ELLE REMPLACE UNE RANGÉE DE PASTILLES NUES. « bon de commande »
					  et « mise en demeure » s'y ressemblaient, alors que l'une vaut
					  trois points sur vingt et l'autre un seul — et aucune ne disait ce
					  qu'elle établit.

					  Le titre a changé aussi : « ce qui renforcerait ce dossier » ne
					  montrait que les manques, ce qui se lit comme une réprimande et
					  masque le chemin parcouru. Les quatre étages sont rendus, établis
					  ou non.
					*/}
					<SectionEcran titre="Ce que les pièces établissent">
						<Solidite solidite={creance.solidite} />
					</SectionEcran>

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
								aujourdHui={aujourdHui}
								enCours={enCours}
								onConsigner={(cle, survenuLe) => onConsigner(cle, survenuLe)}
							/>
						</SectionEcran>
					) : null}

					{/*
					  LES RELANCES AVANT LES PROCÉDURES.

					  ⚠️ L'ORDRE EST LA LIGNE ROUGE 1 RENDUE VISIBLE. Le recouvrement
					  amiable passe avant le judiciaire, et ces textes partent de la
					  messagerie du créancier, sous sa signature — ce logiciel n'envoie
					  rien. Mettre les procédures au-dessus laisserait croire que
					  l'escalade est le chemin normal.
					*/}
					<SectionEcran
						titre="Ce que vous pouvez lui écrire"
						legende="Des brouillons, à envoyer depuis votre messagerie."
					>
						<Relances niveaux={creance.relances} />
					</SectionEcran>

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
						{dernier !== null ? (
							<>{dernier}</>
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
							<BoutonPrincipal onClick={onProduireDecompte} disabled={enCours}>
								{enCours ? 'Calcul en cours…' : 'Arrêter un décompte à aujourd’hui'}
							</BoutonPrincipal>

							{/* LA PIÈCE. C'est le troisième critère de fin de MVP : un décompte
							    qui part chez un expert-comptable, un avocat ou un assureur SANS
							    être retouché. Tant qu'il faut le retoucher, ce n'est pas une
							    pièce — et le client n'a aucune raison de rester. */}
							{onTelecharger !== null ? (
								<Button size="lg" variant="transparent" onClick={onTelecharger}>
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
