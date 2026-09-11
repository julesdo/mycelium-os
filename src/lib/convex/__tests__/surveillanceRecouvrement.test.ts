/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * La surveillance, branchée sur la base.
 *
 * La détection elle-même est couverte par ses propres tests, sur des données en
 * mémoire. Ce qui n'existe qu'ici, c'est l'ASSEMBLAGE : lire les factures, les
 * créances et les dossiers, et surtout **calculer la date de prescription de
 * chaque facture depuis le secteur de son débiteur**.
 *
 * C'est le raccordement qui rend la prescription sectorielle réelle. Sans lui,
 * le module France resterait une bibliothèque que rien n'appelle.
 */

/**
 * Le premier test paie le chargement du graphe de modules Convex, ce qui
 * dépasse le délai par défaut de 5 s. Le délai est posé test par test plutôt
 * que relevé globalement : un test lent ailleurs doit rester un signal.
 */
const DELAI_CONVEX = 30_000;

const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const AUJOURDHUI = '2026-09-03';

type Secteur = 'GENERAL' | 'TRANSPORT_MARCHANDISES' | 'CONSOMMATEUR' | 'INDETERMINE';

async function poser(
	t: ReturnType<typeof convexTest>,
	options: { secteur?: Secteur; dateEcheance?: string; montantTTC?: bigint } = {}
): Promise<Id<'organizations'>> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Thumbbb Agency',
			createdAt: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: 'FOURNITURES DURAND',
			denominationsBrutes: ['Fournitures Durand'],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			secteur: options.secteur,
			creeLe: Date.now()
		});
		await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			reference: 'FA-2021-001',
			montantHT: 0n,
			montantTTC: options.montantTTC ?? 900_000n,
			dateEmission: '2021-10-01',
			dateEcheance: options.dateEcheance ?? '2021-11-01',
			dateExigibilite: options.dateEcheance ?? '2021-11-01',
			exigibiliteDeduite: true,
			statutPaiement: 'IMPAYEE',
			creeLe: Date.now()
		});
		return organizationId;
	});
}

describe('assemblage de l’état surveillé', () => {
	it(
		'signale une facture échue, avec son montant',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			const echue = flux.evenements.find((e) => e.type === 'FACTURE_ECHUE');
			expect(echue).toBeDefined();
			expect(echue!.reference).toBe('FA-2021-001');
		},
		DELAI_CONVEX
	);

	it(
		'calcule la prescription depuis le secteur du débiteur',
		async () => {
			// Régime général : cinq ans depuis le 1er novembre 2021 → 1er novembre
			// 2026. Au 3 septembre 2026, il reste 59 jours : sous le préavis de 90.
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			const prescription = flux.evenements.find((e) => e.type === 'PRESCRIPTION_PROCHE');
			expect(prescription).toBeDefined();
			expect(prescription!.urgence).toBe('CRITIQUE');
			expect(prescription!.explication).toMatch(/2026-11-01/);
		},
		DELAI_CONVEX
	);

	it(
		'prescrit bien plus tôt une créance de transport',
		async () => {
			// Un an depuis le 1er novembre 2021 : la créance est éteinte depuis 2022.
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'TRANSPORT_MARCHANDISES' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			const prescription = flux.evenements.find((e) => e.type === 'PRESCRIPTION_PROCHE');
			expect(prescription!.explication).toMatch(/PRESCRITE/);
			expect(prescription!.action).toMatch(/ne plus engager/i);
		},
		DELAI_CONVEX
	);

	it(
		'traite un secteur absent comme indéterminé, sans planter',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, {});

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			// Délai le plus court retenu : la facture de 2021 est prescrite.
			const prescription = flux.evenements.find((e) => e.type === 'PRESCRIPTION_PROCHE');
			expect(prescription).toBeDefined();
			expect(flux.hypotheses.join(' ')).toMatch(/secteur/i);
		},
		DELAI_CONVEX
	);

	it(
		'ne déclare aucune hypothèse quand tous les secteurs sont connus',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.hypotheses).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'cumule ce que le produit a permis d’identifier, sans compter deux fois la même facture',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			// Une facture échue + une prescription proche, sur la MÊME facture de
			// 9 000 € : ce sont deux raisons distinctes d'agir, donc deux lignes dans
			// `evenements`, mais une seule dette. `montantIdentifie` déduplique par
			// facture — sommer les deux ferait passer 9 000 € identifiés à
			// 18 000 € affichés.
			expect(flux.evenements.filter((e) => e.montant !== null)).toHaveLength(2);
			expect(flux.montantIdentifie).toBe(900_000n);
		},
		DELAI_CONVEX
	);

	it(
		'cloisonne : une organisation ne voit pas les factures de l’autre',
		async () => {
			const t = convexTest(schema, modules);
			const premiere = await poser(t, { secteur: 'GENERAL' });
			await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId: premiere,
				aujourdHui: AUJOURDHUI
			});

			const echues = flux.evenements.filter((e) => e.type === 'FACTURE_ECHUE');
			expect(echues).toHaveLength(1);
		},
		DELAI_CONVEX
	);

	it(
		'ignore une facture soldée',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			await t.run(async (ctx) => {
				const facture = (await ctx.db.query('facturesVente').collect())[0]!;
				await ctx.db.patch(facture._id, { statutPaiement: 'SOLDEE' });
			});

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.evenements).toEqual([]);
		},
		DELAI_CONVEX
	);
});

