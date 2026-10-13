# Plume, un compagnon fiable (14/10/2026)

Le fondateur : « Reprends Plume et le fait qu'il soit partout dans l'application ! Je veux qu'on
sente le côté fiable du compagnon, il ne faut pas que ce soit cheap ! Il faut que le compagnon
rassure l'utilisateur et l'accompagne tout le temps en automatique sur l'App. »

**Le geste supprimé** : aller chercher, écran par écran, ce que Plume a fait pendant qu'on n'était
pas là ; ouvrir l'accueil pour savoir si une relance va partir à son nom ; deviner ce que Plume
s'autorise et ce qu'il ne fait pas. **Ce que ça change pour le dirigeant** : il voit Plume
travailler sur tous les écrans, il sait à chaque retour ce qui est parti et ce qui est rentré, et
il lit, en une page, les règles que Plume suit.

## Ce qui clochait

- Hors de l'accueil, Plume travaillait sans qu'on le voie. Une relance pouvait partir à votre nom
  pendant que vous étiez sur une fiche client.
- Sa bulle ne disait que ce qui arrivait sous vos yeux : ce qui était parti cette nuit ou rentré
  ce matin ne s'annonçait jamais.
- Une jauge et une série de jours au-dessus de chaque phrase faisaient d'un collaborateur un jeu.
- Sa page s'ouvrait sur « Je veille sur 12 dossiers » et un paragraphe : rien de vérifiable.
- Peint d'une seule couleur, il avait l'air d'un pictogramme.

## Ce qui a été relevé (Mobbin, 14/10/2026)

- **Apple Music** : ce qui joue, dans une capsule de verre au-dessus de la barre d'onglets, sur
  tous les écrans.
- **Flighty** : l'état en peu de mots et précis (« départ dans 2 h 58 »), sans qu'on le demande.
- **Notion** : « Transcription en cours » posé en bas de l'écran le temps du travail.
- **Monzo** : « Annuler ce paiement », et un anneau qui se vide.
- **Apple Wallet** : « Rien à payer », et pourquoi un prélèvement automatique sautera.
- **Chime** : le centre de sécurité, un état en une phrase puis ce qui est en place.
- **Wealthfront** : chaque règle de l'épargne automatique écrite en clair avant de l'activer.
- **Noom** : l'assistant dit ce qu'il ne fait pas.

## Ce qui est livré

### 1. En direct, au-dessus de la barre (`44487ef`)

Une capsule du verre de la barre (`ui/capsule-plume.tsx`), tant qu'il se passe quelque chose :

| État                           | Titre                        | Ligne                                              | Anneau     | Geste       |
| ------------------------------ | ---------------------------- | -------------------------------------------------- | ---------- | ----------- |
| Il travaille                   | « Prépare vos relances »     | l'étape en cours, « 2 sur 3 »                      | se remplit | aucun       |
| Une relance part dans l'heure  | « Relance dans 23 min »      | « Fournitures Durand · deuxième rappel à 14 h 30 » | se vide    | « Retenir » |
| Plusieurs partent dans l'heure | « 3 relances d'ici 14 h 45 » | la première, dans combien                          | se vide    | « Voir »    |

Le délai en titre, le client dessous : à 375 px, « Deuxième rappel à Fournitures Durand » se coupait
avant le nom. « Retenir » ne vit qu'avec un seul départ (il ne dirait pas lequel sinon) ; c'est le
geste sûr, il empêche un envoi. Toucher la capsule ouvre la page de Plume. Muette quand sa bulle
parle et sur Aujourd'hui, dont le bloc du pilote montre déjà tout cela.

Code : `compagnon/en-direct.ts` (pur, testé), `presence.relancesProgrammees` (étroite, sans filtre
de temps : le composant avance chaque demi-minute), `BarreDuBas.auDessus`, `CapsuleBranchee`.

### 2. À votre retour, son point (`ce615b8`)

La première chose que Plume dit à votre retour : « Bonjour Jules. Depuis hier, 18 h 40 : », puis
une ligne par fait compté, teintée par sa famille (ce qui part, l'argent, les papiers, ce qu'on
vous demande) : relances parties à votre nom, paiements reçus et leur total, dossiers ouverts,
notifications à lire. En pied, ce qui part ensuite. Une nuit calme se dit aussi. Rien après une
simple recharge de page (moins de vingt minutes), ni à la toute première visite. Quand le point dit
bonjour, le bonjour d'Aujourd'hui se tait.

Code : `compagnon/retour.ts` (pur, testé) ; `journee.ouvrirLaVisite`, une MUTATION qui lit la
visite précédente, compte ce qui a eu lieu depuis et pose l'heure de celle-ci
(`journeesPlume.vueLe`) : un instantané pris à l'arrivée, pas un abonnement. Voix `RETOUR` dans
`app/parole-de-plume.tsx`, lignes `ScenePlume.releve`, pied propre `ParoleAffichee.pied`.

### 3. Sa maison, ses engagements, une bulle sans jauge (`16a2997`)

La page de Plume (`/app/pilote`) s'ouvre sur sa maison (`ui/maison-plume.tsx`) : où il en est en
une phrase (`compagnon/veille.ts` : « Je travaille », « 2 choses attendent votre feu vert », « Tout
est en ordre »), trois faits en tuiles (dernière relecture, dossiers suivis, relances
automatiques activées ou coupées), sa journée défi par défi, et « Mes engagements ».

**Un engagement est une ligne de code, pas une promesse de marketing.** Chaque phrase lit la
constante qui la tient : `HEURES_D_ENVOI` et `DELAI_POUR_RETENIR_MS` sortent de `plan-relance.ts`
(le pilote les lit aussi), `JOURS_DE_GRACE` de `parole.ts`. Changer la règle change la phrase.

La bulle perd la jauge et la série en tête ; la journée vit sur sa page et dans l'anneau du bouton,
et ne revient dans la bulle que pour la journée bouclée (sa semaine en coches).

### 4. Du relief, et l'activation accompagnée (`b8de613`)

Le corps de Plume prend un dégradé rayonnant tiré de sa propre couleur (`color-mix`), juste dans
les deux thèmes. Activer les relances automatiques fait dire à Plume quand il écrira, comment on le
voit et comment on l'arrête ; les couper, que plus rien ne part seul.

## Ce qui est écarté, exprès

- **Une capsule permanente « Tout va bien ».** Une présence qui dirait la même chose toute la
  journée serait du décor ; la capsule n'existe que quand il y a quelque chose à voir, et le calme
  se lit dans la tête de Plume, son anneau et sa maison.
- **Une page de plus pour Plume.** Sa maison est le haut de sa conversation : une seule
  destination, celle où mènent la capsule et le point du retour.
- **Des engagements écrits à la main.** Ils sont composés depuis les constantes du pilote.

## Non vérifié

Rien n'a été joué avec une vraie session (je ne me connecte à aucun compte) : la salle seule, à
375 px, et les tests. La capsule, le point du retour et la maison se regardent dans la salle
(« Barre + compagnon », « Plume, tout l'établissement », variante « engagements »).
