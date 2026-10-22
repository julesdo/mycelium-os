import { ShareIcon } from 'lucide-react';
import { ChampCopiable } from './champ-copiable';
import { LigneDeReleve, ListeDeReleve } from './carte-rangee';
import { LigneBouton, ListeAnalyses } from './navigation';

/**
 * RECOMMANDER LETIKETTE (21/10/2026, le parcours de l'habitude, moment 7) : le lien
 * personnel, sa copie, le partage du téléphone, et ce que les recommandations ont donné —
 * des comptes, jamais un nom.
 *
 * ⚠️ JAMAIS SUR UNE SURFACE TOURNÉE VERS UN DÉBITEUR, jamais dans un courrier.
 */
export interface RecommandationAffichee {
	/** L'adresse à partager, ou `null` pendant qu'elle se crée. */
	readonly lien: string | null;
	readonly inscrits: number;
	readonly abonnes: number;
	readonly moisOfferts: number;
	readonly moisEnAttente: number;
}

const TEXTE_DU_PARTAGE =
	'Je relance mes factures impayées avec Letikette : les relances partent seules, à mon nom. Avec ce lien, un mois vous est offert, à vous comme à moi.';

function peutPartager(): boolean {
	return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export function SectionRecommandation({
	lien,
	inscrits,
	abonnes,
	moisOfferts,
	moisEnAttente
}: RecommandationAffichee) {
	const lignes = [
		...(inscrits > 0 ? [{ titre: 'Inscrits par votre lien', valeur: String(inscrits) }] : []),
		...(abonnes > 0 ? [{ titre: 'Abonnés', valeur: String(abonnes) }] : []),
		...(moisOfferts > 0 ? [{ titre: 'Mois offerts, appliqués', valeur: String(moisOfferts) }] : []),
		...(moisEnAttente > 0
			? [{ titre: 'Mois offerts, à la prochaine échéance', valeur: String(moisEnAttente) }]
			: [])
	];
	return (
		<div className="flex flex-col gap-cladd-2xs">
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				Un confrère a des impayés ? Quand il s’abonne par votre lien et paie sa première échéance,
				un mois vous est offert à tous les deux, déduit de votre prochain prélèvement.
			</p>
			{lien === null ? (
				<p className="text-cladd-2xs text-cladd-fg-soft" role="status">
					Votre lien se prépare…
				</p>
			) : (
				<>
					<ChampCopiable etiquette="Votre lien" affichage={lien} valeur={lien} />
					{peutPartager() ? (
						<ListeAnalyses>
							<LigneBouton
								titre="Partager"
								icone={<ShareIcon />}
								onClick={() => {
									// Une feuille refermée sans choix rejette la promesse : ce n'est pas une panne.
									void navigator
										.share({ title: 'Letikette', text: TEXTE_DU_PARTAGE, url: lien })
										.catch(() => undefined);
								}}
							/>
						</ListeAnalyses>
					) : null}
				</>
			)}
			{lignes.length === 0 ? null : (
				<ListeDeReleve>
					{lignes.map((l) => (
						<LigneDeReleve key={l.titre} titre={l.titre} montant={l.valeur} />
					))}
				</ListeDeReleve>
			)}
		</div>
	);
}
