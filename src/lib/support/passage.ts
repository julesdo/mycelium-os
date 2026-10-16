/**
 * QUAND PLUME PASSE LA MAIN À L'ÉQUIPE (16/10/2026, revu après la relecture adverse).
 *
 * Des règles de CODE, pas une devinette du modèle (Intercom Fin, Zendesk AI), évaluées AVANT
 * l'appel au modèle : une demande d'humain passe ; une DEMANDE D'ACTE passe (rembourser,
 * contester un prélèvement, changer l'adresse ou le titulaire du compte, un accès perdu, un
 * compte compromis, l'exercice d'un droit sur ses données) ; Plume fermé ou son budget épuisé
 * font passer ; un deuxième « Pas vraiment » passe ; trois messages qui redisent la même chose
 * passent. Le modèle ne décide que deux choses : qu'il ne sait pas (`LACUNE`) ou qu'il a échoué
 * (`PANNE`, décidé par l'action qui l'appelle).
 *
 * ⚠️ UNE QUESTION D'INFORMATION N'EST PAS UN ACTE. « Quand serai-je prélevé ? », « Comment
 * résilier ? », « J'ai un bug au dépôt » restent chez Plume, qui lit le compte et montre l'écran
 * qui règle la question ; l'équipe reste à un toucher. La première version passait la main sur
 * le moindre « prélèvement » ou « bug » : la moitié des conversations seraient arrivées à
 * l'équipe sans que Plume ait servi.
 *
 * Deux réponses se composent sans modèle (`reponseSansModele`) : l'arrêt des envois (deux
 * cartes, tout de suite) et la question de droit (ligne rouge n° 3).
 */

export const RAISONS_DE_PASSAGE = [
	'DEMANDE',
	'ACTE',
	'REFUS',
	'INSISTANCE',
	'LACUNE',
	'PANNE',
	'PLAFOND',
	'FERME',
	'EMAIL'
] as const;
export type RaisonDePassage = (typeof RAISONS_DE_PASSAGE)[number];

export const ACTES = [
	'REMBOURSEMENT',
	'PRELEVEMENT',
	'TITULAIRE',
	'ACCES_PERDU',
	'COMPROMISSION',
	'DONNEES_PERSONNELLES'
] as const;
export type Acte = (typeof ACTES)[number];

/** Ce que lit le gérant sur la carte « Transmis », et ce que lit l'équipe dans sa file. */
export const LIBELLES_DES_RAISONS: Record<RaisonDePassage, { gerant: string; equipe: string }> = {
	DEMANDE: { gerant: 'Vous avez demandé l’équipe.', equipe: 'Demandé par le gérant' },
	ACTE: { gerant: 'C’est une demande que seule l’équipe peut traiter.', equipe: 'Demande d’acte' },
	REFUS: { gerant: 'Mes réponses ne vous ont pas aidé.', equipe: 'Deux réponses de Plume refusées' },
	INSISTANCE: { gerant: 'Je n’arrive pas à vous répondre.', equipe: 'Le gérant a redit trois fois sa question' },
	LACUNE: { gerant: 'Je ne connais pas la réponse.', equipe: 'Plume ne savait pas' },
	PANNE: { gerant: 'Je n’ai pas pu vous répondre.', equipe: 'Plume en panne' },
	PLAFOND: { gerant: 'Ce mois-ci, vos questions vont directement à l’équipe.', equipe: 'Budget de Plume atteint' },
	FERME: { gerant: 'Vos questions vont directement à l’équipe.', equipe: 'Plume support fermé' },
	EMAIL: { gerant: 'Votre message est arrivé par e-mail.', equipe: 'Reçu par e-mail' }
};

export const LIBELLES_DES_ACTES: Record<Acte, string> = {
	REMBOURSEMENT: 'Remboursement',
	PRELEVEMENT: 'Prélèvement contesté',
	TITULAIRE: 'Adresse ou titulaire du compte',
	ACCES_PERDU: 'Accès perdu',
	COMPROMISSION: 'Compte compromis',
	DONNEES_PERSONNELLES: 'Droits sur les données'
};

