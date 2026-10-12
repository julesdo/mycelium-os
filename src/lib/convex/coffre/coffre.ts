import { v, ConvexError } from 'convex/values';
import type { QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { components, internal } from '../_generated/api';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { nomPropre, verdictAvantEnvoi } from '../../socle/coffre/fichiers';
import { modeDeLecture } from '../../verticales/recouvrement/import/mode';
import { enregistrerPiece, retirerLaPiece } from '../recouvrement/pieces';
import { journaliser } from './coffreInterne';

/**
 * LE COFFRE-FORT DES DOCUMENTS — la seule porte d'entrée et de sortie d'un
 * fichier (12/10/2026). Voir `docs/superpowers/specs/2026-10-12-coffre-fort.md`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CES FONCTIONS FONT, ET CE QU'ELLES NE FONT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   · un fichier entre par une adresse d'envoi à usage unique, puis est SCELLÉ
 *     avant toute lecture (`serrure.ts`) : vérifié dans ses octets, empreint,
 *     chiffré sous la clé de l'établissement, l'original effacé ;
 *   · il ne sort JAMAIS par une adresse durable : `ouvrirAuCoffre` vérifie la
 *     session et l'établissement, note le geste au journal et rend un jeton
 *     d'une minute, que l'action HTTP consomme une fois (`ouverture.ts`) ;
 *   · chaque dépôt, ouverture, téléchargement et retrait s'inscrit au journal,
 *     qui se lit sous le document.
 *
 * Aucune fonction d'ici ne déchiffre : les mutations ne voient que des
 * métadonnées.
 */

export const vRef = v.union(
	v.object({ genre: v.literal('IMPORT'), id: v.id('importsRecouvrement') }),
	v.object({ genre: v.literal('PIECE'), id: v.id('pieces') })
);

export type Ref =
	| { genre: 'IMPORT'; id: Id<'importsRecouvrement'> }
	| { genre: 'PIECE'; id: Id<'pieces'> };

/** Où va un document : les factures à lire, ou les pièces d'un client et de ses factures. */
const vDestination = v.union(
	v.object({ genre: v.literal('FACTURES') }),
	v.object({
		genre: v.literal('PIECES'),
		debiteurId: v.optional(v.id('debiteurs')),
		factureIds: v.array(v.id('facturesVente'))
	})
);

/** Une minute : le temps d'ouvrir, pas celui de partager. */
const DUREE_DU_JETON_MS = 60_000;

/**
 * Au-delà, une lecture qui n'a rien écrit est tenue pour tombée : le document se
 * retire. Le même seuil que l'écran (`ui/minute.ts`), qui le dit à partir de là.
 */
const SANS_NOUVELLE_MS = 15 * 60_000;

const vEtat = v.union(v.literal('EN_COURS'), v.literal('TERMINE'), v.literal('ECHEC'));

const vBilanCourt = v.object({
	facturesCreees: v.number(),
	facturesDejaConnues: v.number(),
	reglementsCrees: v.number(),
	ignoreesTotal: v.number()
});

/** Un document tel que le coffre le résume, dans sa liste et dans le suivi d'un dépôt. */
export const vResume = v.object({
	ref: vRef,
	nom: v.string(),
	deposeLe: v.number(),
	taille: v.optional(v.number()),
	mime: v.string(),
	scelle: v.boolean(),
	etat: vEtat,
	/** Ce qui se passe, en clair, tant que ce n'est pas fini — ou ce qui a échoué. */
	etape: v.optional(v.string()),
	bilan: v.optional(vBilanCourt),
	/** La nature lue d'une pièce (`BON_DE_LIVRAISON`…). L'écran la nomme. */
	typePiece: v.optional(v.string()),
	/** Le client d'une pièce, quand elle lui est rattachée. */
	client: v.optional(v.object({ id: v.id('debiteurs'), nom: v.string() }))
});

export type Resume = typeof vResume.type;

function resumeDuDepot(depot: Doc<'importsRecouvrement'>): Resume {
	const etat =
		depot.statut === 'TERMINE' ? 'TERMINE' : depot.statut === 'ECHOUE' ? 'ECHEC' : 'EN_COURS';
	return {
		ref: { genre: 'IMPORT', id: depot._id },
		nom: depot.filename,
		deposeLe: depot.deposeLe,
		...(depot.taille === undefined ? {} : { taille: depot.taille }),
		mime: depot.mimeType,
		scelle: depot.chiffrement !== undefined,
		etat,
		...(etat === 'ECHEC'
			? { etape: depot.erreur ?? depot.etape ?? 'La lecture a échoué.' }
			: depot.etape === undefined
				? {}
				: { etape: depot.etape }),
		...(depot.bilan === undefined
			? {}
			: {
					bilan: {
						facturesCreees: depot.bilan.facturesCreees,
						facturesDejaConnues: depot.bilan.facturesDejaConnues,
						reglementsCrees: depot.bilan.reglementsCrees,
						ignoreesTotal: depot.bilan.ignoreesTotal
					}
				})
	};
}

function resumeDeLaPiece(
	piece: Doc<'pieces'>,
	client: { id: Id<'debiteurs'>; nom: string } | null
): Resume {
	const etat =
		piece.statut === 'EN_LECTURE' ? 'EN_COURS' : piece.statut === 'ECHEC' ? 'ECHEC' : 'TERMINE';
	return {
		ref: { genre: 'PIECE', id: piece._id },
		nom: piece.filename,
		deposeLe: piece.ajouteeLe,
		...(piece.taille === undefined ? {} : { taille: piece.taille }),
		mime: piece.mimeType ?? 'application/octet-stream',
		scelle: piece.chiffrement !== undefined,
		etat,
		...(etat === 'EN_COURS'
			? { etape: piece.chiffrement === undefined ? 'Mise au coffre…' : 'Lecture de la pièce…' }
			: etat === 'ECHEC'
				? { etape: piece.constat ?? 'La lecture a échoué.' }
				: {}),
		typePiece: piece.type,
		...(client === null ? {} : { client })
	};
}

/** Le client d'une pièce, relu et recloisonné. */
async function clientDe(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'> | undefined
): Promise<{ id: Id<'debiteurs'>; nom: string } | null> {
	if (debiteurId === undefined) return null;
	const debiteur = await ctx.db.get(debiteurId);
	if (debiteur === null || debiteur.organizationId !== organizationId) return null;
	return { id: debiteur._id, nom: debiteur.denomination };
}

/**
 * UN DOCUMENT RÉSUMÉ PAR SA RÉFÉRENCE, ou `null` s'il n'est pas (ou plus) de cet
 * établissement. Sert au fil de Plume, qui montre les documents joints à une question.
 */
export async function resumerLeDocument(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	ref: Ref
): Promise<Resume | null> {
	const document = ref.genre === 'IMPORT' ? await ctx.db.get(ref.id) : await ctx.db.get(ref.id);
	if (document === null || document.organizationId !== organizationId) return null;
	return ref.genre === 'IMPORT'
		? resumeDuDepot(document as Doc<'importsRecouvrement'>)
		: resumeDeLaPiece(
				document as Doc<'pieces'>,
				await clientDe(ctx, organizationId, (document as Doc<'pieces'>).debiteurId)
			);
}

/** Le document désigné, s'il appartient à l'établissement — sinon une erreur qui ne dit rien de plus. */
async function documentDe(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	ref: Ref
): Promise<Doc<'importsRecouvrement'> | Doc<'pieces'>> {
	const document = ref.genre === 'IMPORT' ? await ctx.db.get(ref.id) : await ctx.db.get(ref.id);
	// Le cloisonnement AVANT tout : connaître un identifiant ne suffit pas.
	if (document === null || document.organizationId !== organizationId) {
		throw new ConvexError('Document introuvable');
	}
	return document;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DÉPOSER
 * ═══════════════════════════════════════════════════════════════════════════ */

/** L'adresse d'envoi, à usage unique. Le fichier n'appartient à personne tant qu'il n'est pas confié. */
export const genererUrlCoffre = authedMutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		await getUserOrg(ctx);
		return await ctx.storage.generateUploadUrl();
	}
});