/**
 * UNE FACTURE ABÎMÉE NE DOIT PAS ÉTEINDRE LA SURVEILLANCE DE TOUT
 * L'ÉTABLISSEMENT.
 *
 * `dateEcheance` est une CHAÎNE côté Convex : `2026-02-30` et `pas-une-date`
 * traversent la validation du schéma sans un mot. Elles atteignaient ensuite
 * `dateDePrescription` → `ajouterMois` → `decomposer`, qui LÈVE. Or `assembler`
 * boucle sur TOUTES les factures de l'organisation : une seule ligne abîmée
 * faisait échouer la requête entière.
 *
 * ⚠️ CE N'EST PAS UN ÉCRAN VIDE, C'EST LE PIRE ÉTAT DU PRODUIT. Le gérant ne
 * voit plus RIEN — ni ses factures échues, ni ses prescriptions — et le
 * battement quotidien s'enregistre en ÉCHEC chaque matin. Il se croit surveillé
 * pendant que rien ne l'est, ce que ce produit existe précisément pour empêcher.
 *
 * La règle : une facture dont le point de départ est inexploitable devient un
 * ANGLE MORT nommé. Les autres continuent d'être surveillées.
 */
describe('résistance à une facture abîmée', () => {
	async function ajouterFactureAbimee(
		t: ReturnType<typeof convexTest>,
		organizationId: Id<'organizations'>,
		dates: { dateEcheance: string; dateExigibilite?: string }
	): Promise<void> {
		await t.run(async (ctx) => {
			const debiteurId = (await ctx.db.query('debiteurs').collect())[0]!._id;
			await ctx.db.insert('facturesVente', {
				organizationId,
				debiteurId,
				reference: 'FA-ABIMEE',
				montantHT: 0n,
				montantTTC: 100_00n,
				dateEmission: '2021-10-01',
				dateEcheance: dates.dateEcheance,
				dateExigibilite: dates.dateExigibilite,
				statutPaiement: 'IMPAYEE',
				creeLe: Date.now()
			});
		});
	}

	it(
		'continue de surveiller les autres factures malgré une date qui n’existe pas',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await ajouterFactureAbimee(t, organizationId, { dateEcheance: '2026-02-30' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			// La facture saine est toujours là, avec sa prescription.
			const saine = flux.evenements.find((e) => e.reference === 'FA-2021-001');
			expect(saine).toBeDefined();
		},
		DELAI_CONVEX
	);

	it(
		'nomme la facture abîmée en angle mort, et dit qu’il faut corriger la date',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await ajouterFactureAbimee(t, organizationId, { dateEcheance: '2026-02-30' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			const dit = flux.anglesMorts.join(' ');
			expect(dit).toMatch(/FA-ABIMEE/);
			expect(dit).toMatch(/calendrier|corriger/i);
			// La facture saine n'est PAS un angle mort : sa prescription est calculée.
			expect(dit).not.toMatch(/FA-2021-001/);
		},
		DELAI_CONVEX
	);

	it(
		'tient aussi sur une chaîne qui n’a rien d’une date',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await ajouterFactureAbimee(t, organizationId, { dateEcheance: 'pas-une-date' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.anglesMorts.join(' ')).toMatch(/FA-ABIMEE/);
		},
		DELAI_CONVEX
	);

	it(
		'écarte une exigibilité abîmée sans écarter l’échéance qui, elle, est bonne',
		async () => {
			// `dateExigibilite` prime sur `dateEcheance` comme point de départ. Si
			// elle est inexploitable et que l'échéance ne l'est pas, retomber sur
			// l'échéance vaut mieux que déclarer un angle mort : la surveillance
			// reprend, avec la meilleure date disponible.
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await ajouterFactureAbimee(t, organizationId, {
				dateEcheance: '2021-11-01',
				dateExigibilite: '2026-02-30'
			});

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.anglesMorts.join(' ')).not.toMatch(/FA-ABIMEE/);
		},
		DELAI_CONVEX
	);
});

/**
 * LA DÉGRADATION D'UN DÉBITEUR, ENFIN DÉTECTABLE.
 *
 * `DEBITEUR_DEGRADE` est déclaré depuis le premier jour, testé sur des données
 * en mémoire — et `assembler` rendait `debiteursSurveilles: []` en dur, avec ce
 * commentaire : « tant qu'on n'historise pas la santé, on ne peut pas la
 * détecter ». Un type d'événement que rien ne pouvait déclencher.
 *
 * Le radar BODACC historise désormais l'état précédent. Sans ce raccordement, il
 * écrirait un champ que personne ne relit — le défaut symétrique.
 */
describe('dégradation d’un débiteur', () => {
	async function poserDebiteurDegrade(
		t: ReturnType<typeof convexTest>,
		sante: 'PROCEDURE_COLLECTIVE' | 'RADIEE',
		precedente: 'SAINE' | 'INCONNUE'
	): Promise<Id<'organizations'>> {
		const organizationId = await poser(t, { secteur: 'GENERAL' });
		await t.run(async (ctx) => {
			const debiteur = (await ctx.db.query('debiteurs').collect())[0]!;
			await ctx.db.patch(debiteur._id, {
				santeFinanciere: sante,
				santePrecedente: precedente,
				constatRegistre: {
					identifiantAnnonce: 'A202601721671',
					dateParution: '2026-09-09',
					nature: "Jugement d'ouverture de liquidation judiciaire",
					dateJugement: '2026-08-31',
					tribunal: "Greffe du Tribunal de Commerce d'Evry",
					url: 'https://www.bodacc.fr/x'
				}
			});
		});
		return organizationId;
	}

	it(
		'remonte un débiteur passé de sain à procédure collective',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poserDebiteurDegrade(t, 'PROCEDURE_COLLECTIVE', 'SAINE');

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			const degrade = flux.evenements.find((e) => e.type === 'DEBITEUR_DEGRADE');
			expect(degrade).toBeDefined();
			expect(degrade!.reference).toBe('Fournitures Durand');
		},
		DELAI_CONVEX
	);

	it(
		'porte l’encours du débiteur, pas zéro',
		async () => {
			// Un gérant arbitre sur des montants. Un événement « votre client est en
			// liquidation » sans le montant en jeu est une notification, pas une
			// décision.
			const t = convexTest(schema, modules);
			const organizationId = await poserDebiteurDegrade(t, 'PROCEDURE_COLLECTIVE', 'SAINE');

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			const degrade = flux.evenements.find((e) => e.type === 'DEBITEUR_DEGRADE')!;
			expect(degrade.montant).toBe(900_000n);
		},
		DELAI_CONVEX
	);

	it(
		'ne remonte rien quand l’état n’a pas bougé',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.evenements.filter((e) => e.type === 'DEBITEUR_DEGRADE')).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'ne compte PAS l’encours d’un débiteur dégradé dans le montant identifié',
		async () => {
			// ⚠️ LA LEÇON DU DOUBLE COMPTE, QU'ON NE REFAIT PAS. L'encours d'un
			// débiteur est une VUE AGRÉGÉE des factures déjà comptées ; l'additionner
			// ferait passer 9 000 € identifiés à 18 000 € affichés.
			const t = convexTest(schema, modules);
			const organizationId = await poserDebiteurDegrade(t, 'PROCEDURE_COLLECTIVE', 'SAINE');

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.montantIdentifie).toBe(900_000n);
		},
		DELAI_CONVEX
	);
});

