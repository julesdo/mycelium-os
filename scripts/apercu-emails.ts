/**
 * L'APERÇU DE TOUS LES E-MAILS, sur une seule page (15/10/2026).
 *
 * Chaque e-mail que Letikette envoie, rendu par ses vrais modèles avec des données
 * de démonstration, côte à côte : à la largeur d'un téléphone et à celle d'un
 * écran. Les images sont incrustées, pour que la page se lise sans réseau.
 *
 *   bun scripts/apercu-emails.ts [fichier de sortie]
 *   bun scripts/apercu-emails.ts --servir      (sur http://localhost:20190)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';

process.env.EMAIL_ASSET_URL = 'https://apercu.invalid';

const { briefingHtml, invitationHtml, motDePasseHtml, rappelAbonnementHtml, verificationHtml } =
	await import('../src/lib/convex/emails/modeles');
const { relanceHtml } = await import('../src/lib/convex/emails/modeles/relance');
const { semaineHtml } = await import('../src/lib/convex/emails/modeles/semaine');
const { reveilHtml } = await import('../src/lib/convex/emails/modeles/reveil');
const { conseilHtml, objetDuConseil } = await import('../src/lib/convex/emails/modeles/conseils');
const { CLES_CONSEILS_ENVOYES } = await import('../src/lib/croissance/conseils');
const { rapportHtml, OBJET_DU_RAPPORT } =
	await import('../src/lib/convex/emails/modeles/diagnostic');
const { composerRelance } = await import('../src/lib/verticales/recouvrement/relance');

function enDonnee(chemin: string): string {
	return `data:image/png;base64,${readFileSync(resolve(chemin)).toString('base64')}`;
}

const MARQUE = enDonnee('public/emails/marque.png');
const PLUME = enDonnee('public/emails/plume.png');

function incruster(html: string): string {
	return html
		.replaceAll('https://apercu.invalid/emails/marque.png', MARQUE)
		.replaceAll('https://apercu.invalid/emails/plume.png', PLUME);
}

const rappel = composerRelance(1, {
	creancier: 'Menuiserie Dupont',
	debiteur: 'Durand Bâtiment',
	factures: [
		{ reference: 'FA-2026-0142', montantTTC: 184_200n, dateEcheance: '2026-09-15' },
		{ reference: 'FA-2026-0157', montantTTC: 62_040n, dateEcheance: '2026-09-30' }
	],
	principalRestantDu: 246_240n,
	santeDebiteur: 'SAINE',
	aujourdHui: '2026-10-15'
});
if (!rappel.disponible) throw new Error('Le rappel de démonstration ne se compose pas.');

const EMAILS: readonly { nom: string; objet: string; de: string; html: string }[] = [
	{
		nom: 'Confirmer son adresse',
		objet: 'Confirmez votre adresse e-mail',
		de: 'Letikette',
		html: verificationHtml({
			url: 'https://www.letikette.com/api/auth/verify-email?token=abc',
			minutes: 20
		})
	},
	{
		nom: 'Nouveau mot de passe',
		objet: 'Choisissez un nouveau mot de passe',
		de: 'Letikette',
		html: motDePasseHtml({
			url: 'https://www.letikette.com/reinitialiser?token=abc',
			nom: 'Camille Dupont'
		})
	},
	{
		nom: 'Invitation',
		objet: 'Rejoindre Menuiserie Dupont sur Letikette',
		de: 'Letikette',
		html: invitationHtml({
			nomEtablissement: 'Menuiserie Dupont',
			roleLibelle: 'Membre',
			url: 'https://www.letikette.com/invitation/abc'
		})
	},
	{
		nom: 'Le point du matin',
		objet: 'Une échéance réclame votre attention',
		de: 'Plume de Letikette',
		html: briefingHtml({
			nomEntreprise: 'Menuiserie Dupont',
			titre: 'Une échéance réclame votre attention',
			intro: 'La facture FA-2026-0142 de Durand Bâtiment est échue depuis 30 jours.',
			lignes: [
				'1 point critique sur 3 au total.',
				'Le second rappel à Garnier & Fils part demain à 9 h.',
				'Le détail de chaque montant, facture par facture, se lit dans Letikette.'
			],
			action: 'Démarrer le dossier de Durand Bâtiment.',
			montantLisible: '12 480,50 €',
			url: 'https://www.letikette.com/app'
		})
	},
	{
		nom: 'Le point du matin, jour calme',
		objet: 'Rien d’urgent cette semaine',
		de: 'Plume de Letikette',
		html: briefingHtml({
			nomEntreprise: 'Menuiserie Dupont',
			titre: 'Rien d’urgent cette semaine',
			intro: 'Aucune échéance ne réclame votre attention. Vos délais sont surveillés.',
			lignes: ['Aucun point d’attention.'],
			action: null,
			montantLisible: null,
			url: 'https://www.letikette.com/app'
		})
	},
	{
		nom: 'Le réveil utile',
		objet: 'Pendant votre absence : 2 clients ont payé, une date limite approche.',
		de: 'Plume de Letikette',
		html: reveilHtml({
			nomEntreprise: 'Menuiserie Dupont',
			phrase: 'Pendant votre absence : 2 clients ont payé, une date limite approche.',
			rangees: [
				{ libelle: 'Rentré', valeur: '4 120 €' },
				{ libelle: 'Clients qui ont payé', valeur: '2' },
				{ libelle: 'Date limite la plus proche', valeur: 'dans 12 j' }
			],
			url: 'https://www.letikette.com/app',
			desinscription: 'https://apercu.invalid/conseils/desinscription?j=demo'
		})
	},
	{
		nom: 'Votre semaine, le lundi',
		objet: 'Votre semaine : 4 120 € rentrés, 3 clients ont payé.',
		de: 'Plume de Letikette',
		html: semaineHtml({
			nomEntreprise: 'Menuiserie Dupont',
			periode: 'la semaine du 12 octobre 2026',
			rentreLisible: '4 120 €',
			meilleure: 'Votre meilleure semaine depuis le 24 août 2026.',
			rangees: [
				{ libelle: 'Relances parties', valeur: '6' },
				{ libelle: 'Clients qui ont payé', valeur: '3' },
				{ libelle: 'Date limite la plus proche', valeur: 'dans 12 j' }
			],
			url: 'https://www.letikette.com/app/semaine'
		})
	},
	{
		nom: 'Rappel d’abonnement',
		objet: 'Premier prélèvement le 14 novembre 2026',
		de: 'Letikette',
		html: rappelAbonnementHtml({
			nomEntreprise: 'Menuiserie Dupont',
			titre: 'Premier prélèvement le 14 novembre 2026',
			message:
				'39,00 € HT pour Équipe, au mois. Pour continuer, rien à faire. Pour annuler ou changer de formule : Compte, puis Abonnement, jusqu’à la veille.',
			url: 'https://www.letikette.com/app/compte?ouvrir=facturation'
		})
	},
	...CLES_CONSEILS_ENVOYES.map((cle) => ({
		nom: `Conseil de Plume : ${cle}`,
		objet: objetDuConseil(cle),
		de: 'Plume de Letikette',
		html: conseilHtml({
			cle,
			prenom: 'Camille',
			nomEtablissement: 'Menuiserie Dupont',
			site: 'https://www.letikette.com',
			desinscription: 'https://www.letikette.com/conseils',
			du: { montant: '2 462,40 €', factures: 2, indemnite: '40,00 €', indemniteTotale: '80,00 €' },
			plan: [
				'Un rappel, 3 jours après l’échéance',
				'Un deuxième rappel, 10 jours plus tard',
				'Une lettre officielle, 10 jours plus tard',
				'La remise à votre conseil, seulement si vous la décidez'
			],
			offre: { pourcent: 20, mois: 3, jusquAu: '2 novembre 2026' }
		})
	})),
	{
		nom: 'Rapport du diagnostic',
		objet: OBJET_DU_RAPPORT,
		de: 'Plume de Letikette',
		html: rapportHtml({
			prenom: 'Camille',
			nomEtablissement: 'Menuiserie Dupont',
			site: 'https://www.letikette.com',
			periode: 'Factures depuis le 19 juillet 2026',
			compteAu: '19 octobre 2026',
			enJeu: '1 284,50 €',
			encoreDues: { factures: 4, montant: '8 420,00 €' },
			payeesEnRetard: 7,
			nonChiffrees: 2,
			hypotheses: [],
			avertissement:
				'Ce rapport mesure ce que la loi ajoute à vos factures, d’après les données importées. Il ne dit pas qu’une somme sera payée, ni qu’une démarche est à engager : c’est à vous de décider.'
		})
	},
	{
		nom: 'Relance au client du gérant (sans Letikette)',
		objet: rappel.objet,
		de: 'Menuiserie Dupont',
		html: relanceHtml(rappel.corps, 'Menuiserie Dupont')
	}
];

function attribut(html: string): string {
	return html.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

const sections = EMAILS.map(
	(e) => `<section>
<h2>${e.nom}</h2>
<p class="meta"><b>${e.de}</b> · ${e.objet}</p>
<div class="paire">
<figure><figcaption>Téléphone, 375 px</figcaption><iframe width="375" height="900" srcdoc="${attribut(incruster(e.html))}"></iframe></figure>
<figure><figcaption>Écran, 720 px</figcaption><iframe width="720" height="900" srcdoc="${attribut(incruster(e.html))}"></iframe></figure>
</div>
</section>`
).join('\n');

const page = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Les e-mails de Letikette</title>
<style>
body { margin: 0; padding: 32px 24px; background: #e9e5dd; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1b253f; }
h1 { font-size: 22px; margin: 0 0 24px; }
section { margin: 0 0 48px; }
h2 { font-size: 17px; margin: 0 0 4px; }
.meta { margin: 0 0 12px; font-size: 13px; color: #555c6c; }
.paire { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
figure { margin: 0; }
figcaption { font-size: 12px; color: #6b7180; margin: 0 0 6px; }
iframe { border: 1px solid #d5cfc4; border-radius: 12px; background: #fff; }
</style></head>
<body><h1>Les e-mails de Letikette</h1>
${sections}
</body></html>`;

if (process.argv.includes('--servir')) {
	createServer((_requete, reponse) => {
		reponse.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
		reponse.end(page);
	}).listen(20190);
} else {
	const sortie = process.argv[2] ?? 'apercu-emails.html';
	writeFileSync(sortie, page);
	console.log(`${EMAILS.length} e-mails → ${sortie}`);
}
