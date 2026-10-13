# Les logiciels du gérant, par Nango

Les cartes « Vos logiciels » apparaissent dans l'application **dès que `NANGO_SECRET_KEY` est posée
sur le déploiement Convex**, et chaque logiciel n'est proposé que **si son intégration existe dans
le tableau de bord de Nango** et que Letikette sait le lire. D'ici là, rien ne change : l'import de
fichiers reste le geste principal.

Le code : `src/lib/convex/connexions/nango.ts` (réseau), `nangoDonnees.ts` (base),
`src/lib/socle/connecteurs/nango/` (traducteurs et lecteurs, testés), `src/app/connexion-nango.tsx`
et `src/ui/parcours-logiciels.tsx` (écran).

## Ce que Nango fait, et ce qu'il ne fait pas

- **Il garde l'accès** que le gérant confie : le jeton OAuth, ou la clé en lecture seule qu'il a
  collée. Chiffré (AES-256-GCM), renouvelé par lui. Nos serveurs ne le voient jamais : la clé de
  Letikette n'a pas la portée `read_credentials`, et une clé collée part du navigateur directement
  chez Nango.
- **Il relaie nos lectures** (`/proxy`) en y ajoutant l'accès. Son relais note l'adresse, la
  méthode et le statut de chaque requête, jamais leur contenu ; ses journaux durent quinze jours.
- **Il ne garde pas les factures.** Nous n'utilisons ni ses synchronisations ni son cache de
  données : tout est lu page par page et écrit chez nous, par le chemin d'import qui dédoublonne.
- **Lecture seule** : vers le logiciel du gérant, seuls des `GET` partent.

## 1. Le compte et les deux environnements

Créer le compte sur [app.nango.dev](https://app.nango.dev). Nango a deux environnements, `dev` et
`prod`, chacun avec ses clés, ses intégrations et ses webhooks. **Le déploiement Convex de
développement (`knowing-bee-911`) parle à `dev`, la production (`insightful-crow-128`) à `prod`.**
Tout ce qui suit se fait une fois dans chacun.

## 2. La clé d'API, à portées restreintes

**Environment Settings › API Keys › Create** (une clé « Custom », jamais la clé « Default - Full
access ») avec exactement ces portées :

| Portée | Pourquoi |
|---|---|
| `environment:connect_sessions:write` | Ouvrir une session de connexion de trente minutes pour un logiciel |
| `environment:integrations:list` | Savoir quels logiciels proposer |
| `environment:connections:read` | Relire une connexion pour vérifier son étiquette (sans les accès) |
| `environment:connections:delete` | Débrancher, et la purge RGPD d'un établissement |
| `environment:proxy` | Lire les factures et les clients |

**Jamais** `connections:read_credentials`, `connections:list_credentials` ni `connections:list` :
sans elles, une fuite de notre clé ne permet ni de lire l'accès d'un gérant ni d'énumérer les
connexions. Puis, sans afficher la clé dans un terminal partagé :

```bash
npx convex env set NANGO_SECRET_KEY            # dev : la clé de l'environnement dev
npx convex env set --prod NANGO_SECRET_KEY     # prod : la clé de l'environnement prod
```

(`convex env set NOM` sans valeur la demande au clavier.)

## 3. Le webhook signé

**Environment Settings › Webhook URLs** :

- dev : `https://knowing-bee-911.convex.site/nango/webhook`
- prod : `https://insightful-crow-128.convex.site/nango/webhook`

Activer les webhooks d'authentification (création de connexion, échec de renouvellement,
suppression). Puis **Environment Settings › Webhooks › Signing key** : copier la clé et la poser :

```bash
npx convex env set NANGO_WEBHOOK_SIGNING_KEY
npx convex env set --prod NANGO_WEBHOOK_SIGNING_KEY
```

Sans elle, le webhook répond 200 sans rien traiter : le retour du navigateur et la relecture
toutes les six heures suffisent. Avec elle, une signature fausse (`X-Nango-Hmac-Sha256`, HMAC-SHA256
du corps brut) reçoit 401. Le webhook rattache une connexion dont le gérant aurait fermé l'onglet
avant la fin, et dit à la carte qu'un accès ne se renouvelle plus ou a été retiré.

## 4. Les intégrations, une par logiciel

**Integrations › Configure New Integration**. L'identifiant de l'intégration (« Integration ID »)
est libre : Letikette reconnaît le logiciel par son **fournisseur**. Les applications OAuth se
créent chez chaque éditeur, à notre nom (« Letikette »), avec l'adresse de retour
**`https://api.nango.dev/oauth/callback`**.

Pour chacune : lecture seule, et rien de plus que ce que nos lecteurs appellent.

