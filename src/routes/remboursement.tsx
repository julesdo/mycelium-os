import { createFileRoute } from '@tanstack/react-router';
import { DocumentLegal } from '../marketing';
import markdown from '../../docs/juridique/05-remboursement.md?raw';

/**
 * Politique de remboursement.
 *
 * ⚠️ LE TEXTE N'EST PAS ICI, ET C'EST VOULU. Il vit dans
 * `docs/juridique/05-remboursement.md`, importé tel quel. Le recopier en JSX
 * aurait créé deux versions d'un même texte opposable, qui auraient divergé.
 */
export const Route = createFileRoute('/remboursement')({
	component: Page,
	head: () => ({ meta: [{ title: 'Politique de remboursement · Letikette' }] })
});

function Page() {
	return <DocumentLegal titre="Politique de remboursement" markdown={markdown} />;
}
