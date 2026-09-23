import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * LES PICTOGRAMMES DU DOMAINE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI ILS SONT DESSINÉS, ET PAS PRIS DANS `lucide-react`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La bibliothèque contient une horloge, un document et un bouclier. Elle ne
 * contient pas « une créance qui s'éteint à une date », « des intérêts qui
 * courent par périodes » ni « un décompte qu'on peut refaire à la main ». Poser
 * une horloge générique devant la prescription, c'est dire « temps » là où le
 * produit dit « un jour précis, propre à ce secteur-là ».
 *
 * Le verdict du terrain sur la page était « il manque de l'âme ». Une âme, sur
 * une page de logiciel, ce n'est pas un ornement de plus : c'est le moment où
 * l'on voit que quelqu'un a regardé CE problème-là et pas un autre. Douze
 * icônes empruntées à un jeu universel disent exactement l'inverse.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA GRAMMAIRE DU JEU, ET ELLE EST ÉTROITE EXPRÈS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   · UNE GRILLE DE 32, avec quatre unités de marge. Tout vit entre 4 et 28.
 *   · DU TRAIT, JAMAIS D'APLAT. `stroke="currentColor"`, aucun `fill` sauf
 *     pour les deux points qui marquent une date — et c'est précisément parce
 *     qu'ils sont les seuls pleins qu'ils se voient.
 *   · UNE ÉPAISSEUR DE 1,5, bouts et jonctions ronds. C'est celle du veilleur
 *     (`veilleur-avatar.tsx`, 1,25 sur un cercle de 26 px) ramenée au corps de
 *     ces pictogrammes-ci : les deux familles doivent se lire comme une seule
 *     main.
 *   · DEUX À QUATRE TRACÉS PAR SIGNE. Au-delà, ça devient une illustration, et
 *     une illustration à vingt-quatre pixels devient une tache.
 *
 * ⚠️ AUCUNE COULEUR. Ils prennent `currentColor`, donc la craie de la page.
 * Les trois couleurs de seuil ne disent qu'une chose dans ce produit — au-dessus
 * du seuil, tout près, en dessous — et un pictogramme décoratif qui les
 * emprunterait volerait leur sens aux vraies jauges, à deux écrans d'ici.
 *
 * ⚠️ ET ILS SONT `aria-hidden`. Chacun est posé à côté d'un titre qui dit déjà
 * la même chose en toutes lettres ; les annoncer une seconde fois à un lecteur
 * d'écran ajouterait du bruit, pas de l'information.
 */

function Pictogramme({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<svg
			viewBox="0 0 32 32"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
			className={cn('size-8 shrink-0', className)}
		>
			{children}
		</svg>
	);
}

/**
 * LA DATE LIMITE — un calendrier dont un seul jour est plein.
 *
 * Le point est le seul aplat de tout le jeu, et il est là pour ça : c'est LE
 * jour, celui après lequel la créance ne vaut plus rien. Un calendrier sans lui
 * dirait « une date » ; avec lui, il dit « cette date-là ».
 */
export function PictoEcheance({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<rect x="4" y="7" width="24" height="21" rx="2.5" />
			<path d="M4 13h24M11 4v6M21 4v6" />
			<circle cx="22" cy="22" r="2.2" fill="currentColor" stroke="none" />
		</Pictogramme>
	);
}

/**
 * LES INTÉRÊTS QUI COURENT — un escalier, et pas une courbe.
 *
 * ⚠️ DES MARCHES, PARCE QUE LE CALCUL EST PAR PÉRIODES. Une courbe lisse dirait
 * « ça monte » ; l'escalier dit « ça monte PAR PALIERS », ce qui est exactement
 * ce que fait `decompte.ts` — un segment par période, découpé au jour où le taux
 * change et au jour où un règlement tombe. Le signe porte donc la seule chose
 * que le produit a de particulier sur ce point.
 */
export function PictoInterets({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<path d="M4 27V5" />
			<path d="M4 27h24" />
			<path d="M7 23h5v-5h5v-5h5v-5h4" />
		</Pictogramme>
	);
}

/**
 * LA FACTURE — une étiquette au coin coupé.
 *
 * Le coin coupé n'est pas le pli d'usage des icônes de document : c'est la forme
 * de la marque elle-même (voir `logo.tsx` et `favicon.svg`), une étiquette dont
 * l'angle est rogné. Le jeu de pictogrammes et le logotype partagent donc une
 * silhouette, ce qui est la façon la moins bavarde de signer une page.
 */
export function PictoFacture({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<path d="M7 4h12l6 6v18H7z" />
			<path d="M19 4v6h6" />
			<path d="M11 17h10M11 22h6" />
		</Pictogramme>
	);
}

