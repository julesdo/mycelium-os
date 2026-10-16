import { useState } from 'react';
import {
	BoutonPrincipal,
	BoutonTexte,
	FeuillePleinEcran,
	Lien,
	PageEcran,
	type Lecture
} from '../../ui';
import { BlocDeFiche, ChampsDeFiche } from '../../ui/admin';
import { dateCourteDeParis, echeanceDeTache } from '../../lib/admin/dates';
import { LIBELLES_DES_CIBLES, type StatutProspect } from '../../lib/crm/statuts';
import { quandInscrit } from './aujourdhui';
import { evenementAffiche, nomCourt, type EvenementCrm, type TacheAffichee } from './commun';
import { CorpsDeFiche, type GestesDeFiche } from './fiche';
import {
	FeuilleProspect,
	type CandidatDuRegistre,
	type ChampsProspect
} from './formulaire-prospect';
import { SelecteurDeStatut, type LigneProspect } from './prospects';

/**
 * LA FICHE D'UN PROSPECT (16/10/2026) : la forme de celle d'un compte (gestes, À
 * faire, historique, composeur), avec les champs du tableur et la source légale du
 * contact (« Trouvé où »).
 *
 * « Ne plus le contacter » efface les coordonnées personnelles (dirigeant, fonction,
 * e-mail, téléphone) et met l'empreinte de l'adresse sur la liste d'opposition :
 * un import ne le fera pas revenir. Une confirmation le dit avant.
 */

export interface FicheProspect extends LigneProspect {
	readonly siren?: string;
	readonly effectif?: string;
	readonly fonction?: string;
	readonly email?: string;
	readonly telephone?: string;
	readonly site?: string;
	readonly trouveOu?: string;
	readonly notes?: string;
	readonly creeLe: number;
	readonly creePar: string;
}

export interface DonneesFicheProspect {
	readonly fiche: FicheProspect;
	readonly historique: readonly EvenementCrm[];
	readonly taches: readonly TacheAffichee[];
}

export interface GestesDuProspect extends GestesDeFiche {
	readonly onChangerStatut: (statut: StatutProspect) => void;
	readonly onModifier: (champs: ChampsProspect) => Promise<void>;
	readonly onStop: () => Promise<void>;
	readonly onChercherAuRegistre: (nom: string) => Promise<readonly CandidatDuRegistre[]>;
}

const RETOUR = { vers: '/admin/prospects' as const, libelle: 'Prospects' };

function ouVide(valeur: string | undefined): string {
	return valeur === undefined || valeur === '' ? 'Pas renseigné' : valeur;
}

