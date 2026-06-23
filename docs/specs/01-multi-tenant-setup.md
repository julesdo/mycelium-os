# Feature : Multi-tenancy et organisation

## Objectif
Adapter le template SaaS de base pour supporter le multi-tenancy strict : chaque utilisateur appartient à une ou plusieurs organisations, et toutes les données sont isolées par organisation.

## Schéma de données à ajouter
- Table `organizations` : id, name, siren, sector, size, createdAt, plan
- Table `organizationMembers` : organizationId, userId, role (ORG_ADMIN, ORG_MANAGER, ORG_MEMBER), joinedAt
- Ajouter `currentOrganizationId` au profil utilisateur

## Logique
- Au signup, créer une organisation par défaut au nom de l'utilisateur
- Toutes les queries doivent filtrer par organizationId (helper getUserOrg(ctx))
- Switch d'organisation via dropdown dans le header

## UI
- Page /onboarding/organization : créer ou rejoindre une organisation
- Header avec switcher d'organisation si l'utilisateur appartient à plusieurs
- Page /admin/settings/organization : modifier le nom, le SIREN

## Critères d'acceptation
- Un user A dans org X ne voit JAMAIS les données de org Y
- Test E2E : créer 2 orgs, vérifier l'isolation
- Test E2E : créer un membre dans une org, vérifier les permissions