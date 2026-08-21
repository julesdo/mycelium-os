import { Button } from '@cladd-ui/react';
import { DownloadIcon } from 'lucide-react';
import { SectionEcran, ChampCopiable, euros, pourcent, FAMILLES, type Famille } from '../../ui';

/**
 * Les chiffres à recopier dans la téléprocédure « ma cantine ».
 *
 * POURQUOI C'EST ICI ET PLUS SUR SON PROPRE ÉCRAN. Ces montants existaient
 * ailleurs, calculés sur les lignes VIVANTES, pendant que le bilan affichait
 * les siens, figés. Deux séries de chiffres pour le même exercice, dans le même
 * produit, qui divergent dès qu'une classification est corrigée : le gérant ne
 * savait plus lesquels déclarer, et rien ne l'aidait à choisir.
 *
 * Ils viennent donc du bilan qu'il a sous les yeux. C'est aussi le plus
 * défendable : ce qu'il déclare correspond exactement à la pièce qu'il pourra
 * présenter, à la virgule et à la date près.
 *
 * LE FORMAT COPIÉ N'EST PAS CELUI QUI EST AFFICHÉ. Un montant se lit avec ses
 * séparateurs et son symbole, et se saisit en chiffres bruts. Coller
 * « 168 400 € » dans un champ numérique donne au mieux une erreur de saisie,
 * au pire un zéro accepté en silence.
 */

const brut = (montant: number): string => montant.toFixed(2);

export interface ChiffresDeclaration {
	annee: string;
	etablissement: string;
	siret: string | null;
	dateMesure: string;
	totalAlimentaireHT: number;
	bioHT: number;
	durableHorsBioHT: number;
	taux: { durable: number; bio: number; meatFishDurable: number };
	seuils: { durable: number; bio: number; viandePoissonDurable: number };
	parFamille: ReadonlyArray<{
		family: string;
		totalHT: number;
		durableHT: number;
		bioHT: number;
	}>;
}

/**
 * Les montants du bilan, tels que la déclaration les demande.
 *
 * Sommés depuis `byFamily` plutôt que dérivés des ratios : un ratio multiplié
 * par un total redonne un montant à quelques centimes près, et une déclaration
 * se remplit avec des euros, pas avec des approximations.
 */
export function chiffresDepuisBilan(d: {
	periodStart: string;
	organizationName: string;
	siret: string | null;
	dateMesure: string;
	ratios: { durable: number; bio: number; meatFishDurable: number; totalFoodHT: number };
	seuils: { durable: number; bio: number; viandePoissonDurable: number };
	byFamily: ReadonlyArray<{ family: string; totalHT: number; durableHT: number; bioHT: number }>;
}): ChiffresDeclaration {
	const bioHT = d.byFamily.reduce((s, f) => s + f.bioHT, 0);
	const durableHT = d.byFamily.reduce((s, f) => s + f.durableHT, 0);
	return {
		annee: d.periodStart.slice(0, 4),
		etablissement: d.organizationName,
		siret: d.siret,
		dateMesure: d.dateMesure,
		totalAlimentaireHT: d.ratios.totalFoodHT,
		bioHT,
		// Le barème compte le bio dans les deux ratios : le durable INCLUT le bio.
		// La déclaration, elle, demande les deux séparément — d'où la soustraction,
		// et le nom du champ qui la porte.
		durableHorsBioHT: Math.max(0, durableHT - bioHT),
		taux: d.ratios,
		seuils: d.seuils,
		parFamille: d.byFamily
	};
}

export function Declaration({ c }: { c: ChiffresDeclaration }) {
	function telecharger() {
		const lignes: string[][] = [
			['Établissement', c.etablissement],
			['SIRET', c.siret ?? ''],
			['Exercice', c.annee],
			['Bilan édité le', c.dateMesure],
			[],
			['Déclaration simplifiée', 'Montant HT (€)'],
			['Total des achats alimentaires', brut(c.totalAlimentaireHT)],
			['Dont bio', brut(c.bioHT)],
			['Dont durable et de qualité, hors bio', brut(c.durableHorsBioHT)],
			[],
			['Taux', 'Mesuré', 'Seuil légal'],
			['Durable et de qualité', pourcent(c.taux.durable), pourcent(c.seuils.durable)],
			['Biologique', pourcent(c.taux.bio), pourcent(c.seuils.bio)],
			[
				'Viande et poisson durables',
				pourcent(c.taux.meatFishDurable),
				pourcent(c.seuils.viandePoissonDurable)
			],
			[],
			['Par famille', 'Total HT (€)', 'Dont durable (€)', 'Dont bio (€)'],
			...c.parFamille.map((f) => [
				FAMILLES[f.family as Famille] ?? f.family,
				brut(f.totalHT),
				brut(f.durableHT),
				brut(f.bioHT)
			])
		];

		// Point-virgule et BOM : sans les deux, Excel en configuration française
		// ouvre le fichier en une seule colonne, et le comptable le renvoie en
		// disant qu'il est cassé.
		const csv =
			'﻿' +
			lignes.map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');

		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
		const lien = document.createElement('a');
		lien.href = url;
		lien.download = `declaration-egalim-${c.annee}.csv`;
		lien.click();
		URL.revokeObjectURL(url);
	}

	return (
		<SectionEcran
			titre="Vos chiffres à déclarer"
			legende="À recopier sur « ma cantine » avant le 31 mars. Le bouton copie le chiffre brut, sans symbole ni espace — c'est ce que le champ attend."
			actions={
				<Button onClick={telecharger}>
					<DownloadIcon />
					CSV
				</Button>
			}
		>
			<div className="flex flex-col gap-cladd-3xs">
				<ChampCopiable
					majeur
					etiquette="Total des achats alimentaires HT"
					affichage={euros(c.totalAlimentaireHT)}
					valeur={brut(c.totalAlimentaireHT)}
				/>
				<div className="grid gap-cladd-3xs sm:grid-cols-2">
					<ChampCopiable
						majeur
						etiquette="Dont biologique"
						affichage={euros(c.bioHT)}
						valeur={brut(c.bioHT)}
						aide={`${pourcent(c.taux.bio)} des achats · seuil ${pourcent(c.seuils.bio)}`}
					/>
					<ChampCopiable
						majeur
						etiquette="Dont durable et de qualité, hors bio"
						affichage={euros(c.durableHorsBioHT)}
						valeur={brut(c.durableHorsBioHT)}
						aide={`Bio et durable réunis : ${pourcent(c.taux.durable)} · seuil ${pourcent(
							c.seuils.durable
						)}`}
					/>
				</div>
			</div>

			{/* La promesse qu'on ne fait PAS. Un fichier présenté comme importable
			    qui ne l'est pas ferait rater une échéance réglementaire, et c'est
			    le genre de promesse qu'on ne rattrape jamais. */}
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				Ces montants se recopient dans la téléprocédure, champ par champ. Le fichier CSV est un
				récapitulatif pour vos archives et votre comptable&nbsp;: ce n&rsquo;est pas un fichier
				d&rsquo;import officiel, et nous ne prétendons pas qu&rsquo;il en soit un.
			</p>
		</SectionEcran>
	);
}
