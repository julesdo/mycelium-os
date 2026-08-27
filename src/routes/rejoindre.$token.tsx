import { useState } from 'react';
import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router';
import { Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation } from 'convex/react';
import { Button, Chip } from '@cladd-ui/react';
import { ArrowRightIcon } from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import { CadreAuth, MessageErreur } from '../ui';

export const Route = createFileRoute('/rejoindre/$token')({ component: Rejoindre });

/**
 * L'acceptation d'une invitation.
 *
 * CETTE ROUTE MANQUAIT, ET C'ÉTAIT UN LIEN MORT DANS UN E-MAIL. Les invitations
 * partaient depuis des mois vers `/join/<jeton>` — une adresse qui n'a jamais
 * existé dans ce projet. Chaque personne invitée tombait donc sur une page
 * introuvable, et la seule façon de rejoindre un établissement était d'être
 * ajouté à la main. Le lien pointe désormais ici.
 *
 * L'INVITATION SE LIT AVANT DE SE CONNECTER. On affiche le nom de
 * l'établissement et le rôle proposé à un visiteur anonyme, parce qu'un lien
 * reçu par courriel qui exige d'abord un mot de passe, sans dire de quoi il
 * s'agit, ressemble exactement à un hameçonnage. Le jeton ne révèle rien
 * d'autre : ni les factures, ni les membres, ni les taux.
 *
 * LE JETON SURVIT À L'INSCRIPTION. On le passe en paramètre `invitation` aux
 * écrans de connexion et de création de compte, qui reviennent ici ensuite. Sans
 * ça, un invité sans compte perd son invitation en allant en créer un — et il
 * n'a aucun moyen de la retrouver.
 */
function Rejoindre() {
	const { token } = useParams({ from: '/rejoindre/$token' });
	const invitation = useQuery(api.organizations.getInvitationByToken, { token });

	if (invitation === undefined) {
		return (
			<CadreAuth titre="Invitation" explication="Vérification du lien…">
				<span />
			</CadreAuth>
		);
	}

	if (invitation === null) {
		return (
			<CadreAuth
				titre="Ce lien n’est pas valable."
				explication="L’invitation a peut-être été annulée, ou le lien a été tronqué en chemin par une messagerie."
			>
				<Button as={Link} to="/" className="w-full">
					Revenir à l’accueil
				</Button>
			</CadreAuth>
		);
	}

	if (invitation.isAccepted) {
		return (
			<CadreAuth
				titre="Cette invitation a déjà été utilisée."
				explication={`Si vous faites déjà partie de ${invitation.orgName}, connectez-vous simplement.`}
			>
				<Button as={Link} to="/connexion" color="brand" variant="solid-fill" className="w-full">
					Se connecter
				</Button>
			</CadreAuth>
		);
	}

	if (invitation.isExpired) {
		return (
			<CadreAuth
				titre="Cette invitation a expiré."
				explication={`Les invitations sont valables sept jours. Demandez-en une nouvelle à un administrateur de ${invitation.orgName}.`}
			>
				<Button as={Link} to="/" className="w-full">
					Revenir à l’accueil
				</Button>
			</CadreAuth>
		);
	}

	const role = invitation.role === 'ORG_ADMIN' ? 'Administrateur' : 'Membre';

	return (
		<CadreAuth
			titre={`Rejoindre ${invitation.orgName}`}
			explication={`Vous êtes invité en tant que ${role.toLowerCase()}, à l’adresse ${invitation.email}.`}
		>
			<AuthLoading>
				<p className="text-cladd-xs text-cladd-fg-soft">Vérification de votre session…</p>
			</AuthLoading>

			<Unauthenticated>
				<PasEncoreDeCompte token={token} />
			</Unauthenticated>

			<Authenticated>
				<Accepter token={token} nomEtablissement={invitation.orgName} role={role} />
			</Authenticated>
		</CadreAuth>
	);
}

/**
 * Les deux portes d'entrée, et pourquoi ce sont des boutons plutôt que des liens.
 *
 * Le jeton doit voyager en paramètre de recherche, et `Button as={Link}` perd le
 * typage du routeur en route : la contrainte du paramètre se résout sur
 * `AnyRouter`, donc `invitation` devient une propriété inconnue. Naviguer
 * explicitement garde le contrôle de types là où il sert, c'est-à-dire à
 * garantir que la destination déclare bien ce paramètre.
 */
function PasEncoreDeCompte({ token }: { token: string }) {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-cladd-3xs">
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Créez votre mot de passe pour accéder à l’espace. Si vous avez déjà un compte Letikette,
				connectez-vous : l’invitation vous attendra.
			</p>
			<Button
				color="brand"
				variant="solid-fill"
				className="w-full"
				onClick={() => void navigate({ to: '/inscription', search: { invitation: token } })}
			>
				Créer mon compte
				<ArrowRightIcon />
			</Button>
			<Button
				className="w-full"
				onClick={() => void navigate({ to: '/connexion', search: { invitation: token } })}
			>
				J’ai déjà un compte
			</Button>
		</div>
	);
}

function Accepter({
	token,
	nomEtablissement,
	role
}: {
	token: string;
	nomEtablissement: string;
	role: string;
}) {
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
		<div className="flex flex-col gap-cladd-3xs">
			<Chip color="brand" size="md" className="self-start">
				{role}
			</Chip>
			{erreur ? <MessageErreur>{erreur}</MessageErreur> : null}
			<Button
				color="brand"
				variant="solid-fill"
				className="w-full"
				loading={enCours}
				readOnly={enCours}
				onClick={() => void rejoindre()}
			>
				Rejoindre {nomEtablissement}
			</Button>
		</div>
	);
}
