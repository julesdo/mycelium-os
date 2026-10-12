import { Chip, Select, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, ChevronRightIcon, LockIcon, PlusIcon } from 'lucide-react';
import { BoutonSecondaire } from './bouton';
import { VignetteDocument, mimeProbable } from './coffre';
import { dateCourte } from './format';

/**
 * LES PIÈCES QUI PORTENT LE DOSSIER — module 1.2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CET ÉCRAN DÉBLOQUE UN VERDICT QUI ÉTAIT INATTEIGNABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La table des pièces était lue par les deux moteurs et écrite nulle part.
 * Les quatre conditions légales valent 12 points sur 20, le seuil de
 * qualification est à 15, et les points manquants sont TOUS documentaires : une
 * créance parfaite en droit plafonnait à 0,60, et aucune ne pouvait être
 * éligible. L'écran de créance affichait donc « Ce qui renforcerait ce
 * dossier » — une liste de pièces à fournir — sans aucun endroit où les
 * fournir. Une consigne impossible à suivre est pire qu'aucune consigne.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE LOGICIEL RECONNAÎT, LE GÉRANT CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Règle d'écran n° 1 : on ne demande pas « quel type de document déposez-vous ? »
 * devant un PDF qui porte « BON DE LIVRAISON » en en-tête. La pièce se dépose,
 * la lecture tourne, et le sélecteur de type n'est là que pour le cas où elle
 * s'est trompée — ou n'a rien pu conclure.
 *
 * ⚠️ ET L'ÉTAT DE LA LECTURE SE VOIT SANS QU'ON LE DEMANDE (règle n° 2). Une
 * pièce « en lecture » le dit ; une pièce que le modèle n'a pas su classer le
 * dit aussi, et ne compte dans aucun critère tant que personne ne l'a classée.
 */

export interface PieceAffichee {
	readonly _id: string;
	readonly type: string;
	readonly statut?: string;
	readonly filename: string;
	readonly reference?: string;
	readonly dateDocument?: string;
	readonly reserves?: string;
	/**
	 * Le taux de retard stipulé, lu dans des CGV ou un contrat.
	 *
	 * ⚠️ UNE PROPOSITION, PAS UN TAUX EN VIGUEUR. Ce qui entre dans un décompte
	 * vit sur les factures ; celui-ci attend un geste sur la fiche du débiteur.
	 */
	readonly tauxRetardStipule?: string;
	readonly constat?: string;
	/** Le type du fichier, pour sa vignette. */
	readonly mimeType?: string;
	/** Chiffrée au coffre : le cadenas de sa carte le dit. */
	readonly scelle?: boolean;
}

export interface OptionTypePiece {
	readonly cle: string;
	readonly libelle: string;
	/** Ce que cette pièce établit. C'est ça qui décide, pas son nom. */
	readonly apport: string;
}

/**
 * Les natures de pièce, et ce que chacune ÉTABLIT.
 *
 * ⚠️ L'APPORT SOUS CHAQUE OPTION, PAS LE NOM SEUL. Un gérant ne classe pas un
 * document pour le plaisir de la nomenclature : il le classe parce que ça
 * change la solidité de son dossier. « Bon de livraison » ne dit rien ;
 * « prouve que la marchandise a été remise » dit pourquoi ça compte.
 *
 * `INDETERMINE` y figure délibérément : c'est un état légitime — un document
 * déposé dont la lecture n'a rien conclu — et le masquer empêcherait de revenir
 * en arrière après un classement erroné.
 *
 * ⚠️ CETTE LISTE VIVAIT DANS `screens/debiteur-detail.tsx`, C'EST-À-DIRE DANS UN
 * ÉCRAN QUE LA REFONTE SUPPRIME. Deux surfaces la lisent désormais — la page des
 * pièces d'un débiteur et la section 5 du volet de preuve — et la laisser là-bas
 * aurait fait partir la nomenclature avec l'écran. Ce n'est pas une valeur
 * juridique : c'est une nomenclature d'affichage, et sa place est avec le
 * composant qui la rend.
 */
export const TYPES_PIECE: readonly OptionTypePiece[] = [
	{ cle: 'INDETERMINE', libelle: 'À classer', apport: 'Ne compte dans aucun critère' },
	{
		cle: 'BON_DE_COMMANDE',
		libelle: 'Bon de commande',
		apport: 'Établit que le client a commandé'
	},
	{ cle: 'DEVIS_SIGNE', libelle: 'Devis signé', apport: 'Établit que le client a commandé' },
	{
		cle: 'BON_DE_LIVRAISON',
		libelle: 'Bon de livraison',
		apport: 'Établit que la prestation a été reçue'
	},
	{ cle: 'CGV', libelle: 'Conditions générales', apport: 'Établit les conditions de paiement' },
	{ cle: 'CONTRAT', libelle: 'Contrat', apport: 'Établit les conditions de paiement' },
	{
		cle: 'MISE_EN_DEMEURE',
		libelle: 'Lettre de relance officielle',
		apport: 'Établit l’interpellation préalable'
	},
	{ cle: 'ECHANGES', libelle: 'Échanges', apport: 'Documente la relation, sans critère propre' },
	{
		cle: 'ORDONNANCE',
		libelle: 'Décision du juge',
		apport: 'Ne compte dans aucun critère : ses références remplissent les courriers'
	},
	{ cle: 'FACTURE', libelle: 'Facture', apport: 'La facture elle-même' }
];

