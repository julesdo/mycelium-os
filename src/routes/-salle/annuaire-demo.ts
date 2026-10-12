import { useState } from 'react';
import {
	distanceDepuis,
	proDAvocat,
	proDEtude,
	proDuCarnet,
	type AnnuaireDuParcours,
	type AvocatProposeAffiche,
	type EtudeProposee,
	type FicheIntervenant,
	type ProfessionCherchee,
	type ProPropose,
	type RequeteAffichee,
	type ResultatsAffiches
} from '../../ui';
import {
	AVOCATS_DEMO,
	AVOCATS_PRES_DEMO,
	CARNET_DEMO,
	CLIENT_DEMO,
	ETUDES_DEMO,
	LIEU_DEMO,
	SOURCE_AVOCATS_DEMO
} from './communes';

/**
 * L'ANNUAIRE DE LA SALLE — le parcours du choix sur de vraies fiches publiques,
 * sans aucune base.
 *
 * « Près de Fournitures Durand » montre les études du 44 et les avocats de
 * Nantes ; « Toute la France » cherche, par nom ou par ville, dans ces mêmes
 * fiches et dans les trois avocats de Bordeaux. Rien ne se pagine : la salle a
 * moins de fiches qu'une page.
 */

const PORTEE_CLIENT = 'client:demo';
const DEPUIS = { client: CLIENT_DEMO, ...LIEU_DEMO };

