import { useState, type ReactNode } from 'react';
import {
	Button,
	Chip,
	ListButton,
	ListItem,
	Popup,
	PopupContent,
	SearchField
} from '@cladd-ui/react';
import { CheckIcon, RotateCcwIcon, SlidersHorizontalIcon, UploadIcon, XIcon } from 'lucide-react';
import {
	Avatar,
	BoutonPrincipal,
	Lien,
	CarteListe,
	LigneBouton,
	ListeAnalyses,
	MaitreDetail,
	PageEcran,
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
 * COMMENT CE CLIENT PAIE D'HABITUDE — ce que la rangée en montre, et rien de plus.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TROIS NOMBRES, AUCUN SCORE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `lireParEtablissement` rend bien davantage — la dispersion, et le CONSTAT
 * complet de chaque facture en rupture, phrase entière écrite par le domaine.
 * La rangée n'en prend pas un mot : une phrase de trois lignes dans une colonne
 * de 180 px ferait de la liste un mur de texte, et le constat a déjà sa place,
 * entier, sur la page du client.
 *
 * Ce qui reste est ce qu'un gérant refait de tête : un délai en jours, sur
 * combien de règlements il est établi, et le fait qu'un impayé en soit sorti.
 * Aucun pourcentage, aucune note, aucun rang — un client n'est pas un chiffre
 * entre zéro et cent, et un produit qui le prétendrait promettrait une
 * prédiction qu'il n'a aucune donnée pour étayer.
 *
 * ⚠️ `rompu` NE RÉSUME PAS UNE PROBABILITÉ, il compte : au moins un impayé
 * exigible sort du délai auquel ce client règle d'habitude. C'est un fait
 * arithmétique, refaisable, et il s'arrête là — c'est le gérant qui décide ce
 * qu'il en fait, pas l'écran (troisième ligne rouge du produit).
 */
export interface HabitudeDeLaLigne {
	/** Le délai médian, en jours depuis l'échéance. Négatif si le client paie en avance. */
	readonly delaiMedianJours: number;
	/** Sur combien de règlements ce délai est établi. Un constat sans ça se lit trop fort. */
	readonly echantillon: number;
	/** Vrai quand au moins un impayé exigible sort de cette habitude. */
	readonly rompu: boolean;
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
	/**
	 * L'HABITUDE DE PAIEMENT DE CHAQUE CLIENT, EN UNE SEULE LECTURE.
	 *
	 * ⚠️ UNE CLÉ ABSENTE VEUT DIRE « PAS D'HABITUDE ÉTABLIE », et c'est une
	 * réponse, pas un trou. Le domaine exige quatre règlements datés pour parler
	 * d'habitude ; en dessous il ne rend pas un délai approximatif, il refuse.
	 * La rangée ne porte alors rien — jamais un « 0 j », qui se lirait comme
	 * « paie le jour dit » et serait faux dans les deux sens.
	 *
	 * ⚠️ ET `undefined` N'EST PAS UNE CARTE VIDE, c'est la lecture EN VOL. La
	 * distinction n'est pas cosmétique : le sommaire compte plus bas les clients
	 * en retard dont l'habitude n'est pas mesurable, et une carte vide prise pour
	 * une réponse ferait clignoter ce compte sur TOUS les retardataires le temps
	 * d'un aller-retour. Un chiffre faux affiché une demi-seconde est un chiffre
	 * faux : tant que la lecture n'est pas revenue, l'écran ne dit rien.
	 */
	readonly habitudes: ReadonlyMap<string, HabitudeDeLaLigne> | undefined;
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
	return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
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

export type CleFiltre = 'ECHUES' | 'RYTHME_ROMPU' | 'SANS_SIREN' | 'PROCEDURE_COLLECTIVE';

interface Filtre {
	readonly cle: CleFiltre;
	readonly libelle: string;
	/** Ce que la pilule retient, en clair. Porté en `title`, jamais deviné. */
	readonly precision: string;
	/**
	 * ⚠️ L'HABITUDE ARRIVE EN SECOND ARGUMENT, ELLE N'EST PAS DANS LA RANGÉE.
	 * Elle vient d'une autre lecture, qui revient après celle des débiteurs ; la
	 * coller dans `LigneDebiteur` ferait porter à la rangée un champ qui n'est
	 * simplement pas encore là, et chaque filtre devrait alors distinguer
	 * lui-même l'absence du zéro. Ici la distinction est faite UNE fois, par
	 * l'appelant, et `undefined` n'a qu'un sens : rien à en dire.
	 */
	readonly retient: (debiteur: LigneDebiteur, habitude: HabitudeDeLaLigne | undefined) => boolean;
}

/**
 * LES QUATRE PILULES, ET POURQUOI CELLES-LÀ.
 *
 * Une liste de clients se filtrerait de vingt façons ; quatre seulement changent
 * ce qu'un gérant fait de sa journée, et chacune répond à une question qu'il
 * pose vraiment.
 *
 *   · « Facture échue » — QUI EST EN RETARD. C'est le geste quotidien, et le
 *     seul tri qui sépare un client qui doit de l'argent d'un client qui en doit
 *     EN RETARD. L'encours seul ne le dit pas : une facture de 30 000 € émise
 *     hier n'appelle rien.
 *
 *   · « Rythme rompu » — QUI SORT DE SES HABITUDES. Elle ne recoupe PAS la
 *     précédente, et c'est toute la raison de l'ajouter : « échue » range
 *     ensemble le client qui règle toujours à soixante-cinq jours, depuis
 *     quatre ans, et celui qui réglait à huit et vient de passer à
 *     trente-cinq. Le premier ne dit rien ; le second est le signal le plus
 *     précoce qu'un produit de recouvrement puisse donner, et un seuil absolu
 *     le rate. Sur un livre où trente clients sont « échus », c'est la seule
 *     pilule qui désigne les deux par lesquels commencer.
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
 * procédure collective ; lui donner sa propre pilule ajouterait une cinquième
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
		cle: 'RYTHME_ROMPU',
		libelle: 'Rythme rompu',
		precision:
			'Les clients dont un impayé dépasse franchement le délai auquel ils règlent d’habitude',
		/*
		  ⚠️ `=== true`, ET PAS LE SEUL CHAÎNAGE OPTIONNEL. Sur un client dont
		  l'habitude n'est pas établie — ou pendant que la lecture est en vol — la
		  pilule ne le retient PAS. Le doute ne profite jamais au produit : on ne
		  sait pas si ce client sort de son rythme, donc on ne l'affirme pas. Ce
		  qu'il en coûte est compté en toutes lettres dans le sommaire.
		*/
		retient: (_debiteur, habitude) => habitude?.rompu === true
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

/*
  ═══════════════════════════════════════════════════════════════════════════
  L'HABITUDE, ÉCRITE POUR UNE RANGÉE
  ═══════════════════════════════════════════════════════════════════════════

  ⚠️ DEUX FORMULATIONS, ET C'EST VOULU : la rangée en montre une, le survol
  l'autre. La courte tient dans la colonne de droite, sous le montant, sans la
  faire respirer ; la longue dit sur COMBIEN de règlements le délai est établi,
  ce qui est la seule question qu'un gérant pose ensuite — « et tu sais ça
  comment ? ». Écrire la longue dans la rangée la ferait passer à deux lignes
  chez tout le monde ; la taire tout à fait donnerait à un délai tiré de quatre
  règlements la même autorité qu'à un tiré de quarante.

  ⚠️ AUCUNE DES DEUX NE PORTE DE VERBE D'ACTION, et c'est la troisième ligne
  rouge du produit : l'écran CONSTATE, il ne conseille pas. « Règle à 12 j » est
  un fait mesuré ; « à relancer » serait une démarche recommandée, donc du
  conseil juridique.
*/

/** Le délai habituel, en jours, tel qu'il tient au bout d'une rangée. */
function delaiCourt(jours: number): string {
	const arrondi = Math.round(jours);
	if (arrondi === 0) return 'Règle le jour dit';
	if (arrondi < 0) return `Règle ${Math.abs(arrondi)} j en avance`;
	return `Règle à ${arrondi} j`;
}

/** La même habitude en une phrase, avec ce qui l'établit. Portée en `title`. */
function habitudeEnClair(habitude: HabitudeDeLaLigne): string {
	const arrondi = Math.round(habitude.delaiMedianJours);
	const delai =
		arrondi === 0
			? 'le jour de son échéance'
			: arrondi < 0
				? `${Math.abs(arrondi)} jour${pluriel(arrondi)} avant son échéance`
				: `${arrondi} jour${pluriel(arrondi)} après son échéance`;
	return `Règle habituellement ${delai}, sur ${habitude.echantillon} règlements observés.`;
}

/**
 * CE QU'IL DOIT, ET COMMENT IL PAIE — L'UN SOUS L'AUTRE.
 *
 * L'encours reste la colonne qui commande la lecture — un gérant arbitre entre
 * douze mille euros et trois cents, pas entre deux raisons sociales. Mais il
 * reste au corps courant : dans une rangée, un chiffre de trente-deux pixels
 * écrase le nom.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ L'HABITUDE SE LOGE ICI, PAS DANS LE PIED DE LA RANGÉE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Et c'est une mesure qui l'a décidé, pas un goût. Cette colonne-ci est large
 * de ce que mesure le montant — 91 px à 375 px, pour « 12 878,50 € » — et cette
 * largeur ne dépend pas de la raison sociale. La colonne du NOM, elle, n'a que
 * 124 px au téléphone : tout ce qu'on y ajoute passe à la ligne et allonge la
 * rangée du client le plus abîmé, ce que le paragraphe des angles morts de cet
 * écran a déjà fait corriger une fois.
 *
 * Lue de haut en bas, la colonne fait une phrase : ce qu'il doit, ce qui
 * cloche, à quel rythme il règle d'ordinaire.
 *
 * ⚠️ LES DEUX MENTIONS TIENNENT SOUS 91 PX, ET C'EST LA CONTRAINTE QUI A CHOISI
 * LES MOTS. Mesurées au navigateur, dans la fonte du produit : « Rythme rompu »
 * 84 px, « Règle à 12 j » 63 px. Une formule qui aurait dit les deux d'un coup
 * — « Rompu · 12 j d'ordinaire », 132 px — élargissait la colonne de droite et
 * reprenait au nom les pixels qu'on venait de lui rendre.
 *
 * ⚠️ LA RUPTURE NE DIT PAS DE COMBIEN, et c'est délibéré : l'écart et le constat
 * entier — la phrase du domaine, avec le nombre de règlements qui l'établit —
 * vivent sur la page du client, à un doigt d'ici. Un « +47 j » posé seul ferait
 * arbitrer sur un nombre sorti de son contexte, alors que le délai habituel est
 * écrit juste en dessous.
 *
 * ⚠️ NI ACCENT, NI PUCE, NI ICÔNE SUR LA RUPTURE. Ce qui la fait trouver, c'est
 * qu'elle est la seule mention en pleine encre dans une colonne de mentions
 * grises ; la peindre en rouge la ferait lire comme un état au registre, qui est
 * le seul fait de cette rangée à mériter une couleur. L'icône a été essayée,
 * mesurée, retirée : le chevron de la page du client portait la colonne de 91 à
 * 101 px — dix pixels repris au nom sur CHAQUE rangée, y compris celles qui
 * n'ont aucune rupture, pour un glyphe de douze pixels dont la pleine encre
 * faisait déjà le travail.
 *
 * ⚠️ RIEN QUAND L'HABITUDE N'EST PAS ÉTABLIE. Ni « — », ni « 0 j », ni
 * « inconnu » : quatre règlements datés sont le minimum du domaine, et en
 * dessous il n'y a pas un chiffre à nuancer, il n'y a rien. Ce que ce silence
 * coûte est compté au sommaire, en toutes lettres, une fois.
 *
 * ⚠️ `fg-softer` ET PAS `fg-softest` — même raison que la mention d'ordre en
 * tête de carte, mesurée au navigateur : le cran le plus pâle tombe à 4,45 sur
 * `verre-carte` à ce corps, sous le seuil de 4,5.
 */
function ColonneDroite({
	encours,
	habitude
}: {
	encours: bigint;
	habitude: HabitudeDeLaLigne | undefined;
}) {
	return (
		<span className="flex shrink-0 flex-col items-end gap-0.5">
			<span className="text-cladd-sm font-bold tabular-nums">{eurosCentimes(encours)}</span>
			{habitude?.rompu === true ? (
				<span className="text-cladd-2xs font-semibold">Rythme rompu</span>
			) : null}
			{habitude === undefined ? null : (
				<span
					className="text-cladd-2xs text-cladd-fg-softer tabular-nums"
					title={habitudeEnClair(habitude)}
				>
					{delaiCourt(habitude.delaiMedianJours)}
				</span>
			)}
		</span>
	);
}

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
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET CHAQUE RANGÉE DIT COMMENT CE CLIENT PAIE D'HABITUDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'habitude de paiement était lue par la vue « Par client » de l'ancienne
 * file, et elle a disparu avec elle : la lecture existait, complète et testée,
 * et plus aucun écran ne l'appelait. Un client qui réglait à trente jours et
 * passe à quatre-vingt-dix est le premier signal qu'une créance va mal tourner
 * — le seul, souvent, avant l'impayé lui-même — et plus personne ne le voyait.
 *
 * Elle revient ICI parce que c'est ici qu'elle sert : le gérant ne sait pas à
 * l'avance QUEL client a changé de rythme, c'est exactement ce qu'il vient
 * chercher. Sur la page d'un client, l'information n'arrive qu'à celui qui
 * avait déjà deviné lequel ouvrir.
 *
 * ⚠️ UNE SEULE LECTURE POUR TOUTE LA LISTE. `lireParEtablissement` est écrite
 * à cette échelle-là et c'est tout son intérêt : deux parcours d'index et un
 * groupement en mémoire, contre une lecture par rangée plus une par facture si
 * on appelait la lecture par client en boucle. La route la branche une fois et
 * passe une carte ; l'écran, lui, n'appelle rien.
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
	/** La feuille de filtre. Déclarée avant tout retour anticipé : c’est un crochet. */
	const [filtreOuvert, setFiltreOuvert] = useState(false);
	const entete = { genre: 'onglet', titre: TITRE_ECRAN.debiteurs } as const;

	const avecLaPage = (liste: ReactNode) =>
		enfant === null ? liste : <MaitreDetail maitre={liste} detail={enfant} detailOuvert />;

	if (donnees.etat !== 'pret') {
		return avecLaPage(<PageEcran entete={entete} etat={donnees.etat} />);
	}

	const {
		debiteurs,
		choisi,
		habitudes,
		terme,
		filtres,
		onTerme,
		onBasculerFiltre,
		onToutAfficher
	} = donnees.valeur;

	if (debiteurs.length === 0) {
		return avecLaPage(
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '🧾',
						titre: 'Aucun client pour l’instant',
						explication:
							'Vos clients apparaissent tout seuls quand vous importez vos factures : le logiciel les rapproche par leur raison sociale, quelle que soit la graphie.',
						etapes: [
							'Importez vos fichiers de factures : le format est reconnu seul.',
							'Le logiciel crée une fiche par client et calcule ce qu’il vous doit.',
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
	  LE TROISIÈME MANQUE : UN RETARD QU'ON NE SAIT PAS LIRE.

	  ⚠️ IL NE COMPTE PAS LES CLIENTS SANS HABITUDE, IL COMPTE CEUX QUI SONT EN
	  RETARD SANS HABITUDE, et l'écart entre les deux est tout l'intérêt de la
	  ligne. Un client récent dont rien n'est échu n'est pas un angle mort : il
	  n'y a rien à surveiller sur lui. Un client en retard dont l'habitude n'est
	  pas établie en est un — on voit qu'il doit, on ne peut PAS dire si ce
	  retard-là lui ressemble ou non, et c'est précisément la question à laquelle
	  la pilule « Rythme rompu » répond pour les autres.

	  Sans cette ligne, la pilule mentirait par omission : elle annoncerait « 2 »
	  sur un livre où quinze retardataires n'ont jamais été mesurés, et le gérant
	  lirait « deux clients sortent de leur rythme, les autres non ».

	  ⚠️ ZÉRO TANT QUE LA LECTURE EST EN VOL. Une carte encore absente ferait
	  compter TOUS les retardataires, le temps d'un aller-retour : le sommaire
	  afficherait un angle mort maximal puis le verrait fondre. On ne dit rien
	  avant de savoir.
	*/
	const enRetardSansHabitude =
		habitudes === undefined
			? 0
			: debiteurs.filter(
					(debiteur) => debiteur.facturesEchues > 0 && habitudes.get(debiteur._id) === undefined
				).length;

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
			: `${sansSecteur} sans réponse, au délai le plus court pour agir en justice`,
		enRetardSansHabitude === 0
			? null
			: `${enRetardSansHabitude} en retard sans habitude de paiement mesurable`
	].filter((phrase): phrase is string => phrase !== null);

	const cherches = debiteurs.filter((debiteur) => correspond(debiteur, terme));

	/** L'habitude d'un client, ou `undefined` : pas établie, ou lecture en vol. */
	const habitudeDe = (debiteur: LigneDebiteur): HabitudeDeLaLigne | undefined =>
		habitudes?.get(debiteur._id);

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
		FILTRES.map((filtre) => [
			filtre.cle,
			cherches.filter((debiteur) => filtre.retient(debiteur, habitudeDe(debiteur))).length
		])
	);

	const retenus = cherches.filter((debiteur) =>
		FILTRES.every(
			(filtre) => !filtres.has(filtre.cle) || filtre.retient(debiteur, habitudeDe(debiteur))
		)
	);

	/** Vrai dès qu'un geste de lecture cache quelque chose. */
	const filtree = terme !== '' || filtres.size > 0;

	/*
	  ═════════════════════════════════════════════════════════════════════════
	  LA BARRE : LA RECHERCHE ET UN SEUL FILTRE — comme les dossiers, et comme
	  Revolut au-dessus de ses transactions
	  ═════════════════════════════════════════════════════════════════════════

	  ⚠️ CE QUI EST PARTI LE 30/09/2026, ET POURQUOI. L'écran posait trois étages
	  avant le premier client : une carte « Encours total » (le montant qu'écrit
	  déjà l'écran du matin), le champ de recherche, puis quatre pilules de filtre
	  qui passaient sur TROIS lignes au téléphone. Verdict du fondateur : « less
	  is more », et « la même barre compacte partout ». Splitwise, qui fait « qui
	  me doit quoi », ouvre sa liste sur une barre fine et une seule ligne.

	  La recherche et le filtre vivent donc dans la barre collante ; les quatre
	  filtres, dans une feuille, avec leur compte — un filtre est un geste rare,
	  ce qu'on cherche au quotidien, on le TAPE. La recherche reste là même sur
	  trois clients : un livre passe de trois à quarante en un après-midi
	  d'import, et un champ qui apparaît entre deux visites se cherche.

	  ⚠️ LE COMPTE D'UN FILTRE SE LIT SUR CE QUE LA RECHERCHE A LAISSÉ (`comptes`,
	  plus haut) : « parmi ce que tu vois, autant sont dans ce cas ». Et un filtre
	  qui ne retiendrait personne ne se propose pas — sauf s'il est actif, pour
	  qu'on puisse toujours le retirer.
	*/
	const proposes = FILTRES.filter(
		(filtre) => (comptes.get(filtre.cle) ?? 0) > 0 || filtres.has(filtre.cle)
	);

	const barre = (
		<>
			{/*
			  ⚠️ `inputComponentProps`, ET PAS UN `aria-label` POSÉ SUR LE CHAMP :
			  `Input` a une liste de props FERMÉE et l'avalerait sans rien dire.
			  `tightFocusRing` : l'anneau du kit déborde de six pixels, et la barre
			  en gagnait un ballant horizontal.
			*/}
			<SearchField
				size="md"
				tightFocusRing
				className="min-w-0 flex-1"
				value={terme}
				onChange={(valeur) => onTerme(valeur)}
				inputMode="search"
				placeholder="Nom ou SIREN"
				inputComponentProps={{
					'aria-label': 'Chercher un client par son nom ou son SIREN',
					enterKeyHint: 'search'
				}}
			/>
			{proposes.length === 0 ? null : (
				<Button
					size="md"
					rounded
					square
					variant="solid"
					outline={false}
					className="shrink-0"
					aria-label={
						filtres.size === 0
							? 'Filtrer les clients'
							: `${filtres.size} filtre${pluriel(filtres.size)} actif${pluriel(filtres.size)} — changer`
					}
					onClick={() => setFiltreOuvert(true)}
				>
					<SlidersHorizontalIcon />
				</Button>
			)}
		</>
	);

	/*
	  LES FILTRES ACTIFS SE LISENT, ET SE RETIRENT D'UN APPUI. Un filtre posé
	  dans une feuille qu'on a refermée est un filtre qu'on oublie — et une liste
	  plus courte qu'hier, sans dire pourquoi, se lit comme une perte de données.
	*/
	const filtresActifs =
		filtres.size === 0 ? null : (
			<div className="flex flex-wrap gap-cladd-3xs">
				{FILTRES.filter((filtre) => filtres.has(filtre.cle)).map((filtre) => (
					<Chip
						key={filtre.cle}
						as="button"
						size="md"
						rounded
						icon={XIcon}
						onClick={() => onBasculerFiltre(filtre.cle)}
						aria-label={`Retirer le filtre « ${filtre.libelle} »`}
					>
						{filtre.libelle}
					</Chip>
				))}
			</div>
		);

	/*
	  LA FEUILLE DE FILTRE. Plusieurs filtres se cumulent (« échue » ET « rythme
	  rompu ») : la feuille reste donc ouverte à chaque appui, et chaque rangée
	  porte sa coche. Sa précision dit ce que le filtre retient, en toutes lettres.
	*/
	const feuilleDeFiltre = (
		<Popup
			open={filtreOuvert}
			onOpenChange={(o) => {
				if (!o) setFiltreOuvert(false);
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-xs font-semibold">Filtrer</span>}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				<ListeAnalyses>
					{proposes.map((filtre) => (
						<LigneBouton
							key={filtre.cle}
							genre="contenu"
							titre={filtre.libelle}
							precision={filtre.precision}
							valeur={`${comptes.get(filtre.cle) ?? 0}`}
							icone={
								filtres.has(filtre.cle) ? (
									<CheckIcon className="size-5" />
								) : (
									<span className="size-5" />
								)
							}
							onClick={() => onBasculerFiltre(filtre.cle)}
						/>
					))}
				</ListeAnalyses>
			</PopupContent>
		</Popup>
	);

	/*
	  ⚠️ CE QUE LE LOGICIEL NE VOIT PAS RESTE ÉCRIT, SOUS LA LISTE. Il vivait
	  dans la carte « Encours total », partie avec elle. Un livre de clients dont
	  trois n'ont pas de SIREN n'est pas surveillé au registre pour ces trois-là,
	  et le gérant qui l'ignore croit qu'il l'est : la phrase ne se replie pas, et
	  elle ne coûte aucune cible.
	*/
	const angleMort =
		anglesMorts.length === 0 ? null : (
			<p className="px-1 text-cladd-2xs text-cladd-fg-softer">
				Ce que le logiciel ne voit pas : {anglesMorts.join(' ; ')}.
			</p>
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
					Aucun de vos {debiteurs.length} clients ne répond à ce que vous cherchez.
				</ListItem>
				<ListButton icon={<RotateCcwIcon />} onClick={onToutAfficher}>
					Afficher les {debiteurs.length} clients
				</ListButton>
			</CarteListe>
		) : (
			<CarteListe
				titre={
					filtree
						? `${retenus.length} sur ${debiteurs.length} client${pluriel(debiteurs.length)}`
						: `${debiteurs.length} client${pluriel(debiteurs.length)}`
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
						to="/app/clients/$id"
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

							  ⚠️ ET LA RUPTURE D'HABITUDE N'EN EST PAS UNE TROISIÈME, alors que
							  c'était le réflexe. Essayée ici, mesurée au navigateur à 375 px :
							  la colonne du nom ne dispose que de 124 px, « 4 échues » en prend
							  74 avec son écart, et une puce « Rythme rompu » demande 110 px —
							  elle passait à la ligne et portait la rangée de l'imprimerie à
							  124 px contre 65 pour les autres. C'est mot pour mot le défaut que
							  le paragraphe des angles morts, plus haut, a fait sortir d'ici :
							  le client le plus abîmé produisait la rangée la plus haute.

							  Elle est donc partie dans la colonne de droite, dont la largeur
							  est fixée par le montant et non par la raison sociale.

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
						after={<ColonneDroite encours={debiteur.encours} habitude={habitudeDe(debiteur)} />}
					>
						{debiteur.denomination}
					</ListButton>
				))}
			</CarteListe>
		);

	return avecLaPage(
		<PageEcran entete={{ ...entete, actions: barre }}>
			{filtresActifs}
			{liste}
			{angleMort}
			{feuilleDeFiltre}
		</PageEcran>
	);
}
