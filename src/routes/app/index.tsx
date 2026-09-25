import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Facultatif,
	aujourdHuiISO,
	ceQuiManque,
	travauxDuVeilleur,
	type DebiteurRapprochable,
	type DestinationRangee,
	type UrgenceRangee
} from '../../ui';
import { depuisEuros, enCentimes } from '../../lib/socle/montants';
import { QUESTIONS_LITIGE } from '../../lib/verticales/recouvrement/litige';
import { AvatarConnecte } from '../../app/identite';
import { CarteQontoBranchee } from '../../app/connexion-qonto';
import { Recherche } from '../../app/recherche';
import { SelecteurEtablissement } from '../../app/selecteur-etablissement';
import { EcranFile, type FileAffichee, type RangeeDeLaFile } from '../../screens/file';

/**
 * `/app` — « AUJOURD'HUI », le premier onglet de la barre du bas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `?ligne=` A DISPARU, ET C'EST LA DÉCISION STRUCTURANTE DE CETTE PASSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce paramètre ouvrait le volet de preuve : un troisième panneau, à droite,
 * avec sa propre rangée de trois positions — Pièce, Décompte, Conversation — et
 * ses sept sections repliables. Il existait parce qu'aucune VRAIE page
 * n'existait : un client et une créance vivaient chacun dans un volet sans
 * adresse.
 *
 * Les deux ont maintenant la leur, refaites : `/app/debiteurs/$id` et
 * `/app/creance/$id`, une page, un seul défilement. Taper une rangée y MÈNE,
 * par un vrai lien. Deux niveaux, pas trois.
 *
 * La résolution de la destination se fait ICI, à un seul endroit, et c'est la
 * bonne frontière : `surveillance.ts` dit de QUOI il parle — un client, une
 * créance — et jamais où ça se trouve. « Un identifiant, jamais une route », dit
 * `CibleEvenement`, et `frontiere.test.ts` a raison de l'interdire à l'aller.
 *
 * ⚠️ CE QUI PART AVEC LE VOLET, ET QUI N'A PAS DE NOUVEAU FOYER, EST NOMMÉ DANS
 * LE RAPPORT DE CETTE PASSE — le journal des faits, le bilan d'import rattaché à
 * une pièce, et la conversation du compagnon. Rien n'est supprimé en silence.
 *
 * ⚠️ TOUT LE DESSIN VIT DANS `screens/file.tsx`, QUI NE SAIT PAS INTERROGER
 * CONVEX. C'est ce qui permet de le voir aux quatre largeurs de référence depuis
 * la salle d'exposition, sans backend ni authentification. Ce fichier-ci ne fait
 * que lire, traduire, et monter les quatre surfaces que seule l'application peut
 * composer : l'avatar, le veilleur, le sélecteur d'établissement et la palette
 * de recherche.
 */
export const Route = createFileRoute('/app/')({
	component: File,
	errorComponent: FileEnErreur
});

function FileEnErreur() {
	return <EcranFile donnees={{ etat: 'erreur' }} />;
}

/**
 * CE QUE CHAQUE TYPE DIT DE LUI-MÊME AU PLI, accordé au singulier ET au pluriel.
 *
 * ⚠️ AUCUN TYPE NE SE REPLIE, ET C'EST UN REFUS ARGUMENTÉ. `PliDeLaFile` écrit
 * « N <libellé>, rien à faire » : une facture échue et non soldée, une santé
 * dégradée au registre ou une habitude rompue appellent toutes une décision, et
 * les ranger sous « rien à faire » serait le mensonge exact que le pli existe
 * pour éviter. Le jour où le produit saura dire qu'une rangée n'appelle
 * réellement rien — une facture payée dans les délais, un dépôt sans rien
 * d'écarté — c'est cette table-ci qui le dira, et `trierSelonLePli` le fera.
 */
const PLI_PAR_TYPE: Record<string, { readonly un: string; readonly plusieurs: string }> = {
	PRESCRIPTION_PROCHE: {
		un: 'date limite pour agir en justice proche',
		plusieurs: 'dates limites pour agir en justice proches'
	},
	ECHEANCE_PROCEDURE: { un: 'échéance de procédure', plusieurs: 'échéances de procédure' },
	FACTURE_ECHUE: { un: 'facture échue', plusieurs: 'factures échues' },
	DEBITEUR_DEGRADE: { un: 'client dégradé au registre', plusieurs: 'clients dégradés au registre' },
	HABITUDE_ROMPUE: { un: 'habitude de paiement rompue', plusieurs: 'habitudes de paiement rompues' }
};

/**
 * LES CHAMPS DE PROPOSITION QUI SONT AUSSI UNE RÉPONSE AU QUESTIONNAIRE.
 *
 * ⚠️ IL N'Y EN A PAS D'AUTRES, ET C'EST LE COMPILATEUR QUI LE TIENT : la liste
 * se dérive de `QUESTIONS_LITIGE`, comme celle de `convex/…/propositions.ts`.
 * Un fait ajouté au questionnaire entre ici sans qu'on y pense.
 *
 * ⚠️ ET ELLE SERT À SÉPARER, PAS À RANGER. Une proposition de litige collée sous
 * une rangée d'obstacle — « Prescription dans 41 jours » suivie de « Proposé :
 * oui » — fait lire la proposition comme si elle portait sur l'obstacle. La
 * réponse de litige se confirme dans SA rangée, sous SA question (§ 4.x, D6) :
 * ces propositions-là quittent donc les rangées d'obstacle.
 */
const CHAMPS_DE_LITIGE: ReadonlySet<string> = new Set(QUESTIONS_LITIGE.map((q) => q.cle));

/**
 * QUAND CHAQUE PROPOSITION EST APPARUE SOUS LES YEUX, POUR LA PREMIÈRE FOIS.
 *
 * ⚠️ HORS DU COMPOSANT, ET CE N'EST PAS UN CONTOURNEMENT DE RÈGLE. Ce registre
 * n'est pas de l'état d'affichage : rien ne se rend à partir de lui, et le
 * modifier ne doit JAMAIS relancer un rendu. Posé dans une référence React, il
 * faisait échouer la règle de pureté du compilateur — une référence lue par une
 * fonction appelée pendant le rendu, même si la lecture n'a lieu qu'à l'appui.
 * La règle avait raison sur la forme : ce n'est pas une référence qu'il fallait.
 *
 * Il ne porte que des identifiants opaques de propositions et des horodatages
 * de navigateur. Rien ne s'en affiche, rien n'en sort vers le serveur sauf la
 * DURÉE ci-dessous, et il est borné par le plafond de sept propositions par
 * jour.
 */
