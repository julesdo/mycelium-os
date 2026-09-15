import type { ComponentProps } from 'react';
import { Chip, ListButton } from '@cladd-ui/react';
import { UploadIcon } from 'lucide-react';
import {
	Avatar,
	BoutonPrincipal,
	Lien,
	CarteListe,
	PageEcran,
	eurosCentimes,
	pluriel,
	type Lecture
} from '../ui';
import { DetailDebiteur } from './debiteur-detail';
import { TITRE_ECRAN } from './titres';

/** Une rangée de la liste : ce que la rangée lit d'un débiteur de `listerDebiteurs`. */
export interface LigneDebiteur {
	readonly _id: string;
	readonly denomination: string;
	readonly encours: bigint;
	readonly facturesEchues: number;
	readonly santeFinanciere: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly secteurDetermine: boolean;
}

/** Ce que l'écran affiche une fois les débiteurs chargés : la liste, le débiteur ouvert, et son volet de preuve. */
export interface DebiteursAffiches {
	readonly debiteurs: readonly LigneDebiteur[];
	/** Le débiteur ouvert, lu dans l'adresse (`?d=`). */
	readonly choisi: string | null;
	/** Ouvrir une fiche, c'est naviguer, et vider la sélection de factures. */
	readonly onOuvrir: (debiteurId: string) => void;
	readonly onFermer: () => void;
	/** Le volet de preuve, tel que `DetailDebiteur` le reçoit. */
	readonly detail: ComponentProps<typeof DetailDebiteur>;
}

/**
 * Les débiteurs, et leurs factures.
 *
 * DEUX VOLETS AU-DELÀ DE 1024 px (règle d'écran n° 3), et ils portent
 * exactement ce que la règle prévoit : la LISTE à gauche, la PREUVE à droite.
 * Ici, la preuve d'un débiteur est le détail de ce qu'il doit — facture par
 * facture, avec sa date de prescription.
 *
 * LA PRESCRIPTION EST DANS LE TABLEAU, PAS DANS UNE ALERTE À PART. C'est une
 * propriété de chaque facture, au même titre que son montant : la reléguer
 * ailleurs obligerait à croiser deux écrans pour savoir laquelle va s'éteindre.
 */
export function EcranDebiteurs({ donnees }: { donnees: Lecture<DebiteursAffiches> }) {
	const entete = { genre: 'onglet', titre: TITRE_ECRAN.debiteurs } as const;

	if (donnees.etat !== 'pret') {
		// `disposition="volets"` : l'attente se dessine déjà en deux volets. Voir `PageEcran`.
		return <PageEcran entete={entete} etat={donnees.etat} disposition="volets" />;
	}

	const { debiteurs, choisi, onOuvrir, onFermer, detail } = donnees.valeur;

	if (debiteurs.length === 0) {
		return (
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
							'Sélectionnez les factures d’un même débiteur pour en faire une créance.'
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

	/**
	 * LA LISTE DES DÉBITEURS.
	 *
	 * ⚠️ UNE SEULE CARTE, DES LIGNES DEDANS — et pas une carte par débiteur.
	 *
	 * La version précédente posait un `Surface` autonome par client. Sur trente
	 * débiteurs, ça fait trente objets qui flottent séparément : l'œil compte des
	 * cartes au lieu de lire des noms, et chaque bord arrondi coûte quatre pixels
	 * de vide en haut et en bas, soit plus de deux cents pixels de défilement
	 * gagnés pour rien.
	 *
	 * Toutes les références font l'inverse : un conteneur, des rangées. La liste
	 * se lit alors comme une liste, et les cartes retrouvent leur sens — elles ne
	 * servent qu'à séparer des BLOCS de nature différente.
	 *
	 * ⚠️ ET CHAQUE LIGNE PORTE UN AVATAR. Deux raisons, dont une seule est
	 * esthétique : il donne à l'œil un point d'accroche fixe à gauche pour
	 * balayer verticalement, et surtout il rend deux raisons sociales proches —
	 * « Ateliers Martin » et « Ateliers Martin Fils » — distinguables à la
	 * couleur avant d'être lues. Sur un produit où se tromper de débiteur envoie
	 * un décompte au mauvais tiers, ça compte.
	 */
	const liste = (
		<div className="flex flex-col gap-cladd-3xs p-cladd-3xs">
			<CarteListe titre={`${debiteurs.length} débiteur${pluriel(debiteurs.length)}`}>
				{debiteurs.map((debiteur) => (
					<ListButton
						key={debiteur._id}
						selected={choisi === debiteur._id}
						onClick={() => onOuvrir(debiteur._id)}
						icon={<Avatar nom={debiteur.denomination} />}
						footer={
							// Les puces en pied de ligne plutôt qu'en rangée séparée : elles
							// qualifient le débiteur, elles ne sont pas une information de
							// même niveau que son nom.
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
								{/* Un secteur indéterminé fait retenir le délai de prescription
								    le plus court. Le dire ici évite que le gérant découvre
								    l'hypothèse au moment où une créance est annoncée prescrite. */}
								{!debiteur.secteurDetermine ? (
									<Chip size="sm" color="neutral">
										Secteur à préciser
									</Chip>
								) : null}
							</span>
						}
						after={
							// L'encours reste la colonne qui commande la lecture — un gérant
							// arbitre entre douze mille euros et trois cents, pas entre deux
							// raisons sociales. Mais il descend du corps d'affiche au corps
							// courant : dans une rangée, un chiffre de trente-deux pixels
							// écrase le nom qu'il qualifie.
							<span className="shrink-0 text-cladd-sm font-bold tabular-nums">
								{eurosCentimes(debiteur.encours)}
							</span>
						}
					>
						{debiteur.denomination}
					</ListButton>
				))}
			</CarteListe>
		</div>
	);

	/**
	 * LE VOLET DE PREUVE.
	 *
	 * Tout le dessin vit dans `screens/debiteur-detail.tsx`, qui ne sait pas
	 * interroger Convex — c’est ce qui permet de l’OUVRIR aux quatre largeurs
	 * depuis la salle d’exposition, sans backend ni authentification. Ses
	 * composants y étaient tous vérifiés un par un ; leur assemblage, jamais.
	 */
	return (
		<PageEcran
			entete={{ ...entete, sousTitre: 'Le plus gros encours d’abord' }}
			volets={{
				liste,
				// Une clé par débiteur : sans elle, le taux tapé dans `IdentiteDebiteur`, le montant et la date tapés dans `Lettrage` resteraient sous le débiteur suivant, car la fiche ne repart de zéro qu’en se démontant le temps que ses factures et ses pièces chargent.
				preuve: <DetailDebiteur key={detail.debiteurId} {...detail} />,
				preuveOuverte: choisi !== null,
				onFermerPreuve: onFermer
			}}
		/>
	);
}
