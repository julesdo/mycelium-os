import { useState } from 'react';
import {
	Input,
	List,
	ListButton,
	Popup,
	PopupContent,
	SectionTitle,
	Select,
	Spinner
} from '@cladd-ui/react';
import { CheckIcon, ChevronLeftIcon, SearchIcon } from 'lucide-react';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { dateCourte } from './format';
import { Lien } from './lien';
import { LigneBouton, ListeAnalyses } from './navigation';
import {
	CarteProfessionnel,
	FicheProfessionnel,
	GesteDeCarte,
	distanceDepuis,
	type Depuis,
	type GestesDeLaFiche,
	type ProfessionnelAffiche
} from './professionnel';

/**
 * QUI FAIT L'ACTE — en feuille, une décision à la fois.
 *
 * ⚠️ LE LOGICIEL NE PRÉSÉLECTIONNE RIEN. Quelle profession est compétente pour
 * quel acte est une valeur juridique, et `parametres.ts` la déclare non relevée
 * (`professionCompetenteParActe`). Présélectionner sur une correspondance
 * devinée enverrait un gérant chez un professionnel qui ne peut pas faire
 * l'acte, et lui ferait perdre le temps que la caducité compte.
 *
 * ⚠️ « MOI-MÊME » EST UN CHOIX DE PREMIER RANG. Selon le montant et le client,
 * un gérant dépose lui-même ou passe par un professionnel. Le produit pose la
 * question ; il n'y répond jamais.
 *
 * ⚠️ ET IL NE CLASSE PAS. Ordre alphabétique, celui que rend `monCarnet`. Un
 * ordre de pertinence serait une mise en avant, et une mise en avant est une
 * orientation.
 */

export type RoleIntervenant = 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE' | 'AUTRE';

/**
 * Les trois rôles, écrits pour être lus.
 *
 * ⚠️ AUCUN N'EST PREMIER. L'ordre est celui du validateur Convex, pas un ordre
 * de pertinence : le champ part sur « Autre », et c'est au gérant de dire ce
 * qu'est la personne qu'il ajoute.
 */
const ROLES: readonly { readonly cle: RoleIntervenant; readonly libelle: string }[] = [
	{ cle: 'AVOCAT', libelle: 'Avocat' },
	{ cle: 'COMMISSAIRE_DE_JUSTICE', libelle: 'Commissaire de justice' },
	{ cle: 'AUTRE', libelle: 'Autre' }
];

function libelleRole(role: RoleIntervenant): string {
	return ROLES.find((r) => r.cle === role)?.libelle ?? 'Autre';
}

/**
 * Une fiche du carnet, telle que l'écran la lit.
 *
 * ⚠️ L'IDENTIFIANT EST UN PARAMÈTRE DE TYPE, et ce n'est pas de la coquetterie.
 * `src/ui` ne connaît pas Convex ; le figer en `string` obligerait la route à
 * re-transformer en `Id<'intervenants'>` ce qui en venait, c'est-à-dire à
 * affirmer par une assertion ce que le compilateur savait déjà.
 */
export interface FicheIntervenant<I extends string = string> {
	readonly _id: I;
	readonly nom: string;
	readonly role: RoleIntervenant;
	/** Le ressort, quand le gérant l'a noté. Jamais deviné. */
	readonly ressort?: string;
	/**
	 * CE QUE LA FICHE DIT AUSSI (08/10/2026), pour qu'un membre de l'équipe se
	 * montre comme une personne : où il exerce, comment le joindre, sa photo.
	 * Tout est facultatif : une fiche saisie à la main n'a souvent que son nom.
	 */
	readonly adresse?: string;
	readonly telephone?: string;
	readonly courriel?: string;
	readonly siren?: string;
	readonly photoUrl?: string;
	readonly sourceRepertoire?: string;
	readonly sourceReleveeLe?: string;
}

/** Ce qu'une fiche saisie à la main porte, et rien de plus. */
export interface FicheASaisir {
	readonly nom: string;
	readonly role: RoleIntervenant;
	readonly ressort?: string;
}

/**
 * « Avocat · Paris », ou « Avocat » quand le ressort n'a pas été noté.
 *
 * Exportée depuis que le carnet se lit aussi en LISTE, dans `/app/compte` : la
 * même fiche s'y écrit de la même façon, sans quoi la carte de la feuille et la
 * rangée de la section finiraient par ne plus dire la même chose.
 */
export function precisionDeLaFiche(fiche: FicheIntervenant<string>): string {
	const role = libelleRole(fiche.role);
	return fiche.ressort === undefined || fiche.ressort.trim() === ''
		? role
		: `${role} · ${fiche.ressort}`;
}

/** Une étude de commissaire de justice proposée près du client. */
export interface EtudeProposee {
	readonly siren: string;
	readonly nom: string;
	readonly commune: string;
	readonly codePostal: string;
	readonly adresse?: string;
	/** Ce que le registre publie aussi : la carte, l'âge, la taille, qui y exerce. */
	readonly latitude?: number;
	readonly longitude?: number;
	readonly creeeLe?: string;
	readonly effectif?: string;
	readonly associes?: readonly string[];
}

