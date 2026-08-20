# Harnais de bout en bout

**État au 20 août 2026 : les spécifications ont été supprimées, le harnais est
conservé.**

Elles visaient l'application SvelteKit, remplacée par React 19 le 20 août 2026.
Chaque route, chaque sélecteur et chaque `data-testid` qu'elles utilisaient a
disparu. Les garder aurait produit quatorze fichiers rouges en permanence, et
fait perdre des heures à celui qui aurait tenté de les réparer avant de
comprendre qu'il n'y avait rien à réparer. Elles restent dans l'historique git.

Ce qui est conservé, et pourquoi : `global-setup.ts`, `global-teardown.ts` et
`utils/` ne dépendent d'aucun framework frontend. Ils résolvent les URL du stack
de test, créent et nettoient les comptes jetables, et parlent à `api.tests.*`,
qui existe toujours.

## Ce que le prochain harnais doit couvrir, et rien d'autre

Un seul parcours, celui qui engage de l'argent :

1. Créer un compte, créer un établissement.
2. Déposer un export comptable CSV, voir les lignes extraites.
3. Voir la file de confirmation se remplir, confirmer un libellé.
4. Voir les trois taux s'afficher.

**Ce qu'il ne doit PAS couvrir :** les composants isolés, les variantes de
boutons, les états de survol, les largeurs d'écran. Le rendu se vérifie dans le
navigateur, sur `/showroom`, qui rend chaque écran avec des données de
démonstration sans backend ni authentification. Un test de bout en bout qui
vérifie une couleur coûte trente secondes par exécution pour prouver ce qu'un
coup d'œil prouve en une.

## Les huit pannes déjà déminées, à ne pas redécouvrir

Elles ont coûté une journée sur la version précédente, et elles se
représenteront à l'identique parce qu'elles ne dépendent pas du framework.

1. **`src/lib/convex/tests.ts` doit exister.** Supprimé une fois par erreur avec
   des tables héritées, son absence tuait la suite entière en silence.
2. **Le frontend doit être chauffé avant la première spec.** Vite ré-optimise ses
   dépendances au premier chargement et recharge la page au milieu ; le symptôme
   ressemble trait pour trait à un bug produit (« le champ e-mail est désactivé »).
3. **Un marqueur d'hydratation** doit être posé sur le document, et le harnais
   doit l'attendre. Sans lui, on clique sur des éléments qui n'écoutent encore rien.
4. **Un compte neuf n'a pas d'établissement** et sera redirigé vers `/bienvenue`.
   L'assertion de connexion doit accepter cette destination.
5. **L'URL du site n'est pas `localhost:5173`.** Le script de dev calcule un port
   par branche. Passer par `resolveSiteUrl()`, jamais par une valeur en dur.
6. **Un contexte de navigateur créé à la main n'hérite pas** des options `use` de
   la configuration : lui passer `baseURL` explicitement.
7. **`page.request` ne pose pas d'en-tête `Origin`**, et Better Auth refuse la
   requête avec un 403 opaque. Le poser à la main.
8. **Viser les `data-testid`, jamais les rôles ARIA** pour les composants de
   bibliothèque : le rôle n'apparaît qu'après hydratation, ce qui rend le harnais
   tributaire du temps de démarrage.
