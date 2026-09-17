import { Chip, SurfaceCut } from '@cladd-ui/react';
import { CheckIcon, LoaderCircleIcon, XIcon } from 'lucide-react';
import {
	CarteListe,
	LigneValeur,
	SectionEcran,
	pluriel,
	type BilanDepotAffiche,
	type DepotAffiche
} from '../../ui';
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
 * ⚠️ 1. LA LIGNE ELLE-MÊME, ET PAS SEULEMENT SA RAISON. C'est le défaut que
 * cette page corrige, et il était grave. Le serveur conserve de chaque ligne
 * illisible son TEXTE BRUT — tronqué à 300 caractères, « de quoi la reconnaître
 * dans le fichier », dit `convex/recouvrement/depot.ts` — et l'interface le
 * jetait : la carte n'affichait que la raison, et se servait du texte comme
 * clé React.
 *
 * Or les raisons que la production écrit ne désignent AUCUNE ligne :
 * « Montant illisible en débit ou en crédit. », « Date de pièce et date
 * d'écriture illisibles ». Deux lignes perdues sur un FEC de dix mille
 * donnaient donc deux fois la même phrase, et rien pour retrouver laquelle.
 * C'est un « 2 erreurs » sans dire lesquelles — la forme exacte que le produit
 * s'interdit — et ce sont deux factures qu'on ne réclamera pas.
 *
 * (Les données de démonstration écrivaient, elles, « Ligne 4128 : montant
 * illisible » — une raison que rien en production ne compose. La salle
 * masquait le défaut au lieu de le montrer ; voir `routes/-salle/import.tsx`.)
 *
 * ⚠️ 2. LE GESTE QUI RÉPARE, et la phrase qui le débloque. Corriger et
 * redéposer, c'est prendre le risque de créer deux fois les mêmes factures —
 * la peur qui fait qu'on ne redépose pas. Le dédoublonnage existe et il est
 * testé ; il fallait l'ÉCRIRE, à l'endroit et au moment où la question se pose.
 */

/**
 * L'état du dépôt, en une puce.
 *
 * Les mêmes accents que la carte (`ui/bilan-import.tsx`) : un même dépôt
 * regardé sur deux écrans ne change pas de couleur d'un écran à l'autre.
 */
function Etat({ statut }: { statut: DepotAffiche['statut'] }) {
	if (statut === 'TERMINE') {
		return (
			<Chip size="md" color="green">
				<CheckIcon />
				Lu
			</Chip>
		);
	}
	if (statut === 'ECHOUE') {
		return (
			<Chip size="md" color="red">
				<XIcon />
				Échec
			</Chip>
		);
	}
	/*
	  ⚠️ LE GLYPHE EST UN ENFANT DIRECT, PAS LA FENTE `icon`. `Chip` dimensionne
	  lui-même les `<svg>` qu'il reçoit en enfants (6 à 16 px selon sa taille) ;
	  un composant passé par `icon` porte sa propre taille, prise sur l'échelle
	  du produit où `sm` vaut déjà 40 px. C'est aussi ce que fait la carte
	  (`ui/bilan-import.tsx`), et les deux doivent se ressembler.
	*/
	return (
		<Chip size="md" color="neutral">
			<LoaderCircleIcon className="animate-spin" />
			Lecture en cours
		</Chip>
	);
}

