import { useState } from 'react';
import { Button, Chip, Input, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, EyeOffIcon } from 'lucide-react';
import { dateCourte } from './format';

/**
 * CE QUI COURT APRÈS L'ENGAGEMENT — module 4.5.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CET ÉCRAN EST LE PLUS DANGEREUX DU PRODUIT À LAISSER VIDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit savait dire qu'un dossier était parti, et plus rien après. Or
 * c'est l'après qui se perd : trois mois pour signifier une ordonnance, sous
 * peine de caducité. Passée, l'ordonnance est perdue — la créance existe
 * toujours, mais tout est à reprendre pendant que la prescription court.
 *
 * Une échéance qu'on croit surveillée et qui ne l'est pas est pire que pas de
 * surveillance du tout : elle dispense de regarder.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI N'EST PAS SURVEILLÉ EST MONTRÉ AU MÊME ENDROIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les angles morts — un délai dont le référentiel ne connaît pas la durée —
 * s'affichent DANS la carte, pas en note de bas de page. Reléguer « le délai
 * d'opposition n'est pas surveillé » sous les échéances datées reviendrait à
 * le cacher derrière ce qui rassure.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SUR LE ROUGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La caducité emprunte l'accent `red` du kit, jamais `--color-seuil-manque`.
 * Les trois couleurs de seuil ne disent qu'une chose dans ce produit —
 * au-dessus, tout près, en dessous — et un droit qui va s'éteindre n'est pas un
 * seuil. Même raisonnement que `flux-evenements.tsx`.
 */

export interface EcheanceAffichee {
	readonly cle: string;
	readonly libelle: string;
	readonly dateLimite: string;
	readonly gravite: 'CADUCITE' | 'INFORMATIVE';
	readonly consequence: string;
}

export interface SuiviAffiche {
	readonly libelle: string;
	readonly constat: string;
	readonly depuisLe: string;
	readonly echeances: readonly EcheanceAffichee[];
	readonly anglesMorts: readonly string[];
	readonly suites: readonly { readonly cle: string; readonly libelle: string }[];
	readonly terminal: boolean;
	readonly journal: readonly {
		readonly cle: string;
		readonly libelle: string;
		readonly survenuLe: string;
	}[];
}

