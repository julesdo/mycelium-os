import { useState } from 'react';
import { Input, Popup, PopupContent, SectionTitle } from '@cladd-ui/react';
import {
	BoutonPrincipal,
	ChoixIntervenant,
	FeuilleVoie,
	LigneBouton,
	ListeAnalyses,
	PageEcran,
	RechercheAvocat,
	RechercheCommissaire,
	SectionEcran,
	SuiviProcedure,
	dateCourte,
	type AvocatAffiche,
	type EtatRechercheAvocat,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type FicheASaisir,
	type FicheIntervenant,
	type Lecture,
	type RepertoireAffiche,
	type SuiviAffiche,
	type VoieAffichee
} from '../../ui';

/**
 * CE QUE LE GÉRANT A DIT DE L'INTERVENANT, AU MOMENT DE DÉCLARER.
 *
 * `null` — il n'a rien dit, et « je le dirai plus tard » ne bloque rien.
 * `{ id: null }` — il a dit « moi-même ».
 * `{ id: … }` — il a nommé une fiche de son carnet.
 *
 * ⚠️ TROIS ÉTATS, PAS DEUX. Confondre « rien dit » avec « moi-même » ferait
 * porter à un silence la valeur d'une réponse — et ferait apparaître un anneau
 * sur une carte que personne n'a choisie, c'est-à-dire une présélection.
 */
export type ChoixDeclare = { readonly id: string | null } | null;

/**
 * « JE L'AI ENGAGÉE LE … » — le seul geste de procédure que ce logiciel offre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA FORMULATION EST LA FONCTIONNALITÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Engager cette procédure » ferait du logiciel l'auteur de l'acte, et du
 * bouton une recommandation. C'est la troisième ligne rouge du projet : « on ne
 * recommande jamais une procédure. Ce serait du conseil juridique. »
 *
 * Ici le gérant DÉCLARE un fait passé — il a déposé sa requête, tel jour — et
 * le logiciel se met à compter les délais qui en découlent. C'est exactement ce
 * qu'un logiciel peut faire sans sortir de son rôle : mesurer le temps.
 *
 * ⚠️ LA DATE EST PRÉ-REMPLIE À AUJOURD'HUI MAIS RESTE MODIFIABLE, et c'est le
 * bon arbitrage : on déclare le plus souvent le jour même, mais les délais
 * courent depuis le FAIT. Une requête déposée lundi et saisie vendredi
 * offrirait quatre jours sur une caducité, en silence — et une caducité fait
 * perdre l'ordonnance définitivement.
 *
 * ⚠️ ET C'EST LE GESTE QUI MANQUAIT À TOUT LE MODULE 4.5. `engagerProcedure`
 * existait, complète et testée, et n'était appelée par personne : aucune
 * créance ne pouvait donc passer à `ENGAGEE`, `suiviDeLaCreance` rendait
 * toujours `null`, la machine à états ne démarrait jamais, et les échéances de
 * caducité n'arrivaient jamais au flux.
 */
