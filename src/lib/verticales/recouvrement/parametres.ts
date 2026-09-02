/**
 * Les paramètres juridiques du recouvrement — la seule source de vérité.
 *
 * RÈGLE ABSOLUE (0.1 du brief de remodelage) : aucune valeur juridique n'est
 * écrite en dur ailleurs. Ni un taux, ni un délai, ni un seuil, ni un montant.
 * Une valeur qui n'est pas ici, ou dans un module de pays référencé ici,
 * n'existe pas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEUX BOOLÉENS LÀ OÙ LE BRIEF EN PRÉVOYAIT UN — ET C'EST PLUS STRICT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le brief prévoyait un `verified` unique. Il confondait deux questions qui
 * n'ont ni la même réponse, ni le même auteur, ni la même conséquence :
 *
 *   · `verifie` — « cette valeur a-t-elle été relevée sur une source publique
 *     citable ? » Un logiciel peut y répondre, et c'est ce qui suffit à
 *     CALCULER un décompte ou à surveiller une échéance. Un chiffre affiché se
 *     corrige.
 *
 *   · `valideParAvocat` — « un juriste a-t-il contrôlé cette valeur ET son
 *     applicabilité au cas d'espèce ? » Seul un humain compétent peut y
 *     répondre, et c'est ce qu'il faut exiger avant de PRODUIRE UN ACTE. Un
 *     chiffre écrit dans une requête qui part au greffe ne se corrige pas.
 *
 * Avec un seul booléen il fallait choisir entre bloquer tout le produit et
 * tout ouvrir. Avec deux, `exiger()` laisse calculer sur du sourcé, et
 * `exigerPourActe()` garde la barrière là où l'erreur devient irréversible.
 * Aucune protection n'est perdue : elle est déplacée là où elle mord.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONSTANTES ET SÉRIES
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Deux entrées du brief se sont révélées ne PAS être des constantes :
 *
 *   · le taux de retard par défaut est réancré deux fois par an sur le taux
 *     BCE (L441-10 II) ;
 *   · la prescription varie selon le secteur, L110-4 réservant expressément
 *     les « prescriptions spéciales plus courtes ».
 *
 * Les figer en un chiffre unique aurait obligé à choisir un semestre et à
 * l'appliquer rétroactivement à tout, ou à annoncer cinq ans à un transporteur
 * qui en a un. Elles sont donc déclarées `nature: 'SERIE'` et `resoluPar`
 * nomme le module qui les porte.
 *
 * Sources relevées le 2026-09-03 sur legifrance.gouv.fr et sources publiques
 * concordantes. Relevé PAR LE LOGICIEL — aucun avocat n'a rien validé, et
 * `valideParAvocat` vaut `false` partout.
 */

/** L'unité d'un paramètre. Un délai en mois n'est pas un délai en jours. */
export type Unite = 'centimes' | 'jours' | 'mois' | 'annees' | 'sans';

/**
 * `CONSTANTE` : une valeur unique et stable. `SERIE` : une valeur qui dépend
 * de la date ou du secteur, et que seul un module de pays sait résoudre.
 */
export type NatureParametre = 'CONSTANTE' | 'SERIE';

export interface ParametreLegalBase {
	/** Le nom qui apparaît dans le message d'erreur quand il manque. */
	readonly cle: string;
	readonly nature: NatureParametre;
	readonly valeur: unknown;
	readonly unite: Unite;
	/** L'article ou le texte. Jamais deviné. */
	readonly source: string;
	/** Date ISO du relevé. */
	readonly verifieLe: string;
	/** La valeur a été relevée sur une source publique citable. */
	readonly verifie: boolean;
	/** Un juriste a contrôlé la valeur ET son applicabilité. `false` par défaut. */
	readonly valideParAvocat: boolean;
	/** Pour une `SERIE` : le module qui la résout. */
	readonly resoluPar?: string;
	readonly note: string;
}

export interface ParametreLegal<T> extends ParametreLegalBase {
	readonly valeur: T | null;
}

/** Tous les paramètres, sous leur forme inspectable. */
export function tousLesParametres(): readonly ParametreLegalBase[] {
	return Object.values(PARAMETRES);
}

const LE = '2026-09-03';

const AVOCAT_ATTENDU =
	'Relevé sur source publique par le logiciel, PAS validé par un avocat : utilisable pour ' +
	'calculer et surveiller, insuffisant pour produire un acte.';

