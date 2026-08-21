import { useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Button, Input } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';
import { CadreAuth, Champ } from '../ui';

export const Route = createFileRoute('/mot-de-passe-oublie')({ component: MotDePasseOublie });

function MotDePasseOublie() {
	const [email, setEmail] = useState('');
	const [envoye, setEnvoye] = useState(false);
	const [enCours, setEnCours] = useState(false);

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		setEnCours(true);
		await authClient.requestPasswordReset({
			email,
			redirectTo: `${window.location.origin}/nouveau-mot-de-passe`
		});
		setEnCours(false);
		// On confirme l'envoi SANS dire si l'adresse existe : répondre « compte
		// inconnu » à un inconnu lui apprend quelles cantines sont clientes.
		setEnvoye(true);
	}

	if (envoye) {
		return (
			<CadreAuth
				titre="Vérifiez votre boîte mail."
				explication={`Si un compte existe pour ${email}, un lien de réinitialisation vient d’y être envoyé. Il est valable une heure.`}
			>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					Rien reçu au bout de quelques minutes ? Regardez dans les indésirables, puis réessayez.
				</p>
				<Button as={Link} to="/connexion" size="lg">
					Revenir à la connexion
				</Button>
			</CadreAuth>
		);
	}

	return (
		<CadreAuth
			titre="Mot de passe oublié"
			explication="Indiquez votre adresse : nous vous enverrons un lien pour en choisir un nouveau."
			pied={
				<Link to="/connexion" className="font-medium underline underline-offset-2">
					Revenir à la connexion
				</Link>
			}
		>
			<form onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<Champ etiquette="Adresse e-mail">
					<Input type="email" value={email} onChange={setEmail} name="email" required />
				</Champ>

				<Button
					type="submit"
					color="brand"
					variant="solid-fill"
					size="lg"
					loading={enCours}
					readOnly={enCours}
				>
					Envoyer le lien
				</Button>
			</form>
		</CadreAuth>
	);
}
