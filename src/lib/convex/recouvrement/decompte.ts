import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { depuisCentimes, enCentimes, fraction, versEuros } from '../../socle/montants';
import { controlerDecompte } from '../../verticales/recouvrement/controle';
import {
	decompterCreance,
	type ConventionJours,
	type DecompteCreance,
	type FacturePourDecompte,
	type PeriodeDeTaux,
	type Reglement
} from '../../verticales/recouvrement/decompte';
import { periodesDeTauxParDefaut } from '../../verticales/recouvrement/pays/france/taux';
import { PARAMETRES, exiger } from '../../verticales/recouvrement/parametres';
import { ajouterJours } from '../../verticales/recouvrement/calendrier';
import { vConventionJours, vImputation, vImputationDuDecompte, vTaux } from './tables';

/**
 * La production d'un décompte, et son gel.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI ON L'ARCHIVE ALORS QU'IL EST REPRODUCTIBLE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le calcul est déterministe : rejoué dans six mois à la même date d'arrêté, il
 * rend le même centime. On pourrait donc ne rien stocker.
 *
 * On stocke quand même, parce que la question n'est pas « combien réclame-t-on
 * aujourd'hui » mais « qu'a-t-on réclamé le jour où on l'a réclamé ». Un
 * règlement enregistré après coup, une facture rattachée plus tard, une
 * correction d'exigibilité : tout cela change le calcul sans changer le passé.
 * Le décompte qui a chiffré un acte doit survivre à l'évolution des données qui
 * l'ont produit.
 *
 * D'où la règle : **rejouer produit un NOUVEAU décompte, daté. Jamais une
 * modification du précédent.** Même discipline que les `diagnostics` d'EGalim.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE TAUX VIENT DU CONTRAT, OU DE LA LOI
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Si la facture porte un taux contractuel, il s'applique sur toute la période.
 * Sinon on tombe sur la série légale française — le taux BCE majoré de dix
 * points, réancré chaque semestre — et la période se découpe d'elle-même.
 *
 * Un semestre absent de la série fait ÉCHOUER le décompte en le nommant. C'est
 * voulu : extrapoler le dernier taux connu produirait un chiffre faux qui a
 * l'air juste, et personne ne s'en apercevrait avant que le débiteur ne refasse
 * le calcul.
 */

async function reglementsDe(
	ctx: QueryCtx,
	factureId: Doc<'facturesVente'>['_id']
): Promise<Reglement[]> {
	const lignes = await ctx.db
		.query('reglements')
		.withIndex('by_facture', (q) => q.eq('factureId', factureId))
		.collect();

	return lignes.map((ligne) => ({
		date: ligne.date,
		montant: depuisCentimes(ligne.montant),
		nature: ligne.nature
	}));
}

/**
 * Les périodes de taux applicables à une facture.
 *
 * Un taux contractuel vaut pour toute la durée : c'est une stipulation, elle ne
 * se réancre pas. À défaut, la série légale, qui change deux fois par an.
 */
function periodesDe(facture: Doc<'facturesVente'>, arreteAu: string): PeriodeDeTaux[] {
	const debut = facture.dateExigibilite!;

	if (facture.tauxContractuel !== undefined) {
		return [
			{
				debut,
				taux: fraction(facture.tauxContractuel.numerateur, facture.tauxContractuel.denominateur)
			}
		];
	}

	return periodesDeTauxParDefaut(debut, arreteAu);
}

/**
 * Pourquoi un décompte ne se calcule pas, quand il ne se calcule pas.
 *
 * Trois motifs, et chacun se répare par un geste différent : une créance sans
 * facture, une facture sans date d'exigibilité, un calcul que le référentiel
 * refuse (un semestre absent de la série de taux, par exemple). Les confondre
 * en « échec » enverrait le gérant chercher la panne au mauvais endroit.
 */
export type MotifRefusDecompte = 'AUCUNE_FACTURE' | 'EXIGIBILITE_MANQUANTE' | 'CALCUL_IMPOSSIBLE';

export interface ProjectionDecompte {
	/** Le décompte tel qu'il serait arrêté à cette date. `null` quand il ne se calcule pas. */
	readonly decompte: DecompteCreance | null;
	/** Le motif nommé, quand il ne se calcule pas. `null` sinon. Jamais les deux. */
	readonly refus: { readonly motif: MotifRefusDecompte; readonly detail: string } | null;
}

