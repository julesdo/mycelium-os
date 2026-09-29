import { useState } from 'react';
import {
	Checkbox,
	Chip,
	Popup,
	PopupContent,
	SectionTitle,
	Segmented,
	SegmentedButton,
	Surface,
	Toolbar
} from '@cladd-ui/react';
import { ScaleIcon } from 'lucide-react';
import { TITRE_ETAPE, type EtapeDossier } from '../lib/verticales/recouvrement/etapes-dossier';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	Lien,
	ListeAnalyses,
	LigneAnalyse,
	PageBody,
	PageEcran,
	dateCourte,
	eurosCentimes,
	pluriel,
	type Lecture
} from '../ui';

/**
 * L'INDEX DES DOSSIERS — tous, et c'est nouveau.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CET ÉCRAN REMPLACE, ET POURQUOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'onglet « Dossiers » de la barre du bas menait à `/app/procedures`, qui ne
 * listait que les dossiers DÉJÀ portés devant un tribunal : quatre sur dix-sept
 * dans la démonstration. Il n'existait donc, dans tout le produit, aucun écran
 * qui liste les dossiers. Les seules portes étaient la file du jour — qui montre
 * ce qui PRESSE, pas ce qui EXISTE — et la page d'un client. « Tous mes dossiers
 * ouverts, du plus gros au plus petit » ne s'obtenait nulle part (audit du
 * 29/09/2026, F7).
 *
 * Ce qu'apportait `/app/procedures` n'est pas perdu : la frise d'une procédure,
 * sa prochaine échéance et ses angles morts vivent sur la page du dossier
 * (`SuiviProcedure`), là où on les cherche. Le filtre « Au tribunal » rend la
 * même liste qu'avant.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE PLUS GROS D'ABORD, ET C'EST UN CHOIX DE PRODUIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La file du jour trie par urgence juridique — ce qui est juste, c'est son
 * métier. Mais aucun écran ne permettait de commencer par ce qui RAPPORTE. Le
 * tri vient de la requête, sur la colonne affichée : il se refait à la main.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE MODE SÉLECTION, ET POURQUOI IL EST UN MODE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une case cochable en permanence sur une rangée qui est AUSSI un lien force à
 * viser : la case ouvre le dossier une fois sur trois, sur un écran tactile de
 * 375 px. Le mode sépare les deux gestes — on lit, ou on sélectionne — et la
 * rangée entière reste une cible de 48 px dans les deux cas.
 *
 * ⚠️ ET CE QUI SE GROUPE EST LA PRÉPARATION, JAMAIS L'ENGAGEMENT. Le lot
 * prépare des lettres ; chacune atterrit « à valider » sur son dossier, et le
 * gérant la relit et la valide une par une. C'est la ligne rouge n° 1, et elle
 * ne bouge pas parce qu'on gagne du temps.
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
	readonly onPreparerRelances: (
		creanceIds: readonly string[],
		delaiJours: number
	) => void | Promise<void>;
	readonly onFermerLeLot: () => void;
}

type CleFiltre = 'TOUS' | EtapeDossier;

const FILTRES: readonly { readonly cle: CleFiltre; readonly libelle: string }[] = [
	{ cle: 'TOUS', libelle: 'Tous' },
	{ cle: 'PRET', libelle: TITRE_ETAPE.PRET },
	{ cle: 'ON_LUI_ECRIT', libelle: TITRE_ETAPE.ON_LUI_ECRIT },
	{ cle: 'TRIBUNAL', libelle: TITRE_ETAPE.TRIBUNAL },
	{ cle: 'REGLE', libelle: TITRE_ETAPE.REGLE }
];

/** Les délais proposés sur une lettre de relance, comme sur un dossier seul. */
const DELAIS = [8, 15, 30] as const;

/**
 * Ce qu'une rangée dit sous le nom du client.
 *
 * ⚠️ UNE SEULE PHRASE, ET LA PLUS UTILE. Ce qui attend le gérant passe devant
 * une date limite lointaine : c'est lui qui bloque, pas le calendrier.
 */
