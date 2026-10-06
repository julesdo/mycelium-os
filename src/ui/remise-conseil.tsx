import { useState, type ReactNode } from 'react';
import {
	Button,
	CollapsibleIndicator,
	CollapsiblePanel,
	CollapsibleRoot,
	CollapsibleTrigger,
	Input,
	Popup,
	PopupContent,
	SectionTitle,
	Surface
} from '@cladd-ui/react';
import { ChevronDownIcon, InfoIcon } from 'lucide-react';
import {
	PeriodesDInterets,
	ReglementsImputes,
	type ImputationAffichee,
	type SegmentAffiche
} from './decompte';
import { dateCourte, eurosCentimes, pluriel } from './format';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { ListeAnalyses, LigneBouton, LigneFixe } from './navigation';
import {
	ChoixIntervenant,
	type FicheASaisir,
	type FicheIntervenant,
	type ProfessionnelsProposes
} from './choix-intervenant';
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
		/** Ce que les règlements ont éteint : sans eux, les périodes ne font pas les intérêts. */
		readonly imputations?: readonly ImputationAffichee[];
	}[];
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
	/** Le carnet du gérant : ceux qu'il a déjà retenus. */
	readonly carnet: readonly FicheIntervenant[];
	/**
	 * Les professionnels près du client, proposés sans rien saisir (01/10/2026).
	 * Avant, la remise ne montrait que le carnet — « le produit ne propose JAMAIS
	 * de nom » —, ce qui obligeait à passer par les réglages pour pouvoir nommer
	 * un avocat. Le fondateur a demandé la liste ; rien n'y est présélectionné.
	 */
	readonly professionnels: ProfessionnelsProposes;
	readonly onAjouterFiche: (fiche: FicheASaisir) => void;
	/** Déclare la remise d’un geste : le suivi naît là, sans « préparer » d’abord. */
	readonly onRemettre: (remisLe: string, intervenantId: string | null, attendu: string) => void;
	readonly onRetour: (revenuLe: string) => void;
	readonly onClore: (closLe: string, motif: string) => void;
	readonly enCours: boolean;
	readonly erreur: string | null;
}

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
								<Poste libelle="dont pénalités de retard dues" montant={suivi.ecart.interets} />
								<Poste
									libelle="dont frais de recouvrement"
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
										<div className="flex flex-col gap-cladd-3xs pt-cladd-3xs">
											<PeriodesDInterets segments={facture.segments} />
											{facture.imputations !== undefined && facture.imputations.length > 0 ? (
												<ReglementsImputes imputations={facture.imputations} />
											) : null}
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
					? 'La date limite pour agir en justice ne se calcule pas sur ce dossier : aucune date de départ exploitable n’a été trouvée sur ses factures. C’est un angle mort, et il est nommé ici plutôt que tu.'
					: `La date limite pour agir en justice tombe le ${dateCourte(suivi.prescription.date)}, dans ${jours ?? 0} jour${pluriel(jours ?? 0)}, et elle ne s’arrête pas parce que le dossier est parti.`}
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

/** Une date du FAIT, demandée et jamais supposée, avec ce qu'elle fait courir. */
function ChampDuFait({
	quand,
	onQuand,
	consequence
}: {
	quand: string;
	onQuand: (quand: string) => void;
	consequence: string;
}) {
	return (
		<PopupContent>
			<SectionTitle>Quel jour</SectionTitle>
			{/* ⚠️ LA DATE EST DEMANDÉE, PAS SUPPOSÉE. C'est la date du FAIT : un
			    gérant qui enregistre le 20 mars une remise du 3 doit voir le
			    compteur partir du 3. Le champ part sur aujourd'hui parce que
			    c'est le cas le plus fréquent, et il se corrige d'un geste. */}
			<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
				<Input
					size="lg"
					type="date"
					value={quand}
					onChange={onQuand}
					infoMessage="La date du FAIT, pas celle de la saisie."
				/>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					{quand === '' ? 'Sans date, rien ne peut être compté.' : consequence}
				</p>
			</div>
		</PopupContent>
	);
}

/** Le refus du serveur, là où le geste a été fait : dans la feuille. */
function RefusDansLaFeuille({ erreur }: { erreur: string | null }) {
	if (erreur === null) return null;
	return (
		<p role="alert" className="text-cladd-xs leading-relaxed text-cladd-fg">
			{erreur}
		</p>
	);
}

/**
 * LA REMISE, EN UNE FEUILLE : À QUI, QUEL JOUR, CE QU'ON ATTEND.
 *
 * ⚠️ « PERSONNE » EST UN CHOIX, PAS UN DÉFAUT MANQUANT : un dossier se remet
 * sans nommer qui que ce soit. La rangée « À qui » ouvre la feuille où le
 * carnet et les professionnels près du client sont proposés, sans
 * présélection.
 */
