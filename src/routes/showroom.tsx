import { useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { Toolbar, Segmented, SegmentedButton, SectionTitle, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	Bandeau,
	BilanImport,
	FluxEvenements,
	BilanPertes,
	IdentiteDebiteur,
	RailProcedure,
	FeuilleVoie,
	ChoixIntervenant,
	RechercheCommissaire,
	RechercheAvocat,
	ListeAnalyses,
	LigneBouton,
	ConstatRegistre,
	Lettrage,
	VeilleurAvatar,
	PaletteRecherche,
	type FamilleRecherche,
	type PropositionTaux
} from '../ui';
import {
	controlerTauxContractuel,
	tauxDepuisPourcentage
} from '../lib/verticales/recouvrement/taux-contractuel';
import { Shell } from '../app/shell';
import { EcranIntrouvable, EcranEnErreur } from '../screens/passage';
import { ECRANS_DU_PRODUIT } from './-salle/ecrans';
import { cleDeLEcran, type EtatDemo } from './-salle/demo';
import {
	AVOCATS_DEMO,
	BARREAUX_DEMO,
	CARNET_DEMO,
	ETUDES_DEMO,
	EVENEMENTS_DEMO,
	RAIL_DEMO,
	SECTEURS_DEMO,
	VOIE_DEMO
} from './-salle/communes';
import { DEPOTS_DEMO } from './-salle/depots';
import { BILAN_DEMO, BILAN_SURVEILLANCE_INTERROMPUE_DEMO } from './-salle/revelation';
import { chercherDansLaDemo, RECENTS_DEMO } from './-salle/recherche';

/**
 * La salle d'exposition.
 *
 * Elle rend chaque écran avec des données de démonstration, sans backend et
 * sans authentification, pour qu'on puisse **les regarder** aux quatre largeurs
 * de référence — 375, 768, 1024, 1280 — avant de les déclarer finis.
 *
 * Ce n'est pas un confort : le motif principal des dérives visuelles du produit
 * précédent est qu'on ne regardait jamais le résultat. Un kit contraint les
 * contrôles, un lint contraint les classes, mais seul un coup d'œil attrape une
 * hiérarchie ratée ou une carte qui déborde. Cette règle a déjà payé trois fois
 * sur les écrans de recouvrement.
 *
 * Les données ne sont pas décoratives non plus : elles sont choisies pour
 * exposer les cas qui cassent — une créance déjà prescrite, une caducité à
 * quelques jours, un montant à cinq chiffres à côté d'un montant à trois, un
 * tableau à sept colonnes qui doit tenir sur 375 px. Un jeu de démonstration où
 * tout va bien ne prouve rien.
 */
export const Route = createFileRoute('/showroom')({
	beforeLoad: () => {
		// La salle n'existe qu'en développement : elle rend des écrans avec des
		// données inventées, ce qui n'a rien à faire en production.
		if (!import.meta.env.DEV) throw notFound();
	},
	component: Showroom
});

/**
 * LE LETTRAGE, DANS SES QUATRE ÉTATS.
 *
 * Le second est celui qui porte la règle : deux lectures possibles, aucune
 * présélectionnée, et un avertissement qui dit POURQUOI on ne tranche pas.
 * C'est aussi le plus dense — il doit tenir à 375 px sans que les puces de
 * référence débordent.
 */
function DemoLettrage() {
	const rien = () => {};
	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Un virement groupé à ventiler" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Une seule lecture</SectionTitle>
						<Lettrage
							proposition={{
								issue: 'UNIQUE',
								combinaisons: [
									{ references: ['FA-2026-0088', 'FA-2026-0091', 'FA-2026-0103'], total: 482_000n }
								],
								tronque: false
							}}
							enCours={false}
							erreur={null}
							onChercher={rien}
							onAppliquer={rien}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Deux lectures — le logiciel ne tranche pas</SectionTitle>
						<Lettrage
							proposition={{
								issue: 'AMBIGU',
								combinaisons: [
									{ references: ['FA-2026-0088', 'FA-2026-0091'], total: 300_000n },
									{ references: ['FA-2026-0104'], total: 300_000n }
								],
								tronque: false
							}}
							enCours={false}
							erreur={null}
							onChercher={rien}
							onAppliquer={rien}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Aucune combinaison</SectionTitle>
						<Lettrage
							proposition={{ issue: 'AUCUNE', combinaisons: [], tronque: false }}
							enCours={false}
							erreur={null}
							onChercher={rien}
							onAppliquer={rien}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Trop de factures pour chercher</SectionTitle>
						<Lettrage
							proposition={{
								issue: 'TROP_DE_CANDIDATES',
								combinaisons: [],
								tronque: false,
								candidates: 47
							}}
							enCours={false}
							erreur={null}
							onChercher={rien}
							onAppliquer={rien}
						/>
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * Le jour où le gérant a enregistré les taux de `DemoIdentite`, figé : le
 * plancher légal change à chaque semestre, et un « aujourd'hui » qui bouge
 * changerait le constat d'une capture à l'autre.
 */
const TAUX_ENREGISTRES_LE_DEMO = '2026-03-15';

/** Le taux saisi sur la fiche identifiée, et celui, trop bas, de la fiche refusée. */
const TAUX_IDENTIFIE_DEMO = '15,00';
const TAUX_TROP_BAS_DEMO = '1,00';

/**
 * Le taux que la lecture d'une pièce a relevé, avec la pièce qui le porte.
 *
 * `lirePreuve` ne le rend que depuis des conditions générales ou un contrat, et
 * il s'arrête sur la pièce : rien ne s'applique aux factures tant que personne
 * ne l'a retenu.
 */
const TAUX_LU_DEMO: PropositionTaux = {
	pourcentage: '12,50',
	piece: 'conditions-generales-2026.pdf',
	reference: 'CG-2026-01'
};

/**
 * Le constat que `poserLeTaux` rend pour un débiteur qui a des factures non
 * soldées (`src/lib/convex/recouvrement/tauxContractuel.ts`, lignes 127 à 130).
 *
 * ⚠️ IL SE CALCULE, IL NE SE RECOPIE PAS. Écrit à la main, il citait un plancher
 * qu'aucun semestre du référentiel ne porte : la salle montrait une valeur
 * juridique fausse, avec l'aplomb d'un constat du produit.
 */
function constatDuTaux(pourcentage: string): string {
	return controlerTauxContractuel(tauxDepuisPourcentage(pourcentage), TAUX_ENREGISTRES_LE_DEMO)
		.constat;
}

/**
 * L'IDENTITÉ D'UN DÉBITEUR — les deux champs que le gérant seul peut remplir,
 * et leurs TROIS états.
 *
 * Le troisième est celui qu'on serait tenté de ne jamais dessiner : le refus.
 * La clé de contrôle attrape toute faute de frappe d'un seul chiffre, donc ce
 * message va s'afficher souvent — et il doit tenir dans la colonne, à 375 px,
 * sans pousser le reste du volet.
 */
function DemoIdentite() {
	return (
		<Page>
			<PageHeader titre="Fournitures Durand" sousTitre="Ce que le gérant seul peut dire" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						{/*
						  ⚠️ L'ÉTAT DE DÉPART N'EST PLUS UN CHAMP VIDE. C'est toute la
						  correction : l'écran dit ce que l'absence de SIREN coûte, et
						  propose d'aller le chercher au registre — sur lequel le radar de
						  solvabilité tape déjà toutes les nuits.
						*/}
						<SectionTitle>Pas encore identifié — le logiciel propose d’aller chercher</SectionTitle>
						<IdentiteDebiteur
							denomination="Boulangerie Martin"
							siren={undefined}
							formeJuridique={undefined}
							etatRecherche={{ phase: 'REPOS' }}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur={undefined}
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren={null}
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel={undefined}
							propositionTaux={null}
							constatTaux={null}
							onEnregistrerTaux={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						{/*
						  ⚠️ SIX SOCIÉTÉS POUR UN NOM, ET C'EST LE CAS RÉEL. La recherche
						  « BOULANGERIE MARTIN » rend exactement ça au BODACC. C'est
						  pourquoi le produit PROPOSE au lieu de choisir : retenir la
						  première poserait un SIREN qui désigne une autre entreprise, et
						  le radar rendrait ensuite un « aucune procédure » rassurant sur
						  le mauvais numéro.

						  La ville est là pour ça, et elle seule suffit presque toujours :
						  un gérant sait où est son client.
						*/}
						<SectionTitle>Le registre propose — c’est le gérant qui reconnaît</SectionTitle>
						<IdentiteDebiteur
							denomination="Boulangerie Martin"
							siren={undefined}
							formeJuridique={undefined}
							etatRecherche={{
								phase: 'TROUVE',
								candidats: [
									{
										siren: '421931452',
										denomination: 'BOULANGERIE MARTIN',
										ville: 'Fécamp',
										adresse: '6 Place Nicolas Sellé 76400 Fécamp'
									},
									{
										siren: '805188000',
										denomination: 'BOULANGERIE SAINT MARTIN',
										ville: 'Vesoul',
										adresse: '14 Rue Claude Monnet 70000 Vesoul'
									},
									{
										siren: '803938745',
										denomination: 'BOULANGERIE VICTOR MARTIN',
										ville: 'Remire-Montjoly',
										adresse: '18 chemin Germain 97354 Remire-Montjoly'
									}
								]
							}}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur={undefined}
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren={null}
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel={undefined}
							propositionTaux={null}
							constatTaux={null}
							onEnregistrerTaux={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Identifié — plus aucun champ à remplir</SectionTitle>
						<IdentiteDebiteur
							denomination="Fournitures Durand"
							siren="853479236"
							formeJuridique="Société par actions simplifiée"
							etatRecherche={{ phase: 'REPOS' }}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur="TRANSPORT_MARCHANDISES"
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren={null}
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel={TAUX_IDENTIFIE_DEMO}
							propositionTaux={null}
							constatTaux={constatDuTaux(TAUX_IDENTIFIE_DEMO)}
							onEnregistrerTaux={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						{/*
						  ⚠️ LE TAUX LU PROPOSE, IL NE S'APPLIQUE PAS. La mutation qui le
						  pose réécrit TOUTES les factures non soldées du débiteur, et elle
						  enregistre même sous le plancher légal, délibérément : appliqué en
						  silence depuis une ligne lue par un modèle, il ferait baisser ce
						  qu'on réclame sur tout un client.

						  Le champ de saisie reste donc vide sous la rangée, et c'est voulu :
						  le pré-remplir laisserait croire que le taux est enregistré, et il
						  suffirait de ne rien faire pour qu'il le devienne.
						*/}
						<SectionTitle>Un taux lu dans une pièce, proposé et jamais appliqué</SectionTitle>
						<IdentiteDebiteur
							denomination="Imprimerie Delorme"
							siren="552100554"
							formeJuridique="Société à responsabilité limitée"
							etatRecherche={{ phase: 'REPOS' }}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur="GENERAL"
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren={null}
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel={undefined}
							propositionTaux={TAUX_LU_DEMO}
							constatTaux={null}
							onEnregistrerTaux={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						{/*
						  ⚠️ « RIEN TROUVÉ » EST UN ÉTAT À PART ENTIÈRE, et son texte dit
						  que c'est un silence DU REGISTRE, pas une réponse sur le client.
						  Le BODACC ne publie que ce qui a fait l'objet d'une annonce de
						  greffe : laisser croire à un verdict serait un repli silencieux.
						*/}
						<SectionTitle>Le registre ne dit rien — et le dit comme tel</SectionTitle>
						<IdentiteDebiteur
							denomination="Ateliers Vasseur"
							siren={undefined}
							formeJuridique={undefined}
							etatRecherche={{ phase: 'AUCUN' }}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur={undefined}
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren={null}
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel={undefined}
							propositionTaux={null}
							constatTaux={null}
							onEnregistrerTaux={() => {}}
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Le constat du registre — cité, jamais interprété</SectionTitle>
						<ConstatRegistre
							constat={{
								dateParution: '2026-09-09',
								nature: "Jugement d'ouverture de liquidation judiciaire",
								dateJugement: '2026-08-31',
								tribunal: "Greffe du Tribunal de Commerce d'Evry",
								url: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A202601721671'
							}}
							sante="PROCEDURE_COLLECTIVE"
						/>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Refusé — le message NOMME le numéro reçu</SectionTitle>
						<IdentiteDebiteur
							denomination="Fournitures Durand"
							siren={undefined}
							formeJuridique={undefined}
							etatRecherche={{ phase: 'AUCUN' }}
							onChercherAuRegistre={() => {}}
							onRetenirEtablissement={() => {}}
							secteur={undefined}
							optionsSecteur={SECTEURS_DEMO}
							erreurSiren="« 853479237 » n’est pas un SIREN : sa clé de contrôle ne tombe pas."
							onEnregistrerSiren={() => {}}
							onChoisirSecteur={() => {}}
							tauxContractuel={TAUX_TROP_BAS_DEMO}
							propositionTaux={null}
							constatTaux={constatDuTaux(TAUX_TROP_BAS_DEMO)}
							onEnregistrerTaux={() => {}}
						/>
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * Le bilan des pertes, dans ses DEUX états — et le second est le seul qui
 * compte vraiment.
 *
 * Un compteur qui ne sait afficher que zéro se lit comme une décoration en
 * trois jours. Celui-ci montre ce qui s'est éteint avant l'arrivée, ce qui
 * s'est éteint depuis — un échec du produit, affiché quand même — et il REFUSE
 * de compter quand la surveillance a été interrompue.
 *
 * C'est le compteur de la page de la révélation, calculé par le domaine dans
 * `-salle/revelation.ts`.
 */
function DemoBilan() {
	return (
		<Page>
			<PageHeader titre="Ce qui s’est éteint" sousTitre="Avant vous, et depuis" />
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Le compteur, quand la surveillance a tourné</SectionTitle>
						<BilanPertes bilan={BILAN_DEMO} />
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Le même, après un battement en échec</SectionTitle>
						<BilanPertes bilan={BILAN_SURVEILLANCE_INTERROMPUE_DEMO} />
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoFlux() {
	return (
		<Page>
			<PageHeader titre="À traiter" sousTitre="4 points d’attention" />
			<PageBody>
				<FluxEvenements
					evenements={EVENEMENTS_DEMO}
					// Uniquement les deux factures distinctes ci-dessus (PRESCRIPTION_PROCHE
					// FA-2021-0087 à 9 240,00 € + HABITUDE_ROMPUE FA-2026-0311 à 249,90 €) : la
					// créance mûre et l'échéance de procédure sont des vues agrégées de la
					// même monnaie, pas de l'argent en plus. Voir `montantIdentifie` dans
					// `verticales/recouvrement/surveillance.ts`.
					montantIdentifie={948_990n}
					hypotheses={[
						"Le secteur de Ateliers Martin n'est pas déterminé : la prescription est calculée sur le délai le plus court (1 an). Préciser le secteur lèvera cette hypothèse."
					]}
					anglesMorts={[]}
				/>
			</PageBody>
		</Page>
	);
}

/**
 * Le vide, qui doit montrer le chemin.
 *
 * Un écran sans données affiche l'amorçage, jamais des cadrans à zéro. C'est la
 * quatrième règle d'écran, et c'est la première impression du produit.
 */
function DemoVide() {
	return (
		<Page>
			<PageHeader titre="À traiter" />
			<PageBody>
				<EmptyState
					illustration="📬"
					titre="Rien à surveiller pour l’instant"
					explication="Le logiciel repérera de lui-même les échéances passées, les créances mûres et les prescriptions qui approchent. Il lui faut d’abord vos factures."
					etapes={[
						'Importez un export comptable — c’est le plus complet : il porte vos factures, vos règlements et vos clients d’un coup.',
						'À défaut, déposez vos factures de vente en PDF ou en photo.',
						'Précisez le secteur de vos débiteurs : c’est lui qui détermine le délai de prescription.'
					]}
				/>
			</PageBody>
		</Page>
	);
}

/**
 * LES DEUX BANDEAUX QUI DISENT QUE LA SURVEILLANCE NE TOURNE PAS.
 *
 * Ils vivent sur l'écran d'accueil, derrière l'authentification, et ne
 * s'affichent QUE lorsque quelque chose ne va pas — donc quasiment jamais en
 * usage normal. Sans cette entrée de showroom, personne ne les regarderait
 * avant le jour où ils apparaissent chez un client.
 *
 * ILS SONT MONTRÉS ENSEMBLE ALORS QU'ILS S'EXCLUENT À L'ÉCRAN. Ce qu'on vient
 * vérifier ici est typographique : deux phrases longues dans un bandeau étroit,
 * à 375 px, sans que rien ne déborde.
 */
function DemoSurveillanceMuette() {
	return (
		<Page>
			<PageHeader titre="À traiter" sousTitre="4 points d’attention" />
			<PageBody>
				<div className="flex flex-col gap-cladd-3xs">
					<Bandeau ton="alerte" icone={<AlertTriangleIcon size={18} />}>
						La surveillance a échoué le 28 août 2026. Vos délais ne sont pas suivis depuis.
					</Bandeau>
					<Bandeau ton="alerte" icone={<AlertTriangleIcon size={18} />}>
						La surveillance n’a pas encore tourné sur cet établissement. Vos délais ne sont pas
						encore suivis.
					</Bandeau>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LES QUATRE ÉTATS D'UN DÉPÔT, CÔTE À CÔTE : ceux de `-salle/depots.ts`, que les
 * pages de l'import montrent l'un après l'autre.
 */
function DemoBilanImport() {
	return (
		<Page>
			<PageHeader titre="Vos dépôts" sousTitre="Les quatre états d’un import" />
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					{DEPOTS_DEMO.map((depot) => (
						<BilanImport key={depot.id} depot={depot} />
					))}
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LE VEILLEUR EN PERSONNE, dans ses trois etats.
 *
 * ⚠️ IL N'APPARAIT PAS DANS LA COQUILLE DE CETTE SALLE, et c'est correct :
 * dans la barre il interroge Convex, la requete leve sans session, et le
 * `Facultatif` qui l'entoure rend `null` plutot que d'emporter la navigation.
 * C'est exactement ce qu'on veut en production — mais ca le rend invisible
 * ici, d'ou cette page.
 *
 * Les trois etats cote a cote sont le seul moyen de verifier AU REGARD ce que
 * les mots promettent : que la veille se sente sans s'agiter, que le balayage
 * soit franc, et surtout qu'un veilleur ROMPU n'ait pas l'air de veiller.
 */
function DemoVeilleurAvatar() {
	const etats = [
		{
			etat: 'VEILLE' as const,
			titre: 'Il veille',
			note: 'L’iris respire — six secondes par cycle, huit pour cent d’amplitude. Delibérément sous le seuil où l’on remarque un mouvement sans le chercher : ce qui s’agite en permanence devient du décor en trois jours.'
		},
		{
			etat: 'TRAVAILLE' as const,
			titre: 'Il travaille en ce moment',
			note: 'Le balayage tourne, franc et rapide. C’est le seul moment où l’avatar est vraiment animé, et il ne dure que le temps du traitement. Sa rareté est ce qui le rend lisible.'
		},
		{
			etat: 'ROMPU' as const,
			titre: 'La surveillance est interrompue',
			note: 'L’iris se contracte, l’orbite se pointille, plus rien ne tourne. Un veilleur en panne ne doit pas avoir l’air de veiller : c’est le seul mensonge que cette pastille pourrait dire, et le plus coûteux du produit.'
		}
	];

	return (
		<Page>
			<PageHeader titre="Le veilleur" sousTitre="Sa présence, sur tous les écrans" />
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					{etats.map(({ etat, titre, note }) => (
						<Surface
							key={etat}
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex items-start gap-cladd-2xs p-cladd-2xs"
						>
							<VeilleurAvatar etat={etat} taille={40} />
							<div className="flex min-w-0 flex-col gap-1">
								<span className="text-cladd-sm font-semibold">{titre}</span>
								<span className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{note}</span>
							</div>
						</Surface>
					))}

					<p className="px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
						Aucune couleur de seuil : le vert, l’ambre et le rouge restent réservés à
						<code> --color-seuil-*</code>. L’avatar prend le bleu d’encre de la marque, comme le
						pouls du journal — c’est la même machine, elle a la même couleur.
					</p>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoRail() {
	return (
		<Page>
			<PageHeader titre="Ateliers Martin" sousTitre="L’injonction de payer, d’un bout à l’autre" />
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<SectionTitle>Les étapes de la voie</SectionTitle>
					<Surface
						variant="transparent"
						outline={false}
						className="verre-carte rounded-cladd-xl"
						contentClassName="p-cladd-2xs"
					>
						<RailProcedure etapes={RAIL_DEMO} />
					</Surface>

					<p className="px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
						Aucune couleur de seuil sur ce rail : le vert, l’ambre et le rouge restent réservés à
						<code> --color-seuil-*</code>. Une étape franchie se marque par un disque plein, pas par
						du vert — elle n’est pas un seuil.
					</p>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoVoie() {
	// Une `Popup` est contrôlée : sans état d'ouverture, elle ne s'affiche pas.
	// La salle l'ouvre d'emblée — c'est ce qu'on vient regarder — et la rangée
	// la rouvre, ce qui expose du même coup les deux moitiés du geste.
	const [ouverte, setOuverte] = useState(true);

	return (
		<Page>
			<PageHeader
				titre="Ateliers Martin"
				sousTitre="Ce qu’une voie implique, avant de s’y engager"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<SectionTitle>Les voies envisageables</SectionTitle>
					<ListeAnalyses>
						<LigneBouton
							titre={VOIE_DEMO.nom}
							valeur="Envisageable"
							precision={`${VOIE_DEMO.etapes.length} étapes · ${VOIE_DEMO.conditionsEchec.length} façons d’échouer`}
							onClick={() => setOuverte(true)}
						/>
					</ListeAnalyses>

					<p className="px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
						Les étapes sont numérotées parce qu’elles se suivent, pas parce qu’il faudrait les
						faire. Aucun classement entre les voies, aucune mise en avant : la feuille montre un
						déroulé et ce qui le fait échouer, et s’arrête là.
					</p>

					<FeuilleVoie
						voie={VOIE_DEMO}
						ouverte={ouverte}
						onFermer={() => setOuverte(false)}
						onDeclarer={() => setOuverte(false)}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoIntervenant() {
	// Comme `DemoVoie` : une `Popup` est contrôlée, donc la salle l'ouvre
	// d'emblée — c'est ce qu'on vient regarder.
	const [ouverte, setOuverte] = useState(true);
	// `null` = « Moi-même », le premier rang. Voir `choix-intervenant.tsx` : ce
	// n'est pas une présélection du logiciel mais l'état réel d'un dossier sans
	// intervenant rattaché.
	const [choisi, setChoisi] = useState<string | null>(null);

	return (
		<Page>
			<PageHeader
				titre="Ateliers Martin"
				sousTitre="Qui fait l’acte, et pourquoi rien n’est trié"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<SectionTitle>Le carnet</SectionTitle>
					<ListeAnalyses>
						<LigneBouton
							titre="Qui fait l’acte"
							valeur={CARNET_DEMO.find((f) => f._id === choisi)?.nom ?? 'Moi-même'}
							onClick={() => setOuverte(true)}
						/>
					</ListeAnalyses>

					<ChoixIntervenant
						carnet={CARNET_DEMO}
						choisi={choisi}
						ouverte={ouverte}
						onFermer={() => setOuverte(false)}
						onChoisir={setChoisi}
						onAjouter={() => setOuverte(false)}
						onOublier={() => setOuverte(false)}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoCommissaire() {
	// Comme `DemoIntervenant` : une `Popup` est contrôlée, donc la salle l'ouvre
	// d'emblée — c'est ce qu'on vient regarder.
	const [ouverte, setOuverte] = useState(true);

	return (
		<Page>
			<PageHeader
				titre="Chercher un commissaire"
				sousTitre="Le registre public, et ce qu’il ne dit pas"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<ListeAnalyses>
						<LigneBouton
							titre="Chercher un commissaire de justice"
							valeur="Département 44"
							onClick={() => setOuverte(true)}
						/>
					</ListeAnalyses>

					{/*
					  ⚠️ TRONQUÉE VOLONTAIREMENT : trois études affichées, vingt-deux
					  déclarées. C'est l'état qu'on vient vérifier à l'œil — celui où la
					  liste doit DIRE qu'elle est incomplète, faute de quoi elle ment par
					  le silence.
					*/}
					<RechercheCommissaire
						ouverte={ouverte}
						departementParDefaut="44"
						etat={{ phase: 'TROUVE', resultat: ETUDES_DEMO }}
						onFermer={() => setOuverte(false)}
						onChercher={() => undefined}
						onRetenir={() => setOuverte(false)}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoAvocat() {
	// Comme `DemoCommissaire` : une `Popup` est contrôlée, donc la salle l'ouvre
	// d'emblée — c'est ce qu'on vient regarder.
	const [ouverte, setOuverte] = useState(true);
	// Les deux filtres sont contrôlés : la salle les laisse bouger pour qu'on
	// voie les deux listes déroulantes et leur recherche, mais la réponse, elle,
	// est figée. Un écran de démonstration qui recalculerait donnerait à croire
	// qu'il interroge quelque chose.
	const [barreau, setBarreau] = useState('BORDEAUX');
	const [specialite, setSpecialite] = useState('');

	return (
		<Page>
			<PageHeader
				titre="Chercher un avocat"
				sousTitre="Un fichier ingéré, sa date, et ce qu’il ne déclare pas"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<ListeAnalyses>
						<LigneBouton
							titre="Chercher un avocat"
							valeur={barreau === '' ? 'Aucun barreau' : barreau}
							onClick={() => setOuverte(true)}
						/>
					</ListeAnalyses>

					<RechercheAvocat
						ouverte={ouverte}
						repertoire={BARREAUX_DEMO}
						barreau={barreau}
						specialite={specialite}
						etat={{ phase: 'TROUVE', resultat: AVOCATS_DEMO }}
						onFermer={() => setOuverte(false)}
						onChoisirBarreau={(choisi) => {
							setBarreau(choisi);
							setSpecialite('');
						}}
						onChoisirSpecialite={setSpecialite}
						onRetenir={() => setOuverte(false)}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LA RECHERCHE, DANS SES ÉTATS.
 *
 * La palette est la vraie, et ses réponses sont calculées par les fonctions du
 * serveur sur une base de démonstration (`-salle/recherche.ts`). Elle s'ouvre
 * sur « Martin », qui fait déborder les débiteurs : « Voir tout » et
 * « Réduire » sont ce qu'on vient regarder. Effacer le champ montre ce qui a
 * bougé ; un terme qui ne répond à rien montre la phrase d'absence. La seconde
 * entrée est l'établissement sans débiteur, où le vide montre l'import.
 */
function DemoRecherche({ vide }: { vide: boolean }) {
	const [ouverte, setOuverte] = useState(true);
	const [terme, setTerme] = useState(vide ? '' : 'Martin');
	const [deplie, setDeplie] = useState<FamilleRecherche | null>(null);

	return (
		<Page>
			<PageHeader
				titre="Rechercher"
				sousTitre={vide ? 'Un établissement sans débiteur' : 'Débiteurs, factures et procédures'}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					<ListeAnalyses>
						<LigneBouton
							titre="Rechercher « Durand, FA-2026-0311… »"
							onClick={() => setOuverte(true)}
						/>
					</ListeAnalyses>

					<PaletteRecherche
						ouverte={ouverte}
						terme={terme}
						onTerme={(valeur) => {
							setTerme(valeur);
							setDeplie(null);
						}}
						onFermer={() => setOuverte(false)}
						resultat={chercherDansLaDemo(vide ? '' : terme)}
						aJour
						recents={vide ? [] : RECENTS_DEMO}
						etablissementVide={vide}
						deplie={deplie}
						onDeplier={setDeplie}
						onOuvrir={() => setOuverte(false)}
					/>
				</div>
			</PageBody>
		</Page>
	);
}

const ECRANS = [
	'recherche',
	'recherche-vide',
	'veilleur',
	'bilan-import',
	'lettrage',
	'identite',
	'rail',
	'voie',
	'intervenant',
	'commissaire',
	'avocat',
	'bilan',
	'flux',
	'vide',
	'muette',
	'introuvable',
	'erreur',
	'coquille'
] as const;
type Ecran = (typeof ECRANS)[number];

const LIBELLE_ETAT: Record<EtatDemo, string> = {
	pret: 'prêt',
	vide: 'sans données',
	attente: 'en attente',
	erreur: 'en erreur'
};

function Showroom() {
	const [ecran, setEcran] = useState<Ecran>('veilleur');
	const [produit, setProduit] = useState<string | null>(
		ECRANS_DU_PRODUIT[0] === undefined ? null : cleDeLEcran(ECRANS_DU_PRODUIT[0])
	);
	const [etat, setEtat] = useState<EtatDemo>('pret');
	const [variante, setVariante] = useState<string | undefined>(undefined);

	const choisi = ECRANS_DU_PRODUIT.find((e) => cleDeLEcran(e) === produit) ?? null;
	// Trois états hors du produit : rien à regarder en attente ou en erreur sur
	// une démonstration de composant, donc les boutons restent visibles mais
	// `disabled`, plutôt que de faire sauter la rangée d'un écran à l'autre.
	const etats: readonly EtatDemo[] =
		choisi !== null && choisi.vide
			? ['pret', 'vide', 'attente', 'erreur']
			: ['pret', 'attente', 'erreur'];

	return (
		<div className="flex h-dvh flex-col">
			{/* UNE SEULE RANGÉE, et c'est voulu : les écrans se rendent dans leur
			    coquille, barres comprises, et chaque rangée de plus repousserait la
			    barre basse du téléphone hors de l'écran qu'on vient regarder. */}
			<div className="shrink-0 overflow-x-auto border-b border-cladd-bg-outline p-cladd-3xs">
				<Toolbar>
					<Segmented activeColor="brand" activeVariant="solid">
						{etats.map((e) => (
							<SegmentedButton
								key={e}
								// Sur une démonstration de composant, aucun état n'est « choisi » :
								// un bouton grisé mais allumé dirait l'inverse.
								active={choisi !== null && etat === e}
								disabled={choisi === null}
								onClick={() => setEtat(e)}
							>
								{LIBELLE_ETAT[e]}
							</SegmentedButton>
						))}
					</Segmented>
					{/* Les formes prêtes nommées d'un écran (une relance suspendue, un
					    litige déclaré…) : jamais visibles en dehors de l'état prêt, et
					    seulement quand l'écran choisi en déclare. */}
					{choisi !== null && choisi.variantes !== undefined && choisi.variantes.length > 0 ? (
						<Segmented activeColor="neutral" activeVariant="solid">
							<SegmentedButton
								// Hors de l'état prêt, aucune variante n'est appliquée : un bouton
								// grisé mais allumé dirait l'inverse.
								active={etat === 'pret' && variante === undefined}
								disabled={etat !== 'pret'}
								onClick={() => setVariante(undefined)}
							>
								principale
							</SegmentedButton>
							{choisi.variantes.map((v) => (
								<SegmentedButton
									key={v}
									active={etat === 'pret' && variante === v}
									disabled={etat !== 'pret'}
									onClick={() => setVariante(v)}
								>
									{v}
								</SegmentedButton>
							))}
						</Segmented>
					) : null}
					<Segmented activeColor="neutral" activeVariant="solid">
						{ECRANS_DU_PRODUIT.map((e) => (
							<SegmentedButton
								key={cleDeLEcran(e)}
								active={produit === cleDeLEcran(e)}
								onClick={() => {
									setProduit(cleDeLEcran(e));
									setEtat('pret');
									setVariante(undefined);
								}}
							>
								{e.libelle}
							</SegmentedButton>
						))}
						{ECRANS.map((e) => (
							<SegmentedButton
								key={e}
								active={produit === null && ecran === e}
								onClick={() => {
									setProduit(null);
									setEcran(e);
								}}
							>
								{e}
							</SegmentedButton>
						))}
					</Segmented>
				</Toolbar>
			</div>

			<div className="min-h-0 flex-1">
				{choisi !== null ? (
					<Shell>
						{/*
						  ⚠️ LA CLÉ PORTE LA ROUTE, L'ÉTAT ET LA VARIANTE, PAS LA ROUTE SEULE.
						  Une feuille ouverte dans « sans données » restait ouverte en passant
						  à « prêt », qui n'a rien pour la rouvrir. Remonter la démonstration
						  aux trois changements referme tout net, comme un nouvel écran.
						*/}
						<choisi.Demo
							key={`${cleDeLEcran(choisi)}|${etat}|${variante ?? ''}`}
							etat={etat}
							variante={etat === 'pret' ? variante : undefined}
						/>
					</Shell>
				) : (
					<>
						{ecran === 'recherche' ? <DemoRecherche vide={false} /> : null}
						{ecran === 'recherche-vide' ? <DemoRecherche vide /> : null}
						{ecran === 'bilan-import' ? <DemoBilanImport /> : null}
						{ecran === 'veilleur' ? <DemoVeilleurAvatar /> : null}
						{ecran === 'lettrage' ? <DemoLettrage /> : null}
						{ecran === 'identite' ? <DemoIdentite /> : null}
						{ecran === 'rail' ? <DemoRail /> : null}
						{ecran === 'voie' ? <DemoVoie /> : null}
						{ecran === 'intervenant' ? <DemoIntervenant /> : null}
						{ecran === 'commissaire' ? <DemoCommissaire /> : null}
						{ecran === 'avocat' ? <DemoAvocat /> : null}
						{ecran === 'bilan' ? <DemoBilan /> : null}
						{ecran === 'flux' ? <DemoFlux /> : null}
						{ecran === 'vide' ? <DemoVide /> : null}
						{ecran === 'muette' ? <DemoSurveillanceMuette /> : null}
						{ecran === 'introuvable' ? <EcranIntrouvable /> : null}
						{ecran === 'erreur' ? <EcranEnErreur /> : null}
						{ecran === 'coquille' ? (
							<Shell>
								<DemoFlux />
							</Shell>
						) : null}
					</>
				)}
			</div>
		</div>
	);
}
