import { useCallback, useEffect, useRef, useState } from 'react';
import { createFileRoute, Outlet, useChildMatches, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranImport, modeDuFichier } from '../../screens/import/depots';
import type { EnvoiAffiche } from '../../screens/import/envois';

export const Route = createFileRoute('/app/import-factures')({
	component: ImportFactures,
	errorComponent: ImportEnErreur
});

function ImportEnErreur() {
	return <EcranImport donnees={{ etat: 'erreur' }} detail={null} depotOuvert={null} />;
}

/** Un fichier en route, et le `File` qu'il faudra renvoyer si l'envoi échoue. */
interface EnvoiPiste extends EnvoiAffiche {
	readonly fichier: File;
}

/**
 * L'ENVOI D'UN FICHIER, DE BOUT EN BOUT ET AVEC SON AVANCEMENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI `XMLHttpRequest` ET NON `fetch`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `fetch` ne publie AUCUN événement de progression sur le corps qu'il envoie.
 * Avec lui, un FEC de quarante mégaoctets ne peut afficher qu'un rond qui
 * tourne — et c'est exactement ce qui fait douter : le gérant ne distingue pas
 * « c'est long » de « c'est bloqué », et finit par relancer un envoi qui
 * marchait. `XMLHttpRequest` reste, en 2026, la seule façon standard d'obtenir
 * les octets déjà partis.
 *
 * C'est la règle d'écran n° 2 au seul endroit du produit où le gérant attend :
 * la progression s'affiche sans qu'on la demande.
 */
function envoyerAuStockage(
	url: string,
	fichier: File,
	onAvancement: (part: number) => void
): Promise<Id<'_storage'>> {
	return new Promise((resoudre, rejeter) => {
		const requete = new XMLHttpRequest();
		requete.open('POST', url);
		requete.setRequestHeader('Content-Type', fichier.type || 'application/octet-stream');

		requete.upload.addEventListener('progress', (evenement) => {
			// ⚠️ `lengthComputable` FAUX EXISTE : derrière certains mandataires, la
			// taille totale n'est pas connue. On n'invente alors pas d'avancement —
			// une barre qui bouge sans mesurer est pire qu'aucune barre.
			if (evenement.lengthComputable && evenement.total > 0) {
				onAvancement(evenement.loaded / evenement.total);
			}
		});

		requete.addEventListener('load', () => {
			if (requete.status < 200 || requete.status >= 300) {
				rejeter(new Error(`L’envoi a été refusé par le stockage (code ${requete.status}).`));
				return;
			}
			try {
				const { storageId } = JSON.parse(requete.responseText) as { storageId: Id<'_storage'> };
				resoudre(storageId);
			} catch {
				rejeter(new Error('Le stockage a répondu quelque chose d’illisible.'));
			}
		});
		requete.addEventListener('error', () =>
			rejeter(new Error('L’envoi n’a pas abouti : vérifiez votre connexion.'))
		);
		requete.addEventListener('abort', () => rejeter(new Error('L’envoi a été interrompu.')));

		requete.send(fichier);
	});
}

