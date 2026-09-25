import {
	Tableau,
	TableauCellule,
	TableauCorps,
	TableauEntete,
	TableauLigne,
	TableauTitre,
	dateCourte
} from '../../ui';

/**
 * CE QUE LA FILE PROPOSE, ET CE QU'ON EN FAIT — l'instrument du plafond (D13).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE EXISTE POUR QU'UNE FILE DÉCEVANTE SE CORRIGE AU LIEU DE S'ANNULER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sept propositions par jour est une HYPOTHÈSE DATÉE, écrite pour être
 * déplacée. Sans ces trois nombres, la seule réponse possible à une file qui
 * déçoit serait d'annuler tout le lot ; avec eux, on déplace une constante.
 *
 * ⚠️ REPLIÉE, ET C'EST LA DÉCISION. Ce n'est pas un tableau de bord : c'est un
 * instrument interne, sur une page qu'on ouvre deux fois par an. Déplié, il
 * ferait croire que le gérant a quelque chose à décider dessus, alors qu'il n'a
 * rien à y faire — et il pousserait vers le bas les six sections qui, elles, se
 * règlent.
 *
 * ⚠️ AUCUN POURCENTAGE N'APPROCHE UNE CRÉANCE (D8). Ces taux portent sur un
 * JOUR de l'établissement : ce n'est ni un score de solidité, ni une confiance
 * de modèle, et rien de tout cela ne s'affiche sur une rangée de la file.
 *
 * ⚠️ LES DEUX PREMIERS NOMBRES SE LISENT ENSEMBLE OU NE DISENT RIEN. Une
 * rétention au-dessus de 95 % PENDANT que le nombre de propositions monte n'est
 * pas de la justesse, c'est du « Retenir » à l'aveugle. Les colonnes sont donc
 * côte à côte, et « Posées » ne se replie jamais.
 */

export interface MesureDUnJour {
	readonly jour: string;
	readonly posees: number;
	/** Ce que le plafond a différé. `null` quand le battement n'a rien relevé. */
	readonly enAttente: number | null;
	readonly retenues: number;
	readonly ecartees: number;
	readonly indecises: number;
	readonly tauxRetention: number | null;
	readonly delaiMedianMs: number | null;
	readonly decideesSansHorodatage: number;
	readonly corrections: number;
	readonly tauxCorrection: number | null;
}

export interface MesuresAffichees {
	readonly jours: readonly MesureDUnJour[];
}

/** Un taux lisible, ou un tiret. Jamais « 0 % » là où il n'y a rien à diviser. */
function taux(valeur: number | null): string {
	return valeur === null ? '—' : `${Math.round(valeur * 100)} %`;
}

/**
 * Un délai lisible.
 *
 * ⚠️ LES MILLISECONDES RESTENT VISIBLES SOUS DEUX SECONDES, parce que c'est
 * exactement le seuil qui compte : une médiane sous deux secondes sur une
 * proposition qui porte une source et une page est un tap, pas une lecture.
 * Arrondir à la seconde effacerait la seule chose qu'on cherche à voir.
 */
function delai(ms: number | null): string {
	if (ms === null) return '—';
	if (ms < 2000) return `${Math.round(ms)} ms`;
	// La virgule décimale, pas le point : l'interface est en français, et un
	// « 14.2 s » au milieu d'un tableau se lit comme une copie d'un export.
	if (ms < 90_000) return `${SECONDES.format(ms / 1000)} s`;
	return `${Math.round(ms / 60_000)} min`;
}

const SECONDES = new Intl.NumberFormat('fr-FR', {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1
});

