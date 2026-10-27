import { Select } from '@cladd-ui/react';
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
import { dateCourteDeParis, echeanceDeTache, jourDeParis } from '../../lib/admin/dates';
import { ficheALAnnuaire } from '../../lib/crm/annuaire';
import {
	composerEmail,
	etapeDEcriture,
	modeleDe,
	type EtapeDEcriture
} from '../../lib/crm/modeles';
import { valeursDeLaLoi } from '../../lib/crm/valeurs-loi';
import { emailPermis, RAISONS_DU_REFUS } from '../../lib/crm/consentement';
import { LIBELLES_DES_CIBLES, type StatutProspect } from '../../lib/crm/statuts';
import {
	REGISTRE_DES_PARCOURS,
	libelleDeLEtape,
	parcoursParDefaut,
	type Parcours
} from '../../lib/crm/parcours';
import { quandInscrit } from './aujourdhui';
import { evenementAffiche, nomCourt, type EvenementCrm, type TacheAffichee } from './commun';
import { ChoixDuParcours } from './choix-du-parcours';
import { CorpsDeFiche, type GestesDeFiche } from './fiche';
import {
	FeuilleProspect,
	type CandidatDuRegistre,
	type ChampsProspect
} from './formulaire-prospect';
import { SelecteurDeStatut, type LigneProspect } from './prospects';
import { RedactionDEmail, rechercheDuSite } from './redaction-email';
import { FeuilleDAppel, type DansJours } from './appel';
import type { IssueAppel } from '../../lib/crm/appels';

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
	readonly codePartenaire?: string;
	readonly logicielComptable?: string;
	/** Fournisseur public : le majorant estimé avant l'appel, décomposé. */
	readonly estimation?: {
		readonly segments: readonly {
			readonly acheteur: string;
			readonly annee: number;
			readonly montantAnnuelCentimes: bigint;
			readonly joursDeRetard: number;
			readonly interetsCentimes: bigint;
			readonly indemnitesCentimes: bigint;
		}[];
		readonly hypotheses: readonly string[];
		readonly calculeeLe: number;
	};
	readonly emailBase?: 'GENERIQUE' | 'INFORMEE';
	readonly emailInformeLe?: number;
	readonly jetonDesinscription?: string;
}

/** « 31 déc. 2026 » : une date AAAA-MM-JJ, en clair. */
function dateCourteDeJour(jour: string): string {
	return dateCourteDeParis(Date.parse(`${jour}T12:00:00Z`));
}

/** « 12 480 € » : un ordre de grandeur, sans centimes. */
function eurosRonds(centimes: bigint): string {
	return `${new Intl.NumberFormat('fr-FR').format(Number(centimes / 100n))} €`;
}

/** Le parcours dans la ligne, sous le nom : un menu de ses étapes. */
function SelecteurDEtape({
	parcours,
	etape,
	onChanger,
	lectureSeule
}: {
	readonly parcours: Parcours;
	readonly etape: string | undefined;
	readonly onChanger: (etape: string) => void;
	readonly lectureSeule: boolean;
}) {
	const etapes = REGISTRE_DES_PARCOURS[parcours].etapes;
	const courante = libelleDeLEtape(parcours, etape);
	return (
		<Select
			size="md"
			rounded
			title={REGISTRE_DES_PARCOURS[parcours].libelle}
			options={etapes.map((e) => e.cle)}
			value={etapes.find((e) => e.libelle === courante)?.cle ?? etapes[0]!.cle}
			readOnly={lectureSeule}
			keyboardHints={false}
			renderOption={({ value }) => libelleDeLEtape(parcours, value)}
			onChange={(cle) => {
				if (cle !== etape) onChanger(cle);
			}}
			aria-label={`${REGISTRE_DES_PARCOURS[parcours].libelle} : ${courante}`}
		>
			{courante}
		</Select>
	);
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
	/** Avancer le prospect dans son parcours. */
	readonly onChangerEtape: (etape: string) => void;
	/** Le classer dans un autre parcours (lot pilote du 27/10/2026). */
	readonly onChangerParcours?: (parcours: Parcours) => void;
	/** Un appel passé depuis la feuille d'appel : son issue fait le reste. */
	readonly onNoterAppel: (issue: IssueAppel, texte: string, dansJours?: DansJours) => Promise<void>;
	/** Un e-mail écrit depuis son modèle : noté avec son étape, la relance suivante posée. */
	readonly onEmailEcrit: (
		etape: Exclude<EtapeDEcriture, 'FINI'>,
		objet: string,
		texte: string
	) => Promise<void>;
}

/** Qui signe les e-mails de prospection : le prénom affiché, et « Fondateur » s'il l'est. */
export interface Signataire {
	readonly prenom: string;
	readonly fondateur: boolean;
}

/** Les statuts où la routine écrit encore : après une réponse, on écrit à la main. */
const EN_PROSPECTION: readonly StatutProspect[] = ['A_CONTACTER', 'CONTACTE', 'RELANCE'];

const RETOUR = { vers: '/admin/prospects' as const, libelle: 'Prospects' };

function ouVide(valeur: string | undefined): string {
	return valeur === undefined || valeur === '' ? 'Pas renseigné' : valeur;
}

