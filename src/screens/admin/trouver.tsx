import { useState } from 'react';
import { Segmented, SegmentedButton } from '@cladd-ui/react';
import {
	BriefcaseIcon,
	BuildingIcon,
	CalculatorIcon,
	HardHatIcon,
	HospitalIcon,
	LandmarkIcon,
	TruckIcon
} from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	CarteBouton,
	EnTeteDeGroupe,
	FeuillePleinEcran,
	ListeDeCartes,
	MessageErreur,
	NombreHero,
	pluriel
} from '../../ui';
import { LigneACocher } from '../../ui/admin';
import { BarreDAvancement, IconeDeTravail, type EtatAffiche } from '../../ui/travaux';
import {
	CLES_ZONES,
	departementsEnClair,
	SECTEURS,
	ZONES,
	type CleSecteur,
	type CleZone,
	type EntrepriseTrouvee
} from '../../lib/crm/annuaire';
import {
	ACHETEURS,
	anneeDeDepart,
	CLES_ACHETEURS,
	type CleAcheteurs,
	type TitulaireDecp
} from '../../lib/crm/decp';
import { REGISTRE_DES_PARCOURS, type Parcours } from '../../lib/crm/parcours';
import { dateCourteDeParis, jourDeParis } from '../../lib/admin/dates';
import { messageDeRefus } from './formulaire-prospect';

/**
 * TROUVER DES PROSPECTS (17/10/2026 ; le parcours d'abord depuis le 19/10/2026, lot 5).
 *
 * D'abord QUEL PARCOURS : les fournisseurs publics se trouvent dans les données de la
 * commande publique (qui a gagné des marchés d'hôpitaux ou de collectivités), les
 * transporteurs, les PME et les cabinets à l'annuaire public des entreprises. Puis la
 * zone, puis un toucher sur ce qu'on cherche lance la recherche ; on coche ; rien n'entre
 * avant « Ajouter ». Depuis le 20/10/2026, chaque recherche et chaque ajout de fournisseurs
 * est un TRAVAIL qui tourne en arrière-plan (`convex/admin/travaux.ts`) : l'écran le suit en
 * direct, on peut le fermer, et la file d'attente (`/admin/travaux`) le rouvre. L'estimation d'un fournisseur public se calcule à l'ajout, sur tous
 * ses marchés. L'e-mail ne vient d'aucune de ces sources : il se lit sur le site de
 * l'entreprise, depuis sa fiche.
 */

export interface EntrepriseAffichee extends EntrepriseTrouvee {
	/** Déjà au CRM (même SIREN). */
	readonly connue: boolean;
}

export interface TitulaireAffiche extends Omit<TitulaireDecp, 'acheteurs'> {
	readonly acheteurs: readonly string[];
	readonly connue: boolean;
}

/** Les parcours qu'on trouve ici, et ce qu'on y cherche. */
const RECHERCHES: Readonly<
	Record<
		Exclude<Parcours, 'PILOTE'>,
		{ readonly ligne: string; readonly secteurs?: readonly CleSecteur[] }
	>
> = {
	FOURNISSEUR_PUBLIC: { ligne: 'Titulaires de marchés d’hôpitaux ou de collectivités' },
	TRANSPORTEUR: { ligne: 'Transport routier de marchandises', secteurs: ['TRANSPORT'] },
	PME_LOGICIEL: { ligne: 'Bâtiment, services aux entreprises', secteurs: ['BATIMENT', 'SERVICES'] },
	EXPERT_COMPTABLE: { ligne: 'Cabinets comptables', secteurs: ['CABINETS'] }
};
const PARCOURS_TROUVABLES = Object.keys(RECHERCHES) as Exclude<Parcours, 'PILOTE'>[];

const ICONES_PARCOURS: Record<Exclude<Parcours, 'PILOTE'>, typeof TruckIcon> = {
	FOURNISSEUR_PUBLIC: LandmarkIcon,
	TRANSPORTEUR: TruckIcon,
	PME_LOGICIEL: BuildingIcon,
	EXPERT_COMPTABLE: CalculatorIcon
};

