import {
	BoutonTexte,
	CarteFixe,
	CarteLien,
	EnTeteDeGroupe,
	ListeDeCartes,
	PageEcran,
	VignetteRangee,
	dateCourte,
	jourDecale,
	type DestinationRangee,
	type FamilleRangee,
	type Lecture
} from '../ui';
import { TITRE_ECRAN } from './titres';

/**
 * LA BOÎTE DE RÉCEPTION — ce que le logiciel vous a écrit, au même endroit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ELLE RÉPARE (08/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La pastille de la barre du bas comptait les notifications de la nuit — une
 * date limite pour agir qui approche, une échéance de procédure — et ces
 * notifications vivaient dans la feuille « Surveillance », au bas de l'accueil,
 * entre un dépôt en lecture et le relevé du veilleur. On comptait donc ce qu'on
 * ne trouvait pas. Revolut Business range les siennes dans une boîte ouverte par
 * une cloche, groupées par jour, chacune avec son geste : c'est ce qu'elle est.
 *
 * ⚠️ OUVRIR VAUT LIRE, PAS REGARDER LA LISTE. Une notification ne passe « lue »
 * que quand on la touche, ou quand on dit « Tout marquer comme lu ». Celles-ci
 * annoncent des droits qui s'éteignent : les éteindre d'avoir seulement ouvert
 * la boîte ferait disparaître le compte sans que rien n'ait été lu.
 *
 * ⚠️ PAS D'HEURE, LE JOUR SEULEMENT. Le produit compte ses jours en UTC ; une
 * heure affichée l'aurait été aussi, avec une ou deux heures d'écart sur celle
 * du gérant. Le jour, en en-tête, suffit à ce qu'on vient y lire.
 */

export type GenreNotification =
	| 'IMPORT_TERMINE'
	| 'CREANCE_MURE'
	| 'ECHEANCE_PROCHE'
	| 'PRESCRIPTION_PROCHE'
	| 'DEBITEUR_DEGRADE'
	| 'HUMAN_ASSIST_REPLY'
	| 'PILOTE_BLOQUE';

/** La teinte dit DE QUOI il s'agit, jamais si c'est grave (`familles.tsx`). */
const FAMILLE: Readonly<Record<GenreNotification, FamilleRangee>> = {
	PRESCRIPTION_PROCHE: 'TEMPS',
	ECHEANCE_PROCHE: 'TEMPS',
	IMPORT_TERMINE: 'PAPIERS',
	DEBITEUR_DEGRADE: 'MACHINE',
	HUMAN_ASSIST_REPLY: 'QUESTION',
	CREANCE_MURE: 'ARGENT',
	// Ce que le pilote ne peut pas faire sans le gérant : une question, rose.
	PILOTE_BLOQUE: 'QUESTION'
};

/**
 * LE TITRE D'UNE NOTIFICATION VIENT DE SON GENRE, PAS DE LA BASE.
 *
 * ⚠️ LA NUIT ÉCRIVAIT « PRESCRIPTION PROCHE », le mot du droit, dans le titre
 * qu'elle stockait. Lu à l'écran, il passait sous le nez du lexique (qui ne
 * balaie pas la base) ; et une notification ne se réécrit pas. Le titre se
 * déduit donc du genre, dans les mots de tout le monde — ceux des cartes du
 * matin (`RESUME_PAR_TYPE`) —, et le titre stocké n'est plus lu.
 */
const TITRE: Readonly<Record<GenreNotification, string>> = {
	PRESCRIPTION_PROCHE: 'Date limite pour agir',
	ECHEANCE_PROCHE: 'Échéance de procédure',
	IMPORT_TERMINE: 'Import terminé',
	DEBITEUR_DEGRADE: 'Situation dégradée au registre',
	HUMAN_ASSIST_REPLY: 'Nouvelle réponse',
	CREANCE_MURE: 'Un dossier à regarder',
	PILOTE_BLOQUE: 'Le pilote a besoin de vous'
};

export interface NotificationAffichee {
	readonly id: string;
	readonly genre: GenreNotification;
	/** Le message entier : c'est lui qu'on vient lire, il revient à la ligne. */
	readonly message: string;
	/** Le jour où elle a été écrite, en `AAAA-MM-JJ`. */
	readonly jour: string;
	readonly lue: boolean;
	/** Absente quand l'événement d'origine ne désignait rien d'ouvrable. */
	readonly destination?: DestinationRangee;
}

export interface NotificationsAffichees {
	/** Le jour de l'interface : « Aujourd'hui » et « Hier » s'en déduisent. */
	readonly aujourdHui: string;
	/** Les plus récentes d'abord. */
	readonly notifications: readonly NotificationAffichee[];
	readonly onLire: (id: string) => void;
	readonly onToutLire: () => void;
}

