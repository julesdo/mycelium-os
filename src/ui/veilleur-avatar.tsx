import { cn } from './cn';

/**
 * LE VEILLEUR, EN PERSONNE — la seule chose de l'application qui soit vivante.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL A UN VISAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce produit fait tourner, sans qu'on le lui demande : un battement quotidien,
 * un radar de solvabilité qui interroge les registres publics à quatre heures,
 * une lecture de pièces qui passe par le modèle. C'est ce qu'on vend — « on
 * vend un logiciel qui mesure, pas du temps humain ».
 *
 * Et on ne le sentait nulle part. Le journal du veilleur, posé sur l'accueil,
 * dit ce que la machine a FAIT ; il ne dit pas qu'elle est LÀ, sur l'écran des
 * débiteurs, sur une créance, à trois heures du matin. Un travail de fond qui
 * ne se manifeste que sur un écran n'est pas un travail de fond : c'est un
 * rapport qu'on va consulter.
 *
 * Cet avatar vit dans la barre, donc sur TOUS les écrans. Il est petit, il ne
 * demande rien, et il bouge comme respire quelque chose qui veille.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TROIS ÉTATS, TROIS COMPORTEMENTS — ET AUCUNE COULEUR DE SEUIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   · VEILLE — l'iris respire, lentement. Rien ne se passe, et c'est la
 *     plupart du temps. Le mouvement est à peine perceptible : ce qui s'agite
 *     en permanence devient du décor en trois jours, et ne dit plus rien le
 *     jour où ça compte.
 *   · TRAVAILLE — le balayage tourne. C'est le seul moment où l'avatar est
 *     franchement animé, et il ne dure que le temps du traitement.
 *   · ROMPU — le balayage s'arrête et l'iris se contracte. Un veilleur en
 *     panne ne doit pas avoir l'air de veiller : c'est le pire mensonge que
 *     cette pastille pourrait dire.
 *
 * Le vert, l'ambre et le rouge restent réservés à `--color-seuil-*`. L'avatar
 * prend le bleu d'encre de la marque, comme le pouls du journal — c'est la
 * même machine, elle doit avoir la même couleur.
 *
 * ⚠️ ET IL EST EN SVG INLINE, pas en GIF ni en Lottie. Il doit hériter de la
 * couleur du texte, se redimensionner sans flou, s'arrêter sous
 * `prefers-reduced-motion`, et peser zéro octet de réseau. Une animation de
 * marque qui bloque le premier rendu serait un mauvais échange.
 */

export type EtatVeilleur = 'VEILLE' | 'TRAVAILLE' | 'ROMPU';

export function VeilleurAvatar({
	etat,
	taille = 26,
	className
}: {
	etat: EtatVeilleur;
	taille?: number;
	className?: string;
}) {
	const libelle =
		etat === 'TRAVAILLE'
			? 'Le veilleur travaille en ce moment'
			: etat === 'ROMPU'
				? 'La surveillance est interrompue'
				: 'Le veilleur veille';

	return (
		<span
			className={cn('veilleur-avatar relative inline-flex shrink-0', className)}
			data-etat={etat}
			style={{ width: taille, height: taille }}
			role="img"
			aria-label={libelle}
		>
			<svg viewBox="0 0 32 32" className="size-full overflow-visible">
				{/* L'ORBITE — le cadran du radar. Fixe, discrète : c'est le repère
				    immobile qui permet de VOIR que le reste bouge. */}
				<circle
					cx="16"
					cy="16"
					r="13"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.25"
					className="veilleur-orbite"
				/>

				{/* LE BALAYAGE — un secteur qui tourne, et rien d'autre.
				    Il ne tourne QUE dans l'état TRAVAILLE. Voir `app.css`. */}
				<g className="veilleur-balayage">
					<path
						d="M16 16 L16 3 A13 13 0 0 1 27.26 9.5 Z"
						fill="url(#veilleur-secteur)"
						opacity="0.9"
					/>
				</g>

				{/* L'IRIS — ce qui respire. C'est lui qui dit « présent »
				    quand rien ne tourne, et c'est lui qui se contracte quand
				    la surveillance est rompue. */}
				<circle cx="16" cy="16" r="4.5" fill="currentColor" className="veilleur-iris" />

				<defs>
					{/*
					  ⚠️ UN DÉGRADÉ, PAS UN APLAT. Un secteur plein tourne comme une
					  aiguille de montre — mécanique, et sans direction lisible. Le
					  dégradé donne une TRAÎNÉE : on voit d'où il vient, donc on lit
					  un balayage plutôt qu'un objet qui tourne.
					*/}
					<linearGradient id="veilleur-secteur" x1="0" y1="1" x2="1" y2="0">
						<stop offset="0%" stopColor="oklch(0.72 0.13 254)" stopOpacity="0" />
						<stop offset="100%" stopColor="oklch(0.72 0.13 254)" stopOpacity="0.85" />
					</linearGradient>
				</defs>
			</svg>
		</span>
	);
}
