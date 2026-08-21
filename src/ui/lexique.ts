/**
 * Le lexique d'illustration — un libellé de facture, une image.
 *
 * POURQUOI. Un responsable de cuisine reconnaît « côte de porc » sur une photo
 * avant d'avoir fini de lire le mot. Une file de confirmation en texte pur
 * l'oblige à lire quatre-vingts lignes ; la même file illustrée se parcourt à
 * l'œil, et il ne s'arrête que sur ce qui le surprend. Sur un écran dont le
 * seul travail est « trancher vite et bien », c'est le levier le plus fort.
 *
 * CE QUE CE N'EST PAS. Ce lexique ne classe RIEN. Il ne dit ni la famille
 * EGalim, ni le caractère bio, ni le caractère durable — ces trois décisions
 * appartiennent au classificateur, qui les justifie et les versionne. Se
 * tromper ici affiche une carotte devant un panais : c'est laid, ce n'est
 * jamais faux au sens du barème. Cette séparation est délibérée, et c'est elle
 * qui autorise un lexique approximatif.
 *
 * LA MÉCANIQUE. On travaille sur des jetons entiers, jamais sur des
 * sous-chaînes : « RAIE » ne doit pas s'allumer au milieu de « FRAISE ». Les
 * entrées les plus longues gagnent, ce qui règle « POMME DE TERRE » contre
 * « POMME » sans cas particulier.
 */

import type { Famille } from './format';

/** Les jetons d'un libellé : majuscules, sans accent, sans ponctuation. */
export function jetons(libelle: string): string[] {
	return libelle
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/Œ/g, 'OE')
		.replace(/œ/g, 'OE')
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, ' ')
		.trim()
		.split(' ')
		.filter(Boolean);
}

/**
 * Un jeton du libellé correspond-il à un jeton du lexique ?
 *
 * On tolère les marques du pluriel et du féminin, et elles seulement : sans
 * ça, il faudrait écrire POMME et POMMES, CHOU et CHOUX. On ne tolère RIEN
 * d'autre — un préfixe libre ferait matcher « PAIN » sur « PAINEAU », et
 * surtout « RIZ » sur n'importe quoi.
 */
function jetonEgal(duLibelle: string, duLexique: string): boolean {
	if (duLibelle === duLexique) return true;
	const suffixe = duLibelle.slice(duLexique.length);
	return (
		duLibelle.startsWith(duLexique) &&
		(suffixe === 'S' || suffixe === 'X' || suffixe === 'E' || suffixe === 'ES')
	);
}

/** La suite de jetons du lexique apparaît-elle telle quelle dans le libellé ? */
function contientSuite(libelle: string[], cle: string[]): boolean {
	for (let i = 0; i + cle.length <= libelle.length; i++) {
		let ok = true;
		for (let j = 0; j < cle.length; j++) {
			if (!jetonEgal(libelle[i + j]!, cle[j]!)) {
				ok = false;
				break;
			}
		}
		if (ok) return true;
	}
	return false;
}

/**
 * Le lexique lui-même.
 *
 * Il couvre ce qu'on lit sur une facture de restauration collective, pas le
 * dictionnaire du français. Les entrées ambiguës en sont volontairement
 * absentes : « BAR » est un poisson autant qu'un conditionnement, « RAIE » est
 * rare et fragile — mieux vaut retomber sur l'emoji de famille que montrer une
 * image fausse avec aplomb.
 */
