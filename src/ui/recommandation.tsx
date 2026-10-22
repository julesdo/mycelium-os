import { useState, type ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import {
	BadgeCheckIcon,
	CheckIcon,
	ChevronDownIcon,
	CopyIcon,
	GiftIcon,
	MailIcon,
	MessageSquareTextIcon,
	QrCodeIcon,
	ShareIcon,
	UserPlusIcon
} from 'lucide-react';
import { BoutonPrincipal } from './bouton';
import { cn } from './cn';
import { eurosCentimesCourts } from './format';
import { IconeLetikette } from './logo';
import { FeuillePleinEcran } from './plein-ecran';
import { Plume } from './plume';
import { QrDeVirement } from './qr-virement';

/**
 * RECOMMANDER LETIKETTE (22/10/2026, refait sur Revolut, Wise, Gusto, Deel, N26, Cash
 * App, Cleo, Wispr Flow, Numo, Chime et Brex). Le verdict du fondateur sur la première
 * version — un champ à copier et un bouton au fond du compte : « pas du tout marketing,
 * juste un lien comme ça avec un seul bouton ».
 *
 * Ce que toutes les références ont, et que ce module dessine :
 *
 *   · LE CADEAU COMME OBJET (`CarteCadeau`, Wispr Flow) : on n'envoie pas un lien, on
 *     offre un mois, et la carte porte le nom de qui l'offre ;
 *   · LE PARTAGE EN UN GESTE (`PartageDuLien`) : le bouton plein, puis les ronds des
 *     canaux d'un gérant — WhatsApp, SMS, e-mail, LinkedIn — et le QR code pour la
 *     rencontre en personne (OKX, Chime, Greenlight) ;
 *   · UN OBJECTIF (`ObjectifDeLAnnee`, Numo et Gusto) : le plafond de douze mois devient
 *     une année offerte, segment par segment ;
 *   · LE SUIVI (`ListeDesInvitations`, Brex et Up) : chaque invitation par sa date et
 *     son étape, sans aucun nom ;
 *   · « COMMENT ÇA MARCHE » en trois étapes, et les questions qu'on se pose.
 *
 * ⚠️ JAMAIS SUR UNE SURFACE TOURNÉE VERS UN DÉBITEUR, jamais dans un courrier. Et le
 * mois offert n'est jamais de l'argent : il se déduit d'un abonnement.
 */

// ─── Les logos des canaux ───────────────────────────────────────────────────
// Les tracés des marques (Simple Icons, CC0) : leurs couleurs disent quel service
// s'ouvre, ce ne sont ni des teintes de famille ni des couleurs de seuil.

function LogoWhatsApp({ className }: { readonly className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
			<path
				fill="#25D366"
				d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"
			/>
		</svg>
	);
}

function LogoLinkedIn({ className }: { readonly className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
			<path
				fill="#0A66C2"
				d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
			/>
		</svg>
	);
}

// ─── La carte cadeau ────────────────────────────────────────────────────────

/**
 * LA CARTE CADEAU — ce qu'on offre, au format d'une carte (1,586 : celui d'une carte de
 * paiement, que la main reconnaît). L'encre de la marque, deux disques de lumière, Plume
 * qui fait la fête, et le nom de qui offre en pied. La même carte sur la page de qui
 * recommande et sur celle de l'invité : on voit ce qu'on envoie.
 */
export function CarteCadeau({
	offertPar,
	mois,
	valeur,
	petite = false
}: {
	readonly offertPar: string;
	readonly mois: number;
	/** « Jusqu'à 119 € HT » : ce que vaut le cadeau, lu sur la grille. */
	readonly valeur?: string | null;
	readonly petite?: boolean;
}) {
	return (
		<div
			className={cn(
				'relative mx-auto aspect-[1.586] w-full overflow-hidden bg-encre-site text-left text-creme-sur-encre shadow-[0_18px_40px_-18px_oklch(0.27_0.05_266/0.55)]',
				petite ? 'max-w-64 rounded-cladd-xl p-3.5' : 'max-w-sm rounded-cladd-2xl p-cladd-2xs'
			)}
			role="img"
			aria-label={`Carte cadeau : ${mois} mois de Letikette offert par ${offertPar}`}
		>
			<span
				aria-hidden
				className="pointer-events-none absolute -top-1/3 -right-1/4 aspect-square w-3/4 rounded-full bg-white/[0.09]"
			/>
			<span
				aria-hidden
				className="pointer-events-none absolute -bottom-1/2 -left-1/4 aspect-square w-2/3 rounded-full bg-white/[0.05]"
			/>
			<div className="relative flex h-full flex-col justify-between">
				<div className="flex items-center justify-between">
					<span className="flex items-center gap-1.5">
						<IconeLetikette size={petite ? 18 : 22} aria-hidden />
						<span className="text-cladd-2xs font-semibold tracking-wide">Letikette</span>
					</span>
					<GiftIcon className="size-5 opacity-80" aria-hidden />
				</div>
				<div className="flex flex-col gap-0.5">
					<span
						className={cn(
							'leading-none font-bold tracking-tight',
							petite ? 'text-cladd-lg' : 'text-letikette-titre'
						)}
					>
						{mois} mois offert{mois > 1 ? 's' : ''}
					</span>
					{valeur ? (
						<span className="text-cladd-3xs text-creme-sur-encre-douce">{valeur}</span>
					) : null}
				</div>
				<div className="flex items-end justify-between gap-cladd-3xs">
					<span className="flex min-w-0 flex-col">
						<span className="text-cladd-3xs tracking-wider text-creme-sur-encre-douce uppercase">
							Offert par
						</span>
						<span className="truncate text-cladd-xs font-semibold">{offertPar}</span>
					</span>
					<Plume humeur="fete" taille={petite ? 32 : 44} decoratif />
				</div>
			</div>
		</div>
	);
}

// ─── Le partage ─────────────────────────────────────────────────────────────

/** Le disque des canaux : le verre des cartes, à 44 px, comme les actions rapides. */
const DISQUE = {
	variant: 'transparent',
	outline: false,
	hoverable: false,
	rounded: true,
	square: true,
	size: 'lg',
	className: 'verre-carte verre-bouton'
} as const;

interface Canal {
	readonly cle: string;
	readonly libelle: string;
	readonly nomComplet: string;
	readonly icone: ReactNode;
	readonly href?: string;
	readonly onClick?: () => void;
	/** LinkedIn s'ouvre dans un onglet ; les autres ouvrent une application. */
	readonly nouvelOnglet?: boolean;
}

function peutPartager(): boolean {
	return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * LE PARTAGE — le seul bouton plein de la page, puis les canaux en ronds, puis le lien
 * lui-même. Le bouton ouvre la feuille de partage du téléphone (iOS y met Messages,
 * WhatsApp, Mail, AirDrop) ; sans elle, au bureau, il copie le message.
 */
export function PartageDuLien({
	lien,
	message,
	liens,
	onQr
}: {
	readonly lien: string;
	readonly message: string;
	readonly liens: {
		readonly whatsapp: string;
		readonly sms: string;
		readonly email: string;
		readonly linkedin: string;
	};
	readonly onQr: () => void;
}) {
	const [copie, setCopie] = useState(false);

	function partager() {
		if (peutPartager()) {
			// Une feuille refermée sans choix rejette la promesse : ce n'est pas une panne.
			void navigator.share({ text: message }).catch(() => undefined);
			return;
		}
		void navigator.clipboard
			.writeText(message)
			.then(() => {
				setCopie(true);
				window.setTimeout(() => setCopie(false), 1600);
			})
			.catch(() => undefined);
	}

	const canaux: readonly Canal[] = [
		{
			cle: 'whatsapp',
			libelle: 'WhatsApp',
			nomComplet: 'Envoyer par WhatsApp',
			icone: <LogoWhatsApp className="size-5" />,
			href: liens.whatsapp,
			nouvelOnglet: true
		},
		{
			cle: 'sms',
			libelle: 'SMS',
			nomComplet: 'Envoyer par SMS',
			icone: <MessageSquareTextIcon />,
			href: liens.sms
		},
		{
			cle: 'email',
			libelle: 'E-mail',
			nomComplet: 'Écrire un e-mail',
			icone: <MailIcon />,
			href: liens.email
		},
		{
			cle: 'linkedin',
			libelle: 'LinkedIn',
			nomComplet: 'Partager sur LinkedIn',
			icone: <LogoLinkedIn className="size-5" />,
			href: liens.linkedin,
			nouvelOnglet: true
		},
		{
			cle: 'qr',
			libelle: 'QR code',
			nomComplet: 'Afficher le QR code',
			icone: <QrCodeIcon />,
			onClick: onQr
		}
	];

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<BoutonPrincipal pleineLargeur onClick={partager}>
				<ShareIcon />
				{copie ? 'Message copié' : 'Partager mon lien'}
			</BoutonPrincipal>
			<div className="grid grid-cols-5">
				{canaux.map((c) => (
					<div key={c.cle} className="flex flex-col items-center gap-1.5">
						{c.href === undefined ? (
							<Button {...DISQUE} aria-label={c.nomComplet} onClick={c.onClick}>
								{c.icone}
							</Button>
						) : (
							<Button
								as="a"
								href={c.href}
								{...(c.nouvelOnglet === true ? { target: '_blank', rel: 'noopener' } : {})}
								{...DISQUE}
								aria-label={c.nomComplet}
							>
								{c.icone}
							</Button>
						)}
						<span aria-hidden className="text-center text-cladd-3xs leading-tight text-cladd-fg-soft">
							{c.libelle}
						</span>
					</div>
				))}
			</div>
			<LienCopiable lien={lien} />
		</div>
	);
}

/**
 * LE LIEN, EN UNE RANGÉE : l'adresse sans son protocole, coupée par une ellipse plutôt
 * que débordante (c'est un seul mot de quarante signes), et la copie au bout.
 */
function LienCopiable({ lien }: { readonly lien: string }) {
	const [copie, setCopie] = useState(false);
	function copier() {
		void navigator.clipboard
			.writeText(lien)
			.then(() => {
				setCopie(true);
				window.setTimeout(() => setCopie(false), 1600);
			})
			.catch(() => undefined);
	}
	return (
		<div className="verre-carte flex min-h-13 items-center gap-cladd-3xs rounded-cladd-xl py-cladd-3xs pr-2 pl-cladd-2xs">
			<div className="min-w-0 flex-1">
				<p className="text-cladd-2xs text-cladd-fg-softer">Votre lien</p>
				<p className="truncate text-cladd-2xs font-semibold">
					{lien.replace(/^https?:\/\/(www\.)?/, '')}
				</p>
			</div>
			<Button
				square
				rounded
				onClick={copier}
				aria-label={copie ? 'Lien copié' : 'Copier le lien'}
				color={copie ? 'brand' : undefined}
			>
				{copie ? <CheckIcon /> : <CopyIcon />}
			</Button>
		</div>
	);
}

// ─── L'objectif de l'année ──────────────────────────────────────────────────

/**
 * L'ANNÉE OFFERTE (Numo, Gusto) : le plafond de douze mois par an, dit comme un but.
 * Un segment par mois gagné sur l'année glissante, à l'encre de la marque — l'argent,
 * jamais une couleur de seuil.
 */
export function ObjectifDeLAnnee({
	gagnes,
	maximum,
	valeurDuMois
}: {
	readonly gagnes: number;
	readonly maximum: number;
	/** Un mois de la formule, HT, en centimes ; `null` sans abonnement payant. */
	readonly valeurDuMois: number | null;
}) {
	const atteint = gagnes >= maximum;
	const annee =
		valeurDuMois === null ? null : eurosCentimesCourts(BigInt(valeurDuMois * maximum));
	const phrase = atteint
		? 'Votre année est offerte : douze mois gagnés sur les douze derniers mois.'
		: gagnes === 0
			? `Chaque confrère qui s’abonne vous offre un mois. Douze, et votre année est offerte${annee === null ? '' : `, soit ${annee} HT`}.`
			: `Encore ${maximum - gagnes} pour une année entière offerte${annee === null ? '' : `, soit ${annee} HT`}.`;
	return (
		<div className="cladd-color-brand verre-carte flex flex-col gap-2.5 rounded-cladd-xl p-cladd-2xs">
			<div className="flex items-baseline justify-between gap-cladd-3xs">
				<span className="text-cladd-xs font-semibold">Votre année offerte</span>
				<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
					{Math.min(gagnes, maximum)} / {maximum} mois
				</span>
			</div>
			<div
				className="grid gap-1"
				style={{ gridTemplateColumns: `repeat(${maximum}, minmax(0, 1fr))` }}
				role="meter"
				aria-label="Mois offerts gagnés cette année"
				aria-valuemin={0}
				aria-valuemax={maximum}
				aria-valuenow={Math.min(gagnes, maximum)}
			>
				{Array.from({ length: maximum }, (_, i) => (
					<span
						key={i}
						className={cn('h-2 rounded-full', i < gagnes ? 'bg-cladd-primary' : 'bg-cladd-fg/10')}
					/>
				))}
			</div>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{phrase}</p>
		</div>
	);
}

// ─── Les invitations ────────────────────────────────────────────────────────

export interface InvitationAffichee {
	readonly cle: string;
	/** « Inscrite il y a 2 j » */
	readonly titre: string;
	/** « Pas encore abonnée » : cinq mots au plus. */
	readonly ligne: string;
	readonly abonnee: boolean;
}

/**
 * CHAQUE INVITATION, PAR SA DATE ET SON ÉTAPE (Brex, Up) — jamais un nom : un
 * établissement recommandé reste chez lui. L'étape se lit à droite, à l'encre.
 */
export function ListeDesInvitations({
	invitations
}: {
	readonly invitations: readonly InvitationAffichee[];
}) {
	return (
		<ul className="cladd-color-brand verre-carte flex flex-col divide-y divide-cladd-fg/[0.07] rounded-cladd-xl">
			{invitations.map((inv) => (
				<li key={inv.cle} className="flex min-h-14 items-center gap-2.5 px-3.5 py-2.5">
					<span
						aria-hidden
						className={cn(
							'flex size-8 shrink-0 items-center justify-center rounded-full',
							inv.abonnee ? 'bg-cladd-primary text-white' : 'bg-cladd-fg/[0.06] text-cladd-fg-soft'
						)}
					>
						{inv.abonnee ? <BadgeCheckIcon className="size-4" /> : <UserPlusIcon className="size-4" />}
					</span>
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="truncate text-cladd-xs font-medium">{inv.titre}</span>
						<span className="truncate text-cladd-2xs text-cladd-fg-soft">{inv.ligne}</span>
					</span>
					<span
						className={cn(
							'shrink-0 rounded-full px-2.5 py-1 text-cladd-3xs font-semibold',
							inv.abonnee ? 'bg-cladd-primary/10 text-cladd-primary' : 'bg-cladd-fg/[0.06] text-cladd-fg-soft'
						)}
					>
						{inv.abonnee ? 'Abonnée' : 'Inscrite'}
					</span>
				</li>
			))}
		</ul>
	);
}

// ─── Comment ça marche ──────────────────────────────────────────────────────

/** TROIS ÉTAPES NUMÉROTÉES (Cash App, Gusto, Cleo) : ce que fait chacun, et quand. */
export function EtapesDeLaRecommandation({
	etapes
}: {
	readonly etapes: readonly { readonly titre: string; readonly detail: string }[];
}) {
	return (
		<ol className="verre-carte flex flex-col gap-cladd-2xs rounded-cladd-xl p-cladd-2xs">
			{etapes.map((e, i) => (
				<li key={e.titre} className="flex gap-2.5">
					<span
						aria-hidden
						className="flex size-7 shrink-0 items-center justify-center rounded-full bg-encre-site text-cladd-3xs font-semibold text-creme-sur-encre tabular-nums"
					>
						{i + 1}
					</span>
					<span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
						<span className="text-cladd-xs font-semibold">{e.titre}</span>
						<span className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{e.detail}</span>
					</span>
				</li>
			))}
		</ol>
	);
}

// ─── Les questions ──────────────────────────────────────────────────────────

/**
 * LES QUESTIONS QU'ON SE POSE (Swiggy, Rakuten) : chacune s'ouvre sur place. Une
 * réponse tient en deux phrases ; une page pleine pour deux phrases serait une
 * cérémonie.
 */
export function QuestionsRepliables({
	questions
}: {
	readonly questions: readonly { readonly question: string; readonly reponse: ReactNode }[];
}) {
	return (
		<div className="verre-carte flex flex-col divide-y divide-cladd-fg/[0.07] rounded-cladd-xl">
			{questions.map((q) => (
				<details key={q.question} className="group">
					<summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-cladd-3xs px-3.5 py-2.5 text-cladd-xs font-medium [&::-webkit-details-marker]:hidden">
						{q.question}
						<ChevronDownIcon
							aria-hidden
							className="size-4 shrink-0 text-cladd-fg-soft transition-transform group-open:rotate-180"
						/>
					</summary>
					<div className="px-3.5 pb-3 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						{q.reponse}
					</div>
				</details>
			))}
		</div>
	);
}

// ─── Le QR code ─────────────────────────────────────────────────────────────

/**
 * LE QR CODE DU LIEN, EN PAGE PLEINE — pour la rencontre en personne : un salon, un
 * chantier, un déjeuner entre confrères. Le confrère le scanne avec son appareil photo et
 * arrive sur l'invitation.
 */
export function FeuilleDuQr({
	ouverte,
	onFermer,
	lien,
	offertPar
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly lien: string;
	readonly offertPar: string;
}) {
	return (
		<FeuillePleinEcran ouverte={ouverte} onFermer={onFermer} titre="Votre QR code">
			<div className="flex flex-col items-center gap-cladd-xs pt-cladd-2xs text-center">
				<div className="rounded-cladd-2xl bg-white p-cladd-3xs shadow-sm">
					<QrDeVirement charge={lien} titre="QR code de votre invitation" taille={232} />
				</div>
				<div className="flex max-w-80 flex-col gap-1">
					<p className="text-cladd-sm font-semibold">Un mois offert par {offertPar}</p>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Faites-le scanner à un confrère avec l’appareil photo de son téléphone : il arrive sur
						votre invitation.
					</p>
				</div>
			</div>
		</FeuillePleinEcran>
	);
}

// ─── Les mentions ailleurs ──────────────────────────────────────────────────

/**
 * LE CADEAU RAPPELÉ À L'INVITÉ, sur l'inscription et le choix de la formule : qui le lui
 * offre, et quand il s'applique.
 */
export function MentionDuCadeau({
	offertPar,
	detail
}: {
	readonly offertPar: string;
	readonly detail: string;
}) {
	return (
		<div className="verre-carte flex items-center gap-2.5 rounded-cladd-xl px-3.5 py-2.5">
			<span
				aria-hidden
				className="flex size-9 shrink-0 items-center justify-center rounded-cladd-sm bg-encre-site text-creme-sur-encre"
			>
				<GiftIcon className="size-4" />
			</span>
			<span className="flex min-w-0 flex-col">
				<span className="text-cladd-xs font-semibold">Un mois offert par {offertPar}</span>
				<span className="text-cladd-2xs text-cladd-fg-soft">{detail}</span>
			</span>
		</div>
	);
}

/** La vignette de la carte qui mène à la page, dans le compte : le cadeau, à l'encre. */
export function VignetteCadeau() {
	return (
		<span
			aria-hidden
			className="flex size-10 shrink-0 items-center justify-center rounded-full bg-encre-site text-creme-sur-encre"
		>
			<GiftIcon className="size-5" />
		</span>
	);
}
