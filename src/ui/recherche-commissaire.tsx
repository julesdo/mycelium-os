import { useState } from 'react';
import {
	Input,
	List,
	ListButton,
	ListTitle,
	Popup,
	PopupContent,
	SectionTitle
} from '@cladd-ui/react';
import { ScaleIcon, SearchIcon } from 'lucide-react';
import { BoutonPrincipal } from './bouton';
import { dateCourte, pluriel } from './format';
import { sirenLisible } from './recherche-registre';

/**
 * CHERCHER UN COMMISSAIRE DE JUSTICE, SANS QUITTER L'APPLICATION.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA LISTE VIENT DU REGISTRE DES ENTREPRISES, ET L'ÉCRAN LE DIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il n'existe aucun répertoire public réutilisable de cette profession : leur
 * annuaire national ne publie ni export, ni flux, ni conditions de
 * réutilisation. Ce qui s'affiche ici est donc le registre des entreprises,
 * filtré sur la convention collective de la profession — une source ouverte,
 * mais PAS le tableau de l'ordre.
 *
 * Trois choses en découlent, et elles sont toutes écrites à l'écran plutôt que
 * gardées pour un commentaire :
 *
 *   · une étude qui n'a pas déclaré sa convention collective est absente ;
 *   · une radiation disciplinaire n'y figure pas ;
 *   · le filtre de département porte sur les ÉTABLISSEMENTS, donc une étude
 *     dont le siège est ailleurs remonte si elle a une antenne sur place — et
 *     l'adresse affichée est alors celle du siège, à des kilomètres.
 *
 * `src/ui/__tests__/source-citee.test.ts` échoue si ce fichier nomme le
 * registre sans porter sa date de relevé. C'est une barrière, pas une
 * convention : un écran qui recopie une liste publique sans dire d'où elle
 * vient est indiscernable d'un annuaire officiel, et c'est le défaut que ce
 * projet traque en priorité — pas une donnée absente, une donnée FAUSSE qu'on
 * laisse croire vraie.
 *
 * ⚠️ ELLE N'INTERROGE RIEN ELLE-MÊME. Tout entre par les props : `src/ui` ne
 * connaît pas Convex, et c'est ce qui permet à la salle d'exposition de rendre
 * cet écran sans backend ni authentification.
 */

/** Une étude, telle que l'écran la lit. Le miroir de `EtudeTrouvee`. */
export interface EtudeAffichee {
	readonly siren: string;
	readonly nom: string;
	readonly commune: string;
	readonly codePostal: string;
	readonly adresse?: string;
}

export interface ResultatAnnuaireAffiche {
	readonly departement: string;
	readonly etudes: readonly EtudeAffichee[];
	/**
	 * Ce que le registre DÉCLARE exister dans ce département.
	 *
	 * ⚠️ IL PEUT DÉPASSER `etudes.length`, et c'est précisément pourquoi il est
	 * rendu : la lecture s'arrête à une borne dure. Vingt-cinq études affichées
	 * sur cent quatorze, sans un mot, ferait croire à un département qui en
	 * compte vingt-cinq.
	 */
	readonly total: number;
	/** La phrase qui dit ce que cette liste est, et ce qu'elle n'est pas. */
	readonly source: string;
	/** Le jour du relevé, en ISO court. */
	readonly releveeLe: string;
}

/**
 * L'état de la recherche, du point de vue de l'écran.
 *
 * ⚠️ `ECHEC` NE PORTE AUCUNE LISTE, PAR CONSTRUCTION. C'est ce qui rend
 * impossible le repli qu'on veut interdire : une panne du registre ne peut pas
 * se rendre en liste vide, parce que le type n'en a pas. « Aucune étude dans ce
 * département » et « le registre n'a pas répondu » mènent à deux gestes
 * opposés ; les confondre serait un mensonge.
 */
export type EtatRechercheCommissaire =
	| { readonly phase: 'REPOS' }
	| { readonly phase: 'EN_COURS' }
	| { readonly phase: 'TROUVE'; readonly resultat: ResultatAnnuaireAffiche }
	| { readonly phase: 'ECHEC'; readonly message: string };

/** « NANTES 44100 », ou ce qui en reste quand le registre n'en dit qu'une part. */
function lieu(etude: EtudeAffichee): string {
	return `${etude.commune} ${etude.codePostal}`.trim();
}