/**
 * ⚠️ LE DÉPÔT N'EST PLUS ICI (12/10/2026) : UN bouton ouvre le parcours de dépôt,
 * le même qu'à l'accueil et au coffre (`ParcoursDepot`). La zone qui se dépliait
 * dans la rangée faisait déposer des pièces sensibles « au beau milieu » d'un
 * dossier, sans rien dire de ce qu'elles devenaient.
 *
 * ⚠️ ET UNE PIÈCE SE RELIT. Sa carte s'ouvre en plein écran dans la visionneuse
 * du coffre : l'aperçu, ce que la lecture a trouvé, son sceau et qui l'a ouverte.
 * Le retrait vit là-bas, derrière une confirmation, et s'inscrit au journal :
 * une poubelle au bout de chaque carte retirait une preuve d'un toucher.
 */
export function Pieces({
	pieces,
	optionsType,
	onAjouter,
	onOuvrir,
	onClasser,
	enCours = false
}: {
	pieces: readonly PieceAffichee[];
	optionsType: readonly OptionTypePiece[];
	onAjouter: () => void;
	onOuvrir: (pieceId: string) => void;
	onClasser: (pieceId: string, type: string) => void;
	enCours?: boolean;
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<BoutonSecondaire pleineLargeur onClick={onAjouter} disabled={enCours}>
				<PlusIcon />
				Ajouter des documents
			</BoutonSecondaire>
			<p className="flex items-start gap-1.5 px-1 text-cladd-2xs text-cladd-fg-soft">
				<LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
				Bon de livraison, commande, CGV, contrat : chiffrés au coffre dès leur arrivée, lus et
				classés tout seuls.
			</p>

			{pieces.map((piece) => (
				<Surface
					key={piece._id}
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					{/* LA CARTE S'OUVRE : l'aperçu en plein écran, comme au coffre. */}
					<button
						type="button"
						onClick={() => onOuvrir(piece._id)}
						aria-label={`Ouvrir ${piece.filename}`}
						className="-m-1 flex min-h-11 items-center gap-cladd-3xs rounded-cladd-lg p-1 text-left transition-transform duration-150 active:scale-[0.99]"
					>
						<VignetteDocument
							mime={mimeProbable(piece.mimeType, piece.filename)}
							scelle={piece.scelle ?? false}
						/>
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="truncate text-cladd-xs font-medium">{piece.filename}</span>
							{/* Ne dit « scellée » que ce qui l'est, et « en route » que ce qui l'est. */}
							{piece.scelle ? (
								<span className="text-cladd-2xs text-cladd-fg-soft">Chiffrée au coffre</span>
							) : piece.statut === 'EN_LECTURE' ? (
								<span className="text-cladd-2xs text-cladd-fg-soft">Mise au coffre…</span>
							) : null}
						</span>
						<EtatLecture statut={piece.statut} />
						<ChevronRightIcon className="size-4 shrink-0 text-cladd-fg-softer" aria-hidden />
					</button>

					{/* Le constat de la lecture, MOT POUR MOT. Le reformuler ici ferait
					    un second endroit où le produit dit ce qu'il a lu. */}
					{piece.constat ? (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{piece.constat}</p>
					) : null}

					{/* ⚠️ UNE RÉSERVE EST UN FAIT DE LITIGE, et le questionnaire de
					    qualification demande précisément « une réserve portée sur un bon
					    de livraison ». La lire et ne pas la montrer laisserait le gérant
					    y répondre « non » de bonne foi. */}
					{piece.reserves ? (
						<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							<AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
							Réserve portée sur ce document : « {piece.reserves} »
						</p>
					) : null}

					{piece.dateDocument ? (
						<p className="text-cladd-2xs text-cladd-fg-softest">
							Daté du {dateCourte(piece.dateDocument)}
							{piece.reference ? `, n° ${piece.reference}` : ''}
						</p>
					) : null}

					{/* Le sélecteur est TOUJOURS là, pas seulement quand la lecture a
					    échoué : le modèle peut se tromper avec assurance, et une
					    correction qu'il faut chercher ne se fait pas. */}
					<Select
						className="min-w-0"
						surface="cut"
						size="lg"
						title="Nature du document"
						options={[...optionsType]}
						value={piece.type}
						getOptionValue={(option) => option.cle}
						onChange={(cle) => onClasser(piece._id, cle as string)}
						renderOption={({ value }) => value.libelle}
						renderOptionInfo={({ value }) => value.apport}
						keyboardHints={false}
						placeholder="À classer"
					>
						{optionsType.find((o) => o.cle === piece.type)?.libelle ?? 'À classer'}
					</Select>
				</Surface>
			))}
		</div>
	);
}

/**
 * Où en est la lecture — règle d'écran n° 2 : « tout traitement se voit sans
 * qu'on le demande ».
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL. Le vert, l'ambre et le rouge ne disent qu'une
 * chose dans ce produit — au-dessus du seuil, tout près, en dessous — et l'état
 * d'une lecture n'est pas un verdict sur une créance.
 */
function EtatLecture({ statut }: { statut?: string }) {
	if (statut === 'EN_LECTURE') {
		return (
			<Chip size="md" color="neutral">
				Lecture en cours…
			</Chip>
		);
	}
	if (statut === 'A_CLASSER' || statut === 'ECHEC') {
		return (
			<Chip size="md" color="neutral">
				À classer
			</Chip>
		);
	}
	if (statut === 'CLASSEE_MAIN') {
		return (
			<Chip size="md" color="neutral">
				Classée par vous
			</Chip>
		);
	}
	return null;
}
