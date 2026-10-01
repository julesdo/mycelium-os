import { Spinner, SurfaceCut } from '@cladd-ui/react';
import {
	EnTeteDeGroupe,
	LigneFixe,
	ListeAnalyses,
	ListeDeRangees,
	NombreHero,
	pluriel,
	type BilanDepotAffiche,
	type DepotAffiche
} from '../../ui';
import type { ModeDepot } from './depots';
import { delaiLisible, minutesDepuis, MINUTES_SANS_NOUVELLE } from './horloge';

/**
 * LE BILAN D'UN DÉPÔT, EN GRAND — ce qui est entré, et surtout ce qui ne l'est
 * pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE PAGE NE RÉUTILISE PAS `ui/BilanImport`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `BilanImport` est la CARTE du bilan : elle vit dans une pile — la file, le
 * volet de preuve, la page publique — où elle doit tenir en quatre lignes à
 * côté de dix autres cartes. Elle y est juste, et elle ne bouge pas.
 *
 * Cette page-ci n'est pas une carte dans une pile : c'est l'écran dont le seul
 * sujet est CE dépôt. Elle a la place d'écrire ce que la carte doit résumer, et
 * deux choses n'ont leur place QUE là :
 *
 * ⚠️ 1. LA LIGNE ELLE-MÊME, ET PAS SEULEMENT SA RAISON. Le serveur conserve de
 * chaque ligne illisible son TEXTE BRUT — tronqué à 300 caractères, « de quoi la
 * reconnaître dans le fichier », dit `convex/recouvrement/depot.ts`. Les raisons
 * que la production écrit ne désignent AUCUNE ligne (« Montant illisible en
 * débit ou en crédit. ») : sans le texte, deux lignes perdues sur un FEC de dix
 * mille donnaient deux fois la même phrase, et rien pour retrouver laquelle.
 *
 * ⚠️ 2. LE GESTE QUI RÉPARE, et la phrase qui le débloque. Corriger et
 * redéposer, c'est prendre le risque de créer deux fois les mêmes factures —
 * la peur qui fait qu'on ne redépose pas. Le dédoublonnage existe et il est
 * testé ; il fallait l'ÉCRIRE, à l'endroit et au moment où la question se pose.
 */

/**
 * D'OÙ VIENNENT LES FACTURES D'UN DÉPÔT, en trois mots.
 *
 * ⚠️ LE FORMAT DU BILAN TRANCHE, PAS LE MODE. Le mode vaut `FACTURE_DEPOSEE`
 * pour tout PDF déposé ; or un Factur-X est lu dans son propre fichier, sans un
 * centime d'appel modèle. Déduite du mode, la phrase affichait un appel qui
 * n'avait jamais eu lieu — sur exactement le point que ce chemin apporte.
 * `bilan.format` est écrit APRÈS la lecture, par le serveur qui a ouvert le
 * fichier.
 *
 * Le mode ne sert qu'en repli, quand le bilan manque ou porte un format que cet
 * écran ne connaît pas encore : il dit alors par où le fichier est PASSÉ, ce qui
 * reste vrai.
 */
export function provenance(format: string | undefined, mode?: ModeDepot): string {
	switch (format) {
		case 'FACTUR_X':
			return 'Lue dans le fichier';
		case 'FACTURE_DEPOSEE':
			return 'Relue par le modèle';
		case 'FEC':
			return 'Export comptable (FEC)';
		case 'CSV_GENERIQUE':
			return 'Export comptable (CSV)';
	}
	return mode === 'FACTURE_DEPOSEE' ? 'Relue par le modèle' : 'Export comptable';
}

/**
 * L'ÉTAT DU DÉPÔT EN TOUTES LETTRES, CENTRÉ, quand il n'y a pas de chiffre à
 * poser : l'échec, la lecture, le silence. Même place et même centrage que le
 * nombre qu'il remplace — un dépôt qui change d'état ne déplace pas sa page.
 */
function EtatEnGrand({
	titre,
	legende,
	note,
	attente = false
}: {
	titre: string;
	legende?: string;
	/** Une seconde ligne, plus discrète : ce que le gérant peut faire en attendant. */
	note?: string;
	attente?: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-1 py-cladd-3xs text-center">
			{attente ? <Spinner size="sm" /> : null}
			<p className="text-cladd-md font-bold tracking-tight">{titre}</p>
			{legende === undefined ? null : (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{legende}</p>
			)}
			{note === undefined ? null : <p className="text-cladd-2xs text-cladd-fg-softer">{note}</p>}
		</div>
	);
}

