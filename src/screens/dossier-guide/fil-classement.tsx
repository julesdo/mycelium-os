import { useState, type ReactNode } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CadreGuide,
	ChampDeReponse,
	Echange,
	ListeDeReponses,
	MOTIFS_DE_CLASSEMENT,
	NOM_DU_PILOTE,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	useTravail,
	type MotifClassement
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
 * « CLASSER LE DOSSIER » — pourquoi, un mot, ce que ça change, puis classer
 * (22/10/2026 ; les quatre raisons datent du 08/10/2026, sur Cash App).
 *
 * ⚠️ RIEN N'EST EFFACÉ, et la fin propose de l'annuler : le dossier se rouvre.
 * « Il a payé » n'est pas une raison : un règlement se note sur la fiche.
 */

type Etape = 'POURQUOI' | 'NOTE' | 'RESUME' | 'TRAVAIL';
const ORDRE: readonly Etape[] = ['POURQUOI', 'NOTE', 'RESUME', 'TRAVAIL'];

export function FilClassement({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose
}: PropsDuFil) {
	const [etape, setEtape] = useState<Etape>('POURQUOI');
	const [motif, setMotif] = useState<MotifClassement | null>(null);
	const [note, setNote] = useState('');
	const annulation = useAnnulation();
	const travail = useTravail<Annulation>([
		'J’arrête ses relances',
		'Je le sors de vos alertes et du montant de l’accueil',
		'Je garde tout le dossier, pour le rouvrir'
	]);
	const affichee: Etape = etape === 'TRAVAIL' && travail.erreur !== null ? 'RESUME' : etape;
	const passees = ORDRE.slice(0, ORDRE.indexOf(affichee));
	const verrouille = travail.lance;
	const raison = MOTIFS_DE_CLASSEMENT.find((m) => m.cle === motif);

	function classer() {
		if (motif === null) return;
		setEtape('TRAVAIL');
		travail.lancer(() =>
			gestes.classer({ motif, ...(note.trim() === '' ? {} : { note: note.trim() }) })
		);
	}

	function question(cle: Etape): ReactNode {
		switch (cle) {
			case 'POURQUOI':
				return <ReponseDePlume texte={`Pourquoi classez-vous le dossier de ${d.client} ?`} />;
			case 'NOTE':
				return (
					<ReponseDePlume
						texte={
							motif === 'AUTRE'
								? 'Dites-la en quelques mots.'
								: 'Un mot pour vous en souvenir ? C’est facultatif.'
						}
					/>
				);
			case 'RESUME':
				return (
					<ReponseDePlume
						texte={`Je ne le relance plus, et il sort de vos alertes et du montant de l’accueil. Rien n’est effacé : il se rouvre d’un toucher, et ${NOM_DU_PILOTE} reprend alors son plan.`}
					/>
				);
			default:
				return null;
		}
	}

	function reponse(cle: Etape): string {
		switch (cle) {
			case 'POURQUOI':
				return raison?.titre ?? '';
			case 'NOTE':
				return note.trim() === '' ? 'Sans note' : note.trim();
			case 'RESUME':
				return 'Classer le dossier';
			default:
				return '';
		}
	}

	function zone(): ReactNode {
		switch (affichee) {
			case 'POURQUOI':
				return (
					<ListeDeReponses
						choix={MOTIFS_DE_CLASSEMENT.map((m) => ({
							cle: m.cle,
							titre: m.titre,
							ligne: m.ligne,
							onClick: () => {
								setMotif(m.cle);
								setEtape('NOTE');
							}
						}))}
					/>
				);
			case 'NOTE':
				return (
					<>
						<ChampDeReponse
							valeur={note}
							onChange={setNote}
							placeholder="Ce que vous voulez retenir"
						/>
						<RangeeDeReponses>
							{motif === 'AUTRE' ? null : (
								<BoutonDeReponse
									libelle="Passer"
									onClick={() => {
										setNote('');
										setEtape('RESUME');
									}}
								/>
							)}
							<BoutonDeReponse
								principal
								desactive={note.trim() === ''}
								libelle="Valider"
								onClick={() => setEtape('RESUME')}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'RESUME':
				return <BoutonDeReponse principal libelle="Classer le dossier" onClick={classer} />;
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
					humeur="repos"
					titre="Dossier classé."
					sousTitre="Je ne le relance plus. Il se rouvre d’un toucher, en tête de sa page."
				/>
			) : null}
			<MotDAnnulation etat={annulation.etat} />
		</CadreGuide>
	);
}
