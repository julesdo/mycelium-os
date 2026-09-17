import { createFileRoute, Outlet, redirect, useChildMatches } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranDebiteurs } from '../../screens/debiteurs';

/**
 * LA LISTE DES DÉBITEURS, ET RIEN D'AUTRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉTAIL A QUITTÉ CETTE ROUTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle portait tout : la liste, le volet de preuve du débiteur choisi, ses
 * factures, ses pièces, son habitude, le rapprochement d'un virement et la
 * recherche au registre — quatorze états posés « pour un sujet » parce que rien
 * ne les remettait à zéro quand on changeait de client.
 *
 * Un débiteur a maintenant UNE page, à SON adresse : `/app/debiteurs/$id`, une
 * route enfant rendue dans l'`Outlet` ci-dessous. Elle porte ses propres
 * lectures et son propre état, et le routeur la remonte quand on change de
 * client. Les quatorze `PosePourUnSujet` disparaissent avec elle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `?d=<id>` SURVIT, MAIS SEULEMENT COMME PORTE D'ENTRÉE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les notifications déjà écrites en base, le flux d'événements et la palette de
 * recherche désignent un débiteur par `/app/debiteurs?d=<id>`. Ces adresses
 * existent, elles sont enregistrées, et elles ne se réécrivent pas. Elles
 * mènent donc à la page du débiteur par une redirection, `replace` pour ne pas
 * empiler une étape morte dans l'historique.
 *
 * ⚠️ ET LE RETOUR DE LA PAGE NE PORTE PAS `?d=`. Il mène à la liste nue : s'il
 * la rendait avec `?d=`, la redirection le renverrait aussitôt sur la page
 * qu'il vient de quitter.
 */
export const Route = createFileRoute('/app/debiteurs')({
	component: Debiteurs,
	errorComponent: DebiteursEnErreur,
	validateSearch: (recherche: Record<string, unknown>): { d?: string } => {
		const d = recherche.d;
		return typeof d === 'string' && d.length > 0 ? { d } : {};
	},
	beforeLoad: ({ search }) => {
		if (search.d !== undefined) {
			throw redirect({
				to: '/app/debiteurs/$id',
				params: { id: search.d },
				search: {},
				replace: true
			});
		}
	}
});

function DebiteursEnErreur() {
	return <EcranDebiteurs donnees={{ etat: 'erreur' }} enfant={null} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/debiteurs.tsx`.
 */
function Debiteurs() {
	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	/** Vrai quand la page d'un débiteur est ouverte : elle prend le volet droit. */
	const pageOuverte = useChildMatches({ select: (enfants) => enfants.length > 0 });
	/**
	 * LE DÉBITEUR DE LA PAGE OUVERTE, LU SUR LA FEUILLE.
	 *
	 * ⚠️ PAS `useParams({ strict: false })`, QUI REND LES PARAMÈTRES DE LA
	 * CORRESPONDANCE LA PLUS PROCHE, c'est-à-dire ceux de cette route-ci, qui n'en
	 * a aucun. La liste allumait alors le premier débiteur du tri pendant que le
	 * volet droit montrait la page d'un autre.
	 */
	const choisi = useChildMatches({
		select: (enfants) => (enfants.at(-1)?.params as { id?: string } | undefined)?.id ?? null
	});

	return (
		<EcranDebiteurs
			enfant={pageOuverte ? <Outlet /> : null}
			donnees={
				debiteurs === undefined
					? { etat: 'attente' }
					: { etat: 'pret', valeur: { debiteurs, choisi } }
			}
		/>
	);
}
