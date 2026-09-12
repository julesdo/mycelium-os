import {
	List,
	ListButton,
	ListTitle,
	Popup,
	PopupContent,
	SectionTitle,
	Select
} from '@cladd-ui/react';
import { ScaleIcon } from 'lucide-react';
import { dateCourte, pluriel } from './format';
import { sirenLisible } from './recherche-registre';

/**
 * CHERCHER UN AVOCAT, SANS QUITTER L'APPLICATION.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA LISTE VIENT D'UN FICHIER INGÉRÉ, PAS D'UNE INTERROGATION EN DIRECT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le Conseil national des barreaux publie l'annuaire national des avocats sur
 * data.gouv.fr, sous Licence Ouverte, en CSV. Il n'y a pas d'API : quarante-
 * trois fichiers en téléchargement direct. Ce qui s'affiche ici est donc une
 * PHOTOGRAPHIE, prise le jour du relevé, et pas l'état du tableau aujourd'hui.
 *
 * Trois choses en découlent, toutes écrites à l'écran plutôt que gardées pour
 * un commentaire :
 *
 *   · une fiche peut décrire une situation périmée — déménagement, changement
 *     de barreau, cessation d'activité depuis le relevé ;
 *   · une spécialité absente veut dire « non déclarée au fichier », jamais
 *     « cet avocat n'en a aucune » — et la plupart des fiches n'en portent pas ;
 *   · sur un barreau très fourni, la lecture s'arrête à une borne, et ce qu'elle
 *     coupe se dit.
 *
 * `src/ui/__tests__/source-citee.test.ts` échoue si ce fichier nomme l'annuaire
 * sans porter sa date de relevé. C'est une barrière, pas une convention.
 *
 * ⚠️ DEUX FILTRES, ET AUCUN N'EST DE NOTRE INVENTION. Le barreau et la
 * spécialité sont deux champs du fichier du CNB. On FILTRE, on ne CLASSE pas :
 * l'ordre est alphabétique, et aucune fiche n'est mise en avant.
 *
 * ⚠️ ELLE N'INTERROGE RIEN ELLE-MÊME. Tout entre par les props : `src/ui` ne
 * connaît pas Convex, et c'est ce qui permet à la salle d'exposition de rendre
 * cet écran sans backend ni authentification.
 */

/** Un avocat, tel que l'écran le lit. Le miroir de `AvocatTrouve`. */
export interface AvocatAffiche {
	readonly nom: string;
	readonly prenom: string;
	readonly raisonSociale?: string;
	readonly siren?: string;
	readonly adresse?: string;
	readonly codePostal?: string;
	readonly ville?: string;
	/** Les spécialités DÉCLARÉES au fichier. Vide = non déclarée, pas « aucune ». */
	readonly specialites: readonly string[];
}

export interface ResultatAvocatsAffiche {
	readonly barreau: string;
	readonly specialite: string | null;
	readonly avocats: readonly AvocatAffiche[];
	/**
	 * Combien de fiches CORRESPONDENT au filtre, pas combien sont affichées.
	 *
	 * ⚠️ UN PLANCHER QUAND `lectureTronquee` VAUT VRAI. Les deux se lisent
	 * ensemble : afficher deux cents fiches sur trente mille sans le dire ferait
	 * croire à un barreau qui en compte deux cents.
	 */
	readonly total: number;
	readonly lectureTronquee: boolean;
	/** Les spécialités réellement déclarées dans ce barreau. Elles viennent du fichier. */
	readonly specialitesDeclarees: readonly string[];
	/** La phrase qui dit ce que cette liste est, et ce qu'elle n'est pas. */
	readonly source: string;
	/** Le jour du relevé, en ISO court. `null` = aucune livraison ingérée. */
	readonly releveeLe: string | null;
}

/** Les barreaux que le répertoire connaît, tels que l'écran les lit. */
export interface RepertoireAffiche {
	readonly barreaux: readonly string[];
	/** Faux si le parcours a buté sur sa borne : la liste est alors partielle. */
	readonly complete: boolean;
	readonly releveeLe: string | null;
}

