# Le parcours compagnon : analyse du 8 octobre 2026

> Demande du fondateur : « l'application doit être un assistant, voire un compagnon, qui rassure
> le gérant et lui fait dire *c'est géré* en cas d'impayé. Là, l'utilisateur doit tout faire :
> c'est la même chose, voire en moins bien, que de faire appel à un avocat. » Analyser les
> parcours des applications comparables pour comprendre ce qui manque, et sortir de l'effet
> « prise de notes, étapes et documents à renseigner partout ».

---

## 0. La réponse courte

**Letikette est aujourd'hui un établi, pas un compagnon.** Il calcule juste, il surveille la
prescription, il compose des lettres exactes. Mais c'est le gérant qui pilote chaque dossier :
il l'ouvre, il répond aux questions, il choisit le modèle et ses réglages, il imprime, il poste,
il revient dire que c'est parti, il se pose un rappel, il note ses appels, il rapproche ses
virements. Un avocat fait l'inverse : on lui confie le dossier une fois, et il revient vers vous
quand il faut signer ou décider.

**Ce qui manque n'est pas une fonctionnalité, c'est un sujet.** Dans toute l'application, les
phrases ont pour sujet le gérant, à l'impératif : « Lancer un dossier », « Préparer », « Noter »,
« Déclarer », « Me le rappeler ». Aucune n'a pour sujet le logiciel, au futur. Les applications
qui « gèrent pour vous » parlent toutes ainsi : *« le vendeur a jusqu'au 21 ; s'il n'a pas
expédié, nous annulons automatiquement le 22 »* (Vestiaire Collective), *« nous revenons vers vous
d'ici le 21 août »* (Cash App).

**Trois déplacements suffisent, et aucun ne touche la ligne rouge n° 1 :**

1. **Le logiciel démarre seul.** Une facture échue entre d'elle-même dans le plan de son client.
   Plus de « Lancer un dossier ».
2. **Il tient un plan daté pour chaque client, et le dit.** Chaque lettre est préparée au bon jour,
   avec ses réglages déjà choisis, et chaque carte annonce la suite : « Mise en demeure prête le
   22 oct. si rien n'arrive. »
3. **Le gérant n'a plus que des signatures et des réponses qu'aucun document ne donne.** Un geste
   par lettre, le matin, dans une pile ; les questions posées juste avant l'étape qui les exige,
   pas en tête de dossier.

La ligne rouge tient telle qu'elle est : rien ne part sans que le gérant ait validé le document.
Ce qui change, c'est que **valider devient son seul travail**.

---

## 1. Ce que le gérant fait lui-même aujourd'hui

Relevé dans le code le 08/10/2026, écran par écran, pour un premier dossier mené jusqu'à la mise
en demeure.

| Moment | Ce que fait le logiciel | Ce que fait le gérant |
|---|---|---|
| **Mise en route** | Lit les factures (dépôt ou connexion), pré-remplit capital, RCS et greffe depuis le BODACC | Confirme ou saisit **7 informations** avant la première lettre : adresse du siège, e-mail pour les réponses, nom et fonction du signataire, SIREN, capital, inscription au RCS, ville du greffe (`gabarits/`, liste des `manques`) |
| **Par client** | Propose six candidats au registre, par le nom | Choisit le bon, puis confirme **adresse, SIREN, forme juridique** de chaque client à relancer |
| **Ouvrir un dossier** | Coche d'avance les factures échues | Va sur la fiche **de chaque client** et touche « Lancer un dossier ». **Aucun dossier ne naît seul** |
| **Qualifier** | Propose une réponse quand un document la porte (7 propositions par jour au plus) | Répond aux **6 questions de litige** du dossier (contestation écrite, refus, avoir réclamé, pénalités opposées, instance en cours, reconnaissance écrite) |
| **Écrire** | Compose le texte, montre l'aperçu | Choisit **1 modèle parmi 6**, puis **4 à 8 réglages** (délai, suite, modalité, réserve…), relit, valide (un administrateur) |
| **Envoyer** | Produit un PDF ou un brouillon de messagerie | **Imprime, met sous pli, poste en recommandé**, puis revient déclarer « c'est parti ». Le chantier A (Maileva, AR24) attend trois comptes |
| **Attendre** | Remonte le dossier dans la file quand une date tombe | Doit **se poser un rappel** pour savoir quand revenir : rien n'annonce la suite |
| **Suivre** | Garde ce qu'on lui dit | **Note** ses appels, ses échanges, les promesses (module de suivi du 29/09) |
| **Encaisser** | Montre le virement reçu | **Rapproche à la main** chaque virement : « De qui ? » |
| **Escalader** | Arrête le décompte, propose des professionnels près du client | Coche **3 cases** à l'arrêt, choisit un avocat ou un commissaire, déclare la remise |

