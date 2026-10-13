import { depuisCentimes, depuisEuros, enCentimes, versEuros } from '../../../socle/montants';

/**
 * LES GESTES QUE PLUME PEUT PROPOSER — un catalogue fermé (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ « ON DOIT POUVOIR TOUT FAIRE SUR UN DOSSIER PAR CETTE INTERFACE »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la demande du fondateur. Le gérant dit « relance-le », « il a promis de
 * payer 500 € le 20 », « son mail c'est compta@durand.fr », « rappelle-moi lundi » ;
 * Plume répond, et propose le GESTE qui le fait. Le geste s'affiche en carte et ne
 * se fait qu'au toucher de « Confirmer » : le logiciel propose, le gérant confirme.
 *
 * ⚠️ LE CATALOGUE EST FERMÉ, ET IL NE CONTIENT QUE DES GESTES DE BUREAU. Rien n'y
 * saisit un tribunal, ne mandate personne, ne choisit une voie de droit, ni
 * n'envoie quoi que ce soit sans relecture : « relancer » PRÉPARE la prochaine
 * relance du plan, que le gérant relit avant qu'elle parte. Ajouter un geste ici,
 * c'est d'abord vérifier qu'il ne franchit aucune des trois lignes rouges.
 *
 * ⚠️ CE QUE LE MODÈLE REND N'EST PAS CRU. Chaque geste est relu ICI contre l'état
 * du dossier : une date mal formée ou passée, un montant illisible ou supérieur à ce
 * qui reste dû, une relance proposée à un client en procédure collective, un
 * « retenir » quand rien n'est programmé — tout cela tombe en silence, avant
 * d'atteindre l'écran. Puis le serveur le relit encore au moment de l'exécuter.
 */

export const GENRES_GESTE = [
	'RELANCER',
	'RAPPEL',
	'PROMESSE',
	'NOTE',
	'EMAIL',
	'RETIRER_DU_PILOTE',
	'REMETTRE_AU_PILOTE',
	'RETENIR',
	'OUVRIR',
	'CONTESTATION',
	'ARRETER_DECOMPTE',
	'LIEN_PAIEMENT',
	'REMISE_CONSEIL',
	// Analyse des parcours du 08/10/2026 : le paiement en plusieurs fois, et le
	// dossier qu'on classe. Deux gestes de bureau, qui ne franchissent aucune ligne.
	'ECHEANCIER',
	'CLASSER',
	// 12/10/2026, « Plume doit être capable de tout faire » : le paiement reçu, que
	// la fiche du client note sous « Virement reçu ». Un fait, rapproché par le logiciel.
	'REGLEMENT'
] as const;
export type GenreGeste = (typeof GENRES_GESTE)[number];

/** Les écrans qu'un geste « Ouvrir » peut montrer. */
export const ECRANS_OUVRABLES = [
	'ARRET',
	'COURRIERS',
	'DOCUMENTS',
	'FICHE_CLIENT',
	'PENALITES'
] as const;
export type EcranOuvrable = (typeof ECRANS_OUVRABLES)[number];

/**
 * LES ÉCRANS DE L'ÉTABLISSEMENT qu'un geste « Ouvrir » montre depuis la conversation
 * de Plume hors d'un dossier (12/10/2026) : « on doit pouvoir tout faire par Plume ».
 * Ouvrir n'écrit rien : c'est le gérant qui agit sur l'écran ouvert.
 */
export const ECRANS_ETABLISSEMENT = [
	'CE_QUI_EST_DU',
	'DOSSIERS',
	'CLIENTS',
	'COFFRE',
	'DEPOSER',
	'DEFENSE',
	'NOTIFICATIONS',
	'DEMARRER_LOT',
	'RELANCES',
	'COMPTE',
	// 13/10/2026 : la santé de tous les clients, l'analyse du risque.
	'SANTE_CLIENTS'
] as const;

/** Les écrans d'un dossier précis : le geste porte son identifiant. */
export const ECRANS_D_UN_DOSSIER = [
	'DOSSIER',
	'COURRIERS',
	'DOCUMENTS',
	'FICHE_CLIENT',
	'PENALITES',
	'PROFESSIONNELS'
] as const;

/** Les écrans d'un client précis : le geste porte son identifiant. */
export const ECRANS_D_UN_CLIENT = ['CLIENT', 'DEMARRER', 'SANTE'] as const;