/** Un avocat proposé près du client. */
export interface AvocatProposeAffiche {
	readonly nom: string;
	readonly prenom: string;
	readonly raisonSociale?: string;
	readonly siren?: string;
	readonly adresse?: string;
	readonly codePostal?: string;
	readonly ville?: string;
	readonly specialites: readonly string[];
	readonly barreau: string;
}

/**
 * LES PROFESSIONNELS PRÈS DU CLIENT, tels que la route les a lus.
 *
 * ⚠️ QUATRE ÉTATS, ET « INCONNU » N'EST PAS « VIDE ». Un client sans SIREN n'a
 * pas de lieu connu : la feuille le dit, et propose de chercher à la main. Un
 * registre qui ne répond pas rend une liste INCONNUE, jamais une liste vide.
 */
export type PropositionsAffichees =
	| { readonly etat: 'CHARGEMENT' }
	| { readonly etat: 'ECHEC'; readonly message: string }
	| { readonly etat: 'LIEU_INCONNU'; readonly client: string }
	| {
			readonly etat: 'PRET';
			readonly client: string;
			readonly lieu: {
				readonly departement: string;
				readonly commune: string | null;
				/** Le siège du client sur la carte : d'où se mesure la distance. */
				readonly latitude?: number;
				readonly longitude?: number;
			};
			readonly commissaires:
				| {
						readonly etat: 'TROUVE';
						readonly etudes: readonly EtudeProposee[];
						readonly source: string;
						readonly releveeLe: string;
				  }
				| { readonly etat: 'ECHEC'; readonly message: string };
			readonly avocats: {
				readonly specialises: readonly AvocatProposeAffiche[];
				readonly autres: readonly AvocatProposeAffiche[];
				readonly autresEnPlus: boolean;
				readonly source: string;
				readonly releveeLe: string | null;
			} | null;
	  };

/** Combien d'études se montrent avant « Voir les autres ». */
const ETUDES_MONTREES = 12;

/** Le choix en cours, marqué comme une case d'iOS : une coche, ou rien. */
function Coche({ choisie }: { choisie: boolean }) {
	// ⚠️ UNE BOÎTE POUR LES DEUX ÉTATS : le kit ramène une icône posée seule à
	// 16 px, et une case vide de 20 décalait de quatre pixels les noms du carnet
	// par rapport à « Moi-même ».
	return (
		<span className="flex size-5 shrink-0 items-center justify-center">
			{choisie ? <CheckIcon className="size-5 text-cladd-primary" aria-label="choisi" /> : null}
		</span>
	);
}

