import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// See the docs at https://docs.convex.dev/agents/files
crons.interval('deleteUnusedFiles', { hours: 1 }, internal.files.vacuum.deleteUnusedFiles, {});

// Clean up expired uploads/download grants/files from files-control
crons.interval('cleanupExpiredFiles', { hours: 1 }, internal.files.cleanup.cleanupExpiredFiles, {});

/**
 * Le rappel de la campagne « ma cantine », qui ferme le 31 mars.
 *
 * DEUX DATES, ET PAS UNE DE PLUS. Le 1er février, quand il reste deux mois pour
 * agir sur ses achats et récupérer des attestations. Le 15 mars, quand il ne
 * reste plus qu'à saisir. Entre les deux, rien : un rappel qui revient toutes
 * les semaines finit en indésirable, et il emporterait avec lui les e-mails de
 * bilan, qui partent de la même adresse.
 *
 * L'HEURE EST EN UTC, comme toutes les tâches planifiées de Convex. 7 h UTC
 * tombe à 8 h en France l'hiver, ce qui met le message en haut de la pile quand
 * le gérant ouvre sa boîte, avant le service.
 */
crons.cron('rappelCampagneFevrier', '0 7 1 2 *', internal.egalim.rappels.rappelerLaCampagne, {});
crons.cron('rappelCampagneMars', '0 7 15 3 *', internal.egalim.rappels.rappelerLaCampagne, {});

export default crons;
