import { useRef, useState, type ReactNode } from 'react';
import { SectionTitle, Segmented, SegmentedButton } from '@cladd-ui/react';
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { Theme } from '../../app/use-theme';
import {
	EmptyState,
	PageEcran,
	SectionDepliable,
	SectionsDepliables,
	type Lecture
} from '../../ui';
import { sansEtablissement } from '../sans-etablissement';
import { TITRE_ECRAN } from '../titres';
import { BandeauCeQuiPresse } from './bandeau-presse';
import { EnTeteDuCompte } from './en-tete';
import { FormulaireCreancier, type CreancierAffiche } from './creancier';
import { FormulaireEtablissement, type EtablissementAffiche } from './etablissement';
import { ChoixDuLogo, SectionProfil, type ProfilAffiche } from './profil';
import { SectionFacturation, type AbonnementAffiche } from './facturation';
import { SectionEquipe, type EquipeAffichee } from './equipe';
import { SectionDonnees, type DonneesAffichees } from './donnees';
import { SectionIntervenants, type IntervenantsAffiches } from './intervenants';
import { SectionMesures, type MesuresAffichees } from './mesures';
import {
	SECTIONS_COMPTE,
	ceQuiPresse,
	resumeAffichage,
	resumeCarnet,
	resumeDonnees,
	resumeEquipe,
	resumeEtablissement,
	resumeFacturation,
	resumeMesures,
	resumeProfil,
	type IdentiteDuCreancier,
	type SectionCompte
} from './presse';

/**
 * VOTRE COMPTE — UNE IDENTITÉ, CE QUI PRESSE, ET SEPT RANGÉES QUI SE DÉPLIENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TREIZE ADRESSES SONT DEVENUES UNE PAGE, PUIS UNE PAGE QU'ON LIT D'UN COUP
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elles vivaient derrière un avatar sans libellé, en arbre : un hub qui
 * poussait vers cinq sections, dont trois poussaient vers des pages de détail.
 * Soit 44 % des écrans du produit pour des réglages qu'on ouvre deux fois par
 * an. La page unique a réglé la PROFONDEUR ; elle a laissé une seconde
 * question ouverte, et c'est celle-ci qui a été reprise.
 *
 * Sept sections DÉPLIÉES — deux formulaires, deux listes, un inventaire, un
 * export, deux effacements, un carnet, deux recherches et un tableau — font une
 * page de plusieurs milliers de pixels dont on ne voit jamais la fin. Le
 * raisonnement d'alors était « un réglage ne se cherche pas, il se trouve en
 * défilant ». Il tenait tant que la rangée repliée ne disait rien ; il ne tient
 * plus dès qu'elle porte SA VALEUR à droite, ce que fait toute référence de
 * réglages : intitulé à gauche, état à droite, chevron quand ça ouvre vraiment
 * quelque chose. On ne défile plus pour SAVOIR, on déplie pour CHANGER.
 *
 * ⚠️ ET UN REPLI SE PAIE, DONC IL SE COMPENSE. Une section repliée qui cache un
 * abonnement retombé sur `none` — dépôt, surveillance et décompte fermés —
 * serait pire que la page longue : le gérant aurait REGARDÉ sans rien voir.
 * Deux choses l'empêchent, et elles se calculent au même endroit
 * (`presse.tsx`) : la valeur de la rangée repliée, et le bandeau « Ce qui
 * presse » qui passe devant tout le reste.
 *
 * ⚠️ `multiple`, DONC CE NE SONT PAS DES ONGLETS. Un accordéon qui referme le
 * voisin à chaque ouverture est un onglet qui s'ignore, et l'utilisateur a
 * refusé les onglets empilés. Ici deux sections se lisent côte à côte, et ce
 * qu'on a ouvert reste ouvert.
 *
 * ⚠️ LA DÉCONNEXION ET LE CHANGEMENT D'ÉTABLISSEMENT SONT SORTIS DES SECTIONS.
 * Ils vivent dans l'en-tête d'identité, visibles sans défiler : voir
 * `en-tete.tsx` pour ce que chacun coûtait avant.
 *
 * ⚠️ CHAQUE SECTION ATTEND SA PROPRE LECTURE. Attendre que la facturation,
 * l'équipe, l'inventaire et le carnet aient tous répondu pour peindre la page
 * ferait plusieurs centaines de millisecondes d'écran vide pour corriger une
 * adresse. Tant qu'une lecture court, sa rangée affiche « Lecture… » — jamais
 * « 0 membre » ni « Aucun abonnement », qui se lisent comme des réponses.
 */
