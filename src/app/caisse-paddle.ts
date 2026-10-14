import { useEffect, useState } from 'react';
import type { Paddle, PaddleEventData } from '@paddle/paddle-js';
import type { CaisseServeur } from '../lib/convex/paddle';
import type { CaisseAffichee } from '../screens/compte/facturation';

/**
 * LE PAIEMENT PADDLE, BRANCHÉ SUR L'ÉCRAN D'ABONNEMENT.
 *
 * Paddle.js se charge AU PREMIER TOUCHER, jamais avec l'application : c'est un
 * script de Paddle (cdn.paddle.com) dont seul l'écran d'abonnement a besoin, et
 * le paquet d'entrée ne porte que le socle. Le paiement s'ouvre en surimpression,
 * chez Paddle, dans sa mise en page : la carte ne passe jamais par nos serveurs.
 *
 * Ce que le paiement emporte (le prix du palier, l'établissement scellé) vient
 * du serveur (`paddle.caisse`). Le navigateur ne choisit rien.
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
	const [recu, setRecu] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	// Paddle parle par son rappel d'événements, un système extérieur : on s'y
	// abonne le temps que l'écran est monté.
	useEffect(() => {
		function ecouter(evenement: PaddleEventData) {
			if (evenement.name === 'checkout.loaded' || evenement.name === 'checkout.closed') {
				setEnCours(null);
			}
			if (evenement.name === 'checkout.completed') setRecu(true);
			if (evenement.name === 'checkout.error') {
				setEnCours(null);
				setErreur('Paddle n’a pas pu ouvrir le paiement. Réessayez dans un instant.');
			}
		}
		ecouteurs.add(ecouter);
		return () => {
			ecouteurs.delete(ecouter);
		};
	}, []);

	if (caisse === undefined || caisse === null) return undefined;

	const pret = caisse.pret ? caisse : null;

	return {
		offres: {
			bilan: pret?.prix.bilan != null,
			abonnement: pret?.prix.abonnement != null
		},
		indisponible: pret === null,
		enCours,
		recu,
		erreur,
		onChoisir: (offre) => {
			const prix = pret?.prix[offre];
			if (!pret || !prix) return;
			setErreur(null);
			setEnCours(offre);
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
