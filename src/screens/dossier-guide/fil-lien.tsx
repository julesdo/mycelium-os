import { useState, type ReactNode } from 'react';
import {
	adresseMessagerie,
	tientDansLaMessagerie
} from '../../lib/verticales/recouvrement/messagerie';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CadreGuide,
	CarteDeCourrier,
	Echange,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	courrielDuLien,
	dateCourte,
	eurosCentimes,
	useTravail,
	type LiensDePaiementAffiches
} from '../../ui';
import { RefusDuGeste, type PropsDuFil } from './commun';

/**
 * « LUI ENVOYER DE QUOI PAYER » — LA PAGE DE PAIEMENT, OUVERTE ET ENVOYÉE DANS LE FIL
 * (23/10/2026).
 *
 * C'était un bloc au fond de « Pénalités et frais » : il fallait savoir qu'une page
 * de paiement existait, et qu'elle s'ouvrait sous le montant. C'est désormais une
 * conversation : Plume dit ce que la page contient, l'ouvre sur le montant du jour
 * (daté, comme tout document qui réclame un chiffre), puis l'e-mail qui la porte
 * s'ouvre dans la messagerie du gérant.
 *
 * ⚠️ AUCUN FONDS NE PASSE PAR ICI (ligne rouge n° 2). La page montre l'IBAN du
 * créancier et le montant ; le client valide le virement dans SA banque. Et rien ne
 * part d'ici (ligne rouge n° 1) : l'e-mail s'ouvre chez le gérant, qui l'envoie.
 */

type Etape = 'OUVRIR' | 'TRAVAIL' | 'ENVOYER' | 'FIN';

export function FilLien({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	paiement,
	debiteurEmail
}: PropsDuFil & {
	readonly paiement: Pick<LiensDePaiementAffiches, 'liens' | 'adresseDe' | 'courriel'>;
	readonly debiteurEmail?: string;
}) {
	/* Une page ouverte aujourd'hui resert : elle porte déjà le montant du jour. */
	const duJour = paiement.liens.find(
		(l) => l.revoqueLe === undefined && l.arreteAu === d.aujourdHui
	);
	const [etape, setEtape] = useState<Etape>(() => (duJour === undefined ? 'OUVRIR' : 'ENVOYER'));
	const [envoi, setEnvoi] = useState<'MESSAGERIE' | 'COPIE' | null>(null);
	const travail = useTravail<string>([
		'Je date le montant au jour d’aujourd’hui',
		'J’ouvre sa page, à votre nom, avec votre IBAN',
		'Je prépare l’e-mail qui la porte'
	]);
	const jeton = duJour?.jeton ?? travail.resultat;
	const lien = paiement.liens.find((l) => l.jeton === jeton) ?? null;
	const affichee: Etape =
		etape === 'TRAVAIL' && travail.fini
			? 'ENVOYER'
			: etape === 'TRAVAIL' && travail.erreur !== null
				? 'OUVRIR'
				: etape;

	const adresse = jeton === null ? null : paiement.adresseDe(jeton);
	const courriel =
		lien === null || adresse === null
			? null
			: courrielDuLien(lien, adresse, paiement.courriel?.signature);
	const messagerie =
		courriel === null
			? null
			: adresseMessagerie({
					destinataire: debiteurEmail ?? paiement.courriel?.destinataire,
					objet: courriel.objet,
					corps: courriel.corps
				});
	const ouvrable =
		messagerie !== null &&
		!messagerie.sansDestinataire &&
		tientDansLaMessagerie(messagerie.longueur);

	function ouvrir() {
		setEtape('TRAVAIL');
		travail.lancer(() => gestes.ouvrirLienDePaiement());
	}

	const questionOuvrir = (
		<ReponseDePlume texte="J’ouvre une page où il vous règle par virement : le montant du jour, daté, le détail facture par facture et votre IBAN. Elle est à votre nom ; il valide le virement dans sa banque." />
	);
	const questionEnvoyer =
		courriel === null ? (
			<ReponseDePlume texte="Sa page est ouverte. Je prépare l’e-mail qui la porte…" />
		) : (
			<ReponseDePlume
				texte={
					duJour !== undefined && etape === 'ENVOYER' && envoi === null
						? `Sa page de paiement est déjà ouverte aujourd’hui, avec ${eurosCentimes(duJour.total)}. Voici l’e-mail qui la porte, à votre nom :`
						: 'Voici l’e-mail qui la porte, à votre nom :'
				}
			>
				<CarteDeCourrier
					titre={courriel.objet}
					sousTitre={
						debiteurEmail === undefined && paiement.courriel?.destinataire === undefined
							? 'Son adresse e-mail n’est pas renseignée'
							: `Pour ${debiteurEmail ?? paiement.courriel?.destinataire ?? ''}`
					}
					corps={courriel.corps}
					ouvertAuDepart
				/>
			</ReponseDePlume>
		);

	function zone(): ReactNode {
		switch (affichee) {
			case 'OUVRIR':
				return <BoutonDeReponse principal libelle="Ouvrir sa page" onClick={ouvrir} />;
			case 'ENVOYER':
				return courriel === null || adresse === null ? undefined : (
					<>
						{ouvrable && messagerie !== null ? (
							<BoutonDeReponse
								principal
								libelle="Ouvrir dans ma messagerie"
								onClick={() => {
									window.open(messagerie.url, '_self');
									setEnvoi('MESSAGERIE');
									setEtape('FIN');
								}}
							/>
						) : null}
						<BoutonDeReponse
							libelle="Copier le lien"
							onClick={() => {
								void navigator.clipboard.writeText(adresse).catch(() => undefined);
								setEnvoi('COPIE');
								setEtape('FIN');
							}}
						/>
					</>
				);
			case 'FIN':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				);
			default:
				return undefined;
		}
	}

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			suivi={`${affichee}-${travail.tic}-${String(travail.fini)}-${lien === null ? 'sans' : 'avec'}`}
			reponses={zone()}
		>
			{prelude(travail.lance)}
			{duJour === undefined ? (
				affichee === 'OUVRIR' ? (
					questionOuvrir
				) : (
					<Echange question={questionOuvrir} reponse="Ouvrir sa page" />
				)
			) : null}
			<RefusDuGeste erreur={travail.erreur} />
			{etape === 'TRAVAIL' && !travail.fini ? <TravailDePlume etapes={travail.etapes} /> : null}
			{affichee === 'ENVOYER' ? questionEnvoyer : null}
			{affichee === 'FIN' ? (
				<>
					<Echange
						question={questionEnvoyer}
						reponse={envoi === 'COPIE' ? 'Lien copié' : 'Ouvert dans ma messagerie'}
					/>
					<AccueilDePlume
						humeur="content"
						titre={
							lien === null
								? 'Sa page est ouverte.'
								: `Sa page est ouverte : ${eurosCentimes(lien.total)} au ${dateCourte(lien.arreteAu)}.`
						}
						sousTitre="Dès que son virement arrive, je le rapproche de ses factures."
					/>
				</>
			) : null}
		</CadreGuide>
	);
}