/**
 * LE DÉCOMPTE QU'ON OBTIENDRAIT, SANS RIEN ÉCRIRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI ELLE NE LÈVE PAS, ALORS QUE `figerDecompte` LÈVE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `figerDecompte` est une MUTATION : elle lève, la transaction n'écrit rien, et
 * l'écran affiche le message. Une QUERY qui lève, elle, ne rend pas un refus :
 * elle rend un écran en erreur, et le gérant ne lit ni ce qui manque, ni ce que
 * l'attente coûte. C'est exactement le mur que D0 interdit.
 *
 * Elle rend donc le motif NOMMÉ, et son appelant compose le refus en quatre
 * parties. Ce n'est pas un repli silencieux : la donnée fausse n'existe pas ici,
 * il n'y a qu'une donnée ABSENTE, et elle est dite.
 *
 * ⚠️ ET C'EST `figerDecompte` QUI L'APPELLE, pas l'inverse. Deux calculs de
 * projection, l'un pour l'écran d'arrêt et l'autre pour le gel, se seraient
 * séparés au premier changement de règle : l'écran aurait annoncé un total que
 * le gel n'aurait pas produit.
 */
export async function projeterDecompte(
	ctx: QueryCtx,
	creance: Doc<'creances'>,
	arreteAu: string,
	convention: ConventionJours
): Promise<ProjectionDecompte> {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
		.collect();

	/*
	  ⚠️ L'ORDRE DU DOSSIER L'EMPORTE, PUIS CELUI DE L'ÉTABLISSEMENT, PUIS RIEN.

	  L'ordre d'imputation dépend des conditions générales du créancier : il est
	  le même sur tous ses dossiers, et il était pourtant demandé dossier par
	  dossier (audit du 29/09/2026, F2). Le réglage de l'établissement sert de
	  défaut ; il ne réécrit jamais le choix d'un dossier, et un décompte déjà
	  figé garde de toute façon l'ordre de son jour.

	  ⚠️ ET « PAS CHOISI » N'EST PAS « LES PÉNALITÉS D'ABORD ». Sans réglage ni
	  choix, on reste sur `A_CONFIRMER`, qui chiffre les DEUX ordres et retient le
	  plus bas : le doute ne profite jamais au produit.
	*/
	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', creance.organizationId))
		.first();
	const ordre = creance.ordreImputation ?? profil?.ordreImputationParDefaut ?? 'A_CONFIRMER';

	if (factures.length === 0) {
		return {
			decompte: null,
			refus: {
				motif: 'AUCUNE_FACTURE',
				detail: 'Cette créance ne porte aucune facture : il n’y a rien à décompter.'
			}
		};
	}

	for (const facture of factures) {
		if (facture.dateExigibilite === undefined) {
			return {
				decompte: null,
				refus: {
					motif: 'EXIGIBILITE_MANQUANTE',
					detail:
						`La facture ${facture.reference} n’a pas de date d’exigibilité. Les intérêts ` +
						'courent à compter de cette date : sans elle, le décompte serait arbitraire. ' +
						'La renseigner avant de décompter.'
				}
			};
		}
	}

	// ⚠️ LA CONSTRUCTION EST DANS LE `try`, ET PAS SEULEMENT LE CALCUL.
	// `periodesDe` lève quand un semestre manque à la série légale, et ce
	// refus-là est précisément celui qu'il ne faut pas laisser remonter en écran
	// cassé : un décompte qui ne se calcule pas se DIT, il ne s'affiche pas en
	// page blanche.
	// ⚠️ LE JUGEMENT D'OUVERTURE ARRÊTE LES PÉNALITÉS (L622-28). Quand il est connu et
	// antérieur à l'arrêté, le calcul s'arrête à la veille, par prudence : le texte ne
	// dit pas si le jour même du jugement produit des pénalités. Et une facture dont l'échéance tombe ce jour-là
	// ou après ne porte pas de frais de recouvrement (L441-10 II).
	const debiteur = await ctx.db.get(creance.debiteurId);
	const jugement = debiteur?.annonceOuverture?.dateJugement;
	const arretEffectif =
		jugement !== undefined && jugement <= arreteAu && exiger(PARAMETRES.arretCoursInterets)
			? ajouterJours(jugement, -1)
			: arreteAu;

	try {
		const pourDecompte: FacturePourDecompte[] = [];
		for (const facture of factures) {
			pourDecompte.push({
				reference: facture.reference,
				montantExigible: depuisCentimes(facture.montantTTC),
				dateExigibilite: facture.dateExigibilite!,
				reglements: await reglementsDe(ctx, facture._id),
				taux: periodesDe(facture, arretEffectif),
				...(jugement === undefined ? {} : { jugementOuvertureLe: jugement })
			});
		}
		return {
			decompte: decompterCreance(pourDecompte, arretEffectif, convention, ordre),
			refus: null
		};
	} catch (erreur) {
		return {
			decompte: null,
			refus: {
				motif: 'CALCUL_IMPOSSIBLE',
				// Le message du domaine, MOT POUR MOT. Il nomme le semestre absent ou
				// la date impossible ; le remplacer par « calcul impossible » perdrait
				// la seule information qui dit quoi corriger.
				detail: erreur instanceof Error ? erreur.message : String(erreur)
			}
		};
	}
}

