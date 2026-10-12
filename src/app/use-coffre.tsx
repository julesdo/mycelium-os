import { useState } from 'react';
import { useConvex, useMutation } from 'convex/react';
import type { UppyFile } from '@uppy/core';
import { useRequeteEphemere } from './donnees';
import { messageDeRefus } from './televerser';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import {
	FORMATS_ACCEPTES,
	FORMATS_EN_CLAIR,
	nomPropre,
	verdictAvantEnvoi
} from '../lib/socle/coffre/fichiers';
import type {
	ContenuOuvert,
	DepotAuCoffre,
	FichierAuDepot,
	RefCoffre,
	ResumeDocument
} from '../ui';
import { SOURCES_CONFIGUREES, SourcesDistantes, nomDeLaSource } from './sources-distantes';
import {
	creerUppyDuCoffre,
	type CorpsCoffre,
	type MetaCoffre,
	type UppyDuCoffre
} from './uppy-coffre';

/**
 * LE COFFRE, CÔTÉ ROUTE (12/10/2026) — le dépôt, l'ouverture, le téléchargement.
 * Voir `docs/superpowers/specs/2026-10-12-coffre-fort.md`.
 *
 *   · AVANT L'ENVOI : le nom et la taille vérifiés, l'empreinte SHA-256 calculée
 *     dans le navigateur et comparée au coffre — un doublon de factures n'est pas
 *     renvoyé ;
 *   · L'ENVOI : Uppy (`uppy-coffre.ts`), vers une adresse à usage unique posée sur
 *     chaque fichier, en HTTPS, avec son avancement réel — depuis l'appareil, ou
 *     depuis un service en ligne par Companion (`sources-distantes.tsx`) ;
 *   · APRÈS : le serveur scelle et lit ; le parcours le regarde en direct.
 *
 * ⚠️ LES ÉCOUTEURS D'UPPY SE POSENT À SA CRÉATION, PAS DANS UN EFFET. Un envoi
 * continue quand on quitte l'écran ; s'il perdait son écouteur en route, le
 * fichier arriverait au stockage sans jamais être confié au coffre — donc sans
 * être scellé ni lu. Ils ne touchent qu'à des fonctions stables (l'état, les
 * mutations), et la destination voyage dans les métadonnées de chaque fichier.
 */

type Destination =
	| { readonly genre: 'FACTURES' }
	| {
			readonly genre: 'PIECES';
			readonly debiteurId?: Id<'debiteurs'>;
			readonly factureIds: readonly Id<'facturesVente'>[];
	  };

type RefServeur =
	| { genre: 'IMPORT'; id: Id<'importsRecouvrement'> }
	| { genre: 'PIECE'; id: Id<'pieces'> };

interface FichierInterne extends Omit<FichierAuDepot, 'suivi'> {
	/** L'identifiant dans Uppy ; absent pour un fichier refusé avant d'y entrer. */
	readonly idUppy?: string;
	readonly ref?: RefServeur;
}

type FichierUppy = UppyFile<MetaCoffre, CorpsCoffre>;

function versServeur(ref: RefCoffre): RefServeur {
	return ref.genre === 'IMPORT'
		? { genre: 'IMPORT', id: ref.id as Id<'importsRecouvrement'> }
		: { genre: 'PIECE', id: ref.id as Id<'pieces'> };
}

async function empreinteDu(contenu: Blob): Promise<string> {
	const condensat = new Uint8Array(
		await crypto.subtle.digest('SHA-256', await contenu.arrayBuffer())
	);
	return Array.from(condensat, (o) => o.toString(16).padStart(2, '0')).join('');
}

function destinationPourLeServeur(destination: Destination) {
	return destination.genre === 'FACTURES'
		? { genre: 'FACTURES' as const }
		: {
				genre: 'PIECES' as const,
				...(destination.debiteurId === undefined ? {} : { debiteurId: destination.debiteurId }),
				factureIds: [...destination.factureIds]
			};
}

