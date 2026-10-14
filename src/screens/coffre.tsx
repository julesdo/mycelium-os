import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	CarteBouton,
	EnTableauSurBureau,
	EnTeteDeGroupe,
	ListeDeCartes,
	PageEcran,
	PastillesDeFiltre,
	ProtectionsDuCoffre,
	TeteDuCoffre,
	VignetteDocument,
	cleDeRef,
	ligneDuDocument,
	type Lecture,
	type RefCoffre,
	type ResumeDocument,
	type EntreeDuJournal,
	JournalDuCoffre,
	MINUTES_SANS_NOUVELLE,
	delaiLisible,
	minutesDepuis,
	useMinute
} from '../ui';
import { TITRE_ECRAN } from './titres';

/**
 * `/app/coffre` — LE COFFRE-FORT DES DOCUMENTS (12/10/2026).
 *
 * Il remplace « Vos dépôts » : TOUS les documents de l'établissement — les
 * factures déposées et les pièces des dossiers —, du plus récent au plus ancien,
 * groupés par mois, avec ce que chacun a donné. UN bouton, « Ajouter des
 * documents », qui ouvre le parcours de dépôt ; un toucher sur une carte ouvre
 * le document en plein écran (la visionneuse vit dans la route).
 *
 * ⚠️ CE QUI LE PROTÈGE EST ÉCRIT SUR L'ÉCRAN, en quatre lignes vraies
 * (`ProtectionsDuCoffre`). Une sensation de sécurité qui ne repose sur rien
 * serait un mensonge ; celle-ci se vérifie dans le code.
 */

export interface CoffreAffiche {
	readonly documents: readonly ResumeDocument[];
	/** Les derniers gestes sur les documents, retraits compris. Absent pendant la lecture. */
	readonly journal?: readonly EntreeDuJournal[];
	readonly onAjouter: () => void;
	readonly onOuvrir: (ref: RefCoffre) => void;
}

type Filtre = 'TOUS' | 'IMPORT' | 'PIECE';

const FILTRES: readonly { readonly cle: Filtre; readonly libelle: string }[] = [
	{ cle: 'TOUS', libelle: 'Tous' },
	{ cle: 'IMPORT', libelle: 'Factures' },
	{ cle: 'PIECE', libelle: 'Justificatifs' }
];

function moisDe(le: number): string {
	const mois = new Date(le).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
	return mois.charAt(0).toUpperCase() + mois.slice(1);
}

function jourDe(le: number): string {
	return new Date(le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function EcranCoffre({ donnees }: { readonly donnees: Lecture<CoffreAffiche> }) {
	const entete = {
		genre: 'poussee',
		retour: { vers: '/app', libelle: TITRE_ECRAN.aujourdhui },
		titre: TITRE_ECRAN.coffre
	} as const;
	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	return (
		<PageEcran
			entete={entete}
			largeur={donnees.valeur.documents.length === 0 ? 'normale' : 'large'}
		>
			<Coffre {...donnees.valeur} />
		</PageEcran>
	);
}

function Coffre({ documents, journal, onAjouter, onOuvrir }: CoffreAffiche) {
	const [filtre, setFiltre] = useState<Filtre>('TOUS');
	/*
	  ⚠️ UNE LECTURE QUI NE REVIENT PAS SE DIT. Rien ne reprend un dépôt tombé en
	  cours de lecture : sans l'horloge, sa carte dirait « Lecture en cours… » pour
	  toujours. Au-delà d'un quart d'heure, elle dit depuis quand on est sans
	  nouvelle, et le document se retire.
	*/
	const minute = useMinute();
	const sansNouvelle = (document: ResumeDocument): number | null => {
		if (document.etat !== 'EN_COURS') return null;
		const age = minutesDepuis(document.deposeLe, minute);
		return age !== null && age >= MINUTES_SANS_NOUVELLE ? age : null;
	};
	const montres = documents.filter((d) => filtre === 'TOUS' || d.ref.genre === filtre);
	const scelles = documents.filter((d) => d.scelle).length;

	// Groupés par mois, dans l'ordre où ils arrivent (le plus récent d'abord).
	const groupes: { mois: string; documents: ResumeDocument[] }[] = [];
	for (const document of montres) {
		const mois = moisDe(document.deposeLe);
		const dernier = groupes.at(-1);
		if (dernier !== undefined && dernier.mois === mois) dernier.documents.push(document);
		else groupes.push({ mois, documents: [document] });
	}

	return (
		<div className="flex flex-col gap-cladd-xs">
			<TeteDuCoffre total={documents.length} scelles={scelles} />

			{/* LE SEUL BOUTON PLEIN DE L'ÉCRAN : le parcours de dépôt. */}
			{/* Au bureau, la colonne est large : le bouton garde sa taille, au centre. */}
			<BoutonPrincipal pleineLargeur className="lg:w-auto lg:self-center" onClick={onAjouter}>
				<PlusIcon />
				Ajouter des documents
			</BoutonPrincipal>

			{documents.length === 0 ? null : (
				<PastillesDeFiltre
					libelle="Quels documents"
					options={FILTRES}
					active={filtre}
					onChoisir={setFiltre}
				/>
			)}

			{/* Au bureau, chaque document se lit sur une ligne, en colonnes. */}
			<EnTableauSurBureau>
				{groupes.map((groupe) => (
					<section key={groupe.mois} className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle={groupe.mois} nombre={groupe.documents.length} />
						<ListeDeCartes>
							{groupe.documents.map((document) => (
								<CarteBouton
									key={cleDeRef(document.ref)}
									titre={document.nom}
									ligne={(() => {
										const age = sansNouvelle(document);
										return age === null
											? ligneDuDocument(document)
											: `Sans nouvelle depuis ${delaiLisible(age)}`;
									})()}
									date={jourDe(document.deposeLe)}
									icone={<VignetteDocument mime={document.mime} scelle={document.scelle} />}
									attention={document.etat === 'ECHEC' || sansNouvelle(document) !== null}
									onClick={() => onOuvrir(document.ref)}
								/>
							))}
						</ListeDeCartes>
					</section>
				))}
			</EnTableauSurBureau>

			{montres.length === 0 && documents.length > 0 ? (
				<p className="px-1 text-center text-cladd-2xs text-cladd-fg-soft">
					Aucun document de cette sorte dans le coffre.
				</p>
			) : null}

			{journal === undefined || journal.length === 0 ? null : <JournalDuCoffre journal={journal} />}

			<ProtectionsDuCoffre />
		</div>
	);
}
