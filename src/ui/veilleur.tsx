import { Link, type LinkProps } from '@tanstack/react-router';
import { List, ListButton, ListItem, ListTitle, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, ChevronRightIcon, RadarIcon, ScanLineIcon } from 'lucide-react';
import { cn } from './cn';
import { dateCourte } from './format';

/**
 * LE VEILLEUR — ce que la machine a fait pendant que personne ne regardait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QU'IL CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce produit fait tourner, sans qu'on le lui demande : un battement quotidien
 * qui recalcule tout et décide s'il faut parler, un radar de solvabilité qui
 * interroge les registres publics chaque nuit, une lecture de pièces qui passe
 * par le modèle. La table `battements` garde de chaque nuit un statut et une
 * RAISON — dont le schéma dit lui-même « affiché tel quel ».
 *
 * Elle n'était affichée nulle part. L'accueil recevait la raison et la jetait
 * sur une ligne, en repliant `PARLE` et `TU` sur un état « NORMAL » qui ne rend
 * rien. Conséquence exacte : LE SEUL MOMENT OÙ LE PRODUIT ADMETTAIT QU'UNE
 * MACHINE TRAVAILLE POUR LUI ÉTAIT LE JOUR OÙ ELLE TOMBAIT EN PANNE.
 *
 * C'est une perte sèche. Le travail de fond est ce qu'on vend — « on vend un
 * logiciel qui mesure, pas du temps humain » — et il était le seul élément du
 * produit à n'avoir aucune représentation à l'écran.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ « UN BANDEAU VERT PERMANENT DEVIENT DU DÉCOR » — L'OBJECTION EST JUSTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle est écrite dans l'écran d'accueil, et elle a raison CONTRE UN BANDEAU
 * VERT : un signe qui dit la même chose tous les jours cesse d'être lu en trois
 * jours, et ne dit plus rien le jour où il disparaît.
 *
 * Un journal de travail n'est pas ce signe-là. Son texte change chaque nuit —
 * « rien de nouveau, rien de critique », puis « 3 points critiques », puis
 * « sept jours sans nouvelle » — et son horodatage vieillit à vue. Ce qui
 * devient du décor, c'est ce qui ne varie pas ; ici, la variation EST
 * l'information.
 *
 * Et le cas de panne y gagne au lieu d'y perdre : un échec n'est plus un
 * bandeau qui surgit sur un écran qui n'en portait aucun — chose qu'on apprend
 * à écarter d'un geste — c'est une ligne de ce journal qui change d'état, au
 * milieu de lignes qu'on lit déjà.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL, ICI NON PLUS. Le vert, l'ambre et le rouge sont
 * réservés à `--color-seuil-*` et ne disent qu'une chose dans ce produit. Un
 * travail qui tourne se marque par un POULS, un travail rompu par un
 * pictogramme. Voir `.pouls` dans `app.css`.
 */

/** L'état d'un travail, du point de vue de celui qui regarde l'écran. */
export type EtatTravail =
	/** Il a tourné, et il a rendu quelque chose. */
	| 'TOURNE'
	/** Il tourne en ce moment. C'est la seule ligne qui bouge. */
	| 'EN_COURS'
	/** Il a échoué. Ce que l'écran affiche par ailleurs est peut-être un symptôme. */
	| 'ROMPU'
	/** Il n'a pas encore tourné sur cet établissement. */
	| 'PAS_ENCORE';

export interface TacheVeilleur {
	readonly cle: string;
	readonly titre: string;
	/**
	 * CE QUE LA MACHINE DIT D'ELLE-MÊME, tel quel.
	 *
	 * ⚠️ On ne reformule pas. `raison` est composée par `briefing.ts` au moment
	 * de la décision et elle porte le raisonnement exact de cette nuit-là. La
	 * réécrire à l'écran, c'est fabriquer une seconde version de la vérité qui
	 * dérivera de la première à la première retouche.
	 */
	readonly dit: string;
	/** `null` tant qu'il n'y a rien à horodater — jamais une date inventée. */
	readonly quand: string | null;
	readonly etat: EtatTravail;
	readonly vers?: LinkProps['to'];
	readonly parametres?: LinkProps['params'];
}

