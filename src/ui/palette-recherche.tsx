import type { KeyboardEvent, ReactNode } from 'react';
import {
	Button,
	Chip,
	List,
	ListButton,
	ListTitle,
	Popup,
	PopupContent,
	SearchField,
	SectionTitle,
	Spinner,
	Surface
} from '@cladd-ui/react';
import { FileTextIcon, GavelIcon, UploadIcon, UsersIcon } from 'lucide-react';
import { dateCourte, eurosCentimes } from './format';
import { sirenLisible } from './recherche-registre';

/**
 * LA PALETTE DE RECHERCHE : débiteurs, factures, procédures (spec § 7).
 *
 * ⚠️ ELLE N'INTERROGE RIEN ELLE-MÊME. Tout entre par les props : `src/ui` ne
 * connaît pas Convex, et c'est ce qui permet à la salle d'exposition de la
 * rendre sans backend. La barre la branche (`src/app/barre.tsx`).
 *
 * Ce qu'elle tranche, et pourquoi :
 *
 *   · LE CHAMP RESTE EN HAUT, « Annuler » à sa droite, à toutes les largeurs.
 *     Une palette centrée sauterait à chaque frappe, puisque sa hauteur suit
 *     les résultats ; et une tablette n'a pas de touche Échap.
 *   · UNE CARTE PAR FAMILLE, dans un ordre fixe, sans score entre familles :
 *     comparer un débiteur et une facture demanderait un arbitrage qu'on ne
 *     saurait pas justifier. Une famille vide ne s'affiche pas.
 *   · UN SEUL CHIFFRE PAR FAMILLE, dans la puce. Trois rangées et « Voir tout »
 *     disent déjà qu'il y en a plus ; « 3 sur 17 » le dirait une troisième fois.
 *   · LE DERNIER RÉSULTAT RESTE À L'ÉCRAN pendant la lecture suivante, et le
 *     travail se voit dans le champ. « Rien pour… » n'apparaît que lorsque la
 *     réponse au terme COURANT est arrivée vide : sinon il clignoterait à
 *     chaque lettre.
 *   · AUCUNE COULEUR DE SEUIL sur les montants : le vert, l'ambre et le rouge
 *     restent réservés.
 */

export type FamilleRecherche = 'DEBITEURS' | 'FACTURES' | 'PROCEDURES';

/** Ce qu'une famille montre repliée. Le serveur lit la même borne. */
export const PREMIERS_PAR_FAMILLE = 3;

export interface DebiteurTrouveAffiche {
	readonly id: string;
	readonly denomination: string;
	readonly siren?: string;
	/** Ce qui reste dû, en centimes. */
	readonly encours: bigint;
}

export interface FactureTrouveeAffichee {
	readonly id: string;
	readonly reference: string;
	readonly debiteurId: string;
	readonly debiteur: string;
	readonly dateEcheance?: string;
	readonly resteDu: bigint;
}

export interface ProcedureTrouveeAffichee {
	readonly creanceId: string;
	readonly procedure: string;
	readonly debiteur: string;
	readonly prochaineEcheance: string | null;
}

export interface FamilleAffichee<T> {
	/** Vrai jusqu'à la borne ; un plancher quand `borne` vaut vrai. */
	readonly total: number;
	readonly borne: boolean;
	readonly premiers: readonly T[];
}

export interface ResultatRechercheAffiche {
	readonly debiteurs: FamilleAffichee<DebiteurTrouveAffiche>;
	readonly factures: FamilleAffichee<FactureTrouveeAffichee>;
	readonly procedures: FamilleAffichee<ProcedureTrouveeAffichee>;
}

/** Un débiteur dont quelque chose a bougé, et ce qui a bougé. */
export interface RecentAffiche {
	readonly id: string;
	readonly denomination: string;
	readonly motif: string;
}

