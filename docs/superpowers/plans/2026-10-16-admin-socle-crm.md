# L'interface admin, socle et CRM — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une interface `/admin` réservée à une équipe Letikette à rôles, protégée par la double authentification, qui porte le CRM (comptes, prospects, import, historique, tâches) sans jamais montrer le contenu d'un dossier.

**Architecture:** La décision vit en pur : le verdict d'accès (`src/lib/admin/acces.ts`), la lecture du CSV, l'association des colonnes, la vérification d'un import, le groupement des tâches (`src/lib/crm/`). Les fonctions Convex vivent dans `src/lib/convex/admin/`, toutes derrière une enveloppe (`equipeQuery`, `equipeMutation`) qui applique le verdict ; une barrière exécutable borne les tables qu'elles lisent. Les écrans vivent dans `src/routes/admin/` (routes chargées à part) et `src/screens/admin/`, sur la coquille de bureau existante et une barre du bas propre à l'admin.

**Tech Stack:** Convex, Better Auth (`twoFactor`), React 19, TanStack Router, Cladd, `qrcode-generator` (déjà installé), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-16-admin-socle-crm.md`.

## Global Constraints

- L'équipe ne voit jamais un débiteur, une facture, un montant, un document, un courrier, une conversation avec Plume : les fonctions `admin/` ne lisent que la liste fermée de tables de la spec (§ 8).
- Toute fonction publique de `admin/` passe par `equipeQuery` / `equipeMutation` avec un rôle minimal ; seules `admin/acces:monAcces` (lecture de l'état) et les fonctions internes en sont dispensées.
- Rôles : `LECTURE` < `SUPPORT` < `FONDATEUR`. Écrire au CRM : `SUPPORT`. Équipe et journal : `FONDATEUR`.
- Double authentification obligatoire pour l'équipe ; adresse vérifiée obligatoire.
- Français partout, jamais « garantie », pas de tiret cadratin dans un texte d'écran, aucune couleur de seuil pour un retard (« En retard de 2 j » à l'encre).
- Un seul bouton plein par écran ; toute modale est une `FeuillePleinEcran` ; pas de `setState` dans un effet ; `useQuery` par `app/donnees.ts` ; classes arbitraires seulement dans `src/ui`.
- Les tables de prospection (`prospects`, `oppositions`, `importsProspects`, `equipe`) sont exemptées nommément du cloisonnement ; `journalEquipe`, `evenementsCrm`, `tachesCrm` portent un `organizationId` facultatif indexé `by_org` et sont purgées avec l'établissement.
- Commits : `git commit --no-verify -F`, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, staging par chemin, livraison `git push origin HEAD:main` à la fin de chaque lot vérifié.

## Review Focus

1. **Un membre retiré, ou dont la double authentification a été coupée, garde un onglet admin ouvert** : le prochain appel serveur doit refuser (Task 1, test du verdict « retiré » et « sans double authentification »).
2. **Le dernier fondateur se retire ou se rétrograde par erreur** : refusé (Task 1, test).
3. **Un CSV exporté d'Excel en français** (séparateur `;`, BOM, guillemets, retours à la ligne dans une cellule) s'importe sans décaler les colonnes (Task 3, tests de `lireCsv`).
4. **Un prospect en opposition réapparaît par un nouvel import** : la ligne est écartée et dite (Task 3, test de `verifierImport`).
5. **Une fonction admin nouvelle lit `facturesVente`** : la barrière tombe (Task 1, `admin-tables.test.ts`).

---

### Task 1: L'équipe, le verdict d'accès, l'enveloppe, la barrière

**Files:**
- Create: `src/lib/admin/acces.ts`, `src/lib/admin/__tests__/acces.test.ts`
- Create: `src/lib/convex/admin/tables.ts` (`equipe`, `journalEquipe`)
- Modify: `src/lib/convex/schema.ts` (étaler `adminTables`)
- Create: `src/lib/convex/admin/enveloppe.ts` (`equipeQuery`, `equipeMutation`, `noterAuJournal`)
- Create: `src/lib/convex/admin/acces.ts` (`monAcces`)
- Create: `src/lib/convex/admin/equipe.ts` (`amorcer` interne, `membres`, `inviter`, `changerRole`, `retirer`, `journal`)
- Create: `src/lib/convex/__tests__/admin-tables.test.ts`
- Modify: `src/lib/convex/rgpd.ts` (purge `journalEquipe` par `by_org`), `src/lib/convex/__tests__/purge-complete.test.ts` (lire `admin/tables.ts`), `src/lib/convex/__tests__/recherche-cloisonnee.test.ts` (exemptions nommées si le test l'exige)

**Interfaces:**
- Produces: `type RoleEquipe = 'FONDATEUR' | 'SUPPORT' | 'LECTURE'`, `verdictDAcces(entree, roleMin): { ok: true; role } | { ok: false; raison; message }`, `equipeQuery(roleMin)`, `equipeMutation(roleMin)` (ctx porte `equipier: { email, role, userId, nom }`), `noterAuJournal(ctx, { action, cible, organizationId? })`, `api.admin.acces.monAcces`.

- [ ] **Step 1: Test du verdict** — sans session ; adresse non vérifiée ; hors équipe ; membre retiré ; sans double authentification ; rôle insuffisant (`LECTURE` pour un geste `SUPPORT`) ; fondateur valide ; `SUPPORT` valide pour `LECTURE`.
- [ ] **Step 2:** Le voir échouer (module absent).
- [ ] **Step 3:** Écrire `src/lib/admin/acces.ts` :

```ts
export const ROLES_EQUIPE = ['LECTURE', 'SUPPORT', 'FONDATEUR'] as const;
export type RoleEquipe = (typeof ROLES_EQUIPE)[number];
export type RaisonDeRefus = 'SESSION' | 'HORS_EQUIPE' | 'DOUBLE_AUTH' | 'ROLE';

