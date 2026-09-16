import { UploadIcon } from 'lucide-react';
import {
	BilanPertes,
	BoutonPrincipal,
	Lien,
	ChocRevelation,
	PageEcran,
	SectionEcran,
	type BilanPertesAffiche,
	type Lecture,
	type RevelationAffichee
} from '../ui';

/** Ce que la page affiche : la révélation arrêtée au jour, et le bilan de ce qui s'est éteint. */
export interface RevelationDuJour {
	readonly revelation: RevelationAffichee;
	readonly bilan: BilanPertesAffiche;
}

/**
 * CE QUE VOS FACTURES PORTENT — le choc du premier import.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI C'EST UN ÉCRAN À PART, ET PAS UN BLOC EN TÊTE DU FLUX
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le plan prévoyait de poser le compteur vivant en haut de l'écran « À
 * traiter ». Le flux y porte DÉJÀ un compteur — « Factures identifiées,
 * principal TTC, hors intérêts de retard et indemnité forfaitaire » — et les
 * deux mesurent honnêtement deux choses différentes. Côte à côte, ils se
 * liraient comme une contradiction : deux chiffres, deux libellés longs, et un
 * gérant qui se demande lequel croire.
 *
 * ⚠️ SUR UN PRODUIT DONT L'ARGUMENT ENTIER EST L'EXACTITUDE, DEUX TOTAUX SUR
 * LE MÊME ÉCRAN COÛTENT PLUS QU'ILS N'APPORTENT. Un seul récit par écran : le
 * flux dit ce qui a bougé, celui-ci dit ce que ça pèse, intérêts compris.
 */
export function EcranRevelation({ donnees }: { donnees: Lecture<RevelationDuJour> }) {
	const entete = { genre: 'onglet', titre: 'Ce que vos factures portent' } as const;

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;

	const { revelation, bilan } = donnees.valeur;

	// LE VIDE MONTRE LE CHEMIN, jamais des cadrans à zéro (règle d'écran n° 4).
	// Un établissement sans facture en retard ne voit pas « 0,00 € dus » : il
	// voit par où commencer.
	const rienAReveler = revelation.nombreFactures === 0 && revelation.nonChiffrees.length === 0;

	if (rienAReveler) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '🧾',
						titre: 'Rien à chiffrer pour l’instant',
						explication:
							'Trois choses sont dues de plein droit sur une facture payée en retard, et presque jamais réclamées : les intérêts de retard, l’indemnité forfaitaire de 40 € par facture, et ce que le délai de prescription laisse encore le temps de demander. Le logiciel les calcule sur vos propres factures.',
						etapes: [
							'Importez un export comptable — c’est le plus complet : il porte vos factures, vos règlements et vos clients d’un coup.',
							'À défaut, déposez vos factures de vente en PDF ou en photo.',
							'Le chiffre apparaît dès le premier dépôt, décomposé facture par facture.'
						],
						action: (
							<BoutonPrincipal as={Lien} to="/app/import-factures">
								<UploadIcon />
								Importer mes factures
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	return (
		<PageEcran entete={{ ...entete, sousTitre: 'Relevé au jour d’aujourd’hui' }}>
			{/*
			  ⚠️ LE COMPTEUR VIVANT A ÉTÉ RETIRÉ D'ICI, ET C'ÉTAIT UNE
			  REDONDANCE À TROIS ÉTAGES.

			  Il affichait le TOTAL — que le hero de l'accueil porte
			  désormais en corps de soixante-douze pixels, à un geste d'ici.
			  Et `ChocRevelation`, juste au-dessus, énumère déjà les trois
			  parts de ce total : intérêts, indemnité, principal.

			  Le même chiffre trois fois sur un écran ne le rend pas plus
			  vrai ; il fait chercher lequel des trois compte. Cet écran-ci a
			  son propre argument — le SUPPLÉMENT, ce qui n'était jamais
			  réclamé — et c'est le seul qui a le droit d'y être en grand.
			*/}
			<ChocRevelation revelation={revelation} />

			<SectionEcran titre="Ce qui s’est éteint">
				<BilanPertes bilan={bilan} />
			</SectionEcran>
		</PageEcran>
	);
}
