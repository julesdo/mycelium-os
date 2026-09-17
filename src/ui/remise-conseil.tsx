import { useState, type ReactNode } from 'react';
import {
	Button,
	CollapsibleIndicator,
	CollapsiblePanel,
	CollapsibleRoot,
	CollapsibleTrigger,
	Input,
	Surface,
	Toolbar
} from '@cladd-ui/react';
import { ChevronDownIcon, InfoIcon } from 'lucide-react';
import { PeriodesDInterets, type SegmentAffiche } from './decompte';
import { dateCourte, eurosCentimes, pluriel } from './format';
import { ListeAnalyses, LigneBouton } from './navigation';
import { aujourdHuiISO } from './horloge';

/**
 * LE SUIVI D'UN DOSSIER REMIS AU CONSEIL (décision D12).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CE PANNEAU NE FAIT PAS, ET QUI CADRE TOUT LE RESTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il ne pilote pas le conseil. Il ne lui écrit pas, ne lui fixe aucun délai, ne
 * le relance pas, ne note pas son efficacité, et ne recommande aucune démarche.
 * Il suit une REMISE faite par le gérant et attend un RETOUR déclaré par le
 * gérant. Chaque état vient d'une déclaration humaine, et d'elle seule.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RIEN NE SE REPLIE PENDANT QUE LE DOSSIER EST PARTI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La prescription ne s'arrête pas parce qu'un dossier est chez un avocat, et un
 * gérant qui a « transmis » croit avoir agi. Ce panneau montre donc, pendant
 * toute la remise : les DEUX montants et leur écart décomposé, la date de
 * prescription avec ses jours restants, l'angle mort du calcul, et un constat
 * arithmétique du temps écoulé — jamais une insinuation sur le conseil.
 */

export type EtatRemise = 'PREPARE' | 'REMIS' | 'REVENU' | 'CLOS';

export interface RemiseAffichee {
	readonly id: string;
	readonly etat: EtatRemise;
	readonly intervenant: string | null;
	readonly remisLe: string | null;
	readonly revenuLe: string | null;
	readonly closLe: string | null;
	readonly motifCloture: string | null;
	readonly attendu: string | null;
}

export interface EcartAffiche {
	readonly principalRestantDu: bigint;
	readonly interets: bigint;
	readonly indemniteForfaitaire: bigint;
	readonly total: bigint;
	readonly parFacture: readonly {
		readonly reference: string;
		readonly nouvelle: boolean;
		readonly ecartTotal: bigint;
		readonly ecartInterets: bigint;
		readonly segments: readonly SegmentAffiche[];
	}[];
}

export interface FicheDuCarnet {
	readonly id: string;
	readonly nom: string;
	readonly precision: string;
}

export interface SuiviConseilAffiche {
	readonly fige: { readonly arreteAu: string; readonly total: bigint };
	readonly duJour: { readonly arreteAu: string; readonly total: bigint } | null;
	readonly refusDuJour: string | null;
	readonly ecart: EcartAffiche | null;
	readonly prescription: {
		readonly date: string | null;
		readonly joursRestants: number | null;
		readonly dureeAnnees: number;
		readonly hypothese: boolean;
	};
	readonly angleMort: string;
	readonly joursDepuisLaRemise: number | null;
	readonly faitsDeProcedureDepuisLaRemise: number;
	readonly remise: RemiseAffichee | null;
	/** Le carnet du gérant. Le produit ne propose JAMAIS de nom. */
	readonly carnet: readonly FicheDuCarnet[];
	readonly onPreparer: () => void;
	readonly onRemettre: (remisLe: string, intervenantId: string | null, attendu: string) => void;
	readonly onRetour: (revenuLe: string) => void;
	readonly onClore: (closLe: string, motif: string) => void;
	readonly enCours: boolean;
	readonly erreur: string | null;
}

const LIBELLE_ETAT: Record<EtatRemise, string> = {
	PREPARE: 'Dossier préparé, il n’est pas parti',
	REMIS: 'Dossier remis à votre conseil',
	REVENU: 'Votre conseil a rendu quelque chose',
	CLOS: 'Suivi clos'
};

