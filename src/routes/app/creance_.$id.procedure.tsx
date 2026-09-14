import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	aujourdHuiISO,
	type AvocatAffiche,
	type EtatRechercheAvocat,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type FicheASaisir
} from '../../ui';
import { EcranProcedure, type ChoixDeclare } from '../../screens/analyses/procedure';

export const Route = createFileRoute('/app/creance_/$id/procedure')({
	component: PageProcedure,
	errorComponent: ProcedureEnErreur
});

function ProcedureEnErreur() {
	const { id } = Route.useParams();
	return <EcranProcedure identifiant={id} donnees={{ etat: 'erreur' }} />;
}

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
 * Branchée sur la base ; le dessin vit dans `screens/analyses/procedure.tsx`.
 */
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
	/**
	 * La recherche d'un avocat, sa sœur.
	 *
	 * ⚠️ TROIS ÉTATS PLUTÔT QU'UN, et aucun n'est une machine à phases. Là où la
	 * recherche d'études appelle une `action` — donc impérative, donc dotée d'un
	 * état de progression — celle-ci lit une table par une `query` réactive : le
	 * barreau et la spécialité SONT la requête, et tout le reste se dérive du
	 * rendu. Rien à synchroniser, donc aucun effet.
	 */
	const [rechercheAvocatOuverte, setRechercheAvocatOuverte] = useState(false);
	const [barreauChoisi, setBarreauChoisi] = useState('');
	const [specialiteChoisie, setSpecialiteChoisie] = useState('');

	/*
	  ⚠️ LES DEUX REQUÊTES SONT SAUTÉES TANT QUE LA FEUILLE EST FERMÉE. Le
	  parcours des barreaux lit un document par barreau, et la recherche jusqu'à
	  quatre mille fiches : les faire tourner au chargement de l'écran de
	  procédure ferait payer un répertoire que personne n'a demandé.
	*/
	const repertoire = useQuery(
		api.recouvrement.annuaires.barreauxDuRepertoire,
		rechercheAvocatOuverte ? {} : 'skip'
	);
	const avocats = useQuery(
		api.recouvrement.annuaires.chercherUnAvocat,
		rechercheAvocatOuverte && barreauChoisi !== ''
			? {
					barreau: barreauChoisi,
					specialite: specialiteChoisie === '' ? undefined : specialiteChoisie
				}
			: 'skip'
	);

	/*
	  ⚠️ « PAS ENCORE CHOISI » ET « JE LIS » SONT DEUX ÉTATS, pas un. Les
	  confondre ferait attendre un résultat que personne n'a demandé — et, à
	  l'inverse, ferait lire un écran de repos pendant une lecture réelle.
	*/
	const etatAvocats: EtatRechercheAvocat =
		barreauChoisi === ''
			? { phase: 'AUCUN_BARREAU' }
			: avocats === undefined
				? { phase: 'EN_COURS' }
				: { phase: 'TROUVE', resultat: avocats };

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
			if (choix !== null)
				await rattacherIntervenant({
					creanceId,
					intervenantId: choix.id as Id<'intervenants'> | null
				});
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

	/**
	 * RETENIR UN AVOCAT AU CARNET.
	 *
	 * ⚠️ SANS DATE DE RELEVÉ, ON NE RETIENT PAS — et on le dit. `releveeLe` vaut
	 * `null` quand aucune livraison n'a été ingérée ; dater du jour pour faire
	 * passer la mutation ferait entrer au carnet une fiche qui se présenterait
	 * comme relevée aujourd'hui, ce qu'elle n'est pas. Le doute ne profite jamais
	 * au produit : on refuse, et le refus se lit.
	 *
	 * ⚠️ LE RESSORT EST LE BARREAU, TEL QUE LE FICHIER L'ÉCRIT. Le recomposer
	 * depuis la ville ferait afficher « NANTES » pour un avocat inscrit au
	 * barreau de Nantes mais installé à Saint-Herblain — et c'est le barreau,
	 * pas la commune, qui dit devant quelle juridiction il plaide.
	 */
	async function retenirUnAvocat(avocat: AvocatAffiche) {
		if (etatAvocats.phase !== 'TROUVE') return;
		const { resultat } = etatAvocats;

		setErreur(null);
		if (resultat.releveeLe === null) {
			setErreur(
				'Ce répertoire ne porte pas de date de relevé : la fiche ne peut pas être retenue au ' +
					'carnet, faute de pouvoir dire de quand elle date.'
			);
			return;
		}

		setEnCours(true);
		try {
			await ajouterIntervenant({
				nom: `${avocat.nom} ${avocat.prenom}`.trim(),
				role: 'AVOCAT',
				ressort: resultat.barreau,
				adresse: avocat.adresse,
				siren: avocat.siren,
				origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
				sourceRepertoire: resultat.source,
				sourceReleveeLe: resultat.releveeLe
			});
			setRechercheAvocatOuverte(false);
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
		<EcranProcedure
			identifiant={id}
			donnees={
				creance === undefined || suivi === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								debiteur: creance.debiteur,
								suivi,
								procedures,
								carnet: fiches,
								intervenantChoisi,
								nomIntervenant,
								enCours,
								erreur,
								aujourdHui: aujourdHuiISO(),
								voieOuverte: voie,
								voieDeclaree,
								carnetOuvert,
								rechercheOuverte,
								etatRecherche,
								rechercheAvocatOuverte,
								repertoire: repertoire ?? null,
								barreau: barreauChoisi,
								specialite: specialiteChoisie,
								etatAvocats,
								onOuvrirVoie: (cle) => setVoieOuverte(cle),
								onFermerVoie: () => setVoieOuverte(null),
								onDeclarerVoie: () => setDeclaree(voie?.cle ?? null),
								onFermerDeclaration: () => setDeclaree(null),
								onDeclarer: (procedure, engageeLe, choix: ChoixDeclare) =>
									void declarer(procedure, engageeLe, choix),
								onConsigner: (cle, survenuLe) => void consigner(cle, survenuLe),
								onOuvrirCarnet: () => setCarnetOuvert(true),
								onFermerCarnet: () => setCarnetOuvert(false),
								onRattacher: (intervenantId) =>
									void rattacher(intervenantId as Id<'intervenants'> | null),
								onAjouter: (fiche) => void ajouter(fiche),
								onOublier: (intervenantId) => void oublier(intervenantId as Id<'intervenants'>),
								onOuvrirRechercheCommissaire: () => setRechercheOuverte(true),
								onFermerRechercheCommissaire: () => setRechercheOuverte(false),
								onChercherCommissaire: (departement) => void chercher(departement),
								onRetenirEtude: (etude) => void retenir(etude),
								onOuvrirRechercheAvocat: () => setRechercheAvocatOuverte(true),
								onFermerRechercheAvocat: () => setRechercheAvocatOuverte(false),
								onChoisirBarreau: (choisi) => {
									setBarreauChoisi(choisi);
									setSpecialiteChoisie('');
								},
								onChoisirSpecialite: (choisie) => setSpecialiteChoisie(choisie),
								onRetenirAvocat: (avocat) => void retenirUnAvocat(avocat)
							}
						}
			}
		/>
	);
}
