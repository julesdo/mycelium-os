# Letikette — Manifeste

**Le document de référence.** Vision, doctrine, lignes rouges, endgame.
Écrit le 3 septembre 2026. C'est celui qu'on relit quand une décision hésite.

---

## 1. Ce que Letikette est

**Letikette est une infrastructure légale et financière qui transforme des impayés morts en
trésorerie disponible.**

Ce n'est pas un logiciel d'envoi d'e-mails de relance. Ce n'est pas un tableau de bord de poste
client. Ces deux produits existent déjà, ils se vendent mal, et ils ne résolvent rien : relancer
plus poliment ou plus souvent ne change pas le fait que personne ne sait **combien** réclamer, ni
**jusqu'à quand**.

Le poste client B2B n'a pas bougé depuis vingt ans. Une entreprise a trois options devant un
impayé : confier le dossier à un cabinet de recouvrement dont elle ne comprend ni la méthode ni la
commission ; payer un avocat plus cher que la créance ; ou abandonner, par phobie de la complexité
juridique. La troisième option est de loin la plus fréquente, et elle ne fait aucun bruit.

## 2. Le problème, et pourquoi il est invisible

Trois choses sont dues **de plein droit** — sans clause, sans négociation, sans mise en demeure — et
presque jamais réclamées, faute de savoir les calculer.

| Ce qui est dû | Le texte | Pourquoi personne ne le réclame |
|---|---|---|
| Les intérêts de retard, au taux BCE majoré de dix points | L441-10 II du code de commerce | Le taux se réancre **deux fois par an**. Une facture impayée depuis dix-huit mois traverse trois taux. Personne ne fait ce calcul à la main. |
| L'indemnité forfaitaire de 40 € **par facture** | D441-5 du code de commerce | Beaucoup l'ignorent. Ceux qui la connaissent la croient par client. |
| Le respect du délai de prescription | L110-4, et les prescriptions spéciales plus courtes | Cinq ans en général, **un an** sur le transport de marchandises (L133-6), deux sur ce qu'on fournit à un consommateur (L218-2). Le délai varie par secteur, et il court tout seul. |

**Une facture impayée ne fait aucun bruit le jour où elle devient irrécouvrable.** C'est le seul
jour où il aurait fallu agir. C'est le cœur du problème, et c'est la raison d'être du produit.

## 3. Ce qu'on vend

Un abonnement à un logiciel qui **mesure**, pas à des heures de travail humain.

L'import et le rapprochement sont automatisés. Le dirigeant ne tranche que ce qu'aucune facture ne
dit. Le produit surveille les échéances et la prescription, qualifie les créances, et arrête un
décompte au centime, explicable période par période.

## 4. Les trois lignes rouges

Elles ne sont pas des précautions. Ce sont les frontières qui rendent l'entreprise possible sans
agrément et sans procès, et **chacune tombe le jour où l'agrément correspondant est obtenu** — pas
avant.

1. **On ne relance jamais le débiteur au nom du client.** Le recouvrement pour compte de tiers est
   une activité encadrée. En Phase 1, les relances sont des **brouillons** générés dans la boîte du
   client. C'est le client qui envoie. Cette ligne tombe en Phase 2, avec l'agrément.
2. **On ne manipule jamais de fonds.** Aucun encaissement, aucun séquestre, aucune commission sur ce
   qui rentre. L'argent va du débiteur au client, directement. Cette ligne tombe en Phase 3, avec le
   statut d'agent de prestataire de services de paiement.
3. **On ne recommande jamais une procédure.** Ce serait du conseil juridique, monopole des avocats.
   Le produit énonce des **CONSTATS** — « cette créance remplit les conditions X, Y, Z » — jamais
   « vous devriez engager telle procédure ». **Cette ligne ne tombe jamais.**

Et un mot interdit : **« garantie »**. On ne garantit aucun recouvrement. On mesure, on documente,
on alerte. La décision d'agir reste celle du client. Un test balaie toute l'interface, les écrans et
les courriels — `src/lib/__tests__/mots-interdits.test.ts`.

## 5. La doctrine produit

Le domaine juridique est anxiogène. L'interface doit être un sanctuaire de clarté, de contrôle et
d'autorité. Quatre principes, opposables.

### 5.1 Le logiciel décide, le gérant confirme

Aucun écran ne demande une saisie que le logiciel peut déduire. Un champ vide qu'il aurait pu
remplir est un défaut, pas une option.

