import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Surface } from '@cladd-ui/react';
import { CameraIcon, PartyPopperIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	CarteProduit,
	Bandeau,
	euros,
	pluriel,
	type Famille
} from '../../ui';
import {
	FeuilleCorrection,
	type Decision,
	type ProduitACorriger
} from '../../screens/confirmer/correction';

export const Route = createFileRoute('/app/confirmer')({ component: Confirmer });

/**
 * La file de confirmation.
 *
 * C'EST L'ÉCRAN DU PRODUIT. Tout le reste — le dépôt, les taux, le
 * diagnostic — est du logiciel qui tourne tout seul. Ici, et ici seulement, le
 * gérant travaille. La mesure qui gouverne le dessin : un premier dépôt de
 * douze mois pose entre soixante et cent produits. Le coût de l'écran, c'est
 * le nombre de gestes multiplié par cent.
 *
 * Ce que la version précédente demandait, par produit : cliquer la ligne dans
 * une liste, lire le volet de droite, cliquer « Confirmer ». Trois gestes,
 * dont un de navigation pure, et un aller-retour de l'œil entre deux colonnes.
 *
 * Ce que celle-ci demande : un appui. Les produits sont posés en grille, tout
 * est déjà lisible sur la carte, et la décision est sur la carte. Le volet de
 * preuve n'a pas disparu — il s'ouvre en feuille quand on corrige, c'est-à-dire
 * précisément quand on en a besoin.
 *
 * L'ordre est celui du montant en jeu, décroissant : si le gérant s'arrête au
 * bout de dix minutes, il s'est arrêté sur ce qui pesait le moins.
 */
