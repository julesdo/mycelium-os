import { SectionMarketing, TitreSection, Exergue } from './section';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { tauxPenaliteParDefaut } from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { eurosCentimesCourts, tauxLisible } from '../ui/format';

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
function articleDe(source: string): string | null {
	const trouve = source.match(/\b[LRD]\.? ?\d{3}-\d+/);
	return trouve ? trouve[0] : null;
}

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

export function LaLoi() {
	const aujourdHui = new Date().toISOString().slice(0, 10);
	const seuils = seuilsDeLaLoi(aujourdHui);

	const articles = [
		articleDe(PARAMETRES.tauxInteretLegalDefaut.source),
		articleDe(PARAMETRES.delaiPrescriptionCommerciale.source)
	].filter((a): a is string => a !== null);

	return (
		<SectionMarketing id="la-loi" fond="azur">
			{/*
			  LE CHAPEAU MÈNE PAR CE QUI SURPREND. Ce n'est pas que la loi existe,
			  c'est que ces sommes sont dues SANS RIEN DEMANDER — et que presque
			  personne ne les réclame, faute de savoir les calculer.
			*/}
			<TitreSection
				sur={
					articles.length > 0
						? `Code de commerce · art. ${articles.join(' et ')}`
						: 'Code de commerce'
				}
				titre="Ce que la loi vous doit"
				chapeau="Ces sommes vous sont dues de plein droit. Ce délai, lui, court sans que personne ne vous prévienne."
			/>

			{/*
			  LES TROIS CHIFFRES RESTENT LE PLUS GROS CORPS DE LA PAGE, et c'est le
			  contenu qui le justifie : c'est la seule chose ici qui ne nous
			  appartienne pas. C'est la loi, elle est opposable, elle a le droit de
			  crier. Rien d'autre n'a le droit d'approcher ce corps.
			*/}
			<dl className="cladd-color-brand grid gap-cladd-sm lg:grid-cols-3 lg:gap-cladd-2xs">
				{seuils.map((s) => (
					<div key={s.titre} className="flex flex-col gap-cladd-3xs">
						<dt className="font-serif text-seuil-affiche leading-none font-medium text-cladd-primary tabular-nums">
							{s.valeur}
						</dt>
						<dd className="flex flex-col gap-1">
							<span className="font-serif text-intertitre leading-snug font-medium">{s.titre}</span>
							<span className="text-cladd-md leading-relaxed font-normal text-plume-douce">
								{s.detail}
							</span>
						</dd>
					</div>
				))}
			</dl>

			<Exergue
				phrase="Une facture de transport se prescrit en un an, pas en cinq."
				appui="Et le délai court depuis la livraison, pas depuis votre dernière relance."
			/>
		</SectionMarketing>
	);
}
