import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { authClient } from '../../lib/client/auth';
import { CadreDuCompte } from './cadre';
import { BoutonDuCompte, ChampDuCompte, ErreurDuCompte } from './champ';

/**
 * LE CODE DE VÉRIFICATION (28/10/2026), dans la DA du site : la double authentification.
 *
 * Le code à six chiffres de l'application d'authentification, dans un seul champ, en chiffres
 * espacés. Il se colle ou se remplit seul (`one-time-code`), et part de lui-même au sixième
 * chiffre : il n'y a rien d'autre à faire. Un code de secours se tape au même endroit.
 */
const CHIFFRES = 6;

export function PageVerification({
	invitation,
	suite
}: {
	invitation: string | undefined;
	suite: string | undefined;
}) {
	const navigate = useNavigate();
	const [code, setCode] = useState('');
	const [secours, setSecours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const [secoue, setSecoue] = useState(0);
	const [enCours, setEnCours] = useState(false);

	async function verifier(saisi: string) {
		if (enCours) return;
		setErreur(null);
		setEnCours(true);
		const { error } = secours
			? await authClient.twoFactor.verifyBackupCode({ code: saisi, trustDevice: true })
			: await authClient.twoFactor.verifyTotp({ code: saisi, trustDevice: true });
		if (error) {
			setEnCours(false);
			setErreur(
				secours
					? 'Ce code de secours ne correspond pas, ou a déjà servi.'
					: 'Ce code ne correspond pas. Vérifiez l’heure de votre téléphone, puis réessayez.'
			);
			setCode('');
			setSecoue((n) => n + 1);
			return;
		}
		if (invitation) {
			await navigate({ to: '/rejoindre/$token', params: { token: invitation } });
			return;
		}
		await navigate({ to: suite ?? '/app' });
	}

	function changer(v: string) {
		setErreur(null);
		if (secours) {
			setCode(v);
			return;
		}
		const chiffres = v.replace(/\D/g, '').slice(0, CHIFFRES);
		setCode(chiffres);
		// Le sixième chiffre envoie : il n'y a rien d'autre à faire.
		if (chiffres.length === CHIFFRES) void verifier(chiffres);
	}

	function soumettre(e: FormEvent) {
		e.preventDefault();
		const saisi = code.replace(/\s+/g, '');
		if (saisi === '' || (!secours && saisi.length < CHIFFRES)) {
			setErreur(
				secours ? 'Saisissez l’un de vos codes de secours.' : `Le code compte ${CHIFFRES} chiffres.`
			);
			setSecoue((n) => n + 1);
			return;
		}
		void verifier(saisi);
	}

	return (
		<CadreDuCompte
			titre="Un dernier code."
			ton={secours ? 'Celui de secours.' : 'Celui de votre téléphone.'}
			chapeau={
				secours
					? 'Saisissez l’un des codes de secours que vous avez gardés. Chacun ne sert qu’une fois.'
					: `Ouvrez votre application d’authentification, et saisissez le code à ${CHIFFRES} chiffres de Letikette.`
			}
			autre={{ question: 'Pas votre compte ?', lien: 'Revenir', vers: '/connexion' }}
			scene={{
				paysage: 'secnuit',
				ciel: 'sombre',
				humeur: 'attention',
				carte: (
					<>
						<h2>Votre compte est gardé deux fois.</h2>
						<ul>
							<li>
								<Bouclier />
								<span>
									<b>Le mot de passe, puis ce code.</b>
									Sans votre téléphone, personne n’ouvre vos dossiers.
								</span>
							</li>
							<li>
								<Bouclier />
								<span>
									<b>Cet appareil sera retenu.</b>
									Le code ne vous sera plus demandé ici à chaque connexion.
								</span>
							</li>
						</ul>
					</>
				)
			}}
		>
			<form className="compte-form" onSubmit={soumettre} noValidate>
				<ChampDuCompte
					key={`${secours}-${secoue}`}
					id="verification-code"
					libelle={secours ? 'Code de secours' : 'Code à six chiffres'}
					icone="code"
					name="code"
					autoComplete="one-time-code"
					inputMode={secours ? 'text' : 'numeric'}
					enterKeyHint="go"
					maxLength={secours ? 24 : CHIFFRES}
					autoFocus
					code={!secours}
					valeur={code}
					surChangement={changer}
					valide={!secours && code.length === CHIFFRES}
					erreur={erreur !== null}
					secoue={secoue > 0}
				/>
				{erreur ? <ErreurDuCompte>{erreur}</ErreurDuCompte> : null}
				<BoutonDuCompte enCours={enCours}>{enCours ? 'Vérification…' : 'Vérifier'}</BoutonDuCompte>
				<button
					type="button"
					className="compte-secondaire"
					onClick={() => {
						setSecours((s) => !s);
						setCode('');
						setErreur(null);
					}}
				>
					{secours ? 'Utiliser l’application' : 'Utiliser un code de secours'}
				</button>
			</form>
		</CadreDuCompte>
	);
}

function Bouclier() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 3.5l7 2.6v5.6c0 4.3-3 7.6-7 8.8-4-1.2-7-4.5-7-8.8V6.1z" />
			<path d="M9 12l2.2 2.2 4-4.4" />
		</svg>
	);
}
