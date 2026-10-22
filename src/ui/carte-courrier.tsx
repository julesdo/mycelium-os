import { useState, type ReactNode } from 'react';
import { TexteQuiMene } from './texte-qui-mene';

/**
 * LE COURRIER DANS LE FIL — ce que Plume a préparé, tel qu'il partira (22/10/2026).
 *
 * C'est la carte du démarrage (les factures, le plan) appliquée à une lettre ou à un
 * e-mail : son titre, ce qu'il dit en trois phrases, et le texte entier à un toucher.
 * Le gérant le lit dans la conversation, au lieu de chercher la bonne carte parmi les
 * courriers du dossier.
 */
export function CarteDeCourrier({
	titre,
	sousTitre,
	resume = [],
	corps,
	ouvertAuDepart = false
}: {
	readonly titre: string;
	/** « Pour Fournitures Durand · À envoyer depuis votre propre messagerie ». */
	readonly sousTitre?: string;
	/** Ce que dit le courrier, en quelques phrases. */
	readonly resume?: readonly string[];
	readonly corps: string;
	readonly ouvertAuDepart?: boolean;
}) {
	const [ouvert, setOuvert] = useState(ouvertAuDepart);
	return (
		<div className="verre-carte flex flex-col gap-2 rounded-cladd-xl px-3.5 py-3">
			<div className="flex flex-col gap-0.5">
				<p className="text-cladd-xs font-semibold">{titre}</p>
				{sousTitre === undefined ? null : (
					<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">{sousTitre}</p>
				)}
			</div>
			{resume.map((phrase) => (
				<p key={phrase} className="text-cladd-2xs leading-snug">
					{phrase}
				</p>
			))}
			{ouvert ? (
				<pre className="max-h-80 overflow-auto rounded-cladd-md border border-cladd-outline p-cladd-3xs font-sans text-cladd-2xs leading-relaxed whitespace-pre-wrap">
					{corps}
				</pre>
			) : null}
			<button
				type="button"
				aria-expanded={ouvert}
				onClick={() => setOuvert(!ouvert)}
				className="self-start text-cladd-2xs font-semibold text-cladd-fg underline-offset-2 hover:underline"
			>
				{ouvert ? 'Masquer le texte' : 'Lire le texte entier'}
			</button>
		</div>
	);
}

/**
 * CE QU'IL MANQUE POUR PRÉPARER UN COURRIER — chaque manque mène là où il se répare
 * (« (sa fiche) », « (vos coordonnées) »), comme dans les courriers du dossier.
 */
export function ManquesDuCourrier({
	manques,
	debiteurId
}: {
	readonly manques: readonly string[];
	readonly debiteurId?: string;
}) {
	return (
		<ul className="verre-carte flex flex-col gap-1 rounded-cladd-xl px-3.5 py-3">
			{manques.map((manque) => (
				<li key={manque} className="text-cladd-2xs leading-snug">
					· <TexteQuiMene texte={manque} {...(debiteurId === undefined ? {} : { debiteurId })} />
				</li>
			))}
		</ul>
	);
}

/** Une carte de verre autour de réglages présentés dans le fil : « Changez ce qui ne va pas. » */
export function CarteDeReglages({ children }: { readonly children: ReactNode }) {
	return (
		<div className="verre-carte flex flex-col gap-cladd-2xs rounded-cladd-xl p-cladd-2xs">
			{children}
		</div>
	);
}
