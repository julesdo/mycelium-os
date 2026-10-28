import { Link, useNavigate } from '@tanstack/react-router';
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from 'convex/react';
import { useState } from 'react';
import { api } from '../../lib/convex/_generated/api';
import { CadreDuCompte, type SceneDuCompte } from './cadre';
import { BoutonDuCompte, ErreurDuCompte } from './champ';

/**
 * REJOINDRE UNE ÉQUIPE (28/10/2026), dans la DA du site.
 *
 * L'INVITATION SE LIT AVANT DE SE CONNECTER. On montre à un visiteur anonyme le nom de
 * l'établissement et le rôle proposé, parce qu'un lien reçu par e-mail qui exige d'abord un mot
 * de passe, sans dire de quoi il s'agit, ressemble exactement à un hameçonnage. Le jeton ne révèle
 * rien d'autre : ni les factures, ni les membres, ni les taux.
 *
 * LE JETON SURVIT À L'INSCRIPTION : il voyage en paramètre `invitation` vers la connexion et
 * l'inscription, qui reviennent ici ensuite.
 */
export interface InvitationDEquipe {
	readonly orgName: string;
	readonly email: string;
	readonly role: string;
	readonly isAccepted: boolean;
	readonly isExpired: boolean;
}

const SCENE: SceneDuCompte = {
	paysage: 'lever',
	ciel: 'sombre',
	humeur: 'salue',
	carte: (
		<>
			<h2>Une invitation, rien d’autre.</h2>
			<ul>
				<li>
					<Cle />
					<span>
						<b>Le lien ne montre que l’essentiel.</b>
						Le nom de l’établissement et votre rôle. Les dossiers s’ouvrent une fois connecté.
					</span>
				</li>
				<li>
					<Cle />
					<span>
						<b>Il est valable sept jours.</b>
						Passé ce délai, un administrateur de l’équipe vous en envoie un autre.
					</span>
				</li>
			</ul>
		</>
	)
};

function Accueil() {
	return (
		<div className="compte-form">
			<Link className="bouton bouton-encre cta" to="/">
				<span className="cta-fond" aria-hidden="true" />
				<span className="cta-txt">Revenir à l’accueil</span>
			</Link>
		</div>
	);
}

export function PageRejoindre({
	token,
	invitation
}: {
	token: string;
	/** `undefined` pendant la lecture, `null` pour un lien qui ne vaut rien. */
	invitation: InvitationDEquipe | null | undefined;
}) {
	if (invitation === undefined) {
		return (
			<CadreDuCompte titre="Une invitation." ton="On vérifie le lien." scene={SCENE}>
				<span />
			</CadreDuCompte>
		);
	}
	if (invitation === null) {
		return (
			<CadreDuCompte
				titre="Ce lien n’est pas valable."
				ton="Il a peut-être été coupé en chemin."
				chapeau="L’invitation a peut-être été annulée, ou votre messagerie a tronqué le lien. Demandez-en un nouveau à la personne qui vous l’a envoyé."
				scene={SCENE}
			>
				<Accueil />
			</CadreDuCompte>
		);
	}
	if (invitation.isAccepted) {
		return (
			<CadreDuCompte
				titre="Cette invitation a déjà servi."
				ton="Vous faites sans doute partie de l’équipe."
				chapeau={`Si vous avez déjà rejoint ${invitation.orgName}, connectez-vous simplement.`}
				scene={SCENE}
			>
				<div className="compte-form">
					<Link className="bouton bouton-encre cta" to="/connexion">
						<span className="cta-fond" aria-hidden="true" />
						<span className="cta-txt">Se connecter</span>
					</Link>
				</div>
			</CadreDuCompte>
		);
	}
	if (invitation.isExpired) {
		return (
			<CadreDuCompte
				titre="Cette invitation a expiré."
				ton="Elle valait sept jours."
				chapeau={`Demandez-en une nouvelle à un administrateur de ${invitation.orgName} : elle arrivera à la même adresse.`}
				scene={SCENE}
			>
				<Accueil />
			</CadreDuCompte>
		);
	}

	const role = invitation.role === 'ORG_ADMIN' ? 'administrateur' : 'membre';
	return (
		<CadreDuCompte
			titre={`Rejoindre ${invitation.orgName}.`}
			ton="Votre équipe vous attend."
			chapeau={
				<>
					{`Vous êtes invité comme ${role}, à l’adresse `}
					<b>{invitation.email}</b>.
				</>
			}
			scene={SCENE}
		>
			<AuthLoading>
				<p className="compte-ligne">
					<span>Vérification de votre session…</span>
				</p>
			</AuthLoading>
			<Unauthenticated>
				<PasEncoreConnecte token={token} />
			</Unauthenticated>
			<Authenticated>
				<Accepter token={token} nomEtablissement={invitation.orgName} />
			</Authenticated>
		</CadreDuCompte>
	);
}

/** Les deux portes, avec le jeton : l'inscription et la connexion reviennent ici ensuite. */
function PasEncoreConnecte({ token }: { token: string }) {
	const navigate = useNavigate();
	return (
		<div className="compte-form">
			<BoutonDuCompte
				surClic={() => void navigate({ to: '/inscription', search: { invitation: token } })}
			>
				Créer mon compte
			</BoutonDuCompte>
			<button
				type="button"
				className="compte-secondaire"
				onClick={() => void navigate({ to: '/connexion', search: { invitation: token } })}
			>
				J’ai déjà un compte
			</button>
		</div>
	);
}

function Accepter({ token, nomEtablissement }: { token: string; nomEtablissement: string }) {
	const navigate = useNavigate();
	const accepter = useMutation(api.organizations.acceptInvitation);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function rejoindre() {
		setEnCours(true);
		setErreur(null);
		try {
			await accepter({ token });
			await navigate({ to: '/app' });
		} catch (e) {
			setErreur(
				typeof e === 'object' && e !== null && 'data' in e && typeof e.data === 'string'
					? e.data
					: 'L’invitation n’a pas pu être acceptée. Réessayez dans un instant.'
			);
			setEnCours(false);
		}
	}

	return (
		<div className="compte-form">
			{erreur ? <ErreurDuCompte>{erreur}</ErreurDuCompte> : null}
			<BoutonDuCompte enCours={enCours} surClic={() => void rejoindre()}>
				{enCours ? 'Un instant…' : `Rejoindre ${nomEtablissement}`}
			</BoutonDuCompte>
		</div>
	);
}

function Cle() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="8.5" cy="12" r="3.5" />
			<path d="M12 12h8M17 12v3M20 12v2" />
		</svg>
	);
}
