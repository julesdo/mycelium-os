import { majorationLisible } from '../lib/verticales/recouvrement/pays/france/taux';
import { PlusIcon } from 'lucide-react';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import {
	DUREE_ESSAI_JOURS,
	JOURS_DE_REMBOURSEMENT,
	LIMITES,
	RAPPELS_AVANT_PRELEVEMENT_JOURS
} from '../lib/config/tarifs';
import { dureePourRetenir, FORMATS_LUS, LOGICIELS_BRANCHES } from './fonctionnalites';
import { eurosCentimesCourts } from '../ui/format';
import { SectionMarketing, TitreSection } from './section';

/**
 * QUESTIONS FRÉQUENTES (06/10/2026).
 *
 * Les objections d'un gérant, une réponse de deux phrases au plus — Tally,
 * Lassie et Dovetail. Elle reprend ce que disaient en long « Ce que Letikette
 * ne fera jamais » et « Pourquoi un abonnement ».
 *
 * ⚠️ `<details>` NATIF : chaque réponse s'ouvre sans une ligne de script, et
 * reste lisible par un moteur de recherche. Le triangle du navigateur est
 * masqué par `.faq` dans `app.css`.
 *
 * ⚠️ LE MONTANT DE L'INDEMNITÉ EST LU SUR LES PARAMÈTRES, et la phrase s'en
 * passe s'il n'est pas relevé.
 *
 * ⚠️ REFAITE LE 14/10/2026 avec le produit d'aujourd'hui : Plume et ses
 * relances, les logiciels branchés (la liste du registre), le coffre-fort. Les
 * questions de facturation ont leur liste, posée sur `/tarifs`.
 */
export interface QuestionReponse {
	readonly question: string;
	readonly reponse: string;
}

function noms(genre: (typeof LOGICIELS_BRANCHES)[number]['genre']): string {
	const liste = LOGICIELS_BRANCHES.filter((l) => l.genre === genre).map((l) => l.nom);
	return liste.length < 2 ? liste.join('') : `${liste.slice(0, -1).join(', ')} ou ${liste.at(-1)}`;
}

export function questionsDeLAccueil(): readonly QuestionReponse[] {
	const indemnite = PARAMETRES.indemniteForfaitaire;
	const montant =
		estUtilisable(indemnite) && indemnite.valeur !== null
			? ` et ${eurosCentimesCourts(indemnite.valeur)} de frais par facture`
			: ' et des frais forfaitaires par facture';

	return [
		{
			question: 'Plume envoie-t-il des e-mails tout seul ?',
			reponse:
				'Seulement si vous l’avez décidé. Une fois les relances activées, Plume envoie les rappels et la lettre officielle par e-mail, à votre nom, sur les dossiers que vous avez démarrés. Les réponses arrivent à votre adresse.'
		},
		{
			question: 'Puis-je retenir une relance ?',
			reponse: `Oui. Chaque relance s’affiche ${dureePourRetenir()} avant de partir et se retient d’un geste. Un paiement reçu entre-temps l’arrête. Rien ne part vers un tribunal.`
		},
		{
			question: 'Letikette encaisse-t-il l’argent ?',
			reponse:
				'Non. Votre client paie par virement directement sur votre compte. Aucune commission n’est prélevée.'
		},
		{
			question: 'Comment les montants sont-ils calculés ?',
			reponse: `Selon le code de commerce : des pénalités au taux de la BCE majoré de ${majorationLisible()}${montant}. Chaque montant est détaillé période par période.`
		},
		{
			question: 'Quels logiciels se branchent ?',
			reponse: `${noms('comptabilite')}, votre banque ${noms('banque')}, et vos fichiers sur ${noms('fichiers')}. Sans logiciel, un dépôt suffit : ${FORMATS_LUS.join(', ')}. Aucune ressaisie.`
		},
		{
			question: 'Letikette remplace-t-il un avocat ?',
			reponse:
				'Non. Letikette calcule et prépare, sans donner de conseil juridique. Pour agir en justice, vous transmettez le dossier à l’avocat ou au commissaire de justice de votre choix ; Letikette vous montre ceux qui exercent près de votre client.'
		},
		{
			question: 'Où vont mes documents ?',
			reponse:
				'Au coffre-fort : chaque document est chiffré dès son arrivée, avec une clé propre à votre entreprise, et chaque accès est noté. Pour être lu, un document passe par notre prestataire de lecture. Nos prestataires sont listés avec leur pays dans la politique de confidentialité.'
		},
		{
			question: 'Quelle formule choisir ?',
			// Les limites viennent de la grille : la réponse ne peut pas contredire la carte.
			reponse: `Solo pour un indépendant ou une micro-entreprise : ${LIMITES.solo.clientsSuivis} clients en retard suivis, un utilisateur. Équipe pour une TPE : ${LIMITES.equipe.clientsSuivis} clients, ${LIMITES.equipe.utilisateurs} utilisateurs. Pro pour une PME : sans limite de clients, ${LIMITES.pro.utilisateurs} utilisateurs. Vous en changez quand vous voulez, au prorata.`
		},
		{
			question: 'Puis-je arrêter quand je veux ?',
			reponse: `Oui, sans engagement. L’essai dure ${DUREE_ESSAI_JOURS} jours : votre carte est enregistrée chez Paddle, rien n’est prélevé avant la fin, et on vous prévient deux jours avant. Vous annulez en deux gestes depuis Compte › Abonnement. Sans carte, Découverte vous montre déjà ce qu’on vous doit.`
		}
	];
}

