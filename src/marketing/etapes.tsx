import { useState, type ReactNode } from 'react';
import { Surface, Button } from '@cladd-ui/react';
import { FileTextIcon, CameraIcon, TableIcon, RotateCcwIcon } from 'lucide-react';
import {
	CarteProduit,
	FilTravail,
	Repartition,
	EmptyState,
	type Proposition,
	type DocumentEnCours,
	type LigneFamille
} from '../ui';
import { useVisible, useCompteur } from './mouvement';

/**
 * Les quatre étapes, démontrées avec les composants du produit.
 *
 * LA RÈGLE DE CETTE SECTION : aucune maquette. Chaque démonstration est le
 * composant que le gérant verra en se connectant, nourri de données de
 * démonstration, exactement comme la salle d'exposition le fait déjà pour la
 * revue visuelle. Reproduire les écrans à la main donnerait deux vérités qui
 * divergeraient au premier changement, et la page mentirait sans que personne
 * s'en aperçoive.
 *
 * Une seule exception, assumée : le dépôt. `ZoneDepot` est un vrai contrôle qui
 * attend des fichiers ; le poser ici donnerait une zone qui accepte un dépôt et
 * n'en fait rien. On montre donc ce qu'elle accepte, sans faire semblant de
 * l'accepter.
 *
 * L'ORDRE DES ÉTAPES EST L'ORDRE DU TRAVAIL, pas l'ordre de nos écrans. Le
 * gérant dépose, attend, tranche, édite. C'est la seule séquence qu'il aura en
 * tête, et la page doit l'épouser pour qu'il se reconnaisse dedans.
 */

const DOCUMENTS: DocumentEnCours[] = [
	{
		documentId: 'd1',
		filename: 'export-comptable-2026.csv',
		extractionStatus: 'DONE',
		linesCount: 1842
	},
	{
		documentId: 'd2',
		filename: 'facture-maison-bertin-mars.pdf',
		extractionStatus: 'DONE',
		linesCount: 47
	},
	{ documentId: 'd3', filename: 'IMG_4471.jpeg', extractionStatus: 'PENDING', linesCount: 0 }
];

const FAMILLES_DEMO: LigneFamille[] = [
	{ family: 'VIANDE', totalHT: 50400, durableHT: 7100, bioHT: 900 },
	{ family: 'FRUITS_LEGUMES', totalHT: 28800, durableHT: 12600, bioHT: 11800 },
	{ family: 'EPICERIE_APPERTISEE', totalHT: 27000, durableHT: 2400, bioHT: 2400 },
	{ family: 'LAITIERS', totalHT: 25200, durableHT: 6200, bioHT: 4100 },
	{ family: 'EPICERIE_SECHE', totalHT: 19800, durableHT: 14900, bioHT: 14900 },
	{ family: 'BOISSONS', totalHT: 18000, durableHT: 0, bioHT: 0 },
	{ family: 'POISSON', totalHT: 10800, durableHT: 6500, bioHT: 0 }
];

type ProduitDemo = {
	libelle: string;
	occurrences: number;
	montant: number;
	motif: string;
	proposition: Proposition | null;
};

const A_CONFIRMER: ProduitDemo[] = [
	{
		libelle: 'FILET CABILLAUD MSC SURG 5KG',
		occurrences: 34,
		montant: 12480.5,
		motif: 'VIANDE_POISSON',
		proposition: {
			estAlimentaire: true,
			famille: 'POISSON',
			mentions: ['PECHE_DURABLE'],
			justification:
				'La mention MSC atteste une pêche durable, qui compte au titre du durable sans compter au bio.',
			confiance: 0.91
		}
	},
	{
		libelle: 'ENTRECOTE V.B.F. 220G X20',
		occurrences: 18,
		montant: 8940,
		motif: 'VIANDE_POISSON',
		proposition: {
			estAlimentaire: true,
			famille: 'VIANDE',
			mentions: [],
			justification:
				'« Viande bovine française » est une origine, pas une mention qualifiante au barème EGalim.',
			confiance: 0.88
		}
	},
	{
		libelle: 'CAR0TTE RONDELLE 4/4 BIO 2.5KG',
		occurrences: 52,
		montant: 3120.4,
		motif: 'CONFIANCE_BASSE',
		proposition: {
			estAlimentaire: true,
			famille: 'FRUITS_LEGUMES',
			mentions: ['AB'],
			justification: 'La mention BIO figure au libellé ; le certificat fournisseur reste à obtenir.',
			confiance: 0.74
		}
	}
];