export const PARAMETRES = {
	// ── Séries résolues par le module France ────────────────────────────────

	tauxInteretLegalDefaut: {
		cle: 'tauxInteretLegalDefaut',
		nature: 'SERIE',
		valeur: null,
		unite: 'sans',
		source: 'Article L441-10 II du code de commerce',
		verifieLe: LE,
		verifie: true,
		valideParAvocat: false,
		resoluPar: 'pays/france/taux.ts → tauxPenaliteParDefaut(date)',
		note:
			"À défaut de stipulation contractuelle, le taux est celui appliqué par la BCE à son " +
			'opération de refinancement la plus récente, MAJORÉ DE 10 POINTS. Il est réancré deux ' +
			'fois par an — au 1er janvier et au 1er juillet — donc une facture impayée depuis dix-huit ' +
			`mois traverse trois taux. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<never>,

	tauxInteretMinimalLegal: {
		cle: 'tauxInteretMinimalLegal',
		nature: 'SERIE',
		valeur: null,
		unite: 'sans',
		source: 'Article L441-10 II du code de commerce',
		verifieLe: LE,
		verifie: true,
		valideParAvocat: false,
		resoluPar: 'pays/france/taux.ts → plancherContractuel(date)',
		note:
			'Un taux contractuel « ne peut être inférieur à trois fois le taux d’intérêt légal ». Le ' +
			'taux légal est publié par arrêté semestriel en DEUX catégories ; le B2B relève de celle ' +
			`des « autres cas », systématiquement la plus basse. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<never>,

	delaiPrescriptionCommerciale: {
		cle: 'delaiPrescriptionCommerciale',
		nature: 'SERIE',
		valeur: null,
		unite: 'annees',
		source: 'Article L110-4 du code de commerce, et prescriptions spéciales plus courtes',
		verifieLe: LE,
		verifie: true,
		valideParAvocat: false,
		resoluPar: 'pays/france/prescription.ts → regimePrescription(secteur)',
		note:
			'Cinq ans en régime général entre commerçants, MAIS L110-4 réserve les prescriptions ' +
			'spéciales plus courtes et en énumère lui-même trois à un an. S’y ajoutent le transport ' +
			'de marchandises (L133-6, un an) et la fourniture à un consommateur (L218-2 du code de la ' +
			`consommation, deux ans). Secteur indéterminé : le délai le plus court est retenu. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<never>,

	// ── Constantes relevées ─────────────────────────────────────────────────

	indemniteForfaitaire: {
		cle: 'indemniteForfaitaire',
		nature: 'CONSTANTE',
		valeur: 4000n,
		unite: 'centimes',
		source:
			'Article D441-5 du code de commerce, issu du décret n° 2012-1115 du 2 octobre 2012 ' +
			'(pris pour l’application de L441-10)',
		verifieLe: LE,
		verifie: true,
		valideParAvocat: false,
		note:
			'40 € PAR FACTURE, jamais par créance. Due de plein droit dès le premier jour de retard, ' +
			'sans mise en demeure. Une indemnisation complémentaire est possible sur justificatifs ' +
			`si les frais réels la dépassent. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<bigint>,

	delaiContestationL126: {
		cle: 'delaiContestationL126',
		nature: 'CONSTANTE',
		valeur: 1,
		unite: 'mois',
		source: 'Brief de remodelage du 2026-09-02 — article source non fourni',
		verifieLe: LE,
		verifie: true,
		valideParAvocat: false,
		note:
			'Un mois à compter de la SIGNIFICATION du commandement, pas de son émission. ' +
			`L’article qui le fonde reste à renseigner. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	delaiProcesVerbalNonContestation: {
		cle: 'delaiProcesVerbalNonContestation',
		nature: 'CONSTANTE',
		valeur: 8,
		unite: 'jours',
		source: 'Brief de remodelage du 2026-09-02 — article source non fourni',
		verifieLe: LE,
		verifie: true,
		valideParAvocat: false,
		note:
			'Huit jours APRÈS L’EXPIRATION du délai d’un mois : les deux délais s’ajoutent, ils ne se ' +
			`recouvrent pas. L’article qui le fonde reste à renseigner. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	delaiSignificationInjonction: {
		cle: 'delaiSignificationInjonction',
		nature: 'CONSTANTE',
		valeur: 3,
		unite: 'mois',
		source: 'Brief de remodelage du 2026-09-02 — article source non fourni',
		verifieLe: LE,
		verifie: true,
		valideParAvocat: false,
		note:
			'Trois mois SOUS PEINE DE CADUCITÉ, pour les ordonnances rendues à compter du 1er ' +
			'septembre 2026. C’est l’échéance la plus dangereuse du produit : passée, l’ordonnance ' +
			`est perdue. L’article qui le fonde reste à renseigner. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	// ── Ce qui manque toujours ──────────────────────────────────────────────

	tarifCommissaireJusticeL126: {
		cle: 'tarifCommissaireJusticeL126',
		nature: 'CONSTANTE',
		valeur: null,
		unite: 'centimes',
		source: 'Décret d’application de la procédure L.126 — NON PUBLIÉ à ce jour',
		verifieLe: LE,
		verifie: false,
		valideParAvocat: false,
		note:
			"Le décret n'est pas publié : il n'y a rien à relever. Le module " +
			'l126-creances-commerciales se déclare indisponible tant que cette entrée est vide.'
	} satisfies ParametreLegal<bigint>,

	mentionsObligatoiresInjonction: {
		cle: 'mentionsObligatoiresInjonction',
		nature: 'CONSTANTE',
		valeur: null,
		unite: 'sans',
		source: 'Non fourni — ni par le brief, ni relevé',
		verifieLe: LE,
		verifie: false,
		valideParAvocat: false,
		note:
			'Les mentions que doit porter une requête en injonction de payer. Une requête aux ' +
			'mentions inventées est PIRE que pas de requête : elle se fait rejeter, et le délai ' +
			"continue de courir pendant qu'on la refait. Tant que cette entrée est vide, la " +
			"procédure peut évaluer une créance mais pas produire l'acte."
	} satisfies ParametreLegal<readonly string[]>
} as const;

/** Utilisable pour CALCULER : une constante sourcée, ou une série résolue par un module. */
export function estUtilisable(parametre: ParametreLegalBase): boolean {
	if (!parametre.verifie) return false;
	if (parametre.nature === 'SERIE') return parametre.resoluPar !== undefined;
	return parametre.valeur !== null;
}

/**
 * La valeur d'une constante, ou une erreur qui dit quoi faire.
 *
 * Seul accès autorisé. Lire `.valeur` directement contourne la barrière, et le
 * décompte produirait un `null` traité comme zéro quelque part en aval.
 */
export function exiger<T>(parametre: ParametreLegal<T>): T {
	if (parametre.nature === 'SERIE') {
		throw new Error(
			`« ${parametre.cle} » n'est pas une constante : sa valeur dépend de la date ou du ` +
				`secteur. Utiliser ${parametre.resoluPar ?? 'le module de pays'} plutôt que exiger().`
		);
	}
	if (parametre.valeur === null) {
		throw new Error(
			`Paramètre juridique « ${parametre.cle} » sans valeur : le calcul est impossible. ` +
				`Note : ${parametre.note}`
		);
	}
	if (!parametre.verifie) {
		throw new Error(
			`Paramètre juridique « ${parametre.cle} » non vérifié : sa valeur n'a été relevée sur ` +
				`aucune source citable. Source déclarée : ${parametre.source}`
		);
	}
	return parametre.valeur;
}

/**
 * La valeur, pour un usage IRRÉVERSIBLE : ce qui part dans un acte.
 *
 * Plus stricte qu'`exiger()` d'un cran, et c'est délibéré. Un montant affiché à
 * l'écran se corrige au prochain rafraîchissement ; le même montant écrit dans
 * une requête signifiée au débiteur ne se corrige pas — et ce qui n'y figure
 * pas est définitivement perdu.
 */
export function exigerPourActe<T>(parametre: ParametreLegal<T>): T {
	const valeur = exiger(parametre);
	if (!parametre.valideParAvocat) {
		throw new Error(
			`Paramètre juridique « ${parametre.cle} » non validé par un avocat : il ne peut pas ` +
				`figurer dans un acte. La valeur (${String(valeur)}) est relevée sur « ${parametre.source} » ` +
				`mais personne de compétent n'a contrôlé son applicabilité à ce cas.`
		);
	}
	return valeur;
}

/** Les clés inutilisables même pour calculer. */
export function parametresManquants(): string[] {
	return tousLesParametres()
		.filter((parametre) => !estUtilisable(parametre))
		.map((parametre) => parametre.cle);
}

/** Les clés utilisables pour calculer, mais qui attendent encore un avocat. */
export function parametresSansAvocat(): string[] {
	return tousLesParametres()
		.filter((parametre) => estUtilisable(parametre) && !parametre.valideParAvocat)
		.map((parametre) => parametre.cle);
}
