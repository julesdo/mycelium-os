/**
 * Le logo du site public, en symbole : `<use href="#logo" />` le pose partout où la marque se
 * montre (barre, menu, pied). Transplanté de la maquette V26. Il vit dans `src/ui/` parce que ses
 * dégradés sont des couleurs.
 */
export function SpriteDuSite() {
	return (
		<svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
			<defs>
				<linearGradient id="logo-a" x1="0" y1="0" x2="0.85" y2="1">
					<stop offset="0" stopColor="#3d6bf5" />
					<stop offset="0.55" stopColor="#2a46c8" />
					<stop offset="1" stopColor="#5b3fd4" />
				</linearGradient>
				<linearGradient id="logo-b" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#fff" stopOpacity="0.42" />
					<stop offset="0.42" stopColor="#fff" stopOpacity="0" />
				</linearGradient>
				<symbol id="logo" viewBox="0 0 100 100">
					<path
						d="M22 4 H62 L96 38 V78 A18 18 0 0 1 78 96 H22 A18 18 0 0 1 4 78 V22 A18 18 0 0 1 22 4 Z"
						fill="url(#logo-a)"
					/>
					<path
						d="M22 4 H62 L96 38 V78 A18 18 0 0 1 78 96 H22 A18 18 0 0 1 4 78 V22 A18 18 0 0 1 22 4 Z"
						fill="url(#logo-b)"
					/>
					<path d="M62 4 L96 38 H70 A8 8 0 0 1 62 30 Z" fill="#fff" fillOpacity="0.28" />
					<path d="M34 26 H46 V62 H70 V74 H34 Z" fill="#fff" />
				</symbol>
			</defs>
		</svg>
	);
}
