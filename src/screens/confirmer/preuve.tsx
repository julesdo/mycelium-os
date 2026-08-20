import { useState, type ReactNode } from 'react';
import {
	Button,
	Segmented,
	SegmentedButton,
	ToggleGroup,
	ToggleButton,
	SectionTitle
} from '@cladd-ui/react';
import { CheckIcon, PencilIcon, FileTextIcon } from 'lucide-react';
import { euros, pluriel, pourcent, FAMILLES } from '../../ui';
import { LABELS, LABELS_ORDONNES, MOTIFS } from '../../ui/egalim';
import type { LibelleAConfirmer } from './liste';

const FAMILLES_ORDONNEES = [
	'VIANDE',
	'POISSON',
	'FRUITS_LEGUMES',
	'LAITIERS',
	'EPICERIE_SECHE',
	'EPICERIE_APPERTISEE',
	'BOISSONS',
	'AUTRE'
] as const;

export interface Decision {
	isFood: boolean;
	family: string;
	qualifyingLabels: string[];
	justification: string;
}

/**
 * La preuve et la décision, volet droit.
 *
 * Deux principes gouvernent cet écran.
 *
 * **Le logiciel décide, le gérant confirme.** La classification proposée est
 * déjà là, justifiée, avec son indice de confiance. Le geste par défaut est un
 * seul appui sur « Confirmer ». Corriger est possible, mais c'est le cas
 * particulier, pas le parcours.
 *
 * **Rien n'est confirmé sans preuve visible.** Le document source est à portée
 * de doigt : c'est ce qui distingue une confirmation d'un acquiescement, et
 * c'est ce qui rend la mesure défendable en cas de contrôle.
 */
