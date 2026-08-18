/**
 * Supported languages configuration for i18n.
 * EGalim est une loi française : l'interface est monolingue.
 */

export interface Language {
	/** Language code (ISO 639-1) */
	code: string;
	/** Display name in the language itself (native name) */
	name: string;
	/** Display name in English */
	nameEn: string;
	/** Flag emoji */
	flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
	{
		code: 'fr',
		name: 'Français',
		nameEn: 'French',
		flag: '🇫🇷'
	}
];

/** Default language code */
export const DEFAULT_LANGUAGE = 'fr';

/** Map of language codes for quick lookup */
export const LANGUAGE_CODES = new Set(SUPPORTED_LANGUAGES.map((lang) => lang.code));

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(code: string | undefined): code is string {
	return code !== undefined && LANGUAGE_CODES.has(code);
}

/**
 * Get language by code or return default.
 * Le paramètre est conservé pour la compatibilité des appelants ; une seule
 * langue étant supportée, il est ignoré.
 */
export function getLanguage(_code?: string): Language {
	return SUPPORTED_LANGUAGES[0]!;
}
