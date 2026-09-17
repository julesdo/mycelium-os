import { List, ListButton, ListSeparator, Surface } from '@cladd-ui/react';
import { ChevronRightIcon, CircleAlertIcon } from 'lucide-react';
import type { CeQuiPresse, SectionCompte } from './presse';

/**
 * CE QUI PRESSE — LE SEUL BLOC QUI PASSE DEVANT LES SECTIONS REPLIÉES.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL EST LA CONTREPARTIE DU REPLI, PAS UNE DÉCORATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Replier sept sections rend la page lisible d'un coup d'œil et crée un risque
 * exact : un abonnement retombé sur `none` — dépôt, surveillance et décompte
 * fermés — tiendrait derrière une rangée qu'on n'ouvre pas. Ce bandeau est ce
 * qui rend le repli acceptable : ce qui presse est DEVANT, avec son fait et sa
 * conséquence, et le doigt tombe sur la section qui le porte.
 *
 * ⚠️ IL NE S'AFFICHE PAS QUAND IL N'A RIEN À DIRE. Un cadran « 0 chose à
 * regarder » est du décor, et le chiffre ne dit plus rien le jour où il compte
 * (règle d'écran n° 4). Sans urgence et sans lecture en cours, ce composant
 * rend `null`.
 *
 * ⚠️ MAIS IL DIT CE QU'IL NE SAIT PAS ENCORE. Tant qu'une lecture court, le
 * bandeau ne peut pas affirmer que rien ne presse : il le déclare, en une
 * ligne, au lieu de laisser une page silencieuse passer pour une page saine.
 *
 * ⚠️ EN BLEU D'ENCRE, JAMAIS EN ROUGE NI EN AMBRE. Le vert, le rouge et l'ambre
 * ne disent qu'une chose dans ce produit — au-dessus du seuil, tout près, en
 * dessous — et une invitation qui expire n'est pas un verdict de seuil.
 */
export function BandeauCeQuiPresse({
	presse,
	onOuvrir
}: {
	readonly presse: CeQuiPresse;
	readonly onOuvrir: (cle: SectionCompte) => void;
}) {
	const { urgences, lecturesEnCours } = presse;
	if (urgences.length === 0 && lecturesEnCours === 0) return null;

	return (
		<Surface
			as="section"
			variant="transparent"
			outline={false}
			/*
			  ⚠️ L'ACCENT SE POSE ICI, ET C'EST LA SEULE FAÇON D'OBTENIR LE BLEU.
			  `text-cladd-primary` ne nomme pas une couleur mais L'ACCENT COURANT, et
			  hors de tout contexte `cladd-color-*` celui-ci vaut du neutre : mesuré
			  au navigateur, `--color-cladd-primary` valait `oklch(from #fff 0.1 0 h)`,
			  donc un noir. Posé sur la carte, `color="brand"` le fait retomber sur
			  `oklch(from #1d3fa0 …)`, le bleu d'encre de la marque.

			  Rien d'autre dans cette carte ne lit l'accent, donc rien d'autre ne
			  change de teinte.
			*/
			color="brand"
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-3xs"
		>
			<h2 className="px-cladd-3xs text-cladd-2xs font-semibold tracking-wide text-cladd-fg-soft">
				Ce qui presse
			</h2>

			{urgences.length > 0 ? (
				<List className="p-0">
					{urgences.map((urgence, rang) => (
						/*
						  La clé est le fait lui-même : deux urgences de la même section
						  existent (une invitation en attente ET une adresse non vérifiée),
						  donc la clé ne peut pas être la section.
						*/
						<div key={urgence.fait}>
							{rang > 0 ? <ListSeparator /> : null}
							<ListButton
								size="md"
								/*
								  ⚠️ LE `!` N'EST PAS UNE COQUETTERIE. `ListButton` peint ses
								  icônes par un sélecteur descendant, qui l'emporte sur une
								  classe posée sur le `<svg>` : mesuré au navigateur, la marque
								  ressortait en `oklch(0.1 0 23.8)`, c'est-à-dire presque noire,
								  alors que le code annonçait le bleu d'encre. Le kit prévient du
								  piège pour la TAILLE ; il vaut aussi pour la couleur.
								*/
								icon={<CircleAlertIcon className="text-cladd-primary!" />}
								footer={urgence.consequence}
								after={<ChevronRightIcon />}
								onClick={() => onOuvrir(urgence.cle)}
							>
								{urgence.fait}
							</ListButton>
						</div>
					))}
				</List>
			) : null}

			{lecturesEnCours > 0 ? (
				<p
					role="status"
					className="px-cladd-3xs pb-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softer"
				>
					{lecturesEnCours === 1
						? 'Une section se lit encore : ce qu’elle porte n’est pas encore connu.'
						: `${lecturesEnCours} sections se lisent encore : ce qu’elles portent n’est pas encore connu.`}
				</p>
			) : null}
		</Surface>
	);
}
