import { v, ConvexError, type Infer } from 'convex/values';
import { internal } from '../_generated/api';
import { jourDeParis } from '../../admin/dates';
import {
	ACHETEURS,
	adresseDecpDeLaZone,
	adresseDecpDuTitulaire,
	anneeDeDepart,
	lireExportDecp,
	lirePageDecp,
	regrouperParTitulaire,
	versProspectDecp,
	type CleAcheteurs,
	type LigneDecp,
	type TitulaireDecp
} from '../../crm/decp';
import { estimer } from '../../crm/estimation';
import {
	adresseDelaisDesBudgets,
	BUDGETS_PAR_APPEL,
	lireDelaisDesBudgets
} from '../../crm/retards-publics';
import { ANNUAIRE_API, lireReponseDeLAnnuaire, ZONES, type CleZone } from '../../crm/annuaire';
import { equipeAction } from './action';

/**
 * TROUVER DES FOURNISSEURS PUBLICS, PUIS LES AJOUTER (19/10/2026, audit stratégique, lot 5).
 *
 * `chercherDecp` lit trois pages des données de la commande publique (logique pure dans
 * `crm/decp.ts`), regroupe les marchés par titulaire et dit lesquels sont déjà au CRM.
 * `ajouterDecp` reprend, pour chaque titulaire coché, TOUS ses marchés depuis l'année que
 * la loi laisse encore réclamer, vérifie à l'annuaire que son siège est dans la zone (la
 * règle de « Trouver »), lit le délai des budgets de ses collectivités (DGFiP) et écrit
 * l'estimation sur sa fiche (`crm/estimation.ts`). Rien n'entre avant « Ajouter ».
 */

const vAcheteurs = v.union(v.literal('HOPITAUX'), v.literal('COLLECTIVITES'));
const vZone = v.union(v.literal('PARIS'), v.literal('PETITE_COURONNE'), v.literal('ILE_DE_FRANCE'));
const _acheteurs: Record<CleAcheteurs, Infer<typeof vAcheteurs>> = {
	HOPITAUX: 'HOPITAUX',
	COLLECTIVITES: 'COLLECTIVITES'
};
void _acheteurs;

const vTitulaireTrouve = v.object({
	siren: v.string(),
	siret: v.string(),
	nom: v.string(),
	departement: v.optional(v.string()),
	marches: v.number(),
	nombreDAcheteurs: v.number(),
	acheteurs: v.array(v.string()),
	plafondCentimes: v.int64(),
	dernierMarche: v.string()
});

const PAGES_PAR_APPEL = 3;
/** L'ajout lit l'annuaire et la DECP pour chacun : vingt à la fois. */
const AJOUT_MAX = 20;

async function lireJson(adresse: string, quoi: string): Promise<unknown> {
	let reponse: Response;
	try {
		reponse = await fetch(adresse, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(30_000)
		});
	} catch {
		throw new ConvexError(`${quoi} ne répond pas. Réessayez dans un instant.`);
	}
	if (reponse.status === 429) {
		throw new ConvexError(`${quoi} demande de ralentir. Réessayez dans quelques secondes.`);
	}
	if (!reponse.ok) throw new ConvexError(`${quoi} a refusé la demande (erreur ${reponse.status}).`);
	return reponse.json();
}

const DECP = 'Les données de la commande publique';

export const chercherDecp = equipeAction('SUPPORT')({
	args: { acheteurs: vAcheteurs, zone: vZone, page: v.number() },
	returns: v.object({
		pages: v.number(),
		derniere: v.number(),
		nonDiffusibles: v.number(),
		titulaires: v.array(v.object({ ...vTitulaireTrouve.fields, connue: v.boolean() }))
	}),
	handler: async (
		ctx,
		{ acheteurs, zone, page }
	): Promise<{
		pages: number;
		derniere: number;
		nonDiffusibles: number;
		titulaires: (Omit<TitulaireDecp, 'acheteurs'> & { acheteurs: string[]; connue: boolean })[];
	}> => {
		const jour = jourDeParis(Date.now());
		const lignes: LigneDecp[] = [];
		let pages = 1;
		let nonDiffusibles = 0;
		let derniere = Math.max(1, Math.trunc(page));
		for (let lues = 0; lues < PAGES_PAR_APPEL; lues += 1) {
			let lue;
			try {
				lue = lirePageDecp(
					await lireJson(adresseDecpDeLaZone({ acheteurs, zone, jour, page: derniere }), DECP)
				);
			} catch (e) {
				if (e instanceof ConvexError) throw e;
				throw new ConvexError(`${DECP} ont rendu une réponse inattendue.`);
			}
			pages = lue.pages;
			nonDiffusibles += lue.nonDiffusibles;
			lignes.push(...lue.lignes);
			if (derniere >= pages || lues === PAGES_PAR_APPEL - 1) break;
			derniere += 1;
		}
		const titulaires = regrouperParTitulaire(lignes).slice(0, 75);
		const connus = new Set(
			await ctx.runQuery(internal.admin.annuaireLecture.sirensConnus, {
				sirens: titulaires.map((t) => t.siren)
			})
		);
		return {
			pages,
			derniere,
			nonDiffusibles,
			titulaires: titulaires.map((t) => ({
				...t,
				acheteurs: [...t.acheteurs],
				connue: connus.has(t.siren)
			}))
		};
	}
});

