import { useState, type ReactNode } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CadreGuide,
	ChampDeReponse,
	ChoixDeDate,
	Echange,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	dateCourte,
	jourDecale,
	useTravail
} from '../../ui';
import {
	MotDAnnulation,
	RefusDuGeste,
	ReponsesDeFin,
	useAnnulation,
	type Annulation,
	type PropsDuFil
} from './commun';

/**
 * « ME LE RAPPELER » — un jour, et pourquoi (22/10/2026). Ce jour-là, le dossier
 * remonte dans « Aujourd'hui », comme le rappel d'une carte balayée.
 */

type Etape = 'QUAND' | 'POURQUOI' | 'TRAVAIL';
const ORDRE: readonly Etape[] = ['QUAND', 'POURQUOI', 'TRAVAIL'];

/** Le texte d'un rappel sans précision, le même que celui d'une carte balayée. */
const SANS_PRECISION = 'Revenir sur ce dossier';

/** Demain, lundi prochain, dans une semaine, dans quinze jours. */
export function joursDeRappel(aujourdHui: string): { libelle: string; date: string }[] {
	const jour = new Date(`${aujourdHui}T00:00:00.000Z`).getUTCDay();
	const avantLundi = (1 - jour + 7) % 7 || 7;
	const propositions = [
		{ libelle: 'Demain', date: jourDecale(aujourdHui, 1) },
		{ libelle: 'Lundi', date: jourDecale(aujourdHui, avantLundi) },
		{ libelle: 'Dans une semaine', date: jourDecale(aujourdHui, 7) },
		{ libelle: 'Dans 15 jours', date: jourDecale(aujourdHui, 15) }
	];
	return propositions.filter((p, i) => propositions.findIndex((q) => q.date === p.date) === i);
}

export function FilRappel({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose
}: PropsDuFil) {
	const [etape, setEtape] = useState<Etape>('QUAND');
	const [le, setLe] = useState('');
	const [pourquoi, setPourquoi] = useState('');
	const annulation = useAnnulation();
	const travail = useTravail<Annulation>([
		`Je pose le rappel au ${le === '' ? '…' : dateCourte(le)}`,
		`Ce jour-là, je vous remets ${d.client} sous les yeux dans Aujourd’hui`
	]);
	const affichee: Etape = etape === 'TRAVAIL' && travail.erreur !== null ? 'POURQUOI' : etape;
	const passees = ORDRE.slice(0, ORDRE.indexOf(affichee));
	const verrouille = travail.lance;

	function poser(texte: string) {
		setPourquoi(texte);
		setEtape('TRAVAIL');
		travail.lancer(() => gestes.rappeler({ le, texte: texte === '' ? SANS_PRECISION : texte }));
	}

	function question(cle: Etape): ReactNode {
		switch (cle) {
			case 'QUAND':
				return (
					<ReponseDePlume texte="Quel jour voulez-vous que je vous le remette sous les yeux ?" />
				);
			case 'POURQUOI':
				return <ReponseDePlume texte="Pour quoi faire ? Je l’écris sur le rappel." />;
			default:
				return null;
		}
	}

	function reponse(cle: Etape): string {
		return cle === 'QUAND'
			? le === ''
				? ''
				: `Le ${dateCourte(le)}`
			: pourquoi === ''
				? 'Sans précision'
				: pourquoi;
	}

	function zone(): ReactNode {
		switch (affichee) {
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
							libelle="Valider"
							onClick={() => setEtape('POURQUOI')}
						/>
					</>
				);
			case 'POURQUOI':
				return (
					<>
						<ChampDeReponse
							valeur={pourquoi}
							onChange={setPourquoi}
							placeholder="Le rappeler, vérifier son virement…"
						/>
						<RangeeDeReponses>
							<BoutonDeReponse libelle="Passer" onClick={() => poser('')} />
							<BoutonDeReponse
								principal
								desactive={pourquoi.trim() === ''}
								libelle="Poser le rappel"
								onClick={() => poser(pourquoi.trim())}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'TRAVAIL':
				return travail.fini ? (
					<ReponsesDeFin
						annulation={travail.resultat}
						etat={annulation.etat}
						onAnnuler={annulation.annuler}
						onFermer={onFermer}
						onAutreChose={onAutreChose}
					/>
				) : undefined;
		}
	}

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			suivi={`${affichee}-${travail.tic}-${travail.fini}-${String(annulation.etat)}`}
			reponses={zone()}
		>
			{prelude(verrouille)}
			{passees.map((cle) => (
				<Echange
					key={cle}
					question={question(cle)}
					reponse={reponse(cle)}
					{...(verrouille ? {} : { onModifier: () => setEtape(cle) })}
				/>
			))}
			{affichee === 'TRAVAIL' ? null : question(affichee)}
			<RefusDuGeste erreur={travail.erreur} />
			{affichee === 'TRAVAIL' && !travail.fini ? <TravailDePlume etapes={travail.etapes} /> : null}
			{travail.fini ? (
				<AccueilDePlume
					humeur="content"
					titre={`C’est noté : le ${dateCourte(le)}, je vous remets ${d.client} sous les yeux.`}
					sousTitre="Il remontera dans Aujourd’hui, avec ce que vous avez écrit."
				/>
			) : null}
			<MotDAnnulation etat={annulation.etat} />
		</CadreGuide>
	);
}
