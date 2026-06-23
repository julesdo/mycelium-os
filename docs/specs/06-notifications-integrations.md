# Feature : Notifications et intégrations calendaires

## Notifications in-app
- Centre de notifications dans le header
- Badge avec compteur de non-lues
- Types : réservation créée, réservation à venir, conflit détecté, véhicule revenu, entretien dû
- Click sur notif → action contextuelle (page de la réservation, etc.)

## Notifications push (PWA)
- Demander la permission lors de l'onboarding
- Notif push pour : réservation créée, rappel J-1, début de réservation H-1

## Intégration Google Calendar
- L'utilisateur peut connecter son Google Calendar
- Chaque réservation est automatiquement ajoutée à son calendrier perso
- Si l'utilisateur a un event Google "Déplacement à Lyon", l'agent peut suggérer une réservation

## Intégration Microsoft 365
- Idem mais avec Outlook Calendar

## Alertes intelligentes (Agent Optimiseur basique)
- Détection automatique :
  - Véhicule sous-utilisé (>30 jours sans réservation) → alerte au DAF
  - Réservation en conflit avec maintenance prévue
  - Kilométrage approchant du seuil d'entretien
- Les alertes apparaissent dans le centre de notifications
- Le DAF peut les ack ou les ignorer

## Critères d'acceptation
- Notifications temps réel via Convex
- OAuth Google fonctionnel
- Sync bidirectionnelle Google Calendar (création + suppression)