import type { ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { List, ListItem, Surface } from '@cladd-ui/react';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { cn } from './cn';
import { EmptyState } from './empty-state';
import { EnteteDetail } from './navigation';
import { Page, PageBody, PageHeader } from './page';
import { TwoPane } from './two-pane';

/**
 * LA COQUILLE D'UN ÉCRAN : SON EN-TÊTE, SA LARGEUR, ET CE QUI S'AFFICHE QUAND
 * LE CONTENU N'EST PAS LÀ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI ELLE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Vingt-huit écrans rejouaient `Page`, leur en-tête et leur `PageBody` à la
 * main. Onze d'entre eux annonçaient leur chargement par un paragraphe
 * `sr-only`, lisible par un lecteur d'écran et invisible pour tous les autres :
 * le gérant voyait un corps vide, et croyait l'écran cassé. Aucun ne savait
 * s'afficher en erreur, et vingt-et-un posaient la même colonne recopiée.
 *
 * Une règle tenue à vingt-huit endroits se perd au vingt-neuvième. Elle se
 * tient ici, à un seul.
 */

/**
 * CE QU'UN ÉCRAN REÇOIT : SA LECTURE.
 *
 * ⚠️ TROIS ÉTATS, ET AUCUN N'EST FACULTATIF. Un écran qui recevait « la donnée,
 * ou `undefined` » oubliait l'erreur à chaque fois ; celui qui reçoit ce type ne
 * compile pas sans décider quoi montrer dans les trois cas.
 *
 * Tout ce dont l'écran n'a besoin qu'une fois prêt voyage dans `valeur`,
 * gestionnaires compris : un écran en erreur n'a rien à déclencher.
 */
export type Lecture<T> =
	| { readonly etat: 'attente' }
	| { readonly etat: 'erreur' }
	| { readonly etat: 'pret'; readonly valeur: T };

/** Le retour d'une page poussée : où il mène, et le nom qu'il porte. */
export interface RetourEcran {
	readonly vers: LinkProps['to'];
	readonly parametres?: LinkProps['params'];
	/** La sélection à rendre au retour, comme `?d=` sur les débiteurs. */
	readonly recherche?: LinkProps['search'];
	readonly libelle: string;
}

/**
 * LES TROIS GENRES D'EN-TÊTE.
 *
 * `onglet` : un écran qu'on atteint par la barre, titre et actions. `poussee` :
 * une page de détail, avec son retour. `aucun` : l'accueil, dont le hero porte
 * lui-même le dégagement de la barre flottante.
 */
export type EnteteEcran =
	| {
			readonly genre: 'onglet';
			readonly titre: string;
			readonly sousTitre?: string;
			readonly actions?: ReactNode;
	  }
	| {
			readonly genre: 'poussee';
			readonly retour: RetourEcran;
			readonly titre: string;
			readonly sousTitre?: string;
	  }
	| { readonly genre: 'aucun' };

/** Ce que dit un écran vide. Règle d'écran n° 4 : il montre le chemin. */
export interface VideEcran {
	readonly illustration?: string;
	readonly titre: string;
	readonly explication: string;
	readonly etapes?: readonly string[];
	readonly action?: ReactNode;
}

export type EtatEcran = 'pret' | 'attente' | 'erreur' | { readonly vide: VideEcran };

/** La liste à gauche, la preuve à droite. Voir `TwoPane`. */
export interface VoletsEcran {
	readonly liste: ReactNode;
	readonly preuve: ReactNode;
	readonly preuveOuverte: boolean;
	readonly onFermerPreuve: () => void;
}

/** Assez pour lire « une liste arrive », pas assez pour annoncer combien. */
const RANGEES_D_ATTENTE = 4;

export function PageEcran({
	entete,
	etat = 'pret',
	issue,
	volets,
	children
}: {
	entete: EnteteEcran;
	etat?: EtatEcran;
	/** L'issue de l'état d'erreur. Par défaut, l'accueil. */
	issue?: ReactNode;
	/** Les deux volets, à la place de la colonne. Ignoré tant que l'écran n'est pas prêt. */
	volets?: VoletsEcran;
	children?: ReactNode;
}) {
	const sansEntete = entete.genre === 'aucun';

	return (
		<Page>
			<Entete entete={entete} />
			{etat === 'pret' && volets !== undefined ? (
				// `min-h-0 flex-1` : `TwoPane` se dimensionne en `h-full`, il lui faut
				// une hauteur à remplir sous l'en-tête, sans quoi les deux volets
				// débordent par le bas.
				<div className="min-h-0 flex-1">
					<TwoPane
						liste={volets.liste}
						preuve={volets.preuve}
						preuveOuverte={volets.preuveOuverte}
						onFermerPreuve={volets.onFermerPreuve}
					/>
				</div>
			) : (
				<PageBody>
					{etat === 'pret' ? (
						<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">{children}</div>
					) : etat === 'attente' ? (
						<Attente sansEntete={sansEntete} />
					) : etat === 'erreur' ? (
						<Erreur sansEntete={sansEntete} issue={issue} />
					) : (
						<EmptyState {...etat.vide} />
					)}
				</PageBody>
			)}
		</Page>
	);
}

function Entete({ entete }: { entete: EnteteEcran }) {
	if (entete.genre === 'aucun') return null;
	if (entete.genre === 'onglet') {
		return (
			<PageHeader titre={entete.titre} sousTitre={entete.sousTitre} actions={entete.actions} />
		);
	}
	return (
		<EnteteDetail
			retourVers={entete.retour.vers}
			retourParametres={entete.retour.parametres}
			retourRecherche={entete.retour.recherche}
			retourLibelle={entete.retour.libelle}
			titre={entete.titre}
			sousTitre={entete.sousTitre}
		/>
	);
}

/**
 * L'ATTENTE : LE SQUELETTE DE LA VRAIE PAGE.
 *
 * ⚠️ `aria-busy` SUR LA ZONE QUI CHARGE, JAMAIS UN PARAGRAPHE `sr-only` SEUL.
 * Les rangées de substitution sont masquées aux lecteurs d'écran : elles ne
 * disent rien, et l'en-tête reste lisible au-dessus.
 *
 * ⚠️ `List` ET `ListItem`, PAS DES `div` STYLÉS. Les rangées d'attente prennent
 * ainsi le rythme vertical exact des vraies rangées : la page ne saute pas
 * quand le contenu arrive.
 */
function Attente({ sansEntete }: { sansEntete: boolean }) {
	return (
		<div
			aria-busy="true"
			className={cn('mx-auto flex w-full max-w-2xl flex-col', sansEntete && 'pt-barre-app')}
		>
			<div aria-hidden="true">
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="p-0"
				>
					<List>
						{Array.from({ length: RANGEES_D_ATTENTE }, (_, rang) => (
							<ListItem key={rang}>
								<span className="size-5 shrink-0 rounded-full bg-cladd-fg/10 motion-safe:animate-pulse" />
								<span className="h-3 w-2/5 rounded-full bg-cladd-fg/10 motion-safe:animate-pulse" />
								<span className="ml-auto h-3 w-1/6 rounded-full bg-cladd-fg/10 motion-safe:animate-pulse" />
							</ListItem>
						))}
					</List>
				</Surface>
			</div>
		</div>
	);
}

/**
 * L'ERREUR : L'EN-TÊTE RESTE, L'ISSUE PASSE AVANT LE RECHARGEMENT.
 *
 * ⚠️ RECHARGER N'EST JAMAIS LA SEULE SORTIE. Sur un lien de créance périmé,
 * recharger refait l'erreur à l'identique. L'issue principale mène ailleurs ;
 * le rechargement reste possible, en second, pour la panne passagère.
 */
function Erreur({ sansEntete, issue }: { sansEntete: boolean; issue: ReactNode }) {
	return (
		<div
			role="alert"
			className={cn(
				'mx-auto flex w-full max-w-2xl flex-col items-start gap-cladd-3xs',
				sansEntete && 'pt-barre-app'
			)}
		>
			<h2 className="text-cladd-md font-semibold">Cet écran n’a pas pu s’afficher.</h2>
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Vos créances et vos décomptes sont intacts : c’est l’affichage qui a échoué, pas la mesure.
			</p>
			{issue ?? (
				<BoutonPrincipal as={Link} to="/app">
					Revenir à l’accueil
				</BoutonPrincipal>
			)}
			<BoutonSecondaire onClick={() => window.location.reload()}>
				Recharger la page
			</BoutonSecondaire>
		</div>
	);
}
