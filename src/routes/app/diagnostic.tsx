import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '../../app/donnees';
import { suivre } from '../../app/analytique';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranDiagnostic } from '../../screens/diagnostic';
import { FeuilleCourriersPublics } from '../../screens/courriers-publics';
import { aujourdHuiISO } from '../../ui';

export const Route = createFileRoute('/app/diagnostic')({
	component: Diagnostic,
	errorComponent: () => <EcranDiagnostic donnees={{ etat: 'erreur' }} />
});

/**
 * Le diagnostic, branché sur la base ; le dessin vit dans `screens/diagnostic.tsx`.
 * Le PDF se compose à la demande, avec jspdf chargé au toucher, comme la pièce du
 * décompte : rien de lourd ne part avec l'écran. Les courriers d'un client public
 * (lot 1 bis) se préparent dans une feuille, au toucher de sa carte.
 */
function Diagnostic() {
	const arreteAu = aujourdHuiISO();
	const diagnostic = useQuery(api.recouvrement.revelation.diagnostic, { arreteAu });
	const org = useQuery(api.organizations.getMyOrg, {});
	const [clientPublic, setClientPublic] = useState<Id<'debiteurs'> | null>(null);
	const courriers = useQuery(
		api.recouvrement.courriersPublics.courriersPublics,
		clientPublic === null ? 'skip' : { debiteurId: clientPublic, aujourdHui: arreteAu }
	);

	if (diagnostic === undefined || org === undefined) {
		return <EcranDiagnostic donnees={{ etat: 'attente' }} />;
	}
	const etablissement = org?.name ?? 'Votre établissement';

	async function telecharger() {
		if (diagnostic === undefined) return;
		const [{ composerRapportDiagnostic }, { rendreRapportEnPdf, nomFichierRapport }] =
			await Promise.all([
				import('../../lib/verticales/recouvrement/rapport-diagnostic'),
				import('../../ui/rapport-diagnostic-pdf')
			]);
		const rapport = composerRapportDiagnostic(diagnostic, etablissement);
		rendreRapportEnPdf(rapport).save(nomFichierRapport(rapport, arreteAu));
		suivre('diagnostic-telecharge');
	}

	async function telechargerLeCourrier(courrier: {
		titre: string;
		destinataire: string;
		objet: string;
		corps: string;
	}) {
		const { rendreCourrierEnPdf, nomFichierCourrier } = await import('../../ui/courrier-pdf');
		rendreCourrierEnPdf(courrier.corps, courrier.objet).save(
			nomFichierCourrier(courrier.titre, courrier.destinataire, arreteAu)
		);
	}

	return (
		<>
			<EcranDiagnostic
				donnees={{ etat: 'pret', valeur: { diagnostic, etablissement } }}
				onTelecharger={() => void telecharger()}
				onPreparerCourrier={(id) => setClientPublic(id as Id<'debiteurs'>)}
			/>
			<FeuilleCourriersPublics
				key={clientPublic ?? 'aucun'}
				ouverte={clientPublic !== null}
				onFermer={() => setClientPublic(null)}
				lecture={
					courriers === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: courriers }
				}
				onTelecharger={(courrier) => void telechargerLeCourrier(courrier)}
			/>
		</>
	);
}
