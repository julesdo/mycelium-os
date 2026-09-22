# Partie 2 : on ne tape plus rien deux fois — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommandé : une tâche à la fois, dans la session, sans flotte d'agents) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer les trois saisies que le produit impose encore : le nom de l'entreprise tapé trois fois, la facture relue par un modèle alors qu'elle porte ses données en clair, et la relance recopiée champ par champ dans la messagerie.

**Architecture:** Trois lots indépendants, livrables et arrêtables séparément. **A** fait entrer l'identité au registre dès l'inscription, dans la MÊME mutation que la création de l'établissement (une transaction, sinon l'essai se consomme pour rien). **B** ajoute un lecteur Factur-X pur dans le socle et son mappeur dans la verticale, branchés en un seul point du dépôt, avec repli sur le modèle. **C** fait naître l'adresse du débiteur (jusqu'ici inexistante), puis ouvre la relance dans la messagerie du client, avec un garde-fou de longueur.

**Tech Stack:** Convex (actions, mutations, `'use node'`), `unpdf` (déjà installé, jamais appelé), React 19 + Cladd, Vitest.

**Spec:** ce plan porte sa propre conception. Il s'appuie sur trois relevés de terrain menés le 22/09/2026 (état du code ligne à ligne, documentation Factur-X et réforme française, limites de `mailto` mesurées sur les gabarits réels du produit). Décisions amont : mémoire `project_decisions_21_09_sans_avocat.md`. Partie 1 livrée : `docs/superpowers/plans/2026-09-21-connexions-partie-1-qonto.md`.

## Global Constraints

