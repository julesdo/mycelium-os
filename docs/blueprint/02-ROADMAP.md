# Roadmap — d'aujourd'hui à cinq ans

**Point de départ : 3 septembre 2026.** Production en ligne, zéro client, moteur de calcul construit
et vérifié, aucune automatisation.

**Le principe qui structure tout : chaque phase achète le droit à la suivante.** On ne saute pas un
barreau. La Phase 1 gagne les données et la confiance qui rendent la Phase 2 vendable ; la Phase 2
gagne les flux qui rendent la Phase 3 possible. Court-circuiter l'ordre, c'est demander un agrément
sans dossier et une licence bancaire sans volume.

---

## Ce qui ne s'accélère pas

Le développement n'est plus la contrainte. Ces quatre choses le restent, et **elles définissent le
chemin critique** :

| Contrainte | Pourquoi elle résiste | Quand elle démarre |
|---|---|---|
| **La signature du juriste** | `valideParAvocat` vaut `false` partout. Aucun acte ne sort sans elle. | **Jour 1** |
| **Les sources manquantes** | Mentions obligatoires de la requête en injonction : introuvables. Décret L.126 : non publié. On ne code pas autour, on ne devine pas. | Jour 1 |
| **Les validations de partenariat** | Pennylane, Dext, une étude de commissaires de justice. Délais qui ne nous appartiennent pas. | Jour 1 |
| **Un dirigeant qui change sa façon de travailler** | Aucun agent ne compresse ça. | Au premier pilote |

**Les trois premières démarrent le jour 1, en parallèle du code.** Elles sont les vraies échéances
du plan ; le reste est du travail qu'on maîtrise.

---

# Phase 0 — Le radar

**Septembre → décembre 2026.** Le produit travaille la nuit, et quelqu'un paie.

### Ce qu'on construit

Modules 1, 2, 3 et 4 sauf le brief exécutoire, plus les cinq mécaniques d'accroche. Voir
`01-FRONTIERE-MVP.md`.

### 🏁 Jalon J1 — Le premier euro

Un client paie pour ne plus perdre. **Critère de franchissement :** un paiement encaissé, pas une
lettre d'intention.

### Rétro-planning

| Quand | Ce qui doit être vrai |
|---|---|
| **Semaine 1** | Le juriste est contacté et le périmètre du forfait est écrit. La demande Pennylane est déposée. Une clé API Sirene est obtenue. |
| **Semaine 2-4** | Le battement quotidien tourne : recalcul, notification, briefing du matin. L'ingestion par e-mail dédié fonctionne. |
| **Semaine 4-6** | Le radar BODACC coupe les relances sur procédure collective. La normalisation SIRET tourne. Le choc du premier import est à l'écran. |
| **Semaine 6-8** | Les relances en trois niveaux, le solveur de lettrage, le scoring comportemental. Premiers pilotes en usage réel. |
| **Semaine 8-12** | Correction sur usage réel. **Premier euro.** |

### Les murs

**M1 — Le juriste.**
*Le problème :* sans signature, aucun acte ne sort, et la moitié de la valeur perçue reste
verrouillée.
*La piste :* ne pas ouvrir une mission de conseil ouverte, mais commander un **livrable borné** — la
validation d'un registre de quinze valeurs déjà relevées et sourcées. C'est une relecture, pas une
recherche : ça se forfaitise et ça se chiffre. Le brief est prêt dans `D-JURIDIQUE.md`.

**M2 — L'accès aux registres.**
*Le problème :* le radar de solvabilité et la normalisation SIRET dépendent de données externes.
*La piste :* Sirene (INSEE) et BODACC sont ouverts et gratuits. Infogreffe est payant — on s'en passe
au départ, les deux premiers suffisent au coupe-circuit. Vérifier les quotas d'appel avant de
construire dessus.

**M3 — La confiance.**
*Le problème :* aucun dirigeant ne branche sa comptabilité à un inconnu.
*La piste :* le bilan payant d'abord. Il livre de la valeur **avant** de demander un accès permanent,
et il se vend seul : « voici ce que vous auriez pu réclamer l'an dernier ». C'est le choc du premier
import transformé en produit d'appel.

---

# Phase 1 — Le SaaS autonome

**Décembre 2026 → fin 2027.** Le drapeau s'ouvre : le produit passe de radar à chaîne complète.

### Ce qui se débloque

Le jour où le juriste signe, `exigerPourActe()` cesse de refuser : le brief exécutoire, le routage
vers le tribunal compétent et la transmission au commissaire de justice s'ouvrent **sans une ligne de
code de plus**. Pennylane et Dext arrivent quand leurs validations arrivent.

### 🏁 Jalon J2 — Le premier titre exécutoire obtenu grâce à Letikette

