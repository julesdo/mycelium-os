/**
 * LE SITE CONTRE SA MAQUETTE, AU PIXEL (28/10/2026).
 *
 * Ouvre la maquette V26 (`docs/superpowers/maquettes/2026-10-28-site/index.html`) et la page du
 * site côte à côte, aux largeurs du projet, mouvement réduit et animations arrêtées, et compare
 * chaque section élément par élément : même taille, puis la part des pixels qui diffèrent.
 * Une section n'est finie que sous le seuil (0,5 %), hors des chiffres que le site lit à leur
 * source et que la maquette avait tapés.
 *
 *   node --experimental-strip-types scripts/comparer-maquette.ts [--site <url>] [--sections appel,pied]
 *        [--largeurs 375,1440] [--sortie <dossier>]
 *
 * `--sortie` écrit, pour chaque écart, les deux captures et une image des pixels qui diffèrent
 * (en rouge sur la maquette pâlie). Playwright se bloque sous Bun sur Windows : passer par node.
 *
 * Les éléments fixes (la barre, l'étiquette « Maquette ») sont masqués des deux côtés pendant
 * la capture d'une section : une capture d'élément prend aussi ce qui flotte par-dessus.
 *
 * ⚠️ CHAQUE SECTION EST ISOLÉE EN HAUT DE PAGE, DES DEUX CÔTÉS. Sans cela, elle tombe à une
 * fraction de pixel différente dans chaque page (la maquette a tout le reste au-dessus), et tous
 * ses contours se décalent d'un pixel : un écart de mesure, pas de rendu.
 *
 * ⚠️ PLUME SE COMPARE PAR SA PLACE, PAS PAR SON TRAIT. Le site dessine Plume avec le composant
 * du produit, et le produit a ses propres poses à l'arrêt (en mouvement réduit, il fait la fête
 * les bras levés, pour rester lisible) ; la maquette en avait une copie plus ancienne. Les
 * pixels des `svg.plume` sont donc exclus des deux côtés, mais chaque Plume doit être au même
 * endroit et à la même taille, au pixel près.
 */
import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAQUETTE = pathToFileURL(
	resolve(
		import.meta.dirname,
		'..',
		'docs',
		'superpowers',
		'maquettes',
		'2026-10-28-site',
		'index.html'
	)
).href;

