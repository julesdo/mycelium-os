import type { ReactNode } from 'react';
import { Chip, ListButton, ListItem, SearchField, Toolbar, ToolbarButton } from '@cladd-ui/react';
import { RotateCcwIcon, UploadIcon, XIcon } from 'lucide-react';
import {
	Avatar,
	BoutonPrincipal,
	Lien,
	CarteListe,
	MaitreDetail,
	PageEcran,
	SommaireEncours,
	eurosCentimes,
	pluriel,
	type Lecture
} from '../ui';
import { TITRE_ECRAN } from './titres';

/** Une rangée de la liste : ce que la rangée lit d'un débiteur de `listerDebiteurs`. */
export interface LigneDebiteur {
	readonly _id: string;
	readonly denomination: string;
	/**
	 * L'identifiant au registre, quand on l'a.
	 *
	 * ⚠️ IL ÉTAIT RENDU PAR LA REQUÊTE ET LU PAR PERSONNE ICI. Son absence n'est
	 * pas un détail d'état civil : sans SIREN, le radar n'interroge jamais le
	 * registre public pour ce client, donc aucune procédure collective ne sera
	 * relevée sur lui. C'est un angle mort, et il ne se voit nulle part si la
	 * liste ne le montre pas. C'est aussi ce que la recherche apparie quand un
	 * gérant colle un numéro lu sur une facture.
	 */
	readonly siren?: string;
	readonly encours: bigint;
	readonly facturesEchues: number;
	readonly santeFinanciere: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly secteurDetermine: boolean;
}

/**
 * Ce que l'écran affiche une fois les débiteurs chargés.
 *
 * ⚠️ L'ÉTAT DE LECTURE — LE TERME ET LES FILTRES — VOYAGE ICI, AVEC SES
 * GESTIONNAIRES, et pas dans un `useState` de l'écran. C'est la convention de
 * `Lecture<T>` : « tout ce dont l'écran n'a besoin qu'une fois prêt voyage dans
 * `valeur`, gestionnaires compris ». Elle paie deux fois ici — l'écran reste une
 * fonction pure de ses entrées, et la salle d'exposition peut montrer la liste
 * FILTRÉE et la recherche SANS RÉSULTAT, deux formes qu'aucune donnée ne produit
 * et que seul un geste fait apparaître.
 */
export interface DebiteursAffiches {
	readonly debiteurs: readonly LigneDebiteur[];
	/** Le débiteur dont la page occupe le volet droit, lu sur la route enfant. */
	readonly choisi: string | null;
	/** Ce que le gérant cherche : un nom, ou un SIREN collé depuis une facture. */
	readonly terme: string;
	/** Les pilules posées. Elles se cumulent : un client retenu les satisfait toutes. */
	readonly filtres: ReadonlySet<CleFiltre>;
	readonly onTerme: (terme: string) => void;
	readonly onBasculerFiltre: (cle: CleFiltre) => void;
	/** Le retour à la liste entière, depuis le vide de la recherche. */
	readonly onToutAfficher: () => void;
}

/*
  ═══════════════════════════════════════════════════════════════════════════
  LA RECHERCHE
  ═══════════════════════════════════════════════════════════════════════════
*/

/**
 * Le texte, ramené à ce qui se compare : sans accents, sans casse.
 *
 * ⚠️ SANS ÇA, « DELORME » NE TROUVE PAS « Délorme ». Une recherche qui exige
 * l'accent exact est une recherche qu'on abandonne au troisième essai — et le
 * gérant retape justement le nom depuis une facture, où il est souvent écrit en
 * capitales non accentuées.
 */
function repliable(texte: string): string {
	return texte
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
}

/** Les seuls chiffres d'une chaîne : « 831 647 250 » et « 831647250 » sont le même SIREN. */
function chiffres(texte: string): string {
	return texte.replace(/\D/g, '');
}

