import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// See the docs at https://docs.convex.dev/agents/files
crons.interval('deleteUnusedFiles', { hours: 1 }, internal.files.vacuum.deleteUnusedFiles, {});

// Clean up expired uploads/download grants/files from files-control
crons.interval('cleanupExpiredFiles', { hours: 1 }, internal.files.cleanup.cleanupExpiredFiles, {});

// LE RADAR DE SOLVABILITÉ. Quatre heures UTC, et AVANT le battement : le briefing
// du matin doit porter ce que le radar a trouvé la nuit. S’il partait d’abord, une
// procédure collective découverte à six heures n’atteindrait le gérant que le
// lendemain — vingt-quatre heures pendant lesquelles il peut engager des frais.
//
// Il lit la VEILLE, pas le jour même : le BODACC publie au fil de la journée, et
// interroger le jour courant à quatre heures rendrait une page vide.
crons.daily(
	'radarSolvabilite',
	{ hourUTC: 4, minuteUTC: 0 },
	internal.recouvrement.radar.radarQuotidien,
	{}
);

// LE BATTEMENT QUOTIDIEN. Six heures UTC : le briefing doit être arrivé avant
// que le gérant n'ouvre sa boîte, et assez tard pour que les registres publics
// de la veille soient à jour.
crons.daily(
	'battementQuotidien',
	{ hourUTC: 6, minuteUTC: 0 },
	internal.recouvrement.battement.planifierBattements,
	{}
);

// LA RETENTION DU JOURNAL D'ENVOIS. Trois heures UTC, loin du battement : rien
// ne depend d'elle, et elle ne doit disputer aucun budget a ce qui parle au
// client. Une purge qui n'est appelee par personne n'est pas une purge.
crons.daily(
	'retentionJournalEnvois',
	{ hourUTC: 3, minuteUTC: 0 },
	internal.emails.events.purgerJournalEnvois,
	{ passe: 0 }
);

export default crons;