/** Ce que le modèle rend : une forme PLATE, chaque champ inutile laissé vide. */
export interface GesteBrut {
	readonly genre: GenreGeste;
	readonly date: string;
	readonly montant: string;
	readonly texte: string;
}

/** Un geste relu, prêt à s'afficher et à se confirmer. */
export interface Geste {
	readonly genre: GenreGeste;
	/** `AAAA-MM-JJ`, pour un rappel ou une promesse. */
	readonly date?: string;
	/** En centimes, pour une promesse. */
	readonly montant?: bigint;
	/** Le motif d'un rappel, une note, une adresse, ou l'écran à ouvrir. */
	readonly texte?: string;
	/**
	 * LE DOSSIER QU'IL TOUCHE, quand il est proposé hors d'un dossier (12/10/2026) :
	 * la conversation de l'établissement nomme sa cible, recopiée du contexte.
	 */
	readonly dossier?: string;
	/** Le client qu'il montre, pour « sa fiche » ou « démarrer son dossier ». */
	readonly client?: string;
}

/** Ce que le modèle rend dans la conversation de l'établissement : la cible en plus. */
export interface GesteBrutDeLEtablissement extends GesteBrut {
	readonly dossier: string;
	readonly client: string;
}

/** Ce qu'il faut savoir de l'établissement pour relire un geste qui y est proposé. */
export interface EtatPourGestesDeLEtablissement {
	/** L'état de chaque dossier qu'un geste vise, lu au moment de la question. */
	readonly dossiers: ReadonlyMap<string, EtatPourGestes>;
	/** Tous les dossiers du contexte : ceux qu'un écran peut montrer. */
	readonly dossiersConnus: ReadonlySet<string>;
	readonly clientsConnus: ReadonlySet<string>;
}

/** Ce qu'il faut savoir du dossier pour relire un geste. */
export interface EtatPourGestes {
	readonly aujourdHui: string;
	readonly restantDu: bigint;
	/** Ni réglé, ni classé, ni porté devant un professionnel, ni client en procédure collective ou radié. */
	readonly relancable: boolean;
	readonly horsPilote: boolean;
	readonly relanceProgrammee: boolean;
	readonly emailConnu: string | null;
	/** Le gérant a déclaré que le client conteste : c'est noté, et rien ne s'arrête. */
	readonly contestationDeclaree: boolean;
	/** Votre IBAN est renseigné : la page de paiement dit où payer. */
	readonly ibanConnu: boolean;
	/** Une remise au conseil est déjà déclarée et suivie. */
	readonly remiseEnCours: boolean;
	/**
	 * Le dossier n'est ni classé ni réglé : son montant du jour se calcule, et se
	 * date quand un document le réclame (la page de paiement, la remise).
	 */
	readonly arretable: boolean;
	/** Un paiement en plusieurs fois court déjà sur ce dossier. */
	readonly echeancierEnCours?: boolean;
	/** Le gérant a classé ce dossier. */
	readonly classe?: boolean;
	/** Plume l'a préparé, et il attend que le gérant le démarre. */
	readonly aDemarrer?: boolean;
}

/**
 * LES ÉCRANS QU'UN GESTE « OUVRIR » MONTRE DEPUIS LA CONVERSATION D'UN DOSSIER, en plus
 * de ceux du dossier : choisir qui fait l'acte, joindre un document à Plume, démarrer
 * le dossier quand il attend — et tout écran de l'établissement (12/10/2026).
 */
const ECRANS_EN_PLUS_DANS_UN_DOSSIER = ['DOSSIER', 'PROFESSIONNELS', 'JOINDRE', 'SANTE'] as const;

/** Les nombres de versements qu'un échéancier admet (le serveur relit la même liste). */
export const NOMBRES_DE_VERSEMENTS = [2, 3, 4, 5, 6, 8, 10, 12] as const;

/** Les raisons de classer que Plume peut proposer : « autre raison » demande les mots du gérant. */
export const MOTIFS_DE_CLASSEMENT = ['GESTE_COMMERCIAL', 'IRRECOUVRABLE', 'ERREUR'] as const;

const LIBELLE_DU_MOTIF: Readonly<Record<(typeof MOTIFS_DE_CLASSEMENT)[number], string>> = {
	GESTE_COMMERCIAL: 'Geste commercial : vous renoncez à cette somme',
	IRRECOUVRABLE: 'Vous n’y croyez plus',
	ERREUR: 'Facture en erreur ou en double'
};

