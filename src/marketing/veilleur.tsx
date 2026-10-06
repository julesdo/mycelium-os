import { cn, PictoEcheance, PictoRegistre, VeilleurAvatar } from '../ui';
import {
	Chapeau,
	SectionMarketing,
	SurTitre,
	TitreSection,
	fondDeTeinte,
	type TeinteSite
} from './section';

/**
 * LE VEILLEUR — ce qui travaille pendant que le gérant dort (06/10/2026).
 *
 * Il vient juste après le manifeste, et l'ordre est l'argument : la section
 * d'avant dit qu'une facture meurt sans bruit ; celle-ci est la seule réponse
 * honnête — non pas « nous récupérons votre argent », mais « ce jour-là,
 * quelque chose regardait ».
 *
 * Le personnage reste : c'est le même que dans le produit, et sur cette page il
 * est la seule figure. Il est posé dans un galet lavande, la teinte du temps.
 */
const TRAVAUX: readonly {
	readonly Signe: typeof PictoRegistre;
	readonly titre: string;
	readonly texte: string;
	readonly teinte: TeinteSite;
}[] = [
	{
		Signe: PictoRegistre,
		titre: 'Le registre',
		texte:
			'Les procédures collectives publiées la veille, relevées sur vos clients à vous. Un client solvable en janvier ne l’est pas toujours en juin.',
		teinte: 'argent'
	},
	{
		Signe: PictoEcheance,
		titre: 'La date limite pour agir',
		texte:
			'Chaque facture repassée, au régime du secteur de chacune. Ce qui entre dans le préavis vous est dit le jour où il y entre.',
		teinte: 'temps'
	}
];

export function Veilleur() {
	return (
		<SectionMarketing ton="creme" courbe className="gap-cladd-lg">
			<div className="grid items-center gap-cladd-lg md:grid-cols-12 md:gap-cladd-xl">
				<div className="relative flex justify-center py-cladd-sm md:col-span-4">
					<div aria-hidden className="galet galet-b inset-0 -z-10 bg-teinte-temps" />
					<VeilleurAvatar etat="TRAVAILLE" taille={150} className="text-encre-site" />
					<span className="manuscrit autocollant absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-papier px-cladd-2xs py-1 text-intertitre whitespace-nowrap">
						toutes les nuits
					</span>
				</div>
				<div className="flex flex-col gap-cladd-2xs md:col-span-8">
					<SurTitre teinte="temps">Le travail de fond</SurTitre>
					<TitreSection suite="Vous verrez ce qu’il a trouvé.">
						Vous ne le verrez jamais travailler.
					</TitreSection>
					<Chapeau>
						Il tourne pendant la nuit, sur vos clients et sur vos échéances. Au matin, vous lisez ce
						qui a changé.
					</Chapeau>
				</div>
			</div>

			<dl className="cascade grid gap-cladd-sm md:grid-cols-2 md:gap-cladd-2xs">
				{TRAVAUX.map(({ Signe, titre, texte, teinte }) => (
					<div
						key={titre}
						className={cn(
							'flex flex-col gap-cladd-3xs rounded-carte-site p-cladd-xs',
							fondDeTeinte(teinte)
						)}
					>
						<dt className="flex items-center gap-cladd-3xs">
							<span className="flex size-10 items-center justify-center rounded-full bg-papier">
								<Signe className="size-6 text-encre-site" />
							</span>
							<span className="text-intertitre leading-snug font-semibold">{titre}</span>
						</dt>
						<dd className="hidden text-cladd-md leading-relaxed text-encre-site-douce md:block">
							{texte}
						</dd>
					</div>
				))}
			</dl>

			<p className="max-w-3xl text-cladd-md leading-relaxed text-encre-site-douce">
				<span className="manuscrit text-intertitre text-encre-site">
					Il ne contacte jamais vos clients.
				</span>{' '}
				<span className="hidden md:inline">
					Il lit des registres publics et vos factures, et il vous rapporte. Ce que vous en faites,
					c’est votre décision.
				</span>
			</p>
		</SectionMarketing>
	);
}
