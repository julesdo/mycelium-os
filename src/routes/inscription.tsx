import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Button, Input, SectionTitle } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';

export const Route = createFileRoute('/inscription')({ component: Inscription });

const LONGUEUR_MINIMALE = 12;

function Inscription() {
	const navigate = useNavigate();
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
		await navigate({ to: '/bienvenue' });
	}

	return (
		<div className="flex min-h-dvh items-center justify-center p-cladd-xs">
			<form onSubmit={soumettre} className="flex w-full max-w-sm flex-col gap-cladd-2xs">
				<div>
					<h1 className="text-cladd-md font-semibold tracking-tight">Créer un compte</h1>
					<p className="mt-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Puis douze mois de factures, et vous connaîtrez vos trois taux EGalim.
					</p>
				</div>

				<label className="flex flex-col gap-1">
					<SectionTitle>Votre nom</SectionTitle>
					<Input value={nom} onChange={setNom} name="name" required />
				</label>

				<label className="flex flex-col gap-1">
					<SectionTitle>Adresse e-mail</SectionTitle>
					<Input type="email" value={email} onChange={setEmail} name="email" required />
				</label>

				<label className="flex flex-col gap-1">
					<SectionTitle>Mot de passe</SectionTitle>
					<Input
						type="password"
						value={motDePasse}
						onChange={setMotDePasse}
						name="new-password"
						required
					/>
					{/*
					  Une longueur, pas un jeu de caractères imposé. Exiger une
					  majuscule et un chiffre produit « Cantine2024! » chez tout le
					  monde ; exiger douze caractères produit une vraie phrase.
					*/}
					<span
						className={tropCourt ? 'text-cladd-3xs text-seuil-manque' : 'text-cladd-3xs text-cladd-fg-softer'}
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
					Créer mon compte
				</Button>

				<p className="text-cladd-2xs text-cladd-fg-softer">
					Vous avez déjà un compte ?{' '}
					<Link to="/connexion" className="font-medium underline underline-offset-2">
						Se connecter
					</Link>
				</p>
			</form>
		</div>
	);
}
