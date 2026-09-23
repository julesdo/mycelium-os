# Partie 3 : ce qui reste, et ce qu'on abandonne — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (une tâche à la fois, dans la session, sans flotte d'agents). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Réparer ce qui est cassé en production, faire survivre nos sources juridiques au 1er janvier 2027, publier les pages légales, et faire entrer les factures sans dépôt manuel. **Abandonner l'envoi depuis Gmail et Outlook**, sur un chiffre.

**Spec :** ce plan porte sa propre conception. Il s'appuie sur un relevé mené le 23/09/2026 par six agents de recherche, chacun suivi d'un sceptique chargé de le **réfuter** — 48 faits sur 124 ont été réfutés, dont onze sur douze de la dimension réglementaire. Les constats survivants portent leur source. Décisions amont : `project_decisions_21_09_sans_avocat.md`. Parties 1 et 2 livrées.

---

## Ce que le relevé a corrigé, et qui change le plan

**Six corrections qui comptent.** Je les nomme parce que chacune aurait produit du code faux.

1. **Un `.xml` nu n'est PAS envoyé au modèle.** Deux agents se sont contredits ; j'ai tranché dans le code. `modeDuFichier` (`src/screens/import/depots.tsx:50-61`) renvoie `EXPORT_COMPTABLE` pour les trois cas possibles — `text/xml` (branche `text/`), `application/xml` (extension absente de `EXTENSIONS_DOCUMENT`), et type MIME vide. Le fichier part donc chez `importerExportComptable`, pas chez le modèle. Le gérant lit « Format d'export non reconnu. Attendu : un FEC (colonnes CompteNum, PieceRef, Debit, Credit, EcritureDate) ou un CSV… » — **un échec qui ment sur sa cause**, mais un échec gratuit.

2. **`lireFacturXDuXml` ne lit que le CII.** `facturx.ts:212-238` ne porte que des chemins `rsm:CrossIndustryInvoice/…` ; zéro occurrence d'UBL. Router un `.xml` vers lui n'est donc pas « une décision produit de moins » comme le relevé l'affirmait : il faut décider ce qu'on fait d'un XML qui n'est pas du CII. La réponse est simple et elle tombe bien : **on ne fait rien de spécial**, il retombe sur l'échec d'export actuel, honnête et gratuit.

3. **Notre décompte ne bouge pas.** Comparaison mot à mot de `L441-10` en vigueur et de sa version au 1er janvier 2027 : taux BCE majoré de dix points, plancher de trois fois le taux légal, règle du 1er janvier et du 1er juillet, indemnité forfaitaire, exclusion en procédure collective — **identiques**. `D441-5` maintient 40 € sans version future. La seule modification de `L441-10` est une référence croisée.

4. **Mais nos SOURCES meurent le 1er janvier 2027.** L'ordonnance n° 2025-1247 du 17 décembre 2025 recodifie la TVA dans le CIBS. `289 bis` du CGI porte « Abrogé à compter du 1er janvier 2027 » ; `L441-9`, `L441-10`, `L441-11` et `L441-16` ont tous une version future à cette date. Nos **valeurs** restent justes, nos **renvois** deviennent des liens vers des textes abrogés. C'est exactement le mode de panne que ce projet s'interdit : une référence qui a l'air vérifiable et qui ne l'est plus.

5. **Le calendrier de la réforme est confirmé** — réception pour tous au 1er septembre 2026, émission TPE/PME au 1er septembre 2027 — **mais l'échéance de 2027 reste décalable par décret jusqu'au 1er décembre 2027**, soupape maintenue à l'article 26, III, de la loi n° 2022-1157, version en vigueur depuis le 21 février 2026 (modifiée par l'art. 123 de la loi n° 2026-103 du 19 février 2026). À revérifier une fois par trimestre.

6. **Le renommage « PDP » → « plateforme agréée » est une modification de la LOI, pas du décret** : art. 123 de la loi de finances pour 2026. Et il n'existe **aucune option publique gratuite** à laquelle se brancher : le II de l'article 289 bis, qui portait le portail public comme voie de transmission, est abrogé.

---

## Ce qu'on abandonne, et le chiffre qui le décide

**L'envoi depuis Gmail et Outlook sort du plan.** Ce n'était pas la conclusion attendue ; elle est nette.

