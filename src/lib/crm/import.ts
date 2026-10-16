import type { ChampImport } from './colonnes';
import type { Cible, StatutProspect } from './statuts';
import { normaliserEmail } from './empreinte';

/**
 * CE QU'UN IMPORT FERAIT, AVANT DE LE FAIRE (16/10/2026).
 *
 * Rien ne s'écrit avant « Importer » : cette fonction dit les lignes qui entreront
 * et celles qui seront écartées, avec leur raison — la ligne d'exemple du tableur,
 * une ligne sans entreprise, une adresse en opposition, un doublon (par e-mail ou
 * SIREN, déjà connu ou répété dans le fichier). Le serveur la rejoue à l'import.
 *
 * Le statut se déduit de la ligne : inscrit, « stop », réponse positive ou
 * négative, relances, premier contact. Une réponse « stop » devient une
 * opposition : le prospect entre sans coordonnées, et son adresse va à la liste.
 */

export interface ProspectImporte {
	readonly entreprise: string;
	readonly siren?: string;
	readonly activite?: string;
	readonly effectif?: string;
	readonly ville?: string;
	readonly dirigeant?: string;
	readonly fonction?: string;
	readonly email?: string;
	readonly telephone?: string;
	readonly site?: string;
	readonly trouveOu?: string;
	readonly cible: Cible;
	readonly statut: StatutProspect;
	readonly prochaineAction?: string;
	readonly prochaineActionLe?: number;
	readonly dernierContactLe?: number;
	readonly notes?: string;
}

export type RaisonDEcart = 'EXEMPLE' | 'SANS_ENTREPRISE' | 'OPPOSITION' | 'DOUBLON';

export interface BilanDImport {
	readonly aImporter: ProspectImporte[];
	readonly ecartees: {
		readonly ligne: number;
		readonly raison: RaisonDEcart;
		readonly entreprise: string;
	}[];
	/** Les adresses des lignes « stop », à ajouter à la liste d'opposition. */
	readonly oppositionsNouvelles: string[];
}

/** « 16/10/2026 » → midi UTC de ce jour ; une date qui n'existe pas → `null`. */
export function dateFrancaise(valeur: string): number | null {
	const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(valeur);
	if (m === null) return null;
	const [jour, mois, annee] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const t = Date.UTC(annee, mois - 1, jour, 12);
	const d = new Date(t);
	// Date.UTC roule le 30 février sur le 2 mars : on vérifie que le jour existe.
	if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) {
		return null;
	}
	return t;
}

function propre(valeur: string | undefined): string | undefined {
	const v = valeur?.trim().slice(0, 300);
	return v ? v : undefined;
}

function cibleDe(valeur: string | undefined): Cible {
	const v = (valeur ?? '').toLowerCase();
	if (v.includes('cabinet') || v.includes('comptable')) return 'CABINET';
	if (v === '' || v.includes('pme')) return 'PME';
	return 'AUTRE';
}

function oui(valeur: string | undefined): boolean {
	return /^\s*(oui|o|yes|x)\s*$/i.test(valeur ?? '');
}

function statutDe(c: Partial<Record<ChampImport, string>>): StatutProspect {
	const reponse = (c.reponse ?? '').toLowerCase();
	if (oui(c.inscrit)) return 'INSCRIT';
	if (reponse.includes('stop')) return 'STOP';
	if (reponse.includes('positive')) return 'INTERESSE';
	if (reponse.includes('negative') || reponse.includes('négative')) return 'PERDU';
	if (dateFrancaise(c.relance1Le ?? '') !== null || dateFrancaise(c.relance2Le ?? '') !== null) {
		return 'RELANCE';
	}
	if (dateFrancaise(c.premierContactLe ?? '') !== null) return 'CONTACTE';
	return 'A_CONTACTER';
}

