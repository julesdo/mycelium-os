# Le parcours de l'habitude, lots 1 à 4 — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** livrer les notifications push, le budget d'attention, les jalons célébrés et « Votre semaine », greffés sur l'expérience existante sans la doubler.

**Architecture:** la logique pure vit hors de `src/lib/convex/` (règles des catégories, du budget, des jalons, de la semaine), testée seule ; Convex lit, décide par ces modules, inscrit, programme. Un point d'entrée unique, `notifier()`, crée toute notification et programme son push. Le service worker ne fait que le push.

**Tech Stack:** React 19, TanStack Start, Convex, Cladd, Tailwind v4, `web-push` (action Node), Vitest, convex-test.

**Spec:** `docs/superpowers/specs/2026-10-21-parcours-habitude-design.md` (lots 5 à 7 : un second plan, écrit après la mise en production de celui-ci).

## Global Constraints

- Montants en centimes, `bigint` côté logique, `v.int64()` côté Convex ; jamais un flottant.
- Multi-établissement strict : toute table nouvelle porte `organizationId` ; la purge RGPD l'efface.
- Interface en français ; lexique du gérant (`lexique.test.ts`), jamais « garantie », aucun verdict.
- Classes Tailwind dans `src/ui/**` seulement ; un seul bouton plein par écran ; toute modale en page pleine (`FeuillePleinEcran`, `FeuilleDeReussite`).
- Commits `git commit --no-verify`, jamais de ligne de co-auteur ; chaque lot poussé par `git push origin HEAD:main` et vérifié servi.
- Une fonction Convex qui appelle `internal.<son module>` annote son type de retour.
- Rien vers un débiteur ; aucune surface tournée vers lui ne change.
- Le marketing par e-mail ou push : en semaine, 9 h-18 h, Paris (`prochainCreneauDEnvoi`, `verticales/recouvrement/plan-relance.ts`).

## Review Focus

1. Un import qui apporte vingt paiements : une seule notification « Paiements reçus », un seul push (Task 3, test `regrouperLesPaiements`).
2. Un compte ancien à la mise en service : les jalons déjà franchis s'inscrivent vus, aucune célébration en rafale (Task 6, test « premier relevé »).
3. Un appareil désabonné côté navigateur (réponse 410) : l'abonnement est retiré, l'envoi suivant ne réessaie pas (Task 2, test `_retirer`).
4. Une semaine vide : ni carte, ni e-mail, ni écran à zéros (Task 8, test « semaine vide »).
5. Le lundi : jamais le point du matin ET « Votre semaine » à la même personne (Task 10, test « un seul e-mail le lundi »).

---

## Lot 1 — `notifier()` et les notifications push

### Task 1: Les catégories et l'heure d'envoi (pur)

**Files:**
- Create: `src/lib/notifications/categories.ts`
- Test: `src/lib/notifications/__tests__/categories.test.ts`

**Interfaces:**
- Produces: `CATEGORIES_PUSH = ['PAIEMENTS', 'REPONSES', 'SEMAINE', 'COMPTE'] as const` ; `type CategoriePush` ; `type TypeDeNotification` (union des littéraux de `notifications.type`, trois de plus : `PAIEMENT_RECU`, `JALON`, `SEMAINE`) ; `categorieDuType(type: TypeDeNotification): CategoriePush` ; `estTransactionnel(type: TypeDeNotification): boolean` ; `heureDEnvoi(type: TypeDeNotification, maintenant: number): number`.

