import { LigneDeReleve, ListeDeReleve, PageEcran, type Lecture } from '../../ui';
import type { CleConseil } from '../../lib/croissance/conseils';
import { BlocDeFiche, ChampsDeFiche, FriseDesEtapes } from '../../ui/admin';
import { dateCourteDeParis } from '../../lib/admin/dates';
import { quandInscrit } from './aujourdhui';
import { evenementAffiche, faitDuParcours, type EvenementCrm, type TacheAffichee } from './commun';
import { CorpsDeFiche, type GestesDeFiche } from './fiche';

/**
 * LA FICHE D'UN COMPTE CLIENT (16/10/2026) : l'établissement, l'abonnement, le
 * parcours (les étapes sur une frise, le score et ses raisons, la source), les
 * membres et leur dernière visite ; l'historique y mêle ce que l'équipe a noté,
 * les étapes franchies et les conseils de Plume envoyés.
 *
 * ⚠️ AUCUNE DONNÉE DU MÉTIER DU CLIENT : ni débiteur, ni facture, ni montant dû. Le
 * serveur ne les lit pas (`admin-tables.test.ts`), l'écran ne les attend pas.
 */

export interface FicheCompte {
	readonly id: string;
	readonly nom: string;
	readonly siren?: string;
	readonly ville?: string;
	readonly inscritLe: number;
	readonly formule: string;
	readonly rythme?: string;
	readonly prochainPrelevementLe?: number;
	readonly resiliationLe?: number;
	readonly raisonResiliation?: string;
	readonly source: string;
	readonly pageEntree?: string;
	readonly score: number;
	readonly raisonsDuScore: readonly string[];
	readonly etapes: readonly {
		readonly etape: string;
		readonly libelle: string;
		readonly le?: number;
	}[];
	readonly membres: readonly {
		readonly nom?: string;
		readonly email?: string;
		readonly role: string;
		readonly derniereVisite?: number;
	}[];
	readonly conseils: readonly { readonly cle: string; readonly le: number }[];
}

export interface DonneesFicheCompte {
	readonly fiche: FicheCompte;
	readonly historique: readonly EvenementCrm[];
	readonly taches: readonly TacheAffichee[];
}

const NOMS_DES_CONSEILS: Readonly<Record<CleConseil, string>> = {
	bienvenue: 'Bienvenue',
	'il-manque-vos-factures': 'Il manque vos factures',
	'ce-qui-vous-est-du': 'Ce qui vous est dû',
	'ce-qui-partirait': 'Ce qui partirait',
	'rapport-diagnostic': 'Rapport du diagnostic',
	'offre-de-bienvenue': 'Offre de bienvenue',
	'offre-de-bienvenue-fin': 'Fin de l’offre de bienvenue'
};

const RETOUR = { vers: '/admin/comptes' as const, libelle: 'Comptes' };

