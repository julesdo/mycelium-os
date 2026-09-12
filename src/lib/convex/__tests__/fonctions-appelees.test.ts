import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * TOUTE FONCTION PUBLIQUE EST APPELÉE PAR QUELQUE CHOSE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA QUATRIÈME BARRIÈRE, ET CELLE QUI TENAIT LE PLUS GROS TROU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une `authedMutation` est une FONCTIONNALITÉ. Un champ orphelin coûte une
 * donnée ; une mutation orpheline coûte un geste entier, et avec lui tout ce
 * qui en découle.
 *
 * `engagerProcedure` n'était appelée par personne. Conséquence, découverte le
 * 12 septembre 2026 : **aucune créance ne pouvait jamais passer à `ENGAGEE`**.
 * Donc `suiviDeLaCreance` rendait toujours `null`. Donc la machine à états
 * post-procédure — cinq étapes, leurs transitions, leurs délais de caducité —
 * ne pouvait pas démarrer. Donc les événements `ECHEANCE_PROCEDURE` du flux ne
 * pouvaient jamais survenir, ni les notifications qui en dépendent.
 *
 * Un sous-système entier, écrit et testé, que rien ne pouvait atteindre. Ce
 * n'est pas un oubli d'une ligne : c'est le geste central du module 4.5 du
 * blueprint, marqué « existe » dans le tableau.
 *
 * ⚠️ ET `lookupSiren` AURAIT ÉTÉ ATTRAPÉE AUSSI — une `action` non
 * authentifiée vers une API payante, sans appelant, dont la clé n'était posée
 * nulle part. Retirée le 11 septembre.
 *
 * Les trois autres barrières de la même famille :
 * `champs-alimentes` (le schéma), `ui/destinations-existent` (les liens
 * sortants) et `ui/aucun-ecran-orphelin` (les liens entrants).
 *
 * ⚠️ APPROXIMATIF PAR CONSTRUCTION, comme les autres : il lit du texte, pas un
 * graphe d'appels. Un test approximatif qui déclenche une vérification humaine
 * vaut mieux qu'aucun test ; un test dont on désactive les alertes sans les
 * lire est pire que rien, parce qu'il rassure.
 */

/** `src/lib/convex` */
const CONVEX = join(import.meta.dirname, '..');
/**
 * Où chercher les appels : `src`, MAIS AUSSI `e2e`.
 *
 * ⚠️ SANS `e2e`, LES SIX FONCTIONS DU HARNAIS PASSAIENT POUR ORPHELINES. Elles
 * sont appelées par `e2e/global-setup.ts` et `global-teardown.ts`, qui vivent
 * hors de `src` — et elles sont gardées par `AUTH_E2E_TEST_SECRET`, posé
 * uniquement sur les déploiements de test. Les inscrire en exception aurait
 * été doublement faux : elles ne sont pas orphelines, et la ligne d'exception
 * aurait masqué le jour où elles le deviendraient vraiment.
 */
const RACINES = [join(CONVEX, '..', '..'), join(CONVEX, '..', '..', '..', 'e2e')];

/**
 * Les fonctions publiques qu'aucun écran n'appelle, et POURQUOI c'est normal.
 *
 * ⚠️ CHAQUE ENTRÉE EST UNE DETTE, PAS UNE DISPENSE. On n'en ajoute pas pour
 * faire passer le test : on en ajoute après avoir regardé et conclu.
 */
