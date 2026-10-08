import { EnTeteDeGroupe } from './en-tete-groupe';
import { LigneDeReleve, ListeDeReleve } from './carte-rangee';
import { dateCourte, dateRelative } from './format';

/**
 * LA SUITE D'UN DOSSIER, AU FUTUR — ce que le pilote fera, et quand.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA FRISE CONTINUE APRÈS AUJOURD'HUI (08/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page d'un dossier racontait ce qui s'était passé, et s'arrêtait au présent :
 * pour savoir quand revenir, le gérant se posait un rappel. Cash App, Vestiaire
 * Collective et Fiverr disent la suite, datée : « nous revenons vers vous d'ici
 * le 21 août ». C'est ce qui fait dire « c'est géré ».
 *
 * ⚠️ UNE PROJECTION, ET ELLE LE DIT. Chaque date suppose que rien n'arrive
 * d'ici là ; un paiement arrête tout. La phrase sous la liste le dit, pour qu'une
 * date prévue ne se lise jamais comme une promesse.
 *
 * ⚠️ CE QUE LE GÉRANT DÉCIDE SE DISTINGUE DE CE QUI SE FAIT SEUL. La remise à un
 * conseil ne part jamais d'elle-même : sa ligne dit « Vous déciderez ».
 */

export interface EtapeAVenir {
	readonly cle: string;
	readonly nom: string;
	/** Le jour prévu, en `AAAA-MM-JJ`. */
	readonly le: string;
	readonly automatique: boolean;
}

/** « dans 6 j · 14 oct. 2026 » : la distance pour lire, la date pour noter. */
function quand(le: string, aujourdHui: string): string {
	if (le <= aujourdHui) return 'aujourd’hui';
	const distance = dateRelative(le, aujourdHui);
	const date = dateCourte(le);
	return distance === date ? date : `${distance} · ${date}`;
}

export function SuiteDuPlan({
	etapes,
	aujourdHui,
	envoiAutomatique
}: {
	readonly etapes: readonly EtapeAVenir[];
	readonly aujourdHui: string;
	/**
	 * Le gérant a laissé le pilote relancer seul. Sans cela, le plan dit ce qui
	 * est PRÉVU, jamais que le pilote l'enverra : ce serait promettre un envoi
	 * qui n'aura pas lieu.
	 */
	readonly envoiAutomatique: boolean;
}) {
	if (etapes.length === 0) return null;
	return (
		<section className="flex flex-col gap-cladd-3xs">
			<EnTeteDeGroupe libelle="La suite" />
			<ListeDeReleve>
				{etapes.map((etape) => (
					<LigneDeReleve
						key={etape.cle}
						titre={etape.nom}
						ligne={
							!etape.automatique
								? 'Vous déciderez'
								: envoiAutomatique
									? 'Le pilote l’envoie'
									: 'Prévu au plan'
						}
						date={quand(etape.le, aujourdHui)}
					/>
				))}
			</ListeDeReleve>
			<p className="px-1 text-cladd-2xs leading-snug text-cladd-fg-softer">
				Si rien n’arrive d’ici là. Un paiement arrête tout.
			</p>
		</section>
	);
}
