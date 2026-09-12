import { describe, expect, it } from 'vitest';
import { ceQuiManque } from '../ce-qui-manque';

/**
 * CE QUI VOUS EMPÊCHE D'AGIR — dit AVANT de se heurter au mur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT : LE PRODUIT SAVAIT, ET SE TAISAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trois choses bloquent le produit, et le produit connaît les trois. Aucune
 * n'était annoncée avant de se cogner dedans :
 *
 *   · SANS PROFIL CRÉANCIER, `creances.ts` passe `creancierCommercant:
 *     'unknown'` à la déduction — donc `entreCommercants` reste indéterminé, et
 *     l'éligibilité à l'injonction de payer n'est JAMAIS acquise. Le gérant
 *     voyait une condition non remplie, sans savoir que c'est SON identité qui
 *     manquait ;
 *   · SANS SIREN SUR UN DÉBITEUR, le radar de solvabilité ne peut pas
 *     l'interroger : il n'est pas surveillé, et rien ne le disait sur l'accueil ;
 *   · SANS FACTURE, le produit ne mesure rien du tout.
 *
 * ⚠️ CE N'EST PAS UNE LISTE DE COURSES, C'EST UNE LISTE DE VERROUS. Chaque
 * rangée dit CE QU'ELLE DÉBLOQUE. « Renseignez votre SIREN » est une corvée ;
 * « sans lui, aucune injonction de payer n'est possible » est une raison. La
 * différence décide si le gérant le fait ou le remet.
 *
 * ⚠️ ET ELLE DISPARAÎT QUAND ELLE EST VIDE. C'est ce qui la distingue du
 * veilleur, qui reste toujours : le veilleur rapporte un travail EN COURS, donc
 * il a toujours quelque chose à dire ; celle-ci rapporte ce qui RESTE, et
 * quand il ne reste rien, une carte « 3/3, tout est fait » est du décor qu'on
 * apprend à ignorer — et le jour où un verrou réapparaît, on ne la voit plus.
 */
describe('ce qui manque', () => {
	const TOUT_VA_BIEN = {
		profilCreancierComplet: true,
		nombreFactures: 12,
		debiteursSansSiren: 0
	};

	it('se tait quand plus rien ne bloque', () => {
		expect(ceQuiManque(TOUT_VA_BIEN)).toEqual([]);
	});

	it('dit ce que le profil créancier débloque, pas seulement qu’il manque', () => {
		const [verrou] = ceQuiManque({ ...TOUT_VA_BIEN, profilCreancierComplet: false });

		expect(verrou?.titre).toBe('Votre identité de créancier');
		// Le POURQUOI, et il est exact : c'est bien `entreCommercants` qui reste
		// indéterminé sans profil, donc l'injonction de payer qui reste fermée.
		expect(verrou?.debloque).toContain('injonction de payer');
		expect(verrou?.vers).toBe('/app/parametres/creancier');
	});

	it('compte les débiteurs que le radar ne peut pas suivre', () => {
		const [verrou] = ceQuiManque({ ...TOUT_VA_BIEN, debiteursSansSiren: 4 });

		expect(verrou?.titre).toBe('4 débiteurs sans identifiant');
		expect(verrou?.debloque).toContain('solvabilité');
		expect(verrou?.vers).toBe('/app/debiteurs');
	});

	it('accorde au singulier — un gérant ne lit pas « 1 débiteurs »', () => {
		const [verrou] = ceQuiManque({ ...TOUT_VA_BIEN, debiteursSansSiren: 1 });
		expect(verrou?.titre).toBe('1 débiteur sans identifiant');
	});

	it('met les factures EN PREMIER : sans elles, rien d’autre ne compte', () => {
		// ⚠️ L'ORDRE EST CELUI DU BLOCAGE, pas celui de la saisie. Sans facture,
		// le produit ne mesure rien : renseigner son SIREN d'abord ne débloque
		// rien de visible, et le gérant conclurait que ça n'a servi à rien.
		const verrous = ceQuiManque({
			profilCreancierComplet: false,
			nombreFactures: 0,
			debiteursSansSiren: 3
		});

		expect(verrous[0]?.vers).toBe('/app/import-factures');
	});

	it('ne réclame pas de débiteurs quand il n’y a aucune facture', () => {
		// Il n'y a pas encore de débiteur à identifier : l'annoncer serait
		// réclamer quelque chose d'impossible, ce qui apprend à ignorer la liste.
		const verrous = ceQuiManque({
			profilCreancierComplet: true,
			nombreFactures: 0,
			debiteursSansSiren: 0
		});

		expect(verrous).toHaveLength(1);
		expect(verrous[0]?.vers).toBe('/app/import-factures');
	});

	it('ne recommande jamais une procédure', () => {
		// Troisième ligne rouge : le produit énonce des CONSTATS. Dire « sans
		// SIREN, aucune injonction de payer n'est possible » est un constat sur
		// l'état du dossier ; « engagez une injonction de payer » serait du
		// conseil juridique.
		const INTERDITS = /engagez|vous devriez|il faut engager|saisissez le tribunal|déclarez/i;
		const verrous = ceQuiManque({
			profilCreancierComplet: false,
			nombreFactures: 5,
			debiteursSansSiren: 2
		});

		for (const verrou of verrous) {
			expect(verrou.titre).not.toMatch(INTERDITS);
			expect(verrou.debloque).not.toMatch(INTERDITS);
		}
	});
});
