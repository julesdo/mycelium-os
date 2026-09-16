import { useRef, useState } from 'react';
import {
	createFileRoute,
	Outlet,
	useChildMatches,
	useNavigate,
	type HistoryState
} from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { depuisEuros, enCentimes } from '../../lib/socle/montants';
import {
	aujourdHuiISO,
	lirePourLeSujet,
	useDeuxVolets,
	type EtatRecherche,
	type EtablissementPropose,
	type PosePourUnSujet
} from '../../ui';
import { secteursProposes } from '../../screens/debiteur-detail';
import { EcranDebiteurs } from '../../screens/debiteurs';

/**
 * ⚠️ LE DÉBITEUR CHOISI VIT DANS L'URL, PLUS DANS UN ÉTAT LOCAL.
 *
 * Il était dans un `useState`, et trois choses en découlaient, toutes
 * mauvaises sur un téléphone :
 *
 *   · le bouton RETOUR du navigateur quittait l'écran au lieu de refermer la
 *     feuille — le geste le plus instinctif d'une application mobile ;
 *   · un lien partagé ou un rechargement retombait sur la liste vide ;
 *   · et surtout, aucune page de détail ne pouvait REVENIR à ce débiteur,
 *     puisque rien dans l'adresse ne disait lequel était ouvert.
 *
 * En paramètre de recherche plutôt qu'en segment de chemin : la liste et la
 * preuve sont le MÊME écran au-dessus de 1024 px, et un segment de chemin
 * aurait suggéré deux pages là où il y en a une.
 */
export const Route = createFileRoute('/app/debiteurs')({
	component: Debiteurs,
	errorComponent: DebiteursEnErreur,
	validateSearch: (recherche: Record<string, unknown>): { d?: string } => {
		const d = recherche.d;
		return typeof d === 'string' && d.length > 0 ? { d } : {};
	}
});

function DebiteursEnErreur() {
	return <EcranDebiteurs donnees={{ etat: 'erreur' }} enfant={null} />;
}

/**
 * LES ÉTATS DE REPOS DU VOLET : ce qu'un débiteur montre tant que rien n'a été
 * posé pour lui. Hors du composant, pour qu'un rendu ne recrée pas un ensemble
 * vide. `ReadonlySet` interdit de le modifier en place, puisqu'il sert à tous.
 */
const SELECTION_VIDE: ReadonlySet<string> = new Set();
const RECHERCHE_AU_REPOS: EtatRecherche = { phase: 'REPOS' };

/**
 * Branchée sur la base ; le dessin vit dans `screens/debiteurs.tsx`.
 */