function FeuilleRemise({ suivi, onFermer }: { suivi: SuiviConseilAffiche; onFermer: () => void }) {
	const [quand, setQuand] = useState(aujourdHuiISO);
	const [attendu, setAttendu] = useState('');
	const [intervenantId, setIntervenantId] = useState<string | null>(null);
	const [choixOuvert, setChoixOuvert] = useState(false);

	function retenir(id: string | null) {
		if (id === null) return;
		setIntervenantId(id);
		setChoixOuvert(false);
	}

	return (
		<>
			<Popup
				open
				onOpenChange={(ouvert) => {
					if (!ouvert) onFermer();
				}}
				headerLeft={
					<span className="px-2 pb-1 text-cladd-sm font-semibold">Je l’ai remis à mon conseil</span>
				}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					<ListeAnalyses>
						<LigneBouton
							titre="À qui"
							valeur={
								intervenantId === null
									? 'Sans nommer personne'
									: (suivi.carnet.find((fiche) => fiche._id === intervenantId)?.nom ??
										'Fiche retirée')
							}
							onClick={() => {
								suivi.professionnels.onDemander();
								setChoixOuvert(true);
							}}
						/>
					</ListeAnalyses>
				</PopupContent>

				<ChampDuFait
					quand={quand}
					onQuand={setQuand}
					consequence={`Le temps passé chez votre conseil se comptera depuis le ${dateCourte(quand)}.`}
				/>

				<PopupContent>
					<SectionTitle>Ce que vous attendez</SectionTitle>
					<div className="mt-cladd-3xs">
						<Input
							size="lg"
							value={attendu}
							onChange={setAttendu}
							placeholder="Facultatif, par exemple son avis"
						/>
					</div>
				</PopupContent>

				<PopupContent>
					<div className="flex flex-col gap-cladd-3xs">
						<RefusDansLaFeuille erreur={suivi.erreur} />
						<BoutonPrincipal
							pleineLargeur
							loading={suivi.enCours}
							readOnly={suivi.enCours || quand === ''}
							onClick={() => suivi.onRemettre(quand, intervenantId, attendu)}
						>
							Je l’ai remis
						</BoutonPrincipal>
					</div>
				</PopupContent>
			</Popup>

			<ChoixIntervenant
				titre="À qui remettre le dossier"
				sansPersonne={{
					titre: 'Sans nommer personne',
					precision: 'Le dossier se remet quand même'
				}}
				carnet={suivi.carnet}
				choisi={intervenantId}
				ouverte={choixOuvert}
				propositions={suivi.professionnels.propositions}
				enCours={suivi.professionnels.enCours}
				erreur={suivi.professionnels.erreur}
				onFermer={() => setChoixOuvert(false)}
				onChoisir={(id) => {
					setIntervenantId(id);
					setChoixOuvert(false);
				}}
				onRetenirEtude={(etude) => void suivi.professionnels.onRetenirEtude(etude).then(retenir)}
				onRetenirAvocat={(avocat) => void suivi.professionnels.onRetenirAvocat(avocat).then(retenir)}
				onAjouter={suivi.onAjouterFiche}
			/>
		</>
	);
}

