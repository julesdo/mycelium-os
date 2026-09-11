import { useState } from 'react';
import { Button, Surface } from '@cladd-ui/react';
import { CheckIcon, CopyIcon, InfoIcon, LockIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LES RELANCES — module 3.1.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RIEN NE PART D'ICI, ET L'ÉCRAN LE DIT AVANT TOUT LE RESTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Les relances sont des brouillons générés dans la boîte du client. C'est lui
 * qui envoie, depuis sa propre adresse, sous sa propre signature. Letikette
 * n'apparaît à aucun moment dans la chaîne. »
 *
 * Ce n'est pas une précaution de rédaction : le recouvrement amiable pour le
 * compte d'autrui est une activité encadrée, et ce produit ne l'exerce pas.
 * La mention est donc EN TÊTE, pas en bas de page — un gérant qui croirait le
 * logiciel capable d'envoyer attendrait un effet qui ne viendra jamais, et
 * n'enverrait rien lui-même.
 *
 * Il n'y a donc AUCUN bouton « envoyer ». Un bouton « copier », et le texte
 * s'en va de la messagerie du créancier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN NIVEAU INDISPONIBLE EST MONTRÉ, PAS MASQUÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La mise en demeure ne peut pas être composée : ses mentions obligatoires ne
 * sont pas au référentiel. La masquer laisserait croire que le produit ne sait
 * pas faire ; la montrer verrouillée, avec son motif, dit la vérité — il sait
 * ce qu'il lui manque, et il refuse d'inventer.
 *
 * C'est la même règle que les procédures indisponibles : « un écran qui
 * masquerait L.126 laisserait croire qu'elle n'existe pas ».
 */

export interface NiveauAffiche {
	readonly niveau: number;
	readonly nom: string;
	readonly intention: string;
	readonly disponible: boolean;
	/** Le brouillon, quand il existe. */
	readonly objet?: string;
	readonly corps?: string;
	/** Pourquoi il n'y en a pas. Un constat, jamais une consigne. */
	readonly constat?: string;
	readonly blocages?: readonly string[];
}

export function Relances({ niveaux }: { niveaux: readonly NiveauAffiche[] }) {
	const premierDisponible = niveaux.find((n) => n.disponible)?.niveau ?? null;
	const [ouvert, setOuvert] = useState<number | null>(premierDisponible);

	return (
		<div className="flex flex-col gap-cladd-3xs">
			{/* ⚠️ EN TÊTE, PAS EN BAS DE PAGE. Voir l'en-tête du fichier. */}
			<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
				Ces textes partent de votre messagerie, sous votre signature. Ce logiciel n’envoie rien et
				n’apparaît nulle part dans l’échange.
			</p>

			{niveaux.map((niveau) => (
				<Surface
					key={niveau.niveau}
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
						<span className="flex items-center gap-1.5 text-cladd-sm font-semibold">
							{!niveau.disponible ? (
								<LockIcon className="size-3.5 shrink-0 text-cladd-fg-softest" aria-hidden />
							) : null}
							{niveau.niveau}. {niveau.nom}
						</span>
						{niveau.disponible ? (
							<Button
								variant="transparent"
								outline={false}
								hoverable={false}
								rounded
								size="lg"
								onClick={() => setOuvert(ouvert === niveau.niveau ? null : niveau.niveau)}
								className="verre verre-bouton font-medium transition-transform duration-150 active:scale-[0.97]"
							>
								{ouvert === niveau.niveau ? 'Masquer' : 'Voir le texte'}
							</Button>
						) : null}
					</div>

					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{niveau.intention}</p>

					{/* Le motif du blocage, NOMMÉ. « Indisponible » sans raison laisse
					    croire à une limite du produit, alors qu'il s'agit d'une valeur
					    juridique qui manque. */}
					{!niveau.disponible && niveau.constat ? (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{niveau.constat}</p>
					) : null}
					{(niveau.blocages ?? []).map((blocage) => (
						<p key={blocage} className="text-cladd-2xs text-cladd-fg-softest">
							{blocage}
						</p>
					))}

					{niveau.disponible && ouvert === niveau.niveau && niveau.corps ? (
						<Brouillon objet={niveau.objet ?? ''} corps={niveau.corps} />
					) : null}
				</Surface>
			))}
		</div>
	);
}

/**
 * Le texte, et le seul geste qu'on propose dessus : le copier.
 *
 * ⚠️ L'OBJET SE COPIE SÉPARÉMENT DU CORPS. Un message électronique a deux
 * champs ; coller l'objet en tête du corps fait un e-mail dont la première
 * ligne répète le sujet, et le créancier corrige à la main — ce qui était
 * précisément ce qu'on voulait lui épargner.
 */
function Brouillon({ objet, corps }: { objet: string; corps: string }) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<LigneCopiable etiquette="Objet" valeur={objet} />
			<LigneCopiable etiquette="Message" valeur={corps} multiligne />
		</div>
	);
}

function LigneCopiable({
	etiquette,
	valeur,
	multiligne = false
}: {
	etiquette: string;
	valeur: string;
	multiligne?: boolean;
}) {
	const [copie, setCopie] = useState(false);

	async function copier() {
		try {
			await navigator.clipboard.writeText(valeur);
			setCopie(true);
			// Le retour à l'état initial se fait au bout de deux secondes : un
			// bouton qui reste « copié » indéfiniment ment au deuxième usage.
			setTimeout(() => setCopie(false), 2000);
		} catch {
			// Le presse-papiers peut être refusé — contexte non sécurisé, permission
			// retirée. Le texte reste sélectionnable à la main : on ne casse rien, et
			// on ne prétend pas avoir copié.
			setCopie(false);
		}
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between gap-cladd-3xs">
				<span className="text-cladd-2xs text-cladd-fg-softest">{etiquette}</span>
				<Button
					variant="transparent"
					outline={false}
					hoverable={false}
					rounded
					size="md"
					onClick={() => void copier()}
					aria-label={`Copier ${etiquette.toLowerCase()}`}
					className="verre verre-bouton min-w-12 justify-center transition-transform duration-150 active:scale-[0.97]"
				>
					{copie ? (
						<CheckIcon className="size-3.5" aria-hidden />
					) : (
						<CopyIcon className="size-3.5" aria-hidden />
					)}
				</Button>
			</div>
			<p
				className={cn(
					'cladd-surface-cut rounded-cladd-lg p-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft',
					// Le corps garde ses retours à la ligne : c'est un texte destiné à
					// être collé tel quel, pas un paragraphe à refluer.
					multiligne && 'whitespace-pre-wrap'
				)}
			>
				{valeur}
			</p>
		</div>
	);
}