export function useDepotAuCoffre(destination: Destination): DepotAuCoffre {
	const convex = useConvex();
	const genererUrl = useMutation(api.coffre.coffre.genererUrlCoffre);
	const confier = useMutation(api.coffre.coffre.confierAuCoffre);
	const [fichiers, setFichiers] = useState<readonly FichierInterne[]>([]);
	const [lance, setLance] = useState(false);

	const modifier = (cle: string, changement: Partial<FichierInterne>) =>
		setFichiers((avant) => avant.map((f) => (f.cle === cle ? { ...f, ...changement } : f)));

	// UNE instance par écran, avec ses écouteurs posés une fois (voir plus haut).
	const [uppy] = useState<UppyDuCoffre>(() => {
		const instance = creerUppyDuCoffre();
		const changer = (cle: string, changement: Partial<FichierInterne>) =>
			setFichiers((avant) => avant.map((f) => (f.cle === cle ? { ...f, ...changement } : f)));

		// Un fichier d'un service en ligne entre ici ; ceux de l'appareil sont
		// accueillis par `ajouter`, qui les a déjà vérifiés.
		instance.on('file-added', (fichier: FichierUppy) => {
			if (!fichier.isRemote) return;
			const nom = nomPropre(fichier.name ?? 'document');
			const taille = fichier.size ?? 0;
			const verdict = verdictAvantEnvoi(nom, taille);
			const source = nomDeLaSource(fichier.source);
			if (!verdict.accepte) {
				instance.removeFile(fichier.id);
				setFichiers((avant) => [
					...avant,
					{
						cle: fichier.id,
						nom,
						taille,
						mime: fichier.type ?? '',
						phase: 'REFUSE',
						message: verdict.raison,
						...(source === undefined ? {} : { source })
					}
				]);
				return;
			}
			instance.setFileMeta(fichier.id, { mimeVerifie: verdict.mime });
			setFichiers((avant) => [
				...avant,
				{
					cle: fichier.id,
					idUppy: fichier.id,
					nom,
					taille,
					mime: verdict.mime,
					phase: 'PRET',
					...(source === undefined ? {} : { source })
				}
			]);
		});
		instance.on('upload-progress', (fichier, avancement) => {
			if (fichier === undefined) return;
			const total = avancement.bytesTotal;
			if (typeof total === 'number' && total > 0) {
				changer(fichier.id, { avancement: avancement.bytesUploaded / total });
			}
		});
		instance.on('upload-success', (fichier, reponse) => {
			if (fichier === undefined) return;
			const storageId = reponse.body?.storageId;
			const meta = fichier.meta;
			if (storageId === undefined || meta.destination === undefined) {
				changer(fichier.id, {
					phase: 'ECHEC_ENVOI',
					message: 'La réponse de l’envoi est illisible.'
				});
				return;
			}
			confier({
				storageId: storageId as Id<'_storage'>,
				nom: nomPropre(fichier.name ?? 'document'),
				destination: JSON.parse(meta.destination) as ReturnType<typeof destinationPourLeServeur>
			}).then(
				(ref) => changer(fichier.id, { phase: 'COFFRE', ref }),
				(erreur: unknown) =>
					changer(fichier.id, { phase: 'ECHEC_ENVOI', message: messageDeRefus(erreur) })
			);
		});
		instance.on('upload-error', (fichier, erreur) => {
			if (fichier === undefined) return;
			changer(fichier.id, {
				phase: 'ECHEC_ENVOI',
				message:
					erreur.message === '' || /network/i.test(erreur.message)
						? 'L’envoi n’a pas abouti : vérifiez votre connexion, puis renvoyez.'
						: erreur.message
			});
		});
		return instance;
	});

	const refs = fichiers.flatMap((f) => (f.ref === undefined ? [] : [f.ref]));
	const suivi = useRequeteEphemere(
		api.coffre.coffre.suivreLeDepot,
		refs.length === 0 ? 'skip' : { documents: refs }
	);
	const suiviParCle = new Map<string, ResumeDocument>(
		(suivi ?? []).map((resume) => [`${resume.ref.genre}:${resume.ref.id}`, resume])
	);

	/** Les fichiers de l'appareil : vérifiés, empreints, puis confiés à Uppy. */
	async function ajouter(nouveaux: File[]) {
		const meta: MetaCoffre = {
			destination: JSON.stringify(destinationPourLeServeur(destination))
		};
		const entres: FichierInterne[] = [];
		for (const fichier of nouveaux) {
			const nom = nomPropre(fichier.name);
			const verdict = verdictAvantEnvoi(nom, fichier.size);
			if (!verdict.accepte) {
				entres.push({
					cle: `refus-${crypto.randomUUID()}`,
					nom,
					taille: fichier.size,
					mime: fichier.type,
					phase: 'REFUSE',
					message: verdict.raison
				});
				continue;
			}
			let idUppy: string;
			try {
				idUppy = uppy.addFile({
					name: nom,
					type: verdict.mime,
					data: fichier,
					source: 'Local',
					meta: { ...meta, mimeVerifie: verdict.mime }
				});
			} catch {
				// Le même fichier, déjà dans ce dépôt : il n'y entre pas deux fois.
				continue;
			}
			entres.push({
				cle: idUppy,
				idUppy,
				nom,
				taille: fichier.size,
				mime: verdict.mime,
				phase: 'VERIFICATION'
			});
		}
		setFichiers((avant) => [...avant, ...entres]);

		const aVerifier = entres.filter((f) => f.phase === 'VERIFICATION' && f.idUppy !== undefined);
		const empreintes = await Promise.all(
			aVerifier.map((f) => empreinteDu(uppy.getFile(f.idUppy ?? '').data as Blob))
		);
		let deja: { empreinte: string; nom: string; deposeLe: number }[] = [];
		try {
			deja = await convex.query(api.coffre.coffre.dejaAuCoffre, { empreintes });
		} catch {
			// Sans réponse, on n'invente pas de doublon : le serveur retrouvera l'empreinte.
		}
		aVerifier.forEach((f, i) => {
			const trouve = deja.find((d) => d.empreinte === empreintes[i]);
			// Des factures déjà au coffre ne se relisent pas ; une pièce, elle, peut
			// soutenir un autre dossier.
			const doublon = trouve !== undefined && destination.genre === 'FACTURES';
			if (doublon && f.idUppy !== undefined) uppy.removeFile(f.idUppy);
			modifier(f.cle, {
				...(trouve === undefined ? {} : { deja: { nom: trouve.nom, deposeLe: trouve.deposeLe } }),
				phase: doublon ? 'DEJA' : 'PRET'
			});
		});
	}

	/** Une adresse d'envoi à usage unique, posée sur le fichier juste avant son envoi. */
	async function preparer(fichier: FichierInterne): Promise<boolean> {
		if (fichier.idUppy === undefined) return false;
		try {
			const adresse = await genererUrl({});
			uppy.setFileState(fichier.idUppy, { xhrUpload: { endpoint: adresse } });
			// La destination des fichiers d'un service en ligne, posée ici : ils
			// sont entrés par Uppy, pas par `ajouter`.
			if (uppy.getFile(fichier.idUppy).meta.destination === undefined) {
				uppy.setFileMeta(fichier.idUppy, {
					destination: JSON.stringify(destinationPourLeServeur(destination))
				});
			}
			modifier(fichier.cle, { phase: 'ENVOI', avancement: 0 });
			return true;
		} catch (erreur) {
			modifier(fichier.cle, { phase: 'ECHEC_ENVOI', message: messageDeRefus(erreur) });
			return false;
		}
	}

	async function lancer() {
		setLance(true);
		const prets = fichiers.filter((f) => f.phase === 'PRET');
		const prepares = await Promise.all(prets.map(preparer));
		// Ce qui n'a pas reçu d'adresse ne part pas avec les autres.
		prets.forEach((f, i) => {
			if (!prepares[i] && f.idUppy !== undefined) uppy.removeFile(f.idUppy);
		});
		if (prepares.some(Boolean)) void uppy.upload();
	}

	return {
		fichiers: fichiers.map((f) => {
			// Ni l'identifiant d'Uppy ni la référence serveur ne sortent vers l'écran.
			const affiche: FichierAuDepot = {
				cle: f.cle,
				nom: f.nom,
				taille: f.taille,
				mime: f.mime,
				phase: f.phase,
				...(f.avancement === undefined ? {} : { avancement: f.avancement }),
				...(f.message === undefined ? {} : { message: f.message }),
				...(f.deja === undefined ? {} : { deja: f.deja }),
				...(f.source === undefined ? {} : { source: f.source })
			};
			const resume =
				f.ref === undefined ? undefined : suiviParCle.get(`${f.ref.genre}:${f.ref.id}`);
			return resume === undefined ? affiche : { ...affiche, suivi: resume };
		}),
		onAjouter: (nouveaux) => void ajouter(nouveaux),
		onRetirer: (cle) => {
			const fichier = fichiers.find((f) => f.cle === cle);
			if (fichier?.idUppy !== undefined && uppy.getFile(fichier.idUppy) !== undefined) {
				uppy.removeFile(fichier.idUppy);
			}
			setFichiers((avant) => avant.filter((f) => f.cle !== cle));
		},
		onLancer: () => void lancer(),
		onReessayer: (cle) => {
			const fichier = fichiers.find((f) => f.cle === cle);
			if (fichier?.idUppy === undefined) return;
			const idUppy = fichier.idUppy;
			void preparer(fichier).then((pret) => {
				if (pret) void uppy.retryUpload(idUppy);
			});
		},
		onRecommencer: () => {
			uppy.cancelAll();
			setFichiers([]);
			setLance(false);
		},
		lance,
		accept: FORMATS_ACCEPTES,
		formats: FORMATS_EN_CLAIR,
		...(SOURCES_CONFIGUREES.length === 0 ? {} : { sources: <SourcesDistantes uppy={uppy} /> })
	};
}

