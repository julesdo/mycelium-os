import { useState } from 'react';
import { SearchField, Segmented, SegmentedButton } from '@cladd-ui/react';
import { FilterIcon, KanbanIcon, LayoutGridIcon, Table2Icon } from 'lucide-react';
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
import {
	Entonnoir,
	Kanban,
	SelecteurDAffichage,
	TableauCrm,
	type ColonneTableau,
	type OptionDAffichage
} from '../../ui/admin-vues';
import { ETAPES_DES_COMPTES, entonnoirDesComptes, rangDuCompte } from '../../lib/admin/entonnoirs';
import { LIBELLES_D_UNE_ETAPE } from '../../lib/croissance/etapes';
import { dateCourteDeParis } from '../../lib/admin/dates';
import { quandInscrit } from './aujourdhui';

/**
 * LES COMPTES CLIENTS (16/10/2026) : tous les établissements, en vues prédéfinies
 * (Calendly, HubSpot), et en quatre présentations (folk, Salesforce) — le tableau
 * triable au bureau, le kanban des étapes du parcours (en lecture : une étape se
 * déduit de ce que le compte a fait, elle ne se choisit pas), les cartes, et
 * l'entonnoir du parcours sur une période (Pipedrive, Squarespace).
 */

export type VueComptes = 'TOUS' | 'A_APPELER' | 'ESSAI' | 'ABONNES' | 'A_RISQUE' | 'CETTE_SEMAINE';
export type AffichageComptes = 'tableau' | 'kanban' | 'cartes' | 'entonnoir';

export const VUES_COMPTES: readonly VueEnPastille<VueComptes>[] = [
	{ cle: 'TOUS', libelle: 'Tous' },
	{ cle: 'A_APPELER', libelle: 'À appeler' },
	{ cle: 'ESSAI', libelle: 'En essai' },
	{ cle: 'ABONNES', libelle: 'Abonnés' },
	{ cle: 'A_RISQUE', libelle: 'À risque' },
	{ cle: 'CETTE_SEMAINE', libelle: 'Inscrits cette semaine' }
];

export const AFFICHAGES_COMPTES: readonly OptionDAffichage<AffichageComptes>[] = [
	{ cle: 'tableau', libelle: 'Tableau', Icone: Table2Icon, seulementBureau: true },
	{ cle: 'kanban', libelle: 'Kanban', Icone: KanbanIcon },
	{ cle: 'cartes', libelle: 'Cartes', Icone: LayoutGridIcon },
	{ cle: 'entonnoir', libelle: 'Entonnoir', Icone: FilterIcon }
];

