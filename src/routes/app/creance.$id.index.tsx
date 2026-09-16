import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranAnalyseEnAttente, analyseParDefaut } from '../../screens/creance';
import { PageDecompte } from './creance.$id.decompte';
import { PageLitige } from './creance.$id.litige';

export const Route = createFileRoute('/app/creance/$id/')({
	component: AnalyseParDefaut
});

/**
 * LE VOLET DROIT D'UNE CRÉANCE QU'ON VIENT D'OUVRIR.
 *
 * ⚠️ IL N'EST JAMAIS VIDE, ET L'ADRESSE N'EST PAS RÉÉCRITE. À partir de 1024 px,
 * il montre la première rangée qui attend une réponse, sinon le décompte. Écrire
 * ce choix dans l'adresse ferait atterrir le téléphone dans l'analyse au lieu de
 * la liste, et le gérant devrait revenir pour lire la créance.
 *
 * Sous 1024 px, il est monté mais masqué : sa requête est celle de la créance,
 * que Convex ne demande qu'une fois.
 */
function AnalyseParDefaut() {
	const { id } = useParams({ from: '/app/creance/$id' });
	const creance = useQuery(api.recouvrement.lecture.creanceComplete, {
		creanceId: id as Id<'creances'>
	});

	if (creance === undefined) return <EcranAnalyseEnAttente identifiant={id} />;
	return analyseParDefaut(creance) === 'litige' ? <PageLitige /> : <PageDecompte />;
}
