import { useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { useQuery } from './donnees';
import { api } from '../lib/convex/_generated/api';
import { resumeDeLaMarque } from '../lib/verticales/recouvrement/marque';
import { aujourdHuiISO } from '../ui';
import {
	FeuilleLogoEtCouleurs,
	type EtatDeLaMarque,
	type MarqueAffichee
} from '../screens/compte/marque';
import { preparerLogo, type LogoPrepare } from './logo-courriers';
import { messageDeRefus, televerser } from './televerser';
import { usePlumeDit } from './parole-de-plume';

/**
 * « LOGO ET COULEURS », BRANCHÉ (23/10/2026) : la lecture, le brouillon, le
 * téléversement à « Enregistrer », et l'exemple que le gérant s'envoie.
 *
 * ⚠️ LE BROUILLON NAÎT À CHAQUE OUVERTURE. La route pose une `key` qui change à
 * chaque ouverture : refermer sans enregistrer oublie ce qu'on avait essayé,
 * comme une feuille de réglages d'iOS qu'on annule.
 *
 * ⚠️ LE BROUILLON NE CONNAÎT PAS CONVEX (`useMarqueAffichee`). La salle le fait
 * tourner avec ses propres gestes : ce qu'on y regarde est ce que fait l'écran.
 */

/** Ce que le serveur dit de l'image posée (`recouvrement/marque.lire`). */
export interface MarqueLue {
	readonly denomination: string;
	readonly logo: {
		readonly url: string;
		readonly largeur: number;
		readonly hauteur: number;
		readonly teintes: readonly string[];
	} | null;
	readonly couleur: string | null;
	readonly modifiable: boolean;
	readonly courriel: string | null;
	readonly envoiConfigure: boolean;
}

/** Ce que l'écran demande au serveur : enregistrer (la raison d'un refus, ou `null`) et s'envoyer un exemple. */
export interface GestesDeLaMarque {
	readonly enregistrer: (args: {
		readonly couleur: string | null;
		readonly logo: 'GARDER' | 'RETIRER' | LogoPrepare;
	}) => Promise<string | null>;
	/** Rend l'adresse où l'exemple est parti. */
	readonly envoyerUnExemple: () => Promise<string>;
}

interface Brouillon {
	/** Un logo préparé ici, ou son retrait ; absent : celui qui est enregistré. */
	readonly logo?: LogoPrepare | 'RETIRE';
	/** Une couleur choisie ici (`null` : sans couleur) ; absente : celle qui est enregistrée. */
	readonly couleur?: string | null;
}

/** Ce que la rangée du compte dit de l'image posée ; `undefined` tant que la lecture court. */
export function useResumeDeLaMarque(): string | undefined {
	const lue = useQuery(api.recouvrement.marque.lire, {});
	return lue === undefined
		? undefined
		: resumeDeLaMarque({ logo: lue.logo !== null, couleur: lue.couleur });
}

/** Le brouillon de la page : ce qu'on essaie, par-dessus ce qui est enregistré. */
export function useMarqueAffichee(
	lue: MarqueLue | undefined,
	gestes: GestesDeLaMarque
): MarqueAffichee | null {
	const [brouillon, setBrouillon] = useState<Brouillon>({});
	const [etat, setEtat] = useState<EtatDeLaMarque>({ genre: 'repos' });
	const [erreurDuLogo, setErreurDuLogo] = useState<string | null>(null);

	if (lue === undefined) return null;
	const enregistree = lue;

	const logoPrepare = typeof brouillon.logo === 'object' ? brouillon.logo : null;
	const logo =
		brouillon.logo === 'RETIRE'
			? null
			: logoPrepare !== null
				? { src: logoPrepare.apercu, largeur: logoPrepare.largeur, hauteur: logoPrepare.hauteur }
				: enregistree.logo === null
					? null
					: {
							src: enregistree.logo.url,
							largeur: enregistree.logo.largeur,
							hauteur: enregistree.logo.hauteur
						};
	const couleur = brouillon.couleur !== undefined ? brouillon.couleur : enregistree.couleur;
	const teintesDuLogo =
		brouillon.logo === 'RETIRE'
			? []
			: logoPrepare !== null
				? logoPrepare.teintes
				: (enregistree.logo?.teintes ?? []);
	const modifiee =
		brouillon.logo !== undefined ||
		(brouillon.couleur !== undefined && brouillon.couleur !== enregistree.couleur);

	function apresUnChangement() {
		if (etat.genre === 'envoye' || etat.genre === 'erreur') setEtat({ genre: 'repos' });
	}

	function choisirLogo(fichier: File) {
		apresUnChangement();
		setErreurDuLogo(null);
		setEtat({ genre: 'preparation' });
		preparerLogo(fichier)
			.then((prepare) => {
				setBrouillon((avant) => ({
					...avant,
					logo: prepare,
					// Le logiciel propose, le gérant confirme : la première teinte du logo
					// quand aucune couleur n'est encore posée ni choisie.
					...(avant.couleur === undefined &&
					enregistree.couleur === null &&
					prepare.teintes[0] !== undefined
						? { couleur: prepare.teintes[0] }
						: {})
				}));
				setEtat({ genre: 'repos' });
			})
			.catch((erreur: unknown) => {
				setErreurDuLogo(
					erreur instanceof Error ? erreur.message : 'Ce logo n’a pas pu se préparer.'
				);
				setEtat({ genre: 'repos' });
			});
	}

	function retirerLogo() {
		apresUnChangement();
		setErreurDuLogo(null);
		// Retirer, c'est n'avoir plus de logo : le brouillon s'efface, et celui qui est
		// posé avec lui. Sans logo posé, il ne reste rien à retirer à l'enregistrement.
		setBrouillon((avant) =>
			enregistree.logo === null
				? avant.couleur === undefined
					? {}
					: { couleur: avant.couleur }
				: { ...avant, logo: 'RETIRE' }
		);
	}

	async function enregistrer() {
		setEtat({ genre: 'enregistrement' });
		try {
			const refus = await gestes.enregistrer({
				couleur,
				logo: brouillon.logo === 'RETIRE' ? 'RETIRER' : (logoPrepare ?? 'GARDER')
			});
			if (refus !== null) {
				setEtat({ genre: 'erreur', message: refus });
				return;
			}
			setBrouillon({});
			setEtat({ genre: 'repos' });
		} catch (erreur) {
			setEtat({ genre: 'erreur', message: messageDeRefus(erreur) });
		}
	}

	return {
		denomination: enregistree.denomination,
		logo,
		couleur,
		teintesDuLogo,
		modifiee,
		modifiable: enregistree.modifiable,
		courriel: enregistree.courriel,
		envoiConfigure: enregistree.envoiConfigure,
		aujourdHui: aujourdHuiISO(),
		etat,
		erreurDuLogo,
		onChoisirLogo: choisirLogo,
		onRetirerLogo: retirerLogo,
		onChoisirCouleur: (choisie) => {
			apresUnChangement();
			setBrouillon((avant) => ({ ...avant, couleur: choisie }));
		},
		onEnregistrer: () => void enregistrer(),
		onEnvoyerUnExemple: () => {
			setEtat({ genre: 'envoi' });
			gestes
				.envoyerUnExemple()
				.then((a) => setEtat({ genre: 'envoye', a }))
				.catch((erreur: unknown) => setEtat({ genre: 'erreur', message: messageDeRefus(erreur) }));
		}
	};
}

export function LogoEtCouleursEnPlace({
	ouverte,
	onFermer
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
}) {
	const lue = useQuery(api.recouvrement.marque.lire, {});
	const adresseDuLogo = useMutation(api.recouvrement.marque.adresseDuLogo);
	const enregistrer = useMutation(api.recouvrement.marque.enregistrer);
	const envoyerUnExemple = useAction(api.recouvrement.marque.envoyerUnExemple);
	const plumeDit = usePlumeDit();

	const marque = useMarqueAffichee(lue, {
		enregistrer: async ({ couleur, logo }) => {
			let logoAPoser: Parameters<typeof enregistrer>[0]['logo'] =
				logo === 'GARDER' || logo === 'RETIRER' ? logo : 'GARDER';
			if (typeof logo === 'object') {
				const storageId = await televerser(
					() => adresseDuLogo({}),
					new File([logo.fichier], 'logo.png', { type: 'image/png' })
				);
				logoAPoser = {
					storageId,
					largeur: logo.largeur,
					hauteur: logo.hauteur,
					teintes: [...logo.teintes]
				};
			}
			const refus = await enregistrer({ couleur, logo: logoAPoser });
			if (refus === null) {
				plumeDit({
					titre: 'Logo et couleurs enregistrés',
					texte: 'Vos prochaines relances et votre page de paiement portent votre image.',
					humeur: 'content'
				});
			}
			return refus;
		},
		envoyerUnExemple: async () => (await envoyerUnExemple({})).destinataire
	});

	return <FeuilleLogoEtCouleurs ouverte={ouverte} onFermer={onFermer} marque={marque} />;
}