export interface LigneCompte {
	readonly id: string;
	readonly nom: string;
	readonly siren?: string;
	readonly formule: string;
	readonly etape: string;
	/** Les étapes atteintes (`INSCRIT`, `ESSAI`…). */
	readonly etapes: readonly string[];
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

type Periode = '30' | '90' | 'tout';
const JOUR_MS = 24 * 60 * 60 * 1000;

const COLONNES: ColonneTableau<LigneCompte>[] = [
	{
		cle: 'nom',
		libelle: 'Compte',
		rendu: (c) => c.nom,
		tri: (a, b) => a.nom.localeCompare(b.nom, 'fr')
	},
	{
		cle: 'formule',
		libelle: 'Formule',
		largeur: 'w-36',
		rendu: (c) => <span className="text-cladd-fg-soft">{c.formule}</span>,
		tri: (a, b) => a.formule.localeCompare(b.formule, 'fr')
	},
	{
		cle: 'etape',
		libelle: 'Étape atteinte',
		largeur: 'w-48',
		rendu: (c) => c.etape,
		tri: (a, b) => rangDuCompte(a.etapes) - rangDuCompte(b.etapes)
	},
	{
		cle: 'score',
		libelle: 'Score',
		largeur: 'w-24',
		aDroite: true,
		rendu: (c) => <span className="font-semibold">{c.score}</span>,
		tri: (a, b) => a.score - b.score
	},
	{
		cle: 'source',
		libelle: 'Arrivé par',
		largeur: 'w-44',
		rendu: (c) => <span className="text-cladd-fg-soft">{c.source}</span>,
		tri: (a, b) => a.source.localeCompare(b.source, 'fr')
	},
	{
		cle: 'inscrit',
		libelle: 'Inscrit le',
		largeur: 'w-32',
		aDroite: true,
		rendu: (c) => <span className="text-cladd-fg-soft">{dateCourteDeParis(c.inscritLe)}</span>,
		tri: (a, b) => a.inscritLe - b.inscritLe
	}
];

export function EcranComptes({
	lecture,
	vue,
	onVue,
	affichage,
	onAffichage,
	terme,
	onTerme,
	maintenant
}: {
	readonly lecture: Lecture<readonly LigneCompte[]>;
	readonly vue: VueComptes;
	readonly onVue: (vue: VueComptes) => void;
	readonly affichage: AffichageComptes;
	readonly onAffichage: (affichage: AffichageComptes) => void;
	readonly terme: string;
	readonly onTerme: (terme: string) => void;
	readonly maintenant: number;
}) {
	const [periode, setPeriode] = useState<Periode>('90');
	const [etapeChoisie, setEtapeChoisie] = useState<string | null>(null);
	const entete = {
		genre: 'onglet' as const,
		titre: 'Comptes',
		actions: (
			<>
				<SearchField
					size="md"
					tightFocusRing
					className="min-w-0 flex-1 lg:max-w-xs"
					value={terme}
					onChange={(valeur) => onTerme(valeur)}
					inputMode="search"
					placeholder="Nom ou SIREN"
					inputComponentProps={{
						'aria-label': 'Chercher un compte par son nom ou son SIREN',
						enterKeyHint: 'search'
					}}
				/>
				<span className="shrink-0">
					<SelecteurDAffichage
						options={AFFICHAGES_COMPTES}
						actif={affichage}
						onChoisir={onAffichage}
					/>
				</span>
			</>
		)
	};

	if (lecture.etat !== 'pret') {
		return <PageEcran entete={entete} etat={lecture.etat} largeur="large" />;
	}
	const retenus = filtrerComptes(lecture.valeur, terme);
	const libelleVue = VUES_COMPTES.find((v) => v.cle === vue)?.libelle ?? 'Tous';

	const cartes = (
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
	);

	const tableau = (
		<TableauCrm
			colonnes={COLONNES}
			lignes={retenus}
			lien={(c) => ({ vers: '/admin/comptes/$id', parametres: { id: c.id } })}
			triInitial={{ cle: 'score', sens: 'desc' }}
			libelle="Les comptes"
		/>
	);

	const kanban = (
		<Kanban
			colonnes={ETAPES_DES_COMPTES.map((etape, i) => ({
				cle: etape,
				libelle: LIBELLES_D_UNE_ETAPE[etape],
				cartes: retenus
					.filter((c) => Math.max(0, rangDuCompte(c.etapes)) === i)
					.map((c) => ({
						id: c.id,
						titre: c.nom,
						ligne: `${c.formule} · ${c.source}`,
						action: `Score ${c.score} / 100`,
						vers: '/admin/comptes/$id' as const,
						parametres: { id: c.id }
					}))
			}))}
		/>
	);

	const dansLaPeriode =
		periode === 'tout'
			? retenus
			: retenus.filter((c) => maintenant - c.inscritLe <= Number(periode) * JOUR_MS);
	const etapes = entonnoirDesComptes(dansLaPeriode);
	const choisie = etapes.find((e) => e.cle === etapeChoisie);
	const rangChoisi = choisie === undefined ? -1 : ETAPES_DES_COMPTES.indexOf(choisie.cle as never);
	const aLEtape =
		choisie === undefined ? [] : dansLaPeriode.filter((c) => rangDuCompte(c.etapes) >= rangChoisi);
	const entonnoir = (
		<div className="flex flex-col gap-cladd-xs">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft">Les comptes inscrits</p>
				<Segmented
					activeColor="brand"
					activeVariant="solid-fill"
					aria-label="Période d’inscription"
				>
					<SegmentedButton active={periode === '30'} onClick={() => setPeriode('30')}>
						30 jours
					</SegmentedButton>
					<SegmentedButton active={periode === '90'} onClick={() => setPeriode('90')}>
						90 jours
					</SegmentedButton>
					<SegmentedButton active={periode === 'tout'} onClick={() => setPeriode('tout')}>
						Depuis le début
					</SegmentedButton>
				</Segmented>
			</div>
			<Entonnoir etapes={etapes} choisie={etapeChoisie} onChoisir={setEtapeChoisie} />
			{choisie === undefined ? (
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
					Touchez une étape pour voir les comptes qui l’ont atteinte. Un compte abonné sans avoir
					activé ses relances compte aussi à l’étape des relances : il l’a dépassée.
				</p>
			) : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle={`Ont atteint « ${choisie.libelle} »`} nombre={aLEtape.length} />
					<ListeDeCartes>
						{aLEtape.map((c) => (
							<CarteLien
								key={c.id}
								vers="/admin/comptes/$id"
								parametres={{ id: c.id }}
								titre={c.nom}
								ligne={`${c.formule} · ${c.etape}`}
								montant={`${c.score} / 100`}
							/>
						))}
					</ListeDeCartes>
				</section>
			)}
		</div>
	);

	return (
		<PageEcran entete={entete} largeur="large">
			<div className="flex flex-col gap-cladd-xs">
				<PastillesDeVue
					vues={VUES_COMPTES}
					active={vue}
					onChoisir={onVue}
					libelle="Vues des comptes"
				/>
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
				) : affichage === 'tableau' ? (
					<>
						<div className="hidden lg:block">{tableau}</div>
						<div className="lg:hidden">{cartes}</div>
					</>
				) : affichage === 'kanban' ? (
					kanban
				) : affichage === 'entonnoir' ? (
					entonnoir
				) : (
					cartes
				)}
			</div>
		</PageEcran>
	);
}
