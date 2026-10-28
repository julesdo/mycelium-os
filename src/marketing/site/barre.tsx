import { Link } from '@tanstack/react-router';
import type { CSSProperties, ReactNode } from 'react';
import { Plume } from '../../ui';
import { DUREE_ESSAI_JOURS } from '../../lib/config/tarifs';
import {
	FONCTIONNALITES,
	MENU_DU_SITE,
	type CleFonctionnalite,
	type Fonctionnalite
} from '../fonctionnalites';

/**
 * LA BARRE DU SITE (maquette V26) : la marque, la capsule des rubriques avec son glisseur, le
 * menu « Logiciel » illustré, « Se connecter » et l'essai ; au téléphone, la feuille plein écran.
 *
 * Elle lit la section qui passe sous elle et en prend le ton (`ui/site/barre.ts`). Le menu
 * « Logiciel » lit le registre (`fonctionnalites.ts`, champ `menu`) : ce que fait le produit vit à
 * un seul endroit.
 */

/** Les rubriques de la page, dans l'ordre de la capsule. */
const RUBRIQUES = [
	{ id: 'plume', nom: 'Plume' },
	{ id: 'loi', nom: 'La loi' },
	{ id: 'metiers', nom: 'Métiers' },
	{ id: 'securite', nom: 'Sécurité' },
	{ id: 'tarifs', nom: 'Tarifs' },
	{ id: 'blog', nom: 'Blog' }
] as const;

/** Le rang d'apparition de chaque rubrique dans la feuille du téléphone (celui de la maquette). */
const RANG_DANS_LA_FEUILLE = [0, 1, 2, 2, 3, 4] as const;

const ICONES: Readonly<Partial<Record<CleFonctionnalite, ReactNode>>> = {
	relances: <path d="M4 12l16-8-6 16-2-6z" />,
	calcul: (
		<>
			<path d="M5 7h14v10H5z" />
			<circle cx="12" cy="12" r="2.5" />
		</>
	),
	coffre: (
		<>
			<rect x="5" y="10.5" width="14" height="10" rx="2.5" />
			<path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
		</>
	),
	sante: <path d="M3 12h4l2-5 4 10 2-5h6" />,
	paiement: <path d="M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18" />,
	defense: <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
};

type EntreeDuMenu = Fonctionnalite & { readonly menu: NonNullable<Fonctionnalite['menu']> };

const MENU: readonly EntreeDuMenu[] = MENU_DU_SITE.map((cle) => {
	const f = FONCTIONNALITES.find((x) => x.cle === cle);
	if (!f?.menu) throw new Error(`Le menu du site nomme « ${cle} », que le registre ne décrit pas.`);
	return { ...f, menu: f.menu };
});

function Icone({ entree }: { readonly entree: EntreeDuMenu }) {
	return (
		<span className={`mega-ic v-${entree.menu.teinte}`}>
			<svg viewBox="0 0 24 24">{ICONES[entree.cle]}</svg>
		</span>
	);
}

const rang = (i: number): CSSProperties => ({ '--i': i }) as CSSProperties;

function Fleche() {
	return (
		<svg className="cta-fleche" viewBox="0 0 10 10" aria-hidden="true">
			<path className="ligne" d="M0 5h7" />
			<path className="pointe" d="M1 1l4 4-4 4" />
		</svg>
	);
}

