import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { Button, Input, SearchField, Spinner } from '@cladd-ui/react';
import { GlobeIcon, MapPinIcon, PencilLineIcon, UserRoundIcon, XIcon } from 'lucide-react';
import { BoutonPrincipal, BoutonSecondaire, BoutonTexte } from './bouton';
import { cn } from './cn';
import { EnTeteDeGroupe } from './en-tete-groupe';
import {
	proDuCarnet,
	type AvocatProposeAffiche,
	type EtudeProposee,
	type FicheASaisir,
	type FicheIntervenant
} from './fiches-professionnels';
import { useDeuxVolets } from './maitre-detail';
import {
	JaugeDEtapes,
	BarreDePleinEcran,
	ColonneDePleinEcran,
	PiedDePleinEcran,
	PleinEcran
} from './plein-ecran';
import {
	AvatarProfessionnel,
	CarteProfessionnel,
	FicheProfessionnel,
	GesteDeCarte,
	type Depuis,
	type ProfessionnelAffiche
} from './professionnel';

/**
 * LE PARCOURS DU CHOIX — UNE PAGE, DES ÉTAPES, UN RÉSUMÉ (12/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL REMPLACE, ET POURQUOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur, sur la feuille « Qui fait l'acte » : « encore trop complexe à
 * manipuler, surtout avec des scrolls dans une popup ; une barre de recherche,
 * ne pas afficher avocats et commissaires sur la même page, un défilement infini,
 * voir ceux qu'on a sélectionnés, puis un écran de fin avec le résumé et la
 * confirmation — et le MÊME parcours dans le dossier et dans le carnet ».
 *
 * Relevé sur Mobbin : la création d'un groupe chez Splitwise, Chime, PayPal,
 * Telegram, Luma et Bluesky (une page pleine, la recherche en tête, les choisis
 * en portraits, UN bouton « Continuer », puis « Review » et la confirmation), la
 * recherche d'un praticien chez Alan et Zocdoc (une profession à la fois, la
 * fiche au toucher), les questionnaires de Nutmeg (une barre d'étapes et une
 * croix pour sortir à tout moment).
 *
 *   · UNE PAGE PLEINE, qu'on ferme d'une croix : c'est une feuille de Cladd tirée
 *     sur tout l'écran, donc elle s'empile proprement au-dessus d'une autre
 *     feuille (la déclaration d'une voie, la remise au conseil, un courrier) ;
 *   · UNE PROFESSION PAR ÉTAPE — « Quel avocat ? », puis « Quel commissaire de
 *     justice ? » —, puis le résumé ;
 *   · la recherche et le lieu restent collés en haut ; la liste défile sans fin ;
 *   · les choisis se voient en bas, en portraits, au-dessus du seul bouton plein ;
 *   · rien n'est écrit avant « Confirmer » : un professionnel trouvé dans un
 *     annuaire n'entre au carnet qu'à ce moment, avec sa source et sa date.
 *
 * ⚠️ LES LIGNES ROUGES TIENNENT. Rien n'est présélectionné ; « Moi-même » reste un
 * choix de premier rang (le résumé le dit quand personne n'est choisi) ; l'ordre
 * est celui des noms, sauf quand le gérant tape — les résultats suivent alors SA
 * saisie. « Près de » dit où ils exercent, pas qui est compétent.
 *
 * ⚠️ IL N'INTERROGE RIEN LUI-MÊME. Tout entre par `annuaire`, que la route
 * construit (`app/use-annuaire.ts`) : `src/ui` ne connaît pas Convex.
 */

export type ProfessionCherchee = 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE';

/** D'où vient un professionnel proposé — et donc ce que « Confirmer » doit écrire. */
export type OrigineDuPro =
	| { readonly genre: 'CARNET'; readonly id: string }
	| {
			readonly genre: 'ETUDE';
			readonly etude: EtudeProposee;
			readonly source: string;
			readonly releveeLe: string;
	  }
	| {
			readonly genre: 'AVOCAT';
			readonly avocat: AvocatProposeAffiche;
			readonly source: string;
			readonly releveeLe: string;
	  }
	| { readonly genre: 'SAISIE'; readonly fiche: FicheASaisir };

/** Un professionnel tel que le parcours le propose. */
export interface ProPropose {
	readonly pro: ProfessionnelAffiche;
	readonly origine: OrigineDuPro;
	/** « à 3,2 km », depuis le siège du client. */
	readonly distance?: string;
	/** Déjà dans l'équipe du gérant (son carnet). */
	readonly dansLEquipe: boolean;
}

/** Un endroit où chercher : « Près de Durand », « Toute la France ». */
export interface PorteeAffichee {
	readonly cle: string;
	readonly libelle: string;
}

