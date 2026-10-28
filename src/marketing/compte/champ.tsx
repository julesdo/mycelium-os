import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { LONGUEUR_MINIMALE_DU_MOT_DE_PASSE } from '../../lib/compte/regles';

/**
 * LE CHAMP ET LE BOUTON DES PAGES DU COMPTE (28/10/2026), dans la DA du site.
 *
 * Le champ est la pilule de l'appel, seule : l'icône à gauche, le libellé qui monte quand on écrit,
 * le liseré d'aube au focus, une coche qui se trace quand la valeur tient, une secousse quand elle
 * ne tient pas. Le bouton est celui d'encre de l'appel, pleine largeur ; pendant l'envoi, il garde
 * sa place et tourne, sans se griser : rien n'est invalide, on attend.
 */
const ICONES = {
	email: (
		<>
			<rect x="3.2" y="5.6" width="17.6" height="12.8" rx="2.6" />
			<path d="M4 7.2l8 5.9 8-5.9" />
		</>
	),
	cadenas: (
		<>
			<rect x="5" y="10.5" width="14" height="9.5" rx="2.4" />
			<path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
		</>
	),
	personne: (
		<>
			<circle cx="12" cy="8.6" r="3.6" />
			<path d="M5 19.4c1.2-3.3 3.9-5 7-5s5.8 1.7 7 5" />
		</>
	),
	code: (
		<>
			<rect x="4.4" y="3.4" width="15.2" height="17.2" rx="3" />
			<path d="M9 8.2h6M9 12h6M9 15.8h3.4" />
		</>
	)
} as const;

export function ChampDuCompte({
	id,
	libelle,
	icone,
	valeur,
	surChangement,
	type = 'text',
	valide = false,
	erreur = false,
	secoue = false,
	bout,
	code = false,
	...attributs
}: {
	id: string;
	libelle: string;
	icone: keyof typeof ICONES;
	valeur: string;
	surChangement: (v: string) => void;
	type?: 'text' | 'email' | 'password';
	valide?: boolean;
	erreur?: boolean;
	secoue?: boolean;
	/** Ce qui se pose au bout du champ : l'œil d'un mot de passe. Sans lui, la coche. */
	bout?: ReactNode;
	code?: boolean;
	name?: string;
	autoComplete?: string;
	inputMode?: 'email' | 'numeric' | 'text';
	autoFocus?: boolean;
	required?: boolean;
	maxLength?: number;
	enterKeyHint?: 'go' | 'next' | 'done' | 'send';
	'aria-describedby'?: string;
	onKeyUp?: (e: KeyboardEvent<HTMLInputElement>) => void;
	onBlur?: () => void;
}) {
	const classes = ['compte-champ', valide && 'valide', erreur && 'erreur', secoue && 'secoue']
		.filter(Boolean)
		.join(' ');
	return (
		<div className={classes}>
			<div className="champ">
				<svg className="champ-icone" viewBox="0 0 24 24" aria-hidden="true">
					{ICONES[icone]}
				</svg>
				<input
					id={id}
					type={type}
					value={valeur}
					onChange={(e) => surChangement(e.target.value)}
					placeholder=" "
					autoCapitalize={type === 'text' && !code ? 'words' : 'off'}
					autoCorrect="off"
					spellCheck={false}
					aria-invalid={erreur || undefined}
					className={code ? 'code' : undefined}
					{...attributs}
				/>
				<label htmlFor={id}>{libelle}</label>
				<span className="champ-bout">
					{bout ?? (
						<svg className="champ-ok" viewBox="0 0 20 20" aria-hidden="true">
							<circle cx="10" cy="10" r="8.3" pathLength="1" />
							<path d="M6.2 10.4l2.6 2.6 5-5.5" pathLength="1" />
						</svg>
					)}
				</span>
			</div>
		</div>
	);
}

/** L'œil d'un mot de passe : il montre ce qu'on tape, sans quitter le champ. */
export function OeilDuMotDePasse({
	visible,
	basculer
}: {
	visible: boolean;
	basculer: () => void;
}) {
	return (
		<button
			type="button"
			className="compte-oeil"
			aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
			aria-pressed={visible}
			onClick={basculer}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M2.8 12s3.4-6.4 9.2-6.4 9.2 6.4 9.2 6.4-3.4 6.4-9.2 6.4S2.8 12 2.8 12z" />
				<circle cx="12" cy="12" r="2.8" />
				{/* Barré quand on voit : le geste suivant le cache. */}
				{visible ? <path d="M4.6 4.6l14.8 14.8" /> : null}
			</svg>
		</button>
	);
}

/** Le mot de passe, son œil, et la touche des majuscules qui le dit quand elle est bloquée. */
export function useMotDePasse() {
	const [visible, setVisible] = useState(false);
	const [majuscules, setMajuscules] = useState(false);
	return {
		visible,
		majuscules,
		basculer: () => setVisible((v) => !v),
		lireLaTouche: (e: KeyboardEvent<HTMLInputElement>) =>
			setMajuscules(e.getModifierState('CapsLock'))
	};
}

/** Le bouton plein d'encre, pleine largeur ; il tourne pendant l'envoi sans changer de place. */
export function BoutonDuCompte({
	children,
	enCours = false,
	inactif = false,
	form
}: {
	children: ReactNode;
	enCours?: boolean;
	inactif?: boolean;
	form?: string;
}) {
	return (
		<button
			type="submit"
			form={form}
			className="bouton bouton-encre cta"
			aria-disabled={inactif || undefined}
			aria-busy={enCours || undefined}
			onClick={(e) => {
				if (inactif || enCours) e.preventDefault();
			}}
		>
			<span className="cta-fond" aria-hidden="true" />
			{enCours ? <span className="compte-tourne" aria-hidden="true" /> : null}
			<span className="cta-txt">{children}</span>
			{enCours ? null : (
				<svg className="cta-fleche" viewBox="0 0 10 10" aria-hidden="true">
					<path className="ligne" d="M0 5h7" />
					<path className="pointe" d="M1 1l4 4-4 4" />
				</svg>
			)}
		</button>
	);
}

/** Une erreur, en une phrase, avec son signe. */
export function ErreurDuCompte({ children }: { children: ReactNode }) {
	return (
		<p className="compte-erreur" role="alert">
			<svg viewBox="0 0 20 20" aria-hidden="true">
				<circle cx="10" cy="10" r="8" />
				<path d="M10 6v4.6M10 13.6v.2" />
			</svg>
			<span>{children}</span>
		</p>
	);
}

/** La longueur d'un mot de passe, en traits : un par caractère exigé, qui se remplit à la frappe. */
export function JaugeDuMotDePasse({ longueur }: { longueur: number }) {
	const traits = Array.from({ length: LONGUEUR_MINIMALE_DU_MOT_DE_PASSE }, (_, i) => i < longueur);
	return (
		<span
			className={
				longueur >= LONGUEUR_MINIMALE_DU_MOT_DE_PASSE ? 'compte-jauge assez' : 'compte-jauge'
			}
			aria-hidden="true"
		>
			{traits.map((plein, i) => (
				<i key={i} className={plein ? 'plein' : undefined} />
			))}
		</span>
	);
}
