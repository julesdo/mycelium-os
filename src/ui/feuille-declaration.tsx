import { useState } from 'react';
import { Input, SectionTitle } from '@cladd-ui/react';
import { BoutonPrincipal } from './bouton';
import type { FicheIntervenant } from './fiches-professionnels';
import { ParcoursProfessionnels, type AnnuaireDuParcours } from './parcours-professionnels';
import { dateCourte } from './format';
import { LigneBouton, ListeAnalyses } from './navigation';
import { FeuillePleinEcran, SectionDeFeuille } from './plein-ecran';

/**
 * CE QUE LE GÉRANT A DIT DE L'INTERVENANT, AU MOMENT DE DÉCLARER.
 *
 * `null` — il n'a rien dit, et « je le dirai plus tard » ne bloque rien.
 * `{ ids: [] }` — il a dit « moi-même ».
 * `{ ids: [...] }` — il a nommé une ou plusieurs fiches de son carnet (12/10/2026 :
 *   un avocat ET un commissaire, comme sur le dossier).
 *
 * ⚠️ TROIS ÉTATS, PAS DEUX. Confondre « rien dit » avec « moi-même » ferait
 * porter à un silence la valeur d'une réponse — et ferait apparaître un anneau
 * sur une carte que personne n'a choisie, c'est-à-dire une présélection.
 */
export type ChoixDeclare = { readonly ids: readonly string[] } | null;

/**
 * « JE L'AI ENGAGÉE LE … » — le seul geste de procédure que ce logiciel offre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL A DÉMÉNAGÉ AVANT QUE SON ÉCRAN NE PARTE, ET C'EST LA RAISON DE CE
 * FICHIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cette feuille n'était définie qu'à l'intérieur de `screens/analyses/
 * procedure.tsx`, c'est-à-dire d'un écran que la refonte supprime. Livrer le
 * volet de preuve puis supprimer cet écran aurait emporté avec lui le SEUL
 * appelant de `apresProcedure.engagerProcedure` — et avec lui la seule façon
 * pour une créance de passer à `ENGAGEE`, donc les échéances de caducité, donc
 * la portée « Engagés » de la file.
 *
 * C'est exactement le défaut que `fonctions-appelees.test.ts` a nommé le 12
 * septembre 2026, et le refaire en connaissance de cause serait pire que de
 * l'avoir commis. Le composant vit donc ici, monté par les DEUX surfaces
 * pendant la transition.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA FORMULATION EST LA FONCTIONNALITÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Engager cette procédure » ferait du logiciel l'auteur de l'acte, et du
 * bouton une recommandation. C'est la troisième ligne rouge du projet : « on ne
 * recommande jamais une procédure. Ce serait du conseil juridique. »
 *
 * Ici le gérant DÉCLARE un fait passé — il a déposé sa requête, tel jour — et
 * le logiciel se met à compter les délais qui en découlent. C'est exactement ce
 * qu'un logiciel peut faire sans sortir de son rôle : mesurer le temps.
 *
 * ⚠️ LA DATE EST PRÉ-REMPLIE À AUJOURD'HUI MAIS RESTE MODIFIABLE, et c'est le
 * bon arbitrage : on déclare le plus souvent le jour même, mais les délais
 * courent depuis le FAIT. Une requête déposée lundi et saisie vendredi
 * offrirait quatre jours sur une caducité, en silence — et une caducité fait
 * perdre l'ordonnance définitivement.
 */
