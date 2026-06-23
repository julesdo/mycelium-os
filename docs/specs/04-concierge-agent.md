# Feature : Agent Concierge IA pour réservation

## Objectif
Le salarié interagit en langage naturel pour réserver un véhicule. L'agent comprend, propose, confirme.

## Architecture
- Frontend : interface chat dans /app
- Backend : Convex action qui appelle Claude API (Anthropic)
- L'agent a 4 outils (function calling) :
  1. searchAvailableVehicles(dateStart, dateEnd, requirements)
  2. createReservation(vehicleId, dateStart, dateEnd, purpose)
  3. listMyReservations(status)
  4. cancelReservation(reservationId)

## Comportement de l'agent
- Salutation contextuelle (matin/après-midi/soir)
- Poser des questions de clarification (date, durée, destination, type véhicule préféré)
- Vérifier la disponibilité avant de confirmer
- Proposer 2-3 options si plusieurs véhicules correspondent
- Toujours confirmer avant d'agir (sauf consultations)
- Si demande hors scope (ex : "quelle est la météo"), rediriger gentiment

## Système de prompt
Voir prompt système ci-dessous.

## UI du chat
- Interface plein écran sur mobile, latérale sur desktop
- Bulles utilisateur à droite, agent à gauche
- Streaming des réponses (caractère par caractère)
- Possibilité de joindre du texte multilignes
- Historique des conversations (par session pour MVP)
- Bouton "Nouvelle conversation"

## Cas d'usage couverts
1. "J'ai besoin d'un véhicule jeudi pour aller à Lyon"
2. "Annule ma réservation de demain"
3. "Quels sont mes prochains trajets ?"
4. "J'ai besoin d'un utilitaire pour transporter du matériel"

## Critères d'acceptation
- Création de réservation en moins de 4 échanges
- Pas d'hallucination sur la disponibilité (toujours vérifier via outil)
- Streaming fluide (>20 tokens/sec)
- Conservation du contexte sur 20 messages