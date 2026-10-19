import { majorationPubliqueLisible } from '../verticales/recouvrement/pays/france/commande-publique';
import { majorationLisible } from '../verticales/recouvrement/pays/france/taux';
import { GRILLE, OFFRES, PARTENARIAT_CABINET } from '../config/tarifs';
import type { ValeursDeLaLoi } from './modeles';
import type { Parcours } from './parcours';
import type { ValeursPubliques } from './valeurs-loi';

/**
 * LES SCRIPTS D'APPEL, UN PAR PARCOURS (19/10/2026, audit stratégique : « le téléphone
 * passe en premier »).
 *
 * ⚠️ L'OUVERTURE INFORME, PARCE QUE LA CNIL L'EXIGE AUSSI AU TÉLÉPHONE (fiche du
 * 10/06/2026) : qui appelle, pour quelle entreprise, pourquoi, où le numéro a été
 * trouvé, et que la personne peut demander à ne plus être appelée. C'est aussi ce qui
 * rend permis l'e-mail qui suit, quand elle l'accepte.
 *
 * ⚠️ LES LIGNES ROUGES TIENNENT : jamais le mot interdit, jamais une procédure à
 * engager, jamais un résultat promis. Les chiffres de la loi sont lus au registre
 * (`valeurs-loi.ts`), les prix dans la grille (`config/tarifs.ts`).
 */

export interface ScriptDAppel {
	readonly ouverture: string;
	readonly questions: readonly string[];
	readonly phrase: string;
	readonly demande: string;
	readonly objections: ReadonlyArray<{ readonly objection: string; readonly reponse: string }>;
	/** La phrase qui clôt l'appel : la personne peut s'opposer. */
	readonly sortie: string;
}

export interface ContexteDAppel {
	readonly appelant: string;
	readonly entreprise: string;
	readonly prenom?: string;
	/** La vraie source, mise en phrase par `sourceDuContact` ; `null` quand la fiche ne la porte pas. */
	readonly source: string | null;
	readonly loi: ValeursDeLaLoi;
	readonly publiques: ValeursPubliques;
}

function euros(centimes: number): string {
	return `${new Intl.NumberFormat('fr-FR').format(centimes / 100)} €`;
}

const SORTIE =
	'Si vous préférez que je ne vous rappelle pas, dites-le-moi : je vous retire de ma liste.';

/** « j’ai trouvé votre entreprise dans … » ; sans source, l’appelant la dit lui-même. */
function trouvee(c: ContexteDAppel): string {
	return `j’ai trouvé votre entreprise ${c.source ?? '[d’où vient ce numéro]'}`;
}

function bonjour(c: ContexteDAppel): string {
	return c.prenom === undefined ? 'Bonjour' : `Bonjour ${c.prenom}`;
}

function penalitesCommerciales(loi: ValeursDeLaLoi): string {
	const taux =
		loi.taux === null
			? `au taux de la BCE majoré de ${majorationLisible()}`
			: `à ${loi.taux} par an ce semestre`;
	return `${loi.indemnite ?? 'une indemnité forfaitaire'} par facture payée en retard, plus des pénalités ${taux}`;
}

const OBJECTION_PRIX_LOGICIEL = (): { objection: string; reponse: string } => ({
	objection: '« Combien ça coûte ? »',
	reponse: `La découverte est gratuite : on voit ce qu’on vous doit. Ensuite ${GRILLE.solo.mensuel}, ${GRILLE.equipe.mensuel} ou ${GRILLE.pro.mensuel} € HT par mois, aucune commission sur ce qui rentre.`
});