/**
 * OÙ MÈNE UNE NOTIFICATION — son lien relu, quelle que soit l'année où il a été
 * écrit.
 *
 * ⚠️ CINQ GRAPHIES, ET LES CINQ SE LISENT. `battement.ts` a écrit
 * `/app/creance/<id>` et `/app/debiteurs?d=<id>`, puis `/app?ligne=<id>` à
 * partir du 17 septembre 2026, puis `/app/dossier/<id>` et `/app/clients/<id>`
 * à partir du 8 octobre. Une notification est un fait daté, pas un état qu'on
 * corrige : elle garde le lien de sa nuit, et c'est la lecture qui suit.
 *
 * ⚠️ `?ligne=` SE RÉSOUT ICI, ET NULLE PART AILLEURS. L'identifiant désigne
 * tantôt une créance, tantôt un client — c'est la surveillance qui en
 * décidait — et le veilleur, qui ne lisait pas les créances, menait faute de
 * mieux à « Aujourd'hui » tout court. La route, elle, sait lesquelles existent :
 * elle passe les deux questions, et l'identifiant qui n'est ni l'un ni l'autre
 * ne mène nulle part. Deviner ouvrirait le dossier d'un autre.
 */
export function destinationDeNotification(
	lien: string,
	sait: {
		readonly estUneCreance: (id: string) => boolean;
		readonly estUnClient: (id: string) => boolean;
	}
): DestinationRangee | undefined {
	const dossier = /^\/app\/(?:dossier|creance)\/([\w-]+)$/.exec(lien)?.[1];
	if (dossier !== undefined) return { vers: '/app/dossier/$id', parametres: { id: dossier } };

	const client =
		/^\/app\/clients\/([\w-]+)$/.exec(lien)?.[1] ?? /^\/app\/debiteurs\?d=([\w-]+)$/.exec(lien)?.[1];
	if (client !== undefined) return { vers: '/app/clients/$id', parametres: { id: client } };

	const ligne = /^(?:\/app)?\?ligne=([\w-]+)$/.exec(lien)?.[1];
	if (ligne !== undefined) {
		if (sait.estUneCreance(ligne)) return { vers: '/app/dossier/$id', parametres: { id: ligne } };
		if (sait.estUnClient(ligne)) return { vers: '/app/clients/$id', parametres: { id: ligne } };
	}
	return undefined;
}

/** Le nom d'un jour, en en-tête de groupe. */
function nomDuJour(jour: string, aujourdHui: string): string {
	if (jour === aujourdHui) return 'Aujourd’hui';
	if (jour === jourDecale(aujourdHui, -1)) return 'Hier';
	return dateCourte(jour);
}

export function EcranNotifications({ donnees }: { donnees: Lecture<NotificationsAffichees> }) {
	const entete = {
		genre: 'poussee',
		retour: { vers: '/app', libelle: TITRE_ECRAN.aujourdhui },
		titre: 'Notifications'
	} as const;

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;

	const { aujourdHui, notifications, onLire, onToutLire } = donnees.valeur;

	if (notifications.length === 0) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '🔔',
						titre: 'Rien de nouveau',
						explication:
							'Le logiciel vous écrit ici quand une date limite pour agir en justice ou une échéance de procédure approche. Le reste du temps, il surveille sans vous déranger.'
					}
				}}
			/>
		);
	}

	// Les notifications arrivent les plus récentes d'abord : le groupement garde
	// cet ordre, jour après jour.
	const parJour: { jour: string; siennes: NotificationAffichee[] }[] = [];
	for (const notification of notifications) {
		const dernier = parJour.at(-1);
		if (dernier !== undefined && dernier.jour === notification.jour) dernier.siennes.push(notification);
		else parJour.push({ jour: notification.jour, siennes: [notification] });
	}
	const nonLues = notifications.filter((n) => !n.lue).length;

	return (
		<PageEcran entete={entete}>
			{/*
			  « TOUT MARQUER COMME LU », EN TEXTE ET À DROITE — le geste de Mail. Il
			  n'apparaît que s'il reste quelque chose à marquer.
			*/}
			{nonLues === 0 ? null : (
				<div className="flex justify-end">
					<BoutonTexte onClick={onToutLire}>Tout marquer comme lu</BoutonTexte>
				</div>
			)}

			<div className="flex flex-col gap-cladd-xs">
				{parJour.map(({ jour, siennes }) => (
					<section key={jour} className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle={nomDuJour(jour, aujourdHui)} />
						<ListeDeCartes>
							{siennes.map((notification) => {
								const contenu = {
									titre: TITRE[notification.genre],
									ligne: notification.message,
									retour: true,
									nonLue: !notification.lue,
									icone: (
										<VignetteRangee famille={FAMILLE[notification.genre]} className="size-10" />
									)
								};
								return notification.destination === undefined ? (
									<CarteFixe key={notification.id} {...contenu} />
								) : (
									<CarteLien
										key={notification.id}
										vers={notification.destination.vers}
										parametres={notification.destination.parametres}
										onClick={() => onLire(notification.id)}
										{...contenu}
									/>
								);
							})}
						</ListeDeCartes>
					</section>
				))}
			</div>
		</PageEcran>
	);
}
