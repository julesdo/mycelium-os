import { Link } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import { ArrowRightIcon } from 'lucide-react';
import { LogoLetikette, MotLetikette, TauxEGalim } from '../ui';
import { useVisible, useCompteur } from './mouvement';
import { Cadre } from './section';

/**
 * L'entrée.
 *
 * CE QU'ELLE DOIT FAIRE EN SEPT SECONDES : dire à un chef de cuisine collective
 * qu'il a une obligation qu'il connaît mal, que son chiffre existe déjà dans
 * ses factures, et qu'il peut le voir aujourd'hui.
 *
 * ELLE EST DÉSAXÉE, ET C'EST LE CŒUR DE LA REFONTE. La version précédente
 * centrait tout — sur-titre, accroche, paragraphe, bouton — sur un axe unique.
 * C'est le réglage par défaut de toutes les pages de logiciel, et c'est
 * précisément ce qui les rend interchangeables : un axe central ne raconte rien,
 * il se contente d'être équilibré.
 *
 * Ici le texte tient sept colonnes sur douze, aligné à gauche comme un article,
 * et la photographie occupe les cinq autres EN DÉBORDANT jusqu'au bord de la
 * fenêtre. Le déséquilibre est le message : d'un côté la règle écrite, de
 * l'autre la matière — des produits frais, pas une illustration de tableau de
 * bord.
 *
 * LA PHOTO EST HÉBERGÉE PAR NOUS. Elle vient de Pexels, sous licence libre, et
 * elle est servie depuis notre propre domaine plutôt que depuis le leur. Un
 * appel vers un tiers depuis la page publique ferait de ce tiers un destinataire
 * de l'adresse IP de chaque visiteur — c'est-à-dire une ligne à ajouter au
 * tableau des sous-traitants de la politique de confidentialité, pour une
 * photographie. Voir `public/photos/CREDITS.md`.
 *
 * Ce qu'elle ne fait pas : promettre. Le mot proscrit dans tout le produit est
 * pris au sérieux jusque dans les tournures : on ne promet pas non plus un
 * résultat par une formule détournée. Le logiciel mesure. Ce que le gérant
 * achète ne dépend que de lui.
 *
 * LA DÉMONSTRATION EST LE VRAI COMPOSANT. `TauxEGalim` est la jauge de
 * l'application, pas une reproduction : elle déduit son état de seuil de la
 * mesure qu'on lui passe. En animant la mesure plutôt que la barre, elle
 * traverse ses couleurs comme elle le fait chez un client, et le visiteur voit
 * exactement l'écran qu'il aura.
 *
 * Les chiffres sont ceux d'une cantine qui n'est pas conforme, et c'est
 * délibéré : montrer trois jauges vertes vendrait le produit sur un mensonge et
 * ne dirait rien de ce qu'il sert à faire.
 */

/**
 * Chaque jauge porte SA base de calcul, pas un écart figé.
 *
 * L'écart en euros et la barre décrivent la même chose. S'ils s'animaient
 * séparément ils se contrediraient à mi-course : une barre à 12 % annoncerait
 * l'écart d'une barre à 39 %. L'écart est donc DÉDUIT de la mesure courante,
 * ce qui est aussi la façon dont il se calcule dans l'application.
 *
 * Les bases sont celles du jeu de démonstration du showroom : 180 000 € d'achats
 * sur l'exercice, dont 61 200 € de viande et de poisson.
 */
const DEMO = [
	{ titre: 'Produits durables', mesure: 0.39, seuil: 0.5, base: 180_000 },
	{ titre: 'dont bio', mesure: 0.21, seuil: 0.2, base: 180_000 },
	{ titre: 'Viande et poisson', mesure: 0.42, seuil: 0.6, base: 61_200 }
] as const;

