import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import {
	BanknoteIcon,
	Clock9Icon,
	HandIcon,
	HandshakeIcon,
	MailIcon,
	PauseIcon,
	ScaleIcon
} from 'lucide-react';
import { CarteBouton } from './carte-rangee';
import { VignetteIcone, VignetteRangee } from './familles';
import { FeuillePleinEcran } from './plein-ecran';
import { Plume, type HumeurPlume } from './plume';

/**
 * LA MAISON DE PLUME — le haut de sa page, avant toute question (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE CENTRE DE SÉCURITÉ DE CHIME, POUR UN COLLABORATEUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « qu'on sente le côté fiable du compagnon, il ne faut pas que ce
 * soit cheap ». La page de Plume s'ouvrait sur « Je veille sur 12 dossiers » et un
 * paragraphe. Relevé sur Mobbin : Chime ouvre son centre de sécurité sur un état en
 * une phrase puis ce qui est en place ; Flighty et Wallet posent trois chiffres
 * précis plutôt qu'un adjectif ; Wealthfront écrit chaque règle de l'automatisme en
 * clair. Ici, de haut en bas :
 *
 *   · Plume, et où il en est en une phrase (« Tout est en ordre ») ;
 *   · TROIS FAITS vérifiables, en tuiles : sa dernière relecture, les dossiers
 *     qu'il suit, si les relances partent seules ;
 *   · sa journée : les défis, leur avancement, la série ;
 *   · ses ENGAGEMENTS, une carte qui ouvre la page de ce qu'il fait et ne fait
 *     jamais (\`compagnon/veille.ts\`, chaque phrase lue sur la règle qui la tient).
 *
 * ⚠️ AUCUNE TEINTE DE SEUIL, et des barres à l'encre : la journée dit ce qui est
 * fait, jamais si c'est grave.
 */

export interface FaitDeLaMaison {
	/** « 14 h 02 », « 12 », « Activées ». */
	readonly valeur: string;
	/** « dernière relecture ». */
	readonly libelle: string;
}

export interface JourneeDeLaMaison {
	/** « 2 sur 5 aujourd’hui », « Journée bouclée ». */
	readonly titre: string;
	readonly serie: string | null;
	readonly defis: readonly {
		readonly nom: string;
		readonly fait: number;
		readonly total: number;
	}[];
}

export function MaisonDePlume({
	humeur,
	titre,
	ligne,
	faits,
	journee,
	onEngagements,
	invitation
}: {
	readonly humeur: HumeurPlume;
	readonly titre: string;
	readonly ligne: string;
	readonly faits: readonly FaitDeLaMaison[];
	readonly journee?: JourneeDeLaMaison;
	readonly onEngagements: () => void;
	/** Ce qu'on peut lui demander, tant que rien n'a été dit. */
	readonly invitation?: ReactNode;
}) {
	return (
		<section aria-label="Où en est Plume" className="flex flex-col gap-cladd-3xs pt-cladd-3xs">
			<div className="flex flex-col items-center gap-1.5 pb-1 text-center">
				<Plume humeur={humeur} taille={96} sol />
				<h2 className="mt-1 text-cladd-sm leading-snug font-semibold text-balance">{titre}</h2>
				<p className="max-w-sm text-cladd-2xs leading-relaxed text-balance text-cladd-fg-soft">
					{ligne}
				</p>
			</div>

			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="grid grid-cols-3 p-0 [&>*+*]:border-l [&>*+*]:border-cladd-outline"
			>
				{faits.map((fait) => (
					<div key={fait.libelle} className="flex flex-col items-center gap-0.5 px-1.5 py-3">
						<span className="text-cladd-xs leading-tight font-semibold text-cladd-fg tabular-nums">
							{fait.valeur}
						</span>
						<span className="text-center text-cladd-4xs leading-tight text-balance text-cladd-fg-soft">
							{fait.libelle}
						</span>
					</div>
				))}
			</Surface>

			{journee === undefined ? null : <SaJournee journee={journee} />}

			<CarteBouton
				titre="Mes engagements"
				ligne="Ce que je fais, ce que je ne fais jamais"
				icone={<VignetteRangee famille="MACHINE" />}
				onClick={onEngagements}
			/>

			{invitation === undefined ? null : (
				<p className="px-2 pt-1 text-center text-cladd-2xs leading-relaxed text-balance text-cladd-fg-soft">
					{invitation}
				</p>
			)}
		</section>
	);
}

