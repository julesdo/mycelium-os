import type { ReactNode } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import { ArrowUpRightIcon, BellOffIcon, Clock3Icon, SendIcon } from 'lucide-react';
import { Avatar } from './avatar';
import { BoutonSecondaire } from './bouton';
import { CarteBouton, CarteLien, ListeDeCartes } from './carte-rangee';
import { cn } from './cn';
import { VignetteIcone } from './familles';
import { AvatarPlume, NOM_DU_PILOTE } from './plume';

/**
 * LE SERVICE CLIENT, CÔTÉ GÉRANT (16/10/2026, `docs/superpowers/specs/2026-10-16-service-client.md`).
 *
 * Relevé chez Intercom (Fin), Plain, Monzo, Starling, Alan et Linktree : qui parle se
 * lit sous chaque message, le passage à l'équipe est une carte déjà envoyée, l'humain
 * qui arrive s'annonce, et le délai annoncé tient en UN chiffre.
 *
 * ⚠️ AUCUNE SURFACE NE MENT SUR QUI PARLE (spec § 2.6). Les légendes viennent de
 * l'auteur enregistré par le serveur : « Plume · automatique », « Camille · équipe
 * Letikette », « Vous · par e-mail ». Aucun visage n'est inventé : sans photo posée
 * par le membre, ses initiales.
 */

export type AuteurAffiche = 'GERANT' | 'PLUME' | 'EQUIPE';

/** Qui parle, sous chaque message. */
export function LegendeDuMessage({
	auteur,
	nom,
	parEmail = false,
	heure
}: {
	readonly auteur: AuteurAffiche;
	readonly nom?: string;
	readonly parEmail?: boolean;
	readonly heure: string;
}) {
	const qui =
		auteur === 'PLUME'
			? `${NOM_DU_PILOTE} · automatique`
			: auteur === 'EQUIPE'
				? `${nom ?? 'L’équipe'} · équipe Letikette`
				: `Vous${parEmail ? ' · par e-mail' : ''}`;
	return (
		<p
			className={cn(
				'text-cladd-3xs text-cladd-fg-softer tabular-nums',
				auteur === 'GERANT' ? 'text-right' : 'text-left'
			)}
		>
			{qui} · {heure}
		</p>
	);
}

/** Le message d'un membre de l'équipe : son visage (ou ses initiales), sa bulle, à gauche. */
export function MessageDeLEquipe({
	nom,
	photo,
	texte,
	legende
}: {
	readonly nom: string;
	readonly photo: string | null;
	readonly texte: string;
	readonly legende: ReactNode;
}) {
	return (
		<div className="flex items-start gap-2.5">
			<Avatar nom={nom} image={photo === null ? null : { url: photo }} className="mt-0.5" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="verre-carte w-fit max-w-[85%] rounded-[1.25rem] rounded-bl-md px-3.5 py-2 text-cladd-xs leading-relaxed whitespace-pre-wrap text-cladd-fg">
					{texte}
				</p>
				{legende}
			</div>
		</div>
	);
}

/** Un contenu retiré laisse sa trace, sans son texte (spec § 2.7). */
export function MessageRetire({ legende }: { readonly legende: ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<p className="w-fit rounded-full border border-dashed border-cladd-outline px-3 py-1.5 text-cladd-2xs text-cladd-fg-softer italic">
				Contenu retiré
			</p>
			{legende}
		</div>
	);
}

/**
 * UNE LIGNE DU FIL — « Camille, de l'équipe Letikette, a rejoint la conversation ».
 * Annoncée au lecteur d'écran quand elle dit l'arrivée de quelqu'un.
 */
export function LigneDuFil({
	texte,
	heure,
	annoncee = false
}: {
	readonly texte: string;
	readonly heure: string;
	readonly annoncee?: boolean;
}) {
	return (
		<p
			{...(annoncee ? { role: 'status', 'aria-live': 'polite' as const } : {})}
			className="text-center text-cladd-3xs leading-relaxed text-balance text-cladd-fg-softer"
		>
			{texte} · {heure}
		</p>
	);
}

/** La phrase de masquage, sous le message du gérant. */
export function NoteDeMasquage({ texte }: { readonly texte: string }) {
	return <p className="text-right text-cladd-3xs leading-relaxed text-cladd-fg-soft">{texte}</p>;
}

