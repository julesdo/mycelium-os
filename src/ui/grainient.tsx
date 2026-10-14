import { useEffect, useRef } from 'react';

/**
 * GRAINIENT — un dégradé granuleux qui coule, porté de React Bits (15/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL REMPLACE LES LAMELLES, JUGÉES « CARRELAGE DE GRAND-MÈRE »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur, sur les lamelles (MicroSlats) au bureau : « carrelage de grand-mère
 * ou salle de bain […] plus moderne, plus travaillé, et qui perturbe moins l'UX ».
 * Une grille de petites formes qui scintillent attire l'œil à chaque reflet, et
 * derrière une liste elle se lit comme un motif posé sous le texte. Un dégradé qui
 * coule n'a ni motif ni bord : de grandes nappes de couleur, une lumière de soie,
 * un grain de papier, et un mouvement assez lent pour qu'on ne le voie qu'en le
 * cherchant — le parti de Stripe, de Linear ou d'Arc.
 *
 * Source : `npx shadcn@latest add @react-bits/Grainient-TS-TW`. Ce qui a changé :
 *   · plus de curseur ni de tourbillon au clic : le fond ne réagit à rien, il ne
 *     dispute rien au contenu ;
 *   · 30 images par seconde au plus, une définition plafonnée à 1,5, et un grain
 *     fixe (un grain qui frétille à 24 Hz se voit du coin de l'œil) ;
 *   · une seule image, figée, sous `prefers-reduced-motion`.
 *
 * Le calcul des couleurs se fait en OKLab, ce qui garde des transitions sans boue
 * entre le papier et l'encre. La palette et son plafond de contraste vivent dans
 * `fond.tsx`.
 */

export interface GrainientProps {
	/** De deux à huit couleurs. La première est la BASE : l'intro part d'elle, et la soie s'y rapporte. */
	readonly colors: readonly string[];
	/** L'axe du dégradé, en degrés. */
	readonly angle?: number;
	readonly speed?: number;
	/** Combien les nappes se tordent. */
	readonly flow?: number;
	/** La taille des nappes : plus grand, plus calme. */
	readonly scale?: number;
	readonly softness?: number;
	/** La lumière de soie sur les plis. */
	readonly silk?: number;
	readonly grainAmount?: number;
	readonly grainSize?: number;
	/** Fondu d'entrée depuis la base. */
	readonly intro?: boolean;
	readonly className?: string;
}

type Programme = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

const MAX_COULEURS = 8;
const DUREE_INTRO = 1.6;
const IMAGES_PAR_SECONDE = 30;
const DEFINITION_MAX = 1.5;

const VERTEX = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const CHAMP = `#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uTime;
uniform vec3 uRamp[8];
uniform int uCount;
uniform vec2 uDir;
uniform float uExtent;
uniform float uSoftness;
uniform float uFlow;
uniform float uScale;
uniform float uSilk;
uniform float uSettle;
uniform float uReveal;
in vec2 vUv;
out vec4 outColor;

vec2 hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash2(i), f);
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec2 drift(vec2 p, float t) {
  vec2 w1 = vec2(
    noise(p * 0.85 + vec2(t * 0.11, t * 0.07)),
    noise(p * 0.85 + vec2(4.1, 1.7) - vec2(t * 0.08, t * 0.12))
  );
  vec2 w2 = vec2(
    noise(p * 1.55 + w1 * 1.8 + vec2(1.3, 7.1) + t * 0.05),
    noise(p * 1.55 + w1 * 1.8 + vec2(6.4, 2.2) - t * 0.06)
  );
  return (w1 - 0.5) * 1.1 + (w2 - 0.5) * 0.55;
}

vec2 warp(vec2 p) {
  vec2 q = p / uScale;
  q += vec2(-uDir.y, uDir.x) * uTime * 0.45;
  return p + drift(q, uTime) * uFlow * uScale * uSettle;
}

float coord(vec2 p) {
  vec2 w = warp(p);
  return dot(w, uDir) / uExtent + 0.5;
}

vec3 labToRgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float raw = coord(p);
  float s = clamp(raw, 0.0, 1.0);
  float scaled = s * float(uCount - 1);
  int index = int(min(floor(scaled), float(uCount - 2)));
  float f = scaled - float(index);
  float edge = max(uSoftness * 0.5, fwidth(scaled) * 0.75);
  float shaped = smoothstep(0.5 - edge, 0.5 + edge, f);
  vec3 from = uRamp[0];
  vec3 to = uRamp[1];
  for (int i = 0; i < 7; i++) {
    if (i == index) {
      from = uRamp[i];
      to = uRamp[i + 1];
    }
  }
  vec3 lab = mix(from, to, shaped);
  if (uSilk > 0.0) {
    vec2 grad = vec2(coord(p + vec2(0.004, 0.0)) - raw, coord(p + vec2(0.0, 0.004)) - raw) / 0.004;
    vec2 slope = grad * sin(3.14159265 * clamp(raw, 0.0, 1.0)) * uSilk * 4.0;
    vec3 normal = normalize(vec3(-slope, 1.0));
    vec3 light = normalize(vec3(-uDir.y, uDir.x, 1.2));
    float diffuse = dot(normal, light) - light.z;
    lab = uRamp[0] + (lab - uRamp[0]) * (1.0 + (diffuse * 0.35 + max(diffuse, 0.0) * diffuse * 0.6) * uSilk);
  }
  lab = mix(uRamp[0], lab, smoothstep(0.0, 1.0, uReveal * 1.5 - length(vUv - 0.5) * 0.6));
  outColor = vec4(encode(labToRgb(lab)), 1.0);
}`;

