# Brief de remodelage — Letikette vers le recouvrement de créances B2B

## Comment utiliser ce document

Donne ce fichier à Claude Code en début de session. Ne lui demande pas de tout faire d'un coup : fais une session par phase, et valide avant de passer à la suivante.

Les phases 0 et 1 sont obligatoires avant toute autre. Le reste peut être réordonné.

---

## 0. Règles absolues — à respecter dans toutes les phases

Ces règles priment sur toute instruction ultérieure de ce document.

### 0.1 Ne jamais inventer de règle juridique

Aucune valeur juridique ne doit être écrite en dur dans la logique métier. Ni un taux, ni un délai, ni un seuil, ni une mention obligatoire.

Toutes les règles juridiques vivent dans un fichier de configuration versionné (voir 4.1). Chaque entrée porte obligatoirement :

- la valeur
- l'article ou le texte source
- la date de vérification
- un booléen `verified` initialisé à `false`

Si une valeur est nécessaire et que la source n'est pas fournie dans ce brief, **ne pas la deviner**. Créer l'entrée avec `value: null`, `verified: false`, et un commentaire `TODO: à fournir par Jules`. Le code doit échouer explicitement si une valeur `null` est utilisée en production, jamais silencieusement.

### 0.2 Ne rien supposer du code existant

Avant toute modification, lire le code. Ne jamais présumer d'une structure de fichiers, d'un schéma de données, d'un nom de fonction ou d'une bibliothèque. Si une information manque, poser la question plutôt que d'inventer.

### 0.3 Le score de confiance ne ment pas

Toute qualification produite par le moteur porte un score. Une créance qui n'atteint pas le seuil ne part pas en procédure : elle remonte en validation humaine. Le produit n'a le droit d'être silencieux sur aucun doute.

### 0.4 Pas de conseil juridique

Le produit énonce des faits et des constats, jamais des recommandations juridiques. Formulation autorisée : « cette créance remplit les conditions X, Y, Z ». Formulation interdite : « vous devriez engager telle procédure ».

### 0.5 Tests d'abord

Suivre le process TDD du setup existant. Chaque règle de qualification et chaque calcul financier a un test avant d'avoir une implémentation.

---

## 1. Phase 0 — Audit du code existant

**Objectif : produire un état des lieux, ne rien modifier.**

Lire l'intégralité du code de Letikette et produire un rapport `AUDIT.md` répondant à :

1. Quelle est la structure réelle du projet (arborescence, modules, responsabilités) ?
2. Quel est le schéma de données actuel (Convex) ? Lister chaque table et ses champs.
3. Comment se fait l'ingestion de documents aujourd'hui ? Quels formats, quel pipeline, quelles bibliothèques ?
4. Où se trouve l'extraction ligne à ligne ? Est-elle isolée ou couplée à la logique EGalim ?
5. Où se trouve la normalisation des libellés fournisseurs ?
6. Où se trouve la réconciliation d'une référence dans le temps ?
7. Comment le score de confiance est-il calculé et où est-il utilisé ?
8. Quelle part du code est spécifique à EGalim ? Donner un pourcentage estimé et la liste des fichiers concernés.
9. Quels sont les tests existants et que couvrent-ils ?
10. Quelles dépendances externes (modèles, APIs, services) ?

Terminer le rapport par une section **« Ce que je ne sais pas »** listant tout ce qui reste ambigu après lecture.

**Ne pas proposer d'architecture à ce stade.** L'audit est un constat.

---

## 2. Phase 1 — Séparation du socle et de la verticale

**Objectif : rendre le moteur indépendant du domaine métier.**

Le moteur actuel fait une chose réutilisable : transformer des documents hétérogènes en lignes structurées, normalisées, rapprochées d'un référentiel, avec justification et score.

EGalim n'est qu'un référentiel parmi d'autres. Le recouvrement en sera un autre.

### Ce qui appartient au socle (générique, aucune notion métier)

- ingestion multi-format
- extraction ligne à ligne
- normalisation de libellés
- réconciliation d'entités dans le temps
- moteur de rapprochement contre un référentiel injecté
- calcul et propagation du score de confiance
- file de validation humaine
- piste d'audit : chaque valeur produite doit être traçable jusqu'à sa source documentaire

### Ce qui appartient à une verticale

- le référentiel lui-même
- les règles de qualification
- les calculs propres au domaine
- les formats de sortie

### Travail attendu

Proposer une séparation. **Ne pas l'implémenter avant validation.** Produire un document `ARCHITECTURE.md` avec :

- la frontière proposée entre socle et verticale
- l'interface que doit exposer le socle pour qu'une verticale s'y branche
- la liste des déplacements de code nécessaires
- les risques de régression sur la verticale EGalim existante

La verticale EGalim doit continuer à fonctionner après la séparation. C'est le test de non-régression de cette phase.

**Liberté laissée :** le découpage exact des modules, les noms, la forme de l'interface. Choisis ce qui est idiomatique pour Tanstack Start et Convex plutôt que de suivre une structure imposée.

---

## 3. Phase 2 — Le modèle de domaine « recouvrement »

