import { useState } from 'react';
import { useNavigate, CatchBoundary } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button } from '@cladd-ui/react';
import { SearchIcon } from 'lucide-react';

import {
	PaletteRecherche,
	bougesDuFlux,
	type DestinationRecherche,
	type FamilleRecherche,
	type RecentAffiche,
	type ResultatRechercheAffiche
} from '../ui/palette-recherche';
import { api } from '../lib/convex/_generated/api';

/**
 * LA RECHERCHE, ET SA PALETTE (D16).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE VIENT DE LA BARRE, QUI MEURT AVEC LA BASCULE (T15)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le dessin est INCHANGÉ — D16 le dit en toutes lettres : la palette reste
 * telle quelle. Une seule chose change, et c'est la seule qui devait changer :
 * son `ouvrir` ne mène plus à trois adresses différentes, il pose `?ligne=<id>`
 * sur la file. Il n'y a plus qu'un écran de travail ; ouvrir, c'est y ouvrir
 * une preuve.
 *
 * Elle reste dans `src/app/` parce qu'elle INTERROGE Convex. Le dessin, lui,
 * vit dans `ui/palette-recherche.tsx`, qui n'interroge rien : c'est ce qui
 * permet de le regarder aux quatre largeurs sans backend.
 */

/**
 * LA PALETTE, BRANCHÉE SUR LA BASE.
 *
 * ⚠️ LES DEUX REQUÊTES DORMENT TANT QUE LA PALETTE EST FERMÉE (`'skip'`). Le
 * flux est servi depuis le cache, la file l'ayant déjà demandé.
 *
 * ⚠️ LE DERNIER RÉSULTAT RESTE À L'ÉCRAN. `useQuery` rend `undefined` à chaque
 * nouveau terme : vider les cartes à ce moment ferait clignoter l'état vide à
 * chaque lettre. La réponse précédente est gardée au rendu (sans effet), et
 * `aJour` dit si celle qu'on montre répond au terme courant.
 */