/** Au plus tant de gestes par réponse : au-delà, la réponse redevient un formulaire. */
export const GESTES_PAR_REPONSE = 3;

/** Une date du calendrier, qui se relit à l'identique (`Date.parse` ne lève pas sur bun). */
export function dateDuCalendrier(valeur: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false;
	const relue = new Date(`${valeur}T00:00:00.000Z`);
	return !Number.isNaN(relue.getTime()) && relue.toISOString().slice(0, 10) === valeur;
}

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function relire(brut: GesteBrut, etat: EtatPourGestes): Geste | null {
	const texte = brut.texte.trim();
	const date = brut.date.trim();
	switch (brut.genre) {
		case 'RELANCER':
			return etat.relancable ? { genre: 'RELANCER' } : null;
		case 'RAPPEL':
			if (!dateDuCalendrier(date) || date < etat.aujourdHui) return null;
			return {
				genre: 'RAPPEL',
				date,
				texte: texte === '' ? 'Revenir sur ce dossier' : texte.slice(0, 200)
			};
		case 'PROMESSE': {
			if (!dateDuCalendrier(date) || date < etat.aujourdHui) return null;
			let montant: bigint;
			try {
				montant = enCentimes(depuisEuros(brut.montant));
			} catch {
				return null;
			}
			if (montant <= 0n) return null;
			if (etat.restantDu > 0n && montant > etat.restantDu) return null;
			return { genre: 'PROMESSE', date, montant };
		}
		case 'NOTE':
			return texte === '' ? null : { genre: 'NOTE', texte: texte.slice(0, 1000) };
		case 'EMAIL':
			if (!ADRESSE.test(texte) || texte === etat.emailConnu) return null;
			return { genre: 'EMAIL', texte };
		case 'RETIRER_DU_PILOTE':
			return etat.horsPilote ? null : { genre: 'RETIRER_DU_PILOTE' };
		case 'REMETTRE_AU_PILOTE':
			return etat.horsPilote ? { genre: 'REMETTRE_AU_PILOTE' } : null;
		case 'RETENIR':
			return etat.relanceProgrammee ? { genre: 'RETENIR' } : null;
		case 'OUVRIR':
			if (
				(ECRANS_OUVRABLES as readonly string[]).includes(texte) ||
				(ECRANS_EN_PLUS_DANS_UN_DOSSIER as readonly string[]).includes(texte) ||
				(ECRANS_ETABLISSEMENT as readonly string[]).includes(texte)
			) {
				return { genre: 'OUVRIR', texte };
			}
			return texte === 'DEMARRER' && etat.aDemarrer === true ? { genre: 'OUVRIR', texte } : null;
		case 'CONTESTATION': {
			// ⚠️ NOTER UNE CONTESTATION NE BLOQUE RIEN : c'est un fait du dossier, pas un verrou.
			const conteste = texte.toUpperCase() !== 'NON';
			if (conteste === etat.contestationDeclaree) return null;
			return { genre: 'CONTESTATION', texte: conteste ? 'OUI' : 'NON' };
		}
		case 'ARRETER_DECOMPTE':
			// Plus proposé depuis le 09/10/2026 : le montant se date tout seul quand
			// un document le réclame. Le genre reste lisible pour les anciens échanges.
			return null;
		case 'LIEN_PAIEMENT':
			return etat.arretable && etat.ibanConnu ? { genre: 'LIEN_PAIEMENT' } : null;
		case 'REMISE_CONSEIL': {
			if (!etat.arretable || etat.remiseEnCours) return null;
			const le = dateDuCalendrier(date) && date <= etat.aujourdHui ? date : etat.aujourdHui;
			return {
				genre: 'REMISE_CONSEIL',
				date: le,
				...(texte === '' ? {} : { texte: texte.slice(0, 300) })
			};
		}
		case 'ECHEANCIER': {
			if (etat.classe === true || etat.echeancierEnCours === true || etat.restantDu <= 0n)
				return null;
			if (!dateDuCalendrier(date) || date < etat.aujourdHui) return null;
			const nombre = Number.parseInt(texte, 10);
			if (!(NOMBRES_DE_VERSEMENTS as readonly number[]).includes(nombre)) return null;
			return { genre: 'ECHEANCIER', date, texte: String(nombre), montant: etat.restantDu };
		}
		case 'REGLEMENT': {
			// Un paiement reçu : son montant, et le jour où il est arrivé — jamais demain.
			if (etat.classe === true || etat.restantDu <= 0n) return null;
			let montant: bigint;
			try {
				montant = enCentimes(depuisEuros(brut.montant));
			} catch {
				return null;
			}
			if (montant <= 0n) return null;
			const le = date === '' ? etat.aujourdHui : date;
			if (!dateDuCalendrier(le) || le > etat.aujourdHui) return null;
			return { genre: 'REGLEMENT', date: le, montant };
		}
		case 'CLASSER': {
			if (etat.classe === true) return null;
			const motif = texte.toUpperCase();
			return (MOTIFS_DE_CLASSEMENT as readonly string[]).includes(motif)
				? { genre: 'CLASSER', texte: motif }
				: null;
		}
	}
}

