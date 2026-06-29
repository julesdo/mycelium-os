# Audit Sécurité — Authentification Mycelium Fleet OS

> **Date** : 2026-06-29  
> **Scope** : Better Auth 1.6.9 + Convex adapter + SvelteKit guards  
> **Référence** : OWASP ASVS 4.0, NIST SP 800-63B, SOC 2 Type II, ISO 27001

---

## TL;DR — Note globale : 4.5 / 10

| Catégorie                   | Note | Verdict                             |
| --------------------------- | ---- | ----------------------------------- |
| Auth de base (email, OAuth) | 7/10 | Fonctionnel, quelques gaps          |
| MFA / 2FA                   | 0/10 | **ABSENT**                          |
| Brute force protection      | 1/10 | **CRITIQUE**                        |
| SSO entreprise (SAML/OIDC)  | 0/10 | **ABSENT** — bloquant commercial    |
| Audit trail                 | 2/10 | Quasi inexistant                    |
| Session management          | 4/10 | Basique                             |
| Headers & transport         | 7/10 | Bon mais CSP manquant               |
| Conformité B2B enterprise   | 2/10 | Insuffisant pour deal >200 salariés |

**Le logiciel est au niveau d'un MVP SaaS grand public, pas d'un outil vendu à des PME/ETI qui gèrent des flottes d'entreprise avec des données RH et financières.**

Un RSSI d'une ETI de 200+ salariés refusera l'onboarding sans MFA et SSO. Un acheteur Xero App Marketplace passera la sécurité à la loupe.

---

## 1. Ce qui fonctionne (socle solide)

| Feature                | Implémentation                                      | Standard atteint      |
| ---------------------- | --------------------------------------------------- | --------------------- |
| Email + mot de passe   | Min 10 chars, email verification 20 min             | NIST 800-63B baseline |
| OAuth 2.0              | Google + GitHub, activation conditionnelle          | Acceptable            |
| WebAuthn / Passkey     | Plugin activé, table dédiée, UI présente            | Moderne ✅            |
| JWT + JWKS             | Rotation auto on error, cookie `__Secure-` en HTTPS | Correct               |
| HSTS                   | `max-age=63072000` (2 ans) sur tous les headers     | Conforme              |
| X-Frame-Options DENY   | En place                                            | Anti-clickjacking     |
| Route guards           | JWT decode rapide + Convex membership check         | Fonctionnel           |
| Banning utilisateurs   | `banned`, `banReason`, `banExpires`                 | Utile                 |
| Impersonation tracking | `impersonatedBy` en session                         | Audit partiel         |
| Rate limiting          | Chat/support, API keys — mais pas auth              | Insuffisant           |

---

## 2. Vulnérabilités Critiques — P0 (à corriger avant tout client entreprise)

### 2.1 Brute Force sur /api/auth/\* — AUCUNE PROTECTION

**Risque** : Un attaquant peut tenter des millions de combinaisons email/password sans aucun blocage.

**Ce qu'il y a** : Rate limiter configuré sur le chat et les API keys. Zéro sur `/api/auth/sign-in`, `/api/auth/sign-up`, `/api/auth/reset-password`.

**Vecteur d'attaque 2026** : Les outils de credential stuffing (OpenBullet, SilverBullet) alimentés par les 26 milliards de credentials des bases de données compromises. Automatisés, distribués via proxy résidentiel, indétectables sans analyse comportementale.

**Impact** : Compromission de comptes utilisateurs, accès aux données de flotte, données RH salariés.

**Fix requis** :

```typescript
// Better Auth supporte nativement le rate limiting — À ACTIVER
emailAndPassword({
	rateLimit: {
		window: 60, // 60 secondes
		max: 5, // 5 tentatives max
		customResponse: () => error(429, 'Too many attempts. Try again in 1 minute.')
	}
});
```

Plus : `account lockout` après 10 échecs cumulés → blocage 30 min + email de notification.

---

### 2.2 MFA / 2FA — TOTALEMENT ABSENT

**Risque** : Un mot de passe compromis = accès total. Les credentials OAuth (Google, GitHub) volés suffisent.

**Ce qu'il y a** : Passkey activé — mais uniquement comme second facteur si l'utilisateur l'a enregistré volontairement. Zéro obligation, zéro TOTP, zéro SMS.

