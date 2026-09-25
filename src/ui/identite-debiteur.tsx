import { useState } from 'react';
import { Button, Chip, Input, Select, Surface } from '@cladd-ui/react';
import { FileTextIcon } from 'lucide-react';
import {
	RechercheRegistre,
	type EtatRecherche,
	type EtablissementPropose
} from './recherche-registre';

import { Champ } from './cadre-auth';
import { dateCourte } from './format';
import {
	REGIMES_PRESCRIPTION,
	secteurLePlusCourt
} from '../lib/verticales/recouvrement/pays/france/prescription';

/**
 * CE QUE LE GÉRANT SEUL PEUT DIRE DE SON DÉBITEUR.
 *
 * « Le logiciel décide, le gérant confirme » (règle d'écran n° 1) : aucun écran
 * ne demande une saisie que le logiciel peut déduire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE FICHIER A LONGTEMPS DIT L'INVERSE, ET S'EST TROMPÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il portait trois champs, et les justifiait ainsi : « aucun ne se lit sur une
 * facture. Ils vivent dans un registre public, dans une nomenclature, ou dans
 * des conditions générales — TROIS ENDROITS OÙ LE LOGICIEL NE VA PAS. »
 *
 * Le logiciel va dans le registre public. Chaque nuit, à quatre heures : c'est
 * le radar de solvabilité. Le BODACC est ouvert, sans clé, et se cherche PAR
 * NOM — chaque annonce porte la dénomination, le SIREN, la forme juridique et
 * l'adresse du siège.
 *
 * Cette phrase a donc laissé un champ de saisie VIDE, pendant des semaines, sur
 * l'écran le plus fréquenté du produit, pour la donnée qui commande la
 * surveillance de solvabilité ET l'éligibilité à toute procédure. Le raisonnement
 * n'avait envisagé qu'une source — l'API Sirene, dont la clé n'est pas obtenue —
 * et avait conclu de son absence qu'aucune n'existait.
 *
 * Le SIREN se cherche maintenant. Voir `ui/recherche-registre.tsx`, et la raison
 * pour laquelle il PROPOSE au lieu de choisir : « BOULANGERIE MARTIN » rend six
 * sociétés dans six villes, et un SIREN faux mais bien formé désigne une autre
 * entreprise — le radar l'interrogerait, et son « aucune procédure » se lirait
 * comme un feu vert.
 *
 * Les deux champs qui restent sont d'une autre nature, et ils restent :
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SECTEUR — la légende dit le délai, parce que c'est ce qui décide
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Un gérant ne choisit pas « transport de marchandises » pour le plaisir de la
 * nomenclature : il le choisit parce que ça change son délai de prescription de
 * cinq ans à un an. La durée est donc SOUS chaque option, pas cachée dans une
 * aide — et elle vient du registre juridique, jamais d'une constante écrite ici.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE TAUX STIPULÉ — le champ qui était lu par les moteurs et jamais rempli
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `facturesVente.tauxContractuel` était lu par le décompte ET la révélation,
 * et écrit nulle part. Tout créancier dont les conditions générales stipulent
 * un taux retombait silencieusement sur le taux légal : le produit
 * SOUS-RÉCLAMAIT, l'inverse exact de sa raison d'être.
 *
 * ⚠️ IL VIT ICI ET PAS DANS SA PROPRE CARTE. Il a d'abord eu la sienne — un
 * en-tête, une icône, un champ. C'est le motif « trois cartes pour trois
 * liens » déjà corrigé ailleurs : deux cartes voisines portant chacune un
 * seul champ font deux objets là où il n'y a qu'un sujet. Ces trois faits
 * sont de même nature — ce que le gérant seul peut dire de ce client — donc
 * ils tiennent ensemble.
 *
 * ⚠️ ET LE CONSTAT VIENT DU SERVEUR, MOT POUR MOT. Un taux sous le plancher
 * légal est ENREGISTRÉ tel quel : relever d'office un taux jugé trop bas
 * serait écrire une conséquence juridique que personne n'a validée.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LE TAUX LU SUR UNE PIÈCE SE PROPOSE, IL NE S'APPLIQUE JAMAIS SEUL
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La lecture d'une pièce relève le taux stipulé dans des conditions générales
 * ou un contrat. Ce chiffre remontait jusqu'au constat affiché sous la pièce et
 * mourait là : le champ ci-dessous restait vide, et le créancier retombait sur
 * le taux légal. Le produit SOUS-RÉCLAMAIT, ce qui est l'inverse exact de sa
 * raison d'être.
 *
 * Il arrive maintenant jusqu'ici, et il y arrive en PROPOSITION. L'écrire
 * d'office serait le contraire d'un service : la mutation qui le pose réécrit
 * TOUTES les factures non soldées du débiteur, et elle enregistre même sous le
 * plancher légal, délibérément. Un taux mal lu par un modèle ferait donc baisser
 * en silence ce qu'on réclame sur tout un client. La rangée cite la pièce d'où
 * il vient et attend un doigt, comme le registre propose un SIREN sans le
 * retenir.
 */

