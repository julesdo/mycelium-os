import { useState, type ReactNode } from 'react';
import { Button, Chip, Surface } from '@cladd-ui/react';
import { RotateCcwIcon } from 'lucide-react';
import {
	cn,
	ScenePointeur,
	FluxEvenements,
	Decompte,
	EmptyState,
	PictoLecture,
	PictoRegistre,
	PictoQuestion,
	PictoDecompte,
	type EvenementAffiche,
	type DecompteAffiche
} from '../ui';
import { SectionMarketing, CadreNuit, Capacites } from './section';
import { depuisCentimes } from '../lib/socle/montants';
import { decompterCreance } from '../lib/verticales/recouvrement/decompte';
import { periodesDeTauxParDefaut } from '../lib/verticales/recouvrement/pays/france/taux';

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
 * ne sait pas ce qu'il achète, et il a raison de ne pas le croire. « Relever
 * chaque nuit au BODACC les procédures ouvertes sur vos débiteurs » se vérifie.
 *
 * ⚠️ ET CHAQUE LIGNE CORRESPOND À DU CODE QUI TOURNE. Cette liste a été écrite
 * en relisant les modules, pas de mémoire :
 *
 *   FEC, CSV, dépôt, Factur-X  →  `import/exportComptable.ts:68`, `FormatExport`
 *   BODACC la nuit, briefing au matin  →  `convex/crons.ts`, `radarSolvabilite`
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
	'Lire un FEC, le fichier que tout logiciel comptable produit.',
	'Lire une facture Factur-X et son XML, sans passer par un modèle.',
	'Écarter les doublons et les écritures hors périmètre, en les comptant.'
] as const;

/**
 * ⚠️ AUCUNE HEURE D'HORLOGE ICI, ET C'EST UNE CORRECTION.
 *
 * La première version disait « relever le BODACC à quatre heures du matin, et
 * vous le dire à six ». Les deux nombres sont justes dans `crons.ts` — et ils y
 * sont en **UTC**. Pour un lecteur français, le radar tourne donc à six heures
 * l'été et à cinq l'hiver, et le point du matin part à huit puis à sept. La
 * phrase était fausse pour tout le monde sauf pour un serveur.
 *
 * C'est le piège des `hourUTC` : ils se lisent comme une heure locale, ils
 * s'écrivent comme une heure locale dans une page commerciale, et rien ne le
 * signale. Une page qui vend l'exactitude au centime ne peut pas se tromper
 * d'heure sur la seule chose qu'elle raconte du travail de nuit.
 *
 * Ce qui reste vrai quelle que soit la saison : c'est LA NUIT, et le briefing
 * est là AVANT la première heure de bureau. C'est d'ailleurs ce que le
 * commentaire de `crons.ts` dit lui-même de son intention.
 */
const SURVEILLANCE = [
	'Relever le BODACC chaque nuit, sur vos débiteurs à vous.',
	'Suivre la prescription facture par facture, au régime de son secteur.',
	'Rapprocher les règlements, pour ne pas relancer un client qui a payé.'
] as const;

const QUALIFICATION = [
	'Déduire ce qui se lit : le montant, l’échéance, la qualité des parties.',
	'Chiffrer ce qu’un acte laisserait de côté, avant qu’il soit produit.'
] as const;

/**
 * CE QUE LE LOGICIEL SUPPOSE, ET CE QU'IL NE VOIT PAS.
 *
 * ⚠️ LES DEUX SONT RENSEIGNÉS, ET CE N'EST PAS UN DÉTAIL DE MAQUETTE. La règle
 * du produit est explicite : « Ce que le logiciel ne voit pas s'affiche aussi.
 * Un utilisateur qui croit sa prescription surveillée ne la surveille pas
 * lui-même. » Le mode compact les replie en une ligne qui les DÉNOMBRE — deux
 * tableaux vides afficheraient donc « 0 hypothèse, 0 angle mort ».
 *
 * ⚠️ ET LES DEUX NE SE CONFONDENT PAS. Une hypothèse est un calcul FAIT sur une
 * donnée absente, et elle se LÈVE en renseignant la donnée. Un angle mort est
 * un calcul qui n'est PAS fait du tout, et rien à l'écran ne le lèvera. Les
 * fondre serait un mensonge par rangement.
 */
const HYPOTHESES_DEMO = [
	'Secteur indéterminé pour 3 débiteurs : le délai de prescription le plus court est retenu.'
] as const;

