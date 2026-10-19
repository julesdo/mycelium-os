import sourceHopital from '../../../content/blog/hopital-qui-paie-en-retard.mdx?raw';
import { EcranBlog, EcranEditeurArticle, type ArticleDeLaListe } from '../../screens/admin/blog';
import { lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * LE CMS DU BLOG, DANS LA SALLE (19/10/2026) : la liste et l'éditeur, sans GitHub ni
 * session. L'éditeur s'ouvre sur un vrai article du dépôt ; la publication y est simulée.
 */

const AUJOURDHUI_DEMO = '2026-10-19';

const ARTICLES_DEMO: readonly ArticleDeLaListe[] = [
	{
		adresse: 'hopital-qui-paie-en-retard',
		sha: 'demo-1',
		titre: 'Hôpital qui paie en retard, des pénalités dues sans rien demander',
		description: 'Les hôpitaux publics paient en 70 jours en moyenne.',
		date: '2026-10-27',
		categorie: 'La loi',
		pilier: 'Le secteur public',
		brouillon: false,
		erreurs: []
	},
	{
		adresse: 'penalites-de-retard-entre-entreprises',
		sha: 'demo-2',
		titre: 'Pénalités de retard, le calcul expliqué pas à pas',
		description: 'Le calcul des pénalités, période par période.',
		date: '2026-10-06',
		categorie: 'La loi',
		pilier: 'L’argent oublié',
		brouillon: false,
		erreurs: []
	},
	{
		adresse: 'un-brouillon',
		sha: 'demo-3',
		titre: 'Un article en cours d’écriture',
		description: 'Un brouillon ne sort jamais en ligne.',
		date: '2026-12-15',
		categorie: 'Méthode',
		pilier: null,
		brouillon: true,
		erreurs: []
	},
	{
		adresse: 'un-en-tete-casse',
		sha: 'demo-4',
		titre: null,
		description: null,
		date: null,
		categorie: null,
		pilier: null,
		brouillon: false,
		erreurs: ['Le titre est trop court : 10 caractères au moins.']
	}
];

function DemoListe({ etat }: { etat: EtatDemo }) {
	return (
		<EcranBlog
			lecture={lectureDemo(etat, ARTICLES_DEMO, [])}
			depot="julesdo/mycelium-os"
			aujourdHui={AUJOURDHUI_DEMO}
			onRecharger={() => undefined}
		/>
	);
}

function DemoEditeur({ variante }: { variante?: string }) {
	const nouveau = variante === 'nouvel article';
	return (
		<EcranEditeurArticle
			adresseInitiale={nouveau ? null : 'hopital-qui-paie-en-retard'}
			source={nouveau ? null : sourceHopital}
			sha={nouveau ? undefined : 'demo-1'}
			connus={ARTICLES_DEMO.filter((a) => a.date !== null).map((a) => ({
				adresse: a.adresse,
				date: a.date ?? '',
				brouillon: a.brouillon
			}))}
			aujourdHui={AUJOURDHUI_DEMO}
			peutPublier={variante !== 'lecture seule'}
			onPublier={async () => ({
				commit: 'demo',
				url: 'https://github.com/julesdo/mycelium-os',
				sha: 'demo-2'
			})}
		/>
	);
}

export const ECRANS_BLOG: readonly EcranDuProduit[] = [
	{ route: '/admin/blog/', libelle: 'admin · blog', vide: true, Demo: DemoListe },
	{
		route: '/admin/blog/$adresse',
		libelle: 'admin · éditeur d’article',
		vide: false,
		variantes: ['nouvel article', 'lecture seule'],
		Demo: DemoEditeur
	}
];
