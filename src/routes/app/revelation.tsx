import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { UploadIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { BoutonPrincipal,
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	SectionEcran,
	aujourdHuiISO,
	ChocRevelation,
	CompteurVivant,
	BilanPertes
} from '../../ui';

export const Route = createFileRoute('/app/revelation')({ component: Revelation });

/**
 * CE QUE VOS FACTURES PORTENT — le choc du premier import.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI C'EST UN ÉCRAN À PART, ET PAS UN BLOC EN TÊTE DU FLUX
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le plan prévoyait de poser le compteur vivant en haut de l'écran « À
 * traiter ». Le flux y porte DÉJÀ un compteur — « Factures identifiées,
 * principal TTC, hors intérêts de retard et indemnité forfaitaire » — et les
 * deux mesurent honnêtement deux choses différentes. Côte à côte, ils se
 * liraient comme une contradiction : deux chiffres, deux libellés longs, et un
 * gérant qui se demande lequel croire.
 *
 * ⚠️ SUR UN PRODUIT DONT L'ARGUMENT ENTIER EST L'EXACTITUDE, DEUX TOTAUX SUR
 * LE MÊME ÉCRAN COÛTENT PLUS QU'ILS N'APPORTENT. Un seul récit par écran : le
 * flux dit ce qui a bougé, celui-ci dit ce que ça pèse, intérêts compris.
 *
 * La date du jour est lue par `aujourdHuiISO`, seule lecture d'horloge de
 * l'interface — voir `ui/horloge.ts`, qui explique pourquoi elle est commune à
 * cet écran et à l'accueil.
 */

function Revelation() {
	const arreteAu = aujourdHuiISO();
	const revelation = useQuery(api.recouvrement.revelation.revelation, { arreteAu });
	const bilan = useQuery(api.recouvrement.revelation.bilan, { aujourdHui: arreteAu });

	if (revelation === undefined) {
		return (
			<Page>
				<PageHeader titre="Ce que vos factures portent" />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	// LE VIDE MONTRE LE CHEMIN, jamais des cadrans à zéro (règle d'écran n° 4).
	// Un établissement sans facture en retard ne voit pas « 0,00 € dus » : il
	// voit par où commencer.
	const rienARevelrer = revelation.nombreFactures === 0 && revelation.nonChiffrees.length === 0;

	return (
		<Page>
			<PageHeader
				titre="Ce que vos factures portent"
				sousTitre={rienARevelrer ? undefined : `Relevé au jour d’aujourd’hui`}
			/>
			<PageBody>
				{rienARevelrer ? (
					<EmptyState
						illustration="🧾"
						titre="Rien à chiffrer pour l’instant"
						explication="Trois choses sont dues de plein droit sur une facture payée en retard, et presque jamais réclamées : les intérêts de retard, l’indemnité forfaitaire de 40 € par facture, et ce que le délai de prescription laisse encore le temps de demander. Le logiciel les calcule sur vos propres factures."
						etapes={[
							'Importez un export comptable — c’est le plus complet : il porte vos factures, vos règlements et vos clients d’un coup.',
							'À défaut, déposez vos factures de vente en PDF ou en photo.',
							'Le chiffre apparaît dès le premier dépôt, décomposé facture par facture.'
						]}
						action={
							<BoutonPrincipal
								as={Link}
								to="/app/import-factures"
							>
								<UploadIcon />
								Importer mes factures
							</BoutonPrincipal>
						}
					/>
				) : (
					<div className="flex flex-col gap-cladd-md">
						<ChocRevelation revelation={revelation} />

						<SectionEcran titre="Ce qu’on vous doit aujourd’hui">
							<CompteurVivant
								total={revelation.total}
								interetsCourusDepuisHier={revelation.interetsCourusDepuisHier}
							/>
						</SectionEcran>

						{bilan === undefined ? null : (
							<SectionEcran titre="Ce qui s’est éteint">
								<BilanPertes bilan={bilan} />
							</SectionEcran>
						)}
					</div>
				)}
			</PageBody>
		</Page>
	);
}