/** L'intitulé d'un groupe de la feuille : ce qu'il contient, et où. */
function TitreDeGroupe({ titre, precision }: { titre: string; precision?: string }) {
	return (
		<div className="flex flex-col gap-0.5 px-1">
			<h3 className="text-cladd-xs font-semibold">{titre}</h3>
			{precision === undefined ? null : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">{precision}</p>
			)}
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * D'UNE SOURCE À UNE FICHE AFFICHÉE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trois sources — le carnet du gérant, le registre des entreprises, l'annuaire
 * national des avocats — et UNE forme à l'écran (`ProfessionnelAffiche`). Chaque
 * fiche garde sa source écrite : une fiche relevée n'est pas une fiche vérifiée.
 */

/**
 * Le nom d'une source, sans son mode d'emploi : « Registre des entreprises (API
 * Recherche d'entreprises, DINUM), filtré sur… » se lit « Registre des
 * entreprises ». Le texte entier reste dans la feuille de recherche qui l'a lu.
 */
function nomDeLaSource(texte: string): string {
	const coupe = texte.search(/[(.,]/);
	return (coupe < 0 ? texte : texte.slice(0, coupe)).trim();
}

/** Une fiche du carnet, telle que la défense la montre. */
export function proDuCarnet(fiche: FicheIntervenant<string>): ProfessionnelAffiche {
	return {
		cle: fiche._id,
		role: fiche.role,
		nom: fiche.nom,
		// Un avocat retenu de l'annuaire a pour ressort son BARREAU ; ailleurs, le
		// ressort noté est un lieu, et il se lit sur la ligne du lieu.
		...(fiche.role === 'AVOCAT' && fiche.ressort !== undefined && fiche.sourceRepertoire !== undefined
			? { barreau: fiche.ressort }
			: fiche.ressort === undefined
				? {}
				: { ressort: fiche.ressort, commune: fiche.ressort }),
		...(fiche.adresse === undefined ? {} : { adresse: fiche.adresse }),
		...(fiche.telephone === undefined ? {} : { telephone: fiche.telephone }),
		...(fiche.courriel === undefined ? {} : { courriel: fiche.courriel }),
		...(fiche.siren === undefined ? {} : { siren: fiche.siren }),
		...(fiche.photoUrl === undefined ? {} : { photoUrl: fiche.photoUrl }),
		specialites: [],
		source:
			fiche.sourceRepertoire === undefined
				? 'Fiche saisie par vous'
				: `${nomDeLaSource(fiche.sourceRepertoire)}${fiche.sourceReleveeLe === undefined ? '' : `, relevé du ${dateCourte(fiche.sourceReleveeLe)}`}`
	};
}

/** Une étude relevée au registre des entreprises. */
export function proDEtude(etude: EtudeProposee, releveeLe?: string): ProfessionnelAffiche {
	return {
		cle: `etude:${etude.siren}`,
		role: 'COMMISSAIRE_DE_JUSTICE',
		nom: etude.nom,
		...(etude.adresse === undefined ? {} : { adresse: etude.adresse }),
		commune: etude.commune,
		specialites: [],
		siren: etude.siren,
		...(etude.latitude === undefined || etude.longitude === undefined
			? {}
			: { latitude: etude.latitude, longitude: etude.longitude }),
		...(etude.creeeLe === undefined ? {} : { creeeLe: etude.creeeLe }),
		...(etude.effectif === undefined ? {} : { effectif: etude.effectif }),
		...(etude.associes === undefined ? {} : { associes: etude.associes }),
		source: `Registre des entreprises${releveeLe === undefined ? '' : `, relevé du ${dateCourte(releveeLe)}`}`
	};
}

/** Un avocat relevé à l'annuaire du Conseil national des barreaux. */
export function proDAvocat(avocat: AvocatProposeAffiche, releveeLe?: string | null): ProfessionnelAffiche {
	const lieu = [avocat.codePostal, avocat.ville].filter((p) => p !== undefined && p !== '').join(' ');
	return {
		cle: `avocat:${avocat.barreau}|${avocat.nom}|${avocat.prenom}`,
		role: 'AVOCAT',
		nom: `${avocat.prenom} ${avocat.nom}`.trim(),
		...(avocat.raisonSociale === undefined ? {} : { cabinet: avocat.raisonSociale }),
		barreau: avocat.barreau,
		...(avocat.adresse === undefined && lieu === ''
			? {}
			: {
					adresse: [avocat.adresse, lieu].filter((p) => p !== undefined && p !== '').join(', ')
				}),
		...(avocat.ville === undefined ? {} : { commune: avocat.ville }),
		specialites: avocat.specialites,
		...(avocat.siren === undefined ? {} : { siren: avocat.siren }),
		source: `Annuaire du Conseil national des barreaux${releveeLe === undefined || releveeLe === null ? '' : `, relevé du ${dateCourte(releveeLe)}`}`
	};
}

/** L'étude est-elle déjà au carnet ? Elle s'y reconnaît à son SIREN. */
export function etudeAuCarnet(
	carnet: readonly FicheIntervenant<string>[],
	etude: EtudeProposee
): boolean {
	return carnet.some((f) => f.role === 'COMMISSAIRE_DE_JUSTICE' && f.siren === etude.siren);
}

/** L'avocat est-il déjà au carnet ? À son nom et à son barreau, faute d'identifiant propre. */
export function avocatAuCarnet(
	carnet: readonly FicheIntervenant<string>[],
	avocat: AvocatProposeAffiche
): boolean {
	const nom = `${avocat.prenom} ${avocat.nom}`.trim();
	return carnet.some((f) => f.role === 'AVOCAT' && f.nom === nom && f.ressort === avocat.barreau);
}

/** Ce qu'on regarde dans la feuille : une fiche, et le geste qui la choisit. */
interface FicheOuverte {
	readonly pro: ProfessionnelAffiche;
	readonly dansLEquipe: boolean;
	readonly gestes: GestesDeLaFiche;
}

/**
 * LES PROFESSIONNELS PRÈS DU CLIENT — la liste que le fondateur a demandée.
 *
 * ⚠️ UN TOUCHER, ET C'EST FAIT. Le disque au bout d'une carte ajoute l'étude ou
 * l'avocat au carnet (avec sa source et sa date de relevé, comme avant) ET le
 * choisit : la feuille se referme. Toucher la carte elle-même ouvre sa FICHE —
 * le portrait, la carte de son cabinet, ce que les sources publient —, où le
 * même geste porte le bouton plein.
 */
function Propositions({
	propositions,
	carnet,
	enCours,
	onRetenirEtude,
	onRetenirAvocat,
	onChercherUnCommissaire,
	onChercherUnAvocat,
	onVoir,
	libelleChoisir,
	ajout = false,
	role
}: {
	propositions: PropositionsAffichees;
	carnet: readonly FicheIntervenant<string>[];
	enCours: boolean;
	/** Un seul groupe quand le geste vise une profession — le courrier à l'avocat. */
	role?: 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE';
	onRetenirEtude: (etude: EtudeProposee) => void;
	onRetenirAvocat: (avocat: AvocatProposeAffiche) => void;
	onChercherUnCommissaire?: () => void;
	onChercherUnAvocat?: () => void;
	onVoir: (fiche: FicheOuverte) => void;
	libelleChoisir: string;
	/** L'écran « Défense » : le disque ajoute à l'équipe au lieu de choisir pour un dossier. */
	ajout?: boolean;
}) {
	const [toutesLesEtudes, setToutesLesEtudes] = useState(false);

	if (propositions.etat === 'CHARGEMENT') {
		return (
			<p className="flex items-center gap-cladd-3xs px-1 text-cladd-2xs text-cladd-fg-soft">
				<Spinner size="xs" />
				Recherche des professionnels près de votre client…
			</p>
		);
	}

	if (propositions.etat === 'ECHEC' || propositions.etat === 'LIEU_INCONNU') {
		return (
			<div className="flex flex-col gap-cladd-3xs px-1">
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{propositions.etat === 'ECHEC'
						? propositions.message
						: `Le lieu de ${propositions.client} n’est pas connu : son SIREN, sur sa fiche, le donnera, et la liste des professionnels près de lui s’affichera ici.`}
				</p>
				<div className="flex flex-wrap gap-cladd-3xs">
					{onChercherUnCommissaire === undefined ? null : (
						<BoutonTexte onClick={onChercherUnCommissaire}>Chercher un commissaire</BoutonTexte>
					)}
					{onChercherUnAvocat === undefined ? null : (
						<BoutonTexte onClick={onChercherUnAvocat}>Chercher un avocat</BoutonTexte>
					)}
				</div>
			</div>
		);
	}

	const { client, lieu, commissaires, avocats } = propositions;
	const depuis: Depuis | undefined =
		lieu.latitude === undefined || lieu.longitude === undefined
			? undefined
			: { client, latitude: lieu.latitude, longitude: lieu.longitude };
	const ou =
		lieu.commune === null
			? `département ${lieu.departement}`
			: `${lieu.commune} (${lieu.departement})`;
	const etudes = commissaires.etat === 'TROUVE' ? commissaires.etudes : [];
	const etudesMontrees = toutesLesEtudes ? etudes : etudes.slice(0, ETUDES_MONTREES);
	const releveEtudes = commissaires.etat === 'TROUVE' ? commissaires.releveeLe : undefined;

	/**
	 * Une carte de proposition. Dans le choix d'un dossier, son disque CHOISIT ;
	 * sur l'écran « Défense », il AJOUTE à l'équipe — et se coche pour qui en est
	 * déjà.
	 */
	const carte = (pro: ProfessionnelAffiche, dansLEquipe: boolean, retenir: () => void, distance?: string) => {
		const dejaFait = ajout && dansLEquipe;
		return (
			<CarteProfessionnel
				key={pro.cle}
				pro={pro}
				dansLEquipe={dansLEquipe}
				{...(distance === undefined ? {} : { distance })}
				onOuvrir={() =>
					onVoir({
						pro,
						dansLEquipe,
						gestes: dejaFait ? {} : { principal: { libelle: libelleChoisir, onClick: retenir } }
					})
				}
				geste={
					<GesteDeCarte
						fait={dejaFait}
						libelle={
							dejaFait
								? `${pro.nom}, dans votre équipe`
								: ajout
									? `Ajouter ${pro.nom} à mon équipe`
									: `Choisir ${pro.nom}`
						}
						desactive={enCours || dejaFait}
						onClick={retenir}
					/>
				}
			/>
		);
	};

	const carteEtude = (etude: EtudeProposee) =>
		carte(
			proDEtude(etude, releveEtudes),
			etudeAuCarnet(carnet, etude),
			() => {
				if (!enCours) onRetenirEtude(etude);
			},
			distanceDepuis(depuis, etude)
		);

	const carteAvocat = (avocat: AvocatProposeAffiche) =>
		carte(proDAvocat(avocat, avocats?.releveeLe), avocatAuCarnet(carnet, avocat), () => {
			if (!enCours) onRetenirAvocat(avocat);
		});

	return (
		<>
			{role === 'AVOCAT' ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<TitreDeGroupe titre="Commissaires de justice" precision={`Près de ${client} · ${ou}`} />
					{commissaires.etat === 'ECHEC' ? (
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{commissaires.message}
						</p>
					) : etudes.length === 0 ? (
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Aucune étude relevée dans ce département.
						</p>
					) : (
						<>
							<div className="flex flex-col gap-2">{etudesMontrees.map(carteEtude)}</div>
							{etudes.length > ETUDES_MONTREES && !toutesLesEtudes ? (
								<BoutonTexte className="self-start" onClick={() => setToutesLesEtudes(true)}>
									Voir les {etudes.length - ETUDES_MONTREES} autres
								</BoutonTexte>
							) : null}
						</>
					)}
				</section>
			)}

			{role === 'COMMISSAIRE_DE_JUSTICE' ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<TitreDeGroupe titre="Avocats" precision={`Près de ${client} · ${ou}`} />
					{avocats === null || avocats.releveeLe === null ? (
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							L’annuaire des avocats se met à jour chaque nuit depuis le fichier national ; il n’est
							pas encore chargé.
						</p>
					) : avocats.specialises.length === 0 && avocats.autres.length === 0 ? (
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Aucun avocat relevé dans ce département.
						</p>
					) : (
						<>
							{avocats.specialises.length === 0 ? null : (
								<>
									<p className="px-1 text-cladd-2xs leading-snug text-cladd-fg-soft">
										Ont déclaré une spécialité en droit commercial, ou en sûretés et mesures
										d’exécution
									</p>
									<div className="flex flex-col gap-2">{avocats.specialises.map(carteAvocat)}</div>
								</>
							)}
							{avocats.autres.length === 0 ? null : (
								<>
									{avocats.specialises.length === 0 ? null : (
										<p className="px-1 text-cladd-2xs leading-snug text-cladd-fg-soft">
											Les autres{lieu.commune === null ? '' : `, à ${lieu.commune} d’abord`}
										</p>
									)}
									<div className="flex flex-col gap-2">{avocats.autres.map(carteAvocat)}</div>
								</>
							)}
							{avocats.autresEnPlus && onChercherUnAvocat !== undefined ? (
								<BoutonTexte className="self-start" onClick={onChercherUnAvocat}>
									Chercher parmi tous les avocats d’un barreau
								</BoutonTexte>
							) : null}
						</>
					)}
				</section>
			)}

			{/*
			  ⚠️ LES SOURCES, ÉCRITES. Ni l'une ni l'autre n'est le tableau d'une
			  profession, et « près de » n'est pas « compétent » : le référentiel ne
			  relève pas quelle profession ni quel ressort convient à quel acte.
			*/}
			<p className="px-1 text-cladd-3xs leading-relaxed text-cladd-fg-softest">
				{commissaires.etat === 'TROUVE'
					? `Études : registre des entreprises, relevé du ${dateCourte(commissaires.releveeLe)}. `
					: ''}
				{avocats !== null && avocats.releveeLe !== null
					? `Avocats : annuaire du Conseil national des barreaux, relevé du ${dateCourte(avocats.releveeLe)}. `
					: ''}
				« Près de » dit où ils exercent, pas qui est compétent : rien n’est présélectionné. Les
				portraits sont dessinés d’après le nom ; aucune source ne publie leur photo.
			</p>
		</>
	);
}