/**
 * VRAI QUAND LE TERME DÉSIGNE CE DÉBITEUR.
 *
 * Le nom d'abord, l'identifiant ensuite. Un terme sans aucun chiffre ne regarde
 * jamais le SIREN : sans ce garde, une chaîne vide de chiffres apparierait tous
 * les numéros, et la recherche par nom cesserait de filtrer quoi que ce soit.
 */
function correspond(debiteur: LigneDebiteur, terme: string): boolean {
	if (repliable(debiteur.denomination).includes(repliable(terme))) return true;
	const cherches = chiffres(terme);
	return cherches !== '' && debiteur.siren !== undefined && debiteur.siren.includes(cherches);
}

/*
  ═══════════════════════════════════════════════════════════════════════════
  LES FILTRES
  ═══════════════════════════════════════════════════════════════════════════
*/

export type CleFiltre = 'ECHUES' | 'SANS_SIREN' | 'PROCEDURE_COLLECTIVE';

interface Filtre {
	readonly cle: CleFiltre;
	readonly libelle: string;
	/** Ce que la pilule retient, en clair. Porté en `title`, jamais deviné. */
	readonly precision: string;
	readonly retient: (debiteur: LigneDebiteur) => boolean;
}

/**
 * LES TROIS PILULES, ET POURQUOI CELLES-LÀ.
 *
 * Une liste de clients se filtrerait de vingt façons ; trois seulement changent
 * ce qu'un gérant fait de sa journée, et chacune répond à une question qu'il
 * pose vraiment.
 *
 *   · « Facture échue » — QUI EST EN RETARD. C'est le geste quotidien, et le
 *     seul tri qui sépare un client qui doit de l'argent d'un client qui en doit
 *     EN RETARD. L'encours seul ne le dit pas : une facture de 30 000 € émise
 *     hier n'appelle rien.
 *
 *   · « SIREN manquant » — CE QUE LE LOGICIEL NE VOIT PAS. Sans identifiant au
 *     registre, le radar n'interroge jamais le registre public pour ce client :
 *     aucune procédure collective ne sera relevée. Et le secteur restant le plus
 *     souvent indéterminé avec lui, c'est le délai de prescription LE PLUS COURT
 *     qui est retenu sur ses factures. « Ce que le logiciel ne voit pas s'affiche
 *     aussi » — et ça se corrige depuis la page du client.
 *
 *   · « Procédure collective » — LÀ OÙ LES RÈGLES CHANGENT. Un client en
 *     procédure ne se relance pas, et ce qui lui est dû suit d'autres délais.
 *
 * ⚠️ LA RADIATION N'A PAS DE PILULE. Elle se lit sur la rangée, comme la
 * procédure collective ; lui donner sa propre pilule ajouterait une quatrième
 * cible à une rangée qui défile déjà à 375 px, pour un état nettement plus rare.
 * Si l'usage la demande, elle s'ajoute ici en quatre lignes.
 */
const FILTRES: readonly Filtre[] = [
	{
		cle: 'ECHUES',
		libelle: 'Facture échue',
		precision: 'Les clients dont au moins une facture a dépassé son échéance',
		retient: (debiteur) => debiteur.facturesEchues > 0
	},
	{
		cle: 'SANS_SIREN',
		libelle: 'SIREN manquant',
		precision: 'Sans identifiant au registre, le registre public n’est pas interrogé pour eux',
		retient: (debiteur) => debiteur.siren === undefined
	},
	{
		cle: 'PROCEDURE_COLLECTIVE',
		libelle: 'Procédure collective',
		precision: 'Les clients pour lesquels le registre public a signalé une procédure',
		retient: (debiteur) => debiteur.santeFinanciere === 'PROCEDURE_COLLECTIVE'
	}
];

