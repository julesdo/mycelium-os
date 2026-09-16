import type { ComponentProps } from 'react';
import {
	EcranEquipe,
	type Equipe,
	type InvitationEnAttente,
	type MembreEquipe
} from '../../screens/equipe/equipe';
import { EcranInviter, type InvitationAffichee } from '../../screens/equipe/inviter';
import { FACTURATION_DEMO, planEffectif } from './abonnement';
import { formeDemo, lectureDemo, type EcranDuProduit } from './demo';
import { AvecLesReglages } from './reglages';

/**
 * LES ENTRÉES DE LA FAMILLE, DÉCLARÉES AVANT TOUT CE QUI S'EN CALCULE.
 *
 * Les personnes de l'établissement et l'invitation en attente ne s'écrivent
 * qu'ici. La famille des données en tire le compte connecté et le nombre de
 * personnes (`donnees.tsx`). Les places, elles, ne s'écrivent pas : elles
 * viennent de l'abonnement de l'établissement, dont la famille de l'abonnement
 * déclare les entrées (`abonnement.tsx`).
 *
 * Le reste se compose comme les deux routes le composent. Le compte connecté est
 * celui que `estMoi` marque, et ce qu'il voit en dépend : ses droits, et les
 * invitations qu'on lui montre.
 */

/**
 * L'écran d'équipe, aux deux rôles.
 *
 * Le jeu expose ce qui casse : un compte sans nom, une adresse jamais vérifiée,
 * une invitation qui expire demain. Un écran où trois collègues bien nommés se
 * rangent en colonne ne prouve rien.
 */
export const MEMBRES: MembreEquipe[] = [
	{
		id: 'm1',
		nom: 'Claire Béranger',
		email: 'c.beranger@thumbbb.fr',
		role: 'ORG_ADMIN',
		arriveLe: Date.parse('2026-02-11'),
		adresseVerifiee: true,
		estMoi: true
	},
	{
		id: 'm2',
		nom: 'Yannis K.',
		email: 'yannis.k@thumbbb.fr',
		role: 'ORG_MEMBER',
		arriveLe: Date.parse('2026-03-02'),
		adresseVerifiee: true,
		estMoi: false
	},
	{
		id: 'm3',
		nom: null,
		email: 'direction@thumbbb.fr',
		role: 'ORG_MEMBER',
		arriveLe: Date.parse('2026-08-19'),
		adresseVerifiee: false,
		estMoi: false
	}
];

const INVITATIONS: InvitationEnAttente[] = [
	{
		id: 'i1',
		email: 'nouveau.second@thumbbb.fr',
		role: 'ORG_MEMBER',
		lien: 'https://www.letikette.com/rejoindre/4f1c-demo',
		expireLe: Date.now() + 26 * 60 * 60 * 1000
	}
];

/** Le compte connecté : le membre que `estMoi` marque. */
export function compteConnecte(membres: readonly MembreEquipe[]): MembreEquipe {
	const compte = membres.find((membre) => membre.estMoi);
	if (compte === undefined) {
		throw new Error(
			'Démonstration incomplète : aucun membre de l’équipe n’est le compte connecté.'
		);
	}
	return compte;
}

/**
 * L'équipe lue par Yannis K., qui n'administre pas : le compte connecté est la
 * seule entrée changée. `listOrganizationMembers` ne marque `estMoi` que sur le
 * compte qui lit (`src/lib/convex/organizations.ts`, lignes 280 et 300).
 */
export const MEMBRES_VUS_PAR_UN_MEMBRE: readonly MembreEquipe[] = MEMBRES.map((membre) => ({
	...membre,
	estMoi: membre.id === 'm2'
}));

/** Ce qu'une forme de la famille fait varier : qui lit l'équipe, et ce que le déploiement porte pour l'abonnement. */
interface FormeEquipe {
	readonly membres: readonly MembreEquipe[];
	readonly facturation: typeof FACTURATION_DEMO;
}

