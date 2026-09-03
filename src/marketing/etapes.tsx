import { useState, type ReactNode } from 'react';
import { Button, Chip, Surface } from '@cladd-ui/react';
import { RotateCcwIcon } from 'lucide-react';
import {
	cn,
	FluxEvenements,
	Decompte,
	EmptyState,
	type EvenementAffiche,
	type DecompteAffiche
} from '../ui';
import { SectionMarketing, TitreSection, Cadre, Inventaire } from './section';

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
 * façon de le diluer.
 */

/** Ce que l'import accepte. Une liste, pas trois cartes : c'est un inventaire. */
const FORMATS = [
	{
		titre: 'Export comptable',
		detail: 'Un FEC, ou un CSV. Le plus complet, et rien n’est relu par une machine.'
	},
	{ titre: 'Facture en PDF', detail: 'Quand l’export n’est pas sous la main.' },
	{ titre: 'Photo prise au téléphone', detail: 'Une facture retrouvée dans un dossier.' }
] as const;

/**
 * LES CHIFFRES SE TIENNENT ENTRE EUX : 9 240,00 + 18 450,00 + 31 200,50 +
 * 249,90 = 59 140,40 €. Sur une page dont l'argument est l'exactitude d'un
 * décompte, un jeu dont les totaux ne tombent pas juste est une faute.
 */
const EVENEMENTS: EvenementAffiche[] = [
	{
		type: 'PRESCRIPTION_PROCHE',
		reference: 'FA-2021-0087',
		montant: 924_000n,
		urgence: 'CRITIQUE',
		explication: 'La facture FA-2021-0087 est PRESCRITE depuis le 14 août 2026.',
		action: 'Ne plus engager de frais sur cette facture : la créance est éteinte.'
	},
	{
		type: 'ECHEANCE_PROCEDURE',
		reference: 'Ateliers Martin',
		montant: 1_845_000n,
		urgence: 'CRITIQUE',
		explication: 'Signification de l’ordonnance : il reste 9 jours avant le 12 septembre.',
		action: 'Faire signifier sans délai — passée cette date, le droit est perdu.'
	},
	{
		type: 'CREANCE_MURE',
		reference: 'Fournitures Durand',
		montant: 3_120_050n,
		urgence: 'HAUTE',
		explication: 'La créance atteint le seuil de qualification : quatre factures, toutes échues.',
		action: 'Examiner les procédures envisageables pour cette créance.'
	},
	{
		type: 'FACTURE_ECHUE',
		reference: 'FA-2026-0311',
		montant: 24_990n,
		urgence: 'NORMALE',
		explication: 'La facture FA-2026-0311 est échue depuis le 1er août et reste due.',
		action: 'Rattacher cette facture à une créance, ou enregistrer son règlement.'
	}
];

/**
 * Le décompte de démonstration, calculé au taux légal réel.
 *
 * 10 000 € exigibles au 1er mai, arrêtés au 3 septembre, un règlement de
 * 4 000 € au 1er juillet. Les deux périodes portent le taux BCE majoré de dix
 * points de chaque semestre — 12,15 % puis 12,40 % — et leurs intérêts font
 * exactement le total affiché : 20 305 + 21 063 = 41 368 centimes.
 */
const DECOMPTE: DecompteAffiche = {
	arreteAu: '2026-09-03',
	convention: 'ACT_365',
	principalRestantDu: 600_000n,
	interets: 41_368n,
	indemniteForfaitaire: 4_000n,
	total: 645_368n,
	lignes: [
		{
			reference: 'FA-2026-118',
			principalRestantDu: 600_000n,
			interets: 41_368n,
			indemniteForfaitaire: 4_000n,
			total: 645_368n,
			segments: [
				{
					debut: '2026-05-01',
					fin: '2026-07-01',
					jours: 61,
					principal: 1_000_000n,
					taux: { numerateur: 1215n, denominateur: 10_000n },
					baseAnnuelle: 365,
					interets: 20_305n
				},
				{
					debut: '2026-07-01',
					fin: '2026-09-03',
					jours: 64,
					principal: 600_000n,
					taux: { numerateur: 1240n, denominateur: 10_000n },
					baseAnnuelle: 365,
					interets: 21_063n
				}
			]
		}
	]
};

