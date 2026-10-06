import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Segmented, SegmentedButton, SurfaceCut } from '@cladd-ui/react';
import { ArrowRightIcon, CheckIcon, MinusIcon } from 'lucide-react';
import { BoutonAffiche, cn, euros } from '../ui';
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
import { Chapeau, SectionMarketing, SurTitre, TitreSection } from './section';

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
 * ⚠️ DEUX RESTES D'EGALIM DORMAIENT DANS CE COMMENTAIRE, ET ILS SONT CORRIGÉS
 * ICI : « trois paliers par couverts servis chaque jour » et « on choisit sa
 * taille de cantine ». C'est exactement le défaut relevé sur les trois raisons
 * de l'abonnement, qui sont restées en EGalim pendant vingt jours EN LIGNE : on
 * réécrit le cadre et on oublie ce qu'il contient. Un commentaire faux ne casse
 * rien et fait écrire faux à la personne suivante.
 *
 * ⚠️ LE PRIX DÉPEND DE LA TAILLE, ET ON NE FAIT PAS DEVINER. Trois paliers, par
 * nombre de FACTURES ÉMISES PAR AN. Deux mauvaises façons de le présenter ont
 * été écartées :
 *
 *   « À PARTIR DE X € » ne dit rien à qui émet trois mille factures, et le
 *   laisse soupçonner que le vrai prix se négocie. Sur cette cible-là, le
 *   soupçon suffit à fermer l'onglet.
 *
 *   LES SIX MONTANTS D'UN COUP — trois paliers fois deux offres, plus les
 *   bornes — donnent un tableau que personne ne lit. Le visiteur n'a besoin que
 *   de SA ligne.
 *
 * Un sélecteur de palier rend donc les deux prix qui le concernent, et rien
 * d'autre. C'est un réglage MÉTIER, pas un curseur : on choisit son volume de
 * facturation, une donnée qu'un dirigeant connaît, jamais un paramètre à
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
		titre: 'La première mesure',
		colonne: 'bilan',
		cadence: 'une fois',
		argument:
			'Vos impayés lus en une fois. Vous saurez ce qui est encore récupérable, et ce qui va s’éteindre, en euros.',
		appel: 'Commencer par la mesure'
	},
	{
		titre: 'L’abonnement',
		colonne: 'abonnement',
		cadence: 'par mois',
		argument:
			'Vos échéances surveillées toute l’année : ce qui arrive à terme, et ce qui approche de la date limite pour agir en justice.',
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
		<SectionMarketing
			id="tarifs"
			ton="profond"
			courbe
			className="light cladd-color-brand gap-cladd-lg"
		>
			<div className="flex flex-col gap-cladd-2xs">
				<SurTitre teinte="argent">{`Le prix · ${DUREE_ESSAI_JOURS} jours d’essai`}</SurTitre>
				<TitreSection suite="et ce que ça couvre.">Ce que ça coûte,</TitreSection>
				<Chapeau>
					Le prix suit le nombre de factures que vous émettez chaque année. Le logiciel, lui, est le
					même pour tout le monde.
				</Chapeau>
			</div>

			<div className="flex flex-col gap-cladd-3xs">
				<span className="text-cladd-sm font-semibold">
					Combien de factures émettez-vous par an ?
				</span>
				<SurfaceCut outline className="w-fit max-w-full rounded-full" contentClassName="p-1">
					<Segmented activeColor="brand" activeVariant="solid-fill">
						{PALIERS.map((p) => (
							<SegmentedButton key={p} active={p === palier} onClick={() => setPalier(p)}>
								{BORNES_COURTES[p]}
							</SegmentedButton>
						))}
					</Segmented>
				</SurfaceCut>
			</div>

			<div className="cascade grid gap-cladd-sm md:grid-cols-2 md:gap-cladd-lg">
				{OFFRES.map((o) => (
					<div
						key={o.titre}
						className={cn(
							'flex flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs md:p-cladd-sm',
							// Sur téléphone, l'offre recommandée passe devant : on lit d'abord celle qu'on conseille.
							o.avant ? 'carte-decalee order-first md:order-none' : 'border border-filet-creme'
						)}
					>
						<div className="flex flex-col gap-cladd-3xs">
							<span className="flex flex-wrap items-center gap-cladd-3xs">
								<span className="text-intertitre font-semibold">{o.titre}</span>
								{o.avant ? (
									<span className="manuscrit autocollant rounded-full bg-teinte-abricot px-cladd-3xs py-0.5 text-cladd-md">
										recommandé
									</span>
								) : null}
							</span>
							<span className="flex flex-wrap items-baseline gap-cladd-3xs border-b border-dashed border-filet-creme pb-cladd-3xs">
								<span className="font-serif text-seuil-colonne leading-none font-medium tracking-titre-section tabular-nums">
									{euros(montant(palier, o.colonne))}
								</span>
								<span className="text-cladd-sm text-encre-site-claire">HT, {o.cadence}</span>
							</span>
							<p className="text-cladd-md leading-relaxed text-encre-site-douce">{o.argument}</p>
						</div>

						<ul
							// La liste de l'offre ponctuelle se lit à côté de l'autre, en grand ; sur
							// téléphone, son prix et sa phrase suffisent.
							className={cn('flex-col gap-cladd-3xs', o.avant ? 'flex' : 'hidden md:flex')}
						>
							{CE_QUI_EST_INCLUS.map((l) => {
								const inclus = l[o.colonne];
								return (
									<li
										key={l.libelle}
										// Sur téléphone, seulement ce qui est COMPRIS : la liste des « non » se lit
										// à côté de l'autre offre, là où les deux colonnes tiennent.
										className={cn('items-start gap-cladd-3xs', inclus ? 'flex' : 'hidden md:flex')}
									>
										<span
											aria-hidden
											className={cn(
												'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
												inclus
													? 'bg-teinte-argent text-encre-site'
													: 'bg-creme-profonde text-encre-site-claire'
											)}
										>
											{inclus ? <CheckIcon size={13} /> : <MinusIcon size={13} />}
										</span>
										<span
											className={cn(
												'text-cladd-sm leading-snug',
												inclus ? 'text-encre-site' : 'text-encre-site-claire line-through'
											)}
										>
											{l.libelle}
										</span>
									</li>
								);
							})}
						</ul>

						{o.avant ? (
							<BoutonAffiche
								as={Link}
								to="/inscription"
								fond="jour"
								pleineLargeur
								className="mt-auto"
							>
								{o.appel}
								<ArrowRightIcon />
							</BoutonAffiche>
						) : (
							<Link
								to="/inscription"
								className="mt-auto flex items-center justify-center gap-cladd-3xs rounded-full border border-encre-site px-cladd-2xs py-cladd-3xs text-cladd-md font-semibold transition-colors hover:bg-teinte-argent"
							>
								{o.appel}
								<ArrowRightIcon size={18} />
							</Link>
						)}
					</div>
				))}
			</div>

			<p className="max-w-3xl text-cladd-sm leading-relaxed text-encre-site-douce md:text-cladd-md">
				{DUREE_ESSAI_JOURS} jours d’essai, sans carte bancaire. Prix hors taxes, sans engagement.{' '}
				<span className="hidden md:inline">
					Vous voyez ce qu’on vous doit et vos échéances avant de décider quoi que ce soit ; la
					facturation est assurée par Paddle. Votre palier,{' '}
					<span className="font-semibold text-encre-site">{BORNES_PALIER[palier]}</span>, se
					confirme dans vos réglages, à partir du volume que vous déclarez.
				</span>
			</p>
		</SectionMarketing>
	);
}
