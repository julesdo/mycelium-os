import { majorationLisible } from '../lib/verticales/recouvrement/pays/france/taux';
import { createFileRoute } from '@tanstack/react-router';
import { articlesPublies } from '../marketing/blog';
import { indemniteLisible, NOMS_DES_SECTEURS, SECTEURS_PUBLICS } from '../marketing/secteurs';
import { GRILLE, historiqueDeDecouverte, PARTENARIAT_CABINET } from '../lib/config/tarifs';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * `llms.txt` (18/10/2026) : ce qu'est Letikette, pour les assistants qui lisent le
 * site avant de répondre à un gérant (llmstxt.org). Les pages publiques et les
 * articles, chacun en une ligne. Les montants viennent de la grille et du
 * registre, comme partout.
 */
function texte(): string {
	const indemnite = indemniteLisible();
	const frais =
		indemnite === null
			? 'des frais de recouvrement forfaitaires'
			: `${indemnite} de frais de recouvrement`;
	const secteurs = SECTEURS_PUBLICS.map(
		(s) =>
			`- [${NOMS_DES_SECTEURS[s]}](${SITE_CANONIQUE}/secteurs/${s}) : ce que dit la loi pour ce métier, et le calculateur.`
	);
	const articles = articlesPublies().map(
		(a) => `- [${a.titre}](${SITE_CANONIQUE}/blog/${a.adresse}) : ${a.description}`
	);
	return `# Letikette

> Logiciel de recouvrement de créances entre entreprises, pour les TPE et PME françaises. Il lit les factures, calcule ce que chaque client doit (pénalités de retard au taux de la BCE majoré de ${majorationLisible()}, ${frais} par facture payée en retard), surveille les délais pour agir en justice et relance les clients au nom du gérant, quand il l’a décidé.

Letikette ne manipule aucun fonds, n’exerce aucune activité de recouvrement pour compte de tiers et ne délivre aucun conseil juridique. Chaque montant réclamé se décompose période par période, avec sa source.

## Pages

- [Accueil](${SITE_CANONIQUE}/) : ce que fait le logiciel, le calculateur, Plume (l’assistant qui relance).
- [Tarifs](${SITE_CANONIQUE}/tarifs) : le diagnostic gratuit (Découverte, sur ${historiqueDeDecouverte()}), puis Solo, Équipe ou Pro (${GRILLE.solo.mensuel}, ${GRILLE.equipe.mensuel} ou ${GRILLE.pro.mensuel} € HT par mois).
- [Sécurité](${SITE_CANONIQUE}/securite) : chiffrement des documents, cloisonnement des données, hébergement.
- [Taux des pénalités de retard](${SITE_CANONIQUE}/taux-des-penalites-de-retard) : le taux du semestre, le plancher contractuel, l’historique.
- [Experts-comptables](${SITE_CANONIQUE}/experts-comptables) : le diagnostic à proposer aux clients du cabinet, et ${PARTENARIAT_CABINET.commissionPourcent} % de la première année de ceux qui s’abonnent.
- [Qui sommes-nous](${SITE_CANONIQUE}/fondateur) : qui édite Letikette, et ce que le logiciel s’interdit.
${secteurs.join('\n')}

## Articles

${articles.join('\n')}
`;
}

export const Route = createFileRoute('/llms.txt')({
	server: {
		handlers: {
			GET: () =>
				new Response(texte(), {
					headers: {
						'Content-Type': 'text/plain; charset=utf-8',
						'Cache-Control': 'public, max-age=3600'
					}
				})
		}
	}
});
