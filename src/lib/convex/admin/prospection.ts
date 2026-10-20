import { ConvexError, type Infer } from 'convex/values';
import type { ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import {
	adresseDeRecherche,
	ANNUAIRE_API,
	lireReponseDeLAnnuaire,
	ZONES,
	type CleSecteur,
	type CleZone,
	type EntrepriseTrouvee
} from '../../crm/annuaire';
import {
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
import { lireJson } from './lectureHttp';
import type { vFournisseurAjoute } from './decpEcriture';
import type { ResultatDeTravail } from './validateursProspection';

/**
 * LA PROSPECTION, CE QUE FONT LES TRAVAUX DE L'ÉQUIPE (17/10/2026, sortie des actions le
 * 20/10/2026 pour tourner en arrière-plan).
 *
 * Des fonctions, pas des fonctions Convex : `travauxExecution.ts` les appelle avec son
 * contexte et un suivi qui écrit l'étape en cours sur le travail, que l'admin montre en
 * direct. La logique pure vit dans `crm/annuaire.ts`, `crm/decp.ts` et `crm/estimation.ts`.
 */

/** Ce que le travail affiche pendant qu'il tourne : l'étape, et où il en est. */
export type Suivi = (etape: string, fait?: number, total?: number) => Promise<void>;

/** Une page de l'annuaire ne garde parfois que huit sièges dans la zone : on enchaîne. */
const SIEGES_VISES = 15;
const PAGES_ANNUAIRE = 3;
const PAGES_DECP = 3;

const DECP = 'Les données de la commande publique';

async function sirensConnus(ctx: ActionCtx, sirens: readonly string[]): Promise<Set<string>> {
	return new Set(
		await ctx.runQuery(internal.admin.annuaireLecture.sirensConnus, { sirens: [...sirens] })
	);
}

export async function chercherALAnnuaire(
	ctx: ActionCtx,
	{
		secteur,
		zone,
		page,
		pagesMax = PAGES_ANNUAIRE
	}: { secteur: CleSecteur; zone: CleZone; page: number; pagesMax?: number },
	suivi: Suivi
): Promise<Extract<ResultatDeTravail, { genre: 'ANNUAIRE' }>> {
	const trouvees: EntrepriseTrouvee[] = [];
	let pages = 1;
	let derniere = Math.max(1, Math.trunc(page));
	for (let lues = 0; lues < pagesMax; lues += 1) {
		await suivi(`Page ${derniere} de l’annuaire`, lues, pagesMax);
		let lue;
		try {
			lue = lireReponseDeLAnnuaire(
				await lireJson(adresseDeRecherche({ secteur, zone, page: derniere }), 'L’annuaire', {
					delaiMs: 15_000
				}),
				ZONES[zone].departements
			);
		} catch (e) {
			if (e instanceof ConvexError) throw e;
			throw new ConvexError('L’annuaire a rendu une réponse inattendue.');
		}
		pages = lue.pages;
		trouvees.push(...lue.entreprises);
		if (trouvees.length >= SIEGES_VISES || derniere >= pages) break;
		derniere += 1;
	}
	const connus = await sirensConnus(
		ctx,
		trouvees.map((e) => e.siren)
	);
	return {
		genre: 'ANNUAIRE',
		pages,
		derniere,
		entreprises: trouvees.map((e) => ({ ...e, connue: connus.has(e.siren) }))
	};
}

export async function chercherDansLaCommandePublique(
	ctx: ActionCtx,
	{
		acheteurs,
		zone,
		page,
		jour,
		pagesMax = PAGES_DECP
	}: { acheteurs: CleAcheteurs; zone: CleZone; page: number; jour: string; pagesMax?: number },
	suivi: Suivi
): Promise<Extract<ResultatDeTravail, { genre: 'DECP' }>> {
	const lignes: LigneDecp[] = [];
	let pages = 1;
	let nonDiffusibles = 0;
	let derniere = Math.max(1, Math.trunc(page));
	for (let lues = 0; lues < pagesMax; lues += 1) {
		await suivi(`Page ${derniere} de la commande publique`, lues, pagesMax);
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
		if (derniere >= pages || lues === pagesMax - 1) break;
		derniere += 1;
	}
	const titulaires = regrouperParTitulaire(lignes).slice(0, 75);
	const connus = await sirensConnus(
		ctx,
		titulaires.map((t) => t.siren)
	);
	return {
		genre: 'DECP',
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

export type FournisseurPrepare = Infer<typeof vFournisseurAjoute>;

/**
 * Un fournisseur public prêt à entrer au CRM : son siège vérifié dans la zone à l'annuaire,
 * TOUS ses marchés depuis l'année que la loi laisse réclamer, et l'estimation qui en sort.
 */
export async function preparerFournisseur(
	titulaire: TitulaireDecp,
	{ zone, jour, maintenant }: { zone: CleZone; jour: string; maintenant: number }
): Promise<{ genre: 'HORS_ZONE' } | { genre: 'PRET'; fournisseur: FournisseurPrepare }> {
	// Le siège dans la zone, l'entreprise diffusible et privée : la règle de l'annuaire.
	const annuaire = lireReponseDeLAnnuaire(
		await lireJson(
			`${ANNUAIRE_API}?${new URLSearchParams({ q: titulaire.siren, per_page: '1' }).toString()}`,
			'L’annuaire',
			{ delaiMs: 15_000 }
		),
		ZONES[zone].departements
	).entreprises.find((e) => e.siren === titulaire.siren);
	if (annuaire === undefined) return { genre: 'HORS_ZONE' };

	let lignes: LigneDecp[];
	try {
		lignes = lireExportDecp(
			await lireJson(adresseDecpDuTitulaire({ siren: titulaire.siren, jour }), DECP, {
				delaiMs: 45_000
			})
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
	const resume = complet ?? titulaire;
	const prospect = versProspectDecp(resume, annuaire, maintenant);
	const depuis = anneeDeDepart(jour).split('-').reverse().join('/');
	const s = (n: number) => (n > 1 ? 's' : '');
	return {
		genre: 'PRET',
		fournisseur: {
			entreprise: prospect.entreprise,
			siren: titulaire.siren,
			...(prospect.activite === undefined ? {} : { activite: prospect.activite }),
			...(prospect.effectif === undefined ? {} : { effectif: prospect.effectif }),
			...(prospect.ville === undefined ? {} : { ville: prospect.ville }),
			...(prospect.dirigeant === undefined ? {} : { dirigeant: prospect.dirigeant }),
			...(prospect.fonction === undefined ? {} : { fonction: prospect.fonction }),
			trouveOu: prospect.trouveOu ?? '',
			notes: `${resume.marches} marché${s(resume.marches)} public${s(resume.marches)} depuis le ${depuis}, avec ${resume.nombreDAcheteurs} acheteur${s(resume.nombreDAcheteurs)} : ${resume.acheteurs.join(', ')}.`,
			...(estimation.totalCentimes > 0n ? { montantEstimeCentimes: estimation.totalCentimes } : {}),
			...(estimation.dateButoir === null ? {} : { dateButoir: estimation.dateButoir }),
			estimation: {
				segments: estimation.segments,
				hypotheses: estimation.hypotheses,
				calculeeLe: maintenant
			}
		}
	};
}