export function Etapes() {
	return (
		<SectionMarketing id="comment" fond="froid" className="gap-cladd-2xl">
			<TitreSection
				titre="Quatre étapes, dont une seule vous demande du temps"
				chapeau="Les écrans ci-dessous sont ceux du logiciel. Répondez à la question pour voir."
			/>

			<Etape
				numero="01"
				titre="Vous importez ce que vous avez"
				texte="Vos factures existent déjà, structurées, dans votre comptabilité. On les lit là où elles sont plutôt que de vous les faire re-scanner."
				apres={
					<Inventaire as="dl">
						{FORMATS.map((f) => (
							<div
								key={f.titre}
								className="flex flex-wrap items-baseline justify-between gap-cladd-3xs py-cladd-3xs"
							>
								<dt className="text-cladd-md font-semibold">{f.titre}</dt>
								<dd className="text-cladd-sm text-plume-claire">{f.detail}</dd>
							</div>
						))}
					</Inventaire>
				}
			>
				{/*
				  LE BILAN D'IMPORT, ET NON LA ZONE DE DÉPÔT. `ZoneDepot` est un vrai
				  contrôle qui attend des fichiers ; le poser ici donnerait une zone
				  qui accepte un dépôt et n'en fait rien.

				  Ce qu'on montre à la place est plus intéressant : ce que le logiciel
				  RÉPOND. Y compris les deux lignes qu'il n'a pas su lire — un import
				  qui annonce « 312 factures » sans les mentionner ment par omission,
				  et l'omission porte sur l'argent qu'on ne réclamera pas.
				*/}
				<Cadre contentClassName="p-cladd-2xs">
					<BilanImport />
				</Cadre>
			</Etape>

			<Etape
				inverse
				numero="02"
				titre="Le logiciel repère ce qui bouge"
				texte="Ce qui arrive à échéance, ce qui devient mûr, ce qui approche de la prescription. Chaque ligne porte son montant : vous savez quoi traiter en premier."
			>
				<Cadre contentClassName="p-cladd-2xs">
					<FluxEvenements
						evenements={EVENEMENTS}
						montantIdentifie={5_914_040n}
						hypotheses={[]}
						anglesMorts={[]}
					/>
				</Cadre>
			</Etape>

			<Etape
				numero="03"
				titre="Vous tranchez ce qui vous engage"
				texte="Le logiciel déduit tout ce qu'il peut lire : le montant, l'échéance, la qualité des parties. Il ne vous demande que ce qu'aucune facture ne dit."
			>
				<Cadre contentClassName="p-cladd-2xs">
					<Question />
				</Cadre>
			</Etape>

			<Etape
				inverse
				numero="04"
				titre="Votre décompte se refait à la main"
				texte="Chaque euro réclamé montre d'où il vient : quel principal, quel taux, sur combien de jours. C'est ce que fera le débiteur qui le conteste."
			>
				<Cadre contentClassName="p-cladd-2xs">
					<Decompte decompte={DECOMPTE} />
				</Cadre>
			</Etape>
		</SectionMarketing>
	);
}

/**
 * Le compte-rendu d'un import, tel que l'écran le rend.
 *
 * IL DIT AUSSI CE QUI N'A PAS MARCHÉ, et c'est le point. Trois catégories
 * distinctes : ce qui est entré, ce qui a été écarté À BON DROIT — les
 * contreparties de produit et de TVA d'une écriture de vente — et ce qui n'a
 * PAS PU être lu, avec sa raison.
 */
