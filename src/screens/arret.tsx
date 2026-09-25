import type { ReactNode } from 'react';
import { Button, Segmented, SegmentedButton, Surface, Toolbar } from '@cladd-ui/react';
import { AlertTriangleIcon, InfoIcon } from 'lucide-react';
import {
	QUESTIONS_PREVOL,
	prevolFranchi,
	questionsDeclarees,
	questionsSansReponse,
	type ClePrevol,
	type ReponsePrevol,
	type ReponsesPrevol
} from '../lib/verticales/recouvrement/prevol';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	Decompte,
	Lien,
	PageEcran,
	SectionEcran,
	dateCourte,
	eurosCentimes,
	pluriel,
	type DecompteAffiche,
	type Lecture
} from '../ui';

/**
 * L'ARRÊT D'UN DÉCOMPTE — LE SEUL ÉCRAN PLEIN CADRE DU PRODUIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI IL RECOUVRE TOUT, ET POURQUOI IL EST LE SEUL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le seul geste irréversible du produit mérite le seul écran qui ne montre rien
 * d'autre. Pas de volet de preuve, pas de liste à gauche, pas de seconde
 * décision à portée de doigt : une colonne, trois étages, un bouton.
 *
 * ⚠️ IL N'Y A AUCUN « ANNULER ». Un retour arrière sur ce qui ne s'annule pas
 * est un mensonge d'interface. La sortie de cet écran est son retour, en haut,
 * comme sur n'importe quelle page poussée : on s'en va sans rien figer.
 *
 * ⚠️ ET CE GESTE N'ENTRE JAMAIS DANS UN LOT (D6). Une sélection multiple sur un
 * geste irréversible est une invitation à figer quinze décomptes dont on n'a lu
 * aucun contrôle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES TROIS ÉTAGES, DANS CET ORDRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. LE CONTRÔLE DE COMPLÉTUDE, CHIFFRÉ. Ce que ce décompte laisse de côté,
 *    facture par facture, en euros, avec DEUX SORTIES DE MÊME POIDS : les
 *    inclure et refaire, ou arrêter sans elles et l'inscrire au journal.
 * 2. LE PRÉ-VOL. Trois faits que le logiciel ne peut pas voir.
 * 3. LE BOUTON, qui porte son montant, sa date et son irréversibilité en toutes
 *    lettres.
 */

export interface AbandonAffiche {
	readonly nature: 'FACTURE_ECARTEE' | 'INTERETS_INEXPLIQUES' | 'PARAMETRE_MANQUANT';
	readonly reference: string;
	readonly montantEnJeu: bigint | null;
	readonly explication: string;
	/** Vrai quand cette facture peut rejoindre la créance sans en quitter une autre. */
	readonly rattachable: boolean;
}

export interface PrescriptionAffichee {
	readonly date: string | null;
	readonly joursRestants: number | null;
	readonly motifInconnue: string | null;
	readonly dureeAnnees: number;
	readonly hypothese: boolean;
}

export interface ArretDeLaCreance {
	readonly debiteur: string;
	readonly arreteAu: string;
	/** Le décompte tel qu'il serait figé. `null` quand il ne se calcule pas. */
	readonly projection: DecompteAffiche | null;
	readonly refusDeCalcul: { readonly motif: string; readonly detail: string } | null;
	readonly abandons: readonly AbandonAffiche[];
	readonly montantAbandonne: bigint;
	readonly nombreNonChiffrables: number;
	readonly controleDesParametres: {
		readonly exerce: boolean;
		readonly total: number;
		readonly clesNonUtilisables: readonly string[];
	};
	readonly prescription: PrescriptionAffichee;
	readonly dernierDecompteId: string | null;
	readonly reponses: ReponsesPrevol;
	readonly onRepondre: (cle: ClePrevol, reponse: ReponsePrevol) => void;
	readonly onInclure: () => void;
	readonly inclusionEnCours: boolean;
	readonly abandonsAssumes: boolean;
	readonly onAssumerAbandons: (valeur: boolean) => void;
	readonly onArreter: () => void;
	readonly enCours: boolean;
	readonly erreur: string | null;
}