/**
 * LES FICHIERS DÉJÀ AU COFFRE, reconnus à leur empreinte AVANT l'envoi : le
 * parcours dit « déjà dans votre coffre depuis le 3 oct. » au lieu de renvoyer
 * et relire un document identique.
 */
export const dejaAuCoffre = authedQuery({
	args: { empreintes: v.array(v.string()) },
	returns: v.array(v.object({ empreinte: v.string(), nom: v.string(), deposeLe: v.number() })),
	handler: async (ctx, { empreintes }) => {
		const { organizationId } = await getUserOrg(ctx);
		const trouves: { empreinte: string; nom: string; deposeLe: number }[] = [];
		for (const empreinte of empreintes.slice(0, 50)) {
			const depot = await ctx.db
				.query('importsRecouvrement')
				.withIndex('by_org_and_empreinte', (q) =>
					q.eq('organizationId', organizationId).eq('empreinte', empreinte)
				)
				.first();
			if (depot !== null) {
				trouves.push({ empreinte, nom: depot.filename, deposeLe: depot.deposeLe });
				continue;
			}
			const piece = await ctx.db
				.query('pieces')
				.withIndex('by_org_and_empreinte', (q) =>
					q.eq('organizationId', organizationId).eq('empreinte', empreinte)
				)
				.first();
			if (piece !== null)
				trouves.push({ empreinte, nom: piece.filename, deposeLe: piece.ajouteeLe });
		}
		return trouves;
	}
});

