import { Popup, PopupContent, Chip, SectionTitle } from '@cladd-ui/react';
import { BoutonPrincipal } from './bouton';

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
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">{voie.nom}</span>}
			contentClassName="max-w-lg"
		>
			<PopupContent>
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
			</PopupContent>

			{voie.etapes.length === 0 ? null : (
				<PopupContent>
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
				</PopupContent>
			)}

			{voie.conditionsEchec.length === 0 ? null : (
				<PopupContent>
					<SectionTitle>Ce qui la fait échouer</SectionTitle>
					<ul className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
						{voie.conditionsEchec.map((condition) => (
							<li key={condition} className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{condition}
							</li>
						))}
					</ul>
				</PopupContent>
			)}

			{voie.etapes.length === 0 ? null : (
				<PopupContent>
					{/*
					  ⚠️ « JE L'AI ENGAGÉE », AU PASSÉ. « Engager cette procédure »
					  ferait du logiciel l'auteur de l'acte et du bouton une
					  recommandation. Troisième ligne rouge du projet.
					*/}
					{/*
					  ⚠️ ET C'EST `BoutonPrincipal`, PAS UN `Button color="brand"`.
					  Mesuré au navigateur : `color="brand"` sur le variant par défaut
					  rend un bouton au fond TRANSPARENT avec du texte bleu, c'est-à-dire
					  quelque chose qui se lit comme un lien. L'action la plus lourde de
					  tout le produit — celle qui met des délais à courir — ne peut pas
					  être le seul élément de la feuille qu'on ne voit pas.

					  `bouton.tsx` documente pourquoi l'action principale de ce produit
					  est une pilule blanche : le bleu de marque se fond dans le shader
					  du fond. La feuille a beau avoir sa propre surface, une deuxième
					  grammaire d'action principale dans le même produit en ferait deux.
					*/}
					<BoutonPrincipal pleineLargeur onClick={onDeclarer}>
						Je l’ai engagée
					</BoutonPrincipal>
				</PopupContent>
			)}
		</Popup>
	);
}
