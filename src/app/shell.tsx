import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Rail } from './rail';

const CLE = 'mycelium-rail-deplie';

/**
 * Le cadre de l'application authentifiée.
 *
 * `h-dvh` et non `h-screen` : sur téléphone, la barre d'adresse mobile fait
 * varier la hauteur visible, et `100vh` fait dépasser le contenu sous la
 * barre basse de navigation.
 */
export function Shell({ children }: { children: ReactNode }) {
	const [deplie, setDeplie] = useState(false);

	useEffect(() => {
		setDeplie(localStorage.getItem(CLE) === '1');
	}, []);

	const basculer = useCallback(() => {
		setDeplie((d) => {
			localStorage.setItem(CLE, d ? '0' : '1');
			return !d;
		});
	}, []);

	return (
		<div className="flex h-dvh w-full overflow-hidden">
			<Rail deplie={deplie} onBasculer={basculer} />
			<main className="min-w-0 flex-1 overflow-hidden pb-20 md:pb-0">{children}</main>
		</div>
	);
}
