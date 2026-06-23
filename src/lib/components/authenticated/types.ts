import type { Component } from 'svelte';
import type { IconProps } from '@lucide/svelte';

// Lucide icon component type
type LucideIcon = Component<IconProps, object, ''>;

export interface NavSubItem {
	id: string;
	label: string;
	url: string;
	isActive?: boolean;
	/** Timestamp for relative time display (e.g. "3d ago") */
	timestamp?: number;
}

export interface NavItem {
	translationKey: string;
	/** Navigates to this path (renders an anchor). Omit when using `onSelect`. */
	url?: string;
	/**
	 * Runs an action instead of navigating (renders a `<button type="button">`).
	 * Used when the item has no `url`, e.g. opening a dialog or command palette.
	 */
	onSelect?: () => void;
	icon?: LucideIcon;
	isActive?: boolean;
	badge?: number;
	/** When true, item has a collapsible toggle with sub-items */
	collapsible?: boolean;
	/** Sub-items shown under collapsible toggle */
	subItems?: NavSubItem[];
	/** Keyboard shortcut keys (e.g. ["⌘", "⇧", "1"]) */
	kbd?: string[];
	/** When true, clicking the main button does nothing (e.g. already on empty thread) */
	disableNav?: boolean;
	/** When true, renders a section separator instead of a nav item */
	divider?: boolean;
	/** Label displayed above the section (used with divider: true) */
	sectionLabel?: string;
	/** Short label for compact views (e.g. bottom nav bar) */
	shortLabel?: string;
}

export interface HeaderDropdownItem {
	translationKey: string;
	url: string;
	icon: LucideIcon;
}

export type HeaderConfig = {
	icon: LucideIcon;
	href: string;
	dropdownItems?: HeaderDropdownItem[];
} & ({ title: string; titleKey?: never } | { titleKey: string; title?: never });

export interface FooterLink {
	translationKey: string;
	url: string;
	icon: LucideIcon;
	condition?: boolean;
	/** Keyboard shortcut keys (e.g. ["⌘", "."]) */
	kbd?: string[];
}

/**
 * A topbar nav group: either a single standalone link (items.length === 1)
 * or a dropdown cluster (items.length > 1) with a shared label trigger.
 */
export interface TopbarNavGroup {
	/** Trigger label shown in the topbar pill */
	label: string;
	icon?: LucideIcon;
	/** Items inside the dropdown. If only one item, renders as a direct link. */
	items: NavItem[];
}

export interface SidebarConfig {
	header: HeaderConfig;
	navItems: NavItem[];
	/** Groups for the compact topbar nav. Sidebar uses navItems instead. */
	topbarGroups?: TopbarNavGroup[];
	footerLinks?: FooterLink[];
}

export interface User {
	name: string;
	email: string;
	image?: string;
	role?: string;
}
