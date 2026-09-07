# D — Juridique et conformité

Le bouclier, les obstacles réglementaires, le chemin vers l'agrément.
**C'est ici que vit le chemin critique du plan.**

---

## 1. Le bouclier : ce que Letikette ne fait pas

Letikette se définit par ses limites techniques absolues. Ce ne sont pas des précautions de rédaction :
ce sont des **frontières encodées dans le produit**, et chacune tombe le jour où l'agrément
correspondant est obtenu — jamais avant.

### Ligne rouge 1 — Aucun recouvrement pour compte de tiers

Le recouvrement amiable pour le compte d'autrui est une activité encadrée.

**En Phase 1 :** les relances sont des **brouillons générés dans la boîte du client**. C'est lui qui
envoie, depuis sa propre adresse, sous sa propre signature. L'argent va du débiteur au client,
directement. Letikette n'apparaît à aucun moment dans la chaîne.

**Tombe en Phase 2**, avec la déclaration à l'autorité compétente et le compte séquestre.

### Ligne rouge 2 — Aucun maniement de fonds

Aucun encaissement, aucun séquestre, aucune commission sur ce qui rentre. C'est ce qui dispense
Letikette des obligations de vigilance et de déclaration liées au maniement de fonds de tiers, et donc
ce qui rend le lancement possible sans capital réglementaire.

**Tombe en Phase 3**, avec le statut d'agent d'un établissement de paiement.

### Ligne rouge 3 — Aucun conseil juridique

**Celle-ci ne tombe jamais.** Le conseil juridique est un monopole. Le produit énonce des **CONSTATS**
et jamais des recommandations.

| Ce qu'on n'écrit jamais | Ce qu'on écrit |
|---|---|
| « Vous devriez engager une injonction de payer » | « Cette créance remplit les quatre conditions de l'injonction de payer » |
| « Ce dossier est trop faible pour être engagé » | « Trois des quatre pièces attendues sont absentes » |
| « Déclarez votre créance au mandataire » | « Les relances sont suspendues : ce débiteur est en liquidation depuis le 14 mars » |

La différence n'est pas cosmétique : la première colonne qualifie une conduite à tenir, la seconde
constate un état. **La formulation est la défense.**

### Le mot interdit

**« Garantie ».** On ne garantit aucun recouvrement. Un test balaie les écrans, la page publique et
les gabarits de courriel : `src/lib/__tests__/mots-interdits.test.ts`.

## 2. Le registre, et les deux barrières

Toute valeur juridique vit dans `src/lib/verticales/recouvrement/parametres.ts` ou dans un module de
pays qu'il référence. Chaque entrée porte **valeur, source, date de relevé**, et deux booléens :

| Booléen | Ce qu'il signifie | Ce qu'il autorise | La fonction qui l'exige |
|---|---|---|---|
| `verifie` | Relevée sur une source publique citable | **Calculer** — un chiffre affiché se corrige | `exiger()` |
| `valideParAvocat` | Un juriste a contrôlé la valeur **et son applicabilité** | **Produire un acte** — un chiffre au greffe ne se corrige pas | `exigerPourActe()` |

**Pourquoi deux barrières et pas une.** Une barrière unique aurait bloqué le produit entier sur une
signature. Deux barrières placent l'exigence là où l'erreur devient irréversible, et laissent tout le
reste sortir. **C'est cette distinction qui rend le MVP livrable avant l'avocat.**

Un test interdit d'écrire une référence d'article hors du registre et des modules de pays :
`verticales/recouvrement/__tests__/valeurs-juridiques.test.ts`.

## 3. L'état du registre au 3 septembre 2026

**`valideParAvocat` vaut `false` sur les quinze entrées.** Aucun acte ne peut donc sortir, quoi qu'on
code.

### Ce qui est relevé et sourcé (`verifie: true`)

