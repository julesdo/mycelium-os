import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	Facultatif,
	aujourdHuiISO,
	ceQuiManque,
	secteursProposes,
	travauxDuVeilleur,
	type EtablissementPropose,
	type EtatRecherche,
	type UrgenceRangee
} from '../../ui';
import { AvatarConnecte, VeilleurPresent } from '../../app/identite';
import { Recherche } from '../../app/recherche';
import { SelecteurEtablissement } from '../../app/selecteur-etablissement';
import {
	EcranFile,
	type ClePortee,
	type FileAffichee,
	type RangeeClient,
	type RangeeDeLaFile
} from '../../screens/file';
import { POSITIONS_VOLET, SECTIONS_VOLET, type PositionVolet, type SectionVolet } from '../../screens/volet';
import { VoletBranche } from '../../app/volet-branche';

/**
 * `/app` — LA FILE, ET C'EST TOUT L'ÉCRAN DE TRAVAIL DU PRODUIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA BASCULE (T15)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cette adresse rendait l'accueil : un hero, un total, trois boutons ronds et
 * quatre onglets de barre. Elle rend maintenant `screens/file.tsx`. C'est le
 * seul commit du lot qui change ce que le gérant voit, et il est écrit pour
 * être annulé d'un `git revert` : il ne porte ni schéma, ni fonction Convex, ni
 * champ, et l'ancien arbre n'a pas cessé d'exister — une porte nommée et datée
 * l'ouvre en bas de la file.
 *
 * ⚠️ TOUT LE DESSIN VIT DANS `screens/file.tsx`, QUI NE SAIT PAS INTERROGER
 * CONVEX. C'est ce qui permet de le voir aux quatre largeurs de référence
 * depuis la salle d'exposition, sans backend ni authentification. Ce fichier-ci
 * ne fait que lire et traduire — et il monte les quatre surfaces que seule
 * l'application peut composer : l'avatar, le veilleur, le sélecteur
 * d'établissement et la palette de recherche, qui vivaient dans la barre morte.
 */

/**
 * `?ligne=<id>` — CE QUI OUVRE LE VOLET DE PREUVE.
 *
 * ⚠️ C'EST UN PARAMÈTRE DE RECHERCHE, PAS UN SEGMENT DE CHEMIN. La liste et la
 * preuve sont le MÊME écran au-delà de 1024 px ; un segment de chemin
 * suggérerait deux pages là où il y en a une. Le même choix que `?d=` sur les
 * débiteurs, et pour la même raison.
 *
 * ⚠️ ET IL PORTE L'IDENTIFIANT DE LA RANGÉE, TEL QUEL. Une rangée vise tantôt
 * une créance, tantôt un client — c'est la SURVEILLANCE qui le décide, pas
 * l'écran. Réécrire ici l'un vers l'autre ferait diverger l'adresse de la
 * rangée qu'on a touchée, et le surlignage désignerait une autre ligne que
 * celle dont on lit la preuve.
 */
/**
 * ⚠️ TROIS PARAMÈTRES, ET LES TROIS SE RECHARGENT. Une preuve adressable dont
 * seule la LIGNE tient dans l'adresse rouvre le dossier sur une autre page que
 * celle qu'on partageait : la position du `Segmented` et les sections dépliées
 * en font partie. C'est la correction directe du défaut le plus étrange du
 * dépôt — l'écran le plus lourd du produit n'avait pas d'adresse du tout.
 *
 * `sections` est une liste séparée par des virgules, filtrée contre
 * `SECTIONS_VOLET` : une clé inconnue tombe, elle ne fait pas lever. Une adresse
 * partagée depuis une version qui nommait une section disparue doit ouvrir le
 * dossier, pas une page d'erreur.
 *
 * ⚠️ ET UNE LISTE VIDE N'EST PAS UNE LISTE ABSENTE. `?sections=` veut dire « le
 * gérant a tout replié » ; l'absence du paramètre veut dire « l'adresse ne dit
 * rien », et c'est alors `sectionsParDefaut` qui tranche. Les confondre ferait
 * rouvrir le montant sur un volet qu'on venait de refermer en entier.
 */
export const Route = createFileRoute('/app/')({
	component: File,
	errorComponent: FileEnErreur,
	validateSearch: (recherche: Record<string, unknown>): RechercheDeLaFile => {
		const ligne = recherche.ligne;
		const position = recherche.position;
		const sections = recherche.sections;

		return {
			...(typeof ligne === 'string' && ligne.length > 0 ? { ligne } : {}),
			...(typeof position === 'string' && (POSITIONS_VOLET as readonly string[]).includes(position)
				? { position: position as PositionVolet }
				: {}),
			...(typeof sections === 'string'
				? {
						sections: sections
							.split(',')
							.filter((cle): cle is SectionVolet =>
								(SECTIONS_VOLET as readonly string[]).includes(cle)
							)
							.join(',')
					}
				: {})
		};
	}
});

