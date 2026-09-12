import { Link } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import {
	AlertTriangleIcon,
	ArrowRightIcon,
	ListTreeIcon,
	UploadIcon,
	UsersIcon
} from 'lucide-react';
import {
	Page,
	PageBody,
	PageHero,
	ChiffreHero,
	RangeeActions,
	CarteDemarrage,
	CompositionDue,
	Faisceau,
	FluxEvenements,
	Bandeau,
	Veilleur,
	CeQuiManque,
	dateCourte,
	eurosCentimes,
	pluriel,
	type ActionRonde,
	type PartsDues,
	type EvenementAffiche,
	type TacheVeilleur,
	type Verrou
} from '../ui';

/**
 * L'ACCUEIL — un seul chiffre, ses gestes, puis ce qui a bougé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ L'ÉCRAN EST LE MÊME À ZÉRO QU'À CINQUANTE MILLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la règle qui gouverne ce fichier, et c'est celle qu'il violait.
 *
 * L'accueil basculait sur une page vide dès qu'il n'y avait rien à montrer :
 * le chiffre disparaissait, la rangée d'actions disparaissait, et le premier
 * écran qu'un nouveau client voyait n'était pas celui qu'il utiliserait
 * ensuite. Il devait donc apprendre l'interface deux fois.
 *
 * Maintenant le montant s'affiche TOUJOURS — à zéro s'il le faut — la rangée
 * d'actions reste au complet, et ce qui manque est dit par une carte posée en
 * dessous. Le zéro n'est jamais muet : c'est ça, et pas l'absence de zéro, que
 * la règle d'écran n° 4 interdit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UN SEUL TOTAL, ET C'EST CELUI-CI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit portait DEUX écrans qui répondaient chacun à la moitié d'une
 * question. « À traiter » affichait le montant identifié — principal TTC des
 * factures échues, hors intérêts. « Ce qui est dû » affichait ce que ces
 * retards valent intérêts et indemnités comprises. Les deux étaient justes,
 * les deux étaient différents, et ils étaient à un onglet l'un de l'autre.
 *
 * Sur un produit dont l'argument de vente est l'exactitude au centime, deux
 * totaux voisins ne se lisent pas comme deux mesures : ils se lisent comme une
 * contradiction. La barre de navigation avait bien identifié le risque — elle
 * en tirait la mauvaise conclusion, en SÉPARANT les écrans au lieu de trancher
 * lequel des deux chiffres est celui qu'on vient chercher.
 *
 * C'est celui-ci. Un dirigeant n'ouvre pas ce logiciel pour compter ses
 * factures en retard ; il l'ouvre pour savoir COMBIEN ON LUI DOIT. Le détail
 * ligne à ligne n'a pas disparu : le chiffre est un lien et y mène.
 *
 * ⚠️ CE COMPOSANT NE SAIT PAS INTERROGER CONVEX, ET C'EST VOULU. La route lui
 * passe des données, la salle d'exposition lui en passe d'autres. C'est ce qui
 * permet de VOIR cet écran aux quatre largeurs de référence sans backend ni
 * authentification — la troisième barrière du système visuel, celle du regard.
 */

/** L'état de la surveillance quotidienne, tel que l'écran doit le dire. */
export type EtatSurveillance =
	| { readonly etat: 'NORMAL' }
	| { readonly etat: 'INCONNU' }
	| { readonly etat: 'ECHEC'; readonly jour: string }
	| { readonly etat: 'JAMAIS_TOURNE' };

