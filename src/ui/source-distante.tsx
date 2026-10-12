import { Spinner } from '@cladd-ui/react';
import { CheckIcon, ChevronRightIcon, CloudIcon, FolderIcon, LockIcon } from 'lucide-react';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { cn } from './cn';
import { VignetteDocument, mimeProbable, tailleEnClair } from './coffre';
import { LOGOS_DES_SERVICES } from './logos-services';
import {
	BarreDePleinEcran,
	ColonneDePleinEcran,
	PiedDePleinEcran,
	PleinEcran
} from './plein-ecran';

/**
 * DÉPOSER DEPUIS UN SERVICE EN LIGNE — Google Drive, Dropbox, OneDrive, Box
 * (12/10/2026), dans le parcours de dépôt.
 *
 * ⚠️ AUCUN ÉCRAN D'UPPY N'EST MONTRÉ. Uppy fournit l'accès aux services (son
 * serveur Companion, ses crochets sans interface) ; ce que le gérant voit reste
 * le produit : la même coquille plein écran, les mêmes cartes, le même seul
 * bouton plein. Google Drive ouvre son propre sélecteur, celui de Google : c'est
 * la seule façon de ne demander l'accès qu'aux fichiers choisis.
 *
 * ⚠️ CE QUI EST DIT DU TRANSFERT EST VRAI : un fichier d'un service en ligne
 * passe par notre serveur de transfert, en clair le temps du transfert, sans y
 * être gardé ; puis il est scellé au coffre comme les autres. Voir
 * `app/uppy-coffre.ts`.
 *
 * ⚠️ IL N'INTERROGE RIEN : l'état d'une source arrive par `etat`, que
 * `app/sources-distantes.tsx` construit depuis Uppy.
 */

export interface SourceAffichee {
	readonly cle: string;
	readonly nom: string;
	/** Le sélecteur de Google se prépare (ses scripts se chargent). */
	readonly chargement?: boolean;
}

/** Les services en ligne, sous les deux tuiles du dépôt. */
export function CartesDesSources({
	sources,
	onChoisir
}: {
	readonly sources: readonly SourceAffichee[];
	readonly onChoisir: (cle: string) => void;
}) {
	if (sources.length === 0) return null;
	return (
		<section className="flex flex-col gap-cladd-3xs">
			<h3 className="px-1 text-cladd-2xs font-semibold text-cladd-fg-soft">
				Depuis un service en ligne
			</h3>
			<div className="grid grid-cols-2 gap-2">
				{sources.map((source) => (
					<button
						key={source.cle}
						type="button"
						onClick={() => onChoisir(source.cle)}
						disabled={source.chargement}
						className="verre-carte verre-bouton flex min-h-14 items-center gap-2.5 rounded-cladd-xl px-2.5 text-left"
					>
						{source.chargement ? (
							<span className="flex size-9 shrink-0 items-center justify-center">
								<Spinner size="xs" />
							</span>
						) : (
							<PastilleDuService cle={source.cle} />
						)}
						<span className="truncate text-cladd-xs font-semibold">{source.nom}</span>
					</button>
				))}
			</div>
		</section>
	);
}

export interface ElementDeSource {
	readonly id: string;
	readonly nom: string;
	readonly dossier: boolean;
	readonly coche: 'oui' | 'non' | 'partiel';
	readonly taille?: number;
	readonly mime?: string;
	/** Pourquoi ce fichier ne peut pas être choisi : son format, sa taille. */
	readonly refus?: string;
}

/** Une source en ligne, telle que le navigateur la montre. */
export interface EtatDeSource {
	/** `undefined` : on ne sait pas encore si le compte est relié. */
	readonly connecte: boolean | undefined;
	readonly chargement: boolean;
	readonly messageDeChargement?: string;
	readonly compte?: string;
	readonly erreur?: string;
	/** Le chemin jusqu'au dossier ouvert, la racine d'abord. */
	readonly chemin: readonly { readonly id: string | null; readonly nom: string }[];
	readonly elements: readonly ElementDeSource[];
	readonly choisis: number;
	readonly onConnecter: () => void;
	readonly onDeconnecter: () => void;
	readonly onOuvrir: (id: string | null) => void;
	readonly onCocher: (id: string) => void;
	readonly onAjouter: () => void;
}

