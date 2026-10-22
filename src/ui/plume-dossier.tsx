import type { ReactNode } from 'react';
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
 * ⚠️ ET IL PROPOSE, COMME DANS LE DÉMARRAGE (22/10/2026). La carte portait un champ
 * libre et quatre pastilles, pendant que les rangées de la page proposaient les
 * mêmes gestes autrement : deux cerveaux pour un dossier. Elle porte désormais les
 * RÉPONSES DU MOMENT — la proposition de Plume en bouton plein, « Il m'a répondu »
 * et « Autre chose » —, et chacune ouvre la conversation guidée du dossier
 * (`screens/dossier-guide/`). Parler à Plume avec ses mots est la dernière réponse
 * d'« Autre chose ».
 */
export function PlumeSurLeDossier({
	humeur,
	phrase,
	siRienNeBouge,
	recupere,
	total,
	reponses
}: {
	readonly humeur: HumeurPlume;
	/** Ce que fait Plume, à la première personne : « Je relance Durand jeudi à 10 h. » */
	readonly phrase: string;
	/** Ce qui arrivera si rien ne bouge, ou `null`. */
	readonly siRienNeBouge: string | null;
	readonly recupere: bigint;
	readonly total: bigint;
	/**
	 * LES RÉPONSES DU MOMENT : « Relire le courrier » sous « elle attend votre
	 * relecture ». Une phrase qui dit où aller sans y mener fait chercher.
	 */
	readonly reponses?: ReactNode;
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

			{reponses === undefined ? null : <div className="flex flex-col gap-2">{reponses}</div>}
		</section>
	);
}
