import { Link, type LinkProps } from '@tanstack/react-router';
import { List, ListButton, ListTitle, Surface } from '@cladd-ui/react';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import { pluriel } from './format';

/**
 * CE QUI VOUS EMPÊCHE D'AGIR — dit AVANT de se cogner dedans.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT : LE PRODUIT SAVAIT, ET SE TAISAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trois choses bloquent ce produit, et il connaît les trois. Aucune n'était
 * annoncée avant qu'on se heurte au mur :
 *
 *   · SANS PROFIL CRÉANCIER, `creances.ts` passe `creancierCommercant:
 *     'unknown'` à la déduction des conditions. `entreCommercants` reste donc
 *     indéterminé, et l'éligibilité à l'injonction de payer n'est JAMAIS
 *     acquise. Le gérant voyait une condition non remplie sans savoir que
 *     c'était SON identité qui manquait — le module `profil.ts` le dit
 *     lui-même : « le produit annonçait une condition non remplie que rien ne
 *     permettait de remplir » ;
 *   · SANS SIREN SUR UN DÉBITEUR, le radar ne peut pas l'interroger. Il n'est
 *     pas surveillé, et l'accueil n'en disait rien ;
 *   · SANS FACTURE, le produit ne mesure rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE N'EST PAS UNE LISTE DE COURSES, C'EST UNE LISTE DE VERROUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque rangée dit CE QU'ELLE DÉBLOQUE. « Renseignez votre SIREN » est une
 * corvée ; « sans lui, aucune injonction de payer n'est possible » est une
 * raison. C'est cette différence qui décide si le gérant le fait maintenant ou
 * le remet — et c'est aussi la règle du projet : le vide montre le chemin.
 *
 * ⚠️ ET ELLE DISPARAÎT QUAND ELLE EST VIDE, à la différence du veilleur qui
 * reste toujours. Les deux ne disent pas la même chose : le veilleur rapporte
 * un travail EN COURS, donc il a toujours quelque chose à dire ; celle-ci
 * rapporte ce qui RESTE. Une carte « 3 sur 3, tout est fait » est du décor
 * qu'on apprend à ignorer en trois jours — et le jour où un verrou réapparaît,
 * on ne la regarde plus.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL, ICI NON PLUS. La référence coche ses étapes en
 * vert ; le vert, l'ambre et le rouge sont réservés à `--color-seuil-*` dans ce
 * produit. Ce qui est fait s'ESTOMPE au lieu de verdir — ce qui est d'ailleurs
 * meilleur : une étape franchie doit reculer, pas réclamer l'attention.
 */

export interface Verrou {
	readonly cle: string;
	readonly titre: string;
	/** Ce que lever ce verrou rend possible. Un constat, jamais une consigne. */
	readonly debloque: string;
	readonly vers: LinkProps['to'];
}

/**
 * Les verrous qui restent, dans l'ordre où ils bloquent.
 *
 * ⚠️ L'ORDRE EST CELUI DU BLOCAGE, PAS CELUI DE LA SAISIE. Sans facture, le
 * produit ne mesure rien : renseigner son identité de créancier d'abord ne
 * débloquerait rien de VISIBLE, et le gérant en conclurait que ça n'a servi à
 * rien. On demande donc ce qui produit un effet immédiat, puis le reste.
 */
export function ceQuiManque({
	profilCreancierComplet,
	nombreFactures,
	debiteursSansSiren
}: {
	readonly profilCreancierComplet: boolean;
	readonly nombreFactures: number;
	readonly debiteursSansSiren: number;
}): readonly Verrou[] {
	const verrous: Verrou[] = [];

	if (nombreFactures === 0) {
		verrous.push({
			cle: 'factures',
			titre: 'Vos factures',
			debloque: 'Le logiciel n’a rien à compter',
			vers: '/app/import-factures'
		});
	}

	if (!profilCreancierComplet) {
		verrous.push({
			cle: 'creancier',
			titre: 'Votre identité de créancier',
			// ⚠️ LE FAIT, PAS SON EXPLICATION — et c'est une mesure. La version
			// longue (« la condition "entre commerçants" reste indéterminée et
			// aucune injonction de payer ne peut être envisagée ») tenait sur
			// QUATRE lignes à 375 px, et le bloc entier montait à 253 px pour deux
			// rangées. C'est la règle posée sur tout le reste du produit : la rangée
			// porte le fait, la page porte le raisonnement.
			//
			// Exact et vérifiable dans le code : sans profil, `creancierCommercant`
			// vaut `unknown`, donc `entreCommercants` aussi, donc la condition de
			// l'injonction de payer ne peut pas être acquise. C'est un CONSTAT sur
			// l'état du dossier, jamais une recommandation d'agir.
			debloque: 'Aucune injonction de payer possible sans elle',
			vers: '/app/parametres/creancier'
		});
	}

	// ⚠️ ON NE RÉCLAME PAS DE DÉBITEURS S'IL N'Y A PAS DE FACTURE. Il n'en existe
	// aucun à identifier : l'annoncer serait demander une chose impossible, et
	// c'est ainsi qu'on apprend à ignorer une liste.
	if (nombreFactures > 0 && debiteursSansSiren > 0) {
		verrous.push({
			cle: 'debiteurs',
			titre: `${debiteursSansSiren} débiteur${pluriel(debiteursSansSiren)} sans identifiant`,
			debloque: 'Leur solvabilité n’est pas surveillée',
			vers: '/app/debiteurs'
		});
	}

	return verrous;
}

