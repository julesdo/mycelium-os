/**
 * D'OÙ VIENT UN CONTACT, DIT À LA PERSONNE (19/10/2026).
 *
 * La CNIL (fiche du 10/06/2026, article 14 du RGPD) demande de dire à la personne
 * démarchée d'où viennent ses coordonnées, au premier contact : l'appel comme l'e-mail.
 * La fiche porte la source dans « Trouvé où » ; ce module la met en phrase.
 *
 * ⚠️ UNE SOURCE ABSENTE N'EST JAMAIS INVENTÉE : elle rend `null`, et le script le dit
 * à l'appelant au lieu d'écrire « dans un annuaire » à sa place.
 */
export function sourceDuContact(trouveOu: string | undefined): string | null {
	const source = trouveOu?.trim();
	if (source === undefined || source === '') return null;
	if (/^annuaire des entreprises/i.test(source)) return 'dans l’annuaire des entreprises de l’État';
	if (/commande publique|\bDECP\b/i.test(source)) {
		return 'dans les données de la commande publique publiées par l’État';
	}
	return `par « ${source} »`;
}
