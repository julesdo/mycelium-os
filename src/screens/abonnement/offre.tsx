import { Link } from '@tanstack/react-router';
import { Surface, Button, Chip } from '@cladd-ui/react';
import { CheckIcon, MinusIcon } from 'lucide-react';

/**
 * Les cartes d'offre, isolées de la route.
 *
 * POURQUOI ELLES NE VIVENT PAS DANS L'ÉCRAN. C'est l'interface la plus sensible
 * commercialement du produit, et l'écran qui la porte est derrière
 * l'authentification. Or la règle du projet est qu'un écran se REGARDE au
 * navigateur, aux quatre largeurs, avant d'être déclaré fini — et se connecter
 * pour cela suppose de saisir un mot de passe.
 *
 * Isolées ici, ces cartes se rendent dans la salle d'exposition avec des données
 * de démonstration, sans backend ni session. C'est exactement le motif déjà
 * employé pour les écrans de diagnostic et de correction.
 */

export type ColonneOffre = 'bilan' | 'abonnement';

/**
 * Ce que chaque offre contient.
 *
 * La liste est ÉCRITE UNE FOIS et les deux colonnes la traversent : deux listes
 * parallèles auraient fini par annoncer une fonctionnalité d'un côté et pas de
 * l'autre. Elle doit rester alignée sur `PLAN_FEATURES` dans `billing.ts`, qui
 * décide de ce qui est réellement ouvert.
 */
export const CE_QUI_EST_INCLUS = [
	{ libelle: 'Dépôt de factures, sans limite', bilan: true, abonnement: true },
	{ libelle: 'Lecture et classification ligne à ligne', bilan: true, abonnement: true },
	{ libelle: 'Les trois taux EGalim, justifiés', bilan: true, abonnement: true },
	{ libelle: 'Bilan PDF daté et signé', bilan: true, abonnement: true },
	{ libelle: 'Courriers de demande d’attestation', bilan: true, abonnement: true },
	{ libelle: 'Fichier de report pour « ma cantine »', bilan: false, abonnement: true },
	{ libelle: 'Suivi mensuel et rappels', bilan: false, abonnement: true }
] as const;

export function Offre({
	titre,
	prix,
	cadence,
	description,
	colonne,
	actif = false,
	recommande = false
}: {
	titre: string;
	prix: string;
	cadence: string;
	description: string;
	colonne: ColonneOffre;
	actif?: boolean;
	recommande?: boolean;
}) {
	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<span className="flex flex-wrap items-center gap-cladd-3xs">
				<span className="text-cladd-md font-bold">{titre}</span>
				{recommande ? (
					<Chip color="brand" size="sm">
						Recommandé
					</Chip>
				) : null}
				{actif ? (
					<Chip color="neutral" size="sm">
						En cours
					</Chip>
				) : null}
			</span>

			<span className="flex items-baseline gap-cladd-3xs">
				<span className="text-letikette-chiffre leading-none font-extrabold tabular-nums">
					{prix}
				</span>
				<span className="text-cladd-xs text-cladd-fg-softer">{cadence}</span>
			</span>

			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{description}</span>

			<ul className="flex flex-col gap-1 pt-cladd-3xs">
				{CE_QUI_EST_INCLUS.map((l) => {
					const inclus = l[colonne];
					return (
						<li key={l.libelle} className="flex items-start gap-cladd-3xs">
							<span
								className={
									inclus
										? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-cladd-primary/12 text-cladd-primary'
										: 'flex size-5 shrink-0 items-center justify-center rounded-full bg-cladd-surface-cut text-cladd-fg-softest'
								}
							>
								{inclus ? <CheckIcon size={12} /> : <MinusIcon size={12} />}
							</span>
							<span
								className={
									inclus
										? 'text-cladd-xs leading-snug'
										: 'text-cladd-xs leading-snug text-cladd-fg-softest'
								}
							>
								{l.libelle}
							</span>
						</li>
					);
				})}
			</ul>
		</Surface>
	);
}

/**
 * L'encart d'attente, tant que le compte marchand n'est pas ouvert.
 *
 * Il dit PRÉCISÉMENT pourquoi le paiement n'est pas encore disponible, plutôt
 * que « bientôt ». Un gérant à qui l'on donne la raison patiente ; un gérant à
 * qui l'on sert un slogan s'en va. Et il ne laisse pas la page sans issue : il
 * renvoie vers ce qu'il peut faire aujourd'hui, qui est tout le produit.
 */
export function OuvertureEnCours() {
	return (
		<Surface
			outline
			className="rounded-cladd-2xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<span className="text-cladd-sm font-bold">Le paiement en ligne ouvre bientôt.</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Notre compte marchand est en cours d&rsquo;ouverture. En attendant, le produit vous est
				ouvert sans limite et sans carte bancaire : déposez vos factures, mesurez vos taux, et nous
				reviendrons vers vous avant toute facturation.
			</span>
			<span className="flex flex-wrap gap-cladd-3xs pt-cladd-3xs">
				<Button as={Link} to="/app/factures" color="brand" variant="solid-fill">
					Déposer mes factures
				</Button>
			</span>
		</Surface>
	);
}