const APPELEES_AUTREMENT: Readonly<Record<string, string>> = {
	setSimulatedTier: 'Bascule de palier, réservée au développement. Hors production.',
	activateDevPlan: 'Ouverture d’un plan de développement. Hors production.',

	// ─────────────────────────────────────────────────────────────────────────
	// ⚠️ CE QUI SUIT N'EST PAS EXCUSÉ : C'EST DE LA DETTE, ÉCRITE.
	// ─────────────────────────────────────────────────────────────────────────
	//
	// Ces fonctions sont complètes et injoignables. Les inscrire ici ne les
	// répare pas — ça les NOMME, pour qu'on cesse de les redécouvrir une par
	// une en travaillant sur autre chose. Chaque ligne dit ce qui manque et ce
	// que ça coûte. Elles sortent de cette liste le jour où un écran les
	// appelle, pas le jour où on les oublie.

	// LE SYSTÈME DE NOTIFICATION, ENTIER. Le blueprint le veut au module 2.1 :
	// « recalcul quotidien, notification SANS QU'ON OUVRE L'ÉCRAN ». Les
	// notifications sont écrites en base par le battement ; aucune interface ne
	// les lit, ne les compte, ni ne les marque lues. Le produit notifie donc
	// dans le vide. C'est la dette la plus visible de cette liste.
	listMyNotifications: 'DETTE — aucune interface de notification. Blueprint 2.1.',
	getUnreadCount: 'DETTE — le compteur existe, aucune pastille ne le porte.',
	markAsRead: 'DETTE — rien ne permet de marquer une notification lue.',
	markAllAsRead: 'DETTE — idem, en masse.',

	// LA GESTION D'ABONNEMENT. Un client qui paie ne peut ni voir son
	// abonnement ni ouvrir le portail Paddle pour changer de carte ou résilier.
	// Sur un produit vendu par abonnement, c'est un manque de livrable.
	getMySubscription: 'DETTE — aucun écran ne montre l’abonnement en cours.',
	getPortalUrl: 'DETTE — le portail Paddle (carte, résiliation) est injoignable.',

	// L'IDENTITÉ VISUELLE DE L'ÉTABLISSEMENT ET DU COMPTE. Héritées de Fleet,
	// jamais rebranchées après le pivot. Le décompte porte l'en-tête du
	// créancier depuis `profilsCreancier`, pas depuis ces logos.
	generateOrgLogoUploadUrl: 'DETTE — dépôt du logo d’établissement, sans écran.',
	saveOrgLogo: 'DETTE — idem.',
	deleteOrgLogo: 'DETTE — idem.',
	generateUploadUrl: 'DETTE — dépôt d’image de profil, sans écran.',
	updateProfileImage: 'DETTE — idem.',
	getProfileImageUrl: 'DETTE — idem. L’avatar se contente des initiales.',

	// INVITATIONS ET AUTHENTIFICATION, héritées de Fleet. L'écran d'équipe
	// invite UNE personne à la fois et accepte par jeton ; ces variantes-là
	// n'ont jamais eu d'interface dans ce produit.
	bulkInviteOrganizationMembers: 'DETTE — invitation en masse, jamais exposée.',
	acceptInvitationDirect: 'DETTE — acceptation sans jeton, jamais exposée.',
	getAvailableOAuthProviders: 'DETTE — l’écran de connexion ne propose que l’e-mail.',
	findByCredentialID: 'DETTE — passkeys : le socle existe, aucun écran ne les propose.',
	listByUserId: 'DETTE — idem.'
};

function fichiers(dossier: string, acc: string[] = []): string[] {
	for (const entree of readdirSync(dossier)) {
		if (entree === '_generated' || entree === 'node_modules') continue;
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) fichiers(chemin, acc);
		else if (/\.tsx?$/.test(entree)) acc.push(chemin);
	}
	return acc;
}

/**
 * Les fonctions Convex PUBLIQUES : celles qu'une interface peut appeler.
 *
 * ⚠️ ANCRÉ EN COLONNE ZÉRO (`^export const`, sans espace devant), et c'est ce
 * qui évite de retirer les commentaires.
 *
 * `functions.ts` montre `export const myQuery = authedQuery({ … })` dans un
 * bloc de documentation pour expliquer l'usage. Sans ancrage, le balayage y
 * voyait une fonction publique `myQuery` que personne n'appelait — et pour
 * cause. Dans un bloc JSDoc la ligne est préfixée par « * », donc jamais en
 * colonne zéro : l'ancre suffit.
 *
 * ⚠️ ET RETIRER LES COMMENTAIRES AURAIT ÉTÉ PIRE QUE LE PROBLÈME. Un
 * `/\*…*\/` naïf ouvre un faux commentaire sur `accept="image/*"` — présent
 * dans l'écran d'import — et avale le code qui suit. C'est arrivé : le
 * balayage déclarait alors `genererUrlDepot` et `enregistrerFichier`
 * orphelines alors que l'écran d'import les appelle toutes les deux, deux
 * lignes plus bas. Un balayage qui SUR-déclare use la patience ; un balayage
 * qui SOUS-déclare rassure à tort. Celui-là faisait les deux.
 */
