import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Button, Input } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';
import { CadreAuth, Champ, MessageErreur } from '../ui';

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
		<CadreAuth
			titre="Connexion"
			explication="Retrouvez vos taux, vos factures et vos diagnostics."
			pied={
				<>
					<Link to="/mot-de-passe-oublie" className="font-medium underline underline-offset-2">
						Mot de passe oublié ?
					</Link>
					<span>
						Pas encore de compte ?{' '}
						<Link to="/inscription" className="font-medium underline underline-offset-2">
							En créer un
						</Link>
					</span>
				</>
			}
		>
			<form onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<Champ etiquette="Adresse e-mail">
					<Input type="email" name="email" value={email} onChange={setEmail} required />
				</Champ>

				<Champ etiquette="Mot de passe">
					<Input
						type="password"
						name="password"
						value={motDePasse}
						onChange={setMotDePasse}
						required
					/>
				</Champ>

				{erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

				<Button
					type="submit"
					color="brand"
					variant="solid-fill"
					size="lg"
					loading={enCours}
					readOnly={enCours}
				>
					Se connecter
				</Button>
			</form>
		</CadreAuth>
	);
}
