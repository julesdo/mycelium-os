import { describe, it, expect } from 'vitest';
import { depuisEuros, fraction } from '../../../socle/montants';
import { composerPiece } from '../piece';
import type { DecompteFige } from '../piece';
import { PARAMETRES } from '../parametres';

/**
 * LA PIÈCE — le document que le client envoie à son expert-comptable.
 *
 * C'est le troisième critère de fin de MVP, et le blueprint le dit « le plus dur
 * et le plus important : celui qui prouve que le décompte est une pièce, et pas
 * un écran ». Tant qu'il faut le retoucher avant de l'envoyer, ce n'est pas une
 * pièce.
 *
 * TROIS PROPRIÉTÉS, ET AUCUNE N'EST DE LA MISE EN PAGE.
 *
 * 1. **CE N'EST PAS UN ACTE, ET LE DOCUMENT LE DIT.** Ni mise en demeure, ni
 *    requête, ni commandement. Un tiers qui le reçoit doit savoir ce qu'il
 *    tient — un avocat qui prendrait un décompte pour une mise en demeure
 *    croirait un délai lancé qui ne l'est pas.
 *
 * 2. **AUCUN ARTICLE N'EST ÉCRIT DANS LE GABARIT.** Les fondements viennent du
 *    registre, avec leur source. Recopier « article L441-10 » ici créerait une
 *    seconde vérité, qui ne serait pas corrigée le jour où la première change.
 *    Le test le vérifie en comparant à `PARAMETRES`, pas à une chaîne attendue.
 *
 * 3. **CE QUE LE DÉCOMPTE NE COUVRE PAS FIGURE DESSUS.** C'est la différence
 *    entre un document professionnel et un extrait : un tiers doit voir ce qui
 *    n'y est pas.
 */

const DIX_POUR_CENT = fraction(10n, 100n);

function decompte(surcharge: Partial<DecompteFige> = {}): DecompteFige {
	return {
		arreteAu: '2026-09-01',
		convention: 'ACT_365',
		principalRestantDu: depuisEuros('10000,00'),
		interets: depuisEuros('1000,00'),
		indemniteForfaitaire: depuisEuros('40,00'),
		total: depuisEuros('11040,00'),
		creancier: { denomination: 'Thumbbb Agency', siren: '502592959' },
		debiteur: { denomination: 'Fournitures Durand', siren: '853479236' },
		lignes: [
			{
				reference: 'FA-2025-001',
				principalRestantDu: depuisEuros('10000,00'),
				interets: depuisEuros('1000,00'),
				indemniteForfaitaire: depuisEuros('40,00'),
				total: depuisEuros('11040,00'),
				segments: [
					{
						debut: '2025-01-01',
						fin: '2026-01-01',
						jours: 365,
						principal: depuisEuros('10000,00'),
						taux: DIX_POUR_CENT,
						baseAnnuelle: 365,
						interets: depuisEuros('1000,00')
					}
				]
			}
		],
		abandons: [],
		...surcharge
	};
}

/** Tout le texte de la pièce, à plat — pour chercher dedans. */
function texte(piece: ReturnType<typeof composerPiece>): string {
	return JSON.stringify(piece);
}

describe('ce que la pièce dit d’elle-même', () => {
	it('annonce qu’elle n’est PAS une mise en demeure', () => {
		// Un avocat qui prendrait ce document pour une mise en demeure croirait un
		// délai lancé qui ne l'est pas.
		expect(texte(composerPiece(decompte()))).toMatch(/n’est pas une mise en demeure/i);
	});

	it('se nomme pour ce qu’elle est — un décompte arrêté', () => {
		const piece = composerPiece(decompte());
		expect(piece.titre).toMatch(/décompte/i);
		expect(piece.titre).toMatch(/arrêté/i);
	});

	it('porte la date d’arrêté, et la convention de jours employée', () => {
		// Sans la convention, le chiffre n'est pas défendable : ACT_365 et ACT_ACT
		// ne donnent pas le même intérêt sur une année bissextile.
		const dit = texte(composerPiece(decompte()));
		expect(dit).toMatch(/2026-09-01/);
		expect(dit).toMatch(/ACT_365|365/);
	});

	it('ne porte aucun verbe de recommandation', () => {
		// Ligne rouge 3 : le produit énonce des constats, jamais une conduite à
		// tenir. « Vous devriez », « nous vous conseillons », « il convient de ».
		const dit = texte(composerPiece(decompte()));
		expect(dit).not.toMatch(/vous devriez|nous vous conseillons|il convient de|nous recommandons/i);
	});

	it('ne porte pas le mot interdit', () => {
		expect(texte(composerPiece(decompte()))).not.toMatch(/garanti/i);
	});
});

describe('les identités', () => {
	it('porte le créancier et le débiteur, avec leurs numéros', () => {
		const dit = texte(composerPiece(decompte()));
		expect(dit).toMatch(/Thumbbb Agency/);
		expect(dit).toMatch(/502592959/);
		expect(dit).toMatch(/Fournitures Durand/);
		expect(dit).toMatch(/853479236/);
	});

	it('dit qu’une identité manque au lieu de la taire', () => {
		// Un décompte produit avant que le profil créancier n'existe reste une
		// pièce valable ; l'en-tête manquant se voit, pour que le gérant sache
		// quoi compléter avant d'envoyer.
		const piece = composerPiece(decompte({ creancier: undefined }));
		expect(texte(piece)).toMatch(/créancier non renseigné|identité du créancier/i);
	});
});