export interface RequeteAffichee {
	readonly texte: string;
	/** La clé d'une `PorteeAffichee`. */
	readonly portee: string;
}

export interface GroupeDeResultats {
	readonly cle: string;
	readonly titre?: string;
	readonly precision?: string;
	readonly pros: readonly ProPropose[];
	/** Un groupe court qui en cache d'autres : « Voir les autres ». */
	readonly onPlus?: () => void;
}

/**
 * CE QUE L'ANNUAIRE REND POUR UNE PROFESSION ET UNE REQUÊTE.
 *
 * ⚠️ « À SAISIR » N'EST PAS « VIDE ». Toute la France sans un nom ne se déroule
 * pas : l'écran demande un nom, il ne dit pas « personne ». Et un échec ne porte
 * aucune liste, par construction.
 */
export type ResultatsAffiches =
	| { readonly etat: 'A_SAISIR'; readonly message: string }
	| { readonly etat: 'CHARGEMENT' }
	| { readonly etat: 'ECHEC'; readonly message: string }
	| {
			readonly etat: 'PRET';
			readonly groupes: readonly GroupeDeResultats[];
			/** Il en reste : le bas de la liste en demande d'autres. */
			readonly peutCharger: boolean;
			readonly chargeEncore: boolean;
			/** La source et sa date de relevé, écrites sous la liste. */
			readonly mention: string;
			/** Le siège du client, pour la distance dans la fiche. */
			readonly depuis?: Depuis;
	  };

/**
 * L'ANNUAIRE DU PARCOURS — ce que la route lui donne à lire, et les gestes qui le
 * font avancer. Une requête par profession : passer de l'avocat au commissaire ne
 * perd ni la recherche ni le lieu de l'autre.
 */
export interface AnnuaireDuParcours {
	readonly portees: readonly PorteeAffichee[];
	readonly requetes: Readonly<Record<ProfessionCherchee, RequeteAffichee>>;
	readonly onRequete: (profession: ProfessionCherchee, requete: RequeteAffichee) => void;
	readonly resultats: Readonly<Record<ProfessionCherchee, ResultatsAffiches>>;
	readonly onChargerPlus: (profession: ProfessionCherchee) => void;
	/**
	 * Lance la lecture du lieu du client : appelée par le geste qui ouvre le parcours.
	 * Une portée donnée y place les deux recherches (« Près de Durand », depuis sa carte).
	 */
	readonly onDemander: (portee?: string) => void;
	/**
	 * Écrit au carnet ce qui n'y est pas encore (avec sa source et sa date), et rend
	 * les identifiants de tous les choisis — ou `null` si l'écriture a été refusée.
	 */
	readonly retenir: (choisis: readonly ProPropose[]) => Promise<readonly string[] | null>;
	readonly enCours: boolean;
	readonly erreur: string | null;
}

const NOM_PROFESSION: Readonly<Record<ProfessionCherchee, string>> = {
	AVOCAT: 'Avocat',
	COMMISSAIRE_DE_JUSTICE: 'Commissaire de justice'
};

const PLURIEL_PROFESSION: Readonly<Record<ProfessionCherchee, string>> = {
	AVOCAT: 'Avocats',
	COMMISSAIRE_DE_JUSTICE: 'Commissaires de justice'
};

/** « Quel avocat ? », « Des avocats pour votre équipe », « À quel avocat ? ». */
function questionDeLEtape(profession: ProfessionCherchee, but: ButDuParcours, unSeul: boolean) {
	if (but === 'EQUIPE') {
		return profession === 'AVOCAT'
			? 'Des avocats pour votre équipe'
			: 'Des commissaires de justice pour votre équipe';
	}
	if (unSeul)
		return profession === 'AVOCAT' ? 'À quel avocat ?' : 'À quel commissaire de justice ?';
	return profession === 'AVOCAT' ? 'Quel avocat ?' : 'Quel commissaire de justice ?';
}

export type ButDuParcours = 'DOSSIER' | 'EQUIPE';

/** Ce qui est choisi, rangé par clé de fiche : un toucher ajoute, un second retire. */
type Choisis = ReadonlyMap<string, ProPropose>;

/** Un professionnel du carnet, tel que le parcours le propose. */
function duCarnet(fiche: FicheIntervenant<string>): ProPropose {
	return {
		pro: proDuCarnet(fiche),
		origine: { genre: 'CARNET', id: fiche._id },
		dansLEquipe: true
	};
}

/** Les mots tapés se retrouvent-ils tous dans le nom ou la commune ? */
function correspond(pro: ProfessionnelAffiche, texte: string): boolean {
	const plat = (s: string) =>
		s
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase();
	const dans = plat([pro.nom, pro.cabinet, pro.commune, pro.barreau, pro.ressort].join(' '));
	return plat(texte)
		.split(/\s+/)
		.filter((mot) => mot !== '')
		.every((mot) => dans.includes(mot));
}

