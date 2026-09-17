import type { ReactNode } from 'react';
import { ListButton, ListItem, SectionTitle, Segmented, SegmentedButton } from '@cladd-ui/react';
import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { Theme } from '../../app/use-theme';
import { EmptyState, ListeAnalyses, PageEcran, SectionEcran, type Lecture } from '../../ui';
import { sansEtablissement } from '../sans-etablissement';
import { TITRE_ECRAN } from '../titres';
import { FormulaireCreancier, type CreancierAffiche } from './creancier';
import { FormulaireEtablissement, type EtablissementAffiche } from './etablissement';
import { SectionFacturation, type AbonnementAffiche } from './facturation';
import { SectionEquipe, type EquipeAffichee } from './equipe';
import { SectionDonnees, type DonneesAffichees } from './donnees';
import { SectionIntervenants, type IntervenantsAffiches } from './intervenants';
import { SectionMesures, type MesuresAffichees } from './mesures';

/**
 * VOTRE COMPTE — six sections dépliées, une repliée, zéro sous-route.
 *
 * ⚠️ LA SEPTIÈME EST REPLIÉE, ET C'EST LA SEULE. « Ce que la file propose »
 * porte les trois nombres qui déplaceront le plafond de propositions (D13) :
 * c'est un instrument, pas un réglage. Il vit ici parce qu'il n'a pas d'écran à
 * lui et n'en mérite pas ; il est replié parce que le gérant n'a rien à y
 * décider, et déplié il repousserait vers le bas les six sections qui, elles,
 * se règlent.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TREIZE ADRESSES DEVIENNENT UNE PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elles vivaient derrière un avatar sans libellé, en arbre : un hub
 * (`/app/parametres`) qui poussait vers cinq sections, dont trois poussaient
 * elles-mêmes vers des pages de détail. Soit 44 % des écrans du produit et
 * 3 334 lignes sur 8 660, pour des réglages qu'on ouvre deux fois par an.
 *
 * Un réglage ne se cherche pas : il se trouve en faisant défiler. Les six
 * sections sont donc DÉPLIÉES, dans l'ordre où on en a besoin — ce qui
 * s'imprime sur un décompte, ce qu'on paie, qui accède, ce qu'on détient, qui
 * fait l'acte, comment l'écran se peint et comment on en sort.
 *
 * ⚠️ « AFFICHAGE ET SESSION » EXISTE PARCE QUE DEUX CHOSES LIVRÉES N'AVAIENT
 * PLUS D'ADRESSE. Le `Segmented` Automatique / Sombre / Clair et la
 * déconnexion vivaient sur l'écran de réglages que cette page remplace. **Une
 * application dont on ne peut pas sortir n'est pas une simplification.**
 *
 * ⚠️ ET L'IDENTITÉ DU CRÉANCIER RESTE EN ÉDITION, ce qui n'est pas une
 * commodité. La dénomination, le SIREN et l'adresse s'impriment sur CHAQUE
 * décompte, c'est-à-dire sur la pièce que lit un tiers. Une adresse change
 * quand l'entreprise déménage, un SIREN quand elle se restructure, et ni l'un
 * ni l'autre ne bloque un chiffre : le décompte continue de se produire, avec
 * une identité périmée, sans qu'aucune alerte n'apparaisse jamais. La file est
 * le chemin PROACTIF, cette section est le chemin CORRECTIF, et un produit dont
 * la sortie est opposable a besoin des deux.
 *
 * ⚠️ CHAQUE SECTION PORTE SA PROPRE LECTURE. Attendre que la facturation,
 * l'équipe, l'inventaire et le carnet aient tous répondu pour peindre la page
 * ferait plusieurs centaines de millisecondes d'écran vide pour corriger une
 * adresse. Tant qu'une lecture court, sa section le DIT — jamais « 0 membre »
 * ni « Aucun abonnement », qui se lisent comme des réponses (règle d'écran
 * n° 4).
 */
export interface CompteAffiche {
	/** L'établissement actif, ou `null` : la coquille `/app` renvoie alors vers `/bienvenue`. */
	readonly etablissement: EtablissementAffiche | null;
	readonly creancier: CreancierAffiche;
	readonly abonnement: Lecture<AbonnementAffiche | null>;
	readonly equipe: Lecture<EquipeAffichee>;
	readonly donnees: Lecture<DonneesAffichees>;
	readonly intervenants: Lecture<IntervenantsAffiches>;
	/**
	 * L'instrument du plafond de propositions (D13).
	 *
	 * ⚠️ IL EST DANS `CompteAffiche` ET PAS DANS UN ÉCRAN À LUI, parce qu'un
	 * écran d'instrumentation est un écran qu'on ouvre pour l'admirer. Il vit
	 * replié, au bas d'une page de réglages, exactement au poids qu'il vaut.
	 */
	readonly mesures: Lecture<MesuresAffichees>;
	readonly theme: Theme;
	readonly onChoisirTheme: (theme: Theme) => void;
	readonly onSeDeconnecter: () => void;
}

