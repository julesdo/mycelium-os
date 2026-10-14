import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { reglagesDeLaCaisse } from './paddle';
import {
	CLE_ETIQUETTE,
	EVENEMENTS_ECOUTES,
	baseDeLApi,
	catalogueAttendu,
	ecartsDuPrix,
	environnementPaddle,
	type EnvironnementPaddle,
	type PrixAttendu,
	type PrixExistant
} from '../paiement/paddle';

/**
 * LE CATALOGUE PADDLE, TIRÉ DE LA GRILLE AFFICHÉE.
 *
 * Deux produits et six prix, créés d'après `TARIFS` (`config/tarifs.ts`) : le
 * montant prélevé est alors celui que la page publique annonce, au centime.
 * À lancer par le fondateur, sur le déploiement dont la clé est posée :
 *
 *   npx convex run paddleCatalogue:catalogue                  lecture seule
 *   npx convex run paddleCatalogue:catalogue '{"creer":true}' crée ce qui manque
 *
 * (ajouter `--prod` pour le compte live). Le rapport donne les commandes qui
 * posent les six variables de prix, l'adresse du rappel et les événements à
 * cocher.
 *
 * ⚠️ IL N'AJOUTE QUE CE QUI MANQUE, ET IL NE TOUCHE À RIEN D'AUTRE. Aucun
 * produit ni prix n'est modifié, archivé ou supprimé : un prix Paddle déjà
 * utilisé ne se corrige pas, des abonnements en dépendent. Un prix étiqueté qui
 * s'écarte de la grille est NOMMÉ dans le rapport, et rien n'est recréé à sa
 * place ; la décision reste au fondateur. Ce qui n'est pas étiqueté (créé à la
 * main dans le tableau de bord) est listé, jamais repris.
 */

interface ProduitPaddle {
	readonly id: string;
	readonly name: string;
	readonly custom_data: Record<string, unknown> | null;
}

interface PrixPaddle {
	readonly id: string;
	readonly product_id: string;
	readonly name: string | null;
	readonly description: string;
	readonly unit_price: { readonly amount: string; readonly currency_code: string } | null;
	readonly billing_cycle: { readonly interval: string; readonly frequency: number } | null;
	readonly tax_mode: string | null;
	readonly custom_data: Record<string, unknown> | null;
}

interface LignePrix {
	readonly variable: string;
	readonly etiquette: string;
	readonly id: string | null;
	readonly etat: 'existant' | 'cree' | 'a_creer' | 'ecart';
	readonly ecarts: readonly string[];
}

export interface RapportCatalogue {
	readonly environnement: EnvironnementPaddle;
	readonly produits: readonly { etiquette: string; id: string | null; etat: string }[];
	readonly prix: readonly LignePrix[];
	/** Les prix actifs du compte qui ne portent pas notre étiquette. */
	readonly nonEtiquetes: readonly { id: string; nom: string; montant: string; cycle: string }[];
	/** Les commandes qui posent les variables, une fois les prix créés. */
	readonly variables: readonly string[];
	readonly rappel: { readonly adresse: string; readonly evenements: readonly string[] };
	/** Ce qui manque encore pour encaisser sur ce déploiement. */
	readonly caisse: readonly string[];
	readonly erreurs: readonly string[];
}

