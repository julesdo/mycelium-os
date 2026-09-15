import { Button } from '@cladd-ui/react';
import { TrashIcon } from 'lucide-react';
import {
	ConfirmationParSaisie,
	PageEcran,
	pluriel,
	type EnteteEcran,
	type Lecture
} from '../../ui';
import type { ApercuDonnees } from './types';

const NOMBRE = new Intl.NumberFormat('fr-FR');

/** Ce que la page affiche : l'inventaire qui part avec l'établissement, le refus du serveur, et la confirmation que la route pilote. */
export interface SuppressionDeLEtablissement {
	readonly apercu: ApercuDonnees;
	readonly erreur: string | null;
	readonly onConfirmer: () => void;
}

/**
 * SUPPRIMER L'ÉTABLISSEMENT — un geste destructeur, sur son propre écran.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL NE PEUT PAS RESTER DANS UNE CARTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il était la troisième section d'un écran qui en comptait quatre : on le
 * croisait en faisant défiler, entre un inventaire et un autre bouton rouge.
 * Toutes les applications mobiles mettent un réglage destructeur derrière une
 * rangée qui pousse vers sa propre page — non par cérémonie, mais parce qu'un
 * geste irréversible ne doit pas être atteignable par accident.
 *
 * ⚠️ ET LA CONFIRMATION EST UNE SAISIE, PAS UNE CASE. Le nom exact de
 * l'établissement. C'est le seul garde-fou qui résiste au clic machinal — et il
 * est revérifié côté serveur : l'écran peut le demander, seul le serveur peut
 * l'exiger.
 *
 * ⚠️ IL N'Y A PAS DE CORBEILLE. Le règlement demande l'effacement, pas la mise
 * de côté. L'écran le dit avant, pas après.
 */
export function EcranSupprimerEtablissement({
	donnees
}: {
	donnees: Lecture<SuppressionDeLEtablissement | null>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;
	const entete: EnteteEcran = {
		genre: 'poussee',
		retour: { vers: '/app/donnees', libelle: 'Vos données' },
		titre: 'Supprimer l’établissement',
		sousTitre: pret?.apercu.nomEtablissement
	};

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	if (pret === null) {
		// Sans établissement, il n'y a rien à supprimer : le retour de l'en-tête
		// est la seule issue qui ait un sens, et proposer d'en créer un ici n'en
		// aurait aucun.
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '🏢',
						titre: 'Aucun établissement actif',
						explication: 'Il n’y a rien à supprimer sur ce compte.'
					}
				}}
			/>
		);
	}

	const { apercu, erreur, onConfirmer } = pret;

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-2xs">
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Ses {NOMBRE.format(apercu.factures)} facture{pluriel(apercu.factures)}, ses{' '}
					{NOMBRE.format(apercu.debiteurs)} débiteur{pluriel(apercu.debiteurs)}, ses{' '}
					{NOMBRE.format(apercu.decomptes)} décompte{pluriel(apercu.decomptes)} et les pièces qui
					les soutiennent sont effacés définitivement. Il n’y a pas de corbeille : le règlement
					demande l’effacement, pas la mise de côté. Les {apercu.membres} personnes qui y accèdent
					en perdent l’accès immédiatement.
				</p>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Si vous avez besoin de ces chiffres plus tard — une créance se prescrit en plusieurs
					années — préparez votre export avant.
				</p>

				{erreur ? (
					<p className="text-cladd-xs leading-relaxed" role="alert">
						{erreur}
					</p>
				) : null}

				<ConfirmationParSaisie
					titre={`Supprimer ${apercu.nomEtablissement} ?`}
					texte={`Cette action est définitive. ${NOMBRE.format(apercu.factures)} facture${pluriel(apercu.factures)} et ${NOMBRE.format(apercu.decomptes)} décompte${pluriel(apercu.decomptes)} seront effacés. Saisissez le nom exact de l’établissement pour confirmer.`}
					valeurAttendue={apercu.nomEtablissement}
					invite="Le nom de l’établissement"
					intituleConfirmation="Supprimer définitivement"
					onConfirmer={onConfirmer}
					declencheur={
						<Button className="self-start" color="red" size="lg">
							<TrashIcon />
							Supprimer {apercu.nomEtablissement}
						</Button>
					}
				/>
			</div>
		</PageEcran>
	);
}
