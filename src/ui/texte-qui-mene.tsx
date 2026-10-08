import { Lien } from './lien';

/**
 * UN TEXTE QUI DIT OÙ ALLER, ET QUI Y MÈNE (08/10/2026).
 *
 * Les refus du domaine nomment l'endroit où se répare ce qui manque, entre
 * parenthèses : « l'adresse e-mail de Durand (sa fiche) », « votre IBAN (Mon compte,
 * vos courriers) ». Le fondateur : « qu'on puisse accéder directement aux éléments,
 * c'est un principe d'UX de base ». La parenthèse devient donc un lien vers cet
 * endroit, au lieu d'une indication à suivre de mémoire.
 *
 * ⚠️ LE TEXTE NE CHANGE PAS, SEULE LA PARENTHÈSE SE TOUCHE : les messages restent
 * ceux du domaine, mot pour mot.
 */
const RENVOI = /\((sa fiche|Mon compte[^)]*)\)/;

export function TexteQuiMene({
	texte,
	debiteurId
}: {
	readonly texte: string;
	/** Le client du dossier : « (sa fiche) » mène à sa fiche. Absent, la parenthèse reste du texte. */
	readonly debiteurId?: string;
}) {
	const trouve = RENVOI.exec(texte);
	if (trouve === null) return <>{texte}</>;
	const avant = texte.slice(0, trouve.index);
	const apres = texte.slice(trouve.index + trouve[0].length);
	const renvoi = trouve[1] ?? '';
	const versLaFiche = renvoi === 'sa fiche';
	if (versLaFiche && debiteurId === undefined) return <>{texte}</>;
	return (
		<>
			{avant}
			{versLaFiche ? (
				<Lien
					to="/app/clients/$id"
					params={{ id: debiteurId ?? '' }}
					className="font-medium text-cladd-primary underline underline-offset-2"
				>
					sa fiche
				</Lien>
			) : (
				<Lien
					to="/app/compte"
					className="font-medium text-cladd-primary underline underline-offset-2"
				>
					{renvoi}
				</Lien>
			)}
			{apres}
		</>
	);
}