export function BarreDuSite() {
	return (
		<>
			<header className="barre" data-barre="" data-ton="sombre" data-defile="non">
				<div className="barre-int">
					<a className="marque" href="#haut" aria-label="Letikette, accueil">
						<svg aria-hidden="true">
							<use href="#logo" />
						</svg>
						Letikette
					</a>
					<nav className="capsule" aria-label="Rubriques" data-capsule="">
						<span className="glisseur" aria-hidden="true" data-glisseur="" />
						<button
							className="lien-nav"
							type="button"
							aria-expanded="false"
							aria-controls="menu-logiciel"
							data-ouvre-mega=""
						>
							Logiciel{' '}
							<svg viewBox="0 0 10 10">
								<path d="M2 3.5l3 3 3-3" />
							</svg>
						</button>
						{RUBRIQUES.map((r) => (
							<a key={r.id} className="lien-nav" href={`#${r.id}`} data-spy={r.id}>
								{r.nom}
							</a>
						))}
					</nav>
					<div className="actions">
						<Link className="connexion" to="/connexion">
							Se connecter
						</Link>
						<Link className="bouton bouton-barre cta" to="/inscription" data-cta="" data-luit="">
							<span className="cta-fond" aria-hidden="true" />
							<span className="cta-txt">
								Essayer
								<span className="long">{'\u00a0'}gratuitement</span>
							</span>
							<Fleche />
							<span className="cta-etq" aria-hidden="true">
								<span className="cta-etq-papier">
									<b>{`${DUREE_ESSAI_JOURS} jours d’essai`}</b>0 € aujourd’hui
								</span>
							</span>
						</Link>
						<button
							className="menu"
							type="button"
							aria-label="Ouvrir le menu"
							aria-expanded="false"
							aria-controls="menu-mobile"
							data-ouvre-feuille=""
						>
							<span />
							<span />
						</button>
					</div>
				</div>
				<div className="mega" id="menu-logiciel" data-mega="">
					<div className="mega-liste">
						<span className="mono mega-titre">Le logiciel</span>
						{MENU.map((e) => (
							<a key={e.cle} className="mega-item" href={e.menu.ancre}>
								<Icone entree={e} />
								<span>
									<b>{e.menu.titre}</b>
									<span className="mega-desc">{e.menu.ligne}</span>
								</span>
							</a>
						))}
					</div>
					<a className="mega-vedette" href="#plume">
						<canvas data-paysage="mega" aria-hidden="true" />
						<span className="plume-mega">
							<Plume humeur="salue" sol decoratif />
						</span>
						<b>Plume relance pour vous.</b>
						<p>
							Il ouvre vos dossiers, prépare chaque relance et vous la montre avant qu’elle parte.
						</p>
						<span className="lien-vedette">
							Découvrir Plume{' '}
							<svg
								width="12"
								height="12"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
							>
								<path d="M3 8h10M9 4l4 4-4 4" />
							</svg>
						</span>
					</a>
				</div>
				<span className="progres-lecture" aria-hidden="true" data-progres="" />
			</header>

			<div className="feuille-menu" id="menu-mobile" data-feuille="" aria-label="Menu">
				<canvas data-paysage="feuille" aria-hidden="true" />
				<nav className="feuille-liens" aria-label="Rubriques">
					{RUBRIQUES.map((r, i) => (
						<a
							key={r.id}
							className="anim"
							style={rang(RANG_DANS_LA_FEUILLE[i] ?? i)}
							href={`#${r.id}`}
						>
							{r.nom}{' '}
							<svg viewBox="0 0 16 16">
								<path d="M3 8h10M9 4l4 4-4 4" />
							</svg>
						</a>
					))}
				</nav>
				<p className="mono feuille-titre anim" style={rang(5)}>
					Le logiciel
				</p>
				<div className="feuille-logiciel">
					{MENU.filter((e) => e.menu.court).map((e, i) => (
						<a key={e.cle} className="anim" style={rang(6 + Math.floor(i / 2))} href={e.menu.ancre}>
							<Icone entree={e} />
							{e.menu.court}
						</a>
					))}
				</div>
				<div className="feuille-pied anim" style={rang(8)}>
					<Link className="bouton bouton-encre cta" to="/inscription" data-cta="">
						<span className="cta-fond" aria-hidden="true" />
						<span className="cta-txt">Essayer gratuitement</span>
						<Fleche />
					</Link>
					<Link className="connexion-feuille" to="/connexion">
						Se connecter
					</Link>
				</div>
			</div>
		</>
	);
}