/** Les comptes du bilan, dans l'ordre où on les lit. Les parts nulles ne s'écrivent pas. */
function partsEntrees(bilan: BilanDepotAffiche): readonly { libelle: string; valeur: number }[] {
	const parts = [
		{ libelle: 'Factures créées', valeur: bilan.facturesCreees },
		{ libelle: 'Règlements rapprochés', valeur: bilan.reglementsCrees },
		{ libelle: 'Débiteurs créés', valeur: bilan.debiteursCrees },
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
 * défile en travers. Deux lignes suffisent à reconnaître une écriture — au-delà
 * on recopie le fichier à l'écran.
 */
function LigneIllisible({ texte, raison }: { texte: string; raison: string }) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<p className="text-cladd-xs leading-relaxed">{raison}</p>
			{/*
			  ⚠️ VIDE, ON NE DESSINE PAS UN CREUX VIDE. Le texte brut est facultatif
			  en base ; une facture relue par le modèle n'en produit aucun. Un
			  rectangle creux vide se lirait comme une donnée manquante à l'écran
			  plutôt que comme une donnée qui n'existe pas.
			*/}
			{texte.trim() === '' ? null : (
				<SurfaceCut
					outline={false}
					className="rounded-cladd-lg"
					contentClassName="px-cladd-3xs py-cladd-3xs"
				>
					{/*
					  ⚠️ `2xs` (12 px) ET PAS `3xs` (10 px). Mesuré au navigateur : à
					  10 px, une chaîne qu'on doit recopier caractère par caractère dans
					  la recherche d'un logiciel de comptabilité devient un exercice de
					  vue. Ce n'est pas du texte courant qu'on survole, c'est un
					  identifiant qu'on lit juste.

					  `select-all` : un clic prend la ligne entière, ce qui évite de la
					  retaper — la seule erreur qui reste possible au gérant à ce
					  stade-là.
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
 * Trois sections empilées dans un seul défilement, jamais d'onglets : ce qui
 * est entré, ce qui ne l'est pas, ce qui a été écarté à bon droit. L'ordre est
 * délibéré — on ouvre cette page en croyant que tout est entré, et la seconde
 * section est celle qui coûte de l'argent.
 */
export function Bilan({ depot, minute }: { depot: DepotAffiche; minute: number | null }) {
	const bilan = depot.bilan;
	const enLecture = depot.statut !== 'TERMINE' && depot.statut !== 'ECHOUE';

	/**
	 * ⚠️ UNE LECTURE QUI N'A RIEN ÉCRIT DEPUIS UN QUART D'HEURE SE DIT.
	 *
	 * La tâche de lecture peut tomber entre son étape et son bilan ; le dépôt
	 * reste alors sur `LECTURE` pour toujours, et l'écran affichait « Lecture… »
	 * indéfiniment — indistinguable d'une lecture qui marche. Voir `horloge.ts`.
	 *
	 * On ne conclut pas à sa place : on écrit depuis combien de temps rien n'est
	 * arrivé, et ce qui se passe si on redépose.
	 */
	const age = depot.deposeLe === undefined ? null : minutesDepuis(depot.deposeLe, minute);
	const sansNouvelle = enLecture && age !== null && age >= MINUTES_SANS_NOUVELLE;

	const illisibles = bilan?.ignorees ?? [];
	const orphelins = bilan?.reglementsOrphelins ?? 0;
	const aDesEcarts = (bilan?.ignoreesTotal ?? 0) > 0 || orphelins > 0;

	return (
		<>
			<div className="flex flex-wrap items-center gap-cladd-3xs">
				<Etat statut={depot.statut} />
				{/* L'étape reste affichée après coup : un écran qui se vide à la fin
				    laisse croire qu'il ne s'est rien passé. */}
				{depot.etape ? (
					<span className="text-cladd-xs text-cladd-fg-soft">{depot.etape}</span>
				) : null}
			</div>

			{/*
			  ⚠️ LA SEULE PAGE DU PRODUIT OÙ LE GÉRANT ATTEND, et elle ne contenait
			  qu'une puce et une étape. Le dire une fois — la lecture continue sans
			  lui — est ce qui le libère de l'écran ; sans cette phrase, la seule
			  conduite raisonnable est de rester à regarder tourner une puce.

			  Elle ne s'affiche QUE pendant la lecture, et disparaît avec elle : une
			  fois le bilan là, il n'y a plus rien à attendre.
			*/}
			{enLecture && !sansNouvelle ? (
				<p className="px-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					La lecture se poursuit même si vous quittez cet écran. Le bilan s’affichera ici de
					lui-même.
				</p>
			) : null}

			{/*
			  L'ÉCHEC, EN PREMIER ET EN ENCRE PLEINE.

			  C'est le message que le serveur a composé, affiché tel quel : le
			  reformuler ici fabriquerait une seconde version de la vérité, qui
			  dériverait de la première à la première retouche du lecteur.
			*/}
			{/* Le titre emploie le même vocabulaire que la section des écarts —
			    « entré » / « pas entré » — parce que c'est la seule question que le
			    gérant se pose devant un dépôt, et qu'elle ne doit pas changer de mots
			    d'un état à l'autre. */}
			{depot.erreur ? (
				<SectionEcran titre="Pourquoi ce fichier n’est pas entré">
					<p className="text-cladd-xs leading-relaxed">{depot.erreur}</p>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						Corrigez le fichier, puis redéposez-le. Les factures déjà entrées par un autre dépôt ne
						seront pas créées une seconde fois.
					</p>
				</SectionEcran>
			) : null}

			{sansNouvelle ? (
				<SectionEcran titre="Sans nouvelle de la lecture">
					<p className="text-cladd-xs leading-relaxed">
						Ce fichier a été déposé il y a {delaiLisible(age)} et la lecture n’a rien écrit depuis.
					</p>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						Elle peut encore aboutir. Si rien ne change, redéposez le fichier : les factures déjà
						entrées ne seront pas créées une seconde fois.
					</p>
				</SectionEcran>
			) : null}

			{bilan ? (
				<CarteListe titre="Ce qui est entré">
					{partsEntrees(bilan).length === 0 ? (
						<LigneValeur libelle="Rien de nouveau" valeur="0" />
					) : (
						partsEntrees(bilan).map((part) => (
							<LigneValeur key={part.libelle} libelle={part.libelle} valeur={part.valeur} />
						))
					)}
				</CarteListe>
			) : null}

			{/*
			  ═════════════════════════════════════════════════════════════════════
			  ⚠️ CE QUI N'EST PAS ENTRÉ NE SE REPLIE DERRIÈRE AUCUN GESTE
			  ═════════════════════════════════════════════════════════════════════

			  Sur la carte, les raisons vivent dans un dépliant — la carte doit tenir
			  dans une pile. Sur cette page, dont c'est le sujet, rien ne se déplie :
			  le gérant y vient précisément pour ça, et un dépliant même ouvert par
			  défaut reste quelque chose qui peut se refermer sans rien dire.
			*/}
			{aDesEcarts && bilan ? (
				<SectionEcran
					titre="Ce qui n’est pas entré"
					legende={
						bilan.ignoreesTotal > 0
							? `${bilan.ignoreesTotal} ligne${pluriel(bilan.ignoreesTotal)} que la lecture n’a pas su lire`
							: undefined
					}
				>
					{orphelins > 0 ? (
						<p className="text-cladd-xs leading-relaxed">
							{orphelins} règlement{pluriel(orphelins)} sans facture connue : l’import est peut-être
							partiel.
						</p>
					) : null}

					{illisibles.map((ligne, rang) => (
						/*
						  ⚠️ LA CLÉ PORTE LE RANG, PAS LE TEXTE. Un FEC peut contenir deux
						  écritures rigoureusement identiques, et deux clés égales font
						  réutiliser une rangée pour l'autre. L'ordre, lui, est celui du
						  fichier et ne change pas entre deux rendus du même bilan.
						*/
						<LigneIllisible key={rang} texte={ligne.texte} raison={ligne.raison} />
					))}

					{/*
					  ⚠️ LE TOTAL EST TOUJOURS EXACT, LA LISTE EST BORNÉE À CINQUANTE.
					  Sans cette phrase, un fichier à trois cents lignes fautives
					  afficherait cinquante raisons sous une légende qui en annonce trois
					  cents, et l'écart passerait pour un défaut d'affichage.
					*/}
					{bilan.ignoreesTotal > illisibles.length ? (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
							Les {illisibles.length} premières sont montrées ici. Au-delà, c’est le fichier
							entier qui est à reprendre.
						</p>
					) : null}

					{bilan.ignoreesTotal > 0 ? (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
							Corrigez ces lignes dans votre export, puis redéposez-le. Les factures déjà entrées
							ne seront pas créées une seconde fois.
						</p>
					) : null}
				</SectionEcran>
			) : null}

			{/* Le hors-périmètre est dit à part, en gris : c'est un import qui a bien
			    travaillé, pas un défaut à corriger. */}
			{bilan && bilan.horsPerimetre > 0 ? (
				<p className="px-cladd-3xs text-cladd-2xs text-cladd-fg-softest">
					{bilan.horsPerimetre} écriture{pluriel(bilan.horsPerimetre)} hors périmètre (TVA,
					trésorerie) — écartée{pluriel(bilan.horsPerimetre)} à bon droit.
				</p>
			) : null}
		</>
	);
}