/**
 * LES DÉBITEURS : UNE LISTE, ET CHAQUE RANGÉE MÈNE À UNE PAGE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA PREUVE N'EST PLUS UN VOLET, C'EST UNE ADRESSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le détail d'un débiteur vivait ici, dans le volet droit d'un `TwoPane`,
 * choisi par `?d=<id>` — et deux morceaux de lui avaient chacun leur sous-page.
 * Trois endroits pour un seul client, dont un qu'aucun lien ne pouvait
 * désigner.
 *
 * Une rangée POUSSE maintenant vers `/app/debiteurs/$id`, une route enfant
 * rendue par `MaitreDetail`. La règle d'écran n° 3 tient toujours : au-delà de
 * 1024 px, la liste à gauche et la page à droite ; en dessous, la liste seule,
 * puis la page seule. Ce que la règle ne dit pas, et qui change ici : la preuve
 * a une adresse, donc elle se partage, se recharge et se retrouve.
 *
 * ⚠️ ET `MaitreDetail`, JAMAIS `TwoPane`. Celui-ci rend sa preuve deux fois —
 * volet et feuille — : la route enfant y serait montée deux fois, avec ses
 * requêtes et ses dépôts en cours.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE L'ÉCRAN PORTE, DE HAUT EN BAS, DANS UN SEUL DÉFILEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un sommaire — ce que l'ensemble des clients doit, et combien sont concernés.
 * Puis la recherche et les pilules de filtre, qui ne changent QUE la liste.
 * Puis la liste. AUCUNE RANGÉE D'ONGLETS : un choix qui changerait tout l'écran
 * serait une destination de la barre du bas, pas un onglet de plus.
 *
 * ⚠️ LE TERME ET LES FILTRES NE VOYAGENT PAS DANS L'ADRESSE, ET C'EST VOULU. Un
 * paramètre de plus rouvrirait la porte que `?d=` a laissée ouverte : cette
 * route redirige DÉJÀ sur une recherche, et deux paramètres qui se croisent dans
 * un `beforeLoad` est exactement le piège qu'on vient de retirer. Un filtre est
 * un geste de lecture, pas une destination : il se refait d'un doigt, et il ne
 * mérite pas une entrée d'historique entre le client et sa liste.
 */
