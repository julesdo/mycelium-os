import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TITRE_ETAPE } from '../../lib/verticales/recouvrement/etapes-dossier';

/**
 * LA PAGE DOSSIER NE REDEVIENT PAS UNE LISTE DE FONCTIONNALITÉS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CE FICHIER EMPÊCHE, ET CE QUE ÇA COÛTAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le 30 septembre 2026, le reproche du terrain, mot pour mot : « elle manque
 * d'intuitivité ! Il y a beaucoup trop de choses dans tous les sens ! […] On a
 * encore l'impression que l'on a mis à plat toutes les features dans cette page
 * avec des sous-onglets ou des modales. »
 *
 * Relevé au navigateur, sections REPLIÉES : 6 479 px à 375 px, 845 mots,
 * 27 points de décision. Neuf sections repliables, chacune étiquetée d'une
 * proposition relative PLUS une glose :
 *
 *   « Ce qui s'est passé / Vos notes, vos échanges, et ce que le logiciel a
 *     constaté »
 *   « Les valeurs juridiques employées / Leur source, leur date de relevé, et
 *     ce qu'on a le droit d'en faire »
 *
 * Neuf en-têtes × quatorze mots = cent vingt-six mots de mobilier, lus avant le
 * moindre contenu. Après refonte : 2 335 px, 344 mots, 17 points de décision.
 *
 * ⚠️ UNE RÈGLE D'ÉCRITURE NE SE CONVIENT PAS, ELLE S'EXÉCUTE. Celle-ci s'est
 * défaite une première fois sans que personne ne le remarque, parce que chaque
 * titre ajouté n'était qu'un mot de plus que le précédent. C'est le mode de
 * panne de toutes les conventions de style : elles ne cassent jamais d'un coup.
 */

const RACINE = join(import.meta.dirname, '..');

/**
 * ⚠️ LES DEUX ÉCRANS QUI PORTENT DES RANGÉES DÉPLIABLES, pas seulement celui du
 * dossier. La règle d'écriture a été posée pour lui le 30/09/2026 au matin ;
 * l'écran du jour a reçu les mêmes rangées l'après-midi, et une règle qui ne
 * balaie qu'un fichier sur deux est une règle qui vient de doubler sa surface
 * de fuite.
 */
const ECRANS = [join(RACINE, 'creance.tsx'), join(RACINE, 'file.tsx')];

function source(): string {
	return ECRANS.map((ecran) => readFileSync(ecran, 'utf8')).join('\n');
}

/**
 * Les titres littéraux passés aux rangées du dossier.
 *
 * ⚠️ ON LIT LES LITTÉRAUX, PAS LES EXPRESSIONS. Un titre calculé à partir des
 * données — `titre={x ? 'A' : 'B'}` — rend bien DEUX littéraux, et les deux
 * sont relevés : la capture s'arrête à chaque guillemet simple, pas à la fin de
 * la prop. Un titre qui viendrait entièrement d'une variable échapperait, et
 * c'est assumé : le jour où un titre de rangée se calcule ailleurs, il faudra
 * l'écrire ici à la main, et cette ligne-ci le dit.
 */
/**
 * Les balises ouvrantes d'un composant, prop par prop.
 *
 * ⚠️ ON DÉCOUPE PAR COMPOSANT, PAS SUR TOUT LE FICHIER. Un `titre=` traîne aussi
 * sur les rangées de navigation (`LigneAnalyse`, `LigneBouton`), qui obéissent à
 * d'autres règles : « Qui fait l'acte » est un bon intitulé de rangée et un
 * mauvais titre de section. Balayer large ferait crier ce test à tort, et un
 * test qui crie à tort s'éteint aussi sûrement qu'un test absent.
 */
