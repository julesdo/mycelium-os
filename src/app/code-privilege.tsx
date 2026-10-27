import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { saisieDuCode } from '../lib/paiement/codes-privilege';
import {
	FeuilleCodePrivilege,
	type CodePrivilegeAffiche,
	type ExamenAffiche
} from '../screens/compte/code-privilege';

/**
 * LE CODE PRIVILÈGE EN PLACE (27/10/2026) : la saisie, l'examen, l'activation, branchés
 * sur `codesPrivilege.examinerUnCode` et `utiliserUnCode`. La salle branche les mêmes
 * gestes sur des réponses écrites d'avance (`useCodePrivilege`).
 */

export type ReponseAuCode =
	| ({ readonly ok: true } & ExamenAffiche)
	| { readonly ok: false; readonly raison: string };

export interface GestesDuCode {
	readonly examiner: (code: string) => Promise<ReponseAuCode>;
	readonly utiliser: (code: string) => Promise<ReponseAuCode>;
}

const HORS_LIGNE = 'La vérification n’a pas pu se faire. Vérifiez la connexion, puis réessayez.';

export function useCodePrivilege(gestes: GestesDuCode): CodePrivilegeAffiche {
	const [saisie, setSaisie] = useState('');
	const [etape, setEtape] = useState<CodePrivilegeAffiche['etape']>('saisie');
	const [examen, setExamen] = useState<ExamenAffiche | null>(null);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function demander(
		geste: (code: string) => Promise<ReponseAuCode>,
		suite: 'examine' | 'active'
	) {
		setErreur(null);
		setEnCours(true);
		try {
			const reponse = await geste(saisie);
			if (!reponse.ok) {
				setErreur(reponse.raison);
				// Un refus à l'activation (révoqué entre-temps) rend la saisie.
				setEtape('saisie');
				return;
			}
			setExamen({ titre: reponse.titre, consequences: reponse.consequences });
			setEtape(suite);
		} catch {
			setErreur(HORS_LIGNE);
		} finally {
			setEnCours(false);
		}
	}

	return {
		saisie,
		onSaisir: (valeur) => {
			setSaisie(saisieDuCode(valeur));
			setErreur(null);
		},
		etape,
		examen,
		enCours,
		erreur,
		onVerifier: () => void demander(gestes.examiner, 'examine'),
		onModifier: () => {
			setEtape('saisie');
			setExamen(null);
		},
		onActiver: () => void demander(gestes.utiliser, 'active')
	};
}

/** La page « Code privilège » du Compte ; chaque ouverture repart d'une saisie vide (`key`). */
export function CodePrivilegeEnPlace({
	ouverte,
	onFermer
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
}) {
	const examiner = useAction(api.codesPrivilege.examinerUnCode);
	const utiliser = useAction(api.codesPrivilege.utiliserUnCode);
	const code = useCodePrivilege({
		examiner: (c) => examiner({ code: c }),
		utiliser: (c) => utiliser({ code: c })
	});
	return <FeuilleCodePrivilege ouverte={ouverte} onFermer={onFermer} code={code} />;
}
