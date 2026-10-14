import { Link } from '@tanstack/react-router';
import {
	BanknoteIcon,
	EyeOffIcon,
	FileLockIcon,
	GlobeIcon,
	KeyRoundIcon,
	LockIcon,
	PenLineIcon,
	Trash2Icon
} from 'lucide-react';
import type { ComponentType } from 'react';
import { delaiPourRetenir } from './fonctionnalites';
import { Chapeau, EcranProduit, SectionMarketing, TitreSection } from './section';

/**
 * LA PAGE « SÉCURITÉ » (14/10/2026) — comment nous protégeons vos données.
 *
 * Wise a sa page « How we keep your money safe », liée depuis sa section :
 * c'est la question qu'un gérant se pose avant de déposer ses factures et ses
 * relevés. La section de l'accueil dit six mesures en une ligne ; celle-ci dit
 * comment elles marchent, et ce qu'elles ne font pas.
 *
 * ⚠️ RIEN QUI NE SOIT EN PLACE, ET RIEN DE PLUS que la section « Sécurité » et
 * la section 6 de la politique de confidentialité (`docs/juridique/
 * 03-politique-de-confidentialite.md`), qui font foi. Jamais « hébergé en
 * France » : la base est chez Convex aux États-Unis. Jamais un chiffrement
 * présenté comme hors de notre portée : nos serveurs détiennent les clés, et
 * un document part au prestataire de lecture. La page le dit, elle aussi.
 *
 * ⚠️ AUCUN NUMÉRO D'ARTICLE NI AUCUN DÉLAI LÉGAL ÉCRIT ICI : ils vivent dans la
 * politique de confidentialité, vers laquelle la page renvoie.
 */
interface Mesure {
	readonly Icone: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
	readonly titre: string;
	readonly lignes: readonly string[];
}

const MESURES: readonly Mesure[] = [
	{
		Icone: FileLockIcon,
		titre: 'Vos documents, scellés dès l’arrivée',
		lignes: [
			'Chaque document déposé est chiffré en AES-256-GCM avant toute lecture, sous une clé propre à votre entreprise.',
			'Cette clé est elle-même chiffrée par une clé maîtresse conservée hors de la base de données. Le fichier d’origine, en clair, est effacé une fois le document scellé.',
			'Le format de chaque document est vérifié dans son contenu, et son empreinte relevée au dépôt est revérifiée à chaque ouverture.'
		]
	},
	{
		Icone: KeyRoundIcon,
		titre: 'Aucun lien durable vers un document',
		lignes: [
			'Un document s’ouvre par votre session, au moyen d’un jeton à usage unique valable une minute.',
			'Chaque dépôt, ouverture, téléchargement et retrait s’inscrit au journal du document, que vous consultez depuis l’application.'
		]
	},
	{
		Icone: LockIcon,
		titre: 'Votre compte et vos données, séparés',
		lignes: [
			'Les données de chaque entreprise sont cloisonnées, à chaque requête, et des tests automatiques le vérifient.',
			'Les mots de passe sont stockés sous forme de condensats, jamais en clair ; une clé d’accès (passkey) est disponible ; chaque accès est nominatif.',
			'Les échanges sont chiffrés en HTTPS strict, et les jetons de vos connexions bancaires chiffrés en base.'
		]
	},
	{
		Icone: GlobeIcon,
		titre: 'Où sont vos données',
		lignes: [
			'La base de données et les fichiers sont hébergés par Convex, aux États-Unis, sous les clauses contractuelles types de la Commission européenne. L’application s’exécute à Paris.',
			'Pour être lu, un document déposé est transmis à notre prestataire de lecture, Anthropic, aux États-Unis. Une facture électronique (Factur-X) est lue sur nos propres serveurs, sans sortir.'
		]
	},
	{
		Icone: EyeOffIcon,
		titre: 'Ce que ce chiffrement ne fait pas',
		lignes: [
			'Nos serveurs détiennent les clés : le chiffrement protège les fichiers stockés, une copie du stockage ou une adresse qui fuiterait. Il ne met pas vos documents hors de notre portée.',
			'Un document est déchiffré en mémoire, le temps de sa lecture.'
		]
	},
	{
		Icone: Trash2Icon,
		titre: 'Quand vous partez',
		lignes: [
			'Supprimer votre espace efface l’intégralité de vos données, en commençant par la clé de vos documents : ils deviennent illisibles avant même que leurs fichiers soient effacés.',
			'Si un incident touchait vos données, nous le notifierions à la CNIL et aux personnes concernées, dans les délais que fixe le RGPD.'
		]
	}
];

