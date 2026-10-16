/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abonnementRappels from "../abonnementRappels.js";
import type * as admin_acces from "../admin/acces.js";
import type * as admin_aujourdhui from "../admin/aujourdhui.js";
import type * as admin_comptes from "../admin/comptes.js";
import type * as admin_compteurs from "../admin/compteurs.js";
import type * as admin_entretien from "../admin/entretien.js";
import type * as admin_enveloppe from "../admin/enveloppe.js";
import type * as admin_equipe from "../admin/equipe.js";
import type * as admin_historique from "../admin/historique.js";
import type * as admin_importer from "../admin/importer.js";
import type * as admin_prospects from "../admin/prospects.js";
import type * as admin_recherche from "../admin/recherche.js";
import type * as admin_tables from "../admin/tables.js";
import type * as admin_taches from "../admin/taches.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as coffre_anciens from "../coffre/anciens.js";
import type * as coffre_coffre from "../coffre/coffre.js";
import type * as coffre_coffreInterne from "../coffre/coffreInterne.js";
import type * as coffre_ouverture from "../coffre/ouverture.js";
import type * as coffre_serrure from "../coffre/serrure.js";
import type * as connexions_nango from "../connexions/nango.js";
import type * as connexions_nangoConfig from "../connexions/nangoConfig.js";
import type * as connexions_nangoDonnees from "../connexions/nangoDonnees.js";
import type * as connexions_qonto from "../connexions/qonto.js";
import type * as connexions_qontoConfig from "../connexions/qontoConfig.js";
import type * as connexions_qontoDonnees from "../connexions/qontoDonnees.js";
import type * as connexions_validateurs from "../connexions/validateurs.js";
import type * as croissance_conseils from "../croissance/conseils.js";
import type * as croissance_interet from "../croissance/interet.js";
import type * as croissance_point from "../croissance/point.js";
import type * as croissance_reglage from "../croissance/reglage.js";
import type * as croissance_releve from "../croissance/releve.js";
import type * as croissance_tables from "../croissance/tables.js";
import type * as croissance_umami from "../croissance/umami.js";
import type * as crons from "../crons.js";
import type * as emails_essai from "../emails/essai.js";
import type * as emails_events from "../emails/events.js";
import type * as emails_helpers from "../emails/helpers.js";
import type * as emails_modeles_abonnement from "../emails/modeles/abonnement.js";
import type * as emails_modeles_briefing from "../emails/modeles/briefing.js";
import type * as emails_modeles_compte from "../emails/modeles/compte.js";
import type * as emails_modeles_conseils from "../emails/modeles/conseils.js";
import type * as emails_modeles_disposition from "../emails/modeles/disposition.js";
import type * as emails_modeles_equipe from "../emails/modeles/equipe.js";
import type * as emails_modeles_index from "../emails/modeles/index.js";
import type * as emails_modeles_invitation from "../emails/modeles/invitation.js";
import type * as emails_modeles_pointDuLundi from "../emails/modeles/pointDuLundi.js";
import type * as emails_modeles_relance from "../emails/modeles/relance.js";
import type * as emails_resend from "../emails/resend.js";
import type * as emails_send from "../emails/send.js";
import type * as emails_templates from "../emails/templates.js";
import type * as emails_types from "../emails/types.js";
import type * as env from "../env.js";
import type * as exports_cleanup from "../exports/cleanup.js";
import type * as files_attachmentText from "../files/attachmentText.js";
import type * as files_cleanup from "../files/cleanup.js";
import type * as files_vacuum from "../files/vacuum.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as i18n_translations from "../i18n/translations.js";
import type * as imageDeProfil from "../imageDeProfil.js";
import type * as images from "../images.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as limites from "../limites.js";
import type * as localDev from "../localDev.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as ouvertureFacturation from "../ouvertureFacturation.js";
import type * as paddle from "../paddle.js";
import type * as paddleCatalogue from "../paddleCatalogue.js";
import type * as previewDev from "../previewDev.js";
import type * as recouvrement_annuaireNuit from "../recouvrement/annuaireNuit.js";
import type * as recouvrement_annuaires from "../recouvrement/annuaires.js";
import type * as recouvrement_apresProcedure from "../recouvrement/apresProcedure.js";
import type * as recouvrement_arret from "../recouvrement/arret.js";
import type * as recouvrement_battement from "../recouvrement/battement.js";
import type * as recouvrement_briefing from "../recouvrement/briefing.js";
import type * as recouvrement_classement from "../recouvrement/classement.js";
import type * as recouvrement_comportement from "../recouvrement/comportement.js";
import type * as recouvrement_conseil from "../recouvrement/conseil.js";
import type * as recouvrement_controle from "../recouvrement/controle.js";
import type * as recouvrement_conversation from "../recouvrement/conversation.js";
import type * as recouvrement_conversationEtablissement from "../recouvrement/conversationEtablissement.js";
import type * as recouvrement_conversationLecture from "../recouvrement/conversationLecture.js";
import type * as recouvrement_creances from "../recouvrement/creances.js";
import type * as recouvrement_debiteurs from "../recouvrement/debiteurs.js";
import type * as recouvrement_decompte from "../recouvrement/decompte.js";
import type * as recouvrement_demarrage from "../recouvrement/demarrage.js";
import type * as recouvrement_depot from "../recouvrement/depot.js";
import type * as recouvrement_depotMutations from "../recouvrement/depotMutations.js";
import type * as recouvrement_envois from "../recouvrement/envois.js";
import type * as recouvrement_gestesPlume from "../recouvrement/gestesPlume.js";
import type * as recouvrement_import from "../recouvrement/import.js";
import type * as recouvrement_intervenants from "../recouvrement/intervenants.js";
import type * as recouvrement_journee from "../recouvrement/journee.js";
import type * as recouvrement_lecture from "../recouvrement/lecture.js";
import type * as recouvrement_lettrage from "../recouvrement/lettrage.js";
import type * as recouvrement_monEtablissement from "../recouvrement/monEtablissement.js";
import type * as recouvrement_paiement from "../recouvrement/paiement.js";
import type * as recouvrement_parole from "../recouvrement/parole.js";
import type * as recouvrement_pieces from "../recouvrement/pieces.js";
import type * as recouvrement_pilote from "../recouvrement/pilote.js";
import type * as recouvrement_plan from "../recouvrement/plan.js";
import type * as recouvrement_presence from "../recouvrement/presence.js";
import type * as recouvrement_preuve from "../recouvrement/preuve.js";
import type * as recouvrement_profil from "../recouvrement/profil.js";
import type * as recouvrement_propositions from "../recouvrement/propositions.js";
import type * as recouvrement_radar from "../recouvrement/radar.js";
import type * as recouvrement_recherche from "../recouvrement/recherche.js";
import type * as recouvrement_revelation from "../recouvrement/revelation.js";
import type * as recouvrement_suivi from "../recouvrement/suivi.js";
import type * as recouvrement_surveillance from "../recouvrement/surveillance.js";
import type * as recouvrement_tables from "../recouvrement/tables.js";
import type * as recouvrement_tauxContractuel from "../recouvrement/tauxContractuel.js";
import type * as rgpd from "../rgpd.js";
import type * as risque_analyse from "../risque/analyse.js";
import type * as risque_donnees from "../risque/donnees.js";
import type * as risque_pappersConfig from "../risque/pappersConfig.js";
import type * as risque_relecture from "../risque/relecture.js";
import type * as risque_tables from "../risque/tables.js";
import type * as risque_validateurs from "../risque/validateurs.js";
import type * as suivis from "../suivis.js";
import type * as tests from "../tests.js";
import type * as users from "../users.js";
import type * as utils_anonymousUser from "../utils/anonymousUser.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abonnementRappels: typeof abonnementRappels;
  "admin/acces": typeof admin_acces;
  "admin/aujourdhui": typeof admin_aujourdhui;
  "admin/comptes": typeof admin_comptes;
  "admin/compteurs": typeof admin_compteurs;
  "admin/entretien": typeof admin_entretien;
  "admin/enveloppe": typeof admin_enveloppe;
  "admin/equipe": typeof admin_equipe;
  "admin/historique": typeof admin_historique;
  "admin/importer": typeof admin_importer;
  "admin/prospects": typeof admin_prospects;
  "admin/recherche": typeof admin_recherche;
  "admin/tables": typeof admin_tables;
  "admin/taches": typeof admin_taches;
  auth: typeof auth;
  billing: typeof billing;
  "coffre/anciens": typeof coffre_anciens;
  "coffre/coffre": typeof coffre_coffre;
  "coffre/coffreInterne": typeof coffre_coffreInterne;
  "coffre/ouverture": typeof coffre_ouverture;
  "coffre/serrure": typeof coffre_serrure;
  "connexions/nango": typeof connexions_nango;
  "connexions/nangoConfig": typeof connexions_nangoConfig;
  "connexions/nangoDonnees": typeof connexions_nangoDonnees;
  "connexions/qonto": typeof connexions_qonto;
  "connexions/qontoConfig": typeof connexions_qontoConfig;
  "connexions/qontoDonnees": typeof connexions_qontoDonnees;
  "connexions/validateurs": typeof connexions_validateurs;
  "croissance/conseils": typeof croissance_conseils;
  "croissance/interet": typeof croissance_interet;
  "croissance/point": typeof croissance_point;
  "croissance/reglage": typeof croissance_reglage;
  "croissance/releve": typeof croissance_releve;
  "croissance/tables": typeof croissance_tables;
  "croissance/umami": typeof croissance_umami;
  crons: typeof crons;
  "emails/essai": typeof emails_essai;
  "emails/events": typeof emails_events;
  "emails/helpers": typeof emails_helpers;
  "emails/modeles/abonnement": typeof emails_modeles_abonnement;
  "emails/modeles/briefing": typeof emails_modeles_briefing;
  "emails/modeles/compte": typeof emails_modeles_compte;
  "emails/modeles/conseils": typeof emails_modeles_conseils;
  "emails/modeles/disposition": typeof emails_modeles_disposition;
  "emails/modeles/equipe": typeof emails_modeles_equipe;
  "emails/modeles/index": typeof emails_modeles_index;
  "emails/modeles/invitation": typeof emails_modeles_invitation;
  "emails/modeles/pointDuLundi": typeof emails_modeles_pointDuLundi;
  "emails/modeles/relance": typeof emails_modeles_relance;
  "emails/resend": typeof emails_resend;
  "emails/send": typeof emails_send;
  "emails/templates": typeof emails_templates;
  "emails/types": typeof emails_types;
  env: typeof env;
  "exports/cleanup": typeof exports_cleanup;
  "files/attachmentText": typeof files_attachmentText;
  "files/cleanup": typeof files_cleanup;
  "files/vacuum": typeof files_vacuum;
  functions: typeof functions;
  http: typeof http;
  "i18n/translations": typeof i18n_translations;
  imageDeProfil: typeof imageDeProfil;
  images: typeof images;
  "lib/auth": typeof lib_auth;
  "lib/crypto": typeof lib_crypto;
  limites: typeof limites;
  localDev: typeof localDev;
  notifications: typeof notifications;
  organizations: typeof organizations;
  ouvertureFacturation: typeof ouvertureFacturation;
  paddle: typeof paddle;
  paddleCatalogue: typeof paddleCatalogue;
  previewDev: typeof previewDev;
  "recouvrement/annuaireNuit": typeof recouvrement_annuaireNuit;
  "recouvrement/annuaires": typeof recouvrement_annuaires;
  "recouvrement/apresProcedure": typeof recouvrement_apresProcedure;
  "recouvrement/arret": typeof recouvrement_arret;
  "recouvrement/battement": typeof recouvrement_battement;
  "recouvrement/briefing": typeof recouvrement_briefing;
  "recouvrement/classement": typeof recouvrement_classement;
  "recouvrement/comportement": typeof recouvrement_comportement;
  "recouvrement/conseil": typeof recouvrement_conseil;
  "recouvrement/controle": typeof recouvrement_controle;
  "recouvrement/conversation": typeof recouvrement_conversation;
  "recouvrement/conversationEtablissement": typeof recouvrement_conversationEtablissement;
  "recouvrement/conversationLecture": typeof recouvrement_conversationLecture;
  "recouvrement/creances": typeof recouvrement_creances;
  "recouvrement/debiteurs": typeof recouvrement_debiteurs;
  "recouvrement/decompte": typeof recouvrement_decompte;
  "recouvrement/demarrage": typeof recouvrement_demarrage;
  "recouvrement/depot": typeof recouvrement_depot;
  "recouvrement/depotMutations": typeof recouvrement_depotMutations;
  "recouvrement/envois": typeof recouvrement_envois;
  "recouvrement/gestesPlume": typeof recouvrement_gestesPlume;
  "recouvrement/import": typeof recouvrement_import;
  "recouvrement/intervenants": typeof recouvrement_intervenants;
  "recouvrement/journee": typeof recouvrement_journee;
  "recouvrement/lecture": typeof recouvrement_lecture;
  "recouvrement/lettrage": typeof recouvrement_lettrage;
  "recouvrement/monEtablissement": typeof recouvrement_monEtablissement;
  "recouvrement/paiement": typeof recouvrement_paiement;
  "recouvrement/parole": typeof recouvrement_parole;
  "recouvrement/pieces": typeof recouvrement_pieces;
  "recouvrement/pilote": typeof recouvrement_pilote;
  "recouvrement/plan": typeof recouvrement_plan;
  "recouvrement/presence": typeof recouvrement_presence;
  "recouvrement/preuve": typeof recouvrement_preuve;
  "recouvrement/profil": typeof recouvrement_profil;
  "recouvrement/propositions": typeof recouvrement_propositions;
  "recouvrement/radar": typeof recouvrement_radar;
  "recouvrement/recherche": typeof recouvrement_recherche;
  "recouvrement/revelation": typeof recouvrement_revelation;
  "recouvrement/suivi": typeof recouvrement_suivi;
  "recouvrement/surveillance": typeof recouvrement_surveillance;
  "recouvrement/tables": typeof recouvrement_tables;
  "recouvrement/tauxContractuel": typeof recouvrement_tauxContractuel;
  rgpd: typeof rgpd;
  "risque/analyse": typeof risque_analyse;
  "risque/donnees": typeof risque_donnees;
  "risque/pappersConfig": typeof risque_pappersConfig;
  "risque/relecture": typeof risque_relecture;
  "risque/tables": typeof risque_tables;
  "risque/validateurs": typeof risque_validateurs;
  suivis: typeof suivis;
  tests: typeof tests;
  users: typeof users;
  "utils/anonymousUser": typeof utils_anonymousUser;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  convexFilesControl: import("@gilhrpenner/convex-files-control/_generated/component.js").ComponentApi<"convexFilesControl">;
};
