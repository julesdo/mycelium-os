import { SectionMarketing } from './section';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { tauxPenaliteParDefaut } from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { eurosCentimesCourts, tauxLisible } from '../ui/format';
import { ScenePointeur } from '../ui';
import { ARTICLES_DU_SOCLE } from './articles';

/**
 * La règle, avant l'outil.
 *
 * POURQUOI CETTE SECTION EXISTE. Presque personne ne réclame ce que la loi
 * accorde déjà. Les intérêts de retard et l'indemnité de quarante euros sont
 * dus DE PLEIN DROIT, sans mise en demeure, sans clause, sans négociation — et
 * ils dorment sur des milliers de factures parce que personne ne sait les
 * calculer. Le délai, lui, court dans l'autre sens, tout seul, jusqu'à ce que
 * la créance s'éteigne. Un visiteur qui découvre ça ici comprend d'un coup
 * pourquoi il lui manque un chiffre.
 *
 * ⚠️ AUCUN DE CES TROIS NOMBRES N'EST ÉCRIT DANS CE FICHIER. Ils viennent du
 * registre des paramètres juridiques et du module France, c'est-à-dire des
 * mêmes valeurs, relevées et sourcées, qui servent à calculer un décompte
 * opposable. Une page publique qui recopie un taux à la main finit par annoncer
 * un chiffre que le produit ne calcule plus — et c'est le pire endroit pour se
 * tromper, parce que c'est celui qu'on lit avant d'acheter.
 *
 * LE TAUX SE RÉANCRE DEUX FOIS PAR AN, et la page suit sans qu'on y touche.
 * S'il n'est pas encore publié pour le semestre en cours, on affiche la RÈGLE
 * plutôt qu'un nombre : « BCE + 10 points » reste vrai même quand la valeur ne
 * l'est pas encore. Le module refuse d'extrapoler, et la page ne doit pas
 * tomber pour autant.
 *
 * ELLE PROLONGE LE LAVIS DU HÉROS. C'est la première section après la tablette,
 * et le dégradé d'azur y descend jusqu'au crème : la page ne casse pas en deux
 * au premier défilement. C'est aussi la seule autre section à le porter — au
 * troisième, un dégradé n'est plus une transition, c'est un motif.
 *
 * ⚠️ LES TROIS NOMBRES N'ONT NI BOÎTE, NI FILET, NI FOND. Ils ont tout essayé,
 * et les deux premières tentatives étaient fausses pour la même raison, de deux
 * côtés opposés.
 *
 * Trois CARTES à ombre portée, d'abord : c'est le vocabulaire d'un tableau de
 * bord — trois indicateurs qu'on compare — alors que ce sont des seuils légaux,
 * qui s'additionnent au lieu de se comparer.
 *
 * Puis à même le papier, entre deux RÈGLES D'ENCRE PLEINE, comme les colonnes
 * d'un texte réglementaire. Juste dans le raisonnement, faux à l'œil : deux
 * traits noirs en travers de la page, sous un héros fait d'un lavis et d'un
 * objet posé. La section lisait « formulaire ».
 *
 * Puis un PANNEAU unique à trois colonnes, qui n'était que la première erreur
 * en plus discret : une surface reste une surface.
 *
 * Ce qui reste est ce qu'il aurait fallu faire d'emblée : rien. Trois colonnes,
 * du vide entre elles, et un corps de cent-vingt-quatre pixels. À cette taille,
 * un chiffre n'a besoin d'aucun contenant pour qu'on le voie — et c'est le vide
 * autour de lui qui dit son importance, pas une bordure.
 *
 * LES CHIFFRES SONT EN BLEU DE MARQUE, JAMAIS EN VERT NI EN ROUGE. Ces deux
 * couleurs veulent dire « au-dessus du seuil » et « en dessous » partout
 * ailleurs dans le produit, et rien d'autre. Le bleu est la seule qui reste, et
 * c'est justement celle qui relie la ligne d'accroche du héros à ces trois
 * nombres.
 *
 * LA DERNIÈRE LIGNE EST LA PLUS UTILE DE LA PAGE. Presque tout le monde croit
 * qu'une facture impayée se prescrit en cinq ans. Sur le transport de
 * marchandises, c'est un an — et le délai court depuis la livraison, pas depuis
 * la dernière relance. Ça se vérifie en trente secondes et ça établit qu'on
 * connaît le sujet mieux que celui qui vend un tableau de bord.
 */

/**
 * L'article cité par une source du registre, isolé pour l'afficher.
 *
 * Les sources sont écrites en toutes lettres — « Article L441-10 II du code de
 * commerce » — parce que c'est ce qu'il faut lire dans un décompte. Un
 * sur-titre de section n'a la place que de la référence.
 *
 * Rend `null` si la source n'en contient pas : plusieurs paramètres du registre
 * n'ont PAS d'article, et disent exactement ça. Inventer une référence
 * plausible serait la faute la plus grave que ce produit puisse commettre.
 */

