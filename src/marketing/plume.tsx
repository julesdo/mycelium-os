import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckIcon, LoaderCircleIcon, SendIcon } from 'lucide-react';
import { Plume, cn, type HumeurPlume } from '../ui';
import { PLAN_PAR_DEFAUT } from '../lib/verticales/recouvrement/plan-relance';
import { JOURS_DE_GRACE } from '../lib/verticales/recouvrement/parole';
import { delaiPourRetenir, dureePourRetenir } from './fonctionnalites';
import {
	Chapeau,
	EcranProduit,
	SectionMarketing,
	TitreSection,
	fondDeTeinte,
	type TeinteSite
} from './section';

/**
 * PLUME — « Plume fait le travail. Vous décidez. » (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA SECTION QUI MANQUAIT LE PLUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le site du 06/10 ne connaissait pas Plume : le produit, lui, ne se comprend
 * plus sans lui (il ouvre les dossiers, relance, écoute le client, répond).
 * Relevé sur Calendly (« Meet Callie », des capacités en rangées qui se
 * déplient, une barre qui avance), Zaro (« watch your agents run in real time »)
 * et Lassie (une carte « working… » posée sur l'image).
 *
 * ⚠️ CE QUI EST DIT EST LU SUR LES CONSTANTES QUI LE TIENNENT : le plan
 * (`PLAN_PAR_DEFAUT`), le délai pour retenir (`DELAI_POUR_RETENIR_MS`), la grâce
 * après une promesse (`JOURS_DE_GRACE`). Comme sa maison dans l'application.
 *
 * ⚠️ SON HUMEUR SUIT LA RANGÉE OUVERTE (il travaille, il écrit, il écoute, il
 * réfléchit) : la règle du produit, « son humeur est une donnée, pas un décor ».
 *
 * ⚠️ LES RANGÉES AVANCENT SEULES, à la manière de Calendly, tant que la section
 * est à l'écran et qu'on n'y a pas touché ; un toucher les arrête pour de bon.
 * Sous `prefers-reduced-motion`, rien ne bouge : la première rangée reste
 * ouverte, les étapes sont toutes cochées.
 */

const DUREE_D_UNE_RANGEE_MS = 6500;
const RYTHME_DES_COCHES_MS = 700;

function mouvementReduit(): boolean {
	return (
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

/** Vrai tant que l'élément est à l'écran. */
function useALEcran<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
	const ref = useRef<T | null>(null);
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const element = ref.current;
		if (element === null) return;
		const observateur = new IntersectionObserver(
			([entree]) => setVisible(entree?.isIntersecting ?? false),
			{
				threshold: 0.35
			}
		);
		observateur.observe(element);
		return () => observateur.disconnect();
	}, []);
	return [ref, visible];
}

// ─── Les scènes ─────────────────────────────────────────────────────────────

const ETAPES_DU_TRAVAIL = [
	'Lit 198 factures et 40 règlements',
	'Range par client : 23 clients',
	'Repère 17 factures en retard',
	'Ouvre 4 dossiers, prêts à démarrer'
] as const;

/**
 * UN TRAVAIL DE PLUME, QUI SE COCHE — au rythme du produit (0,7 s), puis
 * recommence après un temps de repos. Le même dessin que le bloc « Le pilote »
 * de l'accueil : coche, roue, point.
 */
function TravailVivant({ actif }: { actif: boolean }) {
	const [pas, setPas] = useState(0);
	useEffect(() => {
		// Sous le mouvement réduit, le travail est montré fini, d'un coup.
		if (mouvementReduit()) {
			const fini = window.setTimeout(() => setPas(ETAPES_DU_TRAVAIL.length), 0);
			return () => window.clearTimeout(fini);
		}
		if (!actif) return;
		// Trois pas de repos une fois tout coché, puis on recommence.
		const minuteur = window.setInterval(
			() => setPas((p) => (p >= ETAPES_DU_TRAVAIL.length + 3 ? 0 : p + 1)),
			RYTHME_DES_COCHES_MS
		);
		return () => window.clearInterval(minuteur);
	}, [actif]);
	const faites = Math.min(pas, ETAPES_DU_TRAVAIL.length);

	return (
		<div className="flex w-full max-w-sm flex-col gap-cladd-2xs rounded-carte-site border border-filet-creme bg-papier p-cladd-xs shadow-carte-chaude">
			<div className="light flex items-center gap-cladd-3xs">
				<Plume
					humeur={faites < ETAPES_DU_TRAVAIL.length ? 'travaille' : 'content'}
					taille={40}
					decoratif
				/>
				<span className="flex flex-col">
					<span className="text-cladd-sm font-semibold">Plume</span>
					<span className="text-cladd-2xs text-encre-site-douce">
						{faites < ETAPES_DU_TRAVAIL.length ? 'Au travail' : 'C’est fait'}
					</span>
				</span>
			</div>
			<p className="text-cladd-sm font-medium">Relit votre dépôt</p>
			<ol className="flex flex-col gap-1.5">
				{ETAPES_DU_TRAVAIL.map((etape, i) => {
					const etat = i < faites ? 'faite' : i === faites ? 'courante' : 'avenir';
					return (
						<li
							key={etape}
							className={cn(
								'flex items-center gap-2 text-cladd-xs leading-snug transition-colors',
								etat === 'faite' && 'text-encre-site-douce',
								etat === 'avenir' && 'text-encre-site-claire'
							)}
						>
							<span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
								{etat === 'faite' ? (
									<CheckIcon className="size-3.5" strokeWidth={2.5} />
								) : etat === 'courante' ? (
									<LoaderCircleIcon
										className="size-3.5 motion-safe:animate-spin"
										strokeWidth={2.5}
									/>
								) : (
									<span className="size-1.5 rounded-full bg-current opacity-50" />
								)}
							</span>
							{etape}
						</li>
					);
				})}
			</ol>
		</div>
	);
}

