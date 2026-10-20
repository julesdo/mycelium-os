import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import { permis, useGesteAdmin, useRoleAdmin } from '../../app/coquille-admin';
import { EcranTravaux } from '../../screens/admin/travaux';

/**
 * La file des travaux de l'équipe : les recherches longues, en arrière-plan, et le choix du
 * matin de Plume (20/10/2026).
 */
export const Route = createFileRoute('/admin/travaux')({
	component: TravauxAdmin
});

/** « mardi 20 octobre à 7 h 31 », à Paris. */
function quand(ms: number): string {
	return new Intl.DateTimeFormat('fr-FR', {
		timeZone: 'Europe/Paris',
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		hour: 'numeric',
		minute: '2-digit'
	}).format(ms);
}

function TravauxAdmin() {
	const role = useRoleAdmin();
	const faire = useGesteAdmin();
	const travaux = useQuery(api.admin.travaux.fileDAttente, {});
	const reglages = useQuery(api.admin.prospectsDuJour.reglages, {});
	const marquerVu = useMutation(api.admin.travaux.marquerVu);
	const retirer = useMutation(api.admin.travaux.retirer);
	const regler = useMutation(api.admin.prospectsDuJour.regler);
	const lancer = useMutation(api.admin.prospectsDuJour.lancerMaintenant);

	const dernier = reglages?.dernier ?? null;
	const resultat = dernier?.resultat?.genre === 'SELECTION' ? dernier.resultat : null;
	const plumeCherche = dernier !== null && (dernier.etat === 'EN_ATTENTE' || dernier.etat === 'EN_COURS');

	return (
		<EcranTravaux
			lecture={travaux === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: travaux }}
			onOuvrir={(id) => void marquerVu({ id: id as Id<'travauxEquipe'> })}
			{...(permis(role, 'SUPPORT')
				? {
						onRetirerLesFinis: (ids: readonly string[]) => {
							for (const id of ids) void retirer({ id: id as Id<'travauxEquipe'> });
						}
					}
				: {})}
			{...(reglages === undefined
				? {}
				: {
						plume: {
							actif: reglages.actif,
							parJour: reglages.parJour,
							explication: reglages.actif
								? `Chaque matin, Plume regarde les entreprises neuves (${reglages.segments.join(', ').toLowerCase()} ; ${reglages.libelleZone}), garde les ${reglages.parJour} plus prometteuses et les ajoute à vos prospects, chacune avec la raison de son choix.`
								: `Éteint. Allumé, Plume regarde chaque matin les entreprises neuves (${reglages.segments.join(', ').toLowerCase()}), garde les plus prometteuses et les ajoute à vos prospects, chacune avec la raison de son choix. Un appel au modèle par jour.`,
							peutRegler: permis(role, 'FONDATEUR'),
							onRegler: (actif: boolean, parJour: number) =>
								void faire(() => regler({ actif, parJour, zone: reglages.zone }), {
									titre: actif ? 'Plume chaque matin' : 'Plume se repose',
									texte: actif
										? `${parJour} prospects choisis chaque matin.`
										: 'Plus de prospects ajoutés seuls.'
								}).catch(() => undefined),
							...(permis(role, 'SUPPORT')
								? {
										onLancer: () =>
											void faire(() => lancer({}), {
												titre: 'Plume cherche',
												texte: 'Le choix du jour arrive dans la file.'
											}).catch(() => undefined)
									}
								: {}),
							enCours: plumeCherche,
							dernier:
								dernier === null || resultat === null
									? null
									: {
											quand: quand(dernier.creeLe),
											parPlume: resultat.parPlume,
											examines: resultat.examines,
											ajoutes: resultat.ajoutes
										}
						}
					})}
		/>
	);
}