/** Le conseil a rendu quelque chose : seul le jour se demande. */
function FeuilleRetour({ suivi, onFermer }: { suivi: SuiviConseilAffiche; onFermer: () => void }) {
	const [quand, setQuand] = useState(aujourdHuiISO);
	return (
		<Popup
			open
			onOpenChange={(ouvert) => {
				if (!ouvert) onFermer();
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">Mon conseil a répondu</span>}
			contentClassName="max-w-lg"
		>
			<ChampDuFait
				quand={quand}
				onQuand={setQuand}
				consequence={`Le retour sera consigné au ${dateCourte(quand)}.`}
			/>
			<PopupContent>
				<div className="flex flex-col gap-cladd-3xs">
					<RefusDansLaFeuille erreur={suivi.erreur} />
					<BoutonPrincipal
						pleineLargeur
						loading={suivi.enCours}
						readOnly={suivi.enCours || quand === ''}
						onClick={() => suivi.onRetour(quand)}
					>
						Consigner le retour
					</BoutonPrincipal>
				</div>
			</PopupContent>
		</Popup>
	);
}

/**
 * ⚠️ SANS CETTE SORTIE, UN DOSSIER SANS RETOUR RESTERAIT OUVERT POUR TOUJOURS,
 * et un suivi dont on ne peut pas sortir est un mur. Le motif s'écrit en
 * toutes lettres : c'est cette phrase qui se relira dans un an.
 */
function FeuilleCloture({ suivi, onFermer }: { suivi: SuiviConseilAffiche; onFermer: () => void }) {
	const [quand, setQuand] = useState(aujourdHuiISO);
	const [motif, setMotif] = useState('');
	return (
		<Popup
			open
			onOpenChange={(ouvert) => {
				if (!ouvert) onFermer();
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">Mettre fin au suivi</span>}
			contentClassName="max-w-lg"
		>
			<ChampDuFait
				quand={quand}
				onQuand={setQuand}
				consequence={`Le suivi sera clos au ${dateCourte(quand)}.`}
			/>
			<PopupContent>
				<SectionTitle>Pourquoi</SectionTitle>
				<div className="mt-cladd-3xs">
					<Input
						size="lg"
						value={motif}
						onChange={setMotif}
						placeholder="Par exemple, le client a réglé"
						infoMessage="En toutes lettres : c’est cette phrase qui se relira dans un an."
					/>
				</div>
			</PopupContent>
			<PopupContent>
				<div className="flex flex-col gap-cladd-3xs">
					<RefusDansLaFeuille erreur={suivi.erreur} />
					<BoutonPrincipal
						pleineLargeur
						loading={suivi.enCours}
						readOnly={suivi.enCours || quand === '' || motif.trim() === ''}
						onClick={() => suivi.onClore(quand, motif)}
					>
						Clore le suivi
					</BoutonPrincipal>
				</div>
			</PopupContent>
		</Popup>
	);
}

/** Où en est la remise, en rangées qui se lisent. */
function EtatDeLaRemise({ remise }: { remise: RemiseAffichee }) {
	return (
		<ListeAnalyses>
			{remise.remisLe === null ? null : (
				<LigneFixe
					famille="ENVOI"
					genre="contenu"
					titre="Remis à votre conseil"
					precision={remise.intervenant ?? 'Sans intervenant nommé'}
					valeur={dateCourte(remise.remisLe)}
				/>
			)}
			{remise.attendu === null || remise.attendu === '' ? null : (
				<LigneFixe
					famille="QUESTION"
					genre="contenu"
					titre="Attendu"
					precision={remise.attendu}
					lignes={2}
				/>
			)}
			{remise.revenuLe === null ? null : (
				<LigneFixe
					famille="PAPIERS"
					genre="contenu"
					titre="Réponse du conseil"
					valeur={dateCourte(remise.revenuLe)}
				/>
			)}
			{remise.closLe === null ? null : (
				<LigneFixe
					famille="TEMPS"
					genre="contenu"
					titre="Suivi clos"
					precision={remise.motifCloture ?? undefined}
					lignes={2}
					valeur={dateCourte(remise.closLe)}
				/>
			)}
		</ListeAnalyses>
	);
}

type Feuille = 'REMISE' | 'RETOUR' | 'CLOTURE';

/**
 * LA REMISE AU CONSEIL, EN UN GESTE (06/10/2026).
 *
 * Avant : « Préparer un dossier sur ce décompte », puis trois champs posés dans
 * la page, puis « Déclarer ce dossier remis ». Deux boutons pour un seul fait.
 * Désormais UN bouton, « Je l’ai remis à mon conseil », qui ouvre UNE feuille ;
 * le suivi naît quand le gérant la valide.
 *
 * ⚠️ LES FEUILLES SE REFERMENT PAR L'ÉTAT, PAS PAR LE CLIC. Celle de la remise
 * ne s'affiche que tant que rien n'est remis : quand le serveur a accepté, la
 * remise change d'état et la feuille disparaît d'elle-même ; quand il refuse,
 * elle reste ouverte avec le refus et la saisie intacte.
 */
export function RemiseAuConseil({ suivi }: { suivi: SuiviConseilAffiche }) {
	const [feuille, setFeuille] = useState<Feuille | null>(null);
	const fermer = () => setFeuille(null);

	const remise = suivi.remise;
	// Un suivi « préparé » d'avant le 06/10/2026 n'est pas parti : il se remet
	// comme un dossier sans suivi.
	const aRemettre = remise === null || remise.etat === 'PREPARE';
	const ouverte: Feuille | null =
		feuille === 'REMISE' && aRemettre
			? 'REMISE'
			: feuille === 'RETOUR' && remise?.etat === 'REMIS'
				? 'RETOUR'
				: feuille === 'CLOTURE' && remise !== null && remise.etat !== 'CLOS'
					? 'CLOTURE'
					: null;

	return (
		<div className="flex flex-col gap-cladd-2xs">
			{aRemettre ? null : <EtatDeLaRemise remise={remise} />}
			<DeuxMontants suivi={suivi} />
			<CeQuiCourt suivi={suivi} />

			{suivi.erreur !== null && ouverte === null ? (
				<p role="alert" className="text-cladd-xs leading-relaxed text-cladd-fg">
					{suivi.erreur}
				</p>
			) : null}

			{aRemettre ? (
				<BoutonPrincipal pleineLargeur onClick={() => setFeuille('REMISE')}>
					Je l’ai remis à mon conseil
				</BoutonPrincipal>
			) : null}
			{remise?.etat === 'REMIS' ? (
				<BoutonPrincipal pleineLargeur onClick={() => setFeuille('RETOUR')}>
					Mon conseil a répondu
				</BoutonPrincipal>
			) : null}
			{remise !== null && (remise.etat === 'REMIS' || remise.etat === 'REVENU') ? (
				<BoutonTexte className="self-center" onClick={() => setFeuille('CLOTURE')}>
					Mettre fin au suivi
				</BoutonTexte>
			) : null}

			{ouverte === 'REMISE' ? <FeuilleRemise suivi={suivi} onFermer={fermer} /> : null}
			{ouverte === 'RETOUR' ? <FeuilleRetour suivi={suivi} onFermer={fermer} /> : null}
			{ouverte === 'CLOTURE' ? <FeuilleCloture suivi={suivi} onFermer={fermer} /> : null}
		</div>
	);
}
