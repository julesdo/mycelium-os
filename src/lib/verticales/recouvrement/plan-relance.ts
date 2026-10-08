/**
 * LE PLAN DE RELANCE — ce que le pilote fait d'un dossier, et quand.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL EXISTE (08/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit savait composer chaque lettre, mais c'était au gérant de décider
 * laquelle, quand, et de revenir y penser. Chaser, Upflow, Pennylane et Qonto
 * appliquent un scénario prêt à l'emploi à toute facture échue ; Vestiaire
 * Collective et Cash App disent la suite au futur (« si rien n'arrive d'ici le
 * 21, nous… »). Ce module est ce scénario, et la phrase au futur qu'il permet.
 *
 * ⚠️ CE NE SONT PAS DES VALEURS JURIDIQUES. Trois jours, dix jours : des choix
 * de cadence, comme ceux des outils du marché. Aucun délai légal ne vit ici ; la
 * lettre officielle porte, elle, le délai que le gérant laisse à son client.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CHAQUE ÉTAPE ATTEND LA PRÉCÉDENTE, PAS SEULEMENT LE CALENDRIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un dossier repris avec deux cents jours de retard ne reçoit pas la lettre
 * officielle d'emblée parce que sa date est passée depuis longtemps : il reçoit
 * le rappel aujourd'hui, le deuxième dix jours après, et ainsi de suite. La
 * première étape part de l'échéance ; chaque suivante part du jour où la
 * précédente a été faite. C'est ce qui garde l'asymétrie des relances
 * (`relance.ts`) : un premier contact ne menace jamais.
 *
 * ⚠️ UNE ÉTAPE PLUS AVANCÉE FAITE À LA MAIN VAUT LES PRÉCÉDENTES. Le gérant qui
 * a déjà envoyé une lettre officielle ne reçoit pas de proposition de « rappel
 * courtois » : ce serait reculer.
 */

export type CleEtapePlan = 'RAPPEL' | 'SECOND_RAPPEL' | 'LETTRE_OFFICIELLE' | 'CONSEIL';

export interface EtapePlan {
	readonly cle: CleEtapePlan;
	/** Le nom court, tel qu'une carte le porte : « Deuxième rappel ». */
	readonly nom: string;
	/**
	 * Les jours d'attente : après la plus ancienne échéance pour la première
	 * étape, après l'étape précédente pour les suivantes.
	 */
	readonly attente: number;
	/**
	 * ⚠️ `false` POUR CE QUI VA VERS UN TRIBUNAL. Le pilote relance seul ; il ne
	 * remet jamais un dossier à un avocat sans que le gérant le décide (ligne
	 * rouge n° 1 : rien ne part vers un tribunal depuis l'application).
	 */
	readonly automatique: boolean;
}

export const PLAN_PAR_DEFAUT: readonly EtapePlan[] = [
	{ cle: 'RAPPEL', nom: 'Rappel', attente: 3, automatique: true },
	{ cle: 'SECOND_RAPPEL', nom: 'Deuxième rappel', attente: 10, automatique: true },
	{ cle: 'LETTRE_OFFICIELLE', nom: 'Lettre officielle', attente: 10, automatique: true },
	{ cle: 'CONSEIL', nom: 'Remise à votre conseil', attente: 15, automatique: false }
];

export interface EtapeFaite {
	readonly cle: CleEtapePlan;
	/** Le jour où elle a été faite, en `AAAA-MM-JJ`. */
	readonly le: string;
}

export interface ProchaineEtape {
	readonly etape: EtapePlan;
	/**
	 * Le jour prévu, en `AAAA-MM-JJ`, jamais avant aujourd'hui : une étape dont la
	 * date calculée est passée est due aujourd'hui.
	 */
	readonly le: string;
	/** Vrai quand la date est arrivée : le pilote la fait à sa prochaine veille. */
	readonly due: boolean;
}

/** `iso` décalé de `jours` jours, compté en UTC. */
function decaler(iso: string, jours: number): string {
	const [annee, mois, jour] = iso.split('-').map(Number);
	return new Date(Date.UTC(annee!, mois! - 1, jour! + jours)).toISOString().slice(0, 10);
}

/**
 * LA PROCHAINE ÉTAPE D'UN DOSSIER, ou `null` quand le plan est au bout.
 *
 * @param ancre la plus ancienne date d'exigibilité des factures du dossier
 * @param faites les étapes déjà faites, dans n'importe quel ordre
 */
export function prochaineEtape({
	ancre,
	faites,
	aujourdHui,
	plan = PLAN_PAR_DEFAUT
}: {
	readonly ancre: string;
	readonly faites: readonly EtapeFaite[];
	readonly aujourdHui: string;
	readonly plan?: readonly EtapePlan[];
}): ProchaineEtape | null {
	// La plus avancée des étapes faites : tout ce qui la précède est réputé fait.
	let rangFait = -1;
	let faiteLe: string | null = null;
	for (const faite of faites) {
		const rang = plan.findIndex((etape) => etape.cle === faite.cle);
		if (rang > rangFait || (rang === rangFait && faiteLe !== null && faite.le > faiteLe)) {
			rangFait = rang;
			faiteLe = faite.le;
		}
	}

	const suivante = plan[rangFait + 1];
	if (suivante === undefined) return null;

	const depart = rangFait < 0 || faiteLe === null ? ancre : faiteLe;
	const prevu = decaler(depart, suivante.attente);
	const le = prevu < aujourdHui ? aujourdHui : prevu;
	return { etape: suivante, le, due: le <= aujourdHui };
}

/**
 * LA SUITE DU PLAN, À PARTIR DE LA PROCHAINE ÉTAPE — la frise au futur.
 *
 * Chaque date suppose que la précédente se fait le jour prévu : c'est une
 * projection, et l'écran le dit (« si rien n'arrive »). Un paiement l'arrête.
 */
export function suiteDuPlan(args: {
	readonly ancre: string;
	readonly faites: readonly EtapeFaite[];
	readonly aujourdHui: string;
	readonly plan?: readonly EtapePlan[];
}): readonly ProchaineEtape[] {
	const plan = args.plan ?? PLAN_PAR_DEFAUT;
	const suite: ProchaineEtape[] = [];
	const faites = [...args.faites];
	for (let i = 0; i < plan.length; i++) {
		const prochaine = prochaineEtape({ ...args, plan, faites });
		if (prochaine === null) break;
		suite.push(prochaine);
		faites.push({ cle: prochaine.etape.cle, le: prochaine.le });
	}
	return suite;
}
