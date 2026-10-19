import { DownloadIcon, UploadIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	CarteBouton,
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

/** Les clients publics qui ont payé en retard : un par carte, ses factures et leur somme. */
function clientsPublics(d: DiagnosticPourRapport) {
	const parClient = new Map<string, { nom: string; factures: number; supplement: bigint }>();
	for (const l of d.payeesEnRetard.lignes) {
		if (l.public !== true || l.debiteurId === undefined) continue;
		const deja = parClient.get(l.debiteurId);
		parClient.set(l.debiteurId, {
			nom: l.debiteur ?? 'Client public',
			factures: (deja?.factures ?? 0) + 1,
			supplement: (deja?.supplement ?? 0n) + l.supplement
		});
	}
	return [...parClient.entries()].map(([id, c]) => ({ id, ...c }));
}

export function EcranDiagnostic({
	donnees,
	onTelecharger,
	onPreparerCourrier
}: {
	readonly donnees: Lecture<DiagnosticDuJour>;
	readonly onTelecharger?: () => void;
	/** Ouvre la demande de paiement des intérêts moratoires d'un client public (lot 1 bis). */
	readonly onPreparerCourrier?: (debiteurId: string) => void;
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

				{onPreparerCourrier === undefined || clientsPublics(d).length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Vos clients publics" nombre={clientsPublics(d).length} />
						{clientsPublics(d).map((c) => (
							<CarteBouton
								key={c.id}
								titre={c.nom}
								ligne={`${c.factures} facture${c.factures > 1 ? 's' : ''} payée${c.factures > 1 ? 's' : ''} en retard`}
								montant={eurosCentimes(c.supplement)}
								onClick={() => onPreparerCourrier(c.id)}
							/>
						))}
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Un acheteur public doit les pénalités de retard (« intérêts moratoires ») et les frais
							de recouvrement de plein droit. La demande de paiement se prépare à votre nom, vous la
							relisez et vous l’envoyez.
						</p>
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
