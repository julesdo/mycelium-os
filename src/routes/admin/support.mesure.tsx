import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { heureEnMots } from '../../app/heures';
import { permis, useGesteAdmin, useHorlogeAdmin, useRoleAdmin } from '../../app/coquille-admin';
import { SATISFACTION_A_PARTIR_DE } from '../../lib/support/mesure';
import { LIBELLES_DES_SUJETS } from '../../lib/support/sujets';
import { EcranMesureSupport } from '../../screens/admin/support';

export const Route = createFileRoute('/admin/support/mesure')({ component: MesureSupport });

function pourcent(part: number, total: number): string {
	return total === 0 ? '' : ` · ${Math.round((part / total) * 100)} %`;
}

function ecart(maintenant: number, avant: number): string {
	if (avant === 0) return '';
	const delta = maintenant - avant;
	return ` (${delta >= 0 ? '+' : ''}${delta} sur la période d’avant)`;
}

/** La mesure du support, lue dans son document matérialisé. */
function MesureSupport() {
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const mesure = useQuery(api.admin.support.mesure, {});
	const creerTache = useMutation(api.admin.taches.creer);
	const faire = useGesteAdmin();

	if (mesure === undefined || horloge === null) {
		return <EcranMesureSupport lecture={{ etat: 'attente' }} />;
	}
	if (mesure === null) return <EcranMesureSupport lecture={{ etat: 'pret', valeur: null }} />;
	const { entonnoir: e, precedent: p } = mesure;
	return (
		<EcranMesureSupport
			lecture={{
				etat: 'pret',
				valeur: {
					calculee: `Calculée à ${heureEnMots(mesure.calculeeLe)}, sur trente jours, comparés aux trente d’avant.`,
					entonnoir: [
						{
							libelle: 'Conversations',
							valeur: `${e.conversations}${ecart(e.conversations, p.conversations)}`
						},
						{
							libelle: 'Résolues par Plume',
							valeur: `${e.resoluesParPlume}${pourcent(e.resoluesParPlume, e.conversations)}`
						},
						{
							libelle: 'Passées à l’équipe',
							valeur: `${e.passees}${pourcent(e.passees, e.conversations)}`
						},
						{ libelle: 'Résolues par l’équipe', valeur: String(e.resoluesParLEquipe) },
						{ libelle: 'Sans nouvelles', valeur: String(e.sansNouvelles) }
					],
					delais: [
						{
							libelle: 'Première réponse (médiane)',
							valeur:
								mesure.medianes.premiereReponseH === null
									? 'Pas encore de réponse'
									: `${mesure.medianes.premiereReponseH} h, sur ${mesure.medianes.reponses} réponses`
						},
						{
							libelle: 'Résolution (médiane)',
							valeur:
								mesure.medianes.resolutionH === null
									? 'Pas encore mesurée'
									: `${mesure.medianes.resolutionH} h`
						}
					],
					plume: [
						{
							libelle: 'Réponses de Plume jugées utiles',
							valeur:
								mesure.tauxDeOuiPlume === null
									? 'Pas encore d’avis'
									: `${Math.round(mesure.tauxDeOuiPlume * 100)} %`
						},
						{
							libelle: 'Satisfaction après l’équipe',
							valeur:
								mesure.satisfaction === null
									? `Moins de ${SATISFACTION_A_PARTIR_DE} avis : rien à lire encore`
									: `${Math.round(mesure.satisfaction * 100)} % d’avis utiles`
						}
					],
					parSujet: mesure.parSujet.map((s) => ({
						libelle: LIBELLES_DES_SUJETS[s.sujet],
						valeur: `${s.conversations}, dont ${s.passees} passées`
					})),
					lacunes: mesure.lacunes.map((l) => {
						const sujet = l.sujet === undefined ? 'Autre question' : LIBELLES_DES_SUJETS[l.sujet];
						const organizationId = l.organizationId;
						return {
							id: l.id,
							titre: l.titre,
							ligne: `${sujet} · ${l.raison === 'LACUNE' ? 'Plume ne savait pas' : 'Deux réponses refusées'}`,
							...(permis(role, 'SUPPORT')
								? {
										onCreerTache: () =>
											void faire(
												() =>
													creerTache({
														titre: `Base d’aide : Plume n’a pas su répondre (${sujet})`,
														pour: horloge.maintenant + 24 * 60 * 60 * 1000,
														...(organizationId === undefined
															? {}
															: { fiche: { compte: organizationId } })
													}),
												{ titre: 'Tâche créée', texte: 'Elle attend dans vos tâches, pour demain.' }
											)
									}
								: {})
						};
					})
				}
			}}
		/>
	);
}
