'use node';

import { v, ConvexError, type Infer } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { jourDeParis } from '../../admin/dates';
import { extraireAvecClaude } from '../../socle/documents/extracteur';
import {
	classerParLesRegles,
	cleDuSegment,
	libelleDuSegment,
	messagePourPlume,
	nomDe,
	PROMPT_PROSPECTS_DU_JOUR,
	retenir,
	schemaChoixDePlume,
	sirenDe,
	type Candidat,
	type ChoixDePlume
} from '../../crm/prospects-du-jour';
import type { vFournisseurAjoute } from './decpEcriture';
import type { NoteDeTravail } from './travauxExecution';
import { chercherALAnnuaire, chercherDansLaCommandePublique, preparerFournisseur } from './prospection';
import type { vEntrepriseTrouvee, vSecteur } from './validateursProspection';

/**
 * LE CHOIX DU MATIN DE PLUME (20/10/2026), dans les travaux de l'équipe.
 *
 * Segment par segment, une page des sources, là où le segment s'est arrêté la veille ; les
 * entreprises déjà au CRM écartées ; les quarante meilleures par les règles
 * (`crm/prospects-du-jour.ts`) montrées à Plume, qui classe et dit pourquoi ; les retenues
 * ajoutées au CRM, les fournisseurs publics avec leur estimation. Sans Plume, les règles
 * choisissent seules, et le travail le dit. Huit minutes au plus : au-delà, ce qui reste
 * attend demain.
 */

const A_REGARDER = 40;
const BUDGET_MS = 8 * 60_000;

type Entree = { entreprise: Infer<typeof vEntrepriseTrouvee>; secteur: Infer<typeof vSecteur>; notes: string };
type Fournisseur = Infer<typeof vFournisseurAjoute>;

function messageDe(e: unknown): string {
	if (e instanceof ConvexError && typeof e.data === 'string') return e.data;
	return 'Le choix du jour s’est arrêté sur une erreur inattendue. Relancez-le.';
}

function dateFrancaise(jour: string): string {
	const [annee, mois, j] = jour.split('-');
	return `${j}/${mois}/${annee}`;
}

