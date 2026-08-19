import { localizedHref } from '$lib/utils/i18n';
import GaugeIcon from '@lucide/svelte/icons/gauge';
import CheckCheckIcon from '@lucide/svelte/icons/check-check';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import SettingsIcon from '@lucide/svelte/icons/settings';
import Logo from '$lib/components/icons/logo.svelte';
import { LEGAL_CONFIG } from '$lib/config/legal';
import type { SidebarConfig } from '../types';

interface PageState {
	pathname: string;
	lang?: string;
	/** Nombre de libellés en attente, affiché en pastille sur « À confirmer ». */
	aConfirmer?: number;
}

/**
 * La navigation de la cantine, seul espace de l'application.
 *
 * Trois entrées, plus les paramètres détachés. Chacune correspond à un moment
 * réel du travail : je regarde où j'en suis, je tranche ce qui bloque, je
 * dépose. C'est aussi le nombre qui tient sur une barre de pouce en portrait
 * sans devenir illisible.
 */
export function getAppSidebarConfig(pageState: PageState): SidebarConfig {
	const { pathname, lang, aConfirmer = 0 } = pageState;
	const actif = (segment: string) =>
		pathname.startsWith(`/${lang}/app${segment}`) || pathname.startsWith(`/app${segment}`);

	return {
		header: {
			icon: Logo,
			title: LEGAL_CONFIG.brandName,
			href: localizedHref('/')
		},
		navItems: [
			{
				translationKey: 'app.sidebar.pilotage',
				shortLabel: 'Pilotage',
				url: localizedHref('/app'),
				icon: GaugeIcon,
				isActive: /^(\/[a-z]{2})?\/app\/?$/.test(pathname)
			},
			{
				translationKey: 'app.sidebar.confirmer',
				shortLabel: 'À confirmer',
				url: localizedHref('/app/confirmer'),
				icon: CheckCheckIcon,
				isActive: actif('/confirmer'),
				// À zéro, la pastille ne s'affiche pas, mais l'entrée reste : un
				// gérant doit pouvoir vérifier qu'il n'a rien oublié.
				badge: aConfirmer > 0 ? aConfirmer : undefined
			},
			{
				translationKey: 'app.sidebar.invoices',
				shortLabel: 'Factures',
				url: localizedHref('/app/factures'),
				icon: FileTextIcon,
				isActive: actif('/factures')
			},
			{
				translationKey: 'admin.sidebar.settings',
				shortLabel: 'Paramètres',
				url: localizedHref('/app/parametres'),
				icon: SettingsIcon,
				isActive: actif('/parametres')
			}
		]
	};
}
