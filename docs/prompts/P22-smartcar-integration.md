---
priority: 22
feature: Smartcar API — Données véhicules OEM sans hardware (km, carburant, batterie)
sprint: S14 (V2)
version: V2 — Indispensable au DAF
effort: 3 jours
depends_on: P01 (véhicules), P08 (coûts — enrichissement automatique)
blocks: P23 (éco-conduite utilise les données Smartcar)
model_recommended: —
pricing_tier: Business (990€/mois) — différenciant majeur sans IoT
---

# P22 — Smartcar API integration

## 🎯 Mission

Connecter les véhicules compatibles à l'API **Smartcar** pour recevoir automatiquement leurs données réelles : kilométrage, niveau de carburant/batterie, statut de verrouillage, alertes moteur. **Zéro hardware, zéro boîtier OBD** — uniquement les APIs OEM des constructeurs (Renault, Stellantis, VW Group). Le DAF a des données réelles sans rien installer physiquement.

**Exemple de valeur :**
> L'admin connecte le Renault Kangoo AB-123 via Smartcar OAuth. Dès lors, Mycelium affiche en temps réel : 43 200 km, niveau carburant 65%, aucune alerte moteur. Le kilométrage se met à jour automatiquement après chaque trajet — plus de saisie manuelle.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `vehicles` avec `kilometers` (saisie manuelle), `energy`, `registration`
- Pattern Convex actions pour appels API externes
- Infrastructure Convex Storage
- Cron infrastructure dans `crons.ts`

