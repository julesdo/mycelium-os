import { Link } from '@tanstack/react-router';
import { MESURES } from '../page-securite';
import { SectionAppel } from './appel';
import { CoquilleDuSite } from './coquille';
import { SectionSecurite } from './securite';

/**
 * LA PAGE « SÉCURITÉ », D'APRÈS LA MAQUETTE V26 (28/10/2026).
 *
 * La section de l'accueil (les trois tableaux : le scellé, le relevé, la lettre), puis chaque
 * mesure en place, avec ce qu'elle ne fait pas : la liste de la page d'avant (`MESURES`), qui ne
 * dit rien de plus que la politique de confidentialité, laquelle fait foi. Jamais « hébergé en
 * France », jamais un chiffrement présenté comme hors de notre portée.
 *
 * Les mesures prennent la forme des « portes » de la section des tarifs.
 */
export function SectionMesures() {
	return (
		<section className="section sur-demande mesures" id="mesures">
			<div className="enveloppe">
				<div className="revele">
					<h2>
						Comment nous protégeons vos données.{' '}
						<span className="ton">Et ce que ces mesures ne font pas.</span>
					</h2>
					<p className="chapeau">
						Les mesures en place. Le détail, avec nos prestataires et leur pays, est dans notre{' '}
						<Link to="/politique-de-confidentialite">politique de confidentialité</Link>, qui fait
						foi.
					</p>
				</div>
				<div className="portes portes-offres">
					{MESURES.map((m) => (
						<div className="porte" key={m.titre}>
							<h3>{m.titre}</h3>
							{m.lignes.map((ligne) => (
								<p key={ligne}>{ligne}</p>
							))}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export function PageSecuriteDuSite() {
	return (
		<CoquilleDuSite>
			<SectionSecurite surSaPage />
			<SectionMesures />
			<SectionAppel />
		</CoquilleDuSite>
	);
}
