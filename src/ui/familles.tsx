import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import { cn } from './cn';
import {
	PictoDecompte,
	PictoEcheance,
	PictoFacture,
	PictoQuestion,
	PictoRegistre,
	PictoRemise
} from './pictogrammes';

/**
 * LES SIX FAMILLES DU PRODUIT, ET LEUR TEINTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QUE CE FICHIER CORRIGE, ET IL ÉTAIT MESURÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Relevé au navigateur le 30/09/2026 : l'écran « Dossiers » portait SIX
 * pictogrammes en tout, celui des clients en portait DEUX. Chaque rangée de
 * liste était un bloc de texte gris — trois gris, mesurés à oklch L = 0,255,
 * 0,395 et 0,475 — sur une carte dont l'écart de luminance avec la page était
 * de 0,078, soit un rapport de 1,09 pour 1. La carte était littéralement
 * invisible.
 *
 * Le verdict du terrain, mot pour mot : « on est encore très loin d'une
 * expérience à la Shop ou Revolut, ça manque d'intuitivité à mort partout, je
 * ne sais pas ce qui cloche mais ça cloche ».
 *
 * Ce qui clochait : le produit se LIT, quand Revolut et Shop se BALAIENT. Chez
 * eux, chaque rangée porte un disque coloré, et c'est LUI qu'on cherche des
 * yeux — pas le mot. On ne lit « Interest » qu'après avoir vu le rond orange.
 *
 * ⚠️ ET LE DÉPÔT AVAIT DÉJÀ TOUT. `pictogrammes.tsx` contient onze signes du
 * domaine, dessinés à la main sur une grille de 32, créés explicitement parce
 * que « il manque de l'âme » — et posés sur AUCUNE rangée de liste.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA TEINTE DIT DE QUOI IL S'AGIT, JAMAIS SI C'EST GRAVE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la seule règle, et elle est la charnière qui rend la couleur possible
 * sans défaire la doctrine du produit.
 *
 * Le vert, l'ambre et le rouge (`--color-seuil-*`, plus les accents `green`,
 * `lime`, `yellow`, `red` et l'`orange` du bandeau d'alerte) ne disent qu'UNE
 * chose ici : au-dessus du seuil, tout près, en dessous. Ils restent interdits
 * à une famille. Les six teintes ci-dessous sont donc prises dans ce qui reste
 * — `brand`, `purple`, `cyan`, `blue`, `pink`, `neutral` — et aucune d'elles
 * n'a jamais signifié l'urgence.
 *
 * Conséquence tenue par `familles.test.ts` : un gérant peut apprendre que le
 * violet est « une date » et que l'ambre est « tout près du seuil » sans que
 * les deux se contredisent jamais. Mélanger les deux systèmes volerait leur
 * sens aux vraies jauges, à deux écrans d'ici.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ SIX, ET PAS ONZE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une teinte par écran, ou par composant, ne s'apprend pas : elle se subit. Six
 * familles se retiennent parce qu'elles nomment ce que le produit manipule
 * vraiment — de l'argent, du temps, des papiers, ce qui part, ce qu'on vous
 * demande, et la machine. Toute rangée du produit tombe dans l'une des six ; si
 * une septième devient nécessaire, c'est le signe qu'il faut relire le domaine,
 * pas allonger cette liste.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN CLIENT N'EST PAS UNE FAMILLE : IL PORTE SON AVATAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est l'entité la plus listée du produit — un écran entier lui est consacré —
 * et elle n'entre dans aucune des six. La tentation était d'ouvrir une septième
 * teinte. C'eût été une faute : deux clients de la même liste se peindraient de
 * la même couleur, donc la teinte ne les distinguerait PAS, et une vignette qui
 * ne distingue rien est un ornement.
 *
 * Un client porte donc `Avatar` — ses initiales, ou son image. C'est ce que
 * font Revolut et Shop pour une personne ou un marchand, et c'est le seul signe
 * qui change d'une rangée à l'autre : on retrouve « Ateliers Martin » à son
 * « AM », pas à un carré bleu identique aux quatre autres.
 *
 * C'est aussi pourquoi le compte des teintes s'arrête à six, et pourquoi il n'y
 * a plus d'accent disponible hors seuils : ce n'était pas une contrainte du
 * kit, c'était la bonne réponse.
 */

export type FamilleRangee = 'ARGENT' | 'TEMPS' | 'PAPIERS' | 'ENVOI' | 'QUESTION' | 'MACHINE';

