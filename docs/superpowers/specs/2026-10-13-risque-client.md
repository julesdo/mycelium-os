# La santé de vos clients : l'analyse du risque (13/10/2026)

Le fondateur : « un module complet de Credit manager […] exploiter la donnée financière publique pour
évaluer la santé des clients de nos utilisateurs et détecter les antécédents suspects de leurs
dirigeants (liquidations passées, sur-représentation de mandats, opacité des comptes) […] une
expérience gamifiée à la Rubypayeur […] rester dans le cadre de la loi […] un plus pour
l'utilisateur, pas une information qui l'embrouille ».

**Le geste supprimé** : ouvrir Pappers ou Societe.com client par client, lire des comptes, chercher
les autres sociétés du gérant, et deviner seul si livrer encore. **Ce que ça change pour le
dirigeant** : avant de livrer, et chaque mois sans rien faire, il sait lesquels de ses clients
méritent un regard, pourquoi, et pour combien d'argent dehors.

## Ce que le module montre

Pour chaque client (et pour une entreprise qu'on s'apprête à servir) :

- **un indice de santé de 0 à 100**, dans une jauge à l'encre, et son niveau en mots : « Rien à
  signaler » (70 et plus), « À surveiller » (50 à 69), « Prudence » (30 à 49), « Risque élevé »
  (moins de 30) ; et deux états qui ne se calculent pas : « Procédure en cours », « Entreprise
  fermée » ;
- **cinq piliers en bulletin** (Registre, Finances, Transparence, Dirigeants, Vos paiements), chacun
  avec sa barre de cinq traits et son fait le plus parlant ;
- **les faits qui comptent**, en cartes (Credit Karma) : une phrase qui se vérifie, son poids, son
  effet sur l'indice (« −12 »), sa source et sa date ;
- **les dirigeants** : leurs mandats, les sociétés qu'ils ont dirigées et qui ont connu une procédure
  collective, chacune avec son annonce au journal officiel des entreprises ;
- **ses comptes** : chiffre d'affaires et résultat sur trois ans, trésorerie, délai de paiement de
  ses propres fournisseurs ;
- **votre exposition** : ce qu'il vous doit, et le plafond que vous fixez (rien n'est proposé) ;
- **la lisibilité** : ce qu'on sait de lui, à part de l'indice. Des comptes confidentiels réduisent
  la lisibilité, ils ne baissent pas l'indice.

Et pour le portefeuille (`/app/risque`) : l'indice moyen pondéré par ce qu'on vous doit, la
répartition de l'argent dehors par niveau, ce qui a changé, les clients à regarder, et trois
**missions de couverture** (retrouver les SIREN, analyser les clients qui doivent de l'argent,
fixer un plafond aux plus gros) avec leur anneau d'avancement.

## La règle qui rend l'indice honnête

**Tout l'indice se décompose.** Il part de 50 et chaque fait l'ajoute ou le retire, chiffre à
l'écran ; les règles, leurs seuils et leurs poids sont écrits dans
`verticales/recouvrement/risque/regles.ts`, et la page « Comment c'est calculé » les redit. Ce ne
sont pas des valeurs juridiques : ce sont des paramètres de lecture, à calibrer sur données réelles,
comme ceux de `comportement.ts`.

**Il ne dit pas si ce client paiera.** Il résume des faits publics et votre historique ; la
décision de livrer, de demander un acompte ou de fixer un plafond reste au gérant.

## Le cadre légal

- **Les données sont publiques** (INSEE, INPI, journal officiel des entreprises), lues par Pappers.
- **Aucune donnée de condamnation, d'infraction ou de sanction personnelle n'est lue** : l'article
  46 de la loi n° 78-17 en réserve le traitement à des personnes que nous ne sommes pas (relevé sur
  Légifrance le 13/10/2026). Ni faillite personnelle, ni interdiction de gérer, ni listes de
  sanctions internationales, ni personnes politiquement exposées.