const COMPOSITION = `#version 300 es
precision highp float;
uniform sampler2D uField;
uniform float uGrain;
uniform float uGrainSize;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float clump(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec3 color = texture(uField, vUv).rgb;
  vec2 pixel = gl_FragCoord.xy;
  float fine = hash(pixel) + hash(pixel + 7.13) - 1.0;
  float coarse = (clump(pixel / max(uGrainSize, 1.0)) - 0.5) * 2.0;
  float grain = mix(fine, coarse, clamp(uGrainSize - 1.0, 0.0, 1.0) * 0.8);
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color += grain * uGrain * (0.45 + 2.2 * luma * (1.0 - luma));
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

const borne = (valeur: number, min: number, max: number) => Math.min(max, Math.max(min, valeur));

const versLineaire = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function versLab([r, g, b]: readonly number[]): number[] {
	const lr = versLineaire(r ?? 0);
	const lg = versLineaire(g ?? 0);
	const lb = versLineaire(b ?? 0);
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

function compiler(gl: WebGL2RenderingContext, genre: number, source: string) {
	const shader = gl.createShader(genre);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	gl.deleteShader(shader);
	return null;
}

function lier(gl: WebGL2RenderingContext, fragment: string): Programme | null {
	const v = compiler(gl, gl.VERTEX_SHADER, VERTEX);
	const f = compiler(gl, gl.FRAGMENT_SHADER, fragment);
	const program = gl.createProgram();
	if (!v || !f || !program) return null;
	gl.attachShader(program, v);
	gl.attachShader(program, f);
	gl.linkProgram(program);
	gl.deleteShader(v);
	gl.deleteShader(f);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		return null;
	}
	const uniforms: Record<string, WebGLUniformLocation | null> = {};
	const nombre = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
	for (let i = 0; i < nombre; i++) {
		const info = gl.getActiveUniform(program, i);
		if (!info) continue;
		const nom = info.name.replace(/\[0\]$/, '');
		uniforms[nom] = gl.getUniformLocation(program, nom);
	}
	return { program, uniforms };
}

/** Une couleur CSS en RVB 0..1, lue par un canevas d'un pixel (toute syntaxe CSS passe). */
function lireCouleur(sonde: CanvasRenderingContext2D | null, valeur: string): number[] {
	if (sonde === null) return [0, 0, 0];
	sonde.clearRect(0, 0, 1, 1);
	sonde.fillStyle = '#000000';
	sonde.fillStyle = valeur;
	sonde.fillRect(0, 0, 1, 1);
	const [r = 0, g = 0, b = 0] = sonde.getImageData(0, 0, 1, 1).data;
	return [r / 255, g / 255, b / 255];
}

export function Grainient({
	colors,
	angle = 160,
	speed = 1,
	flow = 0.8,
	scale = 1,
	softness = 1,
	silk = 0.35,
	grainAmount = 0.05,
	grainSize = 1.2,
	intro = true,
	className
}: GrainientProps) {
	const conteneur = useRef<HTMLDivElement>(null);
	const canevas = useRef<HTMLCanvasElement>(null);
	const reglages = {
		colors:
			colors.length > 1
				? colors.slice(0, MAX_COULEURS)
				: [colors[0] ?? '#000', colors[0] ?? '#000'],
		angle,
		speed: Math.max(0, speed),
		flow: borne(flow, 0, 3),
		scale: borne(scale, 0.25, 3),
		softness: borne(softness, 0, 1),
		silk: borne(silk, 0, 1),
		grainAmount: borne(grainAmount, 0, 0.5),
		grainSize: borne(grainSize, 0.5, 4),
		intro
	};
	const reglagesRef = useRef(reglages);
	const reveil = useRef<(() => void) | null>(null);

	// Les réglages du dernier rendu, lus par la boucle : un système extérieur (WebGL).
	useEffect(() => {
		reglagesRef.current = reglages;
		reveil.current?.();
	});

	useEffect(() => {
		const boite = conteneur.current;
		const toile = canevas.current;
		const gl = toile?.getContext('webgl2', {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false
		});
		if (!boite || !toile || !gl) return undefined;

		const champ = lier(gl, CHAMP);
		const composition = lier(gl, COMPOSITION);
		if (!champ || !composition) return undefined;
		const fu = champ.uniforms;
		const cu = composition.uniforms;
		const vao = gl.createVertexArray();
		const cible = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, cible);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		const tampon = gl.createFramebuffer();
		const tailleChamp = { largeur: 0, hauteur: 0 };

		const sonde = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
		const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
		const vue = { largeur: 1, hauteur: 1, rapport: 1 };
		const rampe = new Float32Array(MAX_COULEURS * 3);
		let clePalette = '';
		let temps = 0;
		let horlogeIntro = reglagesRef.current.intro && !calme ? 0 : 1;
		let image = 0;
		let precedente = 0;
		let derniereImage = 0;
		let visible = true;

		const accorderPalette = () => {
			const r = reglagesRef.current;
			const cle = r.colors.join(',');
			if (cle === clePalette) return;
			clePalette = cle;
			r.colors.forEach((couleur, i) => rampe.set(versLab(lireCouleur(sonde, couleur)), i * 3));
		};

		const dessiner = () => {
			const r = reglagesRef.current;
			const aspect = vue.largeur / vue.hauteur;
			accorderPalette();
			gl.bindVertexArray(vao);
			gl.disable(gl.BLEND);
			gl.bindFramebuffer(gl.FRAMEBUFFER, tampon);
			gl.viewport(0, 0, tailleChamp.largeur, tailleChamp.hauteur);
			gl.useProgram(champ.program);
			gl.uniform1f(fu.uAspect ?? null, aspect);
			gl.uniform1f(fu.uTime ?? null, temps);
			gl.uniform3fv(fu.uRamp ?? null, rampe);
			gl.uniform1i(fu.uCount ?? null, r.colors.length);
			const radians = (r.angle * Math.PI) / 180;
			gl.uniform2f(fu.uDir ?? null, Math.sin(radians), Math.cos(radians));
			gl.uniform1f(
				fu.uExtent ?? null,
				aspect * Math.abs(Math.sin(radians)) + Math.abs(Math.cos(radians))
			);
			gl.uniform1f(fu.uSoftness ?? null, r.softness);
			gl.uniform1f(fu.uFlow ?? null, r.flow);
			gl.uniform1f(fu.uScale ?? null, r.scale);
			gl.uniform1f(fu.uSilk ?? null, r.silk);
			gl.uniform1f(fu.uSettle ?? null, horlogeIntro * horlogeIntro * (3 - 2 * horlogeIntro));
			gl.uniform1f(fu.uReveal ?? null, horlogeIntro);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, toile.width, toile.height);
			gl.useProgram(composition.program);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, cible);
			gl.uniform1i(cu.uField ?? null, 0);
			gl.uniform1f(cu.uGrain ?? null, r.grainAmount);
			gl.uniform1f(cu.uGrainSize ?? null, r.grainSize * vue.rapport);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		const redimensionner = () => {
			vue.largeur = Math.max(1, boite.clientWidth);
			vue.hauteur = Math.max(1, boite.clientHeight);
			vue.rapport = Math.min(window.devicePixelRatio || 1, DEFINITION_MAX);
			toile.width = Math.max(1, Math.round(vue.largeur * vue.rapport));
			toile.height = Math.max(1, Math.round(vue.hauteur * vue.rapport));
			// Le champ se calcule à demi-définition : un dégradé n'a pas de détail à perdre.
			const largeur = Math.max(1, Math.round(toile.width / 2));
			const hauteur = Math.max(1, Math.round(toile.height / 2));
			if (largeur !== tailleChamp.largeur || hauteur !== tailleChamp.hauteur) {
				tailleChamp.largeur = largeur;
				tailleChamp.hauteur = hauteur;
				gl.bindTexture(gl.TEXTURE_2D, cible);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA8,
					largeur,
					hauteur,
					0,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					null
				);
				gl.bindFramebuffer(gl.FRAMEBUFFER, tampon);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cible, 0);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			}
			dessiner();
			reveiller();
		};

		const boucle = (maintenant: number) => {
			image = 0;
			if (!visible || document.hidden) return;
			// Trente images par seconde au plus : le mouvement est lent, l'œil n'en voit pas plus.
			if (maintenant - derniereImage < 1000 / IMAGES_PAR_SECONDE - 1) {
				image = requestAnimationFrame(boucle);
				return;
			}
			derniereImage = maintenant;
			const r = reglagesRef.current;
			const dt = precedente ? borne((maintenant - precedente) / 1000, 0.001, 0.05) : 1 / 30;
			precedente = maintenant;
			if (!calme) temps += dt * r.speed * 0.16;
			if (horlogeIntro < 1) horlogeIntro = Math.min(1, horlogeIntro + dt / DUREE_INTRO);
			dessiner();
			const occupe = (!calme && r.speed > 0) || horlogeIntro < 1;
			if (occupe) image = requestAnimationFrame(boucle);
			else precedente = 0;
		};

		function reveiller() {
			if (!image && visible && !document.hidden) image = requestAnimationFrame(boucle);
		}

		const surVisibilite = () => {
			precedente = 0;
			reveiller();
		};

		const observateurTaille = new ResizeObserver(redimensionner);
		observateurTaille.observe(boite);
		const observateurVue = new IntersectionObserver((entrees) => {
			visible = entrees.some((entree) => entree.isIntersecting);
			if (visible) {
				precedente = 0;
				reveiller();
			}
		});
		observateurVue.observe(boite);
		document.addEventListener('visibilitychange', surVisibilite);
		redimensionner();
		// Il ne paraît qu'une fois dessiné : opaque, un canevas vide est noir.
		toile.style.opacity = '1';
		reveil.current = reveiller;

		return () => {
			cancelAnimationFrame(image);
			reveil.current = null;
			observateurTaille.disconnect();
			observateurVue.disconnect();
			document.removeEventListener('visibilitychange', surVisibilite);
			gl.deleteTexture(cible);
			gl.deleteFramebuffer(tampon);
			gl.deleteVertexArray(vao);
			gl.deleteProgram(champ.program);
			gl.deleteProgram(composition.program);
			/*
			  ⚠️ LE CONTEXTE NE SE PERD QUE SI LE CANEVAS A QUITTÉ LA PAGE. En développement,
			  React démonte et remonte l'effet sur le MÊME canevas : perdu ici, le contexte
			  l'était pour de bon, et le fond restait noir (le canevas est opaque).
			*/
			setTimeout(() => {
				if (!toile.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
			}, 0);
		};
	}, []);

	return (
		<div ref={conteneur} className={className}>
			<canvas
				ref={canevas}
				aria-hidden
				className="absolute inset-0 block h-full w-full opacity-0 transition-opacity duration-700"
			/>
		</div>
	);
}