**Objectif : poser les entités, sans logique.**

### Entités attendues

**Créancier** — l'utilisateur. Notamment : forme juridique, qualité de commerçant (booléen, car il conditionne l'éligibilité à certaines procédures), SIREN.

**Débiteur** — SIREN, forme juridique, qualité de commerçant, statut de santé financière si disponible, historique de paiement observé.

**Facture** — les lignes, le montant HT et TTC, la date d'émission, la date d'échéance, les conditions de paiement applicables, le statut de paiement, les pièces liées.

**Pièce justificative** — bon de commande, devis signé, bon de livraison, CGV, contrat, échanges. Chaque pièce porte un type et un lien vers la ou les factures qu'elle soutient.

**Créance** — l'agrégat qui part en procédure. Une créance peut porter plusieurs factures du même débiteur. Elle porte le décompte, la qualification et le score.

**Dossier** — une créance plus une procédure choisie plus un état d'avancement plus les échéances à surveiller.

**Procédure** — entité modulaire (voir phase 5).

### Points d'attention

- Une facture peut être partiellement payée. Le modèle doit le porter nativement, pas en cas particulier.
- Les avoirs et les acomptes modifient le montant exigible.
- La date d'exigibilité n'est pas la date d'échéance dans tous les cas. Elle dépend des conditions contractuelles.

**Liberté laissée :** la modélisation exacte dans Convex, les relations, les index. Propose ce qui tient la charge et reste lisible.

---

## 4. Phase 3 — Le calcul financier

C'est le cœur de la valeur. Une erreur ici coûte de l'argent réel au client.

### 4.1 Le fichier de paramètres juridiques

