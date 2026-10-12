import { dateCourte } from './format';
import type { ProfessionnelAffiche } from './professionnel';

/**
 * LES FICHES DES PROFESSIONNELS — d'où qu'elles viennent, une forme à l'écran.
 *
 * Trois sources — le carnet du gérant, le registre des entreprises, l'annuaire
 * national des avocats — et une saisie à la main. Ce module les lit et les
 * convertit ; le parcours du choix (`parcours-professionnels.tsx`) les montre.
 * Sorti de l'ancienne feuille « Qui fait l'acte » le 12/10/2026, sans changer de
 * règles : une fiche relevée garde sa source et sa date, et une fiche relevée
 * n'est pas une fiche vérifiée.
 */

export type RoleIntervenant = 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE' | 'AUTRE';

/**
 * Les trois rôles, écrits pour être lus.
 *
 * ⚠️ AUCUN N'EST PREMIER. L'ordre est celui du validateur Convex, pas un ordre
 * de pertinence : le champ part sur « Autre », et c'est au gérant de dire ce
 * qu'est la personne qu'il ajoute.
 */
const ROLES: readonly { readonly cle: RoleIntervenant; readonly libelle: string }[] = [
	{ cle: 'AVOCAT', libelle: 'Avocat' },
	{ cle: 'COMMISSAIRE_DE_JUSTICE', libelle: 'Commissaire de justice' },
	{ cle: 'AUTRE', libelle: 'Autre' }
];

function libelleRole(role: RoleIntervenant): string {
	return ROLES.find((r) => r.cle === role)?.libelle ?? 'Autre';
}

/**
 * Une fiche du carnet, telle que l'écran la lit.
 *
 * ⚠️ L'IDENTIFIANT EST UN PARAMÈTRE DE TYPE, et ce n'est pas de la coquetterie.
 * `src/ui` ne connaît pas Convex ; le figer en `string` obligerait la route à
 * re-transformer en `Id<'intervenants'>` ce qui en venait, c'est-à-dire à
 * affirmer par une assertion ce que le compilateur savait déjà.
 */
export interface FicheIntervenant<I extends string = string> {
	readonly _id: I;
	readonly nom: string;
	readonly role: RoleIntervenant;
	/** Le ressort, quand le gérant l'a noté. Jamais deviné. */
	readonly ressort?: string;
	/**
	 * CE QUE LA FICHE DIT AUSSI (08/10/2026), pour qu'un membre de l'équipe se
	 * montre comme une personne : où il exerce, comment le joindre, sa photo.
	 * Tout est facultatif : une fiche saisie à la main n'a souvent que son nom.
	 */
	readonly adresse?: string;
	readonly telephone?: string;
	readonly courriel?: string;
	readonly siren?: string;
	readonly photoUrl?: string;
	readonly sourceRepertoire?: string;
	readonly sourceReleveeLe?: string;
}

/** Ce qu'une fiche saisie à la main porte, et rien de plus. */
export interface FicheASaisir {
	readonly nom: string;
	readonly role: RoleIntervenant;
	readonly ressort?: string;
}

/**
 * « Avocat · Paris », ou « Avocat » quand le ressort n'a pas été noté.
 *
 * Exportée depuis que le carnet se lit aussi en LISTE, dans `/app/compte` : la
 * même fiche s'y écrit de la même façon, sans quoi la carte de la feuille et la
 * rangée de la section finiraient par ne plus dire la même chose.
 */
export function precisionDeLaFiche(fiche: FicheIntervenant<string>): string {
	const role = libelleRole(fiche.role);
	return fiche.ressort === undefined || fiche.ressort.trim() === ''
		? role
		: `${role} · ${fiche.ressort}`;
}

/** Une étude de commissaire de justice proposée près du client. */
export interface EtudeProposee {
	readonly siren: string;
	readonly nom: string;
	readonly commune: string;
	readonly codePostal: string;
	readonly adresse?: string;
	/** Ce que le registre publie aussi : la carte, l'âge, la taille, qui y exerce. */
	readonly latitude?: number;
	readonly longitude?: number;
	readonly creeeLe?: string;
	readonly effectif?: string;
	readonly associes?: readonly string[];
}