/**
 * QUI FAIT L'ACTE — UNE FEUILLE, ET TOUT Y EST PROPOSÉ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE LE GÉRANT DEVAIT FAIRE, ET CE QU'IL FAIT (01/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Avant : enregistrer d'abord un avocat ou un commissaire dans le carnet de son
 * compte, ou ouvrir depuis cette feuille une recherche, y taper un département
 * ou choisir un barreau parmi cent soixante, puis une spécialité, retenir une
 * fiche, revenir ici et la choisir. Le fondateur : « pourquoi on doit nous-même
 * mettre les caractéristiques (régions, villes, spécialités) alors qu'on a déjà
 * toutes les infos sur l'affaire ? pourquoi ne pas directement proposer la
 * liste dans le dossier ? »
 *
 * Maintenant : « Moi-même » et le carnet en tête ; puis les études et les
 * avocats près du client, lus d'après son SIREN ; un toucher choisit. La saisie
 * à la main reste, en dernier, pour quelqu'un qu'aucune source ne connaît.
 *
 * ⚠️ ET DEPUIS LE 08/10/2026, CHACUN SE MONTRE COMME UNE PERSONNE. Une carte par
 * professionnel — son portrait, sa profession, où il exerce et à quelle distance
 * du client, ce qu'il a déclaré — et sa FICHE au toucher, DANS la feuille (comme
 * une page qu'on pousse chez iOS : un retour en haut, la liste n'est pas perdue).
 *
 * ⚠️ LES CRITÈRES SONT CEUX DE L'AFFAIRE, ET ILS SONT ÉCRITS. Le lieu du client,
 * et pour les avocats la spécialité DÉCLARÉE au fichier national — un fait du
 * fichier, nommé dans le titre du groupe, jamais un avis sur qui défendrait
 * mieux. Dans chaque groupe, l'ordre reste alphabétique, et rien n'est
 * présélectionné.
 */
