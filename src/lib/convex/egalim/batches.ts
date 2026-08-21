import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation } from '../functions';
import { internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';
import { vFamille, vLabel } from './tables';

/**
 * Le dépôt de factures côté cantine : créer un lot, y verser des fichiers,
 * suivre leur traitement.
 *
 * Tout est borné à l'organisation de l'utilisateur courant, sans exception.
 */

/** Un lot est « ouvert » tant qu'il n'a pas produit son diagnostic. */
const STATUTS_OUVERTS = ['DRAFT', 'EXTRACTING', 'CLASSIFYING', 'REVIEW'] as const;

const vSourceType = v.union(
	v.literal('CSV'),
	v.literal('EXCEL'),
	v.literal('PDF_TEXT'),
	v.literal('PDF_SCAN'),
	v.literal('IMAGE'),
	v.literal('TEXTE')
);

const vStatutLot = v.union(
	v.literal('DRAFT'),
	v.literal('EXTRACTING'),
	v.literal('CLASSIFYING'),
	v.literal('REVIEW'),
	v.literal('READY'),
	v.literal('FAILED')
);

function extension(filename: string): string {
	const point = filename.lastIndexOf('.');
	return point === -1 ? '' : filename.slice(point + 1).toLowerCase();
}

/**
 * Type PROVISOIRE, déduit du seul nom de fichier. L'extraction le corrige une
 * fois le contenu ouvert : un `.txt` peut être un export CSV comme une facture
 * océrisée, et un PDF peut porter une couche texte ou n'être qu'une image.
 */
function sourceTypeProvisoire(filename: string, mimeType: string) {
	const ext = extension(filename);
	if (ext === 'csv' || ext === 'tsv') return 'CSV' as const;
	if (ext === 'xlsx' || ext === 'xls') return 'EXCEL' as const;
	if (ext === 'pdf' || mimeType === 'application/pdf') return 'PDF_TEXT' as const;
	if (mimeType.startsWith('image/')) return 'IMAGE' as const;
	if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'].includes(ext)) return 'IMAGE' as const;
	return 'TEXTE' as const;
}

/**
 * Crée un lot pour une période. Un seul lot ouvert à la fois par
 * organisation : deux lots ouverts en parallèle sur des périodes qui se
 * chevauchent produiraient deux diagnostics contradictoires sur les mêmes
 * achats.
 */
export const creerLot = authedMutation({
	args: {
		label: v.string(),
		periodStart: v.string(),
		periodEnd: v.string()
	},
	returns: v.id('invoiceBatches'),
	handler: async (ctx, { label, periodStart, periodEnd }) => {
		const { organizationId } = await getUserOrg(ctx);

		const lots = await ctx.db
			.query('invoiceBatches')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const ouvert = lots.find((l) =>
			(STATUTS_OUVERTS as readonly string[]).includes(l.status)
		);
		if (ouvert) {
			throw new ConvexError(
				`Un dépôt est déjà en cours (« ${ouvert.label} »). Terminez-le avant d'en ouvrir un autre.`
			);
		}

		return await ctx.db.insert('invoiceBatches', {
			organizationId,
			label,
			periodStart,
			periodEnd,
			status: 'DRAFT',
			uploadedBy: ctx.user._id,
			documentsTotal: 0,
			linesTotal: 0,
			labelsPendingReview: 0,
			createdAt: Date.now()
		});
	}
});

export const genererUrlDepot = authedMutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		// L'appartenance du fichier est établie à `enregistrerDocument`, qui
		// vérifie que le lot appartient bien à l'organisation de l'appelant.
		await getUserOrg(ctx);
		return await ctx.storage.generateUploadUrl();
	}
});

/**
 * Formats que l'extraction ne sait pas ouvrir. Les refuser ici, avec une
 * consigne, vaut mieux que de les laisser échouer plus loin : l'utilisateur
 * saurait seulement que « ça n'a pas marché », après une attente et un appel
 * facturé pour rien.
 */
const EXTENSIONS_REFUSEES: Record<string, string> = {
	xlsx: 'Depuis Excel ou LibreOffice, « Enregistrer sous » puis CSV.',
	xls: 'Depuis Excel ou LibreOffice, « Enregistrer sous » puis CSV.',
	ods: 'Depuis LibreOffice, « Enregistrer sous » puis CSV.',
	doc: 'Le format Word ne contient pas de tableau exploitable. Demandez le PDF ou l’export comptable.',
	docx:
		'Le format Word ne contient pas de tableau exploitable. Demandez le PDF ou l’export comptable.',
	zip: 'Décompressez l’archive et déposez les factures une par une.'
};