interface RechercheDeLaFile {
	readonly ligne?: string;
	readonly position?: PositionVolet;
	/** Les sections dépliées, séparées par des virgules. Absent : celles par défaut. */
	readonly sections?: string;
}

function FileEnErreur() {
	return <EcranFile donnees={{ etat: 'erreur' }} />;
}

/**
 * LES PORTÉES DE CHAQUE ÉVÉNEMENT, et pourquoi chacune.
 *
 * ⚠️ « AUJOURD'HUI » LES PREND TOUS, ET C'EST LA PORTÉE PAR DÉFAUT. Ce qui
 * compte aujourd'hui est ce que la surveillance a relevé aujourd'hui : filtrer
 * ici ferait une seconde règle de tri à côté de `comparerEvenements`, qui est
 * la seule du produit.
 */
const PORTEES_PAR_TYPE: Record<string, readonly ClePortee[]> = {
	PRESCRIPTION_PROCHE: ['AUJOURDHUI', 'PRESCRIPTION'],
	// Une créance mûre est celle dont on peut arrêter le décompte : les quatre
	// conditions sont établies et aucun risque bloquant n'est relevé.
	CREANCE_MURE: ['AUJOURDHUI', 'DECOMPTES'],
	ECHEANCE_PROCEDURE: ['AUJOURDHUI', 'ENGAGES'],
	// Une facture échue non rattachée attend une décision : la rattacher à une
	// créance, ou enregistrer son règlement.
	FACTURE_ECHUE: ['AUJOURDHUI', 'A_TRANCHER'],
	DEBITEUR_DEGRADE: ['AUJOURDHUI'],
	HABITUDE_ROMPUE: ['AUJOURDHUI']
};

/**
 * CE QUE CHAQUE TYPE DIT DE LUI-MÊME AU PLI, accordé au singulier ET au pluriel.
 *
 * ⚠️ AUCUN TYPE NE SE REPLIE, ET C'EST UN REFUS ARGUMENTÉ. `PliDeLaFile` écrit
 * « N <libellé>, rien à faire » : une facture échue et non soldée, une santé
 * dégradée au registre ou une habitude rompue appellent toutes une décision, et
 * les ranger sous « rien à faire » serait le mensonge exact que le pli existe
 * pour éviter. Le jour où le produit saura dire qu'une rangée n'appelle
 * réellement rien — une facture payée dans les délais, un dépôt sans rien
 * d'écarté — c'est cette table-ci qui le dira, et `trierSelonLePli` le fera.
 */
const PLI_PAR_TYPE: Record<string, { readonly un: string; readonly plusieurs: string }> = {
	PRESCRIPTION_PROCHE: { un: 'prescription proche', plusieurs: 'prescriptions proches' },
	CREANCE_MURE: { un: 'créance mûre', plusieurs: 'créances mûres' },
	ECHEANCE_PROCEDURE: { un: 'échéance de procédure', plusieurs: 'échéances de procédure' },
	FACTURE_ECHUE: { un: 'facture échue', plusieurs: 'factures échues' },
	DEBITEUR_DEGRADE: { un: 'client dégradé au registre', plusieurs: 'clients dégradés au registre' },
	HABITUDE_ROMPUE: { un: 'habitude de paiement rompue', plusieurs: 'habitudes de paiement rompues' }
};

/**
 * Les secteurs proposés, calculés une fois : ils ne dépendent d'aucune donnée
 * du client, seulement du référentiel de prescription.
 */
const OPTIONS_SECTEUR = secteursProposes();

/**
 * L'état de repos de la recherche au registre, posé UNE fois hors du composant :
 * un rendu ne doit pas fabriquer un objet neuf pour dire « rien ne se passe ».
 */
const REGISTRE_AU_REPOS: EtatRecherche = { phase: 'REPOS' };

/**
 * LE PRÉAVIS, LU SUR LA MÊME SOURCE QUE LA SURVEILLANCE.
 *
 * ⚠️ « SOUS PRÉAVIS » EST UNE QUESTION DE PRESCRIPTION, PAS DE DATE PROCHE. La
 * tête de file compte les clients dont une échéance tombe sous le préavis : on
 * la lit sur les événements que la surveillance a déjà classés
 * `PRESCRIPTION_PROCHE`, jamais en recomparant des dates ici. Deux calculs de
 * préavis divergeraient au premier changement de `PREAVIS`.
 */
