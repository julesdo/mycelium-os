import { useId } from 'react';
import { cn } from './cn';

/**
 * UN PORTRAIT DESSINÉ — des visages sur la page publique (06/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI DES DESSINS, ET PAS DES PHOTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « ça manque encore clairement d'humanité ». Une page qui parle
 * de gérants doit montrer des gens. Mais une photographie de banque d'images
 * présentée à côté d'un prénom se lirait comme un client réel, et ce produit ne
 * fabrique aucune preuve. Un dessin dit d'emblée « exemple » : il donne un
 * visage à la situation sans prétendre que la personne existe.
 *
 * Formes plates, une quinzaine de nœuds, aucune animation : ce n'est pas le ciel
 * SVG qui faisait saccader le téléphone, c'est l'équivalent d'une icône.
 *
 * Les teintes de peau, de cheveux et de vêtement sont des données de dessin, pas
 * des couleurs d'interface : elles vivent ici, dans `src/ui`, comme celles du
 * logo.
 */

export type Coiffure = 'courte' | 'chignon' | 'boucles' | 'longue' | 'rase';

export interface Personnage {
	readonly peau: string;
	readonly cheveux: string;
	readonly coiffure: Coiffure;
	readonly haut: string;
	readonly lunettes?: boolean;
	readonly barbe?: boolean;
	/** Un crayon de menuisier derrière l'oreille. */
	readonly crayon?: boolean;
}

/** Les trois gérants des situations types, et le veilleur de nuit n'en fait pas partie. */
export const PERSONNAGES = {
	karim: {
		peau: '#C68B5E',
		cheveux: '#2B211C',
		coiffure: 'courte',
		haut: '#4F6FB0',
		barbe: true,
		crayon: true
	},
	sophie: {
		peau: '#F1C6A6',
		cheveux: '#B5652F',
		coiffure: 'chignon',
		haut: '#7A5BB5'
	},
	julien: {
		peau: '#8A5A3C',
		cheveux: '#1C1714',
		coiffure: 'boucles',
		haut: '#D9774B',
		lunettes: true
	}
} as const satisfies Record<string, Personnage>;

const ENCRE = '#1B253F';
const JOUE = '#F29C9C';

function Cheveux({ coiffure, couleur }: { coiffure: Coiffure; couleur: string }) {
	switch (coiffure) {
		case 'rase':
			return (
				<path
					d="M39 49 C 39 33, 81 33, 81 49 C 74 41, 46 41, 39 49 Z"
					fill={couleur}
					opacity={0.55}
				/>
			);
		case 'courte':
			return (
				<path
					d="M36 52 C 34 18, 86 18, 84 52 C 80 40, 70 36, 60 37 C 50 36, 40 40, 36 52 Z"
					fill={couleur}
				/>
			);
		case 'chignon':
			return (
				<>
					<circle cx={60} cy={30} r={9} fill={couleur} />
					<path
						d="M36 53 C 34 19, 86 19, 84 53 C 80 41, 70 37, 60 38 C 50 37, 40 41, 36 53 Z"
						fill={couleur}
					/>
				</>
			);
		case 'boucles':
			return (
				<g fill={couleur}>
					<circle cx={42} cy={42} r={9} />
					<circle cx={52} cy={33} r={10} />
					<circle cx={66} cy={32} r={10} />
					<circle cx={77} cy={41} r={9} />
					<circle cx={81} cy={51} r={6} />
					<circle cx={39} cy={51} r={6} />
				</g>
			);
		case 'longue':
			return (
				<path
					d="M36 54 C 33 28, 87 28, 84 54 L 86 78 C 80 80, 78 70, 78 60 C 74 46, 64 40, 52 42 C 44 46, 42 56, 42 66 C 42 74, 38 80, 34 78 Z"
					fill={couleur}
				/>
			);
	}
}

export function PortraitDessine({
	personnage,
	fond,
	className,
	titre
}: {
	personnage: Personnage;
	/** Le disque de fond ; transparent si absent. */
	fond?: string;
	className?: string;
	/** Ce que le dessin représente, pour qui ne le voit pas. Absent : décoratif. */
	titre?: string;
}) {
	const id = useId().replaceAll(':', '');
	const { peau, cheveux, coiffure, haut, lunettes, barbe, crayon } = personnage;
	return (
		<svg
			viewBox="0 0 120 120"
			{...(titre === undefined
				? { 'aria-hidden': true }
				: { role: 'img', 'aria-labelledby': `portrait-${id}` })}
			className={cn('shrink-0', className)}
		>
			{titre === undefined ? null : <title id={`portrait-${id}`}>{titre}</title>}
			<defs>
				<clipPath id={`disque-${id}`}>
					<circle cx={60} cy={60} r={60} />
				</clipPath>
			</defs>
			<g clipPath={`url(#disque-${id})`}>
				{fond === undefined ? null : <circle cx={60} cy={60} r={60} fill={fond} />}
				{/* Le personnage agrandi d'un quart : à 112 px, un visage au tiers du disque
				    se lisait comme une silhouette lointaine, pas comme quelqu'un. */}
				<g transform="translate(60 54) scale(1.28) translate(-60 -60)">
					{/* Le buste, puis le cou : le col coupe le cou, comme un vêtement. */}
					<path d="M8 124 C 8 86, 112 86, 112 124 Z" fill={haut} />
					<rect x={52} y={66} width={16} height={28} rx={6} fill={peau} />
					<path d="M47 92 C 52 99, 68 99, 73 92 Z" fill={peau} />
					{/* La tête et les oreilles. */}
					<circle cx={37} cy={56} r={5} fill={peau} />
					<circle cx={83} cy={56} r={5} fill={peau} />
					<ellipse cx={60} cy={53} rx={23} ry={25} fill={peau} />
					{barbe ? (
						<path
							d="M38 54 C 38 90, 82 90, 82 54 C 79 66, 72 72, 60 72 C 48 72, 41 66, 38 54 Z"
							fill={cheveux}
						/>
					) : null}
					<Cheveux coiffure={coiffure} couleur={cheveux} />
					{/* Le visage : deux yeux, deux joues, un sourire. */}
					<circle cx={51} cy={55} r={2.4} fill={ENCRE} />
					<circle cx={69} cy={55} r={2.4} fill={ENCRE} />
					<circle cx={46} cy={63} r={3.2} fill={JOUE} opacity={0.5} />
					<circle cx={74} cy={63} r={3.2} fill={JOUE} opacity={0.5} />
					<path
						d="M53 65 C 56 69, 64 69, 67 65"
						fill="none"
						stroke={ENCRE}
						strokeWidth={2.2}
						strokeLinecap="round"
					/>
					{lunettes ? (
						<g fill="none" stroke={ENCRE} strokeWidth={1.8}>
							<circle cx={51} cy={55} r={6} />
							<circle cx={69} cy={55} r={6} />
							<path d="M57 55 L 63 55" />
						</g>
					) : null}
					{crayon ? (
						<g transform="rotate(-38 88 44)">
							<rect x={80} y={41} width={18} height={4.5} rx={1.5} fill="#F2B94B" />
							<path d="M98 41 L 103 43.25 L 98 45.5 Z" fill="#E9D3B0" />
						</g>
					) : null}
				</g>
			</g>
		</svg>
	);
}
