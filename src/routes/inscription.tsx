import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Button, Input } from '@cladd-ui/react';
import { CheckIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { authClient } from '../lib/client/auth';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';
import { BoutonPrincipal, CadreAuth, Champ, MessageErreur } from '../ui';
import { suivre } from '../app/analytique';

/**
 * `invitation` porte le jeton d'une invitation en cours.
 *
 * SANS LUI, UN INVITÉ PERD SON INVITATION EN CRÉANT SON COMPTE, et le pire suit :
 * l'écran suivant lui demande de créer un établissement, alors qu'il vient
 * précisément d'être invité dans celui de quelqu'un d'autre. On repasse donc par
 * l'écran d'acceptation, et jamais par `/bienvenue`.
 */
export const Route = createFileRoute('/inscription')({
	/**
	 * `pour` (19/10/2026, audit) : « Combien vous doit-on ? » et le calculateur y mènent
	 * avec `pour=diagnostic`. Il ne change rien au parcours ; il se mesure.
	 */
	validateSearch: (
		search: Record<string, unknown>
	): { invitation?: string; pour?: 'diagnostic' } => ({
		invitation: typeof search.invitation === 'string' ? search.invitation : undefined,
		pour: search.pour === 'diagnostic' ? 'diagnostic' : undefined
	}),
	component: Inscription
});

const LONGUEUR_MINIMALE = 12;

/** Une adresse qui a la forme d'une adresse : le serveur tranche le reste. */
const FORME_D_ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * L'INSCRIPTION, EN DEUX TEMPS (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE QUESTION PAR ÉCRAN, COMME REVOLUT BUSINESS, MONZO ET CLAUDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les trois champs tenaient sur un écran : le nom, l'adresse, le mot de passe.
 * Au téléphone, le clavier en cachait la moitié, et le bouton passait dessous.
 * L'adresse d'abord, puis le mot de passe : le clavier reste ouvert, le bouton
 * reste sous le pouce, et chaque écran ne demande qu'une chose.
 *
 * ⚠️ LE NOM N'EST PLUS ICI : Plume le demande en se présentant, à l'écran
 * suivant (`/bienvenue`), comme Claude le fait (« Nice to meet you, I'm… »).
 * Un invité, lui, ne passe pas par Plume : il le donne ici.
 *
 * ⚠️ LE MOT DE PASSE SE VOIT EN LE TAPANT, à la demande (l'œil), et sa longueur
 * se compte sous lui : douze caractères, la règle que le serveur tient aussi.
 */
function Inscription() {
	const navigate = useNavigate();
	const { invitation, pour } = Route.useSearch();
	const [etape, setEtape] = useState<'adresse' | 'acces'>('adresse');
	const [nom, setNom] = useState('');
	const [email, setEmail] = useState('');
	const [motDePasse, setMotDePasse] = useState('');
	const [visible, setVisible] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	const assezLong = motDePasse.length >= LONGUEUR_MINIMALE;

	function continuer(e: FormEvent) {
		e.preventDefault();
		if (!FORME_D_ADRESSE.test(email.trim())) {
			setErreur('Cette adresse ne semble pas complète : il manque l’arobase ou le domaine.');
			return;
		}
		setErreur(null);
		setEtape('acces');
	}

	async function creer(e: FormEvent) {
		e.preventDefault();
		if (!assezLong) return;
		setErreur(null);
		setEnCours(true);
		const adresse = email.trim();
		const { error } = await authClient.signUp.email({
			email: adresse,
			password: motDePasse,
			// Sans invitation, Plume demande le nom à l'écran suivant ; l'adresse le tient
			// en attendant, comme avant.
			name: nom.trim() || adresse
		});
		setEnCours(false);
		if (error) {
			setErreur(
				'Ce compte n’a pas pu être créé. L’adresse est peut-être déjà utilisée : essayez de vous connecter.'
			);
			return;
		}
		suivre('inscription', { invitation: Boolean(invitation) });
		if (pour === 'diagnostic') suivre('diagnostic-lance');
		if (invitation) {
			await navigate({ to: '/rejoindre/$token', params: { token: invitation } });
			return;
		}
		await navigate({ to: '/bienvenue' });
	}

	const pied = (
		<span>
			Vous avez déjà un compte ?{' '}
			<Link
				to="/connexion"
				search={invitation ? { invitation } : {}}
				className="font-medium text-cladd-primary"
			>
				Se connecter
			</Link>
		</span>
	);

	if (etape === 'adresse') {
		return (
			<CadreAuth
				titre="Créer votre compte"
				explication="Votre adresse e-mail professionnelle : c’est elle qui vous connecte, et là que vous recevez ce qui compte."
				levees={['Votre bilan offert', `${DUREE_ESSAI_JOURS} jours d’essai`, 'Sans engagement']}
				pied={pied}
			>
				<form onSubmit={continuer} className="flex flex-col gap-cladd-2xs" noValidate>
					<Champ etiquette="Adresse e-mail">
						<Input
							type="email"
							value={email}
							onChange={(valeur) => {
								setEmail(valeur);
								setErreur(null);
							}}
							name="email"
							inputMode="email"
							inputComponentProps={{ autoComplete: 'email', autoCapitalize: 'none' }}
							autoFocus
							required
						/>
					</Champ>

					{erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

					<BoutonPrincipal type="submit" pleineLargeur disabled={email.trim() === ''}>
						Continuer
					</BoutonPrincipal>
				</form>
			</CadreAuth>
		);
	}

	return (
		<CadreAuth
			titre={invitation ? 'Votre nom et votre mot de passe' : 'Choisissez un mot de passe'}
			explication={`Pour ${email.trim()}. Une phrase dont vous vous souvenez vaut mieux qu’un mot compliqué.`}
			onRetour={() => {
				setErreur(null);
				setEtape('adresse');
			}}
			pied={pied}
		>
			<form onSubmit={creer} className="flex flex-col gap-cladd-2xs">
				{invitation ? (
					<Champ etiquette="Votre nom">
						<Input
							value={nom}
							onChange={setNom}
							name="name"
							inputComponentProps={{ autoComplete: 'name' }}
							required
						/>
					</Champ>
				) : null}

				{/*
				  Une longueur, pas un jeu de caractères imposé. Exiger une majuscule
				  et un chiffre produit « Cantine2024! » chez tout le monde ; exiger
				  douze caractères produit une vraie phrase.
				*/}
				<div className="flex flex-col gap-1.5">
					<Champ etiquette="Mot de passe">
						<Input
							type={visible ? 'text' : 'password'}
							value={motDePasse}
							onChange={setMotDePasse}
							name="new-password"
							inputComponentProps={{ autoComplete: 'new-password' }}
							autoFocus={!invitation}
							inputClassName="pr-1"
							suffix={
								<Button
									// Sans `type`, un bouton posé dans un formulaire l'ENVOIE : l'œil créait le compte.
									type="button"
									size="sm"
									variant="transparent"
									outline={false}
									rounded
									square
									className="mr-1 shrink-0"
									aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
									aria-pressed={visible}
									onClick={() => setVisible((v) => !v)}
								>
									{visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
								</Button>
							}
							required
						/>
					</Champ>
					{/* Le compte se lit au fil de la frappe : on sait où l'on en est avant d'appuyer. */}
					<p
						className="flex items-center gap-1 text-cladd-3xs text-cladd-fg-softer"
						aria-live="polite"
					>
						{assezLong ? (
							<>
								<CheckIcon size={14} strokeWidth={2.5} aria-hidden className="text-cladd-fg-soft" />
								<span className="text-cladd-fg-soft">Assez long</span>
							</>
						) : (
							`${motDePasse.length} sur ${LONGUEUR_MINIMALE} caractères au minimum`
						)}
					</p>
				</div>

				{erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

				<BoutonPrincipal
					type="submit"
					pleineLargeur
					loading={enCours}
					readOnly={enCours}
					disabled={!assezLong || (invitation !== undefined && nom.trim() === '')}
				>
					Créer mon compte
				</BoutonPrincipal>

				<p className="text-cladd-3xs leading-relaxed text-cladd-fg-softer">
					En créant votre compte, vous acceptez les{' '}
					<Link to="/conditions-generales" className="underline underline-offset-2">
						conditions générales
					</Link>{' '}
					et la{' '}
					<Link to="/politique-de-confidentialite" className="underline underline-offset-2">
						politique de confidentialité
					</Link>
					.
				</p>
			</form>
		</CadreAuth>
	);
}
