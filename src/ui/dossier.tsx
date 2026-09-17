import type { ReactNode } from 'react';
import { Chip, SectionTitle, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, EyeOffIcon } from 'lucide-react';
import { ecartJours, estDateReelle } from '../lib/verticales/recouvrement/calendrier';
import { PREAVIS } from '../lib/verticales/recouvrement/surveillance';
import { cn } from './cn';
import { dateCourte, eurosCentimes, pluriel } from './format';
import { Lien } from './lien';
import { LigneAnalyse, ListeAnalyses } from './navigation';
import { RailProcedure, type EtapeAffichee } from './rail-procedure';

/**
 * UN DOSSIER ENGAGÉ — la rangée de la liste, et le volet qui l'ouvre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE LISTE N'EN EST PAS UNE DE PLUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le SEUL endroit du produit où un droit s'éteint à date fixe sans que
 * personne n'ait rien fait. Une prescription se voit venir sur des années ; une
 * ordonnance d'injonction devient caduque trois mois après avoir été rendue, et
 * ce jour-là le dossier entier est à reprendre pendant que la prescription
 * continue de courir. Une rangée qui se contenterait de nommer le client et son
 * état serait exacte et inutile : ce qu'on vient chercher ici, c'est QUAND, et
 * CE QUE ÇA ÉTEINT.
 *
 * La carte porte donc quatre choses, dans l'ordre de la fiche de sinistre de
 * Turo : le délai restant en pastille, le client et le montant en jeu,
 * l'avancement en frise fine, puis l'échéance avec sa conséquence EN TOUTES
 * LETTRES. La conséquence n'est pas tronquée : c'est un constat juridique, et
 * un constat coupé en deux se lit comme un slogan.
 *
 * ⚠️ UN CONSTAT, JAMAIS UN CONSEIL. Rien ici ne dit « faites signifier » ni
 * « engagez telle voie » : le produit énonce ce qui est, et la décision d'agir
 * reste au gérant. C'est la troisième ligne rouge du projet.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL. Le vert, l'ambre et le rouge de `--color-seuil-*`
 * ne disent qu'une chose dans ce produit — au-dessus du seuil, tout près, en
 * dessous. Les pastilles empruntent les accents du kit, comme
 * `suivi-procedure.tsx` et `rangee-file.tsx`, et pour la même raison.
 */

export interface EcheanceDuDossier {
	readonly libelle: string;
	readonly dateLimite: string;
	readonly gravite: 'CADUCITE' | 'INFORMATIVE';
	/** Ce que la date éteint si on la laisse passer. Affiché en entier. */
	readonly consequence: string;
}

export interface DossierEngage {
	readonly creanceId: string;
	readonly debiteur: string;
	/** L'état courant de la voie, tel que la machine le nomme. Jamais une clé. */
	readonly libelle: string;
	readonly engageeLe: string;
	/** Vrai quand la voie n'a plus d'état suivant. La frise le dit au lieu de compter. */
	readonly terminal: boolean;
	readonly intervenant: string | null;
	readonly prochaineEcheance: EcheanceDuDossier | null;
	readonly anglesMorts: readonly string[];
	readonly etapes: readonly EtapeAffichee[];
	/**
	 * LE MONTANT EN JEU — le principal restant dû de la créance engagée.
	 *
	 * ⚠️ `null` QUAND ON NE L'A PAS, JAMAIS UN ZÉRO DE CONFORT. Un dossier dont
	 * la créance n'a pas été retrouvée afficherait « 0,00 € », c'est-à-dire
	 * « rien à perdre » — l'exact contraire de ce qu'on ignore. Le doute ne
	 * profite jamais au produit.
	 */
	readonly principalRestantDu: bigint | null;
	readonly nombreFactures: number | null;
}

/**
 * Le nombre de jours SIGNÉ d'ici à une date, ou `null` si l'une des deux n'est
 * pas une date du calendrier.
 *
 * ⚠️ `null` PLUTÔT QU'UN COMPTE FAUX. `Date.parse` ne lève pas sur un
 * 30 février : selon le moteur il roule sur le 2 mars ou rend `NaN`, et les deux
 * donnent un chiffre faux à l'écran. `estDateReelle` vérifie l'existence au
 * calendrier ; la pastille dit alors qu'elle ne compte pas, au lieu de compter
 * faux.
 */
