import { createFileRoute } from '@tanstack/react-router';
import {
	Navbar,
	Hero,
	LaLoi,
	Etapes,
	Bandeau,
	Preuve,
	Limites,
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
const TITRE = 'Letikette — vos impayés, avant qu’ils ne s’éteignent';
const RESUME =
	'Letikette lit vos factures, surveille vos échéances et chiffre vos créances au centime. Chaque euro réclamé montre d’où il vient : quel principal, quel taux, sur combien de jours.';

export const Route = createFileRoute('/')({
	head: () => ({
		meta: [
			{ title: TITRE },
			{ name: 'description', content: RESUME },

			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: 'Letikette' },
			{ property: 'og:locale', content: 'fr_FR' },
			{ property: 'og:url', content: SITE_CANONIQUE },
			{ property: 'og:title', content: 'Letikette — le recouvrement de créances B2B, mesuré' },
			{
				property: 'og:description',
				content:
					'Vos impayés s’éteignent sans bruit. Letikette surveille vos échéances, repère les créances mûres et chiffre chaque décompte au centime.'
			},
			{ property: 'og:image', content: APERCU },
			{ property: 'og:image:width', content: '1200' },
			{ property: 'og:image:height', content: '630' },
			{
				property: 'og:image:alt',
				content:
					'Letikette — vos impayés, avant qu’ils ne s’éteignent. Intérêts de retard au taux légal, indemnité forfaitaire de 40 € par facture, prescription surveillée par secteur.'
			},

			{ name: 'twitter:card', content: 'summary_large_image' },
			{
				name: 'twitter:title',
				content: 'Letikette — le recouvrement de créances B2B, mesuré'
			},
			{ name: 'twitter:description', content: RESUME },
			{ name: 'twitter:image', content: APERCU }
		],
		links: [{ rel: 'canonical', href: SITE_CANONIQUE }]
	}),
	component: Accueil
});

/**
 * L'ordre des sections est le rythme des fonds, et il se lit d'un coup :
 *
 *   beige · beige · CLAIR · ENCRE · creux · beige · beige
 *
 * Chaque changement de fond annonce un changement de sujet. Le clair porte les
 * démonstrations, qui ont besoin du contraste maximal. L'encre porte la preuve,
 * la seule section qui doit faire autorité. Le creux porte les limites, la seule
 * qui baisse la voix. Le beige respire entre les deux.
 *
 * Le conteneur ne borne plus rien : chaque section porte son fond sur toute la
 * largeur et borne sa lecture elle-même. Sans ça, aucun aplat ne peut aller de
 * bord à bord.
 */
function Accueil() {
	return (
		<main className="flex w-full flex-col">
			<Navbar />
			<Hero />
			<LaLoi />
			{/*
			  ⚠️ LA PREUVE EST REMONTÉE DE LA 6e À LA 4e PLACE, ET ELLE PORTE LE
			  MEILLEUR ARGUMENT DU PRODUIT.

			  Elle vivait derrière `Etapes` et `Bandeau`, c'est-à-dire qu'un visiteur
			  devait traverser deux cent cinquante mots de mécanique avant de voir la
			  seule chose qui prouve quoi que ce soit : un décompte décomposé période
			  par période, avec son taux et ses jours. Le décompte était en outre
			  l'étape 04 d'`Etapes`, donc enterré deux fois.

			  L'ordre est maintenant : ce que la loi vous doit (des chiffres qui ne
			  nous appartiennent pas), puis la preuve qu'on sait les calculer, puis
			  seulement comment. Le visiteur apprend, vérifie, et ensuite regarde la
			  mécanique — au lieu de devoir croire d'abord.

			  C'est aussi ce que fait la référence : relevé le 23/09/2026, Revolut
			  place ses deux blocs de preuve en positions 1 et 2, immédiatement sous
			  le héros. Le pari — le doute précède la curiosité — est encore plus
			  juste pour quelqu'un à qui on parle de quarante mille euros d'impayés.
			*/}
			<Preuve />
			<Etapes />
			<Bandeau />
			<Limites />
			<Abonnement />
			<Tarifs />
			<Appel />
			<Pied />
		</main>
	);
}