function fonctionsPubliques(): readonly { nom: string; fichier: string }[] {
	const trouvees: { nom: string; fichier: string }[] = [];
	for (const chemin of fichiers(CONVEX)) {
		const relatif = chemin.slice(CONVEX.length + 1).split(sep).join('/');
		if (relatif.startsWith('__tests__/')) continue;
		const source = readFileSync(chemin, 'utf8');
		for (const [, nom] of source.matchAll(
			/^export const (\w+) = (?:authedMutation|authedQuery|mutation|query|action)\(/gm
		)) {
			if (nom !== undefined) trouvees.push({ nom, fichier: relatif });
		}
	}
	return trouvees;
}

describe('les fonctions Convex publiques', () => {
	it('sont toutes appelées par quelque chose', () => {
		const publiques = fonctionsPubliques();
		// Si l'extraction casse, le test doit ÉCHOUER, pas passer sur zéro.
		expect(publiques.length).toBeGreaterThan(20);

		/**
		 * ⚠️ LES TESTS SONT EXCLUS DES APPELANTS, et c'est tout l'intérêt. Une
		 * fonction appelée uniquement par son propre test n'est pas une fonction
		 * appelée : c'est précisément la forme que prenaient les douze défauts de
		 * cette famille — écrits, testés, verts, et injoignables.
		 *
		 * ⚠️ LE MODULE DÉCLARANT, LUI, COMPTE. Une requête appelée par une action
		 * du même fichier — `denominationDuDebiteur` depuis `chercherAuRegistre` —
		 * est atteinte pour de bon : c'est l'action qui porte la chaîne jusqu'à
		 * l'écran. L'exclure produisait de faux orphelins, et un test qui crie à
		 * tort s'éteint aussi sûrement qu'un test absent.
		 */
		const appelants = RACINES.flatMap((racine) => fichiers(racine))
			.map((f) => [f.split(sep).join('/'), readFileSync(f, 'utf8')] as const)
			.filter(([chemin]) => !chemin.includes('/__tests__/'));

		const orphelines: string[] = [];

		for (const { nom, fichier } of publiques) {
			if (nom in APPELEES_AUTREMENT) continue;

			// `api.<module>.<nom>` — la seule façon d'appeler une fonction publique.
			const appel = new RegExp(String.raw`\b(?:api|internal)\.[\w.]*\b` + nom + String.raw`\b`);
			if (!appelants.some(([, texte]) => appel.test(texte))) {
				orphelines.push(`${fichier} → ${nom}`);
			}
		}

		expect(
			orphelines,
			[
				'Fonctions publiques que rien n’appelle :',
				...orphelines.map((o) => `  ${o}`),
				'',
				'Une mutation orpheline est une FONCTIONNALITÉ inatteignable, pas',
				'une ligne morte. Soit on la branche, soit on la retire, soit on',
				'l’inscrit dans APPELEES_AUTREMENT avec la raison.'
			].join('\n')
		).toEqual([]);
	});

	it('n’excuse rien qui n’existe plus', () => {
		const noms = new Set(fonctionsPubliques().map((f) => f.nom));
		const perimees = Object.keys(APPELEES_AUTREMENT).filter((n) => !noms.has(n));
		expect(perimees, `Exceptions sans fonction correspondante : ${perimees.join(', ')}`).toEqual([]);
	});
});
