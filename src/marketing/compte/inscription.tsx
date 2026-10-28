import { Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { suivre } from '../../app/analytique';
import { authClient } from '../../lib/client/auth';
import { DUREE_ESSAI_JOURS } from '../../lib/config/tarifs';
import { suggestionDAdresse } from '../../ui/site/champ-email';
import { CadreDuCompte } from './cadre';
import {
	BoutonDuCompte,
	ChampDuCompte,
	ErreurDuCompte,
	JaugeDuMotDePasse,
	OeilDuMotDePasse,
	useMotDePasse
} from './champ';
import {
	FORME_D_ADRESSE,
	LONGUEUR_MINIMALE_DU_MOT_DE_PASSE as LONGUEUR_MINIMALE
} from '../../lib/compte/regles';

/**
 * L'INSCRIPTION, EN DEUX TEMPS (13/10/2026), dans la DA du site (28/10/2026).
 *
 * Une question par écran, comme Revolut Business, Monzo et Claude : l'adresse, puis le mot de
 * passe. Le clavier reste ouvert, le bouton reste sous le pouce. Ce qui aide :
 * - l'adresse tapée sur le site ouvre directement au mot de passe (l'état de l'historique,
 *   jamais l'URL) ;
 * - une faute de domaine courante se corrige d'un toucher ;
 * - au mot de passe, l'adresse reste visible en pastille, et « Modifier » y ramène ;
 * - la longueur se lit au fil de la frappe, en douze traits : on sait où l'on en est avant
 *   d'appuyer. Une longueur, pas un jeu de caractères : exiger une majuscule et un chiffre
 *   produit « Cantine2024! » chez tout le monde, exiger douze caractères produit une phrase.
 *
 * À droite, ce qui vient, en trois étapes.
 */
export function PageInscription({
	invitation,
	pour,
	offre,
	adresseDuSite
}: {
	invitation: string | undefined;
	pour: 'diagnostic' | undefined;
	/** Le mois offert par un client qui recommande, s'il y en a un. */
	offre: { readonly offertPar: string; readonly detail: string } | null;
	/** L'adresse tapée sur le site, quand on en vient. */
	adresseDuSite: string | undefined;
}) {
	const navigate = useNavigate();
	const venuDuSite =
		!invitation && adresseDuSite !== undefined && FORME_D_ADRESSE.test(adresseDuSite);
	const [etape, setEtape] = useState<'adresse' | 'acces'>(venuDuSite ? 'acces' : 'adresse');
	const [nom, setNom] = useState('');
	const [email, setEmail] = useState(venuDuSite ? (adresseDuSite ?? '') : '');
	const [motDePasse, setMotDePasse] = useState('');
	const [erreur, setErreur] = useState<string | null>(null);
	const [secoue, setSecoue] = useState(0);
	const [enCours, setEnCours] = useState(false);
	const mdp = useMotDePasse();
	const adresse = email.trim();
	const adresseValide = FORME_D_ADRESSE.test(adresse);
	const suggestion = suggestionDAdresse(adresse);
	const assezLong = motDePasse.length >= LONGUEUR_MINIMALE;
	const nomManquant = invitation !== undefined && nom.trim() === '';

	function continuer(e: FormEvent) {
		e.preventDefault();
		if (!adresseValide) {
			setErreur('Cette adresse ne semble pas complète : il manque l’arobase ou le domaine.');
			setSecoue((n) => n + 1);
			return;
		}
		setErreur(null);
		setEtape('acces');
	}

	async function creer(e: FormEvent) {
		e.preventDefault();
		if (enCours) return;
		if (!assezLong || nomManquant) {
			setErreur(
				nomManquant
					? 'Il manque votre nom : votre équipe le verra.'
					: `Encore ${LONGUEUR_MINIMALE - motDePasse.length} caractères : une phrase dont vous vous souvenez fera l’affaire.`
			);
			setSecoue((n) => n + 1);
			return;
		}
		setErreur(null);
		setEnCours(true);
		const { error } = await authClient.signUp.email({
			email: adresse,
			password: motDePasse,
			// Sans invitation, Plume demande le nom à l'écran suivant ; l'adresse le tient en attendant.
			name: nom.trim() || adresse
		});
		if (error) {
			setEnCours(false);
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

	const scene = {
		paysage: 'lever',
		ciel: 'sombre' as const,
		humeur: etape === 'adresse' ? ('salue' as const) : ('ecoute' as const),
		carte: (
			<>
				<h2>Ce qui vient.</h2>
				<ol>
					<li>
						<span>1</span>
						<span>
							<b>Déposez vos factures.</b>
							Un export de votre logiciel, un fichier, ou une photo.
						</span>
					</li>
					<li>
						<span>2</span>
						<span>
							<b>Voyez ce qu’on vous doit.</b>
							Facture par facture, pénalités et frais de recouvrement compris.
						</span>
					</li>
					<li>
						<span>3</span>
						<span>
							<b>Plume relance à votre nom.</b>
							Quand vous l’avez décidé, et chaque relance se retient.
						</span>
					</li>
				</ol>
			</>
		)
	};
	const mention = (
		<>
			{'En créant votre compte, vous acceptez les '}
			<Link to="/conditions-generales">conditions générales</Link>
			{' et la '}
			<Link to="/politique-de-confidentialite">politique de confidentialité</Link>.
		</>
	);
	const autre = {
		question: 'Déjà un compte ?',
		lien: 'Se connecter',
		vers: '/connexion',
		invitation
	} as const;

	if (etape === 'adresse') {
		return (
			<CadreDuCompte
				titre="Ouvrez votre compte."
				ton={`${DUREE_ESSAI_JOURS} jours pour voir ce qu’on vous doit.`}
				chapeau="Votre adresse professionnelle, puis un mot de passe : c’est tout. Aucune carte aujourd’hui."
				etape={{ rang: 1, sur: 2 }}
				autre={autre}
				scene={scene}
				mention={mention}
			>
				<form className="compte-form" onSubmit={continuer} noValidate>
					{offre ? (
						<p className="compte-note">
							<Cadeau />
							<span>
								<b>{`Un mois offert par ${offre.offertPar}.`}</b> {offre.detail}
							</span>
						</p>
					) : null}
					<ChampDuCompte
						key={secoue}
						id="inscription-email"
						libelle="E-mail professionnel"
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
						erreur={erreur !== null}
						secoue={secoue > 0}
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
					{erreur ? <ErreurDuCompte>{erreur}</ErreurDuCompte> : null}
					<BoutonDuCompte>Continuer</BoutonDuCompte>
				</form>
			</CadreDuCompte>
		);
	}

	return (
		<CadreDuCompte
			titre={invitation ? 'Votre nom, et un mot de passe.' : 'Un mot de passe.'}
			ton="Une phrase, plutôt qu’un mot."
			etape={{ rang: 2, sur: 2 }}
			autre={autre}
			scene={scene}
			mention={mention}
		>
			<form className="compte-form" onSubmit={creer} noValidate>
				<p className="compte-pastille">
					<span>{adresse}</span>
					<button
						type="button"
						onClick={() => {
							setErreur(null);
							setEtape('adresse');
						}}
					>
						Modifier
					</button>
				</p>
				{invitation ? (
					<ChampDuCompte
						id="inscription-nom"
						libelle="Votre nom"
						icone="personne"
						name="name"
						autoComplete="name"
						enterKeyHint="next"
						autoFocus
						valeur={nom}
						surChangement={setNom}
						valide={nom.trim() !== ''}
					/>
				) : null}
				<ChampDuCompte
					key={secoue}
					id="inscription-mot-de-passe"
					libelle="Mot de passe"
					icone="cadenas"
					type={mdp.visible ? 'text' : 'password'}
					name="new-password"
					autoComplete="new-password"
					enterKeyHint="go"
					autoFocus={!invitation}
					valeur={motDePasse}
					surChangement={(v) => {
						setMotDePasse(v);
						setErreur(null);
					}}
					valide={assezLong}
					erreur={erreur !== null}
					secoue={secoue > 0}
					onKeyUp={mdp.lireLaTouche}
					aria-describedby="inscription-longueur"
					bout={<OeilDuMotDePasse visible={mdp.visible} basculer={mdp.basculer} />}
				/>
				<p
					id="inscription-longueur"
					className={mdp.majuscules ? 'compte-ligne alerte' : 'compte-ligne'}
					aria-live="polite"
				>
					<span>
						{mdp.majuscules
							? 'La touche des majuscules est bloquée.'
							: assezLong
								? 'Assez long.'
								: `${motDePasse.length} sur ${LONGUEUR_MINIMALE} caractères au minimum`}
					</span>
					<JaugeDuMotDePasse longueur={motDePasse.length} />
				</p>
				{erreur ? <ErreurDuCompte>{erreur}</ErreurDuCompte> : null}
				<BoutonDuCompte enCours={enCours}>
					{enCours ? 'Création du compte…' : 'Créer mon compte'}
				</BoutonDuCompte>
			</form>
		</CadreDuCompte>
	);
}

function Cadeau() {
	return (
		<svg
			viewBox="0 0 24 24"
			width="22"
			height="22"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			aria-hidden="true"
		>
			<rect x="3.5" y="9" width="17" height="11" rx="2" />
			<path d="M3.5 13h17M12 9v11M12 9c-2.2 0-4.4-1-4.4-3a2 2 0 0 1 4.4 0M12 9c2.2 0 4.4-1 4.4-3a2 2 0 0 0-4.4 0" />
		</svg>
	);
}
