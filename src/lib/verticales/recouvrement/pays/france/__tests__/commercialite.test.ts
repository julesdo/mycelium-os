import { describe, it, expect } from 'vitest';
import { qualiteCommercantDeLaForme } from '../commercialite';

/**
 * LA DÉDUCTION DE LA QUALITÉ DE COMMERÇANT, ET SURTOUT CE QU'ELLE REFUSE DE
 * DÉDUIRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE ALORS QUE LE PROJET N'ÉCRIT PAS DE TEST PAR DÉFAUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les règles juridiques se testent. Celle-ci décide de ce qu'un écran affiche
 * sans le demander, sur un critère qui commande l'éligibilité à une procédure :
 * une déduction fausse dans le sens favorable ouvre un dossier qui se fait
 * rejeter, et le gérant ne saura jamais que le logiciel a répondu à sa place.
 *
 * ⚠️ LE SENS DE L'ERREUR EST CE QUI EST VÉRIFIÉ ICI. Trois familles de cas :
 *
 *   · ce qui se déduit vers `ok` — les quatre familles closes de L210-1 ;
 *   · ce qui se déduit vers `ko` — le civil, l'agricole hors forme commerciale ;
 *   · ce qui NE SE DÉDUIT PAS, et qui est le cœur du fichier. Une forme absente,
 *     un libellé inconnu, une société d'exercice libéral, une association, un
 *     groupement, une personne physique : tous rendent `unknown`. Aucun ne rend
 *     `ok`, et c'est l'assertion qui compte.
 */

describe('les formes commerciales par la forme', () => {
	const commerciales = [
		'SNC',
		'Société en nom collectif',
		'SCS',
		'Société en commandite simple',
		'SARL',
		'S.A.R.L.',
		'Société à responsabilité limitée',
		'EURL',
		'SA',
		'Société Anonyme',
		'SAS',
		'Société par Actions Simplifiée',
		'SASU',
		'SCA',
		'Société en commandite par actions'
	];

	it.each(commerciales)('« %s » se déduit comme commerçante', (libelle) => {
		const deduite = qualiteCommercantDeLaForme(libelle);
		expect(deduite.etat, libelle).toBe('ok');
		expect(deduite.motif, libelle).toBeUndefined();
	});

	it('cite le texte qui la fonde, pas le brief', () => {
		expect(qualiteCommercantDeLaForme('SAS').fondement).toMatch(/L210-1/);
	});

	it('rend le libellé sur lequel elle repose, tel qu’il a été relevé', () => {
		// Ce que l'écran affiche à côté de sa réponse : sans lui, le gérant lit
		// une conclusion sans savoir sur quoi elle porte.
		expect(qualiteCommercantDeLaForme('Société par Actions Simplifiée').formeRelevee).toBe(
			'Société par Actions Simplifiée'
		);
	});

	it('lit de la même façon les accents, la casse et les points d’abréviation', () => {
		for (const ecriture of ['SARL', 'sarl', 'S.A.R.L.', 'Sarl']) {
			expect(qualiteCommercantDeLaForme(ecriture).etat, ecriture).toBe('ok');
		}
		expect(qualiteCommercantDeLaForme('SOCIETE A RESPONSABILITE LIMITEE').etat).toBe('ok');
	});

	it('fait passer la forme avant l’activité', () => {
		// Une exploitation agricole constituée en société à responsabilité limitée
		// tombe sous L210-1 : la commercialité par la forme s'applique d'abord, et
		// le caractère civil des activités agricoles ne joue qu'ensuite.
		expect(
			qualiteCommercantDeLaForme('Société à responsabilité limitée d’exploitation agricole').etat
		).toBe('ok');
	});
});

describe('les formes qui ne sont pas commerciales', () => {
	const civiles = [
		'SCI',
		'Société civile immobilière',
		'Société civile professionnelle',
		'SCP',
		'Société civile de moyens'
	];

	it.each(civiles)('« %s » se déduit comme non commerçante', (libelle) => {
		expect(qualiteCommercantDeLaForme(libelle).etat, libelle).toBe('ko');
	});

	it('fonde le civil sur le code civil, et l’agricole sur le code rural', () => {
		expect(qualiteCommercantDeLaForme('Société civile immobilière').fondement).toMatch(/1845/);
		expect(qualiteCommercantDeLaForme('GAEC').fondement).toMatch(/L311-1/);
	});

	const agricoles = [
		'GAEC',
		'EARL',
		'SCEA',
		'Exploitation agricole à responsabilité limitée',
		'Groupement agricole d’exploitation en commun'
	];

	it.each(agricoles)('« %s » reste civile : aucune des quatre familles', (libelle) => {
		expect(qualiteCommercantDeLaForme(libelle).etat, libelle).toBe('ko');
	});
});

