import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import { usePreference } from '../../app/use-preference';
import { usePlumeDit } from '../../app/parole-de-plume';
import { permis, useGesteAdmin, useHorlogeAdmin, useRoleAdmin } from '../../app/coquille-admin';
import { EcranProspects, VUES_PROSPECTS, type VueProspects } from '../../screens/admin/prospects';
import { FeuilleProspect } from '../../screens/admin/formulaire-prospect';
import { LIBELLES_DES_STATUTS } from '../../lib/crm/statuts';

/**
 * Les prospects : la vue se garde dans l'adresse, la présentation (liste ou
 * pipeline) d'une visite à l'autre ; `?ajouter=1` ouvre l'ajout, d'où que l'on vienne
 * (« Ajouter un prospect » de la barre du haut).
 */
export const Route = createFileRoute('/admin/prospects/')({
	validateSearch: (recherche: Record<string, unknown>): { vue?: VueProspects; ajouter?: 1 } => ({
		...(VUES_PROSPECTS.some((v) => v.cle === recherche.vue)
			? { vue: recherche.vue as VueProspects }
			: {}),
		...(recherche.ajouter === 1 || recherche.ajouter === '1' ? { ajouter: 1 as const } : {})
	}),
	component: ProspectsAdmin
});

function ProspectsAdmin() {
	const { vue = 'TOUS', ajouter } = Route.useSearch();
	const navigate = useNavigate({ from: '/admin/prospects/' });
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const [terme, setTerme] = useState('');
	const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
	const [presentation, setPresentation] = usePreference('letikette:admin-prospects', 'liste', [
		'liste',
		'pipeline'
	] as const);
	const prospects = useQuery(api.admin.prospects.liste, { vue });
	const equipe = useQuery(api.admin.equipe.adresses, {});
	const changerStatut = useMutation(api.admin.prospects.changerStatut);
	const remettreStatuts = useMutation(api.admin.prospects.remettreStatuts);
	const assigner = useMutation(api.admin.prospects.assigner);
	const creer = useMutation(api.admin.prospects.creer);
	const chercherAuRegistre = useAction(
		api.recouvrement.monEtablissement.chercherAuRegistreALInscription
	);
	const faire = useGesteAdmin();
	const dire = usePlumeDit();

	const peutEcrire = permis(role, 'SUPPORT');
	const fermerLAjout = () =>
		void navigate({ search: (s) => ({ ...s, ajouter: undefined }), replace: true });

	return (
		<EcranProspects
			lecture={
				prospects === undefined || horloge === null
					? { etat: 'attente' }
					: { etat: 'pret', valeur: prospects }
			}
			vue={vue}
			onVue={(v) => {
				setSelection(new Set());
				void navigate({ search: v === 'TOUS' ? {} : { vue: v }, replace: true });
			}}
			presentation={presentation}
			onPresentation={setPresentation}
			terme={terme}
			onTerme={setTerme}
			selection={selection}
			onSelection={setSelection}
			equipe={equipe ?? []}
			maintenant={horloge?.maintenant ?? 0}
			{...(peutEcrire
				? {
						gestes: {
							onChangerStatut: (ids, statut) => {
								void changerStatut({ prospectIds: ids as Id<'prospects'>[], statut })
									.then((avant) => {
										if (avant.length === 0) return;
										dire({
											titre: 'Statut changé',
											texte:
												avant.length === 1
													? `Passé en « ${LIBELLES_DES_STATUTS[statut]} ».`
													: `${avant.length} prospects passés en « ${LIBELLES_DES_STATUTS[statut]} ».`,
											geste: {
												libelle: 'Annuler',
												faire: () => void remettreStatuts({ changements: avant })
											}
										});
									})
									.catch((e: unknown) =>
										dire({
											titre: 'Pas fait',
											texte: e instanceof Error ? e.message : 'Le statut n’a pas changé.',
											humeur: 'attention'
										})
									);
							},
							onAssigner: (ids, responsable) =>
								void faire(() => assigner({ prospectIds: ids as Id<'prospects'>[], responsable }), {
									titre: 'Responsable changé',
									texte:
										responsable === null
											? 'Plus personne ne les suit.'
											: `${ids.length} prospect${ids.length > 1 ? 's' : ''} pour ${responsable}.`
								}).catch(() => undefined),
							onAjouter: () => void navigate({ search: (s) => ({ ...s, ajouter: 1 }) })
						}
					}
				: {})}
			feuilles={
				peutEcrire ? (
					<FeuilleProspect
						key={ajouter === 1 ? 'ouverte' : 'fermee'}
						ouverte={ajouter === 1}
						onFermer={fermerLAjout}
						titre="Ajouter un prospect"
						onEnregistrer={async (champs) => {
							const id = await creer(champs);
							// La feuille se referme d'elle-même ; la fiche s'ouvre d'un toucher sur le mot.
							dire({
								titre: 'Prospect ajouté',
								texte: champs.entreprise,
								geste: {
									libelle: 'Ouvrir',
									faire: () => void navigate({ to: '/admin/prospects/$id', params: { id } })
								}
							});
						}}
						onChercherAuRegistre={async (nom) => (await chercherAuRegistre({ nom })).candidats}
					/>
				) : null
			}
		/>
	);
}
