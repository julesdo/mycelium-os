import { SectionTitle, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
import type { NatureAbandon } from '../lib/verticales/recouvrement/controle';
import { dateCourte, eurosCentimes, pluriel } from './format';
import { Lien } from './lien';
import type { Lecture } from './page-ecran';

/**
 * CE QUE VOS DÉCOMPTES LAISSENT DE CÔTÉ — l'autre bout de « Ce qui est dû ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE BLOC EXISTE, ET POURQUOI IL EST SUR CETTE PAGE-LÀ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `controlerDecompte` est le garde-fou le plus important du produit : un titre
 * exécutoire ne porte que sur les sommes qu'il chiffre, et ce qui n'y figure
 * pas est perdu, définitivement. Il ne se lisait que créance par créance, après
 * l'avoir ouverte — or un décompte amputé ne ressemble pas à un décompte
 * cassé : il affiche un total plus petit, parfaitement cohérent avec lui-même.
 * Personne ne l'ouvre pour vérifier qu'il va bien.
 *
 * `abandonsDeLEtablissement` pose la question à l'échelle de l'établissement.
 * Sa place est ici : « Ce qui est dû » dit ce que les factures portent, ce bloc
 * dit ce qui n'y serait pas porté. Même sujet, vu par l'autre bout.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN CONSTAT, JAMAIS UN CONSEIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Rien ici ne dit « ajoutez ces factures », « refaites ce décompte » ni « vous
 * devriez engager telle procédure ». Le bloc ÉNONCE ce qui serait abandonné et
 * s'arrête là ; le lien mène au décompte concerné, ce qui est une navigation,
 * pas une recommandation. La décision reste entière au gérant.
 *
 * ⚠️ AUCUN POURCENTAGE. Les décomptes incomplets se comptent, jamais « 12 % de
 * vos décomptes ». Aucun taux de réussite, aucune part récupérable, aucun
 * score.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TOTAL NE SE POSE PAS EN GRAND, ET C'EST DÉLIBÉRÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran porte déjà un chiffre en corps de cinquante-six pixels : le
 * supplément dû de plein droit. Un second grand nombre juste en dessous serait
 * exactement le défaut que l'en-tête de `screens/revelation.tsx` documente —
 * deux totaux sur un même écran coûtent plus qu'ils n'apportent, parce qu'on se
 * demande lequel croire. Le montant abandonné vit donc DANS la phrase qui le
 * nomme, en gras, et se redécompose carte par carte juste dessous.
 */

/** Un point relevé par le contrôle, tel que `abandonsDeLEtablissement` le rend. */
export interface AbandonAffiche {
	/** Le décompte arrêté qui laisserait cette somme dehors. */
	readonly decompteId: string;
	readonly debiteur: string;
	/** Le jour où ce décompte a été arrêté. */
	readonly arreteAu: string;
	readonly nature: NatureAbandon;
	/** La référence de facture, ou la clé du paramètre. */
	readonly reference: string;
	/** `null` quand la perte n'est pas chiffrable. Elle ne s'additionne alors pas. */
	readonly montantEnJeu: bigint | null;
	readonly explication: string;
}

export interface AbandonsAffiches {
	readonly abandons: readonly AbandonAffiche[];
	/** La somme des abandons CHIFFRABLES, en centimes. Voir `nombreNonChiffrables`. */
	readonly montantAbandonne: bigint;
	readonly nombreNonChiffrables: number;
	/** Combien de décomptes arrêtés ont été contrôlés, y compris les complets. */
	readonly decomptesControles: number;
	/** Combien d'entre eux portent au moins un point relevé. */
	readonly decomptesIncomplets: number;
}

/** Les points d'un même décompte, et ce qu'ils pèsent ensemble. */
interface GroupeParDecompte {
	readonly decompteId: string;
	readonly debiteur: string;
	readonly arreteAu: string;
	readonly points: readonly AbandonAffiche[];
	/** La somme des points CHIFFRABLES de ce décompte. */
	readonly montant: bigint;
	/** Vrai quand AUCUN point de ce décompte ne se chiffre : le montant ne s'écrit pas. */
	readonly rienNeSeChiffre: boolean;
}

/**
 * LES POINTS, REGROUPÉS PAR DÉCOMPTE.
 *
 * ⚠️ L'ORDRE DE LA REQUÊTE EST CONSERVÉ — le plus cher d'abord, ce qu'on ne
 * sait pas chiffrer en dernier. Un groupe prend le rang de son point le plus
 * cher, donc les décomptes se lisent aussi du plus lourd au plus léger, sans
 * qu'aucun tri ne soit refait ici. Refaire le tri à l'écran, c'est se donner
 * deux ordres à tenir d'accord.
 *
 * ⚠️ LES TOTAUX DE GROUPE SE RESOMMENT AU TOTAL ANNONCÉ, à l'exclusion des
 * points non chiffrables — qui ne s'additionnent nulle part, ni ici ni au
 * serveur. C'est ça, décomposer un montant : le gérant refait l'addition à la
 * main et retombe sur le chiffre de la phrase.
 */
function grouperParDecompte(abandons: readonly AbandonAffiche[]): readonly GroupeParDecompte[] {
	const groupes: GroupeParDecompte[] = [];
	const rangs = new Map<string, number>();

	for (const point of abandons) {
		const rang = rangs.get(point.decompteId);
		if (rang === undefined) {
			rangs.set(point.decompteId, groupes.length);
			groupes.push({
				decompteId: point.decompteId,
				debiteur: point.debiteur,
				arreteAu: point.arreteAu,
				points: [point],
				montant: point.montantEnJeu ?? 0n,
				rienNeSeChiffre: point.montantEnJeu === null
			});
			continue;
		}
		const groupe = groupes[rang];
		// `noUncheckedIndexedAccess` : le rang vient d'être posé par cette boucle.
		if (groupe === undefined) continue;
		groupes[rang] = {
			...groupe,
			points: [...groupe.points, point],
			montant: groupe.montant + (point.montantEnJeu ?? 0n),
			rienNeSeChiffre: groupe.rienNeSeChiffre && point.montantEnJeu === null
		};
	}

	return groupes;
}

/** Ce qu'on écrit à la place d'un montant qu'on ne sait pas chiffrer. */
const NON_CHIFFRABLE = 'montant non chiffrable';

/**
 * UN DÉCOMPTE ET CE QU'IL LAISSE DEHORS.
 *
 * ⚠️ L'EXPLICATION DU DOMAINE N'EST RENDUE QUE QUAND LA RANGÉE NE LA DIT PAS
 * DÉJÀ. Pour une facture écartée, la phrase de `controlerDecompte` énonce
 * exactement ce que la rangée porte — la référence, le montant, et le fait
 * qu'elle ne sera pas couverte —, et la phrase d'en-tête du bloc le dit une
 * fois pour toutes. Répétée à l'identique sur chaque ligne d'un établissement
 * qui en compte cent, elle cesse d'être lue, et elle enterre les deux autres
 * natures dont l'explication, elle, porte des chiffres qu'aucune rangée ne
 * montre : l'écart entre les intérêts annoncés et ce que les périodes
 * justifient, ou le paramètre juridique qui manque. RIEN N'EST PERDU : ce qui
 * disparaît se reconstitue depuis la rangée et l'en-tête.
 */
function CarteDuDecompte({ groupe }: { groupe: GroupeParDecompte }) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<Lien
				to="/app/decompte/$id"
				// Le `to` générique du routeur est effacé par le type de CE composant,
				// qui le borne déjà à une route existante. Même assertion qu'à
				// `navigation.tsx` et `rangee-file.tsx`, et pour la même raison.
				params={{ id: groupe.decompteId } as never}
				className="flex flex-col gap-cladd-3xs rounded-cladd-lg text-left transition-colors"
			>
				<span className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
					<span className="text-cladd-sm font-semibold">{groupe.debiteur}</span>
					<span className="text-cladd-sm font-semibold tabular-nums">
						{groupe.rienNeSeChiffre ? NON_CHIFFRABLE : eurosCentimes(groupe.montant)}
					</span>
				</span>
				<span className="text-cladd-2xs text-cladd-fg-softer">
					Décompte arrêté au {dateCourte(groupe.arreteAu)} · {groupe.points.length} point
					{pluriel(groupe.points.length)} relevé{pluriel(groupe.points.length)}
				</span>

				{groupe.points.map((point) => (
					<span
						key={`${point.nature}-${point.reference}`}
						className="flex flex-col gap-0.5 border-t border-cladd-outline pt-cladd-3xs"
					>
						<span className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
							<span className="text-cladd-xs font-medium">{point.reference}</span>
							<span className="text-cladd-xs text-cladd-fg-soft tabular-nums">
								{point.montantEnJeu === null ? NON_CHIFFRABLE : eurosCentimes(point.montantEnJeu)}
							</span>
						</span>
						{point.nature === 'FACTURE_ECARTEE' ? null : (
							<span className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{point.explication}
							</span>
						)}
					</span>
				))}
			</Lien>
		</Surface>
	);
}