**Ce qui manque :**
- OAuth Smartcar (connect par véhicule, pas par user)
- Table `smartcarConnections` : tokens par vehicleId
- Convex action `fetchVehicleDataFromSmartcar` : sync km/fuel/battery
- Cron quotidien de sync des données
- UI `/admin/fleet/[vehicleId]` : section "Données en direct" (modifier l'onglet existant)
- Gestion refresh token Smartcar (expire 60 jours sans refresh)

---

## 🔒 Contraintes absolues

1. **Optionnel par véhicule** : Smartcar est disponible uniquement pour les constructeurs compatibles (Renault, Peugeot, Citroën, VW, Audi, BMW, Mercedes récents). Si le véhicule n'est pas compatible → fonctionnement normal en saisie manuelle. **Jamais bloquer l'app si Smartcar ne répond pas.**
2. **Tokens chiffrés** : access/refresh tokens Smartcar stockés chiffrés (même pattern que P14 Google Calendar).
3. **Sync en arrière-plan uniquement** : aucune donnée Smartcar n'est fetchée en temps réel depuis le navigateur. Tout passe par des Convex actions déclenchées par cron ou par action admin.
4. **Écriture kilométrage** : si Smartcar retourne un km supérieur au km actuel en DB → mettre à jour `vehicles.kilometers`. Si inférieur (anomalie) → ignorer et logger.
5. **Limit de fréquence Smartcar** : max 1 sync par véhicule toutes les 4h (rate limit API Smartcar plan gratuit = 500 req/j).

---

## 📊 Nouveau schéma Convex

### `smartcarConnections`

```typescript
smartcarConnections: defineTable({
  organizationId: v.id('organizations'),
  vehicleId: v.id('vehicles'),
  smartcarVehicleId: v.string(),     // ID Smartcar du véhicule
  accessToken: v.string(),           // chiffré AES-256
  refreshToken: v.string(),          // chiffré
  tokenExpiresAt: v.number(),
  lastSyncAt: v.optional(v.number()),
  lastSyncError: v.optional(v.string()),
  isActive: v.boolean(),
  connectedBy: v.string(),           // userId admin
  connectedAt: v.number(),
  // Dernières données connues (cache)
  lastKm: v.optional(v.number()),
  lastFuelPercent: v.optional(v.number()),
  lastBatteryPercent: v.optional(v.number()),
  lastIsLocked: v.optional(v.boolean()),
  lastEngineOn: v.optional(v.boolean())
})
  .index('by_vehicle', ['vehicleId'])
  .index('by_org', ['organizationId'])
  .index('by_smartcar_id', ['smartcarVehicleId'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                         → ajouter smartcarConnections
src/lib/convex/smartcar.ts                       → NOUVEAU : OAuth + sync + actions

src/routes/[[lang]]/
  api/smartcar/callback/+server.ts               → OAuth callback Smartcar
  admin/fleet/[vehicleId]/+page.svelte           → MODIFIER : section "Données en direct"

src/lib/components/fleet/
  smartcar-connect-button.svelte                 → bouton connexion avec status
  live-vehicle-data.svelte                       → affichage données en direct
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — OAuth Smartcar callback

```typescript
// src/routes/[[lang]]/api/smartcar/callback/+server.ts
import { SMARTCAR_CLIENT_ID, SMARTCAR_CLIENT_SECRET } from '$env/static/private';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // vehicleId + organizationId encodés en JSON + base64

  if (!code || !state) return new Response('Invalid OAuth', { status: 400 });

  const { vehicleId, organizationId } = JSON.parse(atob(state));

  // Échanger le code contre tokens
  const tokenRes = await fetch('https://auth.smartcar.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${SMARTCAR_CLIENT_ID}:${SMARTCAR_CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${url.origin}/api/smartcar/callback`
    })
  });
  const tokens = await tokenRes.json();
  if (!tokens.access_token) return new Response('OAuth failed', { status: 400 });

  // Récupérer l'ID Smartcar du véhicule
  const vehiclesRes = await fetch('https://api.smartcar.com/v2.0/vehicles', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const { vehicles: smartcarVehicles } = await vehiclesRes.json();
  const smartcarVehicleId = smartcarVehicles[0]; // premier véhicule de ce compte

  // Sauvegarder via Convex
  const session = await locals.auth?.getSession();
  await fetch(`${process.env.CONVEX_SITE_URL}/saveSmartcarConnection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicleId,
      organizationId,
      smartcarVehicleId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      connectedBy: session?.user?.id
    })
  });

  return new Response(null, {
    status: 302,
    headers: { Location: `/admin/fleet/${vehicleId}?smartcar=connected` }
  });
};
```

### Étape 2 — Action de sync `smartcar.ts`

```typescript
// src/lib/convex/smartcar.ts

export const syncVehicleData = internalAction({
  args: { vehicleId: v.id('vehicles') },
  handler: async (ctx, { vehicleId }) => {
    const connection = await ctx.runQuery(internal.smartcar.getConnectionForVehicle, { vehicleId });
    if (!connection?.isActive) return;

    // Rate limiting : pas de sync si dernière sync < 4h
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
    if (connection.lastSyncAt && connection.lastSyncAt > fourHoursAgo) return;

    const accessToken = await getValidAccessToken(ctx, connection);
    if (!accessToken) return;

    const BASE = `https://api.smartcar.com/v2.0/vehicles/${connection.smartcarVehicleId}`;
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      const [odoRes, fuelRes, chargeRes, lockRes] = await Promise.allSettled([
        fetch(`${BASE}/odometer`, { headers }),
        fetch(`${BASE}/fuel`, { headers }),
        fetch(`${BASE}/battery`, { headers }),
        fetch(`${BASE}/security`, { headers })
      ]);

      const data: Partial<{
        km: number;
        fuelPercent: number;
        batteryPercent: number;
        isLocked: boolean;
      }> = {};

      if (odoRes.status === 'fulfilled' && odoRes.value.ok) {
        const odo = await odoRes.value.json();
        data.km = Math.round(odo.distance / 1000); // Smartcar retourne en mètres → convertir en km
      }
      if (fuelRes.status === 'fulfilled' && fuelRes.value.ok) {
        const fuel = await fuelRes.value.json();
        data.fuelPercent = Math.round(fuel.percentRemaining * 100);
      }
      if (chargeRes.status === 'fulfilled' && chargeRes.value.ok) {
        const charge = await chargeRes.value.json();
        data.batteryPercent = Math.round(charge.percentRemaining * 100);
      }
      if (lockRes.status === 'fulfilled' && lockRes.value.ok) {
        const lock = await lockRes.value.json();
        data.isLocked = lock.isLocked;
      }

      // Mettre à jour le véhicule en DB
      await ctx.runMutation(internal.smartcar.updateVehicleFromSmartcar, {
        vehicleId,
        connectionId: connection._id,
        ...data
      });
    } catch (err) {
      await ctx.runMutation(internal.smartcar.logSyncError, {
        connectionId: connection._id,
        error: String(err)
      });
    }
  }
});

// Internal mutation : mise à jour des données en DB
export const updateVehicleFromSmartcar = internalMutation({
  args: {
    vehicleId: v.id('vehicles'),
    connectionId: v.id('smartcarConnections'),
    km: v.optional(v.number()),
    fuelPercent: v.optional(v.number()),
    batteryPercent: v.optional(v.number()),
    isLocked: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Mettre à jour le kilométrage uniquement si supérieur (éviter les anomalies)
    if (args.km) {
      const vehicle = await ctx.db.get(args.vehicleId);
      if (vehicle && (!vehicle.kilometers || args.km > vehicle.kilometers)) {
        await ctx.db.patch(args.vehicleId, { kilometers: args.km });
      }
    }

    // Mettre à jour le cache dans smartcarConnections
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: now,
      lastKm: args.km,
      lastFuelPercent: args.fuelPercent,
      lastBatteryPercent: args.batteryPercent,
      lastIsLocked: args.isLocked,
      lastSyncError: undefined
    });
  }
});

