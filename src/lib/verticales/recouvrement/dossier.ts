import { dateLisible } from './calendrier';
import { composerPiece, type DecompteFige, type Piece } from './piece';
import { etatDuReferentiel, mentionEtatReferentiel, type FicheParametre } from './referentiel';

/**
 * LE DOSSIER À REMETTRE AU CONSEIL.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL EST, ET CE QU'IL N'EST PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un document figé et daté qui reprend le décompte segment par segment, les
 * sources et leurs dates, les hypothèses retenues, les angles morts, et
 * l'énumération des voies que ces conditions ouvrent, SANS ORDRE.
 *
 * Ce n'est pas un modèle de requête. Ce n'est pas un courrier au débiteur. C'est
 * le dossier que l'avocat lit, et il énonce des CONSTATS : « cette créance
 * remplit les conditions X, Y, Z ». Jamais « telle voie est la plus rapide »,
 * jamais un ordre de préférence, jamais une conduite à tenir. Nommer une voie
 * avant les autres serait du conseil juridique, et c'est la troisième ligne
 * rouge du projet.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL VIT SOUS `exiger()`, JAMAIS SOUS `exigerPourActe()`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la frontière calculer / produire un acte, et ce document tombe du côté
 * « calculer ». `exiger()` suffit, parce qu'un chiffre affiché se corrige ;
 * `exigerPourActe()` garde la barrière pour le jour où un chiffre part à un
 * greffe et ne se corrige plus. Ce produit n'émet aucun acte, et
 * `exigerPourActe()` n'a aucun site d'appel.
 *
 * Refuser ce document à un avocat au motif qu'aucun avocat ne l'a validé serait
 * un mur circulaire ; le lui donner sans dire ce qu'il tient serait pire. D'où
 * la mention en tête, qui COMPTE l'état de chaque valeur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA RÈGLE EST ICI, LE RENDU EST BÊTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce module rend une description ordonnée, pas du PDF, exactement comme
 * `piece.ts`. C'est ce qui le rend testable sans harnais, et ce qui garantit
 * qu'un second format dira la même chose.
 */

/** Une voie, telle que la machine des procédures la décrit. Jamais classée. */
export interface VoiePourLeDossier {
	readonly nom: string;
	readonly disponible: boolean;
	/** Ce qui manque à cette voie, en constats. */
	readonly blocages: readonly string[];
}

export interface EntreesDossier {
	readonly decompte: DecompteFige;
	readonly voies: readonly VoiePourLeDossier[];
	/** Les hypothèses retenues faute de donnée, en toutes lettres. */
	readonly hypotheses: readonly string[];
	/** Ce que le logiciel ne voit pas, et le dit. */
	readonly anglesMorts: readonly string[];
}

export interface Dossier {
	readonly titre: string;
	readonly dateArrete: string;
	/** Le décompte lui-même, dans la forme que la pièce lui donne déjà. */
	readonly piece: Piece;
	/** La mention qui compte l'état de chaque valeur juridique. En tête. */
	readonly mentionReferentiel: string;
	readonly valeurs: readonly FicheParametre[];
	readonly hypotheses: readonly string[];
	readonly anglesMorts: readonly string[];
	/**
	 * Les voies, ÉNUMÉRÉES. L'ordre est alphabétique et le document le dit :
	 * ce n'est pas un classement, et aucune n'est recommandée.
	 */
	readonly voies: readonly string[];
	readonly noteSurLesVoies: string;
	readonly avertissement: string;
}

/** L'état d'une valeur, dit sans jargon et sans raccourci rassurant. */
export function etatLisible(fiche: FicheParametre): string {
	const releve = fiche.verifie
		? `relevée sur source publique le ${dateLisible(fiche.verifieLe)}`
		: 'non relevée sur une source publique citable';
	const juriste = fiche.valideParAvocat
		? 'contrôlée par un juriste'
		: 'non contrôlée par un juriste';
	return `${releve}, ${juriste}`;
}

export function composerDossier(entrees: EntreesDossier): Dossier {
	const etat = etatDuReferentiel();

	return {
		titre: `Dossier de créance arrêté au ${dateLisible(entrees.decompte.arreteAu)}`,
		dateArrete: entrees.decompte.arreteAu,
		piece: composerPiece(entrees.decompte),
		mentionReferentiel: mentionEtatReferentiel(etat),
		valeurs: etat.fiches,

		hypotheses:
			entrees.hypotheses.length > 0
				? entrees.hypotheses
				: ['Aucune hypothèse retenue : chaque donnée du calcul vient d’une pièce ou d’un relevé.'],

		// ⚠️ LE SILENCE SE LIRAIT COMME « on n'a pas regardé ». Un dossier
		// professionnel dit ce qu'il couvre ET ce qu'il ne voit pas.
		anglesMorts:
			entrees.anglesMorts.length > 0
				? entrees.anglesMorts
				: ['Aucun angle mort relevé sur ce dossier à cette date.'],

		voies: [...entrees.voies]
			.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
			.map((voie) =>
				voie.disponible
					? `${voie.nom} : les conditions relevées par ce logiciel sont réunies.`
					: `${voie.nom} : conditions non réunies en l’état. ${voie.blocages.join(' ')}`.trim()
			),

		noteSurLesVoies:
			'Cette énumération est alphabétique. Ce n’est pas un classement, et ce logiciel n’en ' +
			'désigne aucune : il constate quelles conditions sont réunies, et la décision ' +
			'appartient au créancier et à son conseil.',

		avertissement:
			'Ce document réunit un décompte de créance arrêté à la date indiquée et les constats ' +
			'qui l’accompagnent. Ce n’est pas une mise en demeure, ni un acte de procédure, et il ' +
			'ne fait courir aucun délai. Les valeurs juridiques qu’il cite sont relevées sur source ' +
			'publique par le logiciel ; leur applicabilité au cas d’espèce relève de son lecteur.'
	};
}
