import { useEffect, useRef, useState } from 'react';

/**
 * L'APERÇU D'UN PDF, PAGE PAR PAGE, DANS L'APPLICATION (12/10/2026).
 *
 * ⚠️ PAS UN `<iframe>` : Safari sur iPhone n'y montre que la première page, sans
 * défilement, et le lecteur PDF du navigateur exécute ce que le document
 * contient. Ici, `unpdf` (pdf.js) DESSINE chaque page dans un canevas : aucun
 * script du document ne tourne, et le rendu est le même partout.
 *
 * ⚠️ CHARGÉ À LA DEMANDE (`lazy`, dans `coffre.tsx`) : pdf.js pèse plus d'un
 * mégaoctet, et il ne sert qu'à l'ouverture d'un document.
 *
 * Les pages se dessinent à la largeur de la colonne, à la densité de l'écran,
 * une après l'autre ; au-delà de vingt, la suite se télécharge.
 */

const PAGES_MONTREES = 20;

type Etat =
	| { readonly etat: 'LECTURE' }
	| { readonly etat: 'PRET'; readonly pages: number }
	| { readonly etat: 'ECHEC' };

export default function ApercuPdf({ octets }: { readonly octets: ArrayBuffer }) {
	const conteneur = useRef<HTMLDivElement>(null);
	const [etat, setEtat] = useState<Etat>({ etat: 'LECTURE' });

	useEffect(() => {
		let annule = false;
		const zone = conteneur.current;
		if (zone === null) return;

		void (async () => {
			try {
				const { getDocumentProxy } = await import('unpdf');
				// Une copie : pdf.js détache le tampon qu'on lui confie.
				const document = await getDocumentProxy(new Uint8Array(octets.slice(0)));
				if (annule) return;
				const total = document.numPages;
				setEtat({ etat: 'PRET', pages: total });
				const largeur = zone.clientWidth || 360;
				const densite = Math.min(window.devicePixelRatio || 1, 2);
				for (let numero = 1; numero <= Math.min(total, PAGES_MONTREES); numero++) {
					if (annule) return;
					const page = await document.getPage(numero);
					const brute = page.getViewport({ scale: 1 });
					const vue = page.getViewport({ scale: (largeur / brute.width) * densite });
					const canevas = window.document.createElement('canvas');
					canevas.width = Math.floor(vue.width);
					canevas.height = Math.floor(vue.height);
					canevas.style.width = '100%';
					canevas.setAttribute('role', 'img');
					canevas.setAttribute('aria-label', `Page ${numero} sur ${total}`);
					canevas.className = 'rounded-cladd-xl bg-white shadow-sm';
					const contexte = canevas.getContext('2d');
					if (contexte === null) continue;
					await page.render({ canvasContext: contexte, viewport: vue, canvas: canevas }).promise;
					if (annule) return;
					zone.appendChild(canevas);
				}
			} catch {
				if (!annule) setEtat({ etat: 'ECHEC' });
			}
		})();

		return () => {
			annule = true;
			zone.replaceChildren();
		};
	}, [octets]);

	return (
		<div className="flex flex-col gap-cladd-3xs">
			{etat.etat === 'PRET' ? (
				<p className="px-1 text-cladd-3xs text-cladd-fg-soft">
					{etat.pages} page{etat.pages > 1 ? 's' : ''}
					{etat.pages > PAGES_MONTREES ? ` · les ${PAGES_MONTREES} premières sont montrées` : ''}
				</p>
			) : null}
			{etat.etat === 'ECHEC' ? (
				<p className="verre-carte rounded-cladd-xl p-cladd-2xs text-cladd-xs leading-relaxed text-cladd-fg-soft">
					L’aperçu de ce PDF n’a pas pu se dessiner. Il se télécharge intact par le bouton en haut à
					droite.
				</p>
			) : null}
			<div ref={conteneur} className="flex flex-col gap-cladd-3xs" />
			{etat.etat === 'LECTURE' ? (
				<div className="aspect-[1/1.3] w-full animate-pulse rounded-cladd-xl bg-cladd-fg/[0.05]" />
			) : null}
		</div>
	);
}