/** Le logo du service sur une pastille blanche, lisible en mode sombre aussi. */
function PastilleDuService({
	cle,
	grande = false
}: {
	readonly cle: string;
	readonly grande?: boolean;
}) {
	const Logo = LOGOS_DES_SERVICES[cle];
	return (
		<span
			className={cn(
				'flex shrink-0 items-center justify-center bg-white shadow-sm ring-1 ring-black/5',
				grande ? 'size-16 rounded-full' : 'size-9 rounded-cladd-sm'
			)}
		>
			{Logo === undefined ? (
				<CloudIcon className={cn('text-cladd-primary', grande ? 'size-8' : 'size-5')} aria-hidden />
			) : (
				<Logo className={grande ? 'size-9' : 'size-5'} />
			)}
		</span>
	);
}

function Connexion({
	cle,
	nom,
	etat
}: {
	readonly cle: string;
	readonly nom: string;
	readonly etat: EtatDeSource;
}) {
	return (
		<div className="flex flex-col items-center gap-cladd-3xs px-1 pt-cladd-sm text-center">
			<PastilleDuService cle={cle} grande />
			<h2 className="text-cladd-lg leading-tight font-semibold">Reliez votre compte {nom}</h2>
			<p className="max-w-sm text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				Une fenêtre de {nom} s’ouvre pour autoriser l’accès. Seuls les fichiers que vous cochez sont
				copiés : ils passent par notre serveur de transfert, sans y être gardés, puis sont chiffrés
				au coffre comme les autres.
			</p>
			<p className="flex items-center gap-1.5 text-cladd-3xs text-cladd-fg-soft">
				<LockIcon className="size-3.5" aria-hidden />
				L’accès s’oublie quand vous fermez l’application.
			</p>
			<BoutonPrincipal
				pleineLargeur
				className="mt-cladd-2xs"
				disabled={etat.chargement}
				onClick={etat.onConnecter}
			>
				{etat.chargement ? <Spinner size="xs" /> : null}
				Se connecter à {nom}
			</BoutonPrincipal>
		</div>
	);
}

function LigneDElement({
	element,
	onOuvrir,
	onCocher
}: {
	readonly element: ElementDeSource;
	readonly onOuvrir: () => void;
	readonly onCocher: () => void;
}) {
	if (element.dossier) {
		return (
			<button
				type="button"
				onClick={onOuvrir}
				className="verre-carte verre-bouton flex min-h-14 items-center gap-3 rounded-cladd-xl py-2 pr-3 pl-3.5 text-left"
			>
				<span className="flex size-10 shrink-0 items-center justify-center rounded-cladd-sm bg-cladd-fg/5 text-cladd-fg-soft">
					<FolderIcon className="size-5" aria-hidden />
				</span>
				<span className="min-w-0 flex-1 truncate text-cladd-xs font-semibold">{element.nom}</span>
				<ChevronRightIcon className="size-4 shrink-0 text-cladd-fg-softer" aria-hidden />
			</button>
		);
	}
	const coche = element.coche === 'oui';
	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={coche}
			disabled={element.refus !== undefined}
			onClick={onCocher}
			className={cn(
				'verre-carte verre-bouton flex min-h-14 items-center gap-3 rounded-cladd-xl py-2 pr-3 pl-3.5 text-left',
				coche && 'ring-2 ring-cladd-primary',
				element.refus !== undefined && 'opacity-60'
			)}
		>
			<VignetteDocument mime={mimeProbable(element.mime, element.nom)} scelle={false} />
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-cladd-xs font-semibold">{element.nom}</span>
				<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					{element.refus ?? (element.taille === undefined ? '' : tailleEnClair(element.taille))}
				</span>
			</span>
			<span
				aria-hidden
				className={cn(
					'flex size-6 shrink-0 items-center justify-center rounded-full border-2 [&>svg]:size-3.5',
					coche ? 'border-cladd-primary bg-cladd-primary text-cladd-bg' : 'border-cladd-fg/20'
				)}
			>
				{coche ? <CheckIcon /> : null}
			</span>
		</button>
	);
}

