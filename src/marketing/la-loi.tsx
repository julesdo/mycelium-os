import { SectionMarketing, TitreSection, Exergue } from './section';

/**
 * La règle, avant l'outil.
 *
 * POURQUOI CETTE SECTION EXISTE. La cible ne connaît souvent pas le détail de
 * ce qu'on lui demande : les cantines privées ne sont soumises que depuis 2024,
 * et le barème n'est écrit nulle part de façon lisible. Un visiteur qui découvre
 * l'obligation ici comprend d'un coup pourquoi il lui manque un chiffre.
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
 * du vide entre elles, et un corps de cent-trente-deux pixels. À cette taille,
 * un chiffre n'a besoin d'aucun contenant pour qu'on le voie — et c'est le vide
 * autour de lui qui dit son importance, pas une bordure.
 *
 * LES CHIFFRES SONT EN BLEU DE MARQUE, JAMAIS EN VERT. Le vert, l'ambre et le
 * rouge du produit veulent dire « au-dessus du seuil, tout près, en dessous »,
 * et rien d'autre : les peindre en vert dirait « c'est atteint », l'inverse du
 * propos. Le bleu est la seule couleur qui reste, et c'est justement celle qui
 * relie la ligne d'accroche du héros à ces trois nombres.
 *
 * LA DERNIÈRE LIGNE EST LA PLUS UTILE DE LA PAGE. « Local », « circuit court »,
 * « de saison » et « fait maison » ne comptent pas au barème. C'est la surprise
 * de presque tous les gérants, ça se vérifie en trente secondes, et ça établit
 * qu'on connaît le sujet mieux que celui qui vend un tableau de bord.
 */

const SEUILS = [
	{
		valeur: '50 %',
		titre: 'de produits durables',
		detail: 'Bio, Label Rouge, AOP, IGP, HVE 3, pêche durable.'
	},
	{
		valeur: '20 %',
		titre: 'dont du bio',
		detail: 'La conversion compte aussi.'
	},
	{
		valeur: '60 %',
		titre: 'sur la viande et le poisson',
		detail: 'Sur ces deux familles seulement.'
	}
] as const;

export function LaLoi() {
	return (
		<SectionMarketing id="la-loi" fond="azur">
			{/*
			  LE CHAPEAU MÈNE PAR CE QUI SURPREND. Il commençait par la méthode de
			  calcul et finissait sur « le privé depuis 2024 ». Or c'est cette
			  dernière ligne qui fait sursauter la cible : beaucoup de cantines
			  privées ignorent encore qu'elles sont concernées. On la met devant.
			*/}
			<TitreSection
				sur="Loi EGalim · code rural, art. L230-5-1"
				titre="Ce que la loi vous demande"
				chapeau="Depuis 2024, les cantines privées y sont soumises comme les publiques."
			/>

			{/*
			  LES TROIS SEUILS RESTENT LE PLUS GROS CORPS DE LA PAGE, et c'est le
			  contenu qui le justifie : c'est la seule chose ici qui ne nous
			  appartienne pas. C'est la loi, elle est opposable, elle a le droit de
			  crier. Rien d'autre n'a le droit d'approcher ce corps.
			*/}
			<dl className="cladd-color-brand grid gap-cladd-sm md:grid-cols-3 md:gap-cladd-2xs">
				{SEUILS.map((s) => (
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
				phrase="« Local », « circuit court », « de saison » et « fait maison » ne comptent pas."
				appui="La carotte du maraîcher d’à côté, sans label, pèse zéro dans votre taux."
			/>
		</SectionMarketing>
	);
}
