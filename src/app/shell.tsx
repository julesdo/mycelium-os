import { useState, type CSSProperties, type ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { Fond } from '../ui/fond';
import { cn } from '../ui/cn';
import { BarreBranchee } from './barre';
import { CompagnonBranche } from './compagnon';
import { useCodeEnAvance } from './code-en-avance';
import { HauteBranchee, LateraleBranchee } from './coquille-bureau';
import { FournisseurDuTitreBureau, LARGEUR_LATERALE } from '../ui/coquille-bureau';
import { usePreference } from './use-preference';
import { useInvitationInstallation } from './installation';
import { InvitationInstallation } from '../ui/invitation-installation';

/**
 * Le cadre de l'application authentifiée.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LA BARRE DU BAS EST REVENUE, ET SA SUPPRESSION ÉTAIT L'ERREUR
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La coquille portait une barre haute flottante et une barre basse de quatre
 * onglets. `ceaf8ce` a retiré les deux, au motif que le produit n'avait plus
 * qu'un écran de travail. L'argument tenait pour la barre HAUTE — huit cibles de
 * même poids, dont aucune ne disait quoi faire — et pas une seconde pour la
 * BASSE : `/app/debiteurs`, `/app/procedures` et `/app/compte` existent
 * toujours, et il ne restait AUCUN chemin vers eux au pouce. Le terrain l'a
 * nommé le jour même.
 *
 * La barre basse est donc de retour, dans son dessin d'origine — le bloc de
 * verre qui glisse, le faisceau lent sur l'onglet actif, le report du
 * `safe-area` — et le compagnon flotte au-dessus d'elle.
 *
 * Ce que la barre HAUTE portait et qui restait utile — l'avatar, le veilleur, la
 * palette de recherche et le sélecteur d'établissement — reste dans la `Toolbar`
 * de la file : ce ne sont pas des destinations, et une navigation dit où l'on
 * est, pas ce qu'on peut faire.
 *
 * ⚠️ LES DEUX SONT MONTÉS ICI, UNE SEULE FOIS. Montés par écran, ils se
 * dupliqueraient à chaque page poussée et se remonteraient à chaque navigation :
 * le bloc de verre repartirait de zéro au lieu de glisser, et le halo
 * recommencerait son cycle à chaque changement d'onglet.
 *
 * ⚠️ ET LE DÉGAGEMENT DU BAS LEUR APPARTIENT, MAIS IL N'EST PAS POSÉ ICI. Un
 * élément hors du flux ne réserve aucune place ; le dégagement vit dans les
 * conteneurs qui DÉFILENT — `PageBody` et les deux volets de `TwoPane` —, pas
 * dans leur cadre. Posé sur `main`, il serait HORS du conteneur qui défile : la
 * zone visible s'arrêterait au-dessus de la barre, plus rien ne passerait
 * derrière, le flou n'aurait plus rien à flouter et il ne resterait qu'une bande
 * noire morte. Le défaut a existé, et il ne se voyait qu'à l'écran.
 *
 * ⚠️ FIXÉE SUR L'ÉCRAN, PAS HAUTE DE `100dvh` (13/10/2026). Elle était `h-dvh`
 * dans une page haute de `100%`. Sur un téléphone Android, application installée,
 * les deux ne tombent pas toujours sur la même hauteur : la coquille dépassait de
 * la page, la page devenait défilable, et arrivé en bas d'un écran le doigt
 * faisait défiler LA PAGE ENTIÈRE — la barre du haut partait avec elle, et il
 * fallait remonter pour la retrouver (relevé par le fondateur sur son téléphone).
 * `fixed inset-0` épouse l'écran quelle que soit la façon dont le navigateur le
 * mesure, et ne donne aucune hauteur à la page ; `coquille-app` lui interdit en plus
 * de défiler (`app.css`).
 *
 * ⚠️ AU-DELÀ DE 1024 PX, UNE COQUILLE DE BUREAU (14/10/2026). Le fondateur :
 * « l'expérience desktop n'est pas du tout adaptée à la souris […] une sidebar et
 * une top bar ». La barre latérale et la barre du haut (`coquille-bureau.tsx`) sont
 * montées ici, une fois, comme la barre du bas ; elles sont `hidden lg:flex`, et le
 * téléphone ne voit ni elles ni l'enveloppe qui les range. Au bureau, la pilule
 * d'onglets s'efface et Plume reste dans le coin bas droit.
 */
export function Shell({
	children,
	sessionOuverte = true,
	dansLaSalle = false
}: {
	children: ReactNode;
	/**
	 * La salle d'exposition pose sa rangée de boutons AU-DESSUS de la coquille : elle
	 * la veut dans le flux, sous cette rangée, et pas fixée sur tout l'écran.
	 */
	dansLaSalle?: boolean;
	/**
	 * ⚠️ LA COQUILLE SE MONTE AVANT LA SESSION, ET NE SE REMONTE PLUS (09/10/2026).
	 * L'ouverture affichait deux lignes de texte l'une après l'autre (« Ouverture de
	 * votre espace… », « Chargement de votre établissement… »), puis le fond, la
	 * barre et l'écran d'un coup. Le fond et la barre sont désormais là dès le
	 * premier affichage — rendu serveur compris —, un squelette au milieu ; quand la
	 * session s'ouvre, seul le milieu change.
	 */
	sessionOuverte?: boolean;
}) {
	// Le code des écrans les plus ouverts se charge au repos, une fois la session là.
	useCodeEnAvance(sessionOuverte);
	// L'emplacement du titre dans la barre du haut du bureau : posé par une référence,
	// jamais dans un effet ; les pages y écrivent par un portail (`TitreBureau`).
	const [emplacementDuTitre, setEmplacementDuTitre] = useState<HTMLElement | null>(null);
	// La barre latérale du bureau, ouverte ou en rail ; le choix se garde d'une visite à l'autre.
	const [laterale, setLaterale] = usePreference('letikette:barre-laterale', 'ouverte', [
		'ouverte',
		'reduite'
	] as const);
	return (
		<FournisseurDuTitreBureau value={emplacementDuTitre}>
			<div
				className={cn(
					'flex flex-col overflow-hidden lg:flex-row',
					dansLaSalle ? 'relative h-full w-full' : 'coquille-app fixed inset-0'
				)}
				// La largeur de la barre latérale, lue par elle et par ce qui est fixé sur l'écran.
				style={{ '--largeur-laterale': LARGEUR_LATERALE[laterale] } as CSSProperties}
			>
				{/* Le drapé, une fois, derrière tous les écrans. C'est lui qui donne au
			    verre des cartes et des barres quelque chose à réfracter — sans lui,
			    chaque translucidité retombe sur un aplat un peu plus clair. */}
				<Fond />

				<LateraleBranchee
					auRepos={!sessionOuverte}
					reduite={laterale === 'reduite'}
					onBasculer={() => setLaterale(laterale === 'reduite' ? 'ouverte' : 'reduite')}
				/>

				{/* Sous 1024 px, cette enveloppe ne porte que `main` : la barre du haut ne
			    s'affiche pas, et `main` y prend toute la hauteur comme avant. */}
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<HauteBranchee auRepos={!sessionOuverte} refTitre={setEmplacementDuTitre} />
					<main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
				</div>

				{/* Plume se pose DANS la barre, à droite de la pilule ; au bureau, dans le coin. */}
				<BarreSaufEnConversation sessionOuverte={sessionOuverte} />

				{/* Sur Android, l'invitation à installer l'application, quand elle ne l'est pas. */}
				<InvitationBranchee actif={sessionOuverte} />
			</div>
		</FournisseurDuTitreBureau>
	);
}

/** L'invitation à installer, quand Chrome en fait l'offre et qu'on ne l'a pas écartée. */
function InvitationBranchee({ actif }: { readonly actif: boolean }) {
	const { montrer, installer, plusTard } = useInvitationInstallation(actif);
	return montrer ? <InvitationInstallation onInstaller={installer} onPlusTard={plusTard} /> : null;
}

/**
 * ⚠️ PAS DE BARRE D'ONGLETS DANS UNE CONVERSATION AVEC PLUME, NI PENDANT UN
 * DÉMARRAGE GUIDÉ : le compositeur, ou les réponses, prennent sa place, comme
 * chez Claude et Alan. Le retour rond de l'en-tête ramène d'où l'on vient.
 */
function BarreSaufEnConversation({ sessionOuverte }: { readonly sessionOuverte: boolean }) {
	const enConversation = useRouterState({
		select: (etat) =>
			etat.location.pathname.startsWith('/app/pilote') ||
			etat.location.pathname.startsWith('/app/demarrer') ||
			// L'Aide a son propre Plume : deux Plume sur un écran se contrediraient.
			etat.location.pathname.startsWith('/app/aide')
	});
	if (enConversation) return null;
	return (
		<CompagnonBranche auRepos={!sessionOuverte}>
			{(bouton, capsule) => (
				<BarreBranchee accessoire={bouton} auDessus={capsule} auRepos={!sessionOuverte} />
			)}
		</CompagnonBranche>
	);
}
