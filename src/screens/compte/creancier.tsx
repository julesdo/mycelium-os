import { useState, type ComponentProps } from 'react';
import { Button, Input, Segmented, SegmentedButton, Surface } from '@cladd-ui/react';
import { CheckIcon, SearchIcon } from 'lucide-react';
import { BoutonPrincipal, Champ, ListeCandidatsRegistre } from '../../ui';
import { qualiteCommercantDeLaForme } from '../../lib/verticales/recouvrement/pays/france/commercialite';

/** Les trois états d'un critère de qualification. Jamais présumé favorablement. */
export type EtatCritere = 'ok' | 'ko' | 'unknown';

/**
 * Un établissement tel que le registre public le propose.
 *
 * ⚠️ IL PORTE SA DATE DE PARUTION, et ce n'est pas décoratif. L'adresse vient
 * d'une annonce de greffe qui peut avoir des années ; elle s'imprimerait ensuite
 * en tête de décomptes FIGÉS. La date se lit avant le doigt, pas après.
 */
export interface EtablissementAuRegistre {
	readonly siren: string;
	readonly denomination: string;
	/**
	 * La forme juridique telle que le registre l'écrit, en TEXTE LIBRE.
	 *
	 * ⚠️ ELLE ÉTAIT LUE ET JAMAIS REMPLIE. Le champ existait en base et dans la
	 * réponse du registre ; rien ne l'écrivait, et l'écran posait pendant ce temps
	 * une question à laquelle elle répond dans la plupart des cas.
	 */
	readonly formeJuridique?: string;
	readonly ville?: string;
	readonly adresse?: string;
	/** La parution la plus récente qui porte cet établissement (AAAA-MM-JJ). */
	readonly derniereParution?: string;
}

/**
 * L'état de la recherche au registre, du point de vue de l'écran.
 *
 * ⚠️ « RIEN TROUVÉ » ET « LE REGISTRE N'A PAS RÉPONDU » SONT DEUX ÉTATS, et pas
 * un seul. Ils mènent à deux gestes opposés : taper les trois lignes à la main,
 * ou réessayer dans une minute. Les confondre serait un repli silencieux.
 */
type EtatRecherche =
	| { readonly phase: 'REPOS' }
	| { readonly phase: 'EN_COURS' }
	| { readonly phase: 'TROUVE'; readonly candidats: readonly EtablissementAuRegistre[] }
	| { readonly phase: 'AUCUN' }
	| { readonly phase: 'ECHEC'; readonly message: string };

/**
 * LE CRÉANCIER — ce qui s'imprime en tête du décompte, et ce qui débloque la
 * qualification.
 *
 * ⚠️ CES TROIS CHAMPS NE SONT PAS DU CONFORT. La table existait depuis le
 * remodelage, elle était lue à deux endroits, et rien ne l'écrivait :
 *
 *   · la PIÈCE porte « Identité du créancier non renseignée » sans eux —
 *     honnête, et pas envoyable à un expert-comptable ;
 *   · et `entreCommercants` valait TOUJOURS « indéterminé », donc l'éligibilité
 *     à l'injonction de payer ne pouvait JAMAIS être acquise. Le produit
 *     annonçait une condition non remplie que rien ne permettait de remplir.
 *
 * ⚠️ LA QUALITÉ DE COMMERÇANT SE DÉDUIT DE LA FORME, QUAND LA FORME LA DIT.
 *
 * Elle se DEMANDAIT, à un gérant dont le registre publie la forme juridique avec
 * le SIREN et l'adresse. L'article L210-1 du code de commerce ferme une liste de
 * quatre familles commerciales par la forme : une société par actions simplifiée
 * n'a pas à être interrogée sur ce point. La déduction vit dans
 * `pays/france/commercialite.ts` ; cet écran n'en recopie pas un mot, il affiche
 * ce qu'elle rend, avec ce sur quoi elle repose.
 *
 * ⚠️ ET CE QUI NE SE DÉDUIT PAS RESTE UNE QUESTION. Trois états, dont
 * « indéterminé » — et c'est le défaut. Une société d'exercice libéral, une
 * association, un groupement, une personne physique, un libellé que le registre
 * écrit autrement : tous rendent « indéterminé », et la question se pose alors
 * exactement comme avant, en disant pourquoi elle se pose. Présumer
 * favorablement ouvrirait une procédure qui se ferait rejeter ; le doute ne
 * profite jamais au produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET LES TROIS PREMIERS NE SE TAPENT PLUS D'ABORD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dénomination, numéro et adresse étaient trois champs vides à remplir de
 * mémoire, alors que le produit interroge déjà le registre public pour un
 * DÉBITEUR et en tire les trois. Le gérant recopiait sur son propre
 * établissement ce que le logiciel savait aller chercher : c'est la règle
 * d'écran n° 1 prise à l'envers.
 *
 * ⚠️ ON PROPOSE, ON N'ÉCRIT PAS. Retenir un candidat REMPLIT les champs ; c'est
 * « Enregistrer » qui écrit, et c'est le serveur qui vérifie alors la clé de
 * contrôle du numéro. Rien n'est jamais substitué en silence à ce qui a été tapé.
 */
