import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import type {
	ClePrevol,
	ReponsePrevol,
	ReponsesPrevol
} from '../../lib/verticales/recouvrement/prevol';
import { EcranArret } from '../../screens/arret';

export const Route = createFileRoute('/app/arret/$id')({
	component: PageArret,
	errorComponent: ArretEnErreur
});

function ArretEnErreur() {
	const { id } = Route.useParams();
	return <EcranArret identifiant={id} donnees={{ etat: 'erreur' }} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/arret.tsx`.
 *
 * ⚠️ LA DÉCISION SUR LES ABANDONS PORTE SA SIGNATURE, ET C'EST TOUT L'INTÉRÊT.
 * Un simple booléen resterait vrai si une facture arrivait entre la décision et
 * le tap : le gérant aurait assumé DEUX abandons et figé un décompte qui en
 * laisse TROIS, sans que rien ne le dise. La signature est la liste des points
 * relevés ; dès qu'elle change, la décision cesse de valoir.
 *
 * ⚠️ ELLE SE DÉRIVE AU RENDU, jamais dans un effet. Un `setState` dans un effet
 * ferait un rendu de plus avec la mauvaise valeur, et c'est l'écran le moins
 * indiqué du produit pour ça.
 */
function PageArret() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;
	const navigate = useNavigate();

	const preparation = useQuery(api.recouvrement.arret.preparerArret, { creanceId });
	const inclure = useMutation(api.recouvrement.arret.inclureFactures);
	const arreter = useMutation(api.recouvrement.arret.arreter);

	const [reponses, setReponses] = useState<ReponsesPrevol>({});
	const [assumePour, setAssumePour] = useState<string | null>(null);
	const [inclusionEnCours, setInclusionEnCours] = useState(false);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	const signature =
		preparation === undefined || preparation === null
			? ''
			: preparation.abandons.map((abandon) => `${abandon.nature}:${abandon.reference}`).join('|');

	function messageDeRefus(e: unknown): string {
		// ⚠️ `ConvexError` PORTE SON MESSAGE DANS `data`, pas dans `message`. Le
		// perdre reviendrait à afficher « échec » à la place d'un refus en quatre
		// parties qui chiffre ce qui serait abandonné.
		const convexe = e as { data?: unknown };
		if (typeof convexe.data === 'string') return convexe.data;
		return e instanceof Error ? e.message : 'Le décompte n’a pas pu être arrêté.';
	}

	async function inclureLesFactures() {
		if (preparation === undefined || preparation === null) return;
		const factureIds = preparation.abandons
			.filter((abandon) => abandon.rattachable && abandon.factureId !== null)
			.map((abandon) => abandon.factureId!);
		if (factureIds.length === 0) return;

		setInclusionEnCours(true);
		setErreur(null);
		try {
			await inclure({ creanceId, factureIds });
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setInclusionEnCours(false);
		}
	}

	async function arreterLeDecompte() {
		if (preparation === undefined || preparation === null) return;
		setEnCours(true);
		setErreur(null);
		try {
			const decompteId = await arreter({
				creanceId,
				convention: preparation.convention,
				prevol: {
					AVOIR_NON_RAPPROCHE: reponses.AVOIR_NON_RAPPROCHE ?? 'DECLARE',
					REGLEMENT_NON_IMPORTE: reponses.REGLEMENT_NON_IMPORTE ?? 'DECLARE',
					CONTESTATION_HORS_LOGICIEL: reponses.CONTESTATION_HORS_LOGICIEL ?? 'DECLARE'
				},
				abandonsAssumes: signature !== '' && assumePour === signature
			});
			// LA PIÈCE EST LA SUITE NATURELLE DU GESTE. On vient de la produire ; la
			// laisser derrière un retour obligerait à la chercher.
			await navigate({ to: '/app/decompte/$id', params: { id: decompteId } });
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	return (
		<EcranArret
			identifiant={id}
			donnees={
				preparation === undefined
					? { etat: 'attente' }
					: preparation === null
						? { etat: 'erreur' }
						: {
								etat: 'pret',
								valeur: {
									debiteur: preparation.debiteur,
									arreteAu: preparation.arreteAu,
									projection:
										preparation.projection === null
											? null
											: {
													arreteAu: preparation.arreteAu,
													convention: preparation.convention,
													principalRestantDu: preparation.projection.principalRestantDu,
													interets: preparation.projection.interets,
													indemniteForfaitaire: preparation.projection.indemniteForfaitaire,
													total: preparation.projection.total,
													lignes: preparation.projection.lignes
												},
									refusDeCalcul: preparation.refusDeCalcul,
									abandons: preparation.abandons.map((abandon) => ({
										nature: abandon.nature,
										reference: abandon.reference,
										montantEnJeu: abandon.montantEnJeu,
										explication: abandon.explication,
										rattachable: abandon.rattachable
									})),
									montantAbandonne: preparation.montantAbandonne,
									nombreNonChiffrables: preparation.nombreNonChiffrables,
									controleDesParametres: preparation.controleDesParametres,
									prescription: preparation.prescription,
									dernierDecompteId: preparation.dernierDecompte?._id ?? null,
									reponses,
									onRepondre: (cle: ClePrevol, reponse: ReponsePrevol) =>
										setReponses((avant) => ({ ...avant, [cle]: reponse })),
									onInclure: () => void inclureLesFactures(),
									inclusionEnCours,
									abandonsAssumes: signature !== '' && assumePour === signature,
									onAssumerAbandons: (valeur: boolean) =>
										setAssumePour(valeur ? signature : null),
									onArreter: () => void arreterLeDecompte(),
									enCours,
									erreur
								}
							}
			}
		/>
	);
}
