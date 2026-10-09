import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranConversationPilote, type MessageAffiche } from '../../screens/conversation-pilote';
import {
	BoutonTexte,
	CarteBouton,
	LigneDeReleve,
	ListeDeCartes,
	ListeDeReleve,
	NOM_DU_PILOTE,
	aujourdHuiISO,
	dateCourte,
	eurosCentimes,
	pluriel,
	type EtapeDeTravail,
	type HumeurPlume
} from '../../ui';

/**
 * `/app/pilote` — LA CONVERSATION DE PLUME, hors de tout dossier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE MONTRE AVANT QU'ON PARLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Plume dit d'abord ce qu'il fait et ce qu'il a fait : son travail en cours,
 * étape par étape ; ses trois derniers travaux ; les relances qui partent
 * bientôt, chacune avec « Retenir ». C'est le relevé d'un collaborateur qu'on
 * croise : on sait où il en est sans rien lui demander.
 *
 * ⚠️ UNE QUESTION MÈNE AU DOSSIER DONT ELLE PARLE. La conversation est bornée à
 * un dossier côté serveur, pour que chaque phrase porte SA source. Ici, Plume
 * cherche le client nommé dans la question ; s'il le trouve, la question part
 * dans la conversation de ce dossier. Sinon, il demande lequel, en montrant les
 * dossiers ouverts — sans appel au modèle, donc sans coût.
 */
export const Route = createFileRoute('/app/pilote/')({
	component: ConversationDePlume
});

/** Les mots qui ne désignent aucun client : on ne choisit pas un dossier sur « SARL ». */
const MOTS_VIDES = new Set([
	'sarl',
	'sas',
	'sasu',
	'eurl',
	'societe',
	'entreprise',
	'entreprises',
	'groupe',
	'france',
	'services',
	'service',
	'ets',
	'etablissements',
	'cabinet',
	'atelier',
	'ateliers'
]);

function normaliser(texte: string): string {
	return texte
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

function motsDe(texte: string): string[] {
	return normaliser(texte)
		.split(/[^a-z0-9]+/)
		.filter((mot) => mot.length >= 3);
}

/** Les dossiers dont la question nomme le client. */
function dossiersNommes<T extends { readonly debiteur: string }>(
	question: string,
	dossiers: readonly T[]
): T[] {
	const motsDeLaQuestion = new Set(motsDe(question));
	return dossiers.filter((dossier) =>
		motsDe(dossier.debiteur).some((mot) => !MOTS_VIDES.has(mot) && motsDeLaQuestion.has(mot))
	);
}

const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const DEPART = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'long',
	hour: '2-digit',
	minute: '2-digit'
});

type MessageLocal =
	| { readonly genre: 'GERANT'; readonly id: string; readonly texte: string }
	| {
			readonly genre: 'CHOIX';
			readonly id: string;
			readonly question: string;
			readonly plusieurs: boolean;
			readonly candidats: readonly Id<'creances'>[];
	  };

