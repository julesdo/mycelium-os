import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { depuisCentimes } from '../../lib/socle/montants';
import type { DecompteFige } from '../../lib/verticales/recouvrement/piece';
import { EcranPiece } from '../../screens/piece';

export const Route = createFileRoute('/app/decompte/$id')({
	component: PagePiece,
	errorComponent: PieceEnErreur
});

function PieceEnErreur() {
	const { id } = Route.useParams();
	return <EcranPiece identifiant={id} creanceId="" donnees={{ etat: 'erreur' }} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/piece.tsx`.
 *
 * ⚠️ QUATRE LECTURES, ET L'ÉCRAN ATTEND LES QUATRE. La pièce, son suivi, le
 * carnet du gérant et la créance qui la porte. Rendre le dossier avec une
 * créance encore en vol produirait un document sans ses voies ni ses
 * hypothèses, c'est-à-dire un dossier amputé qui n'aurait l'air de rien.
 */
function PagePiece() {
	const { id } = Route.useParams();
	const decompteId = id as Id<'decomptes'>;

	const piece = useQuery(api.recouvrement.decompte.lireDecompte, { decompteId });
	const suivi = useQuery(api.recouvrement.conseil.suivreRemise, { decompteId });
	const carnet = useQuery(api.recouvrement.intervenants.monCarnet, {});
	const creance = useQuery(
		api.recouvrement.lecture.creanceComplete,
		piece === undefined || piece === null ? 'skip' : { creanceId: piece.creanceId }
	);

	const preparer = useMutation(api.recouvrement.conseil.preparerDossier);
	const remettre = useMutation(api.recouvrement.conseil.declarerRemise);
	const consignerRetour = useMutation(api.recouvrement.conseil.declarerRetour);
	const clore = useMutation(api.recouvrement.conseil.cloreRemise);

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	function messageDeRefus(e: unknown): string {
		// ⚠️ `ConvexError` PORTE SON MESSAGE DANS `data`, pas dans `message`. Chaque
		// refus de ce module est écrit en quatre parties ; le perdre reviendrait à
		// afficher « échec » à la place.
		const convexe = e as { data?: unknown };
		if (typeof convexe.data === 'string') return convexe.data;
		return e instanceof Error ? e.message : 'Le suivi n’a pas pu être mis à jour.';
	}

	async function ecrire(geste: () => Promise<unknown>) {
		setEnCours(true);
		setErreur(null);
		try {
			await geste();
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	/** Le décompte figé, dans la forme que la pièce et le dossier attendent. */
	function decompteFige(): DecompteFige | null {
		if (piece === undefined || piece === null) return null;
		return {
			arreteAu: piece.arreteAu,
			convention: piece.convention,
			principalRestantDu: depuisCentimes(piece.principalRestantDu),
			interets: depuisCentimes(piece.interets),
			indemniteForfaitaire: depuisCentimes(piece.indemniteForfaitaire),
			total: depuisCentimes(piece.total),
			creancier: piece.creancier,
			debiteur: piece.debiteur,
			lignes: piece.lignes.map((ligne) => ({
				reference: ligne.reference,
				principalRestantDu: depuisCentimes(ligne.principalRestantDu),
				interets: depuisCentimes(ligne.interets),
				indemniteForfaitaire: depuisCentimes(ligne.indemniteForfaitaire),
				total: depuisCentimes(ligne.total),
				segments: ligne.segments.map((segment) => ({
					debut: segment.debut,
					fin: segment.fin,
					jours: segment.jours,
					principal: depuisCentimes(segment.principal),
					taux: segment.taux,
					baseAnnuelle: segment.baseAnnuelle,
					interets: depuisCentimes(segment.interets)
				})),
				imputations: (ligne.imputations ?? []).map((imputation) => ({
					date: imputation.date,
					nature: imputation.nature,
					montant: depuisCentimes(imputation.montant),
					surInterets: depuisCentimes(imputation.surInterets),
					surPrincipal: depuisCentimes(imputation.surPrincipal)
				}))
			})),
			abandons: piece.abandons.map((abandon) => ({
				reference: abandon.reference,
				montantEnJeu: abandon.montantEnJeu === null ? null : depuisCentimes(abandon.montantEnJeu),
				explication: abandon.explication
			}))
		};
	}

	/**
	 * ⚠️ LE MODULE PDF EST IMPORTÉ À LA DEMANDE. `jspdf` et son greffon de
	 * tableaux pèsent plusieurs centaines de kilo-octets ; les charger avec
	 * l'écran ferait payer ce poids à chaque ouverture.
	 */
	async function telechargerLaPiece() {
		const fige = decompteFige();
		if (fige === null) return;
		const [{ composerPiece }, { rendrePieceEnPdf, nomFichierPiece }] = await Promise.all([
			import('../../lib/verticales/recouvrement/piece'),
			import('../../ui/piece-decompte')
		]);
		const composee = composerPiece(fige);
		rendrePieceEnPdf(composee).save(nomFichierPiece(composee));
	}

	async function telechargerLeDossier() {
		const fige = decompteFige();
		if (fige === null || suivi === undefined || suivi === null || creance === undefined) return;

		const [{ composerDossier }, { rendreDossierEnPdf, nomFichierDossier }] = await Promise.all([
			import('../../lib/verticales/recouvrement/dossier'),
			import('../../ui/piece-decompte')
		]);

		// ⚠️ LES HYPOTHÈSES ET LES ANGLES MORTS VIENNENT DES MODULES QUI LES
		// PRODUISENT, jamais d'une phrase écrite ici. Un dossier qui les
		// paraphraserait cesserait d'être à jour au premier changement de règle,
		// et personne ne s'en apercevrait.
		const hypotheses = [
			...(suivi.prescription.hypothese
				? [
						`Le secteur de ce client n’est pas déterminé : la prescription est calculée sur le délai le plus court connu (${suivi.prescription.dureeAnnees} an).`
					]
				: []),
			creance.regimePrescriptionNote
		].filter((ligne) => ligne.trim().length > 0);

		const dossier = composerDossier({
			decompte: fige,
			voies: creance.procedures.map((voie) => ({
				nom: voie.nom,
				disponible: voie.disponible,
				blocages: voie.blocages
			})),
			hypotheses,
			anglesMorts: [suivi.angleMort]
		});

		rendreDossierEnPdf(dossier).save(nomFichierDossier(dossier));
	}

	const enAttente =
		piece === undefined || suivi === undefined || carnet === undefined || creance === undefined;

	return (
		<EcranPiece
			identifiant={id}
			creanceId={piece === undefined || piece === null ? '' : piece.creanceId}
			donnees={
				piece === null || suivi === null
					? { etat: 'erreur' }
					: enAttente
						? { etat: 'attente' }
						: {
								etat: 'pret',
								valeur: {
									debiteur: piece.debiteurNom,
									produitLe: piece.produitLe,
									denominationFigee: piece.denominationFigee,
									decompte: {
										arreteAu: piece.arreteAu,
										convention: piece.convention,
										principalRestantDu: piece.principalRestantDu,
										interets: piece.interets,
										indemniteForfaitaire: piece.indemniteForfaitaire,
										total: piece.total,
										lignes: piece.lignes
									},
									abandons: piece.abandons,
									onTelechargerLaPiece: () => void telechargerLaPiece(),
									onTelechargerLeDossier: () => void telechargerLeDossier(),
									suivi: {
										fige: { arreteAu: suivi.fige.arreteAu, total: suivi.fige.total },
										duJour: suivi.duJour,
										refusDuJour: suivi.refusDuJour?.detail ?? null,
										ecart: suivi.ecart,
										prescription: suivi.prescription,
										angleMort: suivi.angleMort,
										joursDepuisLaRemise: suivi.joursDepuisLaRemise,
										faitsDeProcedureDepuisLaRemise: suivi.faitsDeProcedureDepuisLaRemise,
										remise:
											suivi.remise === null
												? null
												: {
														id: suivi.remise._id,
														etat: suivi.remise.etat,
														intervenant: suivi.remise.intervenant,
														remisLe: suivi.remise.remisLe,
														revenuLe: suivi.remise.revenuLe,
														closLe: suivi.remise.closLe,
														motifCloture: suivi.remise.motifCloture,
														attendu: suivi.remise.attendu
													},
										carnet: carnet.map((fiche) => ({
											id: fiche._id,
											nom: fiche.nom,
											precision: fiche.ressort ?? ''
										})),
										onPreparer: () => void ecrire(() => preparer({ decompteId })),
										onRemettre: (remisLe, intervenantId, attendu) =>
											void ecrire(() =>
												remettre({
													remiseId: suivi.remise!._id,
													remisLe,
													intervenantId:
														intervenantId === null
															? undefined
															: (intervenantId as Id<'intervenants'>),
													attendu: attendu.trim() === '' ? undefined : attendu.trim()
												})
											),
										onRetour: (revenuLe) =>
											void ecrire(() =>
												consignerRetour({ remiseId: suivi.remise!._id, revenuLe })
											),
										onClore: (closLe, motif) =>
											void ecrire(() =>
												clore({ remiseId: suivi.remise!._id, closLe, motifCloture: motif })
											),
										enCours,
										erreur
									}
								}
							}
			}
		/>
	);
}