/**
 * CONFIER UN FICHIER AU COFFRE — après son envoi. Le document naît « en cours »,
 * et sa mise au coffre puis sa lecture partent en tâche planifiée : le parcours
 * les regarde avancer (`suivreLeDepot`).
 *
 * ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE : le handler planifie des fonctions qui
 * appellent ce module en retour.
 */
export const confierAuCoffre = authedMutation({
	args: { storageId: v.id('_storage'), nom: v.string(), destination: vDestination },
	returns: vRef,
	handler: async (ctx, { storageId, nom, destination }): Promise<Ref> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const propre = nomPropre(nom);
		// Le format se revérifie ici sur le nom ; les octets le seront au scellement.
		const verdict = verdictAvantEnvoi(propre, 1);
		if (!verdict.accepte) {
			await ctx.storage.delete(storageId);
			throw new ConvexError(verdict.raison);
		}

		if (destination.genre === 'FACTURES') {
			const importId = await ctx.db.insert('importsRecouvrement', {
				organizationId,
				storageId,
				filename: propre,
				mimeType: verdict.mime,
				mode: modeDeLecture(verdict.nature, verdict.mime),
				statut: 'EN_ATTENTE',
				etape: 'Mise au coffre…',
				deposeLe: Date.now(),
				deposePar: user._id
			});
			await journaliser(ctx, {
				organizationId,
				importId,
				nomDocument: propre,
				geste: 'DEPOT',
				userId: user._id
			});
			await ctx.scheduler.runAfter(0, internal.recouvrement.depot.traiterImport, { importId });
			return { genre: 'IMPORT', id: importId };
		}

		const pieceId = await enregistrerPiece(ctx, {
			organizationId,
			storageId,
			filename: propre,
			mimeType: verdict.mime,
			...(destination.debiteurId === undefined ? {} : { debiteurId: destination.debiteurId }),
			factureIds: destination.factureIds,
			deposePar: user._id
		});
		await journaliser(ctx, {
			organizationId,
			pieceId,
			nomDocument: propre,
			geste: 'DEPOT',
			userId: user._id
		});
		await ctx.scheduler.runAfter(0, internal.recouvrement.preuve.lireLaPiece, { pieceId });
		return { genre: 'PIECE', id: pieceId };
	}
});

/** Où en sont les documents d'un dépôt : le parcours les regarde, en direct. */
export const suivreLeDepot = authedQuery({
	args: { documents: v.array(vRef) },
	returns: v.array(vResume),
	handler: async (ctx, { documents }) => {
		const { organizationId } = await getUserOrg(ctx);
		const resumes: Resume[] = [];
		for (const ref of documents.slice(0, 50)) {
			const document = ref.genre === 'IMPORT' ? await ctx.db.get(ref.id) : await ctx.db.get(ref.id);
			if (document === null || document.organizationId !== organizationId) continue;
			resumes.push(
				ref.genre === 'IMPORT'
					? resumeDuDepot(document as Doc<'importsRecouvrement'>)
					: resumeDeLaPiece(
							document as Doc<'pieces'>,
							await clientDe(ctx, organizationId, (document as Doc<'pieces'>).debiteurId)
						)
			);
		}
		return resumes;
	}
});

/* ═══════════════════════════════════════════════════════════════════════════
 * LIRE LE COFFRE
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * TOUT LE COFFRE DE L'ÉTABLISSEMENT : les factures déposées et les pièces, du
 * plus récent au plus ancien.
 *
 * ⚠️ LECTURE BORNÉE, ET NOMMÉE : les deux cents derniers dépôts et toutes les
 * pièces (elles se déposent à la main). Le jour où le coffre dépasse, il se pagine.
 */
