import { useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Chip, ListButton } from '@cladd-ui/react';
import { UploadIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { depuisEuros, enCentimes } from '../../lib/socle/montants';
import {
	BoutonPrincipal,
	Page,
	PageHeader,
	PageBody,
	TwoPane,
	EmptyState,
	eurosCentimes,
	aujourdHuiISO,
	pluriel,
	Avatar,
	CarteListe,
	type OptionSecteur
} from '../../ui';
import { DetailDebiteur } from '../../screens/debiteur-detail';
import {
	REGIMES_PRESCRIPTION,
	secteurLePlusCourt
} from '../../lib/verticales/recouvrement/pays/france/prescription';

/**
 * Les secteurs proposés, et ce que chacun change.
 *
 * ⚠️ LA DURÉE VIENT DU REGISTRE, JAMAIS D'UNE CONSTANTE ÉCRITE ICI. C'est la
 * règle la plus stricte du projet : toute valeur juridique vit dans le
 * référentiel, avec sa source. Recopier « 5 ans » dans un libellé d'écran
 * créerait une seconde vérité qui ne serait pas corrigée le jour où la première
 * change.
 *
 * Le libellé, lui, est du texte d'interface : il nomme la relation commerciale
 * telle qu'un gérant la reconnaît, pas telle que le code de commerce l'écrit.
 */
const LIBELLE_SECTEUR: Record<string, string> = {
	GENERAL: 'Régime général',
	TRANSPORT_MARCHANDISES: 'Transport de marchandises',
	CONSOMMATEUR: 'Vente à un consommateur',
	NOURRITURE_MARINS: 'Nourriture des marins',
	FOURNITURE_NAVIRE: 'Fourniture de navire',
	OUVRAGE_ACCEPTE: 'Ouvrage accepté'
};

function optionsSecteur(): OptionSecteur[] {
	const connus = Object.keys(REGIMES_PRESCRIPTION).map((cle) => {
		const regime = REGIMES_PRESCRIPTION[cle as keyof typeof REGIMES_PRESCRIPTION];
		return {
			cle,
			libelle: LIBELLE_SECTEUR[cle] ?? cle,
			consequence: `Prescription : ${regime.dureeAnnees} an${pluriel(regime.dureeAnnees)}`
		};
	});

	// `INDETERMINE` est proposé en PREMIER et reste choisissable : c'est l'état
	// honnête d'un débiteur qu'on ne sait pas classer, et le forcer à choisir
	// produirait un secteur inventé — donc un délai de prescription faux, dans le
	// sens qui fait perdre la créance.
	const court = secteurLePlusCourt();
	return [
		{
			cle: 'INDETERMINE',
			libelle: 'À préciser',
			consequence: `Le délai le plus court est retenu par prudence : ${court} an${pluriel(court)}`
		},
		...connus
	];
}
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
	validateSearch: (recherche: Record<string, unknown>): { d?: string } => {
		const d = recherche.d;
		return typeof d === 'string' && d.length > 0 ? { d } : {};
	}
});

