import { Link } from '@tanstack/react-router';
import { Button, Surface } from '@cladd-ui/react';
import { ArrowRightIcon } from 'lucide-react';

/**
 * La date, puis le bouton.
 *
 * POURQUOI LA DATE AVANT LE BOUTON. Une échéance déplace plus qu'un argument,
 * à condition d'être vraie et vérifiable. Le 31 mars n'est pas une urgence
 * fabriquée : c'est la fermeture de la campagne « ma cantine », et le gérant
 * peut le vérifier en trente secondes.
 *
 * Ce qu'on n'écrit pas : « plus que X jours », un compte à rebours, une offre
 * qui expire. La cible est un professionnel qui reconnaît ces ficelles à dix
 * mètres, et les reconnaître suffit à faire fermer l'onglet.
 *
 * L'ARGUMENT DE FOND N'EST PAS LA PEUR, C'EST LE DÉLAI DE LECTURE. Douze mois
 * de factures se lisent en une fois ; commencer en février laisse le temps de
 * corriger, commencer le 28 mars ne laisse que le temps de constater.
 */
export function Appel() {
	return (
		<section className="px-cladd-2xs py-cladd-md">
			<Surface
				outline
				className="rounded-cladd-2xl shadow-carte"
				contentClassName="flex flex-col items-start gap-cladd-2xs p-cladd-md"
			>
				<span className="text-cladd-2xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
					Campagne « ma cantine »
				</span>
				<h2 className="max-w-3xl text-letikette-titre leading-tight font-bold tracking-tight md:text-letikette-chiffre">
					La déclaration ferme le 31 mars. Le calcul, lui, prend douze mois de factures.
				</h2>
				<p className="max-w-2xl text-cladd-sm leading-relaxed text-cladd-fg-soft">
					Elles se lisent en une fois, quel que soit le mois où vous commencez. La différence
					n&rsquo;est pas là : commencer tôt laisse le temps de déplacer quelques achats et de
					demander les attestations qui manquent. Commencer fin mars ne laisse que le temps de
					constater.
				</p>
				<div className="flex flex-col gap-cladd-3xs sm:flex-row sm:items-center">
					<Button as={Link} to="/inscription" color="brand" variant="solid-fill" size="lg">
						Déposer mes premières factures
						<ArrowRightIcon />
					</Button>
					<span className="text-cladd-2xs text-cladd-fg-softer">
						Aucune carte bancaire. Vous voyez vos taux avant de décider quoi que ce soit.
					</span>
				</div>
			</Surface>
		</section>
	);
}