export const listerLeCoffre = authedQuery({
	args: {},
	returns: v.array(vResume),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const depots = await ctx.db
			.query('importsRecouvrement')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(200);
		const pieces = await ctx.db
			.query('pieces')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.take(500);

		const clients = new Map<string, { id: Id<'debiteurs'>; nom: string } | null>();
		const resumes: Resume[] = depots.map(resumeDuDepot);
		for (const piece of pieces) {
			const cle = piece.debiteurId ?? '';
			if (!clients.has(cle))
				clients.set(cle, await clientDe(ctx, organizationId, piece.debiteurId));
			resumes.push(resumeDeLaPiece(piece, clients.get(cle) ?? null));
		}
		return resumes.sort((a, b) => b.deposeLe - a.deposeLe);
	}
});

/**
 * CE QUE L'ACCUEIL DIT DU COFFRE : combien de documents, et ceux qui sont
 * encore en machine. Une lecture étroite, pour qu'Aujourd'hui ne s'abonne pas
 * au coffre entier.
 *
 * ⚠️ LE COMPTE EST BORNÉ, ET IL LE DIT : au-delà de mille documents de chaque
 * sorte, `auMoins` passe à vrai et l'écran écrit « plus de ».
 */
export const apercuDuCoffre = authedQuery({
	args: {},
	returns: v.object({
		total: v.number(),
		auMoins: v.boolean(),
		enCours: v.array(v.object({ id: v.string(), nom: v.string(), etape: v.optional(v.string()) }))
	}),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const BORNE = 1000;
		const depots = await ctx.db
			.query('importsRecouvrement')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(BORNE);
		const pieces = await ctx.db
			.query('pieces')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.take(BORNE);
		const enCours = depots
			.filter((d) => d.statut === 'EN_ATTENTE' || d.statut === 'LECTURE')
			.slice(0, 10)
			.map((d) => ({
				id: d._id as string,
				nom: d.filename,
				...(d.etape === undefined ? {} : { etape: d.etape })
			}));
		return {
			total: depots.length + pieces.length,
			auMoins: depots.length === BORNE || pieces.length === BORNE,
			enCours
		};
	}
});

const vPersonne = v.object({ nom: v.string(), estMoi: v.boolean() });

/** « vous », ou le nom d'un membre de l'équipe — relu dans les comptes. */
async function personne(
	ctx: QueryCtx,
	userId: string,
	moi: { _id: string; name?: string | null },
	deja: Map<string, { nom: string; estMoi: boolean }>
): Promise<{ nom: string; estMoi: boolean }> {
	const connue = deja.get(userId);
	if (connue !== undefined) return connue;
	let trouvee: { nom: string; estMoi: boolean };
	if (userId === moi._id) {
		trouvee = { nom: moi.name ?? 'Vous', estMoi: true };
	} else {
		const resultat = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
			model: 'user',
			where: [{ field: '_id', operator: 'eq' as const, value: userId }],
			paginationOpts: { cursor: null, numItems: 1 }
		})) as { page: { name?: string | null; email?: string | null }[] };
		const compte = resultat.page[0];
		trouvee = { nom: compte?.name ?? compte?.email ?? 'Un membre de l’équipe', estMoi: false };
	}
	deja.set(userId, trouvee);
	return trouvee;
}

/**
 * LE JOURNAL DU COFFRE : les derniers gestes sur tous les documents de
 * l'établissement — qui a déposé, ouvert, téléchargé ou retiré quoi, et quand.
 *
 * ⚠️ IL NOMME LE DOCUMENT PAR `nomDocument`, ÉCRIT AU MOMENT DU GESTE, et pas
 * par le document lui-même : un document retiré n'existe plus, et son retrait
 * doit pourtant rester lisible. C'est le seul endroit où ce nom se relit.
 */
