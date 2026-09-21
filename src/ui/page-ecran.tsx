import type { ComponentProps, ReactNode } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import { ListItem } from '@cladd-ui/react';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { cn } from './cn';
import { EmptyState } from './empty-state';
import { Lien, TitreEcran } from './lien';
import { EnteteDetail, ListeAnalyses } from './navigation';
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
	/**
	 * ⚠️ `NonNullable`, PAS `LinkProps['to']` SEUL. Avec ses génériques par défaut,
	 * `to` est facultatif chez le routeur : le type laissait passer un retour qui
	 * ne mène nulle part.
	 */
	readonly vers: NonNullable<LinkProps['to']>;
	readonly parametres?: LinkProps['params'];
	/** La sélection à rendre au retour, comme `?d=` sur les débiteurs. */
	readonly recherche?: LinkProps['search'];
	readonly libelle: string;
	/**
	 * Vrai quand la page s'ouvre dans le volet droit d'un maître qui montre déjà
	 * sa destination : à partir de 1024 px, le retour mènerait à ce qui est
	 * affiché juste à gauche. Faux quand la page REMPLACE un détail devenu
	 * invisible (l'habitude d'un débiteur remplace sa fiche) : le retour reste.
	 */
	readonly masqueEnVolets?: boolean;
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
			/**
			 * Facultatif. Sans lui, la rangée d'outils occupe seule la barre du haut et
			 * remonte de 64px — le dégagement n'a plus de titre à dégager.
			 */
			readonly titre?: string;
			readonly sousTitre?: string;
			readonly actions?: ReactNode;
	  }
	| {
			readonly genre: 'poussee';
			readonly retour: RetourEcran;
			readonly titre: string;
			readonly sousTitre?: string;
	  }
	| {
			readonly genre: 'aucun';
			/**
			 * Jamais dessiné : le hero en tient lieu. Publié quand même, pour que la
			 * page ouverte d'ici dise « Accueil » sur son retour.
			 */
			readonly titre: string;
	  };

/**
 * Ce que dit un écran vide. Règle d'écran n° 4 : il montre le chemin.
 *
 * Les props d'`EmptyState` elles-mêmes, et pas une copie : une copie dérive au
 * premier ajout, sans qu'aucun test ne tombe.
 */
export type VideEcran = ComponentProps<typeof EmptyState>;

export type EtatEcran = Lecture<unknown>['etat'] | { readonly vide: VideEcran };

/** La liste à gauche, la preuve à droite. Voir `TwoPane`. */
export interface VoletsEcran {
	readonly liste: ReactNode;
	readonly preuve: ReactNode;
	readonly preuveOuverte: boolean;
	readonly onFermerPreuve: () => void;
}

/**
 * LE CORPS D'UN ÉCRAN : UNE COLONNE, OU DEUX VOLETS.
 *
 * ⚠️ UN ÉCRAN À DEUX VOLETS LE DIT DÈS L'ATTENTE. Un écran ne construit
 * d'ordinaire ses `volets` qu'une fois les données arrivées. Sans
 * `disposition="volets"`, l'attente se dessinait en colonne de lecture, puis la
 * page sautait en liste pleine largeur et volet de preuve à l'arrivée des
 * données, sur la largeur de référence du produit.
 *
 * ⚠️ `children` ET `volets` S'EXCLUENT, ET LE TYPE LE DIT. Un enfant passé à
 * côté des volets disparaissait sans erreur.
 */
type CorpsEcran =
	| {
			readonly volets: VoletsEcran;
			/** Redondant avec `volets`, et toléré : un écran peut garder la même disposition dans tous ses états. */
			readonly disposition?: 'volets';
			readonly children?: never;
	  }
	| {
			readonly volets?: undefined;
			/**
			 * Ne façonne QUE l'attente. Prêt, un écran à deux volets passe `volets` ;
			 * le vide et l'erreur, eux, se lisent en colonne.
			 */
			readonly disposition?: 'colonne' | 'volets';
			readonly children?: ReactNode;
	  };

/** Assez pour lire « une liste arrive », pas assez pour annoncer combien. */
const RANGEES_D_ATTENTE = 4;

type ProprietesEcran = {
	entete: EnteteEcran;
	etat?: EtatEcran;
	/** L'issue de l'état d'erreur. Absente ou `null` : l'accueil pour un onglet, la seule pastille de retour pour une page poussée. */
	issue?: ReactNode;
} & CorpsEcran;

