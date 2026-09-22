import type { ChampsFacturX } from '../../../socle/documents/facturx';
import { depuisEuros, enCentimes, type Montant } from '../../../socle/montants';
import { estDateReelle } from '../calendrier';
import { sirenLu } from './factureVente';
import type { FactureImportee, LigneIgnoree, ResultatImport } from './exportComptable';

/**
 * UN CII DEVIENT UNE FACTURE IMPORTABLE — ou un refus qui se nomme.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE CHEMIN EXISTE, ET CE QU'IL CHANGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tout PDF déposé partait chez le modèle, qui coûte, qui approxime, et dont le
 * résultat traverse un `z.number()`. Un Factur-X porte les mêmes montants en
 * TEXTE DÉCIMAL EXACT : `depuisEuros("19172.24")` ne passe par aucun flottant.
 *
 * Et depuis le 1er septembre 2026, toute entreprise doit pouvoir RECEVOIR une
 * facture électronique ; les TPE et PME devront l'ÉMETTRE au 1er septembre
 * 2027. Nos clients sont des émetteurs : dans onze mois, la facture qu'ils
 * déposent EST un Factur-X.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ SEPT REFUS, ET AUCUN REPLI SILENCIEUX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un Factur-X ABSENT laisse le modèle prendre le relais — c'est une donnée
 * absente, et le repli est légitime. Un Factur-X PRÉSENT mais fautif se refuse
 * en le NOMMANT : retomber discrètement sur le modèle ferait relire par une
 * approximation un document dont on vient de constater qu'il dit autre chose
 * que ce qu'on attend.
 *
 * Le refus le plus important est le premier. Le code type `381` est un AVOIR :
 * importé comme une créance, il réclamerait de l'argent à un client à qui on en
 * DOIT. C'est le seul piège de ce fichier qui produise une réclamation à
 * l'envers.
 */

/** Le seul code type qui désigne une facture commerciale à réclamer. */
const FACTURE_COMMERCIALE = '380';

/**
 * Ce que les autres codes désignent, pour pouvoir le dire au gérant.
 *
 * ⚠️ UN CODE INCONNU SE REFUSE AUSSI, en citant son numéro. La liste UNTDID
 * 1001 en compte des dizaines ; deviner qu'un code non répertorié vaut une
 * facture reviendrait à présumer favorablement, et le doute ne profite jamais
 * au produit.
 */
const CODES_CONNUS: Readonly<Record<string, string>> = {
	'381': 'un avoir',
	'384': 'une facture rectificative',
	'386': 'une facture d’acompte',
	'389': 'une autofacturation',
	'875': 'une facture de situation (bâtiment)',
	'876': 'une facture de situation (bâtiment)',
	'877': 'une facture de situation (bâtiment)'
};

/** Le format de date CII qui désigne un JOUR. Les autres désignent un mois ou une semaine. */
const FORMAT_JOUR = '102';

/** La devise du décompte : les intérêts et l'indemnité de 40 € sont en euros. */
const DEVISE_ATTENDUE = 'EUR';

function refus(nomFichier: string, raison: string): ResultatImport {
	return {
		format: 'FACTUR_X',
		factures: [],
		reglements: [],
		ignorees: [{ texte: nomFichier, raison }],
		horsPerimetre: 0
	};
}

/**
 * `"20260715"` → `"2026-07-15"`, ou un refus qui dit ce qui cloche.
 *
 * ⚠️ LE FORMAT SE VÉRIFIE AVANT LE CONTENU. CII admet `610` (un mois) et `616`
 * (une semaine) : lire huit caractères sans regarder l'attribut ferait prendre
 * « 202607 » pour le 15 juillet, sur une échéance qui commande la prescription.
 *
 * ⚠️ ET L'EXISTENCE AU CALENDRIER SE VÉRIFIE ENSUITE. `20260230` respecte le
 * format et n'existe pas ; sous Bun, `Date.parse` ne lève pas dessus — il roule
 * sur le 2 mars.
 */
