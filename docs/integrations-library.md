# Bibliothèque d'intégrations Mycelium Fleet OS

## Marchés cibles : Royaume-Uni + Nordiques (SE/NO/DK/FI) — Global Day-1

> Référence technique et produit pour toutes les intégrations tierces de Mycelium.  
> Mise à jour : juin 2026. Responsable : équipe produit Mycelium.

---

## 1. Architecture de sécurité transversale

Chaque connecteur Mycelium suit ces règles sans exception :

| Couche               | Standard            | Implémentation                                                                     |
| -------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| Chiffrement au repos | AES-256-GCM         | `ACCOUNTING_ENCRYPTION_KEY` via `encryptToken()` dans `integrations/accounting.ts` |
| Auth OAuth           | OAuth 2.0 + PKCE    | State + code_verifier générés côté Convex, jamais côté client                      |
| Tokens API           | SHA-256 hash en DB  | Clé affichée une seule fois, hash stocké (`apiKeys.ts`)                            |
| Webhooks entrants    | HMAC SHA-256        | Header `X-Mycelium-Signature`, retry x5 avec backoff exponentiel                   |
| Rate limiting        | 100 req/min par clé | `@convex-dev/rate-limiter` (fixed window)                                          |
| TLS                  | TLS 1.3 minimum     | Convex + Cloudflare Workers edge                                                   |
| Audit trail          | Log de chaque appel | Table `accountingSyncLogs` (entityType, status, error, syncedAt)                   |
| Rotation tokens      | Automatique         | Refresh token à 80% de la durée de vie (implémenté pour Xero, QB)                  |
| Secrets webhook      | AES-256-GCM         | Route SvelteKit server `/api/webhooks/create` — jamais en Convex public            |

### Checklist sécurité avant chaque nouveau connecteur

- [ ] Token stocké chiffré (jamais en clair en DB)
- [ ] OAuth PKCE si flow OAuth (pas implicit grant)
- [ ] Scopes minimaux demandés (principe du moindre privilège)
- [ ] Refresh token avec rotation automatique
- [ ] Webhook entrant vérifié par signature
- [ ] Test avec clé révoquée → doit retourner 401 propre
- [ ] Rate limit testé (dépasser → 429 gracieux)
- [ ] Audit log sur chaque sync (succès + erreur)
- [ ] Documentation officielle du provider lue (pas de reverse engineering)

---

## 2. Intégrations par catégorie

---

### A. Comptabilité & Finance

#### A1. Marché UK

**Xero** ✅ IMPLÉMENTÉ

- Docs officielles : https://developer.xero.com/documentation/api/accounting/overview
- Auth : OAuth 2.0 PKCE — `identity.xero.com/connect/authorize`
- Scopes : `accounting.transactions accounting.settings accounting.contacts offline_access`
- Tokens : access 30 min / refresh 60 jours (rotation à chaque refresh)
- Sync : coûts → Xero Bills (ACCPAY), IK → Xero Expense Claims
- Fichier : `src/lib/convex/integrations/xeroConnector.ts`
- Plan requis : Professional+

**QuickBooks Online** ✅ IMPLÉMENTÉ

- Docs officielles : https://developer.intuit.com/app/developer/qbo/docs/api/accounting
- Auth : OAuth 2.0 — `oauth.platform.intuit.com/op/v2/token`
- Scopes : `com.intuit.quickbooks.accounting`
- Tokens : access 60 min / refresh 100 jours
- Sync : coûts → QBO Bills, IK → QBO Expenses
- Fichier : `src/lib/convex/integrations/quickbooksConnector.ts`
- Plan requis : Professional+

**Sage Business Cloud** ✅ IMPLÉMENTÉ (API key)

- Docs officielles : https://developer.sage.com/accounting/reference/
- Auth : OAuth 2.0 (Sage ID) ou API key selon tier
- API base : `api.accounting.sage.com/v3.1`
- Sync : coûts → Purchase Invoices, IK → Expense Reports
- Fichier : connecteur dans `integrations/accounting.ts`
- Plan requis : Professional+

**FreeAgent** 🆕 PRIORITÉ 1

