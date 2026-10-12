import { useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useToast } from '@cladd-ui/react';
import {
	AlarmClockIcon,
	ArchiveIcon,
	ArrowUpRightIcon,
	BriefcaseIcon,
	CalendarRangeIcon,
	HandCoinsIcon,
	HandIcon,
	LandmarkIcon,
	LinkIcon,
	LockIcon,
	MailIcon,
	MessageSquareWarningIcon,
	SendIcon,
	StickyNoteIcon,
	UserCheckIcon,
	UserMinusIcon
} from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import {
	NOMBRES_DE_VERSEMENTS,
	decrireGeste,
	type GenreGeste
} from '../lib/verticales/recouvrement/compagnon/gestes';
import { versements } from '../lib/verticales/recouvrement/gabarits/accord-echeancier';
import { useQuery } from './donnees';
import {
	ApercuDeGeste,
	BoutonSecondaire,
	CarteDeGeste,
	Lien,
	dateCourte,
	eurosCentimes,
	type AjustementDeGeste,
	type ChampDeGeste
} from '../ui';

/**
 * LES GESTES DE PLUME, À L'ÉCRAN — une seule fois pour les deux conversations
 * (12/10/2026) : celle d'un dossier et celle de l'établissement. L'icône de chaque
 * geste, ce qu'il ouvre, ce qui mène à ce qu'il a produit, et sa confirmation.
 *
 * ⚠️ DEUX COPIES FINIRAIENT PAR DIVERGER, et c'est le même geste : « Relancer »
 * proposé hors dossier doit faire et dire exactement ce qu'il fait dans le dossier.
 */

/** ⚠️ `ConvexError` PORTE SON MESSAGE DANS `.data`, PAS DANS `.message`. */
export function messageDeLaPanne(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'La demande n’a pas abouti.';
}

/** L'icône de chaque geste : ce qu'il touche, d'un coup d'œil. */
const ICONE_DU_GESTE: Readonly<Record<GenreGeste, ReactNode>> = {
	RELANCER: <SendIcon />,
	RAPPEL: <AlarmClockIcon />,
	PROMESSE: <HandCoinsIcon />,
	NOTE: <StickyNoteIcon />,
	EMAIL: <MailIcon />,
	RETIRER_DU_PILOTE: <UserMinusIcon />,
	REMETTRE_AU_PILOTE: <UserCheckIcon />,
	RETENIR: <HandIcon />,
	OUVRIR: <ArrowUpRightIcon />,
	CONTESTATION: <MessageSquareWarningIcon />,
	ARRETER_DECOMPTE: <LockIcon />,
	LIEN_PAIEMENT: <LinkIcon />,
	REMISE_CONSEIL: <BriefcaseIcon />,
	ECHEANCIER: <CalendarRangeIcon />,
	CLASSER: <ArchiveIcon />,
	REGLEMENT: <LandmarkIcon />
};

/** Un geste tel que le fil le rend. */
export interface GesteDuFil {
	readonly genre: GenreGeste;
	readonly date?: string;
	readonly montant?: bigint;
	readonly texte?: string;
	readonly etat: 'PROPOSEE' | 'FAITE' | 'ECARTEE';
	readonly resultat?: string;
	readonly cible?: string;
	readonly dossier?: string;
	readonly client?: string;
}

/** Ce qu'il faut savoir d'un dossier pour dessiner et ouvrir ses gestes. */
export interface DossierDesGestes {
	readonly id: string;
	readonly client: string;
	readonly debiteurId: string;
}

/** « 2000,50 » : un montant tel qu'on le retape, sans espace ni symbole. */
function enSaisie(centimes: bigint): string {
	return `${centimes / 100n},${(centimes % 100n).toString().padStart(2, '0')}`;
}

/**
 * CE QUI SE CORRIGE SUR LA CARTE, genre par genre — les mêmes champs que le serveur
 * accepte (`CHAMPS_MODIFIABLES`, dans `gestesPlume.ts`).
 */
