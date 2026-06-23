# Feature : Reporting financier et export compta

## Objectif
Donner au DAF un reporting financier précis (coûts par véhicule, par département, par catégorie) avec export pour les outils de compta (Pennylane, Cegid, Sage).

## Catégorisation des coûts
Tous les coûts trackés doivent être catégorisés :
- LEASING (loyers mensuels)
- CARBURANT (carte essence)
- ENTRETIEN (maintenance)
- ASSURANCE (prime mensuelle)
- TAXES (TVS, vignette)
- SINISTRE (franchise, malus)
- PARKING (frais de stationnement)
- TELEPEAGE (frais autoroute)
- AUTRE

## Sources de coûts
Pour le MVP, saisie manuelle ou import (pas d'API automatique).

## Schéma de données
- Table `costs`
  - organizationId, vehicleId (nullable, sinon coût global), category, amount, date, description, invoiceUrl (nullable), source (MANUAL/IMPORT/API), createdBy, createdAt
- Index : by_org, by_vehicle, by_org_date, by_category

## UI

### Page /admin/finance
- Header avec sélecteur de période (mois courant, trimestre, année, custom)
- KPIs en haut :
  - Coût total flotte
  - Coût moyen par véhicule
  - Coût par km (basé sur kilomètres parcourus)
  - Évolution vs période précédente (%)
- Décomposition par catégorie : donut chart + table
- Décomposition par véhicule : table sortable avec coût total et par catégorie
- Décomposition par département : table

### Page /admin/finance/costs
- Liste de tous les coûts
- Filtres : véhicule, catégorie, période, source
- Bouton "Ajouter un coût"
- Bouton "Importer des coûts" (CSV)
- Actions : éditer, supprimer

### Modale d'ajout
- Véhicule (optionnel, sinon coût global)
- Catégorie
- Montant TTC + TVA
- Date
- Description
- Upload facture (optionnel)

### Export
- Bouton "Exporter" sur /admin/finance
- Choix du format : Excel, CSV, PDF
- Choix du périmètre : période, véhicules
- Génération côté serveur (Convex action) puis téléchargement
- Format Excel adapté pour import dans Pennylane (structure de colonnes spécifique)

## Calculs analytiques
- Coût par véhicule = somme des coûts liés
- Coût par km = coût total / kilomètres parcourus dans la période
- Coût moyen par catégorie = moyenne sur l'ensemble de la flotte
- Comparaison entre véhicules de même catégorie

## Critères d'acceptation
- Saisie manuelle en moins de 30 secondes
- Import CSV de 100 coûts en moins de 10 secondes
- Export Excel parfaitement structuré
- Calculs corrects sur toutes les agrégations
- Performance : reporting sur 1 an avec 10 000 coûts <2 secondes