export interface OptionSecteur {
	readonly cle: string;
	readonly libelle: string;
	/** Ce que ce secteur change, en clair. Vient du registre. */
	readonly consequence: string;
}

/**
 * Les secteurs proposés, et ce que chacun change.
 *
 * ⚠️ ELLE VIVAIT DANS `screens/debiteur-detail.tsx`, C'EST-À-DIRE DANS UN ÉCRAN
 * QUE T16 SUPPRIME. La file en a besoin pour proposer un secteur à un client non
 * classé, et un secteur indéterminé fait retenir le délai de prescription LE
 * PLUS COURT : la laisser là-bas aurait emporté ce choix le jour du ménage, en
 * silence. Même déplacement, et pour la même raison, que `Facultatif`, qui
 * vivait dans la barre que la bascule supprime.
 *
 * ⚠️ LA DURÉE VIENT DU REGISTRE, JAMAIS D'UNE CONSTANTE ÉCRITE ICI. C'est la
 * règle la plus stricte du projet : toute valeur juridique vit dans le
 * référentiel, avec sa source. Recopier « 5 ans » dans un libellé d'écran
 * créerait une seconde vérité qui ne serait pas corrigée le jour où la première
 * change.
 *
 * Le libellé, lui, est du texte d'interface : il nomme la relation commerciale
 * telle qu'un gérant la reconnaît, pas telle que le code de commerce l'écrit.
 */
const LIBELLE_SECTEUR: Record<string, string> = {
	GENERAL: 'Des biens ou des services, à une entreprise',
	CONSOMMATEUR: 'Des biens ou des services, à un particulier',
	TRANSPORT_MARCHANDISES: 'Du transport de marchandises',
	OUVRAGE_ACCEPTE: 'Des travaux, depuis leur réception',
	NOURRITURE_MARINS: 'Des repas pour l’équipage d’un navire',
	FOURNITURE_NAVIRE: 'Du matériel pour un navire'
};

export function secteursProposes(): OptionSecteur[] {
	const connus = Object.keys(REGIMES_PRESCRIPTION).map((cle) => {
		const regime = REGIMES_PRESCRIPTION[cle as keyof typeof REGIMES_PRESCRIPTION];
		return {
			cle,
			libelle: LIBELLE_SECTEUR[cle] ?? cle,
			consequence: `Pour agir en justice : ${regime.dureeAnnees} an${regime.dureeAnnees > 1 ? 's' : ''} (${regime.source})`
		};
	});

	// `INDETERMINE` est proposé en PREMIER et reste choisissable : c'est l'état
	// honnête d'un débiteur qu'on ne sait pas classer, et le forcer à choisir
	// produirait un secteur inventé — donc un délai de prescription faux, dans le
	// sens qui fait perdre la créance.
	const court = secteurLePlusCourt();
	return [
		{
			cle: 'INDETERMINE',
			libelle: 'À préciser',
			consequence: `En attendant votre réponse, le délai le plus court est surveillé, par prudence : ${court} an${court > 1 ? 's' : ''}`
		},
		...connus
	];
}

/**
 * Deux écritures du même taux désignent le même taux.
 *
 * ⚠️ COMPARER LES CHAÎNES SE TROMPE. « 12,5 » et « 12,50 » sont le même taux, et
 * le taux lu sur une pièce vient du modèle tandis que celui en vigueur vient
 * d'une saisie : rien ne garantit la même écriture. Une comparaison de chaînes
 * afficherait « déjà en vigueur » sur un taux différent, ou proposerait de
 * retenir un taux déjà posé.
 */
