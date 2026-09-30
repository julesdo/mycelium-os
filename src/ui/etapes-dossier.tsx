import type { ReactNode } from 'react';
import { Button } from '@cladd-ui/react';

/**
 * CE QUI RESTE DES QUATRE ÉTAPES : leurs types, la mise en colonnes, et les
 * questions au compagnon.
 *
 * ⚠️ `FriseDossier` ET `EtapeEnCours` ONT ÉTÉ RETIRÉS LE 30/09/2026. La frise
 * horizontale écrivait « Prêt · On lui écrit · Le tribunal, si besoin · Réglé »,
 * et deux cents pixels plus bas la carte « Maintenant » réécrivait le titre de
 * l'étape en cours et l'expliquait en quatre phrases. Le même fait, deux fois,
 * en quatre-vingt-dix mots — et les sept blocs qui APPARTIENNENT à une étape
 * vivaient ailleurs, dans deux accordéons rangés par nature.
 *
 * Les deux sont remplacés par `fil-dossier.tsx` : un rail vertical où chaque
 * bloc pend à l'étape à laquelle il appartient.
 */

export type EtatEtapeAffiche = 'FAITE' | 'EN_COURS' | 'A_VENIR';

export interface EtapeDossierAffichee {
	readonly cle: string;
	readonly titre: string;
	readonly etat: EtatEtapeAffiche;
	readonly detail: string | null;
}

export interface LectureEtapesAffichee {
	readonly etape: string;
	readonly classe: boolean;
	readonly etapes: readonly EtapeDossierAffichee[];
	readonly ceQuiSePasse: string;
	readonly siRienNeBouge: string;
}

/**
 * DEUX COLONNES À PARTIR DE 1024 PX, ET LA COUPURE A CHANGÉ DE NATURE.
 *
 * ⚠️ ELLE NE SÉPARE PLUS « FAIRE » DE « SAVOIR ». L'ancienne répartition —
 * `['suivi','courriers','relances','voies','litige']` à gauche, le reste à
 * droite — était la taxonomie du LOGICIEL : le gérant ne se demande pas si ce
 * qu'il cherche est une chose-à-faire ou une chose-à-savoir. Il demande où ça en
 * est, et quoi faire. La coupure l'obligeait à tenir les deux colonnes en tête.
 *
 * Elle sépare maintenant LE TEMPS de LA MATIÈRE : à gauche le fil — le chiffre,
 * les faits, ce qui bloque, les quatre étapes — qui est ce qu'on lit ; à droite
 * la matière, dont la rangée ouverte ne pousse plus le fil vers le bas. C'était
 * la raison pour laquelle on perdait sa place en ouvrant le décompte.
 *
 * Apple, page *Layout* des Human Interface Guidelines (révisée le 9 septembre
 * 2026) : « Keep functionality the same as size classes change […] you can
 * change the amount of functionality that's visible onscreen as the amount of
 * space changes. » La même architecture aux quatre largeurs ; la largeur ne
 * décide que de ce qui est déjà déplié.
 */
export function DeuxColonnesDossier({ gauche, droite }: { gauche: ReactNode; droite: ReactNode }) {
	return (
		<div className="flex flex-col gap-cladd-xs lg:grid lg:grid-cols-2 lg:items-start">
			<div className="flex min-w-0 flex-col gap-cladd-xs">{gauche}</div>
			<div className="flex min-w-0 flex-col gap-cladd-xs">{droite}</div>
		</div>
	);
}

/**
 * DEUX QUESTIONS DÉJÀ ÉCRITES, sur les faits et les calculs du dossier. Un appui
 * ouvre le compagnon avec la question prête ; le gérant l'envoie lui-même.
 *
 * ⚠️ ELLES SONT DESCENDUES EN PIED DE PAGE. Elles occupaient le tiers supérieur
 * de la colonne de gauche, entre l'étape en cours et les sections : deux pavés
 * de huit mots, à l'endroit exact où le gérant vient faire un geste. Une aide se
 * met là où l'on arrive quand on n'a pas trouvé, c'est-à-dire en bas.
 */
export function QuestionsPreecrites({
	questions,
	onPoser
}: {
	questions: readonly string[];
	onPoser: (question: string) => void;
}) {
	if (questions.length === 0) return null;
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<p className="text-cladd-2xs text-cladd-fg-softer">Demander</p>
			<div className="flex flex-wrap gap-cladd-3xs">
				{questions.map((question) => (
					<Button
						key={question}
						size="md"
						variant="transparent"
						className="verre verre-bouton h-auto min-h-12 rounded-full px-3 text-left text-cladd-xs"
						onClick={() => onPoser(question)}
					>
						{question}
					</Button>
				))}
			</div>
		</div>
	);
}