/**
 * Un dépôt encore en machine, tel que la base le connaît.
 *
 * `etape` est FACULTATIF en base — c'est « un texte destiné à l'écran, pas un
 * état de machine », et la machine ne le publie pas toujours. On ne le fabrique
 * donc pas : sans étape, on dit l'état réel, qui est l'attente.
 */
export interface DepotEnCours {
	readonly id: string;
	readonly filename: string;
	readonly etape?: string;
}

const HEURE = new Intl.DateTimeFormat('fr-FR', {
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'UTC'
});

/**
 * Quand un travail a tourné, dit comme un gérant le lit.
 *
 * ⚠️ `aujourdHui` EST UN ARGUMENT, PAS UNE LECTURE D'HORLOGE. Lire l'heure ici
 * ferait de cette fonction un rendu impur — ce que `react-hooks/purity` refuse
 * — et surtout rendrait le veilleur intestable à une date choisie. Tout le
 * produit prend déjà sa date en argument, depuis `ui/horloge.ts`, pour la même
 * raison : un calcul rejouable est un calcul vérifiable.
 */
function quandLisible(jour: string, termineLe: number, aujourdHui: string): string {
	if (jour === aujourdHui) return `cette nuit, ${HEURE.format(new Date(termineLe))}`;
	return dateCourte(jour);
}

/**
 * Les travaux du veilleur, dans l'ordre où ils se lisent.
 *
 * ⚠️ CE QUI BOUGE MAINTENANT PASSE DEVANT. Un dépôt en cours de lecture est la
 * seule ligne dont l'état changera pendant qu'on la regarde ; la reléguer sous
 * un relevé de la nuit dernière obligerait à la chercher. C'est aussi la règle
 * d'écran n° 2 : tout traitement se voit sans qu'on le demande.
 */
export function travauxDuVeilleur({
	battement,
	depotsEnCours,
	aujourdHui
}: {
	/**
	 * Le dernier relevé de la nuit.
	 *
	 * ⚠️ TROIS VALEURS, PAS DEUX, ET C'EST DÉLIBÉRÉ. `null` veut dire « la
	 * machine n'a jamais tourné ici » et doit se DIRE ; `undefined` veut dire
	 * « la réponse n'est pas encore arrivée » et doit SE TAIRE. Les confondre
	 * ferait afficher « elle n'a pas encore tourné » le temps d'un aller-retour,
	 * à chaque ouverture — une phrase fausse, répétée, sur la ligne même qui doit
	 * rester croyable le jour où la surveillance tombe vraiment.
	 */
	readonly battement:
		| {
				readonly jour: string;
				readonly statut: 'PARLE' | 'TU' | 'ECHEC';
				readonly raison: string;
				readonly termineLe: number;
		  }
		| null
		| undefined;
	readonly depotsEnCours: readonly DepotEnCours[];
	readonly aujourdHui: string;
}): readonly TacheVeilleur[] {
	const travaux: TacheVeilleur[] = [];

	for (const depot of depotsEnCours) {
		travaux.push({
			cle: `depot-${depot.id}`,
			titre: depot.filename,
			dit: depot.etape ?? 'en attente de lecture',
			quand: null,
			etat: 'EN_COURS',
			vers: '/app/import-factures/$id',
			parametres: { id: depot.id }
		});
	}

	// Le chargement se tait. Voir la note sur la prop : `undefined` n'est pas
	// `null`, et les confondre affiche une phrase fausse à chaque ouverture.
	if (battement === undefined) return travaux;

	if (battement === null) {
		travaux.push({
			cle: 'surveillance',
			titre: 'La surveillance de vos délais',
			// ⚠️ ON NE SE TAIT PAS. Un veilleur muet est indistinguable d'un
			// veilleur absent, et c'est exactement le malentendu qui fait perdre
			// une créance : le gérant se croit couvert et ne surveille plus.
			dit: 'elle n’a pas encore tourné sur cet établissement',
			quand: null,
			etat: 'PAS_ENCORE'
		});
		return travaux;
	}

	travaux.push({
		cle: 'surveillance',
		titre: 'La surveillance de vos délais',
		dit: battement.raison,
		quand: quandLisible(battement.jour, battement.termineLe, aujourdHui),
		etat: battement.statut === 'ECHEC' ? 'ROMPU' : 'TOURNE',
		vers: '/app/revelation'
	});

	return travaux;
}