/** Ce que l'attente coûte, quatrième partie de tout refus de cet écran (D0). */
function coutDeLAttente(prescription: PrescriptionAffichee): string {
	if (prescription.date === null) {
		return (
			'Ce que l’attente coûte sur ce dossier ne se chiffre pas : aucune date de départ ' +
			'exploitable n’a été trouvée sur ses factures, donc la date limite pour agir en justice n’y est pas ' +
			'surveillée. C’est un angle mort, et il est nommé ici plutôt que tu.'
		);
	}
	const jours = prescription.joursRestants ?? 0;
	const hypothese = prescription.hypothese
		? ` Le secteur du client n’est pas déterminé : le délai le plus court connu (${prescription.dureeAnnees} an) est retenu, et préciser le secteur lèvera cette hypothèse.`
		: '';
	return (
		`Ce que l’attente coûte : rien sur ce décompte, qui ne part à aucun greffe. Sur ce ` +
		`dossier, ce qui court est la date limite pour agir en justice, au ${dateCourte(prescription.date)}, dans ` +
		`${jours} jour${pluriel(jours)}.${hypothese}`
	);
}

/** Le refus en quatre parties, toujours dans cet ordre, et jamais moins de quatre. */
function Refus({
	peutFaire,
	constat,
	ceQuiLeLeve,
	cout,
	geste
}: {
	peutFaire: string;
	constat: string;
	ceQuiLeLeve: string;
	cout: string;
	geste?: ReactNode;
}) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			{/* Ce qu'on peut faire PASSE EN PREMIER. Un refus dont la première ligne
			    dit ce qui manque est un mur, même quand la sortie est écrite dessous. */}
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg">{peutFaire}</p>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{constat}</p>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{ceQuiLeLeve}</p>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{cout}</p>
			{geste ? <div className="flex flex-wrap gap-cladd-3xs">{geste}</div> : null}
		</Surface>
	);
}

export function EcranArret({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<ArretDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					// La créance est une PAGE, en un seul défilement : le décompte y est
					// une section, et n'a plus d'adresse à lui.
					vers: '/app/dossier/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Dossier'
				},
				titre: 'Arrêter le décompte',
				sousTitre:
					pret === null
						? undefined
						: `${pret.debiteur}, au ${dateCourte(pret.arreteAu)}. Un décompte arrêté ne se modifie plus.`
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <CorpsArret donnees={pret} />}
		</PageEcran>
	);
}

