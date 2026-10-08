import { useState } from 'react';
import { Checkbox, Popup, PopupContent } from '@cladd-ui/react';
import {
	QUESTIONS_PREVOL,
	QUESTION_CONTESTATION,
	prevolFranchi,
	type ClePrevol,
	type ReponsePrevol,
	type ReponsesPrevol
} from '../lib/verticales/recouvrement/prevol';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	ChiffreHero,
	EnTeteDeGroupe,
	LigneBouton,
	LigneFixe,
	LignesDuDecompte,
	ListeAnalyses,
	ListeDeRangees,
	PageEcran,
	RangeeDepliable,
	RangeeLien,
	SectionsDepliables,
	conventionLisible,
	dateCourte,
	eurosCentimes,
	pluriel,
	type DecompteAffiche,
	type Lecture
} from '../ui';

/**
 * L'ARRÊT D'UN DÉCOMPTE — le seul geste irréversible du produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE L'ÉCRAN ÉTAIT, ET CE QUE LES RÉFÉRENCES EN FONT (01/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Relevé à 393 px : 2 835 px, 469 mots, douze cibles, et le bouton d'arrêt
 * introuvable — à sa place, tant que tout n'était pas tranché, un refus en
 * quatre paragraphes. Trois étages titrés en phrases (« Ce que ce décompte
 * laisse de côté », « Trois choses que ce logiciel ne peut pas voir »), trois
 * segments à deux choix, et le total, le seul chiffre qu'on signe, enfoui au
 * troisième étage dans une carte de décompte complète.
 *
 * Relevé sur Mobbin le même jour, dans les applications qui font signer un
 * montant : Mercury (« Request ») et Chime posent le montant centré, quelques
 * rangées, puis UN bouton qui porte le montant ; Coinbase, Binance et World
 * App précèdent un geste irréversible de trois affirmations à cocher, et le
 * bouton reste inerte tant qu'elles ne le sont pas.
 *
 * D'où l'écran, dans l'ordre où on le lit :
 *   1. le total, centré, avec le client et la date d'arrêté ;
 *   2. ses trois postes en rangées ;
 *   3. ce qui est laissé de côté, s'il y en a, avec ses DEUX SORTIES DE MÊME
 *      POIDS — les inclure, ou arrêter sans elles et l'inscrire au journal ;
 *   4. trois cases à cocher, ce que le logiciel ne peut pas voir ;
 *   5. le bouton, qui porte son montant, et son irréversibilité en clair ;
 *   6. le détail par facture, les limites du contrôle et le dernier décompte,
 *      en rangées.
 *
 * ⚠️ IL N'Y A AUCUN « ANNULER ». Un retour arrière sur ce qui ne s'annule pas
 * est un mensonge d'interface : la sortie est le retour, en haut.
 *
 * ⚠️ ET CE GESTE N'ENTRE JAMAIS DANS UN LOT (D6). Une sélection multiple sur un
 * geste irréversible est une invitation à figer quinze décomptes dont on n'a lu
 * aucun contrôle.
 *
 * ⚠️ LE REFUS EN QUATRE PARTIES (D0) EST TENU, À L'ENDROIT OÙ LE PRODUIT DIT
 * NON. Une case pas encore cochée n'est pas un refus : c'est le chemin, et la
 * ligne sous le bouton dit ce qui reste. Le refus, c'est « l'un de ces points
 * est faux » et « ce décompte ne se calcule pas » : là, les quatre parties
 * s'écrivent dans l'ordre — ce qu'on peut faire, ce qui manque, ce qui le
 * lève, ce que l'attente coûte.
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
			'Ce que l’attente coûte ne se chiffre pas : aucune date de départ exploitable n’a été ' +
			'trouvée sur ses factures, donc la date limite pour agir en justice n’est pas surveillée ' +
			'sur ce dossier.'
		);
	}
	const jours = prescription.joursRestants ?? 0;
	const hypothese = prescription.hypothese
		? ` Le secteur du client n’étant pas déterminé, le délai le plus court connu (${prescription.dureeAnnees} an) est retenu ; préciser le secteur lèvera cette hypothèse.`
		: '';
	return (
		`Attendre ne coûte rien sur ce décompte, qui ne part à aucun greffe. Ce qui court, c’est ` +
		`la date limite pour agir en justice : le ${dateCourte(prescription.date)}, dans ${jours} ` +
		`jour${pluriel(jours)}.${hypothese}`
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
					// une rangée, et n'a plus d'adresse à lui.
					vers: '/app/dossier/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Dossier'
				},
				// ⚠️ PLUS DE SOUS-TITRE. Le client et la date sont sous le total, et
				// l'irréversibilité sous le bouton, là où elle se lit au moment du geste.
				titre: 'Arrêter le décompte'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <CorpsArret donnees={pret} />}
		</PageEcran>
	);
}

/** Les rangées qui se consultent : le détail, les limites du contrôle, le dernier arrêté. */
function RangeesDeConsultation({
	donnees,
	projection
}: {
	donnees: ArretDeLaCreance;
	projection: DecompteAffiche | null;
}) {
	const controle = donnees.controleDesParametres;
	return (
		<ListeDeRangees>
			{projection === null ? null : (
				<RangeeDepliable
					cle="factures"
					famille="ARGENT"
					titre="Détail par facture"
					valeur={`${projection.lignes.length} facture${pluriel(projection.lignes.length)}`}
				>
					{/* Sans la convention, le chiffre n'est pas défendable : deux
					    conventions donnent deux totaux différents. */}
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Pénalités calculées en {conventionLisible(projection.convention)}, période par période.
					</p>
					<LignesDuDecompte lignes={projection.lignes} />
				</RangeeDepliable>
			)}

			{/* ⚠️ LE CONTRÔLE DES VALEURS JURIDIQUES NE S'EXERCE PAS, ET ON LE DIT. Le
			    taire laisserait croire à un verrou en place. */}
			<RangeeDepliable
				cle="valeurs"
				famille="MACHINE"
				titre="Valeurs de loi"
				valeur={controle.exerce ? 'contrôlées' : 'non contrôlées'}
			>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					{controle.exerce
						? 'Les valeurs juridiques exigées par ce document sont contrôlées.'
						: `Le contrôle des valeurs juridiques n’est pas exercé sur ce décompte : aucun document de ce logiciel n’est un acte, donc aucun ne nomme les valeurs dont ce contrôle dépendrait. Sur ${controle.total} valeurs au référentiel, ${controle.clesNonUtilisables.length} ne sont pas utilisables en l’état${controle.clesNonUtilisables.length > 0 ? ` : ${controle.clesNonUtilisables.join(', ')}` : ''}.`}
				</p>
			</RangeeDepliable>

			{donnees.dernierDecompteId === null ? null : (
				<RangeeLien
					vers="/app/decompte/$id"
					parametres={{ id: donnees.dernierDecompteId }}
					famille="PAPIERS"
					titre="Dernier décompte arrêté"
				/>
			)}
		</ListeDeRangees>
	);
}