/** « Ajouter à mon équipe », « Ajouter 1 professionnel », « Ajouter 3 professionnels ». */
function libelleAjout(nouveaux: number): string {
	if (nouveaux === 0) return 'Ajouter à mon équipe';
	return `Ajouter ${nouveaux} professionnel${nouveaux > 1 ? 's' : ''}`;
}

/** « Marie Dupont », « Marie Dupont et Étude Martin », « Marie Dupont et 2 autres ». */
function resumeDesChoisis(choisis: readonly ProPropose[]): string {
	const [premier, second] = choisis;
	if (premier === undefined) return '';
	if (second === undefined) return premier.pro.nom;
	if (choisis.length === 2) return `${premier.pro.nom} et ${second.pro.nom}`;
	return `${premier.pro.nom} et ${choisis.length - 1} autres`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LES PIÈCES DE L'ÉCRAN
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Le lieu de la recherche : une pastille par endroit, une seule allumée. */
function Portees({
	portees,
	active,
	onChoisir
}: {
	readonly portees: readonly PorteeAffichee[];
	readonly active: string;
	readonly onChoisir: (cle: string) => void;
}) {
	if (portees.length < 2) return null;
	return (
		<div
			role="radiogroup"
			aria-label="Où chercher"
			className="-mx-cladd-2xs flex gap-1.5 overflow-x-auto px-cladd-2xs pb-0.5 [scrollbar-width:none]"
		>
			{portees.map((portee) => {
				const allumee = portee.cle === active;
				return (
					<button
						key={portee.cle}
						type="button"
						role="radio"
						aria-checked={allumee}
						onClick={() => onChoisir(portee.cle)}
						className={cn(
							'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-cladd-2xs font-medium whitespace-nowrap transition-colors',
							allumee ? 'bg-cladd-fg text-cladd-bg' : 'verre-carte verre-bouton text-cladd-fg-soft'
						)}
					>
						{portee.cle === 'FRANCE' ? (
							<GlobeIcon className="size-3.5" aria-hidden />
						) : (
							<MapPinIcon className="size-3.5" aria-hidden />
						)}
						{portee.libelle}
					</button>
				);
			})}
		</div>
	);
}

/** Le bas de la liste : quand il paraît, la page suivante se demande. */
function BasDeListe({ onAtteint }: { readonly onAtteint: () => void }) {
	const ancre = useRef<HTMLDivElement>(null);
	const atteint = useEffectEvent(onAtteint);
	useEffect(() => {
		const element = ancre.current;
		if (element === null || typeof IntersectionObserver === 'undefined') return;
		// ⚠️ UNE MARGE D'UN ÉCRAN : la page suivante part avant qu'on touche le fond,
		// et le défilement ne bute jamais sur un « Chargement ».
		const observateur = new IntersectionObserver(
			(entrees) => {
				if (entrees.some((e) => e.isIntersecting)) atteint();
			},
			{ rootMargin: '0px 0px 600px 0px' }
		);
		observateur.observe(element);
		return () => observateur.disconnect();
	}, []);
	return <div ref={ancre} aria-hidden className="h-px" />;
}

/** Un disque pour retirer, sur les cartes du résumé. */
function GesteRetirer({
	libelle,
	onClick
}: {
	readonly libelle: string;
	readonly onClick: () => void;
}) {
	return (
		<Button
			variant="transparent"
			outline={false}
			hoverable={false}
			rounded
			square
			size="md"
			aria-label={libelle}
			className="verre-carte verre-bouton shrink-0 text-cladd-fg-soft"
			onClick={onClick}
		>
			<XIcon />
		</Button>
	);
}

/** Les portraits des choisis, qui se chevauchent, comme chez Bluesky. */
function PortraitsChoisis({ choisis }: { readonly choisis: readonly ProPropose[] }) {
	const montres = choisis.slice(0, 4);
	return (
		<span className="flex shrink-0 items-center" aria-hidden>
			{montres.map((c, rang) => (
				<span
					key={c.pro.cle}
					className={cn('rounded-full ring-2 ring-cladd-bg', rang > 0 && '-ml-3')}
					style={{ zIndex: montres.length - rang }}
				>
					<AvatarProfessionnel
						nom={c.pro.nom}
						role={c.pro.role}
						{...(c.pro.photoUrl === undefined ? {} : { photoUrl: c.pro.photoUrl })}
						taille={32}
					/>
				</span>
			))}
		</span>
	);
}

/**
 * QUELQU'UN QU'AUCUNE SOURCE NE CONNAÎT — saisi à la main, au bas de la liste.
 * La profession est celle de l'étape : on ne la redemande pas.
 */
function SaisieALaMain({
	profession,
	onAjouter
}: {
	readonly profession: ProfessionCherchee;
	readonly onAjouter: (fiche: FicheASaisir) => void;
}) {
	const [ouverte, setOuverte] = useState(false);
	const [nom, setNom] = useState('');
	const [lieu, setLieu] = useState('');
	if (!ouverte) {
		return (
			<div className="flex flex-col items-center gap-1 py-cladd-2xs text-center">
				<p className="text-cladd-2xs text-cladd-fg-soft">Vous ne le trouvez pas ?</p>
				<BoutonTexte onClick={() => setOuverte(true)}>
					<PencilLineIcon />
					Le saisir à la main
				</BoutonTexte>
			</div>
		);
	}
	const nomSaisi = nom.trim();
	return (
		<div className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs">
			<p className="text-cladd-xs font-semibold">
				{profession === 'AVOCAT' ? 'Un avocat' : 'Un commissaire de justice'}, saisi à la main
			</p>
			<Input
				size="lg"
				value={nom}
				onChange={setNom}
				placeholder="Nom, ou nom du cabinet"
				aria-label="Nom"
			/>
			<Input
				size="lg"
				value={lieu}
				onChange={setLieu}
				placeholder={
					profession === 'AVOCAT' ? 'Barreau ou ville (facultatif)' : 'Ville (facultatif)'
				}
				aria-label="Lieu"
			/>
			<BoutonSecondaire
				readOnly={nomSaisi === ''}
				onClick={() => {
					if (nomSaisi === '') return;
					const ressort = lieu.trim();
					onAjouter({
						nom: nomSaisi,
						role: profession,
						...(ressort === '' ? {} : { ressort })
					});
					setNom('');
					setLieu('');
					setOuverte(false);
				}}
			>
				Ajouter à la sélection
			</BoutonSecondaire>
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LE PARCOURS
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ProprietesParcours {
	readonly ouvert: boolean;
	/** Le nom du geste, en tête : « Qui fait l'acte », « Ajouter à votre équipe ». */
	readonly titre: string;
	/** Choisir pour un dossier, ou composer son équipe. */
	readonly but: ButDuParcours;
	/** Une étape par profession, dans cet ordre. */
	readonly professions: readonly ProfessionCherchee[];
	/** Une seule personne : une lettre, une remise. Un toucher remplace le choix. */
	readonly unSeul?: boolean;
	/** Ce que veut dire « personne » — « Moi-même » pour un acte. `null` : il faut quelqu'un. */
	readonly sansPersonne?: { readonly titre: string; readonly precision: string } | null;
	/** Le carnet du gérant. */
	readonly equipe: readonly FicheIntervenant<string>[];
	/** Les fiches du carnet déjà choisies pour ce dossier. */
	readonly dejaChoisis?: readonly string[];
	readonly annuaire: AnnuaireDuParcours;
	readonly onFermer: () => void;
	/** Les identifiants retenus, tous au carnet désormais. */
	readonly onConfirmer: (ids: readonly string[]) => void;
}

/**
 * ⚠️ CHAQUE OUVERTURE REPART DE ZÉRO, SANS EFFET. Le compteur d'ouvertures se
 * dérive au rendu (on compare `ouvert` à ce qu'on a vu) et sert de `key` au
 * contenu : l'étape, la sélection et la fiche ouverte repartent de ce que dit le
 * dossier, et la fermeture garde son animation.
 */
export function ParcoursProfessionnels(props: ProprietesParcours) {
	const [vu, setVu] = useState({ ouvert: props.ouvert, ouvertures: props.ouvert ? 1 : 0 });
	if (vu.ouvert !== props.ouvert) {
		setVu({ ouvert: props.ouvert, ouvertures: vu.ouvertures + (props.ouvert ? 1 : 0) });
	}
	return (
		<PleinEcran ouvert={props.ouvert} onFermer={props.onFermer} libelle={props.titre}>
			{vu.ouvertures === 0 ? null : <Parcours key={vu.ouvertures} {...props} />}
		</PleinEcran>
	);
}

function Parcours({
	titre,
	but,
	professions,
	unSeul = false,
	sansPersonne = null,
	equipe,
	dejaChoisis = [],
	annuaire,
	onFermer,
	onConfirmer
}: ProprietesParcours) {
	const deuxVolets = useDeuxVolets();
	const [etape, setEtape] = useState(0);
	const [choisis, setChoisis] = useState<Choisis>(
		() =>
			new Map(
				equipe
					.filter((fiche) => dejaChoisis.includes(fiche._id))
					.map((fiche) => [fiche._id, duCarnet(fiche)] as const)
			)
	);
	const [ouverteSur, setOuverteSur] = useState<ProPropose | null>(null);

	const profession = professions[etape];
	const surLeResume = profession === undefined;
	const resultatsCourants = profession === undefined ? undefined : annuaire.resultats[profession];
	const total = professions.length + 1;
	const liste = [...choisis.values()];

	/** Un toucher choisit ; un second retire. Pour une seule personne, il remplace. */
	const basculer = (propose: ProPropose) =>
		setChoisis((avant) => {
			const apres = new Map(unSeul ? [] : avant);
			if (avant.has(propose.pro.cle)) {
				if (!unSeul) apres.delete(propose.pro.cle);
			} else {
				apres.set(propose.pro.cle, propose);
			}
			return apres;
		});
	const retirer = (cle: string) =>
		setChoisis((avant) => {
			const apres = new Map(avant);
			apres.delete(cle);
			return apres;
		});

	const page = useRef<HTMLDivElement>(null);
	/** Changer d'étape remonte en haut : la question de l'étape se lit d'abord. */
	const allerA = (index: number) => {
		setOuverteSur(null);
		setEtape(index);
		page.current?.closest('.cladd-popup-wrapper')?.scrollTo({ top: 0 });
	};

	const confirmer = () => {
		void annuaire.retenir(liste).then((ids) => {
			if (ids !== null) onConfirmer(ids);
		});
	};

	/** La carte d'un professionnel dans une liste d'étape. */
	const carte = (propose: ProPropose) => {
		const choisi = choisis.has(propose.pro.cle);
		const dejaDansLEquipe = but === 'EQUIPE' && propose.dansLEquipe;
		return (
			<CarteProfessionnel
				key={propose.pro.cle}
				pro={propose.pro}
				dansLEquipe={propose.dansLEquipe}
				choisi={choisi}
				{...(propose.distance === undefined ? {} : { distance: propose.distance })}
				onOuvrir={() => setOuverteSur(propose)}
				geste={
					<GesteDeCarte
						fait={choisi || dejaDansLEquipe}
						desactive={dejaDansLEquipe}
						libelle={
							dejaDansLEquipe
								? `${propose.pro.nom}, déjà dans votre équipe`
								: choisi
									? `Retirer ${propose.pro.nom}`
									: `Choisir ${propose.pro.nom}`
						}
						onClick={() => basculer(propose)}
					/>
				}
			/>
		);
	};

	const enTete = (
		<BarreDePleinEcran
			titre={titre}
			sousTitre={`Étape ${etape + 1} sur ${total} · ${surLeResume ? 'Résumé' : NOM_PROFESSION[profession]}`}
			{...(etape > 0
				? { onRetour: () => allerA(etape - 1), libelleRetour: 'Étape précédente' }
				: {})}
			onFermer={onFermer}
		>
			<JaugeDEtapes total={total} courante={etape} />
			{profession === undefined ? null : (
				<>
					<SearchField
						size="md"
						enterKeyHint="search"
						value={annuaire.requetes[profession].texte}
						onChange={(texte) =>
							annuaire.onRequete(profession, { ...annuaire.requetes[profession], texte })
						}
						placeholder={
							profession === 'AVOCAT' ? 'Nom, cabinet ou ville' : 'Nom de l’étude ou ville'
						}
						aria-label={`Chercher un ${NOM_PROFESSION[profession].toLowerCase()}`}
						className="w-full"
					/>
					<Portees
						portees={annuaire.portees}
						active={annuaire.requetes[profession].portee}
						onChoisir={(portee) =>
							annuaire.onRequete(profession, { ...annuaire.requetes[profession], portee })
						}
					/>
				</>
			)}
		</BarreDePleinEcran>
	);

	/** Le bas collant : les choisis, et le seul bouton plein de l'écran. */
	const pied = (
		<PiedDePleinEcran>
			{annuaire.erreur === null ? null : (
				<p role="alert" className="text-cladd-2xs leading-relaxed">
					{annuaire.erreur}
				</p>
			)}
			{liste.length === 0 || surLeResume ? null : (
				<button
					type="button"
					onClick={() => allerA(professions.length)}
					className="flex min-h-11 cursor-pointer items-center gap-cladd-3xs text-left"
					aria-label="Voir les choisis dans le résumé"
				>
					<PortraitsChoisis choisis={liste} />
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="truncate text-cladd-xs font-semibold">{resumeDesChoisis(liste)}</span>
						<span className="text-cladd-3xs text-cladd-fg-soft">
							{liste.length} choisi{liste.length > 1 ? 's' : ''}
						</span>
					</span>
				</button>
			)}
			{surLeResume ? (
				<BoutonPrincipal
					pleineLargeur
					loading={annuaire.enCours}
					readOnly={
						annuaire.enCours ||
						(but === 'EQUIPE' && liste.every((c) => c.dansLEquipe)) ||
						(sansPersonne === null && liste.length === 0)
					}
					onClick={confirmer}
				>
					{but === 'EQUIPE'
						? libelleAjout(liste.filter((c) => !c.dansLEquipe).length)
						: 'Confirmer'}
				</BoutonPrincipal>
			) : (
				<BoutonPrincipal
					pleineLargeur
					readOnly={unSeul && sansPersonne === null && liste.length === 0}
					onClick={() => allerA(etape + 1)}
				>
					Continuer
				</BoutonPrincipal>
			)}
		</PiedDePleinEcran>
	);

	const fiche =
		ouverteSur === null ? null : (
			<FicheDansLeParcours
				propose={ouverteSur}
				choisi={choisis.has(ouverteSur.pro.cle)}
				but={but}
				depuis={resultatsCourants?.etat === 'PRET' ? resultatsCourants.depuis : undefined}
				onBasculer={() => {
					basculer(ouverteSur);
					if (!deuxVolets) setOuverteSur(null);
				}}
			/>
		);

	return (
		<ColonneDePleinEcran large refPage={page}>
			{enTete}
			<div className="flex flex-1 gap-cladd-sm pt-cladd-2xs">
				<div className="flex min-w-0 flex-1 flex-col gap-cladd-xs pb-cladd-sm">
					{profession === undefined ? (
						<Resume
							but={but}
							professions={professions}
							choisis={liste}
							sansPersonne={sansPersonne}
							onModifier={allerA}
							onRetirer={retirer}
							onOuvrir={setOuverteSur}
						/>
					) : (
						<EtapeProfession
							profession={profession}
							question={questionDeLEtape(profession, but, unSeul)}
							but={but}
							equipe={equipe}
							texte={annuaire.requetes[profession].texte}
							resultats={annuaire.resultats[profession]}
							carte={carte}
							onChargerPlus={() => annuaire.onChargerPlus(profession)}
							onSaisir={(saisie) =>
								basculer({
									pro: {
										cle: `saisie:${saisie.role}:${saisie.nom}`,
										role: saisie.role,
										nom: saisie.nom,
										...(saisie.ressort === undefined
											? {}
											: { ressort: saisie.ressort, commune: saisie.ressort }),
										specialites: [],
										source: 'Fiche saisie par vous'
									},
									origine: { genre: 'SAISIE', fiche: saisie },
									dansLEquipe: false
								})
							}
						/>
					)}
				</div>

				{/*
				  ⚠️ AU-DELÀ DE 1024 PX, LA FICHE À DROITE (règle d'écran n° 3) : la liste
				  ne se perd pas, et une seconde fiche remplace la première. En dessous,
				  elle se pousse par-dessus le parcours, comme une page d'iOS.
				*/}
				{deuxVolets ? (
					<aside className="sticky top-48 hidden h-fit max-h-[calc(100dvh-17rem)] w-96 shrink-0 overflow-y-auto pb-cladd-sm lg:block">
						{fiche ?? (
							<div className="verre-carte flex flex-col items-center gap-2 rounded-cladd-xl p-cladd-sm text-center">
								<UserRoundIcon className="size-6 text-cladd-fg-softer" aria-hidden />
								<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
									Touchez une carte : sa fiche s’ouvre ici, avec son adresse et ce que les sources
									publient.
								</p>
							</div>
						)}
					</aside>
				) : null}
			</div>
			{pied}

			{deuxVolets ? null : (
				<PleinEcran
					ouvert={ouverteSur !== null}
					onFermer={() => setOuverteSur(null)}
					libelle={ouverteSur?.pro.nom ?? 'Fiche'}
				>
					<ColonneDePleinEcran>
						<BarreDePleinEcran
							titre={ouverteSur?.pro.nom ?? ''}
							onRetour={() => setOuverteSur(null)}
							libelleRetour="Revenir à la liste"
						/>
						<div className="flex-1 pt-cladd-2xs pb-cladd-sm">{fiche}</div>
					</ColonneDePleinEcran>
				</PleinEcran>
			)}
		</ColonneDePleinEcran>
	);
}

/** Une étape : « Quel avocat ? », son équipe, puis l'annuaire qui défile. */
function EtapeProfession({
	profession,
	question,
	but,
	equipe,
	texte,
	resultats,
	carte,
	onChargerPlus,
	onSaisir
}: {
	readonly profession: ProfessionCherchee;
	readonly question: string;
	readonly but: ButDuParcours;
	readonly equipe: readonly FicheIntervenant<string>[];
	readonly texte: string;
	readonly resultats: ResultatsAffiches;
	readonly carte: (propose: ProPropose) => ReactNode;
	readonly onChargerPlus: () => void;
	readonly onSaisir: (fiche: FicheASaisir) => void;
}) {
	// L'équipe se propose en premier dans un dossier ; pour composer l'équipe, elle
	// y est déjà, et les cartes de l'annuaire le disent d'elles-mêmes.
	const siens =
		but === 'DOSSIER'
			? equipe
					.filter((fiche) => fiche.role === profession)
					.map(duCarnet)
					.filter((p) => texte.trim() === '' || correspond(p.pro, texte))
			: [];
	const clesDesSiens = new Set(siens.map((p) => p.pro.cle));

	return (
		<>
			<div className="flex flex-col gap-1 px-1">
				<h2 className="text-cladd-lg leading-tight font-semibold">{question}</h2>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{but === 'EQUIPE'
						? 'Touchez + pour en choisir autant que vous voulez, la carte pour sa fiche.'
						: 'Facultatif. Touchez + pour choisir, la carte pour sa fiche.'}
				</p>
			</div>

			{siens.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Votre équipe" nombre={siens.length} />
					<div className="flex flex-col gap-2">{siens.map(carte)}</div>
				</section>
			)}

			{resultats.etat === 'CHARGEMENT' ? (
				<p className="flex items-center justify-center gap-cladd-3xs py-cladd-sm text-cladd-2xs text-cladd-fg-soft">
					<Spinner size="xs" />
					Recherche des {PLURIEL_PROFESSION[profession].toLowerCase()}…
				</p>
			) : resultats.etat === 'A_SAISIR' || resultats.etat === 'ECHEC' ? (
				<p
					role={resultats.etat === 'ECHEC' ? 'alert' : undefined}
					className="px-1 py-cladd-2xs text-center text-cladd-2xs leading-relaxed text-cladd-fg-soft"
				>
					{resultats.message}
				</p>
			) : (
				<>
					{resultats.groupes.map((groupe) => {
						const pros = groupe.pros.filter((p) => !clesDesSiens.has(p.pro.cle));
						if (pros.length === 0) return null;
						return (
							<section key={groupe.cle} className="flex flex-col gap-cladd-3xs">
								{groupe.titre === undefined ? null : <EnTeteDeGroupe libelle={groupe.titre} />}
								{groupe.precision === undefined ? null : (
									<p className="-mt-1 px-1 text-cladd-3xs leading-snug text-cladd-fg-soft">
										{groupe.precision}
									</p>
								)}
								<div className="flex flex-col gap-2">{pros.map(carte)}</div>
								{groupe.onPlus === undefined ? null : (
									<BoutonTexte className="self-start" onClick={groupe.onPlus}>
										Voir les autres
									</BoutonTexte>
								)}
							</section>
						);
					})}
					{resultats.groupes.every((g) => g.pros.length === 0) ? (
						<p className="px-1 py-cladd-2xs text-center text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{texte.trim() === ''
								? 'Personne n’est relevé à cet endroit.'
								: `Personne ne correspond à « ${texte.trim()} » ici.`}
						</p>
					) : null}
					{/* Remonté à chaque page reçue : l'observateur se réarme, et une page trop
					    courte pour remplir l'écran en demande aussitôt une autre. */}
					{resultats.peutCharger ? (
						<BasDeListe
							key={resultats.groupes.reduce((n, g) => n + g.pros.length, 0)}
							onAtteint={onChargerPlus}
						/>
					) : null}
					{resultats.chargeEncore ? (
						<p className="flex items-center justify-center gap-cladd-3xs py-cladd-3xs text-cladd-2xs text-cladd-fg-soft">
							<Spinner size="xs" />
							Chargement…
						</p>
					) : null}
				</>
			)}

			<SaisieALaMain profession={profession} onAjouter={onSaisir} />

			{resultats.etat === 'PRET' ? (
				<p className="px-1 text-center text-cladd-3xs leading-relaxed text-cladd-fg-softest">
					{resultats.mention} « Près de » dit où ils exercent, pas qui est compétent : rien n’est
					présélectionné. Les portraits sont dessinés d’après le nom.
				</p>
			) : null}
		</>
	);
}

/** L'écran de fin : ce qui sera fait, par profession, et ce qui reste modifiable. */
function Resume({
	but,
	professions,
	choisis,
	sansPersonne,
	onModifier,
	onRetirer,
	onOuvrir
}: {
	readonly but: ButDuParcours;
	readonly professions: readonly ProfessionCherchee[];
	readonly choisis: readonly ProPropose[];
	readonly sansPersonne: { readonly titre: string; readonly precision: string } | null;
	readonly onModifier: (etape: number) => void;
	readonly onRetirer: (cle: string) => void;
	readonly onOuvrir: (propose: ProPropose) => void;
}) {
	const nouveaux = choisis.filter((c) => !c.dansLEquipe).length;
	const autres = choisis.filter(
		(c) => c.pro.role !== 'AVOCAT' && c.pro.role !== 'COMMISSAIRE_DE_JUSTICE'
	);
	const carte = (c: ProPropose) => (
		<CarteProfessionnel
			key={c.pro.cle}
			pro={c.pro}
			dansLEquipe={c.dansLEquipe}
			{...(c.distance === undefined ? {} : { distance: c.distance })}
			onOuvrir={() => onOuvrir(c)}
			geste={<GesteRetirer libelle={`Retirer ${c.pro.nom}`} onClick={() => onRetirer(c.pro.cle)} />}
		/>
	);

	return (
		<>
			<div className="flex flex-col gap-1 px-1">
				<h2 className="text-cladd-lg leading-tight font-semibold">
					{but === 'EQUIPE' ? 'À ajouter à votre équipe' : 'Votre choix'}
				</h2>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Vérifiez avant de confirmer : rien n’est enregistré avant.
				</p>
			</div>

			{choisis.length === 0 && sansPersonne !== null && but === 'DOSSIER' ? (
				<div className="verre-carte flex items-center gap-3 rounded-cladd-xl p-cladd-2xs">
					<span className="verre-carte flex size-12 shrink-0 items-center justify-center rounded-full text-cladd-fg-soft">
						<UserRoundIcon className="size-5" aria-hidden />
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="text-cladd-xs font-semibold">{sansPersonne.titre}</span>
						<span className="text-cladd-2xs text-cladd-fg-soft">{sansPersonne.precision}</span>
					</span>
				</div>
			) : null}

			{professions.map((profession, index) => {
				const siens = choisis.filter((c) => c.pro.role === profession);
				return (
					<section key={profession} className="flex flex-col gap-cladd-3xs">
						<div className="flex items-baseline justify-between gap-cladd-3xs pr-1">
							<EnTeteDeGroupe libelle={PLURIEL_PROFESSION[profession]} nombre={siens.length} />
							<BoutonTexte onClick={() => onModifier(index)}>
								{siens.length === 0 ? 'Choisir' : 'Modifier'}
							</BoutonTexte>
						</div>
						{siens.length === 0 ? (
							<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
								Aucun {NOM_PROFESSION[profession].toLowerCase()}.
							</p>
						) : (
							<div className="flex flex-col gap-2">{siens.map(carte)}</div>
						)}
					</section>
				);
			})}

			{autres.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Autres" nombre={autres.length} />
					<div className="flex flex-col gap-2">{autres.map(carte)}</div>
				</section>
			)}

			{nouveaux === 0 || but === 'EQUIPE' ? null : (
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{nouveaux === 1
						? 'Un professionnel rejoindra votre équipe, avec la source de sa fiche.'
						: `${nouveaux} professionnels rejoindront votre équipe, avec la source de leur fiche.`}
				</p>
			)}
		</>
	);
}

