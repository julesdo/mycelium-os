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
import type * as egalim_agregation from "../egalim/agregation.js";
import type * as egalim_appariement from "../egalim/appariement.js";
import type * as egalim_attestations from "../egalim/attestations.js";
import type * as egalim_batches from "../egalim/batches.js";
import type * as egalim_classificateurClaude from "../egalim/classificateurClaude.js";
import type * as egalim_classification from "../egalim/classification.js";
import type * as egalim_classificationMutations from "../egalim/classificationMutations.js";
import type * as egalim_classificationSchema from "../egalim/classificationSchema.js";
import type * as egalim_confirmation from "../egalim/confirmation.js";
import type * as egalim_consensus from "../egalim/consensus.js";
import type * as egalim_courrier from "../egalim/courrier.js";
import type * as egalim_cout from "../egalim/cout.js";
import type * as egalim_diagnostics from "../egalim/diagnostics.js";
import type * as egalim_doublons from "../egalim/doublons.js";
import type * as egalim_extracteurClaude from "../egalim/extracteurClaude.js";
import type * as egalim_extraction from "../egalim/extraction.js";
import type * as egalim_extractionMutations from "../egalim/extractionMutations.js";
import type * as egalim_extractionSchema from "../egalim/extractionSchema.js";
import type * as egalim_lot from "../egalim/lot.js";
import type * as egalim_mentions from "../egalim/mentions.js";
import type * as egalim_normalisation from "../egalim/normalisation.js";
import type * as egalim_parsers_csv from "../egalim/parsers/csv.js";
import type * as egalim_pilotage from "../egalim/pilotage.js";
import type * as egalim_produits from "../egalim/produits.js";
import type * as egalim_prompt from "../egalim/prompt.js";
import type * as egalim_promptExtraction from "../egalim/promptExtraction.js";
import type * as egalim_reprise from "../egalim/reprise.js";
import type * as egalim_tables from "../egalim/tables.js";
import type * as egalim_verdict from "../egalim/verdict.js";
import type * as egalim_verification from "../egalim/verification.js";
import type * as emails__generated_adminReplyNotification from "../emails/_generated/adminReplyNotification.js";
import type * as emails__generated_index from "../emails/_generated/index.js";
import type * as emails__generated_newTicketAdminNotification from "../emails/_generated/newTicketAdminNotification.js";
import type * as emails__generated_newUserSignupNotification from "../emails/_generated/newUserSignupNotification.js";
import type * as emails__generated_passwordReset from "../emails/_generated/passwordReset.js";
import type * as emails__generated_verification from "../emails/_generated/verification.js";
import type * as emails__generated_verificationCode from "../emails/_generated/verificationCode.js";
import type * as emails_events from "../emails/events.js";
import type * as emails_helpers from "../emails/helpers.js";
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
  "egalim/agregation": typeof egalim_agregation;
  "egalim/appariement": typeof egalim_appariement;
  "egalim/attestations": typeof egalim_attestations;
  "egalim/batches": typeof egalim_batches;
  "egalim/classificateurClaude": typeof egalim_classificateurClaude;
  "egalim/classification": typeof egalim_classification;
  "egalim/classificationMutations": typeof egalim_classificationMutations;
  "egalim/classificationSchema": typeof egalim_classificationSchema;
  "egalim/confirmation": typeof egalim_confirmation;
  "egalim/consensus": typeof egalim_consensus;
  "egalim/courrier": typeof egalim_courrier;
  "egalim/cout": typeof egalim_cout;
  "egalim/diagnostics": typeof egalim_diagnostics;
  "egalim/doublons": typeof egalim_doublons;
  "egalim/extracteurClaude": typeof egalim_extracteurClaude;
  "egalim/extraction": typeof egalim_extraction;
  "egalim/extractionMutations": typeof egalim_extractionMutations;
  "egalim/extractionSchema": typeof egalim_extractionSchema;
  "egalim/lot": typeof egalim_lot;
  "egalim/mentions": typeof egalim_mentions;
  "egalim/normalisation": typeof egalim_normalisation;
  "egalim/parsers/csv": typeof egalim_parsers_csv;
  "egalim/pilotage": typeof egalim_pilotage;
  "egalim/produits": typeof egalim_produits;
  "egalim/prompt": typeof egalim_prompt;
  "egalim/promptExtraction": typeof egalim_promptExtraction;
  "egalim/reprise": typeof egalim_reprise;
  "egalim/tables": typeof egalim_tables;
  "egalim/verdict": typeof egalim_verdict;
  "egalim/verification": typeof egalim_verification;
  "emails/_generated/adminReplyNotification": typeof emails__generated_adminReplyNotification;
  "emails/_generated/index": typeof emails__generated_index;
  "emails/_generated/newTicketAdminNotification": typeof emails__generated_newTicketAdminNotification;
  "emails/_generated/newUserSignupNotification": typeof emails__generated_newUserSignupNotification;
  "emails/_generated/passwordReset": typeof emails__generated_passwordReset;
  "emails/_generated/verification": typeof emails__generated_verification;
  "emails/_generated/verificationCode": typeof emails__generated_verificationCode;
  "emails/events": typeof emails_events;
  "emails/helpers": typeof emails_helpers;
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