/**
 * CE QU'UN DÉCOMPTE ENREGISTRE, EN CENTIMES : la même forme pour celui qu'on
 * fige et pour celui qu'un aperçu montre avant de le figer. Deux écritures se
 * seraient séparées au premier champ ajouté, et l'aperçu d'un courrier aurait
 * annoncé un chiffre que le courrier préparé n'aurait pas porté.
 *
 * ⚠️ LA DATE EST CELLE DU CALCUL, PAS CELLE DEMANDÉE. Quand le jugement
 * d'ouverture d'une procédure collective est connu, le calcul s'arrête à sa
 * veille (L622-28) : c'est cette date-là que le décompte porte.
 */
export function enregistrementDe(decompte: DecompteCreance) {
	return {
		arreteAu: decompte.arreteAu,
		convention: decompte.convention,
		principalRestantDu: enCentimes(decompte.principalRestantDu),
		interets: enCentimes(decompte.interets),
		indemniteForfaitaire: enCentimes(decompte.indemniteForfaitaire),
		total: enCentimes(decompte.total),
		imputation: {
			ordre: decompte.imputation.ordre,
			confirme: decompte.imputation.confirme,
			...(decompte.imputation.totalAutreOrdre === null
				? {}
				: { totalAutreOrdre: enCentimes(decompte.imputation.totalAutreOrdre) })
		},
		lignes: decompte.lignes.map((ligne) => ({
			reference: ligne.reference,
			principalRestantDu: enCentimes(ligne.principalRestantDu),
			interets: enCentimes(ligne.interets),
			indemniteForfaitaire: enCentimes(ligne.indemniteForfaitaire),
			total: enCentimes(ligne.total),
			// Les segments SONT la preuve. Sans eux, le total est un chiffre
			// qu'on demande de croire ; avec eux, il se refait à la main.
			segments: ligne.segments.map((segment) => ({
				debut: segment.debut,
				fin: segment.fin,
				jours: segment.jours,
				principal: enCentimes(segment.principal),
				taux: {
					numerateur: segment.taux.numerateur,
					denominateur: segment.taux.denominateur
				},
				baseAnnuelle: segment.baseAnnuelle,
				interets: enCentimes(segment.interets)
			})),
			// Ce que chaque règlement a éteint. Sans cette ligne, la somme des
			// périodes dépasse les intérêts dus et le total ne se refait plus.
			imputations: ligne.imputations.map((imputation) => ({
				date: imputation.date,
				nature: imputation.nature,
				montant: enCentimes(imputation.montant),
				surInterets: enCentimes(imputation.surInterets),
				surPrincipal: enCentimes(imputation.surPrincipal)
			}))
		}))
	};
}

/**
 * FIGER UN DÉCOMPTE — l'écriture, et rien d'autre. Ses appelants disent pourquoi
 * (`daterLeDecompte`), et elle fait confiance à leur choix de date.
 */
export async function figer(
	ctx: MutationCtx,
	creance: Doc<'creances'>,
	arreteAu: string,
	convention: ConventionJours
): Promise<Id<'decomptes'>> {
	// ⚠️ LE MÊME CALCUL QUE LE MONTANT DU JOUR, ET C'EST LE POINT. La projection
	// rend un motif nommé là où le gel doit lever : une mutation qui échoue
	// n'écrit rien, et son message remonte tel quel.
	const projection = await projeterDecompte(ctx, creance, arreteAu, convention);
	if (projection.decompte === null) {
		throw new ConvexError(projection.refus!.detail);
	}
	const decompte = projection.decompte;

	// LES IDENTITES SE FIGENT AVEC LE CHIFFRE. Un decompte part chez un tiers ;
	// regenere plus tard, il doit dire la MEME chose — y compris qui reclamait a
	// qui. Les relire au moment du rendu ferait porter a la piece un nom que le
	// debiteur n'avait pas le jour de l'arrete.
	//
	// Aucun des deux n'est exige : le profil creancier est facultatif, et un
	// decompte reste un decompte. Refuser de le produire pour un en-tete
	// manquant transformerait une gene d'affichage en blocage de calcul.
	const debiteur = await ctx.db.get(creance.debiteurId);
	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', creance.organizationId))
		.first();

	return await ctx.db.insert('decomptes', {
		organizationId: creance.organizationId,
		creanceId: creance._id,
		...enregistrementDe(decompte),
		creancier:
			profil === null
				? undefined
				: {
						denomination: profil.denomination,
						siren: profil.siren,
						adresse: profil.adresse
					},
		debiteur:
			debiteur === null
				? undefined
				: {
						denomination: debiteur.denomination,
						siren: debiteur.siren,
						adresse: debiteur.adresse
					},
		produitLe: Date.now()
	});
}

export const figerDecompte = internalMutation({
	args: {
		creanceId: v.id('creances'),
		arreteAu: v.string(),
		convention: vConventionJours
	},
	returns: v.id('decomptes'),
	handler: async (ctx, { creanceId, arreteAu, convention }): Promise<Id<'decomptes'>> => {
		const creance = await ctx.db.get(creanceId);
		if (creance === null) throw new ConvexError('Créance introuvable');
		return await figer(ctx, creance, arreteAu, convention);
	}
});

