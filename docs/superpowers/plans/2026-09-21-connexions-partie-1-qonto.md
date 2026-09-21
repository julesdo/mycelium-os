# Connexions, partie 1 : un seul import, et Qonto en un clic — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommandé ici : une tâche à la fois, dans la session, sans flotte d'agents) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer la double saisie à l'entrée du produit : un seul geste d'import qui reconnaît tout, et une connexion Qonto en un clic qui fait arriver les factures clients et leur état de paiement, puis les tient à jour seule.

**Architecture:** Un traducteur pur dans le socle (`socle/connecteurs/qonto.ts`) convertit une facture Qonto dans la forme que l'import connaît déjà. La connexion OAuth, les jetons chiffrés, le webhook et la synchronisation vivent dans `convex/connexions/`, et écrivent par le chemin d'import existant (`recouvrement/import.enregistrerImport`), qui dédoublonne déjà. L'écran ne fait qu'afficher un état que le serveur tient à jour : la connexion se voit progresser sans qu'on recharge.

**Tech Stack:** Convex (actions, httpAction, crons, scheduler), API Business Qonto v2 (OAuth 2.0), Web Crypto (AES-GCM, HMAC-SHA256), React 19 + Cladd, Vitest.

**Spec:** ce plan porte sa propre conception (section « Conception » ci-dessous), issue du débat du 21/09/2026. Décisions consignées dans la mémoire `project_decisions_21_09_sans_avocat.md`.

## Global Constraints

- **Montants** : entiers de centimes en `bigint`, jamais de flottant. Tout montant écrit en texte décimal passe par `depuisEuros()` de `src/lib/socle/montants.ts`.
- **Multi-tenant** : chaque lecture et écriture est bornée par `organizationId`. Aucune fonction publique ne rend un jeton, même chiffré.
- **Lecture seule chez Qonto** : droits demandés `offline_access client_invoices.read webhook`, rien d'autre. Aucune écriture chez Qonto, aucun mouvement d'argent (ligne rouge 2). `organization.read` (transactions) est un droit **sensible** soumis à validation par Qonto : il n'est PAS demandé dans cette partie.
- **Jetons chiffrés au repos** (AES-256-GCM, `src/lib/convex/lib/crypto.ts`, clé `CONNEXIONS_CLE_CHIFFREMENT`).
- **Le piège Convex** : toute `action` / `internalAction` de `connexions/qonto.ts` annote le type de retour de son handler (`Promise<string>`, `Promise<null>`). Le module s'appelle lui-même par le planificateur ; sans annotation, l'inférence de tout `api` retombe en `any`.
- **Frontière du socle** : `src/lib/socle/**` n'importe ni `verticales/` ni `convex/` (test `frontiere.test.ts`).
- **Interface** : en français, contrôles Cladd uniquement, classes Tailwind seulement dans `src/ui/**`, mot « garantie » interdit, pas de tiret cadratin dans les textes affichés. Cibles tactiles 48 px.
- **⚠️ POLITIQUE DE TESTS — demande expresse de Jules, qui prime sur le TDD par défaut de la méthode.**
  - Tests unitaires **uniquement** pour la logique pure de la tâche 2 (montants, dates, SIREN, signature).
  - Chaque tâche finit par **un seul** `bun run check` (types), plus, quand la tâche touche le schéma, les trois tests-barrières ciblés nommés dans la tâche (quelques secondes).
  - **Ni la suite complète, ni le lint entre les tâches.** Une seule fois, en tâche 7, avant la dernière poussée.
  - **Un seul regard au navigateur**, en tâche 5, à 375 px et 1280 px. Pas de captures en série.
  - Si un test échoue sous charge (dépassement de délai), le relancer avec `--testTimeout=180000` avant de croire à une régression.
- **Commits** : `git commit --no-verify`, par chemin (jamais `git add -A`). **Poussée en production après chaque tâche** : `git push origin <sha>:main`, puis vérifier le statut Vercel.

---

## Conception

### Ce que le gérant fait, et rien de plus

1. Sur l'accueil vide, une carte **« Connecter Qonto »** en premier, et **« Importer des fichiers »** en second, sans choix de type : le produit reconnaît déjà seul un FEC, un export CSV, un PDF ou une photo (`socle/documents/csv.ts` détecte colonnes et séparateur, `enregistrerFichier` ne demande aucun type).
2. Il touche « Connecter Qonto ». Qonto s'ouvre, il se connecte et accepte. **C'est tout** : aucune clé à copier, aucun écran de réglage.
3. Il revient sur l'accueil. La carte dit « Lecture de vos factures… », puis « 42 factures lues… », et les rangées apparaissent à mesure (Convex est réactif, rien à recharger).
4. Ensuite, plus rien à faire : chaque facture créée ou payée dans Qonto remonte par webhook, et une synchronisation de secours passe toutes les six heures.

### Références retenues (Mobbin, iOS)

