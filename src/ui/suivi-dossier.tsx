import { useState } from 'react';
import { Chip, Input, SectionTitle, Segmented, SegmentedButton, Surface } from '@cladd-ui/react';
import {
	INTITULE_DU_CANAL,
	type AuteurDuFait,
	type FaitDeLaFrise
} from '../lib/verticales/recouvrement/frise';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { Champ, MessageErreur } from './cadre-auth';
import { dateCourte, eurosCentimes } from './format';

/**
 * CE QUI S'EST PASSÉ SUR CE DOSSIER, ET CE QU'ON Y NOTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE BLOC EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit n'avait aucune mémoire du travail humain : ni note, ni promesse de
 * paiement, ni appel consigné, ni rappel qu'on se pose à soi-même (audit du
 * 29/09/2026, F3). Le gérant tenait donc son carnet à côté — et une application
 * qu'on double d'un carnet n'est pas le lieu où le travail se fait.
 *
 * ⚠️ ET LE JOURNAL DE LA MACHINE SE LIT DANS LA MÊME COLONNE. Il existait en
 * base depuis des mois sans s'afficher nulle part. Ce que le logiciel a
 * constaté et ce que le gérant a noté racontent le dossier ENSEMBLE ; la
 * mention « Vous » / « Le logiciel » dit lequel est lequel, parce qu'ils n'ont
 * pas le même poids le jour où un tiers lit le dossier.
 *
 * ⚠️ AUCUNE ENTRÉE N'EN DÉDUIT DE DROIT. Une promesse de paiement n'est pas une
 * reconnaissance de dette, et cet écran ne le dira jamais : ce serait une
 * qualification juridique. Elle est notée parce qu'elle a une DATE, et qu'à
 * cette date on veut savoir si elle a été tenue.
 */

export type GenreDeNote = 'NOTE' | 'ECHANGE' | 'PROMESSE' | 'RAPPEL';
export type CanalDEchange = 'APPEL' | 'COURRIEL' | 'SMS' | 'COURRIER' | 'VISITE';

export interface NoteDuDossier {
	readonly _id: string;
	readonly genre: GenreDeNote;
	readonly texte: string;
	readonly canal?: CanalDEchange;
	readonly survenuLe?: string;
	readonly montantPromis?: bigint;
	readonly promisPourLe?: string;
	readonly issue?: 'TENUE' | 'NON_TENUE';
	readonly rappelLe?: string;
	readonly faitLe?: string;
	readonly ecritLe: number;
	/** Une promesse pas encore tranchée : ce qui est arrivé depuis. Un fait, pas un verdict. */
	readonly recuDepuis?: bigint;
}

/** Ce que le gérant a saisi dans le formulaire, avant de l'envoyer. */
export interface SaisieDeNote {
	readonly genre: GenreDeNote;
	readonly texte: string;
	readonly canal: CanalDEchange;
	readonly survenuLe: string;
	readonly montantPromisEuros: string;
	readonly promisPourLe: string;
	readonly rappelLe: string;
}

export interface SuiviDossierAffiche {
	readonly frise: readonly FaitDeLaFrise[];
	readonly notes: readonly NoteDuDossier[];
	readonly aujourdHui: string;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onNoter: (saisie: SaisieDeNote) => void;
	readonly onTrancherPromesse: (noteId: string, issue: 'TENUE' | 'NON_TENUE') => void;
	readonly onRappelFait: (noteId: string) => void;
	readonly onEffacer: (noteId: string) => void;
}

const GENRES: readonly { readonly cle: GenreDeNote; readonly libelle: string }[] = [
	{ cle: 'NOTE', libelle: 'Une note' },
	{ cle: 'ECHANGE', libelle: 'Un échange' },
	{ cle: 'PROMESSE', libelle: 'Une promesse' },
	{ cle: 'RAPPEL', libelle: 'Un rappel' }
];

const CANAUX: readonly CanalDEchange[] = ['APPEL', 'COURRIEL', 'SMS', 'COURRIER', 'VISITE'];

const INVITE: Record<GenreDeNote, string> = {
	NOTE: 'Ce que vous voulez retenir sur ce dossier.',
	ECHANGE: 'Ce qu’il vous a dit, et ce que vous avez répondu.',
	PROMESSE: 'Ce qu’il a promis, dans ses mots.',
	RAPPEL: 'Ce que vous voulez faire ce jour-là.'
};

