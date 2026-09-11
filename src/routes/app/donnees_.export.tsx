import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useAction } from 'convex/react';
import { Button, Surface } from '@cladd-ui/react';
import { DownloadIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { BoutonPrincipal, EnteteDetail, Page, PageBody } from '../../ui';
import { messageDErreur } from '../../screens/equipe/equipe';
import { poids, type FichierExport } from '../../screens/donnees/types';

export const Route = createFileRoute('/app/donnees_/export')({ component: PageExport });

const NOMBRE = new Intl.NumberFormat('fr-FR');

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
function PageExport() {
	const apercu = useQuery(api.rgpd.apercuDeMesDonnees, {});
	const exporter = useAction(api.rgpd.exporterMesDonnees);

	const [enCours, setEnCours] = useState(false);
	const [fichier, setFichier] = useState<FichierExport | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);

	async function preparer() {
		setEnCours(true);
		setErreur(null);
		try {
			setFichier(await exporter({}));
		} catch (e) {
			setErreur(messageDErreur(e));
		} finally {
			setEnCours(false);
		}
	}

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/donnees"
				retourLibelle="Vos données"
				titre="Emporter vos données"
				sousTitre="Un fichier JSON, lisible par n’importe quel tableur ou logiciel"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Il contient l’intégralité de ce que l’inventaire liste : chaque ligne de facture avec
						son libellé d’origine, sa classification, sa justification et son indice de confiance.
						C’est le format que le règlement appelle « structuré, couramment utilisé et lisible par
						machine ».
					</p>

					{apercu !== undefined && apercu !== null && !apercu.estAdmin ? (
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							L’export est réservé à l’administrateur de l’établissement : il contient le carnet de
							clients, les encours et les impayés.
						</p>
					) : null}

					{erreur ? (
						<p className="text-cladd-xs leading-relaxed" role="alert">
							{erreur}
						</p>
					) : null}

					{fichier ? (
						<Surface
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex flex-wrap items-center gap-cladd-2xs p-cladd-2xs"
						>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="text-cladd-sm font-bold">Votre export est prêt.</span>
								<span className="text-cladd-2xs text-cladd-fg-softer">
									{NOMBRE.format(fichier.lignes)} lignes · {poids(fichier.octets)} · le lien expire
									dans une heure
								</span>
							</span>
							<BoutonPrincipal as="a" href={fichier.url} download={fichier.nomFichier}>
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
							loading={enCours}
							readOnly={enCours}
							onClick={() => void preparer()}
						>
							<DownloadIcon />
							{enCours ? 'Préparation du fichier…' : 'Préparer mon export'}
						</Button>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
