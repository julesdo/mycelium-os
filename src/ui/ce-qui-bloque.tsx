import { useState } from 'react';
import { Button, Popup, PopupContent, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from './cn';
import { dateCourte } from './format';
import { useDeuxVolets } from './maitre-detail';

/**
 * CE QUI BLOQUE — en tête de page, ou nulle part.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI EST GRAVE NE SE REPLIE PAS : IL MONTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La règle du projet disait « ce qui est grave ne se replie pas », et trois
 * blocs se rendaient donc à plat — « Ce que le logiciel a relevé », « Ce que le
 * logiciel a supposé », « Ce que le logiciel ne voit pas ». À plat, oui : au bas
 * de la colonne DROITE, après quatre sections repliées, à cinq écrans de
 * défilement du haut. Un risque bloquant qu'il faut chercher est un risque tu.
 *
 * Ne pas replier ne suffit pas. Ce qui est grave MONTE : au-dessus du fil,
 * au-dessus de tout, juste sous le chiffre. Et quand il n'y a rien, ce composant
 * ne rend rien — pas « Aucun angle mort relevé sur ce dossier » suivi de trente
 * mots pour le confirmer. C'est la règle d'écran n° 4 du produit, « le vide
 * montre le chemin, jamais des cadrans à zéro », appliquée aux blocs.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TITRE EST UN CONSTAT, JAMAIS UN IMPÉRATIF
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les références du métier écrivent « Respond to damage report » — parce que
 * c'est LEUR contrepartie qui l'exige. Ici, rien n'oblige le gérant, et lui
 * écrire « Déclarez votre créance » serait un conseil juridique : troisième
 * ligne rouge du projet. Le titre dit ce qui EST — « Votre client est en
 * procédure collective » —, les phrases disent ce que ça change, et les options
 * s'énumèrent sans être classées ni mises en avant.
 *
 * ⚠️ L'ACCENT `orange` DU KIT, PAS L'AMBRE DES SEUILS. `--color-seuil-proche` ne
 * doit jamais signifier autre chose que « tout près du seuil ». Même choix, même
 * raison que `Bandeau`.
 */

/**
 * UNE SITUATION DU DOSSIER — contestation, procédure collective, paiement
 * partiel, radiation.
 *
 * ⚠️ ELLE AVAIT SON PROPRE COMPOSANT, `SituationsDossier`, RETIRÉ LE
 * 30/09/2026. Il rendait, pour chaque situation, un titre, trois paragraphes,
 * une date limite avec ses nuances, une citation encadrée et une liste à puces
 * « Ce que vous pouvez faire » — deux cent cinquante mots toujours ouverts, au
 * milieu de la page, dont aucune puce n'est cliquable par construction (ligne
 * rouge n° 3). La plus grosse masse de prose de l'écran était celle sur laquelle
 * on ne pouvait rien faire.
 *
 * Les situations sont devenues des `AlerteDossier`, en tête de page, avec les
 * risques et les angles morts. Le type, lui, décrit toujours ce que le
 * référentiel produit, et il reste donc ici.
 */
export interface SituationAffichee {
	readonly cle: string;
	readonly titre: string;
	readonly ceQuiSePasse: readonly string[];
	readonly dateLimite: {
		readonly date: string;
		readonly libelle: string;
		readonly reporteeDe: string | null;
		readonly departNonPrecise: string | null;
		readonly source: string;
	} | null;
	readonly options: readonly string[];
	readonly citation: {
		readonly texte: string;
		readonly source: string;
		readonly url: string;
	} | null;
}

export interface AlerteDossier {
	readonly cle: string;
	/** Ce qui EST. Un constat, pas un ordre. */
	readonly titre: string;
	/** Ce que ça change, en une ou deux phrases. */
	readonly phrases: readonly string[];
	/** La date qui compte, quand il y en a une. */
	readonly echeance: {
		readonly libelle: string;
		readonly date: string;
		/** Report de jour non ouvrable, départ non précisé : ce qui nuance la date. */
		readonly precisions: readonly string[];
		readonly source: string;
	} | null;
	/**
	 * Ce que le gérant PEUT faire, énuméré sans ordre.
	 *
	 * ⚠️ UNE ÉNUMÉRATION EN LIGNE, PLUS UNE LISTE À PUCES. Cinq puces sous un
	 * intitulé « Ce que vous pouvez faire » coûtaient quatre-vingt-dix pixels par
	 * situation, pour des options dont AUCUNE n'est cliquable — la ligne rouge
	 * n° 3 l'interdit. La plus grosse masse de prose de l'écran était celle sur
	 * laquelle on ne pouvait rien faire.
	 */
	readonly options: readonly string[];
	readonly citation: {
		readonly texte: string;
		readonly source: string;
		readonly url: string;
	} | null;
}

/**
 * Une option écrite pour une puce, rendue dans une phrase.
 *
 * ⚠️ LES OPTIONS GARDENT LEUR MAJUSCULE EN BASE, parce qu'elles peuvent se
 * rendre ailleurs en liste. C'est l'affichage en ligne — « Vous pouvez :
 * déclarer… · confier… » — qui l'abaisse, et seulement la première lettre : un
 * `toLowerCase()` entier écraserait un nom propre.
 */
function enMinuscule(option: string): string {
	return option.charAt(0).toLocaleLowerCase('fr-FR') + option.slice(1);
}

/**
 * TOUT CE QUE L'ALERTE DIT, UNE FOIS OUVERTE.
 *
 * Le texte n'a pas bougé d'un mot : ce qui a changé, c'est qu'il ne s'impose
 * plus à la lecture. Deux situations en tête de page faisaient deux cent vingt
 * mots à plat, relevés à 393 px le 30/09/2026 — la page s'ouvrait sur un mur
 * avant même de dire où en était le dossier.
 */
function DetailDeLAlerte({ alerte }: { readonly alerte: AlerteDossier }) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			{alerte.phrases.map((phrase) => (
				<p key={phrase} className="text-cladd-xs leading-snug">
					{phrase}
				</p>
			))}

			{alerte.echeance === null ? null : (
				<p className="text-cladd-xs leading-snug font-semibold">
					{alerte.echeance.libelle} : avant le {dateCourte(alerte.echeance.date)}
				</p>
			)}
			{alerte.echeance?.precisions.map((precision) => (
				<p key={precision} className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					{precision}
				</p>
			))}

			{alerte.options.length === 0 ? null : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					Vous pouvez : {alerte.options.map(enMinuscule).join(' · ')}.
				</p>
			)}

			{/*
			  LA SOURCE, ET LE TEXTE QU'ELLE PORTE. Montrer ce que dit la loi est la
			  moitié POSITIVE de la troisième ligne rouge : le produit ne rend pas de
			  verdict, mais il ne cache pas le texte sur lequel il compte.
			*/}
			{alerte.citation === null ? null : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-softer">
					« {alerte.citation.texte} »{' '}
					<a href={alerte.citation.url} target="_blank" rel="noreferrer" className="underline">
						{alerte.citation.source}
					</a>
				</p>
			)}
			{alerte.echeance === null ? null : (
				<p className="text-cladd-2xs text-cladd-fg-softest">{alerte.echeance.source}</p>
			)}
		</div>
	);
}

