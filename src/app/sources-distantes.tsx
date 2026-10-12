import { useEffect, useState } from 'react';
import type { PartialTreeFile, PartialTreeFolderNode, Uppy } from '@uppy/core';
import { UppyContextProvider, useGooglePicker, useRemoteSource } from '@uppy/react';
import {
	CartesDesSources,
	NavigateurDeSource,
	type ElementDeSource,
	type EtatDeSource
} from '../ui';
import { MEMOIRE_DES_JETONS, type UppyDuCoffre } from './uppy-coffre';

/**
 * LES SERVICES EN LIGNE DU DÉPÔT, BRANCHÉS SUR UPPY (12/10/2026).
 *
 * ⚠️ DORMANTS TANT QUE COMPANION N'EST PAS DÉPLOYÉ. Sans `VITE_COMPANION_URL`,
 * aucune carte ne s'affiche : le dépôt reste ce qu'il était (l'appareil, la
 * photo). Google Drive demande en plus ses trois identifiants publics
 * (`VITE_GOOGLE_PICKER_*`). Voir `serveurs/companion/LISEZMOI.md`.
 *
 * Les greffons ne se chargent qu'à l'ouverture du dépôt, et seulement s'ils sont
 * configurés : ils ne pèsent rien sur un établissement qui ne s'en sert pas.
 */

const COMPANION = (import.meta.env.VITE_COMPANION_URL as string | undefined) || undefined;
const GOOGLE = {
	clientId: (import.meta.env.VITE_GOOGLE_PICKER_CLIENT_ID as string | undefined) || undefined,
	apiKey: (import.meta.env.VITE_GOOGLE_PICKER_API_KEY as string | undefined) || undefined,
	appId: (import.meta.env.VITE_GOOGLE_PICKER_APP_ID as string | undefined) || undefined
};

type CleSource = 'GoogleDrivePicker' | 'Dropbox' | 'OneDrive' | 'Box';
type CleNavigable = Exclude<CleSource, 'GoogleDrivePicker'>;

const NOMS: Readonly<Record<CleSource, string>> = {
	GoogleDrivePicker: 'Google Drive',
	Dropbox: 'Dropbox',
	OneDrive: 'OneDrive',
	Box: 'Box'
};

/** Le nom d'une source, pour dire d'où vient un fichier : « Dropbox ». */
export function nomDeLaSource(source: string | undefined): string | undefined {
	return source !== undefined && source in NOMS ? NOMS[source as CleSource] : undefined;
}

const googleConfigure =
	GOOGLE.clientId !== undefined && GOOGLE.apiKey !== undefined && GOOGLE.appId !== undefined;

/** Les sources que ce déploiement sait ouvrir. Vide sans Companion. */
export const SOURCES_CONFIGUREES: readonly CleSource[] =
	COMPANION === undefined
		? []
		: [...(googleConfigure ? (['GoogleDrivePicker'] as const) : []), 'Dropbox', 'OneDrive', 'Box'];

async function installerLesSources(uppy: UppyDuCoffre): Promise<void> {
	if (COMPANION === undefined) return;
	const commun = { companionUrl: COMPANION, storage: MEMOIRE_DES_JETONS };
	const [{ default: Dropbox }, { default: OneDrive }, { default: Box }] = await Promise.all([
		import('@uppy/dropbox'),
		import('@uppy/onedrive'),
		import('@uppy/box')
	]);
	if (uppy.getPlugin('Dropbox') === undefined) uppy.use(Dropbox, commun);
	if (uppy.getPlugin('OneDrive') === undefined) uppy.use(OneDrive, commun);
	if (uppy.getPlugin('Box') === undefined) uppy.use(Box, commun);
	if (googleConfigure && uppy.getPlugin('GoogleDrivePicker') === undefined) {
		const { default: GoogleDrivePicker } = await import('@uppy/google-drive-picker');
		uppy.use(GoogleDrivePicker, {
			...commun,
			clientId: GOOGLE.clientId ?? '',
			apiKey: GOOGLE.apiKey ?? '',
			appId: GOOGLE.appId ?? ''
		});
	}
}