function jourDepuisCII(
	valeur: string | undefined,
	format: string | undefined,
	quoi: string
): { readonly ok: true; readonly jour: string | undefined } | { readonly ok: false; readonly raison: string } {
	if (valeur === undefined) return { ok: true, jour: undefined };

	if (format !== undefined && format !== FORMAT_JOUR) {
		return {
			ok: false,
			raison: `${quoi} est écrite au format CII ${format}, qui ne désigne pas un jour mais une période. Ce document ne peut pas être importé sans supposer une date que son émetteur n’a pas écrite.`
		};
	}

	const chiffres = valeur.trim();
	if (!/^\d{8}$/.test(chiffres)) {
		return {
			ok: false,
			raison: `${quoi} est écrite « ${valeur} », qui n’est pas une date de huit chiffres.`
		};
	}

	const jour = `${chiffres.slice(0, 4)}-${chiffres.slice(4, 6)}-${chiffres.slice(6)}`;
	if (!estDateReelle(jour)) {
		return {
			ok: false,
			raison: `${quoi} est écrite « ${valeur} », et ce jour n’existe pas au calendrier.`
		};
	}
	return { ok: true, jour };
}

/**
 * Un montant CII devient des centimes entiers — ou un refus.
 *
 * ⚠️ LES DÉCIMALES NULLES SE TOLÈRENT, LA TROISIÈME SIGNIFICATIVE NON.
 * `19172.2400` vaut `19172.24` et se coupe sans rien perdre. `19172.245`
 * demanderait un arrondi que personne n'a décidé, sur une somme qui sera
 * réclamée à un tiers.
 */
function centimesDepuisCII(
	valeur: string,
	quoi: string
): { readonly ok: true; readonly montant: Montant } | { readonly ok: false; readonly raison: string } {
	const brut = valeur.trim();
	const trouve = /^(-?\d+)(?:[.,](\d*))?$/.exec(brut);
	if (trouve === null) {
		return { ok: false, raison: `${quoi} est écrit « ${valeur} », qui n’est pas un montant.` };
	}

	const decimales = trouve[2] ?? '';
	if (decimales.length > 2 && /[1-9]/.test(decimales.slice(2))) {
		return {
			ok: false,
			raison: `${quoi} est écrit « ${valeur} », avec plus de deux décimales significatives. Le convertir demanderait un arrondi que personne n’a décidé.`
		};
	}

	try {
		return { ok: true, montant: depuisEuros(`${trouve[1]}.${decimales.slice(0, 2)}`) };
	} catch {
		return { ok: false, raison: `${quoi} est écrit « ${valeur} », qui n’est pas un montant.` };
	}
}

