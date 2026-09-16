import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { Providers } from '../app/providers';
import { AMORCE_THEME } from '../app/use-theme';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1, viewport-fit=cover'
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
			{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
			{ rel: 'icon', href: '/favicon.png', sizes: '48x48', type: 'image/png' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
			{ rel: 'manifest', href: '/manifest.webmanifest' }
		]
	}),
	component: Document
});

function Document() {
	return (
		// `lang="fr"` en dur : l'interface est en français uniquement, EGalim est
		// une loi française. Il n'y a ni préfixe de route, ni couche i18n.
		// `suppressHydrationWarning` : l'amorce ci-dessous pose une classe sur cet
		// élément AVANT l'hydratation, et React signalerait sinon l'attribut en
		// trop. C'est le seul endroit du produit où le DOM précède React.
		<html lang="fr" suppressHydrationWarning>
			<head>
				{/*
				  ⚠️ AVANT `HeadContent`, ET AVANT TOUT AFFICHAGE. Cette ligne résout le
				  thème — préférence enregistrée, sinon réglage du système — et pose la
				  classe sur la racine. Sans elle, « Automatique » fait clignoter la page
				  du sombre au clair à chaque ouverture. Son contenu vit dans
				  `app/use-theme.ts`, avec la clé et la requête média qu'elle lit.
				*/}
				<script dangerouslySetInnerHTML={{ __html: AMORCE_THEME }} />
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
