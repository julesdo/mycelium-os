# Feature : Import et gestion de flotte

## Objectif
Permettre à un ORG_ADMIN d'importer et de gérer sa flotte de véhicules.

## Schéma de données
- Table `vehicles` :
  - organizationId, registration (immatriculation), brand, model, year, energy (THERMAL/HYBRID/ELECTRIC), category (PASSENGER/UTILITY/TRUCK), kilometers (current), purchaseDate, leaseEndDate (nullable), assignedDriverId (nullable, futur), status (AVAILABLE/IN_USE/MAINTENANCE/RETIRED), location (string libre), notes
  - Index : by_org, by_org_and_status

## Workflow
1. Page /admin/fleet vide : empty state "Importez votre première flotte"
2. Bouton "Importer un CSV" ouvre une modale
3. Étape 1 modale : upload du fichier
4. Étape 2 modale : preview des 5 premières lignes + mapping des colonnes (registration, brand, model, etc.)
5. Étape 3 modale : validation et import (afficher progression)
6. Après import : tableau de la flotte avec filtres et tri

## Format CSV attendu
Colonnes (peu importe l'ordre, mapping manuel) :
- Immatriculation (required)
- Marque (required)
- Modèle (required)
- Année (required)
- Énergie (required, valeurs : Thermique, Hybride, Électrique)
- Catégorie (Tourisme, Utilitaire, Camion)
- Kilométrage actuel
- Date d'achat
- Date fin leasing
- Site / Localisation
- Notes

## UI tableau flotte
- Colonnes : Immat, Marque/Modèle, Énergie, Kilométrage, Statut, Site, Actions
- Filtres : statut, énergie, site
- Tri par colonne
- Recherche full-text sur immat et modèle
- Bouton "Ajouter un véhicule" pour saisie manuelle
- Clic sur une ligne ouvre /admin/fleet/[vehicleId]

## Page détail véhicule /admin/fleet/[id]
- Toutes les infos
- Historique des réservations (vide pour S2)
- Bouton "Modifier"
- Bouton "Mettre en maintenance" / "Retirer"

## Critères d'acceptation
- Import 50 véhicules en moins de 30 secondes
- Validation : refuser les immatriculations dupliquées
- Mapping flexible : l'utilisateur choisit quelle colonne correspond à quel champ
- Sauvegarder le mapping pour réutilisation