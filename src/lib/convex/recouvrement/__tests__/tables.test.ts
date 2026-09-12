import { describe, it, expect } from 'vitest';
import { recouvrementTables } from '../tables';

/**
 * Les invariants du schéma de recouvrement, rendus opposables.
 *
 * Ce ne sont pas des tests de comportement : ce sont des règles d'architecture
 * que `CLAUDE.md` énonce et qu'aucun compilateur ne fait respecter. Une table
 * ajoutée à la va-vite sans `organizationId` ne casse rien le jour même — elle
 * crée une fuite entre clients qui se découvre en production.
 */

/** Le schéma d'une table, tel que `defineTable` le rend. */
interface TableInspectable {
	validator: { fields?: Record<string, unknown> };
	/** Rend un OBJET, pas une chaîne JSON — vérifié sur `convex@1.37`. */
	export: () => { indexes?: Array<{ indexDescriptor: string; fields: string[] }> };
}

function champs(table: unknown): string[] {
	const validateur = (table as TableInspectable).validator;
	return Object.keys(validateur.fields ?? {});
}

function indexes(table: unknown): Array<{ indexDescriptor: string; fields: string[] }> {
	// `export()` est la seule voie publique pour inspecter les index.
	return (table as TableInspectable).export().indexes ?? [];
}

const TABLES = Object.entries(recouvrementTables);

/**
 * LES TABLES QUI NE PORTENT AUCUNE DONNÉE CLIENT, avec leur raison.
 *
 * ⚠️ UNE ENTRÉE ICI RETIRE UNE TABLE DU CLOISONNEMENT, c'est-à-dire de la règle
 * la plus stricte de l'architecture. On n'en ajoute pas pour faire passer un
 * test : on en ajoute quand la table ne contient RIEN qui appartienne à un
 * client, et la raison est lue à la revue.
 *
 * Le critère n'est pas « public » mais « à personne ». Un débiteur, un montant,
 * une échéance sont à un client, toujours — même si on pouvait les retrouver
 * ailleurs. Un fichier que l'État publie sous Licence Ouverte n'est à personne,
 * au même titre que les taux du référentiel juridique.
 */
const REFERENTIELS: Readonly<Record<string, string>> = {
	annuaireAvocats:
		'L’annuaire national des avocats, publié par le Conseil national des barreaux sous ' +
		'Licence Ouverte. Rien n’y appartient à un client : c’est un fichier d’État recopié tel ' +
		'quel. La conséquence est que `purge-complete.test.ts` ne le réclame pas dans `rgpd.ts` — ' +
		'il ne balaie que les tables qui déclarent `organizationId` — et que l’effacement d’un ' +
		'établissement reste TOTAL sur ce qui est à lui. Ce qu’un gérant retient de cet annuaire, ' +
		'lui, est recopié dans `intervenants`, qui est cloisonnée et purgée.'
};

/** Tout le reste, c'est-à-dire ce qui doit être cloisonné sans exception. */
const CLOISONNEES = TABLES.filter(([nom]) => !(nom in REFERENTIELS));