/**
 * ⚠️ L'ÉCRAN PUBLIE SON TITRE AUTOUR DE TOUT CE QU'IL REND. Les liens de
 * l'en-tête, de la liste, du volet de preuve et de sa feuille le lisent
 * (`Lien`), et la page qu'ils ouvrent le relit sur son retour. C'est le titre
 * de l'écran, jamais l'élément choisi : la créance ouverte depuis le volet d'un
 * débiteur revient à « Vos débiteurs », le nom que la liste porte après un
 * rechargement aussi.
 */
export function PageEcran(proprietes: ProprietesEcran) {
	return (
		<TitreEcran value={proprietes.entete.titre ?? null}>
			<CorpsPageEcran {...proprietes} />
		</TitreEcran>
	);
}

function CorpsPageEcran({
	entete,
	etat = 'pret',
	issue,
	volets,
	disposition,
	children
}: ProprietesEcran) {
	const sansEntete = entete.genre === 'aucun';

	if (etat === 'pret' && volets !== undefined) {
		return (
			<Page>
				{/* Hors du conteneur qui défile : cet habillage rend la gouttière que la barre
				    reprend par sa marge négative, sinon ses outils toucheraient le bord. */}
				<div className="px-cladd-3xs">
					<Entete entete={entete} donneesPretes />
				</div>
				<Volets
					liste={volets.liste}
					preuve={volets.preuve}
					preuveOuverte={volets.preuveOuverte}
					onFermerPreuve={volets.onFermerPreuve}
				/>
			</Page>
		);
	}

	if (etat === 'attente' && (volets !== undefined || disposition === 'volets')) {
		return (
			<Page>
				<div className="px-cladd-3xs">
					<Entete entete={entete} donneesPretes={false} />
				</div>
				<Volets
					liste={
						<PageBody>
							<Attente sansEntete={sansEntete} pleineLargeur />
						</PageBody>
					}
					preuve={null}
				/>
			</Page>
		);
	}

	/*
	  ⚠️ L'EN-TÊTE EST DANS `PageBody`, PAS À CÔTÉ — et c'est ce qui fait passer le
	  contenu dessous. Posé en frère de `PageBody`, il occupait sa propre bande :
	  la zone visible commençait sous lui, plus rien ne glissait derrière, et son
	  verre n'avait rien à flouter. C'est le raisonnement exact du dégagement bas
	  de la barre de navigation, écrit juste en dessous — même piège, même remède.
	*/
	return (
		<Page>
			<PageBody>
				<Entete entete={entete} donneesPretes={etat === 'pret'} />
				{etat === 'pret' ? (
					<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">{children}</div>
				) : etat === 'attente' ? (
					<Attente sansEntete={sansEntete} pleineLargeur={false} />
				) : etat === 'erreur' ? (
					<Erreur sansEntete={sansEntete} poussee={entete.genre === 'poussee'} issue={issue} />
				) : (
					// Le vide et l'erreur REMPLACENT l'écran de travail : ils se lisent
					// seuls, en colonne, même sur un écran à deux volets.
					<EmptyState {...etat.vide} />
				)}
			</PageBody>
		</Page>
	);
}

function Entete({ entete, donneesPretes }: { entete: EnteteEcran; donneesPretes: boolean }) {
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
			retourMasqueEnVolets={entete.retour.masqueEnVolets}
			donneesPretes={donneesPretes}
			titre={entete.titre}
			sousTitre={entete.sousTitre}
		/>
	);
}

/**
 * LES DEUX VOLETS, SOUS L'EN-TÊTE.
 *
 * `min-h-0 flex-1` : `TwoPane` se dimensionne en `h-full`, il lui faut une
 * hauteur à remplir sous l'en-tête, sans quoi les deux volets débordent par le
 * bas.
 */
function Volets(props: ComponentProps<typeof TwoPane>) {
	return (
		<div className="min-h-0 flex-1">
			<TwoPane {...props} />
		</div>
	);
}

