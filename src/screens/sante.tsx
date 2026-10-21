import { useState } from 'react';
import { dateLisible } from '../lib/verticales/recouvrement/calendrier';
import { Input, Spinner } from '@cladd-ui/react';
import {
	BuildingIcon,
	MessageCircleIcon,
	GaugeIcon,
	RefreshCwIcon,
	SearchIcon,
	ShieldCheckIcon,
	TargetIcon
} from 'lucide-react';
import { depuisEuros, enCentimes } from '../lib/socle/montants';
import {
	ActionsRapides,
	AnneauDeCouverture,
	BarreDExposition,
	BoutonPrincipal,
	BoutonTexte,
	BulletinDeSante,
	CarteBouton,
	CarteDeFait,
	CarteDirigeant,
	CarteLien,
	ComptesEnBarres,
	EcartDeSante,
	EnTeteDeGroupe,
	FeuillePleinEcran,
	HistoriqueDeSante,
	JaugeDeSante,
	ListeDeCartes,
	ListeDeMissions,
	ListeDeRangees,
	MOT_DE_SANTE,
	PageEcran,
	RangeeDepliable,
	RepartitionDeSante,
	SectionsDepliables,
	EnTableauSurBureau,
	TableauDeBord,
	ZoneDuTableau,
	VignetteIcone,
	dateCourteDeSante,
	eurosCentimes,
	type DirigeantDeSante,
	type EnteteEcran,
	type EtatDuPilierAffiche,
	type ExerciceDeSante,
	type FaitDeSante,
	type Lecture,
	type MissionAffichee,
	type NiveauDeSante,
	type TrancheDeSante
} from '../ui';

/**
 * LA SANTÉ DE VOS CLIENTS — l'analyse du risque, en trois écrans (13/10/2026).
 * Voir `docs/superpowers/specs/2026-10-13-risque-client.md`.
 *
 *   · `/app/risque` — le portefeuille : l'indice moyen pondéré par ce qu'on vous
 *     doit, où est l'argent dehors, les missions de couverture, ce qui a changé,
 *     les clients à regarder, et la vérification d'une entreprise ;
 *   · `/app/risque/$id` — un client : la jauge, le bulletin, les faits, ses
 *     dirigeants, ses comptes, votre exposition et votre plafond ;
 *   · `/app/risque/verifier` — une entreprise qu'on s'apprête à servir, cherchée
 *     par son nom ou son SIREN, puis analysée comme un client.
 *
 * ⚠️ UN PLUS, PAS UN BRUIT (le fondateur). La jauge et son mot d'abord ; le reste
 * se lit en faits qui se vérifient, chacun avec sa source ; ce qu'on ne sait pas
 * est dit à part, en une phrase. Rien n'y est recommandé : l'indice résume, le
 * gérant décide.
 */

export interface AnalyseDeSante {
	readonly siren: string;
	readonly analyseLe: number;
	readonly indicePrecedent?: number;
	readonly niveauPrecedent?: NiveauDeSante;
	readonly historique: readonly { readonly le: number; readonly indice: number }[];
	readonly denomination: string;
	readonly formeJuridique?: string;
	readonly dateCreation?: string;
	readonly indice: number;
	readonly niveau: NiveauDeSante;
	readonly faits: readonly FaitDeSante[];
	readonly piliers: readonly EtatDuPilierAffiche[];
	readonly lisibilite: 'BONNE' | 'PARTIELLE' | 'FAIBLE';
	readonly lisibiliteRaison?: string;
	readonly dirigeants: readonly DirigeantDeSante[];
	readonly exercices: readonly ExerciceDeSante[];
	readonly comptesConfidentiels: boolean;
	readonly versionDesRegles: number;
}

/**
 * LES FAITS QUI PÈSENT, QUATRE D'ABORD : les plus lourds disent l'essentiel, la
 * suite se déplie au toucher (« un plus, pas un bruit », le fondateur).
 */
const FAITS_D_ABORD = 4;

