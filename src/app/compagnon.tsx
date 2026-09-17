import { useState } from 'react';
import { CatchBoundary, useRouterState } from '@tanstack/react-router';
import { useAction, useQuery } from 'convex/react';
import { Popup, PopupContent } from '@cladd-ui/react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import {
	evaluerPlafond,
	type NiveauPlafond
} from '../lib/verticales/recouvrement/compagnon/disponibilite';
import { relireTour } from '../lib/verticales/recouvrement/compagnon/tour';
import {
	BoutonPrincipal,
	CompagnonFlottant,
	Conversation,
	Lien,
	RefusEnQuatreParties,
	type ConversationAffichee,
	type EtatCompagnon,
	type RefusAffiche,
	type TourAffiche
} from '../ui';

/**
 * LE COMPAGNON FLOTTANT, BRANCHÉ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA PORTÉE EST CELLE DE CE QU'ON REGARDE, ET ELLE S'AFFICHE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le compagnon est BORNÉ : il lit un dossier, ses factures, ses pièces, ses
 * décomptes et les valeurs du référentiel qui les chiffrent. Il ne lit pas le
 * dépôt entier, et il ne le lira jamais — c'est ce qui permet à chaque phrase de
 * sa réponse de porter sa source.
 *
 * Le serveur dit la même chose, et il ne dit que ça :
 * `conversationLecture.filDuDossier` prend une créance, et `conversation.repondre`
 * écrit ses deux tours avec `portee: 'CREANCE'` et `cible: creanceId`. AUCUNE
 * autre portée n'est servie. La capsule ne peut donc ouvrir un fil que là où une
 * créance est ouverte, c'est-à-dire sur `/app/creance/$id`.
 *
 * Depuis le bouton :
 *
 *   · sur la page d'une créance → LE FIL DE CETTE CRÉANCE, en feuille ;
 *   · partout ailleurs → aucun dossier, et le compagnon le DIT, avec le chemin
 *     qui mène à un dossier réel, plutôt que de proposer une conversation qu'il
 *     refuserait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ L'IDENTIFIANT SE LIT SUR LES PARAMÈTRES DE LA ROUTE, PAS SUR L'ADRESSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La version précédente testait `chemin === '/app' && ?ligne=…`, parce que le
 * fil vivait dans le volet de preuve de la file. Le volet a été supprimé, et
 * `?ligne=` avec lui : la condition était donc TOUJOURS FAUSSE, la capsule
 * ouvrait systématiquement son panneau de portée, et ce panneau demandait
 * d'« ouvrir une ligne dans la file » — un geste qui n'existe plus. Le compagnon
 * était injoignable, et il l'expliquait par une consigne impossible à suivre.
 *
 * `matches` porte les paramètres résolus de la route active : `id` sur
 * `/app/creance/$id` est la créance qu'on regarde, sans ambiguïté et sans
 * seconde résolution. Une recherche d'URL n'a plus rien à dire ici, et on ne la
 * ressuscite pas.
 */

/** La route qui porte une créance, et la seule qui donne un fil au compagnon. */
const ROUTE_CREANCE = '/app/creance/$id';

/**
 * ⚠️ « IL A QUELQUE CHOSE À DIRE » N'EST ALIMENTÉ PAR AUCUNE SOURCE, ET ON LE
 * DIT PLUTÔT QUE DE L'INVENTER.
 *
 * `CompagnonFlottant` porte l'état `A_DIRE`, la salle le montre, et rien dans le
 * produit ne le produit AUJOURD'HUI : le compagnon répond quand on lui demande,
 * il n'interpelle jamais de lui-même. Le seul compte qui existe est celui du
 * veilleur, et il est déjà posé sur l'onglet « Aujourd'hui », qui mène à ce
 * qu'il compte.
 *
 * Fabriquer ici un compte à partir d'autre chose ferait exactement le défaut que
 * ce dépôt a relevé quatre fois en une semaine : un champ déclaré, lu, et
 * alimenté par une valeur qui ne veut pas dire ce qu'il annonce. Le jour où le
 * compagnon posera des constats non lus, c'est ici que leur compte entrera.
 */

