import { useState } from 'react';
import { BoutonPrincipal } from './bouton';
import { Button, Chip, Input, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, SearchIcon } from 'lucide-react';
import { eurosCentimes } from './format';

/**
 * LE LETTRAGE D'UN VIREMENT GROUPÉ.
 *
 * Un client paie 4 820 € en une fois, sans référence. Le gérant a le montant sous
 * les yeux sur son relevé ; le produit lui dit quelles factures il solde.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CET ÉCRAN NE CHOISIT JAMAIS À LA PLACE DU GÉRANT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Quand deux combinaisons donnent le même total, les deux s'affichent, avec un
 * avertissement, et AUCUNE n'est présélectionnée. Trancher aurait une chance sur
 * deux d'être faux — et l'erreur, c'est relancer un client qui a déjà payé, la
 * pire d'un logiciel de recouvrement. Elle ne coûte pas un chiffre à l'écran,
 * elle coûte une relation commerciale.
 *
 * ⚠️ ET LA RECHERCHE NE PART PAS À CHAQUE FRAPPE. Le montant se confirme
 * explicitement : chercher pendant qu'on tape ferait défiler des propositions
 * qui changent sous les doigts, et donnerait envie de cliquer sur la première.
 */

export interface CombinaisonAffichee {
	readonly references: readonly string[];
	readonly total: bigint;
}

export interface PropositionLettrage {
	readonly issue: 'UNIQUE' | 'AMBIGU' | 'AUCUNE' | 'TROP_DE_CANDIDATES';
	readonly combinaisons: readonly CombinaisonAffichee[];
	readonly tronque: boolean;
	readonly candidates?: number;
}

function Avis({ children }: { children: React.ReactNode }) {
	return (
		<Surface variant="transparent" outline={false} className="verre-carte rounded-cladd-xl" contentClassName="flex gap-cladd-3xs p-cladd-2xs">
			<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
			<div className="flex min-w-0 flex-col gap-1.5">{children}</div>
		</Surface>
	);
}

export function Lettrage({
	proposition,
	enCours,
	erreur,
	onChercher,
	onAppliquer
}: {
	/** `null` tant qu'aucune recherche n'a été lancée. */
	proposition: PropositionLettrage | null;
	enCours: boolean;
	erreur: string | null;
	onChercher: (montantSaisi: string, date: string) => void;
	onAppliquer: (references: readonly string[], total: bigint) => void;
}) {
	const [montant, setMontant] = useState('');
	const [date, setDate] = useState('');

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Un virement groupé sans référence ? Saisissez son montant et sa date : le logiciel cherche
				quelles factures il solde. Il ne rapproche qu’au centime près, et il ne choisit jamais à
				votre place quand plusieurs lectures sont possibles.
			</p>

			<div className="flex flex-wrap items-end gap-cladd-3xs">
				<Input
					size="lg"
					className="min-w-40 flex-1"
					value={montant}
					onChange={setMontant}
					placeholder="4820,00"
					inputMode="decimal"
					suffix={<span className="mr-2 text-cladd-fg-softer">€</span>}
					infoMessage="Le montant exact du virement"
				/>
				<Input
					size="lg"
					className="min-w-40 flex-1"
					value={date}
					onChange={setDate}
					placeholder="2026-04-15"
					infoMessage="La date de valeur, au format AAAA-MM-JJ"
				/>
				<BoutonPrincipal
					onClick={() => onChercher(montant, date)}
					disabled={enCours || montant.trim() === '' || date.trim() === ''}
				>
					<SearchIcon />
					{enCours ? 'Recherche…' : 'Chercher'}
				</BoutonPrincipal>
			</div>

			{erreur !== null ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

			{proposition === null ? null : proposition.issue === 'AUCUNE' ? (
				<Avis>
					<p className="text-cladd-xs font-semibold">Aucune combinaison ne fait ce montant</p>
					<p className="text-cladd-xs text-cladd-fg-soft">
						Le rapprochement se fait au centime près. Un écart, même d’un centime, peut venir d’un
						escompte, d’un frais bancaire, ou d’une facture que le logiciel ne connaît pas encore —
						trois situations qui n’appellent pas le même geste.
					</p>
				</Avis>
			) : proposition.issue === 'TROP_DE_CANDIDATES' ? (
				<Avis>
					<p className="text-cladd-xs font-semibold">
						Trop de factures ouvertes chez ce débiteur ({proposition.candidates})
					</p>
					<p className="text-cladd-xs text-cladd-fg-soft">
						Chercher une somme parmi autant de factures prendrait un temps que personne n’attendra.
						Enregistrez d’abord les règlements que vous connaissez, puis reprenez.
					</p>
				</Avis>
			) : (
				<div className="flex flex-col gap-cladd-3xs">
					{proposition.issue === 'AMBIGU' ? (
						<Avis>
							<p className="text-cladd-xs font-semibold">
								{proposition.combinaisons.length} lectures possibles
								{proposition.tronque ? ' — et il en existe d’autres' : ''}
							</p>
							<p className="text-cladd-xs text-cladd-fg-soft">
								Plusieurs combinaisons de factures donnent exactement ce montant. Le logiciel ne
								tranche pas : solder les mauvaises factures laisserait les autres en impayé, et vous
								relanceriez un client qui a déjà payé.
							</p>
						</Avis>
					) : null}

					{proposition.combinaisons.map((combinaison) => (
						<Surface
							key={combinaison.references.join('+')}
							variant="transparent" outline={false} className="verre-carte rounded-cladd-xl"
							contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex flex-wrap items-center gap-1.5">
								{combinaison.references.map((reference) => (
									<Chip key={reference} size="md" color="neutral">
										{reference}
									</Chip>
								))}
							</div>
							<div className="flex shrink-0 items-center gap-cladd-3xs">
								<span className="text-cladd-sm font-semibold tabular-nums">
									{eurosCentimes(combinaison.total)}
								</span>
								<Button
									size="md"
									variant="transparent"
									onClick={() => onAppliquer(combinaison.references, combinaison.total)}
									disabled={enCours}
								>
									Solder ces factures
								</Button>
							</div>
						</Surface>
					))}
				</div>
			)}
		</div>
	);
}