function Carte({ children }: { children: ReactNode }) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			{children}
		</Surface>
	);
}

function Poste({ libelle, montant }: { libelle: string; montant: bigint }) {
	return (
		<div className="flex items-baseline justify-between gap-cladd-3xs">
			<span className="text-cladd-2xs text-cladd-fg-soft">{libelle}</span>
			<span className="text-cladd-2xs font-semibold tabular-nums">{eurosCentimes(montant)}</span>
		</div>
	);
}

/**
 * LES DEUX MONTANTS, ET LEUR ÉCART DÉCOMPOSÉ.
 *
 * ⚠️ TROIS POSTES, JAMAIS UN SEUL NOMBRE. « 132,47 € de plus » ne dit pas si ce
 * sont des intérêts courus, un règlement encaissé depuis ou une facture
 * rattachée entre-temps, et ces trois-là n'appellent pas la même lecture.
 */
function DeuxMontants({ suivi }: { suivi: SuiviConseilAffiche }) {
	return (
		<Carte>
			<div className="flex items-baseline justify-between gap-cladd-3xs">
				<span className="text-cladd-2xs text-cladd-fg-soft">
					Dossier du {dateCourte(suivi.fige.arreteAu)}
				</span>
				<span className="text-cladd-sm font-semibold tabular-nums">
					{eurosCentimes(suivi.fige.total)}
				</span>
			</div>

			{suivi.duJour === null ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Le calcul du jour ne se fait pas en l’état, et le dossier remis reste exact à sa date.
					{suivi.refusDuJour === null ? '' : ` ${suivi.refusDuJour}`}
				</p>
			) : (
				<>
					<div className="flex items-baseline justify-between gap-cladd-3xs">
						<span className="text-cladd-2xs text-cladd-fg-soft">
							Aujourd’hui, au {dateCourte(suivi.duJour.arreteAu)}
						</span>
						<span className="text-cladd-sm font-semibold tabular-nums">
							{eurosCentimes(suivi.duJour.total)}
						</span>
					</div>

					{suivi.ecart === null ? null : (
						<>
							<div className="mt-cladd-3xs border-t border-cladd-outline pt-cladd-3xs">
								<Poste libelle="Écart total" montant={suivi.ecart.total} />
								<Poste libelle="dont principal" montant={suivi.ecart.principalRestantDu} />
								<Poste libelle="dont intérêts courus" montant={suivi.ecart.interets} />
								<Poste
									libelle="dont indemnités forfaitaires"
									montant={suivi.ecart.indemniteForfaitaire}
								/>
							</div>

							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
								Le dossier porte un décompte FIGÉ ; le calcul du jour continue de courir. Les deux
								sont exacts, chacun à sa date, et l’écart se refait à la main période par période.
							</p>

							{suivi.ecart.parFacture.map((facture) => (
								<CollapsibleRoot key={facture.reference}>
									<CollapsibleTrigger>
										<Button variant="transparent" contentClassName="justify-between" size="md">
											{`${facture.reference} : ${eurosCentimes(facture.ecartTotal)}${facture.nouvelle ? ' (hors du dossier remis)' : ''}`}
											<CollapsibleIndicator className="text-cladd-fg-soft">
												{({ open }) => (
													<ChevronDownIcon className={open ? 'rotate-180' : undefined} />
												)}
											</CollapsibleIndicator>
										</Button>
									</CollapsibleTrigger>
									<CollapsiblePanel>
										<div className="pt-cladd-3xs">
											<PeriodesDInterets segments={facture.segments} />
										</div>
									</CollapsiblePanel>
								</CollapsibleRoot>
							))}
						</>
					)}
				</>
			)}
		</Carte>
	);
}

