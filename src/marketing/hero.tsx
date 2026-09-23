import { Link } from '@tanstack/react-router';
import { ArrowDownIcon, ArrowRightIcon } from 'lucide-react';
import {
	AtmosphereNuit,
	BoutonAffiche,
	BrouillardAvant,
	LienAffiche,
	LogoLetikette,
	LueurProduit,
	Nebuleuse,
	Telephone
} from '../ui';
import { eurosCentimesCourts } from '../ui/format';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { ARTICLES_DU_SOCLE } from './articles';
import { ApercuTelephone } from './apercu-telephone';

/**
 * L'entrée.
 *
 * CE QU'ELLE DOIT FAIRE EN SEPT SECONDES : dire à un dirigeant qu'une partie de
 * ses impayés est en train de devenir irrécouvrable sans que personne ne le
 * signale, et lui montrer à quoi ressemble le logiciel qui l'en sort.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA COMPOSITION EST CELLE DE legend.xyz, ET PAS UN HÉROS EN DEUX COLONNES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deux colonnes — le texte à gauche, l'objet à droite — est la disposition la
 * plus répandue du logiciel B2B, et c'est son défaut : on l'a vue mille fois,
 * donc on ne la regarde plus. Elle a aussi un problème géométrique, mesuré :
 * dans une colonne de sept cents pixels, l'accroche plafonne à quatre-vingts
 * pixels sous peine de déborder, alors qu'elle en tient cent-vingt-huit en
 * pleine largeur.
 *
 * La composition retenue est celle de la référence, et elle tient en quatre
 * gestes :
 *
 *   1. UN RAIL TECHNIQUE EN HAUT, en petites capitales, qui cite le cadre —
 *      chez eux des coordonnées géographiques, chez nous les articles du code
 *      de commerce. C'est ce qui donne le ton « instrument de mesure » avant
 *      même la première phrase.
 *   2. L'ACCROCHE AU CENTRE, en pleine largeur, suivie d'une LIGNE D'ACCENT qui
 *      porte UN CHIFFRE. Chez eux « Borrow from -10.92% » ; ici les quarante
 *      euros dus par facture. C'est le nombre qui arrête l'œil, pas le titre.
 *   3. TROIS COLONNES SÉPARÉES PAR DES FILETS TIRETÉS : le commentaire à
 *      gauche, l'objet au centre, ce qu'il mesure à droite. Les filets ne
 *      décorent pas — ils disent que la page est un plan, pas une affiche.
 *   4. L'OBJET ÉMERGE DU BROUILLARD. C'est le geste entier, et il ne tient qu'à
 *      un ordre d'empilement : une couche de brume passe DEVANT le bas du
 *      téléphone. Voir `BrouillardAvant`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE NOIR, ET LE CIEL QUI EST CELUI DE L'APPLICATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'aperçu du produit est un écran CLAIR, et il l'était déjà posé sur un lavis
 * d'azur pâle : deux clartés voisines, donc un objet qui ne se détache de rien
 * et se lit « autocollant ». Sur du noir, le même aperçu devient la SEULE
 * SOURCE DE LUMIÈRE de l'écran, et c'est lui qu'on regarde.
 *
 * Le ciel — nébuleuse et champ d'étoiles — est peint dans `--color-aurore-*`,
 * c'est-à-dire le dégradé qui vit derrière le montant dû sur l'écran d'accueil
 * du produit. Le premier écran du site et le premier écran du logiciel
 * partagent donc leur atmosphère.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `overflow-clip` ET SURTOUT PAS `overflow-hidden`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `overflow: hidden` CRÉE un conteneur de défilement ; `overflow: clip` n'en
 * crée pas. Tant que cet en-tête portait `hidden`, toutes les chronologies de
 * défilement des couches qu'il contient s'accrochaient à LUI — un conteneur qui
 * n'est jamais défilé — au lieu du document. Vérifié au navigateur le 23
 * septembre 2026 : avec `hidden`, la source de la chronologie est `HEADER` et
 * la transformée vaut `none` à toutes les positions ; avec `clip`, la source
 * est `HTML` et la transformée vaut −178 px à huit cents pixels défilés.
 *
 * La panne était invisible, et c'est le pire : l'état de repos d'une couche
 * décorative étant écrit dans `from`, la couche restait peinte exactement là où
 * elle devait l'être. Rien ne cassait à l'œil ; l'effet n'existait pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE MOUVEMENT DU PREMIER ÉCRAN EST UNE ANIMATION DE TEMPS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trois éléments portaient `.apparait`, qui s'anime sur `view()`. Or `view()`
 * mesure l'entrée de l'élément DANS la fenêtre : un élément déjà entièrement
 * visible au chargement est à cent pour cent de sa plage d'entrée, donc posé
 * d'emblée sur son état final. Aucun des trois n'a jamais bougé d'un pixel.
 *
 * `.leve` joue sur le TEMPS, une seule fois, au chargement. `.leve-suite` porte
 * le décalage sur ses enfants directs, pour la même raison que `.cascade` : une
 * ligne ajoutée un an plus tard hérite du rythme au lieu de l'oublier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE LE HÉROS NE FAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PAS DE CHIFFRE ANIMÉ. Le compteur qui montait de zéro figeait « 0 % » dans le
 * HTML servi : un robot d'indexation, un aperçu de lien ou un lecteur sans
 * script voyaient un taux faux. Sur une page dont l'argument entier est
 * l'exactitude de la mesure, c'était le pire endroit pour publier un nombre qui
 * n'est pas vrai.
 *
 * PAS DE PROMESSE. Le mot proscrit dans tout le produit est pris au sérieux
 * jusque dans les tournures. Le logiciel mesure ; ce que le gérant en fait ne
 * dépend que de lui.
 */

