import { useState } from 'react';
import { Input } from '@cladd-ui/react';
import { CheckIcon } from 'lucide-react';
import { BoutonPrincipal, Champ } from '../../ui';

/**
 * LE FORMULAIRE DE L'ÉTABLISSEMENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI IL A QUITTÉ L'ÉCRAN DE RÉGLAGES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il y vivait, dépliés, en même temps qu'un second formulaire — celui du
 * créancier — et que l'apparence, trois liens et la déconnexion. À eux deux,
 * les formulaires faisaient l'essentiel du défilement : le créancier seul
 * mesure 2,99 écrans à 375 px.
 *
 * Or on n'ouvre pas les réglages pour remplir un formulaire : on les ouvre pour
 * ATTEINDRE quelque chose. La liste dit ce qui est réglé, la page règle. C'est
 * le motif de tous les écrans de réglages d'application mobile.
 *
 * ⚠️ ET LA `key` RESTE POSÉE SUR L'IDENTIFIANT, à l'appel. C'est elle qui
 * garantit que les champs se réinitialisent si le gérant change
 * d'établissement, sans effet de synchronisation. La retirer en déménageant
 * aurait laissé les valeurs du précédent, en silence.
 */
export function FormulaireEtablissement({
	initial,
	onEnregistrer
}: {
	initial: { nom: string; factures: string; siret: string };
	onEnregistrer: (args: {
		name: string;
		facturesParAn?: number;
		siret?: string;
	}) => Promise<unknown>;
}) {
	const [nom, setNom] = useState(initial.nom);
	const [factures, setFactures] = useState(initial.factures);
	const [siret, setSiret] = useState(initial.siret);
	const [enCours, setEnCours] = useState(false);
	const [enregistre, setEnregistre] = useState(false);

	async function enregistrer() {
		if (!nom.trim()) return;
		setEnCours(true);
		try {
			const nb = Number.parseInt(factures, 10);
			await onEnregistrer({
				name: nom.trim(),
				...(Number.isFinite(nb) && nb > 0 ? { facturesParAn: nb } : {}),
				...(siret.trim() ? { siret: siret.replace(/\s/g, '') } : {})
			});
			setEnregistre(true);
			window.setTimeout(() => setEnregistre(false), 2000);
		} finally {
			setEnCours(false);
		}
	}

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<Champ etiquette="Nom">
				<Input value={nom} onChange={setNom} name="organisation" size="lg" />
			</Champ>

			<div className="grid gap-cladd-2xs sm:grid-cols-2">
				<Champ
					etiquette="Factures émises par an"
					aide="Sert à dimensionner votre abonnement, jamais à limiter le produit."
				>
					<Input type="number" value={factures} onChange={setFactures} name="factures" size="lg" />
				</Champ>

				<Champ
					etiquette="SIREN"
					aide="Il identifie votre entreprise sur les actes. Sans lui, aucune procédure ne peut être engagée."
				>
					<Input value={siret} onChange={setSiret} name="siret" size="lg" />
				</Champ>
			</div>

			<BoutonPrincipal
				className="self-start"
				loading={enCours}
				readOnly={enCours}
				onClick={() => void enregistrer()}
			>
				{enregistre ? <CheckIcon /> : null}
				{enregistre ? 'Enregistré' : 'Enregistrer'}
			</BoutonPrincipal>
		</div>
	);
}
