/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as admin_types from "../admin/types.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as egalim_attestations from "../egalim/attestations.js";
import type * as egalim_batches from "../egalim/batches.js";
import type * as egalim_classification from "../egalim/classification.js";
import type * as egalim_classificationMutations from "../egalim/classificationMutations.js";
import type * as egalim_confirmation from "../egalim/confirmation.js";
import type * as egalim_diagnostics from "../egalim/diagnostics.js";
import type * as egalim_extraction from "../egalim/extraction.js";
import type * as egalim_extractionMutations from "../egalim/extractionMutations.js";
import type * as egalim_lot from "../egalim/lot.js";
import type * as egalim_pilotage from "../egalim/pilotage.js";
import type * as egalim_produits from "../egalim/produits.js";
import type * as egalim_rappels from "../egalim/rappels.js";
import type * as egalim_signature from "../egalim/signature.js";
import type * as egalim_tables from "../egalim/tables.js";
import type * as emails_envoiProduit from "../emails/envoiProduit.js";
import type * as emails_events from "../emails/events.js";
import type * as emails_helpers from "../emails/helpers.js";
import type * as emails_modeles_adminReplyNotification from "../emails/modeles/adminReplyNotification.js";
import type * as emails_modeles_bilanPret from "../emails/modeles/bilanPret.js";
import type * as emails_modeles_disposition from "../emails/modeles/disposition.js";
import type * as emails_modeles_index from "../emails/modeles/index.js";
import type * as emails_modeles_invitation from "../emails/modeles/invitation.js";
import type * as emails_modeles_newTicketAdminNotification from "../emails/modeles/newTicketAdminNotification.js";
import type * as emails_modeles_newUserSignupNotification from "../emails/modeles/newUserSignupNotification.js";
import type * as emails_modeles_passwordReset from "../emails/modeles/passwordReset.js";
import type * as emails_modeles_produitsAConfirmer from "../emails/modeles/produitsAConfirmer.js";
import type * as emails_modeles_rappelDeclaration from "../emails/modeles/rappelDeclaration.js";
import type * as emails_modeles_verification from "../emails/modeles/verification.js";
import type * as emails_modeles_verificationCode from "../emails/modeles/verificationCode.js";
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
import type * as lib_auth from "../lib/auth.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as localDev from "../localDev.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as paddle from "../paddle.js";
import type * as previewDev from "../previewDev.js";
import type * as recouvrement_creances from "../recouvrement/creances.js";
import type * as recouvrement_decompte from "../recouvrement/decompte.js";
import type * as recouvrement_depot from "../recouvrement/depot.js";
import type * as recouvrement_depotMutations from "../recouvrement/depotMutations.js";
import type * as recouvrement_import from "../recouvrement/import.js";
import type * as recouvrement_lecture from "../recouvrement/lecture.js";
import type * as recouvrement_surveillance from "../recouvrement/surveillance.js";
import type * as recouvrement_tables from "../recouvrement/tables.js";
import type * as rgpd from "../rgpd.js";
import type * as storage from "../storage.js";
import type * as tests from "../tests.js";
import type * as users from "../users.js";
import type * as utils_anonymousUser from "../utils/anonymousUser.js";
import type * as utils_chatModel from "../utils/chatModel.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "admin/types": typeof admin_types;
  auth: typeof auth;
  billing: typeof billing;
  constants: typeof constants;
  crons: typeof crons;
  "egalim/attestations": typeof egalim_attestations;
  "egalim/batches": typeof egalim_batches;
  "egalim/classification": typeof egalim_classification;
  "egalim/classificationMutations": typeof egalim_classificationMutations;
  "egalim/confirmation": typeof egalim_confirmation;
  "egalim/diagnostics": typeof egalim_diagnostics;
  "egalim/extraction": typeof egalim_extraction;
  "egalim/extractionMutations": typeof egalim_extractionMutations;
  "egalim/lot": typeof egalim_lot;
  "egalim/pilotage": typeof egalim_pilotage;
  "egalim/produits": typeof egalim_produits;
  "egalim/rappels": typeof egalim_rappels;
  "egalim/signature": typeof egalim_signature;
  "egalim/tables": typeof egalim_tables;
  "emails/envoiProduit": typeof emails_envoiProduit;
  "emails/events": typeof emails_events;
  "emails/helpers": typeof emails_helpers;
  "emails/modeles/adminReplyNotification": typeof emails_modeles_adminReplyNotification;
  "emails/modeles/bilanPret": typeof emails_modeles_bilanPret;
  "emails/modeles/disposition": typeof emails_modeles_disposition;
  "emails/modeles/index": typeof emails_modeles_index;
  "emails/modeles/invitation": typeof emails_modeles_invitation;
  "emails/modeles/newTicketAdminNotification": typeof emails_modeles_newTicketAdminNotification;
  "emails/modeles/newUserSignupNotification": typeof emails_modeles_newUserSignupNotification;
  "emails/modeles/passwordReset": typeof emails_modeles_passwordReset;
  "emails/modeles/produitsAConfirmer": typeof emails_modeles_produitsAConfirmer;
  "emails/modeles/rappelDeclaration": typeof emails_modeles_rappelDeclaration;
  "emails/modeles/verification": typeof emails_modeles_verification;
  "emails/modeles/verificationCode": typeof emails_modeles_verificationCode;
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
  "lib/auth": typeof lib_auth;
  "lib/crypto": typeof lib_crypto;
  localDev: typeof localDev;
  notifications: typeof notifications;
  organizations: typeof organizations;
  paddle: typeof paddle;
  previewDev: typeof previewDev;
  "recouvrement/creances": typeof recouvrement_creances;
  "recouvrement/decompte": typeof recouvrement_decompte;
  "recouvrement/depot": typeof recouvrement_depot;
  "recouvrement/depotMutations": typeof recouvrement_depotMutations;
  "recouvrement/import": typeof recouvrement_import;
  "recouvrement/lecture": typeof recouvrement_lecture;
  "recouvrement/surveillance": typeof recouvrement_surveillance;
  "recouvrement/tables": typeof recouvrement_tables;
  rgpd: typeof rgpd;
  storage: typeof storage;
  tests: typeof tests;
  users: typeof users;
  "utils/anonymousUser": typeof utils_anonymousUser;
  "utils/chatModel": typeof utils_chatModel;
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
