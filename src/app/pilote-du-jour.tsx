import { useMutation } from 'convex/react';
import { useQuery } from './donnees';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { PiloteEnDirect } from '../ui';

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
	const activerRelances = useMutation(api.recouvrement.pilote.activerRelances);
	const retenirRelance = useMutation(api.recouvrement.pilote.retenir);
	if (pilote === undefined) return null;

	return (
		<PiloteEnDirect
			aujourdHui={aujourdHui}
			onActiver={(actif) => void activerRelances({ actif })}
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
					etapes: t.etapes,
					etat: t.etat,
					bilan: t.bilan,
					termineLe: t.termineLe
				}))
			}}
		/>
	);
}