/**
 * LE SUJET DES DEUX PHRASES DE TÊTE, ACCORDÉ.
 *
 * ⚠️ ÉCRIT UNE FOIS, ET PAS BRICOLÉ À COUPS DE `pluriel()` DANS LE JSX. Ces
 * phrases parlent d'un nombre de décomptes ET du nombre de clients derrière :
 * « vos 3 décomptes arrêtés … de leur client » se lit comme si les trois
 * appartenaient au même. Le produit soigne ses chiffres ; une phrase fausse
 * autour d'eux les décrédibilise aussi sûrement qu'un total faux.
 */
function sujetDesDecomptes(nombre: number): {
	sujet: string;
	porte: string;
	possessif: string;
} {
	return nombre > 1
		? { sujet: `Vos ${nombre} décomptes arrêtés`, porte: 'portent', possessif: 'leurs clients' }
		: { sujet: 'Votre décompte arrêté', porte: 'porte', possessif: 'son client' };
}

/**
 * CE QUE LE CONTRÔLE A TROUVÉ.
 *
 * ⚠️ ZÉRO N'EST PAS UN CADRAN VIDE (règle d'écran n° 4). Un établissement dont
 * tous les décomptes sont complets ne voit pas une carte à « 0,00 € » : il lit
 * une phrase qui le lui dit, et qui date le contrôle.
 */
