import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { Input, Popup, PopupContent, SectionTitle } from '@cladd-ui/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	BoutonPrincipal,
	ChoixIntervenant,
	EnteteDetail,
	FeuilleVoie,
	LigneBouton,
	ListeAnalyses,
	Page,
	PageBody,
	RechercheCommissaire,
	SectionEcran,
	SuiviProcedure,
	aujourdHuiISO,
	dateCourte,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type FicheASaisir,
	type FicheIntervenant,
	type VoieAffichee
} from '../../ui';

export const Route = createFileRoute('/app/creance_/$id/procedure')({ component: PageProcedure });

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
type ChoixDeclare = { readonly id: Id<'intervenants'> | null } | null;

/**
 * ⚠️ `ConvexError` PORTE SON MESSAGE DANS `.data`, PAS DANS `.message`. Le
 * refus qui compte ici — « cette voie n'a pas d'après modélisé » — serait
 * remplacé par un « Enregistrement refusé » générique sans cette lecture.
 */
function messageDuRefus(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'Enregistrement refusé.';
}

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
	voie,
	carnet,
	enCours,
	onFermer,
	onAjouter,
	onOublier,
	onChercherUnCommissaire,
	onDeclarer
}: {
	voie: VoieAffichee;
	carnet: readonly FicheIntervenant<Id<'intervenants'>>[];
	enCours: boolean;
	onFermer: () => void;
	onAjouter: (fiche: FicheASaisir) => void;
	onOublier: (intervenantId: Id<'intervenants'>) => void;
	onChercherUnCommissaire: () => void;
	onDeclarer: (engageeLe: string, choix: ChoixDeclare) => void;
}) {
	/*
	  ⚠️ TROIS ÉTATS DE FEUILLE, ZÉRO `setState` DANS UN EFFET. Rien ici n'est
	  synchronisé depuis une prop : la date part d'un appel unique à l'horloge,
	  le choix part à « rien dit », et le carnet part fermé. La remise à zéro
	  entre deux voies se fait par la `key` de ce composant, côté appelant — un
	  effet qui recopierait une prop dans un état produirait un rendu de plus et,
	  le jour où la prop change pour une autre raison, effacerait une saisie.
	*/
	const [quand, setQuand] = useState(aujourdHuiISO());
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
								: `Les délais de ${voie.nom} courront depuis le ${dateCourte(quand)}.`}
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
			/>
		</>
	);
}

