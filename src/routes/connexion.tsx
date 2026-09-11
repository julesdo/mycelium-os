import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Input } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';
import { BoutonPrincipal, CadreAuth, Champ, MessageErreur } from '../ui';

/**
 * `invitation` porte le jeton d'une invitation en cours.
 *
 * SANS LUI, UNE INVITATION SE PERD À LA CONNEXION. L'invité clique le lien reçu
 * par courriel, découvre qu'il a déjà un compte, se connecte — et atterrit sur
 * son espace habituel, l'invitation oubliée, sans aucun moyen de la retrouver
 * puisque le jeton n'était que dans l'URL précédente. On le transporte donc, et
 * on revient sur l'écran d'acceptation une fois la session ouverte.
 */
export const Route = createFileRoute('/connexion')({
	validateSearch: (search: Record<string, unknown>): { invitation?: string } => ({
		invitation: typeof search.invitation === 'string' ? search.invitation : undefined
	}),
	component: Connexion
});

function Connexion() {
	const navigate = useNavigate();
	const { invitation } = Route.useSearch();
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
		if (invitation) {
			await navigate({ to: '/rejoindre/$token', params: { token: invitation } });
			return;
		}
		await navigate({ to: '/app' });
	}

	return (
		<CadreAuth
			titre="Connexion"
			explication="Retrouvez vos créances, vos décomptes et vos échéances."
			pied={
				<>
					{/* Des liens d'ACCENT, plus des soulignés. Sur fond sombre, un texte
					    souligné gris lit « note de bas de page » ; c'est le bleu de
					    marque qui dit « ceci est cliquable », comme dans la référence. */}
					<Link to="/mot-de-passe-oublie" className="font-medium text-cladd-primary">
						Mot de passe oublié ?
					</Link>
					<span>
						Pas encore de compte ?{' '}
						<Link to="/inscription" className="font-medium text-cladd-primary">
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

				{/*
				  LA PILULE BLANCHE, pleine largeur. Elle remplace l'aplat d'accent :
				  sur le fond sombre traversé par le shader, un bouton bleu se fond
				  dans son propre décor et l'action principale devient la moins
				  visible de l'écran. Voir `ui/bouton.tsx`.

				  `readOnly` plutôt que `disabled` pendant l'envoi : le bouton garde
				  son apparence active — il n'y a rien d'invalide à signaler — mais
				  cesse de répondre, ce qui empêche la double soumission.
				*/}
				<BoutonPrincipal type="submit" pleineLargeur loading={enCours} readOnly={enCours}>
					Se connecter
				</BoutonPrincipal>
			</form>
		</CadreAuth>
	);
}
