import {
	BarresDesSemaines,
	BoutonPrincipal,
	ChiffreHero,
	EnTeteDeGroupe,
	LigneDeReleve,
	Lien,
	ListeDeReleve,
	NombreHero,
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

/**
 * CE QUE L'ÉCRAN POSE, SANS AUCUN CADRAN À ZÉRO (relecture du 21/10/2026, règle d'écran
 * n° 4). Le montant en grand quand de l'argent est rentré ; sinon les relances parties,
 * sinon les jours avant la date limite. Le relevé ne porte que ce qui n'est pas nul, et
 * jamais deux fois le chiffre déjà posé en grand.
 */
export function compositionDeLaSemaine(
	semaine: VotreSemaine,
	relancesProgrammees: number
): {
	heros:
		| { readonly genre: 'MONTANT'; readonly centimes: bigint }
		| { readonly genre: 'NOMBRE'; readonly nombre: number; readonly surTitre: string };
	lignes: { readonly titre: string; readonly ligne?: string; readonly valeur: string }[];
	cetteSemaine: string;
} {
	const heros =
		semaine.rentre > 0n
			? ({ genre: 'MONTANT', centimes: semaine.rentre } as const)
			: semaine.relancesParties > 0
				? ({
						genre: 'NOMBRE',
						nombre: semaine.relancesParties,
						surTitre: 'Relances parties'
					} as const)
				: ({
						genre: 'NOMBRE',
						nombre: semaine.dateLimiteDansJours ?? 0,
						surTitre: 'Jours avant la date limite la plus proche'
					} as const);
	const lignes: { titre: string; ligne?: string; valeur: string }[] = [];
	if (heros.genre === 'MONTANT' && semaine.relancesParties > 0) {
		lignes.push({
			titre: 'Relances parties',
			ligne: 'À votre nom',
			valeur: String(semaine.relancesParties)
		});
	}
	if (semaine.clientsQuiOntPaye > 0) {
		lignes.push({ titre: 'Clients qui ont payé', valeur: String(semaine.clientsQuiOntPaye) });
	}
	if (
		semaine.dateLimiteDansJours !== null &&
		!(heros.genre === 'NOMBRE' && heros.surTitre !== 'Relances parties')
	) {
		lignes.push({
			titre: 'Date limite la plus proche',
			ligne: 'Pour agir en justice, sur un dossier ouvert',
			valeur: `dans ${semaine.dateLimiteDansJours} j`
		});
	}
	return {
		heros,
		lignes,
		cetteSemaine:
			relancesProgrammees === 0
				? 'Aucune relance programmée pour l’instant.'
				: `${pluriel(relancesProgrammees, 'relance programmée', 'relances programmées')} par Plume : chacune s’affiche avant de partir et se retient d’un geste.`
	};
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
	const { heros, lignes, cetteSemaine } = compositionDeLaSemaine(semaine, relancesProgrammees);
	const periode = `La semaine du ${dateCourte(semaine.debut)}`;

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-sm">
				{heros.genre === 'MONTANT' ? (
					<ChiffreHero
						centimes={heros.centimes}
						surTitre={`Rentré la semaine du ${dateCourte(semaine.debut)}`}
						legende={
							ligneMeilleure ??
							pluriel(semaine.clientsQuiOntPaye, 'client a payé', 'clients ont payé')
						}
						defile
					/>
				) : (
					<NombreHero nombre={heros.nombre} surTitre={heros.surTitre} legende={periode} />
				)}

				<BarresDesSemaines semaines={semaine.huitSemaines} />

				{lignes.length === 0 ? null : (
					<ListeDeReleve>
						{lignes.map((l) => (
							<LigneDeReleve
								key={l.titre}
								titre={l.titre}
								{...(l.ligne === undefined ? {} : { ligne: l.ligne })}
								montant={l.valeur}
							/>
						))}
					</ListeDeReleve>
				)}

				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Cette semaine" />
					<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">{cetteSemaine}</p>
				</section>
			</div>
		</PageEcran>
	);
}
