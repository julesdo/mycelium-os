import { estSirenValide } from './siren';

/**
 * TROUVER UN DÉBITEUR AU REGISTRE, À PARTIR DE SON NOM.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QUE CE MODULE CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le volet d'un débiteur demandait son SIREN dans un CHAMP DE SAISIE VIDE. Le
 * gérant devait aller le chercher ailleurs, et recopier neuf chiffres.
 *
 * C'est la règle d'écran n° 1 du projet, prise à l'envers : « le logiciel
 * décide, le gérant confirme. Aucun écran ne demande une saisie que le logiciel
 * peut déduire. Un champ vide qu'il aurait pu remplir est un défaut. »
 *
 * Et le logiciel POUVAIT. Le BODACC est branché depuis le radar de solvabilité,
 * il est ouvert, sans clé, et chaque annonce porte le nom du commerçant, son
 * SIREN, sa forme juridique et l'adresse de son siège — c'est-à-dire tout ce
 * que ce formulaire réclamait, sauf le secteur, qui décrit la RELATION
 * commerciale et non le débiteur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ON PROPOSE, ON NE CHOISIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une recherche sur « BOULANGERIE MARTIN » rend SIX sociétés distinctes, dans
 * six villes. Retenir la première écrirait un SIREN faux dans un dossier — et
 * ce SIREN commande le radar de solvabilité ET l'éligibilité à toute procédure.
 *
 * C'est la faute que `bodacc.ts` interdit déjà, dans les mêmes mots :
 * « rapprocher par raison sociale sur un flux national finirait par annoncer à
 * un gérant que son client solvable est en liquidation ».
 *
 * L'interdit y vise pourtant un autre geste, et la distinction est tout :
 *
 *   · la SURVEILLANCE applique un delta national sans que personne regarde.
 *     Un faux rapprochement y est silencieux et agit seul — d'où
 *     l'appariement par identifiant, sans exception.
 *   · cette RECHERCHE est déclenchée par le gérant, sur son propre client,
 *     dont il connaît la ville. Elle rend une liste qu'il LIT, et rien n'est
 *     écrit avant qu'il ait touché une rangée.
 *
 * Le module rend donc une liste ordonnée. Jamais un choix.
 *
 * ⚠️ ET IL NE LÈVE JAMAIS. `listepersonnes` arrive en CHAÎNE JSON — comme
 * `jugement` — et cassera tôt ou tard. Une annonce illisible est écartée, la
 * recherche continue. Même discipline que `lireAnnonce`.
 *
 * ⚠️ CE QUE LE BODACC NE COUVRE PAS, ET QUI DOIT SE DIRE. Le registre ne publie
 * que ce qui a fait l'objet d'une annonce de greffe. Une société qui n'en a
 * jamais eu — ou dont l'annonce précède la mise en ligne du jeu de données —
 * n'y figure pas. L'appelant doit donc pouvoir distinguer « rien trouvé » d'un
 * échec, et le dire : un repli silencieux serait un mensonge.
 */

export interface EtablissementTrouve {
	readonly siren: string;
	/** La dénomination du registre, ou à défaut le nom du commerçant. */
	readonly denomination: string;
	readonly formeJuridique?: string;
	readonly ville?: string;
	/** Le siège, en une ligne, pour reconnaître SON client parmi des homonymes. */
	readonly adresse?: string;
	/** La parution la plus récente qui porte cet établissement. */
	readonly derniereParution?: string;
}

function texte(valeur: unknown): string | undefined {
	return typeof valeur === 'string' && valeur.trim() !== '' ? valeur.trim() : undefined;
}

/** Le premier numéro du registre qui passe sa clé de contrôle, ou `null`. */
function sirenDuRegistre(registre: unknown): string | null {
	if (!Array.isArray(registre)) return null;
	for (const entree of registre) {
		if (typeof entree !== 'string') continue;
		const chiffres = entree.replace(/\D/g, '');
		if (estSirenValide(chiffres)) return chiffres;
	}
	return null;
}

interface PersonneLue {
	readonly denomination?: string;
	readonly formeJuridique?: string;
	readonly adresse?: string;
}

/**
 * La personne morale de l'annonce, ou `null`. Ne lève pas.
 *
 * L'adresse est recomposée dans l'ordre où on la lit sur une enveloppe. Les
 * champs manquants tombent : une annonce sans numéro de voie doit rendre
 * « Place Nicolas Sellé 76400 Fécamp », pas « undefined Place… ».
 */
function lirePersonne(brut: unknown): PersonneLue | null {
	if (typeof brut !== 'string' || brut.trim() === '') return null;
	try {
		const analyse: unknown = JSON.parse(brut);
		if (typeof analyse !== 'object' || analyse === null) return null;
		const personne = (analyse as Record<string, unknown>).personne;
		if (typeof personne !== 'object' || personne === null) return null;
		const champs = personne as Record<string, unknown>;

		const siege = champs.adresseSiegeSocial;
		const parties =
			typeof siege === 'object' && siege !== null
				? (['numeroVoie', 'typeVoie', 'nomVoie', 'codePostal', 'ville'] as const)
						.map((cle) => texte((siege as Record<string, unknown>)[cle]))
						.filter((part): part is string => part !== undefined)
				: [];

		return {
			denomination: texte(champs.denomination),
			formeJuridique: texte(champs.formeJuridique),
			adresse: parties.length > 0 ? parties.join(' ') : undefined
		};
	} catch {
		return null;
	}
}

/**
 * Les établissements distincts d'un lot d'annonces, du plus récemment paru au
 * plus ancien — c'est-à-dire dans l'ordre où l'API les rend.
 *
 * ⚠️ LE DÉDOUBLONNAGE EST PAR SIREN, ET IL COMPTE. Une société qui dépose ses
 * comptes chaque année apparaît une fois par exercice ; sans dédoublonnage, le
 * gérant reçoit quarante rangées identiques. Quarante rangées ne sont pas un
 * choix, c'est un mur — et un mur se referme sans qu'on ait choisi.
 *
 * La PREMIÈRE annonce rencontrée gagne : l'appelant trie par parution
 * décroissante, donc c'est la plus récente qui porte le nom et l'adresse à
 * jour. Une société qui déménage doit apparaître à sa nouvelle adresse.
 */
export function lireEtablissements(annonces: readonly unknown[]): readonly EtablissementTrouve[] {
	const parSiren = new Map<string, EtablissementTrouve>();

	for (const brut of annonces) {
		if (typeof brut !== 'object' || brut === null) continue;
		const annonce = brut as Record<string, unknown>;

		const siren = sirenDuRegistre(annonce.registre);
		if (siren === null || parSiren.has(siren)) continue;

		const personne = lirePersonne(annonce.listepersonnes);
		const denomination = personne?.denomination ?? texte(annonce.commercant);
		// Sans nom, la rangée ne se reconnaît pas : on ne la propose pas.
		if (denomination === undefined) continue;

		parSiren.set(siren, {
			siren,
			denomination,
			...(personne?.formeJuridique === undefined
				? {}
				: { formeJuridique: personne.formeJuridique }),
			...(texte(annonce.ville) === undefined ? {} : { ville: texte(annonce.ville) as string }),
			...(personne?.adresse === undefined ? {} : { adresse: personne.adresse }),
			...(texte(annonce.dateparution) === undefined
				? {}
				: { derniereParution: texte(annonce.dateparution) as string })
		});
	}

	return [...parSiren.values()];
}
