# Feature : Gestion avancée des conducteurs

## Objectif
Gérer les conducteurs autorisés à utiliser la flotte, suivre leurs permis et formations, appliquer les restrictions.

## Schéma à étendre
- Table `users` (étendre) : driverLicenseNumber, driverLicenseExpiryDate, driverLicenseCategories (array : B, BE, C, CE, D, DE), formations (array of objects : type, expiryDate, certificateUrl)
- Table `userRestrictions` : userId, type (NO_LONG_DISTANCE/NO_UTILITY/MAX_KM_PER_MONTH/...), value, reason, addedBy
- Table `driverAssignments` : véhicule attribué de manière permanente vs pool (vehicleId, userId, assignedFrom, assignedUntil)

## UI

### Page /admin/drivers
- Tableau avec colonnes : Nom, Email, Permis, Expiration permis, Catégories, Restrictions, Véhicule attribué, Statut
- Filtres : statut permis, catégorie, site
- Actions : voir détail, désactiver
- Alerte visuelle si permis expire dans <60 jours

### Page /admin/drivers/[id]
- Onglets : Profil / Permis / Formations / Historique / Restrictions
- Onglet Permis :
  - Photo recto/verso du permis
  - Numéro, catégories, date de délivrance, date d'expiration
  - Validation manuelle par ORG_ADMIN
- Onglet Formations :
  - Liste des formations (FIMO, FCO, ADR, etc.)
  - Date d'obtention, expiration
  - Upload certificat
- Onglet Historique :
  - Réservations passées
  - Sinistres
  - Comportement de conduite (mock pour MVP, à implémenter avec OEM data plus tard)

### Onboarding conducteur (côté app salarié)
- Lors du premier login, demander : photo permis + selfie
- Validation auto si possible (OCR + vérification CNI) ou manuelle par admin
- Bloquer les réservations tant que le permis n'est pas validé

## Logique business

### Validation des réservations selon permis
- Lors d'une réservation, vérifier :
  - Le permis est valide (non expiré)
  - Le permis est de catégorie compatible avec le véhicule (B pour <3.5T, BE pour remorque, etc.)
  - Aucune restriction active ne bloque cette réservation
- Si invalide, refuser et expliquer pourquoi

### Alertes automatiques
Cron quotidien :
- Permis expire dans 30 jours : alerte au conducteur + admin
- Permis expire dans 7 jours : alerte URGENT
- Permis expiré : conducteur désactivé automatiquement

## Critères d'acceptation
- Conducteur ne peut pas réserver véhicule incompatible avec son permis
- Alertes d'expiration fonctionnelles
- OCR du permis fonctionne sur 80% des cas (utiliser GPT-4 Vision ou Claude Vision)
- Workflow d'onboarding fluide en moins de 2 minutes