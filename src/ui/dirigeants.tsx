import { Spinner } from '@cladd-ui/react';
import { BoutonTexte } from './bouton';
import { dateCourte } from './format';
import { LigneBouton, ListeAnalyses } from './navigation';

/** Un dirigeant tel que le registre le publie : « Olivier ROUX », « Président de SAS ». */
export interface DirigeantPropose {
	readonly nom: string;
	readonly fonction: string;
}

/**
 * La lecture des dirigeants, du point de vue de l'écran.
 *
 * ⚠️ « INCONNU » N'EST PAS « AUCUN ». Un registre qui ne répond pas rend un
 * échec qui se lit ; une société sans dirigeant personne physique rend une
 * liste vide, et l'écran le dit autrement.
 */
export type EtatDirigeants =
	| { readonly phase: 'REPOS' }
	| { readonly phase: 'EN_COURS' }
	| {
			readonly phase: 'TROUVE';
			readonly dirigeants: readonly DirigeantPropose[];
			/** Le jour de la lecture : une source publique se cite avec sa date. */
			readonly releveeLe: string;
	  }
	| { readonly phase: 'ECHEC'; readonly message: string };

/**
 * « QUI SIGNE », PROPOSÉ D'APRÈS LE REGISTRE (01/10/2026).
 *
 * Le gérant tapait le nom et la fonction d'un signataire que le registre des
 * entreprises publie déjà. Un toucher sur « Proposer d'après le registre »,
 * puis un toucher sur la bonne personne, remplit les deux champs ; ils restent
 * modifiables, parce que c'est le gérant qui sait qui signe vraiment.
 *
 * ⚠️ À LA DEMANDE, ET PAS À L'OUVERTURE. La lecture interroge un service
 * public ; la lancer dès qu'un formulaire s'affiche la ferait pour des champs
 * déjà remplis.
 */
export function DirigeantsProposes({
	etat,
	onDemander,
	onChoisir
}: {
	etat: EtatDirigeants;
	onDemander: () => void;
	onChoisir: (dirigeant: DirigeantPropose) => void;
}) {
	if (etat.phase === 'REPOS') {
		return (
			<BoutonTexte className="self-start" onClick={onDemander}>
				Proposer d’après le registre
			</BoutonTexte>
		);
	}
	if (etat.phase === 'EN_COURS') {
		return (
			<p className="flex items-center gap-cladd-3xs px-1 text-cladd-2xs text-cladd-fg-soft">
				<Spinner size="xs" />
				Lecture du registre des entreprises…
			</p>
		);
	}
	if (etat.phase === 'ECHEC') {
		return <p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">{etat.message}</p>;
	}
	if (etat.dirigeants.length === 0) {
		return (
			<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				Le registre ne nomme aucun dirigeant personne physique pour cette entreprise.
			</p>
		);
	}
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
				D’après le registre des entreprises, relevé du {dateCourte(etat.releveeLe)}
			</p>
			<ListeAnalyses>
				{etat.dirigeants.map((dirigeant) => (
					<LigneBouton
						key={`${dirigeant.nom}|${dirigeant.fonction}`}
						genre="contenu"
						titre={dirigeant.nom}
						precision={dirigeant.fonction}
						onClick={() => onChoisir(dirigeant)}
					/>
				))}
			</ListeAnalyses>
		</div>
	);
}