/**
 * Les débiteurs, et leurs factures.
 *
 * DEUX VOLETS AU-DELÀ DE 1024 px (règle d'écran n° 3), et ils portent
 * exactement ce que la règle prévoit : la LISTE à gauche, la PREUVE à droite.
 * Ici, la preuve d'un débiteur est le détail de ce qu'il doit — facture par
 * facture, avec sa date de prescription.
 *
 * LA PRESCRIPTION EST DANS LE TABLEAU, PAS DANS UNE ALERTE À PART. C'est une
 * propriété de chaque facture, au même titre que son montant : la reléguer
 * ailleurs obligerait à croiser deux écrans pour savoir laquelle va s'éteindre.
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
		} catch (e) {
			setErreurSiren(e instanceof Error ? e.message : 'Numéro refusé.');
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

	if (debiteurs === undefined) {
		return (
			<Page>
				<PageHeader titre="Vos débiteurs" />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	if (debiteurs.length === 0) {
		return (
			<Page>
				<PageHeader titre="Vos débiteurs" />
				<PageBody>
					<EmptyState
						illustration="🧾"
						titre="Aucun débiteur pour l’instant"
						explication="Les débiteurs apparaissent tout seuls quand vous importez vos factures : le logiciel les rapproche par leur raison sociale, quelle que soit la graphie."
						etapes={[
							'Importez un export comptable ou vos factures de vente.',
							'Le logiciel crée un débiteur par client et calcule son encours.',
							'Sélectionnez les factures d’un même débiteur pour en faire une créance.'
						]}
						action={
							<BoutonPrincipal as={Link} to="/app/import-factures">
								<UploadIcon />
								Importer mes factures
							</BoutonPrincipal>
						}
					/>
				</PageBody>
			</Page>
		);
	}

	/**
	 * LA LISTE DES DÉBITEURS.
	 *
	 * ⚠️ UNE SEULE CARTE, DES LIGNES DEDANS — et pas une carte par débiteur.
	 *
	 * La version précédente posait un `Surface` autonome par client. Sur trente
	 * débiteurs, ça fait trente objets qui flottent séparément : l'œil compte des
	 * cartes au lieu de lire des noms, et chaque bord arrondi coûte quatre pixels
	 * de vide en haut et en bas, soit plus de deux cents pixels de défilement
	 * gagnés pour rien.
	 *
	 * Toutes les références font l'inverse : un conteneur, des rangées. La liste
	 * se lit alors comme une liste, et les cartes retrouvent leur sens — elles ne
	 * servent qu'à séparer des BLOCS de nature différente.
	 *
	 * ⚠️ ET CHAQUE LIGNE PORTE UN AVATAR. Deux raisons, dont une seule est
	 * esthétique : il donne à l'œil un point d'accroche fixe à gauche pour
	 * balayer verticalement, et surtout il rend deux raisons sociales proches —
	 * « Ateliers Martin » et « Ateliers Martin Fils » — distinguables à la
	 * couleur avant d'être lues. Sur un produit où se tromper de débiteur envoie
	 * un décompte au mauvais tiers, ça compte.
	 */
	const liste = (
		<div className="flex flex-col gap-cladd-3xs p-cladd-3xs">
			<CarteListe titre={`${debiteurs.length} débiteur${pluriel(debiteurs.length)}`}>
				{debiteurs.map((debiteur) => (
					<ListButton
						key={debiteur._id}
						selected={choisi === debiteur._id}
						onClick={() => {
							setChoisi(debiteur._id);
							setSelection(new Set());
						}}
						icon={<Avatar nom={debiteur.denomination} />}
						footer={
							// Les puces en pied de ligne plutôt qu'en rangée séparée : elles
							// qualifient le débiteur, elles ne sont pas une information de
							// même niveau que son nom.
							<span className="flex flex-wrap items-center gap-1.5">
								{debiteur.facturesEchues > 0 ? (
									<Chip size="sm" color="orange">
										{debiteur.facturesEchues} échue{pluriel(debiteur.facturesEchues)}
									</Chip>
								) : null}
								{debiteur.santeFinanciere !== 'SAINE' && debiteur.santeFinanciere !== 'INCONNUE' ? (
									<Chip size="sm" color="red">
										{debiteur.santeFinanciere === 'RADIEE' ? 'Radié' : 'Procédure collective'}
									</Chip>
								) : null}
								{/* Un secteur indéterminé fait retenir le délai de prescription
								    le plus court. Le dire ici évite que le gérant découvre
								    l'hypothèse au moment où une créance est annoncée prescrite. */}
								{!debiteur.secteurDetermine ? (
									<Chip size="sm" color="neutral">
										Secteur à préciser
									</Chip>
								) : null}
							</span>
						}
						after={
							// L'encours reste la colonne qui commande la lecture — un gérant
							// arbitre entre douze mille euros et trois cents, pas entre deux
							// raisons sociales. Mais il descend du corps d'affiche au corps
							// courant : dans une rangée, un chiffre de trente-deux pixels
							// écrase le nom qu'il qualifie.
							<span className="shrink-0 text-cladd-sm font-bold tabular-nums">
								{eurosCentimes(debiteur.encours)}
							</span>
						}
					>
						{debiteur.denomination}
					</ListButton>
				))}
			</CarteListe>
		</div>
	);

	/**
	 * LE VOLET DE PREUVE.
	 *
	 * Tout le dessin vit dans `screens/debiteur-detail.tsx`, qui ne sait pas
	 * interroger Convex — c’est ce qui permet de l’OUVRIR aux quatre largeurs
	 * depuis la salle d’exposition, sans backend ni authentification. Ses
	 * composants y étaient tous vérifiés un par un ; leur assemblage, jamais.
	 */
	const preuve = (
		<DetailDebiteur
			debiteurId={choisi ?? ''}
			debiteur={choisi === null || debiteurChoisi === undefined ? null : debiteurChoisi}
			factures={choisi === null || factures === undefined ? null : factures}
			// Les seules du débiteur ouvert. Le filtre est ici plutôt qu'en base
			// parce que la liste entière tient déjà en mémoire pour l'écran, et
			// qu'une requête par débiteur la rechargerait à chaque sélection.
			creances={(creances ?? []).filter((creance) => creance.debiteurId === choisi)}
			optionsSecteur={SECTEURS}
			erreurSiren={erreurSiren}
			tauxStipule={tauxStipule}
			constatTaux={constatTaux}
			pieces={pieces ?? []}
			habitude={comportement?.habitude ?? null}
			ruptures={comportement?.ruptures ?? []}
			propositionLettrage={proposition ?? null}
			lettrageEnCours={montantCherche !== null && proposition === undefined}
			erreurLettrage={erreurLettrage}
			selection={selection}
			erreur={erreur}
			onEnregistrerSiren={(saisi) => void enregistrerSiren(saisi)}
			onChoisirSecteur={(cle) => {
				if (choisi === null) return;
				void renseignerSecteur({ debiteurId: choisi, secteur: cle as 'GENERAL' });
			}}
			onEnregistrerTaux={(p) => void enregistrerTaux(p)}
			onChercherLettrage={chercherLettrage}
			onAppliquerLettrage={(references, total) => void soldeLesFactures(references, total)}
			onBasculerFacture={basculer}
			onConstituer={() => void constituer()}
		/>
	);

	return (
		<Page>
			<PageHeader titre="Vos débiteurs" sousTitre="Le plus gros encours d’abord" />
			<div className="min-h-0 flex-1">
				<TwoPane
					liste={liste}
					preuve={preuve}
					preuveOuverte={choisi !== null}
					onFermerPreuve={() => setChoisi(null)}
				/>
			</div>
		</Page>
	);
}
