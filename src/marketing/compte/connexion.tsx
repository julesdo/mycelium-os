import { Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { authClient } from '../../lib/client/auth';
import { delaiPourRetenir } from '../../lib/config/produit';
import { suggestionDAdresse } from '../../ui/site/champ-email';
import { CadreDuCompte } from './cadre';
import {
	BoutonDuCompte,
	ChampDuCompte,
	ErreurDuCompte,
	OeilDuMotDePasse,
	useMotDePasse
} from './champ';
import { FORME_D_ADRESSE } from '../../lib/compte/regles';

/**
 * LA CONNEXION (28/10/2026), dans la DA du site.
 *
 * Deux champs et un bouton. Ce qui aide sans rien demander :
 * - l'adresse tapée avec une faute courante (« gmial.com ») propose sa correction d'un toucher ;
 * - la touche des majuscules bloquée se dit sous le mot de passe, avant l'erreur ;
 * - « Mot de passe oublié ? » emporte l'adresse déjà tapée ;
 * - l'erreur reste neutre : dire « compte inconnu » apprendrait à un inconnu qu'une adresse
 *   est cliente.
 *
 * À droite, ce que Plume promet, lu sur les constantes qui le tiennent.
 */
export function PageConnexion({
	invitation,
	suite,
	motDePasseChange = false
}: {
	invitation: string | undefined;
	suite: string | undefined;
	/** On revient d'un nouveau mot de passe : la page le dit en tête. */
	motDePasseChange?: boolean;
}) {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [motDePasse, setMotDePasse] = useState('');
	const [erreur, setErreur] = useState<string | null>(null);
	const [secoue, setSecoue] = useState(0);
	const [enCours, setEnCours] = useState(false);
	const mdp = useMotDePasse();
	const suggestion = suggestionDAdresse(email.trim());
	const adresseValide = FORME_D_ADRESSE.test(email.trim());

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		if (enCours) return;
		if (!adresseValide || motDePasse === '') {
			setErreur(
				adresseValide
					? 'Il manque votre mot de passe.'
					: 'Cette adresse ne semble pas complète : il manque l’arobase ou le domaine.'
			);
			setSecoue((n) => n + 1);
			return;
		}
		setErreur(null);
		setEnCours(true);
		const { data, error } = await authClient.signIn.email({
			email: email.trim(),
			password: motDePasse
		});
		if (error) {
			setEnCours(false);
			setErreur('L’adresse ou le mot de passe ne correspond pas.');
			setSecoue((n) => n + 1);
			return;
		}
		// La double authentification active : le code d'abord, la suite ensuite.
		if (data !== null && 'twoFactorRedirect' in data && data.twoFactorRedirect === true) {
			await navigate({ to: '/connexion/verification', search: { invitation, suite } });
			return;
		}
		if (invitation) {
			await navigate({ to: '/rejoindre/$token', params: { token: invitation } });
			return;
		}
		await navigate({ to: suite ?? '/app' });
	}

	return (
		<CadreDuCompte
			titre="Bon retour."
			ton="Vos dossiers vous attendent."
			chapeau="Connectez-vous pour retrouver ce qu’on vous doit, et ce que Plume a fait depuis votre passage."
			autre={{ question: 'Pas encore de compte ?', lien: 'Créer un compte', vers: '/inscription' }}
			scene={{
				paysage: 'matin',
				ciel: 'clair',
				humeur: 'salue',
				carte: (
					<>
						<h2>Ce que Plume vous promet.</h2>
						<ul>
							<li>
								<Coche />
								<span>
									<b>Rien ne part sans vous.</b>
									Les relances partent à votre nom, une fois que vous les avez activées.
								</span>
							</li>
							<li>
								<Coche />
								<span>
									<b>Chaque relance se retient.</b>
									{`Elle s’affiche pendant ${delaiPourRetenir()} qui précède son départ.`}
								</span>
							</li>
							<li>
								<Coche />
								<span>
									<b>Votre argent arrive chez vous.</b>
									Vos clients paient sur votre compte, jamais sur le nôtre.
								</span>
							</li>
						</ul>
					</>
				)
			}}
		>
			<form className="compte-form" onSubmit={soumettre} noValidate>
				{motDePasseChange ? (
					<p className="compte-note" role="status">
						<Coche />
						<span>
							<b>Mot de passe enregistré.</b> Connectez-vous avec le nouveau.
						</span>
					</p>
				) : null}
				<ChampDuCompte
					id="connexion-email"
					libelle="Adresse e-mail"
					icone="email"
					type="email"
					name="email"
					autoComplete="email"
					inputMode="email"
					enterKeyHint="next"
					autoFocus
					valeur={email}
					surChangement={(v) => {
						setEmail(v);
						setErreur(null);
					}}
					valide={adresseValide}
				/>
				{suggestion ? (
					<p className="compte-ligne">
						<span>
							{'Vouliez-vous dire '}
							<button
								type="button"
								className="compte-suggestion"
								onClick={() => setEmail(suggestion)}
							>
								{suggestion}
							</button>
							{' ?'}
						</span>
					</p>
				) : null}
				<ChampDuCompte
					key={secoue}
					id="connexion-mot-de-passe"
					libelle="Mot de passe"
					icone="cadenas"
					type={mdp.visible ? 'text' : 'password'}
					name="password"
					autoComplete="current-password"
					enterKeyHint="go"
					valeur={motDePasse}
					surChangement={(v) => {
						setMotDePasse(v);
						setErreur(null);
					}}
					erreur={erreur !== null}
					secoue={secoue > 0}
					onKeyUp={mdp.lireLaTouche}
					bout={<OeilDuMotDePasse visible={mdp.visible} basculer={mdp.basculer} />}
				/>
				<p className={mdp.majuscules ? 'compte-ligne alerte' : 'compte-ligne'} aria-live="polite">
					<span>{mdp.majuscules ? 'La touche des majuscules est bloquée.' : ''}</span>
					<Link
						className="compte-lien"
						to="/mot-de-passe-oublie"
						state={(p) => ({ ...p, adresseDInscription: email.trim() || undefined })}
					>
						Mot de passe oublié ?
					</Link>
				</p>
				{erreur ? <ErreurDuCompte>{erreur}</ErreurDuCompte> : null}
				<BoutonDuCompte enCours={enCours}>{enCours ? 'Connexion…' : 'Se connecter'}</BoutonDuCompte>
			</form>
		</CadreDuCompte>
	);
}

function Coche() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M6.5 12.4l3.6 3.6 7.4-8" />
		</svg>
	);
}
