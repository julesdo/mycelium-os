# Letikette — note à l'attention d'un avocat

**Objet :** validation d'un registre de paramètres juridiques et avis sur un positionnement.
**Nature de la mission :** livrable borné, chiffrable. Ce n'est pas une mission de conseil ouverte.

---

## 1. Ce qu'est Letikette, en une page

Letikette est un **logiciel de calcul financier et de préparation documentaire** destiné aux
entreprises qui ont des factures impayées.

Il lit les factures d'une entreprise, surveille leurs échéances, et calcule ce qui est dû : le
principal, les intérêts de retard au taux légal applicable, et l'indemnité forfaitaire de
recouvrement. Il alerte quand un délai de prescription approche.

**Il ne fait rien d'autre.** En particulier, dans sa version actuelle :

- Il n'envoie **aucun courrier au débiteur**. Il rédige des projets que le créancier envoie
  lui-même, depuis sa propre adresse, sous sa propre signature.
- Il ne **manie aucun fonds**. Aucun encaissement, aucun séquestre, aucune commission sur les sommes
  recouvrées. L'argent va du débiteur au créancier, directement.
- Il ne **recommande aucune procédure**. Il énonce des constats — « cette créance remplit les
  conditions X, Y, Z » — et jamais « vous devriez engager telle action ».

Ces trois limites ne sont pas des intentions : elles sont **encodées dans le produit** et vérifiées
par des tests automatisés qui font échouer la construction du logiciel si elles sont franchies.

## 2. Pourquoi nous vous écrivons

Le produit contient aujourd'hui **quinze valeurs juridiques** — taux, délais, montants, mentions.
Chacune est enregistrée dans un fichier unique avec sa **source**, sa **date de relevé**, et deux
indicateurs :

| Indicateur | Signification | Ce qu'il autorise dans le logiciel |
|---|---|---|
| `verifie` | La valeur a été relevée sur une source publique citable | **Calculer et afficher.** Un chiffre affiché à l'écran se corrige au rendu suivant. |
| `valideParAvocat` | Un juriste a contrôlé la valeur **et son applicabilité** | **Produire une pièce.** Un chiffre écrit dans une requête déposée au greffe ne se corrige pas. |

**Aujourd'hui, le second indicateur vaut `false` sur les quinze entrées.** Le logiciel refuse en
conséquence de produire la moindre pièce destinée à une juridiction ou à un commissaire de justice.
Ce n'est pas un choix commercial : c'est une barrière technique, et elle est levée par votre
signature, entrée par entrée.

## 3. Comment le droit est traité dans le code

Trois règles, parce qu'elles conditionnent la qualité de ce que vous relirez.

**Aucune valeur juridique n'est écrite en dur dans le logiciel.** Tout vit dans un registre unique.
Un test automatisé interdit qu'une référence d'article apparaisse ailleurs — y compris dans un écran
ou dans un courriel.

**Rien n'est deviné, même de mémoire.** Un numéro d'article inventé recopié dans un courrier au
débiteur serait plus dangereux qu'une source absente, parce qu'il aurait l'air vérifiable. Lorsqu'une
source manque, la valeur reste vide et le logiciel refuse de calculer en le disant.

**Les valeurs sont recoupées entre elles.** Les taux d'intérêt légal semestriels sont vérifiés contre
les planchers publiés indépendamment — une multiplication qui doit tomber juste. Ce contrôle croisé
attrape une faute de frappe qu'une simple relecture laisserait passer.

## 4. Ce que nous vous demandons

### A. Contrôler cinq entrées déjà relevées

Non pas les chercher : les **contrôler**, valeur et applicabilité au cas d'usage décrit.

