import { createFileRoute, redirect } from '@tanstack/react-router';

/** Le bilan d'un dépôt vit désormais dans le coffre, sur la fiche du document. */
export const Route = createFileRoute('/app/import-factures/$id')({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: '/app/coffre',
			search: { document: `IMPORT:${params.id}` },
			replace: true
		});
	}
});
