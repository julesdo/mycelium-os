import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { choixDeRelance, useGestesDeDossier } from '../../app/gestes-dossier';
import { aujourdHuiISO } from '../../ui';
import {
	EcranDossiers,
	type DossierDeLIndex,
	type DossiersAffiches,
	type ResultatDuLot
} from '../../screens/dossiers';

export const Route = createFileRoute('/app/dossiers')({
	component: PageDossiers,
	errorComponent: DossiersEnErreur
});

function DossiersEnErreur() {
	return <EcranDossiers donnees={{ etat: 'erreur' }} />;
}

/**
 * `/app/dossiers` — LE TROISIÈME ONGLET, ET ENFIN UN INDEX.
 *
 * ⚠️ IL REMPLACE `/app/procedures`, QUI NE LISTAIT QUE LE TRIBUNAL. L'ancienne
 * adresse redirige : elle vit dans des favoris et dans l'historique.
 *
 * ⚠️ LE LOT NE VALIDE RIEN. `preparerEnLot` compose et POSE des lettres à
 * valider, chacune sur son dossier. Le gérant les relit et les valide une par
 * une, comme avant : c'est la ligne rouge n° 1, et la vitesse ne l'entame pas.
 */
function PageDossiers() {
	const aujourdHui = aujourdHuiISO();
	const dossiers = useQuery(api.recouvrement.lecture.indexDossiers, {});
	/*
	  ⚠️ LA SECONDE LECTURE PORTE CE QUE L'INDEX NE SAIT PAS. `indexDossiers`
	  rejoue l'étape et les montants ; elle ne rejoue pas la machine à états des
	  procédures, qui est le seul endroit du produit où un droit s'éteint à date
	  FIXE. Une rangée « Le tribunal, si besoin » sans sa prochaine échéance
	  cacherait précisément la date dont l'oubli fait tout reprendre.
	*/
	const engages = useQuery(api.recouvrement.apresProcedure.dossiersEngages, {});
	const profilCreancier = useQuery(api.recouvrement.profil.monProfil, {});
	const preparerEnLot = useMutation(api.recouvrement.envois.preparerEnLot);
	const gestes = useGestesDeDossier();

	/**
	 * ⚠️ TROIS ÉTATS, PAS UN BOOLÉEN. « En cours » et « fait » ne se déduisent pas
	 * l'un de l'autre : entre les deux il y a un résultat à LIRE, dossier par
	 * dossier, et un lot dont on ne montrerait que « terminé » cacherait ses
	 * refus — c'est-à-dire les lettres que le gérant croit avoir préparées.
	 */
	const [lot, setLot] = useState<DossiersAffiches['lot']>('AUCUN');

	// On attend LES DEUX : composer dès l'index laisserait les dossiers au
	// tribunal sans leur échéance pendant une image, c'est-à-dire un doute là où
	// il n'y en a pas.
	if (dossiers === undefined || engages === undefined) {
		return <EcranDossiers donnees={{ etat: 'attente' }} />;
	}
	const echeanceDe = new Map(
		engages
			.filter((e) => e.prochaineEcheance !== null)
			.map((e) => [
				e.creanceId as string,
				{ libelle: e.prochaineEcheance!.libelle, dateLimite: e.prochaineEcheance!.dateLimite }
			])
	);

	const nomDe = (id: string) => (dossiers ?? []).find((d) => d._id === id)?.debiteur ?? 'ce client';

	async function lancer(creanceIds: readonly string[], delaiJours: number) {
		setLot('EN_COURS');
		const resultats = await preparerEnLot({
			creanceIds: creanceIds as Id<'creances'>[],
			choix: choixDeRelance(delaiJours)
		});

		const fait: ResultatDuLot = {
			prepares: resultats.filter((r) => r.envoiId !== undefined).length,
			refus: resultats
				.filter((r) => r.refus !== undefined)
				.map((r) => ({ debiteur: nomDe(r.creanceId), raison: r.refus! }))
		};
		setLot({ fait });
	}

	const valeur: DossiersAffiches = {
		dossiers: dossiers.map(
			(d): DossierDeLIndex => ({
				_id: d._id,
				debiteur: d.debiteur,
				debiteurId: d.debiteurId,
				etape: d.etape,
				principalRestantDu: d.principalRestantDu,
				nombreFactures: d.nombreFactures,
				...(d.dateLimiteAgir === undefined ? {} : { dateLimiteAgir: d.dateLimiteAgir }),
				...(d.dernierCourrierLe === undefined ? {} : { dernierCourrierLe: d.dernierCourrierLe }),
				courrierAValider: d.courrierAValider,
				professionnelDesigne: d.professionnelDesigne,
				...(echeanceDe.has(d._id) ? { prochaineEcheance: echeanceDe.get(d._id)! } : {})
			})
		),
		aujourdHui,
		lot,
		...(profilCreancier?.delaiRelanceParDefautJours === undefined
			? {}
			: { delaiParDefaut: profilCreancier.delaiRelanceParDefautJours }),
		onPreparerRelances: lancer,
		onFermerLeLot: () => setLot('AUCUN'),
		onRelancer: (creanceId, delaiJours) => gestes.relancer(creanceId, nomDe(creanceId), delaiJours),
		onRappeler: (creanceId, rappelLe) => gestes.rappeler(creanceId, nomDe(creanceId), rappelLe)
	};

	return <EcranDossiers donnees={{ etat: 'pret', valeur }} />;
}