export function PreuveEtDecision({
	libelle,
	urlDocument,
	nomDocument,
	enCours,
	onConfirmer,
	onCorriger
}: {
	libelle: LibelleAConfirmer;
	urlDocument: string | null;
	nomDocument: string | null;
	enCours: boolean;
	onConfirmer: (d: Decision) => void;
	onCorriger: (d: Decision) => void;
}) {
	const p = libelle.proposition;
	const [correction, setCorrection] = useState(false);
	const [alimentaire, setAlimentaire] = useState(p?.isFood ?? true);
	const [famille, setFamille] = useState<string>(p?.family ?? 'AUTRE');
	const [labels, setLabels] = useState<string[]>(p?.qualifyingLabels ?? []);
	const [justification, setJustification] = useState(p?.justification ?? '');

	const motif = MOTIFS[libelle.motif];

	const decision = (): Decision => ({
		isFood: alimentaire,
		family: famille,
		qualifyingLabels: alimentaire ? labels : [],
		justification: justification.trim() || 'Confirmé par le gérant.'
	});

	return (
		<div className="flex h-full flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto p-cladd-xs">
				<div className="flex flex-col gap-cladd-xs">
					<div>
						<h2 className="text-cladd-md font-semibold tracking-tight">
							{libelle.normalizedLabel}
						</h2>
						<p className="mt-1 text-cladd-2xs text-cladd-fg-softer">
							Tel qu&rsquo;il apparaît sur la facture :{' '}
							<span className="font-mono">{libelle.rawLabelExemple}</span>
						</p>
						<p className="mt-cladd-3xs text-cladd-xs">
							<span className="font-semibold tabular-nums">
								{euros(libelle.montantCumuleHT)}
							</span>{' '}
							<span className="text-cladd-fg-soft">
								sur {libelle.occurrences} ligne{pluriel(libelle.occurrences)} de facture.
							</span>
						</p>
					</div>

					{motif ? (
						<div className="rounded-cladd-md border border-cladd-outline bg-cladd-surface p-cladd-3xs">
							<SectionTitle>Pourquoi cette question</SectionTitle>
							<p className="mt-1 text-cladd-xs leading-snug text-cladd-fg-soft">
								{motif.explication}
							</p>
						</div>
					) : null}

					{p ? (
						<div className="flex flex-col gap-cladd-3xs">
							<div className="flex items-baseline justify-between gap-cladd-3xs">
								<SectionTitle>Ce que nous proposons</SectionTitle>
								<span className="text-cladd-3xs text-cladd-fg-softer tabular-nums">
									confiance {pourcent(p.confidence)}
								</span>
							</div>
							<p className="text-cladd-xs">
								{p.isFood ? FAMILLES[p.family] ?? p.family : 'Non alimentaire'}
								{p.qualifyingLabels.length > 0
									? ` · ${p.qualifyingLabels.map((l) => LABELS[l]?.nom ?? l).join(', ')}`
									: p.isFood
										? ' · aucune mention qualifiante'
										: ''}
							</p>
							<p className="text-cladd-xs leading-snug text-cladd-fg-soft italic">
								« {p.justification} »
							</p>
						</div>
					) : (
						<p className="text-cladd-xs text-cladd-fg-soft">
							Nous n&rsquo;avons aucune proposition pour ce produit. À vous de le classer.
						</p>
					)}

					{urlDocument ? (
						<a
							href={urlDocument}
							target="_blank"
							rel="noreferrer"
							className="flex min-h-cladd-lg items-center gap-cladd-3xs rounded-cladd-md border border-cladd-outline px-cladd-3xs text-cladd-xs font-medium hover:bg-cladd-surface"
						>
							<FileTextIcon size={16} />
							Voir la facture{nomDocument ? ` · ${nomDocument}` : ''}
						</a>
					) : null}

					{correction || !p ? (
						<div className="flex flex-col gap-cladd-xs border-t border-cladd-outline pt-cladd-xs">
							<Groupe titre="Est-ce un achat alimentaire ?">
									<Segmented>
										<SegmentedButton
											active={alimentaire}
											onClick={() => setAlimentaire(true)}
										>
											Alimentaire
										</SegmentedButton>
										<SegmentedButton
											active={!alimentaire}
											onClick={() => setAlimentaire(false)}
										>
											Non alimentaire
										</SegmentedButton>
									</Segmented>
								</Groupe>

							{alimentaire ? (
								<>
									<Groupe titre="Famille de produits">
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
														{FAMILLES[f] ?? f}
													</ToggleButton>
												))}
											</ToggleGroup>
										</Groupe>

									<Groupe
											titre="Mentions qualifiantes portées par la facture"
											aide="« Local », « circuit court », « de saison » et « fait maison » ne comptent pour rien au barème."
										>
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
										</Groupe>
								</>
							) : null}

							<label className="flex flex-col gap-1">
								<SectionTitle>Votre justification</SectionTitle>
								<textarea
									value={justification}
									onChange={(e) => setJustification(e.target.value)}
									rows={2}
									placeholder="Ce qui vous fait dire ça. Conservé avec la ligne, pour un contrôle."
									className="w-full rounded-cladd-md border border-cladd-outline bg-cladd-surface-cut p-cladd-3xs text-cladd-xs"
								/>
							</label>
						</div>
					) : null}
				</div>
			</div>

			<div className="flex shrink-0 gap-cladd-3xs border-t border-cladd-outline p-cladd-3xs">
				{correction || !p ? (
					<>
						<Button
							color="brand"
							variant="solid-fill"
							loading={enCours}
							onClick={() => onCorriger(decision())}
							className="flex-1"
						>
							<CheckIcon />
							Enregistrer ma classification
						</Button>
						{p ? (
							<Button variant="gradient" onClick={() => setCorrection(false)}>
								Annuler
							</Button>
						) : null}
					</>
				) : (
					<>
						<Button
							color="brand"
							variant="solid-fill"
							loading={enCours}
							onClick={() => onConfirmer(decision())}
							className="flex-1"
						>
							<CheckIcon />
							Confirmer
						</Button>
						<Button variant="gradient" onClick={() => setCorrection(true)}>
							<PencilIcon />
							Corriger
						</Button>
					</>
				)}
			</div>
		</div>
	);
}

/**
 * Un groupe de champs, avec son titre.
 *
 * Ne dessine plus les boutons : ceux-ci viennent de `Segmented` et de
 * `ToggleGroup`, qui portent l'état actif, l'accent et la taille par contexte.
 * La version précédente les fabriquait à la main, ce que la documentation de
 * Cladd nomme comme son anti-pattern principal — et elle y perdait l'ajustement
 * automatique des tailles imbriquées.
 *
 * Le titre passe par `SectionTitle`, pour la même raison.
 */
function Groupe({
	titre,
	aide,
	children
}: {
	titre: string;
	aide?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<div>
				<SectionTitle>{titre}</SectionTitle>
				{aide ? <p className="mt-0.5 text-cladd-3xs text-cladd-fg-softer">{aide}</p> : null}
			</div>
			{children}
		</div>
	);
}
