import { dateCourte, jourDecale } from './format';
import { LigneBouton, ListeAnalyses } from './navigation';
import { FeuillePleinEcran } from './plein-ecran';

/**
 * « ME LE RAPPELER » — trois dates à toucher, et le dossier remonte ce jour-là.
 *
 * ⚠️ TROIS CHOIX, PAS UN CALENDRIER. C'est le « Me le rappeler » de Mail et de
 * Notion Mail : demain, dans une semaine, dans un mois. Un calendrier demande de
 * choisir une date ; trois rangées demandent seulement QUAND on veut y revenir,
 * et c'est la seule question. Une date précise reste possible depuis la note du
 * dossier.
 *
 * ⚠️ ET LA FEUILLE DIT CE QUI SE PASSERA. Un rappel qu'on pose sans savoir où il
 * reviendra est un rappel qu'on note aussi ailleurs, par prudence.
 */

const CHOIX = [
	{ cle: 'demain', libelle: 'Demain', jours: 1 },
	{ cle: 'semaine', libelle: 'Dans une semaine', jours: 7 },
	{ cle: 'mois', libelle: 'Dans un mois', jours: 30 }
] as const;

export function FeuilleDeRappel({
	ouverte,
	pour,
	aujourdHui,
	onChoisir,
	onFermer
}: {
	readonly ouverte: boolean;
	/** Le client dont on veut se souvenir. */
	readonly pour: string;
	/** Le jour de l'interface : les dates proposées s'en déduisent. */
	readonly aujourdHui: string;
	/** Le jour retenu, en `AAAA-MM-JJ`. */
	readonly onChoisir: (rappelLe: string) => void;
	readonly onFermer: () => void;
}) {
	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Me le rappeler"
			sousTitre={pour}
		>
			<ListeAnalyses>
				{CHOIX.map((choix) => {
					const jour = jourDecale(aujourdHui, choix.jours);
					return (
						<LigneBouton
							key={choix.cle}
							genre="contenu"
							titre={choix.libelle}
							valeur={dateCourte(jour)}
							onClick={() => onChoisir(jour)}
						/>
					);
				})}
			</ListeAnalyses>
			<p className="mt-cladd-3xs text-cladd-2xs leading-snug text-cladd-fg-soft">
				Ce jour-là, le dossier remonte dans Aujourd’hui, avec « Votre rappel ».
			</p>
		</FeuillePleinEcran>
	);
}