const MOT_DE_LISIBILITE = { BONNE: 'bonne', PARTIELLE: 'partielle', FAIBLE: 'faible' } as const;

/** Ce que rend une analyse demandée, dit au gérant (`null` : elle est faite, l'écran le montre). */
export function messageDeLIssue(
	etat: 'FAITE' | 'RECENTE' | 'BUDGET',
	/** Le jour où le quota revient (`retourDuQuota`), dit en toutes lettres. */
	retour?: string
): string | null {
	if (etat === 'RECENTE') return 'L’analyse date de moins d’une heure : elle est à jour.';
	if (etat === 'BUDGET')
		return retour === undefined
			? 'Le nombre d’analyses du mois est atteint : elles reprennent le mois prochain.'
			: `Le nombre d’analyses du mois est atteint : elles reviennent le ${dateLisible(retour)}.`;
	return null;
}

/** Ce que l'analyse lit, et ce qu'elle refuse de lire : dit avant la première analyse et au bas de chaque page. */
function CeQueLAnalyseLit({ client }: { readonly client: boolean }) {
	const lignes = [
		['Le registre', 'Procédures collectives, ancienneté, fermeture.'],
		['Ses comptes', 'Résultat, fonds propres, trésorerie, délai auquel il paie ses fournisseurs.'],
		[
			'La transparence',
			'Comptes déposés à temps, ou non. Des comptes confidentiels ne baissent pas l’indice.'
		],
		[
			'Ses dirigeants',
			'Les autres sociétés qu’ils dirigent, et celles qui ont connu une procédure collective.'
		],
		...(client ? [['Vos paiements', 'Le délai auquel il vous paie, et ce qui est en retard.']] : [])
	] as const;
	return (
		<ul className="flex flex-col gap-2">
			{lignes.map(([titre, texte]) => (
				<li key={titre} className="flex flex-col">
					<span className="text-cladd-2xs font-semibold">{titre}</span>
					<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">{texte}</span>
				</li>
			))}
		</ul>
	);
}