function memeTaux(lu: string, enVigueur: string | undefined): boolean {
	if (enVigueur === undefined) return false;
	const nombre = (taux: string) => Number(taux.replace(',', '.'));
	const a = nombre(lu);
	const b = nombre(enVigueur);
	return Number.isFinite(a) && Number.isFinite(b) && a === b;
}

/** Un taux de retard relevé sur une pièce déposée, et la pièce qui le porte. */
export interface PropositionTaux {
	/** Le taux lu, en pourcentage saisissable : « 12,50 ». */
	readonly pourcentage: string;
	/** Le nom du fichier déposé, tel quel. C'est lui qu'on rouvre pour vérifier. */
	readonly piece: string;
	/** Le numéro imprimé sur cette pièce, quand elle en porte un. */
	readonly reference?: string;
}

/**
 * LE SECTEUR DE LA RELATION, et ce que le choisir change.
 *
 * ⚠️ EXTRAIT PARCE QU'IL A DEUX APPELANTS, et que le second est celui qui
 * compte. La file porte un pli « débiteurs sans identifiant » où le geste est
 * précisément de lever les deux inconnues d'un même client : son numéro au
 * registre, et son secteur. Un secteur indéterminé fait retenir le délai de
 * prescription LE PLUS COURT ; sans ce geste, cette hypothèse devient
 * incorrigible depuis l'écran qui la déclare.
 *
 * Recopier le `Select` là-bas aurait fait deux listes d'options, deux libellés
 * de conséquence et deux placeholders, dont la divergence serait muette.
 */
export function ChoixSecteur({
	secteur,
	optionsSecteur,
	onChoisirSecteur
}: {
	secteur: string | undefined;
	optionsSecteur: readonly OptionSecteur[];
	onChoisirSecteur: (cle: string) => void;
}) {
	return (
		<Select
			className="w-full"
			surface="cut"
			size="lg"
			title="Ce que vous lui vendez"
			options={[...optionsSecteur]}
			value={secteur ?? 'INDETERMINE'}
			getOptionValue={(option) => option.cle}
			onChange={(cle) => onChoisirSecteur(cle as string)}
			renderOption={({ value }) => value.libelle}
			renderOptionInfo={({ value }) => value.consequence}
			keyboardHints={false}
			placeholder="À préciser"
		>
			{optionsSecteur.find((o) => o.cle === (secteur ?? 'INDETERMINE'))?.libelle ??
				'Ce que vous lui vendez : à préciser'}
		</Select>
	);
}

/**
 * L'ADRESSE OÙ LA RELANCE PARTIRA — depuis la messagerie du gérant, jamais d'ici.
 *
 * ⚠️ ELLE N'EXISTAIT NULLE PART. Le produit composait des brouillons de relance
 * depuis des semaines, et le gérant devait retrouver l'adresse de son client
 * ailleurs pour les envoyer : c'est la double saisie de ce chantier, à son
 * dernier mètre.
 *
 * ⚠️ CE QUE LA BANQUE DONNE SE DIT COMME TEL. L'adresse lue chez Qonto est
 * l'adresse de FACTURATION ; celle qui débloque un impayé est souvent celle du
 * comptable, et le gérant est le seul à la connaître. Afficher les deux de la
 * même façon laisserait croire qu'il n'y a rien à vérifier.
 *
 * ⚠️ ET LA CORRIGER À LA MAIN LA REND DÉFINITIVE. Le rattrapage de six heures
 * ne la réécrira jamais : voir `trouverOuCreerDebiteur`.
 */
function AdresseDuClient({
	email,
	erreur,
	onEnregistrer,
	venueDeLaBanque
}: {
	email: string | undefined;
	erreur: string | null;
	onEnregistrer: (saisi: string) => void;
	venueDeLaBanque: boolean;
}) {
	/* La `key` porte l'adresse enregistrée : le champ suit ce que le serveur a
	   retenu, sans effet. Voir la même discipline sur le taux, plus bas. */
	const [saisi, setSaisi] = useState(email ?? '');

	return (
		<div className="flex flex-col gap-cladd-3xs">
			<Champ
				etiquette="Son adresse électronique"
				aide={
					email === undefined || email === ''
						? 'Sans elle, une relance se prépare mais ne peut pas s’ouvrir dans votre messagerie.'
						: venueDeLaBanque
							? 'Venue de votre banque : c’est l’adresse de facturation. Celle qui débloque un impayé est souvent celle du comptable.'
							: 'Votre message s’ouvrira dans votre messagerie, à cette adresse, sous votre signature.'
				}
			>
				<input
					value={saisi}
					onChange={(e) => setSaisi(e.target.value)}
					onBlur={() => {
						if (saisi.trim() !== (email ?? '')) onEnregistrer(saisi);
					}}
					inputMode="email"
					placeholder="comptabilite@exemple.fr"
					aria-label="Adresse électronique du client"
					className="verre h-cladd-md w-full rounded-full px-cladd-3xs text-cladd-xs text-cladd-fg placeholder:text-cladd-fg-softer focus:outline-none"
				/>
			</Champ>
			{erreur === null ? null : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft" role="alert">
					{erreur}
				</p>
			)}
		</div>
	);
}

