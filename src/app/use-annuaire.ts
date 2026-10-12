import { useRef, useState } from 'react';
import { useAction, useMutation, usePaginatedQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from './donnees';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import {
	distanceDepuis,
	proDAvocat,
	proDEtude,
	proDuCarnet,
	type AnnuaireDuParcours,
	type AvocatProposeAffiche,
	type Depuis,
	type EtudeProposee,
	type FicheIntervenant,
	type PorteeAffichee,
	type ProfessionCherchee,
	type ProPropose,
	type RequeteAffichee,
	type ResultatsAffiches
} from '../ui';
import { dateCourte } from '../ui/format';

/**
 * L'ANNUAIRE DU PARCOURS DU CHOIX (12/10/2026) — ce que `ParcoursProfessionnels`
 * lit, construit UNE fois pour le dossier, la page du décompte et l'écran
 * « Défense ».
 *
 * ⚠️ RIEN NE PART AVANT QU'ON LE DEMANDE. Le lieu du client se lit au registre
 * quand le parcours s'ouvre (`onDemander`), et les avocats ne s'abonnent qu'après :
 * ouvrir la page d'un dossier ne coûte aucune lecture d'annuaire.
 *
 * ⚠️ UNE REQUÊTE PAR PROFESSION. Taper « Dupont » dans les avocats ne vide pas la
 * recherche des commissaires, et le lieu choisi pour l'un ne bouge pas pour
 * l'autre.
 *
 * ⚠️ LA FRAPPE EST TEMPORISÉE (300 ms), dans le gestionnaire et non dans un effet :
 * chaque lettre met le champ à jour tout de suite, et seule la pause lance la
 * recherche.
 */

type SecteurDuClient = FunctionReturnType<typeof api.recouvrement.annuaires.secteurDuClient>;
type AvocatDuSecteur = FunctionReturnType<
	typeof api.recouvrement.annuaires.avocatsDuSecteur
>['page'][number];

type SecteurLu =
	| { readonly etat: 'CHARGEMENT' }
	| { readonly etat: 'ECHEC'; readonly message: string }
	| { readonly etat: 'PRET'; readonly secteur: SecteurDuClient };

/** Les études de toute la France pour un texte, page après page. */
interface EtudesFrance {
	readonly cle: string;
	readonly etudes: readonly EtudeProposee[];
	readonly page: number;
	readonly pages: number;
	readonly total: number;
	readonly enCours: boolean;
	readonly echec: string | null;
	readonly source: string;
	readonly releveeLe: string;
}

const FRANCE: PorteeAffichee = { cle: 'FRANCE', libelle: 'Toute la France' };
const PREFIXE_CLIENT = 'client:';
const ETUDES_PAR_PAGE = 20;
const ATTENTE_FRAPPE_MS = 300;

/** Le message d'un refus : `ConvexError` le porte dans `data`, pas dans `message`. */
function messageDuRefus(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'L’opération n’a pas abouti.';
}

/** Les mots tapés se retrouvent-ils tous dans le nom ou la commune de l'étude ? */
function etudeCorrespond(etude: EtudeProposee, texte: string): boolean {
	const plat = (s: string) =>
		s
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase();
	const dans = plat(`${etude.nom} ${etude.commune} ${etude.codePostal}`);
	return plat(texte)
		.split(/\s+/)
		.filter((mot) => mot !== '')
		.every((mot) => dans.includes(mot));
}

/** « Le lieu de Durand n'est pas connu… » : un fait, et le chemin qui en sort. */
function lieuInconnu(client: string): ResultatsAffiches {
	return {
		etat: 'A_SAISIR',
		message: `Le lieu de ${client} n’est pas connu : son SIREN, sur sa fiche, le donnera. En attendant, cherchez par nom dans toute la France.`
	};
}

export function useAnnuaire({
	debiteurId,
	clients = [],
	carnet
}: {
	/** Le client du dossier : la recherche part près de lui. */
	readonly debiteurId?: Id<'debiteurs'> | undefined;
	/** Pour l'écran « Défense » : un lieu par client en cours. */
	readonly clients?: readonly { readonly id: string; readonly nom: string }[];
	readonly carnet: readonly FicheIntervenant<string>[] | undefined;
}): AnnuaireDuParcours {
	const lireSecteur = useAction(api.recouvrement.annuaires.secteurDuClient);
	const chercherEtudes = useAction(api.recouvrement.annuaires.etudesParNom);
	const ajouterIntervenant = useMutation(api.recouvrement.intervenants.ajouterIntervenant);

	// Près du client du dossier ; pour l'équipe, près du premier client en cours :
	// le parcours s'ouvre sur des professionnels, pas sur un champ vide.
	const premierClient = clients[0]?.id;
	const porteeParDefaut =
		debiteurId !== undefined
			? `${PREFIXE_CLIENT}${debiteurId}`
			: premierClient === undefined
				? FRANCE.cle
				: `${PREFIXE_CLIENT}${premierClient}`;
	const [demande, setDemande] = useState(false);
	const [secteurs, setSecteurs] = useState<Readonly<Record<string, SecteurLu>>>({});
	const [requetes, setRequetes] = useState<Record<ProfessionCherchee, RequeteAffichee>>({
		AVOCAT: { texte: '', portee: porteeParDefaut },
		COMMISSAIRE_DE_JUSTICE: { texte: '', portee: porteeParDefaut }
	});
	const [lances, setLances] = useState<Record<ProfessionCherchee, string>>({
		AVOCAT: '',
		COMMISSAIRE_DE_JUSTICE: ''
	});
	const minuteurs = useRef<Partial<Record<ProfessionCherchee, ReturnType<typeof setTimeout>>>>({});
	const [etudesFrance, setEtudesFrance] = useState<EtudesFrance | null>(null);
	const [montrees, setMontrees] = useState<{ readonly cle: string; readonly n: number }>({
		cle: '',
		n: ETUDES_PAR_PAGE
	});
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	/*
	  ⚠️ LA PORTÉE PAR DÉFAUT SUIT LE DOSSIER. La route monte ce crochet avant de
	  connaître son client : la requête initiale partait sur « Toute la France ».
	  On la recale au rendu, sans effet, tant que le gérant n'a rien choisi.
	*/
	const [porteeVue, setPorteeVue] = useState(porteeParDefaut);
	if (porteeVue !== porteeParDefaut) {
		setPorteeVue(porteeParDefaut);
		setRequetes((avant) => ({
			AVOCAT:
				avant.AVOCAT.portee === porteeVue
					? { ...avant.AVOCAT, portee: porteeParDefaut }
					: avant.AVOCAT,
			COMMISSAIRE_DE_JUSTICE:
				avant.COMMISSAIRE_DE_JUSTICE.portee === porteeVue
					? { ...avant.COMMISSAIRE_DE_JUSTICE, portee: porteeParDefaut }
					: avant.COMMISSAIRE_DE_JUSTICE
		}));
	}

	function lire(id: string) {
		const deja = secteurs[id];
		if (deja !== undefined && deja.etat !== 'ECHEC') return;
		setSecteurs((avant) => ({ ...avant, [id]: { etat: 'CHARGEMENT' } }));
		lireSecteur({ debiteurId: id as Id<'debiteurs'> })
			.then((secteur) => setSecteurs((avant) => ({ ...avant, [id]: { etat: 'PRET', secteur } })))
			.catch((e: unknown) =>
				setSecteurs((avant) => ({ ...avant, [id]: { etat: 'ECHEC', message: messageDuRefus(e) } }))
			);
	}

	function lancerFrance(texte: string, page = 1) {
		if (texte.length < 2) return;
		setEtudesFrance((avant) =>
			page > 1 && avant !== null && avant.cle === texte
				? { ...avant, enCours: true }
				: {
						cle: texte,
						etudes: [],
						page: 0,
						pages: 1,
						total: 0,
						enCours: true,
						echec: null,
						source: '',
						releveeLe: ''
					}
		);
		chercherEtudes({ recherche: texte, page })
			.then((lu) =>
				setEtudesFrance((avant) =>
					avant === null || avant.cle !== texte
						? avant
						: {
								cle: texte,
								etudes: page === 1 ? lu.etudes : [...avant.etudes, ...lu.etudes],
								page: lu.page,
								pages: lu.pages,
								total: lu.total,
								enCours: false,
								echec: null,
								source: lu.source,
								releveeLe: lu.releveeLe
							}
				)
			)
			.catch((e: unknown) =>
				setEtudesFrance((avant) =>
					avant === null || avant.cle !== texte
						? avant
						: { ...avant, enCours: false, echec: messageDuRefus(e) }
				)
			);
	}

	/* ── Le lieu de chaque profession ─────────────────────────────────────── */

	const secteurDe = (profession: ProfessionCherchee): SecteurLu | 'FRANCE' => {
		const portee = requetes[profession].portee;
		if (!portee.startsWith(PREFIXE_CLIENT)) return 'FRANCE';
		return secteurs[portee.slice(PREFIXE_CLIENT.length)] ?? { etat: 'CHARGEMENT' };
	};
	const depuisDe = (secteur: SecteurLu | 'FRANCE'): Depuis | undefined => {
		if (secteur === 'FRANCE' || secteur.etat !== 'PRET') return undefined;
		const lieu = secteur.secteur.lieu;
		return lieu?.latitude === undefined || lieu.longitude === undefined
			? undefined
			: { client: secteur.secteur.client, latitude: lieu.latitude, longitude: lieu.longitude };
	};

	/* ── Les avocats : trois lectures paginées, deux toujours sautées ─────── */

	const secteurAvocat = secteurDe('AVOCAT');
	const departementAvocat =
		secteurAvocat !== 'FRANCE' && secteurAvocat.etat === 'PRET'
			? (secteurAvocat.secteur.lieu?.prefixePostal ?? null)
			: null;
	const texteAvocat = lances.AVOCAT;
	const peutChercherAvocat = demande && (secteurAvocat === 'FRANCE' || departementAvocat !== null);
	const recherche = usePaginatedQuery(
		api.recouvrement.annuaires.avocatsDuSecteur,
		peutChercherAvocat && texteAvocat !== ''
			? {
					recherche: texteAvocat,
					...(departementAvocat === null ? {} : { departement: departementAvocat })
				}
			: 'skip',
		{ initialNumItems: 20 }
	);
	const proches = usePaginatedQuery(
		api.recouvrement.annuaires.avocatsDuSecteur,
		demande && texteAvocat === '' && departementAvocat !== null
			? { departement: departementAvocat, specialiteProche: 'SEULEMENT' as const }
			: 'skip',
		{ initialNumItems: 30 }
	);
	const autres = usePaginatedQuery(
		api.recouvrement.annuaires.avocatsDuSecteur,
		demande && texteAvocat === '' && departementAvocat !== null
			? { departement: departementAvocat, specialiteProche: 'SANS' as const }
			: 'skip',
		{ initialNumItems: 20 }
	);
	const sourceAvocats = useQuery(
		api.recouvrement.annuaires.sourceDesAvocats,
		demande ? {} : 'skip'
	);

	const versProAvocat = (avocat: AvocatDuSecteur): ProPropose => {
		const nom = `${avocat.prenom} ${avocat.nom}`.trim();
		const fiche = carnet?.find(
			(f) => f.role === 'AVOCAT' && f.nom === nom && f.ressort === avocat.barreau
		);
		if (fiche !== undefined) {
			return {
				pro: proDuCarnet(fiche),
				origine: { genre: 'CARNET', id: fiche._id },
				dansLEquipe: true
			};
		}
		const affiche: AvocatProposeAffiche = avocat;
		return {
			pro: proDAvocat(affiche, avocat.releveeLe),
			origine: {
				genre: 'AVOCAT',
				avocat: affiche,
				source:
					sourceAvocats?.source ?? 'Annuaire national des avocats (Conseil national des barreaux)',
				releveeLe: avocat.releveeLe
			},
			dansLEquipe: false
		};
	};

	const mentionAvocats = `Annuaire national des avocats (Conseil national des barreaux)${
		sourceAvocats?.releveeLe === undefined || sourceAvocats.releveeLe === null
			? ''
			: `, relevé du ${dateCourte(sourceAvocats.releveeLe)}`
	} : une fiche peut décrire une situation périmée, et une spécialité absente veut dire « non déclarée ».`;

	const resultatsAvocats = ((): ResultatsAffiches => {
		if (secteurAvocat !== 'FRANCE') {
			if (secteurAvocat.etat === 'CHARGEMENT') return { etat: 'CHARGEMENT' };
			if (secteurAvocat.etat === 'ECHEC') return { etat: 'ECHEC', message: secteurAvocat.message };
			if (departementAvocat === null) return lieuInconnu(secteurAvocat.secteur.client);
		}
		if (texteAvocat !== '') {
			if (recherche.status === 'LoadingFirstPage') return { etat: 'CHARGEMENT' };
			return {
				etat: 'PRET',
				groupes: [
					{ cle: 'resultats', titre: 'Résultats', pros: recherche.results.map(versProAvocat) }
				],
				peutCharger: recherche.status === 'CanLoadMore',
				chargeEncore: recherche.status === 'LoadingMore',
				mention: mentionAvocats
			};
		}
		if (secteurAvocat === 'FRANCE' || secteurAvocat.etat !== 'PRET') {
			return {
				etat: 'A_SAISIR',
				message:
					'Tapez le nom d’un avocat, d’un cabinet ou d’une ville pour chercher dans toute la France.'
			};
		}
		if (proches.status === 'LoadingFirstPage' || autres.status === 'LoadingFirstPage') {
			return { etat: 'CHARGEMENT' };
		}
		const { client, lieu } = secteurAvocat.secteur;
		const ou =
			lieu?.commune === null || lieu?.commune === undefined
				? `département ${lieu?.departement ?? ''}`
				: `${lieu.commune} (${lieu.departement})`;
		return {
			etat: 'PRET',
			groupes: [
				{
					cle: 'proches',
					titre: 'Spécialité déclarée proche',
					precision:
						'Ont déclaré au fichier national le droit commercial, ou les sûretés et mesures d’exécution.',
					pros: proches.results.map(versProAvocat),
					...(proches.status === 'CanLoadMore' ? { onPlus: () => proches.loadMore(30) } : {})
				},
				{
					cle: 'autres',
					titre:
						proches.results.length === 0
							? `Près de ${client}`
							: 'Les autres, par ordre alphabétique',
					precision: ou,
					pros: autres.results.map(versProAvocat)
				}
			],
			peutCharger: autres.status === 'CanLoadMore',
			chargeEncore: autres.status === 'LoadingMore',
			mention: mentionAvocats
		};
	})();

	/* ── Les commissaires : le département du client, ou toute la France ─── */

	const secteurCommissaire = secteurDe('COMMISSAIRE_DE_JUSTICE');
	const texteCommissaire = lances.COMMISSAIRE_DE_JUSTICE;
	const depuisCommissaire = depuisDe(secteurCommissaire);
	const cleMontrees = `${requetes.COMMISSAIRE_DE_JUSTICE.portee}|${texteCommissaire}`;
	const nMontrees = montrees.cle === cleMontrees ? montrees.n : ETUDES_PAR_PAGE;

	const versProEtude = (etude: EtudeProposee, source: string, releveeLe: string): ProPropose => {
		const distance = distanceDepuis(depuisCommissaire, etude);
		const fiche = carnet?.find(
			(f) => f.role === 'COMMISSAIRE_DE_JUSTICE' && f.siren === etude.siren
		);
		if (fiche !== undefined) {
			return {
				pro: proDuCarnet(fiche),
				origine: { genre: 'CARNET', id: fiche._id },
				dansLEquipe: true,
				...(distance === undefined ? {} : { distance })
			};
		}
		return {
			pro: proDEtude(etude, releveeLe),
			origine: { genre: 'ETUDE', etude, source, releveeLe },
			dansLEquipe: false,
			...(distance === undefined ? {} : { distance })
		};
	};

	const mentionEtudes = (releveeLe: string) =>
		`Études : registre des entreprises, relevé du ${dateCourte(releveeLe)}. Ce n’est pas le tableau de la profession : une étude qui n’a pas déclaré sa convention collective n’y figure pas.`;

	const resultatsCommissaires = ((): ResultatsAffiches => {
		if (secteurCommissaire === 'FRANCE') {
			if (texteCommissaire.length < 2) {
				return {
					etat: 'A_SAISIR',
					message: 'Tapez le nom d’une étude ou d’une ville pour chercher dans toute la France.'
				};
			}
			if (etudesFrance === null || etudesFrance.cle !== texteCommissaire)
				return { etat: 'CHARGEMENT' };
			if (etudesFrance.echec !== null && etudesFrance.etudes.length === 0) {
				return { etat: 'ECHEC', message: etudesFrance.echec };
			}
			if (etudesFrance.page === 0) return { etat: 'CHARGEMENT' };
			return {
				etat: 'PRET',
				groupes: [
					{
						cle: 'france',
						titre: 'Résultats',
						precision: `${etudesFrance.total} étude${etudesFrance.total > 1 ? 's' : ''} au registre`,
						pros: etudesFrance.etudes.map((e) =>
							versProEtude(e, etudesFrance.source, etudesFrance.releveeLe)
						)
					}
				],
				peutCharger: etudesFrance.page < etudesFrance.pages && !etudesFrance.enCours,
				chargeEncore: etudesFrance.enCours,
				mention: mentionEtudes(etudesFrance.releveeLe)
			};
		}
		if (secteurCommissaire.etat === 'CHARGEMENT') return { etat: 'CHARGEMENT' };
		if (secteurCommissaire.etat === 'ECHEC')
			return { etat: 'ECHEC', message: secteurCommissaire.message };
		const { client, lieu, commissaires } = secteurCommissaire.secteur;
		if (lieu === null || commissaires === null) return lieuInconnu(client);
		if (commissaires.etat === 'ECHEC') return { etat: 'ECHEC', message: commissaires.message };
		const { etudes, source, releveeLe } = commissaires.resultat;
		const retenues = etudes.filter((e) => etudeCorrespond(e, texteCommissaire));
		const ou =
			lieu.commune === null
				? `département ${lieu.departement}`
				: `${lieu.commune} (${lieu.departement})`;
		return {
			etat: 'PRET',
			groupes: [
				{
					cle: 'etudes',
					titre: texteCommissaire === '' ? `Près de ${client}` : 'Résultats',
					precision: `${ou} · ${retenues.length} étude${retenues.length > 1 ? 's' : ''}`,
					pros: retenues.slice(0, nMontrees).map((e) => versProEtude(e, source, releveeLe))
				}
			],
			peutCharger: nMontrees < retenues.length,
			chargeEncore: false,
			mention: mentionEtudes(releveeLe),
			...(depuisCommissaire === undefined ? {} : { depuis: depuisCommissaire })
		};
	})();

	/* ── Les portées proposées ────────────────────────────────────────────── */

	const nomDuClient = (id: string): string | undefined => {
		const lu = secteurs[id];
		return lu?.etat === 'PRET' ? lu.secteur.client : clients.find((c) => c.id === id)?.nom;
	};
	const portees: readonly PorteeAffichee[] =
		debiteurId === undefined
			? [
					...clients.map((c) => ({ cle: `${PREFIXE_CLIENT}${c.id}`, libelle: `Près de ${c.nom}` })),
					FRANCE
				]
			: [
					{
						cle: `${PREFIXE_CLIENT}${debiteurId}`,
						libelle: `Près de ${nomDuClient(debiteurId) ?? 'votre client'}`
					},
					FRANCE
				];

	/* ── Les gestes ───────────────────────────────────────────────────────── */

	function onRequete(profession: ProfessionCherchee, requete: RequeteAffichee) {
		const avant = requetes[profession];
		setRequetes((r) => ({ ...r, [profession]: requete }));

		if (requete.portee !== avant.portee) {
			if (requete.portee.startsWith(PREFIXE_CLIENT))
				lire(requete.portee.slice(PREFIXE_CLIENT.length));
			const texte = requete.texte.trim();
			if (profession === 'COMMISSAIRE_DE_JUSTICE' && requete.portee === FRANCE.cle) {
				lancerFrance(texte);
			}
		}
		if (requete.texte !== avant.texte) {
			const precedent = minuteurs.current[profession];
			if (precedent !== undefined) clearTimeout(precedent);
			minuteurs.current[profession] = setTimeout(() => {
				const texte = requete.texte.trim();
				setLances((l) => ({ ...l, [profession]: texte }));
				if (profession === 'COMMISSAIRE_DE_JUSTICE' && requete.portee === FRANCE.cle) {
					lancerFrance(texte);
				}
			}, ATTENTE_FRAPPE_MS);
		}
	}

	function onChargerPlus(profession: ProfessionCherchee) {
		if (profession === 'AVOCAT') {
			if (texteAvocat !== '') {
				if (recherche.status === 'CanLoadMore') recherche.loadMore(20);
			} else if (autres.status === 'CanLoadMore') {
				autres.loadMore(20);
			}
			return;
		}
		if (secteurCommissaire === 'FRANCE') {
			if (
				etudesFrance !== null &&
				etudesFrance.cle === texteCommissaire &&
				!etudesFrance.enCours &&
				etudesFrance.page < etudesFrance.pages
			) {
				lancerFrance(texteCommissaire, etudesFrance.page + 1);
			}
			return;
		}
		setMontrees({ cle: cleMontrees, n: nMontrees + ETUDES_PAR_PAGE });
	}

	/** Ajoute au carnet ce qui n'y est pas encore, et rend tous les identifiants. */
	async function retenir(choisis: readonly ProPropose[]): Promise<readonly string[] | null> {
		setEnCours(true);
		setErreur(null);
		try {
			const ids: string[] = [];
			for (const choisi of choisis) {
				const origine = choisi.origine;
				switch (origine.genre) {
					case 'CARNET':
						ids.push(origine.id);
						break;
					case 'ETUDE': {
						const { etude } = origine;
						const deja = carnet?.find(
							(f) => f.role === 'COMMISSAIRE_DE_JUSTICE' && f.siren === etude.siren
						);
						ids.push(
							deja?._id ??
								(await ajouterIntervenant({
									nom: etude.nom,
									role: 'COMMISSAIRE_DE_JUSTICE',
									ressort: `${etude.commune} ${etude.codePostal}`.trim(),
									adresse: etude.adresse,
									siren: etude.siren,
									origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
									sourceRepertoire: origine.source,
									sourceReleveeLe: origine.releveeLe
								}))
						);
						break;
					}
					case 'AVOCAT': {
						const { avocat } = origine;
						const nom = `${avocat.prenom} ${avocat.nom}`.trim();
						const deja = carnet?.find(
							(f) => f.role === 'AVOCAT' && f.nom === nom && f.ressort === avocat.barreau
						);
						ids.push(
							deja?._id ??
								(await ajouterIntervenant({
									nom,
									// Le ressort est le BARREAU, tel que le fichier l'écrit : c'est lui,
									// pas la commune, qui dit devant quelle juridiction il plaide.
									ressort: avocat.barreau,
									role: 'AVOCAT',
									adresse: [
										avocat.adresse,
										`${avocat.codePostal ?? ''} ${avocat.ville ?? ''}`.trim()
									]
										.filter((morceau) => morceau !== undefined && morceau !== '')
										.join(', '),
									siren: avocat.siren,
									origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
									sourceRepertoire: origine.source,
									sourceReleveeLe: origine.releveeLe
								}))
						);
						break;
					}
					case 'SAISIE':
						ids.push(
							await ajouterIntervenant({
								nom: origine.fiche.nom,
								role: origine.fiche.role,
								ressort: origine.fiche.ressort,
								origine: 'SAISI_A_LA_MAIN'
							})
						);
						break;
				}
			}
			return ids;
		} catch (e) {
			setErreur(messageDuRefus(e));
			return null;
		} finally {
			setEnCours(false);
		}
	}

	return {
		portees,
		requetes,
		onRequete,
		resultats: { AVOCAT: resultatsAvocats, COMMISSAIRE_DE_JUSTICE: resultatsCommissaires },
		onChargerPlus,
		onDemander: (portee) => {
			setDemande(true);
			setErreur(null);
			if (portee !== undefined) {
				setRequetes((r) => ({
					AVOCAT: { ...r.AVOCAT, portee },
					COMMISSAIRE_DE_JUSTICE: { ...r.COMMISSAIRE_DE_JUSTICE, portee }
				}));
				if (portee.startsWith(PREFIXE_CLIENT)) lire(portee.slice(PREFIXE_CLIENT.length));
				return;
			}
			for (const requete of Object.values(requetes)) {
				if (requete.portee.startsWith(PREFIXE_CLIENT))
					lire(requete.portee.slice(PREFIXE_CLIENT.length));
			}
		},
		retenir,
		enCours,
		erreur
	};
}
