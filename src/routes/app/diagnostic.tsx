import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '../../app/donnees';
import { suivre } from '../../app/analytique';
import { api } from '../../lib/convex/_generated/api';
import { EcranDiagnostic } from '../../screens/diagnostic';
import { aujourdHuiISO } from '../../ui';

export const Route = createFileRoute('/app/diagnostic')({
	component: Diagnostic,
	errorComponent: () => <EcranDiagnostic donnees={{ etat: 'erreur' }} />
});

/**
 * Le diagnostic, branché sur la base ; le dessin vit dans `screens/diagnostic.tsx`.
 * Le PDF se compose à la demande, avec jspdf chargé au toucher, comme la pièce du
 * décompte : rien de lourd ne part avec l'écran.
 */
function Diagnostic() {
	const arreteAu = aujourdHuiISO();
	const diagnostic = useQuery(api.recouvrement.revelation.diagnostic, { arreteAu });
	const org = useQuery(api.organizations.getMyOrg, {});

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

	return (
		<EcranDiagnostic
			donnees={{ etat: 'pret', valeur: { diagnostic, etablissement } }}
			onTelecharger={() => void telecharger()}
		/>
	);
}
