# Gabarit — surveillance de seuils, écart, dédoublonnage, notification

Extrait de `src/lib/convex/agents/compliance.ts` (Mycelium Fleet OS, supprimé le 15/08/2026),
complété par `src/lib/convex/maintenance/detector.ts` pour le dédoublonnage d'alerte et la
génération de notification — deux mécaniques que `compliance.ts` ne possède pas lui-même
(c'est un agent conversationnel en lecture seule, pas le cron qui génère les alertes qu'il lit).
Les deux fichiers sont cités explicitement ci-dessous à chaque extrait pour ne pas mélanger les
sources.

Transposition EGalim : « seuil kilométrique/documentaire » → « seuil des 50%/20% EGalim » (ratio
valeur sustainable / valeur totale d'achats, ratio bio / valeur totale). « Alerte véhicule » →
« alerte de dérive du ratio en cours de période » ou « ligne fournisseur à faible confiance
récurrente ». Le principe général — collecter périodiquement, comparer à un seuil, dédupliquer
avant de renotifier, générer un message humain — est directement le même problème.

## 1. Collecte périodique (`compliance.ts`)

Chaque « tool » de l'agent Compliance est une `internalQuery` qui recalcule un état à la volée
à partir des tables source, filtré par organisation via un index — pas de valeur pré-calculée
stockée : la fraîcheur prime sur la performance ici parce que c'est appelé à la demande dans une
conversation, pas par un cron à haute fréquence.

```ts
export const toolGetVehicleDocumentStatus = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		daysAhead: v.optional(v.number()),
	},
	handler: async (ctx, { organizationId, daysAhead = 60 }) => {
		const now = Date.now();
		const threshold = now + daysAhead * 24 * 60 * 60 * 1000;

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'RETIRED'))
			.collect();

		function daysDiff(ms: number) {
			return Math.floor((ms - now) / (24 * 60 * 60 * 1000));
		}

		const expired: { vehicle: string; document: string; expiredDaysAgo: number }[] = [];
		const expiring: { vehicle: string; document: string; daysLeft: number; date: string }[] = [];

		for (const v of vehicles) {
			const label = `${v.brand} ${v.model} · ${v.registration}`;
			const docs = [
				{ name: 'Contrôle technique', date: v.ctExpiryDate },
				{ name: 'Assurance', date: v.insuranceExpiryDate },
				// ...
			];
			for (const doc of docs) {
				const ms = doc.date ? new Date(doc.date).getTime() : null;
				if (!ms) continue;
				const days = daysDiff(ms);
				if (ms < now) expired.push({ vehicle: label, document: doc.name, expiredDaysAgo: -days });
				else if (ms <= threshold) expiring.push({ vehicle: label, document: doc.name, daysLeft: days, date: doc.date! });
			}
		}

		expired.sort((a, b) => b.expiredDaysAgo - a.expiredDaysAgo);
		expiring.sort((a, b) => a.daysLeft - b.daysLeft);

		return { expired, expiring, summary: { expiredCount: expired.length, expiringCount: expiring.length, checkedVehicles: vehicles.length, horizonDays: daysAhead } };
	},
});
```

## 2. Calcul d'écart par rapport à un seuil (`compliance.ts`)

Le tool le plus proche du besoin EGalim : agréger plusieurs signaux disjoints en un score
unique, puis classer ce score en paliers nommés (`COMPLIANT`/`LOW`/`MEDIUM`/`HIGH`). C'est
exactement la mécanique d'un ratio EGalim comparé aux seuils légaux, avec des pondérations par
type d'écart :

```ts
export const toolGetFullComplianceDashboard = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const now = Date.now();
		const thirtyDays = 30 * 24 * 60 * 60 * 1000;

		// ... collecte vehicles / violations / drivers (voir section 1) ...

		let expiredDocs = 0, expiring30Days = 0;
		for (const v of vehicles) {
			const docs = [v.ctExpiryDate, v.insuranceExpiryDate, v.registrationExpiryDate, v.leaseEndDate];
			for (const d of docs) {
				if (!d) continue;
				const ms = new Date(d).getTime();
				if (ms < now) expiredDocs++;
				else if (ms <= now + thirtyDays) expiring30Days++;
			}
		}

		const pendingViolations = violations.filter((v) => v.status === 'RECEIVED' || v.status === 'IDENTIFIED' || v.status === 'NOTIFIED');
		const expiredLicenses = drivers.filter((d) => d.licenseExpiryDate && new Date(d.licenseExpiryDate).getTime() < now);
		const blockedDrivers = drivers.filter((d) => d.isBlocked);

		const riskScore =
			expiredDocs * 10 +
			expiring30Days * 3 +
			expiredLicenses.length * 8 +
			blockedDrivers.length * 5 +
			pendingViolations.length * 2;

		const riskLevel =
			riskScore === 0 ? 'COMPLIANT' :
			riskScore < 15 ? 'LOW' :
			riskScore < 40 ? 'MEDIUM' :
			'HIGH';

		return {
			riskLevel,
			riskScore,
			summary: {
				expiredDocuments: expiredDocs,
				documentsExpiringIn30Days: expiring30Days,
				pendingViolations: pendingViolations.length,
				expiredLicenses: expiredLicenses.length,
				blockedDrivers: blockedDrivers.length,
				vehiclesChecked: vehicles.length,
				driversChecked: drivers.length,
			},
		};
	},
});
```

Pour la Moulinette, le score composite devient plus simple mais suit la même forme : l'écart
signé entre le ratio courant et le seuil légal (`ratioSustainable - 0.50`, `ratioBio - 0.20`),
classé en paliers (« conforme » / « à surveiller » / « risque de non-conformité en fin de
période »), recalculé à chaque nouvelle facture importée plutôt qu'à la demande dans une
conversation.

## 3. Dédoublonnage d'alerte (`maintenance/detector.ts`, PAS dans compliance.ts)

`compliance.ts` lit des alertes déjà en base (`complianceAlerts`) mais ne les génère pas — c'est
un cron séparé qui le fait, avec un mécanisme de dédoublonnage à deux niveaux : skip total pour
les alertes de sévérité basse déjà notifiées, anti-spam à 24h pour les sévérités hautes qui
peuvent légitimement se répéter (l'échéance se rapproche) :

```ts
// Chargement batch des notifications MAINTENANCE_DUE non-lues pour le dédoublonnage
const existingNotifs = await ctx.db
	.query('notifications')
	.withIndex('by_org', (q) => q.eq('organizationId', orgId))
	.filter((q) =>
		q.and(q.eq(q.field('type'), 'MAINTENANCE_DUE'), q.eq(q.field('isRead'), false))
	)
	.collect();

// Map "vehicleId|userId" → createdAt de la notif la plus récente
const dedupMap = new Map<string, number>();
for (const n of existingNotifs) {
	if (!n.vehicleId) continue;
	const key = `${n.vehicleId}|${n.userId}`;
	const existing = dedupMap.get(key);
	if (existing === undefined || n.createdAt > existing) {
		dedupMap.set(key, n.createdAt);
	}
}

for (const vehicle of vehicles) {
	const alerts = analyzeVehicle(vehicle, config, rulesMap, now);
	if (alerts.length === 0) continue;
	const topSeverity = alerts[0].severity;

	for (const admin of admins) {
		const dedupKey = `${vehicle._id}|${admin.userId}`;
		const existingCreatedAt = dedupMap.get(dedupKey);

		if (existingCreatedAt !== undefined) {
			// Alerte NORMALE : skip si déjà notifié (quelle que soit l'ancienneté)
			if (topSeverity === 'NORMAL') continue;
			// Alerte URGENTE/CRITIQUE : skip si la dernière notif date de < 24h (anti-spam)
			if (existingCreatedAt >= oneDayAgo) continue;
		}

		await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
			organizationId: orgId, userId: admin.userId, type: 'MAINTENANCE_DUE',
			title, message, link: `/admin/maintenance`, vehicleId: vehicle._id
		});
	}
}
```

Le calcul de sévérité lui-même, comparant un écart à plusieurs paliers de seuils (jours restants
ET kilomètres restants, en prenant le pire des deux) :

```ts
const NORMAL_DAYS = 30;
const URGENT_DAYS = 7;

function calcDateSeverity(daysRemaining: number): Severity | null {
	if (daysRemaining <= 0) return 'CRITIQUE';
	if (daysRemaining <= URGENT_DAYS) return 'URGENT';
	if (daysRemaining <= NORMAL_DAYS) return 'NORMAL';
	return null;
}

const SEVERITY_RANK: Record<Severity, number> = { NORMAL: 1, URGENT: 2, CRITIQUE: 3 };
function maxSeverity(a: Severity | null, b: Severity | null): Severity | null {
	if (!a) return b;
	if (!b) return a;
	return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}
```

Pour la Moulinette, la clé de dédoublonnage naturelle est `${organizationId}|${periode}|${type
d'alerte}` (ex. « ratio bio sous 20% pour la période en cours ») plutôt que
`vehicleId|userId` — mais le principe des deux crans (skip total en sévérité basse, anti-spam
24h en sévérité haute) reste directement applicable : on ne veut pas renotifier un
gestionnaire de cantine chaque jour que le ratio est à 18% au lieu de 20%, mais on veut
réescalader si l'écart se creuse ou si la fin de période approche.

## 4. Génération de notification / brouillon de message (les deux fichiers)

`maintenance/detector.ts` construit un texte de notification interne (titre + message) à partir
de la liste d'écarts détectés, en le limitant aux 3 informations les plus urgentes :

```ts
const TYPE_LABELS: Record<MaintenanceType, string> = {
	REVISION: 'Révision', VIDANGE: 'Vidange', PNEUS: 'Pneus', FREINS: 'Freins'
};

function buildNotification(
	vehicleLabel: string, alerts: VehicleAlert[], topSeverity: Severity
): { title: string; message: string } {
	const parts = alerts.slice(0, 3).map((a) => {
		const label = TYPE_LABELS[a.maintenanceType];
		if (a.daysUntilDue !== null && a.daysUntilDue <= 0) {
			return `${label} en retard de ${Math.abs(a.daysUntilDue)} j`;
		}
		const bits: string[] = [];
		if (a.daysUntilDue !== null) bits.push(`${a.daysUntilDue} j`);
		if (a.kmUntilDue !== null) bits.push(`${a.kmUntilDue} km`);
		return bits.length > 0 ? `${label} dans ${bits.join(' / ')}` : label;
	});

	const prefix =
		topSeverity === 'CRITIQUE' ? '⚠️ Entretien en retard' :
		topSeverity === 'URGENT' ? 'Entretien urgent à prévoir' :
		'Entretien à planifier';

	return { title: `${prefix} — ${vehicleLabel}`, message: parts.join(' · ') };
}
```

`compliance.ts` va plus loin pour les messages destinés à un tiers externe (pas une notification
interne mais un email/SMS à un client ou fournisseur) : il génère un **brouillon** explicitement
non envoyé, avec un garde-fou textuel rappelant qu'une validation humaine est requise avant tout
envoi — un principe directement applicable à un rappel EGalim adressé à un fournisseur ou à une
mairie :

```ts
export const toolGenerateReminderDraft = internalQuery({
	args: { organizationId: v.id('organizations'), alertId: v.string() },
	handler: async (ctx, { organizationId, alertId }) => {
		const alert = await ctx.db.get(alertId as Id<'complianceAlerts'>);
		if (!alert || alert.organizationId !== organizationId) {
			return { error: 'Alerte introuvable' };
		}
		const draft = generateReminderText(alert.alertType, alert.entityLabel, alert.expiryDate);
		return {
			draft,
			alertType: alert.alertType,
			entityLabel: alert.entityLabel,
			expiryDate: alert.expiryDate,
			horizon: alert.horizon,
			warning: 'Ce brouillon doit être relu et validé par le concierge avant tout envoi au client.'
		};
	}
});
```

Le system prompt de l'agent impose lui-même une règle stricte de non-invention de chiffres, à
reprendre telle quelle pour tout agent EGalim orienté conformité :

```
## Règles ABSOLUES
1. Tu ne modifies RIEN. Tu es en lecture seule.
2. Tout chiffre vient d'un tool call. Jamais d'invention.
3. Commence TOUJOURS par appeler `getFullComplianceDashboard` pour avoir le niveau de risque
   global, sauf si la question est très spécifique.
4. Priorise les urgences : documents expirés > permis expirés > contraventions non traitées
   > documents expirant < 30j.
```

## Ce qu'on garde pour la Moulinette

- **Requêtes à la demande plutôt que valeurs pré-calculées** (`toolGetVehicleDocumentStatus`) :
  pour un tableau de bord EGalim interrogé par un agent conversationnel, recalculer à la volée
  plutôt que stocker un ratio figé — la fraîcheur compte plus que la performance à ce volume.
- **Score composite pondéré → paliers nommés** (`riskScore` → `riskLevel`) : le patron direct
  pour transformer un écart de ratio EGalim en statut lisible (conforme / à surveiller /
  non-conforme).
- **Dédoublonnage à deux crans, skip total en sévérité basse / anti-spam 24h en sévérité haute**
  (`maintenance/detector.ts`) : à répliquer avec une clé `org|période|typeAlerte` plutôt que
  `vehicleId|userId`, pour ne pas spammer un gestionnaire de cantine sur un ratio qui dérive
  lentement tout en réescaladant si l'échéance de fin de période approche.
- **Brouillon de message jamais auto-envoyé, avec garde-fou textuel explicite** : à reprendre
  mot pour mot pour tout message sortant généré par un agent EGalim (relance fournisseur,
  alerte mairie) — l'agent rédige, un humain valide et envoie.
- **Règle système « tout chiffre vient d'un tool call, jamais d'invention »** : à copier dans le
  system prompt de tout agent EGalim qui affiche des ratios ou des montants — c'est la meilleure
  protection anti-hallucination disponible dans ce codebase et elle est peu coûteuse à répliquer.
- **Attention à la source** : ce document mélange deux fichiers (`compliance.ts` pour le calcul
  d'écart et les brouillons, `maintenance/detector.ts` pour le dédoublonnage et la génération de
  notification interne) parce qu'aucun des deux seuls ne couvre toute la chaîne. Un futur cron
  de surveillance EGalim devra combiner les deux mécaniques dans un seul module, contrairement à
  Fleet où elles sont restées séparées entre l'agent conversationnel et le detector.