### Pennylane, par jeton (`pennylane-company-api`) : à créer en premier

Aucune application à créer : le gérant génère un jeton en lecture seule dans Pennylane
(Paramètres › Connectivité › Développeurs, API V2) et le colle dans le parcours. Créer
l'intégration suffit. C'est la seule voie Pennylane ouverte sans partenariat.

### Pennylane, par autorisation (`pennylane`)

L'OAuth de Pennylane suppose d'être **partenaire** : demande par le formulaire de l'équipe
Partenariats ([pennylane.readme.io](https://pennylane.readme.io/docs/oauth-20-walkthrough)), qui
remet un Client ID et un Client Secret (non récupérables ensuite : les ranger aussitôt). Portées :
`customer_invoices:readonly customers:readonly`. Tant que le partenariat n'est pas obtenu, ne pas
créer cette intégration : le jeton suffit.

### QuickBooks (`quickbooks`)

[Intuit Developer](https://developer.intuit.com) › My Hub › App Dashboard › Add › QuickBooks Online
and Payments. Portée : `com.intuit.quickbooks.accounting`. Adresse de retour dans Settings ›
Redirect URIs, puis Keys and credentials (les clés de **production**). Nango relève seul la
société (`realmId`). Pour essayer, une société de bac à sable et l'intégration `quickbooks-sandbox`
(que Letikette ne lit pas : la tester avec la vraie intégration sur une société de test).

### Xero (`xero`)

[Xero Developer](https://developer.xero.com) › My Apps › New app, type « Mobile or desktop app ».
**Une application créée depuis le 2 mars 2026 reçoit les portées fines** : `offline_access`,
`accounting.invoices.read`, `accounting.contacts.read`. Le gérant choisit son organisation dans la
fenêtre de Xero ; Nango en garde l'identifiant (`tenant_id`), que la lecture envoie.

### Sellsy (`sellsy`)

[Sellsy › Développeur › API v2](https://www.sellsy.com/developer/api-v2) › Créer un accès API.
« Privé » ne sert que notre propre compte Sellsy : il faut un accès **public**, que Sellsy valide
(écrire à contact@sellsy.com). Droits en lecture : factures, sociétés et particuliers
(`invoices.read`, `companies.read`, et la lecture des particuliers). Copier le Client ID et le
secret.

### Stripe, par clé restreinte (`stripe-api-key`)

Aucune application : le gérant crée une clé restreinte en lecture des factures et la colle. Le
parcours refuse une clé secrète (`sk_`) et, hors développement, une clé de test. Créer
l'intégration suffit.

### Zoho Books (`zoho-books`) et Zoho Invoice (`zoho-invoice`)

[Zoho API Console](https://api-console.zoho.com) › Add Client › Server-based Applications. Dans
Settings, **cocher l'usage des mêmes identifiants sur tous les centres de données** : un compte
français est sur `zoho.eu`, et le parcours demande au gérant où il ouvre Zoho. Portées en lecture :
`ZohoBooks.invoices.READ`, `ZohoBooks.contacts.READ`, `ZohoBooks.settings.READ` (la dernière pour
lister les organisations), ou leurs équivalentes `ZohoInvoice.*` ; vérifier leur graphie dans la
documentation de Zoho au moment de la création. Un compte qui a plusieurs organisations sans
organisation par défaut est refusé à la connexion avec un message qui dit quoi faire.

## 5. Plus tard : notre domaine dans la fenêtre d'autorisation

Par défaut, la fenêtre d'autorisation passe par `api.nango.dev`. Nango accepte une **adresse de
retour à notre domaine** (Environment Settings › Callback URL), par exemple
`https://connexion.letikette.com/oauth/callback`, qui redirige (308) vers
`https://api.nango.dev/oauth/callback`. À faire avant d'ouvrir les applications au public : le
gérant ne voit alors que notre domaine dans la fenêtre. Chaque application OAuth doit alors
déclarer cette adresse à la place de celle de Nango.

## 6. Vérifier

1. Poser `NANGO_SECRET_KEY` sur dev, ouvrir l'accueil d'un établissement administré : la carte
   « Vos logiciels » apparaît, avec la rangée de logos.
2. « Connecter un logiciel » : seuls les logiciels créés à l'étape 4 sont listés.
3. Brancher Pennylane par jeton sur un compte de test : la carte passe en « Lecture… », puis
   « À jour ». Dans Nango, la connexion porte les étiquettes `organization_id` et `end_user_id`
   (des identifiants, jamais un nom).
4. Débrancher : la connexion disparaît chez Nango, les factures restent.

Ce que la purge RGPD fait : elle supprime chaque connexion de l'établissement chez Nango
(`oublierConnexion`), puis ses lignes chez nous.
