import { createFileRoute } from '@tanstack/react-router';
import { Hero, LaLoi, Etapes, Preuve, Limites, Abonnement, Appel, Pied } from '../marketing';

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
export const Route = createFileRoute('/')({
	head: () => ({
		meta: [
			{ title: 'Letikette — vos trois taux EGalim, mesurés dans vos factures' },
			{
				name: 'description',
				content:
					'Letikette lit vos factures ligne par ligne et calcule vos trois taux EGalim en valeur d’achat. Chaque classement est justifié, la viande et le poisson passent devant vous.'
			},
			{ property: 'og:title', content: 'Letikette — conformité EGalim en restauration collective' },
			{
				property: 'og:description',
				content:
					'Vos trois taux EGalim sont déjà dans vos factures. Letikette les en sort, ligne par ligne, avec la justification de chaque classement.'
			},
			{ property: 'og:type', content: 'website' }
		]
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
			<Hero />
			<LaLoi />
			<Etapes />
			<Preuve />
			<Limites />
			<Abonnement />
			<Appel />
			<Pied />
		</main>
	);
}
