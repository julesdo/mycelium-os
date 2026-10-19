# Carte du site public de Letikette pour les six changements de l'audit (chemins, tests, pièges)

## 0. À lire d'abord : sept points qui bloquent ou faussent un des six changements

1. **Le calculateur et la page du taux disparaissent le 1er janvier 2027.**
   - `TAUX_BCE_PAR_SEMESTRE` (taux.ts:74-88) s'arrête à `2026-S2`.
   - `Calcul` renvoie `null` si le taux du semestre en cours manque (calcul.tsx:162-166). La page du taux se tait elle aussi.
   - Conséquence : le bouton « Combien vous doit-on ? » mènerait vers une section absente.
   - Le seul test qui en parle attend l'erreur au lieu de prévenir (decompteRecouvrement.test.ts:317, `/2027-S1|Taux BCE/`).
2. **L'offre fondateurs telle qu'écrite casse le build.** Le test `mots-interdits.test.ts` refuse `/garanti/i` dans `src/marketing`, `src/routes` et `src/lib/config`. « Prix garanti à vie » ne passe pas.
3. **Changer les prix ne crée pas les nouveaux prix chez Paddle.**
   - Les étiquettes Paddle n'ont pas de version : `etiquetteDuPrix` renvoie `${formule}-${rythme}${essai?'-essai':''}` (paiement/paddle.ts:337-339).
   - Le catalogue « n'ajoute que ce qui manque » : un prix qui s'écarte de la grille est signalé, rien n'est recréé (paddleCatalogue.ts:32-37).
   - Passer `GRILLE.equipe.mensuel` à 59 afficherait 59 € sur le site pendant que Paddle prélève toujours 39 € (`prixPaddle`, schema.ts:126-138). Il faut versionner les étiquettes ou décider à la main dans Paddle.
4. **Le « Client public » n'existe pas dans le moteur.**
   - Aucun paramètre pour le taux BCE + 8 points, l'indemnité publique, ni la prescription de quatre ans (loi n° 68-1250). Une recherche de « moratoire|quadriennal|68-1250 » dans `src/lib/verticales/recouvrement` ne renvoie que des motifs de filtres.
   - `dateDePrescription` ajoute des mois (prescription.ts:210-212). Il ne sait pas calculer « 1er janvier de l'année suivante + 4 ans ».
   - Règle du projet : ne jamais écrire une valeur ou un numéro d'article de mémoire, tout se relève sur Légifrance d'abord.
5. **La phrase « L'application s'exécute à Paris » est probablement fausse.**
   - On la lit à page-securite.tsx:71 et dans quatre documents juridiques : `01-mentions-legales.md:35`, `03-politique…:257-258` et `:320`, `04-accord…:159` et `:207`, plus `00-lisez-moi.md:116`.
   - `vercel.json` déclare `"regions": ["fra1"]`. Dans la nomenclature Vercel, `fra1` est Francfort, Paris est `cdg1`.
   - À vérifier dans le tableau de bord Vercel avant d'afficher l'hébergement (changement 5).
6. **L'offre fondateurs coûte le prix catalogue.** Pro à 1 490 € par an est exactement le nouveau prix annuel de Pro (149 × 10). L'avantage se réduit au prix bloqué et à la mise en route.
7. **Afficher une date de migration vers l'UE contredit une règle écrite.** page-securite.tsx:24-29 et securite.tsx:26-29 imposent « RIEN QUI NE SOIT EN PLACE ». La politique de confidentialité (§6.0, l.260-261) prévoit qu'une migration décidée « sera annoncée dans les conditions de la section 13 ». Une date ne s'affiche donc qu'une fois décidée, avec une nouvelle version de la politique.

## 1. Index des fichiers (chemins absolus)

