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
	BoutonPrincipal,
	BoutonTexte,
	CarteBouton,
	CarteLien,
	EnTeteDeGroupe,
	LigneBouton,
	Lien,
	ListeAnalyses,
	ListeDeCartes,
	PageEcran,
	dateCourte,
	eurosCentimes,
	pluriel,
	type FamilleRangee,
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
 * CE QU'UNE CARTE DIT SOUS LE NOM DU CLIENT — ce qui se passe, sa date au bout,
 * et la pastille de ce qui arrive.
 *
 * ⚠️ LA DATE A SA PROPRE PLACE, AU BOUT DE LA LIGNE. La sous-ligne se coupe à une
 * ligne, donc ce qui vient en dernier est ce qui disparaît. Collée au libellé —
 * « Remise de la décision à votre client · 1 juin 2026 » —, la troncature
 * mangeait la date ou le libellé, selon l'ordre, c'est-à-dire toujours une des
 * deux choses qu'on venait lire. Séparée, elle ne se coupe jamais (`carte-rangee.tsx`).
 *
 * ⚠️ UNE PASTILLE SEULEMENT QUAND IL Y A QUELQUE CHOSE. Une échéance de procédure
 * porte l'horloge, un courrier à valider porte l'envoi ; un dossier qui attend
 * tranquillement n'en porte aucune. Une pastille sur chaque carte ne
 * distinguerait plus rien.
 */
function resumeDe(
	dossier: DossierDeLIndex,
	aujourdHui: string
): { readonly ligne: string; readonly date?: string; readonly famille?: FamilleRangee } {
	if (dossier.prochaineEcheance !== undefined) {
		return {
			ligne: dossier.prochaineEcheance.libelle,
			date: dateCourte(dossier.prochaineEcheance.dateLimite),
			famille: 'TEMPS'
		};
	}
	if (dossier.courrierAValider) return { ligne: 'Un courrier à valider', famille: 'ENVOI' };
	const factures = `${dossier.nombreFactures} facture${pluriel(dossier.nombreFactures)}`;
	/*
	  UN DOSSIER RÉGLÉ NE DIT PAS « RÉGLÉ » : son groupe le dit déjà, en en-tête.
	  Il dit ce qu'il contenait.
	*/
	if (dossier.etape === 'REGLE') return { ligne: factures };
	if (dossier.dateLimiteAgir !== undefined) {
		return {
			ligne: dossier.dateLimiteAgir < aujourdHui ? 'Date limite passée' : 'Date limite pour agir',
			date: dateCourte(dossier.dateLimiteAgir)
		};
	}
	if (dossier.dernierCourrierLe !== undefined) {
		return { ligne: 'Dernier courrier', date: dateCourte(dossier.dernierCourrierLe) };
	}
	return { ligne: factures };
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
				/*
				  ⚠️ LA RECHERCHE, LE FILTRE ET « SÉLECTIONNER » VIVENT DANS LA BARRE
				  COLLANTE, SUR UNE SEULE LIGNE — et le grand titre « Dossiers » et son
				  sous-titre « … à recouvrer » sont partis (30/09/2026, « la même barre
				  compacte partout »). La barre du bas dit où l'on est ; chaque en-tête de
				  groupe porte son total. C'est la barre de Revolut au-dessus de ses
				  transactions : ce qu'on cherche au quotidien, on le TAPE, et le champ
				  reste sous le pouce quand la liste défile.

				  ⚠️ LE FILTRE EST UN DISQUE PLEIN, PAS UNE ICÔNE NUE : en transparent, il
				  n'avait de contour qu'au survol — c'est-à-dire jamais, au doigt.

				  ⚠️ « SÉLECTIONNER » EST UN MOT, PAS UNE PILULE — le « Sélectionner » de
				  Mail, en haut à droite. Il ne s'affiche que s'il y a quelque chose à
				  sélectionner.
				*/
				actions: (
					<>
						<SearchField
							size="md"
							tightFocusRing
							className="min-w-0 flex-1"
							value={terme}
							onChange={(valeur) => setTerme(valeur)}
							inputMode="search"
							// « Client » et non « Rechercher » : à côté du filtre et de
							// « Sélectionner », le champ ne reçoit qu'une centaine de pixels à
							// 375 px, et « Rechercher » s'y lisait « Recherch ». Le mot dit
							// aussi ce qu'on tape — la recherche porte sur le nom du client.
							placeholder="Client"
							inputComponentProps={{
								'aria-label': 'Rechercher un dossier par le nom du client',
								enterKeyHint: 'search'
							}}
						/>
						<Button
							size="md"
							rounded
							square
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
						{!peutSelectionner ? null : enSelection ? (
							<BoutonTexte className="shrink-0" onClick={quitterLaSelection}>
								Annuler
							</BoutonTexte>
						) : (
							<BoutonTexte className="shrink-0" onClick={() => setEnSelection(true)}>
								Sélectionner
							</BoutonTexte>
						)}
					</>
				)
			}}
		>
			{/* Plus de `PageBody` imbriqué : c’était une seconde zone de défilement dans la première, et son rembourrage décalait la liste de 16 px sous la barre. */}
			<>
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
								<ListeDeCartes>
									{groupe.dossiers.map((dossier) => {
										const resume = resumeDe(dossier, aujourdHui);
										const contenu = {
											titre: dossier.debiteur,
											ligne: resume.ligne,
											...(resume.date === undefined ? {} : { date: resume.date }),
											// Un total de dossier réglé vaut zéro : un cadran à zéro.
											...(dossier.etape === 'REGLE'
												? {}
												: { montant: eurosCentimes(dossier.principalRestantDu) })
										};
										return enSelection ? (
											/*
											  EN SÉLECTION, LA CASE PREND LA PLACE DE L'AVATAR — Mail.
											  La carte entière est la cible : une case de 20 px posée
											  sur une carte qui est AUSSI un lien ouvre le dossier une
											  fois sur trois, au pouce. Et pas de chevron : cocher ne
											  mène nulle part.
											*/
											<CarteBouton
												key={dossier._id}
												{...contenu}
												chevron={false}
												icone={
													<span className="flex size-10 items-center justify-center">
														<Checkbox
															as="span"
															size="md"
															checked={selection.has(dossier._id)}
															aria-label={`Sélectionner le dossier de ${dossier.debiteur}`}
														/>
													</span>
												}
												onClick={() => basculer(dossier._id)}
											/>
										) : (
											<CarteLien
												key={dossier._id}
												vers="/app/dossier/$id"
												parametres={{ id: dossier._id }}
												{...contenu}
												attention={dossier.courrierAValider}
												{...(resume.famille === undefined ? {} : { famille: resume.famille })}
											/>
										);
									})}
								</ListeDeCartes>
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
			</>

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
