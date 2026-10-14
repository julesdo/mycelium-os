import { BoutonPrincipal, Lien } from '../../ui';
import { Surface } from '@cladd-ui/react';

/**
 * L'ENCART D'ATTENTE, TANT QUE LE COMPTE MARCHAND N'EST PAS OUVERT — écrit en
 * QUATRE PARTIES, dans l'ordre que D0 impose.
 *
 * ⚠️ CE N'EST PAS UNE MISE EN FORME, C'EST LA DÉCISION D0. Un refus se dit
 * toujours dans cet ordre : ce que le produit peut faire tout de suite, et
 * cette ligne n'est JAMAIS vide ; ce qui manque, nommé ; ce qui lève le manque,
 * au CONSTAT et jamais à l'impératif ; ce que l'attente coûte, chiffré quand
 * c'est chiffrable et déclaré non chiffrable sinon.
 *
 * ⚠️ ET CE QUE L'ATTENTE COÛTE EST ICI DÉCLARÉ NON CHIFFRABLE, plutôt
 * qu'inventé. Tant qu'aucun prix n'est encaissé, l'attente ne coûte rien au
 * gérant ; écrire un montant ferait croire à une dette qui court.
 */
export function OuvertureEnCours() {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<span className="text-cladd-sm font-bold">
				Tout le produit vous est ouvert, sans carte bancaire.
			</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Déposez vos factures, lisez ce qui vous est dû, réclamez-le : rien n&rsquo;est retenu
				derrière le paiement aujourd&rsquo;hui.
			</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Ce qui manque : notre compte marchand n&rsquo;est pas ouvert, donc aucun paiement en ligne
				ne peut être encaissé.
			</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Ce verrou se lève à l&rsquo;ouverture du compte marchand chez Paddle, une fois notre compte
				vérifié.
			</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Ce que l&rsquo;attente coûte : rien qui se chiffre. Aucune somme n&rsquo;est due tant que le
				paiement n&rsquo;est pas ouvert, et nous revenons vers vous avant toute facturation.
			</span>
			<span className="flex flex-wrap gap-cladd-3xs pt-cladd-3xs">
				<BoutonPrincipal as={Lien} to="/app/coffre" search={{ deposer: 1 } as never}>
					Déposer mes factures
				</BoutonPrincipal>
			</span>
		</Surface>
	);
}
