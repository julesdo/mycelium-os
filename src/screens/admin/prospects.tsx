import { useState, type ReactNode } from 'react';
import { Button, SearchField, Select } from '@cladd-ui/react';
import { FilterIcon, KanbanIcon, ListIcon, PlusIcon, Table2Icon, UploadIcon } from 'lucide-react';
import {
	BoutonTexte,
	CarteLien,
	EnTeteDeGroupe,
	Lien,
	ListeDeCartes,
	PageEcran,
	pluriel,
	type Lecture
} from '../../ui';
import {
	BarreDeSelection,
	LigneDeProspect,
	PastillesDeVue,
	type VueEnPastille
} from '../../ui/admin';
import {
	Entonnoir,
	Kanban,
	SelecteurDAffichage,
	TableauCrm,
	type ColonneTableau,
	type OptionDAffichage
} from '../../ui/admin-vues';
import { atteintEtapeDeProspection, entonnoirDeProspection } from '../../lib/admin/entonnoirs';
import { echeanceDeTache } from '../../lib/admin/dates';
import {
	LIBELLES_DES_STATUTS,
	STATUTS_PROSPECT,
	statutClos,
	type Cible,
	type StatutProspect
} from '../../lib/crm/statuts';
import { quandInscrit } from './aujourdhui';
import { nomCourt } from './commun';

