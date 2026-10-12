import { describe, expect, it } from 'vitest';
import {
	CleMaitresseInvalide,
	cleMaitresseDepuis,
	desceller,
	desenvelopper,
	empreinteDe,
	enBase64,
	envelopper,
	sceller,
	tirerUneCle
} from '../chiffrement';
import { nomPropre, tailleLisible, verdictAvantEnvoi, verdictDesOctets } from '../fichiers';

const octets = (texte: string) => new TextEncoder().encode(texte);

describe('le chiffrement du coffre', () => {
	it('scelle et rouvre un document, sous la même clé et le même établissement', async () => {
		const cle = tirerUneCle();
		const document = octets('Facture FA-2026-0042 — 12 000,00 €');
		const { chiffre, iv } = await sceller(document, cle, 'org-durand');
		expect(new TextDecoder().decode(chiffre)).not.toContain('FA-2026-0042');
		// Comparé en texte : l'environnement de test crée ses tableaux dans deux royaumes.
		expect(new TextDecoder().decode(await desceller(chiffre, iv, cle, 'org-durand'))).toBe(
			'Facture FA-2026-0042 — 12 000,00 €'
		);
	});

	it('refuse d’ouvrir un chiffré modifié d’un seul bit', async () => {
		const cle = tirerUneCle();
		const { chiffre, iv } = await sceller(octets('montant : 12 000,00 €'), cle, 'org');
		const abime = chiffre.slice();
		abime[3] = (abime[3] ?? 0) ^ 1;
		await expect(desceller(abime, iv, cle, 'org')).rejects.toThrow();
	});

	it('refuse d’ouvrir sous un autre établissement, même avec la bonne clé', async () => {
		const cle = tirerUneCle();
		const { chiffre, iv } = await sceller(octets('pièce'), cle, 'org-a');
		await expect(desceller(chiffre, iv, cle, 'org-b')).rejects.toThrow();
	});

	it('tire un vecteur neuf à chaque scellement', async () => {
		const cle = tirerUneCle();
		const premier = await sceller(octets('même document'), cle, 'org');
		const second = await sceller(octets('même document'), cle, 'org');
		expect(premier.iv).not.toBe(second.iv);
		expect(enBase64(premier.chiffre)).not.toBe(enBase64(second.chiffre));
	});

	it('enveloppe la clé d’un établissement sous la clé maîtresse, et seulement elle', async () => {
		const maitresse = tirerUneCle();
		const cle = tirerUneCle();
		const enveloppe = await envelopper(cle, maitresse);
		expect(enveloppe).not.toContain(enBase64(cle));
		expect(await desenvelopper(enveloppe, maitresse)).toEqual(cle);
		await expect(desenvelopper(enveloppe, tirerUneCle())).rejects.toThrow();
	});

	it('nomme une clé maîtresse absente ou mal formée au lieu de la deviner', () => {
		expect(() => cleMaitresseDepuis(undefined)).toThrow(CleMaitresseInvalide);
		expect(() => cleMaitresseDepuis('')).toThrow(/n’est pas posée/);
		expect(() => cleMaitresseDepuis(enBase64(new Uint8Array(16)))).toThrow(/16 octets/);
		expect(cleMaitresseDepuis(enBase64(new Uint8Array(32).fill(7)))).toHaveLength(32);
	});

	it('calcule l’empreinte SHA-256 publiée pour « abc »', async () => {
		expect(await empreinteDe(octets('abc'))).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		);
	});
});

describe('ce qui entre au coffre', () => {
	const PDF = octets('%PDF-1.7\n1 0 obj << >> endobj');
	const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

	it('accepte un PDF, une photo et un export texte dont les octets disent la même chose que le nom', () => {
		expect(verdictDesOctets(PDF, 'facture.pdf')).toEqual({
			accepte: true,
			nature: 'PDF',
			mime: 'application/pdf'
		});
		expect(verdictDesOctets(PNG, 'bon.png')).toMatchObject({ accepte: true, mime: 'image/png' });
		expect(verdictDesOctets(octets('JournalCode\tJournalLib\n'), 'FEC.txt')).toMatchObject({
			accepte: true,
			nature: 'TEXTE'
		});
	});

	it('refuse un exécutable renommé en .pdf, et une photo qui n’en est pas une', () => {
		const executable = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]);
		expect(verdictDesOctets(executable, 'facture.pdf')).toMatchObject({ accepte: false });
		expect(verdictDesOctets(PDF, 'photo.jpg')).toMatchObject({ accepte: false });
		expect(verdictDesOctets(executable, 'export.csv')).toMatchObject({ accepte: false });
	});

	it('refuse avant l’envoi ce qui est vide, trop lourd ou hors de la liste', () => {
		expect(verdictAvantEnvoi('a.pdf', 0)).toMatchObject({ accepte: false });
		expect(verdictAvantEnvoi('a.pdf', 25 * 1024 * 1024)).toMatchObject({ accepte: false });
		expect(verdictAvantEnvoi('page.svg', 100)).toMatchObject({ accepte: false });
		expect(verdictAvantEnvoi('IMG_0001.HEIC', 100)).toMatchObject({ accepte: false });
		expect(verdictAvantEnvoi('Facture.PDF', 100)).toMatchObject({ accepte: true, nature: 'PDF' });
	});

	it('nettoie un nom de fichier : ni chemin, ni caractère de contrôle', () => {
		expect(nomPropre('../../etc/facture.pdf')).toBe('facture.pdf');
		expect(nomPropre('C:\\Users\\moi\\bon\nde livraison.pdf')).toBe('bonde livraison.pdf');
		expect(nomPropre('   ')).toBe('document');
	});

	it('écrit une taille comme on la lit', () => {
		expect(tailleLisible(840 * 1024)).toBe('840 Ko');
		expect(tailleLisible(2.4 * 1024 * 1024)).toBe('2,4 Mo');
	});
});
