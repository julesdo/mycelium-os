import { Link } from '@tanstack/react-router';
import { getLegalEmailAddress } from '../../lib/config/legal';
import { FONCTIONNALITES, type CleFonctionnalite } from '../fonctionnalites';

/**
 * LE PIED DU SITE (maquette V26) : la marque, trois colonnes, la phrase qui borne le produit.
 *
 * ⚠️ PLUS DE LIENS QUE LA MAQUETTE, EXPRÈS. Ses lignes n'étaient pas des liens, et elle n'avait
 * aucun lien légal. Le site doit garder visibles les cinq pages légales (mentions, conditions,
 * confidentialité, remboursement, sous-traitance), et mener aux pages qu'aucune autre ne lie
 * (la procédure sans juge, les experts-comptables, le fondateur) : sans cela, elles deviennent
 * orphelines (`aucun-ecran-orphelin.test.ts`). Le dessin est celui de la maquette ; la rangée
 * légale suit la phrase, dans son style (`styles/site/ajouts.css`).
 */
const LOGICIEL: ReadonlyArray<readonly [CleFonctionnalite, `#${string}`]> = [
	['plume', '#plume'],
	['relances', '#plume'],
	['coffre', '#securite'],
	['sante', '#tout']
];

function nomDe(cle: CleFonctionnalite): string {
	const f = FONCTIONNALITES.find((x) => x.cle === cle);
	if (!f) throw new Error(`Le pied nomme « ${cle} », que le registre ne décrit pas.`);
	return f.nom;
}

export function PiedDuSite() {
	return (
		<footer className="pied">
			<div className="enveloppe">
				<div>
					<a className="marque" href="#haut">
						<svg aria-hidden="true">
							<use href="#logo" />
						</svg>
						Letikette
					</a>
				</div>
				<div>
					<h4>Le logiciel</h4>
					<ul>
						{LOGICIEL.map(([cle, ancre]) => (
							<li key={cle}>
								<a href={ancre}>{nomDe(cle)}</a>
							</li>
						))}
					</ul>
				</div>
				<div>
					<h4>Ressources</h4>
					<ul>
						<li>
							<a href="#tarifs">Tarifs</a>
						</li>
						<li>
							<Link to="/securite">Sécurité</Link>
						</li>
						<li>
							<Link to="/taux-des-penalites-de-retard">Taux des pénalités</Link>
						</li>
						<li>
							<Link to="/procedure-sans-juge">La procédure sans juge</Link>
						</li>
						<li>
							<Link to="/experts-comptables">Experts-comptables</Link>
						</li>
						<li>
							<a href="#blog">Blog</a>
						</li>
					</ul>
				</div>
				<div>
					<h4>Compte</h4>
					<ul>
						<li>
							<Link to="/connexion">Se connecter</Link>
						</li>
						<li>
							<Link to="/inscription">Créer un compte</Link>
						</li>
						<li>
							<a href={`mailto:${getLegalEmailAddress()}`}>Nous écrire</a>
						</li>
						<li>
							<Link to="/fondateur">Le fondateur</Link>
						</li>
					</ul>
				</div>
				<p className="mention">
					Letikette mesure ce qu’on vous doit, le documente et surveille ses échéances. Il n’exerce
					aucune activité de recouvrement pour compte de tiers, ne manipule aucun fonds et ne
					délivre aucun conseil juridique. Toute décision d’engager une procédure reste la vôtre.
				</p>
				<nav className="pied-legal" aria-label="Informations légales">
					<Link to="/mentions-legales">Mentions légales</Link>
					<Link to="/conditions-generales">Conditions générales</Link>
					<Link to="/politique-de-confidentialite">Confidentialité</Link>
					<Link to="/remboursement">Remboursement</Link>
					<Link to="/accord-de-sous-traitance">Sous-traitance des données</Link>
				</nav>
			</div>
		</footer>
	);
}
