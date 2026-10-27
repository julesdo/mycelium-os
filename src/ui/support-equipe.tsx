import type { KeyboardEvent, ReactNode } from 'react';
import { Button, Segmented, SegmentedButton, Select } from '@cladd-ui/react';
import { ArrowUpIcon, LockIcon } from 'lucide-react';
import { Avatar } from './avatar';
import { ZoneDeTexte } from './zone-de-texte';
import { BoutonSecondaire, BoutonTexte } from './bouton';
import { cn } from './cn';
import { AvatarPlume, NOM_DU_PILOTE } from './plume';

/**
 * LA BOÎTE DU SUPPORT, CÔTÉ ÉQUIPE (16/10/2026, sur Intercom Inbox, Plain, Front et
 * Help Scout) : un fil à quatre voix — le gérant, Plume et ses sources, l'équipe, la
 * note interne — et un compositeur qui sait répondre ou noter.
 *
 * ⚠️ LA NOTE NE SE CONFOND JAMAIS AVEC UNE RÉPONSE : fond creusé, bord pointillé, et
 * la phrase « Le gérant ne verra pas cette note ». Sans teinte de seuil : le jaune des
 * notes ailleurs est ici une couleur réservée.
 */

export type VoixDuFil = 'GERANT' | 'NON_VERIFIE' | 'PLUME' | 'EQUIPE' | 'NOTE' | 'EVENEMENT';

export function MessageVuParLEquipe({
	voix,
	nom,
	texte,
	heure,
	parEmail = false,
	sources = [],
	retirePar,
	onRetirer
}: {
	readonly voix: VoixDuFil;
	readonly nom: string;
	readonly texte: string;
	readonly heure: string;
	readonly parEmail?: boolean;
	readonly sources?: readonly string[];
	/** Le contenu a été retiré : par qui. */
	readonly retirePar?: string;
	readonly onRetirer?: () => void;
}) {
	if (voix === 'EVENEMENT') {
		return (
			<p className="text-center text-cladd-3xs text-cladd-fg-softer">
				{texte} · {heure}
			</p>
		);
	}
	const legende = (
		<p
			className={cn(
				'flex flex-wrap items-center gap-x-2 text-cladd-3xs text-cladd-fg-softer tabular-nums',
				voix === 'EQUIPE' ? 'justify-end' : 'justify-start'
			)}
		>
			<span>
				{voix === 'PLUME'
					? `${NOM_DU_PILOTE} · automatique`
					: voix === 'EQUIPE'
						? `${nom} · équipe`
						: voix === 'NOTE'
							? `Note interne · ${nom}`
							: voix === 'NON_VERIFIE'
								? `Expéditeur non vérifié · ${nom}`
								: `${nom}${parEmail ? ' · par e-mail' : ''}`}{' '}
				· {heure}
			</span>
			{onRetirer === undefined || retirePar !== undefined ? null : (
				<BoutonTexte
					onClick={onRetirer}
					className="h-auto min-h-0 px-0 text-cladd-3xs text-cladd-fg-soft"
				>
					Retirer ce contenu
				</BoutonTexte>
			)}
		</p>
	);
	if (retirePar !== undefined) {
		return (
			<div className="flex flex-col gap-1">
				<p className="w-fit rounded-full border border-dashed border-cladd-outline px-3 py-1.5 text-cladd-2xs text-cladd-fg-softer italic">
					Contenu retiré par {retirePar}
				</p>
				{legende}
			</div>
		);
	}
	if (voix === 'NOTE') {
		return (
			<div className="flex flex-col gap-1">
				<div className="rounded-cladd-lg border border-dashed border-cladd-outline bg-cladd-surface-minus px-3.5 py-2.5">
					<p className="mb-1 flex items-center gap-1.5 text-cladd-3xs font-medium text-cladd-fg-soft">
						<LockIcon aria-hidden className="size-3" />
						Le gérant ne verra pas cette note
					</p>
					<p className="text-cladd-xs leading-relaxed whitespace-pre-wrap text-cladd-fg">{texte}</p>
				</div>
				{legende}
			</div>
		);
	}
	if (voix === 'EQUIPE') {
		return (
			<div className="flex flex-col items-end gap-1">
				<p className="verre-dense max-w-[85%] rounded-[1.25rem] rounded-br-md px-3.5 py-2 text-cladd-xs leading-relaxed whitespace-pre-wrap text-cladd-fg">
					{texte}
				</p>
				{legende}
			</div>
		);
	}
	return (
		<div className="flex items-start gap-2.5">
			{voix === 'PLUME' ? (
				<AvatarPlume humeur="repos" taille={30} className="mt-0.5" />
			) : (
				<Avatar nom={nom} className="mt-0.5" />
			)}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p
					className={cn(
						'w-fit max-w-[85%] rounded-[1.25rem] rounded-bl-md px-3.5 py-2 text-cladd-xs leading-relaxed whitespace-pre-wrap text-cladd-fg',
						voix === 'NON_VERIFIE' ? 'border border-dashed border-cladd-outline' : 'verre-carte'
					)}
				>
					{texte}
				</p>
				{sources.length === 0 ? null : (
					<p className="text-cladd-3xs text-cladd-fg-soft">Sources : {sources.join(', ')}</p>
				)}
				{legende}
			</div>
		</div>
	);
}