| Référence | Ce qu'on en prend |
|---|---|
| [Shop — suivi des commandes](https://mobbin.com/screens/8c01f92d-fd68-4144-9106-b5fae2ad6fd8) | « Connecter le compte » en principal, « Ajouter manuellement » juste dessous : exactement l'ordre connexion puis import |
| [Origin — connexion des comptes](https://mobbin.com/flows/80a2f3f2-6f83-4a6c-8ded-52b17b0e9594) | Retour dans l'app avec « compte connecté, les données se mettent à jour d'elles-mêmes dans quelques minutes » |
| [Monarch — connexion bancaire](https://mobbin.com/flows/8bb01eee-2e54-4a44-b51f-c9b83f825861) | L'état de connexion lisible : dernière mise à jour, statut sain, bouton de resynchronisation |
| [Claude — connecteurs](https://mobbin.com/screens/07fe271f-1684-44e6-877c-1ee4d9464de3) | Une rangée par service : « Connecté » discret ou bouton « Connecter » |
| [Mesh — intégrations](https://mobbin.com/screens/bdbb9c4b-d4cd-464f-85c4-df1c9ed52fa0) | « Synchronisé il y a 3 jours », « Synchroniser », « Déconnecter » au même endroit |
| [ANZ Plus — ajout d'un compte](https://mobbin.com/flows/76a1c2b3-817d-44b1-8982-1eeeee957620) | Dire précisément ce qui est lu, avant la connexion |

### Ce que Qonto permet, relevé dans sa documentation (21/09/2026)

- Servir d'autres entreprises exige **OAuth** (la clé API est prévue pour automatiser sa propre entreprise). Autorisation `https://oauth.qonto.com/oauth2/auth`, jetons `https://oauth.qonto.com/oauth2/token` (paramètres dans le corps du formulaire, pas d'en-tête `Basic`). Jeton d'accès valable **1 heure**, jeton de rafraîchissement **90 jours**, à usage unique.
- Bac à sable : `https://oauth-sandbox.staging.qonto.co/oauth2/{auth,token}`, API `https://thirdparty-sandbox.staging.qonto.co/v2`, en-tête `X-Qonto-Staging-Token` sur chaque appel serveur.
- `GET /v2/client_invoices` (droit `client_invoices.read`) : statuts `draft | unpaid | paid | canceled`, `total_amount_cents`, `amount_paid {value, currency}` **cumulé**, `issue_date`, `due_date`, `paid_at`, client (`name`, `first_name`, `last_name`, `vat_number`, `tax_identification_number`). Filtre `filter[updated_at_from]`, pagination `page` / `per_page`.
- Webhooks : `POST /v2/webhook_subscriptions` (droit `webhook` + celui des événements), types `v1/client-invoices` et `v1/consent-revocations`, signature `X-Qonto-Signature: t=…,v1=…` en HMAC-SHA256 de `"{t}.{corps brut}"`, réponse attendue en **moins d'une seconde**, relances exponentielles pendant quelques jours.
- Limites : 1 000 requêtes par 10 secondes, par adresse IP.

**Conséquence de conception :** pour qui facture dans Qonto, `client_invoices.read` suffit à connaître **factures et paiements**, sans le droit sensible. Les virements reçus pour des factures émises hors de Qonto (lecture des transactions) viendront en partie 3, après validation par Qonto.

### Le point délicat : un montant réglé cumulé

Qonto rend ce qui a été réglé **au total**, pas la liste des règlements. Enregistrer ce cumul comme un règlement à chaque synchronisation éteindrait deux fois la même dette. On enregistre donc le **complément** : `max(0, cumul Qonto − déjà enregistré)`. C'est la seule arithmétique neuve de cette partie, et elle est testée (tâche 2).

### Préalables — gestes de Jules, hors code

Sans eux, tout se déploie sans risque : la carte Qonto ne s'affiche simplement pas (`disponible: false`).

1. Créer un compte sur https://developers.qonto.com et une application « Letikette ».
2. Y déclarer les URL de retour, **exactement** : `<CONVEX_SITE_URL du déploiement de développement>/qonto/retour` pour le bac à sable, `<CONVEX_SITE_URL de production>/qonto/retour` pour la production (valeur visible dans le tableau de bord Convex, rubrique Settings → URL & Deploy Key, ou par `bunx convex env list`).
3. Récupérer `client_id`, `client_secret` et le jeton de bac à sable.
4. Générer la clé de chiffrement : `openssl rand -base64 32`.
5. Poser les variables (tâche 3, étape 1) sur le déploiement de développement (bac à sable) puis de production.
6. Demander l'accès production si le portail l'exige. D'après la documentation, seuls les droits sensibles demandent une validation, et cette partie n'en demande aucun.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/screens/file.tsx`, `src/screens/debiteurs.tsx` | Libellés d'import sans choix (tâche 1), carte de connexion sur l'accueil vide (tâche 5) |
| `src/lib/socle/connecteurs/qonto.ts` | **Créé.** Traducteur pur : facture Qonto → facture importable, SIREN, complément de règlement, signature de webhook |
| `src/lib/socle/__tests__/connecteur-qonto.test.ts` | **Créé.** Les seuls tests unitaires de la partie |
| `.env-convex.schema`, `src/lib/convex/convex-env.d.ts` | Cinq variables facultatives, types régénérés |
| `src/lib/convex/schema.ts` | Table `connexionsQonto` |
| `src/lib/convex/connexions/validateurs.ts` | **Créé.** Le validateur de statut, partagé par le schéma et les fonctions |
| `src/lib/convex/connexions/qontoConfig.ts` | **Créé.** Configuration lue dans l'environnement, adresses Qonto, en-têtes |
| `src/lib/convex/connexions/qontoDonnees.ts` | **Créé.** Requêtes et mutations : état public, lectures et écritures internes |
| `src/lib/convex/connexions/qonto.ts` | **Créé.** Actions : démarrer, retour OAuth, abonnement, synchronisation, webhook, déconnexion |
| `src/lib/convex/http.ts` | Routes `GET /qonto/retour` et `POST /qonto/webhook` |
| `src/lib/convex/crons.ts` | Synchronisation de secours toutes les six heures |
| `src/lib/convex/recouvrement/import.ts` | Argument facultatif `reglementsCumules` |
| `src/lib/convex/rgpd.ts` | Purge de `connexionsQonto` |
| `src/ui/carte-connexion.tsx`, `src/ui/index.ts` | **Créé.** La carte, ses six états, sans rien savoir de Qonto |
| `src/app/connexion-qonto.tsx` | **Créé.** La carte branchée sur Convex |
| `src/routes/app/index.tsx` | Passe la carte à l'accueil |
| `src/screens/compte/*.tsx`, `src/routes/app/compte.tsx`, `src/routes/-salle/*.tsx` | Section « Connexions » du compte, et la salle d'exposition |

---

### Task 1: Un seul geste d'import

Le serveur ne demande déjà aucun type de fichier. Seuls les libellés font croire qu'il faut choisir entre « un export comptable » et « des factures ».

**Files:**
- Modify: `src/screens/file.tsx` (fonction `FileVide`, vers la ligne 966)
- Modify: `src/screens/debiteurs.tsx` (vers la ligne 462)

**Interfaces:**
- Consumes: rien.
- Produces: le libellé « Importer des fichiers », repris tel quel en tâche 5.

- [ ] **Step 1: Relever toutes les occurrences du choix**

Run: `grep -rn "export comptable ou\|ou des factures\|ou vos factures" src --include=*.tsx`
Expected : au moins `src/screens/file.tsx` et `src/screens/debiteurs.tsx`. Traiter chaque occurrence trouvée, pas seulement ces deux.

- [ ] **Step 2: Réécrire le bouton de l'accueil vide**

Dans `src/screens/file.tsx`, dans `FileVide`, remplacer le contenu du `BoutonPrincipal` et ajouter une ligne d'aide juste après `</ZoneDepot>` :

```tsx
			<ZoneDepot
				accept={accepteFichiers}
				onFichiers={onFichiers}
				libellePhoto="Photographier une facture"
			>
				<BoutonPrincipal pleineLargeur>
					<UploadIcon />
					Importer des fichiers
				</BoutonPrincipal>
			</ZoneDepot>
			{/* Aucun choix à faire : le dépôt reconnaît seul un FEC, un export CSV, un
			    PDF ou une photo. Le dire évite qu'on se demande lequel déposer. */}
			<p className="text-cladd-2xs text-cladd-fg-soft">
				Export comptable, FEC, factures PDF ou photos : le format est reconnu seul.
			</p>
```

- [ ] **Step 3: Réécrire le vide de la liste des clients**

Dans `src/screens/debiteurs.tsx`, remplacer la chaîne `'Importez un export comptable ou vos factures de vente.'` par `'Importez vos fichiers de factures : le format est reconnu seul.'`. Faire de même pour toute autre occurrence relevée à l'étape 1.

- [ ] **Step 4: Vérifier les types**

Run: `bun run check`
Expected : aucune erreur.

- [ ] **Step 5: Commit et mise en production**

```bash
git add src/screens/file.tsx src/screens/debiteurs.tsx
git commit --no-verify -m "fix(import): un seul geste, le format est reconnu seul"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task 2: Le traducteur Qonto (socle, pur, testé)

**Files:**
- Create: `src/lib/socle/connecteurs/qonto.ts`
- Test: `src/lib/socle/__tests__/connecteur-qonto.test.ts`

**Interfaces:**
- Consumes: `depuisEuros`, `enCentimes` de `src/lib/socle/montants.ts`.
- Produces :
  - `interface FactureQonto`, `interface ClientQonto`, `interface MontantQonto` (forme de l'API, champs lus seulement)
  - `interface FactureDepuisQonto { reference: string; debiteur: string; debiteurSiren?: string; montantTTC: bigint; dateEmission: string; dateEcheance?: string; regleCumule: { montant: bigint; date: string } | null }`
  - `factureDepuisQonto(facture: FactureQonto, aujourdHui: string): FactureDepuisQonto | null`
  - `sirenDepuisClientQonto(client: ClientQonto): string | undefined`
  - `nomDuClientQonto(client: ClientQonto): string | undefined`
  - `complementDeReglement(cumule: bigint, dejaRegle: bigint): bigint`
  - `signatureQontoValide(corps: string, entete: string | null, secret: string, maintenantSecondes: number): Promise<boolean>`

- [ ] **Step 1: Écrire les tests**

Create `src/lib/socle/__tests__/connecteur-qonto.test.ts` :

```ts
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	complementDeReglement,
	factureDepuisQonto,
	signatureQontoValide,
	sirenDepuisClientQonto,
	type FactureQonto
} from '../connecteurs/qonto';

const AUJOURDHUI = '2026-09-21';

function facture(modif: Partial<FactureQonto> = {}): FactureQonto {
	return {
		id: 'f-1',
		number: 'F-2026-001',
		status: 'unpaid',
		issue_date: '2026-07-01',
		due_date: '2026-07-31',
		paid_at: null,
		total_amount_cents: 120000,
		total_amount: { value: '1200.00', currency: 'EUR' },
		amount_paid: { value: '0.00', currency: 'EUR' },
		client: { name: 'Imprimerie Martin', vat_number: 'FR44732829320' },
		...modif
	};
}

describe('factureDepuisQonto', () => {
	it('traduit une facture impayée, au centime et sans flottant', () => {
		expect(factureDepuisQonto(facture(), AUJOURDHUI)).toEqual({
			reference: 'F-2026-001',
			debiteur: 'Imprimerie Martin',
			debiteurSiren: '732829320',
			montantTTC: 120000n,
			dateEmission: '2026-07-01',
			dateEcheance: '2026-07-31',
			regleCumule: null
		});
	});

	it('rend le cumul réglé et le jour du paiement', () => {
		const payee = factureDepuisQonto(
			facture({
				status: 'paid',
				paid_at: '2026-08-12T09:30:00Z',
				amount_paid: { value: '1200.00', currency: 'EUR' }
			}),
			AUJOURDHUI
		);
		expect(payee?.regleCumule).toEqual({ montant: 120000n, date: '2026-08-12' });
	});

	it('solde une facture « payée » dont le montant réglé manque', () => {
		const payee = factureDepuisQonto(facture({ status: 'paid', amount_paid: null }), AUJOURDHUI);
		expect(payee?.regleCumule).toEqual({ montant: 120000n, date: AUJOURDHUI });
	});

	it('lit un règlement partiel écrit en décimal', () => {
		const partielle = factureDepuisQonto(
			facture({ amount_paid: { value: '300.10', currency: 'EUR' } }),
			AUJOURDHUI
		);
		expect(partielle?.regleCumule).toEqual({ montant: 30010n, date: AUJOURDHUI });
	});

	it('écarte un brouillon, une facture annulée et une facture en devise', () => {
		expect(factureDepuisQonto(facture({ status: 'draft' }), AUJOURDHUI)).toBeNull();
		expect(factureDepuisQonto(facture({ status: 'canceled' }), AUJOURDHUI)).toBeNull();
		expect(
			factureDepuisQonto(
				facture({ total_amount: { value: '1200.00', currency: 'USD' } }),
				AUJOURDHUI
			)
		).toBeNull();
	});

	it('écarte une facture sans numéro ou sans client nommé', () => {
		expect(factureDepuisQonto(facture({ number: null }), AUJOURDHUI)).toBeNull();
		expect(factureDepuisQonto(facture({ client: {} }), AUJOURDHUI)).toBeNull();
	});

	it('nomme un client particulier par son prénom et son nom', () => {
		const traduite = factureDepuisQonto(
			facture({ client: { first_name: 'Léa', last_name: 'Durand' } }),
			AUJOURDHUI
		);
		expect(traduite?.debiteur).toBe('Léa Durand');
		expect(traduite?.debiteurSiren).toBeUndefined();
	});
});

describe('sirenDepuisClientQonto', () => {
	it('prend les neuf premiers chiffres d’un SIRET', () => {
		expect(sirenDepuisClientQonto({ tax_identification_number: '732 829 320 00074' })).toBe(
			'732829320'
		);
	});

	it('extrait le SIREN d’un numéro de TVA français', () => {
		expect(sirenDepuisClientQonto({ vat_number: 'FR44732829320' })).toBe('732829320');
	});

	it('ne devine rien sans identifiant exploitable', () => {
		expect(sirenDepuisClientQonto({ vat_number: 'DE123456789' })).toBeUndefined();
		expect(sirenDepuisClientQonto({})).toBeUndefined();
	});
});

describe('complementDeReglement', () => {
	it('n’ajoute que ce qui manque au cumul', () => {
		expect(complementDeReglement(50000n, 30000n)).toBe(20000n);
	});

	it('n’ajoute rien quand tout est déjà enregistré, ou plus', () => {
		expect(complementDeReglement(30000n, 30000n)).toBe(0n);
		expect(complementDeReglement(20000n, 30000n)).toBe(0n);
	});
});

describe('signatureQontoValide', () => {
	const secret = 'secret-de-test-assez-long-pour-qonto-00000';
	const corps = '{"id":"f-1","status":"paid"}';
	const t = 1_790_000_000;
	const signe = (texte: string) => createHmac('sha256', secret).update(`${t}.${texte}`).digest('hex');

	it('accepte une signature exacte et fraîche', async () => {
		expect(await signatureQontoValide(corps, `t=${t},v1=${signe(corps)}`, secret, t + 10)).toBe(
			true
		);
	});

	it('refuse un corps modifié', async () => {
		expect(
			await signatureQontoValide(`${corps} `, `t=${t},v1=${signe(corps)}`, secret, t + 10)
		).toBe(false);
	});

	it('refuse une signature trop ancienne, ou absente', async () => {
		expect(await signatureQontoValide(corps, `t=${t},v1=${signe(corps)}`, secret, t + 600)).toBe(
			false
		);
		expect(await signatureQontoValide(corps, null, secret, t)).toBe(false);
	});
});
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `bunx vitest run src/lib/socle/__tests__/connecteur-qonto.test.ts`
Expected : FAIL, module `../connecteurs/qonto` introuvable.

- [ ] **Step 3: Écrire le traducteur**

Create `src/lib/socle/connecteurs/qonto.ts` :

```ts
import { depuisEuros, enCentimes } from '../montants';

/**
 * LE TRADUCTEUR QONTO : une facture client telle que l'API la rend, traduite
 * dans la forme que l'import connaît déjà.
 *
 * Pur, sans réseau ni base : c'est ce qui le rend testable, et c'est la seule
 * partie du connecteur qui porte de la logique (montants, dates, SIREN,
 * signature). Le reste, jetons, pagination et écriture, n'est que plomberie.
 */

export interface MontantQonto {
	readonly value: string;
	readonly currency: string;
}

export interface ClientQonto {
	readonly name?: string | null;
	readonly first_name?: string | null;
	readonly last_name?: string | null;
	readonly vat_number?: string | null;
	readonly tax_identification_number?: string | null;
}

/** Les champs lus d'une facture client Qonto — et seulement eux. */
export interface FactureQonto {
	readonly id: string;
	readonly number?: string | null;
	readonly status: string;
	readonly issue_date?: string | null;
	readonly due_date?: string | null;
	readonly paid_at?: string | null;
	readonly total_amount_cents: number;
	readonly total_amount: MontantQonto;
	readonly amount_paid?: MontantQonto | null;
	readonly client?: ClientQonto | null;
}

export interface FactureDepuisQonto {
	readonly reference: string;
	readonly debiteur: string;
	readonly debiteurSiren?: string;
	readonly montantTTC: bigint;
	readonly dateEmission: string;
	readonly dateEcheance?: string;
	/**
	 * Ce que Qonto dit avoir été réglé AU TOTAL, et le jour où on le constate.
	 * `null` : rien de réglé. Un cumul, jamais un règlement : voir
	 * `complementDeReglement`.
	 */
	readonly regleCumule: { readonly montant: bigint; readonly date: string } | null;
}

/**
 * LE SIREN, SEULEMENT QUAND IL SE LIT.
 *
 * Un SIRET en donne les neuf premiers chiffres ; un numéro de TVA français
 * s'écrit « FR », deux caractères de clé, puis le SIREN. Rien d'autre ne se
 * devine : un SIREN faux rattacherait des factures au mauvais débiteur.
 */
export function sirenDepuisClientQonto(client: ClientQonto): string | undefined {
	const identifiant = (client.tax_identification_number ?? '').replace(/\s/g, '');
	if (/^\d{9}$/.test(identifiant) || /^\d{14}$/.test(identifiant)) return identifiant.slice(0, 9);

	const tva = (client.vat_number ?? '').replace(/\s/g, '').toUpperCase();
	const trouve = /^FR[0-9A-Z]{2}(\d{9})$/.exec(tva);
	return trouve?.[1];
}

/** La raison sociale, sinon « prénom nom » pour un client particulier. */
export function nomDuClientQonto(client: ClientQonto): string | undefined {
	const societe = client.name?.trim();
	if (societe) return societe;
	const personne = [client.first_name, client.last_name]
		.map((part) => part?.trim() ?? '')
		.filter((part) => part !== '')
		.join(' ');
	return personne === '' ? undefined : personne;
}

/**
 * Une facture Qonto, prête pour l'import — ou `null` quand elle n'est pas une
 * créance : un brouillon ne l'est pas encore, une facture annulée ne l'est plus,
 * et une facture en devise n'entre pas plutôt que d'entrer fausse (le produit
 * compte en euros).
 */
export function factureDepuisQonto(
	facture: FactureQonto,
	aujourdHui: string
): FactureDepuisQonto | null {
	if (facture.status !== 'unpaid' && facture.status !== 'paid') return null;
	if (facture.total_amount.currency !== 'EUR') return null;

	const reference = facture.number?.trim();
	const dateEmission = facture.issue_date ?? undefined;
	const client = facture.client ?? undefined;
	const debiteur = client === undefined ? undefined : nomDuClientQonto(client);
	if (!reference || !dateEmission || client === undefined || !debiteur) return null;

	const montantTTC = BigInt(facture.total_amount_cents);
	const regle = facture.amount_paid ? enCentimes(depuisEuros(facture.amount_paid.value)) : 0n;
	// « paid » sans montant réglé renseigné : Qonto dit soldée, on la solde.
	const cumul = facture.status === 'paid' && regle === 0n ? montantTTC : regle;
	const siren = sirenDepuisClientQonto(client);

	return {
		reference,
		debiteur,
		...(siren === undefined ? {} : { debiteurSiren: siren }),
		montantTTC,
		dateEmission,
		...(facture.due_date ? { dateEcheance: facture.due_date } : {}),
		regleCumule:
			cumul > 0n ? { montant: cumul, date: facture.paid_at?.slice(0, 10) ?? aujourdHui } : null
	};
}

/**
 * CE QU'IL FAUT ENREGISTRER, ET PAS PLUS.
 *
 * Qonto rend un réglé CUMULÉ. L'enregistrer tel quel à chaque synchronisation
 * éteindrait deux fois la même dette. On n'ajoute que la différence avec ce qui
 * est déjà enregistré, et jamais un montant négatif.
 */
export function complementDeReglement(cumule: bigint, dejaRegle: bigint): bigint {
	return cumule > dejaRegle ? cumule - dejaRegle : 0n;
}

/** Au-delà, une signature est rejouée, pas fraîche. */
const TOLERANCE_SECONDES = 300;

/**
 * LA SIGNATURE D'UN WEBHOOK QONTO : `t=<horodatage>,v1=<signature>`, en
 * HMAC-SHA256 de `"<t>.<corps brut>"`.
 *
 * ⚠️ HEXADÉCIMAL OU BASE64 : la documentation ne dit pas l'encodage. Les deux
 * sont comparés, en temps constant ; accepter l'un ou l'autre ne relâche rien,
 * puisque les deux viennent du même secret.
 */
export async function signatureQontoValide(
	corps: string,
	entete: string | null,
	secret: string,
	maintenantSecondes: number
): Promise<boolean> {
	if (entete === null) return false;

	const parties = new Map<string, string>();
	for (const morceau of entete.split(',')) {
		const egal = morceau.indexOf('=');
		if (egal > 0) parties.set(morceau.slice(0, egal).trim(), morceau.slice(egal + 1).trim());
	}
	const t = parties.get('t');
	const v1 = parties.get('v1');
	if (t === undefined || v1 === undefined || !/^\d+$/.test(t)) return false;
	if (Math.abs(maintenantSecondes - Number(t)) > TOLERANCE_SECONDES) return false;

	const encodeur = new TextEncoder();
	const cle = await crypto.subtle.importKey(
		'raw',
		encodeur.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const brut = new Uint8Array(await crypto.subtle.sign('HMAC', cle, encodeur.encode(`${t}.${corps}`)));
	const hex = Array.from(brut, (octet) => octet.toString(16).padStart(2, '0')).join('');
	const base64 = btoa(String.fromCharCode(...brut));
	return egalEnTempsConstant(v1, hex) || egalEnTempsConstant(v1, base64);
}

function egalEnTempsConstant(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let difference = 0;
	for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return difference === 0;
}
```

- [ ] **Step 4: Vérifier qu'ils passent, et la frontière du socle**

Run: `bunx vitest run src/lib/socle/__tests__/connecteur-qonto.test.ts src/lib/socle/__tests__/frontiere.test.ts`
Expected : PASS (les deux fichiers).

- [ ] **Step 5: Commit et mise en production**

```bash
git add src/lib/socle/connecteurs/qonto.ts src/lib/socle/__tests__/connecteur-qonto.test.ts
git commit --no-verify -m "feat(socle): le traducteur Qonto, au centime, avec le complément de règlement"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task 3: La connexion Qonto (OAuth, jetons chiffrés, webhook)

À la fin de cette tâche, un établissement peut se connecter : les jetons sont chiffrés en base, l'abonnement aux webhooks est pris, et l'état est lisible. La synchronisation arrive en tâche 4, l'écran en tâche 5 : rien n'est encore visible pour le gérant, donc rien ne peut le surprendre.

**Files:**
- Modify: `.env-convex.schema`, puis régénérer `src/lib/convex/convex-env.d.ts`
- Create: `src/lib/convex/connexions/validateurs.ts`
- Create: `src/lib/convex/connexions/qontoConfig.ts`
- Create: `src/lib/convex/connexions/qontoDonnees.ts`
- Create: `src/lib/convex/connexions/qonto.ts`
- Modify: `src/lib/convex/schema.ts`
- Modify: `src/lib/convex/http.ts`
- Modify: `src/lib/convex/rgpd.ts` (purge)

**Interfaces:**
- Consumes: `encryptToken`, `decryptToken`, `requireEncryptionKey` (`src/lib/convex/lib/crypto.ts`) ; `organisationCourante`, `organisationCouranteOuNull`, `requireAdminDeLOrgCourante` (`src/lib/convex/lib/auth.ts`) ; `authedAction`, `authedQuery` (`src/lib/convex/functions.ts`).
- Produces :
  - table `connexionsQonto`, index `by_org`, `by_etat_oauth`, `by_qonto_organization`
  - `vStatutConnexionQonto`, `type StatutConnexionQonto = 'EN_ATTENTE' | 'SYNCHRONISATION' | 'A_JOUR' | 'ECHEC' | 'REVOQUEE'`
  - `configQonto(): ConfigQonto | null`, `entetesQonto(config, jeton?)`, `DROITS_QONTO`
  - `api.connexions.qontoDonnees.maConnexionQonto` → `{ disponible: boolean; statut: StatutConnexionQonto | null; derniereSynchro: number | null; facturesLues: number; erreur: string | null }`
  - `api.connexions.qonto.demarrerConnexionQonto` → `string` (l'adresse d'autorisation à ouvrir)
  - `api.connexions.qonto.deconnecterQonto` → `null`
  - `internal.connexions.qonto.abonner({ connexionId })`
  - `jetonValide(ctx, config, connexion): Promise<string>` (exporté pour la tâche 4)

- [ ] **Step 1: Déclarer les variables d'environnement**

Ajouter à la fin de `.env-convex.schema` :

```
# ====================================
# Connexion Qonto — lecture seule des factures clients
# ====================================
# Identifiants de l'application Letikette sur https://developers.qonto.com.
# Absents : la carte « Connecter Qonto » ne s'affiche pas, rien ne casse.
# @optional @sensitive
QONTO_CLIENT_ID=
# @optional @sensitive
QONTO_CLIENT_SECRET=
# « sandbox » pour le bac à sable ; absent ou « production » sinon.
# @optional
QONTO_ENVIRONNEMENT=
# Jeton du bac à sable, pris sur le portail développeur. Inutile en production.
# @optional @sensitive
QONTO_STAGING_TOKEN=
# Clé AES-256 en base64 qui chiffre les jetons des connexions : openssl rand -base64 32
# @optional @sensitive
CONNEXIONS_CLE_CHIFFREMENT=
```

Run: `bunx varlock typegen --path .env-convex.schema`
Expected : `src/lib/convex/convex-env.d.ts` régénéré avec les cinq clés.

- [ ] **Step 2: Le validateur de statut**

Create `src/lib/convex/connexions/validateurs.ts` :

```ts
import { v, type Infer } from 'convex/values';

/**
 * LES CINQ ÉTATS D'UNE CONNEXION, tels que l'écran les dit.
 *
 * EN_ATTENTE : le gérant est parti chez Qonto et n'est pas revenu.
 * SYNCHRONISATION : les factures arrivent. A_JOUR : tout est lu.
 * ECHEC : la dernière tentative a échoué, la connexion tient peut-être encore.
 * REVOQUEE : l'accès a été retiré depuis Qonto ; il faut se reconnecter.
 */
export const vStatutConnexionQonto = v.union(
	v.literal('EN_ATTENTE'),
	v.literal('SYNCHRONISATION'),
	v.literal('A_JOUR'),
	v.literal('ECHEC'),
	v.literal('REVOQUEE')
);

export type StatutConnexionQonto = Infer<typeof vStatutConnexionQonto>;
```

- [ ] **Step 3: La table**

Dans `src/lib/convex/schema.ts`, importer `import { vStatutConnexionQonto } from './connexions/validateurs';` et ajouter la table juste après `organizations` :

```ts
	/**
	 * LA CONNEXION D'UN ÉTABLISSEMENT À SON COMPTE QONTO.
	 *
	 * ⚠️ LES JETONS SONT CHIFFRÉS, ET AUCUNE FONCTION PUBLIQUE NE LES REND. Ils
	 * ouvrent les factures d'une entreprise : en clair, ils fuiraient avec la
	 * première sauvegarde exportée. `maConnexionQonto` ne rend que l'état.
	 *
	 * ⚠️ LECTURE SEULE. Les droits demandés ne permettent aucune écriture chez
	 * Qonto et aucun mouvement d'argent : ligne rouge 2.
	 */
	connexionsQonto: defineTable({
		organizationId: v.id('organizations'),
		statut: vStatutConnexionQonto,
		/** Le `state` OAuth en cours, et sa limite : dix minutes pour revenir de Qonto. */
		etatOAuth: v.optional(v.string()),
		etatExpireLe: v.optional(v.number()),
		jetonAccesChiffre: v.optional(v.string()),
		jetonRafraichissementChiffre: v.optional(v.string()),
		jetonExpireLe: v.optional(v.number()),
		secretWebhookChiffre: v.optional(v.string()),
		abonnementWebhookId: v.optional(v.string()),
		/** L'organisation côté Qonto : c'est par elle qu'un webhook retrouve sa connexion. */
		qontoOrganizationId: v.optional(v.string()),
		/** Horodatage ISO depuis lequel relire : le début de la dernière synchronisation réussie. */
		curseur: v.optional(v.string()),
		/** Posé au début d'une synchronisation : deux synchronisations ne se chevauchent pas. */
		synchroDebuteeLe: v.optional(v.number()),
		derniereSynchro: v.optional(v.number()),
		facturesLues: v.optional(v.number()),
		erreur: v.optional(v.string()),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_etat_oauth', ['etatOAuth'])
		.index('by_qonto_organization', ['qontoOrganizationId']),
```

- [ ] **Step 4: La configuration**

Create `src/lib/convex/connexions/qontoConfig.ts` :

```ts
/**
 * CE QU'IL FAUT POUR PARLER À QONTO, lu dans l'environnement.
 *
 * `null` quand l'application n'est pas encore déclarée chez Qonto : l'écran
 * n'affiche alors pas la carte, plutôt qu'un bouton qui échouerait.
 *
 * Les adresses sont celles de la documentation Qonto relevée le 21/09/2026.
 */
export interface ConfigQonto {
	readonly clientId: string;
	readonly clientSecret: string;
	readonly urlAutorisation: string;
	readonly urlJeton: string;
	readonly urlApi: string;
	readonly jetonStaging: string | undefined;
	readonly urlRetour: string;
	readonly urlWebhook: string;
	readonly urlApplication: string;
}

/** Lecture seule, plus le rafraîchissement et les webhooks. Aucun droit sensible. */
export const DROITS_QONTO = 'offline_access client_invoices.read webhook';

export function configQonto(): ConfigQonto | null {
	const clientId = process.env.QONTO_CLIENT_ID;
	const clientSecret = process.env.QONTO_CLIENT_SECRET;
	const site = process.env.CONVEX_SITE_URL;
	const application = process.env.SITE_URL;
	if (!clientId || !clientSecret || !site || !application) return null;

	const bacASable = process.env.QONTO_ENVIRONNEMENT === 'sandbox';
	return {
		clientId,
		clientSecret,
		urlAutorisation: bacASable
			? 'https://oauth-sandbox.staging.qonto.co/oauth2/auth'
			: 'https://oauth.qonto.com/oauth2/auth',
		urlJeton: bacASable
			? 'https://oauth-sandbox.staging.qonto.co/oauth2/token'
			: 'https://oauth.qonto.com/oauth2/token',
		urlApi: bacASable
			? 'https://thirdparty-sandbox.staging.qonto.co/v2'
			: 'https://thirdparty.qonto.com/v2',
		jetonStaging: bacASable ? process.env.QONTO_STAGING_TOKEN : undefined,
		urlRetour: `${site}/qonto/retour`,
		urlWebhook: `${site}/qonto/webhook`,
		urlApplication: application
	};
}

/** Le jeton d'accès, et l'en-tête du bac à sable quand on y est. */
export function entetesQonto(config: ConfigQonto, jeton?: string): Record<string, string> {
	return {
		...(jeton === undefined ? {} : { Authorization: `Bearer ${jeton}` }),
		...(config.jetonStaging === undefined ? {} : { 'X-Qonto-Staging-Token': config.jetonStaging })
	};
}
```

Si TypeScript refuse `process.env.CONVEX_SITE_URL` (variable système, absente du schéma), la déclarer à la fin de `.env-convex.schema` avec `# @optional` au-dessus et une ligne `CONVEX_SITE_URL=`, puis relancer la commande de l'étape 1.

- [ ] **Step 5: Les lectures et écritures**

Create `src/lib/convex/connexions/qontoDonnees.ts` :

```ts
import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { authedQuery } from '../functions';
import {
	organisationCourante,
	organisationCouranteOuNull,
	requireAdminDeLOrgCourante
} from '../lib/auth';
import { configQonto } from './qontoConfig';
import { vStatutConnexionQonto } from './validateurs';

/** Dix minutes : au-delà, une synchronisation « en cours » est tenue pour morte. */
const SYNCHRO_TENUE_POUR_MORTE_MS = 10 * 60 * 1000;

/**
 * CE QUE L'ÉCRAN SAIT D'UNE CONNEXION : son état, jamais ses jetons.
 */
export const maConnexionQonto = authedQuery({
	args: {},
	returns: v.object({
		disponible: v.boolean(),
		statut: v.union(v.null(), vStatutConnexionQonto),
		derniereSynchro: v.union(v.null(), v.number()),
		facturesLues: v.number(),
		erreur: v.union(v.null(), v.string())
	}),
	handler: async (ctx) => {
		const disponible = configQonto() !== null;
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		const connexion =
			organizationId === null
				? null
				: await ctx.db
						.query('connexionsQonto')
						.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
						.unique();
		return {
			disponible,
			statut: connexion?.statut ?? null,
			derniereSynchro: connexion?.derniereSynchro ?? null,
			facturesLues: connexion?.facturesLues ?? 0,
			erreur: connexion?.erreur ?? null
		};
	}
});

export const organisationAdministree = internalQuery({
	args: { userId: v.string() },
	returns: v.id('organizations'),
	handler: async (ctx, { userId }) => requireAdminDeLOrgCourante(ctx, userId)
});

export const organisationDuMembre = internalQuery({
	args: { userId: v.string() },
	returns: v.id('organizations'),
	handler: async (ctx, { userId }) => organisationCourante(ctx, userId)
});

export const connexionDeLOrganisation = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) =>
		ctx.db
			.query('connexionsQonto')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.unique()
});

export const lireConnexion = internalQuery({
	args: { connexionId: v.id('connexionsQonto') },
	handler: async (ctx, { connexionId }) => ctx.db.get(connexionId)
});

export const connexionParEtat = internalQuery({
	args: { etatOAuth: v.string() },
	handler: async (ctx, { etatOAuth }) =>
		ctx.db
			.query('connexionsQonto')
			.withIndex('by_etat_oauth', (q) => q.eq('etatOAuth', etatOAuth))
			.unique()
});

export const connexionParOrganisationQonto = internalQuery({
	args: { qontoOrganizationId: v.string() },
	handler: async (ctx, { qontoOrganizationId }) =>
		ctx.db
			.query('connexionsQonto')
			.withIndex('by_qonto_organization', (q) => q.eq('qontoOrganizationId', qontoOrganizationId))
			.unique()
});

/** Une ligne par établissement connecté : la table reste petite, un balayage suffit. */
export const connexionsASynchroniser = internalQuery({
	args: {},
	returns: v.array(v.id('connexionsQonto')),
	handler: async (ctx) => {
		const toutes = await ctx.db.query('connexionsQonto').collect();
		return toutes
			.filter(
				(c) =>
					c.statut !== 'REVOQUEE' &&
					c.statut !== 'EN_ATTENTE' &&
					c.jetonRafraichissementChiffre !== undefined
			)
			.map((c) => c._id);
	}
});

export const preparerConnexion = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		etatOAuth: v.string(),
		etatExpireLe: v.number()
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, etatOAuth, etatExpireLe }) => {
		const existante = await ctx.db
			.query('connexionsQonto')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.unique();
		if (existante === null) {
			await ctx.db.insert('connexionsQonto', {
				organizationId,
				statut: 'EN_ATTENTE',
				etatOAuth,
				etatExpireLe,
				creeLe: Date.now()
			});
		} else {
			await ctx.db.patch(existante._id, { etatOAuth, etatExpireLe, erreur: undefined });
		}
		return null;
	}
});

export const enregistrerJetons = internalMutation({
	args: {
		connexionId: v.id('connexionsQonto'),
		jetonAccesChiffre: v.string(),
		jetonRafraichissementChiffre: v.string(),
		jetonExpireLe: v.number(),
		/** Absent au premier retour de Qonto : l'écran passe alors en « lecture ». */
		garderStatut: v.optional(v.boolean())
	},
	returns: v.null(),
	handler: async (ctx, { connexionId, garderStatut, ...jetons }) => {
		await ctx.db.patch(connexionId, {
			...jetons,
			...(garderStatut
				? {}
				: {
						statut: 'SYNCHRONISATION' as const,
						etatOAuth: undefined,
						etatExpireLe: undefined,
						erreur: undefined
					})
		});
		return null;
	}
});

export const enregistrerAbonnement = internalMutation({
	args: {
		connexionId: v.id('connexionsQonto'),
		abonnementWebhookId: v.string(),
		secretWebhookChiffre: v.string(),
		qontoOrganizationId: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { connexionId, ...abonnement }) => {
		await ctx.db.patch(connexionId, abonnement);
		return null;
	}
});

export const marquerConnexion = internalMutation({
	args: {
		connexionId: v.id('connexionsQonto'),
		statut: vStatutConnexionQonto,
		erreur: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { connexionId, statut, erreur }) => {
		await ctx.db.patch(connexionId, { statut, erreur, synchroDebuteeLe: undefined });
		return null;
	}
});

/**
 * PRENDRE LA MAIN POUR SYNCHRONISER, ou rendre `null` si une autre
 * synchronisation tourne déjà. Deux synchronisations en parallèle
 * consommeraient deux fois le même jeton de rafraîchissement, qui est à usage
 * unique : la seconde échouerait, et la connexion passerait en échec pour rien.
 */
export const commencerSynchro = internalMutation({
	args: { connexionId: v.id('connexionsQonto') },
	handler: async (ctx, { connexionId }) => {
		const connexion = await ctx.db.get(connexionId);
		if (connexion === null || connexion.statut === 'REVOQUEE') return null;
		const enCours =
			connexion.synchroDebuteeLe !== undefined &&
			connexion.synchroDebuteeLe > Date.now() - SYNCHRO_TENUE_POUR_MORTE_MS;
		if (enCours) return null;
		await ctx.db.patch(connexionId, { statut: 'SYNCHRONISATION', synchroDebuteeLe: Date.now() });
		return connexion;
	}
});

export const avancerSynchro = internalMutation({
	args: { connexionId: v.id('connexionsQonto'), facturesLues: v.number() },
	returns: v.null(),
	handler: async (ctx, { connexionId, facturesLues }) => {
		await ctx.db.patch(connexionId, { facturesLues });
		return null;
	}
});

export const terminerSynchro = internalMutation({
	args: { connexionId: v.id('connexionsQonto'), curseur: v.string() },
	returns: v.null(),
	handler: async (ctx, { connexionId, curseur }) => {
		await ctx.db.patch(connexionId, {
			statut: 'A_JOUR',
			curseur,
			derniereSynchro: Date.now(),
			synchroDebuteeLe: undefined,
			erreur: undefined
		});
		return null;
	}
});

export const supprimerConnexion = internalMutation({
	args: { connexionId: v.id('connexionsQonto') },
	returns: v.null(),
	handler: async (ctx, { connexionId }) => {
		await ctx.db.delete(connexionId);
		return null;
	}
});
```

- [ ] **Step 6: Les actions et le retour OAuth**

Create `src/lib/convex/connexions/qonto.ts` :

```ts
import { v, ConvexError } from 'convex/values';
import { httpAction, internalAction, type ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { authedAction } from '../functions';
import { decryptToken, encryptToken, requireEncryptionKey } from '../lib/crypto';
import { DROITS_QONTO, configQonto, entetesQonto, type ConfigQonto } from './qontoConfig';

/**
 * LA CONNEXION QONTO : démarrer, revenir, s'abonner, se déconnecter.
 *
 * ⚠️ CHAQUE HANDLER ANNOTE SON TYPE DE RETOUR. Ce module se planifie lui-même
 * (`internal.connexions.qonto.*`) : sans annotation, l'inférence de tout `api`
 * retombe en `any`, et des dizaines d'erreurs surgissent dans des fichiers que
 * personne n'a touchés.
 */

const CLE_CHIFFREMENT = 'CONNEXIONS_CLE_CHIFFREMENT';
/** Dix minutes pour revenir de Qonto : au-delà, le `state` ne vaut plus rien. */
const DUREE_ETAT_MS = 10 * 60 * 1000;
/** On renouvelle le jeton d'accès cinq minutes avant qu'il n'expire. */
const MARGE_JETON_MS = 5 * 60 * 1000;

interface JetonsQonto {
	readonly access_token: string;
	readonly refresh_token: string;
	readonly expires_in: number;
}

function aleatoire(octets: number): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(octets)), (o) =>
		o.toString(16).padStart(2, '0')
	).join('');
}

async function demanderJetons(
	config: ConfigQonto,
	corps: Record<string, string>
): Promise<JetonsQonto> {
	// Qonto veut `client_id` et `client_secret` DANS LE CORPS, pas en `Basic`.
	const reponse = await fetch(config.urlJeton, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...entetesQonto(config) },
		body: new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			...corps
		})
	});
	if (!reponse.ok) throw new Error(`Qonto a refusé les jetons (${reponse.status})`);
	return (await reponse.json()) as JetonsQonto;
}

/**
 * UN JETON D'ACCÈS UTILISABLE : le stocké s'il vit encore, sinon un neuf.
 *
 * Le jeton de rafraîchissement est à usage unique : le neuf est enregistré
 * aussitôt, sinon la prochaine synchronisation présenterait un jeton déjà brûlé.
 */
export async function jetonValide(
	ctx: ActionCtx,
	config: ConfigQonto,
	connexion: Doc<'connexionsQonto'>
): Promise<string> {
	const cle = requireEncryptionKey(CLE_CHIFFREMENT);
	if (
		connexion.jetonAccesChiffre !== undefined &&
		connexion.jetonExpireLe !== undefined &&
		connexion.jetonExpireLe - MARGE_JETON_MS > Date.now()
	) {
		return decryptToken(connexion.jetonAccesChiffre, cle);
	}
	if (connexion.jetonRafraichissementChiffre === undefined) {
		throw new Error('Aucun jeton de rafraîchissement');
	}
	const jetons = await demanderJetons(config, {
		grant_type: 'refresh_token',
		refresh_token: await decryptToken(connexion.jetonRafraichissementChiffre, cle)
	});
	await ctx.runMutation(internal.connexions.qontoDonnees.enregistrerJetons, {
		connexionId: connexion._id,
		jetonAccesChiffre: await encryptToken(jetons.access_token, cle),
		jetonRafraichissementChiffre: await encryptToken(jetons.refresh_token, cle),
		jetonExpireLe: Date.now() + jetons.expires_in * 1000,
		garderStatut: true
	});
	return jetons.access_token;
}

/** Rend l'adresse Qonto à ouvrir dans le navigateur du gérant. */
export const demarrerConnexionQonto = authedAction({
	args: {},
	returns: v.string(),
	handler: async (ctx): Promise<string> => {
		const config = configQonto();
		if (config === null) throw new ConvexError('La connexion Qonto n’est pas encore activée.');

		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.qontoDonnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		const etat = aleatoire(24);
		await ctx.runMutation(internal.connexions.qontoDonnees.preparerConnexion, {
			organizationId,
			etatOAuth: etat,
			etatExpireLe: Date.now() + DUREE_ETAT_MS
		});

		const url = new URL(config.urlAutorisation);
		url.searchParams.set('client_id', config.clientId);
		url.searchParams.set('redirect_uri', config.urlRetour);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('scope', DROITS_QONTO);
		url.searchParams.set('state', etat);
		return url.toString();
	}
});

/**
 * LE RETOUR DE QONTO. Le code s'échange ici, côté serveur : le secret de
 * l'application ne passe jamais par le navigateur. Puis on renvoie le gérant
 * sur l'accueil, où la carte dit elle-même où en est la connexion.
 */
export const retourQonto = httpAction(async (ctx, requete) => {
	const config = configQonto();
	const parametres = new URL(requete.url).searchParams;
	const accueil = `${config?.urlApplication ?? ''}/app`;
	const etat = parametres.get('state');
	if (config === null || etat === null) return Response.redirect(accueil, 302);

	const connexion = await ctx.runQuery(internal.connexions.qontoDonnees.connexionParEtat, {
		etatOAuth: etat
	});
	if (connexion === null || (connexion.etatExpireLe ?? 0) < Date.now()) {
		return Response.redirect(accueil, 302);
	}

	const code = parametres.get('code');
	if (code === null) {
		// Le gérant a refusé chez Qonto, ou Qonto a renvoyé une erreur.
		await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
			connexionId: connexion._id,
			statut: 'ECHEC',
			erreur: 'La connexion a été annulée chez Qonto.'
		});
		return Response.redirect(accueil, 302);
	}

	try {
		const jetons = await demanderJetons(config, {
			grant_type: 'authorization_code',
			code,
			redirect_uri: config.urlRetour
		});
		const cle = requireEncryptionKey(CLE_CHIFFREMENT);
		await ctx.runMutation(internal.connexions.qontoDonnees.enregistrerJetons, {
			connexionId: connexion._id,
			jetonAccesChiffre: await encryptToken(jetons.access_token, cle),
			jetonRafraichissementChiffre: await encryptToken(jetons.refresh_token, cle),
			jetonExpireLe: Date.now() + jetons.expires_in * 1000
		});
		await ctx.scheduler.runAfter(0, internal.connexions.qonto.abonner, {
			connexionId: connexion._id
		});
	} catch {
		await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
			connexionId: connexion._id,
			statut: 'ECHEC',
			erreur: 'Qonto n’a pas confirmé la connexion. Réessayez.'
		});
	}
	return Response.redirect(accueil, 302);
});

/**
 * S'ABONNER AUX WEBHOOKS : chaque facture créée ou payée chez Qonto remonte
 * alors d'elle-même. Un échec ici ne casse pas la connexion : la
 * synchronisation de secours, toutes les six heures, rattrape tout.
 */
export const abonner = internalAction({
	args: { connexionId: v.id('connexionsQonto') },
	returns: v.null(),
	handler: async (ctx, { connexionId }): Promise<null> => {
		const config = configQonto();
		const connexion = await ctx.runQuery(internal.connexions.qontoDonnees.lireConnexion, {
			connexionId
		});
		if (config === null || connexion === null) return null;

		try {
			const jeton = await jetonValide(ctx, config, connexion);
			const secret = aleatoire(32);
			const reponse = await fetch(`${config.urlApi}/webhook_subscriptions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...entetesQonto(config, jeton) },
				body: JSON.stringify({
					callback_url: config.urlWebhook,
					types: ['v1/client-invoices', 'v1/consent-revocations'],
					secret,
					description: 'Letikette'
				})
			});
			if (reponse.ok) {
				const brut = (await reponse.json()) as {
					webhook_subscription?: { id: string; organization_id: string };
					id?: string;
					organization_id?: string;
				};
				const abonnement = brut.webhook_subscription ?? brut;
				if (abonnement.id !== undefined && abonnement.organization_id !== undefined) {
					await ctx.runMutation(internal.connexions.qontoDonnees.enregistrerAbonnement, {
						connexionId,
						abonnementWebhookId: abonnement.id,
						secretWebhookChiffre: await encryptToken(
							secret,
							requireEncryptionKey(CLE_CHIFFREMENT)
						),
						qontoOrganizationId: abonnement.organization_id
					});
				}
			}
		} catch {
			// Le rattrapage périodique couvre un abonnement manqué.
		}

		// ⚠️ TÂCHE 4 REMPLACE CETTE LIGNE par la planification de `synchroniser`.
		await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
			connexionId,
			statut: 'A_JOUR'
		});
		return null;
	}
});

