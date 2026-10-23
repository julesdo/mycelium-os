import { useState, type ReactNode } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	ChampDeReponse,
	ChoixDeDate,
	ChoixParPastilles,
	ConsigneDeReponse,
	Echange,
	ListeDeReponses,
	RangeeDeReponses,
	ReleveDuFil,
	ReponseDePlume,
	TravailDePlume,
	dateCourte,
	eurosCentimes,
	jourDecale,
	messageDuRefus,
	useTravail,
	type CourriersDuDossier,
	type EnvoiAffiche,
	type PropositionLettrage
} from '../../ui';
import { centimesDe, eurosATaper } from '../demarrage';
import { RefusDuGeste, type GestesDuGuide } from './commun';

/**
 * LES MORCEAUX DE CONVERSATION QUI SERVENT À PLUSIEURS GESTES (23/10/2026).
 *
 * Envoyer un courrier validé se fait après l'avoir préparé (« Le relancer ») comme
 * après l'avoir relu (« Relire le courrier ») ; noter un paiement se fait quand il
 * dit avoir payé (« Il m'a répondu ») comme quand sa promesse arrive à son jour. Le
 * même morceau sert partout, pour que la même chose se dise et se fasse pareil.
 *
 * Chaque morceau est un crochet : il rend ce qu'il met dans le fil, ce qu'il met
 * sous le pouce, et s'il a fini. La conversation qui l'emploie l'appelle toujours
 * (les crochets ne se conditionnent pas) et ne l'affiche qu'une fois arrivée à lui.
 */
