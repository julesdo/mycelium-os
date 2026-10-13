import { useState, type ReactNode } from 'react';
import type {
	EtablissementPropose,
	EtatDirigeants,
	EtatRecherche,
	ProgressionPremiersPas
} from '../../ui';
import { EcranPlumeSePresente } from '../../screens/premiers-pas/plume';
import { EcranEntreprise } from '../../screens/premiers-pas/entreprise';
import { EcranFactures, type EtatDesFactures } from '../../screens/premiers-pas/factures';
import { EcranLettres, type EnTeteSaisi } from '../../screens/premiers-pas/lettres';
import { EcranRelances } from '../../screens/premiers-pas/relances';
import { EcranPret } from '../../screens/premiers-pas/pret';
import { formeDemo, type EcranDuProduit } from './demo';

/**
 * LES PREMIERS PAS, DANS LA SALLE (13/10/2026) — chaque étape, chaque phase.
 *
 * ⚠️ DEUX CANDIDATS AU MOINS DANS L'ÉTAT « TROUVÉ ». Une liste à un seul
 * élément ferait croire que le produit peut choisir tout seul — il ne le peut
 * pas, et c'est la seule erreur de ce produit qui rende une réponse rassurante
 * ET fausse. La démonstration montre donc deux homonymes de villes différentes.
 *
 * ⚠️ CHAQUE DÉMONSTRATION SE REMONTE SUR SA VARIANTE (`key`) : elle tient son
 * propre état, et deux variantes rendues au même endroit sous le même type
 * partageraient celui de la première.
 */

const CANDIDATS: readonly EtablissementPropose[] = [
	{
		siren: '732829320',
		denomination: 'FOURNITURES DURAND ET FILS',
		formeJuridique: 'Société par actions simplifiée',
		ville: 'Fécamp',
		adresse: '6 Place Nicolas Selle 76400 Fécamp',
		derniereParution: '2026-03-18'
	},
	{
		siren: '421931452',
		denomination: 'FOURNITURES DURAND',
		formeJuridique: 'Société à responsabilité limitée',
		ville: 'Rouen',
		adresse: '12 Rue Jeanne d’Arc 76000 Rouen',
		derniereParution: '2024-11-02'
	},
	{
		siren: '552100554',
		denomination: 'DURAND ET FILS',
		formeJuridique: 'Entrepreneur individuel',
		ville: 'Le Havre',
		derniereParution: '2021-06-30'
	}
];

const TOTAL = 6;
const rien = () => undefined;

function progression(rang: number, gestes: Omit<ProgressionPremiersPas, 'rang' | 'total'> = {}) {
	return { rang, total: TOTAL, ...gestes };
}

function DemoPlume() {
	const [nom, setNom] = useState('');
	return (
		<EcranPlumeSePresente
			progression={progression(0)}
			nom={nom}
			onNom={setNom}
			enCours={false}
			onContinuer={rien}
		/>
	);
}

function DemoEntreprise({
	phase,
	retenuInitial = null,
	erreur = null
}: {
	readonly phase: EtatRecherche;
	readonly retenuInitial?: EtablissementPropose | null;
	readonly erreur?: string | null;
}) {
	const [nom, setNom] = useState(retenuInitial?.denomination ?? 'Fournitures Durand');
	const [recherche, setRecherche] = useState<EtatRecherche>(phase);
	const [retenu, setRetenu] = useState<EtablissementPropose | null>(retenuInitial);
	return (
		<EcranEntreprise
			progression={progression(1, { onRetour: rien })}
			nom={nom}
			onNom={setNom}
			recherche={recherche}
			retenu={retenu}
			onChercher={() => setRecherche({ phase: 'TROUVE', candidats: CANDIDATS })}
			onRetenir={(candidat) => {
				setRetenu(candidat);
				setNom(candidat.denomination);
				setRecherche({ phase: 'REPOS' });
			}}
			onChanger={() => setRetenu(null)}
			enCours={false}
			erreur={erreur}
			onCreer={rien}
		/>
	);
}

function DemoFactures({
	etat,
	connexions
}: {
	readonly etat: EtatDesFactures;
	readonly connexions?: ReactNode;
}) {
	return (
		<EcranFactures
			progression={progression(2, { onPlusTard: rien })}
			etat={etat}
			{...(connexions === undefined ? {} : { connexions })}
			onImporter={rien}
			onContinuer={rien}
		/>
	);
}

