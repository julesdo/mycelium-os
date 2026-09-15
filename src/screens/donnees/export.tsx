import { Button, Surface } from '@cladd-ui/react';
import { DownloadIcon } from 'lucide-react';
import { BoutonPrincipal, PageEcran, type Lecture } from '../../ui';
import { TITRE_ECRAN } from '../titres';
import { poids, type FichierExport } from './types';

const NOMBRE = new Intl.NumberFormat('fr-FR');

/** Ce que la page affiche : la réserve à l'administrateur, le fichier préparé ou sa préparation, et le geste que la route pilote. */
export interface ExportAffiche {
	/** Vrai quand un établissement existe et que la personne n'en est pas administratrice. */
	readonly reserveAAdmin: boolean;
	readonly fichier: FichierExport | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onPreparer: () => void;
}

/**
 * EMPORTER VOS DONNÉES — la portabilité, sur sa propre page.
 *
 * ⚠️ ELLE A DEUX ÉTATS, et c'est ce qui la rend mal à l'aise dans une carte :
 * avant, un bouton et une explication ; après, un fichier prêt avec sa taille,
 * son nombre de lignes et son lien qui expire. Coincée entre trois autres
 * sections, la seconde forme apparaissait sous le pouce du lecteur sans qu'il
 * la voie.
 *
 * ⚠️ L'EXPORT EST RÉSERVÉ À L'ADMINISTRATEUR, et le serveur le refuse aussi.
 * C'est le carnet de clients de l'entreprise, ses encours et ses impayés —
 * c'est-à-dire son secret des affaires.
 */
export function EcranExport({ donnees }: { donnees: Lecture<ExportAffiche> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/donnees', libelle: TITRE_ECRAN.donnees },
				titre: 'Emporter vos données',
				sousTitre: 'Un fichier JSON, lisible par n’importe quel tableur ou logiciel'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<div className="flex flex-col gap-cladd-2xs">
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Il contient l’intégralité de ce que l’inventaire liste : chaque ligne de facture avec
						son libellé d’origine, sa classification, sa justification et son indice de confiance.
						C’est le format que le règlement appelle « structuré, couramment utilisé et lisible par
						machine ».
					</p>

					{pret.reserveAAdmin ? (
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							L’export est réservé à l’administrateur de l’établissement : il contient le carnet de
							clients, les encours et les impayés.
						</p>
					) : null}

					{pret.erreur ? (
						<p className="text-cladd-xs leading-relaxed" role="alert">
							{pret.erreur}
						</p>
					) : null}

					{pret.fichier ? (
						<Surface
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex flex-wrap items-center gap-cladd-2xs p-cladd-2xs"
						>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="text-cladd-sm font-bold">Votre export est prêt.</span>
								<span className="text-cladd-2xs text-cladd-fg-softer">
									{NOMBRE.format(pret.fichier.lignes)} lignes · {poids(pret.fichier.octets)} · le
									lien expire dans une heure
								</span>
							</span>
							<BoutonPrincipal as="a" href={pret.fichier.url} download={pret.fichier.nomFichier}>
								<DownloadIcon />
								Télécharger
							</BoutonPrincipal>
						</Surface>
					) : (
						<Button
							size="lg"
							variant="transparent"
							outline={false}
							hoverable={false}
							rounded
							className="verre verre-bouton self-start font-medium"
							loading={pret.enCours}
							readOnly={pret.enCours}
							onClick={pret.onPreparer}
						>
							<DownloadIcon />
							{pret.enCours ? 'Préparation du fichier…' : 'Préparer mon export'}
						</Button>
					)}
				</div>
			)}
		</PageEcran>
	);
}