function ConversationDePlume() {
	const navigate = useNavigate();
	const pilote = useQuery(api.recouvrement.pilote.etat, {});
	const creances = useQuery(api.recouvrement.lecture.listerCreances, {});
	const retenir = useMutation(api.recouvrement.pilote.retenir);
	const [question, setQuestion] = useState('');
	const [locaux, setLocaux] = useState<readonly MessageLocal[]>([]);
	const aujourdHui = aujourdHuiISO();

	const ouverts = (creances ?? [])
		.filter((c) => c.statut !== 'CLOSE')
		.sort((a, b) => Number(b.principalRestantDu - a.principalRestantDu));

	function ouvrirDossier(creanceId: Id<'creances'>, texte: string) {
		void navigate({ to: '/app/pilote/$id', params: { id: creanceId }, search: { envoyer: texte } });
	}

	function envoyer() {
		const texte = question.trim();
		if (texte === '') return;
		setQuestion('');
		const nommes = dossiersNommes(texte, ouverts);
		if (nommes.length === 1 && nommes[0] !== undefined) {
			ouvrirDossier(nommes[0]._id, texte);
			return;
		}
		const n = locaux.length;
		setLocaux([
			...locaux,
			{ genre: 'GERANT', id: `g-${n}`, texte },
			{
				genre: 'CHOIX',
				id: `c-${n}`,
				question: texte,
				plusieurs: nommes.length > 1,
				candidats: (nommes.length > 1 ? nommes : ouverts).slice(0, 6).map((c) => c._id)
			}
		]);
	}

	const travaux = pilote?.travaux ?? [];
	const enCours = travaux.find((t) => t.etat === 'EN_COURS') ?? null;
	const faits = travaux.filter((t) => t.etat === 'FAIT' || t.etat === 'ECHEC').slice(0, 3);
	const humeur: HumeurPlume =
		enCours !== null
			? 'travaille'
			: faits[0]?.etat === 'ECHEC' || (pilote?.aDemarrer ?? 0) > 0
				? 'attention'
				: 'repos';

	/* ── Le relevé de Plume, avant toute question ─────────────────────────── */
	const preambule: MessageAffiche[] = [];
	if (pilote !== undefined && enCours === null && faits.length === 0) {
		preambule.push({
			genre: 'PLUME',
			id: 'rien',
			texte:
				'Je n’ai encore rien eu à faire ici. Déposez vos factures depuis l’accueil : je les relis dès qu’elles arrivent, et j’ouvre le dossier de chaque client en retard.'
		});
	}
	if (faits.length > 0) {
		preambule.push({
			genre: 'PLUME',
			id: 'faits',
			texte: 'Ce que j’ai fait dernièrement :',
			suite: (
				<ListeDeReleve>
					{faits.map((travail) => (
						<LigneDeReleve
							key={travail.id}
							titre={travail.titre}
							ligne={
								travail.etat === 'ECHEC'
									? 'Interrompu. Je reprendrai à ma prochaine relecture.'
									: (travail.bilan ?? 'Terminé.')
							}
							{...(travail.termineLe === null
								? {}
								: {
										date:
											new Date(travail.termineLe).toISOString().slice(0, 10) === aujourdHui
												? HEURE.format(new Date(travail.termineLe))
												: dateCourte(new Date(travail.termineLe).toISOString().slice(0, 10))
									})}
						/>
					))}
				</ListeDeReleve>
			)
		});
	}
	const aDemarrer = pilote?.aDemarrer ?? 0;
	if (aDemarrer > 0) {
		preambule.push({
			genre: 'PLUME',
			id: 'a-demarrer',
			humeur: 'attention',
			texte: `J’ai préparé ${aDemarrer} dossier${pluriel(aDemarrer)} de clients en retard. Je ne relance rien tant que vous ne ${aDemarrer > 1 ? 'les avez' : 'l’avez'} pas démarré${pluriel(aDemarrer)}.`,
			suite: (
				<ListeDeCartes>
					<CarteBouton
						titre={aDemarrer > 1 ? `Démarrer les ${aDemarrer} dossiers` : 'Démarrer le dossier'}
						ligne="Tout est prêt : vous décochez ceux que vous gardez en main"
						onClick={() => void navigate({ to: '/app/demarrer' })}
					/>
				</ListeDeCartes>
			)
		});
	}
	const programmes = pilote?.programmes ?? [];
	if (programmes.length > 0) {
		preambule.push({
			genre: 'PLUME',
			id: 'programmes',
			texte: `Je relance bientôt ${programmes.length === 1 ? 'un client' : `${programmes.length} clients`}, à votre nom. Vous pouvez encore retenir chaque envoi.`,
			suite: (
				<ListeDeReleve>
					{programmes.slice(0, 5).map((relance) => (
						<div key={relance.envoiId} className="flex items-center gap-2 pr-2">
							<div className="min-w-0 flex-1">
								<LigneDeReleve
									titre={relance.client}
									ligne={`${relance.etape} · ${DEPART.format(new Date(relance.partiraLe))}`}
								/>
							</div>
							<BoutonTexte onClick={() => void retenir({ envoiId: relance.envoiId })}>
								Retenir
							</BoutonTexte>
						</div>
					))}
				</ListeDeReleve>
			)
		});
	}

	/* ── Ce que le gérant a dit ici, et ce que Plume y répond ─────────────── */
	const messages: MessageAffiche[] = locaux.map((message): MessageAffiche => {
		if (message.genre === 'GERANT') return message;
		const candidats = message.candidats
			.map((id) => ouverts.find((c) => c._id === id))
			.filter((c): c is (typeof ouverts)[number] => c !== undefined);
		return {
			genre: 'PLUME',
			id: message.id,
			humeur: 'ecoute',
			texte:
				candidats.length === 0
					? 'Je n’ai encore aucun dossier ouvert. Dès qu’une facture passe son échéance, j’ouvre le dossier de son client, et nous pourrons en parler.'
					: message.plusieurs
						? 'Plusieurs clients correspondent. Duquel parlez-vous ?'
						: 'De quel client parlez-vous ? Je réponds dossier par dossier, pour que chaque phrase porte sa source.',
			suite:
				candidats.length === 0 ? undefined : (
					<ListeDeCartes>
						{candidats.map((dossier) => (
							<CarteBouton
								key={dossier._id}
								titre={dossier.debiteur}
								ligne={`${dossier.nombreFactures} facture${pluriel(dossier.nombreFactures)}`}
								montant={eurosCentimes(dossier.principalRestantDu)}
								onClick={() => ouvrirDossier(dossier._id, message.question)}
							/>
						))}
					</ListeDeCartes>
				)
		};
	});

	const travail: EtapeDeTravail[] | null =
		enCours === null
			? null
			: enCours.etapes.map((etape, i) => {
					const rang = enCours.etapes.findIndex((e) => !e.faite);
					return {
						libelle: etape.libelle,
						etat: etape.faite ? 'faite' : i === rang ? 'courante' : 'avenir'
					};
				});

	return (
		<EcranConversationPilote
			fil={{
				titre: NOM_DU_PILOTE,
				sousTitre: enCours !== null ? 'Au travail' : 'Votre pilote',
				retour: { vers: '/app', libelle: 'Aujourd’hui' },
				humeur,
				accueil: {
					titre:
						ouverts.length === 0
							? 'Je veille sur vos factures.'
							: `Je veille sur ${ouverts.length} dossier${pluriel(ouverts.length)}.`,
					sousTitre: (
						<>
							{enCours !== null
								? 'Je suis au travail en ce moment. '
								: pilote?.derniereVeille === null || pilote === undefined
									? ''
									: `J’ai tout relu à ${HEURE.format(new Date(pilote.derniereVeille))}. `}
							Dites-moi de quel client vous voulez parler.
						</>
					)
				},
				preambule,
				messages,
				travail: locaux.length === 0 ? travail : null,
				...(enCours === null || locaux.length > 0 ? {} : { titreDuTravail: enCours.titre }),
				refus: null,
				panne: null,
				avertissement: null,
				suggestions: ouverts.slice(0, 3).map((c) => `Où en est ${c.debiteur} ?`),
				question,
				onQuestion: setQuestion,
				onEnvoyer: envoyer,
				enCours: false,
				placeholder: `Demander à ${NOM_DU_PILOTE}…`,
				arretee: false
			}}
		/>
	);
}