/** L'état d'une source navigable (Dropbox, OneDrive, Box), dans les mots de l'écran. */
function useEtatDeSource(cle: CleNavigable): EtatDeSource {
	const source = useRemoteSource(cle);
	const { state } = source;
	const elements = state.partialTree.filter(
		(item): item is PartialTreeFile | PartialTreeFolderNode =>
			item.type === 'file' || item.type === 'folder'
	);
	const affiches: ElementDeSource[] = elements.map((item) =>
		item.type === 'folder'
			? {
					id: item.id,
					nom: item.data.name ?? 'Dossier',
					dossier: true,
					coche: item.status === 'checked' ? 'oui' : item.status === 'partial' ? 'partiel' : 'non'
				}
			: {
					id: item.id,
					nom: item.data.name ?? 'Fichier',
					dossier: false,
					coche: item.status === 'checked' ? 'oui' : 'non',
					...(typeof item.data.size === 'number' ? { taille: item.data.size } : {}),
					...(item.data.mimeType ? { mime: item.data.mimeType } : {}),
					...(item.restrictionError === null
						? {}
						: { refus: 'Format ou taille que le coffre n’accepte pas' })
				}
	);
	return {
		connecte: state.authenticated,
		chargement: state.loading !== false,
		...(typeof state.loading === 'string' ? { messageDeChargement: state.loading } : {}),
		...(state.username ? { compte: state.username } : {}),
		...(state.error ? { erreur: state.error } : {}),
		chemin: state.breadcrumbs.map((dossier) => ({
			id: dossier.id,
			nom: dossier.type === 'root' ? NOMS[cle] : (dossier.data.name ?? 'Dossier')
		})),
		elements: affiches,
		choisis: state.selectedAmount,
		onConnecter: () => void source.login(),
		onDeconnecter: () => void source.logout(),
		onOuvrir: (id) => void source.open(id),
		onCocher: (id) => {
			const item = elements.find((e) => e.id === id);
			if (item !== undefined) source.checkbox(item, false);
		},
		onAjouter: () => void source.done()
	};
}

function Navigateur({
	cle,
	onFermer
}: {
	readonly cle: CleNavigable;
	readonly onFermer: () => void;
}) {
	const etat = useEtatDeSource(cle);
	return (
		<NavigateurDeSource
			ouvert
			cle={cle}
			nom={NOMS[cle]}
			etat={{
				...etat,
				// Les fichiers cochés entrent dans le dépôt, et l'on y revient.
				onAjouter: () => {
					etat.onAjouter();
					onFermer();
				}
			}}
			onFermer={onFermer}
		/>
	);
}

interface Selecteur {
	readonly loading: boolean;
	readonly show: () => Promise<void>;
}

/** Les cartes des services ; Google Drive ouvre le sélecteur de Google, les autres le navigateur. */
function CartesDesServices({ picker }: { readonly picker: Selecteur | null }) {
	const [ouverte, setOuverte] = useState<CleNavigable | null>(null);
	return (
		<>
			<CartesDesSources
				sources={SOURCES_CONFIGUREES.filter(
					(cle) => cle !== 'GoogleDrivePicker' || picker !== null
				).map((cle) => ({
					cle,
					nom: NOMS[cle],
					...(cle === 'GoogleDrivePicker' && picker?.loading === true ? { chargement: true } : {})
				}))}
				onChoisir={(cle) => {
					if (cle === 'GoogleDrivePicker') void picker?.show();
					else setOuverte(cle as CleNavigable);
				}}
			/>
			{ouverte === null ? null : <Navigateur cle={ouverte} onFermer={() => setOuverte(null)} />}
		</>
	);
}

/** Un crochet ne s'appelle pas sous condition : la condition choisit le composant. */
function CartesAvecGoogle() {
	const picker = useGooglePicker({ pickerType: 'drive', storage: MEMOIRE_DES_JETONS });
	return <CartesDesServices picker={picker} />;
}

/**
 * LES SERVICES EN LIGNE, sous les tuiles du dépôt. Rien tant que les greffons
 * ne sont pas installés — et rien du tout sans Companion.
 */
export function SourcesDistantes({ uppy }: { readonly uppy: UppyDuCoffre }) {
	const [pretes, setPretes] = useState(false);
	useEffect(() => {
		let annule = false;
		installerLesSources(uppy).then(
			() => {
				if (!annule) setPretes(true);
			},
			() => undefined
		);
		return () => {
			annule = true;
		};
	}, [uppy]);

	if (!pretes || SOURCES_CONFIGUREES.length === 0) return null;
	return (
		// Le contexte d'Uppy ne connaît pas nos métadonnées : il ne les lit pas.
		<UppyContextProvider uppy={uppy as unknown as Uppy}>
			{googleConfigure ? <CartesAvecGoogle /> : <CartesDesServices picker={null} />}
		</UppyContextProvider>
	);
}
