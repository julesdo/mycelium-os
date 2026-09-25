import { Button, Surface } from '@cladd-ui/react';
import { FileDownIcon, InfoIcon } from 'lucide-react';
import { dateLisible } from '../lib/verticales/recouvrement/calendrier';
import {
	etatDuReferentiel,
	mentionEtatReferentiel
} from '../lib/verticales/recouvrement/referentiel';
import {
	Decompte,
	PageEcran,
	RemiseAuConseil,
	SectionEcran,
	Tableau,
	TableauCellule,
	TableauCorps,
	TableauEntete,
	TableauLigne,
	TableauTitre,
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
				sousTitre:
					pret === null
						? undefined
						: `${pret.debiteur}, arrêté au ${dateLisible(pret.decompte.arreteAu)}. Cette pièce ne change plus.`
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <CorpsPiece identifiant={identifiant} donnees={pret} />}
		</PageEcran>
	);
}

function CorpsPiece({ identifiant, donnees }: { identifiant: string; donnees: PieceArretee }) {
	const etat = etatDuReferentiel();

	return (
		<>
			{/* LA MENTION, EN TÊTE. Elle se COMPTE à chaque rendu : une phrase qui
			    annoncerait « douze valeurs vérifiées » en dur deviendrait fausse le
			    jour où une treizième est relevée, sans qu'aucun test ne tombe. */}
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
					{mentionEtatReferentiel(etat)}
				</p>
			</Surface>

			<SectionEcran
				titre="Le décompte, période par période"
				legende={`Pièce n° ${identifiant.slice(-6)}, produite le ${dateCourte(new Date(donnees.produitLe).toISOString().slice(0, 10))}`}
			>
				<Decompte decompte={donnees.decompte} />
				{donnees.denominationFigee ? null : (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						Cette pièce a été produite avant que les identités ne soient figées : le nom affiché est
						celui de la fiche d’aujourd’hui, pas celui que le client portait à la date d’arrêté.
					</p>
				)}
			</SectionEcran>

			<SectionEcran
				titre="Les valeurs juridiques employées"
				legende={`${etat.verifies} relevée${pluriel(etat.verifies)} sur ${etat.total}, ${etat.validesParAvocat} contrôlée${pluriel(etat.validesParAvocat)} par un juriste`}
			>
				<Tableau legende="Valeurs juridiques, leur source et leur état">
					<TableauEntete>
						<TableauTitre>Valeur</TableauTitre>
						<TableauTitre>Source</TableauTitre>
						<TableauTitre>Relevée le</TableauTitre>
						<TableauTitre>Relevée</TableauTitre>
						<TableauTitre>Contrôlée par un juriste</TableauTitre>
					</TableauEntete>
					<TableauCorps>
						{etat.fiches.map((fiche) => (
							<TableauLigne key={fiche.cle}>
								<TableauCellule>{fiche.cle}</TableauCellule>
								<TableauCellule>{fiche.source}</TableauCellule>
								<TableauCellule>{dateCourte(fiche.verifieLe)}</TableauCellule>
								<TableauCellule>{fiche.verifie ? 'oui' : 'non'}</TableauCellule>
								<TableauCellule>{fiche.valideParAvocat ? 'oui' : 'non'}</TableauCellule>
							</TableauLigne>
						))}
					</TableauCorps>
				</Tableau>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					Une valeur relevée sur une source publique citable suffit à calculer et à expliquer un
					chiffre : un chiffre affiché se corrige. Le contrôle par un juriste de la valeur ET de son
					applicabilité au cas d’espèce est ce qui manque, et c’est le seul champ que ce logiciel ne
					peut pas remplir seul.
				</p>
			</SectionEcran>

			<SectionEcran
				titre="Ce que ce décompte ne couvre pas"
				legende={
					donnees.abandons.length === 0
						? 'Aucune somme écartée'
						: `${donnees.abandons.length} point${pluriel(donnees.abandons.length)}, recalculé${pluriel(donnees.abandons.length)} contre les factures d’aujourd’hui`
				}
			>
				{donnees.abandons.length === 0 ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Toutes les factures connues de {donnees.debiteur} sont comprises dans ce décompte :
						aucune somme n’en a été écartée. Ce contrôle se refait à chaque lecture, contre les
						factures du jour.
					</p>
				) : (
					donnees.abandons.map((abandon) => (
						<div key={abandon.reference} className="flex flex-col gap-1">
							<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
								<span className="text-cladd-sm font-semibold">{abandon.reference}</span>
								<span className="text-cladd-sm font-semibold tabular-nums">
									{abandon.montantEnJeu === null
										? 'montant non chiffrable'
										: eurosCentimes(abandon.montantEnJeu)}
								</span>
							</div>
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{abandon.explication}
							</p>
						</div>
					))
				)}
			</SectionEcran>

			<SectionEcran
				titre="Dossier à remettre à votre conseil"
				legende="Le décompte, ses sources, ses hypothèses, ses angles morts et les voies que ces conditions ouvrent"
			>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Ce dossier n’est ni un modèle de requête, ni un courrier au débiteur : c’est le document
					que l’avocat lit. Il énumère les voies sans en désigner aucune, et il porte en tête ce que
					valent les chiffres qu’il cite.
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
						Télécharger le décompte seul
					</Button>
				</div>
			</SectionEcran>

			<SectionEcran
				titre="Le suivi de ce dossier"
				legende="Quatre états, et chacun vient d’une déclaration de votre part"
			>
				<RemiseAuConseil suivi={donnees.suivi} />
			</SectionEcran>
		</>
	);
}