/** « Ce que Plume a compris », au point du passage : la question, sa réponse, pourquoi il passe. */
export function CeQuePlumeACompris({
	pourquoi,
	question,
	reponse,
	depuis
}: {
	readonly pourquoi: string;
	readonly question: string;
	readonly reponse?: string;
	readonly depuis?: string;
}) {
	return (
		<section
			aria-label="Ce que Plume a compris"
			className="verre-carte flex flex-col gap-1.5 rounded-cladd-xl px-3.5 py-3"
		>
			<p className="flex items-center gap-2 text-cladd-xs font-semibold">
				<AvatarPlume humeur="repos" taille={22} />
				Ce que {NOM_DU_PILOTE} a compris
			</p>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg">« {question} »</p>
			{reponse === undefined ? null : (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">A répondu : {reponse}</p>
			)}
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				Passe la main : {pourquoi}
				{depuis === undefined ? '' : ` · depuis ${depuis}`}
			</p>
		</section>
	);
}

export type ModeDuComposeur = 'REPONSE' | 'NOTE';

/**
 * LE COMPOSITEUR DE L'ÉQUIPE. Au téléphone, collé en bas ; au bureau, sous le fil.
 * Répondre ou noter, une réponse enregistrée à insérer, et le seul bouton plein.
 */
export function ComposeurDuSupport({
	mode,
	onMode,
	valeur,
	onChange,
	onEnvoyer,
	reponses,
	onInserer,
	enCours = false,
	avertissement,
	brouillon,
	prenomManquant
}: {
	readonly mode: ModeDuComposeur;
	readonly onMode: (mode: ModeDuComposeur) => void;
	readonly valeur: string;
	readonly onChange: (valeur: string) => void;
	/** `terminer` : « Envoyer et terminer ». `confirme` : l'avertissement a été lu. */
	readonly onEnvoyer: (options: { terminer: boolean; confirme: boolean }) => void;
	readonly reponses: readonly { readonly id: string; readonly titre: string }[];
	readonly onInserer: (id: string) => void;
	readonly enCours?: boolean;
	/** Un conseil ou une voie de justice dans la réponse : à confirmer. */
	readonly avertissement?: string;
	/** « Brouillon de Plume » (absent pour un expéditeur non vérifié). */
	readonly brouillon?: { readonly onDemander: () => void; readonly enCours: boolean };
	/** Le prénom affiché n'est pas posé : il faut le poser avant de répondre. */
	readonly prenomManquant?: ReactNode;
}) {
	const vide = valeur.trim() === '';
	function touche(evenement: KeyboardEvent<HTMLElement>) {
		if (
			mode === 'NOTE' &&
			evenement.key === 'Enter' &&
			!evenement.shiftKey &&
			!evenement.nativeEvent.isComposing
		) {
			evenement.preventDefault();
			if (!vide && !enCours) onEnvoyer({ terminer: false, confirme: false });
		}
	}
	return (
		<div className="fixed inset-x-0 bottom-0 z-30 px-cladd-2xs pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:static lg:z-auto lg:p-0">
			<div
				className={cn(
					'flex flex-col gap-2 rounded-cladd-xl px-3 py-2.5',
					mode === 'NOTE'
						? 'border border-dashed border-cladd-outline bg-cladd-surface-minus'
						: 'verre-carte'
				)}
			>
				<div className="flex flex-wrap items-center gap-2">
					<Segmented activeColor="brand" activeVariant="solid-fill">
						<SegmentedButton active={mode === 'REPONSE'} onClick={() => onMode('REPONSE')}>
							Répondre
						</SegmentedButton>
						<SegmentedButton active={mode === 'NOTE'} onClick={() => onMode('NOTE')}>
							Note
						</SegmentedButton>
					</Segmented>
					{mode === 'REPONSE' && reponses.length > 0 ? (
						<Select
							size="md"
							rounded
							title="Insérer une réponse enregistrée"
							options={reponses.map((r) => r.id)}
							value=""
							keyboardHints={false}
							renderOption={({ value }) => reponses.find((r) => r.id === value)?.titre ?? ''}
							onChange={(id) => onInserer(id as string)}
						>
							Réponse enregistrée
						</Select>
					) : null}
					{mode === 'REPONSE' && brouillon !== undefined ? (
						<BoutonTexte
							onClick={brouillon.onDemander}
							disabled={brouillon.enCours}
							className="ml-auto"
						>
							{brouillon.enCours ? 'Plume écrit…' : 'Brouillon de Plume'}
						</BoutonTexte>
					) : null}
				</div>
				{mode === 'REPONSE' && prenomManquant !== undefined ? prenomManquant : null}
				<ZoneDeTexte
					nom={mode === 'NOTE' ? 'Une note pour l’équipe seule' : 'Votre réponse au gérant'}
					size="md"
					value={valeur}
					onChange={(v) => onChange(v)}
					onKeyDown={touche}
					placeholder={mode === 'NOTE' ? 'Une note pour l’équipe seule' : 'Votre réponse au gérant'}
					className="min-w-0 bg-transparent"
				/>
				{avertissement === undefined ? null : (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg">{avertissement}</p>
				)}
				<div className="flex flex-wrap items-center justify-end gap-2">
					{mode === 'REPONSE' ? (
						<BoutonSecondaire
							disabled={vide || enCours}
							onClick={() => onEnvoyer({ terminer: true, confirme: avertissement !== undefined })}
						>
							Envoyer et terminer
						</BoutonSecondaire>
					) : null}
					<Button
						size="md"
						rounded
						variant={vide ? 'transparent' : 'solid-fill'}
						color={vide ? 'neutral' : 'brand'}
						outline={false}
						disabled={vide || enCours}
						onClick={() => onEnvoyer({ terminer: false, confirme: avertissement !== undefined })}
					>
						<ArrowUpIcon aria-hidden className="size-4" />
						{mode === 'NOTE'
							? 'Noter'
							: avertissement === undefined
								? 'Envoyer'
								: 'Envoyer quand même'}
					</Button>
				</div>
			</div>
		</div>
	);
}
