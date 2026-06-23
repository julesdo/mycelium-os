# Feature : Calendrier et gestion avancée des réservations

## Vue calendrier admin (/admin/reservations)
- Vue mensuelle, hebdomadaire, journalière
- Chaque véhicule = une ligne, time slots horizontaux
- Code couleur par statut
- Click sur slot vide → créer réservation
- Click sur réservation → détails/édition
- Drag & drop pour déplacer une réservation
- Resize pour modifier durée

## Détection de conflits
- Quand une réservation est créée ou modifiée, vérifier qu'aucune autre n'overlap sur le même véhicule
- Si conflit, refuser avec message clair

## Workflow d'approbation (simplifié pour MVP)
- Toute réservation est auto-confirmée pour le MVP
- Pas de validation manager (à venir en V2)

## Notification de réservation
- Créateur reçoit confirmation par mail (Resend)
- Manager du créateur reçoit notif (si réservation > 1 jour)
- Rappel J-1 par mail

## Filtres calendrier
- Par site
- Par catégorie de véhicule
- Par statut

## Critères d'acceptation
- Pas de double réservation possible
- UI responsive du calendrier
- Performance fluide même avec 100+ véhicules