/** Ce qui est entré EN PLUS des factures, dans l'ordre où on le lit. Les parts nulles ne s'écrivent pas. */
function partsEntrees(bilan: BilanDepotAffiche): readonly { libelle: string; valeur: number }[] {
	const parts = [
		{ libelle: 'Règlements rapprochés', valeur: bilan.reglementsCrees },
		{ libelle: 'Clients créés', valeur: bilan.debiteursCrees },
		{ libelle: 'Factures déjà connues', valeur: bilan.facturesDejaConnues }
	];
	/**
	 * ⚠️ « 0 RÈGLEMENT » OCCUPE LA PLACE D'UNE INFORMATION SANS EN ÊTRE UNE, et
	 * une colonne de zéros est exactement le « cadran à zéro » que la règle
	 * d'écran n° 4 interdit. Ce qui a été ÉCARTÉ, lui, s'écrit toujours : c'est
	 * l'autre moitié de la même règle.
	 */
	return parts.filter((part) => part.valeur > 0);
}

/**
 * UNE LIGNE QU'ON N'A PAS SU LIRE.
 *
 * La raison d'abord, en encre courante : c'est elle qu'on lit. Le texte brut
 * ensuite, dans un creux — `SurfaceCut` est la surface que le kit destine aux
 * « code blocks » — parce que ce n'est pas une phrase à lire mais une chaîne à
 * RETROUVER, en la cherchant dans son logiciel de comptabilité.
 *
 * ⚠️ DEUX LIGNES AU PLUS, ET COUPÉES N'IMPORTE OÙ. Une ligne de FEC n'a pas
 * d'espaces : sans `break-all` elle sort de la carte par la droite, et l'écran
 * défile en travers.
 */
function LigneIllisible({ texte, raison }: { texte: string; raison: string }) {
	return (
		<div className="flex flex-col gap-cladd-3xs px-cladd-2xs py-cladd-3xs">
			<p className="text-cladd-xs leading-relaxed">{raison}</p>
			{/*
			  ⚠️ VIDE, ON NE DESSINE PAS UN CREUX VIDE. Le texte brut est facultatif
			  en base ; une facture relue par le modèle n'en produit aucun.
			*/}
			{texte.trim() === '' ? null : (
				<SurfaceCut
					outline={false}
					className="rounded-cladd-lg"
					contentClassName="px-cladd-3xs py-cladd-3xs"
				>
					{/*
					  ⚠️ `2xs` (13 px) : une chaîne qu'on recopie caractère par caractère
					  dans la recherche d'un logiciel de comptabilité se lit juste.
					  `select-all` : un clic prend la ligne entière.
					*/}
					<code className="line-clamp-2 font-mono text-cladd-2xs break-all text-cladd-fg-soft select-all">
						{texte}
					</code>
				</SurfaceCut>
			)}
		</div>
	);
}

/**
 * LE BILAN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE CHIFFRE D'ABORD, PUIS CE QUI MANQUE — RELEVÉ SUR EXPENSIFY ET SLACK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page ouvrait sur une puce « Lu », l'étape « Lecture terminée. », puis une
 * carte titrée en capitales où « Factures créées 198 » n'était qu'une rangée
 * parmi quatre. Relevé sur Mobbin le 01/10/2026 : Expensify répond à un import
 * par le nombre de ce qui est entré, et Slack, quand tout n'est pas passé, par
 * un groupe « One invitation didn't send » dont chaque rangée dit pourquoi.
 *
 * D'où la page : le nombre de factures entrées, en grand et centré, avec d'où
 * elles viennent ; le reste de ce qui est entré en rangées ; puis « Pas
 * entré », son compte, et chaque ligne avec son texte brut. La phrase qui
 * débloque le redépôt s'écrit UNE fois, sous ce qu'elle répare.
 *
 * ⚠️ ELLE SE MET À JOUR SEULE, et l'ordre est délibéré : on ouvre cette page en
 * croyant que tout est entré, et la seconde moitié est celle qui coûte de
 * l'argent.
 */
