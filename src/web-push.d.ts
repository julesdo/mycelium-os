/**
 * LES TYPES DE `web-push`, POUR CE QUE LE PRODUIT EN EMPLOIE (21/10/2026).
 *
 * La bibliothèque ne livre pas ses types, et `@types/web-push` ne s'installe pas ici
 * (bun se fige après l'extraction, scripts coupés ou non). Trois fonctions suffisent :
 * les déclarer ici garde le déploiement Convex typé, sans dépendance de plus.
 *
 * ⚠️ DEUX COPIES, UNE PAR PROJET, comme `env.d.ts` et `convex-env.d.ts` : le tsconfig de
 * l’application exclut `src/lib/convex/**`, celui de Convex ne voit que son dossier.
 * Celle de Convex : `src/lib/convex/push/web-push.d.ts`.
 */
declare module 'web-push' {
	interface AbonnementPush {
		endpoint: string;
		keys: { p256dh: string; auth: string };
	}
	interface OptionsDEnvoi {
		TTL?: number;
		urgency?: 'very-low' | 'low' | 'normal' | 'high';
		topic?: string;
	}
	interface ClesVapid {
		publicKey: string;
		privateKey: string;
	}
	interface WebPush {
		setVapidDetails(sujet: string, clePublique: string, clePrivee: string): void;
		sendNotification(
			abonnement: AbonnementPush,
			charge?: string,
			options?: OptionsDEnvoi
		): Promise<{ statusCode: number }>;
		generateVAPIDKeys(): ClesVapid;
	}
	const webpush: WebPush;
	export default webpush;
}
