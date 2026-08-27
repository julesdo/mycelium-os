import { useState } from 'react';
import {
	Button,
	Chip,
	Input,
	List,
	ListItem,
	ListSeparator,
	Popover,
	PopoverClose,
	PopoverRoot,
	PopoverTrigger,
	ListButton,
	Segmented,
	SegmentedButton,
	Surface
} from '@cladd-ui/react';
import {
	CheckIcon,
	CopyIcon,
	EllipsisIcon,
	MailCheckIcon,
	ShieldIcon,
	UserMinusIcon,
	UserPlusIcon
} from 'lucide-react';
import { SectionEcran, pluriel } from '../../ui';

/**
 * L'écran d'équipe, sans backend.
 *
 * ONZE FONCTIONS EXISTAIENT, ZÉRO ÉCRAN LES APPELAIT. Inviter, accepter,
 * annuler, changer un rôle, retirer quelqu'un : tout était écrit côté serveur
 * depuis des mois, et la seule façon d'ajouter un collègue était d'écrire une
 * mutation à la main dans un tableau de bord. Une cantine, c'est un chef gérant
 * qui dépose et un directeur qui signe — à une seule place, le produit ne sert
 * qu'à moitié.
 *
 * TOUT EST ICI EN PROPS ET EN RAPPELS, comme les cartes d'offre. C'est ce qui
 * permet de le REGARDER dans la salle d'exposition aux quatre largeurs sans
 * ouvrir de session, donc sans saisir de mot de passe.
 *
 * LE LIEN D'INVITATION EST AFFICHÉ, PAS SEULEMENT ENVOYÉ. Un e-mail
 * d'invitation tombe régulièrement dans les indésirables d'une messagerie
 * d'établissement, et le gérant n'a alors aucun recours. Le lien copiable se
 * transmet par n'importe quel canal ; sans lui, une invitation perdue est une
 * invitation morte, puisqu'on ne peut pas la renvoyer avant son expiration.
 */

export type RoleEquipe = 'ORG_ADMIN' | 'ORG_MEMBER';

export type MembreEquipe = {
	id: string;
	nom: string | null;
	email: string | null;
	role: RoleEquipe;
	arriveLe: number;
	adresseVerifiee: boolean;
	estMoi: boolean;
};

export type InvitationEnAttente = {
	id: string;
	email: string;
	role: RoleEquipe;
	lien: string;
	expireLe: number;
};

const LIBELLE_ROLE: Record<RoleEquipe, string> = {
	ORG_ADMIN: 'Administrateur',
	ORG_MEMBER: 'Membre'
};

/**
 * Ce que chaque rôle peut, dit en une ligne et à l'endroit où on choisit.
 *
 * Un sélecteur qui propose « Administrateur » et « Membre » sans dire ce qui les
 * sépare fait choisir au hasard, et on ne s'en aperçoit que le jour où un membre
 * ne trouve pas le bouton d'invitation.
 */
const CE_QUE_FAIT_LE_ROLE: Record<RoleEquipe, string> = {
	ORG_ADMIN:
		'Dépose, confirme, et gère l’établissement : invitations, réglages, abonnement, données.',
	ORG_MEMBER: 'Dépose les factures et confirme les classements. Ne gère pas l’établissement.'
};

