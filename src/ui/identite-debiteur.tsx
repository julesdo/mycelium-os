import { useState } from 'react';
import { Chip, Input, Select, Surface } from '@cladd-ui/react';
import {
	RechercheRegistre,
	type EtatRecherche,
	type EtablissementPropose
} from './recherche-registre';

import { dateCourte } from './format';

/**
 * CE QUE LE GÉRANT SEUL PEUT DIRE DE SON DÉBITEUR.
 *
 * « Le logiciel décide, le gérant confirme » (règle d'écran n° 1) : aucun écran
 * ne demande une saisie que le logiciel peut déduire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE FICHIER A LONGTEMPS DIT L'INVERSE, ET S'EST TROMPÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il portait trois champs, et les justifiait ainsi : « aucun ne se lit sur une
 * facture. Ils vivent dans un registre public, dans une nomenclature, ou dans
 * des conditions générales — TROIS ENDROITS OÙ LE LOGICIEL NE VA PAS. »
 *
 * Le logiciel va dans le registre public. Chaque nuit, à quatre heures : c'est
 * le radar de solvabilité. Le BODACC est ouvert, sans clé, et se cherche PAR
 * NOM — chaque annonce porte la dénomination, le SIREN, la forme juridique et
 * l'adresse du siège.
 *
 * Cette phrase a donc laissé un champ de saisie VIDE, pendant des semaines, sur
 * l'écran le plus fréquenté du produit, pour la donnée qui commande la
 * surveillance de solvabilité ET l'éligibilité à toute procédure. Le raisonnement
 * n'avait envisagé qu'une source — l'API Sirene, dont la clé n'est pas obtenue —
 * et avait conclu de son absence qu'aucune n'existait.
 *
 * Le SIREN se cherche maintenant. Voir `ui/recherche-registre.tsx`, et la raison
 * pour laquelle il PROPOSE au lieu de choisir : « BOULANGERIE MARTIN » rend six
 * sociétés dans six villes, et un SIREN faux mais bien formé désigne une autre
 * entreprise — le radar l'interrogerait, et son « aucune procédure » se lirait
 * comme un feu vert.
 *
 * Les deux champs qui restent sont d'une autre nature, et ils restent :
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SECTEUR — la légende dit le délai, parce que c'est ce qui décide
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Un gérant ne choisit pas « transport de marchandises » pour le plaisir de la
 * nomenclature : il le choisit parce que ça change son délai de prescription de
 * cinq ans à un an. La durée est donc SOUS chaque option, pas cachée dans une
 * aide — et elle vient du registre juridique, jamais d'une constante écrite ici.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE TAUX STIPULÉ — le champ qui était lu par les moteurs et jamais rempli
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `facturesVente.tauxContractuel` était lu par le décompte ET la révélation,
 * et écrit nulle part. Tout créancier dont les conditions générales stipulent
 * un taux retombait silencieusement sur le taux légal : le produit
 * SOUS-RÉCLAMAIT, l'inverse exact de sa raison d'être.
 *
 * ⚠️ IL VIT ICI ET PAS DANS SA PROPRE CARTE. Il a d'abord eu la sienne — un
 * en-tête, une icône, un champ. C'est le motif « trois cartes pour trois
 * liens » déjà corrigé ailleurs : deux cartes voisines portant chacune un
 * seul champ font deux objets là où il n'y a qu'un sujet. Ces trois faits
 * sont de même nature — ce que le gérant seul peut dire de ce client — donc
 * ils tiennent ensemble.
 *
 * ⚠️ ET LE CONSTAT VIENT DU SERVEUR, MOT POUR MOT. Un taux sous le plancher
 * légal est ENREGISTRÉ tel quel : relever d'office un taux jugé trop bas
 * serait écrire une conséquence juridique que personne n'a validée.
 */

export interface OptionSecteur {
	readonly cle: string;
	readonly libelle: string;
	/** Ce que ce secteur change, en clair. Vient du registre. */
	readonly consequence: string;
}

