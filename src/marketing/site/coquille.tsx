import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { demarrerBalayage } from '../../ui/site/balayage';
import { demarrerBarre } from '../../ui/site/barre';
import { demarrerBlog, type ArticleDuRecit } from '../../ui/site/blog';
import { demarrerChampsEmail } from '../../ui/site/champ-email';
import {
	demarrerBlocsVivants,
	demarrerBoutonsQuiComptent,
	demarrerHorsChamp,
	demarrerRegardDePlume
} from '../../ui/site/gestes';
import { demarrerLoi } from '../../ui/site/loi';
import { demarrerMetiers } from '../../ui/site/metiers';
import { demarrerPaysages } from '../../ui/site/paysages';
import { demarrerPlume } from '../../ui/site/plume';
import { demarrerSecurite } from '../../ui/site/securite';
import { SpriteDuSite } from '../../ui/site/sprite';
import { demarrerTarifs } from '../../ui/site/tarifs';
import { demarrerTuiles } from '../../ui/site/tuiles';
import { demarrerVitrine } from '../../ui/site/vitrine';
import { BarreDuSite } from './barre';
import { FACTURE_DE_LA_LOI, LOI } from './loi-demo';
import { PiedDuSite } from './pied';
import { PLUME } from './plume-demo';
import { RELEVE } from './securite-demo';
import { SANTE } from './tout-demo';
import { VITRINE } from './vitrine-demo';

/**
 * LA COQUILLE DU SITE PUBLIC, D'APRÈS LA MAQUETTE V26 (28/10/2026) : la barre, le pied, et les
 * moteurs qui font vivre les sections. Chaque page du site s'y pose (`page.tsx` pour l'accueil,
 * `page-tarifs.tsx`).
 *
 * `docs/superpowers/specs/2026-10-28-site-en-production.md` dit comment le site se construit :
 * la maquette (`docs/superpowers/maquettes/2026-10-28-site/`) est la référence, sa feuille de
 * style est transplantée telle quelle (`styles/site/`), et chaque section se compare à elle au
 * pixel (`scripts/comparer-maquette.ts`).
 *
 * ⚠️ REACT DESSINE LA PAGE UNE FOIS, LES MOTEURS LA FONT VIVRE. Les paysages, les visites
 * guidées, les étiquettes qui se balancent écrivent sur les éléments, hors de React, comme la
 * lentille liquide de l'application. Chaque moteur rend de quoi se défaire, pour qu'on puisse
 * quitter la page et y revenir sans rechargement ; et chacun ne fait rien quand sa section n'est
 * pas sur la page : la coquille les démarre tous, quelle que soit la page.
 */
export function CoquilleDuSite({
	children,
	articles = []
}: {
	children: ReactNode;
	/** Les articles du blog que la page a rendus : le récit les fait défiler. */
	articles?: readonly ArticleDuRecit[];
}) {
	const racine = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const el = racine.current;
		if (!el) return;
		// L'ordre est celui du script de la maquette.
		const arrets = [
			demarrerPaysages(el),
			demarrerLoi(el, {
				depart: FACTURE_DE_LA_LOI.echeance,
				jours: LOI.jours,
				penalites: LOI.penalites,
				segments: LOI.segments
			}),
			demarrerBarre(el),
			demarrerBoutonsQuiComptent(el),
			demarrerTuiles(el, { sante: SANTE }),
			demarrerVitrine(el, VITRINE),
			demarrerBlocsVivants(el),
			demarrerRegardDePlume(el),
			demarrerSecurite(el, {
				virements: RELEVE.virements,
				solde: RELEVE.solde,
				delai: PLUME.scenario.delai
			}),
			demarrerChampsEmail(el, (adresse) => {
				void navigate({
					to: '/inscription',
					state: (precedent) => ({ ...precedent, adresseDInscription: adresse })
				});
			}),
			demarrerPlume(el, PLUME.scenario),
			demarrerTarifs(el),
			demarrerBlog(el, articles),
			demarrerMetiers(el),
			demarrerBalayage(el),
			demarrerHorsChamp(el)
		];
		return () => arrets.forEach((arreter) => arreter());
	}, [navigate, articles]);

	return (
		<div className="site" ref={racine}>
			<SpriteDuSite />
			<BarreDuSite />
			<main id="haut">{children}</main>
			<PiedDuSite />
		</div>
	);
}
