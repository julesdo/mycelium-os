import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { messageDeRefus, televerser } from '../../app/televerser';
import { useProfessionnelsProposes } from '../../app/use-professionnels';
import type {
	AvocatAffiche,
	EtatRechercheAvocat,
	EtatRechercheCommissaire,
	EtudeAffichee,
	FicheASaisir
} from '../../ui';
import { EcranDefense, type ClientDeLaDefense } from '../../screens/defense';

export const Route = createFileRoute('/app/defense')({
	component: PageDefense,
	errorComponent: DefenseEnErreur
});

function DefenseEnErreur() {
	return <EcranDefense donnees={{ etat: 'erreur' }} />;
}

/**
 * `/app/defense` — l'équipe du gérant, les professionnels près de ses clients, et
 * la recherche de quelqu'un d'autre. Voir `screens/defense.tsx`.
 *
 * ⚠️ LE CARNET ET SES DEUX RECHERCHES VIVAIENT DANS `/app/compte` jusqu'au
 * 08/10/2026 : ils ont déménagé ici avec l'écran, sans changer de règles. Une fiche
 * venue d'un répertoire porte sa source et sa date de relevé, et la mutation la
 * refuse sans elles ; une fiche tapée à la main est `SAISI_A_LA_MAIN` par
 * construction.
 */
