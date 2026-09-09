import { useState } from 'react';
import { Input, Select } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';

/**
 * CE QUE LE GÉRANT SEUL PEUT DIRE DE SON DÉBITEUR.
 *
 * « Le logiciel décide, le gérant confirme » (règle d'écran n° 1) : aucun écran
 * ne demande une saisie que le logiciel peut déduire. Ces deux champs sont
 * l'exception, et chacun l'est pour une raison différente.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SIREN — la charnière vers les registres publics
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le radar BODACC et la normalisation Sirene s'interrogent par identifiant, et
 * jamais par raison sociale : sur un flux national, une correspondance de nom
 * finit par annoncer à un gérant que son client solvable est en liquidation.
 *
 * ⚠️ LE REFUS S'AFFICHE SOUS LE CHAMP, PAS DANS UNE ALERTE. La clé de contrôle
 * attrape toute faute de frappe d'un seul chiffre — c'est précisément le
 * moment où le gérant doit voir ce qu'il a tapé, à côté de ce qu'il a tapé.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SECTEUR — la légende dit le délai, parce que c'est ce qui décide
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Un gérant ne choisit pas « transport de marchandises » pour le plaisir de la
 * nomenclature : il le choisit parce que ça change son délai de prescription de
 * cinq ans à un an. La durée est donc SOUS chaque option, pas cachée dans une
 * aide — et elle vient du registre juridique, jamais d'une constante écrite ici.
 */

export interface OptionSecteur {
	readonly cle: string;
	readonly libelle: string;
	/** Ce que ce secteur change, en clair. Vient du registre. */
	readonly consequence: string;
}

export function IdentiteDebiteur({
	siren,
	secteur,
	optionsSecteur,
	erreurSiren,
	onEnregistrerSiren,
	onChoisirSecteur
}: {
	siren: string | undefined;
	secteur: string | undefined;
	optionsSecteur: readonly OptionSecteur[];
	/** Le refus venu du serveur, tel quel — c'est lui qui nomme le numéro reçu. */
	erreurSiren: string | null;
	onEnregistrerSiren: (saisi: string) => void;
	onChoisirSecteur: (cle: string) => void;
}) {
	const [saisi, setSaisi] = useState(siren ?? '');

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<div className="flex flex-col gap-1">
				<Input
					size="lg"
					value={saisi}
					onChange={setSaisi}
					onBlur={() => onEnregistrerSiren(saisi)}
					placeholder="SIREN ou SIRET"
					inputMode="numeric"
					valid={erreurSiren === null}
					errorMessage={erreurSiren ?? undefined}
					infoMessage="Neuf chiffres, ou quatorze pour un SIRET. Un seul chiffre changé désignerait une autre entreprise."
					clearButton
					onClear={() => {
						setSaisi('');
						onEnregistrerSiren('');
					}}
				/>
				{/* CE QUE L'ABSENCE DE NUMÉRO COÛTE, dit à l'endroit où on peut y
				    remédier. Un gérant qui croit son débiteur surveillé au registre ne
				    le surveille pas lui-même — c'est la même règle que pour la
				    prescription, et elle vaut ici mot pour mot. */}
				{siren === undefined ? (
					<p className="flex items-start gap-1.5 text-cladd-2xs text-cladd-fg-soft">
						<AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						Sans identifiant, ce débiteur n’est pas suivi aux registres publics : une procédure
						collective ouverte à son encontre passerait inaperçue.
					</p>
				) : null}
			</div>

			<Select
				className="w-full"
				surface="cut"
				size="lg"
				title="Secteur de la relation"
				options={[...optionsSecteur]}
				value={secteur ?? 'INDETERMINE'}
				getOptionValue={(option) => option.cle}
				onChange={(cle) => onChoisirSecteur(cle as string)}
				renderOption={({ value }) => value.libelle}
				renderOptionInfo={({ value }) => value.consequence}
				keyboardHints={false}
				placeholder="Secteur à préciser"
			>
				{optionsSecteur.find((o) => o.cle === (secteur ?? 'INDETERMINE'))?.libelle ??
					'Secteur à préciser'}
			</Select>
		</div>
	);
}
