# Tranche 4 (le retour qui ramène d'où l'on vient) : décisions de conception à porter dans le plan

Brouillon d'orchestrateur, 14 septembre 2026. À écrire en plan après la tranche 3, sur le code d'alors. Faits prouvés : `SYNTHESE.md`, section « Tranche 4 ».

## Ce que dit la spec (§ 6)

- Le retour revient d'où l'on vient, par l'historique (`useCanGoBack`).
- Il dit où il mène : chaque écran publie son titre depuis la coquille ; les liens le transmettent ; le retour le relit.
- Ouvert directement (e-mail, nouvel onglet, rechargement sans état), il retombe sur le parent de l'adresse, dont on connaît le nom. Jamais un nom qui pourrait être faux.
- La créance reçoit un retour.
- Au-delà de 1024 px : pas de retour quand le volet gauche montre la destination (drapeau `masqueEnVolets` de la tranche 3).

## Faits qui contraignent

- `useCanGoBack()` = `location.state.__TSR_index !== 0`. Expérimental ; repart à 0 après un `reloadDocument`.
- Sans `state`, une navigation met `{}` : le titre ne voyage que si CHAQUE lien le passe.
- L'état survit au rechargement et `history.back()` restaure celui de l'entrée précédente.
- ⚠️ SSR : le serveur n'a que l'URL. Lire l'état au premier rendu fait diverger serveur et client après un rechargement.

## Proposition

1. **Le titre voyage dans l'état de la navigation**, pas dans un contexte React : `declare module '@tanstack/react-router' { interface HistoryState { titreDeProvenance?: string } }`.
2. **Qui l'écrit ?** Les liens qui poussent (`LigneAnalyse`, `LigneBouton` qui navigue, `BoutonPrincipal as={Link}` vers une page poussée, les rangées du flux, du veilleur, de la recherche). Idée : un seul point, le composant de lien du produit, qui lit le titre de l'écran courant publié par `PageEcran` (contexte `TitreEcran` fourni par la coquille) et le met dans `state`. Aucun écran ne le passe à la main.
   - ⚠️ Balayer TOUS les points de navigation vers une page poussée : `to=`, `vers=`, `navigate({ to })`. Une barrière pourrait exiger que tout lien vers une route poussée passe par le composant du produit.
3. **Le retour** (dans `EnteteDetail`) :
   - `peutRevenir = useCanGoBack()` ET titre de provenance présent → bouton qui fait `router.history.back()`, libellé = titre de provenance.
   - sinon → lien vers le parent de l'adresse (le `retour.vers` actuel), libellé = son nom connu (`retour.libelle`).
   - ⚠️ Jamais « nom de l'historique » + « destination du parent » mélangés : un libellé qui ne correspond pas au geste est exactement ce que la spec interdit.
4. **SSR** : au premier rendu, serveur ET client rendent le repli (lien vers le parent) ; l'état de l'historique n'est lu qu'après montage, sans `setState` dans un effet : `useSyncExternalStore(abonner, lireClient, () => null)` sur `router.history`, avec un instantané serveur à `null`. À vérifier : pas de clignotement visible (le libellé change d'un rendu à l'autre après un rechargement ; acceptable s'il est court, sinon réserver la largeur).
5. **La créance** passe d'`onglet` à `poussee` (retour vers `/app/debiteurs?d=<son débiteur>` en repli).
6. **Au-delà de 1024 px**, `masqueEnVolets` garde sa règle ; le retour par l'historique d'une page ouverte dans le volet droit ne doit pas vider le volet (un `back()` ramène l'enfant précédent : c'est le comportement voulu).

## Tests et barrières à prévoir

- Test de rendu d'`EnteteDetail` : sans état → lien vers le parent avec son nom ; avec état et index > 0 → bouton de retour avec le titre transmis (routeur en mémoire, ou crochets simulés).
- Barrière : tout lien vers une page poussée transmet le titre (à définir sans liste d'exemptions).
- Regard : ouvrir une créance depuis l'accueil, les débiteurs et les procédures ; le retour dit et fait chaque fois la bonne chose ; puis recharger et vérifier le repli.
