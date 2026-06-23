# Mycelium Fleet OS — Vision produit

> **Mise à jour juin 2026 — Pivot Global Day-1.**
> Lancement prioritaire UK + pays nordiques. Distribution franco-française mise en pause.

## Positionnement

Fleet Operating System pour PME et ETI 50-500 salariés avec flotte 15-150 véhicules.

Nous ne sommes pas un car sharing pur (comme Mobeelity). Nous ne sommes pas un fleet management classique (comme Ubiwan). Nous sommes le premier "Fleet OS" qui unifie expérience salarié et automatisation de gestion par une couche d'agents IA spécialisés.

**Cible géographique :** Royaume-Uni et pays nordiques (Suède, Norvège, Danemark) en priorité absolue — marchés à forte maturité logicielle où l'optimisation des coûts via l'IA raccourcit les cycles de vente. La France est maintenue mais non priorisée avant M12.

**Philosophie de croissance :** No-VC, autosuffisance rapide. Distribution "Zero-Touch" via les écosystèmes logiciels déjà utilisés par nos cibles (Xero, QuickBooks, Odoo). Zéro armée commerciale.

## Trois personas servis simultanément

### Persona 1 — Le salarié
- Réserve un véhicule en parlant à l'agent Concierge
- Reçoit son véhicule à proximité, sans friction
- Coach éco-conduite optionnel
- Notes de frais automatisées (taux paramétrables : £/mile UK, €/km EU, SEK/km Nordiques)

### Persona 2 — Le gestionnaire de flotte (CFO/Office Manager)
- Interroge la flotte via l'Assistant gestionnaire
- Reçoit chaque semaine les insights de l'Optimiseur
- Pilote les coûts via le Négociateur
- Gère la conformité via le Compliance Officer
- UK spécifique : pilote le Benefit-in-Kind (BiK) pour orienter vers l'électrique

### Persona 3 — La direction
- Voit les indicateurs stratégiques (TCO, carbone, RSE)
- Reçoit les rapports automatiques mensuels et trimestriels
- Nordiques : rapport CSRD/Scope 1-2-3 conforme ESRS E1

## Notre différenciation : les 6 agents IA spécialisés
1. Concierge (salarié)
2. Assistant gestionnaire (CFO)
3. Optimiseur de flotte (background)
4. Compliance Officer (background) — BiK UK, CSRD Nordiques
5. Négociateur de coûts (proactif)
6. Coach conducteurs (salariés + RH)

Aucun concurrent n'a cette architecture multi-agents aujourd'hui. C'est notre angle de bataille.

## Modèle de distribution

**Principe DNVB B2B :** le produit est le canal. On s'insère dans les écosystèmes déjà utilisés par nos cibles.

| Canal | Marché | Priorité |
|---|---|---|
| **Xero App Marketplace** | UK + Australie + NZ | **#1 — P25** |
| **QuickBooks App Store** | UK + USA + Canada + global | **#2 — P25** |
| **Odoo Community** | ETI industrielles mondiales | **#3 — P24** |
| Pennylane | France (secondaire) | Rétrogradé — P23 maintenu mais non prioritaire |
| Sage / EBP | France (secondaire) | Backlog — après UK établi |

## Facturation — Paddle comme Merchant of Record

Paddle encaisse, gère la TVA/Sales Tax dans 100+ pays et nous reverse le net. Zéro déclaration fiscale étrangère. La relation client reste dans notre UI, la transaction légale est absorbée par Paddle.

## Pricing "Value-Maximizer" (par conducteur actif, pas par véhicule)

| Pack | Prix mensuel | Conducteurs inclus | Proposition de valeur |
|---|---|---|---|
| **Essential** | 490 € / £420 | 50 conducteurs | Réservation IA, suppression Excel, base flotte |
| **Professional** | 890 € / £750 | 150 conducteurs | Sync Xero/QuickBooks, conformité réglementaire (BiK, CSRD lite), rapports auto |
| **Business** | 1 490 € / £1 250 | 300 conducteurs | Agents Optimiseur + Négociateur, simulation flotte automatisée, analyse prédictive |
| **Enterprise** | Sur devis | Illimité | >100 véhicules, SLA, custom |

**Overage :** chaque conducteur au-delà du quota = 5 € à 8 €/mois. Plus l'entreprise pool-share, plus notre MRR croît avec elle.

## Dogmes techniques (intouchables)

- **Zéro hardware** — données via API constructeurs, imports financiers, interaction IA
- **Multi-tenant absolu** — isolation stricte par `organizationId` dans Convex
- **Interface conversationnelle par défaut** — le Copilote IA et les agents remplacent l'UI classique là où c'est pertinent
- **PWA only** — pas de native avant 3+ clients qui le demandent explicitement

## Vision macro (horizon 10 000 clients+)

En captant la donnée d'usage des flottes électriques pionnières (pays nordiques), nous entraînons nos modèles à anticiper des crises (logistiques, énergétiques) en passant de la donnée micro à l'analyse macro-prédictive. Le Fleet Management n'est que notre cheval de Troie. **À ne pas mentionner dans les pitches avant d'avoir 10 000 clients actifs.**
