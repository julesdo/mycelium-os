import { DownloadIcon, UploadIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	ChiffreHero,
	EnTeteDeGroupe,
	FacturesNonChiffrees,
	LigneDeReleve,
	Lien,
	ListeDeReleve,
	PageEcran,
	dateCourte,
	eurosCentimes,
	type Lecture
} from '../ui';
import {
	composerRapportDiagnostic,
	type DiagnosticPourRapport
} from '../lib/verticales/recouvrement/rapport-diagnostic';

/**
 * VOTRE DIAGNOSTIC (19/10/2026, audit stratégique : Découverte devient le diagnostic
 * express). Ce que la loi ajoute aux factures encore dues ET à celles qui ont été
 * payées en retard, sur la période, avec ce que le calcul suppose et ce qu'il n'a pas
 * pu chiffrer. Le PDF dit exactement la même chose : l'écran et lui lisent la même
 * description (`rapport-diagnostic.ts`).
 *
 * ⚠️ LES PAYÉES EN RETARD RESTENT À PART. Leur montant est rentré : elles ne s'ajoutent
 * jamais à « ce qu'on vous doit » de l'accueil, et l'écran le dit sous leur total.
 */

export interface DiagnosticDuJour {
	readonly diagnostic: DiagnosticPourRapport;
	readonly etablissement: string;
}

export function EcranDiagnostic({
	donnees,
	onTelecharger
}: {
	readonly donnees: Lecture<DiagnosticDuJour>;
	readonly onTelecharger?: () => void;
}) {
	const entete = {
		genre: 'poussee',
		titre: 'Votre diagnostic',
		retour: { vers: '/app/revelation', libelle: 'Ce qui est dû' }
	} as const;

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	const { diagnostic: d, etablissement } = donnees.valeur;

	const rien =
		d.impayees.nombreFactures === 0 &&
		d.payeesEnRetard.nombreFactures === 0 &&
		d.nonChiffrees.length === 0 &&
		d.horsPeriode.nombre === 0;
	if (rien) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '🧾',
						titre: 'Rien à diagnostiquer pour l’instant',
						explication:
							'Le diagnostic lit vos factures et vos règlements, et chiffre ce que la loi y ajoute : sur celles qui restent dues, et sur celles qui ont été payées en retard.',
						etapes: [
							'Importez un export comptable (FEC) : il porte vos factures et vos règlements.',
							'Ou branchez Qonto ou Pennylane.'
						],
						action: (
							<BoutonPrincipal as={Lien} to="/app/coffre" search={{ deposer: 1 } as never}>
								<UploadIcon />
								Importer mes factures
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	const rapport = composerRapportDiagnostic(d, etablissement);
	const [encore, payees] = rapport.sections;

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-sm">
				<ChiffreHero
					centimes={d.supplementTotal}
					surTitre="Ce que la loi ajoute à vos factures"
					legende={
						d.du === null
							? `Compté au ${dateCourte(d.arreteAu)}`
							: `Compté au ${dateCourte(d.arreteAu)}, factures depuis le ${dateCourte(d.du)}`
					}
					defile
				/>

				{encore === undefined ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe
							libelle={encore.titre}
							nombre={d.impayees.nombreFactures}
							total={d.impayees.supplement}
						/>
						{/* Les rangées disent ce que la loi ajoute, comme le total de l'en-tête ; le
						    montant encore dû, que le gérant connaît déjà, se dit dessous. */}
						<ListeDeReleve>
							{encore.lignes.slice(2).map((l) => (
								<LigneDeReleve key={l.libelle} titre={l.libelle} montant={l.valeur} />
							))}
						</ListeDeReleve>
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Sur {eurosCentimes(d.impayees.principal)} encore dus. Le détail facture par facture
							est dans « Ce qui est dû ».
						</p>
					</section>
				)}

				{payees === undefined || d.payeesEnRetard.nombreFactures === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe
							libelle={payees.titre}
							nombre={d.payeesEnRetard.nombreFactures}
							total={d.payeesEnRetard.supplement}
						/>
						<ListeDeReleve>
							{d.payeesEnRetard.lignes.map((l) => (
								<LigneDeReleve
									key={l.reference}
									titre={l.reference}
									ligne={`Payée le ${dateCourte(l.payeeLe)}, ${l.joursDeRetard} j de retard`}
									montant={eurosCentimes(l.supplement)}
									retour
								/>
							))}
						</ListeDeReleve>
						{payees.note === undefined ? null : (
							<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{payees.note}
							</p>
						)}
					</section>
				)}

				<FacturesNonChiffrees lignes={d.nonChiffrees} />

				{rapport.hypotheses.length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Ce que le calcul suppose" />
						{rapport.hypotheses.map((h) => (
							<p key={h} className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{h}
							</p>
						))}
					</section>
				)}

				<p className="px-1 text-cladd-3xs leading-relaxed text-cladd-fg-softer">
					{rapport.fondements.join(' · ')}. {rapport.avertissement}
				</p>

				{onTelecharger === undefined ? null : (
					<BoutonPrincipal pleineLargeur onClick={onTelecharger}>
						<DownloadIcon />
						Télécharger le rapport
					</BoutonPrincipal>
				)}
			</div>
		</PageEcran>
	);
}