function CorpsArret({ donnees }: { donnees: ArretDeLaCreance }) {
	const cout = coutDeLAttente(donnees.prescription);
	const declarees = questionsDeclarees(donnees.reponses);
	const sansReponse = questionsSansReponse(donnees.reponses);
	const prevolOk = prevolFranchi(donnees.reponses);
	const controleOk = donnees.abandons.length === 0 || donnees.abandonsAssumes;
	const rattachables = donnees.abandons.filter((abandon) => abandon.rattachable);

	const atteignable = donnees.projection !== null && controleOk && prevolOk && !donnees.enCours;

	return (
		<>
			{/* ───────────────────────── ÉTAGE 1 ───────────────────────── */}
			<SectionEcran
				titre="Ce que ce décompte laisse de côté"
				legende={
					donnees.abandons.length === 0
						? 'Toutes les factures connues de ce client y figurent'
						: `${donnees.abandons.length} point${pluriel(donnees.abandons.length)} relevé${pluriel(donnees.abandons.length)}, ${eurosCentimes(donnees.montantAbandonne)} en jeu`
				}
			>
				{donnees.abandons.length === 0 ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Toutes les factures connues de {donnees.debiteur} sont comprises dans ce décompte :
						aucune somme n’en est écartée. Le contrôle a été refait à l’instant, contre les factures
						d’aujourd’hui.
					</p>
				) : (
					<>
						<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg">
							<AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
							{`Ce décompte ne porte pas ${donnees.abandons.length} élément${pluriel(donnees.abandons.length)} connu${pluriel(donnees.abandons.length)} de ${donnees.debiteur}. ${eurosCentimes(donnees.montantAbandonne)} ne seraient pas réclamés, et ce qui ne figure pas au titre est perdu.`}
						</p>

						{donnees.abandons.map((abandon) => (
							<Surface
								key={`${abandon.nature}-${abandon.reference}`}
								variant="transparent"
								outline={false}
								className="verre-carte rounded-cladd-xl"
								contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
							>
								<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
									<span className="text-cladd-sm font-semibold">{abandon.reference}</span>
									<span className="text-cladd-sm font-semibold tabular-nums">
										{abandon.montantEnJeu === null
											? 'montant non chiffrable'
											: eurosCentimes(abandon.montantEnJeu)}
									</span>
								</div>
								<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
									{abandon.explication}
								</p>
							</Surface>
						))}

						{donnees.nombreNonChiffrables > 0 ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
								{`${donnees.nombreNonChiffrables} de ces point${pluriel(donnees.nombreNonChiffrables)} ne se chiffre${donnees.nombreNonChiffrables > 1 ? 'nt' : ''} pas, et n’entre${donnees.nombreNonChiffrables > 1 ? 'nt' : ''} donc pas dans le total : les fondre dedans ferait passer un abandon qu’on ne sait pas chiffrer pour un abandon de zéro euro.`}
							</p>
						) : null}

						{/* LES DEUX SORTIES, DE MÊME POIDS. Même taille, même variante,
						    même rangée : afficher une perte chiffrée sans offrir de la
						    réparer la rendrait inévitable. */}
						<Toolbar className="flex-wrap" size="md">
							{rattachables.length > 0 ? (
								<Button
									variant="transparent"
									outline={false}
									hoverable={false}
									rounded
									className="verre verre-bouton font-medium"
									disabled={donnees.inclusionEnCours}
									onClick={donnees.onInclure}
								>
									{donnees.inclusionEnCours
										? 'Rattachement en cours…'
										: `Inclure ${rattachables.length} facture${pluriel(rattachables.length)} et refaire le décompte`}
								</Button>
							) : null}
							<Button
								variant="transparent"
								outline={false}
								hoverable={false}
								rounded
								className="verre verre-bouton font-medium"
								onClick={() => donnees.onAssumerAbandons(!donnees.abandonsAssumes)}
							>
								{donnees.abandonsAssumes
									? 'Revenir sur cette décision'
									: 'Arrêter sans elles, et l’inscrire au journal'}
							</Button>
						</Toolbar>

						{donnees.abandonsAssumes ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{`Décision prise : ${eurosCentimes(donnees.montantAbandonne)} resteront hors de ce décompte. Chaque point relevé sera inscrit au journal, avec sa référence et son montant, à la date de l’arrêt.`}
							</p>
						) : null}

						{rattachables.length === 0 ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
								Aucun de ces points ne se répare depuis cet écran : une facture déjà portée par un
								autre dossier ne peut pas rejoindre celui-ci, et la réclamer deux fois exposerait
								les deux dossiers. Aucun geste du produit ne détache aujourd’hui une facture de son
								dossier, et c’est dit ici plutôt que laissé à chercher.
							</p>
						) : null}
					</>
				)}

				{/* ⚠️ LE TROISIÈME ÉTAGE DU CONTRÔLE NE S'EXERCE PAS, ET ON LE DIT.
				    Le taire laisserait croire à un verrou en place. */}
				<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
					{donnees.controleDesParametres.exerce
						? `Les valeurs juridiques exigées par ce document sont contrôlées.`
						: `Le contrôle des valeurs juridiques n’est pas exercé sur ce décompte, et c’est écrit ici plutôt que sous-entendu : aucun document de ce logiciel n’est un acte, donc aucun ne nomme les valeurs dont elle dépendrait. Sur ${donnees.controleDesParametres.total} valeurs au référentiel, ${donnees.controleDesParametres.clesNonUtilisables.length} ne sont pas utilisables en l’état${donnees.controleDesParametres.clesNonUtilisables.length > 0 ? ` : ${donnees.controleDesParametres.clesNonUtilisables.join(', ')}` : ''}.`}
				</p>
			</SectionEcran>

			{/* ───────────────────────── ÉTAGE 2 ───────────────────────── */}
			<SectionEcran
				titre="Trois choses que ce logiciel ne peut pas voir"
				legende={
					prevolOk
						? 'Les trois sont écartées'
						: `${sansReponse.length + declarees.length} sur 3 restent à trancher`
				}
			>
				{QUESTIONS_PREVOL.map((question) => {
					const reponse = donnees.reponses[question.cle];
					return (
						<Surface
							key={question.cle}
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
						>
							<span className="text-cladd-sm font-semibold">{question.question}</span>
							<Segmented className="self-start" activeColor="neutral" activeVariant="solid">
								<SegmentedButton
									active={reponse === 'ECARTE'}
									onClick={() => donnees.onRepondre(question.cle, 'ECARTE')}
								>
									{question.ecarter}
								</SegmentedButton>
								<SegmentedButton
									active={reponse === 'DECLARE'}
									onClick={() => donnees.onRepondre(question.cle, 'DECLARE')}
								>
									{question.declarer}
								</SegmentedButton>
							</Segmented>
							{reponse === 'DECLARE' ? (
								<Refus
									peutFaire={question.peutFaire}
									constat={question.constat}
									ceQuiLeLeve={question.ceQuiLeLeve}
									cout={cout}
								/>
							) : null}
						</Surface>
					);
				})}
			</SectionEcran>

			{/* ───────────────────────── ÉTAGE 3 ───────────────────────── */}
			<SectionEcran
				titre="Le décompte tel qu’il serait figé"
				legende={
					donnees.projection === null
						? 'Il ne se calcule pas en l’état'
						: `Arrêté au ${dateCourte(donnees.arreteAu)}, ${donnees.projection.lignes.length} facture${pluriel(donnees.projection.lignes.length)}`
				}
			>
				{donnees.projection === null ? (
					<Refus
						peutFaire="Ce dossier est ouvert, ses factures se lisent, et rien de ce qui est enregistré n’est touché."
						constat={donnees.refusDeCalcul?.detail ?? 'Le décompte ne se calcule pas en l’état.'}
						ceQuiLeLeve="La donnée nommée ci-dessus, une fois renseignée sur la facture concernée, fait repartir le calcul sans autre geste."
						cout={cout}
					/>
				) : (
					<>
						<Decompte decompte={donnees.projection} />

						{donnees.erreur ? (
							<p role="alert" className="text-cladd-xs leading-relaxed text-cladd-fg">
								{donnees.erreur}
							</p>
						) : null}

						{atteignable ? (
							<div className="flex flex-col gap-cladd-3xs">
								<BoutonPrincipal onClick={donnees.onArreter} disabled={donnees.enCours}>
									{donnees.enCours
										? 'Arrêt en cours…'
										: `Arrêter le décompte au ${dateCourte(donnees.arreteAu)}, ${eurosCentimes(donnees.projection.total)}, définitif`}
								</BoutonPrincipal>
								<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
									Ce décompte sera figé à cette date et ne se modifiera plus. Rejouer plus tard
									produira un nouveau décompte daté, à côté de celui-ci.
								</p>
							</div>
						) : (
							<Refus
								peutFaire={`Le décompte est calculé et chacun de ses postes se lit : ${eurosCentimes(donnees.projection.total)} au ${dateCourte(donnees.arreteAu)}, période par période, refaisable à la main.`}
								constat={
									!controleOk
										? `Ce qui manque est votre décision sur les ${donnees.abandons.length} point${pluriel(donnees.abandons.length)} relevé${pluriel(donnees.abandons.length)} plus haut : le titre ne porte que sur les sommes qu’il chiffre.`
										: declarees.length > 0
											? `Ce qui manque est la levée de ${declarees.length} fait${pluriel(declarees.length)} que vous venez de déclarer : il change ce que le décompte chiffre, et un décompte figé ne se corrige plus.`
											: `Ce qui manque est une réponse aux ${sansReponse.length} question${pluriel(sansReponse.length)} ci-dessus. Une question sans réponse ne franchit rien : « personne n’a répondu » n’est pas « il n’y en a pas ».`
								}
								ceQuiLeLeve={
									!controleOk
										? 'Les deux sorties du premier étage lèvent ce refus, et elles pèsent autant l’une que l’autre.'
										: 'Chacune des trois questions se répond d’un doigt, et l’arrêt redevient atteignable dès que les trois sont écartées.'
								}
								cout={cout}
							/>
						)}
					</>
				)}

				{donnees.dernierDecompteId !== null ? (
					<BoutonSecondaire
						as={Lien}
						to="/app/decompte/$id"
						params={{ id: donnees.dernierDecompteId } as never}
					>
						Voir le dernier décompte déjà arrêté
					</BoutonSecondaire>
				) : null}
			</SectionEcran>
		</>
	);
}
