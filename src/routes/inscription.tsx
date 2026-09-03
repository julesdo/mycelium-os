import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Button, Input } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';
import { CadreAuth, Champ, MessageErreur } from '../ui';

/**
 * `invitation` porte le jeton d'une invitation en cours.
 *
 * SANS LUI, UN INVITÉ PERD SON INVITATION EN CRÉANT SON COMPTE, et le pire suit :
 * l'écran suivant lui demande de créer un établissement, alors qu'il vient
 * précisément d'être invité dans celui de quelqu'un d'autre. On repasse donc par
 * l'écran d'acceptation, et jamais par `/bienvenue`.
 */
export const Route = createFileRoute('/inscription')({
	validateSearch: (search: Record<string, unknown>): { invitation?: string } => ({
		invitation: typeof search.invitation === 'string' ? search.invitation : undefined
	}),
	component: Inscription
});

const LONGUEUR_MINIMALE = 12;

function Inscription() {
	const navigate = useNavigate();
	const { invitation } = Route.useSearch();
	const [nom, setNom] = useState('');
	const [email, setEmail] = useState('');
	const [motDePasse, setMotDePasse] = useState('');
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	const tropCourt = motDePasse.length > 0 && motDePasse.length < LONGUEUR_MINIMALE;

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		if (motDePasse.length < LONGUEUR_MINIMALE) return;
		setErreur(null);
		setEnCours(true);
		const { error } = await authClient.signUp.email({
			email,
			password: motDePasse,
			name: nom.trim() || email
		});
		setEnCours(false);
		if (error) {
			setErreur(
				"Ce compte n'a pas pu être créé. L'adresse est peut-être déjà utilisée : essayez de vous connecter."
			);
			return;
		}
		if (invitation) {
			await navigate({ to: '/rejoindre/$token', params: { token: invitation } });
			return;
		}
		await navigate({ to: '/bienvenue' });
	}

	return (
		<CadreAuth
			titre="Créer un compte"
			explication="Puis vos factures, et vous saurez ce qui est encore récupérable."
			pied={
				<span>
					Vous avez déjà un compte ?{' '}
					<Link to="/connexion" className="font-medium underline underline-offset-2">
						Se connecter
					</Link>
				</span>
			}
		>
			<form onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<Champ etiquette="Votre nom">
					<Input value={nom} onChange={setNom} name="name" required />
				</Champ>

				<Champ etiquette="Adresse e-mail">
					<Input type="email" value={email} onChange={setEmail} name="email" required />
				</Champ>

				{/*
				  Une longueur, pas un jeu de caractères imposé. Exiger une majuscule
				  et un chiffre produit « Cantine2024! » chez tout le monde ; exiger
				  douze caractères produit une vraie phrase.
				*/}
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
					Créer mon compte
				</Button>
			</form>
		</CadreAuth>
	);
}
