import type { ReactNode } from 'react';
import { CatchBoundary, createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranRevelation } from '../../screens/revelation';
import { aujourdHuiISO, type AbandonsAffiches, type Lecture } from '../../ui';

export const Route = createFileRoute('/app/revelation')({
	component: Revelation,
	errorComponent: RevelationEnErreur
});

function RevelationEnErreur() {
	return <EcranRevelation donnees={{ etat: 'erreur' }} />;
}

/**
 * La révélation, branchée sur la base ; le dessin vit dans `screens/revelation.tsx`.
 *
 * La date du jour est lue par `aujourdHuiISO`, seule lecture d'horloge de
 * l'interface — voir `ui/horloge.ts`, qui explique pourquoi elle est commune à
 * cet écran et à l'accueil.
 */
function Revelation() {
	const arreteAu = aujourdHuiISO();
	const revelation = useQuery(api.recouvrement.revelation.revelation, { arreteAu });
	const bilan = useQuery(api.recouvrement.revelation.bilan, { aujourdHui: arreteAu });

	const rendre = (laisseDeCote: Lecture<AbandonsAffiches>): ReactNode => (
		<EcranRevelation
			donnees={
				// Les DEUX lectures entrent dans l'attente : « Ce qui s’est éteint » est
				// un texte de l'écran prêt, et il apparaissait après lui.
				revelation === undefined || bilan === undefined
					? { etat: 'attente' }
					: // ⚠️ `arreteAu` EST LA DATE PASSÉE À LA REQUÊTE, pas une seconde
						// lecture d'horloge. Deux appels à `aujourdHuiISO` peuvent tomber de
						// part et d'autre de minuit, et l'écran daterait alors le chiffre
						// d'un autre jour que celui où il a été calculé.
						{ etat: 'pret', valeur: { revelation, bilan, arreteAu, laisseDeCote } }
			}
		/>
	);

	/*
	  ⚠️ LE CONTRÔLE DE COMPLÉTUDE EST ISOLÉ, ET C'EST LA RAISON D'ÊTRE DE CETTE
	  BORNE. Le motif et son argumentaire vivent dans `ui/facultatif.tsx` : une
	  source qui lève emporte l'écran ENTIER, et cet écran-là porte le chiffre
	  qui justifie l'abonnement.

	  La source isolée est la plus lourde du produit : `abandonsDeLEtablissement`
	  relit TOUS les décomptes et TOUTES les factures de l'établissement, puis
	  deux documents par créance. Sur un gros compte, c'est elle qui touchera en
	  premier les plafonds de lecture d'une transaction Convex — et sans cette
	  borne, elle emporterait avec elle un total dû qui, lui, s'est calculé.

	  ⚠️ LA CLÉ DE REPRISE EST CONSTANTE, comme dans `facultatif.tsx` : réessayer
	  en boucle une requête qui lève ferait clignoter l'écran sans jamais rien
	  afficher de plus. Le contrôle reste éteint jusqu'au prochain montage, et il
	  le DIT — le bloc rend un constat d'échec, jamais un zéro.
	*/
	return (
		<CatchBoundary
			getResetKey={() => 'controle-de-completude'}
			errorComponent={() => rendre({ etat: 'erreur' })}
		>
			<AvecLeControle rendre={rendre} />
		</CatchBoundary>
	);
}

/**
 * LA LECTURE DU CONTRÔLE, SOUS LA BORNE.
 *
 * ⚠️ ELLE EST APPELÉE ICI ET PAS DANS `Revelation`, ET C'EST TOUT L'INTÉRÊT.
 * `useQuery` ne rend pas un échec, il LÈVE au rendu : une requête appelée
 * au-dessus de la borne n'est pas protégée par elle. C'est la seule façon de
 * rendre l'état d'erreur du bloc ATTEIGNABLE — sans quoi il serait un écran
 * écrit que rien ne peut afficher, le défaut même que ce dépôt traque.
 */
function AvecLeControle({
	rendre
}: {
	rendre: (laisseDeCote: Lecture<AbandonsAffiches>) => ReactNode;
}) {
	const abandons = useQuery(api.recouvrement.controle.abandonsDeLEtablissement, {});
	return rendre(
		abandons === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: abandons }
	);
}