/**
 * L'ATTENTE : LE SQUELETTE DE LA PAGE, ET UNE PHRASE QUI LE DIT.
 *
 * ⚠️ `aria-busy` SEUL NE DIT RIEN. La zone qui le porte disparaît quand le
 * contenu arrive, sans jamais être passée à `false` : un lecteur d'écran lisait
 * le titre, puis rien, et rien du tout sur l'accueil, qui n'a pas de titre.
 *
 * Le statut « Chargement de l’écran… » est le seul texte de l'attente, et il
 * n'est pas SEUL : le squelette se voit juste dessous. C'est la différence avec
 * les paragraphes `sr-only` d'avant, qui annonçaient une page que personne ne
 * voyait se construire.
 *
 * ⚠️ IL EST À CÔTÉ DE LA ZONE OCCUPÉE, PAS DEDANS. Une technologie d'assistance
 * peut retenir ce qui change dans une zone `aria-busy` tant qu'elle l'est. Il se
 * trouve en lisant la page ; qu'il soit annoncé de lui-même à son apparition
 * n'est pas garanti, et ne le serait qu'avec une région vivante permanente dans
 * la coquille de l'application.
 *
 * ⚠️ LA MÊME CARTE QUE LES LISTES DU PRODUIT. Les rangées de substitution vivent
 * dans `ListeAnalyses`, pour que la page change peu quand le contenu arrive, et
 * prennent la largeur de la liste quand l'écran a deux volets. Elles respirent
 * au rythme `pouls`, celui des traitements en cours.
 */
function Attente({ sansEntete, pleineLargeur }: { sansEntete: boolean; pleineLargeur: boolean }) {
	return (
		<div
			className={cn(
				'flex w-full flex-col',
				!pleineLargeur && 'mx-auto max-w-2xl',
				sansEntete && 'pt-barre-app'
			)}
		>
			<p role="status" className="sr-only">
				Chargement de l’écran…
			</p>
			<div aria-busy="true" aria-hidden="true">
				<ListeAnalyses>
					{Array.from({ length: RANGEES_D_ATTENTE }, (_, rang) => (
						<ListItem key={rang}>
							<span className="size-5 shrink-0 animate-pouls rounded-full bg-cladd-fg/10" />
							<span className="h-3 w-2/5 animate-pouls rounded-full bg-cladd-fg/10" />
							<span className="ml-auto h-3 w-1/6 animate-pouls rounded-full bg-cladd-fg/10" />
						</ListItem>
					))}
				</ListeAnalyses>
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
 *
 * ⚠️ ELLE NE PROMET QUE CE QU'ELLE SAIT. Elle affirmait « c’est l’affichage qui
 * a échoué, pas la mesure » : l'écran n'en sait rien, la requête qui calcule la
 * mesure a pu échouer elle-même. Ce qui est sûr, c'est qu'un échec d'affichage
 * n'écrit rien.
 *
 * ⚠️ L'ALERTE NE PORTE QUE CE QUI S'EST PASSÉ. Les boutons placés dedans étaient
 * lus avec elle, comme une phrase de plus.
 *
 * ⚠️ UNE PAGE POUSSÉE A DÉJÀ SA SORTIE. Sa pastille de retour reste au-dessus de
 * l'erreur ; lui ajouter « Revenir à l'accueil » donnait deux sorties vers deux
 * destinations. Sans issue nommée, elle ne garde que le rechargement en second.
 */
function Erreur({
	sansEntete,
	poussee,
	issue
}: {
	sansEntete: boolean;
	poussee: boolean;
	issue: ReactNode;
}) {
	// Sans en-tête, sur l'accueil, ce titre est le seul de la page.
	const Titre = sansEntete ? 'h1' : 'h2';

	return (
		<div
			className={cn(
				'mx-auto flex w-full max-w-2xl flex-col items-start gap-cladd-3xs',
				sansEntete && 'pt-barre-app'
			)}
		>
			<div role="alert" className="flex flex-col gap-cladd-3xs">
				<Titre className="text-cladd-md font-semibold">Cet écran n’a pas pu s’afficher.</Titre>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Rien de ce qui est enregistré n’est touché par cet échec.
				</p>
			</div>
			{issue ??
				(poussee ? null : (
					<BoutonPrincipal as={Lien} to="/app">
						Revenir à l’accueil
					</BoutonPrincipal>
				))}
			<BoutonSecondaire onClick={() => window.location.reload()}>
				Recharger la page
			</BoutonSecondaire>
		</div>
	);
}