export interface AccueilAffiche {
	readonly total: bigint;
	readonly nombreFactures: number;
	readonly interetsCourusDepuisHier: bigint;
	/**
	 * Les TROIS parts du total — jamais quatre. `supplement` est déjà la somme
	 * des intérêts et de l'indemnité : l'ajouter les compterait deux fois. Voir
	 * `ui/composition.tsx`, qui porte le raisonnement.
	 */
	readonly parts: PartsDues;
	readonly evenements: readonly EvenementAffiche[];
	readonly hypotheses: readonly string[];
	readonly anglesMorts: readonly string[];
	readonly surveillance: EtatSurveillance;
	/**
	 * CE QUE LA MACHINE A FAIT CETTE NUIT, et ce qu'elle fait en ce moment.
	 *
	 * ⚠️ IL MANQUAIT TOUT SIMPLEMENT. Le produit fait tourner un battement
	 * quotidien, un radar de solvabilité et une lecture de pièces par le modèle ;
	 * la table `battements` garde de chaque nuit une RAISON que le schéma
	 * lui-même annote « affiché tel quel ». Elle arrivait jusqu'ici et se perdait
	 * sur la ligne qui repliait `PARLE` et `TU` sur « NORMAL », lequel ne rend
	 * rien.
	 *
	 * Le seul moment où cet écran admettait qu'une machine travaille pour le
	 * gérant était donc le jour de la panne. Voir `ui/veilleur.tsx`, qui porte le
	 * raisonnement complet et la réponse à l'objection du « bandeau vert ».
	 */
	readonly travaux: readonly TacheVeilleur[];
	/**
	 * LES VERROUS QUI RESTENT.
	 *
	 * ⚠️ LE PRODUIT LES CONNAISSAIT TOUS LES TROIS, ET N'EN DISAIT AUCUN. Sans
	 * profil créancier, `creancierCommercant` vaut `unknown`, donc
	 * `entreCommercants` aussi, donc l'éligibilité à l'injonction de payer ne
	 * peut JAMAIS être acquise — et l'écran de créance affichait cette condition
	 * non remplie sans jamais dire que c'était l'identité du gérant qui manquait.
	 *
	 * Voir `ui/ce-qui-manque.tsx`, qui porte le raisonnement.
	 */
	readonly verrous: readonly Verrou[];
}

/**
 * CE QUE L'ACCUEIL MONTRE DU FLUX, ET CE QU'IL LAISSE AU DÉTAIL.
 *
 * ⚠️ TROIS ÉVÉNEMENTS, PAS SEPT. La question posée était : ces cartes sont-elles
 * utiles, et n'alourdissent-elles pas l'écran ? Réponse honnête : les
 * événements sont la raison d'ouvrir le produit — ce qui a bougé depuis hier —
 * donc ils restent. Mais la liste entière, avec pour chaque rangée une puce,
 * une référence, une explication, une consigne d'action et un montant, faisait
 * passer le chiffre du hero à trois écrans de défilement sur un téléphone.
 *
 * Trois suffisent à dire « il se passe quelque chose ». Le nombre restant est
 * écrit sur le lien qui mène au reste : un « voir plus » sans chiffre ne dit
 * pas s'il reste deux lignes ou quatre-vingts, donc on ne sait pas si ça vaut
 * le geste.
 *
 * ⚠️ ET LES ANGLES MORTS NE SONT PAS SUPPRIMÉS POUR AUTANT. La règle du
 * produit est explicite : « ce que le logiciel ne voit pas s'affiche aussi »,
 * parce qu'un gérant qui se croit surveillé ne surveille pas lui-même. Ils sont
 * REPLIÉS en une ligne qui les dénombre et mène à leur texte complet — la dette
 * d'information reste due, elle change seulement de forme.
 */
const MODE_COMPACT = { limite: 3, versDetail: '/app/revelation' } as const;

