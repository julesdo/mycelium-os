import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { messageDeRefus } from '../../app/televerser';
import { api } from '../../lib/convex/_generated/api';
import {
	EcranSanteClient,
	EcranVerifierEntreprise,
	messageDeLIssue,
	type EntrepriseTrouvee
} from '../../screens/sante';

/**
 * `/app/risque/verifier` — VÉRIFIER UNE ENTREPRISE AVANT DE LA SERVIR.
 *
 * Sans `?siren=`, la recherche (par nom au journal officiel, gratuite, ou par
 * SIREN) ; avec, son analyse, comme celle d'un client mais sans vos paiements.
 * L'adresse porte le SIREN : le retour du navigateur ramène à la recherche, et une
 * notification peut y mener.
 */
export const Route = createFileRoute('/app/risque/verifier')({
	validateSearch: (recherche: Record<string, unknown>): { siren?: string } =>
		typeof recherche.siren === 'string' && /^\d{9}$/.test(recherche.siren)
			? { siren: recherche.siren }
			: {},
	component: PageVerifier
});

function PageVerifier() {
	const { siren } = Route.useSearch();
	return siren === undefined ? <Recherche /> : <Analyse siren={siren} />;
}

function Recherche() {
	const navigate = useNavigate();
	const chercher = useAction(api.risque.analyse.chercherUneEntreprise);
	const [terme, setTerme] = useState('');
	const [enCours, setEnCours] = useState(false);
	const [resultats, setResultats] = useState<readonly EntrepriseTrouvee[] | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);
	return (
		<EcranVerifierEntreprise
			recherche={{
				terme,
				onTerme: setTerme,
				enCours,
				resultats,
				erreur,
				onChercher: () => {
					setEnCours(true);
					setErreur(null);
					chercher({ terme })
						.then((trouves) => setResultats(trouves))
						.catch((e: unknown) => setErreur(messageDeRefus(e)))
						.finally(() => setEnCours(false));
				},
				onChoisir: (choisi) =>
					void navigate({ to: '/app/risque/verifier', search: { siren: choisi } })
			}}
		/>
	);
}

function Analyse({ siren }: { readonly siren: string }) {
	const donnees = useQuery(api.risque.donnees.risqueDUneEntreprise, { siren });
	const verifier = useAction(api.risque.analyse.verifierEntreprise);
	const [enCours, setEnCours] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const entete = {
		genre: 'poussee',
		retour: { vers: '/app/risque/verifier', libelle: 'Vérifier une entreprise' },
		titre: donnees?.analyse?.denomination ?? `SIREN ${siren}`
	} as const;
	if (donnees === undefined)
		return <EcranSanteClient entete={entete} donnees={{ etat: 'attente' }} />;
	return (
		<EcranSanteClient
			entete={entete}
			donnees={{
				etat: 'pret',
				valeur: {
					mode: 'ENTREPRISE',
					denomination:
						donnees.analyse?.denomination ??
						donnees.client?.denomination ??
						`l’entreprise ${siren}`,
					siren,
					disponible: donnees.disponible,
					analyse: donnees.analyse,
					enCours,
					message,
					onAnalyser: () => {
						if (enCours) return;
						setEnCours(true);
						setMessage(null);
						verifier({ siren })
							.then(({ etat }) => setMessage(messageDeLIssue(etat)))
							.catch((e: unknown) => setMessage(messageDeRefus(e)))
							.finally(() => setEnCours(false));
					},
					...(donnees.client === null ? {} : { client: donnees.client })
				}
			}}
		/>
	);
}
