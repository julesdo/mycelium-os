import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Segmented, SegmentedButton, SurfaceCut } from '@cladd-ui/react';
import { ArrowRightIcon, CheckIcon, MinusIcon } from 'lucide-react';
import { BoutonAffiche, cn, prixAffiche } from '../ui';
import {
	CE_QUI_EST_INCLUS,
	DUREE_ESSAI_JOURS,
	FORMULES,
	FORMULE_RECOMMANDEE,
	GRILLE,
	JOURS_DE_REMBOURSEMENT,
	RAPPELS_AVANT_PRELEVEMENT_JOURS,
	mensualiteDeLAnnee,
	moisOfferts,
	type Formule,
	type Rythme
} from '../lib/config/tarifs';
import { getLegalEmailAddress } from '../lib/config/legal';
import { Chapeau, SectionMarketing, TitreSection } from './section';

/**
 * Le prix, en clair.
 *
 * ⚠️ REFAIT LE 14/10/2026 (`docs/superpowers/specs/2026-10-14-pricing-abonnements.md`).
 * La section faisait déclarer un volume de factures pour montrer deux prix (un
 * bilan, un abonnement). Elle montre désormais TROIS FORMULES qu'on choisit
 * (Solo, Équipe, Pro), la bascule au mois ou à l'année (l'année d'abord, ses
 * mois offerts écrits dessus, comme HoneyBook), et la porte gratuite :
 * Découverte, votre bilan sans carte.
 *
 * LES MONTANTS NE SONT PAS ÉCRITS ICI. Ils viennent de `src/lib/config/tarifs.ts`,
 * le module d'où le catalogue Paddle est créé : le montant affiché est celui
 * qui sera prélevé.
 *
 * Les cartes voisines s'alignent ligne à ligne par sous-grille (la règle du
 * site) : le nom, le prix, la liste et le bouton tombent à la même hauteur
 * quelle que soit la longueur des textes.
 *
 * LES COCHES SONT BLEUES, JAMAIS VERTES : le vert du produit ne veut dire
 * qu'une chose, au-dessus du seuil.
 *
 * CE QUI N'EST PAS ÉCRIT. Pas de « le plus populaire » (il n'y a pas encore de
 * clients à compter), pas de prix barré, pas de compte à rebours, et pas un mot
 * qui promette un résultat : le logiciel mesure et relance, ce qui rentre ne
 * dépend pas de lui.
 */
export function Tarifs() {
	const [rythme, setRythme] = useState<Rythme>('annuel');
	const offerts = moisOfferts(FORMULE_RECOMMANDEE);

	return (
		<SectionMarketing id="tarifs" ton="profond" className="light cladd-color-brand gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<TitreSection suite="et votre bilan offert.">Trois formules,</TitreSection>
				<Chapeau>
					Choisissez la vôtre, au mois ou à l’année. {DUREE_ESSAI_JOURS} jours d’essai, 0 €
					aujourd’hui.
				</Chapeau>
			</div>

			<SurfaceCut outline className="w-fit max-w-full rounded-full" contentClassName="p-1">
				<Segmented activeColor="brand" activeVariant="solid-fill">
					<SegmentedButton active={rythme === 'annuel'} onClick={() => setRythme('annuel')}>
						À l’année · {offerts} mois offerts
					</SegmentedButton>
					<SegmentedButton active={rythme === 'mensuel'} onClick={() => setRythme('mensuel')}>
						Au mois
					</SegmentedButton>
				</Segmented>
			</SurfaceCut>

			<div className="cascade grid gap-cladd-sm md:grid-cols-3 md:gap-x-cladd-sm md:gap-y-0">
				{FORMULES.map((f) => (
					<CarteDeFormule key={f} formule={f} rythme={rythme} />
				))}
			</div>

			<ul className="flex flex-col gap-cladd-3xs md:flex-row md:flex-wrap md:gap-x-cladd-sm">
				{[
					`0 € aujourd’hui, ${DUREE_ESSAI_JOURS} jours d’essai`,
					`Un rappel ${RAPPELS_AVANT_PRELEVEMENT_JOURS[1]} jours avant le premier prélèvement`,
					'0 % de commission sur ce qui rentre'
				].map((levee) => (
					<li key={levee} className="flex items-center gap-cladd-3xs text-cladd-md">
						<span
							aria-hidden
							className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teinte-argent text-encre-site"
						>
							<CheckIcon size={13} />
						</span>
						{levee}
					</li>
				))}
			</ul>

			<div className="grid gap-cladd-sm md:grid-cols-2">
				<div className="flex flex-col gap-cladd-3xs rounded-carte-site border-2 border-dashed border-filet-creme p-cladd-xs">
					<span className="text-intertitre font-semibold">Découverte, gratuite</span>
					<p className="text-cladd-md leading-relaxed text-encre-site-douce">
						Pas encore prêt ? Déposez vos factures : vous voyez ce qu’on vous doit, pénalités et
						frais de recouvrement compris. Sans carte, sans limite de temps. Rien ne part tant que
						vous n’avez pas choisi.
					</p>
					<Link
						to="/inscription"
						className="mt-auto flex min-h-11 w-fit items-center gap-cladd-3xs text-cladd-md font-semibold underline underline-offset-4"
					>
						Voir ce qu’on me doit
						<ArrowRightIcon size={18} />
					</Link>
				</div>
				<div className="flex flex-col gap-cladd-3xs rounded-carte-site border-2 border-dashed border-filet-creme p-cladd-xs">
					<span className="text-intertitre font-semibold">Sur mesure</span>
					<p className="text-cladd-md leading-relaxed text-encre-site-douce">
						Plusieurs établissements, plus de dix personnes, un volume qui dépasse Pro ? On
						construit la formule avec vous.
					</p>
					<a
						href={`mailto:${getLegalEmailAddress()}?subject=Formule%20sur%20mesure`}
						className="mt-auto flex min-h-11 w-fit items-center gap-cladd-3xs text-cladd-md font-semibold underline underline-offset-4"
					>
						Nous écrire
						<ArrowRightIcon size={18} />
					</a>
				</div>
			</div>

			<p className="max-w-3xl text-cladd-sm leading-relaxed text-encre-site-douce md:text-cladd-md">
				Prix hors taxes. Paddle, notre revendeur, encaisse le paiement, émet la facture et ajoute la
				TVA de votre pays. Un paiement se rembourse sur demande dans les {JOURS_DE_REMBOURSEMENT}{' '}
				jours.
			</p>
		</SectionMarketing>
	);
}