function balisesDe(composant: string): readonly string[] {
	const ouvrantes: string[] = [];
	const texte = source();
	const debut = new RegExp(`<${composant}\\b`, 'g');
	for (const trouve of texte.matchAll(debut)) {
		const depart = trouve.index;
		if (depart === undefined) continue;
		// On s'arrête au premier `>` de PREMIER niveau : les accolades imbriquées
		// d'un ternaire peuvent en contenir, et couper dedans perdrait une branche.
		let profondeur = 0;
		for (let i = depart; i < texte.length; i += 1) {
			const c = texte[i];
			if (c === '{') profondeur += 1;
			else if (c === '}') profondeur -= 1;
			else if (c === '>' && profondeur === 0) {
				ouvrantes.push(texte.slice(depart, i));
				break;
			}
		}
	}
	return ouvrantes;
}

function titresDeRangees(): readonly string[] {
	const titres: string[] = [];
	// `titre="X"` d'un côté ; `titre={ … 'A' … 'B' }` de l'autre, dont on relève
	// CHAQUE branche.
	for (const balise of [...balisesDe('RangeeDepliable'), ...balisesDe('ListeDeRangees')]) {
		for (const [, entreGuillemets, entreAccolades] of balise.matchAll(
			/\btitre=(?:"([^"]*)"|\{([\s\S]*?)\}\n)/g
		)) {
			if (entreGuillemets !== undefined) titres.push(entreGuillemets);
			if (entreAccolades === undefined) continue;
			for (const [, branche] of entreAccolades.matchAll(/'([^']*)'/g)) {
				if (branche !== undefined) titres.push(branche);
			}
		}
	}
	return titres;
}

function mots(titre: string): number {
	return titre.split(/\s+/).filter(Boolean).length;
}

/**
 * ⚠️ LA PROPOSITION RELATIVE EST LE DÉFAUT PRÉCIS, pas la longueur seule.
 * « Ce que vous seul pouvez dire » oblige à lire une phrase pour savoir de quoi
 * parle un conteneur ; « Vos réponses » le dit en deux mots. Apple, page
 * *Writing* des Human Interface Guidelines : « Check each word to be sure it
 * needs to be there. If you can use fewer words, do so. »
 */
const OUVERTURE_INTERDITE = /^(ce (que|qui|dont)|les choses que|tout ce qui)\b/i;

describe('les titres de la page dossier', () => {
	it('sont des noms, pas des phrases', () => {
		const titres = titresDeRangees();

		// Une capture vide voudrait dire que la page a changé de forme sans que
		// ce test s'en aperçoive : c'est le mode de panne d'un test qui lit du
		// source, et il se garde en exigeant d'avoir trouvé quelque chose.
		expect(
			titres.length,
			'Aucun titre de rangée trouvé : la page a changé de forme.'
		).toBeGreaterThan(5);

		const tropLongs = titres.filter((titre) => mots(titre) > 5);
		expect(
			tropLongs,
			[
				'Titres de plus de cinq mots :',
				...tropLongs.map((titre) => `  « ${titre} » (${mots(titre)} mots)`),
				'',
				'Un titre est un NOM. La glose descend dans le panneau, où elle',
				'se lit une fois au lieu de six.'
			].join('\n')
		).toEqual([]);
	});

	/**
	 * ⚠️ LA VRAIE FAUTE N'ÉTAIT PAS LA LONGUEUR DU TITRE, C'ÉTAIT LA GLOSE.
	 *
	 * « Vos courriers » et « Les documents » étaient déjà courts. Ce qui coûtait
	 * cent vingt-six mots, c'est la SECONDE ligne que chaque en-tête REPLIÉ
	 * portait : « À votre nom, relus et validés par vous, envoyés par vous »,
	 * « Déposées ici, lues et classées toutes seules ». Six rangées fermées, six
	 * gloses lues pour en ouvrir une.
	 *
	 * `RangeeDepliable` n'a plus de `legende` : la glose est descendue dans le
	 * panneau. Ce test empêche qu'on la remonte, ce qui est exactement le genre
	 * d'ajout qui paraît anodin — une seule ligne, sur une seule rangée.
	 */
	it('ne portent aucune glose quand ils sont fermés', () => {
		const fautives = balisesDe('RangeeDepliable').filter((balise) => /\blegende=/.test(balise));
		expect(
			fautives.length,
			'La glose d’une rangée se rend DANS le panneau (prop `glose`), jamais sur l’en-tête fermé.'
		).toBe(0);
	});

	it('ne s’ouvrent jamais par une proposition relative', () => {
		const relatifs = titresDeRangees().filter((titre) => OUVERTURE_INTERDITE.test(titre));
		expect(
			relatifs,
			[
				'Titres en proposition relative :',
				...relatifs.map((titre) => `  « ${titre} »`),
				'',
				'« Ce que vous seul pouvez dire » → « Vos réponses ».'
			].join('\n')
		).toEqual([]);
	});

	it('vaut aussi pour les quatre étapes du fil', () => {
		const etapes = Object.values(TITRE_ETAPE);
		const fautifs = etapes.filter((titre) => mots(titre) > 4 || OUVERTURE_INTERDITE.test(titre));
		expect(
			fautifs,
			`Titres d’étape trop longs ou en proposition relative : ${fautifs.join(', ')}`
		).toEqual([]);
	});
});

