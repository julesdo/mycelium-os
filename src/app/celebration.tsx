import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../lib/convex/_generated/api';
import { cleDeSilence } from '../lib/croissance/attention';
import { CelebrationDeJalon, useUneFeuilleOuverte, type IssueDeLaLigne } from '../ui';
import { useQuery } from './donnees';
import { usePush } from './push';

/**
 * LA RÉUSSITE FÊTÉE À LA VISITE SUIVANTE (21/10/2026, le parcours de l'habitude), posée
 * sur Aujourd'hui. Une réussite franchie PENDANT la visite attend la suivante : elle ne
 * surgit pas au milieu du travail (la bulle de Plume, elle, se tait pour ce paiement).
 * Elle attend aussi qu'aucune feuille ne soit ouverte.
 */
export function CelebrationALaVisite() {
	const jalon = useQuery(api.recouvrement.jalons.jalonAMontrer, {});
	const [arriveeLe] = useState(() => Date.now());
	if (jalon === undefined || jalon === null || jalon.atteintLe > arriveeLe) return null;
	return jalon.secondaire === 'PUSH' ? (
		<AvecLePush key={jalon.id} jalon={jalon} />
	) : (
		<Celebration key={jalon.id} jalon={jalon} push={undefined} />
	);
}

type JalonLu = NonNullable<FunctionReturnType<typeof api.recouvrement.jalons.jalonAMontrer>>;

/** Le push ne s'abonne que si la célébration le propose. */
function AvecLePush({ jalon }: { jalon: JalonLu }) {
	const push = usePush();
	return (
		<Celebration
			jalon={jalon}
			push={
				push === undefined
					? undefined
					: { etat: push.etat, enCours: push.enCours, onActiver: push.onActiver }
			}
		/>
	);
}

function Celebration({
	jalon,
	push
}: {
	jalon: JalonLu;
	push: Parameters<typeof CelebrationDeJalon>[0]['push'];
}) {
	const navigate = useNavigate();
	const bloquee = useUneFeuilleOuverte();
	const jalonVu = useMutation(api.recouvrement.jalons.jalonVu).withOptimisticUpdate((local) => {
		local.setQuery(api.recouvrement.jalons.jalonAMontrer, {}, null);
	});
	const taire = useMutation(api.recouvrement.presence.taire);
	const secondaire = jalon.secondaire;
	return (
		<CelebrationDeJalon
			jalon={jalon}
			bloquee={bloquee}
			push={push}
			onVu={(ligne: IssueDeLaLigne) => {
				void jalonVu({
					id: jalon.id,
					ligne,
					...(ligne !== 'AUCUNE' && secondaire !== null ? { secondaire } : {})
				}).catch(() => undefined);
			}}
			onAnnee={() => void navigate({ to: '/app/compte', search: { ouvrir: 'annee' } })}
			onNePlusProposer={(ligne) => {
				void taire({ cle: cleDeSilence(ligne === 'PUSH' ? 'push' : 'annee') }).catch(
					() => undefined
				);
			}}
		/>
	);
}
