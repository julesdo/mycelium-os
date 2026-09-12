import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Chip, Surface } from '@cladd-ui/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	EnteteDetail,
	Page,
	PageBody,
	SectionEcran,
	SuiviProcedure,
	BoutonPrincipal,
	aujourdHuiISO
} from '../../ui';

export const Route = createFileRoute('/app/creance_/$id/procedure')({ component: PageProcedure });

/**
 * LA PROCÉDURE — ce qui court, et ce qui serait envisageable.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI COURT PASSE AVANT CE QU'ON POURRAIT FAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une procédure déjà engagée fait courir des délais dont un À PEINE DE
 * CADUCITÉ : passé, l'ordonnance est perdue et tout est à reprendre pendant
 * que la prescription court. Mettre la liste des voies envisageables au-dessus
 * reviendrait à faire lire « ce qu'on pourrait engager » avant « ce qui va
 * s'éteindre si personne ne bouge ».
 *
 * ⚠️ ET LES PROCÉDURES INDISPONIBLES SONT MONTRÉES, avec leur motif. Un écran
 * qui masquerait L.126 laisserait croire qu'elle n'existe pas ; le motif dit
 * que ce n'est pas une limite du produit mais une valeur juridique qui manque.
 */
/**
 * « JE L'AI ENGAGÉE LE … » — le seul geste de procédure que ce logiciel offre.
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
function DeclarerEngagement({
	nom,
	enCours,
	onDeclarer
}: {
	nom: string;
	enCours: boolean;
	onDeclarer: (engageeLe: string) => void;
}) {
	const [quand, setQuand] = useState(aujourdHuiISO());

	return (
		<div className="flex flex-col gap-1.5 border-t border-cladd-outline pt-cladd-3xs">
			<span className="text-cladd-2xs text-cladd-fg-softer">
				Vous avez engagé cette voie ? Dites-le : le logiciel suivra les délais qui en découlent.
			</span>
			<div className="flex flex-wrap items-center gap-cladd-3xs">
				<input
					type="date"
					value={quand}
					onChange={(e) => setQuand(e.target.value)}
					aria-label={`Date d’engagement de ${nom}`}
					className="verre h-cladd-md rounded-full px-cladd-3xs text-cladd-xs text-cladd-fg focus:outline-none"
				/>
				<BoutonPrincipal
					loading={enCours}
					readOnly={enCours || quand === ''}
					onClick={() => onDeclarer(quand)}
				>
					Je l’ai engagée
				</BoutonPrincipal>
			</div>
		</div>
	);
}

function PageProcedure() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const suivi = useQuery(api.recouvrement.apresProcedure.suiviDeLaCreance, { creanceId });
	const consignerEvenement = useMutation(api.recouvrement.apresProcedure.consignerEvenement);
	const engagerProcedure = useMutation(api.recouvrement.apresProcedure.engagerProcedure);

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	/**
	 * ⚠️ `survenuLe` VIENT DU CHAMP, jamais de l'horloge. Les délais courent
	 * depuis le FAIT, pas depuis la saisie : les confondre offrirait des jours
	 * sur une caducité, en silence.
	 */
	async function consigner(cle: string, survenuLe: string) {
		setErreur(null);
		setEnCours(true);
		try {
			await consignerEvenement({ creanceId, cle, survenuLe });
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Enregistrement refusé.');
		} finally {
			setEnCours(false);
		}
	}

	/**
	 * DÉCLARER QU'UNE PROCÉDURE A ÉTÉ ENGAGÉE.
	 *
	 * ⚠️ LE LOGICIEL N'ENGAGE PAS, IL ENREGISTRE — troisième ligne rouge. Le
	 * gérant dit ce qu'il a fait ; le produit se met à compter les délais qui en
	 * découlent, et c'est tout ce qu'il fait.
	 *
	 * ⚠️ `ConvexError` PORTE SON MESSAGE DANS `.data`, PAS DANS `.message`. Le
	 * refus qui compte ici — « cette voie n'a pas d'après modélisé » — serait
	 * remplacé par un « Enregistrement refusé » générique sans cette lecture.
	 */
	async function declarer(procedure: string, engageeLe: string) {
		setErreur(null);
		setEnCours(true);
		try {
			await engagerProcedure({ creanceId, procedure, engageeLe });
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: 'Enregistrement refusé.'
			);
		} finally {
			setEnCours(false);
		}
	}

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/creance/$id"
				retourParametres={{ id }}
				retourLibelle={creance?.debiteur ?? 'Créance'}
				titre="Procédure"
				sousTitre={suivi?.libelle ?? 'Aucune procédure engagée'}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					{suivi ? (
						<SectionEcran titre="Ce qui court depuis l’engagement">
							<SuiviProcedure
								suivi={suivi}
								aujourdHui={aujourdHuiISO()}
								enCours={enCours}
								onConsigner={(cle, survenuLe) => void consigner(cle, survenuLe)}
							/>
						</SectionEcran>
					) : null}

					{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

					{creance === undefined ? (
						<p className="sr-only">Chargement…</p>
					) : (
						<SectionEcran titre="Les voies envisageables">
							<div className="flex flex-col gap-cladd-3xs">
								{creance.procedures.map((procedure) => (
									<Surface
										key={procedure.cle}
										variant="transparent"
										outline={false}
										className="verre-carte rounded-cladd-xl"
										contentClassName="flex flex-col gap-1.5 p-cladd-2xs"
									>
										<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
											<span className="text-cladd-sm font-semibold">{procedure.nom}</span>
											<Chip size="md" color={procedure.disponible ? 'green' : 'neutral'}>
												{procedure.disponible ? 'Envisageable' : 'Indisponible'}
											</Chip>
										</div>
										{procedure.blocages.map((blocage) => (
											<p key={blocage} className="text-cladd-2xs text-cladd-fg-soft">
												{blocage}
											</p>
										))}

										{/*
										  ═════════════════════════════════════════════════════
										  ⚠️ LE LOGICIEL N'ENGAGE RIEN. IL ENREGISTRE.
										  ═════════════════════════════════════════════════════

										  C'est la troisième ligne rouge du projet, et la
										  formulation en dépend entièrement. Le bouton ne dit
										  pas « engager cette procédure » — ce serait le
										  logiciel qui agit, et ce serait recommander une voie.
										  Il dit « JE L'AI ENGAGÉE LE … » : le gérant déclare
										  ce qu'il a fait, et le logiciel se met à compter.

										  ⚠️ ET C'EST LE GESTE QUI MANQUAIT À TOUT LE MODULE
										  4.5. `engagerProcedure` existait, complète et testée,
										  et n'était appelée par personne : aucune créance ne
										  pouvait donc passer à `ENGAGEE`, `suiviDeLaCreance`
										  rendait toujours `null`, la machine à états ne
										  démarrait jamais, et les échéances de caducité
										  n'arrivaient jamais au flux. Un sous-système entier
										  rendu inatteignable par l'absence d'un seul appel.

										  ⚠️ LA DATE VIENT DU CHAMP, JAMAIS DE L'HORLOGE. Les
										  délais courent depuis le FAIT. Une requête déposée
										  lundi et saisie vendredi offrirait quatre jours sur
										  une caducité, en silence.
										*/}
										{procedure.suivie && suivi === null ? (
											<DeclarerEngagement
												nom={procedure.nom}
												enCours={enCours}
												onDeclarer={(le) => void declarer(procedure.cle, le)}
											/>
										) : null}
									</Surface>
								))}
							</div>
						</SectionEcran>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