function BilanImport() {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<Surface contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs">
				<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
					<span className="text-cladd-sm font-semibold">export-comptable-2026.txt</span>
					<Chip size="md" color="green">
						Lu
					</Chip>
				</div>
				<p className="text-cladd-xs text-plume-claire">
					312 factures enregistrées, 118 règlements, 47 débiteurs créés.
				</p>
				<p className="text-cladd-xs text-plume-claire">
					624 écritures hors périmètre (produits, TVA, trésorerie) — écartées à bon droit.
				</p>
				<p className="text-cladd-xs font-semibold">2 lignes n’ont pas pu être lues :</p>
				<p className="text-cladd-xs text-plume-claire">· Montant illisible en débit ou en crédit.</p>
				<p className="text-cladd-xs text-plume-claire">
					· Écriture sur compte client sans référence de pièce.
				</p>
			</Surface>
		</div>
	);
}

/**
 * Une étape : cinq colonnes de texte, sept de démonstration, en Z.
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
					<span className="cladd-color-brand w-fit rounded-full bg-cladd-primary/8 px-cladd-3xs py-1 text-cladd-2xs font-bold tracking-widest text-cladd-primary tabular-nums">
						Étape {numero}
					</span>
					<h3 className="font-serif text-titre-section leading-tight font-medium tracking-tight">
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
 * La seule question que le logiciel pose, réellement jouable.
 *
 * C'EST L'ARGUMENT DE LA SECTION, PAS UNE ILLUSTRATION. Trois des quatre
 * conditions légales se déduisent des données : le montant est chiffré, la
 * date d'échéance est passée, la qualité de commerçant est au dossier. La
 * quatrième — la créance est-elle contestée — ne se lit dans aucune facture,
 * parce que l'absence de contestation CONNUE n'est pas une absence de
 * contestation.
 *
 * Le visiteur fait donc, une fois, le seul geste que le produit lui demande.
 */
function Question() {
	const [reponse, setReponse] = useState<'ok' | 'ko' | null>(null);

	if (reponse === 'ko') {
		return (
			<EmptyState
				illustration="🛑"
				titre="La procédure simplifiée se referme."
				explication="Une contestation, même infondée, y met fin. Mieux vaut le savoir avant d’avoir payé un commissaire de justice qu’après."
				action={
					<Button variant="solid" rounded onClick={() => setReponse(null)}>
						<RotateCcwIcon />
						Rejouer
					</Button>
				}
			/>
		);
	}

	if (reponse === 'ok') {
		return (
			<EmptyState
				illustration="✅"
				titre="La créance est qualifiée."
				explication="Les quatre conditions sont tranchées. Le décompte peut être arrêté, et les procédures envisageables s’affichent."
				action={
					<Button variant="solid" rounded onClick={() => setReponse(null)}>
						<RotateCcwIcon />
						Rejouer
					</Button>
				}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<Surface contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs">
				<div className="flex flex-wrap items-center gap-1.5">
					<Chip size="md" color="green">
						Montant chiffré
					</Chip>
					<Chip size="md" color="green">
						Échéance passée
					</Chip>
					<Chip size="md" color="green">
						Entre commerçants
					</Chip>
				</div>
				<p className="text-cladd-xs text-plume-claire">
					Déduits de vos factures. Le logiciel ne vous les redemande pas.
				</p>
			</Surface>

			<Surface contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs">
				<p className="text-cladd-md font-semibold">
					Cette créance a-t-elle déjà fait l’objet d’une réclamation&nbsp;?
				</p>
				<p className="text-cladd-xs text-plume-claire">
					Fournitures Durand · 4 factures · 31 200,50 €
				</p>
				<div className="flex flex-wrap gap-cladd-3xs">
					<Button size="lg" color="brand" variant="solid-fill" onClick={() => setReponse('ok')}>
						Non, aucune
					</Button>
					<Button size="lg" variant="transparent" onClick={() => setReponse('ko')}>
						Oui, le client a contesté
					</Button>
				</div>
			</Surface>
		</div>
	);
}
