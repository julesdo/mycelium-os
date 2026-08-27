import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Surface, Chip } from '@cladd-ui/react';
import { api } from '../../lib/convex/_generated/api';
import { Page, PageHeader, PageBody, SectionEcran, euros } from '../../ui';
import { Offre, OuvertureEnCours, EssaiEnCours } from '../../screens/abonnement/offre';

export const Route = createFileRoute('/app/abonnement')({ component: Abonnement });

/**
 * L'écran d'abonnement.
 *
 * IL EXISTE PARCE QUE PERSONNE NE POUVAIT PAYER. Les fonctions de facturation
 * étaient écrites depuis des mois et aucun écran ne les appelait : le produit
 * était gratuit et illimité pour qui créait un compte.
 *
 * LE PALIER VIENT DU SERVEUR. Le prix dépend du nombre de couverts par jour, et
 * un palier calculé dans le navigateur se falsifie pour payer le tarif d'en
 * dessous. La requête `etatAbonnement` le renvoie déjà résolu, avec le tarif
 * correspondant.
 *
 * IL NE PROMET PAS UN BOUTON QUI NE MARCHE PAS. Le compte marchand Paddle n'est
 * pas ouvert : il attend les conditions générales, qui attendent un juriste.
 * Tant que `paddleConfigure` vaut faux, l'écran présente l'offre et dit
 * franchement où en est l'ouverture, au lieu d'afficher un bouton qui échouerait
 * au clic. Un bouton mort coûte plus cher qu'une phrase honnête.
 *
 * Les cartes d'offre vivent dans `src/screens/abonnement/` : elles sont ainsi
 * regardables dans la salle d'exposition, sans session.
 */
function Abonnement() {
	const etat = useQuery(api.billing.etatAbonnement, {});

	if (etat === undefined) {
		return (
			<Page>
				<PageHeader titre="Abonnement" />
				<PageBody>
					<p className="text-cladd-sm text-cladd-fg-soft">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	if (etat === null) {
		return (
			<Page>
				<PageHeader titre="Abonnement" />
				<PageBody>
					<p className="text-cladd-sm text-cladd-fg-soft">
						Aucun établissement actif. Créez-en un pour voir votre offre.
					</p>
				</PageBody>
			</Page>
		);
	}

	const abonne = etat.paddleStatus === 'active' || etat.paddleStatus === 'trialing';

	return (
		<Page>
			<PageHeader
				titre="Abonnement"
				sousTitre="Votre offre, calculée sur la taille de votre établissement."
			/>
			<PageBody>
				<div className="flex max-w-200 flex-col gap-cladd-2xs">
					<EtatCourant etat={etat} abonne={abonne} />

					{etat.essaiFiniLe && !abonne ? <EssaiEnCours finLe={etat.essaiFiniLe} /> : null}

					<SectionEcran titre="Votre palier">
						<div className="flex flex-wrap items-center gap-cladd-3xs">
							<Chip color="brand" size="md">
								Palier {etat.palier}
							</Chip>
							<span className="text-cladd-sm text-cladd-fg-soft">{etat.bornesPalier}</span>
						</div>
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-softer">
							{etat.couvertsJour
								? `Déterminé à partir des ${etat.couvertsJour} couverts par jour déclarés dans vos réglages.`
								: 'Votre nombre de couverts par jour n’est pas renseigné : le palier le plus bas est retenu par défaut.'}{' '}
							Le produit est le même à tous les paliers ; seul le prix change.{' '}
							<Link to="/app/parametres" className="underline underline-offset-2">
								Modifier
							</Link>
						</p>
					</SectionEcran>

					<div className="grid gap-cladd-2xs md:grid-cols-2">
						<Offre
							titre="Le premier bilan"
							prix={euros(etat.tarifs.bilan)}
							cadence="une fois"
							description="Douze mois de factures lus en une fois. Vous saurez où vous en êtes, et ce qu’il manque, en euros."
							colonne="bilan"
							actif={etat.tier === 'diagnostic'}
						/>
						<Offre
							titre="L’abonnement"
							prix={euros(etat.tarifs.abonnementMensuel)}
							cadence="par mois"
							description="Votre chiffre reste à jour toute l’année, et votre déclaration de mars est prête avant mars."
							colonne="abonnement"
							actif={etat.tier === 'conformite'}
							recommande
						/>
					</div>

					{etat.paddleConfigure ? null : <OuvertureEnCours />}

					<p className="text-cladd-xs leading-relaxed text-cladd-fg-softer">
						Prix hors taxes. La facturation est opérée par Paddle, qui émet la facture et collecte
						la TVA applicable à votre pays.
					</p>
				</div>
			</PageBody>
		</Page>
	);
}

function EtatCourant({
	etat,
	abonne
}: {
	etat: { tier: string; isDev: boolean; seatsAllowed: number };
	abonne: boolean;
}) {
	if (etat.isDev) {
		return (
			<Surface
				outline
				className="rounded-cladd-2xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<span className="text-cladd-sm font-bold">Accès de développement</span>
				<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Aucune clé Paddle n&rsquo;est configurée sur ce déploiement : toutes les fonctionnalités
					sont ouvertes. Cet encart n&rsquo;apparaîtra pas en production.
				</span>
			</Surface>
		);
	}

	if (abonne) {
		return (
			<Surface
				outline
				className="rounded-cladd-2xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<span className="text-cladd-sm font-bold">Votre abonnement est actif.</span>
				<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Jusqu&rsquo;à {etat.seatsAllowed} personnes peuvent accéder à votre établissement.
				</span>
			</Surface>
		);
	}

	return null;
}
