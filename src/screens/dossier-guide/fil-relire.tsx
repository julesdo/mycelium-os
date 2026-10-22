import { useState, type ReactNode } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CANAL_DU_COURRIER,
	CadreGuide,
	CarteDeCourrier,
	ChoixDeDate,
	Echange,
	NOM_DU_PILOTE,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	dateCourte,
	jourDecale,
	useTravail,
	type EnvoiAffiche
} from '../../ui';
import { RefusDuGeste, type PropsDuFil } from './commun';
import type { LettresDuGuide } from './fil-ecrire';

/**
 * « RELIRE LE COURRIER » — LE LIRE, LE VALIDER, L'ENVOYER, DIRE QU'IL EST PARTI
 * (22/10/2026).
 *
 * C'était une carte de six boutons dans « Courriers et e-mails » : « Lire le texte »,
 * « Valider ce courrier », « Abandonner », puis « Télécharger le PDF », « Ouvrir dans
 * ma messagerie », « Copier le texte », une date et « Je l'ai envoyé ce jour-là ».
 * C'est désormais une conversation : Plume montre le courrier, demande s'il part,
 * dit comment l'envoyer, demande quand il est parti, et propose le rappel.
 *
 * ⚠️ RIEN NE PART SANS LE GÉRANT (ligne rouge n° 1). Valider fige le texte ; c'est lui
 * qui l'envoie, depuis sa messagerie ou par la poste, et qui dit le jour du départ.
 * Une relance que Plume a programmée se laisse partir, ou se retient.
 */

type Decision = 'VALIDER' | 'ABANDONNER' | 'RETENIR';

type Etape = 'LIRE' | 'CONFIRMER' | 'VALIDATION' | 'ENVOYER' | 'QUAND' | 'RAPPEL' | 'FIN';

/** « jeudi 9 oct. à 10:00 » : l'heure du gérant, pas celle du serveur. */
const DATE_ET_HEURE = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'long',
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit'
});

/** Le courrier à relire : celui qu'on désigne, sinon le premier qui attend quelque chose. */
export function courrierARelire(
	envois: readonly EnvoiAffiche[],
	envoiId: string | null
): EnvoiAffiche | null {
	if (envoiId !== null) return envois.find((e) => e.id === envoiId) ?? null;
	return (
		envois.find((e) => e.etat === 'A_VALIDER') ??
		envois.find((e) => e.etat === 'PROGRAMME') ??
		envois.find((e) => e.etat === 'VALIDE') ??
		null
	);
}

