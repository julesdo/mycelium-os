import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '../../app/donnees';
import { carteDeConversation, horairesDeLEquipe } from '../../app/aide';
import { api } from '../../lib/convex/_generated/api';
import { chercherArticles } from '../../lib/support/articles';
import { moisDe } from '../../lib/support/conversation';
import { EcranAide } from '../../screens/aide';
import { useProvenance } from '../../ui';
import { useMinute } from '../../ui/minute';

export const Route = createFileRoute('/app/aide/')({
	component: PageAide,
	errorComponent: () => <EcranAide donnees={{ etat: 'erreur' }} />
});

/**
 * `/app/aide` — L'ACCUEIL DE L'AIDE (16/10/2026, spec du service client § 3).
 *
 * Un champ qui cherche dans la base d'aide pendant la frappe et, sur Entrée, ouvre un
 * fil neuf avec la question à relire : la présentation du fil dit qui lit avant que
 * rien ne parte. La question passe dans l'état de la navigation, jamais dans l'adresse.
 */
function PageAide() {
	const navigate = useNavigate();
	const provenance = useProvenance();
	const [recherche, setRecherche] = useState('');
	const [toutLHistorique, setToutLHistorique] = useState(false);
	// L'horloge à la minute, nulle au rendu serveur : les délais se calculent au client.
	const minute = useMinute();
	const maintenant = (minute ?? 0) * 60_000;
	const accueil = useQuery(
		api.support.fil.accueil,
		minute === null ? 'skip' : { mois: moisDe(maintenant) }
	);

	if (minute === null || accueil === undefined) return <EcranAide donnees={{ etat: 'attente' }} />;
	const cartes = accueil.conversations.map((c) =>
		carteDeConversation(c, maintenant, accueil.absentJusquAu)
	);
	const enCours: readonly string[] = accueil.conversations
		.filter((c) => c.etat !== 'TERMINEE')
		.map((c) => c.id);
	const horaires = horairesDeLEquipe(maintenant, accueil.absentJusquAu);

	return (
		<EcranAide
			donnees={{
				etat: 'pret',
				valeur: {
					recherche,
					onRecherche: setRecherche,
					onDemander: () =>
						void navigate({
							to: '/app/aide/nouvelle',
							state: { ...provenance, questionPourLAide: recherche.trim() }
						}),
					resultats: chercherArticles(recherche, 4).map((a) => ({ cle: a.cle, question: a.question })),
					...(accueil.plumeOuvert && !accueil.plafondAtteint
						? {}
						: {
								avantLaSaisie: accueil.plafondAtteint
									? 'Ce mois-ci, vos questions vont directement à l’équipe.'
									: 'Vos questions vont directement à l’équipe Letikette.'
							}),
					enCours: cartes.filter((c) => enCours.includes(c.id)),
					questions: accueil.questions,
					equipe: {
						membres: accueil.equipe,
						horaires: horaires.horaires,
						attendue: horaires.attendue,
						...(horaires.absence === undefined ? {} : { absence: horaires.absence }),
						...(accueil.adresse === null
							? {}
							: { adresse: `Ou écrivez à ${accueil.adresse}, depuis l’adresse de votre compte : même équipe, même fil.` })
					},
					terminees: cartes.filter((c) => !enCours.includes(c.id)),
					toutLHistorique,
					onToutLHistorique: () => setToutLHistorique(true)
				}
			}}
		/>
	);
}
