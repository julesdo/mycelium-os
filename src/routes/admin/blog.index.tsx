import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { jourDeParis } from '../../lib/admin/dates';
import type { Lecture } from '../../ui';
import { EcranBlog, type ArticleDeLaListe } from '../../screens/admin/blog';

/**
 * LE CMS DU BLOG, LA LISTE (19/10/2026) : les articles du dépôt, lus sur GitHub par une
 * action Convex. Toute l'équipe la voit ; seul un fondateur publie (`blog.$adresse.tsx`).
 */
export const Route = createFileRoute('/admin/blog/')({
	component: BlogAdmin
});

function BlogAdmin() {
	const etat = useQuery(api.admin.blog.etat, {});
	const lister = useAction(api.admin.blog.lister);
	const [lecture, setLecture] = useState<Lecture<readonly ArticleDeLaListe[]>>({ etat: 'attente' });
	const [tour, setTour] = useState(0);
	const [aujourdHui] = useState(() => jourDeParis(Date.now()));

	useEffect(() => {
		if (etat?.branche !== true) return;
		let annule = false;
		lister({})
			.then((valeur) => {
				if (!annule) setLecture({ etat: 'pret', valeur });
			})
			.catch(() => {
				if (!annule) setLecture({ etat: 'erreur' });
			});
		return () => {
			annule = true;
		};
	}, [etat?.branche, lister, tour]);

	return (
		<EcranBlog
			lecture={
				etat === undefined ? { etat: 'attente' } : etat.branche ? lecture : { etat: 'dormant' }
			}
			depot={etat?.depot ?? null}
			aujourdHui={aujourdHui}
			onRecharger={() => {
				setLecture({ etat: 'attente' });
				setTour((t) => t + 1);
			}}
		/>
	);
}
