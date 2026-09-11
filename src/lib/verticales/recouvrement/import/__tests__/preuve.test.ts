import { describe, it, expect } from 'vitest';
import {
	documentPreuveSchema,
	construirePromptPreuve,
	lirePreuve,
	TYPES_RECONNUS,
	type DocumentPreuve
} from '../preuve';

/**
 * L'EXTRACTEUR DE PREUVES — module 1.2 du blueprint.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL DÉBLOQUE, ET C'EST PLUS GRAVE QUE « ÉTENDRE UN SCHÉMA »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La table `pieces` est LUE par les deux moteurs — le score de solidité et
 * l'écran de créance — et ÉCRITE nulle part. Aucune mutation, aucun import,
 * aucun écran. Huitième occurrence du défaut « déclaré, lu, jamais alimenté »
 * dans ce dépôt, et de loin la plus coûteuse.
 *
 * L'arithmétique le dit : les quatre conditions légales pèsent 12 sur 20, le
 * seuil de qualification est à 0,75 — soit 15 sur 20. Il faut donc un bon de
 * commande ou un bon de livraison pour l'atteindre. Sans moyen d'ajouter une
 * pièce, AUCUNE créance ne peut être éligible, quoi que fasse le créancier.
 * Le verdict central du produit était inatteignable.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE LOGICIEL RECONNAÎT, LE GÉRANT CONFIRME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Règle d'écran n° 1. Demander « quel type de document déposez-vous ? » sur un
 * PDF qui porte « BON DE LIVRAISON » en en-tête est exactement le champ vide
 * qu'elle interdit. Le modèle lit, propose, et le gérant corrige d'un geste.
 */

// Le gabarit est TYPÉ comme la sortie du modèle : sans ça, `lirePreuve` reçoit
// un `string` là où elle attend une nomenclature fermée, et les tests
// vérifieraient une forme que le produit ne peut pas recevoir.
function doc(surcharge: Partial<DocumentPreuve> = {}): DocumentPreuve {
	return {
		type: 'BON_DE_LIVRAISON' as const,
		reference: 'BL-2024-118',
		date: '2026-02-14',
		referencesLiees: ['FA-2026-004'],
		contrepartie: 'Fournitures Durand',
		receptionSignee: true,
		reservesEmises: false,
		reserves: null,
		tauxRetardPourcent: null,
		illisible: false,
		raisonIllisible: null,
		...surcharge
	};
}

describe('le schéma de la pièce', () => {
	it('accepte un bon de livraison complet', () => {
		expect(documentPreuveSchema.safeParse(doc()).success).toBe(true);
	});

	it('accepte un document dont rien n’est lisible', () => {
		// Un scan flou doit REMONTER, pas faire échouer la validation : c'est
		// l'écran qui dira au gérant que sa photo ne se lit pas.
		const resultat = documentPreuveSchema.safeParse(
			doc({
				type: 'INCONNU',
				reference: null,
				date: null,
				referencesLiees: [],
				contrepartie: null,
				receptionSignee: null,
				illisible: true,
				raisonIllisible: 'La photo est trop floue pour lire l’en-tête.'
			})
		);
		expect(resultat.success).toBe(true);
	});

	it('refuse un type hors nomenclature', () => {
		// ⚠️ LE TYPE ENTRE DANS LE SCORE. Un type inventé par le modèle —
		// « FACTURE_PROFORMA » — serait écrit en base, jamais reconnu par le
		// moteur, et compterait donc pour rien sans que personne ne le voie.
		//
		// Le cast est DÉLIBÉRÉ : on simule ce que le modèle peut rendre, pas ce
		// que le type permet d'écrire. C'est précisément l'écart que le schéma
		// existe pour attraper.
		const horsNomenclature = { ...doc(), type: 'FACTURE_PROFORMA' };
		expect(documentPreuveSchema.safeParse(horsNomenclature).success).toBe(false);
	});
});

