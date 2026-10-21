import { useState } from 'react';
import { FeuilleDeReussite } from './reussite';
import { FeuilleDuPush, type EtatDuPush } from './notifications-push';

/**
 * LA CÉLÉBRATION D'UNE RÉUSSITE (21/10/2026, le parcours de l'habitude).
 *
 * À la visite qui suit un jalon franchi, la feuille de réussite en page pleine : la coche
 * qui se trace, le montant héros, une ligne de contexte, UN bouton « Continuer », et au
 * plus UNE ligne dessous (`ligneSecondaire`) :
 *
 *   · `PUSH` ouvre la feuille qui explique les notifications avant de les demander ;
 *   · `ANNEE` mène à la confirmation existante du passage à l'année, prix compris ;
 *   · `RECOMMANDATION` se tait tant que le parrainage n'est pas ouvert.
 *
 * ⚠️ ELLE ATTEND LES AUTRES FEUILLES (`bloquee`) : elle ne se pose jamais par-dessus une
 * feuille ouverte, et ne se compte pas elle-même parmi elles.
 *
 * ⚠️ « VUE » SE DIT UNE FOIS, À LA FIN : la ligne touchée (`TOUCHEE`), passée sans être
 * touchée (`PASSEE`, qui compte comme ignorée), ou absente (`AUCUNE`). Tant que la
 * feuille des notifications est ouverte, la réussite n'est pas encore vue : la marquer
 * ferait disparaître la feuille avec elle.
 */

export type LigneDeCelebration = 'PUSH' | 'ANNEE' | 'RECOMMANDATION';

export interface JalonAffiche {
	readonly id: string;
	readonly titre: string;
	readonly montant: bigint | null;
	readonly detail: string;
	readonly secondaire: LigneDeCelebration | null;
}

export type IssueDeLaLigne = 'TOUCHEE' | 'PASSEE' | 'AUCUNE';

const LIBELLE_DE_LA_LIGNE: Readonly<Record<'PUSH' | 'ANNEE', string>> = {
	PUSH: 'Être prévenu quand un client paie',
	ANNEE: 'Passer à l’année : 2 mois offerts'
};

export function CelebrationDeJalon({
	jalon,
	bloquee,
	push,
	onVu,
	onAnnee,
	onNePlusProposer
}: {
	readonly jalon: JalonAffiche;
	/** Une autre feuille est ouverte : la célébration attend qu'elle se ferme. */
	readonly bloquee: boolean;
	readonly push:
		| { readonly etat: EtatDuPush; readonly enCours: boolean; readonly onActiver: () => void }
		| undefined;
	readonly onVu: (issue: IssueDeLaLigne) => void;
	readonly onAnnee: () => void;
	/** « Ne plus me le proposer » : la ligne se tait pour de bon (`marketing:<genre>`). */
	readonly onNePlusProposer: (ligne: 'PUSH' | 'ANNEE') => void;
}) {
	const [etape, setEtape] = useState<'fete' | 'push' | 'finie'>('fete');
	const ligne =
		jalon.secondaire === 'PUSH' && push === undefined
			? null
			: jalon.secondaire === 'RECOMMANDATION'
				? null
				: jalon.secondaire;

	function finir(issue: IssueDeLaLigne) {
		setEtape('finie');
		onVu(issue);
	}

	return (
		<>
			<FeuilleDeReussite
				ouverte={etape === 'fete' && !bloquee}
				compteeOuverte={false}
				titre={jalon.titre}
				{...(jalon.montant === null ? {} : { montant: jalon.montant })}
				detail={jalon.detail}
				principale={{
					libelle: 'Continuer',
					onClick: () => finir(ligne === null ? 'AUCUNE' : 'PASSEE')
				}}
				{...(ligne === null
					? {}
					: {
							secondaire: {
								libelle: LIBELLE_DE_LA_LIGNE[ligne],
								onClick: () => {
									if (ligne === 'PUSH') {
										setEtape('push');
										return;
									}
									finir('TOUCHEE');
									onAnnee();
								}
							},
							refus: {
								libelle: 'Ne plus me le proposer',
								onClick: () => {
									finir('TOUCHEE');
									onNePlusProposer(ligne);
								}
							}
						})}
			/>
			{push === undefined ? null : (
				<FeuilleDuPush
					ouverte={etape === 'push'}
					onFermer={() => finir('TOUCHEE')}
					etat={push.etat}
					enCours={push.enCours}
					onActiver={push.onActiver}
				/>
			)}
		</>
	);
}