/** Une frontière de mot qui connaît les lettres accentuées. */
const FRONTIERE = '(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))';

/**
 * ⚠️ LE `\b` DE JAVASCRIPT NE CONNAÎT QUE L'ASCII : devant ou après un « é », il ne voit aucune
 * frontière, et « débité », « piraté », « prélevé » ne prenaient jamais. Chaque motif passe
 * donc par cette conversion, qui remplace `\b` par une frontière Unicode.
 */
function unicode(motif: RegExp): RegExp {
	return new RegExp(motif.source.split('\\b').join(FRONTIERE), 'iu');
}

function unDe(motifs: readonly RegExp[], texte: string): boolean {
	return motifs.some((motif) => motif.test(texte));
}

/**
 * Une demande écrite d'humain. « Mon conseil » est l'avocat du gérant, « un avocat » une
 * question pour la Défense, « l'équipe de mon client » celle de son client : aucune n'est une
 * demande d'humain au support.
 */
const DEMANDES: readonly RegExp[] = [
	/\b(?:parler|discuter|échanger|être mis en relation|me mettre en relation)\s+(?:à|avec)\s+(?:quelqu['’]un(?!\s+de\s+mon)|l['’]équipe(?!\s+d[eu]\s)|le support|le service client|(?:un|une)\s+(?:humain|vraie personne|personne réelle|conseill[eè]re?(?!\s+(?:juridique|fiscal|financier|bancaire))|agent|interlocut(?:eur|rice)))\b/,
	/\b(?:un|une)\s+(?:humain|vraie personne|personne réelle|conseill[eè]re?(?!\s+(?:juridique|fiscal|financier|bancaire))|interlocut(?:eur|rice))\b/,
	/\b(?:passez|mettez)[- ]moi\s+(?:en relation|en contact|(?:un|une)\s+(?:humain|conseill|personne|agent)|quelqu)/,
	/\b(?:contacter|joindre|appeler|écrire à)\s+(?:le support|le service client|l['’]équipe(?!\s+d[eu]\s)|quelqu['’]un(?!\s+de\s+mon)|un humain)\b/,
	/(?<!(?:mon|leur|son|notre)\s)\bservice client\b/
].map(unicode);

export function demandeUnHumain(texte: string): boolean {
	return unDe(DEMANDES, texte);
}

