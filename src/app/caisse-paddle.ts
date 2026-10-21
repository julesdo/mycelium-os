import { useEffect, useRef, useState } from 'react';
import type { Paddle, PaddleEventData } from '@paddle/paddle-js';
import type { CaisseServeur } from '../lib/convex/paddle';
import type { CaisseAffichee, Souscription } from '../screens/compte/facturation';
import type { MontantsTTC } from '../ui/choix-formule';
import { useAction, useMutation } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { suivre } from './analytique';

/**
 * LE PAIEMENT PADDLE, BRANCHÉ SUR L'ÉCRAN.
 *
 * Paddle.js se charge QUAND LA PAGE DE CHOIX S'OUVRE, jamais avec l'application :
 * c'est un script de Paddle (cdn.paddle.com) dont seul le choix de formule a
 * besoin, et le paquet d'entrée ne porte que le socle. Il y lit d'abord les
 * montants TVA comprise (`PricePreview`), que la page écrit à côté du prix HT :
 * c'est le montant que la case de Paddle fera accepter. Le paiement s'ouvre en
 * surimpression, chez Paddle : la carte ne passe jamais par nos serveurs.
 *
 * Ce que le paiement emporte (le prix, l'essai, l'établissement scellé) vient du
 * serveur (`paddle.caisse`). Le navigateur ne choisit que la formule et le
 * rythme, parmi les prix que le serveur lui a donnés.
 *
 * ⚠️ À LA FIN, C'EST NOTRE COCHE, PAS LA SIENNE. Paddle termine sur son propre
 * écran de réussite, en anglais par défaut et sans rien dire de la suite. Dès
 * que le paiement est confirmé, sa surimpression se ferme et l'écran pose
 * `FeuilleDeReussite` : ce qui vient de commencer, et sa date.
 */

let chargement: { jeton: string; paddle: Promise<Paddle | undefined> } | null = null;
const ecouteurs = new Set<(evenement: PaddleEventData) => void>();

function paddlePour(caisse: Extract<CaisseServeur, { pret: true }>): Promise<Paddle | undefined> {
	if (chargement?.jeton === caisse.jeton) return chargement.paddle;
	const paddle = import('@paddle/paddle-js').then(({ initializePaddle }) =>
		initializePaddle({
			environment: caisse.environnement,
			token: caisse.jeton,
			...(caisse.pwCustomer === null ? {} : { pwCustomer: { id: caisse.pwCustomer } }),
			eventCallback: (evenement) => {
				for (const ecouter of ecouteurs) ecouter(evenement);
			}
		})
	);
	chargement = { jeton: caisse.jeton, paddle };
	return paddle;
}

