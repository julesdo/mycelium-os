import { createFileRoute } from '@tanstack/react-router';
import { DocumentLegal } from '../marketing';
import markdown from '../../docs/juridique/04-accord-de-sous-traitance.md?raw';

/**
 * Accord de sous-traitance.
 *
 * ⚠️ LE TEXTE N'EST PAS ICI, ET C'EST VOULU. Il vit dans
 * `docs/juridique/04-accord-de-sous-traitance.md`, importé tel quel. Le recopier en JSX
 * aurait créé deux versions d'un même texte opposable, qui auraient divergé.
 */
export const Route = createFileRoute('/accord-de-sous-traitance')({
	component: Page,
	head: () => ({ meta: [{ title: 'Accord de sous-traitance · Letikette' }] })
});

function Page() {
	return <DocumentLegal titre="Accord de sous-traitance" markdown={markdown} />;
}