function Debiteurs() {
	const navigate = useNavigate();
	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	/**
	 * LES CRÉANCES DÉJÀ CONSTITUÉES.
	 *
	 * ⚠️ `listerCreances` EXISTAIT, COMPLÈTE ET TESTÉE, ET N'ÉTAIT APPELÉE PAR
	 * PERSONNE. C'est le troisième cas de la même famille relevé cette
	 * semaine — une chose construite, correcte, et injoignable.
	 *
	 * Sa conséquence était la plus lourde du produit : l'écran d'une créance ne
	 * s'atteignait que par la redirection qui suit `constituer()`, quelques
	 * lignes plus bas. Une fois qu'on en sortait, aucun lien n'y ramenait —
	 * l'écran le plus riche du logiciel n'était visible que dans les secondes
	 * suivant sa création.
	 */
	const creances = useQuery(api.recouvrement.lecture.listerCreances, {});
	const { d } = Route.useSearch();
	/** Vrai quand une page du débiteur (habitude, pièces) est ouverte par segment. */
	const pageOuverte = useChildMatches({ select: (enfants) => enfants.length > 0 });
	/**
	 * LE DÉBITEUR DE LA PAGE OUVERTE, LU SUR LA FEUILLE.
	 *
	 * ⚠️ PAS `useParams({ strict: false })`, QUI REND LES PARAMÈTRES DE LA
	 * CORRESPONDANCE LA PLUS PROCHE, c'est-à-dire ceux de cette route-ci, qui n'en
	 * a aucun. La liste allumait alors le premier débiteur du tri pendant que le
	 * volet droit montrait l'habitude d'un autre, et les lectures partaient sur ce
	 * mauvais sujet.
	 */
	const debiteurDeLaPage = useChildMatches({
		select: (enfants) => (enfants.at(-1)?.params as { id?: string } | undefined)?.id ?? null
	});
	const deuxVolets = useDeuxVolets();
	/**
	 * LE DÉBITEUR CHOISI : celui de l'adresse, sinon celui de la page ouverte.
	 *
	 * ⚠️ PUIS, EN DEUX VOLETS SEULEMENT, LE PREMIER DE LA LISTE. Un volet droit vide
	 * à 1024 px laissait la moitié de l'écran morte. Ce choix ne s'écrit jamais dans
	 * l'adresse : sur un téléphone, le gérant atterrirait dans une fiche au lieu de
	 * la liste. Et sous 1024 px il ne s'applique pas, sans quoi la feuille
	 * s'ouvrirait d'elle-même par-dessus la liste.
	 */
	const choisi = (d ??
		debiteurDeLaPage ??
		(deuxVolets ? debiteurs?.[0]?._id : undefined) ??
		null) as Id<'debiteurs'> | null;

	/**
	 * Choisir un débiteur, c'est NAVIGUER.
	 *
	 * `replace` sur la fermeture et pas sur l'ouverture : ouvrir une fiche
	 * ajoute une étape à l'historique — c'est elle que le bouton retour doit
	 * défaire — tandis que la refermer soi-même ne doit pas en ajouter une
	 * seconde, sans quoi il faudrait appuyer deux fois pour sortir.
	 */
	const setChoisi = (id: Id<'debiteurs'> | null) => {
		void navigate({
			to: '/app/debiteurs',
			search: id === null ? {} : { d: id },
			replace: id === null
		});
	};
	/**
	 * ⚠️ CE QU'ON POSE POUR LE DÉBITEUR OUVERT PORTE SON IDENTIFIANT.
	 *
	 * La sélection, les erreurs, la recherche au registre et le lettrage vivent
	 * dans la route, qui ne se remonte pas quand `?d=` change : un clic sur un autre
	 * débiteur ne vidait que la sélection, et le retour du navigateur rien du tout.
	 * Chacun est donc posé pour un débiteur et se lit par `lirePourLeSujet` : sous
	 * un autre, il vaut son état de repos. Chaque gestionnaire pose pour le débiteur
	 * choisi à son départ, même quand sa réponse arrive après un changement.
	 */
	const [selectionPosee, setSelectionPosee] = useState<PosePourUnSujet<ReadonlySet<string>> | null>(
		null
	);
	const selection = lirePourLeSujet(selectionPosee, choisi, SELECTION_VIDE);
	const [erreurPosee, setErreurPosee] = useState<PosePourUnSujet<string | null> | null>(null);
	const erreur = lirePourLeSujet(erreurPosee, choisi, null);

	const factures = useQuery(
		api.recouvrement.lecture.listerFacturesDuDebiteur,
		choisi === null ? 'skip' : { debiteurId: choisi }
	);
	/**
	 * L'HABITUDE DE PAIEMENT DU DÉBITEUR CHOISI.
	 *
	 * ⚠️ `skip` TANT QU'AUCUN DÉBITEUR N'EST CHOISI. Sans ça, Convex
	 * recalculerait une habitude sur un identifiant nul à chaque rendu de la
	 * liste — et l'écran paierait une requête pour un volet vide.
	 *
	 * La date du jour vient de la SEULE horloge de l'interface, partagée avec
	 * l'accueil et le détail : deux lectures différentes feraient diverger un
	 * retard autour de minuit. Voir `ui/horloge.ts`.
	 */
	const comportement = useQuery(
		api.recouvrement.comportement.lire,
		choisi === null ? 'skip' : { debiteurId: choisi, aujourdHui: aujourdHuiISO() }
	);

	const debiteurChoisi = debiteurs?.find((d) => d._id === choisi);
	const SECTEURS = secteursProposes();

	const creerCreance = useMutation(api.recouvrement.creances.creer);
	const renseignerSiren = useMutation(api.recouvrement.debiteurs.renseignerSiren);
	const chercherAuRegistre = useAction(api.recouvrement.debiteurs.chercherAuRegistre);
	const renseignerSecteur = useMutation(api.recouvrement.debiteurs.renseignerSecteur);

	/**
	 * LE TAUX CONTRACTUEL, ET LE CONSTAT QUE LE SERVEUR REND.
	 *
	 * ⚠️ LE CONSTAT EST GARDÉ EN ÉTAT plutôt qu'affiché en passant. Il dit si
	 * le taux saisi passe sous le plancher légal — une information que le
	 * créancier doit pouvoir relire, pas voir clignoter.
	 *
	 * ⚠️ ET IL PORTE LE DÉBITEUR AUQUEL IL SE RAPPORTE. La `key` du composant
	 * ne le remet pas à zéro : cet état-ci vit dans l'ÉCRAN, pas dans la carte.
	 * Sans l'identifiant, « le taux déclaré est inférieur au plancher » resterait
	 * affiché sous le débiteur suivant, qui n'a rien déclaré du tout. On dérive
	 * au rendu plutôt que de remettre à zéro dans un effet.
	 */
	const poserTaux = useMutation(api.recouvrement.tauxContractuel.renseigner);
	/**
	 * LES PIÈCES DU DÉBITEUR — module 1.2.
	 *
	 * `skip` tant qu'aucun débiteur n'est choisi : sans ça, Convex relirait la
	 * liste sur un identifiant nul à chaque rendu du volet gauche.
	 */
	const pieces = useQuery(
		api.recouvrement.pieces.listerPiecesDuDebiteur,
		choisi === null ? 'skip' : { debiteurId: choisi }
	);

	const [constatPose, setConstatPose] = useState<PosePourUnSujet<string> | null>(null);
	const constatTaux = lirePourLeSujet(constatPose, choisi, null);

	/**
	 * LE TAUX STIPULÉ EN VIGUEUR, RELU DEPUIS LES FACTURES.
	 *
	 * Il se pose par relation mais vit sur la facture — toutes les non soldées
	 * du débiteur le portent, identique. La première qui en a un le dit donc
	 * pour l'ensemble.
	 *
	 * ⚠️ SANS CETTE RELECTURE, LE CHAMP REPARTIRAIT VIDE À CHAQUE OUVERTURE, et
	 * le créancier croirait son taux perdu — donc le ressaisirait, donc
	 * écraserait ce qui était juste. C'est la moitié de la correction : écrire
	 * un champ sans le relire recrée le défaut dans la couche du dessus.
	 */
	const tauxStipule = factures?.find(
		(f) => f.tauxContractuelPourcent !== undefined
	)?.tauxContractuelPourcent;

	/**
	 * Le refus du SIREN, séparé de `erreur`.
	 *
	 * ⚠️ IL S'AFFICHE SOUS LE CHAMP, PAS DANS L'ALERTE D'ÉCRAN. La clé de
	 * contrôle attrape toute faute de frappe d'un seul chiffre : le gérant doit
	 * voir ce qu'il a tapé à côté de ce qu'il a tapé, pas à l'autre bout de la
	 * page. Le message vient du serveur tel quel — c'est lui qui NOMME le numéro
	 * reçu.
	 */
	const [erreurSirenPosee, setErreurSirenPosee] = useState<PosePourUnSujet<string | null> | null>(
		null
	);
	const erreurSiren = lirePourLeSujet(erreurSirenPosee, choisi, null);
	// L'état de la recherche au registre, posé pour un débiteur. Sous un autre, il
	// se lit au REPOS : les candidats d'un client n'ont rien à faire sur un autre.
	const [recherchePosee, setRecherchePosee] = useState<PosePourUnSujet<EtatRecherche> | null>(null);
	const recherche = lirePourLeSujet(recherchePosee, choisi, RECHERCHE_AU_REPOS);
	/**
	 * LES DÉBITEURS DÉJÀ PRÉSENTÉS AU REGISTRE PENDANT CETTE SESSION.
	 *
	 * ⚠️ IL EMPÊCHE UN IMPORT DE CINQUANTE CLIENTS DE DEVENIR CINQUANTE APPELS
	 * RÉPÉTÉS. L'état de recherche, lui, ne vaut que pour UN débiteur à la fois :
	 * en revenant sur une fiche déjà vue, il est retombé au repos et la recherche
	 * repartirait. Ce compte-ci survit aux allers-retours dans la liste.
	 */
	const dejaInterroges = useRef<Set<string>>(new Set());

	/**
	 * LE LETTRAGE D'UN VIREMENT GROUPÉ.
	 *
	 * La recherche ne part PAS à chaque frappe : le montant se confirme, et c'est
	 * `montantCherche` qui déclenche la requête. Chercher pendant qu'on tape ferait
	 * défiler des propositions qui changent sous les doigts, et donnerait envie de
	 * cliquer sur la première venue — exactement ce que ce module refuse.
	 */
	const [montantCherchePose, setMontantCherchePose] = useState<PosePourUnSujet<
		bigint | null
	> | null>(null);
	const montantCherche = lirePourLeSujet(montantCherchePose, choisi, null);
	const [dateReglementPosee, setDateReglementPosee] = useState<PosePourUnSujet<string> | null>(
		null
	);
	const dateReglement = lirePourLeSujet(dateReglementPosee, choisi, '');
	const [erreurLettragePosee, setErreurLettragePosee] = useState<PosePourUnSujet<
		string | null
	> | null>(null);
	const erreurLettrage = lirePourLeSujet(erreurLettragePosee, choisi, null);
	// Un montant posé pour un autre débiteur se lit `null` sous le choisi : la
	// requête passe en `skip`, et la fiche ne propose pas de solder le virement d'un autre.
	const proposition = useQuery(
		api.recouvrement.lettrage.proposer,
		choisi === null || montantCherche === null
			? 'skip'
			: { debiteurId: choisi, montant: montantCherche }
	);
	const appliquerLettrage = useMutation(api.recouvrement.lettrage.appliquer);

	function chercherLettrage(saisi: string, date: string) {
		if (choisi === null) return;
		const debiteurId = choisi;
		setErreurLettragePosee({ sujet: debiteurId, valeur: null });
		setMontantCherchePose({ sujet: debiteurId, valeur: null });
		try {
			// `depuisEuros` refuse trois décimales, NaN et la notation exponentielle.
			// Un montant mal lu ici deviendrait un règlement faux en base.
			setMontantCherchePose({
				sujet: debiteurId,
				valeur: enCentimes(depuisEuros(saisi.trim().replace(/\s/g, '')))
			});
			setDateReglementPosee({ sujet: debiteurId, valeur: date.trim() });
		} catch {
			setErreurLettragePosee({
				sujet: debiteurId,
				valeur: `« ${saisi} » n’est pas un montant en euros. Deux décimales au plus, sans arrondi.`
			});
		}
	}

	async function soldeLesFactures(references: readonly string[], total: bigint) {
		if (choisi === null) return;
		const debiteurId = choisi;
		setErreurLettragePosee({ sujet: debiteurId, valeur: null });
		try {
			await appliquerLettrage({
				debiteurId,
				references: [...references],
				montant: total,
				date: dateReglement
			});
			setMontantCherchePose({ sujet: debiteurId, valeur: null });
		} catch (e) {
			setErreurLettragePosee({
				sujet: debiteurId,
				valeur: e instanceof Error ? e.message : 'Rapprochement refusé.'
			});
		}
	}

	async function enregistrerTaux(pourcentage: string | null) {
		if (choisi === null) return;
		const debiteurId = choisi;
		try {
			const resultat = await poserTaux({
				debiteurId,
				pourcentage,
				aLaDate: aujourdHuiISO()
			});
			setConstatPose({ sujet: debiteurId, valeur: resultat.constat });
		} catch (e) {
			// Le refus vient du serveur et NOMME ce qu'il a reçu — « 12,455 porte
			// plus de deux décimales ». Le reformuler perdrait le seul détail utile.
			setConstatPose({
				sujet: debiteurId,
				valeur: e instanceof Error ? e.message : 'Taux refusé.'
			});
		}
	}

	async function enregistrerSiren(saisi: string) {
		if (choisi === null) return;
		const debiteurId = choisi;
		setErreurSirenPosee({ sujet: debiteurId, valeur: null });
		try {
			await renseignerSiren({ debiteurId, siren: saisi });
			// Le SIREN retenu clôt la recherche : garder les candidats à l'écran
			// après le choix laisserait croire qu'il reste à faire.
			setRecherchePosee({ sujet: debiteurId, valeur: { phase: 'REPOS' } });
		} catch (e) {
			setErreurSirenPosee({
				sujet: debiteurId,
				valeur: e instanceof Error ? e.message : 'Numéro refusé.'
			});
		}
	}

	/**
	 * RETENIR UN ÉTABLISSEMENT PROPOSÉ.
	 *
	 * ⚠️ LA FORME JURIDIQUE PART AVEC LE NUMÉRO. `debiteurs.formeJuridique` était
	 * déclaré au schéma, lu à l'écran, et ÉCRIT NULLE PART — onzième cas de cette
	 * famille relevé dans ce dépôt. Le seul instant où le produit la connaît est
	 * celui-ci : elle vient du registre, en même temps que le SIREN qu'on retient.
	 *
	 * Une saisie manuelle ne la porte pas, et on ne l'invente pas : elle reste
	 * alors absente, ce qui est la vérité.
	 */
	async function retenirEtablissement(etablissement: EtablissementPropose) {
		if (choisi === null) return;
		const debiteurId = choisi;
		setErreurSirenPosee({ sujet: debiteurId, valeur: null });
		try {
			await renseignerSiren({
				debiteurId,
				siren: etablissement.siren,
				...(etablissement.formeJuridique === undefined
					? {}
					: { formeJuridique: etablissement.formeJuridique })
			});
			setRecherchePosee({ sujet: debiteurId, valeur: { phase: 'REPOS' } });
		} catch (e) {
			setErreurSirenPosee({
				sujet: debiteurId,
				valeur: e instanceof Error ? e.message : 'Numéro refusé.'
			});
		}
	}

	/**
	 * CHERCHER LE DÉBITEUR AU REGISTRE PUBLIC.
	 *
	 * ⚠️ LE NOM N'EST PAS ENVOYÉ D'ICI. L'action prend l'identifiant du débiteur
	 * et va lire la dénomination côté serveur, après avoir vérifié qu'il
	 * appartient bien à cet établissement. Une action qui accepterait une chaîne
	 * libre serait un relais ouvert vers une API tierce, utilisable par tout
	 * porteur de session pour autre chose que ses propres clients.
	 *
	 * ⚠️ ET « RIEN TROUVÉ » N'EST PAS « ÇA A ÉCHOUÉ ». Les deux mènent à des
	 * gestes opposés — saisir le numéro à la main, ou réessayer — donc l'écran
	 * les distingue. `ConvexError` porte son message dans `.data`, pas dans
	 * `.message`.
	 *
	 * ⚠️ ELLE PREND SON DÉBITEUR EN ARGUMENT, ELLE NE LE LIT PAS. À l'ouverture
	 * d'une fiche, `choisi` vaut encore le débiteur qu'on quitte : la navigation
	 * n'a pas fini. Lire l'état ici chercherait le mauvais client, et poserait
	 * ses candidats sur lui.
	 */
	async function chercherAuRegistrePour(debiteurId: Id<'debiteurs'>) {
		// Une fiche ouverte deux fois ne redemande pas le registre. Une `ref` et
		// pas un état : ce compte ne se dessine pas, et le remettre déclencherait
		// un rendu pour rien.
		dejaInterroges.current.add(debiteurId);
		setErreurSirenPosee({ sujet: debiteurId, valeur: null });
		setRecherchePosee({ sujet: debiteurId, valeur: { phase: 'EN_COURS' } });
		// ⚠️ UNE RÉPONSE NE S'INSCRIT QUE SI CETTE RECHERCHE EST ENCORE EN COURS POUR
		// CE DÉBITEUR. Sans cette garde, la réponse tardive de A effaçait la recherche
		// que B venait de lancer, qui perdait son indicateur ou ses candidats, et un
		// SIREN retenu pendant la recherche voyait ses candidats revenir.
		const repondre = (valeur: EtatRecherche) =>
			setRecherchePosee((pose) =>
				pose?.sujet === debiteurId && pose.valeur.phase === 'EN_COURS'
					? { sujet: debiteurId, valeur }
					: pose
			);
		try {
			const { candidats } = await chercherAuRegistre({ debiteurId });
			repondre(candidats.length === 0 ? { phase: 'AUCUN' } : { phase: 'TROUVE', candidats });
		} catch (e) {
			const convexe = e as { data?: unknown };
			repondre({
				phase: 'ECHEC',
				message:
					typeof convexe.data === 'string'
						? convexe.data
						: 'Le registre n’a pas répondu. Réessayez dans un instant.'
			});
		}
	}

	function basculer(id: string) {
		if (choisi === null) return;
		const debiteurId = choisi;
		// La bascule part de la sélection de CE débiteur, relue sur la dernière pose :
		// une facture cochée sous un autre débiteur n'entre pas dans celle-ci.
		setSelectionPosee((precedente) => {
			const suivante = new Set(lirePourLeSujet(precedente, debiteurId, SELECTION_VIDE));
			if (suivante.has(id)) suivante.delete(id);
			else suivante.add(id);
			return { sujet: debiteurId, valeur: suivante };
		});
	}

	/**
	 * `provenance` : le titre de l'écran d'où part la constitution, que le volet
	 * lit par `useProvenance()`. La créance ouverte ensuite revient ici par
	 * l'historique, et le dit.
	 */
	async function constituer(provenance: HistoryState) {
		if (choisi === null) return;
		const debiteurId = choisi;
		setErreurPosee({ sujet: debiteurId, valeur: null });
		try {
			const creanceId = await creerCreance({
				factureIds: [...selection] as Id<'facturesVente'>[]
			});
			setSelectionPosee({ sujet: debiteurId, valeur: SELECTION_VIDE });
			await navigate({ to: '/app/creance/$id', params: { id: creanceId }, state: provenance });
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreurPosee({
				sujet: debiteurId,
				valeur:
					typeof convexe.data === 'string'
						? convexe.data
						: e instanceof Error
							? e.message
							: 'La créance n’a pas pu être constituée.'
			});
		}
	}

	return (
		<EcranDebiteurs
			enfant={pageOuverte ? <Outlet /> : null}
			donnees={
				debiteurs === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								debiteurs,
								choisi,
								onOuvrir: (id) => {
									const ouvert = id as Id<'debiteurs'>;
									setChoisi(ouvert);
									// Un clic repart de zéro pour ce qui se saisissait : la sélection, le
									// montant d'un virement et les refus qui s'y rapportent. La fiche
									// remontée n'affiche plus ces saisies, et « Solder ces factures »
									// enregistrerait une date que l'écran ne montre plus. Les candidats du
									// registre et le constat du taux reviennent, eux, avec leur débiteur.
									setSelectionPosee(null);
									setMontantCherchePose(null);
									setErreurLettragePosee(null);
									setErreurSirenPosee(null);
									setErreurPosee(null);

									/*
									  ⚠️ LE REGISTRE S'INTERROGE TOUT SEUL, PARCE QUE LE NOM EST DÉJÀ LÀ.
									  Il fallait toucher « Chercher « BOULANGERIE MARTIN » » sur chaque
									  client sans SIREN, alors que le BODACC se cherche par nom et sans
									  clé : c'est la première règle d'écran prise à l'envers — « aucun
									  écran ne demande ce que le logiciel peut déduire ».

									  ⚠️ ET IL PROPOSE, IL NE CHOISIT TOUJOURS RIEN. Même avec un seul
									  candidat, aucun SIREN ne s'enregistre sans un appui : un SIREN
									  d'homonyme, bien formé, désigne une AUTRE entreprise, et le radar
									  rendrait sur elle un « rien au registre » faux et rassurant.

									  Dans le gestionnaire, pas dans un effet : on ne pose pas d'état
									  au rendu, et la recherche ne part qu'une fois par débiteur.
									*/
									const fiche = debiteurs.find((debiteur) => debiteur._id === ouvert);
									if (
										fiche !== undefined &&
										(fiche.siren === undefined || fiche.siren === '') &&
										!dejaInterroges.current.has(ouvert)
									) {
										void chercherAuRegistrePour(ouvert);
									}
								},
								onFermer: () => setChoisi(null),
								detail: {
									debiteurId: choisi ?? '',
									denomination: debiteurChoisi?.denomination ?? '',
									etatRecherche: recherche,
									onChercherAuRegistre: () => {
										if (choisi === null) return;
										void chercherAuRegistrePour(choisi);
									},
									onRetenirEtablissement: (etablissement) =>
										void retenirEtablissement(etablissement),
									debiteur: choisi === null || debiteurChoisi === undefined ? null : debiteurChoisi,
									// Les pièces aussi : sans elles, la rangée des pièces dirait « Aucune » le temps que la requête réponde.
									factures:
										choisi === null || factures === undefined || pieces === undefined
											? null
											: factures,
									// Les seules du débiteur ouvert. Le filtre est ici plutôt qu'en base
									// parce que la liste entière tient déjà en mémoire pour l'écran, et
									// qu'une requête par débiteur la rechargerait à chaque sélection.
									creances: (creances ?? []).filter((creance) => creance.debiteurId === choisi),
									optionsSecteur: SECTEURS,
									erreurSiren,
									tauxStipule,
									constatTaux,
									pieces: pieces ?? [],
									habitude: comportement?.habitude ?? null,
									ruptures: comportement?.ruptures ?? [],
									propositionLettrage: proposition ?? null,
									lettrageEnCours: montantCherche !== null && proposition === undefined,
									erreurLettrage,
									selection,
									erreur,
									onEnregistrerSiren: (saisi) => void enregistrerSiren(saisi),
									onChoisirSecteur: (cle) => {
										if (choisi === null) return;
										void renseignerSecteur({ debiteurId: choisi, secteur: cle as 'GENERAL' });
									},
									onEnregistrerTaux: (p) => void enregistrerTaux(p),
									onChercherLettrage: chercherLettrage,
									onAppliquerLettrage: (references, total) =>
										void soldeLesFactures(references, total),
									onBasculerFacture: basculer,
									onConstituer: (provenance) => void constituer(provenance)
								}
							}
						}
			}
		/>
	);
}
