# Mycelium Fleet OS — Checklist mise en production

> Cible : Go-to-market UK + Nordiques, juillet/août 2026.
> Sprints classés par ordre de priorité / dépendance.

---

## Sprint 5A — Bloquants légaux & distribution (semaine 1)

Ces éléments bloquent la soumission aux App Stores Xero et QuickBooks.

- [ ] **Privacy Policy** — rédiger page `/legal/privacy` (EN + FR). Couvrir : données collectées, Paddle, Resend, Convex, rétention, droits RGPD/UK GDPR.
- [ ] **Terms of Service** — rédiger page `/legal/terms` (EN + FR). Inclure : conditions d'abonnement Paddle, SLA, limitations de responsabilité.
- [ ] **Cookie banner** — consentement minimal conforme UK ICO (pas de third-party cookies actifs pour l'instant, à confirmer).
- [ ] **Mentions légales** — footer landing page : société, SIREN, siège social, email contact.
- [ ] **Lien légal dans footer** — landing + app admin + app salarié.

---

## Sprint 5B — Traductions (semaine 1–2)

Sans EN complet, pas de lancement UK Day-1.

- [ ] **Audit i18n existant** — lister toutes les clés manquantes dans `src/i18n/en.json` vs `fr.json` (comparer les deux fichiers).
- [ ] **Logiciel admin EN** — traduire toutes les clés `admin.*` manquantes.
- [ ] **Logiciel app salarié EN** — traduire toutes les clés `app.*` manquantes.
- [ ] **Landing page EN** — vérifier section par section que `en.json` est complet (landing.hero, landing.features, landing.pricing, landing.cta...).
- [ ] **Onboarding wizard EN** — labels, placeholders, messages d'erreur.
- [ ] **Emails transactionnels EN** — templates Resend (confirmation réservation, rappel, maintenance, violation) en anglais.
- [ ] **Tester le switch de langue** — vérifier que `/en/admin/*` et `/en/app/*` n'ont aucun fallback FR visible.

> Nordiques (SE/NO/DK) : l'anglais suffit pour le lancement. Traductions native SV/NO/DA = post-M6.

---

## Sprint 5C — Features restantes roadmap (semaine 2)

- [ ] **P_CSRD_PDF** — remplacer `window.print()` par génération PDF côté client (jsPDF ou Pdfmake). Inclure métadonnées ESRS E1 dans les propriétés du document. Page `/admin/sustainability/esrs-e1/`.
- [ ] **Lighthouse 80+** — auditer les pages clés (dashboard, fleet, concierge). Corriger les principales issues (LCP, CLS, images non-optimisées).
- [ ] **Zéro bug critique** — passer en revue les TODOs dans le code, tester les flows critiques (onboarding → réservation → facturation → export).

---

## Sprint 5D — Monitoring & fiabilité (semaine 2–3)

- [ ] **Sentry** — intégrer `@sentry/sveltekit` (front) + Sentry dans les Convex actions (catch global). Configurer alertes pour les erreurs 5xx et les exceptions non-catchées.
- [ ] **Uptime monitoring** — Better Uptime ou Checkly sur `https://app.mycelium.io` + endpoint Convex health.
- [ ] **Rate limiting** — vérifier que `@convex-dev/rate-limiter` est actif sur tous les httpActions publics (concierge, manager, v1 API).
- [ ] **Logs structurés** — s'assurer qu'aucun `console.log` de debug ne subsiste en prod (grep `console.log` hors scripts).

---

## Sprint 5E — Distribution App Stores (semaine 3)

### Xero App Marketplace

- [ ] Compte développeur Xero activé.
- [ ] Fiche app EN : nom, description courte (160 car.), description longue, catégorie (Fleet Management).
- [ ] Screenshots × 5 (1280×800 ou 1920×1080) : dashboard, calendrier, concierge IA, BiK UK, CSRD.
- [ ] Logo 512×512 PNG fond transparent.
- [ ] URL démo / sandbox configurée.
- [ ] Soumission review Xero (délai : 2–4 semaines).

### QuickBooks App Store (Intuit)

- [ ] Compte développeur Intuit.
- [ ] Fiche app EN : même structure que Xero.
- [ ] Screenshots × 5 adaptés (QuickBooks audience = PME US/UK).
- [ ] OAuth QuickBooks testé en prod (pas seulement sandbox).
- [ ] Soumission review Intuit (délai : 3–6 semaines).

### Odoo Community

- [ ] Module `/integrations/odoo-mycelium/` publié sur apps.odoo.com.
- [ ] README EN + FR, LGPL-3, version Odoo 16/17.
- [ ] Tester l'install depuis le marketplace Odoo.

---

## Sprint 5F — SEO & acquisition (semaine 3–4)

- [ ] **Meta tags** — `<title>`, `<meta description>`, OG (og:title, og:description, og:image 1200×630) sur chaque page landing.
- [ ] **sitemap.xml** — générer et soumettre à Google Search Console.
- [ ] **robots.txt** — autoriser les crawlers sur `/`, bloquer `/admin/*` et `/app/*`.
- [ ] **OG image** — créer une image branded 1200×630 pour le partage social.
- [ ] **Google Analytics / Plausible** — tracker les conversions landing → signup → onboarding.
- [ ] **Schema.org SoftwareApplication** — markup JSON-LD pour le SEO.

---

## Sprint 5G — Onboarding & rétention (semaine 4)

- [ ] **Email de bienvenue** — séquence post-signup : J+0 bienvenue, J+3 tips premiers pas, J+7 invitation à inviter l'équipe.
- [ ] **Demo data** — organisation "Demo Corp" avec données fictives pour permettre aux prospects de tester sans import CSV.
- [ ] **Checklist GettingStarted** — vérifier que le composant `GettingStartedCard` du dashboard est correct et complet (4 étapes : org configurée, 1er véhicule, 1ère réservation, équipe invitée).
- [ ] **Intercom / Crisp** — chat support en bas à droite sur la landing et dans l'app (complémentaire au système de tickets interne).

---

## Résumé priorisation

| Sprint | Contenu                 | Délai cible | Bloquant prod ?   |
| ------ | ----------------------- | ----------- | ----------------- |
| 5A     | Légal (Privacy, ToS)    | Sem. 1      | ✅ Oui            |
| 5B     | Traductions EN          | Sem. 1–2    | ✅ Oui            |
| 5C     | CSRD PDF + Lighthouse   | Sem. 2      | Partiel           |
| 5D     | Monitoring + sécurité   | Sem. 2–3    | Recommandé        |
| 5E     | App Stores (soumission) | Sem. 3      | Pour distribution |
| 5F     | SEO + meta              | Sem. 3–4    | Non               |
| 5G     | Onboarding + rétention  | Sem. 4      | Non               |
