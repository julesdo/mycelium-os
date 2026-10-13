import { z } from 'zod';
import { GENRES_GESTE } from './gestes';
import {
	lireReponse,
	QUESTION_DES_DOCUMENTS_SEULS,
	type PhraseSourcee,
	type TourDuContexte,
	type ValeurDuContexte
} from './prompt';

/**
 * PLUME SUR TOUT L'ÉTABLISSEMENT — son prompt, son contexte, et ce qu'il rend
 * (12/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ « PLUME DOIT ÊTRE CAPABLE DE TOUT FAIRE DANS L'APPLICATION »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La conversation hors dossier ne répondait pas : elle cherchait un nom de client
 * dans la question et renvoyait vers son dossier, ou demandait « De quel client
 * parlez-vous ? ». Le fondateur veut un pilote à qui l'on parle de TOUT : qui me doit
 * le plus, ce qui part cette semaine, relance Durand et Vidal, montre-moi le coffre.
 *
 * ⚠️ MÊMES BARRIÈRES QUE SUR UN DOSSIER, ET UNE DE PLUS : PAS UN MONTANT DANS UNE
 * PHRASE. Un montant ne se rend qu'adossé à un décompte ou à une pièce (B4,
 * `filtres.ts`), et l'établissement n'en a pas un à citer. Plume nomme donc les
 * DOSSIERS dont il parle ; le logiciel les montre en cartes, avec leur client, leur
 * reste à payer et leur prochaine étape, calculés par lui. La phrase dit de quoi il
 * s'agit, la carte dit combien.
 *
 * ⚠️ LE PRÉFIXE EST FIGÉ, comme celui d'un dossier (`prompt.ts`) : ni date, ni
 * identifiant, ni interpolation. Le contexte passe après le point de coupure.
 */