- [ ] **Step 1: Write the failing tests** — `categorieDuType('PAIEMENT_RECU') === 'PAIEMENTS'`, `('JALON') === 'PAIEMENTS'`, `('PILOTE_BLOQUE'|'PRESCRIPTION_PROCHE'|'ECHEANCE_PROCHE'|'IMPORT_TERMINE'|'RISQUE_EN_BAISSE') === 'REPONSES'`, `('SEMAINE') === 'SEMAINE'`, `('ABONNEMENT'|'HUMAN_ASSIST_REPLY') === 'COMPTE'`. `estTransactionnel('SEMAINE') === false`, tous les autres `true`. `heureDEnvoi('PAIEMENT_RECU', mardi 14:00 Paris) === maintenant` ; `(…, mardi 23:30 Paris) === mercredi 08:00 Paris` ; `heureDEnvoi('SEMAINE', samedi 10:00) === prochainCreneauDEnvoi(samedi 10:00)`.
- [ ] **Step 2: Run** `npx vitest run src/lib/notifications/__tests__/categories.test.ts` — Expected: FAIL (module absent).
- [ ] **Step 3: Implement** — transactionnel : tout de suite entre 8 h et 21 h Paris, sinon le prochain 8 h ; non transactionnel : `prochainCreneauDEnvoi(maintenant)`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(notifications): les catégories du push et leur heure`.

### Task 2: Le schéma, `notifier()` et l'envoi

**Files:**
- Modify: `src/lib/convex/schema.ts` (`notifications.type` + 3 littéraux ; `organizationMembers.categoriesCoupees: v.optional(v.array(v.string()))`), `src/lib/convex/notifications.ts` (validateur + 3 littéraux, `createNotification` passe par `notifier`)
- Create: `src/lib/convex/push/tables.ts` (table `abonnementsPush` : `organizationId`, `userId`, `endpoint`, `p256dh`, `auth`, `appareil`, `creeLe` ; index `by_user`, `by_endpoint`), ajoutée au schéma comme les autres tables de module
- Create: `src/lib/convex/notifier.ts`, `src/lib/convex/push/abonnements.ts`, `src/lib/convex/push/envoi.ts` (`'use node'`)
- Modify: les insertions directes de `abonnementRappels.ts:116`, `admin/support.ts:383`, `ouvertureFacturation.ts:115`, `risque/donnees.ts:625` → `notifier()`
- Modify: `src/lib/convex/rgpd*` (la purge efface `abonnementsPush`) ; `src/lib/__tests__/admin-tables.test.ts` si la nouvelle table l'exige
- Test: `src/lib/convex/__tests__/notifier.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `notifier(ctx: MutationCtx, n: { organizationId: Id<'organizations'>; userId: string; type: TypeDeNotification; title: string; message: string; link?: string }): Promise<Id<'notifications'>>` ; `push/abonnements` : `clePublique` (query publique → `string | null`), `abonner` (authedMutation `{ endpoint, p256dh, auth, appareil }`), `desabonner` (`{ endpoint }`), `mesReglages` (authedQuery → `{ categoriesCoupees: CategoriePush[]; appareils: number }`), `regler` (`{ categorie, active }`), `_pourEnvoi` (internalQuery `{ notificationId }` → `{ titre, texte, lien, abonnements } | null`, null si la catégorie est coupée), `_retirer` (internalMutation `{ endpoint }`) ; `push/envoi.envoyer` (internalAction `{ notificationId }`).

- [ ] **Step 1: Write the failing tests** (convex-test) — `notifier` insère la notification ET programme `push/envoi:envoyer` quand `VAPID_PUBLIC_KEY` est posée ; ne programme rien sans elle ; `_pourEnvoi` rend `null` quand la catégorie du type est dans `categoriesCoupees` du membre ; `_retirer` supprime l'abonnement de cet endpoint.
- [ ] **Step 2: Run** `npx vitest run src/lib/convex/__tests__/notifier.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** — `notifier` : insert, puis `ctx.scheduler.runAt(heureDEnvoi(type, Date.now()), internal.push.envoi.envoyer, { notificationId })` si `process.env.VAPID_PUBLIC_KEY`. `envoyer` : `web-push` (`setVapidDetails('mailto:' + adresse légale, publique, privée)`), `sendNotification(abonnement, JSON.stringify({ titre, texte, lien, tag: type }), { TTL: 86400, urgency: transactionnel ? 'high' : 'normal' })` ; 404/410 → `_retirer`. Ajouter `web-push` et `@types/web-push` (`bun add`).
- [ ] **Step 4: Run** le test, puis `npx vitest run src/lib/convex` (aucune régression des tests qui comptaient les insertions) — Expected: PASS.
- [ ] **Step 5: Commit** `feat(push): notifier() et l'envoi des notifications push`.

### Task 3: Les paiements reçus d'un import

