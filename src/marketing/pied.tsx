import { Link } from '@tanstack/react-router';
import { LogoLetikette, MotLetikette } from '../ui';
import { LEGAL_CONFIG, getLegalEmailAddress } from '../lib/config/legal';

/**
 * Le pied de page.
 *
 * IL NE PROMET AUCUNE PAGE QUI N'EXISTE PAS. Les conditions générales et la
 * politique de confidentialité restent à rédiger — c'est consigné dans
 * `docs/agri/mentions-legales-a-rediger.md` et c'est un travail de juriste, pas
 * de développeur. Un pied de page qui les lierait vers un 404 ferait exactement
 * l'inverse de ce qu'il cherche : il abîmerait la confiance au moment où le
 * visiteur vérifie à qui il a affaire.
 *
 * Ce qui y figure vient donc d'une source unique, `LEGAL_CONFIG`, pour que
 * l'identité affichée ici ne puisse pas diverger de celle des documents.
 */
export function Pied() {
	return (
		<footer className="w-full border-t border-cladd-bg-outline bg-cladd-bg">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-cladd-2xs px-cladd-2xs py-cladd-md">
			<div className="flex flex-wrap items-center gap-cladd-3xs">
				<LogoLetikette className="size-cladd-sm shrink-0" />
				<MotLetikette />
				<div className="ml-auto flex flex-wrap items-center gap-cladd-3xs">
					<Link
						to="/connexion"
						className="text-cladd-xs text-cladd-fg-soft underline underline-offset-4 hover:text-cladd-fg"
					>
						Se connecter
					</Link>
					<Link
						to="/inscription"
						className="text-cladd-xs text-cladd-fg-soft underline underline-offset-4 hover:text-cladd-fg"
					>
						Créer un compte
					</Link>
					<a
						href={`mailto:${getLegalEmailAddress()}`}
						className="text-cladd-xs text-cladd-fg-soft underline underline-offset-4 hover:text-cladd-fg"
					>
						{getLegalEmailAddress()}
					</a>
				</div>
			</div>

			<p className="max-w-3xl text-cladd-xs leading-relaxed font-normal text-cladd-fg-softer">
				{LEGAL_CONFIG.companyName}, {LEGAL_CONFIG.legalForm}. SIRET {LEGAL_CONFIG.siret}. TVA{' '}
				{LEGAL_CONFIG.vatNumber}. {LEGAL_CONFIG.address}.
			</p>

			<p className="max-w-3xl text-cladd-xs leading-relaxed font-normal text-cladd-fg-softer">
				Letikette mesure votre taux de produits durables et biologiques, le documente et le fait
				progresser, selon une obligation de moyens. La télédéclaration sur « ma cantine » reste
				établie et signée par votre établissement.
			</p>
			</div>
		</footer>
	);
}
