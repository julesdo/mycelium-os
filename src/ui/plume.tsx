import { cn } from './cn';

/**
 * PLUME — le pilote, incarné (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UNE MASCOTTE DANS UN LOGICIEL DE RECOUVREMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « le pilote doit vivre dans l'application et être personnifié
 * comme une mascotte rassurante ». Les utilisateurs trouvaient le pilote « peu
 * rassurant » : une pastille qui pulse et une liste d'étapes ne font pas un
 * collaborateur. Alan (assurance santé, France) a fait la même chose avec Mo :
 * un personnage doux dans une application d'argent, grand quand on le rencontre,
 * petit dans l'en-tête quand on lui parle (relevé sur Mobbin le 08/10).
 *
 * Plume est une goutte d'encre bleue avec une plume sur la tête : il ÉCRIT les
 * relances, au nom du gérant. Il n'est jamais dans ce qui part vers un client
 * (ligne rouge n° 1) : il vit dans l'application, et nulle part ailleurs.
 *
 * ⚠️ SON HUMEUR EST UNE DONNÉE, PAS UN DÉCOR. Elle suit ce qui se passe :
 *
 *   · `repos`     — il veille ; il respire, cligne, regarde autour ;
 *   · `travaille` — un travail tourne ; ses yeux lisent de gauche à droite ;
 *   · `content`   — quelque chose vient d'aboutir ;
 *   · `attention` — quelque chose attend le gérant ;
 *   · `ecoute`    — le gérant lui parle.
 *
 * Un personnage qui sourit pendant qu'un envoi échoue mentirait : l'appelant
 * choisit l'humeur d'après l'état réel, jamais pour faire joli.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL. Le vert, le rouge et l'ambre ne disent qu'une
 * chose dans ce produit. Plume est d'encre, ses joues d'un rose pâle qui n'est
 * aucune des trois.
 */

/** Le nom du pilote, à UN seul endroit : le changer ici le change partout. */
export const NOM_DU_PILOTE = 'Plume';

export type HumeurPlume = 'repos' | 'travaille' | 'content' | 'attention' | 'ecoute';

/** Ce que l'humeur dit à un lecteur d'écran. */
const HUMEUR_EN_MOTS: Readonly<Record<HumeurPlume, string>> = {
	repos: 'veille',
	travaille: 'au travail',
	content: 'content',
	attention: 'a besoin de vous',
	ecoute: 'vous écoute'
};

/** Le décalage des pupilles : où il regarde. */
const REGARD: Readonly<Record<HumeurPlume, { readonly x: number; readonly y: number }>> = {
	repos: { x: 0, y: 0 },
	travaille: { x: 0, y: 1.7 },
	content: { x: 0, y: 0 },
	attention: { x: 0, y: -1.3 },
	ecoute: { x: -1.1, y: -1.1 }
};

/** La ligne des yeux : la goutte est lourde du bas, le visage aussi. */
const Y_OEIL = 37;

function Bouche({ humeur }: { humeur: HumeurPlume }) {
	switch (humeur) {
		case 'content':
			return <path d="M26.5 46 Q32 53.5 37.5 46 Z" className="plume-encre" />;
		case 'travaille':
			return (
				<path
					d="M29.4 48.2 Q32 49.2 34.6 48.2"
					className="plume-trait"
					strokeWidth={2}
					fill="none"
				/>
			);
		case 'attention':
			return <ellipse cx="32" cy="48.2" rx="2" ry="2.4" className="plume-encre" />;
		default:
			return (
				<path
					d="M28.4 46.8 Q32 50.4 35.6 46.8"
					className="plume-trait"
					strokeWidth={2.1}
					fill="none"
				/>
			);
	}
}

function Oeil({ cx, humeur }: { cx: number; humeur: HumeurPlume }) {
	if (humeur === 'content') {
		// Les yeux qui sourient : deux arcs, comme ^ ^.
		return (
			<path
				d={`M${cx - 5} ${Y_OEIL + 1.5} Q${cx} ${Y_OEIL - 5} ${cx + 5} ${Y_OEIL + 1.5}`}
				className="plume-trait"
				strokeWidth={2.6}
				fill="none"
			/>
		);
	}
	const regard = REGARD[humeur];
	const grand = humeur === 'attention';
	return (
		<g className="plume-oeil">
			<ellipse cx={cx} cy={Y_OEIL} rx={grand ? 6.4 : 6} ry={grand ? 7.6 : 7} fill="#fff" />
			<g className={cn('plume-pupille', humeur === 'travaille' && 'plume-pupille-lit')}>
				<circle cx={cx + regard.x} cy={Y_OEIL + regard.y} r="3.4" className="plume-encre" />
				<circle cx={cx + regard.x + 1.2} cy={Y_OEIL + regard.y - 1.4} r="1.1" fill="#fff" />
			</g>
			{humeur === 'travaille' ? (
				// La paupière mi-close : il lit, concentré.
				<path
					d={`M${cx - 6.4} ${Y_OEIL - 2.6} Q${cx} ${Y_OEIL - 5.2} ${cx + 6.4} ${Y_OEIL - 2.6} L${cx + 6.4} ${Y_OEIL - 8} L${cx - 6.4} ${Y_OEIL - 8} Z`}
					className="plume-corps"
				/>
			) : null}
		</g>
	);
}

