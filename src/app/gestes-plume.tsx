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
import { decrireGeste, type GenreGeste } from '../lib/verticales/recouvrement/compagnon/gestes';
import { BoutonSecondaire, CarteDeGeste, Lien } from '../ui';

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

	async function confirmer(echangeId: Id<'echangesCompagnon'>, rang: number, geste: GesteDuFil) {
		if (geste.genre === 'OUVRIR') {
			ouvrirEcran(geste);
			return;
		}
		const cle = `${echangeId}-${rang}`;
		setGesteEnCours(cle);
		try {
			await confirmerGeste({ echangeId, rang });
		} catch (e) {
			toast({ title: 'Pas fait', text: messageDeLaPanne(e) });
		} finally {
			setGesteEnCours(null);
		}
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

	/** Les cartes des gestes d'un tour. */
	function cartes(
		echangeId: Id<'echangesCompagnon'>,
		gestes: readonly GesteDuFil[],
		principal: string | null
	): ReactNode[] {
		return gestes.map((geste, rang) => {
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
					onConfirmer={() => void confirmer(echangeId, rang, geste)}
					{...(acces === undefined ? {} : { acces })}
					{...(geste.genre === 'OUVRIR'
						? {}
						: { onEcarter: () => void ecarterGeste({ echangeId, rang }) })}
				/>
			);
		});
	}

	return { cartes, principalDe };
}
