import { Link } from '@tanstack/react-router';
import { Surface, Chip } from '@cladd-ui/react';
import { FileSearchIcon, RefreshCwIcon } from 'lucide-react';
import type { PalierTaille } from '../../lib/config/tarifs';
import {
	LigneAnalyse,
	ListeAnalyses,
	PageEcran,
	SectionEcran,
	euros,
	type Lecture
} from '../../ui';
import { sansEtablissement } from '../sans-etablissement';
import { OuvertureEnCours, EssaiEnCours } from './offre';

/** Ce que l'écran affiche : l'état d'abonnement tel que `etatAbonnement` le rend, palier et tarifs résolus par le serveur. */
export interface AbonnementAffiche {
	readonly tier: string;
	readonly isDev: boolean;
	readonly palier: PalierTaille;
	readonly bornesPalier: string;
	readonly facturesParAn: number | null;
	readonly tarifs: { readonly bilan: number; readonly abonnementMensuel: number };
	readonly seatsAllowed: number;
	readonly paddleStatus: string | null;
	readonly paddleConfigure: boolean;
	readonly essaiFiniLe: number | null;
}

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
export function EcranAbonnement({ donnees }: { donnees: Lecture<AbonnementAffiche | null> }) {
	const entete = { genre: 'onglet', titre: 'Abonnement' } as const;

	if (donnees.etat !== 'pret') {
		return <PageEcran entete={entete} etat={donnees.etat} />;
	}

	const etat = donnees.valeur;
	if (etat === null) {
		return (
			<PageEcran entete={entete} etat={sansEtablissement('Créez-en un pour voir votre offre.')} />
		);
	}

	const abonne = etat.paddleStatus === 'active' || etat.paddleStatus === 'trialing';

	return (
		<PageEcran
			entete={{
				...entete,
				sousTitre: 'Votre offre, calculée sur la taille de votre établissement.'
			}}
		>
			<div className="flex flex-col gap-cladd-2xs">
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
						{etat.facturesParAn
							? `Déterminé à partir des ${etat.facturesParAn} factures par an déclarées dans vos réglages.`
							: 'Votre volume de factures n’est pas renseigné : le palier le plus bas est retenu par défaut.'}{' '}
						Le produit est le même à tous les paliers ; seul le prix change.{' '}
						<Link to="/app/parametres" className="underline underline-offset-2">
							Modifier
						</Link>
					</p>
				</SectionEcran>

				{/*
				  ⚠️ DEUX RANGÉES, PLUS DEUX CARTES DÉPLIÉES.

				  Chaque offre portait son prix, sa description ET sa liste complète
				  de ce qui est inclus. Empilées sur un téléphone — la grille ne passe
				  à deux colonnes qu'au-dessus de 768 px — elles faisaient l'essentiel
				  des 6,76 écrans de défilement de cet écran, mesurés.

				  Or on ne compare pas deux offres en faisant défiler : on les voit
				  côte à côte, ou on entre dans celle qui intéresse. Le prix est sur
				  la rangée, parce que c'est le seul chiffre qui décide ; le reste est
				  à un geste.
				*/}
				<ListeAnalyses>
					<LigneAnalyse
						vers="/app/abonnement/premier-bilan"
						icone={<FileSearchIcon />}
						titre="Le premier bilan"
						precision="Douze mois de factures lus en une fois"
						valeur={`${euros(etat.tarifs.bilan)} une fois`}
					/>
					<LigneAnalyse
						vers="/app/abonnement/suivi"
						icone={<RefreshCwIcon />}
						titre="L’abonnement"
						precision="Votre chiffre reste à jour toute l’année"
						valeur={`${euros(etat.tarifs.abonnementMensuel)} par mois`}
					/>
				</ListeAnalyses>

				{etat.paddleConfigure ? null : <OuvertureEnCours />}

				<p className="text-cladd-xs leading-relaxed text-cladd-fg-softer">
					Prix hors taxes. La facturation est opérée par Paddle, qui émet la facture et collecte la
					TVA applicable à votre pays.
				</p>
			</div>
		</PageEcran>
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
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
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
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
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