/**
 * UNE LIGNE PAR ALERTE — LE CONSTAT, ET SA DATE QUAND IL EN A UNE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI EST GRAVE MONTE, MAIS IL NE S'ÉTALE PLUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La règle de monter reste : ces lignes sont juste sous le montant, au-dessus
 * de tout le reste. Ce qui change est la place qu'elles prennent. Le constat
 * suffit à dire qu'il se passe quelque chose — « Votre client est en procédure
 * collective » —, et la date limite, quand il y en a une, est la seule autre
 * chose qu'on doit voir sans ouvrir. Le reste — ce que ça change, ce qu'on peut
 * faire, le texte de loi — se lit au toucher, comme le détail d'une livraison
 * retardée chez Shop.
 *
 * ⚠️ UNE ALERTE REPLIÉE N'EST PAS UNE ALERTE TUE. Son titre ET sa date restent à
 * l'écran ; le « doute qui ne profite jamais au produit » porte sur ce qu'on
 * voit, et l'on voit ce qui compte.
 *
 * ⚠️ MÊME RÈGLE DE PRÉSENTATION QUE LE RESTE DE LA PAGE : sous 1024 px le détail
 * se présente en feuille ; au-dessus il se déplie sous sa ligne.
 */
export function CeQuiBloque({ alertes }: { readonly alertes: readonly AlerteDossier[] }) {
	const [ouverte, setOuverte] = useState<string | null>(null);
	const deuxVolets = useDeuxVolets();

	if (alertes.length === 0) return null;

	const lue = alertes.find((alerte) => alerte.cle === ouverte) ?? null;

	return (
		<Surface
			color="orange"
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col p-0 [&>*+*]:border-t [&>*+*]:border-cladd-outline"
		>
			{alertes.map((alerte) => (
				<div key={alerte.cle} className="flex flex-col">
					<Button
						variant="transparent"
						outline={false}
						hoverable={false}
						size="md"
						// ⚠️ `min-h-13` : le `h-auto` qui laisse un constat long revenir à la
						// ligne annule aussi le plancher du kit. Voir `plancher-tactile.test.ts`.
						className="h-auto min-h-13 w-full rounded-none"
						contentClassName="w-full items-center gap-cladd-3xs px-cladd-2xs py-cladd-3xs"
						aria-expanded={ouverte === alerte.cle}
						onClick={() => setOuverte(ouverte === alerte.cle ? null : alerte.cle)}
					>
						<AlertTriangleIcon className="size-5 shrink-0 text-cladd-primary" aria-hidden />
						<span className="flex min-w-0 flex-1 flex-col text-left">
							<span className="text-cladd-xs leading-snug font-semibold">{alerte.titre}</span>
							{alerte.echeance === null ? null : (
								<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
									{alerte.echeance.libelle} : avant le {dateCourte(alerte.echeance.date)}
								</span>
							)}
						</span>
						<ChevronRightIcon
							className={cn(
								'size-5 shrink-0 text-cladd-fg-softer transition-transform duration-150',
								deuxVolets && ouverte === alerte.cle && 'rotate-90'
							)}
							aria-hidden
						/>
					</Button>
					{deuxVolets && ouverte === alerte.cle ? (
						<div className="px-cladd-2xs pb-cladd-2xs pl-12">
							<DetailDeLAlerte alerte={alerte} />
						</div>
					) : null}
				</div>
			))}

			{/*
			  ⚠️ UNE SEULE FEUILLE POUR TOUTES LES ALERTES, et c'est l'alerte LUE qui
			  la remplit. Elle se renvoie de trois façons — glissement, croix, appui
			  hors du cadre — qui passent toutes par `onOpenChange`.
			*/}
			{deuxVolets ? null : (
				<Popup
					open={lue !== null}
					onOpenChange={(o) => {
						if (!o) setOuverte(null);
					}}
					headerLeft={
						<span className="px-2 pb-1 text-cladd-xs font-semibold">{lue?.titre ?? ''}</span>
					}
				>
					<PopupContent>{lue === null ? null : <DetailDeLAlerte alerte={lue} />}</PopupContent>
				</Popup>
			)}
		</Surface>
	);
}