export interface CompteAffiche {
	/** Le visage de la personne connectée : photo, avatar ou initiales. */
	readonly profil: ProfilAffiche;
	/** L'établissement actif, ou `null` : la coquille `/app` renvoie alors vers `/bienvenue`. */
	readonly etablissement: EtablissementAffiche | null;
	readonly creancier: CreancierAffiche;
	/** Ce que l'en-tête affiche et ce dont « Ce qui presse » tire son premier fait. */
	readonly identite: IdentiteDuCreancier | null;
	/** Les établissements joignables : c'est ce qui fait de la bascule deux gestes. */
	readonly etablissements: readonly { readonly id: string; readonly nom: string }[];
	readonly courantId: string | null;
	readonly onBasculer: (id: string) => void;
	readonly abonnement: Lecture<AbonnementAffiche | null>;
	readonly equipe: Lecture<EquipeAffichee>;
	readonly donnees: Lecture<DonneesAffichees>;
	readonly intervenants: Lecture<IntervenantsAffiches>;
	/**
	 * L'instrument du plafond de propositions (D13).
	 *
	 * ⚠️ IL EST UNE RANGÉE PARMI LES AUTRES, ET REPLIÉE COMME ELLES. Un écran
	 * d'instrumentation est un écran qu'on ouvre pour l'admirer ; une rangée qui
	 * dit « 3 jours relevés » et rien de plus tient exactement le poids que ça
	 * vaut. Aucun taux ne remonte à la surface — voir `resumeMesures`.
	 */
	readonly mesures: Lecture<MesuresAffichees>;
	readonly theme: Theme;
	readonly onChoisirTheme: (theme: Theme) => void;
	readonly onSeDeconnecter: () => void;
}

/**
 * Les ancres de défilement, une par section : voir `ouvrirEtRejoindre`.
 *
 * Décrit par sa forme plutôt que par le type du `useRef` : celui de React a
 * changé de nom deux fois, et ce composant n'a besoin que du `current`.
 */
interface Ancres {
	readonly current: Map<SectionCompte, HTMLDivElement | null>;
}

