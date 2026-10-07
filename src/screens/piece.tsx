import { useState } from 'react';
import { Button } from '@cladd-ui/react';
import { FileDownIcon, InfoIcon } from 'lucide-react';
import { dateLisible } from '../lib/verticales/recouvrement/calendrier';
import {
	etatDuReferentiel,
	mentionEtatReferentiel
} from '../lib/verticales/recouvrement/referentiel';
import {
	ChiffreHero,
	Decompte,
	EnTeteDeGroupe,
	LigneDeReleve,
	ListeDeRangees,
	ListeDeReleve,
	PageEcran,
	RangeeDepliable,
	RemiseAuConseil,
	SectionsDepliables,
	dateCourte,
	eurosCentimes,
	pluriel,
	type DecompteAffiche,
	type Lecture,
	type SuiviConseilAffiche
} from '../ui';

/**
 * LA PIÈCE ARRÊTÉE — UN DOCUMENT, PAS UN ÉTAT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI ELLE A UNE ADRESSE À ELLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Figée définitivement, datée, imprimée, lue par un tiers qui refera le calcul
 * à la main. La question qu'on lui pose n'est pas « où en est-on » mais
 * « qu'a-t-on réclamé le 16 septembre », et cette question n'a de réponse stable
 * que si la pièce ne change pas d'adresse ni de contenu.
 *
 * Une ligne par segment : « du 12/03 au 30/06, taux 12,25 %, 110 jours, base
 * 365 » à gauche, « 412,08 € » à droite. Un total qu'on ne peut pas décomposer
 * est un chiffre qu'on demande de croire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA MENTION EN TÊTE, ET ELLE COMPTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque valeur juridique porte son article, sa date de relevé et ses deux
 * booléens. La mention qui les compte est en TÊTE : un lecteur qui apprendrait
 * à la dernière ligne qu'aucun juriste n'a contrôlé ces valeurs aurait déjà lu
 * tout le reste comme si l'un l'avait fait.
 *
 * Le dossier remis au conseil vit sous `exiger()`, jamais sous
 * `exigerPourActe()` : ce produit n'émet aucun acte, et aucun de ces chiffres
 * ne part à un greffe.
 */

export interface PieceArretee {
	readonly debiteur: string;
	readonly decompte: DecompteAffiche;
	readonly produitLe: number;
	readonly denominationFigee: boolean;
	readonly abandons: readonly {
		readonly reference: string;
		readonly montantEnJeu: bigint | null;
		readonly explication: string;
	}[];
	readonly onTelechargerLaPiece: () => void;
	readonly onTelechargerLeDossier: () => void;
	readonly suivi: SuiviConseilAffiche;
}

export function EcranPiece({
	identifiant,
	creanceId,
	donnees
}: {
	identifiant: string;
	/** La créance qui porte la pièce, pour le retour. Vide tant qu'elle n'est pas lue. */
	creanceId: string;
	donnees: Lecture<PieceArretee>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					// La créance est une PAGE, en un seul défilement : le décompte y est
					// une section, et n'a plus d'adresse à lui.
					vers: '/app/dossier/$id',
					parametres: { id: creanceId },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Décompte arrêté',
				// Le client est déjà le nom du retour : le sous-titre ne dit que la date,
				// et tient sur une ligne au lieu de se couper (« …, arrêté au 16 août 2026… »).
				sousTitre: pret === null ? undefined : `Arrêté au ${dateLisible(pret.decompte.arreteAu)}`
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <CorpsPiece identifiant={identifiant} donnees={pret} />}
		</PageEcran>
	);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ REFAITE LE 07/10/2026 : 10 100 PX ET 1 366 MOTS À 375 PX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un paragraphe de dix lignes en tête, une carte de section qui contenait un
 * creux de gros chiffres, une carte de quatre postes par facture, puis le
 * tableau des quarante-cinq valeurs juridiques avec leurs articles — c'est lui
 * qui faisait les neuf dixièmes de la hauteur. Sur Mercury et Apple Wallet :
 *
 *   1. LA MENTION RESTE EN TÊTE, EN UNE LIGNE QUI COMPTE. C'est la règle de cet
 *      écran (voir plus haut) ; elle ne demande pas un paragraphe, elle demande
 *      que le compte soit lu AVANT les chiffres. La phrase entière s'ouvre avec
 *      le tableau, dans la rangée « Valeurs juridiques ».
 *   2. LE TOTAL EN MONTANT HÉROS, puis sa composition et le détail par facture
 *      en relevé (`Decompte`), les périodes toujours dépliables sur place.
 *   3. LES QUARANTE-CINQ VALEURS DANS UNE RANGÉE, chacune en ligne de relevé :
 *      sa source entière, sa date, son état. Elles ne sont ni retirées ni
 *      résumées — elles ne s'imposent plus à qui vient lire un total.
 */
