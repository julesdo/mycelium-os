import { Link } from '@tanstack/react-router';
import {
	ArrowRightIcon,
	BanknoteIcon,
	CalendarClockIcon,
	CheckIcon,
	CpuIcon,
	FileTextIcon,
	MessageCircleQuestionIcon,
	SendIcon,
	type LucideIcon
} from 'lucide-react';
import { cn, dateRelative, eurosCentimes } from '../ui';
import {
	JOUR_DES_SCENES,
	SCENES_DES_METIERS,
	type CarteDeScene,
	type FamilleDeCarte
} from './scenes-metiers';
import { NOMS_DES_SECTEURS, type SecteurPublic } from './secteurs';
import { EcranProduit, Photo } from './section';

/**
 * LES MÉTIERS EN SCÈNE (19/10/2026, sur Slash, Acctual et HoneyBook relevés sur Mobbin) :
 * une photo du métier, la vraie capture de l'application aux données de ce métier, et les
 * cartes de l'écran posées en flottant dessus. Le fondateur : « des écrans de l'app
 * spécifiques aux secteurs, bien mis en scène, avec de fausses données de chaque secteur ».
 *
 * Les cartes flottantes RECOPIENT la forme d'une carte de l'application (`ui/carte-rangee.tsx`)
 * sans la monter : elles ne mènent nulle part, et le kit de l'application n'a rien à faire
 * sur le site. Leurs données sont celles de la capture (`scenes-metiers.ts`).
 */

const ICONE_DE_FAMILLE: Readonly<Record<FamilleDeCarte, LucideIcon>> = {
	ARGENT: BanknoteIcon,
	TEMPS: CalendarClockIcon,
	PAPIERS: FileTextIcon,
	ENVOI: SendIcon,
	QUESTION: MessageCircleQuestionIcon,
	MACHINE: CpuIcon
};

/** « SCI Les Tilleuls » → « SL » : les deux premiers mots, comme l'avatar de l'application. */
function initiales(nom: string): string {
	return nom
		.split(/\s+/)
		.slice(0, 2)
		.map((mot) => mot.charAt(0).toUpperCase())
		.join('');
}

/**
 * Une carte de l'écran « Aujourd'hui » : le client et son montant, ce qui se passe et sa date,
 * aux tailles de l'application (16 et 13 px). `compacte` : posée dans une carte de métier,
 * qui n'a pas la largeur d'un téléphone.
 */
export function CarteFlottante({
	carte,
	compacte = false,
	className
}: {
	carte: CarteDeScene;
	compacte?: boolean;
	className?: string;
}) {
	const Icone = ICONE_DE_FAMILLE[carte.famille];
	const ligne = compacte ? 'text-cladd-2xs' : 'text-cladd-xs';
	const sousLigne = compacte ? 'text-cladd-3xs' : 'text-cladd-2xs';
	return (
		<div
			aria-hidden
			className={cn(
				'flex items-center rounded-2xl border border-filet-creme bg-papier text-encre-site shadow-carte-chaude',
				compacte ? 'gap-2 py-2 pr-3 pl-2' : 'gap-3 py-2.5 pr-3.5 pl-2.5',
				className
			)}
		>
			<span
				className={cn(
					'relative flex shrink-0 items-center justify-center rounded-full bg-creme font-semibold',
					compacte ? 'size-8 text-cladd-3xs' : 'size-10 text-cladd-2xs'
				)}
			>
				{initiales(carte.client)}
				<span className="absolute -bottom-0.5 -left-0.5 flex size-5 items-center justify-center rounded-full bg-encre-site text-creme ring-2 ring-papier">
					<Icone size={11} strokeWidth={2.4} />
				</span>
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className={cn('flex items-baseline justify-between gap-2', ligne)}>
					<span className="truncate font-semibold">{carte.client}</span>
					<span className="font-semibold whitespace-nowrap tabular-nums">
						{eurosCentimes(carte.montant)}
					</span>
				</span>
				<span
					className={cn(
						'flex items-baseline justify-between gap-2 text-encre-site-douce',
						sousLigne
					)}
				>
					<span className="truncate">{carte.libelle}</span>
					<span className="whitespace-nowrap">{dateRelative(carte.date, JOUR_DES_SCENES)}</span>
				</span>
			</span>
		</div>
	);
}