export function PageSecurite() {
	return (
		<>
			<SectionMarketing ton="creme" className="gap-cladd-lg pt-36 md:pt-44">
				<div className="grid items-center gap-cladd-lg md:grid-cols-5">
					<div className="flex flex-col gap-cladd-2xs md:col-span-3">
						<h1 className="font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
							Comment nous protégeons vos données
						</h1>
						<Chapeau>
							Les mesures en place, et ce qu’elles ne font pas. Le détail, avec nos prestataires et
							leur pays, est dans notre{' '}
							<Link to="/politique-de-confidentialite" className="underline underline-offset-4">
								politique de confidentialité
							</Link>
							.
						</Chapeau>
					</div>
					{/* L'écran coupé dans sa carte : le bas du téléphone sort par le bord. */}
					<div className="flex h-80 justify-center overflow-clip rounded-carte-site bg-teinte-papiers px-cladd-xs pt-cladd-xs md:col-span-2 md:h-96">
						<EcranProduit
							capture="coffre"
							prioritaire
							description="Le coffre-fort de Letikette : cinq documents, tous chiffrés avec la clé de votre établissement."
							className="w-56 self-start"
						/>
					</div>
				</div>
			</SectionMarketing>

			<SectionMarketing ton="profond" className="gap-cladd-lg">
				<div className="grid gap-cladd-sm md:grid-cols-2">
					{MESURES.map(({ Icone, titre, lignes }) => (
						<article
							key={titre}
							className="flex flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude md:p-cladd-sm"
						>
							<span className="flex size-11 items-center justify-center rounded-full bg-creme-profonde">
								<Icone size={20} aria-hidden />
							</span>
							<h2 className="text-intertitre leading-snug font-semibold">{titre}</h2>
							<ul className="flex flex-col gap-cladd-3xs">
								{lignes.map((ligne) => (
									<li key={ligne} className="text-cladd-md leading-relaxed text-encre-site-douce">
										{ligne}
									</li>
								))}
							</ul>
						</article>
					))}
				</div>
			</SectionMarketing>

			<SectionMarketing ton="encre" className="gap-cladd-lg">
				<TitreSection suite="sur vos clients et votre argent.">Et vous gardez la main</TitreSection>
				<dl className="grid gap-cladd-sm md:grid-cols-2">
					<div className="flex flex-col gap-cladd-3xs">
						<dt className="flex items-center gap-cladd-3xs text-intertitre font-semibold">
							<PenLineIcon size={20} aria-hidden />
							Rien ne part sans vous
						</dt>
						<dd className="text-cladd-md leading-relaxed text-creme-sur-encre-douce">
							Les relances partent à votre nom, une fois que vous les avez activées, et chacune se
							retient pendant {delaiPourRetenir()} qui précède son départ. Rien ne part vers un
							tribunal.
						</dd>
					</div>
					<div className="flex flex-col gap-cladd-3xs">
						<dt className="flex items-center gap-cladd-3xs text-intertitre font-semibold">
							<BanknoteIcon size={20} aria-hidden />
							Aucun fonds ne transite par nous
						</dt>
						<dd className="text-cladd-md leading-relaxed text-creme-sur-encre-douce">
							Vos clients paient par virement, sur votre compte. Aucun encaissement, aucune
							commission.
						</dd>
					</div>
				</dl>
			</SectionMarketing>
		</>
	);
}
