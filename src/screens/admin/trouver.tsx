import { useState } from 'react';
import { Segmented, SegmentedButton } from '@cladd-ui/react';
import { BriefcaseIcon, CalculatorIcon, HardHatIcon, TruckIcon } from 'lucide-react';
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
	CLES_SECTEURS,
	CLES_ZONES,
	departementsEnClair,
	SECTEURS,
	ZONES,
	type CleSecteur,
	type CleZone,
	type EntrepriseTrouvee
} from '../../lib/crm/annuaire';
import { messageDeRefus } from './formulaire-prospect';

/**
 * TROUVER DES ENTREPRISES À L'ANNUAIRE (17/10/2026). La liste du lundi de la phase
 * manuelle, sans quitter le CRM : la zone, puis un toucher sur le secteur lance la
 * recherche ; les entreprises se cochent, vingt-cinq par page ; rien n'entre avant
 * « Ajouter ». L'e-mail ne vient pas de l'annuaire : il se lit sur le site de
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

const ICONES: Record<CleSecteur, typeof TruckIcon> = {
	TRANSPORT: TruckIcon,
	BATIMENT: HardHatIcon,
	SERVICES: BriefcaseIcon,
	CABINETS: CalculatorIcon
};

function IconeDeSecteur({ secteur }: { readonly secteur: CleSecteur }) {
	const Icone = ICONES[secteur];
	return <Icone aria-hidden />;
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

type Etape = 'criteres' | 'resultats' | 'resume';

export function ParcoursTrouver({
	onFermer,
	onChercher,
	onAjouter
}: {
	readonly onFermer: () => void;
	readonly onChercher: (secteur: CleSecteur, zone: CleZone, page: number) => Promise<PageTrouvee>;
	readonly onAjouter: (
		secteur: CleSecteur,
		zone: CleZone,
		entreprises: readonly EntrepriseTrouvee[]
	) => Promise<{ importes: number; ecartes: number }>;
}) {
	const [etape, setEtape] = useState<Etape>('criteres');
	const [zone, setZone] = useState<CleZone>('PETITE_COURONNE');
	const [secteur, setSecteur] = useState<CleSecteur | null>(null);
	const [pages, setPages] = useState(0);
	const [page, setPage] = useState(0);
	const [trouvees, setTrouvees] = useState<readonly EntrepriseAffichee[]>([]);
	const [cochees, setCochees] = useState<ReadonlySet<string>>(new Set());
	const [resultat, setResultat] = useState<{ importes: number; ecartes: number } | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	async function chercher(s: CleSecteur, suivante: number) {
		setErreur(null);
		setEnCours(true);
		try {
			const r = await onChercher(s, zone, suivante);
			setSecteur(s);
			setPages(r.pages);
			setPage(r.derniere);
			const deja = suivante === 1 ? [] : trouvees;
			const sirens = new Set(deja.map((e) => e.siren));
			setTrouvees([...deja, ...r.entreprises.filter((e) => !sirens.has(e.siren))]);
			if (suivante === 1) setCochees(new Set());
			setEtape('resultats');
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	async function ajouter() {
		if (secteur === null) return;
		setErreur(null);
		setEnCours(true);
		try {
			const choisies = trouvees
				.filter((e) => cochees.has(e.siren))
				.map(sansLaMarque);
			setResultat(await onAjouter(secteur, zone, choisies));
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
	const libres = trouvees.filter((e) => !e.connue);
	const toutesCochees = libres.length > 0 && libres.every((e) => cochees.has(e.siren));
	const nombre = cochees.size;

	const titres: Record<Etape, string> = {
		criteres: 'Trouver des entreprises',
		resultats: secteur === null ? 'Les entreprises' : SECTEURS[secteur].libelle,
		resume: 'C’est ajouté'
	};

	const pied =
		etape === 'resultats' ? (
			<BoutonPrincipal
				pleineLargeur
				disabled={enCours || nombre === 0}
				onClick={() => void ajouter()}
			>
				{nombre === 0
					? 'Cochez des entreprises'
					: `Ajouter ${nombre} prospect${pluriel(nombre)}`}
			</BoutonPrincipal>
		) : etape === 'resume' ? (
			<BoutonPrincipal pleineLargeur onClick={onFermer}>
				Voir les prospects
			</BoutonPrincipal>
		) : undefined;

	return (
		<FeuillePleinEcran
			ouverte
			onFermer={etape === 'resultats' ? () => setEtape('criteres') : onFermer}
			retour={etape === 'resultats'}
			titre={titres[etape]}
			{...(etape === 'resultats' ? { sousTitre: ZONES[zone].libelle } : {})}
			{...(pied === undefined ? {} : { pied })}
		>
			<div className="flex flex-col gap-cladd-sm">
				{etape === 'criteres' ? (
					<>
						<p className="px-1 text-cladd-xs text-cladd-fg-soft">
							Les PME de 3 à 49 salariés, en activité, à l’annuaire public des entreprises. Vous
							cochez celles qui entrent ; l’e-mail se trouve ensuite sur leur site.
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
							<EnTeteDeGroupe libelle="Quel secteur" />
							<ListeDeCartes>
								{CLES_SECTEURS.map((s) => (
									<CarteBouton
										key={s}
										titre={SECTEURS[s].libelle}
										ligne={SECTEURS[s].detail}
										icone={<IconeDeSecteur secteur={s} />}
										onClick={() => {
											if (!enCours) void chercher(s, 1);
										}}
									/>
								))}
							</ListeDeCartes>
						</section>
						{enCours ? (
							<p className="px-1 text-cladd-2xs text-cladd-fg-soft">Recherche à l’annuaire…</p>
						) : null}
					</>
				) : null}

				{etape === 'resultats' ? (
					<section className="flex flex-col gap-cladd-3xs">
						<div className="flex items-baseline justify-between gap-cladd-3xs">
							<EnTeteDeGroupe libelle="Siège dans la zone" nombre={trouvees.length} />
							{libres.length === 0 ? null : (
								<BoutonTexte
									onClick={() =>
										setCochees(
											toutesCochees ? new Set() : new Set([...cochees, ...libres.map((e) => e.siren)])
										)
									}
								>
									{toutesCochees ? 'Tout décocher' : 'Tout cocher'}
								</BoutonTexte>
							)}
						</div>
						{trouvees.length === 0 ? (
							<p className="px-1 text-cladd-xs text-cladd-fg-soft">
								{page < pages
									? 'Aucun siège dans la zone sur cette page de l’annuaire. Voyez la suite.'
									: 'Aucune entreprise de ce secteur n’a son siège dans cette zone. Essayez une zone plus large.'}
							</p>
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
						{page < pages && secteur !== null ? (
							<BoutonSecondaire
								pleineLargeur
								disabled={enCours}
								onClick={() => void chercher(secteur, page + 1)}
							>
								{enCours ? 'Recherche…' : 'Voir la suite'}
							</BoutonSecondaire>
						) : null}
						{pages > 1 ? (
							<p className="px-1 text-center text-cladd-3xs text-cladd-fg-soft">
								Page {page} sur {pages} de l’annuaire
							</p>
						) : null}
					</section>
				) : null}

				{etape === 'resume' && resultat !== null ? (
					<div className="flex flex-col items-center gap-cladd-2xs py-cladd-xs text-center">
						<NombreHero nombre={resultat.importes} surTitre="Prospects ajoutés" />
						<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
							Ils attendent « À contacter », avec l’annuaire pour source. Sur chaque fiche, le lien
							vers le site de l’entreprise mène à son adresse.
							{resultat.ecartes === 0
								? ''
								: ` ${resultat.ecartes} étai${resultat.ecartes > 1 ? 'en' : ''}t déjà connue${pluriel(resultat.ecartes)}.`}
						</p>
					</div>
				) : null}

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
			</div>
		</FeuillePleinEcran>
	);
}