function PaletteBranchee({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
	const navigate = useNavigate();
	const [terme, setTerme] = useState(String());
	const [deplie, setDeplie] = useState<FamilleRecherche | null>(null);

	const flux = useQuery(api.recouvrement.surveillance.flux, ouverte ? {} : 'skip');
	const bouges = bougesDuFlux(flux?.evenements ?? []);
	const cherche = terme.trim();

	const reponse = useQuery(
		api.recouvrement.recherche.recherche,
		!ouverte
			? 'skip'
			: cherche === ''
				? { terme: '', recents: bouges.map((b) => b.id) }
				: deplie === null
					? { terme: cherche }
					: { terme: cherche, deplier: deplie }
	);
	const [derniere, setDerniere] = useState(reponse);
	if (reponse !== undefined && reponse !== derniere) setDerniere(reponse);
	const affichee = reponse ?? derniere;

	const resultat: ResultatRechercheAffiche | null =
		affichee === undefined
			? null
			: {
					debiteurs: {
						...affichee.debiteurs,
						premiers: affichee.debiteurs.premiers.map(({ _id, ...debiteur }) => ({
							id: _id,
							...debiteur
						}))
					},
					factures: {
						...affichee.factures,
						premiers: affichee.factures.premiers.map(({ _id, ...facture }) => ({
							id: _id,
							...facture
						}))
					},
					procedures: affichee.procedures
				};

	// Les noms viennent de la même réponse que le reste : aucune rangée sans nom.
	const noms = new Map<string, string>(
		(affichee?.recents ?? []).map((d) => [d._id, d.denomination])
	);
	const recents: RecentAffiche[] = bouges.flatMap((bouge) => {
		const denomination = noms.get(bouge.id);
		return denomination === undefined ? [] : [{ ...bouge, denomination }];
	});

	/**
	 * OUVRIR, C'EST POSER `?ligne=<id>` — ET RIEN D'AUTRE (D16).
	 *
	 * ⚠️ `?ligne=` PORTE L'IDENTIFIANT QUE LA RANGÉE PORTE, tel quel : celui d'une
	 * créance quand l'objet en est une, celui d'un client sinon. C'est la file qui
	 * sait résoudre l'un vers l'autre, et elle le sait à UN endroit — construire
	 * ici une seconde règle de résolution la ferait diverger de celle des rangées,
	 * et la ligne ouverte ne serait plus celle qu'on a touchée.
	 *
	 * ⚠️ UNE FACTURE N'OUVRE RIEN, ET C'EST EXACT : elle n'a pas d'écran à elle.
	 * On va à la file, où sa créance et son client portent leurs rangées.
	 */
	const ouvrir = (destination: DestinationRecherche) => {
		onFermer();
		const ligne =
			destination.genre === 'PROCEDURE'
				? destination.creanceId
				: destination.genre === 'DEBITEUR'
					? destination.debiteurId
					: null;

		void navigate({ to: '/app', search: ligne === null ? {} : { ligne } });
	};

	return (
		<PaletteRecherche
			ouverte={ouverte}
			terme={terme}
			onTerme={(valeur) => {
				setTerme(valeur);
				// Un autre terme, d'autres familles : ce qui était déplié ne l'est plus.
				setDeplie(null);
			}}
			onFermer={onFermer}
			resultat={resultat}
			aJour={reponse !== undefined}
			recents={recents}
			etablissementVide={affichee?.etablissementVide ?? false}
			deplie={deplie}
			onDeplier={setDeplie}
			onOuvrir={ouvrir}
		/>
	);
}

/**
 * LA RECHERCHE : un déclencheur, pas un champ.
 *
 * ⚠️ ELLE ÉTAIT UN `<input>`, ET ENTRÉE JETAIT LE TERME. Un champ dans la barre
 * qui ouvrirait un second champ dans la palette ferait aussi taper deux fois :
 * les premières lettres se perdraient pendant l'ouverture. On touche une
 * pilule, et le curseur est déjà dans le seul champ.
 *
 * ⚠️ LA PALETTE EST REMONTÉE À CHAQUE OUVERTURE (clé) : elle repart d'un champ
 * vide. Et elle est isolée : sans session (salle d'exposition, expiration), la
 * requête lève, la palette se referme, et la `Toolbar` reste debout.
 */
export function Recherche() {
	const [ouverte, setOuverte] = useState(false);
	const [ouvertures, setOuvertures] = useState(0);

	return (
		<>
			<Button
				size="md"
				variant="transparent"
				outline={false}
				hoverable={false}
				rounded
				aria-haspopup="dialog"
				className="verre verre-actif min-w-0 flex-1 lg:max-w-80"
				contentClassName="w-full justify-start gap-cladd-3xs"
				onClick={() => {
					setOuvertures((n) => n + 1);
					setOuverte(true);
				}}
			>
				<SearchIcon aria-hidden className="shrink-0 text-cladd-fg-softer" />
				{/*
				 * ⚠️ LA PHRASE COMPLÈTE DEMANDE 261 px, ET LA PILULE N'EN OFFRE QUE 133
				 * À 768 px. Elle s'y coupait au milieu de la référence, ce qui apprenait
				 * le contraire de ce qu'elle est là pour apprendre : « FA-2026-03… » ne
				 * ressemble plus à un numéro de facture. Sous 1024 px, on garde le seul
				 * mot qui dise la fonction, entier ; au-dessus, l'exemple revient.
				 */}
				<span className="truncate text-cladd-xs font-normal text-cladd-fg-softer">
					<span className="lg:hidden">Rechercher</span>
					<span className="hidden lg:inline">Rechercher « Durand, FA-2026-0311… »</span>
				</span>
			</Button>
			<CatchBoundary
				getResetKey={() => ouvertures}
				errorComponent={() => null}
				onCatch={() => setOuverte(false)}
			>
				<PaletteBranchee key={ouvertures} ouverte={ouverte} onFermer={() => setOuverte(false)} />
			</CatchBoundary>
		</>
	);
}
