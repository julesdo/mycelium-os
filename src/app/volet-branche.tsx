import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { etatDuReferentiel } from '../lib/verticales/recouvrement/referentiel';
import {
	TYPES_PIECE,
	aujourdHuiISO,
	type AvocatAffiche,
	type EtatRechercheAvocat,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type FicheASaisir,
	type Lecture,
	type TourAffiche
} from '../ui';
import { relireTour } from '../lib/verticales/recouvrement/compagnon/tour';
import {
	EcranVolet,
	sectionsParDefaut,
	type LigneOuverte,
	type PositionVolet,
	type SectionVolet
} from '../screens/volet';

/**
 * LE VOLET DE PREUVE, BRANCHÉ SUR LA BASE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL VIT ICI ET PAS DANS LA ROUTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `routes/app/index.tsx` monte la FILE. Le volet est l'autre moitié de l'écran,
 * et il porte à lui seul douze requêtes et quinze mutations : les mêler à celles
 * de la file rendrait le fichier de route illisible, et surtout ferait tourner
 * les douze requêtes du dossier même quand aucune ligne n'est ouverte.
 *
 * ⚠️ IL N'EST MONTÉ QUE LORSQUE `?ligne=` DÉSIGNE UNE CRÉANCE. Un composant
 * démonté ne demande rien : c'est le seul moyen sûr de ne pas payer le dossier
 * sur une file qu'on parcourt. `useQuery` n'a pas de `skip` collectif.
 *
 * ⚠️ ET IL NE DESSINE RIEN. Tout le dessin vit dans `screens/volet.tsx`, qui ne
 * sait pas interroger Convex — c'est ce qui permet de le regarder aux quatre
 * largeurs de référence depuis la salle d'exposition, sans backend ni compte.
 */

/**
 * ⚠️ `ConvexError` PORTE SON MESSAGE DANS `.data`, PAS DANS `.message`. Les
 * refus qui comptent — « cette voie n'a pas d'après modélisé », « ce numéro
 * n'est pas accepté » — seraient remplacés par un message générique sans cette
 * lecture.
 */
function messageDuRefus(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'Enregistrement refusé.';
}

/**
 * LES FICHES DU RÉFÉRENTIEL, calculées une fois.
 *
 * ⚠️ AUCUNE DONNÉE CLIENT ICI. Ce sont les valeurs juridiques du produit — taux,
 * délais, indemnité — avec leur source et leur date de relevé. Elles ne
 * dépendent d'aucun établissement, donc elles ne passent par aucune requête.
 */
const FICHES_DU_REFERENTIEL = etatDuReferentiel().fiches;