/** Les étapes du plan et leur jour, comptés depuis l'échéance. */
const ETAPES_DU_PLAN = PLAN_PAR_DEFAUT.reduce<
	readonly ((typeof PLAN_PAR_DEFAUT)[number] & { readonly jour: number })[]
>(
	(faites, etape) => [...faites, { ...etape, jour: (faites.at(-1)?.jour ?? 0) + etape.attente }],
	[]
);

/**
 * LE PLAN DE RELANCE, lu sur `PLAN_PAR_DEFAUT` : les étapes automatiques avec
 * leur jour, puis la remise au conseil, que seul le gérant décide.
 */
function PlanVisible() {
	const etapes = ETAPES_DU_PLAN;
	return (
		<ol className="flex w-full max-w-sm flex-col gap-cladd-3xs">
			{etapes.map((etape) => (
				<li
					key={etape.cle}
					className={cn(
						'flex items-center gap-cladd-3xs rounded-carte-site p-cladd-3xs pr-cladd-xs',
						etape.automatique
							? 'border border-filet-creme bg-papier shadow-carte-chaude'
							: 'border-2 border-dashed border-encre-site/20'
					)}
				>
					<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teinte-argent">
						<SendIcon size={16} aria-hidden />
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="text-cladd-sm font-semibold">{etape.nom}</span>
						<span className="text-cladd-2xs text-encre-site-douce">
							{etape.automatique
								? `${etape.jour} jours après l’échéance · se retient ${dureePourRetenir()} avant`
								: 'Quand vous le décidez, jamais seul'}
						</span>
					</span>
				</li>
			))}
		</ol>
	);
}

// ─── Les rangées ────────────────────────────────────────────────────────────

interface Capacite {
	readonly titre: string;
	readonly texte: string;
	readonly humeur: HumeurPlume;
	readonly teinte: TeinteSite;
	readonly scene: (actif: boolean) => ReactNode;
}

function texteDuPlan(): string {
	const [rappel, second, lettre] = PLAN_PAR_DEFAUT;
	const plan =
		rappel && second && lettre
			? `un rappel ${rappel.attente} jours après l’échéance, un deuxième ${second.attente} jours plus tard, puis la lettre officielle`
			: 'les rappels, puis la lettre officielle';
	return `Il suit votre plan : ${plan}. Chacune vous est montrée avant de partir, et se retient pendant ${delaiPourRetenir()} qui précède. Un paiement arrête tout.`;
}

const CAPACITES: readonly Capacite[] = [
	{
		titre: 'Il ouvre vos dossiers',
		texte:
			'Chaque facture échue entre seule dans le dossier de son client, avec ce qu’on vous doit et la date limite pour agir. Vous démarrez le dossier d’un geste : rien ne se relance avant.',
		humeur: 'travaille',
		teinte: 'abricot',
		scene: (actif) => <TravailVivant actif={actif} />
	},
	{
		titre: 'Il relance à votre nom',
		texte: texteDuPlan(),
		humeur: 'ecrit',
		teinte: 'argent',
		scene: () => <PlanVisible />
	},
	{
		titre: 'Il écoute votre client',
		texte: `Votre client promet de payer le 20 ? Plume se tait jusqu’au jour promis, plus ${JOURS_DE_GRACE} jours. Il paie en trois fois ? Plume suit chaque versement, et ne le relance pas tant qu’ils arrivent.`,
		humeur: 'ecoute',
		teinte: 'question',
		scene: () => (
			<EcranProduit
				capture="plume-geste"
				description="Plume propose deux gestes après une promesse de paiement : poser un rappel le 21 octobre, et convenir d’un paiement en trois fois de 2 000 € chacun, avec son calendrier."
				className="w-60 self-start md:w-64"
			/>
		)
	},
	{
		titre: 'Il répond, et il agit',
		texte:
			'Posez-lui une question, joignez-lui un document. Il répond avec vos dossiers, propose un geste, et ne le fait qu’après votre « Confirmer ».',
		humeur: 'reflechit',
		teinte: 'temps',
		scene: () => (
			<EcranProduit
				capture="plume-maison"
				description="La conversation avec Plume : « Qui me doit le plus ? Relance le premier. » Plume cite les trois plus gros dossiers et propose de préparer la prochaine relance de Fournitures Durand, avec « Préparer » et « Non merci »."
				className="w-60 self-start md:w-64"
			/>
		)
	}
];