/** « Comment c'est calculé » : la méthode, les sources, et ce qui n'est jamais lu. */
function CommentCestCalcule({ version }: { readonly version: number }) {
	return (
		<div className="flex flex-col gap-3 text-cladd-2xs leading-relaxed">
			<p>
				L’indice part de 50, la valeur de « on n’en sait rien », et chaque fait l’ajoute ou le
				retire : son effet est écrit sur sa carte, et la somme se refait à la main. 70 et plus :
				rien à signaler. De 50 à 69 : à surveiller. De 30 à 49 : prudence. En dessous : risque
				élevé. Une procédure collective en cours plafonne l’indice à 10 ; une entreprise fermée le
				met à 0.
			</p>
			<p className="text-cladd-fg-soft">
				Les données sont publiques : l’INSEE, le registre du commerce, les comptes déposés et le
				journal officiel des entreprises, lus par Pappers ; et vos propres factures. L’analyse se
				refait d’elle-même chaque mois tant qu’il vous doit de l’argent.
			</p>
			<p className="text-cladd-fg-soft">
				Ce qui n’est jamais lu : aucune condamnation, aucune sanction personnelle d’un dirigeant,
				aucune liste tenue par d’autres créanciers. Un dirigeant n’est rapproché de ses autres
				sociétés que si sa présence à la tête de celle-ci le confirme ; sinon, rien ne lui est
				attribué.
			</p>
			<p className="text-cladd-fg-soft">
				L’indice résume des faits ; il ne dit pas si ce client paiera. Livrer, demander un acompte
				ou fixer un plafond reste votre décision. Règles, version {version}.
			</p>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// LA SANTÉ D'UN CLIENT, OU D'UNE ENTREPRISE QU'ON S'APPRÊTE À SERVIR
// ═══════════════════════════════════════════════════════════════════════════

export interface SanteClientAffichee {
	readonly mode: 'CLIENT' | 'ENTREPRISE';
	readonly denomination: string;
	readonly siren: string | null;
	readonly disponible: boolean;
	readonly analyse: AnalyseDeSante | null;
	/** Client seulement : ce qu'il vous doit et votre plafond. */
	readonly encours?: bigint;
	readonly plafond?: bigint | null;
	readonly enCours: boolean;
	readonly message: string | null;
	readonly onAnalyser: () => void;
	readonly onFixerPlafond?: (plafond: bigint | null) => Promise<boolean>;
	readonly onDemanderAPlume?: () => void;
	/** Client sans SIREN : sa fiche, où le retrouver. */
	readonly onOuvrirLaFiche?: () => void;
	/** Entreprise déjà cliente : sa fiche. */
	readonly client?: { readonly id: string; readonly denomination: string };
}

export function EcranSanteClient({
	entete,
	donnees
}: {
	readonly entete: Extract<EnteteEcran, { genre: 'poussee' }>;
	readonly donnees: Lecture<SanteClientAffichee>;
}) {
	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	return (
		<PageEcran entete={entete} largeur={donnees.valeur.analyse === null ? 'normale' : 'large'}>
			<SanteClient {...donnees.valeur} />
		</PageEcran>
	);
}

function FeuilleDuPlafond({
	ouverte,
	plafond,
	onFermer,
	onFixer
}: {
	readonly ouverte: boolean;
	readonly plafond: bigint | null;
	readonly onFermer: () => void;
	readonly onFixer: (plafond: bigint | null) => Promise<boolean>;
}) {
	const [saisie, setSaisie] = useState(plafond === null ? '' : String(plafond / 100n));
	const [refus, setRefus] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);
	const valider = async (valeur: bigint | null) => {
		setEnCours(true);
		const fait = await onFixer(valeur);
		setEnCours(false);
		if (fait) onFermer();
	};
	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Votre plafond"
			pied={
				<BoutonPrincipal
					pleineLargeur
					readOnly={enCours}
					onClick={() => {
						let centimes: bigint;
						try {
							centimes = enCentimes(depuisEuros(saisie));
						} catch {
							setRefus('Écrivez un montant en euros, par exemple 15 000.');
							return;
						}
						if (centimes <= 0n) {
							setRefus('Le plafond doit être un montant positif.');
							return;
						}
						setRefus(null);
						void valider(centimes);
					}}
				>
					{enCours ? <Spinner size="xs" /> : null}
					Fixer ce plafond
				</BoutonPrincipal>
			}
		>
			<div className="flex flex-col gap-1 px-1">
				<h2 className="text-cladd-lg leading-tight font-semibold">
					Jusqu’où le laisser vous devoir ?
				</h2>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Au-delà, il remonte dans « La santé de vos clients ». Rien ne le bloque : c’est un repère,
					et c’est vous qui fixez le chiffre.
				</p>
			</div>
			<label className="flex flex-col gap-1.5 px-1">
				<span className="text-cladd-2xs font-semibold text-cladd-fg-soft">Plafond, en euros</span>
				<Input
					value={saisie}
					onChange={setSaisie}
					inputComponentProps={{ inputMode: 'decimal', autoComplete: 'off' }}
				/>
				{refus === null ? null : (
					<span role="alert" className="text-cladd-2xs text-cladd-fg">
						{refus}
					</span>
				)}
			</label>
			{plafond === null ? null : (
				<div className="px-1">
					<BoutonTexte onClick={() => void valider(null)}>Retirer le plafond</BoutonTexte>
				</div>
			)}
		</FeuillePleinEcran>
	);
}

