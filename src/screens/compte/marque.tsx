import { useState } from 'react';
import { Segmented, SegmentedButton } from '@cladd-ui/react';
import { CreditCardIcon, MailIcon } from 'lucide-react';
import {
	COULEURS_DE_MARQUE,
	nomDeCouleur,
	teintesDuCourriel
} from '../../lib/verticales/recouvrement/marque';
import { relanceHtml } from '../../lib/verticales/recouvrement/courriel-relance';
import {
	CLIENT_D_EXEMPLE,
	relanceDExemple
} from '../../lib/verticales/recouvrement/exemple-de-relance';
import {
	ApercuDeCourriel,
	ApercuDePageDePaiement,
	BoutonPrincipal,
	CarteDuLogo,
	FeuillePleinEcran,
	MiseEnPageDeMarque,
	NuancierDeMarque,
	type ImageDeMarque
} from '../../ui';

/**
 * LOGO ET COULEURS — l'image des courriers que reçoit le client (23/10/2026).
 *
 * Voir `docs/superpowers/specs/2026-10-23-logo-et-couleurs.md`. UNE page pleine :
 * l'aperçu exact de ce que recevra le client, la carte du logo, le nuancier, et un
 * seul bouton plein qui suit l'état — « Enregistrer » tant que quelque chose a
 * changé, « M'envoyer un exemple » ensuite.
 *
 * ⚠️ L'APERÇU EST LA LETTRE QUI PART. Le même générateur que l'expédition
 * (`courriel-relance.ts`), le vrai premier rappel du plan, pour un client fictif
 * (`exemple-de-relance.ts`) : ce que le gérant voit, son client le recevra.
 */

export type EtatDeLaMarque =
	| { readonly genre: 'repos' }
	| { readonly genre: 'preparation' }
	| { readonly genre: 'enregistrement' }
	| { readonly genre: 'envoi' }
	| { readonly genre: 'envoye'; readonly a: string }
	| { readonly genre: 'erreur'; readonly message: string };

export interface MarqueAffichee {
	readonly denomination: string;
	/** Le logo tel qu'il partira : celui qu'on vient de choisir, sinon celui enregistré. */
	readonly logo: ImageDeMarque | null;
	readonly couleur: string | null;
	/** Les teintes franches du logo choisi : vides tant qu'aucun n'a été préparé ici. */
	readonly teintesDuLogo: readonly string[];
	/** Quelque chose diffère de ce qui est enregistré. */
	readonly modifiee: boolean;
	/** Un administrateur : un membre voit l'aperçu et s'envoie un exemple. */
	readonly modifiable: boolean;
	/** L'adresse de la personne connectée, où part l'exemple. */
	readonly courriel: string | null;
	readonly envoiConfigure: boolean;
	readonly aujourdHui: string;
	readonly etat: EtatDeLaMarque;
	readonly erreurDuLogo: string | null;
	readonly onChoisirLogo: (fichier: File) => void;
	readonly onRetirerLogo: () => void;
	readonly onChoisirCouleur: (couleur: string | null) => void;
	readonly onEnregistrer: () => void;
	readonly onEnvoyerUnExemple: () => void;
}

/** Le reste à régler de l'exemple : les deux factures fictives de `exemple-de-relance.ts`. */
const MONTANT_D_EXEMPLE = 246_240n;

/** Ce que dit la ligne sous le nuancier. */
function legendeDeLaCouleur(couleur: string | null): string {
	if (couleur === null) return 'Sans couleur : la lettre reste en gris, votre logo la signe.';
	const teintes = teintesDuCourriel(couleur);
	const nom = nomDeCouleur(couleur);
	return teintes?.ajustee === true
		? `${nom}. Trop claire pour du texte : les liens prennent une nuance plus foncée.`
		: `${nom}, sur la bande en tête, les liens et votre nom au pied.`;
}

/** La phrase au-dessus du bouton : ce qui va se passer, ou ce qui vient de se passer. */
function phraseDuPied(m: MarqueAffichee): string | null {
	if (m.etat.genre === 'erreur') return m.etat.message;
	if (m.etat.genre === 'envoye') return `Exemple envoyé à ${m.etat.a}. Ouvrez-le dans votre messagerie.`;
	if (m.modifiable && m.modifiee) {
		return 'Vos prochaines relances et votre page de paiement porteront cette image.';
	}
	if (!m.envoiConfigure) return 'L’envoi des e-mails n’est pas configuré ici : l’aperçu reste exact.';
	if (m.courriel !== null) return `L’exemple part à ${m.courriel}, tel que vos clients le reçoivent.`;
	return null;
}

