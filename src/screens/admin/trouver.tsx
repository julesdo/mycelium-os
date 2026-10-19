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
 * avant « Ajouter ». L'estimation d'un fournisseur public se calcule à l'ajout, sur tous
 * ses marchés. L'e-mail ne vient d'aucune de ces sources : il se lit sur le site de
 * l'entreprise, depuis sa fiche.
 */

export interface EntrepriseAffichee extends EntrepriseTrouvee {
	/** Déjà au CRM (même SIREN). */
	readonly connue: boolean;
}

export interface PageTrouvee {
	readonly pages: number;
	/** La dernière page de l'annuaire lue par cet appel. */
	readonly derniere: number;
	readonly entreprises: readonly EntrepriseAffichee[];
}

export interface TitulaireAffiche extends Omit<TitulaireDecp, 'acheteurs'> {
	readonly acheteurs: readonly string[];
	readonly connue: boolean;
}

export interface PageDecpTrouvee {
	readonly pages: number;
	readonly derniere: number;
	readonly nonDiffusibles: number;
	readonly titulaires: readonly TitulaireAffiche[];
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

/** L'ajout d'un fournisseur public lit l'annuaire et ses marchés : vingt à la fois. */
const AJOUT_DECP_MAX = 20;

type Etape = 'parcours' | 'criteres' | 'resultats' | 'resume';
type Recherche =
	| { readonly source: 'ANNUAIRE'; readonly secteur: CleSecteur }
	| { readonly source: 'DECP'; readonly acheteurs: CleAcheteurs };

export function ParcoursTrouver({
	onFermer,
	onChercher,
	onAjouter,
	onChercherDecp,
	onAjouterDecp
}: {
	readonly onFermer: () => void;
	readonly onChercher: (secteur: CleSecteur, zone: CleZone, page: number) => Promise<PageTrouvee>;
	readonly onAjouter: (
		secteur: CleSecteur,
		zone: CleZone,
		entreprises: readonly EntrepriseTrouvee[]
	) => Promise<{ importes: number; ecartes: number }>;
	readonly onChercherDecp: (
		acheteurs: CleAcheteurs,
		zone: CleZone,
		page: number
	) => Promise<PageDecpTrouvee>;
	readonly onAjouterDecp: (
		acheteurs: CleAcheteurs,
		zone: CleZone,
		titulaires: readonly TitulaireDecp[]
	) => Promise<{ importes: number; ecartes: number; horsZone: number }>;
}) {
	const [etape, setEtape] = useState<Etape>('parcours');
	const [parcours, setParcours] = useState<Exclude<Parcours, 'PILOTE'> | null>(null);
	const [zone, setZone] = useState<CleZone>('PETITE_COURONNE');
	const [recherche, setRecherche] = useState<Recherche | null>(null);
	const [pages, setPages] = useState(0);
	const [page, setPage] = useState(0);
	const [trouvees, setTrouvees] = useState<readonly EntrepriseAffichee[]>([]);
	const [titulaires, setTitulaires] = useState<readonly TitulaireAffiche[]>([]);
	const [nonDiffusibles, setNonDiffusibles] = useState(0);
	const [cochees, setCochees] = useState<ReadonlySet<string>>(new Set());
	const [resultat, setResultat] = useState<{
		importes: number;
		ecartes: number;
		horsZone?: number;
	} | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	async function chercher(r: Recherche, suivante: number) {
		setErreur(null);
		setEnCours(true);
		try {
			if (r.source === 'ANNUAIRE') {
				const lue = await onChercher(r.secteur, zone, suivante);
				setPages(lue.pages);
				setPage(lue.derniere);
				const deja = suivante === 1 ? [] : trouvees;
				const sirens = new Set(deja.map((e) => e.siren));
				setTrouvees([...deja, ...lue.entreprises.filter((e) => !sirens.has(e.siren))]);
			} else {
				const lue = await onChercherDecp(r.acheteurs, zone, suivante);
				setPages(lue.pages);
				setPage(lue.derniere);
				const deja = suivante === 1 ? [] : titulaires;
				const sirens = new Set(deja.map((t) => t.siren));
				setTitulaires([...deja, ...lue.titulaires.filter((t) => !sirens.has(t.siren))]);
				setNonDiffusibles((n) => (suivante === 1 ? 0 : n) + lue.nonDiffusibles);
			}
			setRecherche(r);
			if (suivante === 1) setCochees(new Set());
			setEtape('resultats');
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
				setResultat(await onAjouter(recherche.secteur, zone, choisies));
			} else {
				const choisis = titulaires.filter((t) => cochees.has(t.siren)).map(titulaireSansLaMarque);
				setResultat(await onAjouterDecp(recherche.acheteurs, zone, choisis));
			}
			setEtape('resume');
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
		? titulaires.filter((t) => !t.connue).map((t) => t.siren)
		: trouvees.filter((e) => !e.connue).map((e) => e.siren);
	const plafond = decp ? AJOUT_DECP_MAX : Infinity;
	const aCocher = libres.slice(0, plafond);
	const toutesCochees = aCocher.length > 0 && aCocher.every((s) => cochees.has(s));
	const nombre = cochees.size;
	const tropDeCochees = nombre > plafond;
	const nombreDeLignes = decp ? titulaires.length : trouvees.length;

	const titres: Record<Etape, string> = {
		parcours: 'Trouver des prospects',
		criteres: parcours === null ? 'Trouver' : REGISTRE_DES_PARCOURS[parcours].libelle,
		resultats:
			recherche === null
				? 'Les résultats'
				: recherche.source === 'ANNUAIRE'
					? SECTEURS[recherche.secteur].libelle
					: ACHETEURS[recherche.acheteurs].libelle,
		resume: 'C’est ajouté'
	};

	const pied =
		etape === 'resultats' ? (
			<BoutonPrincipal
				pleineLargeur
				disabled={enCours || nombre === 0 || tropDeCochees}
				onClick={() => void ajouter()}
			>
				{nombre === 0
					? `Cochez des ${decp ? 'fournisseurs' : 'entreprises'}`
					: tropDeCochees
						? `${AJOUT_DECP_MAX} au plus à la fois`
						: enCours && decp
							? 'Estimation en cours…'
							: `Ajouter ${nombre} prospect${pluriel(nombre)}`}
			</BoutonPrincipal>
		) : etape === 'resume' ? (
			<BoutonPrincipal pleineLargeur onClick={onFermer}>
				Voir les prospects
			</BoutonPrincipal>
		) : undefined;

	const retourDe: Partial<Record<Etape, Etape>> = { criteres: 'parcours', resultats: 'criteres' };
	const precedente = retourDe[etape];
	const [depuis] = useState(() => anneeDeDepart(jourDeParis(Date.now())).slice(0, 4));

	return (
		<FeuillePleinEcran
			ouverte
			onFermer={precedente === undefined ? onFermer : () => setEtape(precedente)}
			retour={precedente !== undefined}
			titre={titres[etape]}
			{...(etape === 'resultats' ? { sousTitre: ZONES[zone].libelle } : {})}
			{...(pied === undefined ? {} : { pied })}
		>
			<div className="flex flex-col gap-cladd-sm">
				{etape === 'parcours' ? (
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

				{etape === 'criteres' && parcours !== null ? (
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
									<SegmentedButton key={z} active={zone === z} onClick={() => setZone(z)}>
										{ZONES[z].court}
									</SegmentedButton>
								))}
							</Segmented>
							<p className="px-1 text-cladd-2xs text-cladd-fg-soft">{departementsEnClair(zone)}</p>
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
													if (!enCours) void chercher({ source: 'DECP', acheteurs: a }, 1);
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
													if (!enCours) void chercher({ source: 'ANNUAIRE', secteur: s }, 1);
												}}
											/>
										))}
							</ListeDeCartes>
						</section>
						{enCours ? (
							<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
								{parcours === 'FOURNISSEUR_PUBLIC'
									? 'Recherche dans la commande publique…'
									: 'Recherche à l’annuaire…'}
							</p>
						) : null}
					</>
				) : null}

				{etape === 'resultats' ? (
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
								{titulaires.map((t) => (
									<LigneACocher
										key={t.siren}
										titre={t.nom}
										ligne={`${t.marches} marché${pluriel(t.marches)} · ${t.nombreDAcheteurs} acheteur${pluriel(t.nombreDAcheteurs)}`}
										detail={`Plafonds ${eurosRonds(t.plafondCentimes)} · dernier le ${dateCourteDeParis(Date.parse(`${t.dernierMarche}T12:00:00Z`))}`}
										cochee={cochees.has(t.siren)}
										onBasculer={() => basculer(t.siren)}
										{...(t.connue ? { inerte: 'Déjà dans vos prospects' } : {})}
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
						{page < pages && recherche !== null ? (
							<BoutonSecondaire
								pleineLargeur
								disabled={enCours}
								onClick={() => void chercher(recherche, page + 1)}
							>
								{enCours ? 'Recherche…' : 'Voir la suite'}
							</BoutonSecondaire>
						) : null}
						{pages > 1 ? (
							<p className="px-1 text-center text-cladd-3xs text-cladd-fg-soft">
								Page {page} sur {pages} {decp ? 'de la commande publique' : 'de l’annuaire'}
							</p>
						) : null}
					</section>
				) : null}

				{etape === 'resume' && resultat !== null ? (
					<div className="flex flex-col items-center gap-cladd-2xs py-cladd-xs text-center">
						<NombreHero nombre={resultat.importes} surTitre="Prospects ajoutés" />
						<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
							{decp
								? 'Ils attendent « À contacter » dans le parcours des fournisseurs publics, avec leur estimation et la commande publique pour source.'
								: 'Ils attendent « À contacter », avec l’annuaire pour source. Sur chaque fiche, le lien vers le site de l’entreprise mène à son adresse.'}
							{resultat.ecartes <= 0
								? ''
								: ` ${resultat.ecartes} étai${resultat.ecartes > 1 ? 'en' : ''}t déjà connu${pluriel(resultat.ecartes)}.`}
							{resultat.horsZone === undefined || resultat.horsZone === 0
								? ''
								: ` ${resultat.horsZone} écarté${pluriel(resultat.horsZone)} : siège hors de la zone, ou entreprise absente de l’annuaire.`}
						</p>
					</div>
				) : null}

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
			</div>
		</FeuillePleinEcran>
	);
}