function enDate(ms: number): string {
	return new Date(ms).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * Le nom, ou l'adresse à défaut — et jamais les deux quand ils sont identiques.
 *
 * Un compte créé sans nom retombait sur son adresse en titre ET en sous-titre,
 * ce qui donnait la même chaîne deux fois l'une sous l'autre. Ça ne casse rien
 * et ça se lit comme un bogue d'affichage, ce qui suffit à faire douter du reste
 * de l'écran.
 */
function titreDeLigne(m: MembreEquipe): string {
	return m.nom?.trim() || m.email || 'Compte sans nom';
}

function sousTitreDeLigne(m: MembreEquipe): string {
	const arrivee = `arrivé le ${enDate(m.arriveLe)}`;
	const adresse = m.email ?? null;
	if (!adresse || adresse === titreDeLigne(m)) return arrivee;
	return `${adresse} · ${arrivee}`;
}

/** Combien de jours il reste, arrondi vers le haut : « expire dans 1 jour » vaut mieux que « dans 0 ». */
function joursRestants(echeance: number): number {
	return Math.max(0, Math.ceil((echeance - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function Equipe({
	membres,
	invitations,
	estAdmin,
	siegesUtilises,
	siegesAutorises,
	onInviter,
	onChangerRole,
	onRetirer,
	onAnnulerInvitation,
	onVerifierAdresse
}: {
	membres: readonly MembreEquipe[];
	invitations: readonly InvitationEnAttente[];
	estAdmin: boolean;
	siegesUtilises: number;
	siegesAutorises: number;
	onInviter: (email: string, role: RoleEquipe) => Promise<void>;
	onChangerRole: (membreId: string, role: RoleEquipe) => Promise<void>;
	onRetirer: (membreId: string) => Promise<void>;
	onAnnulerInvitation: (invitationId: string) => Promise<void>;
	onVerifierAdresse: (membreId: string) => Promise<void>;
}) {
	const complet = siegesUtilises + invitations.length >= siegesAutorises;

	return (
		<div className="flex max-w-180 flex-col gap-cladd-2xs">
			<SectionEcran
				titre="Les personnes de l’établissement"
				legende={`${siegesUtilises} sur ${siegesAutorises} place${pluriel(siegesAutorises)}`}
			>
				<Surface outline className="rounded-cladd-2xl" contentClassName="p-0">
					<List>
						{membres.map((m, i) => (
							<div key={m.id}>
								{i > 0 ? <ListSeparator /> : null}
								<LigneMembre
									membre={m}
									estAdmin={estAdmin}
									onChangerRole={onChangerRole}
									onRetirer={onRetirer}
									onVerifierAdresse={onVerifierAdresse}
								/>
							</div>
						))}
					</List>
				</Surface>
			</SectionEcran>

			{invitations.length > 0 ? (
				<SectionEcran
					titre="Invitations en attente"
					legende={`${invitations.length} envoyée${pluriel(invitations.length)}, pas encore acceptée${pluriel(invitations.length)}`}
				>
					<Surface outline className="rounded-cladd-2xl" contentClassName="p-0">
						<List>
							{invitations.map((inv, i) => (
								<div key={inv.id}>
									{i > 0 ? <ListSeparator /> : null}
									<LigneInvitation invitation={inv} onAnnuler={onAnnulerInvitation} />
								</div>
							))}
						</List>
					</Surface>
				</SectionEcran>
			) : null}

			{estAdmin ? (
				<FormulaireInvitation onInviter={onInviter} complet={complet} places={siegesAutorises} />
			) : (
				<SectionEcran titre="Inviter un collègue">
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Seul un administrateur de l’établissement peut inviter quelqu’un. Demandez-le à l’une
						des personnes marquées « Administrateur » ci-dessus.
					</p>
				</SectionEcran>
			)}
		</div>
	);
}

function LigneMembre({
	membre,
	estAdmin,
	onChangerRole,
	onRetirer,
	onVerifierAdresse
}: {
	membre: MembreEquipe;
	estAdmin: boolean;
	onChangerRole: (membreId: string, role: RoleEquipe) => Promise<void>;
	onRetirer: (membreId: string) => Promise<void>;
	onVerifierAdresse: (membreId: string) => Promise<void>;
}) {
	// Un administrateur ne se rétrograde ni ne se retire lui-même : le serveur le
	// refuse, et proposer une action qui échoue toujours est pire que ne pas la
	// proposer.
	const actionsPossibles = estAdmin && !membre.estMoi;

	return (
		<ListItem className="flex flex-wrap items-center gap-cladd-3xs">
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-cladd-sm font-semibold text-cladd-fg">
					{titreDeLigne(membre)}
					{membre.estMoi ? <span className="text-cladd-fg-softer"> · vous</span> : null}
				</span>
				<span className="truncate text-cladd-2xs text-cladd-fg-softer">
					{sousTitreDeLigne(membre)}
				</span>
			</span>

			{membre.adresseVerifiee ? null : (
				<Chip color="orange" size="sm">
					Adresse non vérifiée
				</Chip>
			)}
			<Chip color={membre.role === 'ORG_ADMIN' ? 'brand' : 'neutral'} size="sm">
				{LIBELLE_ROLE[membre.role]}
			</Chip>

			{actionsPossibles ? (
				<PopoverRoot>
					<PopoverTrigger>
						<Button variant="transparent" aria-label={`Actions sur ${membre.email ?? membre.id}`}>
							<EllipsisIcon />
						</Button>
					</PopoverTrigger>
					<Popover className="w-72" offset={8}>
						<List>
							{/*
							  DÉBLOQUER UNE ADRESSE COINCÉE. L'e-mail de vérification tombe
							  régulièrement dans les indésirables d'une messagerie
							  d'établissement, et le collègue reste alors marqué « non
							  vérifié » sans aucun recours de son côté. La fonction serveur
							  existait depuis des mois sans qu'aucun écran ne l'appelle.
							*/}
							{membre.adresseVerifiee ? null : (
								<PopoverClose>
									<ListButton
										size="md"
										icon={<MailCheckIcon />}
										footer="Utile si l’e-mail de vérification n’arrive pas."
										onClick={() => void onVerifierAdresse(membre.id)}
									>
										Marquer l’adresse comme vérifiée
									</ListButton>
								</PopoverClose>
							)}
							<PopoverClose>
								<ListButton
									size="md"
									icon={<ShieldIcon />}
									onClick={() => {
										void onChangerRole(
											membre.id,
											membre.role === 'ORG_ADMIN' ? 'ORG_MEMBER' : 'ORG_ADMIN'
										);
									}}
								>
									{membre.role === 'ORG_ADMIN' ? 'Repasser en membre' : 'Nommer administrateur'}
								</ListButton>
							</PopoverClose>
							<ListSeparator />
							<PopoverClose>
								<ListButton
									size="md"
									color="red"
									icon={<UserMinusIcon />}
									footer="Ses confirmations restent au dossier."
									onClick={() => void onRetirer(membre.id)}
								>
									Retirer de l’établissement
								</ListButton>
							</PopoverClose>
						</List>
					</Popover>
				</PopoverRoot>
			) : null}
		</ListItem>
	);
}

function LigneInvitation({
	invitation,
	onAnnuler
}: {
	invitation: InvitationEnAttente;
	onAnnuler: (invitationId: string) => Promise<void>;
}) {
	const [copie, setCopie] = useState(false);
	const jours = joursRestants(invitation.expireLe);

	async function copier() {
		try {
			await navigator.clipboard.writeText(invitation.lien);
			setCopie(true);
			window.setTimeout(() => setCopie(false), 1600);
		} catch {
			// Presse-papiers refusé. Le lien reste sélectionnable dans l'infobulle du
			// bouton : on a gagné moins, on n'a rien perdu.
		}
	}

	return (
		<ListItem className="flex flex-wrap items-center gap-cladd-3xs">
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-cladd-sm font-semibold text-cladd-fg">
					{invitation.email}
				</span>
				<span className="truncate text-cladd-2xs text-cladd-fg-softer">
					{LIBELLE_ROLE[invitation.role]} · expire dans {jours} jour{pluriel(jours)}
				</span>
			</span>

			<Button variant="transparent" title={invitation.lien} onClick={() => void copier()}>
				{copie ? <CheckIcon /> : <CopyIcon />}
				{copie ? 'Lien copié' : 'Copier le lien'}
			</Button>
			<Button variant="transparent" color="red" onClick={() => void onAnnuler(invitation.id)}>
				Annuler
			</Button>
		</ListItem>
	);
}

function FormulaireInvitation({
	onInviter,
	complet,
	places
}: {
	onInviter: (email: string, role: RoleEquipe) => Promise<void>;
	complet: boolean;
	places: number;
}) {
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<RoleEquipe>('ORG_MEMBER');
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const [envoye, setEnvoye] = useState(false);

	const valide = email.includes('@') && email.trim().length > 3;

	async function envoyer() {
		if (!valide || enCours) return;
		setEnCours(true);
		setErreur(null);
		try {
			await onInviter(email.trim().toLowerCase(), role);
			setEmail('');
			setEnvoye(true);
			window.setTimeout(() => setEnvoye(false), 2500);
		} catch (e) {
			setErreur(messageDErreur(e));
		} finally {
			setEnCours(false);
		}
	}

	if (complet) {
		return (
			<SectionEcran titre="Inviter un collègue">
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Les {places} places de votre offre sont prises, invitations en attente comprises. Annulez
					une invitation, retirez quelqu’un, ou passez à l’offre supérieure pour en ajouter.
				</p>
			</SectionEcran>
		);
	}

	return (
		<SectionEcran
			titre="Inviter un collègue"
			legende="Il recevra un lien valable sept jours, et créera son mot de passe lui-même."
		>
			<div className="flex flex-col gap-cladd-2xs">
				<div className="flex flex-col gap-cladd-3xs">
					<span className="text-cladd-2xs font-semibold text-cladd-fg-soft">Adresse e-mail</span>
					<Input
						value={email}
						onChange={setEmail}
						name="invitation"
						type="email"
						placeholder="prenom.nom@etablissement.fr"
						size="lg"
					/>
				</div>

				<div className="flex flex-col gap-cladd-3xs">
					<span className="text-cladd-2xs font-semibold text-cladd-fg-soft">Son rôle</span>
					<Segmented className="self-start" activeColor="brand" activeVariant="solid">
						<SegmentedButton active={role === 'ORG_MEMBER'} onClick={() => setRole('ORG_MEMBER')}>
							Membre
						</SegmentedButton>
						<SegmentedButton active={role === 'ORG_ADMIN'} onClick={() => setRole('ORG_ADMIN')}>
							Administrateur
						</SegmentedButton>
					</Segmented>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						{CE_QUE_FAIT_LE_ROLE[role]}
					</p>
				</div>

				{erreur ? (
					<p className="text-cladd-xs leading-relaxed text-cladd-fg" role="alert">
						{erreur}
					</p>
				) : null}

				<Button
					className="self-start"
					color="brand"
					variant="solid-fill"
					loading={enCours}
					readOnly={!valide || enCours}
					onClick={() => void envoyer()}
				>
					{envoye ? <CheckIcon /> : <UserPlusIcon />}
					{envoye ? 'Invitation envoyée' : 'Envoyer l’invitation'}
				</Button>
			</div>
		</SectionEcran>
	);
}

export function messageDErreur(e: unknown): string {
	if (typeof e === 'object' && e !== null && 'data' in e) {
		const data = (e as { data: unknown }).data;
		if (typeof data === 'string') return data;
	}
	if (e instanceof Error && e.message) return e.message;
	return 'L’action n’a pas abouti. Réessayez dans un instant.';
}
