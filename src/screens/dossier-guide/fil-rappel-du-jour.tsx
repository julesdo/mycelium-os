import { useState, type ReactNode } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CadreGuide,
	ChoixDeDate,
	Echange,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	dateCourte,
	jourDecale,
	useTravail
} from '../../ui';
import { RefusDuGeste, type PropsDuFil } from './commun';
import { joursDeRappel } from './fil-rappel';

/**
 * LE RAPPEL DU JOUR — « VOUS M'AVIEZ DEMANDÉ DE VOUS LE RAPPELER » (23/10/2026).
 *
 * Le rappel remontait dans « Aujourd'hui », puis il fallait ouvrir l'historique du
 * dossier pour le cocher. Plume le dit désormais sur la carte du dossier, le jour
 * venu : c'est fait, ou plus tard.
 */

/** Le rappel arrivé à son jour, tel que l'historique du dossier le porte. */
export interface RappelDuJour {
	readonly id: string;
	readonly texte: string;
	readonly le: string;
}

type Etape = 'QUOI' | 'QUAND' | 'TRAVAIL';

export function FilRappelDuJour({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	rappel,
	plusTardAuDepart = false
}: PropsDuFil & {
	readonly rappel: RappelDuJour;
	/** « Plus tard » touché sur la carte de Plume : la conversation demande le jour. */
	readonly plusTardAuDepart?: boolean;
}) {
	const [etape, setEtape] = useState<Etape>(plusTardAuDepart ? 'QUAND' : 'QUOI');
	const [plusTard, setPlusTard] = useState(plusTardAuDepart);
	const [le, setLe] = useState('');
	const ordre: readonly Etape[] = plusTard ? ['QUOI', 'QUAND', 'TRAVAIL'] : ['QUOI', 'TRAVAIL'];
	const travail = useTravail<null>(
		plusTard
			? ['Je raye celui-ci', `Je vous le rappelle le ${le === '' ? '…' : dateCourte(le)}`]
			: ['Je raye ce rappel']
	);
	const affichee: Etape =
		etape === 'TRAVAIL' && travail.erreur !== null ? (plusTard ? 'QUAND' : 'QUOI') : etape;
	const passees = ordre.slice(0, ordre.indexOf(affichee));

	function faire(reporter: boolean) {
		setEtape('TRAVAIL');
		travail.lancer(async () => {
			await gestes.rappelFait(rappel.id);
			if (reporter) await gestes.rappeler({ le, texte: rappel.texte });
			return null;
		});
	}

	function question(cle: Etape): ReactNode {
		switch (cle) {
			case 'QUOI':
				return (
					<ReponseDePlume
						texte={`Vous m’aviez demandé de vous remettre ${d.client} sous les yeux${rappel.le < d.aujourdHui ? ` le ${dateCourte(rappel.le)}` : ' aujourd’hui'} : « ${rappel.texte.replace(/[.\s]+$/, '')} ».`}
					/>
				);
			case 'QUAND':
				return <ReponseDePlume texte="Quel jour, la prochaine fois ?" />;
			default:
				return null;
		}
	}

	function reponse(cle: Etape): string {
		return cle === 'QUOI'
			? plusTard
				? 'Me le rappeler plus tard'
				: 'C’est fait'
			: le === ''
				? ''
				: `Le ${dateCourte(le)}`;
	}

	function zone(): ReactNode {
		switch (affichee) {
			case 'QUOI':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse
							libelle="Plus tard"
							onClick={() => {
								setPlusTard(true);
								setEtape('QUAND');
							}}
						/>
						<BoutonDeReponse
							principal
							libelle="C’est fait"
							onClick={() => {
								setPlusTard(false);
								faire(false);
							}}
						/>
					</RangeeDeReponses>
				);
			case 'QUAND':
				return (
					<>
						<ChoixDeDate
							propositions={joursDeRappel(d.aujourdHui)}
							valeur={le}
							onChange={setLe}
							min={jourDecale(d.aujourdHui, 1)}
						/>
						<BoutonDeReponse
							principal
							desactive={le === '' || le <= d.aujourdHui}
							libelle="Me le rappeler ce jour-là"
							onClick={() => faire(true)}
						/>
					</>
				);
			case 'TRAVAIL':
				return travail.fini ? (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				) : undefined;
		}
	}

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			suivi={`${affichee}-${travail.tic}-${String(travail.fini)}`}
			reponses={zone()}
		>
			{prelude(travail.lance)}
			{passees.map((cle) => (
				<Echange
					key={cle}
					question={question(cle)}
					reponse={reponse(cle)}
					{...(travail.lance ? {} : { onModifier: () => setEtape(cle) })}
				/>
			))}
			{affichee === 'TRAVAIL' ? null : question(affichee)}
			<RefusDuGeste erreur={travail.erreur} />
			{affichee === 'TRAVAIL' && !travail.fini ? <TravailDePlume etapes={travail.etapes} /> : null}
			{travail.fini ? (
				<AccueilDePlume
					humeur="content"
					titre={
						plusTard ? `C’est noté : je vous le rappelle le ${dateCourte(le)}.` : 'C’est noté.'
					}
				/>
			) : null}
		</CadreGuide>
	);
}
