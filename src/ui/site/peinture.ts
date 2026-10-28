/**
 * LES PAYSAGES DU SITE PUBLIC (28/10/2026), transplantés de la maquette V26.
 *
 * Peints dans la page : des crêtes tirées d'un bruit fractal, chaque plan plus voilé que le
 * suivant, une brume au pied de chacun, et un fondu vers la couleur de la section. Le tirage est
 * GRAINÉ : le même canevas, à la même taille, rend les mêmes pixels à chaque visite. C'est ce qui
 * permet de comparer le site à la maquette au pixel près.
 *
 * Ce fichier vit dans `src/ui/` parce que ses palettes SONT des couleurs : la muselière les refuse
 * partout ailleurs. Les valeurs sont celles de la maquette, à l'octet ; ne pas les « arrondir ».
 */

type Arret = readonly [number, string];
type Rvb = readonly [number, number, number];

export interface Couche {
	readonly y: number;
	readonly amp: number;
	readonly fr: number;
	readonly crete?: boolean;
	readonly haut: string;
	readonly bas: string;
	readonly brume: string | null;
	readonly h: number;
}

export interface Palette {
	readonly ciel: readonly Arret[];
	readonly etoiles: number;
	readonly astre: { readonly x: number; readonly halo: number; readonly stops: readonly Arret[] };
	readonly couches: readonly Couche[];
	readonly lumiere?: string;
	readonly fonduBas?: { readonly de: number; readonly c: Rvb } | null;
	readonly fonduHaut?: { readonly a: number; readonly c: Rvb } | null;
}

