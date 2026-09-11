import { describe, it, expect } from 'vitest';
import {
	QUESTIONS_LITIGE,
	DESCRIPTIONS_FAITS_LITIGE,
	lireLitige,
	questionsRestantes,
	signauxDepuisFaits,
	type Reponses
} from '../litige';

/**
 * LA QUALIFICATION DE LITIGE — recueillir un FAIT, ne conseiller rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE CE MODULE REMPLACE, ET POURQUOI C'ÉTAIT UN DÉFAUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran de créance posait littéralement cette question :
 *
 *     « Pouvez-vous confirmer le caractère certain de cette créance ? »
 *
 * Elle est inutilisable, pour deux raisons qui se cumulent.
 *
 * D'abord, un gérant ne sait pas ce qu'est le « caractère certain ». Ce n'est
 * pas un reproche : c'est une notion de droit. Lui demander d'y répondre, c'est
 * lui demander une qualification juridique — et il répondra « oui », parce
 * qu'il est convaincu qu'on lui doit cet argent. C'est vrai, et ça ne répond
 * pas à la question posée.
 *
 * Ensuite et surtout, cette réponse-là ENGAGE. Un « oui » ouvre les procédures
 * simplifiées, qui sont toutes non contradictoires : la contestation du
 * débiteur y met fin, même infondée, et les frais engagés restent dus. Le
 * produit aurait fait porter au gérant une conséquence qu'il ne pouvait pas
 * anticiper depuis la question qu'on lui posait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ON DEMANDE DONC DES FAITS, DONT AUCUN NE SUPPOSE DE SAVOIR LE DROIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Le débiteur vous a-t-il écrit pour contester cette facture ? » se répond en
 * regardant sa boîte mail. C'est la différence de nature entre ce module et ce
 * qu'il remplace : le gérant fournit ce qu'il est SEUL à savoir, le logiciel en
 * tire ce qui relève de lui.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET ON NE MESURE PAS LE SÉRIEUX D'UNE CONTESTATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une créance est certaine si elle n'est pas SÉRIEUSEMENT contestée. Apprécier
 * le sérieux est un travail de juriste, et le produit ne le fait pas. Il
 * constate qu'une contestation existe et cesse de retenir le caractère certain
 * — ce qui est l'issue prudente : le doute ne profite jamais au produit.
 */

/** Aucun fait de litige, tous expressément écartés par le gérant. */
const RIEN_DE_TOUT_CA: Reponses = {
	CONTESTATION_ECRITE: 'NON',
	REFUS_RECEPTION: 'NON',
	AVOIR_RECLAME: 'NON',
	PENALITES_OPPOSEES: 'NON',
	INSTANCE_EN_COURS: 'NON'
};

describe('les questions posées', () => {
	it('ne demandent jamais une qualification juridique', () => {
		// ⚠️ LE TEST QUI PORTE TOUT LE MODULE. Si ces mots réapparaissent dans une
		// question, c'est qu'on est revenu à demander au gérant de dire le droit —
		// exactement ce qu'on vient de retirer.
		for (const q of QUESTIONS_LITIGE) {
			expect(q.question).not.toMatch(/certain|liquide|exigible|fondé|sérieu|recevab/i);
		}
	});

	it('ne recommandent aucune démarche', () => {
		// Ligne rouge 3 : des constats, jamais des consignes.
		for (const q of QUESTIONS_LITIGE) {
			expect(`${q.question} ${q.portee}`).not.toMatch(
				/vous devriez|il faut|nous vous conseillons|engagez|assignez|saisissez/i
			);
		}
	});

	it('se répondent en regardant ses propres dossiers', () => {
		// Chaque question porte sur un fait dont le gérant est le témoin direct.
		expect(QUESTIONS_LITIGE.length).toBeGreaterThanOrEqual(5);
		for (const q of QUESTIONS_LITIGE) {
			expect(q.question.endsWith('?')).toBe(true);
			expect(q.portee.length).toBeGreaterThan(0);
		}
	});
});