const ANGLES_MORTS_DEMO = [
	'Les factures antérieures à votre premier import ne sont pas surveillées.',
	'Un règlement encaissé hors banque connectée n’est pas rapproché.'
] as const;

const DECOMPTE_CAPACITES = [
	'Décomposer les intérêts période par période : taux, jours, principal.',
	'Figer un décompte à sa date. Rejouer en produit un nouveau, daté.',
	'Réunir les pièces pour votre avocat ou votre commissaire de justice.'
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
		// ⚠️ LE TEXTE DU PRODUIT, TEL QU'IL EST DEPUIS LE 25/09/2026. La démo disait
		// « est PRESCRITE » et « la créance est éteinte » : un verdict sur une date
		// calculée sans les interruptions, puis une consigne d'abandon.
		explication:
			'La date limite calculée pour réclamer la facture FA-2021-0087 est passée depuis le ' +
			'14 août 2026. Ce calcul ne suit pas les interruptions : un paiement partiel ou une ' +
			'reconnaissance de votre client peuvent l’avoir repoussée.',
		action:
			'Ouvrir la facture FA-2021-0087 : le calcul de sa date limite y est détaillé, avec ses hypothèses.'
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
			'Signification de l’ordonnance : il reste 9 jours avant le 2 octobre. Passée cette ' +
			'date, le droit est perdu.',
		action: 'Ouvrir ce dossier : la date limite et son journal y sont.'
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
 * Le décompte de démonstration, calculé par le VRAI moteur, au taux légal de
 * chaque semestre.
 *
 * 10 000 € exigibles au 1er mai, arrêtés au 3 septembre, un règlement de
 * 4 000 € au 1er juillet — le même dossier que la salle de démonstration.
 *
 * ⚠️ IL ÉTAIT ÉCRIT À LA MAIN, ET IL MENTAIT DEUX FOIS. Il imputait le règlement
 * sur le principal, la règle que la relecture juridique du 25/09/2026 a déclarée
 * fausse ; et son second segment ne se refaisait même pas avec ses propres
 * données. Recopier des chiffres sur la page publique, c'est aussi recopier les
 * taux d'un semestre qui passera : calculés ici, ils suivent le registre.
 */
// La page publique montre le calcul, pas le choix de l’ordre d’imputation : « comme
// vous l’avez choisi » ne s’adresserait à aucun visiteur.
const CALCUL = decompterCreance(
	[
		{
			reference: 'FA-2026-118',
			montantExigible: depuisCentimes(1_000_000n),
			dateExigibilite: '2026-05-01',
			reglements: [{ date: '2026-07-01', montant: depuisCentimes(400_000n), nature: 'PAIEMENT' }],
			taux: periodesDeTauxParDefaut('2026-05-01', '2026-09-03')
		}
	],
	'2026-09-03',
	'ACT_365',
	'PENALITES_DABORD'
);
const DECOMPTE: DecompteAffiche = {
	lignes: CALCUL.lignes,
	principalRestantDu: CALCUL.principalRestantDu,
	interets: CALCUL.interets,
	indemniteForfaitaire: CALCUL.indemniteForfaitaire,
	total: CALCUL.total,
	arreteAu: CALCUL.arreteAu,
	convention: CALCUL.convention
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
					Quatre gestes, <span className="text-craie-claire">un seul vous demande du temps.</span>
				</h2>
				<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
					Les écrans ci-dessous sont ceux du logiciel, remplis de données de démonstration. Le
					troisième se joue.
				</p>
			</div>

			<Etape
				numero="01"
				picto={<PictoLecture />}
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
				picto={<PictoRegistre />}
				titre="Le logiciel regarde toutes les nuits"
				texte="Ce qui arrive à échéance, ce qui devient mûr, ce qui approche de la prescription."
				capacites={SURVEILLANCE}
			>
				{/*
				  ⚠️ `limite` N'EST PAS UN RÉGLAGE D'ENCOMBREMENT, C'EST LE MODE QUE
				  L'ACCUEIL EMPLOIE RÉELLEMENT. Sans elle, `FluxEvenements` rend son
				  mode DÉTAIL : quatre rangées pleines, leurs explications en entier, et
				  les deux blocs d'avertissement dépliés. C'est la disposition de
				  `/app/revelation`, pas celle de l'accueil.

				  Mesuré au navigateur à 375 px : ce cadre faisait 2 536 px de haut
				  contre 408, 567 et 627 pour les trois autres. Une démonstration quatre
				  fois plus haute que ses voisines n'est pas seulement longue, elle
				  montre un écran que le gérant ne verra pas là où on le lui promet.
				  C'est le même défaut que celui corrigé sur le téléphone du premier
				  écran, au même endroit et pour la même raison.

				  ⚠️ ET LES DEUX TABLEAUX NE SONT PLUS VIDES. En mode compact, les
				  avertissements se replient en une ligne qui les DÉNOMBRE : passer des
				  tableaux vides afficherait « 0 hypothèse, 0 angle mort », c'est-à-dire
				  un logiciel qui ne suppose rien et ne rate rien. C'est exactement la
				  promesse que ce produit refuse de faire, mise en image sur la page la
				  plus lue du site.
				*/}
				<CadreNuit contentClassName="p-cladd-2xs">
					<FluxEvenements
						evenements={EVENEMENTS}
						montantIdentifie={948_990n}
						hypotheses={HYPOTHESES_DEMO}
						anglesMorts={ANGLES_MORTS_DEMO}
						limite={2}
						versDetail="/app/revelation"
					/>
				</CadreNuit>
			</Etape>

			<Etape
				numero="03"
				picto={<PictoQuestion />}
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
				picto={<PictoDecompte />}
				titre="Un décompte qui se refait à la main"
				texte="Arrêté, il ne bouge plus. C’est ce qui prouve ce que vous réclamiez le jour où vous l’avez réclamé."
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
	picto,
	numero,
	titre,
	texte,
	capacites,
	inverse = false,
	children
}: {
	/** Le signe du domaine qui ouvre l étape. Voir `ui/pictogrammes.tsx`. */
	picto: ReactNode;
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
			<div
				className={cn(
					'flex max-w-2xl flex-col gap-cladd-2xs lg:col-span-5 lg:max-w-none',
					inverse && 'lg:order-2'
				)}
			>
				<div className="flex flex-col gap-cladd-3xs">
					{/*
					  ⚠️ LE NUMÉRO PASSE DE DIX PIXELS À CENT-VINGT-HUIT, ET C'EST LA
					  RUPTURE DE RYTHME QUE LA PAGE RÉCLAMAIT.

					  Il a d'abord été une pastille d'accent — quatre ronds bleus, les
					  quatre premières choses que l'œil trouvait, avant les quatre titres
					  qu'ils numérotent. Puis une étiquette de dix pixels en capitales,
					  juste et invisible.

					  Relevé sur Trawelt le 24 septembre 2026 : leurs numéros d'étape
					  occupent le tiers de la colonne, en aplat, et c'est à peu près tout
					  ce qui distingue leur page d'une liste. Un chiffre énorme ne se lit
					  pas, il se REPÈRE — c'est ce qui permet de retrouver où l'on en est
					  après avoir regardé un écran de démonstration.

					  ⚠️ ET IL EST DANS LE TON LE PLUS SOURD, PAS EN BLANC. À cent-vingt-
					  huit pixels et en craie pleine, il écraserait le titre qu'il
					  annonce. Sourd, il donne l'échelle sans prendre la parole : une
					  masse, pas un mot. C'est la seule fois de la page où
					  `--color-craie-sourde` porte quelque chose de grand, et c'est
					  permis parce que le rang est aussi écrit en toutes lettres pour
					  qui ne le voit pas.
					*/}
					<div className="flex items-center gap-cladd-2xs">
						<span
							aria-hidden
							className="font-affiche text-affiche leading-none font-semibold tracking-affiche text-craie-sourde tabular-nums"
						>
							{numero}
						</span>
						<span className="text-craie-claire">{picto}</span>
						<span className="sr-only">Étape {numero}</span>
					</div>
					<h3 className="font-affiche text-titre-section leading-tight font-semibold tracking-titre-section text-balance">
						{titre}
					</h3>
					<p className="max-w-prose text-cladd-md leading-relaxed font-normal text-craie-douce">
						{texte}
					</p>
				</div>
				<Capacites items={capacites} />
			</div>
			<div className={cn('suit-pointeur-loin min-w-0 lg:col-span-7', inverse && 'lg:order-1')}>
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
				titre="Vos réponses sont enregistrées."
				explication="Le montant, l’échéance et vos réponses sont au dossier. Le décompte peut être arrêté."
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