/**
 * CE QUE CE DÉCOMPTE LAISSE DE CÔTÉ, chiffré facture par facture.
 *
 * ⚠️ LES DEUX SORTIES, DE MÊME POIDS : même bouton, même largeur, l'une sous
 * l'autre. Afficher une perte chiffrée sans offrir de la réparer la rendrait
 * inévitable ; n'offrir que la réparation ferait de l'abandon une faute.
 */
function LaisseDeCote({ donnees }: { donnees: ArretDeLaCreance }) {
	const rattachables = donnees.abandons.filter((abandon) => abandon.rattachable);
	const nonChiffrables = donnees.nombreNonChiffrables;

	const phrase = donnees.abandonsAssumes
		? `Choix fait : ${eurosCentimes(donnees.montantAbandonne)} resteront hors du décompte. Chaque point sera inscrit au journal, avec sa référence et son montant, à la date de l’arrêt.`
		: [
				'Ce qui n’est pas dans le décompte ne sera pas réclamé.',
				nonChiffrables > 0
					? `${nonChiffrables} point${pluriel(nonChiffrables)} ne se chiffre${nonChiffrables > 1 ? 'nt' : ''} pas et n’entre${nonChiffrables > 1 ? 'nt' : ''} pas dans le total.`
					: null,
				rattachables.length === 0
					? 'Aucun ne se répare d’ici : une facture déjà portée par un autre dossier ne peut pas rejoindre celui-ci.'
					: null
			]
				.filter((morceau) => morceau !== null)
				.join(' ');

	return (
		<section className="flex flex-col gap-cladd-3xs">
			<EnTeteDeGroupe
				libelle="Laissé de côté"
				nombre={donnees.abandons.length}
				total={donnees.montantAbandonne}
			/>
			<ListeAnalyses>
				{donnees.abandons.map((abandon) => (
					<LigneFixe
						key={`${abandon.nature}-${abandon.reference}`}
						genre="contenu"
						titre={abandon.reference}
						// ⚠️ UNE FACTURE ÉCARTÉE N'A PAS DE SOUS-LIGNE. Son explication
						// redisait la référence et le montant de la rangée (« La facture
						// F-2023-908 (740,00 €) est connue… »), et sa conséquence est la
						// phrase sous la liste. Les autres natures, elles, n'ont que leur
						// explication pour dire ce qu'elles sont.
						{...(abandon.nature === 'FACTURE_ECARTEE'
							? {}
							: { precision: abandon.explication, lignes: 2 as const })}
						valeur={
							abandon.montantEnJeu === null ? 'non chiffrable' : eurosCentimes(abandon.montantEnJeu)
						}
					/>
				))}
			</ListeAnalyses>
			<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">{phrase}</p>
			<div className="flex flex-col gap-cladd-3xs">
				{rattachables.length > 0 && !donnees.abandonsAssumes ? (
					<BoutonSecondaire
						pleineLargeur
						disabled={donnees.inclusionEnCours}
						onClick={donnees.onInclure}
					>
						{donnees.inclusionEnCours
							? 'Rattachement en cours…'
							: `Inclure ${rattachables.length} facture${pluriel(rattachables.length)}`}
					</BoutonSecondaire>
				) : null}
				<BoutonSecondaire
					pleineLargeur
					onClick={() => donnees.onAssumerAbandons(!donnees.abandonsAssumes)}
				>
					{donnees.abandonsAssumes ? 'Revenir sur ce choix' : 'Arrêter sans elles'}
				</BoutonSecondaire>
			</div>
		</section>
	);
}

