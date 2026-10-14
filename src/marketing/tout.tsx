import { cn } from '../ui';
import type { FamilleRangee } from '../ui/familles';
import { FONCTIONNALITES, type Fonctionnalite } from './fonctionnalites';
import {
	EcranProduit,
	SectionMarketing,
	TitreSection,
	fondDeTeinte,
	type TeinteSite
} from './section';

/**
 * TOUT CE QUI VA AVEC — six tuiles, une par fonction (14/10/2026).
 *
 * Le site du 06/10 ignorait le coffre-fort, la santé des clients, les
 * échéanciers, la défense et l'application sur téléphone. Ramp et ClickUp les
 * rangent en tuiles calmes : un titre, une phrase, un fragment d'écran. Une
 * tuile par entrée du registre marquée `tuile` : une fonction ajoutée au
 * registre a sa tuile sans toucher ce fichier.
 *
 * ⚠️ L'IDENTIFIANT DE CHAQUE TUILE EST LA CLÉ DE SA FONCTION : c'est là que mène
 * le menu « Logiciel » (`ancre`). `fonctionnalites.test.ts` le vérifie.
 *
 * Un carrousel sur téléphone (six tuiles empilées y faisaient trois mille
 * pixels), une grille de trois au-delà.
 */

/** La teinte du site d'une famille du produit : « la teinte dit de quoi il s'agit ». */
const TEINTE_DE_LA_FAMILLE: Readonly<Record<FamilleRangee, TeinteSite>> = {
	ARGENT: 'argent',
	TEMPS: 'temps',
	PAPIERS: 'papiers',
	ENVOI: 'argent',
	QUESTION: 'question',
	MACHINE: 'abricot'
};

const DESCRIPTIONS: Readonly<Partial<Record<Fonctionnalite['cle'], string>>> = {
	coffre:
		'Le coffre-fort de Letikette : cinq documents, tous chiffrés avec la clé de votre établissement, rangés par mois, chacun avec ce que sa lecture a donné.',
	sante:
		'La santé d’un client : un indice de 32 sur 100, « Prudence », et son bulletin en cinq piliers, registre, finances, transparence, dirigeants et paiements.',
	parole:
		'Un paiement en trois fois suivi dans un dossier : 2 000 € reçus sur 6 000 €, le prochain versement le 1er novembre, et la suite du plan si rien n’arrive.',
	defense:
		'Votre défense : deux avocats et un commissaire de justice dans votre équipe, puis les professionnels près de chacun de vos clients.',
	paiement:
		'La page que reçoit votre client : votre nom, le reste à régler et les coordonnées du virement, chacune avec un bouton pour la copier.'
};

/**
 * L'ICÔNE SUR L'ÉCRAN D'ACCUEIL DU TÉLÉPHONE : l'application s'installe depuis
 * le navigateur. Un dessin plutôt qu'une quatrième capture de l'accueil.
 */
function SurLEcranDAccueil() {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-cladd-2xs pb-cladd-xs">
			<img
				src="/icone-192.png"
				alt=""
				width={96}
				height={96}
				loading="lazy"
				decoding="async"
				className="size-24 rounded-3xl shadow-carte-chaude"
			/>
			<span className="text-cladd-sm font-semibold">Letikette</span>
			<span className="rounded-full bg-papier px-cladd-xs py-1.5 text-cladd-xs font-semibold shadow-carte-chaude">
				Sur l’écran d’accueil
			</span>
		</div>
	);
}

function Tuile({ fonctionnalite }: { fonctionnalite: Fonctionnalite }) {
	const teinte = TEINTE_DE_LA_FAMILLE[fonctionnalite.famille];
	const capture = fonctionnalite.cle === 'telephone' ? undefined : fonctionnalite.capture;
	return (
		<article
			id={fonctionnalite.cle}
			className={cn(
				'flex w-4/5 shrink-0 snap-center scroll-mt-barre-publique flex-col overflow-hidden rounded-carte-site sm:w-3/5 md:w-auto',
				fondDeTeinte(teinte)
			)}
		>
			<div className="flex flex-col gap-1 p-cladd-xs">
				<h3 className="text-intertitre leading-snug font-semibold">{fonctionnalite.nom}</h3>
				<p className="text-cladd-md leading-relaxed text-encre-site-douce">
					{fonctionnalite.phrase}
				</p>
			</div>
			<div className="relative mt-auto flex h-60 justify-center overflow-clip px-cladd-xs">
				{capture === undefined ? (
					<SurLEcranDAccueil />
				) : (
					<EcranProduit
						capture={capture}
						description={DESCRIPTIONS[fonctionnalite.cle] ?? ''}
						className="w-52 self-start"
					/>
				)}
			</div>
		</article>
	);
}

export function ToutCeQuiVaAvec() {
	const tuiles = FONCTIONNALITES.filter((f) => f.tuile);
	return (
		<SectionMarketing id="tout" ton="creme" className="gap-cladd-lg">
			<TitreSection suite="déjà dans l’application.">Et tout ce qui va avec,</TitreSection>
			<div className="carrousel -mx-cladd-2xs flex snap-x snap-mandatory gap-cladd-2xs overflow-x-auto px-cladd-2xs pb-cladd-3xs md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
				{tuiles.map((fonctionnalite) => (
					<Tuile key={fonctionnalite.cle} fonctionnalite={fonctionnalite} />
				))}
			</div>
		</SectionMarketing>
	);
}