**Le chiffre.** Dans la zone `.fr` au 1er janvier 2025, sur 2,69 millions de domaines portant un MX : Microsoft en héberge environ 151 000, Google environ 96 000 — **environ 9 % à eux deux**. OVH seul en héberge 966 000 (≈ 36 %), Ionos 12 %, Gandi 8 %. Réserve honnête, à porter avec le chiffre : la mesure compte des domaines, parqués compris, pas des entreprises actives ; la part réelle chez des clients qui paient est plus élevée, d'un facteur qu'aucune source trouvée ne permet d'établir. Même corrigée généreusement, elle ne renverse pas l'ordre de grandeur. **Une intégration OAuth laisse dehors l'écrasante majorité de nos clients.**

**Les trois murs, pour mémoire.**

- **Google.** Déposer un brouillon exige `gmail.compose`, classé **RESTREINT** : six semaines de vérification annoncées, plus une évaluation CASA par un laboratoire agréé, renouvelée chaque année. L'ironie mérite d'être nommée — `gmail.send`, qui **envoie**, n'est que *sensible*. Le chemin le moins cher est celui que notre première ligne rouge nous interdit.
- **Le piège qui aurait cassé la production.** Ajouter `gmail.compose` au **même projet Google Cloud** que notre connexion Google existante ferait perdre à ce projet l'exception dont il bénéficie, et **ferait expirer en sept jours les autorisations de connexion de tous les clients**. La séparation des projets n'est pas une précaution d'hygiène, c'est la condition pour ne pas casser l'authentification.
- **Microsoft.** Créer un brouillon n'a qu'une permission possible, `Mail.ReadWrite`, et elle figure **nommément dans les exclusions de la politique de consentement par défaut** de tout nouveau locataire. Le gérant de TPE qui n'est pas administrateur de son propre locataire ne peut donc pas connecter Letikette. Six clients de messagerie sont exemptés, nommés par identifiant en dur ; aucune procédure publique ne permet d'y entrer. La vérification d'éditeur ne lève pas ce verrou — elle retire l'avertissement « éditeur non vérifié », rien de plus.

**Ce qu'on fait à la place :** consolider le chemin générique, celui qui sert les 90 % — OVH, Ionos, Gandi, Orange, IMAP d'hébergeur compris. C'est le lot E.

---

# LOT A — Ce qui est cassé en production

Zéro dépendance externe. À faire en premier parce que ça tourne aujourd'hui, chez des utilisateurs.

### Task A1: Le palier tarifaire qui baisse tout seul

**Le défaut, vérifié ligne à ligne.** `updateOrganization` (`src/lib/convex/organizations.ts:191-208`) patche :

```ts
await ctx.db.patch(orgId, {
    name: args.name.trim(),
    siret: args.siret,          // <- args.siret est TOUJOURS undefined
    facturesParAn: args.facturesParAn
});
```

Son **seul appelant** est `FormulaireEtablissement` (`src/screens/compte/etablissement.tsx:94-102`), qui compose :

```ts
await onEnregistrer({
    name: nom.trim(),
    ...(Number.isFinite(nb) && nb > 0 ? { facturesParAn: nb } : {})
});
```

Conséquences, et elles sont différentes :

- **`siret` est effacé à CHAQUE enregistrement** de la page établissement, puisque le formulaire ne l'envoie jamais. Dégât limité : ce champ n'a plus qu'un lecteur, une valeur de départ de formulaire (`src/routes/app/compte.tsx:579`).
- **`facturesParAn` est effacé dès que le champ est vide ou n'est pas un entier positif.** Et `palierDeTaille(undefined)` rend `'S'` (`src/lib/config/tarifs.ts:48`), donc `etatAbonnement` renvoie `tarifs: TARIFS['S']` et `bornesPalier` du palier le plus bas. **Le prix affiché au gérant baisse d'un palier tout seul, par un geste ordinaire.**

**Portée exacte, à ne pas surjouer.** Aujourd'hui le palier ne pilote que l'AFFICHAGE : `identifiantPrix()` n'est appelée que par `resolvePlanTier()`, en lecture inverse depuis un webhook Paddle, jamais pour choisir un prix au paiement. Ce n'est donc pas encore une fuite de revenu — **ça le devient le jour où le paiement s'appuie sur le palier.** Et c'est déjà, aujourd'hui, exactement ce que `monEtablissement.ts:28-35` déclare inacceptable : « un abonnement qui change de palier tout seul est une modification de prix que personne n'a demandée ».

- [ ] **Step 1: Ne patcher que ce qui est envoyé**