/**
 * L'ÉTAT DE LA RECHERCHE, DU POINT DE VUE DE L'ÉCRAN.
 *
 * ⚠️ AUCUNE PHASE D'ÉCHEC, ET C'EST UN CONSTAT PLUTÔT QU'UN OUBLI. Contrairement
 * à la recherche de commissaires, qui appelle une API tierce par une `action`,
 * celle-ci lit une table déjà ingérée : une requête Convex qui échoue lève
 * jusqu'à la frontière d'erreur au lieu de rendre une liste. Il n'existe donc
 * aucun chemin par lequel une panne deviendrait « aucun avocat » — ce qui est
 * précisément la confusion que le type interdisait là-bas.
 *
 * `AUCUN_BARREAU` n'est pas `EN_COURS` : « vous n'avez pas encore choisi » et
 * « je lis » mènent à deux attitudes, et les confondre ferait attendre un
 * résultat que personne n'a demandé.
 */
export type EtatRechercheAvocat =
	| { readonly phase: 'AUCUN_BARREAU' }
	| { readonly phase: 'EN_COURS' }
	| { readonly phase: 'TROUVE'; readonly resultat: ResultatAvocatsAffiche };

/**
 * L'option qui ne filtre sur rien.
 *
 * ⚠️ ELLE EST DANS LA MÊME LISTE QUE LES SPÉCIALITÉS, et c'est sans risque :
 * les libellés du CNB commencent tous par « Droit » ou « Procédure ». Une
 * seconde commande « effacer le filtre » à côté du choix aurait ajouté un geste
 * pour revenir à l'état de départ.
 */
const TOUTES = 'Toutes les fiches du barreau';

/** « NANTES 44100 », ou ce qui en reste quand le fichier n'en dit qu'une part. */
function lieu(avocat: AvocatAffiche): string {
	return `${avocat.ville ?? ''} ${avocat.codePostal ?? ''}`.trim();
}

/** « MARTIN Dupont » — le nom en tête, parce que la liste se lit par le nom. */
function identite(avocat: AvocatAffiche): string {
	return `${avocat.nom} ${avocat.prenom}`.trim();
}

