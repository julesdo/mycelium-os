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
 * Sources relevées le 2026-09-03, complétées le 2026-09-16, sur legifrance.gouv.fr,
 * insee.fr et sources publiques concordantes. Relevé PAR LE LOGICIEL — aucun
 * avocat n'a rien validé, et `valideParAvocat` vaut `false` partout.
 *
 * Le second relevé a comblé les trois entrées qui portaient « article source non
 * fourni » — elles citent désormais leur texte — et il a ajouté de quoi DÉDUIRE
 * la qualité de commerçant d'une forme juridique, au lieu de la demander à
 * quelqu'un dont le registre la connaît déjà.
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
	/**
	 * LE JOUR OÙ LA VERSION QU'ON A RELEVÉE CESSE D'ÊTRE EN VIGUEUR.
	 *
	 * ═══════════════════════════════════════════════════════════════════════
	 * ⚠️ CE N'EST PAS UNE DATE DE PÉREMPTION DE LA VALEUR
	 * ═══════════════════════════════════════════════════════════════════════
	 *
	 * C'est la date à laquelle la PAGE qu'on cite devient une version
	 * historique. La valeur qu'elle porte peut très bien être identique dans la
	 * version suivante — c'est même le cas le plus fréquent. Ce champ ne dit
	 * pas « cette valeur sera fausse », il dit « à partir de ce jour, quelqu'un
	 * doit relire ».
	 *
	 * Pourquoi ça compte : la règle la plus stricte de ce projet est qu'un
	 * numéro d'article inventé est plus dangereux qu'une source absente, parce
	 * qu'il a l'air vérifiable. Un renvoi vers une version périmée a exactement
	 * ce défaut — il s'ouvre, il s'affiche, et il ne dit plus le droit en
	 * vigueur.
	 *
	 * ⚠️ ABSENT PAR DÉFAUT, ET ÇA N'EST PAS UN OUBLI. Sur les huit sources
	 * relevées le 23/09/2026, UNE SEULE porte une date : L441-10, au
	 * 1er janvier 2027. Écrire une date sur les sept autres « par précaution »
	 * ferait lever le produit en nommant des entrées parfaitement à jour — et
	 * un garde-fou qui crie à tort finit désactivé. Chaque sceptique du relevé
	 * a nommé ce piège-là comme le plus probable.
	 *
	 * Format ISO `AAAA-MM-JJ`. La date doit avoir été LUE sur la source.
	 */
	readonly sourceValableJusqua?: string;
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

/**
 * Le second relevé. Il comble les trois entrées qui disaient « article source
 * non fourni », et il apporte ce qui manquait pour DÉDUIRE la qualité de
 * commerçant d'une forme juridique au lieu de la demander.
 */
const LE_16 = '2026-09-16';

/**
 * Le troisieme releve, mene sur Legifrance source par source avec un sceptique
 * par source. Il a pose la date de fin de validite de L441-10 et, chemin
 * faisant, trouve le regime transitoire de l'article 1411 que le produit
 * ignorait.
 */
const LE_23 = '2026-09-23';

/**
 * La relecture juridique du 25/09, source par source avec un contre-vérificateur
 * par thème. Voir `docs/superpowers/specs/2026-09-25-relecture-juridique.md`.
 * Elle a trouvé quatre erreurs dans le produit ; ces entrées sont celles qu'il
 * fallait pour les corriger.
 */
const LE_25 = '2026-09-25';

/** Le relevé de l'analyse du risque, article par article sur Légifrance. */
const LE_13_10 = '2026-10-13';

/**
 * Le relevé du barème public (19/10/2026) : la commande publique et la prescription
 * quadriennale, article par article sur Légifrance, chaque fait contre-vérifié par un
 * second lecteur. Citations exactes :
 * `docs/superpowers/recherches/2026-10-19-audit/verification-public.json` et
 * `verification-prescription.json`.
 */
