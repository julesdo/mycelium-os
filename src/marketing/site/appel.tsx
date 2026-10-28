import { Plume } from '../../ui';
import { DUREE_ESSAI_JOURS } from '../../lib/config/tarifs';
import { ChampInscription } from './inscription';

/**
 * L'APPEL : LE LEVER (maquette V26). Le dernier tableau de la page, un lever de soleil sur le
 * massif, avec le champ d'inscription et Plume qui fait la fête.
 *
 * Plume est le composant du produit. Son enveloppe s'appelle `plume-fete-cadre` et non
 * `plume-fete` comme dans la maquette : le composant porte déjà la classe de son humeur, et la
 * mise en page de l'enveloppe se serait appliquée au dessin lui-même.
 */
export function SectionAppel() {
	return (
		<section className="section appel" id="appel">
			<div className="enveloppe">
				<div className="appel-ombre revele">
					<div className="appel-plaque etiquette grain" data-vivant="">
						<canvas data-paysage="lever" aria-hidden="true" />
						<span className="pli" />
						<div>
							<h2>Commencez avec vos vraies factures.</h2>
							<p className="chapeau">
								Déposez un export ou branchez votre logiciel : vous voyez ce qu’on vous doit en
								quelques minutes. {DUREE_ESSAI_JOURS} jours d’essai, 0 € aujourd’hui, sans
								engagement.
							</p>
							<ChampInscription id="courriel-appel" jour />
						</div>
						<div className="plume-fete-cadre">
							<Plume humeur="fete" sol className="clair plume-fete-anim" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
