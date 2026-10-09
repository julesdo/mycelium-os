import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranDemarrageEnLot } from '../../screens/demarrage-lot';
import { PageEcran, type EtapeDeTravail } from '../../ui';

/**
 * `/app/demarrer` — LES DOSSIERS QUE PLUME A PRÉPARÉS, À DÉMARRER EN LOT.
 *
 * Le démarrage se lit sur le pilote lui-même : un travail « Démarre 32 dossiers »
 * dont chaque étape se coche au moment où le dossier démarre.
 */
export const Route = createFileRoute('/app/demarrer/')({
	component: DemarrerEnLot
});

function DemarrerEnLot() {
	const navigate = useNavigate();
	const lot = useQuery(api.recouvrement.demarrage.lot, {});
	const pilote = useQuery(api.recouvrement.pilote.etat, {});
	const demarrer = useMutation(api.recouvrement.demarrage.demarrerEnLot);

	if (lot === undefined) {
		return (
			<PageEcran
				entete={{
					genre: 'poussee',
					retour: { vers: '/app', libelle: 'Aujourd’hui' },
					titre: 'Dossiers à démarrer'
				}}
				etat="attente"
			/>
		);
	}

	const enCours = (pilote?.travaux ?? []).find(
		(t) => (t.etat === 'EN_COURS' || t.etat === 'EN_ATTENTE') && t.titre.startsWith('Démarre ')
	);
	const rang = enCours?.etapes.findIndex((e) => !e.faite) ?? -1;

	return (
		<EcranDemarrageEnLot
			lot={{
				dossiers: lot.dossiers,
				emailReponsesConnu: lot.emailReponsesConnu,
				travail:
					enCours === undefined
						? null
						: {
								titre: enCours.titre,
								etapes: enCours.etapes.map(
									(etape, i): EtapeDeTravail => ({
										libelle: etape.libelle,
										etat: etape.faite ? 'faite' : i === rang ? 'courante' : 'avenir'
									})
								)
							},
				onDemarrer: (creanceIds) =>
					demarrer({ creanceIds: creanceIds.map((id) => id as Id<'creances'>) }),
				onCompleter: (debiteurId) =>
					void navigate({ to: '/app/demarrer/$id', params: { id: debiteurId } })
			}}
		/>
	);
}