/**
 * LES TROIS CHIFFRES QUE PERSONNE NE RÉCLAME.
 *
 * Ce ne sont pas des arguments de vente : ce sont des droits qui existent et
 * qu'on laisse tomber.
 */
function seuilsDeLaLoi(aujourdHui: string) {
	// Le taux du semestre en cours, ou la règle qui le produit. Le module France
	// refuse d'extrapoler un semestre non publié, et il a raison ; la page, elle,
	// n'a pas le droit de tomber pour autant.
	let taux: string;
	try {
		taux = tauxLisible(tauxPenaliteParDefaut(aujourdHui));
	} catch {
		taux = 'BCE + 10 pts';
	}

	const indemnite = PARAMETRES.indemniteForfaitaire;
	const general = REGIMES_PRESCRIPTION.GENERAL;
	const transport = REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES;
	const consommateur = REGIMES_PRESCRIPTION.CONSOMMATEUR;

	return [
		{
			valeur: taux,
			titre: 'd’intérêts de retard',
			detail:
				'Taux de refinancement de la BCE majoré de dix points, dus sans mise en demeure. ' +
				'Réancré chaque semestre.'
		},
		{
			valeur: estUtilisable(indemnite) ? eurosCentimesCourts(indemnite.valeur) : '40 €',
			titre: 'par facture en retard',
			detail:
				'Indemnité forfaitaire de recouvrement, due de plein droit dès le premier jour. ' +
				'Par facture, jamais par client.'
		},
		{
			valeur: `${general.dureeAnnees} ans`,
			titre: 'et souvent bien moins',
			detail:
				`${transport.dureeAnnees} an sur le transport de marchandises, ` +
				`${consommateur.dureeAnnees} sur ce qu’on fournit à un consommateur. ` +
				'Passé le délai, la créance est éteinte.'
		}
	] as const;
}


/**
 * LA SECTION DE LA LOI, REPRISE DANS LE VOCABULAIRE DE LA NUIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE N'EMPLOIE NI `TitreSection` NI `Exergue`, ET CE N'EST PAS UN OUBLI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ces deux composants portent l'identité précédente — « papier, encre,
 * filet » — et leur pièce maîtresse est la SERIF. Newsreader est juste sur du
 * crème, où elle dit « imprimé, contrat, document opposable » ; posée sur le
 * noir à côté d'une grotesque d'affiche, elle dit « deux sites collés bout à
 * bout ».
 *
 * Les deux restent employés par les sections non encore reprises. Ils partiront
 * avec la dernière, et ce jour-là il faudra les RETIRER, pas les laisser au cas
 * où — voir la note sur `FONDS` dans `section.tsx`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES TROIS CHIFFRES RESTENT LE PLUS GROS CORPS DE TOUTE LA PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le jeton `--text-affiche` est monté à 128 px avec le premier écran, et son
 * commentaire annonçait que le rapport avec `--text-seuil-affiche` (124 px)
 * serait « à rebattre ici ». Il l'est, et c'est la GÉOMÉTRIE qui a tranché, pas
 * la hiérarchie.
 *
 * ⚠️ LES 124 PX NE TIENNENT PAS DANS UNE COLONNE DE TROIS, et ça se voit :
 * « 12,40 % » y mesure plus de trois cents pixels et se casse entre le nombre
 * et son unité. Le pourcent tombait seul sur la ligne suivante, ce qui n'est
 * plus un chiffre. Les seuils prennent donc `--text-seuil-colonne`, calé pour
 * qu'ils tiennent d'un bloc aux quatre largeurs de référence.
 *
 * Ils passent ainsi SOUS l'accroche du premier écran, et c'est une concession à
 * admettre plutôt qu'à maquiller : le principe voulait que le droit crie plus
 * fort que notre promesse, parce que c'est la seule chose de cette page qui ne
 * nous appartienne pas. Ce qui le tient encore, à l'œil, c'est qu'ils sont
 * TROIS, courts, alignés, et les seuls chiffres de la page. Le titre domine par
 * la masse, les seuils par la répétition. Le jour où la section se refait en
 * pleine largeur — un seuil par rangée, comme un grand livre — le corps
 * d'origine redevient possible.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE MOUVEMENT, ET POURQUOI IL EST PORTÉ PAR LES CHIFFRES SEULS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les trois colonnes vivent dans une `ScenePointeur` et dérivent à TROIS
 * PROFONDEURS différentes — six, quatorze et vingt-six pixels. C'est ce
 * désaccord qui fait le volume : trois couches qui bougent de la même quantité
 * ne sont qu'une seule image qui glisse.
 *
 * ⚠️ MAIS SEULS LES CHIFFRES DÉRIVENT. Les libellés et les explications restent
 * immobiles, et c'est la règle : ce qui se LIT ne bouge pas. Une ligne de texte
 * courant qui suit le curseur est une ligne qu'on relit trois fois. Le
 * mouvement est réservé à ce qu'on REGARDE.
 *
 * La `ScenePointeur` ne pose même pas son abonnement sans souris réelle, ni
 * sous mouvement réduit : sur un téléphone, la section est rigoureusement
 * immobile et c'est sa forme juste.
 */
