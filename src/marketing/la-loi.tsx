import { SectionMarketing, TitreSection } from './section';

/**
 * La règle, avant l'outil.
 *
 * POURQUOI CETTE SECTION EXISTE. La cible ne connaît souvent pas le détail de
 * ce qu'on lui demande : les cantines privées ne sont soumises que depuis 2024,
 * et le barème n'est écrit nulle part de façon lisible. Un visiteur qui découvre
 * l'obligation ici comprend d'un coup pourquoi il lui manque un chiffre.
 *
 * LES TROIS NOMBRES NE SONT PLUS DANS DES CARTES. Ils étaient posés sur trois
 * surfaces arrondies avec une ombre portée, c'est-à-dire dans le vocabulaire
 * exact d'un tableau de bord — trois indicateurs qu'on regarde. Ce sont des
 * SEUILS LÉGAUX : ils appartiennent au registre de l'article de loi, pas à celui
 * de la métrique. Ils vivent donc à même le papier, séparés par des filets
 * verticaux, comme les colonnes d'un texte réglementaire.
 *
 * ILS SONT EN SERIF ET EN ENCRE, JAMAIS EN VERT. Le vert, l'ambre et le rouge du
 * produit veulent dire « au-dessus du seuil, tout près, en dessous », et rien
 * d'autre. Les peindre en vert dirait « c'est atteint », ce qui est l'inverse du
 * propos.
 *
 * IL N'Y A PLUS DE PHOTOGRAPHIE ICI, ET C'EST UN RETRAIT VOLONTAIRE. Un panier
 * de légumes occupait cinq colonnes à droite du titre. Il ne démontrait rien —
 * la règle de la page est qu'un cadre n'entoure que ce qui est MONTRÉ, une
 * capture ou une preuve — et il désalignait la grille : son bord droit ne
 * tombait sur aucune des colonnes de seuils en dessous. Une section qui doit
 * asséner trois nombres n'a rien à gagner à les faire précéder d'une image
 * d'ambiance. Le titre prend toute la largeur, les trois seuils suivent.
 *
 * LA DERNIÈRE LIGNE EST LA PLUS UTILE DE LA PAGE. « Local », « circuit court »,
 * « de saison » et « fait maison » ne comptent pas au barème. C'est la surprise
 * de presque tous les gérants, ça se vérifie en trente secondes, et ça établit
 * qu'on connaît le sujet mieux que celui qui vend un tableau de bord. Elle est
 * traitée en exergue — un filet épais à gauche, comme une citation d'imprimé —
 * plutôt qu'en encadré, pour qu'on ne puisse pas la sauter.
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
		<SectionMarketing fond="papier">
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
			  LES TROIS SEUILS SORTENT DE LA COLONNE, ET C'EST LE GESTE PRINCIPAL DE
			  LA PAGE.

			  Ils tenaient dans le même conteneur borné que tout le reste, à
			  quarante-huit pixels. La page entière se lisait alors à un seul
			  volume : dix-sept à quarante pixels, une seule largeur, un seul blanc,
			  du haut jusqu'en bas. C'est ce qui la faisait ressembler à un document
			  administratif plutôt qu'à un objet auquel on croit.

			  Ici ils vont d'un bord à l'autre de la fenêtre, en corps fluide, et ce
			  sont eux qu'on retient de la page. Le contenu le justifie : c'est la
			  seule chose de cette page qui ne nous appartienne pas. C'est la loi,
			  elle est opposable, et elle a le droit de crier.

			  `divide-x` ne dessine qu'ENTRE les éléments, donc jamais de trait qui
			  pend au bord. En dessous de `md`, la règle passe à l'horizontale :
			  trois colonnes de seuils sur 375 px ne se lisent pas.
			*/}
			<dl className="-mx-cladd-2xs grid divide-y divide-trait border-y border-plume md:grid-cols-3 md:divide-x md:divide-y-0">
				{SEUILS.map((s) => (
					<div key={s.titre} className="flex flex-col gap-cladd-3xs px-cladd-2xs py-cladd-xs">
						<dt className="font-serif text-seuil-affiche leading-none font-medium tabular-nums">
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

			<blockquote className="max-w-4xl border-l-4 border-plume pl-cladd-2xs">
				<p className="font-serif text-titre-section leading-tight font-medium">
					« Local », « circuit court », « de saison » et « fait maison » ne comptent pas.
				</p>
				<p className="pt-cladd-3xs text-cladd-md leading-relaxed font-normal text-plume-douce">
					La carotte du maraîcher d&rsquo;à côté, sans label, pèse zéro dans votre taux.
				</p>
			</blockquote>
		</SectionMarketing>
	);
}
