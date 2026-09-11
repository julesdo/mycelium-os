import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

/**
 * LINE WAVES — le fond animé, en WebGL.
 *
 * Repris de React Bits (reactbits.dev), porté en TypeScript et adapté au
 * produit. Un unique triangle plein écran sur lequel tourne un fragment shader
 * qui dessine des lignes ondulantes déformées par deux champs de bruit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TROIS ADAPTATIONS, ET AUCUNE N'EST COSMÉTIQUE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. ⚠️ LE MOUVEMENT S'ARRÊTE SOUS `prefers-reduced-motion`.
 *
 * La règle globale du produit neutralise les animations CSS, mais elle ne peut
 * rien contre une boucle `requestAnimationFrame` : le shader continuerait de
 * tourner, plein écran, chez quelqu'un qui a demandé l'inverse au niveau du
 * système. Ce n'est pas un détail de confort — une surface animée en
 * permanence est exactement ce qui déclenche un malaise vestibulaire, et le
 * fond occupe ici la totalité de l'écran.
 *
 * On rend donc UNE image, fixe, et on s'arrête. Le fond reste beau ; il ne
 * bouge plus. La préférence est réévaluée si elle change en cours de session.
 *
 * 2. ⚠️ LA BOUCLE S'ARRÊTE AUSSI QUAND L'ONGLET EST CACHÉ.
 *
 * Le composant d'origine tourne tant que la page vit. Sur un logiciel de
 * bureau qu'on laisse ouvert toute la journée dans un onglet d'arrière-plan,
 * c'est un shader plein écran qui consomme du GPU pour rien pendant huit
 * heures. Un utilisateur sur portable le paie en autonomie sans jamais
 * comprendre pourquoi.
 *
 * 3. ⚠️ LA SOURIS EST ÉCOUTÉE SUR LA FENÊTRE, PAS SUR LE CANEVAS.
 *
 * Ce fond vit DERRIÈRE toute l'interface, en `pointer-events: none` : aucun
 * événement de souris ne lui parvient jamais. Le composant d'origine attache
 * ses écouteurs au canevas, ce qui, dans cette position, ne produirait
 * strictement rien — une option activée qui ne fait rien, c'est-à-dire le
 * pire des deux mondes.
 */

export interface LineWavesProps {
	/** Multiplicateur de vitesse global. */
	readonly speed?: number;
	/** Nombre de lignes dans la région centrale. */
	readonly innerLineCount?: number;
	/** Nombre de lignes dans la région des bords. */
	readonly outerLineCount?: number;
	/** Intensité de la déformation. */
	readonly warpIntensity?: number;
	/** Rotation du motif, en degrés. */
	readonly rotation?: number;
	/** Largeur du fondu entre région centrale et bords. */
	readonly edgeFadeWidth?: number;
	/** Vitesse du cycle de couleur. */
	readonly colorCycleSpeed?: number;
	/** Luminosité globale. */
	readonly brightness?: number;
	readonly color1?: string;
	readonly color2?: string;
	readonly color3?: string;
	/** Déformation réactive au curseur. */
	readonly enableMouseInteraction?: boolean;
	readonly mouseInfluence?: number;
	readonly className?: string;
}

function hexToVec3(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [
		parseInt(h.slice(0, 2), 16) / 255,
		parseInt(h.slice(2, 4), 16) / 255,
		parseInt(h.slice(4, 6), 16) / 255
	];
}

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uSpeed;
uniform float uInnerLines;
uniform float uOuterLines;
uniform float uWarpIntensity;
uniform float uRotation;
uniform float uEdgeFadeWidth;
uniform float uColorCycleSpeed;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform bool uEnableMouse;

#define HALF_PI 1.5707963

float hashF(float n) {
  return fract(sin(n * 127.1) * 43758.5453123);
}

float smoothNoise(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hashF(i), hashF(i + 1.0), u);
}

float displaceA(float coord, float t) {
  float result = sin(coord * 2.123) * 0.2;
  result += sin(coord * 3.234 + t * 4.345) * 0.1;
  result += sin(coord * 0.589 + t * 0.934) * 0.5;
  return result;
}