export function EcranFicheProspect({
	lecture,
	maintenant,
	finDuJour,
	gestes
}: {
	readonly lecture: Lecture<DonneesFicheProspect | null>;
	readonly maintenant: number;
	readonly finDuJour: number;
	readonly gestes?: GestesDuProspect;
}) {
	const [feuille, setFeuille] = useState<null | 'MODIFIER' | 'STOP'>(null);
	const [stopEnCours, setStopEnCours] = useState(false);

	if (lecture.etat !== 'pret') {
		return (
			<PageEcran
				entete={{ genre: 'poussee', retour: RETOUR, titre: 'Prospect' }}
				etat={lecture.etat}
			/>
		);
	}
	if (lecture.valeur === null) {
		return (
			<PageEcran
				entete={{ genre: 'poussee', retour: RETOUR, titre: 'Prospect' }}
				etat={{
					vide: {
						illustration: '🔎',
						titre: 'Ce prospect n’existe plus',
						explication: 'Sans contact depuis trois ans, un prospect est effacé de lui-même.'
					}
				}}
			/>
		);
	}
	const { fiche, historique, taches } = lecture.valeur;
	const stop = fiche.statut === 'STOP';
	const actif = gestes !== undefined && !stop;

	async function confirmerLeStop() {
		if (gestes === undefined) return;
		setStopEnCours(true);
		try {
			await gestes.onStop();
			setFeuille(null);
		} catch {
			// Le refus est dit par l'appelant ; la confirmation reste ouverte.
		} finally {
			setStopEnCours(false);
		}
	}

	const details = (
		<>
			<BlocDeFiche
				titre="Contact"
				droite={
					actif ? <BoutonTexte onClick={() => setFeuille('MODIFIER')}>Modifier</BoutonTexte> : null
				}
			>
				{stop ? (
					<p className="verre-carte rounded-cladd-xl px-3.5 py-3 text-cladd-2xs text-cladd-fg-soft">
						A demandé à ne plus être contacté. Ses coordonnées ont été effacées, et son adresse est
						sur la liste des adresses à ne plus contacter.
					</p>
				) : (
					<ChampsDeFiche
						champs={[
							{
								libelle: 'Dirigeant',
								valeur:
									[fiche.dirigeant, fiche.fonction].filter(Boolean).join(', ') || 'Pas renseigné'
							},
							{
								libelle: 'E-mail',
								valeur:
									fiche.email === undefined ? (
										'Pas renseigné'
									) : (
										<a
											className="underline-offset-2 hover:underline"
											href={`mailto:${fiche.email}`}
										>
											{fiche.email}
										</a>
									)
							},
							{
								libelle: 'Téléphone',
								valeur:
									fiche.telephone === undefined ? (
										'Pas renseigné'
									) : (
										<a
											className="underline-offset-2 hover:underline"
											href={`tel:${fiche.telephone}`}
										>
											{fiche.telephone}
										</a>
									)
							},
							{ libelle: 'Site', valeur: ouVide(fiche.site) }
						]}
					/>
				)}
			</BlocDeFiche>

			<BlocDeFiche titre="Entreprise">
				<ChampsDeFiche
					champs={[
						{ libelle: 'SIREN', valeur: ouVide(fiche.siren) },
						{ libelle: 'Activité', valeur: ouVide(fiche.activite) },
						{ libelle: 'Effectif', valeur: ouVide(fiche.effectif) },
						{ libelle: 'Ville', valeur: ouVide(fiche.ville) },
						{ libelle: 'Cible', valeur: LIBELLES_DES_CIBLES[fiche.cible] }
					]}
				/>
			</BlocDeFiche>

			<BlocDeFiche titre="Prospection">
				<ChampsDeFiche
					champs={[
						{
							libelle: 'Prochaine action',
							valeur:
								fiche.prochaineActionLe === undefined
									? 'Aucune'
									: `${fiche.prochaineAction ?? 'À faire'} · ${echeanceDeTache(fiche.prochaineActionLe, maintenant).texte}`
						},
						{
							libelle: 'Dernier contact',
							valeur:
								fiche.dernierContactLe === undefined
									? 'Jamais'
									: quandInscrit(fiche.dernierContactLe, maintenant)
						},
						{
							libelle: 'Responsable',
							valeur: fiche.responsable === undefined ? 'Personne' : nomCourt(fiche.responsable)
						},
						{ libelle: 'Trouvé où', valeur: ouVide(fiche.trouveOu) },
						{
							libelle: 'Ajouté',
							valeur: `${dateCourteDeParis(fiche.creeLe)}, par ${nomCourt(fiche.creePar)}`
						}
					]}
				/>
			</BlocDeFiche>

			{fiche.notes === undefined ? null : (
				<BlocDeFiche titre="Notes du tableur">
					<p className="verre-carte rounded-cladd-xl px-3.5 py-3 text-cladd-2xs whitespace-pre-line">
						{fiche.notes}
					</p>
				</BlocDeFiche>
			)}

			{actif ? (
				<div className="px-1">
					<BoutonTexte onClick={() => setFeuille('STOP')}>
						Il ne veut plus être contacté
					</BoutonTexte>
				</div>
			) : null}
		</>
	);

	return (
		<PageEcran
			entete={{ genre: 'poussee', retour: RETOUR, titre: fiche.entreprise }}
			largeur="large"
		>
			<CorpsDeFiche
				nom={fiche.entreprise}
				ligne={
					[fiche.ville, fiche.activite].filter(Boolean).join(' · ') ||
					LIBELLES_DES_CIBLES[fiche.cible]
				}
				apres={
					<div className="flex flex-wrap items-center justify-center gap-2 pt-1 lg:justify-start">
						<SelecteurDeStatut
							statut={fiche.statut}
							lectureSeule={!actif}
							onChanger={(s) => gestes?.onChangerStatut(s)}
						/>
						{fiche.compteId === undefined ? null : (
							<BoutonTexte as={Lien} to="/admin/comptes/$id" params={{ id: fiche.compteId }}>
								Voir son compte
							</BoutonTexte>
						)}
					</div>
				}
				{...(fiche.email === undefined ? {} : { email: fiche.email })}
				details={details}
				taches={taches}
				evenements={historique.map(evenementAffiche)}
				maintenant={maintenant}
				finDuJour={finDuJour}
				{...(actif ? { gestes } : {})}
			/>

			{actif ? (
				<>
					<FeuilleProspect
						key={feuille === 'MODIFIER' ? 'ouverte' : 'fermee'}
						ouverte={feuille === 'MODIFIER'}
						onFermer={() => setFeuille(null)}
						titre="Modifier le prospect"
						initial={{
							entreprise: fiche.entreprise,
							cible: fiche.cible,
							...(fiche.prochaineActionLe === undefined
								? {}
								: { prochaineActionLe: fiche.prochaineActionLe }),
							...Object.fromEntries(
								(
									[
										'siren',
										'activite',
										'effectif',
										'ville',
										'dirigeant',
										'fonction',
										'email',
										'telephone',
										'site',
										'trouveOu',
										'prochaineAction',
										'notes'
									] as const
								).map((c) => [c, fiche[c] ?? ''])
							)
						}}
						onEnregistrer={gestes.onModifier}
						onChercherAuRegistre={gestes.onChercherAuRegistre}
					/>
					<FeuillePleinEcran
						ouverte={feuille === 'STOP'}
						onFermer={() => setFeuille(null)}
						titre="Ne plus le contacter"
						sousTitre={fiche.entreprise}
						pied={
							<BoutonPrincipal
								pleineLargeur
								disabled={stopEnCours}
								onClick={() => void confirmerLeStop()}
							>
								Effacer ses coordonnées
							</BoutonPrincipal>
						}
					>
						<div className="flex flex-col gap-cladd-2xs text-cladd-xs">
							<p>
								Le nom du dirigeant, sa fonction, son e-mail et son téléphone seront effacés. Le
								prospect restera en « Stop », sans coordonnées.
							</p>
							<p className="text-cladd-fg-soft">
								L’empreinte de son adresse entre dans la liste des adresses à ne plus contacter : un
								prochain import ne le fera pas revenir. Cela ne se défait pas.
							</p>
						</div>
					</FeuillePleinEcran>
				</>
			) : null}
		</PageEcran>
	);
}