function option(nom: string): string | undefined {
	const i = process.argv.indexOf(`--${nom}`);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

const SITE = option('site') ?? 'http://localhost:20982/nouveau-site';
const LARGEURS = (option('largeurs') ?? '375,768,1024,1280,1440').split(',').map(Number);
const SORTIE = option('sortie');
const SEUIL = 0.5;

/** Les sections, dans l'ordre de la page : le nom affiché, puis le sélecteur commun aux deux. */
const SECTIONS: Readonly<Record<string, string>> = {
	barre: '.barre',
	tete: '.tete',
	preuves: '.preuves',
	loi: '#loi',
	plume: '#plume',
	tout: '#tout',
	metiers: '#metiers',
	securite: '#securite',
	tarifs: '#tarifs',
	blog: '#blog',
	appel: '#appel',
	pied: '.pied'
};
const DEMANDEES = option('sections')?.split(',') ?? Object.keys(SECTIONS);

/**
 * CE QUI VIT SE COMPARE À LA MÊME HEURE. Le téléphone de l'en-tête suit sa propre horloge : en
 * mouvement réduit, la visite ne joue pas, mais les trois tâches de Plume arrivent quand même
 * (dépôt, virement, dossier), jusqu'à 20 s après que le téléphone est vu. On attend qu'elles soient
 * passées des deux côtés : l'état d'arrivée est le même.
 */
const ATTENTES: Readonly<Record<string, number>> = { tete: 24_000 };

/** Masque ce qui flotte, et toutes les sections sauf celle qu'on capture. */
function isoler(selecteur: string): string {
	const autres = Object.values(SECTIONS).filter((s) => s !== selecteur && s !== '.barre');
	return [
		`.etiquette-maquette { display: none !important; }`,
		selecteur === '.barre' ? '' : `.barre { visibility: hidden !important; }`,
		`${autres.join(', ')} { display: none !important; }`
	].join(' ');
}

async function ouvrir(navigateur: Browser, url: string, largeur: number): Promise<Page> {
	const page = await navigateur.newPage({
		viewport: { width: largeur, height: 900 },
		deviceScaleFactor: 1,
		reducedMotion: 'reduce',
		hasTouch: largeur < 768
	});
	await page.goto(url, { waitUntil: 'load' });
	// Sans doctype, la maquette ouverte seule se rendrait en mode de compatibilité, loin de la
	// version publiée : on refuse de comparer.
	if ((await page.evaluate(() => document.compatMode)) !== 'CSS1Compat')
		throw new Error(`${url} n'est pas en mode standard`);
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(1200);
	// Un passage sur toute la page, comme un visiteur : chaque paysage se peint quand on
	// l'approche, et la maquette ne repeint pas un canevas qu'on lui a demandé caché.
	await page.evaluate(async (selecteurs) => {
		for (const s of selecteurs) {
			const el = document.querySelector(s);
			if (!el || s === '.barre') continue;
			el.scrollIntoView({ block: 'start' });
			await new Promise((ok) => setTimeout(ok, 150));
		}
		window.scrollTo(0, 0);
	}, Object.values(SECTIONS));
	await page.waitForTimeout(600);
	return page;
}

/**
 * LA BARRE SE COMPARE ÉTAT PAR ÉTAT. Elle prend le ton de la section qui passe dessous ; isolée,
 * elle n'a rien dessous, et chaque page la laisserait dans le ton qu'elle avait au chargement.
 * On pose donc les quatre états à l'identique des deux côtés : sombre ou clair, au repos ou en
 * défilement (le verre).
 */
const ETATS_DE_LA_BARRE = [
	['sombre', 'non'],
	['clair', 'non'],
	['clair', 'oui'],
	['sombre', 'oui']
] as const;

async function poserLaBarre(page: Page, ton: string, defile: string): Promise<void> {
	await page.evaluate(
		([t, d]) => {
			const b = document.querySelector('[data-barre]');
			b?.setAttribute('data-ton', t);
			b?.setAttribute('data-defile', d);
		},
		[ton, defile] as const
	);
	await page.waitForTimeout(450);
}

type Boite = { x: number; y: number; w: number; h: number };
type Capture = { image: Buffer; plumes: Boite[] };

async function capturer(
	page: Page,
	selecteur: string,
	avant?: (page: Page) => Promise<void>
): Promise<Capture | null> {
	const el = page.locator(selecteur).first();
	if ((await el.count()) === 0) return null;
	const style = await page.addStyleTag({ content: isoler(selecteur) });
	await el.scrollIntoViewIfNeeded();
	await page.waitForTimeout(
		700 + (ATTENTES[Object.keys(SECTIONS).find((k) => SECTIONS[k] === selecteur) ?? ''] ?? 0)
	);
	// Après l'isolement : la page raccourcie a pu défiler, et la barre relire son ton.
	if (avant) await avant(page);
	const image = await el.screenshot({ animations: 'disabled' });
	const plumes = await el.evaluate((s) => {
		const base = s.getBoundingClientRect();
		return Array.from(s.querySelectorAll('svg.plume'))
			.map((p) => {
				const r = p.getBoundingClientRect();
				return {
					x: Math.round(r.left - base.left),
					y: Math.round(r.top - base.top),
					w: Math.round(r.width),
					h: Math.round(r.height)
				};
			})
			.filter((b) => b.w > 0 && b.h > 0);
	});
	await style.evaluate((s) => s.remove());
	return { image, plumes };
}

/** Les Plume qui ne sont pas à la même place des deux côtés (à un pixel près). */
function plumesDeplaces(a: Boite[], b: Boite[]): number {
	let n = Math.abs(a.length - b.length);
	for (const p of a)
		if (
			!b.some(
				(q) =>
					Math.abs(p.x - q.x) <= 1 &&
					Math.abs(p.y - q.y) <= 1 &&
					Math.abs(p.w - q.w) <= 1 &&
					Math.abs(p.h - q.h) <= 1
			)
		)
			n++;
	return n;
}

type Ecart = { largeur: number; hauteur: number; differents: number; total: number };

async function comparer(
	a: Buffer,
	b: Buffer,
	exclues: Boite[]
): Promise<{ ecart: Ecart; image: Buffer }> {
	const exclu = (x: number, y: number) =>
		exclues.some((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
	const [ia, ib] = await Promise.all([
		sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
		sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
	]);
	const w = Math.min(ia.info.width, ib.info.width),
		h = Math.min(ia.info.height, ib.info.height);
	const sortie = Buffer.alloc(w * h * 4);
	let differents = 0;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const pa = (y * ia.info.width + x) * 4,
				pb = (y * ib.info.width + x) * 4,
				po = (y * w + x) * 4;
			const d =
				Math.abs(ia.data[pa] - ib.data[pb]) +
				Math.abs(ia.data[pa + 1] - ib.data[pb + 1]) +
				Math.abs(ia.data[pa + 2] - ib.data[pb + 2]);
			if (exclu(x, y)) {
				sortie.set([200, 220, 255, 255], po);
			} else if (d > 24) {
				differents++;
				sortie.set([235, 30, 60, 255], po);
			} else {
				const gris = Math.round((ia.data[pa] + ia.data[pa + 1] + ia.data[pa + 2]) / 3);
				const pale = Math.round(gris * 0.25 + 255 * 0.75);
				sortie.set([pale, pale, pale, 255], po);
			}
		}
	// Ce qui dépasse d'un côté compte comme différent : une section plus haute est un écart.
	const total = Math.max(ia.info.width, ib.info.width) * Math.max(ia.info.height, ib.info.height);
	differents += total - w * h;
	const image = await sharp(sortie, { raw: { width: w, height: h, channels: 4 } })
		.png()
		.toBuffer();
	return {
		ecart: {
			largeur: ib.info.width - ia.info.width,
			hauteur: ib.info.height - ia.info.height,
			differents,
			total
		},
		image
	};
}

const navigateur = await chromium.launch();
let echecs = 0;
for (const largeur of LARGEURS) {
	const [maquette, site] = await Promise.all([
		ouvrir(navigateur, MAQUETTE, largeur),
		ouvrir(navigateur, SITE, largeur)
	]);
	for (const [nom, selecteur, avant] of DEMANDEES.flatMap((n) => {
		const s = SECTIONS[n];
		if (!s) throw new Error(`Section inconnue : ${n}`);
		if (n !== 'barre') return [[n, s, undefined] as const];
		return ETATS_DE_LA_BARRE.map(
			([ton, defile]) =>
				[`barre:${ton}/${defile}`, s, (p: Page) => poserLaBarre(p, ton, defile)] as const
		);
	})) {
		const [a, b] = await Promise.all([
			capturer(maquette, selecteur, avant),
			capturer(site, selecteur, avant)
		]);
		if (!a) throw new Error(`La maquette n'a pas de ${selecteur}`);
		if (!b) {
			if (option('sections')) {
				echecs++;
				console.log(`${String(largeur).padStart(4)} px  ${nom.padEnd(17)} absente du site`);
			}
			continue;
		}
		const { ecart, image } = await comparer(a.image, b.image, [...a.plumes, ...b.plumes]);
		const part = (100 * ecart.differents) / ecart.total;
		const deplaces = plumesDeplaces(a.plumes, b.plumes);
		const taille =
			ecart.largeur || ecart.hauteur
				? `  taille ${ecart.largeur >= 0 ? '+' : ''}${ecart.largeur} × ${ecart.hauteur >= 0 ? '+' : ''}${ecart.hauteur} px`
				: '';
		const ok = part < SEUIL && !ecart.largeur && !ecart.hauteur && !deplaces;
		if (!ok) echecs++;
		console.log(
			`${String(largeur).padStart(4)} px  ${nom.padEnd(17)} ${part.toFixed(2).padStart(6)} %${taille}${deplaces ? `  ${deplaces} Plume déplacé(s)` : ''}${ok ? '' : '  ✗'}`
		);
		if (SORTIE && (!ok || process.argv.includes('--toujours'))) {
			mkdirSync(SORTIE, { recursive: true });
			const fichier = nom.replace(/[:/]/g, '-');
			writeFileSync(join(SORTIE, `${fichier}-${largeur}-maquette.png`), a.image);
			writeFileSync(join(SORTIE, `${fichier}-${largeur}-site.png`), b.image);
			writeFileSync(join(SORTIE, `${fichier}-${largeur}-ecart.png`), image);
		}
	}
	await Promise.all([maquette.close(), site.close()]);
}
await navigateur.close();
console.log(echecs ? `${echecs} écart(s) au-dessus de ${SEUIL} %.` : `Tout est sous ${SEUIL} %.`);
process.exit(echecs ? 1 : 0);
