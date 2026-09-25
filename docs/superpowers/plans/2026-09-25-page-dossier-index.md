# La page dossier — index des plans

**Spec** : [`../specs/2026-09-25-page-dossier-design.md`](../specs/2026-09-25-page-dossier-design.md)

Un plan par lot, écrit juste avant le lot : chaque lot part du code que le précédent a réellement
produit. Chaque lot est mis en production seul, et vérifié sur ce qui est servi.

| Lot | Contenu | Plan | État |
|---|---|---|---|
| 0 | Corrections en production (imputation, indemnité, prescription, textes publics) | — (fait hors plan) | Livré, `1b275b6` |
| 1 | Le référentiel et le calcul : délais de procédure, ordre d’imputation choisi par le gérant, taux exact | [lot 1](2026-09-25-page-dossier-lot-1.md) | Livré, `9a20a6d` |
| 2 | Montrer, pas qualifier : tableau à trois colonnes, fin des verdicts et du score, conditions générales | fait en ligne | Livré, `3bb15c4` |
| 3 | La page dossier et le lexique : route, deux colonnes, frise des quatre étapes, `/app/clients`, redirections | fait en ligne | Livré, `89080c3` |
| 4 | Les situations : contestation, procédure collective (annonce d’ouverture stockée), paiement partiel et 1342-10, radiation | fait en ligne | Livré, `ba8feee` |
| 5a | Les envois sans prestataire : table `envois`, six modèles, aperçu exact, validation par un administrateur, PDF, messagerie du gérant | fait en ligne | Livré, `bb13e9e` |
| 5b | Maileva (recommandé hybride) | à écrire | attend le type de contrat |
| 5c | AR24 (recommandé électronique) | à écrire | attend un compte AR24 |
| 5d | Signature électronique de l'échéancier | à écrire | attend le choix du prestataire |
| 6 | L’agent dans le dossier : questions préécrites, questions de droit sans appel au modèle, filtre des verdicts | fait en ligne | Livré, `bc5c0af` |
