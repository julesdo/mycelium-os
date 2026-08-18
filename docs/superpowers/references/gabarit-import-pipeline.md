# Gabarit — pipeline d'import avec revue humaine

Extrait de `src/lib/convex/fuelImport.ts` et `src/lib/convex/fuelParsers.ts` (Mycelium Fleet OS,
supprimés le 15/08/2026 — voir tâches 5-7 du plan de triage).

Transposition EGalim : « relevé carburant » → « facture fournisseur », « transaction » →
« ligne de facture », « anomalie » → « ligne sous seuil de confiance IA » (celle que la
Moulinette envoie en revue humaine plutôt que de classifier automatiquement).

## 1. Détection automatique de format

`detectProvider()` renifle la première ligne du CSV (en-têtes) pour deviner quel fournisseur
a émis le fichier, sans configuration préalable de l'utilisateur. Repose sur des marqueurs de
colonnes propres à chaque format (nom de colonne, séparateur, nombre de colonnes).

```ts
export type FuelProvider = 'TOTAL_CARDS' | 'BP_PLUS' | 'SHELL_FLEET' | 'GENERIC';

export function detectProvider(csv: string): FuelProvider {
	const first = (csv.split('\n')[0] ?? '').toLowerCase();
	if (first.includes('montant ttc') && first.includes('carte')) return 'TOTAL_CARDS';
	if (first.includes('gross amount') && first.includes('vehicle reg')) return 'BP_PLUS';
	if (first.split('\t').length > 5 && (first.includes('quantite') || first.includes('quantité')))
		return 'SHELL_FLEET';
	return 'GENERIC';
}

export function parseByProvider(csv: string, provider: FuelProvider): FuelTransaction[] {
	if (provider === 'TOTAL_CARDS') return parseTotalCards(csv);
	if (provider === 'BP_PLUS') return parseBPPlus(csv);
	if (provider === 'SHELL_FLEET') return parseShellFleet(csv);
	return parseGeneric(csv);
}

// Fallback générique quand aucun marqueur ne correspond : devine sur la
// forme du fichier (séparateur tabulation, ratio virgules/points-virgules).
function parseGeneric(csv: string): FuelTransaction[] {
	const first = csv.split('\n')[0] ?? '';
	if (first.includes('\t') && first.split('\t').length > 5) return parseShellFleet(csv);
	if (first.split(',').length > first.split(';').length) return parseBPPlus(csv);
	return parseTotalCards(csv);
}
```

Mécanisme : chaque fournisseur a un parseur dédié (`parseTotalCards`, `parseBPPlus`,
`parseShellFleet`) qui connaît la position exacte des colonnes et le séparateur (`;`, `,`,
`\t`). `detectProvider` est purement heuristique — aucun appel LLM, aucune configuration
utilisateur. Pour la Moulinette, ce rôle sera probablement repris par la détection du type de
document (CSV structuré vs PDF scanné) plutôt que par fournisseur, mais le principe (heuristique
rapide et gratuite avant tout traitement coûteux) reste identique.

## 2. Normalisation des lignes

Chaque parseur transforme une ligne brute en `FuelTransaction` typé, avec des helpers de
normalisation partagés (dates FR/ISO, nombres avec virgule décimale, CSV quoté).

```ts
export interface FuelTransaction {
	rawLine: string;
	date: Date;
	registration: string; // normalized
	liters: number;
	amount: number; // TTC en €
	station: string;
}

export function normalizeRegistration(raw: string): string {
	return raw
		.toUpperCase()
		.replace(/[\s.-]/g, '')
		.trim();
}

function parseDateStr(s: string): Date {
	const str = s.trim();
	// DD/MM/YYYY or DD-MM-YYYY
	const mDMY = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
	if (mDMY) {
		return new Date(`${mDMY[3]}-${mDMY[2].padStart(2, '0')}-${mDMY[1].padStart(2, '0')}`);
	}
	// YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str.slice(0, 10));
	return new Date(str);
}

function parseNum(s: string): number {
	const n = parseFloat((s ?? '').trim().replace(/\s/g, '').replace(',', '.'));
	return isNaN(n) ? 0 : n;
}

function splitCSVLine(line: string, sep: string): string[] {
	if (sep === ',') {
		// handle quoted fields
		const cols: string[] = [];
		let cur = '';
		let inQ = false;
		for (const ch of line) {
			if (ch === '"') {
				inQ = !inQ;
				continue;
			}
			if (ch === ',' && !inQ) {
				cols.push(cur.trim());
				cur = '';
				continue;
			}
			cur += ch;
		}
		cols.push(cur.trim());
		return cols;
	}
	return line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
}

// ─── Total Cards (séparateur ;) ───────────────────────────────────────────────
// Date;Heure;Carte;Véhicule;Immat;Produit;Litres;Montant HT;TVA;Montant TTC;Station
export function parseTotalCards(csv: string): FuelTransaction[] {
	return csv
		.split('\n')
		.slice(1) // skip header
		.map((l) => l.trim())
		.filter(Boolean)
		.map((line) => {
			const c = line.split(';');
			return {
				rawLine: line,
				date: parseDateStr(c[0] ?? ''),
				registration: normalizeRegistration(c[4] ?? ''),
				liters: parseNum(c[6] ?? '0'),
				amount: parseNum(c[9] ?? '0'),
				station: (c[10] ?? '').trim()
			};
		})
		.filter((t) => t.amount > 0 && t.registration.length >= 2);
}
```