function SanteClient(d: SanteClientAffichee) {
	const [plafondOuvert, setPlafondOuvert] = useState(false);
	/** Les rangées ouvertes (« Comment c'est calculé ») : aucune à l'arrivée. */
	const [ouvertes, setOuvertes] = useState<readonly string[]>([]);
	/** « Voir les autres » : les quatre faits les plus lourds d'abord, le reste au toucher. */
	const [tousLesFaits, setTousLesFaits] = useState(false);
	const a = d.analyse;
	const estClient = d.mode === 'CLIENT';

	// ── AVANT LA PREMIÈRE ANALYSE : le chemin, pas un cadran à zéro ─────────
	if (a === null) {
		return (
			<div className="flex flex-col gap-cladd-xs">
				<JaugeDeSante indice={null} niveau={null} sousTitre={d.denomination} />
				{!d.disponible ? (
					<p className="px-1 text-center text-cladd-xs leading-relaxed text-cladd-fg-soft">
						L’analyse de santé n’est pas encore activée sur Letikette.
					</p>
				) : d.siren === null ? (
					<div className="flex flex-col items-center gap-2 text-center">
						<p className="px-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">
							Pour l’analyser, il faut son SIREN : c’est lui qui désigne la bonne entreprise.
						</p>
						{d.onOuvrirLaFiche === undefined ? null : (
							<BoutonPrincipal onClick={d.onOuvrirLaFiche}>Retrouver son SIREN</BoutonPrincipal>
						)}
					</div>
				) : (
					<div className="flex flex-col items-center gap-2">
						<BoutonPrincipal pleineLargeur readOnly={d.enCours} onClick={d.onAnalyser}>
							{d.enCours ? <Spinner size="xs" /> : <GaugeIcon />}
							{d.enCours ? 'Analyse en cours…' : `Analyser ${d.denomination}`}
						</BoutonPrincipal>
						<p className="text-center text-cladd-3xs text-cladd-fg-softer">SIREN {d.siren}</p>
					</div>
				)}
				{d.message === null ? null : (
					<p role="status" className="px-1 text-center text-cladd-2xs leading-relaxed">
						{d.message}
					</p>
				)}
				<section className="verre-carte flex flex-col gap-3 rounded-cladd-xl p-3.5">
					<p className="flex items-center gap-2 text-cladd-xs font-semibold">
						<ShieldCheckIcon className="size-4 text-cladd-primary" aria-hidden />
						Ce que l’analyse lit
					</p>
					<CeQueLAnalyseLit client={estClient} />
					<p className="text-cladd-3xs leading-relaxed text-cladd-fg-softer">
						Des données publiques, lues par Pappers, et vos factures. Aucune condamnation, aucune
						sanction personnelle, aucune liste tenue par d’autres créanciers.
					</p>
				</section>
			</div>
		);
	}

	const lourds = a.faits.filter((f) => f.effet < 0);
	const rassurants = a.faits.filter((f) => f.effet > 0);
	const informatifs = a.faits.filter((f) => f.effet === 0);
	const physiques = a.dirigeants.filter((dir) => dir.rapprochement !== 'PERSONNE_MORALE');
	const morales = a.dirigeants.filter((dir) => dir.rapprochement === 'PERSONNE_MORALE');
	const precedente = a.historique.length >= 2 ? a.historique[a.historique.length - 2] : undefined;

	return (
		<SectionsDepliables ouvertes={ouvertes} onOuvertesChange={setOuvertes}>
			<div className="flex flex-col gap-cladd-xs">
				{/*
				  ⚠️ AU BUREAU, DEUX COLONNES (14/10/2026) : la jauge et son bulletin en
				  haut, les faits à gauche, ses dirigeants et ses comptes à droite. Au
				  téléphone, ces enveloppes n'existent pas.
				*/}
				<TableauDeBord>
					<ZoneDuTableau place="tete">
						{/* LA JAUGE ET SON MOT, puis ce qui a changé et la date. */}
						<JaugeDeSante
							indice={a.indice}
							niveau={a.niveau}
							sousTitre={
								<span className="flex flex-col items-center gap-1.5">
									<span>Analysée le {dateCourteDeSante(new Date(a.analyseLe).toISOString())}</span>
									{a.indicePrecedent === undefined ? null : (
										<EcartDeSante
											avant={a.indicePrecedent}
											apres={a.indice}
											{...(precedente === undefined
												? {}
												: { depuis: new Date(precedente.le).toISOString() })}
										/>
									)}
								</span>
							}
						/>
						{a.lisibiliteRaison === undefined ? null : (
							<p className="px-1 text-center text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								Lisibilité {MOT_DE_LISIBILITE[a.lisibilite]} :{' '}
								{a.lisibiliteRaison.charAt(0).toLowerCase()}
								{a.lisibiliteRaison.slice(1)}
							</p>
						)}

						<ActionsRapides
							actions={[
								{
									cle: 'actualiser',
									libelle: d.enCours ? 'En cours…' : 'Actualiser',
									icone: d.enCours ? <Spinner size="xs" /> : <RefreshCwIcon />,
									nomComplet: 'Refaire l’analyse',
									onClick: d.onAnalyser
								},
								...(d.onDemanderAPlume === undefined
									? []
									: [
											{
												cle: 'plume',
												libelle: 'Demander',
												icone: <MessageCircleIcon />,
												nomComplet: 'Demander à Plume ce que dit cette analyse',
												onClick: d.onDemanderAPlume
											}
										]),
								...(d.onFixerPlafond === undefined
									? []
									: [
											{
												cle: 'plafond',
												libelle: 'Plafond',
												icone: <TargetIcon />,
												nomComplet: 'Fixer le plafond d’encours de ce client',
												onClick: () => setPlafondOuvert(true)
											}
										])
							]}
						/>
						{d.message === null ? null : (
							<p role="status" className="px-1 text-center text-cladd-2xs leading-relaxed">
								{d.message}
							</p>
						)}

						{d.client === undefined ? null : (
							<CarteLien
								vers="/app/clients/$id"
								parametres={{ id: d.client.id }}
								titre={d.client.denomination}
								ligne="Déjà votre client : sa fiche"
							/>
						)}
					</ZoneDuTableau>
					<ZoneDuTableau place="cote-haut">
						{/* LE BULLETIN */}
						<section className="flex flex-col gap-cladd-3xs">
							<EnTeteDeGroupe libelle="Son bulletin" />
							<BulletinDeSante piliers={a.piliers} />
						</section>
					</ZoneDuTableau>
					<ZoneDuTableau place="principal">
						{/* LES FAITS */}
						{lourds.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Ce qui pèse" nombre={lourds.length} />
								<div className="flex flex-col gap-2">
									{(tousLesFaits ? lourds : lourds.slice(0, FAITS_D_ABORD)).map((f) => (
										<CarteDeFait key={f.cle} fait={f} />
									))}
								</div>
								{tousLesFaits || lourds.length <= FAITS_D_ABORD ? null : (
									<div className="flex justify-center">
										<BoutonTexte onClick={() => setTousLesFaits(true)}>
											{lourds.length - FAITS_D_ABORD === 1
												? 'Voir le dernier'
												: `Voir les ${lourds.length - FAITS_D_ABORD} autres`}
										</BoutonTexte>
									</div>
								)}
							</section>
						)}
						{rassurants.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Ce qui rassure" nombre={rassurants.length} />
								<div className="flex flex-col gap-2">
									{rassurants.map((f) => (
										<CarteDeFait key={f.cle} fait={f} />
									))}
								</div>
							</section>
						)}
						{informatifs.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Bon à savoir" nombre={informatifs.length} />
								<div className="flex flex-col gap-2">
									{informatifs.map((f) => (
										<CarteDeFait key={f.cle} fait={f} />
									))}
								</div>
							</section>
						)}
					</ZoneDuTableau>
					<ZoneDuTableau place="cote">
						{/* SES DIRIGEANTS */}
						{a.dirigeants.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Ses dirigeants" nombre={a.dirigeants.length} />
								<div className="flex flex-col gap-2">
									{physiques.map((dir) => (
										<CarteDirigeant key={dir.nomComplet} dirigeant={dir} />
									))}
									{morales.map((dir) => (
										<CarteDirigeant key={dir.nomComplet} dirigeant={dir} />
									))}
								</div>
							</section>
						)}

						{/* SES COMPTES */}
						<section className="flex flex-col gap-cladd-3xs">
							<EnTeteDeGroupe libelle="Ses comptes" />
							{a.exercices.some(
								(e) => e.chiffreAffaires !== undefined || e.resultat !== undefined
							) ? (
								<ComptesEnBarres exercices={a.exercices} />
							) : (
								<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
									{a.comptesConfidentiels
										? 'Ses comptes sont confidentiels : un choix que la loi permet aux petites entreprises. Ses chiffres ne se lisent pas.'
										: 'Aucun compte chiffré n’est publié pour les derniers exercices.'}
								</p>
							)}
						</section>

						{/* VOTRE EXPOSITION */}
						{!estClient || d.encours === undefined ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Votre exposition" />
								<div className="verre-carte flex flex-col gap-2 rounded-cladd-xl p-3.5">
									<BarreDExposition encours={d.encours} plafond={d.plafond ?? null} />
									{d.onFixerPlafond === undefined ? null : (
										<div>
											<BoutonTexte onClick={() => setPlafondOuvert(true)}>
												{d.plafond === null || d.plafond === undefined
													? 'Fixer un plafond'
													: 'Modifier le plafond'}
											</BoutonTexte>
										</div>
									)}
								</div>
							</section>
						)}

						{a.historique.length < 2 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Au fil des analyses" />
								<div className="verre-carte rounded-cladd-xl p-3.5">
									<HistoriqueDeSante historique={a.historique} />
								</div>
							</section>
						)}

						<ListeDeRangees>
							<RangeeDepliable
								cle="methode"
								famille="MACHINE"
								titre="Comment c’est calculé"
								valeur="la méthode"
							>
								<CommentCestCalcule version={a.versionDesRegles} />
							</RangeeDepliable>
						</ListeDeRangees>
					</ZoneDuTableau>
				</TableauDeBord>

				{d.onFixerPlafond === undefined ? null : (
					<FeuilleDuPlafond
						key={String(d.plafond ?? 'aucun')}
						ouverte={plafondOuvert}
						plafond={d.plafond ?? null}
						onFermer={() => setPlafondOuvert(false)}
						onFixer={d.onFixerPlafond}
					/>
				)}
			</div>
		</SectionsDepliables>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// LE PORTEFEUILLE
