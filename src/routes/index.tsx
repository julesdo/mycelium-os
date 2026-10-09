import { createFileRoute } from '@tanstack/react-router';
import {
	Navbar,
	Hero,
	Situations,
	LaLoi,
	Frise,
	Etapes,
	Securite,
	Tarifs,
	Faq,
	BlogAccueil,
	Appel,
	Pied
} from '../marketing';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * La racine sert la page d'accueil publique.
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
const TITRE = 'Letikette · Logiciel de recouvrement des factures impayées pour PME';
const RESUME =
	'Letikette calcule les pénalités et les frais dus sur chaque facture en retard, surveille les délais et prépare vos relances. Rien ne part sans votre accord.';

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
				content:
					'Letikette, logiciel de recouvrement pour les PME. Pénalités au taux BCE majoré de dix points, frais forfaitaires par facture, délai pour agir en justice.'
			},

			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:title', content: TITRE },
			{ name: 'twitter:description', content: RESUME },
			{ name: 'twitter:image', content: APERCU }
		],
		links: [{ rel: 'canonical', href: SITE_CANONIQUE }]
	}),
	component: Accueil
});

/**
 * L'ORDRE DES SECTIONS EST LE RYTHME DU PAPIER (06/10/2026).
 *
 *   crème · crème · PROFOND · crème · PROFOND · ENCRE · PROFOND · crème ·
 *   crème · ENCRE
 *
 * Chaque changement de ton annonce un changement de sujet, et il se fait par un
 * arc doux (`courbe`) : la section se pose sur la précédente comme une colline.
 * Le crème raconte, le crème profond démontre, l'encre ne porte que la sécurité
 * et le pied de page. Voir
 * `docs/superpowers/specs/2026-10-06-site-direction-artistique.md`.
 */
function Accueil() {
	return (
		<main className="flex w-full flex-col bg-creme">
			<Navbar />
			<Hero />
			{/* LA CIBLE, JUSTE APRÈS L'ACCROCHE : les métiers, avant la loi et le
			    logiciel. On parle d'abord de celui qui a les impayés. */}
			<Situations />
			<LaLoi />
			{/*
			  ⚠️ LA FRISE VIENT JUSTE APRÈS LA LOI, ET C'EST SA DÉMONSTRATION. La
			  section précédente énonce trois chiffres — un taux, une indemnité, un
			  délai. Celle-ci les fait TOURNER sur une facture : le montant grandit
			  des deux premiers, puis le troisième le ramène à zéro. Séparer l'énoncé
			  de sa démonstration obligerait à répéter les trois chiffres.
			*/}
			<Frise />
			<Etapes />
			{/*
			  LA SÉCURITÉ AVANT LE PRIX (réécriture du 06/10 au soir) : ce qui rassure
			  — rien ne part sans vous, aucun fonds touché — se lit avant qu'on
			  demande de l'argent. Elle remplace le manifeste, le veilleur, les
			  limites et la défense de l'abonnement.
			*/}
			<Securite />
			<Tarifs />
			<Faq />
			<BlogAccueil />
			<Appel />
			<Pied />
		</main>
	);
}
