# Le blog de Letikette

Un article = un fichier `.mdx` dans ce dossier. Le nom du fichier devient l'adresse :
`penalites-de-retard.mdx` → `letikette.com/blog/penalites-de-retard`.

Rien d'autre à installer ni à configurer : au prochain `git push`, l'article est construit avec le
site et publié. Aucun CMS, aucun compte, aucun coût.

## Écrire un article

Créer un fichier, copier cet en-tête, puis écrire en Markdown en dessous :

```mdx
---
titre: Pénalités de retard entre entreprises, ce que dit la loi
description: Une phrase de 50 à 170 caractères, reprise par Google et sur les réseaux sociaux.
date: 2026-10-06
categorie: La loi
brouillon: true
---

Le premier paragraphe sert d'introduction.

## Un intertitre

Du texte, des **mots en gras**, des [liens](/blog), des listes…
```

| Champ          | Obligatoire | Ce qu'il contient                                                                                                              |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `titre`        | oui         | 10 à 90 caractères.                                                                                                            |
| `description`  | oui         | 50 à 170 caractères : le résumé affiché par Google.                                                                            |
| `date`         | oui         | Date de publication, au format `2026-10-06`.                                                                                   |
| `categorie`    | oui         | `La loi`, `Trésorerie`, `Méthode` ou `Letikette`.                                                                              |
| `misAJour`     | non         | Date de la dernière mise à jour, même format.                                                                                  |
| `auteur`       | non         | « L’équipe Letikette » par défaut.                                                                                             |
| `illustration` | non         | Le motif de la couverture : `facture` (par défaut), `decompte`, `indemnites`, `calendrier`, `relance` ou `paiement`.           |
| `enBref`       | non         | Deux à cinq phrases courtes, affichées en tête : ce que le lecteur retient s'il ne lit que ça.                                 |
| `couverture`   | non         | Une vraie image, seulement si l'article en a besoin : `src` (`/blog/…` ou `/ecrans/…`) et `alt`. Elle remplace l'illustration. |
| `brouillon`    | non         | `true` : visible en local seulement, jamais en ligne. `false` par défaut.                                                      |

Un en-tête mal rempli (titre trop long, date impossible, catégorie inconnue) **fait échouer la
construction du site** avec un message qui dit quel champ corriger : rien de faux ne part en ligne.

Les images vont dans `public/blog/`, de préférence en `.webp`, et s'appellent par `/blog/nom.webp`.

## Les valeurs de la loi : jamais à la main

C'est la règle la plus stricte du projet, et elle vaut ici aussi. On n'écrit ni un taux, ni un
montant, ni un délai, ni un numéro d'article : on écrit le composant, qui lit la valeur relevée
dans les paramètres du logiciel et la met à jour seule.

| On écrit                                            | Ce qui s'affiche (exemple)         |
| --------------------------------------------------- | ---------------------------------- |
| `<TauxDePenalites />`                               | le taux du semestre en cours       |
| `<Indemnite />`                                     | 40 €                               |
| `<DelaiPourAgir />`                                 | 5 ans                              |
| `<DelaiPourAgir regime="TRANSPORT_MARCHANDISES" />` | 1 an                               |
| `<DelaiPourAgir regime="CONSOMMATEUR" />`           | 2 ans                              |
| `<PointDeDepart regime="TRANSPORT_MARCHANDISES" />` | le point de départ du délai        |
| `<ArticleDuCode de="indemnite" />`                  | article D441-5 du code de commerce |

`de` accepte `taux`, `indemnite`, `prescription-general`, `prescription-transport` et
`prescription-consommateur`.

Et un encadré pour ce qu'il faut retenir :

```mdx
<Encadre titre="À retenir">Le texte de l'encadré.</Encadre>
```

## Les couvertures

Chaque article a une couverture illustrée, dessinée dans la DA du site : pas de photo de banque
d'images. Le fond prend la couleur de la catégorie (bleu pour « La loi », lavande pour
« Trésorerie », ciel pour « Méthode », abricot pour « Letikette ») et le motif dit le sujet, choisi
par le champ `illustration`. Les dessins vivent dans `src/marketing/blog-couvertures.tsx` : un
nouveau motif s'y ajoute, puis dans `src/marketing/motifs-blog.ts`.

