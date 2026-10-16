import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { dureeEnMots } from '../../app/aide';
import { heureOuJour } from '../../app/heures';
import { permis, useGesteAdmin, useHorlogeAdmin, useRoleAdmin } from '../../app/coquille-admin';
import { reponseAttendue } from '../../lib/support/horaires';
import { LIBELLES_DES_ACTES, LIBELLES_DES_RAISONS } from '../../lib/support/passage';
import { EcranFileSupport } from '../../screens/admin/support';

const VUES = ['A_VOUS', 'OUVERTES', 'EN_ATTENTE', 'TERMINEES', 'PLUME'] as const;
type Vue = (typeof VUES)[number];

const TITRES: Record<Vue, { titre: string; vide: string }> = {
	A_VOUS: { titre: 'À vous', vide: 'Rien ne vous attend. Plume répond, l’équipe est à jour.' },
	OUVERTES: { titre: 'Chez l’équipe', vide: 'Aucune conversation n’attend l’équipe.' },
	EN_ATTENTE: { titre: 'En attente du client', vide: 'Aucun gérant à qui l’on attend une réponse.' },
	TERMINEES: { titre: 'Terminées', vide: 'Aucune conversation terminée pour l’instant.' },
	PLUME: { titre: 'Chez Plume', vide: 'Personne ne parle à Plume en ce moment.' }
};

export const Route = createFileRoute('/admin/support/')({
	validateSearch: (recherche: Record<string, unknown>): { vue?: Vue } =>
		typeof recherche.vue === 'string' && (VUES as readonly string[]).includes(recherche.vue)
			? { vue: recherche.vue as Vue }
			: {},
	component: FileSupport
});

/** La boîte du support : la file d'une vue, la plus ancienne en tête chez l'équipe. */
function FileSupport() {
	const { vue = 'A_VOUS' } = Route.useSearch();
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const file = useQuery(api.admin.support.file, { vue });
	const moi = useQuery(api.admin.support.moi, {});
	const poserAbsence = useMutation(api.admin.support.poserAbsence);
	const faire = useGesteAdmin();
	const maintenant = horloge?.maintenant ?? 0;

	return (
		<EcranFileSupport
			titre={TITRES[vue].titre}
			vide={TITRES[vue].vide}
			lecture={
				file === undefined || horloge === null
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: file.map((l) => {
								const raison =
									l.acte !== undefined
										? LIBELLES_DES_ACTES[l.acte]
										: l.raison === undefined
											? null
											: LIBELLES_DES_RAISONS[l.raison].equipe;
								const etiquettes = [
									...(l.prioritaire ? ['Prioritaire'] : []),
									...(l.reservee ? ['Réservée au fondateur'] : []),
									...(l.verifiee ? [] : ['Non vérifié']),
									...(l.canal === 'EMAIL' ? ['Par e-mail'] : [])
								];
								const attendue =
									l.etat === 'A_NOUS' && l.passeeLe !== undefined
										? reponseAttendue(l.passeeLe, moi?.absentJusquAu ?? undefined)
										: null;
								return {
									id: l.id,
									etablissement: l.etablissement,
									ligne: [...etiquettes, ...(raison === null ? [] : [raison]), l.titre].join(' · '),
									date:
										attendue === null || l.passeeLe === undefined
											? heureOuJour(l.dernierMessageLe)
											: maintenant > attendue
												? `en retard de ${dureeEnMots(maintenant - attendue)}`
												: `attend depuis ${dureeEnMots(maintenant - l.passeeLe)}`,
									attention: l.nonLue
								};
							})
						}
			}
			{...(permis(role, 'FONDATEUR') && moi !== undefined
				? {
						absence: {
							jusquAu:
								moi.absentJusquAu !== null && moi.absentJusquAu > maintenant
									? heureOuJour(moi.absentJusquAu)
									: null,
							onAnnoncer: () =>
								void faire(() => poserAbsence({ jusquAu: maintenant + 7 * 24 * 60 * 60 * 1000 }), {
									titre: 'Absence annoncée',
									texte: 'Les clients lisent la réponse attendue à votre retour, dans sept jours.'
								}),
							onLever: () =>
								void faire(() => poserAbsence({ jusquAu: null }), {
									titre: 'Absence levée',
									texte: 'Le délai annoncé aux clients repart d’aujourd’hui.'
								})
						}
					}
				: {})}
		/>
	);
}