const LE_19_10 = '2026-10-19';

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
		// ⚠️ LA VALEUR NE BOUGE PAS, LA PAGE SI. Le II de L441-10 est identique au mot
		// près dans la version qui entre en vigueur le 1er janvier 2027 — comparé par
		// diff machine le 23/09/2026, zéro différence. La seule modification de tout
		// l'article est un renvoi croisé DANS LE I, du 3 du I de l'article 289 du CGI
		// vers l'article L. 216-34 du code des impositions sur les biens et services :
		// un renvoi que nous ne citons pas. La date est donc posée pour faire RELIRE,
		// pas parce que le chiffre expire. Texte modificateur : ordonnance n° 2026-671
		// du 27 juillet 2026, art. 2 — et non l'ordonnance n° 2025-1247, que le premier
		// relevé désignait à tort.
		sourceValableJusqua: '2027-01-01',
		verifie: true,
		valideParAvocat: false,
		resoluPar: 'pays/france/taux.ts → tauxPenaliteParDefaut(date)',
		note:
			'À défaut de stipulation contractuelle, le taux est celui appliqué par la BCE à son ' +
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
		// ⚠️ LA VALEUR NE BOUGE PAS, LA PAGE SI. Le II de L441-10 est identique au mot
		// près dans la version qui entre en vigueur le 1er janvier 2027 — comparé par
		// diff machine le 23/09/2026, zéro différence. La seule modification de tout
		// l'article est un renvoi croisé DANS LE I, du 3 du I de l'article 289 du CGI
		// vers l'article L. 216-34 du code des impositions sur les biens et services :
		// un renvoi que nous ne citons pas. La date est donc posée pour faire RELIRE,
		// pas parce que le chiffre expire. Texte modificateur : ordonnance n° 2026-671
		// du 27 juillet 2026, art. 2 — et non l'ordonnance n° 2025-1247, que le premier
		// relevé désignait à tort.
		sourceValableJusqua: '2027-01-01',
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
		verifieLe: LE_16,
		verifie: true,
		valideParAvocat: false,
		resoluPar: 'pays/france/prescription.ts → regimePrescription(secteur)',
		note:
			'Cinq ans en régime général entre commerçants, MAIS L110-4 réserve les prescriptions ' +
			'spéciales plus courtes et en énumère lui-même trois à un an. S’y ajoutent le transport ' +
			'de marchandises (L133-6, un an) et la fourniture à un consommateur (L218-2 du code de la ' +
			`consommation, deux ans). Secteur indéterminé : le délai le plus court est retenu. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<never>,

	qualiteCommercantParLaForme: {
		cle: 'qualiteCommercantParLaForme',
		nature: 'SERIE',
		valeur: null,
		unite: 'sans',
		source:
			'Article L210-1, alinéa 2, du code de commerce ; article 1845, alinéa 2, du code civil ; ' +
			'article L311-1, dernier alinéa, du code rural et de la pêche maritime',
		verifieLe: LE_16,
		verifie: true,
		valideParAvocat: false,
		resoluPar: 'pays/france/commercialite.ts → qualiteCommercantDeLaForme(formeJuridique)',
		note:
			'Ce que la forme juridique relevée au registre permet de déduire, et ce qu’elle ne permet ' +
			'pas. ⚠️ LE PAS « SOCIÉTÉ COMMERCIALE PAR LA FORME, DONC COMMERÇANTE » N’EST ÉCRIT DANS ' +
			'AUCUN TEXTE : L210-1 vise le caractère commercial d’une SOCIÉTÉ, et l’article L721-3 du ' +
			'code de commerce tient les deux notions séparées en deux chefs de compétence distincts ' +
			'— les engagements entre commerçants au 1°, les contestations relatives aux sociétés ' +
			'commerciales au 2°. La forme suffit donc à PROPOSER une réponse et à remplir un écran, ' +
			`jamais à l’établir dans un acte. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<never>,

	// ── Constantes relevées ─────────────────────────────────────────────────

	formesCommercialesParLaForme: {
		cle: 'formesCommercialesParLaForme',
		nature: 'CONSTANTE',
		valeur: ['SNC', 'SCS', 'SARL', 'SA', 'SAS', 'SCA'],
		unite: 'sans',
		source:
			'Article L210-1, alinéa 2, du code de commerce (en vigueur depuis le 21 septembre 2000)',
		verifieLe: LE_16,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Sont commerciales à raison de leur forme et quel que soit leur objet, les sociétés en ' +
			'nom collectif, les sociétés en commandite simple, les sociétés à responsabilité limitée ' +
			'et les sociétés par actions. » LA LISTE EST CLOSE : quatre familles. « Sociétés par ' +
			'actions » couvre la SA, la SAS et la société en commandite par actions ; l’EURL et la ' +
			'SASU sont les formes unipersonnelles des mêmes types, pas des formes de plus. Tout ce ' +
			`qui n’y figure pas devra être commercial par son objet, ou ne le sera pas. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<readonly string[]>,

	caractereCivilActivitesAgricoles: {
		cle: 'caractereCivilActivitesAgricoles',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source:
			'Article L311-1, dernier alinéa, du code rural et de la pêche maritime (en vigueur ' +
			'depuis le 22 mai 2019)',
		verifieLe: LE_16,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Les activités agricoles ainsi définies ont un caractère civil. » L’exploitant personne ' +
			'physique, le GAEC, l’EARL et la SCEA sont donc civils. ⚠️ MAIS LA FORME PRIME, ET ' +
			'L’ORDRE EST LA RÈGLE : si la forme est l’une des quatre de L210-1, la commercialité par ' +
			'la forme s’applique d’abord — une exploitation constituée en SARL ou en SAS reste ' +
			'commerciale par sa forme, quel que soit son objet agricole. Le caractère civil de ' +
			`l’activité ne joue qu’ensuite. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	formeJuridiqueMuettePourPersonnePhysique: {
		cle: 'formeJuridiqueMuettePourPersonnePhysique',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source:
			'Nomenclature des catégories juridiques de l’INSEE, catégorie 1000 « Entrepreneur ' +
			'individuel » créée au 1er juillet 2018 en remplacement des catégories 1100 à 1900',
		verifieLe: LE_16,
		verifie: true,
		valideParAvocat: false,
		note:
			'Les catégories qui distinguaient « Artisan-commerçant », « Commerçant », « Artisan », ' +
			'« Profession libérale », « Exploitant agricole » et « Agent commercial » ont été gelées ' +
			'et fondues en une seule. Une entreprise individuelle immatriculée depuis cette date ' +
			'porte donc au registre une forme juridique qui NE DIT RIEN de sa commercialité : ' +
			'l’information a été retirée de la nomenclature, pas du droit. C’est un trou structurel, ' +
			'pas un défaut à corriger — l’écran doit continuer de poser la question à une personne ' +
			`physique, et dire pourquoi il la pose. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	conditionsCreanceL126: {
		cle: 'conditionsCreanceL126',
		nature: 'CONSTANTE',
		valeur: ['certaine', 'liquide', 'exigible', 'facturationEntreCommercants'],
		unite: 'sans',
		source:
			'Article L126-1 du code des procédures civiles d’exécution, créé par la loi ' +
			'n° 2026-307 du 23 avril 2026',
		verifieLe: LE_16,
		verifie: true,
		valideParAvocat: false,
		note:
			'Les quatre conditions de la procédure simplifiée du commissaire de justice, jusqu’ici ' +
			'écrites sans article : la créance doit être certaine, liquide et exigible, et avoir ' +
			'« fait l’objet d’une facturation entre commerçants ». Le chapitre qui accueille ce ' +
			'texte s’intitule « Procédure de recouvrement des créances commerciales incontestées », ' +
			'et l’article L125-1 exclut symétriquement les mêmes créances de la procédure des ' +
			'petites créances. ⚠️ LE TEXTE VISE LA FACTURATION, PAS LES PERSONNES : deux commerçants ' +
			'peuvent échanger une facture qui ne relève pas de leur commerce, et connaître ' +
			'parfaitement les deux formes juridiques ne tranche donc pas la condition à elle seule. ' +
			'Il a moins de cinq mois et n’a encore reçu aucune interprétation. C’est la raison ' +
			`précise pour laquelle un acte ne se produit pas sur ce critère. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<readonly string[]>,

	indemniteForfaitaire: {
		cle: 'indemniteForfaitaire',
		nature: 'CONSTANTE',
		valeur: 4000n,
		unite: 'centimes',
		// Relu le 25/09/2026 : la version citée jusqu'ici n'était plus celle en
		// vigueur. La valeur, elle, n'a pas bougé.
		source:
			'Article D441-5 du code de commerce, version en vigueur depuis le 27 février 2021 ' +
			'(décret n° 2021-211, art. 3)',
		verifieLe: LE_25,
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
		source: 'Article L126-2 du code des procédures civiles d’exécution',
		verifieLe: LE_16,
		verifie: true,
		valideParAvocat: false,
		note:
			'Un mois à compter de la SIGNIFICATION du commandement, pas de son émission. Le ' +
			'commandement de payer signifié par le commissaire de justice enjoint de payer dans ce ' +
			`délai, et une contestation du débiteur met fin à la procédure. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	delaiProcesVerbalNonContestation: {
		cle: 'delaiProcesVerbalNonContestation',
		nature: 'CONSTANTE',
		valeur: 8,
		unite: 'jours',
		source: 'Article L126-3 du code des procédures civiles d’exécution',
		verifieLe: LE_16,
		verifie: true,
		valideParAvocat: false,
		note:
			'Huit jours APRÈS L’EXPIRATION du délai d’un mois : les deux délais s’ajoutent, ils ne se ' +
			'recouvrent pas. Le texte le dit ainsi — le procès-verbal de non-contestation se dresse ' +
			'« au plus tôt huit jours après l’expiration du délai mentionné au premier alinéa de ' +
			`l’article L. 126-2 ». ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	delaiSignificationInjonction: {
		cle: 'delaiSignificationInjonction',
		nature: 'CONSTANTE',
		valeur: 3,
		unite: 'mois',
		source:
			'Article 1411 du code de procédure civile, modifié par le décret n° 2026-96 du ' +
			'16 février 2026',
		verifieLe: LE_16,
		verifie: true,
		valideParAvocat: false,
		note:
			'« L’ordonnance portant injonction de payer est non avenue si elle n’a pas été signifiée ' +
			'dans les trois mois de sa date » — le mot « six » a été remplacé par « trois », pour les ' +
			'ordonnances rendues à compter du 1er septembre 2026. C’est l’échéance la plus dangereuse ' +
			'du produit : passée, l’ordonnance est perdue. ⚠️ À NE PAS CONFONDRE AVEC LES SIX MOIS DE ' +
			'L’ARTICLE L126-4 du code des procédures civiles d’exécution, qui visent la signification ' +
			'du procès-verbal revêtu de la formule exécutoire : deux procédures, deux délais, deux ' +
			`articles, et le produit surveille les deux. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	/**
	 * ⚠️ LE DÉLAI D'AVANT LA RÉFORME, ET IL COURT ENCORE AUJOURD'HUI.
	 *
	 * Le décret n° 2026-96 du 16 février 2026 a remplacé « six » par « trois »
	 * à l'article 1411. Mais son article 9 porte un régime transitoire que le
	 * produit ignorait : « Les dispositions prévues aux 3° à 6° de l'article 1er
	 * du présent décret sont applicables aux ordonnances rendues à compter du
	 * 1er septembre 2026. »
	 *
	 * ⚠️ LE DÉLAI DÉPEND DONC DE LA DATE DE L'ORDONNANCE, PAS DE LA DATE DU
	 * JOUR — et les deux régimes sont vivants en même temps. Une ordonnance
	 * rendue en août 2026 a jusqu'en février 2027 ; appliquer trois mois la
	 * déclarerait caduque en novembre. Le produit aurait annoncé à un gérant
	 * que sa procédure est à reprendre depuis le début, sur une ordonnance
	 * parfaitement vivante, et c'est l'échéance qu'il dit lui-même être « la
	 * plus dangereuse du produit ».
	 *
	 * Relevé le 23/09/2026 sur Légifrance : version en vigueur du 01/03/2022 au
	 * 01/04/2026, décret n° 2022-245 du 25 février 2022.
	 */
	delaiSignificationInjonctionAncien: {
		cle: 'delaiSignificationInjonctionAncien',
		nature: 'CONSTANTE',
		valeur: 6,
		unite: 'mois',
		source:
			'Article 1411 du code de procédure civile, version en vigueur du 1er mars 2022 au ' +
			'1er avril 2026 (décret n° 2022-245 du 25 février 2022)',
		verifieLe: LE_23,
		verifie: true,
		valideParAvocat: false,
		note:
			'« L’ordonnance portant injonction de payer est non avenue si elle n’a pas été signifiée ' +
			'dans les six mois de sa date. » S’applique aux ordonnances rendues AVANT le 1er septembre ' +
			'2026, par l’article 9 du décret n° 2026-96 du 16 février 2026. Ce n’est pas une valeur ' +
			'historique : au jour du relevé, des ordonnances relevant de ce régime ont encore leur ' +
			`délai en cours. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	/**
	 * La date qui départage les deux délais. Elle est LUE dans le décret, pas
	 * choisie : l'écrire en dur dans `apres-procedure.ts` en aurait fait une
	 * valeur juridique hors de ce fichier, ce que la règle 0.1 interdit.
	 */
	basculeDelaiSignificationInjonction: {
		cle: 'basculeDelaiSignificationInjonction',
		nature: 'CONSTANTE',
		valeur: '2026-09-01',
		unite: 'sans',
		source: 'Article 9 du décret n° 2026-96 du 16 février 2026',
		verifieLe: LE_23,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Le présent décret entre en vigueur le 1er avril 2026. Les dispositions prévues aux 3° à ' +
			'6° de l’article 1er du présent décret sont applicables aux ordonnances rendues à compter ' +
			'du 1er septembre 2026. » La modification de l’article 1411 est au 3°. Une ordonnance ' +
			'rendue AVANT cette date relève des six mois ; à compter d’elle, des trois mois. ' +
			`${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<string>,

	// ── Lot 1 de la page dossier (relecture du 25 septembre 2026, § 4.2 et 4.9) ──

	pointDepartPenalitesRetard: {
		cle: 'pointDepartPenalitesRetard',
		nature: 'CONSTANTE',
		valeur: 'LENDEMAIN_ECHEANCE',
		unite: 'sans',
		source: 'Article L441-10 II du code de commerce',
		verifieLe: LE_25,
		// Même page que `tauxInteretLegalDefaut`, relue avec sa version du 1er janvier 2027.
		sourceValableJusqua: '2027-01-01',
		verifie: true,
		valideParAvocat: false,
		note:
			'« exigibles le jour suivant la date de règlement figurant sur la facture ». Le décompte ' +
			'compte les jours de l’échéance incluse à l’arrêté exclu : c’est exactement le même NOMBRE ' +
			'de jours que du lendemain de l’échéance à l’arrêté inclus, donc aucun jour n’est compté ' +
			'en trop. Les deux conventions ne diffèrent que par le taux d’un seul jour, quand ' +
			`l’échéance et l’arrêté tombent dans deux semestres différents. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<'LENDEMAIN_ECHEANCE'>,

	indemniteParFacture: {
		cle: 'indemniteParFacture',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Service-Public Entreprendre, fiche F23211 (lecture de l’administration)',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Elle s’applique à chaque facture qui n’a pas été payée dans les délais. » Une indemnité ' +
			'par facture payée en retard, une seule fois. C’est la lecture de l’administration, pas un ' +
			'texte : elle fonde le « par facture » du décompte, que l’article du montant ne dit pas. ' +
			AVOCAT_ATTENDU
	} satisfies ParametreLegal<boolean>,

	computationDelaisMois: {
		cle: 'computationDelaisMois',
		nature: 'CONSTANTE',
		valeur: 'MEME_QUANTIEME_SINON_DERNIER_JOUR',
		unite: 'sans',
		source: 'Article 641, alinéa 2, du code de procédure civile',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« A défaut d’un quantième identique, le délai expire le dernier jour du mois. » ' +
			'`ajouterMois` (calendrier.ts) l’applique : un mois à compter du 31 janvier finit le 28 ou ' +
			`le 29 février, jamais le 3 mars. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<'MEME_QUANTIEME_SINON_DERNIER_JOUR'>,

	reportDelaiJourNonOuvrable: {
		cle: 'reportDelaiJourNonOuvrable',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article 642 du code de procédure civile',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'Le délai qui expirerait un samedi, un dimanche ou un jour férié ou chômé « est prorogé ' +
			'jusqu’au premier jour ouvrable suivant ». Il vaut aussi en procédure collective (R662-1 ' +
			'du code de commerce). Ce logiciel ne l’applique qu’aux délais de procédure, sur demande ' +
			'expresse de l’appelant ; son application à la prescription n’a pas été relevée, et il ne ' +
			`la prolonge donc pas. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	joursFeriesLegaux: {
		cle: 'joursFeriesLegaux',
		nature: 'CONSTANTE',
		valeur: [
			'01-01',
			'PAQUES+1',
			'05-01',
			'05-08',
			'PAQUES+39',
			'PAQUES+50',
			'07-14',
			'08-15',
			'11-01',
			'11-11',
			'12-25'
		],
		unite: 'sans',
		source: 'Article L3133-1 du code du travail',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Les fêtes légales ci-après désignées sont des jours fériés » : le 1er janvier, le lundi ' +
			'de Pâques, le 1er mai, le 8 mai, l’Ascension, le lundi de Pentecôte, le 14 juillet, ' +
			'l’Assomption, la Toussaint, le 11 novembre et le jour de Noël. Leur effet sur l’article 642 ' +
			'du code de procédure civile : Cass. 3e civ., 21 janv. 2021 (publié). Les fêtes mobiles sont ' +
			'données par rapport au dimanche de Pâques, que `delais.ts` calcule. Les jours fériés ' +
			'locaux (Alsace-Moselle, outre-mer) ne sont pas employés : leur effet sur l’article 642 ' +
			`n’est pas jugé. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<readonly string[]>,

	// ── Lot 4 de la page dossier : les situations (relevé des exceptions, 25/09/2026) ──

	delaiOppositionInjonction: {
		cle: 'delaiOppositionInjonction',
		nature: 'CONSTANTE',
		valeur: 1,
		unite: 'mois',
		source: 'Article 1416, alinéa 1, du code de procédure civile',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« L’opposition est formée dans le mois qui suit la signification de l’ordonnance. » ' +
			'Le point de départ est la signification, quelle qu’en soit la forme. Si elle n’a pas été ' +
			'faite à la personne, l’opposition reste possible un mois après le premier acte remis à ' +
			`la personne ou la première saisie (alinéa 2). ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	delaiConsignationFraisOpposition: {
		cle: 'delaiConsignationFraisOpposition',
		nature: 'CONSTANTE',
		valeur: 15,
		unite: 'jours',
		source: 'Article 1425, alinéa 2, du code de procédure civile',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Celui-ci invite sans délai le demandeur, par lettre recommandée avec demande d’avis de ' +
			'réception, à consigner les frais de l’opposition au greffe dans le délai de quinze jours ' +
			'à peine de caducité de la demande. » Au tribunal de commerce. Le texte ne dit pas si le ' +
			'délai part de l’envoi ou de la réception de la lettre du greffe : le logiciel le calcule ' +
			`depuis la date la plus précoce connue, et le dit. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	delaiConstitutionAvocatOpposition: {
		cle: 'delaiConstitutionAvocatOpposition',
		nature: 'CONSTANTE',
		valeur: 15,
		unite: 'jours',
		source: 'Article 1418 du code de procédure civile',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Le créancier doit constituer avocat dans un délai de quinze jours à compter de la ' +
			'notification. » Au tribunal judiciaire, quand la représentation par avocat est ' +
			'obligatoire. La notification est celle de la copie de l’opposition ; si l’avis de ' +
			`réception revient non signé, elle est datée du jour de présentation. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	seuilDispenseAvocatTribunalCommerce: {
		cle: 'seuilDispenseAvocatTribunalCommerce',
		nature: 'CONSTANTE',
		valeur: 1_000_000n,
		unite: 'centimes',
		source: 'Article 853 du code de procédure civile',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Les parties sont dispensées de l’obligation de constituer avocat dans les cas prévus ' +
			'par la loi ou le règlement, lorsque la demande porte sur un montant inférieur ou égal à ' +
			'10 000 euros » — au tribunal de commerce. Au-delà, un avocat représente l’entreprise, ' +
			`sauf les autres cas de l’article. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<bigint>,

	seuilDispenseAvocatTribunalJudiciaire: {
		cle: 'seuilDispenseAvocatTribunalJudiciaire',
		nature: 'CONSTANTE',
		valeur: 1_000_000n,
		unite: 'centimes',
		source: 'Article 761 du code de procédure civile',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« A l’exclusion des matières relevant de la compétence exclusive du tribunal judiciaire, ' +
			'lorsque la demande porte sur un montant inférieur ou égal à 10 000 euros » — les parties ' +
			`sont dispensées de constituer avocat. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<bigint>,

	delaiDeclarationCreance: {
		cle: 'delaiDeclarationCreance',
		nature: 'CONSTANTE',
		valeur: 2,
		unite: 'mois',
		source: 'Article R622-24, alinéa 1, du code de commerce (R641-25 en liquidation)',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Le délai de déclaration fixé en application de l’article L. 622-26 est de deux mois à ' +
			'compter de la publication du jugement d’ouverture au Bulletin officiel des annonces ' +
			'civiles et commerciales. » Il part de la PARUTION de l’annonce d’ouverture, pas de la ' +
			'date du jugement. La date de l’envoi compte, pas celle de la réception (Cass. com., ' +
			`28 janv. 1997). ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	delaiReleveForclusion: {
		cle: 'delaiReleveForclusion',
		nature: 'CONSTANTE',
		valeur: 6,
		unite: 'mois',
		source: 'Article L622-26, alinéa 3, du code de commerce',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« L’action en relevé de forclusion ne peut être exercée que dans le délai de six mois. ' +
			'Ce délai court à compter de la publication du jugement d’ouverture » — le rattrapage ' +
			`après le délai de déclaration, qui se demande au juge. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	delaiAnnulationPaiementInterdit: {
		cle: 'delaiAnnulationPaiementInterdit',
		nature: 'CONSTANTE',
		valeur: 3,
		unite: 'annees',
		source: 'Article L622-7, III, du code de commerce',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Tout acte ou tout paiement passé en violation des dispositions du présent article est ' +
			'annulé […] dans un délai de trois ans à compter de la conclusion de l’acte ou du paiement ' +
			'de la créance. » Un paiement reçu après le jugement d’ouverture peut donc être repris : ' +
			`le dossier ne passe pas en « Réglé » sans le signaler. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	arretCoursInterets: {
		cle: 'arretCoursInterets',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article L622-28, alinéa 1, du code de commerce (L641-3 en liquidation)',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'Le jugement d’ouverture « arrête le cours des intérêts légaux et conventionnels, ainsi que ' +
			'de tous intérêts de retard ». Les textes ne disent pas si le jour même du jugement produit ' +
			'des intérêts : par prudence, le calcul les arrête la veille. Exception non suivie : les ' +
			`prêts et paiements différés d’un an ou plus. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	exclusionIndemnitesProcedureCollective: {
		cle: 'exclusionIndemnitesProcedureCollective',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article L441-10 II, dernière phrase, du code de commerce',
		verifieLe: LE_25,
		// Même page que `tauxInteretLegalDefaut`, relue avec sa version du 1er janvier 2027.
		sourceValableJusqua: '2027-01-01',
		verifie: true,
		valideParAvocat: false,
		note:
			'Le créancier « ne peut invoquer le bénéfice de ces indemnités lorsque l’ouverture d’une ' +
			'procédure [...] interdit le paiement à son échéance ». Lu avec R621-4 : pas de frais de ' +
			'recouvrement pour une facture dont l’échéance tombe le jour du jugement d’ouverture ou ' +
			'après. Ne vise pas les pénalités de retard. Pour une échéance antérieure, l’indemnité ' +
			`reste déclarable, sur une ligne marquée « lecture ». ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	refusPaiementPartielPossible: {
		cle: 'refusPaiementPartielPossible',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article 1342-4 du code civil',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note: `« Le créancier peut refuser un paiement partiel même si la prestation est divisible. » ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	ordreImputationPlusieursDettes: {
		cle: 'ordreImputationPlusieursDettes',
		nature: 'CONSTANTE',
		valeur: ['INDICATION_DEBITEUR', 'ECHUES', 'PLUS_INTERET_ACQUITTER', 'PLUS_ANCIENNE', 'PRORATA'],
		unite: 'sans',
		source: 'Article 1342-10 du code civil',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'Sans indication du débiteur, le paiement s’impute « d’abord sur les dettes échues ; ' +
			'parmi celles-ci, sur les dettes que le débiteur avait le plus d’intérêt d’acquitter », ' +
			'puis sur la plus ancienne, puis au prorata. Le « plus d’intérêt » n’est défini par aucun ' +
			'texte lu : le logiciel le montre comme indéterminé et propose la plus ancienne, à ' +
			'confirmer par le gérant. Dans chaque facture, l’article 1343-1 impute ensuite sur les ' +
			`pénalités d’abord. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<readonly string[]>,

	// ── Lot 5a de la page dossier : les courriers (modèles du 25/09/2026) ──

	formulationPointDepartPenalites: {
		cle: 'formulationPointDepartPenalites',
		nature: 'CONSTANTE',
		valeur: 'le jour suivant la date de règlement figurant sur la facture',
		unite: 'sans',
		source: 'Article L441-10 II du code de commerce',
		verifieLe: LE_25,
		// Même page que `tauxInteretLegalDefaut`, relue avec sa version du 1er janvier 2027.
		sourceValableJusqua: '2027-01-01',
		verifie: true,
		valideParAvocat: false,
		note:
			'Les mots du texte, recopiés tels quels dans la lettre de relance officielle : « le taux ' +
			'd’intérêt des pénalités de retard exigibles le jour suivant la date de règlement figurant ' +
			`sur la facture ». ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<string>,

	penalitesExigiblesSansRappel: {
		cle: 'penalitesExigiblesSansRappel',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article L441-10 II du code de commerce',
		verifieLe: LE_25,
		sourceValableJusqua: '2027-01-01',
		verifie: true,
		valideParAvocat: false,
		note: `« Les pénalités de retard sont exigibles sans qu’un rappel soit nécessaire. » ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	indemniteDuePleinDroit: {
		cle: 'indemniteDuePleinDroit',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article L441-10 II du code de commerce',
		verifieLe: LE_25,
		sourceValableJusqua: '2027-01-01',
		verifie: true,
		valideParAvocat: false,
		note:
			'« Tout professionnel en situation de retard de paiement est de plein droit débiteur, à ' +
			'l’égard du créancier, d’une indemnité forfaitaire pour frais de recouvrement, dont le ' +
			'montant est fixé par décret. » Le « de plein droit » vient d’ici ; le montant vient de ' +
			`D441-5 (\`indemniteForfaitaire\`). ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	indemnisationComplementaireSurJustification: {
		cle: 'indemnisationComplementaireSurJustification',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article L441-10 II du code de commerce',
		verifieLe: LE_25,
		sourceValableJusqua: '2027-01-01',
		verifie: true,
		valideParAvocat: false,
		note:
			'« Lorsque les frais de recouvrement exposés sont supérieurs au montant de cette indemnité ' +
			'forfaitaire, le créancier peut demander une indemnisation complémentaire, sur ' +
			`justification. » ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	destinataireDeclarationCreance: {
		cle: 'destinataireDeclarationCreance',
		nature: 'CONSTANTE',
		valeur: {
			SAUVEGARDE: { procedure: 'sauvegarde', libelle: 'mandataire judiciaire' },
			REDRESSEMENT: { procedure: 'redressement judiciaire', libelle: 'mandataire judiciaire' },
			LIQUIDATION: { procedure: 'liquidation judiciaire', libelle: 'liquidateur' }
		},
		unite: 'sans',
		source:
			'Articles L622-24, alinéa 1 (sauvegarde), L631-14 I, alinéa 1 (redressement) et L641-3, ' +
			'dernier alinéa (liquidation), du code de commerce',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« A partir de la publication du jugement, tous les créanciers dont la créance est née ' +
			'antérieurement au jugement d’ouverture, à l’exception des salariés, adressent la ' +
			'déclaration de leurs créances au mandataire judiciaire » ; en liquidation, « Les ' +
			`créanciers déclarent leurs créances au liquidateur ». ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<
		Readonly<
			Record<
				'SAUVEGARDE' | 'REDRESSEMENT' | 'LIQUIDATION',
				{ readonly procedure: string; readonly libelle: string }
			>
		>
	>,

	mentionCertificationSincerite: {
		cle: 'mentionCertificationSincerite',
		nature: 'CONSTANTE',
		valeur: 'certifie sincère',
		unite: 'sans',
		source: 'Article L622-25, dernier alinéa, du code de commerce',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Sauf si elle résulte d’un titre exécutoire, la créance déclarée est certifiée sincère ' +
			`par le créancier. » ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<string>,

	listeCreanciersDuDebiteur: {
		cle: 'listeCreanciersDuDebiteur',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article L622-6, alinéa 2, du code de commerce',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Le débiteur remet à l’administrateur et au mandataire judiciaire, pour les besoins de ' +
			'l’exercice de leur mandat, la liste de ses créanciers, du montant de ses dettes et des ' +
			`principaux contrats en cours. » ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	listeCreancesDeclarees: {
		cle: 'listeCreancesDeclarees',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article L624-1, alinéa 1, du code de commerce',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Dans le délai fixé par le tribunal, le mandataire judiciaire établit, après avoir ' +
			'sollicité les observations du débiteur, la liste des créances déclarées avec ses ' +
			`propositions d’admission, de rejet ou de renvoi devant la juridiction compétente. » ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	// ── Relecture du 25 septembre 2026 ──────────────────────────────────────

	imputationPaiementPartiel: {
		cle: 'imputationPaiementPartiel',
		nature: 'CONSTANTE',
		valeur: 'INTERETS_PUIS_PRINCIPAL',
		unite: 'sans',
		source: 'Article 1343-1, alinéa 1, du code civil',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Le paiement partiel s’impute d’abord sur les intérêts. » La règle cède devant le ' +
			'contrat : une clause d’imputation des conditions générales l’emporte, et elle n’est pas ' +
			'encore lue par ce logiciel. L’appliquer aux pénalités de retard est une lecture — ce ' +
			'sont des intérêts moratoires. Un AVOIR n’est pas un paiement : il réduit le prix, donc ' +
			`le principal. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<'INTERETS_PUIS_PRINCIPAL'>,

	miseEnDemeureNonInterruptive: {
		cle: 'miseEnDemeureNonInterruptive',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Cour de cassation, chambre commerciale, 18 mai 2022, n° 20-23.204 (publié)',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'Une mise en demeure, même par lettre recommandée avec avis de réception, n’interrompt ' +
			'pas la prescription : la liste des actes interruptifs est fermée (reconnaissance du ' +
			'débiteur, demande en justice, mesure conservatoire, acte d’exécution forcée — code civil, ' +
			'articles 2240, 2241 et 2244). Aucun texte du produit ne doit laisser croire le ' +
			`contraire. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	modesMiseEnDemeure: {
		cle: 'modesMiseEnDemeure',
		nature: 'CONSTANTE',
		valeur: [
			'une sommation',
			'un acte portant interpellation suffisante',
			'la seule exigibilité de l’obligation, si le contrat le prévoit'
		],
		unite: 'sans',
		source: 'Article 1344 du code civil',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'La loi ne dresse AUCUNE liste de mentions obligatoires : elle exige une « interpellation ' +
			'suffisante », que le juge du fond apprécie souverainement. C’est cette entrée, et non ' +
			'les mentions d’une requête en injonction de payer, qui commande la lettre de relance ' +
			`officielle. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<readonly string[]>,

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
	} satisfies ParametreLegal<readonly string[]>,

	professionCompetenteParActe: {
		cle: 'professionCompetenteParActe',
		nature: 'CONSTANTE',
		valeur: null,
		unite: 'sans',
		source: 'Non fourni — ni par le brief, ni relevé',
		verifieLe: LE,
		verifie: false,
		valideParAvocat: false,
		note:
			'Quelle profession est compétente pour quel acte : déposer une requête, signifier une ' +
			'ordonnance, dresser un procès-verbal. Tant que cette entrée est vide, l’écran « qui ' +
			'fait l’acte » propose les professions à égalité, sans présélection, et dit pourquoi. ' +
			'Présélectionner sur une correspondance devinée enverrait un gérant chez un ' +
			'professionnel qui ne peut pas faire l’acte, et lui ferait perdre le temps que la ' +
			'caducité compte.'
	} satisfies ParametreLegal<readonly string[]>,

	// ── L'analyse du risque (13/10/2026), relevé sur Légifrance le jour même ─

	confidentialiteDesComptes: {
		cle: 'confidentialiteDesComptes',
		nature: 'CONSTANTE',
		// Ce que l'écran dit, en clair, à côté de comptes confidentiels.
		valeur:
			'Un choix que la loi permet aux petites entreprises : il ne baisse pas l’indice, mais ses chiffres ne se lisent pas.',
		unite: 'sans',
		source: 'Article L232-25 du code de commerce',
		verifieLe: LE_13_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'Version en vigueur depuis le 24/05/2019 (loi n° 2019-486 du 22 mai 2019, art. 47). Les ' +
			'micro-entreprises peuvent déclarer que leurs comptes annuels ne seront pas rendus ' +
			'publics ; les petites entreprises, que leur compte de résultat ne le sera pas (sauf ' +
			'appartenance à un groupe). Des comptes confidentiels ne sont donc jamais un signal ' +
			`négatif dans l'analyse du risque : ils réduisent sa lisibilité. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<string>,

	capitauxPropresEntames: {
		cle: 'capitauxPropresEntames',
		nature: 'CONSTANTE',
		valeur:
			'La loi impose alors à ses associés de décider s’il y a lieu de dissoudre la société, puis de reconstituer ses capitaux propres au plus tard à la clôture du deuxième exercice suivant.',
		unite: 'sans',
		source: 'Articles L223-42 et L225-248 du code de commerce',
		verifieLe: LE_13_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'Versions en vigueur depuis le 11/03/2023 (loi n° 2023-171 du 9 mars 2023, art. 14) : ' +
			'L223-42 pour la SARL, L225-248 pour la société anonyme. « Si, du fait de pertes ' +
			'constatées dans les documents comptables, les capitaux propres de la société deviennent ' +
			'inférieurs à la moitié du capital social », les associés décident dans les quatre mois ' +
			'qui suivent l’approbation des comptes s’il y a lieu à dissolution anticipée ; sinon, la ' +
			'société reconstitue ses capitaux propres au plus tard à la clôture du deuxième exercice ' +
			`suivant. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<string>,

	donneesDeCondamnation: {
		cle: 'donneesDeCondamnation',
		nature: 'CONSTANTE',
		valeur: 'Aucune condamnation, aucune infraction, aucune sanction personnelle n’est lue.',
		unite: 'sans',
		source: 'Article 46 de la loi n° 78-17 du 6 janvier 1978',
		verifieLe: LE_13_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'Version en vigueur depuis le 01/06/2019 (ordonnance n° 2018-1125, art. 1). Les ' +
			'traitements de données relatives aux condamnations pénales, aux infractions ou aux ' +
			'mesures de sûreté connexes ne peuvent être effectués que par les personnes que l’article ' +
			'énumère. L’analyse du risque ne lit donc ni sanction, ni faillite personnelle, ni ' +
			`interdiction de gérer : les antécédents d'un dirigeant se lisent dans les sociétés qu'il a dirigées. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<string>,

	// ── Le barème public : la commande publique ─────────────────────────────
	//
	// ⚠️ CE N'EST PAS L441-10 AVEC UN AUTRE CHIFFRE. Le taux public est ANCRÉ une fois
	// pour toutes au semestre où les intérêts commencent à courir ; le taux commercial
	// est recalé chaque semestre. Réutiliser le découpage de `periodesDeTauxParDefaut`
	// donnerait un décompte faux qui a l'air juste.

	tauxInteretsMoratoiresPublics: {
		cle: 'tauxInteretsMoratoiresPublics',
		nature: 'SERIE',
		valeur: null,
		unite: 'sans',
		source: 'Article R2192-31 du code de la commande publique',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		resoluPar: 'pays/france/commande-publique.ts → tauxInteretsMoratoires(premierJourDInterets)',
		note:
			'« Le taux des intérêts moratoires mentionnés à l’article L. 2192-13 est égal au taux ' +
			'd’intérêt appliqué par la Banque centrale européenne à ses opérations principales de ' +
			'refinancement les plus récentes, en vigueur au premier jour du semestre de l’année civile ' +
			'au cours duquel les intérêts moratoires ont commencé à courir, majoré de huit points de ' +
			'pourcentage. » En vigueur depuis le 01/04/2019 (décret n° 2018-1075). UN SEUL taux pour ' +
			'toute la durée du retard, celui du semestre du premier jour d’intérêts (le lendemain de ' +
			'l’échéance, R2192-32) : un délai qui expire le 30 juin fait courir les intérêts au taux du ' +
			'second semestre. Le tableau de la DILA, classé par « fin du délai de paiement », diverge ' +
			`ce jour-là : on suit l’article. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<never>,

	pointDepartInteretsMoratoires: {
		cle: 'pointDepartInteretsMoratoires',
		nature: 'CONSTANTE',
		valeur: 'LENDEMAIN_ECHEANCE',
		unite: 'sans',
		source: 'Article R2192-32 du code de la commande publique',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Les intérêts moratoires courent à compter du lendemain de l’expiration du délai de ' +
			'paiement ou de l’échéance prévue par le marché jusqu’à la date de mise en paiement du ' +
			'principal incluse. » En vigueur depuis le 22/07/2019 (décret n° 2019-748). Le décompte ' +
			'compte de l’échéance incluse à l’arrêté exclu : le même NOMBRE de jours que du lendemain ' +
			'à la mise en paiement incluse. Une date de paiement importée est une date de crédit en ' +
			`banque, postérieure à la mise en paiement : elle ne compte jamais moins de jours. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<'LENDEMAIN_ECHEANCE'>,

	// Citation exacte de R2192-33, gardée en commentaire parce que l'article emploie un
	// mot interdit à l'écran : « Les intérêts moratoires appliqués aux acomptes ou au
	// solde sont calculés sur le montant total de l'acompte ou du solde toutes taxes
	// comprises, diminué de la retenue de garantie, et après application des clauses
	// d'actualisation, de révision et de pénalisation. »
	baseInteretsMoratoires: {
		cle: 'baseInteretsMoratoires',
		nature: 'CONSTANTE',
		valeur: 'TTC_MOINS_RETENUE',
		unite: 'sans',
		source: 'Article R2192-33 du code de la commande publique',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'La base est le montant toutes taxes comprises de l’acompte ou du solde, moins la retenue ' +
			'prévue au marché, après actualisation, révision et pénalisation. En vigueur depuis le ' +
			'01/04/2019. Le logiciel ne connaît pas la retenue d’un marché : il calcule sur le montant ' +
			'de la facture et le dit, pour que le gérant déduise la retenue s’il y en a une. ' +
			AVOCAT_ATTENDU
	} satisfies ParametreLegal<'TTC_MOINS_RETENUE'>,

	interetsMoratoiresDePleinDroit: {
		cle: 'interetsMoratoiresDePleinDroit',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Articles L2192-13 et L2192-14 du code de la commande publique',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Dès le lendemain de l’expiration du délai de paiement ou de l’échéance prévue par le ' +
			'marché, le retard de paiement fait courir, de plein droit et sans autre formalité, des ' +
			'intérêts moratoires dont le taux est fixé par voie réglementaire. » « Le retard de ' +
			'paiement donne lieu, de plein droit et sans autre formalité, au versement d’une indemnité ' +
			'forfaitaire pour frais de recouvrement. » L’indemnisation complémentaire, elle, se ' +
			'demande, sur justification. L2192-14 : « Toute renonciation au paiement des intérêts ' +
			'moratoires est réputée non écrite » (les intérêts seulement, pas l’indemnité). Le retard ' +
			'suppose un créancier « qui a rempli ses obligations légales et contractuelles » ' +
			`(L2192-12). ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	indemniteForfaitairePublique: {
		cle: 'indemniteForfaitairePublique',
		nature: 'CONSTANTE',
		valeur: 4000n,
		unite: 'centimes',
		source: 'Article D2192-35 du code de la commande publique',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Le montant de l’indemnité forfaitaire pour frais de recouvrement est fixé à 40 euros. » ' +
			'En vigueur depuis le 01/04/2019. ⚠️ LE TEXTE NE DIT PAS « PAR FACTURE » : L2192-13 la ' +
			'rattache au « retard de paiement ». Le décompte l’applique une fois par demande de ' +
			'paiement réglée en retard, comme l’indemnité commerciale (lecture `indemniteParFacture`) ; ' +
			`l’unité reste à faire valider. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<bigint>,

	delaisPaiementPublics: {
		cle: 'delaisPaiementPublics',
		nature: 'CONSTANTE',
		valeur: { POUVOIR_ADJUDICATEUR: 30, SANTE: 50, ENTREPRISE_PUBLIQUE: 60 },
		unite: 'jours',
		source: 'Articles L2192-10, R2192-10, R2192-11 et R2192-12 du code de la commande publique',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'R2192-10 : « Le délai de paiement prévu à l’article L. 2192-10 est fixé à trente jours ' +
			'pour les pouvoirs adjudicateurs, y compris lorsqu’ils agissent en tant qu’entité ' +
			'adjudicatrice. » R2192-11 : « 1° Cinquante jours pour les établissements publics de ' +
			'santé et les établissements du service de santé des armées ; 2° Soixante jours pour les ' +
			'entreprises publiques au sens du II de l’article 1er de l’ordonnance n° 2004-503 du 7 juin ' +
			'2004 […], à l’exception de celles ayant la nature d’établissements publics locaux. » Le ' +
			'délai prévu au marché ne peut pas dépasser ces plafonds (L2192-10). Il court de la ' +
			'réception de la demande de paiement (R2192-12, relu sur marche-public.fr seulement, pas ' +
			`encore sur Légifrance). Contrats conclus depuis le 16 mars 2013. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<{
		readonly POUVOIR_ADJUDICATEUR: number;
		readonly SANTE: number;
		readonly ENTREPRISE_PUBLIQUE: number;
	}>,

	paiementAccessoiresPublics: {
		cle: 'paiementAccessoiresPublics',
		nature: 'CONSTANTE',
		valeur: 45,
		unite: 'jours',
		source: 'Article R2192-36 du code de la commande publique',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Les intérêts moratoires et l’indemnité forfaitaire pour frais de recouvrement sont ' +
			'payés dans un délai de quarante-cinq jours suivant la mise en paiement du principal. » ' +
			`En vigueur depuis le 01/04/2019. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<number>,

	mandatementDOffice: {
		cle: 'mandatementDOffice',
		nature: 'CONSTANTE',
		// Des jours et un mois : chaque délai porte son unité dans son nom.
		valeur: {
			apresPaiementDuPrincipalJours: 30,
			miseEnDemeureJours: 15,
			executionMois: 1,
			mandatementJours: 10
		},
		unite: 'sans',
		source:
			'Article L1612-18 du code général des collectivités territoriales ; article L6145-5 du ' +
			'code de la santé publique',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'L1612-18 (version du 01/01/2026, ordonnance n° 2025-526) : quand les intérêts moratoires ' +
			'et l’indemnité « ne sont pas mandatées dans les trente jours suivant la date de paiement ' +
			'du principal, le représentant de l’Etat dans le département adresse à l’ordonnateur, dans ' +
			'un délai de quinze jours après signalement par le créancier, le comptable public ou tout ' +
			'autre tiers, une mise en demeure de mandatement. A défaut d’exécution dans un délai d’un ' +
			'mois à compter de cette mise en demeure, le représentant de l’Etat procède d’office, dans ' +
			'un délai de dix jours, au mandatement de la dépense. » Pour un établissement public de ' +
			'santé, le directeur de l’agence régionale de santé, dans les mêmes délais (L6145-5). ' +
			'⚠️ CES DEUX ARTICLES RENVOIENT À DES TEXTES QUI N’EXISTENT PLUS (« L. 2192-8 » du code de ' +
			'la commande publique ; articles 39 et 40 de la loi n° 2013-100) : un courrier ne recopie ' +
			'jamais leurs renvois, il cite L2192-13, R2192-31, D2192-35 et R2192-36. Le signalement ' +
			'est une démarche administrative, que le gérant décide. La chambre régionale des comptes ' +
			'(L1612-15) est une juridiction : le logiciel ne la propose jamais. ' +
			AVOCAT_ATTENDU
	} satisfies ParametreLegal<{
		readonly apresPaiementDuPrincipalJours: number;
		readonly miseEnDemeureJours: number;
		readonly executionMois: number;
		readonly mandatementJours: number;
	}>,

	// ── La prescription quadriennale (loi n° 68-1250 du 31 décembre 1968) ───

	delaiPrescriptionQuadriennale: {
		cle: 'delaiPrescriptionQuadriennale',
		nature: 'CONSTANTE',
		valeur: 4,
		unite: 'annees',
		source: 'Article 1er de la loi n° 68-1250 du 31 décembre 1968',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Sont prescrites, au profit de l’Etat, des départements et des communes, sans préjudice ' +
			'des déchéances particulières édictées par la loi, et sous réserve des dispositions de la ' +
			'présente loi, toutes créances qui n’ont pas été payées dans un délai de quatre ans à ' +
			'partir du premier jour de l’année suivant celle au cours de laquelle les droits ont été ' +
			'acquis. » Alinéa 2 : « les créances sur les établissements publics dotés d’un comptable ' +
			'public » (les hôpitaux publics, dont le comptable est un comptable de l’État, L6145-8 du ' +
			'code de la santé publique ; un EPIC selon ses statuts ; une SEM non, sauf quand elle ' +
			'contracte au nom d’une collectivité). Les régions ne sont pas nommées. Le point de départ ' +
			'est l’année où les droits sont ACQUIS, pas celle où ils naissent : pour les intérêts de ' +
			'factures payées une à une, deux arrêts inédits de la CAA de Lyon (6 février 2020, ' +
			'n° 18LY01075 et 18LY01078) retiennent l’année des prestations ; pour un marché soldé par ' +
			'décompte, le délai part plus tard (CE, 11 février 2005, n° 249211 ; CAA Versailles, ' +
			'6 juillet 2023, n° 20VE02063). Aucune décision du Conseil d’État ne tranche pour les ' +
			'intérêts moratoires : la date affichée est une LECTURE, dite comme telle. ' +
			AVOCAT_ATTENDU
	} satisfies ParametreLegal<number>,

	reclamationEcriteInterruptive: {
		cle: 'reclamationEcriteInterruptive',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article 2 de la loi n° 68-1250 du 31 décembre 1968',
		verifieLe: LE_19_10,
		verifie: true,
		valideParAvocat: false,
		note:
			'La prescription quadriennale est interrompue par « Toute demande de paiement ou toute ' +
			'réclamation écrite adressée par un créancier à l’autorité administrative, dès lors que la ' +
			'demande ou la réclamation a trait au fait générateur, à l’existence, au montant ou au ' +
			'paiement de la créance, alors même que l’administration saisie n’est pas celle qui aura ' +
			'finalement la charge du règlement », et par « Toute émission de moyen de règlement, même ' +
			'si ce règlement ne couvre qu’une partie de la créance ». « Un nouveau délai de quatre ans ' +
			'court à compter du premier jour de l’année suivant celle au cours de laquelle a eu lieu ' +
			'l’interruption. » ⚠️ C’EST L’INVERSE DU DROIT COMMUN, où une mise en demeure ' +
			'n’interrompt rien (`miseEnDemeureNonInterruptive`). Le cachet de la poste fait foi devant ' +
			'une administration (article L112-1 du code des relations entre le public et ' +
			'l’administration), pas devant un EPIC qui gère un service industriel ou commercial ' +
			`(L100-3). ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>
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
