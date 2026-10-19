import type { ReactNode } from 'react';
import { Select } from '@cladd-ui/react';
import {
	EyeIcon,
	FileUpIcon,
	UserMinusIcon,
	UserPlusIcon,
	UserRoundCogIcon,
	EraserIcon,
	MessageSquareIcon,
	BellOffIcon,
	NewspaperIcon
} from 'lucide-react';
import { PageEcran, type Lecture } from '../../ui';
import { HistoriqueParJour } from '../../ui/admin';
import { grouperParJour, heureDeParis } from '../../lib/admin/dates';
import { nomCourt } from './commun';

/**
 * LE JOURNAL DE L'ÉQUIPE (16/10/2026, sur Toggl et PlanetScale) : ce que chacun a
 * fait, en phrases, groupé par jour, filtrable par membre. Chaque ouverture d'une
 * fiche client y est.
 */

export interface EntreeDuJournal {
	readonly auteur: string;
	readonly action: string;
	readonly cible: { readonly type: string; readonly id?: string; readonly libelle: string };
	readonly le: number;
}

const PHRASES: Readonly<Record<string, { icone: ReactNode; phrase: (libelle: string) => string }>> =
	{
		FICHE_OUVERTE: { icone: <EyeIcon />, phrase: (l) => `a ouvert la fiche de ${l}` },
		MEMBRE_INVITE: { icone: <UserPlusIcon />, phrase: (l) => `a invité ${l}` },
		ROLE_CHANGE: { icone: <UserRoundCogIcon />, phrase: (l) => `a changé le rôle de ${l}` },
		MEMBRE_RETIRE: { icone: <UserMinusIcon />, phrase: (l) => `a retiré ${l} de l’équipe` },
		IMPORT: { icone: <FileUpIcon />, phrase: (l) => `a importé ${l}` },
		PROSPECT_EFFACE: { icone: <EraserIcon />, phrase: (l) => `a effacé les coordonnées de ${l}` },
		CONVERSATION_OUVERTE: {
			icone: <MessageSquareIcon />,
			phrase: (l) => `a ouvert la conversation de ${l}`
		},
		CONTENU_RETIRE: {
			icone: <EraserIcon />,
			phrase: (l) => `a retiré un contenu de la conversation de ${l}`
		},
		RELANCES_SUSPENDUES: {
			icone: <BellOffIcon />,
			phrase: (l) => `a suspendu les relances automatiques de ${l}`
		},
		ARTICLE_PUBLIE: { icone: <NewspaperIcon />, phrase: (l) => `a publié l’article « ${l} »` }
	};

export function EcranJournal({
	lecture,
	auteur,
	onAuteur,
	membres,
	maintenant
}: {
	readonly lecture: Lecture<readonly EntreeDuJournal[]>;
	readonly auteur: string | null;
	readonly onAuteur: (auteur: string | null) => void;
	/** Les adresses de l'équipe, pour le filtre. */
	readonly membres: readonly string[];
	readonly maintenant: number;
}) {
	const entete = {
		genre: 'onglet' as const,
		titre: 'Journal',
		actions: (
			<span className="ml-auto">
				<Select
					size="md"
					rounded
					title="Qui"
					options={['', ...membres]}
					value={auteur ?? ''}
					keyboardHints={false}
					renderOption={({ value }) => (value === '' ? 'Toute l’équipe' : nomCourt(value))}
					renderOptionInfo={({ value }) => (value === '' ? null : value)}
					onChange={(v) => onAuteur(v === '' ? null : (v as string))}
				>
					{auteur === null ? 'Toute l’équipe' : nomCourt(auteur)}
				</Select>
			</span>
		)
	};
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;
	if (lecture.valeur.length === 0) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '📒',
						titre: 'Rien au journal',
						explication: 'Les ouvertures de fiche, les invitations et les imports s’inscrivent ici.'
					}
				}}
			/>
		);
	}
	const jours = grouperParJour(lecture.valeur, maintenant).map((g) => ({
		jour: g.jour,
		evenements: g.elements.map((e, i) => {
			const modele = PHRASES[e.action];
			return {
				id: `${e.le}-${i}`,
				icone: modele?.icone ?? <EyeIcon />,
				titre: `${nomCourt(e.auteur)} ${modele?.phrase(e.cible.libelle) ?? e.action}`,
				heure: heureDeParis(e.le)
			};
		})
	}));
	return (
		<PageEcran entete={entete}>
			<HistoriqueParJour jours={jours} />
		</PageEcran>
	);
}