export function EcranDebiteurs({
	donnees,
	enfant
}: {
	donnees: Lecture<DebiteursAffiches>;
	/** La page du débiteur ouvert (l'`Outlet` de la route), ou `null`. */
	enfant: ReactNode;
}) {
	const entete = { genre: 'onglet', titre: TITRE_ECRAN.debiteurs } as const;

	const avecLaPage = (liste: ReactNode) =>
		enfant === null ? liste : <MaitreDetail maitre={liste} detail={enfant} detailOuvert />;

	if (donnees.etat !== 'pret') {
		return avecLaPage(<PageEcran entete={entete} etat={donnees.etat} />);
	}

	const { debiteurs, choisi, terme, filtres, onTerme, onBasculerFiltre, onToutAfficher } =
		donnees.valeur;

	if (debiteurs.length === 0) {
		return avecLaPage(
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '🧾',
						titre: 'Aucun débiteur pour l’instant',
						explication:
							'Les débiteurs apparaissent tout seuls quand vous importez vos factures : le logiciel les rapproche par leur raison sociale, quelle que soit la graphie.',
						etapes: [
							'Importez un export comptable ou vos factures de vente.',
							'Le logiciel crée un débiteur par client et calcule son encours.',
							'Ouvrez un client pour voir tout ce qu’il doit, facture par facture.'
						],
						action: (
							<BoutonPrincipal as={Lien} to="/app/import-factures">
								<UploadIcon />
								Importer mes factures
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	/*
	  ═════════════════════════════════════════════════════════════════════════
	  CE QUE LA LISTE MONTRE, DÉRIVÉ AU RENDU
	  ═════════════════════════════════════════════════════════════════════════

	  ⚠️ RIEN N'EST POSÉ DANS UN EFFET. Le terme et les filtres sont les deux
	  seuls états de l'écran ; tout le reste — le total, les comptes des pilules,
	  les rangées retenues — se recalcule à chaque rendu depuis eux. Sur un livre
	  de clients, ça coûte trois parcours de tableau.
	*/

	/** Le sommaire compte TOUS les débiteurs, jamais ceux que le filtre a laissés. */
	const total = debiteurs.reduce((somme, debiteur) => somme + debiteur.encours, 0n);
	const enRetard = debiteurs.filter((debiteur) => debiteur.facturesEchues > 0).length;

	/*
	  ═════════════════════════════════════════════════════════════════════════
	  CE QUE LE LOGICIEL NE VOIT PAS DE CE LIVRE
	  ═════════════════════════════════════════════════════════════════════════

	  Deux manques changent ce que la surveillance peut dire, et ils se comptent
	  ici pour être dits UNE FOIS, en haut, avec leur conséquence :

	    · sans SIREN, le radar ne peut pas rapprocher les annonces du registre
	      public : ce débiteur ne sera jamais signalé en procédure collective ;
	    · sans secteur, c'est le délai de prescription LE PLUS COURT qui est
	      retenu sur ses factures — l'hypothèse la plus défavorable, parce que le
	      doute ne profite jamais au produit.

	  ⚠️ CES DEUX FAITS ONT QUITTÉ LES RANGÉES, ET C'EST LE REGARD QUI L'A
	  IMPOSÉ. Ils y étaient en puces. Mesuré au navigateur, dans le volet gauche
	  d'un maître-détail à 1024 px, la colonne du nom ne fait que 180 px : chaque
	  puce y prenait une ligne à elle, et la rangée d'un débiteur qui cumulait
	  les trois mesurait 141 px contre 65 pour les autres. Le client le plus
	  abîmé produisait la rangée la plus haute et la plus lente à lire.

	  Et une puce ne dit jamais la CONSÉQUENCE. « SIREN manquant » sur une ligne
	  n'apprend rien à qui ne sait pas déjà ce que le SIREN sert à faire ; la
	  phrase du sommaire, elle, le dit — et elle se lit sans faire défiler.
	*/
	const sansSiren = debiteurs.filter((debiteur) => debiteur.siren === undefined).length;
	const sansSecteur = debiteurs.filter((debiteur) => !debiteur.secteurDetermine).length;

	/*
	  ⚠️ COURT, ET LE REGARD L'A IMPOSÉ AUSSI. Écrite en clair — « donc jamais
	  rapproché des annonces du registre public » — la phrase tenait sur quatre
	  lignes dans la colonne de 416 px et poussait la première rangée de client à
	  599 px du haut : quatre rangées visibles sur un écran de 900. Elle dit la
	  même chose en deux lignes.
	*/
	const anglesMorts = [
		sansSiren === 0 ? null : `${sansSiren} sans SIREN, hors veille du registre`,
		sansSecteur === 0
			? null
			: `${sansSecteur} sans secteur, au délai de prescription le plus court`
	].filter((phrase): phrase is string => phrase !== null);

	const cherches = debiteurs.filter((debiteur) => correspond(debiteur, terme));

	/*
	  LE COMPTE D'UNE PILULE SE LIT SUR CE QUE LA RECHERCHE A LAISSÉ, ET SUR RIEN
	  D'AUTRE.

	  ⚠️ PAS SUR LA LISTE DÉJÀ FILTRÉE : les pilules tomberaient à zéro l'une
	  après l'autre à mesure qu'on les active. Pas sur la liste entière non plus :
	  une pilule annoncerait « 4 » et n'afficherait rien, parce que la recherche
	  les a tous écartés avant elle.

	  Chaque pilule dit donc : « parmi ce que tu vois, autant sont dans ce cas ».
	*/
	const comptes = new Map<CleFiltre, number>(
		FILTRES.map((filtre) => [filtre.cle, cherches.filter(filtre.retient).length])
	);

	const retenus = cherches.filter((debiteur) =>
		FILTRES.every((filtre) => !filtres.has(filtre.cle) || filtre.retient(debiteur))
	);

	/** Vrai dès qu'un geste de lecture cache quelque chose. */
	const filtree = terme !== '' || filtres.size > 0;

	/*
	  ═════════════════════════════════════════════════════════════════════════
	  LE SOMMAIRE
	  ═════════════════════════════════════════════════════════════════════════

	  ⚠️ UN TOTAL NUL NE SE POSE PAS EN GROS (règle d'écran n° 4). Des clients
	  sans encours, ça existe, et ce n'est pas un vide : ce sont des clients dont
	  tout est réglé. On l'écrit, au lieu de peindre « 0,00 € » en trente-deux
	  pixels — un cadran à zéro se lit comme une panne.
	*/
	const sommaire = (
		<SommaireEncours
			surTitre="Encours total"
			centimes={total === 0n ? null : total}
			/*
			  ⚠️ « DÉBITEURS », JAMAIS « CLIENTS », ET SUR TOUT L'ÉCRAN. Le titre de la
			  page dit « Vos débiteurs » et la carte compte des débiteurs ; un sommaire
			  qui compterait des « clients » ferait lire deux ensembles là où il n'y en
			  a qu'un. (La barre du bas, elle, écrit « Clients » sur son onglet : ce
			  mot-là vit dans `app/barre.tsx` et `screens/titres.ts`, hors de cet
			  écran — c'est le seul écart qui reste, et il est noté.)

			  ⚠️ ET « AUCUNE » PLUTÔT QUE « 0 » : un zéro écrit en chiffre au milieu
			  d'une phrase se lit comme un compteur en panne.
			*/
			faits={
				total === 0n
					? `${debiteurs.length} débiteur${pluriel(debiteurs.length)}, aucun encours.`
					: enRetard === 0
						? `${debiteurs.length} débiteur${pluriel(debiteurs.length)}, aucun en retard.`
						: `${debiteurs.length} débiteur${pluriel(debiteurs.length)}, dont ${enRetard} en retard.`
			}
			angleMort={
				anglesMorts.length === 0
					? undefined
					: `Angle${pluriel(anglesMorts.length)} mort${pluriel(anglesMorts.length)} : ${anglesMorts.join(' ; ')}.`
			}
		/>
	);

	/*
	  ═════════════════════════════════════════════════════════════════════════
	  LA RECHERCHE ET LES PILULES
	  ═════════════════════════════════════════════════════════════════════════

	  ⚠️ LA RECHERCHE EST TOUJOURS LÀ, MÊME SUR TROIS CLIENTS. Elle pourrait
	  n'apparaître qu'au-delà d'une certaine longueur de liste — mais un livre de
	  clients passe de trois à quarante en un après-midi d'import, et un champ qui
	  apparaît entre deux visites se cherche plus longtemps qu'il ne sert. Il
	  coûte une rangée, il est au même endroit tous les jours.

	  ⚠️ UNE PILULE QUI NE FILTRERAIT RIEN NE SE REND PAS. Proposer « Procédure
	  collective » à un gérant dont aucun client n'en a est un bouton qui ne
	  répond pas, et il l'essaiera une fois par visite avant de comprendre.
	  Une pilule ACTIVE se rend toujours, même retombée à zéro : sans quoi elle
	  disparaîtrait sous le doigt et le filtre resterait posé, sans rien pour le
	  retirer.

	  ⚠️ `ToolbarButton` ET PAS `Chip`. Un chip `md` mesure 40 px sur l'échelle du
	  produit — la rampe imbriquée de Cladd en retire 8 : c'est une étiquette, pas
	  une cible. Le plancher tactile est de 48, et c'est ce que rend un bouton
	  `md`. Le COMPTE, lui, est bien un chip : il ne se vise pas.

	  ⚠️ `variant="transparent"` ET `outline={false}` SUR LA `Toolbar` : le kit la
	  dessine en pilule de verre par défaut, ce qui poserait une troisième surface
	  entre le champ et la carte. Dissoute, il ne reste que les pilules — et on ne
	  réinvente pas pour autant une rangée de boutons avec un `div`.
	*/
	const pilules = FILTRES.filter(
		(filtre) => (comptes.get(filtre.cle) ?? 0) > 0 || filtres.has(filtre.cle)
	);

	const gestesDeLecture = (
		<div className="flex flex-col gap-cladd-3xs">
			{/*
			  ⚠️ `inputComponentProps`, ET PAS UN `aria-label` POSÉ SUR LE CHAMP.
			  `Input` — dont `SearchField` est l'habillage — a une liste de props
			  FERMÉE : il ne répand rien sur son `<input>`. Un `aria-label` écrit
			  directement ici disparaissait purement et simplement, et `enterKeyHint`
			  avec lui. Vérifié au navigateur : l'attribut n'existait sur aucun nœud
			  de la page. C'est la fente prévue pour ça, et c'est la seule.
			*/}
			{/*
			  ⚠️ `tightFocusRing`, ET LE REGARD L'A IMPOSÉ. L'anneau de focus d'`Input`
			  est posé à `-inset-1.5`, donc SIX PIXELS EN DEHORS du champ. Le champ
			  occupe toute la colonne de lecture : mesuré au navigateur à 768 px,
			  la colonne rendait `scrollWidth` 678 pour `clientWidth` 672, et la zone
			  qui défile gagnait six pixels de ballant horizontal — assez pour qu'une
			  liste tressaute sous le doigt, jamais assez pour qu'on voie pourquoi.
			  C'est le cas que la documentation du kit nomme mot pour mot.
			*/}
			<SearchField
				size="md"
				tightFocusRing
				value={terme}
				onChange={(valeur) => onTerme(valeur)}
				inputMode="search"
				placeholder="Nom du client ou SIREN"
				inputComponentProps={{
					'aria-label': 'Chercher un débiteur par son nom ou son SIREN',
					enterKeyHint: 'search'
				}}
			/>

			{pilules.length === 0 ? null : (
				/*
				  ⚠️ ELLES PASSENT À LA LIGNE, ELLES NE DÉFILENT PAS. La `Toolbar` de la
				  file défile, et c'est juste pour elle : elle porte des OUTILS, dont on
				  sait qu'ils sont là. Ici ce sont des OFFRES — mesurées au navigateur,
				  les trois pilules demandent 535 px et la colonne du téléphone en donne
				  343 : la troisième sortait du champ, et une option qu'on ne voit pas
				  n'existe pas. Elle coûte une rangée de 48 px sur le seul téléphone ;
				  dès 768 px, les trois tiennent sur une ligne.

				  ⚠️ `justify-start` : LA `Toolbar` DE CLADD CENTRE SON CONTENU, et une
				  dernière ligne centrée ne s'alignerait pas sur la première.

				  ⚠️ PAS D'`aria-label` SUR LA `Toolbar` : `Surface`, dont elle hérite, a
				  la même liste de props fermée qu'`Input` et l'aurait avalé sans rien
				  dire (vérifié au navigateur). Ce qui nomme le groupe, ce sont les
				  pilules elles-mêmes : chacune porte son libellé en toutes lettres et
				  son `aria-pressed`.
				*/
				<Toolbar
					size="md"
					variant="transparent"
					outline={false}
					className="w-full"
					contentClassName="flex flex-wrap items-center justify-start gap-cladd-3xs p-0"
				>
					{pilules.map((filtre) => {
						const actif = filtres.has(filtre.cle);
						return (
							/*
							  ⚠️ UNE PILULE AU REPOS PORTE SON ANNEAU. Sans lui — la `Toolbar`
							  rend ses boutons `transparent` et sans contour par défaut, pour
							  qu'ils se fondent dans SA surface — les trois se lisaient comme
							  des légendes posées sous le champ de recherche, et rien ne disait
							  qu'on pouvait les toucher. La `Toolbar` étant dissoute ici, chaque
							  pilule doit porter sa propre surface.

							  Active, elle est INONDÉE de l'accent : c'est le seul état que l'œil
							  doit trouver sans lire, parce que c'est lui qui explique pourquoi
							  la liste est plus courte qu'hier.
							*/
							<ToolbarButton
								key={filtre.cle}
								className="shrink-0"
								aria-pressed={actif}
								title={filtre.precision}
								color={actif ? 'brand' : undefined}
								variant={actif ? 'gradient-fill' : 'gradient'}
								outline={!actif}
								onClick={() => onBasculerFiltre(filtre.cle)}
							>
								{filtre.libelle}
								{/* Active, la pilule montre la croix qui la retire ; au repos,
								    ce qu'elle retiendrait. Une pilule qui n'annonce pas sa
								    valeur se clique pour voir, puis se déclique. */}
								{actif ? (
									<XIcon aria-hidden />
								) : (
									<Chip size="md" color="neutral">
										{comptes.get(filtre.cle) ?? 0}
									</Chip>
								)}
							</ToolbarButton>
						);
					})}
				</Toolbar>
			)}
		</div>
	);

	/*
	  ═════════════════════════════════════════════════════════════════════════
	  LA LISTE
	  ═════════════════════════════════════════════════════════════════════════

	  ⚠️ UNE SEULE CARTE, DES LIGNES DEDANS — et pas une carte par débiteur. Sur
	  trente débiteurs, trente objets qui flottent séparément font compter des
	  cartes au lieu de lire des noms, et chaque bord arrondi coûte quatre pixels
	  de vide en haut et en bas.

	  ⚠️ L'ORDRE EST CELUI DU PLUS GROS ENCOURS, ET IL SE JUSTIFIE. C'est
	  `listerDebiteurs` qui le pose, et cet écran ne le retouche pas : filtrer
	  conserve l'ordre reçu. L'ordre alphabétique serait le réflexe — mais c'est
	  l'ordre d'un CARNET D'ADRESSES, où l'on vient chercher un nom qu'on connaît
	  déjà. Ici on ne vient pas chercher un nom : on vient voir OÙ EST L'ARGENT,
	  et « par quoi je commence » n'a qu'une réponse mesurable, le montant. Pour
	  le nom qu'on connaît déjà, il y a la recherche, juste au-dessus, qui rend
	  l'ordre indifférent.

	  ⚠️ ET L'ORDRE EST ÉCRIT À L'ÉCRAN, pas seulement ici : une liste dont on ne
	  sait pas comment elle est rangée se relit en entier à chaque visite.
	*/
	const liste =
		retenus.length === 0 ? (
			/*
			  LE VIDE DE LA RECHERCHE MONTRE LE CHEMIN (règle d'écran n° 4).

			  ⚠️ IL NE PASSE PAS PAR L'ÉTAT VIDE DE `PageEcran`, QUI REMPLACE L'ÉCRAN :
			  la recherche et les pilules disparaîtraient avec la liste, et le gérant
			  n'aurait plus rien pour défaire ce qu'il vient de faire. Le message vit
			  donc DANS la carte, sous les gestes qui l'ont produit.
			*/
			<CarteListe titre="Aucun résultat">
				<ListItem className="text-cladd-fg-soft">
					Aucun de vos {debiteurs.length} débiteurs ne répond à ce que vous cherchez.
				</ListItem>
				<ListButton icon={<RotateCcwIcon />} onClick={onToutAfficher}>
					Afficher les {debiteurs.length} débiteurs
				</ListButton>
			</CarteListe>
		) : (
			<CarteListe
				titre={
					filtree
						? `${retenus.length} sur ${debiteurs.length} débiteur${pluriel(debiteurs.length)}`
						: `${debiteurs.length} débiteur${pluriel(debiteurs.length)}`
				}
				actions={
					/*
					  ⚠️ `fg-softer`, ET PAS `fg-softest`. Mesuré au navigateur en sombre :
					  `fg-softest` rend rgb(133,139,147), et sur le fond de `verre-carte`
					  — oklch(0.18 0.012 276) à 72 % — le rapport tombe à 4,45 pour un
					  corps de 12 px, sous le seuil de 4,5. `fg-softer` le porte à 5,7.
					  Le cran le plus pâle convient à une mention qu'on ne lit qu'une
					  fois ; celle-ci explique POURQUOI la liste est rangée ainsi, et se
					  relit à chaque visite.
					*/
					<span className="shrink-0 text-cladd-2xs text-cladd-fg-softer">
						Le plus gros encours d’abord
					</span>
				}
			>
				{retenus.map((debiteur) => (
					<ListButton
						key={debiteur._id}
						as={Lien}
						to="/app/debiteurs/$id"
						/*
						  ⚠️ UNE ASSERTION, ET UNE SEULE, À CET ENDROIT PRÉCIS. `ListButton` est
						  polymorphe : en passant par son `as`, le générique du routeur est
						  effacé et `params` retombe sur une signature large. Le `to` ci-dessus
						  reste, lui, un littéral que `destinations-existent.test.ts` balaie.
						*/
						params={{ id: debiteur._id } as never}
						selected={choisi === debiteur._id}
						/*
						  ⚠️ CHAQUE LIGNE PORTE UN AVATAR. Il donne à l'œil un point d'accroche
						  fixe à gauche, et surtout il rend deux raisons sociales proches —
						  « Ateliers Martin » et « Ateliers Martin Fils » — distinguables à la
						  couleur avant d'être lues. Sur un produit où se tromper de débiteur
						  envoie un décompte au mauvais tiers, ça compte.
						*/
						icon={<Avatar nom={debiteur.denomination} />}
						footer={
							/*
							  DEUX PUCES AU PLUS, ET SEULEMENT CE QUI TOUCHE À L'ARGENT.

							  Le retard, et l'état au registre. Ce sont les deux seuls faits qui
							  décident de ce qu'on fait de ce client aujourd'hui, et ce sont les
							  deux seuls qui ne se devinent pas depuis son encours.

							  ⚠️ LES DEUX MANQUES — SIREN, SECTEUR — SONT PARTIS AU SOMMAIRE, et
							  le raisonnement complet est écrit là-haut, avec la mesure qui l'a
							  imposé. En bref : une puce de plus coûtait une ligne entière dans
							  une colonne de 180 px, et elle ne disait jamais la conséquence.

							  Les puces en pied de ligne plutôt qu'en rangée séparée : elles
							  qualifient le débiteur, elles ne sont pas une information de même
							  niveau que son nom.
							*/
							<span className="flex flex-wrap items-center gap-1.5">
								{debiteur.facturesEchues > 0 ? (
									<Chip size="sm" color="orange">
										{debiteur.facturesEchues} échue{pluriel(debiteur.facturesEchues)}
									</Chip>
								) : null}
								{debiteur.santeFinanciere !== 'SAINE' && debiteur.santeFinanciere !== 'INCONNUE' ? (
									<Chip size="sm" color="red">
										{debiteur.santeFinanciere === 'RADIEE' ? 'Radié' : 'Procédure collective'}
									</Chip>
								) : null}
							</span>
						}
						after={
							// L'encours reste la colonne qui commande la lecture — un gérant
							// arbitre entre douze mille euros et trois cents, pas entre deux
							// raisons sociales. Mais il reste au corps courant : dans une
							// rangée, un chiffre de trente-deux pixels écrase le nom.
							<span className="shrink-0 text-cladd-sm font-bold tabular-nums">
								{eurosCentimes(debiteur.encours)}
							</span>
						}
					>
						{debiteur.denomination}
					</ListButton>
				))}
			</CarteListe>
		);

	return avecLaPage(
		<PageEcran entete={entete}>
			{sommaire}
			{gestesDeLecture}
			{liste}
		</PageEcran>
	);
}