describe('les fondements viennent du registre, jamais du gabarit', () => {
	it('cite la source EXACTE de l’indemnité forfaitaire', () => {
		// ⚠️ ON COMPARE AU REGISTRE, PAS À UNE CHAÎNE ATTENDUE. Écrire ici le texte
		// espéré referait exactement la faute qu'on cherche à empêcher : une
		// seconde vérité, qui ne bougerait pas le jour où la première change.
		expect(texte(composerPiece(decompte()))).toContain(PARAMETRES.indemniteForfaitaire.source);
	});

	it('cite la source EXACTE du taux d’intérêt de retard', () => {
		expect(texte(composerPiece(decompte()))).toContain(PARAMETRES.tauxInteretLegalDefaut.source);
	});

	it('n’écrit aucun numéro d’article de son propre chef', () => {
		// Le gabarit ne doit contenir AUCUN article qui ne vienne pas du registre.
		// On relève les articles cités dans la pièce et on vérifie que chacun
		// figure dans une source du registre.
		const dit = texte(composerPiece(decompte()));
		const cites = dit.match(/[LDR]\.?\s?\d{3}-\d+/g) ?? [];
		expect(cites.length).toBeGreaterThan(0);

		const sourcesDuRegistre = Object.values(PARAMETRES)
			.map((parametre) => parametre.source)
			.join(' ');
		for (const article of cites) {
			expect(sourcesDuRegistre, `« ${article} » n’est dans aucune source du registre`).toContain(
				article
			);
		}
	});
});

describe('le détail, qui rend le total refaisable', () => {
	it('porte chaque facture avec ses quatre montants', () => {
		const piece = composerPiece(decompte());
		const ligne = piece.factures[0]!;
		expect(ligne.reference).toBe('FA-2025-001');
		expect(ligne.principal).toBe('10 000,00 €');
		expect(ligne.interets).toBe('1 000,00 €');
		expect(ligne.indemnite).toBe('40,00 €');
		expect(ligne.total).toBe('11 040,00 €');
	});

	it('porte les périodes, avec le taux, les jours et la base', () => {
		// C'est CE qui permet au tiers de refaire le calcul. Un total sans ses
		// segments est un chiffre qu'on demande de croire.
		const segment = composerPiece(decompte()).factures[0]!.periodes[0]!;
		expect(segment.du).toBe('2025-01-01');
		expect(segment.au).toBe('2026-01-01');
		expect(segment.jours).toBe(365);
		expect(segment.taux).toBe('10,00 %');
		expect(segment.base).toBe(365);
		expect(segment.interets).toBe('1 000,00 €');
	});

	it('le total annoncé est la somme des trois parts', () => {
		const piece = composerPiece(decompte());
		expect(piece.totaux.principal).toBe('10 000,00 €');
		expect(piece.totaux.interets).toBe('1 000,00 €');
		expect(piece.totaux.indemnites).toBe('40,00 €');
		expect(piece.totaux.total).toBe('11 040,00 €');
	});
});

describe('ce que le décompte ne couvre pas', () => {
	it('nomme les factures laissées de côté, avec ce qu’elles pèsent', () => {
		// Un tiers doit voir ce qui n'est PAS dans la pièce. C'est la différence
		// entre un document professionnel et un extrait.
		const piece = composerPiece(
			decompte({
				abandons: [
					{
						reference: 'FA-2024-088',
						montantEnJeu: depuisEuros('3200,00'),
						explication: 'Facture du même débiteur, non rattachée à cette créance.'
					}
				]
			})
		);

		const dit = texte(piece);
		expect(dit).toMatch(/FA-2024-088/);
		expect(dit).toMatch(/3 200,00/);
	});

	it('dit explicitement quand rien n’est laissé de côté', () => {
		// Le silence se lirait comme « on n'a pas regardé ». Une pièce dit ce
		// qu'elle couvre ET ce qu'elle ne couvre pas, y compris quand la réponse
		// est « rien ».
		expect(texte(composerPiece(decompte()))).toMatch(
			/aucune (autre )?facture|rien n’est laissé|toutes les factures/i
		);
	});

	it('porte un abandon non chiffrable sans inventer de montant', () => {
		const piece = composerPiece(
			decompte({
				abandons: [
					{
						reference: 'mentionsObligatoiresInjonction',
						montantEnJeu: null,
						explication: 'Valeur juridique non validée.'
					}
				]
			})
		);
		expect(texte(piece)).toMatch(/non chiffrable|non chiffré/i);
	});
});

/**
 * LA DATE, LUE PAR UN HUMAIN ET PAR UNE MACHINE.
 *
 * Deux besoins qui ne se satisfont pas du même format, et les confondre a coûté
 * une fragilité : le nom du fichier extrayait la date d'arrêté du TITRE, par
 * expression régulière. Tirer une donnée d'une chaîne d'affichage marche jusqu'au
 * jour où l'on retouche le titre — et ce jour est arrivé dès la première
 * relecture du PDF.
 */
describe('la date d’arrêté', () => {
	it('se lit en français dans le titre', () => {
		// « arrêté au 2026-09-01 » sur une pièce qui part chez un avocat a l'air
		// d'un export de machine, pas d'un document.
		expect(composerPiece(decompte()).titre).toMatch(/1 septembre 2026|1er septembre 2026/);
	});

	it('reste disponible en ISO, séparément, pour ce qui doit trier', () => {
		expect(composerPiece(decompte()).dateArrete).toBe('2026-09-01');
	});
});
