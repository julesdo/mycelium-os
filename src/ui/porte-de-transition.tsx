import type { LinkProps } from '@tanstack/react-router';
import { List, ListButton, ListTitle, Surface } from '@cladd-ui/react';
import { ChevronRightIcon } from 'lucide-react';
import { dateCourte } from './format';
import { Lien } from './lien';

/**
 * LA PORTE DE TRANSITION — l'ancien arbre, nommé, daté, et en bas de la file.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE N'EST PAS UNE COMMODITÉ, C'EST CE QUI REND LA BASCULE RÉVOCABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La bascule remplace vingt-sept adresses par une seule. Les autres existent
 * encore — leur suppression est un lot séparé (T16), précisément pour qu'un
 * `git revert` d'un seul commit ramène l'ancien produit sans qu'aucune donnée
 * ne soit orpheline.
 *
 * Mais une route déclarée que plus aucun lien n'atteint ne rend pas
 * `aucun-ecran-orphelin.test.ts` rouge : elle le rend MENTEUR. Le test lit les
 * arêtes entrantes écrites en littéral ; sans cette porte, les têtes de
 * sous-arbre deviendraient injoignables à l'usage tout en restant déclarées,
 * et c'est exactement la forme de défaut que ce dépôt combat partout — une
 * chose construite, correcte, et qu'on n'atteint plus.
 *
 * ⚠️ ET ELLE DIT SA DATE DE FERMETURE. Une transition sans date est un état
 * permanent qu'on n'a pas décidé : au bout de trente jours, soit la file a
 * remplacé l'ancien arbre et celui-ci part, soit elle n'a pas convaincu et
 * c'est la bascule qu'on annule. La porte force ce choix à être fait par
 * quelqu'un plutôt que par l'oubli.
 *
 * ⚠️ AUCUN CHIFFRE NE VIT ICI. Elle ne compte rien, elle ne mesure rien : elle
 * ouvre des écrans dont tout le contenu chiffré a déjà sa place dans la file.
 * Un compte posé ici mourrait avec elle, et l'omission porterait sur l'argent
 * qu'on ne réclamera pas.
 */

/**
 * LE JOUR OÙ ELLE SE FERME, et il est écrit une seule fois.
 *
 * Trente jours après la bascule du 17 septembre 2026. C'est T16 qui supprime
 * ce fichier, les sous-arbres qu'il ouvre, et cette date avec eux.
 */
export const FERMETURE_DE_LA_PORTE = '2026-10-17';

/**
 * Les têtes de sous-arbre, et où leur lecture vit maintenant.
 *
 * ⚠️ CE SONT DES TÊTES, PAS DES ÉCRANS. Chacune est la seule arête entrante de
 * son sous-arbre : `/app/debiteurs` tient les deux pages de détail d'un client
 * et la créance qu'on y constitue, `/app/import-factures` tient le suivi d'un
 * dépôt. Quatre liens suffisent donc à garder joignable tout ce que la bascule
 * cesse d'atteindre.
 *
 * ⚠️ LE PLAN EN ANNONÇAIT CINQ, ET `/app/parametres` N'EN EST PLUS UNE : le hub
 * des réglages et ses douze adresses sont morts avec `/app/compte` (T11), qui
 * est aujourd'hui une adresse VIVANTE, atteinte par l'avatar de la `Toolbar`.
 * L'y remettre ouvrirait une route qui n'existe plus.
 */