export function EcranCompte({ donnees }: { donnees: Lecture<CompteAffiche> }) {
	/**
	 * ⚠️ TOUT PART REPLIÉ, ET C'EST LA DÉCISION. Ouvrir d'office ce qui presse
	 * repousserait les six autres sections hors de l'écran au moment précis où
	 * la page est censée se lire d'un coup d'œil. Le bandeau nomme ce qui presse
	 * et le doigt y mène : un geste, pas zéro, mais rien n'est caché.
	 */
	const [ouvertes, setOuvertes] = useState<readonly SectionCompte[]>([]);

	/*
	  ⚠️ L'HEURE EST LUE UNE FOIS, AU MONTAGE. Un `Date.now()` dans le corps du
	  composant le rend non idempotent : deux rendus du même état donneraient
	  deux nombres de jours différents pour la fin d'essai, et React ne fait pas
	  cette hypothèse.
	*/
	const [maintenant] = useState(() => Date.now());

	const ancres = useRef(new Map<SectionCompte, HTMLDivElement | null>());

	const entete = { genre: 'onglet', titre: TITRE_ECRAN.compte } as const;

	if (donnees.etat !== 'pret') {
		return <PageEcran entete={entete} etat={donnees.etat} />;
	}

	const pret = donnees.valeur;

	function ouvrirEtRejoindre(cle: SectionCompte) {
		setOuvertes((deja) => (deja.includes(cle) ? deja : [...deja, cle]));

		/*
		  ⚠️ LE DÉFILEMENT ATTEND LE RENDU SUIVANT. Le panneau n'existe pas encore
		  à l'instant du clic : viser la rangée avant qu'elle ait bougé ferait
		  atterrir à côté dès que deux sections au-dessus sont ouvertes.

		  ⚠️ ET IL NE GLISSE PAS SI ON NE LE VEUT PAS. `behavior: 'smooth'` ignore
		  `prefers-reduced-motion`, que le reste du produit respecte partout.
		*/
		requestAnimationFrame(() => {
			const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			ancres.current.get(cle)?.scrollIntoView({
				block: 'start',
				behavior: doux ? 'smooth' : 'auto'
			});
		});
	}

	return (
		<PageEcran entete={entete}>
			<EnTeteDuCompte
				identite={pret.identite}
				logoUrl={pret.etablissement?.logo.url ?? null}
				etablissements={pret.etablissements}
				courantId={pret.courantId}
				onBasculer={pret.onBasculer}
				onSeDeconnecter={pret.onSeDeconnecter}
			/>

			<BandeauCeQuiPresse
				presse={ceQuiPresse({
					identite: pret.identite,
					abonnement: pret.abonnement,
					equipe: pret.equipe,
					maintenant
				})}
				onOuvrir={ouvrirEtRejoindre}
			/>

			<SectionsDepliables
				ouvertes={ouvertes}
				onOuvertesChange={(liste) =>
					setOuvertes(
						// Le kit rend des chaînes libres ; seules celles que cet écran
						// déclare comptent. Une clé inconnue viendrait d'ailleurs.
						liste.filter((cle): cle is SectionCompte =>
							(SECTIONS_COMPTE as readonly string[]).includes(cle)
						)
					)
				}
			>
				<Ancre cle="profil" ancres={ancres}>
					<SectionDepliable cle="profil" titre="Votre profil" {...resumeProfil(pret.profil)}>
						<SectionProfil {...pret.profil} />
					</SectionDepliable>
				</Ancre>

				<Ancre cle="etablissement" ancres={ancres}>
					<SectionDepliable
						cle="etablissement"
						titre="Votre établissement"
						{...resumeEtablissement(pret.identite)}
					>
						<ContenuEtablissement etablissement={pret.etablissement} creancier={pret.creancier} />
					</SectionDepliable>
				</Ancre>

				<Ancre cle="facturation" ancres={ancres}>
					<SectionDepliable
						cle="facturation"
						titre="Facturation"
						{...resumeFacturation(pret.abonnement, maintenant)}
					>
						<AvecLaLecture lecture={pret.abonnement}>
							{(abonnement) => (
								<SectionFacturation abonnement={abonnement} maintenant={maintenant} />
							)}
						</AvecLaLecture>
					</SectionDepliable>
				</Ancre>

				<Ancre cle="equipe" ancres={ancres}>
					<SectionDepliable cle="equipe" titre="Équipe" {...resumeEquipe(pret.equipe)}>
						<AvecLaLecture lecture={pret.equipe}>
							{(equipe) => <SectionEquipe {...equipe} />}
						</AvecLaLecture>
					</SectionDepliable>
				</Ancre>

				<Ancre cle="donnees" ancres={ancres}>
					<SectionDepliable cle="donnees" titre="Vos données" {...resumeDonnees(pret.donnees)}>
						<AvecLaLecture lecture={pret.donnees}>
							{(vos) => <SectionDonnees {...vos} />}
						</AvecLaLecture>
					</SectionDepliable>
				</Ancre>

				<Ancre cle="carnet" ancres={ancres}>
					<SectionDepliable cle="carnet" titre="Votre carnet" {...resumeCarnet(pret.intervenants)}>
						<AvecLaLecture lecture={pret.intervenants}>
							{(carnet) => <SectionIntervenants {...carnet} />}
						</AvecLaLecture>
					</SectionDepliable>
				</Ancre>

				<Ancre cle="mesures" ancres={ancres}>
					<SectionDepliable
						cle="mesures"
						titre="Ce que la file propose"
						{...resumeMesures(pret.mesures)}
					>
						<AvecLaLecture lecture={pret.mesures}>
							{(mesures) => <SectionMesures {...mesures} />}
						</AvecLaLecture>
					</SectionDepliable>
				</Ancre>

				<Ancre cle="affichage" ancres={ancres}>
					<SectionDepliable cle="affichage" titre="Affichage" {...resumeAffichage(pret.theme)}>
						<ContenuAffichage theme={pret.theme} onChoisirTheme={pret.onChoisirTheme} />
					</SectionDepliable>
				</Ancre>
			</SectionsDepliables>
		</PageEcran>
	);
}

/**
 * L'ANCRE D'UNE SECTION.
 *
 * ⚠️ UN `<div>` ENTRE LA RACINE ET L'ARTICLE NE CASSE RIEN : `AccordionRoot` ne
 * rend aucun DOM et passe son état par contexte, pas par ses enfants directs.
 * C'est ce qui permet de viser une rangée sans toucher à `SectionDepliable`,
 * qui sert aussi la page d'une créance.
 */
function Ancre({
	cle,
	ancres,
	children
}: {
	readonly cle: SectionCompte;
	readonly ancres: Ancres;
	readonly children: ReactNode;
}) {
	return (
		<div
			ref={(noeud) => {
				ancres.current.set(cle, noeud);
			}}
		>
			{children}
		</div>
	);
}

/**
 * LE CONTENU D'UNE SECTION QUI ATTEND SA PROPRE LECTURE.
 *
 * ⚠️ L'ATTENTE SE LIT, Y COMPRIS PAR UN LECTEUR D'ÉCRAN. `role="status"` sur
 * une ligne visible, jamais un `sr-only` seul : un texte que personne ne voit
 * annonce une section que personne ne voit se construire. La rangée, elle, dit
 * déjà « Lecture… » sans qu'on l'ouvre.
 */
