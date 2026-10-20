import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
	useRouterState
} from '@tanstack/react-router';
import { Providers } from '../app/providers';
import { AMORCE_THEME } from '../app/use-theme';
import { FOND_DU_THEME } from '../ui/fond-du-theme';
import { AMORCE_INSTALLATION } from '../app/installation';
import { AMORCE_SOURCE } from '../app/source-visite';
import { AMORCE_ANALYTIQUE, ATTRIBUTS_UMAMI, SCRIPT_UMAMI } from '../app/analytique';
import appCss from '../styles/app.css?url';
// La police du corps, en latin : la même adresse que celle que le CSS déclare.
import policeDuCorps from '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{
				name: 'viewport',
				// `interactive-widget=resizes-content` : sur Android, le clavier réduit la
				// page au lieu de la recouvrir, comme sur iOS ; un compositeur collé en bas
				// reste au-dessus du clavier. Jamais `user-scalable=no` ni `maximum-scale` :
				// le zoom est un droit, et la page zoomait au focus parce qu'un champ
				// était sous 16 px — ce qui se corrige dans la feuille de style.
				content:
					'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content'
			},
			{ title: 'Letikette' }
		],
		// L'ICÔNE D'ONGLET ÉTAIT DÉCLARÉE ET N'EXISTAIT PAS. Ces liens pointaient
		// depuis des semaines vers trois fichiers absents de `public/` : les trois
		// répondaient 404 en production et l'onglet restait vierge. Une déclaration
		// sans fichier est pire que pas de déclaration — elle fait croire que
		// c'est réglé.
		//
		// Les quatre existent maintenant, et ils se régénèrent depuis un seul
		// dessin : `bun scripts/generer-icones.ts`.
		//
		// L'ORDRE COMPTE. Le SVG passe en premier pour les navigateurs qui le
		// comprennent — une icône vectorielle reste nette sur un écran à forte
		// densité, là où un PNG de 48 px bave. Le PNG suit en repli.
		links: [
			{ rel: 'stylesheet', href: appCss },
			/*
			  ⚠️ LA POLICE DU CORPS PART AVEC LA PAGE (09/10/2026). Déclarée dans le CSS,
			  elle n'était découverte qu'après lui (166 ko à télécharger et à lire) : le
			  texte s'affichait d'abord dans la police du système, puis sautait. Le
			  latin seul, le seul qu'un lecteur français télécharge.
			*/
			{
				rel: 'preload',
				href: policeDuCorps,
				as: 'font',
				type: 'font/woff2',
				crossOrigin: 'anonymous'
			},
			{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
			{ rel: 'icon', href: '/favicon.png', sizes: '48x48', type: 'image/png' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
			{ rel: 'manifest', href: '/manifest.webmanifest' }
		]
	}),
	component: Document
});

function Document() {
	/*
	  ⚠️ PAS DE MESURE SUR LA PAGE OÙ LE CLIENT PAIE. Celui qui l'ouvre est le débiteur
	  de nos clients : rien de lui ne part chez un tiers, pas même la demande du script
	  (voir `app/analytique.ts`).
	*/
	// Ni sur la page de désinscription d'un prospect, ni sur la confirmation de la liste
	// d'attente : leur adresse porte un jeton.
	const pageDuClient = useRouterState({
		select: (etat) =>
			etat.location.pathname.startsWith('/p/') ||
			etat.location.pathname.startsWith('/desinscription/') ||
			etat.location.pathname.startsWith('/attente/')
	});
	return (
		// `lang="fr"` en dur : l'interface est en français uniquement, EGalim est
		// une loi française. Il n'y a ni préfixe de route, ni couche i18n.
		// `suppressHydrationWarning` : l'amorce ci-dessous pose une classe sur cet
		// élément AVANT l'hydratation, et React signalerait sinon l'attribut en
		// trop. C'est le seul endroit du produit où le DOM précède React.
		<html lang="fr" suppressHydrationWarning>
			<head>
				{/*
				  LA COULEUR DE LA BARRE D'ÉTAT ET DE LA BARRE DU NAVIGATEUR, une par thème
				  du système (20/10/2026) : c'est celle du fond de la page, pas celle de la
				  marque. Écrites ici et non dans `head()` : le routeur ne garde qu'une
				  balise par nom, et il en faut deux. Un thème choisi à la main les
				  accorde toutes les deux (`teinterLaBarre`, dans `app/use-theme.ts`) ;
				  elles précèdent l'amorce, qui les retouche avant le premier affichage.
				*/}
				<meta
					name="theme-color"
					media="(prefers-color-scheme: light)"
					content={FOND_DU_THEME.light}
					suppressHydrationWarning
				/>
				<meta
					name="theme-color"
					media="(prefers-color-scheme: dark)"
					content={FOND_DU_THEME.dark}
					suppressHydrationWarning
				/>
				{/*
				  ⚠️ AVANT `HeadContent`, ET AVANT TOUT AFFICHAGE. Cette ligne résout le
				  thème — préférence enregistrée, sinon réglage du système — et pose la
				  classe sur la racine. Sans elle, « Automatique » fait clignoter la page
				  du sombre au clair à chaque ouverture. Son contenu vit dans
				  `app/use-theme.ts`, avec la clé et la requête média qu'elle lit.
				*/}
				<script dangerouslySetInnerHTML={{ __html: AMORCE_THEME }} />
				{/*
				  L'OFFRE D'INSTALLATION DE CHROME, RETENUE DÈS LA PREMIÈRE LIGNE : elle part
				  parfois avant que l'application ne soit chargée, et ne revient pas. Voir
				  `app/installation.ts`.
				*/}
				<script dangerouslySetInnerHTML={{ __html: AMORCE_INSTALLATION }} />
				{/*
				  LA SOURCE DE LA VISITE, gardée le temps de l'onglet pour la joindre à
				  l'inscription (`app/source-visite.ts`). Ni cookie ni identifiant.
				*/}
				<script dangerouslySetInnerHTML={{ __html: AMORCE_SOURCE }} />
				{/*
				  LA MESURE D'AUDIENCE (Umami, sans cookie). Le garde passe avant le traceur :
				  il retire les identifiants des adresses et coupe tout envoi sur les pages à
				  secret. Voir `app/analytique.ts`.
				*/}
				{pageDuClient ? null : (
					<>
						<script dangerouslySetInnerHTML={{ __html: AMORCE_ANALYTIQUE }} />
						<script defer src={SCRIPT_UMAMI} {...ATTRIBUTS_UMAMI} />
					</>
				)}
				<HeadContent />
			</head>
			<body>
				<div id="root">
					<Providers>
						<Outlet />
					</Providers>
				</div>
				<Scripts />
			</body>
		</html>
	);
}