/**
 * TRANSMIS À L'ÉQUIPE — une carte déjà envoyée, jamais un geste à confirmer.
 *
 * La question en une phrase, pourquoi Plume passe la main, d'où l'on vient, puis le
 * délai en UN chiffre. Passé, elle dit « en retard » et la nouvelle estimation.
 */
export function CarteTransmise({
	heure,
	question,
	pourquoi,
	depuis,
	attendue,
	enRetard
}: {
	readonly heure: string;
	readonly question: string;
	readonly pourquoi: string;
	readonly depuis?: string;
	/** « Réponse attendue aujourd'hui avant 17 h ». */
	readonly attendue: string;
	/** « Réponse en retard : nous visons demain avant 11 h ». */
	readonly enRetard?: string;
}) {
	return (
		<section
			aria-label="Transmis à l’équipe"
			className="verre-carte flex flex-col gap-2 rounded-cladd-xl px-3.5 py-3"
		>
			<p className="flex items-center gap-2 text-cladd-xs font-semibold">
				<SendIcon aria-hidden className="size-4 shrink-0 text-cladd-fg-soft" />
				Transmis à l’équipe à {heure}
			</p>
			<dl className="flex flex-col gap-1 text-cladd-2xs leading-relaxed">
				<div>
					<dt className="sr-only">Votre question</dt>
					<dd className="text-cladd-fg">« {question} »</dd>
				</div>
				<div>
					<dt className="sr-only">Pourquoi</dt>
					<dd className="text-cladd-fg-soft">{pourquoi}</dd>
				</div>
				{depuis === undefined ? null : (
					<div>
						<dt className="sr-only">D’où</dt>
						<dd className="text-cladd-fg-soft">Depuis : {depuis}</dd>
					</div>
				)}
			</dl>
			<p className="flex items-start gap-2 text-cladd-2xs leading-relaxed text-cladd-fg">
				<Clock3Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-cladd-fg-soft" />
				<span>
					{enRetard ?? attendue}, ici et par e-mail si vous ne l’avez pas lue. Vous pouvez fermer.
				</span>
			</p>
		</section>
	);
}

/** « Ça répond à votre question ? », sous la dernière réponse de Plume seulement. */
export function QuestionDeSatisfaction({
	onOui,
	onNon,
	enCours = false
}: {
	readonly onOui: () => void;
	readonly onNon: () => void;
	readonly enCours?: boolean;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<p className="text-cladd-2xs text-cladd-fg-soft">Ça répond à votre question ?</p>
			<BoutonSecondaire onClick={onOui} disabled={enCours}>
				Oui, merci
			</BoutonSecondaire>
			<BoutonSecondaire onClick={onNon} disabled={enCours}>
				Pas vraiment
			</BoutonSecondaire>
		</div>
	);
}

/** Un écran où mène une réponse de Plume (Alan) : une carte, qui y va. */
export function CarteVersUnEcran({
	libelle,
	vers,
	recherche
}: {
	readonly libelle: string;
	readonly vers: NonNullable<LinkProps['to']>;
	readonly recherche?: LinkProps['search'];
}) {
	return (
		<CarteLien
			vers={vers}
			{...(recherche === undefined ? {} : { recherche })}
			titre={libelle}
			ligne="Ouvrir l’écran"
			icone={<VignetteIcone icone={<ArrowUpRightIcon aria-hidden />} />}
		/>
	);
}

export interface RelanceARetenir {
	readonly id: string;
	readonly client: string;
	/** « dans 40 min », « demain à 9 h ». */
	readonly quand: string;
}

/**
 * « ARRÊTEZ L'ENVOI » — deux cartes, tout de suite, sans le modèle (spec § 3.2).
 *
 * Retenir une relance qui part bientôt, ou couper toutes les relances automatiques.
 * Couper est réservé à un administrateur : un membre lit qui peut le faire.
 */