describe('ce que les réponses établissent', () => {
	it('sans aucune réponse, ne conclut rien', () => {
		// ⚠️ L'ABSENCE DE CONTESTATION CONNUE N'EST PAS UNE ABSENCE DE
		// CONTESTATION. Tant que personne n'a répondu, le critère reste
		// indéterminé — c'est l'état de départ du produit, et il est juste.
		const lecture = lireLitige({});
		expect(lecture.certaine).toBe('unknown');
		expect(lecture.litigieux).toBe(false);
		expect(lecture.faitsIndetermines.length).toBeGreaterThan(0);
	});

	it('une contestation écrite ferme le caractère certain', () => {
		const lecture = lireLitige({ ...RIEN_DE_TOUT_CA, CONTESTATION_ECRITE: 'OUI' });
		expect(lecture.litigieux).toBe(true);
		expect(lecture.certaine).toBe('ko');
		expect(lecture.faitsOpposes).toContain('CONTESTATION_ECRITE');
	});

	it('dit qu’il ne mesure pas le sérieux de la contestation', () => {
		// Le constat doit porter l'aveu, sinon le gérant lit « votre créance n'est
		// pas certaine » comme un verdict alors que c'est une abstention.
		const lecture = lireLitige({ ...RIEN_DE_TOUT_CA, CONTESTATION_ECRITE: 'OUI' });
		expect(lecture.constats.join(' ')).toMatch(/sérieu/i);
	});

	it('traite le refus, l’avoir, les pénalités et l’instance comme des litiges', () => {
		for (const cle of [
			'REFUS_RECEPTION',
			'AVOIR_RECLAME',
			'PENALITES_OPPOSEES',
			'INSTANCE_EN_COURS'
		] as const) {
			const lecture = lireLitige({ ...RIEN_DE_TOUT_CA, [cle]: 'OUI' });
			expect(lecture.litigieux).toBe(true);
			expect(lecture.certaine).toBe('ko');
		}
	});

	it('retient le caractère certain quand les cinq faits sont expressément écartés', () => {
		// ⚠️ C'EST TOUT L'APPORT DU MODULE. « Personne n'a rien dit » et « le
		// gérant déclare qu'aucun de ces cinq faits n'a eu lieu » ne sont pas le
		// même état : le second est une absence de contestation CONNUE, déclarée
		// par le seul témoin possible.
		const lecture = lireLitige(RIEN_DE_TOUT_CA);
		expect(lecture.certaine).toBe('ok');
		expect(lecture.litigieux).toBe(false);
		expect(lecture.faitsIndetermines).toEqual([]);
	});

	it('un seul « je ne sais pas » suffit à ne pas conclure', () => {
		const lecture = lireLitige({ ...RIEN_DE_TOUT_CA, AVOIR_RECLAME: 'INCONNU' });
		expect(lecture.certaine).toBe('unknown');
		expect(lecture.faitsIndetermines).toEqual(['AVOIR_RECLAME']);
	});

	it('une contestation connue l’emporte sur un fait indéterminé', () => {
		// Savoir qu'il conteste tranche la question ; ignorer s'il a réclamé un
		// avoir ne la rouvre pas. Même ordre que `combiner` dans `deduction.ts`.
		const lecture = lireLitige({
			...RIEN_DE_TOUT_CA,
			CONTESTATION_ECRITE: 'OUI',
			AVOIR_RECLAME: 'INCONNU'
		});
		expect(lecture.certaine).toBe('ko');
	});

	it('une reconnaissance écrite ne rattrape jamais une contestation', () => {
		// Reconnaître une dette en mars puis la contester en juin est banal. Le
		// fait le plus favorable ne doit pas effacer le fait le plus récent.
		const lecture = lireLitige({
			...RIEN_DE_TOUT_CA,
			CONTESTATION_ECRITE: 'OUI',
			RECONNAISSANCE_ECRITE: 'OUI'
		});
		expect(lecture.certaine).toBe('ko');
		expect(lecture.litigieux).toBe(true);
	});

	it('une reconnaissance écrite n’est PAS nécessaire pour conclure', () => {
		// Sinon le module exigerait une pièce que la plupart des dossiers n'ont
		// pas, et ne conclurait jamais.
		expect(lireLitige(RIEN_DE_TOUT_CA).certaine).toBe('ok');
	});

	it('déclare que la reconnaissance n’entre pas dans le calcul de prescription', () => {
		// ⚠️ CE QUE LE LOGICIEL NE VOIT PAS S'AFFICHE AUSSI. L'effet d'une
		// reconnaissance de dette sur le délai de prescription est une règle
		// juridique qui n'a été ni relevée ni validée ici. On ne la devine pas, et
		// on ne laisse pas croire qu'elle est prise en compte.
		const lecture = lireLitige({ ...RIEN_DE_TOUT_CA, RECONNAISSANCE_ECRITE: 'OUI' });
		expect(lecture.constats.join(' ')).toMatch(/prescription/i);
	});
});

