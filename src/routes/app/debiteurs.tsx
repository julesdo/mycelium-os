import { useState } from 'react';
import { createFileRoute, Outlet, redirect, useChildMatches } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { aujourdHuiISO } from '../../ui';
import {
	EcranDebiteurs,
	type CleFiltre,
	type HabitudeDeLaLigne
} from '../../screens/debiteurs';

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
 * L'ÉTAT DE LECTURE DE LA LISTE : CE QU'ON CHERCHE, ET CE QU'ON A FILTRÉ.
 *
 * ⚠️ IL VIT DANS LA ROUTE, PAS DANS L'ÉCRAN, et pas non plus dans l'adresse.
 *
 *   · Pas dans l'écran, parce que c'est la convention du produit : un écran est
 *     une fonction pure de sa `Lecture`, et c'est ce qui permet à la salle
 *     d'exposition de montrer la liste filtrée et la recherche sans résultat —
 *     deux formes qu'aucune donnée ne produit et que seul un geste fait
 *     apparaître.
 *
 *   · Pas dans l'adresse, parce que cette route REDIRIGE déjà sur un paramètre
 *     de recherche (`?d=`, plus bas) : un second paramètre qui se croiserait
 *     avec lui dans le même `beforeLoad` est exactement le piège qu'on vient de
 *     retirer. Et un filtre n'est pas une destination : il ne mérite pas une
 *     entrée d'historique entre la liste et le client qu'on y ouvre.
 *
 * ⚠️ ET IL SURVIT À L'OUVERTURE D'UN CLIENT, parce que la route reste montée
 * pendant que son `Outlet` rend la page. Un gérant qui filtre « facture échue »,
 * ouvre un client puis revient retrouve sa liste comme il l'a laissée — c'est
 * tout l'intérêt d'un maître-détail, et c'est perdu si l'état vit plus bas.
 */
function useLectureDeLaListe() {
	const [terme, setTerme] = useState('');
	const [filtres, setFiltres] = useState<ReadonlySet<CleFiltre>>(() => new Set<CleFiltre>());

	return {
		terme,
		filtres,
		onTerme: setTerme,
		onBasculerFiltre: (cle: CleFiltre) =>
			setFiltres((precedents) => {
				// Une copie, jamais une mutation : `Set` n'est pas surveillé par React,
				// et muter celui-ci ne redessinerait rien.
				const suivants = new Set(precedents);
				if (suivants.has(cle)) suivants.delete(cle);
				else suivants.add(cle);
				return suivants;
			}),
		onToutAfficher: () => {
			setTerme('');
			setFiltres(new Set<CleFiltre>());
		}
	};
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/debiteurs.tsx`.
 */
function Debiteurs() {
	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});

	/*
	  ═════════════════════════════════════════════════════════════════════════
	  L'HABITUDE DE PAIEMENT DE TOUT LE LIVRE, EN UNE LECTURE
	  ═════════════════════════════════════════════════════════════════════════

	  ⚠️ UNE SECONDE LECTURE, PAS UNE PAR RANGÉE. `comportement.lire` existe
	  aussi, et elle exige un `debiteurId` : l'appeler dans la boucle des rangées
	  ferait, sur cent clients, cent abonnements Convex ouverts sur cet écran,
	  plus une lecture d'index par facture de chacun. `lireParEtablissement` rend
	  la même matière en deux parcours d'index et un groupement en mémoire —
	  c'est la raison pour laquelle elle est écrite à cette échelle.

	  ⚠️ ELLE NE FAIT PAS ATTENDRE LA LISTE. Les deux lectures partent ensemble
	  et arrivent quand elles veulent ; la liste se rend dès que les débiteurs
	  sont là, et les délais habituels se posent dessus au retour de la seconde.
	  Suspendre la liste sur l'habitude ferait payer un écran entier pour une
	  mention de deuxième plan.

	  ⚠️ `aujourdHuiISO()` À CHAQUE RENDU, ET C'EST SANS DANGER : la valeur est
	  une chaîne, donc l'argument reste égal à lui-même tant que le jour ne
	  change pas, et Convex ne réabonne pas. Le jour où il change, la lecture se
	  refait — ce qui est exactement ce qu'on veut d'un retard compté en jours.
	*/
	const comportements = useQuery(api.recouvrement.comportement.lireParEtablissement, {
		aujourdHui: aujourdHuiISO()
	});

	/*
	  ⚠️ SEULES LES HABITUDES ÉTABLIES ENTRENT DANS LA CARTE, et l'absence de clé
	  est la réponse « on ne sait pas encore ». Le domaine exige quatre règlements
	  datés ; en dessous il rend `connue: false` avec sa raison, et il n'y a AUCUN
	  délai à en tirer. Porter quand même une entrée, ne serait-ce qu'avec un
	  délai à zéro, ferait afficher « Règle le jour dit » sur un client dont on
	  ignore tout — le doute ne profite jamais au produit.

	  ⚠️ ET `undefined` RESTE `undefined` : tant que la lecture est en vol, l'écran
	  doit pouvoir distinguer « rien à dire » de « pas encore lu ». Une carte vide
	  ferait compter tous les retardataires comme non mesurés, le temps d'un
	  aller-retour.

	  Le CONSTAT entier de chaque rupture — la phrase du domaine — n'est pas
	  repris : il vit sur la page du client, et une liste n'est pas un endroit où
	  lire trois lignes par rangée.
	*/
	const habitudes =
		comportements === undefined
			? undefined
			: new Map<string, HabitudeDeLaLigne>(
					comportements
						.map((lecture): readonly [string, HabitudeDeLaLigne] | null =>
							lecture.habitude.connue
								? [
										lecture.debiteurId,
										{
											delaiMedianJours: lecture.habitude.delaiMedianJours,
											echantillon: lecture.habitude.echantillon,
											rompu: lecture.ruptures.length > 0
										}
									]
								: null
						)
						.filter((entree): entree is readonly [string, HabitudeDeLaLigne] => entree !== null)
				);
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
	const lecture = useLectureDeLaListe();

	return (
		<EcranDebiteurs
			enfant={pageOuverte ? <Outlet /> : null}
			donnees={
				debiteurs === undefined
					? { etat: 'attente' }
					: { etat: 'pret', valeur: { debiteurs, choisi, habitudes, ...lecture } }
			}
		/>
	);
}