export function EcranAccueil({ vue }: { vue: AccueilAffiche }) {
	const rienASurveiller = vue.evenements.length === 0;
	const rienDeChiffre = vue.nombreFactures === 0;
	const debute = rienDeChiffre && rienASurveiller;

	/**
	 * LES TROIS GESTES DU DOMAINE, et rien d'autre. L'ancienne barre en portait
	 * huit, tous de même poids, dont aucun ne disait quoi faire maintenant.
	 *
	 * ⚠️ LA RANGÉE NE CHANGE JAMAIS DE LONGUEUR. « Le détail » est estompé tant
	 * qu'il n'y a rien à détailler, jamais retiré : une rangée dont les éléments
	 * apparaissent et disparaissent se réapprend à chaque visite, et un geste
	 * qu'on a vu une fois puis qui n'est plus là se cherche longtemps. C'est le
	 * traitement de la référence, qui garde « Withdraw » en place et l'estompe.
	 */
	const actions: readonly ActionRonde[] = [
		{ libelle: 'Importer', icone: <UploadIcon />, to: '/app/import-factures' },
		{ libelle: 'Débiteurs', icone: <UsersIcon />, to: '/app/debiteurs' },
		{
			libelle: 'Le détail',
			icone: <ListTreeIcon />,
			to: '/app/revelation',
			indisponible: rienDeChiffre
				? 'Le détail ligne à ligne apparaîtra dès que vos factures seront importées.'
				: undefined
		}
	];

	return (
		<Page>
			<PageBody>
				<PageHero className="mx-auto w-full max-w-2xl">
					{/*
					  LE CHIFFRE EST UN LIEN, et c'est le geste central de l'écran : on
					  touche le montant pour ouvrir son détail ligne à ligne. C'est ce
					  que fait la référence avec son solde, et ça évite un quatrième
					  onglet dont la seule raison d'être serait de porter ce détail.

					  Tant qu'il n'y a rien à détailler, il n'est pas un lien : un
					  chiffre cliquable qui mène à une page vide est une promesse non
					  tenue, et elle se paie à la première visite.
					*/}
					<LienDetail actif={!rienDeChiffre}>
						<ChiffreHero
							centimes={vue.total}
							surTitre="Ce qui vous est dû"
							legende={
								rienDeChiffre ? (
									<span>Aucune facture en retard pour l’instant</span>
								) : (
									<span className="inline-flex items-center gap-1.5">
										{vue.nombreFactures} facture{pluriel(vue.nombreFactures)} en retard
										{/*
										  LE COMPTEUR VIVANT. Les intérêts courent chaque jour, et
										  c'est la seule chose que ce produit sait dire et qu'aucun
										  tableur ne dit. Le montrer ici, sous le total, est ce qui
										  transforme un chiffre figé en une somme qui monte.
										*/}
										{vue.interetsCourusDepuisHier > 0n ? (
											<>
												<span aria-hidden>·</span>
												<span>
													+{eurosCentimes(vue.interetsCourusDepuisHier)} depuis hier
												</span>
											</>
										) : null}
										<ArrowRightIcon className="size-3.5" aria-hidden />
									</span>
								)
							}
						/>
					</LienDetail>

					<RangeeActions actions={actions} />
				</PageHero>

				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					<AvisSurveillance surveillance={vue.surveillance} />

					{/*
					  LE VEILLEUR, JUSTE SOUS LES GESTES — c'est la place que la
					  référence donne à ses « Automations » : sous le solde et sa rangée
					  d'actions, AVANT les blocs de détail. Plus bas, il tomberait sous
					  la ligne de flottaison du téléphone, et le travail de fond
					  resterait ce qu'il était : invisible.

					  ⚠️ IL NE FAIT PAS DOUBLON AVEC LE BANDEAU CI-DESSUS, et les deux
					  restent. Le bandeau dit ce que la panne signifie POUR LE GÉRANT
					  — « vos délais ne sont pas suivis depuis » — et c'est la seule
					  phrase de l'écran qui empêche le pire état du produit. La rangée
					  du veilleur dit ce que LA MACHINE a fait, avec sa date et un lien
					  pour entrer. Deux registres, jamais la même phrase deux fois.
					*/}
					<Veilleur travaux={vue.travaux} />

					{/*
					  LES VERROUS, SOUS LE VEILLEUR — et jamais en même temps que la carte
					  de démarrage.

					  ⚠️ LES DEUX DIRAIENT « IMPORTEZ VOS FACTURES ». La carte de démarrage
					  le dit mieux dans l'état vide : elle est seule à l'écran et porte le
					  seul faisceau de l'application. Répéter la même consigne deux fois
					  sur le même écran est le plus sûr moyen de n'en faire lire aucune.

					  Dès qu'une facture existe, la carte disparaît et les verrous restants
					  — l'identité du créancier, les débiteurs sans SIREN — prennent le
					  relais. Ce sont ceux qu'on ne découvrait jusqu'ici qu'en se cognant
					  dedans.
					*/}
					{debute ? null : <CeQuiManque verrous={vue.verrous} />}

					{/*
					  LE SEUL GRAPHIQUE DE L'ÉCRAN, et il répond à la question qui vient
					  juste après « combien » : « pourquoi autant ». C'est aussi le seul
					  endroit où le produit MONTRE son argument de vente — que les
					  intérêts et l'indemnité forfaitaire pèsent, et qu'ils ne sont
					  presque jamais réclamés.

					  Il se tait de lui-même quand il n'y a rien à décomposer : voir
					  `CompositionDue`, qui rend `null` sur un total nul plutôt qu'une
					  barre vide — laquelle se lirait comme un graphique en panne.
					*/}
					<CompositionDue parts={vue.parts} />

					{debute ? (
						<CarteDemarrage
							icone={<UploadIcon size={20} />}
							titre="Importez vos factures"
							explication="Le logiciel surveille les échéances et la prescription dès qu’il a de quoi compter."
							action={
								/*
								  LE SEUL FAISCEAU DE L'ÉCRAN, et il n'est là que dans cet
								  état-ci. Sans factures, le produit ne peut littéralement
								  rien mesurer : le montant est à zéro, le flux est vide, le
								  détail est estompé. Tout l'écran attend ce geste, donc il
								  est le seul à avoir le droit de briller.

								  Il disparaît avec la carte dès la première facture importée.
								  Un faisceau permanent devient du décor en trois jours — et
								  ne dit plus rien le jour où il compte.
								*/
								<Faisceau className="rounded-cladd-md">
									{/*
									  ⚠️ EN VERRE, ET SURTOUT PAS EN APLAT D'ACCENT. Un bouton
									  bleu plein sous un anneau lumineux annule l'anneau : le
									  regard va à la masse de couleur, la lumière qui court sur
									  le bord devient un liseré qu'on ne remarque plus, et on a
									  payé une animation pour rien.

									  Sur verre, c'est l'inverse : le bouton est presque
									  transparent, donc le faisceau est la SEULE chose qui le
									  dessine. C'est lui qui attire l'œil, et c'est ce qu'on
									  voulait.

									  Le texte reste en `--cladd-fg` — on ne passe pas
									  `color="brand"`, qui teinterait le libellé en bleu et
									  ramènerait la couleur qu'on vient d'enlever.
									*/}
									<Button
										as={Link}
										to="/app/import-factures"
										variant="transparent"
										outline={false}
										// ⚠️ `hoverable={false}` EST OBLIGATOIRE ICI. Cladd peint
										// son survol dans une couche absolue POSÉE SUR le contenu ;
										// en thème sombre c'est un voile foncé, et sur du verre il
										// recouvre la translucidité — le bouton devenait un
										// rectangle noir au passage de la souris. Le survol est
										// repris par `.verre-bouton`, qui assombrit à peine.
										hoverable={false}
										className="verre verre-bouton w-full"
									>
										Importer
									</Button>
								</Faisceau>
							}
						/>
					) : null}

					{/* `montantIdentifie` n'est PAS passé : le hero porte déjà le total,
					    et les deux mesurent des choses différentes. Voir la note sur la
					    prop, dans `ui/flux-evenements.tsx`. */}
					{rienASurveiller ? null : (
						<FluxEvenements
							evenements={vue.evenements}
							hypotheses={vue.hypotheses}
							anglesMorts={vue.anglesMorts}
							{...MODE_COMPACT}
						/>
					)}
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * LA SURVEILLANCE EST-ELLE MUETTE ?
 *
 * ⚠️ C'EST LA SEULE CHOSE DE CET ÉCRAN QUI EMPÊCHE LE PIRE ÉTAT DU PRODUIT.
 * Un gérant qui se croit surveillé alors que le battement plante depuis six
 * jours ne surveille pas lui-même — et il perdra une créance en croyant être
 * couvert. C'est exactement le scénario que ce produit existe pour empêcher.
 *
 * DEUX ÉTATS SE DISENT, DEUX SE TAISENT.
 *
 *   · ÉCHEC — toujours, même sur un écran vide. Si le battement est tombé, le
 *     vide qu'on affiche est peut-être le symptôme et pas la vérité.
 *   · JAMAIS TOURNÉ — l'appelant ne le pose que s'il y a quelque chose à
 *     surveiller. Sur un établissement sans facture, la carte de démarrage dit
 *     déjà, mieux, ce qu'il reste à faire.
 *   · NORMAL — rien. Un bandeau vert permanent devient du décor qu'on cesse de
 *     voir en trois jours, et il ne dit plus rien le jour où il disparaît.
 *   · INCONNU — rien non plus : c'est l'état de chargement, et faire clignoter
 *     une alerte le temps d'un aller-retour apprend à l'ignorer.
 */
function AvisSurveillance({ surveillance }: { surveillance: EtatSurveillance }) {
	if (surveillance.etat === 'NORMAL' || surveillance.etat === 'INCONNU') return null;

	return (
		<Bandeau ton="alerte" icone={<AlertTriangleIcon size={18} />}>
			{surveillance.etat === 'ECHEC'
				? `La surveillance a échoué le ${dateCourte(surveillance.jour)}. Vos délais ne sont pas suivis depuis.`
				: 'La surveillance n’a pas encore tourné sur cet établissement. Vos délais ne sont pas encore suivis.'}
		</Bandeau>
	);
}

/**
 * Le montant est un lien vers son détail — sauf quand il n'y a rien à détailler.
 *
 * Extrait pour que le rendu du chiffre ne soit écrit qu'une fois : dupliquer le
 * `ChiffreHero` dans les deux branches d'un ternaire est la façon habituelle de
 * finir avec deux compositions qui divergent à la première retouche.
 */
function LienDetail({ actif, children }: { actif: boolean; children: React.ReactNode }) {
	if (!actif) return <div className="block">{children}</div>;
	return (
		<Link to="/app/revelation" className="block">
			{children}
		</Link>
	);
}