export function IdentiteDebiteur({
	denomination,
	siren,
	formeJuridique,
	etatRecherche,
	onChercherAuRegistre,
	onRetenirEtablissement,
	email,
	emailVenuDeLaBanque,
	erreurEmail,
	onEnregistrerEmail,
	secteur,
	optionsSecteur,
	erreurSiren,
	onEnregistrerSiren,
	onChoisirSecteur,
	tauxContractuel,
	propositionTaux,
	constatTaux,
	onEnregistrerTaux
}: {
	/** Le nom du débiteur, tel qu'il est venu de la facture. */
	denomination: string;
	siren: string | undefined;
	/** Ce que le registre dit de sa forme, une fois le SIREN retenu. */
	formeJuridique: string | undefined;
	etatRecherche: EtatRecherche;
	onChercherAuRegistre: () => void;
	/** Retenir un établissement proposé : son numéro ET sa forme juridique. */
	onRetenirEtablissement: (etablissement: EtablissementPropose) => void;
	/** L'adresse électronique du client. C'est elle qui rend la relance envoyable. */
	email: string | undefined;
	/** Vrai quand elle vient d'une synchronisation bancaire, pas d'une saisie. */
	emailVenuDeLaBanque: boolean;
	/** Le refus venu du serveur, mot pour mot. */
	erreurEmail: string | null;
	onEnregistrerEmail: (saisi: string) => void;
	secteur: string | undefined;
	optionsSecteur: readonly OptionSecteur[];
	/** Le refus venu du serveur, tel quel — c'est lui qui nomme le numéro reçu. */
	erreurSiren: string | null;
	onEnregistrerSiren: (saisi: string) => void;
	onChoisirSecteur: (cle: string) => void;
	/** Le taux stipulé en vigueur, en pourcentage saisissable. */
	tauxContractuel: string | undefined;
	/** Le taux relevé sur une pièce déposée. `null` quand aucune n'en porte. */
	propositionTaux: PropositionTaux | null;
	/** Ce que le serveur a répondu au dernier enregistrement. Affiché tel quel. */
	constatTaux: string | null;
	/** `null` retire la stipulation et fait retomber sur le taux légal. */
	onEnregistrerTaux: (pourcentage: string | null) => void;
}) {
	return (
		<div className="flex flex-col gap-cladd-2xs">
			{/*
			  ⚠️ LE CHAMP « SIREN OU SIRET » A DISPARU D'ICI, et c'est la correction
			  la plus importante de cet écran.

			  Il était vide, et il demandait au gérant d'aller chercher neuf chiffres
			  ailleurs pour les recopier — sur l'écran où il passe le plus de temps,
			  et pour la donnée qui commande la surveillance de solvabilité ET
			  l'éligibilité à toute procédure.

			  Le commentaire en tête de ce fichier justifiait le champ ainsi : ces
			  données « vivent dans un registre public […] où le logiciel ne va pas ».
			  C'était faux. Le logiciel y va chaque nuit à quatre heures — c'est le
			  radar de solvabilité — et le BODACC se cherche PAR NOM.

			  Voir `ui/recherche-registre.tsx`, qui porte le raisonnement complet et
			  la raison pour laquelle il propose au lieu de choisir.
			*/}
			<RechercheRegistre
				denomination={denomination}
				siren={siren}
				formeJuridique={formeJuridique}
				etat={etatRecherche}
				erreurSaisie={erreurSiren}
				onChercher={onChercherAuRegistre}
				onRetenir={onRetenirEtablissement}
				onSaisir={onEnregistrerSiren}
			/>

			<AdresseDuClient
				email={email}
				erreur={erreurEmail}
				onEnregistrer={onEnregistrerEmail}
				venueDeLaBanque={emailVenuDeLaBanque}
			/>

			<ChoixSecteur
				secteur={secteur}
				optionsSecteur={optionsSecteur}
				onChoisirSecteur={onChoisirSecteur}
			/>

			<div className="flex flex-col gap-cladd-3xs">
				{/* LE TAUX LU SUR UNE PIÈCE, AU-DESSUS DU CHAMP ET JAMAIS DEDANS. Le
				    pré-remplir donnerait à croire qu'il est enregistré, et il suffirait
				    alors de ne rien faire pour qu'il le devienne. */}
				{propositionTaux === null ? null : (
					<TauxLuSurUnePiece
						proposition={propositionTaux}
						enVigueur={memeTaux(propositionTaux.pourcentage, tauxContractuel)}
						onRetenir={() => onEnregistrerTaux(propositionTaux.pourcentage)}
					/>
				)}

				{/*
				  ⚠️ LA `key` PORTE LE TAUX EN VIGUEUR, et c'est ce qui fait que le
				  champ suit ce que le serveur a retenu. Sa valeur est un état local,
				  donc elle ne bougeait plus après le premier rendu : le taux retenu
				  d'un doigt sur la rangée ci-dessus s'enregistrait sans que le champ
				  le montre, et le créancier le croyait perdu. Remettre à zéro par une
				  `key` plutôt que de poser l'état dans un effet, comme la règle React
				  du projet le demande.
				*/}
				<ChampTauxStipule
					key={tauxContractuel ?? ''}
					tauxContractuel={tauxContractuel}
					constatTaux={constatTaux}
					onEnregistrerTaux={onEnregistrerTaux}
				/>
			</div>
		</div>
	);
}

