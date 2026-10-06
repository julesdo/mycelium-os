import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { minutesDepuis, useMinute } from '../screens/import/horloge';
import { CarteConnexion, PictoLogiciel, type EtatConnexion } from '../ui';
import { COUVERTURE_QONTO } from './connexion-qonto';

/**
 * LA CARTE « VOTRE LOGICIEL », BRANCHÉE SUR CHIFT.
 *
 * Une seule carte pour une quarantaine de logiciels : le gérant ne cherche pas
 * le sien dans une liste ici, il le choisit sur la page de Chift, qui ne montre
 * que les logiciels comptables et de facturation de France. Au retour, la carte
 * prend le nom du logiciel branché (« Pennylane »).
 *
 * ⚠️ L'ÉTAT VIENT DU SERVEUR, PAS DE L'ÉCRAN — comme pour Qonto. Seul l'instant
 * entre le clic et le départ vers Chift est local.
 */

export const PROMESSE_CHIFT =
	'Pennylane, Sage, Cegid, Tiime, MyUnisoft, Sellsy… Vos factures arrivent seules, et passent payées quand elles le sont.';

function depuisLisible(quand: number, minute: number | null): string {
	const minutes = minutesDepuis(quand, minute);
	if (minutes === null || minutes < 1) return 'à l’instant';
	if (minutes < 60) return `il y a ${minutes} min`;
	const heures = Math.floor(minutes / 60);
	return heures < 24 ? `il y a ${heures} h` : `il y a ${Math.floor(heures / 24)} j`;
}

export function CarteChiftBranchee() {
	const connexion = useQuery(api.connexions.chiftDonnees.maConnexionChift, {});
	const demarrer = useAction(api.connexions.chift.demarrerConnexionChift);
	const synchroniser = useAction(api.connexions.chift.synchroniserMaintenant);
	const deconnecter = useAction(api.connexions.chift.deconnecterChift);
	const minute = useMinute();
	const [redirection, setRedirection] = useState(false);
	const [echecLocal, setEchecLocal] = useState<string | null>(null);

	if (connexion === undefined || !connexion.disponible) return null;

	const branche = connexion.logiciels.length > 0 ? connexion.logiciels.join(' et ') : null;
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
								nonLues: connexion.facturesNonLues,
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
			nom={branche ?? 'Votre logiciel'}
			nomDansLaPhrase={branche ?? 'votre logiciel'}
			promesse={PROMESSE_CHIFT}
			logo={<PictoLogiciel />}
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
						setEchecLocal('La connexion ne répond pas. Réessayez dans un instant.');
					});
			}}
			onSynchroniser={() => void synchroniser({})}
			onDeconnecter={() => void deconnecter({})}
		/>
	);
}
