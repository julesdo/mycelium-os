import { Spinner, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, CheckIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LE PILOTE, EN DIRECT — ce que l'agent fait, sous les yeux du gérant.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TRAVAIL SE MONTRE (08/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « rendre le travail de l'IA visible. Si l'automatisation est
 * trop instantanée, l'utilisateur n'a pas confiance et va vouloir tout
 * revérifier. » Un dossier qui apparaît d'un coup se vérifie ; un pilote qu'on
 * a vu lire les factures, repérer les retards et ouvrir le dossier de Durand se
 * croit. Chaque étape se coche au moment où elle se fait (`recouvrement/pilote.ts`,
 * `avancerTravail`) : ce qu'on voit est ce qui se passe.
 *
 * ⚠️ AU REPOS, IL DIT QU'IL VEILLE, ET DEPUIS QUAND. Un pilote muet ressemble à
 * un pilote arrêté. « Relu à 14 h 32 » est la preuve qu'il tourne ; son absence
 * (« pas encore relu ») se dit aussi, au lieu d'un faux « tout va bien ».
 */

export interface TravailPiloteAffiche {
	readonly id: string;
	/** Ce que fait le pilote, au présent : « Relit votre dépôt ». */
	readonly titre: string;
	readonly etapes: readonly { readonly libelle: string; readonly faite: boolean }[];
	readonly etat: 'EN_ATTENTE' | 'EN_COURS' | 'FAIT' | 'ECHEC';
	/** Ce que le travail a produit, une fois fini. */
	readonly bilan: string | null;
	readonly termineLe: number | null;
}

export interface PiloteAffiche {
	/** La dernière veille terminée, ou `null` : il ne s'est jamais réveillé ici. */
	readonly derniereVeille: number | null;
	/** Les plus récents d'abord. */
	readonly travaux: readonly TravailPiloteAffiche[];
}

/** L'heure du gérant, pas celle du serveur : « 14 h 32 ». */
const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function PiloteEnDirect({ pilote }: { readonly pilote: PiloteAffiche }) {
	const enCours = pilote.travaux.find((t) => t.etat === 'EN_COURS') ?? null;
	const enAttente = pilote.travaux.filter((t) => t.etat === 'EN_ATTENTE').length;
	const dernier = pilote.travaux.find((t) => t.etat === 'FAIT' || t.etat === 'ECHEC') ?? null;

	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs px-3.5 py-cladd-3xs"
		>
			<div className="flex items-center justify-between gap-2">
				<span className="flex items-center gap-2 text-cladd-xs font-semibold">
					<span
						aria-hidden
						className={cn(
							'relative inline-flex size-2 shrink-0 rounded-full bg-cladd-fg',
							enCours !== null && 'pouls'
						)}
					/>
					Le pilote
				</span>
				<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
					{enCours !== null
						? 'au travail'
						: pilote.derniereVeille === null
							? 'pas encore relu'
							: `relu à ${HEURE.format(new Date(pilote.derniereVeille))}`}
				</span>
			</div>

			{enCours !== null ? (
				<TravailEnDirect travail={enCours} enAttente={enAttente} />
			) : dernier !== null ? (
				<DernierTravail travail={dernier} />
			) : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					Il surveille vos échéances et vos dates limites pour agir, et se remet au travail dès
					qu’une facture ou un virement arrive.
				</p>
			)}
		</Surface>
	);
}

/**
 * UN TRAVAIL QUI TOURNE : ses étapes, cochées, en cours, à venir.
 *
 * ⚠️ L'ÉTAPE EN COURS EST ANNONCÉE AU LECTEUR D'ÉCRAN (`aria-live`) : c'est la
 * seule ligne qui change, et elle change d'elle-même.
 */
function TravailEnDirect({
	travail,
	enAttente
}: {
	readonly travail: TravailPiloteAffiche;
	readonly enAttente: number;
}) {
	const rang = travail.etapes.findIndex((e) => !e.faite);
	const courante = rang < 0 ? null : travail.etapes[rang]!;
	return (
		<div className="flex flex-col gap-1.5">
			<p className="text-cladd-xs font-medium">{travail.titre}</p>
			<ol className="flex flex-col gap-1">
				{travail.etapes.map((etape, i) => {
					const etat = etape.faite ? 'faite' : i === rang ? 'courante' : 'avenir';
					return (
						<li
							key={`${i}-${etape.libelle}`}
							className={cn(
								'pilote-etape flex items-center gap-2 text-cladd-2xs leading-snug',
								etat === 'faite' && 'text-cladd-fg-soft',
								etat === 'courante' && 'text-cladd-fg',
								etat === 'avenir' && 'text-cladd-fg-softest'
							)}
						>
							<span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
								{etat === 'faite' ? (
									<CheckIcon className="pilote-coche size-3.5" strokeWidth={2.5} />
								) : etat === 'courante' ? (
									<Spinner size="xs" />
								) : (
									<span className="size-1.5 rounded-full bg-current opacity-50" />
								)}
							</span>
							<span className="min-w-0">{etape.libelle}</span>
						</li>
					);
				})}
			</ol>
			<p className="sr-only" aria-live="polite">
				{courante === null ? travail.titre : courante.libelle}
			</p>
			{enAttente === 0 ? null : (
				<p className="text-cladd-2xs text-cladd-fg-softer">
					Puis {enAttente} autre{enAttente > 1 ? 's' : ''} tâche{enAttente > 1 ? 's' : ''}.
				</p>
			)}
		</div>
	);
}

/** Ce que le pilote vient de faire, en une ligne : le titre, puis ce que ça a donné. */
function DernierTravail({ travail }: { readonly travail: TravailPiloteAffiche }) {
	const echec = travail.etat === 'ECHEC';
	return (
		<div className="flex items-start gap-2 text-cladd-2xs leading-snug">
			<span aria-hidden className="flex size-4 shrink-0 items-center justify-center pt-0.5">
				{echec ? (
					<AlertTriangleIcon className="size-3.5" />
				) : (
					<CheckIcon className="size-3.5" strokeWidth={2.5} />
				)}
			</span>
			<span className="min-w-0">
				<span className="font-medium">{travail.titre}</span>
				<span className="text-cladd-fg-soft">
					{' · '}
					{echec
						? 'interrompu. Il reprendra à la prochaine veille.'
						: (travail.bilan ?? 'terminé.')}
					{travail.termineLe === null ? null : ` ${HEURE.format(new Date(travail.termineLe))}`}
				</span>
			</span>
		</div>
	);
}