Points à retenir : la ligne brute (`rawLine`) est conservée sur chaque transaction — elle sert
de clé métier pour la détection de doublons et pour l'affichage en cas d'anomalie (l'utilisateur
doit pouvoir voir exactement ce qui a été lu). Le filtre final (`amount > 0 && registration
valide`) élimine silencieusement les lignes vides ou corrompues sans faire échouer tout l'import.

Pour la Moulinette : « immatriculation normalisée » devient « libellé produit normalisé »
(minuscule, accents retirés, espaces compactés) — c'est la clé de regroupement avant l'envoi
à Claude, pour éviter de reclassifier deux fois « Tomates BIO » et « tomates bio ».

## 3. Règles d'anomalie

Trois règles simples, appliquées en mémoire après le matching véhicule, chacune produisant un
objet anomalie typé avec sévérité. Extrait de `processFuelImport` dans `fuelImport.ts` :

```ts
type AnomalyInfo = {
	t: (typeof transactions)[0];
	vehicleId: Id<'vehicles'>;
	type: 'WEEKEND_FILL' | 'ABNORMAL_VOLUME' | 'DUPLICATE';
	severity: 'HIGH' | 'MEDIUM' | 'LOW';
};
const anomalies: AnomalyInfo[] = [];
const anomalyLineKeys = new Set<string>();

for (let i = 0; i < matched.length; i++) {
	const { t, vehicleId } = matched[i];

	// Règle 1 : plein le week-end (0 = dimanche, 6 = samedi)
	const day = t.date.getDay();
	if (day === 0 || day === 6) {
		anomalies.push({ t, vehicleId, type: 'WEEKEND_FILL', severity: 'MEDIUM' });
		anomalyLineKeys.add(t.rawLine);
		continue;
	}

	// Règle 2 : volume anormal > 120L
	if (t.liters > 120) {
		anomalies.push({ t, vehicleId, type: 'ABNORMAL_VOLUME', severity: 'HIGH' });
		anomalyLineKeys.add(t.rawLine);
		continue;
	}

	// Règle 3 : doublon (même véhicule, même montant ± 2€, ± 30min)
	const isDuplicate = matched.some(
		({ t: other, vehicleId: otherId }, j) =>
			j !== i &&
			otherId === vehicleId &&
			Math.abs(other.amount - t.amount) < 2 &&
			Math.abs(other.date.getTime() - t.date.getTime()) < 30 * 60 * 1000
	);
	if (isDuplicate) {
		anomalies.push({ t, vehicleId, type: 'DUPLICATE', severity: 'HIGH' });
		anomalyLineKeys.add(t.rawLine);
	}
}
```

La structure de retour d'une anomalie (mutation `createFuelAnomaly`) :

```ts
export const createFuelAnomaly = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		fuelImportId: v.id('fuelImports'),
		vehicleId: v.optional(v.id('vehicles')),
		registration: v.optional(v.string()),
		type: v.union(
			v.literal('WEEKEND_FILL'),
			v.literal('ABNORMAL_VOLUME'),
			v.literal('SUSPICIOUS_LOCATION'),
			v.literal('DUPLICATE'),
			v.literal('NO_ACTIVE_RESERVATION')
		),
		severity: v.union(v.literal('HIGH'), v.literal('MEDIUM'), v.literal('LOW')),
		rawLine: v.string(),
		date: v.number(),
		amount: v.number(),
		liters: v.optional(v.number()),
		station: v.optional(v.string())
	},
	handler: async (ctx, args) =>
		ctx.db.insert('fuelAnomalies', {
			...args,
			resolution: 'PENDING',
			createdAt: Date.now()
		})
});
```

Chaque règle est indépendante, retourne tôt (`continue`) dès qu'elle matche, et pousse dans un
`Set` de clés (`anomalyLineKeys`) qui sert ensuite à exclure ces lignes de la création
automatique de coûts (section 4). Pour la Moulinette, la règle « seuil » naturelle est la
confiance de classification retournée par Claude (`confidence < 0.8` par ex.) plutôt que des
règles métier fixes — mais le mécanisme (accumulateur d'anomalies + set d'exclusion) est
directement réutilisable.

