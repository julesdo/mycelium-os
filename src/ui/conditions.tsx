import { Chip, Segmented, SegmentedButton, Surface } from '@cladd-ui/react';

/**
 * LE TABLEAU À TROIS COLONNES — ce que dit la loi, ce qu'il y a dans votre
 * dossier, ce que vous avez répondu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL REMPLACE UN VERDICT, ET IL N'EN REND AUCUN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran disait « Mûre pour une procédure ». Dire qu'une créance remplit ses
 * conditions, c'est qualifier des faits au regard du droit, et ce logiciel ne le
 * fait pas : il lit, il calcule et il montre ; le gérant qualifie, choisit et
 * signe. Aucune ligne ne conclut donc, et aucune couleur de seuil n'est portée :
 * une réponse « oui » n'est pas un seuil franchi.
 *
 * ⚠️ AUCUN BOUTON N'EST ACTIF SUR UNE VALEUR PRÉ-REMPLIE. Le montant et la date
 * se déduisent des factures ; les montrer pré-sélectionnés se lirait comme la
 * réponse attendue. Seule une réponse confirmée allume son segment.
 */

export interface LigneConditionAffichee {
	readonly condition: string;
	readonly nom: string;
	readonly termeJuridique: string;
	readonly ceQueDitLaLoi: string;
	readonly source: string;
	readonly dansLeDossier: string;
	readonly reponse: 'ok' | 'ko' | 'unknown';
	readonly etatReponse: 'CONFIRMEE' | 'A_CONFIRMER' | 'SANS_REPONSE';
	readonly repondable: boolean;
}

function reponseLisible(ligne: LigneConditionAffichee): string {
	if (ligne.etatReponse === 'SANS_REPONSE') return 'Pas encore répondu';
	const valeur = ligne.reponse === 'ok' ? 'Oui' : 'Non';
	return ligne.etatReponse === 'A_CONFIRMER' ? `${valeur}, à confirmer` : valeur;
}

function Colonne({ titre, children }: { titre: string; children: React.ReactNode }) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<p className="text-cladd-2xs text-cladd-fg-softer">{titre}</p>
			{children}
		</div>
	);
}

export function TableauConditions({
	lignes,
	enCours,
	onRepondre
}: {
	lignes: readonly LigneConditionAffichee[];
	enCours: boolean;
	onRepondre: (condition: string, reponse: 'ok' | 'ko') => void;
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			{lignes.map((ligne) => (
				<Surface
					key={ligne.condition}
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
						<p className="text-cladd-sm font-semibold">{ligne.nom}</p>
						<span className="text-cladd-2xs text-cladd-fg-softer">« {ligne.termeJuridique} »</span>
					</div>

					<div className="grid gap-cladd-3xs md:grid-cols-3">
						<Colonne titre="Ce que dit la loi">
							<p className="text-cladd-xs leading-snug">{ligne.ceQueDitLaLoi}</p>
							<p className="text-cladd-2xs text-cladd-fg-softest">{ligne.source}</p>
						</Colonne>
						<Colonne titre="Dans votre dossier">
							<p className="text-cladd-xs leading-snug">{ligne.dansLeDossier}</p>
						</Colonne>
						<Colonne titre="Votre réponse">
							{ligne.etatReponse === 'CONFIRMEE' ? (
								<p className="text-cladd-xs leading-snug font-medium">{reponseLisible(ligne)}</p>
							) : (
								<Chip size="md" color="neutral" className="self-start">
									{reponseLisible(ligne)}
								</Chip>
							)}
							{ligne.repondable ? (
								<Segmented
									className="mt-cladd-3xs self-start"
									activeColor="neutral"
									activeVariant="solid"
								>
									<SegmentedButton
										active={ligne.etatReponse === 'CONFIRMEE' && ligne.reponse === 'ok'}
										disabled={enCours}
										onClick={() => onRepondre(ligne.condition, 'ok')}
									>
										Oui
									</SegmentedButton>
									<SegmentedButton
										active={ligne.etatReponse === 'CONFIRMEE' && ligne.reponse === 'ko'}
										disabled={enCours}
										onClick={() => onRepondre(ligne.condition, 'ko')}
									>
										Non
									</SegmentedButton>
								</Segmented>
							) : (
								<p className="text-cladd-2xs text-cladd-fg-soft">
									Se répond par les questions sur une éventuelle contestation.
								</p>
							)}
						</Colonne>
					</div>
				</Surface>
			))}
		</div>
	);
}
