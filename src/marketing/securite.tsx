import { Link } from '@tanstack/react-router';
import { BanknoteIcon, LockIcon, PenLineIcon, Trash2Icon } from 'lucide-react';
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
 * ⚠️ RIEN QUI NE SOIT EN PLACE. Chaque ligne reprend une mesure de la section
 * « Sécurité » de la politique de confidentialité ou une ligne rouge du produit.
 * Pas de « hébergé en France » : la base est chez Convex, aux États-Unis
 * (politique de confidentialité, section 6).
 */
const GARDE_FOUS = [
	{
		Icone: PenLineIcon,
		titre: 'Rien ne part sans vous',
		texte:
			'Les relances partent à votre nom, une fois que vous les avez activées, et chacune se retient pendant l’heure qui précède son départ. Rien ne part vers un tribunal.'
	},
	{
		Icone: BanknoteIcon,
		titre: 'Aucun fonds ne transite par nous',
		texte: 'Vos clients paient sur votre compte. Aucun encaissement, aucune commission.'
	},
	{
		Icone: LockIcon,
		titre: 'Données chiffrées et cloisonnées',
		texte: 'Échanges en HTTPS, données séparées par entreprise, accès bancaires chiffrés (AES-256).'
	},
	{
		Icone: Trash2Icon,
		titre: 'Vos données restent les vôtres',
		texte: 'La suppression de votre espace efface l’intégralité de vos données.'
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
				<div className="apparait overflow-hidden rounded-carte-site md:col-span-2">
					<Photo
						photo="factures"
						description="Des factures étalées sur une table sombre, une main tenant un stylo au-dessus."
						sizes="(min-width: 768px) 420px, 90vw"
						className="aspect-3/2"
					/>
				</div>
			</div>

			{/* Chaque carte est une sous-grille (titre, texte) : les textes commencent à la
			    même hauteur même quand un titre tient sur deux lignes. */}
			<dl className="cascade grid gap-cladd-sm md:grid-cols-2 md:gap-cladd-2xs xl:grid-cols-4">
				{GARDE_FOUS.map(({ Icone, titre, texte }) => (
					<div
						key={titre}
						className="flex flex-col gap-cladd-3xs rounded-carte-site border border-creme-sur-encre/15 p-cladd-xs md:row-span-2 md:grid md:grid-rows-subgrid"
					>
						<dt className="flex flex-col items-start gap-cladd-2xs">
							<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-papier text-encre-site">
								<Icone aria-hidden size={20} />
							</span>
							<span className="text-intertitre leading-snug font-semibold">{titre}</span>
						</dt>
						<dd className="text-cladd-md leading-relaxed text-creme-sur-encre-douce">{texte}</dd>
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
