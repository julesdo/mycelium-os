import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// See the docs at https://docs.convex.dev/agents/files
crons.interval('deleteUnusedFiles', { hours: 1 }, internal.files.vacuum.deleteUnusedFiles, {});

// Clean up expired uploads/download grants/files from files-control
crons.interval('cleanupExpiredFiles', { hours: 1 }, internal.files.cleanup.cleanupExpiredFiles, {});

// Efface les champs hérités d'EGalim restés sur des documents en base. Sans
// elle, ils bloqueraient tout déploiement ultérieur qui les retirerait du
// schéma. À supprimer, avec le champ correspondant, dès qu'elle rapporte 0.
crons.interval(
	'purgerHeritageEgalim',
	{ hours: 24 },
	internal.maintenance.purgerHeritageEgalim,
	{}
);

export default crons;