/**
 * LE MONTANT QU'UN DOCUMENT RÉCLAME AUJOURD'HUI (09/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉCOMPTE NE S'ARRÊTE PLUS : IL SE DATE QUAND ON RÉCLAME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « si on veut un décompte à date, on a juste besoin de le
 * réclamer, pas besoin de l'arrêter […] tant que le débiteur n'a pas remboursé,
 * je ne vois pas pourquoi on devrait arrêter le décompte ». Il a raison : les
 * pénalités courent jusqu'au paiement (L441-10 II), et seul le jugement
 * d'ouverture d'une procédure collective en arrête le cours (L622-28), ce que
 * le calcul fait déjà de lui-même. « Arrêté au 9 octobre » veut dire « compté
 * jusqu'au 9 octobre » ; la lettre le dit : les pénalités courues après n'y sont
 * pas comprises.
 *
 * Il fallait pourtant « arrêter le décompte » avant toute lettre officielle,
 * tout accord, toute page de paiement : un écran, deux cases, un geste
 * « irréversible » qui ne l'était pour personne. Désormais chaque document qui
 * réclame un chiffre le date au jour où il se prépare (`daterLeDecompte`), et
 * ce chiffre-là est figé avec lui. La question « qu'a-t-on réclamé le jour où on
 * l'a réclamé » garde sa réponse ; personne n'a plus à la préparer à la main.
 *
 * ⚠️ UN SEUL DÉCOMPTE PAR JOUR ET PAR DOSSIER, TANT QUE RIEN NE BOUGE. Le
 * dernier décompte daté sert de nouveau s'il dit EXACTEMENT ce que dirait le
 * calcul du jour : même date, mêmes factures, même total. Un règlement arrivé à
 * midi en fait dater un second.
 */
export interface DecompteDuJour {
	/** Le dernier décompte daté, quand il dit encore ce que dirait le calcul du jour. */
	readonly date: Doc<'decomptes'> | null;
	/** Le calcul du jour, en centimes ; `null` quand il ne se fait pas. */
	readonly calcul: ReturnType<typeof enregistrementDe> | null;
	/** Pourquoi il ne se fait pas, nommé. */
	readonly refus: ProjectionDecompte['refus'];
}

export async function decompteDuJour(
	ctx: QueryCtx,
	creance: Doc<'creances'>,
	aujourdHui: string
): Promise<DecompteDuJour> {
	const projection = await projeterDecompte(ctx, creance, aujourdHui, 'ACT_365');
	if (projection.decompte === null) return { date: null, calcul: null, refus: projection.refus };
	const calcul = enregistrementDe(projection.decompte);
	const dernier = (
		await ctx.db
			.query('decomptes')
			.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
			.order('desc')
			.take(1)
	)[0];
	const concorde =
		dernier !== undefined &&
		dernier.organizationId === creance.organizationId &&
		dernier.arreteAu === calcul.arreteAu &&
		dernier.convention === calcul.convention &&
		dernier.total === calcul.total &&
		dernier.principalRestantDu === calcul.principalRestantDu &&
		dernier.lignes.length === calcul.lignes.length &&
		dernier.lignes.every(
			(ligne, i) =>
				ligne.reference === calcul.lignes[i]!.reference && ligne.total === calcul.lignes[i]!.total
		);
	return { date: concorde ? dernier : null, calcul, refus: null };
}

/**
 * DATER LE MONTANT QU'UN DOCUMENT RÉCLAME — le figer au jour où il se prépare.
 *
 * Appelée par ce qui part chez un tiers avec un chiffre : la lettre officielle
 * (préparée à la main ou par le pilote), l'accord écrit, la déclaration, la
 * lettre à l'avocat, la page où le client paie, la remise au conseil.
 *
 * ⚠️ CE QUE LE LOGICIEL NE VOIT PAS EST DIT, PAS COCHÉ. Un avoir ou un
 * règlement qui n'est pas noté changerait ce montant : le gérant l'affirme en
 * validant le document qui le porte, ou en confirmant le geste de Plume, et le
 * texte invite le client à signaler un règlement parti depuis.
 */
