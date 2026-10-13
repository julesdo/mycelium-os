import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { precharger } from '../../app/prechargement';
import { useDepotAuCoffre, useOuvertureCoffre } from '../../app/use-coffre';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	NOM_DU_PILOTE,
	ParcoursDepot,
	VisionneuseDocument,
	cleDeRef,
	refDepuisCle,
	type RefCoffre
} from '../../ui';
import { EcranCoffre } from '../../screens/coffre';
import { useRemarquesDePlume } from '../../app/parole-de-plume';
import { remarquesDeLEcran } from '../../lib/verticales/recouvrement/compagnon/presence';

/**
 * `/app/coffre` — le coffre-fort des documents. Voir `screens/coffre.tsx` et
 * `docs/superpowers/specs/2026-10-12-coffre-fort.md`.
 *
 * `?document=IMPORT:<id>` ou `PIECE:<id>` ouvre un document en plein écran : le
 * retour du navigateur le referme, et un lien (une notification, le résumé d'un
 * dépôt) peut y mener. `?deposer=1` ouvre le parcours de dépôt : c'est là que
 * mènent tous les « Importer vos factures » du produit.
 */
export const Route = createFileRoute('/app/coffre')({
	validateSearch: (recherche: Record<string, unknown>): { document?: string; deposer?: 1 } => ({
		...(typeof recherche.document === 'string' ? { document: recherche.document } : {}),
		...(recherche.deposer === 1 || recherche.deposer === '1' ? { deposer: 1 as const } : {})
	}),
	loader: () => {
		precharger(api.coffre.coffre.listerLeCoffre, {});
	},
	component: PageCoffre,
	errorComponent: CoffreEnErreur
});

function CoffreEnErreur() {
	return <EcranCoffre donnees={{ etat: 'erreur' }} />;
}

function versServeur(ref: RefCoffre) {
	return ref.genre === 'IMPORT'
		? { genre: 'IMPORT' as const, id: ref.id as Id<'importsRecouvrement'> }
		: { genre: 'PIECE' as const, id: ref.id as Id<'pieces'> };
}

function PageCoffre() {
	// Plume se présente ici, la première fois (13/10/2026).
	useRemarquesDePlume('COFFRE', remarquesDeLEcran('COFFRE', NOM_DU_PILOTE));
	const { document, deposer } = Route.useSearch();
	const navigate = useNavigate();
	const ref = refDepuisCle(document);
	const documents = useQuery(api.coffre.coffre.listerLeCoffre, {});
	const journal = useQuery(api.coffre.coffre.journalDuCoffre, {});
	const detail = useQuery(
		api.coffre.coffre.documentDuCoffre,
		ref === null ? 'skip' : { ref: versServeur(ref) }
	);
	const retirer = useMutation(api.coffre.coffre.retirerDuCoffre);
	const depot = useDepotAuCoffre({ genre: 'FACTURES' });
	const { ouvrir, telecharger } = useOuvertureCoffre();
	// L'adresse porte l'ouverture : le retour du navigateur referme le parcours.
	const depotOuvert = deposer === 1;
	const ouvrirLeDepot = () => void navigate({ to: '/app/coffre', search: { deposer: 1 } });
	const fermerLeDepot = () => void navigate({ to: '/app/coffre', search: {}, replace: true });

	const ouvrirLeDocument = (cible: RefCoffre) =>
		void navigate({ to: '/app/coffre', search: { document: cleDeRef(cible) } });
	const fermerLeDocument = () => void navigate({ to: '/app/coffre', search: {} });

	return (
		<>
			<EcranCoffre
				donnees={
					documents === undefined
						? { etat: 'attente' }
						: {
								etat: 'pret',
								valeur: {
									documents,
									...(journal === undefined ? {} : { journal }),
									onAjouter: ouvrirLeDepot,
									onOuvrir: ouvrirLeDocument
								}
							}
				}
			/>
			<VisionneuseDocument
				ouverte={ref !== null}
				detail={ref === null ? undefined : detail}
				ouvrir={ouvrir}
				onTelecharger={telecharger}
				onRetirer={(cible) => retirer({ ref: versServeur(cible) }).then(fermerLeDocument)}
				onFermer={fermerLeDocument}
			/>
			<ParcoursDepot
				ouvert={depotOuvert}
				onFermer={fermerLeDepot}
				destination={{ titre: 'vos factures', precision: 'lues dès leur arrivée' }}
				genre="FACTURES"
				depot={depot}
				onVoir={(cible) =>
					void navigate({ to: '/app/coffre', search: { document: cleDeRef(cible) }, replace: true })
				}
				onVoirLeCoffre={fermerLeDepot}
			/>
		</>
	);
}
