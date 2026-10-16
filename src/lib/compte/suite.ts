/**
 * OÙ REVENIR APRÈS LA CONNEXION (16/10/2026) — l'invitation dans l'équipe mène à
 * `/connexion?suite=/admin`. ⚠️ JAMAIS UNE REDIRECTION OUVERTE : seuls l'admin et
 * l'application sont des retours permis ; une adresse d'un autre site, ou qui
 * commence par `//`, est ignorée.
 */
export function suiteSure(valeur: unknown): string | undefined {
	if (typeof valeur !== 'string') return undefined;
	return /^\/(admin|app)(\/[\w\-/.$]*)?$/.test(valeur) ? valeur : undefined;
}
