import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { tauxPenaliteParDefaut } from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { eurosCentimesCourts, tauxLisible } from '../ui/format';
import { cn, PictoInterets, PictoFacture, PictoPrescription } from '../ui';
import { ARTICLES_DU_SOCLE } from './articles';
import { Chapeau, SectionMarketing, TitreSection, fondDeTeinte, type TeinteSite } from './section';

/**
 * CE QUE LA LOI VOUS DOIT — trois chiffres, trois cartes (06/10/2026).
 *
 * ⚠️ AUCUN CHIFFRE N'EST ÉCRIT ICI. Le taux est réancré chaque semestre et se lit
 * sur la série relevée ; l'indemnité et les durées viennent des paramètres et du
 * module de prescription, chacun avec sa source. Une valeur non relevée se
 * replie sur la règle (« BCE + 10 pts »), jamais sur un nombre de mémoire.
 *
 * ⚠️ LA TEINTE DIT DE QUOI IL S'AGIT, comme dans le produit : le taux est de
 * l'argent (bleu), l'indemnité tient à chaque facture (les papiers, ciel), le
 * délai est du temps (lavande). Mural et Loom pour les grandes tuiles teintées.
 */
function seuilsDeLaLoi(aujourdHui: string) {
	let taux: string;
	try {
		taux = tauxLisible(tauxPenaliteParDefaut(aujourdHui));
	} catch {
		taux = 'BCE + 10 pts';
	}
	const indemnite = PARAMETRES.indemniteForfaitaire;
	const general = REGIMES_PRESCRIPTION.GENERAL;
	const transport = REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES;
	const consommateur = REGIMES_PRESCRIPTION.CONSOMMATEUR;

	return [
		{
			valeur: taux,
			titre: 'de pénalités de retard par an',
			detail: 'Taux de la BCE majoré de dix points, mis à jour chaque semestre.',
			teinte: 'argent' as TeinteSite,
			Picto: PictoInterets
		},
		{
			valeur: estUtilisable(indemnite) ? eurosCentimesCourts(indemnite.valeur) : '40 €',
			titre: 'par facture en retard',
			detail: 'Frais de recouvrement dus dès le premier jour de retard, pour chaque facture.',
			teinte: 'papiers' as TeinteSite,
			Picto: PictoFacture
		},
		{
			valeur: `${general.dureeAnnees} ans`,
			titre: 'pour agir en justice',
			detail: `${transport.dureeAnnees} an pour le transport de marchandises, ${consommateur.dureeAnnees} ans pour une vente à un particulier. Au-delà, la facture ne se réclame plus.`,
			teinte: 'temps' as TeinteSite,
			Picto: PictoPrescription
		}
	] as const;
}

export function LaLoi() {
	const aujourdHui = new Date().toISOString().slice(0, 10);
	const seuils = seuilsDeLaLoi(aujourdHui);

	return (
		<SectionMarketing id="la-loi" ton="profond" className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<TitreSection suite="sur chaque facture en retard.">Ce que la loi vous doit</TitreSection>
				<Chapeau>
					Dû automatiquement, sans clause au contrat. Letikette le calcule pour vous.
				</Chapeau>
			</div>

			{/*
			  ⚠️ LES LIGNES S'ALIGNENT D'UNE CARTE À L'AUTRE (06/10/2026). Chaque carte
			  est une sous-grille de quatre rangées partagées : pictogramme, chiffre,
			  titre, détail. Le titre de la deuxième carte tombe donc à la hauteur de
			  celui de la première, même si un chiffre ou un détail est plus long. Et le
			  chiffre ne passe jamais à la ligne : « 12,40 % » coupé en deux décalait
			  toute la rangée (relevé du fondateur).
			*/}
			<dl className="cascade grid gap-cladd-sm md:grid-cols-3 md:gap-x-cladd-2xs md:gap-y-0">
				{seuils.map(({ valeur, titre, detail, teinte, Picto }) => (
					<div
						key={titre}
						className={cn(
							'flex flex-col gap-cladd-2xs rounded-carte-site p-cladd-xs md:row-span-4 md:grid md:grid-rows-subgrid',
							fondDeTeinte(teinte)
						)}
					>
						<span className="flex size-11 items-center justify-center rounded-full bg-papier">
							<Picto className="size-6 text-encre-site" />
						</span>
						<dt className="font-serif text-affiche-colonne leading-none font-medium tracking-titre-section whitespace-nowrap tabular-nums">
							{valeur}
						</dt>
						<dd className="text-intertitre leading-snug font-semibold">{titre}</dd>
						<dd className="hidden text-cladd-md leading-relaxed text-encre-site-douce md:block">
							{detail}
						</dd>
					</div>
				))}
			</dl>

			{/* LA SOURCE, en une ligne sous les chiffres : l'endroit où un lecteur la
			    cherche, plutôt qu'une étiquette au-dessus du titre. */}
			{ARTICLES_DU_SOCLE.length > 0 ? (
				<p className="text-cladd-sm text-encre-site-claire">
					Code de commerce, art. {ARTICLES_DU_SOCLE.join(', ')}.
				</p>
			) : null}
		</SectionMarketing>
	);
}