```ts
	handler: async (ctx, args): Promise<null> => {
		if (!args.name.trim()) throw new ConvexError('Le nom est obligatoire');
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		// ⚠️ UN ARGUMENT ABSENT NE VEUT PAS DIRE « EFFACE ». Ce patch écrivait
		// `siret: args.siret` et `facturesParAn: args.facturesParAn` alors que son
		// seul appelant n'envoie jamais le premier et omet le second dès que le
		// champ est vide : chaque enregistrement effaçait le SIRET, et vider le
		// nombre de factures faisait retomber le palier tarifaire sur le plus bas.
		// Le prix affiché baissait tout seul, ce que `monEtablissement.ts` déclare
		// justement inacceptable.
		await ctx.db.patch(orgId, {
			name: args.name.trim(),
			...(args.siret === undefined ? {} : { siret: args.siret }),
			...(args.facturesParAn === undefined ? {} : { facturesParAn: args.facturesParAn })
		});
		return null;
	}
```

- [ ] **Step 2: Rendre l'effacement POSSIBLE, mais voulu**

Un gérant doit pouvoir remettre son volume à « je ne sais pas ». Aujourd'hui il ne le peut pas autrement que par le défaut ci-dessus, qui est un accident. Dans `etablissement.tsx`, envoyer explicitement `facturesParAn: null` quand le champ est vidé — et accepter `v.union(v.number(), v.null())` côté mutation, `null` effaçant. **Un effacement demandé est un geste ; un effacement subi est un défaut.**

- [ ] **Step 3: Vérifier**

Run: `bun run check && bunx vitest run src/lib/convex/__tests__/champs-alimentes.test.ts`
Le regard : `/app/compte`, enregistrer sans toucher au volume, et vérifier que le palier affiché ne bouge pas.

- [ ] **Step 4: Commit et mise en production**

---

### Task A2: Une facture électronique en XML nu se lit

**Le défaut.** Un `.xml` déposé part au parseur d'export comptable et rend un message qui parle de FEC et de colonnes comptables. Le gérant conclut que le produit ne lit pas les factures, alors qu'il ne lit pas **ce format-là**. Et le lecteur CII est déjà écrit, testé, exporté.

Accessoirement : `.xml` n'est pas dans `FORMATS_ACCEPTES` (`depots.tsx:24`), donc le sélecteur de fichiers le grise — mais `ZoneDepot` ne filtre **rien** au glisser-déposer ni au collage. Le fichier passe quand même.

- [ ] **Step 1: Le mode**

Dans `modeDuFichier`, tester le XML **avant** la branche `text/` :

```ts
	// ⚠️ AVANT LA BRANCHE `text/`, et c'est tout le piège : un `text/xml` tombe
	// sinon dans l'export comptable, qui répond « Format d'export non reconnu »
	// à une facture électronique parfaitement lisible.
	if (type === 'application/xml' || type === 'text/xml' || /\.xml$/.test(fichier.name.toLowerCase()))
		return 'FACTURE_DEPOSEE';
```

Et ajouter `.xml` à `FORMATS_ACCEPTES`.

- [ ] **Step 2: La branche de lecture**

Dans `lireFactureDeposee` (`depot.ts:117`), symétrique de celle du PDF, **avant** la composition de `contenu` :

```ts
	if (mimeType === 'application/xml' || mimeType === 'text/xml' || nomFichier.toLowerCase().endsWith('.xml')) {
		const champs = lireFacturXDuXml(decoderTexte(octets));
		if (champs !== null) return resultatDepuisFacturX(champs, nomFichier, sirenDuCreancier);
		// ⚠️ UN XML QUI N'EST PAS DU CII NE PART PAS AU MODÈLE. `lireFacturXDuXml`
		// ne connaît que les chemins `rsm:CrossIndustryInvoice/…` : un UBL rend
		// `null`. L'envoyer au modèle ferait facturer la lecture d'un document
		// structuré qu'on sait ne pas savoir lire — et son total entrerait dans un
		// décompte opposable. On refuse en le NOMMANT.
		return {
			format: 'FACTUR_X',
			factures: [],
			reglements: [],
			ignorees: [{ texte: nomFichier, raison: 'Ce fichier XML n’est pas une facture au format CII (Factur-X). Le format UBL n’est pas encore lu.' }],
			horsPerimetre: 0
		};
	}
```

`lireFacturXDuXml` doit être importée à côté de `lireFacturXDuPdf` (`depot.ts:17`).