export async function daterLeDecompte(
	ctx: MutationCtx,
	{
		creance,
		aujourdHui,
		pour,
		auteur,
		userId
	}: {
		readonly creance: Doc<'creances'>;
		readonly aujourdHui: string;
		/** Ce qui le réclame, dit au journal : « la lettre de relance officielle ». */
		readonly pour: string;
		readonly auteur: 'GERANT' | 'MACHINE';
		readonly userId?: string;
	}
): Promise<{ readonly decompte: Doc<'decomptes'> } | { readonly refus: string }> {
	const jour = await decompteDuJour(ctx, creance, aujourdHui);
	if (jour.calcul === null) {
		return { refus: jour.refus?.detail ?? 'Ce que votre client vous doit ne se calcule pas.' };
	}
	if (jour.date !== null) return { decompte: jour.date };

	const decompteId = await figer(ctx, creance, aujourdHui, 'ACT_365');
	const decompte = (await ctx.db.get(decompteId))!;
	await ctx.db.insert('journal', {
		organizationId: creance.organizationId,
		cible: decompteId as string,
		cle: 'DECOMPTE_DATE',
		apres:
			`Montant daté au ${decompte.arreteAu} : ${versEuros(depuisCentimes(decompte.total))} €, ` +
			`sur ${decompte.lignes.length} facture(s), pour ${pour}. Les pénalités continuent de ` +
			'courir après cette date, jusqu’au paiement.',
		source: `Pour ${pour}`,
		auteur,
		...(userId === undefined ? {} : { auteurUserId: userId }),
		consigneLe: Date.now()
	});
	return { decompte };
}

/**
 * ⚠️ `produire` A ÉTÉ RETIRÉE LE 17 SEPTEMBRE 2026, ET C'EST UNE SUPPRESSION DE
 * PORTE DÉROBÉE, PAS UN MÉNAGE.
 *
 * C'était l'entrée authentifiée du gel : un bouton, une mutation, un décompte
 * figé. Elle ne passait par AUCUN contrôle de complétude. `controle.ts` chiffrait
 * bien ce qui serait abandonné, mais APRÈS coup, à la relecture du décompte
 * produit : au moment où plus rien ne se corrige.
 *
 * Le gel passe désormais par `recouvrement/arret.ts`, qui rejoue le contrôle
 * côté serveur, exige les trois réponses du pré-vol et inscrit au journal ce
 * qui est laissé de côté. Garder les deux portes aurait laissé la plus courte
 * ouverte, et une barrière qu'on peut contourner n'est pas une barrière.
 *
 * `figerDecompte` reste, en `internalMutation` : elle fait confiance à son
 * appelant, et il n'y en a plus qu'un.
 */

/**
 * Le dernier décompte arrêté, celui que l'écran montre — et ce qu'il ne couvre
 * pas.
 *
 * Les précédents ne sont pas supprimés : ils prouvent ce qui était réclamé aux
 * dates où on l'a réclamé. Ils ne sont simplement pas ce qu'on regarde d'abord.
 *
 * ⚠️ LES ABANDONS SONT RENDUS AVEC LE DÉCOMPTE, ET C'EST NOUVEAU.
 * `controlerDecompte` les chiffrait depuis longtemps — et AUCUNE requête ne
 * l'appelait. Un module écrit, testé, et injoignable.
 *
 * C'est la différence entre une pièce et un extrait : un tiers qui reçoit le
 * décompte doit voir ce qui n'y figure PAS, parce qu'une facture laissée de côté
 * ne pourra plus être réclamée au titre de cette procédure.
 *
 * ⚠️ ILS SE RECALCULENT À LA LECTURE, ET C'EST VOULU. Le décompte est figé ; ce
 * qui l'entoure ne l'est pas. Une facture importée APRÈS l'arrêté doit apparaître
 * comme non couverte — c'est même le cas le plus utile, puisqu'il dit au gérant
 * qu'il faut refaire un décompte avant d'agir.
 */
/**
 * Les trois espèces d'abandon, telles que `controle.ts` les nomme.
 *
 * ⚠️ DÉCLARÉ ICI ET PAS AU SCHÉMA, parce qu'aucune table ne le porte : un
 * abandon n'est jamais stocké, il se recalcule à chaque lecture contre les
 * factures connues du jour. C'est le contrat de sortie de `controlerDecompte`,
 * et il vit à l'endroit où ce contrat traverse Convex.
 *
 * Les trois valeurs sont recopiées de `NatureAbandon` (`controle.ts:28-34`) ;
 * TypeScript refuse l'affectation le jour où l'une des deux listes bouge sans
 * l'autre, ce qui est exactement la barrière qu'on veut ici.
 */
export const vNatureAbandon = v.union(
	v.literal('FACTURE_ECARTEE'),
	v.literal('INTERETS_INEXPLIQUES'),
	v.literal('PARAMETRE_MANQUANT')
);

/** L'identite figee, telle que le decompte la porte. Facultative sur les
 * decomptes produits avant le gel. */
const vIdentiteFigee = v.optional(
	v.object({
		denomination: v.string(),
		siren: v.optional(v.string()),
		adresse: v.optional(v.string())
	})
);

