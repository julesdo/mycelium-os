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
/*
  ⚠️ LE PILOTE VIT EN PERMANENCE (08/10/2026). Il remplace le battement de 6 h UTC :
  chaque établissement se réveille toutes les quinze minutes pour ce que le temps
  seul fait avancer, en plus des réveils à chaque changement (`pilote.reveiller`).
  Le relevé du jour — briefing et notifications — se joue à la première veille de
  la journée, plus une fois à 6 h pour qu'aucun jour ne soit sauté.
*/
crons.interval('pilote', { minutes: 15 }, internal.recouvrement.pilote.reveillerTous, {});

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

// LE RATTRAPAGE QONTO. Les webhooks font le temps réel ; celui-ci rattrape ce
// qu'ils auraient manqué, et renouvelle au passage les jetons de rafraîchissement
// (90 jours), qui ne s'éteignent donc jamais sur une connexion vivante.
crons.interval('synchroQonto', { hours: 6 }, internal.connexions.qonto.synchroniserToutes, {});

// LE RATTRAPAGE CHIFT. Sans couche de données, Chift ne prévient pas qu'une facture
// a changé dans le logiciel du gérant : cette lecture, depuis le curseur, est ce
// qui fait arriver les nouvelles factures et les paiements. Dormante sans clé.
crons.interval('synchroChift', { hours: 6 }, internal.connexions.chift.synchroniserToutes, {});

/*
  L'ANNUAIRE DES AVOCATS SE NOURRIT SEUL (01/10/2026). Un appel de métadonnées par
  nuit à data.gouv.fr ; le fichier ne se télécharge que quand une livraison plus
  récente que celle en base a paru. Voir `recouvrement/annuaireNuit.ts`.
*/
crons.daily(
	'annuaireAvocats',
	{ hourUTC: 2, minuteUTC: 30 },
	internal.recouvrement.annuaireNuit.rafraichirAnnuaireAvocats,
	{}
);

export default crons;
