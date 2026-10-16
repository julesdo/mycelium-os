import { useState, type ReactNode } from 'react';
import { Input, Segmented, SegmentedButton, Textarea } from '@cladd-ui/react';
import {
	CalendarPlusIcon,
	CheckCircle2Icon,
	FlagIcon,
	MailIcon,
	MessageSquareReplyIcon,
	PhoneIcon,
	SparklesIcon,
	StickyNoteIcon,
	TagIcon
} from 'lucide-react';
import { BoutonPrincipal, EnTeteDeGroupe, FeuillePleinEcran, ListeDeCartes } from '../../ui';
import { LigneDeTache, type EvenementAffiche } from '../../ui/admin';
import { echeanceDeTache, grouperParJour, heureDeParis } from '../../lib/admin/dates';
import { grouperTaches } from '../../lib/crm/taches';
import { LIBELLES_DES_STATUTS, type StatutProspect } from '../../lib/crm/statuts';

/**
 * CE QUE LES ÉCRANS DE L'ADMIN PARTAGENT (16/10/2026) : la tâche, l'événement d'une
 * fiche, les feuilles « Appel noté » et « Nouvelle tâche ». Sans Convex : les routes
 * branchent les lectures et les gestes.
 */

export type TypeFiche = 'COMPTE' | 'PROSPECT';

export interface TacheAffichee {
	readonly id: string;
	readonly titre: string;
	readonly pour: number;
	readonly assigneA?: string;
	readonly faiteLe?: number;
	readonly origine: 'MAIN' | 'SCORE';
	readonly fiche?: { readonly type: TypeFiche; readonly id: string; readonly libelle: string };
}

export type TypeEvenementCrm = 'NOTE' | 'APPEL' | 'EMAIL' | 'REPONSE' | 'STATUT';

export interface EvenementCrm {
	readonly id: string;
	readonly type: TypeEvenementCrm;
	readonly texte?: string;
	readonly auteur: string;
	readonly le: number;
}

/** La destination d'une fiche, pour un lien typé par le routeur. */
export function lienDeFiche(type: TypeFiche, id: string) {
	return type === 'COMPTE'
		? { vers: '/admin/comptes/$id' as const, parametres: { id } }
		: { vers: '/admin/prospects/$id' as const, parametres: { id } };
}

/** « jules@letikette.com » → « jules » : assez pour reconnaître un membre de l'équipe. */
export function nomCourt(email: string): string {
	return email.split('@')[0] ?? email;
}

/** Une tâche en ligne, avec sa fiche si on n'est pas déjà dessus. */
export function Tache({
	tache,
	maintenant,
	onCocher,
	avecFiche = true
}: {
	readonly tache: TacheAffichee;
	readonly maintenant: number;
	readonly onCocher: (id: string, faite: boolean) => void;
	readonly avecFiche?: boolean;
}) {
	const echeance = echeanceDeTache(tache.pour, maintenant);
	const fiche =
		avecFiche && tache.fiche !== undefined
			? { libelle: tache.fiche.libelle, ...lienDeFiche(tache.fiche.type, tache.fiche.id) }
			: undefined;
	return (
		<LigneDeTache
			titre={tache.titre}
			faite={tache.faiteLe !== undefined}
			onCocher={() => onCocher(tache.id, tache.faiteLe === undefined)}
			date={echeance.texte}
			enRetard={echeance.enRetard}
			{...(fiche === undefined ? {} : { fiche })}
			{...(tache.assigneA === undefined ? {} : { responsable: nomCourt(tache.assigneA) })}
		/>
	);
}