const vDernierDecompte = v.object({
	/**
	 * L'IDENTIFIANT DE LA PIÈCE, et il manquait.
	 *
	 * Cette requête compose un décompte ; elle ne rendait donc aucun identifiant,
	 * et la pièce arrêtée n'avait aucune adresse atteignable depuis la créance qui
	 * la porte. On ne pouvait la retrouver qu'en relisant toute la table.
	 */
	_id: v.id('decomptes'),
	arreteAu: v.string(),
	convention: vConventionJours,
	principalRestantDu: v.int64(),
	interets: v.int64(),
	indemniteForfaitaire: v.int64(),
	total: v.int64(),
	creancier: vIdentiteFigee,
	debiteur: vIdentiteFigee,
	lignes: v.array(
		v.object({
			reference: v.string(),
			principalRestantDu: v.int64(),
			interets: v.int64(),
			indemniteForfaitaire: v.int64(),
			total: v.int64(),
			segments: v.array(
				v.object({
					debut: v.string(),
					fin: v.string(),
					jours: v.number(),
					principal: v.int64(),
					taux: vTaux,
					baseAnnuelle: v.number(),
					interets: v.int64()
				})
			),
			imputations: v.optional(v.array(vImputation))
		})
	),
	imputation: v.optional(vImputationDuDecompte),
	abandons: v.array(
		v.object({
			/**
			 * CE QU'ON ABANDONNE, ET PAS SEULEMENT COMBIEN.
			 *
			 * ⚠️ LE CHAMP EXISTAIT AU DOMAINE ET NE TRAVERSAIT PAS CONVEX.
			 * `controle.ts:35` le porte depuis le premier jour ; ce validateur ne le
			 * déclarait pas, donc l'écran recevait trois abandons d'espèces
			 * différentes — une facture écartée, des intérêts qu'aucune période ne
			 * justifie, un paramètre juridique absent — sous une seule forme, et ne
			 * pouvait ni les grouper ni les traiter différemment. Or le geste qui
			 * lève chacun n'a rien à voir avec celui qui lève les autres.
			 */
			nature: vNatureAbandon,
			/** La référence de facture, ou la clé du paramètre. */
			reference: v.string(),
			/** `null` quand la perte n'est pas chiffrable — un paramètre absent. */
			montantEnJeu: v.union(v.int64(), v.null()),
			explication: v.string()
		})
	)
});

/**
 * Ce qu'un décompte figé n'a PAS couvert, recalculé contre les factures d'aujourd'hui.
 *
 * ⚠️ EXPORTÉE, ET C'EST VOULU : trois surfaces la lisent — la fiche de créance,
 * l'écran d'arrêt et la pièce (`/app/decompte/$id`). Une seconde écriture du
 * même contrôle se serait mise à dire autre chose au premier ajustement, sur le
 * garde-fou le plus important du produit.
 *
 * ⚠️ FONCTION DE MODULE, PAS FONCTION CONVEX : aucune référence
 * `internal.<module>`, donc aucun cycle d'inférence.
 */
export async function abandonsDuDecompte(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	decompte: Doc<'decomptes'>
): Promise<
	Array<{
		nature: 'FACTURE_ECARTEE' | 'INTERETS_INEXPLIQUES' | 'PARAMETRE_MANQUANT';
		reference: string;
		montantEnJeu: bigint | null;
		explication: string;
	}>
> {
	const creance = await ctx.db.get(decompte.creanceId);

	// TOUTES les factures du MÊME débiteur : c'est la comparaison avec cette
	// liste qui révèle l'oubli. Celles d'un autre débiteur n'ont rien à faire
	// dans ce décompte : les annoncer « abandonnées » serait un faux positif, et
	// la pièce perdrait sa crédibilité au premier lecteur attentif.
	const facturesConnues =
		creance === null || creance.organizationId !== organizationId
			? []
			: (
					await ctx.db
						.query('facturesVente')
						.withIndex('by_debiteur', (q) => q.eq('debiteurId', creance.debiteurId))
						.collect()
				)
					.filter((facture) => facture.organizationId === organizationId)
					.map((facture) => ({
						reference: facture.reference,
						montantExigible: depuisCentimes(facture.montantTTC)
					}));

	// ⚠️ `parametresRequis` N'EST PAS PASSÉ, ici comme chez les deux autres
	// appelants. L'étage `PARAMETRE_MANQUANT` de `controle.ts` ne peut donc pas
	// se produire, et l'écran qui lit ceci le DIT plutôt que de laisser croire à
	// un verrou qui ne mord pas.
	const controle = controlerDecompte({
		decompte: {
			lignes: decompte.lignes.map((ligne) => ({
				reference: ligne.reference,
				principalRestantDu: depuisCentimes(ligne.principalRestantDu),
				interets: depuisCentimes(ligne.interets),
				indemniteForfaitaire: depuisCentimes(ligne.indemniteForfaitaire),
				total: depuisCentimes(ligne.total),
				segments: ligne.segments.map((segment) => ({
					debut: segment.debut,
					fin: segment.fin,
					jours: segment.jours,
					principal: depuisCentimes(segment.principal),
					taux: fraction(segment.taux.numerateur, segment.taux.denominateur),
					baseAnnuelle: segment.baseAnnuelle,
					interets: depuisCentimes(segment.interets)
				})),
				// Un décompte figé avant le 25/09/2026 n'en porte pas : il imputait
				// tout au principal, et ses périodes font exactement ses intérêts.
				imputations: (ligne.imputations ?? []).map((imputation) => ({
					date: imputation.date,
					nature: imputation.nature,
					montant: depuisCentimes(imputation.montant),
					surInterets: depuisCentimes(imputation.surInterets),
					surPrincipal: depuisCentimes(imputation.surPrincipal)
				}))
			})),
			principalRestantDu: depuisCentimes(decompte.principalRestantDu),
			interets: depuisCentimes(decompte.interets),
			indemniteForfaitaire: depuisCentimes(decompte.indemniteForfaitaire),
			total: depuisCentimes(decompte.total),
			arreteAu: decompte.arreteAu,
			convention: decompte.convention
		},
		facturesConnues
	});

	return controle.abandons.map((abandon) => ({
		nature: abandon.nature,
		reference: abandon.reference,
		montantEnJeu: abandon.montantEnJeu === null ? null : enCentimes(abandon.montantEnJeu),
		explication: abandon.explication
	}));
}