const TETES: readonly {
	readonly to: LinkProps['to'];
	readonly libelle: string;
	readonly ouSaLectureVit: string;
}[] = [
	/**
	 * ⚠️ DEUX DE CES PHRASES ONT MENTI, ET ELLES SONT CORRIGÉES ICI.
	 *
	 * Elles renvoyaient à « la vue Par client » et à « la puce Engagés », deux
	 * mécanismes d'« Aujourd'hui » que la refonte a supprimés : une vue qui était
	 * un onglet déguisé, et une puce qui filtrait l'écran entier. Les deux sont
	 * devenues des DESTINATIONS de la barre du bas, ce qui est exactement ce
	 * qu'elles auraient dû être.
	 *
	 * Une porte de transition qui nomme faussement où la lecture a déménagé est
	 * pire qu'une porte absente : elle envoie chercher quelque chose qui n'existe
	 * pas, sur un écran qu'on découvre.
	 */
	{
		to: '/app/clients',
		libelle: 'Vos clients',
		ouSaLectureVit: 'L’onglet « Clients », dans la barre du bas'
	},
	{
		to: '/app/procedures',
		libelle: 'Les dossiers engagés',
		ouSaLectureVit: 'L’onglet « Dossiers », dans la barre du bas'
	},
	{
		to: '/app/import-factures',
		libelle: 'Vos dépôts de factures',
		ouSaLectureVit: 'Le bouton « Déposer », et la rangée datée de chaque dépôt'
	},
	/**
	 * ⚠️ CELLE-CI EST UNE DETTE, ET ELLE LE DIT PLUTÔT QUE DE LA MAQUILLER.
	 *
	 * « Aujourd'hui » a gardé les hypothèses et les angles morts, qui sont des
	 * constats d'auditabilité et se rendent à plat en bas de l'écran. Le
	 * SUPPLÉMENT — le livrable vendu du « Premier bilan » — et le bilan de ce qui
	 * s'est ÉTEINT n'ont pas d'autre page que celle-ci.
	 *
	 * Conséquence à trancher avant le {@link FERMETURE_DE_LA_PORTE} : cette porte
	 * est la SEULE arête entrante de `/app/revelation`. La refermer sans lui avoir
	 * donné une entrée ailleurs rendrait l'écran injoignable — le défaut exact que
	 * `aucun-ecran-orphelin.test.ts` existe pour attraper, et qu'il n'attrapera
	 * pas tant que cette ligne est là.
	 */
	{
		to: '/app/revelation',
		libelle: 'Ce que vos factures portent, en détail',
		ouSaLectureVit: 'Nulle part ailleurs : le supplément et ce qui s’est éteint ne se lisent qu’ici'
	}
];

export function PorteDeTransition() {
	return (
		<Surface
			as="section"
			aria-label="Les écrans de l’ancienne version"
			data-porte-transition
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="p-0"
		>
			<List>
				<ListTitle>Les écrans de l’ancienne version</ListTitle>

				{/*
				  ⚠️ LA DATE EST DITE, PAS SUGGÉRÉE. « Bientôt » se lit « jamais » au
				  bout de trois semaines ; un quantième se vérifie sur un calendrier.

				  ⚠️ ET ELLE EST HORS DU `ListTitle`, PARCE QUE LE REGARD À 375 px L'A
				  EXIGÉ. Cladd met ses intitulés de liste en CAPITALES : une phrase de
				  deux lignes en petites capitales se déchiffre au lieu de se lire, et
				  c'est justement la phrase qui porte la seule date du bloc.
				*/}
				{/* Aucun rembourrage horizontal : la `List` pose déjà le sien, et le
				    doubler décalait cette phrase de vingt pixels vers la droite par
				    rapport à l'intitulé et aux rangées. Mesuré au navigateur. */}
				<p className="pb-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					Ils restent ouverts jusqu’au {dateCourte(FERMETURE_DE_LA_PORTE)}. Tout ce qu’ils
					montraient se lit désormais sur cette file.
				</p>

				{TETES.map((tete) => (
					<ListButton
						key={tete.libelle}
						as={Lien}
						to={tete.to}
						footer={tete.ouSaLectureVit}
						after={
							<ChevronRightIcon size={16} className="shrink-0 text-cladd-fg-softest" aria-hidden />
						}
						className="verre-bouton"
						hoverable={false}
					>
						{tete.libelle}
					</ListButton>
				))}
			</List>
		</Surface>
	);
}