export function RechercheAvocat({
	ouverte,
	repertoire,
	barreau,
	specialite,
	etat,
	onFermer,
	onChoisirBarreau,
	onChoisirSpecialite,
	onRetenir
}: {
	ouverte: boolean;
	/** Les barreaux disponibles, ou `null` tant que le répertoire se lit. */
	repertoire: RepertoireAffiche | null;
	/**
	 * Le barreau choisi, ou la chaîne vide.
	 *
	 * ⚠️ VIDE PLUTÔT QUE DEVINÉ, comme le département de la recherche d'études.
	 * Aucune fiche débiteur ne porte d'adresse aujourd'hui, et proposer le
	 * barreau du créancier ferait chercher au mauvais endroit un gérant qui ne
	 * relirait pas le champ.
	 */
	barreau: string;
	/** La spécialité choisie, ou la chaîne vide pour « toutes ». */
	specialite: string;
	etat: EtatRechercheAvocat;
	onFermer: () => void;
	onChoisirBarreau: (barreau: string) => void;
	onChoisirSpecialite: (specialite: string) => void;
	/** Retenir un avocat au carnet. Sa source et sa date partent avec lui. */
	onRetenir: (avocat: AvocatAffiche) => void;
}) {
	const resultat = etat.phase === 'TROUVE' ? etat.resultat : null;
	const barreaux = repertoire?.barreaux ?? [];
	const vide = repertoire !== null && barreaux.length === 0;

	/*
	  Les spécialités proposées sont celles du barreau COURANT, et le choix
	  courant y est ajouté s'il n'y figure plus : sans ça, changer de barreau
	  ferait disparaître la valeur affichée dans la gâchette du filtre sans que
	  rien ne dise pourquoi la liste vient de s'élargir.
	*/
	const declarees = resultat?.specialitesDeclarees ?? [];
	const optionsSpecialite = [
		TOUTES,
		...declarees,
		...(specialite !== '' && !declarees.includes(specialite) ? [specialite] : [])
	];

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">Chercher un avocat</span>}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				<SectionTitle>Dans quel barreau</SectionTitle>
				<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
					{/*
					  ⚠️ UNE LISTE, PAS UN CHAMP LIBRE, et c'est la règle d'écran n° 1 :
					  « aucun écran ne demande une saisie que le logiciel peut déduire ».
					  Les barreaux SONT dans le fichier. Un champ de texte aurait laissé
					  taper « Paris » là où le fichier écrit « PARIS », et rendu zéro
					  fiche sans jamais dire que la faute était de frappe.
					*/}
					<Select
						className="w-full"
						surface="cut"
						size="lg"
						title="Barreau"
						options={barreaux as string[]}
						value={barreau}
						onChange={(choisi) => onChoisirBarreau(choisi)}
						search
						searchFocus
						searchPlaceholder="Chercher un barreau"
						searchNotFound="Aucun barreau de ce nom dans le relevé"
						keyboardHints={false}
						popoverClassName="w-64 max-h-80"
						onSearch={(q) =>
							barreaux.filter((b) => b.toLowerCase().includes(q.toLowerCase().trim()))
						}
						readOnly={barreaux.length === 0}
						placeholder="Choisir un barreau"
					>
						{barreau === '' ? 'Choisir un barreau' : barreau}
					</Select>

					{/*
					  ⚠️ LE VIDE MONTRE LE CHEMIN, il n'affiche pas un cadran à zéro. Un
					  répertoire jamais ingéré et un barreau sans avocat sont deux
					  constats différents, et celui-ci se corrige par une commande, pas
					  par une autre recherche.
					*/}
					{repertoire === null ? (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Lecture du répertoire en cours…
						</p>
					) : vide ? (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Aucune livraison de l’annuaire n’a encore été ingérée : le répertoire est vide. Il se
							remplit par l’import du fichier du Conseil national des barreaux, dont la date de
							relevé est déclarée à l’import.
						</p>
					) : (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
							{barreaux.length} barreau{pluriel(barreaux.length)} dans cette livraison
							{repertoire.releveeLe === null
								? '.'
								: `, relevée le ${dateCourte(repertoire.releveeLe)}.`}
							{repertoire.complete
								? ''
								: ' La liste des barreaux s’est arrêtée à une borne de lecture : elle est partielle.'}
						</p>
					)}
				</div>
			</PopupContent>

			{resultat === null ? null : (
				<PopupContent>
					<SectionTitle>Quelle spécialité</SectionTitle>
					<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
						<Select
							className="w-full"
							surface="cut"
							size="lg"
							title="Spécialité déclarée"
							options={optionsSpecialite}
							value={specialite === '' ? TOUTES : specialite}
							onChange={(choisie) => onChoisirSpecialite(choisie === TOUTES ? '' : choisie)}
							search
							searchPlaceholder="Chercher une spécialité"
							searchNotFound="Aucune spécialité de ce nom dans ce barreau"
							keyboardHints={false}
							popoverClassName="w-72 max-h-80"
							onSearch={(q) =>
								optionsSpecialite.filter((s) => s.toLowerCase().includes(q.toLowerCase().trim()))
							}
						>
							{specialite === '' ? TOUTES : specialite}
						</Select>

						{/*
						  ⚠️ « NON DÉCLARÉE » N'EST PAS « INEXISTANTE », et c'est la phrase la
						  plus importante de cet écran. La grande majorité des fiches ne porte
						  aucune spécialité : un gérant qui filtre et ne trouve personne
						  conclurait que son barreau ne compte aucun avocat compétent, alors
						  que le fichier dit seulement que personne ne l'a inscrit.
						*/}
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
							Ces spécialités sont celles que les avocats de ce barreau ont DÉCLARÉES au fichier. La
							plupart des fiches n’en portent aucune : filtrer écarte donc aussi ceux qui ne l’ont
							pas remplie.
						</p>
					</div>
				</PopupContent>
			)}

			<PopupContent>
				{etat.phase === 'AUCUN_BARREAU' ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Aucun barreau choisi. Rien n’est enregistré tant que vous n’avez pas touché une fiche.
					</p>
				) : null}

				{etat.phase === 'EN_COURS' ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Lecture du répertoire en cours…
					</p>
				) : null}

				{resultat === null ? null : resultat.avocats.length === 0 ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						{resultat.specialite === null
							? `Le relevé ne porte aucune fiche au barreau ${resultat.barreau}.`
							: `Aucune fiche du barreau ${resultat.barreau} ne déclare « ${resultat.specialite} ». C’est un silence du fichier, pas un constat sur le barreau.`}
					</p>
				) : (
					<>
						<List>
							<ListTitle>
								{resultat.avocats.length} fiche{pluriel(resultat.avocats.length)} · barreau{' '}
								{resultat.barreau}
							</ListTitle>
							{resultat.avocats.map((avocat) => (
								<ListButton
									key={`${avocat.nom}-${avocat.prenom}-${avocat.siren ?? avocat.codePostal ?? ''}`}
									icon={<ScaleIcon size={18} />}
									/*
									  ⚠️ LE SIREN EN EXERGUE QUAND IL EXISTE, SINON LA STRUCTURE.
									  Le fichier ne porte pas toujours l'un ni l'autre : un avocat
									  salarié n'a ni raison sociale ni SIREN propres, et écrire
									  « — » à la place ferait lire une absence comme une valeur.
									*/
									header={
										avocat.siren === undefined ? avocat.raisonSociale : sirenLisible(avocat.siren)
									}
									footer={
										<>
											<span className="block truncate">{avocat.adresse ?? lieu(avocat)}</span>
											{avocat.specialites.length === 0 ? null : (
												<span className="block truncate">{avocat.specialites.join(' · ')}</span>
											)}
										</>
									}
									className="verre-bouton"
									hoverable={false}
									onClick={() => onRetenir(avocat)}
								>
									<span className="truncate">{identite(avocat)}</span>
								</ListButton>
							))}
						</List>

						{/*
						  ⚠️ CE QUE LA LECTURE A COUPÉ SE DIT. Paris compte des dizaines de
						  milliers d'avocats ; une borne dure arrête la lecture avant la fin.
						  Afficher les deux cents premiers sans le signaler ferait croire à
						  une liste complète, et ferait choisir dans un dixième du barreau en
						  pensant avoir tout vu.
						*/}
						{resultat.lectureTronquee ? (
							<p className="mt-cladd-3xs px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								La lecture s’est arrêtée à une borne sur ce barreau : {resultat.total} fiche
								{pluriel(resultat.total)} correspondent parmi celles qui ont été lues, et il y en a
								davantage. Ce nombre est un plancher, pas un total.
							</p>
						) : resultat.total > resultat.avocats.length ? (
							<p className="mt-cladd-3xs px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{resultat.total} fiche{pluriel(resultat.total)} correspondent ; les{' '}
								{resultat.avocats.length} premières sont affichées. Filtrez par spécialité pour
								resserrer la liste.
							</p>
						) : null}

						{/*
						  ⚠️ LA SOURCE ET SA DATE, SOUS LA LISTE, TOUJOURS. Elles partent avec
						  la fiche quand un avocat est retenu — `ajouterIntervenant` la refuse
						  sans elles — et ce qui est enregistré doit avoir été lu.
						*/}
						<p className="mt-cladd-3xs px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
							{resultat.source}
							{resultat.releveeLe === null ? '' : ` Relevé le ${dateCourte(resultat.releveeLe)}.`}
						</p>
					</>
				)}
			</PopupContent>
		</Popup>
	);
}
