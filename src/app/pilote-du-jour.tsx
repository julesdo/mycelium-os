import { useMutation } from 'convex/react';
import { useQuery } from './donnees';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { PiloteEnDirect } from '../ui';
import { HEURES_D_ENVOI } from '../lib/verticales/recouvrement/plan-relance';
import { usePlumeDit } from './parole-de-plume';
import { suivre } from './analytique';

/**
 * LE BLOC DU PILOTE SUR « AUJOURD'HUI », ABONNÉ SEUL À L'ÉTAT DU PILOTE.
 *
 * ⚠️ IL PORTE SON ABONNEMENT, ET C'EST UNE MESURE (09/10/2026). Quand Plume
 * travaille, ses étapes se cochent toutes les 0,7 s, et l'état du pilote change
 * à chaque coche. Lu par la route, il faisait redessiner tout l'écran — le
 * montant, la bande d'ancienneté, la file entière — à chaque étape, pour une
 * coche. Ici, seul ce bloc se redessine.
 */
export function PiloteDuJour({ aujourdHui }: { readonly aujourdHui: string }) {
	const pilote = useQuery(api.recouvrement.pilote.etat, {});
	const dire = usePlumeDit();
	/*
	  LES DEUX GESTES DU BLOC SE VOIENT AU TOUCHER (mises à jour optimistes de
	  Convex) : une relance retenue quitte « Part bientôt », l'activation bascule ;
	  le serveur confirme derrière, ou défait si le geste est refusé.
	*/
	const activerRelances = useMutation(api.recouvrement.pilote.activerRelances).withOptimisticUpdate(
		(local, { actif }) => {
			const etat = local.getQuery(api.recouvrement.pilote.etat, {});
			if (etat !== undefined) {
				local.setQuery(api.recouvrement.pilote.etat, {}, { ...etat, envoiAutomatique: actif });
			}
			local.setQuery(api.recouvrement.pilote.relancesAutomatiques, {}, actif);
		}
	);
	const retenirRelance = useMutation(api.recouvrement.pilote.retenir).withOptimisticUpdate(
		(local, { envoiId }) => {
			const etat = local.getQuery(api.recouvrement.pilote.etat, {});
			if (etat === undefined) return;
			local.setQuery(
				api.recouvrement.pilote.etat,
				{},
				{
					...etat,
					programmes: etat.programmes.filter((p) => p.envoiId !== envoiId)
				}
			);
		}
	);
	if (pilote === undefined) return null;

	return (
		<PiloteEnDirect
			aujourdHui={aujourdHui}
			onActiver={(actif) =>
				/*
				  ⚠️ PLUME DIT CE QUI VA SE PASSER (14/10/2026). Activer les relances, c'est
				  laisser partir des e-mails à son nom : le moment où l'on s'inquiète le plus.
				  Le mot dit quand, comment on le voit, et comment on l'arrête.
				*/
				void activerRelances({ actif }).then(
					() => {
						suivre(actif ? 'relances-activees' : 'relances-coupees', { depuis: 'accueil' });
						dire(
							actif
								? {
										titre: 'Relances activées',
										texte: `C’est activé. Je relance vos dossiers démarrés en semaine, de ${HEURES_D_ENVOI.de} h à ${HEURES_D_ENVOI.a} h. Chaque relance s’affiche au-dessus de la barre une heure avant de partir : vous la retenez d’un geste.`,
										humeur: 'content'
									}
								: {
										titre: 'Relances coupées',
										texte:
											'C’est coupé : plus rien ne part seul. Je continue de préparer vos lettres ; c’est vous qui les envoyez.',
										humeur: 'content'
									}
						);
					},
					() =>
						dire({
							titre: 'Rien n’a changé',
							texte:
								'Je n’ai pas pu changer les relances automatiques. Seul un administrateur de l’établissement peut le faire.',
							humeur: 'attention'
						})
				)
			}
			onRetenir={(envoiId) => void retenirRelance({ envoiId: envoiId as Id<'envois'> })}
			pilote={{
				envoiAutomatique: pilote.envoiAutomatique,
				aDemarrer: pilote.aDemarrer,
				activeLe: pilote.activeLe,
				activeParVous: pilote.activeParVous,
				peutActiver: pilote.peutActiver,
				programmes: pilote.programmes.map((p) => ({
					envoiId: p.envoiId,
					creanceId: p.creanceId,
					client: p.client,
					etape: p.etape,
					partiraLe: p.partiraLe
				})),
				derniereVeille: pilote.derniereVeille,
				travaux: pilote.travaux.map((t) => ({
					id: t.id,
					titre: t.titre,
					genre: t.genre,
					etapes: t.etapes,
					etat: t.etat,
					bilan: t.bilan,
					termineLe: t.termineLe
				}))
			}}
		/>
	);
}