function CorpsArret({ donnees }: { donnees: ArretDeLaCreance }) {
	const [ouvertes, setOuvertes] = useState<readonly string[]>([]);
	const [siFaux, setSiFaux] = useState(false);

	const cout = coutDeLAttente(donnees.prescription);
	const projection = donnees.projection;

	/*
	  ═════════════════════════════════════════════════════════════════════════
	  LE DÉCOMPTE NE SE CALCULE PAS : le refus en quatre parties, et rien d'autre
	  ═════════════════════════════════════════════════════════════════════════

	  Ni cases ni bouton : il n'y a rien à figer. Ce qu'on peut faire passe en
	  premier, sous le titre — un refus dont la première ligne dit ce qui manque
	  est un mur.
	*/
	if (projection === null) {
		return (
			<SectionsDepliables ouvertes={ouvertes} onOuvertesChange={setOuvertes}>
				<div className="flex flex-col items-center gap-cladd-3xs py-cladd-3xs text-center">
					<p className="text-cladd-md font-bold tracking-tight">Ce décompte ne se calcule pas</p>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg">
						Ce dossier reste ouvert, ses factures se lisent, et rien de ce qui est enregistré n’est
						touché.
					</p>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						{donnees.refusDeCalcul?.detail ?? 'Le décompte ne se calcule pas en l’état.'}
					</p>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						La donnée nommée ci-dessus, renseignée sur la facture concernée, fait repartir le calcul
						sans autre geste.
					</p>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{cout}</p>
				</div>
				<RangeesDeConsultation donnees={donnees} projection={null} />
			</SectionsDepliables>
		);
	}

	const restantes = QUESTIONS_PREVOL.filter(
		(question) => donnees.reponses[question.cle] !== 'ECARTE'
	).length;
	const controleOk = donnees.abandons.length === 0 || donnees.abandonsAssumes;
	const atteignable = controleOk && prevolFranchi(donnees.reponses) && !donnees.enCours;

	/** Ce qui reste avant le geste, en une ligne : le chemin, pas un refus. */
	const reste = !controleOk
		? 'Reste votre choix sur ce qui est laissé de côté.'
		: restantes > 0
			? `Reste ${restantes} case${pluriel(restantes)} à cocher.`
			: null;

	const imputation = projection.imputation;

	return (
		<SectionsDepliables ouvertes={ouvertes} onOuvertesChange={setOuvertes}>
			<ChiffreHero
				centimes={projection.total}
				surTitre={donnees.debiteur}
				legende={`Arrêté au ${dateCourte(donnees.arreteAu)}`}
			/>

			<div className="flex flex-col gap-cladd-3xs">
				<ListeAnalyses>
					<LigneFixe
						genre="contenu"
						titre="Principal restant dû"
						valeur={eurosCentimes(projection.principalRestantDu)}
					/>
					<LigneFixe
						genre="contenu"
						titre="Pénalités de retard"
						valeur={eurosCentimes(projection.interets)}
					/>
					<LigneFixe
						genre="contenu"
						titre="Frais de recouvrement"
						valeur={eurosCentimes(projection.indemniteForfaitaire)}
					/>
				</ListeAnalyses>
				{/* Le contrôle de complétude, quand il ne trouve rien, tient en une ligne. */}
				{donnees.abandons.length === 0 ? (
					<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Toutes les factures connues de {donnees.debiteur} y figurent.
					</p>
				) : null}
				{/* L'ordre d'imputation, seulement quand il change le total et n'est pas choisi. */}
				{imputation !== undefined && !imputation.confirme && imputation.totalAutreOrdre !== null ? (
					<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						À confirmer dans vos règles de calcul : la loi prévoit que les paiements remboursent
						d’abord les pénalités, sauf si vos conditions générales disent autrement. Le calcul le
						plus bas est retenu ; l’autre donnerait {eurosCentimes(imputation.totalAutreOrdre)}.
					</p>
				) : null}
			</div>

			{donnees.abandons.length > 0 ? <LaisseDeCote donnees={donnees} /> : null}

			{/*
			  ═════════════════════════════════════════════════════════════════════
			  DEUX CASES — ce que le logiciel ne peut pas voir et qui change le montant
			  ═════════════════════════════════════════════════════════════════════

			  Le gérant coche ce qu'il affirme ; une case vide ne franchit rien. La
			  rangée entière est la cible, comme les factures à cocher de la fiche
			  client.

			  ⚠️ LA CONTESTATION N'EST PLUS UNE CASE À COCHER (08/10/2026, le fondateur :
			  « on ne devrait pas bloquer »). Elle se déclare dessous, facultative : elle
			  s'inscrit au journal de l'arrêt, et le décompte se fige quand même.
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<EnTeteDeGroupe
					libelle="À cocher avant d’arrêter"
					nombre={QUESTIONS_PREVOL.length}
					total={null}
				/>
				<ListeAnalyses>
					{QUESTIONS_PREVOL.map((question) => {
						const cochee = donnees.reponses[question.cle] === 'ECARTE';
						return (
							<LigneBouton
								key={question.cle}
								genre="contenu"
								titre={question.ecarter}
								precision={question.pourquoi}
								lignes={2}
								icone={
									<Checkbox as="span" size="md" checked={cochee} aria-label={question.ecarter} />
								}
								onClick={() => donnees.onRepondre(question.cle, cochee ? 'DECLARE' : 'ECARTE')}
							/>
						);
					})}
				</ListeAnalyses>
				<ListeAnalyses>
					<LigneBouton
						genre="contenu"
						titre={QUESTION_CONTESTATION.declarer}
						precision={QUESTION_CONTESTATION.pourquoi}
						lignes={2}
						icone={
							<Checkbox
								as="span"
								size="md"
								checked={donnees.reponses.CONTESTATION_HORS_LOGICIEL === 'DECLARE'}
								aria-label={QUESTION_CONTESTATION.declarer}
							/>
						}
						onClick={() =>
							donnees.onRepondre(
								QUESTION_CONTESTATION.cle,
								donnees.reponses.CONTESTATION_HORS_LOGICIEL === 'DECLARE' ? 'ECARTE' : 'DECLARE'
							)
						}
					/>
				</ListeAnalyses>
				<BoutonTexte className="self-start" onClick={() => setSiFaux(true)}>
					Si l’un de ces points est faux
				</BoutonTexte>
			</section>

			<div className="flex flex-col gap-cladd-3xs">
				{donnees.erreur ? (
					<p role="alert" className="text-cladd-xs leading-relaxed text-cladd-fg">
						{donnees.erreur}
					</p>
				) : null}
				<BoutonPrincipal pleineLargeur disabled={!atteignable} onClick={donnees.onArreter}>
					{donnees.enCours ? 'Arrêt en cours…' : `Arrêter à ${eurosCentimes(projection.total)}`}
				</BoutonPrincipal>
				{reste === null ? null : (
					<p className="text-center text-cladd-2xs text-cladd-fg">{reste}</p>
				)}
				{/* L'IRRÉVERSIBILITÉ EN TOUTES LETTRES, sous le geste qu'elle qualifie. */}
				<p className="text-center text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					Définitif : un décompte arrêté ne se modifie plus. Le refaire plus tard en produira un
					nouveau, daté.
				</p>
			</div>

			<RangeesDeConsultation donnees={donnees} projection={projection} />

			{/*
			  LE REFUS, À L'ENDROIT OÙ IL A LIEU (D0). Pour chaque point : ce que le
			  logiciel fait déjà, ce qui manque, ce qui le lève — au constat, jamais à
			  l'impératif —, puis une fois ce que l'attente coûte.
			*/}
			<Popup
				open={siFaux}
				onOpenChange={setSiFaux}
				headerLeft={
					<span className="px-2 pb-1 text-cladd-xs font-semibold">
						Si l’un de ces points est faux
					</span>
				}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					<div className="flex flex-col gap-cladd-2xs">
						{QUESTIONS_PREVOL.map((question) => (
							<div key={question.cle} className="flex flex-col gap-1">
								<p className="text-cladd-xs font-semibold">{question.question}</p>
								<p className="text-cladd-2xs leading-relaxed text-cladd-fg">{question.peutFaire}</p>
								<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
									{question.constat}
								</p>
								<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
									{question.ceQuiLeLeve}
								</p>
							</div>
						))}
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg">
							Une contestation, elle, ne retient pas l’arrêt : le décompte constate un compte à une
							date. Déclarée, elle s’inscrit au journal de l’arrêt.
						</p>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{cout}</p>
					</div>
				</PopupContent>
			</Popup>
		</SectionsDepliables>
	);
}