async function composerDernierDecompte(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	creanceId: Id<'creances'>
) {
	const decomptes = await ctx.db
		.query('decomptes')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.order('desc')
		.take(1);

	const dernier = decomptes[0];
	if (dernier === undefined || dernier.organizationId !== organizationId) return null;

	return {
		_id: dernier._id,
		arreteAu: dernier.arreteAu,
		convention: dernier.convention,
		principalRestantDu: dernier.principalRestantDu,
		interets: dernier.interets,
		indemniteForfaitaire: dernier.indemniteForfaitaire,
		total: dernier.total,
		creancier: dernier.creancier,
		debiteur: dernier.debiteur,
		lignes: dernier.lignes,
		imputation: dernier.imputation,
		abandons: await abandonsDuDecompte(ctx, organizationId, dernier)
	};
}

/** Sans authentification — pour les tests et les tâches planifiées. */
export const dernierDecompteInterne = internalQuery({
	args: { organizationId: v.id('organizations'), creanceId: v.id('creances') },
	returns: v.union(v.null(), vDernierDecompte),
	handler: async (ctx, { organizationId, creanceId }) =>
		composerDernierDecompte(ctx, organizationId, creanceId)
});

export const dernierDecompte = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.union(v.null(), vDernierDecompte),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		return composerDernierDecompte(ctx, organizationId, creanceId);
	}
});

const vDecompteListe = v.object({
	_id: v.id('decomptes'),
	creanceId: v.id('creances'),
	/** Pour ouvrir le client depuis la rangée, sans relire la créance. */
	debiteurId: v.union(v.id('debiteurs'), v.null()),
	/**
	 * LA DÉNOMINATION FIGÉE QUAND IL Y EN A UNE, celle d'aujourd'hui sinon.
	 *
	 * Un décompte est une PIÈCE : il porte le nom que le débiteur avait le jour
	 * de l'arrêté, et ce nom-là est ce qu'on lit dans une liste de pièces. Les
	 * décomptes produits avant le gel des identités n'en portent pas ; on retombe
	 * alors sur la fiche courante, et `denominationFigee` dit lequel des deux on
	 * regarde — sans quoi une fusion de société ferait lire au gérant un nom
	 * qu'aucune de ses pièces ne porte.
	 */
	debiteur: v.string(),
	denominationFigee: v.boolean(),
	arreteAu: v.string(),
	principalRestantDu: v.int64(),
	interets: v.int64(),
	indemniteForfaitaire: v.int64(),
	total: v.int64(),
	produitLe: v.number()
});

/**
 * TOUS LES DÉCOMPTES DE L'ÉTABLISSEMENT, le plus récent d'abord.
 *
 * ⚠️ L'INDEX `decomptes.by_org` EXISTAIT ET N'ÉTAIT LU QUE PAR LA PURGE
 * (`rgpd.ts:85` et `:210`). Aucune lecture du produit ne partait de
 * l'établissement : on ne pouvait atteindre un décompte qu'en ouvrant d'abord la
 * créance qui le porte, donc en sachant déjà qu'il existait. Un gérant qui a
 * arrêté quatre décomptes le mois dernier n'avait aucun écran pour le constater.
 *
 * ⚠️ LECTURE NON BORNÉE, ASSUMÉE ET NOMMÉE. Un décompte s'arrête à la main, et
 * quelques dizaines par an et par établissement est l'ordre de grandeur. Le jour
 * où ce compte approche la limite de documents lus par transaction, cette requête
 * se pagine — nommer la limite ici en fait une dette surveillée plutôt qu'une
 * panne qui surgira sans prévenir, comme le fait déjà `planifierBattements`.
 */
