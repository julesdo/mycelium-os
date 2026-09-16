import { useState } from 'react';
import { BoutonPrincipal } from './bouton';
import { LigneBouton } from './navigation';
import { Button, Chip, Input, Surface } from '@cladd-ui/react';
import { DatePicker } from '@cladd-ui/react/calendar';
import { fr } from 'react-day-picker/locale';
import { AlertTriangleIcon, ArrowLeftRightIcon, SearchIcon } from 'lucide-react';
import { dateCourte, eurosCentimes } from './format';
import { aujourdHuiISO } from './horloge';

/**
 * LE LETTRAGE D'UN VIREMENT GROUPÉ.
 *
 * Un client paie 4 820 € en une fois, sans référence. Le gérant a le montant sous
 * les yeux sur son relevé ; le produit lui dit quelles factures il solde.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CE MODULE EST UNE RANGÉE, PLUS UN BLOC DÉPLIÉ EN PERMANENCE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Il tenait trois lignes de prose, deux champs et un bouton, ouverts en
 * permanence, ENTRE les rangées d'analyse et les factures. Il repoussait donc
 * les factures — c'est-à-dire la sélection, le geste principal de l'écran —
 * sous la ligne de flottaison, pour une opération occasionnelle.
 *
 * C'est maintenant une rangée, du même motif que « Les pièces du dossier » et
 * « Comment il paie d'habitude », et le formulaire vit sous elle.
 *
 * ⚠️ MAIS IL SE DÉPLIE DE LUI-MÊME DÈS QU'IL A QUELQUE CHOSE À DIRE. Une
 * recherche en cours, une proposition, un refus : un résultat qu'il faudrait
 * aller rouvrir n'est pas un résultat. Dérivé au rendu, jamais posé dans un
 * effet — c'est la règle React du projet.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CET ÉCRAN NE CHOISIT JAMAIS À LA PLACE DU GÉRANT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Quand deux combinaisons donnent le même total, les deux s'affichent, avec un
 * avertissement, et AUCUNE n'est présélectionnée. Trancher aurait une chance sur
 * deux d'être faux — et l'erreur, c'est relancer un client qui a déjà payé, la
 * pire d'un logiciel de recouvrement. Elle ne coûte pas un chiffre à l'écran,
 * elle coûte une relation commerciale.
 *
 * ⚠️ ET LA RECHERCHE NE PART PAS À CHAQUE FRAPPE. Le montant se confirme
 * explicitement : chercher pendant qu'on tape ferait défiler des propositions
 * qui changent sous les doigts, et donnerait envie de cliquer sur la première.
 */

export interface CombinaisonAffichee {
	readonly references: readonly string[];
	readonly total: bigint;
}

export interface PropositionLettrage {
	readonly issue: 'UNIQUE' | 'AMBIGU' | 'AUCUNE' | 'TROP_DE_CANDIDATES';
	readonly combinaisons: readonly CombinaisonAffichee[];
	readonly tronque: boolean;
	readonly candidates?: number;
}

/**
 * LE JOUR CHOISI AU CALENDRIER, ÉCRIT COMME LE RESTE DE LA CHAÎNE : `2026-04-15`.
 *
 * ⚠️ SUR LES PARTIES LOCALES, ET PAS PAR `toISOString()`. Le calendrier rend un
 * `Date` posé à minuit dans le fuseau du navigateur ; le passer en UTC ferait
 * reculer d'un jour toute date choisie à l'est de Greenwich pendant l'été. Une
 * date de règlement fausse d'un jour fausse les intérêts du même jour.
 */
function enISO(jour: Date): string {
	const mois = `${jour.getMonth() + 1}`.padStart(2, '0');
	const quantieme = `${jour.getDate()}`.padStart(2, '0');
	return `${jour.getFullYear()}-${mois}-${quantieme}`;
}

/**
 * LE JOUR COURANT, EN `Date` LOCALE, POUR BORNER LE CALENDRIER.
 *
 * Il vient de `aujourdHuiISO()`, la seule lecture d'horloge de l'interface : une
 * seconde horloge ferait diverger cette borne de la date d'arrêté des décomptes.
 */
function jourCourant(): Date {
	const [annee, mois, quantieme] = aujourdHuiISO().split('-').map(Number);
	// `aujourdHuiISO()` rend toujours ses trois nombres ; les défauts ne servent
	// qu'au typage strict, ils ne sont jamais atteints.
	return new Date(annee ?? 1970, (mois ?? 1) - 1, quantieme ?? 1);
}

function Avis({ children }: { children: React.ReactNode }) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex gap-cladd-3xs p-cladd-2xs"
		>
			<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
			<div className="flex min-w-0 flex-col gap-1.5">{children}</div>
		</Surface>
	);
}

