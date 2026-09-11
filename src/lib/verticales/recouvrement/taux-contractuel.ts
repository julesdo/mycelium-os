import { fraction, type Fraction } from '../../socle/montants';
import { plancherContractuel } from './pays/france/taux';

/**
 * LE TAUX CONTRACTUEL — le déclarer, le contrôler, ne jamais le corriger.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE MODULE EXISTE : UN CHAMP LU ET JAMAIS ALIMENTÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `facturesVente.tauxContractuel` était déclaré au schéma et LU par les deux
 * moteurs de calcul — `convex/recouvrement/decompte.ts` et `revelation.ts` —
 * qui s'en servent pour remplacer la série légale par une stipulation.
 *
 * Il n'était ÉCRIT nulle part. Aucune mutation, aucun import, aucun écran.
 *
 * Conséquence, invisible et coûteuse : tout créancier dont les conditions
 * générales stipulent un taux — le cas courant en B2B — retombait
 * silencieusement sur le taux légal. Le produit SOUS-RÉCLAMAIT, ce qui est
 * exactement l'inverse de sa raison d'être, et aucun test ne pouvait le voir :
 * le calcul était juste, c'est son entrée qui manquait.
 *
 * Cinquième occurrence du défaut « déclaré, lu, jamais alimenté » ici.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ON CONSTATE LE PLANCHER, ON NE RELÈVE AUCUN TAUX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `pays/france/taux.ts` pose déjà la règle : « relever d'office un taux
 * contractuel jugé trop bas serait écrire une conséquence juridique que
 * personne n'a validée ». Ce module s'y tient sans exception.
 *
 * Un taux sous le plancher est ENREGISTRÉ tel que le créancier le déclare, et
 * le constat le dit. C'est lui qui connaît ses conditions générales ; nous ne
 * faisons que mesurer.
 */

/** Le résultat d'un contrôle. Le taux en sort toujours INCHANGÉ. */
export interface ControleTaux {
	/** Le taux déclaré, tel quel. Jamais modifié par ce module. */
	readonly taux: Fraction;
	/**
	 * Faux quand le semestre de la date n'est pas relevé dans la série légale.
	 * Le contrôle n'a alors pas pu avoir lieu — ce n'est pas un feu vert.
	 */
	readonly plancherConnu: boolean;
	/** Le plancher applicable, quand il est connu. */
	readonly plancher: Fraction | null;
	readonly plancherLisible: string;
	readonly sousLePlancher: boolean;
	/** Ce qu'on en dit au créancier. Un constat, jamais une consigne. */
	readonly constat: string;
}

/**
 * Un taux en pourcentage SAISISSABLE — « 12,00 », sans le signe.
 *
 * ⚠️ IL EST L'INVERSE EXACT DE `tauxDepuisPourcentage`, et c'est ce qui
 * permet à un écran de RELIRE ce qu'il a écrit. Sans lui, le champ de saisie
 * repartirait vide à chaque ouverture, et le créancier croirait son taux
 * perdu — donc le ressaisirait, donc écraserait ce qui était juste.
 */
export function pourcentageDepuisTaux(taux: Fraction): string {
	const pourMille = (taux.numerateur * 10_000n) / taux.denominateur;
	const entier = pourMille / 100n;
	const decimales = (pourMille % 100n).toString().padStart(2, '0');
	return `${entier},${decimales}`;
}

/** Le même, avec le signe, pour un constat destiné à être lu. */
function enPourcentage(taux: Fraction): string {
	const pourMille = (taux.numerateur * 10_000n) / taux.denominateur;
	const entier = pourMille / 100n;
	const decimales = (pourMille % 100n).toString().padStart(2, '0');
	return `${entier},${decimales} %`;
}

/**
 * Lit un pourcentage saisi et le rend en fraction exacte.
 *
 * ⚠️ AUCUN FLOTTANT DANS LA CHAÎNE. « 12,45 » devient 1245/10000, exactement
 * comme les taux du registre. Passer par `Number` réintroduirait ici la seule
 * chose que tout le produit évite depuis le parseur — et ce taux-là entre dans
 * un décompte qui part chez un tiers.
 *
 * ⚠️ ET ON REFUSE PLUTÔT QUE D'ARRONDIR. Trois décimales lèvent. Arrondir
 * silencieusement un taux opposable produit un chiffre faux qu'on ne sait plus
 * expliquer — et c'est le débiteur qui refera le calcul.
 */
