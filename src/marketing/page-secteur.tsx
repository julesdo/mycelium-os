import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, CheckIcon, XIcon } from 'lucide-react';
import { BoutonAffiche, LienAffiche, cn } from '../ui';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';
import { articlesPublies } from './blog';
import { CarteArticle } from './blog-pages';
import { Calcul } from './calcul';
import { Faq } from './faq';
import { CarteMetier, SceneDuMetier } from './metiers';
import { SCENES_DES_METIERS } from './scenes-metiers';
import {
	Chapeau,
	EcranProduit,
	SectionMarketing,
	TitreSection,
	fondDeTeinte,
	type TeinteSite
} from './section';
import {
	pageDuSecteur,
	PILIER_DU_SECTEUR,
	SECTEURS_PUBLICS,
	type EcranDuMetier,
	type PageDeSecteur
} from './secteurs';

/**
 * UNE PAGE PAR MÉTIER (18/10/2026), REFAITE LE 19/10 pour donner envie de lire et
 * convertir. Le fondateur : « s'inspirer de Mobbin pour produire des pages secteurs qui
 * donnent envie d'être lues et surtout qui convertissent, avec des images et des
 * illustrations, ainsi que des écrans de l'app spécifiques aux secteurs bien mis en scène ».
 *
 * L'ordre suit la question du visiteur :
 *
 *   1. le héros : l'argument du métier, le bouton, et la SCÈNE (photo, vraie capture aux
 *      données du métier, cartes flottantes), visible au téléphone aussi ;
 *   2. ce que dit la loi, en trois CHIFFRES sourcés, lus au registre ;
 *   3. ce qui change : sans logiciel, puis avec (V7) ;
 *   4. Letikette sur des factures comme les siennes : deux écrans du métier, puis la page
 *      où son client paie ;
 *   5. le calculateur, ouvert sur le bon régime ;
 *   6. l'offre d'entrée, lue dans la grille ;
 *   7. ses questions, puis les autres métiers (le maillage interne).
 *
 * Le contenu vit dans `secteurs.ts` (lu au registre) et `scenes-metiers.ts` (l'exemple).
 */

const LEVEES = [
	'Diagnostic gratuit',
	`${DUREE_ESSAI_JOURS} jours d’essai, 0 € aujourd’hui`,
	'Sans engagement'
];

/** La page où le client paie : la même pour tous les métiers, et la dernière à montrer. */
const ECRAN_PAIEMENT: EcranDuMetier = {
	capture: 'paiement',
	titre: 'Votre client paie par virement.',
	texte:
		'Chaque relance porte un lien vers une page à votre nom : le montant, la référence et votre IBAN, facture par facture. Le virement arrive sur votre compte ; Letikette ne touche à aucun fonds.',
	description:
		'La page où le client paie, à votre nom : le reste à régler, les coordonnées du virement à copier et le détail facture par facture.'
};

/** Les teintes des cartes de chiffres : celles des familles du produit, jamais de seuil. */
const TEINTES_DES_CHIFFRES: readonly TeinteSite[] = ['argent', 'temps', 'abricot'];

function BoutonDiagnostic() {
	return (
		<BoutonAffiche as={Link} to="/inscription" search={{ pour: 'diagnostic' } as never} fond="jour">
			Combien vous doit-on ?
			<ArrowRightIcon />
		</BoutonAffiche>
	);
}

function Heros({ page }: { page: PageDeSecteur }) {
	return (
		<SectionMarketing ton="creme" className="gap-cladd-lg pt-32 md:pt-40">
			{/* Sept colonnes au texte : le titre est une phrase, à 72 px il lui faut la place. */}
			<div className="grid items-center gap-cladd-xl md:grid-cols-12">
				<div className="flex flex-col gap-cladd-2xs md:col-span-7">
					<p className="text-cladd-sm font-semibold text-encre-site-douce">{page.nom}</p>
					<h1 className="font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance md:text-titre-section">
						{page.titre}
					</h1>
					<Chapeau>{page.chapeau}</Chapeau>
					<div className="flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
						<BoutonDiagnostic />
						<LienAffiche href="#calcul" className="justify-center text-encre-site">
							Faire le calcul
						</LienAffiche>
					</div>
					<ul className="flex flex-wrap gap-x-cladd-xs gap-y-1 text-cladd-sm text-encre-site-douce">
						{LEVEES.map((levee) => (
							<li key={levee} className="flex items-center gap-1.5">
								<CheckIcon aria-hidden size={16} className="text-encre-site" />
								{levee}
							</li>
						))}
					</ul>
				</div>
				<div className="md:col-span-5">
					<SceneDuMetier secteur={page.secteur} description={page.ecrans[0]?.description ?? ''} />
				</div>
			</div>
		</SectionMarketing>
	);
}

