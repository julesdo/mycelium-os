import { useState } from 'react';
import { Button, List, ListButton, ListTitle, Surface } from '@cladd-ui/react';
import { Building2Icon, SearchIcon } from 'lucide-react';
import { BoutonPrincipal } from './bouton';
import { Champ } from './cadre-auth';

/**
 * IDENTIFIER UN DÉBITEUR AU REGISTRE — sans rien demander d'abord.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL Y AVAIT ICI, ET POURQUOI C'ÉTAIT UN DÉFAUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un champ de saisie vide, marqué « SIREN ou SIRET ». Le gérant devait aller
 * chercher neuf chiffres ailleurs et les recopier — sur l'écran où il passe le
 * plus de temps, et pour la donnée qui commande TOUT le reste : la surveillance
 * de solvabilité, et l'éligibilité à toute procédure.
 *
 * C'est la règle d'écran n° 1 du projet, prise à l'envers : « le logiciel
 * décide, le gérant confirme. Aucun écran ne demande une saisie que le logiciel
 * peut déduire. Un champ vide qu'il aurait pu remplir est un défaut. »
 *
 * Le commentaire qui justifiait ce champ disait que ces données vivent « dans
 * un registre public […] où le logiciel ne va pas ». Le logiciel y va chaque
 * nuit à quatre heures : c'est le radar de solvabilité. Le BODACC est ouvert,
 * sans clé, et se cherche PAR NOM.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ON PROPOSE, ON NE CHOISIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « BOULANGERIE MARTIN » rend six sociétés distinctes, dans six villes. Écrire
 * automatiquement la première poserait un SIREN faux — et un SIREN faux mais
 * bien formé désigne une AUTRE entreprise : le radar interrogerait le registre
 * sur un tiers, et son « aucune procédure » se lirait comme un feu vert. C'est
 * la seule erreur de ce produit qui rende une réponse rassurante ET fausse.
 *
 * L'écran montre donc ce que le registre a trouvé — dénomination, ville,
 * adresse du siège — et attend un doigt. La ville suffit à reconnaître son
 * propre client parmi ses homonymes ; c'est pour ça qu'elle est là.
 *
 * ⚠️ ET LA SAISIE MANUELLE RESTE, EN DESSOUS. Le BODACC ne publie que ce qui a
 * fait l'objet d'une annonce de greffe : une société qui n'en a jamais eu n'y
 * figure pas. Retirer le champ entièrement rendrait ces débiteurs-là
 * impossibles à identifier — on remplace une porte par une meilleure, on n'en
 * condamne pas.
 */

export interface EtablissementPropose {
	readonly siren: string;
	readonly denomination: string;
	readonly formeJuridique?: string;
	readonly ville?: string;
	readonly adresse?: string;
}

/** `421931452` → `421 931 452`. Neuf chiffres se relisent par trois. */
export function sirenLisible(siren: string): string {
	const chiffres = siren.replace(/\D/g, '');
	if (chiffres.length !== 9) return siren;
	return `${chiffres.slice(0, 3)} ${chiffres.slice(3, 6)} ${chiffres.slice(6)}`;
}

/**
 * L'état de la recherche, du point de vue de l'écran.
 *
 * ⚠️ « RIEN TROUVÉ » ET « LE REGISTRE N'A PAS RÉPONDU » SONT DEUX ÉTATS, et pas
 * un seul. Ils mènent à deux gestes opposés : saisir le numéro à la main, ou
 * réessayer dans une minute. Les confondre serait un repli silencieux.
 */
export type EtatRecherche =
	| { readonly phase: 'REPOS' }
	| { readonly phase: 'EN_COURS' }
	| { readonly phase: 'TROUVE'; readonly candidats: readonly EtablissementPropose[] }
	| { readonly phase: 'AUCUN' }
	| { readonly phase: 'ECHEC'; readonly message: string };