export function joursDici(dateLimite: string, aujourdHui: string): number | null {
	if (!estDateReelle(dateLimite) || !estDateReelle(aujourdHui)) return null;
	return ecartJours(aujourdHui, dateLimite);
}

/**
 * LES QUATRE RANGS DE LECTURE — et ce ne sont PAS des onglets.
 *
 * Des intitulés de section dans un seul défilement (`SectionTitle`), comme les
 * listes « Aujourd'hui / À venir » d'Attio et d'Asana. Un choix qui filtrerait
 * l'écran serait une rangée de plus à trancher avant de lire ; ici tout est là,
 * dans l'ordre du danger.
 */
export type RangDuDossier = 'DEPASSEE' | 'APPROCHE' | 'PLUS_TARD' | 'NON_COMPTEE';

const TITRE_DU_RANG: Record<RangDuDossier, string> = {
	DEPASSEE: 'Date dépassée',
	APPROCHE: 'L’échéance approche',
	PLUS_TARD: 'Plus tard',
	NON_COMPTEE: 'Aucune date comptée'
};

/**
 * Ce que deux rangs sur quatre CONSTATENT, sous leur intitulé.
 *
 * ⚠️ DEUX SEULEMENT, ET CE SONT CEUX QU'ON LIT DE TRAVERS. Une date DÉPASSÉE se lit
 * comme un échec du logiciel alors qu'il n'a jamais rien su de ce jour-là, et
 * « aucune date comptée » se lit comme « aucun délai ne court » alors qu'un
 * délai dont le référentiel ignore la durée court quand même. Les deux autres
 * sections n'ont rien à expliquer : leur intitulé et les pastilles le disent.
 *
 * Une phrase grise sous chaque intitulé serait quatre paragraphes à traverser
 * avant d'atteindre la première carte — et les deux qui comptent se
 * perdraient dans les deux qui ne servent à rien.
 */
const CONSTAT_DU_RANG: Record<RangDuDossier, string | null> = {
	DEPASSEE:
		'Ce que ces dates éteignaient s’est joué. Ce logiciel n’enregistre que ce que vous y consignez : il ne sait pas ce qui s’est passé ce jour-là.',
	APPROCHE: null,
	PLUS_TARD: null,
	NON_COMPTEE:
		'Ce logiciel ne compte aucune date sur ces dossiers. Ce n’est pas la même chose qu’aucun délai : ce qui court sans être compté est nommé sur le dossier.'
};

/** L'ordre de lecture : ce qui expire en premier se lit en premier. */
const ORDRE_DES_RANGS: readonly RangDuDossier[] = [
	'DEPASSEE',
	'APPROCHE',
	'PLUS_TARD',
	'NON_COMPTEE'
];

/**
 * Le préavis applicable à une échéance, pris là où la surveillance le prend.
 *
 * ⚠️ IL N'EST PAS ÉCRIT ICI. `PREAVIS` commande déjà ce que le veilleur fait
 * remonter ; un seuil recopié à l'écran ferait diverger ce qu'on signale de ce
 * qu'on affiche, et la divergence serait muette.
 */
function preavisDe(echeance: EcheanceDuDossier): number {
	return echeance.gravite === 'CADUCITE' ? PREAVIS.CADUCITE : PREAVIS.INFORMATIVE;
}

export function rangDuDossier(dossier: DossierEngage, aujourdHui: string): RangDuDossier {
	const echeance = dossier.prochaineEcheance;
	if (echeance === null) return 'NON_COMPTEE';
	const jours = joursDici(echeance.dateLimite, aujourdHui);
	if (jours === null) return 'NON_COMPTEE';
	if (jours < 0) return 'DEPASSEE';
	return jours <= preavisDe(echeance) ? 'APPROCHE' : 'PLUS_TARD';
}

export interface GroupeDeDossiers {
	readonly rang: RangDuDossier;
	readonly titre: string;
	/** `null` quand l'intitulé se suffit. Voir `CONSTAT_DU_RANG`. */
	readonly constat: string | null;
	readonly dossiers: readonly DossierEngage[];
}