/** Ce que le bouton a ouvert : rien, le fil du dossier, le refus, ou sa portée. */
type PanneauCompagnon = 'AUCUN' | 'FIL' | 'REFUS' | 'PORTEE';

export function CompagnonBranche() {
	return (
		/*
		  ⚠️ LE COMPTEUR PEUT LEVER, ET LA CAPSULE NE DOIT PAS PARTIR AVEC LUI. Sans
		  session — au chargement, après une expiration, dans la salle d'exposition
		  — la requête lève. `Facultatif` ferait DISPARAÎTRE le bouton, ce que la
		  décision « on ne coupe jamais l'expérience » interdit : on retombe donc
		  sur la capsule sans compteur, qui est le même bouton avec une information
		  de moins.

		  ⚠️ ET UN COMPTEUR ABSENT NE VAUT PAS « ARRÊTÉ ». Une donnée qu'on n'a pas
		  ne se remplace pas par un verdict : annoncer un plafond atteint qu'on n'a
		  pas lu ferait renoncer à une conversation parfaitement ouverte.
		*/
		<CatchBoundary
			getResetKey={() => 'compagnon'}
			errorComponent={() => <Compagnon niveau={null} cumul={null} />}
		>
			<CompagnonAvecCompteur />
		</CatchBoundary>
	);
}

/**
 * ⚠️ UNE LECTURE QUI NE PARCOURT QUE L'INDEX DU CUMUL. `compteurDeLEtablissement`
 * ne collecte aucun tour de parole et ne rend aucun texte — c'est ce qui permet
 * de la monter en permanence dans la coquille sans payer un dossier sur chaque
 * écran. Le fil, lui, n'est lu que par `FilDeLaCreance`, qui n'est monté que
 * pendant que la feuille est ouverte.
 */
function CompagnonAvecCompteur() {
	const compteur = useQuery(api.recouvrement.conversationLecture.compteurDeLEtablissement, {});
	return <Compagnon niveau={compteur?.niveau ?? null} cumul={compteur?.cumul ?? null} />;
}

