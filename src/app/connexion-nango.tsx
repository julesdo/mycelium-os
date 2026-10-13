import { Fragment, useRef, useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import type Nango from '@nangohq/frontend';
import { useQuery } from './donnees';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { useMinute } from '../ui/minute';
import { pluriel } from '../ui/format';
import {
	AnnuleesALaSource,
	BrancherUnAutreLogiciel,
	CarteConnexion,
	ConfirmationDebranchement,
	ParcoursLogiciels,
	PictoLogiciel,
	LogoConnexion,
	MonogrammeConnexion,
	type EtatConnexion,
	type EtatDuBranchement,
	type EtatDuCatalogue,
	type LogicielABrancher,
	type ModeDeBranchement,
	type SaisieDeBranchement
} from '../ui';
import { COUVERTURE_QONTO, depuisLisible } from './connexion-qonto';
import { messageDeRefus } from './televerser';

/**
 * LES LOGICIELS DU GÉRANT, BRANCHÉS PAR NANGO (13/10/2026).
 *
 * Une carte « Vos logiciels » tant que rien n'est branché, puis une carte par
 * logiciel branché, avec son état en direct. Le parcours (`ParcoursLogiciels`)
 * s'ouvre de la carte, et tout ce qui touche au réseau vit ici.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA FENÊTRE S'OUVRE DANS LE CLIC
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le SDK de Nango ouvre la fenêtre d'autorisation (`window.open`) au début de
 * `nango.auth()`, et Safari bloque toute fenêtre ouverte après une attente. Le
 * SDK et la session se préparent donc AU CHOIX du logiciel, pendant qu'on lit
 * l'étape de l'accès ; le bouton reste inerte jusque-là, et son clic appelle
 * `auth()` sans rien attendre avant.
 *
 * ⚠️ LE SDK SE CHARGE À LA DEMANDE : le paquet d'entrée ne porte que le socle.
 *
 * ⚠️ RIEN N'EST CRU SUR PAROLE. Le navigateur rapporte un identifiant de
 * connexion ; le serveur la relit chez Nango et vérifie son étiquette avant de
 * l'enregistrer (`confirmerConnexionNango`).
 */

export const PROMESSE_NANGO =
	'Pennylane, QuickBooks, Xero, Sellsy, Stripe, Zoho… Vos factures arrivent seules, et passent payées quand elles le sont.';

/**
 * LES LOGOS OFFICIELS, par fournisseur chez Nango : repris du dépôt public de
 * Nango (`packages/webapp/public/images/template-logos`, relevé le 13/10/2026),
 * relus (aucun script, aucune référence externe) et auto-hébergés.
 */
const LOGO_DU_FOURNISSEUR: Readonly<Record<string, string>> = {
	pennylane: '/connecteurs/logo-pennylane.svg',
	'pennylane-company-api': '/connecteurs/logo-pennylane.svg',
	quickbooks: '/connecteurs/logo-quickbooks.svg',
	xero: '/connecteurs/logo-xero.svg',
	sellsy: '/connecteurs/logo-sellsy.svg',
	stripe: '/connecteurs/logo-stripe.svg',
	'stripe-api-key': '/connecteurs/logo-stripe.svg',
	'zoho-books': '/connecteurs/logo-zoho-books.svg',
	'zoho-invoice': '/connecteurs/logo-zoho-invoice.svg'
};

export function logoDuFournisseur(fournisseur: string): string | undefined {
	return LOGO_DU_FOURNISSEUR[fournisseur];
}

/** Dans la tuile d'une carte branchée : le logo officiel, ou l'initiale faute de mieux. */
function LogoDuLogiciel({
	nom,
	fournisseur
}: {
	readonly nom: string;
	readonly fournisseur: string;
}) {
	const logo = logoDuFournisseur(fournisseur);
	return logo === undefined ? (
		<MonogrammeConnexion lettre={nom.charAt(0).toUpperCase()} />
	) : (
		<LogoConnexion src={logo} />
	);
}

/** La rangée de la carte d'appel : un logo par logiciel, dans l'ordre de la promesse. */
export const LOGOS_DE_LA_PROMESSE: readonly { readonly nom: string; readonly src: string }[] = [
	{ nom: 'Pennylane', src: '/connecteurs/logo-pennylane.svg' },
	{ nom: 'QuickBooks', src: '/connecteurs/logo-quickbooks.svg' },
	{ nom: 'Xero', src: '/connecteurs/logo-xero.svg' },
	{ nom: 'Sellsy', src: '/connecteurs/logo-sellsy.svg' },
	{ nom: 'Stripe', src: '/connecteurs/logo-stripe.svg' },
	{ nom: 'Zoho Books', src: '/connecteurs/logo-zoho-books.svg' }
];

/** Comment chaque logiciel se branche, d'après son fournisseur chez Nango. */
function modeDuFournisseur(fournisseur: string): ModeDeBranchement {
	if (fournisseur === 'pennylane-company-api') return 'CLE_PENNYLANE';
	if (fournisseur === 'stripe-api-key') return 'CLE_STRIPE';
	if (fournisseur === 'zoho-books' || fournisseur === 'zoho-invoice') return 'REGION_ZOHO';
	return 'AUTORISATION';
}

/** Une erreur du SDK porte son `type` (`window_closed`, `blocked_by_browser`…). */
function typeDErreurNango(erreur: unknown): string | null {
	if (erreur instanceof Error && 'type' in erreur && typeof erreur.type === 'string')
		return erreur.type;
	return null;
}

/** Ce que le gérant lit quand le branchement n'aboutit pas : quoi, et quoi faire. */
function messageDeLEchec(erreur: unknown, logiciel: LogicielABrancher): string {
	// Un refus de notre serveur (la vérification) dit lui-même ce qui ne va pas.
	if (erreur instanceof Error && 'data' in erreur) return messageDeRefus(erreur);
	const type = typeDErreurNango(erreur);
	const parCle = logiciel.mode === 'CLE_PENNYLANE' || logiciel.mode === 'CLE_STRIPE';
	switch (type) {
		case 'blocked_by_browser':
			return `Votre navigateur a bloqué la fenêtre de ${logiciel.nom}. Autorisez les fenêtres pour ce site, puis réessayez.`;
		case 'window_closed':
			return `La fenêtre de ${logiciel.nom} a été fermée avant la fin. Rien n’a été branché.`;
		case 'missing_connect_session_token':
		case 'missing_auth_token':
			return 'La session de connexion a expiré. Réessayez : une nouvelle se prépare.';
		case 'resource_capped':
			return 'Le nombre de logiciels branchés a atteint la limite de notre compte de connexion. Réessayez plus tard.';
		case null:
			return `La connexion avec ${logiciel.nom} n’a pas abouti. Réessayez dans un instant.`;
		default:
			return parCle
				? `${logiciel.nom} a refusé cette clé. Vérifiez qu’elle est entière et toujours valable, ou créez-en une nouvelle.`
				: `${logiciel.nom} n’a pas confirmé l’accès. Réessayez, en acceptant l’accès dans sa fenêtre.`;
	}
}

/** L'état d'une connexion Nango, tel que la carte le dit. */
function etatDeLaConnexion(
	connexion: {
		readonly statut: string;
		readonly derniereSynchro: number | null;
		readonly facturesLues: number;
		readonly facturesNonLues: number;
		readonly erreur: string | null;
	},
	minute: number | null
): EtatConnexion {
	switch (connexion.statut) {
		// Enregistrée, la première lecture part : c'est déjà la lecture, pour le gérant.
		case 'EN_ATTENTE':
		case 'SYNCHRONISATION':
			return { genre: 'SYNCHRONISATION', facturesLues: connexion.facturesLues };
		case 'A_JOUR':
			return {
				genre: 'A_JOUR',
				facturesLues: connexion.facturesLues,
				nonLues: connexion.facturesNonLues,
				depuis:
					connexion.derniereSynchro === null
						? 'à l’instant'
						: depuisLisible(connexion.derniereSynchro, minute)
			};
		case 'REVOQUEE':
			return { genre: 'REVOQUEE' };
		default:
			return { genre: 'ECHEC', message: connexion.erreur ?? 'La lecture a échoué.' };
	}
}

/** La ligne de lecture sous la coche de fin : ce que le serveur publie, en direct. */
function ligneDeLecture(
	connexion: { readonly statut: string; readonly facturesLues: number } | undefined
): string {
	if (connexion === undefined || connexion.statut === 'EN_ATTENTE')
		return 'La lecture de vos factures commence…';
	if (connexion.statut === 'SYNCHRONISATION')
		return connexion.facturesLues === 0
			? 'Lecture de vos factures…'
			: `${connexion.facturesLues} facture${pluriel(connexion.facturesLues)} lue${pluriel(connexion.facturesLues)}…`;
	if (connexion.statut === 'A_JOUR')
		return `${connexion.facturesLues} facture${pluriel(connexion.facturesLues)} lue${pluriel(connexion.facturesLues)}`;
	return 'La lecture n’a pas encore abouti : la carte dit pourquoi.';
}

/**
 * LE PARCOURS ET SON ÉTAT : ouvrir, choisir, brancher. Rendu par la carte qui
 * l'ouvre ; `ouvrir({ reconnecter })` saute le choix pour rebrancher un logiciel
 * en panne.
 */
function useParcoursNango({ avecExport }: { readonly avecExport: boolean }) {
	const lister = useAction(api.connexions.nango.logicielsNango);
	const ouvrirSession = useAction(api.connexions.nango.ouvrirSessionNango);
	const confirmer = useAction(api.connexions.nango.confirmerConnexionNango);
	const navigate = useNavigate();

	const [ouvert, setOuvert] = useState(false);
	const [catalogue, setCatalogue] = useState<EtatDuCatalogue>({ genre: 'CHARGEMENT' });
	const [branchement, setBranchement] = useState<EtatDuBranchement>({ genre: 'CHOIX' });
	const [branchee, setBranchee] = useState<Id<'connexionsNango'> | null>(null);
	/** Le SDK prêt, avec la session du logiciel choisi : lu dans le clic, sans attente. */
	const session = useRef<{ readonly integrationId: string; readonly nango: Nango } | null>(null);
	/** Chaque préparation porte un numéro : une réponse en retard sur un autre choix est ignorée. */
	const tentative = useRef(0);
	/** La connexion en panne que ce branchement remplace (« Reconnecter »). */
	const remplace = useRef<Id<'connexionsNango'> | null>(null);

	const preparer = (logiciel: LogicielABrancher, message?: string) => {
		const numero = ++tentative.current;
		session.current = null;
		setBranchement(
			message === undefined
				? { genre: 'PREPARATION', logiciel }
				: { genre: 'PRET', logiciel, message }
		);
		Promise.all([
			import('@nangohq/frontend'),
			ouvrirSession({ integrationId: logiciel.integrationId })
		])
			.then(([module, { jeton, hote }]) => {
				if (numero !== tentative.current) return;
				session.current = {
					integrationId: logiciel.integrationId,
					nango: new module.default({ connectSessionToken: jeton, host: hote })
				};
				// Après un échec, la phrase qui le dit reste : seule la session change.
				if (message === undefined) setBranchement({ genre: 'PRET', logiciel });
			})
			.catch((erreur: unknown) => {
				if (numero !== tentative.current) return;
				setBranchement({ genre: 'PRET', logiciel, message: messageDeRefus(erreur) });
			});
	};

	const ouvrir = (
		options: {
			readonly reconnecter?: { readonly integrationId: string; readonly id: Id<'connexionsNango'> };
		} = {}
	) => {
		tentative.current += 1;
		session.current = null;
		remplace.current = options.reconnecter?.id ?? null;
		setBranchee(null);
		setBranchement({ genre: 'CHOIX' });
		setCatalogue({ genre: 'CHARGEMENT' });
		setOuvert(true);
		const numero = tentative.current;
		lister({})
			.then((liste) => {
				if (numero !== tentative.current) return;
				const logiciels = liste.map((l) => ({
					integrationId: l.integrationId,
					nom: l.nom,
					mode: modeDuFournisseur(l.fournisseur),
					...(logoDuFournisseur(l.fournisseur) === undefined
						? {}
						: { logo: logoDuFournisseur(l.fournisseur)! }),
					dejaBranche: 0
				}));
				setCatalogue({ genre: 'PRET', logiciels });
				const cible = options.reconnecter;
				const aRebrancher =
					cible === undefined
						? undefined
						: logiciels.find((l) => l.integrationId === cible.integrationId);
				if (aRebrancher !== undefined) preparer(aRebrancher);
			})
			.catch((erreur: unknown) => {
				if (numero !== tentative.current) return;
				setCatalogue({ genre: 'ECHEC', message: messageDeRefus(erreur) });
			});
	};

	const fermer = () => {
		tentative.current += 1;
		session.current = null;
		setOuvert(false);
	};

	const brancher = (logiciel: LogicielABrancher, saisie: SaisieDeBranchement) => {
		const prete = session.current;
		if (prete === null || prete.integrationId !== logiciel.integrationId) {
			preparer(logiciel);
			return;
		}
		// Une session ne sert qu'une fois : la suivante se prépare si celle-ci échoue.
		session.current = null;
		const numero = ++tentative.current;
		// ⚠️ AUCUNE ATTENTE AVANT `auth()` : la fenêtre s'ouvre dans ce clic.
		const autorisation =
			saisie.genre === 'CLE'
				? prete.nango.auth(logiciel.integrationId, {
						credentials:
							logiciel.mode === 'CLE_STRIPE'
								? { username: saisie.cle, password: '' }
								: { apiKey: saisie.cle }
					})
				: prete.nango.auth(logiciel.integrationId, {
						detectClosedAuthWindow: true,
						...(saisie.genre === 'REGION' ? { params: { extension: saisie.extension } } : {})
					});
		setBranchement({ genre: 'AUTORISATION', logiciel });
		autorisation
			.then((resultat) => {
				// ⚠️ CONFIRMÉE MÊME SI L'ÉCRAN A ÉTÉ FERMÉ ENTRE-TEMPS : l'accès existe déjà
				// chez Nango, et sans webhook configuré, rien d'autre ne le rattacherait.
				if (numero === tentative.current) setBranchement({ genre: 'VERIFICATION', logiciel });
				return confirmer({
					connectionId: resultat.connectionId,
					integrationId: logiciel.integrationId,
					...(remplace.current === null ? {} : { remplace: remplace.current })
				});
			})
			.then((id) => {
				remplace.current = null;
				if (numero !== tentative.current) return;
				setBranchee(id);
				setBranchement({ genre: 'BRANCHE', logiciel, lecture: '' });
			})
			.catch((erreur: unknown) => {
				if (numero !== tentative.current) return;
				preparer(logiciel, messageDeLEchec(erreur, logiciel));
			});
	};

	return {
		ouvrir,
		rendu: (
			connexions: readonly {
				readonly id: Id<'connexionsNango'>;
				readonly integrationId: string;
				readonly statut: string;
				readonly facturesLues: number;
			}[]
		) => {
			const lu = branchee === null ? undefined : connexions.find((c) => c.id === branchee);
			// Le catalogue compte ce qui est déjà branché, au rendu : une connexion qui
			// arrive pendant qu'on lit la liste s'y voit tout de suite.
			const catalogueAffiche: EtatDuCatalogue =
				catalogue.genre !== 'PRET'
					? catalogue
					: {
							genre: 'PRET',
							logiciels: catalogue.logiciels.map((l) => ({
								...l,
								dejaBranche: connexions.filter((c) => c.integrationId === l.integrationId).length
							}))
						};
			return (
				<ParcoursLogiciels
					ouvert={ouvert}
					onFermer={fermer}
					catalogue={catalogueAffiche}
					branchement={
						branchement.genre === 'BRANCHE'
							? { ...branchement, lecture: ligneDeLecture(lu) }
							: branchement
					}
					onChoisir={(logiciel) => preparer(logiciel)}
					onRetour={() => {
						tentative.current += 1;
						session.current = null;
						setBranchement({ genre: 'CHOIX' });
					}}
					onBrancher={brancher}
					modeTestPermis={import.meta.env.DEV}
					{...(avecExport
						? {
								onDeposerUnExport: () => {
									fermer();
									void navigate({ to: '/app/coffre', search: { deposer: 1 } });
								}
							}
						: {})}
				/>
			);
		}
	};
}

/**
 * LES CARTES DES LOGICIELS : « Vos logiciels » tant que rien n'est branché, puis
 * une carte par logiciel. Rien ne s'affiche tant que Nango n'est pas activé
 * (aucune clé posée) : l'import reste alors le geste principal.
 *
 * `principale` : la carte d'appel porte le bouton plein, sauf si une autre carte
 * (Qonto) le porte déjà sur l'écran. `avecExport` : le parcours propose le dépôt
 * d'un export, sauf là où le dépôt est déjà à l'écran.
 */
export function CartesLogiciels({
	principale = true,
	avecExport = true
}: { readonly principale?: boolean; readonly avecExport?: boolean } = {}) {
	const etat = useQuery(api.connexions.nangoDonnees.mesConnexionsNango, {});
	const role = useQuery(api.organizations.getMyOrgMembership, {});
	const synchroniser = useAction(api.connexions.nango.synchroniserNango);
	const debrancher = useAction(api.connexions.nango.debrancherNango);
	const effacerAnnulees = useMutation(api.connexions.nangoDonnees.effacerAnnulees);
	const minute = useMinute();
	const parcours = useParcoursNango({ avecExport });
	const [aDebrancher, setADebrancher] = useState<Id<'connexionsNango'> | null>(null);
	const [debranchement, setDebranchement] = useState<{
		readonly enCours: boolean;
		readonly message: string | null;
	}>({ enCours: false, message: null });

	if (etat === undefined || !etat.disponible) return null;
	const admin = role?.role === 'ORG_ADMIN';
	const { connexions } = etat;
	// Un membre qui n'administre pas ne peut rien brancher : la carte d'appel ne lui sert à rien.
	if (connexions.length === 0 && !admin) return null;
	const cible = aDebrancher === null ? undefined : connexions.find((c) => c.id === aDebrancher);

	return (
		<>
			{connexions.length === 0 ? (
				<CarteConnexion
					principale={principale}
					nom="Vos logiciels"
					nomDansLaPhrase="un logiciel"
					promesse={PROMESSE_NANGO}
					logo={<PictoLogiciel />}
					logos={LOGOS_DE_LA_PROMESSE}
					couverture={COUVERTURE_QONTO}
					etat={{ genre: 'A_CONNECTER' }}
					onConnecter={() => parcours.ouvrir()}
				/>
			) : (
				connexions.map((connexion) => (
					<Fragment key={connexion.id}>
						<CarteConnexion
							principale={false}
							nom={connexion.nom}
							promesse=""
							logo={<LogoDuLogiciel nom={connexion.nom} fournisseur={connexion.fournisseur} />}
							etat={etatDeLaConnexion(connexion, minute)}
							onSynchroniser={() => void synchroniser({ id: connexion.id })}
							{...(admin
								? {
										onConnecter: () =>
											parcours.ouvrir({
												reconnecter: { integrationId: connexion.integrationId, id: connexion.id }
											}),
										onDeconnecter: () => {
											setDebranchement({ enCours: false, message: null });
											setADebrancher(connexion.id);
										}
									}
								: {})}
						/>
						<AnnuleesALaSource
							nom={connexion.nom}
							references={connexion.annuleesALaSource}
							{...(admin ? { onVerifie: () => void effacerAnnulees({ id: connexion.id }) } : {})}
						/>
					</Fragment>
				))
			)}

			{connexions.length > 0 && admin ? (
				<BrancherUnAutreLogiciel onClick={() => parcours.ouvrir()} />
			) : null}

			{parcours.rendu(connexions)}

			<ConfirmationDebranchement
				ouverte={cible !== undefined}
				nom={cible?.nom ?? ''}
				{...(cible === undefined || logoDuFournisseur(cible.fournisseur) === undefined
					? {}
					: { logo: logoDuFournisseur(cible.fournisseur)! })}
				facturesLues={cible?.facturesLues ?? 0}
				enCours={debranchement.enCours}
				message={debranchement.message}
				onFermer={() => setADebrancher(null)}
				onConfirmer={() => {
					if (cible === undefined || debranchement.enCours) return;
					setDebranchement({ enCours: true, message: null });
					debrancher({ id: cible.id })
						.then(() => {
							setADebrancher(null);
							setDebranchement({ enCours: false, message: null });
						})
						.catch((erreur: unknown) =>
							setDebranchement({ enCours: false, message: messageDeRefus(erreur) })
						);
				}}
			/>
		</>
	);
}

/**
 * CE QUE NOMME LA RANGÉE « CONNEXIONS » DU COMPTE : le plus pressant d'abord (à
 * rebrancher, puis en lecture), et les noms de tout ce qui est branché.
 */
export function resumeDesConnexions(
	qonto: { readonly disponible: boolean; readonly statut: string | null } | undefined,
	nango:
		| {
				readonly disponible: boolean;
				readonly connexions: readonly { readonly nom: string; readonly statut: string }[];
		  }
		| undefined
): { readonly statut: string | null; readonly nom: string } {
	const branches: { nom: string; statut: string }[] = [
		...(qonto?.disponible && qonto.statut !== null && qonto.statut !== 'EN_ATTENTE'
			? [{ nom: 'Qonto', statut: qonto.statut }]
			: []),
		...(nango?.disponible ? nango.connexions : [])
	];
	if (branches.length === 0) return { statut: null, nom: 'Qonto' };
	const rang = (statut: string) =>
		statut === 'ECHEC' || statut === 'REVOQUEE'
			? 0
			: statut === 'SYNCHRONISATION' || statut === 'EN_ATTENTE'
				? 1
				: 2;
	const pressant = [...branches].sort((a, b) => rang(a.statut) - rang(b.statut))[0]!;
	const noms = [...new Set(branches.map((b) => b.nom))];
	return {
		statut: pressant.statut === 'EN_ATTENTE' ? 'SYNCHRONISATION' : pressant.statut,
		nom: noms.length <= 2 ? noms.join(' et ') : `${noms[0]} et ${noms.length - 1} autres`
	};
}

/**
 * LES CARTES DES LOGICIELS S'AFFICHERONT-ELLES ? Nango activé, et un logiciel
 * branché ou un administrateur pour en brancher un. L'écran qui les accueille
 * s'en sert pour garder l'import en geste principal quand elles ne viennent pas :
 * une pile vide le rétrograderait sous une carte absente.
 */
export function useLogicielsVisibles(): boolean {
	const etat = useQuery(api.connexions.nangoDonnees.mesConnexionsNango, {});
	const role = useQuery(api.organizations.getMyOrgMembership, {});
	if (etat === undefined || !etat.disponible) return false;
	return etat.connexions.length > 0 || role?.role === 'ORG_ADMIN';
}
