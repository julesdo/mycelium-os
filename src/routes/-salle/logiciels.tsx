import { useState } from 'react';
import {
	AnnuleesALaSource,
	BrancherUnAutreLogiciel,
	CarteConnexion,
	ConfirmationDebranchement,
	ParcoursLogiciels,
	PictoLogiciel,
	LogoConnexion,
	type EtatDuBranchement,
	type LogicielABrancher
} from '../../ui';
import { COUVERTURE_QONTO } from '../../app/connexion-qonto';
import { LOGOS_DE_LA_PROMESSE, PROMESSE_NANGO, logoDuFournisseur } from '../../app/connexion-nango';

/**
 * LES LOGICIELS DE LA SALLE — chaque étape du branchement par Nango, figée pour
 * qu'on la regarde aux quatre largeurs, et les cartes des logiciels branchés.
 *
 * Aucun appel : choisir un logiciel mène à son étape, « brancher » mène à la
 * coche. La salle ne parle ni à Convex ni à Nango.
 */

const PENNYLANE: LogicielABrancher = {
	integrationId: 'pennylane',
	logo: logoDuFournisseur('pennylane')!,
	nom: 'Pennylane',
	mode: 'AUTORISATION',
	dejaBranche: 0
};
const PENNYLANE_JETON: LogicielABrancher = {
	integrationId: 'pennylane-company-api',
	logo: logoDuFournisseur('pennylane-company-api')!,
	nom: 'Pennylane',
	mode: 'CLE_PENNYLANE',
	dejaBranche: 0
};
const STRIPE: LogicielABrancher = {
	integrationId: 'stripe-api-key',
	logo: logoDuFournisseur('stripe-api-key')!,
	nom: 'Stripe',
	mode: 'CLE_STRIPE',
	dejaBranche: 0
};
const ZOHO: LogicielABrancher = {
	integrationId: 'zoho-books',
	logo: logoDuFournisseur('zoho-books')!,
	nom: 'Zoho Books',
	mode: 'REGION_ZOHO',
	dejaBranche: 0
};

const CATALOGUE: readonly LogicielABrancher[] = [
	PENNYLANE,
	PENNYLANE_JETON,
	{
		integrationId: 'quickbooks',
		nom: 'QuickBooks',
		mode: 'AUTORISATION',
		dejaBranche: 0,
		logo: logoDuFournisseur('quickbooks')!
	},
	{
		integrationId: 'xero',
		nom: 'Xero',
		mode: 'AUTORISATION',
		dejaBranche: 1,
		logo: logoDuFournisseur('xero')!
	},
	{
		integrationId: 'sellsy',
		nom: 'Sellsy',
		mode: 'AUTORISATION',
		dejaBranche: 0,
		logo: logoDuFournisseur('sellsy')!
	},
	STRIPE,
	ZOHO
];

/** Chaque étape du parcours, nommée comme la salle la propose. */
const ETAPES: Readonly<Record<string, EtatDuBranchement>> = {
	'brancher : le choix': { genre: 'CHOIX' },
	'brancher : autorisation': { genre: 'PRET', logiciel: PENNYLANE },
	'brancher : fenêtre ouverte': { genre: 'AUTORISATION', logiciel: PENNYLANE },
	'brancher : jeton Pennylane': { genre: 'PRET', logiciel: PENNYLANE_JETON },
	'brancher : clé Stripe': { genre: 'PRET', logiciel: STRIPE },
	'brancher : Zoho': { genre: 'PRET', logiciel: ZOHO },
	'brancher : fenêtre fermée': {
		genre: 'PRET',
		logiciel: PENNYLANE,
		message: 'La fenêtre de Pennylane a été fermée avant la fin. Rien n’a été branché.'
	},
	'brancher : branché': { genre: 'BRANCHE', logiciel: PENNYLANE, lecture: '128 factures lues…' }
};