export function ChoixIntervenant<I extends string>({
	carnet,
	choisi,
	ouverte,
	titre = 'Qui fait l’acte',
	sansPersonne = { titre: 'Moi-même', precision: 'Aucun professionnel' },
	propositions,
	enCours = false,
	erreur = null,
	onFermer,
	onChoisir,
	onRetenirEtude,
	onRetenirAvocat,
	onAjouter,
	onChercherUnCommissaire,
	onChercherUnAvocat,
	role,
	plusieurs
}: {
	carnet: readonly FicheIntervenant<I>[];
	/** `null` : moi-même ; `undefined` : rien de choisi encore. */
	choisi?: I | null;
	ouverte: boolean;
	titre?: string;
	/** Le premier choix, celui qui ne nomme personne : « Moi-même » pour un acte. */
	sansPersonne?: { readonly titre: string; readonly precision: string } | null;
	/**
	 * La profession que le geste vise, quand il en vise une : le carnet et les
	 * propositions ne montrent qu'elle. Une lettre à l'avocat ne s'adresse pas
	 * à un commissaire.
	 */
	role?: 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE';
	propositions: PropositionsAffichees;
	enCours?: boolean;
	/** Le refus du dernier ajout au carnet : il se lit dans la feuille, là où le geste a eu lieu. */
	erreur?: string | null;
	onFermer: () => void;
	onChoisir: (intervenantId: I | null) => void;
	/** Ajoute l'étude au carnet ET la choisit. */
	onRetenirEtude: (etude: EtudeProposee) => void;
	/** Ajoute l'avocat au carnet ET le choisit. */
	onRetenirAvocat: (avocat: AvocatProposeAffiche) => void;
	onAjouter: (fiche: FicheASaisir) => void;
	onChercherUnCommissaire?: () => void;
	onChercherUnAvocat?: () => void;
	/**
	 * PLUSIEURS PERSONNES SUR LE MÊME DOSSIER (06/10/2026) — un avocat ET un
	 * commissaire de justice. Fourni, chaque toucher coche ou décoche une fiche
	 * sans refermer la feuille, « Moi-même » décoche tout, et « Terminé » ferme.
	 * Absent, la feuille garde un choix unique, comme pour une lettre ou une
	 * remise qui ne vont qu'à une personne.
	 */
	plusieurs?: {
		readonly choisis: readonly I[];
		readonly onBasculer: (intervenantId: I, designe: boolean) => void;
		readonly onPersonne: () => void;
	};
}) {
	const [autre, setAutre] = useState(false);
	const [ouverteSur, setOuverteSur] = useState<FicheOuverte | null>(null);
	const estChoisie = (id: I) =>
		plusieurs === undefined ? choisi === id : plusieurs.choisis.includes(id);
	const siens = role === undefined ? carnet : carnet.filter((fiche) => fiche.role === role);
	const depuis: Depuis | undefined =
		propositions.etat === 'PRET' &&
		propositions.lieu.latitude !== undefined &&
		propositions.lieu.longitude !== undefined
			? {
					client: propositions.client,
					latitude: propositions.lieu.latitude,
					longitude: propositions.lieu.longitude
				}
			: undefined;

	/** Choisir une fiche du carnet, ou la cocher quand le dossier en nomme plusieurs. */
	const basculer = (id: I) =>
		plusieurs === undefined
			? onChoisir(id)
			: plusieurs.onBasculer(id, !plusieurs.choisis.includes(id));

	/** Le geste choisit : la fiche se referme avec la feuille, ou revient à la liste. */
	const voir = (fiche: FicheOuverte) =>
		setOuverteSur({
			...fiche,
			gestes: {
				...fiche.gestes,
				...(fiche.gestes.principal === undefined
					? {}
					: {
							principal: {
								libelle: fiche.gestes.principal.libelle,
								onClick: () => {
									setOuverteSur(null);
									fiche.gestes.principal?.onClick();
								}
							}
						})
			}
		});

	const libelleChoisir = plusieurs === undefined ? 'Choisir ce professionnel' : 'Ajouter au dossier';

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) {
					setOuverteSur(null);
					onFermer();
				}
			}}
			headerLeft={
				ouverteSur === null ? (
					<span className="px-2 pb-1 text-cladd-xs font-semibold">{titre}</span>
				) : (
					<BoutonTexte className="pb-1" onClick={() => setOuverteSur(null)}>
						<ChevronLeftIcon />
						{titre}
					</BoutonTexte>
				)
			}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				{ouverteSur !== null ? (
					<FicheProfessionnel
						pro={ouverteSur.pro}
						dansLEquipe={ouverteSur.dansLEquipe}
						gestes={{ ...ouverteSur.gestes, enCours }}
						{...(depuis === undefined ? {} : { depuis })}
					/>
				) : (
					<div className="flex flex-col gap-cladd-xs">
						{erreur === null ? null : (
							<p role="alert" className="px-1 text-cladd-xs leading-relaxed text-cladd-fg">
								{erreur}
							</p>
						)}
						{/* ⚠️ « MOI-MÊME » EN PREMIER, et pas par courtoisie : un gérant qui
						    dépose lui-même est un cas courant, et le reléguer après les
						    professionnels ferait lire la liste comme une incitation à en
						    prendre un. */}
						{sansPersonne === null ? null : (
							<ListeAnalyses>
								<LigneBouton
									genre="contenu"
									titre={sansPersonne.titre}
									precision={sansPersonne.precision}
									icone={
										<Coche
											choisie={
												plusieurs === undefined ? choisi === null : plusieurs.choisis.length === 0
											}
										/>
									}
									onClick={() =>
										plusieurs === undefined ? onChoisir(null) : plusieurs.onPersonne()
									}
								/>
							</ListeAnalyses>
						)}

						{siens.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								{/* L'équipe a son écran (08/10/2026) : le titre y mène, pour ajouter une
								    photo, appeler, ou retirer quelqu'un sans quitter ce qu'on fait. */}
								<div className="flex items-baseline justify-between gap-2 pr-1">
									<TitreDeGroupe titre="Votre équipe" />
									<Lien
										to="/app/defense"
										className="text-cladd-2xs font-medium text-cladd-primary"
									>
										Votre défense
									</Lien>
								</div>
								<div className="flex flex-col gap-2">
									{siens.map((fiche) => {
										const pro = proDuCarnet(fiche);
										const fait = estChoisie(fiche._id);
										return (
											<CarteProfessionnel
												key={fiche._id}
												pro={pro}
												choisi={fait}
												onOuvrir={() =>
													voir({
														pro,
														dansLEquipe: true,
														gestes: {
															principal: {
																libelle: fait
																	? plusieurs === undefined
																		? 'Garder ce choix'
																		: 'Retirer du dossier'
																	: libelleChoisir,
																onClick: () => basculer(fiche._id)
															}
														}
													})
												}
												geste={
													<GesteDeCarte
														fait={fait}
														libelle={fait ? `${fiche.nom}, choisi` : `Choisir ${fiche.nom}`}
														onClick={() => basculer(fiche._id)}
													/>
												}
											/>
										);
									})}
								</div>
							</section>
						)}

						<Propositions
							role={role}
							carnet={carnet}
							propositions={propositions}
							enCours={enCours}
							onRetenirEtude={onRetenirEtude}
							onRetenirAvocat={onRetenirAvocat}
							onChercherUnCommissaire={onChercherUnCommissaire}
							onChercherUnAvocat={onChercherUnAvocat}
							onVoir={voir}
							libelleChoisir={libelleChoisir}
						/>

						{autre ? (
							<SaisirUneFiche
								onAjouter={onAjouter}
								onChercherUnCommissaire={onChercherUnCommissaire}
								onChercherUnAvocat={onChercherUnAvocat}
							/>
						) : (
							<BoutonTexte className="self-start" onClick={() => setAutre(true)}>
								Quelqu’un d’autre
							</BoutonTexte>
						)}

						{plusieurs === undefined ? null : (
							<BoutonPrincipal pleineLargeur onClick={onFermer}>
								Terminé
							</BoutonPrincipal>
						)}
					</div>
				)}
			</PopupContent>
		</Popup>
	);
}