export const journalDuCoffre = authedQuery({
	args: {},
	returns: v.array(
		v.object({
			nomDocument: v.string(),
			geste: v.union(
				v.literal('DEPOT'),
				v.literal('CONSULTATION'),
				v.literal('TELECHARGEMENT'),
				v.literal('RETRAIT')
			),
			le: v.number(),
			par: vPersonne,
			ref: v.optional(vRef)
		})
	),
	handler: async (ctx) => {
		const { organizationId, user } = await getUserOrg(ctx);
		const entrees = await ctx.db
			.query('accesDocuments')
			.withIndex('by_org_and_le', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(30);
		const noms = new Map<string, { nom: string; estMoi: boolean }>();
		const journal = [];
		for (const entree of entrees) {
			journal.push({
				nomDocument: entree.nomDocument,
				geste: entree.geste,
				le: entree.le,
				par: await personne(ctx, entree.userId, user, noms),
				// Un document retiré ne se rouvre pas : sa ligne ne mène nulle part.
				...(entree.geste === 'RETRAIT'
					? {}
					: entree.importId !== undefined
						? { ref: { genre: 'IMPORT' as const, id: entree.importId } }
						: entree.pieceId !== undefined
							? { ref: { genre: 'PIECE' as const, id: entree.pieceId } }
							: {})
			});
		}
		return journal;
	}
});

/**
 * UN DOCUMENT EN DÉTAIL : son résumé, ses faits (empreinte, sceau, auteur), ce
 * que la lecture en a tiré, et son journal — les vingt derniers gestes.
 *
 * ⚠️ `null` POUR UN DOCUMENT RETIRÉ (ou d'un autre établissement), pas une
 * erreur : l'adresse `?document=` peut survivre à son document, et une erreur
 * ferait tomber l'écran entier au lieu de dire qu'il n'est plus là.
 */
export const documentDuCoffre = authedQuery({
	args: { ref: vRef },
	returns: v.union(
		v.null(),
		v.object({
			resume: vResume,
			empreinte: v.optional(v.string()),
			sceau: v.optional(v.object({ algorithme: v.string(), version: v.number() })),
			deposePar: v.optional(vPersonne),
			/** Ce que la lecture d'une pièce a écrit, mot pour mot. */
			constat: v.optional(v.string()),
			reference: v.optional(v.string()),
			dateDocument: v.optional(v.string()),
			/** Pour une facture déposée : par où elle a été lue. */
			mode: v.optional(v.union(v.literal('EXPORT_COMPTABLE'), v.literal('FACTURE_DEPOSEE'))),
			journal: v.array(
				v.object({
					geste: v.union(
						v.literal('DEPOT'),
						v.literal('CONSULTATION'),
						v.literal('TELECHARGEMENT'),
						v.literal('RETRAIT')
					),
					le: v.number(),
					par: vPersonne
				})
			)
		})
	),
	handler: async (ctx, { ref }) => {
		const { organizationId, user } = await getUserOrg(ctx);
		const document = ref.genre === 'IMPORT' ? await ctx.db.get(ref.id) : await ctx.db.get(ref.id);
		if (document === null || document.organizationId !== organizationId) return null;
		const entrees =
			ref.genre === 'IMPORT'
				? await ctx.db
						.query('accesDocuments')
						.withIndex('by_import', (q) => q.eq('importId', ref.id))
						.order('desc')
						.take(20)
				: await ctx.db
						.query('accesDocuments')
						.withIndex('by_piece', (q) => q.eq('pieceId', ref.id))
						.order('desc')
						.take(20);
		const noms = new Map<string, { nom: string; estMoi: boolean }>();
		const journal = [];
		for (const entree of entrees) {
			journal.push({
				geste: entree.geste,
				le: entree.le,
				par: await personne(ctx, entree.userId, user, noms)
			});
		}

		const commun = {
			...(document.empreinte === undefined ? {} : { empreinte: document.empreinte }),
			...(document.chiffrement === undefined
				? {}
				: {
						sceau: {
							algorithme: document.chiffrement.algorithme,
							version: document.chiffrement.version
						}
					}),
			...(document.deposePar === undefined
				? {}
				: { deposePar: await personne(ctx, document.deposePar, user, noms) }),
			journal
		};
		if (ref.genre === 'IMPORT') {
			const depot = document as Doc<'importsRecouvrement'>;
			return { resume: resumeDuDepot(depot), mode: depot.mode, ...commun };
		}
		const piece = document as Doc<'pieces'>;
		return {
			resume: resumeDeLaPiece(piece, await clientDe(ctx, organizationId, piece.debiteurId)),
			...(piece.constat === undefined ? {} : { constat: piece.constat }),
			...(piece.reference === undefined ? {} : { reference: piece.reference }),
			...(piece.dateDocument === undefined ? {} : { dateDocument: piece.dateDocument }),
			...commun
		};
	}
});

/* ═══════════════════════════════════════════════════════════════════════════
 * OUVRIR, RETIRER
 * ═══════════════════════════════════════════════════════════════════════════ */

/** 32 octets du générateur du système, en hexadécimal : le jeton d'une ouverture. */
function jetonNeuf(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(32)), (o) =>
		o.toString(16).padStart(2, '0')
	).join('');
}

