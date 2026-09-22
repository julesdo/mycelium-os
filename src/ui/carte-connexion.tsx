import type { ReactNode } from 'react';
import { Spinner } from '@cladd-ui/react';
import { CheckCircle2Icon } from 'lucide-react';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { cn } from './cn';
import { pluriel } from './format';

/**
 * UNE CONNEXION À UN LOGICIEL DE FACTURATION : ce qu'elle promet, où elle en
 * est, et le seul geste utile à cet instant.
 *
 * Références : Shop (connecter en premier, le manuel en second), Monarch et
 * Mesh (dernière mise à jour, resynchroniser, déconnecter au même endroit),
 * Origin (le retour dit que tout se remplit seul). Un seul bouton principal
 * par état : il n'y a jamais deux choses à faire en même temps.
 */
export type EtatConnexion =
	| { readonly genre: 'A_CONNECTER' }
	| { readonly genre: 'REDIRECTION' }
	| { readonly genre: 'SYNCHRONISATION'; readonly facturesLues: number }
	| { readonly genre: 'A_JOUR'; readonly depuis: string; readonly facturesLues: number }
	| { readonly genre: 'ECHEC'; readonly message: string }
	| { readonly genre: 'REVOQUEE' };

function ligneDEtat(etat: EtatConnexion, promesse: string): string {
	switch (etat.genre) {
		case 'A_CONNECTER':
			return promesse;
		case 'REDIRECTION':
			return 'Ouverture de la connexion…';
		case 'SYNCHRONISATION':
			return etat.facturesLues === 0
				? 'Lecture de vos factures…'
				: `${etat.facturesLues} facture${pluriel(etat.facturesLues)} lue${pluriel(etat.facturesLues)}…`;
		case 'A_JOUR':
			return `À jour ${etat.depuis} · ${etat.facturesLues} facture${pluriel(etat.facturesLues)}`;
		case 'ECHEC':
			return etat.message;
		case 'REVOQUEE':
			return 'L’accès a été retiré. Reconnectez-vous pour reprendre la lecture.';
	}
}

export function CarteConnexion({
	nom,
	promesse,
	logo,
	couverture,
	etat,
	onConnecter,
	onSynchroniser,
	onDeconnecter
}: {
	nom: string;
	/** Ce que la connexion fait, en une phrase, avant qu'on la touche. */
	promesse: string;
	logo: ReactNode;
	/**
	 * L'image de couverture, en bandeau au-dessus de la carte.
	 *
	 * ⚠️ ELLE RASSURE, ELLE NE DÉCORE PAS. On demande au gérant d'ouvrir l'accès à
	 * ses factures : une pierre claire et une colonnade disent la solidité d'une
	 * institution avant qu'on lise un mot. Une image vive ou abstraite dirait le
	 * contraire.
	 */
	couverture?: string;
	etat: EtatConnexion;
	onConnecter: () => void;
	onSynchroniser: () => void;
	onDeconnecter: () => void;
}) {
	const occupe = etat.genre === 'REDIRECTION' || etat.genre === 'SYNCHRONISATION';
	return (
		<div className="verre-carte flex flex-col overflow-hidden rounded-cladd-xl">
			{couverture === undefined ? null : (
				<div aria-hidden className="relative h-28 w-full">
					<img src={couverture} alt="" className="size-full object-cover" loading="lazy" />
					{/* Un voile vers le bas : la tuile du logo se pose sur l'image sans
					    flotter sur la pierre claire, en clair comme en sombre. */}
					<div className="absolute inset-0 bg-linear-to-t from-black/35 to-transparent" />
				</div>
			)}
			<div
				className={cn(
					'relative flex flex-col gap-cladd-2xs p-cladd-xs',
					couverture !== undefined && '-mt-9'
				)}
			>
			<div className={cn('flex gap-cladd-2xs', couverture === undefined ? 'items-center' : 'items-end')}>
				<span
					aria-hidden
					className={cn(
						'flex shrink-0 items-center justify-center overflow-hidden rounded-cladd-2xs bg-white',
						couverture === undefined ? 'size-cladd-md' : 'size-14 shadow-lg ring-1 ring-black/5'
					)}
				>
					{logo}
				</span>
				<div className="min-w-0 flex-1">
					<p className="text-cladd-sm font-semibold">{nom}</p>
					<p role="status" className="text-cladd-2xs leading-snug text-cladd-fg-soft">
						{ligneDEtat(etat, promesse)}
					</p>
				</div>
				{occupe ? <Spinner size="md" /> : null}
				{etat.genre === 'A_JOUR' ? (
					<CheckCircle2Icon aria-hidden className="size-5 shrink-0 text-cladd-fg-soft" />
				) : null}
			</div>

			{etat.genre === 'A_CONNECTER' ? (
				<BoutonPrincipal pleineLargeur onClick={onConnecter}>
					Connecter {nom}
				</BoutonPrincipal>
			) : etat.genre === 'ECHEC' || etat.genre === 'REVOQUEE' ? (
				<BoutonPrincipal pleineLargeur onClick={onConnecter}>
					Reconnecter {nom}
				</BoutonPrincipal>
			) : etat.genre === 'A_JOUR' ? (
				<div className="flex flex-wrap gap-2">
					<BoutonSecondaire onClick={onSynchroniser}>Synchroniser</BoutonSecondaire>
					<BoutonSecondaire onClick={onDeconnecter}>Déconnecter</BoutonSecondaire>
				</div>
			) : null}
			</div>
		</div>
	);
}

/**
 * LE LOGO OFFICIEL D'UN SERVICE, auto-hébergé dans `public/connecteurs/`.
 *
 * Les fichiers des kits presse portent leur fond blanc : la tuile est donc
 * blanche, en clair comme en sombre, comme une icône d'application.
 */
export function LogoConnexion({ src }: { src: string }) {
	return <img src={src} alt="" className="size-full object-cover" />;
}

/** Le monogramme d'un service, en attendant son logo officiel. */
export function MonogrammeConnexion({ lettre }: { lettre: string }) {
	return <span className="text-cladd-sm font-bold">{lettre}</span>;
}
