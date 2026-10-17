import { createFileRoute } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import { usePlumeDit } from '../../app/parole-de-plume';
import {
	permis,
	useCocherTache,
	useGesteAdmin,
	useHorlogeAdmin,
	useRoleAdmin
} from '../../app/coquille-admin';
import { EcranFicheProspect } from '../../screens/admin/fiche-prospect';
import { LIBELLES_DES_STATUTS } from '../../lib/crm/statuts';

/** « jules.dore@… » → « Jules ». */
function prenomDeLAdresse(email: string): string {
	const debut = email.split('@')[0]?.split(/[._-]/)[0] ?? '';
	return debut === '' ? 'L’équipe' : debut.charAt(0).toUpperCase() + debut.slice(1);
}

/** La fiche d'un prospect : ses champs, son historique, ses tâches, et « Stop ». */
export const Route = createFileRoute('/admin/prospects/$id')({
	component: FicheProspectAdmin
});

function FicheProspectAdmin() {
	const { id } = Route.useParams();
	const prospectId = id as Id<'prospects'>;
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const fiche = useQuery(api.admin.prospects.fiche, { prospectId });
	const historique = useQuery(api.admin.historique.deLaFiche, { cible: { prospect: prospectId } });
	const taches = useQuery(api.admin.taches.liste, { fiche: { prospect: prospectId } });
	const noter = useMutation(api.admin.historique.noter);
	const emailEcrit = useMutation(api.admin.historique.emailEcrit);
	const moi = useQuery(api.admin.support.moi, {});
	const creerTache = useMutation(api.admin.taches.creer);
	const changerStatut = useMutation(api.admin.prospects.changerStatut);
	const remettreStatuts = useMutation(api.admin.prospects.remettreStatuts);
	const modifier = useMutation(api.admin.prospects.modifier);
	const stop = useMutation(api.admin.prospects.stop);
	const chercherAuRegistre = useAction(
		api.recouvrement.monEtablissement.chercherAuRegistreALInscription
	);
	const cocher = useCocherTache();
	const faire = useGesteAdmin();
	const dire = usePlumeDit();

	const pret =
		fiche !== undefined && historique !== undefined && taches !== undefined && horloge !== null;
	return (
		<EcranFicheProspect
			lecture={
				!pret
					? { etat: 'attente' }
					: { etat: 'pret', valeur: fiche === null ? null : { fiche, historique, taches } }
			}
			maintenant={horloge?.maintenant ?? 0}
			finDuJour={horloge?.finDuJour ?? 0}
			{...(moi === undefined
				? {}
				: {
						signataire: {
							// Sans prénom affiché, le début de l'adresse : « jules » plutôt que rien.
							prenom: moi.prenomAffiche ?? prenomDeLAdresse(moi.email),
							fondateur: role === 'FONDATEUR'
						}
					})}
			{...(permis(role, 'SUPPORT')
				? {
						gestes: {
							onNoter: (type, texte) =>
								faire(
									() =>
										noter({ cible: { prospect: prospectId }, type, ...(texte ? { texte } : {}) }),
									{
										titre: 'Noté',
										texte: 'C’est dans l’historique.'
									}
								),
							onCreerTache: (titre, pour) =>
								faire(() => creerTache({ titre, pour, fiche: { prospect: prospectId } }), {
									titre: 'Tâche créée',
									texte: titre
								}),
							onCocher: cocher,
							onChangerStatut: (statut) =>
								void changerStatut({ prospectIds: [prospectId], statut })
									.then((avant) => {
										if (avant.length === 0) return;
										dire({
											titre: 'Statut changé',
											texte: `Passé en « ${LIBELLES_DES_STATUTS[statut]} ».`,
											geste: {
												libelle: 'Annuler',
												faire: () => void remettreStatuts({ changements: avant })
											}
										});
									})
									.catch(() =>
										dire({
											titre: 'Pas fait',
											texte: 'Le statut n’a pas changé.',
											humeur: 'attention'
										})
									),
							onModifier: async (champs) => {
								await modifier({ prospectId, ...champs });
								dire({ titre: 'Enregistré', texte: champs.entreprise });
							},
							onStop: () =>
								faire(() => stop({ prospectId }), {
									titre: 'Coordonnées effacées',
									texte: 'Il ne sera plus contacté, ni réimporté.'
								}),
							onChercherAuRegistre: async (nom) => (await chercherAuRegistre({ nom })).candidats,
							onEmailEcrit: (etape, objet, texte) =>
								faire(
									() =>
										emailEcrit({
											prospect: prospectId,
											etape,
											objet,
											...(texte.trim() === '' ? {} : { texte })
										}),
									{
										titre: 'E-mail noté',
										texte:
											etape === 'RELANCE_2'
												? 'C’était la dernière relance.'
												: 'La relance suivante est dans « Prochaine action ».'
									}
								)
						}
					}
				: {})}
		/>
	);
}