/**
 * LES PROFESSIONNELS PRÈS D'UN CLIENT, POUR L'ÉQUIPE (08/10/2026) — la même liste
 * que dans « Qui fait l'acte », ouverte depuis l'écran « Défense » : on n'y
 * choisit pas qui fait un acte, on compose son équipe. Le disque AJOUTE (et se
 * coche pour qui en est déjà), la fiche s'ouvre dans la feuille, et rien ne se
 * referme tant que le gérant n'a pas fini.
 */
export function FeuillePresDuClient({
	client,
	ouverte,
	carnet,
	propositions,
	enCours = false,
	erreur = null,
	onFermer,
	onAjouterEtude,
	onAjouterAvocat
}: {
	readonly client: string;
	readonly ouverte: boolean;
	readonly carnet: readonly FicheIntervenant<string>[];
	readonly propositions: PropositionsAffichees;
	readonly enCours?: boolean;
	readonly erreur?: string | null;
	readonly onFermer: () => void;
	readonly onAjouterEtude: (etude: EtudeProposee) => void;
	readonly onAjouterAvocat: (avocat: AvocatProposeAffiche) => void;
}) {
	const [ouverteSur, setOuverteSur] = useState<FicheOuverte | null>(null);
	const titre = `Près de ${client}`;
	const depuis: Depuis | undefined =
		propositions.etat === 'PRET' &&
		propositions.lieu.latitude !== undefined &&
		propositions.lieu.longitude !== undefined
			? {
					client: propositions.client,
					latitude: propositions.lieu.latitude,
					longitude: propositions.lieu.longitude
				}
			: undefined;
	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) {
					setOuverteSur(null);
					onFermer();
				}
			}}
			headerLeft={
				ouverteSur === null ? (
					<span className="px-2 pb-1 text-cladd-xs font-semibold">{titre}</span>
				) : (
					<BoutonTexte className="pb-1" onClick={() => setOuverteSur(null)}>
						<ChevronLeftIcon />
						{titre}
					</BoutonTexte>
				)
			}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				{ouverteSur !== null ? (
					<FicheProfessionnel
						pro={ouverteSur.pro}
						dansLEquipe={ouverteSur.dansLEquipe}
						gestes={{
							...(ouverteSur.gestes.principal === undefined
								? {}
								: {
										principal: {
											libelle: ouverteSur.gestes.principal.libelle,
											onClick: () => {
												ouverteSur.gestes.principal?.onClick();
												setOuverteSur(null);
											}
										}
									}),
							enCours
						}}
						{...(depuis === undefined ? {} : { depuis })}
					/>
				) : (
					<div className="flex flex-col gap-cladd-xs">
						{erreur === null ? null : (
							<p role="alert" className="px-1 text-cladd-xs leading-relaxed text-cladd-fg">
								{erreur}
							</p>
						)}
						<Propositions
							carnet={carnet}
							propositions={propositions}
							enCours={enCours}
							onRetenirEtude={onAjouterEtude}
							onRetenirAvocat={onAjouterAvocat}
							onVoir={setOuverteSur}
							libelleChoisir="Ajouter à mon équipe"
							ajout
						/>
					</div>
				)}
			</PopupContent>
		</Popup>
	);
}

