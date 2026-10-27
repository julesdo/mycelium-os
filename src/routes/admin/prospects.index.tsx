import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import { usePreference } from '../../app/use-preference';
import { usePlumeDit } from '../../app/parole-de-plume';
import { permis, useGesteAdmin, useHorlogeAdmin, useRoleAdmin } from '../../app/coquille-admin';
import {
	AFFICHAGES_PROSPECTS,
	EcranProspects,
	VUES_PROSPECTS,
	type AffichageProspects,
	type VueProspects
} from '../../screens/admin/prospects';
import { FeuilleProspect } from '../../screens/admin/formulaire-prospect';
import { LIBELLES_DES_STATUTS } from '../../lib/crm/statuts';
import {
	REGISTRE_DES_PARCOURS,
	estParcours,
	libelleDeLEtape,
	type Parcours
} from '../../lib/crm/parcours';

/**
 * Les prospects : la vue se garde dans l'adresse, la présentation (liste ou
 * pipeline) d'une visite à l'autre ; `?ajouter=1` ouvre l'ajout, d'où que l'on vienne
 * (« Ajouter un prospect » de la barre du haut).
 */
const CLES_AFFICHAGE = AFFICHAGES_PROSPECTS.map((a) => a.cle);

export const Route = createFileRoute('/admin/prospects/')({
	validateSearch: (
		recherche: Record<string, unknown>
	): {
		vue?: VueProspects;
		affichage?: AffichageProspects;
		ajouter?: 1;
		parcours?: Parcours;
	} => ({
		...(estParcours(recherche.parcours) ? { parcours: recherche.parcours } : {}),
		...(CLES_AFFICHAGE.includes(recherche.affichage as AffichageProspects)
			? { affichage: recherche.affichage as AffichageProspects }
			: {}),
		...(VUES_PROSPECTS.some((v) => v.cle === recherche.vue)
			? { vue: recherche.vue as VueProspects }
			: {}),
		...(recherche.ajouter === 1 || recherche.ajouter === '1' ? { ajouter: 1 as const } : {})
	}),
	component: ProspectsAdmin
});

function ProspectsAdmin() {
	const { vue = 'TOUS', ajouter, affichage: affichageDeLAdresse, parcours } = Route.useSearch();
	const navigate = useNavigate({ from: '/admin/prospects/' });
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const [terme, setTerme] = useState('');
	const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
	const [prefere, setPrefere] = usePreference(
		'letikette:admin-prospects',
		'tableau',
		CLES_AFFICHAGE
	);
	const affichage = affichageDeLAdresse ?? prefere;
	const prospects = useQuery(api.admin.prospects.liste, {
		vue,
		...(parcours === undefined ? {} : { parcours })
	});
	const equipe = useQuery(api.admin.equipe.adresses, {});
	// Optimiste : la carte reste où on l'a posée, sans revenir le temps que le serveur réponde.
	const changerStatut = useMutation(api.admin.prospects.changerStatut).withOptimisticUpdate(
		(local, { prospectIds, statut }) => {
			for (const { args, value } of local.getAllQueries(api.admin.prospects.liste)) {
				if (value === undefined) continue;
				local.setQuery(
					api.admin.prospects.liste,
					args,
					value.map((p) =>
						prospectIds.includes(p.id) && p.statut !== 'STOP' ? { ...p, statut } : p
					)
				);
			}
		}
	);
	const remettreStatuts = useMutation(api.admin.prospects.remettreStatuts).withOptimisticUpdate(
		(local, { changements }) => {
			for (const { args, value } of local.getAllQueries(api.admin.prospects.liste)) {
				if (value === undefined) continue;
				local.setQuery(
					api.admin.prospects.liste,
					args,
					value.map((p) => {
						const avant = changements.find((c) => c.id === p.id);
						return avant === undefined ? p : { ...p, statut: avant.avant };
					})
				);
			}
		}
	);
	const assigner = useMutation(api.admin.prospects.assigner);
	// Optimiste, comme le statut : la carte reste dans la colonne où on l'a posée.
	const changerEtape = useMutation(api.admin.prospects.changerEtape).withOptimisticUpdate(
		(local, { prospectId, etape }) => {
			for (const { args, value } of local.getAllQueries(api.admin.prospects.liste)) {
				if (value === undefined) continue;
				local.setQuery(
					api.admin.prospects.liste,
					args,
					value.map((p) => (p.id === prospectId ? { ...p, etapeParcours: etape } : p))
				);
			}
		}
	);
	const changerDeParcours = useMutation(api.admin.prospects.changerDeParcours);
	const remettreParcours = useMutation(api.admin.prospects.remettreParcours);
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
				void navigate({
					search: (s) => ({ ...s, vue: v === 'TOUS' ? undefined : v }),
					replace: true
				});
			}}
			affichage={affichage}
			onAffichage={(a) => {
				setSelection(new Set());
				setPrefere(a);
				void navigate({ search: (s) => ({ ...s, affichage: a }), replace: true });
			}}
			terme={terme}
			onTerme={setTerme}
			selection={selection}
			onSelection={setSelection}
			equipe={equipe ?? []}
			maintenant={horloge?.maintenant ?? 0}
			{...(parcours === undefined ? {} : { parcours })}
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
							onChangerParcours: (ids, vers) => {
								void changerDeParcours({ prospectIds: ids as Id<'prospects'>[], parcours: vers })
									.then((avant) => {
										if (avant.length === 0) return;
										dire({
											titre: 'Parcours changé',
											texte:
												avant.length === 1
													? `Classé dans « ${REGISTRE_DES_PARCOURS[vers].libelle} ».`
													: `${avant.length} prospects classés dans « ${REGISTRE_DES_PARCOURS[vers].libelle} ».`,
											geste: {
												libelle: 'Annuler',
												faire: () => void remettreParcours({ changements: avant })
											}
										});
									})
									.catch((e: unknown) =>
										dire({
											titre: 'Pas fait',
											texte: e instanceof Error ? e.message : 'Le parcours n’a pas changé.',
											humeur: 'attention'
										})
									);
							},
							onAjouter: () => void navigate({ search: (s) => ({ ...s, ajouter: 1 }) }),
							onChangerEtape: (id, etape) => {
								const prospectId = id as Id<'prospects'>;
								void changerEtape({ prospectId, etape })
									.then((avant) => {
										if (avant === null || parcours === undefined) return;
										dire({
											titre: 'Étape changée',
											texte: `Passé à « ${libelleDeLEtape(parcours, etape)} ».`,
											geste: {
												libelle: 'Annuler',
												faire: () => void changerEtape({ prospectId, etape: avant })
											}
										});
									})
									.catch((e: unknown) =>
										dire({
											titre: 'Pas fait',
											texte: e instanceof Error ? e.message : 'L’étape n’a pas changé.',
											humeur: 'attention'
										})
									);
							}
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
