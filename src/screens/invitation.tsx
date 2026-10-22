import { Button } from '@cladd-ui/react';
import { ArrowRightIcon } from 'lucide-react';
import { DUREE_ESSAI_JOURS, PARRAINAGE } from '../lib/config/tarifs';
import { BoutonPrincipal, CadreAuth, CarteCadeau, Lien } from '../ui';

/**
 * LA PAGE DE L'INVITÉ (22/10/2026) — ce que voit le confrère qui ouvre le lien d'un gérant :
 * qui lui offre quoi, la même carte cadeau que celle qu'on lui a envoyée (Wispr Flow), ce
 * que fait Letikette en une phrase, et UN bouton.
 *
 * ⚠️ RIEN DE PLUS QUE LE NOM DE QUI OFFRE : ni ses chiffres, ni ses clients.
 */
export function EcranInvitation({
	invitation,
	onAccepter
}: {
	/** `undefined` pendant la lecture, `null` pour un lien qui ne vaut plus rien. */
	readonly invitation: { readonly offertPar: string } | null | undefined;
	readonly onAccepter: () => void;
}) {
	if (invitation === undefined) {
		return (
			<CadreAuth titre="Votre invitation" explication="Ouverture de votre invitation…">
				<span />
			</CadreAuth>
		);
	}

	if (invitation === null) {
		return (
			<CadreAuth
				titre="Cette invitation n’est plus valable."
				explication={`Le lien a peut-être été tronqué en chemin par une messagerie. Letikette reste à découvrir, avec ${DUREE_ESSAI_JOURS} jours d’essai.`}
			>
				<Button as={Lien} to="/" className="w-full">
					Découvrir Letikette
				</Button>
			</CadreAuth>
		);
	}

	const mois = PARRAINAGE.moisOfferts;
	return (
		<CadreAuth
			titre={`${invitation.offertPar} vous offre ${mois} mois de Letikette`}
			explication="Letikette relance vos factures impayées à votre nom, calcule au centime les pénalités de retard qui vous sont dues, et vous dit jusqu’à quand agir."
			levees={[`${DUREE_ESSAI_JOURS} jours d’essai`, `${mois} mois offert ensuite`, 'Sans engagement']}
			pied={
				<>
					<span>
						Votre mois offert se déduit de votre deuxième prélèvement, après votre première
						échéance.
					</span>
					<span>
						Déjà client ?{' '}
						<Lien to="/connexion" className="underline">
							Se connecter
						</Lien>
					</span>
				</>
			}
		>
			<CarteCadeau offertPar={invitation.offertPar} mois={mois} />
			<BoutonPrincipal pleineLargeur onClick={onAccepter}>
				Accepter l’invitation
				<ArrowRightIcon />
			</BoutonPrincipal>
		</CadreAuth>
	);
}
