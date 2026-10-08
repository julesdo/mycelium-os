import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import { suiteDuPlan } from '../lib/verticales/recouvrement/plan-relance';
import {
	AccueilDePlume,
	BarreDEtapes,
	BoutonDeReponse,
	BulleDeReponse,
	CarteDeFactures,
	CarteDuPlan,
	ChampDeReponse,
	ChoixDeDate,
	EnteteDetail,
	NOM_DU_PILOTE,
	PageConversation,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	ZoneDeReponse,
	dateCourte,
	dateRelative,
	eurosCentimes,
	pluriel,
	type EtapeDeTravail,
	type FactureProposee
} from '../ui';

/**
 * DÉMARRER UN DOSSIER AVEC PLUME — une conversation guidée, une question à la fois
 * (08/10/2026, sur Lemonade et Claude).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI ÉTAIT DEMANDÉ : « D'UNE FACILITÉ […] CHAT MÉLANGÉ À UN STEPPER »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Plume a déjà tout réuni : les factures échues, l'adresse du client, le plan. Il
 * ne demande que ce qu'il ne peut pas savoir, et il le demande comme Maya chez
 * Lemonade : sa question dans le fil, les réponses en gros boutons en bas, la
 * réponse qui revient en bulle avec un crayon. La barre d'étapes, en haut, dit où
 * l'on en est.
 *
 *   1. Ce que je réclame — les factures, toutes cochées.
 *   2. À qui j'écris — l'adresse du client (et la vôtre, si je ne l'ai pas).
 *   3. Ce que je ne peux pas deviner — contestation, avoir, promesse.
 *   4. Comment je m'y prends — le plan, daté.
 *   5. C'est parti — le démarrage, qui se voit.
 *
 * ⚠️ RIEN NE S'ÉCRIT AVANT « DÉMARRER ». On peut revenir sur une réponse, quitter,
 * recommencer : seul le dernier geste écrit (`demarrage.demarrer`).
 *
 * ⚠️ TOUT ARRIVE EN PROPRIÉTÉS, et le dernier geste est une promesse : la salle
 * d'exposition rend ce parcours sans backend.
 */

export type ReponseFaitAffichee = 'OUI' | 'NON' | 'INCONNU';

export interface ReponsesDemarrage {
	readonly factureIds: readonly string[];
	readonly email?: string;
	readonly emailReponses?: string;
	readonly contestation: ReponseFaitAffichee;
	readonly avoir: ReponseFaitAffichee;
	readonly promesse?: { readonly date: string; readonly montant: bigint };
}

export interface DossierDemarre {
	readonly creanceId: string;
	readonly prochaine: { readonly nom: string; readonly le: string } | null;
}

export interface DemarrageAffiche {
	readonly client: string;
	readonly emailClient: string | null;
	/** Votre adresse pour les réponses ; `null` : Plume la demande. */
	readonly emailReponses: string | null;
	readonly suspendu: boolean;
	readonly horsPilote: boolean;
	readonly factures: readonly FactureProposee[];
	readonly envoiAutomatique: boolean;
	readonly aujourdHui: string;
	readonly retour: {
		readonly vers: LinkProps['to'];
		readonly parametres?: LinkProps['params'];
		readonly libelle: string;
	};
	readonly onDemarrer: (reponses: ReponsesDemarrage) => Promise<DossierDemarre>;
	readonly onVoirDossier: (creanceId: string) => void;
	readonly onParlerAPlume: (creanceId: string) => void;
	readonly onRevenir: () => void;
}

type Etape =
	| 'FACTURES'
	| 'EMAIL'
	| 'EMAIL_REPONSES'
	| 'CONTESTATION'
	| 'AVOIR'
	| 'PROMESSE'
	| 'PLAN'
	| 'TRAVAIL';

