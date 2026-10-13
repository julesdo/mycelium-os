import type { ReactNode } from 'react';
import { SectionTitle } from '@cladd-ui/react';
import { CircleUserIcon, GavelIcon, UsersIcon } from 'lucide-react';
import {
	BarreDuBas,
	BoutonCompagnon,
	CapsulePlume,
	ScenePlume,
	useReflexion,
	IconeLetikette,
	PastilleDeRappel,
	PageEcran,
	cn,
	type DestinationBarre,
	type HumeurPlume,
	type JourDeLaScene,
	type JourneeDeLaScene,
	type LigneDeLaScene
} from '../../ui';
import { lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * LA BARRE DU BAS ET LE COMPAGNON, DANS TOUS LEURS ÉTATS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UNE SCÈNE PAR ÉTAT, ET PAS LA VRAIE BARRE DE LA COQUILLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La coquille monte la barre et le compagnon sur TOUS les écrans de la salle —
 * c'est même ce qui permet d'y vérifier le dégagement du bas aux quatre largeurs
 * de référence. Mais cette barre-là est branchée sur le routeur : dans la salle,
 * l'adresse est `/showroom`, donc aucun onglet n'est actif et le bloc de verre
 * reste effacé. On ne peut pas y voir ce qu'on vient précisément vérifier — que
 * le bloc se pose bien sous CHACUN des quatre, et que le faisceau suit.
 *
 * ⚠️ D'OÙ LES SCÈNES, ET LE SEUL TOUR DE CSS DE CE FICHIER. Les deux composants
 * sont `fixed` : posés tels quels, ils se caleraient sur la fenêtre, les uns par
 * dessus les autres et par-dessus la vraie barre. Un ancêtre qui porte un
 * `transform` devient le bloc conteneur de ses descendants `fixed` — c'est la
 * règle CSS, pas une astuce —, donc `transform-gpu` sur la scène enferme chaque
 * exemplaire dans son cadre. Sept états se lisent alors côte à côte, à la taille
 * réelle.
 *
 * Les scènes n'existent QUE dans la salle. Rien de ce fichier n'entre en
 * production : c'est le pendant exact du principe de la salle, qui rend le vrai
 * composant avec des données inventées.
 */

const ICONES = {
	aujourdhui: IconeLetikette,
	clients: UsersIcon,
	creances: GavelIcon,
	compte: CircleUserIcon
} as const;

/**
 * Les quatre destinations, telles que `app/barre.tsx` les pose. Recopiées ici
 * plutôt qu'importées : la salle doit pouvoir rendre un onglet actif que la
 * navigation réelle ne produit pas, et le rappel y est une pastille figée, non
 * une lecture Convex.
 */
function destinations(actif: keyof typeof ICONES, rappel: ReactNode): DestinationBarre[] {
	return [
		{
			cle: 'aujourdhui',
			libelle: 'Aujourd’hui',
			vers: '/app',
			Icone: ICONES.aujourdhui,
			actif: actif === 'aujourdhui',
			rappel
		},
		{
			cle: 'clients',
			libelle: 'Clients',
			vers: '/app/clients',
			Icone: ICONES.clients,
			actif: actif === 'clients'
		},
		{
			cle: 'creances',
			libelle: 'Dossiers',
			vers: '/app/dossiers',
			Icone: ICONES.creances,
			actif: actif === 'creances'
		},
		{
			cle: 'compte',
			libelle: 'Compte',
			vers: '/app/compte',
			Icone: ICONES.compte,
			actif: actif === 'compte'
		}
	];
}

/**
 * UNE SCÈNE : un cadre qui devient le bloc conteneur de ce qu'il contient.
 *
 * `transform-gpu` fait le bloc conteneur (voir l'en-tête) ; `overflow-hidden`
 * coupe ce qui dépasse ; la hauteur laisse la place au flottant le plus haut.
 */
function Scene({
	titre,
	hauteur,
	children
}: {
	titre: string;
	hauteur: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<p className="text-cladd-3xs text-cladd-fg-softer">{titre}</p>
			<div
				className={cn(
					'verre-carte relative transform-gpu overflow-hidden rounded-cladd-xl',
					hauteur
				)}
			>
				{children}
			</div>
		</div>
	);
}

const ETATS_COMPAGNON: readonly {
	readonly titre: string;
	readonly humeur: HumeurPlume;
	readonly compte: number;
}[] = [
	{ titre: 'Plume veille : il respire, cligne, regarde autour', humeur: 'repos', compte: 0 },
	{ titre: 'Plume travaille : ses yeux lisent', humeur: 'travaille', compte: 0 },
	{
		titre: 'Quelque chose vous attend : il s’agite, la pastille compte',
		humeur: 'attention',
		compte: 3
	}
];

/**
 * LES SCÈNES DE LA SALLE (13/10/2026, au soir) : les phrases que `compagnon/presence.ts`
 * et `compagnon/journee.ts` composent vraiment, avec la tête qu'il fait en les disant.
 * Chaque scène réfléchit d'abord (trois points), puis parle.
 */
const JOURNEE_DEMO: JourneeDeLaScene = {
	titre: '2 sur 5 aujourd’hui',
	faits: 2,
	total: 5,
	serie: '4 jours d’affilée'
};
const SEMAINE_DEMO: readonly JourDeLaScene[] = [
	{ jour: '2026-10-12', lettre: 'L', etat: 'TENUE' },
	{ jour: '2026-10-13', lettre: 'M', etat: 'TENUE' },
	{ jour: '2026-10-14', lettre: 'M', etat: 'AVENIR' },
	{ jour: '2026-10-15', lettre: 'J', etat: 'AVENIR' },
	{ jour: '2026-10-16', lettre: 'V', etat: 'AVENIR' },
	{ jour: '2026-10-17', lettre: 'S', etat: 'AVENIR' },
	{ jour: '2026-10-18', lettre: 'D', etat: 'AVENIR' }
];
const SCENES: readonly {
	readonly titre: string;
	readonly humeur: HumeurPlume;
	readonly texte: string;
	readonly geste?: string;
	readonly rang: { readonly position: number; readonly total: number };
	readonly taire?: boolean;
	readonly semaine?: readonly JourDeLaScene[];
	readonly releve?: readonly LigneDeLaScene[];
	readonly journee: JourneeDeLaScene;
	readonly suite?: string;
}[] = [
	{
		titre: 'À votre retour : son point, fait par fait (14/10)',
		humeur: 'salue',
		texte: 'Bonjour Jules. Depuis hier, 18 h 40 :',
		releve: [
			{ icone: 'ENVOI', texte: '3 relances parties à votre nom' },
			{ icone: 'PAIEMENT', texte: '1 paiement reçu de Boulangerie Martin : 1 240,00 €' },
			{ icone: 'DOSSIER', texte: '2 dossiers ouverts pour des factures échues' }
		],
		geste: 'Tout voir',
		rang: { position: 1, total: 2 },
		journee: JOURNEE_DEMO,
		suite:
			'Ensuite : 2 relances, la première aujourd’hui à 9 h. Chacune s’affichera au-dessus de la barre une heure avant.'
	},
	{
		titre: 'Une nuit calme se dit aussi',
		humeur: 'salue',
		texte: 'Bonjour Jules. Depuis hier, 18 h 40 :',
		releve: [
			{ icone: 'CALME', texte: 'Rien n’a bougé : aucune relance partie, aucun paiement reçu' }
		],
		geste: 'Tout voir',
		rang: { position: 1, total: 1 },
		journee: JOURNEE_DEMO,
		suite: 'Je relis vos comptes toutes les quinze minutes, et je vous dis ici ce que je fais.'
	},
	{
		titre: 'Ce qui vous attend : un défi du jour, avec son geste',
		humeur: 'attention',
		texte: 'J’ai préparé 3 dossiers de clients en retard. Je ne relance rien avant votre feu vert.',
		geste: 'Les voir',
		rang: { position: 1, total: 3 },
		taire: true,
		journee: JOURNEE_DEMO,
		suite: 'Ensuite : deuxième rappel pour Fournitures Durand, demain à 9 h.'
	},
	{
		titre: 'De l’argent est rentré : il fait la fête',
		humeur: 'fete',
		texte:
			'Boulangerie Martin vient de vous payer 1 240,00 €. Ses relances s’arrêtent sur ce qui est réglé.',
		rang: { position: 1, total: 1 },
		journee: JOURNEE_DEMO,
		suite: 'En ce moment : envoie le rappel à Transports Vidal, 2 sur 3.'
	},
	{
		titre: 'La journée bouclée, et la semaine en coches',
		humeur: 'fete',
		texte:
			'Tout ce qui vous attendait aujourd’hui est fait : 5 jours d’affilée sans rien laisser traîner.',
		rang: { position: 1, total: 1 },
		semaine: SEMAINE_DEMO,
		journee: { titre: 'Journée bouclée', faits: 5, total: 5, serie: '5 jours d’affilée' }
	},
	{
		titre: 'Sa présentation, la première fois : il salue',
		humeur: 'salue',
		texte:
			'Bonjour, je suis Plume. Je relis vos factures, j’ouvre le dossier de chaque client en retard et je prépare ses relances. Quand j’ai quelque chose à vous dire, je sors vous le dire ici.',
		rang: { position: 1, total: 2 },
		journee: { titre: 'Rien ne vous attend aujourd’hui', faits: 0, total: 0, serie: null }
	},
	{
		titre: 'Le mot après un geste : il écrit',
		humeur: 'ecrit',
		texte:
			'J’ai préparé la lettre de Fournitures Durand. Elle attend votre relecture : rien n’est parti.',
		geste: 'La relire',
		rang: { position: 1, total: 1 },
		journee: JOURNEE_DEMO
	}
];

/** La capsule en direct, dans ses deux états (`compagnon/en-direct.ts`). */
const CAPSULES: readonly {
	readonly titreDeScene: string;
	readonly genre: 'TRAVAIL' | 'DEPART';
	readonly titre: string;
	readonly ligne: string;
	readonly part: number;
	readonly humeur: HumeurPlume;
	/** « Retenir » pour un départ, « Voir » quand plusieurs partent. */
	readonly geste?: string;
}[] = [
	{
		titreDeScene: 'Il travaille : l’anneau se remplit, étape après étape',
		genre: 'TRAVAIL',
		titre: 'Prépare vos relances',
		ligne: 'Écrit à Transports Vidal · 2 sur 3',
		part: 1 / 3,
		humeur: 'ecrit'
	},
	{
		titreDeScene: 'Une relance part dans l’heure : l’anneau se vide, « Retenir » sous le pouce',
		genre: 'DEPART',
		titre: 'Relance dans 23 min',
		ligne: 'Fournitures Durand · deuxième rappel à 14 h 30',
		part: 23 / 60,
		humeur: 'repos',
		geste: 'Retenir'
	},
	{
		titreDeScene: 'Plusieurs départs : la première, et les suivantes comptées',
		genre: 'DEPART',
		titre: '3 relances d’ici 14 h 45',
		ligne: 'Boulangerie Martin la première, dans 8 min',
		part: 8 / 60,
		humeur: 'repos',
		geste: 'Voir'
	}
];

/** Une scène : Plume réfléchit dans le bouton (trois points dans la bulle), puis prend sa tête. */
function SceneDeLaSalle({ scene }: { readonly scene: (typeof SCENES)[number] }) {
	const { titre, humeur, texte, geste, rang, taire, semaine, releve, journee, suite } = scene;
	const reflechit = useReflexion(titre);
	return (
		<BarreDuBas
			destinations={destinations('aujourdhui', null)}
			accessoire={
				<BoutonCompagnon
					humeur={reflechit ? 'reflechit' : humeur}
					compte={rang.total - rang.position}
					description="Parler à Plume"
					onOuvrir={() => undefined}
					pensee={false}
					progression={journee.total === 0 ? 1 : journee.faits / journee.total}
					bulle={
						<ScenePlume
							reflechit={reflechit}
							texte={texte}
							journee={journee}
							{...(semaine === undefined ? {} : { semaine })}
							{...(releve === undefined ? {} : { releve })}
							{...(geste === undefined ? {} : { libelleDuGeste: geste, onGeste: () => undefined })}
							rang={rang}
							{...(rang.position < rang.total
								? { onSuivant: () => undefined }
								: { onParler: () => undefined })}
							onFermer={() => undefined}
							{...(taire === true ? { onTaire: () => undefined } : {})}
							{...(suite === undefined ? {} : { suite })}
						/>
					}
				/>
			}
		/>
	);
}

function DemoBarreEtCompagnon({ etat }: { etat: EtatDemo }) {
	const lecture = lectureDemo(etat, true);

	return (
		<PageEcran
			entete={{
				genre: 'onglet',
				titre: 'La barre et le compagnon',
				sousTitre:
					'Chaque onglet actif tour à tour, et les trois états du bouton flottant. La vraie barre, elle, est en bas de cet écran comme sur tous les autres.'
			}}
			etat={lecture.etat}
		>
			<SectionTitle>La barre, un onglet à la fois</SectionTitle>
			{/* Le bloc de verre doit se poser sous CHACUN des quatre, et le faisceau
			    lent tourner sur celui-là seul. C'est ce qu'aucune navigation ne
			    montre d'un coup, et c'est la seule chose qui casse en silence quand la
			    piste cesse d'être exactement pavée par les onglets. */}
			<Scene titre="« Aujourd’hui » actif, avec son rappel" hauteur="h-28">
				<BarreDuBas destinations={destinations('aujourdhui', <PastilleDeRappel compte={2} />)} />
			</Scene>
			<Scene titre="« Clients » actif" hauteur="h-28">
				<BarreDuBas destinations={destinations('clients', null)} />
			</Scene>
			<Scene titre="« Dossiers » actif" hauteur="h-28">
				<BarreDuBas destinations={destinations('creances', null)} />
			</Scene>
			<Scene titre="« Compte » actif, et un rappel au-dessus de neuf" hauteur="h-28">
				<BarreDuBas destinations={destinations('compte', <PastilleDeRappel compte={12} />)} />
			</Scene>
			{/* ⚠️ L'ÉTAT SANS ONGLET ACTIF EXISTE, ET IL SE REGARDE. Sur une page
			    poussée — un décompte, une pièce — le bloc de verre s'EFFACE au lieu de
			    rester accroché au dernier onglet visité, ce qui affirmerait qu'on est
			    quelque part où l'on n'est pas. */}
			<Scene titre="Aucun onglet actif — le bloc s’efface" hauteur="h-28">
				<BarreDuBas
					destinations={destinations('aujourdhui', null).map((d) => ({ ...d, actif: false }))}
				/>
			</Scene>

			<SectionTitle>Le compagnon, dans la barre</SectionTitle>
			{ETATS_COMPAGNON.map(({ titre, humeur, compte }) => (
				<Scene key={titre} titre={titre} hauteur="h-60">
					<BarreDuBas
						destinations={destinations('aujourdhui', null)}
						accessoire={
							<BoutonCompagnon
								humeur={humeur}
								compte={compte}
								description="Parler à Plume"
								onOuvrir={() => undefined}
							/>
						}
					/>
				</Scene>
			))}

			<SectionTitle>Plume en direct, au-dessus de la barre</SectionTitle>
			{/* La capsule (14/10/2026) : ce qu'il fait en ce moment, ou la relance qui part dans
			    l'heure. Les phrases sont celles que `compagnon/en-direct.ts` compose. */}
			{CAPSULES.map((capsule) => (
				<Scene key={capsule.titreDeScene} titre={capsule.titreDeScene} hauteur="h-44">
					<BarreDuBas
						destinations={destinations('clients', null)}
						auDessus={
							<CapsulePlume
								genre={capsule.genre}
								titre={capsule.titre}
								ligne={capsule.ligne}
								part={capsule.part}
								{...(capsule.geste !== undefined
									? { libelleDuGeste: capsule.geste, onGeste: () => undefined }
									: {})}
								onOuvrir={() => undefined}
							/>
						}
						accessoire={
							<BoutonCompagnon
								humeur={capsule.humeur}
								description="Parler à Plume"
								onOuvrir={() => undefined}
								progression={0.4}
							/>
						}
					/>
				</Scene>
			))}

			<SectionTitle>Plume vous parle, depuis la barre</SectionTitle>
			{/* Plume, grand dans le bouton, réfléchit (trois points dans la bulle), puis prend la
			    tête de ce qu'il dit ; l'anneau de la journée entoure le bouton (13/10/2026, au soir). */}
			{SCENES.map((scene) => (
				<Scene
					key={scene.titre}
					titre={scene.titre}
					hauteur={scene.releve === undefined ? 'h-96' : 'h-120'}
				>
					<SceneDeLaSalle scene={scene} />
				</Scene>
			))}

			{/*
			  ⚠️ CE QUE CETTE PAGE NE PROUVE PAS, ET IL FAUT LE DIRE. La salle empile sa
			  propre rangée de boutons AU-DESSUS de la coquille, et la coquille est en
			  `h-dvh` : elle déborde donc de la fenêtre de la hauteur de cette rangée,
			  et la vraie barre — qui est `fixed`, donc calée sur la FENÊTRE — se pose
			  plus haut que le bas de la zone qui défile. Le dégagement se mesure ici en
			  comparant le bas du contenu au bas du CONTENEUR, jamais à celui de la
			  fenêtre.
			*/}
			<p className="text-cladd-3xs leading-relaxed text-cladd-fg-softest">
				Ces cadres ne sont pas la vraie barre : ils enferment un exemplaire fixe grâce au
				`transform` de leur scène. La vraie barre et le vrai bouton flottant sont en bas de cet
				écran, comme sur tous les autres — c’est là que le dégagement du bas se regarde, et pas dans
				ces cadres.
			</p>
		</PageEcran>
	);
}

export const ECRANS_BARRE_ET_COMPAGNON: readonly EcranDuProduit[] = [
	{
		/*
		  ⚠️ LA CLÉ EST OBLIGATOIRE ICI. La salle choisit par `route`, et `/app/` est
		  déjà pris par la file : sans clé, cette entrée serait injoignable.
		*/
		route: '/app/',
		cle: 'barre-et-compagnon',
		libelle: 'Barre + compagnon',
		vide: false,
		Demo: DemoBarreEtCompagnon
	}
];
