import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * L'ANCIENNE ADRESSE DU TROISIÈME ONGLET.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE NE LISTAIT PAS LES DOSSIERS, ELLE LISTAIT LES PROCÉDURES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'onglet s'appelait « Dossiers » et menait ici, où seuls les dossiers DÉJÀ
 * portés devant un tribunal s'affichaient : quatre sur dix-sept dans la
 * démonstration. Aucun écran du produit ne listait les dossiers (audit du
 * 29/09/2026, F7) ; `/app/dossiers` le fait, et le filtre « Le tribunal, si
 * besoin » y rend la même liste qu'ici.
 *
 * ⚠️ CE QUE CET ÉCRAN PORTAIT N'EST PAS PERDU. La frise d'une procédure, sa
 * prochaine échéance et ses angles morts vivent sur la page du dossier
 * (`SuiviProcedure`), là où on les cherche — c'est-à-dire sur le dossier dont
 * ils parlent, et non dans une liste à côté.
 *
 * ⚠️ `?p=<id>` SURVIT COMME PORTE D'ENTRÉE. Il désignait un dossier ; il mène
 * désormais à sa page, en `replace` pour ne pas empiler une étape morte.
 */
export const Route = createFileRoute('/app/procedures')({
	validateSearch: (recherche: Record<string, unknown>): { p?: string } => {
		const p = recherche.p;
		return typeof p === 'string' && p.length > 0 ? { p } : {};
	},
	beforeLoad: ({ search }) => {
		if (search.p !== undefined) {
			throw redirect({ to: '/app/dossier/$id', params: { id: search.p }, replace: true });
		}
		throw redirect({ to: '/app/dossiers', replace: true });
	}
});
