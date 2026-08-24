import { Surface, Button, Chip } from '@cladd-ui/react';
import { CheckIcon, PencilIcon, SparklesIcon } from 'lucide-react';
import { Illustration } from './illustration';
import { Verdict } from './verdict';
import { euros, pluriel, FAMILLES, type Famille } from './format';
import { MOTIFS } from './egalim';

/**
 * La carte d'un produit à confirmer — l'écran où le gérant passe son temps.
 *
 * TOUT ce qui suit découle d'une seule mesure : la file d'un premier dépôt
 * compte entre soixante et cent produits. À trois gestes par produit, c'est
 * une soirée ; à un geste, c'est dix minutes. La carte est donc dessinée
 * autour du cas majoritaire — le logiciel a raison — et ce cas coûte UN tap.
 *
 * Ce qui en découle, dans l'ordre :
 *
 *   1. La proposition du classificateur est déjà là, écrite, avec sa raison.
 *      Le gérant valide ou corrige ; il ne saisit jamais depuis une page
 *      blanche. Un écran qui demanderait « quelle famille ? » sur cent
 *      produits serait un formulaire, pas un logiciel.
 *   2. Le montant en jeu est le deuxième plus gros élément de la carte, après
 *      l'illustration. C'est lui qui dit s'il vaut la peine de réfléchir : à
 *      12 €, on valide ; à 4 000 €, on ouvre la facture.
 *   3. Confirmer est un bouton pleine largeur. Corriger est à côté, plus
 *      discret, mais jamais caché — c'est la voie qui engage la responsabilité
 *      du gérant, elle doit rester à un doigt.
 *   4. La raison invoquée par le classificateur est visible sans être dépliée.
 *      Une justification qu'il faut aller chercher n'est pas lue, et une
 *      confirmation non éclairée ne vaut rien devant un contrôle.
 */

export type Proposition = {
	famille: Famille;
	mentions: readonly string[];
	estAlimentaire: boolean;
	justification: string;
	confiance: number;
};

export function CarteProduit({
	libelle,
	occurrences,
	montant,
	motif,
	proposition,
	enCours,
	onConfirmer,
	onCorriger
}: {
	libelle: string;
	occurrences: number;
	montant: number;
	motif: string;
	proposition: Proposition | null;
	enCours?: boolean;
	onConfirmer: () => void;
	onCorriger: () => void;
}) {
	const explication = MOTIFS[motif];

	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
		>
			<div className="flex items-start gap-cladd-2xs">
				<Illustration
					libelle={libelle}
					famille={proposition?.famille}
					estAlimentaire={proposition?.estAlimentaire}
					taille="md"
				/>

				<div className="flex min-w-0 flex-1 flex-col gap-1">
					{/* Le libellé source, tel qu'il est imprimé sur la facture. On ne
					    le rhabille pas : c'est la chaîne qui sera opposée en contrôle,
					    et deux écritures différentes du même produit doivent rester
					    visiblement différentes. */}
					<span className="text-cladd-sm leading-tight font-semibold break-words">{libelle}</span>
					<span className="text-cladd-2xs text-cladd-fg-softer">
						{occurrences} ligne{pluriel(occurrences)} de facture
						{proposition ? ` · ${FAMILLES[proposition.famille]}` : ''}
					</span>
				</div>

				<div className="flex shrink-0 flex-col items-end gap-1">
					<span className="text-letikette-chiffre leading-none font-bold tracking-tight tabular-nums">
						{euros(montant)}
					</span>
					<span className="text-cladd-3xs text-cladd-fg-softest">en jeu</span>
				</div>
			</div>

			{proposition ? (
				<div className="flex flex-col gap-cladd-3xs">
					<Verdict mentions={proposition.mentions} estAlimentaire={proposition.estAlimentaire} />
					<p className="flex items-start gap-2 text-cladd-2xs leading-snug text-cladd-fg-soft">
						<SparklesIcon size={14} className="mt-0.5 shrink-0 text-cladd-fg-softest" />
						<span>{proposition.justification}</span>
					</p>
				</div>
			) : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					{explication?.explication ??
						"Nous n'avons pas su classer ce produit. Sans votre réponse, il ne compte dans aucun taux."}
				</p>
			)}

			{/* Le motif est en bas, pas en haut : il explique POURQUOI la question
			    est posée, ce qui n'intéresse le gérant qu'en cas de surprise. */}
			{explication ? (
				<div className="flex items-center gap-cladd-3xs">
					<Chip size="sm" color="neutral">
						{explication.court}
					</Chip>
				</div>
			) : null}

			<div className="flex flex-wrap gap-cladd-3xs">
				{proposition ? (
					<>
						<Button
							color="brand"
							variant="solid-fill"
							className="min-w-0 flex-1"
							loading={enCours}
							readOnly={enCours}
							onClick={onConfirmer}
						>
							<CheckIcon />
							C&rsquo;est bien ça
						</Button>
						<Button className="shrink-0" onClick={onCorriger} disabled={enCours}>
							<PencilIcon />
							Corriger
						</Button>
					</>
				) : (
					<Button
						color="brand"
						variant="solid-fill"
						className="min-w-0 flex-1"
						onClick={onCorriger}
						disabled={enCours}
					>
						<PencilIcon />
						Classer ce produit
					</Button>
				)}
			</div>
		</Surface>
	);
}
