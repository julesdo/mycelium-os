import { useState, type ReactNode } from 'react';
import { COULEURS_DE_MARQUE, resumeDeLaMarque } from '../../lib/verticales/recouvrement/marque';
import { partieLocale } from '../../lib/verticales/recouvrement/expediteur';
import { useMarqueAffichee, type MarqueLue } from '../../app/logo-et-couleurs';
import { FeuilleLogoEtCouleurs } from '../../screens/compte/marque';
import { ETABLISSEMENT_DEMO } from './communes';

/**
 * « LOGO ET COULEURS » DANS LA SALLE (23/10/2026) : le vrai brouillon
 * (`useMarqueAffichee`) et la vraie préparation du logo, sans serveur. Un logo
 * choisi ici est rogné, réduit et lu comme en production ; « Enregistrer » le
 * garde le temps de la démonstration, et l'exemple « part » à une adresse fictive.
 */

/** Les deux couleurs du logo de démonstration, prises dans la palette proposée. */
const ENCRE = COULEURS_DE_MARQUE[0].hex;
const ACCENT = COULEURS_DE_MARQUE[5].hex;

/** Un logo de démonstration, dessiné : un mot-symbole sur deux couleurs. */
const LOGO_DEMO = `data:image/svg+xml;utf8,${encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160" viewBox="0 0 480 160">` +
		`<rect x="0" y="20" width="120" height="120" rx="28" fill="${ENCRE}"/>` +
		`<circle cx="60" cy="80" r="28" fill="${ACCENT}"/>` +
		`<text x="146" y="104" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="${ENCRE}">Thumbbb</text>` +
		`</svg>`
)}`;

const SANS_RIEN: MarqueLue = {
	denomination: ETABLISSEMENT_DEMO.nom,
	logo: null,
	couleur: null,
	modifiable: true,
	courriel: 'camille@thumbbb.fr',
	envoiConfigure: true,
	adresseDEnvoi: `${partieLocale(ETABLISSEMENT_DEMO.nom)}@suivi-factures.fr`,
	repondreA: 'compta@thumbbb.fr'
};

/** Les variantes du compte qui ouvrent la page, et ce qui y est déjà posé. */
export const MARQUES_DEMO: Readonly<Record<string, MarqueLue>> = {
	'logo et couleurs': SANS_RIEN,
	'logo et couleurs posés': {
		...SANS_RIEN,
		logo: { url: LOGO_DEMO, largeur: 480, hauteur: 160, teintes: [ACCENT, ENCRE] },
		couleur: ENCRE
	},
	'logo et couleurs, vus par un membre': {
		...SANS_RIEN,
		logo: { url: LOGO_DEMO, largeur: 480, hauteur: 160, teintes: [ACCENT, ENCRE] },
		couleur: ACCENT,
		modifiable: false
	}
};

/** La page, et la valeur de sa rangée, tenues par la démonstration. */
export function useMarqueDemo(variante: string | undefined): {
	readonly resume: string;
	/** Le logo enregistré, que l'en-tête du compte montre. */
	readonly logoUrl: string | null;
	readonly ouverte: boolean;
	readonly ouvrir: () => void;
	readonly feuille: ReactNode;
} {
	const initiale = (variante === undefined ? undefined : MARQUES_DEMO[variante]) ?? SANS_RIEN;
	const [enregistree, setEnregistree] = useState<MarqueLue>(initiale);
	const [ouverte, setOuverte] = useState(variante !== undefined && variante in MARQUES_DEMO);
	const [ouvertures, setOuvertures] = useState(0);

	return {
		resume: resumeDeLaMarque({ logo: enregistree.logo !== null, couleur: enregistree.couleur }),
		logoUrl: enregistree.logo?.url ?? null,
		ouverte,
		ouvrir: () => {
			setOuvertures((n) => n + 1);
			setOuverte(true);
		},
		feuille: (
			<FeuilleDemo
				key={ouvertures}
				enregistree={enregistree}
				onEnregistrer={setEnregistree}
				ouverte={ouverte}
				onFermer={() => setOuverte(false)}
			/>
		)
	};
}

function FeuilleDemo({
	enregistree,
	onEnregistrer,
	ouverte,
	onFermer
}: {
	readonly enregistree: MarqueLue;
	readonly onEnregistrer: (marque: MarqueLue) => void;
	readonly ouverte: boolean;
	readonly onFermer: () => void;
}) {
	const marque = useMarqueAffichee(enregistree, {
		enregistrer: async ({ couleur, logo }) => {
			onEnregistrer({
				...enregistree,
				couleur,
				logo:
					logo === 'RETIRER'
						? null
						: logo === 'GARDER'
							? enregistree.logo
							: {
									url: logo.apercu,
									largeur: logo.largeur,
									hauteur: logo.hauteur,
									teintes: logo.teintes
								}
			});
			return null;
		},
		envoyerUnExemple: async () => enregistree.courriel ?? 'camille@thumbbb.fr'
	});
	return <FeuilleLogoEtCouleurs ouverte={ouverte} onFermer={onFermer} marque={marque} />;
}
