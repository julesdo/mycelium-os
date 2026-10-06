import { Spinner } from '@cladd-ui/react';
import { dateCourte } from './format';
import { LigneBouton, ListeAnalyses } from './navigation';

/** Le capital et le greffe tels que le BODACC les publie, prêts pour le formulaire. */
export interface ImmatriculationProposee {
	/** « 1 200,00 », dans l'écriture du champ ; `null` si aucune annonce ne le porte. */
	readonly capitalEuros: string | null;
	readonly capitalPublieLe: string | null;
	/** `true` seulement si le registre écrit « RCS » : aucun « non » ne se déduit. */
	readonly inscritAuRcs: boolean;
	readonly villeGreffe: string | null;
	readonly greffePublieLe: string | null;
	readonly releveeLe: string;
}

/**
 * La lecture du BODACC, du point de vue de l'écran.
 *
 * ⚠️ « RIEN PUBLIÉ » N'EST PAS « PANNE » : `TROUVE` avec `null` dit que le
 * registre ne publie ni capital ni greffe pour ce SIREN ; `ECHEC` dit qu'il n'a
 * pas répondu.
 */
export type EtatImmatriculation =
	| { readonly phase: 'REPOS' }
	| { readonly phase: 'EN_COURS' }
	| { readonly phase: 'TROUVE'; readonly proposee: ImmatriculationProposee | null }
	| { readonly phase: 'ECHEC'; readonly message: string };

/**
 * LE CAPITAL ET LE GREFFE, PROPOSÉS D'APRÈS LE BODACC (06/10/2026).
 *
 * La lecture part avec celle des dirigeants, au même toucher « Proposer
 * d'après le registre ». Une rangée résume ce qui a été lu ; la toucher remplit
 * le capital, l'inscription au RCS et la ville du greffe, qui restent
 * modifiables. Rien ne s'écrit avant « Enregistrer ».
 */
export function ImmatriculationProposeeAuRegistre({
	etat,
	onReprendre
}: {
	etat: EtatImmatriculation;
	onReprendre: (proposee: ImmatriculationProposee) => void;
}) {
	if (etat.phase === 'REPOS') return null;
	if (etat.phase === 'EN_COURS') {
		return (
			<p className="flex items-center gap-cladd-3xs px-1 text-cladd-2xs text-cladd-fg-soft">
				<Spinner size="xs" />
				Lecture du journal officiel des entreprises…
			</p>
		);
	}
	if (etat.phase === 'ECHEC') {
		return <p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">{etat.message}</p>;
	}
	const proposee = etat.proposee;
	if (proposee === null) {
		return (
			<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				Le journal officiel des entreprises ne publie ni capital ni greffe pour votre SIREN : ces
				champs se remplissent à la main.
			</p>
		);
	}
	const greffe =
		proposee.villeGreffe === null
			? undefined
			: `${proposee.inscritAuRcs ? 'RCS' : 'Greffe'} ${proposee.villeGreffe}`;
	const publie = proposee.capitalPublieLe ?? proposee.greffePublieLe;
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
				{`D’après le journal officiel des entreprises (BODACC)${publie === null ? '' : `, annonce du ${dateCourte(publie)}`}, relevé du ${dateCourte(proposee.releveeLe)}`}
			</p>
			<ListeAnalyses>
				<LigneBouton
					genre="contenu"
					titre={
						proposee.capitalEuros === null
							? (greffe ?? 'Immatriculation')
							: `Capital ${proposee.capitalEuros} €`
					}
					precision={proposee.capitalEuros === null ? undefined : greffe}
					onClick={() => onReprendre(proposee)}
				/>
			</ListeAnalyses>
		</div>
	);
}