export interface SousParcours {
	/** Ce que le morceau ajoute au fil : ses questions, leurs bulles, son travail, sa fin. */
	readonly fil: ReactNode;
	/** Ses réponses, sous le pouce ; `undefined` pendant le travail et une fois fini. */
	readonly zone: ReactNode | undefined;
	/** Ce qui change quand il avance, pour faire descendre le fil. */
	readonly suivi: string;
	/** Le geste est parti : la conversation ne change plus de chemin. */
	readonly lance: boolean;
	readonly fini: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENVOYER UN COURRIER VALIDÉ — l'imprimer ou l'ouvrir, dire quand il est parti
   ═══════════════════════════════════════════════════════════════════════════ */

type EtapeDEnvoi = 'ENVOYER' | 'QUAND' | 'FIN';

/**
 * ⚠️ RIEN NE PART SANS LE GÉRANT (ligne rouge n° 1). Le courrier s'ouvre dans SA
 * messagerie ou s'imprime ; c'est lui qui dit le jour du départ, et ce jour est celui
 * qui compte. Le rappel au jour où le délai expire est PROPOSÉ, coché, et se décoche :
 * demandé, jamais supposé (`envois.declarerParti`).
 */
export function useEnvoi({
	courrier,
	actif,
	aujourdHui,
	courriers,
	gestes,
	onPlusTard
}: {
	readonly courrier: EnvoiAffiche | null;
	/** La conversation est arrivée jusqu'ici. */
	readonly actif: boolean;
	readonly aujourdHui: string;
	readonly courriers: CourriersDuDossier;
	readonly gestes: GestesDuGuide;
	/** « Pas encore partie » : on y reviendra. */
	readonly onPlusTard: () => void;
}): SousParcours {
	const [etape, setEtape] = useState<EtapeDEnvoi>('ENVOYER');
	const [envoye, setEnvoye] = useState<'MESSAGERIE' | 'PDF' | 'DEJA' | null>(null);
	const [partiLe, setPartiLe] = useState(aujourdHui);
	const [avecRappel, setAvecRappel] = useState(true);
	const relanceOfficielle = courrier?.modele === 'RELANCE_OFFICIELLE';
	const travail = useTravail<null>([
		'Je note le jour du départ',
		...(relanceOfficielle && avecRappel ? ['Je pose le rappel au jour où son délai expire'] : [])
	]);
	const affichee: EtapeDEnvoi = etape === 'FIN' && travail.erreur !== null ? 'QUAND' : etape;

	if (!actif || courrier === null) {
		return { fil: null, zone: undefined, suivi: 'envoi-repos', lance: false, fini: false };
	}
	const cible = courrier;

	function partir() {
		setEtape('FIN');
		travail.lancer(async () => {
			await gestes.declarerParti(cible.id, partiLe, relanceOfficielle && avecRappel);
			return null;
		});
	}

	const questionEnvoyer = (
		<ReponseDePlume
			texte={
				cible.canal === 'MESSAGERIE'
					? 'Elle part de votre messagerie : je l’ouvre, vous l’envoyez.'
					: cible.canal === 'IMPRIMER_RECOMMANDE'
						? 'Imprimez-la, signez-la, et envoyez-la en recommandé avec avis de réception.'
						: 'Imprimez-la en deux exemplaires, à signer par vous et par votre client.'
			}
		/>
	);
	const questionQuand = (
		<ReponseDePlume texte="Elle est partie quel jour ? C’est cette date qui compte, pas celle d’aujourd’hui." />
	);
	const libelleEnvoye =
		envoye === 'PDF'
			? 'PDF téléchargé'
			: envoye === 'DEJA'
				? 'Elle est déjà partie'
				: 'Ouverte dans ma messagerie';
	const libelleQuand = `${partiLe === aujourdHui ? 'Aujourd’hui' : `Le ${dateCourte(partiLe)}`}${
		relanceOfficielle ? (avecRappel ? ', avec le rappel' : ', sans rappel') : ''
	}`;

	const fil = (
		<>
			{affichee === 'ENVOYER' ? (
				questionEnvoyer
			) : (
				<Echange
					question={questionEnvoyer}
					reponse={libelleEnvoye}
					{...(travail.lance ? {} : { onModifier: () => setEtape('ENVOYER') })}
				/>
			)}
			{affichee === 'QUAND' ? questionQuand : null}
			{affichee === 'FIN' ? <Echange question={questionQuand} reponse={libelleQuand} /> : null}
			<RefusDuGeste erreur={travail.erreur} />
			{affichee === 'FIN' && !travail.fini ? <TravailDePlume etapes={travail.etapes} /> : null}
			{travail.fini ? (
				<AccueilDePlume
					humeur="content"
					titre={`C’est noté : partie ${partiLe === aujourdHui ? 'aujourd’hui' : `le ${dateCourte(partiLe)}`}.`}
					sousTitre={
						relanceOfficielle && avecRappel
							? 'Le jour où son délai expire, je vous remets le dossier sous les yeux.'
							: 'Je suis la suite du dossier.'
					}
				/>
			) : null}
		</>
	);

	function zone(): ReactNode {
		switch (affichee) {
			case 'ENVOYER':
				return (
					<>
						{cible.canal === 'MESSAGERIE' ? (
							<BoutonDeReponse
								principal
								libelle="Ouvrir dans ma messagerie"
								onClick={() => {
									window.open(
										`mailto:?subject=${encodeURIComponent(cible.objet)}&body=${encodeURIComponent(cible.corps)}`,
										'_self'
									);
									setEnvoye('MESSAGERIE');
									setEtape('QUAND');
								}}
							/>
						) : (
							<BoutonDeReponse
								principal
								libelle="Télécharger le PDF"
								onClick={() => {
									courriers.onTelechargerPdf(cible);
									setEnvoye('PDF');
									setEtape('QUAND');
								}}
							/>
						)}
						<RangeeDeReponses>
							{cible.annexeDisponible ? (
								<BoutonDeReponse
									libelle="Le calcul joint"
									onClick={() => courriers.onTelechargerAnnexe(cible)}
								/>
							) : null}
							<BoutonDeReponse
								libelle="Elle est déjà partie"
								onClick={() => {
									setEnvoye('DEJA');
									setEtape('QUAND');
								}}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'QUAND':
				return (
					<>
						<ChoixDeDate
							propositions={[
								{ libelle: 'Aujourd’hui', date: aujourdHui },
								{ libelle: 'Hier', date: jourDecale(aujourdHui, -1) }
							]}
							valeur={partiLe}
							onChange={setPartiLe}
							min={cible.valideLe ?? cible.prepareLe}
						/>
						{relanceOfficielle ? (
							<>
								<ConsigneDeReponse>
									Vous la rappeler le jour où son délai expire ? Rien ne partira ce jour-là.
								</ConsigneDeReponse>
								<ChoixParPastilles
									options={[
										{ valeur: 'OUI', libelle: 'Oui, me le rappeler' },
										{ valeur: 'NON', libelle: 'Non' }
									]}
									valeur={avecRappel ? 'OUI' : 'NON'}
									onChange={(v) => setAvecRappel(v === 'OUI')}
									libelle="Me rappeler le jour où son délai expire"
								/>
							</>
						) : null}
						<RangeeDeReponses>
							<BoutonDeReponse libelle="Pas encore partie" onClick={onPlusTard} />
							<BoutonDeReponse
								principal
								desactive={partiLe === '' || partiLe > aujourdHui}
								libelle="Valider"
								onClick={partir}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'FIN':
				return undefined;
		}
	}

	return {
		fil,
		zone: zone(),
		suivi: `envoi-${affichee}-${travail.tic}-${String(travail.fini)}`,
		lance: travail.lance,
		fini: travail.fini
	};
}

/* ═══════════════════════════════════════════════════════════════════════════
   NOTER UN PAIEMENT — combien, quel jour, ce qu'il solde
   ═══════════════════════════════════════════════════════════════════════════ */

type EtapeDeReglement = 'MONTANT' | 'SOLDE' | 'FIN';

/**
 * ⚠️ LA MÊME RÉPARTITION QUE SUR SA FICHE (« Un virement reçu »). Un montant qui
 * correspond exactement à des factures les solde ; plusieurs combinaisons se
 * choisissent ; aucune, et la loi répartit (C. civ. 1342-10), recalculée par le
 * serveur au moment d'écrire. La date est celle de l'arrivée : c'est le point
 * d'arrêt des pénalités.
 */
export function useReglement({
	actif,
	aujourdHui,
	montantPropose,
	datePropose,
	gestes,
	apres,
	onFiche
}: {
	readonly actif: boolean;
	readonly aujourdHui: string;
	/** Le montant proposé d'office : ce qui reste dû, ou ce qu'il avait promis. */
	readonly montantPropose: bigint;
	/** Le jour proposé d'office, quand on le sait (le jour promis). */
	readonly datePropose?: string;
	readonly gestes: GestesDuGuide;
	/** Ce qui se fait avec, dans le même travail : trancher sa promesse, par exemple. */
	readonly apres?: () => Promise<void>;
	/** Trop de factures possibles : on les choisit sur sa fiche. */
	readonly onFiche: () => void;
}): SousParcours {
	const [etape, setEtape] = useState<EtapeDeReglement>('MONTANT');
	const [montant, setMontant] = useState(() => eurosATaper(montantPropose));
	const [le, setLe] = useState(() =>
		datePropose !== undefined && datePropose <= aujourdHui ? datePropose : aujourdHui
	);
	const [proposition, setProposition] = useState<
		| { readonly etat: 'charge' }
		| { readonly etat: 'pret'; readonly valeur: PropositionLettrage }
		| { readonly etat: 'erreur'; readonly message: string }
		| null
	>(null);
	const [references, setReferences] = useState<readonly string[] | null>(null);
	const travail = useTravail<null>([
		'Je rapproche le paiement de ses factures',
		'Je solde ce qui est réglé',
		'J’arrête de relancer ce qui est payé'
	]);
	const centimes = centimesDe(montant);
	const affichee: EtapeDeReglement = etape === 'FIN' && travail.erreur !== null ? 'SOLDE' : etape;

	if (!actif) {
		return { fil: null, zone: undefined, suivi: 'reglement-repos', lance: false, fini: false };
	}

	function chercher() {
		if (centimes === null) return;
		setEtape('SOLDE');
		setReferences(null);
		setProposition({ etat: 'charge' });
		gestes.proposerReglement(centimes).then(
			(valeur) => setProposition({ etat: 'pret', valeur }),
			(e: unknown) => setProposition({ etat: 'erreur', message: messageDuRefus(e) })
		);
	}

	function noter(refs: readonly string[] | null, total: bigint) {
		setReferences(refs);
		setEtape('FIN');
		travail.lancer(async () => {
			await gestes.noterReglement({
				montant: total,
				date: le,
				...(refs === null ? {} : { references: refs })
			});
			await apres?.();
			return null;
		});
	}

	const p = proposition?.etat === 'pret' ? proposition.valeur : null;
	const questionMontant = <ReponseDePlume texte="Combien, et quel jour est-il arrivé ?" />;
	const questionSolde: ReactNode =
		proposition === null || proposition.etat === 'charge' ? (
			<ReponseDePlume texte="Je regarde ce que ce paiement solde…" />
		) : proposition.etat === 'erreur' ? (
			<ReponseDePlume
				humeur="attention"
				texte={`Je n’ai pas pu le rapprocher : ${proposition.message}`}
			/>
		) : p?.issue === 'UNIQUE' && p.combinaisons[0] !== undefined ? (
			<ReponseDePlume
				texte={`Il solde ${p.combinaisons[0].references.length > 1 ? 'les factures' : 'la facture'} ${p.combinaisons[0].references.join(', ')}.`}
			/>
		) : p?.issue === 'AMBIGU' ? (
			<ReponseDePlume texte="Plusieurs factures font ce montant. Lesquelles a-t-il payées ?" />
		) : p?.issue === 'TROP_DE_CANDIDATES' ? (
			<ReponseDePlume
				texte={`${p.candidates ?? 'Trop de'} factures pourraient correspondre : choisissez-les sur sa fiche, je les solde.`}
			/>
		) : p?.repartition !== undefined && p.repartition.lignes.length > 0 ? (
			<ReponseDePlume texte="Ce montant ne correspond exactement à aucune facture. Je le répartis comme le prévoit la loi, de la plus ancienne à la plus récente :">
				<ReleveDuFil
					lignes={p.repartition.lignes.map((l) => ({
						cle: l.reference,
						titre: l.reference,
						ligne: l.solde ? 'Soldée' : 'Réglée en partie',
						valeur: eurosCentimes(l.montant)
					}))}
				/>
				{p.repartition.nonAffecte > 0n ? (
					<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
						{eurosCentimes(p.repartition.nonAffecte)} dépassent ce qu’il doit : ils restent sans
						facture.
					</p>
				) : null}
			</ReponseDePlume>
		) : (
			<ReponseDePlume texte="Aucune facture de ce client n’attend de paiement : rien à solder." />
		);

	const fil = (
		<>
			{affichee === 'MONTANT' ? (
				questionMontant
			) : (
				<Echange
					question={questionMontant}
					reponse={`${centimes === null ? montant : eurosCentimes(centimes)}, ${le === aujourdHui ? 'aujourd’hui' : `le ${dateCourte(le)}`}`}
					{...(travail.lance ? {} : { onModifier: () => setEtape('MONTANT') })}
				/>
			)}
			{affichee === 'SOLDE' ? questionSolde : null}
			{affichee === 'FIN' ? (
				<Echange
					question={questionSolde}
					reponse={references === null ? 'Noter le paiement' : references.join(', ')}
				/>
			) : null}
			<RefusDuGeste erreur={travail.erreur} />
			{affichee === 'FIN' && !travail.fini ? <TravailDePlume etapes={travail.etapes} /> : null}
			{travail.fini ? (
				<AccueilDePlume
					humeur="fete"
					titre={`C’est noté : ${centimes === null ? '' : eurosCentimes(centimes)} reçus ${le === aujourdHui ? 'aujourd’hui' : `le ${dateCourte(le)}`}.`}
					sousTitre="Ce qui est réglé ne se relance plus."
				/>
			) : null}
		</>
	);

	function zone(): ReactNode {
		switch (affichee) {
			case 'MONTANT':
				return (
					<>
						<ChoixDeDate
							propositions={[
								{ libelle: 'Aujourd’hui', date: aujourdHui },
								{ libelle: 'Hier', date: jourDecale(aujourdHui, -1) },
								...(datePropose !== undefined &&
								datePropose < jourDecale(aujourdHui, -1) &&
								datePropose >= jourDecale(aujourdHui, -365)
									? [{ libelle: `Le ${dateCourte(datePropose)}`, date: datePropose }]
									: [])
							]}
							valeur={le}
							onChange={setLe}
							min={jourDecale(aujourdHui, -365)}
						/>
						<ChampDeReponse
							valeur={montant}
							onChange={setMontant}
							placeholder="Montant reçu, en euros"
							clavier="decimal"
						/>
						<BoutonDeReponse
							principal
							desactive={centimes === null || centimes <= 0n || le === '' || le > aujourdHui}
							libelle="Valider"
							onClick={chercher}
						/>
					</>
				);
			case 'SOLDE':
				if (p === null) return undefined;
				if (p.issue === 'UNIQUE' && p.combinaisons[0] !== undefined) {
					const c = p.combinaisons[0];
					return (
						<BoutonDeReponse
							principal
							libelle="Noter le paiement"
							onClick={() => noter(c.references, c.total)}
						/>
					);
				}
				if (p.issue === 'AMBIGU') {
					return (
						<ListeDeReponses
							choix={p.combinaisons.map((c) => ({
								cle: c.references.join('+'),
								titre: c.references.join(', '),
								ligne: eurosCentimes(c.total),
								onClick: () => noter(c.references, c.total)
							}))}
						/>
					);
				}
				if (p.issue === 'TROP_DE_CANDIDATES') {
					return <BoutonDeReponse principal libelle="Ouvrir sa fiche" onClick={onFiche} />;
				}
				return p.repartition !== undefined &&
					p.repartition.lignes.length > 0 &&
					centimes !== null ? (
					<BoutonDeReponse
						principal
						libelle="Noter le paiement"
						onClick={() => noter(null, centimes)}
					/>
				) : undefined;
			case 'FIN':
				return undefined;
		}
	}

	return {
		fil,
		zone: zone(),
		suivi: `reglement-${affichee}-${proposition?.etat ?? 'rien'}-${travail.tic}-${String(travail.fini)}`,
		lance: travail.lance,
		fini: travail.fini
	};
}