export type DestinationRecherche =
	| { readonly genre: 'DEBITEUR'; readonly debiteurId: string }
	| { readonly genre: 'PROCEDURE'; readonly creanceId: string }
	| { readonly genre: 'IMPORT' };

/** Un événement du flux, tel que la palette le lit. */
export interface EvenementBouge {
	readonly type: string;
	readonly reference: string;
	readonly cible?: { readonly genre: 'DEBITEUR' | 'CREANCE'; readonly id: string };
}

const MOTIF_EVENEMENT: Readonly<Record<string, string>> = {
	FACTURE_ECHUE: 'Facture échue',
	CREANCE_MURE: 'Créance mûre',
	ECHEANCE_PROCEDURE: 'Échéance de procédure',
	DEBITEUR_DEGRADE: 'Situation dégradée',
	PRESCRIPTION_PROCHE: 'Prescription proche',
	HABITUDE_ROMPUE: 'Habitude rompue'
};

/**
 * LES DÉBITEURS QUI ONT BOUGÉ, dans l'ordre du flux, sans doublon, trois au plus.
 *
 * ⚠️ PAS D'HISTORIQUE DE RECHERCHE, ET DONC RIEN À EFFACER. Un historique local
 * survit à la déconnexion : sur une tablette partagée, le suivant lirait les
 * noms des clients du précédent. Le flux, lui, est ce que le logiciel a vu.
 *
 * Le pied dit l'événement et sa référence. Le flux ne porte pas de date : on
 * n'en écrit pas.
 */
export function bougesDuFlux(
	evenements: readonly EvenementBouge[]
): readonly { readonly id: string; readonly motif: string }[] {
	const vus = new Set<string>();
	const bouges: { id: string; motif: string }[] = [];
	for (const evenement of evenements) {
		const cible = evenement.cible;
		if (cible === undefined || cible.genre !== 'DEBITEUR' || vus.has(cible.id)) continue;
		vus.add(cible.id);
		bouges.push({
			id: cible.id,
			motif: `${MOTIF_EVENEMENT[evenement.type] ?? evenement.type} · ${evenement.reference}`
		});
		if (bouges.length === PREMIERS_PAR_FAMILLE) break;
	}
	return bouges;
}

interface Rangee {
	readonly cle: string;
	readonly icone: ReactNode;
	readonly titre: string;
	readonly pied?: string;
	readonly montant?: bigint;
	readonly destination: DestinationRecherche;
}

interface FamilleRendue {
	readonly famille: FamilleRecherche;
	readonly titre: string;
	readonly total: number;
	readonly borne: boolean;
	readonly rangees: readonly Rangee[];
}

/** Les trois familles, dans l'ordre fixe, traduites en rangées. */
function famillesRendues(resultat: ResultatRechercheAffiche): readonly FamilleRendue[] {
	return [
		{
			famille: 'DEBITEURS',
			titre: 'Débiteurs',
			total: resultat.debiteurs.total,
			borne: resultat.debiteurs.borne,
			rangees: resultat.debiteurs.premiers.map((d) => ({
				cle: d.id,
				icone: <UsersIcon size={18} />,
				titre: d.denomination,
				// Ce qui distingue deux « Boulangerie Martin ».
				pied: d.siren === undefined ? undefined : `SIREN ${sirenLisible(d.siren)}`,
				montant: d.encours,
				destination: { genre: 'DEBITEUR', debiteurId: d.id }
			}))
		},
		{
			famille: 'FACTURES',
			titre: 'Factures',
			total: resultat.factures.total,
			borne: resultat.factures.borne,
			rangees: resultat.factures.premiers.map((f) => ({
				cle: f.id,
				icone: <FileTextIcon size={18} />,
				titre: f.reference,
				pied:
					f.dateEcheance === undefined
						? f.debiteur
						: `${f.debiteur} · échéance ${dateCourte(f.dateEcheance)}`,
				montant: f.resteDu,
				// Une facture n'a pas d'écran : c'est le volet de son débiteur qui la porte.
				destination: { genre: 'DEBITEUR', debiteurId: f.debiteurId }
			}))
		},
		{
			famille: 'PROCEDURES',
			titre: 'Procédures',
			total: resultat.procedures.total,
			borne: resultat.procedures.borne,
			rangees: resultat.procedures.premiers.map((p) => ({
				cle: p.creanceId,
				icone: <GavelIcon size={18} />,
				titre: p.procedure,
				pied:
					p.prochaineEcheance === null
						? p.debiteur
						: `${p.debiteur} · échéance ${dateCourte(p.prochaineEcheance)}`,
				destination: { genre: 'PROCEDURE', creanceId: p.creanceId }
			}))
		}
	];
}