/**
 * LES DOSSIERS, RANGÉS PAR L'ÉCHÉANCE QUI APPROCHE.
 *
 * ⚠️ PAR LA DATE, ET PAS PAR LA GRAVITÉ. Le serveur trie les caducités devant,
 * ce qui est le bon ordre pour une notification ; ici la question est « qu'est-ce
 * qui expire en premier ». Une caducité à six mois placée devant une date
 * informative de la semaine prochaine ferait lire un danger qui n'est pas celui
 * du jour. À date égale, la caducité passe devant : elle, elle éteint.
 *
 * ⚠️ UN RANG VIDE NE REND RIEN. Pas d'intitulé suivi d'un « 0 » : règle d'écran
 * n° 4, le vide montre le chemin et jamais des cadrans à zéro.
 */
export function grouperParEcheance(
	dossiers: readonly DossierEngage[],
	aujourdHui: string
): readonly GroupeDeDossiers[] {
	const parRang = new Map<RangDuDossier, DossierEngage[]>();
	for (const dossier of dossiers) {
		const rang = rangDuDossier(dossier, aujourdHui);
		const liste = parRang.get(rang);
		if (liste === undefined) parRang.set(rang, [dossier]);
		else liste.push(dossier);
	}

	return ORDRE_DES_RANGS.flatMap((rang) => {
		const liste = parRang.get(rang);
		if (liste === undefined || liste.length === 0) return [];
		return [
			{
				rang,
				titre: TITRE_DU_RANG[rang],
				constat: CONSTAT_DU_RANG[rang],
				dossiers: [...liste].sort(comparerParEcheance)
			}
		];
	});
}

function comparerParEcheance(a: DossierEngage, b: DossierEngage): number {
	const premiere = a.prochaineEcheance;
	const seconde = b.prochaineEcheance;
	// Sans date des deux côtés, le plus anciennement engagé d'abord : c'est celui
	// qui dure depuis le plus longtemps sans que rien ne soit compté.
	if (premiere === null && seconde === null) return a.engageeLe < b.engageeLe ? -1 : 1;
	if (premiere === null) return 1;
	if (seconde === null) return -1;
	if (premiere.dateLimite !== seconde.dateLimite) {
		return premiere.dateLimite < seconde.dateLimite ? -1 : 1;
	}
	if (premiere.gravite !== seconde.gravite) return premiere.gravite === 'CADUCITE' ? -1 : 1;
	return 0;
}

/**
 * LE DÉLAI RESTANT, EN PASTILLE.
 *
 * Elle reprend mot pour mot celle de `suivi-procedure.tsx` — « dans 12 j »,
 * « dépassée depuis 5 j », « aujourd'hui » — et sa couleur : une caducité est
 * rouge quelle que soit sa date, parce que c'est elle qui éteint. Deux
 * formulations du même délai dans le même produit, et le gérant se demande
 * laquelle croire.
 */
function PastilleDuDelai({
	echeance,
	aujourdHui
}: {
	echeance: EcheanceDuDossier;
	aujourdHui: string;
}) {
	const jours = joursDici(echeance.dateLimite, aujourdHui);
	if (jours === null) {
		return (
			<Chip size="md" color="orange">
				date non exploitable
			</Chip>
		);
	}

	const caducite = echeance.gravite === 'CADUCITE';
	return (
		<Chip
			size="md"
			color={caducite || jours < 0 ? 'red' : jours <= preavisDe(echeance) ? 'orange' : 'neutral'}
		>
			{jours < 0 ? `dépassée depuis ${-jours} j` : jours === 0 ? 'aujourd’hui' : `dans ${jours} j`}
		</Chip>
	);
}

/**
 * LA FRISE FINE — l'avancement d'un coup d'œil, sans déplier le rail.
 *
 * C'est la barre de progression de la fiche de sinistre de Turo : un segment
 * par étape, plein pour ce qui est franchi, creux pour la suite. Le RAIL
 * complet, avec ses branches et ses dates, vit dans le volet — ici on ne répond
 * qu'à « où en est-on », qui est ce qu'on lit en balayant une liste.
 *
 * `aria-hidden` sur la barre : le compte juste à côté dit la même chose en
 * toutes lettres, et une suite de segments ne s'énonce pas.
 */
