import { ArrowUpIcon } from 'lucide-react';
import { eurosCentimes } from './format';
import { NOM_DU_PILOTE, Plume, type HumeurPlume } from './plume';

/**
 * PLUME, EN TÊTE D'UN DOSSIER — ce qu'il fait, ce qui arrive si rien ne bouge, et
 * ce qui est déjà rentré (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ « ILS N'ONT PAS L'IMPRESSION D'AVANCER SUR LEUR DOSSIER »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le retour des utilisateurs que le fondateur a relayé. La page disait un
 * état (« Relancé ») et une barre de quatre étapes : un constat, pas un suivi.
 * Les applications qui rassurent sur un délai (Vestiaire, Alan, Mercury, relevés
 * sur Mobbin) disent trois choses : ce qui se passe maintenant, la DATE de la
 * suite, et ce qui arrivera si rien ne bouge — « si le vendeur n'expédie pas avant
 * dimanche, nous annulons ». Plume le dit ici, à la première personne, avec ce qui
 * est déjà récupéré.
 *
 * ⚠️ LA BARRE « RÉCUPÉRÉ » EST D'ENCRE : ni vert ni ambre. Ce n'est pas un seuil,
 * c'est une avancée.
 *
 * ⚠️ ET L'ON PEUT LUI PARLER D'ICI. Le champ ouvre la conversation du dossier ;
 * une question prête la remplit, elle ne l'envoie pas.
 */
export function PlumeSurLeDossier({
	humeur,
	phrase,
	siRienNeBouge,
	recupere,
	total,
	suggestions,
	onDemander
}: {
	readonly humeur: HumeurPlume;
	/** Ce que fait Plume, à la première personne : « Je relance Durand jeudi à 10 h. » */
	readonly phrase: string;
	/** Ce qui arrivera si rien ne bouge, ou `null`. */
	readonly siRienNeBouge: string | null;
	readonly recupere: bigint;
	readonly total: bigint;
	readonly suggestions: readonly string[];
	readonly onDemander: (question?: string) => void;
}) {
	const part = total > 0n ? Number((recupere * 1000n) / total) / 10 : 0;
	return (
		<section
			aria-label={`Ce que fait ${NOM_DU_PILOTE} sur ce dossier`}
			className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs"
		>
			<div className="flex items-start gap-3">
				<Plume humeur={humeur} taille={44} />
				<div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
					<p className="text-cladd-xs leading-snug font-semibold">{phrase}</p>
					{siRienNeBouge === null ? null : (
						<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">{siRienNeBouge}</p>
					)}
				</div>
			</div>

			{total <= 0n ? null : (
				<div className="flex flex-col gap-1">
					<div
						className="h-1.5 overflow-hidden rounded-full bg-cladd-outline"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(part)}
						aria-label="Part récupérée"
					>
						<span
							className="block h-full rounded-full bg-cladd-fg transition-[width] duration-700"
							style={{ width: `${Math.min(100, part)}%` }}
						/>
					</div>
					<p className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
						{recupere <= 0n
							? `Rien de récupéré pour l’instant, sur ${eurosCentimes(total)}`
							: `Récupéré : ${eurosCentimes(recupere)} sur ${eurosCentimes(total)}`}
					</p>
				</div>
			)}

			<button
				type="button"
				onClick={() => onDemander()}
				className="verre-dense flex min-h-11 items-center gap-2 rounded-full py-1 pr-1 pl-3.5 text-left text-cladd-2xs text-cladd-fg-soft transition active:scale-[0.99]"
			>
				<span className="min-w-0 flex-1 truncate">
					Demander à {NOM_DU_PILOTE}, ou lui dire quoi faire…
				</span>
				<span className="verre flex size-9 shrink-0 items-center justify-center rounded-full text-cladd-fg">
					<ArrowUpIcon className="size-4" strokeWidth={2.4} aria-hidden />
				</span>
			</button>
			{suggestions.length === 0 ? null : (
				<div className="-mx-cladd-2xs flex gap-2 overflow-x-auto px-cladd-2xs [scrollbar-width:none]">
					{suggestions.map((suggestion) => (
						<button
							key={suggestion}
							type="button"
							onClick={() => onDemander(suggestion)}
							className="verre min-h-9 shrink-0 rounded-full px-3 text-cladd-2xs whitespace-nowrap text-cladd-fg transition active:scale-[0.97]"
						>
							{suggestion}
						</button>
					))}
				</div>
			)}
		</section>
	);
}
