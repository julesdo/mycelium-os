import { createFileRoute } from '@tanstack/react-router';
import { DocumentLegal } from '../marketing';
import markdown from '../../docs/juridique/01-mentions-legales.md?raw';

/**
 * Mentions légales.
 *
 * ⚠️ LE TEXTE N'EST PAS ICI, ET C'EST VOULU. Il vit dans
 * `docs/juridique/01-mentions-legales.md`, importé tel quel. Le recopier en JSX
 * aurait créé deux versions d'un même texte opposable, qui auraient divergé.
 */
export const Route = createFileRoute('/mentions-legales')({
	component: Page,
	head: () => ({ meta: [{ title: 'Mentions légales · Letikette' }] })
});

function Page() {
	return <DocumentLegal titre="Mentions légales" markdown={markdown} />;
}
