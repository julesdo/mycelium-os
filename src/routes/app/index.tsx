import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { Page, PageBody, aujourdHuiISO, travauxDuVeilleur, ceQuiManque } from '../../ui';
import { EcranAccueil, type EtatSurveillance } from '../../screens/accueil';
import type { DossierAffiche } from '../../screens/procedures';
import { parcoursDeLaVoie } from '../../lib/verticales/recouvrement/apres-procedure';

export const Route = createFileRoute('/app/')({ component: Accueil });

/**
 * L'accueil, branché sur la base.
 *
 * Tout le dessin vit dans `screens/accueil.tsx`, qui ne sait pas interroger
 * Convex — c'est ce qui permet de le VOIR aux quatre largeurs de référence
 * depuis la salle d'exposition, sans backend ni authentification. Ce fichier-ci
 * ne fait que lire et traduire.
 */
function Accueil() {
	const flux = useQuery(api.recouvrement.surveillance.flux, {});
	// La date d'arrêté vient de la SEULE horloge de l'interface, partagée avec
	// l'écran de détail : deux lectures différentes feraient diverger les deux
	// totaux autour de minuit. Voir `ui/horloge.ts`.
	const revelation = useQuery(api.recouvrement.revelation.revelation, {
		arreteAu: aujourdHuiISO()
	});
	const battement = useQuery(api.recouvrement.battement.dernierBattement, {});
	/**
	 * LES DÉPÔTS ENCORE EN MACHINE.
	 *
	 * ⚠️ LA REQUÊTE EST RÉACTIVE, ET C'EST TOUT LE POINT. Un dépôt qui passe de
	 * `EN_ATTENTE` à `LECTURE` puis à `TERMINE` fait bouger cette liste sans
	 * rechargement : la rangée apparaît sur l'accueil quand la lecture commence,
	 * son étape change, puis elle s'en va. C'est la règle d'écran n° 2 — tout
	 * traitement se voit sans qu'on le demande — appliquée à l'écran d'accueil et
	 * pas seulement à celui d'import.
	 *
	 * ⚠️ `limite: 5` BORNE LA LECTURE. Sans elle, `listerImports` rend les vingt
	 * derniers dépôts pour n'en retenir que ceux en cours ; un gérant qui importe
	 * chaque mois en accumule douze par an, et l'accueil paierait ce transport à
	 * chaque ouverture pour afficher zéro rangée. Cinq suffit : au-delà de cinq
	 * dépôts simultanément en machine, la sixième rangée n'apprend plus rien.
	 */
	const depots = useQuery(api.recouvrement.depotMutations.listerImports, { limite: 5 });
	/**
	 * CE QUI BLOQUE ENCORE, ET QUE LE PRODUIT SAVAIT DÉJÀ.
	 *
	 * ⚠️ LE PROFIL CRÉANCIER EST LE VERROU LE PLUS COÛTEUX DU PRODUIT, et le plus
	 * silencieux. `creances.ts` passe `creancierCommercant: profil?.estCommercant
	 * ?? 'unknown'` : sans profil, `entreCommercants` reste indéterminé et
	 * l'éligibilité à l'injonction de payer n'est JAMAIS acquise. L'écran de
	 * créance affichait donc une condition non remplie, sans jamais dire que
	 * c'était l'identité du gérant qui manquait.
	 */
	/**
	 * CE QUE LE VEILLEUR A TROUVE, et qu'on n'a pas encore lu.
	 *
	 * ⚠️ LE SYSTEME ETAIT DOUBLEMENT MORT : `createNotification` sans appelant,
	 * `listMyNotifications` sans lecteur. Le blueprint le veut au module 2.1 —
	 * « notification sans qu'on ouvre l'ecran ». Le battement en ecrit
	 * desormais, et seulement pour ce qui fait perdre un droit sans qu'on ait
	 * rien fait : voir `aNotifier`.
	 */
	const notifications = useQuery(api.notifications.listMyNotifications, {});
	const marquerLue = useMutation(api.notifications.markAsRead);
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	/**
	 * LES DOSSIERS ENGAGÉS, ET LE DÉLAI LE PLUS PROCHE DE CHACUN.
	 *
	 * ⚠️ C'EST LA MÊME REQUÊTE QUE `/app/procedures`, donc Convex la sert depuis
	 * son cache : l'accueil ne paie pas d'aller-retour supplémentaire pour
	 * afficher ce qui court.
	 */
	const dossiersEngages = useQuery(api.recouvrement.apresProcedure.dossiersEngages, {});

	if (flux === undefined || revelation === undefined) {
		return (
			<Page>
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	/**
	 * ⚠️ « JAMAIS TOURNÉ » NE SE DIT QUE S'IL Y A QUELQUE CHOSE À SURVEILLER.
	 * Sur un établissement sans aucune facture, l'annoncer serait du bruit : la
	 * carte de démarrage dit déjà, mieux, ce qu'il reste à faire. La décision se
	 * prend ici parce qu'elle dépend d'une donnée — le flux — que l'écran de
	 * présentation reçoit déjà, mais que seule cette route sait encore en
	 * chargement (`undefined`) plutôt que vide.
	 */
	const surveillance: EtatSurveillance =
		battement === undefined
			? { etat: 'INCONNU' }
			: battement === null
				? flux.evenements.length === 0
					? { etat: 'NORMAL' }
					: { etat: 'JAMAIS_TOURNE' }
				: battement.statut === 'ECHEC'
					? { etat: 'ECHEC', jour: battement.jour }
					: { etat: 'NORMAL' };

	/**
	 * ⚠️ C'EST ICI QUE LA PHRASE DE LA MACHINE SE PERDAIT.
	 *
	 * Le repli ci-dessus est juste pour ce qu'il fait — décider s'il faut ALERTER
	 * — et c'était le seul usage fait du battement. `raison` et `termineLe`
	 * arrivaient donc jusqu'à cette fonction et mouraient sur la ligne qui range
	 * `PARLE` et `TU` ensemble sous « NORMAL », lequel ne rend rien à l'écran.
	 *
	 * Les deux lectures coexistent maintenant, et elles ne se recouvrent pas :
	 * `surveillance` répond « faut-il alerter », `travaux` répond « qu'a fait la
	 * machine ». La seconde n'existait pas.
	 */
	const travaux = travauxDuVeilleur({
		battement,
		// `undefined` est le CHARGEMENT, pas le vide. Traiter l'un pour l'autre
		// ferait clignoter une rangée « en attente de lecture » à chaque ouverture,
		// le temps d'un aller-retour — et on apprend à ignorer ce qui clignote.
		depotsEnCours: (depots ?? [])
			.filter((depot) => depot.statut === 'EN_ATTENTE' || depot.statut === 'LECTURE')
			.map((depot) => ({ id: depot._id, filename: depot.filename, etape: depot.etape })),
		// Les non lues seulement : une notification lue a fait son travail, et la
		// laisser reclamerait l'attention pour rien.
		trouvailles: (notifications ?? [])
			.filter((notification) => !notification.isRead)
			.map((notification) => ({
				id: notification._id as string,
				titre: notification.title,
				message: notification.message,
				...(notification.link === undefined ? {} : { lien: notification.link })
			})),
		// Ouvrir vaut acquitter. Sans ça, la pastille du veilleur ne s'éteint
		// jamais et le compte devient du décor — sur le seul signal du produit
		// qui annonce une perte sèche.
		onLire: (id) => void marquerLue({ notificationId: id as Id<'notifications'> }),
		aujourdHui: aujourdHuiISO()
	});

	return (
		<EcranAccueil
			vue={{
				total: revelation.total,
				nombreFactures: revelation.nombreFactures,
				interetsCourusDepuisHier: revelation.interetsCourusDepuisHier,
				// Les TROIS parts, jamais `supplement` — qui est deja la somme des deux
				// dernieres et les compterait deux fois. Voir `ui/composition.tsx`.
				parts: {
					principal: revelation.principal,
					interets: revelation.interets,
					indemnites: revelation.indemnites
				},
				evenements: flux.evenements,
				hypotheses: flux.hypotheses,
				anglesMorts: flux.anglesMorts,
				surveillance,
				travaux,
				/**
				 * ⚠️ `undefined` DONNE UNE SECTION ABSENTE, PAS UNE SECTION VIDE, et
				 * c'est la bonne lecture ici : « Ce qui court » ne s'affiche qu'avec
				 * au moins un dossier, donc le temps du chargement l'écran ne montre
				 * rien plutôt qu'un cadran à zéro qui se remplirait sous les yeux.
				 */
				dossiers: (dossiersEngages ?? []).map(
					(d): DossierAffiche => ({
						creanceId: d.creanceId,
						debiteur: d.debiteur,
						libelle: d.libelle,
						engageeLe: d.engageeLe,
						intervenant: d.intervenant,
						prochaineEcheance: d.prochaineEcheance,
						anglesMorts: d.anglesMorts,
						// Le rail vient de la fonction du domaine, rejoué depuis le
						// journal — comme sur `/app/procedures`. L'accueil ne le dessine
						// pas, mais il porte le MÊME dossier : deux projections
						// différentes du même enregistrement finiraient par diverger.
						etapes: parcoursDeLaVoie(d.procedure, d.journal, d.engageeLe).map((e) => ({
							etat: e.etat,
							libelle: e.libelle,
							statut: e.statut,
							atteinteLe: e.atteinteLe,
							branches: e.branches,
							brancheSuivie: e.brancheSuivie
						}))
					})
				),
				/**
				 * ⚠️ `undefined` NE COMPTE PAS COMME « MANQUANT ». Tant que les
				 * requêtes chargent, on ne sait pas si le profil existe : afficher
				 * « votre identité de créancier manque » le temps d'un aller-retour
				 * ferait clignoter un reproche à chaque ouverture, et on apprend à
				 * ignorer ce qui clignote. On attend de savoir.
				 */
				verrous:
					profil === undefined || debiteurs === undefined
						? []
						: ceQuiManque({
								// Le SIREN est ce qui compte : c'est lui qui porte
								// `estCommercant`, donc la condition « entre commerçants ».
								profilCreancierComplet: profil !== null && profil.siren !== undefined,
								nombreFactures: revelation.nombreFactures,
								debiteursSansSiren: debiteurs.filter((d) => d.siren === undefined).length
							})
			}}
		/>
	);
}
