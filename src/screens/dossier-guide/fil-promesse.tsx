import { useState, type ReactNode } from 'react';
import { JOURS_DE_GRACE } from '../../lib/verticales/recouvrement/parole';
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
	dateRelative,
	eurosCentimes,
	jourDecale,
	useTravail
} from '../../ui';
import { centimesDe, eurosATaper, joursProposes } from '../demarrage';
import { RefusDuGeste, type PropsDuFil } from './commun';
import { useReglement } from './sous-parcours';

/**
 * SA PROMESSE EST ARRIVÉE À SON JOUR — « IL L'A FAIT ? » (23/10/2026).
 *
 * C'était une ligne de l'historique, « Tout l'historique · 1 à vérifier », qu'il
 * fallait savoir ouvrir, puis deux boutons « Tenue » et « Pas tenue » sous la note.
 * C'est désormais Plume qui pose la question, sur la carte du dossier, le jour venu ;
 * et la réponse mène où elle doit : noter le paiement, ou reprendre le plan, ou noter
 * la nouvelle date qu'il a donnée.
 *
 * ⚠️ « TENUE » RESTE LE MOT DU GÉRANT (parcours d'impayés, 08/10/2026). Le logiciel
 * dit ce qui est arrivé depuis — un fait —, il ne tranche pas.
 */

/** La promesse à vérifier, telle que l'historique du dossier la porte. */
export interface PromesseAVerifier {
	readonly id: string;
	readonly le: string;
	readonly montant: bigint | null;
	/** Ce qui est arrivé depuis qu'elle a été faite : un fait, pas un verdict. */
	readonly recuDepuis?: bigint;
}

type Etape = 'PAYE' | 'DEJA' | 'REGLEMENT' | 'REDONNE' | 'NOUVELLE' | 'TRAVAIL';