export function CartesArreterLesEnvois({
	relances,
	onRetenir,
	onCouper,
	administrateurs,
	relancesCoupees
}: {
	readonly relances: readonly RelanceARetenir[];
	readonly onRetenir: (id: string) => void;
	/** Absent : ce compte n'est pas administrateur. */
	readonly onCouper?: () => void;
	readonly administrateurs: readonly string[];
	readonly relancesCoupees: boolean;
}) {
	return (
		<ListeDeCartes>
			{relances.map((relance) => (
				<CarteBouton
					key={relance.id}
					onClick={() => onRetenir(relance.id)}
					chevron={false}
					titre={`Retenir la relance à ${relance.client}`}
					ligne={`Part ${relance.quand}`}
					famille="ENVOI"
					icone={<VignetteIcone icone={<Clock3Icon aria-hidden />} />}
				/>
			))}
			{relancesCoupees ? (
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft">Les relances automatiques sont coupées.</p>
			) : onCouper === undefined ? (
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Couper les relances automatiques revient à un administrateur
					{administrateurs.length === 0 ? '' : ` : ${administrateurs.join(', ')}`}.
				</p>
			) : (
				<CarteBouton
					onClick={onCouper}
					chevron={false}
					titre="Couper les relances automatiques"
					ligne="Rien ne partira plus seul, ce qui est programmé compris"
					icone={<VignetteIcone icone={<BellOffIcon aria-hidden />} />}
				/>
			)}
		</ListeDeCartes>
	);
}

export interface MembreDuSupport {
	readonly prenom: string;
	readonly photo: string | null;
}

/** L'équipe, ses horaires et le délai : des visages vrais, ou des initiales. */
export function EquipeDuSupport({
	membres,
	horaires,
	attendue,
	absence,
	adresse
}: {
	readonly membres: readonly MembreDuSupport[];
	/** « En semaine, de 9 h à 18 h ». */
	readonly horaires: string;
	/** « Réponse en général avant 15 h ». */
	readonly attendue: string;
	readonly absence?: string;
	readonly adresse?: string;
}) {
	return (
		<section aria-label="L’équipe" className="verre-carte flex flex-col gap-2.5 rounded-cladd-xl px-3.5 py-3">
			<div className="flex items-center gap-2.5">
				{membres.length === 0 ? (
					<AvatarPlume humeur="repos" taille={36} />
				) : (
					<div className="flex -space-x-2">
						{membres.slice(0, 4).map((membre) => (
							<Avatar
								key={membre.prenom}
								nom={membre.prenom}
								image={membre.photo === null ? null : { url: membre.photo }}
							/>
						))}
					</div>
				)}
				<div className="min-w-0">
					<p className="truncate text-cladd-xs font-semibold">
						{membres.length === 0
							? 'L’équipe Letikette'
							: `${membres.map((m) => m.prenom).join(', ')}, de l’équipe Letikette`}
					</p>
					<p className="text-cladd-2xs text-cladd-fg-soft">{horaires}</p>
				</div>
			</div>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg">{absence ?? attendue}</p>
			{adresse === undefined ? null : (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{adresse}</p>
			)}
		</section>
	);
}

/** Après une conversation terminée par l'équipe, une fois, dans le fil. */
export function AvisApresLEquipe({
	onRepondre,
	enCours = false
}: {
	readonly onRepondre: (utile: boolean) => void;
	readonly enCours?: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-2 text-center">
			<p className="text-cladd-2xs text-cladd-fg-soft">Vous avez eu la réponse qu’il vous fallait ?</p>
			<div className="flex gap-2">
				<BoutonSecondaire onClick={() => onRepondre(true)} disabled={enCours}>
					Oui
				</BoutonSecondaire>
				<BoutonSecondaire onClick={() => onRepondre(false)} disabled={enCours}>
					Non
				</BoutonSecondaire>
			</div>
		</div>
	);
}

/**
 * LA PRÉSENTATION DU FIL VIDE — les deux interlocuteurs, et qui lit, avant d'écrire
 * (spec § 2.2). Elle se dit une fois, à cet endroit seul.
 */
export function PresentationDuFil({ plumeOuvert }: { readonly plumeOuvert: boolean }) {
	return (
		<div className="flex flex-col items-center gap-2 pt-cladd-2xs text-center">
			<AvatarPlume humeur="ecoute" taille={56} />
			<p className="text-cladd-sm font-semibold text-balance">
				{plumeOuvert ? `${NOM_DU_PILOTE} répond d’abord, l’équipe prend le relais` : 'L’équipe Letikette vous répond'}
			</p>
			<p className="max-w-sm text-cladd-2xs leading-relaxed text-balance text-cladd-fg-soft">
				{plumeOuvert
					? `Ici, ${NOM_DU_PILOTE} connaît Letikette et votre compte ; vos dossiers, c’est dans votre espace. `
					: ''}
				L’équipe Letikette peut lire cette conversation : n’y collez ni mot de passe ni données de vos
				clients.
			</p>
		</div>
	);
}
