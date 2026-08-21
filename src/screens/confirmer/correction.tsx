import { useState, type ReactNode } from 'react';
import {
	Popup,
	PopupContent,
	Button,
	Segmented,
	SegmentedButton,
	ToggleGroup,
	ToggleButton,
	SectionTitle,
	Textarea
} from '@cladd-ui/react';
import { CheckIcon, FileTextIcon } from 'lucide-react';
import { Illustration, euros, pluriel, FAMILLES, type Famille } from '../../ui';
import { LABELS, LABELS_ORDONNES, MOTIFS } from '../../ui/egalim';

/**
 * La correction — la feuille qui s'ouvre quand le gérant n'est pas d'accord.
 *
 * Elle est délibérément SECONDAIRE. Le parcours nominal est un appui sur
 * « C'est bien ça », depuis la carte, sans jamais ouvrir cette feuille. Elle
 * n'existe donc que pour deux cas : le classificateur s'est trompé, ou il n'a
 * rien proposé du tout.
 *
 * Ce qui est ouvert d'emblée l'est pour une raison mesurable : chaque
 * dépliement coûte un geste, et un gérant qui a soixante produits à passer ne
 * déplie rien. Les deux questions qui décident du barème — la famille et les
 * mentions — sont donc posées à plat, sans accordéon.
 *
 * La justification est le seul champ libre du produit, et il est facultatif.
 * L'exiger transformerait chaque correction en rédaction ; ne pas l'offrir
 * priverait le gérant du seul endroit où consigner « le fournisseur m'a envoyé
 * l'attestation le 12 mars ». Un défaut est écrit à sa place, et il dit la
 * vérité : la classification vient de lui.
 */

const FAMILLES_ORDONNEES: readonly Famille[] = [
	'FRUITS_LEGUMES',
	'VIANDE',
	'POISSON',
	'LAITIERS',
	'EPICERIE_SECHE',
	'EPICERIE_APPERTISEE',
	'BOISSONS',
	'AUTRE'
];

export interface Decision {
	isFood: boolean;
	family: string;
	qualifyingLabels: string[];
	justification: string;
}

export interface ProduitACorriger {
	normalizedLabel: string;
	rawLabelExemple: string;
	occurrences: number;
	montantCumuleHT: number;
	motif: string;
	proposition: {
		isFood: boolean;
		family: Famille;
		qualifyingLabels: string[];
		justification: string;
		confidence: number;
	} | null;
}

