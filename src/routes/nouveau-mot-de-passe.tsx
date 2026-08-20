import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Button, Input, SectionTitle } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';

const LONGUEUR_MINIMALE = 12;

export const Route = createFileRoute('/nouveau-mot-de-passe')({
	// Le jeton arrive en paramètre d'URL, posé par le lien de l'e-mail.
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === 'string' ? search.token : ''
	}),
	component: NouveauMotDePasse
});

function NouveauMotDePasse() {
	const navigate = useNavigate();
	const { token } = Route.useSearch();
	const [motDePasse, setMotDePasse] = useState('');
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	const tropCourt = motDePasse.length > 0 && motDePasse.length < LONGUEUR_MINIMALE;

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		if (motDePasse.length < LONGUEUR_MINIMALE) return;
		setErreur(null);
		setEnCours(true);
		const { error } = await authClient.resetPassword({ newPassword: motDePasse, token });
		setEnCours(false);
		if (error) {
			setErreur(
				'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau depuis la page de connexion.'
			);
			return;
		}
		await navigate({ to: '/connexion' });
	}

	if (!token) {
		return (
			<div className="flex min-h-dvh items-center justify-center p-cladd-xs">
				<div className="flex w-full max-w-sm flex-col gap-cladd-2xs">
					<h1 className="text-cladd-md font-semibold tracking-tight">Ce lien est incomplet.</h1>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Il a peut-être été coupé par votre messagerie. Demandez-en un nouveau, il arrivera
						en quelques secondes.
					</p>
					<Button as={Link} to="/mot-de-passe-oublie" color="brand" variant="solid-fill">
						Demander un nouveau lien
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-dvh items-center justify-center p-cladd-xs">
			<form onSubmit={soumettre} className="flex w-full max-w-sm flex-col gap-cladd-2xs">
				<div>
					<h1 className="text-cladd-md font-semibold tracking-tight">Nouveau mot de passe</h1>
					<p className="mt-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Choisissez-en un, et vous retrouverez vos taux et vos factures.
					</p>
				</div>

				<label className="flex flex-col gap-1">
					<SectionTitle>Mot de passe</SectionTitle>
					<Input
						type="password"
						value={motDePasse}
						onChange={setMotDePasse}
						name="new-password"
						required
					/>
					<span
						className={
							tropCourt
								? 'text-cladd-3xs text-seuil-manque'
								: 'text-cladd-3xs text-cladd-fg-softer'
						}
					>
						{LONGUEUR_MINIMALE} caractères au minimum. Une phrase dont vous vous souvenez vaut
						mieux qu&rsquo;un mot compliqué.
					</span>
				</label>

				{erreur ? (
					<p role="alert" className="text-cladd-2xs text-seuil-manque">
						{erreur}
					</p>
				) : null}

				<Button type="submit" color="brand" variant="solid-fill" loading={enCours}>
					Enregistrer et me connecter
				</Button>
			</form>
		</div>
	);
}