/**
 * Enregistre un fichier déposé et lance son extraction immédiatement. Le lot
 * passe en EXTRACTING dès le premier document.
 */
export const enregistrerDocument = authedMutation({
	args: {
		batchId: v.id('invoiceBatches'),
		storageId: v.id('_storage'),
		filename: v.string(),
		mimeType: v.string()
	},
	returns: v.id('invoiceDocuments'),
	handler: async (ctx, { batchId, storageId, filename, mimeType }) => {
		const { organizationId } = await getUserOrg(ctx);

		const batch = await ctx.db.get(batchId);
		if (!batch || batch.organizationId !== organizationId) {
			// Le fichier est déjà dans le stockage : on le retire plutôt que de
			// laisser un orphelin sans propriétaire.
			await ctx.storage.delete(storageId);
			throw new ConvexError('Lot introuvable');
		}

		const consigne = EXTENSIONS_REFUSEES[extension(filename)];
		if (consigne) {
			await ctx.storage.delete(storageId);
			throw new ConvexError(`Format non pris en charge : ${filename}. ${consigne}`);
		}

		// On n'accepte un fichier que sur un lot qui n'a pas encore quitté
		// l'extraction. Plus loin, l'ajout de lignes décalerait la liste triée
		// des libellés distincts que la classification parcourt par tranches :
		// elle en sauterait, ou en rejouerait. Et repasser le lot en EXTRACTING
		// déclencherait une SECONDE chaîne de classification en parallèle de
		// celle qui tourne.
		if (batch.status !== 'DRAFT' && batch.status !== 'EXTRACTING') {
			await ctx.storage.delete(storageId);
			throw new ConvexError(
				'Ce dépôt est déjà passé au traitement. Ouvrez un nouveau dépôt pour ajouter des factures.'
			);
		}

		const documentId = await ctx.db.insert('invoiceDocuments', {
			organizationId,
			batchId,
			storageId,
			filename,
			mimeType,
			sourceType: sourceTypeProvisoire(filename, mimeType),
			extractionStatus: 'PENDING',
			linesCount: 0
		});

		await ctx.db.patch(batchId, {
			documentsTotal: batch.documentsTotal + 1,
			status: 'EXTRACTING'
		});

		await ctx.scheduler.runAfter(0, internal.egalim.extraction.traiterDocument, { documentId });

		return documentId;
	}
});

/** L'avancement du lot, de quoi peindre l'écran sans second aller-retour. */
export const suivreLot = authedQuery({
	args: { batchId: v.id('invoiceBatches') },
	returns: v.union(
		v.object({
			label: v.string(),
			periodStart: v.string(),
			periodEnd: v.string(),
			status: vStatutLot,
			documents: v.array(
				v.object({
					documentId: v.id('invoiceDocuments'),
					filename: v.string(),
					sourceType: vSourceType,
					extractionStatus: v.union(
						v.literal('PENDING'),
						v.literal('DONE'),
						v.literal('FAILED')
					),
					extractionError: v.optional(v.string()),
					/** L'étape en cours, en clair. Vide dès que le fichier est lu. */
					extractionEtape: v.optional(v.string()),
					linesCount: v.number()
				})
			),
			linesTotal: v.number(),
			labelsPendingReview: v.number(),
			/**
			 * Le travail du classificateur, tel qu'il se donne à voir.
			 *
			 * `null` tant qu'aucun libellé n'est parti en classification. Ce bloc
			 * n'existe que pour l'écran de traitement : rien d'autre ne le lit,
			 * et le perdre ne perd aucune donnée opposable.
			 */
			classification: v.union(
				v.object({
					total: v.number(),
					faits: v.number(),
					echoues: v.number(),
					termine: v.boolean(),
					recents: v.array(
						v.object({
							label: v.string(),
							family: vFamille,
							qualifyingLabels: v.array(vLabel),
							isFood: v.boolean(),
							source: v.union(v.literal('CACHE'), v.literal('IA'))
						})
					)
				}),
				v.null()
			),
			diagnosticId: v.union(v.id('diagnostics'), v.null())
		}),
		v.null()
	),
	handler: async (ctx, { batchId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const batch = await ctx.db.get(batchId);
		if (!batch || batch.organizationId !== organizationId) return null;

		const documents = await ctx.db
			.query('invoiceDocuments')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.collect();

		const diagnostic = await ctx.db
			.query('diagnostics')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.first();

		const job = await ctx.db
			.query('classificationJobs')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.first();

		return {
			label: batch.label,
			periodStart: batch.periodStart,
			periodEnd: batch.periodEnd,
			status: batch.status,
			documents: documents.map((d) => ({
				documentId: d._id,
				filename: d.filename,
				sourceType: d.sourceType,
				extractionStatus: d.extractionStatus,
				extractionError: d.extractionError,
				extractionEtape: d.extractionEtape,
				linesCount: d.linesCount
			})),
			// `linesTotal` n'est arrêté qu'à la clôture de la classification :
			// avant, la somme des documents est la seule valeur juste.
			linesTotal:
				batch.linesTotal > 0
					? batch.linesTotal
					: documents.reduce((s, d) => s + d.linesCount, 0),
			labelsPendingReview: batch.labelsPendingReview,
			classification: job
				? {
						total: job.labelsTotal,
						faits: job.labelsDone,
						echoues: job.labelsFailed,
						termine: job.status !== 'RUNNING',
						recents: job.recents ?? []
					}
				: null,
			diagnosticId: diagnostic?._id ?? null
		};
	}
});

/** Les lots de l'organisation, du plus récent au plus ancien. */
export const listerLots = authedQuery({
	args: {},
	returns: v.array(
		v.object({
			batchId: v.id('invoiceBatches'),
			label: v.string(),
			periodStart: v.string(),
			periodEnd: v.string(),
			status: vStatutLot,
			documentsTotal: v.number(),
			linesTotal: v.number(),
			labelsPendingReview: v.number(),
			createdAt: v.number(),
			ouvert: v.boolean()
		})
	),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const lots = await ctx.db
			.query('invoiceBatches')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		return lots
			.sort((a, b) => b.createdAt - a.createdAt)
			.map((l) => ({
				batchId: l._id,
				label: l.label,
				periodStart: l.periodStart,
				periodEnd: l.periodEnd,
				status: l.status,
				documentsTotal: l.documentsTotal,
				linesTotal: l.linesTotal,
				labelsPendingReview: l.labelsPendingReview,
				createdAt: l.createdAt,
				ouvert: (STATUTS_OUVERTS as readonly string[]).includes(l.status)
			}));
	}
});

