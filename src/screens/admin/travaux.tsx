import {
	BoutonTexte,
	CarteLien,
	EnTeteDeGroupe,
	ListeDeCartes,
	PageEcran,
	pluriel,
	type Lecture
} from '../../ui';
import { BarreDAvancement, IconeDeTravail, type EtatAffiche } from '../../ui/travaux';

/**
 * LA FILE DES TRAVAUX DE L'ÉQUIPE (20/10/2026). Le fondateur : « pourquoi elles ne se font
 * pas en arrière-plan ? On doit rester sur l'écran de chargement ».
 *
 * Ce qui tourne en tête, avec son étape et sa barre ; ce qui est prêt dessous, le nouveau
 * marqué d'un point. Une recherche finie se rouvre dans « Trouver », où l'on coche ; un
 * ajout fini mène aux prospects. Rien à attendre : on part, on revient.
 */

export interface TravailDeLaFile {
	readonly _id: string;
	readonly genre: 'CHERCHER_ANNUAIRE' | 'CHERCHER_DECP' | 'AJOUTER_DECP';
	readonly libelle: string;
	readonly etat: EtatAffiche;
	readonly etape?: string;
	readonly fait?: number;
	readonly total?: number;
	readonly erreur?: string;
	readonly nombre?: number;
	readonly par: string;
	readonly vu: boolean;
	readonly creeLe: number;
	readonly finiLe?: number;
}

function heure(ms: number): string {
	return new Intl.DateTimeFormat('fr-FR', {
		timeZone: 'Europe/Paris',
		hour: '2-digit',
		minute: '2-digit'
	}).format(ms);
}

function ligneDe(t: TravailDeLaFile): string {
	if (t.etat === 'EN_ATTENTE') return 'En attente de démarrer';
	if (t.etat === 'EN_COURS') return t.etape ?? 'En cours';
	if (t.etat === 'ECHEC') return 'Arrêté, à relancer';
	const n = t.nombre ?? 0;
	return t.genre === 'AJOUTER_DECP'
		? `${n} prospect${pluriel(n)} ajouté${pluriel(n)}`
		: `${n} résultat${pluriel(n)} à cocher`;
}

function CarteDeTravail({
	travail,
	onOuvrir
}: {
	readonly travail: TravailDeLaFile;
	readonly onOuvrir: (id: string) => void;
}) {
	const enCours = travail.etat === 'EN_ATTENTE' || travail.etat === 'EN_COURS';
	const contenu = {
		titre: travail.libelle,
		ligne: ligneDe(travail),
		date: heure(travail.finiLe ?? travail.creeLe),
		icone: <IconeDeTravail etat={travail.etat} />,
		nonLue: !enCours && !travail.vu,
		...(travail.etat === 'ECHEC' ? { attention: true } : {})
	};
	const vers =
		travail.genre === 'AJOUTER_DECP' && travail.etat === 'FAIT'
			? ('/admin/prospects' as const)
			: ('/admin/prospects/trouver' as const);
	return (
		<div className="flex flex-col gap-1.5">
			<CarteLien
				vers={vers}
				{...(vers === '/admin/prospects/trouver' ? { recherche: { travail: travail._id } } : {})}
				onClick={() => onOuvrir(travail._id)}
				{...contenu}
			/>
			{enCours && travail.total !== undefined && travail.total > 0 ? (
				<span className="px-3.5">
					<BarreDAvancement fait={travail.fait ?? 0} total={travail.total} />
				</span>
			) : null}
		</div>
	);
}

export function EcranTravaux({
	lecture,
	onOuvrir,
	onRetirerLesFinis
}: {
	readonly lecture: Lecture<readonly TravailDeLaFile[]>;
	readonly onOuvrir: (id: string) => void;
	readonly onRetirerLesFinis?: (ids: readonly string[]) => void;
}) {
	const entete = { genre: 'onglet' as const, titre: 'File d’attente' };
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;
	const enCours = lecture.valeur.filter((t) => t.etat === 'EN_ATTENTE' || t.etat === 'EN_COURS');
	const finis = lecture.valeur.filter((t) => t.etat === 'FAIT' || t.etat === 'ECHEC');
	if (lecture.valeur.length === 0) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '⏳',
						titre: 'Aucun travail en cours',
						explication:
							'Les recherches dans la commande publique et à l’annuaire, et les ajouts de fournisseurs, tournent ici en arrière-plan. Vous lancez, vous partez, le résultat vous attend.',
						etapes: ['Ouvrez Prospects, puis « Trouver des prospects ».']
					}
				}}
			/>
		);
	}
	return (
		<PageEcran entete={entete}>
			{enCours.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="En cours" nombre={enCours.length} />
					<ListeDeCartes>
						{enCours.map((t) => (
							<CarteDeTravail key={t._id} travail={t} onOuvrir={onOuvrir} />
						))}
					</ListeDeCartes>
				</section>
			)}
			{finis.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<div className="flex items-baseline justify-between gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Prêts" nombre={finis.length} />
						{onRetirerLesFinis === undefined ? null : (
							<BoutonTexte onClick={() => onRetirerLesFinis(finis.map((t) => t._id))}>
								Vider
							</BoutonTexte>
						)}
					</div>
					<ListeDeCartes>
						{finis.map((t) => (
							<CarteDeTravail key={t._id} travail={t} onOuvrir={onOuvrir} />
						))}
					</ListeDeCartes>
				</section>
			)}
			<p className="px-1 text-cladd-3xs text-cladd-fg-soft">
				Les recherches tournent sur le serveur : fermer l’onglet ne les arrête pas. Vider la file
				ne retire rien de vos prospects.
			</p>
		</PageEcran>
	);
}
