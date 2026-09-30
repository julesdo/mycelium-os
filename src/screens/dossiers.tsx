import { useState } from 'react';
import {
	Button,
	Checkbox,
	Chip,
	Popup,
	PopupContent,
	SearchField,
	SectionTitle,
	Segmented,
	SegmentedButton,
	Surface
} from '@cladd-ui/react';
import { CheckIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { type EtapeDossier } from '../lib/verticales/recouvrement/etapes-dossier';
import {
	Avatar,
	BoutonPrincipal,
	BoutonTexte,
	LigneAnalyse,
	LigneBouton,
	Lien,
	ListeAnalyses,
	PageBody,
	PageEcran,
	dateCourte,
	eurosCentimes,
	pluriel,
	type Lecture
} from '../ui';

/**
 * L'INDEX DES DOSSIERS — calqué, écran pour écran, sur la liste des
 * transactions de Revolut.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE REPROCHE DU 30/09/2026, ET CE QU'IL MESURAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mot pour mot : « j'ai l'impression qu'il y a des milliards de zones
 * cliquables. La page qui affiche tous les dossiers est juste horrible, surtout
 * avec le tab de 50 mille items ».
 *
 * Relevé : cinq segments de filtre — « Tous · Prêt · On lui écrit · Le
 * tribunal, si besoin · Réglé » — qui s'enroulaient sur TROIS lignes à 375 px ;
 * une pilule « Sélectionner » de 56 px ; cinq rangées portant chacune un
 * chevron. Seize cibles, dont onze habillées en bouton.
 *
 * Chez Revolut, sur l'écran équivalent : une recherche, UN bouton filtre rond,
 * les rangées. Trois cibles, et la liste se lit par GROUPES qui annoncent leur
 * compte et leur total (`docs/superpowers/specs/2026-09-30-codes-des-references.md`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI EST REPRIS, ET D'OÙ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   · la recherche et UN bouton filtre qui ouvre une feuille — Revolut ;
 *   · les groupes par étape, leur compte et leur total — Revolut, par date ;
 *   · aucun chevron sur une rangée de contenu — Shop et Revolut ;
 *   · « Sélectionner » en texte seul, en haut à droite — Mail ;
 *   · en sélection, la case prend la place de l'avatar — Mail.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE PLUS GROS D'ABORD, DANS CHAQUE GROUPE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La file du jour trie par urgence juridique — c'est son métier. Cet écran-ci
 * permet de commencer par ce qui RAPPORTE : le tri vient de la requête, sur la
 * colonne affichée, et le regroupement le préserve.
 *
 * ⚠️ ET CE QUI SE GROUPE EST LA PRÉPARATION, JAMAIS L'ENGAGEMENT. Le lot
 * prépare des lettres ; chacune atterrit « à valider » sur son dossier, et le
 * gérant la relit et la valide une par une. C'est la ligne rouge n° 1.
 */

export interface DossierDeLIndex {
	readonly _id: string;
	readonly debiteur: string;
	readonly debiteurId: string;
	readonly etape: EtapeDossier;
	readonly principalRestantDu: bigint;
	readonly nombreFactures: number;
	readonly dateLimiteAgir?: string;
	readonly dernierCourrierLe?: string;
	readonly courrierAValider: boolean;
	readonly professionnelDesigne: boolean;
	/**
	 * L'échéance de procédure la plus proche, pour un dossier au tribunal.
	 *
	 * ⚠️ ELLE PASSE DEVANT TOUT LE RESTE QUAND ELLE EXISTE. C'est le seul endroit
	 * du produit où un droit s'éteint à date fixe : une décision non remise dans
	 * son délai ne vaut plus rien, et tout est à reprendre pendant que la date
	 * limite pour agir continue de courir. Une date limite à cinq ans ne se
	 * compare pas à celle-là.
	 */
	readonly prochaineEcheance?: { readonly libelle: string; readonly dateLimite: string };
}

/** Ce que le lot a produit, dossier par dossier : préparé, ou refusé en le disant. */
export interface ResultatDuLot {
	readonly prepares: number;
	readonly refus: readonly { readonly debiteur: string; readonly raison: string }[];
}

export interface DossiersAffiches {
	readonly dossiers: readonly DossierDeLIndex[];
	readonly aujourdHui: string;
	/** Le lot en cours de préparation, ou son résultat. */
	readonly lot: 'AUCUN' | 'EN_COURS' | { readonly fait: ResultatDuLot };
	/** Le délai que le gérant accorde d'habitude (« Vos règles de calcul »). */
	readonly delaiParDefaut?: number;
	readonly onPreparerRelances: (
		creanceIds: readonly string[],
		delaiJours: number
	) => void | Promise<void>;
	readonly onFermerLeLot: () => void;
}

/** L'ordre des groupes : celui du fil d'un dossier. Ce qui est clos vient en dernier. */
const ORDRE: readonly EtapeDossier[] = ['PRET', 'ON_LUI_ECRIT', 'TRIBUNAL', 'REGLE'];

/**
 * LE NOM D'UN GROUPE, QUI N'EST PAS CELUI DE L'ÉTAPE.
 *
 * ⚠️ « LE TRIBUNAL, SI BESOIN » EST UN INTITULÉ DE FIL, PAS D'INDEX. Sur la page
 * d'un dossier, l'étape se lit AVANT qu'on y soit : le « si besoin » dit qu'elle
 * n'est pas une fatalité. Ici, les dossiers de ce groupe y SONT déjà — un
 * professionnel est désigné, ou une procédure est consignée. Le même libellé
 * dirait une chose fausse.
 */
const LIBELLE_GROUPE: Readonly<Record<EtapeDossier, string>> = {
	PRET: 'Prêts',
	ON_LUI_ECRIT: 'On lui a écrit',
	TRIBUNAL: 'Au tribunal',
	REGLE: 'Réglés'
};

/** Les délais proposés sur une lettre de relance, comme sur un dossier seul. */
const DELAIS = [8, 15, 30] as const;

/**
 * CE QU'UNE RANGÉE DIT SOUS LE NOM DU CLIENT.
 *
 * ⚠️ TROIS À CINQ MOTS, ET LA DATE D'ABORD. La sous-ligne se coupe à une ligne
 * (`apparenceRangee`), donc ce qui vient en dernier est ce qui disparaît. Le
 * libellé d'une échéance de procédure passait DEVANT sa date — « Remise de la
 * décision à votre client · 1 juin 2026 » — et la troncature mangeait la date,
 * c'est-à-dire la seule chose qu'on venait lire. Le commentaire qui précédait
 * cette fonction disait déjà « la date passe devant » ; le code faisait
 * l'inverse.
 */
function precisionDe(dossier: DossierDeLIndex, aujourdHui: string): string {
	if (dossier.prochaineEcheance !== undefined) {
		return `${dateCourte(dossier.prochaineEcheance.dateLimite)} · ${dossier.prochaineEcheance.libelle}`;
	}
	if (dossier.courrierAValider) return 'Un courrier à valider';
	/*
	  UN DOSSIER RÉGLÉ NE DIT PAS « RÉGLÉ » : son groupe le dit déjà, en en-tête.
	  Il dit ce qu'il contenait.
	*/
	if (dossier.etape === 'REGLE') {
		return `${dossier.nombreFactures} facture${pluriel(dossier.nombreFactures)}`;
	}
	if (dossier.dateLimiteAgir !== undefined) {
		return dossier.dateLimiteAgir < aujourdHui
			? `Dépassé le ${dateCourte(dossier.dateLimiteAgir)}`
			: `Agir avant le ${dateCourte(dossier.dateLimiteAgir)}`;
	}
	if (dossier.dernierCourrierLe !== undefined) {
		return `Écrit le ${dateCourte(dossier.dernierCourrierLe)}`;
	}
	return `${dossier.nombreFactures} facture${pluriel(dossier.nombreFactures)}`;
}

/** Un dossier à qui l'on peut encore écrire une lettre de relance. */
function relancable(dossier: DossierDeLIndex): boolean {
	return dossier.etape === 'PRET' || dossier.etape === 'ON_LUI_ECRIT';
}

/**
 * La recherche : sur le nom du client, sans accents ni casse.
 *
 * ⚠️ « Lefevre » doit trouver « Lefèvre ». Un gérant qui tape au pouce ne pose
 * pas d'accent, et une recherche qui rend « aucun résultat » pour un client
 * qu'il voyait dans sa liste la veille est une recherche qu'il cesse d'utiliser.
 */
function normaliser(texte: string): string {
	return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * L'EN-TÊTE D'UN GROUPE — son nom, puis son compte et son total à droite.
 *
 * ⚠️ C'EST L'EN-TÊTE « TODAY … +$18 » DE REVOLUT. Il dit, avant la moindre
 * rangée, combien de dossiers et combien d'argent vivent à cette étape : la
 * question qu'on se pose en balayant l'index n'est pas « lequel », c'est
 * « où est l'argent ».
 */
function EnTeteDeGroupe({
	libelle,
	nombre,
	total
}: {
	libelle: string;
	nombre: number;
	total: bigint | null;
}) {
	return (
		<div className="flex items-baseline justify-between gap-cladd-3xs px-1">
			<h2 className="text-cladd-sm font-semibold">{libelle}</h2>
			<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
				{nombre}
				{total === null ? null : <> · {eurosCentimes(total)}</>}
			</span>
		</div>
	);
}

export function EcranDossiers({ donnees }: { donnees: Lecture<DossiersAffiches> }) {
	/** L'étape retenue dans la feuille de filtre, ou `null` : toutes. */
	const [etape, setEtape] = useState<EtapeDossier | null>(null);
	const [terme, setTerme] = useState('');
	const [filtreOuvert, setFiltreOuvert] = useState(false);
	const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
	const [enSelection, setEnSelection] = useState(false);
	const [feuilleOuverte, setFeuilleOuverte] = useState(false);
	/*
	  ⚠️ DÉRIVÉ, PAS POSÉ. `useState(delaiParDefaut)` capturerait la valeur du
	  PREMIER rendu — celui de l'attente, où le réglage n'est pas encore lu — et
	  la feuille proposerait huit jours à un établissement qui en a choisi trente.
	*/
	const [delaiTouche, setDelaiTouche] = useState<number | undefined>(undefined);

	const entete = { genre: 'onglet', titre: 'Dossiers' } as const;

	if (donnees.etat !== 'pret') {
		return <PageEcran entete={entete} etat={donnees.etat} />;
	}

	const { dossiers, aujourdHui, lot, delaiParDefaut, onPreparerRelances, onFermerLeLot } =
		donnees.valeur;
	const delai = delaiTouche ?? delaiParDefaut ?? DELAIS[0];

	if (dossiers.length === 0) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '📂',
						titre: 'Aucun dossier',
						explication:
							'Un dossier réunit les factures impayées d’un même client, et porte le calcul de ce qu’il vous doit. Il se crée depuis la page d’un client, sur les factures que vous choisissez.',
						etapes: [
							'Vous déposez vos factures, ou vous les laissez arriver de votre logiciel.',
							'Vous ouvrez un client, vous cochez ses factures impayées.',
							'Le dossier porte alors son calcul, ses échéances et ses courriers.'
						],
						action: (
							<BoutonPrincipal as={Lien} to="/app/clients">
								Voir mes clients
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	const cherche = normaliser(terme);
	const visibles = dossiers.filter(
		(d) =>
			(etape === null || d.etape === etape) &&
			(cherche === '' || normaliser(d.debiteur).includes(cherche)) &&
			/*
			  ⚠️ EN SÉLECTION, SEULS CEUX À QUI L'ON PEUT ÉCRIRE. Un dossier réglé ou
			  déjà au tribunal n'attend pas une lettre de relance : le proposer ferait
			  composer un lot dont une partie serait refusée APRÈS le geste. Mail fait
			  pareil — ce qui ne se sélectionne pas ne s'offre pas.
			*/
			(!enSelection || relancable(d))
	);

	/*
	  ⚠️ LE SOUS-TITRE NE PORTE QUE L'ARGENT. Il disait « 54 211,50 € à
	  recouvrer · 4 dossiers » et, depuis que « Sélectionner » partage sa ligne,
	  il se coupait en « … · 4 » / « dossiers » à 393 px. Le compte y était de
	  toute façon redondant : chaque en-tête de groupe porte le sien. Le montant
	  total est la seule chose qu'on ne peut pas voir sans additionner. Les
	  dossiers réglés n'y entrent pas : ils ne sont plus « à recouvrer ».
	*/
	const encours = dossiers.filter((d) => d.etape !== 'REGLE');
	const total = encours.reduce((somme, d) => somme + d.principalRestantDu, 0n);
	const sousTitre = `${eurosCentimes(total)} à recouvrer`;

	const groupes = ORDRE.map((cle) => ({
		cle,
		dossiers: visibles.filter((d) => d.etape === cle)
	})).filter((groupe) => groupe.dossiers.length > 0);

	const choisis = [...selection].filter((id) => visibles.some((d) => d._id === id));
	const peutSelectionner = dossiers.some(relancable);

	function basculer(id: string) {
		setSelection((avant) => {
			const apres = new Set(avant);
			if (apres.has(id)) apres.delete(id);
			else apres.add(id);
			return apres;
		});
	}

	function quitterLaSelection() {
		setEnSelection(false);
		setSelection(new Set());
	}

	return (
		<PageEcran
			entete={{
				...entete,
				sousTitre,
				/*
				  ⚠️ UN MOT, PAS UNE PILULE. « Sélectionner » était un bouton de 56 px
				  posé au-dessus de la liste. C'est le « Sélectionner » de Mail : un mot
				  dans la couleur du lien, en haut à droite, qu'on trouve sans qu'il
				  ressemble à une action. Et il ne s'affiche que s'il y a quelque chose
				  à sélectionner.
				*/
				actions: !peutSelectionner ? undefined : enSelection ? (
					<BoutonTexte onClick={quitterLaSelection}>Annuler</BoutonTexte>
				) : (
					<BoutonTexte onClick={() => setEnSelection(true)}>Sélectionner</BoutonTexte>
				)
			}}
		>
			<PageBody>
				{/*
				  LA RECHERCHE ET UN SEUL FILTRE — Revolut, à la lettre.

				  ⚠️ LES CINQ SEGMENTS SONT PARTIS DANS UNE FEUILLE. Ils s'enroulaient sur
				  trois lignes à 375 px et faisaient de l'en-tête de la liste une rangée
				  d'onglets de plus. Le filtre par étape est un geste rare — les groupes,
				  en dessous, séparent déjà les étapes ; ce qu'on cherche au quotidien, on
				  le TAPE.
				*/}
				<div className="flex items-center gap-cladd-3xs">
					<SearchField
						size="md"
						tightFocusRing
						className="min-w-0 flex-1"
						value={terme}
						onChange={(valeur) => setTerme(valeur)}
						inputMode="search"
						placeholder="Rechercher un client"
						inputComponentProps={{
							'aria-label': 'Rechercher un dossier par le nom du client',
							enterKeyHint: 'search'
						}}
					/>
					{/*
					  ⚠️ UN DISQUE PLEIN, PAS UNE ICÔNE NUE. En transparent, le bouton
					  n'avait de contour qu'au survol — c'est-à-dire jamais, au doigt — et
					  le glyphe flottait à côté du champ comme une décoration. Revolut le
					  pose dans un disque plein de la même hauteur que la recherche : on
					  voit que c'est un bouton, et qu'il va avec le champ.
					*/}
					<Button
						size="md"
						rounded
						variant="solid"
						outline={false}
						className="shrink-0"
						aria-label={
							etape === null
								? 'Filtrer par étape'
								: `Filtré sur « ${LIBELLE_GROUPE[etape]} » — changer de filtre`
						}
						onClick={() => setFiltreOuvert(true)}
					>
						<SlidersHorizontalIcon />
					</Button>
				</div>

				{/*
				  LE FILTRE ACTIF SE LIT, ET SE RETIRE D'UN APPUI. Un filtre posé dans une
				  feuille qu'on a refermée est un filtre qu'on oublie — et une liste qui
				  n'en montre que deux sur cinq, sans dire pourquoi, se lit comme une
				  perte de données.
				*/}
				{etape === null ? null : (
					<div>
						<Chip
							as="button"
							size="md"
							rounded
							icon={XIcon}
							onClick={() => setEtape(null)}
							aria-label={`Retirer le filtre « ${LIBELLE_GROUPE[etape]} »`}
						>
							{LIBELLE_GROUPE[etape]}
						</Chip>
					</div>
				)}

				{groupes.length === 0 ? (
					<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
						{cherche === ''
							? 'Aucun dossier à cette étape.'
							: `Aucun dossier ne correspond à « ${terme.trim()} ».`}
					</p>
				) : (
					/*
					  ⚠️ VINGT PIXELS ENTRE DEUX GROUPES, DOUZE DANS UN GROUPE. Au même écart,
					  l'en-tête « On lui a écrit » collait à la carte du groupe PRÉCÉDENT et
					  se lisait comme son pied. Chez Revolut, l'en-tête d'un groupe est plus
					  près de SES rangées que de celles d'au-dessus : c'est ce qui fait qu'on
					  sait à qui il appartient sans y penser.
					*/
					<div className="flex flex-col gap-cladd-xs">
						{groupes.map((groupe) => (
							<section key={groupe.cle} className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe
									libelle={LIBELLE_GROUPE[groupe.cle]}
									nombre={groupe.dossiers.length}
									// Un total de dossiers réglés vaut zéro par construction : un
									// cadran à zéro, que la règle d'écran n° 4 interdit.
									total={
										groupe.cle === 'REGLE'
											? null
											: groupe.dossiers.reduce((s, d) => s + d.principalRestantDu, 0n)
									}
								/>
								<ListeAnalyses>
									{groupe.dossiers.map((dossier) =>
										enSelection ? (
											/*
										  EN SÉLECTION, LA CASE PREND LA PLACE DE L'AVATAR — Mail.
										  La rangée entière est la cible : une case de 20 px posée
										  sur une rangée qui est AUSSI un lien ouvre le dossier une
										  fois sur trois, au pouce.
										*/
											<LigneBouton
												key={dossier._id}
												genre="contenu"
												titre={dossier.debiteur}
												precision={precisionDe(dossier, aujourdHui)}
												valeur={eurosCentimes(dossier.principalRestantDu)}
												icone={
													<Checkbox
														as="span"
														size="md"
														checked={selection.has(dossier._id)}
														aria-label={`Sélectionner le dossier de ${dossier.debiteur}`}
													/>
												}
												onClick={() => basculer(dossier._id)}
											/>
										) : (
											<LigneAnalyse
												key={dossier._id}
												genre="contenu"
												vers="/app/dossier/$id"
												parametres={{ id: dossier._id }}
												titre={dossier.debiteur}
												precision={precisionDe(dossier, aujourdHui)}
												attention={dossier.courrierAValider}
												{...(dossier.etape === 'REGLE'
													? {}
													: { valeur: eurosCentimes(dossier.principalRestantDu) })}
												/*
											  ⚠️ UN CLIENT PORTE SON AVATAR, PAS UNE VIGNETTE DE
											  FAMILLE : toutes ces rangées sont de même nature, une
											  vignette les peindrait toutes pareil. Les initiales
											  changent à chaque rangée.
											*/
												avatar={<Avatar nom={dossier.debiteur} className="size-10" />}
											/>
										)
									)}
								</ListeAnalyses>
							</section>
						))}
					</div>
				)}

				{/*
				  LA BARRE D'ACTION DU LOT — le seul bouton plein de l'écran.

				  ⚠️ ELLE NE S'AFFICHE QU'AVEC UNE SÉLECTION, et elle DIT combien. Un
				  bouton sans compte ferait agir sur un nombre qu'on ne voit pas — et ce
				  nombre est celui des lettres qui iront ensuite à la signature du gérant.
				*/}
				{enSelection && choisis.length > 0 ? (
					<Surface
						variant="transparent"
						outline={false}
						className="verre-carte sticky bottom-cladd-2xs rounded-cladd-xl"
						contentClassName="flex items-center justify-between gap-cladd-3xs p-cladd-3xs"
					>
						<span className="pl-1 text-cladd-2xs font-semibold">
							{choisis.length} sélectionné{pluriel(choisis.length)}
						</span>
						<BoutonPrincipal onClick={() => setFeuilleOuverte(true)}>
							Préparer {choisis.length} lettre{pluriel(choisis.length)}
						</BoutonPrincipal>
					</Surface>
				) : null}
			</PageBody>

			{/*
			  LA FEUILLE DE FILTRE — un choix unique, appliqué à l'appui.

			  ⚠️ PAS DE BOUTON « FILTRER ». Revolut en met un parce que son filtre est
			  multiple, avec des cases. Celui-ci est un choix unique : la coche d'iOS,
			  et la feuille se referme sur la rangée touchée. Un appui de moins, et
			  aucun état intermédiaire où la coche ne correspond pas à la liste.
			*/}
			<Popup
				open={filtreOuvert}
				onOpenChange={(o) => {
					if (!o) setFiltreOuvert(false);
				}}
				headerLeft={
					<span className="px-2 pb-1 text-cladd-xs font-semibold">Filtrer par étape</span>
				}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					<ListeAnalyses>
						<LigneBouton
							genre="contenu"
							titre="Toutes les étapes"
							valeur={`${dossiers.length}`}
							icone={
								etape === null ? <CheckIcon className="size-5" /> : <span className="size-5" />
							}
							onClick={() => {
								setEtape(null);
								setFiltreOuvert(false);
							}}
						/>
						{ORDRE.map((cle) => {
							const nombre = dossiers.filter((d) => d.etape === cle).length;
							return (
								<LigneBouton
									key={cle}
									genre="contenu"
									titre={LIBELLE_GROUPE[cle]}
									valeur={`${nombre}`}
									icone={
										etape === cle ? <CheckIcon className="size-5" /> : <span className="size-5" />
									}
									onClick={() => {
										setEtape(cle);
										setFiltreOuvert(false);
									}}
								/>
							);
						})}
					</ListeAnalyses>
				</PopupContent>
			</Popup>

			{/* LA FEUILLE DU LOT : un seul réglage, celui qui change la lettre. */}
			<Popup
				open={feuilleOuverte}
				onOpenChange={(o) => {
					if (!o) setFeuilleOuverte(false);
				}}
				headerLeft={
					<span className="px-2 pb-1 text-cladd-xs font-semibold">
						Préparer {choisis.length} lettre{pluriel(choisis.length)}
					</span>
				}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					<SectionTitle>Le délai que vous lui laissez</SectionTitle>
					<Segmented
						className="mt-cladd-3xs"
						activeColor="neutral"
						activeVariant="solid"
						aria-label="Délai laissé au client"
					>
						{DELAIS.map((j) => (
							<SegmentedButton key={j} active={j === delai} onClick={() => setDelaiTouche(j)}>
								{j} jours
							</SegmentedButton>
						))}
					</Segmented>
					<p className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Chaque lettre est composée sur les chiffres de son dossier, à votre nom, et posée dans «
						Courriers » à valider. Rien ne part : vous relisez et vous validez chacune, comme pour
						un dossier seul.
					</p>
				</PopupContent>

				{lot !== 'AUCUN' && lot !== 'EN_COURS' ? (
					<PopupContent>
						<SectionTitle>Ce que le lot a fait</SectionTitle>
						<p className="mt-cladd-3xs text-cladd-xs">
							{lot.fait.prepares} lettre{pluriel(lot.fait.prepares)} préparée
							{pluriel(lot.fait.prepares)}.
						</p>
						{lot.fait.refus.map((refus) => (
							<p
								key={refus.debiteur}
								className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft"
							>
								<span className="font-semibold">{refus.debiteur}</span> — {refus.raison}
							</p>
						))}
					</PopupContent>
				) : null}

				<PopupContent>
					{lot !== 'AUCUN' && lot !== 'EN_COURS' ? (
						<BoutonPrincipal
							pleineLargeur
							onClick={() => {
								onFermerLeLot();
								setFeuilleOuverte(false);
								quitterLaSelection();
							}}
						>
							Terminé
						</BoutonPrincipal>
					) : (
						<BoutonPrincipal
							pleineLargeur
							disabled={lot === 'EN_COURS'}
							onClick={() => void onPreparerRelances(choisis, delai)}
						>
							{lot === 'EN_COURS'
								? 'Composition en cours…'
								: `Préparer ${choisis.length} lettre${pluriel(choisis.length)}`}
						</BoutonPrincipal>
					)}
				</PopupContent>
			</Popup>
		</PageEcran>
	);
}