- [ ] **Step 3: Vérifier**

Run: `bun run check && bunx vitest run src/lib/socle/__tests__/facturx.test.ts src/lib/verticales/recouvrement/import/__tests__/factureFacturX.test.ts`
Un essai réel : déposer le XML d'exemple MINIMUM du test. Attendu : bilan « Lue dans le fichier », aucun appel modèle.

- [ ] **Step 4: Commit et mise en production**

---

# LOT B — Les sources juridiques survivent au 1er janvier 2027

**C'est le seul vrai blocage à date, et il ne dépend de personne.** À faire avant fin décembre 2026.

Nos valeurs restent justes ; nos renvois deviennent des liens vers des textes abrogés. Un numéro d'article qui a l'air vérifiable et qui ne l'est plus est plus dangereux qu'une source absente — c'est la règle la plus stricte du projet, prise par son autre bout.

### Task B1: Une date de fin de validité, et un test qui lève en la nommant

- [ ] **Step 1: Le champ**

Dans `src/lib/verticales/recouvrement/parametres.ts`, chaque entrée reçoit un champ optionnel `sourceValableJusqua?: string` (AAAA-MM-JJ), renseigné **uniquement** quand Légifrance annonce une fin de version. Ne rien inventer : une entrée sans date annoncée n'en porte pas.

- [ ] **Step 2: Le test qui mord**

Un test qui, pour chaque entrée portant une `sourceValableJusqua` passée, **échoue en nommant l'entrée et sa source**. Même discipline que le semestre manquant de la série de taux : on lève en nommant, on n'extrapole jamais.

⚠️ **Le test doit prendre le jour en argument**, avec le jour réel par défaut. Un test qui lit `Date.now()` sans porte d'entrée ne se vérifie pas avant l'échéance, et celui-ci doit être éprouvé maintenant.

- [ ] **Step 3: Les quatre entrées connues**

Relever et renseigner : `L441-9`, `L441-10`, `L441-11`, `L441-16` du code de commerce, et `289 bis` du CGI — toutes annoncées avec une version future ou une abrogation au 1er janvier 2027. **Relever sur Légifrance, une par une.** Ne pas recopier cette liste sans vérifier : elle vient d'un relevé, pas d'une lecture de ma part.

---

# LOT C — Réécrire, puis publier les pages légales

> ⚠️ **CE LOT A CHANGÉ DE TAILLE LE 23/09/2026, APRÈS LECTURE DES DOCUMENTS.**
> Il ne s'agit pas de publier quatre textes écrits. **Trois d'entre eux décrivent
> le produit précédent** : le barème EGalim, la plateforme « ma cantine », le
> « nombre de couverts par jour », et un accord de sous-traitance où « une cantine
> dépose ses factures ». La politique de confidentialité cite même un chemin de
> code qui n'existe plus (`src/lib/convex/egalim/tables.ts`).
>
> Les publier tels quels serait **pire que de n'avoir aucune page** : une politique
> de confidentialité qui décrit un traitement que le logiciel ne fait pas est un
> défaut de conformité, pas une page de confiance. Seules les mentions légales
> (`01-`) sont exemptes de toute trace du produit retiré.
>
> Le lot devient donc : établir les faits, réécrire trois documents sur ces faits,
> puis publier les quatre.

**Le blocage écrit dans le code n'existe plus.** `src/marketing/pied.tsx:8-12` dit : « Les conditions générales et la politique de confidentialité sont rédigées — voir `docs/juridique/` — mais elles attendent la relecture d'un juriste et n'ont pas encore de route publique. »

Or la décision du 21/09 est de **faire sans avocat**, en se documentant et en documentant tout. La prémisse du blocage a donc disparu, et le code ne le sait pas.

Ce que ça débloque, dans l'ordre d'importance :

1. **Une obligation, pas un confort.** Le produit traite des données personnelles de **tiers** — les débiteurs — qui ne sont pas ses utilisateurs. Une politique de confidentialité accessible n'est pas une page de confiance, c'est ce que le RGPD exige qu'on mette à disposition. Les mentions légales relèvent de la LCEN.
2. Un prérequis de toute vérification Google ou Microsoft, si la question revenait un jour.
3. Les quatre documents sont **écrits** (`docs/juridique/`).

## Ce que l'inventaire du 23/09 a établi

Cinq inventaires, chacun suivi d'un sceptique qui a rouvert les fichiers. **59 faits réfutés sur 180.** Ce qui suit est ce qui a survécu.

