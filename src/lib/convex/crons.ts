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

// Le parcours de chaque établissement (`croissance/releve.ts`) : ce qu'aucun geste
// n'a signalé (une connexion, l'abonnement, une absence) se relève chaque nuit.
crons.daily(
	'releveCroissance',
	{ hourUTC: 2, minuteUTC: 30 },
	internal.croissance.releve.releverTous,
	{}
);
// Les conseils de Plume (`croissance/conseils.ts`) : chaque quart d'heure, ceux
// dont le rendez-vous est passé, dans le créneau des relances.
crons.interval(
	'conseilsCroissance',
	{ minutes: 15 },
	internal.croissance.conseils.envoyerLesConseils,
	{}
);

// Le point chiffré du lundi pour le fondateur (`croissance/point.ts`) : 7 h à Paris
// l'été, 6 h l'hiver.
// Les prospects sans contact depuis trois ans s'effacent (`admin/entretien.ts`).
crons.daily(
	'effacementProspects',
	{ hourUTC: 3, minuteUTC: 30 },
	internal.admin.entretien.effacerLesAnciens,
	{}
);

// La liste d'attente : les inscriptions non confirmées passé leur lien, les confirmées
// passé trois ans (`attente.ts`).
crons.daily(
	'effacementListeDAttente',
	{ hourUTC: 3, minuteUTC: 40 },
	internal.attente.effacerLesEchues,
	{}
);

crons.weekly(
	'pointDuLundi',
	{ dayOfWeek: 'monday', hourUTC: 5, minuteUTC: 0 },
	internal.croissance.point.envoyerLePoint,
	{}
);

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

// LE RATTRAPAGE NANGO. Les logiciels que Nango relie ne nous préviennent pas
// qu'une facture a changé : cette relecture, par le proxy, fait arriver les
// nouvelles factures et les paiements. Dormante sans NANGO_SECRET_KEY.
crons.interval('lectureNango', { hours: 6 }, internal.connexions.nango.lireToutes, {});

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

// LES JETONS D'OUVERTURE DU COFFRE EXPIRÉS : une minute de vie, effacés chaque nuit.
crons.daily(
	'ticketsCoffre',
	{ hourUTC: 3, minuteUTC: 30 },
	internal.coffre.coffreInterne.purgerTicketsExpires,
	{}
);

/*
  LES FICHES SE RENDENT CHERCHABLES (12/10/2026). Le rattrapage complète, lot par
  lot, le département et le texte de recherche des fiches ingérées avant ; une fois
  la table complète, chaque passage ne lit qu'une entrée d'index.
*/
crons.interval(
	'annuaireCherchable',
	{ minutes: 30 },
	internal.recouvrement.annuaires.completerUnLot,
	{}
);

/*
  LA SANTÉ DES CLIENTS SE RELIT CHAQUE MOIS (13/10/2026). Chaque nuit, les analyses
  de plus d'un mois des clients qui doivent encore de l'argent sont refaites ; une
  baisse franche arrive dans la boîte de réception. Dormant sans PAPPERS_API_KEY.
*/
crons.daily(
	'relectureRisque',
	{ hourUTC: 3, minuteUTC: 40 },
	internal.risque.relecture.relireLesAnalyses,
	{}
);

/*
  L'ENTRETIEN DU SUPPORT (16/10/2026). Plume qui a perdu son appel passe la main,
  une conversation sans nouvelles se termine, le gérant attendu est rappelé.
*/
crons.interval('support', { minutes: 15 }, internal.support.entretien.entretenir, {});
// La mesure du support, matérialisée d'heure en heure.
crons.interval('mesureSupport', { hours: 1 }, internal.support.mesure.materialiser, {});

// Les travaux de l'équipe restés muets dix minutes se closent : la file ne ment pas (20/10/2026).
crons.interval('travauxMuets', { minutes: 10 }, internal.admin.travauxExecution.interrompre, {});

// Plume choisit les prospects du jour à 5 h 30 UTC (7 h 30 à Paris l'été), s'il est allumé (20/10/2026).
crons.daily(
	'prospectsDuJour',
	{ hourUTC: 5, minuteUTC: 30 },
	internal.admin.prospectsDuJour.lancerDuJour,
	{}
);

export default crons;

/*
  LES RAPPELS D'ABONNEMENT (14/10/2026). Sept heures UTC, neuf heures à Paris en
  été : la fin d'un essai et un renouvellement annuel se disent avant qu'ils
  arrivent. Dormant tant que la facturation n'est pas ouverte.
*/
crons.daily(
	'rappelsAbonnement',
	{ hourUTC: 7, minuteUTC: 0 },
	internal.abonnementRappels.rappelerTous,
	{}
);
