import { useState, type ReactNode } from 'react';
import { Button, Chip, Surface } from '@cladd-ui/react';
import { RotateCcwIcon } from 'lucide-react';
import {
	cn,
	ScenePointeur,
	FluxEvenements,
	Decompte,
	EmptyState,
	type EvenementAffiche,
	type DecompteAffiche
} from '../ui';
import { SectionMarketing, CadreNuit, Capacites } from './section';

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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES CAPACITÉS, ET LA GRAMMAIRE QU'ELLES SUIVENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ CHAQUE LIGNE COMMENCE PAR UN VERBE ET PORTE UN CHIFFRE, UN FORMAT OU UNE
 * HEURE. C'est la grammaire relevée le 23 septembre 2026 dans la page de
 * Revolut Business, où aucune puce n'est abstraite : « Exchange 25+ currencies
 * at the interbank rate », « Integrate with Pennylane, Sage, Odoo, and 45+
 * other tools ». Jamais « des paiements simplifiés ».
 *
 * La raison tient debout : un dirigeant qui lit « surveillance intelligente »
 * ne sait pas ce qu'il achète, et il a raison de ne pas le croire. « Relever le
 * BODACC à quatre heures du matin » se vérifie.
 *
 * ⚠️ ET CHAQUE LIGNE CORRESPOND À DU CODE QUI TOURNE. Cette liste a été écrite
 * en relisant les modules, pas de mémoire :
 *
 *   FEC, CSV, dépôt, Factur-X  →  `import/exportComptable.ts:68`, `FormatExport`
 *   BODACC à 4 h, briefing à 6 h  →  `convex/crons.ts`, `radarSolvabilite`
 *   prescription par secteur  →  `pays/france/prescription.ts`
 *   rapprochement des règlements  →  `lettrage.ts`
 *   certain / liquide / exigible  →  `qualification.ts`
 *   ce qu'un acte laisserait  →  `controle.ts`
 *   intérêts période par période  →  `decompte.ts`
 *   remise au conseil  →  `ui/remise-conseil.tsx`
 *
 * ⚠️ CE QUI N'Y FIGURE PAS, ET POURQUOI. La connexion bancaire existe et son
 * rattrapage tourne toutes les six heures (`crons.ts`, `synchroQonto`), mais
 * elle n'a jamais été exercée contre un vrai compte : l'essai en bac à sable
 * attend des identifiants. « Le doute ne profite jamais au produit » vaut aussi
 * pour la page d'accueil. Le rapprochement des règlements est annoncé parce
 * qu'il se fait DÉJÀ depuis l'export comptable, qui les porte. La banque
 * entrera le jour où l'essai sera passé.
 */
const FORMATS = [
	'Lire un FEC, le fichier que tout logiciel comptable sait produire, et en tirer les factures de vente, les règlements et les débiteurs.',
	'Lire une facture Factur-X et le XML qu’elle embarque, sans passer par un modèle.',
	'Accepter une facture déposée en PDF ou photographiée, quand l’export n’est pas sous la main.',
	'Écarter les doublons et les écritures hors périmètre, en les comptant et en disant lesquelles.'
] as const;

const SURVEILLANCE = [
	'Relever le BODACC à quatre heures du matin sur vos débiteurs, et vous le dire à six.',
	'Suivre la prescription facture par facture, au régime du secteur de chacune.',
	'Rapprocher les règlements des factures qu’ils soldent, pour ne pas relancer un client qui a payé.'
] as const;

const QUALIFICATION = [
	'Déduire le caractère certain, liquide et exigible de ce qui est déjà au dossier.',
	'Poser la seule question qu’aucune facture ne répond, et horodater ce que vous répondez.',
	'Chiffrer ce qu’un acte laisserait de côté, avant qu’il soit produit.'
] as const;

const DECOMPTE_CAPACITES = [
	'Décomposer les intérêts période par période : quel principal, quel taux, sur combien de jours.',
	'Figer un décompte à sa date, définitivement. Rejouer en produit un nouveau, daté.',
	'Réunir les pièces et les remettre à votre avocat ou à votre commissaire de justice.'
] as const;

