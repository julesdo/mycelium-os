import { useEffect, useState, type ReactNode } from 'react';
import type { Id } from '../lib/convex/_generated/dataModel';
import { useDepotAuCoffre, type DestinationDuDepot } from './use-coffre';
import { useVisionneuseDuCoffre } from './coffre-en-place';
import { messageDeLaPanne } from './gestes-plume';
import {
	documentDepuisFichier,
	documentDepuisResume,
	type DocumentDuFil,
	type EtapeDeTravail,
	type FichierAuDepot,
	type RefCoffre,
	type ResumeDocument
} from '../ui';

/**
 * UN ÉCHANGE AVEC PLUME, CÔTÉ ÉCRAN — la question, les documents joints, le travail
 * qui se voit, la panne (12/10/2026). Le même pour la conversation d'un dossier et
 * celle de l'établissement : seuls changent la destination des documents, l'action
 * appelée et les étapes que Plume déroule.
 */

/** Une référence du coffre, aux identifiants branchés, pour l'action de Plume. */
export type RefPourPlume =
	| { genre: 'IMPORT'; id: Id<'importsRecouvrement'> }
	| { genre: 'PIECE'; id: Id<'pieces'> };

function versServeur(ref: RefCoffre): RefPourPlume {
	return ref.genre === 'IMPORT'
		? { genre: 'IMPORT', id: ref.id as Id<'importsRecouvrement'> }
		: { genre: 'PIECE', id: ref.id as Id<'pieces'> };
}

/** Le temps qu'une étape reste affichée avant que la suivante commence. */
const CADENCE_DES_ETAPES_MS = 1100;

