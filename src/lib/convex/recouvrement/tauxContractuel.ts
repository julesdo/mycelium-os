import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedMutation } from '../functions';
import { getUserOrg } from '../lib/auth';
import {
	controlerTauxContractuel,
	tauxDepuisPourcentage
} from '../../verticales/recouvrement/taux-contractuel';

/**
 * LE TAUX CONTRACTUEL, ENFIN ÉCRIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CE FICHIER CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `facturesVente.tauxContractuel` était déclaré au schéma et LU par les deux
 * moteurs de calcul. Il n'était écrit nulle part : aucune mutation, aucun
 * import, aucun écran. Tout créancier dont les conditions générales stipulent
 * un taux retombait donc silencieusement sur le taux légal — le produit
 * SOUS-RÉCLAMAIT.
 *
 * Cinquième occurrence du défaut « déclaré, lu, jamais alimenté ». Aucune ne
 * s'est vue au compilateur : le champ est optionnel, le calcul a son repli, et
 * tout fonctionne. C'est précisément ce qui les rend coûteuses.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * IL SE POSE PAR DÉBITEUR, PARCE QU'UNE STIPULATION GOUVERNE UNE RELATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le champ vit sur la FACTURE — c'est là que le calcul le lit, et c'est juste :
 * deux factures d'un même client peuvent relever de conditions différentes si
 * elles ont été signées à des moments différents.
 *
 * Mais un taux se saisit par RELATION : il vient des conditions générales, pas
 * d'une ligne de facturation. Demander de le retaper sur chacune des
 * quarante-trois factures d'un débiteur garantirait qu'on ne le saisisse
 * jamais — et un champ qu'on ne remplit pas est exactement ce qu'on vient de
 * corriger.
 *
 * On l'applique donc à toutes les factures NON SOLDÉES du débiteur.
 *
 * ⚠️ ET JAMAIS AUX FACTURES SOLDÉES. Une facture réglée a produit ses intérêts
 * sur le taux en vigueur au moment où elle courait ; les récrire
 * rétroactivement changerait un décompte déjà remis, peut-être déjà contesté.
 * Un décompte arrêté est figé, définitivement — c'est la règle du produit.
 */

const vResultat = v.object({
	/** Combien de factures ont reçu le taux. */
	facturesTouchees: v.number(),
	/** Vrai quand le taux déclaré est sous le plancher légal constaté. */
	sousLePlancher: v.boolean(),
	/** Faux quand le semestre n'est pas relevé : le contrôle n'a PAS eu lieu. */
	plancherConnu: v.boolean(),
	/** Le constat, à afficher tel quel. Jamais reformulé par l'écran. */
	constat: v.string()
});

async function poserLeTaux(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>,
	pourcentage: string | null,
	aLaDate: string
) {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
		.collect();

	// Le cloisonnement est vérifié EN PLUS de l'index : c'est la règle du
	// produit, sans exception.
	const concernees = factures.filter(
		(f) => f.organizationId === organizationId && f.statutPaiement !== 'SOLDEE'
	);

	// ── L'EFFACEMENT ────────────────────────────────────────────────────────
	//
	// Retirer la stipulation fait retomber le calcul sur la série légale, ce qui
	// est le comportement par défaut documenté. C'est une action légitime : un
	// créancier qui s'est trompé de client doit pouvoir revenir en arrière.
	if (pourcentage === null) {
		for (const facture of concernees) {
			await ctx.db.patch(facture._id, { tauxContractuel: undefined });
		}
		return {
			facturesTouchees: concernees.length,
			sousLePlancher: false,
			plancherConnu: true,
			constat:
				'Le taux contractuel est retiré. Les intérêts repartent sur le taux légal — ' +
				'BCE majoré de dix points, recalculé à chaque semestre.'
		};
	}

	// `tauxDepuisPourcentage` refuse trois décimales, le zéro et le négatif. Un
	// taux mal lu ici entrerait dans un décompte qui part chez un tiers.
	let taux;
	try {
		taux = tauxDepuisPourcentage(pourcentage);
	} catch (e) {
		throw new ConvexError(e instanceof Error ? e.message : 'Taux refusé.');
	}

	const controle = controlerTauxContractuel(taux, aLaDate);

	// ⚠️ ON ENREGISTRE MÊME SOUS LE PLANCHER. Refuser reviendrait à relever
	// d'office un taux jugé trop bas, c'est-à-dire à écrire une conséquence
	// juridique que personne n'a validée — ce que `pays/france/taux.ts`
	// interdit explicitement. On constate, le créancier décide.
	for (const facture of concernees) {
		await ctx.db.patch(facture._id, {
			tauxContractuel: {
				numerateur: controle.taux.numerateur,
				denominateur: controle.taux.denominateur
			}
		});
	}

	return {
		facturesTouchees: concernees.length,
		sousLePlancher: controle.sousLePlancher,
		plancherConnu: controle.plancherConnu,
		constat:
			concernees.length === 0
				? 'Aucune facture non soldée pour ce débiteur : le taux n’a été appliqué nulle part.'
				: controle.constat
	};
}

/** Sans authentification — pour les tests. */
export const renseignerInterne = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		/** `null` retire la stipulation et fait retomber sur le taux légal. */
		pourcentage: v.union(v.string(), v.null()),
		aLaDate: v.string()
	},
	returns: vResultat,
	handler: async (ctx, { organizationId, debiteurId, pourcentage, aLaDate }) =>
		poserLeTaux(ctx, organizationId, debiteurId, pourcentage, aLaDate)
});

export const renseigner = authedMutation({
	args: {
		debiteurId: v.id('debiteurs'),
		pourcentage: v.union(v.string(), v.null()),
		aLaDate: v.string()
	},
	returns: vResultat,
	handler: async (ctx, { debiteurId, pourcentage, aLaDate }) => {
		const { organizationId } = await getUserOrg(ctx);
		return poserLeTaux(ctx, organizationId, debiteurId, pourcentage, aLaDate);
	}
});
