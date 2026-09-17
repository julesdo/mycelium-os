import { Button, List, ListItem, ListSeparator, SectionTitle, Surface } from '@cladd-ui/react';
import { Trash2Icon } from 'lucide-react';
import {
	RechercheAvocat,
	RechercheCommissaire,
	SaisirUneFiche,
	precisionDeLaFiche,
	type AvocatAffiche,
	type EtatRechercheAvocat,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type FicheASaisir,
	type FicheIntervenant,
	type RepertoireAffiche
} from '../../ui';

/**
 * LE CARNET D'INTERVENANTS, EN LISTE — et ses deux recherches, en feuilles.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL EXISTE ICI, ALORS QU'IL N'A JAMAIS EU D'ADRESSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `intervenants` est une table réelle, cloisonnée et indexée, qui porte nom,
 * rôle, ressort, coordonnées, origine (`SAISI_A_LA_MAIN` /
 * `RETENU_DEPUIS_UN_REPERTOIRE`) et la date de relevé de sa source. Les trois
 * composants qui la servent n'étaient montés QUE par l'écran de procédure d'une
 * créance : le carnet ne s'ouvrait donc qu'au moment de déclarer un acte, sur un
 * dossier précis.
 *
 * ⚠️ ET C'EST CE QUE L'ADRESSE DU DÉBITEUR DÉBLOQUE. Un automatisme du lot 1
 * s'appuie explicitement dessus : l'adresse donne le département du commissaire
 * et le barreau. Le supprimer avec l'écran de procédure aurait débloqué quelque
 * chose qui n'existe plus.
 *
 * ⚠️ ON NE CHOISIT RIEN ICI. La feuille « Qui fait l'acte » pose une question —
 * qui fait CET acte, sur CETTE créance — et cette section n'en pose aucune : on
 * y tient une liste. Y poser un anneau de sélection, ou une carte « Moi-même »,
 * ferait croire à un rattachement par défaut que rien n'écrirait.
 *
 * ⚠️ ET ELLE NE CLASSE PAS. Ordre alphabétique, celui que rend `monCarnet`. Un
 * ordre de pertinence serait une mise en avant, et une mise en avant est une
 * orientation vers une profession — ce que le référentiel juridique ne dit pas
 * (`professionCompetenteParActe` n'est pas relevé).
 */
export interface IntervenantsAffiches {
	/** Les fiches du gérant, dans l'ordre où `monCarnet` les rend. */
	readonly carnet: readonly FicheIntervenant[];
	readonly erreur: string | null;
	readonly onAjouter: (fiche: FicheASaisir) => void;
	readonly onOublier: (intervenantId: string) => void;

	/** La recherche d'études, en feuille : elle appelle une action Convex. */
	readonly rechercheCommissaireOuverte: boolean;
	readonly etatRechercheCommissaire: EtatRechercheCommissaire;
	readonly onOuvrirRechercheCommissaire: () => void;
	readonly onFermerRechercheCommissaire: () => void;
	readonly onChercherCommissaire: (departement: string) => void;
	readonly onRetenirEtude: (etude: EtudeAffichee) => void;

	/** La recherche d'avocats, sa sœur : elle lit un répertoire ingéré. */
	readonly rechercheAvocatOuverte: boolean;
	readonly repertoire: RepertoireAffiche | null;
	readonly barreau: string;
	readonly specialite: string;
	readonly etatAvocats: EtatRechercheAvocat;
	readonly onOuvrirRechercheAvocat: () => void;
	readonly onFermerRechercheAvocat: () => void;
	readonly onChoisirBarreau: (barreau: string) => void;
	readonly onChoisirSpecialite: (specialite: string) => void;
	readonly onRetenirAvocat: (avocat: AvocatAffiche) => void;
}

export function SectionIntervenants({
	carnet,
	erreur,
	onAjouter,
	onOublier,
	rechercheCommissaireOuverte,
	etatRechercheCommissaire,
	onOuvrirRechercheCommissaire,
	onFermerRechercheCommissaire,
	onChercherCommissaire,
	onRetenirEtude,
	rechercheAvocatOuverte,
	repertoire,
	barreau,
	specialite,
	etatAvocats,
	onOuvrirRechercheAvocat,
	onFermerRechercheAvocat,
	onChoisirBarreau,
	onChoisirSpecialite,
	onRetenirAvocat
}: IntervenantsAffiches) {
	return (
		<>
			{erreur ? (
				<p className="text-cladd-xs leading-relaxed" role="alert">
					{erreur}
				</p>
			) : null}

			<SectionTitle>Les fiches</SectionTitle>
			{carnet.length === 0 ? (
				/*
				  ⚠️ LE VIDE MONTRE LE CHEMIN, JAMAIS UN CADRAN À ZÉRO (règle d'écran
				  n° 4). Il dit ce que le carnet sert à faire, et le formulaire juste
				  dessous porte les deux recherches qui le remplissent.
				*/
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Aucune fiche. Le carnet sert à retrouver, au moment de déclarer un acte, le commissaire de
					justice ou l’avocat que vous avez déjà retenu — sans le rechercher deux fois.
				</p>
			) : (
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="p-0"
				>
					<List>
						{carnet.map((fiche, rang) => (
							<div key={fiche._id}>
								{rang > 0 ? <ListSeparator /> : null}
								<ListItem className="flex flex-wrap items-center gap-cladd-3xs">
									{/* Même base que les rangées de l'équipe : sans elle, `flex-1`
									    part d'une base nulle et c'est le NOM que le bouton de
									    retrait ampute à 375 px. */}
									<span className="flex min-w-0 flex-1 basis-64 flex-col">
										<span className="truncate text-cladd-sm font-semibold text-cladd-fg">
											{fiche.nom}
										</span>
										<span className="truncate text-cladd-2xs text-cladd-fg-softer">
											{precisionDeLaFiche(fiche)}
										</span>
									</span>
									<Button
										square
										variant="transparent"
										aria-label={`Oublier ${fiche.nom}`}
										onClick={() => onOublier(fiche._id)}
									>
										<Trash2Icon />
									</Button>
								</ListItem>
							</div>
						))}
					</List>
				</Surface>
			)}

			<SaisirUneFiche
				onAjouter={onAjouter}
				onChercherUnCommissaire={onOuvrirRechercheCommissaire}
				onChercherUnAvocat={onOuvrirRechercheAvocat}
			/>

			{/*
			  ⚠️ LES DEUX RECHERCHES RESTENT DES FEUILLES, ICI COMME DANS LE VOLET DE
			  PREUVE. Chacune est un parcours à elle seule — un département ou un
			  barreau, une liste, une fiche retenue avec sa source et sa date de
			  relevé — et la déplier dans la page ferait de cette section la moitié
			  de `/app/compte`.
			*/}
			<RechercheCommissaire
				ouverte={rechercheCommissaireOuverte}
				etat={etatRechercheCommissaire}
				onFermer={onFermerRechercheCommissaire}
				onChercher={onChercherCommissaire}
				onRetenir={onRetenirEtude}
			/>
			<RechercheAvocat
				ouverte={rechercheAvocatOuverte}
				repertoire={repertoire}
				barreau={barreau}
				specialite={specialite}
				etat={etatAvocats}
				onFermer={onFermerRechercheAvocat}
				onChoisirBarreau={onChoisirBarreau}
				onChoisirSpecialite={onChoisirSpecialite}
				onRetenir={onRetenirAvocat}
			/>
		</>
	);
}
