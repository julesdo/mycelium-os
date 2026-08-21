import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Button, Input } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';
import { CadreAuth, Champ, MessageErreur } from '../ui';

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
			<CadreAuth
				titre="Ce lien est incomplet."
				explication="Il a peut-être été coupé par votre messagerie. Demandez-en un nouveau, il arrivera en quelques secondes."
			>
				<Button as={Link} to="/mot-de-passe-oublie" color="brand" variant="solid-fill" size="lg">
					Demander un nouveau lien
				</Button>
			</CadreAuth>
		);
	}

	return (
		<CadreAuth
			titre="Nouveau mot de passe"
			explication="Choisissez-en un, et vous retrouverez vos taux et vos factures."
		>
			<form onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<Champ
					etiquette="Mot de passe"
					aide={`${LONGUEUR_MINIMALE} caractères au minimum. Une phrase dont vous vous souvenez vaut mieux qu’un mot compliqué.`}
				>
					<Input
						type="password"
						value={motDePasse}
						onChange={setMotDePasse}
						name="new-password"
						valid={!tropCourt}
						errorMessage={`${LONGUEUR_MINIMALE} caractères au minimum`}
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
					Enregistrer et me connecter
				</Button>
			</form>
		</CadreAuth>
	);
}
