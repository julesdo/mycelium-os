import { AvatarPlume, NOM_DU_PILOTE, PageEcran, Plume, type HumeurPlume } from '../../ui';
import type { EcranDuProduit } from './demo';

/**
 * PLUME, DANS SES CINQ HUMEURS ET À SES TROIS TAILLES.
 *
 * La salle seule les montre côte à côte : en production, une humeur suit l'état
 * réel du pilote, et on n'en voit qu'une à la fois.
 */
const HUMEURS: readonly HumeurPlume[] = ['repos', 'travaille', 'content', 'attention', 'ecoute'];

function DemoPlume() {
	return (
		<PageEcran entete={{ genre: 'onglet', titre: NOM_DU_PILOTE }} etat="pret">
			<div className="flex flex-col items-center gap-cladd-2xs py-cladd-2xs">
				<Plume humeur="repos" taille={112} sol />
				<p className="text-cladd-xs font-semibold">{NOM_DU_PILOTE}</p>
			</div>
			<div className="grid grid-cols-5 gap-cladd-3xs">
				{HUMEURS.map((humeur) => (
					<div key={humeur} className="flex flex-col items-center gap-2">
						<Plume humeur={humeur} taille={56} sol />
						<AvatarPlume humeur={humeur} taille={32} />
						<span className="text-cladd-3xs text-cladd-fg-soft">{humeur}</span>
					</div>
				))}
			</div>
		</PageEcran>
	);
}

export const ECRANS_PLUME: readonly EcranDuProduit[] = [
	{
		route: '/app/',
		cle: 'plume',
		libelle: 'Plume',
		vide: false,
		Demo: DemoPlume
	}
];
