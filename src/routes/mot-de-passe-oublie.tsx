import { useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Button, Input, SectionTitle } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';

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
			<div className="flex min-h-dvh items-center justify-center p-cladd-xs">
				<div className="flex w-full max-w-sm flex-col gap-cladd-2xs">
					<h1 className="text-cladd-md font-semibold tracking-tight">Vérifiez votre boîte mail.</h1>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Si un compte existe pour <span className="font-medium">{email}</span>, un lien de
						réinitialisation vient d&rsquo;y être envoyé. Il est valable une heure.
					</p>
					<p className="text-cladd-2xs text-cladd-fg-softer">
						Rien reçu au bout de quelques minutes ? Regardez dans les indésirables, puis
						réessayez.
					</p>
					<Button as={Link} to="/connexion" variant="gradient">
						Revenir à la connexion
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-dvh items-center justify-center p-cladd-xs">
			<form onSubmit={soumettre} className="flex w-full max-w-sm flex-col gap-cladd-2xs">
				<div>
					<h1 className="text-cladd-md font-semibold tracking-tight">Mot de passe oublié</h1>
					<p className="mt-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Indiquez votre adresse : nous vous enverrons un lien pour en choisir un nouveau.
					</p>
				</div>

				<label className="flex flex-col gap-1">
					<SectionTitle>Adresse e-mail</SectionTitle>
					<Input type="email" value={email} onChange={setEmail} name="email" required />
				</label>

				<Button type="submit" color="brand" variant="solid-fill" loading={enCours}>
					Envoyer le lien
				</Button>

				<p className="text-cladd-2xs text-cladd-fg-softer">
					<Link to="/connexion" className="font-medium underline underline-offset-2">
						Revenir à la connexion
					</Link>
				</p>
			</form>
		</div>
	);
}