/** Retirer la connexion : l'abonnement chez Qonto d'abord, puis la ligne. */
export const deconnecterQonto = authedAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.qontoDonnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		const connexion = await ctx.runQuery(
			internal.connexions.qontoDonnees.connexionDeLOrganisation,
			{ organizationId }
		);
		if (connexion === null) return null;

		const config = configQonto();
		if (config !== null && connexion.abonnementWebhookId !== undefined) {
			try {
				const jeton = await jetonValide(ctx, config, connexion);
				await fetch(`${config.urlApi}/webhook_subscriptions/${connexion.abonnementWebhookId}`, {
					method: 'DELETE',
					headers: entetesQonto(config, jeton)
				});
			} catch {
				// Un abonnement resté chez Qonto n'ouvre rien : sa connexion n'existe plus ici.
			}
		}
		await ctx.runMutation(internal.connexions.qontoDonnees.supprimerConnexion, {
			connexionId: connexion._id
		});
		return null;
	}
});
```

- [ ] **Step 7: La route de retour**

Dans `src/lib/convex/http.ts`, importer `import { retourQonto } from './connexions/qonto';` et ajouter avant `export default http;` :

```ts
// Retour OAuth de Qonto — à déclarer à l'identique sur https://developers.qonto.com :
// https://<deployment>.convex.site/qonto/retour
http.route({ path: '/qonto/retour', method: 'GET', handler: retourQonto });
```

- [ ] **Step 8: La purge**

Dans `src/lib/convex/rgpd.ts` : ajouter `| 'connexionsQonto'` à l'union du paramètre `table` de `viderParIndexOrg`, et dans `purgerEtablissement`, à côté des autres appels `viderParIndexOrg` :

```ts
		// Les jetons Qonto d'un établissement effacé partent avec lui : un jeton
		// orphelin ouvrirait encore ses factures.
		budget = await viderParIndexOrg(ctx, 'connexionsQonto', organizationId, budget);