/**
 * Les gestes que la réponse propose, relus contre l'état du dossier.
 *
 * ⚠️ UN GESTE DE CHAQUE GENRE, ET TROIS AU PLUS. Deux rappels proposés dans la même
 * réponse se contrediraient ; quatre cartes noieraient la réponse.
 */
export function lireGestes(bruts: readonly GesteBrut[], etat: EtatPourGestes): Geste[] {
	const vus = new Set<GenreGeste>();
	const gestes: Geste[] = [];
	for (const brut of bruts) {
		if (gestes.length >= GESTES_PAR_REPONSE) break;
		if (!(GENRES_GESTE as readonly string[]).includes(brut.genre) || vus.has(brut.genre)) continue;
		const geste = relire(brut, etat);
		if (geste === null) continue;
		vus.add(geste.genre);
		gestes.push(geste);
	}
	return gestes;
}

/**
 * LES GESTES PROPOSÉS DANS LA CONVERSATION DE L'ÉTABLISSEMENT, relus contre l'état du
 * dossier qu'ils visent (12/10/2026).
 *
 * ⚠️ UNE CIBLE QUE LE CONTEXTE NE PORTE PAS FAIT TOMBER LE GESTE, en silence : un
 * identifiant de dossier inventé relancerait le mauvais client. Le geste d'un dossier
 * passe ensuite par la MÊME relecture que dans la conversation de ce dossier.
 *
 * ⚠️ DEUX GESTES DU MÊME GENRE SUR DEUX DOSSIERS SONT PERMIS (« relance Durand et
 * Vidal ») ; deux fois le même sur le même, non. Trois au plus, comme ailleurs.
 */
export function lireGestesDeLEtablissement(
	bruts: readonly GesteBrutDeLEtablissement[],
	etat: EtatPourGestesDeLEtablissement
): Geste[] {
	const vus = new Set<string>();
	const gestes: Geste[] = [];
	for (const brut of bruts) {
		if (gestes.length >= GESTES_PAR_REPONSE) break;
		if (!(GENRES_GESTE as readonly string[]).includes(brut.genre)) continue;
		const dossier = brut.dossier.trim();
		const client = brut.client.trim();
		const texte = brut.texte.trim();
		let geste: Geste | null = null;
		if (brut.genre === 'OUVRIR') {
			if ((ECRANS_ETABLISSEMENT as readonly string[]).includes(texte)) {
				geste = { genre: 'OUVRIR', texte };
			} else if (
				(ECRANS_D_UN_DOSSIER as readonly string[]).includes(texte) &&
				etat.dossiersConnus.has(dossier)
			) {
				geste = { genre: 'OUVRIR', texte, dossier };
			} else if (
				(ECRANS_D_UN_CLIENT as readonly string[]).includes(texte) &&
				etat.clientsConnus.has(client)
			) {
				geste = { genre: 'OUVRIR', texte, client };
			}
		} else {
			const etatDuDossier = etat.dossiers.get(dossier);
			const relu = etatDuDossier === undefined ? null : relire(brut, etatDuDossier);
			if (relu !== null) geste = { ...relu, dossier };
		}
		if (geste === null) continue;
		const cle = `${geste.genre}:${geste.dossier ?? geste.client ?? geste.texte ?? ''}`;
		if (vus.has(cle)) continue;
		vus.add(cle);
		gestes.push(geste);
	}
	return gestes;
}

const JOUR_LONG = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC'
});

/** « lundi 13 octobre » */
export function jourEnClair(date: string): string {
	return JOUR_LONG.format(new Date(`${date}T00:00:00.000Z`));
}