function FriseFine({ etapes, terminal }: { etapes: readonly EtapeAffichee[]; terminal: boolean }) {
	if (etapes.length === 0) return null;
	const franchies = etapes.filter((etape) => etape.statut === 'FRANCHIE').length;

	return (
		<span className="flex items-center gap-cladd-3xs">
			<span aria-hidden className="flex min-w-0 flex-1 gap-1">
				{etapes.map((etape) => (
					<span
						key={etape.etat}
						className={cn(
							'h-1 flex-1 rounded-full',
							etape.statut === 'FRANCHIE'
								? 'bg-cladd-fg'
								: etape.statut === 'COURANTE'
									? 'bg-cladd-fg-softer'
									: etape.statut === 'HORS_ATTEINTE'
										? 'bg-cladd-fg/10'
										: 'bg-cladd-fg/25'
						)}
					/>
				))}
			</span>
			{/* « 1 étape sur 4 », pas « 1 sur 4 » : un rapport sans unité se lit comme
			    un score, et ce produit n'en pose aucun. */}
			<span className="shrink-0 text-cladd-2xs text-cladd-fg-softer tabular-nums">
				{terminal
					? 'voie terminée'
					: `${franchies} étape${pluriel(franchies)} sur ${etapes.length}`}
			</span>
		</span>
	);
}

/** Le montant en jeu, ou ce qu'on en sait. Jamais un zéro à sa place. */
function MontantEnJeu({ dossier }: { dossier: DossierEngage }) {
	if (dossier.principalRestantDu === null) {
		return <span className="shrink-0 text-cladd-2xs text-cladd-fg-softer">montant non repris</span>;
	}
	return (
		<span className="shrink-0 text-cladd-sm font-bold tabular-nums">
			{eurosCentimes(dossier.principalRestantDu)}
		</span>
	);
}

/**
 * LA CARTE D'UN DOSSIER, DANS LA LISTE.
 *
 * ⚠️ LA CARTE ENTIÈRE EST LE LIEN, et le lien pose `?p=<id>` : au-delà de
 * 1024 px il ouvre le volet voisin, en dessous la feuille. Un `<div>` cliquable
 * aurait la même allure et perdrait l'anneau de focus au clavier, le clic milieu
 * et l'ouverture dans un nouvel onglet — trois choses qu'on ne remarque
 * qu'absentes.
 *
 * ⚠️ TOUT CE QU'ELLE CONTIENT EST DU `<span>`. Le lien rend un `<a>`, qui ne
 * peut pas contenir de `<div>` ni de `<p>` : c'est le même montage que la rangée
 * de la file, pour la même raison.
 */
export function CarteDossier({
	dossier,
	aujourdHui,
	selectionnee
}: {
	dossier: DossierEngage;
	aujourdHui: string;
	selectionnee: boolean;
}) {
	const echeance = dossier.prochaineEcheance;
	const caducite = echeance?.gravite === 'CADUCITE';
	const angles = dossier.anglesMorts.length;

	return (
		<Surface
			variant="transparent"
			outline={false}
			// La carte ouverte se distingue par la DENSITÉ du verre, jamais par une
			// teinte : voir `rangee-file.tsx`, même raisonnement, même classe.
			className={cn('verre-carte rounded-cladd-xl', selectionnee && 'verre-dense')}
			// `p-0` : le rembourrage vit sur le lien, pour que toute la carte soit la
			// cible. Deux rembourrages superposés feraient flotter le contenu.
			contentClassName="p-0"
		>
			<Lien
				to="/app/procedures"
				search={{ p: dossier.creanceId }}
				aria-current={selectionnee ? true : undefined}
				className="verre-bouton flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs"
			>
				{/*
				  ⚠️ PAS DE PASTILLE QUAND AUCUNE DATE N'EST COMPTÉE. Elle disait
				  « aucune date comptée » — mot pour mot l'intitulé de la seule section
				  où ces cartes apparaissent. Une pastille qui répète le titre au-dessus
				  d'elle occupe la place d'un fait sans en apporter un.
				*/}
				<span className="flex flex-wrap items-center gap-cladd-3xs">
					{echeance === null ? null : (
						<PastilleDuDelai echeance={echeance} aujourdHui={aujourdHui} />
					)}
					<span className="min-w-0 text-cladd-2xs text-cladd-fg-softer">{dossier.libelle}</span>
				</span>

				<span className="flex items-baseline justify-between gap-cladd-3xs">
					<span className="min-w-0 text-cladd-sm font-bold tracking-tight">{dossier.debiteur}</span>
					<MontantEnJeu dossier={dossier} />
				</span>

				{dossier.nombreFactures === null || dossier.nombreFactures === 0 ? null : (
					<span className="text-cladd-2xs text-cladd-fg-softer">
						principal restant dû sur {dossier.nombreFactures} facture
						{pluriel(dossier.nombreFactures)}
					</span>
				)}

				<FriseFine etapes={dossier.etapes} terminal={dossier.terminal} />

				{echeance === null ? null : (
					<span className="flex flex-col gap-1 border-t border-cladd-outline pt-cladd-3xs">
						<span className="flex items-center gap-1.5 text-cladd-xs font-medium">
							{caducite ? (
								<AlertTriangleIcon className="text-cladd-red size-3.5 shrink-0" aria-hidden />
							) : null}
							{echeance.libelle} · {dateCourte(echeance.dateLimite)}
						</span>
						{/* CE QU'ELLE ÉTEINT, EN ENTIER. C'est la seule phrase de la carte
						    qui dise ce qu'on perd ; tronquée, elle ne dirait plus rien. */}
						<span className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{echeance.consequence}
						</span>
					</span>
				)}

				{angles === 0 ? null : (
					<span className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<EyeOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						{angles > 1
							? `${angles} délais courent sans être surveillés, et ils sont nommés sur le dossier.`
							: 'Un délai court sans être surveillé, et il est nommé sur le dossier.'}
					</span>
				)}
			</Lien>
		</Surface>
	);
}