// ═══════════════════════════════════════════════════════════════════════════

export interface ClientDeSante {
	readonly id: string;
	readonly nom: string;
	readonly encours: bigint;
	readonly analyse: { readonly indice: number; readonly niveau: NiveauDeSante } | null;
}

export interface SanteClientsAffichee {
	readonly disponible: boolean;
	readonly indice: number | null;
	readonly niveau: NiveauDeSante | null;
	readonly encoursTotal: bigint;
	readonly encoursAnalyse: bigint;
	readonly repartition: readonly {
		readonly tranche: TrancheDeSante;
		readonly encours: bigint;
		readonly clients: number;
	}[];
	readonly couverture: number;
	readonly missions: readonly MissionAffichee[];
	readonly aRegarder: readonly { readonly client: ClientDeSante; readonly raison: string }[];
	readonly changements: readonly { readonly client: ClientDeSante; readonly raison: string }[];
	readonly message: string | null;
}

export function EcranSanteClients({
	donnees
}: {
	readonly donnees: Lecture<SanteClientsAffichee>;
}) {
	const entete = {
		genre: 'poussee',
		retour: { vers: '/app', libelle: 'Aujourd’hui' },
		titre: 'La santé de vos clients'
	} as const;
	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	return (
		<PageEcran entete={entete} largeur={donnees.valeur.disponible ? 'large' : 'normale'}>
			<SanteClients {...donnees.valeur} />
		</PageEcran>
	);
}