/** Un auteur, dit comme on le dit. Jamais une couleur de seuil : ce n'est pas un verdict. */
const QUI: Record<AuteurDuFait, string> = { LOGICIEL: 'Le logiciel', VOUS: 'Vous' };

function quandLisible(quand: number): string {
	return dateCourte(new Date(quand).toISOString().slice(0, 10));
}

export function SuiviDuDossier({
	frise,
	notes,
	aujourdHui,
	enCours,
	erreur,
	onNoter,
	onTrancherPromesse,
	onRappelFait,
	onEffacer
}: SuiviDossierAffiche) {
	const [genre, setGenre] = useState<GenreDeNote>('NOTE');
	const [texte, setTexte] = useState('');
	const [canal, setCanal] = useState<CanalDEchange>('APPEL');
	const [survenuLe, setSurvenuLe] = useState(aujourdHui);
	const [montantPromisEuros, setMontantPromisEuros] = useState('');
	const [promisPourLe, setPromisPourLe] = useState('');
	const [rappelLe, setRappelLe] = useState('');

	/*
	  ⚠️ LES PROMESSES ET LES RAPPELS EN COURS PASSENT AVANT LA FRISE, et ce
	  n'est pas de la mise en page : ce sont les seules entrées qui ATTENDENT
	  quelque chose du gérant. Rangées dans l'ordre chronologique, elles
	  descendraient sous la ligne de flottaison à la troisième note.
	*/
	const promessesOuvertes = notes.filter((n) => n.genre === 'PROMESSE' && n.issue === undefined);
	const rappelsOuverts = notes.filter((n) => n.genre === 'RAPPEL' && n.faitLe === undefined);

	function envoyer() {
		onNoter({ genre, texte, canal, survenuLe, montantPromisEuros, promisPourLe, rappelLe });
		setTexte('');
		setMontantPromisEuros('');
	}

	return (
		<div className="flex flex-col gap-cladd-2xs">
			{promessesOuvertes.length > 0 || rappelsOuverts.length > 0 ? (
				<section className="flex flex-col gap-cladd-3xs">
					<SectionTitle>Ce qui attend une réponse de vous</SectionTitle>

					{promessesOuvertes.map((note) => (
						<Surface
							key={note._id}
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
						>
							<p className="text-cladd-sm font-semibold">
								{note.montantPromis === undefined
									? 'Il a promis de payer'
									: `Il a promis ${eurosCentimes(note.montantPromis)}`}
								{note.promisPourLe === undefined
									? ''
									: ` pour le ${dateCourte(note.promisPourLe)}`}
							</p>
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{note.texte}</p>
							{/*
							  ⚠️ CE QUI EST ARRIVÉ DEPUIS, ÉCRIT EN FAIT (08/10/2026). Le gérant
							  tranche, mais il ne devrait pas avoir à aller chercher sa banque pour
							  le faire : le logiciel voit les règlements, il les dit, sans dire
							  qu'ils sont CEUX qui étaient promis.
							*/}
							{note.recuDepuis === undefined ? null : (
								<p className="text-cladd-2xs text-cladd-fg">
									{note.recuDepuis > 0n
										? `Reçu depuis sa promesse : ${eurosCentimes(note.recuDepuis)}.`
										: 'Rien reçu depuis sa promesse.'}
								</p>
							)}
							{note.promisPourLe !== undefined && note.promisPourLe <= aujourdHui ? (
								<p className="text-cladd-2xs text-cladd-fg-softer">
									Le jour est arrivé. A-t-il payé ?
								</p>
							) : (
								<p className="text-cladd-2xs text-cladd-fg-softer">
									Les relances automatiques se taisent jusqu’à son jour.
								</p>
							)}
							<span className="flex flex-wrap gap-cladd-3xs">
								<BoutonSecondaire onClick={() => onTrancherPromesse(note._id, 'TENUE')}>
									Il a payé
								</BoutonSecondaire>
								<BoutonSecondaire onClick={() => onTrancherPromesse(note._id, 'NON_TENUE')}>
									Il n’a pas payé
								</BoutonSecondaire>
							</span>
						</Surface>
					))}

					{rappelsOuverts.map((note) => (
						<Surface
							key={note._id}
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
						>
							<p className="text-cladd-sm font-semibold">
								{note.rappelLe === undefined
									? 'Vous vouliez y revenir'
									: `Y revenir le ${dateCourte(note.rappelLe)}`}
							</p>
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{note.texte}</p>
							<span className="flex flex-wrap gap-cladd-3xs">
								<BoutonSecondaire onClick={() => onRappelFait(note._id)}>
									C’est fait
								</BoutonSecondaire>
								<BoutonSecondaire onClick={() => onEffacer(note._id)}>Retirer</BoutonSecondaire>
							</span>
						</Surface>
					))}
				</section>
			) : null}

			{/* ── NOTER QUELQUE CHOSE ──────────────────────────────────────────── */}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Noter quelque chose</SectionTitle>
				<Segmented activeColor="neutral" activeVariant="solid" aria-label="Ce que vous notez">
					{GENRES.map((g) => (
						<SegmentedButton key={g.cle} active={g.cle === genre} onClick={() => setGenre(g.cle)}>
							{g.libelle}
						</SegmentedButton>
					))}
				</Segmented>

				<Champ etiquette={INVITE[genre]}>
					<Input
						value={texte}
						onChange={setTexte}
						placeholder={INVITE[genre]}
					/>
				</Champ>

				{genre === 'ECHANGE' ? (
					<>
						<Segmented
							activeColor="neutral"
							activeVariant="solid"
							aria-label="Par quoi l’échange a eu lieu"
						>
							{CANAUX.map((c) => (
								<SegmentedButton key={c} active={c === canal} onClick={() => setCanal(c)}>
									{INTITULE_DU_CANAL[c]}
								</SegmentedButton>
							))}
						</Segmented>
						<Champ etiquette="Quel jour">
							<Input
								type="date"
								value={survenuLe}
								onChange={setSurvenuLe}
							/>
						</Champ>
					</>
				) : null}

				{genre === 'PROMESSE' ? (
					<>
						<Champ etiquette="Combien il a promis, en euros">
							<Input
								inputMode="decimal"
								value={montantPromisEuros}
								onChange={setMontantPromisEuros}
								placeholder="2 000,00"
							/>
						</Champ>
						<Champ etiquette="Pour quel jour">
							<Input
								type="date"
								value={promisPourLe}
								onChange={setPromisPourLe}
							/>
						</Champ>
					</>
				) : null}

				{genre === 'RAPPEL' ? (
					<Champ etiquette="Quel jour vous voulez y revenir">
						<Input
							type="date"
							value={rappelLe}
							onChange={setRappelLe}
						/>
					</Champ>
				) : null}

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}

				<BoutonPrincipal className="self-start" disabled={enCours} onClick={envoyer}>
					{enCours ? 'Enregistrement…' : 'Noter'}
				</BoutonPrincipal>
			</section>

			{/* ── LA FRISE ─────────────────────────────────────────────────────── */}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Ce qui s’est passé</SectionTitle>

				{frise.length === 0 ? (
					<p className="text-cladd-xs text-cladd-fg-soft">
						Rien n’est encore consigné sur ce dossier. Ce que vous notez, et ce que le logiciel
						constate, se liront ici dans l’ordre.
					</p>
				) : null}

				{frise.map((fait, rang) => (
					<Surface
						key={`${fait.quand}-${rang}`}
						variant="transparent"
						outline={false}
						className="verre-carte rounded-cladd-xl"
						contentClassName="flex flex-col gap-1.5 p-cladd-2xs"
					>
						<span className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
							<span className="text-cladd-sm font-semibold">{fait.titre}</span>
							<span className="flex shrink-0 items-center gap-cladd-3xs">
								<Chip size="md" color="neutral">
									{QUI[fait.auteur]}
								</Chip>
								<span className="text-cladd-2xs text-cladd-fg-softer">
									{quandLisible(fait.quand)}
								</span>
							</span>
						</span>
						{fait.detail === undefined ? null : (
							<span className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{fait.detail}
							</span>
						)}
						{fait.source === undefined ? null : (
							<span className="text-cladd-2xs text-cladd-fg-softest">{fait.source}</span>
						)}
					</Surface>
				))}
			</section>
		</div>
	);
}
