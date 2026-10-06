import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { BoutonAffiche, FAMILLES, LienAffiche, PERSONNAGES, PortraitDessine } from '../ui';
import { eurosCentimesCourts } from '../ui/format';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { EcranProduit, Photo, SurTitre } from './section';

/**
 * L'ENTRÉE — le papier chaud (06/10/2026).
 *
 * CE QU'ELLE DOIT FAIRE EN SEPT SECONDES : dire à un gérant qu'une partie de ses
 * impayés a une date limite, que la loi lui doit plus qu'il ne croit, et que
 * quelqu'un s'en occupe avec lui.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ PLUS DE NUIT, PLUS DE TÉLÉPHONE DESSINÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le héros était noir, sous un ciel de nébuleuse, avec l'écran d'accueil rendu
 * en composants dans une coque SVG. Sur téléphone, il faisait saccader la page
 * (constat du fondateur), et il disait « instrument » à une cible qui a besoin
 * d'entendre « de votre côté ». Il est désormais sur le papier crème, avec une
 * capture PNG du vrai écran (`EcranProduit`), deux galets et deux cartes posées
 * à la main — Podia pour les formes, Fruitful pour le téléphone qui flotte avec
 * sa carte, Quicken pour les données autour de l'objet.
 *
 * ⚠️ LE CHIFFRE DE LA CARTE EST LU SUR LES PARAMÈTRES, et il disparaît plutôt
 * que d'être faux : `estUtilisable` exige une valeur relevée sur une source
 * citable. C'est la règle la plus stricte du projet.
 *
 * ⚠️ AUCUNE PROMESSE. Le logiciel mesure et prévient ; ce que le gérant en fait
 * ne dépend que de lui.
 */

function indemniteLisible(): string | null {
	const indemnite = PARAMETRES.indemniteForfaitaire;
	if (!estUtilisable(indemnite) || indemnite.valeur === null) return null;
	return eurosCentimesCourts(indemnite.valeur);
}

/** La date limite que montre la carte : celle de l'écran d'accueil de démonstration. */
const DATE_LIMITE_DEMO = '1 mai 2031';