## 4. internalAction asynchrone auto-replanifiée

La mutation publique (`startFuelImport`) crée l'enregistrement d'import en statut `PROCESSING`
puis planifie l'action lourde en tâche de fond via `ctx.scheduler.runAfter(0, ...)` — elle ne
bloque jamais la réponse HTTP à l'utilisateur :

```ts
export const startFuelImport = authedMutation({
	args: { fileStorageId: v.string(), fileName: v.string() },
	handler: async (ctx, { fileStorageId, fileName }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const importId = await ctx.db.insert('fuelImports', {
			organizationId,
			provider: 'GENERIC' as const,
			fileName,
			fileStorageId,
			periodStart: '',
			periodEnd: '',
			totalLines: 0,
			matchedLines: 0,
			unmatchedLines: 0,
			anomalyCount: 0,
			totalAmount: 0,
			status: 'PROCESSING',
			importedBy: user._id,
			createdAt: Date.now()
		});

		await ctx.scheduler.runAfter(0, internal.fuelImport.processFuelImport, {
			importId,
			organizationId,
			fileStorageId,
			importedBy: user._id
		});

		return importId;
	}
});
```

Le squelette de l'`internalAction` elle-même (résumé, la logique complète des étapes 1-4 est
dans les sections précédentes) :

```ts
export const processFuelImport = internalAction({
	args: {
		importId: v.id('fuelImports'),
		organizationId: v.id('organizations'),
		fileStorageId: v.string(),
		importedBy: v.string()
	},
	handler: async (ctx, { importId, organizationId, fileStorageId, importedBy }) => {
		try {
			// 1. Lire le fichier depuis Convex Storage
			const blob = await ctx.storage.get(fileStorageId as Id<'_storage'>);
			if (!blob) throw new Error('Fichier introuvable dans le stockage');
			const csv = await blob.text();

			// 2. Détecter le format et parser
			const provider = detectProvider(csv);
			const transactions = parseByProvider(csv, provider);
			if (transactions.length === 0) {
				await ctx.runMutation(internal.fuelImport.updateFuelImportStatus, {
					importId, status: 'FAILED',
					failureReason: 'Aucune transaction valide trouvée dans le fichier'
				});
				return;
			}

			// 3. Matcher les immatriculations → vehicleIds (voir section 3)
			// 4. Détecter les anomalies sur les lignes matchées (voir section 3)

			// 7. Créer les coûts pour les lignes propres (IDEMPOTENT — voir checkCostExists)
			for (const { t, vehicleId } of matched) {
				if (anomalyLineKeys.has(t.rawLine)) continue; // exclu : ira en revue
				const date = new Date(t.date.toISOString().slice(0, 10)).getTime();
				const exists = await ctx.runQuery(internal.fuelImport.checkCostExists, {
					organizationId, vehicleId, date, amount: t.amount
				});
				if (exists) continue; // déjà importé — ré-import du même fichier sans doublon
				await ctx.runMutation(internal.fuelImport.insertCostInternal, {
					organizationId, vehicleId, amount: t.amount, liters: t.liters,
					station: t.station, date, importedBy
				});
			}

			// 8. Mettre à jour le statut de l'import : REVIEW si anomalies, sinon COMPLETED
			await ctx.runMutation(internal.fuelImport.updateFuelImportStatus, {
				importId,
				status: anomalies.length > 0 ? 'REVIEW' : 'COMPLETED',
				periodStart, periodEnd,
				totalLines: transactions.length,
				matchedLines: matched.length,
				unmatchedLines: transactions.length - matched.length,
				anomalyCount: anomalies.length,
				totalAmount,
				unmatchedRegistrations: Array.from(unmatchedRegs)
			});
		} catch (err) {
			// Toute erreur inattendue termine l'import proprement en FAILED,
			// jamais en boucle d'erreur silencieuse
			const msg = err instanceof Error ? err.message : 'Erreur inconnue';
			await ctx.runMutation(internal.fuelImport.updateFuelImportStatus, {
				importId, status: 'FAILED', failureReason: msg
			});
		}
	}
});
```

À noter honnêtement : cette action ne découpe **pas** le fichier en lots ni ne se
re-planifie elle-même plusieurs fois — elle traite tout le fichier en un seul appel d'action,
avec une mutation Convex par ligne (`checkCostExists` + `insertCostInternal`). Pour des relevés
carburant de quelques centaines de lignes ce n'est pas un problème, mais une facture fournisseur
EGalim avec des milliers de lignes (gros CHR) pourrait justifier un vrai découpage en lots avec
`ctx.scheduler.runAfter` récursif entre lots — un pattern à ajouter, pas à copier tel quel. Ce
qui EST directement réutilisable : l'idempotence par vérification d'existence avant insertion
(`checkCostExists`), qui permet de relancer le même fichier sans dupliquer les lignes déjà
traitées.

