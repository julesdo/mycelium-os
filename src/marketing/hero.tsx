import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, CheckIcon, SendIcon } from 'lucide-react';
import { BoutonAffiche, LienAffiche, Plume, cn } from '../ui';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';
import { dureePourRetenir } from './fonctionnalites';
import { EcranBureau, EcranProduit } from './section';

/**
 * L'ENTRÉE (06/10/2026, refaite le 14/10 avec Plume).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TITRE DIT CE QUE FAIT LE PRODUIT AUJOURD'HUI : IL RELANCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le 06/10, le héros disait « relancez vos factures » : le logiciel calculait
 * et préparait, le gérant envoyait. Depuis le 08/10, Plume relance seul quand
 * le gérant l'a décidé, et chaque relance se retient avant de partir. Titre
 * validé par le fondateur le 14/10 : « Vos factures impayées, relancées pour
 * vous. » Voir `docs/superpowers/specs/2026-10-14-site-refonte.md`, § 6.2.
 *
 * ⚠️ LE TON DES LOGICIELS FINANCIERS, PAS CELUI D'UN CARNET (06/10) : un titre
 * qui dit ce que fait le produit, UNE phrase factuelle, un bouton, et les trois
 * levées de risque cochées dessous. Aucune promesse de résultat.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA SCÈNE : LE PRODUIT, ET CELUI QUI LE FAIT TOURNER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sur un aplat abricot, comme Jeton : l'ordinateur derrière et le téléphone
 * devant (Cosmos), parce que le produit existe aux deux tailles ; Plume au
 * pied, qui salue ; et la capsule en direct, posée à côté, telle que le produit
 * l'affiche au-dessus de sa barre : une relance qui part bientôt, et « Retenir ».
 * Sur téléphone, le téléphone seul, Plume et la capsule. La photo de l'artisan
 * est descendue dans « Pour qui » : le héros montre le produit.
 *
 * Les montants des écrans sont ceux de la salle d'exposition : des données de
 * démonstration, et la page le dit sous « Comment ça marche ».
 */

const LEVEES = [
	'Découverte gratuite',
	`${DUREE_ESSAI_JOURS} jours d’essai, 0 € aujourd’hui`,
	'Sans engagement'
];

/**
 * LA CAPSULE, TELLE QUE LE PRODUIT L'AFFICHE — mais inerte. Sur le site, elle ne
 * retient rien : un vrai bouton « Retenir » qui ne ferait rien mentirait. Le mot
 * est donc du texte, à la place où le produit pose son bouton.
 */
function CapsuleExemple({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={cn(
				'flex items-center gap-2.5 rounded-full border border-filet-creme bg-papier py-1.5 pr-4 pl-1.5 shadow-carte-chaude',
				className
			)}
		>
			<span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-creme text-encre-site">
				<svg viewBox="0 0 40 40" className="absolute inset-0 size-10 -rotate-90">
					<circle
						cx="20"
						cy="20"
						r="17.5"
						className="fill-none stroke-filet-creme"
						strokeWidth={2.5}
					/>
					<circle
						cx="20"
						cy="20"
						r="17.5"
						pathLength={1}
						strokeDasharray="1"
						strokeDashoffset={0.3}
						strokeLinecap="round"
						className="fill-none stroke-encre-site"
						strokeWidth={2.5}
					/>
				</svg>
				<SendIcon size={15} strokeWidth={2.2} />
			</span>
			<span className="flex min-w-0 flex-col text-left">
				<span className="text-cladd-2xs leading-tight font-semibold whitespace-nowrap md:text-cladd-xs">
					Relance dans 42 min
				</span>
				<span className="text-cladd-3xs leading-tight whitespace-nowrap text-encre-site-douce md:text-cladd-2xs">
					Fournitures Durand · deuxième rappel
				</span>
			</span>
			<span className="ml-1 text-cladd-xs font-semibold whitespace-nowrap md:text-cladd-sm">
				Retenir
			</span>
		</div>
	);
}

