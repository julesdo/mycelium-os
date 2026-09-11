import { useState } from 'react';
import { Input, Surface } from '@cladd-ui/react';
import { PercentIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LE TAUX CONTRACTUEL — la saisie qui manquait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE CHAMP EXISTAIT AU SCHÉMA ET N'AVAIT AUCUN ÉCRAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `facturesVente.tauxContractuel` était LU par les deux moteurs de calcul — le
 * décompte et la révélation — pour remplacer la série légale par la stipulation
 * du créancier. Il n'était écrit nulle part : ni mutation, ni import, ni écran.
 *
 * Tout créancier dont les conditions générales stipulent un taux — le cas
 * courant en B2B — retombait donc silencieusement sur le taux légal. Le produit
 * SOUS-RÉCLAMAIT, ce qui est l'inverse exact de sa raison d'être, et rien ne
 * pouvait le signaler : le calcul était juste, c'est son entrée qui manquait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE CONSTAT VIENT DU SERVEUR, MOT POUR MOT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un taux sous le plancher légal est ENREGISTRÉ tel quel, et le serveur le dit.
 * Cet écran ne reformule rien et ne refuse rien : relever d'office un taux jugé
 * trop bas serait écrire une conséquence juridique que personne n'a validée —
 * `pays/france/taux.ts` l'interdit explicitement.
 *
 * C'est aussi ce qui garantit qu'aucune consigne ne s'y glisse : la phrase ne
 * passe par aucune plume intermédiaire.
 */
export function TauxContractuel({
	/** Le taux en vigueur, en pourcentage lisible. `undefined` = taux légal. */
	valeur,
	constat,
	onEnregistrer,
	className
}: {
	valeur: string | undefined;
	/** Ce que le serveur a répondu au dernier enregistrement. */
	constat: string | null;
	/** `null` retire la stipulation et fait retomber sur le taux légal. */
	onEnregistrer: (pourcentage: string | null) => void;
	className?: string;
}) {
	const [saisi, setSaisi] = useState(valeur ?? '');

	return (
		<Surface
			variant="transparent"
			outline={false}
			className={cn('verre-carte rounded-cladd-xl', className)}
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<div className="flex items-center gap-cladd-3xs">
				<span className="verre flex size-cladd-sm shrink-0 items-center justify-center rounded-full">
					<PercentIcon size={18} aria-hidden />
				</span>
				<div className="flex min-w-0 flex-col gap-0.5">
					<h2 className="text-cladd-xs font-semibold">Taux de retard stipulé</h2>
					<p className="text-cladd-2xs text-cladd-fg-softer">
						Celui de vos conditions générales, s’il y en a un
					</p>
				</div>
			</div>

			<Input
				size="lg"
				value={saisi}
				onChange={setSaisi}
				// Sur `blur` plutôt qu'à la frappe : ce taux touche TOUTES les factures
				// non soldées du débiteur. Enregistrer à chaque caractère écrirait
				// « 1 », puis « 12 », puis « 12,4 » en base avant d'arriver au bon.
				onBlur={() => onEnregistrer(saisi.trim() === '' ? null : saisi.trim())}
				placeholder="12,00"
				inputMode="decimal"
				suffix={<span className="mr-2 text-cladd-fg-softer">%</span>}
				infoMessage="Laissez vide pour appliquer le taux légal — BCE majoré de dix points"
			/>

			{/*
			  ⚠️ LE CONSTAT DU SERVEUR, TEL QUEL. Il dit si le taux passe sous le
			  plancher légal, et combien vaut ce plancher — pour que le créancier
			  refasse le calcul plutôt que de nous croire. L'écran ne le récrit pas.
			*/}
			{constat ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{constat}</p>
			) : null}
		</Surface>
	);
}
