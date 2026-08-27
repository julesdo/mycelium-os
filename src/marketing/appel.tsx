import { Link } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
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
 * ELLE EST SUR L'ENCRE, PLEINE LARGEUR, ET PLUS DANS UN BLOC POSÉ. La version
 * précédente peignait un rectangle bleu arrondi au milieu du beige : un bouton
 * géant, c'est-à-dire l'objet le plus reconnaissable d'un gabarit de logiciel.
 * En pleine largeur, la page se ferme comme elle s'est ouverte — par un aplat
 * qui va d'un bord à l'autre — et l'encre revient là où elle a du sens : sur ce
 * qui engage.
 *
 * DEUX SECTIONS D'ENCRE, ET AUCUNE RÉPÉTITION D'EFFET. Celle de la preuve porte
 * un document blanc en son centre ; celle-ci n'en porte aucun. L'une montre, et
 * l'autre demande.
 *
 * LE BOUTON EST BLANC SUR L'ENCRE, en angles droits. Sur un aplat sombre, un
 * `solid-fill` de marque se noierait dans son propre bleu ; le contraste maximal
 * disponible est le papier lui-même, qui est aussi le fond du reste de la page.
 *
 * L'ARGUMENT DE FOND N'EST PAS LA PEUR, C'EST LE DÉLAI DE LECTURE. Douze mois
 * de factures se lisent en une fois ; commencer en février laisse le temps de
 * corriger, commencer le 28 mars ne laisse que le temps de constater.
 */
export function Appel() {
	return (
		<SectionMarketing fond="encre" filet={false} className="gap-cladd-2xs">
			<span className="text-cladd-2xs font-semibold tracking-widest text-plume-inversee-douce uppercase">
				Campagne « ma cantine »
			</span>
			<h2 className="max-w-4xl font-serif text-titre-section-etroite leading-tight font-medium tracking-tight md:text-affiche">
				La déclaration ferme le 31 mars. Le calcul, lui, prend douze mois de factures.
			</h2>
			<p className="max-w-2xl text-chapeau leading-relaxed font-normal text-plume-inversee-douce">
				Elles se lisent en une fois, quel que soit le mois où vous commencez. La différence
				n&rsquo;est pas là : commencer tôt laisse le temps de déplacer quelques achats et de
				demander les attestations qui manquent. Commencer fin mars ne laisse que le temps de
				constater.
			</p>
			<div className="flex flex-col items-start gap-cladd-3xs pt-cladd-3xs sm:flex-row sm:items-center">
				<Button
					as={Link}
					to="/inscription"
					variant="solid"
					size="lg"
					className="rounded-none px-cladd-2xs"
				>
					Générer mon bilan EGalim
					<ArrowRightIcon />
				</Button>
				<span className="text-cladd-sm font-normal text-plume-inversee-douce">
					Aucune carte bancaire. Vous voyez vos taux avant de décider quoi que ce soit.
				</span>
			</div>
		</SectionMarketing>
	);
}
