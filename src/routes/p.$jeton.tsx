import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '../app/donnees';
import { api } from '../lib/convex/_generated/api';
import { EcranPaiement } from '../screens/paiement';

/**
 * `/p/<jeton>` — LA PAGE OÙ LE CLIENT DU CRÉANCIER VOIT CE QU'IL DOIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA SEULE ADRESSE DU PRODUIT QU'UN TIERS OUVRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pas d'authentification, et il n'y en aura jamais : le client du créancier n'a
 * pas de compte ici, et lui en demander un serait lui demander de s'inscrire
 * pour payer une facture. Le jeton — un `crypto.randomUUID()` — est la serrure,
 * et la lecture ne rend que ce que le créancier envoie déjà par courrier.
 *
 * ⚠️ L'ADRESSE EST COURTE PARCE QU'ELLE SE RECOPIE. Elle finit dans une lettre
 * papier, et quelqu'un la tape à la main : `/p/<jeton>` se dicte au téléphone,
 * `/app/recouvrement/paiement/<jeton>` non.
 *
 * ⚠️ `noindex`, ET CE N'EST PAS UNE PRÉCAUTION DE STYLE. Sans elle, un moteur
 * qui trouverait un lien dans un courriel indexé publierait le nom d'un client
 * et ce qu'il doit. C'est la première règle de confidentialité du projet.
 *
 * ⚠️ LE TITRE D'ONGLET NE NOMME PAS CE LOGICIEL. La racine pose « Letikette » ;
 * cette route le remplace. Un client qui lirait le nom d'un tiers sur la page
 * qui lui réclame de l'argent y verrait un mandat de recouvrement, et c'est
 * l'activité qu'on n'exerce pas.
 */
export const Route = createFileRoute('/p/$jeton')({
	head: () => ({
		meta: [{ title: 'Règlement' }, { name: 'robots', content: 'noindex, nofollow' }]
	}),
	component: PagePaiement,
	errorComponent: PaiementEnErreur
});

/**
 * ⚠️ CETTE ROUTE A SON PROPRE ÉCRAN D'ERREUR, ET C'ÉTAIT NÉCESSAIRE.
 *
 * Celui de l'application dit « Vos dossiers et vos calculs sont intacts » et
 * offre « Revenir à l'accueil ». Écrit pour le gérant, il est illisible pour
 * son client — qui n'a ni dossiers ni calculs ici — et le bouton l'enverrait
 * sur la page de connexion d'un logiciel dont il n'a jamais entendu parler.
 *
 * Celui-ci ne nomme personne, ne renvoie nulle part, et dit la seule chose
 * utile : réessayer, ou se tourner vers l'expéditeur du lien.
 */
function PaiementEnErreur() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-xs text-center">
			<h1 className="text-cladd-md font-semibold">Cette page n’a pas pu s’afficher.</h1>
			<p className="max-w-sm text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Réessayez dans un instant. Si elle ne s’affiche toujours pas, répondez au message qui
				vous a transmis ce lien : votre interlocuteur vous dira où en est votre règlement.
			</p>
		</main>
	);
}

function PagePaiement() {
	const { jeton } = Route.useParams();
	const page = useQuery(api.recouvrement.paiement.pageDePaiement, { jeton });

	if (page === undefined) return <EcranPaiement donnees={{ etat: 'attente' }} />;
	if (page === null) return <EcranPaiement donnees={{ etat: 'introuvable' }} />;

	return (
		<EcranPaiement
			donnees={{
				etat: 'pret',
				valeur: {
					creancier: {
						denomination: page.creancier.denomination,
						...(page.creancier.adresse === undefined ? {} : { adresse: page.creancier.adresse }),
						...(page.creancier.email === undefined ? {} : { email: page.creancier.email }),
						...(page.creancier.telephone === undefined
							? {}
							: { telephone: page.creancier.telephone })
					},
					clientNom: page.clientNom,
					arreteAu: page.arreteAu,
					total: page.total,
					principal: page.principal,
					interets: page.interets,
					indemniteForfaitaire: page.indemniteForfaitaire,
					lignes: page.lignes,
					reference: page.reference,
					ibanLisible: page.ibanLisible,
					chargeQr: page.chargeQr
				}
			}}
		/>
	);
}
