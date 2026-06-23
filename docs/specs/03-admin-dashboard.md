# Feature : Dashboard Admin

## Objectif
Page /admin (home) qui donne au DAF/RH une vision instantanée de la flotte.

## KPIs en haut de page (4 cartes)
1. Nombre de véhicules total
2. Taux d'utilisation moyen (% de véhicules IN_USE sur 7 derniers jours)
3. Véhicules en maintenance
4. Alertes ouvertes (à venir : entretiens dus, contraventions, etc.)

## Section "Activité de la semaine"
- Graphique ligne : nombre de réservations par jour sur 14 derniers jours
- Pour le MVP : données mockées si pas encore de réservations

## Section "Flotte par statut"
- Donut chart : répartition AVAILABLE / IN_USE / MAINTENANCE / RETIRED

## Section "Véhicules nécessitant attention"
- Liste des 5 véhicules avec date d'entretien proche (kilométrage > 90% du prochain entretien) — logique simple pour le MVP
- Liste des 5 véhicules avec contrat de leasing finissant dans <90 jours

## Section "Activité récente"
- Feed des 10 dernières actions (réservation créée, véhicule ajouté, etc.)
- Mise à jour temps réel via Convex

## Design
- Layout grille responsive
- Mode sombre par défaut
- Charts en SVG (lib : layerchart pour Svelte)
- Sobriété maximale, pas d'ornement