**Pages et routes**
- C:\Users\jules\Desktop\mycelium-chat\src\routes\index.tsx
- C:\Users\jules\Desktop\mycelium-chat\src\routes\tarifs.tsx
- C:\Users\jules\Desktop\mycelium-chat\src\routes\securite.tsx
- C:\Users\jules\Desktop\mycelium-chat\src\routes\secteurs.$secteur.tsx
- C:\Users\jules\Desktop\mycelium-chat\src\routes\taux-des-penalites-de-retard.tsx
- C:\Users\jules\Desktop\mycelium-chat\src\routes\sitemap[.]xml.ts
- C:\Users\jules\Desktop\mycelium-chat\src\routes\llms[.]txt.ts
- C:\Users\jules\Desktop\mycelium-chat\src\routes\blog\index.tsx
- C:\Users\jules\Desktop\mycelium-chat\src\routes\blog\$adresse.tsx
- C:\Users\jules\Desktop\mycelium-chat\src\routes\blog\rss[.]xml.ts
- C:\Users\jules\Desktop\mycelium-chat\src\routes\inscription.tsx
- C:\Users\jules\Desktop\mycelium-chat\src\routes\__root.tsx

**Composants du site** (C:\Users\jules\Desktop\mycelium-chat\src\marketing\)
- hero.tsx, calcul.tsx, logiciels.tsx, navbar.tsx, pied.tsx, faq.tsx, tarifs.tsx, appel.tsx
- secteurs.ts, page-secteur.tsx, page-securite.tsx, securite.tsx, page-taux.tsx, situations.tsx, section.tsx
- fonctionnalites.ts, blog.ts, blog-pages.tsx, blog-couvertures.tsx, motifs-blog.ts, mdx.tsx, articles.ts
- __tests__\fonctionnalites.test.ts, __tests__\documents-publies.test.ts

**Configuration**
- C:\Users\jules\Desktop\mycelium-chat\src\lib\config\tarifs.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\config\produit.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\config\legal.ts

**Moteur juridique**
- C:\Users\jules\Desktop\mycelium-chat\src\lib\verticales\recouvrement\parametres.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\verticales\recouvrement\pays\france\taux.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\verticales\recouvrement\pays\france\prescription.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\verticales\recouvrement\procedures.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\verticales\recouvrement\lexique.ts

**Paiement**
- C:\Users\jules\Desktop\mycelium-chat\src\lib\paiement\paddle.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\convex\paddleCatalogue.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\convex\schema.ts

