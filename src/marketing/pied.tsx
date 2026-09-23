import { Link } from '@tanstack/react-router';
import { LogoLetikette, MotLetikette } from '../ui';
import { LEGAL_CONFIG, getLegalEmailAddress } from '../lib/config/legal';

/**
 * Le pied de page.
 *
 * IL LIE ENFIN LES QUATRE PAGES LÉGALES, ET C'EST RÉCENT. Il a longtemps porté
 * la note inverse : « les conditions générales et la politique de
 * confidentialité sont rédigées — voir `docs/juridique/` — mais elles attendent
 * la relecture d'un juriste et n'ont pas encore de route publique ». Un pied de
 * page qui aurait lié vers un 404 aurait abîmé la confiance au moment même où
 * le visiteur vérifie à qui il a affaire, donc l'abstention était juste.
 *
 * ⚠️ CE QUI A LEVÉ CE BLOCAGE N'EST PAS UNE RELECTURE, C'EST UNE DÉCISION. Le
 * 21 septembre 2026, Jules a tranché de se passer d'avocat et de se documenter
 * lui-même. La prémisse de la note avait donc disparu, et le code ne le savait
 * pas. Les documents ont été réécrits le 23 septembre — les trois quarts
 * décrivaient encore EGalim — et publiés.
 *
 * ⚠️ ET LE TÉLÉPHONE EST LÀ PARCE QUE LA LOI L'EXIGE. L'article 1-1, I de la
 * LCEN impose un numéro de téléphone de l'éditeur. Son absence, et celle du
 * directeur de la publication, était l'autre raison — jamais écrite — pour
 * laquelle ces pages ne pouvaient pas sortir.
 *
 * Ce qui y figure vient d'une source unique, `LEGAL_CONFIG`, pour que l'identité
 * affichée ici ne puisse pas diverger de celle des documents.
 *
 * IL EST EN ENCRE, ET C'EST LA TROISIÈME FOIS. La page se termine sur le même
 * fond que la section qui la précède, sans filet entre les deux : l'appel à
 * l'action et le pied ne font qu'un seul bloc sombre, et la page se referme d'un
 * coup au lieu de s'effilocher en trois bandes.
 */
/** La classe des quatre liens légaux, écrite une fois : seules les adresses se répètent. */
const LIEN_LEGAL =
	'py-cladd-3xs text-cladd-sm text-craie-douce underline underline-offset-4 hover:text-craie';

export function Pied() {
	return (
		<footer className="w-full bg-nuit text-craie">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-cladd-2xs border-t border-filet-nuit px-cladd-2xs py-cladd-xl">
				<div className="flex flex-wrap items-center gap-cladd-3xs">
					<LogoLetikette className="size-cladd-sm shrink-0" />
					<MotLetikette />
					<div className="ml-auto flex flex-wrap items-center gap-cladd-2xs">
						<Link
							to="/connexion"
							className="py-cladd-3xs text-cladd-sm text-craie-douce underline underline-offset-4 hover:text-craie"
						>
							Se connecter
						</Link>
						<Link
							to="/inscription"
							className="py-cladd-3xs text-cladd-sm text-craie-douce underline underline-offset-4 hover:text-craie"
						>
							Créer un compte
						</Link>
						<a
							href={`mailto:${getLegalEmailAddress()}`}
							className="py-cladd-3xs text-cladd-sm text-craie-douce underline underline-offset-4 hover:text-craie"
						>
							{getLegalEmailAddress()}
						</a>
					</div>
				</div>

				{/*
				  ⚠️ LES QUATRE ADRESSES SONT ÉCRITES EN TOUTES LETTRES, ET C'EST VOULU.
				  Une première version les parcourait depuis une liste partagée, ce qui
				  était plus élégant — et `aucun-ecran-orphelin.test.ts` a refusé les
				  quatre pages d'un coup : son balayage cherche des destinations
				  LITTÉRALES dans le code source, et une adresse construite depuis une
				  variable lui est invisible.

				  La barrière a raison contre l'élégance. Une page légale injoignable
				  est exactement le défaut qu'elle existe pour attraper, et quatre
				  chaînes recopiées coûtent moins cher qu'une dispense inscrite dans
				  `ATTEINTS_AUTREMENT` — qui aurait été fausse, puisque ces pages SONT
				  atteintes par un lien.
				*/}
				<nav
					aria-label="Informations légales"
					className="flex flex-wrap items-center gap-x-cladd-2xs gap-y-1 border-t border-filet-nuit pt-cladd-2xs"
				>
					<Link to="/mentions-legales" className={LIEN_LEGAL}>
						Mentions légales
					</Link>
					<Link to="/conditions-generales" className={LIEN_LEGAL}>
						Conditions générales
					</Link>
					<Link to="/politique-de-confidentialite" className={LIEN_LEGAL}>
						Politique de confidentialité
					</Link>
					<Link to="/accord-de-sous-traitance" className={LIEN_LEGAL}>
						Accord de sous-traitance
					</Link>
				</nav>

				<p className="max-w-3xl text-cladd-sm leading-relaxed font-normal text-craie-douce">
					{LEGAL_CONFIG.companyName}, {LEGAL_CONFIG.legalForm}. SIRET {LEGAL_CONFIG.siret}. TVA{' '}
					{LEGAL_CONFIG.vatNumber}. {LEGAL_CONFIG.address}. Téléphone {LEGAL_CONFIG.telephone}.
				</p>

				<p className="max-w-3xl text-cladd-sm leading-relaxed font-normal text-craie-douce">
					Letikette mesure vos créances, les documente et surveille leurs échéances, selon une
					obligation de moyens. Il n’exerce aucune activité de recouvrement pour compte de tiers,
					ne manipule aucun fonds et ne délivre aucun conseil juridique. Toute décision d’engager
					une procédure reste la vôtre.
				</p>
			</div>
		</footer>
	);
}
