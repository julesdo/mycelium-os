/**
 * LES IMAGES DES E-MAILS, DÉRIVÉES DES DESSINS DU PRODUIT (15/10/2026).
 *
 *     bun scripts/generer-images-emails.tsx
 *
 * Une messagerie n'exécute ni SVG ni CSS : elle affiche des images hébergées. Les
 * deux images des e-mails se dérivent donc des MÊMES sources que le produit, et
 * se régénèrent d'une commande quand l'une d'elles change :
 *
 *   public/emails/marque.png   La marque (`public/favicon.svg`), 96 px pour un
 *                              affichage à 32 px sur un écran à forte densité.
 *   public/emails/plume.png    Plume, content (`src/ui/plume.tsx`), 288 px pour
 *                              un affichage à 96 px.
 *
 * ⚠️ LES COULEURS DE PLUME VIVENT EN VARIABLES CSS (`app.css`, `.light .plume`),
 * qu'aucun moteur de rendu d'image ne lit. Elles sont recopiées ici, résolues ; si
 * Plume change de couleur dans l'app, ce tableau change avec lui.
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { Plume } from '../src/ui/plume';

const RACINE = join(import.meta.dirname, '..');
const SORTIE = join(RACINE, 'public', 'emails');
mkdirSync(SORTIE, { recursive: true });

function rendre(svg: string, largeur: number): Buffer {
	return new Resvg(svg, { fitTo: { mode: 'width', value: largeur } }).render().asPng();
}

// ── La marque ───────────────────────────────────────────────────────────────
const marque = readFileSync(join(RACINE, 'public', 'favicon.svg'), 'utf8');
writeFileSync(join(SORTIE, 'marque.png'), rendre(marque, 96));

// ── Plume ───────────────────────────────────────────────────────────────────
/** `.light .plume` dans `app.css`, et les deux teintes du relief qu'il en tire. */
const COULEURS_DE_PLUME = `
.plume-corps { fill: #1f43ad; }
.plume-corps-clair { stop-color: #627bc6; }
.plume-corps-milieu { stop-color: #1f43ad; }
.plume-corps-sombre { stop-color: #173280; }
.plume-bras { fill: #183692; }
.plume-ventre { fill: rgba(255, 255, 255, 0.1); }
.plume-reflet { fill: rgba(255, 255, 255, 0.3); }
.plume-barbe { fill: #fffdf7; stroke: #1f43ad; stroke-width: 1.1; stroke-linejoin: round; }
.plume-tuyau { stroke: #3a5cc4; }
.plume-encre { fill: #0c1430; }
.plume-trait { stroke: #0c1430; stroke-linecap: round; }
.plume-joue { fill: rgba(255, 160, 196, 0.55); }
.plume-ombre { fill: rgba(20, 30, 70, 0.16); }
.plume-langue { fill: #f2789f; }
`;

const plume = renderToStaticMarkup(<Plume humeur="content" taille={64} decoratif sol />)
	// La plume de sa tête dépasse du carré (le produit la laisse déborder) : on
	// élargit le cadre pour qu'elle reste entière sur l'image.
	.replace('viewBox="0 0 64 64"', 'viewBox="-6 -10 76 76"')
	.replace('width="64"', 'width="76"')
	.replace('height="64"', 'height="76"')
	.replace(
		/^<svg([^>]*)>/,
		`<svg xmlns="http://www.w3.org/2000/svg"$1><style>${COULEURS_DE_PLUME}</style>`
	);

writeFileSync(join(SORTIE, 'plume.png'), rendre(plume, 288));

console.log('Images des e-mails écrites dans public/emails/.');