export function Etapes() {
	return (
		<section id="comment" className="flex flex-col gap-cladd-md px-cladd-2xs py-cladd-md">
			<div className="flex flex-col gap-cladd-3xs">
				<h2 className="text-letikette-titre leading-tight font-bold tracking-tight md:text-letikette-chiffre">
					Quatre étapes, dont une seule vous demande du temps
				</h2>
				<p className="max-w-2xl text-cladd-sm leading-relaxed text-cladd-fg-soft">
					Les écrans ci-dessous sont ceux du logiciel, pas des images. Vous pouvez confirmer un
					produit pour voir ce que ça fait.
				</p>
			</div>

			<Etape
				numero="1"
				titre="Vous déposez ce que vous avez"
				texte="Un PDF de fournisseur, une photo prise au téléphone dans le bureau, un export de votre comptabilité. On lit ce que vous avez sous la main, pas ce qu'il faudrait avoir."
			>
				<Formats />
			</Etape>

			<Etape
				numero="2"
				titre="Le logiciel lit, vous regardez"
				texte="Chaque facture est découpée en lignes, chaque ligne garde le libellé du fournisseur avec ses abréviations et ses fautes de scan. Le travail se voit pendant qu'il se fait, sans recharger la page."
			>
				<Lecture />
			</Etape>

			<Etape
				numero="3"
				titre="Vous tranchez ce qui vous engage"
				texte="Le logiciel propose un classement et l'explique en une phrase. Vous confirmez ou vous corrigez. La viande et le poisson passent toujours devant vous, quel que soit le niveau de certitude, parce que c'est là que se joue le troisième seuil."
			>
				<Confirmation />
			</Etape>

			<Etape
				numero="4"
				titre="Votre bilan est prêt"
				texte="Les trois taux, la répartition par famille d'achat, les fournisseurs chez qui il reste des attestations à demander. En PDF, daté, avec une signature électronique et l'empreinte du document."
			>
				<Bilan />
			</Etape>
		</section>
	);
}

/**
 * Une étape : le texte à gauche, la démonstration à droite.
 *
 * Le passage à deux colonnes se fait à `lg`, pas à `md` : ces démonstrations
 * sont des écrans denses, et les serrer dans une demi-largeur de tablette les
 * casse. En dessous, tout s'empile, texte puis écran, ce qui est aussi l'ordre
 * de lecture naturel.
 */
