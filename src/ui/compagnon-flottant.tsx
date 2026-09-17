import { Button } from '@cladd-ui/react';
import { MessageCircleIcon } from 'lucide-react';
import { cn } from './cn';
import { PastilleDeRappel } from './barre-du-bas';

/**
 * LE BOUTON FLOTTANT DU COMPAGNON.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OÙ IL SE POSE, ET POURQUOI EXACTEMENT LÀ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Au-dessus de la barre du bas, côté droit, dans le `safe-area`. Les trois
 * contraintes se tiennent ensemble :
 *
 *   · AU-DESSUS DE LA BARRE, jamais dedans. Une navigation dit où l'on est ; le
 *     compagnon fait quelque chose. Les mêler ferait un cinquième onglet, et le
 *     produit aurait cinq destinations dont une n'en est pas une.
 *   · SANS RECOUVRIR DE CIBLE. Il est calé douze pixels au-dessus du bord haut
 *     de la pilule : aucun onglet ne passe dessous, à aucune largeur.
 *   · DANS LE `safe-area`. Comme la barre, il reporte `mb-safe` — sinon le trait
 *     d'accueil d'iOS le mange en même temps qu'elle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE HALO : SIX SECONDES, FAIBLE AMPLITUDE, ET IL S'ARRÊTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le réglage du veilleur, repris à l'identique et pour la même raison :
 * ce qui s'agite en permanence devient du décor en trois jours, et ne dit plus
 * rien le jour où ça compte. On veut qu'on le sente vivant en le regardant, pas
 * qu'on le voie bouger du coin de l'œil toute la journée.
 *
 * Sous `prefers-reduced-motion: reduce`, il ne bouge plus DU TOUT — il ne se
 * fige pas à mi-course, il retombe sur son état de repos et la lueur reste. Voir
 * `.halo-compagnon` dans `app.css`.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL, NULLE PART. Le vert, le rouge et l'ambre
 * (`--color-seuil-*`) ne signifient qu'une chose dans ce produit — au-dessus du
 * seuil, tout près, en dessous — et aucun élément décoratif ne les porte. Le
 * halo prend l'accent de marque (`--color-veille`), qui porte déjà sa valeur
 * pour chacun des deux thèmes.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL NE DISPARAÎT JAMAIS, ET NE DEVIENT JAMAIS UN BOUTON MORT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Quand le plafond de coût a mordu, la capsule RESTE, dit en une phrase ce qui
 * se passe, et l'ouvrir montre le refus complet en quatre parties. « On ne coupe
 * jamais l'expérience » est une décision écrite du produit : un bouton qui
 * s'efface laisse croire à une panne, et un bouton grisé est un mur avec un
 * délai.
 */

export type EtatCompagnon =
	/** Rien à signaler : la lueur respire, et c'est tout. */
	| { readonly genre: 'REPOS' }
	/** Il a quelque chose à dire : la lueur s'anime un peu plus, et le compte se pose. */
	| { readonly genre: 'A_DIRE'; readonly compte: number }
	/**
	 * Le plafond a mordu. `phrase` dit ce qui se passe en UNE ligne ; le refus
	 * complet s'ouvre au toucher, il ne tient pas ici.
	 */
	| { readonly genre: 'INDISPONIBLE'; readonly phrase: string };