export function SuiviProcedure({
	suivi,
	aujourdHui,
	onConsigner,
	enCours = false
}: {
	suivi: SuiviAffiche;
	/** La date du jour, venue de la SEULE horloge de l'interface. */
	aujourdHui: string;
	/** Enregistrer ce qui s'est passé, À SA DATE. */
	onConsigner: (cle: string, survenuLe: string) => void;
	enCours?: boolean;
}) {
	// Quelle suite est ouverte, et à quelle date. Deux états d'écran, remis à
	// zéro à chaque ouverture — rien ici n'a besoin de survivre au rendu suivant.
	const [choisie, setChoisie] = useState<string | null>(null);
	const [quand, setQuand] = useState(aujourdHui);

	return (
		<div className="flex flex-col gap-cladd-3xs">
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
			>
				<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
					<span className="text-cladd-sm font-bold tracking-tight">{suivi.libelle}</span>
					<Chip size="md" color="neutral">
						depuis le {dateCourte(suivi.depuisLe)}
					</Chip>
				</div>

				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{suivi.constat}</p>

				{suivi.echeances.map((echeance) => (
					<Echeance key={echeance.cle} echeance={echeance} aujourdHui={aujourdHui} />
				))}

				{/* ⚠️ LES ANGLES MORTS, DANS LA CARTE. Un délai dont on ignore la durée
				    court quand même ; le reléguer plus bas le ferait lire après ce qui
				    rassure, donc souvent pas du tout. */}
				{suivi.anglesMorts.map((angle) => (
					<p
						key={angle}
						className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft"
					>
						<EyeOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						{angle}
					</p>
				))}
			</Surface>

			{suivi.suites.length > 0 ? (
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					{/* Un CONSTAT à enregistrer, jamais une action à faire. « Le juge a
					    rendu son ordonnance » se coche parce que c'est arrivé ; « faire
					    signifier l'ordonnance » serait un conseil de procédure. */}
					<p className="text-cladd-2xs text-cladd-fg-softer">Ce qui s’est passé depuis :</p>
					<div className="flex flex-col gap-cladd-3xs">
						{suivi.suites.map((suite) => (
							<div key={suite.cle} className="flex flex-col gap-cladd-3xs">
								<Button
									variant="transparent"
									outline={false}
									hoverable={false}
									rounded
									size="lg"
									disabled={enCours}
									onClick={() => {
										setChoisie(choisie === suite.cle ? null : suite.cle);
										setQuand(aujourdHui);
									}}
									className="verre verre-bouton w-full justify-start text-left font-medium transition-transform duration-150 active:scale-[0.99]"
								>
									{suite.libelle}
								</Button>

								{/*
								  ⚠️ LA DATE EST DEMANDÉE, PAS SUPPOSÉE.

								  Poser « aujourd'hui » sans le demander détruirait la seule
								  distinction qui porte ce module : un gérant qui enregistre le
								  20 mars une ordonnance signifiée le 3 verrait ses trois mois
								  partir du 20. Dix-sept jours offerts, sur l'échéance la plus
								  dangereuse du produit — et offerts en silence.

								  Le champ part sur la date du jour parce que c'est le cas le
								  plus fréquent, et il se corrige d'un geste.
								*/}
								{choisie === suite.cle ? (
									<div className="flex flex-col gap-cladd-3xs pl-cladd-3xs min-[420px]:flex-row min-[420px]:items-end">
										<Input
											size="lg"
											type="date"
											value={quand}
											onChange={setQuand}
											className="min-[420px]:flex-1"
											infoMessage="La date du FAIT, pas celle de la saisie."
										/>
										<Button
											variant="transparent"
											outline={false}
											hoverable={false}
											rounded
											size="lg"
											disabled={enCours || quand === ''}
											onClick={() => {
												onConsigner(suite.cle, quand);
												setChoisie(null);
											}}
											className="pilule-principale font-semibold"
										>
											Enregistrer
										</Button>
									</div>
								) : null}
							</div>
						))}
					</div>
				</Surface>
			) : null}

			{suivi.journal.length > 0 ? (
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-1 p-cladd-2xs"
				>
					{/* LE JOURNAL. C'est lui qu'on relit à deux ans, quand la question
					    devient « qu'a-t-on fait, et quand ». */}
					<p className="text-cladd-2xs text-cladd-fg-softer">Journal</p>
					{suivi.journal.map((ligne) => (
						<p
							key={`${ligne.cle}-${ligne.survenuLe}`}
							className="flex items-baseline justify-between gap-cladd-3xs text-cladd-2xs"
						>
							<span className="text-cladd-fg-soft">{ligne.libelle}</span>
							<span className="shrink-0 text-cladd-fg-softer tabular-nums">
								{dateCourte(ligne.survenuLe)}
							</span>
						</p>
					))}
				</Surface>
			) : null}
		</div>
	);
}

/**
 * Une échéance datée, et le temps qui reste.
 *
 * ⚠️ « DANS 12 JOURS » ET PAS SEULEMENT LA DATE. Un gérant qui lit
 * « 10/04/2026 » doit faire la soustraction ; celui qui lit « dans 12 jours »
 * sait s'il a le temps. Et une date dépassée le DIT — la cacher laisserait
 * croire qu'il reste du temps sur une ordonnance déjà caduque.
 */
function Echeance({ echeance, aujourdHui }: { echeance: EcheanceAffichee; aujourdHui: string }) {
	const jours = joursDici(echeance.dateLimite, aujourdHui);
	const caducite = echeance.gravite === 'CADUCITE';

	return (
		<div className="flex flex-col gap-1 border-t border-cladd-bg-outline pt-cladd-3xs">
			<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
				<span className="flex items-center gap-1.5 text-cladd-xs font-medium">
					{caducite ? (
						<AlertTriangleIcon className="text-cladd-red size-3.5 shrink-0" aria-hidden />
					) : null}
					{echeance.libelle}
				</span>
				<Chip size="md" color={caducite ? 'red' : 'neutral'}>
					{jours < 0
						? `dépassée depuis ${-jours} j`
						: jours === 0
							? 'aujourd’hui'
							: `dans ${jours} j`}
				</Chip>
			</div>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				{dateCourte(echeance.dateLimite)} — {echeance.consequence}
			</p>
		</div>
	);
}

/**
 * Le nombre de jours SIGNÉ d'ici à une date.
 *
 * Négatif quand la date est passée : `decompte.ts` ramène les négatifs à zéro,
 * ce qui est juste pour des intérêts et faux ici. Une échéance dépassée doit se
 * lire comme dépassée.
 */
function joursDici(dateLimite: string, aujourdHui: string): number {
	const MS_PAR_JOUR = 86_400_000;
	return Math.round((Date.parse(dateLimite) - Date.parse(aujourdHui)) / MS_PAR_JOUR);
}
