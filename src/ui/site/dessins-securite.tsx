/**
 * LES DESSINS EN COULEUR DE LA SÉCURITÉ (maquette V26) : le corps de l'enveloppe et le cachet de
 * cire. Ici parce que ce sont des couleurs : la muselière les refuse dans `marketing/`.
 */
export function CorpsDEnveloppe() {
	return (
		<svg viewBox="0 0 270 176" preserveAspectRatio="none">
			<path d="M0 0 L135 98 L270 0" fill="none" stroke="rgba(120,96,60,0.16)" strokeWidth="1.2" />
			<path d="M0 176 L118 88 Q135 78 152 88 L270 176 Z" fill="rgba(120,96,60,0.07)" />
			<path
				d="M0 176 L118 88 Q135 78 152 88 L270 176"
				fill="none"
				stroke="rgba(120,96,60,0.2)"
				strokeWidth="1.2"
			/>
		</svg>
	);
}

/** Le cachet de cire qui tombe sur l'enveloppe quand le document est scellé. */
export function Cachet() {
	return (
		<svg viewBox="0 0 80 80" aria-hidden="true">
			<defs>
				<radialGradient id="cire" cx="0.38" cy="0.32" r="0.75">
					<stop offset="0" stopColor="#5f86ff" />
					<stop offset="0.45" stopColor="#2f4fd6" />
					<stop offset="1" stopColor="#1a2a8f" />
				</radialGradient>
				<radialGradient id="cire-creux" cx="0.5" cy="0.5" r="0.5">
					<stop offset="0.7" stopColor="#1c2c94" stopOpacity="0" />
					<stop offset="1" stopColor="#14206e" stopOpacity="0.55" />
				</radialGradient>
			</defs>
			<path
				d="M40 4c6 0 9 4 14 5s10 1 13 6 1 9 3 14 5 8 4 13-5 7-6 12-1 10-6 13-9 1-14 3-8 6-13 6-8-4-13-6-10 0-14-3-3-8-5-13-6-7-6-12 3-8 4-13-1-9 3-14 9-5 13-6 8-5 14-5z"
				fill="url(#cire)"
			/>
			<circle cx="40" cy="41" r="24" fill="url(#cire-creux)" />
			<circle
				cx="40"
				cy="41"
				r="22.5"
				fill="none"
				stroke="#14206e"
				strokeOpacity="0.35"
				strokeWidth="1.4"
			/>
			<circle
				cx="40"
				cy="41"
				r="21"
				fill="none"
				stroke="#8fa8ff"
				strokeOpacity="0.35"
				strokeWidth="0.8"
			/>
			<path
				d="M33 29.5h6v17h11v6H33z"
				fill="#13206e"
				fillOpacity="0.5"
				transform="translate(0.9 1)"
			/>
			<path d="M33 29.5h6v17h11v6H33z" fill="#a9bcff" fillOpacity="0.85" />
			<ellipse
				cx="29"
				cy="20"
				rx="9"
				ry="4.5"
				fill="#fff"
				fillOpacity="0.28"
				transform="rotate(-30 29 20)"
			/>
		</svg>
	);
}
