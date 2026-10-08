/**
 * LA RELANCE QUE LE PILOTE ENVOIE, EN HTML — la lettre du créancier, et rien d'autre.
 *
 * ⚠️ PAS LA COQUILLE DES AUTRES COURRIELS (`disposition.ts`). Celle-là porte la
 * marque du produit ; celle-ci part chez le CLIENT du gérant, à son nom. C'est la
 * quatrième surface qui part vers un tiers, et elle tient la même règle que les
 * trois autres : elle ne nomme pas le logiciel, ne menace d'aucune procédure, et
 * ne fait rien remonter du débiteur (aucun pixel de suivi, aucun lien traqué).
 *
 * ⚠️ LE TEXTE EST CELUI DE LA LETTRE, MOT POUR MOT. Il vient des gabarits
 * (`relance.ts`, `gabarits/`), que leurs propres tests balaient ; ce fichier ne
 * fait que le mettre en paragraphes.
 */

function echapper(texte: string): string {
	return texte
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function relanceHtml(corps: string): string {
	const paragraphes = corps
		.split(/\n{2,}/)
		.map((bloc) => `<p style="margin:0 0 16px">${echapper(bloc).replace(/\n/g, '<br>')}</p>`)
		.join('');
	return (
		'<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#ffffff">' +
		'<div style="max-width:600px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;' +
		'font-size:15px;line-height:1.55;color:#1b1f24">' +
		paragraphes +
		'</div></body></html>'
	);
}