| Entrée | Source | Nature |
|---|---|---|
| Taux d'intérêt de retard par défaut | Article L441-10 II du code de commerce | Série semestrielle, résolue par `pays/france/taux.ts` |
| Taux contractuel minimal (trois fois le taux légal) | Article L441-10 II | Série semestrielle |
| Délai de prescription commerciale | Article L110-4, et prescriptions spéciales plus courtes | Série sectorielle |
| Indemnité forfaitaire de 40 € | Article D441-5, issu du décret n° 2012-1115 du 2 octobre 2012 | Constante |
| Régimes de prescription sectoriels | L110-4, L133-6, L218-2 (avec L218-1 sur l'ordre public) | Six régimes |

**Recoupement indépendant :** les douze taux d'intérêt légal sont vérifiés contre les planchers
publiés séparément (3 × 3,71 = 11,13 ; 3 × 2,76 = 8,28 ; 3 × 2,62 = 7,86 ; 3 × 2,75 = 8,25). Cette
vérification croisée attrape une faute de frappe, qu'une simple relecture laisserait passer.

### Ce qui manque, et bloque

| Entrée | État | Conséquence |
|---|---|---|
| **Mentions obligatoires de la requête en injonction de payer** | Source non trouvée | Bloque 4.4 même après validation du reste. |
| **Décret d'application de la procédure L.126** | Non publié à ce jour | La procédure reste indisponible. Hors de notre contrôle. |
| **Tarif du commissaire de justice pour L.126** | Dépend du décret ci-dessus | Idem. |
| **Délai de contestation L.126** | Idem | Idem. |
| **Délai du procès-verbal de non-contestation** | Source non fournie | Bloque la machine à états post-procédure sur cette branche. |
| **Délai de signification de l'injonction** | Source non fournie | Bloque le compte à rebours post-jugement. |

⚠️ **Aucune de ces valeurs ne sera devinée.** Un numéro d'article inventé recopié dans un courrier au
débiteur est plus dangereux qu'une source absente, parce qu'il a l'air vérifiable.

## 4. Le brief pour le juriste — le livrable borné

**Ne pas ouvrir une mission de conseil.** Commander un livrable défini, qui se forfaitise.

### Ce qu'on demande

**A. Valider les cinq entrées déjà relevées** — la valeur ET son applicabilité au cas d'usage décrit.
C'est une relecture de sources publiques, pas une recherche.

**B. Fournir les six sources manquantes** listées au §3, ou confirmer qu'elles n'existent pas encore.

**C. Répondre à quatre questions fermées :**

1. **L'indemnité forfaitaire de 40 € et les intérêts de retard restent-ils réclamables sur une facture
   dont le principal a déjà été payé, et dans quelle limite de temps ?**
   *Enjeu : c'est l'amplitude du « choc du premier import », donc du produit d'appel.*
2. **La formulation « cette créance remplit les conditions X, Y, Z de la procédure P » constitue-t-elle
   un constat ou un conseil juridique ?**
   *Enjeu : c'est la ligne rouge 3, et la formulation de tout le produit en dépend.*
3. **Un logiciel qui rédige un projet de mise en demeure citant les articles applicables, envoyé par le
   créancier lui-même depuis sa propre adresse, exerce-t-il une activité de recouvrement pour compte de
   tiers ?**
   *Enjeu : c'est la ligne rouge 1, et le module 3 en dépend.*
4. **Un score de solidité documentaire (« trois des quatre pièces attendues sont absentes ») est-il un
   constat opposable ou une appréciation juridique ?**
   *Enjeu : c'est le jugement limite du module 4.2.*

**D. Un avis écrit sur le positionnement** au regard de l'exercice illégal du droit — à obtenir
**avant d'être visible**, pas après une première plainte. Un avis qu'on brandit vaut mieux qu'un avis
qu'on cherche dans l'urgence.

### Ce qui rend ce brief facile à chiffrer

Les valeurs sont **déjà relevées, sourcées et datées**. Le juriste ne cherche pas : il contrôle. Le
registre s'exporte tel quel, et son format porte déjà la source et la date de relevé de chaque entrée.

## 5. Les obstacles réglementaires, par phase

### Phase 1 — Le Conseil National des Barreaux

**Le risque :** plainte pour exercice illégal du droit. Les avocats défendront leur monopole sur la
qualification des litiges.

**La défense de fond :** l'architecture est **déterministe**. Les algorithmes n'inventent pas de
droit ; ils appliquent des grilles de lecture publiques — code de commerce, BODACC, Sirene. Le
positionnement est celui d'un **logiciel de calcul financier et de préparation documentaire**, jamais
d'un avocat virtuel. Le refus de produire un acte sur un dossier incomplet (`controle.ts`) est un
argument, pas un détail : le produit se retient là où un conseil pousserait.

**La défense de forme :** l'avis écrit du §4-D, obtenu tôt.

### Phase 2 — Le statut d'agence de recouvrement amiable

Ce qui est exigé, en termes généraux : une **déclaration à l'autorité compétente**, un **compte
dédié** distinct des comptes d'exploitation pour les fonds encaissés pour autrui, une **assurance de
responsabilité civile professionnelle**, et une **garantie financière** couvrant les fonds détenus.
Les mentions obligatoires des courriers adressés au débiteur sont également encadrées.

> ⚠️ **Les textes, les seuils exacts, l'autorité destinataire et le contenu précis de la déclaration
> sont à relever et à sourcer avant tout engagement.** Ce document ne cite volontairement aucun
> numéro de décret sur ce point : c'est exactement la règle qui protège le produit, et elle vaut
> aussi pour nos propres documents internes.

**À faire relever par le juriste au moment d'engager la Phase 2**, pas maintenant — le brief du §4
reste borné.

### Phase 3 — Le maniement de fonds

**Le raccourci retenu : agent d'un établissement de paiement**, pas établissement en propre. Le
partenaire porte l'agrément, les obligations de lutte contre le blanchiment et le financement du
terrorisme, et les procédures de vigilance. C'est ce qui transforme une démarche de plusieurs années
en une intégration.

**L'immatriculation ORIAS** est requise pour le courtage d'assurance. Démarche administrative bornée,
à lancer un trimestre avant le besoin.

**Le principe qui gouverne toute la Phase 3 : ne jamais porter le risque financier.** Letikette est
l'apporteur ; la banque partenaire porte. On vend la qualification — qui est notre valeur — pas le
crédit.

## 6. Protection des données

**Multi-tenant strict par organisation, sans aucune exception.** Rien n'est mutualisé entre clients :
un débiteur, un montant et une échéance sont des données client, toujours. La purge est donc totale,
sans exception à justifier.

⚠️ **Le radar de solvabilité tentera d'introduire la première exception.** Mutualiser un cache BODACC
entre clients serait efficace, et la donnée BODACC est publique. **Mais le fait qu'un client suive tel
débiteur est une donnée client.** La ligne à tenir : on peut mutualiser le contenu du registre public,
jamais la liste de qui s'y intéresse.

Les documents contractuels existent et sont à réviser au moment de la Phase 2 : `docs/juridique/`
porte les mentions légales, les conditions générales, la politique de confidentialité et l'accord de
sous-traitance.

## 7. La séquence, résumée

| Quand | Quoi | Qui |
|---|---|---|
| **Semaine 1** | Contacter le juriste, écrire le périmètre du forfait (§4) | Jules |
| **Semaine 1** | Déposer la demande de partenariat Pennylane | Jules |
| **Dès réception** | Basculer `valideParAvocat` sur les entrées validées → **4.4 s'ouvre sans redéploiement** | Code |
| **Avant visibilité** | Obtenir l'avis écrit sur le positionnement (§4-D) | Juriste |
| **Phase 1 tardive** | Approcher 5 à 10 études de commissaires de justice technophiles | Jules |
| **Avant Phase 2** | Faire relever le régime complet de l'agence de recouvrement amiable | Juriste |
| **Avant Phase 3** | Choisir l'établissement de paiement partenaire, lancer ORIAS | Jules |
