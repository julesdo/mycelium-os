import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { depuisCentimes } from '../../lib/socle/montants';
import { etatDuReferentiel } from '../../lib/verticales/recouvrement/referentiel';
import { lireEtapes } from '../../lib/verticales/recouvrement/etapes-dossier';
import {
	TYPES_PIECE,
	aujourdHuiISO,
	pluriel,
	type AvocatAffiche,
	type EtatRechercheAvocat,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type FicheASaisir
} from '../../ui';
import { EcranCreance, type CreanceOuverte } from '../../screens/creance';

export const Route = createFileRoute('/app/dossier/$id')({
	component: PageCreance,
	errorComponent: CreanceEnErreur
});

function CreanceEnErreur() {
	return <EcranCreance donnees={{ etat: 'erreur' }} />;
}

/**
 * UNE CRÉANCE, BRANCHÉE SUR LA BASE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE SEULE ROUTE, LÀ OÙ IL Y EN AVAIT HUIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `creance.$id.tsx` était une MISE EN PAGE, et sept feuilles vivaient dessous :
 * `.index`, `.decompte`, `.litige`, `.procedure`, `.relances`, `.risques`,
 * `.solidite`. Elles sont supprimées : la créance est une PAGE, en un seul
 * défilement, et ce fichier porte tout ce qu'elles interrogeaient.
 *
 * ⚠️ ET IL NE DESSINE RIEN. Tout le dessin vit dans `screens/creance.tsx`, qui
 * ne sait pas interroger Convex — c'est ce qui permet de l'ouvrir aux quatre
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

/** La plus petite date d'une liste, `null` quand aucune n'est lisible. */
function laPlusProche(dates: readonly (string | undefined)[]): string | null {
	const connues = dates.filter((date): date is string => date !== undefined);
	if (connues.length === 0) return null;
	return connues.reduce((tot, date) => (date < tot ? date : tot));
}

