import type { ReactNode } from 'react';
import { Select } from '@cladd-ui/react';
import { PARCOURS, REGISTRE_DES_PARCOURS, type Parcours } from '../../lib/crm/parcours';

/**
 * LE PARCOURS D'UNE FICHE, CHOISI (lot pilote du 27/10/2026). Aucun geste ne classait
 * une fiche dans « Fournisseurs publics » : le parcours se déduisait de la cible et de
 * l'activité, et un fournisseur public ne se déduit jamais (il se décide). Le même menu
 * sert la feuille d'ajout, la fiche et la barre de sélection de la liste : chaque
 * parcours avec ce qui se vend au bout.
 */
export function ChoixDuParcours({
	parcours,
	onChoisir,
	lectureSeule = false,
	pleineLargeur = false,
	popoverPosition,
	children
}: {
	/** Le parcours actuel ; absent dans la barre de sélection, où rien n'est choisi. */
	readonly parcours?: Parcours;
	readonly onChoisir: (parcours: Parcours) => void;
	readonly lectureSeule?: boolean;
	readonly pleineLargeur?: boolean;
	readonly popoverPosition?: 'top-end' | 'bottom-start';
	/** Le déclencheur, quand il ne dit pas le parcours (« Parcours », dans la barre). */
	readonly children?: ReactNode;
}) {
	const libelle = parcours === undefined ? undefined : REGISTRE_DES_PARCOURS[parcours].libelle;
	return (
		<Select<Parcours>
			size={pleineLargeur ? 'lg' : 'md'}
			rounded={!pleineLargeur}
			{...(pleineLargeur ? { surface: 'cut' as const, className: 'w-full' } : {})}
			title="Parcours"
			options={[...PARCOURS]}
			{...(parcours === undefined ? {} : { value: parcours })}
			readOnly={lectureSeule}
			keyboardHints={false}
			popoverClassName="w-72"
			{...(popoverPosition === undefined ? {} : { popoverPosition })}
			renderOption={({ value }) => REGISTRE_DES_PARCOURS[value].libelle}
			renderOptionInfo={({ value }) => REGISTRE_DES_PARCOURS[value].offre}
			onChange={(choisi) => {
				if (choisi !== parcours) onChoisir(choisi as Parcours);
			}}
			aria-label={libelle === undefined ? 'Changer de parcours' : `Parcours : ${libelle}`}
		>
			{children ?? libelle}
		</Select>
	);
}