function themeDeLaPage(): 'light' | 'dark' {
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useCaissePaddle({
	caisse,
	ouvrirLePortail,
	onSouscrit
}: {
	/** `undefined` pendant la lecture, `null` : rien à ouvrir pour ce compte. */
	caisse: CaisseServeur | null | undefined;
	ouvrirLePortail: () => Promise<string | null>;
	/**
	 * Appelé une fois, quand Paddle confirme le paiement : les premiers pas y
	 * activent les relances, puisque c'est pour elles qu'on vient de souscrire.
	 */
	onSouscrit?: (souscription: Souscription) => void;
}): CaisseAffichee | undefined {
	const [enCours, setEnCours] = useState<CaisseAffichee['enCours']>(null);
	const [choix, setChoix] = useState<Souscription | null>(null);
	const [souscrite, setSouscrite] = useState<Souscription | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);
	const [ttc, setTtc] = useState<MontantsTTC | null>(null);
	/** Les prix déjà demandés à Paddle : une demande par jeu de prix. */
	const demandes = useRef<string | null>(null);
	// L'intérêt pour une formule nourrit le score du compte (`croissance/`) ; il
	// part sans attendre et n'arrête jamais le paiement.
	const noterInteret = useMutation(api.croissance.interet.noterInteretFormule);
	// La remise de bienvenue se crée chez Paddle au moment de payer (audit, lot 8).
	const preparerLaRemise = useAction(api.paddle.remiseDeBienvenue);
	const rappel = useRef(onSouscrit);
	useEffect(() => {
		rappel.current = onSouscrit;
	});

	// Paddle parle par son rappel d'événements, un système extérieur : on s'y
	// abonne le temps que l'écran est monté.
	useEffect(() => {
		function ecouter(evenement: PaddleEventData) {
			if (evenement.name === 'checkout.loaded' || evenement.name === 'checkout.closed') {
				setEnCours(null);
			}
			if (evenement.name === 'checkout.completed') {
				if (choix !== null) suivre('abonnement-souscrit', { ...choix });
				setSouscrite((dejaLa) => dejaLa ?? choix);
				if (choix !== null) rappel.current?.(choix);
				void chargement?.paddle.then((paddle) => paddle?.Checkout.close());
			}
			if (evenement.name === 'checkout.error') {
				setEnCours(null);
				setErreur('Paddle n’a pas pu ouvrir le paiement. Réessayez dans un instant.');
			}
		}
		ecouteurs.add(ecouter);
		return () => {
			ecouteurs.delete(ecouter);
		};
	}, [choix]);

	if (caisse === undefined || caisse === null) return undefined;

	const pret = caisse.pret ? caisse : null;

	/** Ouvre le paiement de Paddle sur ce prix, avec la remise si elle est donnée. */
	function ouvrir(
		p: Extract<CaisseServeur, { pret: true }>,
		prixId: string,
		remise: string | null
	): void {
		paddlePour(p)
			.then((paddle) => {
				if (!paddle) throw new Error('Paddle.js absent');
				paddle.Checkout.open({
					items: [{ priceId: prixId, quantity: 1 }],
					...(remise === null ? {} : { discountId: remise }),
					customData: p.donnees,
					customer: p.client,
					settings: {
						displayMode: 'overlay',
						locale: 'fr',
						theme: themeDeLaPage(),
						allowLogout: false
					}
				});
			})
			.catch(() => {
				setEnCours(null);
				setErreur('Le paiement n’a pas pu se charger. Vérifiez la connexion, puis réessayez.');
			});
	}

	/** Demande à Paddle ce que chaque prix coûte TVA comprise, pour le pays du client. */
	function voirLesPrix(p: Extract<CaisseServeur, { pret: true }>): void {
		const entrees = [
			...Object.entries(p.prix),
			...(p.fondateurs === null ? [] : [['fondateurs', p.fondateurs.prixId]])
		].filter((e): e is [string, string] => typeof e[1] === 'string');
		const cle = `${p.jeton}|${entrees.map(([, id]) => id).join(',')}`;
		if (entrees.length === 0 || demandes.current === cle) return;
		demandes.current = cle;
		paddlePour(p)
			.then((paddle) => {
				if (!paddle) throw new Error('Paddle.js absent');
				return paddle.PricePreview({
					items: entrees.map(([, priceId]) => ({ priceId, quantity: 1 }))
				});
			})
			.then((reponse) => {
				const parPrix = new Map(
					reponse.data.details.lineItems.map((l) => [
						l.price.id,
						Number.parseInt(l.totals.total, 10)
					])
				);
				const montants: Record<string, number> = {};
				for (const [cleDePrix, id] of entrees) {
					const total = parPrix.get(id);
					if (total !== undefined && Number.isFinite(total)) montants[cleDePrix] = total;
				}
				setTtc(montants);
			})
			.catch(() => {
				// Sans réponse, la page dit « TVA en plus » ; la prochaine ouverture redemande.
				demandes.current = null;
			});
	}

	return {
		disponible: pret !== null,
		ttc,
		...(pret === null ? {} : { onVoirLesPrix: () => voirLesPrix(pret) }),
		essai: pret?.essai ?? false,
		bienvenue: pret?.bienvenue ?? null,
		fondateurs: pret?.fondateurs ?? null,
		...(pret?.fondateurs
			? {
					onChoisirFondateurs: () => {
						const f = pret.fondateurs;
						if (f === null) return;
						setErreur(null);
						setEnCours('formule');
						setChoix({ formule: 'pro', rythme: 'annuel', essai: false });
						suivre('paiement-ouvert', { formule: 'pro', rythme: 'annuel', essai: false });
						ouvrir(pret, f.prixId, null);
					}
				}
			: {}),
		enCours,
		souscrite,
		onFermerLaReussite: () => setSouscrite(null),
		erreur,
		onChoisir: (formule, rythme) => {
			const prix = pret?.prix[`${formule}-${rythme}`];
			if (!pret || !prix) {
				setErreur('Cette formule ne peut pas être souscrite pour le moment.');
				return;
			}
			setErreur(null);
			setEnCours('formule');
			setChoix({ formule, rythme, essai: pret.essai });
			suivre('paiement-ouvert', { formule, rythme, essai: pret.essai });
			noterInteret({}).catch(() => undefined);
			// Au mois, pendant l'offre de bienvenue : la remise d'abord. Elle ne se perd
			// jamais en silence : si elle ne se prépare pas, le paiement ne s'ouvre pas.
			if (rythme === 'mensuel' && pret.bienvenue !== null) {
				preparerLaRemise({})
					.then((remise) => ouvrir(pret, prix, remise))
					.catch(() => {
						setEnCours(null);
						setErreur('La remise de bienvenue n’a pas pu se préparer. Réessayez dans un instant.');
					});
				return;
			}
			ouvrir(pret, prix, null);
		},
		onGerer: () => {
			setErreur(null);
			setEnCours('portail');
			ouvrirLePortail()
				.then((adresse) => {
					if (adresse === null) {
						setEnCours(null);
						setErreur('Paddle ne connaît pas encore cet établissement.');
						return;
					}
					// Même onglet : une fenêtre ouverte après une attente est bloquée
					// par les navigateurs.
					window.location.assign(adresse);
				})
				.catch(() => {
					setEnCours(null);
					setErreur('Paddle n’a pas ouvert le portail. Réessayez dans un instant.');
				});
		}
	};
}
