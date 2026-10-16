import type { ReactNode } from 'react';
import {
	BoutonPrincipal,
	CarteLien,
	EnTeteDeGroupe,
	Lien,
	ListeDeCartes,
	PageEcran,
	type Lecture
} from '../../ui';
import { dateCourteDeParis, echeanceDeTache, libelleDuJour } from '../../lib/admin/dates';
import { TachesGroupees, type TacheAffichee } from './commun';

/**
 * AUJOURD'HUI, DANS L'ADMIN (16/10/2026) : les tâches du jour (en retard d'abord),
 * les comptes à appeler (score ≥ 60, sans tâche faite depuis sept jours), les
 * derniers inscrits avec leur source. Trois groupes, chacun avec son compte ; une
 * ligne mène à sa fiche.
 */

export interface ResumeDuJour {
	readonly taches: readonly TacheAffichee[];
	readonly aAppeler: readonly {
		readonly id: string;
		readonly nom: string;
		readonly score: number;
		readonly raison?: string;
	}[];
	readonly inscrits: readonly {
		readonly id: string;
		readonly nom: string;
		readonly source: string;
		readonly le: number;
	}[];
}

export function EcranAujourdhuiAdmin({
	lecture,
	maintenant,
	debutDuJour,
	finDuJour,
	onCocher,
	actions
}: {
	readonly lecture: Lecture<ResumeDuJour>;
	readonly maintenant: number;
	readonly debutDuJour: number;
	readonly finDuJour: number;
	readonly onCocher: (id: string, faite: boolean) => void;
	/** Au téléphone : le menu de l'en-tête (Équipe, Journal, l'application). */
	readonly actions?: ReactNode;
}) {
	const entete = {
		genre: 'onglet' as const,
		titre: 'Aujourd’hui',
		...(actions === undefined ? {} : { actions, actionsSurBureau: false })
	};
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;
	const { taches, aAppeler, inscrits } = lecture.valeur;

	if (taches.length === 0 && aAppeler.length === 0 && inscrits.length === 0) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '☕',
						titre: 'Rien à faire pour l’instant',
						explication:
							'Les tâches, les comptes à appeler et les nouveaux inscrits arrivent ici. Commencez par importer votre tableur de prospection.',
						action: (
							<BoutonPrincipal as={Lien} to="/admin/prospects/importer">
								Importer le tableur
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-sm">
				{taches.length === 0 ? null : (
					<TachesGroupees
						taches={taches}
						maintenant={maintenant}
						debutDuJour={debutDuJour}
						finDuJour={finDuJour}
						onCocher={onCocher}
						sansFaites
					/>
				)}

				{aAppeler.length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="À appeler" nombre={aAppeler.length} />
						<ListeDeCartes>
							{aAppeler.map((compte) => (
								<CarteLien
									key={compte.id}
									vers="/admin/comptes/$id"
									parametres={{ id: compte.id }}
									titre={compte.nom}
									montant={`${compte.score} / 100`}
									{...(compte.raison === undefined ? {} : { ligne: compte.raison })}
								/>
							))}
						</ListeDeCartes>
					</section>
				)}

				{inscrits.length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Derniers inscrits" nombre={inscrits.length} />
						<ListeDeCartes>
							{inscrits.map((compte) => (
								<CarteLien
									key={compte.id}
									vers="/admin/comptes/$id"
									parametres={{ id: compte.id }}
									titre={compte.nom}
									ligne={compte.source}
									date={quandInscrit(compte.le, maintenant)}
								/>
							))}
						</ListeDeCartes>
					</section>
				)}
			</div>
		</PageEcran>
	);
}

/** « aujourd'hui », « hier », « il y a 4 j », puis la date au-delà de trois mois (comme `dateRelative`). */
export function quandInscrit(le: number, maintenant: number): string {
	const jour = libelleDuJour(le, maintenant);
	if (jour === 'Aujourd’hui' || jour === 'Hier') return jour.toLowerCase();
	const ecart = /^en retard de (\d+) j$/.exec(echeanceDeTache(le, maintenant).texte);
	return ecart !== null && Number(ecart[1]) <= 90 ? `il y a ${ecart[1]} j` : dateCourteDeParis(le);
}
