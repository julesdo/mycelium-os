import { DatePicker } from '@cladd-ui/react/calendar';
import { fr } from 'react-day-picker/locale';

/**
 * LE CALENDRIER D'UNE DATE DE RÈGLEMENT — chargé quand il s'affiche.
 *
 * ⚠️ À PART, ET C'EST UNE MESURE (09/10/2026). Le calendrier du kit et sa date
 * française (`react-day-picker`, `date-fns`) pèsent près de deux cents kilo-
 * octets ; importés avec le rapprochement d'un virement, ils partaient dans la
 * page « Aujourd'hui », où la proposition de rapprochement se montre sans qu'on
 * ouvre jamais son calendrier.
 *
 * ⚠️ AUCUNE DATE FUTURE : le calendrier s'arrête au jour courant (voir
 * `lettrage.tsx`).
 */
export default function SelecteurDate({
	value,
	onChange,
	placeholder,
	format,
	jusquAu,
	className
}: {
	readonly value: Date | undefined;
	readonly onChange: (date: Date | undefined) => void;
	readonly placeholder: string;
	readonly format: (date: Date) => string;
	/** Le dernier jour choisissable. */
	readonly jusquAu: Date;
	readonly className?: string;
}) {
	return (
		<DatePicker
			size="lg"
			outline
			className={className}
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			format={format}
			calendarProps={{
				locale: fr,
				disabled: { after: jusquAu },
				endMonth: jusquAu
			}}
		/>
	);
}