function DemoLettres({ dirigeants }: { readonly dirigeants?: EtatDirigeants }) {
	const [saisie, setSaisie] = useState<EnTeteSaisi>({
		signataireNom: 'Camille Durand',
		signataireQualite: '',
		email: 'camille@fournitures-durand.fr',
		iban: ''
	});
	return (
		<EcranLettres
			progression={progression(3, { onRetour: rien, onPlusTard: rien })}
			denomination="FOURNITURES DURAND ET FILS"
			adresse="6 Place Nicolas Selle 76400 Fécamp"
			saisie={saisie}
			onSaisie={(changement) => setSaisie((avant) => ({ ...avant, ...changement }))}
			{...(dirigeants === undefined ? {} : { dirigeants })}
			onDemanderDirigeants={rien}
			enCours={false}
			erreur={null}
			onEnregistrer={rien}
		/>
	);
}

const FORMES: Readonly<Record<string, () => ReactNode>> = {
	'entreprise · recherche en cours': () => <DemoEntreprise phase={{ phase: 'EN_COURS' }} />,
	'entreprise · le registre propose': () => (
		<DemoEntreprise phase={{ phase: 'TROUVE', candidats: CANDIDATS }} />
	),
	'entreprise · retenue': () => (
		<DemoEntreprise phase={{ phase: 'REPOS' }} retenuInitial={CANDIDATS[0] ?? null} />
	),
	'entreprise · forme non tranchée': () => (
		<DemoEntreprise phase={{ phase: 'REPOS' }} retenuInitial={CANDIDATS[2] ?? null} />
	),
	'entreprise · aucune annonce': () => <DemoEntreprise phase={{ phase: 'AUCUN' }} />,
	'entreprise · registre muet': () => (
		<DemoEntreprise
			phase={{
				phase: 'ECHEC',
				message: 'Le registre a répondu 503. La recherche n’a pas pu aboutir.'
			}}
		/>
	),
	'entreprise · refus du serveur': () => (
		<DemoEntreprise
			phase={{ phase: 'REPOS' }}
			retenuInitial={CANDIDATS[0] ?? null}
			erreur="« 732829321 » n’est pas un SIREN : sa clé de contrôle ne tombe pas."
		/>
	),
	'factures · à déposer': () => <DemoFactures etat={{ phase: 'A_DEPOSER' }} />,
	'factures · en lecture': () => <DemoFactures etat={{ phase: 'EN_LECTURE', documents: 3 }} />,
	'factures · comptées': () => (
		<DemoFactures
			etat={{
				phase: 'COMPTE',
				arreteAu: '2026-10-13',
				total: 4_812_744n,
				principal: 4_365_000n,
				interets: 327_744n,
				indemnites: 120_000n,
				nombreFactures: 23,
				nombreClients: 9,
				enLecture: 1
			}}
		/>
	),
	'factures · rien d’échu': () => <DemoFactures etat={{ phase: 'RIEN_D_ECHU', documents: 4 }} />,
	lettres: () => <DemoLettres />,
	'lettres · dirigeants proposés': () => (
		<DemoLettres
			dirigeants={{
				phase: 'TROUVE',
				releveeLe: '2026-10-13',
				dirigeants: [
					{ nom: 'Camille DURAND', fonction: 'Présidente de SAS' },
					{ nom: 'Marc DURAND', fonction: 'Directeur général' }
				]
			}}
		/>
	),
	relances: () => (
		<EcranRelances
			progression={progression(4, { onRetour: rien })}
			administrateur
			enTeteIncomplet={false}
			enCours={false}
			erreur={null}
			onActiver={rien}
			onPasMaintenant={rien}
		/>
	),
	'relances · membre, en-tête incomplet': () => (
		<EcranRelances
			progression={progression(4, { onRetour: rien })}
			administrateur={false}
			enTeteIncomplet
			enCours={false}
			erreur={null}
			onActiver={rien}
			onPasMaintenant={rien}
		/>
	),
	'c’est prêt': () => (
		<EcranPret
			progression={progression(5, { onRetour: rien })}
			prenom="Camille"
			lignes={[
				{ cle: 'entreprise', titre: 'Votre entreprise', ligne: 'SIREN 732 829 320', fait: true },
				{
					cle: 'factures',
					titre: 'Vos factures',
					ligne: '48 127,44 € dus sur 23 factures',
					fait: true
				},
				{ cle: 'lettres', titre: 'Vos lettres', ligne: 'Signées Camille Durand', fait: true },
				{
					cle: 'relances',
					titre: 'Les relances',
					ligne: 'Pas encore : vous déciderez',
					fait: false
				}
			]}
			libelleEntree="Voir ce qu’on vous doit"
			onEntrer={rien}
		/>
	)
};

const PRINCIPALE = (): ReactNode => <DemoPlume />;

export const ECRANS_BIENVENUE: readonly EcranDuProduit[] = [
	{
		route: '/bienvenue',
		libelle: 'premiers pas',
		vide: false,
		variantes: Object.keys(FORMES),
		Demo: ({ variante }) => {
			const Forme = formeDemo(variante, PRINCIPALE, FORMES);
			return <Forme key={variante ?? 'principale'} />;
		}
	}
];
