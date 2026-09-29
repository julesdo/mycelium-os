import { describe, it, expect } from 'vitest';
import { join, relative, sep } from 'node:path';
import { LEGAL_CONFIG } from '../config/legal';
import { fichiersSources, lire, textesDInterface } from './textes-interface';

/**
 * LA SEULE PAGE DU PRODUIT QU'UN TIERS REGARDE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CE TEST TIENT, ET POURQUOI IL EXISTE À PART
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tout le reste du produit se lit entre le gérant et son logiciel. Cette
 * page-ci se lit entre le gérant et SON CLIENT — et un client qui y lirait le
 * nom d'un tiers y verrait un mandat de recouvrement, c'est-à-dire précisément
 * l'activité que ce produit n'exerce pas (ligne rouge n° 1).
 *
 * Les gabarits de courrier ont déjà leur barrière (`relance.test.ts`, « ne
 * nomme jamais le logiciel »), et le PDF vide ses métadonnées d'auteur
 * (`courrier-pdf.ts`). Cette page est la troisième surface transmise, et elle
 * n'en avait aucune.
 *
 * ⚠️ ET ELLE NE MENACE DE RIEN. Une page de règlement n'est pas une mise en
 * demeure : elle montre un décompte arrêté et où payer. Annoncer une procédure
 * ferait deux choses interdites d'un coup — recommander une voie (ligne rouge
 * n° 3) et faire parler ce logiciel à la place du créancier.
 */

const SURFACE_TRANSMISE = [
	join('src', 'screens', 'paiement.tsx'),
	join('src', 'ui', 'qr-virement.tsx'),
	join('src', 'routes', 'p.$jeton.tsx')
];

function textesDeLaPage(): { chemin: string; ligne: number; texte: string }[] {
	const trouves: { chemin: string; ligne: number; texte: string }[] = [];
	for (const local of SURFACE_TRANSMISE) {
		const chemin = join(process.cwd(), local);
		for (const { ligne, texte } of textesDInterface(lire(chemin), chemin)) {
			trouves.push({ chemin: local.split(sep).join('/'), ligne, texte });
		}
	}
	return trouves;
}

describe('la page où le client paie', () => {
	it('le balayage voit bien les trois fichiers', () => {
		// ⚠️ UN TEST QUI NE LIT RIEN PASSE TOUJOURS. Un fichier renommé ferait
		// disparaître la barrière en silence ; celui-ci tombe en le nommant.
		for (const local of SURFACE_TRANSMISE) {
			const existe = fichiersSources(join(process.cwd(), 'src')).some(
				(chemin) => relative(process.cwd(), chemin) === local
			);
			expect(existe, local).toBe(true);
		}
		expect(textesDeLaPage().length).toBeGreaterThan(10);
	});

	it('ne nomme jamais ce logiciel', () => {
		// Le nom vient du registre, pas d'un littéral : le jour où la marque
		// change, la barrière suit sans qu'on y pense.
		const marque = new RegExp(LEGAL_CONFIG.brandName, 'i');
		for (const { chemin, ligne, texte } of textesDeLaPage()) {
			expect(texte, `${chemin}:${ligne}`).not.toMatch(marque);
		}
	});

	it('ne menace d’aucune procédure et ne recommande aucune voie', () => {
		const INTERDITS =
			/injonction|assignation|tribunal|huissier|commissaire de justice|contentieux|poursuite|mise en demeure|saisie/i;
		for (const { chemin, ligne, texte } of textesDeLaPage()) {
			expect(texte, `${chemin}:${ligne}`).not.toMatch(INTERDITS);
		}
	});

	it('ne demande rien au client : aucun formulaire ne remonte d’ici', () => {
		// ⚠️ CE PRODUIT NE REÇOIT NI FONDS NI RÉPONSE DU DÉBITEUR. Un champ de
		// saisie, une case à cocher ou un bouton d'envoi sur cette page ferait
		// entrer une réponse du client dans le logiciel — et c'est exactement ce
		// que la ligne rouge n° 1 exclut. Une question se pose au créancier, à son
		// adresse, depuis la messagerie du client.
		const source = SURFACE_TRANSMISE.map((local) => lire(join(process.cwd(), local))).join('\n');
		for (const balise of ['<form', '<input', '<textarea', '<select', 'Checkbox', 'useMutation']) {
			expect(source, balise).not.toContain(balise);
		}
	});
});