### Cinq questions que Jules seul peut trancher, et la première bloque tout

1. **LA FORME JURIDIQUE DE L'ÉDITEUR N'EST PAS ÉTABLIE, ET C'EST BLOQUANT.** `LEGAL_CONFIG` (`src/lib/config/legal.ts:47-58`) porte `companyName: 'Jules-Camille Doré'`, `legalForm: 'Entrepreneur Individuel'`, `rcs: 'Non inscrit au RCS'`, nom commercial « Thumbbb Agency », SIREN 879 853 026 — relevé au registre le 27 août 2026. Jules dit « Letikette SASU ». **Ce sont deux personnes juridiques différentes**, et une SASU est nécessairement immatriculée au RCS. Tant que ce n'est pas tranché, aucun des quatre documents ne peut être publié : les mentions légales nomment qui répond, les conditions générales nomment qui contracte.

2. **Aucun numéro de téléphone n'existe dans le produit.** L'article 1-1, I de la LCEN l'exige, pour l'éditeur comme pour l'hébergeur. Ni champ, ni valeur nulle part.

3. **Aucun directeur de la publication n'est désigné.** L'article 1-1, I exige le nom d'une personne physique. Le projet de document le signalait déjà, et ça n'a pas bougé en treize mois.

4. **La région du déploiement Convex de production (`insightful-crow-128`) est inconnue.** Convex n'offre que `aws-us-east-1` ou `aws-eu-west-1`, la région se fixe à la création et **ne se change pas**. Rien dans le dépôt ne la porte : elle se relève au tableau de bord. Elle décide si l'on écrit « hébergé dans l'Union » ou « transfert encadré » — on ne peut pas écrire l'un tant qu'on ignore lequel est vrai.

5. **La région Resend n'est fixée nulle part.** Le `eu-west-1` qui circule dans les documents vient d'un relevé DNS consigné dans un plan de travail, pas du produit. À reprendre au tableau de bord.

### Le transfert qu'il faut nommer, et la nuance qui le sauve