/**
 * LE PERSONNAGE.
 *
 * `taille` en pixels : 28 dans la barre, 32 dans le fil, 72 à 120 quand on le
 * rencontre. `sol` pose son ombre au sol, pour la grande taille seulement.
 */
export function Plume({
	humeur = 'repos',
	taille = 32,
	sol = false,
	decoratif = false,
	className
}: {
	readonly humeur?: HumeurPlume;
	readonly taille?: number;
	readonly sol?: boolean;
	/** Vrai quand un texte voisin le nomme déjà : il se tait pour le lecteur d'écran. */
	readonly decoratif?: boolean;
	readonly className?: string;
}) {
	return (
		<svg
			viewBox="0 0 64 64"
			width={taille}
			height={taille}
			className={cn('plume shrink-0 overflow-visible', `plume-${humeur}`, className)}
			{...(decoratif
				? { 'aria-hidden': true }
				: { role: 'img', 'aria-label': `${NOM_DU_PILOTE}, ${HUMEUR_EN_MOTS[humeur]}` })}
		>
			{sol ? <ellipse cx="32" cy="60.5" rx="15" ry="2.6" className="plume-ombre" /> : null}
			<g className="plume-tout">
				{/* La plume d'écriture, plantée derrière la tête : il écrit vos relances. Elle se balance. */}
				<g className="plume-aigrette">
					<path
						d="M43.5 24 C44.5 14.5 50.5 6 60.5 1 C61.6 9.6 56.6 18.6 46.6 25.4 Z"
						className="plume-barbe"
					/>
					<path
						d="M49.4 13.2 L53.6 11.6 M47.6 17.2 L52.2 16.2 M46.2 21 L50.4 20.6"
						className="plume-tuyau"
						strokeWidth={0.9}
						strokeLinecap="round"
					/>
					<path
						d="M44.6 25 Q51 13.6 60 2"
						className="plume-tuyau"
						strokeWidth={1.2}
						fill="none"
						strokeLinecap="round"
					/>
				</g>
				{/* Les bras : deux petites nageoires, la droite salue quand il est content. */}
				<ellipse
					cx="9.6"
					cy="45"
					rx="3.5"
					ry="5.6"
					className="plume-bras"
					transform="rotate(16 9.6 45)"
				/>
				<g className="plume-bras-droit">
					<ellipse
						cx="54.4"
						cy="45"
						rx="3.5"
						ry="5.6"
						className="plume-bras"
						transform="rotate(-16 54.4 45)"
					/>
				</g>
				{/* Le corps : une goutte d'encre posée, sa pointe recourbée comme un coup de plume. */}
				<path
					d="M31.2 6.4 C33.6 5.2 37 5.6 38.6 7.6 C36.4 7.2 34.8 8 34.2 9.4 C37.2 15.2 46 20.6 51.4 28 C54.8 32.6 56.4 37.4 56.4 42.6 C56.4 52.4 46.2 58.4 32 58.4 C17.8 58.4 7.6 52.4 7.6 42.6 C7.6 37.4 9.2 32.6 12.6 28 C18.6 19.8 28.4 13.8 31.2 6.4 Z"
					className="plume-corps"
				/>
				<ellipse cx="32" cy="50" rx="14.5" ry="7.4" className="plume-ventre" />
				<ellipse
					cx="21"
					cy="28.5"
					rx="5.6"
					ry="3"
					className="plume-reflet"
					transform="rotate(-38 21 28.5)"
				/>
				<ellipse cx="17.4" cy="45.4" rx="3.6" ry="2.2" className="plume-joue" />
				<ellipse cx="46.6" cy="45.4" rx="3.6" ry="2.2" className="plume-joue" />
				<Oeil cx={24} humeur={humeur} />
				<Oeil cx={40} humeur={humeur} />
				<Bouche humeur={humeur} />
			</g>
		</svg>
	);
}

/**
 * PLUME DANS SON DISQUE — l'avatar du fil et de l'en-tête.
 *
 * ⚠️ LE DISQUE EST DU VERRE, PAS UNE COULEUR. Une pastille de couleur ferait de
 * Plume une famille de plus ; il n'en est pas une, il est celui qui les manipule.
 */
export function AvatarPlume({
	humeur = 'repos',
	taille = 32,
	className
}: {
	readonly humeur?: HumeurPlume;
	readonly taille?: number;
	readonly className?: string;
}) {
	return (
		<span
			className={cn(
				'verre-carte inline-flex shrink-0 items-center justify-center rounded-full',
				className
			)}
			style={{ width: taille, height: taille }}
		>
			<Plume humeur={humeur} taille={Math.round(taille * 0.78)} decoratif />
		</span>
	);
}
