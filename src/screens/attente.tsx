import { useState } from 'react';
import { BoutonPrincipal, BoutonTexte } from '../ui';

/**
 * LA CONFIRMATION D'UNE INSCRIPTION À LA LISTE D'ATTENTE (19/10/2026, audit, décision 16).
 *
 * On y arrive par le lien de l'e-mail de confirmation. Elle ne montre rien de la personne :
 * le jeton suffit, et la même page s'affiche quel qu'il soit. C'est le BOUTON qui confirme,
 * parce qu'un lien ouvert par l'antivirus d'une messagerie ne doit confirmer personne. Le
 * second geste retire l'adresse de la liste.
 */
export function EcranAttente({
	onConfirmer,
	onQuitter
}: {
	readonly onConfirmer: () => Promise<void>;
	readonly onQuitter: () => Promise<void>;
}) {
	const [etat, setEtat] = useState<'question' | 'en-cours' | 'confirmee' | 'retiree' | 'erreur'>(
		'question'
	);

	async function faire(geste: () => Promise<void>, fin: 'confirmee' | 'retiree') {
		setEtat('en-cours');
		try {
			await geste();
			setEtat(fin);
		} catch {
			setEtat('erreur');
		}
	}

	if (etat === 'confirmee' || etat === 'retiree') {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-xs text-center">
				<h1 className="text-cladd-md font-semibold">
					{etat === 'confirmee' ? 'C’est confirmé.' : 'C’est fait.'}
				</h1>
				<p className="max-w-sm text-cladd-xs leading-relaxed text-cladd-fg-soft">
					{etat === 'confirmee'
						? 'Vous serez prévenu par e-mail le jour où la procédure sans juge s’ouvre, et à aucune autre occasion.'
						: 'Votre adresse est retirée de la liste d’attente. Vous ne recevrez rien.'}
				</p>
			</main>
		);
	}

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-cladd-xs p-cladd-xs text-center">
			<div className="flex max-w-sm flex-col gap-cladd-2xs">
				<h1 className="text-cladd-md font-semibold">Confirmer votre inscription</h1>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Vous serez prévenu par e-mail le jour où la procédure sans juge entre entreprises s’ouvre.
					Un lien trop ancien ne confirme rien : inscrivez-vous de nouveau depuis la page.
				</p>
				{etat === 'erreur' ? (
					<p className="text-cladd-xs leading-relaxed">Cela n’a pas fonctionné. Réessayez.</p>
				) : null}
			</div>
			<BoutonPrincipal
				disabled={etat === 'en-cours'}
				onClick={() => void faire(onConfirmer, 'confirmee')}
			>
				Confirmer mon inscription
			</BoutonPrincipal>
			<BoutonTexte disabled={etat === 'en-cours'} onClick={() => void faire(onQuitter, 'retiree')}>
				Me retirer de la liste
			</BoutonTexte>
		</main>
	);
}
