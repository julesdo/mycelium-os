import { Button, Chip, Select, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, FileTextIcon, Trash2Icon } from 'lucide-react';
import { ZoneDepot } from './zone-depot';
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
	readonly constat?: string;
}

export interface OptionTypePiece {
	readonly cle: string;
	readonly libelle: string;
	/** Ce que cette pièce établit. C'est ça qui décide, pas son nom. */
	readonly apport: string;
}

export function Pieces({
	pieces,
	optionsType,
	onDeposer,
	onClasser,
	onRetirer,
	enCours = false
}: {
	pieces: readonly PieceAffichee[];
	optionsType: readonly OptionTypePiece[];
	onDeposer: (fichiers: File[]) => void;
	onClasser: (pieceId: string, type: string) => void;
	onRetirer: (pieceId: string) => void;
	enCours?: boolean;
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<ZoneDepot
				accept="application/pdf,image/*,text/plain,message/rfc822"
				onFichiers={onDeposer}
				desactive={enCours}
			>
				<p className="text-cladd-sm font-medium">Bon de livraison, commande, CGV, contrat…</p>
				<p className="text-cladd-2xs text-cladd-fg-softer">
					Le document est lu et classé tout seul. Vous corrigez si besoin.
				</p>
			</ZoneDepot>

			{pieces.map((piece) => (
				<Surface
					key={piece._id}
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
						<span className="flex min-w-0 items-center gap-1.5">
							<FileTextIcon className="size-3.5 shrink-0 text-cladd-fg-softer" aria-hidden />
							<span className="truncate text-cladd-xs font-medium">{piece.filename}</span>
						</span>
						<EtatLecture statut={piece.statut} />
					</div>

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
							{piece.reference ? ` — n° ${piece.reference}` : ''}
						</p>
					) : null}

					<div className="flex flex-wrap items-center gap-cladd-3xs">
						{/* Le sélecteur est TOUJOURS là, pas seulement quand la lecture a
						    échoué : le modèle peut se tromper avec assurance, et une
						    correction qu'il faut chercher ne se fait pas. */}
						<Select
							className="min-w-0 flex-1"
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

						<Button
							variant="transparent"
							outline={false}
							hoverable={false}
							rounded
							size="lg"
							disabled={enCours}
							onClick={() => onRetirer(piece._id)}
							aria-label={`Retirer ${piece.filename}`}
							// ⚠️ `min-w-12` — 48 px. Sans lui le bouton ne fait que 36 px de
							// large : il se dimensionne sur son icône, et le plancher tactile
							// du projet tombe. Mesuré à l'écran, invisible partout ailleurs.
							className="verre verre-bouton min-w-12 shrink-0 justify-center transition-transform duration-150 active:scale-[0.97]"
						>
							<Trash2Icon className="size-4" aria-hidden />
						</Button>
					</div>
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