function champsDu(geste: GesteDuFil): ChampDeGeste[] {
	const date = (libelle: string): ChampDeGeste => ({
		cle: 'date',
		libelle,
		valeur: geste.date ?? '',
		genre: 'date'
	});
	const montant: ChampDeGeste = {
		cle: 'montant',
		libelle: 'Montant, en euros',
		valeur: enSaisie(geste.montant ?? 0n),
		genre: 'montant'
	};
	const texte = (libelle: string): ChampDeGeste => ({
		cle: 'texte',
		libelle,
		valeur: geste.texte ?? '',
		genre: 'texte'
	});
	switch (geste.genre) {
		case 'RAPPEL':
			return [date('Le'), texte('Pour')];
		case 'PROMESSE':
			return [montant, date('Pour le')];
		case 'REGLEMENT':
			return [montant, date('Reçu le')];
		case 'ECHEANCIER':
			return [
				{
					cle: 'texte',
					libelle: 'En combien de fois',
					valeur: geste.texte ?? '3',
					genre: 'choix',
					choix: NOMBRES_DE_VERSEMENTS.map((n) => ({ valeur: String(n), libelle: `${n} fois` }))
				},
				date('Premier versement le')
			];
		case 'NOTE':
			return [texte('Ce qui est noté')];
		case 'EMAIL':
			return [texte('Son adresse')];
		case 'REMISE_CONSEIL':
			return [date('Remis le')];
		default:
			return [];
	}
}

/**
 * LES FACTURES QU'UN PAIEMENT RÈGLERA, MONTRÉES AVANT QU'IL S'ÉCRIVE — le même
 * rapprochement que « Virement reçu » sur la fiche (`lettrage.proposer`).
 */
function ApercuDuReglement({
	debiteurId,
	montant
}: {
	readonly debiteurId: string;
	readonly montant: bigint;
}) {
	const proposition = useQuery(api.recouvrement.lettrage.proposer, {
		debiteurId: debiteurId as Id<'debiteurs'>,
		montant
	});
	if (proposition === undefined)
		return <ApercuDeGeste lignes={[]} note="Je regarde ses factures…" />;
	if (proposition.issue === 'UNIQUE') {
		return (
			<ApercuDeGeste
				lignes={(proposition.combinaisons[0]?.references ?? []).map((reference) => ({
					titre: reference,
					valeur: 'soldée'
				}))}
				note="Ce montant solde exactement ces factures."
			/>
		);
	}
	if (proposition.issue === 'AUCUNE' && proposition.repartition !== undefined) {
		const { lignes, nonAffecte } = proposition.repartition;
		return (
			<ApercuDeGeste
				lignes={lignes.map((ligne) => ({
					titre: ligne.reference,
					valeur: `${eurosCentimes(ligne.montant)}${ligne.solde ? ' · soldée' : ''}`
				}))}
				note={
					lignes.length === 0
						? 'Aucune facture de ce client n’attend de paiement.'
						: nonAffecte > 0n
							? `Réparti dans l’ordre que prévoit la loi ; ${eurosCentimes(nonAffecte)} restent sans facture à régler.`
							: 'Réparti dans l’ordre que prévoit la loi.'
				}
			/>
		);
	}
	return (
		<ApercuDeGeste
			lignes={[]}
			note="Plusieurs jeux de factures font ce montant : vous choisirez lesquelles sur sa fiche."
		/>
	);
}

/** Les rubriques de la page d'un dossier qu'un écran à ouvrir désigne. */
const RUBRIQUE_DE_L_ECRAN: Readonly<Record<string, string | undefined>> = {
	COURRIERS: 'courriers',
	DOCUMENTS: 'pieces',
	PENALITES: 'decompte',
	// Anciens échanges : l'écran d'arrêt n'existe plus, le montant du jour vit là.
	ARRET: 'decompte',
	// « Qui fait l'acte » vit dans la rangée des suites ; la feuille est un état
	// d'écran, pas d'adresse : on mène à la rangée, le gérant ouvre le parcours.
	PROFESSIONNELS: 'voies',
	DOSSIER: undefined
};