| Entrée | Source relevée par nos soins |
|---|---|
| Taux d'intérêt de retard applicable à défaut de stipulation | Article L441-10 II du code de commerce |
| Taux contractuel minimal (trois fois le taux d'intérêt légal) | Article L441-10 II du code de commerce |
| Indemnité forfaitaire de recouvrement de 40 € | Article D441-5 du code de commerce |
| Délai de prescription commerciale de droit commun | Article L110-4 du code de commerce |
| Régimes de prescription spéciaux plus courts retenus | L110-4, L133-6 (transport de marchandises), L218-2 du code de la consommation |

Le registre s'exporte tel quel, avec pour chaque entrée sa source, sa date de relevé et la note
d'application que nous avons rédigée.

### B. Nous indiquer six sources que nous n'avons pas trouvées

Ou nous confirmer qu'elles n'existent pas encore.

1. Les **mentions obligatoires** de la requête en injonction de payer.
2. Le **délai de contestation** applicable à la procédure dite L.126.
3. Le **tarif du commissaire de justice** pour cette même procédure.
4. Le **délai du procès-verbal de non-contestation**.
5. Le **délai de signification** d'une injonction de payer, à peine de caducité.
6. L'état de publication du **décret d'application de la procédure L.126**.

### C. Répondre à quatre questions fermées

Elles conditionnent des choix de conception, et nous ne les trancherons pas nous-mêmes.

**Question 1.** L'indemnité forfaitaire de 40 € et les intérêts de retard restent-ils réclamables sur
une facture dont le principal a **déjà été payé**, et dans quelle limite de temps ?
*Enjeu : le produit propose au client un bilan rétrospectif de ce qu'il n'a pas réclamé. La réponse
détermine s'il porte sur les seules factures impayées ou aussi sur les factures payées en retard.*

**Question 2.** La formulation « cette créance remplit les conditions X, Y, Z de la procédure P »
constitue-t-elle un **constat** ou un **conseil juridique** ?
*Enjeu : c'est la formulation de tout le produit. Nous avons proscrit « nous vous conseillons de » et
« vous devriez » ; nous voulons savoir si la formulation retenue suffit.*

**Question 3.** Un logiciel qui rédige un **projet** de mise en demeure citant les articles
applicables, que le créancier envoie lui-même depuis sa propre adresse, exerce-t-il une activité de
recouvrement de créances pour le compte d'autrui ?
*Enjeu : c'est la frontière que nous avons tracée pour rester hors du champ de l'activité réglementée
tant que nous n'y sommes pas déclarés.*

**Question 4.** Une appréciation de complétude documentaire formulée en termes factuels — « trois des
quatre pièces attendues sont absentes » — est-elle un constat opposable ou une appréciation
juridique ?
*Enjeu : le produit note la solidité d'un dossier. Nous voulons être sûrs de la formulation.*

### D. Un avis écrit sur le positionnement

Au regard de l'exercice illégal du droit. Nous préférons l'obtenir **avant d'être visibles** plutôt
qu'après une première contestation.

Notre argumentation, que vous êtes libre de contredire : le logiciel est **déterministe**. Il
n'apprécie rien et n'invente aucune règle. Il applique des grilles de lecture issues de sources
publiques, et il **refuse de produire une pièce** lorsque le dossier est incomplet — il se retient là
où un conseil pousserait.

## 5. Ce que nous ne vous demandons pas

- **Pas d'audit du logiciel.** Le code n'est pas l'objet ; les valeurs juridiques le sont.
- **Pas de rédaction d'actes.** Nous ne produisons aucune pièce sans votre validation préalable, et
  nous n'entendons pas nous substituer à un avocat sur les dossiers de nos clients.
- **Pas de responsabilité sur les décisions de nos clients.** La décision d'engager une action
  appartient au chef d'entreprise. Le logiciel mesure et documente ; il ne décide pas.

## 6. Ce que la mission devient ensuite

Cette première intervention est bornée. Si elle se passe bien, il y a une suite naturelle, et nous
préférons l'annoncer :

- **À chaque semestre**, la série de taux s'allonge d'une valeur. Contrôle court et récurrent.
- **À chaque nouvelle procédure** intégrée au produit, ses conditions et ses délais à valider.
- **À chaque nouveau pays** — l'architecture du logiciel est prévue pour en accueillir d'autres, et
  chacun demandera un juriste de son ressort. Le vôtre resterait la France.
- **Le moment venu**, le régime applicable à l'activité de recouvrement amiable pour compte de tiers,
  que nous envisageons d'exercer ultérieurement sous le statut requis. Cette étape n'est pas dans le
  périmètre de la présente demande.

## 7. Ce qui rend cette mission facile à chiffrer

Les valeurs sont **déjà relevées, sourcées et datées**. Vous ne cherchez pas, vous contrôlez. Les
questions sont **fermées** et au nombre de quatre. Le livrable est **une liste de validations et un
avis**, pas un rapport.

Nous sommes à votre disposition pour vous transmettre le registre complet et une démonstration du
produit.