export function IdentiteDebiteur({
	denomination,
	siren,
	formeJuridique,
	etatRecherche,
	onChercherAuRegistre,
	onRetenirEtablissement,
	secteur,
	optionsSecteur,
	erreurSiren,
	onEnregistrerSiren,
	onChoisirSecteur,
	tauxContractuel,
	constatTaux,
	onEnregistrerTaux
}: {
	/** Le nom du débiteur, tel qu'il est venu de la facture. */
	denomination: string;
	siren: string | undefined;
	/** Ce que le registre dit de sa forme, une fois le SIREN retenu. */
	formeJuridique: string | undefined;
	etatRecherche: EtatRecherche;
	onChercherAuRegistre: () => void;
	/** Retenir un établissement proposé : son numéro ET sa forme juridique. */
	onRetenirEtablissement: (etablissement: EtablissementPropose) => void;
	secteur: string | undefined;
	optionsSecteur: readonly OptionSecteur[];
	/** Le refus venu du serveur, tel quel — c'est lui qui nomme le numéro reçu. */
	erreurSiren: string | null;
	onEnregistrerSiren: (saisi: string) => void;
	onChoisirSecteur: (cle: string) => void;
	/** Le taux stipulé en vigueur, en pourcentage saisissable. */
	tauxContractuel: string | undefined;
	/** Ce que le serveur a répondu au dernier enregistrement. Affiché tel quel. */
	constatTaux: string | null;
	/** `null` retire la stipulation et fait retomber sur le taux légal. */
	onEnregistrerTaux: (pourcentage: string | null) => void;
}) {
	const [taux, setTaux] = useState(tauxContractuel ?? '');

	return (
		<div className="flex flex-col gap-cladd-2xs">
			{/*
			  ⚠️ LE CHAMP « SIREN OU SIRET » A DISPARU D'ICI, et c'est la correction
			  la plus importante de cet écran.

			  Il était vide, et il demandait au gérant d'aller chercher neuf chiffres
			  ailleurs pour les recopier — sur l'écran où il passe le plus de temps,
			  et pour la donnée qui commande la surveillance de solvabilité ET
			  l'éligibilité à toute procédure.

			  Le commentaire en tête de ce fichier justifiait le champ ainsi : ces
			  données « vivent dans un registre public […] où le logiciel ne va pas ».
			  C'était faux. Le logiciel y va chaque nuit à quatre heures — c'est le
			  radar de solvabilité — et le BODACC se cherche PAR NOM.

			  Voir `ui/recherche-registre.tsx`, qui porte le raisonnement complet et
			  la raison pour laquelle il propose au lieu de choisir.
			*/}
			<RechercheRegistre
				denomination={denomination}
				siren={siren}
				formeJuridique={formeJuridique}
				etat={etatRecherche}
				erreurSaisie={erreurSiren}
				onChercher={onChercherAuRegistre}
				onRetenir={onRetenirEtablissement}
				onSaisir={onEnregistrerSiren}
			/>

			<Select
				className="w-full"
				surface="cut"
				size="lg"
				title="Secteur de la relation"
				options={[...optionsSecteur]}
				value={secteur ?? 'INDETERMINE'}
				getOptionValue={(option) => option.cle}
				onChange={(cle) => onChoisirSecteur(cle as string)}
				renderOption={({ value }) => value.libelle}
				renderOptionInfo={({ value }) => value.consequence}
				keyboardHints={false}
				placeholder="Secteur à préciser"
			>
				{optionsSecteur.find((o) => o.cle === (secteur ?? 'INDETERMINE'))?.libelle ??
					'Secteur à préciser'}
			</Select>

			<div className="flex flex-col gap-1">
				<Input
					size="lg"
					value={taux}
					onChange={setTaux}
					// Sur `blur` et pas à la frappe : ce taux touche TOUTES les factures
					// non soldées du débiteur. Enregistrer à chaque caractère écrirait
					// « 1 », puis « 12 », puis « 12,4 » avant d'arriver au bon.
					onBlur={() => onEnregistrerTaux(taux.trim() === '' ? null : taux.trim())}
					placeholder="Taux de retard stipulé"
					inputMode="decimal"
					suffix={<span className="mr-2 text-cladd-fg-softer">%</span>}
					infoMessage="Celui de vos conditions générales. Vide = taux légal, BCE majoré de dix points."
				/>
				{/* Le constat du serveur, tel quel : il dit si le taux passe sous le
				    plancher légal et combien vaut ce plancher, pour que le créancier
				    refasse le calcul plutôt que de nous croire. L'écran ne le récrit pas. */}
				{constatTaux ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{constatTaux}</p>
				) : null}
			</div>
		</div>
	);
}

export interface ConstatRegistreAffiche {
	readonly dateParution: string;
	readonly nature: string;
	readonly dateJugement?: string;
	readonly tribunal?: string;
	readonly url: string;
}

/**
 * LE CONSTAT DU REGISTRE PUBLIC — cité, jamais interprété.
 *
 * ⚠️ AUCUN VERBE DE RECOMMANDATION ICI. Le produit écrit « le BODACC a publié le
 * 9 septembre une annonce concernant ce débiteur », jamais « déclarez votre
 * créance au mandataire ». La troisième ligne rouge du projet est explicite :
 * on énonce des CONSTATS, jamais une conduite à tenir. Recommander une démarche
 * serait du conseil juridique, et ce produit n'en fait pas.
 *
 * ⚠️ ET LA NATURE EST REPRISE MOT POUR MOT. Une paraphrase serait une lecture, et
 * une lecture engage. Le lien mène à l'annonce elle-même : le gérant, ou son
 * avocat, lit la source.
 *
 * Toutes les annonces affichées ici ne disent pas qu'une entreprise est
 * insolvable — une interdiction de gérer vise une personne. C'est précisément
 * pour ça qu'on montre le texte du registre au lieu d'un verdict.
 */