/** Le délai moyen des budgets de ces collectivités, cinquante SIRET par appel. */
async function delaisDesBudgets(sirets: readonly string[]): Promise<Map<string, number>> {
	const delais = new Map<string, number>();
	const uniques = [...new Set(sirets)];
	for (let i = 0; i < uniques.length; i += BUDGETS_PAR_APPEL) {
		const lot = uniques.slice(i, i + BUDGETS_PAR_APPEL);
		try {
			const lus = lireDelaisDesBudgets(
				await lireJson(adresseDelaisDesBudgets(lot), 'Les délais de paiement des collectivités')
			);
			for (const [siret, d] of lus) delais.set(siret, d);
		} catch {
			// Sans la DGFiP, l'estimation retombe sur la moyenne de métropole, et le dit.
		}
	}
	return delais;
}

export const ajouterDecp = equipeAction('SUPPORT')({
	args: { acheteurs: vAcheteurs, zone: vZone, titulaires: v.array(vTitulaireTrouve) },
	returns: v.object({ importes: v.number(), ecartes: v.number(), horsZone: v.number() }),
	handler: async (
		ctx,
		{ acheteurs, zone, titulaires }
	): Promise<{ importes: number; ecartes: number; horsZone: number }> => {
		if (titulaires.length === 0) throw new ConvexError('Aucun fournisseur coché.');
		if (titulaires.length > AJOUT_MAX)
			throw new ConvexError(`Au plus ${AJOUT_MAX} fournisseurs à la fois.`);
		const maintenant = Date.now();
		const jour = jourDeParis(maintenant);
		const departements = ZONES[zone as CleZone].departements;
		let horsZone = 0;
		const fournisseurs = [];
		for (const t of titulaires) {
			if (!/^\d{9}$/.test(t.siren)) continue;
			// Le siège dans la zone, l'entreprise diffusible et privée : la règle de l'annuaire.
			const annuaire = lireReponseDeLAnnuaire(
				await lireJson(
					`${ANNUAIRE_API}?${new URLSearchParams({ q: t.siren, per_page: '1' }).toString()}`,
					'L’annuaire'
				),
				departements
			).entreprises.find((e) => e.siren === t.siren);
			if (annuaire === undefined) {
				horsZone += 1;
				continue;
			}
			let lignes: LigneDecp[];
			try {
				lignes = lireExportDecp(
					await lireJson(adresseDecpDuTitulaire({ siren: t.siren, jour }), DECP)
				).lignes;
			} catch (e) {
				if (e instanceof ConvexError) throw e;
				throw new ConvexError(`${DECP} ont rendu une réponse inattendue.`);
			}
			const delais = await delaisDesBudgets(
				lignes.filter((l) => l.genre === 'COLLECTIVITE').map((l) => l.acheteurId)
			);
			const estimation = estimer(lignes, delais, jour);
			const [complet] = regrouperParTitulaire(lignes);
			const resume = complet ?? t;
			const prospect = versProspectDecp(resume, annuaire, maintenant);
			fournisseurs.push({
				entreprise: prospect.entreprise,
				siren: t.siren,
				...(prospect.activite === undefined ? {} : { activite: prospect.activite }),
				...(prospect.effectif === undefined ? {} : { effectif: prospect.effectif }),
				...(prospect.ville === undefined ? {} : { ville: prospect.ville }),
				...(prospect.dirigeant === undefined ? {} : { dirigeant: prospect.dirigeant }),
				...(prospect.fonction === undefined ? {} : { fonction: prospect.fonction }),
				trouveOu: prospect.trouveOu ?? '',
				notes: `${resume.marches} marché${resume.marches > 1 ? 's' : ''} public${resume.marches > 1 ? 's' : ''} depuis le ${anneeDeDepart(jour).split('-').reverse().join('/')}, avec ${resume.nombreDAcheteurs} acheteur${resume.nombreDAcheteurs > 1 ? 's' : ''} : ${resume.acheteurs.join(', ')}.`,
				...(estimation.totalCentimes > 0n
					? { montantEstimeCentimes: estimation.totalCentimes }
					: {}),
				...(estimation.dateButoir === null ? {} : { dateButoir: estimation.dateButoir }),
				estimation: {
					segments: estimation.segments,
					hypotheses: estimation.hypotheses,
					calculeeLe: maintenant
				}
			});
		}
		const libelle = `Commande publique : ${ACHETEURS[acheteurs].libelle}, ${ZONES[zone as CleZone].libelle}`;
		const { importes, ecartes } = await ctx.runMutation(
			internal.admin.decpEcriture.ajouterLesFournisseurs,
			{ fournisseurs, libelle, lignes: titulaires.length, par: ctx.equipier.email }
		);
		return { importes, ecartes: ecartes - horsZone, horsZone };
	}
});
