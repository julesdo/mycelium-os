import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Segmented, SegmentedButton, SurfaceCut } from '@cladd-ui/react';
import { ArrowRightIcon, CheckIcon, MinusIcon } from 'lucide-react';
import { cn, euros } from '../ui';
import {
	BORNES_COURTES,
	BORNES_PALIER,
	CE_QUI_EST_INCLUS,
	DUREE_ESSAI_JOURS,
	PALIERS,
	TARIFS,
	type ColonneOffre,
	type PalierTaille
} from '../lib/config/tarifs';
import { SectionMarketing, TitreSection } from './section';

/**
 * Le prix, en clair.
 *
 * POURQUOI IL FALLAIT L'ÉCRIRE. La page défendait l'abonnement pendant une
 * section entière — « la déclaration est annuelle, le suivi ne l'est pas » — et
 * ne disait jamais combien. Sur un logiciel de conformité vendu à des gérants
 * qui arbitrent au budget, c'est la question qu'on vient chercher, et une page
 * qui ne la traite pas envoie le visiteur demander un devis, c'est-à-dire nulle
 * part.
 *
 * LES MONTANTS NE SONT PAS ÉCRITS ICI. Ils viennent de
 * `src/lib/config/tarifs.ts`, le module que lit aussi le serveur pour choisir
 * l'identifiant de prix Paddle. C'est la seule façon d'être certain que le
 * montant affiché sur la page publique est celui qui sera prélevé — un écart
 * entre les deux ne casserait rien, ne lèverait aucune exception, et se
 * découvrirait par un client qui aurait raison de râler.
 *
 * ⚠️ LE PRIX DÉPEND DE LA TAILLE, ET ON NE FAIT PAS DEVINER. Trois paliers, par
 * couverts servis chaque jour. Deux mauvaises façons de le présenter ont été
 * écartées :
 *
 *   « À PARTIR DE 190 € » ne dit rien à qui sert six cents couverts, et le
 *   laisse soupçonner que le vrai prix se négocie. Sur cette cible-là, le
 *   soupçon suffit à fermer l'onglet.
 *
 *   LES NEUF MONTANTS D'UN COUP — trois paliers fois deux offres, plus les
 *   bornes — donnent un tableau que personne ne lit. Le visiteur n'a besoin que
 *   de SA ligne.
 *
 * Un sélecteur de palier rend donc les deux prix qui le concernent, et rien
 * d'autre. C'est un réglage MÉTIER, pas un curseur : on choisit sa taille de
 * cantine, une donnée qu'un gérant connaît par cœur, jamais un paramètre à
 * régler.
 *
 * ICI, UNE SURFACE POSÉE EST LÉGITIME, et c'est presque le seul endroit de la
 * page hors des captures d'écran. Deux offres qu'on compare AVANT DE PAYER sont
 * exactement ce qu'une carte sert à faire : elle délimite ce qu'on achète. La
 * règle générale — le texte vit à même le fond — vaut contre les cartes qui
 * n'encadrent rien ; elle n'a jamais interdit celles qui encadrent une décision.
 *
 * LES COCHES SONT BLEUES, JAMAIS VERTES. Le vert du produit ne veut dire qu'une
 * chose : au-dessus du seuil. Une liste de fonctionnalités cochées en vert, à
 * deux écrans des vraies jauges, brouillerait la seule couleur que le gérant
 * doit lire sans réfléchir.
 *
 * CE QUI N'EST PAS ÉCRIT. Pas de « le plus populaire » — il n'y a pas encore de
 * clients, et l'inventer serait un faux. Pas de prix barré, pas de compte à
 * rebours, pas de troisième colonne « Entreprise, nous contacter » qui
 * n'existerait dans aucun code. Et pas un mot qui promette un résultat : le
 * logiciel mesure, ce que le gérant achète ne dépend que de lui.
 */

type Offre = {
	titre: string;
	colonne: ColonneOffre;
	cadence: string;
	argument: string;
	appel: string;
	/** Une seule offre est mise en avant, sinon plus aucune ne l'est. */
	avant?: boolean;
};

const OFFRES: Offre[] = [
	{
		titre: 'Le premier bilan',
		colonne: 'bilan',
		cadence: 'une fois',
		argument:
			'Douze mois de factures lus en une fois. Vous saurez où vous en êtes, et ce qu’il manque, en euros.',
		appel: 'Commencer par le bilan'
	},
	{
		titre: 'L’abonnement',
		colonne: 'abonnement',
		cadence: 'par mois',
		argument:
			'Votre chiffre reste à jour toute l’année, et votre déclaration de mars est prête avant mars.',
		appel: 'Prendre l’abonnement',
		avant: true
	}
];

function montant(palier: PalierTaille, colonne: ColonneOffre): number {
	return colonne === 'bilan' ? TARIFS[palier].bilan : TARIFS[palier].abonnementMensuel;
}

