import { useState, type ComponentProps } from 'react';
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
import {
	BoutonPrincipal,
	BoutonSecondaire,
	Champ,
	Lien,
	LigneAnalyse,
	ListeAnalyses,
	PageEcran,
	SectionEcran,
	pluriel,
	type Lecture
} from '../../ui';
import { TITRE_ECRAN } from '../titres';

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
	onChangerRole: (membreId: string, role: RoleEquipe) => Promise<void>;
	onRetirer: (membreId: string) => Promise<void>;
	onAnnulerInvitation: (invitationId: string) => Promise<void>;
	onVerifierAdresse: (membreId: string) => Promise<void>;
}) {
	const placesLibres = Math.max(0, siegesAutorises - siegesUtilises - invitations.length);
	const complet = placesLibres === 0;

	return (
		<div className="flex max-w-180 flex-col gap-cladd-2xs">
			{/*
			  ⚠️ LES PLACES NE SE COMPTENT PLUS DEUX FOIS. « 3 sur 5 places » vivait
			  ici, et « 2 places » sur la rangée d'invitation trois blocs plus bas :
			  deux façons de dire le même reste, dont une seule mène au geste qui
			  l'utilise. Celle qui reste est sur la rangée.
			*/}
			<SectionEcran titre="Les personnes de l’établissement">
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="p-0"
				>
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

			{/* La légende disait « 2 envoyées, pas encore acceptées » sous un titre qui
			    dit déjà « en attente ». La liste dessous porte le compte. */}
			{invitations.length > 0 ? (
				<SectionEcran titre="Invitations en attente">
					<Surface
						variant="transparent"
						outline={false}
						className="verre-carte rounded-cladd-xl"
						contentClassName="p-0"
					>
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

			{/*
			  ⚠️ INVITER EST DEVENU UNE PAGE, ET C'EST UN FORMULAIRE QUI LE DEMANDE.

			  Il tenait en bas de l'écran : une adresse, un choix de rôle avec son
			  explication, un bouton. Sur un téléphone, il arrivait après deux listes
			  — donc après un défilement — et le clavier qui s'ouvre repoussait le
			  bouton hors de vue.

			  Une rangée dit ce qu'il reste de places ; la page a l'écran pour elle.

			  ⚠️ ET ELLE NE S'AFFICHE PLUS À QUI NE PEUT PAS INVITER. Un membre y
			  lisait « Réservé aux administrateurs » sous un chevron qui poussait vers
			  une page dont le seul contenu était le même refus, écrit plus longuement :
			  une page entière pour dire non. Il sait qui administre — chaque rangée de
			  la liste au-dessus porte sa puce « Administrateur ». La garde de la page
			  reste, pour un lien direct, et celle du serveur aussi.
			*/}
			{estAdmin ? (
				<ListeAnalyses>
					<LigneAnalyse
						vers="/app/equipe/inviter"
						icone={<UserPlusIcon />}
						titre="Inviter un collègue"
						valeur={
							complet
								? 'Complet'
								: `${placesLibres} place${pluriel(placesLibres)} libre${pluriel(placesLibres)}`
						}
					/>
				</ListeAnalyses>
			) : null}
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

/**
 * LE FORMULAIRE D'INVITATION.
 *
 * ⚠️ IL NE PORTE PLUS SA PROPRE SECTION. Il vit sur `/app/equipe/inviter`, dont
 * l'en-tête porte déjà le titre et la légende : les répéter ferait lire deux
 * fois la même phrase avant d'arriver au champ.
 */
export function FormulaireInvitation({
	onInviter,
	complet,
	places
}: {
	/** Rend le LIEN d'invitation : c'est lui qui sauve une invitation tombée dans les indésirables. */
	onInviter: (email: string, role: RoleEquipe) => Promise<string>;
	complet: boolean;
	places: number;
}) {
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<RoleEquipe>('ORG_MEMBER');
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	/** L'invitation qui vient de partir, ou `null` : c'est elle qui décide de l'écran montré. */
	const [envoyee, setEnvoyee] = useState<{ email: string; lien: string } | null>(null);

	const valide = email.includes('@') && email.trim().length > 3;

	async function envoyer() {
		if (!valide || enCours) return;
		const adresse = email.trim().toLowerCase();
		setEnCours(true);
		setErreur(null);
		try {
			const lien = await onInviter(adresse, role);
			setEmail('');
			setEnvoyee({ email: adresse, lien });
		} catch (e) {
			setErreur(messageDErreur(e));
		} finally {
			setEnCours(false);
		}
	}

	if (complet) {
		return (
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Les {places} places de votre offre sont prises, invitations en attente comprises. Annulez
				une invitation, retirez quelqu’un, ou passez à l’offre supérieure pour en ajouter.
			</p>
		);
	}

	if (envoyee !== null) {
		return <InvitationPartie invitation={envoyee} onRecommencer={() => setEnvoyee(null)} />;
	}

	return (
		/*
		  ⚠️ UN VRAI `<form>`, ET PAS UN CHAMP SUIVI D'UN BOUTON.

		  Sans lui, la touche « Envoyer » du clavier iOS ne fait rien : il faut
		  refermer le clavier pour atteindre le bouton, c'est-à-dire exactement le
		  geste que cette page avait été créée pour supprimer. Et l'intitulé du
		  champ était un `<span>` posé à côté de l'`Input` : un lecteur d'écran
		  annonçait un champ sans nom. `Champ` est un `<label>`, il porte donc le
		  nom du champ qu'il enveloppe.
		*/
		<form
			className="flex flex-col gap-cladd-2xs"
			onSubmit={(e) => {
				e.preventDefault();
				void envoyer();
			}}
		>
			<Champ etiquette="Adresse e-mail">
				<Input
					value={email}
					onChange={setEmail}
					name="invitation"
					type="email"
					inputMode="email"
					placeholder="prenom.nom@etablissement.fr"
					size="lg"
					// ⚠️ PAS D'`autoFocus` : le clavier masquerait l'explication du rôle
					// à l'ouverture, et c'est elle qu'on vient lire avant de choisir.
					inputComponentProps={{
						autoComplete: 'email',
						autoCapitalize: 'none',
						autoCorrect: 'off',
						spellCheck: false,
						enterKeyHint: 'send'
					}}
				/>
			</Champ>

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

			{/* `readOnly` et non `disabled` : un bouton désactivé ne reçoit pas le
			    survol, et la validation reste faite ici — une touche Entrée sur une
			    adresse incomplète ne part pas. */}
			<BoutonPrincipal
				type="submit"
				className="self-start"
				loading={enCours}
				readOnly={!valide || enCours}
			>
				<UserPlusIcon />
				Envoyer l’invitation
			</BoutonPrincipal>
		</form>
	);
}

/**
 * CE QU'ON VOIT APRÈS L'ENVOI, ET POURQUOI CE N'EST PAS « ENREGISTRÉ » PENDANT
 * DEUX SECONDES ET DEMIE.
 *
 * Le formulaire se vidait, le bouton confirmait le temps d'un battement de
 * cils, et le gérant restait devant un champ vide. Or cet écran dit lui-même
 * qu'un e-mail d'invitation tombe régulièrement dans les indésirables d'une
 * messagerie d'établissement : le seul recours est le lien copiable, et il
 * n'était accessible qu'en revenant à l'équipe puis en retrouvant la bonne
 * rangée.
 *
 * ⚠️ LE LIEN PORTE UN JETON. Il s'affiche, il se copie, et il ne se journalise
 * jamais : quiconque l'obtient entre dans l'établissement.
 */
function InvitationPartie({
	invitation,
	onRecommencer
}: {
	invitation: { email: string; lien: string };
	onRecommencer: () => void;
}) {
	const [copie, setCopie] = useState(false);

	async function copier() {
		try {
			await navigator.clipboard.writeText(invitation.lien);
			setCopie(true);
			window.setTimeout(() => setCopie(false), 1600);
		} catch {
			// Presse-papiers refusé. Le lien reste lisible et sélectionnable
			// au-dessus : on a gagné moins, on n'a rien perdu.
		}
	}

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<span className="flex flex-wrap items-center gap-cladd-3xs">
					<Chip color="brand" size="md">
						Invitation envoyée
					</Chip>
					<span className="text-cladd-sm font-bold break-all">{invitation.email}</span>
				</span>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Un e-mail d’invitation tombe régulièrement dans les indésirables d’une messagerie
					d’établissement. Le lien ci-dessous se transmet par n’importe quel canal, et vaut la même
					chose que l’e-mail.
				</p>
				<span className="text-cladd-2xs break-all text-cladd-fg-softer">{invitation.lien}</span>
			</Surface>

			<div className="flex flex-wrap items-center gap-cladd-3xs">
				<BoutonPrincipal onClick={() => void copier()}>
					{copie ? <CheckIcon /> : <CopyIcon />}
					{copie ? 'Lien copié' : 'Copier le lien'}
				</BoutonPrincipal>
				<BoutonSecondaire onClick={onRecommencer}>
					<UserPlusIcon />
					Inviter quelqu’un d’autre
				</BoutonSecondaire>
				<BoutonSecondaire as={Lien} to="/app/equipe">
					Revenir à l’équipe
				</BoutonSecondaire>
			</div>
		</div>
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

export function EcranEquipe({ donnees }: { donnees: Lecture<ComponentProps<typeof Equipe>> }) {
	return (
		<PageEcran
			entete={{
				genre: 'onglet',
				titre: TITRE_ECRAN.equipe,
				// ⚠️ « ET AUX CRÉANCES », PLUS « ET AUX TAUX ». Le sous-titre parlait
				// encore la langue d'EGalim, que la salle d'exposition avait déjà
				// corrigée de son côté.
				sousTitre: 'Qui accède aux factures et aux créances de cet établissement.'
			}}
			etat={donnees.etat}
		>
			{donnees.etat === 'pret' ? <Equipe {...donnees.valeur} /> : null}
		</PageEcran>
	);
}
