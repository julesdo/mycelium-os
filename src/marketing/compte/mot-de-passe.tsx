import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { authClient } from '../../lib/client/auth';
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
	LONGUEUR_MINIMALE_DU_MOT_DE_PASSE as LONGUEUR_MINIMALE,
	messagerieDe
} from '../../lib/compte/regles';

/**
 * LE MOT DE PASSE OUBLIÉ, PUIS LE NOUVEAU (28/10/2026), dans la DA du site.
 *
 * L'oubli : l'adresse (reprise de la connexion si on l'y avait tapée), puis un écran qui dit où
 * regarder. La réponse reste la même que le compte existe ou non : la dire autrement apprendrait à
 * un inconnu qu'une adresse est cliente. Un bouton ouvre la messagerie de l'adresse quand on la
 * connaît (Gmail, Outlook, Yahoo, iCloud, Orange, Free, SFR, La Poste), et « Renvoyer » attend
 * trente secondes : un second lien part aussi vite que le premier arrive.
 *
 * Le nouveau : le mot de passe, sa jauge, puis la connexion.
 */
const ATTENTE_AVANT_RENVOI_S = 30;

export function PageMotDePasseOublie({ adresseConnue }: { adresseConnue: string | undefined }) {
	const [email, setEmail] = useState(adresseConnue ?? '');
	const [envoye, setEnvoye] = useState(false);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const [secoue, setSecoue] = useState(0);
	const [attente, setAttente] = useState(0);
	const adresse = email.trim();
	const adresseValide = FORME_D_ADRESSE.test(adresse);
	const suggestion = suggestionDAdresse(adresse);

	useEffect(() => {
		if (attente <= 0) return;
		const t = setTimeout(() => setAttente((s) => s - 1), 1000);
		return () => clearTimeout(t);
	}, [attente]);

	async function envoyer() {
		setEnCours(true);
		await authClient.requestPasswordReset({
			email: adresse,
			redirectTo: `${window.location.origin}/nouveau-mot-de-passe`
		});
		setEnCours(false);
		setEnvoye(true);
		setAttente(ATTENTE_AVANT_RENVOI_S);
	}

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		if (enCours) return;
		if (!adresseValide) {
			setErreur('Cette adresse ne semble pas complète : il manque l’arobase ou le domaine.');
			setSecoue((n) => n + 1);
			return;
		}
		setErreur(null);
		await envoyer();
	}

	const scene = {
		paysage: 'secbleue',
		ciel: 'sombre' as const,
		humeur: envoye ? ('content' as const) : ('reflechit' as const),
		carte: (
			<>
				<h2>Un lien, valable une heure.</h2>
				<ul>
					<li>
						<Enveloppe />
						<span>
							<b>Il part à votre adresse.</b>
							Seulement si un compte y est ouvert : personne d’autre ne le reçoit.
						</span>
					</li>
					<li>
						<Enveloppe />
						<span>
							<b>Vos documents restent scellés.</b>
							Changer de mot de passe ne touche ni à vos dossiers, ni au coffre.
						</span>
					</li>
				</ul>
			</>
		)
	};

	if (envoye) {
		const messagerie = messagerieDe(adresse);
		return (
			<CadreDuCompte
				titre="Regardez vos e-mails."
				ton="Le lien est parti."
				chapeau={
					<>
						{'Si un compte est ouvert pour '}
						<b>{adresse}</b>
						{
							', un lien pour choisir un nouveau mot de passe vient d’y arriver. Il est valable une heure.'
						}
					</>
				}
				autre={{ question: 'Vous l’avez retrouvé ?', lien: 'Se connecter', vers: '/connexion' }}
				scene={scene}
			>
				<div className="compte-form">
					{messagerie ? (
						<a
							className="bouton bouton-encre cta"
							href={messagerie.adresse}
							target="_blank"
							rel="noreferrer"
						>
							<span className="cta-fond" aria-hidden="true" />
							<span className="cta-txt">{`Ouvrir ${messagerie.nom}`}</span>
							<svg className="cta-fleche" viewBox="0 0 10 10" aria-hidden="true">
								<path className="ligne" d="M0 5h7" />
								<path className="pointe" d="M1 1l4 4-4 4" />
							</svg>
						</a>
					) : null}
					<p className="compte-ligne">
						<span>Rien au bout de quelques minutes ? Regardez dans les indésirables.</span>
					</p>
					<button
						type="button"
						className="compte-secondaire"
						disabled={attente > 0 || enCours}
						onClick={() => void envoyer()}
					>
						{attente > 0
							? `Renvoyer le lien dans ${attente} s`
							: enCours
								? 'Envoi…'
								: 'Renvoyer le lien'}
					</button>
				</div>
			</CadreDuCompte>
		);
	}

	return (
		<CadreDuCompte
			titre="Mot de passe oublié."
			ton="On vous envoie un lien."
			chapeau="Indiquez votre adresse : un lien pour en choisir un nouveau y arrive en quelques secondes."
			autre={{ question: 'Il vous revient ?', lien: 'Se connecter', vers: '/connexion' }}
			scene={scene}
		>
			<form className="compte-form" onSubmit={soumettre} noValidate>
				<ChampDuCompte
					key={secoue}
					id="oubli-email"
					libelle="Adresse e-mail"
					icone="email"
					type="email"
					name="email"
					autoComplete="email"
					inputMode="email"
					enterKeyHint="send"
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
				<BoutonDuCompte enCours={enCours}>{enCours ? 'Envoi…' : 'Envoyer le lien'}</BoutonDuCompte>
			</form>
		</CadreDuCompte>
	);
}

