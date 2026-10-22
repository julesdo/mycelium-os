import { BoutonSecondaire } from './bouton';
import { dateCourte } from './format';
import { NOM_DU_PILOTE } from './plume';

/**
 * CLASSER UN DOSSIER — une raison à choisir (08/10/2026), dans la conversation du
 * dossier depuis le 22/10/2026 (`screens/dossier-guide/`).
 *
 * Sur le modèle de Cash App (« What type of issue are you having? ») : une carte
 * par raison, son titre et une ligne qui dit ce qu'elle veut dire, puis UN bouton.
 * Wise ferme une demande (« Close request ») ; Stripe marque une facture
 * « uncollectible ». Ici, rien n'est effacé, et le dossier se rouvre d'un toucher.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL. Classer n'est pas « grave » : c'est une décision
 * du gérant, et la feuille la présente comme telle.
 */

export type MotifClassement = 'GESTE_COMMERCIAL' | 'IRRECOUVRABLE' | 'ERREUR' | 'AUTRE';

export const MOTIFS_DE_CLASSEMENT: readonly {
	readonly cle: MotifClassement;
	readonly titre: string;
	readonly ligne: string;
}[] = [
	{
		cle: 'GESTE_COMMERCIAL',
		titre: 'Je fais un geste',
		ligne: 'Vous renoncez à cette somme, pour garder le client.'
	},
	{
		cle: 'IRRECOUVRABLE',
		titre: 'Je n’y crois plus',
		ligne: 'L’entreprise a fermé, ou la somme ne vaut plus la peine.'
	},
	{
		cle: 'ERREUR',
		titre: 'Facture en erreur ou en double',
		ligne: 'Un avoir la corrigera dans votre comptabilité.'
	},
	{ cle: 'AUTRE', titre: 'Autre raison', ligne: 'Dites-la en quelques mots.' }
];

/** Le dossier classé, en tête de sa page : pourquoi, quand, et le geste qui le rouvre. */
export function BandeauDossierClasse({
	libelle,
	le,
	note,
	onRouvrir
}: {
	readonly libelle: string;
	readonly le: string;
	readonly note?: string;
	readonly onRouvrir?: () => void;
}) {
	return (
		<section className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs">
			<p className="text-cladd-sm font-semibold">Classé le {dateCourte(le)}</p>
			<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
				{libelle}
				{note === undefined ? '' : `. ${note}`}
			</p>
			<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
				{NOM_DU_PILOTE} ne le relance plus et ne le surveille plus.
			</p>
			{onRouvrir === undefined ? null : (
				<BoutonSecondaire className="self-start" onClick={onRouvrir}>
					Rouvrir le dossier
				</BoutonSecondaire>
			)}
		</section>
	);
}