/**
 * LES PROSPECTS (16/10/2026) : quatre vues sur le même état, comme chez folk et
 * Salesforce — le tableau triable (au bureau), le kanban où l'on glisse une carte
 * pour changer son statut (Pipedrive, HubSpot, Attio ; au doigt aussi), la liste
 * groupée par statut, et l'entonnoir de la prospection (Pipedrive). Le statut se
 * change aussi dans la ligne ; des lignes cochées font paraître la barre d'actions
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
export type AffichageProspects = 'tableau' | 'kanban' | 'liste' | 'entonnoir';

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

export const AFFICHAGES_PROSPECTS: readonly OptionDAffichage<AffichageProspects>[] = [
	{ cle: 'tableau', libelle: 'Tableau', Icone: Table2Icon, seulementBureau: true },
	{ cle: 'kanban', libelle: 'Kanban', Icone: KanbanIcon },
	{ cle: 'liste', libelle: 'Liste', Icone: ListIcon },
	{ cle: 'entonnoir', libelle: 'Entonnoir', Icone: FilterIcon }
];

export function EcranProspects({
	lecture,
	vue,
	onVue,
	affichage,
	onAffichage,
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
	readonly affichage: AffichageProspects;
	readonly onAffichage: (affichage: AffichageProspects) => void;
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
	const [etapeChoisie, setEtapeChoisie] = useState<string | null>(null);
	const entete = {
		genre: 'onglet' as const,
		titre: 'Prospects',
		actions: (
			<>
				<SearchField
					size="md"
					tightFocusRing
					className="min-w-0 flex-1 lg:max-w-xs"
					value={terme}
					onChange={(valeur) => onTerme(valeur)}
					inputMode="search"
					placeholder="Entreprise ou ville"
					inputComponentProps={{
						'aria-label': 'Chercher un prospect',
						enterKeyHint: 'search'
					}}
				/>
				<span className="shrink-0">
					<SelecteurDAffichage
						options={AFFICHAGES_PROSPECTS}
						actif={affichage}
						onChoisir={onAffichage}
					/>
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
							className="hidden shrink-0 sm:inline-flex"
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
		return <PageEcran entete={entete} etat={lecture.etat} largeur="large" />;
	}

	const retenus = filtrerProspects(lecture.valeur, terme);
	const basculer = (id: string) => {
		const suivante = new Set(selection);
		if (suivante.has(id)) suivante.delete(id);
		else suivante.add(id);
		onSelection(suivante);
	};
	const ids = [...selection];
	const changer = (id: string, s: StatutProspect) => gestes?.onChangerStatut([id], s);

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
												onChanger={(s) => changer(p.id, s)}
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

	const colonnesDuTableau: ColonneTableau<LigneProspect>[] = [
		{
			cle: 'entreprise',
			libelle: 'Entreprise',
			rendu: (p) => p.entreprise,
			tri: (a, b) => a.entreprise.localeCompare(b.entreprise, 'fr')
		},
		{
			cle: 'statut',
			libelle: 'Statut',
			largeur: 'w-44',
			interactive: true,
			rendu: (p) => (
				<SelecteurDeStatut
					statut={p.statut}
					lectureSeule={gestes === undefined}
					onChanger={(s) => changer(p.id, s)}
				/>
			),
			tri: (a, b) => STATUTS_PROSPECT.indexOf(a.statut) - STATUTS_PROSPECT.indexOf(b.statut)
		},
		{
			cle: 'ville',
			libelle: 'Ville',
			largeur: 'w-32',
			rendu: (p) => <span className="text-cladd-fg-soft">{p.ville ?? ''}</span>,
			tri: (a, b) => (a.ville ?? '').localeCompare(b.ville ?? '', 'fr')
		},
		{
			cle: 'action',
			libelle: 'Prochaine action',
			largeur: 'min-w-48',
			rendu: (p) => {
				const action = prochaineActionDe(p, maintenant);
				return (
					<span className={action.manquante ? 'font-semibold' : 'text-cladd-fg-soft'}>
						{action.texte}
					</span>
				);
			},
			tri: (a, b) => (a.prochaineActionLe ?? Infinity) - (b.prochaineActionLe ?? Infinity)
		},
		{
			cle: 'contact',
			libelle: 'Dernier contact',
			largeur: 'w-36',
			rendu: (p) => (
				<span className="text-cladd-fg-soft">
					{p.dernierContactLe === undefined
						? 'Jamais'
						: quandInscrit(p.dernierContactLe, maintenant)}
				</span>
			),
			tri: (a, b) => (a.dernierContactLe ?? 0) - (b.dernierContactLe ?? 0)
		},
		{
			cle: 'responsable',
			libelle: 'Responsable',
			largeur: 'w-28',
			rendu: (p) => (
				<span className="text-cladd-fg-soft">
					{p.responsable === undefined ? '' : nomCourt(p.responsable)}
				</span>
			),
			tri: (a, b) => (a.responsable ?? '').localeCompare(b.responsable ?? '')
		}
	];

	const tableau = (
		<TableauCrm
			colonnes={colonnesDuTableau}
			lignes={retenus}
			lien={(p) => ({ vers: '/admin/prospects/$id', parametres: { id: p.id } })}
			libelle="Les prospects"
			{...(gestes === undefined
				? {}
				: { selection: { choisis: selection, onChoisir: onSelection } })}
		/>
	);

	const kanban = (
		<Kanban
			libelleDeLaCarte="le prospect"
			colonnes={STATUTS_CHOISISSABLES.map((statut) => {
				const duStatut = retenus.filter((p) => p.statut === statut);
				const sansAction = duStatut.filter(
					(p) => prochaineActionDe(p, maintenant).manquante
				).length;
				return {
					cle: statut,
					libelle: LIBELLES_DES_STATUTS[statut],
					...(sansAction === 0 ? {} : { precision: `${sansAction} sans prochaine action` }),
					cartes: duStatut.map((p) => {
						const action = prochaineActionDe(p, maintenant);
						const ligne = ligneDe(p);
						return {
							id: p.id,
							titre: p.entreprise,
							...(ligne === undefined ? {} : { ligne }),
							action: action.texte,
							alerte: action.manquante,
							vers: '/admin/prospects/$id' as const,
							parametres: { id: p.id }
						};
					})
				};
			})}
			{...(gestes === undefined
				? {}
				: {
						onDeposer: (id: string, statut: StatutProspect) => gestes.onChangerStatut([id], statut)
					})}
		/>
	);

	const etapes = entonnoirDeProspection(retenus.map((p) => p.statut));
	const choisie = etapes.find((e) => e.cle === etapeChoisie);
	const aLEtape =
		choisie === undefined
			? []
			: retenus.filter((p) => atteintEtapeDeProspection(p.statut, choisie.cle));
	const entonnoir = (
		<div className="flex flex-col gap-cladd-xs">
			<Entonnoir etapes={etapes} choisie={etapeChoisie} onChoisir={setEtapeChoisie} />
			{choisie === undefined ? (
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
					Touchez une étape pour voir les prospects qui l’ont atteinte. Un prospect perdu ou en «
					Stop » a répondu : il compte jusqu’à « Ont répondu ».
				</p>
			) : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle={`Ont atteint « ${choisie.libelle} »`} nombre={aLEtape.length} />
					<ListeDeCartes>
						{aLEtape.map((p) => (
							<CarteLien
								key={p.id}
								vers="/admin/prospects/$id"
								parametres={{ id: p.id }}
								titre={p.entreprise}
								ligne={[LIBELLES_DES_STATUTS[p.statut], p.ville].filter(Boolean).join(' · ')}
								date={prochaineActionDe(p, maintenant).texte}
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
				{pastilles}
				{vide ??
					(affichage === 'tableau' ? (
						<>
							<div className="hidden lg:block">{tableau}</div>
							<div className="lg:hidden">{liste}</div>
						</>
					) : affichage === 'kanban' ? (
						kanban
					) : affichage === 'entonnoir' ? (
						entonnoir
					) : (
						liste
					))}
			</div>
			{gestes === undefined || affichage === 'entonnoir' || affichage === 'kanban' ? null : (
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