**Le moment de preuve du projet entier.** De l'argent rentre dans une entreprise à cause d'un dossier
monté par le logiciel. Tout le marketing de l'année suivante en découle : on cesse de vendre une
promesse, on montre un résultat.

### 🏁 Jalon J3 — 100 k€ d'ARR

### Les murs

**M4 — Le Conseil National des Barreaux.**
*Le problème :* menace de plainte pour exercice illégal du droit. Les avocats défendront leur
monopole sur la qualification des litiges.
*La piste :* l'architecture déterministe est la défense de fond — les algorithmes n'inventent pas de
droit, ils appliquent des grilles de lecture publiques. Mais la défense de fond ne suffit pas dans
l'urgence : **obtenir un avis juridique écrit sur le positionnement avant d'être visible**, pas après
la première plainte. Un avis qu'on brandit vaut mieux qu'un avis qu'on cherche.

**M5 — Le cartel des commissaires de justice.**
*Le problème :* leurs logiciels métiers sont trop archaïques pour absorber du JSON, et la profession
n'a aucun intérêt à industrialiser les petites créances.
*La piste :* ne pas convertir la profession. **Cinq à dix études technophiles, exclusives**, à qui on
envoie tout le volume qualifié. Elles ont un intérêt économique direct à nous absorber, et elles
deviennent prescriptrices.

**M6 — Le « build vs buy » des ERP.**
*Le problème :* Pennylane ou Cegid coupent l'accès pour développer leur propre module de relance.
*La piste :* la profondeur métier. Un ERP saura relancer à J+30. Il ne saura jamais segmenter un
décompte sur trois taux BCE successifs avec un acompte partiel au milieu, ni arbitrer une
prescription sectorielle, ni refuser de produire un acte sur un dossier incomplet. C'est déjà écrit
et testé, et c'est inclonable par une équipe généraliste. **Corollaire stratégique :** viser à devenir
leur fournisseur (Phase 4, marque blanche) plutôt que leur concurrent.

**M7 — Le directeur commercial qui protège son client.**
*Le problème :* le logiciel marche, mais le commerce force la finance à désactiver l'automatisation
de peur de froisser un bon client.
*La piste :* les scénarios velours — exclure nommément des comptes du processus dur — et surtout
**chiffrer le coût de la complaisance** à l'écran. « Vous avez renoncé à 47 000 € cette année pour
ménager quatre clients » fait plus que n'importe quel argument. On ne gagne pas ce débat par la
technique, on le gagne en le rendant visible.

---

# Phase 2 — L'agence

**2028.** Letikette obtient le statut d'agence de recouvrement amiable et agit au nom du client.

### Ce que ça change

**La ligne rouge 1 tombe.** L'utilisateur ne gère plus l'envoi : il clique sur « déléguer ». L'entité
Letikette prend le relais, avec déclaration à l'autorité compétente, compte séquestre dédié,
assurance de responsabilité civile professionnelle et garantie financière.

> ⚠️ **Les textes exacts, les seuils et les autorités compétentes sont à relever et à sourcer dans
> `D-JURIDIQUE.md`.** Aucun numéro de décret n'est écrit ici de mémoire — c'est précisément la règle
> qui protège le produit.

### 🏁 Jalon J4 — L'agrément obtenu
### 🏁 Jalon J5 — Le premier euro de commission au succès

Le chiffre d'affaires se décorrèle du coût logiciel. L'ARPU se multiplie sur les comptes qui gèrent
des millions d'euros d'encours.

### Les murs

**M8 — Le changement de nature de l'entreprise.** *Le mur le plus sous-estimé.*
*Le problème :* passer de « logiciel » à « opérateur » n'est pas une fonctionnalité. Il faut des
humains qui traitent des dossiers, répondent au téléphone à des débiteurs en colère, négocient des
échéanciers. **La marge logicielle se dilue dans du service**, et l'entreprise cesse d'être ce
qu'elle était.
*La piste :* n'ouvrir la délégation **qu'au-dessus d'un seuil de montant**, là où la commission paie
largement l'humain, et laisser tout le reste en self-service. Le seuil se calcule, il ne se devine
pas : coût horaire chargé × heures moyennes par dossier ÷ taux de commission.

**M9 — Le conflit avec la base Phase 1.**
*Le problème :* certains clients travaillent déjà avec un cabinet de recouvrement, dont nous devenons
le concurrent.
*La piste :* la délégation reste optionnelle, **dossier par dossier**. On ne bascule jamais un compte
entier, et on ne démarche jamais contre un cabinet en place.

**M10 — Le coût fixe avant le premier euro.**
*Le problème :* assurance et garantie financière tombent avant la première commission.
*La piste :* ne déclencher la démarche d'agrément qu'une fois le volume de la Phase 1 suffisant pour
que le calcul soit fait — le dossier d'agrément se construit avec des chiffres réels, ce qui le rend
aussi plus solide.