/** Ce que le logiciel mesure, dans l'ordre où la loi les fait naître. */
const MESURES = [
	{ titre: 'Intérêts de retard', detail: 'Période par période, au taux du semestre.' },
	{ titre: 'Indemnité forfaitaire', detail: 'Par facture, jamais par client.' },
	{ titre: 'Prescription', detail: 'Par secteur, à la date près.' }
] as const;

/**
 * LE CHIFFRE DE LA LIGNE D'ACCENT, LU SUR LES PARAMÈTRES.
 *
 * ⚠️ IL N'EST PAS ÉCRIT EN DUR, ET IL DISPARAÎT PLUTÔT QUE D'ÊTRE FAUX. C'est
 * la règle la plus stricte du projet : toute valeur juridique vit dans
 * `parametres.ts`, avec sa source et sa date de relevé. `estUtilisable` exige
 * que la valeur ait été relevée sur une source publique citable — sans quoi la
 * ligne se rend sans son montant, ce qui est vrai, plutôt qu'avec un montant de
 * mémoire, ce qui serait invérifiable et plus dangereux qu'une absence.
 */
function indemniteLisible(): string | null {
	const indemnite = PARAMETRES.indemniteForfaitaire;
	if (!estUtilisable(indemnite) || indemnite.valeur === null) return null;
	return eurosCentimesCourts(indemnite.valeur);
}