export function verifierImport(
	lignes: readonly (readonly string[])[],
	association: readonly (ChampImport | null)[],
	existants: { readonly emails: ReadonlySet<string>; readonly sirens: ReadonlySet<string> },
	enOpposition: (emailNormalise: string) => boolean
): BilanDImport {
	const aImporter: ProspectImporte[] = [];
	const ecartees: BilanDImport['ecartees'][number][] = [];
	const oppositionsNouvelles: string[] = [];
	const emailsVus = new Set<string>();
	const sirensVus = new Set<string>();

	lignes.forEach((valeurs, ligne) => {
		const c: Partial<Record<ChampImport, string>> = {};
		association.forEach((champ, i) => {
			if (champ !== null && valeurs[i] !== undefined) c[champ] = valeurs[i];
		});
		const entreprise = propre(c.entreprise) ?? '';
		const email = propre(c.email) === undefined ? undefined : normaliserEmail(c.email ?? '');
		const sirenBrut = (c.siren ?? '').replace(/\D/g, '');
		const siren = sirenBrut.length === 9 ? sirenBrut : undefined;

		if (/^exemple\b/i.test(entreprise)) {
			ecartees.push({ ligne, raison: 'EXEMPLE', entreprise });
			return;
		}
		if (entreprise === '') {
			ecartees.push({ ligne, raison: 'SANS_ENTREPRISE', entreprise });
			return;
		}
		if (email !== undefined && enOpposition(email)) {
			ecartees.push({ ligne, raison: 'OPPOSITION', entreprise });
			return;
		}
		const doublon =
			(email !== undefined && (existants.emails.has(email) || emailsVus.has(email))) ||
			(siren !== undefined && (existants.sirens.has(siren) || sirensVus.has(siren)));
		if (doublon) {
			ecartees.push({ ligne, raison: 'DOUBLON', entreprise });
			return;
		}
		if (email !== undefined) emailsVus.add(email);
		if (siren !== undefined) sirensVus.add(siren);

		const statut = statutDe(c);
		const contacts = [c.premierContactLe, c.relance1Le, c.relance2Le]
			.map((v) => dateFrancaise(v ?? ''))
			.filter((v): v is number => v !== null);
		const notes = [
			c.canal ? `Canal : ${c.canal.trim()}` : '',
			c.modele ? `Modèle : ${c.modele.trim()}` : '',
			c.objection ? `Objection : ${c.objection.trim()}` : '',
			c.formule ? `Formule : ${c.formule.trim()}` : '',
			oui(c.abonne) ? 'Abonné' : '',
			c.notes?.trim() ?? ''
		]
			.filter((n) => n !== '')
			.join('. ');
		const prochaineActionLe = dateFrancaise(c.prochaineActionLe ?? '');

		// « Stop » : l'adresse va à la liste d'opposition, les coordonnées ne sont pas gardées.
		const stop = statut === 'STOP';
		if (stop && email !== undefined) oppositionsNouvelles.push(email);
		const optionnel = (cle: string, v: string | undefined) => (v === undefined ? {} : { [cle]: v });

		aImporter.push({
			entreprise,
			cible: cibleDe(c.cible),
			statut,
			...(siren === undefined ? {} : { siren }),
			...optionnel('activite', propre(c.activite)),
			...optionnel('effectif', propre(c.effectif)),
			...optionnel('ville', propre(c.ville)),
			...optionnel('site', propre(c.site)),
			...optionnel('trouveOu', propre(c.trouveOu)),
			...(stop
				? {}
				: {
						...optionnel('dirigeant', propre(c.dirigeant)),
						...optionnel('fonction', propre(c.fonction)),
						...optionnel('email', email),
						...optionnel('telephone', propre(c.telephone))
					}),
			...optionnel('prochaineAction', stop ? undefined : propre(c.prochaineAction)),
			...(prochaineActionLe === null || stop ? {} : { prochaineActionLe }),
			...(contacts.length === 0 ? {} : { dernierContactLe: Math.max(...contacts) }),
			...(notes === '' ? {} : { notes })
		});
	});

	return { aImporter, ecartees, oppositionsNouvelles };
}