/** Une formule : son nom, son prix au rythme choisi, ce qu'elle comprend, et l'essai. */
function CarteDeFormule({ formule, rythme }: { formule: Formule; rythme: Rythme }) {
	const grille = GRILLE[formule];
	const avant = formule === FORMULE_RECOMMANDEE;
	const parMois = rythme === 'annuel' ? mensualiteDeLAnnee(formule) : grille.mensuel * 100;

	return (
		<div
			className={cn(
				// Une sous-grille de quatre rangées (nom, prix, liste, bouton) : les prix, les
				// listes et les boutons des trois formules s'alignent, quelle que soit la
				// longueur du texte (« Indépendants et micro-entreprises » tient sur deux lignes).
				'flex flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs md:row-span-4 md:grid md:grid-rows-subgrid md:p-cladd-sm',
				// Sur téléphone, la formule recommandée passe devant.
				avant
					? 'order-first border-2 border-encre-site md:order-none'
					: 'border-2 border-filet-creme'
			)}
		>
			<div className="flex flex-col gap-cladd-3xs">
				<span className="flex flex-wrap items-center gap-cladd-3xs">
					<span className="text-intertitre font-semibold">{grille.nom}</span>
					{avant ? (
						<span className="rounded-full bg-teinte-abricot px-cladd-3xs py-0.5 text-cladd-xs font-semibold">
							recommandée
						</span>
					) : null}
				</span>
				<span className="text-cladd-sm text-encre-site-douce">{grille.pour}</span>
			</div>

			<div className="flex flex-col">
				<span className="flex flex-wrap items-baseline gap-cladd-3xs border-b border-dashed border-filet-creme pb-cladd-3xs">
					<span className="font-serif text-seuil-colonne leading-none font-medium tracking-titre-section whitespace-nowrap tabular-nums">
						{prixAffiche(parMois)}
					</span>
					<span className="text-cladd-sm text-encre-site-claire">
						{rythme === 'annuel'
							? `HT par mois, soit ${prixAffiche(grille.annuel * 100)} par an`
							: 'HT par mois, sans engagement'}
					</span>
				</span>
			</div>

			<ul className="flex flex-col gap-cladd-3xs">
				{CE_QUI_EST_INCLUS.map((l) => {
					const valeur = l.valeurs[formule];
					const inclus = valeur !== false;
					return (
						<li
							key={l.libelle}
							// Sur téléphone, seulement ce qui est COMPRIS.
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
								{typeof valeur === 'string' ? (
									<>
										{l.libelle} : <span className="font-semibold">{valeur}</span>
									</>
								) : (
									l.libelle
								)}
							</span>
						</li>
					);
				})}
			</ul>

			{avant ? (
				<BoutonAffiche as={Link} to="/inscription" fond="jour" pleineLargeur className="mt-auto">
					Essayer {DUREE_ESSAI_JOURS} jours
					<ArrowRightIcon />
				</BoutonAffiche>
			) : (
				<Link
					to="/inscription"
					className="mt-auto flex min-h-11 items-center justify-center gap-cladd-3xs rounded-full border border-encre-site px-cladd-2xs text-cladd-md font-semibold transition-colors hover:bg-teinte-argent"
				>
					Essayer {DUREE_ESSAI_JOURS} jours
					<ArrowRightIcon size={18} />
				</Link>
			)}
		</div>
	);
}