function precisionDe(dossier: DossierDeLIndex, aujourdHui: string): string {
	if (dossier.prochaineEcheance !== undefined) {
		return `${dossier.prochaineEcheance.libelle} · ${dateCourte(dossier.prochaineEcheance.dateLimite)}`;
	}
	if (dossier.courrierAValider) return 'Un courrier attend votre validation';
	if (dossier.etape === 'REGLE') return 'Réglé';
	if (dossier.dateLimiteAgir !== undefined) {
		return dossier.dateLimiteAgir < aujourdHui
			? `Date limite pour agir dépassée depuis le ${dateCourte(dossier.dateLimiteAgir)}`
			: `Date limite pour agir : ${dateCourte(dossier.dateLimiteAgir)}`;
	}
	if (dossier.dernierCourrierLe !== undefined) {
		return `Écrit le ${dateCourte(dossier.dernierCourrierLe)}`;
	}
	return `${dossier.nombreFactures} facture${pluriel(dossier.nombreFactures)}`;
}

export function EcranDossiers({ donnees }: { donnees: Lecture<DossiersAffiches> }) {
	const [filtre, setFiltre] = useState<CleFiltre>('TOUS');
	const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
	const [enSelection, setEnSelection] = useState(false);
	const [feuilleOuverte, setFeuilleOuverte] = useState(false);
	const [delai, setDelai] = useState<number>(DELAIS[0]);

	const entete = { genre: 'onglet', titre: 'Dossiers' } as const;

	if (donnees.etat !== 'pret') {
		return <PageEcran entete={entete} etat={donnees.etat} />;
	}

	const { dossiers, aujourdHui, lot, onPreparerRelances, onFermerLeLot } = donnees.valeur;

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

	const visibles = dossiers.filter((d) => filtre === 'TOUS' || d.etape === filtre);

	/*
	  ⚠️ SEULS LES DOSSIERS À QUI ON PEUT ENCORE ÉCRIRE SONT SÉLECTIONNABLES. Un
	  dossier réglé ou déjà au tribunal n'attend pas une lettre de relance : le
	  proposer ferait composer un lot dont la moitié serait refusée, et le refus
	  arriverait APRÈS le geste. On ne propose pas ce qu'on refusera.
	*/
	const relancables = visibles.filter((d) => d.etape === 'PRET' || d.etape === 'ON_LUI_ECRIT');
	const choisis = [...selection].filter((id) => relancables.some((d) => d._id === id));

	const total = visibles.reduce((somme, d) => somme + d.principalRestantDu, 0n);
	const sousTitre = `${visibles.length} dossier${pluriel(visibles.length)} · ${eurosCentimes(total)} à recouvrer`;

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
		<PageEcran entete={{ ...entete, sousTitre }}>
			<PageBody>
				<Toolbar>
					<Segmented activeColor="neutral" activeVariant="solid" aria-label="Filtrer les dossiers">
						{FILTRES.map((f) => (
							<SegmentedButton
								key={f.cle}
								active={f.cle === filtre}
								onClick={() => setFiltre(f.cle)}
							>
								{f.libelle}
							</SegmentedButton>
						))}
					</Segmented>
				</Toolbar>

				{relancables.length > 0 ? (
					<div className="flex justify-end">
						{enSelection ? (
							<BoutonSecondaire onClick={quitterLaSelection}>Annuler</BoutonSecondaire>
						) : (
							<BoutonSecondaire onClick={() => setEnSelection(true)}>
								Sélectionner
							</BoutonSecondaire>
						)}
					</div>
				) : null}

				{visibles.length === 0 ? (
					<p className="text-cladd-xs text-cladd-fg-soft">
						Aucun dossier à cette étape. Les autres sont sous « Tous ».
					</p>
				) : enSelection ? (
					<div className="flex flex-col gap-cladd-3xs">
						{visibles.map((dossier) => {
							const cochable = dossier.etape === 'PRET' || dossier.etape === 'ON_LUI_ECRIT';
							return (
								<Surface
									key={dossier._id}
									variant="transparent"
									outline={false}
									className="verre-carte rounded-cladd-xl"
									contentClassName="p-0"
								>
									{/* Toute la carte est l'étiquette de sa case : la cible fait la rangée. */}
									<label
										aria-label={`Sélectionner le dossier de ${dossier.debiteur}`}
										className="flex items-center gap-cladd-3xs p-cladd-2xs"
									>
										<Checkbox
											as="span"
											checked={selection.has(dossier._id)}
											onChange={() => basculer(dossier._id)}
											disabled={!cochable}
										/>
										<span className="flex min-w-0 flex-1 flex-col">
											<span className="truncate text-cladd-sm font-semibold">
												{dossier.debiteur}
											</span>
											<span className="text-cladd-2xs text-cladd-fg-softer">
												{cochable
													? precisionDe(dossier, aujourdHui)
													: `${TITRE_ETAPE[dossier.etape]} — pas de relance à préparer`}
											</span>
										</span>
										<span className="shrink-0 text-cladd-sm tabular-nums">
											{eurosCentimes(dossier.principalRestantDu)}
										</span>
									</label>
								</Surface>
							);
						})}
					</div>
				) : (
					<ListeAnalyses>
						{visibles.map((dossier) => (
							<LigneAnalyse
								key={dossier._id}
								vers="/app/dossier/$id"
								parametres={{ id: dossier._id }}
								titre={dossier.debiteur}
								valeur={eurosCentimes(dossier.principalRestantDu)}
								precision={precisionDe(dossier, aujourdHui)}
								attention={dossier.courrierAValider}
								icone={
									dossier.etape === 'TRIBUNAL' ? (
										<ScaleIcon className="size-4" aria-hidden />
									) : undefined
								}
							/>
						))}
					</ListeAnalyses>
				)}

				{/*
				  LA BARRE D'ACTION DU LOT.

				  ⚠️ ELLE NE S'AFFICHE QU'AVEC UNE SÉLECTION, et elle DIT combien. Un
				  bouton « Préparer les relances » sans compte ferait agir sur un nombre
				  qu'on ne voit pas — et ce nombre est le nombre de lettres qui iront
				  ensuite à la signature du gérant.
				*/}
				{enSelection && choisis.length > 0 ? (
					<Surface
						variant="transparent"
						outline={false}
						className="verre-carte sticky bottom-cladd-2xs rounded-cladd-xl"
						contentClassName="flex flex-wrap items-center justify-between gap-cladd-3xs p-cladd-2xs"
					>
						<span className="text-cladd-xs font-semibold">
							{choisis.length} dossier{pluriel(choisis.length)} sélectionné
							{pluriel(choisis.length)}
						</span>
						<BoutonPrincipal onClick={() => setFeuilleOuverte(true)}>
							Préparer une lettre de relance
						</BoutonPrincipal>
					</Surface>
				) : null}
			</PageBody>

			{/* LA FEUILLE DU LOT : un seul réglage, celui qui change la lettre. */}
			<Popup
				open={feuilleOuverte}
				onOpenChange={(o) => {
					if (!o) setFeuilleOuverte(false);
				}}
				headerLeft={
					<span className="px-2 pb-1 text-cladd-sm font-semibold">
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
							<SegmentedButton key={j} active={j === delai} onClick={() => setDelai(j)}>
								{j} jours
							</SegmentedButton>
						))}
					</Segmented>
					<p className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Chaque lettre est composée sur les chiffres de son dossier, à votre nom, et posée
						dans « Vos courriers » à valider. Rien ne part : vous relisez et vous validez
						chacune, comme pour un dossier seul.
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

/** Le rang d'une étape, pour une puce qui reste lisible sans couleur de seuil. */
export function ChipEtape({ etape }: { etape: EtapeDossier }) {
	return (
		<Chip size="md" color="neutral">
			{TITRE_ETAPE[etape]}
		</Chip>
	);
}
