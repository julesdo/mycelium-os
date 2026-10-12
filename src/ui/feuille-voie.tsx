import { Chip, SectionTitle } from '@cladd-ui/react';
import { BoutonPrincipal } from './bouton';
import { FeuillePleinEcran, SectionDeFeuille } from './plein-ecran';

/**
 * UNE VOIE, AVANT DE S'Y ENGAGER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉROULÉ SE LIT AVANT LA DÉCISION, PAS APRÈS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le manque que le terrain a nommé en premier : « on ne voit pas les
 * étapes de la procédure ». Elles étaient là, dans `MACHINES`, complètes, avec
 * leurs libellés et leurs conséquences. L'écran affichait une pastille et trois
 * phrases de blocage.
 *
 * ⚠️ ET RIEN ICI N'EST UN CONSEIL. Les étapes sont numérotées parce qu'elles se
 * suivent, pas parce qu'il faudrait les faire. « Ce qui la fait échouer » vient
 * de `conditionsEchec`, qui énonce des faits. Le bouton dit « Je l'ai engagée »,
 * au passé : le gérant déclare, le logiciel compte.
 */

export interface VoieAffichee {
	readonly cle: string;
	readonly nom: string;
	readonly disponible: boolean;
	/** Ce qui empêche, quand quelque chose empêche. */
	readonly blocages: readonly string[];
	/** Le déroulé, tiré de la machine à états. Vide si la voie n'en a pas. */
	readonly etapes: readonly {
		readonly etat: string;
		readonly libelle: string;
		readonly constat: string;
	}[];
	readonly conditionsEchec: readonly string[];
}

export function FeuilleVoie({
	voie,
	ouverte,
	onFermer,
	onDeclarer
}: {
	voie: VoieAffichee | null;
	ouverte: boolean;
	onFermer: () => void;
	onDeclarer: () => void;
}) {
	if (voie === null) return null;

	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre={voie.nom}
			pied={
				// ⚠️ « JE L'AI ENGAGÉE », AU PASSÉ. « Engager cette procédure » ferait du
				// logiciel l'auteur de l'acte et du bouton une recommandation : troisième
				// ligne rouge du projet. Et c'est `BoutonPrincipal`, pas un `Button
				// color="brand"`, qui rendrait un fond transparent lu comme un lien
				// (`bouton.tsx` dit pourquoi l'action principale est une pilule).
				voie.etapes.length === 0 ? null : (
					<BoutonPrincipal pleineLargeur onClick={onDeclarer}>
						Je l’ai engagée
					</BoutonPrincipal>
				)
			}
		>
			<SectionDeFeuille>
				<div className="flex items-center justify-between gap-cladd-3xs">
					<span className="text-cladd-sm font-bold tracking-tight">{voie.nom}</span>
					<Chip size="md" color={voie.disponible ? 'green' : 'neutral'}>
						{voie.disponible ? 'Envisageable' : 'Indisponible'}
					</Chip>
				</div>
				{voie.blocages.map((blocage) => (
					<p key={blocage} className="mt-cladd-3xs text-cladd-2xs text-cladd-fg-soft">
						{blocage}
					</p>
				))}
			</SectionDeFeuille>

			{voie.etapes.length === 0 ? null : (
				<SectionDeFeuille>
					<SectionTitle>Comment elle se déroule</SectionTitle>
					<ol className="mt-cladd-3xs flex flex-col gap-cladd-2xs">
						{voie.etapes.map((etape, rang) => (
							<li key={etape.etat} className="flex gap-cladd-3xs">
								<span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-cladd-outline text-cladd-2xs font-bold tabular-nums">
									{rang + 1}
								</span>
								<div className="min-w-0">
									<p className="text-cladd-xs font-semibold">{etape.libelle}</p>
									<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
										{etape.constat}
									</p>
								</div>
							</li>
						))}
					</ol>
				</SectionDeFeuille>
			)}

			{voie.conditionsEchec.length === 0 ? null : (
				<SectionDeFeuille>
					<SectionTitle>Ce qui la fait échouer</SectionTitle>
					<ul className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
						{voie.conditionsEchec.map((condition) => (
							<li key={condition} className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{condition}
							</li>
						))}
					</ul>
				</SectionDeFeuille>
			)}
		</FeuillePleinEcran>
	);
}