export function LaLoi() {
	const aujourdHui = new Date().toISOString().slice(0, 10);
	const seuils = seuilsDeLaLoi(aujourdHui);

	return (
		<SectionMarketing id="la-loi">
			{/*
			  LE RAIL TECHNIQUE, repris du premier écran. Il remplace la pastille de
			  sur-titre : une étiquette posée au-dessus d'un titre dit « section » ;
			  un rail tiré d'un bord à l'autre dit « planche d'instrument », et c'est
			  le registre de toute la page depuis le haut.

			  ⚠️ LES NUMÉROS D'ARTICLE NE SONT PAS ÉCRITS ICI. Ils sont extraits des
			  sources relevées sur Légifrance et portées par les paramètres eux-mêmes
			  — voir `articles.ts`. Une source sans numéro repérable ne rend rien,
			  plutôt qu'un numéro de mémoire.
			*/}
			<div className="flex items-center justify-between gap-cladd-2xs border-b border-dashed border-filet-nuit pb-cladd-3xs text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase">
				<span>De plein droit</span>
				{ARTICLES_DU_SOCLE.length > 0 ? (
					<span className="tabular-nums">Art. {ARTICLES_DU_SOCLE.join(' · ')}</span>
				) : null}
			</div>

			{/*
			  LE TITRE MÈNE PAR CE QUI SURPREND. Ce n'est pas que la loi existe,
			  c'est que ces sommes sont dues SANS RIEN DEMANDER — et que presque
			  personne ne les réclame, faute de savoir les calculer.
			*/}
			<div className="flex flex-col gap-cladd-2xs">
				<h2 className="apparait max-w-4xl font-affiche text-titre-section leading-tight font-semibold tracking-titre-section text-balance">
					Ce que la loi vous doit,{' '}
					<span className="text-craie-claire">et que personne ne réclame.</span>
				</h2>
				<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
					Ces sommes vous sont dues sans mise en demeure et sans clause au contrat. Ce délai, lui,
					court sans que personne ne vous prévienne.
				</p>
			</div>

			<ScenePointeur>
				<dl className="cascade grid gap-cladd-sm md:grid-cols-3 md:gap-cladd-2xs">
					{seuils.map((seuil, rang) => (
						<div
							key={seuil.titre}
							className={
								rang === 0
									? 'flex flex-col gap-cladd-3xs md:border-r md:border-dashed md:border-filet-nuit md:pr-cladd-2xs'
									: rang === 1
										? 'flex flex-col gap-cladd-3xs md:border-r md:border-dashed md:border-filet-nuit md:px-cladd-2xs'
										: 'flex flex-col gap-cladd-3xs md:pl-cladd-2xs'
							}
						>
							{/* SEUL LE CHIFFRE DÉRIVE. Voir l'en-tête : ce qui se lit ne
							    bouge pas, ce qu'on regarde peut bouger. */}
							<dt
								className={
									rang === 0
										? 'suit-pointeur-loin font-affiche text-seuil-colonne leading-none font-semibold tracking-affiche tabular-nums'
										: rang === 1
											? 'suit-pointeur-milieu font-affiche text-seuil-colonne leading-none font-semibold tracking-affiche tabular-nums'
											: 'suit-pointeur-pres font-affiche text-seuil-colonne leading-none font-semibold tracking-affiche tabular-nums'
								}
							>
								{seuil.valeur}
							</dt>
							<dd className="flex flex-col gap-1">
								<span className="text-intertitre leading-snug font-medium">{seuil.titre}</span>
								<span className="text-cladd-md leading-relaxed font-normal text-craie-douce">
									{seuil.detail}
								</span>
							</dd>
						</div>
					))}
				</dl>
			</ScenePointeur>

			{/*
			  LA PHRASE QUI DOIT RESTER QUAND TOUT LE RESTE EST OUBLIÉ.

			  Elle remplace `Exergue`, qui est en serif. Ce qui fait qu'une phrase
			  ressort n'a jamais été le contenant — c'est le CORPS et le VIDE autour.
			  Le filet vertical suffit à dire « citation », et il est tireté comme
			  tous les autres de la page.
			*/}
			<blockquote className="apparait flex max-w-4xl gap-cladd-2xs border-l border-dashed border-filet-nuit-vif pl-cladd-2xs">
				<div className="flex flex-col gap-cladd-3xs">
					<p className="font-affiche text-titre-section leading-tight font-medium tracking-titre-section text-balance">
						Une facture de transport se prescrit en un an, pas en cinq.
					</p>
					<p className="text-cladd-md leading-relaxed font-normal text-craie-douce">
						Et le délai court depuis la livraison, pas depuis votre dernière relance.
					</p>
				</div>
			</blockquote>
		</SectionMarketing>
	);
}