const PREMIERE_VUE = new Map<string, number>();

/**
 * DEPUIS COMBIEN DE TEMPS CETTE PROPOSITION EST SOUS LES YEUX.
 *
 * ⚠️ UNE DURÉE, JAMAIS DEUX HORODATAGES. C'est la deuxième des trois mesures de
 * D13 — la médiane du délai entre l'affichage et l'appui, celle qui dit si on a
 * LU ou si on a tapé. Deux horodatages absolus venus du client rendraient cette
 * médiane fausse dès qu'une machine est déréglée, et c'est précisément elle qui
 * doit trancher si sept est le bon nombre.
 *
 * Zéro quand la proposition n'a pas encore été vue : on ne prête jamais au
 * gérant une lecture qu'on n'a pas observée.
 */
function delaiDeLecture(id: string): number {
	const vueLe = PREMIERE_VUE.get(id);
	return vueLe === undefined ? 0 : Math.max(0, Date.now() - vueLe);
}

/**
 * LE REFUS DU SERVEUR, MOT POUR MOT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `ConvexError` PORTE SON MESSAGE DANS `.data`, PAS DANS `.message`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `.message` rend le texte tel que le client Convex l'encadre — son préfixe et
 * l'identifiant de la requête — et pas la phrase composée par la mutation. Or
 * c'est cette phrase-là qui porte le seul détail permettant de reprendre :
 * « les factures choisies font 4 810,00 €, pas 4 820,00 € ». Montrer le cadre du
 * harnais à sa place remplace un chiffre par un numéro de ticket.
 *
 * La même lecture qu'à `arret.$id.tsx`, `decompte.$id.tsx` et `debiteurs.tsx`.
 */
function messageDuRefus(e: unknown): string {
	if (typeof e === 'object' && e !== null && 'data' in e) {
		const data = (e as { data: unknown }).data;
		if (typeof data === 'string') return data;
	}
	return e instanceof Error && e.message !== '' ? e.message : 'Rapprochement refusé.';
}