export function Hero() {
	const indemnite = indemniteLisible();

	return (
		// LE RETRAIT SUPÉRIEUR EST CELUI DE LA BARRE, et il est porté par l'en-tête
		// plutôt que par son contenu : la barre est en `fixed` et ne réserve aucune
		// place. Voir `--spacing-barre-publique`.
		//
		// `isolate` crée le contexte d'empilement qui rend le `-z-10` des couches
		// possible : sans lui, un z-index négatif passerait derrière l'aplat noir
		// de l'en-tête et elles disparaîtraient.
		<header className="relative isolate w-full overflow-clip bg-nuit pt-barre-publique text-craie">
			<Nebuleuse className="-z-10" />
			<AtmosphereNuit className="-z-10" />

			<div className="relative mx-auto w-full max-w-7xl px-cladd-2xs md:px-cladd-sm">
				{/*
				  LE RAIL TECHNIQUE. Chez la référence, ce sont des coordonnées
				  géographiques posées aux deux coins ; ici, le cadre légal que le
				  produit mesure. Le geste est le même et il fait le même travail : il
				  dit, avant la première phrase, qu'on est devant un INSTRUMENT.

				  ⚠️ LES NUMÉROS D'ARTICLE NE SONT PAS ÉCRITS ICI. Ils sont extraits des
				  sources relevées sur Légifrance et portées par les paramètres
				  eux-mêmes — voir `articles.ts`. Une source sans numéro repérable ne
				  rend rien plutôt qu'un numéro de mémoire.
				*/}
				<div className="flex items-center justify-between gap-cladd-2xs border-b border-dashed border-filet-nuit py-cladd-3xs text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase">
					<span>Code de commerce</span>
					{ARTICLES_DU_SOCLE.length > 0 ? (
						<span className="tabular-nums">{ARTICLES_DU_SOCLE.join(' · ')}</span>
					) : null}
				</div>

				{/* L'ACCROCHE, AU CENTRE ET EN PLEINE LARGEUR. C'est ce que la
				    disposition en deux colonnes interdisait : cent-vingt-huit pixels au
				    lieu de quatre-vingts. */}
				<div className="leve-suite flex flex-col items-center gap-cladd-2xs pt-respiration text-center">
					{/*
					  ⚠️ LA PASTILLE « RECOUVREMENT DE CRÉANCES B2B » A ÉTÉ RETIRÉE, ET
					  ELLE NE MANQUE PAS. Elle annonçait la CATÉGORIE du produit avant sa
					  proposition — c'est-à-dire qu'elle faisait lire « encore un logiciel
					  de » à quelqu'un qui n'avait pas encore entendu ce qu'on avait à lui
					  dire. Aucune des références retenues n'en porte : Revolut, Wise,
					  Legend et Linear ouvrent tous sur la phrase.

					  ⚠️ COURTE, ET C'EST LA CONTRAINTE PRINCIPALE. Deux tentatives sont
					  tombées avant celle-ci. « Vos impayés s'éteignent sans bruit » était
					  court mais vague : « s'éteindre » est le terme juridique de
					  l'extinction d'une créance, et personne d'autre qu'un juriste ne le
					  lit comme ça. Puis le manifeste entier — « un impayé ne fait aucun
					  bruit le jour où il devient irrécouvrable » — qui est la phrase la
					  plus juste du projet, et qui demande trois lignes et deux secondes
					  de déchiffrage. Un premier écran n'en a pas deux.

					  ⚠️ L'EMPHASE SE FAIT PAR LA VALEUR, PLUS PAR LA COULEUR. La seconde
					  ligne était en bleu de marque, seule couleur de toute la page. En
					  noir et blanc, la même hiérarchie s'obtient en ÉTEIGNANT le connu
					  pour que la révélation reste pleine : tout le monde sait qu'il a des
					  impayés, presque personne ne sait qu'il y a une date après laquelle
					  ils ne valent plus rien.
					*/}
					<h1 className="leve max-w-5xl font-affiche text-affiche leading-affiche font-semibold tracking-affiche text-balance">
						<span className="block text-craie-claire">Vos impayés</span>
						<span className="block">ont une date limite.</span>
					</h1>

					{/*
					  LA LIGNE D'ACCENT, ET C'EST ELLE QUI ARRÊTE L'ŒIL.

					  ⚠️ UN CHIFFRE, PAS UN ARGUMENT. La référence met « Borrow from
					  -10.92% » sous son titre : un nombre précis, vérifiable, qui fait
					  faire le calcul dans la tête. Le nôtre est meilleur encore parce
					  qu'il ne nous appartient pas — il est dû de plein droit, et presque
					  personne ne le réclame.

					  La marque sert de puce, comme le rond violet de la référence est
					  leur logo : c'est la seule fois de la page où elle apparaît hors de
					  la barre, et elle SIGNE le chiffre.

					  ⚠️ LE TEXTE EST UN SEUL ENFANT, ET PAS TROIS. En `flex-wrap` avec
					  trois enfants, chaque morceau passait à la ligne pour son propre
					  compte : à 375 px, la marque et « 40 € » restaient seules sur une
					  ligne et la phrase tombait deux lignes plus bas, désossée. Un seul
					  bloc de texte se replie sur lui-même, et la marque reste la puce
					  qu'elle doit être.
					*/}
					{indemnite === null ? null : (
						<p className="leve flex max-w-2xl items-center justify-center gap-cladd-3xs text-titre-section leading-tight font-medium tracking-titre-section">
							{/* ⚠️ ET LA PUCE DISPARAÎT SOUS 640 PX. Une puce n'a de sens que
							    devant une ligne ; devant un bloc de trois lignes, elle flotte au
							    milieu de la hauteur et se lit comme une image égarée. La marque
							    est de toute façon dans la barre, soixante pixels plus haut. */}
							<LogoLetikette className="hidden size-9 shrink-0 sm:block" />
							<span className="text-balance">
								<span className="tabular-nums">{indemnite}</span>{' '}
								<span className="text-craie-claire">dus par facture, de plein droit.</span>
							</span>
						</p>
					)}

					{/* ⚠️ UNE SEULE PILULE, ET UN LIEN. Deux boutons pleins côte à côte
					    annulent l'action principale : il ne reste que deux surfaces
					    claires entre lesquelles il faut choisir, c'est-à-dire exactement
					    le travail qu'on prétendait épargner au lecteur. */}
					<div className="leve flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
						<BoutonAffiche as={Link} to="/inscription">
							Voir mes créances
							<ArrowRightIcon />
						</BoutonAffiche>
						<LienAffiche href="#comment" className="justify-center">
							Voir ce que ça donne
						</LienAffiche>
					</div>

					{/* ⚠️ LA LEVÉE DE RISQUE EST ICI, ET PAS EN NEUVIÈME SECTION. « Trente
					    jours, sans carte bancaire » vivait au bas des tarifs : un visiteur
					    qui hésite devant le bouton ne l'a jamais lue, parce qu'il n'est
					    jamais descendu jusque-là. Une objection se lève à l'endroit où
					    elle naît, pas à l'endroit où c'est logique dans un plan. */}
					<p className="leve text-cladd-sm font-normal text-craie-claire">
						Trente jours d’essai. Aucune carte bancaire.
					</p>
				</div>

				{/*
				  LES TROIS COLONNES, SÉPARÉES PAR DES FILETS TIRETÉS.

				  ⚠️ LES FILETS NE SONT PAS UN ORNEMENT. Ils disent que la page est un
				  PLAN — une planche d'instrument — et pas une affiche. C'est le seul
				  élément graphique de tout le premier écran, et il ne coûte qu'une
				  bordure.

				  ⚠️ ILS DISPARAISSENT SOUS 768 PX, et il le faut : trois colonnes
				  empilées séparées par des traits verticaux donnent trois traits qui ne
				  séparent plus rien. Sur téléphone, seul le filet horizontal reste.
				*/}
				<div className="mt-respiration grid grid-cols-1 gap-cladd-2xl border-t border-dashed border-filet-nuit pt-cladd-2xs md:grid-cols-12 md:gap-0">
					<div className="flex flex-col items-start gap-cladd-2xs md:col-span-3 md:pr-cladd-2xs">
						{/*
						  ⚠️ « CE QUE LE RETARD VOUS DOIT » N'ÉTAIT PAS DU FRANÇAIS, et le
						  défaut n'était pas de style : un retard ne doit rien à personne,
						  c'est le débiteur qui doit. La personnification passait inaperçue
						  à l'écriture et sautait aux yeux à la lecture. Le français exact
						  existe : des intérêts se PRODUISENT, une indemnité est DUE.
						*/}
						<p className="text-cladd-md leading-relaxed font-normal text-craie-douce">
							Letikette surveille cette date sur chacune de vos factures, et calcule au centime les
							intérêts de retard et l’indemnité forfaitaire qui vous sont dus.
						</p>

						{/* L'APPEL À DESCENDRE, et c'est le geste de la référence : une
						    flèche vers le bas, en petites capitales, qui dit que la page
						    continue. Sur un premier écran plein, c'est la seule chose qui
						    l'annonce. */}
						<a
							href="#la-loi"
							className="inline-flex items-center gap-cladd-3xs rounded-full border border-filet-nuit px-cladd-3xs py-2 text-cladd-2xs font-medium tracking-widest text-craie-douce uppercase transition-colors hover:border-filet-nuit-vif hover:text-craie"
						>
							<ArrowDownIcon size={14} aria-hidden />
							Ce que dit la loi
						</a>
					</div>

					{/*
					  L'OBJET, LA LUMIÈRE QU'IL RÉPAND, ET LE BROUILLARD QUI LE MANGE.

					  ⚠️ LA LUEUR EST DANS LE MÊME CONTENEUR RELATIF QUE LE TÉLÉPHONE,
					  jamais posée ailleurs sur la section : une lumière qui ne part pas
					  de ce qui l'émet est le halo décoratif que le dépôt refuse. Ici elle
					  est ancrée, donc elle est vraie — un écran allumé sur du noir
					  éclaire ce qui l'entoure.
					*/}
					<div className="leve leve-tard relative md:col-span-6 md:border-x md:border-dashed md:border-filet-nuit md:px-cladd-2xs">
						<LueurProduit />
						{/* La description dit ce que l'écran MONTRE, au présent et avec ses
						    chiffres : c'est la seule version de cette image dont dispose
						    quelqu'un qui ne la voit pas. Elle suit les données de
						    `donnees-accueil.ts`, et bouge avec elles. */}
						<Telephone description="Letikette sur téléphone, écran d’accueil : 59 340,40 € dus sur 312 factures, dont 54 210,00 € de principal, 4 690,40 € d’intérêts de retard et 440,00 € d’indemnité forfaitaire. En retard : une facture prescrite depuis le 14 août 2026 chez Bellin & Fils pour 9 240,00 €. À venir : une signification d’ordonnance à neuf jours chez Ateliers Martin pour 18 450,00 €.">
							<ApercuTelephone />
						</Telephone>
					</div>

					{/* CE QU'IL MESURE. Chez la référence, cette colonne porte les logos
					    des protocoles branchés ; nous n'avons pas de partenaires à citer,
					    et une rangée de logos inventés serait exactement le genre de
					    preuve sociale fabriquée que ce produit ne s'autorise pas. Les
					    trois mesures disent la même chose en plus vrai : voilà ce que la
					    machine calcule, et rien d'autre. */}
					<dl className="flex flex-col gap-cladd-2xs md:col-span-3 md:pl-cladd-2xs">
						{MESURES.map(({ titre, detail }) => (
							<div key={titre} className="flex flex-col gap-1">
								<dt className="text-cladd-2xs font-medium tracking-widest text-craie-sourde uppercase">
									{titre}
								</dt>
								<dd className="text-cladd-sm leading-snug font-normal text-craie-douce">
									{detail}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</div>

			{/*
			  LE BROUILLARD, PAR-DESSUS TOUT LE RESTE.

			  ⚠️ IL EST HORS DU CONTENEUR BORNÉ, et il le faut : il doit traverser
			  toute la largeur de la fenêtre, pas celle de la grille. Et il est le
			  DERNIER enfant, donc au-dessus du téléphone sans avoir besoin d'un
			  z-index — c'est l'ordre du document qui fait l'émersion.

			  Sa hauteur est celle du bas du premier écran : assez pour manger le
			  pied du téléphone, pas assez pour toucher la ligne d'accent.
			*/}
			<BrouillardAvant className="h-1/3" />
		</header>
	);
}
