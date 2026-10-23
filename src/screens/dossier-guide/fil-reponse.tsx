import { useState, type ReactNode } from 'react';
import { JOURS_DE_GRACE } from '../../lib/verticales/recouvrement/parole';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CadreGuide,
	CalendrierDesVersements,
	ChampDeReponse,
	ChoixDeDate,
	ChoixParPastilles,
	ConsigneDeReponse,
	Echange,
	ListeDeReponses,
	NOMBRES_DE_VERSEMENTS,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	dateCourte,
	departsProposes,
	eurosCentimes,
	jourDecale,
	useTravail,
	type CanalDEchange
} from '../../ui';
import { centimesDe, eurosATaper, joursProposes } from '../demarrage';
import { useReglement } from './sous-parcours';
import {
	MotDAnnulation,
	RefusDuGeste,
	ReponsesDeFin,
	useAnnulation,
	type Annulation,
	type PropsDuFil
} from './commun';

/**
 * « IL M'A RÉPONDU » — CE QU'IL VOUS A DIT, UNE QUESTION À LA FOIS (22/10/2026).
 *
 * C'était une feuille de cinq cartes (« Il vous a répondu ? », 08/10/2026, sur Cash
 * App), dont trois menaient ailleurs : la contestation au questionnaire du dossier,
 * « autre chose » à l'historique, le paiement en plusieurs fois à une autre feuille.
 * C'est désormais une conversation, comme le démarrage : Plume demande ce que le
 * client a dit, puis ce qu'il faut pour le noter, résume ce que ça change, et le
 * fait sous les yeux.
 *
 * ⚠️ AUCUNE ISSUE NE BLOQUE LE DOSSIER. « Il conteste » se note et le dossier
 * continue (une contestation ne bloque jamais rien) ; « il dit avoir payé » mène à
 * l'endroit où l'on note un règlement, sans rien suspendre.
 */

type Issue = 'PAYER' | 'PLUSIEURS' | 'CONTESTE' | 'PAYE' | 'AUTRE';

type Etape =
	| 'QUOI'
	| 'PROMESSE'
	| 'NOMBRE'
	| 'DEPART'
	| 'CANAL'
	| 'CONTESTATION'
	| 'ARRIVE'
	| 'REGLEMENT'
	| 'AUTRE'
	| 'RESUME'
	| 'TRAVAIL';

/** Les questions propres à chaque issue, entre « ce qu'il a dit » et le résumé. */
const CHEMIN: Readonly<Record<Issue, readonly Etape[]>> = {
	PAYER: ['PROMESSE'],
	PLUSIEURS: ['NOMBRE', 'DEPART'],
	CONTESTE: ['CANAL', 'CONTESTATION'],
	PAYE: ['ARRIVE', 'RESUME'],
	AUTRE: ['AUTRE']
};

const LIBELLE_ISSUE: Readonly<Record<Issue, string>> = {
	PAYER: 'Il va payer',
	PLUSIEURS: 'Il veut payer en plusieurs fois',
	CONTESTE: 'Il conteste',
	PAYE: 'Il dit avoir déjà payé',
	AUTRE: 'Autre chose'
};

const CANAUX_DE_CONTESTATION: readonly {
	readonly valeur: CanalDEchange;
	readonly libelle: string;
}[] = [
	{ valeur: 'COURRIEL', libelle: 'Par e-mail' },
	{ valeur: 'COURRIER', libelle: 'Par courrier' },
	{ valeur: 'APPEL', libelle: 'Au téléphone' }
];

const CANAUX: readonly { readonly valeur: CanalDEchange; readonly libelle: string }[] = [
	{ valeur: 'APPEL', libelle: 'Au téléphone' },
	{ valeur: 'COURRIEL', libelle: 'Par e-mail' },
	{ valeur: 'SMS', libelle: 'Par SMS' },
	{ valeur: 'COURRIER', libelle: 'Par courrier' },
	{ valeur: 'VISITE', libelle: 'En personne' }
];

