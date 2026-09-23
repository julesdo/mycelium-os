import { cn } from './cn';

/**
 * LA BRUME — la profondeur atmosphérique de la page publique.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI PAS UN SHADER, ALORS QUE LE DÉPÔT EN A DÉJÀ UN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `LineWaves` existe (`src/ui/line-waves.tsx`, 359 lignes de fragment shader
 * sur `ogl`) et donne un fond vivant à la coquille de l'application. Le
 * réutiliser ici était la tentation évidente, et c'est une mauvaise idée pour
 * une raison mesurée : `ogl` n'entre dans le paquet QUE par `shell.tsx` et
 * `cadre-auth.tsx`. La page d'accueil n'en charge aujourd'hui pas un octet, et
 * c'est la page la plus sensible du produit — celle qu'un prospect ouvre sur un
 * téléphone, en 4G, dans une salle d'attente.
 *
 * ⚠️ ET LA RÉFÉRENCE NE FAIT PAS DE SHADER NON PLUS. Relevé le 23 septembre
 * 2026 sur legend.xyz, dont la brume volumétrique est la plus belle du secteur :
 * ZÉRO `<canvas>`, ZÉRO `<video>`. Leur atmosphère est de l'image. Les sites
 * qui donnent l'impression de calculer une atmosphère en temps réel, en
 * général, ne calculent rien.
 *
 * Ici, ni l'un ni l'autre : des dégradés radiaux très étalés, superposés à des
 * profondeurs différentes. Zéro octet de script, zéro requête, et le navigateur
 * les compose sur le GPU comme il composerait un aplat.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI SÉPARE UNE BRUME D'UN « GLOW ORB »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le dépôt bannit nommément les halos lumineux, les grilles de points et les
 * dégradés violets — c'est écrit dans la mémoire du projet sous le nom
 * d'« AI-slop ». La différence n'est pas de degré, elle est de nature, et elle
 * tient en trois règles que ce fichier applique :
 *
 *   1. AUCUNE COULEUR QUI N'EST PAS DÉJÀ LA PALETTE. Le crème du papier, le
 *      lavis d'azur, le bleu d'encre. Rien d'autre n'entre, et surtout pas une
 *      teinte choisie pour « faire joli ».
 *   2. AUCUN BORD VISIBLE. Un halo se voit parce qu'il a un centre et une fin.
 *      Une brume n'en a pas : les rayons dépassent largement le cadre, et les
 *      opacités restent sous 0,5.
 *   3. ELLE NE BRILLE PAS, ELLE ÉPAISSIT. Un halo ajoute de la lumière sur un
 *      fond sombre ; une brume ajoute de la MATIÈRE devant un fond clair. C'est
 *      pour ça qu'elle lit « paysage » et pas « écran de veille ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA PARALLAXE EST PILOTÉE PAR LE DÉFILEMENT, SANS UNE LIGNE DE SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trois couches qui ne montent pas à la même vitesse : c'est ce qui crée la
 * profondeur, et c'est tout ce qui la crée. Un écouteur de défilement ferait le
 * même effet en re-rendant React soixante fois par seconde ; `scroll()` le fait
 * sur le compositeur.
 *
 * Et là où la chronologie n'existe pas — Firefox, aujourd'hui — les couches
 * restent à leur place. Une brume immobile est une brume ; c'est le mouvement
 * qui est le supplément, jamais la condition.
 */
export function Brume({
	className,
	intensite = 'douce'
}: {
	className?: string;
	/**
	 * `douce` pour le fond d'une section, `pleine` pour le premier écran.
	 *
	 * ⚠️ DEUX VALEURS, PAS UN NOMBRE. Un réglage libre aurait fini par porter
	 * 0,73 quelque part, sans que personne sache pourquoi ni comment le
	 * comparer. Deux intensités se choisissent, se relisent, et se corrigent
	 * d'un seul endroit.
	 */
	intensite?: 'douce' | 'pleine';
}) {
	return (
		<div
			aria-hidden
			className={cn(
				'pointer-events-none absolute inset-0 overflow-clip',
				intensite === 'pleine' ? 'opacity-100' : 'opacity-60',
				className
			)}
		>
			{/* La couche lointaine : la plus large, la plus pâle, celle qui bouge le
			    moins. C'est elle qui donne l'horizon. */}
			<div className="brume-loin absolute -inset-x-1/4 -top-1/3 h-[140%]" />

			{/* La couche médiane, en azur : elle est la seule à porter de la couleur,
			    et c'est le lavis qui existe déjà en haut du héros. */}
			<div className="brume-milieu absolute -inset-x-1/3 top-0 h-full" />

			{/* La couche proche : la plus petite et la plus rapide. Elle passe
			    DEVANT, donc elle est la seule qu'on perçoive vraiment bouger. */}
			<div className="brume-pres absolute -inset-x-1/4 bottom-0 h-3/4" />
		</div>
	);
}
