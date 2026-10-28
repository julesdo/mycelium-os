import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { demarrerBarre } from '../../ui/site/barre';
import { demarrerChampsEmail } from '../../ui/site/champ-email';
import {
	demarrerBlocsVivants,
	demarrerBoutonsQuiComptent,
	demarrerHorsChamp,
	demarrerRegardDePlume
} from '../../ui/site/gestes';
import { demarrerPaysages } from '../../ui/site/paysages';
import { SpriteDuSite } from '../../ui/site/sprite';
import { SectionAppel } from './appel';
import { BarreDuSite } from './barre';
import { PiedDuSite } from './pied';

/**
 * LE SITE PUBLIC, D'APRÈS LA MAQUETTE V26 (28/10/2026).
 *
 * `docs/superpowers/specs/2026-10-28-site-en-production.md` dit comment il se construit :
 * la maquette (`docs/superpowers/maquettes/2026-10-28-site/`) est la référence, sa feuille de
 * style est transplantée telle quelle (`styles/site/`), et chaque section se compare à elle au
 * pixel (`scripts/comparer-maquette.ts`).
 *
 * ⚠️ REACT DESSINE LA PAGE UNE FOIS, LES MOTEURS LA FONT VIVRE. Rien ici n'a d'état : les
 * paysages, les visites guidées, les étiquettes qui se balancent écrivent sur les éléments,
 * hors de React, comme la lentille liquide de l'application. Chaque moteur rend de quoi se
 * défaire, pour qu'on puisse quitter la page et y revenir sans rechargement.
 */
export function PageSite() {
	const racine = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const el = racine.current;
		if (!el) return;
		// L'ordre est celui du script de la maquette.
		const arrets = [
			demarrerPaysages(el),
			demarrerBarre(el),
			demarrerBoutonsQuiComptent(el),
			demarrerBlocsVivants(el),
			demarrerRegardDePlume(el),
			demarrerChampsEmail(el, (adresse) => {
				void navigate({
					to: '/inscription',
					state: (precedent) => ({ ...precedent, adresseDInscription: adresse })
				});
			}),
			demarrerHorsChamp(el)
		];
		return () => arrets.forEach((arreter) => arreter());
	}, [navigate]);

	return (
		<div className="site" ref={racine}>
			<SpriteDuSite />
			<BarreDuSite />
			<main id="haut">
				<SectionAppel />
			</main>
			<PiedDuSite />
		</div>
	);
}
