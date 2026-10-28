import { majorationLisible } from '../lib/verticales/recouvrement/pays/france/taux';
import { createFileRoute } from '@tanstack/react-router';
import { PageSite } from '../marketing/site/page';
import feuilleDuSite from '../styles/site/site.css?url';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * La racine sert la page d'accueil publique : le site d'après la maquette V26 (28/10/2026,
 * `docs/superpowers/specs/2026-10-28-site-en-production.md`), section par section dans
 * `marketing/site/`.
 *
 * Elle renvoyait vers `/app` jusqu'ici, faute de site public. Un gérant déjà
 * connecté n'y perd rien : l'en-tête porte « Se connecter » et les deux appels
 * à l'action mènent à l'inscription, qui reconnaît une session ouverte.
 *
 * PAS DE REDIRECTION AUTOMATIQUE VERS `/app` POUR LES CONNECTÉS. La tentation
 * est grande et elle coûte cher : l'état d'authentification n'est connu
 * qu'après vérification du jeton côté client, donc rediriger produirait un
 * clignotement à chaque visite, et surtout la page d'accueil deviendrait
 * inaccessible à un client qui veut simplement la relire ou l'envoyer à son
 * directeur.
 */
/**
 * L'aperçu de partage.
 *
 * IL NE REPREND PAS LA PHOTO DU HÉROS. Une vignette de cuisine pourrait
 * appartenir à n'importe quel site de recettes : elle ne dit ni le nom, ni le
 * sujet, ni ce qu'on vend. `partage.png` est une image DESSINÉE, dans le
 * système de la page, qui porte la marque, la promesse et les trois seuils
 * légaux. Elle se régénère par `bun scripts/generer-og.ts`.
 *
 * L'URL EST ABSOLUE, sans quoi aucune vignette n'apparaît — et l'échec est
 * silencieux. Voir `SITE_CANONIQUE`.
 *
 * `twitter:card` en `summary_large_image` : sans lui, X réduit l'image à une
 * vignette carrée de cent-vingt pixels, où il ne reste rien de lisible.
 */
const APERCU = `${SITE_CANONIQUE}/partage.png`;
const TITRE = 'Letikette · Vos factures impayées, relancées pour vous';
const RESUME =
	'Letikette lit vos factures, calcule ce que chaque client vous doit, pénalités comprises, et le relance à votre nom. Du premier rappel au virement, vous gardez la main.';

export const Route = createFileRoute('/')({
	head: () => ({
		meta: [
			{ title: TITRE },
			{ name: 'description', content: RESUME },

			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: 'Letikette' },
			{ property: 'og:locale', content: 'fr_FR' },
			{ property: 'og:url', content: SITE_CANONIQUE },
			{ property: 'og:title', content: TITRE },
			{ property: 'og:description', content: RESUME },
			{ property: 'og:image', content: APERCU },
			{ property: 'og:image:width', content: '1200' },
			{ property: 'og:image:height', content: '630' },
			{
				property: 'og:image:alt',
				content: `Letikette, logiciel de recouvrement pour les PME. Pénalités au taux BCE majoré de ${majorationLisible()}, frais forfaitaires par facture, délai pour agir en justice.`
			},

			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:title', content: TITRE },
			{ name: 'twitter:description', content: RESUME },
			{ name: 'twitter:image', content: APERCU }
		],
		links: [
			{ rel: 'canonical', href: SITE_CANONIQUE },
			// La feuille du site, cloisonnée sous `.site` : elle ne touche pas l'application.
			{ rel: 'stylesheet', href: feuilleDuSite }
		]
	}),
	component: PageSite
});