export function RechercheCommissaire({
	ouverte,
	departementParDefaut,
	etat,
	onFermer,
	onChercher,
	onRetenir
}: {
	ouverte: boolean;
	/**
	 * Le département du débiteur, quand l'écran appelant le connaît.
	 *
	 * ⚠️ VIDE PLUTÔT QUE DEVINÉ. Aucune fiche débiteur ne porte d'adresse
	 * aujourd'hui : proposer « 75 » par défaut, ou le département du créancier,
	 * ferait chercher au mauvais endroit un gérant qui ne relirait pas le champ
	 * — et il conclurait que sa région ne compte aucune étude.
	 */
	departementParDefaut?: string;
	etat: EtatRechercheCommissaire;
	onFermer: () => void;
	onChercher: (departement: string) => void;
	/** Retenir une étude au carnet. Sa source et sa date partent avec elle. */
	onRetenir: (etude: EtudeAffichee) => void;
}) {
	/*
	  Un état local, initialisé UNE fois. Pas de `setState` dans un effet : la
	  valeur par défaut est une graine, pas une synchronisation. La remise à zéro,
	  si elle devenait nécessaire, se ferait par la `key` de ce composant.
	*/
	const [departement, setDepartement] = useState(departementParDefaut ?? '');

	const saisi = departement.trim();
	const enCours = etat.phase === 'EN_COURS';
	const resultat = etat.phase === 'TROUVE' ? etat.resultat : null;
	const tronquee = resultat !== null && resultat.total > resultat.etudes.length;

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={
				<span className="px-2 pb-1 text-cladd-sm font-semibold">Chercher un commissaire</span>
			}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				<SectionTitle>Dans quel département</SectionTitle>
				<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
					<Input
						size="lg"
						value={departement}
						onChange={setDepartement}
						placeholder="44"
						infoMessage="Deux caractères — 44, 09, 2A — ou trois outre-mer."
					/>
					{/*
					  LE GESTE PRINCIPAL, en pilule blanche. ⚠️ PAS `Button color="brand"` :
					  mesuré au navigateur, il rend un fond transparent avec du texte bleu,
					  c'est-à-dire quelque chose qui se lit comme un lien.
					*/}
					<BoutonPrincipal
						className="self-start"
						loading={enCours}
						readOnly={enCours || saisi === ''}
						onClick={() => onChercher(saisi)}
					>
						<SearchIcon size={16} />
						Chercher
					</BoutonPrincipal>

					{/*
					  ⚠️ CE QUE LA LISTE EST SE DIT AVANT DE LA VOIR, pas après. Un gérant
					  qui découvre la provenance une fois son choix fait a déjà cru lire un
					  annuaire officiel. Le nom du registre est ici, en clair, dès l'état
					  de repos.
					*/}
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
						Cette liste vient du registre des entreprises, filtré sur la convention collective de la
						profession. Ce n’est pas le tableau de l’ordre : une étude qui ne l’a pas déclarée n’y
						figure pas, et une radiation disciplinaire non plus.
					</p>
				</div>
			</PopupContent>

			<PopupContent>
				{/*
				  ⚠️ L'ÉCHEC S'AFFICHE TEL QUEL, ET NE DEVIENT JAMAIS UNE LISTE VIDE.
				  Le type l'interdit — `ECHEC` ne porte pas d'études — et c'est ce qui
				  rend la règle tenue plutôt que promise.
				*/}
				{etat.phase === 'ECHEC' ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft" role="alert">
						{etat.message}
					</p>
				) : null}

				{enCours ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Lecture du registre en cours…
					</p>
				) : null}

				{etat.phase === 'REPOS' ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Aucune recherche lancée. Rien n’est enregistré tant que vous n’avez pas touché une
						étude.
					</p>
				) : null}

				{resultat === null ? null : resultat.etudes.length === 0 ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Le registre ne rend aucune étude dans le département {resultat.departement}. C’est un
						silence du registre, pas un constat sur le département : une étude qui n’a pas déclaré
						sa convention collective en est absente.
					</p>
				) : (
					<>
						<List>
							<ListTitle>
								{resultat.etudes.length} étude{pluriel(resultat.etudes.length)} · département{' '}
								{resultat.departement}
							</ListTitle>
							{resultat.etudes.map((etude) => (
								<ListButton
									key={etude.siren}
									icon={<ScaleIcon size={18} />}
									header={sirenLisible(etude.siren)}
									/*
									  ⚠️ L'ADRESSE SEULE QUAND ELLE EXISTE : elle CONTIENT déjà la
									  commune et le code postal. Les juxtaposer répète la seule
									  information qui sert à reconnaître une étude proche de chez
									  soi, et fait repasser la rangée à la ligne — la leçon est
									  celle de `recherche-registre.tsx`, apprise au navigateur.
									*/
									footer={etude.adresse ?? lieu(etude)}
									className="verre-bouton"
									hoverable={false}
									onClick={() => onRetenir(etude)}
								>
									<span className="truncate">{etude.nom}</span>
								</ListButton>
							))}
						</List>

						{/*
						  ⚠️ CE QUE LA LECTURE A COUPÉ SE DIT. Paris compte cent quatorze
						  études ; une borne dure arrête la lecture avant la fin sur un
						  département très fourni. Afficher le reste sans le signaler
						  ferait croire à une liste complète.
						*/}
						{tronquee ? (
							<p className="mt-cladd-3xs px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								Le registre en déclare {resultat.total} dans ce département. La lecture s’est
								arrêtée à {resultat.etudes.length} : les suivantes ne sont pas affichées.
							</p>
						) : null}

						<p className="mt-cladd-3xs px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
							Le filtre de département porte sur les établissements, pas sur le siège : l’adresse
							affichée est celle du siège, qui peut se trouver dans un autre département.
						</p>

						{/*
						  ⚠️ LA SOURCE ET SA DATE, SOUS LA LISTE, TOUJOURS. Elles partent avec
						  la fiche quand une étude est retenue — `ajouterIntervenant` la refuse
						  sans elles — et ce qui est enregistré doit avoir été lu.
						*/}
						<p className="mt-cladd-3xs px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
							{resultat.source} Relevé le {dateCourte(resultat.releveeLe)}.
						</p>
					</>
				)}
			</PopupContent>
		</Popup>
	);
}