function Etape({
	numero,
	titre,
	texte,
	children
}: {
	numero: string;
	titre: string;
	texte: string;
	children: ReactNode;
}) {
	const { cible, visible } = useVisible<HTMLDivElement>();
	return (
		<div
			ref={cible}
			className={
				visible
					? 'grid animate-apparition items-start gap-cladd-2xs lg:grid-cols-2 lg:gap-cladd-md'
					: 'grid items-start gap-cladd-2xs opacity-0 lg:grid-cols-2 lg:gap-cladd-md'
			}
		>
			<div className="flex flex-col gap-cladd-3xs lg:pt-cladd-2xs">
				<span className="flex size-cladd-sm items-center justify-center rounded-full bg-cladd-primary text-cladd-2xs font-bold text-cladd-on-primary tabular-nums">
					{numero}
				</span>
				<h3 className="text-letikette-titre leading-tight font-bold tracking-tight">{titre}</h3>
				<p className="max-w-prose text-cladd-sm leading-relaxed text-cladd-fg-soft">{texte}</p>
			</div>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

/** Ce que le dépôt accepte, sans faire semblant de l'accepter. */
function Formats() {
	const entrees = [
		{ Icone: FileTextIcon, titre: 'PDF de fournisseur', detail: 'Y compris scanné de travers.' },
		{ Icone: CameraIcon, titre: 'Photo prise au téléphone', detail: 'Une facture posée sur le plan.' },
		{ Icone: TableIcon, titre: 'Export comptable', detail: 'CSV ou Excel, des milliers de lignes.' }
	];
	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			{entrees.map(({ Icone, titre, detail }) => (
				<div
					key={titre}
					className="flex items-center gap-cladd-3xs rounded-cladd-xs p-cladd-3xs transition-colors hover:bg-cladd-surface-cut"
				>
					<span className="flex size-cladd-sm shrink-0 items-center justify-center rounded-full bg-cladd-primary/12 text-cladd-primary">
						<Icone size={18} />
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="truncate text-cladd-sm font-semibold">{titre}</span>
						<span className="truncate text-cladd-2xs text-cladd-fg-softer">{detail}</span>
					</span>
				</div>
			))}
		</Surface>
	);
}

/**
 * La lecture en cours, avec le vrai fil de travail.
 *
 * La progression monte de zéro jusqu'à 1 842 lignes quand la section entre à
 * l'écran. `FilTravail` en déduit tout le reste — la barre, le décompte, le
 * passage de « en cours » à « terminé ». On n'anime pas une barre, on anime le
 * nombre de lignes faites, et le composant réagit comme chez un client.
 */
function Lecture() {
	const { cible, visible } = useVisible<HTMLDivElement>();
	const faits = Math.round(useCompteur(1842, visible, 2200));
	return (
		<div ref={cible}>
			<FilTravail
				documents={DOCUMENTS}
				classification={{
					total: 1842,
					faits,
					echoues: 0,
					termine: faits >= 1842,
					recents: []
				}}
			/>
		</div>
	);
}

/**
 * La file de confirmation, réellement jouable.
 *
 * Confirmer retire la carte et fait monter la suivante. C'est le seul endroit
 * de la page où le visiteur agit, et c'est délibéré : le geste qu'on lui vend
 * est celui-là, autant qu'il l'ait fait une fois avant de créer un compte.
 *
 * La correction ouvre normalement une feuille de correction. Ici elle confirme
 * aussi : ouvrir un formulaire d'arbitrage sur une page d'accueil promettrait
 * un écran qu'on ne peut pas livrer sans compte.
 */
function Confirmation() {
	const [faits, setFaits] = useState(0);
	const restants = A_CONFIRMER.slice(faits);

	if (restants.length === 0) {
		return (
			<Surface outline className="rounded-cladd-2xl shadow-carte" contentClassName="p-cladd-2xs">
				<EmptyState
					illustration="🍽️"
					titre="La file est vide."
					explication="Chez vous, un libellé confirmé l'est pour de bon. Il ne reviendra pas l'an prochain, et le consensus entre cantines en retire encore."
					action={
						<Button variant="solid" onClick={() => setFaits(0)}>
							<RotateCcwIcon />
							Rejouer
						</Button>
					}
				/>
			</Surface>
		);
	}

	const produit = restants[0];
	if (!produit) return null;
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<CarteProduit
				key={produit.libelle}
				libelle={produit.libelle}
				occurrences={produit.occurrences}
				montant={produit.montant}
				motif={produit.motif}
				proposition={produit.proposition}
				onConfirmer={() => setFaits((n) => n + 1)}
				onCorriger={() => setFaits((n) => n + 1)}
			/>
			<span className="text-cladd-2xs text-cladd-fg-softer">
				{restants.length} produit{restants.length > 1 ? 's' : ''} dans la file de démonstration.
			</span>
		</div>
	);
}

/** La répartition par famille, telle qu'elle apparaît dans le bilan. */
function Bilan() {
	const { cible, visible } = useVisible<HTMLDivElement>();
	return (
		<div ref={cible} className={visible ? 'animate-apparition' : 'opacity-0'}>
			<Repartition lignes={FAMILLES_DEMO} />
		</div>
	);
}
