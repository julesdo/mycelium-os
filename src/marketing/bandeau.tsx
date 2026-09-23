import { AtmosphereNuit, Nebuleuse, ScenePointeur } from '../ui';

/**
 * LA BANDE QUI COUPE LA PAGE — et qui est devenue le second ciel.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ SON TRAVAIL D'ORIGINE A DISPARU, ET IL FALLAIT LUI EN DONNER UN AUTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle existait pour une seule raison : poser une RESPIRATION SOMBRE, pleine
 * largeur, entre deux sections claires. C'était tout son effet, et il est
 * intégralement perdu maintenant que la page passe au noir — une bande sombre
 * entre deux sections noires ne coupe rien du tout. Une section qui garde sa
 * forme après avoir perdu sa raison d'être est exactement le genre de code
 * qu'on trouve trois ans plus tard sans savoir à quoi il sert.
 *
 * Elle récupère la phrase que le premier écran ne pouvait pas porter. Le
 * `CLAUDE.md` l'écrit en deuxième ligne : « Une facture impayée ne fait aucun
 * bruit le jour où elle devient irrécouvrable, et c'est le seul jour où il
 * aurait fallu agir. » C'est la phrase la plus juste du projet. Elle a été
 * essayée en accroche et refusée pour une raison mesurable : trois lignes et
 * deux secondes de déchiffrage, quand un premier écran n'en a pas deux.
 *
 * Au MILIEU de la page, cette contrainte tombe. Le lecteur arrivé ici a
 * traversé la loi, le logiciel et la preuve : il a le contexte qui rend la
 * phrase immédiate, et il a besoin d'un moment où l'on ne lui demande rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE SECOND CIEL, ET POURQUOI IL N'Y EN A QUE DEUX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La nébuleuse et le champ d'étoiles reviennent ici, et nulle part ailleurs.
 * C'est ce qui en fait un ÉVÉNEMENT plutôt qu'un fond : une atmosphère qu'on
 * retrouve toutes les deux sections est un papier peint, et on cesse de la
 * voir au troisième passage.
 *
 * Deux moments, donc, aux deux endroits où la page ne demande rien : celui où
 * elle s'ouvre, et celui où elle respire. Entre les deux, du noir nu.
 *
 * ⚠️ ET ELLE NE PORTE NI FILET, NI TITRE DE SECTION, NI APPEL À L'ACTION. Une
 * respiration à laquelle on ajoute un bouton n'est plus une respiration, c'est
 * une section de plus. Celle-ci ne fait qu'une chose.
 */
export function Bandeau() {
	return (
		// `isolate` pour la même raison que le premier écran : c'est lui qui rend
		// le `-z-10` des couches possible sans qu'elles passent derrière l'aplat.
		//
		// ⚠️ `overflow-clip` ET PAS `overflow-hidden` : `hidden` crée un conteneur
		// de défilement, et toutes les chronologies `scroll()` des couches
		// s'accrocheraient à lui au lieu du document. Le ciel serait peint et
		// parfaitement immobile, sans que rien ne le signale. Vérifié au
		// navigateur le 23 septembre 2026 sur le premier écran.
		<section className="relative isolate w-full overflow-clip bg-nuit text-craie">
			<Nebuleuse className="-z-10" />
			<AtmosphereNuit className="-z-10" />

			<ScenePointeur className="mx-auto flex w-full max-w-7xl flex-col gap-cladd-2xs px-cladd-2xs py-respiration md:px-cladd-sm">
				{/*
				  ⚠️ LE CORPS D'AFFICHE, ET C'EST LE SEUL AUTRE ENDROIT DE LA PAGE QUI
				  Y AIT DROIT. Le premier écran porte l'accroche, celui-ci porte le
				  manifeste ; entre les deux, tout est en corps de section. Un troisième
				  bloc à cent-trente pixels ferait de l'échelle un tic au lieu d'un
				  signal.

				  Il dérive au curseur, et c'est la seule fois où du TEXTE bouge sur
				  cette page. La règle — ce qui se lit ne bouge pas — vaut pour ce
				  qu'on lit en travaillant ; une phrase de manifeste qu'on regarde
				  autant qu'on la lit est précisément l'exception, et six pixels de
				  course ne gênent aucune lecture.
				*/}
				<p className="suit-pointeur-loin apparait max-w-5xl font-affiche text-affiche leading-affiche font-semibold tracking-affiche text-balance">
					Une facture impayée ne fait aucun bruit{' '}
					<span className="text-craie-claire">le jour où elle devient irrécouvrable.</span>
				</p>
				<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
					C’est le seul jour où il aurait fallu agir.
				</p>
			</ScenePointeur>
		</section>
	);
}