export function EcranFicheProspect({
	lecture,
	maintenant,
	finDuJour,
	gestes,
	signataire
}: {
	readonly lecture: Lecture<DonneesFicheProspect | null>;
	readonly maintenant: number;
	readonly finDuJour: number;
	readonly gestes?: GestesDuProspect;
	readonly signataire?: Signataire;
}) {
	const [feuille, setFeuille] = useState<null | 'MODIFIER' | 'STOP' | 'APPEL'>(null);
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
	const parcours = fiche.parcours ?? parcoursParDefaut(fiche.cible, fiche.activite);
	const telephone = actif && signataire !== undefined ? fiche.telephone : undefined;

	// Le modèle de l'étape, d'après le nombre d'e-mails déjà notés sur la fiche.
	const etape = etapeDEcriture(historique.filter((e) => e.type === 'EMAIL').length);
	const modele = modeleDe(fiche);
	const permission = emailPermis(fiche, maintenant);
	const enRoutine =
		actif && signataire !== undefined && EN_PROSPECTION.includes(fiche.statut) && etape !== 'FINI';
	const redaction =
		enRoutine && permission.permis
			? {
					etape,
					base: permission.base,
					...composerEmail({
						prospect: fiche,
						etape,
						signataire,
						loi: valeursDeLaLoi(jourDeParis(maintenant))
					})
				}
			: null;
	// La routine voudrait écrire, la règle de l'e-mail l'en empêche : la feuille le dit.
	const refus =
		enRoutine && !permission.permis && permission.raison === 'PLUS_D_UN_MOIS' ? (
			<p className="verre-carte rounded-cladd-xl px-3.5 py-3 text-cladd-2xs">
				{RAISONS_DU_REFUS.PLUS_D_UN_MOIS}
			</p>
		) : null;

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
							{
								libelle: 'Site',
								valeur:
									fiche.site !== undefined && fiche.site !== '' ? (
										<a
											className="underline-offset-2 hover:underline"
											href={/^https?:\/\//.test(fiche.site) ? fiche.site : `https://${fiche.site}`}
											target="_blank"
											rel="noreferrer"
										>
											{fiche.site}
										</a>
									) : (
										<a
											className="underline-offset-2 hover:underline"
											href={rechercheDuSite(fiche.entreprise, fiche.ville)}
											target="_blank"
											rel="noreferrer"
										>
											Le chercher
										</a>
									)
							}
						]}
					/>
				)}
			</BlocDeFiche>

			{fiche.estimation === undefined ? null : (
				<BlocDeFiche titre="Estimation avant l’appel">
					<ChampsDeFiche
						champs={[
							{
								libelle: 'Au plus',
								valeur:
									fiche.montantEstimeCentimes === undefined
										? 'Pas calculé'
										: eurosRonds(fiche.montantEstimeCentimes)
							},
							{
								libelle: 'Date butoir',
								valeur:
									fiche.dateButoir === undefined
										? 'Pas calculée'
										: dateCourteDeJour(fiche.dateButoir)
							},
							...fiche.estimation.segments.map((s) => ({
								libelle: `${s.acheteur}, ${s.annee}`,
								valeur: `${eurosRonds(s.interetsCentimes + s.indemnitesCentimes)} (${s.joursDeRetard} j sur ${eurosRonds(s.montantAnnuelCentimes)})`
							}))
						]}
					/>
					<ul className="flex flex-col gap-1 px-1 text-cladd-3xs text-cladd-fg-soft">
						{fiche.estimation.hypotheses.map((h) => (
							<li key={h}>{h}</li>
						))}
					</ul>
				</BlocDeFiche>
			)}

			<BlocDeFiche titre="Entreprise">
				<ChampsDeFiche
					champs={[
						{
							libelle: 'SIREN',
							valeur:
								fiche.siren === undefined || fiche.siren === '' ? (
									'Pas renseigné'
								) : (
									<a
										className="underline-offset-2 hover:underline"
										href={ficheALAnnuaire(fiche.siren)}
										target="_blank"
										rel="noreferrer"
										title="Sa fiche à l’annuaire des entreprises"
									>
										{fiche.siren}
									</a>
								)
						},
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
						<ChoixDuParcours
							parcours={parcours}
							lectureSeule={!actif || gestes?.onChangerParcours === undefined}
							onChoisir={(p) => gestes?.onChangerParcours?.(p)}
						/>
						<SelecteurDEtape
							parcours={parcours}
							etape={fiche.etapeParcours}
							lectureSeule={!actif}
							onChanger={(e) => gestes?.onChangerEtape(e)}
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
				{...(telephone === undefined ? {} : { onAppeler: () => setFeuille('APPEL') })}
				{...(refus === null ? {} : { avantEmail: refus })}
				{...(redaction === null || gestes === undefined
					? {}
					: {
							ecrire: (
								<RedactionDEmail
									etape={redaction.etape}
									base={redaction.base}
									modele={modele}
									objet={redaction.objet}
									corps={redaction.corps}
									{...(fiche.email === undefined ? {} : { email: fiche.email })}
									entreprise={fiche.entreprise}
									{...(fiche.ville === undefined ? {} : { ville: fiche.ville })}
								/>
							),
							onNoterEmail: (texte: string) =>
								gestes.onEmailEcrit(redaction.etape, redaction.objet, texte)
						})}
			/>

			{telephone === undefined || gestes === undefined || signataire === undefined ? null : (
				<FeuilleDAppel
					ouverte={feuille === 'APPEL'}
					onFermer={() => setFeuille(null)}
					prospect={{
						entreprise: fiche.entreprise,
						telephone,
						parcours,
						...(fiche.dirigeant === undefined ? {} : { dirigeant: fiche.dirigeant }),
						...(fiche.trouveOu === undefined ? {} : { trouveOu: fiche.trouveOu }),
						...(fiche.montantEstimeCentimes === undefined
							? {}
							: { montantEstimeCentimes: fiche.montantEstimeCentimes }),
						...(fiche.dateButoir === undefined ? {} : { dateButoir: fiche.dateButoir })
					}}
					appelant={signataire.prenom}
					maintenant={maintenant}
					onNoter={gestes.onNoterAppel}
				/>
			)}

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
							parcours,
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