/** Les demandes d'acte, de la plus grave à la plus courante : la première qui prend l'emporte. */
const MOTIFS_DES_ACTES: readonly { readonly acte: Acte; readonly motifs: readonly RegExp[] }[] = [
	{
		acte: 'COMPROMISSION',
		motifs: [
			/\b(?:piraté|piratée|hacké|hackée)\b/,
			/\bcompte (?:a été |est |semble )?compromis\b/,
			/\bconnexions? (?:suspecte|inconnue)s?\b/,
			/\bquelqu['’]un (?:d['’]autre )?(?:s['’]est connecté|utilise mon compte|a accès à mon compte)/
		].map(unicode)
	},
	{
		acte: 'DONNEES_PERSONNELLES',
		motifs: [
			/\bdroit (?:d['’]accès|à l['’]effacement|d['’]opposition|de rectification|à la portabilité|à la limitation|à l['’]oubli)\b/,
			/\bexercer (?:mes|mon|un) droits?\b/,
			/\b(?:supprimez|supprimer|effacez|effacer|exportez|exporter|récupérer|transmettez|transmettre)(?:[- ]moi)? (?:toutes |l['’]ensemble de )?mes données\b/,
			/\bdemande (?:rgpd|d['’]accès à mes données)\b/
		].map(unicode)
	},
	{
		acte: 'ACCES_PERDU',
		motifs: [
			/\b(?:perdu|égaré|plus accès à|plus d['’]accès à|n['’]ai plus)\b.{0,40}\b(?:codes? de secours|double authentification|authentificateur|application d['’]authentification)\b/,
			/\b(?:codes? de secours|double authentification|authentificateur)\b.{0,40}\b(?:perdus?|égarés?|plus accès|ne (?:marche|fonctionne) plus|bloquée?)\b/
		].map(unicode)
	},
	{
		acte: 'TITULAIRE',
		motifs: [
			/\bchanger (?:l['’]|d['’]|mon |notre )?(?:adresse (?:e-?mail|mail|électronique)|e-?mail)(?!\s+(?:de|du|d['’])\s*(?:mon |ce |cette |la |notre )?(?:client|débiteur|société|entreprise|contact))/,
			/\b(?:changer|transférer|céder) (?:de |le )?(?:titulaire|propriétaire)\b/,
			/\btransférer (?:mon|le|notre) compte\b/
		].map(unicode)
	},
	{
		acte: 'PRELEVEMENT',
		motifs: [
			/\b(?:prélevé|prélevée|débité|débitée|facturé|facturée)s? (?:deux|2|trois|plusieurs) fois\b/,
			/\b(?:double|deux) prélèvements?\b/,
			/\bprélèvements? (?:en double|non autorisé|par erreur|à tort|injustifié)\b/,
			/\b(?:prélevé|débité|facturé)e?s? (?:à tort|par erreur|sans (?:mon )?accord)\b/,
			/\bcontest(?:e|er|ons) (?:ce|le|un|mon|cette) (?:prélèvement|débit|paiement)\b/
		].map(unicode)
	},
	{
		acte: 'REMBOURSEMENT',
		motifs: [
			/\bremboursez\b/,
			/\b(?:je (?:veux|voudrais|souhaite|souhaiterais|demande|exige)|j['’]aimerais|merci de|pouvez-vous|pourriez-vous)\b.{0,40}\brembours/,
			/\bdemande de remboursement\b/,
			/\bêtre rembours(?:é|ée|és|ées)\b/
		].map(unicode)
	}
];

export function demandeDActe(texte: string): Acte | null {
	for (const { acte, motifs } of MOTIFS_DES_ACTES) {
		if (unDe(motifs, texte)) return acte;
	}
	return null;
}

/** « Arrêtez l'envoi » : Plume répond tout de suite par « Retenir » et « Couper les relances ». */
const ARRETS: readonly RegExp[] = [
	/\b(?:arrêtez|arrêter|stoppez|stopper|stop|bloquez|bloquer|annulez|annuler|retenez|retenir|suspendez|suspendre|coupez|couper)\b.{0,30}\b(?:relances?|lettres?|courriers?|envois?)\b/,
	/\bn['’]envoyez (?:pas|rien)\b/,
	/\bne (?:faut|doit) pas\b.{0,30}\b(?:relances?|lettres?|courriers?)\b.{0,15}\bpart/,
	/\bne doit pas partir\b/
].map(unicode);

export function veutArreterLesEnvois(texte: string): boolean {
	return unDe(ARRETS, texte);
}

/**
 * UNE QUESTION DE DROIT, pour le support. Le détecteur du compagnon (`estQuestionDeDroit`) est
 * large exprès — un faux positif y montre des textes de loi — et prend « Comment puis-je activer
 * les relances ? » pour du droit. Ici un faux positif renverrait une question sur le logiciel
 * vers la Défense : une tournure faible (« puis-je ») ne compte qu'avec un thème du droit.
 */
const DROIT_FORT: readonly RegExp[] = [
	/\bai[- ]je (?:le )?droit\b/,
	/\ba[- ]t[- ](?:il|elle) le droit\b/,
	/\best[- ]ce (?:que c['’]est )?(?:légal|permis|autorisé|prescrit|trop tard)\b/,
	/\best[- ]ce que (?:j['’]ai le droit|c['’]est (?:légal|prescrit)|la (?:créance|facture) est prescrite)\b/,
	/\b(?:prescrit|prescrite)s?\s*\?/,
	/\bsuis[- ]je (?:obligé|tenu)e?\b/,
	/\bquelle procédure\b/,
	/\bque (?:dois|puis)[- ]je faire contre\b/
].map(unicode);

const TOURNURE_FAIBLE = unicode(/\b(?:puis[- ]je|dois[- ]je|peut[- ]on|faut[- ]il|je peux|on peut)\b/);

const THEMES_DU_DROIT: readonly RegExp[] = [
	/\b(?:tribunal|juge|injonction|huissier|commissaire de justice|mise en demeure|indemnité|prescri\w*|liquidation|redressement|avocat)\b/,
	/\bpénalités?\b/,
	/\bintérêts? de retard\b/,
	/\bsaisir (?:le |la )?(?:tribunal|juge|justice)\b/,
	/\bsaisie(?:-| )(?:attribution|conservatoire|sur)\b/,
	/\b(?:assigner|poursuivre|attaquer)\b/,
	/\bprocédure (?:collective|judiciaire|d['’]injonction|de recouvrement|contre)\b/,
	/\b(?:déclarer|contester) (?:ma |une |la )?créance\b/
].map(unicode);

export function questionDeDroit(texte: string): boolean {
	if (unDe(DROIT_FORT, texte)) return true;
	return TOURNURE_FAIBLE.test(texte) && unDe(THEMES_DU_DROIT, texte);
}

export type ReponseSansModele = 'ARRETER_LES_ENVOIS' | 'QUESTION_DE_DROIT';

/** Ce qui se répond par le code, sans le modèle : l'arrêt des envois d'abord, il presse. */
export function reponseSansModele(texte: string): ReponseSansModele | null {
	if (veutArreterLesEnvois(texte)) return 'ARRETER_LES_ENVOIS';
	if (questionDeDroit(texte)) return 'QUESTION_DE_DROIT';
	return null;
}

/** Les mots qui portent le sens : sans accents, sans les petits mots, à partir de trois lettres. */
function motsPleins(texte: string): Set<string> {
	const vides = new Set(['les', 'des', 'une', 'pas', 'est', 'que', 'qui', 'pour', 'mon', 'mes', 'toujours', 'pourquoi', 'avec', 'dans', 'sur', 'vous', 'nous']);
	return new Set(
		texte
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((mot) => mot.length >= 3 && !vides.has(mot))
	);
}

function similarite(a: string, b: string): number {
	const ma = motsPleins(a);
	const mb = motsPleins(b);
	if (ma.size === 0 || mb.size === 0) return 0;
	let commun = 0;
	for (const mot of ma) if (mb.has(mot)) commun += 1;
	return commun / Math.min(ma.size, mb.size);
}

/** Les trois derniers messages du gérant redisent-ils la même chose ? */
export function insiste(messagesDuGerant: readonly string[]): boolean {
	const derniers = messagesDuGerant.slice(-3);
	if (derniers.length < 3) return false;
	const [a, b, c] = derniers as [string, string, string];
	return similarite(a, b) >= 0.6 && similarite(b, c) >= 0.6;
}

export type Passage = { readonly raison: RaisonDePassage; readonly acte?: Acte };

export function decidePassage(entree: {
	readonly texte: string;
	/** Tous les messages du gérant dans la conversation, le dernier compris. */
	readonly messagesDuGerant: readonly string[];
	/** Les « Pas vraiment » consécutifs sous les réponses de Plume. */
	readonly nonsConsecutifs: number;
	readonly plafondAtteint: boolean;
	/** `PLUME_SUPPORT_OUVERT` : fermé, tout va à l'équipe. */
	readonly plumeOuvert: boolean;
}): Passage | null {
	if (demandeUnHumain(entree.texte)) return { raison: 'DEMANDE' };
	const acte = demandeDActe(entree.texte);
	if (acte !== null) return { raison: 'ACTE', acte };
	if (!entree.plumeOuvert) return { raison: 'FERME' };
	if (entree.plafondAtteint) return { raison: 'PLAFOND' };
	if (entree.nonsConsecutifs >= 2) return { raison: 'REFUS' };
	if (insiste(entree.messagesDuGerant)) return { raison: 'INSISTANCE' };
	return null;
}
