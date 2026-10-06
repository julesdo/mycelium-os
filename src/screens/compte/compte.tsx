import { useState, type ReactNode } from 'react';
import { SectionTitle, Segmented, SegmentedButton } from '@cladd-ui/react';
import {
	ArrowLeftRightIcon,
	Building2Icon,
	CheckIcon,
	ContactIcon,
	CreditCardIcon,
	LogOutIcon,
	MonitorIcon,
	MoonIcon,
	PlugIcon,
	ShieldIcon,
	SlidersHorizontalIcon,
	SunIcon,
	UserIcon,
	UsersIcon
} from 'lucide-react';
import type { Theme } from '../../app/use-theme';
import {
	EmptyState,
	LigneBouton,
	ListeAnalyses,
	ListeDeRangees,
	PageEcran,
	RangeeDepliable,
	SectionsDepliables,
	type Lecture
} from '../../ui';
import { sansEtablissement } from '../sans-etablissement';
import { TITRE_ECRAN } from '../titres';
import { EnTeteDuCompte } from './en-tete';
import { FormulaireCourriers, FormulaireCreancier, type CreancierAffiche } from './creancier';
import { FormulaireEtablissement, type EtablissementAffiche } from './etablissement';
import { SectionRegles, resumeRegles, type ReglesAffichees } from './regles';
import { ChoixDuLogo, SectionProfil, type ProfilAffiche } from './profil';
import { SectionFacturation, type AbonnementAffiche } from './facturation';
import { SectionEquipe, type EquipeAffichee } from './equipe';
import { SectionDonnees, type DonneesAffichees } from './donnees';
import { SectionIntervenants, type IntervenantsAffiches } from './intervenants';
import { SectionMesures, type MesuresAffichees } from './mesures';
import {
	ceQuiPresse,
	resumeCarnet,
	resumeDonnees,
	resumeEquipe,
	resumeEtablissement,
	resumeFacturation,
	resumeProfil,
	resumeConnexions,
	type IdentiteDuCreancier,
	type ResumeDeSection,
	type SectionCompte
} from './presse';

/**
 * VOTRE COMPTE — UNE IDENTITÉ, DEUX CARTES DE RANGÉES, ET LA SORTIE EN DERNIER.
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
 * Ce qui l'empêche se calcule à un seul endroit (`presse.tsx`) et se lit sur
 * la RANGÉE : un point, et une valeur qui dit quoi. Le bandeau « Ce qui
 * presse » qui le redisait en tête de page est parti le 30/09/2026.
 *
 * ⚠️ `multiple`, DONC CE NE SONT PAS DES ONGLETS. Un accordéon qui referme le
 * voisin à chaque ouverture est un onglet qui s'ignore, et l'utilisateur a
 * refusé les onglets empilés. Ici deux sections se lisent côte à côte, et ce
 * qu'on a ouvert reste ouvert.
 *
 * ⚠️ LA DÉCONNEXION ET LE CHANGEMENT D'ÉTABLISSEMENT SONT DES RANGÉES. Ils
 * étaient des boutons de l'en-tête, et la sortie y était le geste le plus
 * visible de la page : voir `en-tete.tsx`. La déconnexion est la dernière
 * rangée, comme dans les Réglages d'iOS et chez Revolut Business.
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
	/** La connexion Qonto : son statut pour la rangée repliée, et la carte branchée. */
	readonly connexions: {
		readonly statut: string | null;
		/** Le logiciel que dit la rangée repliée (« Pennylane connecté ») ; Qonto par défaut. */
		readonly nom?: string;
		readonly contenu: ReactNode;
	};
	readonly creancier: CreancierAffiche;
	/** Ce que ses conditions générales disent, pour tous ses dossiers à la fois. */
	readonly regles: ReglesAffichees;
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
 * LA VALEUR COURTE D'UNE URGENCE, quand elle tient sur une rangée.
 *
 * « 1 invitation en attente. » dit mieux que « 3 personnes » ce qui attend le
 * gérant sur l'équipe ; « Votre identité de créancier est incomplète. » ne tient
 * pas, et la valeur du résumé (« À compléter ») le dit déjà. Vingt-six signes :
 * ce qui tient à droite d'un titre court à 393 px.
 */
function valeurUrgente(fait: string): string | null {
	const court = fait.replace(/\.$/, '');
	return court.length <= 26 ? court : null;
}

