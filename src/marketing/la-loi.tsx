import { SectionMarketing, TitreSection, Panneau, Exergue } from './section';

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
 * ⚠️ LES TROIS NOMBRES SONT REVENUS DANS UNE SURFACE, ET C'EST UN DEMI-TOUR
 * ASSUMÉ. Ils ont d'abord été des cartes à ombre portée : le vocabulaire d'un
 * tableau de bord, trois indicateurs qu'on regarde, alors que ce sont des SEUILS
 * LÉGAUX. On les a donc sortis de toute boîte, posés à même le papier entre deux
 * règles noires, comme les colonnes d'un texte réglementaire.
 *
 * Cette version-là était juste dans son raisonnement et fausse à l'œil : deux
 * traits d'encre pleine en travers de la page, c'est le trait le plus dur de
 * tout le site, et il tombait juste sous un héros fait d'un lavis et d'un objet
 * posé. La section entière lisait « formulaire ».
 *
 * Un seul panneau, pas trois cartes : c'est la nuance qui compte. Trois cartes
 * font trois indicateurs qu'on compare ; UN panneau à trois colonnes fait un
 * article à trois alinéas — le même geste que les règles noires, dans le
 * vocabulaire du reste de la page.
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
			<Panneau as="dl" colonnes={3} divise className="cladd-color-brand overflow-hidden">
				{SEUILS.map((s) => (
					<div key={s.titre} className="flex flex-col gap-cladd-3xs p-cladd-2xs md:p-cladd-xs">
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
			</Panneau>

			<Exergue
				phrase="« Local », « circuit court », « de saison » et « fait maison » ne comptent pas."
				appui="La carotte du maraîcher d’à côté, sans label, pèse zéro dans votre taux."
			/>
		</SectionMarketing>
	);
}