```ts
export const checkCostExists = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		vehicleId: v.id('vehicles'),
		date: v.number(),
		amount: v.number()
	},
	handler: async (ctx, { organizationId, vehicleId, date, amount }) => {
		const existing = await ctx.db
			.query('costs')
			.withIndex('by_org_date', (q) => q.eq('organizationId', organizationId).eq('date', date))
			.filter((q) => q.and(q.eq(q.field('vehicleId'), vehicleId), q.eq(q.field('amount'), amount)))
			.first();
		return !!existing;
	}
});
```

## 5. File de revue Accept/Reject

Une mutation publique par décision humaine, avec vérification d'appartenance organisation et
état (`PENDING` uniquement — pas de double traitement) :

```ts
export const resolveAnomaly = authedMutation({
	args: {
		anomalyId: v.id('fuelAnomalies'),
		resolution: v.union(v.literal('ACCEPTED'), v.literal('REJECTED')),
		notes: v.optional(v.string())
	},
	handler: async (ctx, { anomalyId, resolution, notes }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const anomaly = await ctx.db.get(anomalyId);
		if (!anomaly) throw new ConvexError('Anomalie introuvable');
		if (anomaly.organizationId !== organizationId) throw new ConvexError('Accès refusé');
		if (anomaly.resolution !== 'PENDING')
			throw new ConvexError('Cette anomalie a déjà été traitée');

		await ctx.db.patch(anomalyId, {
			resolution,
			resolvedBy: user._id,
			resolvedAt: Date.now(),
			notes
		});

		// Si acceptée : créer l'enregistrement métier correspondant (coût carburant ici)
		if (resolution === 'ACCEPTED' && anomaly.vehicleId) {
			const date = new Date(new Date(anomaly.date).toISOString().slice(0, 10)).getTime();
			await ctx.db.insert('costs', {
				organizationId,
				vehicleId: anomaly.vehicleId,
				category: 'CARBURANT',
				amount: anomaly.amount,
				date,
				description: `${anomaly.liters ?? '?'}L${anomaly.station ? ` — ${anomaly.station}` : ''} (anomalie validée)`,
				source: 'IMPORT',
				createdBy: user._id,
				createdAt: Date.now()
			});
		}

		// Vérifier si toutes les anomalies de cet import sont résolues → compléter l'import
		const pending = await ctx.db
			.query('fuelAnomalies')
			.withIndex('by_import', (q) => q.eq('fuelImportId', anomaly.fuelImportId))
			.filter((q) => q.eq(q.field('resolution'), 'PENDING'))
			.collect();

		const remainingPending = pending.filter((a) => a._id !== anomalyId);
		if (remainingPending.length === 0) {
			await ctx.db.patch(anomaly.fuelImportId, { status: 'COMPLETED' });
		}
	}
});
```

Le dernier bloc (recompte des `PENDING` restants → bascule l'import parent en `COMPLETED`) est
le mécanisme le plus transposable : c'est ce qui permet à l'UI d'afficher « 3 lignes restantes
à valider » et de fermer automatiquement le lot dès que la dernière ligne est traitée, sans
job de fond dédié.

## Ce qu'on garde pour la Moulinette

- **Détection de format sans configuration** (`detectProvider`) : transposable tel quel pour
  distinguer CSV structuré / PDF texte / PDF scanné avant de choisir le pipeline d'extraction.
- **Normalisation en clé de regroupement** (`normalizeRegistration` → normalisation de libellé
  produit) : indispensable avant tout envoi à Claude pour éviter de payer deux fois la
  classification du même produit orthographié différemment.
- **Idempotence par vérification d'existence** (`checkCostExists`) : à répliquer pour permettre
  de relancer un import de facture sans dupliquer les lignes déjà classifiées.
- **Accumulateur d'anomalies + set d'exclusion** (`anomalyLineKeys`) : le seuil devient la
  confiance de classification Claude plutôt que des règles fixes, mais la mécanique (exclure
  du traitement automatique, pousser en revue) est identique.
- **Revue humaine avec recompte automatique** (`resolveAnomaly`) : le pattern « la dernière
  ligne traitée referme le lot » évite d'avoir un job de fond séparé pour la clôture.
- **À ajouter, pas à copier** : le vrai découpage en lots pour les gros fichiers — l'implémentation
  Fleet ne le fait pas et devra être conçue pour la Moulinette si les factures CHR dépassent
  quelques centaines de lignes.