/** Ce qui court pendant que le dossier est parti, et ce que le logiciel ne voit pas. */
function CeQuiCourt({ suivi }: { suivi: SuiviConseilAffiche }) {
	const jours = suivi.prescription.joursRestants;

	return (
		<Carte>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg">
				{suivi.prescription.date === null
					? 'La prescription de cette créance ne se calcule pas : aucune date de départ exploitable n’a été trouvée sur ses factures. C’est un angle mort, et il est nommé ici plutôt que tu.'
					: `La prescription tombe le ${dateCourte(suivi.prescription.date)}, dans ${jours ?? 0} jour${pluriel(jours ?? 0)}, et elle ne s’arrête pas parce que le dossier est parti.`}
			</p>

			{suivi.prescription.hypothese ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{`Le secteur de ce client n’est pas déterminé : le délai le plus court connu (${suivi.prescription.dureeAnnees} an) est retenu. Préciser le secteur lèvera cette hypothèse.`}
				</p>
			) : null}

			<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
				{suivi.angleMort}
			</p>

			{suivi.joursDepuisLaRemise === null ? null : (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{`Dossier remis il y a ${suivi.joursDepuisLaRemise} jour${pluriel(suivi.joursDepuisLaRemise)}. ${
						suivi.faitsDeProcedureDepuisLaRemise === 0
							? 'Aucun fait de procédure consigné depuis.'
							: `${suivi.faitsDeProcedureDepuisLaRemise} fait${pluriel(suivi.faitsDeProcedureDepuisLaRemise)} de procédure consigné${pluriel(suivi.faitsDeProcedureDepuisLaRemise)} depuis.`
					}`}
				</p>
			)}
		</Carte>
	);
}