function PageDefense() {
	const carnet = useQuery(api.recouvrement.intervenants.monCarnet, {});
	const dossiers = useQuery(api.recouvrement.lecture.indexDossiers, {});
	const ajouterIntervenant = useMutation(api.recouvrement.intervenants.ajouterIntervenant);
	const oublierIntervenant = useMutation(api.recouvrement.intervenants.oublierIntervenant);
	const genererUrlPhoto = useMutation(api.recouvrement.intervenants.genererUrlPhoto);
	const poserPhoto = useMutation(api.recouvrement.intervenants.poserPhoto);
	const chercherUnCommissaire = useAction(
		api.recouvrement.annuaires.chercherUnCommissaireDeJustice
	);

	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);
	const [clientOuvert, setClientOuvert] = useState<Id<'debiteurs'> | null>(null);
	const pres = useProfessionnelsProposes(clientOuvert ?? undefined, carnet);

	const [rechercheCommissaireOuverte, setRechercheCommissaireOuverte] = useState(false);
	const [etatRechercheCommissaire, setEtatRechercheCommissaire] =
		useState<EtatRechercheCommissaire>({ phase: 'REPOS' });
	const [rechercheAvocatOuverte, setRechercheAvocatOuverte] = useState(false);
	const [barreau, setBarreau] = useState('');
	const [specialite, setSpecialite] = useState('');

	/*
	  ⚠️ LES DEUX LECTURES DU RÉPERTOIRE SONT SAUTÉES TANT QUE LA FEUILLE EST
	  FERMÉE. Le parcours des barreaux lit un document par barreau, et la recherche
	  jusqu'à quatre mille fiches : les faire tourner à l'ouverture de l'écran
	  ferait payer un répertoire que personne n'a demandé.
	*/
	const repertoire = useQuery(
		api.recouvrement.annuaires.barreauxDuRepertoire,
		rechercheAvocatOuverte ? {} : 'skip'
	);
	const avocats = useQuery(
		api.recouvrement.annuaires.chercherUnAvocat,
		rechercheAvocatOuverte && barreau !== ''
			? { barreau, specialite: specialite === '' ? undefined : specialite }
			: 'skip'
	);
	const etatAvocats: EtatRechercheAvocat =
		barreau === ''
			? { phase: 'AUCUN_BARREAU' }
			: avocats === undefined
				? { phase: 'EN_COURS' }
				: { phase: 'TROUVE', resultat: avocats };

	/** Un geste : l'état d'envoi pendant, le refus lisible après. */
	async function geste(action: () => Promise<unknown>): Promise<boolean> {
		setEnCours(true);
		setErreur(null);
		try {
			await action();
			return true;
		} catch (e) {
			setErreur(messageDeRefus(e));
			return false;
		} finally {
			setEnCours(false);
		}
	}

	async function chercherUneEtude(departement: string) {
		setEtatRechercheCommissaire({ phase: 'EN_COURS' });
		try {
			setEtatRechercheCommissaire({
				phase: 'TROUVE',
				resultat: await chercherUnCommissaire({ departement })
			});
		} catch (e) {
			// ⚠️ UN ÉCHEC NE DEVIENT JAMAIS UNE LISTE VIDE : « aucune étude » et « le
			// registre n'a pas répondu » mènent à deux gestes opposés.
			setEtatRechercheCommissaire({ phase: 'ECHEC', message: messageDeRefus(e) });
		}
	}

	function retenirUneEtude(etude: EtudeAffichee) {
		if (etatRechercheCommissaire.phase !== 'TROUVE') return;
		const { resultat } = etatRechercheCommissaire;
		void geste(() =>
			ajouterIntervenant({
				nom: etude.nom,
				role: 'COMMISSAIRE_DE_JUSTICE',
				ressort: `${etude.commune} ${etude.codePostal}`.trim(),
				adresse: etude.adresse,
				siren: etude.siren,
				origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
				sourceRepertoire: resultat.source,
				sourceReleveeLe: resultat.releveeLe
			})
		).then((fait) => {
			if (fait) setRechercheCommissaireOuverte(false);
		});
	}

	/**
	 * ⚠️ SANS DATE DE RELEVÉ, ON NE RETIENT PAS — et on le dit. Dater du jour pour
	 * faire passer la mutation présenterait la fiche comme relevée aujourd'hui.
	 * Et le ressort est le BARREAU, tel que le fichier l'écrit.
	 */
	function retenirUnAvocat(avocat: AvocatAffiche) {
		if (etatAvocats.phase !== 'TROUVE') return;
		const { resultat } = etatAvocats;
		if (resultat.releveeLe === null) {
			setErreur(
				'Ce répertoire ne porte pas de date de relevé : la fiche ne peut pas être retenue, ' +
					'faute de pouvoir dire de quand elle date.'
			);
			return;
		}
		const releveeLe = resultat.releveeLe;
		void geste(() =>
			ajouterIntervenant({
				nom: `${avocat.prenom} ${avocat.nom}`.trim(),
				role: 'AVOCAT',
				ressort: resultat.barreau,
				adresse: avocat.adresse,
				siren: avocat.siren,
				origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
				sourceRepertoire: resultat.source,
				sourceReleveeLe: releveeLe
			})
		).then((fait) => {
			if (fait) setRechercheAvocatOuverte(false);
		});
	}

	if (carnet === undefined || dossiers === undefined) {
		return <EcranDefense donnees={{ etat: 'attente' }} />;
	}

	// Les clients qui ont un dossier en cours, une fois chacun, dans l'ordre alphabétique.
	const parClient = new Map<string, { nom: string; dossiers: number }>();
	for (const dossier of dossiers) {
		if (dossier.etape === 'REGLE') continue;
		const deja = parClient.get(dossier.debiteurId);
		parClient.set(dossier.debiteurId, {
			nom: dossier.debiteur,
			dossiers: (deja?.dossiers ?? 0) + 1
		});
	}
	const clients: ClientDeLaDefense[] = [...parClient.entries()]
		.map(([id, { nom, dossiers: n }]) => ({
			id,
			nom,
			ligne: `${n} dossier${n > 1 ? 's' : ''} en cours`
		}))
		.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
	const clientNom = clientOuvert === null ? null : (parClient.get(clientOuvert)?.nom ?? null);

	return (
		<EcranDefense
			donnees={{
				etat: 'pret',
				valeur: {
					equipe: carnet,
					erreur: erreur ?? pres.erreur,
					enCours: enCours || pres.enCours,
					onAjouterALaMain: (fiche: FicheASaisir) =>
						void geste(() =>
							ajouterIntervenant({
								nom: fiche.nom,
								role: fiche.role,
								ressort: fiche.ressort,
								origine: 'SAISI_A_LA_MAIN'
							})
						),
					onOublier: (id) =>
						void geste(() => oublierIntervenant({ intervenantId: id as Id<'intervenants'> })),
					onPhoto: (id, fichier) =>
						void geste(async () => {
							const storageId = await televerser(() => genererUrlPhoto({}), fichier);
							await poserPhoto({ intervenantId: id as Id<'intervenants'>, storageId });
						}),

					clients,
					presDuClient:
						clientNom === null ? null : { client: clientNom, propositions: pres.propositions },
					onOuvrirClient: (id) => {
						const debiteurId = id as Id<'debiteurs'>;
						setClientOuvert(debiteurId);
						pres.demanderPour(debiteurId);
					},
					onFermerClient: () => setClientOuvert(null),
					onAjouterEtude: (etude) => void pres.onRetenirEtude(etude),
					onAjouterAvocat: (avocat) => void pres.onRetenirAvocat(avocat),

					rechercheCommissaireOuverte,
					etatRechercheCommissaire,
					onOuvrirRechercheCommissaire: () => setRechercheCommissaireOuverte(true),
					onFermerRechercheCommissaire: () => setRechercheCommissaireOuverte(false),
					onChercherCommissaire: (departement) => void chercherUneEtude(departement),
					onRetenirEtude: retenirUneEtude,
					rechercheAvocatOuverte,
					repertoire: repertoire ?? null,
					barreau,
					specialite,
					etatAvocats,
					onOuvrirRechercheAvocat: () => setRechercheAvocatOuverte(true),
					onFermerRechercheAvocat: () => setRechercheAvocatOuverte(false),
					onChoisirBarreau: (choisi) => {
						setBarreau(choisi);
						setSpecialite('');
					},
					onChoisirSpecialite: (choisie) => setSpecialite(choisie),
					onRetenirAvocat: retenirUnAvocat
				}
			}}
		/>
	);
}
