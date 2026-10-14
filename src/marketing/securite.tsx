import { Link } from '@tanstack/react-router';
import {
	BanknoteIcon,
	FileLockIcon,
	LockIcon,
	PenLineIcon,
	ScrollTextIcon,
	Trash2Icon
} from 'lucide-react';
import { delaiPourRetenir } from './fonctionnalites';
import { Photo, SectionMarketing, TitreSection } from './section';

/**
 * SÉCURITÉ — ce qui rassure, en faits vérifiables (06/10/2026).
 *
 * Remplace quatre sections : le manifeste (« une facture impayée ne fait aucun
 * bruit… »), le veilleur, « Ce que Letikette ne fera jamais » et « Pourquoi un
 * abonnement ». Le fondateur jugeait le ton peu rassurant ; les logiciels du
 * métier (Stripe, Maze, Customer.io) rassurent par une section SÉCURITÉ : quatre
 * garde-fous, une ligne chacun, et le lien vers le détail.
 *
 * ⚠️ SIX DEPUIS LE 14/10/2026 : le coffre-fort y est entré (scellé à l'arrivée,
 * une clé par établissement, chaque accès noté), et la suppression de l'espace
 * efface la clé en premier (`docs/superpowers/specs/2026-10-12-coffre-fort.md`).
 *
 * ⚠️ RIEN QUI NE SOIT EN PLACE. Chaque ligne reprend une mesure de la section
 * « Sécurité » de la politique de confidentialité ou une ligne rouge du produit.
 * Pas de « hébergé en France » : la base est chez Convex, aux États-Unis
 * (politique de confidentialité, section 6).
 */
const GARDE_FOUS = [
	{
		Icone: FileLockIcon,
		titre: 'Scellé dès l’arrivée',
		texte:
			'Chaque document est chiffré en AES-256 avant toute lecture, avec une clé propre à votre entreprise.'
	},
	{
		Icone: ScrollTextIcon,
		titre: 'Chaque accès noté',
		texte:
			'Une ouverture, un téléchargement, un retrait : tout s’inscrit au journal du document, avec qui et quand.'
	},
	{
		Icone: PenLineIcon,
		titre: 'Rien ne part sans vous',
		texte: `Les relances partent à votre nom, une fois que vous les avez activées, et chacune se retient pendant ${delaiPourRetenir()} qui précède son départ. Rien ne part vers un tribunal.`
	},
	{
		Icone: BanknoteIcon,
		titre: 'Aucun fonds ne transite par nous',
		texte: 'Vos clients paient sur votre compte. Aucun encaissement, aucune commission.'
	},
	{
		Icone: LockIcon,
		titre: 'Données cloisonnées',
		texte:
			'Les données de chaque entreprise sont séparées, les échanges chiffrés en HTTPS, vos accès bancaires chiffrés.'
	},
	{
		Icone: Trash2Icon,
		titre: 'Vos données restent les vôtres',
		texte:
			'Supprimer votre espace efface l’intégralité de vos données, en commençant par la clé de vos documents.'
	}
] as const;

export function Securite() {
	return (
		<SectionMarketing id="securite" ton="encre" className="gap-cladd-lg">
			<div className="grid w-full items-center gap-cladd-lg md:grid-cols-5">
				<div className="flex flex-col gap-cladd-2xs md:col-span-3">
					<TitreSection suite="sur vos clients et sur votre argent.">
						Vous gardez la main
					</TitreSection>
				</div>
				{/* La photo, au-delà du téléphone seulement : sur un petit écran, les six
				    mesures se lisent d'abord. */}
				<div className="apparait hidden overflow-hidden rounded-carte-site md:col-span-2 md:block">
					<Photo
						photo="factures"
						description="Des factures étalées sur une table sombre, une main tenant un stylo au-dessus."
						sizes="(min-width: 768px) 420px, 90vw"
						className="aspect-3/2"
					/>
				</div>
			</div>

			{/* DES RANGÉES SUR TÉLÉPHONE, DES CARTES AU-DELÀ. Six cartes empilées
			    faisaient 2 400 px sur un téléphone : la mesure se lit aussi bien en
			    rangée, son pictogramme à gauche. Au-delà, chaque carte est une
			    sous-grille (titre, texte) : les textes commencent à la même hauteur. */}
			<dl className="cascade grid gap-cladd-xs md:grid-cols-2 md:gap-cladd-2xs lg:grid-cols-3">
				{GARDE_FOUS.map(({ Icone, titre, texte }) => (
					<div
						key={titre}
						className="flex flex-col gap-1 md:row-span-2 md:grid md:grid-rows-subgrid md:gap-cladd-3xs md:rounded-carte-site md:border md:border-creme-sur-encre/15 md:p-cladd-xs"
					>
						<dt className="flex items-center gap-cladd-3xs md:flex-col md:items-start md:gap-cladd-2xs">
							<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-papier text-encre-site">
								<Icone aria-hidden size={20} />
							</span>
							<span className="text-intertitre leading-snug font-semibold">{titre}</span>
						</dt>
						{/* Sur téléphone, le texte s'aligne sous le titre, pas sous le pictogramme. */}
						<dd className="pl-13 text-cladd-md leading-relaxed text-creme-sur-encre-douce md:pl-0">
							{texte}
						</dd>
					</div>
				))}
			</dl>

			<Link
				to="/politique-de-confidentialite"
				className="text-cladd-sm text-creme-sur-encre-douce underline underline-offset-4 transition-colors hover:text-creme-sur-encre"
			>
				Le détail dans notre politique de confidentialité
			</Link>
		</SectionMarketing>
	);
}