function plat(texte: string): string {
	return texte
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

function correspond(morceaux: readonly (string | undefined)[], texte: string): boolean {
	const dans = plat(morceaux.filter((m) => m !== undefined).join(' '));
	return plat(texte)
		.split(/\s+/)
		.filter((mot) => mot !== '')
		.every((mot) => dans.includes(mot));
}

function versAvocat(
	avocat: AvocatProposeAffiche,
	carnet: readonly FicheIntervenant<string>[]
): ProPropose {
	const nom = `${avocat.prenom} ${avocat.nom}`.trim();
	const fiche = carnet.find((f) => f.role === 'AVOCAT' && f.nom === nom);
	if (fiche !== undefined) {
		return {
			pro: proDuCarnet(fiche),
			origine: { genre: 'CARNET', id: fiche._id },
			dansLEquipe: true
		};
	}
	return {
		pro: proDAvocat(avocat, AVOCATS_PRES_DEMO.releveeLe),
		origine: {
			genre: 'AVOCAT',
			avocat,
			source: SOURCE_AVOCATS_DEMO,
			releveeLe: AVOCATS_PRES_DEMO.releveeLe
		},
		dansLEquipe: false
	};
}

function versEtude(
	etude: EtudeProposee,
	carnet: readonly FicheIntervenant<string>[],
	pres: boolean
): ProPropose {
	const distance = pres ? distanceDepuis(DEPUIS, etude) : undefined;
	const fiche = carnet.find((f) => f.role === 'COMMISSAIRE_DE_JUSTICE' && f.siren === etude.siren);
	if (fiche !== undefined) {
		return {
			pro: proDuCarnet(fiche),
			origine: { genre: 'CARNET', id: fiche._id },
			dansLEquipe: true,
			...(distance === undefined ? {} : { distance })
		};
	}
	return {
		pro: proDEtude(etude, ETUDES_DEMO.releveeLe),
		origine: {
			genre: 'ETUDE',
			etude,
			source: ETUDES_DEMO.source,
			releveeLe: ETUDES_DEMO.releveeLe
		},
		dansLEquipe: false,
		...(distance === undefined ? {} : { distance })
	};
}

const MENTION_AVOCATS =
	'Annuaire national des avocats (Conseil national des barreaux), relevé du 23 sept. 2026 : une fiche peut décrire une situation périmée, et une spécialité absente veut dire « non déclarée ».';
const MENTION_ETUDES =
	'Études : registre des entreprises, relevé du 12 sept. 2026. Ce n’est pas le tableau de la profession : une étude qui n’a pas déclaré sa convention collective n’y figure pas.';

function resultats(
	profession: ProfessionCherchee,
	requete: RequeteAffichee,
	carnet: readonly FicheIntervenant<string>[]
): ResultatsAffiches {
	const texte = requete.texte.trim();
	const pres = requete.portee === PORTEE_CLIENT;
	if (profession === 'AVOCAT') {
		if (pres && texte === '') {
			return {
				etat: 'PRET',
				groupes: [
					{
						cle: 'proches',
						titre: 'Spécialité déclarée proche',
						precision:
							'Ont déclaré au fichier national le droit commercial, ou les sûretés et mesures d’exécution.',
						pros: AVOCATS_PRES_DEMO.proches.map((a) => versAvocat(a, carnet))
					},
					{
						cle: 'autres',
						titre: 'Les autres, par ordre alphabétique',
						precision: 'NANTES (44)',
						pros: AVOCATS_PRES_DEMO.autres.map((a) => versAvocat(a, carnet))
					}
				],
				peutCharger: false,
				chargeEncore: false,
				mention: MENTION_AVOCATS
			};
		}
		if (texte === '') {
			return {
				etat: 'A_SAISIR',
				message:
					'Tapez le nom d’un avocat, d’un cabinet ou d’une ville pour chercher dans toute la France.'
			};
		}
		const tous = [
			...AVOCATS_PRES_DEMO.proches,
			...AVOCATS_PRES_DEMO.autres,
			...(pres ? [] : AVOCATS_DEMO)
		];
		return {
			etat: 'PRET',
			groupes: [
				{
					cle: 'resultats',
					titre: 'Résultats',
					pros: tous
						.filter((a) =>
							correspond(
								[a.prenom, a.nom, a.raisonSociale, a.ville, a.codePostal, a.barreau],
								texte
							)
						)
						.map((a) => versAvocat(a, carnet))
				}
			],
			peutCharger: false,
			chargeEncore: false,
			mention: MENTION_AVOCATS
		};
	}
	if (!pres && texte.length < 2) {
		return {
			etat: 'A_SAISIR',
			message: 'Tapez le nom d’une étude ou d’une ville pour chercher dans toute la France.'
		};
	}
	const etudes = ETUDES_DEMO.etudes.filter((e) =>
		correspond([e.nom, e.commune, e.codePostal], texte)
	);
	return {
		etat: 'PRET',
		groupes: [
			{
				cle: 'etudes',
				titre: pres && texte === '' ? `Près de ${CLIENT_DEMO}` : 'Résultats',
				precision: pres
					? `NANTES (44) · ${etudes.length} étude${etudes.length > 1 ? 's' : ''}`
					: `${etudes.length} étude${etudes.length > 1 ? 's' : ''} au registre`,
				pros: etudes.map((e) => versEtude(e, carnet, pres))
			}
		],
		peutCharger: false,
		chargeEncore: false,
		mention: MENTION_ETUDES,
		...(pres ? { depuis: DEPUIS } : {})
	};
}

/** Retenir, dans la salle : chaque choisi rend sa clé, rien ne s'écrit. */
const retenir = (choisis: readonly ProPropose[]) =>
	Promise.resolve(choisis.map((c) => (c.origine.genre === 'CARNET' ? c.origine.id : c.pro.cle)));

const PORTEES_DOSSIER = [
	{ cle: PORTEE_CLIENT, libelle: `Près de ${CLIENT_DEMO}` },
	{ cle: 'FRANCE', libelle: 'Toute la France' }
];

/** L'annuaire figé des écrans de la salle (dossier, décompte) : il ne cherche pas. */
export function annuaireFige(
	carnet: readonly FicheIntervenant<string>[] = CARNET_DEMO
): AnnuaireDuParcours {
	const requete = { texte: '', portee: PORTEE_CLIENT };
	return {
		portees: PORTEES_DOSSIER,
		requetes: { AVOCAT: requete, COMMISSAIRE_DE_JUSTICE: requete },
		onRequete: () => undefined,
		resultats: {
			AVOCAT: resultats('AVOCAT', requete, carnet),
			COMMISSAIRE_DE_JUSTICE: resultats('COMMISSAIRE_DE_JUSTICE', requete, carnet)
		},
		onChargerPlus: () => undefined,
		onDemander: () => undefined,
		retenir,
		enCours: false,
		erreur: null
	};
}

/** L'annuaire vivant de la salle : la recherche et le lieu répondent, sur les fiches de démonstration. */
export function useAnnuaireDemo({
	carnet = CARNET_DEMO,
	clients
}: {
	readonly carnet?: readonly FicheIntervenant<string>[];
	/** Pour l'écran « Défense » : des pastilles de lieu par client. */
	readonly clients?: readonly { readonly id: string; readonly nom: string }[];
} = {}): AnnuaireDuParcours {
	const premier = clients?.[0];
	const parDefaut =
		clients === undefined
			? PORTEE_CLIENT
			: premier === undefined
				? 'FRANCE'
				: `client:${premier.id}`;
	const [requetes, setRequetes] = useState<Record<ProfessionCherchee, RequeteAffichee>>({
		AVOCAT: { texte: '', portee: parDefaut },
		COMMISSAIRE_DE_JUSTICE: { texte: '', portee: parDefaut }
	});
	// Toutes les pastilles de client mènent au même lieu de démonstration.
	const versDemo = (r: RequeteAffichee): RequeteAffichee =>
		r.portee.startsWith('client:') ? { ...r, portee: PORTEE_CLIENT } : r;
	return {
		portees:
			clients === undefined
				? PORTEES_DOSSIER
				: [
						...clients.map((c) => ({ cle: `client:${c.id}`, libelle: `Près de ${c.nom}` })),
						{ cle: 'FRANCE', libelle: 'Toute la France' }
					],
		requetes,
		onRequete: (profession, requete) => setRequetes((r) => ({ ...r, [profession]: requete })),
		resultats: {
			AVOCAT: resultats('AVOCAT', versDemo(requetes.AVOCAT), carnet),
			COMMISSAIRE_DE_JUSTICE: resultats(
				'COMMISSAIRE_DE_JUSTICE',
				versDemo(requetes.COMMISSAIRE_DE_JUSTICE),
				carnet
			)
		},
		onChargerPlus: () => undefined,
		onDemander: (portee) => {
			if (portee === undefined) return;
			setRequetes((r) => ({
				AVOCAT: { ...r.AVOCAT, portee },
				COMMISSAIRE_DE_JUSTICE: { ...r.COMMISSAIRE_DE_JUSTICE, portee }
			}));
		},
		retenir,
		enCours: false,
		erreur: null
	};
}