export function Hero() {
	const indemnite = indemniteLisible();
	const { Picto: PictoTemps } = FAMILLES.TEMPS;
	const { Picto: PictoArgent } = FAMILLES.ARGENT;

	return (
		// LE RETRAIT SUPÉRIEUR EST CELUI DE LA BARRE : elle est en `fixed` et ne
		// réserve aucune place. Voir `--spacing-barre-publique`.
		<header className="relative isolate w-full overflow-clip bg-creme pt-barre-publique text-encre-site">
			{/* Les galets du fond. Décoratifs, coupés au bord de l'en-tête. */}
			<div
				aria-hidden
				className="galet -top-16 -right-24 -z-10 size-80 bg-teinte-abricot md:-right-10 md:size-130"
			/>
			<div
				aria-hidden
				className="galet galet-b top-1/2 -left-28 -z-10 size-64 bg-teinte-temps md:-left-16 md:size-96"
			/>

			<div className="mx-auto flex w-full max-w-6xl flex-col items-center px-cladd-2xs pt-cladd-xl md:px-cladd-sm md:pt-cladd-2xl">
				<div className="leve-suite flex flex-col items-center gap-cladd-2xs text-center">
					<span className="leve">
						<SurTitre>Pour les PME qui facturent d’autres entreprises</SurTitre>
					</span>

					{/* ⚠️ COURTE, ET C'EST LA CONTRAINTE PRINCIPALE. La phrase est restée la
					    même depuis deux refontes, parce qu'elle tient en une seconde : tout
					    le monde sait qu'il a des impayés, presque personne ne sait qu'ils
					    ont une date limite. Le trait à la main dit où regarder. */}
					<h1 className="leve max-w-4xl font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
						Vos impayés ont une <span className="souligne-main whitespace-nowrap">date limite</span>
						.
					</h1>

					<p className="leve max-w-2xl text-chapeau leading-relaxed text-encre-site-douce">
						Letikette surveille cette date sur chacune de vos factures, et calcule au centime les
						pénalités et les frais que vos clients vous doivent. Rien ne part sans vous.
					</p>

					{/* ⚠️ UNE SEULE PILULE, ET UN LIEN. Deux boutons pleins côte à côte
					    annulent l'action principale. */}
					<div className="leve flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
						<BoutonAffiche as={Link} to="/inscription" fond="jour">
							Voir ce qu’on me doit
							<ArrowRightIcon />
						</BoutonAffiche>
						<LienAffiche href="#comment" className="justify-center text-encre-site">
							Comment ça marche
						</LienAffiche>
					</div>

					{/* La levée de risque à l'endroit où l'objection naît : devant le bouton. */}
					<p className="leve text-cladd-sm text-encre-site-claire">
						Trente jours d’essai. Aucune carte bancaire.
					</p>

					{/* DES VISAGES DÈS LE PREMIER ÉCRAN : les trois gérants des situations
					    types, dessinés, qui mènent à leur section. Ce ne sont pas des
					    clients et rien ne le prétend : « pour des gérants comme eux ». */}
					<a
						href="#pour-qui"
						className="leve flex items-center gap-cladd-3xs rounded-full bg-papier py-1 pr-cladd-2xs pl-1 shadow-carte-chaude"
					>
						<span className="flex -space-x-2.5">
							{[PERSONNAGES.karim, PERSONNAGES.sophie, PERSONNAGES.julien].map(
								(personnage, rang) => (
									<PortraitDessine
										key={rang}
										personnage={personnage}
										fond="var(--color-teinte-abricot)"
										className="size-10 rounded-full ring-2 ring-papier"
									/>
								)
							)}
						</span>
						<span className="manuscrit text-intertitre leading-none">
							pour des gérants comme eux
						</span>
					</a>
				</div>

				{/*
				  LA SCÈNE : un gérant au travail, et son téléphone posé dessus.

				  ⚠️ QUICKEN POUR LE GESTE : une vraie personne au travail, et les
				  données posées autour d'elle. Le premier écran montrait un téléphone
				  seul sur du crème ; il montre désormais POUR QUI est le téléphone. La
				  photo nomme un métier, pas une personne : aucun prénom à côté.

				  ⚠️ LES CARTES SONT DU TEXTE, PAS DES IMAGES, et le montant de la
				  première vient des paramètres, pas d'un dessin.
				*/}
				<div className="leve leve-tard relative mt-cladd-xl mb-24 w-full max-w-sm md:mt-cladd-2xl md:mb-32 md:max-w-md">
					<div
						aria-hidden
						className="galet galet-c -inset-x-6 -inset-y-8 -z-10 bg-galet-abricot opacity-60"
					/>
					<div className="overflow-hidden rounded-carte-site shadow-carte-chaude">
						<Photo
							photo="artisan"
							prioritaire
							sizes="(min-width: 768px) 448px, 90vw"
							description="Un artisan souriant à son établi, dans son atelier de menuiserie."
							className="aspect-4/5 object-right"
						/>
					</div>
					<span className="manuscrit autocollant absolute -top-4 right-4 rounded-full bg-papier px-cladd-2xs py-1 text-intertitre shadow-carte-chaude">
						lui, il a des chantiers à finir
					</span>

					{/* Le téléphone, posé sur la photo : le vrai écran d'accueil.
					    ⚠️ La position va sur l'ENVELOPPE : `.ecran-telephone` pose
					    `position: relative` hors couche, et l'emporte sur `absolute`. */}
					<div className="absolute -right-3 -bottom-16 w-36 rotate-3 md:-right-24 md:-bottom-20 md:w-52">
						<EcranProduit
							capture="aujourdhui"
							prioritaire
							description="L’écran d’accueil de Letikette sur téléphone : 66 704,82 € dus au 17 septembre 2026 sur 4 factures en retard, dont 18 443,92 € de pénalités et de frais jamais réclamés, puis la liste des clients à traiter aujourd’hui."
						/>
					</div>

					{indemnite === null ? null : (
						<div className="flotte autocollant absolute -bottom-10 -left-3 flex w-44 flex-col gap-1 rounded-cladd-xl bg-papier p-cladd-3xs text-left shadow-carte-chaude md:-bottom-8 md:-left-24 md:w-52">
							<span className="flex items-center gap-cladd-3xs">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-cladd-sm bg-teinte-argent">
									<PictoArgent className="size-5 text-encre-site" />
								</span>
								<span className="font-serif text-titre-section leading-none font-medium tabular-nums">
									{indemnite}
								</span>
							</span>
							<span className="text-cladd-xs leading-snug text-encre-site-douce">
								dus par facture en retard, de plein droit
							</span>
							<span className="manuscrit text-cladd-md text-encre-site-claire">c’est la loi !</span>
						</div>
					)}

					{/* La date limite, en grand écran seulement : sur téléphone, la photo,
					    le téléphone et une carte suffisent à remplir l'écran. */}
					<div className="flotte flotte-tard autocollant-droite absolute top-24 -left-32 hidden w-52 flex-col gap-1 rounded-cladd-xl bg-papier p-cladd-3xs text-left shadow-carte-chaude md:flex lg:-left-40">
						<span className="flex items-center gap-cladd-3xs">
							<span className="flex size-8 shrink-0 items-center justify-center rounded-cladd-sm bg-teinte-temps">
								<PictoTemps className="size-5 text-encre-site" />
							</span>
							<span className="text-cladd-xs font-semibold">Date limite pour agir</span>
						</span>
						<span className="font-serif text-intertitre leading-tight font-medium tabular-nums">
							{DATE_LIMITE_DEMO}
						</span>
						<span className="text-cladd-xs leading-snug text-encre-site-douce">
							Surveillée chaque nuit, facture par facture.
						</span>
					</div>
				</div>
			</div>
		</header>
	);
}