/**
 * Le dépôt courant de l'exercice, créé au besoin.
 *
 * EGalim se déclare par année civile : un exercice, une mesure. Le « lot » du
 * modèle de données EST donc l'exercice, et il n'a aucune raison d'exister dans
 * la tête du gérant. Demander d'« ouvrir un dépôt » et de le nommer, c'était
 * faire remonter jusqu'à l'écran une contrainte du moteur de classification.
 *
 * Cette mutation rend le geste unique : on dépose des factures, le reste se
 * décide tout seul.
 *
 * Elle ne crée jamais un second lot pour un exercice qui en a déjà un capable
 * d'accepter des fichiers, et elle refuse explicitement d'en ouvrir un pendant
 * qu'un autre est en traitement — c'est la contrainte que `creerLot` protège
 * déjà, et pour la même raison : deux lots qui se chevauchent produiraient deux
 * mesures partielles du même exercice.
 */
export const obtenirOuCreerDepot = authedMutation({
	args: { annee: v.string() },
	returns: v.object({
		batchId: v.id('invoiceBatches'),
		accepteDesFichiers: v.boolean(),
		status: vStatutLot
	}),
	handler: async (ctx, { annee }) => {
		const { organizationId } = await getUserOrg(ctx);

		const lots = await ctx.db
			.query('invoiceBatches')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		// Un lot qui accepte encore des fichiers : on y verse, quel que soit son
		// nom. C'est le cas courant.
		const accueillant = lots.find((l) => l.status === 'DRAFT' || l.status === 'EXTRACTING');
		if (accueillant) {
			return { batchId: accueillant._id, accepteDesFichiers: true, status: accueillant.status };
		}

		// Un lot en traitement bloque l'ouverture du suivant. On le dit avec son
		// état, pour que l'écran explique où en est la lecture plutôt que de
		// renvoyer une erreur nue.
		const enTraitement = lots.find((l) => l.status === 'CLASSIFYING' || l.status === 'REVIEW');
		if (enTraitement) {
			return { batchId: enTraitement._id, accepteDesFichiers: false, status: enTraitement.status };
		}

		const batchId = await ctx.db.insert('invoiceBatches', {
			organizationId,
			label: `Exercice ${annee}`,
			periodStart: `${annee}-01-01`,
			periodEnd: `${annee}-12-31`,
			status: 'DRAFT',
			uploadedBy: ctx.user._id,
			documentsTotal: 0,
			linesTotal: 0,
			labelsPendingReview: 0,
			createdAt: Date.now()
		});
		return { batchId, accepteDesFichiers: true, status: 'DRAFT' as const };
	}
});