**Vecteur d'attaque 2026** :

- **AiTM phishing (Adversary-in-the-Middle)** : Kits comme Evilginx3 ou Modlishka interceptent la session OAuth en temps réel, contournant le MFA SMS. Seuls les MFA résistants au phishing (FIDO2/WebAuthn ou TOTP avec binding de device) résistent.
- **SIM swapping** : Ne jamais implémenter le MFA par SMS — vectorisable en 10 minutes.

**Ce qui est exigé pour vendre aux entreprises** : TOTP (Google Authenticator, Authy) + option d'imposer le MFA par organisation (paramètre ORG_ADMIN).

**Fix requis** :

```typescript
// Better Auth plugin TOTP — À INSTALLER
import { twoFactor } from 'better-auth/plugins';

plugins: [
	twoFactor({
		issuer: 'Mycelium Fleet OS',
		totpOptions: {
			digits: 6,
			period: 30
		},
		// Forcer si ORG requiert MFA
		enforceTwoFactor: (user) => checkOrgMfaPolicy(user.organizationId)
	})
];
```

Better Auth 1.6.x inclut `twoFactor()` nativement. Il faut aussi exposer la gestion TOTP dans `/app/profile/security`.

---

### 2.3 SSO Entreprise (SAML 2.0 / OIDC) — ABSENT

**Risque** : Bloquant commercial. Pas de sécurité manquante per se, mais toute ETI >100 salariés gère ses identités via un IdP central (Okta, Microsoft Entra ID, Google Workspace, Ping Identity).

**Conséquences concrètes** :

- Le RSSI refusera l'outil si les salariés doivent créer un compte email/password séparé
- Onboarding impossible pour les flottes publiques (collectivités, hôpitaux) — obligation SAML
- Offboarding salarié = risque de zombie accounts actifs si pas de provisioning SCIM

**Vecteur d'attaque 2026** : Sans SSO centralisé, les comptes ex-salariés restent actifs après départ (turnover Fleet Manager = accès aux données RH et financières de la flotte).

**Fix requis** :

```typescript
// Better Auth plugin OIDC — À INSTALLER
import { oidcProvider } from 'better-auth/plugins';
import { saml } from '@better-auth/saml'; // package séparé

plugins: [
	oidcProvider({
		loginPage: '/signin'
		// Permet à l'org d'être un RP d'un IdP tiers
	}),
	saml({
		// SP-initiated SSO
		// À configurer par organisation (multi-tenant SAML)
	})
];
```

Pour du multi-tenant B2B, il faut du **SAML per-organisation** : chaque client configure son IdP dans `/admin/settings/sso`. C'est le standard Okta/Auth0/WorkOS.

---

## 3. Vulnérabilités Hautes — P1 (avant premier client payant)

### 3.1 Content Security Policy (CSP) — ABSENTE

**Risque** : XSS → vol de session JWT via `document.cookie`.

**Ce qu'il y a** : `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`. Pas de CSP.

**Impact XSS** : Le cookie JWT `__Secure-better-auth.convex_jwt` — est-il `httpOnly` ? Le hook lit le cookie côté serveur, mais si un script injecté peut le lire côté client, la session est compromise.

**Fix** :

```typescript
// hooks.server.ts — Ajouter après les autres headers
response.headers.set(
	'Content-Security-Policy',
	[
		"default-src 'self'",
		"script-src 'self' 'nonce-{nonce}'", // nonce par requête
		"style-src 'self' 'unsafe-inline'", // Tailwind inline à terme à migrer
		"img-src 'self' https://logo.clearbit.com https://t3.gstatic.com data:",
		"connect-src 'self' https://*.convex.cloud wss://*.convex.cloud",
		"frame-ancestors 'none'", // remplace X-Frame-Options
		"base-uri 'self'",
		"form-action 'self'"
	].join('; ')
);
```

Attention : Tailwind + Svelte génèrent des styles inline — migrer vers `nonce` ou hash pour `style-src`.

---

### 3.2 Durée de session — Non configurée explicitement

**Risque** : Better Auth a des valeurs par défaut que personne ne maîtrise ici.

**Audit** : Le champ `expiresAt` existe en base mais aucune configuration explicite de durée dans `auth.ts`. La valeur par défaut de Better Auth est **7 jours** pour les sessions.

**Standard B2B** :