describe('schéma du recouvrement', () => {
	it('déclare les tables du modèle de domaine, et elles seules', () => {
		// La liste est écrite en dur DÉLIBÉRÉMENT : ajouter une table doit être
		// un geste conscient, pas un effet de bord qu'aucun test ne remarque.
		//
		// `battements` est arrivée le 3 septembre 2026 avec le battement
		// quotidien, et ce test a fait exactement ce pour quoi il existe : il a
		// refusé l'ajout tant que personne ne l'avait déclaré ici. Il a aussi
		// rappelé, au passage, qu'une table nouvelle doit être branchée à la
		// purge RGPD — ce que le plan avait oublié. Cet oubli-là est désormais
		// tenu par une barrière qui BALAIE le schéma, `purge-complete.test.ts` :
		// cette liste-ci dit ce qui existe, celle-là dit que tout est purgé.
		//
		// ⚠️ `intervenants` A ÉTÉ AJOUTÉE AU SCHÉMA SANS PASSER PAR ICI, et ce
		// fichier a donc été ROUGE entre les deux. La barrière a bien mordu ;
		// personne ne l'a lue, parce qu'elle vit hors des deux dossiers de tests
		// qu'on relance d'habitude. C'est le mode de panne d'un test juste : il
		// n'échoue pour personne.
		expect(TABLES.map(([nom]) => nom).sort()).toEqual([
			'annuaireAvocats',
			'battements',
			'creances',
			'debiteurs',
			'decomptes',
			'evenementsProcedure',
			'facturesVente',
			'importsRecouvrement',
			'intervenants',
			'pieces',
			'piecesFactures',
			'profilsCreancier',
			'reglements'
		]);
	});

	it('n’excuse aucun référentiel qui n’existe plus', () => {
		// Une exception qui survit à la table qu'elle excusait devient un
		// commentaire faux dans un test vert : le jour où une table reprend ce
		// nom, elle échapperait au cloisonnement sans que personne l'ait décidé.
		const perimes = Object.keys(REFERENTIELS).filter((nom) => !(nom in recouvrementTables));
		expect(perimes, `Référentiels déclarés sans table : ${perimes.join(', ')}`).toEqual([]);
	});

	it.each(CLOISONNEES)('« %s » porte organizationId — multi-tenant strict', (_nom, table) => {
		expect(champs(table)).toContain('organizationId');
	});

	it.each(CLOISONNEES)('« %s » est indexable par organisation', (_nom, table) => {
		const parOrg = indexes(table).filter((index) => index.fields[0] === 'organizationId');
		// `piecesFactures` et `reglements` sont d'abord interrogées par leur
		// parent, mais gardent un index par organisation pour la purge RGPD.
		expect(parOrg.length).toBeGreaterThanOrEqual(1);
	});

	it.each(Object.keys(REFERENTIELS))('« %s » est un référentiel, et n’est PAS cloisonné', (nom) => {
		// ⚠️ L'EXCEPTION SE VÉRIFIE DANS LES DEUX SENS. Sans cette assertion, le
		// jour où quelqu'un ajoute `organizationId` à un référentiel — parce que
		// « toutes les autres tables en ont un » — la ligne d'exception le ferait
		// SORTIR du balayage de cloisonnement au lieu de l'y faire entrer, et la
		// table cesserait d'être purgée sans qu'un seul test tombe.
		const table = recouvrementTables[nom as keyof typeof recouvrementTables];
		expect(champs(table)).not.toContain('organizationId');
	});

	it('ne stocke aucun montant en flottant', () => {
		// Le cœur du modèle : un `v.number()` sur un champ de montant
		// réintroduirait l'erreur de représentation dès l'écriture en base,
		// avant même le premier calcul.
		const champsMonetaires = [
			['facturesVente', 'montantHT'],
			['facturesVente', 'montantTTC'],
			['reglements', 'montant'],
			['decomptes', 'principalRestantDu'],
			['decomptes', 'interets'],
			['decomptes', 'indemniteForfaitaire'],
			['decomptes', 'total']
		] as const;

		for (const [nomTable, champ] of champsMonetaires) {
			const table = recouvrementTables[nomTable] as unknown as TableInspectable;
			const validateur = table.validator.fields?.[champ] as { kind?: string } | undefined;
			expect(validateur, `${nomTable}.${champ}`).toBeDefined();
			expect(validateur!.kind, `${nomTable}.${champ} doit être un int64`).toBe('int64');
		}
	});

	it('sépare la date d’échéance de la date d’exigibilité', () => {
		// Les confondre décalerait chaque décompte de plusieurs jours
		// d'intérêts, sans que rien ne le signale.
		const facture = champs(recouvrementTables.facturesVente);
		expect(facture).toContain('dateEcheance');
		expect(facture).toContain('dateExigibilite');
	});

	it('ne porte aucun tableau d’identifiants — la leçon d’attestationRequests', () => {
		// Un tableau Convex plafonne à 8 192 entrées, et le dépassement fait
		// échouer l'écriture entière. Le lien facture → créance vit donc sur la
		// facture.
		expect(champs(recouvrementTables.creances)).not.toContain('factureIds');
		expect(champs(recouvrementTables.facturesVente)).toContain('creanceId');
	});
});