export function Tarifs() {
	const [palier, setPalier] = useState<PalierTaille>('S');

	return (
		<SectionMarketing id="tarifs" fond="papier">
			<TitreSection
				sur="Tarifs"
				titre="Ce que ça coûte"
				chapeau="Le prix suit le nombre de couverts que vous servez chaque jour. Le produit, lui, est le même pour tout le monde."
			/>

			{/*
			  LE SÉLECTEUR EST UN VRAI `Segmented`, dans un `SurfaceCut`, comme la
			  barre de l'application. C'est le cas d'école du composant — un choix
			  unique dans un petit ensemble — et le reconstruire à la main avec trois
			  boutons perdrait ce que le kit porte tout seul : la taille propagée,
			  l'élément actif qui remonte en relief dans le creux, et le fait qu'on ne
			  puisse pas cliquer sur celui où l'on est déjà.
			*/}
			<div className="flex flex-col gap-cladd-3xs">
				<span className="text-cladd-sm font-semibold text-plume-douce">
					Combien de couverts servez-vous par jour ?
				</span>
				<SurfaceCut outline className="w-fit rounded-full" contentClassName="p-1">
					<Segmented activeColor="brand" activeVariant="solid-fill">
						{PALIERS.map((p) => (
							<SegmentedButton key={p} active={p === palier} onClick={() => setPalier(p)}>
								{BORNES_COURTES[p]}
							</SegmentedButton>
						))}
					</Segmented>
				</SurfaceCut>
			</div>

			{/* Les deux cartes s'étirent à la même hauteur — c'est le défaut de la
			    grille, et il faut se garder d'y poser `items-start`. Sans lui, la
			    carte recommandée dépasse de deux pixels à cause de son contour
			    doublé, et les deux boutons d'appel ne tombent plus sur la même ligne.
			    Deux pixels de décalage sur les seuls boutons de la section : personne
			    ne sait dire pourquoi, tout le monde le voit. */}
			<div className="grid gap-cladd-2xs md:grid-cols-2">
				{OFFRES.map((o) => (
					<div
						key={o.titre}
						className={cn(
							'cladd-color-brand flex flex-col gap-cladd-2xs rounded-panneau bg-papier p-cladd-2xs md:p-cladd-xs',
							// L'offre mise en avant se distingue par son CONTOUR, pas par une
							// couleur de fond : un aplat bleu derrière une liste de sept
							// lignes en rendrait cinq illisibles, et c'est le prix qu'on veut
							// voir en premier, pas la carte.
							o.avant
								? 'border-2 border-cladd-primary shadow-pose-haute'
								: 'border border-trait shadow-pose'
						)}
					>
						<div className="flex flex-col gap-cladd-3xs">
							<span className="flex flex-wrap items-center gap-cladd-3xs">
								<span className="font-serif text-intertitre font-medium">{o.titre}</span>
								{o.avant ? (
									<span className="rounded-full bg-cladd-primary/10 px-cladd-3xs py-1 text-cladd-2xs font-semibold tracking-widest text-cladd-primary uppercase">
										Recommandé
									</span>
								) : null}
							</span>

							{/*
							  LE MONTANT EST LE PLUS GROS CORPS DE LA SECTION, et il change
							  sous l'œil quand on déplace le sélecteur — c'est ce mouvement,
							  et lui seul, qui fait comprendre que le prix dépend de la
							  taille sans qu'une phrase ait à l'expliquer.
							*/}
							<span className="flex flex-wrap items-baseline gap-cladd-3xs">
								<span className="font-serif text-titre-section leading-none font-medium tabular-nums">
									{euros(montant(palier, o.colonne))}
								</span>
								<span className="text-cladd-sm text-plume-claire">HT, {o.cadence}</span>
							</span>

							<p className="text-cladd-md leading-relaxed text-plume-douce">{o.argument}</p>
						</div>

						<ul className="flex flex-col gap-cladd-3xs">
							{CE_QUI_EST_INCLUS.map((l) => {
								const inclus = l[o.colonne];
								return (
									<li key={l.libelle} className="flex items-start gap-cladd-3xs">
										<span
											aria-hidden
											className={cn(
												'flex size-5 shrink-0 items-center justify-center rounded-full',
												inclus
													? 'bg-cladd-primary/12 text-cladd-primary'
													: 'bg-papier-chaud text-plume-claire'
											)}
										>
											{inclus ? <CheckIcon size={13} /> : <MinusIcon size={13} />}
										</span>
										{/* Ce qui manque est GRISÉ, jamais barré. Un texte rayé se lit
										    comme une promesse retirée ; le gris et le trait dans la
										    pastille disent « pas dans cette offre-ci », ce qui est la
										    vérité. C'est aussi le réglage de l'écran d'abonnement du
										    produit, et les deux doivent se ressembler. */}
										<span
											className={cn(
												'text-cladd-sm leading-snug',
												inclus ? 'text-plume' : 'text-plume-claire'
											)}
										>
											{l.libelle}
										</span>
									</li>
								);
							})}
						</ul>

						<Button
							as={Link}
							to="/inscription"
							color="brand"
							variant={o.avant ? 'solid-fill' : 'solid'}
							rounded
							className="mt-auto w-full"
						>
							{o.appel}
							<ArrowRightIcon />
						</Button>
					</div>
				))}
			</div>

			{/*
			  LA LIGNE DE BAS DE GRILLE RÉPOND AUX TROIS QUESTIONS QUI RESTENT, et
			  elle les répond dans l'ordre où elles se posent : est-ce que je
			  m'engage, qu'est-ce que je paie vraiment, et qui me facture.

			  Le vendeur de registre est nommé. Ce n'est pas une précaution
			  juridique de plus : le prélèvement portera « Paddle » sur le relevé,
			  et un gérant qui ne reconnaît pas le nom appelle sa banque.
			*/}
			<p className="max-w-3xl text-cladd-md leading-relaxed text-plume-douce">
				{DUREE_ESSAI_JOURS} jours d&rsquo;essai, sans carte bancaire : vous voyez vos trois taux
				avant de décider quoi que ce soit. Les montants sont hors taxes, sans engagement de durée,
				et la facturation est assurée par Paddle. Votre palier —{' '}
				<span className="font-semibold text-plume">{BORNES_PALIER[palier]}</span> — se confirme dans
				vos réglages, à partir des couverts que vous déclarez.
			</p>
		</SectionMarketing>
	);
}