- Session active (web) : 8h max avec idle timeout 30 min
- Session "se souvenir de moi" : 30 jours avec rotation
- Sessions admin : 4h max, réauthentification obligatoire pour actions sensibles

**Fix** :

```typescript
session: {
  expiresIn: 60 * 60 * 8,          // 8h
  updateAge: 60 * 15,               // Refresh token si activité dans les 15 min
  cookieCache: {
    enabled: true,
    maxAge: 60 * 5                  // Cache 5 min côté client max
  }
}
```

---

### 3.3 Mot de passe — Pas de vérification de compromission (HaveIBeenPwned)

**Risque** : Un utilisateur peut s'inscrire avec `password123!` présent dans 50 millions de leaks.

**NIST 800-63B** exige explicitement de vérifier les nouveaux mots de passe contre les bases de credentials compromis.

**Fix** :

```typescript
emailAndPassword({
	password: {
		async validate(password) {
			// k-anonymity model — seuls les 5 premiers chars du hash SHA1 envoyés
			const hash = await sha1(password);
			const prefix = hash.slice(0, 5);
			const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
			const body = await response.text();
			const suffix = hash.slice(5).toUpperCase();
			const found = body.split('\n').some((line) => line.startsWith(suffix));
			if (found) throw new Error('This password has appeared in a data breach. Choose another.');
		}
	}
});
```

Zéro donnée sensible envoyée (k-anonymity) — API HIBP gratuite.

---

### 3.4 Absence d'audit trail détaillé

**Risque** : Après un incident, impossible de reconstituer qui a fait quoi, depuis où, quand.

**Ce qu'il y a** : `adminAuditLogs` pour les actions admin (impersonation). Rien sur les connexions, les échecs d'auth, les changements de mot de passe, les modifications de données sensibles.

**Ce qu'exige SOC 2 Type II** :

- Toute connexion réussie : timestamp, IP, user agent, méthode
- Toute tentative échouée : timestamp, IP, email tenté
- Changement de credentials : qui, quand, depuis quelle IP
- Accès aux données sensibles : véhicules, données RH, finance
- Exports de données : qui, quand, quoi

**Fix** : Table `authEvents` Convex avec les événements Better Auth hooks :

```typescript
on: {
  session: {
    created: async ({ session, user }) => logAuthEvent('session_created', ...),
  },
  user: {
    signInFailed: async ({ email, error }) => logAuthEvent('sign_in_failed', ...),
    passwordChanged: async ({ user }) => logAuthEvent('password_changed', ...),
  }
}
```

---

### 3.5 Open Redirect — Validation insuffisante du paramètre `redirectTo`

**Risque** : `/signin?redirectTo=https://evil.com` → vol de token post-auth.

**Ce qu'il y a** : `redirectTo` utilisé dans les route guards de `hooks.server.ts`. La validation n'est pas visible dans le code audité.

**Vecteur 2026** : Les LLM-assisted phishing kits génèrent des URLs légitimes avec `?redirectTo=` pointant vers des pages de phishing hébergées sur des sous-domaines compromis.

**Fix** :

```typescript
function safeRedirect(url: string, base: string): string {
	try {
		const parsed = new URL(url, base);
		if (parsed.origin !== new URL(base).origin) return '/app'; // reject external
		return parsed.pathname + parsed.search;
	} catch {
		return '/app';
	}
}
```

---

## 4. Vulnérabilités Moyennes — P2 (avant scale-up)

### 4.1 Absence de gestion des sessions côté utilisateur

Aucune page `/app/profile/sessions` permettant de voir et révoquer les sessions actives. Standard sur tout SaaS moderne (GitHub, Notion, Linear).

### 4.2 Changement d'email sans re-vérification

Si un attaquant prend le contrôle du compte, il peut changer l'email sans que l'ancienne adresse ne soit notifiée/vérifiée. Better Auth a un plugin `changeEmail` avec verification — à activer.

### 4.3 PKCE non confirmé pour OAuth

OAuth 2.0 sans PKCE (Proof Key for Code Exchange) expose au code interception attack. Better Auth gère PKCE nativement pour les flows qu'il initie — à vérifier que `state` et `codeVerifier` sont correctement utilisés et stockés.

### 4.4 Subdomain cookie scoping

