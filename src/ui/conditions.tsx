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
 * ⚠️ LA SOURCE EST CITÉE UNE FOIS, EN PIED DE TABLEAU, PAS QUATRE FOIS. Les
 * quatre conditions viennent du MÊME article : le répéter sous chaque ligne
 * ajoutait trois fois trente mots à un écran qui en fait déjà onze sur un
 * téléphone (audit du 29/09/2026, F4). Une source par ligne reste rendue quand
 * les lignes n'ont pas la même — le jour où un second texte entrera au
 * référentiel, le tableau le dira sans qu'on y pense.
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
	/*
	  ⚠️ COMPARÉ SUR LA VALEUR, PAS SUR LE NOMBRE DE LIGNES. Deux lignes qui
	  citent le même texte n'ont qu'une source ; trois lignes dont une diffère en
	  ont deux, et chacune doit alors porter la sienne. Un booléen « on cite en
	  bas » écrit à la main se tromperait au premier ajout.
	*/
	const sources = new Set(lignes.map((ligne) => ligne.source));
	const sourceCommune = sources.size === 1 ? [...sources][0] : null;

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

					{/*
					  ⚠️ CE QUE DIT LA LOI EST EN TÊTE, PAS EN COLONNE — depuis le
					  29/09/2026. Sa colonne portait un intitulé et une marge pour un
					  texte d'une ligne, et coûtait 80 px par condition sur un téléphone,
					  soit 320 px sur un tableau qui en compte quatre. Il reste EN FACE du
					  dossier, en haut de la même carte : c'est la promesse du lot 2, et
					  elle tient mieux en deux colonnes qu'en trois écrasées.
					*/}
					<p className="text-cladd-xs leading-snug text-cladd-fg-soft">{ligne.ceQueDitLaLoi}</p>
					{sourceCommune === null ? (
						<p className="text-cladd-2xs text-cladd-fg-softest">{ligne.source}</p>
					) : null}

					<div className="grid gap-cladd-3xs md:grid-cols-2">
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

			{sourceCommune === null ? null : (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
					Ces {lignes.length} conditions viennent du même texte : {sourceCommune}
				</p>
			)}
		</div>
	);
}