export function Hero() {
	const { cible, visible } = useVisible<HTMLDivElement>('-8%');

	return (
		<header className="w-full bg-papier text-plume">
			<div className="mx-auto flex w-full max-w-7xl items-center gap-cladd-3xs border-b border-trait px-cladd-2xs py-cladd-3xs">
				<LogoLetikette className="size-11 shrink-0" />
				<MotLetikette />
				<span className="ml-auto flex items-center gap-cladd-3xs">
					<Button as={Link} to="/connexion" variant="transparent" className="rounded-none">
						Se connecter
					</Button>
				</span>
			</div>

			{/*
			  SEPT COLONNES CONTRE CINQ, et la photographie va jusqu'au bord.
			  Le déséquilibre se règle ici et nulle part ailleurs : au-dessous de
			  `lg`, tout retombe en une colonne et la photo passe en bandeau, parce
			  qu'un déséquilibre sur 375 px n'est plus qu'une colonne étroite.
			*/}
			<div className="grid border-b border-trait lg:grid-cols-12">
				<div className="flex flex-col justify-center gap-cladd-2xs px-cladd-2xs py-cladd-2xl lg:col-span-7 lg:pr-cladd-2xl lg:pl-cladd-xl">
					<span className="text-cladd-2xs font-semibold tracking-widest text-plume-claire uppercase">
						Restauration collective · déclaration avant le 31 mars
					</span>

					<h1 className="max-w-3xl font-serif text-affiche-etroite leading-none font-medium tracking-tight md:text-affiche">
						Vos trois taux EGalim sont déjà dans vos factures.
					</h1>

					<p className="max-w-xl text-chapeau leading-relaxed font-normal text-plume-douce">
						Ils s&rsquo;en sortent ligne par ligne, sur douze mois, en valeur d&rsquo;achat hors
						taxes. Letikette fait ce calcul et vous montre, pour chaque produit, pourquoi il compte
						ou pourquoi il ne compte pas.
					</p>

					<div className="flex flex-col items-start gap-cladd-3xs pt-cladd-3xs sm:flex-row sm:items-center">
						<Button
							as={Link}
							to="/inscription"
							color="brand"
							variant="solid-fill"
							size="lg"
							className="rounded-none px-cladd-2xs"
						>
							Calculer mes trois taux
							<ArrowRightIcon />
						</Button>
						<a
							href="#comment"
							className="px-cladd-3xs py-cladd-3xs text-cladd-sm font-medium text-plume-douce underline underline-offset-4 hover:text-plume"
						>
							Voir ce que ça donne
						</a>
					</div>
				</div>

				{/*
				  La photographie n'est pas décorative : elle ancre un logiciel de
				  conformité dans la matière qu'il mesure. `object-cover` sur toute la
				  hauteur de la colonne, sans cadre — le cadre servirait à dire « ceci
				  est une capture », et ce n'en est pas une.

				  `aspect-*` en dessous de `lg` : sans hauteur imposée, une image en
				  `h-full` dans une grille à une colonne s'effondre à zéro.
				*/}
				<div className="relative aspect-video border-t border-trait lg:col-span-5 lg:aspect-auto lg:border-t-0 lg:border-l">
					<img
						src="/photos/cuisine-preparation.jpg"
						alt="Cuisinier émincant des poireaux sur une planche, en cuisine professionnelle"
						loading="eager"
						className="absolute inset-0 size-full object-cover"
					/>
				</div>
			</div>

			{/*
			  LA DÉMONSTRATION EST SOUS L'ACCROCHE, PAS À CÔTÉ. Elle a besoin de
			  toute la largeur : trois jauges serrées dans cinq colonnes deviennent
			  trois barres illisibles, et c'est le seul endroit de la page où le
			  visiteur voit vraiment l'écran qu'il achète.

			  ELLE RESPIRE PLUS EN HAUT QU'EN BAS, et ce n'est pas un caprice. Avec
			  le même retrait des deux côtés, le bloc se retrouvait pris en étau
			  entre l'accroche et la section suivante : il se lisait comme un
			  appendice du héros au lieu de la démonstration qu'il est. Le retrait
			  supérieur est donc porté à `respiration` (112 px), soit une fois et
			  demie l'écart normal, ce qui le détache franchement de ce qui précède
			  sans creuser un trou au milieu de la page.
			*/}
			<div className="mx-auto w-full max-w-7xl px-cladd-2xs pt-respiration pb-cladd-2xl">
				<div ref={cible}>
					<Cadre contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs">
						<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs border-b border-trait pb-cladd-3xs">
							<span className="font-serif text-intertitre font-medium">Exercice 2026</span>
							<span className="text-cladd-2xs tracking-wide text-plume-claire uppercase">
								1 842 lignes lues · 7 fournisseurs · 180 000 € d&rsquo;achats
							</span>
						</div>
						<div className="grid gap-cladd-2xs md:grid-cols-3">
							{DEMO.map((t) => (
								<Jauge key={t.titre} {...t} actif={visible} />
							))}
						</div>
					</Cadre>
				</div>
			</div>
		</header>
	);
}

function Jauge({
	titre,
	mesure,
	seuil,
	base,
	actif
}: {
	titre: string;
	mesure: number;
	seuil: number;
	base: number;
	actif: boolean;
}) {
	const anime = useCompteur(mesure, actif);
	const ecart = Math.max(0, Math.round((seuil - anime) * base));
	return <TauxEGalim titre={titre} mesure={anime} seuil={seuil} ecartEuros={ecart} />;
}