/**
 * OUVRIR UN DOCUMENT : la session et l'établissement vérifiés, le geste noté au
 * journal, un jeton d'une minute rendu avec l'adresse qui le consomme. Le
 * document ne sort que par là, une fois.
 */
export const ouvrirAuCoffre = authedMutation({
	args: { ref: vRef, geste: v.union(v.literal('CONSULTATION'), v.literal('TELECHARGEMENT')) },
	returns: v.object({ jeton: v.string(), adresse: v.string() }),
	handler: async (ctx, { ref, geste }) => {
		const { organizationId, user } = await getUserOrg(ctx);
		const document = await documentDe(ctx, organizationId, ref);
		if (document.chiffrement === undefined && document.empreinte === undefined) {
			// Pas encore scellé : il l'est dans les secondes qui suivent son envoi. Un
			// fichier refusé, lui, n'a jamais été gardé.
			const enCours =
				ref.genre === 'IMPORT'
					? (document as Doc<'importsRecouvrement'>).statut === 'EN_ATTENTE' ||
						(document as Doc<'importsRecouvrement'>).statut === 'LECTURE'
					: (document as Doc<'pieces'>).statut === 'EN_LECTURE';
			const refuse =
				ref.genre === 'IMPORT'
					? (document as Doc<'importsRecouvrement'>).statut === 'ECHOUE'
					: (document as Doc<'pieces'>).statut === 'ECHEC';
			if (enCours)
				throw new ConvexError(
					'Ce document se met au coffre : il s’ouvrira dans quelques secondes.'
				);
			if (refuse)
				throw new ConvexError('Ce fichier a été refusé à son arrivée : il n’a pas été conservé.');
		}

		const jeton = jetonNeuf();
		await ctx.db.insert('ticketsCoffre', {
			organizationId,
			jeton,
			...(ref.genre === 'IMPORT' ? { importId: ref.id } : { pieceId: ref.id }),
			geste,
			userId: user._id,
			expireLe: Date.now() + DUREE_DU_JETON_MS
		});
		await journaliser(ctx, {
			organizationId,
			...(ref.genre === 'IMPORT' ? { importId: ref.id } : { pieceId: ref.id }),
			nomDocument: document.filename,
			geste,
			userId: user._id
		});
		const site = process.env.CONVEX_SITE_URL;
		if (site === undefined)
			throw new ConvexError('L’adresse du coffre est inconnue sur ce déploiement.');
		return { jeton, adresse: `${site}/coffre/ouvrir` };
	}
});

/**
 * RETIRER UN DOCUMENT DU COFFRE — son fichier est effacé ; le journal garde la
 * trace du retrait. Une pièce retirée cesse de soutenir ses dossiers (leur
 * solidité se recalcule) ; les factures entrées par un dépôt restent, sans leur
 * document source.
 */
export const retirerDuCoffre = authedMutation({
	args: { ref: vRef },
	returns: v.null(),
	handler: async (ctx, { ref }): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		if (ref.genre === 'PIECE') {
			const nom = await retirerLaPiece(ctx, organizationId, ref.id);
			await journaliser(ctx, {
				organizationId,
				pieceId: ref.id,
				nomDocument: nom,
				geste: 'RETRAIT',
				userId: user._id
			});
			return null;
		}
		const depot = (await documentDe(ctx, organizationId, ref)) as Doc<'importsRecouvrement'>;
		// Une lecture TOMBÉE ne se reprend jamais : sans ce délai, son document
		// resterait au coffre pour toujours, « en cours ».
		const enLecture = depot.statut === 'EN_ATTENTE' || depot.statut === 'LECTURE';
		if (enLecture && Date.now() - depot.deposeLe < SANS_NOUVELLE_MS) {
			throw new ConvexError(
				'Ce document est en cours de lecture : il se retire une fois la lecture finie, ou après un quart d’heure sans nouvelle.'
			);
		}
		try {
			await ctx.storage.delete(depot.storageId);
		} catch {
			// Un fichier refusé à son arrivée a déjà été effacé.
		}
		await ctx.db.delete(depot._id);
		await journaliser(ctx, {
			organizationId,
			importId: ref.id,
			nomDocument: depot.filename,
			geste: 'RETRAIT',
			userId: user._id
		});
		return null;
	}
});
