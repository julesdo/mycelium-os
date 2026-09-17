import { Button, Chip, Surface, Textarea } from '@cladd-ui/react';
import { SendHorizontalIcon } from 'lucide-react';
import { cn } from './cn';
import { RefusEnQuatreParties } from './refus';

/**
 * LA CONVERSATION — troisième position du volet de preuve (D14, D15).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA CITATION EST AU GRAIN DE LA PHRASE, PAS DE LA RÉPONSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque phrase du compagnon porte SA pastille. Une source posée sur la
 * réponse entière laisserait passer la phrase fausse au milieu de trois
 * justes — et c'est celle-là que le gérant recopierait dans un courrier.
 *
 * Une phrase sans pastille s'affiche VISIBLEMENT DÉGRADÉE et porte la mention
 * « non sourcé ». Elle a le droit d'exister : le compagnon peut dire qu'il ne
 * sait pas d'où sort quelque chose. Il n'a pas le droit de le dire
 * silencieusement, ni d'y mettre un montant ou un énoncé juridique — ce sont
 * les filtres avant rendu qui le tiennent, au point d'usage, et ils lèvent en
 * nommant le terme trouvé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUNE COULEUR RÉSERVÉE, NULLE PART
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les pastilles sont NEUTRES. Le vert, le rouge et l'ambre ne disent qu'une
 * chose dans ce produit — au-dessus du seuil, tout près, en dessous — et une
 * source n'est pas un seuil. Un doute non plus.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ QUAND LE PLAFOND MORD, LE CHAMP DISPARAÎT — IL NE SE GRISE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un champ désactivé se lit comme une panne, et un champ qui accepte la frappe
 * pour refuser à l'envoi est un mur avec un délai. À la place : le refus en
 * quatre parties, qui commence par ce que le produit continue de faire — et ce
 * qu'il continue de faire est presque tout, puisque la file, les décomptes,
 * les échéances et la prescription ne passent par aucun appel modèle.
 *
 * ⚠️ ET IL NE S'OUVRE JAMAIS VIDE SUR UNE POLITESSE. Pas de « comment puis-je
 * vous aider ». Le vide montre la portée du fil et ce qu'il sait lire, ce qui
 * est une information ; une salutation n'en est pas une.
 */

export type GenreSourcePhrase = 'PARAMETRE' | 'DECOMPTE' | 'PIECE' | 'AUCUNE';

/** Une phrase, et la source qui l'ancre — ou l'aveu qu'elle n'en a pas. */
export interface PhraseAffichee {
	readonly texte: string;
	readonly genreSource: GenreSourcePhrase;
	/**
	 * Ce que la pastille montre, en toutes lettres : « art. D441-5, relevé le
	 * 04/01 », « décompte du 12/09 », « BL-77 ». Vide sur `AUCUNE`.
	 */
	readonly libelleSource: string;
	/** Ouvre la source dans la position voisine du volet, quand c'est possible. */
	readonly onOuvrirSource?: () => void;
}

/** Un tour de parole. Le gérant n'en porte qu'une phrase, et sans pastille. */
export interface TourAffiche {
	readonly id: string;
	readonly role: 'GERANT' | 'COMPAGNON';
	readonly phrases: readonly PhraseAffichee[];
	/** Horodatage en millisecondes. */
	readonly diteLe: number;
}

/** Le refus en quatre parties, tel que le domaine le compose. */
export interface RefusAffiche {
	readonly peutFaire: string;
	readonly constat: string;
	readonly blocages: readonly string[];
	readonly coutDeLAttente: string;
}

/**
 * Où en est le compteur de coût du mois.
 *
 * ⚠️ `cumul` N'EST PAS AFFICHÉ, ET C'EST DÉLIBÉRÉ. Le barème est un budget de
 * pilotage en dollars lus comme des euros, et son propre module dit qu'il n'est
 * « pas une facture ». Montrer un chiffre à un gérant qui paie un abonnement à
 * prix fixe lui ferait lire une consommation qu'on ne lui refacture pas. Les
 * DEUX SEUILS, eux, s'affichent : ce sont eux qui expliquent l'arrêt.
 */