/** Parcourir un service en ligne et cocher ses fichiers, en plein écran par-dessus le dépôt. */
export function NavigateurDeSource({
	ouvert,
	cle,
	nom,
	etat,
	onFermer
}: {
	readonly ouvert: boolean;
	/** La clé du service, pour son logo : « Dropbox ». */
	readonly cle: string;
	readonly nom: string;
	readonly etat: EtatDeSource;
	readonly onFermer: () => void;
}) {
	const dossierOuvert = etat.chemin.at(-1);
	return (
		<PleinEcran ouvert={ouvert} onFermer={onFermer} libelle={`Choisir dans ${nom}`}>
			<ColonneDePleinEcran>
				<BarreDePleinEcran
					titre={nom}
					sousTitre={etat.connecte === true && etat.compte ? etat.compte : 'Choisir des fichiers'}
					onRetour={onFermer}
					libelleRetour="Revenir au dépôt"
					droite={
						etat.connecte === true ? (
							<BoutonTexte onClick={etat.onDeconnecter}>Se déconnecter</BoutonTexte>
						) : undefined
					}
				/>
				<div className="flex flex-1 flex-col gap-cladd-xs pt-cladd-2xs pb-cladd-sm">
					{etat.connecte !== true ? (
						<Connexion cle={cle} nom={nom} etat={etat} />
					) : (
						<>
							{etat.chemin.length > 1 ? (
								<nav aria-label="Dossiers" className="flex flex-wrap items-center gap-1 px-1">
									{etat.chemin.map((pas, i) => (
										<span key={pas.id ?? 'racine'} className="flex items-center gap-1">
											{i === 0 ? null : (
												<ChevronRightIcon className="size-3.5 text-cladd-fg-softer" aria-hidden />
											)}
											<button
												type="button"
												onClick={() => etat.onOuvrir(pas.id)}
												aria-current={pas === dossierOuvert ? 'location' : undefined}
												className={cn(
													'min-h-9 rounded-cladd-sm px-1.5 text-cladd-2xs',
													pas === dossierOuvert
														? 'font-semibold text-cladd-fg'
														: 'text-cladd-fg-soft'
												)}
											>
												{pas.nom}
											</button>
										</span>
									))}
								</nav>
							) : null}

							{etat.chargement ? (
								<p
									className="flex items-center gap-2 px-1 text-cladd-2xs text-cladd-fg-soft"
									aria-live="polite"
								>
									<Spinner size="xs" />
									{etat.messageDeChargement ?? 'Lecture du dossier…'}
								</p>
							) : etat.elements.length === 0 ? (
								<p className="px-1 text-cladd-2xs text-cladd-fg-soft">Ce dossier est vide.</p>
							) : (
								<div className="flex flex-col gap-2">
									{etat.elements.map((element) => (
										<LigneDElement
											key={element.id}
											element={element}
											onOuvrir={() => etat.onOuvrir(element.id)}
											onCocher={() => etat.onCocher(element.id)}
										/>
									))}
								</div>
							)}
						</>
					)}
					{etat.erreur === undefined ? null : (
						<p role="alert" className="px-1 text-cladd-2xs leading-relaxed">
							{etat.erreur}
						</p>
					)}
				</div>
				{etat.connecte === true ? (
					<PiedDePleinEcran>
						<BoutonPrincipal
							pleineLargeur
							disabled={etat.choisis === 0 || etat.chargement}
							onClick={etat.onAjouter}
						>
							{etat.choisis === 0 ? 'Cochez vos fichiers' : `Ajouter au dépôt (${etat.choisis})`}
						</BoutonPrincipal>
					</PiedDePleinEcran>
				) : null}
			</ColonneDePleinEcran>
		</PleinEcran>
	);
}
