import { useState } from 'react';
import { Input, Segmented, SegmentedButton } from '@cladd-ui/react';
import { CheckIcon } from 'lucide-react';
import { BoutonPrincipal, SectionEcran, Champ } from '../../ui';

/** Les trois états d'un critère de qualification. Jamais présumé favorablement. */
export type EtatCritere = 'ok' | 'ko' | 'unknown';

/**
 * LE CRÉANCIER — ce qui s'imprime en tête du décompte, et ce qui débloque la
 * qualification.
 *
 * ⚠️ CES TROIS CHAMPS NE SONT PAS DU CONFORT. La table existait depuis le
 * remodelage, elle était lue à deux endroits, et rien ne l'écrivait :
 *
 *   · la PIÈCE porte « Identité du créancier non renseignée » sans eux —
 *     honnête, et pas envoyable à un expert-comptable ;
 *   · et `entreCommercants` valait TOUJOURS « indéterminé », donc l'éligibilité
 *     à l'injonction de payer ne pouvait JAMAIS être acquise. Le produit
 *     annonçait une condition non remplie que rien ne permettait de remplir.
 *
 * ⚠️ LA QUALITÉ DE COMMERÇANT SE DÉCLARE, ELLE NE SE DEVINE PAS. Trois états,
 * dont « indéterminé » — et c'est le défaut. Présumer favorablement ouvrirait
 * une procédure qui se ferait rejeter ; le doute ne profite jamais au produit.
 */
export function FormulaireCreancier({
	initial,
	onEnregistrer
}: {
	initial: { denomination: string; siren: string; adresse: string; estCommercant: EtatCritere };
	onEnregistrer: (args: {
		denomination: string;
		siren?: string;
		adresse?: string;
		estCommercant: EtatCritere;
	}) => Promise<unknown>;
}) {
	const [denomination, setDenomination] = useState(initial.denomination);
	const [siren, setSiren] = useState(initial.siren);
	const [adresse, setAdresse] = useState(initial.adresse);
	const [estCommercant, setEstCommercant] = useState<EtatCritere>(initial.estCommercant);
	const [enCours, setEnCours] = useState(false);
	const [enregistre, setEnregistre] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function enregistrer() {
		if (!denomination.trim()) return;
		setEnCours(true);
		setErreur(null);
		try {
			await onEnregistrer({
				denomination: denomination.trim(),
				estCommercant,
				...(siren.trim() ? { siren: siren.trim() } : {}),
				...(adresse.trim() ? { adresse: adresse.trim() } : {})
			});
			setEnregistre(true);
			window.setTimeout(() => setEnregistre(false), 2000);
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Enregistrement refusé.');
		} finally {
			setEnCours(false);
		}
	}

	return (
		<SectionEcran titre="Votre entreprise, telle qu’elle apparaît sur un décompte">
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Ces informations s’impriment en tête du décompte que vous transmettez à votre
				expert-comptable, à votre avocat ou à votre assureur. Elles sont figées avec chaque décompte
				: un document réédité plus tard dit la même chose qu’au jour de son émission.
			</p>

			<Champ etiquette="Dénomination">
				<Input size="lg" value={denomination} onChange={setDenomination} />
			</Champ>

			<Champ etiquette="SIREN ou SIRET">
				<Input
					size="lg"
					value={siren}
					onChange={setSiren}
					inputMode="numeric"
					valid={erreur === null}
					errorMessage={erreur ?? undefined}
				/>
			</Champ>

			<Champ etiquette="Adresse">
				<Input size="lg" value={adresse} onChange={setAdresse} />
			</Champ>

			<Champ etiquette="Vous êtes commerçant">
				<p className="text-cladd-2xs text-cladd-fg-softer">
					La qualité de commerçant des DEUX parties conditionne l’éligibilité à certaines
					procédures. Tant qu’elle n’est pas déclarée, la condition reste indéterminée — et une
					créance indéterminée n’est jamais présumée éligible.
				</p>
				<Segmented className="self-start" activeColor="neutral" activeVariant="solid">
					<SegmentedButton active={estCommercant === 'ok'} onClick={() => setEstCommercant('ok')}>
						Oui
					</SegmentedButton>
					<SegmentedButton active={estCommercant === 'ko'} onClick={() => setEstCommercant('ko')}>
						Non
					</SegmentedButton>
					<SegmentedButton
						active={estCommercant === 'unknown'}
						onClick={() => setEstCommercant('unknown')}
					>
						À déterminer
					</SegmentedButton>
				</Segmented>
			</Champ>

			<BoutonPrincipal
				className="self-start"
				onClick={() => void enregistrer()}
				disabled={enCours || !denomination.trim()}
			>
				{enregistre ? <CheckIcon /> : null}
				{enregistre ? 'Enregistré' : enCours ? 'Enregistrement…' : 'Enregistrer'}
			</BoutonPrincipal>
		</SectionEcran>
	);
}
