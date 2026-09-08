import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button } from '@cladd-ui/react';
import { AlertTriangleIcon, UploadIcon, UsersIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	FluxEvenements,
	Bandeau,
	dateCourte
} from '../../ui';

export const Route = createFileRoute('/app/')({ component: Recouvrement });

/**
 * Le flux de surveillance — l'écran d'accueil du recouvrement.
 *
 * IL EST EN PREMIER PARCE QU'IL RÉPOND À LA SEULE QUESTION QUI COMPTE en
 * ouvrant le produit : « qu'est-ce qui a bougé, et combien ça pèse ». Une liste
 * de débiteurs répondrait « qui me doit de l'argent », ce qu'un gérant sait
 * déjà. Ce qu'il ne sait pas, c'est laquelle de ses créances va s'éteindre dans
 * cinquante-neuf jours.
 *
 * LE VIDE MONTRE LE CHEMIN, jamais des cadrans à zéro (règle d'écran n° 4). Un
 * établissement sans facture ne voit pas « 0 € identifiés » : il voit par où
 * commencer.
 */
function Recouvrement() {
	const flux = useQuery(api.recouvrement.surveillance.flux, {});
	const battement = useQuery(api.recouvrement.battement.dernierBattement, {});

	const actions = (
		<>
			<Button as={Link} to="/app/debiteurs" size="md" variant="transparent">
				<UsersIcon />
				Débiteurs
			</Button>
			<Button as={Link} to="/app/import-factures" size="md" color="brand" variant="solid-fill">
				<UploadIcon />
				Importer
			</Button>
		</>
	);

	if (flux === undefined) {
		return (
			<Page>
				<PageHeader titre="À traiter" actions={actions} />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	const rienASurveiller = flux.evenements.length === 0;

	/**
	 * LA SURVEILLANCE EST-ELLE MUETTE ?
	 *
	 * ⚠️ C'EST LA SEULE CHOSE DE CET ÉCRAN QUI EMPÊCHE LE PIRE ÉTAT DU PRODUIT.
	 * Un gérant qui se croit surveillé alors que le battement plante depuis six
	 * jours ne surveille pas lui-même — et il perdra une créance en croyant être
	 * couvert. C'est exactement le scénario que ce produit existe pour empêcher.
	 *
	 * DEUX ÉTATS SE DISENT, UN SEUL SE TAIT.
	 *
	 *   · ÉCHEC — toujours, même sur un écran vide. Si le battement est tombé,
	 *     le vide qu'on affiche est peut-être le symptôme et pas la vérité.
	 *   · JAMAIS TOURNÉ — seulement s'il y a quelque chose à surveiller. Sur un
	 *     établissement sans aucune facture, l'annoncer serait du bruit : il est
	 *     évident que rien ne tourne, et le vide dit déjà par où commencer.
	 *   · NORMAL — rien. Un bandeau vert permanent devient du décor qu'on cesse
	 *     de voir en trois jours, et il ne dit plus rien le jour où il disparaît.
	 *
	 * `undefined` est l'état de chargement : on ne montre rien plutôt que de
	 * faire clignoter une alerte le temps d'un aller-retour.
	 */
	const enEchec = battement !== undefined && battement !== null && battement.statut === 'ECHEC';
	const jamaisTourne = battement === null && !rienASurveiller;

	return (
		<Page>
			<PageHeader
				titre="À traiter"
				sousTitre={
					rienASurveiller
						? undefined
						: `${flux.evenements.length} point${flux.evenements.length > 1 ? 's' : ''} d’attention`
				}
				actions={actions}
			/>
			<PageBody>
				{enEchec || jamaisTourne ? (
					// `PageBody` ne pose aucun espacement entre ses enfants : sans cette
					// respiration, le bandeau collerait au flux qui le suit.
					<div className="pb-cladd-3xs">
						<Bandeau ton="alerte" icone={<AlertTriangleIcon size={18} />}>
							{enEchec && battement !== null && battement !== undefined
								? `La surveillance a échoué le ${dateCourte(battement.jour)}. Vos délais ne sont pas suivis depuis.`
								: 'La surveillance n’a pas encore tourné sur cet établissement. Vos délais ne sont pas encore suivis.'}
						</Bandeau>
					</div>
				) : null}

				{rienASurveiller ? (
					<EmptyState
						illustration="📬"
						titre="Rien à surveiller pour l’instant"
						explication="Le logiciel repérera de lui-même les échéances passées, les créances mûres et les prescriptions qui approchent. Il lui faut d’abord vos factures."
						etapes={[
							'Importez un export comptable — c’est le plus complet : il porte vos factures, vos règlements et vos clients d’un coup.',
							'À défaut, déposez vos factures de vente en PDF ou en photo.',
							'Précisez le secteur de vos débiteurs : c’est lui qui détermine le délai de prescription.'
						]}
						action={
							<Button
								as={Link}
								to="/app/import-factures"
								size="lg"
								color="brand"
								variant="solid-fill"
							>
								<UploadIcon />
								Importer mes factures
							</Button>
						}
					/>
				) : (
					<FluxEvenements
						evenements={flux.evenements}
						montantIdentifie={flux.montantIdentifie}
						hypotheses={flux.hypotheses}
						anglesMorts={flux.anglesMorts}
					/>
				)}
			</PageBody>
		</Page>
	);
}