function Confirmer() {
	const file = useQuery(api.egalim.confirmation.listerAConfirmer, {});
	const confirmer = useMutation(api.egalim.confirmation.confirmer);
	const corriger = useMutation(api.egalim.confirmation.corriger);

	const [enCours, setEnCours] = useState<string | null>(null);
	const [aCorriger, setACorriger] = useState<string | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);

	const libelles = file?.libelles ?? [];

	// La sélection suit la file par DÉRIVATION : quand le libellé qu'on vient de
	// trancher disparaît, `find` ne le trouve plus et la feuille se ferme d'elle
	// même. Écrire ça dans un effet provoquerait un second rendu à chaque
	// confirmation, visible comme un clignotement de toute la grille.
	const produitCorrige = libelles.find((l) => l.normalizedLabel === aCorriger) ?? null;

	const preuve = useQuery(
		api.egalim.confirmation.obtenirPreuve,
		produitCorrige?.documentId
			? { documentId: produitCorrige.documentId as Id<'invoiceDocuments'> }
			: 'skip'
	);

	async function trancher(
		normalizedLabel: string,
		d: Decision,
		correction: boolean
	): Promise<void> {
		setEnCours(normalizedLabel);
		setErreur(null);
		try {
			const args = {
				normalizedLabel,
				isFood: d.isFood,
				family: d.family as never,
				qualifyingLabels: d.qualifyingLabels as never,
				justification: d.justification
			};
			await (correction ? corriger(args) : confirmer(args));
			setACorriger(null);
		} catch (e) {
			// Sans ce bloc, un refus du backend — une organisation sans droit, un
			// libellé déjà tranché par un collègue sur une autre tablette — était
			// parfaitement silencieux : la carte restait là, et le gérant appuyait
			// une deuxième fois.
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: "Cette confirmation n'a pas pu être enregistrée."
			);
		} finally {
			setEnCours(null);
		}
	}

	if (file === undefined) {
		return (
			<Page>
				<PageHeader titre="À confirmer" sousTitre="Ce qui engage votre responsabilité." />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement de votre file…</p>
				</PageBody>
			</Page>
		);
	}

	if (libelles.length === 0) {
		return (
			<Page>
				<PageHeader titre="À confirmer" sousTitre="Ce qui engage votre responsabilité." />
				<PageBody>
					<EmptyState
						titre="Rien ne vous attend."
						explication="Tous vos produits sont classés et confirmés. Vos taux reposent sur des décisions que vous avez prises, et chacune est conservée avec sa justification."
						action={
							<Button as={Link} to="/app/factures" color="brand" variant="solid-fill">
								<CameraIcon />
								Ajouter des factures
							</Button>
						}
					/>
				</PageBody>
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader
				titre="À confirmer"
				sousTitre={`${libelles.length} produit${pluriel(libelles.length)}, ${euros(
					file.montantTotalEnJeu
				)} en jeu. Les plus lourds d'abord.`}
			/>

			<PageBody>
				<div className="flex flex-col gap-cladd-2xs">
					{erreur ? <Bandeau ton="alerte">{erreur}</Bandeau> : null}

					<Encouragement restants={libelles.length} />

					{/* Une seule colonne jusqu'à la tablette en portrait, deux au-delà,
					    trois sur un grand écran. Au-delà de trois, la carte devient trop
					    étroite pour que le montant et le verdict tiennent sur la même
					    ligne que l'illustration, et on repasse à de la lecture. */}
					<div className="grid gap-cladd-2xs md:grid-cols-2 2xl:grid-cols-3">
						{libelles.map((l) => (
							<CarteProduit
								key={l.normalizedLabel}
								libelle={l.rawLabelExemple}
								occurrences={l.occurrences}
								montant={l.montantCumuleHT}
								motif={l.motif}
								proposition={
									l.proposition
										? {
												famille: l.proposition.family as Famille,
												mentions: l.proposition.qualifyingLabels,
												estAlimentaire: l.proposition.isFood,
												justification: l.proposition.justification,
												confiance: l.proposition.confidence
											}
										: null
								}
								enCours={enCours === l.normalizedLabel}
								onConfirmer={() => {
									if (!l.proposition) return;
									void trancher(
										l.normalizedLabel,
										{
											isFood: l.proposition.isFood,
											family: l.proposition.family,
											qualifyingLabels: [...l.proposition.qualifyingLabels],
											justification: l.proposition.justification
										},
										false
									);
								}}
								onCorriger={() => setACorriger(l.normalizedLabel)}
							/>
						))}
					</div>
				</div>
			</PageBody>

			{produitCorrige ? (
				<FeuilleCorrection
					// `key` sur le libellé : c'est le mécanisme prévu par React pour
					// remettre à zéro l'état d'un formulaire quand l'objet qu'il édite
					// change d'identité. Sans lui, une correction saisie pour un produit
					// se reporterait silencieusement sur le suivant, et fausserait la
					// mesure sans laisser de trace.
					key={produitCorrige.normalizedLabel}
					produit={produitCorrige as ProduitACorriger}
					urlDocument={preuve?.url ?? null}
					nomDocument={preuve?.filename ?? null}
					enCours={enCours === produitCorrige.normalizedLabel}
					onEnregistrer={(d) => void trancher(produitCorrige.normalizedLabel, d, true)}
					onFermer={() => setACorriger(null)}
				/>
			) : null}
		</Page>
	);
}

/**
 * Ce qui reste à faire, dit en temps plutôt qu'en nombre.
 *
 * « 62 produits » se lit comme une corvée sans fin. « Environ 5 minutes » se
 * lit comme une tâche qu'on finit avant le service. Le chiffre est le même ;
 * la décision de s'y mettre, non.
 *
 * Cinq secondes par produit, c'est ce que coûte un appui sur un écran où tout
 * est déjà lisible. On arrondit à la minute supérieure, et on ne descend
 * jamais sous « une minute » : annoncer « 12 secondes » ferait douter du
 * chiffre plutôt que rassurer.
 */
function Encouragement({ restants }: { restants: number }) {
	const minutes = Math.max(1, Math.ceil((restants * 5) / 60));
	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex items-center gap-cladd-2xs p-cladd-2xs"
		>
			<span
				aria-hidden
				className="flex size-vignette-sm shrink-0 items-center justify-center rounded-cladd-sm bg-cladd-primary/10 text-cladd-primary"
			>
				<PartyPopperIcon size={22} />
			</span>
			<div className="min-w-0">
				<p className="text-cladd-xs font-semibold">
					{restants} produit{pluriel(restants)} à valider, environ {minutes} minute
					{pluriel(minutes)}.
				</p>
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					Nous avons déjà classé tout le reste. Ce qui est ici, c&rsquo;est ce dont nous doutons,
					plus la viande et le poisson — qui passent toujours devant vous.
				</p>
			</div>
		</Surface>
	);
}