const LEXIQUE: ReadonlyArray<readonly [string, string]> = [
	// — Légumes ————————————————————————————————————————————————
	['POMME DE TERRE', '🥔'],
	['POMMES DE TERRE', '🥔'],
	['PATATE', '🥔'],
	['PATATE DOUCE', '🍠'],
	['FRITE', '🍟'],
	['CAROTTE', '🥕'],
	['TOMATE', '🍅'],
	['TOMATE CERISE', '🍅'],
	['SALADE', '🥬'],
	['LAITUE', '🥬'],
	['BATAVIA', '🥬'],
	['SCAROLE', '🥬'],
	['MACHE', '🥬'],
	['ROQUETTE', '🥬'],
	['EPINARD', '🥬'],
	['POIREAU', '🥬'],
	['CHOU', '🥬'],
	['CHOU FLEUR', '🥦'],
	['BROCOLI', '🥦'],
	['COURGETTE', '🥒'],
	['CONCOMBRE', '🥒'],
	['CORNICHON', '🥒'],
	['AUBERGINE', '🍆'],
	['POIVRON', '🫑'],
	['PIMENT', '🌶️'],
	['OIGNON', '🧅'],
	['ECHALOTE', '🧅'],
	['AIL', '🧄'],
	['CHAMPIGNON', '🍄'],
	['PLEUROTE', '🍄'],
	['MAIS', '🌽'],
	['HARICOT', '🫘'],
	['FLAGEOLET', '🫘'],
	['PETIT POIS', '🫛'],
	['POIS', '🫛'],
	['FEVE', '🫘'],
	['COURGE', '🎃'],
	['POTIRON', '🎃'],
	['POTIMARRON', '🎃'],
	['BUTTERNUT', '🎃'],
	['NAVET', '🥬'],
	['RADIS', '🥬'],
	['BETTERAVE', '🥬'],
	['CELERI', '🥬'],
	['PANAIS', '🥬'],
	['FENOUIL', '🥬'],
	['ENDIVE', '🥬'],
	['ARTICHAUT', '🥬'],
	['ASPERGE', '🥬'],
	['AVOCAT', '🥑'],
	['OLIVE', '🫒'],
	['RATATOUILLE', '🍆'],
	['CRUDITE', '🥗'],
	['LEGUME', '🥬'],

	// — Fruits —————————————————————————————————————————————————
	['POMME', '🍎'],
	['POIRE', '🍐'],
	['BANANE', '🍌'],
	['ORANGE', '🍊'],
	['CLEMENTINE', '🍊'],
	['MANDARINE', '🍊'],
	['CITRON', '🍋'],
	['PAMPLEMOUSSE', '🍊'],
	['FRAISE', '🍓'],
	['FRAMBOISE', '🍓'],
	['MYRTILLE', '🫐'],
	['CASSIS', '🫐'],
	['RAISIN', '🍇'],
	['PECHE', '🍑'],
	['NECTARINE', '🍑'],
	['ABRICOT', '🍑'],
	['PRUNE', '🍑'],
	['CERISE', '🍒'],
	['MELON', '🍈'],
	['PASTEQUE', '🍉'],
	['ANANAS', '🍍'],
	['KIWI', '🥝'],
	['MANGUE', '🥭'],
	['NOIX', '🌰'],
	['NOISETTE', '🌰'],
	['AMANDE', '🌰'],
	['CHATAIGNE', '🌰'],
	['DATTE', '🌰'],
	['FIGUE', '🌰'],
	['FRUIT', '🍎'],

	// — Viandes ————————————————————————————————————————————————
	['BOEUF', '🥩'],
	['STEAK', '🥩'],
	['BAVETTE', '🥩'],
	['ENTRECOTE', '🥩'],
	['BOURGUIGNON', '🥩'],
	['VEAU', '🥩'],
	['AGNEAU', '🍖'],
	['MOUTON', '🍖'],
	['GIGOT', '🍖'],
	['PORC', '🥓'],
	['LARD', '🥓'],
	['LARDON', '🥓'],
	['POITRINE', '🥓'],
	['ECHINE', '🥓'],
	['ROTI', '🍖'],
	['POULET', '🍗'],
	['VOLAILLE', '🍗'],
	['DINDE', '🍗'],
	['DINDONNEAU', '🍗'],
	['PINTADE', '🍗'],
	['CANARD', '🦆'],
	['LAPIN', '🐰'],
	['CUISSE', '🍗'],
	['AIGUILLETTE', '🍗'],
	['ESCALOPE', '🍗'],
	['JAMBON', '🍖'],
	['SAUCISSE', '🌭'],
	['SAUCISSON', '🌭'],
	['CHIPOLATA', '🌭'],
	['MERGUEZ', '🌭'],
	['KNACKI', '🌭'],
	['BOUDIN', '🌭'],
	['ANDOUILLE', '🌭'],
	['RILLETTE', '🍖'],
	['TERRINE', '🍖'],
	['CHARCUTERIE', '🍖'],
	['VIANDE', '🥩'],
	['HACHE', '🥩'],
	['NUGGET', '🍗'],
	['CORDON BLEU', '🍗'],

	// — Poissons et fruits de mer ——————————————————————————————
	['CABILLAUD', '🐟'],
	['MORUE', '🐟'],
	['COLIN', '🐟'],
	['LIEU', '🐟'],
	['MERLU', '🐟'],
	['SAUMON', '🐟'],
	['TRUITE', '🐟'],
	['THON', '🐟'],
	['SARDINE', '🐟'],
	['MAQUEREAU', '🐟'],
	['HARENG', '🐟'],
	['ANCHOIS', '🐟'],
	['SOLE', '🐟'],
	['LIMANDE', '🐟'],
	['JULIENNE', '🐟'],
	['EGLEFIN', '🐟'],
	['PANGA', '🐟'],
	['POISSON', '🐟'],
	['PECHE DURABLE', '🐟'],
	['SURIMI', '🦀'],
	['CREVETTE', '🦐'],
	['GAMBAS', '🦐'],
	['MOULE', '🦪'],
	['HUITRE', '🦪'],
	['COQUILLE', '🦪'],
	['SAINT JACQUES', '🦪'],
	['CALAMAR', '🦑'],
	['ENCORNET', '🦑'],
	['CRABE', '🦀'],

	// — Produits laitiers et œufs ——————————————————————————————
	['LAIT', '🥛'],
	['CREME', '🥛'],
	['CREME FRAICHE', '🥛'],
	['BEURRE', '🧈'],
	['MARGARINE', '🧈'],
	['FROMAGE', '🧀'],
	['EMMENTAL', '🧀'],
	['GRUYERE', '🧀'],
	['COMTE', '🧀'],
	['MOZZARELLA', '🧀'],
	['CAMEMBERT', '🧀'],
	['BRIE', '🧀'],
	['CHEVRE', '🧀'],
	['ROQUEFORT', '🧀'],
	['CANTAL', '🧀'],
	['RACLETTE', '🧀'],
	['PARMESAN', '🧀'],
	['FETA', '🧀'],
	['RICOTTA', '🧀'],
	['YAOURT', '🍶'],
	['FROMAGE BLANC', '🍶'],
	['PETIT SUISSE', '🍶'],
	['FAISSELLE', '🍶'],
	['OEUF', '🥚'],
	['OMELETTE', '🍳'],

	// — Boulangerie et féculents ———————————————————————————————
	['PAIN', '🍞'],
	['BAGUETTE', '🥖'],
	['BRIOCHE', '🥐'],
	['CROISSANT', '🥐'],
	['VIENNOISERIE', '🥐'],
	['FARINE', '🌾'],
	['RIZ', '🍚'],
	['PATE', '🍝'],
	['SPAGHETTI', '🍝'],
	['MACARONI', '🍝'],
	['COQUILLETTE', '🍝'],
	['TAGLIATELLE', '🍝'],
	['PENNE', '🍝'],
	['LASAGNE', '🍝'],
	['RAVIOLI', '🍝'],
	['SEMOULE', '🍚'],
	['COUSCOUS', '🍚'],
	['BOULGOUR', '🍚'],
	['QUINOA', '🍚'],
	['BLE', '🌾'],
	['LENTILLE', '🫘'],
	['POIS CHICHE', '🫘'],
	['PUREE', '🥔'],
	['GNOCCHI', '🥔'],
	['PIZZA', '🍕'],
	['QUICHE', '🥧'],
	['TARTE', '🥧'],
	['SANDWICH', '🥪'],
	['BURGER', '🍔'],
	['GALETTE', '🥞'],
	['CREPE', '🥞'],

	// — Épicerie ———————————————————————————————————————————————
	['HUILE', '🫒'],
	['VINAIGRE', '🧴'],
	['VINAIGRETTE', '🧴'],
	['MOUTARDE', '🧴'],
	['KETCHUP', '🧴'],
	['MAYONNAISE', '🧴'],
	['SAUCE', '🥫'],
	['CONSERVE', '🥫'],
	['CONCASSE', '🥫'],
	['COULIS', '🥫'],
	['SOUPE', '🍲'],
	['VELOUTE', '🍲'],
	['POTAGE', '🍲'],
	['BOUILLON', '🍲'],
	['SEL', '🧂'],
	['POIVRE', '🧂'],
	['EPICE', '🧂'],
	['CURRY', '🧂'],
	['PAPRIKA', '🧂'],
	['HERBE', '🌿'],
	['PERSIL', '🌿'],
	['BASILIC', '🌿'],
	['THYM', '🌿'],
	['LAURIER', '🌿'],
	['CIBOULETTE', '🌿'],
	['SUCRE', '🍬'],
	['BONBON', '🍬'],
	['CHOCOLAT', '🍫'],
	['CACAO', '🍫'],
	['CONFITURE', '🍯'],
	['MIEL', '🍯'],
	['COMPOTE', '🍎'],
	['BISCUIT', '🍪'],
	['GATEAU', '🍰'],
	['MADELEINE', '🍰'],
	['GAUFRE', '🧇'],
	['CEREALE', '🥣'],
	['MUESLI', '🥣'],
	['GLACE', '🍨'],
	['SORBET', '🍨'],
	['DESSERT', '🍮'],
	['FLAN', '🍮'],
	['CREME DESSERT', '🍮'],
	['LEVURE', '🌾'],
	['CHAPELURE', '🍞'],
	['FECULE', '🌾'],

	// — Boissons ———————————————————————————————————————————————
	['EAU', '💧'],
	['EAU DE JAVEL', '🧴'],
	['JAVEL', '🧴'],
	['JUS', '🧃'],
	['NECTAR', '🧃'],
	['SIROP', '🧃'],
	['SODA', '🥤'],
	['LIMONADE', '🥤'],
	['CAFE', '☕'],
	['THE', '🍵'],
	['INFUSION', '🍵'],
	['TISANE', '🍵'],
	['CHOCOLAT CHAUD', '☕'],
	['VIN', '🍷'],
	['BIERE', '🍺'],
	['CIDRE', '🍺'],
	['BOISSON', '🥤'],

	// — Ce qui n'est pas alimentaire ————————————————————————————
	// Ces lignes existent sur toutes les factures de grossiste, et elles ne
	// comptent dans aucun taux. Les illustrer différemment évite au gérant de
	// s'arrêter dessus.
	['PAPIER', '🧻'],
	['ESSUIE', '🧻'],
	['ESSUIE TOUT', '🧻'],
	['SERVIETTE', '🧻'],
	['SOPALIN', '🧻'],
	['SAC', '🛍️'],
	['SAC POUBELLE', '🗑️'],
	['POUBELLE', '🗑️'],
	['GANT', '🧤'],
	['CHARLOTTE', '🧤'],
	['TABLIER', '🧤'],
	['MASQUE', '😷'],
	['DETERGENT', '🧴'],
	['DEGRAISSANT', '🧴'],
	['DESINFECTANT', '🧴'],
	['LESSIVE', '🧴'],
	['LIQUIDE VAISSELLE', '🧴'],
	['NETTOYANT', '🧴'],
	['SAVON', '🧼'],
	['GEL HYDROALCOOLIQUE', '🧼'],
	['EPONGE', '🧽'],
	['BARQUETTE', '📦'],
	['FILM', '📦'],
	['ALUMINIUM', '📦'],
	['EMBALLAGE', '📦'],
	['GOBELET', '🥤'],
	['COUVERT', '🍴'],
	['ASSIETTE', '🍽️'],
	['TRANSPORT', '🚚'],
	['LIVRAISON', '🚚'],
	['FRAIS DE PORT', '🚚'],
	['CONSIGNE', '🚚'],
	['LOCATION', '🧾'],
	['ACOMPTE', '🧾'],
	['AVOIR', '🧾'],
	['REMISE', '🧾'],
	['RISTOURNE', '🧾'],
	['ESCOMPTE', '🧾']
];