export interface CompteurConversation {
	readonly niveau: 'OUVERT' | 'AVERTI' | 'ARRETE';
	/** `AAAA-MM`. Le grain du compteur, dit pour qu'un arrêt ait une fin. */
	readonly mois: string;
	readonly avertissement: number;
	readonly arret: number;
}

/** Tout ce que la position Conversation montre, et ce qu'elle déclenche. */
export interface ConversationAffichee {
	readonly tours: readonly TourAffiche[];
	readonly compteur: CompteurConversation;
	/** Le refus du dernier échange, quand il y en a un. */
	readonly refus: RefusAffiche | null;
	/** Ce que la question a déclenché, visible sans qu'on le demande. */
	readonly enCours: boolean;
	readonly question: string;
	readonly onQuestion: (question: string) => void;
	readonly onDemander: () => void;
}

/** `AAAA-MM` rendu lisible, sans jamais le réinterpréter. */
const MOIS_EN_FRANCAIS = [
	'janvier',
	'février',
	'mars',
	'avril',
	'mai',
	'juin',
	'juillet',
	'août',
	'septembre',
	'octobre',
	'novembre',
	'décembre'
];

export function moisLisible(mois: string): string {
	const [annee, rang] = mois.split('-');
	const index = Number(rang) - 1;
	if (annee === undefined || Number.isNaN(index) || MOIS_EN_FRANCAIS[index] === undefined) {
		return mois;
	}
	return `${MOIS_EN_FRANCAIS[index]} ${annee}`;
}

/**
 * LA PASTILLE D'UNE PHRASE.
 *
 * ⚠️ NEUTRE, TOUJOURS, et `md` comme tout le reste de la colonne : une pastille
 * plus petite que sa rangée serait illisible au doigt, et le kit réserve `2xs`
 * et `xs` à ce qui vit DANS un conteneur plus dense.
 */
function PastilleDeSource({ phrase }: { phrase: PhraseAffichee }) {
	if (phrase.genreSource === 'AUCUNE') {
		return (
			<Chip size="md" color="neutral" className="self-start">
				non sourcé
			</Chip>
		);
	}

	if (phrase.onOuvrirSource === undefined) {
		return (
			<Chip size="md" color="neutral" className="self-start">
				{phrase.libelleSource}
			</Chip>
		);
	}

	// ⚠️ `self-start`, SINON LA PASTILLE PREND TOUTE LA COLONNE. Le parent est un
	// `flex-col` : un bouton y est étiré sur la largeur, et une source large de
	// 410 px se lit comme une barre d'action, pas comme une citation.
	return (
		<Button
			size="md"
			variant="transparent"
			outline={false}
			className="self-start"
			onClick={phrase.onOuvrirSource}
		>
			<Chip size="md" color="neutral">
				{phrase.libelleSource}
			</Chip>
		</Button>
	);
}

function Phrase({ phrase }: { phrase: PhraseAffichee }) {
	const nonSourcee = phrase.genreSource === 'AUCUNE';

	return (
		<div className="flex flex-col gap-1">
			<p
				className={cn(
					'text-cladd-2xs leading-relaxed',
					nonSourcee ? 'text-cladd-fg-softer italic' : 'text-cladd-fg'
				)}
			>
				{phrase.texte}
			</p>
			<PastilleDeSource phrase={phrase} />
		</div>
	);
}

function Tour({ tour }: { tour: TourAffiche }) {
	const duGerant = tour.role === 'GERANT';

	return (
		<Surface
			as="article"
			aria-label={duGerant ? 'Votre question' : 'Ce que le logiciel a relevé'}
			variant="transparent"
			outline={false}
			className={cn('verre-carte rounded-cladd-xl', duGerant && 'verre-dense')}
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<p className="text-cladd-2xs font-semibold tracking-tight text-cladd-fg-softer">
				{duGerant ? 'Vous' : 'Le logiciel'}
			</p>

			{duGerant ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg">
					{tour.phrases.map((phrase) => phrase.texte).join(' ')}
				</p>
			) : (
				tour.phrases.map((phrase, rang) => (
					<Phrase key={`${tour.id}-${rang}`} phrase={phrase} />
				))
			)}
		</Surface>
	);
}