/**
 * L'ANNEAU DE PROGRESSION — combien de verrous sont tombés.
 *
 * ⚠️ EN SVG ET PAS EN BARRE, parce que la référence le fait et qu'elle a
 * raison : un anneau se lit d'un coup d'œil à côté d'un chiffre, et il occupe
 * un carré au lieu d'une ligne entière. Le chiffre reste au centre — l'anneau
 * seul n'est qu'une décoration, c'est le « 1/3 » qui informe.
 *
 * Le bleu d'encre de la marque, jamais une couleur de seuil.
 */
function Anneau({ faits, total }: { faits: number; total: number }) {
	const RAYON = 13;
	const CIRCONFERENCE = 2 * Math.PI * RAYON;
	const part = total === 0 ? 0 : faits / total;

	return (
		<span className="relative inline-flex size-8 shrink-0 items-center justify-center">
			<svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90" aria-hidden>
				<circle
					cx="16"
					cy="16"
					r={RAYON}
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					className="text-cladd-fg-softest opacity-40"
				/>
				<circle
					cx="16"
					cy="16"
					r={RAYON}
					fill="none"
					stroke="oklch(0.72 0.13 254)"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeDasharray={CIRCONFERENCE}
					strokeDashoffset={CIRCONFERENCE * (1 - part)}
				/>
			</svg>
			<span className="relative text-cladd-3xs font-semibold tabular-nums">
				{faits}/{total}
			</span>
		</span>
	);
}

/**
 * LE BLOC, sur l'accueil.
 *
 * `total` est le nombre de verrous que ce produit peut poser — trois — et pas
 * le nombre restant : un anneau qui se remplit pendant que son dénominateur
 * bouge ne se lit pas comme une progression.
 */
export function CeQuiManque({ verrous, total = 3 }: { verrous: readonly Verrou[]; total?: number }) {
	if (verrous.length === 0) return null;

	return (
		<Surface
			as="section"
			aria-label="Ce qui reste à faire"
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="p-0"
		>
			<List>
				<ListTitle className="flex items-center justify-between gap-cladd-3xs">
					<span>Ce qui vous manque</span>
					<Anneau faits={total - verrous.length} total={total} />
				</ListTitle>

				{verrous.map((verrou) => (
					<ListButton
						key={verrou.cle}
						as={Link}
						to={verrou.vers}
						icon={
							/* Un rond VIDE : l'étape n'est pas franchie. Le rond plein et le
							   `CheckIcon` sont réservés à ce qui est fait — et ce qui est fait
							   ne figure pas dans cette liste, qui ne porte que le reste. */
							<span className="inline-flex size-4 rounded-full border-2 border-cladd-fg-softest" />
						}
						footer={verrou.debloque}
						after={
							<ChevronRightIcon size={16} className="shrink-0 text-cladd-fg-softest" aria-hidden />
						}
						className="verre-bouton"
						hoverable={false}
					>
						{verrou.titre}
					</ListButton>
				))}
			</List>
		</Surface>
	);
}

/**
 * Exporté pour la salle d'exposition, qui doit pouvoir montrer l'état franchi
 * à côté de l'état restant — c'est le seul moyen de vérifier au regard que
 * « fait » recule au lieu de réclamer l'attention.
 */
export function RangeeFranchie({ titre }: { titre: string }) {
	return (
		<ListButton
			disabled
			icon={<CheckIcon size={16} />}
			className="opacity-50"
			hoverable={false}
			variant="transparent"
			outline={false}
		>
			{titre}
		</ListButton>
	);
}