interface Famille {
	/** Un accent de Cladd, jamais une couleur de seuil. */
	readonly teinte: 'brand' | 'purple' | 'cyan' | 'blue' | 'pink' | 'neutral';
	readonly Picto: (props: { className?: string }) => ReactNode;
	/** Ce que la famille désigne, pour le lecteur d'écran et pour la revue. */
	readonly quoi: string;
}

export const FAMILLES: Readonly<Record<FamilleRangee, Famille>> = {
	/** Ce qui se chiffre : décomptes, montants dus, ce qui n'a jamais été calculé. */
	ARGENT: { teinte: 'brand', Picto: PictoDecompte, quoi: 'un montant' },
	/** Ce qui court : échéances, dates limites pour agir, délais de procédure. */
	TEMPS: { teinte: 'purple', Picto: PictoEcheance, quoi: 'une date' },
	/** Ce qui se dépose et se classe : factures, pièces, imports. */
	PAPIERS: { teinte: 'cyan', Picto: PictoFacture, quoi: 'un document' },
	/** Ce qui part vers un tiers : courriers, relances, liens de paiement. */
	ENVOI: { teinte: 'blue', Picto: PictoRemise, quoi: 'un envoi' },
	/** Ce que le gérant seul peut dire : propositions à trancher, conditions. */
	QUESTION: { teinte: 'pink', Picto: PictoQuestion, quoi: 'une réponse attendue' },
	/** Ce que le logiciel fait tout seul : veille, registres, lecture, limites. */
	MACHINE: { teinte: 'neutral', Picto: PictoRegistre, quoi: 'le travail du logiciel' }
};

/**
 * LA VIGNETTE D'UNE RANGÉE — un carré arrondi teinté, et le signe dedans.
 *
 * ⚠️ 40 PX, ET C'EST LA MÊME MESURE QUE LE DOIGT. Elle n'est pas une cible —
 * c'est la rangée entière qui l'est — mais une vignette plus petite cesse de
 * porter le regard : à 24 px, le signe redevient un détail du texte au lieu
 * d'en être l'ancre. Revolut, Wise et Apple Wallet tiennent tous les trois
 * entre 40 et 44.
 *
 * ⚠️ LE SIGNE RESTE MONOCHROME. Il prend `text-cladd-primary`, donc l'accent de
 * sa famille, sur un fond de surface de la même famille : deux valeurs d'une
 * seule teinte, jamais un aplat vif. C'est ce qui distingue une vignette de
 * famille d'une pastille de seuil, qui est pleine et qui crie.
 */
export function VignetteRangee({
	famille,
	className
}: {
	readonly famille: FamilleRangee;
	readonly className?: string;
}) {
	const { teinte, Picto } = FAMILLES[famille];
	return (
		<Surface
			variant="solid"
			outline={false}
			color={teinte}
			className={cn(`cladd-color-${teinte} size-10 shrink-0 rounded-cladd-2xs`, className)}
			contentClassName="flex size-full items-center justify-center"
		>
			<Picto className="size-6 text-cladd-primary" />
		</Surface>
	);
}

/**
 * LA MÊME VIGNETTE, SANS FAMILLE — pour ce qui n'est pas un objet du domaine.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI LES RÉGLAGES N'ONT PAS DE TEINTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran du compte porte dix rangées — votre profil, vos règles de calcul, vos
 * connexions, votre équipe, l'affichage… Aucune n'est de l'argent, du temps, du
 * papier, un envoi, une question ou la machine : ce sont des RÉGLAGES, et leur
 * coller une famille au chausse-pied ferait exactement ce que ce fichier
 * interdit — une couleur qui ne veut rien dire, c'est-à-dire un ornement. Trois
 * ajouts de ce genre et « la teinte dit de quoi il s'agit » ne tient plus.
 *
 * iOS colore pourtant ses réglages, et la couleur n'y signifie rien : elle sert
 * de repère de position, et ça marche. On ne le copie pas ici, parce que ce
 * produit a déjà un système où la couleur PORTE une information — les seuils —
 * et qu'un second système décoratif à côté rendrait le premier illisible.
 *
 * Ce qui manquait vraiment n'était pas la couleur, c'était la FORME : dix
 * rangées de texte gris sans un signe. Un glyphe distinct par réglage suffit à
 * donner à l'œil son point d'accroche, et c'est le registre sobre de Wise —
 * monochrome, et parfaitement balayable.
 */
export function VignetteIcone({
	icone,
	className
}: {
	readonly icone: ReactNode;
	readonly className?: string;
}) {
	return (
		<Surface
			variant="solid"
			outline={false}
			className={cn('size-10 shrink-0 rounded-cladd-2xs', className)}
			contentClassName="flex size-full items-center justify-center text-cladd-fg-soft [&>svg]:size-5"
		>
			{icone}
		</Surface>
	);
}
