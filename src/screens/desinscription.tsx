import { useState } from 'react';
import { BoutonPrincipal } from '../ui';

/**
 * LA PAGE DE DÉSINSCRIPTION D'UN PROSPECT (19/10/2026).
 *
 * On y arrive par le lien du pied d'un e-mail de prospection. Elle ne montre rien de
 * la personne (ni nom, ni entreprise, ni adresse) : le jeton de l'adresse suffit, et
 * la même page s'affiche quel qu'il soit. Un seul bouton, parce qu'un lien ouvert par
 * un antivirus de messagerie ne doit pas désinscrire à la place de la personne.
 */
export function EcranDesinscription({
	onConfirmer
}: {
	readonly onConfirmer: () => Promise<void>;
}) {
	const [etat, setEtat] = useState<'question' | 'en-cours' | 'fait' | 'erreur'>('question');

	async function confirmer() {
		setEtat('en-cours');
		try {
			await onConfirmer();
			setEtat('fait');
		} catch {
			setEtat('erreur');
		}
	}

	if (etat === 'fait') {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-xs text-center">
				<h1 className="text-cladd-md font-semibold">C’est fait.</h1>
				<p className="max-w-sm text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Vous ne recevrez plus de message de prospection de Letikette. Vos coordonnées sont
					effacées de notre fichier de prospection.
				</p>
			</main>
		);
	}

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-cladd-xs p-cladd-xs text-center">
			<div className="flex max-w-sm flex-col gap-cladd-2xs">
				<h1 className="text-cladd-md font-semibold">Ne plus recevoir nos messages</h1>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Letikette ne vous écrira plus et ne vous appellera plus. Vos coordonnées seront effacées
					de son fichier de prospection.
				</p>
				{etat === 'erreur' ? (
					<p className="text-cladd-xs leading-relaxed">
						Cela n’a pas fonctionné. Réessayez, ou répondez « stop » au message reçu.
					</p>
				) : null}
			</div>
			<BoutonPrincipal disabled={etat === 'en-cours'} onClick={() => void confirmer()}>
				Ne plus rien recevoir
			</BoutonPrincipal>
		</main>
	);
}
