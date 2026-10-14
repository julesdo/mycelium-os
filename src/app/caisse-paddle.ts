import { useEffect, useState } from 'react';
import type { Paddle, PaddleEventData } from '@paddle/paddle-js';
import type { CaisseServeur } from '../lib/convex/paddle';
import type { CaisseAffichee, Souscription } from '../screens/compte/facturation';

/**
 * LE PAIEMENT PADDLE, BRANCHÉ SUR L'ÉCRAN.
 *
 * Paddle.js se charge AU PREMIER TOUCHER, jamais avec l'application : c'est un
 * script de Paddle (cdn.paddle.com) dont seul le choix de formule a besoin, et
 * le paquet d'entrée ne porte que le socle. Le paiement s'ouvre en
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
	ouvrirLePortail
}: {
	/** `undefined` pendant la lecture, `null` : rien à ouvrir pour ce compte. */
	caisse: CaisseServeur | null | undefined;
	ouvrirLePortail: () => Promise<string | null>;
}): CaisseAffichee | undefined {
	const [enCours, setEnCours] = useState<CaisseAffichee['enCours']>(null);
	const [choix, setChoix] = useState<Souscription | null>(null);
	const [souscrite, setSouscrite] = useState<Souscription | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);

	// Paddle parle par son rappel d'événements, un système extérieur : on s'y
	// abonne le temps que l'écran est monté.
	useEffect(() => {
		function ecouter(evenement: PaddleEventData) {
			if (evenement.name === 'checkout.loaded' || evenement.name === 'checkout.closed') {
				setEnCours(null);
			}
			if (evenement.name === 'checkout.completed') {
				setSouscrite((dejaLa) => dejaLa ?? choix);
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

	return {
		disponible: pret !== null,
		essai: pret?.essai ?? false,
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
			paddlePour(pret)
				.then((paddle) => {
					if (!paddle) throw new Error('Paddle.js absent');
					paddle.Checkout.open({
						items: [{ priceId: prix, quantity: 1 }],
						customData: pret.donnees,
						customer: pret.client,
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