/**
 * LE TAUX RELEVÉ SUR UNE PIÈCE — une proposition qui cite sa source.
 *
 * ⚠️ TROIS CHOSES SE DISENT ICI, ET AUCUNE N'EST DÉCORATIVE : le chiffre lu, la
 * pièce d'où il vient — parce qu'un taux qu'on ne peut pas retrouver ne se
 * vérifie pas — et ce que le retenir déclenche. La mutation touche TOUTES les
 * factures non soldées du débiteur : le taire ferait signer un geste plus large
 * que ce que le bouton laisse croire.
 */
function TauxLuSurUnePiece({
	proposition,
	enVigueur,
	onRetenir
}: {
	proposition: PropositionTaux;
	/** Vrai quand ce taux est déjà celui qui s'applique : il n'y a plus rien à retenir. */
	enVigueur: boolean;
	onRetenir: () => void;
}) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<div className="flex items-start gap-cladd-3xs">
				<FileTextIcon size={18} className="mt-0.5 shrink-0 text-cladd-fg-softer" aria-hidden />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-cladd-xs font-medium">
						Un taux de retard de {proposition.pourcentage} % est stipulé
					</span>
					{/* LA PIÈCE ET SON NUMÉRO, POUR QU'ON PUISSE ALLER RELIRE LA CLAUSE. */}
					<span className="text-cladd-2xs break-words text-cladd-fg-softest">
						Lu dans « {proposition.piece} »
						{proposition.reference === undefined ? '' : `, n° ${proposition.reference}`}
					</span>
				</div>
			</div>

			{enVigueur ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					C’est déjà le taux appliqué aux factures non soldées de ce client.
				</p>
			) : (
				<>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Rien n’est enregistré tant que vous ne l’avez pas retenu. Il s’appliquera alors à toutes
						les factures non soldées de ce client, et à aucune de celles qui sont réglées.
					</p>
					{/* ⚠️ `min-h-12` : 48 px, le plancher tactile du projet. Le geste est
					    secondaire — l'action principale de cet écran est de constituer une
					    créance — donc une pilule de verre, pas la pilule blanche.

					    ⚠️ ET LA PILULE DE VERRE S'ÉCRIT `verre verre-bouton`, LES DEUX.
					    `verre-bouton` seul ne peint RIEN au repos : il ne porte qu'une
					    transition et une règle `:hover`. Relevé au navigateur sur cette
					    rangée, en clair comme en sombre : fond `rgba(0, 0, 0, 0)`, ombre
					    `none`, bordure `0px`. Le bouton était du texte gras, et sur une
					    tablette — le format de référence du produit — il n'y a pas de
					    survol pour le révéler. C'est `.verre` qui porte le fond et
					    l'arête au repos, dans les deux thèmes. */}
					<Button
						size="sm"
						variant="transparent"
						outline={false}
						hoverable={false}
						className="verre verre-bouton min-h-12 self-start rounded-full px-3 text-cladd-2xs"
						onClick={onRetenir}
					>
						Retenir {proposition.pourcentage} %
					</Button>
				</>
			)}
		</Surface>
	);
}