export function VoletBranche({
	creanceId,
	position,
	onPosition,
	sectionsDansLAdresse,
	onSectionsOuvertes,
	onFermer
}: {
	creanceId: Id<'creances'>;
	position: PositionVolet;
	onPosition: (position: PositionVolet) => void;
	/**
	 * LES SECTIONS QUE L'ADRESSE NOMME, ou `null` quand elle n'en nomme AUCUNE.
	 *
	 * ⚠️ `null` ET `[]` NE SONT PAS LA MÊME CHOSE, et les confondre casse les deux
	 * moitiés de la promesse d'adressabilité. `[]` veut dire « le gérant a tout
	 * replié », et l'adresse doit le rendre tel quel au rechargement ; `null` veut
	 * dire « l'adresse ne dit rien », et c'est alors `sectionsParDefaut` qui
	 * tranche — le montant, plus ce qui attend une réponse.
	 *
	 * La règle vit dans `screens/volet.tsx`, une seule fois : elle a besoin de la
	 * ligne pour savoir s'il reste une question, donc elle s'applique ici, après
	 * la lecture, et jamais dans la route.
	 */
	sectionsDansLAdresse: readonly SectionVolet[] | null;
	onSectionsOuvertes: (sections: readonly SectionVolet[]) => void;
	onFermer: () => void;
}) {
	const aujourdHui = aujourdHuiISO();

	// ── CE QUE LE DOSSIER PORTE ──────────────────────────────────────────────
	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const preparation = useQuery(api.recouvrement.arret.preparerArret, { creanceId });
	const suivi = useQuery(api.recouvrement.apresProcedure.suiviDeLaCreance, { creanceId });
	const propositionsDeLitige = useQuery(api.recouvrement.creances.propositionsLitige, {
		creanceId
	});
	const carnet = useQuery(api.recouvrement.intervenants.monCarnet, {});
	const decomptes = useQuery(api.recouvrement.decompte.listerDecomptes, {});
	const pieces = useQuery(
		api.recouvrement.pieces.listerPiecesDuDebiteur,
		creance === undefined ? 'skip' : { debiteurId: creance.debiteurId }
	);
	const fil = useQuery(api.recouvrement.conversationLecture.filDuDossier, { creanceId });

	// ── CE QU'IL DÉCLENCHE ───────────────────────────────────────────────────
	const declarerFait = useMutation(api.recouvrement.creances.declarerFait);
	const genererUrlPiece = useMutation(api.recouvrement.pieces.genererUrlPiece);
	const deposerPiece = useMutation(api.recouvrement.pieces.deposerPiece);
	const classerPiece = useMutation(api.recouvrement.pieces.classerPiece);
	const retirerPiece = useMutation(api.recouvrement.pieces.retirerPiece);
	const consignerEvenement = useMutation(api.recouvrement.apresProcedure.consignerEvenement);
	const engagerProcedure = useMutation(api.recouvrement.apresProcedure.engagerProcedure);
	const rattacherIntervenant = useMutation(api.recouvrement.apresProcedure.rattacherIntervenant);
	const ajouterIntervenant = useMutation(api.recouvrement.intervenants.ajouterIntervenant);
	const oublierIntervenant = useMutation(api.recouvrement.intervenants.oublierIntervenant);
	const chercherUnCommissaire = useAction(
		api.recouvrement.annuaires.chercherUnCommissaireDeJustice
	);
	const demanderAuCompagnon = useAction(api.recouvrement.conversation.repondre);

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	// Les deux répertoires : leur état vit ici, parce que leurs requêtes sont
	// SAUTÉES tant que la feuille est fermée.
	const [rechercheCommissaireOuverte, setRechercheCommissaireOuverte] = useState(false);
	const [etatRechercheCommissaire, setEtatRechercheCommissaire] =
		useState<EtatRechercheCommissaire>({ phase: 'REPOS' });
	const [rechercheAvocatOuverte, setRechercheAvocatOuverte] = useState(false);
	const [barreau, setBarreau] = useState('');
	const [specialite, setSpecialite] = useState('');

	// La conversation : la question en cours, et le refus du dernier échange.
	const [question, setQuestion] = useState('');
	const [refusDuCompagnon, setRefusDuCompagnon] =
		useState<LigneOuverte['conversation']['refus']>(null);
	const [compagnonEnCours, setCompagnonEnCours] = useState(false);

	/*
	  ⚠️ LES DEUX REQUÊTES DU RÉPERTOIRE D'AVOCATS DORMENT TANT QUE LA FEUILLE EST
	  FERMÉE. Le parcours des barreaux lit un document par barreau, et la
	  recherche jusqu'à quatre mille fiches : les faire tourner à chaque ouverture
	  de volet ferait payer un répertoire que personne n'a demandé.
	*/
	const repertoire = useQuery(
		api.recouvrement.annuaires.barreauxDuRepertoire,
		rechercheAvocatOuverte ? {} : 'skip'
	);
	const avocats = useQuery(
		api.recouvrement.annuaires.chercherUnAvocat,
		rechercheAvocatOuverte && barreau !== ''
			? { barreau, ...(specialite === '' ? {} : { specialite }) }
			: 'skip'
	);

	/*
	  ⚠️ « PAS ENCORE CHOISI » ET « JE LIS » SONT DEUX ÉTATS, pas un. Les
	  confondre ferait attendre un résultat que personne n'a demandé — et, à
	  l'inverse, ferait lire un écran de repos pendant une lecture réelle.
	*/
	const etatRechercheAvocat: EtatRechercheAvocat =
		barreau === ''
			? { phase: 'AUCUN_BARREAU' }
			: avocats === undefined
				? { phase: 'EN_COURS' }
				: { phase: 'TROUVE', resultat: avocats };

	async function avec(geste: () => Promise<unknown>) {
		setErreur(null);
		setEnCours(true);
		try {
			await geste();
		} catch (e) {
			setErreur(messageDuRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	/**
	 * ⚠️ LE DÉPÔT N'IMPOSE AUCUN TYPE. La pièce entre « à classer », la lecture
	 * part en tâche de fond, et le gérant ne corrige que si elle s'est trompée.
	 * Demander la nature d'un PDF qui porte « BON DE LIVRAISON » en en-tête est
	 * exactement le champ vide que la première règle d'écran interdit.
	 */
	async function deposerDesPieces(fichiers: File[], debiteurId: Id<'debiteurs'>) {
		await avec(async () => {
			for (const fichier of fichiers) {
				const url = await genererUrlPiece();
				const reponse = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': fichier.type },
					body: fichier
				});
				if (!reponse.ok) throw new Error(`L’envoi de « ${fichier.name} » a échoué.`);
				const { storageId } = (await reponse.json()) as { storageId: Id<'_storage'> };
				await deposerPiece({
					storageId,
					filename: fichier.name,
					mimeType: fichier.type,
					debiteurId,
					factureIds: []
				});
			}
		});
	}

	/**
	 * CHERCHER UNE ÉTUDE AU REGISTRE PUBLIC.
	 *
	 * ⚠️ UN ÉCHEC NE DEVIENT JAMAIS UNE LISTE VIDE. « Aucune étude dans ce
	 * département » et « le registre n'a pas répondu » mènent à deux gestes
	 * opposés, et les confondre ferait chercher ailleurs un gérant dont la seule
	 * erreur était d'avoir cliqué une minute trop tôt.
	 */
	async function chercherUneEtude(departement: string) {
		setEtatRechercheCommissaire({ phase: 'EN_COURS' });
		try {
			const resultat = await chercherUnCommissaire({ departement });
			setEtatRechercheCommissaire({ phase: 'TROUVE', resultat });
		} catch (e) {
			setEtatRechercheCommissaire({ phase: 'ECHEC', message: messageDuRefus(e) });
		}
	}

	/**
	 * RETENIR UNE ÉTUDE AU CARNET.
	 *
	 * ⚠️ LA SOURCE ET SA DATE PARTENT AVEC LA FICHE, et la mutation la REFUSE
	 * sans elles : une fiche venue d'un répertoire public sans sa provenance
	 * devient indiscernable d'une donnée officielle et fraîche.
	 */
	async function retenirUneEtude(etude: EtudeAffichee) {
		if (etatRechercheCommissaire.phase !== 'TROUVE') return;
		const { resultat } = etatRechercheCommissaire;
		await avec(async () => {
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
			setRechercheCommissaireOuverte(false);
		});
	}

	/**
	 * RETENIR UN AVOCAT AU CARNET.
	 *
	 * ⚠️ SANS DATE DE RELEVÉ, ON NE RETIENT PAS — et on le dit. Dater du jour pour
	 * faire passer la mutation ferait entrer au carnet une fiche qui se
	 * présenterait comme relevée aujourd'hui, ce qu'elle n'est pas.
	 */
	async function retenirUnAvocat(avocat: AvocatAffiche) {
		if (etatRechercheAvocat.phase !== 'TROUVE') return;
		const { resultat } = etatRechercheAvocat;
		// Capturée AVANT la fermeture : le rétrécissement de type ne franchit pas
		// un `async () => …`, et sans elle la date pourrait repartir nulle.
		const releveeLe = resultat.releveeLe;
		if (releveeLe === null) {
			setErreur(
				'Ce répertoire ne porte pas de date de relevé : la fiche ne peut pas être retenue au ' +
					'carnet, faute de pouvoir dire de quand elle date.'
			);
			return;
		}
		await avec(async () => {
			await ajouterIntervenant({
				nom: `${avocat.nom} ${avocat.prenom}`.trim(),
				role: 'AVOCAT',
				// Le ressort est le BARREAU, tel que le fichier l'écrit : c'est lui, pas
				// la commune, qui dit devant quelle juridiction il plaide.
				ressort: resultat.barreau,
				adresse: avocat.adresse,
				siren: avocat.siren,
				origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
				sourceRepertoire: resultat.source,
				sourceReleveeLe: releveeLe
			});
			setRechercheAvocatOuverte(false);
		});
	}

	/**
	 * DEMANDER AU COMPAGNON.
	 *
	 * ⚠️ LE REFUS N'EST PAS UNE ERREUR, ET NE S'AFFICHE PAS COMME TELLE. Un
	 * plafond de coût atteint, un terme interdit relevé par un filtre, une clé
	 * absente : chacun rend un refus EN QUATRE PARTIES, qui commence par ce que
	 * le produit continue de faire — c'est-à-dire presque tout. La file et les
	 * neuf autres sections du volet se rendent sans lui (D0, D4).
	 *
	 * ⚠️ ET LA QUESTION SE VIDE DÈS L'ENVOI. Le fil la porte désormais, refus
	 * compris : `consignerEchange` écrit les deux tours, et la relire dans le
	 * champ ferait croire qu'elle n'est pas partie.
	 */
	async function demander() {
		const posee = question.trim();
		if (posee === '' || compagnonEnCours) return;
		setRefusDuCompagnon(null);
		setCompagnonEnCours(true);
		setQuestion('');
		try {
			const reponse = await demanderAuCompagnon({ creanceId, question: posee });
			if (reponse.genre === 'REFUS') setRefusDuCompagnon(reponse.refus);
		} catch (e) {
			/*
			  ⚠️ UNE PANNE DE TRANSPORT N'EST PAS UN REFUS DU DOMAINE, et elle ne se
			  déguise pas en refus en quatre parties : celui-ci affirme ce que le
			  produit CONTINUE de faire, et on ne sait rien de tel ici. Elle s'écrit
			  dans l'erreur du volet, là où les autres gestes écrivent les leurs.
			*/
			setErreur(messageDuRefus(e));
		} finally {
			setCompagnonEnCours(false);
		}
	}

	if (
		creance === undefined ||
		preparation === undefined ||
		suivi === undefined ||
		carnet === undefined ||
		pieces === undefined ||
		decomptes === undefined ||
		fil === undefined
	) {
		return (
			<EcranVolet
				ligneId={creanceId}
				donnees={{ etat: 'attente' }}
				position={position}
				onPosition={onPosition}
				sectionsOuvertes={sectionsDansLAdresse ?? []}
				onSectionsOuvertes={onSectionsOuvertes}
				onFermer={onFermer}
			/>
		);
	}

	const debiteurId = creance.debiteurId;

	/**
	 * LE MONTANT DU JOUR, ET SON REFUS QUAND IL NE SE CALCULE PAS.
	 *
	 * ⚠️ LES DEUX SONT EXCLUSIFS, ET AUCUN N'EST UN ZÉRO DE CONFORT. Un total
	 * silencieusement amputé est pire qu'un total absent annoncé : `preparerArret`
	 * rend `refusDeCalcul` avec son motif, et le volet le rend en quatre parties.
	 */
	const projection = preparation?.projection ?? null;
	const montantDuJour: LigneOuverte['montantDuJour'] =
		preparation === null || projection === null
			? null
			: {
					arreteAu: preparation.arreteAu,
					convention: preparation.convention,
					principalRestantDu: projection.principalRestantDu,
					interets: projection.interets,
					indemniteForfaitaire: projection.indemniteForfaitaire,
					total: projection.total,
					lignes: projection.lignes
				};

	const refusDuMontant: LigneOuverte['refusDuMontant'] =
		montantDuJour !== null || preparation === null || preparation.refusDeCalcul === null
			? null
			: {
					/*
					  ⚠️ CE QUE LE PRODUIT CONTINUE DE FAIRE VIENT EN PREMIER (B14, D0).
					  Un refus qui commence par ce qui ne marche pas se lit comme une
					  panne ; celui-ci commence par ce qui tient debout, et c'est presque
					  tout : les factures, leurs échéances et la prescription restent
					  comptées.
					*/
					peutFaire:
						'Les factures de ce dossier, leurs échéances et leur reste dû s’affichent, et la ' +
						'prescription continue d’être comptée sur celles dont la date de départ est lisible.',
					// Le motif du domaine, MOT POUR MOT. Le reformuler ici créerait une
					// seconde version de la vérité, qui dériverait de la première.
					constat: preparation.refusDeCalcul.detail,
					blocages: [
						'Corriger la donnée que ce constat nomme rend le calcul possible, et le total avec.'
					],
					coutDeLAttente:
						'Tant qu’elle n’est pas corrigée, les intérêts de ce dossier ne sont comptés nulle ' +
						'part, et aucun décompte ne peut être arrêté dessus.'
				};

	/**
	 * CE QUE LE LOGICIEL A SUPPOSÉ SUR CE DOSSIER.
	 *
	 * ⚠️ LA NOTE DE RÉGIME VIENT DU DOMAINE, et elle dit le délai retenu ET
	 * pourquoi. Sur un client dont le secteur n'est pas déterminé, c'est le délai
	 * LE PLUS COURT qui est retenu : le gérant qui l'ignore croit avoir plus de
	 * temps qu'il n'en a.
	 *
	 * ⚠️ AUCUN GESTE N'EST OFFERT ICI, ET LA RANGÉE LE DIT. Le secteur se précise
	 * dans le pli « Les débiteurs sans identifiant » de la file, qui porte le
	 * sélecteur ; une hypothèse qui n'offre aucun geste s'affiche quand même —
	 * on la SUBIT, et c'est ce qu'il faut lire.
	 */
	const hypotheses: LigneOuverte['hypotheses'] = [
		{
			cle: 'regime-prescription',
			enonce: creance.regimePrescriptionNote,
			fait: 'Le secteur d’activité de ce client détermine le délai de prescription.',
			ceQuiLaLeve:
				'Préciser le secteur du client, dans la vue Par client de la file, fixe le délai réellement applicable.'
		}
	];

	/**
	 * CE QUE LE LOGICIEL NE VOIT PAS.
	 *
	 * ⚠️ IL N'Y EN A QUE DEUX SOURCES, ET AUCUNE N'EST INVENTÉE : les angles morts
	 * que la machine à états de la procédure DÉCLARE — un délai qu'elle sait
	 * courir sans savoir jusqu'à quand — et les pièces attendues qui manquent.
	 * `montantEnJeu` vaut `null` : aucun des deux n'est chiffrable, et écrire un
	 * zéro ferait lire « sans enjeu ».
	 */
	const anglesMorts: LigneOuverte['anglesMorts'] = [
		...(suivi?.anglesMorts ?? []).map((constat, rang) => ({
			cle: `procedure-${rang}`,
			constat,
			montantEnJeu: null
		})),
		...creance.piecesManquantes.map((constat, rang) => ({
			cle: `piece-${rang}`,
			constat,
			montantEnJeu: null
		}))
	];

	/**
	 * LE JOURNAL — ce que la machine a fait, ou ce que le gérant a dit.
	 *
	 * ⚠️ IL NE PORTE AUJOURD'HUI QUE LES ÉVÉNEMENTS DE PROCÉDURE, parce que ce
	 * sont les SEULS faits consignés du dépôt : `apresProcedure.consignerEvenement`
	 * est le seul chemin d'écriture d'un historique daté. Les relevés du registre,
	 * les dépôts de pièces et les rapprochements de règlements écrivent l'ÉTAT,
	 * pas l'événement — ils n'ont donc rien à donner ici, et en fabriquer une
	 * ligne à partir d'un horodatage de document donnerait un journal plausible et
	 * faux.
	 */
	const journal: LigneOuverte['journal'] = (suivi?.journal ?? []).map((fait) => ({
		id: `${fait.cle}-${fait.survenuLe}`,
		libelle: fait.libelle,
		// Déclaré par le gérant : c'est lui qui dit ce qu'il a fait, le produit
		// n'engage aucune procédure (troisième ligne rouge).
		auteur: 'GERANT' as const,
		consigneLe: Date.parse(`${fait.survenuLe}T00:00:00Z`)
	}));

	const intervenantChoisi = creance.intervenantId;
	const nomIntervenant = carnet.find((fiche) => fiche._id === intervenantChoisi)?.nom ?? null;

	const valeur: LigneOuverte = {
		debiteur: creance.debiteur,
		debiteurId,
		creanceId,
		nombreFactures: creance.factures.length,
		principalRestantDu: creance.principalRestantDu,
		eligible: creance.eligible,

		montantDuJour,
		refusDuMontant,
		fiches: FICHES_DU_REFERENTIEL,

		solidite: creance.solidite,
		litige: {
			litigieux: creance.litige.litigieux,
			constats: creance.litige.constats,
			questions: creance.litige.questions.map((q) => {
				/*
				  ⚠️ `INCONNU` NE SE PROPOSE PAS, et le TYPE le dit : le domaine rend
				  `Exclude<Reponse, 'INCONNU'>`. Suggérer « je ne sais pas » coûterait
				  une ligne à lire pour zéro information.
				*/
				const proposition = propositionsDeLitige?.find((p) => p.cle === q.cle);
				if (proposition === undefined) return q;
				return {
					...q,
					proposition: {
						reponse: proposition.reponse,
						source: proposition.source,
						date: proposition.date
					}
				};
			})
		},
		onRepondre: (cle, reponse) =>
			void avec(() => declarerFait({ creanceId, cle: cle as 'CONTESTATION_ECRITE', reponse })),

		hypotheses,
		anglesMorts,

		pieces,
		optionsTypePiece: TYPES_PIECE,
		onDeposer: (fichiers) => void deposerDesPieces(fichiers, debiteurId),
		onClasser: (pieceId, type) =>
			void avec(() =>
				classerPiece({ pieceId: pieceId as Id<'pieces'>, type: type as 'BON_DE_LIVRAISON' })
			),
		onRetirer: (pieceId) => void avec(() => retirerPiece({ pieceId: pieceId as Id<'pieces'> })),

		suivi,
		voies: creance.procedures,
		carnet,
		intervenantChoisi,
		nomIntervenant,
		/*
		  ⚠️ `survenuLe` VIENT DU CHAMP, jamais de l'horloge. Les délais courent
		  depuis le FAIT, pas depuis la saisie : les confondre offrirait des jours
		  sur une caducité, en silence.
		*/
		onConsigner: (cle, survenuLe) =>
			void avec(() => consignerEvenement({ creanceId, cle, survenuLe })),
		/*
		  ⚠️ LE LOGICIEL N'ENGAGE PAS, IL ENREGISTRE — troisième ligne rouge. Et
		  l'intervenant ne se rattache que s'il a été DIT : un silence n'est pas un
		  « moi-même ». Si le rattachement échoue, l'engagement RESTE — il est déjà
		  écrit, et il porte les délais.
		*/
		onDeclarer: (procedure, engageeLe, choix) =>
			void avec(async () => {
				await engagerProcedure({ creanceId, procedure, engageeLe });
				if (choix !== null) {
					await rattacherIntervenant({
						creanceId,
						intervenantId: choix.id as Id<'intervenants'> | null
					});
				}
			}),
		onRattacher: (intervenantId) =>
			void avec(() =>
				rattacherIntervenant({
					creanceId,
					intervenantId: intervenantId as Id<'intervenants'> | null
				})
			),
		/*
		  ⚠️ `origine` EST ÉCRITE ICI, PAS SAISIE. Une fiche tapée à la main est
		  `SAISI_A_LA_MAIN` par construction ; une fiche venue d'un répertoire porte
		  EN PLUS sa source et sa date de relevé, et la mutation refuse sans elles.
		*/
		onAjouterFiche: (fiche: FicheASaisir) =>
			void avec(() =>
				ajouterIntervenant({
					nom: fiche.nom,
					role: fiche.role,
					ressort: fiche.ressort,
					origine: 'SAISI_A_LA_MAIN'
				})
			),
		onOublierFiche: (intervenantId) =>
			void avec(() => oublierIntervenant({ intervenantId: intervenantId as Id<'intervenants'> })),

		rechercheCommissaireOuverte,
		etatRechercheCommissaire,
		onOuvrirRechercheCommissaire: () => setRechercheCommissaireOuverte(true),
		onFermerRechercheCommissaire: () => setRechercheCommissaireOuverte(false),
		onChercherCommissaire: (departement) => void chercherUneEtude(departement),
		onRetenirEtude: (etude) => void retenirUneEtude(etude),
		rechercheAvocatOuverte,
		repertoire: repertoire ?? null,
		barreau,
		specialite,
		etatRechercheAvocat,
		onOuvrirRechercheAvocat: () => setRechercheAvocatOuverte(true),
		onFermerRechercheAvocat: () => setRechercheAvocatOuverte(false),
		onChoisirBarreau: (choisi) => {
			setBarreau(choisi);
			// Une spécialité choisie sous un autre barreau ne veut plus rien dire.
			setSpecialite('');
		},
		onChoisirSpecialite: setSpecialite,
		onRetenirAvocat: (avocat) => void retenirUnAvocat(avocat),

		journal,

		/**
		 * ⚠️ LE BILAN DU DÉPÔT N'EST PAS RATTACHABLE, ET ON NE L'INVENTE PAS.
		 * Aucune table ne relie une créance à l'import d'où ses factures viennent :
		 * `importsRecouvrement` compte des lignes, `facturesVente` ne porte pas
		 * l'identifiant de son dépôt. Montrer le dernier import de l'établissement
		 * ferait lire, sous « d'où viennent ces factures », un dépôt qui n'a rien à
		 * voir. La rangée datée du dépôt, dans la file, porte le bilan complet.
		 */
		depot: null,

		relances: creance.relances,

		/*
		  LES DÉCOMPTES ARRÊTÉS DE CETTE CRÉANCE, le plus récent d'abord. Un
		  décompte arrêté est figé, définitivement : rejouer produit un NOUVEAU
		  décompte daté, et c'est pourquoi ils se lisent tous.
		*/
		decomptesArretes: decomptes
			.filter((decompte) => decompte.creanceId === creanceId)
			.sort((a, b) => b.produitLe - a.produitLe)
			.map((decompte) => ({
				id: decompte._id,
				arreteAu: decompte.arreteAu,
				total: decompte.total
			})),

		conversation: {
			tours: fil.tours.map(
				(tour): TourAffiche => ({
					id: tour._id,
					role: tour.role,
					/*
					  ⚠️ LES PHRASES VIENNENT DE LA BASE, elles ne se redéduisent plus du
					  texte. `compagnon/tour.ts` porte les deux chemins : celui des tours
					  qui écrivent leurs phrases, et le repli des tours écrits avant, qui
					  redécoupe et ABANDONNE toute pastille plutôt que d'en décaler une.
					*/
					phrases: relireTour(tour),
					diteLe: tour.diteLe
				})
			),
			compteur: fil.compteur,
			refus: refusDuCompagnon,
			enCours: compagnonEnCours,
			question,
			onQuestion: setQuestion,
			onDemander: () => void demander()
		},

		enCours,
		erreur,
		aujourdHui
	};

	return (
		<EcranVolet
			ligneId={creanceId}
			donnees={{ etat: 'pret', valeur } satisfies Lecture<LigneOuverte>}
			position={position}
			onPosition={onPosition}
			sectionsOuvertes={sectionsDansLAdresse ?? sectionsParDefaut(valeur)}
			onSectionsOuvertes={onSectionsOuvertes}
			onFermer={onFermer}
		/>
	);
}