**Files:**
- Create: `src/lib/notifications/paiements.ts` ; Test: `src/lib/notifications/__tests__/paiements.test.ts`
- Modify: `src/lib/convex/recouvrement/import.ts` (après les insertions de `reglements` d'un même import : une notification `PAIEMENT_RECU` par membre)

**Interfaces:**
- Produces: `regrouperLesPaiements(paiements: readonly { client: string; montant: bigint }[]): { titre: string; message: string } | null`.

- [ ] **Step 1: Test** — vide → `null` ; un paiement → titre `Garage Martin vous a payé`, message `1 240 € rapprochés sur sa facture.` ; trois paiements de deux clients → titre `2 clients vous ont payé`, message `4 120 € au total.` (montants formatés comme le produit, sans flottant).
- [ ] **Step 2-4: FAIL → implémenter → PASS.**
- [ ] **Step 5: Commit** `feat(notifications): un import, une notification de paiements`.

### Task 4: Le service worker, l'abonnement de l'appareil et les réglages

**Files:**
- Create: `public/sw.js` (`push` → `showNotification(titre, { body, icon: '/favicon.png', badge: '/favicon.png', data: { lien }, tag })` ; `notificationclick` → client ouvert focalisé et navigué, sinon `clients.openWindow(lien)` ; AUCUN `fetch`)
- Modify: `vercel.json` (en-tête `Cache-Control: no-cache` sur `/sw.js`)
- Create: `src/app/push.ts` (`etatDuPush(): 'INDISPONIBLE' | 'A_INSTALLER' | 'REFUSE' | 'POSSIBLE' | 'ACTIF'`, `enregistrerLeServiceWorker(): void`, `activerLePush(clePublique: string): Promise<PushSubscriptionJSON>`, `usePush()` qui relie à `push/abonnements`)
- Modify: `src/routes/app/route.tsx` (enregistre le service worker au repos, une fois)
- Create: `src/ui/notifications-push.tsx` (`ReglagesDuPush` : l'appareil et les quatre catégories ; `FeuilleDuPush` : la page pleine qui explique puis demande, ou dit d'installer sur iPhone)
- Modify: `src/screens/compte/compte.tsx` + `src/routes/app/compte.tsx` (section Notifications du profil) ; `src/routes/-salle/compte.tsx` (démo)
- Test: `src/app/__tests__/push.test.ts` (`etatDuPush` sur des `navigator`/`Notification` simulés : sans `PushManager` → `INDISPONIBLE` ; iPhone hors écran d'accueil → `A_INSTALLER` ; permission `denied` → `REFUSE`)

- [ ] **Step 1-4: test FAIL → implémenter → PASS ; regarder la section Notifications dans la salle à 375 px.**
- [ ] **Step 5: Générer les clés VAPID** (`web-push generateVAPIDKeys`) et les poser par `npx convex env set` sur le développement et la production, sans les afficher.
- [ ] **Step 6: Commit, pousser, vérifier servi** (`/sw.js` répond, la section s'affiche) — `feat(push): le service worker et les réglages des notifications`.

## Lot 2 — Le budget d'attention

### Task 5: Le module pur et sa table

**Files:**
- Create: `src/lib/croissance/attention.ts` ; Test: `src/lib/croissance/__tests__/attention.test.ts`
- Create: table `prisesDeParole` dans `src/lib/convex/croissance/tables.ts` (`organizationId`, `userId`, `canal: 'APP' | 'EMAIL'`, `genre`, `cle`, `le`, `ouverteLe?`, `expireeLe?` ; index `by_user_and_le`, `by_user_and_cle`)
- Create: `src/lib/convex/croissance/attention.ts` (`demanderLaParole`, `noterOuverte`, `noterExpiree`)
- Modify: `src/lib/convex/croissance/conseils.ts` (l'envoi d'un conseil demande la parole `EMAIL`, l'historique des conseils déjà inscrit compte)
- Modify: la purge RGPD efface `prisesDeParole` ; `demanderLaParole` lit les coupures dans `silencesPlume` (clés `marketing:<genre>`)

**Interfaces:**
- Produces: `type Canal = 'APP' | 'EMAIL'` ; `interface PriseDeParole { canal: Canal; genre: string; cle: string; le: number; ouverteLe: number | null; expireeLe: number | null }` ; `peutParler(historique: readonly PriseDeParole[], demande: { canal: Canal; genre: string }, maintenant: number, coupes: ReadonlySet<string>): { ok: true } | { ok: false; raison: 'COUPE' | 'DEJA_AUJOURDHUI' | 'CADENCE' | 'SEMAINE_PLEINE' | 'IGNORE' }` ; `demanderLaParole(ctx: MutationCtx, d: { organizationId; userId; canal: Canal; genre: string; cle: string }): Promise<boolean>`.

- [ ] **Step 1: Tests** — `coupes` contient `marketing:recommandation` → `COUPE` ; une prise `APP` aujourd'hui (Paris) → `DEJA_AUJOURDHUI`, hier → ok ; un `EMAIL` il y a 36 h → `CADENCE`, il y a 49 h → ok ; deux `EMAIL` cette semaine ISO → `SEMAINE_PLEINE` ; les deux dernières `APP` expirées sans ouverture, la plus récente il y a 3 jours → `IGNORE`, il y a 15 jours → ok.
- [ ] **Step 2-4: FAIL → implémenter → PASS** ; `npx vitest run src/lib/croissance src/lib/convex/__tests__` sans régression des conseils.
- [ ] **Step 5: Commit** `feat(croissance): le budget d'attention, un seul chef d'orchestre`.

## Lot 3 — Les jalons et leurs célébrations

### Task 6: Les jalons (pur) et leur relevé

**Files:**
- Create: `src/lib/verticales/recouvrement/jalons.ts` ; Test: `src/lib/verticales/recouvrement/__tests__/jalons.test.ts`
- Create: table `jalonsAtteints` (`organizationId`, `cle`, `atteintLe`, `montant?: v.int64()`, `reglementId?`, `vusPar: string[]`) dans `src/lib/convex/recouvrement/tables.ts`
- Create: `src/lib/convex/recouvrement/jalons.ts` (`releverLesJalons(ctx, organizationId): Promise<void>`, `jalonAMontrer` authedQuery, `jalonVu` authedMutation `{ id, ligne: 'TOUCHEE' | 'PASSEE' | 'AUCUNE' }`)
- Modify: les insertions de `reglements` (`import.ts`, `lettrage.ts`) et l'envoi du pilote (`pilote.ts:1295`) appellent `releverLesJalons` ; un jalon nouveau fait une notification `JALON` par `notifier()` ; la purge RGPD efface `jalonsAtteints`

**Interfaces:**
- Produces: `CLES_JALONS = ['PREMIERE_RELANCE', 'PREMIER_PAIEMENT', 'RENTRE_1000', 'RENTRE_10000', 'RENTRE_50000', 'RENTRE_100000', 'PREMIER_DOSSIER_SOLDE'] as const` ; `jalonsFranchis(e: { relancesParties: number; paiements: number; rentreCumule: bigint; dossiersSoldes: number }): CleJalon[]` ; `plusHautJalon(cles: readonly CleJalon[]): CleJalon | null` (ordre de `CLES_JALONS`, le dernier franchi est le plus haut, `RENTRE_*` passent avant `PREMIER_DOSSIER_SOLDE`) ; `ligneSecondaire(cle, ctx: { pushActif: boolean; mensuel: boolean; anneeProposee: boolean; recommandationCoupee: boolean }): 'PUSH' | 'ANNEE' | 'RECOMMANDATION' | null`.

- [ ] **Step 1: Tests** — `rentreCumule: 100_000n` (1 000 €) → contient `RENTRE_1000` pas `RENTRE_10000` ; `ligneSecondaire('PREMIERE_RELANCE', { pushActif: false, … }) === 'PUSH'` ; `('RENTRE_10000', { pushActif: true, mensuel: true, anneeProposee: false }) === 'ANNEE'` ; `(…, mensuel: false, recommandationCoupee: false) === 'RECOMMANDATION'` ; convex-test : au **premier relevé** d'un établissement qui a déjà 12 000 € rentrés, les jalons franchis s'inscrivent avec `vusPar` = tous les membres (aucune célébration) ; un paiement suivant qui franchit `RENTRE_50000` crée une ligne non vue et une notification `JALON`.
- [ ] **Step 2-4: FAIL → implémenter → PASS.** Le cumul suit `bilanDe` (`abonnementRappels.ts`) : paiements et acomptes depuis l'arrivée.
- [ ] **Step 5: Commit** `feat(jalons): les réussites, relevées une fois chacune`.

### Task 7: La célébration, la proposition des notifications et la fête dédoublonnée

**Files:**
- Create: `src/ui/celebration-jalon.tsx` (`CelebrationDeJalon` sur `FeuilleDeReussite` : titre, montant héros, `detail`, `principale` « Continuer », `secondaire` selon `ligneSecondaire` : `PUSH` ouvre `FeuilleDuPush`, `ANNEE` ouvre la confirmation de changement existante vers l'année, `RECOMMANDATION` reste inerte jusqu'au lot 7 et ne s'affiche donc pas avant)
- Modify: `src/routes/app/index.tsx` (montre `jalonAMontrer` à l'ouverture d'Aujourd'hui, jamais par-dessus une feuille ouverte ; demande la parole `APP`, genre `jalon`)
- Modify: la composition de la bulle (là où `paroleDUnPaiement` est produite) : un paiement porté par un jalon non vu ne fait pas de parole
- Modify: `src/routes/-salle/accueil.tsx` (une variante « jalon »)
- Test: `src/ui/__tests__/celebration-jalon.test.tsx` (le texte de `RENTRE_10000` : « 10 000 € » et « rentrés sur les dossiers suivis », jamais « grâce à » ; la ligne `PUSH` ouvre `FeuilleDuPush`)

- [ ] **Step 1-4: FAIL → implémenter → PASS ; regarder la variante à 375 et 1280 px.**
- [ ] **Step 5: Commit, pousser, vérifier servi** — `feat(jalons): la célébration à la visite suivante`.

## Lot 4 — « Votre semaine »

### Task 8: La semaine (pur)

**Files:**
- Create: `src/lib/verticales/recouvrement/votre-semaine.ts` ; Test: `src/lib/verticales/recouvrement/__tests__/votre-semaine.test.ts`

**Interfaces:**
- Produces: `bornesDeLaSemaineEcoulee(maintenant: number): { debut: string; fin: string }` (lundi et dimanche AAAA-MM-JJ, Paris) ; `interface VotreSemaine { debut; fin; rentre: bigint; relancesParties: number; clientsQuiOntPaye: number; dateLimiteDansJours: number | null; huitSemaines: bigint[]; meilleureDepuis: string | null }` ; `composerLaSemaine(d: { debut; fin; paiements: readonly { date: string; montant: bigint; debiteurId: string }[]; relancesParties: number; dateLimiteDansJours: number | null; historique: readonly bigint[]; datesDesSemaines: readonly string[]; arriveeLe: string }): VotreSemaine | null`.

- [ ] **Step 1: Tests** — un mercredi 22/10/2026 → `{ debut: '2026-10-12', fin: '2026-10-18' }` ; **semaine vide** (0 rentré, 0 parti, date limite à 45 j) → `null` ; date limite à 12 j seule → non nul ; `meilleureDepuis` : la semaine dépasse les 6 précédentes et la 7e la dépassait → la date de cette 7e ; dépasse tout l'historique → `'arrivee'` ; ne dépasse pas les 4 dernières → `null`.
- [ ] **Step 2-4: FAIL → implémenter → PASS.**
- [ ] **Step 5: Commit** `feat(semaine): le calcul de votre semaine`.

### Task 9: L'écran, la carte du moment

**Files:**
- Create: `src/lib/convex/recouvrement/semaine.ts` (`votreSemaine` authedQuery → `VotreSemaine | null` ; `carteDuLundi` authedQuery → `{ rentre: bigint; relancesParties: number; dateLimiteDansJours: number | null } | null`, du lundi au mercredi, non vue, autorisée par `peutParler` en lecture ; `semaineVue` authedMutation)
- Create: `src/screens/semaine.tsx` (`EcranSemaine` : héros, « meilleure semaine depuis », barres à l'encre, relevé, « Cette semaine ») ; `src/routes/app/semaine.tsx` (route poussée, `loader` qui précharge)
- Modify: `src/screens/file.tsx` (`Tete` reçoit `carteDuMoment?` et la pose sous la bande d'ancienneté, au-dessus de « Jamais réclamé ») ; `src/routes/app/index.tsx`
- Modify: `src/routes/-salle/ecrans.tsx` (l'écran « Votre semaine ») ; `src/ui/__tests__/destinations-existent.test.ts` si la route nouvelle l'exige

- [ ] **Step 1-3: implémenter ; regarder l'écran et la carte dans la salle à 375 / 768 / 1024 / 1280 px.**
- [ ] **Step 4: Commit** `feat(semaine): l'écran et la carte du lundi`.

### Task 10: L'e-mail du lundi

**Files:**
- Create: `src/lib/convex/emails/modeles/semaine.ts` (sur la coquille commune des e-mails)
- Modify: `src/lib/convex/recouvrement/battement.ts` (le lundi : « Votre semaine » à qui ne l'a pas coupée et dont la semaine n'est pas vide, demande la parole `EMAIL` ; le point du matin aux autres)
- Modify: `scripts/apercu-emails.ts` (l'aperçu)
- Test: `src/lib/convex/emails/__tests__/semaine.test.ts` — **un seul e-mail le lundi** : un membre reçoit « Votre semaine » et pas le point du matin ; un membre qui a coupé `SEMAINE` reçoit le point du matin ; le texte ne contient ni « garanti » ni « grâce à ».

- [ ] **Step 1-4: FAIL → implémenter → PASS.**
- [ ] **Step 5: Commit, pousser, vérifier servi** — `feat(semaine): l'e-mail du lundi, à la place du point du matin`.
