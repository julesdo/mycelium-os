import type { ConditionLegale } from './qualification';

/**
 * LES TERMES DU TEXTE, ET RIEN D'AUTRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE FICHIER EXISTE À PART
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le tableau des conditions montre deux colonnes de mots : le nom de tous les
 * jours — « La somme est due » — et, en second et en plus petit, le terme que
 * le texte emploie — « créance certaine ». Le second est la DONNÉE : c'est ce
 * qu'un gérant retrouvera dans un code ou dans une lettre d'avocat, et le
 * reformuler le priverait de son seul usage.
 *
 * Le balayage du lexique (`__tests__/lexique.test.ts`) exempte donc ce fichier
 * NOMMÉMENT. Il est minuscule pour cette raison : tout ce qu'on y met échappe
 * à la barrière, alors on n'y met que ça.
 *
 * Le nom de tous les jours, lui, vit dans `qualification.ts` et reste balayé.
 */
export const TERME_JURIDIQUE: Record<ConditionLegale, string> = {
	certaine: 'créance certaine',
	liquide: 'créance liquide',
	exigible: 'créance exigible',
	entreCommercants: 'facturation entre commerçants'
};
