import { useEffect, useRef, useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import type { Paddle } from '@paddle/paddle-js';
import { useQuery } from '../app/donnees';
import { api } from '../lib/convex/_generated/api';
import { LogoLetikette } from '../ui';
import { getLegalEmailAddress } from '../lib/config/legal';

/**
 * LE LIEN DE PAIEMENT PAR DÉFAUT DU COMPTE PADDLE (14/10/2026).
 *
 * Paddle envoie lui-même des liens de paiement : une facture à régler, une carte
 * à remplacer après un échec. Ils mènent tous à l'adresse que le compte déclare
 * comme « lien de paiement par défaut », avec `?_ptxn=<transaction>`. Paddle.js,
 * initialisé sur cette page, ouvre seul le paiement de cette transaction
 * (documentation de Paddle, « pass a transaction to a checkout »).
 *
 * ⚠️ PUBLIQUE, SANS SESSION : celui qui paie n'est pas forcément connecté, et
 * `/app/compte` l'aurait renvoyé vers la connexion en perdant `_ptxn`. La page
 * ne lit que l'environnement et le jeton côté client (`paddle.lienDePaiement`),
 * publics par nature. Le compte Paddle doit donc déclarer
 * `https://www.letikette.com/paiement` (voir `serveurs/paddle/LISEZMOI.md`).
 *
 * L'abonnement, lui, s'inscrit comme toujours par le rappel de Paddle : la page
 * ne fait que dire où en est le paiement.
 */
export const Route = createFileRoute('/paiement')({
	validateSearch: (recherche: Record<string, unknown>): { _ptxn?: string } =>
		typeof recherche['_ptxn'] === 'string' ? { _ptxn: recherche['_ptxn'] } : {},
	head: () => ({
		meta: [{ title: 'Paiement · Letikette' }, { name: 'robots', content: 'noindex, nofollow' }]
	}),
	component: PagePaiementPaddle
});

type Etape = 'ouverture' | 'ouvert' | 'regle' | 'ferme' | 'erreur';

function PagePaiementPaddle() {
	const { _ptxn: transaction } = Route.useSearch();
	const reglages = useQuery(api.paddle.lienDePaiement, {});
	const [etape, setEtape] = useState<Etape>('ouverture');
	const paddle = useRef<Paddle | null>(null);

	// Paddle.js est un système extérieur : on l'initialise une fois les réglages
	// lus, et il ouvre seul le paiement de la transaction passée dans l'adresse.
	useEffect(() => {
		if (!transaction || !reglages) return;
		let actif = true;
		void import('@paddle/paddle-js')
			.then(({ initializePaddle }) =>
				initializePaddle({
					environment: reglages.environnement,
					token: reglages.jeton,
					checkout: { settings: { displayMode: 'overlay', locale: 'fr', allowLogout: false } },
					eventCallback: (evenement) => {
						if (!actif) return;
						if (evenement.name === 'checkout.loaded') setEtape('ouvert');
						if (evenement.name === 'checkout.completed') setEtape('regle');
						if (evenement.name === 'checkout.closed') {
							setEtape((avant) => (avant === 'regle' ? avant : 'ferme'));
						}
						if (evenement.name === 'checkout.error') setEtape('erreur');
					}
				})
			)
			.then((instance) => {
				if (actif) paddle.current = instance ?? null;
			})
			.catch(() => {
				if (actif) setEtape('erreur');
			});
		return () => {
			actif = false;
		};
	}, [transaction, reglages]);

	const rouvrir = () => {
		if (!paddle.current || !transaction) return;
		setEtape('ouverture');
		paddle.current.Checkout.open({ transactionId: transaction });
	};

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-cladd-xs bg-creme p-cladd-xs text-center text-encre-site">
			<LogoLetikette className="size-12" />
			<Message
				etape={etape}
				transaction={transaction}
				indisponible={reglages === null}
				onRouvrir={rouvrir}
			/>
		</main>
	);
}

function Message({
	etape,
	transaction,
	indisponible,
	onRouvrir
}: {
	etape: Etape;
	transaction: string | undefined;
	indisponible: boolean;
	onRouvrir: () => void;
}) {
	const contact = getLegalEmailAddress();
	if (!transaction) {
		return (
			<Bloc titre="Ce lien de paiement est incomplet.">
				Ouvrez le lien reçu par e-mail tel quel, ou écrivez-nous à{' '}
				<a href={`mailto:${contact}`} className="underline underline-offset-4">
					{contact}
				</a>
				.
			</Bloc>
		);
	}
	if (indisponible || etape === 'erreur') {
		return (
			<Bloc titre="Le paiement ne s’ouvre pas pour le moment.">
				Réessayez dans un instant. S’il ne s’ouvre toujours pas, écrivez-nous à{' '}
				<a href={`mailto:${contact}`} className="underline underline-offset-4">
					{contact}
				</a>{' '}
				: nous réglons cela avec vous.
			</Bloc>
		);
	}
	if (etape === 'regle') {
		return (
			<Bloc titre="C’est réglé.">
				Paddle, notre revendeur, vous envoie le reçu par e-mail.{' '}
				<Link to="/app/compte" className="underline underline-offset-4">
					Revenir à Letikette
				</Link>
				.
			</Bloc>
		);
	}
	if (etape === 'ferme') {
		return (
			<Bloc titre="Le paiement est fermé.">
				Rien n’a été réglé.{' '}
				<button
					type="button"
					onClick={onRouvrir}
					className="font-semibold underline underline-offset-4"
				>
					Le rouvrir
				</button>
			</Bloc>
		);
	}
	return <Bloc titre="Votre paiement s’ouvre…">Il s’affiche chez Paddle, notre revendeur.</Bloc>;
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
	return (
		<div className="flex max-w-sm flex-col gap-cladd-3xs">
			<h1 className="text-cladd-md font-semibold">{titre}</h1>
			<p className="text-cladd-sm leading-relaxed text-encre-site-douce">{children}</p>
		</div>
	);
}