export const catalogue = internalAction({
	args: { creer: v.optional(v.boolean()) },
	handler: async (_ctx, { creer }): Promise<RapportCatalogue> => {
		const cle = process.env.PADDLE_API_KEY;
		if (!cle) throw new Error('PADDLE_API_KEY n’est pas posée sur ce déploiement.');
		const environnement = environnementPaddle(process.env);
		const api = clientPaddle(baseDeLApi(environnement), cle);
		const erreurs: string[] = [];

		const produits = await api.lister<ProduitPaddle>('/products?status=active&per_page=200');
		const prix = await api.lister<PrixPaddle>('/prices?status=active&per_page=200');

		const lignesProduits: { etiquette: string; id: string | null; etat: string }[] = [];
		const lignesPrix: LignePrix[] = [];

		for (const attendu of catalogueAttendu()) {
			let produit = produits.find((p) => etiquetteDe(p.custom_data) === attendu.etiquette) ?? null;
			let etatProduit = produit ? 'existant' : 'a_creer';
			if (produit === null && creer) {
				try {
					produit = await api.creer<ProduitPaddle>('/products', {
						name: attendu.nom,
						description: attendu.description,
						tax_category: 'saas',
						custom_data: { [CLE_ETIQUETTE]: attendu.etiquette }
					});
					etatProduit = 'cree';
				} catch (e) {
					erreurs.push(`Produit « ${attendu.nom} » : ${(e as Error).message}`);
				}
			}
			lignesProduits.push({
				etiquette: attendu.etiquette,
				id: produit?.id ?? null,
				etat: etatProduit
			});

			for (const attenduPrix of attendu.prix) {
				const existant = prix.find((p) => etiquetteDe(p.custom_data) === attenduPrix.etiquette);
				if (existant) {
					const ecarts = ecartsDuPrix(attenduPrix, lirePrix(existant));
					lignesPrix.push({
						variable: attenduPrix.variable,
						etiquette: attenduPrix.etiquette,
						id: existant.id,
						etat: ecarts.length === 0 ? 'existant' : 'ecart',
						ecarts
					});
					continue;
				}
				if (!creer || produit === null) {
					lignesPrix.push({
						variable: attenduPrix.variable,
						etiquette: attenduPrix.etiquette,
						id: null,
						etat: 'a_creer',
						ecarts: []
					});
					continue;
				}
				try {
					const cree = await api.creer<PrixPaddle>('/prices', corpsDuPrix(produit.id, attenduPrix));
					lignesPrix.push({
						variable: attenduPrix.variable,
						etiquette: attenduPrix.etiquette,
						id: cree.id,
						etat: 'cree',
						ecarts: []
					});
				} catch (e) {
					erreurs.push(`Prix « ${attenduPrix.nom} » : ${(e as Error).message}`);
					lignesPrix.push({
						variable: attenduPrix.variable,
						etiquette: attenduPrix.etiquette,
						id: null,
						etat: 'a_creer',
						ecarts: []
					});
				}
			}
		}

		const suffixe = environnement === 'production' ? ' --prod' : '';
		const reglages = reglagesDeLaCaisse();
		return {
			environnement,
			produits: lignesProduits,
			prix: lignesPrix,
			nonEtiquetes: prix
				.filter((p) => etiquetteDe(p.custom_data) === null)
				.map((p) => ({
					id: p.id,
					nom: p.name ?? p.description,
					montant: p.unit_price ? `${p.unit_price.amount} ${p.unit_price.currency_code}` : '?',
					cycle: p.billing_cycle
						? `${p.billing_cycle.frequency} ${p.billing_cycle.interval}`
						: 'paiement unique'
				})),
			variables: lignesPrix
				.filter((l) => l.id !== null && process.env[l.variable] !== l.id)
				.map((l) => `npx convex env set ${l.variable} ${l.id}${suffixe}`),
			rappel: {
				adresse: `${process.env.CONVEX_SITE_URL ?? '<adresse .convex.site>'}/paddle-webhook`,
				evenements: [...EVENEMENTS_ECOUTES]
			},
			caisse: reglages.pret ? [] : reglages.manque,
			erreurs
		};
	}
});

function corpsDuPrix(produitId: string, attendu: PrixAttendu): Record<string, unknown> {
	return {
		product_id: produitId,
		name: attendu.nom,
		description: `${attendu.etiquette} (créé d’après la grille de Letikette)`,
		unit_price: { amount: attendu.montant, currency_code: attendu.devise },
		billing_cycle: attendu.cycle,
		// La grille affiche des prix hors taxes : Paddle ajoute la TVA du pays.
		tax_mode: 'external',
		quantity: { minimum: 1, maximum: 1 },
		custom_data: { [CLE_ETIQUETTE]: attendu.etiquette }
	};
}

function lirePrix(p: PrixPaddle): PrixExistant {
	return {
		id: p.id,
		montant: p.unit_price?.amount ?? null,
		devise: p.unit_price?.currency_code ?? null,
		cycle: p.billing_cycle,
		modeDeTaxe: p.tax_mode
	};
}

function etiquetteDe(donnees: Record<string, unknown> | null): string | null {
	const etiquette = donnees?.[CLE_ETIQUETTE];
	return typeof etiquette === 'string' ? etiquette : null;
}

/** L'API de Paddle : la pagination suivie jusqu'au bout, et l'erreur de Paddle dite telle quelle. */
function clientPaddle(base: string, cle: string) {
	const entetes = { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' };

	async function lire(reponse: Response): Promise<unknown> {
		const corps = (await reponse.json().catch(() => null)) as {
			data?: unknown;
			error?: { detail?: string; code?: string };
		} | null;
		if (!reponse.ok) {
			throw new Error(
				`Paddle a répondu ${reponse.status}${corps?.error?.code ? ` (${corps.error.code})` : ''} : ${corps?.error?.detail ?? 'sans détail'}`
			);
		}
		return corps;
	}

	return {
		async lister<T>(chemin: string): Promise<T[]> {
			const tout: T[] = [];
			let adresse: string | null = `${base}${chemin}`;
			while (adresse !== null) {
				const corps = (await lire(await fetch(adresse, { headers: entetes }))) as {
					data: T[];
					meta?: { pagination?: { next?: string; has_more?: boolean } };
				};
				tout.push(...corps.data);
				const suite = corps.meta?.pagination;
				adresse = suite?.has_more && suite.next ? suite.next : null;
			}
			return tout;
		},
		async creer<T>(chemin: string, corps: Record<string, unknown>): Promise<T> {
			const reponse = (await lire(
				await fetch(`${base}${chemin}`, {
					method: 'POST',
					headers: entetes,
					body: JSON.stringify(corps)
				})
			)) as { data: T };
			return reponse.data;
		}
	};
}
