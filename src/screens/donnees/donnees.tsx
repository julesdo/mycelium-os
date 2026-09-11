import { List, ListItem } from '@cladd-ui/react';
import { DownloadIcon, TrashIcon, UserXIcon } from 'lucide-react';
import { LigneAnalyse, ListeAnalyses, SectionEcran } from '../../ui';
import type { ApercuDonnees } from './types';

const NOMBRE = new Intl.NumberFormat('fr-FR');

/**
 * VOS DONNÉES — un inventaire, et trois portes.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL ÉTAIT, ET POURQUOI C'ÉTAIT FAUX SUR UN TÉLÉPHONE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Quatre sections empilées, dont deux DESTRUCTRICES, chacune avec ses deux
 * paragraphes d'explication : 3,2 écrans de défilement à 375 px, mesurés. Le
 * bouton « Supprimer l'établissement » arrivait au milieu d'un défilement, et
 * celui du compte plus bas encore.
 *
 * Un réglage destructeur ne se croise pas en passant. Toutes les applications
 * mobiles le mettent derrière une RANGÉE qui pousse vers sa propre page, où
 * l'explication a la place de se lire et où le geste est le seul de l'écran.
 * C'est plus sûr ET plus court.
 *
 * ⚠️ L'INVENTAIRE, LUI, RESTE EN PLACE. C'est la réponse à la question qu'on
 * vient poser — « qu'est-ce que vous détenez sur moi ? » — et la cacher
 * derrière une rangée ferait un écran qui ne répond rien.
 */

export function Donnees({ apercu }: { apercu: ApercuDonnees }) {
	const lignes: readonly { quoi: string; combien: string }[] = [
		{ quoi: 'Fichiers importés', combien: NOMBRE.format(apercu.depots) },
		{ quoi: 'Factures enregistrées', combien: NOMBRE.format(apercu.factures) },
		{ quoi: 'Débiteurs identifiés', combien: NOMBRE.format(apercu.debiteurs) },
		{ quoi: 'Décomptes arrêtés', combien: NOMBRE.format(apercu.decomptes) },
		{ quoi: 'Personnes ayant accès', combien: NOMBRE.format(apercu.membres) }
	];

	return (
		<div className="flex max-w-180 flex-col gap-cladd-2xs">
			<SectionEcran
				titre="Ce que nous détenons pour vous"
				legende={`Depuis le ${new Date(apercu.creeLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
			>
				{/* `ListItem` plutôt qu'une grille de `<dl>` : ce sont des rangées de
				    réglage, et le kit en fournit le rythme vertical. */}
				<List className="p-0">
					{lignes.map((ligne) => (
						<ListItem key={ligne.quoi}>
							<span className="text-cladd-fg-soft">{ligne.quoi}</span>
							<span className="ml-auto text-cladd-sm font-bold tabular-nums">{ligne.combien}</span>
						</ListItem>
					))}
				</List>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					Ne figure pas ici le référentiel de classification des libellés, mutualisé entre tous les
					établissements. Il ne contient qu’un libellé de produit et son verdict : jamais de
					montant, de quantité, de fournisseur, ni d’identité. Il ne vous appartient pas, et ne part
					donc ni à l’export ni à la suppression.
				</p>
			</SectionEcran>

			<ListeAnalyses>
				{/* L'export n'est offert qu'à l'administrateur : c'est le carnet de
				    clients de l'entreprise, ses encours et ses impayés, c'est-à-dire son
				    secret des affaires. Le serveur le refuse aussi. */}
				{apercu.estAdmin ? (
					<LigneAnalyse
						vers="/app/donnees/export"
						icone={<DownloadIcon />}
						titre="Emporter vos données"
						precision="Un fichier JSON, lisible par n’importe quel tableur"
						valeur="Préparer"
					/>
				) : null}

				{apercu.estAdmin ? (
					<LigneAnalyse
						vers="/app/donnees/supprimer-etablissement"
						icone={<TrashIcon />}
						titre="Supprimer l’établissement"
						precision={`Définitif, sans corbeille — ${apercu.nomEtablissement}`}
					/>
				) : null}

				<LigneAnalyse
					vers="/app/donnees/supprimer-compte"
					icone={<UserXIcon />}
					titre="Supprimer mon compte"
					precision="Définitif, sans corbeille"
				/>
			</ListeAnalyses>
		</div>
	);
}
