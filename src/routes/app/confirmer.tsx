import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button } from '@cladd-ui/react';
import { CameraIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { Page, PageHeader, PageBody, EmptyState, TwoPane, euros, pluriel } from '../../ui';
import { ListeAConfirmer, type LibelleAConfirmer } from '../../screens/confirmer/liste';
import { PreuveEtDecision, type Decision } from '../../screens/confirmer/preuve';

export const Route = createFileRoute('/app/confirmer')({ component: Confirmer });

function Confirmer() {
	const file = useQuery(api.egalim.confirmation.listerAConfirmer, {});
	const confirmer = useMutation(api.egalim.confirmation.confirmer);
	const corriger = useMutation(api.egalim.confirmation.corriger);

	const [selection, setSelection] = useState<string | null>(null);
	const [feuilleOuverte, setFeuilleOuverte] = useState(false);
	const [enCours, setEnCours] = useState(false);

	const libelles = (file?.libelles ?? []) as LibelleAConfirmer[];

	// La sélection suit la file, par DÉRIVATION et non par effet : quand le
	// libellé qu'on vient de trancher disparaît de la file, `find` ne le trouve
	// plus et on retombe sur le premier. Le gérant enchaîne donc sans revenir à
	// la liste ni recliquer, ce qui divise par trois le nombre de gestes.
	//
	// Écrire ça dans un `useEffect` qui appelle `setSelection` provoquerait un
	// second rendu à chaque confirmation, visible comme un clignotement du volet
	// droit. React 19 le signale, à juste titre.
	const courant = libelles.find((l) => l.normalizedLabel === selection) ?? libelles[0] ?? null;

	const preuve = useQuery(
		api.egalim.confirmation.obtenirPreuve,
		courant?.documentId ? { documentId: courant.documentId as Id<'invoiceDocuments'> } : 'skip'
	);

	async function trancher(d: Decision, correction: boolean) {
		if (!courant) return;
		setEnCours(true);
		try {
			const args = {
				normalizedLabel: courant.normalizedLabel,
				isFood: d.isFood,
				family: d.family as never,
				qualifyingLabels: d.qualifyingLabels as never,
				justification: d.justification
			};
			await (correction ? corriger(args) : confirmer(args));
			setSelection(null);
			setFeuilleOuverte(false);
		} finally {
			setEnCours(false);
		}
	}

	if (file === undefined) {
		return (
			<Page>
				<PageHeader titre="À confirmer" sousTitre="Ce qui engage votre responsabilité." />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement de votre file…</p>
				</PageBody>
			</Page>
		);
	}

	if (libelles.length === 0) {
		return (
			<Page>
				<PageHeader titre="À confirmer" sousTitre="Ce qui engage votre responsabilité." />
				<PageBody>
					<EmptyState
						titre="Rien ne vous attend."
						explication="Tous vos produits sont classés et confirmés. Vos taux reposent sur des décisions que vous avez prises."
						action={
							<Button as={Link} to="/app/factures" variant="gradient">
								<CameraIcon />
								Déposer d&rsquo;autres factures
							</Button>
						}
					/>
				</PageBody>
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader
				titre="À confirmer"
				sousTitre={`${libelles.length} produit${pluriel(libelles.length)}, ${euros(
					file.montantTotalEnJeu
				)} en jeu.`}
			/>
			<div className="min-h-0 flex-1">
				<TwoPane
					preuveOuverte={feuilleOuverte}
					onFermerPreuve={() => setFeuilleOuverte(false)}
					liste={
						<ListeAConfirmer
							libelles={libelles}
							selection={courant?.normalizedLabel ?? null}
							onSelectionner={(l) => {
								setSelection(l);
								setFeuilleOuverte(true);
							}}
						/>
					}
					preuve={
						courant ? (
							<PreuveEtDecision
								// `key` sur le libellé : c'est le mécanisme prévu par React pour
								// remettre à zéro l'état d'un formulaire quand l'objet qu'il
								// édite change d'identité. Sans lui, une correction saisie pour
								// un produit se reporterait silencieusement sur le suivant, et
								// fausserait la mesure sans laisser de trace.
								key={courant.normalizedLabel}
								libelle={courant}
								urlDocument={preuve?.url ?? null}
								nomDocument={preuve?.filename ?? null}
								enCours={enCours}
								onConfirmer={(d) => void trancher(d, false)}
								onCorriger={(d) => void trancher(d, true)}
							/>
						) : null
					}
				/>
			</div>
		</Page>
	);
}
