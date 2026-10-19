import type { Extrait } from '../../ui/cms';

/**
 * LES EXTRAITS DU CMS (19/10/2026) : les morceaux de MDX que l’éditeur insère au curseur.
 * Une valeur de la loi ne se tape pas dans un article : elle s’insère, sous la forme du
 * composant qui la lit au registre (`marketing/mdx.tsx`).
 *
 * Hors de l’interface exprès : ce sont des noms de composants (`<Indemnite />`), que le
 * balayage du lexique lirait comme du texte affiché.
 */
export const EXTRAITS: readonly Extrait[] = [
	{ libelle: 'Frais de recouvrement (montant)', code: '<Indemnite />' },
	{ libelle: 'Taux des pénalités du semestre', code: '<TauxDePenalites />' },
	{ libelle: 'Majoration du taux BCE', code: '<Majoration />' },
	{ libelle: 'Taux public du semestre', code: '<TauxPublic />' },
	{ libelle: 'Majoration publique', code: '<MajorationPublique />' },
	{ libelle: 'Délai pour agir, général', code: '<DelaiPourAgir />' },
	{
		libelle: 'Délai pour agir, transport',
		code: '<DelaiPourAgir regime="TRANSPORT_MARCHANDISES" />'
	},
	{ libelle: 'Délai pour agir, particulier', code: '<DelaiPourAgir regime="CONSOMMATEUR" />' },
	{ libelle: 'Délai de paiement d’un hôpital', code: '<DelaiPublic acheteur="SANTE" />' },
	{
		libelle: 'Délai de paiement d’une collectivité',
		code: '<DelaiPublic acheteur="POUVOIR_ADJUDICATEUR" />'
	},
	{ libelle: 'Plafond convenu après facture', code: '<DelaiConvenu cas="apresFacture" />' },
	{ libelle: 'Plafond convenu fin de mois', code: '<DelaiConvenu cas="finDeMois" />' },
	{
		libelle: 'Plafond du transport routier',
		code: '<Valeur de="delaiPaiementTransportRoutier" />'
	},
	{ libelle: 'Source d’une règle', code: '<Source de="indemniteForfaitaire" />' },
	{ libelle: 'Encadré À retenir', code: '<Encadre titre="À retenir">\n\n- \n\n</Encadre>\n' },
	{
		libelle: 'Encadré Idée reçue',
		code: '<Encadre titre="Idée reçue" variante="attention">\n\n\n\n</Encadre>\n'
	},
	{
		libelle: 'Décompte d’exemple',
		code: '<ExempleDecompte montant={4800} echeance="2026-06-30" arrete="2026-07-14" />\n'
	},
	{
		libelle: 'Décompte d’exemple, client public',
		code: '<ExempleDecompte montant={12840} echeance="2026-07-09" arrete="2026-09-17" publique />\n'
	},
	{ libelle: 'Frais par facture (compteur)', code: '<CompteurIndemnites factures={6} />\n' },
	{ libelle: 'Délais pour agir (barres)', code: '<DelaisParSecteur />\n' },
	{
		libelle: 'Capture d’un métier',
		code: '<Capture\n\tecran="metier-batiment-cartes"\n\tlegende="Ce que montre la capture."\n/>\n'
	},
	{
		libelle: 'Fin d’article (Letikette, mention)',
		code: '## Ce que fait Letikette\n\nDeux phrases, sans forcer.\n\n---\n\nCet article présente des règles générales. Il ne constitue pas un conseil juridique : la décision\nd’agir, et la manière de le faire, restent les vôtres.\n'
	}
];