**Le contenu intégral de chaque document importé est transmis à Anthropic, aux États-Unis.** Trois points d'appel, nommés : `depot.ts:175` (extraction d'un document déposé), `preuve.ts:84` (lecture d'une pièce justificative), `conversation.ts:272` (le compagnon). Le PDF part **entier**, encodé en base64, sans rognage ni rastérisation. Le transfert hors Union est donc acquis, **indépendamment de la région Convex**.

⚠️ **Et la nuance est un argument, pas une excuse** : depuis le lot B de la partie 2, un PDF portant un Factur-X — ou une facture électronique en XML — est lu **entièrement en local**, et rien ne sort. Le document doit dire les deux : le cas où le fichier part, et le cas où il ne part pas.

Restent inconnus, et ils viennent des contrats, pas d'une page d'aide : l'accord de traitement avec Anthropic, l'exclusion contractuelle de l'entraînement, et les durées de conservation chez chaque sous-traitant.

### Ce que le BODACC voit, et c'est deux traitements, pas un

- **Le radar nocturne n'expose rien.** Il télécharge le delta national de la veille (`radar.ts:210-213`) et rapproche **localement** par SIREN. Aucune donnée client ne part. C'est un fait favorable et opposable, et il faut l'écrire : l'objection spontanée est l'inverse.
- **La recherche à la demande, elle, envoie la dénomination du débiteur en clair** dans l'URL d'une requête à un tiers (`debiteurs.ts:346-383`). Deux traitements, deux phrases.

### Cinq trous du produit qu'un document honnête ne peut pas contourner

1. **Aucune durée de conservation n'existe pour le contenu client.** Ni constante, ni cron. Factures, créances, décomptes, débiteurs : ils vivent tant que l'établissement vit. La **seule** durée écrite dans le code est celle du journal d'envois d'e-mails, à 90 jours.
2. **Rien ne se déclenche à la résiliation.** Le chaînon entre `subscription.canceled` (`paddle.ts:201`) et une purge n'existe pas. Le document ne peut donc promettre ni effacement au terme du contrat, ni fenêtre de récupération.
3. **Aucun effacement unitaire d'un débiteur.** Une demande d'effacement visant une personne ne peut recevoir aujourd'hui d'autre réponse technique que la suppression de l'établissement entier. C'est le trou le plus difficile à écrire honnêtement.
4. **Ni les sessions expirées, ni les invitations expirées ne sont purgées.** Les sessions portent une **adresse IP et un agent utilisateur** — le seul endroit du produit où une IP est stockée, mentionné nulle part. Les invitations portent l'adresse d'un tiers, et les documents annoncent 90 jours que **rien n'implémente**.
5. **`annuaireAvocats` est une base nominative de personnes physiques, mutualisée, hors de toute purge** (`tables.ts:838-852` ; zéro occurrence dans `rgpd.ts`). Elle contredit la phrase de `CLAUDE.md` « rien n'est mutualisé entre clients […] la purge RGPD est donc totale, sans exception à justifier ». Le test-barrière ne la voit pas, et c'est correct : il ne couvre que les tables portant un `organizationId`. Il faut une catégorie de personnes concernées de plus, et l'information de l'article 14 du RGPD.

**Et un cookie existe bien** : celui de session d'authentification, strictement nécessaire, exempté de consentement au titre de l'article 82 de la loi Informatique et Libertés. Aucun cookie de mesure, de publicité ni de réseau social. À décrire, pas à taire.

### L'ordre des tâches, une fois les cinq réponses obtenues

- [ ] **C1 — Corriger `LEGAL_CONFIG`** sur l'identité tranchée, et lui ajouter les champs manquants : téléphone, directeur de publication, capital social le cas échéant.
- [ ] **C2 — Réécrire la politique de confidentialité** sur l'inventaire ci-dessus. C'est le document le plus faux et le plus important : il doit décrire les **débiteurs** comme catégorie de personnes concernées, ce qu'aucune version n'a jamais fait.
- [ ] **C3 — Réécrire les conditions générales** sur le service réel, et l'accord de sous-traitance sur les sous-traitants réels.
- [ ] **C4 — Quatre routes publiques**, dans le système visuel de la page d'accueil (« papier, encre, filet »), pas celui de l'application.
- [ ] **C5 — Le pied de page les lie**, et son commentaire est réécrit pour dire ce qui a changé — surtout ne pas le supprimer. `destinations-existent.test.ts` et `aucun-ecran-orphelin.test.ts` doivent passer.

⚠️ **Ne rien promettre qu'on ne fasse.** Les trous ci-dessus se décrivent tels qu'ils sont, ou se comblent avant publication. Un document qui annonce une durée de conservation que rien n'applique est le même défaut que « déclaré, jamais alimenté » — avec, cette fois, une conséquence opposable.

---

# LOT D — Les factures entrent par e-mail

Le plus gros morceau, et **le seul dont la conception se décide par une mesure, pas par une lecture.**

**La croyance à démentir.** Jules pensait qu'aucun réglage DNS n'était nécessaire. C'est faux pour la réception : il faut un **MX**, sur un **sous-domaine dédié**. Mesuré : `letikette.com` porte `MX 1 smtp.google.com` — poser Resend sur la racine **détournerait tout le courrier de `bonjour@letikette.com`**. Et `send.letikette.com` porte déjà un MX de retours (`feedback-smtp.eu-west-1.amazonses.com`). Il faut un sous-domaine vierge.

**Pourquoi Resend plutôt que Postmark.** Pas parce qu'il est déjà là : à cause du **plafond de 20 Mo des actions HTTP Convex**. Postmark et SendGrid POSTent les pièces jointes en base64 dans le corps du webhook ; Resend n'envoie que des métadonnées et laisse télécharger les octets par une URL signée. Postmark reste nommé comme repli, pour son `MailboxHash`.

### Task D1: Mesurer avant d'écrire

**Une demi-journée qui évite de reconstruire le routage après coup.** Ouvrir une adresse gérée `<id>.resend.app` — aucun DNS requis — et y faire suivre une vraie facture depuis Gmail, depuis Outlook, depuis Apple Mail.

**Ce qu'on regarde, et c'est LE point de conception :** ce que porte `received_for` et ce que porte `to`. Quand on **fait suivre** un message, l'en-tête `To:` garde le destinataire d'origine et le jeton ne vit que dans l'enveloppe SMTP. **Router sur `to` ferait tomber une facture sur deux dans le vide**, et la documentation ne tranche pas.

Profiter de l'essai pour demander par écrit les deux inconnues : taille maximale d'un message entrant, et durée de rétention.

### Task D2: Le routage, et ses trois barrières

Une table `adressesDepot` : `{ organizationId, partieLocale (indexée, unique), creeeLe, revoqueeLe? }`. La partie locale **entière** est un jeton de 128 bits — pas de préfixe `depot+`, le `+` se fait mutiler en route.

**La réponse nette à la question d'usurpation : OUI, quiconque connaît l'adresse peut injecter une facture, et SPF/DKIM/DMARC n'y changent rien.** La RFC 7489 le dit en toutes lettres : DMARC authentifie un **domaine DNS**, jamais la partie locale. Un tiers qui enregistre son propre domaine obtient `pass` sur les trois.

D'où trois barrières **cumulatives**, dont aucune ne remplace les autres :

1. Un jeton imprévisible et **révocable**.
2. Une **liste d'expéditeurs connus par organisation**. Un expéditeur jamais vu va en *attente d'accueil*, pas en dossier.
3. `DMARC=pass` exigé pour l'accueil automatique — **condition nécessaire, jamais suffisante**.

⚠️ La vérification de signature Svix est à **écrire** pour ce point de terminaison : le `whsec_` d'un point Svix lui est propre, ce n'est pas celui du compte. Ce n'est pas du travail gratuit.

### Task D3: Le dépôt, et ce qu'il devient

Un message accueilli dépose ses pièces jointes exactement comme un dépôt manuel : mêmes chemins, même dédoublonnage, même bilan. Un Factur-X reçu par e-mail passe donc au lecteur déjà écrit, sans une ligne de plus. **C'est le cas qui comptera à partir de septembre 2027.**

---

# LOT E — Le chemin qui sert les 90 %

Pas d'OAuth, pas de vérification, pas d'audit. Le `mailto` livré au lot C de la partie 2, rendu meilleur.

### Task E1: Dater le plafond, et le mesurer

`PLAFOND_MAILTO = 1900` (`src/lib/verticales/recouvrement/messagerie.ts:52`) repose sur un seuil Chrome cité de seconde main. **Vérifier au navigateur où Chrome casse réellement aujourd'hui**, et inscrire la date et la source dans le commentaire. Un chiffre non daté a l'air d'une spécification alors qu'il n'en est pas une.

### Task E2: Sept gestes, dont trois hors du produit

Compté dans le code : pour envoyer une relance **avec le décompte arrêté en pièce jointe**, il faut (1) télécharger la pièce dans la section « décompte », (2) déplier la section « relances » — repliée par défaut, `sectionsParDefaut` (`creance.tsx:311-315`) ne rend que `['decompte']` ou `['decompte','litige']` —, (3) « Voir le texte », (4) « Ouvrir dans ma messagerie », puis hors du produit (5) joindre, (6) retrouver le fichier, (7) envoyer.

**`mailto` n'attachera jamais rien** (RFC 6068). Le gain possible est donc sur les gestes 1 à 4, et il est réel. À concevoir — pas à décider ici.

---

## Ce qui reste dehors, et pourquoi

- **Devenir plateforme agréée.** 158 opérateurs figurent déjà sur la liste DGFiP au 6 août 2026, tous à un stade d'immatriculation non définitif. Exigences relevées : immatriculation de trois ans renouvelable (art. 290 B du CGI), certification **ISO/IEC 27001** par un organisme accrédité COFRAC (annexe II au CGI, art. 242 nonies B, I, 5°), engagement de service d'au moins un an envers le client qui part (289 bis, III), amende de **50 € par facture plafonnée à 45 000 € par an** (art. 1737, IV). **Ce n'est pas une fonctionnalité, c'est un autre métier** — et un métier qui nous ferait transporter les factures d'autrui, ce qui nous rapproche de la première ligne rouge sans rien apporter au dirigeant qui paie.
- **Les transactions bancaires Qonto.** Bloqué à l'extérieur, et le gain est plus mince qu'il n'en a l'air : les factures Qonto portent déjà leur `amount_paid` et leur `paid_at`, un FEC porte déjà ses règlements. Le gain net ne porte que sur la fenêtre entre deux imports, pour des factures entrées par un chemin qui n'apporte jamais de règlement. **Le seul argument qui le justifie** — et le seul à mettre à l'écran — est que cette fenêtre est exactement celle pendant laquelle le produit prépare une relance à un client qui a déjà payé, ce que `lettrage.ts` appelle déjà « la pire erreur possible d'un logiciel de recouvrement ». Trois questions à poser à Qonto **avant toute ligne** : `organization.read` suppose-t-il un statut régulé (AISP ou agent) du demandeur ? quel délai ? l'ajout du droit oblige-t-il les clients déjà connectés à refaire leur connexion ?
- **UBL.** Même modèle sémantique EN 16931, chemins XML différents. C'est un portage, pas un ajustement. À faire quand un client dépose un UBL — le journal de friction ne l'a pas encore désigné.
- **Lire l'adresse électronique de l'acheteur dans la facture.** Piste séduisante — on vient de livrer tout le lot C pour obtenir à la main une adresse que la facture structurée porte peut-être déjà. **Mais le chemin XML avancé (`ram:URIUniversalCommunication/ram:URIID`) vient de la mémoire d'un modèle, pas d'une source.** La norme EN 16931 est payante. À relever dans la spécification Factur-X 1.07.3 du FNFE, qui est publique, **avant** d'écrire une ligne.
- **Lire le taux de pénalités dans la facture.** Même prudence, et le sceptique a eu raison contre le relevé : l'article 242 nonies J dit que les données structurées sont prises **« parmi »** les mentions obligatoires, et qu'un arrêté en fixe la liste. « Parmi » n'est pas « toutes ». Le taux vit dans `ram:SpecifiedTradePaymentTerms/ram:Description`, c'est-à-dire du **texte libre**. À relever dans l'arrêté du 27 juillet 2026 et les spécifications externes v3.0 avant d'y toucher.

---

## Les deux questions, répondues par Jules le 23/09/2026

**1. Qonto est une plateforme agréée.** Ce qui change : nous avons **déjà** un connecteur OAuth en production vers une plateforme agréée. La question « faut-il construire un connecteur plateforme » ne se pose donc plus en ces termes — elle devient : *que nous rend Qonto en tant que plateforme agréée que nous ne lisons pas encore ?*

Trois choses à établir auprès de Qonto, dans cet ordre, et **aucune ne demande d'écrire une ligne** :

- Le statut du **cycle de vie** d'une facture (déposée, reçue, refusée, encaissée) est la donnée que la réforme fait circuler entre plateformes. Qonto l'expose-t-il ? C'est ce qui remplacerait notre lecture du « réglé cumulé ».
- La **date effective de paiement** restituée au fournisseur. C'est elle qui, seule, supprimerait la fenêtre pendant laquelle le produit prépare une relance à un client qui a déjà payé.
- Les **factures reçues** (et pas seulement émises) : un client qui reçoit par Qonto reçoit du structuré. C'est une entrée que le lot D construit péniblement par e-mail.

⚠️ **À vérifier avant d'en tirer quoi que ce soit** : sur quelle liste officielle, et sous quel statut d'immatriculation. Au 6 août 2026, les 158 opérateurs de la liste DGFiP étaient tous à un stade non définitif — ce qui n'empêche pas d'exploiter, mais qu'il faut savoir avant d'écrire « notre partenaire est agréé » quelque part.

**2. C'est Letikette SASU qui émet, via Paddle comme vendeur de droit.** Donc, pour nos propres factures : émetteur établi en France, destinataire professionnel établi en France → la condition de l'article 289 bis, I est remplie, et **la facturation électronique obligatoire nous vise**, à l'émission au 1er septembre 2027.

Et indépendamment du sens de la vente : **l'obligation de RÉCEPTION nous vise depuis le 1er septembre 2026**, comme toute entreprise française, pour nos propres factures fournisseurs. Il faut donc une plateforme agréée en réception pour Letikette elle-même. Ce n'est pas une tâche de développement, c'est une démarche d'entreprise — et elle est en retard de trois semaines.

⚠️ Le montage Paddle mérite d'être tranché pour de bon : dans un modèle *merchant of record*, la question de savoir qui émet juridiquement la facture au client final n'est pas un détail de configuration. Cette section enregistre la réponse de Jules ; elle ne la vérifie pas.

## Et un risque, qui n'est pas une tâche

Tout ce relevé lit la réforme comme une aubaine. Il faut poser la question symétrique : **qu'arrive-t-il à notre entrée quand les factures cessent de circuler en PDF ?** Notre ingestion repose sur des fichiers déposés et sur une banque. Si, à partir du 1er septembre 2027, la facture de vente de notre client existe d'abord chez un opérateur tiers, le dépôt de PDF devient un chemin résiduel et le point d'accès aux données ne nous appartient plus. Ce n'est pas une opportunité de format, c'est une question d'existence — et elle mérite une décision, pas une tâche.