export function EcranCompte({ donnees }: { donnees: Lecture<CompteAffiche> }) {
	/**
	 * ⚠️ TOUT PART REPLIÉ, ET C'EST LA DÉCISION. Une rangée qui attend quelque
	 * chose porte un point et une valeur qui dit quoi : un geste, pas zéro, mais
	 * rien n'est caché.
	 */
	const [ouvertes, setOuvertes] = useState<readonly string[]>([]);

	/*
	  ⚠️ L'HEURE EST LUE UNE FOIS, AU MONTAGE. Un `Date.now()` dans le corps du
	  composant le rend non idempotent : deux rendus du même état donneraient
	  deux nombres de jours différents pour la fin d'essai.
	*/
	const [maintenant] = useState(() => Date.now());

	const entete = { genre: 'onglet', titre: TITRE_ECRAN.compte } as const;

	if (donnees.etat !== 'pret') {
		return <PageEcran entete={entete} etat={donnees.etat} />;
	}

	const pret = donnees.valeur;

	/*
	  ═══════════════════════════════════════════════════════════════════════════
	  ⚠️ L'ENCART « CE QUI PRESSE » EST PARTI, ET IL N'EST PAS PERDU (30/09/2026)
	  ═══════════════════════════════════════════════════════════════════════════

	  Il ouvrait la page sur trois rangées — « Votre identité de créancier est
	  incomplète », « 1 invitation en attente », « 1 adresse non vérifiée » — qui
	  menaient chacune à une section dont la rangée, vingt pixels plus bas,
	  disait la même chose. Deux chemins pour chaque urgence, et trois cibles de
	  plus en tête d'un écran de réglages.

	  Le calcul reste (`ceQuiPresse`, un seul endroit), et il se lit sur la
	  RANGÉE : un point, la valeur qui dit quoi, et dans le panneau le fait avec
	  sa conséquence. C'est ce que fait iOS sur ses Réglages — une pastille sur
	  la rangée, jamais un encart qui la redit.
	*/
	const presse = ceQuiPresse({
		identite: pret.identite,
		abonnement: pret.abonnement,
		equipe: pret.equipe,
		maintenant
	});

	/** Ce qu'une rangée affiche : sa valeur, sa glose, et son point s'il le faut. */
	function rangee(
		cle: SectionCompte,
		resume: ResumeDeSection
	): { valeur: string; glose?: string; attention: boolean } {
		const siennes = presse.urgences.filter((urgence) => urgence.cle === cle);
		const premiere = siennes[0];
		if (premiere === undefined) {
			return {
				valeur: resume.valeur,
				...(resume.legende === undefined ? {} : { glose: resume.legende }),
				attention: false
			};
		}
		return {
			valeur: valeurUrgente(premiere.fait) ?? resume.valeur,
			glose: siennes.map((urgence) => `${urgence.fait} ${urgence.consequence}`).join(' '),
			attention: true
		};
	}

	const plusieurs = pret.etablissements.length > 1;

	return (
		<PageEcran entete={entete}>
			<EnTeteDuCompte identite={pret.identite} logoUrl={pret.etablissement?.logo.url ?? null} />

			<SectionsDepliables ouvertes={ouvertes} onOuvertesChange={setOuvertes}>
				{/*
				  ═════════════════════════════════════════════════════════════════
				  DEUX CARTES DE RANGÉES, ET PLUS DIX CARTES
				  ═════════════════════════════════════════════════════════════════

				  Chaque section était sa propre carte, avec une phrase sous son titre
				  (« Ce qui vous représente dans l'application. »). Dix cartes et dix
				  phrases pour dix réglages qu'on ouvre deux fois par an. Ce sont
				  maintenant des rangées groupées, comme les Réglages d'iOS, le profil
				  de bunq ou celui de Revolut Business : le titre à gauche, la valeur à
				  droite, et la phrase descendue dans le panneau.

				  La première carte dit QUI vous êtes pour vos clients et ce qui fait
				  tourner le compte ; la seconde, ce qui vous appartient à vous.
				*/}
				<ListeDeRangees>
					<RangeeDepliable
						cle="etablissement"
						icone={<Building2Icon />}
						titre="Établissement"
						{...rangee('etablissement', resumeEtablissement(pret.identite))}
					>
						<ContenuEtablissement etablissement={pret.etablissement} creancier={pret.creancier} />
					</RangeeDepliable>

					{/*
					  LA BASCULE D'ÉTABLISSEMENT, SEULEMENT S'IL Y EN A PLUSIEURS. Elle
					  était un bouton dans l'en-tête ; un seul établissement n'a rien à
					  changer, et une rangée qui ne mène qu'à lui serait un bouton mort.
					*/}
					{plusieurs ? (
						<RangeeDepliable
							cle="etablissements"
							icone={<ArrowLeftRightIcon />}
							titre="Changer d’établissement"
							valeur={`${pret.etablissements.length}`}
						>
							<ListeAnalyses>
								{pret.etablissements.map((etablissement) => (
									<LigneBouton
										key={etablissement.id}
										genre="contenu"
										titre={etablissement.nom}
										icone={
											etablissement.id === pret.courantId ? (
												<CheckIcon className="size-5" />
											) : (
												<span className="size-5" />
											)
										}
										onClick={() => {
											setOuvertes((deja) => deja.filter((cle) => cle !== 'etablissements'));
											pret.onBasculer(etablissement.id);
										}}
									/>
								))}
							</ListeAnalyses>
						</RangeeDepliable>
					) : null}

					{/*
					  ⚠️ JUSTE APRÈS L'ÉTABLISSEMENT, PARCE QU'ELLES LUI APPARTIENNENT.
					  Ce sont les conditions générales du créancier qui disent ce que
					  remboursent les paiements reçus.
					*/}
					<RangeeDepliable
						cle="regles"
						icone={<SlidersHorizontalIcon />}
						titre="Règles de calcul"
						{...rangee('regles', resumeRegles(pret.regles))}
					>
						<SectionRegles {...pret.regles} />
					</RangeeDepliable>

					<RangeeDepliable
						cle="connexions"
						icone={<PlugIcon />}
						titre="Connexions"
						{...rangee('connexions', resumeConnexions(pret.connexions.statut, pret.connexions.nom))}
					>
						{pret.connexions.contenu}
					</RangeeDepliable>

					<RangeeDepliable
						cle="facturation"
						icone={<CreditCardIcon />}
						titre="Abonnement"
						{...rangee('facturation', resumeFacturation(pret.abonnement, maintenant))}
					>
						<AvecLaLecture lecture={pret.abonnement}>
							{(abonnement) => (
								<SectionFacturation abonnement={abonnement} maintenant={maintenant} />
							)}
						</AvecLaLecture>
					</RangeeDepliable>

					<RangeeDepliable
						cle="equipe"
						icone={<UsersIcon />}
						titre="Équipe"
						{...rangee('equipe', resumeEquipe(pret.equipe))}
					>
						<AvecLaLecture lecture={pret.equipe}>
							{(equipe) => <SectionEquipe {...equipe} />}
						</AvecLaLecture>
					</RangeeDepliable>
				</ListeDeRangees>

				<ListeDeRangees>
					<RangeeDepliable
						cle="carnet"
						icone={<ContactIcon />}
						titre="Votre carnet"
						{...rangee('carnet', resumeCarnet(pret.intervenants))}
					>
						<AvecLaLecture lecture={pret.intervenants}>
							{(carnet) => <SectionIntervenants {...carnet} />}
						</AvecLaLecture>
					</RangeeDepliable>

					{/*
					  ⚠️ « CE QUE LA FILE PROPOSE » EST ENTRÉ ICI. C'était une rangée à
					  elle, pour un instrument qu'on ouvre pour l'admirer (D13) : il
					  mesure ce que la surveillance a proposé, jour par jour — une donnée
					  du compte, rangée avec les autres.
					*/}
					<RangeeDepliable
						cle="donnees"
						icone={<ShieldIcon />}
						titre="Vos données"
						{...rangee('donnees', resumeDonnees(pret.donnees))}
					>
						<AvecLaLecture lecture={pret.donnees}>
							{(vos) => <SectionDonnees {...vos} />}
						</AvecLaLecture>
						<SectionTitle>Ce que la file propose</SectionTitle>
						<AvecLaLecture lecture={pret.mesures}>
							{(mesures) => <SectionMesures {...mesures} />}
						</AvecLaLecture>
					</RangeeDepliable>

					{/*
					  ⚠️ L'AFFICHAGE EST ENTRÉ DANS LE PROFIL. Deux réglages de la
					  personne — son visage et son thème —, deux rangées de moins à
					  parcourir pour qui cherche autre chose.
					*/}
					<RangeeDepliable
						cle="profil"
						icone={<UserIcon />}
						titre="Votre profil"
						{...rangee('profil', resumeProfil(pret.profil))}
					>
						<SectionProfil {...pret.profil} />
						<SectionTitle>Affichage</SectionTitle>
						<ContenuAffichage theme={pret.theme} onChoisirTheme={pret.onChoisirTheme} />
					</RangeeDepliable>
				</ListeDeRangees>

				{/*
				  ⚠️ LA DÉCONNEXION EST LA DERNIÈRE RANGÉE, seule dans sa carte, comme
				  dans les Réglages d'iOS et chez Revolut Business. Elle était un bouton
				  de l'en-tête — le geste le plus visible de la page, mesuré à 375 px.
				  En bas d'une page de deux cartes, on l'atteint sans la chercher, et on
				  ne l'appuie plus par erreur en visant autre chose.
				*/}
				<ListeAnalyses>
					<LigneBouton
						genre="contenu"
						icone={<LogOutIcon className="size-5" />}
						titre="Se déconnecter"
						onClick={pret.onSeDeconnecter}
					/>
				</ListeAnalyses>
			</SectionsDepliables>
		</PageEcran>
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
			Cette section n’a pas pu s’afficher. Rien de ce qui est enregistré n’est touché par cet échec
			; le reste de la page reste utilisable.
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

			{creancier.courriers === null ? null : (
				<>
					<SectionTitle>Ce qui s’imprime sur vos courriers</SectionTitle>
					<FormulaireCourriers
						key={creancier.cle}
						initial={creancier.courriers.initial}
						onEnregistrer={creancier.courriers.onEnregistrer}
						dirigeants={creancier.courriers.dirigeants}
					/>
				</>
			)}
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