/**
 * CE QUE LE FIL DIT QUAND IL EST VIDE.
 *
 * ⚠️ PAS UN CADRAN À ZÉRO, PAS UNE SALUTATION. Il nomme la portée du fil — ce
 * dossier, et rien d'autre — et ce qu'il refuse par construction, pour qu'on
 * n'ait pas à l'apprendre en se faisant refuser.
 */
function FilVide() {
	return (
		<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
			Ce fil est borné à ce dossier : ses factures, ses pièces, ses décomptes et les valeurs du
			référentiel qui les chiffrent. Chaque phrase de la réponse portera sa source. Ce qui ne peut
			pas être relié à une source n’est pas rendu, et ce qui relève d’une conduite à tenir n’est
			pas écrit ici.
		</p>
	);
}

/**
 * L'AVERTISSEMENT DU PLAFOND MOU — on prévient, on ne coupe rien.
 *
 * ⚠️ IL NE PORTE AUCUNE COULEUR RÉSERVÉE. Un ambre sur un compteur de coût
 * ferait lire un seuil du domaine là où il n'y en a pas.
 */
function Avertissement({ compteur }: { compteur: CompteurConversation }) {
	return (
		<Surface
			as="aside"
			aria-label="Le compteur de conversation du mois"
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="p-cladd-2xs"
		>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				La conversation de cet établissement a dépassé son repère de {compteur.avertissement} pour{' '}
				{moisLisible(compteur.mois)}, sur un plafond de sécurité de {compteur.arret} — un budget de
				pilotage, jamais une facture. Au plafond, la conversation libre s’arrête, et rien d’autre :
				la file, les décomptes, les échéances et la prescription continuent de se calculer sans
				elle.
			</p>
		</Surface>
	);
}

/**
 * LA POSITION CONVERSATION, EN ENTIER.
 *
 * ⚠️ AUCUN COMPOSANT D'ENVOI AU DÉBITEUR N'EXISTE ICI (B5). Le seul verbe est
 * « Demander », et il parle au logiciel. On ne relance jamais le débiteur au
 * nom du client : une commande absente ne s'active jamais par accident, une
 * commande grisée, si.
 */
export function Conversation({ conversation }: { conversation: ConversationAffichee }) {
	const arretee = conversation.compteur.niveau === 'ARRETE';
	const question = conversation.question.trim();

	return (
		<div className="flex flex-col gap-cladd-2xs">
			{conversation.compteur.niveau === 'AVERTI' ? (
				<Avertissement compteur={conversation.compteur} />
			) : null}

			{conversation.tours.length === 0 && conversation.refus === null ? <FilVide /> : null}

			{conversation.tours.map((tour) => (
				<Tour key={tour.id} tour={tour} />
			))}

			{/* RÈGLE D'ÉCRAN N° 2 : tout traitement se voit sans qu'on le demande. */}
			{conversation.enCours ? (
				<p className="text-cladd-2xs text-cladd-fg-softer" role="status">
					Lecture du dossier…
				</p>
			) : null}

			{conversation.refus === null ? null : (
				<RefusEnQuatreParties
					peutFaire={conversation.refus.peutFaire}
					constat={conversation.refus.constat}
					blocages={conversation.refus.blocages}
					coutDeLAttente={conversation.refus.coutDeLAttente}
				/>
			)}

			{arretee ? null : (
				<div className="flex flex-col gap-cladd-3xs">
					<Textarea
						size="md"
						value={conversation.question}
						onChange={conversation.onQuestion}
						placeholder="Une question sur ce dossier"
						inputClassName="max-h-40"
					/>
					<Button
						size="md"
						color="brand"
						variant="solid"
						className="self-end"
						disabled={question === '' || conversation.enCours}
						onClick={conversation.onDemander}
					>
						<SendHorizontalIcon />
						Demander
					</Button>
				</div>
			)}
		</div>
	);
}