/** Trois chiffres de la loi, chacun avec sa source : ils se vérifient. */
function Chiffres({ page }: { page: PageDeSecteur }) {
	return (
		<SectionMarketing ton="creme" className="gap-cladd-sm pt-0 md:pt-0">
			<TitreSection>Ce que dit la loi.</TitreSection>
			{/* Le carrousel au téléphone : trois cartes empilées y faisaient 1 400 px. */}
			<div className="carrousel -mx-cladd-2xs flex snap-x snap-mandatory gap-cladd-2xs overflow-x-auto px-cladd-2xs pb-cladd-3xs md:mx-0 md:grid md:grid-cols-3 md:gap-cladd-sm md:overflow-visible md:px-0">
				{page.points.map((point, rang) => (
					<article
						key={point.titre}
						className={cn(
							'flex w-4/5 shrink-0 snap-center flex-col gap-cladd-2xs rounded-carte-site p-cladd-xs md:row-span-3 md:grid md:w-auto md:grid-rows-subgrid md:p-cladd-sm',
							fondDeTeinte(TEINTES_DES_CHIFFRES[rang % TEINTES_DES_CHIFFRES.length] ?? 'argent')
						)}
					>
						<h3 className="flex flex-col gap-1">
							{point.chiffre === null ? null : (
								<span className="font-serif text-affiche-colonne leading-none font-medium whitespace-nowrap tabular-nums">
									{point.chiffre}
								</span>
							)}
							<span className="text-intertitre leading-snug font-semibold">{point.titre}</span>
						</h3>
						<p className="text-cladd-md leading-relaxed text-encre-site-douce">{point.texte}</p>
						<p className="text-cladd-sm text-encre-site-douce opacity-80">{point.source}</p>
					</article>
				))}
			</div>
		</SectionMarketing>
	);
}

/** Sans logiciel, puis avec : des faits, quatre de chaque côté. */
function AvantApres({ page }: { page: PageDeSecteur }) {
	const teinte = SCENES_DES_METIERS[page.secteur].teinte;
	return (
		<SectionMarketing ton="profond" className="gap-cladd-lg">
			<TitreSection>Ce qui change, concrètement.</TitreSection>
			<div className="grid gap-cladd-sm md:grid-cols-2">
				<article className="flex flex-col gap-cladd-xs rounded-carte-site bg-creme p-cladd-xs md:p-cladd-sm">
					<h3 className="text-intertitre leading-snug font-semibold text-encre-site-douce">
						Sans logiciel
					</h3>
					<ul className="flex flex-col gap-cladd-2xs">
						{page.avant.map((ligne) => (
							<li
								key={ligne}
								className="flex gap-2.5 text-cladd-md leading-relaxed text-encre-site-douce"
							>
								<XIcon aria-hidden size={18} className="mt-0.5 shrink-0 opacity-60" />
								{ligne}
							</li>
						))}
					</ul>
				</article>
				<article
					className={cn(
						'flex flex-col gap-cladd-xs rounded-carte-site p-cladd-xs shadow-carte-chaude md:p-cladd-sm',
						fondDeTeinte(teinte)
					)}
				>
					<h3 className="text-intertitre leading-snug font-semibold">Avec Letikette</h3>
					<ul className="flex flex-col gap-cladd-2xs">
						{page.avec.map((ligne) => (
							<li key={ligne} className="flex gap-2.5 text-cladd-md leading-relaxed">
								<CheckIcon aria-hidden size={18} className="mt-0.5 shrink-0" />
								{ligne}
							</li>
						))}
					</ul>
				</article>
			</div>
		</SectionMarketing>
	);
}

/**
 * LES ÉCRANS DU MÉTIER, en rangées alternées (Toggl, Acctual) : le texte d'un côté, le
 * téléphone coupé dans sa carte teintée de l'autre, comme sur la page Sécurité.
 */