function Compagnon({ niveau, cumul }: { niveau: NiveauPlafond | null; cumul: number | null }) {
	/*
	  LA CRÉANCE QU'ON REGARDE, ou `null` quand on n'en regarde aucune.

	  ⚠️ ELLE SE LIT SUR `matches`, ET C'EST UNE LECTURE, PAS UNE RÉSOLUTION. Le
	  routeur a déjà apparié `/app/creance/$id` et posé `id` ; le relire ici est
	  exact par construction. Déduire la créance d'autre chose — un paramètre de
	  recherche, une rangée sélectionnée — redonnerait une seconde vérité, et
	  c'est la première qui a cassé : elle a survécu à l'écran qui la portait.
	*/
	const creanceId = useRouterState({
		select: (etat) => {
			const surLaCreance = etat.matches.find((match) => match.routeId === ROUTE_CREANCE);
			if (surLaCreance === undefined) return null;
			const parametres = surLaCreance.params as Record<string, string | undefined>;
			const id = parametres.id;
			return id === undefined || id === '' ? null : id;
		}
	});

	const [panneau, setPanneau] = useState<PanneauCompagnon>('AUCUN');

	/*
	  ⚠️ CHANGER DE DOSSIER REFERME CE QUE LA CAPSULE AVAIT OUVERT, et l'ajustement
	  se fait AU RENDU, jamais dans un effet. Une feuille laissée ouverte en
	  quittant la créance lirait le fil d'un dossier qu'on ne regarde plus ; et un
	  panneau simplement masqué rouvrirait tout seul en revenant sur le même
	  dossier, ce qui se lit comme un fantôme.
	*/
	const [dossierAffiche, setDossierAffiche] = useState<string | null>(creanceId);
	if (dossierAffiche !== creanceId) {
		setDossierAffiche(creanceId);
		setPanneau('AUCUN');
	}

	const surUnDossier = creanceId !== null;
	const arretee = niveau === 'ARRETE';

	/*
	  CE QUE L'ÉCRAN DIT DE LA PORTÉE, EN DEUX MOTS SUR LA CAPSULE.

	  ⚠️ `null` NE VEUT PAS DIRE « TOUT », IL VEUT DIRE « AUCUN DOSSIER ». Écrire
	  « cet établissement » sur le bouton promettrait une conversation à l'échelle
	  du dépôt, que le produit ne tient pas et ne tiendra pas : le fil est borné au
	  dossier pour que chaque phrase porte SA source. Ce qu'il lit s'explique alors
	  en l'ouvrant, AVANT qu'on ait tapé quoi que ce soit — jamais par un refus
	  après coup.
	*/
	const portee = surUnDossier ? 'ce dossier' : null;

	const etat: EtatCompagnon = arretee
		? {
				genre: 'INDISPONIBLE',
				// Le fait, en une ligne. Le refus complet — ce qui continue, le
				// constat chiffré, ce qui le lève, ce que l'attente coûte — s'ouvre au
				// toucher, et il vient du domaine, mot pour mot.
				phrase: 'Conversation libre arrêtée jusqu’au mois prochain.'
			}
		: { genre: 'REPOS' };

	return (
		<>
			<CompagnonFlottant
				portee={portee}
				etat={etat}
				onOuvrir={() => {
					/*
					  ⚠️ SUR UN DOSSIER, LE FIL S'OUVRE MÊME QUAND LE PLAFOND A MORDU. Ce
					  qui s'arrête est la question suivante, pas la relecture de ce qui a
					  été demandé et répondu : la feuille rend le fil, et le refus en
					  quatre parties prend la place du champ de saisie. Refermer l'écran
					  entier sur un compteur de coût couperait l'expérience, ce que la
					  décision « on ne coupe jamais l'expérience » interdit.
					*/
					if (creanceId !== null) {
						setPanneau('FIL');
						return;
					}
					if (arretee) {
						setPanneau('REFUS');
						return;
					}
					setPanneau('PORTEE');
				}}
			/>

			<Popup
				open={panneau !== 'AUCUN'}
				onOpenChange={(ouvert) => {
					if (!ouvert) setPanneau('AUCUN');
				}}
				headerLeft={
					<span className="px-2 pb-1 text-cladd-sm font-semibold">{titreDuPanneau(panneau)}</span>
				}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					{/*
					  ⚠️ LE FIL N'EST MONTÉ QUE PENDANT QUE LA FEUILLE EST OUVERTE, et
					  c'est ce qui évite de lire les tours d'un dossier sur tous les
					  écrans. `useQuery` n'a pas de `skip` collectif ; un composant démonté
					  ne demande rien, ce qui est le seul moyen sûr.
					*/}
					{panneau === 'FIL' && creanceId !== null ? (
						<FilDeLaCreance creanceId={creanceId as Id<'creances'>} />
					) : panneau === 'REFUS' ? (
						<RefusDuPlafond cumul={cumul} />
					) : (
						<PorteeDuCompagnon />
					)}
				</PopupContent>
			</Popup>
		</>
	);
}

function titreDuPanneau(panneau: PanneauCompagnon): string {
	if (panneau === 'FIL') return 'Demander sur ce dossier';
	if (panneau === 'REFUS') return 'La conversation libre';
	return 'Ce que le compagnon lit';
}

/**
 * ⚠️ `ConvexError` PORTE SON MESSAGE DANS `.data`, PAS DANS `.message`. Un refus
 * écrit pour être lu serait remplacé par un message générique sans cette lecture.
 */
function messageDeLaPanne(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'La demande n’a pas abouti.';
}

