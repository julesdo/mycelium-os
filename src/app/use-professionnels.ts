import { useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import type {
	AvocatProposeAffiche,
	EtatDirigeants,
	EtudeProposee,
	ProfessionnelsProposes,
	PropositionsAffichees
} from '../ui';

/** Ce que le carnet doit porter pour qu'on y reconnaisse une fiche déjà retenue. */
interface FicheDuCarnet {
	readonly _id: string;
	readonly nom: string;
	readonly role: 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE' | 'AUTRE';
	readonly ressort?: string;
	readonly siren?: string;
}

/** Le message d'un refus : `ConvexError` le porte dans `data`, pas dans `message`. */
function messageDuRefus(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'L’opération n’a pas abouti.';
}

/**
 * LES PROFESSIONNELS PRÈS DU CLIENT, POUR TOUTE FEUILLE « QUI FAIT L'ACTE ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN CROCHET (01/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La feuille s'ouvre depuis le dossier (« Qui fait l'acte », la déclaration
 * d'une voie) et depuis la page du décompte arrêté (la remise au conseil). La
 * lecture et la retenue en un geste s'écrivent donc une fois, ici, et chaque
 * route n'a qu'à passer l'objet rendu à sa feuille.
 *
 * ⚠️ À LA DEMANDE, PAS AU CHARGEMENT. La lecture interroge le registre des
 * entreprises et l'annuaire des avocats : elle part quand la feuille s'ouvre, se
 * garde ensuite, et un échec se retente à l'ouverture suivante.
 *
 * ⚠️ UNE FICHE DÉJÀ AU CARNET N'Y ENTRE PAS DEUX FOIS. Une étude se reconnaît à
 * son SIREN ; un avocat à son nom et à son barreau, faute d'identifiant propre
 * dans le fichier national.
 */
export function useProfessionnelsProposes(
	debiteurId: Id<'debiteurs'> | undefined,
	carnet: readonly FicheDuCarnet[] | undefined
): ProfessionnelsProposes & {
	/** Lire pour un autre client que celui du dossier : l'écran « Défense » en change. */
	readonly demanderPour: (debiteurId: Id<'debiteurs'>) => void;
} {
	const proposer = useAction(api.recouvrement.annuaires.professionnelsPresDuClient);
	const ajouterIntervenant = useMutation(api.recouvrement.intervenants.ajouterIntervenant);

	/*
	  ⚠️ LA LECTURE PORTE LE CLIENT POUR QUI ELLE A ÉTÉ FAITE. L'écran « Défense »
	  passe d'un client à l'autre : une lecture gardée sans son client montrerait
	  les études de Nantes sous le nom d'un client de Lyon.
	*/
	const [lu, setLu] = useState<{
		readonly pour: Id<'debiteurs'>;
		readonly propositions: PropositionsAffichees;
	} | null>(null);
	const propositions = lu !== null && lu.pour === debiteurId ? lu.propositions : null;
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	function demander(pour: Id<'debiteurs'> | undefined = debiteurId) {
		if (pour === undefined) return;
		if (lu !== null && lu.pour === pour && lu.propositions.etat !== 'ECHEC') return;
		const setPropositions = (propositions: PropositionsAffichees) =>
			setLu((avant) =>
				// Une réponse arrivée après qu'on a changé de client ne remplace pas la lecture en cours.
				avant !== null && avant.pour !== pour && propositions.etat !== 'CHARGEMENT'
					? avant
					: { pour, propositions }
			);
		setPropositions({ etat: 'CHARGEMENT' });
		proposer({ debiteurId: pour })
			.then((lu) => {
				if (lu.lieu === null) {
					setPropositions({ etat: 'LIEU_INCONNU', client: lu.client });
					return;
				}
				setPropositions({
					etat: 'PRET',
					client: lu.client,
					lieu: {
						departement: lu.lieu.departement,
						commune: lu.lieu.commune,
						...(lu.lieu.latitude === undefined || lu.lieu.longitude === undefined
							? {}
							: { latitude: lu.lieu.latitude, longitude: lu.lieu.longitude })
					},
					commissaires:
						lu.commissaires === null
							? {
									etat: 'ECHEC',
									message: 'Le département de votre client n’a pas pu être lu au registre.'
								}
							: lu.commissaires.etat === 'TROUVE'
								? {
										etat: 'TROUVE',
										etudes: lu.commissaires.resultat.etudes,
										source: lu.commissaires.resultat.source,
										releveeLe: lu.commissaires.resultat.releveeLe
									}
								: lu.commissaires,
					avocats: lu.avocats
				});
			})
			.catch((e: unknown) => setPropositions({ etat: 'ECHEC', message: messageDuRefus(e) }));
	}

	/** Ajoute au carnet, en tenant l'état du geste et son éventuel refus. */
	async function ajouter(fiche: Parameters<typeof ajouterIntervenant>[0]): Promise<string | null> {
		setEnCours(true);
		setErreur(null);
		try {
			return await ajouterIntervenant(fiche);
		} catch (e) {
			setErreur(messageDuRefus(e));
			return null;
		} finally {
			setEnCours(false);
		}
	}

	async function retenirEtude(etude: EtudeProposee): Promise<string | null> {
		if (propositions?.etat !== 'PRET' || propositions.commissaires.etat !== 'TROUVE') return null;
		const deja = carnet?.find(
			(fiche) => fiche.role === 'COMMISSAIRE_DE_JUSTICE' && fiche.siren === etude.siren
		);
		if (deja !== undefined) return deja._id;
		const { source, releveeLe } = propositions.commissaires;
		return await ajouter({
			nom: etude.nom,
			role: 'COMMISSAIRE_DE_JUSTICE',
			ressort: `${etude.commune} ${etude.codePostal}`.trim(),
			adresse: etude.adresse,
			siren: etude.siren,
			origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
			sourceRepertoire: source,
			sourceReleveeLe: releveeLe
		});
	}

	async function retenirAvocat(avocat: AvocatProposeAffiche): Promise<string | null> {
		if (propositions?.etat !== 'PRET' || propositions.avocats === null) return null;
		const { source, releveeLe } = propositions.avocats;
		// Sans date de relevé, on ne retient pas : la fiche se présenterait comme
		// relevée aujourd'hui, ce qu'elle n'est pas.
		if (releveeLe === null) return null;
		const nom = `${avocat.prenom} ${avocat.nom}`.trim();
		const deja = carnet?.find(
			(fiche) => fiche.role === 'AVOCAT' && fiche.nom === nom && fiche.ressort === avocat.barreau
		);
		if (deja !== undefined) return deja._id;
		return await ajouter({
			nom,
			role: 'AVOCAT',
			// Le ressort est le BARREAU, tel que le fichier l'écrit : c'est lui, pas
			// la commune, qui dit devant quelle juridiction il plaide.
			ressort: avocat.barreau,
			adresse: [avocat.adresse, `${avocat.codePostal ?? ''} ${avocat.ville ?? ''}`.trim()]
				.filter((morceau) => morceau !== undefined && morceau !== '')
				.join(', '),
			siren: avocat.siren,
			origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
			sourceRepertoire: source,
			sourceReleveeLe: releveeLe
		});
	}

	return {
		propositions: propositions ?? { etat: 'CHARGEMENT' },
		onDemander: () => demander(),
		demanderPour: (pour) => demander(pour),
		onRetenirEtude: retenirEtude,
		onRetenirAvocat: retenirAvocat,
		onAjouter: (fiche) =>
			ajouter({
				nom: fiche.nom,
				role: fiche.role,
				ressort: fiche.ressort,
				origine: 'SAISI_A_LA_MAIN'
			}),
		enCours,
		erreur
	};
}

/**
 * LES DIRIGEANTS DU CLIENT, POUR « QUI SIGNE POUR VOTRE CLIENT » (01/10/2026).
 *
 * Lus au registre d'après le SIREN de sa fiche, à la demande du gérant. Sans
 * SIREN, l'action refuse en le disant, et le refus se lit à la place de la
 * liste : ce n'est pas une liste vide.
 */
export function useDirigeantsDuClient(debiteurId: Id<'debiteurs'> | undefined): {
	readonly etat: EtatDirigeants;
	readonly onDemander: () => void;
} {
	const lire = useAction(api.recouvrement.annuaires.dirigeantsDuClient);
	const [etat, setEtat] = useState<EtatDirigeants>({ phase: 'REPOS' });

	return {
		etat,
		onDemander: () => {
			if (debiteurId === undefined) return;
			setEtat({ phase: 'EN_COURS' });
			lire({ debiteurId })
				.then(({ dirigeants, releveeLe }) => setEtat({ phase: 'TROUVE', dirigeants, releveeLe }))
				.catch((e: unknown) => setEtat({ phase: 'ECHEC', message: messageDuRefus(e) }));
		}
	};
}
