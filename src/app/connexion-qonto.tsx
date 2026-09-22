import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { minutesDepuis, useMinute } from '../screens/import/horloge';
import { CarteConnexion, LogoConnexion, type EtatConnexion } from '../ui';

/**
 * LA CARTE QONTO, BRANCHÉE.
 *
 * ⚠️ L'ÉTAT VIENT DU SERVEUR, PAS DE L'ÉCRAN. Au retour de Qonto, rien n'est
 * gardé dans le navigateur : `maConnexionQonto` dit « lecture », puis le nombre
 * de factures lues, puis « à jour », parce que Convex pousse chaque changement.
 * Seul l'instant entre le clic et le départ vers Qonto est local.
 */

/** La promesse, avant qu'on touche la carte : ce que la connexion fait, en une phrase. */
/** Le symbole officiel, pris dans le kit média de Qonto et auto-hébergé. */
export const LOGO_QONTO = '/connecteurs/qonto-symbole-noir.png';

/**
 * La couverture : une colonnade de pierre claire (Jesse Bauer, licence Unsplash).
 * Elle dit la solidité d'une institution au moment où l'on demande l'accès.
 */
export const COUVERTURE_QONTO = '/connecteurs/couverture-colonnade.webp';

export const PROMESSE_QONTO =
	'Vos factures Qonto arrivent seules, et passent payées quand elles le sont.';

function depuisLisible(quand: number, minute: number | null): string {
	const minutes = minutesDepuis(quand, minute);
	if (minutes === null || minutes < 1) return 'à l’instant';
	if (minutes < 60) return `il y a ${minutes} min`;
	const heures = Math.floor(minutes / 60);
	return heures < 24 ? `il y a ${heures} h` : `il y a ${Math.floor(heures / 24)} j`;
}

export function CarteQontoBranchee() {
	const connexion = useQuery(api.connexions.qontoDonnees.maConnexionQonto, {});
	const demarrer = useAction(api.connexions.qonto.demarrerConnexionQonto);
	const synchroniser = useAction(api.connexions.qonto.synchroniserMaintenant);
	const deconnecter = useAction(api.connexions.qonto.deconnecterQonto);
	const minute = useMinute();
	const [redirection, setRedirection] = useState(false);
	const [echecLocal, setEchecLocal] = useState<string | null>(null);

	if (connexion === undefined || !connexion.disponible) return null;

	const etat: EtatConnexion = redirection
		? { genre: 'REDIRECTION' }
		: echecLocal !== null
			? { genre: 'ECHEC', message: echecLocal }
			: connexion.statut === null || connexion.statut === 'EN_ATTENTE'
				? { genre: 'A_CONNECTER' }
				: connexion.statut === 'SYNCHRONISATION'
					? { genre: 'SYNCHRONISATION', facturesLues: connexion.facturesLues }
					: connexion.statut === 'A_JOUR'
						? {
								genre: 'A_JOUR',
								facturesLues: connexion.facturesLues,
								depuis:
									connexion.derniereSynchro === null
										? 'à l’instant'
										: depuisLisible(connexion.derniereSynchro, minute)
							}
						: connexion.statut === 'REVOQUEE'
							? { genre: 'REVOQUEE' }
							: { genre: 'ECHEC', message: connexion.erreur ?? 'La connexion a échoué.' };

	return (
		<CarteConnexion
			nom="Qonto"
			promesse={PROMESSE_QONTO}
			logo={<LogoConnexion src={LOGO_QONTO} />}
			couverture={COUVERTURE_QONTO}
			etat={etat}
			onConnecter={() => {
				setRedirection(true);
				setEchecLocal(null);
				demarrer({})
					.then((adresse) => {
						window.location.assign(adresse);
					})
					.catch(() => {
						setRedirection(false);
						setEchecLocal('Qonto ne répond pas. Réessayez dans un instant.');
					});
			}}
			onSynchroniser={() => void synchroniser({})}
			onDeconnecter={() => void deconnecter({})}
		/>
	);
}