export function useGestesDePlume({
	dossierDuFil,
	dossierParId,
	clientParId,
	onJoindre,
	onRelances
}: {
	/** La conversation d'un dossier : celui du fil. */
	readonly dossierDuFil?: DossierDesGestes;
	/** La conversation de l'établissement : le dossier qu'un geste nomme. */
	readonly dossierParId?: (id: string) => DossierDesGestes | undefined;
	/** Le nom d'un client, pour un geste qui montre sa fiche ou son démarrage. */
	readonly clientParId?: (id: string) => string | undefined;
	/** « Déposer des factures » joint directement à la conversation, quand elle le permet. */
	readonly onJoindre?: () => void;
	/** « Les relances automatiques » ouvre la feuille d'activation sur place. */
	readonly onRelances?: () => void;
}) {
	const navigate = useNavigate();
	const toast = useToast();
	const confirmerGeste = useMutation(api.recouvrement.gestesPlume.confirmer);
	const ecarterGeste = useMutation(api.recouvrement.gestesPlume.ecarter);
	const [gesteEnCours, setGesteEnCours] = useState<string | null>(null);

	const dossierDe = (geste: GesteDuFil): DossierDesGestes | undefined =>
		geste.dossier === undefined ? dossierDuFil : dossierParId?.(geste.dossier);

	/** CE QUE « OUVRIR » MONTRE : ce qui dit où, y mène. */
	function ouvrirEcran(geste: GesteDuFil) {
		const ecran = geste.texte ?? '';
		const dossier = dossierDe(geste);
		if (ecran === 'FICHE_CLIENT') {
			if (dossier !== undefined)
				void navigate({ to: '/app/clients/$id', params: { id: dossier.debiteurId } });
			return;
		}
		if (ecran in RUBRIQUE_DE_L_ECRAN) {
			if (dossier === undefined) return;
			const rubrique = RUBRIQUE_DE_L_ECRAN[ecran];
			void navigate({
				to: '/app/dossier/$id',
				params: { id: dossier.id },
				...(rubrique === undefined ? {} : { search: { ouvrir: rubrique as never } })
			});
			return;
		}
		if (ecran === 'CLIENT' && geste.client !== undefined) {
			void navigate({ to: '/app/clients/$id', params: { id: geste.client } });
			return;
		}
		if (ecran === 'DEMARRER') {
			// Hors dossier, le client est nommé ; dans un dossier, c'est le sien.
			const client = geste.client ?? dossier?.debiteurId;
			if (client !== undefined) void navigate({ to: '/app/demarrer/$id', params: { id: client } });
			return;
		}
		if (ecran === 'JOINDRE') {
			onJoindre?.();
			return;
		}
		switch (ecran) {
			case 'CE_QUI_EST_DU':
				void navigate({ to: '/app/revelation' });
				return;
			case 'DOSSIERS':
				void navigate({ to: '/app/dossiers' });
				return;
			case 'CLIENTS':
				void navigate({ to: '/app/clients' });
				return;
			case 'COFFRE':
				void navigate({ to: '/app/coffre' });
				return;
			case 'DEPOSER':
				if (onJoindre !== undefined) onJoindre();
				else void navigate({ to: '/app/coffre', search: { deposer: 1 } as never });
				return;
			case 'DEFENSE':
				void navigate({ to: '/app/defense' });
				return;
			case 'NOTIFICATIONS':
				void navigate({ to: '/app/notifications' });
				return;
			case 'DEMARRER_LOT':
				void navigate({ to: '/app/demarrer' });
				return;
			case 'RELANCES':
				if (onRelances !== undefined) onRelances();
				else void navigate({ to: '/app' });
				return;
			case 'COMPTE':
				void navigate({ to: '/app/compte' });
				return;
		}
	}

	/**
	 * CE QUI MÈNE À CE QU'UN GESTE A PRODUIT, une fois fait (08/10/2026) : le lien à
	 * copier et la page à voir, le courrier à relire, le décompte, l'historique, la
	 * fiche du client. « Qu'on puisse accéder directement aux éléments. »
	 */
	function accesDuGeste(geste: GesteDuFil): ReactNode | undefined {
		const dossier = dossierDe(geste);
		const versDossier = (ouvrir: string, libelle: string) =>
			dossier === undefined ? undefined : (
				<BoutonSecondaire
					as={Lien}
					to="/app/dossier/$id"
					// ⚠️ UNE ASSERTION : `as` efface le générique du routeur. La destination
					// reste vérifiée par `destinations-existent.test.ts`.
					params={{ id: dossier.id } as never}
					search={{ ouvrir } as never}
				>
					{libelle}
				</BoutonSecondaire>
			);
		const fiche =
			dossier === undefined ? undefined : (
				<BoutonSecondaire
					as={Lien}
					to="/app/clients/$id"
					params={{ id: dossier.debiteurId } as never}
				>
					Voir sa fiche
				</BoutonSecondaire>
			);
		switch (geste.genre) {
			case 'RELANCER':
			case 'RETENIR':
				return versDossier(
					'courriers',
					geste.genre === 'RELANCER' ? 'Relire le courrier' : 'Voir ses courriers'
				);
			case 'RAPPEL':
			case 'PROMESSE':
			case 'NOTE':
				return versDossier('suivi', 'Voir l’historique');
			case 'ECHEANCIER':
			case 'CLASSER':
				return versDossier('suivi', 'Voir le dossier');
			case 'CONTESTATION':
				return versDossier('litige', 'Voir vos réponses');
			case 'EMAIL':
			case 'RETIRER_DU_PILOTE':
			case 'REMETTRE_AU_PILOTE':
			case 'REGLEMENT':
				return fiche;
			case 'ARRETER_DECOMPTE':
			case 'REMISE_CONSEIL':
				return geste.cible === undefined ? (
					versDossier('decompte', 'Voir le décompte')
				) : (
					<BoutonSecondaire as={Lien} to="/app/decompte/$id" params={{ id: geste.cible } as never}>
						{geste.genre === 'ARRETER_DECOMPTE' ? 'Voir le décompte' : 'Voir le suivi'}
					</BoutonSecondaire>
				);
			case 'LIEN_PAIEMENT': {
				const jeton = geste.cible;
				return jeton === undefined ? (
					versDossier('decompte', 'Voir le lien')
				) : (
					<>
						<BoutonSecondaire
							onClick={() => {
								const lien = `${window.location.origin}/p/${jeton}`;
								void navigator.clipboard
									.writeText(lien)
									.then(() => toast({ title: 'Lien copié', text: lien }));
							}}
						>
							Copier le lien
						</BoutonSecondaire>
						<BoutonSecondaire as="a" href={`/p/${jeton}`} target="_blank" rel="noreferrer">
							Voir la page
						</BoutonSecondaire>
					</>
				);
			}
			case 'OUVRIR':
				return undefined;
		}
	}

	async function confirmer(
		echangeId: Id<'echangesCompagnon'>,
		rang: number,
		geste: GesteDuFil,
		ajustement: AjustementDeGeste | null = null
	): Promise<boolean> {
		if (geste.genre === 'OUVRIR') {
			ouvrirEcran(geste);
			return true;
		}
		const cle = `${echangeId}-${rang}`;
		setGesteEnCours(cle);
		try {
			await confirmerGeste({ echangeId, rang, ...(ajustement === null ? {} : { ajustement }) });
			return true;
		} catch (e) {
			toast({ title: 'Pas fait', text: messageDeLaPanne(e) });
			return false;
		} finally {
			setGesteEnCours(null);
		}
	}

	/** Ce que le geste écrira, montré sur sa carte tant qu'il est proposé. */
	function apercuDu(geste: GesteDuFil): ReactNode | undefined {
		if (geste.etat !== 'PROPOSEE') return undefined;
		if (geste.genre === 'ECHEANCIER' && geste.date !== undefined && geste.montant !== undefined) {
			const nombre = Number.parseInt(geste.texte ?? '0', 10);
			if (nombre < 2) return undefined;
			const calendrier = versements(geste.montant, nombre, geste.date, 1);
			const montres = calendrier.slice(0, 3);
			const dernier = calendrier[calendrier.length - 1];
			return (
				<ApercuDeGeste
					lignes={montres.map((versement) => ({
						titre: `${versement.numero === 1 ? '1er' : `${versement.numero}e`} versement · ${dateCourte(versement.date)}`,
						valeur: eurosCentimes(versement.montant)
					}))}
					{...(calendrier.length > montres.length && dernier !== undefined
						? {
								note: `Puis ${calendrier.length - montres.length} autre${calendrier.length - montres.length > 1 ? 's' : ''}, jusqu’au ${dateCourte(dernier.date)}. Hors pénalités.`
							}
						: { note: 'Hors pénalités.' })}
				/>
			);
		}
		if (geste.genre === 'REGLEMENT' && geste.montant !== undefined) {
			const dossier = dossierDe(geste);
			return dossier === undefined ? undefined : (
				<ApercuDuReglement debiteurId={dossier.debiteurId} montant={geste.montant} />
			);
		}
		return undefined;
	}

	/** Le surtitre d'une carte hors dossier : le client qu'elle touche. */
	function contexteDe(geste: GesteDuFil): string | undefined {
		if (geste.dossier !== undefined) return dossierParId?.(geste.dossier)?.client;
		if (geste.client !== undefined) return clientParId?.(geste.client);
		return undefined;
	}

	/**
	 * LE GESTE EN ATTENTE LE PLUS RÉCENT PORTE LE BOUTON PLEIN — un seul par écran.
	 * Les plus anciens, encore proposés, gardent un bouton de verre.
	 */
	function principalDe(
		tours: readonly {
			readonly _id: string;
			readonly gestes?: readonly { readonly etat: string }[];
		}[]
	): string | null {
		const dernier = [...tours]
			.reverse()
			.find((t) => (t.gestes ?? []).some((g) => g.etat === 'PROPOSEE'));
		return dernier === undefined
			? null
			: `${dernier._id}-${(dernier.gestes ?? []).findIndex((g) => g.etat === 'PROPOSEE')}`;
	}

	/** Les cartes des gestes d'un tour — et « Tout confirmer » quand il y en a plusieurs. */
	function cartes(
		echangeId: Id<'echangesCompagnon'>,
		gestes: readonly GesteDuFil[],
		principal: string | null
	): ReactNode[] {
		/*
		  « TOUT CONFIRMER » (Structured, « Accept all ») : quand Plume propose deux
		  gestes ou plus dans la même réponse, un toucher les fait tous, l'un après
		  l'autre, tels qu'ils sont écrits. Un écran à ouvrir n'en fait pas partie : il
		  quitterait la conversation au milieu.
		*/
		const enAttente = gestes
			.map((geste, rang) => ({ geste, rang }))
			.filter(({ geste }) => geste.etat === 'PROPOSEE' && geste.genre !== 'OUVRIR');
		const toutConfirmer =
			enAttente.length < 2 ? null : (
				<div key={`${echangeId}-tout`} className="flex justify-end">
					<BoutonSecondaire
						disabled={gesteEnCours !== null}
						onClick={() =>
							void (async () => {
								for (const { geste, rang } of enAttente) {
									if (!(await confirmer(echangeId, rang, geste))) break;
								}
							})()
						}
					>
						Tout confirmer ({enAttente.length})
					</BoutonSecondaire>
				</div>
			);
		const lesCartes = gestes.map((geste, rang) => {
			const description = decrireGeste(geste);
			const cle = `${echangeId}-${rang}`;
			const acces = accesDuGeste(geste);
			const contexte = contexteDe(geste);
			return (
				<CarteDeGeste
					key={cle}
					icone={ICONE_DU_GESTE[geste.genre]}
					titre={description.titre}
					{...(contexte === undefined ? {} : { contexte })}
					{...(description.detail === undefined ? {} : { detail: description.detail })}
					etat={geste.etat}
					{...(geste.resultat === undefined ? {} : { resultat: geste.resultat })}
					principal={cle === principal}
					libelleConfirmer={description.confirmer}
					enCours={gesteEnCours === cle}
					onConfirmer={(ajustement) => void confirmer(echangeId, rang, geste, ajustement)}
					champs={champsDu(geste)}
					{...(() => {
						const apercu = apercuDu(geste);
						return apercu === undefined ? {} : { apercu };
					})()}
					{...(acces === undefined ? {} : { acces })}
					{...(geste.genre === 'OUVRIR'
						? {}
						: { onEcarter: () => void ecarterGeste({ echangeId, rang }) })}
				/>
			);
		});
		return toutConfirmer === null ? lesCartes : [...lesCartes, toutConfirmer];
	}

	return { cartes, principalDe };
}
