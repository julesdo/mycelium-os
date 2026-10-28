import { createFileRoute, useHydrated, useRouterState } from '@tanstack/react-router';
import { useQuery } from '../app/donnees';
import { FORME_D_ADRESSE } from '../lib/compte/regles';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';
import { api } from '../lib/convex/_generated/api';
import { PageInscription } from '../marketing/compte/inscription';
import feuilleDuSite from '../styles/site/site.css?url';

/**
 * L'INSCRIPTION, dans la DA du site (28/10/2026) : `marketing/compte/inscription.tsx`.
 *
 * `invitation` porte le jeton d'une invitation en cours.
 *
 * SANS LUI, UN INVITÉ PERD SON INVITATION EN CRÉANT SON COMPTE, et le pire suit :
 * l'écran suivant lui demande de créer un établissement, alors qu'il vient
 * précisément d'être invité dans celui de quelqu'un d'autre. On repasse donc par
 * l'écran d'acceptation, et jamais par `/bienvenue`.
 */
export const Route = createFileRoute('/inscription')({
	/**
	 * `pour` (19/10/2026, audit) : « Combien vous doit-on ? » et le calculateur y mènent
	 * avec `pour=diagnostic`. Il ne change rien au parcours ; il se mesure.
	 *
	 * `cadeau` (22/10/2026) : le code de la recommandation, posé par la page de l'invité
	 * (`/invitation/<code>`). L'inscription rappelle qui offre le mois ; le rattachement,
	 * lui, se fait par le code gardé dans l'onglet (`source-visite.ts`).
	 */
	validateSearch: (
		search: Record<string, unknown>
	): { invitation?: string; pour?: 'diagnostic'; cadeau?: string } => ({
		invitation: typeof search.invitation === 'string' ? search.invitation : undefined,
		pour: search.pour === 'diagnostic' ? 'diagnostic' : undefined,
		cadeau: typeof search.cadeau === 'string' ? search.cadeau.slice(0, 32) : undefined
	}),
	head: () => ({
		meta: [{ title: 'Créer votre compte · Letikette' }],
		links: [{ rel: 'stylesheet', href: feuilleDuSite }]
	}),
	component: Inscription
});

function Inscription() {
	const { invitation, pour, cadeau } = Route.useSearch();
	const offre = useQuery(
		api.croissance.parrainage.invitation,
		cadeau === undefined ? 'skip' : { code: cadeau }
	);
	// L'adresse tapée sur le site (28/10/2026) ouvre au mot de passe. Seulement après
	// l'hydratation : au rechargement, le serveur a dessiné l'étape de l'adresse, et l'état de
	// l'historique, qu'il ne voit pas, ne doit pas faire diverger le premier rendu.
	const hydrate = useHydrated();
	const adresse = useRouterState({ select: (s) => s.location.state.adresseDInscription });
	const adresseDuSite =
		hydrate && adresse !== undefined && FORME_D_ADRESSE.test(adresse) ? adresse : undefined;
	return (
		<PageInscription
			// Une adresse qui arrive après l'hydratation recommence la page à l'étape du mot de passe.
			key={adresseDuSite ?? 'adresse'}
			invitation={invitation}
			pour={pour}
			adresseDuSite={adresseDuSite}
			offre={
				offre
					? {
							offertPar: offre.offertPar,
							detail: `Déduit de votre deuxième prélèvement, après vos ${DUREE_ESSAI_JOURS} jours d’essai.`
						}
					: null
			}
		/>
	);
}
