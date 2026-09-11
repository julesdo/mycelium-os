import { Chip, Surface } from '@cladd-ui/react';
import { CheckIcon, LoaderCircleIcon, XIcon } from 'lucide-react';
import { cn } from './cn';
import { dateCourte, pluriel } from './format';

/**
 * LE BILAN D'UN DÉPÔT — ce qui est entré, et ce qui ne l'est pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI EST ÉCARTÉ NE SE REPLIE JAMAIS DERRIÈRE UN GESTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La règle du produit est écrite : « un import qui annonce 198 factures sans
 * mentionner les deux lignes écartées ment par omission, et l'omission porte
 * sur l'argent qu'on ne réclamera pas ».
 *
 * La version précédente la respectait en empilant jusqu'à SEPT paragraphes par
 * dépôt — factures créées, règlements, débiteurs, doublons, hors périmètre,
 * orphelins, puis la liste des lignes illisibles une par une. Sur un téléphone,
 * trois imports faisaient un mur de texte, et le mur est la façon la plus sûre
 * de ne PAS être lu. Une règle respectée dans la lettre et perdue dans les faits.
 *
 * Le compromis tenu ici :
 *
 *   · LES NOMBRES sont toujours à l'écran, sur une seule ligne de résumé —
 *     « 198 factures · 2 illisibles ». Rien de chiffré n'est caché, jamais.
 *   · LES RAISONS ligne à ligne se déplient. Elles ne servent qu'à celui qui
 *     va corriger son fichier, et il le fait au moment où il ouvre le détail.
 *
 * ⚠️ ET LE DÉPLIANT S'OUVRE DE LUI-MÊME QUAND QUELQUE CHOSE A ÉTÉ ÉCARTÉ. Un
 * détail replié qu'il faut penser à ouvrir est un détail qu'on ne lit pas. Le
 * geste n'est demandé que pour le REFERMER, ce qui est l'inverse du défaut.
 */

export interface BilanDepotAffiche {
	readonly facturesCreees: number;
	readonly reglementsCrees: number;
	readonly debiteursCrees: number;
	readonly facturesDejaConnues: number;
	readonly horsPerimetre: number;
	readonly reglementsOrphelins: number;
	readonly ignoreesTotal: number;
	readonly ignorees: readonly { readonly texte: string; readonly raison: string }[];
}

export interface DepotAffiche {
	readonly id: string;
	readonly filename: string;
	readonly statut: 'EN_COURS' | 'TERMINE' | 'ECHOUE' | string;
	readonly etape?: string;
	readonly erreur?: string;
	readonly bilan?: BilanDepotAffiche;
	/** Horodatage en millisecondes. */
	readonly deposeLe: number;
}

/** L'état du dépôt, en une puce. */
function Etat({ statut }: { statut: DepotAffiche['statut'] }) {
	if (statut === 'TERMINE') {
		return (
			<Chip size="md" color="green">
				<CheckIcon />
				Lu
			</Chip>
		);
	}
	if (statut === 'ECHOUE') {
		return (
			<Chip size="md" color="red">
				<XIcon />
				Échec
			</Chip>
		);
	}
	return (
		<Chip size="md" color="neutral">
			<LoaderCircleIcon className="animate-spin" />
			En cours
		</Chip>
	);
}

/**
 * Le résumé chiffré, sur une ligne.
 *
 * Les parts nulles ne s'écrivent pas : « 0 règlement » occupe la même place
 * qu'une information et n'en est pas une. Ce qui a été ÉCARTÉ, en revanche,
 * s'écrit toujours dès que le compte n'est pas nul.
 */
function resume(bilan: BilanDepotAffiche): string {
	const parts: string[] = [];
	if (bilan.facturesCreees > 0) {
		parts.push(`${bilan.facturesCreees} facture${pluriel(bilan.facturesCreees)}`);
	}
	if (bilan.reglementsCrees > 0) {
		parts.push(`${bilan.reglementsCrees} règlement${pluriel(bilan.reglementsCrees)}`);
	}
	if (bilan.debiteursCrees > 0) {
		parts.push(`${bilan.debiteursCrees} débiteur${pluriel(bilan.debiteursCrees)}`);
	}
	if (bilan.facturesDejaConnues > 0) {
		parts.push(`${bilan.facturesDejaConnues} déjà connue${pluriel(bilan.facturesDejaConnues)}`);
	}
	if (parts.length === 0) parts.push('rien de nouveau');
	return parts.join(' · ');
}