function PageCreance() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;
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
	const dernier = useQuery(api.recouvrement.decompte.dernierDecompte, { creanceId });
	const pieces = useQuery(
		api.recouvrement.pieces.listerPiecesDuDebiteur,
		creance === undefined ? 'skip' : { debiteurId: creance.debiteurId }
	);

	// ── CE QU'IL DÉCLENCHE ───────────────────────────────────────────────────
	const declarerFait = useMutation(api.recouvrement.creances.declarerFait);
	const repondre = useMutation(api.recouvrement.creances.repondre);
	const choisirOrdreImputation = useMutation(api.recouvrement.creances.choisirOrdreImputation);
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

	/*
	  ⚠️ LES DEUX REQUÊTES DU RÉPERTOIRE D'AVOCATS DORMENT TANT QUE LA FEUILLE EST
	  FERMÉE. Le parcours des barreaux lit un document par barreau, et la
	  recherche jusqu'à quatre mille fiches : les faire tourner à chaque ouverture
	  de créance ferait payer un répertoire que personne n'a demandé.
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
	 * devient indiscernable d'une donnée officielle et fraîche — or celle-ci
	 * n'est ni l'un ni l'autre.
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
	 * présenterait comme relevée aujourd'hui, ce qu'elle n'est pas. Le doute ne
	 * profite jamais au produit : on refuse, et le refus se lit.
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
	 * LA PIÈCE DU DERNIER DÉCOMPTE ARRÊTÉ, TÉLÉCHARGÉE.
	 *
	 * ⚠️ LE MODULE PDF EST IMPORTÉ À LA DEMANDE. `jspdf` et son greffon de
	 * tableaux pèsent plusieurs centaines de kilo-octets ; les charger avec
	 * l'écran ferait payer ce poids à chaque ouverture, pour un bouton qu'on
	 * presse une fois par créance.
	 *
	 * ⚠️ ET LE CONTENU NE SE COMPOSE PAS ICI. `composerPiece` est pure et testée ;
	 * cette route ne fait que lui passer le décompte figé et donner un nom au
	 * fichier. Écrire une seule phrase du document ici créerait un second endroit
	 * où le produit parle de droit.
	 */
	async function telechargerLaPiece() {
		if (dernier === undefined || dernier === null) return;

		const [{ composerPiece }, { rendrePieceEnPdf, nomFichierPiece }] = await Promise.all([
			import('../../lib/verticales/recouvrement/piece'),
			import('../../ui/piece-decompte')
		]);

		const piece = composerPiece({
			arreteAu: dernier.arreteAu,
			convention: dernier.convention,
			principalRestantDu: depuisCentimes(dernier.principalRestantDu),
			interets: depuisCentimes(dernier.interets),
			indemniteForfaitaire: depuisCentimes(dernier.indemniteForfaitaire),
			total: depuisCentimes(dernier.total),
			creancier: dernier.creancier,
			debiteur: dernier.debiteur,
			lignes: dernier.lignes.map((ligne) => ({
				reference: ligne.reference,
				principalRestantDu: depuisCentimes(ligne.principalRestantDu),
				interets: depuisCentimes(ligne.interets),
				indemniteForfaitaire: depuisCentimes(ligne.indemniteForfaitaire),
				total: depuisCentimes(ligne.total),
				segments: ligne.segments.map((segment) => ({
					debut: segment.debut,
					fin: segment.fin,
					jours: segment.jours,
					principal: depuisCentimes(segment.principal),
					taux: segment.taux,
					baseAnnuelle: segment.baseAnnuelle,
					interets: depuisCentimes(segment.interets)
				})),
				imputations: (ligne.imputations ?? []).map((imputation) => ({
					date: imputation.date,
					nature: imputation.nature,
					montant: depuisCentimes(imputation.montant),
					surInterets: depuisCentimes(imputation.surInterets),
					surPrincipal: depuisCentimes(imputation.surPrincipal)
				}))
			})),
			imputation:
				dernier.imputation === undefined
					? undefined
					: {
							ordre: dernier.imputation.ordre,
							confirme: dernier.imputation.confirme,
							totalAutreOrdre:
								dernier.imputation.totalAutreOrdre === undefined
									? null
									: depuisCentimes(dernier.imputation.totalAutreOrdre)
						},
			abandons: dernier.abandons.map((abandon) => ({
				reference: abandon.reference,
				montantEnJeu: abandon.montantEnJeu === null ? null : depuisCentimes(abandon.montantEnJeu),
				explication: abandon.explication
			}))
		});

		rendrePieceEnPdf(piece).save(nomFichierPiece(piece));
	}

	/*
	  ⚠️ ON ATTEND TOUT CE QUE LA PAGE AFFICHE, PAS SEULEMENT LA CRÉANCE. L'écran
	  s'affichait dès la créance lue, et pendant l'aller-retour des autres il
	  annonçait « Aucune voie », « Moi-même » et un décompte « À produire » qui
	  existaient peut-être depuis des mois.
	*/
	if (
		creance === undefined ||
		preparation === undefined ||
		suivi === undefined ||
		propositionsDeLitige === undefined ||
		carnet === undefined ||
		decomptes === undefined ||
		dernier === undefined ||
		pieces === undefined
	) {
		return <EcranCreance donnees={{ etat: 'attente' }} />;
	}

	const debiteurId = creance.debiteurId;

	/**
	 * LE MONTANT DU JOUR, ET SON REFUS QUAND IL NE SE CALCULE PAS.
	 *
	 * ⚠️ LES DEUX SONT EXCLUSIFS, ET AUCUN N'EST UN ZÉRO DE CONFORT. Un total
	 * silencieusement amputé est pire qu'un total absent annoncé : `preparerArret`
	 * rend `refusDeCalcul` avec son motif, et la page le rend en quatre parties.
	 */
	const projection = preparation?.projection ?? null;
	const montantDuJour: CreanceOuverte['montantDuJour'] =
		preparation === null || projection === null
			? null
			: {
					arreteAu: preparation.arreteAu,
					convention: preparation.convention,
					principalRestantDu: projection.principalRestantDu,
					interets: projection.interets,
					indemniteForfaitaire: projection.indemniteForfaitaire,
					total: projection.total,
					lignes: projection.lignes,
					imputation: {
						ordre: projection.imputation.ordre,
						confirme: projection.imputation.confirme,
						totalAutreOrdre: projection.imputation.totalAutreOrdre ?? null
					}
				};

	const refusDuMontant: CreanceOuverte['refusDuMontant'] =
		montantDuJour !== null || preparation === null || preparation.refusDeCalcul === null
			? null
			: {
					/*
					  ⚠️ CE QUE LE PRODUIT CONTINUE DE FAIRE VIENT EN PREMIER. Un refus qui
					  commence par ce qui ne marche pas se lit comme une panne ; celui-ci
					  commence par ce qui tient debout, et c'est presque tout.
					*/
					peutFaire:
						'Les factures de ce dossier, leurs échéances et leur reste dû s’affichent, et la ' +
						'date limite pour agir en justice continue d’être comptée sur celles dont la date de départ est lisible.',
					// Le motif du domaine, MOT POUR MOT. Le reformuler ici créerait une
					// seconde version de la vérité, qui dériverait de la première.
					constat: preparation.refusDeCalcul.detail,
					blocages: [
						'Corriger la donnée que ce constat nomme rend le calcul possible, et le total avec.'
					],
					coutDeLAttente:
						'Tant qu’elle n’est pas corrigée, les pénalités de ce dossier ne sont comptées nulle ' +
						'part, et aucun décompte ne peut être arrêté dessus.'
				};

	/**
	 * CE QUE LE LOGICIEL A SUPPOSÉ SUR CE DOSSIER.
	 *
	 * ⚠️ LA NOTE DE RÉGIME VIENT DU DOMAINE, et elle dit le délai retenu ET
	 * pourquoi. Sur un client dont le secteur n'est pas déterminé, c'est le délai
	 * LE PLUS COURT qui est retenu : le gérant qui l'ignore croit avoir plus de
	 * temps qu'il n'en a.
	 */
	const exigibilitesDeduites = creance.factures.filter((facture) => facture.exigibiliteDeduite);

	const hypotheses: CreanceOuverte['hypotheses'] = [
		{
			cle: 'regime-prescription',
			enonce: creance.regimePrescriptionNote,
			fait: 'Ce que vous vendez à ce client détermine le délai pour agir en justice.',
			ceQuiLaLeve:
				'Préciser le secteur du client, sur sa fiche, fixe le délai réellement applicable.'
		},
		/*
		  ⚠️ UNE EXIGIBILITÉ DÉDUITE EST UNE HYPOTHÈSE, ET LE CHAMP LE DIT DÉJÀ.
		  `exigibiliteDeduite` voyage sur chaque facture depuis l'import et n'était
		  lu nulle part sur cet écran : le jour où les intérêts partent d'une date
		  que personne n'a écrite sur la facture, c'est ici que ça doit se lire, pas
		  dans le décompte où le chiffre a déjà l'air acquis.
		*/
		...(exigibilitesDeduites.length === 0
			? []
			: [
					{
						cle: 'exigibilite-deduite',
						enonce: `La date à partir de laquelle les pénalités courent a été déduite sur ${exigibilitesDeduites.length} facture${pluriel(exigibilitesDeduites.length)} de ce dossier.`,
						fait: `Aucune date d’exigibilité n’était lisible sur ${exigibilitesDeduites
							.map((facture) => facture.reference)
							.join(', ')}.`,
						ceQuiLaLeve:
							'Corriger la date d’exigibilité sur la facture fait repartir le calcul de la date réelle.'
					}
				])
	];

	/**
	 * CE QUE LE LOGICIEL NE VOIT PAS.
	 *
	 * ═══════════════════════════════════════════════════════════════════════════
	 * ⚠️ DEUX SOURCES, ET AUCUNE N'EST `piecesManquantes`
	 * ═══════════════════════════════════════════════════════════════════════════
	 *
	 * Les angles morts que la machine à états de la procédure DÉCLARE — un délai
	 * qu'elle sait courir sans savoir jusqu'à quand — et les factures dont la
	 * prescription ne se compte pas.
	 *
	 * ⚠️ `piecesManquantes` N'EST PAS UN ANGLE MORT, ET LE RENDRE ICI ÉTAIT UN
	 * DÉFAUT VU AU NAVIGATEUR. C'est un `ClePiece[]` — des clés d'énumération —
	 * et la section affichait donc « BON_DE_LIVRAISON (montant non chiffrable) »,
	 * mot pour mot. Deux fautes en une : un identifiant interne lu par le gérant,
	 * et un doublon de la section « Ce que les pièces établissent », qui compte
	 * les mêmes pièces AVEC la phrase qui dit ce que chacune établit.
	 *
	 * ⚠️ UNE PRESCRIPTION QUI NE SE COMPTE PAS EST CHIFFRABLE, ELLE. Le reste dû
	 * de la facture est exactement ce qui n'est pas surveillé, et c'est la seule
	 * échéance qui éteint définitivement une créance sans que personne n'ait rien
	 * fait. Un gérant qui croit sa prescription surveillée ne la surveille pas
	 * lui-même.
	 */
	const anglesMorts: CreanceOuverte['anglesMorts'] = [
		...(suivi?.anglesMorts ?? []).map((constat, rang) => ({
			cle: `procedure-${rang}`,
			constat,
			montantEnJeu: null
		})),
		...creance.factures
			.filter((facture) => facture.datePrescription === undefined)
			.map((facture) => ({
				cle: `prescription-${facture._id}`,
				constat: `La date limite pour agir en justice de ${facture.reference} n’est pas comptée : aucune date de départ exploitable n’a été lue sur cette facture.`,
				montantEnJeu: facture.resteDu
			}))
	];

	const intervenantChoisi = creance.intervenantId;
	const nomIntervenant = carnet.find((fiche) => fiche._id === intervenantChoisi)?.nom ?? null;

	const valeur: CreanceOuverte = {
		identifiant: id,
		debiteur: creance.debiteur,
		debiteurId,
		...(creance.debiteurEmail === undefined ? {} : { debiteurEmail: creance.debiteurEmail }),
		santeDebiteur: creance.santeDebiteur,
		nombreFactures: creance.factures.length,
		principalRestantDu: creance.principalRestantDu,

		// Où en est le dossier : déduit des faits, jamais d'un verdict.
		etapes: lireEtapes({
			nombreFactures: creance.factures.length,
			resteDuCentimes: creance.principalRestantDu,
			lettresValidees: [],
			professionnelDesigne: creance.intervenantId !== null,
			procedureEngageeLe: creance.engageeLe,
			classe: creance.statut === 'CLOSE',
			dateLimiteAgir: laPlusProche(creance.factures.map((f) => f.datePrescription)),
			aujourdHui
		}),

		// Les deux dates que l'en-tête porte, lues sur les factures du dossier :
		// la première échéance fait courir les intérêts, la première prescription
		// éteint. Aucune des deux n'est calculée ici — le domaine les a déjà
		// posées sur chaque facture.
		echeanceLaPlusAncienne: laPlusProche(creance.factures.map((f) => f.dateEcheance)),
		prescriptionLaPlusProche: laPlusProche(creance.factures.map((f) => f.datePrescription)),

		montantDuJour,
		refusDuMontant,
		fiches: FICHES_DU_REFERENTIEL,
		decomptesArretes: decomptes
			.filter((decompte) => decompte.creanceId === creanceId)
			// Le plus récent d'abord : c'est celui qu'on vient relire.
			.sort((a, b) => (a.arreteAu < b.arreteAu ? 1 : a.arreteAu > b.arreteAu ? -1 : 0))
			.map((decompte) => ({
				id: decompte._id,
				arreteAu: decompte.arreteAu,
				total: decompte.total
			})),
		onTelechargerLaPiece: dernier === null ? null : () => void telechargerLaPiece(),

		hypotheses,
		anglesMorts,

		litige: {
			litigieux: creance.litige.litigieux,
			constats: creance.litige.constats,
			questions: creance.litige.questions.map((question) => {
				/*
				  ⚠️ `INCONNU` NE SE PROPOSE PAS, et le TYPE le dit : le domaine rend
				  `Exclude<Reponse, 'INCONNU'>`. Suggérer « je ne sais pas » coûterait
				  une ligne à lire pour zéro information.
				*/
				const proposition = propositionsDeLitige.find((p) => p.cle === question.cle);
				if (proposition === undefined) return question;
				return {
					...question,
					proposition: {
						reponse: proposition.reponse,
						source: proposition.source,
						date: proposition.date
					}
				};
			})
		},
		lignesConditions: creance.lignesConditions,
		onDeclarerFait: (cle, reponse) =>
			void avec(() => declarerFait({ creanceId, cle: cle as 'CONTESTATION_ECRITE', reponse })),
		onRepondreCondition: (condition, reponse) =>
			void avec(() => repondre({ creanceId, reponses: { [condition]: reponse } })),
		onChoisirImputation: (ordre) => void avec(() => choisirOrdreImputation({ creanceId, ordre })),

		solidite: creance.solidite,
		risques: creance.risques,

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
		onDeclarerVoie: (procedure, engageeLe, choix) =>
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
		/*
		  ⚠️ CHANGER DE BARREAU EFFACE LA SPÉCIALITÉ. Garder « Droit du travail » en
		  passant de Nantes à Rennes ferait rendre zéro fiche sur un filtre que
		  personne n'a reposé — le gérant lirait « aucun avocat » là où il n'y a
		  qu'un filtre resté en place.
		*/
		onChoisirBarreau: (choisi) => {
			setBarreau(choisi);
			setSpecialite('');
		},
		onChoisirSpecialite: (choisie) => setSpecialite(choisie),
		onRetenirAvocat: (avocat) => void retenirUnAvocat(avocat),

		relances: creance.relances,

		enCours,
		erreur,
		aujourdHui
	};

	return <EcranCreance donnees={{ etat: 'pret', valeur }} />;
}