export function RechercheRegistre({
	denomination,
	siren,
	formeJuridique,
	etat,
	erreurSaisie,
	onChercher,
	onRetenir,
	onSaisir
}: {
	/** Le nom du débiteur, tel qu'il est venu de la facture. */
	denomination: string;
	/** Le SIREN déjà retenu, s'il y en a un. */
	siren: string | undefined;
	formeJuridique: string | undefined;
	etat: EtatRecherche;
	/** Le refus du serveur sur une saisie manuelle, mot pour mot. */
	erreurSaisie: string | null;
	onChercher: () => void;
	/** Reçoit l établissement ENTIER : sa forme juridique se retient avec son numéro. */
	onRetenir: (etablissement: EtablissementPropose) => void;
	onSaisir: (saisi: string) => void;
}) {
	const [ouvertALaMain, setOuvertALaMain] = useState(false);
	/**
	 * ⚠️ UN REFUS ROUVRE LE CHAMP, TOUJOURS. Le message du serveur nomme le
	 * numéro reçu ; le cacher derrière un repli laisserait le gérant devant une
	 * erreur qu'il ne peut pas corriger. Dérivé au rendu, jamais posé dans un
	 * effet — c'est la règle React du projet.
	 */
	const manuel = ouvertALaMain || erreurSaisie !== null;
	const [saisi, setSaisi] = useState(siren ?? '');

	/**
	 * LE CAS RÉSOLU — et il ne montre plus aucun champ.
	 *
	 * Un débiteur identifié n'a plus rien à saisir : l'écran affiche ce que le
	 * registre dit de lui. « Changer » rouvre la recherche, parce qu'un SIREN
	 * retenu par erreur doit pouvoir se défaire — c'est la seule erreur de ce
	 * produit qui rende une réponse rassurante et fausse.
	 */
	if (siren !== undefined && siren !== '' && !manuel && etat.phase === 'REPOS') {
		return (
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex items-start gap-cladd-3xs p-cladd-2xs"
			>
				<Building2Icon size={18} className="mt-0.5 shrink-0 text-cladd-fg-softer" aria-hidden />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-cladd-xs font-medium">{denomination}</span>
					<span className="text-cladd-2xs text-cladd-fg-softer">
						SIREN {sirenLisible(siren)}
						{formeJuridique === undefined ? null : ` · ${formeJuridique}`}
					</span>
					<span className="text-cladd-2xs text-cladd-fg-softest">
						Sa solvabilité est surveillée chaque nuit au registre public.
					</span>
				</div>
				{/* ⚠️ `min-h-11` : 44 px. Une commande secondaire reste une cible. */}
				<Button
					size="sm"
					variant="transparent"
					outline={false}
					hoverable={false}
					className="verre-bouton min-h-11 shrink-0 rounded-full px-3 text-cladd-2xs"
					onClick={() => setOuvertALaMain(true)}
				>
					Changer
				</Button>
			</Surface>
		);
	}

	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			{etat.phase === 'TROUVE' && etat.candidats.length > 0 ? (
				<>
					{/*
					  ⚠️ « LE REGISTRE PROPOSE », PAS « NOUS AVONS TROUVÉ ». Le produit
					  cite une source publique, il ne certifie pas une identité. C'est la
					  même discipline que `ConstatRegistre`, qui reprend la nature d'une
					  annonce mot pour mot plutôt que de la reformuler.
					*/}
					<List>
						<ListTitle>Le registre propose</ListTitle>
						{etat.candidats.map((candidat) => (
							<ListButton
								key={candidat.siren}
								icon={<Building2Icon size={18} />}
								header={sirenLisible(candidat.siren)}
								// ⚠️ L ADRESSE SEULE QUAND ELLE EXISTE : elle CONTIENT deja la ville.
								// Les juxtaposer donnait « Fecamp · 6 Place Nicolas Selle 76400
								// Fecamp », qui repete la seule information servant a reconnaitre son
								// client — et faisait repasser la rangee a la ligne. La ville ne sert
								// de repli que si le siege est illisible.
								footer={candidat.adresse ?? candidat.ville}
								className="verre-bouton"
								hoverable={false}
								onClick={() => onRetenir(candidat)}
							>
								<span className="truncate">{candidat.denomination}</span>
							</ListButton>
						))}
					</List>
					<p className="px-cladd-3xs text-cladd-2xs text-cladd-fg-softest">
						Touchez celui qui est votre client. Rien n’est enregistré avant.
					</p>
				</>
			) : null}

			{etat.phase === 'AUCUN' ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Le registre ne publie aucune annonce au nom de « {denomination} ». Il ne contient que les
					sociétés ayant fait l’objet d’une publication de greffe : c’est un silence du registre, pas
					une réponse sur votre client.
				</p>
			) : null}

			{etat.phase === 'ECHEC' ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft" role="alert">
					{etat.message}
				</p>
			) : null}

			{etat.phase === 'REPOS' || etat.phase === 'EN_COURS' ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Ce client n’est pas identifié au registre. Sans SIREN, sa solvabilité n’est pas surveillée
					et aucune procédure ne peut être engagée.
				</p>
			) : null}

			{/*
			  LE GESTE PRINCIPAL, et il porte le nom cherché : le gérant voit sur quoi
			  la recherche va porter avant de la lancer, pas après.
			*/}
			<BoutonPrincipal
				className="self-start"
				loading={etat.phase === 'EN_COURS'}
				readOnly={etat.phase === 'EN_COURS'}
				onClick={onChercher}
			>
				<SearchIcon size={16} />
				{etat.phase === 'REPOS' ? `Chercher « ${denomination} »` : 'Chercher à nouveau'}
			</BoutonPrincipal>

			{/*
			  LA SAISIE MANUELLE, REPLIÉE. Elle reste indispensable — le BODACC ne
			  couvre pas tout — mais elle n'est plus la première chose qu'on voit.
			*/}
			{manuel ? (
				<div className="flex flex-col gap-cladd-3xs border-t border-cladd-outline pt-cladd-3xs">
					<Champ
						etiquette="Saisir le numéro"
						aide="Un SIRET est accepté : seuls ses neuf premiers chiffres sont retenus."
					>
						<input
							value={saisi}
							onChange={(e) => setSaisi(e.target.value)}
							onBlur={() => onSaisir(saisi)}
							inputMode="numeric"
							placeholder="SIREN ou SIRET"
							aria-label="SIREN ou SIRET"
							className="verre h-cladd-md w-full rounded-full px-cladd-3xs text-cladd-xs text-cladd-fg placeholder:text-cladd-fg-softer focus:outline-none"
						/>
					</Champ>
					{/*
					  ⚠️ LE REFUS DU SERVEUR, MOT POUR MOT, SOUS LE CHAMP. La clé de
					  contrôle attrape toute faute d'un seul chiffre : c'est précisément
					  le moment où le gérant doit voir ce qu'il a tapé, à côté de ce
					  qu'il a tapé. Une alerte ailleurs sur l'écran le lui cacherait.
					*/}
					{erreurSaisie === null ? null : (
						<p className="text-cladd-2xs leading-snug text-cladd-fg-soft" role="alert">
							{erreurSaisie}
						</p>
					)}
				</div>
			) : (
				<Button
					size="sm"
					variant="transparent"
					outline={false}
					hoverable={false}
					className="min-h-11 self-start rounded-full px-3 text-cladd-2xs text-cladd-fg-softer"
					onClick={() => setOuvertALaMain(true)}
				>
					Saisir le numéro moi-même
				</Button>
			)}
		</Surface>
	);
}