```

- [ ] **Step 9: Types et barrières du schéma**

Run: `bun run check && bunx vitest run src/lib/convex/__tests__/purge-complete.test.ts`
Expected : aucune erreur de type, la purge couvre la nouvelle table.

Deux barrières attendent leur tâche, et ne se lancent pas ici :
- `champs-alimentes` : `curseur` et `secretWebhookChiffre` sont écrits ici mais lus seulement par la synchronisation et le webhook, en **tâche 4**.
- `fonctions-appelees` : `maConnexionQonto`, `demarrerConnexionQonto` et `deconnecterQonto` n'ont d'appelant qu'avec l'écran, en **tâche 5**.

- [ ] **Step 10: Commit et mise en production**

```bash
git add .env-convex.schema src/lib/convex/convex-env.d.ts src/lib/convex/schema.ts src/lib/convex/connexions src/lib/convex/http.ts src/lib/convex/rgpd.ts src/lib/convex/_generated
git commit --no-verify -m "feat(connexions): la connexion Qonto, jetons chiffrés, lecture seule"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task 4: La synchronisation (import, webhook, rattrapage)

**Files:**
- Modify: `src/lib/convex/recouvrement/import.ts` (argument `reglementsCumules`)
- Modify: `src/lib/convex/connexions/qonto.ts` (`synchroniser`, `synchroniserToutes`, `synchroniserMaintenant`, `webhookQonto`, fin de `abonner`)
- Modify: `src/lib/convex/http.ts` (route du webhook)
- Modify: `src/lib/convex/crons.ts`