/**
 * AJOUTER UNE FICHE AU CARNET : les deux recherches, puis la saisie.
 *
 * ⚠️ EXTRAITE, ET PAS RECOPIÉE. Le carnet vit à DEUX endroits depuis
 * `/app/compte` : dans la feuille « Qui fait l'acte », où l'on choisit qui fait
 * l'acte d'une créance, et dans la section « Votre carnet », où l'on ne choisit
 * rien. Une seconde copie du formulaire aurait divergé au premier ajustement,
 * sans qu'aucun test tombe — et c'est exactement le défaut que ce dépôt combat
 * partout ailleurs.
 *
 * ⚠️ LA RECHERCHE AVANT LA SAISIE, et c'est la règle d'écran n° 1 prise dans le
 * bon sens : « aucun écran ne demande une saisie que le logiciel peut déduire ».
 * Un nom d'étude, son adresse et son SIREN se trouvent dans une source
 * publique ; les faire recopier à la main était un champ vide que le logiciel
 * aurait pu remplir.
 *
 * ⚠️ ET LA SAISIE MANUELLE RESTE, DESSOUS. Aucune source publique n'est le
 * tableau d'une profession : une étude qui n'a pas déclaré sa convention
 * collective est introuvable, et un avocat ne s'y cherche pas du tout. On
 * remplace une porte par une meilleure, on n'en condamne pas.
 */
