import type { ReactNode } from 'react';
import { SectionTitle } from '@cladd-ui/react';
import { CircleUserIcon, GavelIcon, HomeIcon, UsersIcon } from 'lucide-react';
import {
	BarreDuBas,
	CompagnonFlottant,
	PastilleDeRappel,
	PageEcran,
	cn,
	type DestinationBarre,
	type EtatCompagnon
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
	aujourdhui: HomeIcon,
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
			vers: '/app/debiteurs',
			Icone: ICONES.clients,
			actif: actif === 'clients'
		},
		{
			cle: 'creances',
			libelle: 'Créances',
			vers: '/app/procedures',
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

const ETATS_COMPAGNON: readonly { readonly titre: string; readonly etat: EtatCompagnon }[] = [
	{ titre: 'Au repos — la lueur respire, six secondes par cycle', etat: { genre: 'REPOS' } },
	{
		titre: 'Il a quelque chose à dire — la lueur s’anime, le compte se pose',
		etat: { genre: 'A_DIRE', compte: 3 }
	},
	{
		titre: 'Indisponible — la capsule reste, et l’ouvrir montre le refus complet',
		etat: {
			genre: 'INDISPONIBLE',
			phrase: 'Conversation libre arrêtée jusqu’au mois prochain.'
		}
	}
];

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
			<Scene titre="« Créances » actif" hauteur="h-28">
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

			<SectionTitle>Le compagnon, au-dessus de la barre</SectionTitle>
			{ETATS_COMPAGNON.map(({ titre, etat: etatCompagnon }) => (
				<Scene key={titre} titre={titre} hauteur="h-60">
					<BarreDuBas destinations={destinations('aujourdhui', null)} />
					<CompagnonFlottant
						portee="Borné au dossier ouvert : ses factures, ses pièces, ses décomptes."
						etat={etatCompagnon}
						onOuvrir={() => undefined}
					/>
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
				écran, comme sur tous les autres — c’est là que le dégagement du bas se regarde, et pas
				dans ces cadres.
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