describe('ce qu’on demande encore', () => {
	it('ne pose que les questions sans réponse', () => {
		const restantes = questionsRestantes({ CONTESTATION_ECRITE: 'NON' });
		expect(restantes.map((q) => q.cle)).not.toContain('CONTESTATION_ECRITE');
		expect(restantes.length).toBe(QUESTIONS_LITIGE.length - 1);
	});

	it('repose une question restée sans certitude', () => {
		// « Je ne sais pas » n'est pas une réponse acquise : elle laisse le critère
		// ouvert, donc la question se repose.
		const restantes = questionsRestantes({ AVOIR_RECLAME: 'INCONNU' });
		expect(restantes.map((q) => q.cle)).toContain('AVOIR_RECLAME');
	});

	it('s’arrête dès qu’un litige est établi', () => {
		// ⚠️ « Le logiciel décide, le gérant confirme ». Une fois la contestation
		// connue, les questions suivantes ne changent plus rien : les poser ferait
		// payer de l'attention pour zéro information.
		expect(questionsRestantes({ CONTESTATION_ECRITE: 'OUI' })).toEqual([]);
	});
});

describe('ce que les faits déclarés donnent au scoring', () => {
	it('alimente les signaux de contestation, qui étaient câblés à vide', () => {
		// ⚠️ SIXIÈME OCCURRENCE DU DÉFAUT « DÉCLARÉ, LU, JAMAIS ALIMENTÉ ».
		// `signauxContestation` est lu par le moteur de scoring, qui en fait des
		// risques BLOQUANTS, et les deux seuls appelants lui passaient `[]` en
		// dur. Le « risque produit numéro un » selon son propre commentaire ne
		// pouvait donc jamais se déclencher.
		const signaux = signauxDepuisFaits({
			CONTESTATION_ECRITE: 'OUI',
			PENALITES_OPPOSEES: 'OUI'
		});
		expect(signaux).toEqual(['CONTESTATION_ECRITE', 'PENALITES_OPPOSEES']);
	});

	it('ne signale rien sur un fait écarté ou inconnu', () => {
		expect(signauxDepuisFaits({ CONTESTATION_ECRITE: 'NON', AVOIR_RECLAME: 'INCONNU' })).toEqual(
			[]
		);
	});

	it('ne signale jamais la reconnaissance de dette', () => {
		// Elle va dans l'autre sens : ce n'est pas un signal de contestation.
		expect(signauxDepuisFaits({ RECONNAISSANCE_ECRITE: 'OUI' })).toEqual([]);
	});

	it('donne à chaque signal une description qui reste un constat', () => {
		for (const [, description] of Object.entries(DESCRIPTIONS_FAITS_LITIGE)) {
			expect(description).not.toMatch(/vous devriez|il faut|renoncez|abandonnez/i);
			expect(description.length).toBeGreaterThan(0);
		}
	});
});
