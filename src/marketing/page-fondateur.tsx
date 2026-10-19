import { LEGAL_CONFIG, getLegalEmailAddress } from '../lib/config/legal';
import { Chapeau, SectionMarketing, TitreSection } from './section';

/**
 * QUI EST DERRIÈRE LETIKETTE (19/10/2026, audit stratégique, décision 14).
 *
 * L'identité est lue dans `LEGAL_CONFIG` (celle des mentions légales), jamais retapée.
 * ⚠️ AUCUN VISAGE INVENTÉ, AUCUNE CITATION PRÊTÉE : pas de photo tant que le fondateur n'en
 * a pas fourni une, et pas de « mot du fondateur » écrit à sa place. La page dit qui
 * édite le logiciel, ce qu'il s'interdit, et comment le joindre.
 */
export function PageFondateur() {
	const email = getLegalEmailAddress();
	const engagements = [
		'Letikette ne touche jamais l’argent de vos clients : ils vous paient directement, sur votre compte.',
		'Rien ne part vers un tribunal depuis le logiciel. Ce qui relève d’un avocat ou d’un commissaire de justice passe par celui que vous choisissez.',
		'Aucune commission sur ce qui rentre : un abonnement, ou un devis pour ce qui se demande.',
		'Le logiciel montre ce que dit la loi et ce qu’il y a dans vos factures ; c’est vous qui décidez.'
	];
	return (
		<>
			<SectionMarketing ton="creme" className="gap-cladd-lg pt-36 md:pt-44">
				<div className="flex max-w-3xl flex-col gap-cladd-2xs">
					<p className="text-cladd-sm font-semibold text-encre-site-douce">Qui sommes-nous</p>
					<h1 className="font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
						{LEGAL_CONFIG.directeurPublication}, fondateur de {LEGAL_CONFIG.brandName}.
					</h1>
					<Chapeau>
						{LEGAL_CONFIG.brandName} est édité par {LEGAL_CONFIG.companyName},{' '}
						{LEGAL_CONFIG.legalForm.toLowerCase()}, SIREN{' '}
						{LEGAL_CONFIG.siren.replace(/ /g, '\u00a0')}. Une facture impayée ne fait aucun bruit le
						jour où elle devient irrécouvrable : le logiciel existe pour que ce jour-là se voie à
						l’avance.
					</Chapeau>
				</div>
			</SectionMarketing>
			<SectionMarketing ton="creme" className="gap-cladd-sm pt-0 md:pt-0">
				<TitreSection>Ce que {LEGAL_CONFIG.brandName} s’interdit</TitreSection>
				<ul className="flex max-w-3xl flex-col gap-cladd-3xs">
					{engagements.map((e) => (
						<li
							key={e}
							className="rounded-carte-site bg-papier p-cladd-xs text-cladd-md leading-relaxed shadow-carte-chaude"
						>
							{e}
						</li>
					))}
				</ul>
				<p className="max-w-3xl text-cladd-md leading-relaxed text-encre-site-douce">
					Pour écrire au fondateur :{' '}
					<a href={`mailto:${email}`} className="font-semibold underline underline-offset-4">
						{email}
					</a>
					. Par téléphone :{' '}
					<a
						href={`tel:${LEGAL_CONFIG.telephoneAppelable}`}
						className="font-semibold underline underline-offset-4"
					>
						{LEGAL_CONFIG.telephone}
					</a>
					.
				</p>
			</SectionMarketing>
		</>
	);
}
