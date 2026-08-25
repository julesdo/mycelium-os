import { Link } from '@tanstack/react-router';
import { Button, Surface } from '@cladd-ui/react';
import { ArrowRightIcon } from 'lucide-react';
import { SectionMarketing } from './section';

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
 * LE BLOC PORTE LE BLEU DE LA MARQUE, la section reste sur le beige. C'est
 * délibérément différent de la section de preuve, qui est un aplat pleine
 * largeur. Deux aplats identiques à quelques écrans d'intervalle se
 * neutraliseraient ; ici le bleu revient comme un objet posé, ce qui referme la
 * page sans répéter l'effet.
 *
 * L'ARGUMENT DE FOND N'EST PAS LA PEUR, C'EST LE DÉLAI DE LECTURE. Douze mois
 * de factures se lisent en une fois ; commencer en février laisse le temps de
 * corriger, commencer le 28 mars ne laisse que le temps de constater.
 */
export function Appel() {
	return (
		<SectionMarketing fond="page">
			<Surface
				outline
				className="cladd-color-brand rounded-cladd-2xl bg-cladd-primary text-cladd-on-primary shadow-carte-levee"
				contentClassName="flex flex-col items-start gap-cladd-2xs p-cladd-md"
			>
				<span className="text-cladd-sm font-bold tracking-wide text-cladd-on-primary/75 uppercase">
					Campagne « ma cantine »
				</span>
				<h2 className="max-w-3xl text-letikette-titre leading-tight font-extrabold tracking-tight md:text-letikette-chiffre">
					La déclaration ferme le 31 mars. Le calcul, lui, prend douze mois de factures.
				</h2>
				<p className="max-w-2xl text-cladd-md leading-relaxed font-normal text-cladd-on-primary/80">
					Elles se lisent en une fois, quel que soit le mois où vous commencez. La différence
					n&rsquo;est pas là : commencer tôt laisse le temps de déplacer quelques achats et de
					demander les attestations qui manquent. Commencer fin mars ne laisse que le temps de
					constater.
				</p>
				<div className="flex flex-col gap-cladd-3xs sm:flex-row sm:items-center">
					{/* Le bouton s'inverse : blanc sur le bleu du bloc. `solid-fill` en
					    couleur de marque disparaîtrait dans son propre fond. */}
					<Button
						as={Link}
						to="/inscription"
						color="neutral"
						variant="solid-fill"
						size="lg"
						className="px-cladd-2xs shadow-carte"
					>
						Générer mon bilan EGalim
						<ArrowRightIcon />
					</Button>
					<span className="text-cladd-sm font-normal text-cladd-on-primary/75">
						Aucune carte bancaire. Vous voyez vos taux avant de décider quoi que ce soit.
					</span>
				</div>
			</Surface>
		</SectionMarketing>
	);
}