export function Hero() {
	return (
		// LE RETRAIT SUPÉRIEUR EST CELUI DE LA BARRE : elle est en `fixed` et ne
		// réserve aucune place. Voir `--spacing-barre-publique`.
		<header className="relative isolate w-full overflow-clip bg-creme pt-barre-publique text-encre-site">
			{/* L'APLAT ABRICOT DU BAS : la scène passe du papier à la couleur. */}
			<div
				aria-hidden
				className="absolute inset-x-0 bottom-0 -z-10 h-72 bg-teinte-abricot md:h-96 lg:h-120"
			/>

			<div className="mx-auto flex w-full max-w-6xl flex-col items-center px-cladd-2xs pt-cladd-xl md:px-cladd-sm md:pt-cladd-2xl">
				<div className="leve-suite flex flex-col items-center gap-cladd-2xs text-center">
					<h1 className="leve max-w-4xl font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
						Vos factures impayées,{' '}
						<span className="souligne-main whitespace-nowrap">relancées pour vous</span>.
					</h1>

					<p className="leve max-w-2xl text-chapeau leading-relaxed text-encre-site-douce">
						Plume, l’assistant de Letikette, calcule ce qu’on vous doit au centime et relance vos
						clients à votre nom. Chaque relance vous est montrée {dureePourRetenir()} avant de
						partir.
					</p>

					{/* ⚠️ UNE SEULE PILULE, ET UN LIEN. Deux boutons pleins côte à côte
					    annulent l'action principale. */}
					<div className="leve flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
						<BoutonAffiche as={Link} to="/inscription" fond="jour">
							Essayer gratuitement
							<ArrowRightIcon />
						</BoutonAffiche>
						<LienAffiche href="#comment" className="justify-center text-encre-site">
							Comment ça marche
						</LienAffiche>
					</div>

					{/* Les levées de risque, cochées, là où l'objection naît : sous le bouton. */}
					<ul className="leve flex flex-wrap justify-center gap-x-cladd-xs gap-y-1 text-cladd-sm text-encre-site-douce">
						{LEVEES.map((levee) => (
							<li key={levee} className="flex items-center gap-1.5">
								<CheckIcon aria-hidden size={16} className="text-encre-site" />
								{levee}
							</li>
						))}
					</ul>
				</div>

				{/* LA SCÈNE. ⚠️ Les positions vont sur des ENVELOPPES : `.ecran-telephone`
				    et `.ecran-bureau` posent `position: relative` hors couche. */}
				<div className="leve leve-tard relative mt-cladd-xl mb-cladd-xl w-full max-w-sm md:mt-cladd-2xl md:mb-cladd-2xl md:max-w-4xl">
					<div className="hidden md:mr-24 md:block lg:mr-16">
						<EcranBureau
							capture="aujourdhui-bureau"
							description="Letikette sur un ordinateur : 66 704,82 € dus au 17 septembre 2026, l’ancienneté des retards, 18 443,92 € de pénalités et de frais jamais réclamés, et Plume qui relit un dépôt, avec les deux relances qui partent bientôt."
						/>
					</div>

					<div className="relative mx-auto w-60 md:absolute md:-right-2 md:-bottom-cladd-lg md:w-56 lg:-right-8 lg:w-64">
						<EcranProduit
							capture="aujourdhui"
							auDela="plume-maison"
							prioritaire
							description="Letikette sur un téléphone : ce qu’on vous doit, Plume au travail, et les relances qui partent bientôt, chacune avec « Retenir »."
						/>
					</div>

					{/* PLUME, AU PIED DE LA SCÈNE : il salue. `light` pour ses couleurs de jour. */}
					<div className="light absolute -bottom-cladd-sm -left-2 md:-bottom-cladd-lg md:-left-2 lg:-left-cladd-xl">
						<Plume humeur="salue" taille={96} sol className="size-24 md:size-36" />
					</div>

					<div className="absolute right-0 bottom-32 md:right-auto md:bottom-44 md:left-0 lg:-left-cladd-2xl">
						<CapsuleExemple />
					</div>
				</div>
			</div>
		</header>
	);
}
