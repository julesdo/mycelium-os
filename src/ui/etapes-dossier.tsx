import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import { cn } from './cn';

/**
 * OÙ EN EST LE DOSSIER, ET LE SEUL GESTE QUI S'Y FAIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL REMPLACE, ET POURQUOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le 30/09/2026 au soir, le fondateur : « on doit cliquer partout, il n'y a rien
 * de clair […] tu crois qu'en mettant plein de boutons on va prouver que c'est
 * une app utile, alors que c'est totalement faux ! Less is more. »
 *
 * La page portait un rail vertical de quatre échelons, une carte « ce qui se
 * passe / si rien ne bouge » et, SOUS le montant, quatre disques d'actions qui
 * doublaient les trois boutons de l'échelon. Relevé à 393 px : vingt cibles pour
 * quatre gestes.
 *
 * C'est le code de Shop sur une commande : UN titre qui répond à la seule
 * question (« Arrives Jul 31–Aug 1 »), une ligne dessous, une barre fine. Et
 * chez Walmart ou Amazon, la même barre porte le nom de chaque étape — « où on
 * en est » se lit sans rien ouvrir, ce que le terrain réclame depuis deux
 * semaines.
 *
 * ⚠️ UN SEUL BOUTON, ET IL NE NOMME JAMAIS UNE VOIE DE DROIT. C'est la
 * troisième ligne rouge : le geste mis en avant est un geste de bureau
 * (« Relancer », « Relire le courrier »). `page-dossier.test.ts` le vérifie.
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
 * LE NOM COURT DE CHAQUE ÉTAPE, SOUS LA BARRE.
 *
 * ⚠️ UN QUART DE 361 PX, SOIT QUATRE-VINGTS PIXELS PAR ÉTIQUETTE. « Le tribunal,
 * si besoin » y tenait sur deux lignes et poussait la barre ; « On lui écrit »
 * disait un geste en cours plutôt qu'un état atteint. Le titre long reste celui
 * du domaine (`TITRE_ETAPE`) ; ceci n'est que son étiquette de barre.
 */
const ETIQUETTE: Record<string, string> = {
	PRET: 'Prêt',
	ON_LUI_ECRIT: 'Relancé',
	TRIBUNAL: 'Tribunal',
	REGLE: 'Réglé'
};

export function EtatDuDossier({
	etapes,
	titre,
	sousTitre,
	classe,
	geste,
	children
}: {
	readonly etapes: readonly EtapeDossierAffichee[];
	/** L'état, en toutes lettres : « Pas encore relancé », « Relancé le 29 août ». */
	readonly titre: string;
	/** Une ligne, un fait. Jamais un conseil. */
	readonly sousTitre: string | null;
	readonly classe: boolean;
	/** Le seul bouton de la carte. Absent quand le dossier est réglé. */
	readonly geste?: ReactNode;
	/** Ce que le geste ouvre, quand il se déplie sur place (au-delà de 1024 px). */
	readonly children?: ReactNode;
}) {
	return (
		<Surface
			as="section"
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			aria-label="Où en est le dossier"
		>
			<div className="flex flex-col gap-0.5">
				<p className="text-cladd-sm leading-tight font-bold tracking-tight">{titre}</p>
				{sousTitre === null ? null : (
					<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">{sousTitre}</p>
				)}
			</div>

			<ol
				className={cn('grid grid-cols-4 gap-1 pt-1', classe && 'opacity-60')}
				aria-label="Les étapes du dossier"
			>
				{etapes.map((etape) => (
					<li
						key={etape.cle}
						className="flex min-w-0 flex-col gap-1.5"
						aria-current={etape.etat === 'EN_COURS' ? 'step' : undefined}
					>
						{/*
						  ⚠️ PAS DE VERT, MÊME POUR « FAIT ». Le vert, le rouge et l'ambre ne
						  disent qu'une chose dans ce produit : au-dessus du seuil, tout près,
						  en dessous. Une étape franchie n'est pas un seuil, c'est un fait —
						  l'encre suffit.
						*/}
						<span
							className={cn(
								'h-1 rounded-full',
								etape.etat === 'A_VENIR' ? 'bg-cladd-outline' : 'bg-cladd-fg'
							)}
							aria-hidden
						/>
						<span
							className={cn(
								'truncate text-cladd-3xs leading-tight',
								etape.etat === 'EN_COURS'
									? 'font-semibold text-cladd-fg'
									: etape.etat === 'FAITE'
										? 'text-cladd-fg-soft'
										: 'text-cladd-fg-softest'
							)}
						>
							{ETIQUETTE[etape.cle] ?? etape.titre}
						</span>
					</li>
				))}
			</ol>

			{classe ? (
				<p className="text-cladd-2xs text-cladd-fg-soft">Dossier classé. Il peut être rouvert.</p>
			) : null}

			{geste === undefined ? null : <div className="flex flex-col pt-1">{geste}</div>}
			{children}
		</Surface>
	);
}
