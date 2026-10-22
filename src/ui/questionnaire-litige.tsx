/**
 * LE QUESTIONNAIRE DE QUALIFICATION DE LITIGE — module 3.2. Ses questions se posent
 * dans la conversation du dossier depuis le 22/10/2026
 * (`screens/dossier-guide/fil-questions.tsx`) ; ce fichier garde leurs types, et
 * les règles ci-dessous y tiennent toujours.
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

/**
 * CE QUE LE LOGICIEL SAIT DÉJÀ, PROPOSÉ ET JAMAIS APPLIQUÉ.
 *
 * ⚠️ AUCUN BOUTON N'EST PRÉSÉLECTIONNÉ, et c'est la même règle que plus haut :
 * les trois réponses gardent exactement le même poids. Une pilule blanche sur
 * la réponse proposée ferait de l'appui une formalité, sur une déclaration qui
 * décide de l'éligibilité de la créance.
 *
 * La proposition est donc une LECTURE, au-dessus des boutons : voilà ce qu'on a
 * lu, voilà où, voilà quand. Le gérant répond ensuite, ou ne répond pas.
 */
export interface PropositionReponse {
	/** La réponse suggérée. Jamais « je ne sais pas » : ce serait une ligne pour rien. */
	readonly reponse: 'OUI' | 'NON';
	/** D'où elle vient, citée. Une pièce nommée, ou une déclaration antérieure. */
	readonly source: string;
	/** Quand, et de quelle date il s'agit. Une proposition sans date se croit sur parole. */
	readonly date: string;
}

export interface QuestionLitige {
	readonly cle: string;
	readonly question: string;
	readonly portee: string;
	/** Ce que le logiciel peut répondre à la place du gérant, s'il sait. */
	readonly proposition?: PropositionReponse;
}
