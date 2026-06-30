/**
 * Generate logo PNGs and favicon from SVG source.
 *
 * Produces:
 *   static/logo-email.png  — logo on white bg for email clients
 *   static/favicon.svg     — SVG favicon for modern browsers
 *   static/favicon.png     — 32×32 PNG favicon for legacy browsers
 *   static/logo.png        — 192×192 PWA icon
 *
 * Usage: bun scripts/generate-logos.ts
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SVG_PATH = join(ROOT, 'static/logo.svg');
const OUT_EMAIL = join(ROOT, 'static/logo-email.png');
const OUT_FAVICON_SVG = join(ROOT, 'static/favicon.svg');
const OUT_FAVICON_PNG = join(ROOT, 'static/favicon.png');
const OUT_LOGO_PNG = join(ROOT, 'static/logo.png');

// ─── Email logo constants ──────────────────────────────────────────────────────
const SIZE = 112;
const PADDING = 16;
const CORNER_RADIUS = 20;

// ─── Icon logo constants ───────────────────────────────────────────────────────
// These are the 3 swoosh paths from logo.svg (the mask-defining paths = the shapes)
const LOGO_PATHS = [
	'M35.3725 30.541C33.6234 28.0769 30.2538 27.5307 27.8464 29.3209C25.4389 31.1112 24.9052 34.56 26.6544 37.0241L36.1539 50.4068C37.903 52.8709 41.2726 53.4171 43.68 51.6268C46.0875 49.8366 46.6211 46.3877 44.872 43.9236L35.3725 30.541Z',
	'M51.5629 30.541C49.8138 28.0769 46.4443 27.5307 44.0368 29.3209C41.6294 31.1112 41.0957 34.56 42.8448 37.0241L52.3443 50.4068C54.0934 52.8709 57.463 53.4171 59.8704 51.6268C62.2779 49.8366 62.8116 46.3877 61.0625 43.9236L51.5629 30.541Z',
	'M35.2085 36.9433C36.9574 34.4795 36.4238 31.0312 34.0167 29.2411C31.6096 27.4511 28.2405 27.9973 26.4916 30.461L17.1664 43.5981C15.4175 46.0618 15.9511 49.5102 18.3582 51.3002C20.7654 53.0903 24.1345 52.5441 25.8834 50.0803L35.2085 36.9433Z'
];

// Actual bounding box of the logo paths (within the original 80×80 viewBox)
const LOGO_MIN_X = 17.1664;
const LOGO_MIN_Y = 28.0859;
const LOGO_MAX_X = 64.0782;
const LOGO_MAX_Y = 54.6002;
const LOGO_W = LOGO_MAX_X - LOGO_MIN_X;
const LOGO_H = LOGO_MAX_Y - LOGO_MIN_Y;

function buildLogoIconSvg(
	size: number,
	bg = '#09090b',
	logoColor = '#0092B8',
	paddingFactor = 0.125
): string {
	const pad = size * paddingFactor;
	const scale = (size - 2 * pad) / LOGO_W;
	const scaledH = LOGO_H * scale;
	const tx = pad - LOGO_MIN_X * scale;
	const ty = (size - scaledH) / 2 - LOGO_MIN_Y * scale;
	const rx = Math.round(size * 0.22);

	const pathEls = LOGO_PATHS.map((d) => `  <path d="${d}" fill="${logoColor}"/>`).join('\n');

	return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${bg}"/>
  <g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(4)})">
${pathEls}
  </g>
</svg>`;
}

// ─── Email logo helpers (unchanged) ───────────────────────────────────────────

const STRUCTURAL_ATTRS = new Set(['width', 'height', 'viewBox', 'class', 'id', 'version']);

function isNamespaceAttr(name: string): boolean {
	return name === 'xmlns' || name.startsWith('xmlns:');
}

function parseRootAttributes(svgContent: string): {
	namespaceAttrs: Record<string, string>;
	presentationAttrs: Record<string, string>;
	viewBox: string | null;
	width: string | null;
	height: string | null;
	innerContent: string;
} {
	const svgTagMatch = svgContent.match(/<svg(\s[^>]*)?\s*>/s);
	if (!svgTagMatch) throw new Error('Could not parse <svg> tag from source');

	const attrsString = svgTagMatch[1]?.trim() ?? '';
	const namespaceAttrs: Record<string, string> = {};
	const presentationAttrs: Record<string, string> = {};
	let viewBox: string | null = null;
	let width: string | null = null;
	let height: string | null = null;

	const attrRegex = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
	let match;
	while ((match = attrRegex.exec(attrsString)) !== null) {
		const [, name, doubleQ, singleQ] = match;
		const value = doubleQ ?? singleQ;
		if (name === 'viewBox') viewBox = value;
		else if (name === 'width') width = value;
		else if (name === 'height') height = value;
		else if (isNamespaceAttr(name)) namespaceAttrs[name] = value;
		else if (!STRUCTURAL_ATTRS.has(name))
			presentationAttrs[name] = value.replace(/currentColor/g, 'black');
	}

	if (!namespaceAttrs['xmlns']) namespaceAttrs['xmlns'] = 'http://www.w3.org/2000/svg';

	const innerMatch = svgContent.match(/<svg(?:\s[^>]*)?\s*>([\s\S]*)<\/svg>/);
	const innerContent = innerMatch ? innerMatch[1] : '';

	return { namespaceAttrs, presentationAttrs, viewBox, width, height, innerContent };
}

function buildWrapperSvg(source: string): string {
	const { namespaceAttrs, presentationAttrs, viewBox, width, height, innerContent } =
		parseRootAttributes(source);

	let minX = 0,
		minY = 0,
		vbWidth: number,
		vbHeight: number;

	if (viewBox) {
		[minX, minY, vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
	} else if (width && height) {
		vbWidth = parseFloat(width);
		vbHeight = parseFloat(height);
	} else {
		throw new Error('Source SVG has no viewBox or width/height.');
	}

	const logoSize = SIZE - PADDING * 2;
	const scale = logoSize / Math.max(vbWidth, vbHeight);
	const logoW = vbWidth * scale;
	const logoH = vbHeight * scale;
	const offsetX = (SIZE - logoW) / 2 - minX * scale;
	const offsetY = (SIZE - logoH) / 2 - minY * scale;

	const nsAttrs = Object.entries(namespaceAttrs)
		.map(([k, v]) => `${k}="${v}"`)
		.join(' ');
	const presAttrs = Object.entries(presentationAttrs)
		.map(([k, v]) => `${k}="${v}"`)
		.join(' ');

	return `<svg ${nsAttrs} width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="${CORNER_RADIUS}" fill="#ffffff"/>
  <g transform="translate(${offsetX}, ${offsetY}) scale(${scale})" ${presAttrs}>
    ${innerContent}
  </g>
</svg>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

try {
	const { Resvg } = await import('@resvg/resvg-js');

	// 1. Email logo (white bg, 112×112)
	const svgSource = readFileSync(SVG_PATH, 'utf-8');
	const wrapperSvg = buildWrapperSvg(svgSource);
	const emailResvg = new Resvg(wrapperSvg, { fitTo: { mode: 'width', value: SIZE } });
	writeFileSync(OUT_EMAIL, emailResvg.render().asPng());
	console.log(`Generated ${OUT_EMAIL} (${SIZE}x${SIZE})`);

	// 2. SVG favicon (dark bg, teal logo — committed as static asset)
	const faviconSvg = buildLogoIconSvg(32);
	writeFileSync(OUT_FAVICON_SVG, faviconSvg);
	console.log(`Generated ${OUT_FAVICON_SVG} (32x32)`);

	// 3. PNG favicon (32×32, for legacy browsers)
	const faviconResvg = new Resvg(faviconSvg, { fitTo: { mode: 'width', value: 32 } });
	writeFileSync(OUT_FAVICON_PNG, faviconResvg.render().asPng());
	console.log(`Generated ${OUT_FAVICON_PNG} (32x32)`);

	// 4. PWA icon logo.png (192×192)
	const logoPwaSvg = buildLogoIconSvg(192);
	const logoPwaResvg = new Resvg(logoPwaSvg, { fitTo: { mode: 'width', value: 192 } });
	writeFileSync(OUT_LOGO_PNG, logoPwaResvg.render().asPng());
	console.log(`Generated ${OUT_LOGO_PNG} (192x192)`);
} catch (err) {
	const missing = [OUT_EMAIL, OUT_FAVICON_SVG, OUT_FAVICON_PNG, OUT_LOGO_PNG].filter(
		(p) => !existsSync(p)
	);
	if (missing.length === 0) {
		console.warn(`⚠️  Could not regenerate logos (${err instanceof Error ? err.message : err})`);
		console.warn('   Using existing committed files.');
	} else {
		throw err;
	}
}
