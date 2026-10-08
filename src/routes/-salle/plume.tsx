import { useState } from 'react';
import { AlarmClockIcon, HandCoinsIcon } from 'lucide-react';
import {
	AvatarPlume,
	CarteDeGeste,
	NOM_DU_PILOTE,
	PageEcran,
	Plume,
	type HumeurPlume
} from '../../ui';
import { EcranConversationPilote, type MessageAffiche } from '../../screens/conversation-pilote';
import type { EcranDuProduit, EtatDemo } from './demo';

/**
 * PLUME, DANS SES CINQ HUMEURS ET À SES TROIS TAILLES.
 *
 * La salle seule les montre côte à côte : en production, une humeur suit l'état
 * réel du pilote, et on n'en voit qu'une à la fois.
 */
const HUMEURS: readonly HumeurPlume[] = ['repos', 'travaille', 'content', 'attention', 'ecoute'];

function DemoPlume() {
	return (
		<PageEcran entete={{ genre: 'onglet', titre: NOM_DU_PILOTE }} etat="pret">
			<div className="flex flex-col items-center gap-cladd-2xs py-cladd-2xs">
				<Plume humeur="repos" taille={112} sol />
				<p className="text-cladd-xs font-semibold">{NOM_DU_PILOTE}</p>
			</div>
			<div className="grid grid-cols-5 gap-cladd-3xs">
				{HUMEURS.map((humeur) => (
					<div key={humeur} className="flex flex-col items-center gap-2">
						<Plume humeur={humeur} taille={56} sol />
						<AvatarPlume humeur={humeur} taille={32} />
						<span className="text-cladd-3xs text-cladd-fg-soft">{humeur}</span>
					</div>
				))}
			</div>
		</PageEcran>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LA CONVERSATION D'UN DOSSIER — vide, en travail, puis répondue.
 * ═══════════════════════════════════════════════════════════════════════════ */

const QUESTION_DEMO = 'Combien me doit-il, pénalités comprises ?';

function DemoConversation({ variante }: { etat: EtatDemo; variante?: string }) {
	const [question, setQuestion] = useState('');
	const forme = variante ?? 'vide';
	const messages: MessageAffiche[] =
		forme === 'vide'
			? []
			: forme === 'geste'
				? [
						{
							genre: 'GERANT',
							id: 'q',
							texte: 'Je l’ai eu au téléphone, il paie 2 000 € le 20 et le reste fin novembre.'
						},
						{
							genre: 'PLUME',
							id: 'r',
							phrases: [
								{
									texte:
										'Je vous propose de noter sa promesse, et de poser un rappel le lendemain pour vérifier que le virement est arrivé.',
									genreSource: 'AUCUNE',
									libelleSource: ''
								}
							],
							suite: (
								<div className="flex flex-col gap-2">
									<CarteDeGeste
										icone={<HandCoinsIcon />}
										titre="Promesse de 2 000,00 € pour mardi 20 octobre"
										detail="Si rien n’arrive ce jour-là, le dossier remonte dans Aujourd’hui."
										etat="FAITE"
										resultat="Promesse de 2 000,00 € notée pour mardi 20 octobre."
									/>
									<CarteDeGeste
										icone={<AlarmClockIcon />}
										titre="Rappel mercredi 21 octobre"
										detail="Vérifier le virement promis. Ce jour-là, le dossier remonte dans Aujourd’hui."
										etat="PROPOSEE"
										principal
										libelleConfirmer="Poser le rappel"
										onConfirmer={() => undefined}
										onEcarter={() => undefined}
									/>
								</div>
							)
						}
					]
				: forme === 'travail'
					? [{ genre: 'GERANT', id: 'q', texte: QUESTION_DEMO }]
					: [
							{ genre: 'GERANT', id: 'q', texte: QUESTION_DEMO },
							{
								genre: 'PLUME',
								id: 'r',
								phrases: [
									{
										texte:
											'Fournitures Durand doit 6 373,50 € à ce jour : 6 000,00 € de factures, 253,50 € de pénalités et 120,00 € de frais de recouvrement.',
										genreSource: 'DECOMPTE',
										libelleSource: 'calcul du jour'
									},
									{
										texte:
											'Les pénalités courent au taux de la BCE majoré de dix points, depuis l’échéance de chaque facture.',
										genreSource: 'PARAMETRE',
										libelleSource: 'taux des pénalités, relevé le 04/01'
									},
									{
										texte:
											'Le montant bouge chaque jour tant que les factures ne sont pas réglées.',
										genreSource: 'AUCUNE',
										libelleSource: ''
									}
								]
							}
						];
	return (
		<EcranConversationPilote
			fil={{
				titre: NOM_DU_PILOTE,
				sousTitre: 'Fournitures Durand',
				retour: { vers: '/app/dossiers', libelle: 'Dossiers' },
				humeur: forme === 'travail' ? 'travaille' : 'ecoute',
				accueil: {
					titre: 'Je m’occupe du dossier de Fournitures Durand.',
					sousTitre: (
						<>
							6 000,00 € à recouvrer · rappel dans 3 j
							<br />
							Posez-moi une question sur ce dossier : chaque phrase de ma réponse porte sa source.
						</>
					)
				},
				messages,
				travail:
					forme === 'travail'
						? [
								{ libelle: 'Je relis le dossier de Fournitures Durand', etat: 'faite' },
								{ libelle: 'Je reprends 3 factures et le décompte', etat: 'faite' },
								{ libelle: 'Je vérifie chaque chiffre à sa source', etat: 'courante' },
								{ libelle: 'Je rédige ma réponse', etat: 'avenir' }
							]
						: null,
				refus: null,
				panne: null,
				avertissement: null,
				suggestions: [
					'Combien me doit-il, pénalités comprises ?',
					'Quelles factures sont dans ce dossier ?',
					'Quel taux est appliqué aux pénalités ?'
				],
				question,
				onQuestion: setQuestion,
				onEnvoyer: () => setQuestion(''),
				enCours: forme === 'travail',
				placeholder: `Demander à ${NOM_DU_PILOTE}…`,
				arretee: false
			}}
		/>
	);
}

export const ECRANS_PLUME: readonly EcranDuProduit[] = [
	{
		route: '/app/',
		cle: 'plume',
		libelle: 'Plume',
		vide: false,
		Demo: DemoPlume
	},
	{
		route: '/app/pilote/$id',
		libelle: 'Parler à Plume',
		vide: false,
		variantes: ['vide', 'travail', 'reponse', 'geste'],
		Demo: DemoConversation
	}
];
