import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { jourDeParis } from '../../lib/admin/dates';
import { permis, useRoleAdmin } from '../../app/coquille-admin';
import { PageEcran } from '../../ui';
import type { ArticleConnu } from '../../lib/blog/source';
import { EcranEditeurArticle } from '../../screens/admin/blog';

/**
 * LE CMS DU BLOG, UN ARTICLE (19/10/2026) : le fichier lu sur GitHub avec son empreinte,
 * les autres articles pour relire les liens, et la publication, réservée aux fondateurs.
 */
export const Route = createFileRoute('/admin/blog/$adresse')({
	component: ArticleAdmin
});

type Charge =
	| { readonly etat: 'attente' }
	| { readonly etat: 'erreur'; readonly message: string }
	| {
			readonly etat: 'pret';
			readonly source: string;
			readonly sha: string;
			readonly connus: readonly ArticleConnu[];
	  };

function ArticleAdmin() {
	const { adresse } = Route.useParams();
	const role = useRoleAdmin();
	const lire = useAction(api.admin.blog.lire);
	const lister = useAction(api.admin.blog.lister);
	const publier = useAction(api.admin.blogPublication.publier);
	const [charge, setCharge] = useState<Charge>({ etat: 'attente' });
	const [aujourdHui] = useState(() => jourDeParis(Date.now()));

	useEffect(() => {
		let annule = false;
		Promise.all([lire({ adresse }), lister({})])
			.then(([fichier, articles]) => {
				if (annule) return;
				setCharge({
					etat: 'pret',
					source: fichier.source,
					sha: fichier.sha,
					connus: articles
						.filter((a) => a.date !== null)
						.map((a) => ({ adresse: a.adresse, date: a.date ?? '', brouillon: a.brouillon }))
				});
			})
			.catch((e: unknown) => {
				if (annule) return;
				const donnees = (e as { data?: unknown }).data;
				setCharge({
					etat: 'erreur',
					message: typeof donnees === 'string' ? donnees : 'L’article ne se lit pas sur GitHub.'
				});
			});
		return () => {
			annule = true;
		};
	}, [adresse, lire, lister]);

	if (charge.etat !== 'pret') {
		return (
			<PageEcran
				entete={{
					genre: 'poussee',
					retour: { vers: '/admin/blog', libelle: 'Blog' },
					titre: 'Article'
				}}
				etat={charge.etat === 'attente' ? 'attente' : 'erreur'}
			/>
		);
	}
	return (
		<EcranEditeurArticle
			key={charge.sha}
			adresseInitiale={adresse}
			source={charge.source}
			sha={charge.sha}
			connus={charge.connus}
			aujourdHui={aujourdHui}
			peutPublier={permis(role, 'FONDATEUR')}
			onPublier={(a, source, sha) =>
				publier({ adresse: a, source, ...(sha === undefined ? {} : { sha }) })
			}
		/>
	);
}