export function FormulaireCreancier({
	initial,
	nomEtablissement,
	onChercherAuRegistre,
	onEnregistrer
}: {
	initial: {
		denomination: string;
		siren: string;
		adresse: string;
		formeJuridique: string;
		estCommercant: EtatCritere;
	};
	/** Le nom de l'établissement : c'est sur lui que la recherche porte, et l'écran le dit avant de la lancer. */
	nomEtablissement: string;
	onChercherAuRegistre: () => Promise<readonly EtablissementAuRegistre[]>;
	onEnregistrer: (args: {
		denomination: string;
		siren?: string;
		adresse?: string;
		formeJuridique?: string;
		estCommercant: EtatCritere;
	}) => Promise<unknown>;
}) {
	const [denomination, setDenomination] = useState(initial.denomination);
	const [siren, setSiren] = useState(initial.siren);
	const [adresse, setAdresse] = useState(initial.adresse);
	const [formeJuridique, setFormeJuridique] = useState(initial.formeJuridique);
	const [estCommercant, setEstCommercant] = useState<EtatCritere>(initial.estCommercant);
	const [enCours, setEnCours] = useState(false);
	const [enregistre, setEnregistre] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const [recherche, setRecherche] = useState<EtatRecherche>({ phase: 'REPOS' });
	/** Le gérant a demandé à reprendre la main sur ce que le logiciel a déduit. */
	const [correction, setCorrection] = useState(false);

	async function chercher() {
		setRecherche({ phase: 'EN_COURS' });
		try {
			const candidats = await onChercherAuRegistre();
			setRecherche(candidats.length === 0 ? { phase: 'AUCUN' } : { phase: 'TROUVE', candidats });
		} catch (e) {
			setRecherche({
				phase: 'ECHEC',
				message:
					e instanceof Error && e.message
						? e.message
						: 'Le registre n’a pas répondu. Réessayez dans un instant.'
			});
		}
	}

	/**
	 * ⚠️ RETENIR REMPLIT, ET NE GARDE RIEN DE L'ANNONCE AU-DELÀ DE CE QUI
	 * S'IMPRIME OU SE DÉDUIT. Le gérant relit ce qui est écrit dans les champs, le
	 * corrige s'il le faut, et c'est son appui sur « Enregistrer » qui vaut
	 * confirmation.
	 *
	 * ⚠️ LA FORME SUIT LE CANDIDAT, MÊME QUAND ELLE EST ABSENTE. Une annonce qui
	 * n'en porte pas doit EFFACER celle du candidat précédent : garder l'ancienne
	 * ferait lire une déduction fondée sur une autre société.
	 *
	 * ⚠️ ET LA DÉDUCTION N'ÉCRASE QUE CE QU'ELLE TRANCHE. Une forme qui ne conclut
	 * pas laisse intacte la réponse déjà donnée : le logiciel décide là où il
	 * sait, il n'efface pas ce que le gérant a déclaré là où il ne sait pas.
	 */
	function retenir(candidat: EtablissementAuRegistre) {
		setDenomination(candidat.denomination);
		setSiren(candidat.siren);
		if (candidat.adresse !== undefined) setAdresse(candidat.adresse);
		setFormeJuridique(candidat.formeJuridique ?? '');
		const deduite = qualiteCommercantDeLaForme(candidat.formeJuridique);
		if (deduite.etat !== 'unknown') {
			setEstCommercant(deduite.etat);
			setCorrection(false);
		}
		setErreur(null);
		setRecherche({ phase: 'REPOS' });
	}

	async function enregistrer() {
		if (!denomination.trim()) return;
		setEnCours(true);
		setErreur(null);
		try {
			await onEnregistrer({
				denomination: denomination.trim(),
				estCommercant,
				...(siren.trim() ? { siren: siren.trim() } : {}),
				...(adresse.trim() ? { adresse: adresse.trim() } : {}),
				// La forme part avec le reste : sans elle, la déduction disparaîtrait à
				// la première réouverture de la page et la question reviendrait.
				...(formeJuridique.trim() ? { formeJuridique: formeJuridique.trim() } : {})
			});
			setEnregistre(true);
			window.setTimeout(() => setEnregistre(false), 2000);
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Enregistrement refusé.');
		} finally {
			setEnCours(false);
		}
	}

	/*
	  La proposition s'efface dès qu'un numéro est là : il n'y a plus rien à
	  proposer, et une carte de recherche au-dessus de trois champs remplis est
	  du bruit. Dérivé au rendu, jamais posé dans un effet.
	*/
	const proposer = siren.trim() === '' || recherche.phase !== 'REPOS';

	/*
	  CE QUE LA FORME RELEVÉE PERMET DE DÉDUIRE. Dérivé au rendu, comme le reste :
	  un état de plus, tenu à jour dans un effet, finirait par dire autre chose que
	  la forme affichée à côté de lui.
	*/
	const deduction = qualiteCommercantDeLaForme(formeJuridique.trim() || undefined);
	const deduit = deduction.etat !== 'unknown';
	/* Le gérant a répondu autre chose que ce qui se déduisait : sa réponse gagne, et se voit. */
	const contredit = deduit && estCommercant !== deduction.etat;
	const demander = !deduit || correction || contredit;

	return (
		/*
		  PLUS DE CARTE AUTOUR, ET C'EST LA CONSÉQUENCE DU DÉMÉNAGEMENT. Le
		  formulaire vivait sur sa propre page, dans une `Surface` qui lui faisait
		  un cadre ; il vit maintenant DANS la section « Votre établissement » de
		  `/app/compte`, qui est déjà une carte. Deux cartes emboîtées ne creusent
		  aucune profondeur — le kit le dit — elles empilent deux bordures.
		*/
		<div className="flex flex-col gap-cladd-2xs">
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Ces informations sont figées avec chaque décompte : un document réédité plus tard dit la
				même chose qu’au jour de son émission.
			</p>

			{proposer ? (
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					{recherche.phase === 'TROUVE' ? (
						<ListeCandidatsRegistre
							candidats={recherche.candidats}
							aide="Touchez celui qui est votre entreprise : les trois champs se remplissent, et rien n’est écrit tant que vous n’avez pas enregistré. L’adresse est celle de l’annonce, à sa date : relisez-la avant d’enregistrer."
							onRetenir={retenir}
						/>
					) : null}

					{recherche.phase === 'AUCUN' ? (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Le registre ne publie aucune annonce au nom de « {nomEtablissement} ». Il ne contient
							que les sociétés ayant fait l’objet d’une publication de greffe : c’est un silence du
							registre, pas une réponse sur votre entreprise. Les trois champs se remplissent alors
							à la main.
						</p>
					) : null}

					{recherche.phase === 'ECHEC' ? (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft" role="alert">
							{recherche.message}
						</p>
					) : null}

					{recherche.phase === 'REPOS' || recherche.phase === 'EN_COURS' ? (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Le registre public rend la dénomination, le numéro et l’adresse du siège : les trois
							lignes qui s’impriment en tête d’un décompte.
						</p>
					) : null}

					{/*
					  LE GESTE PRINCIPAL PORTE LE NOM CHERCHÉ : on voit sur quoi la
					  recherche va porter avant de la lancer, pas après.
					*/}
					<Button
						size="sm"
						variant="transparent"
						outline={false}
						hoverable={false}
						className="verre verre-bouton min-h-12 self-start rounded-full px-3 text-cladd-2xs"
						loading={recherche.phase === 'EN_COURS'}
						readOnly={recherche.phase === 'EN_COURS'}
						onClick={() => void chercher()}
					>
						<SearchIcon size={16} />
						{recherche.phase === 'REPOS' || recherche.phase === 'EN_COURS'
							? `Chercher « ${nomEtablissement} »`
							: 'Chercher à nouveau'}
					</Button>
				</Surface>
			) : null}

			<Champ etiquette="Dénomination">
				<Input size="lg" value={denomination} onChange={setDenomination} />
			</Champ>

			<Champ etiquette="SIREN ou SIRET">
				<Input
					size="lg"
					value={siren}
					onChange={setSiren}
					inputMode="numeric"
					valid={erreur === null}
					errorMessage={erreur ?? undefined}
				/>
			</Champ>

			<Champ etiquette="Adresse">
				<Input size="lg" value={adresse} onChange={setAdresse} />
			</Champ>

			<Champ etiquette="Vous êtes commerçant">
				<p className="text-cladd-2xs text-cladd-fg-softer">
					Condition de certaines procédures, pour vous et pour votre client.
					{deduit ? '' : ' Sans réponse, elle reste « pas déterminé ».'}
				</p>

				{/*
				  ⚠️ UNE DÉDUCTION S'AFFICHE COMME UNE DÉDUCTION. Le logiciel dit ce
				  qu'il a lu, ce qu'il en tire et le texte sur lequel il s'appuie, dans
				  cet ordre. Une case cochée sans explication se lit comme une saisie du
				  gérant, et personne ne saurait plus qui a répondu.
				*/}
				{deduit ? (
					<Surface
						variant="transparent"
						outline={false}
						className="verre-carte rounded-cladd-xl"
						contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
					>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg">
							{deduction.etat === 'ok'
								? 'Proposé d’après votre forme juridique, à confirmer : vous êtes commerçant.'
								: 'Proposé d’après votre forme juridique, à confirmer : vous n’êtes pas commerçant.'}
						</p>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Forme relevée au registre : « {deduction.formeRelevee} ». {deduction.fondement}
						</p>
						{contredit ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								Votre réponse remplace cette déduction : c’est elle qui sera enregistrée.
							</p>
						) : null}
						{demander ? null : (
							<Button
								size="sm"
								variant="transparent"
								outline={false}
								hoverable={false}
								className="verre verre-bouton min-h-12 self-start rounded-full px-3 text-cladd-2xs"
								onClick={() => setCorrection(true)}
							>
								Corriger
							</Button>
						)}
					</Surface>
				) : (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						{deduction.fondement} La question vous est donc posée.
					</p>
				)}

				{/* Un segment est une pilule pressable à part entière, pas une moitié
				    de bascule : « Oui » et « Non » ne remplissent que leurs rembourrages
				    et tombaient à 43,9 px de large. Le plancher tactile vaut dans les
				    deux dimensions. */}
				{demander ? (
					<Segmented className="self-start" activeColor="neutral" activeVariant="solid">
						<SegmentedButton
							className="min-w-cladd-md"
							active={estCommercant === 'ok'}
							onClick={() => setEstCommercant('ok')}
						>
							Oui
						</SegmentedButton>
						<SegmentedButton
							className="min-w-cladd-md"
							active={estCommercant === 'ko'}
							onClick={() => setEstCommercant('ko')}
						>
							Non
						</SegmentedButton>
						<SegmentedButton
							active={estCommercant === 'unknown'}
							onClick={() => setEstCommercant('unknown')}
						>
							À déterminer
						</SegmentedButton>
					</Segmented>
				) : null}
			</Champ>

			<BoutonPrincipal
				className="self-start"
				onClick={() => void enregistrer()}
				disabled={enCours || !denomination.trim()}
			>
				{enregistre ? <CheckIcon /> : null}
				{enregistre ? 'Enregistré' : enCours ? 'Enregistrement…' : 'Enregistrer'}
			</BoutonPrincipal>
		</div>
	);
}

/**
 * Ce que la section affiche : le formulaire, la clé qui le remonte, et
 * l'enregistrement que la route pilote.
 *
 * ⚠️ LA `key` SUIT L'ÉTABLISSEMENT, JAMAIS LE PROFIL, et ce n'était pas un
 * détail de la page disparue. Posée sur la dénomination, elle changeait au
 * premier enregistrement : Convex met à jour la lecture du profil avant de
 * résoudre l'écriture, le formulaire se remontait donc en pleine sauvegarde,
 * « Enregistré » ne s'affichait jamais, et ce qui avait été tapé pendant
 * l'enregistrement était perdu.
 */
export interface CreancierAffiche {
	readonly initial: ComponentProps<typeof FormulaireCreancier>['initial'];
	readonly nomEtablissement: string;
	/** Remonte le formulaire quand l'établissement change, jamais à l'enregistrement du profil. Voir la route. */
	readonly cle: string;
	readonly onChercherAuRegistre: ComponentProps<typeof FormulaireCreancier>['onChercherAuRegistre'];
	readonly onEnregistrer: ComponentProps<typeof FormulaireCreancier>['onEnregistrer'];
}
