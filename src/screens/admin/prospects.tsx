import type { ReactNode } from 'react';
import { Button, SearchField, Segmented, SegmentedButton, Select } from '@cladd-ui/react';
import { PlusIcon, UploadIcon } from 'lucide-react';
import {
	BoutonTexte,
	EnTeteDeGroupe,
	Lien,
	ListeDeCartes,
	PageEcran,
	pluriel,
	type Lecture
} from '../../ui';
import {
	BarreDeSelection,
	CarteDePipeline,
	LigneDeProspect,
	PastillesDeVue,
	Pipeline,
	type VueEnPastille
} from '../../ui/admin';
import { echeanceDeTache } from '../../lib/admin/dates';
import {
	LIBELLES_DES_STATUTS,
	STATUTS_PROSPECT,
	statutClos,
	type Cible,
	type StatutProspect
} from '../../lib/crm/statuts';
import { nomCourt } from './commun';

/**
 * LES PROSPECTS (16/10/2026) : deux présentations sur le même état — la liste,
 * groupée par statut, et au bureau le pipeline en colonnes, où l'on glisse une
 * carte pour changer son statut (Attio, HubSpot, Pipedrive). Le statut se change
 * aussi dans la ligne ; des lignes cochées font paraître la barre d'actions
 * groupées (Attio, ClickUp).
 *
 * ⚠️ « STOP » NE SE CHOISIT PAS ICI : il efface les coordonnées et ajoute l'adresse
 * à la liste d'opposition, ce qui demande une confirmation, sur la fiche.
 */

export type VueProspects =
	| 'TOUS'
	| 'SANS_ACTION'
	| 'A_RELANCER'
	| 'INTERESSES'
	| 'PME'
	| 'CABINETS';
export type Presentation = 'liste' | 'pipeline';

export const VUES_PROSPECTS: readonly VueEnPastille<VueProspects>[] = [
	{ cle: 'TOUS', libelle: 'Tous' },
	{ cle: 'SANS_ACTION', libelle: 'Sans prochaine action' },
	{ cle: 'A_RELANCER', libelle: 'À relancer' },
	{ cle: 'INTERESSES', libelle: 'Intéressés' },
	{ cle: 'PME', libelle: 'PME' },
	{ cle: 'CABINETS', libelle: 'Cabinets' }
];

export interface LigneProspect {
	readonly id: string;
	readonly entreprise: string;
	readonly ville?: string;
	readonly activite?: string;
	readonly dirigeant?: string;
	readonly cible: Cible;
	readonly statut: StatutProspect;
	readonly prochaineAction?: string;
	readonly prochaineActionLe?: number;
	readonly dernierContactLe?: number;
	readonly responsable?: string;
	readonly compteId?: string;
}

export interface GestesProspects {
	readonly onChangerStatut: (ids: readonly string[], statut: StatutProspect) => void;
	readonly onAssigner: (ids: readonly string[], responsable: string | null) => void;
	readonly onAjouter: () => void;
}

/** Les statuts qu'on choisit dans une ligne : tous, sauf « Stop ». */
const STATUTS_CHOISISSABLES = STATUTS_PROSPECT.filter((s) => s !== 'STOP');