export function Bilan({ depot, minute }: { depot: DepotAffiche; minute: number | null }) {
	const bilan = depot.bilan;
	const enLecture = depot.statut !== 'TERMINE' && depot.statut !== 'ECHOUE';

	/**
	 * ⚠️ UNE LECTURE QUI N'A RIEN ÉCRIT DEPUIS UN QUART D'HEURE SE DIT. La tâche
	 * peut tomber entre son étape et son bilan ; le dépôt reste alors en lecture
	 * pour toujours. On ne conclut pas à sa place : on écrit depuis combien de
	 * temps rien n'est arrivé, et ce qui se passe si on redépose.
	 */
	const age = depot.deposeLe === undefined ? null : minutesDepuis(depot.deposeLe, minute);
	const sansNouvelle = enLecture && age !== null && age >= MINUTES_SANS_NOUVELLE;

	const illisibles = bilan?.ignorees ?? [];
	const ignorees = bilan?.ignoreesTotal ?? 0;
	const orphelins = bilan?.reglementsOrphelins ?? 0;
	const autres = bilan === undefined ? [] : partsEntrees(bilan);

	/** La phrase qui débloque le redépôt, écrite une fois, sous ce qu'elle répare. */
	const redeposer =
		depot.statut === 'ECHOUE'
			? 'Corrigez le fichier, puis redéposez-le.'
			: sansNouvelle
				? 'Elle peut encore aboutir. Si rien ne change, redéposez le fichier.'
				: ignorees > 0
					? 'Corrigez ces lignes dans votre export, puis redéposez-le.'
					: null;

	return (
		<>
			{/*
			  L'ÉCHEC EST LE MESSAGE QUE LE SERVEUR A COMPOSÉ, affiché tel quel : le
			  reformuler ici fabriquerait une seconde version de la vérité.
			*/}
			{depot.statut === 'ECHOUE' ? (
				<EtatEnGrand titre="Ce fichier n’est pas entré" legende={depot.erreur} />
			) : sansNouvelle ? (
				<EtatEnGrand
					titre="Sans nouvelle de la lecture"
					legende={`Déposé il y a ${delaiLisible(age)}, et rien n’est arrivé depuis.`}
				/>
			) : enLecture ? (
				/*
				  ⚠️ LA SEULE PAGE DU PRODUIT OÙ LE GÉRANT ATTEND. Le dire une fois — la
				  lecture continue sans lui — est ce qui le libère de l'écran.
				*/
				<EtatEnGrand
					attente
					titre="Lecture en cours"
					legende={depot.etape ?? 'Le fichier est en cours de lecture.'}
					note="Vous pouvez quitter cet écran : le bilan s’affichera ici."
				/>
			) : bilan === undefined ? null : bilan.facturesCreees === 0 ? (
				<EtatEnGrand titre="Aucune facture nouvelle" legende={provenance(bilan.format)} />
			) : (
				<NombreHero
					nombre={bilan.facturesCreees}
					surTitre={bilan.facturesCreees === 1 ? 'Facture entrée' : 'Factures entrées'}
					legende={provenance(bilan.format)}
				/>
			)}

			{autres.length === 0 ? null : (
				<ListeAnalyses>
					{autres.map((part) => (
						<LigneFixe
							key={part.libelle}
							genre="contenu"
							titre={part.libelle}
							valeur={String(part.valeur)}
						/>
					))}
				</ListeAnalyses>
			)}

			{/*
			  ═════════════════════════════════════════════════════════════════════
			  ⚠️ CE QUI N'EST PAS ENTRÉ NE SE REPLIE DERRIÈRE AUCUN GESTE
			  ═════════════════════════════════════════════════════════════════════

			  Le gérant vient précisément pour ça, et un dépliant même ouvert par
			  défaut reste quelque chose qui peut se refermer sans rien dire.
			*/}
			{ignorees + orphelins === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Pas entré" nombre={ignorees + orphelins} total={null} />
					<ListeDeRangees>
						{orphelins > 0 ? (
							<p className="px-cladd-2xs py-cladd-3xs text-cladd-xs leading-relaxed">
								{orphelins} règlement{pluriel(orphelins)} sans facture connue : l’import est
								peut-être partiel.
							</p>
						) : null}
						{illisibles.map((ligne, rang) => (
							/*
							  ⚠️ LA CLÉ PORTE LE RANG, PAS LE TEXTE. Un FEC peut contenir deux
							  écritures rigoureusement identiques ; l'ordre, lui, est celui du
							  fichier et ne change pas entre deux rendus du même bilan.
							*/
							<LigneIllisible key={rang} texte={ligne.texte} raison={ligne.raison} />
						))}
					</ListeDeRangees>
					{/*
					  ⚠️ LE TOTAL EST TOUJOURS EXACT, LA LISTE EST BORNÉE À CINQUANTE.
					  Sans cette phrase, l'écart entre le compte et la liste passerait
					  pour un défaut d'affichage.
					*/}
					{ignorees > illisibles.length ? (
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
							Les {illisibles.length} premières lignes sont montrées ici. Au-delà, c’est le fichier
							entier qui est à reprendre.
						</p>
					) : null}
				</section>
			)}

			{redeposer === null ? null : (
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					{redeposer} Les factures déjà entrées ne seront pas créées une seconde fois.
				</p>
			)}

			{/* Le hors-périmètre est dit à part, en gris : c'est un import qui a bien
			    travaillé, pas un défaut à corriger. */}
			{bilan && bilan.horsPerimetre > 0 ? (
				<p className="px-1 text-cladd-2xs text-cladd-fg-softest">
					{bilan.horsPerimetre} écriture{pluriel(bilan.horsPerimetre)} hors périmètre (TVA,
					trésorerie), écartée{pluriel(bilan.horsPerimetre)} à bon droit.
				</p>
			) : null}
		</>
	);
}
