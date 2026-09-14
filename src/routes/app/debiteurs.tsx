import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { depuisEuros, enCentimes } from '../../lib/socle/montants';
import { aujourdHuiISO, type EtatRecherche, type EtablissementPropose } from '../../ui';
import { optionsSecteur } from '../../screens/debiteur-detail';
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
	return <EcranDebiteurs donnees={{ etat: 'erreur' }} />;
}

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
	const choisi = (d ?? null) as Id<'debiteurs'> | null;

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
	const [selection, setSelection] = useState<Set<string>>(new Set());
	const [erreur, setErreur] = useState<string | null>(null);

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
	const SECTEURS = optionsSecteur();

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

	const [constatPose, setConstatPose] = useState<{
		readonly debiteurId: Id<'debiteurs'>;
		readonly texte: string;
	} | null>(null);
	const constatTaux = constatPose?.debiteurId === choisi ? constatPose.texte : null;

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
	const [erreurSiren, setErreurSiren] = useState<string | null>(null);
	// L'etat de la recherche au registre. Il se remet a REPOS quand on change de
	// debiteur : les candidats d'un client n'ont rien a faire sur un autre.
	const [recherche, setRecherche] = useState<EtatRecherche>({ phase: 'REPOS' });

	/**
	 * LE LETTRAGE D'UN VIREMENT GROUPÉ.
	 *
	 * La recherche ne part PAS à chaque frappe : le montant se confirme, et c'est
	 * `montantCherche` qui déclenche la requête. Chercher pendant qu'on tape ferait
	 * défiler des propositions qui changent sous les doigts, et donnerait envie de
	 * cliquer sur la première venue — exactement ce que ce module refuse.
	 */
	const [montantCherche, setMontantCherche] = useState<bigint | null>(null);
	const [dateReglement, setDateReglement] = useState('');
	const [erreurLettrage, setErreurLettrage] = useState<string | null>(null);
	const proposition = useQuery(
		api.recouvrement.lettrage.proposer,
		choisi === null || montantCherche === null
			? 'skip'
			: { debiteurId: choisi, montant: montantCherche }
	);
	const appliquerLettrage = useMutation(api.recouvrement.lettrage.appliquer);

	function chercherLettrage(saisi: string, date: string) {
		setErreurLettrage(null);
		setMontantCherche(null);
		try {
			// `depuisEuros` refuse trois décimales, NaN et la notation exponentielle.
			// Un montant mal lu ici deviendrait un règlement faux en base.
			setMontantCherche(enCentimes(depuisEuros(saisi.trim().replace(/\s/g, ''))));
			setDateReglement(date.trim());
		} catch {
			setErreurLettrage(
				`« ${saisi} » n’est pas un montant en euros. Deux décimales au plus, sans arrondi.`
			);
		}
	}

	async function soldeLesFactures(references: readonly string[], total: bigint) {
		if (choisi === null) return;
		setErreurLettrage(null);
		try {
			await appliquerLettrage({
				debiteurId: choisi,
				references: [...references],
				montant: total,
				date: dateReglement
			});
			setMontantCherche(null);
		} catch (e) {
			setErreurLettrage(e instanceof Error ? e.message : 'Rapprochement refusé.');
		}
	}

	async function enregistrerTaux(pourcentage: string | null) {
		if (choisi === null) return;
		try {
			const resultat = await poserTaux({
				debiteurId: choisi,
				pourcentage,
				aLaDate: aujourdHuiISO()
			});
			setConstatPose({ debiteurId: choisi, texte: resultat.constat });
		} catch (e) {
			// Le refus vient du serveur et NOMME ce qu'il a reçu — « 12,455 porte
			// plus de deux décimales ». Le reformuler perdrait le seul détail utile.
			setConstatPose({
				debiteurId: choisi,
				texte: e instanceof Error ? e.message : 'Taux refusé.'
			});
		}
	}

	async function enregistrerSiren(saisi: string) {
		if (choisi === null) return;
		setErreurSiren(null);
		try {
			await renseignerSiren({ debiteurId: choisi, siren: saisi });
			// Le SIREN retenu clôt la recherche : garder les candidats à l'écran
			// après le choix laisserait croire qu'il reste à faire.
			setRecherche({ phase: 'REPOS' });
		} catch (e) {
			setErreurSiren(e instanceof Error ? e.message : 'Numéro refusé.');
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
		setErreurSiren(null);
		try {
			await renseignerSiren({
				debiteurId: choisi,
				siren: etablissement.siren,
				...(etablissement.formeJuridique === undefined
					? {}
					: { formeJuridique: etablissement.formeJuridique })
			});
			setRecherche({ phase: 'REPOS' });
		} catch (e) {
			setErreurSiren(e instanceof Error ? e.message : 'Numéro refusé.');
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
	 */
	async function chercherAuRegistreDuDebiteur() {
		if (choisi === null) return;
		setErreurSiren(null);
		setRecherche({ phase: 'EN_COURS' });
		try {
			const { candidats } = await chercherAuRegistre({ debiteurId: choisi });
			setRecherche(candidats.length === 0 ? { phase: 'AUCUN' } : { phase: 'TROUVE', candidats });
		} catch (e) {
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

	function basculer(id: string) {
		setSelection((precedente) => {
			const suivante = new Set(precedente);
			if (suivante.has(id)) suivante.delete(id);
			else suivante.add(id);
			return suivante;
		});
	}

	async function constituer() {
		setErreur(null);
		try {
			const creanceId = await creerCreance({
				factureIds: [...selection] as Id<'facturesVente'>[]
			});
			setSelection(new Set());
			await navigate({ to: '/app/creance/$id', params: { id: creanceId } });
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

	return (
		<EcranDebiteurs
			donnees={
				debiteurs === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								debiteurs,
								choisi,
								onOuvrir: (id) => {
									setChoisi(id as Id<'debiteurs'>);
									setSelection(new Set());
								},
								onFermer: () => setChoisi(null),
								detail: {
									debiteurId: choisi ?? '',
									denomination: debiteurChoisi?.denomination ?? '',
									etatRecherche: recherche,
									onChercherAuRegistre: () => void chercherAuRegistreDuDebiteur(),
									onRetenirEtablissement: (etablissement) =>
										void retenirEtablissement(etablissement),
									debiteur: choisi === null || debiteurChoisi === undefined ? null : debiteurChoisi,
									// Les pièces aussi : sans elles, la rangée des pièces dirait « Aucune » le temps de leur lecture.
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
									onConstituer: () => void constituer()
								}
							}
						}
			}
		/>
	);
}