function FeuilleDeclaration({
	carnet,
	enCours,
	aujourdHui,
	onFermer,
	onAjouter,
	onOublier,
	onChercherUnCommissaire,
	onChercherUnAvocat,
	onDeclarer
}: {
	carnet: readonly FicheIntervenant[];
	enCours: boolean;
	aujourdHui: string;
	onFermer: () => void;
	onAjouter: (fiche: FicheASaisir) => void;
	onOublier: (intervenantId: string) => void;
	onChercherUnCommissaire: () => void;
	onChercherUnAvocat: () => void;
	onDeclarer: (engageeLe: string, choix: ChoixDeclare) => void;
}) {
	/*
	  ⚠️ TROIS ÉTATS DE FEUILLE, ZÉRO `setState` DANS UN EFFET. Rien ici ne se
	  resynchronise depuis une prop par un effet : la date part de la prop
	  `aujourdHui`, lue une seule fois à l'initialisation, le choix part à « rien
	  dit », et le carnet part fermé. La remise à zéro entre deux voies se fait
	  par la `key` de ce composant, côté appelant : un effet qui resynchroniserait
	  cette prop dans l'état produirait un rendu de plus et, le jour où elle
	  change pour une autre raison, effacerait une saisie.
	*/
	const [quand, setQuand] = useState(aujourdHui);
	const [choix, setChoix] = useState<ChoixDeclare>(null);
	const [carnetOuvert, setCarnetOuvert] = useState(false);

	const nomChoisi =
		choix === null
			? 'Je le dirai plus tard'
			: choix.id === null
				? 'Moi-même'
				: (carnet.find((fiche) => fiche._id === choix.id)?.nom ?? 'Fiche retirée');

	return (
		<>
			<Popup
				open
				onOpenChange={(ouvert) => {
					if (!ouvert) onFermer();
				}}
				headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">Je l’ai engagée</span>}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					<SectionTitle>Quel jour</SectionTitle>
					{/*
					  ⚠️ LA DATE VIENT DU CHAMP, JAMAIS DE L'HORLOGE. Les délais courent
					  depuis le FAIT. Une requête déposée lundi et saisie vendredi
					  offrirait quatre jours sur une caducité, en silence, et une
					  caducité fait perdre l'ordonnance définitivement.
					*/}
					<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
						<Input
							size="lg"
							type="date"
							value={quand}
							onChange={setQuand}
							infoMessage="La date du FAIT, pas celle de la saisie."
						/>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
							{quand === ''
								? 'Sans date, aucun délai ne peut être compté.'
								: `Les délais de cette procédure courront depuis le ${dateCourte(quand)}.`}
						</p>
					</div>
				</PopupContent>

				<PopupContent>
					<SectionTitle>Qui a fait l’acte</SectionTitle>
					<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
						<ListeAnalyses>
							<LigneBouton
								titre="Qui fait l’acte"
								valeur={nomChoisi}
								onClick={() => setCarnetOuvert(true)}
							/>
						</ListeAnalyses>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
							Cette réponse peut attendre : elle ne change aucun délai, et se dit plus tard sur cet
							écran.
						</p>
					</div>
				</PopupContent>

				<PopupContent>
					{/*
					  ⚠️ `BoutonPrincipal`, PAS UN `Button color="brand"`. Mesuré au
					  navigateur : `color="brand"` sur le variant par défaut rend un fond
					  transparent avec du texte bleu, c'est-à-dire quelque chose qui se lit
					  comme un lien. L'action qui met des délais à courir ne peut pas être
					  le seul élément de la feuille qu'on ne voit pas.
					*/}
					<BoutonPrincipal
						pleineLargeur
						loading={enCours}
						readOnly={enCours || quand === ''}
						onClick={() => onDeclarer(quand, choix)}
					>
						Je l’ai engagée
					</BoutonPrincipal>
				</PopupContent>
			</Popup>

			{/*
			  Une feuille par-dessus la feuille : Cladd les empile comme iOS, et
			  chacune garde son propre piège à focus. Elles sont SŒURS dans l'arbre,
			  jamais imbriquées — c'est la forme que la documentation du kit montre.
			*/}
			<ChoixIntervenant
				carnet={carnet}
				choisi={choix === null ? undefined : choix.id}
				ouverte={carnetOuvert}
				onFermer={() => setCarnetOuvert(false)}
				onChoisir={(intervenantId) => {
					setChoix({ id: intervenantId });
					setCarnetOuvert(false);
				}}
				onAjouter={onAjouter}
				onOublier={onOublier}
				onChercherUnCommissaire={onChercherUnCommissaire}
				onChercherUnAvocat={onChercherUnAvocat}
			/>
		</>
	);
}

/** Ce que l'écran affiche : ce qui court ou les voies envisageables, le carnet, et l'état des feuilles et des recherches, que la route pilote. */
export interface ProcedureDeLaCreance {
	readonly debiteur: string;
	/** Ce qui court, ou `null` quand aucune voie n'est engagée. */
	readonly suivi: SuiviAffiche | null;
	readonly procedures: readonly VoieAffichee[];
	readonly carnet: readonly FicheIntervenant[];
	/** L'intervenant rattaché au dossier, relu par identifiant. `null` : moi-même. */
	readonly intervenantChoisi: string | null;
	readonly nomIntervenant: string | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly aujourdHui: string;
	// Les feuilles, et ce qu'elles montrent.
	readonly voieOuverte: VoieAffichee | null;
	readonly voieDeclaree: VoieAffichee | null;
	readonly carnetOuvert: boolean;
	readonly rechercheOuverte: boolean;
	readonly etatRecherche: EtatRechercheCommissaire;
	readonly rechercheAvocatOuverte: boolean;
	readonly repertoire: RepertoireAffiche | null;
	readonly barreau: string;
	readonly specialite: string;
	readonly etatAvocats: EtatRechercheAvocat;
	// Les gestes.
	readonly onOuvrirVoie: (cle: string) => void;
	readonly onFermerVoie: () => void;
	readonly onDeclarerVoie: () => void;
	readonly onFermerDeclaration: () => void;
	readonly onDeclarer: (procedure: string, engageeLe: string, choix: ChoixDeclare) => void;
	readonly onConsigner: (cle: string, survenuLe: string) => void;
	readonly onOuvrirCarnet: () => void;
	readonly onFermerCarnet: () => void;
	readonly onRattacher: (intervenantId: string | null) => void;
	readonly onAjouter: (fiche: FicheASaisir) => void;
	readonly onOublier: (intervenantId: string) => void;
	readonly onOuvrirRechercheCommissaire: () => void;
	readonly onFermerRechercheCommissaire: () => void;
	readonly onChercherCommissaire: (departement: string) => void;
	readonly onRetenirEtude: (etude: EtudeAffichee) => void;
	readonly onOuvrirRechercheAvocat: () => void;
	readonly onFermerRechercheAvocat: () => void;
	readonly onChoisirBarreau: (barreau: string) => void;
	readonly onChoisirSpecialite: (specialite: string) => void;
	readonly onRetenirAvocat: (avocat: AvocatAffiche) => void;
}