**Interfaces:**
- Consumes: `factureDepuisQonto`, `complementDeReglement`, `signatureQontoValide`, `FactureQonto`, `FactureDepuisQonto` (tâche 2) ; `jetonValide`, `configQonto`, `entetesQonto`, fonctions de `qontoDonnees` (tâche 3).
- Produces :
  - `enregistrerImport` accepte `reglementsCumules?: { reference: string; date: string; montantCumule: bigint }[]`
  - `internal.connexions.qonto.synchroniser({ connexionId })`
  - `api.connexions.qonto.synchroniserMaintenant` → `null`

- [ ] **Step 1: Le cumul réglé dans l'import**

Dans `src/lib/convex/recouvrement/import.ts` :

1. Importer `import { complementDeReglement } from '../../socle/connecteurs/qonto';`
2. Ajouter aux `args` de `enregistrerImport`, après `reglements` :

```ts
		/**
		 * DES RÉGLÉS CUMULÉS, pas des règlements : ce que rend une source qui ne
		 * donne que le total payé d'une facture (Qonto). Seul le complément de ce
		 * qui est déjà enregistré entre : resynchroniser n'éteint jamais deux fois
		 * la même dette.
		 */
		reglementsCumules: v.optional(
			v.array(v.object({ reference: v.string(), date: v.string(), montantCumule: v.int64() }))
		),
```