/**
 * LE CHAMP DE SAISIE DU TAUX, et le constat que le serveur rend.
 *
 * Il vit dans son propre composant pour une seule raison : sa valeur est un
 * état local, et une `key` posée par le parent est la façon dont ce projet
 * remet un état à zéro. Voir la note à l'appel.
 */
function ChampTauxStipule({
	tauxContractuel,
	constatTaux,
	onEnregistrerTaux
}: {
	tauxContractuel: string | undefined;
	constatTaux: string | null;
	onEnregistrerTaux: (pourcentage: string | null) => void;
}) {
	const [taux, setTaux] = useState(tauxContractuel ?? '');

	return (
		<div className="flex flex-col gap-1">
			<Input
				size="lg"
				value={taux}
				onChange={setTaux}
				// Sur `blur` et pas à la frappe : ce taux touche TOUTES les factures
				// non soldées du débiteur. Enregistrer à chaque caractère écrirait
				// « 1 », puis « 12 », puis « 12,4 » avant d'arriver au bon.
				onBlur={() => onEnregistrerTaux(taux.trim() === '' ? null : taux.trim())}
				placeholder="Taux de retard stipulé"
				inputMode="decimal"
				suffix={<span className="mr-2 text-cladd-fg-softer">%</span>}
				infoMessage="Celui de vos conditions générales. Vide = taux légal, BCE majoré de dix points."
			/>
			{/* Le constat du serveur, tel quel : il dit si le taux passe sous le
			    plancher légal et combien vaut ce plancher, pour que le créancier
			    refasse le calcul plutôt que de nous croire. L'écran ne le récrit pas. */}
			{constatTaux ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{constatTaux}</p>
			) : null}
		</div>
	);
}

export interface ConstatRegistreAffiche {
	readonly dateParution: string;
	readonly nature: string;
	readonly dateJugement?: string;
	readonly tribunal?: string;
	readonly url: string;
}

/**
 * LE CONSTAT DU REGISTRE PUBLIC — cité, jamais interprété.
 *
 * ⚠️ AUCUN VERBE DE RECOMMANDATION ICI. Le produit écrit « le BODACC a publié le
 * 9 septembre une annonce concernant ce débiteur », jamais « déclarez votre
 * créance au mandataire ». La troisième ligne rouge du projet est explicite :
 * on énonce des CONSTATS, jamais une conduite à tenir. Recommander une démarche
 * serait du conseil juridique, et ce produit n'en fait pas.
 *
 * ⚠️ ET LA NATURE EST REPRISE MOT POUR MOT. Une paraphrase serait une lecture, et
 * une lecture engage. Le lien mène à l'annonce elle-même : le gérant, ou son
 * avocat, lit la source.
 *
 * Toutes les annonces affichées ici ne disent pas qu'une entreprise est
 * insolvable — une interdiction de gérer vise une personne. C'est précisément
 * pour ça qu'on montre le texte du registre au lieu d'un verdict.
 */
