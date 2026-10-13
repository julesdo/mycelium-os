import {
	BoutonPrincipal,
	CadrePremiersPas,
	EnTeteDEtape,
	Plume,
	ResumeDesPremiersPas,
	type ProgressionPremiersPas
} from '../../ui';

/** Une ligne du résumé, déjà dite en mots par la route. */
export interface LigneDuResume {
	readonly cle: string;
	readonly titre: string;
	readonly ligne: string;
	readonly fait: boolean;
}

/**
 * C'EST PRÊT — le dernier écran, celui qu'on contemple (13/10/2026).
 *
 * Stoic (« all set up, your plan is ready »), Nibble, Discord (« 3 of 3 ») :
 * ce qui est en place se coche, ce qui reste se dit sans reproche. Plume salue,
 * et le seul bouton mène là où le travail commence.
 *
 * ⚠️ IL NE PROMET RIEN. Il dit ce qui est en place et ce que Plume fera — jamais
 * ce qui va rentrer.
 */
export function EcranPret({
	progression,
	prenom,
	lignes,
	libelleEntree,
	onEntrer
}: {
	readonly progression: ProgressionPremiersPas;
	readonly prenom: string | null;
	readonly lignes: readonly LigneDuResume[];
	/** « Voir ce qu'on vous doit » quand il y a un montant, « Ouvrir mon espace » sinon. */
	readonly libelleEntree: string;
	readonly onEntrer: () => void;
}) {
	return (
		<CadrePremiersPas
			progression={progression}
			cle="pret"
			pied={
				<BoutonPrincipal pleineLargeur onClick={onEntrer}>
					{libelleEntree}
				</BoutonPrincipal>
			}
		>
			<EnTeteDEtape
				centre
				personnage={<Plume humeur="content" taille={104} sol />}
				titre={prenom === null ? 'C’est prêt.' : `C’est prêt, ${prenom}.`}
				explication="Je veille dès maintenant. Ce qui reste se fait quand vous voudrez : je vous le rappellerai sur l’accueil."
			/>
			<ResumeDesPremiersPas lignes={lignes} />
		</CadrePremiersPas>
	);
}
