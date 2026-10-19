import { CarteMetier } from './metiers';
import { pageDuSecteur, SECTEURS_PUBLICS } from './secteurs';
import { Chapeau, SectionMarketing, TitreSection } from './section';

/**
 * POUR QUI : les métiers, et chacun MÈNE à sa page (19/10/2026).
 *
 * Le fondateur : « pourquoi on n'a pas de maillage dans la home page vers les pages par
 * secteur ? ». La section présentait trois métiers en photos (commerce, transport,
 * industrie) qui ne menaient nulle part, pendant que les quatre pages métier n'étaient
 * jointes que par le pied de page. Désormais une carte par page métier, sur le modèle de
 * « Who we're built for » chez Slash : la photo, la carte de l'écran du métier posée
 * dessus, une ligne et « Voir la page ». Des métiers, jamais un prénom à côté d'un visage.
 */
export function Situations() {
	const jour = new Date().toISOString().slice(0, 10);
	return (
		<SectionMarketing id="pour-qui" ton="creme" className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<TitreSection>Pour les entreprises qui facturent d’autres entreprises.</TitreSection>
				<Chapeau>
					Une page par métier : ce que dit la loi pour vous, et Letikette sur des factures comme les
					vôtres.
				</Chapeau>
			</div>

			{/* LE CARROUSEL SUR TÉLÉPHONE, LA GRILLE AU-DELÀ. Les cartes débordent jusqu'au bord
			    de l'écran : c'est ce qui dit qu'il y en a d'autres. */}
			<div className="carrousel -mx-cladd-2xs flex snap-x snap-mandatory gap-cladd-2xs overflow-x-auto px-cladd-2xs pb-cladd-3xs md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
				{SECTEURS_PUBLICS.map((secteur) => (
					<CarteMetier
						key={secteur}
						secteur={secteur}
						accroche={pageDuSecteur(secteur, jour).accroche}
						className="w-4/5 shrink-0 snap-center md:w-auto"
					/>
				))}
			</div>

			<p className="text-cladd-md text-encre-site-douce">
				Votre métier n’y est pas ? Letikette sert toute entreprise qui facture d’autres entreprises
				: artisans, commerçants, industriels, prestataires.
			</p>
		</SectionMarketing>
	);
}
