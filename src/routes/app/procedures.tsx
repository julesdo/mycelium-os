import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranProcedures, type DossierAffiche } from '../../screens/procedures';
import { parcoursDeLaVoie } from '../../lib/verticales/recouvrement/apres-procedure';
import { aujourdHuiISO } from '../../ui';

/**
 * ⚠️ LA SÉLECTION VIT DANS L'ADRESSE, comme sur `/app/debiteurs`. La liste et le
 * dossier sont le MÊME écran au-dessus de 1024 px : un segment de chemin
 * suggérerait deux pages là où il y en a une, et le retour perdrait la
 * sélection à chaque aller-retour.
 */
export const Route = createFileRoute('/app/procedures')({
	component: Procedures,
	errorComponent: ProceduresEnErreur,
	validateSearch: (recherche: Record<string, unknown>): { p?: string } => {
		const p = recherche.p;
		return typeof p === 'string' && p.length > 0 ? { p } : {};
	}
});

function ProceduresEnErreur() {
	return <EcranProcedures donnees={{ etat: 'erreur' }} />;
}

/**
 * LE MONTANT EN JEU VIENT D'UNE SECONDE LECTURE, ET C'EST VOULU.
 *
 * ⚠️ `dossiersEngages` NE PORTE PAS DE MONTANT. Elle rejoue la machine à états
 * et rend ce qui court ; elle ne sait rien du principal restant dû. Or une
 * rangée qui dit « une ordonnance devient caduque dans douze jours » sans dire
 * COMBIEN est en jeu ne permet pas d'arbitrer entre deux dossiers — et c'est
 * exactement l'arbitrage qu'on vient faire ici.
 *
 * `listerCreances` rend déjà ce montant, facture par facture comptée, et deux
 * autres écrans du produit l'appellent (`/app` et `/app/debiteurs/$id`). Le
 * rapprochement se fait donc ICI, à l'affichage, plutôt qu'en ajoutant un champ
 * à une requête qui n'a pas à connaître les montants.
 *
 * ⚠️ ET ON ATTEND LES DEUX. Composer dès que les dossiers arrivent afficherait
 * « montant non repris » pendant que la seconde lecture est en route, c'est-à-dire
 * un doute là où il n'y en a pas.
 */
function Procedures() {
	const { p } = Route.useSearch();
	const navigate = useNavigate();
	const aujourdHui = aujourdHuiISO();
	const dossiers = useQuery(api.recouvrement.apresProcedure.dossiersEngages, {});
	const creances = useQuery(api.recouvrement.lecture.listerCreances, {});

	if (dossiers === undefined || creances === undefined) {
		return <EcranProcedures donnees={{ etat: 'attente' }} />;
	}

	const parCreance = new Map(creances.map((creance) => [creance._id as string, creance]));

	return (
		<EcranProcedures
			donnees={{
				etat: 'pret',
				valeur: {
					aujourdHui,
					dossiers: dossiers.map((dossier): DossierAffiche => {
						const creance = parCreance.get(dossier.creanceId);
						return {
							creanceId: dossier.creanceId,
							debiteur: dossier.debiteur,
							libelle: dossier.libelle,
							engageeLe: dossier.engageeLe,
							terminal: dossier.terminal,
							intervenant: dossier.intervenant,
							prochaineEcheance: dossier.prochaineEcheance,
							anglesMorts: dossier.anglesMorts,
							// ⚠️ `null` QUAND LA CRÉANCE N'EST PAS RETROUVÉE, jamais `0n`.
							// Un zéro dirait « rien à perdre sur ce dossier » ; l'absence dit
							// « on ne sait pas ». Le doute ne profite jamais au produit.
							principalRestantDu: creance?.principalRestantDu ?? null,
							nombreFactures: creance?.nombreFactures ?? null,
							// Le rail se calcule ici, par la fonction du domaine, à partir du
							// journal que la requête a rapporté. Rien de l'état n'est réécrit à
							// l'écran : un second calcul du même parcours finirait par diverger,
							// et le plus dangereux des deux serait celui que personne ne relit.
							etapes: parcoursDeLaVoie(dossier.procedure, dossier.journal, dossier.engageeLe).map(
								(etape) => ({
									etat: etape.etat,
									libelle: etape.libelle,
									statut: etape.statut,
									atteinteLe: etape.atteinteLe,
									branches: etape.branches,
									brancheSuivie: etape.brancheSuivie
								})
							)
						};
					}),
					ouvertId: p ?? null,
					onFermer: () => void navigate({ to: '/app/procedures', search: {} })
				}
			}}
		/>
	);
}
