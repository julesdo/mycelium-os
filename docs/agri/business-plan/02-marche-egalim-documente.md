# 02 — Marché & EGalim (documenté et sourcé)

> Objectif de ce document : remplacer les hypothèses par des faits. On ne revalide pas la
> demande macro (elle est publique), on la **documente** pour armer le discours commercial.
>
> *Révision du 15 août 2026 : ajout de la mécanique de calcul (section 3), correction honnête
> de l'analyse concurrentielle (section 5), et exploitation de l'open data « ma cantine » comme
> moteur de prospection (section 6).*

---

## 1. La taille du marché

| Indicateur | Valeur | Source |
|---|---|---|
| Repas servis / an en restauration collective | **~3,6 milliards** | Food Service Vision 2024 |
| Chiffre d'affaires du secteur | **~19,9 Md€** (jusqu'à 21,4 Md€ 2025 selon INSEE) | Food Service Vision / INSEE |
| Nombre de sites de restauration | **~75 000** (dont ~36 000 dans l'enseignement) | Xerfi / secteur |
| Marché du bio en restauration collective (2024) | **516 M€** | Agence Bio 2024 |

**Segments** : scolaire, santé/médico-social (hôpitaux, EHPAD), entreprise, administration.
**Modes de gestion** : *directe* (l'établissement gère sa cuisine) vs *concédée* (déléguée à Sodexo, Elior, Compass, Api, Newrest…).

### Notre marché adressable réel (et pas le TAM de façade)

Le chiffre à retenir n'est pas 75 000 sites. C'est celui-ci :

| Filtre | Effet | Reste |
|---|---|---|
| Sites de restauration collective en France | — | ~75 000 |
| Dont **en gestion directe** (le concédé décide au niveau du groupe) | ~×0,60 | ~45 000 |
| Dont **non équipés d'un logiciel de gestion** intégrant le calcul EGalim | ~×0,70 | ~31 000 |
| Dont **privés** (notre porte d'entrée, décision rapide) | ~×0,25 | **~8 000** |
| Dont **Île-de-France** (bassin de départ) | ~×0,18 | **~1 400** |

→ **~1 400 établissements accessibles dans le bassin de départ**, ~8 000 sur le segment privé national. À 3 500 € de valeur client annuelle moyenne (diagnostic + abonnement), le segment privé national pèse **~28 M€ de revenu récurrent adressable**, et le bassin de départ ~5 M€. C'est amplement suffisant pour une entreprise à 5 personnes, et infiniment plus crédible qu'un « marché de plusieurs centaines de millions ».

*Les coefficients ci-dessus sont des ordres de grandeur fondateur, à corriger avec l'open data « ma cantine » (section 6). C'est un des premiers travaux à faire.*

---

## 2. L'obligation légale (le moteur de la demande)

**Loi EGalim (2018), renforcée par EGalim 2 (2021) et la loi Climat & Résilience.**

Obligations principales pour **tout** restaurant collectif, **sans seuil minimal** (même 20 couverts) :

- **≥50 %** de produits **durables et de qualité** (en valeur d'achat HT),
- **dont ≥20 %** de produits **bio**,
- **≥60 %** de durable/qualité pour les familles **viande et poisson**,
- **menu végétarien hebdomadaire** (scolaire),
- lutte anti-gaspillage, fin des contenants plastiques,
- **déclaration annuelle obligatoire** sur `ma-cantine.agriculture.gouv.fr`.

**Calendrier d'entrée en vigueur :**
- Restauration collective **publique** : **1ᵉʳ janvier 2022**.
- Restauration collective **privée (entreprises)** : **1ᵉʳ janvier 2024**. ← **notre porte d'entrée.**
- Déclaration en ligne obligatoire pour le privé également depuis **le 1ᵉʳ janvier 2025**.

⚠️ **Nuance juridique clé** : « local » n'est **pas** un critère légal (le code de la commande publique interdit la préférence géographique directe). Le critère légal, c'est **durable/qualité + bio**. Mais la plupart des produits qualifiants (bio, Label Rouge, AOP/IGP, HVE, fermier) **sont** locaux, et la demande de local (convives, direction, image) est forte. **On vend les deux séparément : la conformité (légal) ET le local (désir).**

---

## 3. La mécanique de calcul (c'est là qu'est le produit)

C'est la section la plus importante du document, parce que **c'est exactement le travail qu'on vend**.

Le ratio EGalim se calcule ainsi :

```
Ratio durable = Σ (montant HT des lignes d'achat qualifiantes) / Σ (montant HT de TOUS les achats alimentaires)
Ratio bio     = Σ (montant HT des lignes bio)                 / Σ (montant HT de TOUS les achats alimentaires)
```

Quatre conséquences opérationnelles, toutes exploitables commercialement :

**1. C'est en valeur, pas en volume.** Un kilo de lentilles bio à 4 €/kg pèse plus dans le ratio qu'un kilo de pommes de terre conventionnelles à 0,80 €/kg. **Le ratio se pilote par les euros, pas par les tonnages.** C'est ce qui rend l'épicerie sèche bio si efficace comme levier (voir doc 03, section 5).

**2. Le dénominateur, c'est TOUT.** Y compris ce qu'on ne fournit pas. On ne peut donc jamais « garantir » la conformité : elle dépend d'achats qu'on ne maîtrise pas. D'où la règle absolue : **obligation de moyens, jamais de résultat** (voir doc 06, section 8).

**3. Le calcul se fait ligne à ligne sur 12 mois de factures.** Une cantine de 300 couverts, c'est ~15 000 €/mois d'achats, soit **2 000 à 5 000 lignes de facture par an**, réparties sur 3 à 8 fournisseurs, au format PDF ou papier, avec des libellés produits abscons (`CAROTTE RONDELLE 4/4 BIO 2.5KG`). Il faut identifier pour chaque ligne : est-ce alimentaire ? est-ce qualifiant ? sous quel label ? pour quel montant HT ? **Personne ne fait ça à la main.** C'est précisément la tâche que la Moulinette Audit automatise (doc 05).

**4. La preuve doit être conservée.** En cas de contrôle, il faut pouvoir justifier le classement de chaque ligne (certificat bio du fournisseur, mention du label sur la facture). Un rapport traçable ligne à ligne, c'est un actif défendable pour le client. C'est ce qu'on livre.

### Le barème de qualification (à connaître par cœur)

| Catégorie | Compte dans « durable » | Compte dans « bio » |
|---|---|---|
| Bio (AB, Eurofeuille) et **en conversion** | ✅ | ✅ (la conversion compte dans le bio) |
| Label Rouge | ✅ | ❌ |
| AOP / AOC / IGP / STG | ✅ | ❌ |
| HVE (Haute Valeur Environnementale, niveau 3) | ✅ | ❌ |
| Mention « fermier » / « produit de la ferme » | ✅ | ❌ |
| Pêche durable (MSC, écolabel pêche) | ✅ | ❌ |
| Commerce équitable | ✅ | ❌ |
| Régions ultrapériphériques (RUP) | ✅ | ❌ |
| Produits acquis selon le **coût du cycle de vie** | ✅ | ❌ |
| **« Local », « circuit court », « de saison » seuls** | ❌ | ❌ |

> Le dernier item est celui qui surprend tous les gestionnaires en rendez-vous. Beaucoup croient
> que leur sourcing local les rend conformes. **Il ne l'est pas.** C'est un excellent argument
> d'ouverture, et c'est vrai.
>
> *Barème à revérifier à chaque évolution réglementaire avant toute production de rapport client.*

---

## 4. Le gouffre de non-conformité (l'opportunité, chiffrée)

Chiffres officiels — campagne 2024 sur les données d'achat 2023 (« ma cantine »), et Agence Bio 2024 :

| Réalité | Chiffre |
|---|---|
| Établissements déclarants atteignant **50 % de durable** | **15 %** seulement |
| Établissements déclarants atteignant **20 % de bio** | **30 %** seulement |
| Part de bio moyenne (déclarants) | **12,1 %** des achats |
| Part de durable/qualité moyenne (déclarants) | **~25–27 %** |
| Part de bio sur **l'ensemble du secteur** (Agence Bio) | **< 6 %** des achats |
| Sites qui **déclarent** effectivement sur « ma cantine » | **~21 %** (les 79 % restants en défaut de déclaration) |

**Lecture business :**
- **~85 % des cantines déclarantes ne sont pas conformes** sur le durable. **~70 %** ne le sont pas sur le bio.
- L'écart entre les déclarants (bio ~12 %) et le secteur entier (bio <6 %) montre que **le gros du marché est silencieux, non outillé, non conforme.**
- **Les 79 % qui ne déclarent pas sont notre cible exacte** : ce sont ceux qui n'ont ni logiciel, ni méthode, ni chiffre. Ceux qui déclarent ont déjà, le plus souvent, un outil de gestion qui calcule pour eux.

C'est exactement le vide qu'on comble, dans cet ordre : **mesurer** ce qui est servi, **chiffrer** l'écart, **sourcer** ce qui manque, **prouver** le résultat.

---

## 5. La concurrence (analyse honnête, révisée)

> **Correction importante du 15 août 2026.** La version précédente de ce document affirmait que
> « personne ne calcule bien les ratios EGalim ». **C'est faux et c'est dangereux à dire en
> rendez-vous** : les logiciels de gestion de restauration collective le font depuis des années.
> Voici l'analyse corrigée.

| Acteur | Ce qu'il fait | Sa faiblesse face à nous |
|---|---|---|
| **Éditeurs de gestion resto collective** (Easilys/Vif, Salamandre, Datameal, et autres) | Suite complète : menus, achats, stocks, coûts, **et calcul des ratios EGalim intégré** | Cible les établissements **déjà structurés et équipés**. Coût et déploiement lourds pour une cantine de 200 couverts. **Et surtout : ils mesurent l'écart, ils ne le comblent pas.** Aucun sourcing. |
| **Agrilocal** | Plateforme publique départementale reliant producteurs et acheteurs publics | Fragmenté département par département, **public uniquement**, outil vieillissant, aucun service humain, pas de production de preuve consolidée |
| **Plateformes de producteurs bio** (réseaux régionaux type « Manger Bio », légumeries, coopératives) | Agrègent une offre bio locale et livrent la restauration collective | Vendent des **produits**, pas de la conformité. Catalogue limité à leurs adhérents. Ne touchent pas au reste des achats de la cantine, donc ne peuvent pas piloter le ratio global. Ce sont autant des **partenaires potentiels** que des concurrents. |
| **Grossistes** (Transgourmet, Pomona, Sysco/Brake…) | Livrent en volume, avec une gamme bio/labellisée croissante | Marge qui écrase le producteur, traçabilité de label inégale, aucun accompagnement à la déclaration, aucun intérêt à réduire le panier du client |
| **Cabinets de conseil RSE / AMO restauration** | Audits ponctuels, accompagnement de collectivités | Cher (missions à 5–15 k€), lent, orienté public et grands comptes, sans suivi mensuel ni sourcing |
| **« ma cantine »** (État) | Plateforme de déclaration, gratuite | Déclarer ≠ être conforme. Ne calcule rien à partir des factures : **c'est au gestionnaire de saisir des montants qu'il ne connaît pas.** C'est exactement là que ça coince. |

### Notre position défendable, formulée honnêtement

Nous ne sommes **ni** le logiciel le plus complet, **ni** le fournisseur le moins cher. Nous sommes le seul à faire **la chaîne complète pour un établissement non équipé** :

> **mesurer** (à partir de ses vraies factures, sans qu'il change d'outil)
> → **chiffrer l'écart en euros et par famille**
> → **combler** cet écart par du sourcing local ciblé
> → **prouver** le résultat tous les mois et le déclarer.

Les éditeurs s'arrêtent à la mesure. Les plateformes de producteurs commencent au sourcing sans jamais mesurer. **Le chaînon manquant, c'est la jonction des deux**, et c'est un travail d'opérateur, pas d'éditeur. C'est aussi ce qui n'est pas copiable par un logiciel : le réseau de producteurs et la relation.

**⚠️ Action à faire avant le premier rendez-vous** : une veille concurrentielle sérieuse d'une demi-journée (tarifs publics, cibles, présence IDF de chaque acteur ci-dessus). Ne jamais entrer en rendez-vous en croyant qu'on est seuls : le gestionnaire, lui, connaît son marché.

---

## 6. L'open data « ma cantine » : notre moteur de prospection

La plateforme « ma cantine » publie en **données ouvertes** le registre des établissements et les télédéclarations (via data.gouv.fr et l'API de la plateforme). C'est un actif d'acquisition considérable, et gratuit.

**Ce qu'on peut en tirer, concrètement :**

1. **La liste géolocalisée** des établissements de restauration collective par commune et par secteur → notre fichier de prospection, sans achat de base de données.
2. **Le ratio déclaré** de ceux qui ont déclaré → *« vous avez déclaré 19 % de durable l'an dernier. On peut vous amener à 45 % sans changer de fournisseur principal. »* Un appel qui commence par le chiffre du prospect n'est plus un appel à froid.
3. **Les absents du registre** → les 79 % qui ne déclarent pas, c'est-à-dire notre cœur de cible, identifiables par différence avec les annuaires d'établissements (SIRENE par code NAF, annuaires cliniques/crèches/EHPAD).
4. **Le recoupement avec la taille** (nombre de couverts déclaré) → segmentation tarifaire S/M/L automatique.

**Tâche concrète, à faire en août 2026 (2 jours de travail) :** monter le fichier de prospection IDF Ouest à partir de l'open data + SIRENE, avec pour chaque ligne : nom, secteur, mode de gestion supposé, couverts, ratio déclaré si connu, statut de déclaration, contact à trouver. **C'est le premier livrable du plan, avant tout appel.** Voir le playbook, semaine 1.

*Vérifier la disponibilité et le format exact des jeux de données au moment de la constitution du fichier, ainsi que les conditions de réutilisation (licence ouverte) et les obligations RGPD sur les contacts.*

---

## Sources

- [EGalim : la restauration collective sert 27,5 % de produits durables selon « Ma Cantine » (Restauration21)](https://www.restauration21.fr/restauration21/2024/03/egalim-la-restauration-collective-sert-27-de-produits-durables-selon-ma-cantine.html)
- [Egalim : rapport de la campagne 2024 sur les données d'achat 2023 (Restauration21)](https://www.restauration21.fr/restauration21/2024/12/egalim-le-rapport-de-la-campagne-2024-sur-les-donn%C3%A9es-dachat-2023-de-produits-durables-est-sorti.html)
- [La bio en restauration en 2024 : progression en valeur, stagnation en part de marché (Pleinchamp)](https://www.pleinchamp.com/actualite/la-bio-en-restauration-en-2024-progression-en-valeur-stagnation-en-part-de-marche)
- [Chiffres du bio 2024 — Agence Bio (PDF)](https://www.agencebio.org/wp-content/uploads/2025/06/CP_Presentation-des-chiffres-du-bio2024_Agence-BIO.pdf)
- [Les 5 points essentiels de la loi EGalim en restauration collective — ma cantine](https://ma-cantine.agriculture.gouv.fr/blog/25/)
- [Télédéclaration des achats 2024 ouverte jusqu'au 31 mars 2025 — Ministère de l'Agriculture](https://agriculture.gouv.fr/restauration-collective-la-campagne-de-teledeclaration-des-achats-de-denrees-2024-est-ouverte)
- [Le marché de la restauration collective — Xerfi](https://www.xerfi.com/presentationetude/le-marche-de-la-restauration-collective_SCO42)

*Chiffres à réactualiser à chaque campagne « ma cantine » (publication annuelle). Données ouvertes exploitables sur ma-cantine.agriculture.gouv.fr et data.gouv.fr.*