/** L'import, branché sur la base ; le dessin vit dans `screens/import/`. */
function ImportFactures() {
	/**
	 * LES FICHIERS EN ROUTE, UN PAR UN.
	 *
	 * ⚠️ C'ÉTAIT UN SEUL BOOLÉEN, ET C'EST LE DÉFAUT CENTRAL DE CET ÉCRAN.
	 * `envoiEnCours` valait pour tout un lot : cinq fichiers lâchés affichaient
	 * une phrase, et l'échec du troisième laissait ignorer ce qu'étaient devenus
	 * les quatre autres. Pire — voir `deposer` — la boucle s'arrêtait au premier
	 * échec, donc les suivants ne partaient jamais, en silence.
	 */
	const [envois, setEnvois] = useState<readonly EnvoiPiste[]>([]);
	const navigate = useNavigate();

	/**
	 * ⚠️ UN COMPTEUR, PAS `crypto.randomUUID()`. Le rendu serveur et le rendu
	 * client doivent produire la même chose ; et surtout, deux dépôts du même
	 * fichier doivent porter deux clés — sans quoi React réutilise la rangée de
	 * l'un pour l'autre et l'avancement du second s'affiche sur l'échec du
	 * premier.
	 */
	const prochaineCle = useRef(0);

	/** Vrai quand la route ouvre le bilan d'un dépôt, rendu à droite par l'`Outlet`. */
	const bilanOuvert = useChildMatches({ select: (enfants) => enfants.length > 0 });
	/**
	 * LE DÉPÔT OUVERT, LU SUR LA FEUILLE.
	 *
	 * ⚠️ PAS `useParams({ strict: false })`, QUI REND LES PARAMÈTRES DE LA
	 * CORRESPONDANCE LA PLUS PROCHE, c'est-à-dire ceux de cette route-ci, qui n'en
	 * a aucun. `depotOuvert` valait donc toujours `null` : sous 1024 px le volet
	 * droit restait fermé, et toucher une rangée ramenait la liste.
	 */
	const depotOuvert = useChildMatches({
		select: (enfants) => (enfants.at(-1)?.params as { id?: string } | undefined)?.id ?? null
	});

	const imports = useQuery(api.recouvrement.depotMutations.listerImports, {});
	const genererUrl = useMutation(api.recouvrement.depotMutations.genererUrlDepot);
	const enregistrer = useMutation(api.recouvrement.depotMutations.enregistrerFichier);

	/**
	 * ⚠️ FERMER L'ONGLET PENDANT UN ENVOI PERD LE FICHIER, EN SILENCE.
	 *
	 * Ce qui n'est pas encore arrivé au stockage n'existe nulle part : ni en
	 * base, ni sur le serveur. Le navigateur est le seul à pouvoir prévenir, et
	 * il ne le fait que si on le lui demande. Sans ce garde-fou, un gérant qui
	 * ferme son onglet pendant l'envoi d'un FEC croit son import fait.
	 *
	 * ⚠️ IL NE SE POSE QUE PENDANT UN ENVOI. Un écouteur permanent ferait
	 * apparaître la demande de confirmation du navigateur sur un écran où il n'y
	 * a rien à perdre, ce qui apprend à cliquer « quitter » sans lire.
	 *
	 * Un échec ne compte pas : le fichier est toujours sur le disque du gérant,
	 * et sa rangée porte le geste pour le renvoyer.
	 */
	const enRoute = envois.some((envoi) => envoi.etat !== 'ECHEC');
	useEffect(() => {
		if (!enRoute) return;
		const prevenir = (evenement: BeforeUnloadEvent) => evenement.preventDefault();
		window.addEventListener('beforeunload', prevenir);
		return () => window.removeEventListener('beforeunload', prevenir);
	}, [enRoute]);

	const majEnvoi = useCallback((cle: string, champs: Partial<EnvoiAffiche>) => {
		setEnvois((liste) =>
			liste.map((envoi) => (envoi.cle === cle ? { ...envoi, ...champs } : envoi))
		);
	}, []);

	/**
	 * UN FICHIER, DE L'URL D'ENVOI À LA LIGNE EN BASE.
	 *
	 * Rend l'identifiant du dépôt créé, ou `null` si quelque chose a cédé — et
	 * dans ce cas la rangée RESTE, en échec, avec sa raison et son geste. C'est
	 * la différence de fond avec la version précédente : un échec ne fait plus
	 * disparaître le fichier de l'écran.
	 */
	const porter = useCallback(
		async (envoi: EnvoiPiste): Promise<Id<'importsRecouvrement'> | null> => {
			majEnvoi(envoi.cle, { etat: 'ENVOI', avancement: 0, erreur: undefined });
			try {
				const url = await genererUrl({});
				const storageId = await envoyerAuStockage(url, envoi.fichier, (part) =>
					majEnvoi(envoi.cle, { avancement: part })
				);

				const importId = await enregistrer({
					storageId,
					filename: envoi.fichier.name,
					mimeType: envoi.fichier.type || 'application/octet-stream',
					// Le chemin se déduit du fichier : plus rien à choisir avant l'envoi.
					mode: modeDuFichier(envoi.fichier)
				});

				// ⚠️ LA RANGÉE NE PART QU'UNE FOIS LE DÉPÔT EN BASE. La mutation ne
				// rend la main qu'après écriture, et la requête de liste est réactive :
				// la rangée de dépôt a donc déjà pris le relais quand celle-ci s'efface.
				setEnvois((liste) => liste.filter((autre) => autre.cle !== envoi.cle));
				return importId;
			} catch (erreur) {
				majEnvoi(envoi.cle, {
					etat: 'ECHEC',
					avancement: undefined,
					// Le message est celui que l'envoi a composé : il doit se LIRE.
					erreur: erreur instanceof Error ? erreur.message : 'L’envoi a échoué.'
				});
				return null;
			}
		},
		[genererUrl, enregistrer, majEnvoi]
	);

	/**
	 * LE LÂCHER : DES RANGÉES D'ABORD, LE RÉSEAU ENSUITE.
	 *
	 * ⚠️ LES RANGÉES EXISTENT AVANT LE PREMIER OCTET. C'est ce qui rend le geste
	 * irréversible à l'œil : cinq fichiers lâchés, cinq rangées, on les compte.
	 *
	 * ⚠️ ET UN ÉCHEC N'ARRÊTE PLUS LE LOT. La version précédente enveloppait
	 * toute la boucle dans un `try` : le troisième fichier qui cède emportait le
	 * quatrième et le cinquième, qui ne partaient jamais — sans qu'aucune ligne
	 * de l'écran ne le dise. Chaque fichier a maintenant son sort et sa rangée.
	 *
	 * ⚠️ ET LA NAVIGATION VIENT APRÈS LA BOUCLE, JAMAIS DEDANS. Un seul fichier
	 * ouvre son bilan — la page y est réactive et passe seule de l'étape au
	 * bilan. À plusieurs, aucune page ne les représente tous, et la liste reste
	 * le bon endroit.
	 */
	const deposer = useCallback(
		async (fichiers: File[]) => {
			/**
			 * ⚠️ LU AVANT D'AJOUTER LE LOT, et c'est tout le raisonnement. Partir
			 * vers une page de détail alors que d'autres fichiers sont à l'écran
			 * cacherait leurs rangées sous 1024 px, là où le volet maître disparaît.
			 * `deposer` est appelé depuis un gestionnaire d'événement : `envois` y
			 * porte donc bien ce que l'écran affiche à l'instant du lâcher.
			 */
			const ecranVide = envois.length === 0;

			const lot: EnvoiPiste[] = fichiers.map((fichier) => {
				const cle = `envoi-${prochaineCle.current++}`;
				return {
					cle,
					nom: fichier.name,
					taille: fichier.size,
					etat: 'ATTENTE',
					fichier
				};
			});
			setEnvois((liste) => [...lot, ...liste]);

			/**
			 * ⚠️ UN SEUL FICHIER À LA FOIS, SÉQUENTIELLEMENT. En parallèle, dix FEC
			 * se partageraient la bande passante et les dix avanceraient à dix pour
			 * cent pendant dix minutes — un écran qui bouge partout et ne finit
			 * nulle part. L'un après l'autre, chaque rangée se termine.
			 */
			let premier: Id<'importsRecouvrement'> | null = null;
			for (const envoi of lot) {
				const importId = await porter(envoi);
				premier ??= importId;
			}

			/**
			 * ⚠️ APRÈS LA BOUCLE, JAMAIS DEDANS : naviguer au premier tour
			 * démonterait l'écran, et les fichiers suivants ne partiraient pas.
			 *
			 * Un seul fichier, arrivé, sur un écran qui n'avait rien d'autre : le
			 * bilan s'ouvre, et il passe seul de l'étape au bilan sans rechargement.
			 * À plusieurs, aucune page ne les représente tous, et la liste reste le
			 * bon endroit.
			 */
			if (lot.length !== 1 || premier === null || !ecranVide) return;
			await navigate({ to: '/app/import-factures/$id', params: { id: premier } });
		},
		[envois, porter, navigate]
	);

	/**
	 * LE QUATRIÈME CHEMIN D'ENTRÉE — LE COLLAGE — ÉTAIT MORT, ET MESURÉ TEL.
	 *
	 * ═══════════════════════════════════════════════════════════════════════
	 *
	 * `ZoneDepot` documente quatre façons de verser un fichier : photographier,
	 * parcourir, glisser-déposer, et COLLER. Elle porte bien un `onPaste`, mais
	 * sur un `<div>` (`SurfaceCut`) qui n'est pas focalisable : `tabIndex` y
	 * vaut -1. Or un événement de collage vise l'élément FOCALISÉ et remonte de
	 * là. À l'ouverture de l'écran, le focus est sur `<body>` : l'événement ne
	 * traverse jamais la zone.
	 *
	 * Vérifié au navigateur plutôt que raisonné : un `paste` émis depuis `body`
	 * n'atteint pas la zone ; le même émis depuis un bouton DANS la zone
	 * l'atteint. Le chemin ne marchait donc que pour qui avait déjà cliqué sur
	 * « Choisir des fichiers » — c'est-à-dire pour personne.
	 *
	 * ⚠️ LE CORRECTIF DE FOND EST DANS `ui/zone-depot.tsx`, qui sert aussi les
	 * pièces d'un dossier, et ce chantier ne touche pas à ce fichier. L'écouteur
	 * est donc posé ici, sur la fenêtre, le temps que la zone soit corrigée une
	 * fois pour ses deux appelants.
	 *
	 * ⚠️ IL NE PREND QUE DES FICHIERS. Un collage de texte — dans un champ de
	 * recherche, n'importe où sur l'écran — rend une liste de fichiers vide et
	 * ne déclenche rien.
	 */
	useEffect(() => {
		const coller = (evenement: ClipboardEvent) => {
			const fichiers = [...(evenement.clipboardData?.files ?? [])];
			if (fichiers.length === 0) return;
			evenement.preventDefault();
			void deposer(fichiers);
		};
		window.addEventListener('paste', coller);
		return () => window.removeEventListener('paste', coller);
	}, [deposer]);

	/** Renvoie UN fichier, celui que sa rangée nomme. */
	const reessayer = useCallback(
		(cle: string) => {
			const envoi = envois.find((autre) => autre.cle === cle);
			if (envoi === undefined) return;
			void porter(envoi);
		},
		[envois, porter]
	);

	return (
		<EcranImport
			detail={bilanOuvert ? <Outlet /> : null}
			depotOuvert={depotOuvert}
			donnees={
				imports === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								imports,
								envois,
								onDeposer: (fichiers) => void deposer(fichiers),
								onReessayer: reessayer
							}
						}
			}
		/>
	);
}