Créer `src/lib/legal/parameters.ts` (ou l'équivalent idiomatique). Structure attendue pour chaque entrée :

```ts
{
  key: string,
  value: number | string | null,
  unit: string,
  source: string,        // article de loi ou texte
  verifiedAt: string,    // date ISO
  verified: boolean,     // false par défaut
  note: string
}
```

Entrées à créer **avec `value: null` et `verified: false`** — Jules fournira les valeurs après validation par un avocat :

- taux d'intérêt de retard applicable par défaut en l'absence de stipulation contractuelle
- taux d'intérêt de retard minimal légal
- montant de l'indemnité forfaitaire pour frais de recouvrement
- délai de contestation dans la procédure L.126
- délai avant établissement du procès-verbal de non-contestation
- délai de signification d'une ordonnance d'injonction de payer
- délai de prescription commerciale
- tarif du commissaire de justice (procédure L.126) — **non publié à ce jour, laisser null**

**Ce que je peux te confirmer comme vérifié** (à recopier avec `verified: true`) :

- L'indemnité forfaitaire pour frais de recouvrement s'élève à 40 euros par facture.
- La procédure L.126 n'a ni plafond ni plancher de montant.
- Le délai de contestation du débiteur est d'un mois à compter de la signification du commandement.
- Le procès-verbal de non-contestation peut être dressé au plus tôt huit jours après l'expiration du délai d'un mois.
- Le délai de signification de l'ordonnance d'injonction de payer est de trois mois, sous peine de caducité, pour les ordonnances rendues à compter du 1er septembre 2026.
- La créance doit être certaine, liquide et exigible, et issue d'une facturation entre commerçants.

Tout le reste : `null`, jusqu'à validation.

### 4.2 Le décompte

Produire, pour une créance donnée :

- le principal restant dû, facture par facture
- les intérêts de retard, calculés jour par jour depuis chaque date d'exigibilité, avec le taux applicable à chaque facture (contractuel si stipulé, légal sinon)
- l'indemnité forfaitaire, par facture
- le total

### 4.3 Exigences

Le calcul doit être **reproductible** : le même dossier rejoué six mois plus tard avec la même date de référence donne exactement le même résultat.

Chaque montant doit être **explicable** : pour toute somme affichée, le produit doit pouvoir montrer d'où elle vient, avec quel taux, sur quelle période, depuis quelle pièce.

Utiliser une arithmétique décimale exacte, jamais de flottants sur des montants.

Tests obligatoires : facture partiellement payée, plusieurs factures à taux différents, avoir intervenant en cours de période, année bissextile, changement de taux légal en cours de période.

---

## 5. Phase 4 — Le moteur de qualification

**Objectif : dire si une créance est mûre, et pourquoi.**

Pour chaque créance, produire une qualification structurée :

```
{
  eligible: boolean,
  score: number,          // 0 à 1
  criteria: [
    { name, status: 'ok' | 'ko' | 'unknown', evidence, weight }
  ],
  risks: [ { type, description, severity } ],
  missingPieces: [ ... ]
}
```

### Critères à évaluer

**Conditions légales** — la créance est-elle certaine, liquide, exigible ? La relation est-elle entre commerçants ? Chaque critère renvoie `unknown` plutôt que `ok` si la donnée manque. Ne jamais présumer favorablement.

**Solidité documentaire** — quelles pièces soutiennent la créance ? Une facture seule est plus fragile qu'une facture adossée à un bon de commande signé et un bon de livraison. Le score doit refléter cette hiérarchie.

**Signaux de contestation** — c'est le risque produit numéro un. Une contestation, même infondée, met fin à la procédure simplifiée. À détecter : réclamation antérieure du débiteur, litige mentionné dans les échanges, avoir partiel accordé, écart entre le commandé et le facturé, prestation dont la réception n'est pas documentée.

**Signaux de recouvrabilité** — procédure collective en cours, radiation, historique de retard.

### Sur les critères non calculables

Certains critères ne peuvent pas être déterminés depuis les documents. Le produit doit demander à l'utilisateur, pas deviner. Prévoir un questionnaire court, déclenché uniquement sur les critères réellement `unknown`.

**Liberté laissée :** la pondération, la forme du scoring, l'implémentation de la détection. Ce sont des choix à calibrer sur données réelles, pas à figer maintenant. Documente tes choix dans le code.

---

## 6. Phase 5 — Les procédures comme modules

**Objectif : rendre l'application indifférente au droit applicable.**

C'est la décision d'architecture la plus importante du projet. Le décret d'application de la procédure L.126 n'est pas publié à ce jour, et le produit doit fonctionner sans lui. Il doit aussi pouvoir accueillir d'autres pays plus tard.

### Interface attendue

Chaque procédure est un module qui expose :

- ses conditions d'éligibilité, évaluables contre une créance qualifiée
- les pièces qu'elle exige
- les mentions obligatoires de l'acte qu'elle produit
- le format de sortie
- son calendrier : les échéances à surveiller une fois engagée
- ses conditions d'échec

### Modules à créer

**`injonction-de-payer`** — opérationnel, à implémenter en premier. C'est ce qui permet de lancer sans attendre le décret.

**`l126-creances-commerciales`** — structure créée, mentions et tarif en attente du décret. Le module doit exister et se déclarer indisponible tant que ses paramètres ne sont pas `verified`.

**`relance-amiable`** — sortie par défaut pour les créances qui n'atteignent pas le seuil de qualification. Ne jamais laisser un utilisateur sans action possible.

### Règle non négociable

Le titre exécutoire ne porte que sur les sommes chiffrées dans l'acte. Ce qui n'est pas demandé est définitivement perdu.

Le produit doit donc **bloquer** la génération d'un acte dont le décompte est incomplet, et afficher explicitement ce qui serait abandonné. C'est le garde-fou le plus important du produit.

---

## 7. Phase 6 — La surveillance

**Objectif : donner une raison d'ouvrir le produit chaque semaine.**

C'est ce qui porte l'abonnement, et c'est indépendant de toute procédure.

Un flux d'événements, chacun avec une action au bout :

- une facture vient d'arriver à échéance
- une créance vient d'atteindre le seuil de qualification
- une échéance de procédure approche (le délai de signification de trois mois est le cas critique)
- un débiteur se dégrade
- une créance approche de la prescription

Chaque événement porte un montant en euros. Un compteur cumulé affiche ce que le produit a permis d'identifier depuis l'inscription.

**Liberté laissée :** l'implémentation des déclencheurs, la forme de l'interface.

---

## 8. Ce qui reste hors périmètre

Ne pas implémenter, ne pas préparer :

- l'envoi de relances au débiteur au nom du client (activité de recouvrement encadrée)
- toute manipulation de fonds
- toute recommandation sur la procédure à choisir (conseil juridique)
- un classement ou une notation des commissaires de justice
- l'agrégation bancaire (phase ultérieure, coût à valider)

---

## 9. Ordre d'exécution recommandé

1. Phase 0 — audit
2. Phase 1 — architecture proposée, validée par Jules avant implémentation
3. Phase 1 — implémentation, avec non-régression EGalim
4. Phase 2 — modèle de domaine
5. Phase 3 — calcul financier, avec tests exhaustifs
6. Phase 5 — module injonction de payer uniquement
7. Phase 4 — qualification, version simple, à calibrer ensuite sur données réelles
8. Phase 6 — surveillance
9. Interface

L'interface vient en dernier. Un produit qui affiche joliment des dossiers contestables ne vaut rien.

---

## 10. Critères d'acceptation

Le remodelage est réussi quand :

- la verticale EGalim fonctionne toujours
- aucune valeur juridique n'est écrite en dur hors du fichier de paramètres
- aucun paramètre `verified: false` ne peut être utilisé sans erreur explicite
- tout montant affiché est traçable jusqu'à sa pièce source
- le même dossier rejoué donne le même résultat au centime
- une créance incomplète bloque la génération de l'acte
- un nouveau pays ou une nouvelle procédure s'ajoute sans toucher au socle

---

## 11. En cas de doute

Si une instruction de ce brief entre en conflit avec ce que tu observes dans le code, avec les idiomes de Tanstack Start ou de Convex, ou avec le bon sens : **arrête-toi et demande**. Ce document a été écrit sans accès au code.

Signale aussi toute règle juridique qui te paraît manquante ou douteuse. Mieux vaut une question qu'une valeur inventée.
