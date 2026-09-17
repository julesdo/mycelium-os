import type { ReactNode } from 'react';
import { Chip, ListButton } from '@cladd-ui/react';
import { UploadIcon } from 'lucide-react';
import {
	Avatar,
	BoutonPrincipal,
	Lien,
	CarteListe,
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
	readonly encours: bigint;
	readonly facturesEchues: number;
	readonly santeFinanciere: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly secteurDetermine: boolean;
}

/** Ce que l'écran affiche une fois les débiteurs chargés : la liste, et celui dont la page est ouverte. */
export interface DebiteursAffiches {
	readonly debiteurs: readonly LigneDebiteur[];
	/** Le débiteur dont la page occupe le volet droit, lu sur la route enfant. */
	readonly choisi: string | null;
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

	const { debiteurs, choisi } = donnees.valeur;

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

	/**
	 * LA LISTE DES DÉBITEURS.
	 *
	 * ⚠️ UNE SEULE CARTE, DES LIGNES DEDANS — et pas une carte par débiteur. Sur
	 * trente débiteurs, trente objets qui flottent séparément font compter des
	 * cartes au lieu de lire des noms, et chaque bord arrondi coûte quatre pixels
	 * de vide en haut et en bas.
	 *
	 * ⚠️ ET CHAQUE RANGÉE EST UN LIEN, PAS UN `onClick`. Elle mène à une adresse :
	 * elle s'ouvre donc dans un nouvel onglet, se copie, et se lit par un lecteur
	 * d'écran comme ce qu'elle est. C'est aussi ce qui donne à la page enfant une
	 * arête entrante — `aucun-ecran-orphelin.test.ts` ne compte pas les retours.
	 *
	 * ⚠️ CHAQUE LIGNE PORTE UN AVATAR. Il donne à l'œil un point d'accroche fixe
	 * à gauche, et surtout il rend deux raisons sociales proches — « Ateliers
	 * Martin » et « Ateliers Martin Fils » — distinguables à la couleur avant
	 * d'être lues. Sur un produit où se tromper de débiteur envoie un décompte au
	 * mauvais tiers, ça compte.
	 */
	const cartes = (
		<CarteListe titre={`${debiteurs.length} débiteur${pluriel(debiteurs.length)}`}>
			{debiteurs.map((debiteur) => (
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
		<PageEcran entete={{ ...entete, sousTitre: 'Le plus gros encours d’abord' }}>
			{cartes}
		</PageEcran>
	);
}