/**
 * LE POULS — la seule chose de l'écran qui bouge toute seule.
 *
 * Il ne marque QUE le travail en cours. Un pouls posé sur les lignes déjà
 * terminées ferait exactement ce que l'objection au bandeau vert décrit : une
 * animation permanente qu'on cesse de voir, et qui ne dit plus rien le jour où
 * elle compte.
 */
function Pouls() {
	return <span className="pouls relative inline-flex size-2 shrink-0 rounded-full" aria-hidden />;
}

function IconeTravail({ etat }: { etat: EtatTravail }) {
	if (etat === 'EN_COURS') return <ScanLineIcon size={18} />;
	if (etat === 'ROMPU') return <AlertTriangleIcon size={18} />;
	return <RadarIcon size={18} />;
}

/**
 * Une ligne du journal. Elle mène quelque part dès qu'il y a quelque chose à
 * voir — c'est ce qui la distingue d'un bandeau : on peut ENTRER dans ce que
 * la machine a trouvé, au lieu d'en lire le résumé et rester là.
 */
/**
 * Le titre d'une rangée, précédé de son pouls quand elle travaille.
 *
 * ⚠️ LE POULS EST DANS LE TITRE, PAS DANS LE SLOT `icon`. `icon` porte déjà le
 * pictogramme du travail, et Cladd lui applique une boîte carrée dimensionnée
 * sur la taille de la rangée : y glisser un second élément le déformerait. Le
 * pouls appartient de toute façon au titre — il dit « CETTE ligne-ci bouge ».
 */
function TitreTravail({ tache }: { tache: TacheVeilleur }) {
	return (
		<span className="flex min-w-0 items-center gap-2">
			{tache.etat === 'EN_COURS' ? <Pouls /> : null}
			<span className="truncate">{tache.titre}</span>
		</span>
	);
}

/**
 * Ce que la machine dit — le slot `footer` du kit.
 *
 * ⚠️ C'EST UN SLOT DU KIT, pas une pile faite à la main. `ListButton` porte
 * `header` / titre / `footer` et cale lui-même leur rythme vertical sur la
 * taille de la rangée. Reconstruire cette pile avec des `flex-col` donne une
 * rangée qui ne s'aligne plus sur ses voisines dès qu'on change de taille —
 * exactement la dérive que la règle « on ne réinvente aucun composant » existe
 * pour empêcher.
 */
function Dit({ tache }: { tache: TacheVeilleur }) {
	return (
		<span className={cn(tache.etat === 'ROMPU' ? 'text-cladd-fg-soft' : 'text-cladd-fg-softer')}>
			{tache.dit}
		</span>
	);
}

/**
 * QUAND — en bandeau au-dessus du titre, jamais collé à la phrase.
 *
 * ⚠️ MESURÉ, PAS SUPPOSÉ. Concaténé au texte de la machine — « rien de nouveau,
 * rien de critique · cette nuit, 06:12 » — l'ensemble repassait à la ligne à
 * 375 px et la rangée montait à 68 px, avec l'horodatage seul et orphelin sur
 * la seconde ligne. Les deux morceaux ne disent pas la même chose et n'ont pas
 * à partager une ligne.
 *
 * Le slot `header` du kit est fait pour ça — la documentation le nomme « an
 * eyebrow date/category » — et c'est aussi le traitement de la référence, qui
 * pose « Today, 1:53 AM » au-dessus de l'intitulé et jamais à sa suite.
 */
function Quand({ quand }: { quand: string }) {
	return <span className="text-cladd-fg-softest">{quand}</span>;
}