- Docs officielles : https://dev.freeagent.com/docs/
- Auth : OAuth 2.0 — `api.freeagent.com/v2/approve_app`
- Scopes : `api` (full, FreeAgent n'a pas de granularité fine)
- Tokens : access 30 min / refresh permanents
- API base : `api.freeagent.com/v2`
- Sync : coûts → Bills, IK → Expense Claims
- Pourquoi : 100 000+ PME UK, très populaires freelancers/petites structures
- Plan requis : Professional+

---

#### A2. Marché Nordique

**Fortnox** 🆕 PRIORITÉ 1 — Suède

- Docs officielles : https://developer.fortnox.se/documentation/
- Auth : OAuth 2.0 authorization_code — `apps.fortnox.se/oauth-v1/auth`
- Scopes : `bookkeeping invoice supplier costcenter`
- Tokens : access 1h / refresh non-expirant (révocation manuelle)
- API base : `api.fortnox.se/3/`
- Headers requis : `Access-Token`, `Client-Secret`, `Content-Type: application/json`
- Sync : coûts → Leverantörsfaktura (fournisseur), IK → Utläggsredovisning
- Pourquoi : #1 cloud accounting en Suède (500 000+ entreprises)
- Plan requis : Professional+

**Visma eAccounting** 🆕 PRIORITÉ 1 — SE/NO/DK/FI

- Docs officielles : https://eaccounting.vismaonline.com/api
- Auth : OAuth 2.0 — `identity.vismaonline.com`
- Scopes : `ea:api offline_access`
- Tokens : access 1h / refresh 90 jours
- API base : `eaccountingapi.vismaonline.com/v2`
- Tenant-aware : header `VismaNetAuthToken` par organisation
- Sync : coûts → SupplierInvoices, IK → EmployeeExpenses
- Pourquoi : dominant sur les 4 marchés nordiques + 1M+ entreprises
- Plan requis : Professional+

**Tripletex** 🆕 PRIORITÉ 1 — Norvège

- Docs officielles : https://tripletex.no/v2-docs/
- Auth : Token pair (employeeToken + consumerToken) → sessionToken
- POST `tripletex.no/v2/token/session/:create` avec Basic Auth
- SessionToken expire après 24h (renouvellement automatique requis)
- API base : `tripletex.no/v2/`
- Sync : coûts → supplier/invoice, IK → travelExpense
- Pourquoi : #1 accounting en Norvège (250 000+ entreprises)
- Sécurité : sessionToken chiffré AES-256-GCM en DB
- Plan requis : Professional+

**e-conomic (Visma)** 🆕 PRIORITÉ 1 — Danemark

- Docs officielles : https://restdocs.e-conomic.com/
- Auth : App token + Agreement grant
  - Headers : `X-AppSecretToken: <app_secret>`, `X-AgreementGrantToken: <agreement_token>`
- API base : `restapi.e-conomic.com`
- Sync : coûts → SupplierInvoices (drafts), IK → entries (accruals)
- Pourquoi : #1 accounting au Danemark (180 000+ entreprises)
- Plan requis : Professional+

**Procountor** 🆕 PRIORITÉ 2 — Finlande

- Docs officielles : https://dev.procountor.com/
- Auth : OAuth 2.0 — `api.procountor.com/api/oauth/token`
- Scopes : `accounting invoicing`
- API base : `api.procountor.com/api/`
- Sync : coûts → PurchaseInvoice, IK → TravelExpense
- Pourquoi : fort en Finlande (PME et comptables)
- Plan requis : Professional+

**Netvisor (Visma)** 🆕 PRIORITÉ 2 — Finlande

- Docs officielles : https://dev.netvisor.fi/
- Auth : HMAC-SHA256 signatures sur chaque requête (custom auth, pas OAuth)
- Headers : `X-Netvisor-Authentication-CustomerId`, `X-Netvisor-Authentication-Timestamp`, `X-Netvisor-Authentication-TransactionId`, `X-Netvisor-Authentication-MAC`
- API base : `integration.netvisor.fi/`
- Sync : salaires → Purchase invoices
- Plan requis : Professional+

---

#### A3. Enterprise & ERP

**SAP Business One** 🆕 PRIORITÉ 3

- Docs : https://help.sap.com/docs/SAP_BUSINESS_ONE_DI_API
- Auth : Service Layer avec session login (B1SL API)
- REST : `https://{server}:50000/b1s/v1/`
- On-premise + cloud (SAP HANA Cloud)

**Oracle NetSuite** 🆕 PRIORITÉ 3

- Docs : https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/book_1559132836.html
- Auth : OAuth 2.0 (TBA - Token-Based Authentication)
- REST : `{accountId}.suitetalk.api.netsuite.com/services/rest/record/v1/`

**Microsoft Dynamics 365 Business Central** 🆕 PRIORITÉ 2

- Docs : https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/
- Auth : Azure AD OAuth 2.0 (Microsoft Identity Platform)
- Scopes : `https://api.businesscentral.dynamics.com/.default`
- REST : `api.businesscentral.dynamics.com/v2.0/{tenantId}/{environment}/api/v2.0/`
- Pourquoi : très commun chez ETI nordiques et UK

---

### B. Ressources humaines & Paie

#### B1. Marché UK

**BrightPay Connect** 🆕 PRIORITÉ 1

- Docs : https://brightpay.co.uk/cloud/api
- Auth : API key (Bearer token)
- Sync : employés → driverProfiles, salaires → BiK reporting
- Pourquoi : #1 payroll software UK/IE pour PME

**BambooHR** 🆕 PRIORITÉ 1

- Docs : https://documentation.bamboohr.com/reference/get-employee-1
- Auth : API key (Basic Auth : `{apikey}:x`)
- API base : `api.bamboohr.com/api/gateway.php/{companyDomain}/v1/`
- Sync : employees → driverProfiles (nom, email, poste, département)
- Pourquoi : très répandu UK/US, 30 000+ entreprises

**Personio** 🆕 PRIORITÉ 1

- Docs : https://developer.personio.de/reference/get_company-employees
- Auth : OAuth 2.0 client credentials ou API credentials (client_id + client_secret)
- API base : `api.personio.de/v1/`
- Headers : `Authorization: Bearer {token}`
- Sync : employees, departments, cost centers → org structure Mycelium
- Pourquoi : dominant en DACH + expansion UK/Nordiques, 10 000+ clients

**HiBob** 🆕 PRIORITÉ 2

- Docs : https://apidocs.hibob.com/reference/get_people
- Auth : Service User Token (Bearer)
- API base : `api.hibob.com/v1/`
- Sync : people data, departments, sites → driverProfiles
- Pourquoi : très populaire UK startups et scale-ups

**Moorepay / Zellis** 🆕 PRIORITÉ 2 (enterprise UK)

- Docs : contact commercial Zellis (API partner program)
- Sync : payroll data → BiK, expense reconciliation

---

#### B2. Marché Nordique

**Sympa HR** 🆕 PRIORITÉ 1 — FI/SE/NO

- Docs : https://developer.sympa.net/
- Auth : OAuth 2.0 + API key
- Sync : employees, org units, locations → driverProfiles
- Pourquoi : leader HR en Finlande, fort en Suède et Norvège

**Hogia** 🆕 PRIORITÉ 1 — Suède

- Docs : https://developer.hogia.se/ (portail partenaire)
- Auth : API key ou OAuth selon module
- Sync : payroll → BiK, employees → driverProfiles
- Pourquoi : #1 payroll Suède PME

**Visma HR (Lon)** 🆕 PRIORITÉ 1 — SE/NO

- Mêmes credentials OAuth que Visma eAccounting (even APIs)
- Sync : employees, payroll → BiK, expense reconciliation
- API base : `lon.vismaonline.com/v1/` (Visma Lon)

**SD Worx** 🆕 PRIORITÉ 2 — BE/NL/UK/DE

- Docs : https://www.sdworx.com/en/sd-worx-now/developers/api-documentation
- Auth : OAuth 2.0
- Sync : payroll, HR data → cross-border compliance

**Workday** 🆕 PRIORITÉ 3 (enterprise)

- Docs : https://community.workday.com/sites/default/files/file-hosting/restapi/
- Auth : OAuth 2.0 Bearer tokens
- Sync : employees → driverProfiles, cost centers → org
- Pourquoi : dominant grandes entreprises EU

---

### C. Cartes carburant

#### C1. Marché UK

**Allstar Fleet** 🆕 PRIORITÉ 1

- Docs : https://developer.allstarcard.co.uk/ (portail partenaire Fleetcor)
- Auth : OAuth 2.0 client credentials
- API base : `api.allstarcard.co.uk/v1/`
- Features : transactions temps réel, alertes fraude, reporting MPG
- Webhook : transaction events (POST callback)
- Sync : transactions → coûts Mycelium (catégorie CARBURANT)
- Pourquoi : #1 fuel card UK (300 000+ véhicules)
- Sécurité : webhook HMAC-SHA256 signature

**Keyfuels** 🆕 PRIORITÉ 2

- Docs : contact commercial Keyfuels (réseau EDI + CSV)
- Auth : FTP sécurisé ou email push de relevés CSV hebdo
- Sync : CSV import → fuelParsers.ts (parser à créer)
- Pourquoi : #2 réseau fuel UK (7 000+ stations)

**Shell Fleet Solutions UK** ✅ PARTIEL (CSV)

- Docs : https://www.shell.co.uk/business-customers/shell-fleet-solutions.html
- Auth CSV : export manuel ou FTP depuis Shell Fleet Manager
- Parser : `fuelParsers.ts` → `parseShellCSV()`
- Roadmap : API Shell Open (en beta, invitation uniquement)
- Sync : transactions → coûts CARBURANT

**BP Plus UK** ✅ PARTIEL (CSV)

- Docs : https://www.bpplus.co.uk/
- Parser : `fuelParsers.ts` → `parseBPPlusCSV()`
- Roadmap : API Fleetcor (même groupe que Allstar)

**Esso Fleet UK** 🆕 PRIORITÉ 2

- Auth : CSV export depuis EssoCard Business portal
- Parser à créer dans `fuelParsers.ts`

**Fleetcor / Radius** 🆕 PRIORITÉ 2

- Docs : https://developer.fleetcor.com/
- Auth : OAuth 2.0 (même programme partenaire qu'Allstar)
- API base : `api.fleetcor.com/`
- Transactions en temps réel

---

#### C2. Marché Nordique

**Circle K Fleet Card** 🆕 PRIORITÉ 1 — SE/NO/DK/FI

- Docs : portail B2B Circle K (https://www.circlek.com/business)
- Auth : CSV export depuis Circle K Business portal / EDI
- Parser à créer : `parseCircleKCSV()`
- Format CSV : date;heure;immatriculation;montant;TVA;site;produit
- Pourquoi : #1 réseau de stations nordiques (2 500+ sites)
- Roadmap : API Circle K Fleet en développement (2026)

**ST1 Fleet** 🆕 PRIORITÉ 1 — FI/SE/NO

- Docs : portail partenaire ST1 Business
- Auth : CSV mensuel ou EDI EDIFACT
- Parser à créer : `parseST1CSV()`
- Pourquoi : fort en Finlande et Suède, pratique pour zones rurales

**Preem Fleet** 🆕 PRIORITÉ 2 — Suède uniquement

- Docs : https://www.preem.se/foretag/drivmedel/preemkortet/
- Auth : CSV export mensuel depuis Preem Företagskort portal
- Parser à créer : `parsePreemCSV()`

**Q8 Fleet (Kuwait Petroleum)** 🆕 PRIORITÉ 2 — DK/NO

- Auth : CSV mensuel depuis Q8 Business portal
- Parser à créer : `parseQ8CSV()`

---

#### C3. Intégrations globales

**WEX Fleet** 🆕 PRIORITÉ 2

- Docs : https://go.wexinc.com/universal-api-documentation
- Auth : OAuth 2.0 client credentials
- API base : `api.wexinc.com/v1/`
- Webhook : real-time transaction events
- Pourquoi : leader mondial cartes carburant B2B

**Mastercard InControl Fleet** 🆕 PRIORITÉ 3

- Docs : https://developer.mastercard.com/incontrol/documentation
- Auth : OAuth 1.0a (Mastercard standard)
- API : transactions, controls, limits

---

### D. Télématique & Véhicules connectés

**Smartcar** ✅ IMPLÉMENTÉ

- Docs : https://smartcar.com/docs/api-reference/
- Auth : OAuth 2.0 (per vehicle, web flow)
- Scopes : `read_vehicle_info read_odometer read_battery read_location`
- Sync : odomètre/SoC/localisation → vehicles table
- Fichier : `src/lib/convex/smartcar.ts`

**Webfleet (TomTom)** 🆕 PRIORITÉ 1

- Docs : https://www.webfleet.com/en_gb/webfleet/info/developer-documentation/
- Auth : API key + account credentials (Webfleet Connect)
- API base : `csv.webfleet.com` (legacy CSV) + `api.webfleet.com` (REST)
- Features : GPS temps réel, trips, idle time, speeding events, driver score
- Webhook : event-driven via WLAN (Webfleet Live)
- Sync : positions → véhicules, trips → réservations reconciliation
- Pourquoi : #1 télématique EU (50 000+ flottes UK + nordiques)

**Geotab** 🆕 PRIORITÉ 1

- Docs : https://docs.google.com/document/d/1LJfb57qyBB3FpATrSGBxHxqhwYmpBplScXKFnqpVsYk
- Auth : Authenticate API call → credentials object (userName, password, database)
- SDK : MyGeotab SDK (JSON-RPC)
- Base URL : `{server}.geotab.com/apiv1`
- Données : trips, exceptions, DVIRs, engine data, driver coaching
- Sync : trips → réservations, exceptions → alertes conformité
- Pourquoi : #2 mondial télématique, fort UK enterprise

**Samsara** 🆕 PRIORITÉ 1

- Docs : https://developers.samsara.com/docs/fleet-api-quick-start
- Auth : API token Bearer (`samsara_api_xxx`)
- API base : `api.samsara.com/v1/`
- Webhook : real-time events (speeding, harsh braking, idling)
- Scopes : Fleet API (vehicles, trips, locations, safety events)
- Rate limit : 100 req/sec
- Pourquoi : croissance rapide EU, fort UK logistics

**Masternaut / Greenroad** 🆕 PRIORITÉ 2

- Docs : portail partenaire Masternaut
- Auth : SOAP/REST mixte, API key
- Fort en UK + France

**Mix Telematics** 🆕 PRIORITÉ 2

- Docs : https://developer.mixtelematics.com/
- Auth : OAuth 2.0
- Sync : trips, safety events, fuel consumption

---

### E. Conformité & Données véhicules officielles

#### E1. Royaume-Uni

**DVLA Vehicle Enquiry Service (VES)** 🆕 PRIORITÉ 1

- Docs : https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/vehicle-enquiry-service-description.html
- Auth : API key — gratuit, demande sur portail DVLA
- API base : `driver-vehicle-licensing.api.gov.uk/v1/vehicles`
- Données : make, model, colour, fuelType, engineCapacity, co2Emissions, taxStatus, motStatus, motExpiryDate, firstUsedDate
- Appel : POST `{registrationNumber: "AA19 AAA"}`
- Usage Mycelium : enrichissement automatique des véhicules lors de l'import CSV immatriculation
- Sécurité : clé stockée en `DVLA_API_KEY` Convex env var

**DVLA Check Driver Licence** 🆕 PRIORITÉ 2

- Docs : https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/check-driving-information
- Auth : Sharing Code fourni par le conducteur (valide 21 jours)
- Usage : vérification permis UK dans driverProfiles

**MOT History API** 🆕 PRIORITÉ 1

- Docs : https://documentation.history.mot.api.gov.uk/
- Auth : API key (partenaire DVSA, demande requise)
- API base : `beta.check-mot-history.service.gov.uk/v1/trade/vehicles/registration/`
- Données : historique MOT, mileage à chaque test, advisory items
- Usage Mycelium : alertes maintenance préventive, compliance conformité

---

#### E2. Nordiques

**Transportstyrelsen — Registre véhicules suédois** 🆕 PRIORITÉ 1

- Docs : https://www.transportstyrelsen.se/en/road/Vehicles/search-for-vehicles/
- Auth : API key (via portail partenaire Transportstyrelsen)
- API base : `fordonsuppgifter.transportstyrelsen.se/fordonsuppgifterws/fordon`
- Données : immatriculation, marque, modèle, année, CO2, statut fiscal
- Usage : enrichissement véhicules + BeSkatning (Sweden vehicle tax)

**Statens vegvesen — Registre véhicules norvégien** 🆕 PRIORITÉ 1

- Docs : https://autosys.vegvesen.no/om-losningen/api/
- Auth : API key gratuit
- API base : `autosys.vegvesen.no/matrikkel/KjoretoydataService/v1/`
- Données : kjøretøydata complet (spécifications, historique)

**Motorregisteret — Registre véhicules danois** 🆕 PRIORITÉ 1

- Docs : https://motorst.dk/da/forretningsanvendelse/api/
- Auth : API key (Danmarks Statistik partenariat)
- Données : køretøjsregistering, grøn ejerafgift, CO2

**Traficom — Registre véhicules finlandais** 🆕 PRIORITÉ 1

- Docs : https://www.traficom.fi/en/services/open-data
- Auth : open data (certains endpoints gratuits)
- API base : `opendata.traficom.fi/api/v1/`

---

#### E3. Conformité fiscale

**HMRC Making Tax Digital (MTD)** 🆕 PRIORITÉ 2

- Docs : https://developer.service.hmrc.gov.uk/api-documentation
- Auth : OAuth 2.0 (utilisateur final autorise l'accès à ses données HMRC)
- Scopes : `write:vat read:vat`
- API base : `api.service.hmrc.gov.uk/organisations/vat/{vrn}/`
- Usage Mycelium : pré-remplissage déclarations TVA sur coûts flotte

**Skatteverket (SE)** 🆕 PRIORITÉ 2

- Docs : https://skatteverket.entryscape.net/
- Auth : API key (partenaire Skatteverket)
- Usage : calcul avantage en nature suédois (Förmånsvärde)

---

### F. Communication & Collaboration

**Slack** 🆕 PRIORITÉ 1

- Docs : https://api.slack.com/docs
- Auth : OAuth 2.0 — `slack.com/oauth/v2/authorize`
- Scopes : `incoming-webhook chat:write channels:read`
- API base : `slack.com/api/`
- Features Mycelium :
  - Webhook entrant : notifications réservation, alertes maintenance, rappels permis
  - Slash command `/mycelium reserve` (roadmap)
  - Actions Slack (approuver une dépense depuis Slack)
- Token stocké : Bot OAuth token, chiffré AES-256-GCM
- Webhook entrant Slack : URL unique par workspace, aucun auth requis (URL secrète)

**Microsoft Teams** 🆕 PRIORITÉ 1

- Docs : https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/what-are-webhooks-and-connectors
- Auth : Azure AD OAuth 2.0 (app registration)
- Scopes : `ChannelMessage.Send Chat.ReadWrite`
- Features : Adaptive Cards pour notifications riches, Teams bot (roadmap)
- Incoming webhook : Connector URLs (simple, pas d'auth requise)
- Pourquoi : dominant enterprise UK + nordiques (MS365 omniprésent)

**Google Chat** 🆕 PRIORITÉ 2

- Docs : https://developers.google.com/chat/api/guides
- Auth : Service Account (pour bots) ou OAuth 2.0 (utilisateur)
- Scopes : `https://www.googleapis.com/auth/chat.messages`
- Webhook entrant : URL Incoming Webhook par espace Google Chat

---

### G. Assurance & Sinistres

**AXA Fleet** 🆕 PRIORITÉ 2

- Docs : portail partenaire AXA Business Insurance
- Auth : API key + certificat mTLS (sécurité renforcée assurance)
- Features : déclaration sinistre automatisée (FNOL), suivi dossier, expertise
- Sync : sinistres Mycelium → déclarations AXA, retour statut + franchise

**Zurich Fleet (Zurich Connect)** 🆕 PRIORITÉ 2

- Docs : portail partenaire Zurich Corporate (EU)
- Auth : OAuth 2.0 partenaire
- Sync : sinistres → Zurich Claims API

**Admiral Fleet** 🆕 PRIORITÉ 2 — UK PME

- Docs : portail partenaire Admiral Business
- Auth : API key
- Pourquoi : #1 UK assurance flotte PME (très abordable)

**If P&C Insurance** 🆕 PRIORITÉ 1 — Nordiques

- Docs : https://developer.if.eu/ (portail partenaire)
- Auth : OAuth 2.0
- Pourquoi : assureur flotte #1 en Finlande, Suède, Norvège, Danemark

---

### H. Maintenance & Atelier

**GarageHive** 🆕 PRIORITÉ 1 — UK

- Docs : https://garagehive.co.uk/api (portail partenaire)
- Auth : API key Bearer
- Features : réservation atelier automatique, suivi réparations, facturation
- Sync : alertes maintenance Mycelium → booking GarageHive, retour devis + facture
- Pourquoi : #1 UK garage management software PME

**Autodata** 🆕 PRIORITÉ 2

- Docs : https://autodata-group.com/developer/
- Auth : API key
- Features : intervalles maintenance constructeurs (par modèle/immatriculation)
- Sync : données constructeur → alerts maintenance prédictives

**Solera / Audatex** 🆕 PRIORITÉ 3 — Enterprise

- Docs : portail partenaire Solera
- Features : estimation réparation, historique véhicule, données sinistre

---

### I. CRM & Distribution

**HubSpot** 🆕 PRIORITÉ 2

- Docs : https://developers.hubspot.com/docs/api/overview
- Auth : OAuth 2.0 — `app.hubspot.com/oauth/authorize`
- Scopes : `crm.objects.contacts.read crm.objects.companies.read`
- Usage : sync prospects (Xero App Marketplace leads) → HubSpot pipeline

**Pipedrive** 🆕 PRIORITÉ 2

- Docs : https://developers.pipedrive.com/docs/api/v1/
- Auth : OAuth 2.0 ou API token
- Usage : deals → onboarding pipeline Mycelium

**Salesforce** 🆕 PRIORITÉ 3

- Docs : https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
- Auth : OAuth 2.0 (Connected App)
- Usage : enterprise CRM sync

---

## 3. Roadmap d'implémentation

### Phase 1 — UK Go-Live (Q3 2026) — DÉJÀ LIVRÉ + À FINIR

| Intégration   | Statut | Sprint   |
| ------------- | ------ | -------- |
| Xero          | ✅     | Sprint 2 |
| QuickBooks    | ✅     | Sprint 2 |
| Sage          | ✅     | Sprint 2 |
| Smartcar      | ✅     | Sprint 3 |
| DVLA VES      | 🔜     | Sprint 5 |
| Allstar Fleet | 🔜     | Sprint 5 |
| Slack / Teams | 🔜     | Sprint 5 |
| FreeAgent     | 🔜     | Sprint 5 |

### Phase 2 — Nordiques (Q4 2026)

| Intégration                     | Priorité | Marché      |
| ------------------------------- | -------- | ----------- |
| Fortnox                         | P1       | SE          |
| Visma eAccounting               | P1       | SE/NO/DK/FI |
| Tripletex                       | P1       | NO          |
| e-conomic                       | P1       | DK          |
| Procountor                      | P2       | FI          |
| Circle K Fleet                  | P1       | SE/NO/DK/FI |
| ST1 Fleet                       | P1       | FI/SE/NO    |
| Personio                        | P1       | UK/EU       |
| Sympa HR                        | P1       | FI/SE/NO    |
| If P&C Insurance                | P1       | Nordiques   |
| Registres véhicules SE/NO/DK/FI | P1       | Nordiques   |

### Phase 3 — Enrichissement (Q1 2027)

| Intégration                 | Priorité |
| --------------------------- | -------- |
| Webfleet / Geotab / Samsara | P1       |
| BambooHR / HiBob            | P2       |
| Dynamics 365                | P2       |
| AXA / Zurich Fleet          | P2       |
| SAP / NetSuite              | P3       |

---

## 4. Patterns d'implémentation

### Pattern OAuth 2.0 PKCE (Xero, QuickBooks, Fortnox, etc.)

```typescript
// 1. Generate PKCE challenge
const codeVerifier = generateSecureRandom(32);
const codeChallenge = base64url(await sha256(codeVerifier));

// 2. Store state + verifier in DB (short-lived, 10min)
await ctx.db.insert('oauthStates', {
	state,
	codeVerifier,
	provider,
	organizationId,
	expiresAt: Date.now() + 600_000
});

// 3. Redirect to provider
const authUrl = new URL(provider.authorizationEndpoint);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

// 4. Callback: exchange code + store encrypted tokens
const tokens = await exchangeCode(code, codeVerifier);
await ctx.db.patch(orgId, {
	accessToken: await encryptToken(tokens.access_token),
	refreshToken: await encryptToken(tokens.refresh_token),
	tokenExpiresAt: Date.now() + tokens.expires_in * 1000
});
```

### Pattern API Key avec vérification

```typescript
// 1. Validate key format
if (!apiKey.startsWith('expected_prefix_')) throw new Error('Format invalide');

// 2. Test connection (health check)
const response = await fetch(`${provider.baseUrl}/me`, {
	headers: { Authorization: `Bearer ${apiKey}` }
});
if (!response.ok) throw new Error(`Erreur ${response.status}: ${provider.name} a rejeté la clé`);

// 3. Check required scopes
const me = await response.json();
const missingScopes = requiredScopes.filter((s) => !me.scopes?.includes(s));
if (missingScopes.length) throw new Error(`Permissions manquantes: ${missingScopes.join(', ')}`);

// 4. Encrypt and store
await ctx.db.patch(orgId, {
	apiKey: await encryptToken(apiKey),
	lastVerifiedAt: Date.now()
});
```

### Pattern Webhook avec vérification HMAC

```typescript
// Vérification côté Mycelium (provider nous envoie des webhooks)
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
	const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
	// Constant-time comparison pour éviter timing attacks
	return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
```

---

## 5. Variables d'environnement requises

```bash
# Comptabilité
ACCOUNTING_ENCRYPTION_KEY=<32 bytes hex>   # AES-256-GCM master key

# DVLA (UK)
DVLA_VES_API_KEY=<key>                      # Vehicle Enquiry Service
DVLA_MOT_API_KEY=<key>                      # MOT History (DVSA partenaire)

# Télématique
WEBFLEET_API_KEY=<key>
WEBFLEET_ACCOUNT_ID=<id>
GEOTAB_SERVER=<my.geotab.com>
SAMSARA_API_TOKEN=<token>

# Communication
SLACK_CLIENT_ID=<id>
SLACK_CLIENT_SECRET=<secret>
TEAMS_CLIENT_ID=<azure_app_id>
TEAMS_CLIENT_SECRET=<azure_secret>
TEAMS_TENANT_ID=<tenant>

# Carburant (Allstar)
ALLSTAR_CLIENT_ID=<id>
ALLSTAR_CLIENT_SECRET=<secret>

# Assurance
IF_INSURANCE_API_KEY=<key>
AXA_FLEET_API_KEY=<key>
```

---

## 6. Vérification de connexion — Health Check standard

Chaque connecteur doit exposer une fonction `healthCheck()` qui :

1. Teste l'authentification (appel léger, GET /me ou équivalent)
2. Vérifie les permissions (scopes requis présents)
3. Teste l'accès aux données (récupère 1 enregistrement)
4. Retourne `{ ok: boolean, latencyMs: number, error?: string, details: CheckResult[] }`

Ce format alimente le `IntegrationWizard` côté front (étape Vérification animée).

```typescript
type CheckResult = {
	label: string;
	status: 'ok' | 'error' | 'warning';
	detail?: string;
};

type HealthCheckResult = {
	ok: boolean;
	latencyMs: number;
	error?: string;
	details: CheckResult[];
};
```

---

## 7. Références et ressources

- Xero Developer Portal : https://developer.xero.com
- QuickBooks Developer : https://developer.intuit.com
- Fortnox Developer : https://developer.fortnox.se
- Visma Developer : https://developer.vismaonline.com
- Tripletex API : https://tripletex.no/v2-docs/
- e-conomic REST : https://restdocs.e-conomic.com/
- DVLA VES API : https://developer-portal.driver-vehicle-licensing.api.gov.uk
- Smartcar Docs : https://smartcar.com/docs/api-reference/
- Webfleet Connect : https://www.webfleet.com/en_gb/webfleet/info/developer-documentation/
- Slack API : https://api.slack.com/docs
- MS Teams Webhooks : https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/

---

_Ce document est la référence interne — toute nouvelle intégration doit y être ajoutée avant implémentation._
