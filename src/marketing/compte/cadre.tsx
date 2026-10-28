import { Link } from '@tanstack/react-router';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Plume, type HumeurPlume } from '../../ui';
import { demarrerRegardDePlume } from '../../ui/site/gestes';
import { demarrerPaysages } from '../../ui/site/paysages';
import { SpriteDuSite } from '../../ui/site/sprite';

/**
 * LE CADRE DES PAGES DU COMPTE, DANS LA DA DU SITE (28/10/2026).
 *
 * La connexion, l'inscription, le mot de passe et le code de vérification se posent dans la
 * même page que le site : le papier, le titre en Newsreader et son « ton », le champ en pilule de
 * l'appel, le bouton d'encre. À droite, un tableau du massif où Plume se tient, et une carte de
 * papier qui dit ce qui vient ; au téléphone, le tableau devient une bande en tête et la carte se
 * tait, pour que le formulaire reste sous le pouce.
 *
 * ⚠️ UNE SEULE CHOSE PAR ÉCRAN : un titre, au plus trois champs, un bouton plein. Ce qui n'est pas
 * la question de l'écran va dans la carte du tableau, ou ne s'écrit pas.
 */
export interface SceneDuCompte {
	readonly paysage: string;
	readonly humeur: HumeurPlume;
	/** Le ciel du tableau : au téléphone, l'en-tête s'écrit dessus à l'encre (clair) ou en blanc (sombre). */
	readonly ciel: 'clair' | 'sombre';
	readonly carte?: ReactNode;
}

export function CadreDuCompte({
	titre,
	ton,
	chapeau,
	etape,
	autre,
	scene,
	mention,
	children
}: {
	titre: string;
	ton?: string;
	chapeau?: ReactNode;
	/** « Étape 1 sur 2 », et la jauge qui avance. */
	etape?: { readonly rang: number; readonly sur: number };
	/** L'autre porte : « Pas encore de compte ? Créer un compte ». */
	autre?: {
		readonly question: string;
		readonly lien: string;
		readonly vers: '/connexion' | '/inscription';
		/** L'invitation en cours voyage avec l'autre porte : elle ne se perd pas en changeant d'avis. */
		readonly invitation?: string;
	};
	scene: SceneDuCompte;
	mention?: ReactNode;
	children: ReactNode;
}) {
	const racine = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = racine.current;
		if (!el) return;
		const arrets = [demarrerPaysages(el), demarrerRegardDePlume(el)];
		return () => arrets.forEach((a) => a());
	}, []);
	return (
		<div className="site compte" data-ciel={scene.ciel} ref={racine}>
			<SpriteDuSite />
			<div className="compte-page">
				<div className="compte-colonne">
					<header className="compte-tete">
						<Link className="marque" to="/" aria-label="Letikette, accueil">
							<svg aria-hidden="true">
								<use href="#logo" />
							</svg>
							Letikette
						</Link>
						{autre ? (
							<p className="compte-autre">
								<span className="compte-question">{autre.question}</span>
								<Link
									to={autre.vers}
									search={autre.invitation ? { invitation: autre.invitation } : {}}
								>
									{autre.lien}
								</Link>
							</p>
						) : null}
					</header>
					<main className="compte-corps">
						{etape ? (
							<p
								className="compte-etape"
								style={{ '--fait': `${(100 * etape.rang) / etape.sur}%` } as CSSProperties}
							>
								<i aria-hidden="true" />
								{`Étape ${etape.rang} sur ${etape.sur}`}
							</p>
						) : null}
						<h1>
							{titre}
							{ton ? (
								<>
									{' '}
									<span className="ton">{ton}</span>
								</>
							) : null}
						</h1>
						{chapeau ? <p className="chapeau">{chapeau}</p> : null}
						{children}
					</main>
					{mention ? <p className="compte-mention">{mention}</p> : null}
				</div>
				<aside className="compte-tableau etiquette grain">
					<canvas data-paysage={scene.paysage} aria-hidden="true" />
					<span className="pli" aria-hidden="true" />
					<div className="compte-plume" aria-hidden="true">
						<Plume humeur={scene.humeur} sol decoratif className="clair" />
					</div>
					{scene.carte ? (
						<div className="compte-scene">
							<div className="compte-carte">{scene.carte}</div>
						</div>
					) : null}
				</aside>
			</div>
		</div>
	);
}