export function Lettrage({
	proposition,
	enCours,
	erreur,
	onChercher,
	onAppliquer
}: {
	/** `null` tant qu'aucune recherche n'a été lancée. */
	proposition: PropositionLettrage | null;
	enCours: boolean;
	erreur: string | null;
	onChercher: (montantSaisi: string, date: string) => void;
	onAppliquer: (references: readonly string[], total: bigint) => void;
}) {
	const [montant, setMontant] = useState('');
	/**
	 * ⚠️ AUCUNE DATE PAR DÉFAUT, ET SURTOUT PAS CELLE DU JOUR. Un règlement daté
	 * après sa date réelle raccourcit la période de retard à l'écran mais
	 * l'ALLONGE sur les factures restantes : le produit réclamerait plus que dû,
	 * sur un chiffre que personne n'a saisi. Un champ vide se voit ; une date
	 * fausse pré-remplie se signe.
	 */
	const [date, setDate] = useState<Date | undefined>(undefined);
	/** Le pli, quand le gérant l'a décidé lui-même ; `null` tant qu'il n'a rien dit. */
	const [pli, setPli] = useState<boolean | null>(null);

	// Ce qui déplie tout seul : une recherche en cours, une proposition, un refus.
	const deplieDeLuiMeme = enCours || proposition !== null || erreur !== null;
	const ouvert = pli ?? deplieDeLuiMeme;

	const aujourdHui = jourCourant();

	return (
		<>
			<LigneBouton
				icone={<ArrowLeftRightIcon />}
				titre="Rapprocher un virement"
				onClick={() => setPli(!ouvert)}
			/>

			{ouvert ? (
				<div className="flex flex-col gap-cladd-2xs px-cladd-3xs pt-cladd-3xs pb-cladd-3xs">
					{/*
					  ⚠️ UNE PHRASE, PAS TROIS. « Il ne rapproche qu'au centime près » et
					  « il ne choisit jamais à votre place » se redisaient ici, à froid,
					  alors qu'ils se disent au moment où ils comptent : dans l'avis
					  « Aucune combinaison ne fait ce montant » et dans l'avis AMBIGU.
					*/}
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Le logiciel cherche quelles factures ce virement solde.
					</p>

					<div className="flex flex-wrap items-center gap-cladd-3xs">
						<Input
							size="lg"
							className="min-w-40 flex-1"
							value={montant}
							onChange={setMontant}
							placeholder="4820,00"
							inputMode="decimal"
							suffix={<span className="mr-2 text-cladd-fg-softer">€</span>}
						/>
						{/*
						  LA DATE SE CHOISIT AU CALENDRIER, ELLE NE SE TAPE PLUS.

						  ⚠️ ELLE SE TAPAIT EN `AAAA-MM-JJ`, au format informatique : dix
						  caractères et deux tirets sur un clavier de tablette, pour une
						  donnée qui entre dans un calcul d'intérêts.

						  ⚠️ ET AUCUNE DATE FUTURE N'EST CHOISISSABLE. Le calendrier
						  s'arrête au jour courant : une date de règlement postérieure à la
						  vraie ferait réclamer plus que dû. La garde serveur reste,
						  évidemment — celle-ci empêche seulement de la déclencher.
						*/}
						<DatePicker
							size="lg"
							outline
							className="min-w-40 flex-1"
							value={date}
							onChange={setDate}
							placeholder="Date de valeur"
							format={(choisie) => dateCourte(enISO(choisie))}
							calendarProps={{
								locale: fr,
								disabled: { after: aujourdHui },
								endMonth: aujourdHui
							}}
						/>
						<BoutonPrincipal
							onClick={() => {
								if (date === undefined) return;
								onChercher(montant, enISO(date));
							}}
							disabled={enCours || montant.trim() === '' || date === undefined}
						>
							<SearchIcon />
							{enCours ? 'Recherche…' : 'Chercher'}
						</BoutonPrincipal>
					</div>

					{erreur !== null ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

					{proposition === null ? null : proposition.issue === 'AUCUNE' ? (
						<Avis>
							<p className="text-cladd-xs font-semibold">Aucune combinaison ne fait ce montant</p>
							<p className="text-cladd-xs text-cladd-fg-soft">
								Le rapprochement se fait au centime près. Un écart, même d’un centime, peut venir
								d’un escompte, d’un frais bancaire, ou d’une facture que le logiciel ne connaît pas
								encore — trois situations qui n’appellent pas le même geste.
							</p>
						</Avis>
					) : proposition.issue === 'TROP_DE_CANDIDATES' ? (
						<Avis>
							<p className="text-cladd-xs font-semibold">
								Trop de factures ouvertes chez ce débiteur ({proposition.candidates})
							</p>
							<p className="text-cladd-xs text-cladd-fg-soft">
								Chercher une somme parmi autant de factures prendrait un temps que personne
								n’attendra. Enregistrez d’abord les règlements que vous connaissez, puis reprenez.
							</p>
						</Avis>
					) : (
						<div className="flex flex-col gap-cladd-3xs">
							{proposition.issue === 'AMBIGU' ? (
								<Avis>
									<p className="text-cladd-xs font-semibold">
										{proposition.combinaisons.length} lectures possibles
										{proposition.tronque ? ' — et il en existe d’autres' : ''}
									</p>
									<p className="text-cladd-xs text-cladd-fg-soft">
										Plusieurs combinaisons de factures donnent exactement ce montant. Le logiciel ne
										tranche pas : solder les mauvaises factures laisserait les autres en impayé, et
										vous relanceriez un client qui a déjà payé.
									</p>
								</Avis>
							) : null}

							{proposition.combinaisons.map((combinaison) => (
								<Surface
									key={combinaison.references.join('+')}
									variant="transparent"
									outline={false}
									className="verre-carte rounded-cladd-xl"
									contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs sm:flex-row sm:items-center sm:justify-between"
								>
									<div className="flex flex-wrap items-center gap-1.5">
										{combinaison.references.map((reference) => (
											<Chip key={reference} size="md" color="neutral">
												{reference}
											</Chip>
										))}
									</div>
									<div className="flex shrink-0 items-center gap-cladd-3xs">
										<span className="text-cladd-sm font-semibold tabular-nums">
											{eurosCentimes(combinaison.total)}
										</span>
										<Button
											size="md"
											variant="transparent"
											onClick={() => onAppliquer(combinaison.references, combinaison.total)}
											disabled={enCours}
										>
											Solder ces factures
										</Button>
									</div>
								</Surface>
							))}
						</div>
					)}
				</div>
			) : null}
		</>
	);
}