float displaceB(float coord, float t) {
  float result = sin(coord * 1.345) * 0.3;
  result += sin(coord * 2.734 + t * 3.345) * 0.2;
  result += sin(coord * 0.189 + t * 0.934) * 0.3;
  return result;
}

vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void main() {
  vec2 coords = gl_FragCoord.xy / uResolution.xy;
  coords = coords * 2.0 - 1.0;
  coords = rotate2D(coords, uRotation);

  float halfT = uTime * uSpeed * 0.5;
  float fullT = uTime * uSpeed;

  float mouseWarp = 0.0;
  if (uEnableMouse) {
    vec2 mPos = rotate2D(uMouse * 2.0 - 1.0, uRotation);
    float mDist = length(coords - mPos);
    mouseWarp = uMouseInfluence * exp(-mDist * mDist * 4.0);
  }

  float warpAx = coords.x + displaceA(coords.y, halfT) * uWarpIntensity + mouseWarp;
  float warpAy = coords.y - displaceA(coords.x * cos(fullT) * 1.235, halfT) * uWarpIntensity;
  float warpBx = coords.x + displaceB(coords.y, halfT) * uWarpIntensity + mouseWarp;
  float warpBy = coords.y - displaceB(coords.x * sin(fullT) * 1.235, halfT) * uWarpIntensity;

  vec2 fieldA = vec2(warpAx, warpAy);
  vec2 fieldB = vec2(warpBx, warpBy);
  vec2 blended = mix(fieldA, fieldB, mix(fieldA, fieldB, 0.5));

  float fadeTop = smoothstep(uEdgeFadeWidth, uEdgeFadeWidth + 0.4, blended.y);
  float fadeBottom = smoothstep(-uEdgeFadeWidth, -(uEdgeFadeWidth + 0.4), blended.y);
  float vMask = 1.0 - max(fadeTop, fadeBottom);

  float tileCount = mix(uOuterLines, uInnerLines, vMask);
  float scaledY = blended.y * tileCount;
  float nY = smoothNoise(abs(scaledY));

  float ridge = pow(
    step(abs(nY - blended.x) * 2.0, HALF_PI) * cos(2.0 * (nY - blended.x)),
    5.0
  );

  float lines = 0.0;
  for (float i = 1.0; i < 3.0; i += 1.0) {
    lines += pow(max(fract(scaledY), fract(-scaledY)), i * 2.0);
  }

  float pattern = vMask * lines;

  float cycleT = fullT * uColorCycleSpeed;
  float rChannel = (pattern + lines * ridge) * (cos(blended.y + cycleT * 0.234) * 0.5 + 1.0);
  float gChannel = (pattern + vMask * ridge) * (sin(blended.x + cycleT * 1.745) * 0.5 + 1.0);
  float bChannel = (pattern + lines * ridge) * (cos(blended.x + cycleT * 0.534) * 0.5 + 1.0);

  vec3 col = (rChannel * uColor1 + gChannel * uColor2 + bChannel * uColor3) * uBrightness;
  float alpha = clamp(length(col), 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;

export function LineWaves({
	speed = 0.3,
	innerLineCount = 32,
	outerLineCount = 36,
	warpIntensity = 1,
	rotation = -45,
	edgeFadeWidth = 0,
	colorCycleSpeed = 1,
	brightness = 0.2,
	color1 = '#ffffff',
	color2 = '#ffffff',
	color3 = '#ffffff',
	enableMouseInteraction = false,
	mouseInfluence = 2,
	className
}: LineWavesProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (container === null) return;

		const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
		const gl = renderer.gl;
		gl.clearColor(0, 0, 0, 0);

		const currentMouse: [number, number] = [0.5, 0.5];
		let targetMouse: [number, number] = [0.5, 0.5];

		const geometry = new Triangle(gl);
		const rotationRad = (rotation * Math.PI) / 180;

		const program = new Program(gl, {
			vertex: vertexShader,
			fragment: fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uResolution: {
					value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height]
				},
				uSpeed: { value: speed },
				uInnerLines: { value: innerLineCount },
				uOuterLines: { value: outerLineCount },
				uWarpIntensity: { value: warpIntensity },
				uRotation: { value: rotationRad },
				uEdgeFadeWidth: { value: edgeFadeWidth },
				uColorCycleSpeed: { value: colorCycleSpeed },
				uBrightness: { value: brightness },
				uColor1: { value: hexToVec3(color1) },
				uColor2: { value: hexToVec3(color2) },
				uColor3: { value: hexToVec3(color3) },
				uMouse: { value: new Float32Array([0.5, 0.5]) },
				uMouseInfluence: { value: mouseInfluence },
				uEnableMouse: { value: enableMouseInteraction }
			}
		});

		const mesh = new Mesh(gl, { geometry, program });
		container.appendChild(gl.canvas);

		function redimensionner() {
			if (container === null) return;
			renderer.setSize(container.offsetWidth, container.offsetHeight);
			program.uniforms.uResolution.value = [
				gl.canvas.width,
				gl.canvas.height,
				gl.canvas.width / gl.canvas.height
			];
		}
		redimensionner();
		window.addEventListener('resize', redimensionner);

		// ⚠️ SUR LA FENÊTRE, PAS SUR LE CANEVAS. Ce fond est en `pointer-events:
		// none` derrière toute l'interface : un écouteur posé sur le canevas ne
		// recevrait jamais rien, et l'option serait activée sans effet.
		function suivreSouris(e: MouseEvent) {
			targetMouse = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
		}
		if (enableMouseInteraction) window.addEventListener('mousemove', suivreSouris);

		/**
		 * ⚠️ DEUX RAISONS D'ARRÊTER LA BOUCLE, ET ELLES SE CUMULENT.
		 *
		 * `prefers-reduced-motion` : la règle globale du produit neutralise les
		 * animations CSS, mais elle ne peut rien contre `requestAnimationFrame`.
		 * Sans cette lecture, un utilisateur qui a demandé l'arrêt des animations
		 * au niveau de son système garderait un shader animé plein écran.
		 *
		 * Onglet caché : un logiciel de bureau reste ouvert toute la journée. Un
		 * shader plein écran qui tourne dans un onglet d'arrière-plan consomme du
		 * GPU pour rien, et se paie en autonomie sur un portable.
		 *
		 * Dans les deux cas on rend UNE image, fixe, puis on s'arrête : le fond
		 * reste dessiné, il ne bouge plus.
		 */
		const sobriete = window.matchMedia('(prefers-reduced-motion: reduce)');
		let image = 0;
		let derniereDate = 0;

		function boucle(temps: number) {
			derniereDate = temps;
			program.uniforms.uTime.value = temps * 0.001;

			if (enableMouseInteraction) {
				currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
				currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
				program.uniforms.uMouse.value[0] = currentMouse[0];
				program.uniforms.uMouse.value[1] = currentMouse[1];
			}

			renderer.render({ scene: mesh });

			if (sobriete.matches || document.hidden) {
				image = 0;
				return;
			}
			image = requestAnimationFrame(boucle);
		}

		function relancer() {
			if (image !== 0) return;
			if (sobriete.matches || document.hidden) {
				// Une image quand même : le fond doit rester dessiné, pas disparaître.
				boucle(derniereDate);
				return;
			}
			image = requestAnimationFrame(boucle);
		}

		image = requestAnimationFrame(boucle);
		document.addEventListener('visibilitychange', relancer);
		sobriete.addEventListener('change', relancer);

		return () => {
			if (image !== 0) cancelAnimationFrame(image);
			window.removeEventListener('resize', redimensionner);
			if (enableMouseInteraction) window.removeEventListener('mousemove', suivreSouris);
			document.removeEventListener('visibilitychange', relancer);
			sobriete.removeEventListener('change', relancer);
			container.removeChild(gl.canvas);
			// Sans ça, chaque montage laisse un contexte WebGL derrière lui, et le
			// navigateur en refuse le seizième — l'écran devient noir sans erreur.
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		};
	}, [
		speed,
		innerLineCount,
		outerLineCount,
		warpIntensity,
		rotation,
		edgeFadeWidth,
		colorCycleSpeed,
		brightness,
		color1,
		color2,
		color3,
		enableMouseInteraction,
		mouseInfluence
	]);

	return <div ref={containerRef} className={className} />;
}
