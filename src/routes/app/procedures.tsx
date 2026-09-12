import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranProcedures, type DossierAffiche } from '../../screens/procedures';
import { Page, PageHeader, PageBody } from '../../ui';
import { parcoursDeLaVoie } from '../../lib/verticales/recouvrement/apres-procedure';

/**
 * ⚠️ LA SÉLECTION VIT DANS L'ADRESSE, comme sur `/app/debiteurs`. La liste et le
 * dossier sont le MÊME écran au-dessus de 1024 px : un segment de chemin
 * suggérerait deux pages là où il y en a une, et le retour perdrait la
 * sélection à chaque aller-retour.
 */
export const Route = createFileRoute('/app/procedures')({
	component: Procedures,
	validateSearch: (recherche: Record<string, unknown>): { p?: string } => {
		const p = recherche.p;
		return typeof p === 'string' && p.length > 0 ? { p } : {};
	}
});

function Procedures() {
	const { p } = Route.useSearch();
	const navigate = useNavigate();
	const dossiers = useQuery(api.recouvrement.apresProcedure.dossiersEngages, {});

	if (dossiers === undefined) {
		return (
			<Page>
				<PageHeader titre="Procédures" />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	return (
		<EcranProcedures
			dossiers={dossiers.map(
				(d): DossierAffiche => ({
					creanceId: d.creanceId,
					debiteur: d.debiteur,
					libelle: d.libelle,
					engageeLe: d.engageeLe,
					intervenant: d.intervenant,
					prochaineEcheance: d.prochaineEcheance,
					anglesMorts: d.anglesMorts,
					// Le rail se calcule ici, par la fonction du domaine, à partir du
					// journal que la requête a rapporté. Rien de l'état n'est réécrit à
					// l'écran : un second calcul du même parcours finirait par diverger,
					// et le plus dangereux des deux serait celui que personne ne relit.
					etapes: parcoursDeLaVoie(d.procedure, d.journal, d.engageeLe).map((e) => ({
						etat: e.etat,
						libelle: e.libelle,
						statut: e.statut,
						atteinteLe: e.atteinteLe,
						branches: e.branches,
						brancheSuivie: e.brancheSuivie
					}))
				})
			)}
			ouvertId={p ?? null}
			onFermer={() => void navigate({ to: '/app/procedures', search: {} })}
		/>
	);
}