## Les illustrations

Un schéma par idée difficile, juste à côté du paragraphe qui l'explique. Tous sont calculés à partir
des paramètres et du moteur du logiciel : aucun chiffre n'y est dessiné à la main.

| On écrit                                                                        | Ce qui s'affiche                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `<ExempleDecompte montant={12400} echeance="2026-03-31" arrete="2026-09-30" />` | une facture décomptée par le moteur, période par période                                    |
| `<DelaisParSecteur />`                                                          | les délais pour agir, en barres                                                             |
| `<CompteurIndemnites factures={6} />`                                           | une indemnité par facture, et le total                                                      |
| `<Etapes><Etape titre="…" quand="…">…</Etape></Etapes>`                         | des étapes numérotées                                                                       |
| `<Comparaison titreOui="…" oui={[…]} titreNon="…" non={[…]} />`                 | deux colonnes : ce qui compte, ce qui ne compte pas                                         |
| `<Capture ecran="decompte" legende="…" />`                                      | une capture du logiciel (`aujourdhui`, `file`, `dossier`, `decompte`, `paiement`, `depots`) |
| `<Source de="miseEnDemeureNonInterruptive" />`                                  | la référence relevée d'une règle (article, arrêt)                                           |
| `<PlancherContractuel />`, `<TauxLegal />`                                      | le plancher d'un taux au contrat, le taux légal du semestre                                 |

`<Source de="…" />` accepte toutes les clés de `src/lib/verticales/recouvrement/parametres.ts`, plus
`prescription-general`, `prescription-transport` et `prescription-consommateur`.

Deux encadrés : `<Encadre titre="À retenir">` (bleu) et `<Encadre titre="Idée reçue" variante="attention">`
(rose). L'en-tête `enBref` (deux à cinq phrases) s'affiche en tête d'article.

## La charte éditoriale

**À qui on parle.** Au gérant d'une TPE ou d'une PME qui facture d'autres entreprises : un
menuisier, une grossiste, un transporteur, une agence. Il n'est ni juriste ni financier, il lit entre
deux rendez-vous, souvent sur son téléphone. Il a des impayés et n'aime pas relancer, parce qu'il a
peur de perdre le client.

**La voix.** Celle d'un confrère qui a lu les textes à votre place et vous les raconte au comptoir :
calme, précise, sans dramatiser ni minimiser. On vouvoie. On dit « votre client », jamais « le
débiteur » ; « la date limite pour agir en justice », puis « (la prescription) » entre parenthèses.

**Ce qu'un bon article fait.**

- Il répond à UNE question que le gérant se pose vraiment, et le titre la pose.
- Chaque idée a son exemple chiffré, avec une entreprise d'exemple présentée comme telle.
- Chaque règle de droit a sa source, par `<Source />` : jamais un numéro d'article tapé à la main.
- Les paragraphes font trois ou quatre lignes. Un intertitre toutes les cinq ou six.
- Un schéma là où le texte seul fatiguerait : un calcul, un délai, une comparaison.
- Il dit ce que la loi prévoit et laisse la décision au lecteur. Il ne lui dit jamais d'engager une
  procédure, et ne promet aucun résultat (le mot « garantie » est interdit).
- Il finit par ce que fait Letikette, en deux phrases, sans forcer.

**Ce qu'on n'écrit pas.** Les formules qui sonnent écrites par une machine : « dans un monde où »,
« il est crucial de », « n'hésitez pas à », « en conclusion », « véritable », « incontournable »,
« optimiser », les listes de trois adjectifs, les questions rhétoriques en série, les tirets
cadratins. Pas de point d'exclamation. Pas d'emoji.

**Avant de publier.** Relire à voix haute ; tout ce qui ne se dirait pas à un client au comptoir se
réécrit. Puis passer `brouillon: true` à `false`.

## Plus tard

Le jour où un CMS remplacera ces fichiers, seule la source change : les pages du blog lisent une
liste d'articles typée (`src/marketing/blog.ts`), d'où qu'elle vienne.