3. Ajouter `reglementsCumules` à la déstructuration des arguments du handler.
4. Juste après la boucle `for (const reglement of reglements) { … }` et avant la boucle qui recalcule `statutPaiement`, insérer :

```ts
		for (const cumul of reglementsCumules ?? []) {
			let cible = touchees.get(cumul.reference);
			if (cible === undefined) {
				const trouvee = await factureParReference(ctx, organizationId, cumul.reference);
				if (trouvee === null) {
					reglementsOrphelins++;
					continue;
				}
				cible = {
					id: trouvee._id,
					montantTTC: trouvee.montantTTC,
					debiteurId: trouvee.debiteurId
				};
				touchees.set(cumul.reference, cible);
				debiteursTouches.add(trouvee.debiteurId);
			}

			const factureId = cible.id;
			const existants = await ctx.db
				.query('reglements')
				.withIndex('by_facture', (q) => q.eq('factureId', factureId))
				.collect();
			const dejaRegle = existants.reduce((somme, r) => somme + r.montant, 0n);
			const complement = complementDeReglement(cumul.montantCumule, dejaRegle);
			if (complement === 0n) continue;

			await ctx.db.insert('reglements', {
				organizationId,
				factureId,
				date: cumul.date,
				montant: complement,
				nature: 'PAIEMENT',
				creeLe: Date.now()
			});
			reglementsCrees++;
		}
```

- [ ] **Step 2: La synchronisation**

Dans `src/lib/convex/connexions/qonto.ts`, compléter les imports :

```ts
import {
	factureDepuisQonto,
	signatureQontoValide,
	type FactureDepuisQonto,
	type FactureQonto
} from '../../socle/connecteurs/qonto';
```

puis ajouter à la fin du fichier :

```ts
/** Un accès retiré depuis Qonto : se reconnecter, pas réessayer. */
class AccesRetire extends Error {}

/**
 * LIRE LES FACTURES QONTO MODIFIÉES DEPUIS LA DERNIÈRE FOIS, et les écrire par
 * le chemin d'import, qui dédoublonne déjà par référence.
 *
 * Le curseur est l'heure de DÉBUT de la synchronisation réussie : une facture
 * modifiée pendant la lecture sera relue la fois suivante, ce qui ne coûte
 * rien, puisque l'import est idempotent.
 */
export const synchroniser = internalAction({
	args: { connexionId: v.id('connexionsQonto') },
	returns: v.null(),
	handler: async (ctx, { connexionId }): Promise<null> => {
		const config = configQonto();
		if (config === null) return null;
		const connexion = await ctx.runMutation(internal.connexions.qontoDonnees.commencerSynchro, {
			connexionId
		});
		if (connexion === null) return null;

		const debut = new Date().toISOString();
		const aujourdHui = debut.slice(0, 10);
		try {
			const jeton = await jetonValide(ctx, config, connexion);
			let page: number | null = 1;
			let importees = 0;

			while (page !== null) {
				const url = new URL(`${config.urlApi}/client_invoices`);
				url.searchParams.set('page', String(page));
				url.searchParams.set('per_page', '100');
				if (connexion.curseur !== undefined) {
					url.searchParams.set('filter[updated_at_from]', connexion.curseur);
				}
				const reponse = await fetch(url, { headers: entetesQonto(config, jeton) });
				if (reponse.status === 401 || reponse.status === 403) throw new AccesRetire();
				if (!reponse.ok) throw new Error(`Qonto a répondu ${reponse.status}`);

				const corps = (await reponse.json()) as {
					client_invoices?: FactureQonto[];
					meta?: { next_page?: number | null };
				};
				const factures = (corps.client_invoices ?? [])
					.map((facture) => factureDepuisQonto(facture, aujourdHui))
					.filter((facture): facture is FactureDepuisQonto => facture !== null);

				if (factures.length > 0) {
					await ctx.runMutation(internal.recouvrement.import.enregistrerImport, {
						organizationId: connexion.organizationId,
						factures: factures.map(({ regleCumule: _regle, ...facture }) => facture),
						reglements: [],
						reglementsCumules: factures.flatMap((facture) =>
							facture.regleCumule === null
								? []
								: [
										{
											reference: facture.reference,
											date: facture.regleCumule.date,
											montantCumule: facture.regleCumule.montant
										}
									]
						),
						aujourdHui
					});
				}
				importees += factures.length;
				await ctx.runMutation(internal.connexions.qontoDonnees.avancerSynchro, {
					connexionId,
					facturesLues: (connexion.facturesLues ?? 0) + importees
				});
				page = corps.meta?.next_page ?? null;
			}

			await ctx.runMutation(internal.connexions.qontoDonnees.terminerSynchro, {
				connexionId,
				curseur: debut
			});
		} catch (erreur) {
			await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
				connexionId,
				statut: erreur instanceof AccesRetire ? 'REVOQUEE' : 'ECHEC',
				erreur:
					erreur instanceof AccesRetire
						? 'L’accès a été retiré depuis Qonto.'
						: 'La lecture des factures Qonto a échoué. Elle sera retentée.'
			});
		}
		return null;
	}
});

/** Le rattrapage : toutes les connexions vivantes, toutes les six heures. */
export const synchroniserToutes = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const connexions: Id<'connexionsQonto'>[] = await ctx.runQuery(
			internal.connexions.qontoDonnees.connexionsASynchroniser,
			{}
		);
		for (const connexionId of connexions) {
			await ctx.scheduler.runAfter(0, internal.connexions.qonto.synchroniser, { connexionId });
		}
		return null;
	}
});

/** Le bouton « Synchroniser » : n'importe quel membre peut le toucher. */
export const synchroniserMaintenant = authedAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.qontoDonnees.organisationDuMembre,
			{ userId: ctx.user._id }
		);
		const connexion = await ctx.runQuery(
			internal.connexions.qontoDonnees.connexionDeLOrganisation,
			{ organizationId }
		);
		if (connexion !== null) {
			await ctx.scheduler.runAfter(0, internal.connexions.qonto.synchroniser, {
				connexionId: connexion._id
			});
		}
		return null;
	}
});

/**
 * LE WEBHOOK QONTO. Il doit répondre en moins d'une seconde : on vérifie la
 * signature, on PLANIFIE la synchronisation, et on rend la main aussitôt.
 */
export const webhookQonto = httpAction(async (ctx, requete) => {
	const corps = await requete.text();
	let evenement: {
		event_type?: string;
		type?: string;
		organization_id?: string;
		data?: { organization_id?: string };
	};
	try {
		evenement = JSON.parse(corps) as typeof evenement;
	} catch {
		return new Response(null, { status: 400 });
	}

	const qontoOrganizationId = evenement.organization_id ?? evenement.data?.organization_id;
	if (qontoOrganizationId === undefined) return new Response(null, { status: 200 });

	const connexion = await ctx.runQuery(
		internal.connexions.qontoDonnees.connexionParOrganisationQonto,
		{ qontoOrganizationId }
	);
	if (connexion === null || connexion.secretWebhookChiffre === undefined) {
		return new Response(null, { status: 200 });
	}

	const secret = await decryptToken(
		connexion.secretWebhookChiffre,
		requireEncryptionKey(CLE_CHIFFREMENT)
	);
	const signee = await signatureQontoValide(
		corps,
		requete.headers.get('X-Qonto-Signature'),
		secret,
		Math.floor(Date.now() / 1000)
	);
	if (!signee) return new Response(null, { status: 401 });

	const type = evenement.event_type ?? evenement.type ?? '';
	if (type.includes('consent')) {
		await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
			connexionId: connexion._id,
			statut: 'REVOQUEE',
			erreur: 'L’accès a été retiré depuis Qonto.'
		});
	} else {
		await ctx.scheduler.runAfter(0, internal.connexions.qonto.synchroniser, {
			connexionId: connexion._id
		});
	}
	return new Response(null, { status: 200 });
});
```

- [ ] **Step 3: Brancher la première synchronisation**

Dans la fonction `abonner` du même fichier, remplacer le bloc final :

```ts
		// ⚠️ TÂCHE 4 REMPLACE CETTE LIGNE par la planification de `synchroniser`.
		await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
			connexionId,
			statut: 'A_JOUR'
		});
		return null;
```

par :

```ts
		// La première lecture part tout de suite : le gérant revient de Qonto et
		// regarde l'accueil se remplir.
		await ctx.scheduler.runAfter(0, internal.connexions.qonto.synchroniser, { connexionId });
		return null;
```

- [ ] **Step 4: La route du webhook et le rattrapage**

Dans `src/lib/convex/http.ts`, compléter l'import en `import { retourQonto, webhookQonto } from './connexions/qonto';` et ajouter :