export function FilRelire({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	lettres,
	envoiId,
	onRelire
}: PropsDuFil & {
	readonly lettres: LettresDuGuide;
	readonly envoiId: string | null;
	/** Le courrier suivant qui attend sa relecture. */
	readonly onRelire: (envoiId: string) => void;
}) {
	const { courriers } = lettres;
	/* Le courrier est lu EN DIRECT : sa validation le fait passer à « Validé » sous nos yeux. */
	const envoi = courrierARelire(courriers.envois, envoiId);
	const [id] = useState(() => envoi?.id ?? null);
	const courrier = id === null ? null : (courriers.envois.find((e) => e.id === id) ?? envoi);

	/* Validé mais pas encore parti : la conversation commence à « l'envoyer ». */
	const [depuisValide] = useState(() => envoi?.etat === 'VALIDE');
	const [etape, setEtape] = useState<Etape>(() => (depuisValide ? 'ENVOYER' : 'LIRE'));
	const [decision, setDecision] = useState<Decision | null>(null);
	const [aRelire, setARelire] = useState(false);
	const [envoye, setEnvoye] = useState<'MESSAGERIE' | 'PDF' | null>(null);
	const [partiLe, setPartiLe] = useState(d.aujourdHui);
	const [avecRappel, setAvecRappel] = useState(true);

	const validation = useTravail<'VALIDE' | 'A_RELIRE'>([
		'Je fige son texte',
		'Je calcule son empreinte'
	]);
	const fin = useTravail<null>(
		decision === 'RETENIR'
			? ['Je la retiens : elle ne partira pas', 'Je sors ce client du pilote']
			: decision === 'ABANDONNER'
				? ['Je l’abandonne', 'Je la garde dans l’historique']
				: ['Je note le jour du départ', ...(avecRappel ? ['Je pose le rappel'] : [])]
	);

	if (courrier === null) {
		return (
			<CadreGuide
				titre={titre}
				sousTitre={d.client}
				onFermer={onFermer}
				suivi="rien"
				reponses={
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				}
			>
				{prelude(false)}
				<ReponseDePlume texte="Aucun courrier n’attend votre relecture sur ce dossier." />
			</CadreGuide>
		);
	}

	const programme = courrier.etat === 'PROGRAMME';
	const relanceOfficielle = courrier.modele === 'RELANCE_OFFICIELLE';
	const mailto = `mailto:?subject=${encodeURIComponent(courrier.objet)}&body=${encodeURIComponent(courrier.corps)}`;

	/* Le chemin dépend de la décision : valider, abandonner, retenir. */
	const ordre: readonly Etape[] =
		decision === 'ABANDONNER' || decision === 'RETENIR'
			? ['LIRE', 'CONFIRMER', 'FIN']
			: [
					...(depuisValide ? [] : (['LIRE', 'VALIDATION'] as const)),
					'ENVOYER',
					'QUAND',
					...(relanceOfficielle ? (['RAPPEL'] as const) : []),
					'FIN'
				];
	/* Validée : la conversation passe d'elle-même à l'envoi, sans « Continuer ». */
	const affichee: Etape =
		etape === 'VALIDATION' && validation.erreur !== null
			? 'LIRE'
			: etape === 'VALIDATION' && validation.fini && validation.resultat === 'VALIDE'
				? 'ENVOYER'
				: etape === 'FIN' && fin.erreur !== null
					? (ordre[ordre.indexOf('FIN') - 1] ?? 'LIRE')
					: etape;
	const passees = ordre.slice(0, ordre.indexOf(affichee));
	const verrouille = validation.lance || fin.lance;
	const suivant = courriers.envois.find((e) => e.etat === 'A_VALIDER' && e.id !== courrier.id);

	/* ── Les gestes ─────────────────────────────────────────────────────── */
	function valider() {
		setDecision('VALIDER');
		setARelire(false);
		setEtape('VALIDATION');
		validation.lancer(async () => {
			const issue = await gestes.validerCourrier(courrier?.id ?? '');
			if (issue === 'A_RELIRE') {
				setARelire(true);
				setDecision(null);
				setEtape('LIRE');
			}
			return issue;
		});
	}

	function conclure() {
		setEtape('FIN');
		const cible = courrier?.id ?? '';
		fin.lancer(async () => {
			if (decision === 'RETENIR') await gestes.retenirRelance(cible);
			else if (decision === 'ABANDONNER') await gestes.abandonnerCourrier(cible);
			else await gestes.declarerParti(cible, partiLe, relanceOfficielle && avecRappel);
			return null;
		});
	}

	/* ── Ce que Plume dit ───────────────────────────────────────────────── */
	function question(cle: Etape): ReactNode {
		if (courrier === null) return null;
		switch (cle) {
			case 'LIRE':
				return (
					<ReponseDePlume
						humeur={aRelire ? 'attention' : 'repos'}
						texte={
							aRelire
								? 'Le dossier a changé depuis la préparation : j’ai mis le texte à jour. Relisez-le, puis validez.'
								: programme
									? courrier.partiraLe === undefined
										? `Je l’envoie très bientôt, par e-mail, à votre nom. Les réponses arrivent à votre adresse.`
										: `Je l’envoie ${DATE_ET_HEURE.format(new Date(courrier.partiraLe))}, par e-mail, à votre nom. Les réponses arrivent à votre adresse.`
									: courrier.etat === 'PARTI'
										? `Elle est partie${courrier.partiLe === undefined ? '' : ` le ${dateCourte(courrier.partiLe)}`}.`
										: `Voici ce que j’ai préparé le ${dateCourte(courrier.prepareLe)}. Elle part si vous la validez.`
						}
					>
						<CarteDeCourrier
							titre={courrier.titre}
							sousTitre={`Pour ${courrier.destinataire} · ${CANAL_DU_COURRIER[courrier.canal]}`}
							resume={courrier.resume}
							corps={courrier.corps}
						/>
						{courrier.etat === 'A_VALIDER' && !courriers.peutValider ? (
							<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
								Un administrateur de votre entreprise doit la valider.
							</p>
						) : null}
					</ReponseDePlume>
				);
			case 'CONFIRMER':
				return (
					<ReponseDePlume
						texte={
							decision === 'RETENIR'
								? `Si je la retiens, elle ne part pas, et je ne relance plus ${d.client} : vous le gardez en main. Vous me le rendez depuis sa fiche.`
								: 'Je l’abandonne ? Elle reste dans l’historique, et rien ne part.'
						}
					/>
				);
			case 'VALIDATION':
				return validation.fini ? (
					<ReponseDePlume texte="Validée : son texte est figé, tel que vous l’avez lu." />
				) : (
					<TravailDePlume etapes={validation.etapes} />
				);
			case 'ENVOYER':
				return (
					<ReponseDePlume
						texte={
							courrier.canal === 'MESSAGERIE'
								? 'Elle part de votre messagerie : je l’ouvre, vous l’envoyez.'
								: courrier.canal === 'IMPRIMER_RECOMMANDE'
									? 'Imprimez-la, signez-la, et envoyez-la en recommandé avec avis de réception.'
									: 'Imprimez-la en deux exemplaires, à signer par vous et par votre client.'
						}
					>
						{/* Validée avant d'arriver ici : on voit de quoi l'on parle avant de l'envoyer. */}
						{depuisValide ? (
							<CarteDeCourrier
								titre={courrier.titre}
								sousTitre={`Pour ${courrier.destinataire}${courrier.valideLe === undefined ? '' : ` · validée le ${dateCourte(courrier.valideLe)}`}`}
								resume={courrier.resume}
								corps={courrier.corps}
							/>
						) : null}
					</ReponseDePlume>
				);
			case 'QUAND':
				return (
					<ReponseDePlume texte="Elle est partie quel jour ? C’est cette date qui compte, pas celle d’aujourd’hui." />
				);
			case 'RAPPEL':
				return (
					<ReponseDePlume texte="Je vous remets le dossier sous les yeux le jour où son délai expire ? Rien ne partira ce jour-là." />
				);
			default:
				return null;
		}
	}

	function reponse(cle: Etape): string | undefined {
		switch (cle) {
			case 'LIRE':
				return decision === 'RETENIR'
					? 'La retenir'
					: decision === 'ABANDONNER'
						? 'L’abandonner'
						: 'La valider';
			case 'CONFIRMER':
				return decision === 'RETENIR' ? 'La retenir' : 'L’abandonner';
			case 'VALIDATION':
				return undefined;
			case 'ENVOYER':
				return envoye === 'PDF' ? 'PDF téléchargé' : 'Ouverte dans ma messagerie';
			case 'QUAND':
				return partiLe === d.aujourdHui ? 'Aujourd’hui' : `Le ${dateCourte(partiLe)}`;
			case 'RAPPEL':
				return avecRappel ? 'Oui' : 'Non';
			default:
				return undefined;
		}
	}

	function zone(): ReactNode {
		if (courrier === null) return undefined;
		switch (affichee) {
			case 'LIRE':
				if (programme) {
					return (
						<RangeeDeReponses>
							<BoutonDeReponse
								libelle="La retenir"
								onClick={() => {
									setDecision('RETENIR');
									setEtape('CONFIRMER');
								}}
							/>
							<BoutonDeReponse principal libelle="La laisser partir" onClick={onFermer} />
						</RangeeDeReponses>
					);
				}
				if (courrier.etat === 'PARTI' || courrier.etat === 'ABANDONNE') {
					return <BoutonDeReponse principal libelle="Revenir au dossier" onClick={onFermer} />;
				}
				return (
					<>
						{courrier.etat === 'A_VALIDER' && courriers.peutValider ? (
							<BoutonDeReponse principal libelle="La valider" onClick={valider} />
						) : null}
						<RangeeDeReponses>
							<BoutonDeReponse
								libelle="L’abandonner"
								onClick={() => {
									setDecision('ABANDONNER');
									setEtape('CONFIRMER');
								}}
							/>
							<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						</RangeeDeReponses>
					</>
				);
			case 'CONFIRMER':
				return (
					<BoutonDeReponse
						principal
						libelle={decision === 'RETENIR' ? 'La retenir' : 'L’abandonner'}
						onClick={conclure}
					/>
				);
			case 'VALIDATION':
				return undefined;
			case 'ENVOYER':
				return courrier.canal === 'MESSAGERIE' ? (
					<>
						<BoutonDeReponse
							principal
							libelle="Ouvrir dans ma messagerie"
							onClick={() => {
								window.open(mailto, '_self');
								setEnvoye('MESSAGERIE');
								setEtape('QUAND');
							}}
						/>
						<BoutonDeReponse
							libelle="Copier le texte"
							onClick={() => {
								void navigator.clipboard.writeText(courrier.corps).catch(() => undefined);
								setEnvoye('MESSAGERIE');
								setEtape('QUAND');
							}}
						/>
					</>
				) : (
					<>
						<BoutonDeReponse
							principal
							libelle="Télécharger le PDF"
							onClick={() => {
								courriers.onTelechargerPdf(courrier);
								setEnvoye('PDF');
								setEtape('QUAND');
							}}
						/>
						{courrier.annexeDisponible ? (
							<BoutonDeReponse
								libelle="Télécharger le calcul joint"
								onClick={() => courriers.onTelechargerAnnexe(courrier)}
							/>
						) : null}
					</>
				);
			case 'QUAND':
				return (
					<>
						<ChoixDeDate
							propositions={[
								{ libelle: 'Aujourd’hui', date: d.aujourdHui },
								{ libelle: 'Hier', date: jourDecale(d.aujourdHui, -1) }
							]}
							valeur={partiLe}
							onChange={setPartiLe}
							min={courrier.valideLe ?? courrier.prepareLe}
						/>
						<RangeeDeReponses>
							<BoutonDeReponse libelle="Pas encore partie" onClick={onFermer} />
							<BoutonDeReponse
								principal
								desactive={partiLe === '' || partiLe > d.aujourdHui}
								libelle="Valider"
								onClick={() => (relanceOfficielle ? setEtape('RAPPEL') : conclure())}
							/>
						</RangeeDeReponses>
					</>
				);
			case 'RAPPEL':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse
							libelle="Non"
							onClick={() => {
								setAvecRappel(false);
								conclureAvec(false);
							}}
						/>
						<BoutonDeReponse
							principal
							libelle="Oui"
							onClick={() => {
								setAvecRappel(true);
								conclureAvec(true);
							}}
						/>
					</RangeeDeReponses>
				);
			case 'FIN':
				return fin.fini ? (
					<>
						{suivant === undefined ? null : (
							<BoutonDeReponse
								principal
								libelle="Relire le courrier suivant"
								onClick={() => onRelire(suivant.id)}
							/>
						)}
						<BoutonDeReponse
							principal={suivant === undefined}
							libelle="Revenir au dossier"
							onClick={onFermer}
						/>
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</>
				) : undefined;
		}
	}

	/** Le rappel se choisit, puis le départ se note aussitôt : la réponse EST le geste. */
	function conclureAvec(rappel: boolean) {
		setEtape('FIN');
		const cible = courrier?.id ?? '';
		fin.lancer(async () => {
			await gestes.declarerParti(cible, partiLe, rappel);
			return null;
		});
	}

	function conclusion(): { titre: string; sousTitre: string } {
		if (decision === 'RETENIR') {
			return {
				titre: 'Retenue. Elle ne partira pas.',
				sousTitre: `Vous gardez ${d.client} en main ; vous me le rendez depuis sa fiche.`
			};
		}
		if (decision === 'ABANDONNER') {
			return { titre: 'Abandonnée. Rien n’est parti.', sousTitre: 'Elle reste dans l’historique.' };
		}
		return {
			titre: `C’est noté : partie ${partiLe === d.aujourdHui ? 'aujourd’hui' : `le ${dateCourte(partiLe)}`}.`,
			sousTitre:
				relanceOfficielle && avecRappel
					? 'Le jour où son délai expire, je vous remets le dossier sous les yeux.'
					: `${NOM_DU_PILOTE} suit la suite du dossier.`
		};
	}

	const fini = fin.fini;
	const mot = conclusion();

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			suivi={`${affichee}-${validation.tic}-${validation.fini}-${fin.tic}-${fin.fini}-${courrier.etat}`}
			reponses={zone()}
		>
			{prelude(verrouille)}
			{passees.map((cle) => {
				const texte = reponse(cle);
				return (
					<Echange
						key={cle}
						question={question(cle)}
						{...(texte === undefined ? {} : { reponse: texte })}
						{...(verrouille || cle === 'VALIDATION' || cle === 'LIRE' || cle === 'ENVOYER'
							? {}
							: { onModifier: () => setEtape(cle) })}
					/>
				);
			})}
			{affichee === 'FIN' ? null : question(affichee)}
			<RefusDuGeste erreur={validation.erreur ?? fin.erreur} />
			{affichee === 'FIN' && !fini ? <TravailDePlume etapes={fin.etapes} /> : null}
			{fini ? (
				<AccueilDePlume
					humeur={decision === 'VALIDER' || decision === null ? 'content' : 'repos'}
					titre={mot.titre}
					sousTitre={mot.sousTitre}
				/>
			) : null}
		</CadreGuide>
	);
}
