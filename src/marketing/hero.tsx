import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { BoutonAffiche, FAMILLES, LienAffiche } from '../ui';
import { eurosCentimesCourts } from '../ui/format';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';
import { EcranProduit, Photo } from './section';

/**
 * L'ENTRÉE (06/10/2026, réécrite le soir même).
 *
 * ⚠️ LE TON DES LOGICIELS FINANCIERS, PAS CELUI D'UN CARNET. Le fondateur : « ce
 * n'est pas du tout le ton employé par une entreprise comme la nôtre, et ça ne
 * rassure pas ». Relevé sur Acctual, Wise, Mercury, Quicken et Midday : la
 * catégorie au-dessus, un titre qui dit ce que fait le produit, UNE phrase
 * factuelle, un bouton, et les trois levées de risque cochées dessous. Plus
 * d'annotations manuscrites, plus de formules.
 *
 * ⚠️ LE CHIFFRE DE LA CARTE EST LU SUR LES PARAMÈTRES, et il disparaît plutôt
 * que d'être faux : `estUtilisable` exige une valeur relevée sur une source
 * citable.
 *
 * ⚠️ AUCUNE PROMESSE DE RÉSULTAT. Le logiciel calcule, surveille et prépare ;
 * le gérant valide et envoie.
 */

function indemniteLisible(): string | null {
	const indemnite = PARAMETRES.indemniteForfaitaire;
	if (!estUtilisable(indemnite) || indemnite.valeur === null) return null;
	return eurosCentimesCourts(indemnite.valeur);
}

/** La date limite que montre la carte : celle de l'écran d'accueil de démonstration. */
const DATE_LIMITE_DEMO = '1 mai 2031';

const LEVEES = [`${DUREE_ESSAI_JOURS} jours d’essai`, 'Sans carte bancaire', 'Sans engagement'];

export function Hero() {
	const indemnite = indemniteLisible();
	const { Picto: PictoTemps } = FAMILLES.TEMPS;
	const { Picto: PictoArgent } = FAMILLES.ARGENT;

	return (
		// LE RETRAIT SUPÉRIEUR EST CELUI DE LA BARRE : elle est en `fixed` et ne
		// réserve aucune place. Voir `--spacing-barre-publique`.
		<header className="relative isolate w-full overflow-clip bg-creme pt-barre-publique text-encre-site">
			{/* LA BANDE ABRICOT DU BAS : la photo et le téléphone passent du papier à la
			    couleur, comme la page « Our story » de Mailchimp. Une bande droite à la
			    place des deux galets. */}
			<div
				aria-hidden
				className="absolute inset-x-0 bottom-0 -z-10 h-72 bg-teinte-abricot md:h-96"
			/>

			<div className="mx-auto flex w-full max-w-6xl flex-col items-center px-cladd-2xs pt-cladd-xl md:px-cladd-sm md:pt-cladd-2xl">
				<div className="leve-suite flex flex-col items-center gap-cladd-2xs text-center">
					<h1 className="leve max-w-4xl font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
						Relancez vos factures impayées au bon montant, et{' '}
						<span className="souligne-main whitespace-nowrap">à temps</span>.
					</h1>

					<p className="leve max-w-2xl text-chapeau leading-relaxed text-encre-site-douce">
						Letikette calcule les pénalités et les frais dus sur chaque facture en retard, surveille
						les délais et prépare vos relances. Rien ne part sans votre validation.
					</p>

					{/* ⚠️ UNE SEULE PILULE, ET UN LIEN. Deux boutons pleins côte à côte
					    annulent l'action principale. */}
					<div className="leve flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
						<BoutonAffiche as={Link} to="/inscription" fond="jour">
							Essayer gratuitement
							<ArrowRightIcon />
						</BoutonAffiche>
						<LienAffiche href="#comment" className="justify-center text-encre-site">
							Comment ça marche
						</LienAffiche>
					</div>

					{/* Les levées de risque, cochées, là où l'objection naît : sous le bouton. */}
					<ul className="leve flex flex-wrap justify-center gap-x-cladd-xs gap-y-1 text-cladd-sm text-encre-site-douce">
						{LEVEES.map((levee) => (
							<li key={levee} className="flex items-center gap-1.5">
								<CheckIcon aria-hidden size={16} className="text-encre-site" />
								{levee}
							</li>
						))}
					</ul>
				</div>

				{/*
				  LA SCÈNE : un gérant au travail, et son téléphone posé dessus. La photo
				  nomme un métier, pas une personne : aucun prénom à côté.
				*/}
				<div className="leve leve-tard relative mt-cladd-xl mb-24 w-full max-w-sm md:mt-cladd-2xl md:mb-32 md:max-w-md">
					<div className="overflow-hidden rounded-carte-site shadow-carte-chaude">
						<Photo
							photo="artisan"
							prioritaire
							sizes="(min-width: 768px) 448px, 90vw"
							description="Un artisan souriant à son établi, dans son atelier de menuiserie."
							className="aspect-4/5 object-right"
						/>
					</div>

					{/* Le téléphone, posé sur la photo : le vrai écran d'accueil.
					    ⚠️ La position va sur l'ENVELOPPE : `.ecran-telephone` pose
					    `position: relative` hors couche, et l'emporte sur `absolute`. */}
					<div className="absolute -right-3 -bottom-16 w-36 md:-right-24 md:-bottom-20 md:w-52">
						<EcranProduit
							capture="aujourdhui"
							prioritaire
							description="L’écran d’accueil de Letikette sur téléphone : 66 704,82 € dus au 17 septembre 2026 sur 4 factures en retard, dont 18 443,92 € de pénalités et de frais jamais réclamés, puis la liste des clients à traiter aujourd’hui."
						/>
					</div>

					{indemnite === null ? null : (
						<div className="absolute -bottom-10 -left-3 flex w-44 flex-col gap-1 rounded-cladd-xl border border-filet-creme bg-papier p-cladd-3xs text-left shadow-carte-chaude md:-bottom-8 md:-left-24 md:w-52">
							<span className="flex items-center gap-cladd-3xs">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-cladd-sm bg-teinte-argent">
									<PictoArgent className="size-5 text-encre-site" />
								</span>
								<span className="font-serif text-titre-section leading-none font-medium tabular-nums">
									{indemnite}
								</span>
							</span>
							<span className="text-cladd-xs leading-snug text-encre-site-douce">
								de frais dus sur chaque facture en retard
							</span>
						</div>
					)}

					{/* La date limite, en grand écran seulement : sur téléphone, la photo,
					    le téléphone et une carte suffisent à remplir l'écran. */}
					<div className="absolute top-24 -left-32 hidden w-52 flex-col gap-1 rounded-cladd-xl border border-filet-creme bg-papier p-cladd-3xs text-left shadow-carte-chaude md:flex lg:-left-40">
						<span className="flex items-center gap-cladd-3xs">
							<span className="flex size-8 shrink-0 items-center justify-center rounded-cladd-sm bg-teinte-temps">
								<PictoTemps className="size-5 text-encre-site" />
							</span>
							<span className="text-cladd-xs font-semibold">Date limite pour agir</span>
						</span>
						<span className="font-serif text-intertitre leading-tight font-medium tabular-nums">
							{DATE_LIMITE_DEMO}
						</span>
						<span className="text-cladd-xs leading-snug text-encre-site-douce">
							Vérifiée chaque nuit.
						</span>
					</div>
				</div>
			</div>
		</header>
	);
}
