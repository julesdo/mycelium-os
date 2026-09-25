import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';

/**
 * UN REFUS SE DIT EN QUATRE PARTIES, DANS CET ORDRE (D0, B14).
 *
 * Ce que le produit PEUT faire tout de suite, puis ce qui manque, puis ce qui
 * le lève, puis ce que l'attente coûte — et le geste quand il en existe un.
 *
 * ⚠️ L'ORDRE EST LA MOITIÉ DU TRAVAIL. Un refus qui commence par ce qui manque
 * est un mur même quand la sortie est écrite dessous, parce que le lecteur a
 * déjà décidé que le produit ne savait pas faire.
 *
 * ⚠️ `peutFaire` N'EST PAS FACULTATIF, et c'est tout l'intérêt du type.
 * `compagnon/refus.ts` le vérifie au point de CONSTRUCTION, y compris contre la
 * chaîne vide qu'un refus composé sur une donnée absente produit ; ici on le
 * rend, et le type interdit de l'oublier.
 *
 * ⚠️ UN TROISIÈME EXEMPLAIRE EXISTE, ET C'EST DE LA DETTE ÉCRITE.
 * `screens/arret.tsx` porte une copie locale de cette carte, avec un
 * « ce qui le lève » en chaîne unique là où le domaine porte une LISTE
 * (`Refus.blocages`). Les converger touche l'écran d'arrêt, livré par une autre
 * tranche : c'est un travail à part, pas un effet de bord de celle-ci.
 */
export function RefusEnQuatreParties({
	peutFaire,
	constat,
	blocages = [],
	coutDeLAttente,
	geste
}: {
	readonly peutFaire: string;
	readonly constat: string;
	/** Ce qui lève le manque, au CONSTAT et jamais à l'impératif. Vide est une information. */
	readonly blocages?: readonly string[];
	readonly coutDeLAttente: string;
	/** Le geste qui lève ce refus, quand le produit en porte un. */
	readonly geste?: ReactNode;
}) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg">{peutFaire}</p>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{constat}</p>
			{blocages.map((blocage) => (
				<p key={blocage} className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					{blocage}
				</p>
			))}
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{coutDeLAttente}</p>
			{geste === undefined ? null : <div className="flex flex-wrap gap-cladd-3xs">{geste}</div>}
		</Surface>
	);
}