const ICONES: Record<CleSecteur, typeof TruckIcon> = {
	TRANSPORT: TruckIcon,
	BATIMENT: HardHatIcon,
	SERVICES: BriefcaseIcon,
	CABINETS: CalculatorIcon
};

const ICONES_ACHETEURS: Record<CleAcheteurs, typeof TruckIcon> = {
	HOPITAUX: HospitalIcon,
	COLLECTIVITES: LandmarkIcon
};

function Icone({ de: I }: { readonly de: typeof TruckIcon }) {
	return <I aria-hidden />;
}

/** « 12 480 € » : un ordre de grandeur, sans centimes. */
function eurosRonds(centimes: bigint): string {
	return `${new Intl.NumberFormat('fr-FR').format(Number(centimes / 100n))} €`;
}

/** Ce qui part au serveur : l'entreprise, sans la marque « déjà connue » de l'écran. */
function sansLaMarque(e: EntrepriseAffichee): EntrepriseTrouvee {
	const champs: EntrepriseTrouvee = { siren: e.siren, entreprise: e.entreprise };
	for (const cle of ['activite', 'effectif', 'ville', 'dirigeant', 'fonction'] as const) {
		const valeur = e[cle];
		if (valeur !== undefined) Object.assign(champs, { [cle]: valeur });
	}
	return champs;
}

function titulaireSansLaMarque(t: TitulaireAffiche): TitulaireDecp {
	const { connue: _connue, ...reste } = t;
	void _connue;
	return { ...reste, acheteurs: [...t.acheteurs] };
}

/** L'ajout d'un fournisseur public lit l'annuaire et ses marchés : quarante à la fois, en arrière-plan. */
const AJOUT_DECP_MAX = 40;

type Etape = 'parcours' | 'criteres' | 'travail' | 'resume';
export type Recherche =
	| { readonly source: 'ANNUAIRE'; readonly secteur: CleSecteur }
	| { readonly source: 'DECP'; readonly acheteurs: CleAcheteurs };

/** Ce qu'un travail de l'équipe rend à l'écran : son état en direct, puis son résultat. */
export interface TravailSuivi {
	readonly _id: string;
	readonly genre: 'CHERCHER_ANNUAIRE' | 'CHERCHER_DECP' | 'AJOUTER_DECP';
	readonly criteres: {
		readonly secteur?: CleSecteur;
		readonly acheteurs?: CleAcheteurs;
		readonly zone: CleZone;
		readonly page: number;
	};
	readonly etat: EtatAffiche;
	readonly etape?: string;
	readonly fait?: number;
	readonly total?: number;
	readonly erreur?: string;
	readonly resultat?:
		| {
				readonly genre: 'ANNUAIRE';
				readonly pages: number;
				readonly derniere: number;
				readonly entreprises: readonly EntrepriseAffichee[];
		  }
		| {
				readonly genre: 'DECP';
				readonly pages: number;
				readonly derniere: number;
				readonly nonDiffusibles: number;
				readonly titulaires: readonly TitulaireAffiche[];
		  }
		| {
				readonly genre: 'AJOUT';
				readonly importes: number;
				readonly ecartes: number;
				readonly horsZone: number;
				readonly echecs: readonly string[];
		  };
}

/** Les pages déjà lues d'une recherche, quand on demande la suite. */
interface PagesLues {
	readonly entreprises: readonly EntrepriseAffichee[];
	readonly titulaires: readonly TitulaireAffiche[];
	readonly nonDiffusibles: number;
	readonly pages: number;
}
const AUCUNE_PAGE: PagesLues = { entreprises: [], titulaires: [], nonDiffusibles: 0, pages: 0 };

function sansDoublon<T extends { readonly siren: string }>(
	avant: readonly T[],
	apres: readonly T[]
): T[] {
	const vus = new Set(avant.map((x) => x.siren));
	return [...avant, ...apres.filter((x) => !vus.has(x.siren))];
}

