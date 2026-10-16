import { useState } from 'react';
import { Button } from '@cladd-ui/react';
import { PlusIcon } from 'lucide-react';
import { PageEcran, type Lecture } from '../../ui';
import { FeuilleDeTache, TachesGroupees, type TacheAffichee } from './commun';

/**
 * LES TÂCHES DE L'ÉQUIPE (16/10/2026), groupées comme chez Linear : en retard,
 * aujourd'hui, plus tard, faites ces sept derniers jours. Une tâche se coche d'un
 * toucher ; une tâche « Appeler » naît seule quand un compte atteint le score de 60.
 */
export function EcranTaches({
	lecture,
	maintenant,
	debutDuJour,
	finDuJour,
	onCocher,
	onCreer
}: {
	readonly lecture: Lecture<readonly TacheAffichee[]>;
	readonly maintenant: number;
	readonly debutDuJour: number;
	readonly finDuJour: number;
	readonly onCocher: (id: string, faite: boolean) => void;
	/** Absent pour le rôle en lecture. */
	readonly onCreer?: (titre: string, pour: number) => Promise<void>;
}) {
	const [creation, setCreation] = useState(false);
	const entete = {
		genre: 'onglet' as const,
		titre: 'Tâches',
		...(onCreer === undefined
			? {}
			: {
					actions: (
						<Button
							size="md"
							rounded
							square
							variant="solid"
							outline={false}
							className="ml-auto shrink-0"
							aria-label="Nouvelle tâche"
							title="Nouvelle tâche"
							onClick={() => setCreation(true)}
						>
							<PlusIcon />
						</Button>
					)
				})
	};
	const feuille =
		onCreer === undefined ? null : (
			<FeuilleDeTache
				ouverte={creation}
				onFermer={() => setCreation(false)}
				finDuJour={finDuJour}
				onCreer={onCreer}
			/>
		);

	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;
	if (lecture.valeur.length === 0) {
		// Le vide remplace l'écran : la feuille de création vit à côté de lui.
		return (
			<>
				<PageEcran
					entete={entete}
					etat={{
						vide: {
							illustration: '✅',
							titre: 'Aucune tâche',
							explication:
								'Une tâche se crée depuis une fiche ou d’ici. Quand un compte atteint le score de 60, une tâche « Appeler » s’ajoute seule.'
						}
					}}
				/>
				{feuille}
			</>
		);
	}
	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-sm">
				<TachesGroupees
					taches={lecture.valeur}
					maintenant={maintenant}
					debutDuJour={debutDuJour}
					finDuJour={finDuJour}
					onCocher={onCocher}
				/>
			</div>
			{feuille}
		</PageEcran>
	);
}
