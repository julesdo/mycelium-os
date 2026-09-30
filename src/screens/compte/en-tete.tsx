import { Avatar, sirenLisible } from '../../ui';
import type { IdentiteDuCreancier } from './presse';

/**
 * QUI EST CE COMPTE — le logo, le nom, le SIREN. Et plus aucun bouton.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL PORTAIT, ET CE QUE LES RÉFÉRENCES EN FONT (30/09/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une carte avec l'avatar, le nom, le SIREN, puis une rangée de boutons —
 * « Changer d'établissement » et « Se déconnecter ». À 375 px, le geste le plus
 * visible de la page était la sortie. Relevé sur Mobbin : le profil de Revolut
 * Business, de Cash App ou de Freenow ouvre sur l'identité seule — le logo, le
 * nom, une ligne —, et les gestes sont des rangées. La déconnexion est la
 * dernière, comme dans les Réglages d'iOS.
 *
 * ⚠️ CENTRÉ, COMME LE MONTANT DES AUTRES ÉCRANS. Sous la barre compacte, rien
 * n'impose plus le bord gauche ; c'est l'en-tête de Freenow et de Starling.
 */
export function EnTeteDuCompte({
	identite,
	logoUrl
}: {
	/** L'identité du créancier, ou `null` sans établissement actif. */
	readonly identite: IdentiteDuCreancier | null;
	/** Le logo de l'établissement, ou `null` : ses initiales en tiennent lieu. */
	readonly logoUrl: string | null;
}) {
	return (
		<div className="flex flex-col items-center gap-1 py-cladd-3xs text-center">
			<Avatar
				nom={identite?.nom}
				image={logoUrl === null ? null : { url: logoUrl }}
				className="size-16"
			/>
			<p className="mt-1 max-w-full truncate text-cladd-sm leading-tight font-bold tracking-tight">
				{identite?.nom ?? 'Aucun établissement'}
			</p>
			{/*
			  ⚠️ LE SIREN EST LA SECONDE LIGNE, ET SON ABSENCE AUSSI. C'est le numéro
			  qui s'imprime en tête de chaque décompte : un établissement qui n'en porte
			  pas produit des décomptes incomplets sans qu'aucune alerte n'apparaisse
			  ailleurs. Groupé par `sirenLisible`, le groupement du reste du produit.
			*/}
			<p className="text-cladd-2xs text-cladd-fg-soft">
				{identite === null
					? 'La coquille de l’application vous ramènera à la création d’un établissement.'
					: identite.siren === null
						? 'SIREN non renseigné'
						: `SIREN ${sirenLisible(identite.siren)}`}
			</p>
		</div>
	);
}