/** L'équipe lue par le gérant, administrateur, sur le déploiement de la salle. */
const EQUIPE_DEMO: FormeEquipe = { membres: MEMBRES, facturation: FACTURATION_DEMO };

/**
 * Les formes nommées, chacune sur une seule entrée changée.
 *
 * « paiement ouvert » : une clé Paddle sur le déploiement, comme la forme du même
 * nom de l'abonnement. L'essai qui court donne les places du plan `procedures`,
 * et l'équipe les occupe toutes, invitation en attente comprise.
 */
const FORMES_EQUIPE_DEMO: Readonly<Record<string, FormeEquipe>> = {
	'vu par un membre': { ...EQUIPE_DEMO, membres: MEMBRES_VUS_PAR_UN_MEMBRE },
	'paiement ouvert': { ...EQUIPE_DEMO, facturation: { ...FACTURATION_DEMO, clePaddle: true } }
};

/**
 * L'équipe, composée comme sa route la compose (`src/routes/app/equipe.tsx`).
 *
 * Les invitations en attente ne vont qu'à un administrateur : `listOrgInvitations`
 * rend une liste vide à un membre (`organizations.ts`, ligne 501). Les places sont
 * celles que `getBillingStatus` résout par `resolveEffectivePlan` (`billing.ts`,
 * ligne 182), comme l'état d'abonnement : sans clé Paddle, celles du plan de
 * développement.
 */
function equipeDe({ membres, facturation }: FormeEquipe): ComponentProps<typeof Equipe> {
	const estAdmin = compteConnecte(membres).role === 'ORG_ADMIN';

	return {
		membres,
		invitations: estAdmin ? INVITATIONS : [],
		estAdmin,
		siegesUtilises: membres.length,
		siegesAutorises: planEffectif(facturation).seatsAllowed,
		onChangerRole: () => Promise.resolve(),
		onRetirer: () => Promise.resolve(),
		onAnnulerInvitation: () => Promise.resolve(),
		onVerifierAdresse: () => Promise.resolve()
	};
}

/**
 * La page d'invitation, composée comme sa route la compose
 * (`src/routes/app/_reglages.equipe_.inviter.tsx`), sur les mêmes lectures que l'équipe.
 */
function invitationDe(forme: FormeEquipe): InvitationAffichee {
	const { invitations, estAdmin, siegesUtilises, siegesAutorises } = equipeDe(forme);

	return {
		estAdmin,
		complet: siegesUtilises + invitations.length >= siegesAutorises,
		places: siegesAutorises,
		// La feuille d'après l'envoi montre le lien à copier : sans lui, la salle
		// ne verrait jamais l'écran qui existe pour une invitation tombée dans les
		// indésirables.
		onInviter: () => Promise.resolve('https://www.letikette.com/rejoindre/4f1c-demo')
	};
}

export const ECRANS_EQUIPE: readonly EcranDuProduit[] = [
	{
		route: '/app/_reglages/equipe',
		libelle: 'équipe',
		vide: false,
		variantes: Object.keys(FORMES_EQUIPE_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const forme = formeDemo(variante, EQUIPE_DEMO, FORMES_EQUIPE_DEMO);
			return (
				<AvecLesReglages section="equipe">
					<EcranEquipe donnees={lectureDemo(etat, equipeDe(forme))} />
				</AvecLesReglages>
			);
		}
	},
	{
		route: '/app/_reglages/equipe_/inviter',
		libelle: 'inviter',
		vide: false,
		variantes: Object.keys(FORMES_EQUIPE_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const forme = formeDemo(variante, EQUIPE_DEMO, FORMES_EQUIPE_DEMO);
			return (
				<AvecLesReglages section="equipe">
					<EcranInviter donnees={lectureDemo(etat, invitationDe(forme))} />
				</AvecLesReglages>
			);
		}
	}
];
