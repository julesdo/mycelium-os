import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { messageDeRefus, televerser } from '../../app/televerser';
import { useAnnuaire } from '../../app/use-annuaire';
import { EcranDefense, type ClientDeLaDefense } from '../../screens/defense';
import { useRemarquesDePlume } from '../../app/parole-de-plume';
import { remarquesDeLEcran } from '../../lib/verticales/recouvrement/compagnon/presence';
import { NOM_DU_PILOTE } from '../../ui';

export const Route = createFileRoute('/app/defense')({
	component: PageDefense,
	errorComponent: DefenseEnErreur
});

function DefenseEnErreur() {
	return <EcranDefense donnees={{ etat: 'erreur' }} />;
}

/**
 * `/app/defense` — l'équipe du gérant, et le parcours du choix pour l'agrandir.
 * Voir `screens/defense.tsx`.
 *
 * ⚠️ LES DEUX RECHERCHES (UN DÉPARTEMENT, UN BARREAU) ONT DISPARU LE 12/10/2026 :
 * le parcours du choix cherche par nom, cabinet ou ville, près d'un client ou dans
 * toute la France, et c'est LE MÊME que dans un dossier. Une fiche venue d'un
 * répertoire porte toujours sa source et sa date de relevé, et la mutation la
 * refuse sans elles ; une fiche tapée à la main est `SAISI_A_LA_MAIN` par
 * construction.
 */
function PageDefense() {
	// Plume se présente ici, la première fois (13/10/2026).
	useRemarquesDePlume('DEFENSE', remarquesDeLEcran('DEFENSE', NOM_DU_PILOTE));
	const carnet = useQuery(api.recouvrement.intervenants.monCarnet, {});
	const dossiers = useQuery(api.recouvrement.lecture.indexDossiers, {});
	const oublierIntervenant = useMutation(api.recouvrement.intervenants.oublierIntervenant);
	const genererUrlPhoto = useMutation(api.recouvrement.intervenants.genererUrlPhoto);
	const poserPhoto = useMutation(api.recouvrement.intervenants.poserPhoto);

	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	// Les clients qui ont un dossier en cours, une fois chacun, dans l'ordre alphabétique.
	const parClient = new Map<string, { nom: string; dossiers: number }>();
	for (const dossier of dossiers ?? []) {
		if (dossier.etape === 'REGLE') continue;
		const deja = parClient.get(dossier.debiteurId);
		parClient.set(dossier.debiteurId, {
			nom: dossier.debiteur,
			dossiers: (deja?.dossiers ?? 0) + 1
		});
	}
	const clients: ClientDeLaDefense[] = [...parClient.entries()]
		.map(([id, { nom, dossiers: n }]) => ({
			id,
			nom,
			ligne: `${n} dossier${n > 1 ? 's' : ''} en cours`
		}))
		.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
	const annuaire = useAnnuaire({ clients, carnet });

	/** Un geste : l'état d'envoi pendant, le refus lisible après. */
	async function geste(action: () => Promise<unknown>): Promise<boolean> {
		setEnCours(true);
		setErreur(null);
		try {
			await action();
			return true;
		} catch (e) {
			setErreur(messageDeRefus(e));
			return false;
		} finally {
			setEnCours(false);
		}
	}

	if (carnet === undefined || dossiers === undefined) {
		return <EcranDefense donnees={{ etat: 'attente' }} />;
	}

	return (
		<EcranDefense
			donnees={{
				etat: 'pret',
				valeur: {
					equipe: carnet,
					erreur,
					enCours,
					onOublier: (id) =>
						void geste(() => oublierIntervenant({ intervenantId: id as Id<'intervenants'> })),
					onPhoto: (id, fichier) =>
						void geste(async () => {
							const storageId = await televerser(() => genererUrlPhoto({}), fichier);
							await poserPhoto({ intervenantId: id as Id<'intervenants'>, storageId });
						}),
					clients,
					annuaire
				}
			}}
		/>
	);
}
