import { useEffect, useRef, useState } from 'react';
import { cn } from '../ui';
import { HEURES_D_ENVOI, PLAN_PAR_DEFAUT } from '../lib/verticales/recouvrement/plan-relance';
import { FORMATS_LUS, delaiPourRetenir } from './fonctionnalites';
import {
	EcranProduit,
	SectionMarketing,
	TitreSection,
	fondDeTeinte,
	type CaptureProduit,
	type TeinteSite
} from './section';

/**
 * COMMENT ÇA MARCHE — quatre étapes, quatre vrais écrans (06/10/2026, refait le
 * 14/10 avec le produit d'aujourd'hui).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TÉLÉPHONE RESTE, L'ÉCRAN CHANGE (Midday, « How it works »)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Au-delà de 1024 px, les étapes défilent à gauche et le téléphone reste collé
 * à droite : il montre l'écran de l'étape qu'on lit. Sur téléphone, le
 * carrousel du 06/10 : un écran par carte, d'un geste du pouce.
 *
 * Le 06/10, cinq étapes disaient « chaque nuit » et « validez chaque dossier ».
 * Le pilote vit en permanence depuis le 08/10, et Plume prépare : le gérant
 * démarre. Les étapes suivent le produit : brancher, Plume prépare, les
 * relances partent, le client paie.
 *
 * ⚠️ LE PLAN EST LU, PAS ÉCRIT : `PLAN_PAR_DEFAUT`, `HEURES_D_ENVOI` et
 * `DELAI_POUR_RETENIR_MS` sont les constantes que le pilote applique. Changer
 * le plan change cette phrase.
 */

interface Etape {
	readonly numero: string;
	readonly titre: string;
	readonly texte: string;
	readonly capture: CaptureProduit;
	readonly description: string;
	readonly teinte: TeinteSite;
}

function jours(n: number): string {
	return `${n} jour${n > 1 ? 's' : ''}`;
}

function texteDuPlan(): string {
	const [rappel, second, lettre] = PLAN_PAR_DEFAUT;
	const plan =
		rappel && second && lettre
			? `Un rappel ${jours(rappel.attente)} après l’échéance, un deuxième ${jours(second.attente)} plus tard, puis la lettre officielle.`
			: 'Les rappels, puis la lettre officielle.';
	return `${plan} En semaine, de ${HEURES_D_ENVOI.de} h à ${HEURES_D_ENVOI.a} h. Chacune se retient pendant ${delaiPourRetenir()} qui précède son départ.`;
}

const ETAPES: readonly Etape[] = [
	{
		numero: '01',
		titre: 'Branchez vos factures',
		texte: `Votre logiciel comptable, votre banque, ou un simple dépôt : ${FORMATS_LUS.join(', ')}. Aucune ressaisie.`,
		capture: 'depot',
		description:
			'Le dépôt au coffre dans Letikette : choisir des fichiers ou prendre une photo, puis la liste des documents prêts à partir, chacun vérifié avant l’envoi.',
		teinte: 'papiers'
	},
	{
		numero: '02',
		titre: 'Plume prépare tout',
		texte:
			'Chaque facture échue entre dans le dossier de son client, avec ce qu’on vous doit et la date limite pour agir. Vous démarrez le dossier d’un geste.',
		capture: 'aujourdhui',
		description:
			'L’écran d’accueil de Letikette : 66 704,82 € dus, l’ancienneté des retards, 18 443,92 € de pénalités jamais réclamées, et Plume au travail qui relit un dépôt.',
		teinte: 'temps'
	},
	{
		numero: '03',
		titre: 'Les relances partent à votre nom',
		texte: texteDuPlan(),
		capture: 'part-bientot',
		description:
			'Le bloc de Plume dans Letikette : ce qu’il fait en ce moment, puis « Part bientôt », un rappel et un deuxième rappel, chacun avec son bouton « Retenir ».',
		teinte: 'argent'
	},
	{
		numero: '04',
		titre: 'Votre client paie directement',
		texte:
			'Par virement sur votre compte, depuis une page à votre nom. Aucune commission. Un paiement arrête les relances.',
		capture: 'paiement',
		description:
			'La page que reçoit votre client : votre nom, le reste à régler, 6 373,50 €, et les coordonnées du virement, chacune avec un bouton pour la copier.',
		teinte: 'abricot'
	}
];

