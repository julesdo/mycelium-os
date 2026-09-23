import { createFileRoute } from '@tanstack/react-router';
import { DocumentLegal } from '../marketing';
import markdown from '../../docs/juridique/02-conditions-generales.md?raw';

/**
 * Conditions générales.
 *
 * ⚠️ LE TEXTE N'EST PAS ICI, ET C'EST VOULU. Il vit dans
 * `docs/juridique/02-conditions-generales.md`, importé tel quel. Le recopier en JSX
 * aurait créé deux versions d'un même texte opposable, qui auraient divergé.
 */
export const Route = createFileRoute('/conditions-generales')({
	component: Page,
	head: () => ({ meta: [{ title: 'Conditions générales · Letikette' }] })
});

function Page() {
	return <DocumentLegal titre="Conditions générales" markdown={markdown} />;
}
