import { useState } from 'react';
import { useNavigate, CatchBoundary } from '@tanstack/react-router';
import { useQuery } from 'convex/react';

import {
	DeclencheurRecherche,
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
 * ⚠️ ELLE VIT DANS L'EN-TÊTE D'« AUJOURD'HUI », ET SON `ouvrir` A CHANGÉ DEUX FOIS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le dessin est INCHANGÉ — D16 le dit en toutes lettres : la palette reste
 * telle quelle. Ce qui a bougé, c'est où elle mène. Elle a mené à trois
 * adresses, puis à `?ligne=<id>` sur la file, et elle mène de nouveau à la page
 * de l'objet : le volet de preuve a disparu, un client et une créance ont
 * chacun la leur. Voir `ouvrir`, plus bas, qui porte la raison.
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
	 * OUVRIR, C'EST ALLER À LA PAGE DE L'OBJET.
	 *
	 * ═══════════════════════════════════════════════════════════════════════════
	 * ⚠️ ELLE POSAIT `?ligne=<id>`, ET CE PARAMÈTRE N'EXISTE PLUS
	 * ═══════════════════════════════════════════════════════════════════════════
	 *
	 * Il ouvrait le volet de preuve d'« Aujourd'hui », qui a disparu : un client
	 * et une créance ont maintenant chacun LEUR page. Laissé tel quel, ce geste
	 * refermait la palette et menait à « Aujourd'hui » sans rien ouvrir — on
	 * cherchait un client, on le trouvait, on le touchait, et il ne se passait
	 * rien. Le pire état d'une recherche : elle répond, et le résultat ne mène
	 * nulle part.
	 *
	 * ⚠️ ET IL N'Y A AUCUNE RÉSOLUTION À FAIRE ICI. La palette dit déjà de quel
	 * GENRE est ce qu'on a touché — `DEBITEUR` ou `PROCEDURE` — et porte
	 * l'identifiant qui va avec. C'est ce qui manquait à `?ligne=`, qui
	 * transportait un identifiant nu et laissait la file deviner.
	 *
	 * ⚠️ UNE FACTURE MÈNE À SON CLIENT, ET C'EST EXACT : elle n'a pas d'écran à
	 * elle, et c'est la page de son client qui la porte, ligne à ligne, avec le
	 * rapprochement qui la solde.
	 */
	const ouvrir = (destination: DestinationRecherche) => {
		onFermer();

		if (destination.genre === 'PROCEDURE') {
			void navigate({ to: '/app/dossier/$id', params: { id: destination.creanceId } });
			return;
		}

		if (destination.genre === 'DEBITEUR') {
			void navigate({ to: '/app/clients/$id', params: { id: destination.debiteurId } });
			return;
		}

		// `IMPORT` : l'établissement est vide, et il n'y a rien à ouvrir. On mène à
		// « Aujourd'hui », dont l'état vide EST la zone de dépôt, en grand.
		void navigate({ to: '/app' });
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
			<DeclencheurRecherche
				onOuvrir={() => {
					setOuvertures((n) => n + 1);
					setOuverte(true);
				}}
			/>
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
