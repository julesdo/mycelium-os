import { useState } from 'react';
import { SectionAppel } from './appel';
import { SectionBlog } from './blog';
import { articlesDuSite, prochainArticle } from './blog-demo';
import { CoquilleDuSite } from './coquille';
import { SectionLoi } from './loi';
import { SectionMetiers } from './metiers';
import { SectionPlume } from './plume';
import { BandeDesPreuves } from './preuves';
import { SectionSecurite } from './securite';
import { SectionTarifs } from './tarifs';
import { EnTete } from './tete';
import { SectionTout } from './tout';

/** L'ACCUEIL DU SITE, D'APRÈS LA MAQUETTE V26 (28/10/2026), section par section. */
export function PageSite() {
	// Lus une fois, au premier rendu : le récit du blog ne recommence pas à chaque rendu.
	const [{ articles, prochain }] = useState(() => {
		const maintenant = Date.now();
		return { articles: articlesDuSite(maintenant), prochain: prochainArticle(maintenant) };
	});
	return (
		<CoquilleDuSite articles={articles}>
			<EnTete />
			<BandeDesPreuves />
			<SectionLoi />
			<SectionPlume />
			<SectionTout />
			<SectionMetiers />
			<SectionSecurite />
			<SectionTarifs />
			<SectionBlog articles={articles} prochain={prochain} />
			<SectionAppel />
		</CoquilleDuSite>
	);
}
