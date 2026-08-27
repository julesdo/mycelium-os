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
		detail: 'Bio, Label Rouge, AOP, IGP, HVE 3, pêche durable, commerce équitable.'
	},
	{
		valeur: '20 %',
		titre: 'dont du bio',
		detail: 'Les produits en conversion comptent aussi, dans les deux taux à la fois.'
	},
	{
		valeur: '60 %',
		titre: 'sur la viande et le poisson',
		detail: 'Un seuil à part, calculé sur ces deux familles seulement.'
	}
] as const;

export function LaLoi() {
	return (
		<SectionMarketing fond="papier">
			<div className="grid gap-cladd-xs lg:grid-cols-12 lg:gap-cladd-2xl">
				<div className="lg:col-span-7">
					<TitreSection
						sur="Loi EGalim · code rural, art. L230-5-1"
						titre="Ce que la loi demande"
						chapeau="En valeur d’achat hors taxes, sur l’année civile, et à déclarer chaque année sur « ma cantine ». Le public y est soumis depuis 2022, le privé depuis 2024."
					/>
				</div>

				{/*
				  La photographie tient les cinq colonnes restantes. Elle ne démontre
				  rien — c'est le sujet de la loi, posé à côté de son texte.
				*/}
				<div className="relative aspect-video overflow-hidden rounded-net border border-trait lg:col-span-5">
					<img
						src="/photos/cagette.jpg"
						alt="Panier de légumes de saison posé sur une table en bois"
						loading="lazy"
						className="absolute inset-0 size-full object-cover"
					/>
				</div>
			</div>

			{/*
			  Trois colonnes, séparées par des filets et non par du vide. `divide-x`
			  ne dessine qu'entre les éléments, donc jamais de trait qui pend au bord.
			  En dessous de `md` la règle passe à l'horizontale : trois colonnes de
			  seuils sur 375 px ne se lisent pas.
			*/}
			<dl className="grid divide-y divide-trait border-y border-trait md:grid-cols-3 md:divide-x md:divide-y-0">
				{SEUILS.map((s) => (
					<div key={s.titre} className="flex flex-col gap-cladd-3xs py-cladd-xs md:px-cladd-2xs">
						<dt className="font-serif text-seuil-legal-etroite leading-none font-medium tabular-nums md:text-seuil-legal">
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
				<p className="font-serif text-titre-section-etroite leading-tight font-medium">
					« Local », « circuit court », « de saison » et « fait maison » ne comptent pas.
				</p>
				<p className="pt-cladd-3xs text-cladd-md leading-relaxed font-normal text-plume-douce">
					C&rsquo;est la première surprise de presque tout le monde. Ces mentions sont sincères et
					elles ne figurent pas au barème : une carotte du maraîcher d&rsquo;à côté, sans label,
					pèse zéro dans votre taux. C&rsquo;est aussi pour ça que beaucoup de cantines qui achètent
					bien déclarent mal.
				</p>
			</blockquote>
		</SectionMarketing>
	);
}
