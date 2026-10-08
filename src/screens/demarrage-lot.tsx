import { useState } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	BoutonTexte,
	CarteBouton,
	EnTeteDeGroupe,
	EnteteDetail,
	ListeACocher,
	ListeDeCartes,
	NOM_DU_PILOTE,
	PageConversation,
	ReponseDePlume,
	TravailDePlume,
	ZoneDeReponse,
	eurosCentimes,
	pluriel,
	type EtapeDeTravail
} from '../ui';

/**
 * DÉMARRER EN LOT — « si on a 40 procédures détectées à démarrer » (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE CODE DE COPILOT MONEY ET D'AIRWALLEX : TOUT COCHÉ, UN BOUTON
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Quarante dossiers à ouvrir un par un, c'est quarante parcours. Ici, Plume les a
 * préparés : ceux qu'il peut relancer sont COCHÉS D'AVANCE, le gérant décoche le
 * client qu'il garde en main, et UN bouton, qui dit combien, les démarre. Plume les
 * démarre alors un par un, sous ses yeux. Ceux à qui il manque quelque chose
 * (l'adresse du client, une procédure collective) sont rangés à part, avec ce qui
 * manque, et s'ouvrent dans le démarrage guidé.
 */

export interface DossierADemarrer {
	readonly creanceId: string;
	readonly debiteurId: string;
	readonly client: string;
	readonly restantDu: bigint;
	readonly nombreFactures: number;
	/** Ce qui manque pour que Plume le relance ; `null` : prêt. */
	readonly manque: string | null;
}

export interface DemarrageEnLotAffiche {
	readonly dossiers: readonly DossierADemarrer[];
	readonly emailReponsesConnu: boolean;
	/** Le démarrage en cours, étape par étape, tel que le pilote le fait. */
	readonly travail: { readonly titre: string; readonly etapes: readonly EtapeDeTravail[] } | null;
	readonly onDemarrer: (creanceIds: readonly string[]) => Promise<number>;
	readonly onCompleter: (debiteurId: string) => void;
}

export function EcranDemarrageEnLot({ lot }: { readonly lot: DemarrageEnLotAffiche }) {
	const prets = lot.dossiers.filter((d) => d.manque === null);
	const aCompleter = lot.dossiers.filter((d) => d.manque !== null);
	/*
	  LES DÉCOCHÉS, PAS LES COCHÉS : un dossier qui arrive pendant qu'on lit la liste
	  (Plume vient de le préparer) entre coché, comme les autres.
	*/
	const [decoches, setDecoches] = useState<ReadonlySet<string>>(new Set());
	const [lance, setLance] = useState<number | null>(null);
	const [enCours, setEnCours] = useState(false);
	const choisis = prets.filter((d) => !decoches.has(d.creanceId));
	const cochees = new Set(choisis.map((d) => d.creanceId));
	const total = choisis.reduce((somme, d) => somme + d.restantDu, 0n);

	async function demarrer() {
		setEnCours(true);
		try {
			setLance(await lot.onDemarrer(choisis.map((d) => d.creanceId)));
		} finally {
			setEnCours(false);
		}
	}

	const termine = lance !== null && lot.travail === null;

	return (
		<PageConversation
			entete={
				<EnteteDetail
					retourVers="/app"
					retourLibelle="Aujourd’hui"
					donneesPretes
					titre="Dossiers à démarrer"
					sousTitre={`${lot.dossiers.length} préparé${pluriel(lot.dossiers.length)} par ${NOM_DU_PILOTE}`}
				/>
			}
			composeur={
				prets.length === 0 || lot.travail !== null || termine ? null : (
					<ZoneDeReponse>
						<BoutonDeReponse
							principal
							enCours={enCours}
							desactive={choisis.length === 0}
							libelle={
								choisis.length === 0
									? 'Cochez au moins un dossier'
									: `Démarrer ${choisis.length} dossier${pluriel(choisis.length)} · ${eurosCentimes(total)}`
							}
							onClick={() => void demarrer()}
						/>
					</ZoneDeReponse>
				)
			}
		>
			{lot.travail !== null ? (
				<TravailDePlume titre={lot.travail.titre} etapes={lot.travail.etapes} />
			) : termine ? (
				<AccueilDePlume
					humeur="content"
					titre={`C’est fait : ${lance} dossier${pluriel(lance)} démarré${pluriel(lance)}.`}
					sousTitre="Je suis leur plan de relance. Je vous préviens dès qu’il se passe quelque chose."
				/>
			) : lot.dossiers.length === 0 ? (
				<AccueilDePlume
					humeur="repos"
					titre="Tout est démarré."
					sousTitre="Dès qu’une facture passe son échéance, je prépare le dossier de son client et je vous le présente ici."
				/>
			) : (
				<ReponseDePlume
					texte={
						`J’ai préparé ${lot.dossiers.length} dossier${pluriel(lot.dossiers.length)}. ` +
						(prets.length === 0
							? ''
							: `${prets.length} ${prets.length > 1 ? 'sont prêts' : 'est prêt'} : je peux ${prets.length > 1 ? 'les démarrer tous' : 'le démarrer'} d’un coup. Décochez un client que vous gardez en main. `) +
						(aCompleter.length === 0
							? ''
							: `${aCompleter.length} ${aCompleter.length > 1 ? 'ont' : 'a'} besoin de vous d’abord.`)
					}
				/>
			)}

			{lot.travail !== null || termine || prets.length === 0 ? null : (
				<section className="flex flex-col gap-2">
					<EnTeteDeGroupe
						libelle="Prêts à démarrer"
						nombre={prets.length}
						total={prets.reduce((s, d) => s + d.restantDu, 0n)}
					/>
					<ListeACocher
						elements={prets.map((d) => ({
							id: d.creanceId,
							titre: d.client,
							ligne: `${d.nombreFactures} facture${pluriel(d.nombreFactures)} en retard`,
							montant: eurosCentimes(d.restantDu)
						}))}
						cochees={cochees}
						onBasculer={(id) => {
							const suivants = new Set(decoches);
							if (suivants.has(id)) suivants.delete(id);
							else suivants.add(id);
							setDecoches(suivants);
						}}
					/>
					<div className="flex justify-end">
						<BoutonTexte
							onClick={() =>
								setDecoches(
									decoches.size === 0 ? new Set(prets.map((d) => d.creanceId)) : new Set()
								)
							}
						>
							{decoches.size === 0 ? 'Tout décocher' : 'Tout cocher'}
						</BoutonTexte>
					</div>
					{lot.emailReponsesConnu ? null : (
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Il me manque aussi votre adresse pour recevoir leurs réponses : je vous la demanderai
							avant la première relance.
						</p>
					)}
				</section>
			)}

			{aCompleter.length === 0 || lot.travail !== null ? null : (
				<section className="flex flex-col gap-2">
					<EnTeteDeGroupe
						libelle="Ont besoin de vous"
						nombre={aCompleter.length}
						total={aCompleter.reduce((s, d) => s + d.restantDu, 0n)}
					/>
					<ListeDeCartes>
						{aCompleter.map((d) => (
							<CarteBouton
								key={d.creanceId}
								titre={d.client}
								ligne={d.manque ?? ''}
								montant={eurosCentimes(d.restantDu)}
								onClick={() => lot.onCompleter(d.debiteurId)}
							/>
						))}
					</ListeDeCartes>
				</section>
			)}
		</PageConversation>
	);
}
