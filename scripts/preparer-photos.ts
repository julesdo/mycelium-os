/**
 * LES PHOTOGRAPHIES DE LA PAGE PUBLIQUE (06/10/2026).
 *
 * Le fondateur : « ça manque encore clairement d'humanité […] peut-être
 * d'images ». Des gens au travail — un artisan, un chauffeur, une commerçante,
 * un entrepôt, des factures sur une table —, choisis sur Unsplash sous sa
 * licence (usage commercial gratuit, sans attribution obligatoire ; on crédite
 * quand même, dans `public/CREDITS.md`).
 *
 * ⚠️ HÉBERGÉES PAR NOUS. Une image appelée chez Unsplash ferait d'Unsplash un
 * destinataire de l'adresse IP de chaque visiteur, donc une ligne de plus au
 * tableau des sous-traitants de la politique de confidentialité.
 *
 * ⚠️ AUCUN PRÉNOM À CÔTÉ D'UNE PHOTO. Ce sont des métiers, pas des clients : un
 * visage réel posé à côté d'un prénom se lirait comme un témoignage.
 *
 *     bun scripts/preparer-photos.ts
 *
 * Chaque photo sort en WebP, à 640 et 1280 px de large, dans `public/photos/`.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SORTIE = join(import.meta.dirname, '..', 'public', 'photos');

interface Photo {
	readonly nom: string;
	readonly unsplash: string;
	readonly auteur: string;
	/** Le cadrage : rapport largeur / hauteur de la sortie, `null` pour garder l'original. */
	readonly rapport: number | null;
}

export const PHOTOS: readonly Photo[] = [
	{
		nom: 'artisan',
		unsplash: 'photo-1687422810663-c316494f725a',
		auteur: 'Ali Mkumbwa (@mkumbwajr)',
		rapport: 4 / 5
	},
	{
		nom: 'chauffeur',
		unsplash: 'photo-1762095996527-126e49ef9d72',
		auteur: 'Polina Kuzovkova (@p_kuzovkova)',
		rapport: 4 / 3
	},
	{
		nom: 'factures',
		unsplash: 'photo-1635859890085-ec8cb5466806',
		auteur: 'Dimitri Karastelev (@dkfra19)',
		rapport: 3 / 2
	},
	{
		nom: 'commercante',
		unsplash: 'photo-1764173039506-c5cc7b8ec14b',
		auteur: 'Centre for Ageing Better (@ageing_better)',
		rapport: 4 / 5
	},
	{
		nom: 'entrepot',
		unsplash: 'photo-1664382953403-fc1ac77073a0',
		auteur: 'Centre for Ageing Better (@ageing_better)',
		rapport: 4 / 5
	}
];

async function main(): Promise<void> {
	mkdirSync(SORTIE, { recursive: true });
	for (const photo of PHOTOS) {
		const reponse = await fetch(
			`https://images.unsplash.com/${photo.unsplash}?w=2000&q=85&fm=jpg&fit=max`
		);
		if (!reponse.ok) throw new Error(`${photo.nom} : ${reponse.status}`);
		const original = Buffer.from(await reponse.arrayBuffer());
		for (const largeur of [640, 1280]) {
			const fichier = join(SORTIE, `${photo.nom}-${largeur}.webp`);
			const info = await sharp(original)
				.resize(
					photo.rapport === null
						? { width: largeur }
						: {
								width: largeur,
								height: Math.round(largeur / photo.rapport),
								fit: 'cover',
								position: 'attention'
							}
				)
				.webp({ quality: 72, effort: 6 })
				.toFile(fichier);
			console.log(
				`${photo.nom}-${largeur}.webp  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} Ko`
			);
		}
	}
}

await main();