export function CompagnonFlottant({
	portee,
	etat,
	onOuvrir
}: {
	/**
	 * CE À QUOI LE FIL EST BORNÉ, en une ligne, tel que l'écran le dit.
	 *
	 * ⚠️ IL S'AFFICHE, IL NE SE DEVINE PAS. Un compagnon dont on ignore la portée
	 * se lit comme un assistant qui voit tout le dépôt : on lui poserait une
	 * question sur un autre dossier que celui qu'il lit, et on prendrait sa
	 * réponse pour une réponse sur celui-là.
	 */
	readonly portee: string;
	readonly etat: EtatCompagnon;
	readonly onOuvrir: () => void;
}) {
	const indisponible = etat.genre === 'INDISPONIBLE';

	return (
		/*
		  `mb-safe` et `bottom-24` : 96 px au-dessus du bord bas.

		  ⚠️ LA VALEUR EST MESURÉE, PAS DÉDUITE. Le calcul de tête donnait 76 px de
		  barre — 48 d'onglet, 12 de rembourrage de pilule, 16 de marge — et le
		  navigateur en rend 82 : l'onglet fait 54 px et non 48, parce que son
		  contenu (icône de 28, écart, libellé) dépasse le plancher tactile. La
		  capsule était donc calée six pixels au-dessus de la pilule au lieu de
		  douze. C'est exactement le genre d'écart que seule la mesure attrape, et
		  qui se serait vu comme deux objets collés.

		  96 px laissent quatorze pixels entre le bas de la capsule (716) et le haut
		  de la pilule (730), sur une fenêtre de 812.

		  `z-40`, comme la barre : au-dessus du contenu, et SOUS la feuille de
		  preuve (`z-50`), qui recouvre l'écran entier sous 1024 px.

		  `items-end` : la légende s'aligne sur le bord droit de la capsule, pas sur
		  son centre — sinon elle déborde vers l'extérieur de l'écran dès qu'elle
		  est plus large que la capsule.
		*/
		<div className="mb-safe fixed right-cladd-3xs bottom-24 z-40 flex flex-col items-end gap-1.5">
			{/*
			  LA LIGNE QUE L'ÉCRAN DIT.

			  ⚠️ `pointer-events-none` : elle est posée au-dessus du contenu qui
			  défile, et elle n'est pas une cible. Sans ça, elle volerait les
			  touchers destinés à la carte qui passe dessous.

			  ⚠️ `aria-hidden` : son texte est déjà porté par l'`aria-label` de la
			  capsule, en une seule phrase. Lue deux fois, elle ferait entendre la
			  portée avant de savoir de quel bouton on parle.
			*/}
			<span
				aria-hidden
				className="verre pointer-events-none max-w-56 rounded-full px-2.5 py-1 text-right text-cladd-3xs leading-snug text-cladd-fg-soft"
			>
				{indisponible ? etat.phrase : portee}
			</span>

			<span className="relative inline-flex">
				{/*
				  LE HALO. Il vit DERRIÈRE la capsule (`z-index: -1` dans un contexte
				  d'empilement isolé par le `relative` de ce conteneur), il déborde de
				  douze pixels de tous les côtés, et il n'intercepte rien.

				  ⚠️ PAS DE HALO QUAND C'EST INDISPONIBLE. Une lueur qui respire est une
				  invitation ; l'adresser à une capsule qui va répondre « pas ce
				  mois-ci » ferait exactement le contraire de ce qu'elle promet.
				*/}
				{indisponible ? null : (
					<span
						aria-hidden
						className={cn('halo-compagnon', etat.genre === 'A_DIRE' && 'halo-compagnon-vif')}
					/>
				)}

				{/*
				  `size="md"` — 48 px sur l'échelle décalée du produit, le plancher
				  tactile. On ne force pas `lg` : la documentation du kit l'interdit
				  (« Don't default to `lg` everywhere »), et l'échelle a justement été
				  décalée dans `tokens.css` pour que `md` tombe sur 48.

				  `hoverable={false}` et `verre-bouton` : la surcouche de survol du kit
				  peint un voile FONCÉ par-dessus le contenu, ce qui détruit la
				  translucidité — voir `.verre-bouton` dans `app.css`. Le survol est
				  donc piloté là-bas, et il ÉCLAIRCIT.
				*/}
				<Button
					size="md"
					rounded
					variant="transparent"
					outline={false}
					hoverable={false}
					className="verre-dense verre-bouton"
					aria-label={
						indisponible ? etat.phrase : `Demander au logiciel. ${portee}`
					}
					onClick={onOuvrir}
				>
					<MessageCircleIcon aria-hidden />
					{/*
					  ⚠️ « DEMANDER », ET AUCUN AUTRE VERBE. C'est le seul verbe de la
					  conversation, et il parle AU LOGICIEL : on ne relance jamais le
					  débiteur au nom du client (première ligne rouge). Un « Envoyer » ici
					  laisserait croire le contraire à deux mètres de distance.
					*/}
					<span className="text-cladd-2xs font-medium">
						{indisponible ? 'Indisponible' : 'Demander'}
					</span>
				</Button>

				{/* Le compte de ce qu'il a à dire, à cheval sur le bord de la capsule.
				    `PastilleDeRappel` en tient la forme à un seul endroit — c'est la même
				    pastille que celle des onglets, et elle ne s'affiche qu'au-dessus de
				    zéro. */}
				{etat.genre === 'A_DIRE' ? (
					<span className="absolute -top-1 -right-1">
						<PastilleDeRappel compte={etat.compte} />
					</span>
				) : null}
			</span>
		</div>
	);
}
