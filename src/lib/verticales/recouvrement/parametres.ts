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
