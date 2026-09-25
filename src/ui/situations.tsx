import { Surface } from '@cladd-ui/react';
import { dateCourte } from './format';

/**
 * LES SITUATIONS — posées par-dessus les étapes, jamais à leur place.
 *
 * Ce qui se passe, la date limite, ce que le gérant peut faire. ⚠️ Les options
 * sont une liste, pas des boutons : aucune n'est mise en avant, aucune n'est
 * recommandée. Le choix revient au gérant.
 */

export interface SituationAffichee {
	readonly cle: string;
	readonly titre: string;
	readonly ceQuiSePasse: readonly string[];
	readonly dateLimite: {
		readonly date: string;
		readonly libelle: string;
		readonly reporteeDe: string | null;
		readonly departNonPrecise: string | null;
		readonly source: string;
	} | null;
	readonly options: readonly string[];
	readonly citation: {
		readonly texte: string;
		readonly source: string;
		readonly url: string;
	} | null;
}

export function SituationsDossier({ situations }: { situations: readonly SituationAffichee[] }) {
	if (situations.length === 0) return null;
	return (
		<div className="flex flex-col gap-cladd-3xs">
			{situations.map((situation) => (
				<Surface
					key={situation.cle}
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					<p className="text-cladd-sm font-semibold">{situation.titre}</p>
					{situation.ceQuiSePasse.map((phrase) => (
						<p key={phrase} className="text-cladd-xs leading-snug">
							{phrase}
						</p>
					))}

					{situation.dateLimite === null ? null : (
						<div className="flex flex-col gap-0.5 border-t border-cladd-outline pt-cladd-3xs">
							<p className="text-cladd-xs font-semibold">
								{situation.dateLimite.libelle} : avant le {dateCourte(situation.dateLimite.date)}
							</p>
							{situation.dateLimite.reporteeDe === null ? null : (
								<p className="text-cladd-2xs text-cladd-fg-soft">
									Le délai finissait le {dateCourte(situation.dateLimite.reporteeDe)}, un jour non
									ouvrable : il est reporté au premier jour ouvrable suivant.
								</p>
							)}
							{situation.dateLimite.departNonPrecise === null ? null : (
								<p className="text-cladd-2xs text-cladd-fg-soft">
									{situation.dateLimite.departNonPrecise}
								</p>
							)}
							<p className="text-cladd-2xs text-cladd-fg-softest">{situation.dateLimite.source}</p>
						</div>
					)}

					{situation.citation === null ? null : (
						<blockquote className="border-l-2 border-cladd-outline pl-cladd-3xs">
							<p className="text-cladd-2xs leading-relaxed">« {situation.citation.texte} »</p>
							<a
								href={situation.citation.url}
								target="_blank"
								rel="noreferrer"
								className="text-cladd-2xs text-cladd-fg-soft underline"
							>
								{situation.citation.source}
							</a>
						</blockquote>
					)}

					<div className="flex flex-col gap-0.5 border-t border-cladd-outline pt-cladd-3xs">
						<p className="text-cladd-2xs text-cladd-fg-softer">Ce que vous pouvez faire</p>
						<ul className="flex flex-col gap-0.5">
							{situation.options.map((option) => (
								<li key={option} className="text-cladd-xs">
									· {option}
								</li>
							))}
						</ul>
					</div>
				</Surface>
			))}
		</div>
	);
}