export function FeuilleCorrection({
	produit,
	urlDocument,
	nomDocument,
	enCours,
	onEnregistrer,
	onFermer,
	detail,
	intitule = 'Classer ce produit'
}: {
	produit: ProduitACorriger;
	urlDocument: string | null;
	nomDocument: string | null;
	enCours: boolean;
	onEnregistrer: (d: Decision) => void;
	onFermer: () => void;
	/**
	 * Le détail des lignes qui portent ce produit, quand on l'ouvre depuis le
	 * catalogue plutôt que depuis la file. Ce n'est pas le même besoin : dans la
	 * file, le gérant tranche vite sur une proposition fraîche ; dans le
	 * catalogue, il revient sur une décision déjà prise et veut d'abord voir ce
	 * qu'il a réellement acheté.
	 */
	detail?: ReactNode;
	intitule?: string;
}) {
	const p = produit.proposition;
	const [alimentaire, setAlimentaire] = useState(p?.isFood ?? true);
	const [famille, setFamille] = useState<string>(p?.family ?? 'AUTRE');
	const [labels, setLabels] = useState<string[]>(p?.qualifyingLabels ?? []);
	const [justification, setJustification] = useState('');

	const motif = MOTIFS[produit.motif];

	function enregistrer() {
		onEnregistrer({
			isFood: alimentaire,
			family: famille,
			qualifyingLabels: alimentaire ? labels : [],
			justification: justification.trim() || 'Classification établie par le gérant.'
		});
	}

	return (
		<Popup
			open
			onOpenChange={(ouvert) => {
				if (!ouvert) onFermer();
			}}
			contentClassName="max-w-200"
			headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">{intitule}</span>}
		>
			<PopupContent>
				<div className="flex items-start gap-cladd-2xs">
					<Illustration
						libelle={produit.rawLabelExemple}
						famille={alimentaire ? (famille as Famille) : 'AUTRE'}
						estAlimentaire={alimentaire}
						taille="md"
					/>
					<div className="min-w-0 flex-1">
						<h2 className="text-cladd-sm leading-tight font-semibold break-words">
							{produit.rawLabelExemple}
						</h2>
						<p className="mt-1 text-cladd-2xs text-cladd-fg-soft">
							<span className="font-semibold tabular-nums">
								{euros(produit.montantCumuleHT)}
							</span>{' '}
							sur {produit.occurrences} ligne{pluriel(produit.occurrences)} de facture.
						</p>
						{motif ? (
							<p className="mt-cladd-3xs text-cladd-2xs leading-snug text-cladd-fg-softer">
								{motif.explication}
							</p>
						) : null}
					</div>
				</div>

				{/* La preuve reste à un doigt pendant toute la correction. C'est ce
				    qui distingue une confirmation d'un acquiescement, et c'est ce
				    qu'un contrôleur attend qu'on ait regardé. */}
				{urlDocument ? (
					<Button
						as="a"
						href={urlDocument}
						target="_blank"
						rel="noreferrer"
						className="mt-cladd-2xs w-full"
					>
						<FileTextIcon />
						Voir la facture{nomDocument ? ` · ${nomDocument}` : ''}
					</Button>
				) : null}
			</PopupContent>

			{detail ? <PopupContent>{detail}</PopupContent> : null}

			<PopupContent>
				<div className="flex flex-col gap-cladd-2xs">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Est-ce un achat alimentaire ?</SectionTitle>
						<Segmented activeColor="neutral" activeVariant="solid">
							<SegmentedButton active={alimentaire} onClick={() => setAlimentaire(true)}>
								Alimentaire
							</SegmentedButton>
							<SegmentedButton active={!alimentaire} onClick={() => setAlimentaire(false)}>
								Non alimentaire
							</SegmentedButton>
						</Segmented>
					</div>

					{alimentaire ? (
						<>
							<div className="flex flex-col gap-cladd-3xs">
								<SectionTitle>Famille de produits</SectionTitle>
								<ToggleGroup
									value={famille}
									onValueChange={(v) => {
										// Un ToggleGroup simple se déselectionne au second clic.
										// Une famille est obligatoire : on ignore le vide.
										if (typeof v === 'string') setFamille(v);
									}}
									className="flex flex-wrap gap-cladd-3xs"
								>
									{FAMILLES_ORDONNEES.map((f) => (
										<ToggleButton key={f} value={f}>
											{FAMILLES[f]}
										</ToggleButton>
									))}
								</ToggleGroup>
							</div>

							<div className="flex flex-col gap-cladd-3xs">
								<SectionTitle>Mentions portées par la facture</SectionTitle>
								<p className="text-cladd-3xs text-cladd-fg-softer">
									« Local », « circuit court », « de saison » et « fait maison » ne comptent pour
									rien au barème. Ne cochez que ce qui est écrit noir sur blanc.
								</p>
								<ToggleGroup
									multiple
									value={labels}
									onValueChange={(v) => setLabels(Array.isArray(v) ? v : v ? [v] : [])}
									className="flex flex-wrap gap-cladd-3xs"
								>
									{LABELS_ORDONNES.map((l) => (
										<ToggleButton key={l} value={l}>
											{LABELS[l]?.nom ?? l}
										</ToggleButton>
									))}
								</ToggleGroup>
							</div>
						</>
					) : null}

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Votre justification (facultatif)</SectionTitle>
						{/* `Textarea` de Cladd n'est pas un `<textarea>` : c'est un
						    `contenteditable` qui grandit avec son contenu. Il n'a donc
						    pas de `rows`, et son `onChange` rend la valeur, pas
						    l'événement. */}
						<Textarea
							size="md"
							value={justification}
							onChange={(valeur) => setJustification(valeur)}
							placeholder="Ce qui vous fait dire ça. Conservé avec la ligne, pour un contrôle."
						/>
					</div>
				</div>
			</PopupContent>

			<PopupContent>
				<div className="flex gap-cladd-3xs">
					<Button
						color="brand"
						variant="solid-fill"
						className="flex-1"
						loading={enCours}
						readOnly={enCours}
						onClick={enregistrer}
					>
						<CheckIcon />
						Enregistrer ma classification
					</Button>
					<Button onClick={onFermer} disabled={enCours}>
						Annuler
					</Button>
				</div>
			</PopupContent>
		</Popup>
	);
}