export interface EntreeAcces {
	readonly utilisateur: { readonly email: string; readonly emailVerified?: boolean; readonly twoFactorEnabled?: boolean | null } | null;
	readonly membre: { readonly role: RoleEquipe; readonly retireLe?: number } | null;
}

const MESSAGES: Record<RaisonDeRefus, string> = {
	SESSION: 'Connectez-vous.',
	HORS_EQUIPE: 'Réservé à l’équipe de Letikette.',
	DOUBLE_AUTH: 'Activez la double authentification dans votre profil.',
	ROLE: 'Votre rôle ne permet pas ce geste.'
};

export function rangDuRole(role: RoleEquipe): number {
	return ROLES_EQUIPE.indexOf(role);
}

export function verdictDAcces(
	e: EntreeAcces,
	roleMin: RoleEquipe
): { ok: true; role: RoleEquipe } | { ok: false; raison: RaisonDeRefus; message: string } {
	const refus = (raison: RaisonDeRefus) => ({ ok: false as const, raison, message: MESSAGES[raison] });
	if (e.utilisateur === null) return refus('SESSION');
	if (e.utilisateur.emailVerified !== true || e.membre === null || e.membre.retireLe !== undefined) {
		return refus('HORS_EQUIPE');
	}
	if (e.utilisateur.twoFactorEnabled !== true) return refus('DOUBLE_AUTH');
	if (rangDuRole(e.membre.role) < rangDuRole(roleMin)) return refus('ROLE');
	return { ok: true, role: e.membre.role };
}
```

- [ ] **Step 4:** Tables `equipe` (`email`, `role`, `invitePar`, `inviteLe`, `rejointLe?`, `retireLe?`, index `by_email`) et `journalEquipe` (`auteur` (email), `action`, `cible: { type, id?, libelle }`, `organizationId?`, `le`, index `by_org`, `by_le`), étalées dans le schéma.
- [ ] **Step 5:** `enveloppe.ts` : `equipeQuery(roleMin)` = `customQuery(query, customCtx(async (ctx) => { const u = await authComponent.getAuthUser(ctx); const membre = u ? await ctx.db.query('equipe').withIndex('by_email', q => q.eq('email', u.email.toLowerCase())).first() : null; const v = verdictDAcces(...); if (!v.ok) throw new ConvexError(v.message); return { equipier: { email, role: v.role, userId: u._id, nom: u.name } }; }))`, idem mutation ; `noterAuJournal`.
- [ ] **Step 6:** `acces.ts` : `monAcces` (query sans enveloppe) rend `{ etat: 'HORS_EQUIPE' | 'DOUBLE_AUTH_REQUISE' | 'OK'; role?: RoleEquipe }` à partir du même verdict (rôle minimal `LECTURE`).
- [ ] **Step 7:** `equipe.ts` : `amorcer` (internalMutation, refuse s'il existe un fondateur actif), `membres` (FONDATEUR : liste + invitations + double auth active de chacun, lue par l'adaptateur Better Auth), `inviter` (FONDATEUR ; e-mail minuscule ; refuse un doublon actif ; envoie l'e-mail « Rejoindre l'équipe de Letikette »), `changerRole`, `retirer` (refusent de toucher au dernier fondateur actif), `journal` (FONDATEUR, 200 derniers, filtre par auteur). Chaque geste s'inscrit au journal.
- [ ] **Step 8: La barrière** `admin-tables.test.ts` : lit tous les fichiers de `src/lib/convex/admin/`, relève chaque `query('<table>')`, et échoue si une table n'est pas dans `TABLES_AUTORISEES` (`organizations`, `organizationMembers`, `profilsCreancier`, `parcoursComptes`, `envoisCroissance`, `journeesPlume`, `pilotes`, `equipe`, `journalEquipe`, `prospects`, `oppositions`, `evenementsCrm`, `tachesCrm`, `importsProspects`) ; garde-fou : au moins un `query(` trouvé.
- [ ] **Step 9:** Purge : `journalEquipe` par `by_org` dans `rgpd.ts` ; `purge-complete.test.ts` lit aussi `admin/tables.ts`.
- [ ] **Step 10:** Tests, types, lint. **Commit** — `feat(admin): l'équipe à rôles, le verdict d'accès et sa barrière`.

### Task 2: La double authentification

**Files:**
- Modify: `src/lib/convex/betterAuth/schema.ts` (`user.twoFactorEnabled`, table `twoFactor` : `secret`, `backupCodes`, `userId`, index `userId`)
- Modify: `src/lib/convex/betterAuth/auth.ts` et/ou `src/lib/convex/auth.ts` (plugin `twoFactor({ issuer: 'Letikette' })`)
- Modify: `src/lib/client/auth.ts` (`twoFactorClient()`)
- Modify: `src/routes/connexion.tsx` (si `data.twoFactorRedirect`, aller à `/connexion/verification`)
- Create: `src/routes/connexion.verification.tsx` (code à six chiffres ou code de secours)
- Create: `src/ui/double-authentification.tsx` (rangée du profil : activer en trois temps, QR par `qrcode-generator`, codes de secours ; désactiver)
- Modify: `src/screens/compte/compte.tsx`, `src/routes/app/compte.tsx`, `src/routes/-salle/compte.tsx` (la rangée « Double authentification »)

- [ ] **Step 1:** Ajouter le schéma et le plugin ; `tsc` des deux projets.
- [ ] **Step 2:** Client : `twoFactorClient()` ; connexion qui suit `twoFactorRedirect` ; page de vérification (`authClient.twoFactor.verifyTotp({ code, trustDevice: true })`, `verifyBackupCode`).
- [ ] **Step 3:** La rangée du profil : « Activer » → mot de passe → `authClient.twoFactor.enable({ password })` rend `totpURI` et `backupCodes` → QR + clé en clair + champ du code → `verifyTotp` → les dix codes de secours à copier → « C'est activé ». « Désactiver » demande le mot de passe.
- [ ] **Step 4:** Test pur de l'extraction de la clé depuis `totpURI` (`secret=` décodé) ; types ; lint ; build. **Commit** — `feat(compte): la double authentification`.

### Task 3: Le CRM, côté données

**Files:**
- Create: `src/lib/crm/csv.ts` (`lireCsv(texte): string[][]`), `src/lib/crm/colonnes.ts` (`CHAMPS_PROSPECT`, `associerColonnes(entetes)`), `src/lib/crm/import.ts` (`verifierImport(lignes, association, existants, oppositions)`), `src/lib/crm/statuts.ts` (`STATUTS_PROSPECT`, libellés, vues), `src/lib/crm/taches.ts` (`grouperTaches`), `src/lib/crm/empreinte.ts` (`normaliserEmail`), tests dans `src/lib/crm/__tests__/`
- Create: `src/lib/convex/admin/tables.ts` (ajouter `prospects`, `oppositions`, `evenementsCrm`, `tachesCrm`, `importsProspects`)
- Create: `src/lib/convex/admin/comptes.ts` (`liste`, `fiche` (inscrit au journal), `parVue`)
- Create: `src/lib/convex/admin/prospects.ts` (`liste`, `fiche`, `creer`, `modifier`, `changerStatut` (plusieurs), `assigner`, `stop`)
- Create: `src/lib/convex/admin/import.ts` (`importer` : vérifie de nouveau côté serveur, écrit, garde l'historique)
- Create: `src/lib/convex/admin/historique.ts` (`noter` : note, appel, e-mail, réponse)
- Create: `src/lib/convex/admin/taches.ts` (`liste`, `creer`, `cocher`, `decocher`)
- Create: `src/lib/convex/admin/aujourdhui.ts`
- Create: `src/lib/convex/admin/entretien.ts` (effacement des prospects sans contact depuis trois ans ; tâche « Appeler » au score)
- Modify: `src/lib/convex/croissance/releve.ts` (rapprochement prospect ↔ compte ; tâche « Appeler » au franchissement de `SEUIL_APPELER`), `src/lib/convex/crons.ts`, `src/lib/convex/rgpd.ts` (purge `evenementsCrm`, `tachesCrm` par `by_org`)

- [ ] **Step 1: Tests purs** : `lireCsv` (`;` et `,`, BOM, guillemets doublés, retour à la ligne dans une cellule, ligne vide finale) ; `associerColonnes` (les 26 titres de `docs/croissance/prospection.csv`, casse et accents indifférents) ; `verifierImport` (doublon d'e-mail, doublon de SIREN, opposition, sans entreprise, ligne d'exemple « EXEMPLE » écartée) ; `grouperTaches` (en retard, aujourd'hui, plus tard, faites depuis sept jours).
- [ ] **Step 2:** Les voir échouer, puis écrire les modules.
- [ ] **Step 3:** Tables et fonctions Convex ; rapprochement et tâche au score dans le relevé ; cron nocturne ; purge.
- [ ] **Step 4:** Test Convex : l'import écarte une opposition et un doublon ; `stop` efface les coordonnées et ajoute l'empreinte ; le rapprochement passe un prospect « Inscrit ».
- [ ] **Step 5:** Barrière des tables, purge, types, lint. **Commit** — `feat(admin): le CRM côté données`.

### Task 4: La coquille et les écrans

**Files:**
- Create: `src/app/coquille-admin.tsx` (barre latérale par `BarreLaterale` avec les groupes de l'admin ; barre du bas par `BarreDuBas` ; barre du haut)
- Create: `src/routes/admin/route.tsx` (garde par `monAcces`), `index.tsx` (Aujourd'hui), `comptes.tsx`, `comptes.$id.tsx`, `prospects.tsx`, `prospects.$id.tsx`, `prospects.importer.tsx`, `taches.tsx`, `equipe.tsx`, `journal.tsx`
- Create: `src/screens/admin/*.tsx` (les écrans, sans Convex)
- Modify: `src/screens/compte/compte.tsx` et `src/routes/app/compte.tsx` (la rangée « Admin » pour l'équipe)

- [ ] **Step 1:** La garde et la coquille ; une page « Réservé à l'équipe de Letikette » et une « Activez la double authentification ».
- [ ] **Step 2:** Aujourd'hui ; Comptes (vues en pastilles, tableau au bureau, cartes au téléphone) ; la fiche (deux colonnes au bureau ; segments au téléphone ; gestes rapides ; À faire ; historique groupé par jour ; composeur).
- [ ] **Step 3:** Prospects (liste et pipeline ; statut dans la ligne avec « Annuler » ; barre d'actions groupées ; ajout en page pleine avec la recherche au registre) ; la fiche ; l'import en étapes.
- [ ] **Step 4:** Tâches ; Équipe ; Journal ; la rangée « Admin » du compte.
- [ ] **Step 5:** Lexique et mot interdit étendus à `src/screens/admin` et `src/routes/admin` ; types ; lint ; build ; regard au navigateur sur la salle ou en développement aux largeurs de référence. **Commit** — `feat(admin): la coquille et les écrans du CRM`.

### Task 5: Les règles, la politique, la livraison

- [ ] **Step 1:** CLAUDE.md : la règle des rôles (« une équipe Letikette à rôles, qui ne voit jamais le contenu d'un dossier ») et un paragraphe « L'interface admin ».
- [ ] **Step 2:** Politique de confidentialité 2.7 : la prospection B2B de Letikette (finalité, base légale de l'intérêt légitime, source des contacts, opposition, trois ans), l'équipe et son journal, la double authentification.
- [ ] **Step 3:** Suite complète, types, lint, build. **Commit** et livraison ; vérifier le déploiement ; dire au fondateur la commande d'amorçage.
