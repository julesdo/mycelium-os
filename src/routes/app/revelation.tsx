import { createFileRoute } from '@tanstack/react-router';
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

	/**
	 * LE CONTRÔLE DE COMPLÉTUDE DE TOUT L'ÉTABLISSEMENT.
	 *
	 * ═══════════════════════════════════════════════════════════════════════
	 * ⚠️ IL N'ENTRE PAS DANS L'ATTENTE COMMUNE, ET C'EST UNE DÉCISION
	 * ═══════════════════════════════════════════════════════════════════════
	 *
	 * Les deux lectures ci-dessus se font sur les factures. Celle-ci relit
	 * TOUS les décomptes et TOUTES les factures de l'établissement, puis rejoue
	 * `controlerDecompte` sur le dernier décompte de chaque créance : c'est la
	 * seule lecture de l'écran dont le coût croît avec l'ancienneté du compte.
	 * La faire attendre par le chiffre qui justifie l'abonnement reviendrait à
	 * payer le bloc le plus lourd sur toute la page.
	 *
	 * Elle voyage donc avec son propre état, que le bloc rend lui-même : en
	 * cours, en échec, ou arrêté (règle d'écran n° 2, tout traitement se voit).
	 *
	 * ⚠️ `useQuery` NE DIT PAS L'ÉCHEC, IL LÈVE. Une requête en erreur remonte à
	 * `errorComponent` et emporte l'écran entier ; l'état `erreur` que le bloc
	 * sait rendre existe pour la salle, qui le montre, et pour le jour où cette
	 * lecture sera isolée derrière sa propre barrière. Ce qui ne doit jamais
	 * arriver, c'est qu'un échec se lise comme un zéro — et il ne le peut pas.
	 */
	const abandons = useQuery(api.recouvrement.controle.abandonsDeLEtablissement, {});
	const laisseDeCote: Lecture<AbandonsAffiches> =
		abandons === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: abandons };

	return (
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
}