/** Les tâches rangées comme chez Linear : en retard, aujourd'hui, plus tard, faites. */
export function TachesGroupees({
	taches,
	maintenant,
	debutDuJour,
	finDuJour,
	onCocher,
	avecFiche = true,
	sansFaites = false
}: {
	readonly taches: readonly TacheAffichee[];
	readonly maintenant: number;
	readonly debutDuJour: number;
	readonly finDuJour: number;
	readonly onCocher: (id: string, faite: boolean) => void;
	readonly avecFiche?: boolean;
	readonly sansFaites?: boolean;
}) {
	const groupes = grouperTaches(taches, debutDuJour, finDuJour);
	const sections: { cle: string; libelle: string; taches: TacheAffichee[] }[] = [
		{ cle: 'retard', libelle: 'En retard', taches: groupes.enRetard },
		{ cle: 'jour', libelle: 'Aujourd’hui', taches: groupes.aujourdhui },
		{ cle: 'tard', libelle: 'Plus tard', taches: groupes.plusTard },
		...(sansFaites
			? []
			: [{ cle: 'faites', libelle: 'Faites (7 derniers jours)', taches: groupes.faites }])
	];
	return (
		<>
			{sections
				.filter((s) => s.taches.length > 0)
				.map((s) => (
					<section key={s.cle} className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle={s.libelle} nombre={s.taches.length} />
						<ListeDeCartes>
							{s.taches.map((t) => (
								<Tache
									key={t.id}
									tache={t}
									maintenant={maintenant}
									onCocher={onCocher}
									avecFiche={avecFiche}
								/>
							))}
						</ListeDeCartes>
					</section>
				))}
		</>
	);
}

const ICONES: Record<TypeEvenementCrm, ReactNode> = {
	NOTE: <StickyNoteIcon />,
	APPEL: <PhoneIcon />,
	EMAIL: <MailIcon />,
	REPONSE: <MessageSquareReplyIcon />,
	STATUT: <TagIcon />
};

const TITRES: Record<Exclude<TypeEvenementCrm, 'STATUT'>, string> = {
	NOTE: 'Note',
	APPEL: 'Appel noté',
	EMAIL: 'E-mail noté',
	REPONSE: 'Réponse notée'
};

/** Un événement saisi par l'équipe, prêt pour l'historique. */
export function evenementAffiche(e: EvenementCrm): EvenementAffiche & { readonly le: number } {
	if (e.type === 'STATUT') {
		const statut = (e.texte ?? '') as StatutProspect;
		return {
			id: e.id,
			le: e.le,
			icone: ICONES.STATUT,
			titre: `Statut : ${LIBELLES_DES_STATUTS[statut] ?? statut}`,
			heure: heureDeParis(e.le),
			auteur: nomCourt(e.auteur)
		};
	}
	return {
		id: e.id,
		le: e.le,
		icone: ICONES[e.type],
		titre: TITRES[e.type],
		...(e.texte === undefined ? {} : { texte: e.texte }),
		heure: heureDeParis(e.le),
		auteur: nomCourt(e.auteur)
	};
}

/** Un fait du parcours d'un compte (étape franchie, conseil de Plume) pour l'historique. */
export function faitDuParcours(
	id: string,
	le: number,
	genre: 'ETAPE' | 'CONSEIL',
	libelle: string
): EvenementAffiche & { readonly le: number } {
	return {
		id,
		le,
		icone: genre === 'ETAPE' ? <FlagIcon /> : <SparklesIcon />,
		titre: libelle,
		heure: heureDeParis(le)
	};
}

/** Les événements, du plus récent au plus ancien, groupés par jour de Paris. */
export function joursDHistorique(
	evenements: readonly (EvenementAffiche & { readonly le: number })[],
	maintenant: number
) {
	const tries = [...evenements].sort((a, b) => b.le - a.le);
	return grouperParJour(tries, maintenant).map((g) => ({ jour: g.jour, evenements: g.elements }));
}

export const ICONE_TACHE = <CalendarPlusIcon aria-hidden />;
export const ICONE_FAITE = <CheckCircle2Icon aria-hidden />;

// ─────────────────────────────────────────────────────────────────────────
// LES FEUILLES : « APPEL NOTÉ » ET « NOUVELLE TÂCHE »
// ─────────────────────────────────────────────────────────────────────────

