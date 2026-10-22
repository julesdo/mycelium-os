import { useState, type ReactNode } from 'react';
import {
	adresseMessagerie,
	tientDansLaMessagerie
} from '../../lib/verticales/recouvrement/messagerie';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CANAL_DU_COURRIER,
	CadreGuide,
	CarteDeCourrier,
	CarteDeReglages,
	Echange,
	FormulaireChoix,
	ListeDeReponses,
	ManquesDuCourrier,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	choixInitial,
	useTravail,
	type ApercuAffiche,
	type ChoixCourrierAffiche,
	type CourriersDuDossier,
	type ModeleCourrierAffiche,
	type NiveauAffiche
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
 * « LE RELANCER » — CE QUE PLUME PRÉPARE, CE QU'IL Y MET, ET LA LETTRE TELLE QU'ELLE
 * PARTIRA (22/10/2026).
 *
 * C'était « Courriers et e-mails » : deux sections, six modèles à égalité, chacun son
 * formulaire, et des e-mails rangés par niveau. Le bouton « Relancer » y menait, au
 * milieu. C'est désormais une conversation : Plume demande ce qu'il prépare, présente
 * ce qu'il a rempli, montre le courrier tel qu'il partira, puis le prépare sous les
 * yeux — et la relecture enchaîne (`fil-relire.tsx`).
 *
 * ⚠️ RIEN NE PART D'ICI (ligne rouge n° 1). Une lettre se prépare et attend sa
 * validation ; un e-mail s'ouvre dans la messagerie du gérant, qui le relit et
 * l'envoie. « Ouvrir », jamais « Envoyer ».
 *
 * ⚠️ LES MODÈLES QUI NE S'APPLIQUENT PAS SONT DITS, JAMAIS CACHÉS : Plume les nomme
 * sous sa question, avec leur raison.
 */

/** Ce que la conversation sait des courriers et des e-mails du dossier, en direct. */
export interface LettresDuGuide {
	readonly courriers: CourriersDuDossier;
	readonly relances: readonly NiveauAffiche[];
	readonly debiteurId: string;
	readonly debiteurEmail?: string;
}

type Choisi =
	| { readonly genre: 'EMAIL'; readonly niveau: NiveauAffiche }
	| { readonly genre: 'LETTRE'; readonly modele: ModeleCourrierAffiche; readonly titre: string };

type Etape = 'QUOI' | 'EMAIL' | 'EMAIL_PARTI' | 'REGLAGES' | 'APERCU' | 'TRAVAIL';

/** Les modèles qui réclament un montant : il se date au jour où ils se préparent. */
const DATENT_LE_MONTANT: readonly ModeleCourrierAffiche[] = [
	'RELANCE_OFFICIELLE',
	'ACCORD_ECHEANCIER',
	'DECLARATION_CREANCE'
];