export function FeuilleDeclaration({
	carnet,
	enCours,
	aujourdHui,
	onFermer,
	professionnels,
	onDeclarer
}: {
	carnet: readonly FicheIntervenant[];
	enCours: boolean;
	aujourdHui: string;
	onFermer: () => void;
	/** L'annuaire du parcours du choix (12/10/2026). */
	professionnels: AnnuaireDuParcours;
	onDeclarer: (engageeLe: string, choix: ChoixDeclare) => void;
}) {
	/*
	  ⚠️ TROIS ÉTATS DE FEUILLE, ZÉRO `setState` DANS UN EFFET. Rien ici ne se
	  resynchronise depuis une prop par un effet : la date part de la prop
	  `aujourdHui`, lue une seule fois à l'initialisation, le choix part à « rien
	  dit », et le carnet part fermé. La remise à zéro entre deux voies se fait
	  par la `key` de ce composant, côté appelant : un effet qui resynchroniserait
	  cette prop dans l'état produirait un rendu de plus et, le jour où elle
	  change pour une autre raison, effacerait une saisie.
	*/
	const [quand, setQuand] = useState(aujourdHui);
	const [choix, setChoix] = useState<ChoixDeclare>(null);
	const [carnetOuvert, setCarnetOuvert] = useState(false);

	const nomChoisi =
		choix === null
			? 'Je le dirai plus tard'
			: choix.ids.length === 0
				? 'Moi-même'
				: choix.ids.length > 1
					? `${choix.ids.length} personnes`
					: (carnet.find((fiche) => fiche._id === choix.ids[0])?.nom ?? 'Fiche retirée');

	return (
		<>
			<FeuillePleinEcran
				ouverte={true}
				onFermer={onFermer}
				titre="Je l’ai engagée"
				pied={
					// ⚠️ `BoutonPrincipal`, PAS UN `Button color="brand"`. Mesuré au
					// navigateur : `color="brand"` sur le variant par défaut rend un fond
					// transparent avec du texte bleu, qui se lit comme un lien. L'action qui
					// met des délais à courir ne peut pas être le seul élément qu'on ne voit pas.
					<BoutonPrincipal
						pleineLargeur
						loading={enCours}
						readOnly={enCours || quand === ''}
						onClick={() => onDeclarer(quand, choix)}
					>
						Je l’ai engagée
					</BoutonPrincipal>
				}
			>
				<SectionDeFeuille>
					<SectionTitle>Quel jour</SectionTitle>
					{/*
					  ⚠️ LA DATE VIENT DU CHAMP, JAMAIS DE L'HORLOGE. Les délais courent
					  depuis le FAIT. Une requête déposée lundi et saisie vendredi
					  offrirait quatre jours sur une caducité, en silence, et une
					  caducité fait perdre l'ordonnance définitivement.
					*/}
					<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
						<Input
							size="lg"
							type="date"
							value={quand}
							onChange={setQuand}
							infoMessage="La date du FAIT, pas celle de la saisie."
						/>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
							{quand === ''
								? 'Sans date, aucun délai ne peut être compté.'
								: `Les délais de cette procédure courront depuis le ${dateCourte(quand)}.`}
						</p>
					</div>
				</SectionDeFeuille>

				<SectionDeFeuille>
					<SectionTitle>Qui a fait l’acte</SectionTitle>
					<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
						<ListeAnalyses>
							<LigneBouton
								titre="Qui fait l’acte"
								valeur={nomChoisi}
								onClick={() => {
									professionnels.onDemander();
									setCarnetOuvert(true);
								}}
							/>
						</ListeAnalyses>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
							Cette réponse peut attendre : elle ne change aucun délai, et se dit plus tard sur cet
							écran.
						</p>
					</div>
				</SectionDeFeuille>
			</FeuillePleinEcran>

			{/*
			  Une feuille par-dessus la feuille : Cladd les empile comme iOS, et
			  chacune garde son propre piège à focus. Elles sont SŒURS dans l'arbre,
			  jamais imbriquées — c'est la forme que la documentation du kit montre.
			*/}
			<ParcoursProfessionnels
				ouvert={carnetOuvert}
				titre="Qui a fait l’acte"
				but="DOSSIER"
				professions={['AVOCAT', 'COMMISSAIRE_DE_JUSTICE']}
				sansPersonne={{ titre: 'Moi-même', precision: 'Aucun professionnel' }}
				equipe={carnet}
				dejaChoisis={choix === null ? [] : choix.ids}
				annuaire={professionnels}
				onFermer={() => setCarnetOuvert(false)}
				onConfirmer={(ids) => {
					setChoix({ ids });
					setCarnetOuvert(false);
				}}
			/>
		</>
	);
}