/** Un appel, un e-mail ou une réponse, noté d'un geste avec ce qui s'est dit. */
export function FeuilleDEchange({
	ouverte,
	onFermer,
	type,
	onNoter,
	avant
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly type: 'APPEL' | 'EMAIL' | 'REPONSE';
	readonly onNoter: (texte: string) => Promise<void>;
	/** Au-dessus du champ : pour un e-mail, de quoi l'écrire. */
	readonly avant?: ReactNode;
}) {
	const [texte, setTexte] = useState('');
	const [enCours, setEnCours] = useState(false);
	const titre = { APPEL: 'Noter un appel', EMAIL: 'Noter un e-mail', REPONSE: 'Noter une réponse' }[
		type
	];
	async function noter() {
		setEnCours(true);
		try {
			await onNoter(texte);
			setTexte('');
			onFermer();
		} catch {
			// Le refus est dit par l'appelant ; la feuille reste ouverte, le texte gardé.
		} finally {
			setEnCours(false);
		}
	}
	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre={titre}
			pied={
				<BoutonPrincipal pleineLargeur disabled={enCours} onClick={() => void noter()}>
					{titre}
				</BoutonPrincipal>
			}
		>
			<div className="flex flex-col gap-cladd-xs">
				{avant}
				<label className="flex flex-col gap-1.5">
					<span className="px-1 text-cladd-2xs text-cladd-fg-soft">
						Ce qui s’est dit (facultatif)
					</span>
					<Textarea
						size="lg"
						value={texte}
						onChange={(v) => setTexte(v)}
						placeholder="Rappeler jeudi, intéressé par l’essai…"
					/>
				</label>
			</div>
		</FeuillePleinEcran>
	);
}

type Quand = 'aujourdhui' | 'demain' | 'trois' | 'semaine';
const JOUR_MS = 24 * 60 * 60 * 1000;
const DECALAGES: Record<Quand, number> = { aujourdhui: 0, demain: 1, trois: 3, semaine: 7 };

/** Une tâche, créée en deux gestes : ce qu'il faut faire, et quand. */
export function FeuilleDeTache({
	ouverte,
	onFermer,
	finDuJour,
	onCreer,
	pour: libellePour
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	/** La fin du jour de Paris : une tâche « pour aujourd'hui » est due avant. */
	readonly finDuJour: number;
	readonly onCreer: (titre: string, pour: number) => Promise<void>;
	/** Sur une fiche : le nom de la fiche, dit sous le titre. */
	readonly pour?: string;
}) {
	const [titre, setTitre] = useState('');
	const [quand, setQuand] = useState<Quand>('demain');
	const [enCours, setEnCours] = useState(false);
	async function creer() {
		setEnCours(true);
		try {
			// Une heure avant la fin du jour choisi : la tâche tombe le bon jour, à Paris.
			await onCreer(titre.trim(), finDuJour - 60 * 60 * 1000 + DECALAGES[quand] * JOUR_MS);
			setTitre('');
			onFermer();
		} catch {
			// Le refus est dit par l'appelant ; la feuille reste ouverte.
		} finally {
			setEnCours(false);
		}
	}
	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Nouvelle tâche"
			{...(libellePour === undefined ? {} : { sousTitre: libellePour })}
			pied={
				<BoutonPrincipal
					pleineLargeur
					disabled={enCours || titre.trim() === ''}
					onClick={() => void creer()}
				>
					Créer la tâche
				</BoutonPrincipal>
			}
		>
			<div className="flex flex-col gap-cladd-xs">
				<label className="flex flex-col gap-1.5">
					<span className="px-1 text-cladd-2xs text-cladd-fg-soft">À faire</span>
					<Input
						size="lg"
						value={titre}
						onChange={(v) => setTitre(v)}
						placeholder="Appeler, envoyer la grille…"
					/>
				</label>
				<div className="flex flex-col gap-1.5">
					<span className="px-1 text-cladd-2xs text-cladd-fg-soft">Pour quand</span>
					<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
						<SegmentedButton active={quand === 'aujourdhui'} onClick={() => setQuand('aujourdhui')}>
							Aujourd’hui
						</SegmentedButton>
						<SegmentedButton active={quand === 'demain'} onClick={() => setQuand('demain')}>
							Demain
						</SegmentedButton>
						<SegmentedButton active={quand === 'trois'} onClick={() => setQuand('trois')}>
							Dans 3 j
						</SegmentedButton>
						<SegmentedButton active={quand === 'semaine'} onClick={() => setQuand('semaine')}>
							Dans 7 j
						</SegmentedButton>
					</Segmented>
				</div>
			</div>
		</FeuillePleinEcran>
	);
}
