import { SearchField } from '@cladd-ui/react';
import {
	BoutonTexte,
	CarteLien,
	EnTableauSurBureau,
	EnTeteDeGroupe,
	ListeDeCartes,
	PageEcran,
	pluriel,
	type Lecture
} from '../../ui';
import { PastillesDeVue, type VueEnPastille } from '../../ui/admin';
import { quandInscrit } from './aujourdhui';

/**
 * LES COMPTES CLIENTS (16/10/2026) : tous les établissements, en vues prédéfinies
 * (Calendly, HubSpot). Au bureau, un tableau ; au téléphone, des cartes. La
 * recherche porte sur le nom et le SIREN.
 */

export type VueComptes = 'TOUS' | 'A_APPELER' | 'ESSAI' | 'ABONNES' | 'A_RISQUE' | 'CETTE_SEMAINE';

export const VUES_COMPTES: readonly VueEnPastille<VueComptes>[] = [
	{ cle: 'TOUS', libelle: 'Tous' },
	{ cle: 'A_APPELER', libelle: 'À appeler' },
	{ cle: 'ESSAI', libelle: 'En essai' },
	{ cle: 'ABONNES', libelle: 'Abonnés' },
	{ cle: 'A_RISQUE', libelle: 'À risque' },
	{ cle: 'CETTE_SEMAINE', libelle: 'Inscrits cette semaine' }
];

export interface LigneCompte {
	readonly id: string;
	readonly nom: string;
	readonly siren?: string;
	readonly formule: string;
	readonly etape: string;
	readonly score: number;
	readonly source: string;
	readonly inscritLe: number;
}

/** Le nom sans accents ni casse : « Bâtiment » se trouve en tapant « batiment ». */
function plat(texte: string): string {
	return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function filtrerComptes(comptes: readonly LigneCompte[], terme: string): LigneCompte[] {
	const t = plat(terme.trim());
	if (t === '') return [...comptes];
	const chiffres = t.replace(/\s/g, '');
	return comptes.filter(
		(c) => plat(c.nom).includes(t) || (/^\d+$/.test(chiffres) && (c.siren ?? '').includes(chiffres))
	);
}

export function EcranComptes({
	lecture,
	vue,
	onVue,
	terme,
	onTerme,
	maintenant
}: {
	readonly lecture: Lecture<readonly LigneCompte[]>;
	readonly vue: VueComptes;
	readonly onVue: (vue: VueComptes) => void;
	readonly terme: string;
	readonly onTerme: (terme: string) => void;
	readonly maintenant: number;
}) {
	const entete = {
		genre: 'onglet' as const,
		titre: 'Comptes',
		actions: (
			<SearchField
				size="md"
				tightFocusRing
				className="min-w-0 flex-1 lg:max-w-sm"
				value={terme}
				onChange={(valeur) => onTerme(valeur)}
				inputMode="search"
				placeholder="Nom ou SIREN"
				inputComponentProps={{
					'aria-label': 'Chercher un compte par son nom ou son SIREN',
					enterKeyHint: 'search'
				}}
			/>
		)
	};
	const pastilles = (
		<PastillesDeVue vues={VUES_COMPTES} active={vue} onChoisir={onVue} libelle="Vues des comptes" />
	);

	if (lecture.etat !== 'pret') {
		return (
			<PageEcran entete={entete} etat={lecture.etat} largeur="large">
				{pastilles}
			</PageEcran>
		);
	}
	const retenus = filtrerComptes(lecture.valeur, terme);
	const libelleVue = VUES_COMPTES.find((v) => v.cle === vue)?.libelle ?? 'Tous';

	return (
		<PageEcran entete={entete} largeur="large">
			<div className="flex flex-col gap-cladd-xs">
				{pastilles}
				{retenus.length === 0 ? (
					<div className="flex flex-col items-start gap-1 px-1">
						<p className="text-cladd-xs text-cladd-fg-soft">
							{lecture.valeur.length === 0
								? `Aucun compte dans la vue « ${libelleVue} ».`
								: 'Aucun compte ne répond à ce que vous cherchez.'}
						</p>
						{vue === 'TOUS' && terme === '' ? null : (
							<BoutonTexte
								onClick={() => {
									onTerme('');
									onVue('TOUS');
								}}
							>
								Voir tous les comptes
							</BoutonTexte>
						)}
					</div>
				) : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe
							libelle={`Score le plus haut d’abord · ${retenus.length} compte${pluriel(retenus.length)}`}
						/>
						<EnTableauSurBureau>
							<ListeDeCartes>
								{retenus.map((compte) => (
									<CarteLien
										key={compte.id}
										vers="/admin/comptes/$id"
										parametres={{ id: compte.id }}
										titre={compte.nom}
										ligne={`${compte.formule} · ${compte.etape} · ${compte.source}`}
										date={quandInscrit(compte.inscritLe, maintenant)}
										montant={`${compte.score} / 100`}
									/>
								))}
							</ListeDeCartes>
						</EnTableauSurBureau>
					</section>
				)}
			</div>
		</PageEcran>
	);
}
