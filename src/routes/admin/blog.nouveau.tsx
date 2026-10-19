import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { jourDeParis } from '../../lib/admin/dates';
import { permis, useRoleAdmin } from '../../app/coquille-admin';
import type { ArticleConnu } from '../../lib/blog/source';
import { EcranEditeurArticle } from '../../screens/admin/blog';

/**
 * LE CMS DU BLOG, UN NOUVEL ARTICLE (19/10/2026) : l'adresse se déduit du titre, et la
 * liste des articles existants sert à refuser une adresse déjà prise et à relire les liens.
 */
export const Route = createFileRoute('/admin/blog/nouveau')({
	component: NouvelArticle
});

function NouvelArticle() {
	const role = useRoleAdmin();
	const lister = useAction(api.admin.blog.lister);
	const publier = useAction(api.admin.blogPublication.publier);
	const [connus, setConnus] = useState<readonly ArticleConnu[]>([]);
	const [aujourdHui] = useState(() => jourDeParis(Date.now()));

	useEffect(() => {
		let annule = false;
		lister({})
			.then((articles) => {
				if (annule) return;
				setConnus(
					articles
						.filter((a) => a.date !== null)
						.map((a) => ({ adresse: a.adresse, date: a.date ?? '', brouillon: a.brouillon }))
				);
			})
			.catch(() => undefined);
		return () => {
			annule = true;
		};
	}, [lister]);

	return (
		<EcranEditeurArticle
			adresseInitiale={null}
			source={null}
			sha={undefined}
			connus={connus}
			aujourdHui={aujourdHui}
			peutPublier={permis(role, 'FONDATEUR')}
			onPublier={(a, source, sha) =>
				publier({ adresse: a, source, ...(sha === undefined ? {} : { sha }) })
			}
		/>
	);
}
