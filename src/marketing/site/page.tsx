import { SectionAppel } from './appel';
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
	return (
		<CoquilleDuSite>
			<EnTete />
			<BandeDesPreuves />
			<SectionLoi />
			<SectionPlume />
			<SectionTout />
			<SectionMetiers />
			<SectionSecurite />
			<SectionTarifs />
			<SectionAppel />
		</CoquilleDuSite>
	);
}