### 5.2 L'éradication du jargon

Le dirigeant n'est pas juriste. L'interface traduit la loi en impact business.

| Ce qu'on n'écrit pas | Ce qu'on écrit |
|---|---|
| « Signification de l'ordonnance d'injonction » | « Faire signifier le jugement par commissaire de justice — il reste 9 jours » |
| « Créance exigible non prescrite entre commerçants » | « Ce dossier remplit les quatre conditions. La loi vous autorise à réclamer ces fonds. » |

### 5.3 La friction positive

Les actions légales engagent. Valider l'envoi d'un dossier à un commissaire de justice n'est pas un
clic : c'est un glissement à confirmer, ou une authentification forte. On veut la sensation physique
d'armer quelque chose.

### 5.4 L'explicabilité absolue

**Tout montant réclamé est décomposable.** Un décompte porte ses SEGMENTS : quel principal, quel
taux, sur combien de jours, sur quelle base annuelle. Chaque montant affiché est cliquable et ouvre
sa décomposition, jusqu'à la pièce source.

Un total qu'on ne peut pas décomposer est un chiffre qu'on demande de croire. Décomposé, il se refait
à la main — ce que fera le débiteur qui le conteste, et le juge qui l'examine.

**Un décompte arrêté est figé, définitivement.** Rejouer produit un NOUVEAU décompte daté. La
question n'est jamais « combien réclame-t-on aujourd'hui » mais « qu'a-t-on réclamé le jour où on
l'a réclamé ».

## 6. Les principes d'ingénierie

### 6.1 Aucune valeur juridique n'écrite en dur

C'est la règle la plus stricte du projet. Toute valeur juridique — taux, délai, montant, mention —
vit dans `src/lib/verticales/recouvrement/parametres.ts` ou dans un module de pays qu'il référence.
Chaque entrée porte sa valeur, sa source, sa date de relevé et **deux booléens** :

- `verifie` — relevée sur une source publique citable. Suffit à **calculer** : un chiffre affiché se
  corrige. `exiger()` l'exige.
- `valideParAvocat` — un juriste a contrôlé la valeur ET son applicabilité. Suffit à **produire un
  acte** : un chiffre écrit dans une requête qui part au greffe ne se corrige pas.
  `exigerPourActe()` l'exige.

**Cette distinction porte la roadmap entière.** Voir `01-FRONTIERE-MVP.md`.

**Ne jamais deviner un article de loi, même de mémoire.** Un numéro inventé recopié dans un courrier
au débiteur est plus dangereux qu'une source absente, parce qu'il a l'air vérifiable. On relève sur
Légifrance, on cite, et on recoupe — les douze taux d'intérêt légal sont vérifiés contre les
planchers publiés indépendamment, ce qui attrape une faute de frappe. Un test interdit toute
référence d'article hors du registre : `verticales/recouvrement/__tests__/valeurs-juridiques.test.ts`.

Un semestre absent de la série de taux fait **lever en le nommant**, jamais extrapoler.

### 6.2 L'arithmétique exacte

**Les montants sont des entiers de centimes**, en `bigint` côté logique et en `v.int64()` côté
Convex. Jamais un flottant, du parseur jusqu'à l'écran. La seule division arrondie de toute la chaîne
est explicite, une par segment.

Ce n'est pas du perfectionnisme : `0.1 + 0.2 = 0.30000000000000004`. Un décompte qui ne tombe pas
juste au centime est un décompte qu'un avocat adverse démonte en une audience.

### 6.3 Le doute ne profite jamais au produit

Un critère indéterminé compte comme absent, jamais comme acquis. L'absence de contestation CONNUE
n'est pas une absence de contestation. Un secteur indéterminé fait retenir **le délai de prescription
le plus court** : annoncer cinq ans à une créance qui en a un la ferait s'éteindre en silence, alors
qu'annoncer un an à une créance qui en a cinq fait seulement agir trop tôt.

### 6.4 Ce que le logiciel ne voit pas s'affiche aussi

La surveillance déclare ses hypothèses et ses angles morts. Un utilisateur qui croit sa prescription
surveillée alors qu'elle ne l'est pas ne la surveille pas lui-même — c'est le pire état possible.

### 6.5 Le refus de la DSP2

