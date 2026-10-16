import { describe, it, expect } from 'vitest';
import {
	decidePassage,
	demandeDActe,
	demandeUnHumain,
	insiste,
	questionDeDroit,
	reponseSansModele,
	veutArreterLesEnvois
} from '../passage';

describe('demandeUnHumain', () => {
	it('reconnaît une demande d’humain écrite', () => {
		for (const t of [
			'Je voudrais parler à quelqu’un',
			'je veux un humain svp',
			'Pouvez-vous me passer un conseiller ?',
			'parler avec une vraie personne',
			'Contacter le support',
			'Je veux parler à l’équipe Letikette',
			'Mettez-moi en relation avec un conseiller'
		]) {
			expect(demandeUnHumain(t), t).toBe(true);
		}
	});

	it('ne prend ni une question ordinaire, ni « mon conseil », ni un avocat pour une demande', () => {
		for (const t of [
			'Comment activer les relances ?',
			'Quelqu’un de mon équipe peut-il voir mes dossiers ?',
			'Mon client est une personne morale',
			'Je dois parler à mon conseil de ce dossier',
			'Je voudrais parler à un avocat',
			'J’ai besoin d’un conseiller juridique',
			'Comment contacter l’équipe de mon client ?'
		]) {
			expect(demandeUnHumain(t), t).toBe(false);
		}
	});
});

describe('demandeDActe', () => {
	it('reconnaît ce que seule l’équipe peut faire', () => {
		expect(demandeDActe('Je veux un remboursement')).toBe('REMBOURSEMENT');
		expect(demandeDActe('Remboursez-moi s’il vous plaît')).toBe('REMBOURSEMENT');
		expect(demandeDActe('J’ai été prélevé deux fois ce mois-ci')).toBe('PRELEVEMENT');
		expect(demandeDActe('J’ai été débité deux fois')).toBe('PRELEVEMENT');
		expect(demandeDActe('Je conteste ce prélèvement')).toBe('PRELEVEMENT');
		expect(demandeDActe('Je voudrais changer l’adresse e-mail du compte')).toBe('TITULAIRE');
		expect(demandeDActe('J’ai perdu mes codes de secours')).toBe('ACCES_PERDU');
		expect(demandeDActe('Téléphone perdu, plus accès à la double authentification')).toBe('ACCES_PERDU');
		expect(demandeDActe('Mon compte a été piraté')).toBe('COMPROMISSION');
		expect(demandeDActe('Je veux exercer mon droit d’accès')).toBe('DONNEES_PERSONNELLES');
		expect(demandeDActe('Supprimez toutes mes données')).toBe('DONNEES_PERSONNELLES');
	});

	it('laisse à Plume une question d’information', () => {
		for (const t of [
			'Quand serai-je prélevé ?',
			'Comment résilier ?',
			'Ma connexion ne lit plus rien',
			'J’ai un bug au dépôt',
			'Comment marche le remboursement ?',
			'Où sont hébergées mes données ?',
			'Letikette est-il conforme au RGPD ?',
			'Comment changer mon mot de passe ?',
			'Ma carte bancaire est refusée'
		]) {
			expect(demandeDActe(t), t).toBeNull();
		}
	});
});

describe('veutArreterLesEnvois', () => {
	it('reconnaît une demande d’arrêter ce qui part', () => {
		for (const t of [
			'Arrêtez l’envoi de cette relance !',
			'Stop les relances',
			'N’envoyez pas cette relance',
			'Bloquez la relance à Durand',
			'Il ne faut pas que la lettre parte'
		]) {
			expect(veutArreterLesEnvois(t), t).toBe(true);
		}
	});

	it('ne confond ni l’horaire des relances ni l’abonnement', () => {
		expect(veutArreterLesEnvois('À quelle heure partent les relances ?')).toBe(false);
		expect(veutArreterLesEnvois('Comment arrêter mon abonnement ?')).toBe(false);
	});
});

describe('questionDeDroit', () => {
	it('reconnaît une question de droit', () => {
		for (const t of [
			'Ai-je le droit de réclamer 40 € ?',
			'Est-ce que c’est prescrit ?',
			'Puis-je saisir le tribunal ?',
			'Dois-je envoyer une mise en demeure ?',
			'Quelle procédure engager ?'
		]) {
			expect(questionDeDroit(t), t).toBe(true);
		}
	});

	it('ne prend pas « puis-je » sur le logiciel pour du droit (le détecteur du compagnon le ferait)', () => {
		for (const t of [
			'Comment puis-je activer les relances ?',
			'Puis-je changer de formule ?',
			'Dois-je relier Pennylane ?',
			'Peut-on être plusieurs sur le compte ?'
		]) {
			expect(questionDeDroit(t), t).toBe(false);
		}
	});
});

describe('reponseSansModele', () => {
	it('répond sans le modèle à l’arrêt des envois d’abord, puis au droit', () => {
		expect(reponseSansModele('Arrêtez la relance, ai-je le droit de la retenir ?')).toBe('ARRETER_LES_ENVOIS');
		expect(reponseSansModele('Ai-je le droit de réclamer des pénalités ?')).toBe('QUESTION_DE_DROIT');
		expect(reponseSansModele('Comment activer les relances ?')).toBeNull();
	});
});

describe('insiste', () => {
	it('repère trois messages qui redisent la même chose', () => {
		expect(
			insiste([
				'Ma relance n’est pas partie',
				'Pourquoi ma relance n’est pas partie ?',
				'Ma relance n’est toujours pas partie !'
			])
		).toBe(true);
	});

	it('ne confond pas une conversation qui avance', () => {
		expect(
			insiste(['Comment activer les relances ?', 'Et les horaires ?', 'Merci, et pour le coffre ?'])
		).toBe(false);
	});
});

describe('decidePassage', () => {
	const base = {
		texte: 'Comment activer les relances ?',
		messagesDuGerant: ['Comment activer les relances ?'],
		nonsConsecutifs: 0,
		plafondAtteint: false,
		plumeOuvert: true
	};

	it('ne passe pas la main sur une question de fonctionnement', () => {
		expect(decidePassage(base)).toBeNull();
		expect(decidePassage({ ...base, texte: 'Quand serai-je prélevé ?' })).toBeNull();
	});

	it('passe la main dans l’ordre : demande, acte, fermé, plafond, refus, insistance', () => {
		expect(decidePassage({ ...base, texte: 'je veux parler à quelqu’un, remboursez-moi' })).toEqual({
			raison: 'DEMANDE'
		});
		expect(decidePassage({ ...base, texte: 'je veux un remboursement', plumeOuvert: false })).toEqual({
			raison: 'ACTE',
			acte: 'REMBOURSEMENT'
		});
		expect(decidePassage({ ...base, plumeOuvert: false, plafondAtteint: true })).toEqual({ raison: 'FERME' });
		expect(decidePassage({ ...base, plafondAtteint: true })).toEqual({ raison: 'PLAFOND' });
		expect(decidePassage({ ...base, nonsConsecutifs: 2 })).toEqual({ raison: 'REFUS' });
		expect(
			decidePassage({
				...base,
				messagesDuGerant: ['Ma relance n’est pas partie', 'Ma relance n’est pas partie ?', 'ma relance n’est pas partie']
			})
		).toEqual({ raison: 'INSISTANCE' });
	});

	it('un seul « Pas vraiment » fait reformuler, pas passer', () => {
		expect(decidePassage({ ...base, nonsConsecutifs: 1 })).toBeNull();
	});
});