function Ecrans({ page }: { page: PageDeSecteur }) {
	const scene = SCENES_DES_METIERS[page.secteur];
	const ecrans = [...page.ecrans, ECRAN_PAIEMENT];
	return (
		<SectionMarketing ton="creme" className="gap-cladd-xl">
			<TitreSection>Letikette, sur des factures comme les vôtres.</TitreSection>
			<div className="flex flex-col gap-cladd-xl">
				{ecrans.map((ecran, rang) => (
					<article
						key={ecran.capture}
						className="grid items-center gap-cladd-sm md:grid-cols-2 md:gap-cladd-xl"
					>
						<div className={cn('flex flex-col gap-cladd-2xs', rang % 2 === 1 && 'md:order-2')}>
							<h3 className="font-serif text-titre-section leading-tight font-medium text-balance">
								{ecran.titre}
							</h3>
							<p className="text-cladd-md leading-relaxed text-encre-site-douce md:text-chapeau">
								{ecran.texte}
							</p>
						</div>
						<div
							className={cn(
								'flex h-80 justify-center overflow-clip rounded-carte-site px-cladd-xs pt-cladd-sm md:h-112',
								fondDeTeinte(rang === ecrans.length - 1 ? 'papiers' : scene.teinte)
							)}
						>
							<EcranProduit
								capture={ecran.capture}
								description={ecran.description}
								className="w-56 self-start md:w-64"
							/>
						</div>
					</article>
				))}
			</div>
		</SectionMarketing>
	);
}

/** L'offre d'entrée, et le seul bouton plein de la fin de page avant l'appel commun. */
function Offre({ page }: { page: PageDeSecteur }) {
	return (
		<SectionMarketing ton="creme" className="pt-0 md:pt-0">
			<div className="flex flex-col gap-cladd-sm rounded-carte-site bg-teinte-abricot p-cladd-sm md:flex-row md:items-center md:justify-between md:gap-cladd-xl md:p-cladd-lg">
				<div className="flex max-w-2xl flex-col gap-cladd-2xs">
					<h2 className="font-serif text-titre-section leading-tight font-medium text-balance">
						{page.offre.titre}
					</h2>
					<p className="text-cladd-md leading-relaxed text-encre-site-douce">{page.offre.texte}</p>
				</div>
				<div className="flex shrink-0 flex-col items-stretch gap-cladd-3xs sm:flex-row sm:items-center md:flex-col md:items-stretch">
					<BoutonDiagnostic />
					<LienAffiche href="/tarifs" className="justify-center text-encre-site">
						Voir les tarifs
					</LienAffiche>
				</div>
			</div>
		</SectionMarketing>
	);
}

/**
 * À LIRE : les articles publiés du métier (son pilier), les plus récents d'abord. Le blog
 * s'écrit d'avance et publie un article à son jour : la section grandit seule, et se tait
 * tant qu'aucun n'est paru.
 */
function ALire({ page }: { page: PageDeSecteur }) {
	const articles = articlesPublies()
		.filter((article) => article.pilier === PILIER_DU_SECTEUR[page.secteur])
		.slice(0, 3);
	if (articles.length === 0) return null;
	return (
		<SectionMarketing ton="creme" className="gap-cladd-lg">
			<TitreSection>À lire.</TitreSection>
			<ul className="grid gap-cladd-lg md:grid-cols-3 md:gap-x-cladd-sm">
				{articles.map((article) => (
					<li key={article.adresse} className="md:row-span-4 md:grid md:grid-rows-subgrid">
						<CarteArticle article={article} />
					</li>
				))}
			</ul>
		</SectionMarketing>
	);
}

/** Les autres métiers : le maillage entre pages, en cartes qui mènent. */
function AutresMetiers({ page, jour }: { page: PageDeSecteur; jour: string }) {
	const autres = SECTEURS_PUBLICS.filter((secteur) => secteur !== page.secteur);
	return (
		<SectionMarketing ton="creme" className="gap-cladd-lg">
			<TitreSection>Les autres métiers.</TitreSection>
			{/* Trois colonnes au bureau seulement : plus étroite, la carte de l'écran se tronque. */}
			<div className="carrousel -mx-cladd-2xs flex snap-x snap-mandatory gap-cladd-2xs overflow-x-auto px-cladd-2xs pb-cladd-3xs md:-mx-cladd-sm md:px-cladd-sm lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
				{autres.map((secteur) => (
					<CarteMetier
						key={secteur}
						secteur={secteur}
						accroche={pageDuSecteur(secteur, jour).accroche}
						className="w-4/5 shrink-0 snap-center md:w-2/5 lg:w-auto"
					/>
				))}
			</div>
		</SectionMarketing>
	);
}

export function PageSecteur({ page, jour }: { page: PageDeSecteur; jour: string }) {
	return (
		<>
			<Heros page={page} />
			<Chiffres page={page} />
			<AvantApres page={page} />
			<Ecrans page={page} />
			<Calcul secteurInitial={page.regime} />
			<Offre page={page} />
			<ALire page={page} />
			<Faq id="questions" titre={`${page.nom}\u00a0: vos questions.`} questions={page.questions} />
			<AutresMetiers page={page} jour={jour} />
		</>
	);
}