function ConstatDuControle({ valeur }: { valeur: AbandonsAffiches }) {
	const { abandons, montantAbandonne, nombreNonChiffrables, decomptesControles } = valeur;
	const incomplets = valeur.decomptesIncomplets;
	const tous = sujetDesDecomptes(decomptesControles);

	if (abandons.length === 0) {
		return (
			<p className="px-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">
				{tous.sujet} {tous.porte} toutes les factures connues de {tous.possessif} : aucune somme
				n’en est écartée. Le contrôle vient d’être refait, contre les factures d’aujourd’hui.
			</p>
		);
	}

	// « 1 de vos 1 décompte » ne s'écrit pas : quand tout l'établissement tient
	// en un décompte, la phrase le nomme au singulier et se passe de fraction.
	const vises = sujetDesDecomptes(incomplets);
	const tete =
		decomptesControles > 1
			? `${incomplets} de vos ${decomptesControles} décomptes arrêtés ne ${incomplets > 1 ? 'portent' : 'porte'} pas tout ce qui est connu de ${vises.possessif}.`
			: 'Votre seul décompte arrêté ne porte pas tout ce qui est connu de son client.';

	return (
		<>
			<p className="flex items-start gap-1.5 px-1 text-cladd-xs leading-relaxed text-cladd-fg">
				<AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
				<span>
					{tete}{' '}
					<span className="font-semibold tabular-nums">{eurosCentimes(montantAbandonne)}</span> n’y
					sont pas chiffrés, et ce qu’un acte ne chiffre pas ne pourra plus être réclamé au titre de
					cette procédure.
				</span>
			</p>

			{grouperParDecompte(abandons).map((groupe) => (
				<CarteDuDecompte key={groupe.decompteId} groupe={groupe} />
			))}

			{nombreNonChiffrables > 0 ? (
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					{nombreNonChiffrables} de ces points ne se
					{nombreNonChiffrables > 1 ? ' chiffrent' : ' chiffre'} pas, et n’
					{nombreNonChiffrables > 1 ? 'entrent' : 'entre'} donc pas dans le total : les fondre
					dedans ferait passer un abandon qu’on ne sait pas chiffrer pour un abandon de zéro euro.
				</p>
			) : null}
		</>
	);
}