function plat(texte: string): string {
	return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function filtrerProspects(
	prospects: readonly LigneProspect[],
	terme: string
): LigneProspect[] {
	const t = plat(terme.trim());
	if (t === '') return [...prospects];
	return prospects.filter((p) =>
		[p.entreprise, p.ville, p.dirigeant, p.activite].some(
			(v) => v !== undefined && plat(v).includes(t)
		)
	);
}

/** « Appeler · dans 2 j », « Aucune prochaine action », ou rien à faire pour un statut clos. */
export function prochaineActionDe(
	p: LigneProspect,
	maintenant: number
): { texte: string; manquante: boolean } {
	if (statutClos(p.statut)) return { texte: 'Plus rien à faire', manquante: false };
	if (p.prochaineActionLe === undefined)
		return { texte: 'Aucune prochaine action', manquante: true };
	const { texte } = echeanceDeTache(p.prochaineActionLe, maintenant);
	return { texte: `${p.prochaineAction ?? 'Prochaine action'} · ${texte}`, manquante: false };
}

function ligneDe(p: LigneProspect): string | undefined {
	const morceaux = [
		p.ville,
		p.activite,
		p.responsable === undefined ? undefined : nomCourt(p.responsable)
	];
	const texte = morceaux.filter((m) => m !== undefined && m !== '').join(' · ');
	return texte === '' ? undefined : texte;
}

/** Le statut dans la ligne : un menu, « Stop » grisé (il passe par la fiche). */
export function SelecteurDeStatut({
	statut,
	onChanger,
	lectureSeule = false
}: {
	readonly statut: StatutProspect;
	readonly onChanger: (statut: StatutProspect) => void;
	readonly lectureSeule?: boolean;
}) {
	return (
		<Select
			size="md"
			rounded
			title="Statut"
			options={[...STATUTS_PROSPECT]}
			value={statut}
			readOnly={lectureSeule || statut === 'STOP'}
			keyboardHints={false}
			isOptionDisabled={(s) => s === 'STOP'}
			renderOption={({ value }) => LIBELLES_DES_STATUTS[value]}
			renderOptionInfo={({ value }) =>
				value === 'STOP' ? 'Depuis la fiche, qui efface les coordonnées' : null
			}
			onChange={(s) => {
				if (s !== statut) onChanger(s as StatutProspect);
			}}
			aria-label={`Statut : ${LIBELLES_DES_STATUTS[statut]}`}
		>
			{LIBELLES_DES_STATUTS[statut]}
		</Select>
	);
}

export function EcranProspects({
	lecture,
	vue,
	onVue,
	presentation,
	onPresentation,
	terme,
	onTerme,
	selection,
	onSelection,
	equipe,
	maintenant,
	gestes,
	feuilles
}: {
	readonly lecture: Lecture<readonly LigneProspect[]>;
	readonly vue: VueProspects;
	readonly onVue: (vue: VueProspects) => void;
	readonly presentation: Presentation;
	readonly onPresentation: (presentation: Presentation) => void;
	readonly terme: string;
	readonly onTerme: (terme: string) => void;
	readonly selection: ReadonlySet<string>;
	readonly onSelection: (selection: ReadonlySet<string>) => void;
	/** Les adresses de l'équipe, pour le responsable. */
	readonly equipe: readonly string[];
	readonly maintenant: number;
	/** Absents pour le rôle en lecture. */
	readonly gestes?: GestesProspects;
	/** La page pleine d'ajout, posée par la route. */
	readonly feuilles?: ReactNode;
}) {
	const entete = {
		genre: 'onglet' as const,
		titre: 'Prospects',
		actions: (
			<>
				<SearchField
					size="md"
					tightFocusRing
					className="min-w-0 flex-1 lg:max-w-sm"
					value={terme}
					onChange={(valeur) => onTerme(valeur)}
					inputMode="search"
					placeholder="Entreprise ou ville"
					inputComponentProps={{
						'aria-label': 'Chercher un prospect',
						enterKeyHint: 'search'
					}}
				/>
				<span className="hidden shrink-0 lg:inline-flex">
					<Segmented activeColor="brand" activeVariant="solid-fill">
						<SegmentedButton
							active={presentation === 'liste'}
							onClick={() => onPresentation('liste')}
						>
							Liste
						</SegmentedButton>
						<SegmentedButton
							active={presentation === 'pipeline'}
							onClick={() => onPresentation('pipeline')}
						>
							Pipeline
						</SegmentedButton>
					</Segmented>
				</span>
				{gestes === undefined ? null : (
					<>
						<Button
							as={Lien}
							to="/admin/prospects/importer"
							size="md"
							rounded
							square
							variant="solid"
							outline={false}
							className="shrink-0"
							aria-label="Importer le tableur"
							title="Importer le tableur"
						>
							<UploadIcon />
						</Button>
						<Button
							size="md"
							rounded
							square
							variant="solid"
							outline={false}
							className="shrink-0 lg:hidden"
							aria-label="Ajouter un prospect"
							onClick={gestes.onAjouter}
						>
							<PlusIcon />
						</Button>
					</>
				)}
			</>
		)
	};
	const pastilles = (
		<PastillesDeVue
			vues={VUES_PROSPECTS}
			active={vue}
			onChoisir={onVue}
			libelle="Vues des prospects"
		/>
	);

	if (lecture.etat !== 'pret') {
		return (
			<PageEcran entete={entete} etat={lecture.etat} largeur="large">
				{pastilles}
			</PageEcran>
		);
	}

	const retenus = filtrerProspects(lecture.valeur, terme);
	const basculer = (id: string) => {
		const suivante = new Set(selection);
		if (suivante.has(id)) suivante.delete(id);
		else suivante.add(id);
		onSelection(suivante);
	};
	const ids = [...selection];

	const vide =
		retenus.length === 0 ? (
			<div className="flex flex-col items-start gap-1 px-1">
				<p className="text-cladd-xs text-cladd-fg-soft">
					{lecture.valeur.length === 0
						? vue === 'TOUS'
							? 'Aucun prospect pour l’instant. Importez votre tableur, ou ajoutez-en un.'
							: 'Aucun prospect dans cette vue.'
						: 'Aucun prospect ne répond à ce que vous cherchez.'}
				</p>
				{lecture.valeur.length === 0 && vue === 'TOUS' && gestes !== undefined ? (
					<BoutonTexte as={Lien} to="/admin/prospects/importer">
						Importer le tableur
					</BoutonTexte>
				) : vue === 'TOUS' && terme === '' ? null : (
					<BoutonTexte
						onClick={() => {
							onTerme('');
							onVue('TOUS');
						}}
					>
						Voir tous les prospects
					</BoutonTexte>
				)}
			</div>
		) : null;

	const liste = (
		<div className="flex flex-col gap-cladd-sm">
			{STATUTS_PROSPECT.map((statut) => {
				const duStatut = retenus.filter((p) => p.statut === statut);
				if (duStatut.length === 0) return null;
				return (
					<section key={statut} className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle={LIBELLES_DES_STATUTS[statut]} nombre={duStatut.length} />
						<ListeDeCartes>
							{duStatut.map((p) => {
								const action = prochaineActionDe(p, maintenant);
								const ligne = ligneDe(p);
								return (
									<LigneDeProspect
										key={p.id}
										titre={p.entreprise}
										{...(ligne === undefined ? {} : { ligne })}
										action={action.texte}
										sansAction={action.manquante}
										vers="/admin/prospects/$id"
										parametres={{ id: p.id }}
										selectionnee={selection.has(p.id)}
										onSelectionner={() => basculer(p.id)}
										statut={
											<SelecteurDeStatut
												statut={p.statut}
												lectureSeule={gestes === undefined}
												onChanger={(s) => gestes?.onChangerStatut([p.id], s)}
											/>
										}
									/>
								);
							})}
						</ListeDeCartes>
					</section>
				);
			})}
		</div>
	);

	/* Au bureau seulement : au téléphone, la liste groupée par statut en tient lieu. */
	const pipeline = (
		<div className="hidden lg:block">
			<Pipeline
				colonnes={STATUTS_CHOISISSABLES.map((statut) => {
					const duStatut = retenus.filter((p) => p.statut === statut);
					return {
						cle: statut,
						libelle: LIBELLES_DES_STATUTS[statut],
						nombre: duStatut.length,
						children: duStatut.map((p) => {
							const action = prochaineActionDe(p, maintenant);
							const ligne = ligneDe(p);
							return (
								<CarteDePipeline
									key={p.id}
									id={p.id}
									titre={p.entreprise}
									{...(ligne === undefined ? {} : { ligne })}
									action={action.texte}
									sansAction={action.manquante}
									vers="/admin/prospects/$id"
									parametres={{ id: p.id }}
								/>
							);
						})
					};
				})}
				onDeposer={(id, statut) => {
					const p = retenus.find((x) => x.id === id);
					if (p !== undefined && p.statut !== statut) gestes?.onChangerStatut([id], statut);
				}}
			/>
		</div>
	);

	return (
		<PageEcran entete={entete} largeur="large">
			<div className="flex flex-col gap-cladd-xs">
				{pastilles}
				{vide ??
					(presentation === 'pipeline' ? (
						<>
							{pipeline}
							<div className="lg:hidden">{liste}</div>
						</>
					) : (
						liste
					))}
			</div>
			{gestes === undefined ? null : (
				<BarreDeSelection
					nombre={selection.size}
					libelle={`prospect${pluriel(selection.size)}`}
					onEffacer={() => onSelection(new Set())}
				>
					<Select
						size="md"
						rounded
						title="Changer le statut"
						options={[...STATUTS_CHOISISSABLES]}
						keyboardHints={false}
						popoverPosition="top-end"
						renderOption={({ value }) => LIBELLES_DES_STATUTS[value]}
						onChange={(s) => {
							gestes.onChangerStatut(ids, s as StatutProspect);
							onSelection(new Set());
						}}
					>
						Statut
					</Select>
					<Select
						size="md"
						rounded
						title="Responsable"
						options={['', ...equipe]}
						keyboardHints={false}
						popoverPosition="top-end"
						renderOption={({ value }) => (value === '' ? 'Personne' : nomCourt(value))}
						renderOptionInfo={({ value }) => (value === '' ? null : value)}
						onChange={(r) => {
							gestes.onAssigner(ids, r === '' ? null : (r as string));
							onSelection(new Set());
						}}
					>
						Responsable
					</Select>
				</BarreDeSelection>
			)}
			{feuilles}
		</PageEcran>
	);
}