describe('ce qui ne se déduit pas — et ne se présume jamais', () => {
	it('une forme absente ne vaut pas une réponse', () => {
		for (const rien of [undefined, '', '   ']) {
			const deduite = qualiteCommercantDeLaForme(rien);
			expect(deduite.etat).toBe('unknown');
			expect(deduite.motif).toBe('AUCUNE_FORME_RELEVEE');
			// Rien n'a été relevé : il n'y a pas de libellé à montrer.
			expect(deduite.formeRelevee).toBeUndefined();
		}
	});

	it('un libellé inconnu échoue vers l’indétermination, jamais vers une réponse', () => {
		// Le registre rend du TEXTE LIBRE, pas un code. Un libellé non reconnu ne
		// vaut ni oui ni non — et il se cite, pour que le gérant voie ce que le
		// logiciel a lu.
		const deduite = qualiteCommercantDeLaForme('Établissement public à caractère industriel');
		expect(deduite.etat).toBe('unknown');
		expect(deduite.motif).toBe('FORME_NON_RECONNUE');
		expect(deduite.fondement).toContain('Établissement public à caractère industriel');
	});

	it('une société d’exercice libéral ne se déduit pas de sa forme commerciale', () => {
		// Forme commerciale, objet civil : la question de la qualité de commerçant
		// y est expressément débattue. Répondre « oui » sur la forme serait
		// trancher une controverse à la place d'un juge.
		for (const libelle of ['SELARL', 'SELAS', 'S.E.L.A.R.L.', 'Société d’exercice libéral']) {
			const deduite = qualiteCommercantDeLaForme(libelle);
			expect(deduite.etat, libelle).toBe('unknown');
			expect(deduite.motif, libelle).toBe('EXERCICE_LIBERAL_EN_SOCIETE');
		}
	});

	it('une association n’est ni « oui » ni « non »', () => {
		// Aucune commercialité par la forme, et une jurisprudence divisée sur la
		// commercialité par l'activité : écrire `ko` fermerait une voie sur une
		// controverse.
		const deduite = qualiteCommercantDeLaForme('Association déclarée');
		expect(deduite.etat).toBe('unknown');
		expect(deduite.motif).toBe('ASSOCIATION');
	});

	it('un groupement d’intérêt économique n’emporte aucune présomption', () => {
		const deduite = qualiteCommercantDeLaForme('GIE');
		expect(deduite.etat).toBe('unknown');
		expect(deduite.motif).toBe('GROUPEMENT_SANS_PRESOMPTION');
	});

	it('une personne physique reste une question, et dit pourquoi', () => {
		// Depuis la fusion des catégories juridiques de l'INSEE au 1er juillet
		// 2018, la forme d'une entreprise individuelle ne distingue plus le
		// commerçant de l'artisan, du libéral et de l'agriculteur. C'est un trou
		// dans la DONNÉE, pas dans le droit — et l'écran doit le dire.
		for (const libelle of ['Entrepreneur individuel', 'EI', 'Artisan', 'Profession libérale']) {
			const deduite = qualiteCommercantDeLaForme(libelle);
			expect(deduite.etat, libelle).toBe('unknown');
			expect(deduite.motif, libelle).toBe('PERSONNE_PHYSIQUE');
		}
		expect(qualiteCommercantDeLaForme('Entrepreneur individuel').fondement).toMatch(/INSEE/);
	});

	it('ne rend jamais « commerçante » sur un doute, quel qu’il soit', () => {
		// L'assertion qui tient toutes les autres : le doute ne profite jamais au
		// produit. Ajouter demain une famille douteuse sans la faire tomber ici
		// serait la seule façon de casser cette règle sans s'en apercevoir.
		const douteux = [
			undefined,
			'',
			'SELARL',
			'Association déclarée',
			'GIE',
			'Entrepreneur individuel',
			'Artisan',
			'Groupement forestier',
			'Syndicat de copropriété'
		];
		for (const libelle of douteux) {
			expect(qualiteCommercantDeLaForme(libelle).etat, String(libelle)).not.toBe('ok');
		}
	});

	it('porte toujours un fondement, même quand il n’y a rien à déduire', () => {
		// Une réponse sans motif est une réponse qu'on demande de croire. L'écran
		// affiche celui-ci tel quel.
		for (const libelle of [undefined, 'SAS', 'SCI', 'GIE', 'Forme inconnue']) {
			expect(qualiteCommercantDeLaForme(libelle).fondement.length, String(libelle)).toBeGreaterThan(
				20
			);
		}
	});
});
