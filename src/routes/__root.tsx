import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { Providers } from '../app/providers';
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
		// L'icône d'onglet n'était déclarée nulle part : le navigateur allait
		// chercher `/favicon.ico`, qui n'existe pas, et l'onglet restait vierge.
		// Le SVG passe en premier pour les navigateurs qui le comprennent, le PNG
		// reste en repli.
		links: [
			{ rel: 'stylesheet', href: appCss },
			{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
			{ rel: 'icon', href: '/favicon.png', sizes: '48x48', type: 'image/png' },
			{ rel: 'manifest', href: '/manifest.webmanifest' }
		]
	}),
	component: Document
});

function Document() {
	return (
		// `lang="fr"` en dur : l'interface est en français uniquement, EGalim est
		// une loi française. Il n'y a ni préfixe de route, ni couche i18n.
		<html lang="fr">
			<head>
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
