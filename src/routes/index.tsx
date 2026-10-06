import { createFileRoute } from '@tanstack/react-router';
import {
	Navbar,
	Hero,
	Situations,
	LaLoi,
	Frise,
	Etapes,
	Bandeau,
	Veilleur,
	Limites,
	Note,
	Abonnement,
	Tarifs,
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
const TITRE = 'Letikette — vos impayés ont une date limite';
const RESUME =
	'Letikette surveille cette date sur chacune de vos factures, et calcule au centime les intérêts de retard et l’indemnité forfaitaire qui vous sont dus. Chaque euro montre d’où il vient : quel principal, quel taux, sur combien de jours.';

export const Route = createFileRoute('/')({
	head: () => ({
		meta: [
			{ title: TITRE },
			{ name: 'description', content: RESUME },

			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: 'Letikette' },
			{ property: 'og:locale', content: 'fr_FR' },
			{ property: 'og:url', content: SITE_CANONIQUE },
			{ property: 'og:title', content: 'Letikette — vos impayés ont une date limite' },
			{
				property: 'og:description',
				content:
					'Letikette surveille cette date sur chacune de vos factures, et calcule au centime les intérêts de retard et l’indemnité forfaitaire qui vous sont dus.'
			},
			{ property: 'og:image', content: APERCU },
			{ property: 'og:image:width', content: '1200' },
			{ property: 'og:image:height', content: '630' },
			{
				property: 'og:image:alt',
				content:
					'Letikette — vos impayés ont une date limite. Les trois chiffres du code de commerce : les intérêts de retard au taux BCE majoré de dix points, l’indemnité forfaitaire due par facture, et le délai de prescription.'
			},

			{ name: 'twitter:card', content: 'summary_large_image' },
			{
				name: 'twitter:title',
				content: 'Letikette — vos impayés ont une date limite'
			},
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
 *   crème · crème · PROFOND · crème · PROFOND · ENCRE · crème · PROFOND ·
 *   crème · PROFOND · crème · crème · ENCRE
 *
 * Chaque changement de ton annonce un changement de sujet, et il se fait par un
 * arc doux (`courbe`) : la section se pose sur la précédente comme une colline.
 * Le crème raconte, le crème profond démontre, l'encre ne porte que le manifeste
 * et le pied de page. Voir
 * `docs/superpowers/specs/2026-10-06-site-direction-artistique.md`.
 */
function Accueil() {
	return (
		<main className="flex w-full flex-col bg-creme">
			<Navbar />
			<Hero />
			{/* LA CIBLE, JUSTE APRÈS L'ACCROCHE (06/10/2026) : trois gérants, en
			    situations types, avant la loi et le logiciel. On parle d'abord de la
			    personne qui a les impayés. */}
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
			<Bandeau />
			{/*
			  ⚠️ LE VEILLEUR VIENT JUSTE APRÈS LE MANIFESTE, ET L'ORDRE EST L'ARGUMENT.
			  La section précédente pose le problème en une phrase — « une facture
			  impayée ne fait aucun bruit le jour où elle devient irrécouvrable ».
			  Celle-ci est la seule réponse que ce produit puisse donner honnêtement :
			  non pas « nous récupérons votre argent », mais « ce jour-là, quelque
			  chose regardait ». Les séparer casserait la seule articulation de la
			  page qui tienne en deux écrans.
			*/}
			<Veilleur />
			<Limites />
			{/*
			  ⚠️ LA NOTE SUIT LES LIMITES, ET C EST L ORDRE QUI LA REND UTILE. La
			  section precedente enumere trois refus. Sans personne derriere, un refus
			  se lit comme une clause de protection ; signe, il se lit comme un choix.
			  Et c est le dernier ecran avant qu on demande de l argent : celui qui le
			  demande s est presente d abord.
			*/}
			<Note />
			<Abonnement />
			<Tarifs />
			<Appel />
			<Pied />
		</main>
	);
}