export function FilPromesse({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	promesse,
	onFiche,
	reponseDepart
}: PropsDuFil & {
	readonly promesse: PromesseAVerifier;
	/** « Non » ou « Oui » touché sur la carte de Plume : la conversation commence après. */
	readonly reponseDepart?: 'OUI' | 'NON';
	/** Trop de factures pour rapprocher le paiement ici : sa fiche. */
	readonly onFiche: () => void;
}) {
	const [etape, setEtape] = useState<Etape>(() =>
		reponseDepart === 'OUI' ? 'DEJA' : reponseDepart === 'NON' ? 'REDONNE' : 'PAYE'
	);
	const [paye, setPaye] = useState<boolean | null>(() =>
		reponseDepart === undefined ? null : reponseDepart === 'OUI'
	);
	const [dejaNote, setDejaNote] = useState<boolean | null>(null);
	const [redonne, setRedonne] = useState<boolean | null>(null);
	const [le, setLe] = useState('');
	const [montant, setMontant] = useState(() => eurosATaper(promesse.montant ?? d.resteDu));

	const nouveauMontant = centimesDe(montant);
	const ordre: readonly Etape[] =
		paye === true
			? dejaNote === false
				? ['PAYE', 'DEJA', 'REGLEMENT']
				: ['PAYE', 'DEJA', 'TRAVAIL']
			: redonne === true
				? ['PAYE', 'REDONNE', 'NOUVELLE', 'TRAVAIL']
				: ['PAYE', 'REDONNE', 'TRAVAIL'];
	const travail = useTravail<null>(
		paye === true
			? ['Je note que sa promesse est tenue']
			: redonne === true
				? [
						'Je note que sa promesse n’est pas tenue',
						'J’enregistre la nouvelle date',
						`Je mets ses relances en pause jusqu’au ${le === '' ? '…' : dateCourte(jourDecale(le, JOURS_DE_GRACE))}`
					]
				: ['Je note que sa promesse n’est pas tenue', 'Je reprends le plan de relance']
	);
	const reglement = useReglement({
		actif: etape === 'REGLEMENT',
		aujourdHui: d.aujourdHui,
		montantPropose: promesse.montant ?? d.resteDu,
		datePropose: promesse.le,
		gestes,
		apres: () => gestes.trancherPromesse(promesse.id, 'TENUE'),
		onFiche
	});
	const affichee: Etape =
		etape === 'TRAVAIL' && travail.erreur !== null
			? (ordre[ordre.indexOf('TRAVAIL') - 1] ?? 'PAYE')
			: etape;
	const passees = ordre.slice(0, ordre.indexOf(affichee));
	const verrouille = travail.lance || reglement.lance;

	function faire() {
		setEtape('TRAVAIL');
		travail.lancer(async () => {
			if (paye === true) {
				await gestes.trancherPromesse(promesse.id, 'TENUE');
			} else {
				await gestes.trancherPromesse(promesse.id, 'NON_TENUE');
				if (redonne === true && nouveauMontant !== null) {
					await gestes.promettre({ montant: nouveauMontant, le });
				}
			}
			return null;
		});
	}

	const promis =
		promesse.montant === null
			? `de payer le ${dateCourte(promesse.le)}`
			: `de payer ${eurosCentimes(promesse.montant)} le ${dateCourte(promesse.le)}`;

	function question(cle: Etape): ReactNode {
		switch (cle) {
			case 'PAYE':
				return (
					<ReponseDePlume texte={`${d.client} avait promis ${promis}. Il l’a fait ?`}>
						{promesse.recuDepuis === undefined ? null : (
							<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
								{promesse.recuDepuis > 0n
									? `Depuis, ${eurosCentimes(promesse.recuDepuis)} sont arrivés sur ses factures.`
									: 'Depuis, aucun paiement n’est arrivé sur ses factures.'}
							</p>
						)}
					</ReponseDePlume>
				);
			case 'DEJA':
				return (
					<ReponseDePlume texte="Je note son paiement ? S’il est déjà rapproché (votre banque, votre logiciel), dites-le-moi simplement." />
				);
			case 'REDONNE':
				return <ReponseDePlume texte="Il vous a donné une nouvelle date ?" />;
			case 'NOUVELLE':
				return <ReponseDePlume texte="Pour quel jour, et combien ?" />;
			default:
				return null;
		}
	}

	function reponse(cle: Etape): string {
		switch (cle) {
			case 'PAYE':
				return paye === true ? 'Oui, il a payé' : 'Non';
			case 'DEJA':
				return dejaNote === true ? 'Il est déjà noté' : 'Le noter';
			case 'REDONNE':
				return redonne === true ? 'Oui, une nouvelle date' : 'Non, reprenez le plan';
			case 'NOUVELLE':
				return `${nouveauMontant === null ? montant : eurosCentimes(nouveauMontant)} le ${le === '' ? '…' : dateCourte(le)}`;
			default:
				return '';
		}
	}

	function zone(): ReactNode {
		switch (affichee) {
			case 'PAYE':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse
							libelle="Non"
							onClick={() => {
								setPaye(false);
								setEtape('REDONNE');
							}}
						/>
						<BoutonDeReponse
							libelle="Oui, il a payé"
							onClick={() => {
								setPaye(true);
								setEtape('DEJA');
							}}
						/>
					</RangeeDeReponses>
				);
			case 'DEJA':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse
							libelle="Il est déjà noté"
							onClick={() => {
								setDejaNote(true);
								faire();
							}}
						/>
						<BoutonDeReponse
							principal
							libelle="Le noter"
							onClick={() => {
								setDejaNote(false);
								setEtape('REGLEMENT');
							}}
						/>
					</RangeeDeReponses>
				);
			case 'REDONNE':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse
							libelle="Non, reprenez le plan"
							onClick={() => {
								setRedonne(false);
								faire();
							}}
						/>
						<BoutonDeReponse
							libelle="Oui, une nouvelle date"
							onClick={() => {
								setRedonne(true);
								setEtape('NOUVELLE');
							}}
						/>
					</RangeeDeReponses>
				);
			case 'NOUVELLE':
				return (
					<>
						<ChoixDeDate
							propositions={joursProposes(d.aujourdHui)}
							valeur={le}
							onChange={setLe}
							min={d.aujourdHui}
						/>
						<ChampDeReponse
							valeur={montant}
							onChange={setMontant}
							placeholder="Montant promis, en euros"
							clavier="decimal"
						/>
						<BoutonDeReponse
							principal
							desactive={
								le === '' || le < d.aujourdHui || nouveauMontant === null || nouveauMontant <= 0n
							}
							libelle="Noter sa nouvelle promesse"
							onClick={faire}
						/>
					</>
				);
			case 'REGLEMENT':
				return reglement.fini ? (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				) : (
					reglement.zone
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

	const prochaine = d.prochaineEtape;
	const conclusion =
		paye === true
			? { titre: 'C’est noté : promesse tenue.', sousTitre: 'Merci de me l’avoir dit.' }
			: redonne === true
				? {
						titre: `C’est noté. Je ne le relance pas avant le ${le === '' ? '…' : dateCourte(le)}.`,
						sousTitre: 'Un paiement arrête tout.'
					}
				: {
						titre: 'C’est noté : je reprends le plan.',
						sousTitre:
							prochaine === null
								? 'Je suis le dossier et ses dates.'
								: `Prochaine étape : ${prochaine.nom.toLowerCase()}, ${prochaine.le <= d.aujourdHui ? 'aujourd’hui' : dateRelative(prochaine.le, d.aujourdHui)}.`
					};

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			suivi={`${affichee}-${travail.tic}-${String(travail.fini)}-${reglement.suivi}`}
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
			{affichee === 'TRAVAIL' || affichee === 'REGLEMENT' ? null : question(affichee)}
			{reglement.fil}
			<RefusDuGeste erreur={travail.erreur} />
			{affichee === 'TRAVAIL' && !travail.fini ? <TravailDePlume etapes={travail.etapes} /> : null}
			{travail.fini ? (
				<AccueilDePlume
					humeur={paye === true ? 'fete' : 'repos'}
					titre={conclusion.titre}
					sousTitre={conclusion.sousTitre}
				/>
			) : null}
		</CadreGuide>
	);
}