- **Montants** : entiers de centimes en `bigint`. Tout montant lu en texte passe par `depuisEuros()` (`src/lib/socle/montants.ts:93`), **jamais** par `Number`. `MONTANT_ECRIT` refuse plus de deux décimales : voir la garde du lot B.
- **Aucune valeur juridique en dur.** `exiger()` suffit à remplir un écran, `exigerPourActe()` reste bloqué (`valideParAvocat === false` partout, décision du 21/09). Rien dans ce plan ne suppose l'inverse.
- **Le doute ne profite jamais au produit** : donnée ABSENTE → repli documenté ; donnée FAUSSE → on la NOMME, jamais de repli silencieux.
- **Multi-tenant strict par `organizationId`.**
- **Le piège Convex** : toute fonction qui appelle `internal.<son propre module>` annote le type de retour de son handler. `organizations.ts` est déjà dans ce cas (`internal.organizations.sendOrgInvitationEmail` L.354, L.428).
- **`'use node'`** : `src/lib/socle/documents/facturx.ts` importe `unpdf`. Il ne doit être importé QUE depuis des fichiers Convex portant `'use node'` (c'est le cas de `depot.ts:1`). Un import depuis le runtime par défaut casse **au déploiement**, pas à la compilation.
- **Frontière du socle** : `src/lib/socle/**` n'importe ni `verticales/` ni `convex/` (`frontiere.test.ts`).
- **Interface** : français, Cladd, classes Tailwind seulement dans `src/ui/**`, « garantie » interdit, pas de tiret cadratin dans les textes affichés, cibles 48 px. **Ligne rouge 1** : aucun texte ne doit laisser croire que le produit écrit au débiteur (`lignes-rouges.test.ts` balaie `ui`, `routes`, `screens`, `app`, `lib/verticales`). **Ligne rouge 3** : `relancez `, `mettez en demeure`, `vous devriez` sont balayés — attention aux libellés de boutons.
- **`Date.parse` ne lève pas sous Bun** : aucune date lue d'une source externe ne passe par `new Date(...)` sans validation ; utiliser `estDateReelle` (`verticales/recouvrement/calendrier.ts:53`).
- **⚠️ POLITIQUE DE TESTS — inchangée depuis la partie 1, demande de Jules.**
  - Tests unitaires **uniquement** sur la logique pure : lecteur XML, mappeur CII, constructeur `mailto`.
  - Une tâche = un `bun run check`, plus les tests-barrières ciblés nommés dans la tâche.
  - **Ni suite complète ni lint entre les tâches.** Une seule fois, en tâche finale.
  - **Un regard au navigateur par LOT**, à 375 px et 1280 px, dans la tâche qui touche l'écran.
- **Commits** `--no-verify`, par chemin. **Poussée en production après chaque tâche** : `git push origin <sha>:main`, puis vérifier Vercel.

---

## Ce que les relevés ont corrigé

Trois choses que ce plan tient pour acquises, parce qu'elles ont été vérifiées dans le code et les sources, contre mes hypothèses de départ :

1. **`depot.ts` porte déjà `'use node'`** (ligne 1) et **`unpdf@^1.8.1` est déjà installé** (`package.json:74`) sans être appelé nulle part. Lire un PDF ne coûte donc aucune dépendance nouvelle. (Onzième occurrence du défaut « déclaré, jamais alimenté » — celle-ci joue en notre faveur.)
2. **`contact_email` de Qonto n'est PAS l'adresse du débiteur** : c'est celle de l'émetteur. L'adresse du client est `client.email`, dans l'objet client imbriqué, et elle est facultative.
3. **Le calendrier de la facture électronique** : réception obligatoire pour toutes les entreprises **depuis le 1er septembre 2026** ; émission pour les grandes entreprises et ETI à la même date ; **émission pour les TPE/PME le 1er septembre 2027**. Nos clients sont des émetteurs : dans onze mois, la facture qu'ils déposent EST un Factur-X. Le lot B n'est pas une optimisation de coût, c'est une mise en conformité anticipée — avec un gain immédiat pour tout client qui facture une grande entreprise.

Et un **bloquant** qu'aucun de nous n'avait vu : **l'adresse e-mail d'un débiteur n'existe nulle part** — ni dans la table `debiteurs`, ni à l'import, ni dans le connecteur Qonto. Sans elle, « ouvrir dans ma messagerie » ouvre un message sans destinataire. Le lot C la fait donc naître avant tout le reste.

---

# LOT A — L'identité entre à l'inscription

Aujourd'hui : `/bienvenue` demande le nom, puis « Votre établissement » le redemande, puis « Identité de créancier » le redemande avec SIREN, adresse, forme juridique et qualité de commerçant. La recherche au registre existe déjà, mais seulement dans le compte, **après coup**.

**Le point dur qui décide de tout :** `createOrganization` consomme l'essai gratuit (`hasUsedFreeTrial: true`, `freeTrialEndsAt`). Créer l'établissement « juste pour pouvoir chercher au registre » brûlerait l'essai d'une inscription abandonnée. La recherche doit donc pouvoir tourner **avant** que l'établissement existe, et l'écriture doit tenir en **une seule mutation**, parce qu'une mutation Convex est transactionnelle et que deux appels enchaînés ne le sont pas.

**Références Mobbin.** [Monese, ouverture d'un compte professionnel](https://mobbin.com/flows/a426416b-0b2e-40c2-ad7f-c3b21ab02ac2) : [l'écran de résultats](https://mobbin.com/screens/415a5263-0a40-4218-b91e-68e8fae163f1) titre « **Choose your company below** », une rangée par candidat, bouton suivant désactivé tant que rien n'est choisi, et une issue « Couldn't find your company? ». C'est notre phase `TROUVE` et notre phase `AUCUN`. [Revolut Business](https://mobbin.com/flows/d153b102-4a02-4451-b75c-6cec8b67725f) sert de contre-exemple pour l'immatriculation tapée à la main, mais son écran d'adresse fait exactement ce qu'il faut : on cherche, on retient, les champs apparaissent **remplis et corrigeables**.

### Task A1: Chercher au registre avant que l'établissement existe, et écrire l'identité en une seule fois

**Files:**
- Modify: `src/lib/convex/recouvrement/monEtablissement.ts` (autour de L.132-182)
- Modify: `src/lib/convex/organizations.ts` (`createOrganization`, L.52-106)

**Interfaces:**
- Consumes: `authedAction` (`src/lib/convex/functions.ts:107`), `lireEtablissements` (`verticales/recouvrement/pays/france/etablissements.ts:137`), `internal.recouvrement.profil.enregistrerInterne` (`profil.ts:39`), `vEtatCritere` (`recouvrement/tables.ts:47`).
- Produces :
  - `api.recouvrement.monEtablissement.chercherAuRegistreALInscription({ nom })` → `{ cherche: string; candidats: EtablissementTrouve[] }`
  - `api.organizations.createOrganization({ name, creancier? })` → `Id<'organizations'>`, où `creancier = { denomination, siren?, formeJuridique?, adresse?, estCommercant }`

- [ ] **Step 1: Factoriser l'interrogation du registre**

Dans `src/lib/convex/recouvrement/monEtablissement.ts`, extraire le corps de `chercherMonEtablissementAuRegistre` (L.159-181) dans une fonction locale, sans changer son comportement :

```ts
/**
 * L'interrogation du registre, à partir d'un terme déjà décidé.
 *
 * ⚠️ UNE PANNE N'EST PAS UNE ABSENCE. Un statut non-200 lève en le nommant ;
 * rendre une liste vide ferait croire que le registre ne connaît pas
 * l'entreprise, ce qui est une réponse, et c'en est une fausse.
 */
async function interrogerLeRegistre(cherche: string): Promise<readonly EtablissementTrouve[]> {
	const terme = cherche.replace(/"/g, ' ').trim();
	if (terme === '') return [];

	const url = `${BASE_BODACC}?limit=${ANNONCES_LUES}&order_by=dateparution DESC&where=commercant like "${terme}"`;
	const reponse = await fetch(url);
	if (!reponse.ok) {
		throw new ConvexError(
			`Le registre a répondu ${reponse.status}. La recherche n’a pas pu aboutir.`
		);
	}
	const corps = (await reponse.json()) as { results?: readonly unknown[] };
	return lireEtablissements(corps.results ?? []).slice(0, CANDIDATS_MAX);
}
```

Puis `chercherMonEtablissementAuRegistre` se réduit à : lire `org?.name`, refuser le nom vide comme aujourd'hui (L.151-155), et `return { cherche, candidats: await interrogerLeRegistre(cherche) }`.

- [ ] **Step 2: La recherche de l'inscription**

Dans le même fichier, après `chercherMonEtablissementAuRegistre` :

```ts
/**
 * LA MÊME RECHERCHE, MAIS AVANT QUE L'ÉTABLISSEMENT EXISTE.
 *
 * ⚠️ POURQUOI UN NOM LIBRE EN ARGUMENT, alors que la fonction voisine le lit en
 * base exprès pour ne pas en accepter. À l'inscription, il n'y a RIEN en base à
 * lire : le nom n'existe que dans le champ de saisie. La garde correcte est donc
 * une session — `authedAction` —, qui exige un compte sans exiger un
 * établissement. C'est déjà le niveau que `annuaires.chercherUnCommissaireDeJustice`
 * pose pour un département libre.
 *
 * ⚠️ ET SURTOUT : on ne crée pas l'établissement « juste pour pouvoir
 * chercher ». `createOrganization` consomme l'essai gratuit ; une inscription
 * abandonnée après la recherche le brûlerait pour rien.
 */
export const chercherAuRegistreALInscription = authedAction({
	args: { nom: v.string() },
	returns: v.object({ cherche: v.string(), candidats: v.array(vEtablissementTrouve) }),
	handler: async (_ctx, { nom }): Promise<{ cherche: string; candidats: readonly EtablissementTrouve[] }> => {
		const cherche = nom.trim();
		if (cherche === '') return { cherche, candidats: [] };
		return { cherche, candidats: await interrogerLeRegistre(cherche) };
	}
});
```

`vEtablissementTrouve` : réutiliser le validateur déjà écrit dans le `returns` de `chercherMonEtablissementAuRegistre` (L.135-146) en l'extrayant en constante de module, pour que les deux fonctions ne divergent jamais.

- [ ] **Step 3: L'identité écrite avec l'établissement, dans la même transaction**

Dans `src/lib/convex/organizations.ts`, `createOrganization` :

1. Remplacer les arguments `siret` et `facturesParAn` (plus aucun appelant depuis `/bienvenue`) par :

```ts
	args: {
		name: v.string(),
		/**
		 * L'identité retenue au registre, quand le gérant en a retenu une.
		 *
		 * ⚠️ ELLE S'ÉCRIT DANS LA MÊME MUTATION, et c'est une question de
		 * transaction, pas de confort. Cette mutation pose `hasUsedFreeTrial` et
		 * `freeTrialEndsAt` : si un second appel échouait après elle, l'essai
		 * serait consommé, l'établissement existerait, `/app` ne redirigerait plus,
		 * et le gérant retomberait sur le verrou qu'on voulait lui épargner.
		 */
		creancier: v.optional(
			v.object({
				denomination: v.string(),
				siren: v.optional(v.string()),
				formeJuridique: v.optional(v.string()),
				adresse: v.optional(v.string()),
				estCommercant: vEtatCritere
			})
		)
	},
```

2. Annoter le handler : `handler: async (ctx, args): Promise<Id<'organizations'>> => {`
3. Retirer `siret: args.siret` et `facturesParAn: args.facturesParAn` de l'`insert('organizations', …)`.
4. Juste après l'insertion du membre (`organizationMembers`), écrire le profil :

```ts
		if (args.creancier !== undefined) {
			await ctx.runMutation(internal.recouvrement.profil.enregistrerInterne, {
				organizationId: orgId,
				...args.creancier
			});
		}
```

`enregistrerInterne` valide déjà le SIREN par sa clé de contrôle et refuse en NOMMANT le numéro reçu (`profil.ts:61-72`) : ne rien revalider ici, et surtout ne pas se contenter d'une validation côté client.

- [ ] **Step 4: Types et barrières**

Run: `bun run check && bunx vitest run src/lib/convex/__tests__/profilCreancierRecouvrement.test.ts src/lib/convex/__tests__/champs-alimentes.test.ts`
Expected : aucune erreur de type ; les deux tests passent. `fonctions-appelees` reste pour la tâche A2 (la nouvelle action n'a pas encore d'appelant).

- [ ] **Step 5: Commit et mise en production**

```bash
git add src/lib/convex/recouvrement/monEtablissement.ts src/lib/convex/organizations.ts src/lib/convex/_generated
git commit --no-verify -m "feat(inscription): chercher au registre avant l'etablissement, et ecrire l'identite avec lui"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task A2: L'écran d'inscription, où l'on cherche son entreprise

**Files:**
- Modify: `src/routes/bienvenue.tsx` (`Bienvenue()`, L.83-127 ; garder `PageBienvenue` L.22-48 telle quelle)
- Create: `src/routes/-salle/bienvenue.tsx`
- Modify: `src/routes/-salle/ecrans.tsx` (inscrire la nouvelle entrée)

**Interfaces:**
- Consumes: `api.recouvrement.monEtablissement.chercherAuRegistreALInscription`, `api.organizations.createOrganization`, `qualiteCommercantDeLaForme` (`verticales/recouvrement/pays/france/commercialite.ts:345`), `RechercheRegistre` (`src/ui/recherche-registre.tsx`).
- Produces: un `/bienvenue` qui écrit l'identité complète, et une entrée de salle montrant ses cinq états.

- [ ] **Step 1: Réécrire `Bienvenue()`**

Cinq phases, comme `FormulaireCreancier` les pose déjà (`creancier.tsx:50-55`) : `REPOS`, `EN_COURS`, `TROUVE`, `AUCUN`, `ECHEC`. **Aucun effet** : la déduction se dérive au rendu.

```tsx
	const creer = useMutation(api.organizations.createOrganization);
	const chercher = useAction(api.recouvrement.monEtablissement.chercherAuRegistreALInscription);

	const [nom, setNom] = useState('');
	const [recherche, setRecherche] = useState<EtatRecherche>({ phase: 'REPOS' });
	const [retenu, setRetenu] = useState<EtablissementAuRegistre | null>(null);

	// Dérivée au rendu, jamais dans un effet : le candidat retenu porte sa forme,
	// et la forme porte sa déduction.
	const deduction = qualiteCommercantDeLaForme(retenu?.formeJuridique);
```

Le geste final :

```tsx
		await creer({
			name: (retenu?.denomination ?? nom).trim(),
			...(retenu === null
				? {}
				: {
						creancier: {
							denomination: retenu.denomination,
							...(retenu.siren === undefined ? {} : { siren: retenu.siren }),
							...(retenu.formeJuridique === undefined
								? {}
								: { formeJuridique: retenu.formeJuridique }),
							...(retenu.adresse === undefined ? {} : { adresse: retenu.adresse }),
							estCommercant: deduction.etat
						}
					})
		});
```

Règles à tenir, chacune pour une raison déjà payée ailleurs :

- **`AUCUN` n'est pas `ECHEC`.** Un `catch` qui rendrait une liste vide serait un repli silencieux. Le registre muet dit « aucune annonce à ce nom », une panne dit « le registre n'a pas répondu, réessayez ».
- **Retenir un candidat REMPLIT, ça n'écrit pas.** Le gérant peut continuer sans en retenir aucun : on crée alors l'établissement avec le seul nom, exactement comme aujourd'hui, et le verrou « Votre identité de créancier » reste levé dans le compte. **Ne jamais bloquer l'inscription sur le registre.**
- **La déduction n'écrase que ce qu'elle tranche.** Écrire `'unknown'` est le bon comportement pour une entreprise individuelle : la forme ne distingue plus commerçant, artisan et libéral depuis la fusion des catégories INSEE de 2018. Afficher `deduction.fondement` tel quel, sans le reformuler.
- **La date de parution se lit avant le doigt.** Chaque candidat porte « annonce du <date> » : l'adresse vient d'une annonce de greffe qui peut avoir des années, et elle s'imprimera dans des décomptes **figés**. L'écran dit de la relire.
- **Ne pas recopier une quatrième liste de candidats.** `src/ui/recherche-registre.tsx` (L.166-199) en porte déjà une ; l'utiliser, quitte à lui ajouter une prop. En écrire une nouvelle sur un chantier « supprimer la double saisie » serait ironique.
- **Le commentaire L.50-82 du fichier** explique pourquoi le SIRET a quitté cet écran. Le **réécrire** pour dire ce qui l'y ramène (le registre, pas la saisie), surtout ne pas le supprimer.
- **`source-citee.test.ts`** : si l'écran écrit « registre des entreprises », il doit aussi écrire « relevé(e) ». Écrire plutôt « le registre public des annonces » et rester en dehors des cinq motifs surveillés.

- [ ] **Step 2: La salle d'exposition**

`/bienvenue` n'est dans aucune salle aujourd'hui : la règle des quatre largeurs n'est pas outillée pour lui. Créer `src/routes/-salle/bienvenue.tsx` avec cinq états — repos, `EN_COURS`, `TROUVE` à **deux candidats au moins** (une liste à un élément ferait croire que le produit peut choisir seul), `AUCUN`, `ECHEC` — sans routeur ni session, et l'inscrire dans `ECRANS_DU_PRODUIT` (`src/routes/-salle/ecrans.tsx:33-64`).

- [ ] **Step 3: Types, barrières, et le regard du lot A**

Run: `bun run check && bunx vitest run src/lib/convex/__tests__/fonctions-appelees.test.ts src/ui/__tests__/aucun-ecran-orphelin.test.ts src/ui/__tests__/destinations-existent.test.ts src/ui/__tests__/source-citee.test.ts`
Expected : tout passe. Si l'inscription devient deux routes, la seconde doit être la cible d'un `to="…"` **littéral** (la regex ne voit pas les navigations construites) ou entrer dans `ATTEINTS_AUTREMENT` avec sa raison.

Le regard : `/showroom`, entrée « bienvenue », **375 px puis 1280 px**, les cinq états. Vérifier qu'aucune rangée de candidat ne déborde et que le bouton reste à 48 px.

- [ ] **Step 4: Commit et mise en production**

```bash
git add src/routes/bienvenue.tsx src/routes/-salle/bienvenue.tsx src/routes/-salle/ecrans.tsx
git commit --no-verify -m "feat(inscription): on cherche son entreprise au registre, et on ne tape plus son nom trois fois"
git push origin "$(git rev-parse HEAD):main"
```

---

# LOT B — La facture se lit dans le fichier, pas par un modèle

Un Factur-X est un PDF/A-3 qui embarque `factur-x.xml` (CII D16B). Aujourd'hui tout PDF part chez le modèle (`depot.ts:104-123`), qui coûte, qui approxime, et dont le résultat traverse `z.number()`. Le XML, lui, porte les montants en **texte décimal exact** : `depuisEuros("19172.24")` ne passe par aucun flottant. C'est l'argument du lot, et il est mesurable.

### Task B1: Le lecteur Factur-X (socle, pur, testé)

**Files:**
- Create: `src/lib/socle/documents/facturx.ts`
- Test: `src/lib/socle/__tests__/facturx.test.ts`

**Interfaces:**
- Consumes: `unpdf` (`package.json:74`, déjà installé).
- Produces :
  - `interface ChampsFacturX { profil?: string; numero?: string; typeCode?: string; dateEmission?: string; formatDateEmission?: string; dateEcheance?: string; formatDateEcheance?: string; devise?: string; totalTTC?: string; netAPayer?: string; acompte?: string; acheteurNom?: string; acheteurIdLegal?: string; vendeurNom?: string; vendeurIdLegal?: string }`
  - `lireFacturXDuXml(xml: string): ChampsFacturX | null` — pur, testé
  - `lireFacturXDuPdf(octets: Uint8Array): Promise<ChampsFacturX | null>` — **`'use node'` seulement**

- [ ] **Step 1: Écrire les tests**

Create `src/lib/socle/__tests__/facturx.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { lireFacturXDuXml } from '../documents/facturx';

/** Un MINIMUM réduit à ce que le lecteur doit en tirer. */
const MINIMUM = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
	xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
	xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
	xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
	<rsm:ExchangedDocumentContext>
		<ram:GuidelineSpecifiedDocumentContextParameter>
			<ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
		</ram:GuidelineSpecifiedDocumentContextParameter>
	</rsm:ExchangedDocumentContext>
	<rsm:ExchangedDocument>
		<ram:ID>FA-2026-0042</ram:ID>
		<ram:TypeCode>380</ram:TypeCode>
		<ram:IssueDateTime><udt:DateTimeString format="102">20260715</udt:DateTimeString></ram:IssueDateTime>
	</rsm:ExchangedDocument>
	<rsm:SupplyChainTradeTransaction>
		<ram:ApplicableHeaderTradeAgreement>
			<ram:SellerTradeParty>
				<ram:Name>Fournitures Durand &amp; Fils</ram:Name>
				<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">732829320</ram:ID></ram:SpecifiedLegalOrganization>
			</ram:SellerTradeParty>
			<ram:BuyerTradeParty>
				<ram:Name>Imprimerie &lt;Martin&gt;</ram:Name>
				<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">77788899100018</ram:ID></ram:SpecifiedLegalOrganization>
			</ram:BuyerTradeParty>
		</ram:ApplicableHeaderTradeAgreement>
		<ram:ApplicableHeaderTradeDelivery/>
		<ram:ApplicableHeaderTradeSettlement>
			<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
			<ram:SpecifiedTradeSettlementHeaderMonetarySummation>
				<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>
				<ram:DuePayableAmount>900.00</ram:DuePayableAmount>
				<ram:TotalPrepaidAmount>300.00</ram:TotalPrepaidAmount>
			</ram:SpecifiedTradeSettlementHeaderMonetarySummation>
		</ram:ApplicableHeaderTradeSettlement>
	</rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

/** Le même, avec l'échéance, des préfixes non conventionnels, un commentaire et du CDATA. */
const BASIC_WL_PREFIXES_EXOTIQUES = MINIMUM.replace(
	/rsm:/g,
	'a:'
)
	.replace(/ram:/g, 'b:')
	.replace(/udt:/g, 'c:')
	.replace(/xmlns:a=/, 'xmlns:a=')
	.replace(
		'<b:InvoiceCurrencyCode>EUR</b:InvoiceCurrencyCode>',
		`<!-- devise --><b:InvoiceCurrencyCode><![CDATA[EUR]]></b:InvoiceCurrencyCode>
		<b:SpecifiedTradePaymentTerms><b:DueDateDateTime><c:DateTimeString format="102">20260814</c:DateTimeString></b:DueDateDateTime></b:SpecifiedTradePaymentTerms>`
	);

describe('lireFacturXDuXml', () => {
	it('lit un profil MINIMUM, entités comprises', () => {
		const lu = lireFacturXDuXml(MINIMUM);
		expect(lu).not.toBeNull();
		expect(lu?.profil).toBe('urn:factur-x.eu:1p0:minimum');
		expect(lu?.numero).toBe('FA-2026-0042');
		expect(lu?.typeCode).toBe('380');
		expect(lu?.dateEmission).toBe('20260715');
		expect(lu?.formatDateEmission).toBe('102');
		expect(lu?.devise).toBe('EUR');
		expect(lu?.totalTTC).toBe('1200.00');
		expect(lu?.netAPayer).toBe('900.00');
		expect(lu?.acompte).toBe('300.00');
		expect(lu?.vendeurNom).toBe('Fournitures Durand & Fils');
		expect(lu?.vendeurIdLegal).toBe('732829320');
		expect(lu?.acheteurNom).toBe('Imprimerie <Martin>');
		expect(lu?.acheteurIdLegal).toBe('77788899100018');
	});

	it('n’a pas d’échéance en MINIMUM, et le dit par l’absence', () => {
		expect(lireFacturXDuXml(MINIMUM)?.dateEcheance).toBeUndefined();
	});

	it('résout les préfixes par URI, pas par convention, et traverse commentaires et CDATA', () => {
		const lu = lireFacturXDuXml(BASIC_WL_PREFIXES_EXOTIQUES);
		expect(lu?.numero).toBe('FA-2026-0042');
		expect(lu?.devise).toBe('EUR');
		expect(lu?.dateEcheance).toBe('20260814');
	});

	it('lit l’échéance sous SpecifiedTradePaymentTerms, et rien d’autre', () => {
		// Le chemin faux qui circule sur le web : SpecifiedTradeSettlementPaymentMeans.
		const faux = MINIMUM.replace(
			'<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>',
			`<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
			<ram:SpecifiedTradeSettlementPaymentMeans><ram:DueDateDateTime><udt:DateTimeString format="102">20260814</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradeSettlementPaymentMeans>`
		);
		expect(lireFacturXDuXml(faux)?.dateEcheance).toBeUndefined();
	});

	it('écarte un document qui n’est pas un CII (ZUGFeRD 1.0)', () => {
		const zugferd1 = `<rsm:CrossIndustryDocument xmlns:rsm="urn:ferd:CrossIndustryDocument:invoice:1p0"><a/></rsm:CrossIndustryDocument>`;
		expect(lireFacturXDuXml(zugferd1)).toBeNull();
	});

	it('écarte un XML tronqué plutôt que d’en tirer des miettes', () => {
		expect(lireFacturXDuXml(MINIMUM.slice(0, 400))).toBeNull();
	});
});
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `bunx vitest run src/lib/socle/__tests__/facturx.test.ts`
Expected : FAIL, `../documents/facturx` introuvable.

- [ ] **Step 3: Écrire le lecteur**

Create `src/lib/socle/documents/facturx.ts`. Le cœur est un lecteur XML dédié — **une centaine de lignes, aucune dépendance** — parce qu'on lit treize champs d'un document au schéma rigide : `fast-xml-parser` apporterait 1,3 Mo et six dépendances transitives sur un chemin qui produit des sommes réclamées.

```ts
import { getDocumentProxy } from 'unpdf';

/**
 * LIRE UNE FACTURE FACTUR-X : le XML qu'un PDF/A-3 embarque, et rien d'autre.
 *
 * ⚠️ LE SOCLE NE SAIT PAS QUELLE LOI IL SERT. Ce module rend des CHAÎNES telles
 * qu'elles sont écrites dans le fichier. Ce qui est un débiteur, ce qui est un
 * SIREN valide, ce qu'on refuse et pourquoi : tout ça vit dans la verticale
 * (`verticales/recouvrement/import/factureFacturX.ts`).
 *
 * ⚠️ CE FICHIER IMPORTE `unpdf`, DONC `node:*` PAR TRANSITIVITÉ. Il ne doit être
 * importé QUE depuis un fichier Convex portant `'use node'` (c'est le cas de
 * `recouvrement/depot.ts`). Depuis le runtime par défaut, ça ne casse pas à la
 * compilation : ça casse au déploiement.
 */

const URI_CII = 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100';
const URI_RAM = 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100';
const URI_UDT = 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100';

/** Les noms de fichier admis, du plus récent au plus ancien. */
const NOMS_ADMIS = /^(factur-x|zugferd-invoice|xrechnung)\.xml$/i;

export interface ChampsFacturX {
	readonly profil?: string;
	readonly numero?: string;
	readonly typeCode?: string;
	readonly dateEmission?: string;
	readonly formatDateEmission?: string;
	readonly dateEcheance?: string;
	readonly formatDateEcheance?: string;
	readonly devise?: string;
	readonly totalTTC?: string;
	readonly netAPayer?: string;
	readonly acompte?: string;
	readonly acheteurNom?: string;
	readonly acheteurIdLegal?: string;
	readonly vendeurNom?: string;
	readonly vendeurIdLegal?: string;
}

interface Element {
	readonly chemin: string;
	readonly texte: string;
	readonly attributs: Readonly<Record<string, string>>;
}

/** `&amp;` et ses semblables, plus les entités numériques. */
function decoder(texte: string): string {
	return texte.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (entier, corps: string) => {
		if (corps === 'amp') return '&';
		if (corps === 'lt') return '<';
		if (corps === 'gt') return '>';
		if (corps === 'quot') return '"';
		if (corps === 'apos') return "'";
		const point = corps.startsWith('#x')
			? Number.parseInt(corps.slice(2), 16)
			: Number.parseInt(corps.slice(1), 10);
		return Number.isFinite(point) ? String.fromCodePoint(point) : entier;
	});
}

/**
 * Les éléments FEUILLES du document, chacun avec son chemin canonique.
 *
 * ⚠️ LES PRÉFIXES SE RÉSOLVENT PAR URI, JAMAIS PAR CONVENTION. `rsm` et `ram`
 * sont d'usage, pas normatifs : un producteur conforme peut écrire `a:` et
 * `b:`. Le chemin canonique est construit sur l'URI, et lui seul.
 *
 * ⚠️ ET C'EST LE CHEMIN QUI COMPTE, PAS LE NOM. `ram:ID` apparaît sur une
 * dizaine d'éléments, `ram:Name` sur les parties comme sur les produits.
 */
function* elements(xml: string): Generator<Element> {
	const sansBom = xml.charCodeAt(0) === 0xfeff ? xml.slice(1) : xml;
	const pile: { canonique: string; prefixes: Map<string, string>; aDesEnfants: boolean }[] = [];
	let i = 0;
	let texte = '';

	while (i < sansBom.length) {
		const ouvre = sansBom.indexOf('<', i);
		if (ouvre === -1) break;
		texte += sansBom.slice(i, ouvre);

		if (sansBom.startsWith('<!--', ouvre)) {
			i = sansBom.indexOf('-->', ouvre) + 3;
			continue;
		}
		if (sansBom.startsWith('<![CDATA[', ouvre)) {
			const fin = sansBom.indexOf(']]>', ouvre);
			texte += sansBom.slice(ouvre + 9, fin);
			i = fin + 3;
			continue;
		}
		if (sansBom.startsWith('<?', ouvre) || sansBom.startsWith('<!', ouvre)) {
			i = sansBom.indexOf('>', ouvre) + 1;
			continue;
		}

		// La fin de balise se cherche EN RESPECTANT LES GUILLEMETS : un attribut
		// peut contenir un `>`, et découper naïvement dessus casse le document.
		let ferme = ouvre + 1;
		let guillemet: string | null = null;
		while (ferme < sansBom.length) {
			const c = sansBom[ferme];
			if (guillemet !== null) {
				if (c === guillemet) guillemet = null;
			} else if (c === '"' || c === "'") guillemet = c;
			else if (c === '>') break;
			ferme++;
		}
		const brut = sansBom.slice(ouvre + 1, ferme);
		i = ferme + 1;

		if (brut.startsWith('/')) {
			const cadre = pile.pop();
			if (cadre !== undefined && !cadre.aDesEnfants) {
				yield { chemin: cheminDe(pile, cadre.canonique), texte: decoder(texte).trim(), attributs: {} };
			}
			texte = '';
			continue;
		}

		const autoFermante = brut.endsWith('/');
		const corps = autoFermante ? brut.slice(0, -1) : brut;
		const nom = corps.split(/[\s/]/)[0] ?? '';
		const attributs: Record<string, string> = {};
		const prefixes = new Map(pile[pile.length - 1]?.prefixes ?? []);

		for (const trouve of corps.slice(nom.length).matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
			const cle = trouve[1] ?? '';
			const valeur = decoder(trouve[3] ?? trouve[4] ?? '');
			if (cle.startsWith('xmlns:')) prefixes.set(cle.slice(6), valeur);
			else if (cle === 'xmlns') prefixes.set('', valeur);
			else attributs[cle] = valeur;
		}

		const deuxPoints = nom.indexOf(':');
		const prefixe = deuxPoints === -1 ? '' : nom.slice(0, deuxPoints);
		const local = deuxPoints === -1 ? nom : nom.slice(deuxPoints + 1);
		const canonique = `${alias(prefixes.get(prefixe))}:${local}`;

		const parent = pile[pile.length - 1];
		if (parent !== undefined) pile[pile.length - 1] = { ...parent, aDesEnfants: true };

		if (autoFermante) {
			yield { chemin: cheminDe(pile, canonique), texte: '', attributs };
		} else {
			pile.push({ canonique, prefixes, aDesEnfants: false });
			// Les attributs de l'élément ouvrant sont rendus avec sa feuille : on les
			// garde ici pour les ressortir à la fermeture.
			attributsEnCours.set(cheminDe(pile.slice(0, -1), canonique), attributs);
		}
		texte = '';
	}
}

const attributsEnCours = new Map<string, Readonly<Record<string, string>>>();

function alias(uri: string | undefined): string {
	if (uri === URI_CII) return 'rsm';
	if (uri === URI_RAM) return 'ram';
	if (uri === URI_UDT) return 'udt';
	return uri ?? '';
}

function cheminDe(pile: readonly { canonique: string }[], feuille: string): string {
	return [...pile.map((c) => c.canonique), feuille].join('/');
}

const CHEMINS = {
	profil:
		'rsm:CrossIndustryInvoice/rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID',
	numero: 'rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:ID',
	typeCode: 'rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:TypeCode',
	dateEmission:
		'rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString',
	dateEcheance:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradePaymentTerms/ram:DueDateDateTime/udt:DateTimeString',
	devise:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:InvoiceCurrencyCode',
	totalTTC:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:GrandTotalAmount',
	netAPayer:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:DuePayableAmount',
	acompte:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:TotalPrepaidAmount',
	acheteurNom:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:BuyerTradeParty/ram:Name',
	acheteurIdLegal:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:BuyerTradeParty/ram:SpecifiedLegalOrganization/ram:ID',
	vendeurNom:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:SellerTradeParty/ram:Name',
	vendeurIdLegal:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:SellerTradeParty/ram:SpecifiedLegalOrganization/ram:ID'
} as const;

/**
 * ⚠️ PREMIÈRE OCCURRENCE RETENUE. En EXTENDED, certains blocs peuvent se
 * répéter ; prendre la première et s'y tenir vaut mieux qu'un choix implicite
 * qui changerait selon l'ordre du fichier.
 */
export function lireFacturXDuXml(xml: string): ChampsFacturX | null {
	const premiers = new Map<string, Element>();
	try {
		for (const element of elements(xml)) {
			if (!premiers.has(element.chemin)) premiers.set(element.chemin, element);
		}
	} catch {
		return null;
	}

	// Ni racine CII, ni numéro : ce n'est pas un Factur-X lisible (ZUGFeRD 1.0
	// porte un schéma entièrement différent). On le traite comme ABSENT.
	const numero = premiers.get(CHEMINS.numero);
	if (numero === undefined || numero.texte === '') return null;

	const texte = (chemin: string): string | undefined => {
		const valeur = premiers.get(chemin)?.texte;
		return valeur === undefined || valeur === '' ? undefined : valeur;
	};
	const attribut = (chemin: string, nom: string): string | undefined =>
		attributsEnCours.get(chemin)?.[nom] ?? premiers.get(chemin)?.attributs[nom];

	return {
		profil: texte(CHEMINS.profil),
		numero: numero.texte,
		typeCode: texte(CHEMINS.typeCode),
		dateEmission: texte(CHEMINS.dateEmission),
		formatDateEmission: attribut(CHEMINS.dateEmission, 'format'),
		dateEcheance: texte(CHEMINS.dateEcheance),
		formatDateEcheance: attribut(CHEMINS.dateEcheance, 'format'),
		devise: texte(CHEMINS.devise),
		totalTTC: texte(CHEMINS.totalTTC),
		netAPayer: texte(CHEMINS.netAPayer),
		acompte: texte(CHEMINS.acompte),
		acheteurNom: texte(CHEMINS.acheteurNom),
		acheteurIdLegal: texte(CHEMINS.acheteurIdLegal),
		vendeurNom: texte(CHEMINS.vendeurNom),
		vendeurIdLegal: texte(CHEMINS.vendeurIdLegal)
	};
}

/**
 * Le XML d'un PDF Factur-X, ou `null` si le PDF n'en porte pas.
 *
 * ⚠️ `null` VEUT DIRE « PAS DE FACTUR-X ICI », c'est-à-dire une donnée ABSENTE,
 * et l'appelant retombe légitimement sur le modèle. Un Factur-X PRÉSENT mais
 * fautif se refuse en le NOMMANT, et ça se décide dans la verticale.
 */
export async function lireFacturXDuPdf(octets: Uint8Array): Promise<ChampsFacturX | null> {
	try {
		const pdf = await getDocumentProxy(octets);
		const pieces = await pdf.getAttachments();
		await pdf.loadingTask.destroy();
		if (pieces === null) return null;

		for (const piece of Object.values(pieces) as { filename: string; content: Uint8Array }[]) {
			if (!NOMS_ADMIS.test(piece.filename)) continue;
			const lu = lireFacturXDuXml(new TextDecoder('utf-8').decode(piece.content));
			if (lu !== null) return lu;
		}
		return null;
	} catch {
		// Un PDF illisible n'est pas un Factur-X fautif : le chemin modèle prend
		// le relais et dira, lui, ce qu'il n'a pas pu lire.
		return null;
	}
}
```

⚠️ **À l'écriture, deux points à vérifier sur pièces réelles, pas sur la documentation :** la forme rendue par `getAttachments()` (`Map` ou objet simple selon la version d'`unpdf`) et le nom exact de la propriété du contenu. Adapter la boucle en conséquence, et garder le `try/catch`.

- [ ] **Step 4: Vérifier qu'ils passent**

Run: `bunx vitest run src/lib/socle/__tests__/facturx.test.ts src/lib/socle/__tests__/frontiere.test.ts`
Expected : PASS pour les deux.

- [ ] **Step 5: Commit et mise en production**

```bash
git add src/lib/socle/documents/facturx.ts src/lib/socle/__tests__/facturx.test.ts
git commit --no-verify -m "feat(socle): lire le XML qu'un PDF Factur-X embarque"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task B2: Le mappeur CII → facture importable (verticale, testé)

**Files:**
- Create: `src/lib/verticales/recouvrement/import/factureFacturX.ts`
- Test: `src/lib/verticales/recouvrement/import/__tests__/factureFacturX.test.ts`
- Modify: `src/lib/verticales/recouvrement/import/exportComptable.ts:62` (ajouter `'FACTUR_X'` à `FormatExport`)
- Modify: `src/lib/verticales/recouvrement/import/factureVente.ts` (exporter `sirenLu`, aujourd'hui privée, L.228-233 — **l'exporter, pas la dupliquer**)

**Interfaces:**
- Consumes: `ChampsFacturX` (B1), `depuisEuros`/`enCentimes` (`socle/montants.ts`), `estDateReelle` (`verticales/recouvrement/calendrier.ts:53`), `sirenLu` (`factureVente.ts`), `ResultatImport` (`exportComptable.ts:93-101`).
- Produces: `resultatDepuisFacturX(champs: ChampsFacturX, nomFichier: string, sirenDuCreancier: string | undefined): ResultatImport`

**Les sept refus, chacun avec sa raison.** Ce sont eux le vrai contenu de la tâche :

| Cas | Décision | Pourquoi |
|---|---|---|
| `typeCode` ≠ `380` | **refus nommé** (`381` = avoir, `384` = rectificative, `386` = acompte) | Un avoir importé crée une créance contre un client à qui on **doit** de l'argent. C'est le seul piège qui produit une réclamation à l'envers |
| `devise` ≠ `EUR` | **refus nommé** | Les intérêts et l'indemnité de 40 € sont en euros. On ne convertit jamais |
| `formatDate` ≠ `102` | **refus nommé** | CII admet `610` (mois) et `616` (semaine) ; supposer huit caractères ferait lire une date fausse |
| date qui n'existe pas au calendrier | **refus nommé** | `20260230` respecte le format et n'existe pas ; `Date.parse` ne lève pas sous Bun |
| `netAPayer` ≠ `totalTTC` | **on prend `netAPayer`**, et on le **dit** dans le bilan | `DuePayableAmount` = total − acompte. Prendre le total quand un acompte existe, c'est sur-réclamer. Le doute ne profite jamais au produit |
| troisième décimale non nulle | **refus nommé** | `19172.2400` vaut `19172.24` et se tolère ; `19172.245` serait un arrondi que personne n'a décidé |
| `vendeurIdLegal` ≠ SIREN du créancier | **refus nommé** | Une facture d'ACHAT déposée par erreur : le chemin modèle traite déjà ce piège, le XML permet de le trancher au lieu de le deviner. Si le créancier n'a pas de SIREN enregistré, on ne peut pas trancher : on laisse passer, et on le dit |

Et un cas qui n'est pas un refus : **un acompte porté par `TotalPrepaidAmount` n'est pas un règlement importable** — il n'a pas de date, et `ReglementImporte` en exige une. Ne pas fabriquer la date d'émission comme date d'acompte ; le nommer dans le bilan, comme le fait déjà `resultatDepuisDocument` avec sa justification écrite (`factureVente.ts:278-280`).

- [ ] **Step 1: Écrire les tests**

Un test par ligne du tableau ci-dessus, plus le cas nominal (MINIMUM → une facture, `montantTTC` en `bigint`, SIREN du débiteur lu par `sirenLu` depuis un SIRET de 14 chiffres, échéance absente tolérée). Reprendre les fixtures de `ChampsFacturX` en objets littéraux : ce mappeur ne lit pas de XML, il reçoit des champs.

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `bunx vitest run src/lib/verticales/recouvrement/import/__tests__/factureFacturX.test.ts`
Expected : FAIL, module introuvable.

- [ ] **Step 3: Écrire le mappeur**

Miroir exact de `resultatDepuisDocument` (`factureVente.ts:259-286`) : succès → `{ format: 'FACTUR_X', factures: [f], reglements: [], ignorees: [], horsPerimetre: 0 }` ; refus → `{ format: 'FACTUR_X', factures: [], reglements: [], ignorees: [{ texte: nomFichier, raison }], horsPerimetre: 0 }`.

Points d'exécution :

- `montantTTC` : `enCentimes(depuisEuros(netAPayer ?? totalTTC))` — **la chaîne du XML**, jamais un `Number`.
- Dates : `"20260715"` → `"2026-07-15"` puis `estDateReelle`.
- SIREN : `sirenLu(acheteurIdLegal)` — qui tranche par la longueur **et** la clé de contrôle. Ne jamais se fier au `schemeID` : l'échantillon MINIMUM officiel écrit `schemeID="0002"` (code SIREN) sur un numéro de **14** chiffres.
- `debiteur` : `acheteurNom` ; sans nom exploitable, refus nommé.

- [ ] **Step 4: Vérifier qu'ils passent**

Run: `bunx vitest run src/lib/verticales/recouvrement/import/__tests__/factureFacturX.test.ts && bun run check`
Expected : PASS, aucune erreur de type.

- [ ] **Step 5: Commit et mise en production**

```bash
git add src/lib/verticales/recouvrement/import src/lib/verticales/recouvrement/import/__tests__
git commit --no-verify -m "feat(import): traduire un CII en facture, avec ses sept refus nommes"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task B3: Brancher le lecteur dans le dépôt, et cesser de mentir à l'écran

**Files:**
- Modify: `src/lib/convex/recouvrement/depot.ts` (`lireFactureDeposee`, L.104-123)
- Modify: `src/ui/bilan-import.tsx` (`BilanDepotAffiche`, L.35-44)
- Modify: `src/screens/import/depots.tsx` (`LigneDepot` L.64-74, `precisionDepot` L.130)
- Modify: `src/routes/-salle/depots.tsx` (ou l'entrée de salle des dépôts)

**Interfaces:**
- Consumes: `lireFacturXDuPdf` (B1), `resultatDepuisFacturX` (B2).
- Produces: un dépôt qui lit le fichier quand il le peut, et l'écran qui le dit.

- [ ] **Step 1: La bifurcation, en un seul endroit**

Dans `lireFactureDeposee`, **avant** l'appel au modèle :

```ts
	if (mimeType === 'application/pdf') {
		// Lu dans le fichier : exact, gratuit, instantané. Absent : le modèle prend
		// le relais, comme avant. Présent mais fautif : `resultatDepuisFacturX`
		// refuse en le NOMMANT, et on ne retombe pas discrètement sur le modèle.
		const champs = await lireFacturXDuPdf(new Uint8Array(octets));
		if (champs !== null) return resultatDepuisFacturX(champs, nomFichier, sirenDuCreancier);
	}
```

`sirenDuCreancier` se lit dans `traiterImport` par `internal.recouvrement.profil.monProfilInterne` (`profil.ts:114`) et se passe en argument. Trois raisons de mettre la bifurcation ici plutôt qu'à `depot.ts:175` : c'est la seule fonction qui connaît `mimeType`, `octets` et `nomFichier` ensemble ; `traiterImport` n'a alors pas une ligne à changer ; et la forme de retour, `ResultatImport`, est déjà le contrat commun de tout l'aval (dédoublonnage, bilan, lignes illisibles).

- [ ] **Step 2: L'écran cesse de dire « Relue par le modèle » quand c'est faux**

`src/screens/import/depots.tsx:130` écrit aujourd'hui `Relue par le modèle · <date>` pour tout dépôt en mode `FACTURE_DEPOSEE`. Un Factur-X afficherait donc un appel modèle qui n'a jamais eu lieu — un mensonge à l'écran, sur exactement le point que ce lot vend.

Le champ qui corrige existe déjà en base sans être lu : `bilanDe` écrit `format` (`depot.ts:74`), `vBilan` le valide, `listerImports` et `suivreImport` le rendent — mais `BilanDepotAffiche` ne le porte pas. (Douzième occurrence de « déclaré, lu, jamais alimenté », déjà en production.) Trois ajouts : `format: string` dans `BilanDepotAffiche`, dans `LigneDepot`, et la condition :

```ts
	return bilan?.format === 'FACTUR_X'
		? `Lue dans le fichier · ${deposeLe}`
		: depot.mode === 'FACTURE_DEPOSEE'
			? `Relue par le modèle · ${deposeLe}`
			: deposeLe;
```

**Le mode ne change pas.** `ModeDepot` reste `'EXPORT_COMPTABLE' | 'FACTURE_DEPOSEE'` : le mode se décide dans le navigateur avant l'envoi, et savoir si un PDF est un Factur-X demande de l'ouvrir. La vérité se découvre au serveur et voyage dans `bilan.format`.

- [ ] **Step 3: Types, barrières, et le regard du lot B**

Run: `bun run check && bunx vitest run src/lib/convex/__tests__/champs-alimentes.test.ts src/lib/convex/__tests__/declare-jamais-alimente.test.ts`
Expected : aucune erreur ; les deux barrières passent (le champ `format` est désormais lu).

Le regard : `/showroom`, entrée des dépôts, **375 px puis 1280 px** : une rangée « Lue dans le fichier » et une rangée « Relue par le modèle » côte à côte.

**Et l'essai réel, avec un vrai fichier** : déposer un Factur-X dans l'application (n'importe quelle facture reçue d'une grande entreprise depuis septembre 2026 en est un). Attendu : bilan « Lue dans le fichier », montant au centime, aucun appel modèle dans les journaux Convex. **C'est cette vérification qui valide la forme rendue par `getAttachments()`**, que la documentation ne suffit pas à trancher.

- [ ] **Step 4: Commit et mise en production**

```bash
git add src/lib/convex/recouvrement/depot.ts src/ui/bilan-import.tsx src/screens/import/depots.tsx src/routes/-salle
git commit --no-verify -m "feat(import): une facture Factur-X se lit dans le fichier, et l'ecran le dit"
git push origin "$(git rev-parse HEAD):main"
```

---

# LOT C — La relance part en un geste

⚠️ **Ligne rouge 1 : Letikette n'écrit jamais au débiteur.** Tout ce lot prépare un message que le CLIENT envoie depuis SA messagerie. Aucun libellé ne doit laisser croire autre chose : `lignes-rouges.test.ts` balaie l'interface pour « nous relançons », « envoyé au débiteur de votre part », et `relancez ` (ligne rouge 3) tomberait sur un bouton « Relancez-le ».

**Le bloquant, découvert au relevé : il n'y a de destinataire nulle part.** La table `debiteurs` ne porte pas d'e-mail, l'import n'en lit pas, et le connecteur Qonto n'en prend pas. Sans lui, « ouvrir dans ma messagerie » ouvre un message vide de son `To:`. C'est donc la première tâche.

### Task C1: L'adresse du débiteur, lue chez Qonto ou saisie à la main

**Files:**
- Modify: `src/lib/convex/recouvrement/tables.ts` (table `debiteurs`, L.250-358 : ajouter `email: v.optional(v.string())`)
- Modify: `src/lib/socle/connecteurs/qonto.ts` (`ClientQonto` L.17-23, `FactureDepuisQonto` L.39-52, `factureDepuisQonto` L.87-116)
- Modify: `src/lib/convex/connexions/qonto.ts` (le mapping champ par champ, L.325-335)
- Modify: `src/lib/convex/recouvrement/import.ts` (`vFactureImportee`, `trouverOuCreerDebiteur`, l'`insert('debiteurs', …)`)
- Modify: `src/lib/convex/recouvrement/debiteurs.ts` (mutation `renseignerEmail`, sur le modèle de `renseignerSiren` L.225)
- Modify: `src/ui/identite-debiteur.tsx` (section « Son identité », qui porte déjà SIREN, secteur et taux contractuel)
- Modify: `src/screens/debiteur.tsx` (L.543-562) et la salle correspondante

**Interfaces:**
- Produces: `debiteurs.email?: string`, alimenté par deux chemins — `client.email` de Qonto à la synchronisation, et une saisie sur la page du client.

- [ ] **Step 1: Le champ et sa lecture chez Qonto**

`ClientQonto` reçoit `email?: string | null` ; `FactureDepuisQonto` reçoit `debiteurEmail?: string` ; `factureDepuisQonto` le ressort **sans le valider** (le socle ne sait pas ce qu'est une adresse acceptable pour ce produit — il rend la chaîne, la verticale décide). Le mapping de `connexions/qonto.ts` l'ajoute champ par champ, comme les autres : le validateur de l'import refuse tout champ en trop.

⚠️ **`contact_email` n'est pas l'adresse du débiteur** : la documentation Qonto la décrit comme celle de l'émetteur de la facture. C'est `client.email` qu'il faut lire, et elle est facultative. `client.extra_emails` (jusqu'à 100 adresses non affichées) reste dehors : on ne relance pas une liste.

- [ ] **Step 2: L'écriture, et la saisie**

`vFactureImportee` reçoit `debiteurEmail: v.optional(v.string())` ; `trouverOuCreerDebiteur` l'écrit à la création, et **complète** un débiteur existant qui n'en a pas — sans jamais écraser une adresse déjà saisie par le gérant : ce qu'il a corrigé à la main vaut mieux qu'un champ d'API.

`renseignerEmail` : mutation cloisonnée par `organizationId`, sur le modèle exact de `renseignerSiren`. La purge RGPD ne demande rien de plus (`debiteurs` est déjà vidée par index d'organisation).

- [ ] **Step 3: Types et barrières**

Run: `bun run check && bunx vitest run src/lib/convex/__tests__/champs-alimentes.test.ts src/lib/convex/__tests__/declare-jamais-alimente.test.ts src/lib/socle/__tests__/frontiere.test.ts src/lib/convex/__tests__/fonctions-appelees.test.ts`
Expected : tout passe — le champ est écrit ET lu (l'écran l'affiche), la nouvelle mutation a un appelant.

- [ ] **Step 4: Commit et mise en production**

```bash
git add src/lib/convex/recouvrement/tables.ts src/lib/socle/connecteurs/qonto.ts src/lib/convex/connexions/qonto.ts src/lib/convex/recouvrement/import.ts src/lib/convex/recouvrement/debiteurs.ts src/ui/identite-debiteur.tsx src/screens/debiteur.tsx src/routes/-salle src/lib/convex/_generated
git commit --no-verify -m "feat(clients): l'adresse du debiteur, lue chez Qonto ou saisie a la main"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task C2: « Ouvrir dans ma messagerie », avec son garde-fou

**Files:**
- Create: `src/lib/verticales/recouvrement/messagerie.ts`
- Test: `src/lib/verticales/recouvrement/__tests__/messagerie.test.ts`
- Modify: `src/ui/relances.tsx` (le bouton, à côté des deux copies existantes)
- Modify: `src/screens/creance.tsx` (`SectionRelances`, L.1141-1154) et `src/routes/app/creance.$id.tsx` (passer l'adresse)
- Modify: `src/routes/-salle/creance.tsx`

**Interfaces:**
- Produces :
  - `adresseMessagerie({ destinataire, objet, corps }): { url: string; longueur: number }`
  - `PLAFOND_MAILTO = 1900`
  - `tientDansLaMessagerie(longueur: number): boolean`

**Ce que les mesures disent, et qui décide du garde-fou.** Longueurs réelles d'une URL `mailto` construite sur les gabarits du produit :

| factures | niveau 1 | niveau 2 |
|---|---|---|
| 1 | 674 | 943 |
| 8 | 1 402 | 1 405 |
| **14** | **2 026** | 1 801 |
| **18** | 2 442 ✗ | **2 065** ✗ |

Et les seuils : **2 046 caractères** — Chrome affiche son invite, on clique, **rien ne se passe** ; **2 083** — Windows tronque l'URL **en silence**, potentiellement au milieu d'un montant. Le niveau 1 casse entre 14 et 15 factures, le niveau 2 entre 17 et 18.

**Donc : on mesure avant d'ouvrir, et au-delà de 1 900 caractères on REFUSE en le disant**, et on laisse la copie comme chemin. Une panne invisible par construction est exactement ce que ce dépôt refuse : un repli silencieux est un mensonge.

**Et `mailto` n'attache aucun fichier** (RFC 6068 : seuls `subject` et `body` sont garantis). Le décompte détaillé ne tient de toute façon jamais — une ligne de segment fait 87 caractères, 172 une fois encodée. C'est cohérent avec la phrase déjà écrite dans le gabarit de niveau 2 : « Le détail de ce compte, période par période, vous est communiqué sur demande. » Le bouton « Télécharger le décompte » reste donc un second geste, et l'écran le dit.

- [ ] **Step 1: Écrire les tests**

Cas à couvrir : les sauts de ligne deviennent `%0D%0A` ; `€`, `—` et l'apostrophe typographique sont encodés en UTF-8 pourcent-encodé ; une adresse absente rend une URL sans destinataire **et le signale** ; une relance courte tient ; une relance à 20 factures dépasse le plafond et `tientDansLaMessagerie` rend `false`.

- [ ] **Step 2: Vérifier qu'ils échouent, écrire le module, vérifier qu'ils passent**

Run: `bunx vitest run src/lib/verticales/recouvrement/__tests__/messagerie.test.ts`

- [ ] **Step 3: Le bouton**

Dans `src/ui/relances.tsx`, à côté des deux copies : **« Ouvrir dans ma messagerie »**, en bouton principal de la section, la copie restant disponible en secondaire.

- Sans adresse connue : le bouton n'est pas désactivé en silence. Il dit ce qui manque et mène à la page du client, là où l'adresse se saisit (règle d'écran n° 4 : le vide montre le chemin).
- Au-delà du plafond : le bouton devient une phrase qui dit pourquoi — « Ce message est trop long pour s'ouvrir dans une messagerie » — et la copie reste.
- **Aucun libellé ne doit dire que le produit envoie.** « Ouvrir dans ma messagerie » est exact : c'est le gérant qui envoie, depuis sa messagerie, sous sa signature.

- [ ] **Step 4: Types, barrières, et le regard du lot C**

Run: `bun run check && bunx vitest run src/ui/__tests__/lignes-rouges.test.ts src/lib/verticales/recouvrement/__tests__/relance.test.ts src/lib/__tests__/mots-interdits.test.ts`
Expected : tout passe. `relance.test.ts` vérifie qu'aucun brouillon ne nomme « letikette », n'écrit de numéro d'article ni les mots de procédure : ne rien ajouter au corps du message.

Le regard : `/showroom`, entrée créance, **375 px puis 1280 px** : avec adresse, sans adresse, et au-delà du plafond.

- [ ] **Step 5: Commit et mise en production**

```bash
git add src/lib/verticales/recouvrement/messagerie.ts src/lib/verticales/recouvrement/__tests__/messagerie.test.ts src/ui/relances.tsx src/screens/creance.tsx src/routes/app/creance.\$id.tsx src/routes/-salle/creance.tsx
git commit --no-verify -m "feat(relances): ouvrir la relance dans sa messagerie, et refuser net quand elle est trop longue"
git push origin "$(git rev-parse HEAD):main"
```

---

### Task D: Fin de partie

- [ ] **Step 1: La suite et le lint, une seule fois**

Run: `bunx vitest --run --reporter=dot --passWithNoTests --testTimeout=180000 && bun run lint`
Expected : tous les tests passent, lint sans erreur.

- [ ] **Step 2: Consigner**

Mettre à jour la mémoire `project_decisions_21_09_sans_avocat.md` : partie 2 livrée, ce que l'essai d'un vrai Factur-X a révélé sur `getAttachments()`, et le plafond `mailto` retenu.

---

## Ce qui reste dehors, et pourquoi

- **Envoyer depuis Gmail ou Outlook.** Relevé fait : côté Google, `gmail.compose` suffit pour un brouillon et n'est que « sensible » (surtout ne jamais demander `gmail.modify` ni `https://mail.google.com/`, qui sont **restreints** et déclenchent un audit CASA annuel par un laboratoire agréé) ; il faut une politique de confidentialité, une page d'accueil publique, une vidéo de démonstration par droit, la vérification de marque, et l'application reste inutilisable avant publication (100 testeurs, jeton de rafraîchissement qui expire en 7 jours). Côté Microsoft, `Mail.ReadWrite` ne demande pas de consentement administrateur, **mais** la vérification d'éditeur est exigée de fait pour une application multi-locataires récente, et elle suppose d'abord un compte partenaire Microsoft vérifié. Aucune des deux ne couvre un client sur l'IMAP d'un hébergeur français. **Partie 3**, avec les démarches lancées en avance.
- **Transactions bancaires Qonto** (droit sensible `organization.read`) : partie 3, dès que Qonto valide.
- **Réception de factures par e-mail** (Resend Inbound, sous-domaine à router) : partie 3.
- **Supprimer `organizations.siret`** : plus aucune écriture après le lot A, mais retirer un champ d'un validateur casse au déploiement tant que des documents le portent. Tâche séparée, après migration.
- **Un `.xml` nu déposé** part aujourd'hui en export comptable et échouera sur « Export non reconnu ». Un CII nu n'est pas un Factur-X ; c'est la porte par laquelle un client arrivera en 2027. À noter, pas à traiter ici.