/**
 * LES CHIFFRES SE TIENNENT ENTRE EUX. Chaque ligne affiche son propre montant
 * (9 240,00 / 18 450,00 / 31 200,50 / 249,90 €), mais le compteur cumulé ne
 * somme QUE les deux factures distinctes — PRESCRIPTION_PROCHE FA-2021-0087 et
 * FACTURE_ECHUE FA-2026-0311, soit 9 240,00 + 249,90 = 9 489,90 € — jamais la
 * créance mûre ni l'échéance de procédure, qui sont des vues agrégées de la
 * même monnaie. Voir `montantIdentifie` dans `verticales/recouvrement/surveillance.ts`.
 * Sur une page dont l'argument est l'exactitude d'un décompte, un jeu dont les
 * totaux ne tombent pas juste est une faute.
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
		// ⚠️ LA PERTE SE DIT, L'ACTE NE SE COMMANDE PAS : « Faire signifier sans
		// délai » est un impératif sur un acte de procédure, que la ligne rouge 3
		// interdit. Le constat reste, le geste redevient d'ouvrir un écran.
		explication:
			'Signification de l’ordonnance : il reste 9 jours avant le 12 septembre. Passée cette ' +
			'date, le droit est perdu.',
		action: 'Ouvrir ce dossier : la date limite et son journal y sont.'
	},
	{
		type: 'CREANCE_MURE',
		reference: 'Fournitures Durand',
		montant: 3_120_050n,
		urgence: 'HAUTE',
		explication:
			'Sur la créance Fournitures Durand, le caractère certain, le caractère liquide, le ' +
			'caractère exigible et la qualité de commerçant des deux parties sont établis, et ' +
			'aucun risque bloquant n’est relevé.',
		action:
			'Ouvrir cette créance : les conditions établies et les pièces qui les soutiennent y sont.'
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
		<SectionMarketing id="comment" className="gap-cladd-2xl">
			{/* LE RAIL TECHNIQUE, comme sur le premier écran et sur la loi. */}
			<div className="flex items-center justify-between gap-cladd-2xs border-b border-dashed border-filet-nuit pb-cladd-3xs text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase">
				<span>Le logiciel</span>
				<span className="tabular-nums">4 gestes</span>
			</div>

			<div className="flex flex-col gap-cladd-2xs">
				<h2 className="apparait max-w-4xl font-affiche text-titre-section leading-tight font-semibold tracking-titre-section text-balance">
					Quatre gestes,{' '}
					<span className="text-craie-claire">un seul vous demande du temps.</span>
				</h2>
				<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
					Les écrans ci-dessous sont ceux du logiciel, remplis de données de démonstration. Le
					troisième se joue.
				</p>
			</div>

			<Etape
				numero="01"
				titre="Vos factures sont déjà écrites"
				texte="On les lit là où elles sont, plutôt que de vous les faire ressaisir."
				capacites={FORMATS}
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
				<CadreNuit contentClassName="p-cladd-2xs">
					<BilanImport />
				</CadreNuit>
			</Etape>

			<Etape
				inverse
				numero="02"
				titre="Le logiciel regarde toutes les nuits"
				texte="Ce qui arrive à échéance, ce qui devient mûr, ce qui approche de la prescription."
				capacites={SURVEILLANCE}
			>
				<CadreNuit contentClassName="p-cladd-2xs">
					<FluxEvenements
						evenements={EVENEMENTS}
						montantIdentifie={948_990n}
						hypotheses={[]}
						anglesMorts={[]}
					/>
				</CadreNuit>
			</Etape>

			<Etape
				numero="03"
				titre="Vous ne tranchez que l’indécidable"
				texte="Le montant, l’échéance et la qualité des parties se lisent. La contestation, non."
				capacites={QUALIFICATION}
			>
				<CadreNuit contentClassName="p-cladd-2xs">
					<Question />
				</CadreNuit>
			</Etape>

			<Etape
				inverse
				numero="04"
				titre="Un décompte qui se refait à la main"
				texte="Chaque euro montre d’où il vient. C’est ce que fera le débiteur qui le conteste."
				capacites={DECOMPTE_CAPACITES}
			>
				<CadreNuit contentClassName="p-cladd-2xs">
					<Decompte decompte={DECOMPTE} />
				</CadreNuit>
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
				<p className="text-cladd-xs text-plume-claire">
					· Montant illisible en débit ou en crédit.
				</p>
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
	capacites,
	inverse = false,
	children
}: {
	numero: string;
	titre: string;
	texte: string;
	/** Ce que cette étape SAIT FAIRE, en verbes. Voir l'en-tête de `FORMATS`. */
	capacites: readonly string[];
	/** L'écran passe à gauche et le texte à droite, au-delà de `lg`. */
	inverse?: boolean;
	children: ReactNode;
}) {
	return (
		// ⚠️ `ScenePointeur` ENVELOPPE L'ÉTAPE ENTIÈRE, et pas seulement l'écran :
		// la scène doit mesurer le curseur sur toute la rangée, sinon la dérive ne
		// commence qu'au moment où le pointeur entre dans le cadre, ce qui se lit
		// comme un saut. Seul l'écran bouge ; le texte reste immobile, parce que
		// ce qui se lit ne bouge pas.
		<ScenePointeur className="apparait grid items-start gap-cladd-xs lg:grid-cols-12 lg:gap-cladd-2xl">
			<div className={cn('flex max-w-2xl flex-col gap-cladd-2xs lg:col-span-5 lg:max-w-none',
					inverse && 'lg:order-2')}>
				<div className="flex flex-col gap-cladd-3xs">
					{/* LE NUMÉRO EST NU, en petites capitales, dans le ton le plus sourd.
					    Il portait une pastille d'accent : sur une page qui n'a plus que
					    deux valeurs, quatre pastilles bleues étaient les quatre premières
					    choses que l'œil trouvait, avant les quatre titres. */}
					<span className="text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase tabular-nums">
						Étape {numero}
					</span>
					<h3 className="font-affiche text-titre-section leading-tight font-semibold tracking-titre-section text-balance">
						{titre}
					</h3>
					<p className="max-w-prose text-cladd-md leading-relaxed font-normal text-craie-douce">
						{texte}
					</p>
				</div>
				<Capacites items={capacites} />
			</div>
			<div
				className={cn(
					'suit-pointeur-loin min-w-0 lg:col-span-7',
					inverse && 'lg:order-1'
				)}
			>
				{children}
			</div>
		</ScenePointeur>
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