export function Etapes() {
	const [active, setActive] = useState(0);
	const etapes = useRef<(HTMLElement | null)[]>([]);

	// L'étape lue est celle qui traverse le milieu de l'écran. Au-dessous de
	// 1024 px, le téléphone collé n'existe pas et ce rang ne sert à rien.
	useEffect(() => {
		const observateur = new IntersectionObserver(
			(entrees) => {
				for (const entree of entrees) {
					if (!entree.isIntersecting) continue;
					const rang = Number((entree.target as HTMLElement).dataset['rang']);
					if (Number.isInteger(rang)) setActive(rang);
				}
			},
			{ rootMargin: '-45% 0px -45% 0px' }
		);
		for (const etape of etapes.current) if (etape !== null) observateur.observe(etape);
		return () => observateur.disconnect();
	}, []);

	const teinteEnCours = ETAPES[active]?.teinte ?? 'papiers';

	return (
		<SectionMarketing id="comment" ton="profond" className="gap-cladd-lg lg:gap-0">
			<div className="flex flex-col gap-cladd-2xs">
				<TitreSection suite="en quatre étapes.">De vos factures au virement,</TitreSection>
				<p className="text-cladd-sm text-encre-site-claire">
					Captures du logiciel, avec des données de démonstration.
				</p>
			</div>

			<div className="lg:grid lg:grid-cols-2 lg:gap-cladd-xl">
				{/* LES ÉTAPES : un carrousel sur téléphone, une colonne qui défile au-delà. */}
				<div className="carrousel -mx-cladd-2xs flex snap-x snap-mandatory gap-cladd-2xs overflow-x-auto px-cladd-2xs pb-cladd-3xs lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0">
					{ETAPES.map((etape, rang) => (
						<article
							key={etape.numero}
							ref={(element) => {
								etapes.current[rang] = element;
							}}
							data-rang={rang}
							className={cn(
								'etape-defilee flex w-4/5 shrink-0 snap-center flex-col gap-cladd-2xs sm:w-3/5 lg:w-auto lg:justify-center lg:transition-opacity lg:duration-500',
								rang !== active && 'lg:opacity-35'
							)}
						>
							{/* Sur téléphone, l'écran est dans la carte. */}
							<div
								className={cn(
									'relative isolate flex h-80 justify-center overflow-clip rounded-carte-site px-cladd-xs pt-cladd-xs lg:hidden',
									fondDeTeinte(etape.teinte)
								)}
							>
								<EcranProduit
									capture={etape.capture}
									description={etape.description}
									className="w-52 self-start"
								/>
							</div>

							<div className="flex flex-col gap-cladd-3xs lg:gap-cladd-2xs">
								<span className="flex items-center gap-cladd-3xs">
									<span
										className={cn(
											'flex size-9 shrink-0 items-center justify-center rounded-full font-serif text-cladd-md font-medium lg:size-12 lg:text-intertitre',
											fondDeTeinte(etape.teinte)
										)}
									>
										{etape.numero}
									</span>
									<h3 className="font-serif text-intertitre leading-tight font-medium text-balance lg:text-titre-section lg:tracking-titre-section">
										{etape.titre}
									</h3>
								</span>
								<p className="text-cladd-md leading-relaxed text-encre-site-douce lg:max-w-md lg:text-chapeau">
									{etape.texte}
								</p>
							</div>
						</article>
					))}
				</div>

				{/* LE TÉLÉPHONE COLLÉ, au-delà de 1024 px : les quatre écrans empilés, celui
				    de l'étape lue au premier plan. La carte prend la teinte de l'étape. */}
				<div className="hidden lg:sticky lg:top-0 lg:flex lg:h-svh lg:items-center">
					<div
						className={cn(
							'relative isolate flex h-cadre-etapes w-full justify-center overflow-clip rounded-carte-site px-cladd-sm pt-cladd-sm transition-colors duration-500',
							fondDeTeinte(teinteEnCours)
						)}
					>
						{/* ⚠️ LA POSITION VA SUR UNE ENVELOPPE : `.ecran-telephone` pose
						    `position: relative` hors couche, et l'emporte sur `absolute`. */}
						{ETAPES.map((etape, rang) => (
							<div
								key={etape.numero}
								className={cn(
									'absolute top-cladd-sm w-72 transition-opacity duration-500',
									rang === active ? 'opacity-100' : 'opacity-0'
								)}
							>
								<EcranProduit
									capture={etape.capture}
									description={rang === active ? etape.description : ''}
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</SectionMarketing>
	);
}