/** Les cinq étapes de la barre, et celle de chaque question. */
const ETAPES_DE_LA_BARRE = [
	'Ce que je réclame',
	'À qui j’écris',
	'Ce que je ne peux pas deviner',
	'Comment je m’y prends',
	'C’est parti'
] as const;
const RANG_DANS_LA_BARRE: Readonly<Record<Etape, number>> = {
	FACTURES: 0,
	EMAIL: 1,
	EMAIL_REPONSES: 1,
	CONTESTATION: 2,
	AVOIR: 2,
	PROMESSE: 2,
	PLAN: 3,
	TRAVAIL: 4
};

const LIBELLE_FAIT: Readonly<Record<ReponseFaitAffichee, string>> = {
	NON: 'Non',
	OUI: 'Oui',
	INCONNU: 'Je ne sais pas'
};

/** Le temps qu'une étape du démarrage reste à l'écran avant la suivante. */
const CADENCE_MS = 750;

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Un jour plus tard, au calendrier (UTC). */
function plusJours(iso: string, jours: number): string {
	const date = new Date(`${iso}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + jours);
	return date.toISOString().slice(0, 10);
}

/** « vendredi », « dans 15 jours », « fin du mois » : les jours qu'on promet le plus. */
function joursProposes(aujourdHui: string): { libelle: string; date: string }[] {
	const jour = new Date(`${aujourdHui}T00:00:00.000Z`).getUTCDay();
	const avantVendredi = (5 - jour + 7) % 7 || 7;
	const finDuMois = new Date(`${aujourdHui}T00:00:00.000Z`);
	finDuMois.setUTCMonth(finDuMois.getUTCMonth() + 1, 0);
	const fin = finDuMois.toISOString().slice(0, 10);
	const propositions = [
		{ libelle: 'Vendredi', date: plusJours(aujourdHui, avantVendredi) },
		{ libelle: 'Dans 15 jours', date: plusJours(aujourdHui, 15) },
		{
			libelle: 'Fin du mois',
			date: fin > plusJours(aujourdHui, 2) ? fin : plusJours(aujourdHui, 30)
		}
	];
	return propositions.filter((p, i) => propositions.findIndex((q) => q.date === p.date) === i);
}

/** Des euros écrits comme on les tape : « 6000,50 ». */
function eurosATaper(centimes: bigint): string {
	const euros = centimes / 100n;
	const reste = (centimes % 100n).toString().padStart(2, '0');
	return reste === '00' ? euros.toString() : `${euros},${reste}`;
}

/** Ce que le gérant a tapé, en centimes ; `null` si ce n'est pas un montant. */
function centimesDe(texte: string): bigint | null {
	const propre = texte.replace(/[\s €]/g, '').replace(',', '.');
	if (!/^\d+(\.\d{1,2})?$/.test(propre)) return null;
	const [entiers = '0', decimales = ''] = propre.split('.');
	return BigInt(entiers) * 100n + BigInt(decimales.padEnd(2, '0'));
}

export function EcranDemarrage({ demarrage }: { readonly demarrage: DemarrageAffiche }) {
	/*
	  ⚠️ CE QUE PLUME A RÉUNI EST FIGÉ À L'ARRIVÉE. La lecture est réactive : au
	  démarrage, le dossier change sous nos yeux (les factures y entrent, votre adresse
	  s'enregistre), et le fil se réécrirait pendant qu'on le lit.
	*/
	const [d] = useState(() => demarrage);
	const [etape, setEtape] = useState<Etape>('FACTURES');
	const [cochees, setCochees] = useState<ReadonlySet<string>>(
		() => new Set(d.factures.map((f) => f.id))
	);
	const [saisieEmail, setSaisieEmail] = useState(d.emailClient === null);
	const [email, setEmail] = useState('');
	const [sansEmail, setSansEmail] = useState(false);
	const [emailReponses, setEmailReponses] = useState('');
	const [contestation, setContestation] = useState<ReponseFaitAffichee>('NON');
	const [avoir, setAvoir] = useState<ReponseFaitAffichee>('NON');
	const [promet, setPromet] = useState(false);
	const [detailPromesse, setDetailPromesse] = useState(false);
	const [datePromesse, setDatePromesse] = useState('');
	const [montantPromesse, setMontantPromesse] = useState('');
	const [resultat, setResultat] = useState<DossierDemarre | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);
	const [tic, setTic] = useState(0);

	const choisies = d.factures.filter((f) => cochees.has(f.id));
	const total = choisies.reduce((somme, f) => somme + f.resteDu, 0n);
	const ordre: readonly Etape[] = [
		'FACTURES',
		'EMAIL',
		...(d.emailReponses === null ? (['EMAIL_REPONSES'] as const) : []),
		'CONTESTATION',
		'AVOIR',
		'PROMESSE',
		'PLAN',
		'TRAVAIL'
	];
	const rangCourant = ordre.indexOf(etape);
	const passees = ordre.slice(0, rangCourant);

	function suivante(apres: Etape) {
		const rang = ordre.indexOf(apres);
		const prochaine = ordre[rang + 1];
		if (prochaine !== undefined) setEtape(prochaine);
	}

	/* ── Ce que Plume relancera, et comment ──────────────────────────────── */
	const ancre =
		choisies
			.map((f) => f.echeance)
			.filter((e): e is string => e !== null)
			.sort()[0] ?? null;
	const plan =
		ancre === null
			? []
			: suiteDuPlan({ ancre, faites: [], aujourdHui: d.aujourdHui }).map((e) => ({
					nom: e.etape.nom,
					quand: e.le <= d.aujourdHui ? 'aujourd’hui' : dateCourte(e.le),
					automatique: e.etape.automatique
				}));
	const relance = !d.suspendu && !d.horsPilote && contestation !== 'OUI';
	const emailFinal = saisieEmail ? (sansEmail ? null : email.trim()) : d.emailClient;

	/* ── Le démarrage, qui se voit ───────────────────────────────────────── */
	const etapesTravail = [
		`Je réunis ${choisies.length} facture${pluriel(choisies.length)} dans son dossier`,
		'J’enregistre vos réponses',
		relance && plan[0] !== undefined
			? `Je cale ${plan[0].nom.toLowerCase()} : ${plan[0].quand}`
			: 'Je cale son plan',
		'Je surveille sa date limite pour agir'
	];
	const enTravail = etape === 'TRAVAIL';
	const fini = enTravail && resultat !== null && tic >= etapesTravail.length;
	useEffect(() => {
		if (!enTravail) return;
		const horloge = window.setInterval(() => setTic((t) => t + 1), CADENCE_MS);
		return () => window.clearInterval(horloge);
	}, [enTravail]);

	function demarrer() {
		setErreur(null);
		setTic(0);
		setEtape('TRAVAIL');
		const montant = centimesDe(montantPromesse);
		d.onDemarrer({
			factureIds: choisies.map((f) => f.id),
			...(saisieEmail && !sansEmail && email.trim() !== '' ? { email: email.trim() } : {}),
			...(emailReponses.trim() === '' ? {} : { emailReponses: emailReponses.trim() }),
			contestation,
			avoir,
			...(promet && montant !== null && datePromesse !== ''
				? { promesse: { date: datePromesse, montant } }
				: {})
		})
			.then(setResultat)
			.catch((e: unknown) => {
				const convexe = e as { data?: unknown };
				setErreur(
					typeof convexe.data === 'string'
						? convexe.data
						: e instanceof Error
							? e.message
							: 'Le démarrage n’a pas abouti.'
				);
				setEtape('PLAN');
			});
	}

	/* ── Ce que Plume dit à chaque étape, et ce que le gérant a répondu ──── */
	function question(cle: Etape, interactive: boolean): ReactNode {
		switch (cle) {
			case 'FACTURES':
				return (
					<ReponseDePlume
						texte={
							d.factures.length === 0
								? `Je ne trouve aucune facture échue chez ${d.client} : il n’y a rien à réclamer pour l’instant.`
								: `J’ai trouvé ${d.factures.length} facture${pluriel(d.factures.length)} échue${pluriel(d.factures.length)} chez ${d.client}. Je les réclame toutes ? Décochez celles que vous gardez de côté.`
						}
					>
						{d.factures.length === 0 ? null : (
							<CarteDeFactures
								factures={d.factures}
								cochees={cochees}
								{...(interactive
									? {
											onBasculer: (id: string) => {
												const suivantes = new Set(cochees);
												if (suivantes.has(id)) suivantes.delete(id);
												else suivantes.add(id);
												setCochees(suivantes);
											}
										}
									: {})}
							/>
						)}
					</ReponseDePlume>
				);
			case 'EMAIL':
				return (
					<ReponseDePlume
						texte={
							d.emailClient === null
								? `Je n’ai pas l’adresse e-mail de ${d.client}. À qui j’écris ?`
								: `Je lui écris à ${d.emailClient}. C’est la bonne adresse ?`
						}
					/>
				);
			case 'EMAIL_REPONSES':
				return (
					<ReponseDePlume texte="Et vous : où voulez-vous recevoir ses réponses ? Je lui écris à votre nom, c’est donc vous qu’il contactera." />
				);
			case 'CONTESTATION':
				return (
					<ReponseDePlume
						texte={`Trois choses que je ne peux pas deviner. Avez-vous reçu une contestation écrite de ${d.client} sur ces factures ?`}
					/>
				);
			case 'AVOIR':
				return (
					<ReponseDePlume
						texte={
							contestation === 'OUI'
								? `Compris : je ne le relancerai pas automatiquement. Une facture contestée se règle en parlant avec lui ; je suis le dossier et ses dates, vous gardez la main. ${d.client} vous a-t-il réclamé un avoir ou une remise ?`
								: `${d.client} vous a-t-il réclamé un avoir ou une remise ?`
						}
					/>
				);
			case 'PROMESSE':
				return <ReponseDePlume texte="Vous a-t-il promis de payer ?" />;
			case 'PLAN':
				return (
					<ReponseDePlume
						texte={
							!relance
								? 'Voici comment je m’y prends :'
								: plan.length === 0
									? 'Ses factures n’ont pas d’échéance lisible : je ne peux pas dater de relance. Je suis le dossier et ses dates.'
									: 'Voici comment je m’y prends :'
						}
					>
						{plan.length === 0 || !relance ? null : <CarteDuPlan etapes={plan} />}
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{!relance
								? d.suspendu
									? 'Il est en procédure collective ou radié : je ne le relance pas, je suis ses dates.'
									: 'Je ne le relance pas : je suis le dossier et ses dates, et vous gardez la main.'
								: emailFinal === null || emailFinal === ''
									? 'Sans son adresse, je prépare les courriers et vous les envoyez. Donnez-la-moi quand vous l’aurez.'
									: d.envoiAutomatique
										? 'J’envoie chaque relance à votre nom, une heure après vous l’avoir montrée : vous pouvez toujours la retenir.'
										: 'Je prépare chaque relance ; vous la relisez et l’envoyez.'}
						</p>
					</ReponseDePlume>
				);
			default:
				return null;
		}
	}

	function reponse(cle: Etape): string {
		switch (cle) {
			case 'FACTURES':
				return `${choisies.length} facture${pluriel(choisies.length)}, ${eurosCentimes(total)}`;
			case 'EMAIL':
				return !saisieEmail
					? `Oui, ${d.emailClient ?? ''}`
					: sansEmail
						? 'Je ne l’ai pas'
						: email.trim();
			case 'EMAIL_REPONSES':
				return emailReponses.trim() === '' ? 'Plus tard' : emailReponses.trim();
			case 'CONTESTATION':
				return LIBELLE_FAIT[contestation];
			case 'AVOIR':
				return LIBELLE_FAIT[avoir];
			case 'PROMESSE': {
				const montant = centimesDe(montantPromesse);
				return promet && montant !== null && datePromesse !== ''
					? `Oui, ${eurosCentimes(montant)} pour le ${dateCourte(datePromesse)}`
					: 'Non';
			}
			case 'PLAN':
				return 'Démarrer le dossier';
			default:
				return '';
		}
	}

	/* ── La zone des réponses de l'étape en cours ────────────────────────── */
	function zone(): ReactNode {
		switch (etape) {
			case 'FACTURES':
				return d.factures.length === 0 ? (
					<BoutonDeReponse libelle="Revenir" onClick={d.onRevenir} />
				) : (
					<BoutonDeReponse
						principal
						desactive={choisies.length === 0}
						libelle={
							choisies.length === 0
								? 'Cochez au moins une facture'
								: `Réclamer ${choisies.length} facture${pluriel(choisies.length)} · ${eurosCentimes(total)}`
						}
						onClick={() => suivante('FACTURES')}
					/>
				);
			case 'EMAIL':
				return !saisieEmail ? (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Une autre" onClick={() => setSaisieEmail(true)} />
						<BoutonDeReponse
							principal
							libelle="Oui"
							onClick={() => {
								setSansEmail(false);
								suivante('EMAIL');
							}}
						/>
					</RangeeDeReponses>
				) : (
					<>
						<ChampDeReponse
							valeur={email}
							onChange={setEmail}
							placeholder={`compta@${d.client.toLowerCase().split(/\s+/)[0] ?? 'client'}.fr`}
							clavier="email"
						/>
						<RangeeDeReponses>
							<BoutonDeReponse
								libelle="Je ne l’ai pas"
								onClick={() => {
									setSansEmail(true);
									suivante('EMAIL');
								}}
							/>
							<BoutonDeReponse
								principal
								desactive={!ADRESSE.test(email.trim())}
								libelle="Valider"
								onClick={() => {
									setSansEmail(false);
									suivante('EMAIL');
								}}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'EMAIL_REPONSES':
				return (
					<>
						<ChampDeReponse
							valeur={emailReponses}
							onChange={setEmailReponses}
							placeholder="vous@votre-entreprise.fr"
							clavier="email"
						/>
						<RangeeDeReponses>
							<BoutonDeReponse
								libelle="Plus tard"
								onClick={() => {
									setEmailReponses('');
									suivante('EMAIL_REPONSES');
								}}
							/>
							<BoutonDeReponse
								principal
								desactive={!ADRESSE.test(emailReponses.trim())}
								libelle="Valider"
								onClick={() => suivante('EMAIL_REPONSES')}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'CONTESTATION':
			case 'AVOIR': {
				const choisir = etape === 'CONTESTATION' ? setContestation : setAvoir;
				return (
					<RangeeDeReponses>
						{(['NON', 'OUI', 'INCONNU'] as const).map((valeur) => (
							<BoutonDeReponse
								key={valeur}
								libelle={LIBELLE_FAIT[valeur]}
								onClick={() => {
									choisir(valeur);
									suivante(etape);
								}}
							/>
						))}
					</RangeeDeReponses>
				);
			}
			case 'PROMESSE':
				return !detailPromesse ? (
					<RangeeDeReponses>
						<BoutonDeReponse
							libelle="Non"
							onClick={() => {
								setPromet(false);
								suivante('PROMESSE');
							}}
						/>
						<BoutonDeReponse
							libelle="Oui"
							onClick={() => {
								setDetailPromesse(true);
								if (montantPromesse === '') setMontantPromesse(eurosATaper(total));
							}}
						/>
					</RangeeDeReponses>
				) : (
					<>
						<p className="px-1 text-cladd-2xs font-medium text-cladd-fg-soft">
							Pour quel jour, et combien ?
						</p>
						<ChoixDeDate
							propositions={joursProposes(d.aujourdHui)}
							valeur={datePromesse}
							onChange={setDatePromesse}
							min={d.aujourdHui}
						/>
						<ChampDeReponse
							valeur={montantPromesse}
							onChange={setMontantPromesse}
							placeholder="Montant promis, en euros"
							clavier="decimal"
						/>
						<RangeeDeReponses>
							<BoutonDeReponse
								libelle="Finalement non"
								onClick={() => {
									setPromet(false);
									setDetailPromesse(false);
									suivante('PROMESSE');
								}}
							/>
							<BoutonDeReponse
								principal
								desactive={datePromesse === '' || centimesDe(montantPromesse) === null}
								libelle="Valider"
								onClick={() => {
									setPromet(true);
									setDetailPromesse(false);
									suivante('PROMESSE');
								}}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'PLAN':
				return <BoutonDeReponse principal libelle="Démarrer le dossier" onClick={demarrer} />;
			case 'TRAVAIL':
				return fini && resultat !== null ? (
					<>
						<BoutonDeReponse
							principal
							libelle="Voir le dossier"
							onClick={() => d.onVoirDossier(resultat.creanceId)}
						/>
						<BoutonDeReponse
							libelle={`Parler à ${NOM_DU_PILOTE} de ce dossier`}
							onClick={() => d.onParlerAPlume(resultat.creanceId)}
						/>
					</>
				) : (
					<p className="py-2 text-center text-cladd-2xs text-cladd-fg-soft" role="status">
						{NOM_DU_PILOTE} démarre le dossier…
					</p>
				);
		}
	}

	/*
	  LE FIL DESCEND VERS CE QUI ARRIVE : la question suivante, une étape qui se
	  coche, la fin. Une synchronisation avec le DOM, pas un état.
	*/
	const fin = useRef<HTMLDivElement>(null);
	useEffect(() => {
		fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}, [etape, tic, fini, detailPromesse, saisieEmail, erreur]);

	const travail: EtapeDeTravail[] = etapesTravail.map((libelle, i) => ({
		libelle,
		etat:
			i < tic || (resultat !== null && fini)
				? 'faite'
				: i === Math.min(tic, etapesTravail.length - 1)
					? 'courante'
					: 'avenir'
	}));

	return (
		<PageConversation
			entete={
				<EnteteDetail
					retourVers={d.retour.vers}
					{...(d.retour.parametres === undefined ? {} : { retourParametres: d.retour.parametres })}
					retourLibelle={d.retour.libelle}
					donneesPretes
					titre="Démarrer le dossier"
					sousTitre={d.client}
				/>
			}
			composeur={<ZoneDeReponse>{zone()}</ZoneDeReponse>}
		>
			<BarreDEtapes etapes={ETAPES_DE_LA_BARRE} courante={fini ? 5 : RANG_DANS_LA_BARRE[etape]} />

			{passees.map((cle) => (
				<div key={cle} className="flex flex-col gap-3">
					{question(cle, false)}
					<BulleDeReponse
						texte={reponse(cle)}
						onModifier={enTravail ? undefined : () => setEtape(cle)}
					/>
				</div>
			))}

			{etape === 'TRAVAIL' ? null : question(etape, true)}

			{erreur === null ? null : (
				<ReponseDePlume
					humeur="attention"
					texte={`${erreur} Rien n’a été démarré : vous pouvez réessayer.`}
				/>
			)}

			{enTravail && !fini ? (
				<TravailDePlume titre={`Je démarre le dossier de ${d.client}`} etapes={travail} />
			) : null}

			{fini && resultat !== null ? (
				<AccueilDePlume
					humeur="content"
					titre={`C’est parti. Je m’occupe du dossier de ${d.client}.`}
					sousTitre={
						resultat.prochaine === null
							? 'Je vous préviens dès qu’il se passe quelque chose.'
							: `Prochaine étape : ${resultat.prochaine.nom.toLowerCase()}, ${resultat.prochaine.le <= d.aujourdHui ? 'aujourd’hui' : dateRelative(resultat.prochaine.le, d.aujourdHui)}. Je vous préviens dès qu’il se passe quelque chose.`
					}
				/>
			) : null}
			<div ref={fin} aria-hidden />
		</PageConversation>
	);
}