/** Ce qu'on se demande avant de payer : l'essai, le prélèvement, le remboursement. */
export function questionsDeFacturation(): readonly QuestionReponse[] {
	return [
		{
			question: 'Que se passe-t-il pendant l’essai ?',
			reponse: `Vous avez tout pendant ${DUREE_ESSAI_JOURS} jours. Votre carte est enregistrée chez Paddle, rien n’est prélevé avant la fin, et on vous prévient ${RAPPELS_AVANT_PRELEVEMENT_JOURS[1]} jours avant le premier prélèvement.`
		},
		{
			question: 'Puis-je changer de formule ?',
			reponse:
				'Oui, quand vous voulez, depuis Compte › Abonnement. Vous voyez le prorata avant de confirmer.'
		},
		{
			question: 'Comment résilier ?',
			reponse:
				'En deux gestes, depuis Compte › Abonnement. Votre formule reste active jusqu’à la fin de la période payée.'
		},
		{
			question: 'Puis-je être remboursé ?',
			reponse: `Oui. Un paiement se rembourse intégralement sur demande dans les ${JOURS_DE_REMBOURSEMENT} jours qui le suivent.`
		},
		{
			question: 'Qui m’envoie la facture ?',
			reponse:
				'Paddle, notre revendeur : il encaisse le paiement, émet la facture et ajoute la TVA de votre pays.'
		}
	];
}

export function Faq({
	id = 'faq',
	titre = 'Vos questions, nos réponses.',
	questions = questionsDeLAccueil()
}: {
	id?: string;
	titre?: string;
	questions?: readonly QuestionReponse[];
}) {
	return (
		<SectionMarketing id={id} ton="creme" className="gap-cladd-lg">
			<div className="grid gap-cladd-lg md:grid-cols-5">
				<div className="flex flex-col gap-cladd-2xs md:col-span-2">
					<TitreSection>{titre}</TitreSection>
				</div>
				<div className="faq flex flex-col gap-cladd-3xs md:col-span-3">
					{questions.map(({ question, reponse }) => (
						<details
							key={question}
							className="group rounded-carte-site bg-papier shadow-carte-chaude"
						>
							<summary className="flex min-h-14 cursor-pointer items-center justify-between gap-cladd-2xs px-cladd-xs py-cladd-3xs text-cladd-md font-semibold">
								{question}
								<PlusIcon
									aria-hidden
									size={20}
									className="shrink-0 transition-transform group-open:rotate-45"
								/>
							</summary>
							<p className="px-cladd-xs pb-cladd-xs text-cladd-md leading-relaxed text-encre-site-douce">
								{reponse}
							</p>
						</details>
					))}
				</div>
			</div>
		</SectionMarketing>
	);
}