**Environ trente gestes et un passage à la Poste** pour un seul dossier, dont une douzaine de
saisies que le logiciel sait déjà faire ou pourrait faire. Et rien de tout cela ne se déclenche
si le gérant n'ouvre pas l'application.

C'est l'« effet prise de notes » que tu décris : l'application est le **carnet** du gérant, pas
son **clerc**. Le module de suivi (notes, échanges, promesses, rappels), livré le 29/09 pour que
le travail se fasse dans l'application, a accentué l'effet : il a donné au gérant un endroit où
consigner, pas quelqu'un qui consigne pour lui.

---

## 2. Ce que font les applications qui « gèrent pour vous »

Six motifs reviennent, chez les logiciels de relance comme chez les applications grand public qui
font une démarche à la place de leur utilisateur.

### M1. Le plan daté, au futur, avec « nous » pour sujet

- [Vestiaire Collective](https://mobbin.com/screens/984bf280-8384-4125-8136-360fc80eddf2) :
  « En attente de l'expédition. Le vendeur a jusqu'au dimanche 21 juin. S'il n'expédie pas à
  temps, nous annulerons automatiquement la commande le lundi 22 et vous rembourserons. »
- [Cash App](https://mobbin.com/flows/ed196adf-a6fd-47a1-bd5f-75f3a3f112a3), après un
  signalement : « En cours d'examen. Nous revenons vers vous d'ici le 21 août », et une frise à
  deux points, le second **daté dans le futur** (« mise à jour prévue »).
- [Fiverr](https://mobbin.com/screens/73c261e9-f7a5-49c3-a51e-629af65dc043) : la livraison prévue
  en compte à rebours, « Me prévenir », « Ajouter au calendrier ».

**Ce que ça donne chez nous :** chaque carte et chaque fiche disent la prochaine étape, sa date,
et ce qui se passera si rien ne bouge. La frise du dossier continue **après aujourd'hui**.
Aujourd'hui la nôtre s'arrête au présent.

### M2. Le scénario prêt à l'emploi, appliqué sans qu'on crée rien

- [Chaser](https://www.chaserhq.com/features/payment-portal) se branche sur le logiciel comptable
  et relance toutes les factures échues par e-mail et SMS, avec un portail de paiement ; le
  paiement reçu est **marqué payé tout seul**.
- [Paidnice](https://www.capterra.com.au/software/1032423/paidnice) applique d'office les
  pénalités et frais de retard, les rappels, les relevés et les escalades, sur Xero et
  QuickBooks.
- Un scénario type des outils français (Upflow, Agicap, Libeo, Sidetrade), cité par
  [Kolonell](https://kolonell.com/fr/blog/automatisation-relances-factures-impayees-pme-2026) :
  rappel courtois avant l'échéance, première relance juste après, deuxième, troisième, puis
  mise en demeure en recommandé.
- [Revolut Business](https://mobbin.com/flows/2de34c24-f181-4b9a-86a1-314c212094b9) : **un
  interrupteur** « Rappels automatiques » dans les réglages de facturation, c'est tout.

**Ce que ça donne chez nous :** un plan par défaut, choisi pour le gérant à la mise en route, qui
s'applique à toute facture échue. Il l'ajuste s'il veut, il n'a pas à le construire.

### M3. Préparé par un autre, approuvé par vous

- [Revolut Business](https://mobbin.com/flows/1ab1004a-0d7a-4b2f-bfed-8101a3c6d8a5) : une demande
  préparée par un collaborateur, une frise d'approbation, deux boutons, « Approuver » et
  « Rejeter ».
- [Airwallex](https://mobbin.com/flows/b50c8a2b-97ab-45e4-ace2-105ebd53a2c0) : « Mes tâches »,
  une carte par catégorie, et « Vous êtes à jour » sous celles où il n'y a rien.
- [YNAB](https://mobbin.com/flows/50808b84-7bf6-4f70-a2c5-1236186c450a) : « Approuver ou classer
  les nouvelles opérations », une à une, puis « Vous avez tout fait ! ».

**C'est notre ligne rouge n° 1 vue du bon côté.** Le logiciel est le collaborateur qui prépare,
le gérant est l'approbateur. Ni Revolut ni Airwallex ne demandent à l'approbateur de remplir la
demande.

### M4. Le rapprochement automatique, confirmé d'un geste

- [Brex](https://mobbin.com/screens/089cee58-b6b1-4bea-b028-d413aef5b694) : « Bien joué ! Nous
  avons associé vos reçus à ces dépenses. »
- Chaser : le paiement qui arrive par le portail est marqué payé sans intervention.

**Ce que ça donne chez nous :** quand la banque est connectée (Qonto existe, Chift dort sans clé),
le virement est rapproché par le logiciel et le gérant confirme : « Durand a payé 3 120 €, c'est
bien la facture F-077 ? ». Le plan de Durand s'arrête de lui-même.

### M5. Le silence qui rassure

- [ClickUp](https://mobbin.com/screens/a87c2506-7d30-4e84-9e1c-e4244d91878c) « Inbox Zero »,
  [Airwallex](https://mobbin.com/flows/b50c8a2b-97ab-45e4-ace2-105ebd53a2c0) « Vous êtes à
  jour », YNAB « Vous avez tout fait ».

L'absence de tâche **se dit**, et elle se mérite : elle n'existe que parce que le logiciel a fait
le reste. Chez nous, « Rien à trancher aujourd'hui » existe, mais il dit seulement qu'il n'y a pas
de question ; il ne dit pas ce qui a été fait ni ce qui vient.

### M6. La délégation, quand ça se complique

- [Rocket Money](https://mobbin.com/flows/55aae982-c8ab-4f0c-a671-4b6453eeb8f0) : « Nous
  négocions pour vous ; si nous n'économisons rien, vous ne payez rien. »
- [Rubypayeur](https://rubypayeur.com/guide/recouvrement/amiable) : phase amiable, puis une
  injonction de payer proposée au créancier si rien ne bouge.

**Ce que ça donne chez nous :** au bout du plan amiable, la remise à un avocat se propose d'un
geste, dossier complet (elle existe : `declarerRemise`, `ChoixIntervenant`). Ce qui manque, c'est
qu'elle arrive **comme l'étape suivante du plan**, pas comme une page qu'on va chercher.

---

## 3. Pourquoi l'application donne l'effet « prise de notes »

1. **Le sujet des phrases.** Tous les boutons s'adressent au gérant, à l'impératif. Aucune phrase
   ne dit ce que le logiciel va faire.
2. **Rien ne démarre sans lui.** Pas de dossier sans « Lancer », pas de lettre sans « Préparer »,
   pas de suite sans « Me le rappeler ».
3. **On lui demande tout, tout de suite.** Les six questions de litige s'affichent dans le
   dossier dès qu'il existe, alors qu'elles ne servent qu'avant une mise en demeure ou un acte. Le
   profil complet est exigé avant la première lettre.
4. **La mémoire est à remplir.** Le journal du dossier est fait de ce que le gérant note. Les
   faits que le logiciel connaît (lettre préparée, validée, délai expiré, paiement reçu) devraient
   s'y écrire seuls, et la note devenir l'exception.
5. **La fin du parcours sort de l'application.** Imprimer, poster, revenir déclarer.

---

## 4. Le parcours cible : « vous signez, Letikette fait le reste »

### 4.1 Brancher, une fois

La connexion au logiciel de facturation ou à la banque, ou un dépôt. Le profil se remplit depuis
le registre, et le gérant le confirme **sur une seule feuille** : « C'est bien votre entreprise ?
C'est vous qui signez ? ». Le plan par défaut est posé pour lui ; il pourra l'ajuster plus tard.

### 4.2 Tout démarre seul

Le lendemain de son échéance, chaque facture entre dans le plan de son client. Un dossier existe
dès qu'il y a une facture échue. Le gérant peut **exclure** un client (« Ne pas relancer : client
à ménager »), c'est le seul geste de cette étape, et il est facultatif.

### 4.3 Le matin : des signatures, pas des formulaires

« 3 lettres prêtes aujourd'hui. » Une pile : une lettre par écran, ses réglages déjà choisis par
le plan, « Valider » passe à la suivante (le geste de YNAB et de Revolut Business). Chaque lettre
est relue et validée une par une : c'est la ligne rouge n° 1, et elle ne coûte plus qu'un toucher.

Les questions de litige sont posées **dans cette pile, juste avant la lettre qui en dépend** :
« Avant la mise en demeure de Durand : vous a-t-il contesté une facture par écrit ? ». Une
question qu'aucune étape n'exige encore n'est pas posée.

Une fois le chantier A ouvert, « Valider » devient « Valider et envoyer » (recommandé électronique
ou papier). D'ici là, « Imprimer les 3 », en un seul fichier.

### 4.4 Entre deux : le plan visible

Chaque carte dit la suite : « Prochaine étape : mise en demeure le 22 oct., prête la veille. » La
fiche du client porte une frise **qui continue après aujourd'hui**, comme Cash App et Vestiaire
Collective. Le rappel qu'on se pose soi-même devient rare : le plan est le rappel.

### 4.5 Quand l'argent arrive

Rapprochement par le logiciel, confirmation d'un geste, le plan du client s'arrête de lui-même, et
une feuille de réussite : « Durand a payé 3 120 € ». Le gérant voit l'argent rentrer, ce qu'il
achète d'abord.

### 4.6 Ce qui rassure, en continu

- **Le journal tenu par le logiciel** : chaque fait s'écrit seul, daté. La note reste possible,
  elle n'est plus le cœur.
- **L'accueil qui dit ce qui a été fait** : « Rien à signer aujourd'hui. 12 dossiers suivis,
  prochaine lettre mardi. »
- **Le mot du lundi** (le briefing par courriel existe, `battement.ts`) : « Cette semaine :
  4 lettres parties, 2 400 € rentrés. Aucune date limite ne passe dans les 30 jours. »

---

## 5. La frontière juridique : la seule vraie décision

**La ligne actuelle** (29/09, CLAUDE.md, ligne rouge n° 1) : rien ne part sans que le gérant ait
validé le document, et pas d'envoi automatique même pré-autorisé, au motif du décret n° 96-1112
(recouvrement amiable pour le compte d'autrui).

**Le parcours cible ci-dessus fonctionne sans y toucher.** Le logiciel prépare tout, le gérant
signe d'un geste. Le prix : un passage par jour dans l'application quand il y a quelque chose à
signer.

**Mais le marché français lit la règle autrement.**
[Pennylane](https://www.pennylane.com/fr/toutes-nos-fonctionnalites) et
[Qonto](https://qonto.com/fr-be/invoicing) proposent des relances automatiques des factures
impayées, comme Upflow : ils considèrent manifestement que le créancier agit pour lui-même à
travers un outil. Notre lecture est plus prudente que la leur.

**La question à poser à un avocat, et elle seule :** un **rappel courtois avant mise en
demeure**, envoyé depuis la messagerie du gérant, à son nom, selon un plan qu'il a approuvé une
fois, fait-il de Letikette un agent de recouvrement au sens du décret ? Si la réponse est non, les
premières étapes du plan passent en automatique, et seule la mise en demeure reste signée à la
main. Le parcours ne change pas, seul un réglage s'ajoute. C'est le plus gros levier du « c'est
géré », et c'est une heure de consultation.

---

## 6. Ce que je propose de construire, dans l'ordre

Chaque lot nomme le geste manuel qu'il supprime et ce qu'il change pour le dirigeant (principe
anti-dérive).

| Lot | Contenu | Geste supprimé | Ce que ça change pour le dirigeant |
|---|---|---|---|
| **P1** | **Le plan par défaut et la prochaine étape datée** sur chaque carte, chaque fiche et la frise du dossier | Se poser un rappel ; compter le délai de tête | Il sait ce qui va se passer et quand, sans ouvrir le dossier |
| **P2** | **Les dossiers qui naissent seuls** : facture échue → dossier du client ; exclusion d'un client en un geste | « Lancer un dossier » pour chaque client | Zéro geste entre la connexion et le premier dossier suivi |
| **P3** | **La pile du matin** : lettres préparées au bon jour par le plan, validées une à une d'un toucher ; questions de litige posées juste avant l'étape qui les exige | Choisir le modèle et 4 à 8 réglages par lettre ; 6 questions en tête de dossier | Un geste par lettre, une question seulement quand elle sert |
| **P4** | **Le journal tenu par le logiciel** et **l'accueil qui dit ce qui est fait** ; le mot du lundi | Noter ce que le logiciel sait déjà | Il est rassuré sans rien lire de plus |
| **P5** | **Le rapprochement automatique** quand la banque est connectée, confirmé d'un geste ; le plan s'arrête seul | « De qui ? » à chaque virement | Il voit l'argent rentrer, et personne n'est relancé pour ce qu'il a payé |
| **P6** | *(bloqué, chantier A)* **Valider et envoyer** d'un geste | Imprimer, poster, déclarer « c'est parti » | La boucle se ferme dans l'application |
| **P7** | *(à toi)* **Avis d'avocat** sur l'envoi automatique des rappels courtois | Valider chaque rappel courtois | Le « c'est géré » complet pour les premières étapes |

**Cible mesurable :** zéro saisie pour qu'un dossier soit suivi, **un geste par lettre**, et une
question de litige posée seulement à l'étape qui l'exige. Aujourd'hui : environ trente gestes par
dossier jusqu'à la mise en demeure (§ 1).

**Ce que je ne propose pas :** confier ce travail à l'assistant conversationnel. Un compagnon
n'est pas une fenêtre de discussion ; c'est un plan qui avance seul et une voix qui dit ce qu'elle
fait. L'assistant reste là pour expliquer un chiffre.

---

## 7. Sources

- Parcours Mobbin cités en § 2 (liens dans le texte).
- [Chaser, portail de paiement et relances](https://www.chaserhq.com/features/payment-portal)
- [Paidnice, fiche Capterra](https://www.capterra.com.au/software/1032423/paidnice)
- [Kolonell, scénario de relance type des outils PME](https://kolonell.com/fr/blog/automatisation-relances-factures-impayees-pme-2026)
- [Pennylane, fonctionnalités](https://www.pennylane.com/fr/toutes-nos-fonctionnalites)
- [Qonto, facturation](https://qonto.com/fr-be/invoicing)
- [Rubypayeur, recouvrement amiable](https://rubypayeur.com/guide/recouvrement/amiable)
- [Décret n° 96-1112 du 18 décembre 1996](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000380917)
- Inventaire de l'application : `src/lib/verticales/recouvrement/gabarits/` (les `manques`),
  `litige.ts` (`QUESTIONS_LITIGE`), `ui/courriers.tsx` (`ChoixCourrierAffiche`),
  `ui/suivi-dossier.tsx`, `ui/lettrage.tsx`, `screens/arret.tsx`.