export function FilEcrire({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	lettres,
	onRelire
}: PropsDuFil & {
	readonly lettres: LettresDuGuide;
	/** La lettre préparée, à relire et valider : la conversation enchaîne. */
	readonly onRelire: (envoiId: string) => void;
}) {
	const { courriers } = lettres;
	const [etape, setEtape] = useState<Etape>('QUOI');
	const [choisi, setChoisi] = useState<Choisi | null>(null);
	const [local, setLocal] = useState<ChoixCourrierAffiche | null>(null);
	const [ouvertureEmail, setOuvertureEmail] = useState<'MESSAGERIE' | 'COPIE' | null>(null);
	/* La lettre telle qu'elle a été préparée : le fil la garde, la route oublie le choix. */
	const [apercuFige, setApercuFige] = useState<ApercuAffiche | null>(null);
	const annulation = useAnnulation();

	/* Le choix d'une lettre vit dans la route quand elle le tient : son aperçu en dépend. */
	const choix = courriers.choix === undefined ? local : courriers.choix;
	function changer(c: ChoixCourrierAffiche | null) {
		setLocal(c);
		courriers.onChoisir(c);
	}

	const emails = lettres.relances.filter((n) => n.disponible && n.corps !== undefined);
	const lettresPossibles = courriers.modeles.filter((m) => m.indisponible === null);
	/*
	  ⚠️ CE QUI NE S'APPLIQUE PAS EST DIT, JAMAIS CACHÉ : les lettres avec leur raison, et
	  les e-mails indisponibles — groupés quand ils partagent le même constat (une
	  procédure collective les suspend tous).
	*/
	const impossibles: { readonly cle: string; readonly titre: string; readonly raison: string }[] =
		[];
	for (const niveau of lettres.relances.filter((n) => !n.disponible)) {
		const raison = niveau.constat ?? 'indisponible';
		const meme = impossibles.find((i) => i.cle.startsWith('email') && i.raison === raison);
		if (meme === undefined)
			impossibles.push({ cle: `email-${niveau.niveau}`, titre: niveau.nom, raison });
		else impossibles[impossibles.indexOf(meme)] = { ...meme, titre: 'Les e-mails de relance' };
	}
	for (const m of courriers.modeles) {
		if (m.indisponible !== null)
			impossibles.push({ cle: m.cle, titre: m.titre, raison: m.indisponible });
	}

	const ordre: readonly Etape[] =
		choisi?.genre === 'EMAIL'
			? ['QUOI', 'EMAIL', 'EMAIL_PARTI', 'TRAVAIL']
			: ['QUOI', 'REGLAGES', 'APERCU', 'TRAVAIL'];

	const libellesDuTravail =
		choisi?.genre === 'EMAIL'
			? ['Je le note dans son historique']
			: [
					...(choisi !== null && DATENT_LE_MONTANT.includes(choisi.modele)
						? ['Je date le montant au jour d’aujourd’hui']
						: []),
					'Je remplis le modèle avec les faits du dossier',
					'Je la range dans le dossier, à valider'
				];
	const travail = useTravail<Annulation | string>(libellesDuTravail);
	const affichee: Etape =
		etape === 'TRAVAIL' && travail.erreur !== null
			? choisi?.genre === 'EMAIL'
				? 'EMAIL_PARTI'
				: 'APERCU'
			: etape;
	const passees = ordre.slice(0, ordre.indexOf(affichee));
	const verrouille = travail.lance;

	function choisirEmail(niveau: NiveauAffiche) {
		setChoisi({ genre: 'EMAIL', niveau });
		setEtape('EMAIL');
	}

	function choisirLettre(modele: ModeleCourrierAffiche, titreDuModele: string) {
		setChoisi({ genre: 'LETTRE', modele, titre: titreDuModele });
		changer(
			choixInitial(modele, courriers.aujourdHui, courriers.delaiRelanceParDefaut, {
				personneNommee: courriers.personneNommee,
				ordonnance: courriers.ordonnanceLue,
				...(courriers.echeancierConvenu === undefined
					? {}
					: { calendrier: courriers.echeancierConvenu })
			})
		);
		setEtape('REGLAGES');
	}

	function preparer() {
		if (choix === null) return;
		const preparee = choix;
		setApercuFige(courriers.apercu ?? null);
		setEtape('TRAVAIL');
		travail.lancer(async () => {
			const envoiId = await gestes.preparerCourrier(preparee);
			changer(null);
			return envoiId;
		});
	}

	function noterLEmail() {
		if (choisi?.genre !== 'EMAIL') return;
		setEtape('TRAVAIL');
		travail.lancer(() =>
			gestes.noter({ texte: `${choisi.niveau.nom} envoyé par e-mail.`, canal: 'COURRIEL' })
		);
	}

	/* ── L'e-mail, et ce qui l'empêche de s'ouvrir ───────────────────────── */
	const email =
		choisi?.genre === 'EMAIL'
			? adresseMessagerie({
					destinataire: lettres.debiteurEmail,
					objet: choisi.niveau.objet ?? '',
					corps: choisi.niveau.corps ?? ''
				})
			: null;
	const emailOuvrable =
		email !== null && !email.sansDestinataire && tientDansLaMessagerie(email.longueur);

	function copier(texte: string) {
		void navigator.clipboard.writeText(texte).catch(() => undefined);
	}

	/* ── Ce que Plume dit, à chaque étape ───────────────────────────────── */
	function question(cle: Etape): ReactNode {
		switch (cle) {
			case 'QUOI':
				return (
					<ReponseDePlume
						texte={
							d.pourLesIntentions.relancesSuspendues
								? `${d.client} est en procédure collective ou radié : on ne lui écrit plus comme avant. Voici ce que sa situation permet.`
								: `Je prépare quoi pour ${d.client} ?`
						}
					>
						{impossibles.length === 0 ? null : (
							<div className="flex flex-col gap-1">
								<p className="text-cladd-2xs font-medium text-cladd-fg-soft">
									Ce que je ne peux pas préparer ici :
								</p>
								{impossibles.map((i) => (
									<p key={i.cle} className="text-cladd-2xs leading-snug text-cladd-fg-soft">
										{i.titre} · {i.raison}
									</p>
								))}
							</div>
						)}
					</ReponseDePlume>
				);
			case 'EMAIL':
				return choisi?.genre !== 'EMAIL' ? null : (
					<ReponseDePlume texte="Voici l’e-mail, à votre nom. Il s’ouvre dans votre messagerie : vous le relisez et l’envoyez, et ses réponses arrivent chez vous.">
						<CarteDeCourrier
							titre={choisi.niveau.objet ?? choisi.niveau.nom}
							sousTitre={
								lettres.debiteurEmail === undefined
									? 'Son adresse e-mail n’est pas renseignée'
									: `Pour ${lettres.debiteurEmail}`
							}
							resume={[choisi.niveau.intention]}
							corps={choisi.niveau.corps ?? ''}
							ouvertAuDepart
						/>
						{email?.sansDestinataire === true ? (
							<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
								Je n’ai pas son adresse : le message ne peut pas s’ouvrir dans votre messagerie.
								Copiez l’objet et le texte, ou renseignez son adresse sur sa fiche.
							</p>
						) : email !== null && !tientDansLaMessagerie(email.longueur) ? (
							<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
								Il est trop long pour s’ouvrir dans une messagerie : au-delà d’environ deux mille
								caractères, la plupart des logiciels le tronquent sans le dire. Copiez l’objet et le
								texte.
							</p>
						) : null}
					</ReponseDePlume>
				);
			case 'EMAIL_PARTI':
				return (
					<ReponseDePlume texte="Une fois parti, dites-le-moi : je le note dans son historique." />
				);
			case 'REGLAGES':
				return choisi?.genre !== 'LETTRE' || choix === null ? null : (
					<ReponseDePlume texte="Je l’ai remplie avec ce que je sais. Changez ce qui ne va pas.">
						<CarteDeReglages>
							<FormulaireChoix
								choix={choix}
								onChange={verrouille ? () => undefined : changer}
								intervenants={courriers.intervenants}
								professionnels={courriers.professionnels}
								dirigeantsDuClient={courriers.dirigeantsDuClient}
								citationAnnonce={courriers.citationAnnonce}
								personneNommee={courriers.personneNommee}
								ordonnanceLue={courriers.ordonnanceLue}
								echeancierConvenu={courriers.echeancierConvenu}
							/>
						</CarteDeReglages>
					</ReponseDePlume>
				);
			case 'APERCU': {
				const apercu = apercuFige ?? courriers.apercu;
				if (apercu === undefined || apercu === null) {
					return <ReponseDePlume texte="Je compose la lettre…" />;
				}
				if (!apercu.ok) {
					return (
						<ReponseDePlume
							humeur="attention"
							texte="Il me manque de quoi la préparer. Chaque ligne mène là où ça se renseigne :"
						>
							<ManquesDuCourrier manques={apercu.manques} debiteurId={lettres.debiteurId} />
						</ReponseDePlume>
					);
				}
				return (
					<ReponseDePlume texte="Voici la lettre telle qu’elle partira, à votre nom :">
						<CarteDeCourrier
							titre={apercu.titre}
							sousTitre={`Pour ${apercu.destinataire} · ${CANAL_DU_COURRIER[apercu.canal]}`}
							resume={apercu.resume}
							corps={apercu.corps}
						/>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
							Pré-remplie avec vos données. Aucun avocat n’a relu ce modèle.
						</p>
					</ReponseDePlume>
				);
			}
			default:
				return null;
		}
	}

	function reponse(cle: Etape): string {
		switch (cle) {
			case 'QUOI':
				return choisi === null ? '' : choisi.genre === 'EMAIL' ? choisi.niveau.nom : choisi.titre;
			case 'EMAIL':
				return ouvertureEmail === 'COPIE' ? 'Texte copié' : 'Ouvert dans ma messagerie';
			case 'EMAIL_PARTI':
				return 'Je l’ai envoyé';
			case 'REGLAGES':
				return choix?.modele === 'RELANCE_OFFICIELLE'
					? `C’est bon, ${choix.delaiJours} jours pour payer`
					: 'C’est bon';
			case 'APERCU':
				return 'Préparer la lettre';
			default:
				return '';
		}
	}

	function zone(): ReactNode {
		switch (affichee) {
			case 'QUOI':
				return (
					<ListeDeReponses
						choix={[
							...emails.map((niveau) => ({
								cle: `email-${niveau.niveau}`,
								titre: niveau.nom,
								ligne: 'Un e-mail, ouvert dans votre messagerie',
								onClick: () => choisirEmail(niveau)
							})),
							...lettresPossibles.map((m) => ({
								cle: m.cle,
								titre: m.titre,
								ligne: m.description,
								onClick: () => choisirLettre(m.cle, m.titre)
							}))
						]}
					/>
				);
			case 'EMAIL':
				return choisi?.genre !== 'EMAIL' ? undefined : (
					<>
						{emailOuvrable && email !== null ? (
							<BoutonDeReponse
								principal
								libelle="Ouvrir dans ma messagerie"
								onClick={() => {
									window.open(email.url, '_self');
									setOuvertureEmail('MESSAGERIE');
									setEtape('EMAIL_PARTI');
								}}
							/>
						) : null}
						<RangeeDeReponses>
							<BoutonDeReponse
								libelle="Copier l’objet"
								onClick={() => copier(choisi.niveau.objet ?? '')}
							/>
							<BoutonDeReponse
								libelle="Copier le texte"
								onClick={() => {
									copier(choisi.niveau.corps ?? '');
									setOuvertureEmail('COPIE');
									setEtape('EMAIL_PARTI');
								}}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'EMAIL_PARTI':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Pas encore" onClick={onFermer} />
						<BoutonDeReponse principal libelle="Je l’ai envoyé" onClick={noterLEmail} />
					</RangeeDeReponses>
				);
			case 'REGLAGES':
				return (
					<BoutonDeReponse principal libelle="Voir la lettre" onClick={() => setEtape('APERCU')} />
				);
			case 'APERCU':
				return (
					<BoutonDeReponse
						principal
						desactive={courriers.apercu?.ok !== true || courriers.enCours}
						libelle="Préparer la lettre"
						onClick={preparer}
					/>
				);
			case 'TRAVAIL': {
				if (!travail.fini) return undefined;
				const resultat = travail.resultat;
				if (choisi?.genre === 'LETTRE' && typeof resultat === 'string') {
					return (
						<>
							<BoutonDeReponse
								principal
								libelle="La relire et la valider"
								onClick={() => onRelire(resultat)}
							/>
							<RangeeDeReponses>
								<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
								<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
							</RangeeDeReponses>
						</>
					);
				}
				return (
					<ReponsesDeFin
						annulation={typeof resultat === 'function' ? resultat : null}
						etat={annulation.etat}
						onAnnuler={annulation.annuler}
						onFermer={onFermer}
						onAutreChose={onAutreChose}
					/>
				);
			}
		}
	}

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			suivi={`${affichee}-${travail.tic}-${travail.fini}-${String(annulation.etat)}-${courriers.apercu === undefined ? 'calcul' : 'pret'}`}
			reponses={zone()}
		>
			{prelude(verrouille)}
			{passees.map((cle) => (
				<Echange
					key={cle}
					question={question(cle)}
					reponse={reponse(cle)}
					{...(verrouille || cle === 'EMAIL' ? {} : { onModifier: () => setEtape(cle) })}
				/>
			))}
			{affichee === 'TRAVAIL' ? null : question(affichee)}
			<RefusDuGeste erreur={travail.erreur} />
			{affichee === 'TRAVAIL' && !travail.fini ? <TravailDePlume etapes={travail.etapes} /> : null}
			{travail.fini ? (
				choisi?.genre === 'LETTRE' ? (
					<AccueilDePlume
						humeur="ecrit"
						titre={`${choisi.titre} : prête.`}
						sousTitre="Elle attend votre validation. Rien n’est parti."
					/>
				) : (
					<AccueilDePlume humeur="content" titre="C’est noté dans son historique." />
				)
			) : null}
			<MotDAnnulation etat={annulation.etat} />
		</CadreGuide>
	);
}