/**
 * L'ANGLE MORT DU REGISTRE, DIT DANS LE FLUX.
 *
 * La fiche débiteur le dit déjà, à l'endroit où l'on peut y remédier. Mais un
 * gérant qui n'ouvre jamais la fiche d'un client qui « va bien » ne le saurait
 * pas — et c'est précisément celui-là qui tombe sans prévenir.
 */
describe('débiteurs non suivis au registre', () => {
	it(
		'nomme un débiteur sans SIREN qui porte encore un encours',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.anglesMorts.join(' ')).toMatch(/Fournitures Durand/);
			expect(flux.anglesMorts.join(' ')).toMatch(/registres publics/i);
		},
		DELAI_CONVEX
	);

	it(
		'se tait dès que le numéro est renseigné',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await t.run(async (ctx) => {
				const debiteur = (await ctx.db.query('debiteurs').collect())[0]!;
				await ctx.db.patch(debiteur._id, { siren: '853479236' });
			});

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.anglesMorts.join(' ')).not.toMatch(/registres publics/i);
		},
		DELAI_CONVEX
	);

	it(
		'ne nomme pas un débiteur qui ne doit plus rien',
		async () => {
			// Un débiteur soldé n'est pas un risque, et l'annoncer noierait ceux qui
			// en sont un.
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await t.run(async (ctx) => {
				const facture = (await ctx.db.query('facturesVente').collect())[0]!;
				await ctx.db.patch(facture._id, { statutPaiement: 'SOLDEE' });
			});

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.anglesMorts.join(' ')).not.toMatch(/registres publics/i);
		},
		DELAI_CONVEX
	);
});

