import { Lien } from '../ui';
import { DUREE_ESSAI_JOURS, PARRAINAGE } from '../lib/config/tarifs';
import { CadreDuCompte, type SceneDuCompte } from '../marketing/compte/cadre';
import { BoutonDuCompte } from '../marketing/compte/champ';

/**
 * LA PAGE DE L'INVITÉ (22/10/2026), dans la DA du site (28/10/2026) — ce que voit le confrère
 * qui ouvre le lien d'un gérant : qui lui offre quoi, ce que fait Letikette en trois lignes, et
 * UN bouton.
 *
 * ⚠️ RIEN DE PLUS QUE LE NOM DE QUI OFFRE : ni ses chiffres, ni ses clients.
 */
const SCENE: SceneDuCompte = {
	paysage: 'lever',
	ciel: 'sombre',
	humeur: 'fete',
	carte: (
		<>
			<h2>Ce que fait Letikette.</h2>
			<ul>
				<li>
					<Coche />
					<span>
						<b>Il lit vos factures.</b>
						Un export de votre logiciel, un fichier, ou une photo.
					</span>
				</li>
				<li>
					<Coche />
					<span>
						<b>Il calcule ce qu’on vous doit.</b>
						Les pénalités et les frais de recouvrement, au centime.
					</span>
				</li>
				<li>
					<Coche />
					<span>
						<b>Il relance à votre nom.</b>
						Quand vous l’avez décidé, et chaque relance se retient.
					</span>
				</li>
			</ul>
		</>
	)
};

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
			<CadreDuCompte titre="Votre invitation." ton="On l’ouvre." scene={SCENE}>
				<span />
			</CadreDuCompte>
		);
	}

	if (invitation === null) {
		return (
			<CadreDuCompte
				titre="Cette invitation n’est plus valable."
				ton="Letikette reste à découvrir."
				chapeau={`Le lien a peut-être été tronqué en chemin par une messagerie. Vous pouvez essayer Letikette ${DUREE_ESSAI_JOURS} jours, sans carte aujourd’hui.`}
				scene={SCENE}
			>
				<div className="compte-form">
					<Lien className="bouton bouton-encre cta" to="/">
						<span className="cta-fond" aria-hidden="true" />
						<span className="cta-txt">Découvrir Letikette</span>
					</Lien>
				</div>
			</CadreDuCompte>
		);
	}

	const mois = PARRAINAGE.moisOfferts;
	return (
		<CadreDuCompte
			titre={`${invitation.offertPar} vous offre ${mois > 1 ? `${mois} mois` : 'un mois'}.`}
			ton="De Letikette, pour vos impayés."
			chapeau={`${DUREE_ESSAI_JOURS} jours d’essai, puis votre mois offert, déduit de votre deuxième prélèvement. Sans engagement.`}
			autre={{ question: 'Déjà client ?', lien: 'Se connecter', vers: '/connexion' }}
			scene={SCENE}
		>
			<div className="compte-form">
				<p className="compte-note">
					<Cadeau />
					<span>
						<b>{`${mois > 1 ? `${mois} mois offerts` : 'Un mois offert'} par ${invitation.offertPar}.`}</b>{' '}
						Il se rattache à votre compte dès que vous le créez.
					</span>
				</p>
				<BoutonDuCompte surClic={onAccepter}>Accepter l’invitation</BoutonDuCompte>
			</div>
		</CadreDuCompte>
	);
}

function Coche() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M6.5 12.4l3.6 3.6 7.4-8" />
		</svg>
	);
}

function Cadeau() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<rect x="3.5" y="9" width="17" height="11" rx="2" />
			<path d="M3.5 13h17M12 9v11M12 9c-2.2 0-4.4-1-4.4-3a2 2 0 0 1 4.4 0M12 9c2.2 0 4.4-1 4.4-3a2 2 0 0 0-4.4 0" />
		</svg>
	);
}
