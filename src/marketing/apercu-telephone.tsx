import { Chip } from '@cladd-ui/react';
import { ChevronsUpDownIcon, CircleUserIcon, GavelIcon, UsersIcon } from 'lucide-react';
import { EcranFile } from '../screens/file';
import { Avatar, IconeLetikette } from '../ui';
import { ACCUEIL_DEMO } from './donnees-accueil';

/**
 * L'ÉCRAN D'ACCUEIL DU PRODUIT, DANS LE TÉLÉPHONE DU PREMIER ÉCRAN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ C'EST `EcranFile`, LE COMPOSANT QUE `/app` MONTE — PAS UNE RECONSTITUTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La version précédente composait un écran à la main : une barre rejouée, un
 * titre écrit en dur, et un seul composant réel au milieu. C'était un aperçu de
 * quelque chose qui n'existe nulle part — et le visiteur s'en apercevait le
 * jour de l'inscription, c'est-à-dire au pire moment possible.
 *
 * Ici, la tête et ses trois parts, le rangement par échéance, les rangées, le
 * pli, le veilleur, les hypothèses et les angles morts sont ceux du produit.
 * Seules les données sont fausses, et elles vivent dans `donnees-accueil.ts`.
 *
 * La conséquence à accepter : quand l'écran d'accueil change, la page d'accueil
 * change avec lui, sans qu'on ait rien à faire. C'est l'intérêt, et c'est aussi
 * le risque — un écran cassé casse la vitrine. C'est pour ça que la page est
 * entrée dans la salle d'exposition, où elle se regarde aux quatre largeurs.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ EN CLAIR, ET LE THÈME EST ÉCRIT SUR LA RACINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'aperçu a été essayé en sombre — le produit l'est par défaut, et le premier
 * écran du site est noir, donc les deux se répondaient. À l'écran, l'objet
 * disparaissait : un téléphone sombre sur un fond noir n'est plus un objet
 * posé, c'est un trou plus sombre que le trou. En clair, il redevient la SEULE
 * SOURCE DE LUMIÈRE de la page — ce qui est exactement ce qu'on veut d'un
 * premier écran dont le seul travail est de montrer le logiciel, et ce qui
 * justifie la lueur ancrée dessous (`LueurProduit`).
 *
 * ⚠️ LE THÈME EST ÉCRIT, PAS HÉRITÉ. `<html>` porte `light` ou `dark` selon le
 * réglage SYSTÈME du visiteur (voir `AMORCE_THEME`). Sans `light` posé ici, un
 * prospect sous macOS en mode sombre verrait une vitrine différente de celle
 * que tout le monde voit — et personne ne s'en apercevrait depuis un poste en
 * clair.
 *
 * ⚠️ LE FOND EST CELUI DE L'APPLICATION, MOINS SON SHADER. `Fond` importe
 * `LineWaves`, c'est-à-dire `ogl` — 359 lignes de fragment shader et une
 * bibliothèque entière qui n'entre aujourd'hui dans le paquet que par la
 * coquille et l'authentification. La page d'accueil est la plus sensible du
 * produit : celle qu'un prospect ouvre en 4G, dans une salle d'attente. On
 * reprend donc ses deux couches CSS — le lavis de relèvement et le grain — et
 * on laisse le shader à l'application.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA BARRE DU BAS EST REJOUÉE, ET IL LE FAUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `BarreDuBas` est en `fixed` : montée ici, elle s'accrocherait à la FENÊTRE et
 * sortirait du cadre pour aller se coller en bas du site. Elle est donc rejouée
 * avec les mêmes primitives et les mêmes classes de verre, de sorte que ce qui
 * est montré reste vrai même s'il n'est pas branché. C'est exactement la raison
 * pour laquelle l'aperçu tablette rejoue déjà sa barre du haut.
 *
 * ⚠️ AUCUN PRÉFIXE RESPONSIVE ICI. `sm:` et `md:` interrogent la FENÊTRE, pas la
 * toile : sur un écran de bureau, un `md:` retomberait sur la disposition large
 * alors que la toile fait toujours 390 px — on montrerait une mise en page de
 * tablette dans un cadre de téléphone.
 */

const ONGLETS = [
	{ libelle: 'Aujourd’hui', Icone: IconeLetikette, actif: true },
	{ libelle: 'Clients', Icone: UsersIcon, actif: false },
	{ libelle: 'Créances', Icone: GavelIcon, actif: false },
	{ libelle: 'Compte', Icone: CircleUserIcon, actif: false }
] as const;

/**
 * LA CAPSULE DU BAS. `verre-dense` pour la capsule, `verre` pour le bloc qui
 * marque l'onglet actif : ce sont les deux classes de l'application.
 */
function BarreBasse() {
	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-cladd-3xs pb-cladd-2xs">
			<div className="verre-dense relative flex w-full items-stretch rounded-full p-1.5">
				{ONGLETS.map(({ libelle, Icone, actif }) => (
					<span
						key={libelle}
						className={
							actif
								? 'verre relative z-10 flex min-h-cladd-md min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5 text-cladd-fg'
								: 'relative z-10 flex min-h-cladd-md min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5 text-cladd-fg-softer'
						}
					>
						<Icone size={20} />
						<span className="text-cladd-3xs font-medium">{libelle}</span>
					</span>
				))}
			</div>
		</div>
	);
}

export function ApercuTelephone() {
	return (
		<div className="light cladd-color-brand relative size-full overflow-hidden bg-cladd-bg text-cladd-fg">
			{/* Le fond de l'application, moins son shader. Voir l'en-tête. */}
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="fond-releve absolute inset-0" />
				<div className="fond-grain absolute inset-0" />
			</div>

			<div className="relative flex size-full flex-col pb-cladd-2xl">
				<EcranFile
					donnees={{
						etat: 'pret',
						valeur: {
							...ACCUEIL_DEMO,
							avatar: <Avatar nom="Jules Doré" />,
							selecteur: (
								<Chip size="sm">
									Thumbbb Agency
									<ChevronsUpDownIcon />
								</Chip>
							)
						}
					}}
				/>
			</div>

			<BarreBasse />
		</div>
	);
}