describe('les échéances d’une procédure engagée', () => {
	/**
	 * ⚠️ DIXIÈME OCCURRENCE DE « DÉCLARÉ, LU, JAMAIS ALIMENTÉ », ET CELLE-CI
	 * ÉTEIGNAIT LE RADAR SUR LA PARTIE LA PLUS DANGEREUSE DU PRODUIT.
	 *
	 * La surveillance sait produire des événements `ECHEANCE_PROCEDURE` depuis
	 * une liste de dossiers. Elle la lisait dans la table `dossiers` — « une
	 * créance, plus une procédure choisie, plus son avancement » — que rien
	 * n'écrivait. Aucune mutation, aucun import, aucun écran.
	 *
	 * Conséquence : la caducité d'une ordonnance à trois mois ne pouvait PAS
	 * apparaître dans le flux, ni dans le briefing quotidien. « Un radar qui ne
	 * se réveille pas n'est pas un radar, c'est un rapport » — et celui-ci ne
	 * pouvait pas se réveiller sur l'échéance qui fait perdre un titre.
	 *
	 * La surveillance lit désormais les créances réellement engagées et leur
	 * journal d'événements, c'est-à-dire la machine à états du module 4.5.
	 */
	async function poserCreanceEngagee(
		t: ReturnType<typeof convexTest>,
		options: { ordonnanceLe?: string } = {}
	) {
		const organizationId = await poser(t);
		const { creanceId } = await t.run(async (ctx) => {
			const debiteur = (await ctx.db.query('debiteurs').collect()).find(
				(d) => d.organizationId === organizationId
			)!;
			const creanceId = await ctx.db.insert('creances', {
				organizationId,
				debiteurId: debiteur._id,
				statut: 'QUALIFIEE',
				certaine: 'ok',
				liquide: 'ok',
				exigible: 'ok',
				entreCommercants: 'ok',
				creeLe: Date.now()
			});
			return { creanceId };
		});

		await t.mutation(internal.recouvrement.apresProcedure.engagerProcedureInterne, {
			creanceId,
			procedure: 'injonction-de-payer',
			engageeLe: '2026-01-05'
		});

		if (options.ordonnanceLe !== undefined) {
			await t.mutation(internal.recouvrement.apresProcedure.consignerInterne, {
				creanceId,
				cle: 'ordonnance-rendue',
				survenuLe: options.ordonnanceLe
			});
		}

		return { organizationId, creanceId };
	}

	it(
		'fait apparaître la caducité d’une ordonnance dans le flux',
		async () => {
			const t = convexTest(schema, modules);
			// Ordonnance rendue le 20 juin : la signification tombe le 20 septembre,
			// soit 17 jours après le jour de référence — sous le préavis de 30 jours
			// que la surveillance applique à une échéance de CADUCITÉ.
			const { organizationId } = await poserCreanceEngagee(t, { ordonnanceLe: '2026-06-20' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			const echeance = flux.evenements.find((e) => e.type === 'ECHEANCE_PROCEDURE');
			expect(echeance).toBeDefined();
			expect(echeance!.explication).toMatch(/signification/i);
			// La caducité est la seule urgence CRITIQUE des échéances de procédure.
			expect(echeance!.urgence).toBe('CRITIQUE');
		},
		DELAI_CONVEX
	);

	it(
		'ne signale rien sur une créance qui n’a rien engagé',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t);

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.evenements.find((e) => e.type === 'ECHEANCE_PROCEDURE')).toBeUndefined();
		},
		DELAI_CONVEX
	);

	it(
		'ne signale plus rien une fois l’échéance dépassée par l’acte',
		async () => {
			// L'ordonnance signifiée fait sortir de l'état qui portait la caducité :
			// continuer à l'annoncer userait la confiance dans toutes les autres.
			const t = convexTest(schema, modules);
			const { organizationId, creanceId } = await poserCreanceEngagee(t, {
				ordonnanceLe: '2026-06-20'
			});
			await t.mutation(internal.recouvrement.apresProcedure.consignerInterne, {
				creanceId,
				cle: 'ordonnance-signifiee',
				survenuLe: '2026-08-25'
			});

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.evenements.find((e) => e.type === 'ECHEANCE_PROCEDURE')).toBeUndefined();
		},
		DELAI_CONVEX
	);
});
