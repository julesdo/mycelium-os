import { useEffect, useRef, useState } from 'react';
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
	SectionTitle,
	Segmented,
	SegmentedButton,
	Spinner,
	Surface
} from '@cladd-ui/react';
import {
	ArrowUpCircleIcon,
	CheckIcon,
	CopyIcon,
	EllipsisIcon,
	MailCheckIcon,
	ShieldIcon,
	UserMinusIcon,
	UserPlusIcon
} from 'lucide-react';
import { VALIDITE_INVITATION_EN_TOUTES_LETTRES } from '../../lib/config/invitations';
import { FORMULES, GRILLE, LIMITES, type Formule, type Rythme } from '../../lib/config/tarifs';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	Champ,
	ChoixDeFormule,
	ConfirmationDeChangement,
	ConfirmationParSaisie,
	pluriel,
	type ApercuDeChangement
} from '../../ui';
import type { AbonnementAffiche, CaisseAffichee } from './facturation';
import type { GestionAffichee } from './gestion-formule';

/**
 * L'ÉQUIPE — la section, et l'invitation EN LIGNE.
 *
 * ONZE FONCTIONS EXISTAIENT, ZÉRO ÉCRAN LES APPELAIT. Inviter, accepter,
 * annuler, changer un rôle, retirer quelqu'un : tout était écrit côté serveur
 * depuis des mois, et la seule façon d'ajouter un collègue était d'écrire une
 * mutation à la main dans un tableau de bord.
 *
 * ⚠️ L'INVITATION A PERDU SA PAGE, ET C'EST LA CONSÉQUENCE DIRECTE DE LA PAGE
 * UNIQUE. Elle en avait une (`/app/equipe/inviter`) parce qu'elle vivait en BAS
 * d'un écran, sous deux listes : sur un téléphone, il fallait défiler pour
 * l'atteindre, puis le clavier repoussait le bouton d'envoi hors de l'écran.
 * Ici, la section entière se déplie sur `/app/compte`, et le formulaire est le
 * dernier bloc d'une section qu'on atteint déjà en défilant : lui donner une
 * adresse ferait une quatorzième porte pour un champ et un choix.
 *
 * TOUT EST EN PROPS ET EN RAPPELS. C'est ce qui permet de le REGARDER dans la
 * salle d'exposition aux quatre largeurs sans ouvrir de session.
 *
 * LE LIEN D'INVITATION EST AFFICHÉ, PAS SEULEMENT ENVOYÉ. Un e-mail
 * d'invitation tombe régulièrement dans les indésirables d'une messagerie
 * d'établissement, et le gérant n'a alors aucun recours. Le lien copiable se
 * transmet par n'importe quel canal ; sans lui, une invitation perdue est une
 * invitation morte, puisqu'on ne peut pas la renvoyer avant son expiration.
 *
 * ⚠️ FRONTIÈRE DÉCLARÉE. L'acceptation de l'invitation, la création du mot de
 * passe et la récupération appartiennent à Better Auth : elles s'ouvrent sur
 * SON parcours, hors de cette page. Ce qui appartient au prestataire sort de la
 * grammaire de ce produit, et le dire vaut mieux que réimplémenter un tunnel
 * qu'on ne contrôle pas.
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

/**
 * CE QU'IL FAUT SAISIR POUR RETIRER QUELQU'UN.
 *
 * L'adresse d'abord : elle est unique dans l'établissement, elle se recopie
 * depuis la rangée, et c'est elle qu'on reconnaît. À défaut — un compte créé
 * par invitation peut n'en porter aucune — le nom affiché, qui est alors la
 * seule chaîne que la rangée montre et que l'œil peut vérifier.
 */