- **Les dirigeants** : leurs noms et leurs mandats sont des données personnelles publiques, traitées
  pour l'intérêt légitime du créancier à évaluer un risque de crédit. Seuls le nom, la qualité, la
  date de prise de poste et les sociétés dirigées s'affichent ; la date de naissance sert à
  rapprocher, jamais à afficher. **Un rapprochement incertain n'attribue rien** : deux homonymes nés
  le même mois, ou une date de naissance absente, et les antécédents ne sont pas lus.
- **Aucune décision automatique** : l'indice informe, le gérant décide (RGPD, article 22).
- **Des comptes confidentiels ne sont pas un signal** : la loi le permet aux petites entreprises
  (article L232-25 du code de commerce, relevé le 13/10/2026). Ne pas déposer ses comptes en est
  un.
- **Capitaux propres sous la moitié du capital** : le fait est montré avec ce que la loi impose à la
  société (articles L223-42 et L225-248, relevés le 13/10/2026).
- **Rien n'est mutualisé** : l'analyse d'un client vit dans l'établissement qui l'a demandée. Pas
  de « name and shame » à la Rubypayeur : rien ne remonte d'un client à un autre, et rien ne part
  vers un tiers.
- **Les mots** : des faits, jamais « suspect », jamais « fraude ». « 3 sociétés dirigées par
  Jean Dupont ont connu une procédure collective », pas « dirigeant à risque ».
- La politique de confidentialité nomme Pappers et ce traitement (version 2.3).

## La donnée

- **Pappers** (`/v2/entreprise`, 1 crédit, + `actif_net_inferieur_moitie_capital`, 1 crédit) :
  statut, procédures, comptes et leur confidentialité, ratios financiers par année, dirigeants.
- **Pappers** (`/v2/recherche-dirigeants`, 0,1 crédit par résultat) : les sociétés de chaque
  dirigeant personne physique, rapproché par nom, prénom et mois de naissance.
- **Le journal officiel des entreprises** (gratuit, déjà lu par le radar) : les jugements
  d'ouverture des sociétés que ces dirigeants ont dirigées, en une requête par dirigeant.
- **Votre base** : l'habitude de paiement (`comportement.ts`), les retards en cours, ce qu'il vous
  doit.

Une analyse coûte de 2 à 5 crédits. Elle se refait d'elle-même chaque mois pour les clients déjà analysés qui
vous doivent de l'argent, et à la demande (au plus une fois par heure). Un établissement en lance
au plus 300 par mois. **Dormant sans `PAPPERS_API_KEY`.**

## Ce qui est écarté, exprès

- Le score financier de Pappers (30 crédits, et une note qu'on ne saurait pas expliquer).
- La surveillance par listes de Pappers : le radar quotidien du journal officiel couvre déjà les
  procédures, et la relecture mensuelle le reste.
- Un plafond calculé : aucune formule publique ne le justifie ; le gérant fixe le sien.

## L'activer

1. Créer le compte API sur [pappers.fr/api](https://www.pappers.fr/api) (100 crédits offerts avec
   une adresse professionnelle ; 30 € par mois pour 500 crédits, relevé le 13/10/2026).
2. Poser la clé, sans l'afficher : `npx convex env set PAPPERS_API_KEY` (dev), puis avec
   `--prod`.
3. La carte « Sa santé » apparaît sur chaque fiche client, et « La santé de vos clients » sur
   l'accueil. Une analyse coûte de 2 à 5 crédits.

## Où le code vit

- `verticales/recouvrement/risque/analyse.ts` (le moteur, testé), `regles.ts` (les seuils),
  `portefeuille.ts` (l'agrégat et les missions) ;
- `verticales/recouvrement/pays/france/pappers.ts` et `antecedents.ts` (les lectures, testées) ;
- `convex/risque/` : `analyse.ts` (les appels), `donnees.ts` (la base, et ce que Plume lit),
  `relecture.ts` (la nuit), `tables.ts` ;
- `ui/sante.tsx` (jauge, bulletin, cartes), `screens/sante.tsx`, routes `/app/risque`,
  `/app/risque/$id`, `/app/risque/verifier` ; la rangée « Sa santé » de la fiche client et « La
  santé de vos clients » sur l'accueil ; les gestes `SANTE` et `SANTE_CLIENTS` de Plume.
