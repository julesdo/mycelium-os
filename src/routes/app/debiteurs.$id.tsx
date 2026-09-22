import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate, type HistoryState } from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { depuisEuros, enCentimes } from '../../lib/socle/montants';
import {
	aujourdHuiISO,
	secteursProposes,
	type EtatRecherche,
	type EtablissementPropose
} from '../../ui';
import { EcranDebiteur } from '../../screens/debiteur';

/**
 * LA PAGE D'UN DÉBITEUR — une adresse, et tout est dessus.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE ROUTE EXISTE MAINTENANT, ET N'EXISTAIT PAS AVANT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un débiteur n'avait pas d'adresse. Son détail vivait dans le volet droit de
 * la liste (`/app/debiteurs?d=<id>`), et deux morceaux de lui — son habitude de
 * paiement, ses pièces — avaient chacun leur sous-page. Le reproche, mot pour
 * mot : « un débiteur = une page de détail avec toutes ses infos dessus ».
 *
 * ⚠️ ELLE EST IMBRIQUÉE SOUS `/app/debiteurs`, ET C'EST CE QUI TIENT LES DEUX
 * VOLETS. Le fichier ne porte pas de `_` final : la route devient enfant de la
 * liste, qui la rend dans son `Outlet` à l'intérieur de `MaitreDetail`. Au-delà
 * de 1024 px la liste reste à gauche et cette page occupe la droite ; en
 * dessous, la page occupe l'écran entier et le retour ramène à la liste.
 *
 * ⚠️ TOUT CE QUI EST POSÉ POUR LE DÉBITEUR VIT DANS `DebiteurBranche`, REMONTÉ
 * PAR SA `key`. Le routeur réutilise le composant d'une route quand seul son
 * paramètre change : sans cette `key`, la sélection de factures, le montant
 * d'un virement, les refus et les candidats du registre d'un client passeraient
 * au suivant. C'est la règle React du projet — on remet à zéro avec une `key`,
 * on ne pose pas d'état dans un effet.
 */
export const Route = createFileRoute('/app/debiteurs/$id')({
	component: PageDebiteur,
	errorComponent: DebiteurEnErreur
});

function DebiteurEnErreur() {
	const { id } = Route.useParams();
	return <EcranDebiteur identifiant={id} donnees={{ etat: 'erreur' }} />;
}

function PageDebiteur() {
	const { id } = Route.useParams();
	return <DebiteurBranche key={id} debiteurId={id as Id<'debiteurs'>} />;
}

/**
 * LES DÉBITEURS DÉJÀ PRÉSENTÉS AU REGISTRE PENDANT CETTE SESSION.
 *
 * ⚠️ HORS DU COMPOSANT, PARCE QUE LA `key` LE REMONTE. Un état ou une `ref`
 * repartirait de zéro à chaque ouverture de fiche, et un aller-retour dans la
 * liste rejouerait la recherche — cinquante clients importés feraient cinquante
 * appels répétés au registre public.
 */
const DEJA_INTERROGES = new Set<string>();

/**
 * Branchée sur la base ; le dessin vit dans `screens/debiteur.tsx`.
 */