function valeurAConfirmer(m: MembreEquipe): string {
	return m.email ?? titreDeLigne(m);
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

/** Ce que la section affiche, et les six gestes que la route pilote. */
export interface EquipeAffichee {
	readonly membres: readonly MembreEquipe[];
	readonly invitations: readonly InvitationEnAttente[];
	readonly estAdmin: boolean;
	readonly siegesUtilises: number;
	readonly siegesAutorises: number;
	readonly onChangerRole: (membreId: string, role: RoleEquipe) => Promise<void>;
	readonly onRetirer: (membreId: string) => Promise<void>;
	readonly onAnnulerInvitation: (invitationId: string) => Promise<void>;
	readonly onVerifierAdresse: (membreId: string) => Promise<void>;
	/** Rend le LIEN d'invitation : c'est lui qui sauve une invitation tombée dans les indésirables. */
	readonly onInviter: (email: string, role: RoleEquipe) => Promise<string>;
	/**
	 * L'abonnement et ses gestes, pour passer à la formule du dessus depuis
	 * l'invitation quand les places sont prises (21/10/2026). Absent : on ne peut
	 * que libérer une place.
	 */
	readonly formule?: FormuleDeLEquipe;
}

/** Ce que l'écran Compte sait de l'abonnement, prêté à l'invitation. */
export interface FormuleDeLEquipe {
	readonly abonnement: AbonnementAffiche;
	readonly caisse?: CaisseAffichee;
	readonly gestion?: GestionAffichee;
	readonly maintenant: number;
}

/**
 * PASSER À LA FORMULE DU DESSUS POUR INVITER (21/10/2026).
 *
 * Le fondateur, devant le refus en quatre paragraphes : « pas très CX friendly […]
 * laisser le choix de rentrer l'email […] avec un bouton passer à l'offre
 * supérieure ». Relevé chez Slack, Notion, Linear et Figma : on écrit l'adresse
 * comme d'habitude, le bouton dit ce qui va se passer, une page pleine montre ce que
 * change la formule et ce qu'elle coûte, et l'invitation part seule dès que la
 * formule est en place. Deux voies : un abonné CHANGE de formule (le prorata d'abord,
 * Paddle répond tout de suite) ; un compte sans abonnement SOUSCRIT par la page de
 * choix, la bonne formule cochée (l'invitation part au retour de Paddle).
 */
type Montee =
	| {
			readonly genre: 'CHANGER';
			readonly cible: Formule;
			readonly rythme: Rythme;
			readonly aLEssai: boolean;
			readonly quittePrixFondateurs: boolean;
			readonly gestion: GestionAffichee;
	  }
	| {
			readonly genre: 'SOUSCRIRE';
			readonly cible: Formule;
			readonly caisse: CaisseAffichee;
			readonly abonnement: AbonnementAffiche;
			readonly maintenant: number;
	  };

/** La plus petite formule qui ouvre `besoin` accès, ou `null` : aucune n'en ouvre autant. */
function formuleQuiOuvre(besoin: number): Formule | null {
	return FORMULES.find((f) => LIMITES[f].utilisateurs >= besoin) ?? null;
}

function monteePourInviter(formule: FormuleDeLEquipe | undefined, besoin: number): Montee | null {
	if (formule === undefined) return null;
	const cible = formuleQuiOuvre(besoin);
	if (cible === null) return null;
	const { abonnement, caisse, gestion } = formule;
	const vivant = abonnement.statut === 'active' || abonnement.statut === 'trialing';
	if (
		vivant &&
		gestion !== undefined &&
		abonnement.formule !== null &&
		abonnement.rythme !== null
	) {
		if (cible === abonnement.formule) return null;
		return {
			genre: 'CHANGER',
			cible,
			rythme: abonnement.rythme,
			aLEssai: abonnement.statut === 'trialing',
			quittePrixFondateurs: abonnement.prixFondateurs === true,
			gestion
		};
	}
	if (!vivant && caisse?.disponible === true) {
		return { genre: 'SOUSCRIRE', cible, caisse, abonnement, maintenant: formule.maintenant };
	}
	return null;
}

export function SectionEquipe({
	membres,
	invitations,
	estAdmin,
	siegesUtilises,
	siegesAutorises,
	onChangerRole,
	onRetirer,
	onAnnulerInvitation,
	onVerifierAdresse,
	onInviter,
	formule
}: EquipeAffichee) {
	const placesLibres = Math.max(0, siegesAutorises - siegesUtilises - invitations.length);
	const montee = monteePourInviter(formule, siegesUtilises + invitations.length + 1);

	return (
		<>
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

			{invitations.length > 0 ? (
				<>
					<SectionTitle>Invitations en attente</SectionTitle>
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
				</>
			) : null}

			<SectionTitle>Inviter un collègue</SectionTitle>
			{estAdmin ? (
				<FormulaireInvitation
					onInviter={onInviter}
					complet={placesLibres === 0}
					places={siegesAutorises}
					placesLibres={placesLibres}
					montee={montee}
					nomDeLaFormule={
						formule?.abonnement.formule ? GRILLE[formule.abonnement.formule].nom : null
					}
				/>
			) : (
				/*
				  ⚠️ LE REFUS EST ÉCRIT EN QUATRE PARTIES (D0), ET IL NE COMMENCE PAS
				  PAR LE NON. Ce qu'on peut faire tout de suite, ce qui manque, ce qui
				  le lève au CONSTAT, ce que l'attente coûte.
				*/
				<div className="flex flex-col gap-cladd-3xs">
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						La liste ci-dessus dit qui administre cet établissement : chaque personne marquée «
						Administrateur » peut inviter quelqu’un aujourd’hui.
					</p>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Ce qui manque : votre compte est membre, et l’invitation est réservée à un
						administrateur.
					</p>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Ce verrou se lève par le passage de votre compte en administrateur, décidé par l’un
						d’eux.
					</p>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Ce que l’attente coûte : {siegesUtilises} personne{pluriel(siegesUtilises)} sur{' '}
						{siegesAutorises} accède
						{siegesUtilises > 1 ? 'nt' : ''} à cet établissement, et {placesLibres} place
						{pluriel(placesLibres)} reste{placesLibres > 1 ? 'nt' : ''} inoccupée
						{pluriel(placesLibres)} d’ici là.
					</p>
				</div>
			)}
		</>
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
			{/*
			  ⚠️ `basis-64` N'EST PAS UN ORNEMENT : sans lui, `flex-1` part d'une base
			  nulle, la rangée ne se replie jamais, et c'est l'IDENTITÉ qui absorbe
			  tout ce que les puces laissent. Mesuré à 375 px, la colonne du nom
			  tombait à 42 px, soit « direction@… », pendant que « Adresse non
			  vérifiée » et « Membre » gardaient leurs 198 px. La seule chose qui dise
			  DE QUI parle la rangée était la première sacrifiée. Avec une base de
			  16 rem, ce sont les puces qui passent à la ligne.
			*/}
			<span className="flex min-w-0 flex-1 basis-64 flex-col">
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
						{/* `square` : sans lui, un bouton sans libellé se réduit à ses
						    rembourrages et tombe à 36 px de large pour 48 de haut. Le prop
						    du kit le rend carré sur son jeton de taille, donc 48 × 48. */}
						<Button
							square
							variant="transparent"
							aria-label={`Actions sur ${membre.email ?? membre.id}`}
						>
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
							{/*
							  ═══════════════════════════════════════════════════════════════
							  ⚠️ RETIRER QUELQU'UN NE S'EXÉCUTE PLUS SUR UN SEUL DOIGT
							  ═══════════════════════════════════════════════════════════════

							  C'était un `onClick` direct : un doigt sur l'ellipse, un doigt
							  sur « Retirer », et le collègue perdait l'accès. Aucune
							  confirmation, et pas un mot sur ce que ça coûte — alors que
							  c'est le seul geste de la page qui retire un droit à QUELQU'UN
							  D'AUTRE. Il était le moins gardé des trois gestes destructeurs,
							  et les deux autres exigeaient déjà une saisie exacte.

							  ⚠️ ET IL RESTE DANS LE MENU, CE QUI A ÉTÉ VÉRIFIÉ AU NAVIGATEUR
							  PLUTÔT QUE SUPPOSÉ. Le dialogue s'ouvre dans un portail ; on
							  pouvait craindre que le survol se referme à ce clic et emporte
							  son propre dialogue. Mesuré : le dialogue s'ouvre, son champ est
							  présent, le survol se referme proprement derrière. La variante
							  écartée — un second bouton rond sur la rangée — a été regardée à
							  375 px : chez un membre qui porte déjà deux puces, la paire de
							  boutons tombait ORPHELINE sur une troisième ligne, détachée de
							  la personne qu'elle visait.
							*/}
							<ConfirmationParSaisie
								titre={`Retirer ${titreDeLigne(membre)} ?`}
								texte={`${titreDeLigne(membre)} perd immédiatement l’accès à toutes les factures, tous les clients et tous les calculs de cet établissement. Ses confirmations restent au dossier, et il faudra une nouvelle invitation pour lui rendre l’accès. Saisissez ${valeurAConfirmer(membre)} pour confirmer.`}
								valeurAttendue={valeurAConfirmer(membre)}
								invite={membre.email ? 'Son adresse e-mail' : 'Son nom'}
								intituleConfirmation="Retirer de l’établissement"
								onConfirmer={() => void onRetirer(membre.id)}
								declencheur={
									<ListButton
										size="md"
										color="red"
										icon={<UserMinusIcon />}
										footer="Ses confirmations restent au dossier."
									>
										Retirer de l’établissement
									</ListButton>
								}
							/>
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
			{/* Même base que `LigneMembre` : l'adresse invitée passait à 37 px de
			    large à 375 px, derrière « Copier le lien » et « Annuler ». */}
			<span className="flex min-w-0 flex-1 basis-64 flex-col">
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
 * LE FORMULAIRE D'INVITATION, EN LIGNE DANS LA SECTION.
 *
 * ⚠️ IL DIT CE QU'IL RESTE DE PLACES UNE SEULE FOIS. Le compte vivait en double
 * — « 3 sur 5 places » en tête de l'écran d'équipe, « 2 places » sur la rangée
 * qui poussait vers la page d'invitation — et deux façons de dire le même reste
 * finissent par ne plus dire la même chose. Il vit ici, là où il décide.
 */
export function FormulaireInvitation({
	onInviter,
	complet,
	places,
	placesLibres,
	montee = null,
	nomDeLaFormule = null
}: {
	/** Rend le LIEN d'invitation : c'est lui qui sauve une invitation tombée dans les indésirables. */
	onInviter: (email: string, role: RoleEquipe) => Promise<string>;
	complet: boolean;
	places: number;
	placesLibres: number;
	/** La formule du dessus et sa voie, quand les places sont prises. */
	montee?: Montee | null;
	/** « Solo » : le nom de la formule souscrite, s'il y en a une. */
	nomDeLaFormule?: string | null;
}) {
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<RoleEquipe>('ORG_MEMBER');
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	/** L'invitation qui vient de partir, ou `null` : c'est elle qui décide de l'écran montré. */
	const [envoyee, setEnvoyee] = useState<{ email: string; lien: string } | null>(null);

	/** L'invitation qui attend la formule du dessus : l'adresse et le rôle, gardés. */
	const [demande, setDemande] = useState<{ email: string; role: RoleEquipe } | null>(null);
	/** La page pleine de la montée est ouverte. */
	const [monteeOuverte, setMonteeOuverte] = useState(false);
	const [apercu, setApercu] = useState<ApercuDeChangement>({ etat: 'attente' });
	const [changementEnCours, setChangementEnCours] = useState(false);
	const [erreurDeMontee, setErreurDeMontee] = useState<string | null>(null);
	/** Le changement de formule a répondu : l'invitation n'attend plus que les places. */
	const [changee, setChangee] = useState(false);
	const envoiLance = useRef(false);

	const valide = email.includes('@') && email.trim().length > 3;
	const nomCible = montee === null ? null : GRILLE[montee.cible].nom;
	/*
	  L'invitation attend la formule : après le changement (un abonné), ou après le
	  paiement confirmé par Paddle (une souscription). Un paiement abandonné ne laisse
	  rien en attente : l'adresse reste dans le champ, et on recommence d'un toucher.
	*/
	const enAttente =
		demande !== null &&
		(changee || (montee?.genre === 'SOUSCRIRE' && montee.caisse.souscrite !== null));

	// Les places arrivent avec la formule (la lecture de l'abonnement est en temps
	// réel) : l'invitation gardée part alors d'elle-même, une seule fois.
	useEffect(() => {
		if (!enAttente || complet || demande === null || envoiLance.current) return;
		envoiLance.current = true;
		const { email: adresse, role: sonRole } = demande;
		onInviter(adresse, sonRole)
			.then((lien) => {
				setEmail('');
				setEnvoyee({ email: adresse, lien });
			})
			.catch((e: unknown) => setErreur(messageDErreur(e)))
			.finally(() => {
				envoiLance.current = false;
				setDemande(null);
				setChangee(false);
				if (montee?.genre === 'SOUSCRIRE') montee.caisse.onFermerLaReussite();
			});
	}, [enAttente, complet, demande, onInviter, montee]);

	/** Les places sont prises : on garde l'invitation et on ouvre la formule du dessus. */
	function monter() {
		if (!valide || montee === null) return;
		setDemande({ email: email.trim().toLowerCase(), role });
		setErreurDeMontee(null);
		setMonteeOuverte(true);
		if (montee.genre === 'CHANGER') {
			setApercu({ etat: 'attente' });
			montee.gestion
				.apercu(montee.cible, montee.rythme)
				.then((a) => setApercu({ etat: 'pret', ...a }))
				.catch((e: unknown) => setApercu({ etat: 'erreur', message: messageDErreur(e) }));
		}
	}

	function confirmerLeChangement() {
		if (montee?.genre !== 'CHANGER') return;
		setChangementEnCours(true);
		setErreurDeMontee(null);
		montee.gestion
			.changer(montee.cible, montee.rythme, montee.quittePrixFondateurs)
			.then(() => {
				setChangee(true);
				setMonteeOuverte(false);
			})
			.catch((e: unknown) => setErreurDeMontee(messageDErreur(e)))
			.finally(() => setChangementEnCours(false));
	}

	async function envoyer() {
		if (complet) {
			monter();
			return;
		}
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

	if (envoyee !== null) {
		return <InvitationPartie invitation={envoyee} onRecommencer={() => setEnvoyee(null)} />;
	}

	if (enAttente && demande !== null) {
		return (
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<span className="flex items-center gap-cladd-3xs text-cladd-xs font-semibold">
					<Spinner size="sm" />
					{nomCible === null ? 'La formule s’active' : `${nomCible} s’active`}
				</span>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					L’invitation à <span className="break-all">{demande.email}</span> part dès que la nouvelle
					place est là, en général en quelques secondes.
				</p>
				<BoutonTexte
					className="self-start"
					onClick={() => {
						setDemande(null);
						setChangee(false);
					}}
				>
					Ne pas l’envoyer
				</BoutonTexte>
			</Surface>
		);
	}

	/*
	  ⚠️ PLUS DE PLACE LIBRE : LE FORMULAIRE RESTE (21/10/2026). Il remplaçait le
	  champ par un refus en quatre paragraphes. On écrit l'adresse comme d'habitude ;
	  une ligne dit que les places sont prises, et le bouton dit ce qui va se passer.
	*/
	const lignePlaces = complet
		? `${nomDeLaFormule ?? 'Votre formule'} compte ${places} accès${places > 1 ? ' : tous sont pris, invitations comprises.' : ', déjà pris.'}`
		: null;
	const contexte =
		demande === null || nomCible === null
			? undefined
			: `Pour inviter ${demande.email} : ${nomCible} compte ${montee === null ? '' : LIMITES[montee.cible].utilisateurs} accès.`;

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
		<>
			<form
				className="flex flex-col gap-cladd-2xs"
				onSubmit={(e) => {
					e.preventDefault();
					void envoyer();
				}}
			>
				{lignePlaces === null ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						{placesLibres} place{pluriel(placesLibres)} libre{pluriel(placesLibres)} sur {places}.
						Le collègue recevra un lien valable {VALIDITE_INVITATION_EN_TOUTES_LETTRES}, et créera
						son mot de passe lui-même, sur le parcours de notre prestataire d’authentification.
					</p>
				) : (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{lignePlaces}</p>
				)}

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
					{/*
				  ⚠️ `type="button"` : un bouton du kit n'a pas de type, et posé dans un
				  `<form>` il l'ENVOIE. Toucher « Administrateur » après avoir tapé
				  l'adresse envoyait l'invitation sur-le-champ, avec le rôle d'avant
				  (relevé le 13/10/2026).
				*/}
					<Segmented className="self-start" activeColor="brand" activeVariant="solid">
						<SegmentedButton
							type="button"
							active={role === 'ORG_MEMBER'}
							onClick={() => setRole('ORG_MEMBER')}
						>
							Membre
						</SegmentedButton>
						<SegmentedButton
							type="button"
							active={role === 'ORG_ADMIN'}
							onClick={() => setRole('ORG_ADMIN')}
						>
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
				{complet && montee === null ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Pour inviter, libérez une place : annulez une invitation en attente, ou retirez
						quelqu’un de la liste.
					</p>
				) : (
					<BoutonPrincipal
						type="submit"
						className="self-start"
						loading={enCours}
						readOnly={!valide || enCours}
					>
						{complet ? <ArrowUpCircleIcon /> : <UserPlusIcon />}
						{complet && nomCible !== null
							? `Passer à ${nomCible} pour inviter`
							: 'Envoyer l’invitation'}
					</BoutonPrincipal>
				)}
				{complet && montee !== null ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						Ou libérez une place : annulez une invitation en attente, ou retirez quelqu’un de la
						liste.
					</p>
				) : null}
			</form>

			{montee?.genre === 'CHANGER' ? (
				<ConfirmationDeChangement
					ouverte={monteeOuverte}
					onFermer={() => setMonteeOuverte(false)}
					formule={montee.cible}
					rythme={montee.rythme}
					aLEssai={montee.aLEssai}
					quittePrixFondateurs={montee.quittePrixFondateurs}
					apercu={apercu}
					enCours={changementEnCours}
					erreur={erreurDeMontee}
					onConfirmer={confirmerLeChangement}
					libelleConfirmer={`Passer à ${GRILLE[montee.cible].nom} et inviter`}
					{...(contexte === undefined ? {} : { contexte })}
				/>
			) : null}
			{montee?.genre === 'SOUSCRIRE' ? (
				<ChoixDeFormule
					ouverte={monteeOuverte && montee.caisse.souscrite === null}
					onFermer={() => setMonteeOuverte(false)}
					recommandee={montee.cible}
					essaiDisponible={montee.caisse.essai}
					enCours={montee.caisse.enCours === 'formule'}
					maintenant={montee.maintenant}
					utilisateurs={montee.abonnement.utilisateurs + 1}
					onChoisir={montee.caisse.onChoisir}
					ttc={montee.caisse.ttc ?? null}
					{...(montee.caisse.onVoirLesPrix ? { onVoirLesPrix: montee.caisse.onVoirLesPrix } : {})}
					{...(montee.caisse.bienvenue ? { bienvenue: montee.caisse.bienvenue } : {})}
					{...(contexte === undefined ? {} : { contexte })}
				/>
			) : null}
		</>
	);
}

/**
 * CE QU'ON VOIT APRÈS L'ENVOI, ET POURQUOI CE N'EST PAS « ENREGISTRÉ » PENDANT
 * DEUX SECONDES ET DEMIE.
 *
 * Le formulaire se vidait, le bouton confirmait le temps d'un battement de
 * cils, et le gérant restait devant un champ vide. Or cette section dit
 * elle-même qu'un e-mail d'invitation tombe régulièrement dans les indésirables
 * d'une messagerie d'établissement : le seul recours est le lien copiable.
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