export const executer = internalAction({
	args: { id: v.id('travauxEquipe') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		const t = await ctx.runQuery(internal.admin.travauxExecution.lire, { id });
		if (t === null || t.etat === 'FAIT' || t.etat === 'ECHEC') return null;
		const debut = Date.now();
		const noter = async (note: NoteDeTravail): Promise<void> => {
			await ctx.runMutation(internal.admin.travauxExecution.noter, { id, ...note });
		};
		await noter({ etat: 'EN_COURS', commenceLe: debut });

		try {
			const reglages = await ctx.runQuery(internal.admin.prospectsDuJour.lireReglages, {});
			const jour = jourDeParis(debut);
			const { zone, segments, parJour } = reglages;
			const curseurs = new Map(reglages.curseurs.map((c) => [c.cle, c.page]));
			const echecs: string[] = [];
			const candidats: Candidat[] = [];
			const silencieux = async () => undefined;

			for (const [rang, segment] of segments.entries()) {
				const cle = cleDuSegment(segment);
				const page = curseurs.get(cle) ?? 1;
				await noter({
					etape: `${libelleDuSegment(segment)} : les entreprises neuves`,
					fait: rang,
					total: segments.length + 2
				});
				try {
					if (segment.source === 'ANNUAIRE') {
						const lu = await chercherALAnnuaire(
							ctx,
							{ secteur: segment.secteur, zone, page, pagesMax: 2 },
							silencieux
						);
						for (const { connue, ...entreprise } of lu.entreprises) {
							if (!connue) candidats.push({ source: 'ANNUAIRE', secteur: segment.secteur, entreprise });
						}
						curseurs.set(cle, lu.derniere >= lu.pages ? 1 : lu.derniere + 1);
					} else {
						const lu = await chercherDansLaCommandePublique(
							ctx,
							{ acheteurs: segment.acheteurs, zone, page, jour, pagesMax: 1 },
							silencieux
						);
						for (const { connue, ...titulaire } of lu.titulaires) {
							if (!connue) candidats.push({ source: 'DECP', acheteurs: segment.acheteurs, titulaire });
						}
						curseurs.set(cle, lu.derniere >= lu.pages ? 1 : lu.derniere + 1);
					}
				} catch {
					echecs.push(libelleDuSegment(segment));
				}
			}
			await ctx.runMutation(internal.admin.prospectsDuJour.avancerCurseurs, {
				curseurs: [...curseurs].map(([cle, page]) => ({ cle, page }))
			});

			// Une entreprise trouvée par deux segments ne compte qu'une fois.
			const vus = new Set<string>();
			const uniques = candidats.filter((c) => {
				if (vus.has(sirenDe(c))) return false;
				vus.add(sirenDe(c));
				return true;
			});
			const aRegarder = classerParLesRegles(uniques, jour).slice(0, A_REGARDER);

			await noter({
				etape: 'Plume choisit les plus prometteuses',
				fait: segments.length,
				total: segments.length + 2
			});
			let choix: ChoixDePlume | null = null;
			if (aRegarder.length > 0) {
				try {
					const { doc } = await extraireAvecClaude({
						contenu: { type: 'texte', texte: messagePourPlume(aRegarder, parJour) },
						schema: schemaChoixDePlume,
						prompt: PROMPT_PROSPECTS_DU_JOUR
					});
					choix = doc;
				} catch {
					// Sans Plume, les règles choisissent seules : le résultat le dit.
				}
			}
			const retenus = retenir(choix, aRegarder, parJour, jour);

			const entrees: Entree[] = [];
			const fournisseurs: Fournisseur[] = [];
			const pourquoiParSiren = new Map<string, { entreprise: string; segment: string; pourquoi: string }>();
			for (const [rang, { candidat, pourquoi }] of retenus.entries()) {
				const nom = nomDe(candidat);
				if (Date.now() - debut > BUDGET_MS) {
					echecs.push(`${nom} (repris demain)`);
					continue;
				}
				await noter({ etape: `${nom} : sa fiche`, fait: rang, total: retenus.length });
				const notes = `Proposé par Plume le ${dateFrancaise(jour)} : ${pourquoi}`;
				const segment =
					candidat.source === 'ANNUAIRE'
						? libelleDuSegment({ source: 'ANNUAIRE', secteur: candidat.secteur })
						: libelleDuSegment({ source: 'DECP', acheteurs: candidat.acheteurs });
				if (candidat.source === 'ANNUAIRE') {
					entrees.push({ entreprise: candidat.entreprise, secteur: candidat.secteur, notes });
					pourquoiParSiren.set(sirenDe(candidat), { entreprise: nom, segment, pourquoi });
					continue;
				}
				try {
					const pret = await preparerFournisseur(candidat.titulaire, {
						zone,
						jour,
						maintenant: Date.now()
					});
					if (pret.genre === 'PRET') {
						fournisseurs.push({
							...pret.fournisseur,
							notes: [notes, pret.fournisseur.notes].filter(Boolean).join('\n')
						});
						pourquoiParSiren.set(sirenDe(candidat), { entreprise: nom, segment, pourquoi });
					}
				} catch {
					echecs.push(nom);
				}
			}

			const { sirens } = await ctx.runMutation(internal.admin.prospectsDuJourEcriture.ajouterLeChoix, {
				entreprises: entrees,
				fournisseurs,
				libelle: `Plume, prospects du ${dateFrancaise(jour)}`,
				par: t.par
			});
			await noter({
				etat: 'FAIT',
				etape: 'Fini',
				fait: sirens.length,
				total: sirens.length,
				resultat: {
					genre: 'SELECTION',
					examines: uniques.length,
					parPlume: choix !== null,
					ajoutes: sirens.flatMap((siren) => {
						const d = pourquoiParSiren.get(siren);
						return d === undefined ? [] : [{ siren, ...d }];
					}),
					echecs
				},
				finiLe: Date.now()
			});
		} catch (e) {
			await noter({ etat: 'ECHEC', erreur: messageDe(e), finiLe: Date.now() });
		}
		return null;
	}
});