function File() {
	const aujourdHui = aujourdHuiISO();

	const flux = useQuery(api.recouvrement.surveillance.flux, {});
	// L'état de la connexion Qonto : la carte ne se passe à l'écran que si elle
	// est activée, pour ne jamais rétrograder l'import sous une carte absente.
	const qonto = useQuery(api.connexions.qontoDonnees.maConnexionQonto, {});
	// La date d'arrêté vient de la SEULE horloge de l'interface : deux lectures
	// différentes feraient diverger les totaux autour de minuit. Voir `ui/horloge.ts`.
	const revelation = useQuery(api.recouvrement.revelation.revelation, { arreteAu: aujourdHui });
	const battement = useQuery(api.recouvrement.battement.dernierBattement, {});
	/**
	 * ⚠️ `limite: 5` BORNE LA LECTURE, et c'est la même que celle du veilleur, donc
	 * Convex la sert une fois. Au-delà de cinq dépôts simultanément en machine, la
	 * sixième rangée n'apprend plus rien.
	 */
	const depots = useQuery(api.recouvrement.depotMutations.listerImports, { limite: 5 });
	const notifications = useQuery(api.notifications.listMyNotifications, {});
	const marquerLue = useMutation(api.notifications.markAsRead);
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	const creances = useQuery(api.recouvrement.lecture.listerCreances, {});
	/**
	 * LES PROPOSITIONS DU JOUR (D13), POSÉES PAR LE BATTEMENT.
	 *
	 * ⚠️ L'ÉCRAN LIT, ET N'ÉCRIT QUE SUR UN APPUI. Une `query` n'écrit pas, et une
	 * mutation déclenchée sur un chemin de lecture réactif serait une boucle : la
	 * pose se fait une fois par nuit et par établissement, dans `battement.ts`.
	 *
	 * ⚠️ ET LE JOUR EST CELUI DE L'INTERFACE. Demander « les propositions
	 * d'aujourd'hui » avec l'horloge du serveur ferait, autour de minuit, lire un
	 * jour pendant que la tête en compte un autre.
	 */
	const propositions = useQuery(api.recouvrement.propositions.propositionsDuJour, {
		jour: aujourdHui
	});
	const retenirProposition = useMutation(api.recouvrement.propositions.retenir);
	const ecarterProposition = useMutation(api.recouvrement.propositions.ecarter);

	/**
	 * LES QUESTIONS DE LITIGE ENCORE OUVERTES, À L'ÉCHELLE DE L'ÉTABLISSEMENT.
	 *
	 * ⚠️ `creances.propositionsLitige` travaille par CRÉANCE : elle suppose un
	 * dossier déjà ouvert, et cet écran n'en ouvre aucun — c'est lui qui dit
	 * lesquels ouvrir. `lecture.questionsDeLitige` lit un seul index
	 * (`creances by_org`) et ne joint rien : le nom du client et le montant en jeu
	 * sont déjà en main plus bas.
	 */
	const questionsDeLitige = useQuery(api.recouvrement.lecture.questionsDeLitige, {});
	const declarerFait = useMutation(api.recouvrement.creances.declarerFait);

	/**
	 * LA RÉPONSE EN COURS D'ÉCRITURE, PAR CRÉANCE.
	 *
	 * ⚠️ TROIS BOUTONS QUI RESTENT ACTIFS PENDANT L'ALLER-RETOUR LAISSENT
	 * RÉPONDRE DEUX FOIS. `declarerFaitLitige` REMPLACE la réponse précédente :
	 * un double appui sur « Oui » puis « Non » écrirait deux déclarations datées
	 * dans le journal pour un seul geste, et la piste d'audit ne dirait plus ce
	 * que le gérant a voulu.
	 */
	const [litigeEnCours, setLitigeEnCours] = useState<string | null>(null);

	// ── LE RAPPROCHEMENT D'UN VIREMENT ───────────────────────────────────────

	/**
	 * CE QUE LE GÉRANT A SOUS LES YEUX SUR SON RELEVÉ, ET RIEN D'AUTRE.
	 *
	 * ⚠️ AUCUNE DE CES VALEURS N'A DE SOURCE DANS LE PRODUIT, et c'est pourquoi
	 * elles se saisissent. Un règlement que l'import ne sait rattacher est COMPTÉ
	 * puis JETÉ (`import.ts`) : il n'existe aucune table d'où lire « un virement
	 * de 4 820 € est arrivé le 12/09 de la part de Durand ». La proposition
	 * automatique de rapprochement n'a donc pas de source ; la surface manuelle,
	 * elle, reste, et elle est ce qui empêche de relancer un client qui a déjà
	 * payé.
	 *
	 * ⚠️ ET LA RECHERCHE NE PART PAS À CHAQUE FRAPPE. C'est `montantCherche`,
	 * posé au moment de l'appui, qui déclenche la requête : chercher pendant
	 * qu'on tape ferait défiler des propositions sous les doigts.
	 *
	 * ⚠️ ET LA DATE DE VALEUR N'EST PAS ICI. Elle l'était, posée au moment de la
	 * recherche et relue au moment du solde — deux instants séparés par un
	 * calendrier qui reste modifiable entre les deux. Elle vit maintenant dans le
	 * calendrier seul et part AVEC le geste de solde : voir `ui/lettrage.tsx`.
	 */
	const [debiteurLettrage, setDebiteurLettrage] = useState<Id<'debiteurs'> | null>(null);
	const [montantCherche, setMontantCherche] = useState<bigint | null>(null);
	const [erreurLettrage, setErreurLettrage] = useState<string | null>(null);

	/**
	 * ⚠️ `skip` TANT QUE LES DEUX NE SONT PAS POSÉS. Sans ça, l'écran paierait
	 * une recherche de combinaisons à chaque rendu, sur un montant que personne
	 * n'a demandé.
	 */
	const propositionLettrage = useQuery(
		api.recouvrement.lettrage.proposer,
		debiteurLettrage === null || montantCherche === null
			? 'skip'
			: { debiteurId: debiteurLettrage, montant: montantCherche }
	);
	const appliquerLettrage = useMutation(api.recouvrement.lettrage.appliquer);

	const genererUrl = useMutation(api.recouvrement.depotMutations.genererUrlDepot);
	const enregistrer = useMutation(api.recouvrement.depotMutations.enregistrerFichier);

	// ── LES PROPOSITIONS, ET LE DÉLAI DE LECTURE QU'ELLES EXIGENT ────────────

	/*
	  ON NOTE L'INSTANT OÙ CHAQUE PROPOSITION EST APPARUE, ET RIEN D'AUTRE.

	  ⚠️ DANS UN EFFET, ET JAMAIS DANS UN ÉTAT. Lire l'horloge pendant le rendu
	  rendrait ce composant impur ; poser un état dans un effet est interdit par
	  le projet et relancerait un rendu à chaque arrivée de proposition. Le
	  registre vit hors du composant (voir `PREMIERE_VUE` plus haut, avec la
	  raison), et cet effet ne fait que l'alimenter.
	*/
	useEffect(() => {
		for (const proposition of propositions?.propositions ?? []) {
			if (!PREMIERE_VUE.has(proposition._id)) PREMIERE_VUE.set(proposition._id, Date.now());
		}
	}, [propositions]);

	if (flux === undefined || revelation === undefined) {
		return <EcranFile donnees={{ etat: 'attente' }} />;
	}

	// ── CE QUI SERT À NOMMER ET À RÉSOUDRE ───────────────────────────────────

	const nomDuDebiteur = new Map((debiteurs ?? []).map((d) => [d._id as string, d.denomination]));

	/**
	 * LA CRÉANCE D'UN CLIENT, ET IL N'Y EN A QU'UNE RÈGLE.
	 *
	 * ⚠️ `listerCreances` REND LES PLUS MÛRES D'ABORD, puis le montant le plus
	 * lourd. La première de ce client est donc celle qu'on ouvrirait de toute
	 * façon — et cet ordre ne dépend d'aucune horloge, donc la résolution est
	 * stable d'un rechargement à l'autre.
	 */
	const creanceDuDebiteur = new Map<string, string>();
	for (const creance of creances ?? []) {
		if (!creanceDuDebiteur.has(creance.debiteurId as string)) {
			creanceDuDebiteur.set(creance.debiteurId as string, creance._id as string);
		}
	}
	const estUneCreance = new Set((creances ?? []).map((c) => c._id as string));

	/**
	 * OÙ MÈNE UNE RANGÉE — et il n'y a que deux destinations possibles.
	 *
	 * ═══════════════════════════════════════════════════════════════════════════
	 * ⚠️ LA CRÉANCE D'ABORD, LE CLIENT ENSUITE, ET JAMAIS RIEN
	 * ═══════════════════════════════════════════════════════════════════════════
	 *
	 * Une rangée vise tantôt une créance, tantôt un client — c'est la
	 * SURVEILLANCE qui le décide, pas l'écran : `PRESCRIPTION_PROCHE`,
	 * `FACTURE_ECHUE`, `DEBITEUR_DEGRADE` et `HABITUDE_ROMPUE` visent un DÉBITEUR
	 * (« une facture n'a pas d'écran à elle »), `ECHEANCE_PROCEDURE` une
	 * CRÉANCE.
	 *
	 * ⚠️ UN CLIENT SANS CRÉANCE CONSTITUÉE MÈNE À SA PAGE, ET C'EST UN GAIN. Le
	 * volet était PAR CRÉANCE : une rangée dont le client n'avait encore aucune
	 * créance n'était pas ouvrable du tout — une santé dégradée au registre
	 * s'affichait sans qu'on puisse aller voir le client concerné. La page d'un
	 * client, elle, existe dès qu'il existe : la rangée mène donc toujours
	 * quelque part.
	 *
	 * `undefined` ne reste possible que pour un événement SANS CIBLE, que
	 * `Evenement.cible` autorise explicitement. Il s'affiche, il ne mène nulle
	 * part, et il n'en a pas l'air.
	 */
	const destinationDe = (
		cibleId: string | null,
		debiteurId: string | null
	): DestinationRangee | undefined => {
		if (cibleId !== null && estUneCreance.has(cibleId)) {
			return { vers: '/app/dossier/$id', parametres: { id: cibleId } };
		}
		if (debiteurId !== null) {
			return { vers: '/app/clients/$id', parametres: { id: debiteurId } };
		}
		return undefined;
	};

	/**
	 * LA PROPOSITION D'UNE CRÉANCE, S'IL Y EN A UNE QUI ATTEND ENCORE.
	 *
	 * ⚠️ UNE SEULE PAR RANGÉE, ET C'EST LA PLUS ANCIENNE. Le plafond en autorise
	 * trois au plus par rangée ; la rangée, elle, n'en affiche qu'une — trois
	 * propositions sous un même obstacle redemanderaient trois décisions sur une
	 * ligne qui n'en nomme qu'une.
	 *
	 * ⚠️ ET UNE PROPOSITION DÉJÀ DÉCIDÉE NE REVIENT PAS. Elle reste en base, datée
	 * et signée — c'est la trace de ce qui a été proposé ce jour-là — mais la
	 * rangée ne la redemande plus.
	 */
	const propositionDe = new Map<string, (typeof propositionsEnAttente)[number]>();
	/**
	 * ⚠️ CELLES QUI RÉPONDENT AU QUESTIONNAIRE VONT DANS L'AUTRE PANIER. Une
	 * proposition de litige affichée sous une rangée d'obstacle se lit comme si
	 * elle portait sur l'obstacle : « Prescription dans 41 jours » puis
	 * « Proposé : oui ». Sa place est sous SA question, dans la rangée de litige
	 * — la séparation que D6 exige.
	 */
	const propositionLitigeDe = new Map<string, (typeof propositionsEnAttente)[number]>();
	const propositionsEnAttente = (propositions?.propositions ?? []).filter(
		(proposition) => proposition.etat === 'PROPOSEE'
	);
	for (const proposition of [...propositionsEnAttente].sort((a, b) => a.poseeLe - b.poseeLe)) {
		const panier = CHAMPS_DE_LITIGE.has(proposition.champ) ? propositionLitigeDe : propositionDe;
		if (!panier.has(proposition.cible)) panier.set(proposition.cible, proposition);
	}

	/**
	 * LES DOSSIERS DONT LE LOGICIEL A EU QUELQUE CHOSE À DIRE AUJOURD'HUI —
	 * retenu, écarté, ou encore en attente.
	 *
	 * ⚠️ TOUS LES ÉTATS, ET C'EST CE QUI REND L'ÉCART SURVIVABLE. Écarter une
	 * proposition ne répond PAS à la question : `ecarter` le dit lui-même, « un
	 * écart efface une proposition de l'écran, jamais une réponse déjà donnée ».
	 * Si la rangée ne tenait qu'aux propositions EN ATTENTE, écarter la ferait
	 * disparaître avant que le gérant ait pu répondre — c'est-à-dire qu'un refus
	 * emporterait la question qu'il ouvre.
	 *
	 * Le fait qui donne droit à la rangée est « le logiciel avait une réponse à
	 * proposer aujourd'hui », et ce fait ne se retire pas quand on la refuse.
	 * Demain, la proposition n'est plus du jour et la rangée s'en va d'elle-même.
	 */
	const champsProposesAujourdHui = new Map<string, Set<string>>();
	for (const proposition of propositions?.propositions ?? []) {
		if (!CHAMPS_DE_LITIGE.has(proposition.champ)) continue;
		const champs = champsProposesAujourdHui.get(proposition.cible) ?? new Set<string>();
		champs.add(proposition.champ);
		champsProposesAujourdHui.set(proposition.cible, champs);
	}

	/**
	 * LES DEUX APPUIS D'UNE PROPOSITION, ÉCRITS UNE FOIS.
	 *
	 * ⚠️ `lueDepuisMs` EST REQUIS PAR LE SERVEUR, EXPRÈS : c'est la deuxième des
	 * trois mesures de D13. Recopier ces deux gestes à chaque site d'appel les
	 * ferait diverger, et c'est le genre d'oubli qui ne se signale jamais — la
	 * médiane devient fausse sans qu'un test ne tombe.
	 */
	const gestesDe = (proposition: (typeof propositionsEnAttente)[number]) => ({
		valeur: proposition.valeur,
		source: proposition.sourceLisible,
		date: proposition.jour,
		onRetenir: () =>
			void retenirProposition({
				propositionId: proposition._id,
				lueDepuisMs: delaiDeLecture(proposition._id)
			}),
		onEcarter: (motif: string) =>
			void ecarterProposition({
				propositionId: proposition._id,
				motif,
				lueDepuisMs: delaiDeLecture(proposition._id)
			})
	});

	// ── LES RANGÉES DE LA SURVEILLANCE ───────────────────────────────────────

	const rangeesDuFlux: RangeeDeLaFile[] = flux.evenements.map((evenement, rang) => {
		const cible = evenement.cible;
		const debiteurId =
			cible === undefined
				? null
				: cible.genre === 'DEBITEUR'
					? cible.id
					: (cible.debiteurId ?? null);

		/**
		 * ⚠️ UN ÉVÉNEMENT SANS CIBLE GARDE UNE CLÉ STABLE. Le rang ne suffirait pas :
		 * il change dès qu'un événement plus urgent arrive, et React remonterait la
		 * rangée — avec le champ de motif à moitié écrit dedans. Le type et la
		 * référence, eux, décrivent le fait.
		 */
		const id = cible?.id ?? `${evenement.type}:${evenement.reference}:${rang}`;
		const destination = destinationDe(cible?.id ?? null, debiteurId);

		/*
		  ⚠️ LA PROPOSITION SE RATTACHE PAR SA CIBLE, ET ELLE EST AFFICHÉE AVEC SA
		  PROVENANCE. « Proposé : oui, réserve lue sur BL-2024-77. » La provenance
		  n'est pas un ornement : c'est elle qui distingue une proposition d'une case
		  précochée, et le libellé vient du serveur, le même que celui du journal.
		*/
		const proposition = propositionDe.get(id);

		return {
			genre: 'OBSTACLE' as const,
			id,
			debiteur:
				(debiteurId === null ? undefined : nomDuDebiteur.get(debiteurId)) ?? evenement.reference,
			...(destination === undefined ? {} : { destination }),
			// L'explication du domaine, MOT POUR MOT. La reformuler ici créerait une
			// seconde version de la vérité, qui dériverait de la première.
			obstacle: evenement.explication,
			urgence: evenement.urgence as UrgenceRangee,
			montant: evenement.montant,
			...(evenement.dateDuFait === undefined ? {} : { dateDuFait: evenement.dateDuFait }),
			...(proposition === undefined ? {} : { proposition: gestesDe(proposition) }),
			pli: {
				libelle: PLI_PAR_TYPE[evenement.type] ?? { un: 'rangée', plusieurs: 'rangées' },
				rienATrancher: false
			}
		};
	});

	/**
	 * LES DÉPÔTS, EN RANGÉES DATÉES — jamais un bandeau refermable.
	 *
	 * ⚠️ `ui/bilan-import.tsx` PORTE LA RÈGLE MOT POUR MOT : « un import qui
	 * annonce 198 factures sans mentionner les deux lignes écartées ment par
	 * omission, et l'omission porte sur l'argent qu'on ne réclamera pas ». Le pli
	 * ne les mange que le jour où RIEN n'a été écarté.
	 */
	const rangeesDeDepot: RangeeDeLaFile[] = (depots ?? []).map((depot) => {
		const ecartees =
			depot.bilan === undefined
				? 0
				: depot.bilan.ignoreesTotal + depot.bilan.horsPerimetre + depot.bilan.reglementsOrphelins;
		const termine = depot.statut === 'TERMINE';

		return {
			genre: 'DEPOT' as const,
			id: depot._id as string,
			debiteur: depot.filename,
			depot: {
				id: depot._id as string,
				filename: depot.filename,
				statut:
					depot.statut === 'TERMINE'
						? 'TERMINE'
						: depot.statut === 'ECHOUE'
							? 'ECHOUE'
							: 'EN_COURS',
				...(depot.etape === undefined ? {} : { etape: depot.etape }),
				...(depot.erreur === undefined ? {} : { erreur: depot.erreur }),
				...(depot.bilan === undefined ? {} : { bilan: depot.bilan }),
				deposeLe: depot.deposeLe
			},
			pli: {
				libelle: termine
					? { un: 'dépôt terminé', plusieurs: 'dépôts terminés' }
					: { un: 'dépôt en cours de lecture', plusieurs: 'dépôts en cours de lecture' },
				// Un dépôt qui travaille se REGARDE : il change sous les yeux, et le
				// replier reviendrait à cacher le seul traitement visible du produit.
				rienATrancher: termine,
				lignesEcartees: ecartees
			}
		};
	});

	// ── LES QUESTIONS DE LITIGE, EN RANGÉES ──────────────────────────────────

	/**
	 * QUAND UNE QUESTION DE LITIGE DEVIENT UNE RANGÉE — et pourquoi pas toujours.
	 *
	 * ═══════════════════════════════════════════════════════════════════════════
	 * ⚠️ « UN CHAMP QU'AUCUNE SOURCE NE REMPLIT DEVIENT UNE RANGÉE AU MOMENT OÙ
	 * IL CHANGE UN CHIFFRE » — la règle est de la spec, et elle tranche ici.
	 * ═══════════════════════════════════════════════════════════════════════════
	 *
	 * `lecture.questionsDeLitige` rend TOUTES les questions ouvertes de
	 * l'établissement — trois cents le premier jour d'un portefeuille sérieux.
	 * Les poser toutes le même matin est exactement le rythme d'acquittement que
	 * le plafond de D13 existe pour empêcher : on apprend à taper au lieu de lire,
	 * et ce sont des qualifications juridiques qu'on tape.
	 *
	 * Deux faits, et deux seulement, font d'une question une rangée :
	 *
	 *   1. **Le dossier est déjà sur la table aujourd'hui.** Sa créance porte une
	 *      rangée — prescription proche, décompte arrêtable, échéance de
	 *      procédure. La réponse de litige décide de ce qu'on peut faire de ce
	 *      dossier-là, aujourd'hui.
	 *   2. **Le logiciel a une réponse à proposer.** Une réserve a été lue sur une
	 *      pièce, le battement a posé la proposition, et elle attend. « Le logiciel
	 *      décide, le gérant confirme » : ne pas la montrer ferait ressaisir ce
	 *      qu'on a lu à sa place.
	 *
	 * ⚠️ LES DEUX SE CALCULENT SUR CE QUE L'ÉCRAN TIENT DÉJÀ — le flux et les
	 * propositions du jour — donc aucune lecture de plus. Trier côté serveur
	 * obligerait la requête à rejouer la surveillance entière pour connaître le
	 * premier fait, ce qui coûterait l'écran entier une seconde fois.
	 */
	const questionParCreance = new Map(
		(questionsDeLitige ?? []).map((q) => [q.creanceId as string, q])
	);
	const montantDeLaCreance = new Map(
		(creances ?? []).map((c) => [c._id as string, c.principalRestantDu])
	);

	const rangeeDeLitige = (
		question: NonNullable<typeof questionsDeLitige>[number],
		urgence: UrgenceRangee
	): RangeeDeLaFile => {
		const creanceId = question.creanceId as string;

		const proposition = propositionLitigeDe.get(creanceId);

		return {
			genre: 'LITIGE' as const,
			/**
			 * ⚠️ UN IDENTIFIANT PRÉFIXÉ, ET DÉRIVÉ DE LA CRÉANCE. Sa créance porte
			 * déjà une rangée du même identifiant : deux rangées de même clé se
			 * battraient pour la clé React et l'une des deux se remonterait au moindre
			 * changement de l'autre — avec, dedans, le champ de motif à moitié écrit.
			 */
			id: `litige:${creanceId}`,
			debiteur: nomDuDebiteur.get(question.debiteurId as string) ?? 'Client sans dénomination',
			// Elle mène à SA créance, jamais à la première du client : c'est de CE
			// dossier qu'on répond.
			destination: { vers: '/app/dossier/$id', parametres: { id: creanceId } },
			// La question du domaine, MOT POUR MOT. `litige.ts` la formule pour être
			// répondue en regardant sa boîte mail ; la reformuler ici en ferait une
			// seconde version, qui dériverait de la première.
			question: question.question,
			urgence,
			montant: montantDeLaCreance.get(creanceId) ?? null,
			/*
			  ⚠️ SEULEMENT SI ELLE PORTE SUR LA QUESTION AFFICHÉE. Une proposition
			  posée sur un autre fait s'afficherait sous une question à laquelle elle
			  ne répond pas, et « Retenir » écrirait ailleurs que ce qu'on lit.
			*/
			...(proposition === undefined || proposition.champ !== question.cle
				? {}
				: { proposition: gestesDe(proposition) }),
			onRepondre: (reponse: 'OUI' | 'NON' | 'INCONNU') => {
				setLitigeEnCours(creanceId);
				void declarerFait({
					creanceId: question.creanceId,
					cle: question.cle,
					reponse
				}).finally(() => setLitigeEnCours(null));
			},
			enCours: litigeEnCours === creanceId,
			pli: {
				libelle: { un: 'question de litige', plusieurs: 'questions de litige' },
				rienATrancher: false
			}
		};
	};

	/**
	 * LE DOSSIER QU'UNE RANGÉE DU FLUX MET SUR LA TABLE.
	 *
	 * ⚠️ SUR L'IDENTIFIANT DE LA CIBLE, ET JAMAIS SUR CELUI DU CLIENT SEUL. Une
	 * rangée qui NOMME sa créance ne doit pas retomber sur la première du client :
	 * on poserait la question d'un autre dossier que celui qu'on lit.
	 */
	const dossierDeLaRangee = (rangee: RangeeDeLaFile): string | null =>
		estUneCreance.has(rangee.id) ? rangee.id : (creanceDuDebiteur.get(rangee.id) ?? null);

	/**
	 * ⚠️ LA RANGÉE DE LITIGE SUIT CELLE DE SA CRÉANCE, et ce n'est pas cosmétique.
	 * D6 sépare la composition de la réponse de litige pour qu'un tap unique
	 * n'emporte pas deux qualifications ; les éloigner l'une de l'autre ferait
	 * payer cette séparation par un balayage de l'écran entier.
	 */
	const rangeesAvecLitige: RangeeDeLaFile[] = [];
	/**
	 * ⚠️ PAR CRÉANCE, ET PAS PAR RANGÉE. Deux rangées du même client résolvent
	 * vers le même dossier : sans cette clé-ci, elles poseraient deux rangées de
	 * litige de MÊME identifiant.
	 */
	const litigePose = new Set<string>();
	for (const rangee of rangeesDuFlux) {
		rangeesAvecLitige.push(rangee);
		const creanceId = dossierDeLaRangee(rangee);
		if (creanceId === null || litigePose.has(creanceId)) continue;
		const question = questionParCreance.get(creanceId);
		if (question === undefined) continue;
		litigePose.add(creanceId);
		// L'urgence de la question est celle du dossier qu'elle bloque : une
		// créance qui se prescrit dans 41 jours n'attend pas sa réponse plus
		// longtemps qu'elle n'attend le reste.
		rangeesAvecLitige.push(
			rangeeDeLitige(question, rangee.genre === 'OBSTACLE' ? rangee.urgence : 'NORMALE')
		);
	}

	/*
	  ET CELLES QUE SEULE UNE PROPOSITION APPELLE. Leur créance n'a rien à
	  l'échéance aujourd'hui ; c'est le logiciel qui a quelque chose à dire, et
	  l'urgence est donc celle d'un suivi, pas d'un délai.
	*/
	for (const [creanceId, champs] of champsProposesAujourdHui) {
		if (litigePose.has(creanceId)) continue;
		const question = questionParCreance.get(creanceId);
		// La question a été répondue depuis que la proposition a été posée : la
		// reposer redemanderait ce qui vient d'être tranché. La proposition reste
		// en base, datée — c'est la trace de ce qui a été proposé ce jour-là.
		if (question === undefined || !champs.has(question.cle)) continue;
		litigePose.add(creanceId);
		rangeesAvecLitige.push(rangeeDeLitige(question, 'NORMALE'));
	}

	// ── LE RAPPROCHEMENT D'UN VIREMENT, UNE RANGÉE POUR L'ÉTABLISSEMENT ──────

	/**
	 * LES CLIENTS CHEZ QUI UN RAPPROCHEMENT A DE LA MATIÈRE.
	 *
	 * ⚠️ « FACTURES OUVERTES », PAS « ENCOURS ». Une facture couverte au centime
	 * par des règlements mais restée `IMPAYEE` pèse zéro dans l'encours et se
	 * rapproche quand même ; un client à jour, lui, n'a rien à solder et n'a rien
	 * à faire dans cette liste.
	 */
	const debiteursRapprochables: DebiteurRapprochable[] = (debiteurs ?? [])
		.filter((debiteur) => debiteur.facturesOuvertes > 0)
		.map((debiteur) => ({
			id: debiteur._id as string,
			denomination: debiteur.denomination,
			facturesOuvertes: debiteur.facturesOuvertes,
			encours: debiteur.encours
		}));

	/**
	 * LE CLIENT DU RAPPROCHEMENT, RELU SUR LA LISTE À CHAQUE RENDU.
	 *
	 * ═══════════════════════════════════════════════════════════════════════════
	 * ⚠️ UN CLIENT SOLDÉ QUITTE LA LISTE, ET L'ÉTAT LE DÉSIGNAIT ENCORE
	 * ═══════════════════════════════════════════════════════════════════════════
	 *
	 * `debiteursRapprochables` ne garde que ceux dont une facture est encore
	 * ouverte. Le client qu'on vient de solder en sort, le libellé du sélecteur
	 * retombe sur « Choisir le client » — et l'état, lui, le désignait toujours :
	 * le gérant croyait repartir à zéro et lançait sa recherche suivante sur
	 * l'ancien client.
	 *
	 * ⚠️ DÉRIVÉ AU RENDU, ET PAS SEULEMENT REMIS À ZÉRO APRÈS LE SOLDE. La remise
	 * à zéro ne couvre que le chemin qu'on a en tête ; la liste, elle, peut aussi
	 * se vider d'ailleurs — un second onglet, un import qui solde. Ce qui ne peut
	 * pas se re-casser, c'est que le choix N'EXISTE que tant que la liste le
	 * porte : ce qu'on lit est alors ce qui partira.
	 */
	const debiteurRapprochable =
		debiteurLettrage !== null && debiteursRapprochables.some((d) => d.id === debiteurLettrage)
			? debiteurLettrage
			: null;

	function chercherLettrage(saisi: string) {
		if (debiteurRapprochable === null) return;
		setErreurLettrage(null);
		setMontantCherche(null);
		try {
			// `depuisEuros` refuse trois décimales, NaN et la notation exponentielle.
			// Un montant mal lu ici deviendrait un règlement faux en base.
			setMontantCherche(enCentimes(depuisEuros(saisi.trim().replace(/\s/g, ''))));
		} catch {
			setErreurLettrage(
				`« ${saisi} » n’est pas un montant en euros. Deux décimales au plus, sans arrondi.`
			);
		}
	}

	/**
	 * ⚠️ LA DATE ARRIVE AVEC LE GESTE, elle n'est pas relue dans un état. Elle
	 * était posée au moment de « Chercher » et relue au moment de « Solder » ;
	 * entre les deux, le calendrier reste modifiable. La date d'un règlement est
	 * le point d'arrêt des intérêts : corriger la date puis solder enregistrait un
	 * MONTANT faux, pendant que l'écran affichait la date corrigée.
	 */
	async function soldeLesFactures(references: readonly string[], total: bigint, date: string) {
		if (debiteurRapprochable === null) return;
		setErreurLettrage(null);
		try {
			await appliquerLettrage({
				debiteurId: debiteurRapprochable,
				references: [...references],
				montant: total,
				date
			});
			// Soldées : la recherche a fait son travail. La laisser affichée
			// proposerait de solder une seconde fois des factures qui ne sont plus
			// candidates, et le serveur refuserait — un bouton qui ne peut plus rien.
			setMontantCherche(null);
			setDebiteurLettrage(null);
		} catch (e) {
			// Le refus vient du serveur et NOMME ce qu'il a compté — « les factures
			// choisies font 4 810,00 €, pas 4 820,00 € ». Le reformuler perdrait le
			// seul détail qui permet de reprendre.
			setErreurLettrage(messageDuRefus(e));
		}
	}

	/**
	 * UNE SEULE RANGÉE POUR TOUT L'ÉTABLISSEMENT, ET ELLE NOMME SON CLIENT.
	 *
	 * ═══════════════════════════════════════════════════════════════════════════
	 * ⚠️ POURQUOI PAS UNE RANGÉE PAR CLIENT
	 * ═══════════════════════════════════════════════════════════════════════════
	 *
	 * `ui/lettrage.tsx` se rend replié, en une ligne intitulée « Rapprocher un
	 * virement ». Quarante clients donneraient quarante lignes identiques, qu'on
	 * ne peut distinguer qu'en les ouvrant : le contraire d'un énoncé de travail.
	 * Et surtout, le produit n'a AUCUNE source qui dise de qui vient un virement —
	 * un règlement que l'import ne sait rattacher est compté puis jeté — donc
	 * aucune de ces quarante rangées ne saurait dire pourquoi elle est là.
	 *
	 * Une rangée, un client à choisir dans une liste que le logiciel a fermée :
	 * c'est la seule répartition honnête entre ce qu'il sait et ce que le gérant
	 * est seul à savoir. Elle disparaît quand plus aucune facture n'est ouverte.
	 */
	const rangeesDeLettrage: RangeeDeLaFile[] =
		debiteursRapprochables.length === 0
			? []
			: [
					{
						genre: 'LETTRAGE' as const,
						id: 'lettrage',
						debiteur: 'Rapprocher un virement',
						lettrage: {
							/*
							  ⚠️ LA PROPOSITION NE SURVIT PAS À SON CLIENT. Tant que le choix
							  n'est plus dans la liste, il n'y a personne à solder : afficher
							  des combinaisons trouvées pour lui proposerait de solder les
							  factures d'un client que le sélecteur ne nomme plus.
							*/
							proposition: debiteurRapprochable === null ? null : (propositionLettrage ?? null),
							enCours:
								debiteurRapprochable !== null &&
								montantCherche !== null &&
								propositionLettrage === undefined,
							erreur: erreurLettrage,
							onChercher: chercherLettrage,
							onAppliquer: (references, total, date) =>
								void soldeLesFactures(references, total, date),
							debiteurs: debiteursRapprochables,
							debiteurChoisi: debiteurRapprochable,
							onDebiteur: (id) => {
								// Changer de client JETTE la proposition en cours : elle porte
								// les factures d'un autre, et solder les mauvaises laisserait
								// les vraies en impayé.
								setDebiteurLettrage(id as Id<'debiteurs'>);
								setMontantCherche(null);
								setErreurLettrage(null);
							}
						},
						pli: {
							libelle: { un: 'rapprochement possible', plusieurs: 'rapprochements possibles' },
							// Elle ne se replie pas : c'est le SEUL endroit du produit où un
							// virement groupé s'enregistre, et un pli la rendrait injoignable.
							rienATrancher: false
						}
					}
				];

	const rangees = [...rangeesAvecLitige, ...rangeesDeLettrage, ...rangeesDeDepot];

	// ── LA TÊTE, ET LE SECOND NOMBRE ─────────────────────────────────────────

	/**
	 * LE PRÉAVIS, LU SUR LA MÊME SOURCE QUE LA SURVEILLANCE.
	 *
	 * ⚠️ « SOUS PRÉAVIS » EST UNE QUESTION DE PRESCRIPTION, PAS DE DATE PROCHE. On
	 * la lit sur les événements que la surveillance a déjà classés
	 * `PRESCRIPTION_PROCHE`, jamais en recomparant des dates ici. Deux calculs de
	 * préavis divergeraient au premier changement de `PREAVIS`.
	 */
	const prescriptionSousPreavis = flux.evenements
		.filter((e) => e.type === 'PRESCRIPTION_PROCHE')
		.reduce((total, e) => total + (e.montant ?? 0n), 0n);

	// ── LE TRAVAIL DE FOND ───────────────────────────────────────────────────

	const travaux = travauxDuVeilleur({
		battement,
		// `undefined` est le CHARGEMENT, pas le vide. Traiter l'un pour l'autre
		// ferait clignoter une rangée « en attente de lecture » à chaque ouverture.
		depotsEnCours: (depots ?? [])
			.filter((depot) => depot.statut === 'EN_ATTENTE' || depot.statut === 'LECTURE')
			.map((depot) => ({
				id: depot._id,
				filename: depot.filename,
				...(depot.etape === undefined ? {} : { etape: depot.etape })
			})),
		// Les non lues seulement : une notification lue a fait son travail.
		trouvailles: (notifications ?? [])
			.filter((notification) => !notification.isRead)
			.map((notification) => ({
				id: notification._id as string,
				titre: notification.title,
				message: notification.message,
				...(notification.link === undefined ? {} : { lien: notification.link })
			})),
		// Ouvrir vaut acquitter. Sans ça, la pastille du veilleur ne s'éteint
		// jamais et le compte devient du décor.
		onLire: (id) => void marquerLue({ notificationId: id as Id<'notifications'> }),
		aujourdHui
	});

	// ── LE DÉPÔT DE FICHIERS ─────────────────────────────────────────────────

	/**
	 * ⚠️ LE DÉPÔT VIT ICI PARCE QUE CET ÉCRAN EST LA PORTE D'ENTRÉE DES FACTURES.
	 * Sans factures, le produit ne mesure rien : tout l'écran attend ce geste.
	 *
	 * ⚠️ ET ON NE NAVIGUE PAS VERS LE SUIVI. La rangée datée du dépôt apparaît
	 * dès que la lecture commence et change d'étape sous les yeux (règle d'écran
	 * n° 2) : quitter l'écran pour la regarder serait revenir au défaut qu'on
	 * vient de supprimer.
	 */
	async function deposer(fichiers: File[]) {
		for (const fichier of fichiers) {
			const url = await genererUrl({});
			const reponse = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': fichier.type || 'application/octet-stream' },
				body: fichier
			});
			if (!reponse.ok) throw new Error(`L’envoi de ${fichier.name} a échoué.`);

			const { storageId } = (await reponse.json()) as { storageId: Id<'_storage'> };
			await enregistrer({
				storageId,
				filename: fichier.name,
				mimeType: fichier.type || 'application/octet-stream',
				// Un export comptable se reconnaît à son extension ; le reste est une
				// facture déposée. Plus rien à choisir avant l'envoi.
				mode: /\.(csv|txt|tsv|xml)$/i.test(fichier.name) ? 'EXPORT_COMPTABLE' : 'FACTURE_DEPOSEE'
			});
		}
	}

	const valeur: FileAffichee = {
		aujourdHui,
		tete: {
			total: revelation.total,
			nombreFactures: revelation.nombreFactures,
			// Les TROIS parts, jamais `supplement` — qui est déjà la somme des deux
			// dernières et les compterait deux fois. Voir `ui/composition.tsx`.
			parts: {
				principal: revelation.principal,
				interets: revelation.interets,
				indemnites: revelation.indemnites
			},
			nonChiffrees: revelation.nonChiffrees,
			prescriptionSousPreavis
		},
		rangees,
		travaux,
		/**
		 * ⚠️ LES DEUX SE RENDENT À PLAT, ET C'EST UNE RÈGLE D'AUDITABILITÉ. Elles
		 * vivaient derrière une puce de portée qu'il fallait aller chercher :
		 * c'est-à-dire nulle part. Un utilisateur qui croit sa prescription
		 * surveillée ne la surveille pas lui-même.
		 */
		hypotheses: flux.hypotheses,
		anglesMorts: flux.anglesMorts,
		// ⚠️ `null` QUAND LE BATTEMENT N'A PAS DIT ce qu'il a différé : on ne
		// sait pas, et `propositionsDuJour` le rend tel quel plutôt que zéro.
		resumeDuPlafond: propositions?.resume ?? null,
		/**
		 * ⚠️ `undefined` NE COMPTE PAS COMME « MANQUANT ». Tant que les requêtes
		 * chargent, on ne sait pas si le profil existe : afficher « votre identité
		 * de créancier manque » le temps d'un aller-retour ferait clignoter un
		 * reproche à chaque ouverture, et on apprend à ignorer ce qui clignote.
		 */
		verrous:
			profil === undefined || debiteurs === undefined
				? []
				: ceQuiManque({
						// Le SIREN est ce qui compte : c'est lui qui porte `estCommercant`,
						// donc la condition « entre commerçants ».
						profilCreancierComplet: profil !== null && profil.siren !== undefined,
						nombreFactures: revelation.nombreFactures,
						debiteursSansSiren: debiteurs.filter((d) => d.siren === undefined).length
					}),
		onFichiers: (fichiers) => void deposer(fichiers),
		accepteFichiers: '.csv,.txt,.pdf,image/*',
		/*
		  LES QUATRE SURFACES DE LA RANGÉE DU HAUT. Chacune est isolée : sans
		  session — au chargement, après une expiration, dans la salle d'exposition
		  — la requête lève, et un ornement ne doit jamais emporter l'écran de
		  travail.
		*/
		avatar: (
			<Facultatif>
				<AvatarConnecte />
			</Facultatif>
		),
		selecteur: (
			<Facultatif>
				<SelecteurEtablissement />
			</Facultatif>
		),
		palette: (
			<Facultatif>
				<Recherche />
			</Facultatif>
		),
		// La carte n'est passée que si Qonto est activé : sinon l'import reste le
		// geste principal, au lieu d'être rétrogradé sous une carte absente.
		connexion: qonto?.disponible ? (
			<Facultatif>
				<CarteQontoBranchee />
			</Facultatif>
		) : undefined
	};

	return <EcranFile donnees={{ etat: 'pret', valeur }} />;
}