function PageProcedure() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const suivi = useQuery(api.recouvrement.apresProcedure.suiviDeLaCreance, { creanceId });
	const carnet = useQuery(api.recouvrement.intervenants.monCarnet, {});

	const consignerEvenement = useMutation(api.recouvrement.apresProcedure.consignerEvenement);
	const engagerProcedure = useMutation(api.recouvrement.apresProcedure.engagerProcedure);
	const rattacherIntervenant = useMutation(api.recouvrement.apresProcedure.rattacherIntervenant);
	const ajouterIntervenant = useMutation(api.recouvrement.intervenants.ajouterIntervenant);
	const oublierIntervenant = useMutation(api.recouvrement.intervenants.oublierIntervenant);
	const chercherUnCommissaire = useAction(
		api.recouvrement.annuaires.chercherUnCommissaireDeJustice
	);

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	/** La voie dont le déroulé est ouvert, par sa clé. */
	const [voieOuverte, setVoieOuverte] = useState<string | null>(null);
	/** La voie dont on déclare l'engagement — la seconde feuille. */
	const [declaree, setDeclaree] = useState<string | null>(null);
	/** Le carnet, sur un dossier déjà engagé. */
	const [carnetOuvert, setCarnetOuvert] = useState(false);
	/** La recherche d'un commissaire, en feuille par-dessus le carnet. */
	const [rechercheOuverte, setRechercheOuverte] = useState(false);
	const [etatRecherche, setEtatRecherche] = useState<EtatRechercheCommissaire>({ phase: 'REPOS' });

	// Tout se DÉRIVE du rendu : aucune de ces valeurs n'est un état, donc aucune
	// ne peut être en retard d'un rendu sur la requête qui la porte.
	const procedures = creance?.procedures ?? [];
	const voie = procedures.find((p) => p.cle === voieOuverte) ?? null;
	const voieDeclaree = procedures.find((p) => p.cle === declaree) ?? null;
	const fiches = carnet ?? [];

	/**
	 * QUI FAIT L'ACTE, RELU DEPUIS LE DOSSIER.
	 *
	 * ⚠️ PAR IDENTIFIANT, ET C'EST UNE CORRECTION. Cette relecture se faisait par
	 * NOM, faute d'identifiant exposé : la feuille posait son anneau sur la
	 * première fiche dont le nom correspondait. Deux études homonymes, ou deux
	 * associés du même cabinet, et l'anneau désignait la mauvaise.
	 *
	 * L'écriture, elle, a toujours été exacte — `rattacherIntervenant` reçoit un
	 * identifiant. C'était donc un mensonge d'AFFICHAGE seulement, et c'est ce
	 * qui le rendait indétectable : rien ne cassait, aucun test ne tombait, et le
	 * gérant lisait un rattachement qui n'était pas celui qu'il avait fait.
	 * `creanceComplete` rend maintenant `intervenantId`.
	 *
	 * ⚠️ ET « AUCUN INTERVENANT » SE LIT « MOI-MÊME ». Sur un dossier engagé,
	 * c'est l'état réel de la fiche — aucune personne rattachée — pas une
	 * présélection : rien n'est deviné, on relit ce qui est écrit.
	 */
	const intervenantChoisi = creance?.intervenantId ?? null;

	// Le NOM se dérive de l'identifiant, jamais l'inverse. Une fiche retirée du
	// carnet depuis le rattachement ne laisse donc pas un nom orphelin à l'écran.
	const nomIntervenant = fiches.find((fiche) => fiche._id === intervenantChoisi)?.nom ?? null;

	/**
	 * ⚠️ `survenuLe` VIENT DU CHAMP, jamais de l'horloge. Les délais courent
	 * depuis le FAIT, pas depuis la saisie : les confondre offrirait des jours
	 * sur une caducité, en silence.
	 */
	async function consigner(cle: string, survenuLe: string) {
		setErreur(null);
		setEnCours(true);
		try {
			await consignerEvenement({ creanceId, cle, survenuLe });
		} catch (e) {
			setErreur(messageDuRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	/**
	 * DÉCLARER QU'UNE PROCÉDURE A ÉTÉ ENGAGÉE.
	 *
	 * ⚠️ LE LOGICIEL N'ENGAGE PAS, IL ENREGISTRE — troisième ligne rouge. Le
	 * gérant dit ce qu'il a fait ; le produit se met à compter les délais qui en
	 * découlent, et c'est tout ce qu'il fait.
	 *
	 * ⚠️ L'INTERVENANT NE SE RATTACHE QUE S'IL A ÉTÉ DIT. Un silence n'est pas
	 * un « moi-même » : appeler `rattacherIntervenant` sur « rien dit »
	 * écrirait une réponse que personne n'a donnée.
	 *
	 * ⚠️ ET SI LE RATTACHEMENT ÉCHOUE, L'ENGAGEMENT RESTE. Il est déjà écrit, et
	 * il porte les délais : le défaire pour une fiche introuvable ferait perdre
	 * la date de l'acte. Le refus s'affiche, la feuille reste ouverte.
	 */
	async function declarer(procedure: string, engageeLe: string, choix: ChoixDeclare) {
		setErreur(null);
		setEnCours(true);
		try {
			await engagerProcedure({ creanceId, procedure, engageeLe });
			if (choix !== null) await rattacherIntervenant({ creanceId, intervenantId: choix.id });
			setDeclaree(null);
			setVoieOuverte(null);
		} catch (e) {
			setErreur(messageDuRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	async function rattacher(intervenantId: Id<'intervenants'> | null) {
		setErreur(null);
		setEnCours(true);
		try {
			await rattacherIntervenant({ creanceId, intervenantId });
			setCarnetOuvert(false);
		} catch (e) {
			setErreur(messageDuRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	/**
	 * ⚠️ `origine` EST ÉCRITE ICI, PAS SAISIE. Une fiche tapée à la main est
	 * `SAISI_A_LA_MAIN` par construction. Une fiche venue d'un répertoire public
	 * porterait EN PLUS sa source et sa date de relevé — la mutation refuse sans
	 * elles — et ce formulaire ne peut donc pas en fabriquer une.
	 */
	async function ajouter(fiche: FicheASaisir) {
		setErreur(null);
		setEnCours(true);
		try {
			await ajouterIntervenant({
				nom: fiche.nom,
				role: fiche.role,
				ressort: fiche.ressort,
				origine: 'SAISI_A_LA_MAIN'
			});
		} catch (e) {
			setErreur(messageDuRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	/**
	 * CHERCHER UNE ÉTUDE AU REGISTRE PUBLIC.
	 *
	 * ⚠️ UN ÉCHEC NE DEVIENT JAMAIS UNE LISTE VIDE. Le refus du serveur s'écrit
	 * dans l'état de la feuille, mot pour mot : « aucune étude dans ce
	 * département » et « le registre n'a pas répondu » mènent à deux gestes
	 * opposés, et les confondre ferait chercher ailleurs un gérant dont la seule
	 * erreur était d'avoir cliqué une minute trop tôt.
	 */
	async function chercher(departement: string) {
		setEtatRecherche({ phase: 'EN_COURS' });
		try {
			const resultat = await chercherUnCommissaire({ departement });
			setEtatRecherche({ phase: 'TROUVE', resultat });
		} catch (e) {
			setEtatRecherche({ phase: 'ECHEC', message: messageDuRefus(e) });
		}
	}

	/**
	 * RETENIR UNE ÉTUDE AU CARNET.
	 *
	 * ⚠️ LA SOURCE ET SA DATE PARTENT AVEC LA FICHE, et la mutation la REFUSE
	 * sans elles. Une fiche venue d'un répertoire public sans sa provenance
	 * devient indiscernable d'une donnée officielle et fraîche — or celle-ci
	 * n'est ni l'un ni l'autre : le registre des entreprises ne connaît ni les
	 * radiations disciplinaires, ni les études qui n'ont pas déclaré leur
	 * convention collective.
	 *
	 * ⚠️ ELLES SE LISENT DANS L'ÉTAT DE LA RECHERCHE, PAS DANS UNE CONSTANTE.
	 * Un couple source/date figé dans le code vieillirait sans que rien ne
	 * l'indique ; celui-ci est celui du relevé qui a produit CETTE liste.
	 */
	async function retenir(etude: EtudeAffichee) {
		if (etatRecherche.phase !== 'TROUVE') return;
		const { resultat } = etatRecherche;

		setErreur(null);
		setEnCours(true);
		try {
			await ajouterIntervenant({
				nom: etude.nom,
				role: 'COMMISSAIRE_DE_JUSTICE',
				ressort: `${etude.commune} ${etude.codePostal}`.trim(),
				adresse: etude.adresse,
				siren: etude.siren,
				origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
				sourceRepertoire: resultat.source,
				sourceReleveeLe: resultat.releveeLe
			});
			setRechercheOuverte(false);
		} catch (e) {
			setErreur(messageDuRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	/** Une fiche saisie par erreur doit pouvoir partir. */
	async function oublier(intervenantId: Id<'intervenants'>) {
		setErreur(null);
		setEnCours(true);
		try {
			await oublierIntervenant({ intervenantId });
		} catch (e) {
			setErreur(messageDuRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/creance/$id"
				retourParametres={{ id }}
				retourLibelle={creance?.debiteur ?? 'Créance'}
				titre="Procédure"
				sousTitre={suivi?.libelle ?? 'Aucune procédure engagée'}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					{suivi ? (
						<SectionEcran titre="Ce qui court depuis l’engagement">
							<SuiviProcedure
								suivi={suivi}
								aujourdHui={aujourdHuiISO()}
								enCours={enCours}
								onConsigner={(cle, survenuLe) => void consigner(cle, survenuLe)}
							/>

							{/* ⚠️ LA QUESTION SE POSE APRÈS COUP AUSSI. Un gérant qui a déclaré
							    sans le dire doit pouvoir nommer son intervenant plus tard :
							    sans cette rangée, « je le dirai plus tard » serait un mensonge. */}
							<ListeAnalyses>
								<LigneBouton
									titre="Qui fait l’acte"
									valeur={nomIntervenant ?? 'Moi-même'}
									onClick={() => setCarnetOuvert(true)}
								/>
							</ListeAnalyses>
						</SectionEcran>
					) : null}

					{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

					{creance === undefined || suivi === undefined ? (
						<p className="sr-only">Chargement…</p>
					) : suivi === null ? (
						<SectionEcran titre="Les voies envisageables">
							{/*
							  ⚠️ UNE RANGÉE PAR VOIE, ET LE DÉROULÉ EN FEUILLE. L'écran empilait
							  une carte de prose par voie : le lecteur devait lire trois
							  paragraphes pour apprendre qu'une voie est indisponible. La rangée
							  dit le verdict ; la feuille porte les étapes, les motifs de blocage
							  et ce qui fait échouer la voie.
							*/}
							<ListeAnalyses>
								{procedures.map((procedure) => (
									<LigneBouton
										key={procedure.cle}
										titre={procedure.nom}
										precision={
											procedure.etapes.length === 0
												? 'aucun délai n’en découle'
												: `${procedure.etapes.length} étapes · ${procedure.conditionsEchec.length} façons d’échouer`
										}
										valeur={procedure.disponible ? 'Envisageable' : 'Indisponible'}
										onClick={() => setVoieOuverte(procedure.cle)}
									/>
								))}
							</ListeAnalyses>

							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
								Énumérées, jamais classées. Aucune n’est mise en avant.
							</p>
						</SectionEcran>
					) : null}
				</div>
			</PageBody>

			<FeuilleVoie
				voie={voie}
				ouverte={voie !== null}
				onFermer={() => setVoieOuverte(null)}
				onDeclarer={() => setDeclaree(voie?.cle ?? null)}
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
					voie={voieDeclaree}
					carnet={fiches}
					enCours={enCours}
					onFermer={() => setDeclaree(null)}
					onAjouter={(fiche) => void ajouter(fiche)}
					onOublier={(intervenantId) => void oublier(intervenantId)}
					onChercherUnCommissaire={() => setRechercheOuverte(true)}
					onDeclarer={(engageeLe, choix) => void declarer(voieDeclaree.cle, engageeLe, choix)}
				/>
			)}

			<ChoixIntervenant
				carnet={fiches}
				choisi={intervenantChoisi}
				ouverte={carnetOuvert}
				onFermer={() => setCarnetOuvert(false)}
				onChoisir={(intervenantId) => void rattacher(intervenantId)}
				onAjouter={(fiche) => void ajouter(fiche)}
				onOublier={(intervenantId) => void oublier(intervenantId)}
				onChercherUnCommissaire={() => setRechercheOuverte(true)}
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
				ouverte={rechercheOuverte}
				etat={etatRecherche}
				onFermer={() => setRechercheOuverte(false)}
				onChercher={(departement) => void chercher(departement)}
				onRetenir={(etude) => void retenir(etude)}
			/>
		</Page>
	);
}