export function FeuilleLogoEtCouleurs({
	ouverte,
	onFermer,
	marque
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	/** `null` tant que la lecture court. */
	readonly marque: MarqueAffichee | null;
}) {
	const [vue, setVue] = useState<'COURRIEL' | 'PAGE'>('COURRIEL');

	if (marque === null) {
		return (
			<FeuillePleinEcran ouverte={ouverte} onFermer={onFermer} titre="Logo et couleurs" large>
				<p role="status" className="text-cladd-xs text-cladd-fg-soft">
					Lecture…
				</p>
			</FeuillePleinEcran>
		);
	}

	const exemple = relanceDExemple(marque.denomination, marque.aujourdHui);
	const occupe =
		marque.etat.genre === 'preparation' ||
		marque.etat.genre === 'enregistrement' ||
		marque.etat.genre === 'envoi';
	const phrase = phraseDuPied(marque);
	const enregistrer = marque.modifiable && marque.modifiee;

	const pied = (
		<>
			{phrase === null ? null : (
				<p
					role={marque.etat.genre === 'erreur' ? 'alert' : 'status'}
					className="text-center text-cladd-2xs leading-relaxed text-cladd-fg-soft"
				>
					{phrase}
				</p>
			)}
			{enregistrer ? (
				<BoutonPrincipal pleineLargeur disabled={occupe} onClick={marque.onEnregistrer}>
					{marque.etat.genre === 'enregistrement' ? 'Enregistrement…' : 'Enregistrer'}
				</BoutonPrincipal>
			) : (
				<BoutonPrincipal
					pleineLargeur
					disabled={occupe || !marque.envoiConfigure || marque.courriel === null}
					onClick={marque.onEnvoyerUnExemple}
				>
					{marque.etat.genre === 'envoi' ? 'Envoi…' : 'M’envoyer un exemple'}
				</BoutonPrincipal>
			)}
		</>
	);

	const apercu = (
		<>
			<Segmented className="w-full" activeColor="neutral" activeVariant="solid">
				<SegmentedButton active={vue === 'COURRIEL'} onClick={() => setVue('COURRIEL')}>
					<MailIcon />
					L’e-mail
				</SegmentedButton>
				<SegmentedButton active={vue === 'PAGE'} onClick={() => setVue('PAGE')}>
					<CreditCardIcon />
					La page de paiement
				</SegmentedButton>
			</Segmented>
			{vue === 'COURRIEL' ? (
				<ApercuDeCourriel
					html={relanceHtml(exemple.corps, marque.denomination, {
						logo: marque.logo,
						couleur: marque.couleur
					})}
					expediteur={marque.denomination}
					destinataire={CLIENT_D_EXEMPLE}
					objet={exemple.objet}
				/>
			) : (
				<ApercuDePageDePaiement
					denomination={marque.denomination}
					logo={marque.logo}
					couleur={marque.couleur}
					clientNom={CLIENT_D_EXEMPLE}
					montant={MONTANT_D_EXEMPLE}
				/>
			)}
			<p className="px-1 text-center text-cladd-3xs text-cladd-fg-softer">
				Votre premier rappel, pour un client fictif.
			</p>
		</>
	);

	const reglages = (
		<>
			{marque.modifiable ? null : (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Seul un administrateur de l’établissement change le logo et la couleur.
				</p>
			)}
			<CarteDuLogo
				logo={marque.logo}
				nom={marque.denomination}
				enPreparation={marque.etat.genre === 'preparation'}
				modifiable={marque.modifiable}
				erreur={marque.erreurDuLogo}
				onChoisir={marque.onChoisirLogo}
				onRetirer={marque.onRetirerLogo}
			/>
			<div className="flex flex-col gap-1">
				<span className="px-1 text-cladd-xs font-semibold">Couleur</span>
				<NuancierDeMarque
					teintesDuLogo={marque.teintesDuLogo}
					palette={COULEURS_DE_MARQUE}
					choisie={marque.couleur}
					modifiable={marque.modifiable}
					onChoisir={marque.onChoisirCouleur}
				/>
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{legendeDeLaCouleur(marque.couleur)}
				</p>
			</div>
		</>
	);

	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Logo et couleurs"
			sousTitre="Ce que reçoivent vos clients"
			large
			pied={pied}
		>
			<MiseEnPageDeMarque apercu={apercu} reglages={reglages} />
		</FeuillePleinEcran>
	);
}
