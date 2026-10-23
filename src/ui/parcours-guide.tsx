import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from './cn';
import { BarreDEtapes, BulleDeReponse } from './demarrage';
import type { EtapeDeTravail } from './fil-plume';
import { BarreDePleinEcran, ColonneDePleinEcran, PiedDePleinEcran } from './plein-ecran';

/**
 * LA CONVERSATION GUIDÉE D'UN GESTE — la coquille de tout ce qu'on fait sur un dossier
 * (22/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE LE FONDATEUR A VU EN DÉMONSTRATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « On se sentait vite perdu avec tous les onglets du dossier, alors que côté flow
 * du dossier avec Plume dans le chat c'est hyper fluide. » Sur la page, c'était le
 * gérant qui conduisait : six rangées nommées dans la taxonomie du logiciel, chacune
 * une page de formulaires. Dans le démarrage, c'est Plume : une question à la fois,
 * les réponses sous le pouce, la réponse en bulle avec un crayon, le travail qui se
 * voit, une fin qui dit la suite (`docs/superpowers/specs/2026-10-22-dossier-guide.md`).
 *
 * Ces pièces sont celles du démarrage (`demarrage.tsx`, `fil-plume.tsx`), posées dans
 * une page pleine qu'on ferme d'une croix : la conversation s'ouvre PAR-DESSUS le
 * dossier, et la croix y ramène.
 *
 * ⚠️ RIEN NE S'ÉCRIT AVANT LA DERNIÈRE RÉPONSE. Chaque conversation tient ses
 * réponses dans son état, revient sur l'une d'elles au crayon, et n'appelle le
 * serveur qu'au geste qui conclut.
 */

/**
 * LA PAGE DE LA CONVERSATION : la barre (le geste, le client, la croix, les étapes),
 * le fil, et les réponses en bas.
 *
 * ⚠️ ELLE VIT DANS UN `PleinEcran` que l'appelant tient ouvert : changer de
 * conversation (revenir à « Que voulez-vous faire ? ») change ce cadre, pas la page.
 */
export function CadreGuide({
	titre,
	sousTitre,
	onFermer,
	etapes,
	suivi,
	reponses,
	children
}: {
	readonly titre: string;
	readonly sousTitre?: string;
	readonly onFermer: () => void;
	/** La barre d'étapes : les noms, et le rang de celle en cours (au-delà : tout est fait). */
	readonly etapes?: { readonly noms: readonly string[]; readonly courante: number };
	/**
	 * Ce qui change quand le fil avance (l'étape, un tic du travail) : le fil descend
	 * alors vers ce qui arrive. Une synchronisation avec le DOM, pas un état.
	 */
	readonly suivi: string;
	/** La zone des réponses, sous le pouce. Absente : rien à répondre (le travail se fait). */
	readonly reponses?: ReactNode;
	readonly children: ReactNode;
}) {
	const fin = useRef<HTMLDivElement>(null);
	/*
	  ⚠️ PAS À L'OUVERTURE : une liste de neuf réponses faisait défiler le fil sous la
	  barre, et la question disparaissait. Le fil ne descend que quand il avance. On
	  compare à la valeur d'arrivée plutôt qu'à un « premier rendu », que le mode strict
	  rejoue.
	*/
	const auDepart = useRef(suivi);
	useEffect(() => {
		if (suivi === auDepart.current) return;
		fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}, [suivi]);

	return (
		<ColonneDePleinEcran>
			<BarreDePleinEcran
				titre={titre}
				{...(sousTitre === undefined ? {} : { sousTitre })}
				onFermer={onFermer}
			>
				{etapes === undefined ? null : (
					<BarreDEtapes etapes={etapes.noms} courante={etapes.courante} />
				)}
			</BarreDePleinEcran>
			<div className="flex flex-1 flex-col gap-6 pt-cladd-2xs pb-cladd-sm">
				{children}
				<div ref={fin} aria-hidden />
			</div>
			{reponses === undefined || reponses === null ? null : (
				<PiedDePleinEcran>
					<div className="flex flex-col gap-2 pb-1">{reponses}</div>
				</PiedDePleinEcran>
			)}
		</ColonneDePleinEcran>
	);
}

/** Une question de Plume et, quand on y a répondu, la bulle du gérant avec son crayon. */
export function Echange({
	question,
	reponse,
	onModifier
}: {
	readonly question: ReactNode;
	/** Absente : la question attend encore sa réponse. */
	readonly reponse?: string;
	/** Absent : la réponse ne se change plus (le travail est lancé). */
	readonly onModifier?: () => void;
}) {
	return (
		<div className="flex flex-col gap-3">
			{question}
			{reponse === undefined ? null : (
				<BulleDeReponse texte={reponse} {...(onModifier === undefined ? {} : { onModifier })} />
			)}
		</div>
	);
}

export interface ChoixDeReponse {
	readonly cle: string;
	readonly titre: string;
	/** Ce qui va se passer, en une ligne : « Un jour, et le montant ». */
	readonly ligne?: string;
	readonly onClick: () => void;
}

/**
 * DES RÉPONSES EN LISTE, une ligne par cas — « What happened? » chez Lemonade, « What
 * do you need help with? » chez DoorDash. Chaque ligne dit ce que le gérant a vécu,
 * dans ses mots, et ce qui suivra.
 */
