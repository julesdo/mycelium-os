import { PageEcran, type Lecture } from '../../ui';
import { FormulaireInvitation, type RoleEquipe } from './equipe';

/** Ce que la page affiche : si la personne peut inviter, les places de l'offre, et l'envoi que la route pilote. */
export interface InvitationAffichee {
	readonly estAdmin: boolean;
	/** Plus aucune place : invitations en attente comprises. */
	readonly complet: boolean;
	readonly places: number;
	readonly onInviter: (email: string, role: RoleEquipe) => Promise<void>;
}

/**
 * INVITER UN COLLÈGUE — un formulaire, sur sa propre page.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN FORMULAIRE NE TIENT PAS EN BAS D'UN ÉCRAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il vivait sous deux listes : celle des membres et celle des invitations en
 * attente. Sur un téléphone, il fallait donc faire défiler pour l'atteindre —
 * et une fois le champ touché, le clavier qui s'ouvre repousse le bouton
 * d'envoi hors de l'écran. C'est le cas typique où une carte de plus rend un
 * geste simplement impraticable.
 *
 * ⚠️ LE RÔLE EST UN CHOIX EXPLICITE, AVEC SA CONSÉQUENCE SOUS L'OPTION. Un
 * administrateur peut inviter, retirer et supprimer l'établissement : le dire
 * au moment du choix vaut mieux qu'un réglage qu'on découvre en le subissant.
 *
 * ⚠️ ET LA GARDE EST CÔTÉ SERVEUR. Cet écran n'affiche le formulaire qu'à un
 * administrateur, mais c'est la mutation qui refuse — un écran peut demander,
 * seul le serveur peut exiger.
 */
export function EcranInviter({ donnees }: { donnees: Lecture<InvitationAffichee> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/equipe', libelle: 'Votre équipe' },
				titre: 'Inviter un collègue',
				sousTitre: 'Il recevra un lien valable sept jours, et créera son mot de passe lui-même.'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : pret.estAdmin ? (
				<FormulaireInvitation
					onInviter={pret.onInviter}
					complet={pret.complet}
					places={pret.places}
				/>
			) : (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Seul un administrateur de l’établissement peut inviter quelqu’un. Demandez-le à l’une des
					personnes marquées « Administrateur » sur l’écran précédent.
				</p>
			)}
		</PageEcran>
	);
}
