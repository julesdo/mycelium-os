#!/usr/bin/env bun
/**
 * INGÈRE UNE LIVRAISON DE L'ANNUAIRE NATIONAL DES AVOCATS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   CONVEX_URL=… CONVEX_ADMIN_KEY=… \
 *     bun scripts/importer-annuaire-avocats.ts <chemin.csv> <AAAA-MM-JJ>
 *
 * Le fichier se télécharge sur data.gouv.fr, jeu de données
 * « annuaire-des-avocats-de-france », publié par le Conseil national des
 * barreaux sous Licence Ouverte 2.0. Quarante-trois fichiers en téléchargement
 * direct, aucune API : d'où ce script.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA DATE DE RELEVÉ EST UN ARGUMENT, JAMAIS LA DATE DU JOUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fichier porte sa date dans son nom — `annuaire-avocats-20260717.csv` — et
 * peut avoir deux mois quand on l'ingère. Dater l'INGESTION ferait annoncer à
 * l'écran une fraîcheur qui n'existe pas. C'est le défaut que ce répertoire
 * doit éviter avant tous les autres : pas une donnée absente, une donnée fausse
 * qu'on laisse croire vraie.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ON NE DEVINE PAS LES NOMS DE COLONNES, ET ON A REGARDÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La fiche du jeu de données annonce quatorze champs. Le fichier du 17 juillet
 * 2026 en porte TRENTE, et celui du 11 octobre 2022 en porte treize — sous
 * d'autres noms. Le barreau s'y appelle `NomBarreau` en 2022 et `Barreau` en
 * 2026, à côté d'un `BarreauId` qui n'existait pas.
 *
 * Recopier les noms de la fiche aurait donc ingéré soixante-dix mille avocats
 * sans barreau, sans qu'aucun test ne tombe et sans qu'un écran ne s'en plaigne
 * — il aurait affiché des avocats, simplement sans ressort.
 *
 * D'où les deux règles de ce fichier :
 *
 *   1. les graphies acceptées sont celles qu'on a LUES dans de vrais fichiers,
 *      pas celles dont on se souvient ;
 *   2. une colonne absente FAIT LEVER, en la nommant, avec la liste des
 *      en-têtes réellement trouvés. Une colonne manquante silencieusement
 *      remplacée par du vide est un mensonge ; une exception est une journée
 *      perdue, ce qui est moins cher.
 */

import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import { decoderTexte } from '../src/lib/socle/documents/csv.ts';
import { estDateReelle } from '../src/lib/verticales/recouvrement/calendrier.ts';
import {
	lireLivraison,
	type FicheAvocat
} from '../src/lib/verticales/recouvrement/annuaire-avocats.ts';

/**
 * Le nombre de fiches par appel de mutation.
 *
 * Une transaction Convex est bornée : soixante-dix mille fiches n'y tiennent
 * pas. Cinq cents tiennent largement, et font environ cent quarante appels.
 */
const LOT = 500;

/** La fonction qu'on appelle, telle que le déploiement la nomme. */
const MODULE = 'recouvrement/annuaires';

/*
  LA LECTURE DU FICHIER VIT DANS `verticales/recouvrement/annuaire-avocats.ts`, que
  la tâche nocturne du serveur partage avec ce script depuis le 01/10/2026 : les
  graphies de colonnes, le refus d'une colonne disparue et l'écart des rangées
  incomplètes ne s'écrivent plus qu'à un seul endroit.
*/