function CorpsPiece({ identifiant, donnees }: { identifiant: string; donnees: PieceArretee }) {
	const etat = etatDuReferentiel();
	const [ouvertes, setOuvertes] = useState<readonly string[]>([]);
	const controlees =
		etat.validesParAvocat === 0
			? 'aucune contrôlée'
			: `${etat.validesParAvocat} contrôlée${pluriel(etat.validesParAvocat)}`;

	return (
		<SectionsDepliables ouvertes={ouvertes} onOuvertesChange={setOuvertes}>
			{/* LA MENTION, EN TÊTE. Elle se COMPTE à chaque rendu : une phrase qui
			    annoncerait « douze valeurs vérifiées » en dur deviendrait fausse le
			    jour où une treizième est relevée, sans qu'aucun test ne tombe. */}
			<p className="flex items-start gap-1.5 px-1 text-cladd-2xs leading-snug text-cladd-fg-soft">
				<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
				<span>
					{etat.verifies} valeur{pluriel(etat.verifies)} juridique{pluriel(etat.verifies)} relevée
					{pluriel(etat.verifies)} sur {etat.total}, {controlees} par un juriste.
				</span>
			</p>

			<ChiffreHero
				centimes={donnees.decompte.total}
				surTitre="Total réclamé"
				legende={
					<span className="flex flex-col items-center gap-0.5">
						<span>Cette pièce ne change plus</span>
						<span className="text-cladd-2xs text-cladd-fg-softer">
							Pièce n° {identifiant.slice(-6)}, produite le{' '}
							{dateCourte(new Date(donnees.produitLe).toISOString().slice(0, 10))}
						</span>
					</span>
				}
			/>

			<Decompte decompte={donnees.decompte} totalEnTete />
			{donnees.denominationFigee ? null : (
				<p className="px-1 text-cladd-2xs leading-snug text-cladd-fg-softer">
					Cette pièce a été produite avant que les identités ne soient figées : le nom affiché est
					celui de la fiche d’aujourd’hui, pas celui que le client portait à la date d’arrêté.
				</p>
			)}

			<section className="flex flex-col gap-cladd-3xs">
				<EnTeteDeGroupe
					libelle="Hors de ce décompte"
					{...(donnees.abandons.length === 0 ? {} : { nombre: donnees.abandons.length })}
				/>
				{donnees.abandons.length === 0 ? (
					<p className="px-1 text-cladd-2xs leading-snug text-cladd-fg-soft">
						Toutes les factures connues de {donnees.debiteur} sont comprises dans ce décompte :
						aucune somme n’en a été écartée. Ce contrôle se refait à chaque lecture, contre les
						factures du jour.
					</p>
				) : (
					<ListeDeReleve>
						{donnees.abandons.map((abandon) => (
							<LigneDeReleve
								key={abandon.reference}
								titre={abandon.reference}
								montant={
									abandon.montantEnJeu === null
										? 'non chiffrable'
										: eurosCentimes(abandon.montantEnJeu)
								}
								ligne={abandon.explication}
								// L'explication dit pourquoi la somme est perdue : entière.
								retour
							/>
						))}
					</ListeDeReleve>
				)}
			</section>

			<ListeDeRangees>
				<RangeeDepliable
					cle="valeurs-juridiques"
					famille="MACHINE"
					titre="Valeurs juridiques"
					valeur={`${etat.verifies} sur ${etat.total} relevées`}
					glose={mentionEtatReferentiel(etat)}
				>
					<ListeDeReleve>
						{etat.fiches.map((fiche) => (
							<LigneDeReleve
								key={fiche.cle}
								titre={fiche.cle}
								montant={
									fiche.valideParAvocat ? 'contrôlée' : fiche.verifie ? 'relevée' : 'non relevée'
								}
								ligne={fiche.source}
								date={dateCourte(fiche.verifieLe)}
								retour
							/>
						))}
					</ListeDeReleve>
					<p className="text-cladd-2xs leading-snug text-cladd-fg-softer">
						Une valeur relevée sur une source publique citable suffit à calculer et à expliquer un
						chiffre : un chiffre affiché se corrige. Le contrôle par un juriste de la valeur ET de
						son applicabilité au cas d’espèce est ce qui manque, et c’est le seul champ que ce
						logiciel ne peut pas remplir seul.
					</p>
				</RangeeDepliable>
			</ListeDeRangees>

			<section className="flex flex-col gap-cladd-3xs">
				<EnTeteDeGroupe libelle="Pour votre conseil" />
				<p className="px-1 text-cladd-2xs leading-snug text-cladd-fg-soft">
					Le décompte, ses sources, ses hypothèses, ses angles morts et les voies que ces conditions
					ouvrent. Ce dossier n’est ni un modèle de requête, ni un courrier au débiteur : c’est le
					document que l’avocat lit. Il énumère les voies sans en désigner aucune.
				</p>
				<div className="flex flex-wrap gap-cladd-3xs">
					<Button
						size="lg"
						variant="transparent"
						outline={false}
						hoverable={false}
						rounded
						className="verre verre-bouton font-medium"
						onClick={donnees.onTelechargerLeDossier}
					>
						<FileDownIcon />
						Télécharger le dossier
					</Button>
					<Button
						size="lg"
						variant="transparent"
						outline={false}
						hoverable={false}
						rounded
						className="verre verre-bouton font-medium"
						onClick={donnees.onTelechargerLaPiece}
					>
						<FileDownIcon />
						Le décompte seul
					</Button>
				</div>
			</section>

			<section className="flex flex-col gap-cladd-3xs">
				<EnTeteDeGroupe libelle="Le suivi de ce dossier" />
				<RemiseAuConseil suivi={donnees.suivi} />
			</section>
		</SectionsDepliables>
	);
}