/**
 * LA PROCÉDURE — ce qui court, et ce qui serait envisageable.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI COURT PASSE AVANT CE QU'ON POURRAIT FAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une procédure déjà engagée fait courir des délais dont un À PEINE DE
 * CADUCITÉ : passé, l'ordonnance est perdue et tout est à reprendre pendant
 * que la prescription court. Mettre la liste des voies envisageables au-dessus
 * reviendrait à faire lire « ce qu'on pourrait engager » avant « ce qui va
 * s'éteindre si personne ne bouge ».
 *
 * Elle ne passe plus seulement APRÈS : dès qu'une voie est engagée, la liste
 * cède toute la place. C'est la même règle, poussée d'un cran — et elle retire
 * du même coup le geste qui permettait d'en déclarer une seconde par-dessus la
 * première, ce qui écrasait la date de la première sans rien dire.
 *
 * ⚠️ ET LES PROCÉDURES INDISPONIBLES SONT MONTRÉES, avec leur motif. Un écran
 * qui masquerait L.126 laisserait croire qu'elle n'existe pas ; le motif dit
 * que ce n'est pas une limite du produit mais une valeur juridique qui manque.
 * Les rangées les listent toutes, et la feuille de chaque voie porte le motif.
 */
export function EcranProcedure({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<ProcedureDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Procédure',
				// ⚠️ PAS DE SOUS-TITRE PENDANT L'ATTENTE. Il disait « Aucune procédure
				// engagée » le temps que le suivi revienne, sur un dossier peut-être
				// engagé depuis des mois.
				sousTitre: pret === null ? undefined : (pret.suivi?.libelle ?? 'Aucune procédure engagée')
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <ContenuProcedure pret={pret} />}
		</PageEcran>
	);
}