export function EcranFicheCompte({
	lecture,
	maintenant,
	finDuJour,
	gestes
}: {
	readonly lecture: Lecture<DonneesFicheCompte | null>;
	readonly maintenant: number;
	readonly finDuJour: number;
	readonly gestes?: GestesDeFiche;
}) {
	if (lecture.etat !== 'pret') {
		return (
			<PageEcran
				entete={{ genre: 'poussee', retour: RETOUR, titre: 'Compte' }}
				etat={lecture.etat}
			/>
		);
	}
	if (lecture.valeur === null) {
		return (
			<PageEcran
				entete={{ genre: 'poussee', retour: RETOUR, titre: 'Compte' }}
				etat={{
					vide: {
						illustration: '🔎',
						titre: 'Ce compte n’existe plus',
						explication: 'Il a peut-être été supprimé par son titulaire, avec toutes ses données.'
					}
				}}
			/>
		);
	}
	const { fiche, historique, taches } = lecture.valeur;
	const premierAdministrateur = fiche.membres.find((m) => m.role === 'Administrateur' && m.email);

	const evenements = [
		...historique.map(evenementAffiche),
		...fiche.etapes
			.filter((e) => e.le !== undefined && e.etape !== 'INSCRIT')
			.map((e) => faitDuParcours(`etape-${e.etape}`, e.le ?? 0, 'ETAPE', `Étape : ${e.libelle}`)),
		...fiche.conseils.map((c, i) =>
			faitDuParcours(
				`conseil-${c.cle}-${i}`,
				c.le,
				'CONSEIL',
				`Conseil de Plume envoyé : ${(NOMS_DES_CONSEILS as Readonly<Record<string, string>>)[c.cle] ?? c.cle}`
			)
		)
	];

	const details = (
		<>
			<BlocDeFiche titre="Établissement">
				<ChampsDeFiche
					champs={[
						{ libelle: 'SIREN', valeur: fiche.siren ?? 'Pas encore renseigné' },
						...(fiche.ville === undefined ? [] : [{ libelle: 'Ville', valeur: fiche.ville }]),
						{ libelle: 'Inscrit', valeur: dateCourteDeParis(fiche.inscritLe) }
					]}
				/>
			</BlocDeFiche>

			<BlocDeFiche titre="Abonnement">
				<ChampsDeFiche
					champs={[
						{ libelle: 'Formule', valeur: fiche.formule },
						...(fiche.rythme === undefined ? [] : [{ libelle: 'Rythme', valeur: fiche.rythme }]),
						...(fiche.prochainPrelevementLe === undefined
							? []
							: [
									{
										libelle: 'Prochain prélèvement',
										valeur: dateCourteDeParis(fiche.prochainPrelevementLe)
									}
								]),
						...(fiche.resiliationLe === undefined
							? []
							: [{ libelle: 'Résiliation', valeur: dateCourteDeParis(fiche.resiliationLe) }]),
						...(fiche.raisonResiliation === undefined
							? []
							: [{ libelle: 'Raison donnée', valeur: fiche.raisonResiliation }])
					]}
				/>
			</BlocDeFiche>

			<BlocDeFiche
				titre="Parcours"
				droite={
					<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
						Score <span className="font-semibold text-cladd-fg">{fiche.score}</span> / 100
					</span>
				}
			>
				<FriseDesEtapes
					etapes={fiche.etapes.map((e) => ({
						cle: e.etape,
						libelle: e.libelle,
						...(e.le === undefined ? {} : { le: dateCourteDeParis(e.le) })
					}))}
				/>
				<ChampsDeFiche
					champs={[
						{ libelle: 'Arrivé par', valeur: fiche.source },
						...(fiche.pageEntree === undefined
							? []
							: [{ libelle: 'Page d’entrée', valeur: fiche.pageEntree }]),
						...(fiche.raisonsDuScore.length === 0
							? []
							: [{ libelle: 'Ce qui fait le score', valeur: fiche.raisonsDuScore.join(', ') }])
					]}
				/>
			</BlocDeFiche>

			<BlocDeFiche titre={`Membres · ${fiche.membres.length}`}>
				<ListeDeReleve>
					{fiche.membres.map((m, i) => (
						<LigneDeReleve
							key={m.email ?? i}
							titre={m.nom ?? m.email ?? 'Membre'}
							ligne={[m.email, m.role].filter(Boolean).join(' · ')}
							date={
								m.derniereVisite === undefined
									? 'jamais venu'
									: `vu ${quandInscrit(m.derniereVisite, maintenant)}`
							}
						/>
					))}
				</ListeDeReleve>
			</BlocDeFiche>
		</>
	);

	return (
		<PageEcran entete={{ genre: 'poussee', retour: RETOUR, titre: fiche.nom }} largeur="large">
			<CorpsDeFiche
				nom={fiche.nom}
				ligne={`${fiche.formule} · ${fiche.source}`}
				{...(premierAdministrateur?.email === undefined
					? {}
					: { email: premierAdministrateur.email })}
				details={details}
				taches={taches}
				evenements={evenements}
				maintenant={maintenant}
				finDuJour={finDuJour}
				{...(gestes === undefined ? {} : { gestes })}
			/>
		</PageEcran>
	);
}
