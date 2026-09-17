import {
	ChoixIntervenant,
	FeuilleDeclaration,
	FeuilleVoie,
	LigneBouton,
	ListeAnalyses,
	PageEcran,
	RechercheAvocat,
	RechercheCommissaire,
	SectionEcran,
	SuiviProcedure,
	type AvocatAffiche,
	type ChoixDeclare,
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
 * ⚠️ `FeuilleDeclaration` ET `ChoixDeclare` ONT DÉMÉNAGÉ DANS `src/ui/`, ET
 * L'ORDRE COMPTE. Cet écran est supprimé par la refonte ; la feuille qui
 * déclare un engagement est le SEUL appelant de `engagerProcedure`. La laisser
 * ici jusqu'au jour de la suppression aurait emporté le geste avec l'écran,
 * c'est-à-dire le défaut fondateur que `fonctions-appelees.test.ts` a nommé.
 * Voir `src/ui/feuille-declaration.tsx`.
 */
export type { ChoixDeclare };

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
					libelle: pret?.debiteur ?? 'Créance',
					masqueEnVolets: true
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
