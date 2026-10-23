import { useState, type ReactNode } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CANAL_DU_COURRIER,
	CadreGuide,
	CarteDeCourrier,
	Echange,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	dateCourte,
	useTravail,
	type EnvoiAffiche
} from '../../ui';
import { RefusDuGeste, type PropsDuFil } from './commun';
import type { LettresDuGuide } from './fil-ecrire';
import { useEnvoi } from './sous-parcours';

/**
 * « RELIRE LE COURRIER » — LE LIRE, LE VALIDER, L'ENVOYER, DIRE QU'IL EST PARTI
 * (22/10/2026, raccourci le 23/10/2026).
 *
 * C'était une carte de six boutons dans « Courriers et e-mails » : « Lire le texte »,
 * « Valider ce courrier », « Abandonner », puis « Télécharger le PDF », « Ouvrir dans
 * ma messagerie », « Copier le texte », une date et « Je l'ai envoyé ce jour-là ».
 * C'est désormais une conversation : Plume montre le courrier, demande s'il part,
 * dit comment l'envoyer et demande quand il est parti (`useEnvoi`, le même morceau
 * qu'après « Le relancer »).
 *
 * ⚠️ RIEN NE PART SANS LE GÉRANT (ligne rouge n° 1). Valider fige le texte ; c'est lui
 * qui l'envoie, depuis sa messagerie ou par la poste, et qui dit le jour du départ.
 * Une relance que Plume a programmée se laisse partir, ou se retient.
 */

type Decision = 'VALIDER' | 'ABANDONNER' | 'RETENIR';
type Etape = 'LIRE' | 'CONFIRMER' | 'VALIDATION' | 'ENVOI' | 'FIN';

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

	const [etape, setEtape] = useState<Etape>(() => (depuisValide ? 'ENVOI' : 'LIRE'));
	const [decision, setDecision] = useState<Decision | null>(null);
	const [aRelire, setARelire] = useState(false);

	const validation = useTravail<'VALIDE' | 'A_RELIRE'>([
		'Je fige son texte',
		'Je calcule son empreinte'
	]);
	const fin = useTravail<null>(
		decision === 'RETENIR'
			? ['Je la retiens : elle ne partira pas', 'Je sors ce client du pilote']
			: ['Je l’abandonne', 'Je la garde dans l’historique']
	);
	/* Validée : la conversation passe d'elle-même à l'envoi. */
	const validee = etape === 'VALIDATION' && validation.fini && validation.resultat === 'VALIDE';
	const envoiActif = etape === 'ENVOI' || validee;
	const envoiGuide = useEnvoi({
		courrier,
		actif: envoiActif,
		aujourdHui: d.aujourdHui,
		courriers,
		gestes,
		onPlusTard: onFermer
	});

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
	const verrouille = validation.lance || fin.lance || envoiGuide.lance;
	const suivant = courriers.envois.find((e) => e.etat === 'A_VALIDER' && e.id !== courrier.id);
	const carte = (
		<CarteDeCourrier
			titre={courrier.titre}
			sousTitre={`Pour ${courrier.destinataire} · ${CANAL_DU_COURRIER[courrier.canal]}${
				depuisValide && courrier.valideLe !== undefined
					? ` · validée le ${dateCourte(courrier.valideLe)}`
					: ''
			}`}
			resume={courrier.resume}
			corps={courrier.corps}
		/>
	);

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
			else await gestes.abandonnerCourrier(cible);
			return null;
		});
	}

	const lire = (
		<ReponseDePlume
			humeur={aRelire ? 'attention' : 'repos'}
			texte={
				aRelire
					? 'Le dossier a changé depuis la préparation : j’ai mis le texte à jour. Relisez-le, puis validez.'
					: programme
						? courrier.partiraLe === undefined
							? 'Je l’envoie très bientôt, par e-mail, à votre nom. Les réponses arrivent à votre adresse.'
							: `Je l’envoie ${DATE_ET_HEURE.format(new Date(courrier.partiraLe))}, par e-mail, à votre nom. Les réponses arrivent à votre adresse.`
						: courrier.etat === 'PARTI'
							? `Elle est partie${courrier.partiLe === undefined ? '' : ` le ${dateCourte(courrier.partiLe)}`}.`
							: `Voici ce que j’ai préparé le ${dateCourte(courrier.prepareLe)}. Elle part si vous la validez.`
			}
		>
			{carte}
			{courrier.etat === 'A_VALIDER' && !courriers.peutValider ? (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					Un administrateur de votre entreprise doit la valider.
				</p>
			) : null}
		</ReponseDePlume>
	);

	function zone(): ReactNode {
		if (courrier === null) return undefined;
		if (envoiActif) {
			if (!envoiGuide.fini) return envoiGuide.zone;
			return (
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
			);
		}
		switch (etape) {
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
			case 'FIN':
				return fin.fini ? (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				) : undefined;
			default:
				return undefined;
		}
	}

	const etapeLue = etape === 'LIRE' && !envoiActif;

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			suivi={`${etape}-${validation.tic}-${String(validation.fini)}-${fin.tic}-${String(fin.fini)}-${envoiGuide.suivi}`}
			reponses={zone()}
		>
			{prelude(verrouille)}
			{depuisValide ? (
				<ReponseDePlume texte="Elle est validée : son texte est figé.">{carte}</ReponseDePlume>
			) : etapeLue ? (
				lire
			) : (
				<Echange
					question={lire}
					reponse={
						decision === 'RETENIR'
							? 'La retenir'
							: decision === 'ABANDONNER'
								? 'L’abandonner'
								: 'La valider'
					}
				/>
			)}
			{etape === 'CONFIRMER' || etape === 'FIN' ? (
				<ReponseDePlume
					texte={
						decision === 'RETENIR'
							? `Si je la retiens, elle ne part pas, et je ne relance plus ${d.client} : vous le gardez en main. Vous me le rendez depuis sa fiche.`
							: 'Je l’abandonne ? Elle reste dans l’historique, et rien ne part.'
					}
				/>
			) : null}
			{etape === 'VALIDATION' && !validation.fini ? (
				<TravailDePlume etapes={validation.etapes} />
			) : null}
			{validee ? (
				<ReponseDePlume texte="Validée : son texte est figé, tel que vous l’avez lu." />
			) : null}
			{envoiGuide.fil}
			<RefusDuGeste erreur={validation.erreur ?? fin.erreur} />
			{etape === 'FIN' && !fin.fini ? <TravailDePlume etapes={fin.etapes} /> : null}
			{etape === 'FIN' && fin.fini ? (
				<AccueilDePlume
					humeur="repos"
					titre={
						decision === 'RETENIR'
							? 'Retenue. Elle ne partira pas.'
							: 'Abandonnée. Rien n’est parti.'
					}
					sousTitre={
						decision === 'RETENIR'
							? `Vous gardez ${d.client} en main ; vous me le rendez depuis sa fiche.`
							: 'Elle reste dans l’historique.'
					}
				/>
			) : null}
		</CadreGuide>
	);
}
