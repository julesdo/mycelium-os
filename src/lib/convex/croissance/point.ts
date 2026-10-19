import { v } from 'convex/values';
import { internalAction, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { resend } from '../emails/resend';
import { expediteurNomme } from '../emails/helpers';
import { pointDuLundiHtml, pointDuLundiTexte } from '../emails/modeles/pointDuLundi';
import { ETAPES, type Etape } from '../../croissance/etapes';
import {
	ETAPES_DU_POINT,
	LIBELLES_DES_ETAPES,
	compterParSource,
	ventesApresDiagnostic
} from '../../croissance/semaine';
import { dateLisible } from '../../verticales/recouvrement/calendrier';
import { traficDuSite } from './umami';

/**
 * LE POINT CHIFFRÉ DU LUNDI (16/10/2026) — pour le fondateur, sans IA.
 *
 * Chaque lundi matin : les étapes franchies dans la semaine et sur 28 jours, par
 * source ; les comptes au meilleur score ; le trafic du site. Il part à
 * `FONDATEUR_EMAIL` ; sans elle, il ne part pas.
 */

const JOUR = 24 * 60 * 60 * 1000;
const PLAFOND = 5000;
/** La rangée et la clé des ventes qui suivent un diagnostic (audit, lot 7). */
const VENTES = 'VENTES_APRES_DIAGNOSTIC';
const LIBELLE_DES_VENTES = 'Ventes après un diagnostic';

const vChiffres = v.object({
	totaux: v.array(
		v.object({ etape: v.string(), libelle: v.string(), semaine: v.number(), mois: v.number() })
	),
	sources: v.array(v.object({ source: v.string(), semaine: v.record(v.string(), v.number()) })),
	aAppeler: v.array(v.object({ nom: v.string(), score: v.number(), etape: v.string() }))
});

type Chiffres = typeof vChiffres.type;

export const chiffresDeLaSemaine = internalQuery({
	args: { maintenant: v.number() },
	returns: vChiffres,
	handler: async (ctx, { maintenant }): Promise<Chiffres> => {
		const parcours = await ctx.db.query('parcoursComptes').take(PLAFOND);
		const lus = parcours.map((p) => ({ source: p.source ?? null, etapes: p.etapes }));
		const semaine = compterParSource(lus, maintenant - 7 * JOUR, maintenant);
		const mois = compterParSource(lus, maintenant - 28 * JOUR, maintenant);
		const ventesSemaine = ventesApresDiagnostic(lus, maintenant - 7 * JOUR, maintenant);
		const ventesMois = ventesApresDiagnostic(lus, maintenant - 28 * JOUR, maintenant);

		const meilleurs = parcours
			.filter((p) => (p.score ?? 0) > 0)
			.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
			.slice(0, 10);
		const aAppeler: Chiffres['aAppeler'] = [];
		for (const p of meilleurs) {
			const org = await ctx.db.get(p.organizationId);
			const derniere = [...ETAPES].reverse().find((e: Etape) => p.etapes[e] !== undefined);
			aAppeler.push({
				nom: org?.name ?? 'Établissement supprimé',
				score: p.score ?? 0,
				etape: derniere === undefined ? '' : LIBELLES_DES_ETAPES[derniere].toLowerCase()
			});
		}

		return {
			totaux: [
				...ETAPES_DU_POINT.map((etape) => ({
					etape,
					libelle: LIBELLES_DES_ETAPES[etape],
					semaine: semaine.total[etape] ?? 0,
					mois: mois.total[etape] ?? 0
				})),
				{
					etape: VENTES,
					libelle: LIBELLE_DES_VENTES,
					semaine: ventesSemaine.total,
					mois: ventesMois.total
				}
			],
			sources: semaine.lignes.map((l) => ({
				source: l.source,
				semaine: {
					...(Object.fromEntries(Object.entries(l.compte)) as Record<string, number>),
					...(ventesSemaine.parSource.has(l.source)
						? { [VENTES]: ventesSemaine.parSource.get(l.source) ?? 0 }
						: {})
				}
			})),
			aAppeler
		};
	}
});

function phraseDeSource(source: string, compte: Record<string, number>): string {
	const morceaux = ETAPES_DU_POINT.filter((e) => (compte[e] ?? 0) > 0).map(
		(e) => `${LIBELLES_DES_ETAPES[e].toLowerCase()} ${compte[e]}`
	);
	if ((compte[VENTES] ?? 0) > 0) {
		morceaux.push(`${LIBELLE_DES_VENTES.toLowerCase()} ${compte[VENTES]}`);
	}
	return `${source} : ${morceaux.join(' · ')}`;
}

export const envoyerLePoint = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const destinataire = process.env.FONDATEUR_EMAIL;
		if (!destinataire || !process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL) return null;

		const maintenant = Date.now();
		const chiffres: Chiffres = await ctx.runQuery(internal.croissance.point.chiffresDeLaSemaine, {
			maintenant
		});
		const visiteurs = await traficDuSite(maintenant - 7 * JOUR, maintenant);
		const jour = (t: number) => dateLisible(new Date(t).toISOString().slice(0, 10));
		const donnees = {
			periode: `du ${jour(maintenant - 7 * JOUR)} au ${jour(maintenant - JOUR)}`,
			visiteurs,
			totaux: chiffres.totaux.filter((t) => t.semaine > 0 || t.mois > 0 || t.etape === 'INSCRIT'),
			sources: chiffres.sources.map((s) => phraseDeSource(s.source, s.semaine)),
			aAppeler: chiffres.aAppeler.map(
				(c) => `${c.nom}, ${c.score}${c.etape === '' ? '' : `, ${c.etape}`}`
			)
		};

		await resend.sendEmail(ctx, {
			from: expediteurNomme(process.env.AUTH_EMAIL, 'Plume de Letikette'),
			to: destinataire,
			subject: 'Le point du lundi',
			html: pointDuLundiHtml(donnees),
			text: pointDuLundiTexte(donnees)
		});
		return null;
	}
});