```ts
// Webhooks Qonto (factures clients, retrait d'accès), signés en HMAC-SHA256.
http.route({ path: '/qonto/webhook', method: 'POST', handler: webhookQonto });
```

Dans `src/lib/convex/crons.ts`, ajouter :

```ts
// LE RATTRAPAGE QONTO. Les webhooks font le temps réel ; celui-ci rattrape ce
// qu'ils auraient manqué, et renouvelle au passage les jetons de rafraîchissement
// (90 jours), qui ne s'éteignent donc jamais sur une connexion vivante.
crons.interval('synchroQonto', { hours: 6 }, internal.connexions.qonto.synchroniserToutes, {});
```

- [ ] **Step 5: Types**

Run: `bun run check && bunx vitest run src/lib/convex/__tests__/champs-alimentes.test.ts`
Expected : aucune erreur de type ; `champs-alimentes` passe, chaque champ de `connexionsQonto` étant désormais écrit ET lu. S'il en signale un, le lire là où il a un sens ou le retirer, jamais l'inscrire en exception sans raison.

Si des dizaines d'erreurs `TS7006 implicitly has an 'any' type` apparaissent ailleurs, c'est le cycle d'inférence : chercher dans `connexions/qonto.ts` un handler dont le type de retour n'est pas annoté.

- [ ] **Step 6: Commit et mise en production**

```bash
git add src/lib/convex/recouvrement/import.ts src/lib/convex/connexions/qonto.ts src/lib/convex/http.ts src/lib/convex/crons.ts src/lib/convex/_generated
git commit --no-verify -m "feat(connexions): les factures Qonto arrivent seules, par webhook et par rattrapage"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task 5: La carte de connexion sur l'accueil

**Files:**
- Create: `src/ui/carte-connexion.tsx`
- Modify: `src/ui/index.ts`
- Create: `src/app/connexion-qonto.tsx`
- Modify: `src/screens/file.tsx` (`FileAffichee`, `FileVide`)
- Modify: `src/routes/app/index.tsx`
- Modify: `src/routes/-salle/file.tsx` (variante vierge)

**Interfaces:**
- Consumes: `api.connexions.qontoDonnees.maConnexionQonto`, `api.connexions.qonto.demarrerConnexionQonto`, `api.connexions.qonto.synchroniserMaintenant`, `api.connexions.qonto.deconnecterQonto` ; `useMinute`, `minutesDepuis` (`src/screens/import/horloge.ts`).
- Produces :
  - `type EtatConnexion` et `CarteConnexion` (`src/ui/carte-connexion.tsx`)
  - `CarteQontoBranchee` (`src/app/connexion-qonto.tsx`)
  - `FileAffichee.connexion?: ReactNode`

- [ ] **Step 1: La carte, qui ne sait rien de Qonto**

Create `src/ui/carte-connexion.tsx` :

```tsx
import type { ReactNode } from 'react';
import { Spinner } from '@cladd-ui/react';
import { CheckCircle2Icon } from 'lucide-react';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { pluriel } from './format';

/**
 * UNE CONNEXION À UN LOGICIEL DE FACTURATION : ce qu'elle promet, où elle en
 * est, et le seul geste utile à cet instant.
 *
 * Références : Shop (connecter en premier, le manuel en second), Monarch et
 * Mesh (dernière mise à jour, resynchroniser, déconnecter au même endroit),
 * Origin (le retour dit que tout se remplit seul). Un seul bouton principal
 * par état : il n'y a jamais deux choses à faire en même temps.
 */
export type EtatConnexion =
	| { readonly genre: 'A_CONNECTER' }
	| { readonly genre: 'REDIRECTION' }
	| { readonly genre: 'SYNCHRONISATION'; readonly facturesLues: number }
	| { readonly genre: 'A_JOUR'; readonly depuis: string; readonly facturesLues: number }
	| { readonly genre: 'ECHEC'; readonly message: string }
	| { readonly genre: 'REVOQUEE' };

function ligneDEtat(etat: EtatConnexion, promesse: string): string {
	switch (etat.genre) {
		case 'A_CONNECTER':
			return promesse;
		case 'REDIRECTION':
			return 'Ouverture de la connexion…';
		case 'SYNCHRONISATION':
			return etat.facturesLues === 0
				? 'Lecture de vos factures…'
				: `${etat.facturesLues} facture${pluriel(etat.facturesLues)} lue${pluriel(etat.facturesLues)}…`;
		case 'A_JOUR':
			return `À jour ${etat.depuis} · ${etat.facturesLues} facture${pluriel(etat.facturesLues)}`;
		case 'ECHEC':
			return etat.message;
		case 'REVOQUEE':
			return 'L’accès a été retiré. Reconnectez-vous pour reprendre la lecture.';
	}
}

export function CarteConnexion({
	nom,
	promesse,
	logo,
	etat,
	onConnecter,
	onSynchroniser,
	onDeconnecter
}: {
	nom: string;
	/** Ce que la connexion fait, en une phrase, avant qu'on la touche. */
	promesse: string;
	logo: ReactNode;
	etat: EtatConnexion;
	onConnecter: () => void;
	onSynchroniser: () => void;
	onDeconnecter: () => void;
}) {
	const occupe = etat.genre === 'REDIRECTION' || etat.genre === 'SYNCHRONISATION';
	return (
		<div className="verre-carte flex flex-col gap-cladd-2xs rounded-cladd-xl p-cladd-xs">
			<div className="flex items-center gap-cladd-2xs">
				<span
					aria-hidden
					className="flex size-cladd-md shrink-0 items-center justify-center overflow-hidden rounded-cladd-2xs bg-cladd-surface-cut"
				>
					{logo}
				</span>
				<div className="min-w-0 flex-1">
					<p className="text-cladd-sm font-semibold">{nom}</p>
					<p role="status" className="text-cladd-2xs leading-snug text-cladd-fg-soft">
						{ligneDEtat(etat, promesse)}
					</p>
				</div>
				{occupe ? <Spinner size="md" /> : null}
				{etat.genre === 'A_JOUR' ? (
					<CheckCircle2Icon aria-hidden className="size-5 shrink-0 text-cladd-fg-soft" />
				) : null}
			</div>

			{etat.genre === 'A_CONNECTER' ? (
				<BoutonPrincipal pleineLargeur onClick={onConnecter}>
					Connecter {nom}
				</BoutonPrincipal>
			) : etat.genre === 'ECHEC' || etat.genre === 'REVOQUEE' ? (
				<BoutonPrincipal pleineLargeur onClick={onConnecter}>
					Reconnecter {nom}
				</BoutonPrincipal>
			) : etat.genre === 'A_JOUR' ? (
				<div className="flex flex-wrap gap-2">
					<BoutonSecondaire onClick={onSynchroniser}>Synchroniser</BoutonSecondaire>
					<BoutonSecondaire onClick={onDeconnecter}>Déconnecter</BoutonSecondaire>
				</div>
			) : null}
		</div>
	);
}
```

Dans `src/ui/index.ts`, ajouter en fin de fichier :

```ts
export { CarteConnexion, type EtatConnexion } from './carte-connexion';
```

Vérifier au passage, dans `src/ui/format.ts`, que `pluriel` est bien exporté sous ce nom (il l'est à ce jour) ; sinon importer depuis `./index`.

- [ ] **Step 2: La carte branchée**

Create `src/app/connexion-qonto.tsx` :

```tsx
import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { minutesDepuis, useMinute } from '../screens/import/horloge';
import { CarteConnexion, type EtatConnexion } from '../ui';

/**
 * LA CARTE QONTO, BRANCHÉE.
 *
 * ⚠️ L'ÉTAT VIENT DU SERVEUR, PAS DE L'ÉCRAN. Au retour de Qonto, rien n'est
 * gardé dans le navigateur : `maConnexionQonto` dit « lecture », puis le nombre
 * de factures lues, puis « à jour », parce que Convex pousse chaque changement.
 * Seul l'instant entre le clic et le départ vers Qonto est local.
 */
function depuisLisible(quand: number, minute: number | null): string {
	const minutes = minutesDepuis(quand, minute);
	if (minutes === null || minutes < 1) return 'à l’instant';
	if (minutes < 60) return `il y a ${minutes} min`;
	const heures = Math.floor(minutes / 60);
	return heures < 24 ? `il y a ${heures} h` : `il y a ${Math.floor(heures / 24)} j`;
}

export function CarteQontoBranchee() {
	const connexion = useQuery(api.connexions.qontoDonnees.maConnexionQonto, {});
	const demarrer = useAction(api.connexions.qonto.demarrerConnexionQonto);
	const synchroniser = useAction(api.connexions.qonto.synchroniserMaintenant);
	const deconnecter = useAction(api.connexions.qonto.deconnecterQonto);
	const minute = useMinute();
	const [redirection, setRedirection] = useState(false);
	const [echecLocal, setEchecLocal] = useState<string | null>(null);

	if (connexion === undefined || !connexion.disponible) return null;

	const etat: EtatConnexion = redirection
		? { genre: 'REDIRECTION' }
		: echecLocal !== null
			? { genre: 'ECHEC', message: echecLocal }
			: connexion.statut === null || connexion.statut === 'EN_ATTENTE'
				? { genre: 'A_CONNECTER' }
				: connexion.statut === 'SYNCHRONISATION'
					? { genre: 'SYNCHRONISATION', facturesLues: connexion.facturesLues }
					: connexion.statut === 'A_JOUR'
						? {
								genre: 'A_JOUR',
								facturesLues: connexion.facturesLues,
								depuis:
									connexion.derniereSynchro === null
										? 'à l’instant'
										: depuisLisible(connexion.derniereSynchro, minute)
							}
						: connexion.statut === 'REVOQUEE'
							? { genre: 'REVOQUEE' }
							: { genre: 'ECHEC', message: connexion.erreur ?? 'La connexion a échoué.' };

	return (
		<CarteConnexion
			nom="Qonto"
			promesse="Vos factures Qonto arrivent seules, et passent payées quand elles le sont."
			logo={<span className="text-cladd-sm font-bold">Q</span>}
			etat={etat}
			onConnecter={() => {
				setRedirection(true);
				setEchecLocal(null);
				demarrer({})
					.then((adresse) => {
						window.location.assign(adresse);
					})
					.catch(() => {
						setRedirection(false);
						setEchecLocal('Qonto ne répond pas. Réessayez dans un instant.');
					});
			}}
			onSynchroniser={() => void synchroniser({})}
			onDeconnecter={() => void deconnecter({})}
		/>
	);
}
```

Le monogramme « Q » tient lieu de logo. Le logo officiel, pris dans le kit de marque du portail développeur Qonto, se dépose dans `public/connecteurs/qonto.svg` et remplace le `<span>` par `<img src="/connecteurs/qonto.svg" alt="" className="size-full" />` : geste de Jules, qui ne bloque rien.

`src/app/` n'est pas `src/ui/` : si le lint refuse la classe du `<span>`, déplacer le monogramme dans `src/ui/carte-connexion.tsx` sous la forme d'un export `MonogrammeConnexion({ lettre })`.

- [ ] **Step 3: L'accueil vide : connecter d'abord, importer ensuite**

Dans `src/screens/file.tsx` :

1. Ajouter à `FileAffichee` (près de `onFichiers` / `accepteFichiers`) :

```ts
	/**
	 * LA CONNEXION À UN LOGICIEL DE FACTURATION, composée par l'application.
	 * Absente quand aucune connexion n'est activée : l'import redevient alors le
	 * geste principal.
	 */
	readonly connexion?: ReactNode;
