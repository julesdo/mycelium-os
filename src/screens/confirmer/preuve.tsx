import { useState } from 'react';
import { Button } from '@cladd-ui/react';
import { CheckIcon, PencilIcon, FileTextIcon } from 'lucide-react';
import { cn, euros, pluriel, pourcent, FAMILLES } from '../../ui';
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

	const basculerLabel = (l: string) =>
		setLabels((actuels) =>
			actuels.includes(l) ? actuels.filter((x) => x !== l) : [...actuels, l]
		);

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
							<p className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
								Pourquoi cette question
							</p>
							<p className="mt-1 text-cladd-xs leading-snug text-cladd-fg-soft">
								{motif.explication}
							</p>
						</div>
					) : null}

					{p ? (
						<div className="flex flex-col gap-cladd-3xs">
							<div className="flex items-baseline justify-between gap-cladd-3xs">
								<h3 className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
									Ce que nous proposons
								</h3>
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
							<Choix
								titre="Est-ce un achat alimentaire ?"
								options={[
									{ cle: 'oui', nom: 'Alimentaire' },
									{ cle: 'non', nom: 'Non alimentaire' }
								]}
								estActif={(c) => (c === 'oui') === alimentaire}
								onBasculer={(c) => setAlimentaire(c === 'oui')}
							/>

							{alimentaire ? (
								<>
									<Choix
										titre="Famille de produits"
										options={FAMILLES_ORDONNEES.map((f) => ({
											cle: f,
											nom: FAMILLES[f] ?? f
										}))}
										estActif={(c) => c === famille}
										onBasculer={setFamille}
									/>

									<Choix
										titre="Mentions qualifiantes portées par la facture"
										aide="« Local », « circuit court », « de saison » et « fait maison » ne comptent pour rien au barème."
										options={LABELS_ORDONNES.map((l) => ({
											cle: l,
											nom: LABELS[l]?.nom ?? l
										}))}
										estActif={(c) => labels.includes(c)}
										onBasculer={basculerLabel}
									/>
								</>
							) : null}

							<label className="flex flex-col gap-1">
								<span className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
									Votre justification
								</span>
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
 * Un groupe de choix en boutons, jamais en liste déroulante.
 *
 * Sur tablette, une liste déroulante coûte deux gestes et masque les options
 * pendant qu'on choisit. Huit familles et dix mentions tiennent à l'écran :
 * autant les montrer et n'en demander qu'un seul.
 */
function Choix({
	titre,
	aide,
	options,
	estActif,
	onBasculer
}: {
	titre: string;
	aide?: string;
	options: readonly { cle: string; nom: string }[];
	estActif: (cle: string) => boolean;
	onBasculer: (cle: string) => void;
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<div>
				<p className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
					{titre}
				</p>
				{aide ? <p className="mt-0.5 text-cladd-3xs text-cladd-fg-softer">{aide}</p> : null}
			</div>
			<div className="flex flex-wrap gap-cladd-3xs">
				{options.map((o) => (
					<button
						key={o.cle}
						type="button"
						onClick={() => onBasculer(o.cle)}
						aria-pressed={estActif(o.cle)}
						className={cn(
							'min-h-cladd-lg rounded-cladd-md border px-cladd-3xs text-cladd-xs font-medium transition-colors',
							estActif(o.cle)
								? 'border-cladd-primary bg-cladd-primary text-cladd-on-primary'
								: 'border-cladd-outline hover:bg-cladd-surface'
						)}
					>
						{o.nom}
					</button>
				))}
			</div>
		</div>
	);
}