const TITRE_ECRAN: Readonly<Record<string, { titre: string; detail?: string }>> = {
	ARRET: { titre: 'Le montant du jour' },
	COURRIERS: { titre: 'Ses courriers et e-mails' },
	DOCUMENTS: { titre: 'Ses documents' },
	FICHE_CLIENT: { titre: 'La fiche du client' },
	PENALITES: { titre: 'Pénalités et frais' },
	DOSSIER: { titre: 'Le dossier' },
	PROFESSIONNELS: {
		titre: 'Choisir qui fait l’acte',
		detail: 'Un avocat, un commissaire de justice : la liste s’ouvre, et c’est vous qui choisissez.'
	},
	CLIENT: { titre: 'La fiche du client' },
	DEMARRER: {
		titre: 'Démarrer son dossier',
		detail: 'Ses factures en retard sont déjà cochées ; deux questions, puis vous démarrez.'
	},
	CE_QUI_EST_DU: {
		titre: 'Ce qui vous est dû',
		detail: 'Client par client, le plus gros d’abord.'
	},
	DOSSIERS: { titre: 'Vos dossiers' },
	CLIENTS: { titre: 'Vos clients' },
	COFFRE: { titre: 'Votre coffre-fort', detail: 'Vos documents, chiffrés, et qui les a ouverts.' },
	DEPOSER: {
		titre: 'Déposer des factures',
		detail:
			'Au coffre, lues dès leur arrivée. Vous pouvez aussi me les joindre ici, avec le bouton +.'
	},
	DEFENSE: {
		titre: 'Votre défense',
		detail: 'Votre équipe, les avocats et commissaires près de vos clients.'
	},
	NOTIFICATIONS: { titre: 'Vos notifications' },
	DEMARRER_LOT: {
		titre: 'Les dossiers prêts à démarrer',
		detail: 'Tout est coché : vous décochez ceux que vous gardez en main.'
	},
	RELANCES: {
		titre: 'Les relances automatiques',
		detail: 'Vous lisez tout ce qui partira avant de décider.'
	},
	COMPTE: { titre: 'Votre compte' },
	SANTE_CLIENTS: {
		titre: 'La santé de vos clients',
		detail: 'Ceux qui méritent un regard, ce qui pèse, et jusqu’où votre portefeuille est couvert.'
	},
	SANTE: {
		titre: 'Sa santé',
		detail: 'Son niveau, ce qui pèse, ses dirigeants et ses comptes, chaque fait avec sa source.'
	},
	JOINDRE: {
		titre: 'Me joindre le document',
		detail:
			'Le bon de livraison, le contrat, une photo : je le mets au coffre, je le lis, puis je vous dis ce qu’il apporte.'
	}
};

/**
 * CE QUE LA CARTE D'UN GESTE DIT, en toutes lettres.
 *
 * ⚠️ C'EST LE LOGICIEL QUI L'ÉCRIT, JAMAIS LE MODÈLE. Le modèle choisit un genre et
 * remplit des champs ; la phrase qui dit ce qui sera fait est composée ici, pour
 * qu'aucune carte ne promette ce que le geste ne fait pas.
 */
