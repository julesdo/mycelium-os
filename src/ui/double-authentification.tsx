import { useState, type FormEvent } from 'react';
import { Input } from '@cladd-ui/react';
import { BoutonPrincipal, BoutonSecondaire, BoutonTexte } from './bouton';
import { Champ, MessageErreur } from './cadre-auth';
import { QrDeVirement } from './qr-virement';
import { LigneCopiable } from './champ-copiable';
import { cleDuTotp, cleLisible } from '../lib/compte/totp';

/**
 * LA DOUBLE AUTHENTIFICATION, ACTIVÉE SUR PLACE (16/10/2026), comme chez
 * Braintrust ou Docusign : le mot de passe, le QR (et la clé en clair pour qui ne
 * peut pas le scanner), le code à six chiffres, puis les dix codes de secours à
 * garder. Offerte à tous ; obligatoire pour l'équipe de Letikette.
 *
 * Le composant ne connaît pas Better Auth : l'écran lui passe les trois gestes.
 */

export interface GestesDoubleAuth {
	readonly active: boolean | undefined;
	readonly onCommencer: (
		motDePasse: string
	) => Promise<{ totpURI: string; codes: readonly string[] } | { erreur: string }>;
	readonly onVerifier: (code: string) => Promise<{ erreur?: string }>;
	readonly onDesactiver: (motDePasse: string) => Promise<{ erreur?: string }>;
}

type Etape =
	| { nom: 'REPOS' }
	| { nom: 'MOT_DE_PASSE'; pour: 'ACTIVER' | 'DESACTIVER' }
	| { nom: 'SCAN'; totpURI: string; codes: readonly string[] }
	| { nom: 'CODES'; codes: readonly string[] };

export function DoubleAuthentification({
	active,
	onCommencer,
	onVerifier,
	onDesactiver
}: GestesDoubleAuth) {
	const [etape, setEtape] = useState<Etape>({ nom: 'REPOS' });
	const [saisie, setSaisie] = useState('');
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	function aller(suivante: Etape) {
		setEtape(suivante);
		setSaisie('');
		setErreur(null);
	}

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		setEnCours(true);
		setErreur(null);
		if (etape.nom === 'MOT_DE_PASSE' && etape.pour === 'ACTIVER') {
			const r = await onCommencer(saisie);
			setEnCours(false);
			if ('erreur' in r) setErreur(r.erreur);
			else aller({ nom: 'SCAN', totpURI: r.totpURI, codes: r.codes });
			return;
		}
		if (etape.nom === 'MOT_DE_PASSE' && etape.pour === 'DESACTIVER') {
			const r = await onDesactiver(saisie);
			setEnCours(false);
			if (r.erreur !== undefined) setErreur(r.erreur);
			else aller({ nom: 'REPOS' });
			return;
		}
		if (etape.nom === 'SCAN') {
			const r = await onVerifier(saisie.replace(/\s+/g, ''));
			setEnCours(false);
			if (r.erreur !== undefined) setErreur(r.erreur);
			else aller({ nom: 'CODES', codes: etape.codes });
			return;
		}
		setEnCours(false);
	}

	if (etape.nom === 'CODES') {
		return (
			<div className="flex flex-col gap-cladd-2xs">
				<p className="text-cladd-xs font-semibold">C’est activé.</p>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Gardez ces codes de secours en lieu sûr : chacun ouvre votre compte une fois, si vous
					perdez votre téléphone.
				</p>
				<ul className="grid grid-cols-2 gap-1 rounded-cladd-md bg-cladd-surface-cut p-cladd-2xs font-mono text-cladd-xs tabular-nums">
					{etape.codes.map((code) => (
						<li key={code}>{code}</li>
					))}
				</ul>
				<LigneCopiable
					etiquette="Les dix codes"
					affichage="Copier les codes"
					valeur={etape.codes.join('\n')}
				/>
				<BoutonPrincipal type="button" pleineLargeur onClick={() => aller({ nom: 'REPOS' })}>
					J’ai gardé mes codes
				</BoutonPrincipal>
			</div>
		);
	}

	if (etape.nom === 'SCAN') {
		const cle = cleDuTotp(etape.totpURI);
		return (
			<form onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Scannez ce code avec votre application d’authentification (Google Authenticator,
					1Password, Authy…), puis saisissez le code à six chiffres qu’elle affiche.
				</p>
				<div className="flex justify-center">
					<QrDeVirement charge={etape.totpURI} titre="Le code à scanner" taille={180} />
				</div>
				{cle === null ? null : (
					<LigneCopiable
						etiquette="Vous ne pouvez pas le scanner ? Saisissez cette clé"
						affichage={cleLisible(cle)}
						valeur={cle}
					/>
				)}
				<Champ etiquette="Code à six chiffres">
					<Input
						name="code"
						value={saisie}
						onChange={setSaisie}
						inputMode="numeric"
						inputComponentProps={{ autoComplete: 'one-time-code' }}
						required
					/>
				</Champ>
				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
				<BoutonPrincipal type="submit" pleineLargeur disabled={enCours || saisie.trim() === ''}>
					{enCours ? 'Vérification…' : 'Vérifier et activer'}
				</BoutonPrincipal>
				<BoutonTexte type="button" onClick={() => aller({ nom: 'REPOS' })}>
					Annuler
				</BoutonTexte>
			</form>
		);
	}

	if (etape.nom === 'MOT_DE_PASSE') {
		return (
			<form onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{etape.pour === 'ACTIVER'
						? 'Confirmez votre mot de passe pour commencer.'
						: 'Confirmez votre mot de passe pour désactiver la double authentification.'}
				</p>
				<Champ etiquette="Mot de passe">
					<Input
						type="password"
						name="password"
						value={saisie}
						onChange={setSaisie}
						inputComponentProps={{ autoComplete: 'current-password' }}
						required
					/>
				</Champ>
				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
				<BoutonPrincipal type="submit" pleineLargeur disabled={enCours || saisie === ''}>
					{enCours ? 'Un instant…' : etape.pour === 'ACTIVER' ? 'Continuer' : 'Désactiver'}
				</BoutonPrincipal>
				<BoutonTexte type="button" onClick={() => aller({ nom: 'REPOS' })}>
					Annuler
				</BoutonTexte>
			</form>
		);
	}

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				{active === true
					? 'Activée : à chaque connexion sur un nouvel appareil, un code de votre téléphone s’ajoute au mot de passe.'
					: 'Un code de votre téléphone en plus du mot de passe, à chaque connexion sur un nouvel appareil. Obligatoire pour l’équipe de Letikette.'}
			</p>
			{active === true ? (
				<BoutonSecondaire
					type="button"
					onClick={() => aller({ nom: 'MOT_DE_PASSE', pour: 'DESACTIVER' })}
				>
					Désactiver
				</BoutonSecondaire>
			) : (
				<BoutonPrincipal
					type="button"
					pleineLargeur
					disabled={active === undefined}
					onClick={() => aller({ nom: 'MOT_DE_PASSE', pour: 'ACTIVER' })}
				>
					Activer
				</BoutonPrincipal>
			)}
		</div>
	);
}