/** Le paiement qui vient d'arriver chez le gérant : rien ne transite par Letikette. */
function CartePaiement({
	client,
	montant,
	className
}: {
	client: string;
	montant: bigint;
	className?: string;
}) {
	return (
		<div
			aria-hidden
			className={cn(
				'flex items-center gap-3 rounded-2xl border border-filet-creme bg-papier py-2.5 pr-4 pl-2.5 text-encre-site shadow-carte-chaude',
				className
			)}
		>
			<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teinte-argent">
				<CheckIcon size={18} strokeWidth={2.4} />
			</span>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="text-cladd-xs font-semibold whitespace-nowrap tabular-nums">
					{eurosCentimes(montant)} reçus
				</span>
				<span className="truncate text-cladd-2xs text-encre-site-douce">{client}</span>
			</span>
		</div>
	);
}

/**
 * LA SCÈNE DU HÉROS : la photo du métier, le téléphone qui la déborde en bas à droite, la
 * carte de l'écran en haut à gauche et le paiement reçu en bas. Visible au téléphone aussi :
 * c'est là que la page se lit d'abord.
 *
 * ⚠️ Les positions vont sur des ENVELOPPES : `.ecran-telephone` pose `position: relative`
 * hors couche (voir le héros de l'accueil).
 */
export function SceneDuMetier({
	secteur,
	description
}: {
	secteur: SecteurPublic;
	description: string;
}) {
	const scene = SCENES_DES_METIERS[secteur];
	const carte = scene.cartes[scene.enAvant] ?? scene.cartes[0];
	return (
		<figure className="relative mx-auto flex w-full max-w-md flex-col gap-cladd-sm md:max-w-none">
			<div className="relative pb-20">
				<div className="mr-10 overflow-hidden rounded-carte-site shadow-carte-chaude sm:mr-16">
					<Photo
						photo={scene.photo}
						description={scene.descriptionPhoto}
						sizes="(min-width: 768px) 440px, 80vw"
						prioritaire
						className={cn('aspect-4/5', scene.cadrage)}
					/>
				</div>
				<div className="absolute right-0 bottom-0 w-36 sm:w-44 lg:w-52">
					<EcranProduit capture={`metier-${secteur}`} description={description} prioritaire />
				</div>
				{carte === undefined ? null : (
					<CarteFlottante
						carte={carte}
						className="absolute top-6 -left-2 w-80 max-w-full sm:-left-6"
					/>
				)}
				<CartePaiement
					client={scene.virement.client}
					montant={scene.virement.montant}
					className="absolute bottom-24 -left-2 max-w-52 sm:bottom-32 sm:-left-6 sm:max-w-none"
				/>
			</div>
		</figure>
	);
}

/**
 * LA CARTE D'UN MÉTIER, qui MÈNE à sa page : la photo et la carte de l'écran posée dessus
 * (Slash, « Who we're built for »), le nom, une ligne, « Voir la page ». Sur l'accueil et au
 * pied de chaque page métier. Trois rangées en sous-grille : deux cartes voisines s'alignent
 * ligne à ligne.
 */
export function CarteMetier({
	secteur,
	accroche,
	className
}: {
	secteur: SecteurPublic;
	accroche: string;
	className?: string;
}) {
	const scene = SCENES_DES_METIERS[secteur];
	const carte = scene.cartes[scene.enAvant] ?? scene.cartes[0];
	return (
		<Link
			to="/secteurs/$secteur"
			params={{ secteur }}
			className={cn(
				'group flex flex-col overflow-hidden rounded-carte-site bg-papier text-encre-site shadow-carte-chaude md:row-span-3 md:grid md:grid-rows-subgrid md:gap-0',
				className
			)}
		>
			<div className="relative">
				<Photo
					photo={scene.photo}
					description={scene.descriptionPhoto}
					sizes="(min-width: 1024px) 560px, (min-width: 768px) 360px, 80vw"
					className={cn('aspect-4/3 lg:aspect-video', scene.cadrage)}
				/>
				{carte === undefined ? null : (
					<div className="absolute inset-x-3 bottom-3">
						<CarteFlottante carte={carte} compacte />
					</div>
				)}
			</div>
			<div className="flex flex-col gap-1 px-cladd-xs pt-cladd-xs">
				<h3 className="text-intertitre leading-snug font-semibold">{NOMS_DES_SECTEURS[secteur]}</h3>
				<p className="text-cladd-md leading-relaxed text-encre-site-douce">{accroche}</p>
			</div>
			<span className="flex items-center gap-1.5 px-cladd-xs pt-cladd-2xs pb-cladd-xs text-cladd-sm font-semibold">
				Voir la page
				<ArrowRightIcon
					aria-hidden
					size={16}
					className="transition-transform group-hover:translate-x-0.5"
				/>
			</span>
		</Link>
	);
}