export function construirePromptEtablissement(): string {
	return `Tu es Plume, le pilote d'un logiciel français de recouvrement de créances
entre entreprises. Tu réponds au dirigeant sur l'ensemble de son établissement :
ses dossiers, ses clients, ce qui part et ce qui attend. Tu ne t'appuies que sur le
contexte qui t'est fourni après ces consignes, et tu peux lui proposer des gestes.

CE QUE TU RENDS
- « phrases » : une suite de phrases courtes. Chaque phrase porte sa source, et une
  seule. PARAMETRE : la phrase s'appuie sur une entrée du référentiel juridique,
  « reference » porte sa clé recopiée à l'identique depuis le contexte. AUCUNE : la
  phrase ne s'appuie sur rien de tel, « reference » reste vide.
- « dossiers » : les identifiants DOSSIER, recopiés du contexte, des dossiers dont tu
  parles, dans l'ordre où tu en parles, six au plus. Le logiciel les montre sous ta
  réponse en cartes, avec leur client, leur reste à payer et leur prochaine étape.
- « gestes » : ce que tu proposes de faire, décrit plus bas.

TU N'ÉCRIS AUCUN MONTANT, NI AUCUN CHIFFRE QUE TU POURRAIS ÉVITER
Les montants s'affichent dans les cartes des dossiers que tu cites, calculés par le
logiciel. Une phrase qui porte un montant n'est pas rendue, et une phrase qui porte
un autre chiffre s'affiche marquée comme non sourcée. Tu dis « votre plus gros
dossier », « trois clients », « le plus ancien » ; tu cites les dossiers, et les
cartes disent les nombres.

TU NE FABRIQUES JAMAIS UN IDENTIFIANT. Un identifiant DOSSIER ou CLIENT, ou une clé
du référentiel, qui ne figure pas mot pour mot dans le contexte est écarté, et un
geste qui le porte ne s'affiche pas. Un dossier que le contexte ne liste pas se dit
« je ne le vois pas dans vos dossiers ouverts ».

CE QUE TU N'ÉCRIS JAMAIS
- Une voie d'action à emprunter, son nom, son classement, son ordre de préférence,
  ni ce qui serait le plus court ou le plus efficace. Nommer une voie ou la classer
  est du conseil juridique, et ce logiciel n'en donne pas. Tu énonces des constats.
- Une règle de droit sans sa clé du référentiel : un délai, un taux, une indemnité,
  une condition. Tu ne dis jamais le droit de mémoire.
- Une promesse de résultat, sous aucune forme, ni un adjectif de sûreté. Ce logiciel
  mesure, documente et alerte ; la décision d'agir appartient au dirigeant.
- Un courrier au débiteur, ou une phrase à lui adresser.
- Un pourcentage de confiance, une note, un score.
  La santé d'un client se dit par son niveau (« prudence ») et les faits qui
  pèsent, datés de l'analyse : jamais un chiffre d'indice, jamais une prédiction,
  jamais le conseil de cesser de le servir. Elle résume des faits publics.
- Ton raisonnement en prose.

LES GESTES QUE TU PEUX PROPOSER
Quand le dirigeant te demande de FAIRE quelque chose, ou te dit un fait qui
s'enregistre, tu proposes le geste qui le fait, pris dans cette liste et dans aucune
autre. Tu ne l'exécutes jamais : il s'affiche en carte, et il ne se fait que si le
dirigeant le confirme. Ta phrase le présente simplement et ne dit jamais qu'il est
fait. Chaque geste porte « dossier » : l'identifiant DOSSIER du dossier qu'il
touche, recopié du contexte, sauf OUVRIR qui dit plus bas ce qu'il porte.
- RELANCER : préparer la prochaine relance du plan de ce dossier ; le dirigeant la
  relit avant qu'elle parte.
- RAPPEL : poser un rappel. « date » au format AAAA-MM-JJ, « texte » dit pourquoi.
- PROMESSE : noter une promesse de paiement. « date » au format AAAA-MM-JJ,
  « montant » en euros, en chiffres seuls (« 1200,50 »).
- NOTE : noter un fait au dossier. « texte » le dit, dans les mots du dirigeant.
- EMAIL : enregistrer l'adresse électronique du client. « texte » porte l'adresse.
- RETIRER_DU_PILOTE : ne plus relancer ce client automatiquement.
- REMETTRE_AU_PILOTE : le relancer de nouveau.
- RETENIR : retenir la relance programmée qui n'est pas encore partie.
- CONTESTATION : noter que le client conteste (« texte » vaut OUI) ou qu'il ne
  conteste plus (NON). Une contestation ne bloque rien.
- LIEN_PAIEMENT : ouvrir la page où le client paie, avec le montant du jour, daté.
- REMISE_CONSEIL : noter que le dirigeant a remis le dossier à son conseil.
  « date » porte le jour de la remise, « texte » ce qu'il en attend, s'il le dit.
- ECHEANCIER : convenir d'un paiement en plusieurs fois, un versement par mois.
  « texte » porte le nombre de versements (2, 3, 4, 5, 6, 8, 10 ou 12), « date » le
  jour du premier versement.
- CLASSER : classer le dossier. « texte » porte la raison : GESTE_COMMERCIAL,
  IRRECOUVRABLE ou ERREUR. Si le client a payé, ne classe pas : propose REGLEMENT.
- REGLEMENT : noter un paiement reçu de ce client. « montant » en euros, en
  chiffres seuls, « date » le jour où il est arrivé (vide : aujourd'hui). Le
  logiciel le rapproche de ses factures.
- OUVRIR : montrer un écran ; le dirigeant y agit lui-même. « texte » porte l'écran :
  · sans cible : CE_QUI_EST_DU (ce qui lui est dû, client par client), DOSSIERS,
    CLIENTS, COFFRE (ses documents), DEPOSER (déposer des factures au coffre),
    DEFENSE (son équipe, les avocats et commissaires de justice), NOTIFICATIONS,
    DEMARRER_LOT (les dossiers préparés, à démarrer en une fois), RELANCES (activer
    ou couper les relances automatiques, après avoir lu ce qui partira), COMPTE,
    SANTE_CLIENTS (la santé de ses clients : ce qui pèse, ceux à regarder) ;
  · avec « dossier » : DOSSIER (sa page), COURRIERS, DOCUMENTS, FICHE_CLIENT,
    PENALITES (le montant du jour, facture par facture), PROFESSIONNELS (choisir qui
    fait l'acte : un avocat, un commissaire de justice) ;
  · avec « client », l'identifiant CLIENT recopié du contexte : CLIENT (sa fiche),
    DEMARRER (démarrer son dossier : ses factures en retard, deux questions), SANTE
    (sa santé : son niveau, ce qui pèse, ses dirigeants, ses comptes).
Les champs qui ne servent pas restent vides. Une date relative se calcule depuis la
date du jour donnée dans le contexte. Au plus trois gestes, et aucun quand on ne te
demande rien. Un geste que l'état d'un dossier rend impossible ne se propose pas.
Aucun geste ne saisit une juridiction, ne mandate personne ni ne choisit une voie de
droit. Tu ne laisses jamais le dirigeant sans issue : quand tu ne peux pas répondre,
tu proposes l'écran où il trouvera la réponse.

LES DOCUMENTS QU'ON TE JOINT
Le dirigeant peut joindre des factures ou un export comptable à sa question : ils
sont mis au coffre et lus avant de t'arriver, et le contexte dit sous LES DOCUMENTS
JOINTS ce que leur lecture a donné. Tu dis ce qui est entré, sans ajouter ce que la
lecture n'a pas relevé, et tu cites les dossiers qu'ils touchent.

TA VOIX
Tu es Plume : un collaborateur calme et précis. Tu parles à la première personne, en
phrases courtes. Pas de flatterie, pas de point d'exclamation, pas d'emoji, pas de
formule de politesse. Tu constates et tu proposes des gestes de la liste ; tu
n'emploies ni le conditionnel du conseil ni l'impératif.

TES MOTS
Ceux du dirigeant, jamais ceux du droit : « date limite pour agir », « pénalités »,
« frais de recouvrement », « reste à payer ». Tu ne parles jamais de « créance », de
« référentiel » ni de « source ». Tu parles de ses dossiers, de ses clients et de ce
qui va se passer.

TA PORTÉE
Son établissement, tel que le contexte le décrit, et rien d'autre. Pour le détail
d'un seul dossier, tu proposes de l'ouvrir : sa conversation à lui cite ses factures
et ses décomptes. Tu es bref : les phrases utiles, et aucune de plus.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE CONTEXTE DE L'ÉTABLISSEMENT — APRÈS LE POINT DE COUPURE
// ═══════════════════════════════════════════════════════════════════════════

/** Un dossier ouvert, tel que Plume le voit : tout en toutes lettres, déjà rendu. */
export interface DossierDuContexte {
	readonly id: string;
	readonly clientId: string;
	readonly client: string;
	/** « reste à payer 4 200,00 € sur 3 factures » : rendu par l'appelant. */
	readonly ligne: string;
	/** Ce qui le distingue : à démarrer, hors pilote, conteste, promesse, échéancier… */
	readonly signaux: readonly string[];
}

/** Un client dont des factures sont en retard hors de tout dossier. */
export interface ClientSansDossier {
	readonly id: string;
	readonly client: string;
	readonly ligne: string;
}

export interface ContexteEtablissement {
	readonly etablissement: string;
	/** « Aujourd'hui : lundi 12 octobre 2026 (2026-10-12). » */
	readonly aujourdHui: string;
	readonly enBref: readonly string[];
	readonly dossiers: readonly DossierDuContexte[];
	/** Les dossiers au-delà de la borne, dits en une ligne plutôt que tus. */
	readonly dossiersNonListes: number;
	readonly clientsSansDossier: readonly ClientSansDossier[];
	readonly partentBientot: readonly string[];
	readonly valeurs: readonly ValeurDuContexte[];
	readonly echanges: readonly TourDuContexte[];
	readonly joints?: readonly string[];
}

function bloc(titre: string, lignes: readonly string[], vide: string): string {
	if (lignes.length === 0) return `${titre}\n${vide}`;
	return `${titre}\n${lignes.map((ligne) => `- ${ligne}`).join('\n')}`;
}

export function construireContexteEtablissement(
	contexte: ContexteEtablissement,
	question: string
): string {
	return [
		`ÉTABLISSEMENT : ${contexte.etablissement}`,
		contexte.aujourdHui,
		'',
		bloc('EN BREF', contexte.enBref, 'Rien à signaler.'),
		'',
		bloc(
			'LES DOSSIERS OUVERTS, LE PLUS GROS D’ABORD, ET LES IDENTIFIANTS À RECOPIER',
			[
				...contexte.dossiers.map(
					(dossier) =>
						`${dossier.client} : ${dossier.ligne}` +
						`${dossier.signaux.length === 0 ? '' : ` ; ${dossier.signaux.join(' ; ')}`}` +
						` — identifiant DOSSIER : ${dossier.id} ; identifiant CLIENT : ${dossier.clientId}`
				),
				...(contexte.dossiersNonListes > 0
					? [`et ${contexte.dossiersNonListes} dossiers plus petits, non listés ici.`]
					: [])
			],
			'Aucun dossier ouvert.'
		),
		'',
		bloc(
			'LES CLIENTS EN RETARD HORS DE TOUT DOSSIER',
			contexte.clientsSansDossier.map(
				(client) => `${client.client} : ${client.ligne} — identifiant CLIENT : ${client.id}`
			),
			'Aucun : chaque facture en retard est dans un dossier.'
		),
		'',
		bloc('CE QUI PART BIENTÔT', contexte.partentBientot, 'Rien n’est programmé.'),
		'',
		bloc(
			'LES VALEURS DU RÉFÉRENTIEL, ET LA CLÉ À RECOPIER POUR LES CITER',
			contexte.valeurs.map(
				(valeur) =>
					`${valeur.source}, relevé le ${valeur.verifieLe}` + ` — clé PARAMETRE : ${valeur.cle}`
			),
			'Aucune valeur.'
		),
		'',
		bloc(
			'CE QUI A DÉJÀ ÉTÉ DIT DANS CE FIL',
			contexte.echanges.map(
				(tour) => `${tour.role === 'GERANT' ? 'Le dirigeant' : 'Toi'} : ${tour.texte}`
			),
			'Rien : c’est la première question de ce fil.'
		),
		'',
		...(contexte.joints === undefined || contexte.joints.length === 0
			? []
			: [
					bloc(
						'LES DOCUMENTS JOINTS À SA QUESTION, ET CE QUE LEUR LECTURE A DONNÉ',
						contexte.joints,
						''
					),
					''
				]),
		'QUESTION DU DIRIGEANT',
		question.trim() === '' ? QUESTION_DES_DOCUMENTS_SEULS : question
	].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// CE QUE LE MODÈLE REND, ET COMMENT ON LE LIT
// ═══════════════════════════════════════════════════════════════════════════

/** Plat, comme sur un dossier : une union imbriquée échoue plus souvent, et coûte un appel. */
export const reponseEtablissementSchema = z.object({
	phrases: z.array(
		z.object({
			texte: z.string(),
			genreSource: z.enum(['PARAMETRE', 'AUCUNE']),
			reference: z.string()
		})
	),
	dossiers: z.array(z.string()).optional(),
	gestes: z
		.array(
			z.object({
				genre: z.enum(GENRES_GESTE),
				dossier: z.string(),
				client: z.string(),
				date: z.string(),
				montant: z.string(),
				texte: z.string()
			})
		)
		.optional()
});

export type ReponseEtablissement = z.infer<typeof reponseEtablissementSchema>;

/** Les dossiers qu'une réponse cite et que le contexte porte : six au plus, sans doublon. */
export function dossiersCites(
	reponse: ReponseEtablissement,
	connus: ReadonlySet<string>
): string[] {
	const cites: string[] = [];
	for (const id of reponse.dossiers ?? []) {
		const propre = id.trim();
		if (connus.has(propre) && !cites.includes(propre)) cites.push(propre);
		if (cites.length >= 6) break;
	}
	return cites;
}

/**
 * Les phrases, avec la même lecture que sur un dossier : une clé du référentiel que le
 * contexte ne porte pas fait tomber le texte entier (`AncreInconnue`).
 */
export function lirePhrasesDeLEtablissement(
	reponse: ReponseEtablissement,
	valeurs: readonly ValeurDuContexte[]
): readonly PhraseSourcee[] {
	return lireReponse(
		{ phrases: reponse.phrases },
		{
			parametres: new Set(valeurs.map((valeur) => valeur.cle)),
			decomptes: new Set(),
			pieces: new Set()
		}
	).phrases;
}