/**
 * LA PRESCRIPTION — un anneau qui ne se referme pas.
 *
 * ⚠️ LA BRÈCHE EST LE SUJET. Un cercle complet dirait « un cycle » ; celui-ci
 * s'arrête avant de boucler, et le point marque l'endroit où il s'arrête. C'est
 * un droit qui se ferme, pas une horloge qui tourne.
 */
export function PictoPrescription({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<path d="M16 4a12 12 0 1 1-8.49 3.51" />
			<circle cx="7.5" cy="7.5" r="2.2" fill="currentColor" stroke="none" />
			<path d="M16 10v6l4 3" />
		</Pictogramme>
	);
}

/**
 * LA LECTURE — ce qui entre dans le logiciel.
 *
 * La flèche descend DANS le bac : c'est un dépôt, pas un téléchargement. Les
 * trois lignes au-dessus sont l'écriture comptable, et elles sont inégales
 * parce qu'un FEC l'est.
 */
export function PictoLecture({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<path d="M16 4v13m0 0 4-4m-4 4-4-4" />
			<path d="M5 20v5a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-5" />
			<path d="M5 20h6l1.5 3h7L21 20h6" />
		</Pictogramme>
	);
}

/**
 * LE REGISTRE — un tampon.
 *
 * C'est le signe du BODACC et des procédures collectives : une publication
 * officielle, relevée chaque nuit. Un tampon dit « acte public » en un tracé, là
 * où un œil ou une loupe diraient « surveillance », qui est le mot d'à côté.
 */
export function PictoRegistre({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<path d="M11 4h10v7l3 5v4H8v-4l3-5z" />
			<path d="M6 25h20" />
			<path d="M16 11v5" />
		</Pictogramme>
	);
}

/**
 * LE DÉCOMPTE DÉCOMPOSÉ — trois barres et leur total.
 *
 * ⚠️ LES TROIS BARRES SONT DANS L'ORDRE ET DANS LA PROPORTION DU PRODUIT :
 * le principal, long ; les intérêts, moyens ; l'indemnité, courte. Le filet
 * dessous est le trait de somme. C'est `CompositionDue` réduit à neuf traits,
 * et n'importe quel dirigeant qui a vu l'écran reconnaît la figure.
 */
export function PictoDecompte({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<path d="M5 8h22M5 14h13M5 20h7" />
			<path d="M5 25h22" />
		</Pictogramme>
	);
}

/**
 * CE QU'IL FAUT TRANCHER — une voie qui se sépare en deux.
 *
 * Aucune des deux branches n'est marquée comme la bonne, et c'est le sujet : le
 * logiciel pose la question, il ne répond pas à la place. Un signe qui
 * désignerait une issue trahirait la troisième ligne rouge.
 */
export function PictoQuestion({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<path d="M16 28v-8" />
			<path d="M16 20 8 12M16 20l8-8" />
			<circle cx="7" cy="10" r="2.4" />
			<circle cx="25" cy="10" r="2.4" />
		</Pictogramme>
	);
}

/**
 * LA REMISE AU CONSEIL — le dossier qui sort.
 *
 * La flèche quitte le cadre : c'est un passage de main. Le produit prépare et
 * transmet ; il n'agit pas à la place de l'avocat ni du commissaire de justice,
 * et il ne relance jamais le débiteur. Le signe le dit avant le texte.
 */
export function PictoRemise({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<path d="M17 4H7v24h10" />
			<path d="M13 16h15m0 0-5-5m5 5-5 5" />
		</Pictogramme>
	);
}

/**
 * LE RAPPROCHEMENT — deux mouvements qui se rejoignent.
 *
 * Un règlement d'un côté, une facture de l'autre, et le filet où ils se
 * touchent. C'est ce qui empêche de relancer un client qui a déjà payé, la pire
 * erreur d'un logiciel de recouvrement.
 */
export function PictoRapprochement({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<path d="M16 5v22" />
			<path d="M4 11h8m0 0-3-3m3 3-3 3" />
			<path d="M28 21h-8m0 0 3-3m-3 3 3 3" />
		</Pictogramme>
	);
}

/**
 * CE QUE LE PRODUIT NE FERA PAS — le signe barré.
 *
 * ⚠️ UN TRAIT BARRÉ, ET NI UNE CROIX NI UN PANNEAU D'INTERDICTION. Une croix
 * se lit « échec », un panneau rond se lit « défense d'entrer » : les deux
 * placent le lecteur du côté de celui qu'on empêche. Les trois limites ne sont
 * pas des refus qu'on lui oppose, ce sont des choses que le produit s'interdit
 * à lui-même. Un signe rayé dit « ce n'est pas au programme » sans accuser
 * personne.
 */
export function PictoInterdit({ className }: { className?: string }) {
	return (
		<Pictogramme className={className}>
			<circle cx="16" cy="16" r="11" strokeDasharray="3 3" />
			<path d="M9.5 22.5 22.5 9.5" />
		</Pictogramme>
	);
}
