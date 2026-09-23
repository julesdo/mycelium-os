import { marked } from 'marked';
import { Link } from '@tanstack/react-router';
import { Pied } from './pied';
import { Navbar } from './navbar';

/**
 * UNE PAGE LÉGALE, RENDUE DEPUIS SON MARKDOWN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE SEULE SOURCE, ET C'EST TOUT L'ENJEU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les quatre documents vivent dans `docs/juridique/` et sont importés tels
 * quels. Les recopier en JSX aurait produit deux versions d'un même texte
 * opposable, et elles auraient divergé — c'est la seule divergence de ce dépôt
 * qui se règle devant un juge plutôt qu'en relecture.
 *
 * ⚠️ POURQUOI UNE DÉPENDANCE PLUTÔT QU'UN PETIT LECTEUR MAISON. Le Factur-X a
 * tranché dans l'autre sens : quinze champs d'un schéma rigide ne justifiaient
 * pas 1,3 Mo de dépendance. Ici l'entrée est du Markdown complet — tableaux,
 * listes imbriquées, citations, emphase — et un analyseur écrit à la main
 * finirait par rendre une clause de travers. Un tableau de durées de
 * conservation à moitié rendu est pire qu'un tableau absent.
 *
 * ⚠️ `dangerouslySetInnerHTML` EST ACCEPTABLE ICI, ET NULLE PART AILLEURS.
 * L'entrée n'est pas une donnée d'utilisateur : ce sont quatre fichiers du
 * dépôt, lus à la compilation. Aucun contenu tiers ne traverse ce chemin.
 *
 * ⚠️ ET AUCUNE NOTE DE TRAVAIL NE DOIT S'Y TROUVER. Les documents ne portent
 * plus de `⚠️` : ce qui reste à trancher vit dans `docs/juridique/00-lisez-moi.md`,
 * qui n'est pas publié. Un test échoue si un avertissement réapparaît dans un
 * document publié — parce que le masquer au rendu reviendrait à cacher ce qu'on
 * sait, et l'afficher reviendrait à publier nos pense-bêtes.
 */

/**
 * Le rendu typographique, écrit une fois.
 *
 * Le système de la page d'accueil — papier, encre, filet — et non celui de
 * l'application : ces pages s'adressent à un visiteur qui vérifie à qui il a
 * affaire, pas à un utilisateur au travail.
 *
 * ⚠️ LES TABLEAUX DÉFILENT AU LIEU DE DÉBORDER. Un tableau de destinataires à
 * quatre colonnes ne tient pas dans 375 px, et le laisser dépasser casserait la
 * mise en page de toute la page. On l'enveloppe.
 */
const TYPOGRAPHIE = [
	'[&_h1]:font-serif [&_h1]:text-titre [&_h1]:leading-tight [&_h1]:font-medium [&_h1]:mb-cladd-xs',
	'[&_h2]:font-serif [&_h2]:text-intertitre [&_h2]:leading-snug [&_h2]:font-medium [&_h2]:mt-cladd-lg [&_h2]:mb-cladd-2xs',
	'[&_h3]:font-serif [&_h3]:text-cladd-lg [&_h3]:font-medium [&_h3]:mt-cladd-sm [&_h3]:mb-cladd-3xs',
	'[&_p]:text-cladd-md [&_p]:leading-relaxed [&_p]:mb-cladd-2xs [&_p]:text-plume-douce',
	'[&_li]:text-cladd-md [&_li]:leading-relaxed [&_li]:text-plume-douce [&_li]:mb-1.5',
	'[&_ul]:mb-cladd-2xs [&_ul]:pl-cladd-2xs [&_ul]:list-disc',
	'[&_ol]:mb-cladd-2xs [&_ol]:pl-cladd-2xs [&_ol]:list-decimal',
	'[&_strong]:font-medium [&_strong]:text-plume',
	'[&_em]:italic',
	'[&_a]:underline [&_a]:underline-offset-2 [&_a]:text-plume',
	'[&_hr]:my-cladd-md [&_hr]:border-trait-encre',
	'[&_blockquote]:border-l-2 [&_blockquote]:border-trait-encre [&_blockquote]:pl-cladd-2xs [&_blockquote]:my-cladd-2xs',
	'[&_blockquote_p]:text-cladd-sm [&_blockquote_p]:text-plume-claire',
	'[&_table]:w-full [&_table]:text-left [&_table]:my-cladd-2xs [&_table]:border-collapse',
	'[&_th]:text-cladd-sm [&_th]:font-medium [&_th]:align-top [&_th]:py-cladd-3xs [&_th]:pr-cladd-2xs [&_th]:border-b [&_th]:border-trait-encre',
	'[&_td]:text-cladd-sm [&_td]:align-top [&_td]:py-cladd-3xs [&_td]:pr-cladd-2xs [&_td]:border-b [&_td]:border-trait-encre [&_td]:text-plume-douce',
	'[&_code]:font-mono [&_code]:text-cladd-sm'
].join(' ');

export function DocumentLegal({ titre, markdown }: { titre: string; markdown: string }) {
	/*
	  `marked` est synchrone dans cette configuration, mais son type autorise une
	  promesse : on force ici, faute de quoi le rendu afficherait « [object
	  Promise] » — un échec silencieux sur une page opposable.
	*/
	const brut = marked.parse(markdown, { async: false, gfm: true }) as string;

	/*
	  ⚠️ CHAQUE TABLEAU EST ENVELOPPÉ DANS UN CONTENEUR QUI DÉFILE, et ce n'est
	  pas une précaution : mesuré au navigateur, le tableau des destinataires fait
	  728 px et DEUX tableaux débordaient à 375 px, entraînant toute la page dans
	  un défilement horizontal.

	  Le faire en CSS — `table { display: block }` — casse l'alignement des
	  colonnes dans certains navigateurs. L'envelopper à la main est laid et
	  fiable, et sur un tableau de durées de conservation la fiabilité gagne.
	*/
	const html = brut
		.replace(/<table>/g, '<div class="w-full overflow-x-auto"><table>')
		.replace(/<\/table>/g, '</table></div>');

	return (
		<div className="bg-papier text-plume">
			<Navbar />

			<main className="mx-auto w-full max-w-3xl px-cladd-2xs pt-cladd-2xl pb-cladd-xl">
				{/*
				  ⚠️ LA REMONTÉE EST EN HAUT, ET C'EST UNE RÈGLE D'ÉCRAN. Une page
				  légale s'atteint depuis le pied de page, souvent au milieu d'une
				  lecture : sans porte de sortie visible, le visiteur ferme l'onglet.
				*/}
				<Link
					to="/"
					className="mb-cladd-sm inline-block text-cladd-sm text-plume-claire underline underline-offset-2"
				>
					Retour à l’accueil
				</Link>

				{/* Le titre vient du Markdown lui-même ; `titre` sert à l'onglet et au lien. */}
				<article
					aria-label={titre}
					className={TYPOGRAPHIE}
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			</main>

			<Pied />
		</div>
	);
}

