import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// See the docs at https://docs.convex.dev/agents/files
crons.interval('deleteUnusedFiles', { hours: 1 }, internal.files.vacuum.deleteUnusedFiles, {});

// Clean up expired uploads/download grants/files from files-control
crons.interval('cleanupExpiredFiles', { hours: 1 }, internal.files.cleanup.cleanupExpiredFiles, {});

// Clean up empty support threads (created via eager thread creation but never used)
// Runs every 6 hours to delete threads older than 24h with no messages
crons.interval('deleteEmptyThreads', { hours: 6 }, internal.support.threads.deleteEmptyThreads, {});

// Clean up stale pre-warmed AI chat threads (older than 7 days, never used)
crons.interval(
	'deleteStaleWarmThreads',
	{ hours: 24 },
	internal.aiChat.threads.deleteStaleWarmThreads,
	{}
);

// Transition reservation statuses: CONFIRMED→IN_PROGRESS→COMPLETED based on dates
crons.interval(
	'transitionReservationStatuses',
	{ hours: 1 },
	internal.reservations.transitionReservationStatuses,
	{}
);

// Send J-1 reservation reminders every day at 17:00 UTC (18h-19h Paris selon saison)
crons.daily(
	'sendReservationReminders',
	{ hourUTC: 17, minuteUTC: 0 },
	internal.notifications.sendDailyReminders,
	{}
);

// Fleet anomaly detection: under-used vehicles, expiring leases
crons.daily(
	'runDailyFleetAlerts',
	{ hourUTC: 7, minuteUTC: 0 },
	internal.alerts.runDailyAlerts,
	{}
);

// Maintenance detection: révision/vidange/pneus/freins dus ou à venir
// 5h UTC = 6h Paris (UTC+1 hiver) / 7h Paris (UTC+2 été)
crons.daily(
	'checkMaintenanceDue',
	{ hourUTC: 5, minuteUTC: 0 },
	internal.maintenance.detector.runMaintenanceDetection,
	{}
);

// License expiry check: détection permis expirés ou expirant sous 30j
// 6h UTC = 7h Paris (UTC+1 hiver) / 8h Paris (UTC+2 été)
crons.daily(
	'checkLicenseExpiry',
	{ hourUTC: 6, minuteUTC: 0 },
	internal.drivers.checkLicenseExpiry,
	{}
);

// Fleet Optimizer: analyse hebdomadaire + email d'insights au DAF
// Lundi 8h UTC = 9h ou 10h Paris selon saison
crons.weekly(
	'fleetOptimizer',
	{ dayOfWeek: 'monday', hourUTC: 8, minuteUTC: 0 },
	internal.optimizer.runFleetOptimizerForAllOrgs,
	{}
);

// Compliance check: CT, assurances, permis — quotidien 7h UTC
crons.daily(
	'checkCompliance',
	{ hourUTC: 7, minuteUTC: 30 },
	internal.compliance.checkComplianceForAllOrgs,
	{}
);

// Compliance digest: email récap hebdomadaire — lundi 8h30 UTC (après check)
crons.weekly(
	'complianceDigest',
	{ dayOfWeek: 'monday', hourUTC: 8, minuteUTC: 30 },
	internal.compliance.sendWeeklyComplianceDigest,
	{}
);

// Accounting sync retry: reprend les syncs échouées (5 tentatives max, backoff implicite)
crons.interval(
	'accountingSyncRetry',
	{ minutes: 5 },
	internal.integrations.accounting.processRetryQueue,
	{}
);

// Pull statuts de paiement depuis Pennylane → Mycelium (lecture seule, 6h)
crons.interval(
	'accountingPullPayments',
	{ hours: 6 },
	internal.integrations.accounting.pullPaymentStatuses,
	{}
);

// Smartcar telemetry sync: odometer, SoC, location — daily at 6h UTC
crons.daily(
	'smartcarSync',
	{ hourUTC: 6, minuteUTC: 0 },
	internal.smartcar.syncSmartcarForAllOrgs,
	{}
);

export default crons;
