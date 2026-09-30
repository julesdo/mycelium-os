import { Chip } from '@cladd-ui/react';

/**
 * LES FAITS DU DOSSIER, EN PASTILLES.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI DES PASTILLES ET PAS DES RANGÉES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'en-tête portait une rangée d'identité du client (déjà dans le titre de la
 * page), puis une carte de deux `LigneValeur` — « Échéance la plus ancienne » et
 * « Date limite pour agir en justice » — soit deux lignes de 48 px pour deux
 * dates de dix caractères. Les autres faits du dossier (une procédure
 * collective, un paiement partiel, le délai retenu faute de secteur connu)
 * vivaient, eux, dans des cartes de prose de soixante à cent mots, plus bas.
 *
 * Six faits, dispersés sur quatre écrans. Ils tiennent ici en deux lignes.
 *
 * C'est le geste de Linear sur sa page d'issue : un fait qui tient en trois mots
 * est une pastille, pas une rangée. Et c'est ce qui sert le moment d'usage le
 * plus fréquent du produit — le client au téléphone, qui veut un chiffre et une
 * date à voix haute, en cinq secondes.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUNE COULEUR DE SEUIL, MÊME POUR CE QUI INQUIÈTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une procédure collective est grave, et la tentation est de la peindre en
 * ambre. Interdit : `--color-seuil-proche` ne doit jamais signifier autre chose
 * que « tout près du seuil », sinon plus aucune jauge du produit ne se lit d'un
 * coup d'œil. Un fait marquant emprunte l'accent `orange` du kit — celui du
 * bandeau d'alerte — qui est un autre jeton, et il porte aussi un poids de
 * texte. La couleur seule ne porte jamais l'information.
 */

export interface FaitDuDossier {
	readonly cle: string;
	/** Trois mots, quatre au plus. Une phrase irait à la page. */
	readonly texte: string;
	/** Ce fait change la lecture du dossier. Il se distingue ; il ne crie pas. */
	readonly marquant?: boolean;
}

export function FaitsDuDossier({
	faits,
	supposition
}: {
	readonly faits: readonly FaitDuDossier[];
	/**
	 * Ce que le logiciel a SUPPOSÉ, en une ligne, et ce qui le lève.
	 *
	 * ⚠️ ELLE NE SE REPLIE PAS, ET ELLE NE SE TAIT PAS. Une hypothèse repliée est
	 * une hypothèse qu'on ne lit pas, et le doute ne profite jamais au produit :
	 * un utilisateur qui croit sa date limite surveillée ne la surveille pas
	 * lui-même. Elle a quitté sa carte de cent mots en bas de colonne pour venir
	 * ici, sous le chiffre, en une ligne qu'on ne peut pas manquer.
	 */
	readonly supposition?: string | null;
}) {
	if (faits.length === 0 && (supposition === null || supposition === undefined)) return null;
	return (
		<div className="flex flex-col gap-cladd-3xs">
			{faits.length === 0 ? null : (
				<ul className="flex flex-wrap gap-1">
					{faits.map((fait) => (
						<li key={fait.cle}>
							{/*
							  ⚠️ `sm`, ET C'EST UN PLANCHER MESURÉ, PAS UN GOÛT. `md` tombe sur
							  les 48 px du doigt par l'échelle décalée du produit, et six
							  pastilles de 48 px feraient cent pixels de haut pour vingt mots :
							  une pastille qu'on ne touche pas n'a pas à tenir le plancher
							  tactile. Mais `xs` rendait un texte de 10 px, sous les 12 px de
							  `text-cladd-2xs` qui est le plus petit corps du produit — et ces
							  pastilles portent les DATES, c'est-à-dire ce qu'on vient lire à
							  voix haute avec un client au téléphone.
							*/}
							<Chip
								size="sm"
								rounded
								variant="transparent"
								color={fait.marquant === true ? 'orange' : undefined}
								className={fait.marquant === true ? 'font-semibold' : undefined}
							>
								{fait.texte}
							</Chip>
						</li>
					))}
				</ul>
			)}
			{supposition === null || supposition === undefined ? null : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-softer">{supposition}</p>
			)}
		</div>
	);
}
