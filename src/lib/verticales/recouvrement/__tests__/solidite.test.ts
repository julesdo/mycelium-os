import { describe, it, expect } from 'vitest';
import { pyramideDePreuves, ETAGES_DE_PREUVE } from '../solidite';
import { POIDS } from '../scoring';
import type { ClePiece } from '../qualification';

/**
 * L'ÉVALUATEUR DE SOLIDITÉ DOCUMENTAIRE — module 4.2 du blueprint.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL AJOUTE, ET CE QU'IL REMPLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le score savait déjà quelles pièces manquaient. L'écran les affichait en
 * pastilles nues — « bon de commande », « bon de livraison » — sans dire ce
 * que chacune ÉTABLIT ni ce qu'elle pèse. Un gérant devant deux étiquettes
 * identiques ne sait pas que l'une vaut trois points et l'autre un seul, ni
 * pourquoi on les lui demande.
 *
 * Le blueprint : « facture seule = fragile, + bon de commande + preuve de
 * livraison = blindé ». C'est une PYRAMIDE, et une pyramide se montre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA FORMULATION EST JURIDIQUEMENT STRUCTURANTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le blueprint le dit mot pour mot : « trois des quatre pièces attendues sont
 * absentes » est un CONSTAT ; « ce dossier est trop faible » est un CONSEIL.
 * Le produit écrit la première forme, et ce fichier le vérifie sur chaque
 * phrase que le module produit.
 *
 * La nuance n'est pas rhétorique. Un dossier « trop faible » est un verdict
 * sur les chances de succès — c'est-à-dire une appréciation juridique, celle
 * qu'on n'a pas le droit de donner. Compter des pièces absentes est une
 * mesure, et le gérant en tire ce qu'il veut.
 */

function pieces(...cles: ClePiece[]): ClePiece[] {
	return ['FACTURE', ...cles];
}

describe('les étages de la pyramide', () => {
	it('couvrent les quatre critères documentaires du score', () => {
		// ⚠️ LA MÊME SOURCE QUE LE SCORE, pas une seconde liste. Deux
		// énumérations des mêmes pièces finiraient par diverger, et l'écran
		// montrerait une pyramide qui ne correspondrait plus au chiffre affiché
		// juste au-dessus.
		const cles = ETAGES_DE_PREUVE.map((e) => e.cle);
		expect(cles).toEqual(['commande', 'livraison', 'conditionsContractuelles', 'miseEnDemeure']);
		for (const etage of ETAGES_DE_PREUVE) {
			expect(POIDS[etage.cle]).toBe(etage.poids);
		}
	});

	it('disent ce que chaque étage ÉTABLIT', () => {
		for (const etage of ETAGES_DE_PREUVE) {
			expect(etage.fait.length).toBeGreaterThan(0);
			expect(etage.pieces.length).toBeGreaterThan(0);
		}
	});
});

describe('ce que la pyramide constate', () => {
	it('sur une facture seule, compte les quatre étages absents', () => {
		const p = pyramideDePreuves(pieces());

		expect(p.etablies).toBe(0);
		expect(p.attendues).toBe(4);
		// ⚠️ UN COMPTE, PAS UN VERDICT. « quatre des quatre pièces attendues sont
		// absentes » se vérifie ; « ce dossier est trop faible » se discute.
		expect(p.constat).toMatch(/quatre des quatre|4 des 4/i);
	});

	it('ne porte jamais de jugement sur le dossier', () => {
		// Le test qui porte toute la règle du module.
		for (const jeu of [pieces(), pieces('BON_DE_COMMANDE'), pieces('BON_DE_COMMANDE', 'BON_DE_LIVRAISON', 'CGV', 'MISE_EN_DEMEURE')]) {
			const p = pyramideDePreuves(jeu);
			const texte = [p.constat, ...p.etages.map((e) => e.etat)].join(' ');
			expect(texte).not.toMatch(
				/trop faible|solide|fragile|mauvais|bon dossier|vos chances|succès|gagner|perdre/i
			);
		}
	});

	it('ne recommande aucune démarche', () => {
		const p = pyramideDePreuves(pieces());
		const texte = [p.constat, ...p.etages.map((e) => e.etat)].join(' ');
		expect(texte).not.toMatch(/vous devriez|il faut|engagez|procurez-vous|demandez à/i);
	});

	it('marque un étage établi dès qu’UNE de ses pièces est là', () => {
		// Un devis signé vaut un bon de commande : les deux établissent le même
		// fait, l'engagement du débiteur à commander.
		expect(pyramideDePreuves(pieces('DEVIS_SIGNE')).etages[0]!.presente).toBe(true);
		expect(pyramideDePreuves(pieces('BON_DE_COMMANDE')).etages[0]!.presente).toBe(true);
	});

	it('compte juste quand tout est là', () => {
		const p = pyramideDePreuves(
			pieces('BON_DE_COMMANDE', 'BON_DE_LIVRAISON', 'CGV', 'MISE_EN_DEMEURE')
		);
		expect(p.etablies).toBe(4);
		expect(p.constat).toMatch(/quatre|toutes/i);
	});
});