Si jamais des sous-domaines sont créés (app.mycelium.com, admin.mycelium.com), le cookie `__Secure-better-auth.convex_jwt` doit avoir `Domain` explicitement défini pour éviter le vol de session cross-subdomain.

### 4.5 Pas de Subresource Integrity (SRI) sur les assets externes

Google Fonts, CDN scripts — si jamais utilisés — doivent avoir des hashes SRI pour éviter l'injection de code malveillant en cas de compromission de CDN.

### 4.6 Magic Links absents

Les Passkeys sont excellents mais l'UX passwordless complète implique aussi des Magic Links (lien cliquable envoyé par email). Better Auth a le plugin `magicLink()` — permet une alternative élégante au mot de passe pour les utilisateurs peu techniques.

---

## 5. Dark Patterns 2026 — Menaces Émergentes

### 5.1 AiTM Phishing (Adversary-in-the-Middle)

**Kits** : Evilginx3, Modlishka, Muraena — clonent le site en proxy en temps réel.

**Contournement du MFA classique** : Captent la session côté serveur APRÈS le MFA.

**Seule défense efficace** : FIDO2/WebAuthn (Passkeys) — le challenge est lié à l'origine `rpId`, donc inutilisable sur un domaine différent. **Le Passkey déjà implémenté est la meilleure défense — le rendre obligatoire pour les admins.**

### 5.2 Credential Stuffing IA-augmenté