export function EcranCompte({ donnees }: { donnees: Lecture<CompteAffiche> }) {
	const entete = {
		genre: 'onglet',
		titre: TITRE_ECRAN.compte,
		sousTitre:
			donnees.etat === 'pret' ? (donnees.valeur.etablissement?.nom ?? undefined) : undefined
	} as const;

	if (donnees.etat !== 'pret') {
		return <PageEcran entete={entete} etat={donnees.etat} />;
	}

	const pret = donnees.valeur;

	return (
		<PageEcran entete={entete}>
			<SectionEtablissement etablissement={pret.etablissement} creancier={pret.creancier} />

			<AvecLaLecture lecture={pret.abonnement} titre="Facturation">
				{(abonnement) => <SectionFacturation abonnement={abonnement} />}
			</AvecLaLecture>

			<AvecLaLecture lecture={pret.equipe} titre="Équipe">
				{(equipe) => <SectionEquipe {...equipe} />}
			</AvecLaLecture>

			<AvecLaLecture lecture={pret.donnees} titre="Vos données">
				{(vos) => <SectionDonnees {...vos} />}
			</AvecLaLecture>

			<AvecLaLecture lecture={pret.intervenants} titre="Votre carnet">
				{(carnet) => <SectionIntervenants {...carnet} />}
			</AvecLaLecture>

			<AvecLaLecture lecture={pret.mesures} titre="Ce que la file propose">
				{(mesures) => <SectionMesures {...mesures} />}
			</AvecLaLecture>

			<SectionAffichageEtSession
				theme={pret.theme}
				onChoisirTheme={pret.onChoisirTheme}
				onSeDeconnecter={pret.onSeDeconnecter}
			/>
		</PageEcran>
	);
}

/**
 * UNE SECTION QUI ATTEND SA PROPRE LECTURE.
 *
 * ⚠️ ELLE GARDE SON TITRE PENDANT L'ATTENTE, et c'est ce qui fait qu'une page à
 * six sections ne saute pas quand la quatrième arrive : la carte est là, sa
 * hauteur bouge d'une ligne, et le gérant qui défilait ne perd pas sa place.
 *
 * ⚠️ ET L'ATTENTE SE LIT, y compris par un lecteur d'écran. `role="status"` sur
 * une ligne visible, jamais un `sr-only` seul : un texte que personne ne voit
 * annonce une section que personne ne voit se construire.
 */
function AvecLaLecture<T>({
	lecture,
	titre,
	children
}: {
	lecture: Lecture<T>;
	titre: string;
	children: (valeur: T) => ReactNode;
}) {
	if (lecture.etat === 'pret') return <>{children(lecture.valeur)}</>;

	return (
		<SectionEcran titre={titre}>
			{lecture.etat === 'attente' ? (
				<p role="status" className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Lecture en cours…
				</p>
			) : (
				<p role="alert" className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Cette section n’a pas pu s’afficher. Rien de ce qui est enregistré n’est touché par cet
					échec ; le reste de la page reste utilisable.
				</p>
			)}
		</SectionEcran>
	);
}

/**
 * VOTRE ÉTABLISSEMENT — ce qu'il déclare, et ce qui s'imprime sur un décompte.
 *
 * ⚠️ LES DEUX FORMULAIRES SONT DANS LA MÊME SECTION, ET PAS DANS DEUX. Le nom
 * et le volume disent qui déclare ; la dénomination, le SIREN et l'adresse
 * disent ce qu'un tiers lit en tête d'un décompte. Ce sont deux facettes du même
 * sujet, et les séparer ferait à nouveau deux adresses pour une entreprise.
 */
function SectionEtablissement({
	etablissement,
	creancier
}: {
	etablissement: EtablissementAffiche | null;
	creancier: CreancierAffiche;
}) {
	return (
		<SectionEcran titre="Votre établissement">
			{etablissement === null ? (
				<EmptyState {...sansEtablissement('Créez-en un pour le régler.').vide} />
			) : (
				<>
					<FormulaireEtablissement
						key={etablissement.cle}
						initial={etablissement.initial}
						mesure={etablissement.mesure}
						onEnregistrer={etablissement.onEnregistrer}
					/>

					<SectionTitle>Votre entreprise sur un décompte</SectionTitle>
					<FormulaireCreancier
						key={creancier.cle}
						initial={creancier.initial}
						nomEtablissement={creancier.nomEtablissement}
						onChercherAuRegistre={creancier.onChercherAuRegistre}
						onEnregistrer={creancier.onEnregistrer}
					/>
				</>
			)}
		</SectionEcran>
	);
}

/**
 * AFFICHAGE ET SESSION.
 *
 * ⚠️ TROIS ÉTATS EXCLUSIFS : c'est un `Segmented`, pas un bouton qui annonce la
 * bascule. « Passer en sombre » oblige à déduire l'état courant depuis l'action
 * proposée, ce qui se lit à l'envers. « Automatique » est le défaut, et il ne se
 * justifie pas à l'écran.
 */
function SectionAffichageEtSession({
	theme,
	onChoisirTheme,
	onSeDeconnecter
}: {
	theme: Theme;
	onChoisirTheme: (theme: Theme) => void;
	onSeDeconnecter: () => void;
}) {
	return (
		<SectionEcran titre="Affichage et session">
			<ListeAnalyses>
				<ListItem className="flex flex-wrap items-center gap-cladd-3xs">
					<span className="text-cladd-fg-soft">Apparence</span>
					<Segmented className="ml-auto" activeColor="neutral" activeVariant="solid">
						<SegmentedButton active={theme === 'auto'} onClick={() => onChoisirTheme('auto')}>
							<MonitorIcon />
							Automatique
						</SegmentedButton>
						<SegmentedButton active={theme === 'dark'} onClick={() => onChoisirTheme('dark')}>
							<MoonIcon />
							Sombre
						</SegmentedButton>
						<SegmentedButton active={theme === 'light'} onClick={() => onChoisirTheme('light')}>
							<SunIcon />
							Clair
						</SegmentedButton>
					</Segmented>
				</ListItem>
				{/* La rangée du kit, sans chevron : elle ne pousse aucune page. */}
				<ListButton
					icon={<LogOutIcon />}
					className="verre-bouton"
					hoverable={false}
					onClick={onSeDeconnecter}
				>
					Se déconnecter
				</ListButton>
			</ListeAnalyses>
		</SectionEcran>
	);
}