export const VARIANTES_LOGICIELS: readonly string[] = [
	...Object.keys(ETAPES),
	'logiciels branchés',
	'débrancher'
];

/** Les cartes des logiciels branchés : à jour avec deux annulations, en lecture, à rebrancher. */
function CartesBranchees({ onDebrancher }: { readonly onDebrancher: () => void }) {
	return (
		<>
			<CarteConnexion
				principale={false}
				nom="Pennylane"
				promesse=""
				logo={<LogoConnexion src={logoDuFournisseur('pennylane')!} />}
				etat={{ genre: 'A_JOUR', depuis: 'il y a 2 h', facturesLues: 412, nonLues: 3 }}
				onSynchroniser={() => undefined}
				onDeconnecter={onDebrancher}
			/>
			<AnnuleesALaSource
				nom="Pennylane"
				references={['F-2026-0412', 'F-2026-0518']}
				onVerifie={() => undefined}
			/>
			<CarteConnexion
				principale={false}
				nom="Sellsy"
				promesse=""
				logo={<LogoConnexion src={logoDuFournisseur('sellsy')!} />}
				etat={{ genre: 'SYNCHRONISATION', facturesLues: 128 }}
			/>
			<CarteConnexion
				principale={false}
				nom="Xero"
				promesse=""
				logo={<LogoConnexion src={logoDuFournisseur('xero')!} />}
				etat={{ genre: 'REVOQUEE' }}
				onConnecter={() => undefined}
			/>
			<BrancherUnAutreLogiciel onClick={() => undefined} />
		</>
	);
}

/**
 * LA CARTE « VOS LOGICIELS » ET SON PARCOURS, dans l'état que nomme la variante.
 * Sans variante de logiciels, la carte d'appel seule, telle qu'un gérant la voit
 * le premier jour.
 */
export function DemoLogiciels({ variante }: { readonly variante?: string }) {
	const initial = variante === undefined ? undefined : ETAPES[variante];
	const [ouvert, setOuvert] = useState(initial !== undefined);
	const [branchement, setBranchement] = useState<EtatDuBranchement>(initial ?? { genre: 'CHOIX' });
	const [aDebrancher, setADebrancher] = useState(variante === 'débrancher');

	const branches = variante === 'logiciels branchés' || variante === 'débrancher';

	return (
		<>
			{branches ? (
				<CartesBranchees onDebrancher={() => setADebrancher(true)} />
			) : (
				<CarteConnexion
					principale={false}
					nom="Vos logiciels"
					nomDansLaPhrase="un logiciel"
					promesse={PROMESSE_NANGO}
					logo={<PictoLogiciel />}
					logos={LOGOS_DE_LA_PROMESSE}
					couverture={COUVERTURE_QONTO}
					etat={{ genre: 'A_CONNECTER' }}
					onConnecter={() => {
						setBranchement({ genre: 'CHOIX' });
						setOuvert(true);
					}}
				/>
			)}
			<ParcoursLogiciels
				ouvert={ouvert}
				onFermer={() => setOuvert(false)}
				catalogue={{ genre: 'PRET', logiciels: CATALOGUE }}
				branchement={branchement}
				onChoisir={(logiciel) => setBranchement({ genre: 'PRET', logiciel })}
				onRetour={() => setBranchement({ genre: 'CHOIX' })}
				onBrancher={(logiciel) =>
					setBranchement({
						genre: 'BRANCHE',
						logiciel,
						lecture: 'La lecture de vos factures commence…'
					})
				}
				onDeposerUnExport={() => setOuvert(false)}
			/>
			<ConfirmationDebranchement
				ouverte={aDebrancher}
				nom="Pennylane"
				logo={logoDuFournisseur('pennylane')!}
				facturesLues={412}
				enCours={false}
				message={null}
				onConfirmer={() => setADebrancher(false)}
				onFermer={() => setADebrancher(false)}
			/>
		</>
	);
}