/**
 * OUVRIR ET TÉLÉCHARGER UN DOCUMENT DU COFFRE — un jeton d'une minute, consommé
 * une fois par l'action HTTP qui déchiffre. Le contenu ne vit qu'en mémoire.
 */
export function useOuvertureCoffre(): {
	readonly ouvrir: (ref: RefCoffre) => Promise<ContenuOuvert>;
	readonly telecharger: (ref: RefCoffre) => void;
} {
	const demander = useMutation(api.coffre.coffre.ouvrirAuCoffre);

	async function lire(
		ref: RefCoffre,
		geste: 'CONSULTATION' | 'TELECHARGEMENT'
	): Promise<ContenuOuvert> {
		let jeton: { jeton: string; adresse: string };
		try {
			jeton = await demander({ ref: versServeur(ref), geste });
		} catch (erreur) {
			throw new Error(messageDeRefus(erreur), { cause: erreur });
		}
		const reponse = await fetch(jeton.adresse, {
			method: 'POST',
			body: jeton.jeton,
			cache: 'no-store'
		});
		if (!reponse.ok) throw new Error(await reponse.text());
		const disposition = reponse.headers.get('Content-Disposition') ?? '';
		const nom = decodeURIComponent(
			/filename\*=UTF-8''([^;]+)/.exec(disposition)?.[1] ?? 'document'
		);
		return {
			octets: await reponse.arrayBuffer(),
			mime: reponse.headers.get('Content-Type') ?? 'application/octet-stream',
			nom
		};
	}

	return {
		ouvrir: (ref) => lire(ref, 'CONSULTATION'),
		telecharger: (ref) => {
			void lire(ref, 'TELECHARGEMENT').then((contenu) => {
				const url = URL.createObjectURL(new Blob([contenu.octets], { type: contenu.mime }));
				const lien = document.createElement('a');
				lien.href = url;
				lien.download = contenu.nom;
				lien.click();
				// Laissé le temps au navigateur de commencer l'enregistrement.
				setTimeout(() => URL.revokeObjectURL(url), 30_000);
			});
		}
	};
}