Les outils 2026 utilisent des LLM pour personnaliser les tentatives (prénom, nom d'entreprise dans le password), contourner les CAPTCHAs via modèles de vision, et router via des proxies résidentiels pour bypasser les IP blocklists.

**Défense** : Rate limiting par email (pas seulement par IP) + `account lockout` + notification email sur détection d'activité suspecte.

### 5.3 Session Fixation via JWT long-lived

Si le JWKS n'est pas régulièrement roté et qu'une clé privée fuite (via un log, un dump mémoire), TOUS les tokens signés avec cette clé sont compromis pour leur durée de vie restante.

**Défense** : Rotation JWKS planifiée (hebdomadaire) + durée de session courte (8h).

### 5.4 Prompt Injection → Auth Bypass sur Agents IA

Specific to Mycelium : le Concierge IA et l'Agent Manager ont accès à des tools qui lisent/écrivent des réservations. Un utilisateur malveillant pourrait tenter une prompt injection pour extraire des données d'une autre organisation.

**Défense** : Vérifier que CHAQUE tool call dans les agents re-vérifie l'`organizationId` depuis la session Convex, jamais depuis le message utilisateur.

### 5.5 OAuth Provider Compromise

Si Google ou GitHub est compromis (rare mais déjà arrivé avec OAuth misconfiguration), tous les comptes qui ont utilisé OAuth sont à risque.

**Défense** : Offrir la migration email/password comme alternative. Notifier les users de leurs méthodes de connexion actives. Permettre de "lier" plusieurs providers à un même compte.

### 5.6 Supply Chain Attack sur les dépendances auth

`better-auth`, `@convex-dev/better-auth`, `@mmailaender/convex-better-auth-svelte` — chacun est un point d'entrée. Le package `@mmailaender/convex-better-auth-svelte` est un package communautaire non-officiel (1 mainteneur).

**Défense** :

- Passer à `@better-auth/svelte` officiel dès disponible
- Vérifier `bun.lockb` en CI (hash integrity)
- `npm audit` / `bun audit` en CI avec blocage si vuln critique

---

## 6. Plugins Better Auth à Activer Immédiatement

Better Auth 1.6.x inclut nativement les plugins suivants, tous ABSENTS de la config actuelle :

| Plugin                           | Priorité | Effort | Impact sécurité            |
| -------------------------------- | -------- | ------ | -------------------------- |
| `twoFactor()` (TOTP)             | P0       | 2j     | +++ obligatoire enterprise |
| `rateLimit` sur emailAndPassword | P0       | 2h     | +++ protection brute force |
| `sso()` ou SAML                  | P0       | 5j     | +++ bloquant commercial    |
| `magicLink()`                    | P2       | 1j     | + UX passwordless          |
| `changeEmail` avec re-verify     | P1       | 4h     | ++ intégrité account       |
| `sessionManagement` UI           | P1       | 1j     | ++ visibilité utilisateur  |
| `haveIBeenPwned` check           | P1       | 2h     | ++ NIST compliance         |

---

## 7. Roadmap de Remédiation

### Sprint Sécurité A — Protection immédiate (1 semaine)

```
[ ] Rate limiting sur /api/auth/* (sign-in, sign-up, reset-password)
[ ] Account lockout après 10 échecs (Better Auth config)
[ ] Durée de session explicite : 8h actif, 30j "remember me"
[ ] Vérification HaveIBeenPwned sur création de mot de passe
[ ] Validation open redirect sur `redirectTo`
[ ] Content Security Policy (CSP) header — mode report-only d'abord
```

### Sprint Sécurité B — MFA (2 semaines)

```
[ ] Plugin twoFactor() TOTP — inscription dans /app/profile/security
[ ] UI : QR code setup, codes de récupération (8 codes à usage unique)
[ ] Option org-level : "MFA obligatoire pour tous les membres" (ORG_ADMIN)
[ ] Forcer MFA pour ORG_ADMIN et ORG_MANAGER
[ ] Page session management : /app/profile/sessions (voir + révoquer)
[ ] Email de notification sur nouvelle connexion depuis nouveau device
```

### Sprint Sécurité C — Enterprise SSO (3-4 semaines)

```
[ ] Plugin OIDC/SAML dans Better Auth
[ ] Page /admin/settings/sso : configuration IdP par organisation
[ ] Support Okta, Microsoft Entra ID, Google Workspace en priorité
[ ] SCIM provisioning (optionnel mais très demandé enterprise)
[ ] "Just-in-time provisioning" : création automatique du compte au premier SSO
[ ] Offboarding : désactiver compte si SSO désactivé côté IdP
```

### Sprint Sécurité D — Audit & Compliance (2 semaines)

```
[ ] Table authEvents : toutes connexions, échecs, changements credentials
[ ] Table dataAccessLogs : exports, accès données RH/financières
[ ] Page /admin/audit : timeline des événements par utilisateur
[ ] Rétention 90j minimum (configurable), export CSV
[ ] Alerte email sur connexion depuis IP inconnue (géolocalisation)
[ ] Weekly security digest pour ORG_ADMIN (événements anormaux)
```

---

## 8. Configuration Better Auth — Référence cible

```typescript
// Cible après les sprints sécurité
export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.SITE_URL,

	session: {
		expiresIn: 60 * 60 * 8, // 8h
		updateAge: 60 * 15 // refresh si actif dans les 15min
	},

	emailAndPassword: {
		enabled: true,
		minPasswordLength: 12, // 12 au lieu de 10 (NIST 2024)
		requireEmailVerification: true,
		rateLimit: {
			window: 60,
			max: 5
		}
	},

	plugins: [
		convex(),
		passkey({ rpId: 'mycelium.com' }), // rpId lockdown
		admin({ defaultRole: 'user', adminRoles: ['admin'] }),
		twoFactor({ issuer: 'Mycelium Fleet OS' }),
		magicLink({ sendMagicLink: sendMagicLinkEmail }),
		sso() // OIDC/SAML enterprise
	]
});
```

---

## 9. Checklist Conformité

| Exigence                                 | Statut                           | Priorité |
| ---------------------------------------- | -------------------------------- | -------- |
| RGPD — Droit à l'oubli (delete account)  | ✅ (delete user + cascade)       | —        |
| RGPD — Portabilité des données           | ❌                               | P2       |
| NIST 800-63B — Password policy           | ⚠️ (10 chars OK, pas HIBP)       | P1       |
| NIST 800-63B — MFA pour comptes à risque | ❌                               | P0       |
| SOC 2 — Audit trail                      | ❌                               | P1       |
| SOC 2 — Session timeout                  | ⚠️ (non configuré explicitement) | P0       |
| SOC 2 — MFA obligatoire admin            | ❌                               | P0       |
| ISO 27001 — Gestion des accès            | ⚠️ (partiel)                     | P1       |
| OWASP Top 10 — A01 Broken Access Control | ⚠️ (guards OK, audit non)        | P1       |
| OWASP Top 10 — A07 Auth Failures         | ❌ (pas de rate limit auth)      | P0       |

---

> Ce document doit être revu après chaque sprint sécurité et après tout incident.  
> Ne pas fusionner de features qui accèdent à des données sensibles sans que le Sprint Sécurité A soit livré.