function echouer(...lignes: string[]): never {
	console.error('');
	for (const ligne of lignes) console.error(ligne);
	console.error('');
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Les arguments, et la connexion
// ---------------------------------------------------------------------------

const [chemin, releveeLe] = process.argv.slice(2);

if (chemin === undefined || releveeLe === undefined) {
	echouer(
		'Usage : bun scripts/importer-annuaire-avocats.ts <chemin.csv> <AAAA-MM-JJ>',
		'',
		'La date est celle du RELEVÉ — celle que porte le nom du fichier, par exemple',
		'2026-07-17 pour annuaire-avocats-20260717.csv — et jamais celle du jour.'
	);
}

// ⚠️ `Date.parse` NE LÈVE PAS SUR BUN : `2026-02-30` roule sur le 2 mars au lieu
// de rendre NaN. Le prédicat du domaine vérifie le calendrier pour de bon.
if (!estDateReelle(releveeLe)) {
	echouer(
		`Date de relevé invalide : ${JSON.stringify(releveeLe)}.`,
		'Elle doit être au format AAAA-MM-JJ et exister au calendrier.'
	);
}

/**
 * ⚠️ DEUX VARIABLES D'ENVIRONNEMENT, ET AUCUNE DÉCOUVERTE IMPLICITE. Chercher
 * la clé dans trois fichiers rendrait possible d'ingérer une livraison dans le
 * mauvais déploiement — la production, par exemple — sans l'avoir demandé. Ici
 * la cible est écrite par celui qui lance la commande, à chaque fois.
 */
const urlBrute = process.env.CONVEX_URL ?? process.env.CONVEX_SELF_HOSTED_URL;
const cleBrute = process.env.CONVEX_ADMIN_KEY ?? process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;

if (urlBrute === undefined || cleBrute === undefined) {
	echouer(
		'Déploiement inconnu. Ce script attend deux variables d’environnement :',
		'',
		'  CONVEX_URL        l’URL du déploiement (ou CONVEX_SELF_HOSTED_URL)',
		'  CONVEX_ADMIN_KEY  sa clé d’administration (ou CONVEX_SELF_HOSTED_ADMIN_KEY)',
		'',
		'La clé d’administration est nécessaire parce que l’ingestion passe par des',
		'fonctions INTERNES : aucune session d’utilisateur ne peut les atteindre.'
	);
}

/*
  Recopiées dans des constantes déjà narrées, et déclarées AVANT `appeler` :
  `echouer` rend `never`, donc le compilateur sait qu'on ne passe pas ici sans
  les deux valeurs. Les laisser optionnelles obligerait à les revérifier dans
  chaque appel, c'est-à-dire à écrire un repli pour un cas impossible.
*/
const deploiement = urlBrute;
const cleAdmin = cleBrute;

/**
 * APPELLE UNE FONCTION INTERNE DU DÉPLOIEMENT, PAR SON API HTTP.
 *
 * ⚠️ PAS `bunx convex run`, ET C'EST MESURÉ. Le lot de cinq cents fiches pèse
 * une centaine de milliers de caractères en JSON ; sous Windows, une ligne de
 * commande plafonne à 32 767 et `spawn` rend `ENAMETOOLONG` — vérifié sur cette
 * machine. Le corps d'une requête HTTP, lui, n'a pas cette limite.
 *
 * La forme du message est recopiée de `ConvexHttpClient.mutationInner`, dans le
 * paquet `convex` installé : même chemin, même `format`, même en-tête
 * d'autorisation. C'est ce client qui ne peut pas servir ici — il garde sa clé
 * d'administration privée, et une fonction interne n'est joignable qu'avec elle.
 */
async function appeler(fonction: string, args: unknown): Promise<unknown> {
	const reponse = await fetch(`${deploiement}/api/mutation`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Convex ${cleAdmin}`
		},
		body: JSON.stringify({
			path: `${MODULE}:${fonction}`,
			format: 'convex_encoded_json',
			args: [args]
		})
	});

	if (!reponse.ok) {
		echouer(`Le déploiement a répondu ${reponse.status} sur ${fonction} :`, await reponse.text());
	}

	const charge = (await reponse.json()) as {
		status?: string;
		value?: unknown;
		errorMessage?: string;
	};

	// ⚠️ UN ÉCHEC DE FONCTION REVIENT EN 200. Le lire comme un succès ferait
	// annoncer « 70 000 fiches ingérées » sur une base vide.
	if (charge.status !== 'success') {
		echouer(`${fonction} a échoué :`, charge.errorMessage ?? JSON.stringify(charge));
	}

	return charge.value;
}

// ---------------------------------------------------------------------------
// La lecture du fichier
// ---------------------------------------------------------------------------

/*
  `decoderTexte` vient du socle, et il fait exactement ce qu'il faut ici : UTF-8
  strict d'abord — la livraison de 2026 en est, BOM compris — puis repli sur
  windows-1252, qui est l'encodage de celle de 2022. Il ne rend JAMAIS de
  caractères de remplacement en silence : « Carré » deviendrait « Carr� » dans
  soixante-dix mille adresses, et rien ne le signalerait.
*/
const contenu = decoderTexte(readFileSync(chemin));

const rangees = Papa.parse<string[]>(contenu, {
	delimiter: ';',
	header: false,
	skipEmptyLines: true
}).data;

let lecture: { fiches: FicheAvocat[]; ecartees: number };
try {
	lecture = lireLivraison(rangees);
} catch (erreur) {
	echouer(
		erreur instanceof Error ? erreur.message : String(erreur),
		'',
		'⚠️ NE CONTOURNEZ PAS CE REFUS. Ingérer sans la colonne, ou remplacer une livraison',
		'complète par rien, serait pire qu’un annuaire ancien.'
	);
}
const { fiches, ecartees } = lecture;

console.log(`${fiches.length} fiches lues dans ${chemin} (${ecartees} rangées écartées).`);
console.log(`Date de relevé déclarée : ${releveeLe}.`);

// ---------------------------------------------------------------------------
// Le remplacement
// ---------------------------------------------------------------------------

/*
  ═══════════════════════════════════════════════════════════════════════════
  ⚠️ LE VIDAGE PRÉCÈDE L'INSERTION, ET CE SCRIPT N'EST PAS TRANSACTIONNEL
  ═══════════════════════════════════════════════════════════════════════════

  Entre les deux, l'annuaire est VIDE. C'est acceptable, et c'est un arbitrage
  plutôt qu'une limite : un annuaire vide ne ment pas — l'écran affiche zéro
  avocat et sa phrase de source — alors qu'un annuaire à moitié remplacé ferait
  coexister deux relevés sous une seule date, c'est-à-dire deux fiches pour
  l'avocat qui a déménagé et une fiche vivante pour celui qui a quitté le
  barreau. Une absence se voit ; un mélange, non.

  Si le script casse entre les deux, on le relance : le vidage d'une table déjà
  vide ne coûte rien, et l'insertion repart de zéro.
*/
console.log('Vidage de la livraison précédente…');
let efface = 0;
for (;;) {
	const lot = (await appeler('viderUnLot', { combien: LOT })) as number;
	if (lot === 0) break;
	efface += lot;
	process.stdout.write(`\r  ${efface} fiches effacées`);
}
console.log(`\r  ${efface} fiches effacées.`);

console.log('Insertion de la nouvelle livraison…');
let insere = 0;
for (let debut = 0; debut < fiches.length; debut += LOT) {
	await appeler('insererUnLot', { releveeLe, fiches: fiches.slice(debut, debut + LOT) });
	insere += Math.min(LOT, fiches.length - debut);
	process.stdout.write(`\r  ${insere} / ${fiches.length} fiches insérées`);
}
console.log(`\r  ${insere} / ${fiches.length} fiches insérées.`);

console.log(`Annuaire remplacé. Relevé du ${releveeLe}.`);