/**
 * LE FIL DE CE DOSSIER, ET LE SEUL GESTE QU'IL PORTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES PHRASES SE RELISENT PAR `relireTour`, ET PAR RIEN D'AUTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque phrase porte SA source, et le découpage est une DONNÉE : il est écrit
 * avec le tour, phrase par phrase. Le redécouper ici sur la ponctuation — ce que
 * faisait l'ancien volet — décalait les pastilles d'un cran dès qu'une
 * abréviation posait un point au milieu d'une phrase, et une source décalée a
 * l'air d'une vérification. Les tours écrits avant que les phrases le soient se
 * rendent en une phrase SANS pastille : une source absente se voit, une source
 * fausse non.
 *
 * ⚠️ ET LE GESTE EST UNIQUE : « Demander », qui parle AU LOGICIEL. On ne relance
 * jamais le débiteur au nom du client.
 */
function FilDeLaCreance({ creanceId }: { creanceId: Id<'creances'> }) {
	const fil = useQuery(api.recouvrement.conversationLecture.filDuDossier, { creanceId });
	const demanderAuCompagnon = useAction(api.recouvrement.conversation.repondre);

	const [question, setQuestion] = useState('');
	const [refusDuTour, setRefusDuTour] = useState<RefusAffiche | null>(null);
	const [enCours, setEnCours] = useState(false);
	const [panne, setPanne] = useState<string | null>(null);

	/**
	 * ⚠️ LA QUESTION SE VIDE DÈS L'ENVOI. Le fil la porte désormais, refus
	 * compris : `consignerEchange` écrit les deux tours, et la relire dans le
	 * champ ferait croire qu'elle n'est pas partie.
	 */
	async function demander() {
		const posee = question.trim();
		if (posee === '' || enCours) return;
		setRefusDuTour(null);
		setPanne(null);
		setEnCours(true);
		setQuestion('');
		try {
			const reponse = await demanderAuCompagnon({ creanceId, question: posee });
			if (reponse.genre === 'REFUS') setRefusDuTour(reponse.refus);
		} catch (e) {
			/*
			  ⚠️ UNE PANNE DE TRANSPORT N'EST PAS UN REFUS DU DOMAINE, et elle ne se
			  déguise pas en refus en quatre parties : celui-ci affirme ce que le
			  produit CONTINUE de faire, et on ne sait rien de tel ici.
			*/
			setPanne(messageDeLaPanne(e));
		} finally {
			setEnCours(false);
		}
	}

	// RÈGLE D'ÉCRAN N° 2 : tout traitement se voit sans qu'on le demande.
	if (fil === undefined) {
		return (
			<p role="status" className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				Lecture du fil de ce dossier…
			</p>
		);
	}

	/*
	  ⚠️ LE REFUS DU PLAFOND VIENT DU DOMAINE, PAS D'UNE PHRASE ÉCRITE ICI.
	  `evaluerPlafond` est la fonction PURE qui décide du niveau et compose le
	  refus ; c'est elle que l'action consulte avant d'appeler le modèle. Le
	  reformuler dans l'interface créerait une seconde version de la vérité, qui
	  dériverait de la première au premier changement de plafond.

	  Elle ne rend un refus QU'AU NIVEAU `ARRETE` : au-dessous, `refus` reste nul,
	  le champ de saisie reste en place, et l'avertissement du plafond mou se pose
	  au-dessus du fil sans rien couper.
	*/
	const refusDuPlafond = evaluerPlafond(fil.compteur.cumul).refus;

	const conversation: ConversationAffichee = {
		tours: fil.tours.map(
			(tour): TourAffiche => ({
				id: tour._id,
				role: tour.role,
				phrases: relireTour(tour),
				diteLe: tour.diteLe
			})
		),
		compteur: fil.compteur,
		refus: refusDuTour ?? refusDuPlafond,
		enCours,
		question,
		onQuestion: setQuestion,
		onDemander: () => void demander()
	};

	return (
		<>
			<Conversation conversation={conversation} />
			{panne === null ? null : (
				<p role="alert" className="mt-cladd-2xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{panne} Le dossier, lui, n’a pas changé : la question peut être reposée.
				</p>
			)}
		</>
	);
}

