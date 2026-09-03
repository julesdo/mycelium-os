import { Link } from '@tanstack/react-router';
import { LogoLetikette, MotLetikette } from '../ui';
import { LEGAL_CONFIG, getLegalEmailAddress } from '../lib/config/legal';

/**
 * Le pied de page.
 *
 * IL NE PROMET AUCUNE PAGE QUI N'EXISTE PAS. Les conditions générales et la
 * politique de confidentialité sont rédigées — voir `docs/juridique/` — mais
 * elles attendent la relecture d'un juriste et n'ont pas encore de route
 * publique. Un pied de page qui les lierait vers un 404 ferait exactement
 * l'inverse de ce qu'il cherche : il abîmerait la confiance au moment où le
 * visiteur vérifie à qui il a affaire.
 *
 * Ce qui y figure vient d'une source unique, `LEGAL_CONFIG`, pour que l'identité
 * affichée ici ne puisse pas diverger de celle des documents.
 *
 * IL EST EN ENCRE, ET C'EST LA TROISIÈME FOIS. La page se termine sur le même
 * fond que la section qui la précède, sans filet entre les deux : l'appel à
 * l'action et le pied ne font qu'un seul bloc sombre, et la page se referme d'un
 * coup au lieu de s'effilocher en trois bandes.
 */
export function Pied() {
	return (
		<footer className="encre-tramee w-full text-plume-inversee">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-cladd-2xs border-t border-trait-encre px-cladd-2xs py-cladd-xl">
				<div className="flex flex-wrap items-center gap-cladd-3xs">
					<LogoLetikette className="size-cladd-sm shrink-0" />
					<MotLetikette />
					<div className="ml-auto flex flex-wrap items-center gap-cladd-2xs">
						<Link
							to="/connexion"
							className="py-cladd-3xs text-cladd-sm text-plume-inversee-douce underline underline-offset-4 hover:text-plume-inversee"
						>
							Se connecter
						</Link>
						<Link
							to="/inscription"
							className="py-cladd-3xs text-cladd-sm text-plume-inversee-douce underline underline-offset-4 hover:text-plume-inversee"
						>
							Créer un compte
						</Link>
						<a
							href={`mailto:${getLegalEmailAddress()}`}
							className="py-cladd-3xs text-cladd-sm text-plume-inversee-douce underline underline-offset-4 hover:text-plume-inversee"
						>
							{getLegalEmailAddress()}
						</a>
					</div>
				</div>

				<p className="max-w-3xl border-t border-trait-encre pt-cladd-2xs text-cladd-sm leading-relaxed font-normal text-plume-inversee-douce">
					{LEGAL_CONFIG.companyName}, {LEGAL_CONFIG.legalForm}. SIRET {LEGAL_CONFIG.siret}. TVA{' '}
					{LEGAL_CONFIG.vatNumber}. {LEGAL_CONFIG.address}.
				</p>

				<p className="max-w-3xl text-cladd-sm leading-relaxed font-normal text-plume-inversee-douce">
					Letikette mesure vos créances, les documente et surveille leurs échéances, selon une
					obligation de moyens. Il n’exerce aucune activité de recouvrement pour compte de tiers,
					ne manipule aucun fonds et ne délivre aucun conseil juridique. Toute décision d’engager
					une procédure reste la vôtre.
				</p>
			</div>
		</footer>
	);
}