/**
 * LE BLOC ENTIER, AVEC SES TROIS ÉTATS.
 *
 * ⚠️ IL PORTE SA PROPRE LECTURE, ET NE RETIENT PAS LE CHIFFRE DE LA PAGE. Le
 * contrôle relit tous les décomptes et toutes les factures de l'établissement ;
 * le faire attendre par le total dû ferait payer à la page entière le coût du
 * seul bloc qui peut être lent. Il s'affiche donc de lui-même, en train de
 * travailler puis rempli (règle d'écran n° 2 : tout traitement se voit sans
 * qu'on le demande).
 *
 * ⚠️ ET L'ÉCHEC NE SE LIT JAMAIS COMME UN ZÉRO. Le doute ne profite pas au
 * produit : un contrôle qui n'a pas pu s'exécuter DIT qu'il n'a rien pu
 * vérifier, il ne disparaît pas en laissant croire que tout va bien.
 *
 * ⚠️ PAS DE SUJET, PAS DE SECTION. Un établissement qui n'a encore arrêté aucun
 * décompte ne voit rien : « 0 décompte contrôlé » serait un cadran à zéro
 * déguisé en rassurance, sur un écran dont la règle est d'en poser aucun.
 */
export function CeQueLesDecomptesLaissentDeCote({
	lecture
}: {
	lecture: Lecture<AbandonsAffiches>;
}) {
	if (lecture.etat === 'pret' && lecture.valeur.decomptesControles === 0) return null;

	return (
		<section className="flex flex-col gap-cladd-3xs">
			<SectionTitle>Ce que vos décomptes laissent de côté</SectionTitle>

			{lecture.etat === 'attente' ? (
				<div className="flex flex-col gap-cladd-3xs px-1">
					<p role="status" className="text-cladd-xs text-cladd-fg-soft">
						Contrôle de vos décomptes arrêtés, contre les factures d’aujourd’hui…
					</p>
					<div aria-hidden="true" className="flex flex-col gap-1.5">
						<span className="h-3 w-3/5 animate-pouls rounded-full bg-cladd-fg/10" />
						<span className="h-3 w-2/5 animate-pouls rounded-full bg-cladd-fg/10" />
					</div>
				</div>
			) : lecture.etat === 'erreur' ? (
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex gap-cladd-3xs p-cladd-2xs"
				>
					<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
					<div className="flex min-w-0 flex-col gap-1.5">
						<p className="text-cladd-xs font-semibold">Ce contrôle n’a pas pu s’exécuter</p>
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							Vos décomptes arrêtés n’ont pas été comparés à vos factures. Cet écran ne peut donc
							rien dire de ce qu’ils laissent de côté — ni qu’il y a quelque chose, ni qu’il n’y a
							rien.
						</p>
					</div>
				</Surface>
			) : (
				<ConstatDuControle valeur={lecture.valeur} />
			)}
		</section>
	);
}
