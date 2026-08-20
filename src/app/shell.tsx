import { useCallback, type ReactNode } from 'react';
import { Rail } from './rail';
import { usePreference } from './use-preference';

const CLE = 'mycelium-rail-deplie';
const ETATS = ['0', '1'] as const;

/**
 * Le cadre de l'application authentifiée.
 *
 * `h-dvh` et non `h-screen` : sur téléphone, la barre d'adresse mobile fait
 * varier la hauteur visible, et `100vh` fait dépasser le contenu sous la barre
 * basse de navigation.
 */
export function Shell({ children }: { children: ReactNode }) {
	const [etat, setEtat] = usePreference(CLE, '0', ETATS);
	const deplie = etat === '1';

	const basculer = useCallback(() => setEtat(deplie ? '0' : '1'), [deplie, setEtat]);

	return (
		<div className="flex h-dvh w-full overflow-hidden">
			<Rail deplie={deplie} onBasculer={basculer} />
			{/* La marge basse dégage la barre de navigation fixe du téléphone, qui
			    mesure 81px. `pb-20` (80px) laissait le dernier pixel du contenu
			    dessous ; on prend une marge franche plutôt qu'un ajustement au
			    pixel qui casserait au premier changement de taille de bouton. */}
			<main className="min-w-0 flex-1 overflow-hidden pb-24 md:pb-0">{children}</main>
		</div>
	);
}