export function tauxDepuisPourcentage(saisi: string): Fraction {
	const propre = saisi.trim().replace(',', '.');

	// Un entier, ou un décimal à deux chiffres au plus. Rien d'autre : ni
	// notation exponentielle, ni espaces internes, ni signe.
	const trouve = /^(\d+)(?:\.(\d{1,2}))?$/.exec(propre);
	if (trouve === null) {
		if (/^\d+\.\d{3,}$/.test(propre)) {
			throw new Error(
				`« ${saisi} » porte plus de deux décimales. Un taux opposable ne s’arrondit pas.`
			);
		}
		throw new Error(`« ${saisi} » n’est pas un pourcentage. Deux décimales au plus.`);
	}

	const entier = BigInt(trouve[1] ?? '0');
	const decimales = (trouve[2] ?? '').padEnd(2, '0');
	const centiemes = entier * 100n + BigInt(decimales);

	if (centiemes <= 0n) {
		throw new Error(
			'Un taux nul ou négatif n’est pas une stipulation. Laissez le champ vide pour appliquer le taux légal.'
		);
	}

	// Le pourcentage est en centièmes ; le registre exprime ses taux sur 10 000.
	return fraction(centiemes, 10_000n);
}

/**
 * Confronte un taux déclaré au plancher légal, à la date considérée.
 *
 * ⚠️ IL NE LÈVE JAMAIS. `plancherContractuel` lève sur un semestre absent de la
 * série — et cette exception emporterait l'enregistrement d'un taux
 * parfaitement valable. On ne refuse pas la donnée d'un client parce qu'il nous
 * manque une valeur juridique : le contrôle devient « inconnu », et le dit.
 *
 * `plancherConnu: false` n'est PAS un feu vert. C'est l'aveu que le contrôle
 * n'a pas eu lieu, et le constat le nomme.
 */
export function controlerTauxContractuel(taux: Fraction, aLaDate: string): ControleTaux {
	let plancher: Fraction | null;
	try {
		plancher = plancherContractuel(aLaDate);
	} catch {
		plancher = null;
	}

	if (plancher === null) {
		return {
			taux,
			plancherConnu: false,
			plancher: null,
			plancherLisible: '—',
			// Faux plutôt que vrai : on n'affirme pas une infraction qu'on n'a pas
			// pu constater. Le doute ne profite pas non plus au produit dans
			// l'autre sens — c'est le constat qui porte l'incertitude.
			sousLePlancher: false,
			constat:
				`Le taux de ${enPourcentage(taux)} est enregistré. Le plancher légal applicable au ` +
				`${aLaDate} n’est pas relevé dans le référentiel : ce taux n’a donc PAS été contrôlé.`
		};
	}

	// Comparaison de deux fractions sans jamais diviser : a/b < c/d équivaut à
	// a·d < c·b, les dénominateurs étant positifs par construction.
	const sousLePlancher =
		taux.numerateur * plancher.denominateur < plancher.numerateur * taux.denominateur;

	return {
		taux,
		plancherConnu: true,
		plancher,
		plancherLisible: enPourcentage(plancher),
		sousLePlancher,
		constat: sousLePlancher
			? // ⚠️ UN CONSTAT, PAS UNE CONSIGNE. On dit ce qu'on mesure et on
				// s'arrête. Ni « corrigez », ni « vous devez » : le créancier connaît
				// ses conditions générales, et la conséquence juridique d'un taux trop
				// bas n'a été validée par personne. Ligne rouge 3.
				`Le taux déclaré, ${enPourcentage(taux)}, est inférieur au plancher de ` +
				`${enPourcentage(plancher)} constaté au ${aLaDate} — trois fois le taux d’intérêt ` +
				'légal des « autres cas ». Le taux est enregistré tel que vous l’avez déclaré.'
			: `Le taux de ${enPourcentage(taux)} est au-dessus du plancher de ` +
				`${enPourcentage(plancher)} constaté au ${aLaDate}.`
	};
}
