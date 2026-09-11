import { Button, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LE QUESTIONNAIRE DE QUALIFICATION DE LITIGE — module 3.2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL REMPLACE, ET POURQUOI L'ÉCRAN LE FAISAIT MAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cet écran posait « Pouvez-vous confirmer le caractère certain de cette
 * créance ? » avec deux boutons, Oui et Non. Un gérant ne sait pas ce qu'est le
 * caractère certain — c'est une notion de droit — et il répondra « oui », parce
 * qu'il est convaincu qu'on lui doit cet argent. Ce « oui » ouvrait des
 * procédures sans débat contradictoire, où la moindre contestation met fin à
 * tout en laissant les frais engagés.
 *
 * On demande donc des FAITS, dont aucun ne suppose de savoir le droit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UNE QUESTION À LA FOIS, ET LA PORTÉE SOUS LA QUESTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Six questions empilées font un formulaire, qu'on parcourt en diagonale.
 * Une seule à la fois fait une décision, qu'on lit. Le compteur dit combien il
 * en reste, pour qu'on sache qu'on en voit le bout — sans lui, une question qui
 * en remplace une autre donne l'impression de ne pas avancer.
 *
 * La portée — ce que la réponse change — vit SOUS la question et pas dans une
 * aide au survol : sur téléphone il n'y a pas de survol, et c'est précisément
 * l'information qui évite de répondre au hasard.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUNE RÉPONSE N'EST MISE EN AVANT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les trois boutons sont identiques. Une pilule blanche sur « Non » suggérerait
 * la réponse qui arrange le produit — celle qui ouvre les procédures — et ce
 * questionnaire ne vaut que par la sincérité de ce qu'on y déclare.
 *
 * Et « Je ne sais pas » est une VRAIE réponse, au même rang que les deux
 * autres : elle laisse le critère ouvert, ce qui est l'issue juste. La forcer à
 * choisir entre oui et non produirait une déclaration fausse sur un dossier qui
 * part chez un tiers.
 */

export type ReponseFait = 'OUI' | 'NON' | 'INCONNU';

export interface QuestionLitige {
	readonly cle: string;
	readonly question: string;
	readonly portee: string;
}

export function QuestionnaireLitige({
	questions,
	constats,
	litigieux,
	onRepondre,
	enCours = false
}: {
	/** Ce qu'il reste à demander. Vide = le questionnaire est fini. */
	questions: readonly QuestionLitige[];
	/** Les constats du serveur, affichés MOT POUR MOT. */
	constats: readonly string[];
	litigieux: boolean;
	onRepondre: (cle: string, reponse: ReponseFait) => void;
	enCours?: boolean;
}) {
	const courante = questions[0];

	return (
		<div className="flex flex-col gap-cladd-3xs">
			{courante ? (
				<Surface
					// La clé remonte la question : changer de question REMONTE le
					// composant, ce qui coupe net toute animation de sortie sur l'ancien
					// libellé. Sans elle, React réutiliserait le nœud et le texte
					// changerait sous le doigt du lecteur, au milieu de sa phrase.
					key={courante.cle}
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
				>
					<div className="flex flex-col gap-1">
						<p className="text-cladd-sm leading-snug font-medium text-balance">
							{courante.question}
						</p>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{courante.portee}</p>
					</div>

					{/* Trois cibles de même poids, à 48 px. En colonne sous 380 px : trois
					    boutons côte à côte sur un petit téléphone tombent à 90 px de
					    large, et « Je ne sais pas » s'y coupe en trois lignes. */}
					<div className="flex flex-col gap-cladd-3xs min-[380px]:flex-row">
						<ReponseBouton
							onClick={() => onRepondre(courante.cle, 'OUI')}
							disabled={enCours}
							libelle="Oui"
						/>
						<ReponseBouton
							onClick={() => onRepondre(courante.cle, 'NON')}
							disabled={enCours}
							libelle="Non"
						/>
						<ReponseBouton
							onClick={() => onRepondre(courante.cle, 'INCONNU')}
							disabled={enCours}
							libelle="Je ne sais pas"
						/>
					</div>

					{questions.length > 1 ? (
						<p className="text-cladd-2xs text-cladd-fg-softest">
							{questions.length} questions restantes
						</p>
					) : null}
				</Surface>
			) : null}

			{constats.length > 0 ? (
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					{constats.map((constat, rang) => (
						<p
							key={constat}
							className={cn(
								'flex items-start gap-1.5 text-cladd-2xs leading-relaxed',
								// Le premier constat porte l'essentiel ; les suivants
								// l'expliquent. Une seule graduation, pas une couleur : le vert,
								// l'ambre et le rouge ne disent qu'une chose dans ce produit, et
								// ce n'est pas ça.
								rang === 0 ? 'text-cladd-fg-soft' : 'text-cladd-fg-softer'
							)}
						>
							{rang === 0 && litigieux ? (
								<AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
							) : null}
							{constat}
						</p>
					))}
				</Surface>
			) : null}
		</div>
	);
}

/**
 * Une réponse. Identique à ses deux sœurs, délibérément.
 *
 * `hoverable={false}` retire le voile sombre du kit, qui posé sur du verre le
 * fait virer au gris sale ; le survol est repris par `.verre-bouton`, qui
 * ÉCLAIRCIT — sur un fond sombre, c'est la seule direction qui se voit.
 */
function ReponseBouton({
	libelle,
	onClick,
	disabled
}: {
	libelle: string;
	onClick: () => void;
	disabled: boolean;
}) {
	return (
		<Button
			variant="transparent"
			outline={false}
			hoverable={false}
			rounded
			size="lg"
			onClick={onClick}
			disabled={disabled}
			// ⚠️ `flex-1` SEULEMENT EN RANGÉE. Sous 380 px le conteneur passe en
			// colonne, et `flex: 1 1 0%` y porte sur la HAUTEUR : la base à zéro
			// écrasait les trois boutons à 29 px, sous le plancher tactile de 48 —
			// mesuré à l'écran, invisible au compilateur comme au test unitaire.
			className="verre verre-bouton w-full font-medium transition-transform duration-150 active:scale-[0.97] min-[380px]:w-auto min-[380px]:flex-1"
		>
			{libelle}
		</Button>
	);
}
