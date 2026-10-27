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
import { useEnvoi } from './sous-parcours';
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

type Etape = 'QUOI' | 'EMAIL' | 'EMAIL_PARTI' | 'DELAI' | 'REGLAGES' | 'APERCU' | 'TRAVAIL';

/** Ce que la préparation a donné : validée d'un même geste, à relire, ou à faire valider. */
interface PreparationFaite {
	readonly envoiId: string;
	readonly issue: 'VALIDE' | 'A_RELIRE' | 'A_VALIDER';
}

/** Les délais proposés d'un toucher, ceux de la lettre : un choix de produit, sans valeur de droit. */
const DELAIS = [8, 15, 30] as const;

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
	onRelire,
	lettreDepart
}: PropsDuFil & {
	readonly lettres: LettresDuGuide;
	/**
	 * Une lettre déjà choisie et remplie (l'accord écrit, depuis le paiement en
	 * plusieurs fois) : la conversation commence à ce qu'il y a dedans.
	 */
	readonly lettreDepart?: { readonly modele: ModeleCourrierAffiche; readonly titre: string };
	/** La lettre préparée, à relire et valider : la conversation enchaîne. */
	readonly onRelire: (envoiId: string) => void;
}) {
	const { courriers } = lettres;
	const [etape, setEtape] = useState<Etape>(() =>
		lettreDepart === undefined ? 'QUOI' : 'REGLAGES'
	);
	const [choisi, setChoisi] = useState<Choisi | null>(() =>
		lettreDepart === undefined ? null : { genre: 'LETTRE', ...lettreDepart }
	);
	const [local, setLocal] = useState<ChoixCourrierAffiche | null>(null);
	const [ouvertureEmail, setOuvertureEmail] = useState<'MESSAGERIE' | 'COPIE' | null>(null);
	/* La lettre telle qu'elle a été préparée : le fil la garde, la route oublie le choix. */
	const [apercuFige, setApercuFige] = useState<ApercuAffiche | null>(null);
	/* Les autres réglages d'une lettre de relance, ouverts seulement si on les demande. */
	const [reglagesDemandes, setReglagesDemandes] = useState(false);
	const annulation = useAnnulation();

	/* Le choix d'une lettre vit dans la route quand elle le tient : son aperçu en dépend. */
	const choix = courriers.choix === undefined ? local : courriers.choix;
	function changer(c: ChoixCourrierAffiche | null) {
		setLocal(c);
		courriers.onChoisir(c);
	}

	const emails = lettres.relances.filter((n) => n.disponible && n.corps !== undefined);
	const lettresPossibles = courriers.modeles.filter((m) => m.indisponible === null);
	/* Rien ne s'applique : Plume le dit, au lieu d'une liste vide. */
	const rienAPreparer = emails.length + lettresPossibles.length === 0;
	/*
	  ⚠️ CE QUI NE S'APPLIQUE PAS EST DIT, JAMAIS CACHÉ : les lettres avec leur raison, et
	  les e-mails indisponibles — groupés quand ils partagent le même constat (une
	  procédure collective les suspend tous).
	*/
	const impossibles: { readonly cle: string; readonly titre: string; readonly raison: string }[] =
		[];
	/*
	  ⚠️ LA LETTRE DE RELANCE OFFICIELLE N'EST PAS UN E-MAIL IMPOSSIBLE (audit des parcours
	  Pro du 27/10/2026) : le niveau 3 des e-mails la renvoie à son modèle de lettre. Le
	  menu proposait la lettre et disait, sous elle, qu'on ne pouvait pas la préparer.
	*/
	const lettreOfficielle = courriers.modeles.some((m) => m.cle === 'RELANCE_OFFICIELLE');
	for (const niveau of lettres.relances.filter(
		(n) => !n.disponible && !(n.niveau === 3 && lettreOfficielle)
	)) {
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

	/*
	  ⚠️ UNE LETTRE DE RELANCE NE DEMANDE QU'UNE CHOSE : le délai. Les trois autres
	  réglages (ce qu'elle annonce, le mode de paiement, la réserve de frais) partent sur
	  les valeurs d'un dossier seul, et se changent depuis l'aperçu si on le demande. Les
	  autres modèles ont des champs que rien ne remplit (le mandataire, qui signe) : leur
	  formulaire reste, présenté par Plume.
	*/
	const ordreComplet: readonly Etape[] =
		choisi?.genre === 'EMAIL'
			? ['QUOI', 'EMAIL', 'EMAIL_PARTI', 'TRAVAIL']
			: choisi?.genre === 'LETTRE' && choisi.modele === 'RELANCE_OFFICIELLE'
				? [
						'QUOI',
						'DELAI',
						...(reglagesDemandes ? (['REGLAGES'] as const) : []),
						'APERCU',
						'TRAVAIL'
					]
				: ['QUOI', 'REGLAGES', 'APERCU', 'TRAVAIL'];
	/* Une lettre déjà choisie (l'accord écrit) : « Je prépare quoi ? » n'a plus lieu d'être. */
	const ordre =
		lettreDepart === undefined ? ordreComplet : ordreComplet.filter((e) => e !== 'QUOI');

	const libellesDuTravail =
		choisi?.genre === 'EMAIL'
			? ['Je le note dans son historique']
			: [
					...(choisi !== null && DATENT_LE_MONTANT.includes(choisi.modele)
						? ['Je date le montant au jour d’aujourd’hui']
						: []),
					'Je remplis le modèle avec les faits du dossier',
					courriers.peutValider
						? 'Je fige son texte : vous l’avez validée'
						: 'Je la range dans le dossier, à valider'
				];
	const travail = useTravail<Annulation | PreparationFaite>(libellesDuTravail);
	const preparation =
		travail.resultat !== null && typeof travail.resultat === 'object' ? travail.resultat : null;
	/*
	  VALIDÉE D'UN MÊME GESTE : la conversation enchaîne sur l'envoi, sans relire une
	  deuxième fois ce qui vient d'être lu (useEnvoi, le même morceau que la relecture).
	*/
	const courrierPrepare =
		preparation === null
			? null
			: (courriers.envois.find((e) => e.id === preparation.envoiId) ?? null);
	const envoiGuide = useEnvoi({
		courrier: courrierPrepare,
		actif: preparation?.issue === 'VALIDE',
		aujourdHui: d.aujourdHui,
		courriers,
		gestes,
		onPlusTard: onFermer
	});
	const affichee: Etape =
		etape === 'TRAVAIL' && travail.erreur !== null
			? choisi?.genre === 'EMAIL'
				? 'EMAIL_PARTI'
				: 'APERCU'
			: etape;
	const passees = ordre.slice(0, ordre.indexOf(affichee));
	const verrouille = travail.lance || envoiGuide.lance;

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
		setReglagesDemandes(false);
		setEtape(modele === 'RELANCE_OFFICIELLE' ? 'DELAI' : 'REGLAGES');
	}

	/*
	  ⚠️ VALIDER APRÈS AVOIR LU, D'UN MÊME GESTE. Le gérant vient de lire la lettre telle
	  qu'elle partira : « Valider la lettre » la prépare et la valide. Le serveur fige le
	  texte et le compare : si le dossier a changé entre-temps, il rend « à relire », et
	  la relecture s'ouvre. Sans droit de valider, elle se prépare et attend un
	  administrateur. Rien ne part pour autant : l'envoi reste au gérant.
	*/
	function preparer() {
		if (choix === null) return;
		const preparee = choix;
		setApercuFige(courriers.apercu ?? null);
		setEtape('TRAVAIL');
		const valider = courriers.peutValider;
		travail.lancer(async (): Promise<PreparationFaite> => {
			const envoiId = await gestes.preparerCourrier(preparee);
			changer(null);
			if (!valider) return { envoiId, issue: 'A_VALIDER' };
			return { envoiId, issue: await gestes.validerCourrier(envoiId) };
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
							rienAPreparer
								? `Je ne peux rien préparer pour ${d.client} pour l’instant.`
								: d.pourLesIntentions.relancesSuspendues
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
			case 'DELAI':
				return (
					<ReponseDePlume texte="Combien de jours lui laissez-vous pour payer ? Trois jours d’acheminement s’y ajoutent." />
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
			case 'DELAI':
				return choix?.modele === 'RELANCE_OFFICIELLE' ? `${choix.delaiJours} jours` : '';
			case 'REGLAGES':
				return 'C’est bon';
			case 'APERCU':
				return courriers.peutValider ? 'Valider la lettre' : 'La préparer';
			default:
				return '';
		}
	}

	const choixDuCourrier = (
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

	function zone(): ReactNode {
		switch (affichee) {
			case 'QUOI':
				return rienAPreparer ? (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				) : undefined;
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
			case 'DELAI': {
				const habitude = courriers.delaiRelanceParDefaut ?? DELAIS[0];
				return (
					<RangeeDeReponses>
						{DELAIS.map((jours) => (
							<BoutonDeReponse
								key={jours}
								principal={jours === habitude}
								libelle={`${jours} jours`}
								onClick={() => {
									if (choix?.modele === 'RELANCE_OFFICIELLE') {
										changer({ ...choix, delaiJours: jours });
									}
									setEtape(reglagesDemandes ? 'REGLAGES' : 'APERCU');
								}}
							/>
						))}
					</RangeeDeReponses>
				);
			}
			case 'REGLAGES':
				return (
					<BoutonDeReponse principal libelle="Voir la lettre" onClick={() => setEtape('APERCU')} />
				);
			case 'APERCU':
				return (
					<>
						<BoutonDeReponse
							principal
							desactive={courriers.apercu?.ok !== true || courriers.enCours}
							libelle={courriers.peutValider ? 'Valider la lettre' : 'La préparer'}
							onClick={preparer}
						/>
						{choix?.modele === 'RELANCE_OFFICIELLE' && !reglagesDemandes ? (
							<BoutonDeReponse
								libelle="Changer les autres réglages"
								onClick={() => {
									setReglagesDemandes(true);
									setEtape('REGLAGES');
								}}
							/>
						) : null}
					</>
				);
			case 'TRAVAIL': {
				if (!travail.fini) return undefined;
				const resultat = travail.resultat;
				if (preparation !== null) {
					if (preparation.issue === 'VALIDE') {
						// Le courrier n'est pas encore dans la liste : on revient au dossier, il y est.
						return envoiGuide.fini || courrierPrepare === null ? (
							<RangeeDeReponses>
								<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
								<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
							</RangeeDeReponses>
						) : (
							envoiGuide.zone
						);
					}
					return (
						<>
							{preparation.issue === 'A_RELIRE' ? (
								<BoutonDeReponse
									principal
									libelle="La relire"
									onClick={() => onRelire(preparation.envoiId)}
								/>
							) : null}
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
			suivi={`${affichee}-${travail.tic}-${travail.fini}-${String(annulation.etat)}-${courriers.apercu === undefined ? 'calcul' : 'pret'}-${envoiGuide.suivi}`}
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
			{/* Jusqu'à neuf courriers : la liste défile avec le fil, pas collée sous le pouce. */}
			{affichee === 'QUOI' && !rienAPreparer ? choixDuCourrier : null}
			<RefusDuGeste erreur={travail.erreur} />
			{affichee === 'TRAVAIL' && !travail.fini ? <TravailDePlume etapes={travail.etapes} /> : null}
			{!travail.fini ? null : preparation?.issue === 'VALIDE' ? (
				<ReponseDePlume texte="Validée : son texte est figé, tel que vous l’avez lu." />
			) : preparation?.issue === 'A_RELIRE' ? (
				<ReponseDePlume
					humeur="attention"
					texte="Le dossier a changé pendant que je la préparais : j’ai mis le texte à jour. Relisez-la avant de la valider."
				/>
			) : preparation !== null ? (
				<AccueilDePlume
					humeur="ecrit"
					titre={`${choisi?.genre === 'LETTRE' ? choisi.titre : 'La lettre'} : prête.`}
					sousTitre="Un administrateur de votre entreprise doit la valider. Rien n’est parti."
				/>
			) : (
				<AccueilDePlume humeur="content" titre="C’est noté dans son historique." />
			)}
			{envoiGuide.fil}
			<MotDAnnulation etat={annulation.etat} />
		</CadreGuide>
	);
}
