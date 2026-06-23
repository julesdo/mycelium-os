# Feature : Module Entretiens et Maintenance

## Objectif
Détecter automatiquement les besoins d'entretien, planifier les rendez-vous, suivre les coûts, alerter les utilisateurs concernés.

## Schéma de données à ajouter
- Table `maintenanceSchedules` : règles d'entretien par modèle de véhicule
  - vehicleBrand, vehicleModel, type (REVISION/VIDANGE/PNEUS/FREINS/AUTRE), intervalKm, intervalMonths, estimatedCost
- Table `maintenanceRecords` : historique réel
  - organizationId, vehicleId, type, scheduledDate, completedDate, garageId, costEstimate, costActual, invoice (URL), notes, status (SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED)
- Table `garages` : base de garages partenaires
  - name, network (NORAUTO/SPEEDY/INDEPENDENT), address, city, zipcode, phone, email, services (array), avgRating, partnership (boolean)
- Table `vehicleMaintenanceConfig` (par véhicule, peut overrider les règles génériques)
  - vehicleId, lastRevisionKm, lastRevisionDate, lastVidangeKm, ...

## Logique métier

### Détection automatique
Cron quotidien à 6h :
- Pour chaque véhicule, calculer le prochain entretien prévu basé sur :
  - Le kilométrage actuel vs les seuils du modèle
  - La date du dernier entretien vs les intervalles temps
- Si entretien dû dans <30 jours OU <2000 km, créer une alerte
- Si entretien overdue (dépassé), alerte critique

### Recommandation garage
Quand une alerte est créée :
- Géolocaliser le véhicule (basé sur la dernière réservation ou le site assigné)
- Proposer les 3 garages partenaires les plus proches dans un rayon de 20km
- Afficher leur disponibilité (créneaux libres sur les 14 prochains jours, pour MVP : mock)
- Afficher l'estimation de coût

### Workflow de rendez-vous
- ORG_ADMIN valide le rendez-vous proposé
- Mail envoyé au garage avec les détails (utiliser template Resend)
- Notification au conducteur principal du véhicule
- Le véhicule passe en statut MAINTENANCE pendant la période
- À la fin : upload de la facture, validation du coût, archivage

## UI

### Dashboard admin : nouveau widget
- "Entretiens à venir" : liste des 5 prochains, avec date et véhicule

### Nouvelle page /admin/maintenance
- Onglets : "Planifiés", "En cours", "Historique"
- Filtres : type, garage, période
- Vue calendrier alternative

### Nouvelle page /admin/maintenance/[id]
- Détails complets de l'entretien
- Boutons pour changer le statut
- Upload facture

### Modification page /admin/fleet/[id]
- Nouvelle section "Maintenance" avec :
  - Prochain entretien prévu
  - Historique des entretiens
  - Bouton "Planifier un entretien"

### Notification salarié
- Si le véhicule du salarié va en maintenance, mail/push avec dates et véhicule de remplacement (à choisir manuellement pour MVP)

## Agent IA Maintenance
Pas d'agent dédié pour le MVP. La logique est déterministe.
En V3, on ajoute un Agent Optimiseur qui regroupe les entretiens (3 véhicules même garage la même journée = optimisation logistique).

## Critères d'acceptation
- Détection automatique fonctionnelle pour les 20 marques/modèles les plus courants en France
- Workflow complet : détection → proposition → validation → exécution → facturation
- Notifications correctes à toutes les parties
- Historique consultable et exportable