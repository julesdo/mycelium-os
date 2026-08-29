import { Link } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import { ArrowRightIcon } from 'lucide-react';
import { Tablette } from '../ui';
import { ApercuApplication } from './apercu';
import { FondDessine } from './fond-dessine';

/**
 * L'entrée.
 *
 * CE QU'ELLE DOIT FAIRE EN SEPT SECONDES : dire à un chef de cuisine collective
 * qu'il a une obligation qu'il connaît mal, que son chiffre existe déjà dans
 * ses factures, et lui montrer à quoi ressemble le logiciel qui l'en sort.
 *
 * ⚠️ ELLE EST CENTRÉE, APRÈS AVOIR ÉTÉ DÉSAXÉE, ET C'EST UN AVEU. La version
 * précédente tenait sept colonnes de texte contre cinq de photographie, au nom
 * du principe qu'un axe central ne raconte rien. Le principe est juste dans une
 * page de magazine ; il est faux ici, pour une raison qu'aucun raisonnement ne
 * remplace : on n'avait rien à mettre dans les cinq colonnes. Une photographie
 * de cuisine y disait « alimentaire », pas « logiciel », et le produit — la
 * seule chose que le visiteur soit venu voir — était renvoyé sous la ligne de
 * flottaison, dans un cadre plat qu'on a fini par appeler « une vieille carte
 * de tableau de bord ».
 *
 * Ce qui tient l'écran, ici, c'est LA TABLETTE. Elle est centrée parce qu'un
 * objet posé se centre : le décaler demanderait un contrepoids, et le seul
 * contrepoids disponible serait du texte, c'est-à-dire ce qu'on est en train
 * d'enlever. Trois lignes au-dessus, l'objet en dessous, rien d'autre.
 *
 * LE LAVIS ET LES DESSINS remplacent la photographie. Le dégradé donne au
 * premier écran une profondeur que le blanc n'avait pas ; les dessins au trait
 * disent la cuisine sans occuper de place. Voir `tokens.css` pour la raison du
 * bleu, et `fond-dessine.tsx` pour ce que les dessins évitent.
 *
 * PAS DE CHIFFRE ANIMÉ, ET C'EST UNE CORRECTION. Le compteur qui montait de
 * zéro figeait « 0 % » et « il manque 90 000 € » dans le HTML servi : un robot
 * d'indexation, un aperçu de lien ou un lecteur sans script voyaient trois taux
 * faux. Sur une page dont l'argument entier est l'exactitude de la mesure,
 * c'était le pire endroit possible pour publier un nombre qui n'est pas vrai.
 * L'animation reste là où elle démontre quelque chose : la lecture des factures
 * qui avance, dans `etapes.tsx`.
 *
 * Ce que le héros ne fait pas : promettre. Le mot proscrit dans tout le produit
 * est pris au sérieux jusque dans les tournures — on ne promet pas non plus un
 * résultat par une formule détournée. Le logiciel mesure ; ce que le gérant
 * achète ne dépend que de lui.
 */
export function Hero() {
	return (
		// LE RETRAIT SUPÉRIEUR EST CELUI DE LA BARRE, et il est porté par
		// l'en-tête plutôt que par son contenu : le dégradé remplit le
		// rembourrage, donc l'azur commence bien au tout premier pixel de la
		// fenêtre et passe DERRIÈRE la barre, qui est en `fixed` et ne réserve
		// aucune place. Voir `--spacing-barre-publique`.
		<header className="relative isolate w-full overflow-hidden border-b border-trait bg-linear-to-b from-azur-lavis via-azur-clair to-papier pt-barre-publique text-plume">
			<FondDessine />

			{/* `isolate` sur l'en-tête, et le calque de dessins à `-z-10` : c'est le
			    seul montage qui glisse une couche ENTRE le dégradé de l'en-tête et son
			    contenu. Sans contexte d'empilement, un z-index négatif passerait
			    derrière l'aplat et le calque disparaîtrait ; sans z-index du tout, un
			    élément positionné recouvre ses frères non positionnés — ce sont les
			    dessins qui passeraient devant le titre. */}
			<div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-cladd-2xs px-cladd-2xs pt-cladd-2xl text-center md:pt-respiration">
				<span className="cladd-color-brand w-fit rounded-full bg-cladd-primary/10 px-cladd-3xs py-1 text-cladd-2xs font-semibold tracking-widest text-cladd-primary uppercase">
					Restauration collective · déclaration avant le 31 mars
				</span>

				{/*
				  LA SECONDE LIGNE EST EN ACCENT, et c'est la seule couleur de toute la
				  page hors des jauges. Elle tombe sur « dans vos factures » parce que
				  c'est là qu'est la surprise : tout le monde sait qu'il y a une loi,
				  presque personne ne sait que son chiffre est déjà écrit quelque part.

				  `text-balance` répartit les mots entre les lignes au lieu de laisser
				  la dernière porter un mot seul. Sur un titre de cent pixels, une
				  ligne orpheline se voit à trois mètres.
				*/}
				<h1 className="max-w-5xl font-serif text-affiche leading-none font-medium tracking-tight text-balance">
					Vos trois taux EGalim sont déjà{' '}
					<span className="cladd-color-brand text-cladd-primary">dans vos factures.</span>
				</h1>

				<p className="max-w-xl text-chapeau leading-relaxed font-normal text-balance text-plume-douce">
					Nous les en sortons, ligne par ligne, sur douze mois.
				</p>

				<div className="flex flex-col items-center gap-cladd-3xs pt-cladd-3xs sm:flex-row">
					<Button
						as={Link}
						to="/inscription"
						color="brand"
						variant="solid-fill"
						size="lg"
						rounded
						className="px-cladd-2xs"
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
			  LA TABLETTE DÉBORDE VERS LE BAS, elle ne s'arrête pas au-dessus du
			  filet. Son bord inférieur passe sous la limite de section, ce qui la
			  fait appartenir aux deux : c'est ce chevauchement qui la pose DANS la
			  page au lieu de la ranger dans une case. Le retrait bas est donc plus
			  serré que le haut, à dessein.

			  `max-w-6xl` et pas la pleine largeur : une tablette de 1280px de large
			  n'est plus une tablette, c'est un écran de bureau.
			*/}
			<div className="relative mx-auto w-full max-w-7xl px-cladd-2xs pt-cladd-2xl pb-cladd-sm md:pt-cladd-2xl">
				<Tablette
					className="max-w-6xl"
					description="Letikette sur tablette : l’écran des taux EGalim de l’exercice 2025 — 39 % de produits durables pour un seuil de 50, 21 % de bio pour 20, 42 % sur la viande et le poisson pour 60 — et la répartition des achats par famille."
				>
					<ApercuApplication />
				</Tablette>
			</div>
		</header>
	);
}