function rechercheDu(travail: TravailSuivi): Recherche | null {
	const { secteur, acheteurs } = travail.criteres;
	if (travail.genre === 'CHERCHER_ANNUAIRE' && secteur !== undefined)
		return { source: 'ANNUAIRE', secteur };
	if (travail.genre !== 'CHERCHER_ANNUAIRE' && acheteurs !== undefined)
		return { source: 'DECP', acheteurs };
	return null;
}

export function ParcoursTrouver({
	onFermer,
	travail,
	suivi,
	onSuivre,
	onLancerRecherche,
	onAjouter,
	onLancerAjoutDecp
}: {
	readonly onFermer: () => void;
	/** Le travail suivi : `undefined` le temps de le lire, `null` s'il n'existe plus. */
	readonly travail: TravailSuivi | null | undefined;
	readonly suivi: string | null;
	readonly onSuivre: (id: string | null) => void;
	readonly onLancerRecherche: (recherche: Recherche, zone: CleZone, page: number) => Promise<string>;
	readonly onAjouter: (
		secteur: CleSecteur,
		zone: CleZone,
		entreprises: readonly EntrepriseTrouvee[]
	) => Promise<{ importes: number; ecartes: number }>;
	readonly onLancerAjoutDecp: (
		acheteurs: CleAcheteurs,
		zone: CleZone,
		titulaires: readonly TitulaireDecp[]
	) => Promise<string>;
}) {
	const [etape, setEtape] = useState<Etape>(suivi === null ? 'parcours' : 'travail');
	const [parcours, setParcours] = useState<Exclude<Parcours, 'PILOTE'> | null>(null);
	const [zoneChoisie, setZoneChoisie] = useState<CleZone>('PETITE_COURONNE');
	const [lues, setLues] = useState<PagesLues>(AUCUNE_PAGE);
	const [cochees, setCochees] = useState<ReadonlySet<string>>(new Set());
	const [ajoutAnnuaire, setAjoutAnnuaire] = useState<{ importes: number; ecartes: number } | null>(
		null
	);
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	// ── Ce que montre l'écran, déduit du travail suivi ──
	const t = etape === 'travail' ? travail : null;
	const vue:
		| 'parcours'
		| 'criteres'
		| 'resume'
		| 'chargement'
		| 'introuvable'
		| 'attente'
		| 'resultats'
		| 'bilan'
		| 'echec' =
		etape !== 'travail'
			? etape
			: travail === undefined
				? 'chargement'
				: travail === null
					? 'introuvable'
					: travail.etat === 'FAIT'
						? travail.genre === 'AJOUTER_DECP'
							? 'bilan'
							: 'resultats'
						: travail.etat === 'ECHEC'
							? 'echec'
							: 'attente';
	const recherche = t === null || t === undefined ? null : rechercheDu(t);
	const zone = t === null || t === undefined ? zoneChoisie : t.criteres.zone;
	const resultat = t?.resultat;
	const trouvees =
		resultat?.genre === 'ANNUAIRE' ? sansDoublon(lues.entreprises, resultat.entreprises) : lues.entreprises;
	const titulaires =
		resultat?.genre === 'DECP' ? sansDoublon(lues.titulaires, resultat.titulaires) : lues.titulaires;
	const nonDiffusibles = lues.nonDiffusibles + (resultat?.genre === 'DECP' ? resultat.nonDiffusibles : 0);
	const pages =
		resultat?.genre === 'ANNUAIRE' || resultat?.genre === 'DECP' ? resultat.pages : lues.pages;
	const page =
		resultat?.genre === 'ANNUAIRE' || resultat?.genre === 'DECP'
			? resultat.derniere
			: (t?.criteres.page ?? 1) - 1;
	// La suite d'une recherche se cherche sous la liste déjà lue, qui reste à l'écran.
	const suiteEnCours = vue === 'attente' && trouvees.length + titulaires.length > 0;
	const montreLaListe = vue === 'resultats' || suiteEnCours;

	async function lancer(r: Recherche, z: CleZone, suivante: number, garder: PagesLues) {
		setErreur(null);
		setEnCours(true);
		try {
			const id = await onLancerRecherche(r, z, suivante);
			setLues(garder);
			if (suivante === 1) setCochees(new Set());
			onSuivre(id);
			setEtape('travail');
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	async function ajouter() {
		if (recherche === null) return;
		setErreur(null);
		setEnCours(true);
		try {
			if (recherche.source === 'ANNUAIRE') {
				const choisies = trouvees.filter((e) => cochees.has(e.siren)).map(sansLaMarque);
				setAjoutAnnuaire(await onAjouter(recherche.secteur, zone, choisies));
				setEtape('resume');
			} else {
				const choisis = titulaires.filter((x) => cochees.has(x.siren)).map(titulaireSansLaMarque);
				const id = await onLancerAjoutDecp(recherche.acheteurs, zone, choisis);
				setLues(AUCUNE_PAGE);
				onSuivre(id);
			}
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	const basculer = (siren: string) => {
		const suivante = new Set(cochees);
		if (suivante.has(siren)) suivante.delete(siren);
		else suivante.add(siren);
		setCochees(suivante);
	};
	const decp = recherche?.source === 'DECP';
	const libres = decp
		? titulaires.filter((x) => !x.connue).map((x) => x.siren)
		: trouvees.filter((e) => !e.connue).map((e) => e.siren);
	const plafond = decp ? AJOUT_DECP_MAX : Infinity;
	const aCocher = libres.slice(0, plafond);
	const toutesCochees = aCocher.length > 0 && aCocher.every((s) => cochees.has(s));
	const nombre = cochees.size;
	const tropDeCochees = nombre > plafond;
	const nombreDeLignes = decp ? titulaires.length : trouvees.length;
	const ajoutEnCours = t?.genre === 'AJOUTER_DECP';

	const titres: Record<typeof vue, string> = {
		parcours: 'Trouver des prospects',
		criteres: parcours === null ? 'Trouver' : REGISTRE_DES_PARCOURS[parcours].libelle,
		chargement: 'Trouver',
		introuvable: 'Recherche introuvable',
		attente: ajoutEnCours ? 'Ajout en cours' : 'Recherche en cours',
		resultats:
			recherche === null
				? 'Les résultats'
				: recherche.source === 'ANNUAIRE'
					? SECTEURS[recherche.secteur].libelle
					: ACHETEURS[recherche.acheteurs].libelle,
		bilan: 'C’est ajouté',
		resume: 'C’est ajouté',
		echec: ajoutEnCours ? 'L’ajout s’est arrêté' : 'La recherche s’est arrêtée'
	};

	const pied =
		vue === 'resultats' ? (
			<BoutonPrincipal
				pleineLargeur
				disabled={enCours || nombre === 0 || tropDeCochees}
				onClick={() => void ajouter()}
			>
				{nombre === 0
					? `Cochez des ${decp ? 'fournisseurs' : 'entreprises'}`
					: tropDeCochees
						? `${AJOUT_DECP_MAX} au plus à la fois`
						: `Ajouter ${nombre} prospect${pluriel(nombre)}`}
			</BoutonPrincipal>
		) : vue === 'attente' ? (
			<BoutonSecondaire pleineLargeur onClick={onFermer}>
				Fermer, {ajoutEnCours ? 'l’ajout' : 'la recherche'} continue
			</BoutonSecondaire>
		) : vue === 'bilan' || vue === 'resume' ? (
			<BoutonPrincipal pleineLargeur onClick={onFermer}>
				Voir les prospects
			</BoutonPrincipal>
		) : vue === 'echec' && recherche !== null ? (
			<BoutonPrincipal
				pleineLargeur
				disabled={enCours}
				onClick={() => void lancer(recherche, zone, Math.max(1, page + 1), lues)}
			>
				Relancer la recherche
			</BoutonPrincipal>
		) : undefined;

	const precedente: Etape | undefined =
		etape === 'criteres'
			? 'parcours'
			: etape === 'travail' && parcours !== null && !montreLaListe && vue !== 'bilan'
				? 'criteres'
				: undefined;
	const [depuis] = useState(() => anneeDeDepart(jourDeParis(Date.now())).slice(0, 4));

	return (
		<FeuillePleinEcran
			ouverte
			onFermer={precedente === undefined ? onFermer : () => setEtape(precedente)}
			retour={precedente !== undefined}
			titre={titres[vue]}
			{...(montreLaListe ? { sousTitre: ZONES[zone].libelle } : {})}
			{...(pied === undefined ? {} : { pied })}
		>
			<div className="flex flex-col gap-cladd-sm">
				{vue === 'parcours' ? (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Quel parcours" />
						<ListeDeCartes>
							{PARCOURS_TROUVABLES.map((p) => (
								<CarteBouton
									key={p}
									titre={REGISTRE_DES_PARCOURS[p].libelle}
									ligne={RECHERCHES[p].ligne}
									icone={<Icone de={ICONES_PARCOURS[p]} />}
									onClick={() => {
										setParcours(p);
										setEtape('criteres');
									}}
								/>
							))}
						</ListeDeCartes>
					</section>
				) : null}

				{vue === 'criteres' && parcours !== null ? (
					<>
						<p className="px-1 text-cladd-xs text-cladd-fg-soft">
							{parcours === 'FOURNISSEUR_PUBLIC'
								? `Les PME titulaires de marchés publics depuis ${depuis}, d’après les données de la commande publique. Leur estimation se calcule à l’ajout, sur tous leurs marchés.`
								: 'Les PME de 3 à 49 salariés, en activité, à l’annuaire public des entreprises. Vous cochez celles qui entrent ; l’e-mail se trouve ensuite sur leur site.'}
						</p>
						<section className="flex flex-col gap-cladd-3xs">
							<EnTeteDeGroupe libelle="Où" />
							<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
								{CLES_ZONES.map((z) => (
									<SegmentedButton
										key={z}
										active={zoneChoisie === z}
										onClick={() => setZoneChoisie(z)}
									>
										{ZONES[z].court}
									</SegmentedButton>
								))}
							</Segmented>
							<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
								{departementsEnClair(zoneChoisie)}
							</p>
						</section>
						<section className="flex flex-col gap-cladd-3xs">
							<EnTeteDeGroupe
								libelle={parcours === 'FOURNISSEUR_PUBLIC' ? 'Quels acheteurs' : 'Quel secteur'}
							/>
							<ListeDeCartes>
								{parcours === 'FOURNISSEUR_PUBLIC'
									? CLES_ACHETEURS.map((a) => (
											<CarteBouton
												key={a}
												titre={ACHETEURS[a].libelle}
												ligne={ACHETEURS[a].detail}
												icone={<Icone de={ICONES_ACHETEURS[a]} />}
												onClick={() => {
													if (!enCours)
														void lancer({ source: 'DECP', acheteurs: a }, zoneChoisie, 1, AUCUNE_PAGE);
												}}
											/>
										))
									: (RECHERCHES[parcours].secteurs ?? []).map((s) => (
											<CarteBouton
												key={s}
												titre={SECTEURS[s].libelle}
												ligne={SECTEURS[s].detail}
												icone={<Icone de={ICONES[s]} />}
												onClick={() => {
													if (!enCours)
														void lancer({ source: 'ANNUAIRE', secteur: s }, zoneChoisie, 1, AUCUNE_PAGE);
												}}
											/>
										))}
							</ListeDeCartes>
						</section>
						<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
							La recherche tourne en arrière-plan : vous pouvez fermer, son résultat vous attend
							dans la file d’attente.
						</p>
					</>
				) : null}

				{vue === 'chargement' ? (
					<p className="px-1 text-cladd-xs text-cladd-fg-soft">Lecture du travail…</p>
				) : null}

				{vue === 'introuvable' ? (
					<p className="px-1 text-cladd-xs text-cladd-fg-soft">
						Ce travail n’est plus dans la file : il a été retiré. Lancez une recherche nouvelle.
					</p>
				) : null}

				{vue === 'attente' && !suiteEnCours ? (
					<div className="flex flex-col items-center gap-cladd-2xs py-cladd-sm text-center">
						<IconeDeTravail etat={t?.etat ?? 'EN_ATTENTE'} />
						<p className="text-cladd-xs font-medium">{t?.etape ?? 'Démarrage'}</p>
						{t?.total !== undefined && t.total > 0 ? (
							<span className="flex w-full max-w-xs flex-col gap-1">
								<BarreDAvancement fait={t.fait ?? 0} total={t.total} />
								{ajoutEnCours ? (
									<span className="text-cladd-3xs text-cladd-fg-soft tabular-nums">
										{t.fait ?? 0} sur {t.total}
									</span>
								) : null}
							</span>
						) : null}
						<p className="max-w-sm text-cladd-2xs text-cladd-fg-soft">
							{ajoutEnCours
								? 'Chaque fournisseur se vérifie à l’annuaire, puis tous ses marchés se lisent pour l’estimer : une demi-minute chacun. Vous pouvez fermer, l’ajout continue sur le serveur.'
								: 'Les sources publiques répondent en quelques secondes par page, parfois plus. Vous pouvez fermer : la recherche continue, et son résultat vous attend dans la file d’attente.'}
						</p>
					</div>
				) : null}

				{montreLaListe ? (
					<section className="flex flex-col gap-cladd-3xs">
						<div className="flex items-baseline justify-between gap-cladd-3xs">
							<EnTeteDeGroupe
								libelle={decp ? 'Titulaires dans la zone' : 'Siège dans la zone'}
								nombre={nombreDeLignes}
							/>
							{aCocher.length === 0 ? null : (
								<BoutonTexte
									onClick={() =>
										setCochees(toutesCochees ? new Set() : new Set([...cochees, ...aCocher]))
									}
								>
									{toutesCochees
										? 'Tout décocher'
										: aCocher.length < libres.length
											? `Cocher les ${aCocher.length} premiers`
											: 'Tout cocher'}
								</BoutonTexte>
							)}
						</div>
						{nombreDeLignes === 0 ? (
							<p className="px-1 text-cladd-xs text-cladd-fg-soft">
								{page < pages
									? 'Rien dans la zone sur ces pages. Voyez la suite.'
									: 'Rien dans cette zone. Essayez une zone plus large.'}
							</p>
						) : decp ? (
							<ListeDeCartes>
								{titulaires.map((x) => (
									<LigneACocher
										key={x.siren}
										titre={x.nom}
										ligne={`${x.marches} marché${pluriel(x.marches)} · ${x.nombreDAcheteurs} acheteur${pluriel(x.nombreDAcheteurs)}`}
										detail={`Plafonds ${eurosRonds(x.plafondCentimes)} · dernier le ${dateCourteDeParis(Date.parse(`${x.dernierMarche}T12:00:00Z`))}`}
										cochee={cochees.has(x.siren)}
										onBasculer={() => basculer(x.siren)}
										{...(x.connue ? { inerte: 'Déjà dans vos prospects' } : {})}
									/>
								))}
							</ListeDeCartes>
						) : (
							<ListeDeCartes>
								{trouvees.map((e) => (
									<LigneACocher
										key={e.siren}
										titre={e.entreprise}
										{...(e.activite === undefined && e.effectif === undefined
											? {}
											: { ligne: [e.effectif, e.activite].filter(Boolean).join(' · ') })}
										{...(e.ville === undefined && e.dirigeant === undefined
											? {}
											: { detail: [e.ville, e.dirigeant].filter(Boolean).join(' · ') })}
										cochee={cochees.has(e.siren)}
										onBasculer={() => basculer(e.siren)}
										{...(e.connue ? { inerte: 'Déjà dans vos prospects' } : {})}
									/>
								))}
							</ListeDeCartes>
						)}
						{decp ? (
							<p className="px-1 text-cladd-3xs text-cladd-fg-soft">
								Les plafonds sont des montants maximums attribués, souvent sur plusieurs années : ni
								facturés, ni payés.
								{nonDiffusibles === 0
									? ''
									: ` ${nonDiffusibles} marché${pluriel(nonDiffusibles)} d’entrepreneurs non diffusibles écarté${pluriel(nonDiffusibles)}.`}
							</p>
						) : null}
						{suiteEnCours ? (
							<p className="flex items-center justify-center gap-2 px-1 text-cladd-2xs text-cladd-fg-soft">
								<IconeDeTravail etat="EN_COURS" />
								{t?.etape ?? 'La suite arrive'}
							</p>
						) : page < pages && recherche !== null ? (
							<BoutonSecondaire
								pleineLargeur
								disabled={enCours}
								onClick={() =>
									void lancer(recherche, zone, page + 1, {
										entreprises: trouvees,
										titulaires,
										nonDiffusibles,
										pages
									})
								}
							>
								Voir la suite
							</BoutonSecondaire>
						) : null}
						{pages > 1 ? (
							<p className="px-1 text-center text-cladd-3xs text-cladd-fg-soft">
								Page {page} sur {pages} {decp ? 'de la commande publique' : 'de l’annuaire'}
							</p>
						) : null}
					</section>
				) : null}

				{vue === 'echec' ? (
					<p className="px-1 text-cladd-xs text-cladd-fg-soft">
						{t?.erreur ?? 'Le travail s’est interrompu.'}
					</p>
				) : null}

				{vue === 'bilan' && resultat?.genre === 'AJOUT' ? (
					<div className="flex flex-col items-center gap-cladd-2xs py-cladd-xs text-center">
						<NombreHero nombre={resultat.importes} surTitre="Prospects ajoutés" />
						<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
							Ils attendent « À contacter » dans le parcours des fournisseurs publics, avec leur
							estimation et la commande publique pour source.
							{resultat.ecartes <= 0
								? ''
								: ` ${resultat.ecartes} étai${resultat.ecartes > 1 ? 'en' : ''}t déjà connu${pluriel(resultat.ecartes)}.`}
							{resultat.horsZone === 0
								? ''
								: ` ${resultat.horsZone} écarté${pluriel(resultat.horsZone)} : siège hors de la zone, ou entreprise absente de l’annuaire.`}
						</p>
						{resultat.echecs.length === 0 ? null : (
							<p className="max-w-sm text-cladd-2xs text-cladd-fg-soft">
								Les sources n’ont pas répondu pour {resultat.echecs.join(', ')}, même après trois
								essais. Cherchez-les de nouveau un peu plus tard.
							</p>
						)}
					</div>
				) : null}

				{vue === 'resume' && ajoutAnnuaire !== null ? (
					<div className="flex flex-col items-center gap-cladd-2xs py-cladd-xs text-center">
						<NombreHero nombre={ajoutAnnuaire.importes} surTitre="Prospects ajoutés" />
						<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
							Ils attendent « À contacter », avec l’annuaire pour source. Sur chaque fiche, le lien
							vers le site de l’entreprise mène à son adresse.
							{ajoutAnnuaire.ecartes <= 0
								? ''
								: ` ${ajoutAnnuaire.ecartes} étai${ajoutAnnuaire.ecartes > 1 ? 'en' : ''}t déjà connu${pluriel(ajoutAnnuaire.ecartes)}.`}
						</p>
					</div>
				) : null}

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
			</div>
		</FeuillePleinEcran>
	);
}