/** Le contenu prêt : ce qui court, ou les voies envisageables, puis les feuilles que la route ouvre et referme. */
function ContenuProcedure({ pret }: { pret: ProcedureDeLaCreance }) {
	// Relue une fois : dans le rappel de `onDeclarer`, le compilateur oublie
	// qu'une propriété de `pret` a été vérifiée non nulle. Une constante, il s'en
	// souvient.
	const voieDeclaree = pret.voieDeclaree;

	return (
		<>
			{pret.suivi ? (
				<SectionEcran titre="Ce qui court depuis l’engagement">
					<SuiviProcedure
						suivi={pret.suivi}
						aujourdHui={pret.aujourdHui}
						enCours={pret.enCours}
						onConsigner={pret.onConsigner}
					/>

					{/* ⚠️ LA QUESTION SE POSE APRÈS COUP AUSSI. Un gérant qui a déclaré
					    sans le dire doit pouvoir nommer son intervenant plus tard :
					    sans cette rangée, « je le dirai plus tard » serait un mensonge. */}
					<ListeAnalyses>
						<LigneBouton
							titre="Qui fait l’acte"
							valeur={pret.nomIntervenant ?? 'Moi-même'}
							onClick={pret.onOuvrirCarnet}
						/>
					</ListeAnalyses>
				</SectionEcran>
			) : null}

			{pret.erreur ? <p className="text-cladd-xs text-cladd-fg">{pret.erreur}</p> : null}

			{pret.suivi === null ? (
				<SectionEcran titre="Les voies envisageables">
					{/*
					  ⚠️ UNE RANGÉE PAR VOIE, ET LE DÉROULÉ EN FEUILLE. L'écran empilait
					  une carte de prose par voie : le lecteur devait lire trois
					  paragraphes pour apprendre qu'une voie est indisponible. La rangée
					  dit le verdict ; la feuille porte les étapes, les motifs de blocage
					  et ce qui fait échouer la voie.
					*/}
					<ListeAnalyses>
						{pret.procedures.map((procedure) => (
							<LigneBouton
								key={procedure.cle}
								titre={procedure.nom}
								precision={
									procedure.etapes.length === 0
										? 'aucun délai n’en découle'
										: `${procedure.etapes.length} étapes · ${procedure.conditionsEchec.length} façons d’échouer`
								}
								valeur={procedure.disponible ? 'Envisageable' : 'Indisponible'}
								onClick={() => pret.onOuvrirVoie(procedure.cle)}
							/>
						))}
					</ListeAnalyses>

					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
						Énumérées, jamais classées. Aucune n’est mise en avant.
					</p>
				</SectionEcran>
			) : null}

			<FeuilleVoie
				voie={pret.voieOuverte}
				ouverte={pret.voieOuverte !== null}
				onFermer={pret.onFermerVoie}
				onDeclarer={pret.onDeclarerVoie}
			/>

			{/*
			  ⚠️ LA FEUILLE DE DÉCLARATION SE REMONTE À CHAQUE VOIE, par sa `key` :
			  c'est ce qui remet la date à aujourd'hui et le choix à « rien dit »
			  sans le moindre effet. Ouvrir une voie, refermer, en ouvrir une autre
			  et retrouver la date de la première serait une erreur silencieuse sur
			  la seule donnée que ce geste enregistre.
			*/}
			{voieDeclaree === null ? null : (
				<FeuilleDeclaration
					key={voieDeclaree.cle}
					carnet={pret.carnet}
					enCours={pret.enCours}
					aujourdHui={pret.aujourdHui}
					onFermer={pret.onFermerDeclaration}
					onAjouter={pret.onAjouter}
					onOublier={pret.onOublier}
					onChercherUnCommissaire={pret.onOuvrirRechercheCommissaire}
					onChercherUnAvocat={pret.onOuvrirRechercheAvocat}
					onDeclarer={(engageeLe, choix) => pret.onDeclarer(voieDeclaree.cle, engageeLe, choix)}
				/>
			)}

			<ChoixIntervenant
				carnet={pret.carnet}
				choisi={pret.intervenantChoisi}
				ouverte={pret.carnetOuvert}
				onFermer={pret.onFermerCarnet}
				onChoisir={pret.onRattacher}
				onAjouter={pret.onAjouter}
				onOublier={pret.onOublier}
				onChercherUnCommissaire={pret.onOuvrirRechercheCommissaire}
				onChercherUnAvocat={pret.onOuvrirRechercheAvocat}
			/>

			{/*
			  LA TROISIÈME FEUILLE DE LA PILE. Cladd les empile comme iOS : celle du
			  dessous recule et garde son piège à focus, et Échap ferme toujours celle
			  du dessus. Elles sont SŒURS dans l'arbre, jamais imbriquées.

			  ⚠️ AUCUN DÉPARTEMENT PROPOSÉ, et c'est un constat, pas un oubli. Aucune
			  fiche débiteur ne porte d'adresse aujourd'hui : `creanceComplete` n'en
			  rend pas, et la table n'en écrit pas. Proposer celui du créancier, ou
			  celui d'un autre dossier, ferait chercher au mauvais endroit un gérant
			  qui ne relirait pas le champ — et il en conclurait que sa région ne
			  compte aucune étude. On ne devine pas un département.
			*/}
			<RechercheCommissaire
				ouverte={pret.rechercheOuverte}
				etat={pret.etatRecherche}
				onFermer={pret.onFermerRechercheCommissaire}
				onChercher={pret.onChercherCommissaire}
				onRetenir={pret.onRetenirEtude}
			/>

			{/*
			  LA RECHERCHE D'AVOCAT, SŒUR DE LA PRÉCÉDENTE DANS L'ARBRE.

			  ⚠️ AUCUN BARREAU PROPOSÉ, pour la raison qui vaut déjà pour le
			  département : aucune fiche débiteur ne porte d'adresse, et proposer le
			  barreau du créancier ferait chercher au mauvais endroit un gérant qui
			  ne relirait pas le champ.

			  ⚠️ ET CHANGER DE BARREAU EFFACE LA SPÉCIALITÉ. Garder « Droit du
			  travail » en passant de Nantes à Rennes ferait rendre zéro fiche sur un
			  filtre que personne n'a reposé — le gérant lirait « aucun avocat » là
			  où il n'y a qu'un filtre resté en place.
			*/}
			<RechercheAvocat
				ouverte={pret.rechercheAvocatOuverte}
				repertoire={pret.repertoire}
				barreau={pret.barreau}
				specialite={pret.specialite}
				etat={pret.etatAvocats}
				onFermer={pret.onFermerRechercheAvocat}
				onChoisirBarreau={pret.onChoisirBarreau}
				onChoisirSpecialite={pret.onChoisirSpecialite}
				onRetenir={pret.onRetenirAvocat}
			/>
		</>
	);
}