export function SaisirUneFiche({
	onAjouter,
	onChercherUnCommissaire,
	onChercherUnAvocat
}: {
	onAjouter: (fiche: FicheASaisir) => void;
	/** Voir `ChoixIntervenant` : absent, le geste n'apparaît pas — plutôt qu'un bouton mort. */
	onChercherUnCommissaire?: () => void;
	onChercherUnAvocat?: () => void;
}) {
	const [nom, setNom] = useState('');
	const [role, setRole] = useState<RoleIntervenant>('AUTRE');
	const [ressort, setRessort] = useState('');

	const nomSaisi = nom.trim();
	const ressortSaisi = ressort.trim();

	return (
		<>
			<SectionTitle>Ajouter une fiche</SectionTitle>

			{onChercherUnCommissaire === undefined && onChercherUnAvocat === undefined ? null : (
				<List className="mt-cladd-3xs">
					{onChercherUnCommissaire === undefined ? null : (
						<ListButton
							icon={<SearchIcon size={18} />}
							footer="Les études d’un département, sans quitter l’application"
							className="verre-bouton"
							hoverable={false}
							onClick={onChercherUnCommissaire}
						>
							<span className="truncate">Chercher un commissaire de justice</span>
						</ListButton>
					)}
					{/*
					  ⚠️ LA SECONDE RANGÉE NE DIT PAS LA MÊME CHOSE QUE LA PREMIÈRE, et
					  c'est voulu : les deux professions ne se cherchent pas dans la même
					  source. Les études viennent d'un registre interrogé en direct, les
					  avocats d'un fichier ingéré, daté du jour de sa publication. Écrire
					  deux fois le même sous-titre ferait croire à deux portes vers un
					  même annuaire officiel, qui n'existe pas.
					*/}
					{onChercherUnAvocat === undefined ? null : (
						<ListButton
							icon={<SearchIcon size={18} />}
							footer="Les avocats d’un barreau, par spécialité déclarée"
							className="verre-bouton"
							hoverable={false}
							onClick={onChercherUnAvocat}
						>
							<span className="truncate">Chercher un avocat</span>
						</ListButton>
					)}
				</List>
			)}

			<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
				<Input
					size="lg"
					value={nom}
					onChange={setNom}
					placeholder="Nom"
					infoMessage="Le cabinet ou la personne, tel que vous le nommez."
				/>
				<Select
					className="w-full"
					surface="cut"
					size="lg"
					title="Rôle"
					options={[...ROLES]}
					value={role}
					getOptionValue={(option) => option.cle}
					onChange={(cle) => setRole(cle)}
					renderOption={({ value }) => value.libelle}
					keyboardHints={false}
				>
					{libelleRole(role)}
				</Select>
				<Input
					size="lg"
					value={ressort}
					onChange={setRessort}
					placeholder="Ressort"
					infoMessage="Facultatif. Vide veut dire « non noté », jamais « aucun »."
				/>
				<BoutonPrincipal
					readOnly={nomSaisi === ''}
					onClick={() => {
						onAjouter({
							nom: nomSaisi,
							role,
							ressort: ressortSaisi === '' ? undefined : ressortSaisi
						});
						setNom('');
						setRessort('');
						setRole('AUTRE');
					}}
				>
					Ajouter au carnet
				</BoutonPrincipal>
			</div>
		</>
	);
}

/**
 * CE QU'UNE FEUILLE « QUI FAIT L'ACTE » REÇOIT DE SA ROUTE, EN UN SEUL OBJET.
 *
 * La lecture des professionnels près du client vit dans la route (elle
 * interroge le registre et l'annuaire) ; la feuille, elle, s'ouvre depuis trois
 * endroits — « Qui fait l'acte » au dossier, la déclaration d'une voie, la
 * remise au conseil. Un objet plutôt que quatre props répétées trois fois.
 */
export interface ProfessionnelsProposes {
	readonly propositions: PropositionsAffichees;
	/** Lance la lecture si elle n'a pas eu lieu : appelée à l'ouverture de la feuille. */
	readonly onDemander: () => void;
	/** Ajoute l'étude au carnet — ou la retrouve — et rend l'identifiant de sa fiche. */
	readonly onRetenirEtude: (etude: EtudeProposee) => Promise<string | null>;
	/** Ajoute l'avocat au carnet — ou le retrouve — et rend l'identifiant de sa fiche. */
	readonly onRetenirAvocat: (avocat: AvocatProposeAffiche) => Promise<string | null>;
	/** Ajoute une fiche saisie à la main, et rend son identifiant. */
	readonly onAjouter: (fiche: FicheASaisir) => Promise<string | null>;
	readonly enCours: boolean;
	/** Le refus du dernier geste, lisible, ou `null`. */
	readonly erreur: string | null;
}