export function BilanImport({ depot, className }: { depot: DepotAffiche; className?: string }) {
	const bilan = depot.bilan;

	/**
	 * ⚠️ TROIS COMPTES DIFFÉRENTS, ET UN SEUL EST UNE ANOMALIE.
	 *
	 *   · `ignoreesTotal` — des lignes que le logiciel n'a pas su lire. C'est de
	 *     l'argent potentiellement perdu : ça doit crever les yeux.
	 *   · `reglementsOrphelins` — des règlements sans facture connue. L'import
	 *     est peut-être partiel, donc c'est un signal, pas une erreur.
	 *   · `horsPerimetre` — des écritures de TVA ou de trésorerie, écartées à
	 *     bon droit. Ce n'est PAS une anomalie, et le compter avec les deux
	 *     autres ferait paraître défaillant un import parfaitement réussi.
	 */
	const aDesEcarts =
		bilan !== undefined && (bilan.ignoreesTotal > 0 || bilan.reglementsOrphelins > 0);

	return (
		<Surface
			variant="transparent"
			outline={false}
			className={cn('verre-carte rounded-cladd-xl', className)}
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<div className="flex items-center justify-between gap-cladd-3xs">
				<span className="min-w-0 flex-1 truncate text-cladd-xs font-semibold">
					{depot.filename}
				</span>
				<Etat statut={depot.statut} />
			</div>

			{/* L'étape reste affichée après coup : un écran qui se vide à la fin
			    laisse croire qu'il ne s'est rien passé. */}
			{depot.etape ? <p className="text-cladd-2xs text-cladd-fg-soft">{depot.etape}</p> : null}

			{depot.erreur ? <p className="text-cladd-2xs text-cladd-fg">{depot.erreur}</p> : null}

			{bilan ? (
				<p className="text-cladd-2xs text-cladd-fg-soft">
					{resume(bilan)}
					{bilan.ignoreesTotal > 0 ? (
						// Écrit en clair, dans le ton du texte courant et non en gris
						// pâle : c'est la seule part du résumé qui coûte de l'argent.
						<span className="font-semibold text-cladd-fg">
							{' · '}
							{bilan.ignoreesTotal} illisible{pluriel(bilan.ignoreesTotal)}
						</span>
					) : null}
				</p>
			) : null}

			{/*
			  Le détail. `open` par défaut dès qu'il y a un écart : un dépliant
			  qu'il faut penser à ouvrir est un dépliant qu'on ne lit pas. Le geste
			  n'est demandé que pour le REFERMER.
			*/}
			{bilan && aDesEcarts ? (
				<details open className="flex flex-col gap-1.5">
					<summary className="cursor-pointer text-cladd-2xs font-medium text-cladd-primary">
						Ce qui n’est pas entré
					</summary>
					<div className="mt-1.5 flex flex-col gap-1 text-cladd-2xs text-cladd-fg-soft">
						{bilan.reglementsOrphelins > 0 ? (
							<p>
								{bilan.reglementsOrphelins} règlement{pluriel(bilan.reglementsOrphelins)} sans
								facture connue : l’import est peut-être partiel.
							</p>
						) : null}
						{bilan.ignorees.map((ligne) => (
							<p key={ligne.texte}>· {ligne.raison}</p>
						))}
					</div>
				</details>
			) : null}

			{/* Le hors-périmètre est dit à part, en gris, et sans dépliant : c'est
			    un import qui a bien travaillé, pas un défaut à corriger. */}
			{bilan && bilan.horsPerimetre > 0 ? (
				<p className="text-cladd-3xs text-cladd-fg-softest">
					{bilan.horsPerimetre} écriture{pluriel(bilan.horsPerimetre)} hors périmètre (TVA,
					trésorerie) — écartée{pluriel(bilan.horsPerimetre)} à bon droit.
				</p>
			) : null}

			<p className="text-cladd-3xs text-cladd-fg-softest">
				Déposé le {dateCourte(new Date(depot.deposeLe).toISOString().slice(0, 10))}
			</p>
		</Surface>
	);
}