export function decrireGeste(geste: Geste): {
	readonly titre: string;
	readonly detail?: string;
	readonly confirmer: string;
} {
	switch (geste.genre) {
		case 'RELANCER':
			return {
				titre: 'Préparer la prochaine relance',
				detail: 'Je la compose avec vos modèles. Vous la relisez avant qu’elle parte.',
				confirmer: 'Préparer'
			};
		case 'RAPPEL':
			return {
				titre: `Rappel ${jourEnClair(geste.date ?? '')}`,
				detail: `${geste.texte ?? 'Revenir sur ce dossier'}. Ce jour-là, le dossier remonte dans Aujourd’hui.`,
				confirmer: 'Poser le rappel'
			};
		case 'PROMESSE':
			return {
				titre: `Promesse de ${versEuros(depuisCentimes(geste.montant ?? 0n))} € pour ${jourEnClair(geste.date ?? '')}`,
				detail:
					'Je ne le relance pas avant ce jour, plus trois jours pour que le virement arrive. Ce jour-là, le dossier remonte dans Aujourd’hui.',
				confirmer: 'Noter la promesse'
			};
		case 'NOTE':
			return { titre: 'Noter au dossier', detail: `« ${geste.texte ?? ''} »`, confirmer: 'Noter' };
		case 'EMAIL':
			return {
				titre: 'Enregistrer son adresse',
				detail: `${geste.texte ?? ''}. Les relances partiront à cette adresse.`,
				confirmer: 'Enregistrer'
			};
		case 'RETIRER_DU_PILOTE':
			return {
				titre: 'Ne plus relancer ce client',
				detail:
					'Je n’ouvre plus ses dossiers et je ne lui écris plus. Vous le remettez d’un geste.',
				confirmer: 'Retirer'
			};
		case 'REMETTRE_AU_PILOTE':
			return {
				titre: 'Le relancer de nouveau',
				detail: 'Je reprends ses dossiers et son plan de relance.',
				confirmer: 'Le remettre'
			};
		case 'RETENIR':
			return {
				titre: 'Retenir la relance programmée',
				detail: 'Elle ne partira pas, et ce client sort du pilote.',
				confirmer: 'Retenir'
			};
		case 'OUVRIR': {
			const ecran = TITRE_ECRAN[geste.texte ?? ''];
			return {
				titre: ecran?.titre ?? 'Ouvrir',
				...(ecran?.detail === undefined ? {} : { detail: ecran.detail }),
				confirmer: geste.texte === 'JOINDRE' ? 'Choisir le document' : 'Ouvrir'
			};
		}
		case 'REGLEMENT':
			return {
				titre: `Paiement de ${versEuros(depuisCentimes(geste.montant ?? 0n))} € reçu ${jourEnClair(geste.date ?? '')}`,
				detail:
					'Je le rapproche de ses factures : celles qu’il solde exactement, sinon dans l’ordre que prévoit la loi. Ce qui est réglé ne se relance plus.',
				confirmer: 'Noter le paiement'
			};
		case 'CONTESTATION':
			return geste.texte === 'NON'
				? {
						titre: 'Noter qu’il ne conteste plus',
						detail: 'Le dossier garde la trace de la contestation et de sa fin.',
						confirmer: 'Noter'
					}
				: {
						titre: 'Noter que votre client conteste',
						detail:
							'C’est noté au dossier, et rien ne s’arrête : je continue de le suivre et de le relancer, sauf si vous me demandez de le garder en main.',
						confirmer: 'Noter'
					};
		case 'ARRETER_DECOMPTE':
			return {
				titre: 'Dater le montant à aujourd’hui',
				detail:
					'En confirmant, vous affirmez qu’aucun avoir n’est à déduire et que tous ses règlements sont notés. Les pénalités continuent de courir jusqu’au paiement.',
				confirmer: 'Dater le montant'
			};
		case 'LIEN_PAIEMENT':
			return {
				titre: 'Ouvrir sa page de paiement',
				detail:
					'Une page à votre nom, avec le montant du jour et votre IBAN : il paie depuis sa banque. En confirmant, vous affirmez qu’aucun avoir n’est à déduire et que tous ses règlements sont notés.',
				confirmer: 'Ouvrir la page'
			};
		case 'REMISE_CONSEIL':
			return {
				titre: `Noter la remise à votre conseil, ${jourEnClair(geste.date ?? '')}`,
				detail: `Avec le montant du jour, daté. Je suis la remise et ses dates.${geste.texte === undefined ? '' : ` Ce que vous attendez : « ${geste.texte} ».`}`,
				confirmer: 'Noter la remise'
			};
		case 'ECHEANCIER': {
			const nombre = Number.parseInt(geste.texte ?? '0', 10);
			const part = nombre > 0 ? (geste.montant ?? 0n) / BigInt(nombre) : 0n;
			return {
				titre: `Paiement en ${nombre} fois, à partir du ${jourEnClair(geste.date ?? '')}`,
				detail: `${nombre} versements mensuels d’environ ${versEuros(depuisCentimes(part))} €, hors pénalités. Tant qu’ils arrivent, je ne le relance pas.`,
				confirmer: 'Convenir'
			};
		}
		case 'CLASSER': {
			const motif = (geste.texte ?? 'GESTE_COMMERCIAL') as (typeof MOTIFS_DE_CLASSEMENT)[number];
			return {
				titre: 'Classer le dossier',
				detail: `${LIBELLE_DU_MOTIF[motif] ?? 'Classé'}. Les relances s’arrêtent ; il se rouvre d’un toucher.`,
				confirmer: 'Classer'
			};
		}
	}
}