export const listerDecomptes = authedQuery({
	args: {},
	returns: v.array(vDecompteListe),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const decomptes = await ctx.db
			.query('decomptes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		/** Le débiteur d'une créance, lu une fois par créance et pas une fois par décompte. */
		const debiteurParCreance = new Map<Id<'creances'>, Doc<'debiteurs'> | null>();

		const lignes = [];
		for (const decompte of decomptes) {
			if (!debiteurParCreance.has(decompte.creanceId)) {
				const creance = await ctx.db.get(decompte.creanceId);
				// Le cloisonnement est revérifié sur la créance : `decomptes.by_org`
				// garantit le décompte, pas ce qu'il désigne.
				const debiteur =
					creance === null || creance.organizationId !== organizationId
						? null
						: await ctx.db.get(creance.debiteurId);
				debiteurParCreance.set(
					decompte.creanceId,
					debiteur !== null && debiteur.organizationId === organizationId ? debiteur : null
				);
			}
			const debiteur = debiteurParCreance.get(decompte.creanceId) ?? null;

			lignes.push({
				_id: decompte._id,
				creanceId: decompte.creanceId,
				debiteurId: debiteur === null ? null : debiteur._id,
				debiteur: decompte.debiteur?.denomination ?? debiteur?.denomination ?? 'Débiteur inconnu',
				denominationFigee: decompte.debiteur !== undefined,
				arreteAu: decompte.arreteAu,
				principalRestantDu: decompte.principalRestantDu,
				interets: decompte.interets,
				indemniteForfaitaire: decompte.indemniteForfaitaire,
				total: decompte.total,
				produitLe: decompte.produitLe
			});
		}

		// Le plus récemment produit d'abord : c'est celui qu'on vient d'arrêter, et
		// celui qu'on cherche. L'ordre ne dépend pas de l'ordre d'insertion en base.
		return lignes.sort((a, b) => b.produitLe - a.produitLe);
	}
});

/**
 * UNE PIÈCE, À SON ADRESSE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN DÉCOMPTE SE LIT PAR SON PROPRE IDENTIFIANT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `dernierDecompte` rend « le dernier de cette créance » : une lecture qui
 * change de contenu quand on rejoue. Un décompte arrêté, lui, est FIGÉ et daté,
 * il part chez un tiers qui refera le calcul à la main, et la question qu'on lui
 * pose n'est pas « où en est-on » mais « qu'a-t-on réclamé le 16 septembre ».
 * Cette question n'a de réponse stable que si la pièce a une adresse à elle.
 *
 * ⚠️ LES ABANDONS SE RECALCULENT ICI AUSSI, contre les factures d'aujourd'hui.
 * Une facture importée APRÈS l'arrêté doit apparaître comme non couverte : c'est
 * même le cas le plus utile, puisqu'il dit qu'un nouveau décompte est à refaire
 * avant d'agir. La pièce, elle, ne bouge pas d'un centime.
 */
const vPieceArretee = v.object({
	...vDernierDecompte.fields,
	_id: v.id('decomptes'),
	creanceId: v.id('creances'),
	/** Pour ouvrir le client depuis la pièce, sans relire la créance. */
	debiteurId: v.union(v.id('debiteurs'), v.null()),
	/** La dénomination FIGÉE quand il y en a une, celle d'aujourd'hui sinon. */
	debiteurNom: v.string(),
	denominationFigee: v.boolean(),
	produitLe: v.number()
});

export const lireDecompte = authedQuery({
	args: { decompteId: v.id('decomptes') },
	returns: v.union(v.null(), vPieceArretee),
	handler: async (ctx, { decompteId }) => {
		const { organizationId } = await getUserOrg(ctx);

		const decompte = await ctx.db.get(decompteId);
		if (decompte === null || decompte.organizationId !== organizationId) return null;

		const creance = await ctx.db.get(decompte.creanceId);
		// Le cloisonnement est revérifié sur la créance : `decomptes` garantit le
		// décompte, pas ce qu'il désigne.
		const sienne = creance !== null && creance.organizationId === organizationId ? creance : null;
		const debiteur = sienne === null ? null : await ctx.db.get(sienne.debiteurId);
		const sien = debiteur !== null && debiteur.organizationId === organizationId ? debiteur : null;

		return {
			_id: decompte._id,
			creanceId: decompte.creanceId,
			debiteurId: sien === null ? null : sien._id,
			debiteurNom: decompte.debiteur?.denomination ?? sien?.denomination ?? 'Débiteur inconnu',
			denominationFigee: decompte.debiteur !== undefined,
			produitLe: decompte.produitLe,
			arreteAu: decompte.arreteAu,
			convention: decompte.convention,
			principalRestantDu: decompte.principalRestantDu,
			interets: decompte.interets,
			indemniteForfaitaire: decompte.indemniteForfaitaire,
			total: decompte.total,
			creancier: decompte.creancier,
			debiteur: decompte.debiteur,
			lignes: decompte.lignes,
			imputation: decompte.imputation,
			abandons: await abandonsDuDecompte(ctx, organizationId, decompte)
		};
	}
});
