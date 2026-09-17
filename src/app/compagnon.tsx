import { useState } from 'react';
import { CatchBoundary, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Popup, PopupContent } from '@cladd-ui/react';
import { api } from '../lib/convex/_generated/api';
import {
	evaluerPlafond,
	type NiveauPlafond
} from '../lib/verticales/recouvrement/compagnon/disponibilite';
import {
	BoutonPrincipal,
	CompagnonFlottant,
	Lien,
	RefusEnQuatreParties,
	type EtatCompagnon
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
 * Depuis le bouton, la portée est donc celle de l'écran :
 *
 *   · un dossier ouvert dans la file (`/app?ligne=…`) → CE dossier ;
 *   · partout ailleurs → l'établissement, c'est-à-dire aucun dossier, et le
 *     compagnon le DIT au lieu de proposer une conversation qu'il refuserait.
 *
 * ⚠️ IL NE REDESSINE PAS LA CONVERSATION, IL Y MÈNE. Le fil vit dans la position
 * « Conversation » du volet de preuve, branchée sur `conversation.repondre` et
 * `conversationLecture.filDuDossier` par `app/volet-branche.tsx`. En refaire une
 * seconde ici, c'est douze requêtes de dossier montées deux fois et deux
 * versions de la même vérité qui divergent au premier ajustement. Le bouton
 * pousse l'adresse à `position=CONVERSATION` ; le volet fait le reste.
 *
 * ⚠️ ET CE QUE ÇA NE COUVRE PAS EST NOMMÉ, PAS TU. Sous 1024 px, le volet de
 * preuve recouvre l'écran entier dès qu'une ligne est ouverte (`TwoPane`) : le
 * bouton flottant n'est donc pas visible en même temps qu'un dossier sur
 * téléphone, et sa portée y vaut toujours l'établissement. Le geste « demander
 * sur ce dossier » existe bien sur téléphone — il est dans le volet lui-même,
 * en troisième position du `Segmented`.
 */

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

/** Ce que le bouton a ouvert : rien, le refus du plafond, ou sa portée. */
type PanneauCompagnon = 'AUCUN' | 'REFUS' | 'PORTEE';

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
 * écran. Le fil, lui, n'est lu que par le volet, et seulement quand une ligne
 * est ouverte.
 */
function CompagnonAvecCompteur() {
	const compteur = useQuery(api.recouvrement.conversationLecture.compteurDeLEtablissement, {});
	return <Compagnon niveau={compteur?.niveau ?? null} cumul={compteur?.cumul ?? null} />;
}

function Compagnon({ niveau, cumul }: { niveau: NiveauPlafond | null; cumul: number | null }) {
	const navigate = useNavigate();
	const [panneau, setPanneau] = useState<PanneauCompagnon>('AUCUN');

	const chemin = useRouterState({ select: (etat) => etat.location.pathname });
	/*
	  ⚠️ L'IDENTIFIANT DE LA RANGÉE NE SE RÉSOUT PAS ICI. `?ligne=` porte tantôt
	  une créance, tantôt un client — c'est la SURVEILLANCE qui le décide —, et la
	  résolution demande les lectures de la file entière. Le bouton n'en a pas
	  besoin : il pousse la POSITION du volet, et le volet, qui a déjà résolu la
	  ligne, ouvre le fil du dossier qu'elle désigne. Refaire la résolution ici
	  donnerait une seconde vérité, qui se tromperait sur les rangées de litige.
	*/
	const ligneOuverte = useRouterState({
		select: (etat) => {
			const recherche: Record<string, unknown> = etat.location.search;
			return typeof recherche.ligne === 'string' && recherche.ligne !== '';
		}
	});

	const surUnDossier = chemin === '/app' && ligneOuverte;
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
					if (arretee) {
						setPanneau('REFUS');
						return;
					}
					if (surUnDossier) {
						void navigate({
							to: '/app',
							search: (actuelle) => ({ ...actuelle, position: 'CONVERSATION' })
						});
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
					<span className="px-2 pb-1 text-cladd-sm font-semibold">
						{panneau === 'REFUS' ? 'La conversation libre' : 'Ce que le compagnon lit'}
					</span>
				}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					{panneau === 'REFUS' ? <RefusDuPlafond cumul={cumul} /> : <PorteeDuCompagnon />}
				</PopupContent>
			</Popup>
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
				Ouvrez une ligne dans la file, et il lira celle-là. Ce qui relève d’une conduite à tenir
				n’est écrit nulle part : le logiciel mesure, il ne conseille pas.
			</p>
			<BoutonPrincipal as={Lien} to="/app">
				Ouvrir la file
			</BoutonPrincipal>
		</div>
	);
}
