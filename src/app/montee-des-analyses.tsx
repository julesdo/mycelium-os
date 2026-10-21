import { useState, type ReactNode } from 'react';
import { LIMITES } from '../lib/config/tarifs';
import { dateLisible } from '../lib/verticales/recouvrement/calendrier';
import {
	FeuilleDeMontee,
	formuleAvecPlusDAnalyses,
	monteeVers,
	nomDeLaFormule,
	retourDuQuota
} from '../screens/compte/montee';
import { nomDeLaFormuleEnCours, useFormuleDuCompte } from './formule-du-compte';

/**
 * LE QUOTA D'ANALYSES ATTEINT, AU MOMENT DU BESOIN (21/10/2026, le parcours de
 * l'habitude, moment 6). L'analyse refusée pour le mois ouvre la formule du dessus,
 * avec la date où le quota revient ; une formule changée relance l'analyse. Sans
 * formule au-dessus (Pro) ou sans caisse (un membre), seul le message dit la date.
 */
export function useMonteeDesAnalyses(
	titre: string,
	onEnPlace: () => void
): { readonly proposer: () => void; readonly feuille: ReactNode } {
	const compte = useFormuleDuCompte();
	const [ouverte, setOuverte] = useState(false);
	const [maintenant] = useState(() => Date.now());
	const montee =
		compte === undefined
			? null
			: monteeVers(compte, formuleAvecPlusDAnalyses(compte.abonnement.limites.analysesParMois));
	const feuille =
		compte === undefined || montee === null ? null : (
			<FeuilleDeMontee
				montee={montee}
				ouverte={ouverte}
				onFermer={() => setOuverte(false)}
				titre={titre}
				contexte={`${nomDeLaFormule(montee.cible)} compte ${LIMITES[montee.cible].analysesParMois} analyses par mois. Les ${compte.abonnement.limites.analysesParMois} de ${nomDeLaFormuleEnCours(compte)} reviennent le ${dateLisible(retourDuQuota(maintenant))}.`}
				libelleConfirmer={`Passer à ${nomDeLaFormule(montee.cible)} et analyser`}
				onEnPlace={() => {
					setOuverte(false);
					onEnPlace();
				}}
				onSouscription={() => setOuverte(false)}
			/>
		);
	return {
		proposer: () => {
			if (montee !== null) setOuverte(true);
		},
		feuille
	};
}
