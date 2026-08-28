import { useState, type ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { RotateCcwIcon } from 'lucide-react';
import {
	cn,
	CarteProduit,
	FilTravail,
	Repartition,
	EmptyState,
	type Proposition,
	type DocumentEnCours,
	type LigneFamille
} from '../ui';
import { useVisible, useCompteur } from './mouvement';
import { SectionMarketing, TitreSection, Cadre } from './section';

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
 * LA GRILLE EST ASYMÉTRIQUE, CINQ CONTRE SEPT. Elle était en deux moitiés
 * égales, ce qui produit deux colonnes parallèles sur toute la hauteur, un
 * couloir vide au milieu, et aucune raison pour l'œil de descendre. Le texte
 * n'a pas besoin d'autant de place qu'un écran ; lui en donner autant est une
 * décision de gabarit, pas une décision de lecture.
 *
 * LE SENS DE LECTURE ALTERNE, une étape sur deux. C'est le balancement qui fait
 * avancer, et il ne coûte qu'un `order` au-delà de `lg`.
 *
 * LES CADRES SONT RÉSERVÉS AUX ÉCRANS. Le texte vit à même le papier ; ce qui
 * est encadré, c'est ce qui est MONTRÉ — une capture de l'interface, une
 * photographie. C'est la règle qui empêche la page de redevenir une grille de
 * cartes, et elle se vérifie d'un coup d'œil : s'il y a une bordure, il y a une
 * preuve derrière.
 *
 * PLUS D'APPARITION AU DÉFILEMENT, et pour deux raisons cumulées.
 *
 * La première est un défaut réel : le rendu serveur ne connaît pas
 * `IntersectionObserver`, il posait donc `animate-apparition` là où le
 * navigateur posait `opacity-0` à l'hydratation. React signalait la divergence à
 * chaque chargement de la page d'accueil, et une section entière restait
 * momentanément transparente selon qui gagnait la course.
 *
 * La seconde est de fond : un bloc qui se dévoile en fondu quand on descend est
 * la signature exacte du gabarit qu'on quitte. Une page qui doit dire « rigueur
 * juridique » n'a pas à faire de l'effet en défilant ; ses sections sont là,
 * comme les articles d'un contrat le sont.
 *
 * `useVisible` reste employé, mais pour ce à quoi il sert vraiment : DÉCLENCHER
 * une démonstration — la montée des jauges, la progression de lecture — jamais
 * pour décider si un texte est visible. Dans ce rôle il ne change aucune classe,
 * donc il ne peut plus produire de divergence.
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
			justification:
				'La mention BIO figure au libellé ; le certificat fournisseur reste à obtenir.',
			confiance: 0.74
		}
	}
];

/** Ce que le dépôt accepte. Une liste, pas trois cartes : c'est un inventaire. */
const FORMATS = [
	{ titre: 'PDF de fournisseur', detail: 'Y compris scanné de travers.' },
	{ titre: 'Photo prise au téléphone', detail: 'Une facture posée sur le plan de travail.' },
	{ titre: 'Export comptable', detail: 'CSV ou Excel, des milliers de lignes.' }
] as const;