function AvecLaLecture<T>({
	lecture,
	children
}: {
	lecture: Lecture<T>;
	children: (valeur: T) => ReactNode;
}) {
	if (lecture.etat === 'pret') return <>{children(lecture.valeur)}</>;

	return lecture.etat === 'attente' ? (
		<p role="status" className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
			Lecture en cours…
		</p>
	) : (
		<p role="alert" className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
			Cette section n’a pas pu s’afficher. Rien de ce qui est enregistré n’est touché par cet
			échec ; le reste de la page reste utilisable.
		</p>
	);
}

/**
 * VOTRE ÉTABLISSEMENT — ce qu'il déclare, et ce qui s'imprime sur un décompte.
 *
 * ⚠️ LES DEUX FORMULAIRES SONT DANS LA MÊME SECTION, ET PAS DANS DEUX. Le nom
 * et le volume disent qui déclare ; la dénomination, le SIREN et l'adresse
 * disent ce qu'un tiers lit en tête d'un décompte. Ce sont deux facettes du même
 * sujet, et les séparer ferait à nouveau deux adresses pour une entreprise.
 *
 * ⚠️ ET L'IDENTITÉ DU CRÉANCIER RESTE EN ÉDITION, ce qui n'est pas une
 * commodité. Une adresse change quand l'entreprise déménage, un SIREN quand
 * elle se restructure, et ni l'un ni l'autre ne bloque un chiffre : le décompte
 * continue de se produire, avec une identité périmée, sans qu'aucune alerte
 * n'apparaisse jamais. La file est le chemin PROACTIF, cette section est le
 * chemin CORRECTIF, et un produit dont la sortie est opposable a besoin des deux.
 */
function ContenuEtablissement({
	etablissement,
	creancier
}: {
	etablissement: EtablissementAffiche | null;
	creancier: CreancierAffiche;
}) {
	if (etablissement === null) {
		return <EmptyState {...sansEtablissement('Créez-en un pour le régler.').vide} />;
	}

	return (
		<>
			<ChoixDuLogo {...etablissement.logo} />

			<FormulaireEtablissement
				key={etablissement.cle}
				initial={etablissement.initial}
				mesure={etablissement.mesure}
				onEnregistrer={etablissement.onEnregistrer}
			/>

			{/* Sans intitulé, les deux formulaires se lisent comme un seul de sept
			    champs. Celui-ci dit où finit ce qu'on déclare et où commence ce
			    qu'un tiers lira. */}
			<SectionTitle>Votre entreprise sur un décompte</SectionTitle>
			<FormulaireCreancier
				key={creancier.cle}
				initial={creancier.initial}
				nomEtablissement={creancier.nomEtablissement}
				onChercherAuRegistre={creancier.onChercherAuRegistre}
				onEnregistrer={creancier.onEnregistrer}
			/>
		</>
	);
}

/**
 * AFFICHAGE.
 *
 * ⚠️ TROIS ÉTATS EXCLUSIFS : c'est un `Segmented`, pas un bouton qui annonce la
 * bascule. « Passer en sombre » oblige à déduire l'état courant depuis l'action
 * proposée, ce qui se lit à l'envers. « Automatique » est le défaut, et il ne se
 * justifie pas à l'écran.
 *
 * ⚠️ LA DÉCONNEXION N'EST PLUS ICI. Elle a passé la page entière en en-tête :
 * une application dont on ne peut pas sortir n'est pas une simplification, et
 * une sortie qu'il faut chercher au fond d'une page de réglages n'en est pas
 * une non plus.
 */
function ContenuAffichage({
	theme,
	onChoisirTheme
}: {
	theme: Theme;
	onChoisirTheme: (theme: Theme) => void;
}) {
	return (
		/*
		  ⚠️ LE MOT « APPARENCE » A DISPARU, ET C'EST UNE CORRECTION DU REGARD.
		  Le choix vivait dans une rangée « Apparence | [Automatique·Sombre·Clair] ».
		  Mesuré à 375 px : le `Segmented` fait 293 px, la rangée qui l'accueillait
		  n'en offrait que 287 — « Clair » était COUPÉ au bord de la carte. Et
		  l'intitulé ne disait rien de plus que le titre de la section (« Affichage »)
		  et sa légende (« Le thème de l'interface »), soit trois fois la même chose
		  pour manger la place du seul contrôle.

		  Seul, le `Segmented` prend toute la largeur du panneau et tient partout.
		*/
		<Segmented className="w-full" activeColor="neutral" activeVariant="solid">
			<SegmentedButton active={theme === 'auto'} onClick={() => onChoisirTheme('auto')}>
				<MonitorIcon />
				Automatique
			</SegmentedButton>
			<SegmentedButton active={theme === 'dark'} onClick={() => onChoisirTheme('dark')}>
				<MoonIcon />
				Sombre
			</SegmentedButton>
			<SegmentedButton active={theme === 'light'} onClick={() => onChoisirTheme('light')}>
				<SunIcon />
				Clair
			</SegmentedButton>
		</Segmented>
	);
}