function LigneTravail({ tache }: { tache: TacheVeilleur }) {
	/**
	 * ⚠️ `ListItem` N'A NI `icon` NI `footer` — il ne prend que `children`. C'est
	 * la rangée STATIQUE du kit, volontairement pauvre. Elle ne sert ici qu'au
	 * travail qui n'a nulle part où mener ; aujourd'hui tous en ont un, mais la
	 * prop `vers` est facultative et cette branche doit rester juste, sans quoi
	 * le premier travail sans destination casserait la compilation.
	 */
	if (tache.vers === undefined) {
		return (
			<ListItem className="gap-cladd-3xs">
				<IconeTravail etat={tache.etat} />
				<span className="flex min-w-0 flex-col gap-0.5">
					{tache.quand === null ? null : (
						<span className="text-cladd-2xs">
							<Quand quand={tache.quand} />
						</span>
					)}
					<TitreTravail tache={tache} />
					<span className="text-cladd-2xs leading-snug">
						<Dit tache={tache} />
					</span>
				</span>
			</ListItem>
		);
	}

	return (
		<ListButton
			as={Link}
			to={tache.vers}
			// ⚠️ UNE ASSERTION, ET LA MÊME QUE DANS `navigation.tsx`. `ListButton`
			// est polymorphe : son `as` efface le générique du routeur. Les props de
			// CE composant restent typées par lui (`LinkProps['to']`), donc une
			// destination inexistante échoue toujours à la compilation — et depuis
			// `__tests__/destinations-existent.test.ts`, même écrite en littéral
			// derrière un `as`.
			params={tache.parametres as never}
			icon={<IconeTravail etat={tache.etat} />}
			header={tache.quand === null ? undefined : <Quand quand={tache.quand} />}
			footer={<Dit tache={tache} />}
			after={<ChevronRightIcon size={16} className="shrink-0 text-cladd-fg-softest" aria-hidden />}
		>
			<TitreTravail tache={tache} />
		</ListButton>
	);
}

/**
 * LE BLOC, sur l'accueil.
 *
 * ⚠️ IL NE DISPARAÎT JAMAIS. C'est la règle « l'écran est le même à zéro qu'à
 * cinquante mille », appliquée au travail de fond : un bloc qui n'apparaît que
 * les jours où il s'est passé quelque chose apprend au gérant que son absence
 * est normale — et le jour où il manque parce que la machine est tombée, plus
 * rien ne le distingue d'un jour calme.
 */
export function Veilleur({ travaux }: { travaux: readonly TacheVeilleur[] }) {
	if (travaux.length === 0) return null;

	const enCours = travaux.some((t) => t.etat === 'EN_COURS');

	return (
		<Surface
			as="section"
			aria-label="Le travail de fond"
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="p-0"
		>
			<List>
				{/*
				  ⚠️ L'INTITULÉ EST DANS LA CARTE, ET C'EST UNE MESURE — PAS UN GOÛT.

				  Il a d'abord été posé AU-DESSUS, en `<header>` sur le fond nu. Mesuré
				  au navigateur : `--cladd-fg-softer` (luminance 0,074) sur la crête du
				  drapé (0,087) donne un contraste de 1,1 pour 1. C'est-à-dire rien —
				  le mot « veilleur » était littéralement invisible sur la crête, et
				  lisible ailleurs, ce qui est pire qu'uniformément faible : le titre
				  apparaissait et disparaissait selon l'endroit du drapé qu'il croisait.

				  `ListTitle` est la réponse du kit — la documentation le décrit comme
				  « an uppercase eyebrow label for naming a group of rows » — et il se
				  cale de lui-même sur le rembourrage de la liste. C'est aussi le
				  traitement de la référence, dont le libellé « Automations » est DANS
				  la carte et jamais posé sur le fond.
				*/}
				<ListTitle className="flex items-baseline justify-between gap-cladd-3xs">
					<span>Le veilleur</span>
					{/*
					  ⚠️ « EN CE MOMENT » NE S'AFFICHE QUE S'IL EST VRAI. C'est la seule
					  mention de l'écran qui affirme une activité à l'instant présent ;
					  l'écrire en permanence ferait du produit un décor qui prétend
					  travailler — et le mensonge serait sur le seul point qu'on vend.
					*/}
					{enCours ? <span className="normal-case">en ce moment</span> : null}
				</ListTitle>

				{travaux.map((tache) => (
					<LigneTravail key={tache.cle} tache={tache} />
				))}
			</List>
		</Surface>
	);
}
