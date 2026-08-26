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
 * LE FOND SE POSE PAR `color` ET `variant`, JAMAIS À LA MAIN. La première
 * version écrivait `cladd-color-brand bg-cladd-primary text-cladd-on-primary`
 * sur le `className` du `Surface`, et le bloc sortait en texte blanc sur fond
 * clair, illisible.
 *
 * La raison est dans l'anatomie du composant : `Surface` peint son fond sur une
 * COUCHE ABSOLUE distincte, derrière le contenu. Un `bg-*` posé sur la racine
 * est donc recouvert par cette couche, qui rendait son remplissage neutre par
 * défaut. L'inversion du texte, elle, s'appliquait bien, puisqu'elle vient d'une
 * simple classe héritée. Fond clair, texte blanc.
 *
 * `variant="solid-fill"` fait les trois choses d'un coup, et correctement : il
 * peint l'accent SUR LA BONNE COUCHE, il inverse le texte, et il bascule le
 * liséré d'`outline` sur un jeton lisible par-dessus un aplat. La doc du kit
 * range précisément ce cas dans ses pièges, sous « Surface misuse ».
 *
 * L'ARGUMENT DE FOND N'EST PAS LA PEUR, C'EST LE DÉLAI DE LECTURE. Douze mois
 * de factures se lisent en une fois ; commencer en février laisse le temps de
 * corriger, commencer le 28 mars ne laisse que le temps de constater.
 */
export function Appel() {
	return (
		<SectionMarketing fond="page">
			<Surface
				color="brand"
				variant="solid-fill"
				outline
				className="rounded-cladd-2xl shadow-carte-levee"
				contentClassName="flex flex-col items-start gap-cladd-2xs p-cladd-md"
			>
				<span className="text-cladd-sm font-bold tracking-wide uppercase opacity-75">
					Campagne « ma cantine »
				</span>
				<h2 className="max-w-3xl text-letikette-titre leading-tight font-extrabold tracking-tight md:text-letikette-chiffre">
					La déclaration ferme le 31 mars. Le calcul, lui, prend douze mois de factures.
				</h2>
				<p className="max-w-2xl text-cladd-md leading-relaxed font-normal opacity-80">
					Elles se lisent en une fois, quel que soit le mois où vous commencez. La différence
					n&rsquo;est pas là : commencer tôt laisse le temps de déplacer quelques achats et de
					demander les attestations qui manquent. Commencer fin mars ne laisse que le temps de
					constater.
				</p>
				<div className="flex flex-col gap-cladd-3xs sm:flex-row sm:items-center">
					{/* Le bouton est une surface SOULEVÉE, pas un aplat d'accent. Sur un
					    bloc déjà rempli de bleu, un `solid-fill` de marque se noierait dans
					    son propre fond, et un `solid-fill` neutre sortirait noir. Un `solid`
					    remonte la rampe des surfaces, qui va vers le blanc en mode clair :
					    le bouton se pose en clair sur le bleu, ce qui est le contraste
					    maximal disponible. */}
					<Button
						as={Link}
						to="/inscription"
						variant="solid"
						size="lg"
						className="px-cladd-2xs shadow-carte"
					>
						Générer mon bilan EGalim
						<ArrowRightIcon />
					</Button>
					<span className="text-cladd-sm font-normal opacity-75">
						Aucune carte bancaire. Vous voyez vos taux avant de décider quoi que ce soit.
					</span>
				</div>
			</Surface>
		</SectionMarketing>
	);
}