function File() {
	const navigate = useNavigate();
	const { ligne, position, sections } = Route.useSearch();
	const aujourdHui = aujourdHuiISO();

	const flux = useQuery(api.recouvrement.surveillance.flux, {});
	// La date d'arrêté vient de la SEULE horloge de l'interface : deux lectures
	// différentes feraient diverger les totaux autour de minuit. Voir `ui/horloge.ts`.
	const revelation = useQuery(api.recouvrement.revelation.revelation, { arreteAu: aujourdHui });
	const bilan = useQuery(api.recouvrement.revelation.bilan, { aujourdHui });
	const battement = useQuery(api.recouvrement.battement.dernierBattement, {});
	/**
	 * ⚠️ `limite: 5` BORNE LA LECTURE, et c'est la même que celle du veilleur, donc
	 * Convex la sert une fois. Au-delà de cinq dépôts simultanément en machine, la
	 * sixième rangée n'apprend plus rien.
	 */
	const depots = useQuery(api.recouvrement.depotMutations.listerImports, { limite: 5 });
	const notifications = useQuery(api.notifications.listMyNotifications, {});
	const marquerLue = useMutation(api.notifications.markAsRead);
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	const creances = useQuery(api.recouvrement.lecture.listerCreances, {});
	const habitudes = useQuery(api.recouvrement.comportement.lireParEtablissement, { aujourdHui });
	/**
	 * CE QU'UN DÉCOMPTE ARRÊTÉ LAISSERAIT DEHORS.
	 *
	 * ⚠️ C'EST LE SEUL ENDROIT DU PRODUIT OÙ UN REFUS VAUT MIEUX QU'UN RÉSULTAT :
	 * le titre exécutoire ne porte que les sommes qu'il chiffre, et ce qui n'y
	 * figure pas est perdu. La vue Par client le montre par client, en euros.
	 */
	const abandons = useQuery(api.recouvrement.controle.abandonsDeLEtablissement, {});

	/**
	 * LE REGISTRE : une ACTION, parce qu'elle appelle le BODACC.
	 *
	 * ⚠️ ELLE N'ÉCRIT RIEN. Elle rend des candidats ; c'est `renseignerSiren` qui
	 * retient celui que le gérant reconnaît. Le produit ne choisit jamais à sa
	 * place : six homonymes se ressemblent, et retenir le premier écrirait un
	 * identifiant faux sur un client — donc surveillerait la solvabilité de
	 * quelqu'un d'autre.
	 */
	const chercherAuRegistre = useAction(api.recouvrement.debiteurs.chercherAuRegistre);
	const renseignerSiren = useMutation(api.recouvrement.debiteurs.renseignerSiren);
	const renseignerSecteur = useMutation(api.recouvrement.debiteurs.renseignerSecteur);

	/**
	 * L'ÉTAT DE LA RECHERCHE, ET IL N'Y EN A QU'UNE À LA FOIS.
	 *
	 * ⚠️ IL PORTE LE DÉBITEUR AUQUEL IL SE RAPPORTE. Le pli en montre plusieurs à
	 * l'écran : sans l'identifiant, les candidats trouvés pour l'un s'afficheraient
	 * sous le suivant, et le gérant retiendrait le SIREN d'une autre société. Même
	 * défaut, et même remède, que le constat de taux sur l'écran des débiteurs.
	 *
	 * Un seul état, parce qu'on ne cherche qu'un client à la fois : l'ouvrir pour
	 * un second remplace le premier, ce qui est aussi ce qu'on veut lire.
	 */
	const [recherche, setRecherche] = useState<{
		readonly debiteurId: string;
		readonly etat: EtatRecherche;
	} | null>(null);
	const [erreurSaisie, setErreurSaisie] = useState<{
		readonly debiteurId: string;
		readonly message: string;
	} | null>(null);

	const genererUrl = useMutation(api.recouvrement.depotMutations.genererUrlDepot);
	const enregistrer = useMutation(api.recouvrement.depotMutations.enregistrerFichier);

	if (flux === undefined || revelation === undefined || bilan === undefined) {
		return <EcranFile donnees={{ etat: 'attente' }} />;
	}

	// ── CE QUI SERT À NOMMER ET À RÉSOUDRE ───────────────────────────────────

	const nomDuDebiteur = new Map((debiteurs ?? []).map((d) => [d._id as string, d.denomination]));

	/**
	 * LA CRÉANCE D'UN CLIENT, ET IL N'Y EN A QU'UNE RÈGLE.
	 *
	 * ⚠️ `listerCreances` REND LES PLUS MÛRES D'ABORD, puis le montant le plus
	 * lourd. La première de ce client est donc celle qu'on ouvrirait de toute
	 * façon — et cet ordre ne dépend d'aucune horloge, donc la résolution est
	 * stable d'un rechargement à l'autre. C'est ce qui permet à `?ligne=` de
	 * rouvrir la même preuve demain.
	 */
	const creanceDuDebiteur = new Map<string, string>();
	for (const creance of creances ?? []) {
		if (!creanceDuDebiteur.has(creance.debiteurId as string)) {
			creanceDuDebiteur.set(creance.debiteurId as string, creance._id as string);
		}
	}
	const estUneCreance = new Set((creances ?? []).map((c) => c._id as string));

	/** Une rangée n'est tapable que si son identifiant mène à un dossier. */
	const ouvrable = (id: string) => estUneCreance.has(id) || creanceDuDebiteur.has(id);

	// ── LES RANGÉES DE LA SURVEILLANCE ───────────────────────────────────────

	const rangeesDuFlux: RangeeDeLaFile[] = flux.evenements.map((evenement, rang) => {
		const cible = evenement.cible;
		const debiteurId =
			cible === undefined
				? null
				: cible.genre === 'DEBITEUR'
					? cible.id
					: (cible.debiteurId ?? null);

		/**
		 * ⚠️ UN ÉVÉNEMENT SANS CIBLE GARDE UNE CLÉ STABLE, et il n'est pas tapable.
		 * Le rang ne suffirait pas : il change dès qu'un événement plus urgent
		 * arrive, et `?ligne=` rouvrirait une autre rangée le lendemain. Le type et
		 * la référence, eux, décrivent le fait.
		 */
		const id = cible?.id ?? `${evenement.type}:${evenement.reference}:${rang}`;

		return {
			genre: 'OBSTACLE' as const,
			id,
			debiteurId,
			debiteur:
				(debiteurId === null ? undefined : nomDuDebiteur.get(debiteurId)) ?? evenement.reference,
			portees: PORTEES_PAR_TYPE[evenement.type] ?? ['AUJOURDHUI'],
			ouvrable: ouvrable(id),
			// L'explication du domaine, MOT POUR MOT. La reformuler ici créerait une
			// seconde version de la vérité, qui dériverait de la première.
			obstacle: evenement.explication,
			urgence: evenement.urgence as UrgenceRangee,
			montant: evenement.montant,
			...(evenement.dateDuFait === undefined ? {} : { dateDuFait: evenement.dateDuFait }),
			pli: {
				libelle: PLI_PAR_TYPE[evenement.type] ?? { un: 'rangée', plusieurs: 'rangées' },
				rienATrancher: false
			}
		};
	});

	/**
	 * LES DÉPÔTS, EN RANGÉES DATÉES — jamais un bandeau refermable.
	 *
	 * ⚠️ `ui/bilan-import.tsx` PORTE LA RÈGLE MOT POUR MOT : « un import qui
	 * annonce 198 factures sans mentionner les deux lignes écartées ment par
	 * omission, et l'omission porte sur l'argent qu'on ne réclamera pas ». Le pli
	 * ne les mange que le jour où RIEN n'a été écarté.
	 */
	const rangeesDeDepot: RangeeDeLaFile[] = (depots ?? []).map((depot) => {
		const ecartees =
			depot.bilan === undefined
				? 0
				: depot.bilan.ignoreesTotal + depot.bilan.horsPerimetre + depot.bilan.reglementsOrphelins;
		const termine = depot.statut === 'TERMINE';

		return {
			genre: 'DEPOT' as const,
			id: depot._id as string,
			debiteurId: null,
			debiteur: depot.filename,
			portees: ['AUJOURDHUI'],
			ouvrable: false,
			depot: {
				id: depot._id as string,
				filename: depot.filename,
				statut:
					depot.statut === 'TERMINE'
						? 'TERMINE'
						: depot.statut === 'ECHOUE'
							? 'ECHOUE'
							: 'EN_COURS',
				...(depot.etape === undefined ? {} : { etape: depot.etape }),
				...(depot.erreur === undefined ? {} : { erreur: depot.erreur }),
				...(depot.bilan === undefined ? {} : { bilan: depot.bilan }),
				deposeLe: depot.deposeLe
			},
			pli: {
				libelle: termine
					? { un: 'dépôt terminé', plusieurs: 'dépôts terminés' }
					: { un: 'dépôt en cours de lecture', plusieurs: 'dépôts en cours de lecture' },
				// Un dépôt qui travaille se REGARDE : il change sous les yeux, et le
				// replier reviendrait à cacher le seul traitement visible du produit.
				rienATrancher: termine,
				lignesEcartees: ecartees
			}
		};
	});

	const rangees = [...rangeesDuFlux, ...rangeesDeDepot];

	// ── LA TÊTE, ET LES DEUX NOMBRES ─────────────────────────────────────────

	const sousPreavis = new Set(
		flux.evenements
			.filter((e) => e.type === 'PRESCRIPTION_PROCHE')
			.map((e) => (e.cible?.genre === 'DEBITEUR' ? e.cible.id : (e.cible?.debiteurId ?? null)))
			.filter((id): id is string => id !== null)
	);

	const prescriptionSousPreavis = flux.evenements
		.filter((e) => e.type === 'PRESCRIPTION_PROCHE')
		.reduce((total, e) => total + (e.montant ?? 0n), 0n);

	// ── LA VUE PAR CLIENT ────────────────────────────────────────────────────

	const habitudeDe = new Map((habitudes ?? []).map((h) => [h.debiteurId as string, h]));

	/**
	 * CE QUI SERAIT HORS DÉCOMPTE, PAR CLIENT.
	 *
	 * ⚠️ IL N'EST RENDU QUE POUR LES CLIENTS QUI EN PORTENT UN, et c'est exact :
	 * `abandonsDeLEtablissement` compare les décomptes ARRÊTÉS aux factures
	 * connues. Un client sans décompte arrêté n'a rien à abandonner — lui poser
	 * « 0 € hors décompte » serait un cadran à zéro, et pire, ce serait affirmer
	 * un contrôle qui n'a pas eu lieu.
	 */
	const horsDecompte = new Map<
		string,
		{ facturesEcartees: number; montant: bigint; creances: Set<string> }
	>();
	for (const abandon of abandons?.abandons ?? []) {
		if (abandon.debiteurId === null) continue;
		const cle = abandon.debiteurId as string;
		const deja = horsDecompte.get(cle) ?? {
			facturesEcartees: 0,
			montant: 0n,
			creances: new Set<string>()
		};
		if (abandon.nature === 'FACTURE_ECARTEE') deja.facturesEcartees += 1;
		if (abandon.montantEnJeu !== null) deja.montant += abandon.montantEnJeu;
		deja.creances.add(abandon.creanceId as string);
		horsDecompte.set(cle, deja);
	}

	const obstaclesDuClient = (debiteurId: string) => {
		const comptes = new Map<string, number>();
		for (const rangee of rangees) {
			if (rangee.debiteurId !== debiteurId) continue;
			const libelle = rangee.pli.libelle.un;
			comptes.set(libelle, (comptes.get(libelle) ?? 0) + 1);
		}
		return [...comptes].map(([libelle, compte]) => ({ libelle, compte }));
	};

	const clients: RangeeClient[] = (debiteurs ?? []).map((debiteur) => {
		const id = debiteur._id as string;
		const sienne = rangees.filter((r) => r.debiteurId === id);
		/**
		 * L'ÉCHÉANCE LA PLUS PROCHE DE CE CLIENT, nommée avec son fait et sa date.
		 *
		 * ⚠️ ELLE SORT DES RANGÉES, pas d'un second calcul. Les rangées sont déjà
		 * triées par `comparerEvenements`, qui est le seul comparateur du produit :
		 * la première qui porte une date est celle qui tombe en premier.
		 */
		const prochaine = sienne.find(
			(r) => r.genre === 'OBSTACLE' && r.dateDuFait !== undefined
		) as Extract<RangeeDeLaFile, { genre: 'OBSTACLE' }> | undefined;

		const habitude = habitudeDe.get(id);
		const abandon = horsDecompte.get(id);

		return {
			debiteurId: id,
			denomination: debiteur.denomination,
			// Faux : la rangée le DIT, et ne fait pas passer un libellé brut pour un
			// nom retenu au registre.
			identifiantConfirme: debiteur.siren !== undefined,
			encours: debiteur.encours,
			/**
			 * ⚠️ LES PARTS NE SE VENTILENT PAS PAR CLIENT, ET ON N'EN INVENTE PAS.
			 * `revelation` les calcule pour l'établissement entier ; les répartir au
			 * prorata de l'encours produirait trois chiffres plausibles et faux sur
			 * un produit dont l'argument entier est l'exactitude au centime. La
			 * décomposition d'un client se lit dans son volet, où elle est calculée.
			 */
			parts: { principal: debiteur.encours, interets: 0n, indemnites: 0n },
			prochaineEcheance:
				prochaine?.dateDuFait === undefined
					? null
					: { fait: prochaine.obstacle, date: prochaine.dateDuFait },
			sousPreavis: sousPreavis.has(id),
			obstacles: obstaclesDuClient(id),
			...(habitude === undefined
				? {}
				: { habitude: { habitude: habitude.habitude, ruptures: habitude.ruptures } }),
			...(abandon === undefined
				? {}
				: {
						portefeuille: {
							facturesConnues: debiteur.facturesTotal,
							auDecompte: Math.max(debiteur.facturesTotal - abandon.facturesEcartees, 0),
							horsDecompte: abandon.montant
						}
					})
		};
	});

	// ── LES CLIENTS SANS IDENTIFIANT PUBLIC ──────────────────────────────────

	/**
	 * CHERCHER AU REGISTRE, ET DIRE CE QUI SE PASSE À CHAQUE ÉTAPE.
	 *
	 * ⚠️ `AUCUN` N'EST PAS `ECHEC`, ET LES CONFONDRE SERAIT UN REPLI SILENCIEUX.
	 * « Le registre ne connaît personne sous ce nom » est une réponse ; « le
	 * registre n'a pas répondu » en est une autre, et elle se retente. La rangée
	 * les affiche différemment parce qu'elles appellent des gestes différents.
	 */
	async function chercher(debiteurId: Id<'debiteurs'>) {
		setRecherche({ debiteurId, etat: { phase: 'EN_COURS' } });
		try {
			const { candidats } = await chercherAuRegistre({ debiteurId });
			setRecherche({
				debiteurId,
				etat: candidats.length === 0 ? { phase: 'AUCUN' } : { phase: 'TROUVE', candidats }
			});
		} catch (e) {
			setRecherche({
				debiteurId,
				etat: {
					phase: 'ECHEC',
					message: e instanceof Error ? e.message : 'Le registre n’a pas répondu.'
				}
			});
		}
	}

	/** Retenir un numéro : le refus du serveur se lit MOT POUR MOT sur la rangée. */
	async function retenirSiren(
		debiteurId: Id<'debiteurs'>,
		siren: string,
		formeJuridique?: string
	) {
		setErreurSaisie(null);
		try {
			await renseignerSiren({
				debiteurId,
				siren,
				...(formeJuridique === undefined ? {} : { formeJuridique })
			});
			// Retenu : la recherche a fait son travail et la rangée va disparaître du
			// pli. La laisser ouverte afficherait des candidats sur un client identifié.
			setRecherche(null);
		} catch (e) {
			setErreurSaisie({
				debiteurId,
				message: e instanceof Error ? e.message : 'Ce numéro n’a pas été accepté.'
			});
		}
	}

	const sansIdentifiant = (debiteurs ?? [])
		.filter((debiteur) => debiteur.siren === undefined)
		.map((debiteur) => ({
			debiteurId: debiteur._id as string,
			denomination: debiteur.denomination,
			encours: debiteur.encours,
			registre:
				recherche?.debiteurId === (debiteur._id as string) ? recherche.etat : REGISTRE_AU_REPOS,
			erreurSaisie:
				erreurSaisie?.debiteurId === (debiteur._id as string) ? erreurSaisie.message : null,
			onChercher: () => void chercher(debiteur._id),
			onRetenir: (etablissement: EtablissementPropose) =>
				void retenirSiren(debiteur._id, etablissement.siren, etablissement.formeJuridique),
			onSaisir: (siren: string) => void retenirSiren(debiteur._id, siren),
			secteur: debiteur.secteur,
			/**
			 * ⚠️ L'ASSERTION EST LA MÊME QU'À `debiteurs.tsx:560`, ET ELLE EST SÛRE :
			 * les clés proviennent de `secteursProposes()`, qui les lit dans
			 * `REGIMES_PRESCRIPTION`, c'est-à-dire dans l'union que ce validateur
			 * attend. Le compilateur ne relie pas les deux parce que `OptionSecteur.cle`
			 * est une chaîne libre — c'est ce qui permettra à un second pays d'en
			 * ajouter sans toucher au composant.
			 */
			onChoisirSecteur: (cle: string) =>
				void renseignerSecteur({ debiteurId: debiteur._id, secteur: cle as 'GENERAL' })
		}));

	// ── LE TRAVAIL DE FOND ───────────────────────────────────────────────────

	const travaux = travauxDuVeilleur({
		battement,
		// `undefined` est le CHARGEMENT, pas le vide. Traiter l'un pour l'autre
		// ferait clignoter une rangée « en attente de lecture » à chaque ouverture.
		depotsEnCours: (depots ?? [])
			.filter((depot) => depot.statut === 'EN_ATTENTE' || depot.statut === 'LECTURE')
			.map((depot) => ({
				id: depot._id,
				filename: depot.filename,
				...(depot.etape === undefined ? {} : { etape: depot.etape })
			})),
		// Les non lues seulement : une notification lue a fait son travail.
		trouvailles: (notifications ?? [])
			.filter((notification) => !notification.isRead)
			.map((notification) => ({
				id: notification._id as string,
				titre: notification.title,
				message: notification.message,
				...(notification.link === undefined ? {} : { lien: notification.link })
			})),
		// Ouvrir vaut acquitter. Sans ça, la pastille du veilleur ne s'éteint
		// jamais et le compte devient du décor.
		onLire: (id) => void marquerLue({ notificationId: id as Id<'notifications'> }),
		aujourdHui
	});

	// ── LE DÉPÔT DE FICHIERS ─────────────────────────────────────────────────

	/**
	 * ⚠️ LE DÉPÔT VIT ICI PARCE QUE LA FILE EST LA PORTE D'ENTRÉE DES FACTURES.
	 * Sans factures, le produit ne mesure rien : tout l'écran attend ce geste.
	 *
	 * ⚠️ ET ON NE NAVIGUE PLUS VERS LE SUIVI. La rangée datée du dépôt apparaît
	 * dans la file dès que la lecture commence et change d'étape sous les yeux
	 * (règle d'écran n° 2) : quitter l'écran pour la regarder serait revenir au
	 * défaut qu'on vient de supprimer.
	 */
	async function deposer(fichiers: File[]) {
		for (const fichier of fichiers) {
			const url = await genererUrl({});
			const reponse = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': fichier.type || 'application/octet-stream' },
				body: fichier
			});
			if (!reponse.ok) throw new Error(`L’envoi de ${fichier.name} a échoué.`);

			const { storageId } = (await reponse.json()) as { storageId: Id<'_storage'> };
			await enregistrer({
				storageId,
				filename: fichier.name,
				mimeType: fichier.type || 'application/octet-stream',
				// Un export comptable se reconnaît à son extension ; le reste est une
				// facture déposée. Plus rien à choisir avant l'envoi.
				mode: /\.(csv|txt|tsv|xml)$/i.test(fichier.name) ? 'EXPORT_COMPTABLE' : 'FACTURE_DEPOSEE'
			});
		}
	}

	// ── L'ADRESSE ────────────────────────────────────────────────────────────

	/**
	 * OUVRIR UNE LIGNE, C'EST ÉCRIRE L'ADRESSE — et la refermer, l'effacer.
	 *
	 * ⚠️ OUVRIR UNE AUTRE LIGNE REPART DE LA POSITION ET DES SECTIONS PAR DÉFAUT.
	 * Les garder ferait ouvrir le dossier suivant sur « Conversation » parce qu'on
	 * lisait la conversation du précédent — c'est-à-dire sur une page qui n'a rien
	 * à voir avec ce qu'on vient de toucher.
	 */
	const ouvrirLigne = (id: string) =>
		void navigate({ to: '/app', search: id === ligne ? {} : { ligne: id } });

	/**
	 * LA CRÉANCE QUE `?ligne=` DÉSIGNE.
	 *
	 * ⚠️ UNE RANGÉE VISE TANTÔT UNE CRÉANCE, TANTÔT UN CLIENT, et c'est la
	 * SURVEILLANCE qui le décide. La résolution se fait ici, à un seul endroit,
	 * pour que l'adresse continue de porter l'identifiant de la rangée qu'on a
	 * touchée : le surlignage et la preuve désignent alors la même chose.
	 *
	 * `null` quand l'identifiant ne mène à aucun dossier — une adresse ancienne, un
	 * client sans créance constituée. La rangée reste surlignée, et le volet ne
	 * s'ouvre pas : on ne montre pas un dossier qui n'existe pas, et on ne dit pas
	 * « ce dossier ne s'est pas lu », ce qui serait faux.
	 */
	const creanceOuverte =
		ligne === undefined
			? null
			: estUneCreance.has(ligne)
				? (ligne as Id<'creances'>)
				: ((creanceDuDebiteur.get(ligne) ?? null) as Id<'creances'> | null);

	const valeur: FileAffichee = {
		tete: {
			total: revelation.total,
			nombreFactures: revelation.nombreFactures,
			// Les TROIS parts, jamais `supplement` — qui est déjà la somme des deux
			// dernières et les compterait deux fois. Voir `ui/composition.tsx`.
			parts: {
				principal: revelation.principal,
				interets: revelation.interets,
				indemnites: revelation.indemnites
			},
			nonChiffrees: revelation.nonChiffrees,
			prescriptionSousPreavis,
			clientsConcernes: (debiteurs ?? []).length,
			clientsSousPreavis: sousPreavis.size
		},
		rangees,
		clients,
		sansIdentifiant,
		optionsSecteur: OPTIONS_SECTEUR,
		facturesPortent: {
			revelation,
			bilan,
			hypotheses: flux.hypotheses,
			anglesMorts: flux.anglesMorts
		},
		travaux,
		/**
		 * ⚠️ `undefined` NE COMPTE PAS COMME « MANQUANT ». Tant que les requêtes
		 * chargent, on ne sait pas si le profil existe : afficher « votre identité
		 * de créancier manque » le temps d'un aller-retour ferait clignoter un
		 * reproche à chaque ouverture, et on apprend à ignorer ce qui clignote.
		 */
		verrous:
			profil === undefined || debiteurs === undefined
				? []
				: ceQuiManque({
						// Le SIREN est ce qui compte : c'est lui qui porte `estCommercant`,
						// donc la condition « entre commerçants ».
						profilCreancierComplet: profil !== null && profil.siren !== undefined,
						nombreFactures: revelation.nombreFactures,
						debiteursSansSiren: debiteurs.filter((d) => d.siren === undefined).length
					}),
		ligneOuverte: ligne ?? null,
		onOuvrirLigne: ouvrirLigne,
		onFermerLigne: () => void navigate({ to: '/app', search: {} }),
		onFichiers: (fichiers) => void deposer(fichiers),
		accepteFichiers: '.csv,.txt,.pdf,image/*',
		/*
		  LES QUATRE SURFACES DE LA BARRE MORTE. Chacune est isolée : sans session
		  — au chargement, après une expiration, dans la salle d'exposition — la
		  requête lève, et un ornement ne doit jamais emporter l'écran de travail.
		*/
		avatar: (
			<Facultatif>
				<AvatarConnecte />
			</Facultatif>
		),
		veilleur: (
			<Facultatif>
				<VeilleurPresent />
			</Facultatif>
		),
		selecteur: (
			<Facultatif>
				<SelecteurEtablissement />
			</Facultatif>
		),
		palette: (
			<Facultatif>
				<Recherche />
			</Facultatif>
		),
		/**
		 * LE VOLET DE PREUVE — deux volets au-delà de 1024 px (règle d'écran n° 3).
		 *
		 * ⚠️ ABSENT QUAND AUCUNE LIGNE N'EST OUVERTE, et c'est délibéré. `PageEcran`
		 * ne pose deux volets que si celui-ci existe : le monter en permanence
		 * laisserait la moitié droite de l'écran vide sur une file qu'on parcourt,
		 * c'est-à-dire un cadran à zéro de plus.
		 *
		 * ⚠️ ET LE MONTER À LA DEMANDE EST AUSSI CE QUI BORNE LE COÛT : le volet
		 * porte douze requêtes de dossier, et un composant démonté ne demande rien.
		 */
		...(creanceOuverte === null
			? {}
			: {
					preuve: (
						<Facultatif>
							<VoletBranche
								// ⚠️ REMONTÉ À CHAQUE LIGNE. Sans clé, l'état local du volet — les
								// deux recherches de répertoire, la question en cours — survivrait
								// au changement de dossier : on lirait des candidats trouvés pour
								// un autre client, et une question tapée pour un autre dossier.
								key={creanceOuverte}
								creanceId={creanceOuverte}
								position={position ?? 'PIECE'}
								onPosition={(suivante) =>
									void navigate({
										to: '/app',
										search: (actuelle) => ({ ...actuelle, position: suivante })
									})
								}
								sectionsDansLAdresse={
									sections === undefined
										? null
										: sections === ''
											? []
											: (sections.split(',') as SectionVolet[])
								}
								onSectionsOuvertes={(ouvertes) =>
									void navigate({
										to: '/app',
										search: (actuelle) => ({ ...actuelle, sections: ouvertes.join(',') })
									})
								}
								onFermer={() => void navigate({ to: '/app', search: {} })}
							/>
						</Facultatif>
					)
				})
	};

	return <EcranFile donnees={{ etat: 'pret', valeur }} />;
}