export function useEchangeAvecPlume({
	destination,
	joindrePossible,
	demanderAuServeur,
	etapes,
	questionDeDepart = ''
}: {
	readonly destination: DestinationDuDepot;
	/** Faux tant que la destination n'est pas connue (le dossier se charge). */
	readonly joindrePossible: boolean;
	/** L'action de Plume : un refus du domaine s'inscrit au fil, seule une panne lève. */
	readonly demanderAuServeur: (
		question: string,
		documents: readonly RefPourPlume[]
	) => Promise<unknown>;
	/** Ce que Plume fait une fois les documents lus : des étapes que le serveur fait vraiment. */
	readonly etapes: readonly string[];
	readonly questionDeDepart?: string;
}): {
	readonly question: string;
	readonly setQuestion: (question: string) => void;
	readonly enCours: boolean;
	readonly panne: string | null;
	readonly demander: (texte: string) => Promise<void>;
	readonly travail: EtapeDeTravail[] | null;
	/** La question qui part, avec ses documents en direct, ou `null`. */
	readonly enAttente: { readonly texte: string; readonly documents: DocumentDuFil[] } | null;
	/** Les documents d'une question passée, qui s'ouvrent d'un toucher. */
	readonly documentsDuTour: (
		tourId: string,
		documents: readonly { readonly nom: string; readonly resume: ResumeDocument | null }[]
	) => DocumentDuFil[];
	readonly pieces:
		| {
				readonly fichiers: readonly FichierAuDepot[];
				readonly onJoindre: (fichiers: File[]) => void;
				readonly onRetirer: (cle: string) => void;
				readonly accept: string;
		  }
		| undefined;
	readonly visionneuse: ReactNode;
} {
	const [question, setQuestion] = useState(questionDeDepart);
	const [envoyee, setEnvoyee] = useState<{
		readonly texte: string;
		readonly avecDocuments: boolean;
	} | null>(null);
	const [panne, setPanne] = useState<string | null>(null);
	const [etape, setEtape] = useState(0);
	const enCours = envoyee !== null;

	const depot = useDepotAuCoffre(destination);
	const { ouvrirDocument, visionneuse } = useVisionneuseDuCoffre();
	const envoyes = depot.fichiers.filter(
		(f) => f.phase === 'ENVOI' || f.phase === 'COFFRE' || f.phase === 'ECHEC_ENVOI'
	);
	const auCoffre = envoyes.every((f) => f.phase !== 'ENVOI');
	const lectureFinie =
		envoyee?.avecDocuments !== true ||
		(auCoffre &&
			envoyes.every(
				(f) => f.phase !== 'COFFRE' || (f.suivi !== undefined && f.suivi.etat !== 'EN_COURS')
			));

	async function demander(texte: string) {
		const posee = texte.trim();
		const avecDocuments = depot.fichiers.some((f) => f.phase === 'PRET');
		if ((posee === '' && !avecDocuments) || envoyee !== null) return;
		setPanne(null);
		setEtape(0);
		setEnvoyee({ texte: posee, avecDocuments });
		setQuestion('');
		try {
			const documents = avecDocuments ? await depot.envoyer() : [];
			if (posee === '' && documents.length === 0) {
				setPanne('Aucun document n’a pu partir au coffre.');
				return;
			}
			await demanderAuServeur(posee, documents.map(versServeur));
		} catch (e) {
			// Une panne de transport n'est pas un refus du domaine : elle se dit telle quelle.
			setPanne(messageDeLaPanne(e));
		} finally {
			setEnvoyee(null);
			// Les documents sont au coffre, et dans le fil : le compositeur se vide.
			if (avecDocuments) depot.onRecommencer();
		}
	}

	/*
	  LE RYTHME DES ÉTAPES, PENDANT QUE PLUME TRAVAILLE — une fois les documents lus,
	  s'il y en a. L'état ne change que dans le rappel de l'horloge, jamais dans le
	  corps de l'effet.
	*/
	useEffect(() => {
		if (!enCours || !lectureFinie) return;
		let rang = 0;
		const horloge = window.setInterval(() => {
			rang += 1;
			setEtape(rang);
		}, CADENCE_DES_ETAPES_MS);
		return () => window.clearInterval(horloge);
	}, [enCours, lectureFinie]);

	/*
	  AVEC DES DOCUMENTS, DEUX ÉTAPES DE PLUS, ET ELLES SONT VRAIES : l'arrivée au
	  coffre et la lecture se cochent sur ce que le serveur publie, pas sur l'horloge.
	*/
	const nDocuments = envoyes.length;
	const etapesDesDocuments: EtapeDeTravail[] =
		envoyee?.avecDocuments === true
			? [
					{
						libelle: `Je mets ${nDocuments > 1 ? `${nDocuments} documents` : 'le document'} au coffre`,
						etat: auCoffre ? 'faite' : 'courante'
					},
					{
						libelle: nDocuments > 1 ? 'Je les lis' : 'Je le lis',
						etat: lectureFinie ? 'faite' : auCoffre ? 'courante' : 'avenir'
					}
				]
			: [];
	const derniere = etapes.length - 1;
	const travail: EtapeDeTravail[] | null = enCours
		? [
				...etapesDesDocuments,
				...etapes.map(
					(libelle, i): EtapeDeTravail => ({
						libelle,
						etat: !lectureFinie
							? 'avenir'
							: i < Math.min(etape, derniere)
								? 'faite'
								: i === Math.min(etape, derniere)
									? 'courante'
									: 'avenir'
					})
				)
			]
		: null;

	return {
		question,
		setQuestion,
		enCours,
		panne,
		demander,
		travail,
		enAttente:
			envoyee === null
				? null
				: {
						texte: envoyee.texte,
						documents: envoyee.avecDocuments ? envoyes.map(documentDepuisFichier) : []
					},
		documentsDuTour: (tourId, documents) =>
			documents.map((document, rang) => {
				const lu = document.resume;
				return documentDepuisResume(
					`${tourId}-${rang}`,
					document.nom,
					lu,
					lu === null ? undefined : () => ouvrirDocument(lu.ref)
				);
			}),
		pieces: joindrePossible
			? {
					fichiers: depot.fichiers,
					onJoindre: depot.onAjouter,
					onRetirer: depot.onRetirer,
					accept: depot.accept
				}
			: undefined,
		visionneuse
	};
}
