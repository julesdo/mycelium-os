# Notes du chantier « charpente de navigation »

Notes de travail écrites pendant l'exécution de la tranche 2, les 14 et 15 septembre 2026, dans le bloc-notes temporaire d'une session. Elles sont versées ici pour ne plus dépendre de ce bloc-notes. Elles complètent la spec (`docs/superpowers/specs/2026-09-14-charpente-navigation-design.md`) et le plan de la tranche 2 (`docs/superpowers/plans/2026-09-14-charpente-tranche-2.md`), sans les remplacer.

| Fichier | Ce qu'il porte | Quand le relire |
| --- | --- | --- |
| `SYNTHESE.md` | Faits vérifiés sur le vrai routeur et sur Convex : l'imbrication par renommage, la mise en page sans chemin `_reglages`, `useChildMatches`, `useCanGoBack` et l'état d'historique, l'analyseur de la recherche Convex. | Avant d'écrire les plans des tranches 3, 4 et 5. |
| `SYNTHESE-TRANCHE-5.md` | Relevés pour la recherche : schéma, normalisation, lectures existantes, barre, barrières qui la contraignent. | Avant le plan de la tranche 5. |
| `DESIGN-TRANCHE-3.md` | Décisions de conception des deux volets : primitive maître/détail, retour dans un volet, écran par écran. | Plan de la tranche 3. |
| `DESIGN-TRANCHE-4.md` | Le retour par l'historique : le titre dans l'état de navigation, le repli sûr au rendu serveur. | Plan de la tranche 4. |
| `DESIGN-TRANCHE-5.md` | La recherche : index cloisonnés, requête, palette, barrière du cloisonnement, tests. | Plan de la tranche 5. |
| `DEFAUTS-REGARD.md` | Ce que le regard au navigateur et les relectures ont relevé : les défauts corrigés (avec leur commit), ceux qui restent ouverts pour la tâche 10 et pour le chantier 3 (les textes), et les décisions produit à poser à Jules. | Tâche 10, chantier 3, compte rendu. |
| `empreinte-prod.sh` | Le relevé de l'empreinte servie par la production, en suivant les imports, avec un témoin. La méthode est décrite dans le plan (tâche 10, étape 3). | Avant et après chaque poussée : `bash docs/superpowers/notes/empreinte-prod.sh <dossier temporaire>`. |

Ce qui n'a pas été versé : les extraits de documentation externe (TanStack, Convex) et les preuves brutes (scripts de génération, captures de types, essais jetables), restés dans le bloc-notes de la session. Les synthèses en portent les conclusions, et une preuve se refait sur le code.

Les numéros de ligne cités datent des 14 et 15 septembre 2026. Ils glissent : repérer par le contenu.