/**
 * LA LISTE ENTIÈRE, SECTION PAR SECTION.
 *
 * Un seul défilement, quatre intitulés au maximum, aucune rangée d'onglets. Le
 * compte vit dans la fente de `SectionTitle`, qui est faite pour ça.
 */
export function ListeDesDossiers({
	groupes,
	ouvertId,
	aujourdHui
}: {
	groupes: readonly GroupeDeDossiers[];
	ouvertId: string | null;
	aujourdHui: string;
}) {
	return (
		<div className="flex flex-col gap-cladd-xs">
			{groupes.map((groupe) => (
				<section key={groupe.rang} className="flex flex-col gap-cladd-3xs">
					{/*
					  ⚠️ LE COMPTE EST UN NOMBRE, PAS UNE PASTILLE, ET C'EST UNE MESURE
					  PRISE AU NAVIGATEUR. La documentation de Cladd montre un `Chip` dans
					  la fente de `SectionTitle` — mais l'échelle du produit est décalée :
					  `md` y vaut 48 px, le plancher tactile. À côté d'un intitulé de
					  12 px, la pastille faisait une bulle de 48 px qui dominait la
					  section qu'elle ne fait que compter. Le cran du dessous est interdit
					  par le kit pour un élément autonome, et ce compte n'est pas
					  cliquable : un nombre suffit.
					*/}
					<SectionTitle>
						<span>{groupe.titre}</span>
						<span className="text-cladd-fg-softest tabular-nums">{groupe.dossiers.length}</span>
					</SectionTitle>
					{groupe.constat === null ? null : (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{groupe.constat}</p>
					)}
					{groupe.dossiers.map((dossier) => (
						<CarteDossier
							key={dossier.creanceId}
							dossier={dossier}
							aujourdHui={aujourdHui}
							selectionnee={dossier.creanceId === ouvertId}
						/>
					))}
				</section>
			))}
		</div>
	);
}

function Carte({ children }: { children: ReactNode }) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			{children}
		</Surface>
	);
}

/**
 * LE VOLET DU DOSSIER — le montant et le titre en tête, puis l'échéance, puis
 * la frise, puis ce qu'on ne sait pas.
 *
 * C'est l'ordre de la fiche d'opération de Brex et du détail de versement de
 * DoorDash : on sait d'abord COMBIEN et DE QUI, ensuite QUAND ça expire, ensuite
 * seulement où l'on en est. L'inverse — les étapes d'abord, le montant en bas —
 * oblige à lire toute la fiche pour savoir si elle mérite d'être lue.
 */