export function Etapes() {
	return (
		<SectionMarketing id="comment" fond="froid" className="gap-cladd-2xl">
			<TitreSection
				titre="Quatre étapes, dont une seule vous demande du temps"
				chapeau="Les écrans ci-dessous sont ceux du logiciel, pas des maquettes. Confirmez un produit pour voir."
			/>

			<Etape
				numero="01"
				titre="Vous déposez ce que vous avez"
				texte="Aucun format à respecter, aucun fichier à préparer. On lit ce que vous avez sous la main, pas ce qu'il faudrait avoir."
				apres={
					<dl className="divide-y divide-trait border-y border-trait">
						{FORMATS.map((f) => (
							<div
								key={f.titre}
								className="flex flex-wrap items-baseline justify-between gap-cladd-3xs py-cladd-3xs"
							>
								<dt className="text-cladd-md font-semibold">{f.titre}</dt>
								<dd className="text-cladd-sm text-plume-claire">{f.detail}</dd>
							</div>
						))}
					</dl>
				}
			>
				{/*
				  Une photographie, et non une démonstration : cette étape-là n'a pas
				  d'écran à montrer. `ZoneDepot` est un vrai contrôle qui attend des
				  fichiers ; le poser ici donnerait une zone qui accepte un dépôt et
				  n'en fait rien.
				*/}
				<div className="relative aspect-video overflow-hidden rounded-net border border-trait lg:aspect-square">
					<img
						src="/photos/cuisine.jpg"
						alt="Chef de cuisine au piano dans une cuisine professionnelle"
						loading="lazy"
						className="absolute inset-0 size-full object-cover"
					/>
				</div>
			</Etape>

			<Etape
				inverse
				numero="02"
				titre="Le logiciel lit, vous regardez"
				texte="Vous ne saisissez rien. Chaque ligne est lue avec le libellé du fournisseur, abréviations et fautes de scan comprises. Et vous voyez le travail avancer, sans recharger la page."
			>
				<Cadre contentClassName="p-cladd-2xs">
					<Lecture />
				</Cadre>
			</Etape>

			<Etape
				numero="03"
				titre="Vous tranchez ce qui vous engage"
				texte="Chaque classement vous est proposé, expliqué en une phrase. Vous confirmez, ou vous corrigez. La viande et le poisson passent toujours devant vous : c'est là que se joue le troisième seuil, et c'est vous qui signez."
			>
				<Cadre contentClassName="p-cladd-2xs">
					<Confirmation />
				</Cadre>
			</Etape>

			<Etape
				inverse
				numero="04"
				titre="Votre bilan est prêt"
				texte="Vos trois taux, la répartition par famille, et la liste des fournisseurs à relancer pour une attestation. En PDF daté et signé, prêt à sortir devant un contrôle."
			>
				<Cadre contentClassName="p-cladd-2xs">
					<Bilan />
				</Cadre>
			</Etape>
		</SectionMarketing>
	);
}

/**
 * Une étape : cinq colonnes de texte, sept de démonstration, en Z.
 *
 * LE NUMÉRO EST UNE MENTION, PAS UNE PASTILLE. C'était un disque bleu de
 * quarante pixels — le vocabulaire d'un guide de démarrage. Un chiffre en serif,
 * gris, aligné sur le filet, se lit comme la numérotation d'un article : c'est
 * le même registre que le reste de la page.
 *
 * Le passage à deux colonnes se fait à `lg`, pas à `md` : ces démonstrations
 * sont des écrans denses, et les serrer dans une demi-largeur de tablette les
 * casse. En dessous, tout s'empile, texte puis écran, ce qui est aussi l'ordre
 * de lecture naturel — et l'alternance disparaît d'elle-même, parce qu'un Z n'a
 * aucun sens sur une seule colonne.
 */
function Etape({
	numero,
	titre,
	texte,
	apres,
	inverse = false,
	children
}: {
	numero: string;
	titre: string;
	texte: string;
	/** Ce qui suit le paragraphe, dans la colonne de texte. */
	apres?: ReactNode;
	/** L'écran passe à gauche et le texte à droite, au-delà de `lg`. */
	inverse?: boolean;
	children: ReactNode;
}) {
	return (
		<div className="grid items-start gap-cladd-xs lg:grid-cols-12 lg:gap-cladd-2xl">
			<div className={cn('flex flex-col gap-cladd-2xs lg:col-span-5', inverse && 'lg:order-2')}>
				<div className="flex flex-col gap-cladd-3xs">
					<span className="border-b border-trait pb-cladd-3xs font-serif text-intertitre font-medium text-plume-claire tabular-nums">
						{numero}
					</span>
					<h3 className="font-serif text-titre-section-etroite leading-tight font-medium tracking-tight">
						{titre}
					</h3>
					<p className="max-w-prose text-cladd-md leading-relaxed font-normal text-plume-douce">
						{texte}
					</p>
				</div>
				{apres}
			</div>
			<div className={cn('min-w-0 lg:col-span-7', inverse && 'lg:order-1')}>{children}</div>
		</div>
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
			<EmptyState
				illustration="🍽️"
				titre="La file est vide."
				explication="Chez vous, un produit confirmé l'est pour de bon. Il ne reviendra pas l'an prochain."
				action={
					<Button variant="solid" className="rounded-none" onClick={() => setFaits(0)}>
						<RotateCcwIcon />
						Rejouer
					</Button>
				}
			/>
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
			<span className="text-cladd-2xs text-plume-claire">
				{restants.length} produit{restants.length > 1 ? 's' : ''} dans la file de démonstration.
			</span>
		</div>
	);
}

/** La répartition par famille, telle qu'elle apparaît dans le bilan. */
function Bilan() {
	return <Repartition lignes={FAMILLES_DEMO} />;
}