async function getValidAccessToken(ctx: ActionCtx, connection: SmartcarConnection): Promise<string | null> {
  if (connection.tokenExpiresAt > Date.now() + 5 * 60 * 1000) {
    return decrypt(connection.accessToken);
  }

  // Refresh
  try {
    const res = await fetch('https://auth.smartcar.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${process.env.SMARTCAR_CLIENT_ID}:${process.env.SMARTCAR_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decrypt(connection.refreshToken)
      })
    });
    const tokens = await res.json();
    if (!tokens.access_token) return null;

    await ctx.runMutation(internal.smartcar.updateTokens, {
      connectionId: connection._id,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token ?? decrypt(connection.refreshToken)),
      expiresAt: Date.now() + tokens.expires_in * 1000
    });
    return tokens.access_token;
  } catch {
    return null;
  }
}
```

### Étape 3 — Cron quotidien

```typescript
// src/lib/convex/crons.ts

// Sync Smartcar : toutes les 6h (respect rate limits)
crons.interval('smartcar-sync', { hours: 6 },
  internal.smartcar.syncAllConnectedVehicles
);
```

### Étape 4 — UI : section "Données en direct" dans `/admin/fleet/[vehicleId]`

```svelte
<!-- Ajouter dans l'onglet "Détails" de la page véhicule -->
<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import SmartcarConnectButton from '$lib/components/fleet/smartcar-connect-button.svelte';

  const smartcarData = useQuery(api.smartcar.getVehicleLiveData, { vehicleId });
</script>

{#if smartcarData.data}
  <div class="rounded-xl border border-[var(--border)] p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="font-semibold text-sm">Données en direct <span class="text-[var(--brand)]">Smartcar</span></h3>
      <span class="text-[10px] text-[var(--muted)]">
        Dernière sync : {smartcarData.data.lastSyncAt
          ? new Date(smartcarData.data.lastSyncAt).toLocaleString('fr-FR')
          : 'jamais'}
      </span>
    </div>
    <div class="grid grid-cols-3 gap-4">
      {#if smartcarData.data.lastKm}
        <div class="text-center">
          <div class="text-xl font-bold">{smartcarData.data.lastKm.toLocaleString('fr-FR')}</div>
          <div class="text-xs text-[var(--muted)]">km</div>
        </div>
      {/if}
      {#if smartcarData.data.lastFuelPercent !== undefined}
        <div class="text-center">
          <div class="text-xl font-bold">{smartcarData.data.lastFuelPercent}%</div>
          <div class="text-xs text-[var(--muted)]">carburant</div>
        </div>
      {/if}
      {#if smartcarData.data.lastBatteryPercent !== undefined}
        <div class="text-center">
          <div class="text-xl font-bold">{smartcarData.data.lastBatteryPercent}%</div>
          <div class="text-xs text-[var(--muted)]">batterie</div>
        </div>
      {/if}
    </div>
  </div>
{:else}
  <SmartcarConnectButton {vehicleId} />
{/if}
```

---

## ✅ Critères d'acceptation

- [ ] Admin peut connecter un véhicule compatible via OAuth Smartcar
- [ ] Kilométrage mis à jour automatiquement après chaque sync (si > km actuel en DB)
- [ ] Niveau carburant et batterie affichés dans la page véhicule
- [ ] Sync toutes les 6h maximum (respect rate limit)
- [ ] Si Smartcar est indisponible → aucune erreur visible, fonctionnement en mode dégradé
- [ ] Bouton "Connecter Smartcar" absent si véhicule déjà connecté (montrer les données à la place)
- [ ] Tokens chiffrés en base, jamais exposés côté client

---

## 🚫 NE PAS FAIRE

- Ne pas implémenter le verrouillage/déverrouillage en V2 (V4 uniquement — besoin de mobile natif)
- Ne pas appeler Smartcar depuis le navigateur — toujours via Convex actions
- Ne pas synchroniser toutes les 15 minutes (rate limit Smartcar plan standard = 500 req/j)
- Ne pas bloquer la page véhicule si la connexion Smartcar est absente
- Ne pas stocker les tokens en clair — AES-256 obligatoire
- Ne pas tenter de connecter des véhicules incompatibles (Smartcar couvre ~40% des flottes FR 2026 — afficher la liste des marques compatibles dans l'UI)
