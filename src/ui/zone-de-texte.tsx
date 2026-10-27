import { useId, useLayoutEffect, useRef, type ComponentProps } from 'react';
import { Textarea } from '@cladd-ui/react';

/**
 * UN CHAMP DE PLUSIEURS LIGNES, NOMMÉ (audit des parcours Pro du 27/10/2026).
 *
 * Le « Textarea » de Cladd écrit dans un `contenteditable` qui ne porte ni rôle, ni nom,
 * ni l'indication qu'il prend plusieurs lignes ; son texte indicatif est une couche à
 * part, que rien ne relie au champ. Le champ où l'on parle à Plume n'était donc annoncé
 * par aucun lecteur d'écran, et un robot de saisie ne le reconnaissait pas comme un
 * champ. On ne forke pas le composant : on pose sur sa zone éditable ce qui lui manque.
 *
 * ⚠️ \`nom\` EST OBLIGATOIRE : un champ sans nom est un champ qu'on ne trouve pas.
 * \`aide\` dit comment il se comporte (« Entrée pour envoyer… »), lue après le nom.
 * Un test refuse tout \`<Textarea\` de Cladd hors de ce fichier.
 */
export function ZoneDeTexte({
	nom,
	aide,
	...props
}: ComponentProps<typeof Textarea> & {
	/** Ce que le lecteur d'écran annonce : « Votre message à Plume ». */
	readonly nom: string;
	/** Comment le champ se comporte, lu après son nom. */
	readonly aide?: string;
}) {
	const enveloppe = useRef<HTMLDivElement>(null);
	const idAide = useId();
	const { placeholder, disabled, readOnly } = props;

	useLayoutEffect(() => {
		const champ = enveloppe.current?.querySelector<HTMLElement>('[data-part="control"]');
		if (champ === null || champ === undefined) return;
		champ.setAttribute('role', 'textbox');
		champ.setAttribute('aria-multiline', 'true');
		champ.setAttribute('aria-label', nom);
		const attributs: [string, string | undefined][] = [
			['aria-placeholder', placeholder],
			['aria-describedby', aide === undefined ? undefined : idAide],
			['aria-disabled', disabled === true ? 'true' : undefined],
			['aria-readonly', readOnly === true ? 'true' : undefined]
		];
		for (const [attribut, valeur] of attributs) {
			if (valeur === undefined) champ.removeAttribute(attribut);
			else champ.setAttribute(attribut, valeur);
		}
	}, [nom, aide, idAide, placeholder, disabled, readOnly]);

	return (
		<>
			<Textarea {...props} ref={enveloppe} />
			{aide === undefined ? null : (
				<span id={idAide} className="sr-only">
					{aide}
				</span>
			)}
		</>
	);
}