export function scriptDuParcours(parcours: Parcours, c: ContexteDAppel): ScriptDAppel {
	const qui = `${bonjour(c)}, ${c.appelant}, de Letikette, à Paris.`;
	switch (parcours) {
		case 'FOURNISSEUR_PUBLIC': {
			const p = c.publiques;
			const taux =
				p.taux === null
					? `au taux de la BCE majoré de ${majorationPubliqueLisible()}`
					: `à ${p.taux} par an pour un retard qui commence ce semestre`;
			return {
				ouverture: `${qui} Je vous appelle parce que ${c.entreprise} est titulaire de marchés publics : ${trouvee(c)}. C’est au sujet des intérêts de retard que les acheteurs publics doivent sur leurs factures payées en retard. Vous avez deux minutes ?`,
				questions: [
					'Est-ce que vos clients publics, hôpitaux ou collectivités, vous paient parfois après le délai ?',
					'Quand ils paient en retard, est-ce que les intérêts arrivent avec le paiement ?',
					`Avez-vous des factures de ${p.anneeQuiSePrescrit} réglées en retard par un acheteur public ?`
				],
				phrase: `Le code de la commande publique fait courir des intérêts de plein droit dès le lendemain du délai de paiement (${p.delaiCollectivite} jours, ${p.delaiHopital} pour un hôpital), ${taux}, plus ${p.indemnite ?? 'une indemnité forfaitaire'} de frais de recouvrement. Les intérêts d’une prestation de ${p.anneeQuiSePrescrit} pourraient ne plus se réclamer après le ${p.dernierJour} (ils peuvent se prescrire) : une réclamation écrite envoyée avant cette date interrompt le délai.`,
				demande: `Je peux calculer ce que vos acheteurs publics vous doivent, facture par facture, et préparer les courriers de réclamation à votre nom, prêts à signer. Vous m’envoyez vos factures et leurs dates de paiement ?`,
				objections: [
					{
						objection: '« On a été payés. »',
						reponse: `Le principal, oui. Les intérêts et l’indemnité se paient à part, dans les ${p.joursPourLesAccessoires} jours qui suivent le paiement du principal : s’ils ne sont pas arrivés, la réclamation les chiffre.`
					},
					{
						objection: '« Je ne veux pas froisser l’hôpital. »',
						reponse:
							'Le courrier est un rappel réglementaire, à votre nom : il cite le code de la commande publique, décompose chaque facture et ne menace de rien. Vous le relisez et vous l’envoyez vous-même.'
					},
					{
						objection: '« Combien ça coûte ? »',
						reponse: `Le calcul est gratuit. Les courriers clés en main : ${OFFRES.reclamation.pourcent} % du montant calculé, entre ${euros(OFFRES.reclamation.minimumCentimes)} et ${euros(OFFRES.reclamation.maximumCentimes)}, payés d’avance.`
					}
				],
				sortie: SORTIE
			};
		}
		case 'TRANSPORTEUR': {
			const unAn = c.loi.delaiTransport;
			const general = c.loi.delaiGeneral;
			return {
				ouverture: `${qui} Je vous appelle parce que ${c.entreprise} fait du transport routier : ${trouvee(c)}. C’est au sujet des factures de transport payées en retard. Vous avez deux minutes ?`,
				questions: [
					'Vous travaillez en sous-traitance pour des commissionnaires ?',
					'Vous avez des factures qui tardent à être payées en ce moment ?',
					'Est-ce qu’il vous est arrivé de ne jamais être payé d’un transport ?'
				],
				phrase: `Une facture de transport ne se réclame en justice que pendant ${unAn === 1 ? 'un an' : `${unAn} ans`}, contre ${general} ans pour la plupart des factures, à compter de la livraison. Et chaque facture payée en retard ouvre droit à ${penalitesCommerciales(c.loi)}. Letikette lit vos factures, surveille cette date pour chacune et relance vos clients à votre nom.`,
				demande:
					'Je peux vous montrer ce que vos clients vous doivent, sur vos propres factures, en dix minutes. On regarde ensemble cette semaine ?',
				objections: [
					{
						objection: '« Mon client est en faillite. »',
						reponse:
							'Le logiciel montre ce que dit la loi et ce qu’il y a dans le dossier ; un avocat vous dira quelle voie ouvrir. Letikette lui prépare le dossier chiffré.'
					},
					OBJECTION_PRIX_LOGICIEL()
				],
				sortie: SORTIE
			};
		}
		case 'EXPERT_COMPTABLE':
			return {
				ouverture: `${qui} Je développe un logiciel pour les impayés des TPE et PME, et ${trouvee(c)}. Je ne vous vends rien aujourd’hui : je cherche l’avis de cabinets. Vous avez deux minutes ?`,
				questions: [
					'Parmi vos clients, combien ont des impayés qui reviennent ?',
					'Que leur proposez-vous aujourd’hui quand une facture traîne ?',
					'Est-ce qu’ils réclament les frais de recouvrement et les pénalités de retard ?'
				],
				phrase: `Letikette lit les factures du client, chiffre ce que la loi y ajoute (${penalitesCommerciales(c.loi)}), surveille les délais pour agir et relance à son nom, sans commission sur ce qui rentre.`,
				demande:
					`Je construis le partenariat cabinet avec les ${PARTENARIAT_CABINET.premiersCabinets} premiers cabinets : le diagnostic à proposer à vos clients, et ${PARTENARIAT_CABINET.commissionPourcent} % de la première année de ceux qui s’abonnent. Je peux vous le montrer vingt minutes ?`,
				objections: [
					{
						objection: '« Mes clients ont déjà Pennylane ou Qonto. »',
						reponse:
							'Elles relancent ; Letikette ajoute le calcul des frais de recouvrement et des pénalités et la date limite pour agir. Les deux se branchent ensemble.'
					}
				],
				sortie: SORTIE
			};
		case 'PILOTE':
			return {
				ouverture: `${qui} Je vous appelle parce que ${c.entreprise} gère beaucoup de factures clients : ${trouvee(c)}. Vous avez deux minutes ?`,
				questions: [
					'Quel logiciel de comptabilité utilisez-vous : Sage, Cegid, EBP ?',
					'Combien de factures émettez-vous par mois, à peu près ?',
					'Qui suit les relances aujourd’hui, et combien de temps ça lui prend ?'
				],
				phrase: `Letikette chiffre ce que la loi ajoute à chaque facture payée en retard (${penalitesCommerciales(c.loi)}) et relance à votre nom. Pour les logiciels sans connecteur, le pilote met en place l’échange de données et votre poste client.`,
				demande: `Le pilote dure ${OFFRES.pilote.dureeJours} jours, pour ${euros(OFFRES.pilote.prixCentimes)} HT, la formule Pro comprise. On prend un rendez-vous pour regarder votre poste client ?`,
				objections: [OBJECTION_PRIX_LOGICIEL()],
				sortie: SORTIE
			};
		case 'PME_LOGICIEL':
			return {
				ouverture: `${qui} Je vous appelle parce que ${c.entreprise} facture d’autres entreprises : ${trouvee(c)}. C’est au sujet des factures payées en retard. Vous avez deux minutes ?`,
				questions: [
					'Vous avez des clients qui paient en retard en ce moment ?',
					'Est-ce que vous réclamez les frais de recouvrement et les pénalités ?',
					'Qui relance, aujourd’hui ?'
				],
				phrase: `Quand un client professionnel paie en retard, la loi vous accorde ${penalitesCommerciales(c.loi)}. Letikette lit vos factures, chiffre ce qui vous est dû au centime et relance vos clients à votre nom quand vous l’avez décidé.`,
				demande:
					'Le diagnostic est gratuit : trois mois de factures, et la somme en jeu en dix minutes. Je vous envoie le lien par e-mail ?',
				objections: [OBJECTION_PRIX_LOGICIEL()],
				sortie: SORTIE
			};
	}
}