Se brancher directement sur les banques implique des mois d'audits et la gestion de jetons instables.
Letikette esquive la plomberie bancaire et se branche sur les logiciels de gestion, qui livrent une
donnée déjà nettoyée et lettrée. Voir `B-PRODUIT-TECH.md` pour les chemins d'entrée retenus.

### 6.6 Le triage de confiance

L'IA qualifie les documents non structurés. Si le score de confiance d'une extraction est insuffisant,
l'action automatisée est suspendue et le document tombe dans une file « à valider ». **La machine pose
des questions, elle ne devine jamais.**

## 7. La trajectoire

Trois phases de **monétisation**. **Chaque phase achète le droit à la suivante** — on ne saute pas un
barreau. Le détail, les jalons et les murs sont dans `02-ROADMAP.md`.

> La roadmap compte en revanche **cinq phases d'exécution**, parce qu'elle ajoute aux trois phases
> commerciales une Phase 0 — la construction du radar, avant le premier euro — et une Phase 4 —
> l'écosystème, second pays et marque blanche, qui ne crée pas de nouveau modèle mais démultiplie le
> troisième. La Phase 1 de monétisation ci-dessous est la Phase 1 de la roadmap.

| Phase | Ce qu'on vend | Ce qui tombe | Ce que ça débloque |
|---|---|---|---|
| **1. Le SaaS autonome** | Abonnement. Le radar, le décompte, la chaîne documentaire. | — | L'habitude, les données, la confiance. |
| **2. L'agence** | Abonnement + commission au succès. Le client délègue l'exécution. | Ligne rouge 1 | L'ARPU multiplié sur les gros comptes. |
| **3. L'infrastructure financière** | Interchange, revenue share bancaire, courtage. | Ligne rouge 2 | L'argent ne quitte plus l'écosystème. |

## 8. L'endgame

Letikette commence par le problème le plus ingrat et le plus manuel des PME : l'impayé B2B. En le
résolvant par la technologie pure, elle s'achète le droit d'accéder à la trésorerie de ses clients.

**En devenant le garant du chiffre d'affaires, le logiciel se mue en infrastructure financière.** Un
logiciel comptable qui voudrait alors nous couper l'accès se retrouverait à couper le compte bancaire
de son propre client.

C'est l'enfermement positif : ni le client, ni son ERP, ni sa banque ne peuvent plus nous débrancher
sans casser quelque chose qui marche.

---

## Les autres documents

| Document | Ce qu'il porte |
|---|---|
| `01-FRONTIERE-MVP.md` | La limite de fonctionnalités, et pourquoi elle passe là. |
| `02-ROADMAP.md` | D'aujourd'hui à cinq ans. Jalons, murs, pistes de franchissement. |
| `A-BUSINESS.md` | Modèle, prix, unit economics, trajectoire, financement. |
| `B-PRODUIT-TECH.md` | Architecture cible, les cinq modules, ce qui existe déjà. |
| `C-MARKETING.md` | Positionnement, segments, messages, canaux, cycle de vente. |
| `D-JURIDIQUE.md` | Le bouclier, les obstacles réglementaires, le chemin vers l'agrément. |
| `E-REFERENTIEL-DESIGN.md` | Ce que font réellement Revolut, Ramp, Mercury et Qonto — mesuré dans leur DOM — et les règles Cladd non négociables. |

### Les documents qui sortent

Dérivés des précédents, mais écrits pour être lus par quelqu'un d'extérieur, en dix minutes, sans
rien connaître du projet. `pitch/` :

| Document | Pour qui, et ce qu'il cherche |
|---|---|
| `pitch/JURISTE.md` | Un avocat, qui cherche à **borner un risque**. Décrit la mission comme un livrable chiffrable : contrôler cinq valeurs déjà sourcées, en fournir six manquantes, répondre à quatre questions fermées. |
| `pitch/ASSOCIE.md` | Un futur associé, qui cherche à savoir **où il entre**. Dit ce qui marche, ce qui n'existe pas, et que la traction est nulle. |
| `pitch/INVESTISSEUR.md` | Un investisseur, qui cherche à savoir **ce qu'il souscrit**. Montre l'arithmétique de la trajectoire au lieu de l'affirmer, et désigne le point de preuve. |

⚠️ **Ces trois documents sortent de l'entreprise.** Toute correction du blueprint qui touche un
chiffre, une limite ou une source doit y être répercutée — sinon on communique une version qu'on ne
tient plus.