export function resultatDepuisFacturX(
	champs: ChampsFacturX,
	nomFichier: string,
	sirenDuCreancier: string | undefined
): ResultatImport {
	/* ── 1. L'avoir, et ses cousins ──────────────────────────────────────────
	   Le refus qui compte le plus : un avoir importé réclamerait de l'argent à
	   un client à qui on en doit. */
	const typeCode = champs.typeCode?.trim();
	if (typeCode !== undefined && typeCode !== FACTURE_COMMERCIALE) {
		const quoi = CODES_CONNUS[typeCode];
		return refus(
			nomFichier,
			quoi === undefined
				? `Ce document porte le code type ${typeCode}, qui ne désigne pas une facture commerciale (380).`
				: `Ce document est ${quoi} (code type ${typeCode}), pas une facture commerciale.`
		);
	}

	/* ── 2. La devise ────────────────────────────────────────────────────────
	   Le taux d'intérêt et l'indemnité de 40 € sont en euros. Convertir ici
	   poserait un taux de change que personne n'a arrêté, sur un décompte figé. */
	const devise = champs.devise?.trim().toUpperCase();
	if (devise !== undefined && devise !== DEVISE_ATTENDUE) {
		return refus(
			nomFichier,
			`Cette facture est libellée en ${devise}. Le décompte ne se calcule qu’en euros, et rien n’est converti.`
		);
	}

	/* ── 3. Les dates : le format, puis l'existence ──────────────────────── */
	const emission = jourDepuisCII(champs.dateEmission, champs.formatDateEmission, 'La date d’émission');
	if (!emission.ok) return refus(nomFichier, emission.raison);
	if (emission.jour === undefined) {
		return refus(
			nomFichier,
			'Ce document ne porte pas de date d’émission. C’est elle qui fait courir les intérêts et la prescription.'
		);
	}

	const echeance = jourDepuisCII(champs.dateEcheance, champs.formatDateEcheance, 'La date d’échéance');
	if (!echeance.ok) return refus(nomFichier, echeance.raison);

	/* ── 4. Le débiteur ─────────────────────────────────────────────────────
	   Sans nom, il n'y a pas de dossier : une créance se rattache à quelqu'un. */
	const debiteur = champs.acheteurNom?.trim() ?? '';
	if (debiteur === '') {
		return refus(
			nomFichier,
			'Ce document ne nomme pas son client. Une créance se rattache à un débiteur, jamais à un numéro seul.'
		);
	}

	const reference = champs.numero?.trim() ?? '';
	if (reference === '') {
		return refus(nomFichier, 'Ce document ne porte pas de numéro de facture.');
	}

	/* ── 5. Le montant réclamable ───────────────────────────────────────────
	   `DuePayableAmount` vaut le total moins les acomptes déjà versés. Prendre
	   le total quand un acompte existe, c'est SUR-réclamer. */
	const ecrit = champs.netAPayer ?? champs.totalTTC;
	if (ecrit === undefined) {
		return refus(nomFichier, 'Ce document ne porte aucun montant à payer.');
	}
	const montant = centimesDepuisCII(ecrit, 'Le montant à payer');
	if (!montant.ok) return refus(nomFichier, montant.raison);

	/* ── 6. Le vendeur est-il bien le créancier ? ────────────────────────────
	   Une facture d'ACHAT déposée par erreur. Le chemin modèle traite déjà ce
	   piège en devinant ; le XML permet de le trancher. */
	const remarques: LigneIgnoree[] = [];
	const vendeur = sirenLu(champs.vendeurIdLegal ?? null);
	if (sirenDuCreancier === undefined) {
		if (vendeur !== undefined) {
			// ⚠️ ON LAISSE PASSER, ET ON LE DIT. Refuser ici bloquerait tout dépôt
			// tant que l'identité du créancier n'est pas renseignée ; se taire
			// laisserait croire que la vérification a eu lieu.
			remarques.push({
				texte: nomFichier,
				raison:
					'Votre SIREN n’est pas encore enregistré : le logiciel n’a pas pu vérifier que cette facture est bien une facture que vous avez émise.'
			});
		}
	} else if (vendeur !== undefined && vendeur !== sirenDuCreancier) {
		return refus(
			nomFichier,
			`Cette facture a été émise par le SIREN ${vendeur}, qui n’est pas le vôtre (${sirenDuCreancier}). C’est une facture que vous avez reçue, pas une créance sur un client.`
		);
	}

	/* ── 7. L'acompte : ce n'est pas un refus, c'est une explication ─────────
	   `TotalPrepaidAmount` n'a PAS de date, et `ReglementImporte` en exige une.
	   Fabriquer la date d'émission comme date d'acompte inventerait un
	   encaissement, sur un chemin qui sert à réclamer de l'argent. */
	if (champs.acompte !== undefined && champs.netAPayer !== undefined) {
		const acompte = centimesDepuisCII(champs.acompte, 'L’acompte');
		if (acompte.ok && enCentimes(acompte.montant) !== 0n) {
			remarques.push({
				texte: nomFichier,
				raison: `Un acompte est indiqué sur cette facture : c’est le net à payer qui a été retenu, pas le total. L’acompte n’entre pas comme règlement, faute de date dans le fichier.`
			});
		}
	}

	const facture: FactureImportee = {
		reference,
		debiteur,
		montantTTC: montant.montant,
		dateEmission: emission.jour,
		...(echeance.jour === undefined ? {} : { dateEcheance: echeance.jour }),
		...(() => {
			const siren = sirenLu(champs.acheteurIdLegal ?? null);
			return siren === undefined ? {} : { debiteurSiren: siren };
		})()
	};

	return {
		format: 'FACTUR_X',
		factures: [facture],
		// Une facture ne porte pas les encaissements. En inventer solderait des
		// créances que personne n'a payées.
		reglements: [],
		ignorees: remarques,
		// La notion vient du FEC, où des lignes de TVA et de trésorerie se mêlent
		// aux ventes. Un document unique n'a rien à écarter.
		horsPerimetre: 0
	};
}