/** La fiche, dans le parcours : son geste en bas, toujours à portée de pouce. */
function FicheDansLeParcours({
	propose,
	choisi,
	but,
	depuis,
	onBasculer
}: {
	readonly propose: ProPropose;
	readonly choisi: boolean;
	readonly but: ButDuParcours;
	readonly depuis: Depuis | undefined;
	readonly onBasculer: () => void;
}) {
	const dejaDansLEquipe = but === 'EQUIPE' && propose.dansLEquipe;
	return (
		<div className="flex flex-col gap-cladd-2xs">
			<FicheProfessionnel
				pro={propose.pro}
				dansLEquipe={propose.dansLEquipe}
				gestes={{}}
				{...(depuis === undefined ? {} : { depuis })}
			/>
			{dejaDansLEquipe ? null : (
				<div className="verre-dense sticky bottom-0 z-10 -mx-cladd-2xs px-cladd-2xs pt-cladd-3xs pb-[max(env(safe-area-inset-bottom),12px)] lg:mx-0 lg:rounded-cladd-xl lg:px-cladd-3xs lg:pb-cladd-3xs">
					{choisi ? (
						<BoutonSecondaire pleineLargeur onClick={onBasculer}>
							Retirer de la sélection
						</BoutonSecondaire>
					) : (
						<BoutonPrincipal pleineLargeur onClick={onBasculer}>
							Choisir {propose.pro.role === 'AVOCAT' ? 'cet avocat' : 'cette étude'}
						</BoutonPrincipal>
					)}
				</div>
			)}
		</div>
	);
}