/**
 * CE QUE LA RANGÉE « DÉBITEUR » DIT, SUR L'ÉCRAN D'UNE CRÉANCE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE RANGÉE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran d'une créance affichait le nom du débiteur comme TITRE, et n'offrait
 * aucun moyen de l'atteindre — `creanceComplete` ne rendait même pas son
 * identifiant. Le graphe d'objets du produit était fait d'étoiles séparées :
 * une créance descendait vers ses six analyses, un débiteur vers ses pièces, et
 * les deux ne se touchaient nulle part.
 *
 * Ce n'est pas seulement de la navigation. Le radar de solvabilité tourne
 * chaque nuit et écrit son verdict SUR LE DÉBITEUR ; la créance porte l'argent.
 * Le handler de `creanceComplete` lisait déjà cette santé — il la passe à
 * `qualifier()` — puis la jetait : un débiteur en procédure collective faisait
 * baisser la note sans que l'écran dise pourquoi.
 *
 * ⚠️ QUATRE ÉTATS, QUATRE MOTS DIFFÉRENTS. La table l'impose : « ne rien savoir
 * n'est pas la même chose que savoir que tout va bien, et c'est la confusion
 * qui ferait engager des frais sur un débiteur déjà radié ». `INCONNUE` dit
 * donc « non vérifiée » et `SAINE` dit « rien au registre » — jamais le même
 * mot, sans quoi la distinction tenue en base se perd au dernier mètre.
 *
 * ⚠️ UN CONSTAT, JAMAIS UNE CONDUITE À TENIR. « Procédure collective au
 * registre », pas « déclarez votre créance au mandataire ». C'est la troisième
 * ligne rouge du projet, et un test la balaie.
 */
export function rangeeDuDebiteur({
	sante
}: {
	sante: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
}): { valeur: string; precision?: string; attention: boolean } {
	switch (sante) {
		case 'PROCEDURE_COLLECTIVE':
			return {
				valeur: 'Procédure collective',
				precision: 'Relevée au registre public',
				// ⚠️ UN POINT, PAS UNE COULEUR. Le vert, l'ambre et le rouge sont
				// réservés à `--color-seuil-*` et ne disent qu'une chose dans ce
				// produit : au-dessus du seuil, tout près, en dessous. Une santé de
				// débiteur n'est pas un seuil.
				attention: true
			};
		case 'RADIEE':
			return {
				valeur: 'Radiée du registre',
				precision: 'Relevée au registre public',
				attention: true
			};
		case 'SAINE':
			return { valeur: 'Rien au registre', precision: 'Au dernier relevé', attention: false };
		case 'INCONNUE':
			return {
				valeur: 'Non vérifiée',
				// Un angle mort se dit : « ce que le logiciel ne voit pas s'affiche
				// aussi ». Sans SIREN, le radar ne peut pas interroger le registre, et
				// un gérant qui croit son débiteur surveillé ne le surveille pas.
				precision: 'Le registre n’a pas pu être interrogé',
				attention: false
			};
	}
}

export function ConstatRegistre({
	constat,
	sante
}: {
	constat: ConstatRegistreAffiche;
	sante: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
}) {
	const bascule = sante === 'PROCEDURE_COLLECTIVE' || sante === 'RADIEE';

	return (
		<Surface
			variant="transparent"
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-1.5 p-cladd-2xs"
			outline={false}
			color={bascule ? 'red' : undefined}
		>
			<div className="flex flex-wrap items-center gap-1.5">
				<Chip size="md" color={bascule ? 'red' : 'neutral'}>
					{bascule ? 'Registre public' : 'Annonce au registre'}
				</Chip>
				<span className="text-cladd-2xs text-cladd-fg-softer">
					publiée au BODACC le {dateCourte(constat.dateParution)}
				</span>
			</div>

			{/* LA NATURE, MOT POUR MOT. */}
			<p className="text-cladd-sm font-semibold">{constat.nature}</p>

			<p className="text-cladd-xs text-cladd-fg-soft">
				{constat.dateJugement !== undefined ? (
					<>Jugement du {dateCourte(constat.dateJugement)}. </>
				) : null}
				{constat.tribunal ?? null}
			</p>

			{/* ⚠️ `min-h-11` ET `w-fit` — 44 px de haut, la largeur du texte.
			    Le lien faisait 21 px de haut sur toute la largeur de la carte : trop
			    plat pour un doigt, et une cible qui traverse l'écran attrape les
			    appuis destinés à ce qui l'entoure. C'est le seul lien du produit qui
			    sorte vers un site tiers, et le seul endroit où le gérant peut LIRE
			    le registre plutôt que notre citation — il mérite d'être atteignable. */}
			<a
				href={constat.url}
				target="_blank"
				rel="noreferrer"
				className="inline-flex min-h-11 w-fit items-center text-cladd-xs text-cladd-primary underline underline-offset-2"
			>
				Lire l’annonce au BODACC
			</a>
		</Surface>
	);
}