/**
 * Le lexique, trié une fois pour toutes : d'abord le plus de jetons, puis le
 * plus long. C'est ce tri, et lui seul, qui fait gagner « POMME DE TERRE » sur
 * « POMME » — il n'y a donc aucun cas particulier à maintenir dans le lexique.
 */
const ENTREES = LEXIQUE.map(([cle, emoji]) => ({ cle: jetons(cle), emoji })).sort(
	(a, b) => b.cle.length - a.cle.length || b.cle.join('').length - a.cle.join('').length
);

/** Le repli par famille, quand aucun mot du libellé n'est reconnu. */
export const EMOJI_FAMILLE: Record<Famille, string> = {
	VIANDE: '🥩',
	POISSON: '🐟',
	FRUITS_LEGUMES: '🥬',
	LAITIERS: '🧀',
	EPICERIE_SECHE: '🌾',
	EPICERIE_APPERTISEE: '🥫',
	BOISSONS: '🥤',
	AUTRE: '🍽️'
};

/** Le dernier repli : ni mot reconnu, ni famille connue. */
const INCONNU = '🍽️';
const NON_ALIMENTAIRE = '📦';

/**
 * L'illustration d'un libellé.
 *
 * `famille` et `estAlimentaire` viennent du classificateur quand il s'est
 * prononcé ; ils ne servent que de repli. Un libellé reconnu par le lexique
 * l'emporte toujours, parce qu'il est plus précis qu'une famille entière.
 */
export function illustrer(
	libelle: string,
	famille?: Famille | null,
	estAlimentaire?: boolean | null
): string {
	const mots = jetons(libelle);
	for (const entree of ENTREES) {
		if (contientSuite(mots, entree.cle)) return entree.emoji;
	}
	if (estAlimentaire === false) return NON_ALIMENTAIRE;
	if (famille) return EMOJI_FAMILLE[famille] ?? INCONNU;
	return INCONNU;
}
