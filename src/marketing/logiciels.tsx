import { LOGOS_DES_SERVICES } from '../ui/logos-services';
import { FORMATS_LUS, LOGICIELS_BRANCHES, type LogicielBranche } from './fonctionnalites';

/**
 * LES LOGICIELS QUI SE BRANCHENT — la bande sous le héros (14/10/2026).
 *
 * Lattice, Typeform et Contractbook posent leurs intégrations juste sous
 * l'accroche : la première objection d'un gérant est « je ne vais pas tout
 * ressaisir ». Une pastille par logiciel, son logo et son nom : un logo seul ne
 * se lit pas à 24 px.
 *
 * ⚠️ LA LISTE EST CELLE DU REGISTRE (`LOGICIELS_BRANCHES`), où vit aussi la
 * décision du fondateur de les montrer toutes (14/10/2026).
 *
 * ⚠️ AUCUN LOGO DE CLIENT. Ce sont les logiciels du GÉRANT : rien ici ne dit
 * qu'une entreprise utilise Letikette.
 */
function Logo({ logiciel }: { logiciel: LogicielBranche }) {
	if ('fichier' in logiciel.logo) {
		return (
			<img
				src={logiciel.logo.fichier}
				alt=""
				width={24}
				height={24}
				loading="lazy"
				decoding="async"
				className="size-6 shrink-0 rounded-md object-cover"
			/>
		);
	}
	const Dessin = LOGOS_DES_SERVICES[logiciel.logo.dessin];
	return Dessin === undefined ? null : <Dessin className="size-6 shrink-0" />;
}

export function BandeLogiciels() {
	return (
		<section
			id="logiciels"
			className="w-full scroll-mt-barre-publique border-b border-filet-creme bg-creme text-encre-site"
		>
			<div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-cladd-xs px-cladd-2xs py-cladd-xl text-center md:px-cladd-sm">
				<div className="apparait flex max-w-2xl flex-col gap-1">
					<h2 className="text-intertitre leading-snug font-semibold">
						Vos factures arrivent seules.
					</h2>
					<p className="text-cladd-md leading-relaxed text-encre-site-douce">
						Depuis votre logiciel, votre banque ou vos fichiers. Sans logiciel, un dépôt suffit :{' '}
						{FORMATS_LUS.join(', ')}.
					</p>
				</div>
				{/* UNE RANGÉE QUI GLISSE SUR TÉLÉPHONE : onze pastilles empilées y prenaient six
				    lignes. Au-delà, elles se rangent au centre. */}
				<ul className="carrousel -mx-cladd-2xs flex w-screen max-w-none gap-cladd-3xs overflow-x-auto px-cladd-2xs pb-1 md:mx-0 md:w-auto md:max-w-4xl md:flex-wrap md:justify-center md:overflow-visible md:px-0">
					{LOGICIELS_BRANCHES.map((logiciel) => (
						<li
							key={logiciel.nom}
							className="flex shrink-0 items-center gap-cladd-3xs rounded-full border border-filet-creme bg-papier py-1.5 pr-cladd-xs pl-1.5 text-cladd-sm font-semibold"
						>
							<Logo logiciel={logiciel} />
							{logiciel.nom}
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