**Convex** (pour la liste d'attente)
- C:\Users\jules\Desktop\mycelium-chat\src\lib\convex\admin\tables.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\convex\croissance\conseils.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\convex\http.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\convex\convex.config.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\convex\emails\resend.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\convex\emails\helpers.ts
- C:\Users\jules\Desktop\mycelium-chat\src\lib\crm\empreinte.ts

**Côté navigateur**
- C:\Users\jules\Desktop\mycelium-chat\src\app\analytique.ts
- C:\Users\jules\Desktop\mycelium-chat\src\app\source-visite.ts
- C:\Users\jules\Desktop\mycelium-chat\src\app\providers.tsx

**Blog, juridique, déploiement**
- C:\Users\jules\Desktop\mycelium-chat\content-collections.ts
- C:\Users\jules\Desktop\mycelium-chat\content\blog\ (10 fichiers .mdx et README.md)
- C:\Users\jules\Desktop\mycelium-chat\docs\juridique\02-conditions-generales.md
- C:\Users\jules\Desktop\mycelium-chat\docs\juridique\03-politique-de-confidentialite.md
- C:\Users\jules\Desktop\mycelium-chat\vercel.json
- C:\Users\jules\Desktop\mycelium-chat\vite.config.ts

## 2. Les six changements

### (1) Catalogue et prix

**Grille** (config/tarifs.ts)
- `GRILLE` (l.47-66) : solo 12/120, equipe 39/390, pro 119/1190.
- La nouvelle grille (59/590, 149/1490) passe `billing.test.ts:16-25` : annuel = mensuel × 10, deux mois offerts, entiers, ordre solo < equipe < pro.
- Ceux qui lisent `GRILLE` suivent seuls : limites.ts:55, ouvertureFacturation.ts:35 (le préavis envoyé aux comptes existants), support/contexte.ts:108, paiement/paddle.ts:368-378, paiement/rappels.ts:113, support/articles.ts:81-82, secteurs.ts:229, llms.txt:35.
- Restent le piège Paddle (§0.3) et les abonnements en cours (quel prix gardent-ils ?).

**Offres ponctuelles** (diagnostic 290 €, réclamation 5 % entre 290 et 2 000 €, pilote 2 500 €, fondateurs)
- Ne pas les mettre dans `GRILLE` ni dans `FORMULES` : `catalogueAttendu()` (paiement/paddle.ts) crée 3 produits × 4 prix d'abonnement, et `prixPaddle.formule/rythme` est un union fermé (schema.ts:126-138).
- Prévoir une constante à part dans config/tarifs.ts, non lue par le catalogue.
- Un prix fondateurs suppose d'étendre `etiquetteDuPrix`, le type `PrixAttendu` et le validateur de `prixPaddle`.

**Découverte « sans limite de temps »** devient « trois mois d'historique ». Endroits à reprendre :
- hero.tsx:39-43 (`LEVEES`) et page-secteur.tsx:16-20 (copie du même tableau) ;
- tarifs.tsx:61, 115-129 et 153-158 ;
- faq.tsx:88 ;
- appel.tsx:39 ;
- routes/tarifs.tsx:13 ;
- secteurs.ts:229 ;
- llms.txt:35 ;
- support/articles.ts:102 et 190 ;
- côté produit, `LIMITES.decouverte` (l.115-121) n'a aucune borne d'historique ;
- les CGV 7.1 (l.200-201) décrivent Découverte.

**Commission**
- « 0 % de commission sur ce qui rentre » (tarifs.tsx:98), securite.tsx:52 et faq.tsx:61 restent vrais : la réclamation est payée d'avance sur le montant calculé, pas sur ce qui rentre.
- En revanche, les CGV 4.2 (l.108-110) disent « Sa rémunération est l'abonnement au Service, et elle ne dépend d'aucun résultat ». Il faut les modifier.

**Ce que la section Tarifs s'interdit déjà** (tarifs.tsx:42-45) : pas de « le plus populaire », pas de prix barré, pas de compte à rebours. « Jusqu'au 31 décembre » passe ; un compte à rebours, non, sauf décision contraire du fondateur.

### (2) Accroche : bouton « Combien vous doit-on ? » vers le diagnostic express, calculateur juste dessous

- **Le bouton** : hero.tsx:126-129, `BoutonAffiche as={Link} to="/inscription"`. La règle « une seule pilule, et un lien » est écrite l.123-124.
- **Le diagnostic express n'existe pas.** Aucun symbole « diagnostic » côté produit. Il faut choisir une destination :
  - soit `/inscription`, mais son `validateSearch` ne garde que `invitation` (inscription.tsx:19-21) ;
  - soit une route nouvelle (`/diagnostic`), qui devra recevoir un lien littéral `to=` (test des écrans orphelins).
- **L'ordre de la page** : index.tsx:100-104 (`<Hero/>`, `<BandeLogiciels/>`, `<Calcul/>`). Remonter le calculateur revient à échanger les lignes 101 et 104. Le commentaire de rythme des tons (l.87-97) est à reprendre.
- **Doublon de titre** : `Calcul` s'appelle déjà « Combien vous doit-on, vraiment ? » (calcul.tsx:175). À renommer.
- **Le titre affiché, l'aperçu de partage et l'image** : `TITRE` et `RESUME` (index.tsx:49-51), `og:image:alt` (l.71). `partage.png` se régénère par `bun scripts/generer-og.ts`.
- **La mesure** : la liste d'événements Umami est fermée (`EvenementProduit`, analytique.ts:73-88). Ajouter par exemple `diagnostic-lance`. La source de la visite est déjà notée par `AMORCE_SOURCE` (source-visite.ts:19).

### (3) Calculateur : un choix « Client public »

Dans calcul.tsx :
- `type Secteur = 'GENERAL' | 'TRANSPORT_MARCHANDISES'` (l.49) ;
- `calculer()` (l.101-142) appelle `periodesDeTauxParDefaut` (le taux privé, réancré chaque semestre) et `dateDePrescription(echeance, secteur)` ;
- `Segmented` (l.200-213) ;
- le texte des délais (l.215-218) ;
- la ligne de source (l.334-338), qui écrit « majoré de dix points » en dur.

Ailleurs :
- `PageDeSecteur.regime` (secteurs.ts:43) et la prop `secteurInitial` (calcul.tsx:154) sont typés sur les deux mêmes valeurs.
- Le composant MDX `DelaiPourAgir` (mdx.tsx:73) lit `REGIMES_PRESCRIPTION[regime]`.

Ordre de travail :
1. **Relever sur Légifrance** et créer des entrées `PARAMETRES` (valeur, source, `verifieLe`, `verifie: true`, `valideParAvocat: false`, `AVOCAT_ATTENDU`) :
   - le taux public (BCE + 8 points) **et sa règle d'ancrage**. De mémoire, à confirmer : il serait fixé sur le semestre où les intérêts commencent à courir, sans réancrage. Cela donnerait une seule période dans `decompterFacture`, contre une par semestre aujourd'hui.
   - l'indemnité publique ;
   - la prescription de quatre ans (point de départ au 1er janvier suivant) ;
   - l'interruption par une réclamation écrite, que l'audit cite (loi n° 68-1250, art. 2).
2. **Dans pays/france/** : une fonction de taux public dans taux.ts, et une fonction de date limite de quatre ans dans prescription.ts.
   - Ne pas l'ajouter à `SecteurCreance` (l.60-67) : cet union est partagé avec `vSecteurCreance` (convex/recouvrement/tables.ts:76-84) et les écrans du produit.
   - `secteurLePlusCourt()` lit toutes les entrées de `REGIMES_PRESCRIPTION`.
3. **Lexique** : « intérêts moratoires » tombe sous `/int[ée]r[êe]ts/` et « prescription quadriennale » sous `/prescri/`. Les écrire en second, entre parenthèses : « pénalités de retard (intérêts moratoires) ».
4. **Message contradictoire** : `ANGLE_MORT_PRESCRIPTION` dit qu'une mise en demeure n'interrompt pas le délai. Pour une personne publique, l'audit dit qu'une réclamation écrite l'interrompt. Le dire régime par régime, chacun avec sa source.
5. **Nuance de calcul** : des intérêts qui courent sur plusieurs années se prescrivent année par année (ceux nés en 2022 tombent le 31/12/2026). Le calcul « période par période » devra peut-être découper par année civile. Point à mettre dans la note du paramètre et à faire valider.
6. **Largeur** : trois segments à 375 px dans `SurfaceCut w-fit max-w-full` risquent de déborder. À mesurer, ou écrire « Public ».

### (4) Pages d'atterrissage

**Le registre des pages métier** (secteurs.ts)
- `SECTEURS_PUBLICS` (l.23-27) ; `NOMS_DES_SECTEURS` (l.48-52) ; `pageDuSecteur` (l.144-233).
- **Piège** : la dernière branche (l.211-233) sert par défaut à « services-aux-entreprises ». Un nouveau slug sans branche reçoit ce contenu en silence.
- Le nom `SECTEURS_PUBLICS` veut dire « pages publiques », pas « secteur public ». Risque de confusion au moment d'ajouter `fournisseurs-publics`.

**Le gabarit** : page-secteur.tsx. Titre et chapeau, 3 `points`, `<Calcul secteurInitial={page.regime}/>` (l.79), FAQ. La route secteurs.$secteur.tsx:16-21 lève `notFound`. sitemap (l.18), llms (l.19-22) et pied (l.60-72) suivent seuls.

**Transporteurs** : la page `/secteurs/transport-routier` existe (secteurs.ts:152-186). L'argument de l'action directe n'a aucun paramètre (aucune occurrence « L132-8 » ni « action directe ») : à relever avant de l'écrire.

**Fournisseurs publics** : entre dans le gabarit, à condition d'étendre `regime` (voir (3)).

**Experts-comptables** : n'entre pas dans `PageDeSecteur` (c'est un distributeur, pas un métier avec un régime à calculer). Prévoir une route propre (`/experts-comptables`) et l'ajouter à la main dans `PAGES_FIXES` (sitemap.xml.ts:13-26), dans llms.txt (l.32-38) et dans un `<Link to=…>` du pied. La cible `CABINET` existe déjà dans le CRM (admin/tables.ts:80).

**Page d'attente de la procédure du 23 avril** (route proposée `/procedure-sans-juge`)
- L'état « décret paru ou non » se lit, il ne s'écrit pas : `PROCEDURES['l126-creances-commerciales'].peutEvaluer()` (procedures.ts:130-152) vaut `false` tant que `PARAMETRES.tarifCommissaireJusticeL126` (parametres.ts:959-971) est vide.
- Contraintes d'écriture :
  - « titre exécutoire », « signifi… », « créance » et « injonction » sont refusés hors parenthèses ou guillemets (lexique) ;
  - « éligible » est refusé (aucun-verdict) ;
  - ligne rouge n° 1 : Letikette prépare, le commissaire de justice que le gérant choisit agit ;
  - l'article de blog `procedure-sans-juge-entre-commercants.mdx` peut y mener, mais un lien MDX n'est pas un `to=` littéral : le lien du pied reste nécessaire.

**Dans tous les cas** :
- toute nouvelle route doit être atteinte par un `to="/x"` littéral, sinon elle doit figurer dans `ATTEINTS_AUTREMENT` avec sa raison (`href=` ne compte pas) ;
- `sitemap` et `llms.txt` sont des listes écrites à la main, aucun test ne les vérifie.

### (5) Preuves : page fondateur, hébergement affiché

**Page fondateur**
- Lire l'identité dans `LEGAL_CONFIG` (legal.ts:47-95 : `directeurPublication`, `siren`, `legalForm`). Le siège reste à Bordeaux tant que le greffe n'a pas le transfert (l.6-31).
- Photo réelle, auto-hébergée dans `public/photos/`. Aucun visage n'est inventé.
- Piège : si la page importe un `docs/juridique/*.md?raw`, la liste exacte des 5 pages légales attendue par documents-publies.test.ts:71-79 casse.

**Hébergement**
- Il est déjà affiché : page-securite.tsx:68-74 (Convex aux États-Unis, clauses contractuelles types, lecture par Anthropic) et politique §6.0.
- À corriger : `fra1` et « Paris » (§0.5).
- La date de migration ne s'affiche que décidée (§0.7), et en même temps dans la politique, l'accord de sous-traitance et les mentions légales.

**Cas clients chiffrés** : aucun support aujourd'hui. `logiciels.tsx` porte la règle « AUCUN LOGO DE CLIENT » (l.15-16).

### (6) Blog rangé par piliers, un article par semaine

**L'état actuel**
- `CATEGORIES = ['La loi','Procédures','Trésorerie','Méthode','Letikette']` (motifs-blog.ts:22).
- Validées par `z.enum(CATEGORIES)` (content-collections.ts:47).
- `PALETTE: Record<CategorieBlog,…>` (blog-couvertures.tsx:23-29) oblige à donner une teinte à chaque catégorie. La teinte dit de quoi il s'agit, jamais une couleur de seuil.
- Lues aussi par la méta et le fil d'Ariane (blog-pages.tsx:32 et 268), `articlesLies` (l.174-179) et rss (l.30).
- Les 10 articles sont datés `2026-10-06`, aucun brouillon.
- Le README (tableau `categorie`) est déjà en retard : il n'y a pas « Procédures ».

**Deux options**
- (a) Remplacer les catégories par les quatre piliers : il faut alors re-catégoriser les 10 fichiers, sinon le build échoue.
- (b) Ajouter un champ `pilier: z.enum([...]).optional()` et garder les catégories.

**Relier chaque article à un calculateur et à une offre**
- `Calcul` est une section pleine largeur avec `id="calcul"`. L'insérer dans un article doublerait l'ancre : il faut une variante compacte dans `COMPOSANTS_MDX` (mdx.tsx:166-261).
- L'article finit par l'appel générique `<Appel/>` (blog-pages.tsx:352). Un champ `offre` dans l'en-tête et un encart après `MDXContent` feraient le lien avec une offre.

**Ne pas antidater** les 10 articles existants.

## 3. Les tests qui contraignent le site

| Test | Ce qu'il balaie | Ce qu'il exige |
|---|---|---|
| src\marketing\__tests__\fonctionnalites.test.ts | `FONCTIONNALITES` et `LOGICIELS_BRANCHES` | Chaque `ancre` correspond à un `id="[a-z-]+"` littéral d'un `src/marketing/*.tsx` (pas de chiffres, pas d'id calculé). Une tuile a pour ancre sa clé, et tout.tsx contient `id={fonctionnalite.cle}`. Nom de cinq mots au plus. Les captures `public/ecrans/<capture>-393.png` et `-786.png` existent. Le type `ancre: /#${string}` ne sait pas mener à une page dédiée. |
| src\lib\__tests__\mots-interdits.test.ts | ui, app, routes, screens/admin, marketing, lib/config, convex/emails, lib/croissance (commentaires retirés) | `/garanti/i` absent. `content/` n'est pas balayé. |
| src\ui\__tests__\lignes-rouges.test.ts | ui, routes, screens, app, lib/verticales, convex/emails, router.tsx (**pas src/marketing**) | `\bgaranti\w*\b` ; aucune injonction de procédure (`engager une procédure`, `relancez `, `vous devriez`… l.162) ; « nous avons relancé » (l.180) ; « vos taux » et « tableau de bord » (l.204). |
| src\lib\__tests__\lexique.test.ts | ui, screens, routes/app, routes/admin, routes/-salle, app, lib/verticales, lib/croissance, **src/marketing** (pas les `src/routes/*.tsx` de premier niveau, pas `content/`) | Les entrées de lexique.ts:30-69 sont interdites hors `(…)` et `«…»`. |
| src\lib\__tests__\aucun-verdict.test.ts | ui, screens, routes, marketing, lib/config, lib/convex, lib/verticales | Aucun de `/éligible/i`, `/\bmûres?\b/i`, « remplit… condition », « points sur 20 ». |
| src\ui\__tests__\aucun-ecran-orphelin.test.ts | toutes les routes déclarées | Chaque route reçoit un `to=` ou `vers=` littéral, ou figure dans `ATTEINTS_AUTREMENT` (l.47-121) avec sa raison. Aucune exception périmée. |
| src\ui\__tests__\destinations-existent.test.ts | tout `src` | Chaque `to=` / `vers:` / `retourVers` littéral mène à une route déclarée. |
| src\marketing\__tests__\documents-publies.test.ts | les pages qui importent `docs/juridique/*.md?raw` | Liste exacte des 5 routes ; pas de note de travail ; « garanti » jamais lié à un résultat ; les CGV contiennent « recouvrement pour compte de tiers », « ne manipule aucun fonds », « ne recommande aucune procédure », et Paddle comme vendeur de registre. |
| src\lib\convex\__tests__\billing.test.ts | `GRILLE` | Annuel = mensuel × 10, deux mois offerts, entiers, ordre croissant. |
| src\lib\paiement\__tests__\paddle.test.ts:215 et src\lib\support\__tests__\articles.test.ts:20-21 | `GRILLE` | Montants lus dans la grille (rien à faire). |
| donnees-vivantes.test.ts | écrans | Pas de `useQuery` importé de `convex/react` (`useMutation` reste permis). |
| eslint.config.js:88-93 (règles l.26-42) | `src/**` hors `src/ui` (marketing compris) | Pas de valeur Tailwind arbitraire, pas de couleur littérale, pas de `text-sm` hors échelle. |

**Aucun test** ne couvre `content/blog` ni `articlesPublies` : ni vocabulaire, ni mot interdit, ni date. Un article se relit à la main.

## 4. Le mot « banque » côté public

Aucune occurrence ne dit que Letikette serait ou deviendrait une banque. Aucun « néobanque ». Toutes sont descriptives :
- **Le taux de la BCE** : « Banque centrale européenne » (calcul.tsx:337) ; penalites-de-retard-entre-entreprises.mdx:9, 53 et 57 ; CGV l.238.
- **Les logiciels branchés** : « votre banque » (faq.tsx:69 avec `noms('banque')`, etapes.tsx:62, logiciels.tsx:48). Le genre `'banque'` vient de produit.ts:13 et 33 (Qonto).
- **« bancaires »** : page-securite.tsx:64 ; securite.tsx:58 ; relancer-un-client-sans-abimer-la-relation.mdx:78, 114 et 147 ; politique l.489 ; accord de sous-traitance l.300 ; CGV l.172 ; remboursement l.36.
- **Hors pages publiques** : `blog-couvertures.tsx:11` (un commentaire) et `content/blog/README.md:74`.

## 5. Ajouter une liste d'attente dans les conventions du projet

**Table**
- Nom au pluriel, par exemple `inscriptionsAttente`, à placer dans `crmTables` (admin/tables.ts:97-172). C'est une donnée de Letikette, sans établissement.
- Ce fichier est balayé par purge-complete.test.ts:46-53, qui ne lit que recouvrement, risque, croissance, admin, support et schema.ts : **un nouveau fichier de tables échapperait au balayage**.
- Champs proposés : `email` normalisé (`normaliserEmail`, crm/empreinte.ts), `sujet: v.union(v.literal('procedure-23-avril'))`, `consentiLe`, `texteConsenti` (la version de la phrase), `confirmeLe?`, `jeton` (`crypto.randomUUID()`), `source?` (bornée comme `lireSource`).
- Index `by_email`, `by_jeton`, `by_sujet`.
- Si l'équipe la lit, l'ajouter à `TABLES_AUTORISEES` (admin-tables.test.ts:18-42). Mettre à jour la phrase de CLAUDE.md sur les tables sans établissement.

**Écriture**
- Ce serait la **première mutation publique sans authentification** du produit : seul `tests.ts` en a.
- Le limiteur de débit est installé mais jamais instancié (`@convex-dev/rate-limiter`, convex.config.ts:5 et 12). Il faut créer `new RateLimiter(components.rateLimiter, …)`, plus un champ piège invisible contre les robots.
- Même réponse que l'adresse soit déjà inscrite ou non (rien ne révèle une inscription existante).
- Vérifier l'empreinte contre `oppositions` (`empreinteDEmail`, table admin/tables.ts:131-135). Une adresse opposée n'est pas stockée.
- Logique pure dans `src/lib/croissance/attente.ts`, fonctions Convex dans `src/lib/convex/croissance/attente.ts`. Annoter le type de retour si une fonction appelle `internal.croissance.attente.*` (le piège du cycle d'inférence).

**Consentement**
- Case non cochée et phrase explicite.
- Double confirmation par e-mail : l'adresse est publique, n'importe qui pourrait inscrire celle d'un autre.
- Envoi par `resend.sendEmail` (emails/resend.ts:36), expéditeur `expediteurNomme(AUTH_EMAIL, 'Letikette')` (helpers.ts:58), en-têtes `List-Unsubscribe` et `List-Unsubscribe-Post` comme conseils.ts:162-167, gabarit dans `emails/modeles/`.

**Désinscription et confirmation** : reprendre `desinscriptionConseils` (conseils.ts:248-267, routes GET et POST à http.ts:49-50). **Un GET ne fait rien** (les antivirus ouvrent les liens), seul le POST confirme ou désinscrit. Décision à prendre : la désinscription verse-t-elle l'empreinte dans `oppositions` ?

**Formulaire**
- Les pages publiques sont déjà sous `ConvexBetterAuthProvider` (providers.tsx, __root.tsx:114), donc `useMutation` fonctionne.
- Un bouton Cladd n'a pas de `type` : poser `type="submit"` explicitement.
- Ajouter un événement Umami `attente-inscrite`.

**Juridique**
- Politique de confidentialité en version 2.9 : finalité et base « consentement » au §5 (vers l.186), durée au §9 (vers l.427), Resend comme destinataire.
- Une purge au-delà de la durée, dans crons.ts.

## 6. Publication datée avec content-collections : possible, sans nouveau build

**L'état actuel**
- Le build compile tout `content/blog/*.mdx` dans `allArticles` (content-collections.ts:36-90).
- `dateDuJour` accepte une date future (l.25-28).
- `articlesPublies()` (blog.ts:18-22) ne filtre que `brouillon`. **Aujourd'hui, un article daté de la semaine prochaine sort tout de suite, avec sa date future affichée.**

**Pourquoi un filtre à l'exécution suffit**
- Le rendu se fait à chaque requête : `tanstackStart()` sans prérendu (vite.config.ts:331), vercel.json renvoie tout vers `/api`, et aucun `Cache-Control` n'est posé sur le HTML.
- Il suffit donc d'ajouter dans `articlesPublies()` : `import.meta.env.DEV || (!a.brouillon && a.date <= jourDeParis())`.
- Une seule modification couvre tous les lecteurs : liste, chargeur de l'article ($adresse.tsx:22-24, qui renvoie `notFound` avant la date), RSS, sitemap, llms, navbar, pied, `articlesLies`.

**Limites**
- RSS, sitemap et llms sont mis en cache 1 h (`max-age=3600`).
- Le MDX compilé d'un article à venir est déjà dans le paquet JavaScript : c'est un embargo, pas un secret.
- Calculer la date en Europe/Paris des deux côtés, pour éviter un écart de rendu entre serveur et navigateur autour de minuit.
- Tester ce filtre suppose que le module généré `content-collections` existe sous Vitest. Non vérifié.

## 7. Écarts entre l'audit et CLAUDE.md, à trancher par le fondateur

- **Temps humain** : « Réclamation clé en main sous 48 h », « Pilote accompagné » et « mise en route faite ensemble » vendent du temps humain, contre « On vend un logiciel qui mesure, pas du temps humain ».
- **Rédaction pour autrui** : « Letikette calcule et rédige » (audit l.78) est à valider par un avocat au regard de la règle sur la rédaction d'actes pour autrui et de la ligne rouge n° 1.
- **Mandat à 12 %** : incompatible avec la ligne rouge n° 2, les CGV 4.1 et 4.2, le pied (l.128-133), securite.tsx:52 et documents-publies.test.ts. C'est pour plus tard, l'audit le dit lui-même.
- **Titres d'articles à l'impératif** : « Intérêts moratoires : réclamer avant le 31 décembre » se heurte à la ligne rouge n° 3 (ne jamais dire qu'il faudrait agir). Le test des lignes rouges ne balaie ni `src/marketing` ni `content/`, il faut donc relire à la main.
- **Valeurs écrites en dur** : « majoré de dix points » apparaît en toutes lettres à calcul.tsx:337, faq.tsx:65, mdx.tsx:53, secteurs.ts:114, 140 et 149, index.tsx:71 et llms.txt:28. Le « huit points » du public doit, lui, être lu dans un paramètre.