export function ListeDeReponses({ choix }: { readonly choix: readonly ChoixDeReponse[] }) {
	return (
		<ul className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
			{choix.map((c) => (
				<li key={c.cle}>
					<button
						type="button"
						onClick={c.onClick}
						className="flex min-h-12 w-full items-center gap-3 px-3.5 py-2 text-left transition active:scale-[0.99]"
					>
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="text-cladd-xs font-semibold">{c.titre}</span>
							{c.ligne === undefined ? null : (
								<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">{c.ligne}</span>
							)}
						</span>
						<ChevronRightIcon className="size-4 shrink-0 text-cladd-fg-softer" aria-hidden />
					</button>
				</li>
			))}
		</ul>
	);
}

/**
 * DES PASTILLES À TOUCHER, une seule choisie — le canal d'un échange, un nombre de
 * fois. Comme les jours proposés de `ChoixDeDate`, sans le champ de date.
 */
export function ChoixParPastilles<T extends string | number>({
	options,
	valeur,
	onChange,
	libelle
}: {
	readonly options: readonly { readonly valeur: T; readonly libelle: string }[];
	readonly valeur: T | null;
	readonly onChange: (valeur: T) => void;
	/** Ce que le lecteur d'écran annonce. */
	readonly libelle: string;
}) {
	return (
		<div className="flex flex-wrap gap-2" role="radiogroup" aria-label={libelle}>
			{options.map((option) => (
				<button
					key={String(option.valeur)}
					type="button"
					role="radio"
					aria-checked={valeur === option.valeur}
					onClick={() => onChange(option.valeur)}
					className={cn(
						'min-h-9 rounded-full px-3.5 text-cladd-2xs transition active:scale-[0.97]',
						valeur === option.valeur
							? 'bg-cladd-fg font-semibold text-cladd-bg'
							: 'verre-carte verre-bouton text-cladd-fg'
					)}
				>
					{option.libelle}
				</button>
			))}
		</div>
	);
}

/** Une consigne courte au-dessus d'un champ de la zone des réponses. */
export function ConsigneDeReponse({ children }: { readonly children: ReactNode }) {
	return <p className="px-1 text-cladd-2xs font-medium text-cladd-fg-soft">{children}</p>;
}

/** Le temps qu'une étape du travail reste à l'écran avant la suivante, comme au démarrage. */
const CADENCE_MS = 750;

/** Le message d'un refus : `ConvexError` le porte dans `data`, pas dans `message`. */
export function messageDuRefus(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'Ça n’a pas abouti.';
}

/**
 * LE TRAVAIL QUI SE VOIT — les étapes se cochent une à une pendant que le serveur
 * fait le geste, et la fin n'arrive que quand les deux sont finis.
 *
 * ⚠️ CE QUI S'AFFICHE EST CE QUI SE FAIT : l'appelant ne déroule que des étapes que
 * le geste fait vraiment. L'animation est le rythme, le contenu est vrai. Un refus
 * arrête tout et se dit : rien n'a été fait.
 */
export function useTravail<R>(libelles: readonly string[]) {
	const [lance, setLance] = useState(false);
	const [tic, setTic] = useState(0);
	const [resultat, setResultat] = useState<{ readonly valeur: R } | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);

	const fini = lance && resultat !== null && tic >= libelles.length;
	useEffect(() => {
		if (!lance || fini) return;
		const horloge = window.setInterval(() => setTic((t) => t + 1), CADENCE_MS);
		return () => window.clearInterval(horloge);
	}, [lance, fini]);

	function lancer(geste: () => Promise<R>) {
		setErreur(null);
		setResultat(null);
		setTic(0);
		setLance(true);
		geste().then(
			(valeur) => setResultat({ valeur }),
			(e: unknown) => {
				setLance(false);
				setErreur(messageDuRefus(e));
			}
		);
	}

	const etapes: EtapeDeTravail[] = libelles.map((libelle, i) => ({
		libelle,
		etat:
			fini || i < tic ? 'faite' : i === Math.min(tic, libelles.length - 1) ? 'courante' : 'avenir'
	}));

	return {
		/** Le geste est parti, et il n'a pas été refusé. */
		lance,
		fini,
		etapes,
		tic,
		erreur,
		/** Ce que le geste a rendu, une fois fini. */
		resultat: fini ? (resultat?.valeur ?? null) : null,
		lancer
	};
}

/**
 * UN RELEVÉ DANS LE FIL — ce qu'un paiement solde, facture par facture : à lire, pas
 * à toucher. La forme du calendrier des versements, pour n'importe quelles lignes.
 */
export function ReleveDuFil({
	lignes
}: {
	readonly lignes: readonly {
		readonly cle: string;
		readonly titre: string;
		readonly ligne?: string;
		readonly valeur: string;
	}[];
}) {
	return (
		<ol className="verre-carte flex flex-col rounded-cladd-xl px-3.5 py-1 [&>li+li]:border-t [&>li+li]:border-cladd-outline">
			{lignes.map((l) => (
				<li key={l.cle} className="flex min-h-12 items-center justify-between gap-3 py-2">
					<span className="flex min-w-0 flex-col">
						<span className="truncate text-cladd-xs font-medium">{l.titre}</span>
						{l.ligne === undefined ? null : (
							<span className="text-cladd-2xs text-cladd-fg-soft">{l.ligne}</span>
						)}
					</span>
					<span className="shrink-0 text-cladd-xs font-semibold tabular-nums">{l.valeur}</span>
				</li>
			))}
		</ol>
	);
}
