import { Link } from '@tanstack/react-router';
import { Button, Surface } from '@cladd-ui/react';
import { ArrowRightIcon } from 'lucide-react';
import { LogoLetikette, MotLetikette, TauxEGalim } from '../ui';
import { useVisible, useCompteur } from './mouvement';

/**
 * L'entrée.
 *
 * CE QU'ELLE DOIT FAIRE EN SEPT SECONDES : dire à un chef de cuisine collective
 * qu'il a une obligation qu'il connaît mal, que son chiffre existe déjà dans
 * ses factures, et qu'il peut le voir aujourd'hui.
 *
 * Ce qu'elle ne fait pas : promettre. Le mot « garantie » est proscrit dans tout
 * le produit et un test balaie l'interface pour l'attraper. Ici on va plus loin
 * que le mot — on ne promet pas non plus un résultat par une tournure détournée.
 * Le logiciel mesure. Ce que le gérant achète ne dépend que de lui.
 *
 * LA DÉMONSTRATION EST LE VRAI COMPOSANT. `TauxEGalim` est la jauge de
 * l'application, pas une reproduction : elle déduit son état de seuil de la
 * mesure qu'on lui passe. En animant la mesure plutôt que la barre, elle
 * traverse ses couleurs comme elle le fait chez un client, et le visiteur voit
 * exactement l'écran qu'il aura.
 *
 * Les chiffres sont ceux d'une cantine qui n'est pas conforme, et c'est
 * délibéré : montrer trois jauges vertes vendrait le produit sur un mensonge et
 * ne dirait rien de ce qu'il sert à faire.
 */

/**
 * Chaque jauge porte SA base de calcul, pas un écart figé.
 *
 * L'écart en euros et la barre décrivent la même chose. S'ils s'animaient
 * séparément ils se contrediraient à mi-course : une barre à 12 % annoncerait
 * l'écart d'une barre à 39 %. L'écart est donc DÉDUIT de la mesure courante,
 * ce qui est aussi la façon dont il se calcule dans l'application.
 *
 * Les bases sont celles du jeu de démonstration du showroom : 180 000 € d'achats
 * sur l'exercice, dont 61 200 € de viande et de poisson.
 */
const DEMO = [
	{ titre: 'Produits durables', mesure: 0.39, seuil: 0.5, base: 180_000 },
	{ titre: 'dont bio', mesure: 0.21, seuil: 0.2, base: 180_000 },
	{ titre: 'Viande et poisson', mesure: 0.42, seuil: 0.6, base: 61_200 }
] as const;

export function Hero() {
	const { cible, visible } = useVisible<HTMLDivElement>('-8%');

	return (
		<section className="flex flex-col gap-cladd-md px-cladd-2xs pt-cladd-2xs pb-cladd-md md:pt-cladd-md">
			<header className="flex items-center gap-cladd-3xs">
				<LogoLetikette className="size-11 shrink-0" />
				<MotLetikette />
				<span className="ml-auto flex items-center gap-cladd-3xs">
					<Button as={Link} to="/connexion" variant="solid">
						Se connecter
					</Button>
				</span>
			</header>

			<div className="flex flex-col items-start gap-cladd-2xs">
				<span className="text-cladd-2xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
					Restauration collective · déclaration avant le 31 mars
				</span>

				<h1 className="max-w-4xl text-letikette-chiffre leading-tight font-bold tracking-tight md:text-letikette-taux">
					Vos trois taux EGalim sont déjà dans vos factures.
				</h1>

				<p className="max-w-2xl text-cladd-md leading-relaxed text-cladd-fg-soft">
					Ils s&rsquo;en sortent ligne par ligne, sur douze mois, en valeur d&rsquo;achat hors
					taxes. Letikette fait ce calcul et vous montre, pour chaque produit, pourquoi il compte
					ou pourquoi il ne compte pas.
				</p>

				<div className="flex flex-col gap-cladd-3xs sm:flex-row sm:items-center">
					<Button as={Link} to="/inscription" color="brand" variant="solid-fill" size="lg">
						Déposer mes premières factures
						<ArrowRightIcon />
					</Button>
					<a
						href="#comment"
						className="px-cladd-3xs py-cladd-3xs text-cladd-sm font-medium text-cladd-fg-soft underline underline-offset-4 hover:text-cladd-fg"
					>
						Voir ce que ça donne
					</a>
				</div>
			</div>

			<div ref={cible}>
				<Surface
					outline
					className="rounded-cladd-2xl shadow-carte"
					contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
				>
					{/*
					  « Exemple » est écrit, et il n'est pas décoratif. Sans lui, un
					  visiteur peut prendre ces trois taux pour une moyenne du secteur
					  ou pour un résultat obtenu chez un client. Ce sont des chiffres
					  de démonstration, et une page qui vend l'auditabilité ne peut pas
					  se permettre d'être floue sur l'origine de ses propres nombres.
					*/}
					<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
						<span className="flex items-baseline gap-cladd-3xs">
							<span className="text-cladd-sm font-semibold">Exercice 2026</span>
							<span className="rounded-full bg-cladd-surface-cut px-2 py-0.5 text-cladd-3xs font-semibold text-cladd-fg-softer uppercase">
								Exemple
							</span>
						</span>
						<span className="text-cladd-2xs text-cladd-fg-softer">
							1 842 lignes lues · 7 fournisseurs · 180 000 € d&rsquo;achats
						</span>
					</div>
					<div className="grid gap-cladd-2xs md:grid-cols-3">
						{DEMO.map((t) => (
							<Jauge key={t.titre} {...t} actif={visible} />
						))}
					</div>
				</Surface>
			</div>
		</section>
	);
}

function Jauge({
	titre,
	mesure,
	seuil,
	base,
	actif
}: {
	titre: string;
	mesure: number;
	seuil: number;
	base: number;
	actif: boolean;
}) {
	const anime = useCompteur(mesure, actif);
	const ecart = Math.max(0, Math.round((seuil - anime) * base));
	return <TauxEGalim titre={titre} mesure={anime} seuil={seuil} ecartEuros={ecart} />;
}