function DebiteurBranche({ debiteurId }: { debiteurId: Id<'debiteurs'> }) {
	const navigate = useNavigate();

	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	const creances = useQuery(api.recouvrement.lecture.listerCreances, {});
	const factures = useQuery(api.recouvrement.lecture.listerFacturesDuDebiteur, { debiteurId });
	const pieces = useQuery(api.recouvrement.pieces.listerPiecesDuDebiteur, { debiteurId });
	/**
	 * L'HABITUDE DE PAIEMENT.
	 *
	 * La date du jour vient de la SEULE horloge de l'interface, partagée avec la
	 * file et la prescription la plus proche de cette page : deux lectures
	 * différentes feraient diverger un retard autour de minuit. Voir
	 * `ui/horloge.ts`.
	 */
	const comportement = useQuery(api.recouvrement.comportement.lire, {
		debiteurId,
		aujourdHui: aujourdHuiISO()
	});

	const creerCreance = useMutation(api.recouvrement.creances.creer);
	const renseignerSiren = useMutation(api.recouvrement.debiteurs.renseignerSiren);
	const chercherAuRegistre = useAction(api.recouvrement.debiteurs.chercherAuRegistre);
	const renseignerEmail = useMutation(api.recouvrement.debiteurs.renseignerEmail);
	const renseignerSecteur = useMutation(api.recouvrement.debiteurs.renseignerSecteur);
	const poserTaux = useMutation(api.recouvrement.tauxContractuel.renseigner);
	const appliquerLettrage = useMutation(api.recouvrement.lettrage.appliquer);
	const genererUrlPiece = useMutation(api.recouvrement.pieces.genererUrlPiece);
	const deposerPiece = useMutation(api.recouvrement.pieces.deposerPiece);
	const classerPiece = useMutation(api.recouvrement.pieces.classerPiece);
	const retirerPiece = useMutation(api.recouvrement.pieces.retirerPiece);

	const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set());
	const [erreur, setErreur] = useState<string | null>(null);
	const [erreurSiren, setErreurSiren] = useState<string | null>(null);
	const [erreurEmail, setErreurEmail] = useState<string | null>(null);
	const [recherche, setRecherche] = useState<EtatRecherche>({ phase: 'REPOS' });
	/**
	 * LE CONSTAT QUE LE SERVEUR REND SUR LE TAUX.
	 *
	 * Il est gardé en état plutôt qu'affiché en passant : il dit si le taux saisi
	 * passe sous le plancher légal — une information que le créancier doit
	 * pouvoir relire, pas voir clignoter.
	 */
	const [constatTaux, setConstatTaux] = useState<string | null>(null);
	const [montantCherche, setMontantCherche] = useState<bigint | null>(null);
	const [erreurLettrage, setErreurLettrage] = useState<string | null>(null);
	const [depotEnCours, setDepotEnCours] = useState(false);
	const [erreurDepot, setErreurDepot] = useState<string | null>(null);

	const proposition = useQuery(
		api.recouvrement.lettrage.proposer,
		montantCherche === null ? 'skip' : { debiteurId, montant: montantCherche }
	);

	const debiteur = debiteurs?.find((ligne) => ligne._id === debiteurId);

	/**
	 * CE QUE LE PRODUIT SAIT DU NUMÉRO : `null` tant que la liste n'a pas répondu,
	 * la chaîne vide quand elle a répondu et qu'il n'y en a pas.
	 *
	 * ⚠️ SANS CETTE DISTINCTION, L'EFFET CI-DESSOUS NE PART JAMAIS. Sa dépendance
	 * était `debiteur?.siren`, qui vaut `undefined` AVANT la réponse de la
	 * requête ET APRÈS, sur un débiteur sans numéro : la valeur ne changeait pas,
	 * React ne rejouait pas l'effet, et la recherche automatique ne se
	 * déclenchait que sur les fiches où elle n'avait rien à faire.
	 */
	const numeroConnu = debiteur === undefined ? null : (debiteur.siren ?? '');

	/**
	 * ⚠️ LE REGISTRE S'INTERROGE TOUT SEUL, PARCE QUE LE NOM EST DÉJÀ LÀ.
	 *
	 * Il fallait toucher « Chercher « BOULANGERIE MARTIN » » sur chaque client
	 * sans SIREN, alors que le BODACC se cherche par nom et sans clé : c'est la
	 * première règle d'écran prise à l'envers — « aucun écran ne demande ce que
	 * le logiciel peut déduire ».
	 *
	 * ⚠️ ET IL PROPOSE, IL NE CHOISIT TOUJOURS RIEN. Même avec un seul candidat,
	 * aucun SIREN ne s'enregistre sans un appui : un SIREN d'homonyme, bien
	 * formé, désigne une AUTRE entreprise, et le radar rendrait sur elle un
	 * « rien au registre » faux et rassurant.
	 *
	 * ⚠️ DANS UN EFFET, ET C'EST LE SEUL ENDROIT OÙ CE PRODUIT EN A BESOIN. Ce
	 * n'est pas une dérivation posée dans un état — c'est un appel à un SERVICE
	 * EXTERNE déclenché par l'arrivée sur une page, ce qu'aucun gestionnaire ne
	 * peut porter depuis que la fiche est une adresse : on y entre par un lien,
	 * par l'historique, ou par un rechargement.
	 */
	useEffect(() => {
		if (numeroConnu === null || numeroConnu !== '') return;
		if (DEJA_INTERROGES.has(debiteurId)) return;
		void chercherAuRegistrePour();
		// `chercherAuRegistrePour` est recréée à chaque rendu ; la garde par
		// `DEJA_INTERROGES` est ce qui empêche la répétition, pas la liste de
		// dépendances.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [numeroConnu, debiteurId]);

	async function chercherAuRegistrePour() {
		DEJA_INTERROGES.add(debiteurId);
		setErreurSiren(null);
		setRecherche({ phase: 'EN_COURS' });
		try {
			const { candidats } = await chercherAuRegistre({ debiteurId });
			setRecherche(candidats.length === 0 ? { phase: 'AUCUN' } : { phase: 'TROUVE', candidats });
		} catch (e) {
			// ⚠️ « RIEN TROUVÉ » N'EST PAS « ÇA A ÉCHOUÉ ». Les deux mènent à des
			// gestes opposés — saisir le numéro à la main, ou réessayer — donc l'écran
			// les distingue. `ConvexError` porte son message dans `.data`.
			const convexe = e as { data?: unknown };
			setRecherche({
				phase: 'ECHEC',
				message:
					typeof convexe.data === 'string'
						? convexe.data
						: 'Le registre n’a pas répondu. Réessayez dans un instant.'
			});
		}
	}

	async function enregistrerSiren(saisi: string) {
		setErreurSiren(null);
		try {
			await renseignerSiren({ debiteurId, siren: saisi });
			// Le SIREN retenu clôt la recherche : garder les candidats à l'écran
			// après le choix laisserait croire qu'il reste à faire.
			setRecherche({ phase: 'REPOS' });
		} catch (e) {
			setErreurSiren(e instanceof Error ? e.message : 'Numéro refusé.');
		}
	}

	/**
	 * L'ADRESSE SAISIE PAR LE GÉRANT.
	 *
	 * ⚠️ LE REFUS DU SERVEUR REMONTE MOT POUR MOT : il nomme ce qui a été tapé.
	 * Une phrase générique laisserait le gérant devant une erreur qu'il ne peut
	 * pas corriger.
	 */
	async function enregistrerEmail(saisi: string) {
		setErreurEmail(null);
		try {
			await renseignerEmail({ debiteurId, email: saisi });
		} catch (e) {
			setErreurEmail(e instanceof Error ? e.message : 'Adresse refusée.');
		}
	}

	/**
	 * RETENIR UN ÉTABLISSEMENT PROPOSÉ.
	 *
	 * ⚠️ LA FORME JURIDIQUE ET L'ADRESSE PARTENT AVEC LE NUMÉRO. C'est le seul
	 * instant où le produit les connaît : elles viennent du registre, en même
	 * temps que le SIREN qu'on retient. Une saisie manuelle ne les porte pas, et
	 * on ne les invente pas : elles restent alors absentes, ce qui est la vérité.
	 */
	async function retenirEtablissement(etablissement: EtablissementPropose) {
		setErreurSiren(null);
		try {
			await renseignerSiren({
				debiteurId,
				siren: etablissement.siren,
				...(etablissement.formeJuridique === undefined
					? {}
					: { formeJuridique: etablissement.formeJuridique }),
				...(etablissement.adresse === undefined ? {} : { adresse: etablissement.adresse })
			});
			setRecherche({ phase: 'REPOS' });
		} catch (e) {
			setErreurSiren(e instanceof Error ? e.message : 'Numéro refusé.');
		}
	}

	async function enregistrerTaux(pourcentage: string | null) {
		try {
			const resultat = await poserTaux({ debiteurId, pourcentage, aLaDate: aujourdHuiISO() });
			setConstatTaux(resultat.constat);
		} catch (e) {
			// Le refus vient du serveur et NOMME ce qu'il a reçu — « 12,455 porte
			// plus de deux décimales ». Le reformuler perdrait le seul détail utile.
			setConstatTaux(e instanceof Error ? e.message : 'Taux refusé.');
		}
	}

	function chercherLettrage(saisi: string) {
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
	 * ⚠️ LA DATE ARRIVE AVEC LE GESTE, elle n'est pas relue dans un état. Le
	 * calendrier reste modifiable une fois la proposition affichée : corriger la
	 * date puis solder enregistrait le règlement à l'ANCIENNE date, pendant que
	 * l'écran affichait la nouvelle. La date d'un règlement est le point d'arrêt
	 * des intérêts — c'était un montant faux, pas une coquille.
	 */
	async function soldeLesFactures(references: readonly string[], total: bigint, date: string) {
		setErreurLettrage(null);
		try {
			await appliquerLettrage({ debiteurId, references: [...references], montant: total, date });
			setMontantCherche(null);
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreurLettrage(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: 'Rapprochement refusé.'
			);
		}
	}

	function basculer(factureId: string) {
		setSelection((precedente) => {
			const suivante = new Set(precedente);
			if (suivante.has(factureId)) suivante.delete(factureId);
			else suivante.add(factureId);
			return suivante;
		});
	}

	/**
	 * `provenance` : le titre de l'écran d'où part la constitution, que la page
	 * de la créance lit par son retour. Voir `useProvenance`.
	 */
	async function constituer(provenance: HistoryState) {
		setErreur(null);
		try {
			const creanceId = await creerCreance({
				factureIds: [...selection] as Id<'facturesVente'>[]
			});
			setSelection(new Set());
			await navigate({ to: '/app/creance/$id', params: { id: creanceId }, state: provenance });
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: 'La créance n’a pas pu être constituée.'
			);
		}
	}

	/**
	 * ⚠️ LE DÉPÔT N'IMPOSE AUCUN TYPE. La pièce entre « à classer », la lecture
	 * part en tâche de fond, et le gérant ne corrige que si elle s'est trompée.
	 */
	async function deposerPieces(fichiers: File[]) {
		setErreurDepot(null);
		setDepotEnCours(true);
		try {
			for (const fichier of fichiers) {
				const url = await genererUrlPiece();
				const reponse = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': fichier.type },
					body: fichier
				});
				if (!reponse.ok) throw new Error(`L'envoi de « ${fichier.name} » a échoué.`);
				const { storageId } = (await reponse.json()) as { storageId: Id<'_storage'> };

				await deposerPiece({
					storageId,
					filename: fichier.name,
					mimeType: fichier.type,
					debiteurId,
					factureIds: []
				});
			}
		} catch (e) {
			setErreurDepot(e instanceof Error ? e.message : 'Dépôt refusé.');
		} finally {
			setDepotEnCours(false);
		}
	}

	/**
	 * LE TAUX STIPULÉ EN VIGUEUR, RELU DEPUIS LES FACTURES.
	 *
	 * Il se pose par relation mais vit sur la facture — toutes les non soldées du
	 * débiteur le portent, identique. La première qui en a un le dit donc pour
	 * l'ensemble. Sans cette relecture, le champ repartirait vide à chaque
	 * ouverture, et le créancier croirait son taux perdu.
	 */
	const tauxStipule = factures?.find(
		(facture) => facture.tauxContractuelPourcent !== undefined
	)?.tauxContractuelPourcent;

	/*
	  LA PAGE ATTEND TOUT CE QU'ELLE MONTRE. Un volet qui affiche « Aucune pièce »
	  le temps d'un aller-retour dit quelque chose de faux sur le dossier, et
	  c'est exactement ce qu'un gérant retient.
	*/
	const chargee =
		debiteurs !== undefined &&
		debiteur !== undefined &&
		creances !== undefined &&
		factures !== undefined &&
		pieces !== undefined &&
		comportement !== undefined;

	return (
		<EcranDebiteur
			identifiant={debiteurId}
			donnees={
				!chargee
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								denomination: debiteur.denomination,
								debiteur,
								encours: debiteur.encours,
								aujourdHui: aujourdHuiISO(),
								factures,
								// Les seules de ce débiteur. Le filtre est ici plutôt qu'en base
								// parce que la liste entière tient déjà en mémoire pour l'écran
								// voisin, et qu'une requête par débiteur la rechargerait.
								creances: creances.filter((creance) => creance.debiteurId === debiteurId),
								pieces,
								habitude: comportement.habitude,
								ruptures: comportement.ruptures,
								optionsSecteur: secteursProposes(),
								etatRecherche: recherche,
								erreurSiren,
								erreurEmail,
								tauxStipule,
								constatTaux,
								propositionLettrage: proposition ?? null,
								lettrageEnCours: montantCherche !== null && proposition === undefined,
								erreurLettrage,
								selection,
								erreur,
								depotEnCours,
								erreurDepot,
								onChercherAuRegistre: () => void chercherAuRegistrePour(),
								onRetenirEtablissement: (etablissement) => void retenirEtablissement(etablissement),
								onEnregistrerSiren: (saisi) => void enregistrerSiren(saisi),
								onEnregistrerEmail: (saisi) => void enregistrerEmail(saisi),
								onChoisirSecteur: (cle) =>
									void renseignerSecteur({ debiteurId, secteur: cle as 'GENERAL' }),
								onEnregistrerTaux: (pourcentage) => void enregistrerTaux(pourcentage),
								onChercherLettrage: chercherLettrage,
								onAppliquerLettrage: (references, total, date) =>
									void soldeLesFactures(references, total, date),
								onBasculerFacture: basculer,
								onConstituer: (provenance) => void constituer(provenance),
								onDeposerPieces: (fichiers) => void deposerPieces(fichiers),
								onClasserPiece: (pieceId, type) =>
									void classerPiece({
										pieceId: pieceId as Id<'pieces'>,
										type: type as 'BON_DE_LIVRAISON'
									}),
								onRetirerPiece: (pieceId) => void retirerPiece({ pieceId: pieceId as Id<'pieces'> })
							}
						}
			}
		/>
	);
}