function graine(depart: number): () => number {
	let s = depart;
	return () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function bruit(alea: () => number): (x: number) => number {
	const v: number[] = [];
	for (let i = 0; i < 1024; i++) v.push(alea());
	return (x) => {
		const i = Math.floor(x),
			f = x - i,
			u = f * f * (3 - 2 * f),
			a = v[i & 1023] ?? 0,
			b = v[(i + 1) & 1023] ?? 0;
		return a + (b - a) * u;
	};
}

// Le relief : des collines douces, ou des crêtes (multifractale « ridged ») dont chaque octave
// est pondérée par la précédente, ce qui creuse les vallées et affûte les sommets.
function relief(n: (x: number) => number, x: number, crete: boolean | undefined): number {
	let s = 0,
		amp = 1,
		fr = 1,
		poids = 1,
		tot = 0;
	for (let o = 0; o < 7; o++) {
		let v = n(x * fr + o * 31.7);
		if (crete) {
			v = 1 - Math.abs(2 * v - 1);
			v = v * v * poids;
			poids = Math.min(1, Math.max(0, v * 1.9));
		}
		s += v * amp;
		tot += amp;
		amp *= 0.5;
		fr *= 2.05;
	}
	return s / tot;
}

const BASE = {
	aube: {
		ciel: [
			[0, '#050a22'],
			[0.42, '#101956'],
			[0.66, '#283191'],
			[0.8, '#5d58bb'],
			[0.9, '#c48ac0'],
			[0.96, '#f6b6b8'],
			[1, '#ffd7b0']
		],
		etoiles: 170,
		astre: {
			x: 0.74,
			halo: 0.6,
			stops: [
				[0, 'rgba(255,244,228,1)'],
				[0.03, 'rgba(255,230,206,0.95)'],
				[0.12, 'rgba(255,198,190,0.45)'],
				[0.38, 'rgba(200,150,226,0.14)'],
				[1, 'rgba(200,150,226,0)']
			]
		},
		couches: [
			{
				y: 0.0,
				amp: 0.1,
				fr: 1.5,
				haut: '#e6aecb',
				bas: '#cf9ccb',
				brume: 'rgba(252,206,214,0.6)',
				h: 0.05
			},
			{
				y: 0.035,
				amp: 0.14,
				fr: 1.05,
				crete: true,
				haut: '#a98bd2',
				bas: '#8b78c4',
				brume: 'rgba(226,186,226,0.55)',
				h: 0.06
			},
			{
				y: 0.08,
				amp: 0.15,
				fr: 0.8,
				haut: '#6f64b8',
				bas: '#5752a4',
				brume: 'rgba(206,184,232,0.55)',
				h: 0.07
			},
			{
				y: 0.14,
				amp: 0.14,
				fr: 1.3,
				crete: true,
				haut: '#43449a',
				bas: '#333784',
				brume: 'rgba(226,220,246,0.7)',
				h: 0.09
			},
			{
				y: 0.22,
				amp: 0.12,
				fr: 0.9,
				haut: '#2b2f76',
				bas: '#212566',
				brume: 'rgba(240,240,250,0.88)',
				h: 0.12
			}
		],
		fonduBas: { de: 0.88, c: [245, 245, 249] }
	},
	nuit: {
		ciel: [
			[0, '#050916'],
			[0.6, '#0a1131'],
			[0.9, '#18225a'],
			[1, '#283677']
		],
		etoiles: 260,
		astre: {
			x: 0.8,
			halo: 0.32,
			stops: [
				[0, 'rgba(236,240,255,1)'],
				[0.025, 'rgba(214,222,255,0.7)'],
				[0.12, 'rgba(140,156,236,0.16)'],
				[1, 'rgba(120,140,230,0)']
			]
		},
		couches: [
			{
				y: 0.0,
				amp: 0.12,
				fr: 1.4,
				haut: '#2d3a80',
				bas: '#26326f',
				brume: 'rgba(70,90,180,0.28)',
				h: 0.06
			},
			{
				y: 0.05,
				amp: 0.16,
				fr: 1.0,
				crete: true,
				haut: '#1f2862',
				bas: '#1a2256',
				brume: 'rgba(60,80,170,0.22)',
				h: 0.07
			},
			{
				y: 0.12,
				amp: 0.15,
				fr: 0.8,
				haut: '#141b4a',
				bas: '#10163e',
				brume: 'rgba(40,56,140,0.2)',
				h: 0.08
			},
			{
				y: 0.2,
				amp: 0.13,
				fr: 1.2,
				crete: true,
				haut: '#0b1134',
				bas: '#080d2a',
				brume: null,
				h: 0
			}
		],
		lumiere: 'rgba(150,170,255,0.16)',
		fonduBas: { de: 0.8, c: [6, 10, 28] },
		fonduHaut: { a: 0.18, c: [6, 10, 28] }
	},
	lever: {
		ciel: [
			[0, '#7c88e2'],
			[0.4, '#a99deb'],
			[0.7, '#eab2d2'],
			[0.88, '#ffcfb0'],
			[1, '#ffe6c6']
		],
		etoiles: 0,
		astre: {
			x: 0.8,
			halo: 0.7,
			stops: [
				[0, 'rgba(255,252,240,1)'],
				[0.04, 'rgba(255,240,214,0.95)'],
				[0.16, 'rgba(255,214,190,0.5)'],
				[0.5, 'rgba(255,200,210,0.12)'],
				[1, 'rgba(255,200,210,0)']
			]
		},
		couches: [
			{
				y: 0.0,
				amp: 0.09,
				fr: 1.6,
				haut: '#f0bfd2',
				bas: '#e3b1cf',
				brume: 'rgba(255,224,226,0.6)',
				h: 0.05
			},
			{
				y: 0.04,
				amp: 0.13,
				fr: 1.1,
				crete: true,
				haut: '#c6a4dc',
				bas: '#b295d4',
				brume: 'rgba(244,214,236,0.55)',
				h: 0.06
			},
			{
				y: 0.1,
				amp: 0.14,
				fr: 0.85,
				haut: '#9a88cf',
				bas: '#877bc4',
				brume: 'rgba(236,224,248,0.6)',
				h: 0.08
			},
			{
				y: 0.18,
				amp: 0.13,
				fr: 1.25,
				crete: true,
				haut: '#7a72bd',
				bas: '#6c66b2',
				brume: 'rgba(246,242,252,0.7)',
				h: 0.1
			}
		]
	},
	matin: {
		ciel: [
			[0, '#c6ccf2'],
			[0.55, '#dbd4f1'],
			[0.85, '#f0d9e4'],
			[1, '#fbe5da']
		],
		etoiles: 0,
		astre: {
			x: 0.8,
			halo: 0.55,
			stops: [
				[0, 'rgba(255,250,242,1)'],
				[0.05, 'rgba(255,238,222,0.8)'],
				[0.22, 'rgba(255,216,214,0.3)'],
				[1, 'rgba(255,216,214,0)']
			]
		},
		couches: [
			{
				y: 0.0,
				amp: 0.08,
				fr: 1.6,
				haut: '#dccfe9',
				bas: '#d1c5e5',
				brume: 'rgba(250,240,246,0.6)',
				h: 0.05
			},
			{
				y: 0.05,
				amp: 0.12,
				fr: 1.1,
				crete: true,
				haut: '#c0b4df',
				bas: '#b0a6d7',
				brume: 'rgba(244,238,250,0.6)',
				h: 0.07
			},
			{
				y: 0.13,
				amp: 0.13,
				fr: 0.85,
				haut: '#a39acd',
				bas: '#948dc4',
				brume: 'rgba(248,246,252,0.7)',
				h: 0.1
			},
			{
				y: 0.24,
				amp: 0.1,
				fr: 1.3,
				crete: true,
				haut: '#8a84be',
				bas: '#7f7ab5',
				brume: 'rgba(250,249,253,0.78)',
				h: 0.1
			}
		]
	},
	brume: {
		ciel: [
			[0, '#dfe2f6'],
			[0.7, '#e9e5f5'],
			[1, '#f4e9f0']
		],
		etoiles: 0,
		astre: {
			x: 0.72,
			halo: 0.6,
			stops: [
				[0, 'rgba(255,252,246,1)'],
				[0.06, 'rgba(255,244,236,0.8)'],
				[0.3, 'rgba(255,230,232,0.25)'],
				[1, 'rgba(255,230,232,0)']
			]
		},
		couches: [
			{
				y: 0.0,
				amp: 0.12,
				fr: 2.2,
				haut: '#d6d1ec',
				bas: '#cdc8e7',
				brume: 'rgba(246,245,251,0.65)',
				h: 0.08
			},
			{
				y: 0.08,
				amp: 0.16,
				fr: 1.6,
				crete: true,
				haut: '#c2bce2',
				bas: '#b8b2dc',
				brume: 'rgba(247,246,252,0.65)',
				h: 0.1
			},
			{
				y: 0.2,
				amp: 0.14,
				fr: 1.9,
				haut: '#aea8d6',
				bas: '#a59fcf',
				brume: 'rgba(249,248,253,0.85)',
				h: 0.1
			}
		]
	},
	rosee: {
		ciel: [
			[0, '#eadff3'],
			[0.7, '#f4dfe8'],
			[1, '#fbe7dc']
		],
		etoiles: 0,
		astre: {
			x: 0.3,
			halo: 0.6,
			stops: [
				[0, 'rgba(255,252,244,1)'],
				[0.06, 'rgba(255,240,226,0.8)'],
				[0.3, 'rgba(255,220,214,0.25)'],
				[1, 'rgba(255,220,214,0)']
			]
		},
		couches: [
			{
				y: 0.0,
				amp: 0.12,
				fr: 2.1,
				haut: '#e5cfdf',
				bas: '#ddc6db',
				brume: 'rgba(252,244,247,0.65)',
				h: 0.08
			},
			{
				y: 0.08,
				amp: 0.16,
				fr: 1.5,
				crete: true,
				haut: '#d2bbd7',
				bas: '#c9b2d2',
				brume: 'rgba(250,244,250,0.65)',
				h: 0.1
			},
			{
				y: 0.2,
				amp: 0.14,
				fr: 1.8,
				haut: '#bfa8ce',
				bas: '#b6a0c8',
				brume: 'rgba(251,248,252,0.85)',
				h: 0.1
			}
		]
	},
	vallee: {
		ciel: [
			[0, '#aeb6f4'],
			[0.5, '#cfc4f2'],
			[0.85, '#f4cfe0'],
			[1, '#ffe0cc']
		],
		etoiles: 0,
		astre: {
			x: 0.28,
			halo: 0.55,
			stops: [
				[0, 'rgba(255,250,240,1)'],
				[0.05, 'rgba(255,238,220,0.85)'],
				[0.2, 'rgba(255,214,214,0.35)'],
				[1, 'rgba(255,214,214,0)']
			]
		},
		couches: [
			{
				y: 0.0,
				amp: 0.1,
				fr: 1.7,
				haut: '#e3c2de',
				bas: '#d6b6da',
				brume: 'rgba(255,230,236,0.55)',
				h: 0.06
			},
			{
				y: 0.06,
				amp: 0.15,
				fr: 1.15,
				crete: true,
				haut: '#b9a4dc',
				bas: '#a693d3',
				brume: 'rgba(240,226,246,0.55)',
				h: 0.07
			},
			{
				y: 0.15,
				amp: 0.15,
				fr: 0.9,
				haut: '#8f86cc',
				bas: '#7d77c0',
				brume: 'rgba(246,242,252,0.7)',
				h: 0.1
			},
			{
				y: 0.26,
				amp: 0.12,
				fr: 1.3,
				crete: true,
				haut: '#6f6bb8',
				bas: '#625fac',
				brume: 'rgba(250,248,253,0.6)',
				h: 0.1
			}
		]
	}
} satisfies Record<string, Palette>;

// La vie d'une facture impayée : le même massif, de mars à octobre, puis la nuit de 2031.
const RELIEF = [
	{ y: 0.0, amp: 0.09, fr: 1.5, h: 0.05 },
	{ y: 0.035, amp: 0.13, fr: 1.05, crete: true, h: 0.06 },
	{ y: 0.08, amp: 0.14, fr: 0.8, h: 0.07 },
	{ y: 0.14, amp: 0.13, fr: 1.3, crete: true, h: 0.09 },
	{ y: 0.22, amp: 0.11, fr: 0.9, h: 0.12 }
] as const;

type Teintes = readonly [string, string, string];
function massif(c: readonly [Teintes, Teintes, Teintes, Teintes, Teintes]): Couche[] {
	return RELIEF.map((g, i) => {
		const [haut, bas, brume] = c[i] ?? c[0];
		return { ...g, haut, bas, brume };
	});
}

const SAISONS = {
	printemps: {
		ciel: [
			[0, '#93a9e6'],
			[0.35, '#b5c0ee'],
			[0.6, '#d3d0f2'],
			[0.78, '#e9daef'],
			[0.9, '#f6e5ea'],
			[0.96, '#fbede6'],
			[1, '#fff2e4']
		],
		etoiles: 0,
		astre: {
			x: 0.18,
			halo: 0.5,
			stops: [
				[0, 'rgba(255,253,246,1)'],
				[0.04, 'rgba(255,246,232,0.9)'],
				[0.14, 'rgba(255,232,224,0.42)'],
				[0.4, 'rgba(232,222,250,0.12)'],
				[1, 'rgba(232,222,250,0)']
			]
		},
		couches: massif([
			['#d8d2ee', '#cec8ea', 'rgba(250,244,248,0.6)'],
			['#bbb5e2', '#aca7da', 'rgba(244,240,250,0.55)'],
			['#9995cf', '#8b88c6', 'rgba(240,238,250,0.6)'],
			['#7a78bb', '#6d6cb0', 'rgba(246,245,252,0.7)'],
			['#5d5da4', '#515196', 'rgba(250,250,253,0.82)']
		]),
		lumiere: 'rgba(255,240,222,0.3)'
	},
	automne: {
		ciel: [
			[0, '#0a1135'],
			[0.35, '#1c2365'],
			[0.6, '#3a3998'],
			[0.78, '#8a5eb5'],
			[0.9, '#df89a7'],
			[0.96, '#f6ac97'],
			[1, '#ffc88e']
		],
		etoiles: 110,
		astre: {
			x: 0.8,
			halo: 0.6,
			stops: [
				[0, 'rgba(255,236,210,1)'],
				[0.04, 'rgba(255,214,182,0.95)'],
				[0.14, 'rgba(255,170,150,0.45)'],
				[0.4, 'rgba(200,120,190,0.14)'],
				[1, 'rgba(200,120,190,0)']
			]
		},
		couches: massif([
			['#d88fb0', '#c482a8', 'rgba(250,190,200,0.55)'],
			['#9a78c3', '#896cb9', 'rgba(222,172,216,0.5)'],
			['#695aa7', '#5a4f99', 'rgba(202,172,226,0.5)'],
			['#3f397e', '#342f6f', 'rgba(202,192,236,0.45)'],
			['#241f54', '#1c1847', 'rgba(212,202,240,0.42)']
		]),
		lumiere: 'rgba(255,190,160,0.34)'
	},
	ete: {
		ciel: [
			[0, '#6585dc'],
			[0.35, '#89a1e8'],
			[0.6, '#b4b5ed'],
			[0.78, '#e1c1df'],
			[0.9, '#f9cfc0'],
			[0.96, '#ffdbb4'],
			[1, '#ffe5bd']
		],
		etoiles: 0,
		astre: {
			x: 0.86,
			halo: 0.55,
			stops: [
				[0, 'rgba(255,250,236,1)'],
				[0.04, 'rgba(255,236,206,0.92)'],
				[0.15, 'rgba(255,212,170,0.42)'],
				[0.42, 'rgba(240,190,200,0.12)'],
				[1, 'rgba(240,190,200,0)']
			]
		},
		couches: massif([
			['#e7bccb', '#dcb0c6', 'rgba(255,226,214,0.55)'],
			['#bf9fd3', '#ae93cb', 'rgba(244,216,232,0.5)'],
			['#8f82c4', '#8077ba', 'rgba(236,224,246,0.55)'],
			['#6964ad', '#5d59a1', 'rgba(242,238,250,0.62)'],
			['#4a4a92', '#404086', 'rgba(248,246,252,0.78)']
		]),
		lumiere: 'rgba(255,214,170,0.34)'
	},
	rosee2: {
		ciel: [
			[0, '#a8b1ec'],
			[0.35, '#c4bdef'],
			[0.6, '#dcc9ef'],
			[0.78, '#efd2e6'],
			[0.9, '#f9dde2'],
			[0.96, '#fde6df'],
			[1, '#ffeedd']
		],
		etoiles: 0,
		astre: {
			x: 0.5,
			halo: 0.55,
			stops: [
				[0, 'rgba(255,252,244,1)'],
				[0.05, 'rgba(255,242,228,0.85)'],
				[0.18, 'rgba(255,224,222,0.35)'],
				[0.45, 'rgba(240,214,240,0.1)'],
				[1, 'rgba(240,214,240,0)']
			]
		},
		couches: massif([
			['#e3cfe4', '#d9c5df', 'rgba(252,242,246,0.6)'],
			['#c8b4dc', '#bcaad5', 'rgba(248,240,250,0.55)'],
			['#a596cd', '#998bc4', 'rgba(244,240,251,0.6)'],
			['#8478b9', '#776dae', 'rgba(248,246,252,0.7)'],
			['#655d9f', '#5a5394', 'rgba(251,250,253,0.84)']
		]),
		lumiere: 'rgba(255,232,224,0.3)'
	},
	nuit31: {
		ciel: [
			[0, '#03061a'],
			[0.35, '#080e31'],
			[0.6, '#121a4e'],
			[0.78, '#1f2866'],
			[0.9, '#30397f'],
			[0.96, '#434a94'],
			[1, '#5b58a8']
		],
		etoiles: 240,
		astre: {
			x: 0.86,
			halo: 0.34,
			stops: [
				[0, 'rgba(255,236,214,0.95)'],
				[0.03, 'rgba(255,214,190,0.6)'],
				[0.14, 'rgba(180,150,230,0.2)'],
				[0.4, 'rgba(120,130,230,0.06)'],
				[1, 'rgba(120,130,230,0)']
			]
		},
		couches: massif([
			['#3c4290', '#343a82', 'rgba(110,110,200,0.3)'],
			['#2b3074', '#252a68', 'rgba(90,96,190,0.26)'],
			['#1d225a', '#191d50', 'rgba(70,80,170,0.24)'],
			['#121641', '#0f1338', 'rgba(60,70,150,0.22)'],
			['#090c2a', '#070a22', 'rgba(50,58,130,0.3)']
		]),
		lumiere: 'rgba(255,200,180,0.14)'
	},
	// Le plein jour des tarifs : le même massif, sous un ciel clair.
	midi: {
		ciel: [
			[0, '#7f98e2'],
			[0.35, '#9fb1ec'],
			[0.6, '#c3caf2'],
			[0.78, '#dfdcf4'],
			[0.9, '#efe6f1'],
			[0.96, '#f8eeec'],
			[1, '#fdf3e8']
		],
		etoiles: 0,
		astre: {
			x: 0.9,
			halo: 0.42,
			stops: [
				[0, 'rgba(255,254,248,1)'],
				[0.04, 'rgba(255,248,236,0.9)'],
				[0.15, 'rgba(255,236,228,0.36)'],
				[0.42, 'rgba(232,226,250,0.1)'],
				[1, 'rgba(232,226,250,0)']
			]
		},
		couches: massif([
			['#d4d3f0', '#cac9ec', 'rgba(248,246,252,0.6)'],
			['#b3b4e4', '#a5a7dc', 'rgba(242,242,252,0.55)'],
			['#8f94d0', '#8288c6', 'rgba(238,240,252,0.6)'],
			['#6e74bb', '#6268ae', 'rgba(244,245,252,0.7)'],
			['#50579f', '#464c92', 'rgba(250,250,254,0.84)']
		]),
		lumiere: 'rgba(255,246,230,0.26)'
	}
} satisfies Record<string, Palette>;

function rgbaDe(c: string): [number, number, number, number] {
	if (c.charAt(0) === '#')
		return [
			parseInt(c.slice(1, 3), 16),
			parseInt(c.slice(3, 5), 16),
			parseInt(c.slice(5, 7), 16),
			1
		];
	const m = (c.match(/[\d.]+/g) ?? []).map(Number);
	return [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0, m[3] ?? 1];
}

function meler(a: string, b: string, t: number): string {
	const x = rgbaDe(a),
		y = rgbaDe(b);
	return (
		'rgba(' +
		Math.round(x[0] + (y[0] - x[0]) * t) +
		',' +
		Math.round(x[1] + (y[1] - x[1]) * t) +
		',' +
		Math.round(x[2] + (y[2] - x[2]) * t) +
		',' +
		(x[3] + (y[3] - x[3]) * t).toFixed(3) +
		')'
	);
}

/** Une heure entre deux palettes du même massif (mêmes arrêts, mêmes couches). */
export function melanger(A: Palette, B: Palette, t: number): Palette {
	return {
		ciel: A.ciel.map((s, i) => [s[0], meler(s[1], B.ciel[i]?.[1] ?? s[1], t)] as const),
		etoiles: Math.round(A.etoiles + (B.etoiles - A.etoiles) * t),
		astre: {
			x: A.astre.x + (B.astre.x - A.astre.x) * t,
			halo: A.astre.halo + (B.astre.halo - A.astre.halo) * t,
			stops: A.astre.stops.map(
				(s, i) => [s[0], meler(s[1], B.astre.stops[i]?.[1] ?? s[1], t)] as const
			)
		},
		couches: A.couches.map((k, i) => {
			const autre = B.couches[i] ?? k;
			return {
				...k,
				haut: meler(k.haut, autre.haut, t),
				bas: meler(k.bas, autre.bas, t),
				brume: k.brume && autre.brume ? meler(k.brume, autre.brume, t) : k.brume
			};
		}),
		lumiere: A.lumiere && B.lumiere ? meler(A.lumiere, B.lumiere, t) : A.lumiere
	};
}

export const PALETTES = {
	...BASE,
	...SAISONS,
	// L'aube en carte : sans fondu vers le papier, quelques étoiles de plus.
	carte: { ...BASE.aube, fonduBas: null, etoiles: 90 },
	mega: BASE.vallee,
	ecran: BASE.matin,
	feuille: { ...BASE.lever, fonduHaut: { a: 0.55, c: [245, 245, 249] } },
	// Les trois heures de la sécurité : la nuit, l'heure bleue, l'aube.
	secnuit: melanger(SAISONS.nuit31, SAISONS.automne, 0.12),
	secbleue: melanger(SAISONS.nuit31, SAISONS.automne, 0.5),
	secaube: melanger(SAISONS.automne, SAISONS.ete, 0.35),
	// Les heures du blog : le même massif, une heure par article.
	blogA: SAISONS.rosee2,
	blogB: SAISONS.printemps,
	blogC: SAISONS.ete,
	blogD: melanger(SAISONS.nuit31, SAISONS.automne, 0.45)
} satisfies Record<string, Palette>;

export type NomPalette = keyof typeof PALETTES;

export function estPalette(nom: string): nom is NomPalette {
	return Object.prototype.hasOwnProperty.call(PALETTES, nom);
}

/** L'horizon de chaque paysage, en part de la hauteur du canevas (0,6 par défaut). */
export const HORIZONS: Partial<Record<NomPalette, number>> = {
	nuit: 0.6,
	lever: 0.66,
	vallee: 0.48,
	matin: 0.44,
	brume: 0.5,
	rosee: 0.5,
	carte: 0.5,
	mega: 0.4,
	feuille: 0.62,
	ete: 0.66,
	rosee2: 0.72,
	nuit31: 0.6,
	ecran: 0.74,
	midi: 0.56,
	secnuit: 0.7,
	secbleue: 0.72,
	secaube: 0.7
};

function rgba(c: Rvb, a: number): string {
	return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}

/**
 * Peint `p` dans `cv`, à la taille où le canevas est affiché. `echelle` sous 1 peint une image
 * plus légère pendant un mouvement ; la dernière image se repeint à 1.
 */
export function peindre(
	cv: HTMLCanvasElement,
	p: Palette,
	horizon: number,
	echelle?: number
): void {
	const r = cv.getBoundingClientRect();
	const dpr = Math.min(2, window.devicePixelRatio || 1) * (echelle || 1);
	const W = Math.round(r.width * dpr),
		H = Math.round(r.height * dpr);
	if (!W || !H) return;
	if (cv.width !== W) cv.width = W;
	if (cv.height !== H) cv.height = H;
	const c = cv.getContext('2d');
	if (!c) return;
	const hz = H * horizon;
	const g = c.createLinearGradient(0, 0, 0, hz);
	p.ciel.forEach((s) => g.addColorStop(s[0], s[1]));
	c.fillStyle = g;
	c.fillRect(0, 0, W, hz + 1);
	const piedDuCiel = p.ciel[p.ciel.length - 1];
	if (piedDuCiel) {
		c.fillStyle = piedDuCiel[1];
		c.fillRect(0, hz, W, H - hz);
	}
	const alea = graine(11);
	for (let e = 0; e < p.etoiles; e++) {
		const ex = alea() * W,
			ey = Math.pow(alea(), 1.6) * hz * 0.85,
			er = (alea() * 0.9 + 0.35) * dpr;
		c.globalAlpha = (0.25 + alea() * 0.7) * (1 - ey / hz);
		c.fillStyle = '#fff';
		c.beginPath();
		c.arc(ex, ey, er, 0, 6.3);
		c.fill();
	}
	c.globalAlpha = 1;
	const ax = W * p.astre.x,
		ay = hz + H * 0.004,
		rad = Math.max(W, H) * p.astre.halo;
	const hg = c.createRadialGradient(ax, ay, 0, ax, ay, rad);
	p.astre.stops.forEach((s) => hg.addColorStop(s[0], s[1]));
	c.fillStyle = hg;
	c.fillRect(0, 0, W, H);
	const aleaRelief = graine(29);
	const pasX = 2 * dpr,
		dernier = p.couches.length - 1;
	p.couches.forEach((k, i) => {
		const n = bruit(aleaRelief);
		const base = hz + H * k.y,
			amp = H * k.amp;
		const hauteurs: number[] = [];
		let min = Infinity,
			max = -Infinity;
		for (let x = 0; x <= W + pasX; x += pasX) {
			const v = relief(n, ((x / dpr) * k.fr) / 640 + i * 9.1, k.crete);
			hauteurs.push(v);
			if (v < min) min = v;
			if (v > max) max = v;
		}
		c.beginPath();
		c.moveTo(0, H);
		hauteurs.forEach((v, j) => {
			const u = Math.pow((v - min) / (max - min || 1), k.crete ? 1.45 : 1.15);
			c.lineTo(j * pasX, base - (0.12 + 0.88 * u) * amp);
		});
		c.lineTo(W, H);
		c.closePath();
		const lg = c.createLinearGradient(0, base - amp, 0, base + H * 0.3);
		lg.addColorStop(0, k.haut);
		lg.addColorStop(1, k.bas);
		c.fillStyle = lg;
		c.fill();
		if (k.brume) {
			const b0 = base - amp * 0.3,
				b1 = i === dernier ? H : base + H * k.h;
			const bg = c.createLinearGradient(0, b0, 0, b1);
			const trans = k.brume.replace(/[\d.]+\)$/, '0)');
			bg.addColorStop(0, trans);
			if (i === dernier) {
				bg.addColorStop(0.45, k.brume);
				bg.addColorStop(1, k.brume.replace(/[\d.]+\)$/, '0.96)'));
			} else {
				bg.addColorStop(0.6, k.brume);
				bg.addColorStop(1, trans);
			}
			c.fillStyle = bg;
			c.fillRect(0, b0, W, b1 - b0);
		}
	});
	// La lumière de l'astre sur les crêtes, côté soleil.
	c.globalCompositeOperation = 'screen';
	const lum = c.createRadialGradient(ax, ay, 0, ax, ay, W * 0.5);
	lum.addColorStop(0, p.lumiere || 'rgba(255,214,190,0.34)');
	lum.addColorStop(1, 'rgba(255,214,190,0)');
	c.fillStyle = lum;
	c.fillRect(0, 0, W, H);
	c.globalCompositeOperation = 'source-over';
	if (p.fonduBas) {
		const f0 = H * p.fonduBas.de;
		const fg = c.createLinearGradient(0, f0, 0, H);
		fg.addColorStop(0, rgba(p.fonduBas.c, 0));
		fg.addColorStop(0.55, rgba(p.fonduBas.c, 0.75));
		fg.addColorStop(1, rgba(p.fonduBas.c, 1));
		c.fillStyle = fg;
		c.fillRect(0, f0, W, H - f0);
	}
	if (p.fonduHaut) {
		const hh = H * p.fonduHaut.a;
		const fh = c.createLinearGradient(0, 0, 0, hh);
		fh.addColorStop(0, rgba(p.fonduHaut.c, 1));
		fh.addColorStop(1, rgba(p.fonduHaut.c, 0));
		c.fillStyle = fh;
		c.fillRect(0, 0, W, hh);
	}
}