/** LA JOURNÉE, posée : ses défis et leur barre, et la série. */
function SaJournee({ journee }: { readonly journee: JourneeDeLaMaison }) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-2.5 px-cladd-3xs py-3"
		>
			<div className="flex items-baseline justify-between gap-2">
				<span className="text-cladd-xs font-semibold">{journee.titre}</span>
				{journee.serie === null ? null : (
					<span className="text-cladd-2xs whitespace-nowrap text-cladd-fg-soft">
						{journee.serie}
					</span>
				)}
			</div>
			{journee.defis.length === 0 ? (
				<p className="text-cladd-2xs text-cladd-fg-soft">Rien ne vous attend aujourd’hui.</p>
			) : (
				<ul className="flex flex-col gap-2">
					{journee.defis.map((defi) => (
						<li key={defi.nom} className="flex flex-col gap-1">
							<span className="flex items-baseline justify-between gap-2 text-cladd-2xs">
								<span className="text-cladd-fg">{defi.nom}</span>
								<span className="text-cladd-fg-soft tabular-nums">
									{defi.fait} sur {defi.total}
								</span>
							</span>
							<span
								aria-hidden
								className="relative h-1.5 overflow-hidden rounded-full bg-cladd-fg/10"
							>
								<span
									className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-veille)] transition-[width] duration-700 ease-out"
									style={{
										width: `${defi.total === 0 ? 100 : Math.round((defi.fait / defi.total) * 100)}%`
									}}
								/>
							</span>
						</li>
					))}
				</ul>
			)}
		</Surface>
	);
}

export type IconeDEngagementAffichee =
	| 'HEURES'
	| 'RETENIR'
	| 'COUPEES'
	| 'PAIEMENT'
	| 'PROMESSE'
	| 'NOM'
	| 'JUSTICE';

const ICONE_DE_L_ENGAGEMENT: Readonly<Record<IconeDEngagementAffichee, ReactNode>> = {
	HEURES: <Clock9Icon aria-hidden />,
	RETENIR: <HandIcon aria-hidden />,
	COUPEES: <PauseIcon aria-hidden />,
	PAIEMENT: <BanknoteIcon aria-hidden />,
	PROMESSE: <HandshakeIcon aria-hidden />,
	NOM: <MailIcon aria-hidden />,
	JUSTICE: <ScaleIcon aria-hidden />
};

/**
 * CE QUE PLUME FAIT, ET CE QU'IL NE FAIT JAMAIS — une page pleine, une phrase par
 * engagement, un glyphe neutre chacun (ce sont des règles, pas des objets du
 * domaine : aucune famille ne les teinte).
 */
export function FeuilleDesEngagements({
	ouverte,
	onFermer,
	engagements
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly engagements: readonly {
		readonly icone: IconeDEngagementAffichee;
		readonly texte: string;
	}[];
}) {
	return (
		<FeuillePleinEcran ouverte={ouverte} onFermer={onFermer} titre="Mes engagements">
			<div className="flex flex-col items-center gap-1.5 text-center">
				<Plume humeur="content" taille={72} sol />
				<p className="max-w-sm text-cladd-2xs leading-relaxed text-balance text-cladd-fg-soft">
					Je travaille pour vous, à votre nom. Voici ce que je fais, et ce que je ne fais jamais.
				</p>
			</div>
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex flex-col p-0 [&>*+*]:border-t [&>*+*]:border-cladd-outline"
			>
				{engagements.map((engagement) => (
					<div key={engagement.icone} className="flex items-start gap-3 px-cladd-3xs py-3">
						<VignetteIcone icone={ICONE_DE_L_ENGAGEMENT[engagement.icone]} />
						<p className="min-w-0 flex-1 pt-1 text-cladd-xs leading-snug text-cladd-fg">
							{engagement.texte}
						</p>
					</div>
				))}
			</Surface>
		</FeuillePleinEcran>
	);
}