export function RemiseAuConseil({ suivi }: { suivi: SuiviConseilAffiche }) {
	const aujourdHui = aujourdHuiISO();
	const [quand, setQuand] = useState(aujourdHui);
	const [attendu, setAttendu] = useState('');
	const [motif, setMotif] = useState('');
	const [intervenantId, setIntervenantId] = useState<string | null>(null);
	const [cloture, setCloture] = useState(false);

	const remise = suivi.remise;

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<DeuxMontants suivi={suivi} />
			<CeQuiCourt suivi={suivi} />

			{suivi.erreur ? (
				<p role="alert" className="text-cladd-xs leading-relaxed text-cladd-fg">
					{suivi.erreur}
				</p>
			) : null}

			{remise === null ? (
				<Carte>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Ce décompte n’est suivi par aucun dossier. Un dossier fige ce qu’il emporte : son
						décompte ne change jamais, et la question qu’on lui posera est « qu’a lu le conseil le
						jour où on le lui a remis ».
					</p>
					<Toolbar className="flex-wrap" size="md">
						<Button
							variant="transparent"
							outline={false}
							hoverable={false}
							rounded
							className="verre verre-bouton font-medium"
							disabled={suivi.enCours}
							onClick={suivi.onPreparer}
						>
							Préparer un dossier sur ce décompte
						</Button>
					</Toolbar>
				</Carte>
			) : (
				<Carte>
					<span className="text-cladd-sm font-semibold">{LIBELLE_ETAT[remise.etat]}</span>

					{remise.remisLe ? (
						<p className="text-cladd-2xs text-cladd-fg-soft">
							{`Remis le ${dateCourte(remise.remisLe)}${remise.intervenant === null ? ', sans intervenant nommé' : ` à ${remise.intervenant}`}.`}
						</p>
					) : null}
					{remise.attendu ? (
						<p className="text-cladd-2xs text-cladd-fg-softer">Attendu : {remise.attendu}</p>
					) : null}
					{remise.revenuLe ? (
						<p className="text-cladd-2xs text-cladd-fg-soft">
							Retour consigné le {dateCourte(remise.revenuLe)}.
						</p>
					) : null}
					{remise.closLe ? (
						<p className="text-cladd-2xs text-cladd-fg-soft">
							{`Suivi clos le ${dateCourte(remise.closLe)} : ${remise.motifCloture ?? ''}`}
						</p>
					) : null}

					{remise.etat === 'PREPARE' ? (
						<>
							{/* ⚠️ LA DATE EST DEMANDÉE, PAS SUPPOSÉE. C'est la date du FAIT :
							    un gérant qui enregistre le 20 mars une remise du 3 doit voir
							    le compteur partir du 3. Le champ part sur aujourd'hui parce
							    que c'est le cas le plus fréquent, et il se corrige d'un
							    geste. */}
							<Input
								size="lg"
								type="date"
								value={quand}
								onChange={setQuand}
								infoMessage="La date du FAIT, pas celle de la saisie."
							/>
							<Input
								size="lg"
								value={attendu}
								onChange={setAttendu}
								placeholder="Ce que vous attendez en retour (facultatif)"
							/>

							{/* ⚠️ « PERSONNE » EST UN CHOIX, PAS UN DÉFAUT MANQUANT. Un
							    dossier se remet sans nommer qui que ce soit, et le produit
							    ne propose JAMAIS de nom : ces fiches viennent du carnet du
							    gérant. */}
							<ListeAnalyses>
								<LigneBouton
									titre="Sans nommer personne"
									valeur={intervenantId === null ? 'choisi' : undefined}
									onClick={() => setIntervenantId(null)}
								/>
								{suivi.carnet.map((fiche) => (
									<LigneBouton
										key={fiche.id}
										titre={fiche.nom}
										precision={fiche.precision}
										valeur={intervenantId === fiche.id ? 'choisi' : undefined}
										onClick={() => setIntervenantId(fiche.id)}
									/>
								))}
							</ListeAnalyses>

							<Toolbar className="flex-wrap" size="md">
								<Button
									variant="transparent"
									outline={false}
									hoverable={false}
									rounded
									className="verre verre-bouton font-medium"
									disabled={suivi.enCours || quand === ''}
									onClick={() => suivi.onRemettre(quand, intervenantId, attendu)}
								>
									Déclarer ce dossier remis
								</Button>
							</Toolbar>
						</>
					) : null}

					{remise.etat === 'REMIS' ? (
						<>
							<Input
								size="lg"
								type="date"
								value={quand}
								onChange={setQuand}
								infoMessage="La date du FAIT, pas celle de la saisie."
							/>
							<Toolbar className="flex-wrap" size="md">
								<Button
									variant="transparent"
									outline={false}
									hoverable={false}
									rounded
									className="verre verre-bouton font-medium"
									disabled={suivi.enCours || quand === ''}
									onClick={() => suivi.onRetour(quand)}
								>
									Consigner un retour de votre conseil
								</Button>
								<Button
									variant="transparent"
									outline={false}
									hoverable={false}
									rounded
									className="verre verre-bouton font-medium"
									onClick={() => setCloture(!cloture)}
								>
									{cloture ? 'Ne pas clore' : 'Mettre fin à ce suivi'}
								</Button>
							</Toolbar>
						</>
					) : null}

					{remise.etat === 'REVENU' ? (
						<Toolbar className="flex-wrap" size="md">
							<Button
								variant="transparent"
								outline={false}
								hoverable={false}
								rounded
								className="verre verre-bouton font-medium"
								onClick={() => setCloture(!cloture)}
							>
								{cloture ? 'Ne pas clore' : 'Mettre fin à ce suivi'}
							</Button>
						</Toolbar>
					) : null}

					{/* ⚠️ SANS CET ÉTAT, UN DOSSIER SANS RETOUR RESTERAIT OUVERT POUR
					    TOUJOURS, et un suivi dont on ne peut pas sortir est un mur. */}
					{cloture && remise.etat !== 'CLOS' ? (
						<>
							<Input
								size="lg"
								type="date"
								value={quand}
								onChange={setQuand}
								infoMessage="La date du FAIT, pas celle de la saisie."
							/>
							<Input
								size="lg"
								value={motif}
								onChange={setMotif}
								placeholder="Pourquoi vous mettez fin à ce suivi"
								infoMessage="En toutes lettres : c’est cette phrase qui se relira dans un an."
							/>
							<Toolbar className="flex-wrap" size="md">
								<Button
									variant="transparent"
									outline={false}
									hoverable={false}
									rounded
									className="verre verre-bouton font-medium"
									disabled={suivi.enCours || quand === '' || motif.trim() === ''}
									onClick={() => suivi.onClore(quand, motif)}
								>
									Clore le suivi
								</Button>
							</Toolbar>
						</>
					) : null}
				</Carte>
			)}
		</div>
	);
}