/**
 * LE REFUS DU PLAFOND, TEL QUE LE DOMAINE L'ÉCRIT.
 *
 * ⚠️ AUCUN MOT N'EST REFORMULÉ ICI. `evaluerPlafond` est la fonction PURE qui
 * décide du niveau et compose le refus ; la reformuler dans l'interface créerait
 * une seconde version de la vérité, qui dériverait de la première au premier
 * changement de plafond. Le cumul lu suffit à la rejouer, et le chiffre qu'elle
 * cite est donc celui de l'établissement.
 *
 * ⚠️ ET SI LE CUMUL N'A PAS ÉTÉ LU, ON NE DEVINE PAS. Un refus reconstitué sur
 * un cumul absent citerait un chiffre faux dans une phrase qui a l'air
 * vérifiable — la faute que ce dépôt tient pour plus grave qu'une source
 * manquante.
 *
 * ⚠️ IL NE S'OUVRE QUE HORS D'UN DOSSIER. Sur la page d'une créance, le même
 * refus vient du fil lui-même, à la place exacte du champ de saisie : c'est là
 * qu'on allait taper, et c'est là qu'il faut le lire.
 */
function RefusDuPlafond({ cumul }: { cumul: number | null }) {
	const refus = cumul === null ? null : evaluerPlafond(cumul).refus;

	if (refus === null) {
		return (
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				Le compteur de conversation de cet établissement ne s’est pas lu. Ce qui est sûr, et qui
				ne dépend d’aucun appel modèle : la file, les échéances surveillées, le délai de
				prescription et les décomptes continuent de se calculer.
			</p>
		);
	}

	return (
		<RefusEnQuatreParties
			peutFaire={refus.peutFaire}
			constat={refus.constat}
			blocages={refus.blocages}
			coutDeLAttente={refus.coutDeLAttente}
		/>
	);
}

/**
 * CE QUE LE COMPAGNON LIT, QUAND AUCUN DOSSIER N'EST OUVERT.
 *
 * ⚠️ CE N'EST PAS UNE EXCUSE, C'EST LA RÈGLE DU PRODUIT. Le fil est borné au
 * dossier pour que chaque phrase porte SA source : un compagnon qui lirait tout
 * le dépôt ne pourrait plus dire d'où sort ce qu'il avance, et c'est exactement
 * ce que ce produit refuse. Le dire ici, une fois, vaut mieux que de le faire
 * découvrir par un refus après avoir tapé une question.
 *
 * ⚠️ ET LE CHEMIN QU'IL DONNE EXISTE. La version précédente demandait d'« ouvrir
 * une ligne dans la file », un geste supprimé avec le volet de preuve : une
 * consigne impossible à suivre est pire qu'un panneau muet, parce qu'elle fait
 * chercher un geste absent au lieu de conclure que le produit n'en a pas. La
 * file mène à la page d'une créance, et c'est là que la capsule ouvre un fil.
 */
function PorteeDuCompagnon() {
	return (
		<div className="flex flex-col items-start gap-cladd-3xs">
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				Le compagnon lit un dossier à la fois : ses factures, ses pièces, ses décomptes et les
				valeurs du référentiel qui les chiffrent. Chaque phrase de sa réponse porte sa source, et
				ce qui ne peut pas être relié à une source n’est pas rendu.
			</p>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				Il n’y a donc rien à lui demander depuis cet écran. Ouvrez une créance — chaque rangée de
				la file mène à la sienne —, et cette capsule y ouvrira le fil de ce dossier. Ce qui relève
				d’une conduite à tenir n’est écrit nulle part : le logiciel mesure, il ne conseille pas.
			</p>
			<BoutonPrincipal as={Lien} to="/app">
				Ouvrir la file
			</BoutonPrincipal>
		</div>
	);
}