describe('le prompt', () => {
	it('est déterministe, à l’octet', () => {
		// Le verrou d'empreinte : le cache Claude ne sert que sur un préfixe
		// identique à l'octet. Une variation multiplie le coût par document.
		expect(construirePromptPreuve()).toBe(construirePromptPreuve());
	});

	it('dépasse le minimum cacheable', () => {
		expect(construirePromptPreuve().length).toBeGreaterThan(2000);
	});

	it('ne contient aucune date, qui invaliderait le cache', () => {
		expect(construirePromptPreuve()).not.toMatch(/\d{4}-\d{2}-\d{2}/);
		expect(construirePromptPreuve()).not.toMatch(/\b(19|20)\d{2}\b/);
	});

	it('nomme chaque type qu’il doit savoir reconnaître', () => {
		const p = construirePromptPreuve();
		for (const type of TYPES_RECONNUS) {
			expect(p).toContain(type);
		}
	});

	it('interdit de déduire ce qui n’est pas imprimé', () => {
		// La même discipline que le schéma de facture : un champ absent reste
		// absent. Une date de livraison devinée entrerait dans un dossier qui
		// part chez un tiers.
		expect(construirePromptPreuve()).toMatch(/jamais.{0,40}(déduire|deviner|calculer|inventer)/i);
	});
});

describe('lire ce que le modèle a rendu', () => {
	it('rend le type reconnu et ce qui le rattache', () => {
		const lue = lirePreuve(doc());
		expect(lue.type).toBe('BON_DE_LIVRAISON');
		expect(lue.referencesLiees).toEqual(['FA-2026-004']);
	});

	it('refuse de classer un document illisible', () => {
		// ⚠️ « INCONNU » N'EST PAS « AUCUNE PIÈCE ». Classer au hasard ferait
		// monter le score de solidité sur un document que personne n'a lu.
		const lue = lirePreuve(doc({ illisible: true, type: 'BON_DE_COMMANDE' }));
		expect(lue.type).toBeNull();
		expect(lue.constat).toMatch(/lis|lu/i);
	});

	it('signale les réserves portées sur un bon de livraison', () => {
		// ⚠️ UNE RÉSERVE EST UN FAIT DE LITIGE. Le questionnaire de qualification
		// demande précisément « une réserve portée sur un bon de livraison » : la
		// trouver ici et se taire laisserait le gérant répondre « non » de bonne
		// foi sur un document qu'on a lu à sa place.
		const lue = lirePreuve(
			doc({ reservesEmises: true, reserves: 'Deux colis manquants, signalés à la livraison.' })
		);
		expect(lue.reserves).toBe('Deux colis manquants, signalés à la livraison.');
		expect(lue.constat).toMatch(/réserve/i);
	});

	it('remonte un taux de retard lu dans des CGV', () => {
		// ⚠️ CE QUI RELIE 1.2 AU TAUX CONTRACTUEL. Le taux stipulé était le champ
		// lu par les deux moteurs et jamais rempli ; les CGV du créancier sont
		// exactement le document où il est imprimé.
		const lue = lirePreuve(doc({ type: 'CGV', tauxRetardPourcent: 12.5 }));
		expect(lue.tauxRetardPourcent).toBe('12,50');
	});

	it('n’invente pas un taux quand les CGV n’en portent pas', () => {
		expect(lirePreuve(doc({ type: 'CGV' })).tauxRetardPourcent).toBeNull();
	});

	it('refuse un taux que le module de taux contractuel rejetterait', () => {
		// Trois décimales, zéro, négatif : la lecture du taux est déjà
		// verrouillée ailleurs, et ce module ne rouvre pas cette porte.
		expect(lirePreuve(doc({ type: 'CGV', tauxRetardPourcent: 0 })).tauxRetardPourcent).toBeNull();
		expect(lirePreuve(doc({ type: 'CGV', tauxRetardPourcent: -3 })).tauxRetardPourcent).toBeNull();
	});

	it('ne rend un taux QUE depuis des CGV ou un contrat', () => {
		// Un nombre suivi d'un « % » sur un bon de livraison est une remise, une
		// TVA, un taux de casse — pas une stipulation d'intérêts de retard.
		const lue = lirePreuve(doc({ type: 'BON_DE_LIVRAISON', tauxRetardPourcent: 12.5 }));
		expect(lue.tauxRetardPourcent).toBeNull();
	});

	it('énonce un constat, jamais une consigne', () => {
		for (const type of TYPES_RECONNUS) {
			const lue = lirePreuve(doc({ type }));
			expect(lue.constat).not.toMatch(/vous devriez|il faut|déposez|ajoutez|pensez à/i);
		}
	});
});
