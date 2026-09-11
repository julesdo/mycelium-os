import { useState } from 'react';
import { Chip, Input, Select, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
import { dateCourte } from './format';

/**
 * CE QUE LE GÉRANT SEUL PEUT DIRE DE SON DÉBITEUR.
 *
 * « Le logiciel décide, le gérant confirme » (règle d'écran n° 1) : aucun écran
 * ne demande une saisie que le logiciel peut déduire. Ces trois champs sont
 * l'exception, et chacun pour une raison différente : aucun ne se lit sur une
 * facture. Ils vivent dans un registre public, dans une nomenclature, ou dans
 * des conditions générales — trois endroits où le logiciel ne va pas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SIREN — la charnière vers les registres publics
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le radar BODACC et la normalisation Sirene s'interrogent par identifiant, et
 * jamais par raison sociale : sur un flux national, une correspondance de nom
 * finit par annoncer à un gérant que son client solvable est en liquidation.
 *
 * ⚠️ LE REFUS S'AFFICHE SOUS LE CHAMP, PAS DANS UNE ALERTE. La clé de contrôle
 * attrape toute faute de frappe d'un seul chiffre — c'est précisément le
 * moment où le gérant doit voir ce qu'il a tapé, à côté de ce qu'il a tapé.
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
	siren,
	secteur,
	optionsSecteur,
	erreurSiren,
	onEnregistrerSiren,
	onChoisirSecteur,
	tauxContractuel,
	constatTaux,
	onEnregistrerTaux
}: {
	siren: string | undefined;
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
	const [saisi, setSaisi] = useState(siren ?? '');
	const [taux, setTaux] = useState(tauxContractuel ?? '');

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<div className="flex flex-col gap-1">
				<Input
					size="lg"
					value={saisi}
					onChange={setSaisi}
					onBlur={() => onEnregistrerSiren(saisi)}
					placeholder="SIREN ou SIRET"
					inputMode="numeric"
					valid={erreurSiren === null}
					errorMessage={erreurSiren ?? undefined}
					infoMessage="Neuf chiffres, ou quatorze pour un SIRET. Un seul chiffre changé désignerait une autre entreprise."
					clearButton
					onClear={() => {
						setSaisi('');
						onEnregistrerSiren('');
					}}
				/>
				{/* CE QUE L'ABSENCE DE NUMÉRO COÛTE, dit à l'endroit où on peut y
				    remédier. Un gérant qui croit son débiteur surveillé au registre ne
				    le surveille pas lui-même — c'est la même règle que pour la
				    prescription, et elle vaut ici mot pour mot. */}
				{siren === undefined ? (
					<p className="flex items-start gap-1.5 text-cladd-2xs text-cladd-fg-soft">
						<AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						Sans identifiant, ce débiteur n’est pas suivi aux registres publics : une procédure
						collective ouverte à son encontre passerait inaperçue.
					</p>
				) : null}
			</div>

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