---

# Phase 3 — L'infrastructure financière

**2029 → 2030.** La néobanque B2B.

### Ce que ça change

**La ligne rouge 2 tombe.** Letikette devient **agent d'un établissement de paiement** (type Swan,
Treezor) plutôt qu'établissement en propre : c'est le raccourci réglementaire qui évite des années
d'agrément et transfère l'essentiel des obligations au partenaire.

Les fonds recouvrés atterrissent sur un IBAN au nom du client, hébergé chez Letikette. S'ouvrent
alors : cartes virtuelles et interchange, revenue share sur les frais bancaires, courtage
d'assurance-crédit, avance de trésorerie.

### 🏁 Jalon J6 — Le premier IBAN Letikette ouvert
### 🏁 Jalon J7 — La première facture assurée, puis la première avance de trésorerie

### Pourquoi c'est l'endgame

**L'argent récupéré ne quitte plus l'écosystème.** Un logiciel comptable qui voudrait alors nous
couper l'API se retrouverait à couper le compte bancaire de son propre client. Le rapport de force
s'inverse.

### Les murs

**M11 — LCB-FT et Tracfin.**
*Le problème :* dès qu'on touche des fonds, obligations de vigilance, de gel et de déclaration.
*La piste :* les déléguer au maximum à l'établissement partenaire, qui les porte déjà et dont c'est
le métier. C'est la raison principale du choix « agent » plutôt qu'« établissement ».

**M12 — Le capital de l'affacturage.**
*Le problème :* avancer de la trésorerie suppose de porter le risque.
*La piste :* **ne jamais le porter.** Letikette est l'apporteur, la banque partenaire porte. Revenue
share plutôt que marge d'intérêt. On vend la qualification — qui est notre valeur — pas le crédit.

**M13 — L'immatriculation ORIAS** pour le courtage d'assurance. Démarche administrative bornée, à
lancer un trimestre avant le besoin.

---

# Phase 4 — L'écosystème

**2030 → 2031.**

### 🏁 Jalon J8 — Le second pays

L'architecture le permet déjà : `pays/france/` peut avoir un frère, et le socle ne sait pas quelle
loi il sert — c'est une frontière tenue par un test, pas par une convention. Espagne et Italie
d'abord : délais de paiement longs, donc douleur forte et démontrable.

**Ce que ça coûte vraiment :** un juriste par pays, pas du code. Le module `pays/<pays>/` se remplit,
le reste ne bouge pas.

### 🏁 Jalon J9 — Le premier ERP en marque blanche

L'API de calcul vendue à ceux qui étaient une menace. On cesse d'être un concurrent de Pennylane pour
devenir son fournisseur — c'est la sortie la plus élégante du mur M6.

---

## L'indicateur qui décide de tout

**Ce n'est pas le MRR.** Si la Phase 1 ne retient pas, rien de ce qui suit n'arrive : pas d'agrément
sans volume, pas de banque sans flux.

Le signal avancé à surveiller dès le premier client :

> **Est-ce qu'il ouvre le produit un matin où rien ne brûle ?**

Un outil qu'on ouvre seulement en crise ne devient jamais une infrastructure. C'est pour ça que les
cinq mécaniques d'accroche sont dans le MVP et pas dans un « plus tard ».

## Ce qui pourrait tuer le projet

Nommé honnêtement, pour qu'on le surveille plutôt que de le découvrir.

1. **Le juriste ne signe pas**, ou signe avec des réserves qui vident les procédures de leur intérêt.
   *Mitigation :* le MVP entier vit sous `exiger()` et se vend sans lui. On perd la Phase 1 étendue,
   pas l'entreprise.
2. **Le choc du premier import ne choque pas** — les montants révélés sont trop faibles pour
   déclencher l'achat. *Mitigation :* à mesurer sur les trois premiers pilotes, avant d'écrire la
   page de vente. Si l'amplitude est faible, le produit d'appel change, pas le produit.
3. **La rétention est saisonnière** : on l'ouvre en fin de trimestre et jamais entre. *Mitigation :*
   c'est exactement ce que l'indicateur ci-dessus détecte, et tôt.
4. **Un concurrent bien financé** arrive sur le même angle. *Mitigation :* la profondeur du moteur de
   calcul est une avance qui se compte en années de correction, pas en semaines de code — mais elle
   ne se voit pas depuis l'extérieur, ce qui est à la fois notre protection et notre problème
   marketing. Voir `C-MARKETING.md`.

## La trajectoire financière

Elle vit dans `A-BUSINESS.md`, avec ses hypothèses explicites : nombre de clients, ARPU, taux de
conversion et de rétention. **Un chiffre d'ARR sans le nombre de clients et l'ARPU qui le produisent
est un vœu**, et ce document n'en contient pas.
