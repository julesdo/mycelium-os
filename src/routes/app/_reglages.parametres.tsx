import { createFileRoute } from '@tanstack/react-router';
import { EtablissementEnErreur, PageEtablissement } from './_reglages.parametres_.etablissement';

/**
 * `/app/parametres` : LA SECTION PAR DÉFAUT DES RÉGLAGES.
 *
 * ⚠️ LA LISTE N'EST PAS ICI, ELLE VIT DANS LA MISE EN PAGE `_reglages.tsx`. Un
 * `_reglages.index.tsx` déclarerait `/app/`, déjà pris par l'accueil. Cette
 * route rend donc le volet droit de `/app/parametres` : l'établissement, la
 * première section, sans réécrire l'adresse.
 *
 * Sous 1024 px, la mise en page montre la liste et masque ce volet : c'est la
 * liste qu'on vient chercher en touchant « Réglages ».
 */
export const Route = createFileRoute('/app/_reglages/parametres')({
	component: PageEtablissement,
	errorComponent: EtablissementEnErreur
});
