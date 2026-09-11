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
function PageProcedure() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const suivi = useQuery(api.recouvrement.apresProcedure.suiviDeLaCreance, { creanceId });
	const consignerEvenement = useMutation(api.recouvrement.apresProcedure.consignerEvenement);

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
