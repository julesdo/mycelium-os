import { useState, type ReactNode } from 'react';
import { useCodePrivilege, type ReponseAuCode } from '../../app/code-privilege';
import { FeuilleCodePrivilege } from '../../screens/compte/code-privilege';
import {
	REFUS_DU_CODE,
	consequencesDuCode,
	libelleDeLAvantage,
	normaliserCode,
	type AvantagePrivilege
} from '../../lib/paiement/codes-privilege';

/**
 * « CODE PRIVILÈGE » DANS LA SALLE (27/10/2026) : la vraie page et le vrai enchaînement
 * (`useCodePrivilege`), sur des réponses écrites d'avance. `ABCD-EFGH-JKMN-PQRS` offre
 * Pro à vie, `WXYZ-WXYZ-WXYZ-WXYZ` −50 % pendant 3 mois ; tout autre code est refusé.
 */

const CODES_DEMO: Readonly<Record<string, AvantagePrivilege>> = {
	ABCDEFGHJKMNPQRS: { genre: 'A_VIE', formule: 'pro' },
	WXYZWXYZWXYZWXYZ: { genre: 'REMISE', pourcent: 50, mois: 3 }
};

const ETABLISSEMENT_DEMO = {
	accesOffert: false,
	remiseEnAttente: false,
	abonnement: {
		statut: 'active' as const,
		formule: 'equipe' as const,
		rythme: 'mensuel' as const,
		resilie: false
	}
};

async function repondre(code: string): Promise<ReponseAuCode> {
	await new Promise((r) => setTimeout(r, 400));
	const avantage = CODES_DEMO[normaliserCode(code) ?? ''];
	if (avantage === undefined) return { ok: false, raison: REFUS_DU_CODE };
	return {
		ok: true,
		titre: libelleDeLAvantage(avantage),
		consequences: [...consequencesDuCode(avantage, ETABLISSEMENT_DEMO)]
	};
}

/** La page du code, ouverte d'emblée pour la variante « code privilège » du compte. */
export function useCodeDemo(variante: string | undefined): {
	readonly ouvrir: () => void;
	readonly feuille: ReactNode;
} {
	const [ouverte, setOuverte] = useState(variante === 'code privilège');
	const [ouvertures, setOuvertures] = useState(0);
	return {
		ouvrir: () => {
			setOuvertures((n) => n + 1);
			setOuverte(true);
		},
		feuille: <FeuilleDemo key={ouvertures} ouverte={ouverte} onFermer={() => setOuverte(false)} />
	};
}

function FeuilleDemo({
	ouverte,
	onFermer
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
}) {
	const code = useCodePrivilege({ examiner: repondre, utiliser: repondre });
	return <FeuilleCodePrivilege ouverte={ouverte} onFermer={onFermer} code={code} />;
}