export function SectionMesures({ jours }: MesuresAffichees) {
	const posees = jours.reduce((total, jour) => total + jour.posees, 0);
	const trous = jours.reduce((total, jour) => total + jour.decideesSansHorodatage, 0);

	return (
		/*
		  ⚠️ IL N'Y A PLUS DE `<details>` ICI, ET C'ÉTAIT UN SECOND REPLI. La
		  section entière est désormais une rangée qui se déplie : un pli DANS un
		  pli demandait deux gestes pour lire trois colonnes, et le second n'avait
		  plus rien à protéger — la rangée repliée porte déjà « 3 jours relevés »
		  et aucun taux ne remonte à la surface (`resumeMesures`).
		*/
		<>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				{jours.length} jour{jours.length > 1 ? 's' : ''} relevé{jours.length > 1 ? 's' : ''},{' '}
				{posees} proposition{posees > 1 ? 's' : ''} posée{posees > 1 ? 's' : ''}. Trois nombres, et
				ils se lisent ensemble. Le plafond de propositions descend quand la rétention monte pendant
				que le délai de lecture descend ; il ne monte que si les corrections après coup restent à
				zéro sur un mois plein.
			</p>

			{jours.length === 0 ? (
				<p className="text-cladd-2xs text-cladd-fg-softer">
					Aucun relevé sur la période : la surveillance quotidienne n’a encore rien posé.
				</p>
			) : (
				<div>
					<Tableau legende="Propositions posées, décidées et corrigées, par jour">
						<TableauEntete>
							<TableauTitre>Jour</TableauTitre>
							<TableauTitre aDroite>Posées</TableauTitre>
							<TableauTitre aDroite>En attente</TableauTitre>
							<TableauTitre aDroite>Retenues</TableauTitre>
							<TableauTitre aDroite>Écartées</TableauTitre>
							<TableauTitre aDroite>Rétention</TableauTitre>
							<TableauTitre aDroite>Délai médian</TableauTitre>
							<TableauTitre aDroite>Corrections</TableauTitre>
						</TableauEntete>
						<TableauCorps>
							{jours.map((jour) => (
								<TableauLigne key={jour.jour}>
									{/*
										  ⚠️ LA DATE NE SE COUPE PAS. À 375 px, « 17 sept. 2026 »
										  se replie sur trois lignes et triple la hauteur de chaque
										  rangée ; le conteneur du tableau défile déjà pour lui
										  seul, donc rien n'est perdu à la garder d'un bloc.
										*/}
									<TableauCellule>
										<span className="whitespace-nowrap">{dateCourte(jour.jour)}</span>
									</TableauCellule>
									<TableauCellule aDroite chiffre>
										{jour.posees}
									</TableauCellule>
									{/*
										  ⚠️ UN TIRET, JAMAIS UN ZÉRO. « 0 en attente » se lit comme
										  une réponse — rien ne dépasse — alors que c'est l'absence
										  de relevé. Les deux mènent à deux conclusions opposées.
										*/}
									<TableauCellule aDroite chiffre>
										{jour.enAttente === null ? '—' : jour.enAttente}
									</TableauCellule>
									<TableauCellule aDroite chiffre>
										{jour.retenues}
									</TableauCellule>
									<TableauCellule aDroite chiffre>
										{jour.ecartees}
									</TableauCellule>
									<TableauCellule aDroite chiffre>
										{taux(jour.tauxRetention)}
									</TableauCellule>
									<TableauCellule aDroite chiffre>
										{delai(jour.delaiMedianMs)}
									</TableauCellule>
									<TableauCellule aDroite chiffre>
										{jour.corrections}
										{jour.tauxCorrection === null ? '' : ` (${taux(jour.tauxCorrection)})`}
									</TableauCellule>
								</TableauLigne>
							))}
						</TableauCorps>
					</Tableau>
				</div>
			)}

			{/*
			  ⚠️ CE QUI MANQUE À LA MÉDIANE SE DIT. Une décision sans horodatage
			  d'affichage ne vaut pas un délai de zéro : elle vaut un trou, et un
			  trou tu ferait lire la médiane comme si elle portait sur tout.
			*/}
			{trous > 0 ? (
				<p className="text-cladd-2xs text-cladd-fg-softer">
					{trous} décision{trous > 1 ? 's' : ''} sans horodatage d’affichage
					{trous > 1 ? ' ne sont pas comptées' : ' n’est pas comptée'} dans le délai médian.
				</p>
			) : null}
		</>
	);
}
