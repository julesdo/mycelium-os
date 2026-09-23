import { createFileRoute } from '@tanstack/react-router';
import { DocumentLegal } from '../marketing';
import markdown from '../../docs/juridique/03-politique-de-confidentialite.md?raw';

/**
 * Politique de confidentialité.
 *
 * ⚠️ LE TEXTE N'EST PAS ICI, ET C'EST VOULU. Il vit dans
 * `docs/juridique/03-politique-de-confidentialite.md`, importé tel quel. Le recopier en JSX
 * aurait créé deux versions d'un même texte opposable, qui auraient divergé.
 */
export const Route = createFileRoute('/politique-de-confidentialite')({
	component: Page,
	head: () => ({ meta: [{ title: 'Politique de confidentialité · Letikette' }] })
});

function Page() {
	return <DocumentLegal titre="Politique de confidentialité" markdown={markdown} />;
}
