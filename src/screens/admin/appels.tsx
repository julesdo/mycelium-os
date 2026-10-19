import { useState } from 'react';
import { CarteBouton, ListeDeCartes, PageEcran, type Lecture } from '../../ui';
import { dateCourteDeParis } from '../../lib/admin/dates';
import { ACCORD_PADDLE_OBTENU, APPELS_PAR_JOUR, type IssueAppel } from '../../lib/crm/appels';
import { REGISTRE_DES_PARCOURS } from '../../lib/crm/parcours';
import { FeuilleDAppel, type DansJours, type ProspectAAppeler } from './appel';

/**
 * LES APPELS DU JOUR (19/10/2026, audit stratégique : dix appels par jour, le
 * téléphone d'abord). Une carte par prospect à appeler, les fournisseurs publics en
 * tête (leur date butoir est la plus proche) ; un toucher ouvre la feuille d'appel, et
 * l'appel noté sort la carte de la file jusqu'à sa prochaine action.
 *
 * ⚠️ TANT QUE PADDLE N'A PAS DONNÉ SON ACCORD ÉCRIT, la file le dit en tête : la
 * clause 11.1 (xv) de son contrat interdit le télémarketing sortant.
 */

export interface LigneDAppel extends ProspectAAppeler {
	readonly id: string;
	readonly ville?: string;
	readonly prochaineAction?: string;
}

export interface FileDAppels {
	readonly appels: readonly LigneDAppel[];
	readonly faitsAujourdhui: number;
}

function eurosRonds(centimes: bigint): string {
	return `${new Intl.NumberFormat('fr-FR').format(Number(centimes / 100n))} €`;
}

/** La ligne courte d'une carte : le parcours, et la date butoir quand il y en a une. */
function ligneDeLaCarte(a: LigneDAppel): string {
	return a.prochaineAction ?? REGISTRE_DES_PARCOURS[a.parcours].libelle;
}

function dateDeLaCarte(a: LigneDAppel): string | undefined {
	if (a.dateButoir !== undefined) {
		return dateCourteDeParis(Date.parse(`${a.dateButoir}T12:00:00Z`));
	}
	return a.ville;
}

export function EcranAppels({
	lecture,
	maintenant,
	appelant,
	onNoter
}: {
	readonly lecture: Lecture<FileDAppels>;
	readonly maintenant: number;
	/** Absents pour le rôle en lecture : la file se lit, les appels ne se notent pas. */
	readonly appelant?: string;
	readonly onNoter?: (
		id: string,
		issue: IssueAppel,
		texte: string,
		dansJours?: DansJours
	) => Promise<void>;
}) {
	const [ouvert, setOuvert] = useState<LigneDAppel | null>(null);
	const entete = { genre: 'onglet' as const, titre: 'Appels du jour' };

	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;
	const { appels, faitsAujourdhui } = lecture.valeur;
	const avertissement = ACCORD_PADDLE_OBTENU ? null : (
		<p className="verre-carte rounded-cladd-xl px-3.5 py-3 text-cladd-2xs">
			Le contrat Paddle (clause 11.1 xv) interdit le télémarketing sortant : obtenez l’accord écrit
			de Paddle avant de lancer les appels.
		</p>
	);
	const compte = (
		<p className="px-1 text-center text-cladd-2xs text-cladd-fg-soft">
			{faitsAujourdhui === 0
				? `Objectif : ${APPELS_PAR_JOUR} appels aujourd’hui.`
				: `${faitsAujourdhui} sur ${APPELS_PAR_JOUR} appels notés aujourd’hui.`}
		</p>
	);

	if (appels.length === 0) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '📞',
						titre: 'Personne à appeler aujourd’hui',
						explication:
							'Un prospect entre dans la file quand il a un téléphone et que sa prochaine action tombe aujourd’hui. Ajoutez-en depuis « Trouver » ou un import.'
					}
				}}
			/>
		);
	}

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-sm">
				{avertissement}
				{compte}
				<ListeDeCartes>
					{appels.map((a) => {
						const date = dateDeLaCarte(a);
						return (
							<CarteBouton
								key={a.id}
								titre={a.entreprise}
								ligne={ligneDeLaCarte(a)}
								{...(a.montantEstimeCentimes === undefined
									? {}
									: { montant: eurosRonds(a.montantEstimeCentimes) })}
								{...(date === undefined ? {} : { date })}
								onClick={() => setOuvert(a)}
							/>
						);
					})}
				</ListeDeCartes>
			</div>
			{ouvert === null || appelant === undefined || onNoter === undefined ? null : (
				<FeuilleDAppel
					key={ouvert.id}
					ouverte
					onFermer={() => setOuvert(null)}
					prospect={ouvert}
					appelant={appelant}
					maintenant={maintenant}
					onNoter={(issue, texte, dansJours) => onNoter(ouvert.id, issue, texte, dansJours)}
				/>
			)}
		</PageEcran>
	);
}
