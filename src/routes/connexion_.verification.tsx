import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Input } from '@cladd-ui/react';
import { authClient } from '../lib/client/auth';
import { BoutonPrincipal, BoutonTexte, CadreAuth, Champ, MessageErreur } from '../ui';
import { suiteSure } from '../lib/compte/suite';

/**
 * LE CODE DE VÉRIFICATION (16/10/2026) — la seconde étape d'une connexion quand la
 * double authentification est active : le code à six chiffres de l'application
 * d'authentification, ou l'un des codes de secours. L'appareil est ensuite retenu
 * trente jours (`trustDevice`), comme chez Google ou GitHub.
 */
export const Route = createFileRoute('/connexion_/verification')({
	validateSearch: (search: Record<string, unknown>): { invitation?: string; suite?: string } => ({
		invitation: typeof search.invitation === 'string' ? search.invitation : undefined,
		suite: suiteSure(search.suite)
	}),
	component: Verification
});

function Verification() {
	const navigate = useNavigate();
	const { invitation, suite } = Route.useSearch();
	const [code, setCode] = useState('');
	const [secours, setSecours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		setErreur(null);
		setEnCours(true);
		const saisi = code.replace(/\s+/g, '');
		const { error } = secours
			? await authClient.twoFactor.verifyBackupCode({ code: saisi, trustDevice: true })
			: await authClient.twoFactor.verifyTotp({ code: saisi, trustDevice: true });
		setEnCours(false);
		if (error) {
			setErreur(
				secours
					? 'Ce code de secours ne correspond pas, ou a déjà servi.'
					: 'Ce code ne correspond pas. Vérifiez l’heure de votre téléphone, puis réessayez.'
			);
			return;
		}
		if (invitation) {
			await navigate({ to: '/rejoindre/$token', params: { token: invitation } });
			return;
		}
		await navigate({ to: suite ?? '/app' });
	}

	return (
		<CadreAuth
			titre="Code de vérification"
			explication={
				secours
					? 'Saisissez l’un des codes de secours que vous avez gardés.'
					: 'Saisissez le code à six chiffres de votre application d’authentification.'
			}
			pied={
				<Link to="/connexion" className="font-medium text-cladd-primary">
					Revenir à la connexion
				</Link>
			}
		>
			<form id="verification" onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<Champ etiquette={secours ? 'Code de secours' : 'Code'}>
					<Input
						name="code"
						value={code}
						onChange={setCode}
						inputMode={secours ? 'text' : 'numeric'}
						inputComponentProps={{ autoComplete: 'one-time-code' }}
						autoFocus
						required
					/>
				</Champ>
				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
			</form>
			<BoutonPrincipal
				type="submit"
				form="verification"
				pleineLargeur
				disabled={enCours || code.trim() === ''}
			>
				{enCours ? 'Vérification…' : 'Vérifier'}
			</BoutonPrincipal>
			<BoutonTexte
				type="button"
				onClick={() => {
					setSecours(!secours);
					setCode('');
					setErreur(null);
				}}
			>
				{secours ? 'Utiliser l’application' : 'Utiliser un code de secours'}
			</BoutonTexte>
		</CadreAuth>
	);
}
