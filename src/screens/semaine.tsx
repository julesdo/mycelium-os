import {
	BarresDesSemaines,
	BoutonPrincipal,
	ChiffreHero,
	EnTeteDeGroupe,
	LigneDeReleve,
	Lien,
	ListeDeReleve,
	PageEcran,
	dateCourte,
	type Lecture
} from '../ui';
import type { VotreSemaine } from '../lib/verticales/recouvrement/votre-semaine';
import { TITRE_ECRAN } from './titres';

/**
 * « VOTRE SEMAINE » (21/10/2026, le parcours de l'habitude) — le rendez-vous du lundi.
 * Le montant rentré la semaine écoulée, la meilleure semaine depuis longtemps quand elle
 * l'est, les huit dernières semaines, le relevé des autres chiffres, et ce que Plume a
 * programmé pour celle-ci. La carte du lundi et l'e-mail y mènent.
 *
 * ⚠️ « RENTRÉ », JAMAIS « GRÂCE À » : l'écran dit ce qui est arrivé.
 */

export interface SemaineAffichee {
	readonly semaine: VotreSemaine | null;
	readonly relancesProgrammees: number;
}

function pluriel(n: number, mot: string, motPluriel = `${mot}s`): string {
	return `${n} ${n > 1 ? motPluriel : mot}`;
}

function meilleure(depuis: string | null): string | null {
	if (depuis === null) return null;
	return depuis === 'arrivee'
		? 'Votre meilleure semaine depuis votre arrivée'
		: `Votre meilleure semaine depuis le ${dateCourte(depuis)}`;
}

export function EcranSemaine({ donnees }: { readonly donnees: Lecture<SemaineAffichee> }) {
	const entete = {
		genre: 'poussee',
		titre: 'Votre semaine',
		retour: { vers: '/app', libelle: TITRE_ECRAN.aujourdhui }
	} as const;

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	const { semaine, relancesProgrammees } = donnees.valeur;

	if (semaine === null) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '🗓️',
						titre: 'Rien à dire sur la semaine écoulée',
						explication:
							'Ni paiement, ni relance partie, ni date limite proche. Votre semaine revient le lundi où il y a quelque chose à raconter.',
						etapes: [
							'Les relances partent seules une fois activées sur l’accueil.',
							'Les paiements se rapprochent dès qu’un relevé ou un export arrive.'
						],
						action: (
							<BoutonPrincipal as={Lien} to="/app">
								Revenir à Aujourd’hui
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	const ligneMeilleure = meilleure(semaine.meilleureDepuis);

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-sm">
				<ChiffreHero
					centimes={semaine.rentre}
					surTitre={`Rentré la semaine du ${dateCourte(semaine.debut)}`}
					legende={
						ligneMeilleure ??
						(semaine.clientsQuiOntPaye === 0
							? 'Aucun paiement cette semaine-là'
							: `${pluriel(semaine.clientsQuiOntPaye, 'client a payé', 'clients ont payé')}`)
					}
					defile
				/>

				<BarresDesSemaines semaines={semaine.huitSemaines} />

				<ListeDeReleve>
					<LigneDeReleve
						titre="Relances parties"
						ligne="À votre nom, par e-mail"
						montant={String(semaine.relancesParties)}
					/>
					<LigneDeReleve
						titre="Clients qui ont payé"
						montant={String(semaine.clientsQuiOntPaye)}
					/>
					{semaine.dateLimiteDansJours === null ? null : (
						<LigneDeReleve
							titre="Date limite la plus proche"
							ligne="Pour agir en justice, sur un dossier ouvert"
							montant={`dans ${semaine.dateLimiteDansJours} j`}
						/>
					)}
				</ListeDeReleve>

				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Cette semaine" />
					<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						{relancesProgrammees === 0
							? 'Aucune relance programmée pour l’instant. Plume en pose dès qu’une facture arrive à son étape.'
							: `${pluriel(relancesProgrammees, 'relance programmée', 'relances programmées')} par Plume : chacune s’affiche avant de partir et se retient d’un geste.`}
					</p>
				</section>
			</div>
		</PageEcran>
	);
}