/** Un avocat proposé près du client. */
export interface AvocatProposeAffiche {
	readonly nom: string;
	readonly prenom: string;
	readonly raisonSociale?: string;
	readonly siren?: string;
	readonly adresse?: string;
	readonly codePostal?: string;
	readonly ville?: string;
	readonly specialites: readonly string[];
	readonly barreau: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * D'UNE SOURCE À UNE FICHE AFFICHÉE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trois sources — le carnet du gérant, le registre des entreprises, l'annuaire
 * national des avocats — et UNE forme à l'écran (`ProfessionnelAffiche`). Chaque
 * fiche garde sa source écrite : une fiche relevée n'est pas une fiche vérifiée.
 */

/**
 * Le nom d'une source, sans son mode d'emploi : « Registre des entreprises (API
 * Recherche d'entreprises, DINUM), filtré sur… » se lit « Registre des
 * entreprises ». Le texte entier reste dans la feuille de recherche qui l'a lu.
 */
function nomDeLaSource(texte: string): string {
	const coupe = texte.search(/[(.,]/);
	return (coupe < 0 ? texte : texte.slice(0, coupe)).trim();
}

/** Une fiche du carnet, telle que la défense la montre. */
export function proDuCarnet(fiche: FicheIntervenant<string>): ProfessionnelAffiche {
	return {
		cle: fiche._id,
		role: fiche.role,
		nom: fiche.nom,
		// Un avocat retenu de l'annuaire a pour ressort son BARREAU ; ailleurs, le
		// ressort noté est un lieu, et il se lit sur la ligne du lieu.
		...(fiche.role === 'AVOCAT' &&
		fiche.ressort !== undefined &&
		fiche.sourceRepertoire !== undefined
			? { barreau: fiche.ressort }
			: fiche.ressort === undefined
				? {}
				: { ressort: fiche.ressort, commune: fiche.ressort }),
		...(fiche.adresse === undefined ? {} : { adresse: fiche.adresse }),
		...(fiche.telephone === undefined ? {} : { telephone: fiche.telephone }),
		...(fiche.courriel === undefined ? {} : { courriel: fiche.courriel }),
		...(fiche.siren === undefined ? {} : { siren: fiche.siren }),
		...(fiche.photoUrl === undefined ? {} : { photoUrl: fiche.photoUrl }),
		specialites: [],
		source:
			fiche.sourceRepertoire === undefined
				? 'Fiche saisie par vous'
				: `${nomDeLaSource(fiche.sourceRepertoire)}${fiche.sourceReleveeLe === undefined ? '' : `, relevé du ${dateCourte(fiche.sourceReleveeLe)}`}`
	};
}

/** Une étude relevée au registre des entreprises. */
export function proDEtude(etude: EtudeProposee, releveeLe?: string): ProfessionnelAffiche {
	return {
		cle: `etude:${etude.siren}`,
		role: 'COMMISSAIRE_DE_JUSTICE',
		nom: etude.nom,
		...(etude.adresse === undefined ? {} : { adresse: etude.adresse }),
		commune: etude.commune,
		specialites: [],
		siren: etude.siren,
		...(etude.latitude === undefined || etude.longitude === undefined
			? {}
			: { latitude: etude.latitude, longitude: etude.longitude }),
		...(etude.creeeLe === undefined ? {} : { creeeLe: etude.creeeLe }),
		...(etude.effectif === undefined ? {} : { effectif: etude.effectif }),
		...(etude.associes === undefined ? {} : { associes: etude.associes }),
		source: `Registre des entreprises${releveeLe === undefined ? '' : `, relevé du ${dateCourte(releveeLe)}`}`
	};
}

/** Un avocat relevé à l'annuaire du Conseil national des barreaux. */
export function proDAvocat(
	avocat: AvocatProposeAffiche,
	releveeLe?: string | null
): ProfessionnelAffiche {
	const lieu = [avocat.codePostal, avocat.ville]
		.filter((p) => p !== undefined && p !== '')
		.join(' ');
	return {
		cle: `avocat:${avocat.barreau}|${avocat.nom}|${avocat.prenom}`,
		role: 'AVOCAT',
		nom: `${avocat.prenom} ${avocat.nom}`.trim(),
		...(avocat.raisonSociale === undefined ? {} : { cabinet: avocat.raisonSociale }),
		barreau: avocat.barreau,
		...(avocat.adresse === undefined && lieu === ''
			? {}
			: {
					adresse: [avocat.adresse, lieu].filter((p) => p !== undefined && p !== '').join(', ')
				}),
		...(avocat.ville === undefined ? {} : { commune: avocat.ville }),
		specialites: avocat.specialites,
		...(avocat.siren === undefined ? {} : { siren: avocat.siren }),
		source: `Annuaire du Conseil national des barreaux${releveeLe === undefined || releveeLe === null ? '' : `, relevé du ${dateCourte(releveeLe)}`}`
	};
}

/** L'étude est-elle déjà au carnet ? Elle s'y reconnaît à son SIREN. */
export function etudeAuCarnet(
	carnet: readonly FicheIntervenant<string>[],
	etude: EtudeProposee
): boolean {
	return carnet.some((f) => f.role === 'COMMISSAIRE_DE_JUSTICE' && f.siren === etude.siren);
}

/** L'avocat est-il déjà au carnet ? À son nom et à son barreau, faute d'identifiant propre. */
export function avocatAuCarnet(
	carnet: readonly FicheIntervenant<string>[],
	avocat: AvocatProposeAffiche
): boolean {
	const nom = `${avocat.prenom} ${avocat.nom}`.trim();
	return carnet.some((f) => f.role === 'AVOCAT' && f.nom === nom && f.ressort === avocat.barreau);
}
