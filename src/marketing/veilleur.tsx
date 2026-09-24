import { PictoEcheance, PictoRegistre, ScenePointeur, VeilleurAvatar } from '../ui';
import { SectionMarketing } from './section';

/**
 * LE VEILLEUR, SUR LA PAGE PUBLIQUE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE PRODUIT AVAIT UN PERSONNAGE, ET LE SITE NE L'AVAIT JAMAIS MONTRÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `VeilleurAvatar` existe depuis des semaines et vit dans la barre de
 * l'application, sur tous les écrans : une orbite, un balayage qui tourne quand
 * la machine travaille, un iris qui respire quand elle veille. Son en-tête dit
 * pourquoi il a un visage — « un travail de fond qui ne se manifeste que sur un
 * écran n'est pas un travail de fond : c'est un rapport qu'on va consulter ».
 *
 * Le verdict sur la page était « il manque de l'âme ». Elle en avait une, à
 * trois fichiers de là, déjà dessinée et déjà animée. Le réflexe aurait été
 * d'aller chercher une illustration ; la bonne réponse était de montrer ce que
 * le produit EST.
 *
 * ⚠️ ET C'EST LE SEUL ENDROIT DE LA PAGE OÙ UNE COULEUR APPARAÎT. L'iris prend
 * l'encre de marque, comme dans l'application. Sur une page en noir et blanc,
 * c'est le point de vie — et il est à sa place : c'est la machine qui est
 * vivante, pas la mise en page.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI ICI, ENTRE LE MANIFESTE ET LES LIMITES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La section précédente pose le problème en une phrase : « une facture impayée
 * ne fait aucun bruit le jour où elle devient irrécouvrable ». Celle-ci est la
 * réponse, et c'est la seule que ce produit puisse donner honnêtement — non pas
 * « nous récupérons votre argent », mais « ce jour-là, quelque chose regardait ».
 *
 * ⚠️ AUCUNE HEURE D'HORLOGE, ET C'EST UNE RÈGLE QUI A DÉJÀ MORDU. Les tâches de
 * fond sont programmées en **UTC** dans `crons.ts` : quatre heures y deviennent
 * six à Paris l'été et cinq l'hiver. Une page qui vend l'exactitude au centime
 * ne peut pas se tromper d'heure sur la seule chose qu'elle raconte du travail
 * de nuit. Ce qui reste vrai en toute saison : c'est la NUIT, et le point du
 * matin arrive AVANT la première heure de bureau.
 */

const TRAVAUX = [
	{
		Signe: PictoRegistre,
		titre: 'Le registre',
		texte:
			'Les procédures collectives publiées la veille, relevées sur vos débiteurs à vous. Un client solvable en janvier ne l’est pas en juin.'
	},
	{
		Signe: PictoEcheance,
		titre: 'La prescription',
		texte:
			'Chaque facture repassée, au régime du secteur de chacune. Ce qui entre dans le préavis vous est dit le jour où il y entre.'
	}
];

export function Veilleur() {
	return (
		<SectionMarketing>
			<div className="flex items-center justify-between gap-cladd-2xs border-b border-dashed border-filet-nuit pb-cladd-3xs text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase">
				<span>Le travail de fond</span>
				<span>Toutes les nuits</span>
			</div>

			{/*
			  ⚠️ L'AVATAR EST DANS L'ÉTAT « TRAVAILLE », et c'est le seul état qui ait
			  un sens ici. `VEILLE` ne montrerait qu'un iris qui respire — juste, mais
			  illisible à l'arrêt sur une page qu'on parcourt. `ROMPU` dirait que la
			  surveillance est interrompue, ce qui est le pire mensonge que cette
			  vitrine pourrait faire.

			  Il est grand : à vingt-six pixels dans la barre de l'application, il est
			  une pastille ; à cent-quarante, c'est un objet qu'on regarde tourner, et
			  c'est ce qu'on vient chercher.
			*/}
			<ScenePointeur className="grid items-center gap-cladd-2xl md:grid-cols-12 md:gap-cladd-2xs">
				<div className="suit-pointeur-milieu flex justify-center md:col-span-4 md:justify-start">
					<VeilleurAvatar etat="TRAVAILLE" taille={140} className="text-craie-douce" />
				</div>

				<div className="flex flex-col gap-cladd-2xs md:col-span-8">
					<h2 className="apparait max-w-3xl font-affiche text-titre-section leading-tight font-semibold tracking-titre-section text-balance">
						Vous ne le verrez jamais travailler.{' '}
						<span className="text-craie-claire">Vous verrez ce qu’il a trouvé.</span>
					</h2>
					<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
						Il tourne pendant la nuit, sur vos débiteurs et sur vos échéances. Au matin, vous
						lisez ce qui a changé.
					</p>
				</div>
			</ScenePointeur>

			<dl className="cascade grid gap-cladd-sm md:grid-cols-2 md:gap-cladd-2xs">
				{TRAVAUX.map(({ Signe, titre, texte }) => (
					<div
						key={titre}
						className="flex flex-col gap-cladd-3xs border-t border-dashed border-filet-nuit pt-cladd-3xs"
					>
						<dt className="flex items-center gap-cladd-3xs">
							<Signe className="size-7 text-craie-douce" />
							<span className="text-intertitre leading-snug font-semibold">{titre}</span>
						</dt>
						<dd className="text-cladd-md leading-relaxed font-normal text-craie-douce">{texte}</dd>
					</div>
				))}
			</dl>

			{/*
			  ⚠️ CE QU'IL NE FAIT PAS SE DIT ICI, ET PAS SEULEMENT DANS LA SECTION DES
			  LIMITES. Un personnage qui travaille la nuit sur vos clients est
			  exactement l'image qui peut faire croire qu'il les RELANCE. La première
			  ligne rouge du produit l'interdit, et le meilleur endroit pour la
			  rappeler est celui où le malentendu naît, pas trois écrans plus bas.
			*/}
			<p className="max-w-3xl text-cladd-sm leading-relaxed font-normal text-craie-claire">
				Il ne contacte jamais vos clients. Il lit des registres publics et vos
				factures, et il vous rapporte. Ce que vous en faites, c’est votre décision, pas la
				mienne.
			</p>
		</SectionMarketing>
	);
}