export function PageNouveauMotDePasse({ token }: { token: string }) {
	const navigate = useNavigate();
	const [motDePasse, setMotDePasse] = useState('');
	const [erreur, setErreur] = useState<string | null>(null);
	const [secoue, setSecoue] = useState(0);
	const [enCours, setEnCours] = useState(false);
	const mdp = useMotDePasse();
	const assezLong = motDePasse.length >= LONGUEUR_MINIMALE;
	const scene = { paysage: 'secaube', ciel: 'sombre' as const, humeur: 'travaille' as const };

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		if (enCours) return;
		if (!assezLong) {
			setErreur(
				`Encore ${LONGUEUR_MINIMALE - motDePasse.length} caractères : une phrase dont vous vous souvenez fera l’affaire.`
			);
			setSecoue((n) => n + 1);
			return;
		}
		setErreur(null);
		setEnCours(true);
		const { error } = await authClient.resetPassword({ newPassword: motDePasse, token });
		if (error) {
			setEnCours(false);
			setErreur(
				'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau : il arrive en quelques secondes.'
			);
			return;
		}
		await navigate({ to: '/connexion', state: (p) => ({ ...p, motDePasseChange: true }) });
	}

	if (!token) {
		return (
			<CadreDuCompte
				titre="Ce lien est incomplet."
				ton="Votre messagerie l’a peut-être coupé."
				chapeau="Demandez-en un nouveau : il arrive en quelques secondes."
				scene={scene}
			>
				<div className="compte-form">
					<Link className="bouton bouton-encre cta" to="/mot-de-passe-oublie">
						<span className="cta-fond" aria-hidden="true" />
						<span className="cta-txt">Demander un nouveau lien</span>
					</Link>
				</div>
			</CadreDuCompte>
		);
	}

	return (
		<CadreDuCompte
			titre="Un nouveau mot de passe."
			ton="Une phrase, plutôt qu’un mot."
			chapeau="Choisissez-le, et vous retrouverez vos dossiers là où vous les avez laissés."
			scene={scene}
		>
			<form className="compte-form" onSubmit={soumettre} noValidate>
				<ChampDuCompte
					key={secoue}
					id="nouveau-mot-de-passe"
					libelle="Nouveau mot de passe"
					icone="cadenas"
					type={mdp.visible ? 'text' : 'password'}
					name="new-password"
					autoComplete="new-password"
					enterKeyHint="go"
					autoFocus
					valeur={motDePasse}
					surChangement={(v) => {
						setMotDePasse(v);
						setErreur(null);
					}}
					valide={assezLong}
					erreur={erreur !== null}
					secoue={secoue > 0}
					onKeyUp={mdp.lireLaTouche}
					aria-describedby="nouveau-longueur"
					bout={<OeilDuMotDePasse visible={mdp.visible} basculer={mdp.basculer} />}
				/>
				<p
					id="nouveau-longueur"
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
					{enCours ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
				</BoutonDuCompte>
			</form>
		</CadreDuCompte>
	);
}

function Enveloppe() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<rect x="4" y="6.5" width="16" height="11" rx="2.2" />
			<path d="M5 8l7 5 7-5" />
		</svg>
	);
}
