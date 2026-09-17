import { useState } from 'react';
import { BoutonPrincipal, Lien } from '../../ui';
import { Surface, Chip } from '@cladd-ui/react';
import { CheckIcon, MinusIcon } from 'lucide-react';
import { CE_QUI_EST_INCLUS, type ColonneOffre } from '../../lib/config/tarifs';

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

/**
 * La liste et la grille viennent de `src/lib/config/tarifs.ts`, et sont
 * réexportées pour la salle d'exposition qui les importe d'ici. Elles y ont
 * déménagé le jour où la page d'accueil a eu besoin des mêmes montants : trois
 * copies d'une grille de prix, ce sont trois occasions d'annoncer publiquement
 * un montant que le serveur ne facture pas.
 */
export { CE_QUI_EST_INCLUS, type ColonneOffre } from '../../lib/config/tarifs';

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
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
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
 * L'essai en cours, avec ses jours restants.
 *
 * IL SE DIT, IL NE SE DEVINE PAS. Un essai silencieux se termine par une
 * surprise : un matin, le dépôt refuse un fichier et le gérant croit à une
 * panne. Le compte à rebours est donc à l'écran, avec sa date de fin en clair —
 * « trente jours » ne se convertit pas en une date de tête.
 */
export function EssaiEnCours({ finLe }: { finLe: number }) {
	// L'heure est LUE UNE FOIS, au montage, et pas à chaque rendu. Un `Date.now()`
	// dans le corps d'un composant rend celui-ci non idempotent : deux rendus du
	// même état peuvent donner deux nombres de jours différents, et React refuse
	// cette hypothèse. `useState` avec une fonction d'initialisation fige la
	// lecture pour la durée de vie du composant, ce qui est exactement la
	// sémantique voulue.
	const [maintenant] = useState(() => Date.now());
	const jours = Math.max(0, Math.ceil((finLe - maintenant) / (24 * 60 * 60 * 1000)));
	const date = new Date(finLe).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<span className="flex flex-wrap items-center gap-cladd-3xs">
				<Chip color="brand" size="md">
					Essai en cours
				</Chip>
				<span className="text-cladd-sm font-bold">
					Il vous reste {jours} jour{jours > 1 ? 's' : ''}.
				</span>
			</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Jusqu&rsquo;au {date}, tout le produit vous est ouvert, sans carte bancaire : le dépôt de
				factures, le décompte au centime, la surveillance des échéances et les procédures
				envisageables.
			</span>
		</Surface>
	);
}

/**
 * L'ENCART D'ATTENTE, TANT QUE LE COMPTE MARCHAND N'EST PAS OUVERT — écrit en
 * QUATRE PARTIES, dans l'ordre que D0 impose.
 *
 * ⚠️ CE N'EST PAS UNE MISE EN FORME, C'EST LA DÉCISION D0. Un refus se dit
 * toujours dans cet ordre : ce que le produit peut faire tout de suite, et
 * cette ligne n'est JAMAIS vide ; ce qui manque, nommé ; ce qui lève le manque,
 * au CONSTAT et jamais à l'impératif ; ce que l'attente coûte, chiffré quand
 * c'est chiffrable et déclaré non chiffrable sinon.
 *
 * ⚠️ ET CE QUE L'ATTENTE COÛTE EST ICI DÉCLARÉ NON CHIFFRABLE, plutôt
 * qu'inventé. Tant qu'aucun prix n'est encaissé, l'attente ne coûte rien au
 * gérant ; écrire un montant ferait croire à une dette qui court.
 */
export function OuvertureEnCours() {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<span className="text-cladd-sm font-bold">
				Tout le produit vous est ouvert, sans carte bancaire.
			</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Déposez vos factures, lisez ce qui vous est dû, arrêtez un décompte : rien n&rsquo;est
				retenu derrière le paiement aujourd&rsquo;hui.
			</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Ce qui manque : notre compte marchand n&rsquo;est pas ouvert, donc aucun paiement en ligne
				ne peut être encaissé.
			</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Ce verrou se lève à l&rsquo;ouverture du compte marchand chez Paddle, qui attend nos
				conditions générales.
			</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Ce que l&rsquo;attente coûte : rien qui se chiffre. Aucune somme n&rsquo;est due tant que
				le paiement n&rsquo;est pas ouvert, et nous revenons vers vous avant toute facturation.
			</span>
			<span className="flex flex-wrap gap-cladd-3xs pt-cladd-3xs">
				<BoutonPrincipal as={Lien} to="/app/import-factures">
					Déposer mes factures
				</BoutonPrincipal>
			</span>
		</Surface>
	);
}
