import { PlusIcon } from 'lucide-react';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';
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
 */
function questions(): readonly { question: string; reponse: string }[] {
	const indemnite = PARAMETRES.indemniteForfaitaire;
	const montant =
		estUtilisable(indemnite) && indemnite.valeur !== null
			? ` et ${eurosCentimesCourts(indemnite.valeur)} de frais par facture`
			: ' et des frais forfaitaires par facture';

	return [
		{
			question: 'Letikette contacte-t-il mes clients ?',
			reponse:
				'Seulement si vous le décidez. Une fois les relances activées, les rappels et la lettre officielle partent par e-mail à votre nom, et chacun s’affiche une heure avant de partir pour que vous puissiez le retenir. Les réponses arrivent à votre adresse.'
		},
		{
			question: 'Letikette encaisse-t-il l’argent ?',
			reponse:
				'Non. Votre client paie par virement directement sur votre compte. Aucune commission n’est prélevée.'
		},
		{
			question: 'Comment les montants sont-ils calculés ?',
			reponse: `Selon le code de commerce : des pénalités au taux de la BCE majoré de dix points${montant}. Chaque montant est détaillé période par période.`
		},
		{
			question: 'Dois-je ressaisir mes factures ?',
			reponse:
				'Non. Importez l’export de votre logiciel comptable (FEC), vos factures Factur-X ou vos PDF.'
		},
		{
			question: 'Letikette remplace-t-il un avocat ?',
			reponse:
				'Non. Letikette calcule et prépare, sans donner de conseil juridique. Pour agir en justice, vous transmettez le dossier à l’avocat ou au commissaire de justice de votre choix.'
		},
		{
			question: 'Où sont mes données ?',
			reponse:
				'Chez nos prestataires d’hébergement, listés avec leur pays dans la politique de confidentialité. Les échanges sont chiffrés et vos données séparées de celles des autres entreprises.'
		},
		{
			question: 'Puis-je arrêter quand je veux ?',
			reponse: `Oui, sans engagement. L’essai dure ${DUREE_ESSAI_JOURS} jours et ne demande pas de carte bancaire.`
		}
	];
}

export function Faq() {
	return (
		<SectionMarketing id="faq" ton="creme" className="gap-cladd-lg">
			<div className="grid gap-cladd-lg md:grid-cols-5">
				<div className="flex flex-col gap-cladd-2xs md:col-span-2">
					<TitreSection>Vos questions, nos réponses.</TitreSection>
				</div>
				<div className="faq flex flex-col gap-cladd-3xs md:col-span-3">
					{questions().map(({ question, reponse }) => (
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