export function SectionPlume() {
	const [ouverte, setOuverte] = useState(0);
	const [manuel, setManuel] = useState(false);
	const [ref, visible] = useALEcran<HTMLDivElement>();
	const defile = visible && !manuel;

	// Les rangées avancent seules tant que la section est à l'écran.
	useEffect(() => {
		if (!defile || mouvementReduit()) return;
		const minuteur = window.setInterval(
			() => setOuverte((o) => (o + 1) % CAPACITES.length),
			DUREE_D_UNE_RANGEE_MS
		);
		return () => window.clearInterval(minuteur);
	}, [defile]);

	const capacite = CAPACITES[ouverte] ?? CAPACITES[0]!;

	return (
		<SectionMarketing id="plume" ton="creme" className="gap-cladd-lg">
			{/* PLUME EN PERSONNE, à côté de son titre : son humeur suit la rangée ouverte.
			    Posé dans la scène, il cachait ce qu'elle montre. */}
			<div className="flex flex-col gap-cladd-2xs md:flex-row md:items-end md:justify-between md:gap-cladd-lg">
				<div className="light md:order-last">
					<Plume humeur={capacite.humeur} taille={80} sol className="md:size-32" />
				</div>
				<div className="flex flex-col gap-cladd-2xs">
					<TitreSection suite="Vous décidez.">Plume fait le travail.</TitreSection>
					<Chapeau>
						Plume est l’assistant de Letikette. Il vit dans l’application et nulle part ailleurs :
						vos clients ne reçoivent que des courriers à votre nom.
					</Chapeau>
				</div>
			</div>

			<div ref={ref} className="grid gap-cladd-sm lg:grid-cols-2 lg:items-center lg:gap-cladd-xl">
				{/* LA SCÈNE DE LA RANGÉE OUVERTE, dans la teinte de ce qu'elle montre. Une
				    hauteur fixe : rien ne saute quand la rangée change. */}
				<div
					className={cn(
						'relative isolate flex h-104 items-center justify-center overflow-clip rounded-carte-site px-cladd-xs pt-cladd-xs transition-colors duration-500 md:h-120 lg:order-2',
						fondDeTeinte(capacite.teinte)
					)}
				>
					<div key={ouverte} className="apparition-scene flex w-full justify-center self-stretch">
						<div className="flex w-full items-center justify-center self-stretch">
							{capacite.scene(visible)}
						</div>
					</div>
				</div>

				<ol className="flex flex-col">
					{CAPACITES.map((c, rang) => {
						const estOuverte = rang === ouverte;
						return (
							<li key={c.titre} className="border-b border-filet-creme last:border-b-0">
								<button
									type="button"
									aria-expanded={estOuverte}
									onClick={() => {
										setManuel(true);
										setOuverte(rang);
									}}
									className="flex min-h-14 w-full items-center gap-cladd-3xs py-cladd-3xs text-left"
								>
									<span
										className={cn(
											'font-serif text-intertitre leading-tight font-medium transition-colors md:text-titre-section md:tracking-titre-section',
											!estOuverte && 'text-encre-site-claire'
										)}
									>
										{c.titre}
									</span>
								</button>
								{estOuverte ? (
									<div className="flex flex-col gap-cladd-2xs pb-cladd-xs">
										<p className="max-w-xl text-cladd-md leading-relaxed text-encre-site-douce md:text-chapeau">
											{c.texte}
										</p>
										{/* La barre qui avance, comme chez Calendly : elle dit que la
										    rangée suivante va s'ouvrir seule. */}
										{defile ? (
											<span
												aria-hidden
												className="h-0.5 w-full overflow-hidden rounded-full bg-filet-creme"
											>
												<span
													className="barre-de-rangee block h-full rounded-full bg-encre-site"
													style={{ animationDuration: `${DUREE_D_UNE_RANGEE_MS}ms` }}
												/>
											</span>
										) : null}
									</div>
								) : null}
							</li>
						);
					})}
				</ol>
			</div>

			<p className="text-cladd-sm text-encre-site-claire">
				Rien ne part vers un tribunal. La remise à votre avocat ou à votre commissaire de justice,
				c’est vous qui la décidez.
			</p>
		</SectionMarketing>
	);
}
