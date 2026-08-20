import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Button, Input } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';

export const Route = createFileRoute('/connexion')({ component: Connexion });

function Connexion() {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [motDePasse, setMotDePasse] = useState('');
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		setErreur(null);
		setEnCours(true);
		const { error } = await authClient.signIn.email({ email, password: motDePasse });
		setEnCours(false);
		if (error) {
			// Message unique et neutre : distinguer « compte inconnu » de « mot de
			// passe faux » révélerait à un inconnu si une adresse est cliente.
			setErreur("L'adresse ou le mot de passe ne correspond pas.");
			return;
		}
		await navigate({ to: '/app' });
	}

	return (
		<div className="flex min-h-dvh items-center justify-center p-cladd-xs">
			<form onSubmit={soumettre} className="flex w-full max-w-sm flex-col gap-cladd-2xs">
				<div>
					<h1 className="text-cladd-md font-semibold tracking-tight">Connexion</h1>
					<p className="mt-0.5 text-cladd-xs text-cladd-fg-soft">
						Accédez à la conformité EGalim de votre cantine.
					</p>
				</div>

				<label className="flex flex-col gap-1">
					<span className="text-cladd-2xs font-medium text-cladd-fg-soft">Adresse e-mail</span>
					<Input type="email" name="email" value={email} onChange={setEmail} required />
				</label>

				<label className="flex flex-col gap-1">
					<span className="text-cladd-2xs font-medium text-cladd-fg-soft">Mot de passe</span>
					<Input
						type="password"
						name="password"
						value={motDePasse}
						onChange={setMotDePasse}
						required
					/>
				</label>

				{erreur ? (
					<p role="alert" className="text-cladd-2xs text-seuil-manque">
						{erreur}
					</p>
				) : null}

				<Button type="submit" color="brand" variant="solid-fill" loading={enCours}>
					Se connecter
				</Button>

				<p className="text-cladd-2xs text-cladd-fg-softer">
					<Link to="/mot-de-passe-oublie" className="font-medium underline underline-offset-2">
						Mot de passe oublié ?
					</Link>
				</p>

				<p className="text-cladd-2xs text-cladd-fg-softer">
					Vous n&rsquo;avez pas encore de compte ?{' '}
					<Link to="/inscription" className="font-medium underline underline-offset-2">
						En créer un
					</Link>
				</p>
			</form>
		</div>
	);
}