describe('la hiérarchie des gestes', () => {
	/**
	 * ⚠️ LE GESTE MIS EN AVANT NE NOMME JAMAIS UNE VOIE DE DROIT.
	 *
	 * C'est LE point de vigilance de la refonte du 30/09/2026. La page ne
	 * proposait que des boutons de même poids, précisément pour ne rien mettre en
	 * avant ; l'étape en cours en porte maintenant UN principal. Un bouton
	 * principal qui dirait « Engager une injonction de payer » serait une
	 * recommandation de procédure, c'est-à-dire une consultation juridique, et
	 * c'est la troisième ligne rouge du projet.
	 *
	 * La règle tenue : le geste principal nomme un geste de BUREAU — préparer,
	 * écrire, arrêter. Les voies restent énumérées, jamais classées, derrière une
	 * rangée qui pend à l'étape du tribunal.
	 */
	const VOIES_DE_DROIT =
		/injonction|assignation|référé|saisie|commandement|huissier|commissaire de justice|procédure/i;

	it('aucun bouton principal ne nomme une voie de droit', () => {
		const texte = source();
		const fautifs: string[] = [];
		for (const [, libelle] of texte.matchAll(
			/<BoutonPrincipal\b[^>]*>\s*([^<]+?)\s*<\/BoutonPrincipal>/g
		)) {
			if (libelle !== undefined && VOIES_DE_DROIT.test(libelle)) fautifs.push(libelle);
		}
		expect(
			fautifs,
			[
				'Boutons principaux qui nomment une voie de droit :',
				...fautifs.map((libelle) => `  « ${libelle} »`),
				'',
				'Un geste mis en avant nomme un geste de bureau, jamais une voie.',
				'Les voies s’énumèrent, elles ne se recommandent pas (ligne rouge n° 3).'
			].join('\n')
		).toEqual([]);
	});
});

describe('ce qui est grave', () => {
	/**
	 * ⚠️ RIEN NE DIT QUE RIEN NE S'EST PASSÉ.
	 *
	 * La page écrivait « Aucun angle mort relevé sur ce dossier », puis trente
	 * mots pour le confirmer — un bloc entier, sur chaque dossier sain, pour dire
	 * qu'il n'y avait rien à dire. C'est la règle d'écran n° 4 du produit (« le
	 * vide montre le chemin, jamais des cadrans à zéro ») appliquée aux blocs :
	 * un bloc vide ne se rend pas.
	 *
	 * Le test lit le rendu du composant, pas sa source : c'est la seule façon de
	 * vérifier qu'il ne rend RIEN, et non qu'il ne contient pas tel mot.
	 */
	it('ne s’annonce pas quand il n’y a rien à annoncer', async () => {
		const { renderToStaticMarkup } = await import('react-dom/server');
		const { createElement } = await import('react');
		const { CeQuiBloque } = await import('../../ui/ce-qui-bloque');
		const { FaitsDuDossier } = await import('../../ui/faits-dossier');

		expect(renderToStaticMarkup(createElement(CeQuiBloque, { alertes: [] }))).toBe('');
		expect(
			renderToStaticMarkup(createElement(FaitsDuDossier, { faits: [], supposition: null }))
		).toBe('');
	});
});