function CarteDeClient({
	client,
	ligne
}: {
	readonly client: ClientDeSante;
	readonly ligne: string;
}) {
	return (
		<CarteLien
			vers="/app/risque/$id"
			parametres={{ id: client.id }}
			icone={
				<JaugeDeSante
					petite
					indice={client.analyse?.indice ?? null}
					niveau={client.analyse?.niveau ?? null}
				/>
			}
			titre={client.nom}
			montant={eurosCentimes(client.encours)}
			ligne={ligne}
		/>
	);
}

function SanteClients(d: SanteClientsAffichee) {
	if (!d.disponible) {
		return (
			<div className="flex flex-col gap-cladd-xs">
				<JaugeDeSante indice={null} niveau={null} />
				<p className="px-1 text-center text-cladd-xs leading-relaxed text-cladd-fg-soft">
					L’analyse de santé n’est pas encore activée sur Letikette. Elle lira, pour chaque client,
					ses comptes, ses dirigeants et votre historique, et dira lesquels méritent un regard.
				</p>
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-cladd-xs">
			{/*
			  ⚠️ AU BUREAU, DEUX COLONNES (14/10/2026) : la jauge et la répartition en tête,
			  les missions collées à droite, les clients en tableau dessous. Au téléphone,
			  ces enveloppes n'existent pas.
			*/}
			<TableauDeBord>
				<ZoneDuTableau place="tete">
					<JaugeDeSante
						indice={d.indice}
						niveau={d.niveau}
						sousTitre={
							d.indice === null
								? 'Aucun client analysé pour l’instant'
								: d.encoursAnalyse === d.encoursTotal
									? 'Pondérée par ce qu’on vous doit'
									: `Pondérée par ce qu’on vous doit, sur ${eurosCentimes(d.encoursAnalyse)} analysés`
						}
					/>

					{d.repartition.length === 0 ? null : (
						<section className="verre-carte flex flex-col gap-2 rounded-cladd-xl p-3.5">
							<p className="text-cladd-xs font-semibold">Où est l’argent qu’on vous doit</p>
							<RepartitionDeSante parts={d.repartition} />
						</section>
					)}
				</ZoneDuTableau>
				<ZoneDuTableau place="cote-collant">
					{/* LES MISSIONS : l'anneau mesure ce que le logiciel voit vraiment. */}
					<section className="verre-carte flex flex-col gap-3 rounded-cladd-xl p-3.5">
						<div className="flex items-center gap-3">
							<AnneauDeCouverture pourcentage={d.couverture} />
							<div className="flex min-w-0 flex-col gap-0.5">
								<p className="text-cladd-xs font-semibold">
									{d.couverture >= 100
										? 'Votre portefeuille est couvert'
										: 'Couvrir votre portefeuille'}
								</p>
								<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
									Chaque mission agrandit ce que Letikette surveille pour vous.
								</p>
							</div>
						</div>
						<ListeDeMissions missions={d.missions} />
					</section>
				</ZoneDuTableau>
				<ZoneDuTableau place="principal">
					<EnTableauSurBureau>
						{d.message === null ? null : (
							<p role="status" className="px-1 text-center text-cladd-2xs leading-relaxed">
								{d.message}
							</p>
						)}

						{d.changements.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Ce qui a changé" nombre={d.changements.length} />
								<ListeDeCartes>
									{d.changements.map(({ client, raison }) => (
										<CarteDeClient
											key={client.id}
											client={client}
											ligne={`${client.analyse === null ? '' : `${MOT_DE_SANTE[client.analyse.niveau]} · `}${raison}`}
										/>
									))}
								</ListeDeCartes>
							</section>
						)}

						<section className="flex flex-col gap-cladd-3xs">
							<EnTeteDeGroupe libelle="À regarder" nombre={d.aRegarder.length} />
							{d.aRegarder.length === 0 ? (
								<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
									Aucun client analysé ne mérite de regard particulier aujourd’hui.
								</p>
							) : (
								<ListeDeCartes>
									{d.aRegarder.map(({ client, raison }) => (
										<CarteDeClient
											key={client.id}
											client={client}
											ligne={
												client.analyse === null
													? raison
													: raison === '' || raison === MOT_DE_SANTE[client.analyse.niveau]
														? MOT_DE_SANTE[client.analyse.niveau]
														: `${MOT_DE_SANTE[client.analyse.niveau]} · ${raison}`
											}
										/>
									))}
								</ListeDeCartes>
							)}
						</section>

						<section className="flex flex-col gap-cladd-3xs">
							<EnTeteDeGroupe libelle="Avant de servir un nouveau client" />
							<CarteLien
								vers="/app/risque/verifier"
								icone={<VignetteIcone className="size-10" icone={<SearchIcon />} />}
								titre="Vérifier une entreprise"
								ligne="Son nom ou son SIREN suffit"
							/>
						</section>
					</EnTableauSurBureau>
				</ZoneDuTableau>
			</TableauDeBord>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// VÉRIFIER UNE ENTREPRISE
// ═══════════════════════════════════════════════════════════════════════════

export interface EntrepriseTrouvee {
	readonly siren: string;
	readonly denomination: string;
	readonly ville?: string;
	readonly formeJuridique?: string;
}

export interface RechercheDEntreprise {
	readonly terme: string;
	readonly onTerme: (terme: string) => void;
	readonly onChercher: () => void;
	readonly enCours: boolean;
	readonly resultats: readonly EntrepriseTrouvee[] | null;
	readonly erreur: string | null;
	readonly onChoisir: (siren: string) => void;
}

export function EcranVerifierEntreprise({
	recherche
}: {
	readonly recherche: RechercheDEntreprise;
}) {
	const entete = {
		genre: 'poussee',
		retour: { vers: '/app/risque', libelle: 'La santé de vos clients' },
		titre: 'Vérifier une entreprise'
	} as const;
	const r = recherche;
	const siren = r.terme.replace(/\s/g, '');
	const estUnSiren = /^\d{9}$/.test(siren);
	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-xs">
				<div className="flex flex-col gap-1 px-1">
					<h2 className="text-cladd-lg leading-tight font-semibold">Avant de la servir</h2>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Son nom ou son SIREN : vous choisissez la bonne entreprise, puis elle s’analyse comme un
						client, sans vos paiements.
					</p>
				</div>
				<form
					className="flex flex-col gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						if (estUnSiren) r.onChoisir(siren);
						else r.onChercher();
					}}
				>
					<Input
						value={r.terme}
						onChange={r.onTerme}
						placeholder="Nom de l’entreprise ou SIREN"
						inputComponentProps={{ autoComplete: 'off', enterKeyHint: 'search' }}
					/>
				</form>
				<BoutonPrincipal
					pleineLargeur
					readOnly={r.enCours || r.terme.trim().length < 2}
					onClick={() => (estUnSiren ? r.onChoisir(siren) : r.onChercher())}
				>
					{r.enCours ? <Spinner size="xs" /> : <SearchIcon />}
					{estUnSiren ? 'Analyser ce SIREN' : 'Chercher'}
				</BoutonPrincipal>
				{r.erreur === null ? null : (
					<p role="alert" className="px-1 text-cladd-2xs leading-relaxed">
						{r.erreur}
					</p>
				)}
				{r.resultats === null ? null : r.resultats.length === 0 ? (
					<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Aucune entreprise de ce nom au registre. Essayez une autre graphie, ou son SIREN.
					</p>
				) : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Au registre" nombre={r.resultats.length} />
						<ListeDeCartes>
							{r.resultats.map((e) => (
								<CarteBouton
									key={e.siren}
									icone={<VignetteIcone className="size-10" icone={<BuildingIcon />} />}
									titre={e.denomination}
									ligne={[e.ville, `SIREN ${e.siren}`].filter(Boolean).join(' · ')}
									onClick={() => r.onChoisir(e.siren)}
								/>
							))}
						</ListeDeCartes>
					</section>
				)}
			</div>
		</PageEcran>
	);
}