describe('ce qui pèse le plus, dit sans l’ordonner', () => {
	it('nomme la pièce absente au poids le plus fort', () => {
		// ⚠️ CE N'EST PAS UN CONSEIL : c'est une MESURE. « Le bon de commande
		// vaut 3 points sur 20 » se vérifie au tableau des poids ; « procurez-vous
		// d'abord le bon de commande » serait une consigne.
		const p = pyramideDePreuves(pieces());
		expect(p.prochaine!.cle).toBe('commande');
		expect(p.prochaine!.poids).toBe(3);
	});

	it('passe au suivant quand le plus lourd est acquis', () => {
		const p = pyramideDePreuves(pieces('BON_DE_COMMANDE'));
		expect(p.prochaine!.cle).toBe('livraison');
	});

	it('ne nomme rien quand tout est établi', () => {
		const p = pyramideDePreuves(
			pieces('BON_DE_COMMANDE', 'BON_DE_LIVRAISON', 'CGV', 'MISE_EN_DEMEURE')
		);
		expect(p.prochaine).toBeNull();
	});

	it('départage deux étages de même poids par leur ordre', () => {
		// Les CGV et la mise en demeure valent 1 chacune. Un ordre stable vaut
		// mieux qu'un choix arbitraire qui changerait d'un rendu à l'autre.
		const p = pyramideDePreuves(pieces('BON_DE_COMMANDE', 'BON_DE_LIVRAISON'));
		expect(p.prochaine!.cle).toBe('conditionsContractuelles');
	});
});

describe('l’accord grammatical, qui ne se dérive pas', () => {
	/**
	 * ⚠️ TROUVÉ À L'ÉCRAN, PAS EN TEST. La première version composait l'état
	 * établi depuis le fait : `${majuscule(fait)} est documenté.` Trois étages
	 * sur quatre en sortaient faux —
	 *
	 *     « Les conditions de paiement applicables EST DOCUMENTÉ. »
	 *     « La réception de la prestation EST DOCUMENTÉ. »
	 *
	 * — parce que l'accord d'un participe dépend du genre et du nombre du sujet,
	 * et qu'aucune règle ne les tire d'une chaîne. Une faute de français sur un
	 * écran vendu à des dirigeants coûte plus qu'elle n'en a l'air : elle dit
	 * que personne n'a lu.
	 *
	 * Chaque étage porte donc sa phrase, écrite à la main.
	 */
	it('accorde chaque état établi', () => {
		const complet = pyramideDePreuves([
			'FACTURE',
			'BON_DE_COMMANDE',
			'BON_DE_LIVRAISON',
			'CGV',
			'MISE_EN_DEMEURE'
		]);

		expect(complet.etages.map((e) => e.etat)).toEqual([
			'L’engagement du débiteur à commander est documenté.',
			'La réception de la prestation est documentée.',
			'Les conditions de paiement applicables sont documentées.',
			'L’interpellation préalable est documentée.'
		]);
	});

	it('accorde aussi chaque état absent', () => {
		const vide = pyramideDePreuves(['FACTURE']);
		for (const etage of vide.etages) {
			expect(etage.etat).toMatch(/^Aucune pièce ne documente /);
			expect(etage.etat.endsWith('.')).toBe(true);
		}
	});
});