export function VoletDuDossier({
	dossier,
	aujourdHui
}: {
	dossier: DossierEngage;
	aujourdHui: string;
}) {
	const echeance = dossier.prochaineEcheance;

	return (
		<div className="flex flex-col gap-cladd-xs p-cladd-2xs">
			<div className="flex flex-col gap-1">
				<span className="text-cladd-2xs text-cladd-fg-softer">
					Principal restant dû sur ce dossier
				</span>
				{dossier.principalRestantDu === null ? (
					<p className="text-cladd-sm leading-relaxed text-cladd-fg-soft">
						La créance de ce dossier n’a pas été retrouvée : son montant n’est pas repris ici.
					</p>
				) : (
					<span className="text-letikette-chiffre leading-none font-bold tabular-nums">
						{eurosCentimes(dossier.principalRestantDu)}
					</span>
				)}
				<h2 className="mt-cladd-3xs text-cladd-md font-bold tracking-tight">{dossier.debiteur}</h2>
				<p className="text-cladd-xs text-cladd-fg-soft">
					{dossier.libelle} · engagée le {dateCourte(dossier.engageeLe)}
					{dossier.intervenant === null ? null : ` · ${dossier.intervenant}`}
				</p>
			</div>

			{/*
			  L'ÉCHÉANCE D'ABORD, LE RAIL ENSUITE. Le rail dit où l'on est ; l'échéance
			  dit ce qu'on perd et quand. C'est elle qui commande.
			*/}
			{echeance === null ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<SectionTitle>L’échéance qui commande</SectionTitle>
					<Carte>
						<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
							<span className="flex items-center gap-1.5 text-cladd-sm font-bold">
								{echeance.gravite === 'CADUCITE' ? (
									<AlertTriangleIcon className="text-cladd-red size-4 shrink-0" aria-hidden />
								) : null}
								{echeance.libelle}
							</span>
							<PastilleDuDelai echeance={echeance} aujourdHui={aujourdHui} />
						</div>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{dateCourte(echeance.dateLimite)} : {echeance.consequence}
						</p>
					</Carte>
				</section>
			)}

			{/*
			  ⚠️ LES ANGLES MORTS AVANT LE RAIL, JAMAIS APRÈS. Un délai dont le
			  référentiel ignore la durée court quand même. Le reléguer sous ce qui
			  rassure le ferait lire après coup, donc souvent pas du tout.
			*/}
			{dossier.anglesMorts.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<SectionTitle>Ce qui n’est pas surveillé</SectionTitle>
					{dossier.anglesMorts.map((angle) => (
						<p
							key={angle}
							className="flex items-start gap-cladd-3xs rounded-cladd-xl border border-dashed border-cladd-outline p-cladd-2xs text-cladd-2xs leading-relaxed text-cladd-fg-soft"
						>
							<EyeOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
							{angle}
						</p>
					))}
				</section>
			)}

			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Où en est ce dossier</SectionTitle>
				<Carte>
					<RailProcedure etapes={dossier.etapes} />
				</Carte>
			</section>

			{/*
			  ⚠️ CE QUE LE LOGICIEL NE SAIT PAS, ÉCRIT, ET PAS SEULEMENT SU.
			  Un rail qui avancerait tout seul et un suivi de conseil qui changerait
			  d'état sans déclaration diraient la même chose : « c'est surveillé ».
			  Ni l'un ni l'autre n'est vrai, et un gérant qui le croit cesse de
			  regarder. C'est la règle du bilan des pertes, qui s'interdit d'affirmer
			  ce qu'il n'a pas mesuré.
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Ce que ce logiciel ne sait pas</SectionTitle>
				<Carte>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Aucune de ces étapes n’avance toute seule. La frise ci-dessus ne bouge qu’aux faits que
						vous consignez, et à la date où ils se sont produits.
					</p>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Si le dossier est parti chez un conseil, ce logiciel ne sait pas ce qu’il a engagé. Son
						suivi — préparé, remis, revenu, clos — ne change d’état que sur votre déclaration, et se
						tient sur le décompte que vous lui avez remis.
					</p>
				</Carte>
			</section>

			<ListeAnalyses>
				<LigneAnalyse
					// La créance est une PAGE, en un seul défilement : la procédure y est
					// une section, et n'a plus d'adresse à elle.
					vers="/app/creance/$id"
					parametres={{ id: dossier.creanceId }}
					titre="Le dossier complet"
					valeur="Ouvrir"
				/>
			</ListeAnalyses>
		</div>
	);
}
