import { UploadIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	CeQuiEstDu,
	Lien,
	PageEcran,
	type BilanPertesAffiche,
	type Lecture,
	type RevelationAffichee
} from '../ui';

/** Ce que la page affiche : la révélation arrêtée au jour, et le bilan de ce qui s'est éteint. */
export interface RevelationDuJour {
	readonly revelation: RevelationAffichee;
	readonly bilan: BilanPertesAffiche;
	/**
	 * LE JOUR OÙ LE CHIFFRE EST ARRÊTÉ.
	 *
	 * ⚠️ IL S'AFFICHE, ET IL NE SE DEVINE PAS. Un montant de créance sans son
	 * jour n'est pas refaisable à la main : les intérêts courent, donc le même
	 * calcul rend autre chose demain. C'est la route qui le donne, à
	 * `aujourdHuiISO`, la même date que celle passée à la requête — sans quoi
	 * l'écran daterait le chiffre d'un autre jour que celui où il a été calculé.
	 */
	readonly arreteAu: string;
}

/**
 * CE QUI EST DÛ — le chiffre qui justifie l'abonnement.
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
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ C'EST UNE PAGE POUSSÉE, ET ELLE LE DIT MAINTENANT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Elle n'est PAS une destination de la barre du bas : on y arrive depuis
 * l'accueil, par le veilleur qui rend compte de la surveillance des délais
 * (`ui/veilleur.tsx`). Elle s'annonçait pourtant en `onglet`, donc sans aucun
 * retour : le seul moyen de revenir était de viser un onglet de la barre, ce
 * qui n'est pas revenir mais partir ailleurs. Deux niveaux au maximum, et le
 * second porte son chevron.
 *
 * ⚠️ AUCUN POURCENTAGE, AUCUNE PROMESSE. Rien n'affirme qu'une somme rentrera :
 * le produit MESURE, DOCUMENTE et ALERTE. La décision d'agir et le recouvrement
 * lui-même restent au client.
 */
export function EcranRevelation({ donnees }: { donnees: Lecture<RevelationDuJour> }) {
	const entete = {
		genre: 'poussee',
		titre: 'Ce qui est dû',
		/*
		  ⚠️ « VOTRE FILE », LE NOM QUE `/app` SE DONNE — pas « Aujourd'hui », le
		  nom que la barre du bas lui donne. Ce libellé n'apparaît qu'après un
		  rechargement, quand l'historique n'a plus de titre de provenance ; le
		  reste du temps c'est le titre publié par l'écran quitté qui s'affiche,
		  et il dit « Votre file ». Deux noms pour le même retour selon qu'on a
		  rechargé ou non, c'est exactement la divergence que `screens/titres.ts`
		  existe pour empêcher — le nom de `/app` n'y figure pas encore, et sa
		  place est là.
		*/
		retour: { vers: '/app', libelle: 'Votre file' }
	} as const;

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;

	const { revelation, bilan, arreteAu } = donnees.valeur;

	// LE VIDE MONTRE LE CHEMIN, jamais des cadrans à zéro (règle d'écran n° 4).
	// Un établissement sans facture en retard ne voit pas « 0,00 € dus » : il
	// voit par où commencer.
	//
	// ⚠️ « RIEN À RÉVÉLER » N'EST PAS « RIEN N'A PU ÊTRE CHIFFRÉ ». Zéro facture
	// chiffrée AVEC des factures non chiffrées n'est pas un écran vide : c'est un
	// écran qui doit nommer ce qui l'empêche de compter, et `CeQuiEstDu` s'en
	// charge. Confondre les deux ferait disparaître ces factures-là de la seule
	// page qui les mentionne.
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
		<PageEcran entete={entete}>
			<CeQuiEstDu revelation={revelation} bilan={bilan} arreteAu={arreteAu} />
		</PageEcran>
	);
}