/**
 * CE QUE LA RANGÉE « DÉBITEUR » DIT, SUR L'ÉCRAN D'UNE CRÉANCE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE RANGÉE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran d'une créance affichait le nom du débiteur comme TITRE, et n'offrait
 * aucun moyen de l'atteindre — `creanceComplete` ne rendait même pas son
 * identifiant. Le graphe d'objets du produit était fait d'étoiles séparées :
 * une créance descendait vers ses six analyses, un débiteur vers ses pièces, et
 * les deux ne se touchaient nulle part.
 *
 * Ce n'est pas seulement de la navigation. Le radar de solvabilité tourne
 * chaque nuit et écrit son verdict SUR LE DÉBITEUR ; la créance porte l'argent.
 * Le handler de `creanceComplete` lisait déjà cette santé : il la passe à
 * `qualifier()`, qui en tire un risque de gravité HAUTE (une procédure
 * collective, ou une radiation) et laisse le score intact, mais il ne la
 * rendait pas : le risque n'apparaissait nulle part sur l'écran.
 *
 * ⚠️ QUATRE ÉTATS, QUATRE MOTS DIFFÉRENTS. La table l'impose : « ne rien savoir
 * n'est pas la même chose que savoir que tout va bien, et c'est la confusion
 * qui ferait engager des frais sur un débiteur déjà radié ». `INCONNUE` dit
 * donc « non vérifiée » et `SAINE` dit « rien au registre » — jamais le même
 * mot, sans quoi la distinction tenue en base se perd au dernier mètre.
 *
 * ⚠️ UN CONSTAT, JAMAIS UNE CONDUITE À TENIR. « Procédure collective au
 * registre », pas « déclarez votre créance au mandataire ». C'est la troisième
 * ligne rouge du projet, et un test la balaie.
 */
export function rangeeDuDebiteur({
	sante
}: {
	sante: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
}): { valeur: string; precision?: string; attention: boolean } {
	switch (sante) {
		case 'PROCEDURE_COLLECTIVE':
			return {
				valeur: 'Procédure collective',
				precision: 'Relevée au registre public',
				// ⚠️ UN POINT, PAS UNE COULEUR. Le vert, l'ambre et le rouge sont
				// réservés à `--color-seuil-*` et ne disent qu'une chose dans ce
				// produit : au-dessus du seuil, tout près, en dessous. Une santé de
				// débiteur n'est pas un seuil.
				attention: true
			};
		case 'RADIEE':
			return {
				valeur: 'Radiée du registre',
				precision: 'Relevée au registre public',
				attention: true
			};
		case 'SAINE':
			return { valeur: 'Rien au registre', precision: 'Au dernier relevé', attention: false };
		case 'INCONNUE':
			return {
				valeur: 'Non vérifiée',
				// Un angle mort se dit : « ce que le logiciel ne voit pas s'affiche
				// aussi ». Sans SIREN, le radar ne peut pas interroger le registre, et
				// un gérant qui croit son débiteur surveillé ne le surveille pas.
				precision: 'Le registre n’a pas pu être interrogé',
				attention: false
			};
	}
}

export function ConstatRegistre({
	constat,
	sante
}: {
	constat: ConstatRegistreAffiche;
	sante: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
}) {
	const bascule = sante === 'PROCEDURE_COLLECTIVE' || sante === 'RADIEE';

	return (
		<Surface
			variant="transparent"
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-1.5 p-cladd-2xs"
			outline={false}
			color={bascule ? 'red' : undefined}
		>
			<div className="flex flex-wrap items-center gap-1.5">
				<Chip size="md" color={bascule ? 'red' : 'neutral'}>
					{bascule ? 'Registre public' : 'Annonce au registre'}
				</Chip>
				<span className="text-cladd-2xs text-cladd-fg-soft">
					publiée au BODACC le {dateCourte(constat.dateParution)}
				</span>
			</div>

			{/* LA NATURE, MOT POUR MOT. */}
			<p className="text-cladd-sm font-semibold">{constat.nature}</p>

			<p className="text-cladd-xs text-cladd-fg-soft">
				{constat.dateJugement !== undefined ? (
					<>Jugement du {dateCourte(constat.dateJugement)}. </>
				) : null}
				{constat.tribunal ?? null}
			</p>

			{/* ⚠️ `min-h-12` ET `w-fit` : 48 px de haut, le plancher tactile du
			    projet, et la largeur du texte. Le lien faisait 21 px de haut sur
			    toute la largeur de la carte : trop plat pour un doigt, et une cible
			    qui traverse l'écran attrape les appuis destinés à ce qui l'entoure.
			    C'est le seul lien du produit qui sorte vers un site tiers, et le seul
			    endroit où le gérant peut LIRE le registre plutôt que notre citation :
			    il mérite d'être atteignable. */}
			<a
				href={constat.url}
				target="_blank"
				rel="noreferrer"
				className="inline-flex min-h-12 w-fit items-center text-cladd-xs text-cladd-primary underline underline-offset-2"
			>
				Lire l’annonce au BODACC
			</a>
		</Surface>
	);
}
