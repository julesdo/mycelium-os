import { SectionTitle, Surface } from '@cladd-ui/react';
import { dateCourte, eurosCentimes } from './format';
import {
	BilanPertes,
	ChocRevelation,
	FacturesNonChiffrees,
	type BilanPertesAffiche,
	type RevelationAffichee
} from './revelation';

/**
 * CE QUI EST DÛ — la page du chiffre qui justifie l'abonnement.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE NE REDESSINE AUCUN DES MONTANTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le supplément, ses deux parts, le principal, le total et la décomposition
 * facture par facture sont rendus par `ChocRevelation`, tel quel. Une seconde
 * mise en forme des mêmes nombres divergerait de la première à la première
 * retouche, et la divergence serait MUETTE : deux écrans du même produit
 * n'afficheraient plus le même total, sans qu'aucun test ne tombe. C'est la
 * raison exacte pour laquelle la règle d'amputation n'a qu'un seul rendu dans
 * tout le dépôt (`FacturesNonChiffrees`).
 *
 * Ce fichier n'ajoute donc que ce qui manquait à la page : le MÈTRE — ce que
 * les intérêts ont couru depuis hier, calculé par le serveur et affiché nulle
 * part — et la forme que prend la page quand rien n'a pu être chiffré.
 *
 * ⚠️ AUCUN POURCENTAGE SUR UNE CRÉANCE. Rien ici ne pose de taux de réussite,
 * de part récupérable ni de score : le produit MESURE et DOCUMENTE, il ne
 * promet rien. Les libellés disent « dus de plein droit », jamais « à
 * récupérer ».
 */

/**
 * LE MÈTRE : LA DATE D'ARRÊTÉ, ET CE QUI A COURU DEPUIS HIER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE CHIFFRE ÉTAIT CALCULÉ ET N'ÉTAIT AFFICHÉ NULLE PART
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `interetsCourusDepuisHier` traverse le produit entier — la requête Convex le
 * calcule (`recouvrement/revelation.ts`), le type le porte, la salle le
 * compose — et aucun écran ne le rendait. C'est le défaut « construit mais
 * injoignable » que ce dépôt traque, appliqué au seul chiffre qui prouve que la
 * mesure est VIVANTE : un total arrêté est une photo, un total qui a bougé
 * depuis hier est un compteur.
 *
 * ⚠️ IL NE S'AFFICHE QU'AU-DESSUS DE ZÉRO. « 0,00 € depuis hier » serait un
 * cadran à zéro (règle d'écran n° 4) et, pire, un mensonge par rangement : zéro
 * arrive quand AUCUNE facture n'a pu être chiffrée, ce qui ne veut pas dire que
 * rien n'a couru. La date d'arrêté, elle, reste toujours écrite : un montant
 * sans son jour n'est pas refaisable.
 */
function MetreDuJour({
	revelation,
	arreteAu
}: {
	revelation: RevelationAffichee;
	arreteAu: string;
}) {
	const couru = revelation.interetsCourusDepuisHier;

	return (
		<p className="flex flex-wrap items-baseline gap-cladd-3xs px-1 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
			<span>Arrêté au {dateCourte(arreteAu)}.</span>
			{couru > 0n ? (
				<span>
					Depuis hier,{' '}
					<span className="font-semibold text-cladd-fg tabular-nums">{eurosCentimes(couru)}</span>{' '}
					de pénalités de retard ont couru sur ces factures.
				</span>
			) : null}
		</p>
	);
}

/**
 * LA PAGE QUAND RIEN N'A PU ÊTRE CHIFFRÉ.
 *
 * ⚠️ ELLE EXISTE PARCE QUE LE CAS PRODUISAIT UN CADRAN À ZÉRO. Un établissement
 * dont toutes les factures échouent au décompte — une échéance antérieure à la
 * série de taux connue, par exemple — a bien `nombreFactures === 0` mais des
 * factures NON CHIFFRÉES : la page n'était donc pas « vide », et elle posait
 * « 0,00 € » en corps de cinquante-six pixels sous « dus de plein droit ».
 *
 * Ce zéro-là ment deux fois : il dit que rien n'est dû, et il fait disparaître
 * les factures qui sont la raison pour laquelle on ne sait pas. La page dit
 * maintenant ce qui s'est passé, et nomme chaque facture avec son obstacle.
 */
function RienDeChiffrable({ revelation }: { revelation: RevelationAffichee }) {
	return (
		<section className="flex flex-col gap-cladd-3xs">
			<SectionTitle>Rien n’a pu être chiffré aujourd’hui</SectionTitle>
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="p-cladd-2xs"
			>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Aucune de vos factures en retard n’entre dans un décompte à cette date. Aucun total n’est
					donc affiché : un « 0,00 € » dirait que rien n’est dû, alors que ce qui est vrai, c’est
					que rien n’a pu être calculé. Chaque facture est nommée ci-dessous avec ce qui l’en
					empêche.
				</p>
			</Surface>
			<FacturesNonChiffrees lignes={revelation.nonChiffrees} />
		</section>
	);
}

/**
 * LA PAGE ENTIÈRE.
 *
 * L'ordre suit la fiche de versement de DoorDash et le relevé d'Afterpay : le
 * chiffre d'abord et la date à laquelle il est arrêté, la décomposition ensuite,
 * ce qui n'entre pas dans le total juste après — jamais en note de bas de
 * page —, et le bilan de ce qui s'est éteint pour finir.
 */
export function CeQuiEstDu({
	revelation,
	bilan,
	arreteAu
}: {
	revelation: RevelationAffichee;
	bilan: BilanPertesAffiche;
	arreteAu: string;
}) {
	return (
		<div className="flex flex-col gap-cladd-xs">
			<MetreDuJour revelation={revelation} arreteAu={arreteAu} />

			{revelation.nombreFactures === 0 ? (
				<RienDeChiffrable revelation={revelation} />
			) : (
				// Le supplément, le principal, le total, la décomposition facture par
				// facture et la règle d'amputation : un seul rendu, celui-ci.
				<ChocRevelation revelation={revelation} />
			)}

			{/*
			  ⚠️ UN INTITULÉ, PAS UNE CARTE AUTOUR DE CARTES. `BilanPertes` rend
			  lui-même ses deux compteurs en verre ; les enfermer dans une section en
			  verre superposait deux translucidités, ce qui donne un gris qui ne
			  réfracte plus rien — le défaut exact que `verre-carte` existe pour
			  éviter.
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Ce qui s’est éteint</SectionTitle>
				<BilanPertes bilan={bilan} />
			</section>
		</div>
	);
}