export function FilReponse({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	onNoterUnReglement,
	onAccordEcrit
}: PropsDuFil & {
	/** Le règlement se note sur la fiche du client, où il se rapproche de ses factures. */
	readonly onNoterUnReglement: () => void;
	/** L'accord écrit à faire signer, rempli du calendrier convenu. */
	readonly onAccordEcrit?: (calendrier: { nombre: number; premiereLe: string }) => void;
}) {
	const [etape, setEtape] = useState<Etape>('QUOI');
	const [issue, setIssue] = useState<Issue | null>(null);
	const [montant, setMontant] = useState(() => eurosATaper(d.resteDu));
	const [le, setLe] = useState('');
	const [nombre, setNombre] = useState(3);
	const [premiereLe, setPremiereLe] = useState('');
	const [canal, setCanal] = useState<CanalDEchange | null>(null);
	const [texte, setTexte] = useState('');
	/* Il dit avoir payé : l'argent est-il arrivé ? Oui, et le paiement se note ici même. */
	const [arrive, setArrive] = useState<boolean | null>(null);
	const annulation = useAnnulation();

	const montantPromis = centimesDe(montant);
	const finDeGrace = le === '' ? '' : jourDecale(le, JOURS_DE_GRACE);
	const ordre: readonly Etape[] =
		issue === 'PAYE' && arrive === true
			? ['QUOI', 'ARRIVE', 'REGLEMENT']
			: [
					'QUOI',
					...(issue === null ? [] : CHEMIN[issue]),
					...(issue === null || issue === 'PAYE' || issue === 'AUTRE' ? [] : (['RESUME'] as const)),
					'TRAVAIL'
				];

	const travail = useTravail<Annulation | null>(libellesDuTravail());
	/* Un refus ramène à la dernière question : on peut corriger, et réessayer. */
	const affichee: Etape =
		etape === 'TRAVAIL' && travail.erreur !== null
			? (ordre[ordre.indexOf('TRAVAIL') - 1] ?? 'QUOI')
			: etape;
	const passees = ordre.slice(0, ordre.indexOf(affichee));
	/*
	  LE PAIEMENT SE NOTE DANS LA CONVERSATION (23/10/2026), avec la même répartition que
	  « Un virement reçu » sur sa fiche (useReglement). Il fallait quitter le dossier.
	*/
	const reglement = useReglement({
		actif: affichee === 'REGLEMENT',
		aujourdHui: d.aujourdHui,
		montantPropose: d.resteDu,
		gestes,
		onFiche: onNoterUnReglement
	});
	const verrouille = travail.lance || reglement.lance;

	function suivante(apres: Etape) {
		const prochaine = ordre[ordre.indexOf(apres) + 1];
		if (prochaine !== undefined) setEtape(prochaine);
	}

	function choisirIssue(choisie: Issue) {
		setIssue(choisie);
		setEtape(CHEMIN[choisie][0] ?? 'RESUME');
	}

	function libellesDuTravail(): string[] {
		switch (issue) {
			case 'PAYER':
				return [
					'J’enregistre sa promesse',
					`Je mets ses relances en pause jusqu’au ${finDeGrace === '' ? '…' : dateCourte(finDeGrace)}`,
					'Je surveille son virement'
				];
			case 'PLUSIEURS':
				return [
					'J’enregistre le calendrier',
					'Je mets ses relances en pause tant qu’il paie',
					'Je surveille chaque versement'
				];
			case 'CONTESTE':
				return ['Je note sa contestation au dossier', 'Je l’ajoute à son historique'];
			default:
				return ['Je le note dans son historique'];
		}
	}

	function faire() {
		setEtape('TRAVAIL');
		travail.lancer(async (): Promise<Annulation | null> => {
			switch (issue) {
				case 'PAYER':
					return gestes.promettre({ montant: montantPromis ?? 0n, le });
				case 'PLUSIEURS':
					return gestes.convenirEcheancier({ nombre, premiereLe });
				case 'CONTESTE':
					await gestes.noterContestation({
						canal: canal ?? 'COURRIEL',
						texte: texte.trim() === '' ? 'Il conteste.' : `Il conteste : ${texte.trim()}`
					});
					return null;
				case 'PAYE':
					return gestes.noter({ texte: 'Il dit avoir déjà payé.' });
				case 'AUTRE':
					return gestes.noter({ texte: texte.trim(), ...(canal === null ? {} : { canal }) });
				default:
					return null;
			}
		});
	}

	/* ── Ce que Plume demande, à chaque étape ───────────────────────────── */
	function question(cle: Etape): ReactNode {
		switch (cle) {
			case 'QUOI':
				return <ReponseDePlume texte={`Qu’est-ce que ${d.client} vous a dit ?`} />;
			case 'PROMESSE':
				return <ReponseDePlume texte="Pour quel jour, et combien ?" />;
			case 'NOMBRE':
				return (
					<ReponseDePlume
						texte={`${d.client} doit encore ${eurosCentimes(d.resteDu)} sur ses factures, hors pénalités. En combien de fois ?`}
					/>
				);
			case 'DEPART':
				return <ReponseDePlume texte="Le premier versement, quel jour ?" />;
			case 'CANAL':
				return (
					<ReponseDePlume
						texte={`Je le note, et rien ne s’arrête pour autant : je continue de suivre le dossier. ${d.client} vous l’a dit comment ?`}
					/>
				);
			case 'CONTESTATION':
				return <ReponseDePlume texte="Qu’est-ce qu’il conteste, en quelques mots ?" />;
			case 'ARRIVE':
				return (
					<ReponseDePlume texte="L’argent est arrivé sur votre compte ? Si oui, je le note et je solde les bonnes factures : personne n’est relancé pour ce qu’il a déjà payé." />
				);
			case 'AUTRE':
				return (
					<ReponseDePlume texte="Dites-moi ce qu’il vous a dit : je le note dans l’historique du dossier." />
				);
			case 'RESUME':
				return resume();
			default:
				return null;
		}
	}

	function resume(): ReactNode {
		switch (issue) {
			case 'PAYER':
				return (
					<ReponseDePlume
						texte={`Je note sa promesse : ${montantPromis === null ? '' : eurosCentimes(montantPromis)} le ${le === '' ? '…' : dateCourte(le)}. Je ne le relance pas d’ici là, plus ${JOURS_DE_GRACE} jours pour que le virement arrive. S’il n’a rien payé le ${finDeGrace === '' ? '…' : dateCourte(finDeGrace)}, je reprends le plan.`}
					/>
				);
			case 'PLUSIEURS':
				return (
					<ReponseDePlume
						texte={`Paiement en ${nombre} fois, à partir du ${premiereLe === '' ? '…' : dateCourte(premiereLe)} :`}
					>
						{premiereLe === '' ? null : (
							<CalendrierDesVersements total={d.resteDu} nombre={nombre} premiereLe={premiereLe} />
						)}
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Tant que les versements arrivent, je ne relance pas {d.client}. Si l’un d’eux manque
							de plus de {JOURS_DE_GRACE} jours, les relances reprennent.
						</p>
					</ReponseDePlume>
				);
			case 'CONTESTE':
				return (
					<ReponseDePlume
						texte={`Je note sa contestation au dossier${canal === 'APPEL' ? '' : ', et qu’elle est écrite'}. Rien ne s’arrête : ${d.relanceParPlume ? 'je le relance selon le plan.' : 'je continue de suivre ses dates.'}`}
					/>
				);
			case 'PAYE':
				return (
					<ReponseDePlume texte="Je note dans son historique qu’il dit avoir payé. Dès qu’un virement arrive, je le rapproche de ses factures." />
				);
			default:
				return null;
		}
	}

	/* ── Ce que le gérant a répondu, en bulle ───────────────────────────── */
	function reponse(cle: Etape): string {
		switch (cle) {
			case 'QUOI':
				return issue === null ? '' : LIBELLE_ISSUE[issue];
			case 'PROMESSE':
				return `${montantPromis === null ? montant : eurosCentimes(montantPromis)} le ${le === '' ? '…' : dateCourte(le)}`;
			case 'NOMBRE':
				return `En ${nombre} fois`;
			case 'DEPART':
				return `Le ${premiereLe === '' ? '…' : dateCourte(premiereLe)}`;
			case 'CANAL':
				return CANAUX_DE_CONTESTATION.find((c) => c.valeur === canal)?.libelle ?? '';
			case 'CONTESTATION':
				return texte.trim() === '' ? 'Sans précision' : texte.trim();
			case 'ARRIVE':
				return arrive === true ? 'Oui, il est arrivé' : 'Pas encore';
			case 'AUTRE':
				return texte.trim();
			case 'RESUME':
				return libelleDuGeste();
			default:
				return '';
		}
	}

	function libelleDuGeste(): string {
		switch (issue) {
			case 'PAYER':
				return 'Noter sa promesse';
			case 'PLUSIEURS':
				return `Convenir du paiement en ${nombre} fois`;
			case 'CONTESTE':
				return 'Noter sa contestation';
			default:
				return 'Le noter';
		}
	}

	/* ── Les réponses de l'étape en cours ───────────────────────────────── */
	function zone(): ReactNode {
		switch (affichee) {
			case 'QUOI':
				return (
					<ListeDeReponses
						choix={[
							{
								cle: 'PAYER',
								titre: LIBELLE_ISSUE.PAYER,
								ligne: 'Un jour, et le montant',
								onClick: () => choisirIssue('PAYER')
							},
							...(d.echeancierPossible
								? [
										{
											cle: 'PLUSIEURS',
											titre: LIBELLE_ISSUE.PLUSIEURS,
											ligne: 'Un calendrier, suivi versement par versement',
											onClick: () => choisirIssue('PLUSIEURS')
										}
									]
								: []),
							{
								cle: 'CONTESTE',
								titre: LIBELLE_ISSUE.CONTESTE,
								ligne: 'Je le note : le dossier continue',
								onClick: () => choisirIssue('CONTESTE')
							},
							{
								cle: 'PAYE',
								titre: LIBELLE_ISSUE.PAYE,
								ligne: 'Le règlement se note sur sa fiche',
								onClick: () => choisirIssue('PAYE')
							},
							{
								cle: 'AUTRE',
								titre: LIBELLE_ISSUE.AUTRE,
								ligne: 'Une note dans l’historique',
								onClick: () => choisirIssue('AUTRE')
							}
						]}
					/>
				);
			case 'PROMESSE':
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
								le === '' || le < d.aujourdHui || montantPromis === null || montantPromis <= 0n
							}
							libelle="Valider"
							onClick={() => suivante('PROMESSE')}
						/>
					</>
				);
			case 'NOMBRE':
				return (
					<RangeeDeReponses>
						{NOMBRES_DE_VERSEMENTS.map((n) => (
							<BoutonDeReponse
								key={n}
								libelle={`${n} fois`}
								onClick={() => {
									setNombre(n);
									suivante('NOMBRE');
								}}
							/>
						))}
					</RangeeDeReponses>
				);
			case 'DEPART':
				return (
					<>
						<ChoixDeDate
							propositions={departsProposes(d.aujourdHui)}
							valeur={premiereLe}
							onChange={setPremiereLe}
							min={d.aujourdHui}
						/>
						<BoutonDeReponse
							principal
							desactive={premiereLe === '' || premiereLe < d.aujourdHui}
							libelle="Valider"
							onClick={() => suivante('DEPART')}
						/>
					</>
				);
			case 'CANAL':
				return (
					<RangeeDeReponses>
						{CANAUX_DE_CONTESTATION.map((c) => (
							<BoutonDeReponse
								key={c.valeur}
								libelle={c.libelle}
								onClick={() => {
									setCanal(c.valeur);
									suivante('CANAL');
								}}
							/>
						))}
					</RangeeDeReponses>
				);
			case 'CONTESTATION':
				return (
					<>
						<ChampDeReponse valeur={texte} onChange={setTexte} placeholder="Ce qu’il conteste" />
						<RangeeDeReponses>
							<BoutonDeReponse
								libelle="Passer"
								onClick={() => {
									setTexte('');
									suivante('CONTESTATION');
								}}
							/>
							<BoutonDeReponse
								principal
								desactive={texte.trim() === ''}
								libelle="Valider"
								onClick={() => suivante('CONTESTATION')}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'ARRIVE':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse
							libelle="Pas encore"
							onClick={() => {
								setArrive(false);
								setEtape('RESUME');
							}}
						/>
						<BoutonDeReponse
							principal
							libelle="Oui, il est arrivé"
							onClick={() => {
								setArrive(true);
								setEtape('REGLEMENT');
							}}
						/>
					</RangeeDeReponses>
				);
			case 'AUTRE':
				return (
					<>
						<ConsigneDeReponse>Comment vous l’a-t-il dit ?</ConsigneDeReponse>
						<ChoixParPastilles
							options={CANAUX}
							valeur={canal}
							onChange={setCanal}
							libelle="Comment vous l’a-t-il dit"
						/>
						<ChampDeReponse valeur={texte} onChange={setTexte} placeholder="Ce qu’il vous a dit" />
						<BoutonDeReponse
							principal
							desactive={texte.trim() === ''}
							libelle="Le noter"
							onClick={faire}
						/>
					</>
				);
			case 'RESUME':
				return <BoutonDeReponse principal libelle={libelleDuGeste()} onClick={faire} />;
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
					<ReponsesDeFin
						annulation={travail.resultat}
						etat={annulation.etat}
						onAnnuler={annulation.annuler}
						onFermer={onFermer}
						onAutreChose={onAutreChose}
						{...(issue === 'PLUSIEURS' && d.accordPossible && onAccordEcrit !== undefined
							? {
									avant: (
										<BoutonDeReponse
											libelle="Préparer l’accord écrit, à lui faire signer"
											onClick={() => onAccordEcrit({ nombre, premiereLe })}
										/>
									)
								}
							: {})}
					/>
				) : undefined;
		}
	}

	function conclusion(): { titre: string; sousTitre?: string } {
		switch (issue) {
			case 'PAYER':
				return {
					titre: `C’est noté. Je ne relance pas ${d.client} avant le ${dateCourte(le)}.`,
					sousTitre: 'Un paiement arrête tout.'
				};
			case 'PLUSIEURS':
				return {
					titre: `Paiement en ${nombre} fois convenu.`,
					sousTitre: `Tant que les versements arrivent, je ne relance pas ${d.client}.`
				};
			case 'CONTESTE':
				return {
					titre: 'C’est noté au dossier.',
					sousTitre: d.relanceParPlume
						? 'Rien ne s’arrête : je continue de le suivre selon le plan.'
						: 'Rien ne s’arrête : je continue de suivre ses dates.'
				};
			case 'PAYE':
				return {
					titre: 'C’est noté.',
					sousTitre: 'Dès qu’un virement arrive, je le rapproche de ses factures.'
				};
			default:
				return { titre: 'C’est noté dans son historique.' };
		}
	}

	const etapeDeLaBarre =
		travail.fini || reglement.fini
			? 3
			: affichee === 'TRAVAIL' || reglement.lance
				? 2
				: affichee === 'QUOI'
					? 0
					: 1;
	const fin = conclusion();

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			etapes={{ noms: ['Ce qu’il a dit', 'Les détails', 'C’est noté'], courante: etapeDeLaBarre }}
			suivi={`${affichee}-${travail.tic}-${travail.fini}-${String(annulation.etat)}-${reglement.suivi}`}
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
					humeur="content"
					titre={fin.titre}
					{...(fin.sousTitre === undefined ? {} : { sousTitre: fin.sousTitre })}
				/>
			) : null}
			<MotDAnnulation etat={annulation.etat} />
		</CadreGuide>
	);
}