function LigneTrouvee({
	rangee,
	onOuvrir
}: {
	rangee: Rangee;
	onOuvrir: (destination: DestinationRecherche) => void;
}) {
	return (
		<ListButton
			icon={rangee.icone}
			footer={
				rangee.pied === undefined ? undefined : (
					<span className="block truncate">{rangee.pied}</span>
				)
			}
			after={
				rangee.montant === undefined ? undefined : (
					<span className="text-cladd-xs whitespace-nowrap tabular-nums">
						{eurosCentimes(rangee.montant)}
					</span>
				)
			}
			className="verre-bouton"
			hoverable={false}
			onClick={() => onOuvrir(rangee.destination)}
		>
			<span className="truncate">{rangee.titre}</span>
		</ListButton>
	);
}

export function PaletteRecherche({
	ouverte,
	terme,
	onTerme,
	onFermer,
	resultat,
	aJour,
	recents,
	etablissementVide,
	deplie,
	onDeplier,
	onOuvrir
}: {
	ouverte: boolean;
	terme: string;
	onTerme: (terme: string) => void;
	onFermer: () => void;
	/** La dernière réponse reçue, gardée pendant la lecture suivante ; `null` avant la première. */
	resultat: ResultatRechercheAffiche | null;
	/** Vrai quand la réponse affichée est celle du terme courant. */
	aJour: boolean;
	recents: readonly RecentAffiche[];
	/** Aucun débiteur dans l'établissement : le vide montre le chemin de l'import. */
	etablissementVide: boolean;
	/** La famille dépliée par « Voir tout », ou `null`. */
	deplie: FamilleRecherche | null;
	onDeplier: (famille: FamilleRecherche | null) => void;
	onOuvrir: (destination: DestinationRecherche) => void;
}) {
	const cherche = terme.trim();
	const rendues =
		cherche === '' || resultat === null
			? []
			: famillesRendues(resultat).filter((famille) => famille.total > 0);

	/** Les rangées réellement à l'écran, dans l'ordre : Entrée ouvre la première. */
	const visibles: readonly DestinationRecherche[] =
		cherche === ''
			? etablissementVide
				? [{ genre: 'IMPORT' }]
				: recents.map((r) => ({ genre: 'DEBITEUR', debiteurId: r.id }))
			: rendues.flatMap((famille) =>
					deplie !== null && deplie !== famille.famille
						? []
						: famille.rangees
								.slice(0, deplie === famille.famille ? undefined : PREMIERS_PAR_FAMILLE)
								.map((r) => r.destination)
				);

	const auClavier = (evenement: KeyboardEvent<HTMLInputElement>) => {
		if (evenement.key !== 'Enter') return;
		evenement.preventDefault();
		const premiere = visibles[0];
		if (premiere !== undefined) onOuvrir(premiere);
	};

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			aria-label="Rechercher un débiteur, une facture ou une procédure"
			closeButton={false}
			header={false}
			// Ancrée en haut plutôt que centrée : sa hauteur suit les résultats, et
			// une colonne centrée sauterait à chaque lettre. Pleine largeur sous
			// 1024 px, où le clavier mange déjà la moitié de l'écran.
			wrapClassName="self-start"
			contentClassName="justify-start max-lg:max-w-none"
		>
			{/*
			  L'EN-TÊTE COLLE EN HAUT : quand « Voir tout » déplie cinquante rangées,
			  le champ et « Annuler » restent à portée de pouce.
			*/}
			<Surface
				variant="transparent"
				outline={false}
				className="verre-dense sticky top-0 z-20 rounded-full"
				contentClassName="flex items-center gap-cladd-3xs p-1"
			>
				<SearchField
					size="md"
					// Monté dans le même toucher que l'ouverture : Safari iOS n'ouvre le
					// clavier que pendant le geste, jamais après une transition.
					autoFocus
					enterKeyHint="search"
					value={terme}
					onChange={(valeur) => onTerme(valeur)}
					onKeyDown={auClavier}
					placeholder="Durand, FA-2026-0311…"
					aria-label="Nom, numéro de facture ou SIREN"
					className="min-w-0 flex-1"
					suffix={aJour ? null : <Spinner size="xs" className="mr-2" />}
				/>
				<Button size="md" variant="transparent" outline={false} rounded onClick={onFermer}>
					Annuler
				</Button>
			</Surface>

			{cherche === '' ? (
				etablissementVide ? (
					<PopupContent>
						<List>
							<ListButton
								icon={<UploadIcon size={18} />}
								className="verre-bouton"
								hoverable={false}
								onClick={() => onOuvrir({ genre: 'IMPORT' })}
							>
								Importer des factures
							</ListButton>
						</List>
					</PopupContent>
				) : recents.length > 0 ? (
					<PopupContent>
						<List>
							<ListTitle>Ce qui a bougé</ListTitle>
							{recents.map((recent) => (
								<LigneTrouvee
									key={recent.id}
									rangee={{
										cle: recent.id,
										icone: <UsersIcon size={18} />,
										titre: recent.denomination,
										pied: recent.motif,
										destination: { genre: 'DEBITEUR', debiteurId: recent.id }
									}}
									onOuvrir={onOuvrir}
								/>
							))}
						</List>
					</PopupContent>
				) : null
			) : rendues.length === 0 ? (
				aJour && resultat !== null ? (
					<PopupContent>
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							Rien pour « {cherche} » dans les débiteurs, les factures et les procédures.
						</p>
					</PopupContent>
				) : null
			) : (
				rendues.map((famille) => {
					const repliee = deplie !== null && deplie !== famille.famille;
					const depliee = deplie === famille.famille;
					const deborde = famille.total > PREMIERS_PAR_FAMILLE;
					return (
						<PopupContent key={famille.famille}>
							<SectionTitle>
								<span>{famille.titre}</span>
								<Chip size="md">{famille.borne ? `${famille.total} et plus` : famille.total}</Chip>
								{repliee ? (
									<Button
										size="md"
										variant="transparent"
										outline={false}
										rounded
										className="ml-auto normal-case"
										onClick={() => onDeplier(deborde ? famille.famille : null)}
									>
										Afficher
									</Button>
								) : depliee ? (
									<Button
										size="md"
										variant="transparent"
										outline={false}
										rounded
										className="ml-auto normal-case"
										onClick={() => onDeplier(null)}
									>
										Réduire
									</Button>
								) : deborde ? (
									<Button
										size="md"
										variant="transparent"
										outline={false}
										rounded
										className="ml-auto normal-case"
										onClick={() => onDeplier(famille.famille)}
									>
										Voir tout
									</Button>
								) : null}
							</SectionTitle>
							{repliee ? null : (
								<List>
									{famille.rangees
										.slice(0, depliee ? undefined : PREMIERS_PAR_FAMILLE)
										.map((rangee) => (
											<LigneTrouvee key={rangee.cle} rangee={rangee} onOuvrir={onOuvrir} />
										))}
								</List>
							)}
						</PopupContent>
					);
				})
			)}
		</Popup>
	);
}