```

2. Faire passer `connexion` jusqu'à `FileVide` (déstructuration dans le corps prêt, puis `<FileVide onFichiers={onFichiers} accepteFichiers={accepteFichiers} connexion={connexion} />`).
3. Réécrire `FileVide` :

```tsx
function FileVide({
	onFichiers,
	accepteFichiers,
	connexion
}: {
	onFichiers: (fichiers: File[]) => void;
	accepteFichiers: string;
	connexion?: ReactNode;
}) {
	/*
	  ⚠️ CONNECTER D'ABORD, IMPORTER ENSUITE — l'ordre de Shop. Une connexion
	  alimente le produit pour toujours ; un fichier, une fois. Quand aucune
	  connexion n'est activée, l'import reprend la place principale.
	*/
	const Bouton = connexion === undefined ? BoutonPrincipal : BoutonSecondaire;
	return (
		<SectionEcran
			titre="Rien à trancher aujourd’hui"
			legende="Le logiciel surveille les échéances et la prescription dès qu’il a de quoi compter."
		>
			{connexion}
			<ZoneDepot
				accept={accepteFichiers}
				onFichiers={onFichiers}
				libellePhoto="Photographier une facture"
			>
				<Bouton pleineLargeur>
					<UploadIcon />
					Importer des fichiers
				</Bouton>
			</ZoneDepot>
			<p className="text-cladd-2xs text-cladd-fg-soft">
				Export comptable, FEC, factures PDF ou photos : le format est reconnu seul.
			</p>
			{/* … les trois rangées fantômes, inchangées … */}
		</SectionEcran>
	);
}
```

(Garder intact le bloc des rangées fantômes qui suit aujourd'hui la zone de dépôt ; seul ce qui précède change.)

- [ ] **Step 4: La route passe la carte, seulement si la connexion est activée**

Dans `src/routes/app/index.tsx`, dans `File()` :

```tsx
	// La carte n'est passée que si Qonto est activé : sinon l'import reste le
	// geste principal, au lieu d'être rétrogradé sous une carte absente.
	const qonto = useQuery(api.connexions.qontoDonnees.maConnexionQonto, {});
```

et dans l'objet `valeur` passé à `EcranFile`, à côté de `avatar` / `selecteur` / `palette` :

```tsx
		connexion: qonto?.disponible ? (
			<Facultatif>
				<CarteQontoBranchee />
			</Facultatif>
		) : undefined,
```

avec `import { CarteQontoBranchee } from '../../app/connexion-qonto';`.

- [ ] **Step 5: La salle d'exposition**

Dans `src/routes/-salle/file.tsx`, dans la variante `VIERGE`, ajouter une carte d'exemple pour qu'on la regarde sans backend :

```tsx
	connexion: (
		<CarteConnexion
			nom="Qonto"
			promesse="Vos factures Qonto arrivent seules, et passent payées quand elles le sont."
			logo={<span className="text-cladd-sm font-bold">Q</span>}
			etat={{ genre: 'A_CONNECTER' }}
			onConnecter={() => undefined}
			onSynchroniser={() => undefined}
			onDeconnecter={() => undefined}
		/>
	),
```

(importer `CarteConnexion` depuis `../../ui`).

- [ ] **Step 6: Types, barrière des fonctions appelées, un regard**

Run: `bun run check && bunx vitest run src/lib/convex/__tests__/fonctions-appelees.test.ts`
Expected : aucune erreur de type ; `fonctions-appelees` passe (les quatre fonctions publiques ont maintenant un appelant).

Un seul regard au navigateur : `preview_start` `dev:frontend`, `/showroom`, écran « principale » variante vierge, à 375 px puis 1280 px. Vérifier : la carte Qonto au-dessus, « Importer des fichiers » en secondaire dessous, aucun débordement horizontal. Pas d'autre capture.

- [ ] **Step 7: Commit et mise en production**

```bash
git add src/ui/carte-connexion.tsx src/ui/index.ts src/app/connexion-qonto.tsx src/screens/file.tsx src/routes/app/index.tsx src/routes/-salle/file.tsx
git commit --no-verify -m "feat(accueil): connecter Qonto d'abord, importer ensuite"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task 6: La section « Connexions » du compte

Une fois connecté, l'accueil se remplit et la carte n'y paraît plus : c'est dans le compte qu'on retrouve l'état de la connexion, qu'on resynchronise et qu'on se déconnecte.

**Files:**
- Modify: `src/screens/compte/presse.tsx` (`SECTIONS_COMPTE`, `resumeConnexions`)
- Modify: `src/screens/compte/compte.tsx` (`CompteAffiche.connexions`, la section)
- Modify: `src/routes/app/compte.tsx`
- Modify: `src/routes/-salle/compte.tsx`

**Interfaces:**
- Consumes: `CarteQontoBranchee` (tâche 5), `api.connexions.qontoDonnees.maConnexionQonto`, `StatutConnexionQonto` (tâche 3).
- Produces: `CompteAffiche.connexions: { readonly statut: StatutConnexionQonto | null; readonly contenu: ReactNode }`, `resumeConnexions(statut): ResumeDeSection`.

- [ ] **Step 1: La section et son résumé**

Dans `src/screens/compte/presse.tsx`, insérer `'connexions'` dans `SECTIONS_COMPTE` juste après `'etablissement'`, et ajouter à côté des autres résumés :

```ts
/** Ce que la rangée repliée dit de la connexion, sans l'ouvrir. */
export function resumeConnexions(statut: string | null): ResumeDeSection {
	const valeur =
		statut === 'A_JOUR'
			? 'Qonto connecté'
			: statut === 'SYNCHRONISATION'
				? 'Lecture en cours…'
				: statut === 'ECHEC' || statut === 'REVOQUEE'
					? 'À reconnecter'
					: 'Aucune';
	return { valeur, legende: 'Les logiciels d’où vos factures arrivent seules.' };
}
```

- [ ] **Step 2: L'écran**

Dans `src/screens/compte/compte.tsx` :

1. Ajouter à `CompteAffiche`, après `etablissement` :

```ts
	/** La connexion Qonto : son statut pour la rangée repliée, et la carte branchée. */
	readonly connexions: { readonly statut: string | null; readonly contenu: ReactNode };
```

2. Importer `resumeConnexions` depuis `./presse`.
3. Ajouter, juste après l'`Ancre` de `etablissement` :

```tsx
				<Ancre cle="connexions" ancres={ancres}>
					<SectionDepliable
						cle="connexions"
						titre="Connexions"
						{...resumeConnexions(pret.connexions.statut)}
					>
						{pret.connexions.contenu}
					</SectionDepliable>
				</Ancre>
```

- [ ] **Step 3: La route**

Dans `src/routes/app/compte.tsx`, dans `PageCompte()` :

```tsx
	const qonto = useQuery(api.connexions.qontoDonnees.maConnexionQonto, {});
```

et dans `compteAffiche` :

```tsx
		connexions: {
			statut: qonto?.statut ?? null,
			contenu: qonto?.disponible ? (
				<CarteQontoBranchee />
			) : (
				<p className="text-cladd-2xs text-cladd-fg-soft">
					Aucune connexion n’est encore activée sur ce compte.
				</p>
			)
		},
```

avec `import { CarteQontoBranchee } from '../../app/connexion-qonto';`. Si le lint refuse la classe du `<p>` hors de `src/ui/`, passer `contenu: null` dans ce cas et laisser la rangée repliée dire « Aucune ».

- [ ] **Step 4: La salle d'exposition**

Dans `src/routes/-salle/compte.tsx`, dans `compteDe`, ajouter :

```tsx
		connexions: {
			statut: 'A_JOUR',
			contenu: (
				<CarteConnexion
					nom="Qonto"
					promesse="Vos factures Qonto arrivent seules, et passent payées quand elles le sont."
					logo={<span className="text-cladd-sm font-bold">Q</span>}
					etat={{ genre: 'A_JOUR', depuis: 'il y a 3 min', facturesLues: 128 }}
					onConnecter={() => undefined}
					onSynchroniser={() => undefined}
					onDeconnecter={() => undefined}
				/>
			)
		},
```

(importer `CarteConnexion` depuis `../../ui`).

- [ ] **Step 5: Types**

Run: `bun run check`
Expected : aucune erreur.

- [ ] **Step 6: Commit et mise en production**

```bash
git add src/screens/compte/presse.tsx src/screens/compte/compte.tsx src/routes/app/compte.tsx src/routes/-salle/compte.tsx
git commit --no-verify -m "feat(compte): la section Connexions, pour resynchroniser ou se déconnecter"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task 7: Fin de partie — la seule vérification complète, et l'essai en bac à sable

**Files:** aucun, sauf correction.

- [ ] **Step 1: La suite et le lint, une seule fois**

Run: `bunx vitest --run --reporter=dot --passWithNoTests --testTimeout=180000 && bun run lint`
Expected : tous les tests passent, lint sans erreur (les avertissements existants ne comptent pas).

- [ ] **Step 2: L'essai réel, en bac à sable (avec Jules)**

Une fois les préalables faits sur le déploiement de développement (`QONTO_ENVIRONNEMENT=sandbox`) :

1. Se connecter à la web-app bac à sable Qonto depuis le portail développeur (sinon la page d'autorisation bloque).
2. Lancer l'app (`dev:cloud`), accueil vide, « Connecter Qonto », accepter chez Qonto.
3. Attendu : retour sur l'accueil, la carte passe « Lecture de vos factures… » puis les rangées apparaissent.
4. Dans le bac à sable, marquer une facture payée. Attendu : en moins d'une minute, la facture passe payée dans Letikette (webhook).
5. Lire les journaux Convex (`bunx convex logs`) au premier webhook reçu, et **resserrer** le décodage de `webhookQonto` sur la forme réelle de l'événement (champ du type, place de `organization_id`). C'est la seule partie du code écrite sur une documentation incomplète.

- [ ] **Step 3: Consigner**

Mettre à jour la mémoire `project_decisions_21_09_sans_avocat.md` : partie 1 livrée, ce que l'essai en bac à sable a révélé, et l'état de l'accès production chez Qonto.

---

## Les parties suivantes (esquisse, à planifier une par une)

**Partie 2 — On ne tape plus rien deux fois.** SIREN à l'inscription (une recherche au registre, et l'établissement, l'identité de créancier, l'adresse et la forme se remplissent seuls) ; lecture Factur-X à l'import (les données exactes du fichier plutôt qu'une lecture par l'IA) ; relance « ouvrir dans ma messagerie » au lieu du copier-coller champ par champ.

**Partie 3 — Tout se branche.** Transactions Qonto pour rapprocher les virements des factures émises hors de Qonto (droit sensible `organization.read`, validation par Qonto à demander dès maintenant) ; réception de factures par e-mail (Resend, sous-domaine à router) ; Pennylane ; Stripe ; envoi des relances depuis Gmail et Outlook.
